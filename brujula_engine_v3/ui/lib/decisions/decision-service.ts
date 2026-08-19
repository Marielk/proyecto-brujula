import type { StorageProvider } from "../platform/contracts";
import type { CandidatePath, LifeProfile, SimulationResult } from "../types";
import type { DecisionRouteOption, JourneyDecision, JourneyReview, ReviewDecision } from "./contracts";
import { validateDecision, validateReview } from "./experiment-policy";
import { isJourneyDecision, isJourneyReview } from "./validators";

export const DECISIONS_STORAGE_KEY = "brujula.journeyDecisions.v0.15";
export const REVIEWS_STORAGE_KEY = "brujula.journeyReviews.v0.15";
const LEGACY_DECISIONS_STORAGE_KEY = "brujula.journeyDecisions.v0.14";

export type DecisionRepository = {
  listDecisions(): Promise<JourneyDecision[]>;
  getDecision(id: string): Promise<JourneyDecision | null>;
  saveDecision(decision: JourneyDecision): Promise<JourneyDecision>;
  archiveDecision(id: string): Promise<void>;
  deleteDecision(id: string): Promise<void>;
  listReviews(decisionId?: string): Promise<JourneyReview[]>;
  saveReview(review: JourneyReview): Promise<JourneyReview>;
};

