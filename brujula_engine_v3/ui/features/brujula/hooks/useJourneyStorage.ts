"use client";

import { useCallback, useMemo } from "react";
import type { DailyCheckIn, LifeProfile, RitualOutcome } from "../../../lib/types";
import type { StoredJourneyResult } from "../model";
import {
  readDailyCheckIn,
  readActiveJourneyId,
  readPendingLearningContext,
  readLifeProfile,
  readRitualOutcome,
  readStoredJourneyResults,
  removeLifeProfile,
  removeActiveJourneyId,
  removePendingLearningContext,
  removeStoredJourneyResult,
  writeActiveJourneyId,
  writePendingLearningContext,
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
  const readPendingLearningContextAction = useCallback(() => readPendingLearningContext(), []);
  const writePendingLearningContextAction = useCallback((context: string) => writePendingLearningContext(context), []);
  const removePendingLearningContextAction = useCallback(() => removePendingLearningContext(), []);
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
      readPendingLearningContext: readPendingLearningContextAction,
      writePendingLearningContext: writePendingLearningContextAction,
      removePendingLearningContext: removePendingLearningContextAction,
      readStoredJourneyResults: readStoredJourneyResultsAction,
      writeStoredJourneyResult: writeStoredJourneyResultAction,
      removeStoredJourneyResult: removeStoredJourneyResultAction
    }),
    [
      readDailyCheckInAction,
      readLifeProfileAction,
      readActiveJourneyIdAction,
      readRitualOutcomeAction,
      readPendingLearningContextAction,
      readStoredJourneyResultsAction,
      removeLifeProfileAction,
      removeActiveJourneyIdAction,
      removeStoredJourneyResultAction,
      removePendingLearningContextAction,
      writeActiveJourneyIdAction,
      writeDailyCheckInAction,
      writeLifeProfileAction,
      writePendingLearningContextAction,
      writeRitualOutcomeAction,
      writeStoredJourneyResultAction
    ]
  );
}
