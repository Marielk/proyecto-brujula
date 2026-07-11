import { spawn } from "node:child_process";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

type PythonResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};

const PYTHON_TIMEOUT_MS = 65000;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const model = typeof body?.model === "string" && body.model.trim() ? body.model.trim() : "llama3.2:1b";
  const lifeProfile = body?.lifeProfile && typeof body.lifeProfile === "object" ? body.lifeProfile : null;

  if (!text) {
    return NextResponse.json({ success: false, error: "Escribe un escenario para simular." }, { status: 400 });
  }

  try {
    const result = await runPythonSimulation(text, model, lifeProfile);
    const status = result.success ? 200 : 500;
    return NextResponse.json(result, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al ejecutar la simulación.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function runPythonSimulation(text: string, model: string, lifeProfile: unknown): Promise<PythonResponse> {
  const engineRoot = path.resolve(process.cwd(), "..");
  const child = spawn("python", ["-m", "brujula_engine.simulation.web_api", "--model", model], {
    cwd: engineRoot,
    env: {
      ...process.env,
      BRUJULA_OLLAMA_TIMEOUT: process.env.BRUJULA_OLLAMA_TIMEOUT || "6",
      PYTHONIOENCODING: "utf-8"
    },
    stdio: ["pipe", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";

  child.stdout.setEncoding("utf-8");
  child.stderr.setEncoding("utf-8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  child.stdin.write(JSON.stringify({ text, lifeProfile }));
  child.stdin.end();

  return new Promise((resolve, reject) => {
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
        resolve(JSON.parse(trimmed) as PythonResponse);
      } catch {
        reject(new Error(`Respuesta inválida desde Python: ${trimmed.slice(0, 500)}`));
      }
    });
  });
}
