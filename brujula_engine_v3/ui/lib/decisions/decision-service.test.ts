import { describe, expect, it } from "vitest";
import type { StorageProvider } from "../platform/contracts";
import type { SimulationResult } from "../types";
import { createDecisionDraft, createDecisionRepository, createReviewDraft, DECISIONS_STORAGE_KEY } from "./decision-service";
import { validateDecision, validateReview } from "./experiment-policy";

function memoryStorage(): StorageProvider {
  const values = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return (values.get(key) as T | undefined) ?? null;
    },
    async set<T>(key: string, value: T) {
      values.set(key, value);
    },
    async remove(key: string) {
      values.delete(key);
    }
  };
}

describe("ExperimentPolicy", () => {
  it("validates duration, actions, observable content and valid stop outcomes", () => {
    const decision = createDecisionDraft({ simulationId: "sim", goal: "Destino", result: simulationResult(), selectedRouteId: "path_alt" });
    expect(validateDecision(decision)).toEqual([]);
    expect(validateDecision({ ...decision, experiment: { ...decision.experiment, durationDays: 14 as 7 } })).toContain("El experimento debe durar 7 o 30 dias.");
    expect(validateDecision({ ...decision, experiment: { ...decision.experiment, actions: [] } })).toContain("El experimento necesita al menos una accion.");
    expect(validateDecision({ ...decision, experiment: { ...decision.experiment, actions: [{ id: "a", title: "", done: false }] } })).toContain("Cada accion necesita contenido observable.");

    const review = createReviewDraft(decision, "stop");
    expect(validateReview({ ...review, learning: "Aprendi que debo detenerme por ahora." })).toEqual([]);
  });
});

describe("DecisionService", () => {
  it("creates, updates and recovers a decision without duplicates", async () => {
    const repository = createDecisionRepository(memoryStorage());
    const draft = createDecisionDraft({ simulationId: "sim", goal: "Destino", result: simulationResult(), selectedRouteId: "path_alt" });
    await repository.saveDecision(draft);
    await repository.saveDecision({ ...draft, status: "planned", updatedAt: new Date().toISOString() });

    const decisions = await repository.listDecisions();
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({ selectedPathId: "path_alt", selectedPathName: "Ruta alternativa", status: "planned" });
  });

  it("registers a review and keeps it recoverable after recreating the repository", async () => {
    const storage = memoryStorage();
    const repository = createDecisionRepository(storage);
    const draft = createDecisionDraft({ simulationId: "sim", goal: "Destino", result: simulationResult(), selectedRouteId: "path_recommended" });
    await repository.saveDecision(draft);
    await repository.saveReview({ ...createReviewDraft(draft, "adjust"), learning: "Necesito bajar el alcance.", worked: "Hubo interes.", difficult: "Tiempo real." });

    const recovered = createDecisionRepository(storage);
    await expect(recovered.listDecisions()).resolves.toHaveLength(1);
    await expect(recovered.listReviews(draft.id)).resolves.toMatchObject([{ nextDecision: "adjust", learning: "Necesito bajar el alcance." }]);
  });

  it("migrates compatible legacy decisions into v0.15 storage", async () => {
    const storage = memoryStorage();
    const legacy = createDecisionDraft({ simulationId: "sim", goal: "Destino", result: simulationResult(), selectedRouteId: "path_recommended" });
    await storage.set("brujula.journeyDecisions.v0.14", [legacy]);

    const repository = createDecisionRepository(storage);

    await expect(repository.listDecisions()).resolves.toHaveLength(1);
    await expect(storage.get(DECISIONS_STORAGE_KEY)).resolves.toHaveLength(1);
  });
});

function simulationResult(): SimulationResult {
  const state = {
    year: 2026,
    age: 40,
    compass: 70,
    dashboard: { "Estabilidad financiera": 70, "Libertad para crear": 60, "Energía diaria": 65 },
    monthlyIncome: 0,
    monthlyExpenses: 0,
    debtTotal: 0,
    savings: 0,
    money: { monthlyIncome: "0", monthlyExpenses: "0", debtTotal: "0", savings: "0" }
  };
  return {
    scenario: { name: "Destino", description: "Simulacion", startYear: 2026, endYear: 2027 },
    states: [state],
    final: state,
    summary: { strongest: "claridad", weakest: "tiempo", compass: 70 },
    notes: [],
    report: "Carta de Sue",
    lifeReport: {
      summary: {
        title: "Destino",
        diagnosis: "Simulacion",
        status: "estable",
        description: "Reporte minimo",
        strongest: "claridad",
        mainCare: "tiempo"
      },
      lifeSummary: {
        diagnosticoCamino: "",
        calidadVida: 70,
        libertadFinanciera: 70,
        libertadCreativa: 60,
        saludIntegral: 70,
        energiaVital: 65,
        serenidad: 65,
        resiliencia: 70,
        esperanza: 70,
        riesgoAgotamiento: "medio",
        probabilidadArrepentimiento: "baja",
        coherenciaEstrellaNorte: "alta",
        fortalezas: [],
        cuidados: [],
        eventosCamino: [],
        valores: [],
        suenos: [],
        escenario: "Destino",
        brujulaGeneral: 70
      },
      indices: [],
      gains: [],
      sacrifices: [],
      timeline: [],
      garden: [],
      rituals: []
    },
    candidatePaths: [
      {
        id: "path_recommended",
        name: "Ruta recomendada",
        strategy: "gradual",
        description: "Probar con cuidado.",
        assumptions: ["Hay margen pequeño."],
        tradeoffs: ["Toma tiempo."],
        timeEstimate: "30 dias",
        financialRisk: "bajo",
        energyDemand: "media",
        reversibility: "alta",
        creativeUpside: "medio",
        preparation: 70,
        compass: 70,
        selectionScore: 80,
        riskLevel: "bajo",
        firstStep: "Escribir hoy una hipotesis observable."
      },
      {
        id: "path_alt",
        name: "Ruta alternativa",
        strategy: "piloto",
        description: "Validar una alternativa.",
        assumptions: ["Hay curiosidad."],
        tradeoffs: ["Requiere conversaciones."],
        timeEstimate: "7 dias",
        financialRisk: "bajo",
        energyDemand: "baja",
        reversibility: "alta",
        creativeUpside: "medio",
        preparation: 65,
        compass: 65,
        selectionScore: 70,
        riskLevel: "bajo",
        firstStep: "Conversar manana con una persona."
      }
    ],
    selectedPath: undefined,
    lifeProfile: {},
    warnings: [],
    llm: { scenario: false, report: false, model: "local" }
  };
}
