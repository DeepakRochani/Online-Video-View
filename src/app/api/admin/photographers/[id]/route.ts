import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import {
  getPhotographerDetailWithFullStats,
  updatePhotographer,
  recordAdminAuditLog,
} from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  try {
    const detail = getPhotographerDetailWithFullStats(id);
    if (!detail) {
      return NextResponse.json({ error: "Photographer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...detail });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch photographer details" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  try {
    const updates = await request.json();
    // Do not allow password override via this general patch
    delete updates.passwordHash;
    delete updates.id;

    const updated = updatePhotographer(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Photographer not found" }, { status: 404 });
    }

    recordAdminAuditLog({
      adminId: auth.session.photographerId,
      adminEmail: auth.session.email,
      action: "PHOTOGRAPHER_PROFILE_UPDATE",
      targetType: "photographer",
      targetId: id,
      targetName: updated.name,
      metadata: updates,
      result: "success",
    });

    return NextResponse.json({ success: true, photographer: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update photographer" }, { status: 500 });
  }
}
