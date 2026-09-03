import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import {
  suspendPhotographer,
  reactivatePhotographer,
  softDeletePhotographer,
  recordAdminAuditLog,
  getPhotographerById,
} from "@/lib/db";

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
    const { action, reason } = body;

    let result;
    if (action === "suspend") {
      if (!reason) {
        return NextResponse.json({ error: "Suspension reason is required" }, { status: 400 });
      }
      result = suspendPhotographer(id, reason, auth.session.email);

      recordAdminAuditLog({
        adminId: auth.session.photographerId,
        adminEmail: auth.session.email,
        action: "PHOTOGRAPHER_SUSPEND",
        targetType: "photographer",
        targetId: id,
        targetName: target.name,
        metadata: { reason, previousStatus: target.status },
        result: "success",
      });
    } else if (action === "reactivate") {
      result = reactivatePhotographer(id, auth.session.email);

      recordAdminAuditLog({
        adminId: auth.session.photographerId,
        adminEmail: auth.session.email,
        action: "PHOTOGRAPHER_REACTIVATE",
        targetType: "photographer",
        targetId: id,
        targetName: target.name,
        metadata: { previousStatus: target.status },
        result: "success",
      });
    } else if (action === "soft_delete") {
      result = softDeletePhotographer(id, auth.session.email);

      recordAdminAuditLog({
        adminId: auth.session.photographerId,
        adminEmail: auth.session.email,
        action: "PHOTOGRAPHER_SOFT_DELETE",
        targetType: "photographer",
        targetId: id,
        targetName: target.name,
        metadata: { previousStatus: target.status },
        result: "success",
      });
    } else {
      return NextResponse.json({ error: "Invalid action. Supported: suspend, reactivate, soft_delete" }, { status: 400 });
    }

    return NextResponse.json({ success: true, photographer: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update photographer status" }, { status: 500 });
  }
}
