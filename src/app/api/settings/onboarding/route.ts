export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import {
  getPhotographerById,
  updateOnboardingProgress,
  createProject,
} from "@/lib/db";
import { extractGoogleDriveFolderId } from "@/lib/drive-parser";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = getPhotographerById(session.photographerId);
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({
    photographer: {
      id: account.id,
      name: account.name,
      studioName: account.studioName,
      email: account.email,
      phone: account.phone,
      website: account.website,
      city: account.city,
      country: account.country,
      logoUrlLight: account.logoUrlLight,
      logoUrlDark: account.logoUrlDark,
      branding: account.branding || {
        accentColor: "#D4AF37",
        defaultTheme: "luxury",
        defaultTemplate: "classic",
        tagline: "Fine Art Wedding Cinema & Photography",
      },
      googleDriveConnected: !!account.googleDriveConnected,
      googleDriveEmail: account.googleDriveEmail,
      plan: account.plan || "FREE",
      onboardingCompleted: account.onboardingCompleted || false,
      onboardingStep: account.onboardingStep || 1,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      studioName,
      website,
      phone,
      city,
      country,
      logoUrlLight,
      logoUrlDark,
      branding,
      onboardingStep,
      onboardingCompleted,
      firstWedding,
    } = body;

    const updated = updateOnboardingProgress(session.photographerId, {
      name: name?.trim(),
      studioName: studioName?.trim(),
      phone: phone?.trim(),
      website: website?.trim(),
      city: city?.trim(),
      country: country?.trim(),
      logoUrlLight,
      logoUrlDark,
      branding,
      onboardingStep,
      onboardingCompleted,
    });

    if (!updated) {
      return NextResponse.json({ error: "Photographer not found" }, { status: 404 });
    }

    let createdProject = null;
    if (firstWedding && firstWedding.coupleName && firstWedding.weddingDate) {
      const driveUrl = firstWedding.driveFolderUrl || "";
      const driveId = extractGoogleDriveFolderId(driveUrl) || "onboarding-pending";

      const eventsList = Array.isArray(firstWedding.events)
        ? firstWedding.events.map((evt: string, idx: number) => ({
            id: `evt-${idx + 1}`,
            name: evt,
            count: 0,
            photoCount: 0,
            videoCount: 0,
          }))
        : [];

      createdProject = createProject({
        photographerId: session.photographerId,
        coupleName: firstWedding.coupleName.trim(),
        weddingDate: firstWedding.weddingDate,
        welcomeMessage: firstWedding.weddingName?.trim() || `${firstWedding.coupleName.trim()}'s Wedding Celebration`,
        driveFolderUrl: driveUrl,
        driveFolderId: driveId,
        theme: (branding?.defaultTheme || "luxury") as any,
        template: (branding?.defaultTemplate || "classic") as any,
        status: "draft",
        events: eventsList,
        branding: {
          studioName: updated.studioName || updated.name,
          businessName: updated.studioName || updated.name,
          accentColor: branding?.accentColor || "#D4AF37",
          tagline: branding?.tagline || "Fine Art Wedding Cinema & Photography",
          logoUrl: updated.logoUrlLight || "",
          logoUrlLight: updated.logoUrlLight || "",
          website: updated.website || "",
          phone: updated.phone || "",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding progress saved",
      photographer: {
        id: updated.id,
        name: updated.name,
        studioName: updated.studioName,
        onboardingStep: updated.onboardingStep,
        onboardingCompleted: updated.onboardingCompleted,
        googleDriveConnected: !!updated.googleDriveConnected,
      },
      project: createdProject,
    });
  } catch (err: unknown) {
    console.error("Onboarding update error:", err);
    return NextResponse.json({ error: "Failed to update onboarding progress" }, { status: 500 });
  }
}
