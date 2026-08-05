import { NextRequest, NextResponse } from "next/server";
import { runPythonJourneySimulation } from "../../../lib/platform/simulation-service";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const model = typeof body?.model === "string" && body.model.trim() ? body.model.trim() : "llama3.2:1b";
  const simulationId = typeof body?.simulationId === "string" && body.simulationId.trim() ? body.simulationId.trim() : "";
  const lifeProfile = body?.lifeProfile && typeof body.lifeProfile === "object" ? body.lifeProfile : null;

  if (!text) {
    return NextResponse.json({ success: false, error: "Escribe un escenario para simular." }, { status: 400 });
  }

  try {
    const result = await runPythonSimulation(text, model, lifeProfile, simulationId);
    const status = result.success ? 200 : 500;
    return NextResponse.json(result, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al ejecutar la simulación.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function runPythonSimulation(text: string, model: string, lifeProfile: unknown, simulationId: string) {
  return runPythonJourneySimulation({ simulationId, text, model, lifeProfile }).result;
}
