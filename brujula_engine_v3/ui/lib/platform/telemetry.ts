import type { EventBus, PlatformEvent } from "./contracts";

const MAX_EVENTS = 200;

type BrújulaTelemetryGlobal = typeof globalThis & {
  __brujulaPlatformEvents?: PlatformEvent[];
};

const events = ((globalThis as BrújulaTelemetryGlobal).__brujulaPlatformEvents ||= []);

export const platformEvents: EventBus = {
  publish(event) {
    events.push(sanitizeEvent(event));
    if (events.length > MAX_EVENTS) {
      events.splice(0, events.length - MAX_EVENTS);
    }
  },
  recent() {
    return [...events];
  }
};

function sanitizeEvent(event: PlatformEvent): PlatformEvent {
  const safeProperties = Object.fromEntries(
    Object.entries(event.properties || {}).filter(([key]) => !["text", "goal", "dream", "scenario"].includes(key))
  );
  return { ...event, properties: safeProperties };
}

export function publishPlatformEvent(name: PlatformEvent["name"], properties?: PlatformEvent["properties"]) {
  platformEvents.publish({ name, properties, createdAt: new Date().toISOString() });
}
