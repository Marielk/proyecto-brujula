import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawn: spawnMock
}));

describe("ollama python simulation provider", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it("enables progress events and parses progress lines from Python", async () => {
    const child = createChildProcessStub();
    spawnMock.mockReturnValue(child);
    const { ollamaPythonProvider } = await import("./simulation-service");
    const onProgress = vi.fn();

    const run = ollamaPythonProvider.runJourneySimulation(
      { simulationId: "sim_progress", text: "Destino", model: "llama", lifeProfile: null },
      onProgress
    );

    expect(spawnMock).toHaveBeenCalledWith(
      "python",
      ["-m", "brujula_engine.simulation.web_api", "--model", "llama"],
      expect.objectContaining({
        env: expect.objectContaining({ BRUJULA_PROGRESS_EVENTS: "1" }),
        stdio: ["pipe", "pipe", "pipe"]
      })
    );

    child.stderr.emit("data", JSON.stringify({ type: "progress", stage: "comparing_paths", progress: 90, message: "Comparando" }) + "\n");
    child.stdout.emit("data", JSON.stringify({ success: true, data: { ok: true } }));
    child.emit("close", 0);

    await expect(run.result).resolves.toEqual({ success: true, data: { ok: true } });
    expect(onProgress).toHaveBeenCalledWith({ type: "progress", stage: "comparing_paths", progress: 90, message: "Comparando" });
  });
});

function createChildProcessStub() {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter & { setEncoding: (encoding: string) => void };
    stderr: EventEmitter & { setEncoding: (encoding: string) => void };
    stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
    kill: ReturnType<typeof vi.fn>;
  };
  child.stdout = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
  child.stderr = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
  child.stdin = { write: vi.fn(), end: vi.fn() };
  child.kill = vi.fn();
  return child;
}
