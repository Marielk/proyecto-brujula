import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyProfile } from "../model";
import { cancelJourneySimulation, readJourneySimulationStatus, startJourneySimulation } from "./simulation";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("journey simulation client service", () => {
  it("starts a journey simulation through the API contract", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({ success: true, data: { id: "sim_1" } })
    } as Response);

    await startJourneySimulation({ simulationId: "sim_1", text: "Mi destino", model: "local", lifeProfile: emptyProfile });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/simulations",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulationId: "sim_1", text: "Mi destino", model: "local", lifeProfile: emptyProfile })
      })
    );
  });

  it("throws API errors when a simulation cannot start", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({ success: false, error: "Fallo controlado" })
    } as Response);

    await expect(startJourneySimulation({ simulationId: "sim_2", text: "Destino", model: "local", lifeProfile: emptyProfile })).rejects.toThrow(
      "Fallo controlado"
    );
  });

  it("reads and cancels simulation status by encoded simulation id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({ success: true, data: { id: "sim/3", status: "cancelled" } })
    } as Response);

    await expect(readJourneySimulationStatus("sim/3")).resolves.toMatchObject({ id: "sim/3", status: "cancelled" });
    await cancelJourneySimulation("sim/3");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/simulations/sim%2F3/status", { cache: "no-store" });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/simulations/sim%2F3/status", { method: "DELETE" });
  });
});
