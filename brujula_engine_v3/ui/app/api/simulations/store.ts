import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import path from "node:path";

export type JourneyStage =
  | "understanding_goal"
  | "selecting_context"
  | "generating_strategies"
  | "expanding_paths"
  | "pruning_paths"
  | "comparing_paths"
  | "building_result"
  | "writing_letter"
  | "completed";

export type SimulationJob = {
  id: string;
  status: "loading" | "result" | "error" | "cancelled";
  goal: string;
  stage: JourneyStage;
  progress: number;
  message: string;
  createdAt: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
  child?: ChildProcessWithoutNullStreams;
};

type PythonResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};

const PYTHON_TIMEOUT_MS = 180000;

type BrújulaSimulationGlobal = typeof globalThis & {
  __brujulaSimulationJobs?: Map<string, SimulationJob>;
};

const jobs = ((globalThis as BrújulaSimulationGlobal).__brujulaSimulationJobs ||= new Map<string, SimulationJob>());

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

  const job: SimulationJob = {
    id: simulationId,
    status: "loading",
    goal: text,
    stage: "understanding_goal",
    progress: 4,
    message: "Leyendo el destino y preparando la simulación.",
    createdAt: new Date().toISOString()
  };
  jobs.set(simulationId, job);

  const engineRoot = path.resolve(process.cwd(), "..");
  const child = spawn("python", ["-m", "brujula_engine.simulation.web_api", "--model", model], {
    cwd: engineRoot,
    env: {
      ...process.env,
      BRUJULA_OLLAMA_TIMEOUT: process.env.BRUJULA_OLLAMA_TIMEOUT || "60",
      BRUJULA_PROGRESS_EVENTS: "1",
      PYTHONIOENCODING: "utf-8"
    },
    stdio: ["pipe", "pipe", "pipe"]
  });
  job.child = child;

  let stdout = "";
  let stderrRemainder = "";
  let stderrLog = "";

  child.stdout.setEncoding("utf-8");
  child.stderr.setEncoding("utf-8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderrRemainder += chunk;
    const lines = stderrRemainder.split(/\r?\n/);
    stderrRemainder = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      if (!applyProgressEvent(job, line)) {
        stderrLog += `${line}\n`;
      }
    }
  });

  child.stdin.write(JSON.stringify({ simulationId, text, lifeProfile }));
  child.stdin.end();

  const timeout = setTimeout(() => {
    child.kill("SIGKILL");
    failJob(job, "La simulación tardó demasiado. Brújula detuvo el proceso para proteger la UI.");
  }, PYTHON_TIMEOUT_MS);

  child.on("error", (error) => {
    clearTimeout(timeout);
    failJob(job, error.message);
  });

  child.on("close", () => {
    clearTimeout(timeout);
    if (job.status === "cancelled" || job.status === "error") {
      return;
    }

    const trimmed = stdout.trim();
    if (!trimmed) {
      failJob(job, stderrLog.trim() || "Python no devolvió respuesta.");
      return;
    }

    try {
      const parsed = JSON.parse(trimmed) as PythonResponse;
      if (!parsed.success) {
        failJob(job, parsed.error || "No se pudo simular el escenario.");
        return;
      }
      job.status = "result";
      job.stage = "completed";
      job.progress = 100;
      job.message = "La ruta está lista.";
      job.result = parsed.data;
      job.completedAt = new Date().toISOString();
      job.child = undefined;
    } catch {
      failJob(job, `Respuesta inválida desde Python: ${trimmed.slice(0, 500)}`);
    }
  });

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
  job.message = "Simulación cancelada.";
  return publicJob(job);
}

function applyProgressEvent(job: SimulationJob, line: string) {
  try {
    const event = JSON.parse(line) as { type?: string; stage?: JourneyStage; progress?: number; message?: string };
    if (event.type !== "progress" || !event.stage) {
      return false;
    }
    job.stage = event.stage;
    job.progress = Math.max(job.progress, Math.min(event.progress ?? job.progress, 100));
    job.message = event.message || job.message;
    return true;
  } catch {
    return false;
  }
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
}

function publicJob(job: SimulationJob) {
  const { child: _child, ...safeJob } = job;
  return safeJob;
}
