export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { getAdSenseConfig, readAdPlacements } from "@/lib/db";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  const adsConfig = getAdSenseConfig();
  const placements = readAdPlacements();

  // Mask client ID for safe admin display (e.g. 1234...xyz.apps.googleusercontent.com)
  const maskedClientId = googleClientId
    ? (googleClientId.length > 16 
        ? `${googleClientId.substring(0, 8)}...${googleClientId.substring(googleClientId.length - 8)}` 
        : "Configured")
    : "Not configured";

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return NextResponse.json({
    authentication: {
      googleSignInEnabled: Boolean(googleClientId && googleClientId.length > 5),
      googleClientIdConfigured: Boolean(googleClientId),
      googleClientIdDisplay: maskedClientId,
      googleClientSecretConfigured: Boolean(googleClientSecret),
      adminPortalAuth: "EMAIL_PASSWORD_ONLY",
      photographerPortalAuth: "EMAIL_PASSWORD_AND_GOOGLE",
      callbackUrl: `${appUrl.replace(/\/+$/, "")}/api/auth/google/callback`,
    },
    adsense: {
      publisherId: adsConfig.publisherId,
      publisherIdConfigured: Boolean(adsConfig.publisherId && adsConfig.publisherId.startsWith("ca-pub-")),
      platformAdsEnabled: adsConfig.enabled,
      testMode: adsConfig.testMode,
      autoAdsEnabled: adsConfig.autoAdsEnabled,
      clientGalleryAdsEnabled: adsConfig.clientGalleryAdsEnabled ?? false,
      activePlacementsCount: placements.filter(p => p.enabled).length,
    },
    system: {
      appUrl,
      nodeEnv: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    },
  });
}
