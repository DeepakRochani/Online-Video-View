import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { getPlatformAlerts, triggerAlert } from "@/lib/alerts";
import { AlertStatus, AlertSeverity } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as AlertStatus | undefined;
  const severity = searchParams.get("severity") as AlertSeverity | undefined;
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const { alerts, total } = getPlatformAlerts({
    status,
    severity,
    limit,
    offset,
  });

  return NextResponse.json({ success: true, alerts, total });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { title, description, source, severity } = body;

    if (!title || !description || !source || !severity) {
      return NextResponse.json(
        { error: "title, description, source, and severity are required" },
        { status: 400 }
      );
    }

    const alert = triggerAlert({
      title,
      description,
      source,
      severity,
      metadata: { createdByAdmin: auth.session?.email },
    });

    return NextResponse.json({ success: true, alert }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create platform alert" },
      { status: 500 }
    );
  }
}
