import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { JourneyProviderResult, JourneyStage, PublicSimulationJob } from "../platform/contracts";
import { getJourneyProvider } from "../platform/ai-provider-registry";
import { fileStorageProvider } from "../platform/file-storage";
import { publishPlatformEvent } from "../platform/telemetry";
import { isSimulationResultContract, simulationResultContractError } from "./journey-result-contract";

type SimulationJob = PublicSimulationJob & {
  child?: ChildProcessWithoutNullStreams;
  heartbeat?: NodeJS.Timeout;
};

type BrujulaSimulationGlobal = typeof globalThis & {
  __brujulaSimulationJobs?: Map<string, SimulationJob>;
};

const jobs = ((globalThis as BrujulaSimulationGlobal).__brujulaSimulationJobs ||= new Map<string, SimulationJob>());
const INSTANCE_ID = `next_${process.pid}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const HEARTBEAT_INTERVAL_MS = 5000;
const HEARTBEAT_STALE_MS = 20000;

export async function startSimulationJob({
  simulationId,
  text,
  model,
  lifeProfile
}: {
  simulationId: string;
  text: string;
  model: string;
  lifeProfile: unknown;
}) {
  const existing = jobs.get(simulationId);
  if (existing?.child) {
    existing.child.kill("SIGKILL");
  }

  const provider = getJourneyProvider();
  const job: SimulationJob = {
    id: simulationId,
    status: "loading",
    goal: text,
    stage: "understanding_goal",
    progress: 4,
    message: "Leyendo el destino y preparando la simulacion.",
    createdAt: new Date().toISOString(),
    ownerId: INSTANCE_ID,
    heartbeatAt: new Date().toISOString()
  };
  jobs.set(simulationId, job);
  await persistJob(job);
  startHeartbeat(job);
  publishPlatformEvent("JourneyStarted", { simulationId, provider: provider.id });

  try {
    const providerRun = provider.runJourneySimulation({ simulationId, text, model, lifeProfile }, (event) => {
      applyProgressEvent(job, event);
      publishPlatformEvent("JourneyProgressed", { simulationId, stage: event.stage, progress: event.progress });
    });
    job.child = providerRun.child as ChildProcessWithoutNullStreams | undefined;
    providerRun.result.then((parsed) => void completeJob(job, parsed)).catch((error: Error) => void failJob(job, error.message));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo iniciar el proveedor de simulacion.";
    await failJob(job, message);
  }

  return publicJob(job);
}

export async function getSimulationJob(simulationId: string) {
  const job = jobs.get(simulationId);
  if (job) {
    return publicJob(job);
  }

  const storedJob = await fileStorageProvider.get<PublicSimulationJob>(jobStorageKey(simulationId));
  if (!storedJob) {
    return null;
  }
  if (storedJob.status !== "loading") {
    return storedJob;
  }
  if (hasFreshHeartbeat(storedJob)) {
    return storedJob;
  }
  const interruptedJob: PublicSimulationJob = {
    ...storedJob,
    status: "error",
    error: "La simulacion fue interrumpida porque el proceso del servidor ya no esta activo.",
    message: "La simulacion fue interrumpida porque el proceso del servidor ya no esta activo.",
    completedAt: new Date().toISOString()
  };
  await fileStorageProvider.set(jobStorageKey(simulationId), interruptedJob);
  return interruptedJob;
}

export async function cancelSimulationJob(simulationId: string) {
  const job = jobs.get(simulationId);
  if (!job) {
    const storedJob = await fileStorageProvider.get<PublicSimulationJob>(jobStorageKey(simulationId));
    if (!storedJob) {
      return null;
    }
    const cancelledJob: PublicSimulationJob = { ...storedJob, status: "cancelled", message: "Simulacion cancelada.", completedAt: new Date().toISOString() };
    await fileStorageProvider.set(jobStorageKey(simulationId), cancelledJob);
    publishPlatformEvent("JourneyCancelled", { simulationId });
    return cancelledJob;
  }
  job.child?.kill("SIGKILL");
  stopHeartbeat(job);
  job.child = undefined;
  job.status = "cancelled";
  job.message = "Simulacion cancelada.";
  await persistJob(job);
  publishPlatformEvent("JourneyCancelled", { simulationId });
  return publicJob(job);
}

export function clearSimulationJobsForTests() {
  for (const job of jobs.values()) {
    stopHeartbeat(job);
  }
  jobs.clear();
}

export async function removeSimulationJobForTests(simulationId: string) {
  jobs.delete(simulationId);
  await fileStorageProvider.remove(jobStorageKey(simulationId));
}

function applyProgressEvent(job: SimulationJob, event: { stage?: JourneyStage; progress?: number; message?: string }) {
  if (!event.stage) {
    return;
  }
  job.stage = event.stage;
  job.progress = Math.max(job.progress, Math.min(event.progress ?? job.progress, 100));
  job.message = event.message || job.message;
  job.heartbeatAt = new Date().toISOString();
  void persistJob(job);
}

async function completeJob(job: SimulationJob, parsed: JourneyProviderResult) {
  if (job.status === "cancelled" || job.status === "error") {
    return;
  }
  if (!parsed.success) {
    await failJob(job, parsed.error || "No se pudo simular el escenario.");
    return;
  }
  if (!isSimulationResultContract(parsed.data)) {
    await failJob(job, simulationResultContractError(parsed.data));
    return;
  }
  const completedJob: SimulationJob = {
    ...job,
    status: "result",
    stage: "completed",
    progress: 100,
    message: "La ruta esta lista.",
    result: parsed.data,
    completedAt: new Date().toISOString(),
    heartbeatAt: new Date().toISOString(),
    heartbeat: undefined,
    child: undefined
  };
  stopHeartbeat(job);
  await persistJob(completedJob);
  Object.assign(job, completedJob);
  publishPlatformEvent("JourneyCompleted", { simulationId: job.id });
}

async function failJob(job: SimulationJob, message: string) {
  if (job.status === "cancelled") {
    return;
  }
  const failedJob: SimulationJob = {
    ...job,
    status: "error",
    error: message,
    message,
    child: undefined,
    heartbeatAt: new Date().toISOString(),
    heartbeat: undefined,
    completedAt: new Date().toISOString()
  };
  stopHeartbeat(job);
  await persistJob(failedJob);
  Object.assign(job, failedJob);
  publishPlatformEvent("JourneyFailed", { simulationId: job.id });
}

function publicJob(job: SimulationJob): PublicSimulationJob {
  const { child: _child, heartbeat: _heartbeat, ...safeJob } = job;
  return safeJob;
}

function persistJob(job: SimulationJob) {
  return fileStorageProvider.set(jobStorageKey(job.id), publicJob(job));
}

function jobStorageKey(simulationId: string) {
  return `journey-simulation:${simulationId}`;
}

function startHeartbeat(job: SimulationJob) {
  stopHeartbeat(job);
  job.heartbeat = setInterval(() => {
    if (job.status !== "loading") {
      stopHeartbeat(job);
      return;
    }
    job.heartbeatAt = new Date().toISOString();
    void persistJob(job);
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat(job: SimulationJob) {
  if (job.heartbeat) {
    clearInterval(job.heartbeat);
    job.heartbeat = undefined;
  }
}

function hasFreshHeartbeat(job: PublicSimulationJob) {
  if (!job.ownerId || !job.heartbeatAt) {
    return false;
  }
  return Date.now() - Date.parse(job.heartbeatAt) < HEARTBEAT_STALE_MS;
}
