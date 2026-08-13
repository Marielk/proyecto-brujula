import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { JourneyProviderResult, JourneyStage, PublicSimulationJob } from "../platform/contracts";
import { getJourneyProvider } from "../platform/ai-provider-registry";
import { publishPlatformEvent } from "../platform/telemetry";

type SimulationJob = PublicSimulationJob & {
  child?: ChildProcessWithoutNullStreams;
};

type BrujulaSimulationGlobal = typeof globalThis & {
  __brujulaSimulationJobs?: Map<string, SimulationJob>;
};

const jobs = ((globalThis as BrujulaSimulationGlobal).__brujulaSimulationJobs ||= new Map<string, SimulationJob>());

export function startSimulationJob({
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
    createdAt: new Date().toISOString()
  };
  jobs.set(simulationId, job);
  publishPlatformEvent("JourneyStarted", { simulationId, provider: provider.id });

  const providerRun = provider.runJourneySimulation({ simulationId, text, model, lifeProfile }, (event) => {
    applyProgressEvent(job, event);
    publishPlatformEvent("JourneyProgressed", { simulationId, stage: event.stage, progress: event.progress });
  });
  job.child = providerRun.child as ChildProcessWithoutNullStreams | undefined;
  providerRun.result.then((parsed) => completeJob(job, parsed)).catch((error: Error) => failJob(job, error.message));

  return publicJob(job);
}

export function getSimulationJob(simulationId: string) {
  const job = jobs.get(simulationId);
  return job ? publicJob(job) : null;
}

export function cancelSimulationJob(simulationId: string) {
  const job = jobs.get(simulationId);
  if (!job) {
    return null;
  }
  job.child?.kill("SIGKILL");
  job.child = undefined;
  job.status = "cancelled";
  job.message = "Simulacion cancelada.";
  publishPlatformEvent("JourneyCancelled", { simulationId });
  return publicJob(job);
}

export function clearSimulationJobsForTests() {
  jobs.clear();
}

function applyProgressEvent(job: SimulationJob, event: { stage?: JourneyStage; progress?: number; message?: string }) {
  if (!event.stage) {
    return;
  }
  job.stage = event.stage;
  job.progress = Math.max(job.progress, Math.min(event.progress ?? job.progress, 100));
  job.message = event.message || job.message;
}

function completeJob(job: SimulationJob, parsed: JourneyProviderResult) {
  if (job.status === "cancelled" || job.status === "error") {
    return;
  }
  if (!parsed.success) {
    failJob(job, parsed.error || "No se pudo simular el escenario.");
    return;
  }
  job.status = "result";
  job.stage = "completed";
  job.progress = 100;
  job.message = "La ruta esta lista.";
  job.result = parsed.data;
  job.completedAt = new Date().toISOString();
  job.child = undefined;
  publishPlatformEvent("JourneyCompleted", { simulationId: job.id });
}

function failJob(job: SimulationJob, message: string) {
  if (job.status === "cancelled") {
    return;
  }
  job.status = "error";
  job.error = message;
  job.message = message;
  job.child = undefined;
  job.completedAt = new Date().toISOString();
  publishPlatformEvent("JourneyFailed", { simulationId: job.id });
}

function publicJob(job: SimulationJob): PublicSimulationJob {
  const { child: _child, ...safeJob } = job;
  return safeJob;
}