export function createDecisionRepository(storage: StorageProvider): DecisionRepository {
  return {
    async listDecisions() {
      const migrated = await migrateLegacyDecisions(storage);
      const stored = migrated || (await storage.get<unknown[]>(DECISIONS_STORAGE_KEY)) || [];
      return stored.filter(isJourneyDecision).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async getDecision(id) {
      const decisions = await this.listDecisions();
      return decisions.find((decision) => decision.id === id) || null;
    },
    async saveDecision(decision) {
      const errors = validateDecision(decision);
      if (errors.length > 0) {
        throw new Error(errors.join(" "));
      }
      const decisions = await this.listDecisions();
      const next = [decision, ...decisions.filter((item) => item.id !== decision.id)];
      await storage.set(DECISIONS_STORAGE_KEY, next);
      return decision;
    },
    async archiveDecision(id) {
      const decisions = await this.listDecisions();
      const next = decisions.map((decision) => (decision.id === id ? { ...decision, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : decision));
      await storage.set(DECISIONS_STORAGE_KEY, next);
    },
    async deleteDecision(id) {
      const decisions = await this.listDecisions();
      const reviews = await this.listReviews();
      await storage.set(DECISIONS_STORAGE_KEY, decisions.filter((decision) => decision.id !== id));
      await storage.set(REVIEWS_STORAGE_KEY, reviews.filter((review) => review.decisionId !== id));
    },
    async listReviews(decisionId) {
      const stored = (await storage.get<unknown[]>(REVIEWS_STORAGE_KEY)) || [];
      const reviews = stored.filter(isJourneyReview);
      return (decisionId ? reviews.filter((review) => review.decisionId === decisionId) : reviews).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async saveReview(review) {
      const errors = validateReview(review);
      if (errors.length > 0) {
        throw new Error(errors.join(" "));
      }
      const reviews = await this.listReviews();
      await storage.set(REVIEWS_STORAGE_KEY, [review, ...reviews.filter((item) => item.id !== review.id)]);
      return review;
    }
  };
}

export function buildRouteOptions(result: SimulationResult): DecisionRouteOption[] {
  const guidance = result.lifeReport.journeyGuidance;
  const selected = guidance?.selectedPath || result.selectedPath;
  const candidates = guidance?.candidatePaths || result.candidatePaths || [];
  const discarded = guidance?.discardedPaths || candidates.filter((path) => path.id !== selected?.id);
  const unique = [selected, ...candidates, ...discarded].filter(Boolean) as CandidatePath[];
  const seen = new Set<string>();
  const options = unique.filter((path) => {
    if (seen.has(path.id)) return false;
    seen.add(path.id);
    return true;
  });
  return [
    ...options.map((path) => routeOptionFromPath(path, selected?.id === path.id)),
    {
      id: "undecided",
      name: "Todavia no quiero elegir",
      intention: "Mantener la decision abierta mientras obtienes mas claridad.",
      advantage: "Evita comprometerte antes de tener evidencia suficiente.",
      cost: "El avance puede ser mas lento.",
      reversibility: "alta",
      minimumCondition: "Definir que informacion falta para decidir.",
      reason: "No elegir todavia tambien puede ser una decision cuidadosa."
    },
    {
      id: "custom",
      name: "Quiero definir una ruta diferente",
      intention: "Combinar lo aprendido en una ruta propia.",
      advantage: "Respeta tu lectura humana del contexto.",
      cost: "Requiere formular limites y senales con mas cuidado.",
      reversibility: "editable",
      minimumCondition: "Nombrar la ruta y que quieres probar.",
      reason: "Elegir distinto no es ignorar a Brujula; es adaptar la hipotesis."
    }
  ];
}

export function createDecisionDraft({
  simulationId,
  goal,
  result,
  selectedRouteId,
  customRouteName,
  lifeProfile
}: {
  simulationId: string;
  goal: string;
  result: SimulationResult;
  selectedRouteId: string;
  customRouteName?: string;
  lifeProfile?: LifeProfile;
}): JourneyDecision {
  const route = buildRouteOptions(result).find((option) => option.id === selectedRouteId) || buildRouteOptions(result)[0];
  const selectedPath = [...(result.candidatePaths || []), result.selectedPath].find((path) => path?.id === selectedRouteId);
  const now = new Date();
  const durationDays = recommendDuration(result, lifeProfile);
  const reviewAt = addDays(now, durationDays).toISOString().slice(0, 10);
  const routeName = selectedRouteId === "custom" && customRouteName?.trim() ? customRouteName.trim() : route.name;
  return {
    id: createId("decision"),
    simulationId,
    goal,
    selectedPathId: selectedRouteId === "custom" || selectedRouteId === "undecided" ? undefined : selectedRouteId,
    selectedPathName: routeName,
    status: "draft",
    learningQuestion: learningQuestionFor(routeName, result),
    experiment: {
      title: `Probar ${routeName}`,
      purpose: `Obtener evidencia real sobre: ${route.intention}`,
      durationDays,
      weeklyTimeLimit: recommendWeeklyTime(lifeProfile),
      budgetLimit: recommendBudgetLimit(lifeProfile),
      actions: actionsFor(selectedPath, durationDays),
      signals: signalsFor(routeName),
      startsAt: now.toISOString().slice(0, 10),
      reviewAt
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

export function createReviewDraft(decision: JourneyDecision, nextDecision: ReviewDecision = "undecided"): JourneyReview {
  return {
    id: createId("review"),
    decisionId: decision.id,
    completedActions: decision.experiment.actions.filter((action) => action.done).map((action) => action.id),
    evidence: [],
    energyAfter: undefined,
    timeSpentHours: undefined,
    moneySpent: undefined,
    worked: "",
    difficult: "",
    learning: "",
    nextDecision,
    createdAt: new Date().toISOString()
  };
}

export function learningContextForSimulation(decisions: JourneyDecision[], reviews: JourneyReview[]) {
  const latest = decisions
    .filter((decision) => !decision.archivedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3)
    .map((decision) => {
      const review = reviews.find((item) => item.decisionId === decision.id);
      const learning = review?.learning ? ` Aprendizaje: ${review.learning}` : "";
      return `${decision.selectedPathName}: ${decision.learningQuestion}.${learning}`;
    });
  return latest.length ? `\n\nAprendizajes previos para considerar:\n- ${latest.join("\n- ")}` : "";
}

function routeOptionFromPath(path: CandidatePath, recommended: boolean): DecisionRouteOption {
  return {
    id: path.id,
    name: path.name,
    intention: path.description || path.firstStep,
    advantage: path.assumptions?.[0] || path.expectedEffects?.[0] || "Aumenta claridad con un paso acotado.",
    cost: path.tradeoffs?.[0] || path.pauseConditions?.[0] || "Exige tiempo y atencion sostenida.",
    reversibility: path.reversibility || "media",
    minimumCondition: path.advanceConditions?.[0] || path.requirements?.[0] || "Probarla sin romper limites importantes.",
    reason: recommended ? "Fue recomendada por su balance comparativo." : "Fue considerada como alternativa viable para aprender."
  };
}

function actionsFor(path: CandidatePath | undefined, durationDays: 7 | 30) {
  const source = path?.steps?.map((step) => (typeof step === "string" ? step : step.title)) || [];
  const fallback = [
    "Escribir hoy una hipotesis de una pagina sobre esta ruta y sus limites.",
    "Conversar durante las proximas 48 horas con una persona que pueda aportar evidencia.",
    "Registrar energia, tiempo usado y dudas despues de cada accion.",
    "Comparar al final del experimento que evidencia invita a continuar, ajustar o detener."
  ];
  return (source.length ? source : fallback).slice(0, durationDays === 7 ? 3 : 5).map((title, index) => ({
    id: createId(`action_${index + 1}`),
    title: ensureObservableAction(title, index),
    done: false
  }));
}

function signalsFor(routeName: string) {
  return [
    { id: createId("signal_continue"), kind: "continue" as const, description: `Continuar si ${routeName} genera evidencia concreta sin dañar salud, tiempo ni relaciones.` },
    { id: createId("signal_adjust"), kind: "adjust" as const, description: "Ajustar si el costo de energia, dinero o agenda supera lo previsto." },
    { id: createId("signal_stop"), kind: "stop" as const, description: "Detener si el experimento exige una renuncia irreversible o contradice limites no negociables." }
  ];
}

function learningQuestionFor(routeName: string, result: SimulationResult) {
  const domain = result.goal?.domain || result.lifeReport.lifeSummary?.domain || "esta ruta";
  return `Que necesito observar para saber si ${routeName} puede sostenerse en mi vida real dentro del dominio ${domain}?`;
}

function recommendDuration(result: SimulationResult, profile?: LifeProfile): 7 | 30 {
  if ((profile?.lifeGarden.dailyEnergy || 3) <= 2) return 7;
  if (result.selectedPath?.financialRisk === "alto") return 7;
  return 30;
}

function recommendWeeklyTime(profile?: LifeProfile) {
  return (profile?.lifeGarden.dailyEnergy || 3) <= 2 ? 2 : 4;
}

function recommendBudgetLimit(profile?: LifeProfile) {
  const feeling = profile?.finances.financialFeeling || 3;
  return feeling <= 2 ? 0 : 30000;
}

function ensureObservableAction(title: string, index: number) {
  const cleaned = title.trim().replace(/^\d+[\).\s-]*/, "");
  if (/^(crear|escribir|conversar|registrar|probar|invitar|revisar|definir|reservar|medir|contactar|preparar|hacer|leer|estudiar|reducir|observar|anotar|validar|comparar)\b/i.test(cleaned)) {
    return cleaned;
  }
  return index === 0 ? `Escribir hoy ${cleaned}` : `Registrar evidencia sobre ${cleaned}`;
}

async function migrateLegacyDecisions(storage: StorageProvider) {
  const current = await storage.get<unknown[]>(DECISIONS_STORAGE_KEY);
  if (current) return null;
  const legacy = await storage.get<unknown[]>(LEGACY_DECISIONS_STORAGE_KEY);
  if (!legacy) return null;
  const migrated = legacy.filter(isJourneyDecision);
  await storage.set(DECISIONS_STORAGE_KEY, migrated);
  await storage.remove(LEGACY_DECISIONS_STORAGE_KEY);
  return migrated;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
