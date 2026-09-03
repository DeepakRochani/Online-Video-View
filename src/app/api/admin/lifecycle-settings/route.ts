import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import {
  readPlatformGalleryLifecycleSettings,
  updatePlatformGalleryLifecycleSettings,
} from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/lifecycle-settings
 * Super Admin endpoint to retrieve global platform gallery lifecycle and retention settings.
 */
export async function GET() {
  const session = await getCurrentSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "platform_admin")) {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required" },
      { status: 403 }
    );
  }

  const settings = readPlatformGalleryLifecycleSettings();

  return NextResponse.json({
    success: true,
    settings,
  });
}

/**
 * PUT /api/admin/lifecycle-settings
 * Super Admin endpoint to update platform gallery lifecycle and retention settings.
 */
export async function PUT(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "platform_admin")) {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      expirationEnabled,
      defaultExpirationDays,
      allowNeverExpire,
      maxRetentionDays,
      autoArchiveExpiredGalleries,
      autoArchiveDaysAfterExpiry,
    } = body;

    const updates: Record<string, any> = {};
    if (typeof expirationEnabled === "boolean") updates.expirationEnabled = expirationEnabled;
    if (defaultExpirationDays === null || typeof defaultExpirationDays === "number") {
      updates.defaultExpirationDays = defaultExpirationDays;
    }
    if (typeof allowNeverExpire === "boolean") updates.allowNeverExpire = allowNeverExpire;
    if (maxRetentionDays === null || typeof maxRetentionDays === "number") {
      updates.maxRetentionDays = maxRetentionDays;
    }
    if (typeof autoArchiveExpiredGalleries === "boolean") {
      updates.autoArchiveExpiredGalleries = autoArchiveExpiredGalleries;
    }
    if (typeof autoArchiveDaysAfterExpiry === "number") {
      updates.autoArchiveDaysAfterExpiry = autoArchiveDaysAfterExpiry;
    }

    const updated = updatePlatformGalleryLifecycleSettings(
      updates,
      session.photographerId || "admin-system",
      session.email || "admin@drfilms.com"
    );

    return NextResponse.json({
      success: true,
      settings: updated,
    });
  } catch (err: any) {
    console.error("[Admin Lifecycle Settings] Error updating settings:", err);
    return NextResponse.json(
      { error: "Failed to update lifecycle settings" },
      { status: 500 }
    );
  }
}

export const PATCH = PUT;
