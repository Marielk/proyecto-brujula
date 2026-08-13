import type { LifeProfile } from "../../../lib/types";
import type { SimulationJobSnapshot } from "../model";

export async function startJourneySimulation({
  simulationId,
  text,
  model,
  lifeProfile,
  signal
}: {
  simulationId: string;
  text: string;
  model: string;
  lifeProfile: LifeProfile;
  signal?: AbortSignal;
}) {
  const response = await fetch("/api/simulations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ simulationId, text, model, lifeProfile }),
    signal
  });
  const payload = await response.json();
  if (!payload.success) {
    throw new Error(payload.error || "No se pudo iniciar la simulacion.");
  }
}

export async function readJourneySimulationStatus(simulationId: string): Promise<SimulationJobSnapshot> {
  const response = await fetch(`/api/simulations/${encodeURIComponent(simulationId)}/status`, { cache: "no-store" });
  const payload = await response.json();
  if (!payload.success) {
    throw new Error(payload.error || "No se pudo consultar el estado de la simulacion.");
  }
  return payload.data as SimulationJobSnapshot;
}

export async function cancelJourneySimulation(simulationId: string) {
  await fetch(`/api/simulations/${encodeURIComponent(simulationId)}/status`, { method: "DELETE" });
}
