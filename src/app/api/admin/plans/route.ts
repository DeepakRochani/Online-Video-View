import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { readPlans, savePlan, deletePlan, generateId } from "@/lib/db";
import { DynamicPlan } from "@/lib/project-types";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
  }

  const plans = readPlans();
  return NextResponse.json({ plans });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      id,
      slug,
      name,
      tagline,
      badge,
      description,
      priceMonthlyPaise,
      priceYearlyPaise,
      isPopular,
      isActive = true,
      sortOrder = 0,
      limits,
      features,
    } = body as Partial<DynamicPlan>;

    if (!name || !slug) {
      return NextResponse.json({ error: "Plan name and slug are required" }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
    const planId = id || `plan-${cleanSlug}-${generateId().slice(0, 6)}`;

    const planToSave: DynamicPlan = {
      id: planId,
      slug: cleanSlug,
      name: name.trim(),
      tagline: tagline?.trim() || "",
      badge: badge?.trim() || "",
      description: description?.trim() || "",
      priceMonthlyPaise: Number(priceMonthlyPaise) || 0,
      priceMonthlyInPaise: Number(priceMonthlyPaise) || 0,
      priceYearlyPaise: Number(priceYearlyPaise) || 0,
      priceYearlyInPaise: Number(priceYearlyPaise) || 0,
      currency: "INR",
      isPopular: !!isPopular,
      isActive: isActive !== false,
      sortOrder: Number(sortOrder) || 0,
      features: {
        googleDrive: true,
        weddingProjects: true,
        clientGalleries: true,
        photoDelivery: true,
        videoDelivery: true,
        favorites: true,
        clientSelection: true,
        qrCodes: true,
        whatsappSharing: true,
        whiteLabel: false,
        customBranding: true,
        customDomains: false,
        galleryTemplates: true,
        advancedGalleryTemplates: false,
        analytics: false,
        clientNotifications: true,
        aiFeatures: false,
        prioritySupport: false,
        apiAccess: false,
        teamCollaboration: false,
        downloadZip: true,
        prioritySync: false,
        ...(features || {}),
      },
      limits: {
        maxProjects: 5,
        maxActiveProjects: 5,
        maxPhotos: 2500,
        maxVideos: 50,
        maxStorageGb: 15,
        maxCustomDomains: 0,
        maxTeamMembers: 1,
        maxAiCredits: 0,
        maxMonthlyAiJobs: 0,
        ...(limits || {}),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    savePlan(planToSave);

    return NextResponse.json({ success: true, plan: planToSave });
  } catch (err: unknown) {
    console.error("Save plan error:", err);
    return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("id");

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    const deleted = deletePlan(planId);
    if (!deleted) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Plan deleted successfully." });
  } catch (err: unknown) {
    console.error("Delete plan error:", err);
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }
}
