import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getNotificationPreferences, saveNotificationPreferences } from "@/lib/db";
import { getWhatsAppProviderStatus } from "@/lib/whatsapp/provider";
import { PhotographerNotificationPreferences } from "@/lib/project-types";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let photographerId = session.photographerId;
  if ((session.role === "SUPER_ADMIN" || session.role === "admin" || session.role === "platform_admin") && searchParams.get("photographerId")) {
    photographerId = searchParams.get("photographerId")!;
  }

  const prefs = await getNotificationPreferences(photographerId);
  const waStatus = getWhatsAppProviderStatus();
  const { readPlatformCommunicationSettings } = await import("@/lib/db");
  const platformSettings = readPlatformCommunicationSettings();

  return NextResponse.json({
    preferences: prefs,
    whatsappProviderStatus: waStatus,
    platformCommunicationStatus: {
      globalEnabled: platformSettings.globalEnabled,
      emergencyKillSwitch: platformSettings.emergencyKillSwitch,
      emailEnabled: platformSettings.emailEnabled,
      whatsappEnabled: platformSettings.whatsappEnabled,
      maintenanceNote: platformSettings.maintenanceNote,
    }
  });
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photographerId = session.photographerId;

  try {
    const body = await request.json();
    const patch: Partial<PhotographerNotificationPreferences> = {};

    if (body.clientGalleryPublished !== undefined) patch.clientGalleryPublished = Boolean(body.clientGalleryPublished);
    if (body.clientSelectionConfirmation !== undefined) patch.clientSelectionConfirmation = Boolean(body.clientSelectionConfirmation);
    if (body.clientGalleryExpiring !== undefined) patch.clientGalleryExpiring = Boolean(body.clientGalleryExpiring);
    if (body.photographerSelectionSubmitted !== undefined) patch.photographerSelectionSubmitted = Boolean(body.photographerSelectionSubmitted);
    if (body.photographerDownloadAlert !== undefined) patch.photographerDownloadAlert = Boolean(body.photographerDownloadAlert);
    if (body.photographerPaymentAlert !== undefined) patch.photographerPaymentAlert = Boolean(body.photographerPaymentAlert);
    if (body.whatsappEnabled !== undefined) patch.whatsappEnabled = Boolean(body.whatsappEnabled);
    if (body.whatsappPhoneNumber !== undefined) patch.whatsappPhoneNumber = String(body.whatsappPhoneNumber).trim();
    if (body.customEmailSubjectTemplate !== undefined) patch.customEmailSubjectTemplate = String(body.customEmailSubjectTemplate).trim();
    if (body.customEmailFooter !== undefined) patch.customEmailFooter = String(body.customEmailFooter).trim();
    if (body.emailReplyTo !== undefined) patch.emailReplyTo = String(body.emailReplyTo).trim();

    // Check real whatsapp provider status before updating whatsappStatus
    const waStatus = getWhatsAppProviderStatus();
    if (patch.whatsappEnabled) {
      patch.whatsappStatus = waStatus.status;
    } else {
      patch.whatsappStatus = "NOT_CONFIGURED";
    }

    const updated = await saveNotificationPreferences(photographerId, patch);

    return NextResponse.json({
      success: true,
      preferences: updated,
      whatsappProviderStatus: waStatus
    });
  } catch (err: any) {
    console.error("Save notification preferences error:", err);
    return NextResponse.json({ error: "Failed to save notification preferences" }, { status: 500 });
  }
}
