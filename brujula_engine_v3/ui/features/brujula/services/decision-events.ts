import type { PlatformEvent } from "../../../lib/platform/contracts";

export function publishDecisionEvent(name: PlatformEvent["name"], properties?: PlatformEvent["properties"]) {
  void fetch("/api/platform/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, properties })
  }).catch(() => undefined);
}
