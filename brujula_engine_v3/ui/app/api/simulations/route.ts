import { NextRequest, NextResponse } from "next/server";
import { startSimulationJob } from "./store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const simulationId = typeof body?.simulationId === "string" && body.simulationId.trim() ? body.simulationId.trim() : "";
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const model = typeof body?.model === "string" && body.model.trim() ? body.model.trim() : "llama3.2:1b";
  const lifeProfile = body?.lifeProfile && typeof body.lifeProfile === "object" ? body.lifeProfile : null;

  if (!simulationId) {
    return NextResponse.json({ success: false, error: "Falta simulationId." }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ success: false, error: "Escribe un escenario para simular." }, { status: 400 });
  }

  const job = await startSimulationJob({ simulationId, text, model, lifeProfile });
  return NextResponse.json({ success: true, data: job }, { status: 202 });
}
