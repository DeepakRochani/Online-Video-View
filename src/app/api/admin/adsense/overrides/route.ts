import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import {
  readAdOverrides,
  setPhotographerAdOverride,
  removePhotographerAdOverride,
  readPhotographers,
} from "@/lib/db";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.success) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const overrides = readAdOverrides();
  const photographers = readPhotographers();
  const enhancedOverrides = overrides.map((o) => {
    const photog = photographers.find((p) => p.id === o.photographerId);
    return {
      ...o,
      photographerName: photog?.name || "Unknown Photographer",
      photographerEmail: photog?.email || "",
      studioName: photog?.studioName || "",
      plan: photog?.plan || "PRO",
    };
  });

  return NextResponse.json({ success: true, overrides: enhancedOverrides });
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.success) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const body = await request.json();
    const { photographerId, adsEnabled, reason, expiresAt } = body;

    if (!photographerId) {
      return NextResponse.json({ error: "Photographer ID is required." }, { status: 400 });
    }

    const override = setPhotographerAdOverride(
      photographerId,
      Boolean(adsEnabled),
      reason,
      expiresAt || undefined,
      guard.session.photographerId,
      guard.session.email
    );

    return NextResponse.json({
      success: true,
      override,
      message: `Ad override ${override.adsEnabled ? "enabled" : "disabled"} for photographer.`,
    });
  } catch (err: unknown) {
    console.error("Set ad override error:", err);
    return NextResponse.json({ error: "Failed to set ad override." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.success) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const photographerId = searchParams.get("photographerId");

    if (!photographerId) {
      return NextResponse.json({ error: "Photographer ID is required." }, { status: 400 });
    }

    const removed = removePhotographerAdOverride(
      photographerId,
      guard.session.photographerId,
      guard.session.email
    );

    if (!removed) {
      return NextResponse.json({ error: "No active override found for this photographer." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Photographer ad override removed successfully." });
  } catch (err: unknown) {
    console.error("Remove ad override error:", err);
    return NextResponse.json({ error: "Failed to remove ad override." }, { status: 500 });
  }
}
