import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { getPlatformOverviewMetrics } from "@/lib/db";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const metrics = getPlatformOverviewMetrics();
    return NextResponse.json({ success: true, metrics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to calculate platform metrics" }, { status: 500 });
  }
}
