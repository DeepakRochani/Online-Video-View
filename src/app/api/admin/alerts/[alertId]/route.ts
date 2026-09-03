import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import {
  getPlatformAlertById,
  updatePlatformAlertStatus,
  AlertStatus,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { alertId } = await params;
  const alert = getPlatformAlertById(alertId);
  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { status } = body as { status?: AlertStatus };

    if (!status || !["OPEN", "ACKNOWLEDGED", "RESOLVED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be OPEN, ACKNOWLEDGED, or RESOLVED" },
        { status: 400 }
      );
    }

    const updated = updatePlatformAlertStatus(
      alertId,
      status,
      auth.session?.email || "super-admin"
    );

    return NextResponse.json({ success: true, alert: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update alert" },
      { status: 500 }
    );
  }
}
