import { NextResponse } from "next/server";
import { readAdSenseConfig } from "@/lib/db";

export async function GET() {
  const config = readAdSenseConfig();

  // Return public safe properties only
  return NextResponse.json({
    publisherId: config.publisherId,
    enabled: config.enabled && !config.safetyMode,
    testMode: config.testMode,
    autoAdsEnabled: config.autoAdsEnabled && config.enabled && !config.safetyMode,
    manualAdsEnabled: config.manualAdsEnabled && config.enabled && !config.safetyMode,
    safetyMode: config.safetyMode,
    maxAdsPerPage: config.maxAdsPerPage,
    minSpacingPx: config.minSpacingPx,
  });
}
