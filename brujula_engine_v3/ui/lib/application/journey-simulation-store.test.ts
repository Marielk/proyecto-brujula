import { afterEach, describe, expect, it, vi } from "vitest";
import type { AIProvider } from "../platform/contracts";
import { resetJourneyProvider, setJourneyProvider } from "../platform/ai-provider-registry";
import { cancelSimulationJob, clearSimulationJobsForTests, getSimulationJob, startSimulationJob } from "./journey-simulation-store";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

afterEach(() => {
  resetJourneyProvider();
  clearSimulationJobsForTests();
});

describe("journey simulation store", () => {
  it("starts a job through the active AI provider and completes it", async () => {
    const validResult = createSimulationResult();
    const result = deferred<{ success: true; data: ReturnType<typeof createSimulationResult> }>();
    const provider: AIProvider = {
      id: "test-provider",
      kind: "local",
      runJourneySimulation: vi.fn((_request, onProgress) => {
        onProgress?.({ type: "progress", stage: "generating_strategies", progress: 35, message: "Probando rutas" });
        return { result: result.promise };
      })
    };
    setJourneyProvider(provider);

    const started = startSimulationJob({ simulationId: "sim_test", text: "Quiero cambiar de ruta", model: "local", lifeProfile: null });

    expect(started.status).toBe("loading");
    expect(started.stage).toBe("generating_strategies");
    expect(getSimulationJob("sim_test")?.progress).toBe(35);

    result.resolve({ success: true, data: validResult });
    await vi.waitFor(() => expect(getSimulationJob("sim_test")?.status).toBe("result"));
    expect(getSimulationJob("sim_test")?.result).toEqual(validResult);
  });

  it("rejects successful provider responses that do not match the result contract", async () => {
    const provider: AIProvider = {
      id: "invalid-provider",
      kind: "local",
      runJourneySimulation: () => ({ result: Promise.resolve({ success: true, data: { answer: "missing contract" } }) })
    };
    setJourneyProvider(provider);

    startSimulationJob({ simulationId: "sim_invalid", text: "Destino", model: "local", lifeProfile: null });

    await vi.waitFor(() => expect(getSimulationJob("sim_invalid")?.status).toBe("error"));
    expect(getSimulationJob("sim_invalid")?.error).toContain("Resultado de simulacion invalido");
  });

  it("cancels an active job without exposing the child process", () => {
    const kill = vi.fn();
    const provider: AIProvider = {
      id: "slow-provider",
      kind: "local",
      runJourneySimulation: () => ({ child: { kill }, result: new Promise(() => undefined) })
    };
    setJourneyProvider(provider);

    startSimulationJob({ simulationId: "sim_cancel", text: "Pausar", model: "local", lifeProfile: null });
    const cancelled = cancelSimulationJob("sim_cancel");

    expect(kill).toHaveBeenCalledWith("SIGKILL");
    expect(cancelled).toMatchObject({ status: "cancelled", message: "Simulacion cancelada." });
    expect(cancelled).not.toHaveProperty("child");
  });
});

function createSimulationResult() {
  const state = {
    year: 2026,
    age: 40,
    compass: 70,
    dashboard: {},
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
    lifeReport: {},
    lifeProfile: {},
    warnings: [],
    llm: { scenario: false, report: false, model: "local" }
  };
}
