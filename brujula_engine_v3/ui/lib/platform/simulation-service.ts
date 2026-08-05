import { spawn } from "node:child_process";
import path from "node:path";
import type { AIProvider, JourneyProgressEvent, JourneyProviderResult, JourneySimulationRequest } from "./contracts";

const PYTHON_TIMEOUT_MS = 180000;

export const ollamaPythonProvider: AIProvider = {
  id: "ollama-python",
  kind: "ollama",
  runJourneySimulation(request, onProgress) {
    return runPythonJourneySimulation(request, onProgress);
  }
};

export function runPythonJourneySimulation(
  request: JourneySimulationRequest,
  onProgress?: (event: JourneyProgressEvent) => void,
  options: { progressEvents?: boolean } = { progressEvents: false }
) {
  const engineRoot = path.resolve(process.cwd(), "..");
  const child = spawn("python", ["-m", "brujula_engine.simulation.web_api", "--model", request.model], {
    cwd: engineRoot,
    env: {
      ...process.env,
      BRUJULA_OLLAMA_TIMEOUT: process.env.BRUJULA_OLLAMA_TIMEOUT || "60",
      BRUJULA_PROGRESS_EVENTS: options.progressEvents ? "1" : "0",
      PYTHONIOENCODING: "utf-8"
    },
    stdio: ["pipe", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";
  let stderrRemainder = "";

  child.stdout.setEncoding("utf-8");
  child.stderr.setEncoding("utf-8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    if (!onProgress) {
      stderr += chunk;
      return;
    }
    stderrRemainder += chunk;
    const lines = stderrRemainder.split(/\r?\n/);
    stderrRemainder = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      const event = parseProgressEvent(line);
      if (event) {
        onProgress(event);
      } else {
        stderr += `${line}\n`;
      }
    }
  });

  child.stdin.write(JSON.stringify({ simulationId: request.simulationId, text: request.text, lifeProfile: request.lifeProfile }));
  child.stdin.end();

  const result = new Promise<JourneyProviderResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("La simulación tardó demasiado. Brújula detuvo el proceso para proteger la UI."));
    }, PYTHON_TIMEOUT_MS);

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", () => {
      clearTimeout(timeout);
      const trimmed = stdout.trim();
      if (!trimmed) {
        reject(new Error(stderr.trim() || "Python no devolvió respuesta."));
        return;
      }
      try {
        resolve(JSON.parse(trimmed) as JourneyProviderResult);
      } catch {
        reject(new Error(`Respuesta inválida desde Python: ${trimmed.slice(0, 500)}`));
      }
    });
  });

  return { child, result };
}

function parseProgressEvent(line: string): JourneyProgressEvent | null {
  try {
    const event = JSON.parse(line) as JourneyProgressEvent;
    return event.type === "progress" && event.stage ? event : null;
  } catch {
    return null;
  }
}
