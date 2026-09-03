import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import {
  setAdminPlanOverride,
  revokeAdminPlanOverride,
  recordAdminAuditLog,
  getPhotographerById,
} from "@/lib/db";
import { SubscriptionPlanTier } from "@/lib/project-types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const target = getPhotographerById(id);
  if (!target) {
    return NextResponse.json({ error: "Photographer not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { action, plan, expiresAt, reason } = body;

    let result;
    if (action === "set") {
      if (!plan || !expiresAt || !reason) {
        return NextResponse.json({ error: "Plan, expiration date, and reason are required" }, { status: 400 });
      }

      result = setAdminPlanOverride(id, plan as SubscriptionPlanTier, expiresAt, reason, auth.session.email);

      recordAdminAuditLog({
        adminId: auth.session.photographerId,
        adminEmail: auth.session.email,
        action: "PLAN_ADMIN_OVERRIDE_SET",
        targetType: "photographer",
        targetId: id,
        targetName: target.name,
        metadata: { plan, expiresAt, reason },
        result: "success",
      });
    } else if (action === "revoke") {
      result = revokeAdminPlanOverride(id, auth.session.email);

      recordAdminAuditLog({
        adminId: auth.session.photographerId,
        adminEmail: auth.session.email,
        action: "PLAN_ADMIN_OVERRIDE_REVOKE",
        targetType: "photographer",
        targetId: id,
        targetName: target.name,
        metadata: { previousOverride: target.adminPlanOverride },
        result: "success",
      });
    } else {
      return NextResponse.json({ error: "Invalid action. Supported: set, revoke" }, { status: 400 });
    }

    return NextResponse.json({ success: true, photographer: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update plan override" }, { status: 500 });
  }
}
