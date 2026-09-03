import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { shouldShowAd } from "@/lib/ads/visibility";
import { AdPlacementKey } from "@/lib/project-types";

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    const body = await request.json();
    const { pathname, placementKey, isCustomDomain, isWhiteLabel } = body;

    if (!pathname || !placementKey) {
      return NextResponse.json(
        { error: "Pathname and placementKey are required." },
        { status: 400 }
      );
    }

    const result = shouldShowAd({
      tenantId: session?.photographerId,
      userRole: session?.role || "GUEST",
      pathname,
      placementKey: placementKey as AdPlacementKey,
      isCustomDomain: Boolean(isCustomDomain),
      isWhiteLabel: Boolean(isWhiteLabel),
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Ad visibility evaluation error:", err);
    return NextResponse.json(
      {
        showAd: false,
        testMode: false,
        reason: "Internal evaluation error",
      },
      { status: 500 }
    );
  }
}
