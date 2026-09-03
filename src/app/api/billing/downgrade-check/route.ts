import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { DEFAULT_PHOTOGRAPHER_ID, getPlanBySlug, getPlanById } from "@/lib/db";
import { getTenantUsageReport } from "@/lib/usage";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photographerId = session.photographerId || DEFAULT_PHOTOGRAPHER_ID;

  try {
    const body = await request.json();
    const { targetPlanSlug, targetPlanId } = body as {
      targetPlanSlug?: string;
      targetPlanId?: string;
    };

    const targetPlan = (targetPlanSlug ? getPlanBySlug(targetPlanSlug) : null) ||
                       (targetPlanId ? getPlanById(targetPlanId) : null);

    if (!targetPlan) {
      return NextResponse.json({ error: "Target plan not found" }, { status: 404 });
    }

    const usageReport = getTenantUsageReport(photographerId);
    const warnings: string[] = [];

    if (targetPlan.limits.maxProjects !== -1 && usageReport.metrics.projects.used > targetPlan.limits.maxProjects) {
      warnings.push(
        `You currently have ${usageReport.metrics.projects.used} wedding projects. The ${targetPlan.name} plan limit is ${targetPlan.limits.maxProjects}. Existing projects remain safely viewable by clients, but creating new projects will be restricted.`
      );
    }

    if (targetPlan.limits.maxCustomDomains !== -1 && usageReport.metrics.customDomains.used > targetPlan.limits.maxCustomDomains) {
      warnings.push(
        `You have ${usageReport.metrics.customDomains.used} custom domains configured. The ${targetPlan.name} plan allows ${targetPlan.limits.maxCustomDomains}.`
      );
    }

    if (targetPlan.limits.maxTeamMembers !== -1 && usageReport.metrics.teamMembers.used > targetPlan.limits.maxTeamMembers) {
      warnings.push(
        `You have ${usageReport.metrics.teamMembers.used} team seats active. The ${targetPlan.name} plan includes ${targetPlan.limits.maxTeamMembers} seat.`
      );
    }

    if (!targetPlan.features.whiteLabel && usageReport.entitlements.features.whiteLabel) {
      warnings.push(
        `White-label branding is not included in ${targetPlan.name}. Platform branding may appear on client galleries.`
      );
    }

    return NextResponse.json({
      targetPlan: {
        id: targetPlan.id,
        slug: targetPlan.slug,
        name: targetPlan.name,
      },
      hasWarnings: warnings.length > 0,
      warnings,
      currentUsage: usageReport.metrics,
      dataRetentionPolicy: "DR Films guarantees zero data deletion on downgrade or cancellation. All galleries, photos, videos, and client selections remain completely intact.",
    });
  } catch (err: unknown) {
    console.error("Downgrade check error:", err);
    return NextResponse.json({ error: "Failed to perform downgrade evaluation" }, { status: 500 });
  }
}
