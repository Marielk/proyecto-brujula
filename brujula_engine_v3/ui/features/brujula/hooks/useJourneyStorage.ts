"use client";

import { useCallback, useMemo } from "react";
import type { DailyCheckIn, LifeProfile, RitualOutcome } from "../../../lib/types";
import type { StoredJourneyResult } from "../model";
import {
  readDailyCheckIn,
  readActiveJourneyId,
  readLifeProfile,
  readRitualOutcome,
  readStoredJourneyResults,
  removeLifeProfile,
  removeActiveJourneyId,
  removeStoredJourneyResult,
  writeActiveJourneyId,
  writeDailyCheckIn,
  writeLifeProfile,
  writeRitualOutcome,
  writeStoredJourneyResult
} from "../services/storage";

export function useJourneyStorage() {
  const readLifeProfileAction = useCallback(() => readLifeProfile(), []);
  const writeLifeProfileAction = useCallback((profile: LifeProfile) => writeLifeProfile(profile), []);
  const removeLifeProfileAction = useCallback(() => removeLifeProfile(), []);
  const readDailyCheckInAction = useCallback(() => readDailyCheckIn(), []);
  const writeDailyCheckInAction = useCallback((checkIn: DailyCheckIn) => writeDailyCheckIn(checkIn), []);
  const readRitualOutcomeAction = useCallback(() => readRitualOutcome(), []);
  const writeRitualOutcomeAction = useCallback((outcome: RitualOutcome) => writeRitualOutcome(outcome), []);
  const readActiveJourneyIdAction = useCallback(() => readActiveJourneyId(), []);
  const writeActiveJourneyIdAction = useCallback((simulationId: string) => writeActiveJourneyId(simulationId), []);
  const removeActiveJourneyIdAction = useCallback(() => removeActiveJourneyId(), []);
  const readStoredJourneyResultsAction = useCallback(() => readStoredJourneyResults(), []);
  const writeStoredJourneyResultAction = useCallback((result: StoredJourneyResult) => writeStoredJourneyResult(result), []);
  const removeStoredJourneyResultAction = useCallback((simulationId?: string) => removeStoredJourneyResult(simulationId), []);

  return useMemo(
    () => ({
      readLifeProfile: readLifeProfileAction,
      writeLifeProfile: writeLifeProfileAction,
      removeLifeProfile: removeLifeProfileAction,
      readDailyCheckIn: readDailyCheckInAction,
      writeDailyCheckIn: writeDailyCheckInAction,
      readRitualOutcome: readRitualOutcomeAction,
      writeRitualOutcome: writeRitualOutcomeAction,
      readActiveJourneyId: readActiveJourneyIdAction,
      writeActiveJourneyId: writeActiveJourneyIdAction,
      removeActiveJourneyId: removeActiveJourneyIdAction,
      readStoredJourneyResults: readStoredJourneyResultsAction,
      writeStoredJourneyResult: writeStoredJourneyResultAction,
      removeStoredJourneyResult: removeStoredJourneyResultAction
    }),
    [
      readDailyCheckInAction,
      readLifeProfileAction,
      readActiveJourneyIdAction,
      readRitualOutcomeAction,
      readStoredJourneyResultsAction,
      removeLifeProfileAction,
      removeActiveJourneyIdAction,
      removeStoredJourneyResultAction,
      writeActiveJourneyIdAction,
      writeDailyCheckInAction,
      writeLifeProfileAction,
      writeRitualOutcomeAction,
      writeStoredJourneyResultAction
    ]
  );
}
