import { describe, expect, it } from "vitest";
import { DELETE, GET } from "./route";

const request = new Request("http://localhost/api/simulations/missing/status");
const context = { params: Promise.resolve({ simulationId: "missing" }) };

describe("/api/simulations/[simulationId]/status", () => {
  it("returns 404 when a simulation does not exist", async () => {
    const response = await GET(request as never, context);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ success: false, error: "Simulación no encontrada." });
  });

  it("returns 404 when cancelling a missing simulation", async () => {
    const response = await DELETE(request as never, context);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ success: false, error: "Simulación no encontrada." });
  });
});
