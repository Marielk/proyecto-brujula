"use client";

import { useCallback } from "react";
import type { LifeProfile } from "../../../lib/types";
import { cancelJourneySimulation, readJourneySimulationStatus, startJourneySimulation } from "../services/simulation";

export function useSimulation() {
  const start = useCallback(
    (input: { simulationId: string; text: string; model: string; lifeProfile: LifeProfile; signal?: AbortSignal }) =>
      startJourneySimulation(input),
    []
  );

  const readStatus = useCallback((simulationId: string) => readJourneySimulationStatus(simulationId), []);
  const cancel = useCallback((simulationId: string) => cancelJourneySimulation(simulationId), []);

  return { start, readStatus, cancel };
}
