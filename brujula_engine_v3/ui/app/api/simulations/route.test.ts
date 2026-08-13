import { describe, expect, it } from "vitest";
import { POST } from "./route";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/simulations", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

describe("POST /api/simulations", () => {
  it("rejects requests without simulationId", async () => {
    const response = await POST(jsonRequest({ text: "Destino" }) as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false, error: "Falta simulationId." });
  });

  it("rejects requests without scenario text", async () => {
    const response = await POST(jsonRequest({ simulationId: "sim_empty", text: "   " }) as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false, error: "Escribe un escenario para simular." });
  });
});
