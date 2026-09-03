import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { readAdUnits, saveAdUnit, deleteAdUnit } from "@/lib/db";
import { AdUnit } from "@/lib/project-types";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.success) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const units = readAdUnits();
  return NextResponse.json({ success: true, units });
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.success) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const body = await request.json();
    const { id, name, key, slotId, format, placement, active, priority, responsive, customCss } = body as Partial<AdUnit>;

    if (!name || !key || !slotId) {
      return NextResponse.json(
        { error: "Missing required fields: Name, Internal Key, and AdSense Slot ID are required." },
        { status: 400 }
      );
    }

    const saved = saveAdUnit(
      {
        ...(id && { id }),
        name: name.trim(),
        key: key.trim(),
        slotId: slotId.trim(),
        format: format || "horizontal",
        placement: placement || "PHOTOGRAPHER_DASHBOARD_TOP",
        active: active !== false,
        priority: Number(priority) || 5,
        responsive: responsive !== false,
        customCss: customCss || "",
      },
      guard.session.photographerId,
      guard.session.email
    );

    return NextResponse.json({
      success: true,
      unit: saved,
      message: "Ad unit saved successfully.",
    });
  } catch (err: unknown) {
    console.error("Save ad unit error:", err);
    return NextResponse.json({ error: "Failed to save ad unit." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.success) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Ad Unit ID is required." }, { status: 400 });
    }

    const deleted = deleteAdUnit(id, guard.session.photographerId, guard.session.email);
    if (!deleted) {
      return NextResponse.json({ error: "Ad unit not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Ad unit deleted successfully." });
  } catch (err: unknown) {
    console.error("Delete ad unit error:", err);
    return NextResponse.json({ error: "Failed to delete ad unit." }, { status: 500 });
  }
}
