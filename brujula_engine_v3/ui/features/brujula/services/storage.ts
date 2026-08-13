import { defaultCheckIn } from "../../../lib/garden";
import type { DailyCheckIn, LifeProfile, RitualOutcome } from "../../../lib/types";
import {
  ACTIVE_JOURNEY_STORAGE_KEY,
  CHECKIN_STORAGE_KEY,
  JOURNEY_RESULTS_STORAGE_KEY,
  LEGACY_JOURNEY_RESULTS_STORAGE_KEY,
  OUTCOME_STORAGE_KEY,
  STORAGE_KEY,
  type JourneyFlowState,
  type StoredJourneyResult,
  type StoredJourneyResults
} from "../model";
import { mergeProfile } from "../profile-utils";

function safeLocalStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function readLifeProfile(): LifeProfile | null {
  const storage = safeLocalStorage();
  const saved = storage?.getItem(STORAGE_KEY);
  if (!storage || !saved) return null;
  try {
    return mergeProfile(JSON.parse(saved) as LifeProfile);
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function writeLifeProfile(profile: LifeProfile) {
  safeLocalStorage()?.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function removeLifeProfile() {
  safeLocalStorage()?.removeItem(STORAGE_KEY);
}

export function readDailyCheckIn(): DailyCheckIn {
  const storage = safeLocalStorage();
  const saved = storage?.getItem(CHECKIN_STORAGE_KEY);
  if (!storage || !saved) return defaultCheckIn;
  try {
    return { ...defaultCheckIn, ...JSON.parse(saved) };
  } catch {
    storage.removeItem(CHECKIN_STORAGE_KEY);
    return defaultCheckIn;
  }
}

export function writeDailyCheckIn(checkIn: DailyCheckIn) {
  safeLocalStorage()?.setItem(CHECKIN_STORAGE_KEY, JSON.stringify(checkIn));
}

export function readRitualOutcome(): RitualOutcome | null {
  const storage = safeLocalStorage();
  const saved = storage?.getItem(OUTCOME_STORAGE_KEY);
  if (!storage || !saved) return null;
  try {
    return JSON.parse(saved) as RitualOutcome;
  } catch {
    storage.removeItem(OUTCOME_STORAGE_KEY);
    return null;
  }
}

export function writeRitualOutcome(outcome: RitualOutcome) {
  safeLocalStorage()?.setItem(OUTCOME_STORAGE_KEY, JSON.stringify(outcome));
}

export function readActiveJourneyId() {
  return safeLocalStorage()?.getItem(ACTIVE_JOURNEY_STORAGE_KEY) || "";
}

export function writeActiveJourneyId(simulationId: string) {
  safeLocalStorage()?.setItem(ACTIVE_JOURNEY_STORAGE_KEY, simulationId);
}

export function removeActiveJourneyId() {
  safeLocalStorage()?.removeItem(ACTIVE_JOURNEY_STORAGE_KEY);
}

export function readStoredJourneyResults(): StoredJourneyResults {
  const storage = safeLocalStorage();
  const empty: StoredJourneyResults = { items: {} };
  if (!storage) return empty;

  const raw = storage.getItem(JOURNEY_RESULTS_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredJourneyResults;
      return { latest: parsed.latest, items: parsed.items || {} };
    } catch {
      storage.removeItem(JOURNEY_RESULTS_STORAGE_KEY);
    }
  }

  const legacy = storage.getItem(LEGACY_JOURNEY_RESULTS_STORAGE_KEY);
  if (!legacy) return empty;

  try {
    const parsed = JSON.parse(legacy) as JourneyFlowState;
    if (parsed.status !== "result") return empty;
    const migrated = { latest: parsed.simulationId, items: { [parsed.simulationId]: parsed } };
    storage.setItem(JOURNEY_RESULTS_STORAGE_KEY, JSON.stringify(migrated));
    storage.removeItem(LEGACY_JOURNEY_RESULTS_STORAGE_KEY);
    return migrated;
  } catch {
    storage.removeItem(LEGACY_JOURNEY_RESULTS_STORAGE_KEY);
    return empty;
  }
}

export function writeStoredJourneyResult(resultFlow: StoredJourneyResult) {
  const storage = safeLocalStorage();
  if (!storage) return;
  const stored = readStoredJourneyResults();
  stored.latest = resultFlow.simulationId;
  stored.items[resultFlow.simulationId] = resultFlow;
  storage.setItem(JOURNEY_RESULTS_STORAGE_KEY, JSON.stringify(stored));
}

export function removeStoredJourneyResult(simulationId?: string) {
  const storage = safeLocalStorage();
  if (!storage) return;
  const stored = readStoredJourneyResults();
  if (simulationId) {
    delete stored.items[simulationId];
    if (stored.latest === simulationId) {
      stored.latest = Object.keys(stored.items).at(-1);
    }
  } else {
    stored.latest = undefined;
    stored.items = {};
  }
  storage.setItem(JOURNEY_RESULTS_STORAGE_KEY, JSON.stringify(stored));
}
