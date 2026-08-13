import type { LifeProfile, SimulationResult } from "../../lib/types";

export const STORAGE_KEY = "brujula.lifeProfile.v0.7";
export const CHECKIN_STORAGE_KEY = "brujula.dailyCheckIn.v0.8";
export const OUTCOME_STORAGE_KEY = "brujula.ritualOutcome.v0.8";
export const JOURNEY_RESULTS_STORAGE_KEY = "brujula.journeyResults.v0.15";
export const LEGACY_JOURNEY_RESULTS_STORAGE_KEY = "brujula.journeyResults.v0.14";
export const ACTIVE_JOURNEY_STORAGE_KEY = "brujula.activeJourney.v0.15";
export const EXAMPLE =
  "Quiero simular dedicarme gradualmente a Brújula desde 2028, bajando horas del trabajo actual, haciendo freelance para sostener ingresos y cuidando mi salud física.";
export type Mode = "home" | "garden" | "journey";
export type JourneyStage =
  | "understanding_goal"
  | "selecting_context"
  | "generating_strategies"
  | "expanding_paths"
  | "pruning_paths"
  | "comparing_paths"
  | "building_result"
  | "writing_letter"
  | "completed";
export type JourneyFlowState =
  | { status: "input"; goal: string }
  | { status: "loading"; goal: string; simulationId: string; stage: JourneyStage; progress: number; message: string; startedAt: number }
  | { status: "result"; goal: string; simulationId: string; result: SimulationResult; completedAt: string }
  | { status: "error"; goal: string; simulationId?: string; message: string; recoverable: boolean };
export type StoredJourneyResult = Extract<JourneyFlowState, { status: "result" }>;
export type StoredJourneyResults = {
  latest?: string;
  items: Record<string, StoredJourneyResult>;
};
export type SimulationJobSnapshot = {
  id: string;
  status: "loading" | "result" | "error" | "cancelled";
  goal: string;
  stage: JourneyStage;
  progress: number;
  message: string;
  createdAt: string;
  completedAt?: string;
  result?: SimulationResult;
  error?: string;
};

export const JOURNEY_STAGE_DEFINITIONS: Array<{ id: JourneyStage; label: string; message: string; progress: number }> = [
  { id: "understanding_goal", label: "Comprendiendo tu destino.", message: "Leyendo el destino y detectando el tipo de viaje.", progress: 8 },
  { id: "selecting_context", label: "Relacionándolo con tu Perfil de Vida.", message: "Seleccionando los datos del perfil que influyen en esta ruta.", progress: 18 },
  { id: "generating_strategies", label: "Creando estrategias diferentes.", message: "Armando estrategias base con ritmos y apuestas distintas.", progress: 32 },
  { id: "expanding_paths", label: "Simulando variantes de cada camino.", message: "Explorando combinaciones de tiempo, apoyo, recursos y energía.", progress: 62 },
  { id: "pruning_paths", label: "Descartando rutas frágiles o repetidas.", message: "Podando rutas que no agregan claridad o sostén suficiente.", progress: 78 },
  { id: "comparing_paths", label: "Comparando los mejores senderos.", message: "Comparando preparación, riesgo, bienestar y reversibilidad.", progress: 90 },
  { id: "building_result", label: "Preparando una explicación clara.", message: "Ordenando la recomendación y los primeros pasos.", progress: 96 },
  { id: "writing_letter", label: "Sue está dejando por escrito lo más importante.", message: "Sue está resumiendo lo más importante del recorrido.", progress: 99 },
  { id: "completed", label: "La ruta está lista.", message: "La ruta está lista.", progress: 100 }
];

export const emptyProfile: LifeProfile = {
  identity: {
    name: "",
    age: "",
    country: "Chile",
    city: "",
    household: "Vivo sola/o",
    careResponsibilities: ["Ninguno"]
  },
  workTime: {
    mainStatus: "",
    area: "",
    weeklyHours: "",
    perceivedDemand: 3,
    healthyBoundaries: 3,
    personalProjectTime: "1 a 3 horas"
  },
  lifeGarden: {
    physicalHealth: 3,
    dailyEnergy: 3,
    financialStability: 3,
    relationships: 3,
    creativity: 3,
    purpose: 3,
    freeTime: 3,
    serenity: 3
  },
  health: {
    conditions: ["Ninguna"],
    painLevel: "",
    averageEnergy: 3,
    limitsProjects: "Un poco",
    difficultActivities: ["Ninguna"]
  },
  finances: {
    incomeMode: "Prefiero no responder",
    monthlyIncome: "",
    expensesMode: "No lo sé",
    monthlyExpenses: "",
    debtLevel: "Media",
    debtAmount: "",
    savingsLevel: "Ninguno",
    incomeDependency: "Dependo de una sola fuente",
    financialFeeling: 3
  },
  northStar: {
    tenYearDay: "",
    mainDream: "",
    dreams: [],
    timeHorizon: "10 años"
  },
  values: {
    selected: [],
    topThree: [],
    nonNegotiables: ""
  },
  wellbeingPreferences: {
    recharges: [],
    drains: [],
    supportTone: "Mezcla equilibrada",
    ritualTypes: []
  }
};

export const steps = [
  "Quién eres hoy",
  "Trabajo y tiempo",
  "Tu jardín hoy",
  "Salud y limitaciones",
  "Finanzas y seguridad",
  "Estrella del Norte",
  "Valores",
  "Lo que te hace bien"
];

export function createSimulationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `sim_${crypto.randomUUID()}`;
  }
  return `sim_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function formatSimulationDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}


export function simulationIdFromPath(pathname: string | null) {
  const match = pathname?.match(/^\/viaje\/resultado\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
