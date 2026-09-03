import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import {
  readPlatformCommunicationSettings,
  updatePlatformCommunicationSettings
} from "@/lib/db";
import { getCommunicationProviderStatuses } from "@/lib/communication-gate";
import { PlatformCommunicationSettings } from "@/lib/project-types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/communications/settings
 * Super Admin endpoint to retrieve global platform communication settings and live provider statuses.
 */
export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required" },
      { status: 403 }
    );
  }

  const settings = readPlatformCommunicationSettings();
  const providerStatuses = getCommunicationProviderStatuses();

  return NextResponse.json({
    success: true,
    settings,
    providerStatuses
  });
}

/**
 * PUT / PATCH /api/admin/communications/settings
 * Super Admin endpoint to update platform-wide communication controls with server-side validation and audit logging.
 */
export async function PUT(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid payload: settings object expected" },
        { status: 400 }
      );
    }

    // Extract scalar boolean toggles and validate
    const updates: Partial<PlatformCommunicationSettings> = {};

    if (body.action === "emergency_shutdown") {
      updates.globalEnabled = false;
      updates.emergencyKillSwitch = true;
      updates.emailEnabled = false;
      updates.whatsappEnabled = false;
      updates.smsEnabled = false;
      updates.pushEnabled = false;
      updates.inAppEnabled = false;
      updates.clientAllEnabled = false;
      updates.photographerAllEnabled = false;
      updates.marketingAllEnabled = false;
      updates.maintenanceNote = typeof body.reason === "string" ? body.reason.slice(0, 500) : "Emergency communication shutdown triggered by Super Admin.";
    } else if (body.action === "maintenance_mode") {
      updates.globalEnabled = false;
      updates.emergencyKillSwitch = false;
      updates.maintenanceNote = typeof body.reason === "string" ? body.reason.slice(0, 500) : "Platform communication in maintenance mode.";
    } else {
      const booleanKeys: (keyof PlatformCommunicationSettings)[] = [
        "globalEnabled",
        "allCommunicationsEnabled",
        "emergencyKillSwitch",
        "emailEnabled",
        "emailClientGalleries",
        "emailClientSelections",
        "emailPhotographerDigest",
        "emailPhotographerBilling",
        "emailMarketingCampaigns",
        "emailSecurityAlerts",
        "emailPasswordReset",
        "emailVerification",
        "emailAccountAlerts",
        "whatsappEnabled",
        "whatsappClientGalleries",
        "whatsappClientSelections",
        "whatsappPhotographerAlerts",
        "whatsappMarketingBroadcasts",
        "smsEnabled",
        "smsClientGalleries",
        "smsClientSelections",
        "smsPhotographerAlerts",
        "smsSecurityOtp",
        "smsMarketing",
        "pushEnabled",
        "pushClientGalleries",
        "pushPhotographerAlerts",
        "pushMarketing",
        "inAppEnabled",
        "inAppClientGalleries",
        "inAppPhotographerAlerts",
        "inAppSystemAnnouncements",
        "clientAllEnabled",
        "clientGalleryPublished",
        "clientSelectionConfirmation",
        "clientMarketing",
        "photographerAllEnabled",
        "photographerSelectionSubmitted",
        "photographerBillingReceipts",
        "photographerStorageAlerts",
        "photographerMarketing",
        "marketingAllEnabled",
        "marketingPromotions",
        "marketingProductUpdates",
        "marketingNewsletter",
        "marketingRequireDoubleOptIn",
        "marketingRespectUnsubscribe",
        "galleryPublishedEnabled",
        "selectionSubmittedEnabled",
        "selectionConfirmationEnabled",
        "expiryReminderEnabled",
        "teamInvitationEnabled",
        "passwordResetEnabled",
        "billingNotificationsEnabled",
        "securityNotificationsEnabled",
      ];

      for (const key of booleanKeys) {
        if (typeof body[key] === "boolean") {
          (updates as any)[key] = body[key];
        }
      }

      if (typeof body.maintenanceNote === "string") {
        updates.maintenanceNote = body.maintenanceNote.slice(0, 500);
      }
    }

    const updatedSettings = updatePlatformCommunicationSettings(
      updates,
      session.photographerId || "super-admin",
      session.email || "admin@drfilms.com"
    );

    const providerStatuses = getCommunicationProviderStatuses();

    return NextResponse.json({
      success: true,
      message: body.action === "emergency_shutdown"
        ? "Emergency communication shutdown successfully activated"
        : "Platform communication controls updated successfully",
      settings: updatedSettings,
      providerStatuses
    });
  } catch (err: any) {
    console.error("[API:COMMUNICATION_SETTINGS:UPDATE_ERROR]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update platform communication settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  return PUT(request);
}
