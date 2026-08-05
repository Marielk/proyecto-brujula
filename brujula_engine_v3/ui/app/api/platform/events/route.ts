import { NextResponse } from "next/server";
import { platformEvents } from "../../../../lib/platform/telemetry";

export async function GET() {
  return NextResponse.json({ success: true, data: platformEvents.recent() });
}
