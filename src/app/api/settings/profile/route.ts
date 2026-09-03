export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedPhotographerId } from "@/lib/auth";
import { getPhotographerById, updatePhotographer } from "@/lib/db";
import { getPlanDetails } from "@/lib/plans";

export async function GET() {
  const photographerId = await getAuthenticatedPhotographerId();
  if (!photographerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photographer = getPhotographerById(photographerId);
  if (!photographer) {
    return NextResponse.json({ error: "Photographer account not found" }, { status: 404 });
  }

  const plan = getPlanDetails(photographer.plan || "PRO");

  return NextResponse.json({
    profile: {
      id: photographer.id,
      name: photographer.name,
      email: photographer.email,
      businessName: photographer.businessName,
      phone: photographer.phone,
      avatarUrl: photographer.avatarUrl || photographer.googleAvatarUrl || "",
      googleId: photographer.googleId,
      googleEmail: photographer.googleEmail,
      googleAvatarUrl: photographer.googleAvatarUrl,
      authProviders: photographer.authProviders || (photographer.googleId ? ["email", "google"] : ["email"]),
      plan: photographer.plan,
      role: photographer.role,
      createdAt: photographer.createdAt,
    },
    plan,
  });
}

export async function POST(request: NextRequest) {
  const photographerId = await getAuthenticatedPhotographerId();
  if (!photographerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updated = updatePhotographer(photographerId, {
      name: body.name?.trim(),
      businessName: body.businessName?.trim(),
      phone: body.phone?.trim(),
      avatarUrl: body.avatarUrl?.trim(),
    });

    if (!updated) {
      return NextResponse.json({ error: "Photographer not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        businessName: updated.businessName,
        phone: updated.phone,
        avatarUrl: updated.avatarUrl,
        plan: updated.plan,
        role: updated.role,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update profile" }, { status: 500 });
  }
}

export const PUT = POST;
