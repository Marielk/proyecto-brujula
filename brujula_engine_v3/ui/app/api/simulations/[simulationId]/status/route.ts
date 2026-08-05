import { NextRequest, NextResponse } from "next/server";
import { cancelSimulationJob, getSimulationJob } from "../../store";

type RouteContext = {
  params: Promise<{ simulationId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { simulationId } = await context.params;
  const job = getSimulationJob(simulationId);
  if (!job) {
    return NextResponse.json({ success: false, error: "Simulación no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: job });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { simulationId } = await context.params;
  const job = cancelSimulationJob(simulationId);
  if (!job) {
    return NextResponse.json({ success: false, error: "Simulación no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: job });
}
