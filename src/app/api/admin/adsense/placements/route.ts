import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { readAdPlacements, saveAdPlacement, deleteAdPlacement } from "@/lib/db";
import { AdPlacement } from "@/lib/project-types";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.success) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const placements = readAdPlacements();
  return NextResponse.json({ success: true, placements });
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.success) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const body = await request.json();
    const { id, name, placementKey, pageRule, adUnitId, enabled, allowedRoles, planRule, description } =
      body as Partial<AdPlacement>;

    if (!name || !placementKey) {
      return NextResponse.json(
        { error: "Missing required fields: Placement Name and Key are required." },
        { status: 400 }
      );
    }

    const saved = saveAdPlacement(
      {
        ...(id && { id }),
        name: name.trim(),
        placementKey: placementKey.trim().toUpperCase(),
        pageRule: pageRule?.trim() || "/dashboard",
        adUnitId: adUnitId || undefined,
        enabled: enabled !== false,
        allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : ["PHOTOGRAPHER"],
        planRule: planRule || "ADS_ENABLED_ONLY",
        description: description || "",
      },
      guard.session.photographerId,
      guard.session.email
    );

    return NextResponse.json({
      success: true,
      placement: saved,
      message: "Ad placement saved successfully.",
    });
  } catch (err: unknown) {
    console.error("Save ad placement error:", err);
    return NextResponse.json({ error: "Failed to save ad placement." }, { status: 500 });
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
      return NextResponse.json({ error: "Placement ID is required." }, { status: 400 });
    }

    const deleted = deleteAdPlacement(id, guard.session.photographerId, guard.session.email);
    if (!deleted) {
      return NextResponse.json({ error: "Placement not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Ad placement deleted successfully." });
  } catch (err: unknown) {
    console.error("Delete ad placement error:", err);
    return NextResponse.json({ error: "Failed to delete ad placement." }, { status: 500 });
  }
}
