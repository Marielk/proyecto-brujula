import { NextResponse } from "next/server";
import type { PlatformEvent } from "../../../../lib/platform/contracts";
import { platformEvents, publishPlatformEvent } from "../../../../lib/platform/telemetry";

export async function GET() {
  return NextResponse.json({ success: true, data: platformEvents.recent() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? (body.name as PlatformEvent["name"]) : null;
  if (!name) {
    return NextResponse.json({ success: false, error: "Falta nombre de evento." }, { status: 400 });
  }
  const properties = sanitizeClientProperties(body?.properties);
  publishPlatformEvent(name, properties);
  return NextResponse.json({ success: true });
}

function sanitizeClientProperties(value: unknown): PlatformEvent["properties"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const allowed = ["decisionId", "simulationId", "domain", "durationDays", "actionCount", "status", "nextDecision", "createdAt", "updatedAt"];
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, item]) => allowed.includes(key) && ["string", "number", "boolean"].includes(typeof item))
      .map(([key, item]) => [key, item as string | number | boolean])
  );
}
