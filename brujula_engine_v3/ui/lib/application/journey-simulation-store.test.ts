import { afterEach, describe, expect, it, vi } from "vitest";
import type { AIProvider } from "../platform/contracts";
import { resetJourneyProvider, setJourneyProvider } from "../platform/ai-provider-registry";
import { fileStorageProvider } from "../platform/file-storage";
import {
  cancelSimulationJob,
  clearSimulationJobsForTests,
  getSimulationJob,
  removeSimulationJobForTests,
  startSimulationJob
} from "./journey-simulation-store";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

afterEach(async () => {
  resetJourneyProvider();
  clearSimulationJobsForTests();
  await Promise.all(
    [
      "sim_test",
      "sim_invalid",
      "sim_cancel",
      "sim_persisted",
      "sim_interrupted",
      "sim_fresh",
      "sim_throw",
      "sim_remote_cancel",
      "sim_reused"
    ].map((id) => removeSimulationJobForTests(id))
  );
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

    const started = await startSimulationJob({ simulationId: "sim_test", text: "Quiero cambiar de ruta", model: "local", lifeProfile: null });

    expect(started.status).toBe("loading");
    expect(started.stage).toBe("understanding_goal");
    await vi.waitFor(async () => expect((await getSimulationJob("sim_test"))?.progress).toBe(35));

    result.resolve({ success: true, data: validResult });
    await vi.waitFor(async () => expect((await getSimulationJob("sim_test"))?.status).toBe("result"));
    expect((await getSimulationJob("sim_test"))?.result).toEqual(validResult);
  });

  it("recovers a terminal job snapshot after the in-memory map is cleared", async () => {
    const validResult = createSimulationResult();
    const provider: AIProvider = {
      id: "persist-provider",
      kind: "local",
      runJourneySimulation: () => ({ result: Promise.resolve({ success: true, data: validResult }) })
    };
    setJourneyProvider(provider);

    await startSimulationJob({ simulationId: "sim_persisted", text: "Persistir", model: "local", lifeProfile: null });
    await vi.waitFor(async () => expect((await getSimulationJob("sim_persisted"))?.status).toBe("result"));
    clearSimulationJobsForTests();

    await expect(getSimulationJob("sim_persisted")).resolves.toMatchObject({ status: "result", result: validResult });
  });

  it("marks a persisted loading job as interrupted when no process is active", async () => {
    await fileStorageProvider.set("journey-simulation:sim_interrupted", {
      id: "sim_interrupted",
      status: "loading",
      goal: "Destino",
      stage: "comparing_paths",
      progress: 90,
      message: "Comparando",
      createdAt: new Date().toISOString(),
      ownerId: "stale-owner",
      heartbeatAt: new Date(Date.now() - 60000).toISOString()
    });

    await expect(getSimulationJob("sim_interrupted")).resolves.toMatchObject({
      status: "error",
      error: "La simulacion fue interrumpida porque el proceso del servidor ya no esta activo."
    });
  });

  it("keeps a persisted loading job active when another owner has a fresh heartbeat", async () => {
    await fileStorageProvider.set("journey-simulation:sim_fresh", {
      id: "sim_fresh",
      status: "loading",
      goal: "Destino",
      stage: "comparing_paths",
      progress: 90,
      message: "Comparando",
      createdAt: new Date().toISOString(),
      ownerId: "other-instance",
      heartbeatAt: new Date().toISOString()
    });

    await expect(getSimulationJob("sim_fresh")).resolves.toMatchObject({ status: "loading", progress: 90 });
  });

  it("requests remote cancellation without overwriting a fresh owner heartbeat", async () => {
    await fileStorageProvider.set("journey-simulation:sim_fresh", {
      id: "sim_fresh",
      status: "loading",
      goal: "Destino",
      stage: "comparing_paths",
      progress: 90,
      message: "Comparando",
      createdAt: new Date().toISOString(),
      ownerId: "other-instance",
      heartbeatAt: new Date().toISOString()
    });

    await expect(cancelSimulationJob("sim_fresh")).resolves.toMatchObject({
      status: "loading",
      cancellationRequestedAt: expect.any(String)
    });
  });

  it("lets the owner honor a remote cancellation request before writing more progress", async () => {
    const kill = vi.fn();
    let progress:
      | ((event: { type: "progress"; stage: "comparing_paths"; progress: number; message: string }) => void)
      | undefined;
    const provider: AIProvider = {
      id: "remote-cancel-provider",
      kind: "local",
      runJourneySimulation: (_request, onProgress) => {
        progress = onProgress as typeof progress;
        return { child: { kill }, result: new Promise(() => undefined) };
      }
    };
    setJourneyProvider(provider);

    const started = await startSimulationJob({ simulationId: "sim_remote_cancel", text: "Destino", model: "local", lifeProfile: null });
    await fileStorageProvider.set("journey-simulation:sim_remote_cancel", {
      ...started,
      cancellationRequestedAt: new Date().toISOString()
    });

    progress?.({ type: "progress", stage: "comparing_paths", progress: 90, message: "No debe persistir" });

    await vi.waitFor(async () => expect((await getSimulationJob("sim_remote_cancel"))?.status).toBe("cancelled"));
    expect(kill).toHaveBeenCalledWith("SIGKILL");
    expect(await getSimulationJob("sim_remote_cancel")).toMatchObject({ status: "cancelled", message: "Simulacion cancelada." });
  });

  it("stops an existing job when the same simulationId is reused", async () => {
    const oldKill = vi.fn();
    let oldProgress:
      | ((event: { type: "progress"; stage: "comparing_paths"; progress: number; message: string }) => void)
      | undefined;
    const oldProvider: AIProvider = {
      id: "old-provider",
      kind: "local",
      runJourneySimulation: (_request, onProgress) => {
        oldProgress = onProgress as typeof oldProgress;
        return { child: { kill: oldKill }, result: new Promise(() => undefined) };
      }
    };
    setJourneyProvider(oldProvider);
    await startSimulationJob({ simulationId: "sim_reused", text: "Viejo", model: "local", lifeProfile: null });

    const newResult = createSimulationResult();
    const newProvider: AIProvider = {
      id: "new-provider",
      kind: "local",
      runJourneySimulation: () => ({ result: Promise.resolve({ success: true, data: newResult }) })
    };
    setJourneyProvider(newProvider);
    await startSimulationJob({ simulationId: "sim_reused", text: "Nuevo", model: "local", lifeProfile: null });
    oldProgress?.({ type: "progress", stage: "comparing_paths", progress: 99, message: "Viejo progreso" });

    expect(oldKill).toHaveBeenCalledWith("SIGKILL");
    await vi.waitFor(async () => expect((await getSimulationJob("sim_reused"))?.status).toBe("result"));
    expect(await getSimulationJob("sim_reused")).toMatchObject({ goal: "Nuevo", result: newResult });
  });

  it("turns synchronous provider startup failures into controlled job errors", async () => {
    const provider: AIProvider = {
      id: "throwing-provider",
      kind: "local",
      runJourneySimulation: () => {
        throw new Error("Proveedor no disponible");
      }
    };
    setJourneyProvider(provider);

    const started = await startSimulationJob({ simulationId: "sim_throw", text: "Destino", model: "local", lifeProfile: null });

    expect(started).toMatchObject({ status: "error", error: "Proveedor no disponible" });
    await expect(getSimulationJob("sim_throw")).resolves.toMatchObject({ status: "error", error: "Proveedor no disponible" });
  });

  it("rejects successful provider responses that do not match the result contract", async () => {
    const provider: AIProvider = {
      id: "invalid-provider",
      kind: "local",
      runJourneySimulation: () => ({ result: Promise.resolve({ success: true, data: { answer: "missing contract" } }) })
    };
    setJourneyProvider(provider);

    await startSimulationJob({ simulationId: "sim_invalid", text: "Destino", model: "local", lifeProfile: null });

    await vi.waitFor(async () => expect((await getSimulationJob("sim_invalid"))?.status).toBe("error"));
    expect((await getSimulationJob("sim_invalid"))?.error).toContain("Resultado de simulacion invalido");
  });

  it("cancels an active job without exposing the child process", async () => {
    const kill = vi.fn();
    const provider: AIProvider = {
      id: "slow-provider",
      kind: "local",
      runJourneySimulation: () => ({ child: { kill }, result: new Promise(() => undefined) })
    };
    setJourneyProvider(provider);

    await startSimulationJob({ simulationId: "sim_cancel", text: "Pausar", model: "local", lifeProfile: null });
    const cancelled = await cancelSimulationJob("sim_cancel");

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
