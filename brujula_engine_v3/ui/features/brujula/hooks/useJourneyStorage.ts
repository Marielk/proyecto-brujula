"use client";

import { useCallback } from "react";
import type { DailyCheckIn, LifeProfile, RitualOutcome } from "../../../lib/types";
import type { StoredJourneyResult } from "../model";
import {
  readDailyCheckIn,
  readLifeProfile,
  readRitualOutcome,
  readStoredJourneyResults,
  removeLifeProfile,
  removeStoredJourneyResult,
  writeDailyCheckIn,
  writeLifeProfile,
  writeRitualOutcome,
  writeStoredJourneyResult
} from "../services/storage";

export function useJourneyStorage() {
  return {
    readLifeProfile: useCallback(() => readLifeProfile(), []),
    writeLifeProfile: useCallback((profile: LifeProfile) => writeLifeProfile(profile), []),
    removeLifeProfile: useCallback(() => removeLifeProfile(), []),
    readDailyCheckIn: useCallback(() => readDailyCheckIn(), []),
    writeDailyCheckIn: useCallback((checkIn: DailyCheckIn) => writeDailyCheckIn(checkIn), []),
    readRitualOutcome: useCallback(() => readRitualOutcome(), []),
    writeRitualOutcome: useCallback((outcome: RitualOutcome) => writeRitualOutcome(outcome), []),
    readStoredJourneyResults: useCallback(() => readStoredJourneyResults(), []),
    writeStoredJourneyResult: useCallback((result: StoredJourneyResult) => writeStoredJourneyResult(result), []),
    removeStoredJourneyResult: useCallback((simulationId?: string) => removeStoredJourneyResult(simulationId), [])
  };
}
