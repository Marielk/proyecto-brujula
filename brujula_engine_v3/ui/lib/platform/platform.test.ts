import { describe, expect, it } from "vitest";
import { memoryStorageProvider } from "./storage";
import { platformEvents, publishPlatformEvent } from "./telemetry";

describe("platform storage provider", () => {
  it("stores, reads and removes values behind the provider contract", async () => {
    const key = `test:${Date.now()}`;

    await memoryStorageProvider.set(key, { value: 42 });
    await expect(memoryStorageProvider.get(key)).resolves.toEqual({ value: 42 });

    await memoryStorageProvider.remove(key);
    await expect(memoryStorageProvider.get(key)).resolves.toBeNull();
  });
});

describe("platform telemetry", () => {
  it("removes sensitive journey text from event properties", () => {
    publishPlatformEvent("JourneyStarted", {
      simulationId: "sim_safe",
      provider: "test",
      goal: "No deberia persistirse",
      text: "Tampoco deberia persistirse"
    });

    const latest = platformEvents.recent().at(-1);

    expect(latest?.properties).toEqual({ simulationId: "sim_safe", provider: "test" });
  });
});
