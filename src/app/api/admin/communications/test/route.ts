import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { canSendCommunication } from "@/lib/communication-gate";
import { sendEmail } from "@/lib/email/provider";
import { sendWhatsAppMessage } from "@/lib/whatsapp/provider";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/communications/test
 * Super Admin endpoint to test delivery on a specified channel.
 */
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { channel, recipient, messageType = "TEST" } = body;

    if (!channel || !recipient) {
      return NextResponse.json(
        { error: "channel ('EMAIL' | 'WHATSAPP') and recipient are required" },
        { status: 400 }
      );
    }

    if (channel === "EMAIL") {
      const gateCheck = await canSendCommunication({
        channel: "EMAIL",
        event: "SECURITY_ALERT", // using security alert / test event
        audience: "SYSTEM",
        recipient
      });

      if (!gateCheck.allowed) {
        return NextResponse.json({
          success: false,
          blocked: true,
          reason: gateCheck.reason,
          code: gateCheck.code
        });
      }

      const emailResult = await sendEmail({
        to: recipient,
        subject: "Super Admin Platform Test: Communication Channel Active",
        html: `<div style="font-family: sans-serif; padding: 20px; background: #0b0f17; color: #fff; border-radius: 8px;">
          <h2 style="color: #D4AF37; margin-top: 0;">Wedding Platform Communication Test</h2>
          <p>This is an automated test message dispatched by Super Admin at <strong>${new Date().toISOString()}</strong>.</p>
          <p style="color: #94a3b8;">If you received this message, the platform outbound email gateway is configured and operational.</p>
        </div>`,
        text: `Super Admin Platform Test: Communication Channel Active. Dispatched at ${new Date().toISOString()}`,
        fromName: "Platform Admin System"
      });

      return NextResponse.json({
        success: emailResult.success,
        provider: emailResult.provider,
        providerMessageId: emailResult.providerMessageId,
        error: emailResult.error
      });
    } else if (channel === "WHATSAPP") {
      const waGateCheck = await canSendCommunication({
        channel: "WHATSAPP",
        event: "GALLERY_PUBLISHED",
        audience: "CLIENT",
        recipient
      });

      if (!waGateCheck.allowed) {
        return NextResponse.json({
          success: false,
          blocked: true,
          reason: waGateCheck.reason,
          code: waGateCheck.code
        });
      }

      const waResult = await sendWhatsAppMessage({
        recipientPhone: recipient,
        templateName: "gallery_published",
        templateParams: {
          clientName: "Super Admin Tester",
          coupleTitle: "Test Couple",
          galleryUrl: process.env.NEXT_PUBLIC_APP_URL || "https://example.com/gallery/test",
          accessCode: "TEST1234",
          photographerBrand: "Super Admin Test"
        }
      });

      return NextResponse.json({
        success: waResult.success,
        delivered: waResult.delivered,
        provider: waResult.provider,
        providerMessageId: waResult.providerMessageId,
        error: waResult.error
      });
    }

    return NextResponse.json(
      { error: `Channel '${channel}' is not supported for live test dispatches.` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[API:COMMUNICATION_TEST:ERROR]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to dispatch test communication" },
      { status: 500 }
    );
  }
}
