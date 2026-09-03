import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, requireSuperAdmin } from "@/lib/auth";
import {
  readAdSenseConfig,
  saveAdSenseConfig,
  getAdReportingStats,
  readPlans,
  readAdUnits,
  readAdPlacements,
} from "@/lib/db";
import { AdSenseConfig } from "@/lib/project-types";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.success) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const config = readAdSenseConfig();
  const reporting = getAdReportingStats();
  const adUnits = readAdUnits();
  const placements = readAdPlacements();
  const plans = readPlans();

  // Strip sensitive private credentials from client payload
  const { reportingClientId, reportingClientSecret, ...safeConfig } = config;

  return NextResponse.json({
    success: true,
    config: safeConfig,
    reporting,
    summary: {
      totalAdUnits: adUnits.length,
      activeAdUnits: adUnits.filter((u) => u.active).length,
      totalPlacements: placements.length,
      activePlacements: placements.filter((p) => p.enabled).length,
      plansWithAds: plans.filter((p) => p.features.adsEnabled).map((p) => p.name),
    },
  });
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.success) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const body = await request.json();
    const {
      publisherId,
      enabled,
      testMode,
      autoAdsEnabled,
      manualAdsEnabled,
      clientGalleryAdsEnabled,
      safetyMode,
      maxAdsPerPage,
      minSpacingPx,
      reportingConnected,
    } = body as Partial<AdSenseConfig>;

    if (publisherId !== undefined && typeof publisherId === "string") {
      const cleanPubId = publisherId.trim();
      if (cleanPubId && !/^ca-pub-\d+$/.test(cleanPubId)) {
        return NextResponse.json(
          { error: "Invalid Publisher ID format. Must be formatted as 'ca-pub-[numeric publisher id]' (e.g. ca-pub-1234567890123456)." },
          { status: 400 }
        );
      }
    }

    const updated = saveAdSenseConfig(
      {
        ...(publisherId !== undefined && { publisherId: publisherId.trim() }),
        ...(enabled !== undefined && { enabled: Boolean(enabled) }),
        ...(testMode !== undefined && { testMode: Boolean(testMode) }),
        ...(autoAdsEnabled !== undefined && { autoAdsEnabled: Boolean(autoAdsEnabled) }),
        ...(manualAdsEnabled !== undefined && { manualAdsEnabled: Boolean(manualAdsEnabled) }),
        ...(clientGalleryAdsEnabled !== undefined && { clientGalleryAdsEnabled: Boolean(clientGalleryAdsEnabled) }),
        ...(safetyMode !== undefined && { safetyMode: Boolean(safetyMode) }),
        ...(maxAdsPerPage !== undefined && { maxAdsPerPage: Math.max(1, Math.min(10, Number(maxAdsPerPage) || 3)) }),
        ...(minSpacingPx !== undefined && { minSpacingPx: Math.max(0, Number(minSpacingPx) || 300) }),
        ...(reportingConnected !== undefined && { reportingConnected: Boolean(reportingConnected) }),
      },
      guard.session.photographerId,
      guard.session.email
    );

    const { reportingClientId, reportingClientSecret, ...safeConfig } = updated;

    return NextResponse.json({
      success: true,
      config: safeConfig,
      message: "AdSense settings updated successfully.",
    });
  } catch (err: unknown) {
    console.error("Save AdSense config error:", err);
    return NextResponse.json({ error: "Failed to update AdSense settings." }, { status: 500 });
  }
}
