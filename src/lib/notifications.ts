/**
 * Production Client Notifications & Communication Engine
 * 
 * Features:
 * - Multi-channel notification routing (Email & WhatsApp).
 * - Photographer-specific preference enforcement (per-event toggle, custom subjects, branding).
 * - Full database persistence with strict tenant isolation.
 * - Idempotency ledger to eliminate duplicate sends.
 * - Retry handling with exponential backoff / transient failure detection.
 * - Audit logging for delivery lifecycle tracking.
 * - Backward-compatible `dispatchNotification` API for system events.
 */

import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  NotificationRecord,
  PhotographerNotificationPreferences
} from "./project-types";
import {
  createNotificationRecord,
  updateNotificationRecord,
  getNotificationById,
  isNotificationIdempotent,
  getNotificationPreferences,
  getPhotographerById,
  recordAdminAuditLog
} from "./db";
import { sendEmail, EmailSendResult } from "./email/provider";
import { renderEmailTemplate } from "./email/templates";
import { sendWhatsAppMessage, WhatsAppSendResult } from "./whatsapp/provider";
import { canSendCommunication } from "./communication-gate";
import { CommunicationService } from "./communication-service";

export interface SaasNotificationPayload {
  event?: NotificationType;
  type?: NotificationType; // Alias for event
  photographerId: string;
  projectId?: string;
  weddingId?: string; // Alias for projectId
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  coupleTitle?: string;
  galleryUrl?: string;
  accessCode?: string;
  selectionCount?: number;
  notes?: string;
  daysRemaining?: number;
  expiresAt?: string;
  idempotencyKey?: string;
  channelOverride?: NotificationChannel[];
  metadata?: Record<string, any>;
}

export interface SaasNotificationResult {
  success: boolean;
  status?: NotificationStatus;
  emailResult?: EmailSendResult;
  whatsappResult?: WhatsAppSendResult;
  records: NotificationRecord[];
  skipped?: boolean;
  reason?: string;
}

/**
 * Dispatch a SaaS client or photographer notification across active channels
 */
export async function dispatchSaasNotification(
  payload: SaasNotificationPayload
): Promise<SaasNotificationResult> {
  return CommunicationService.dispatch(payload);
}

/**
 * Retries a failed notification with tenant safety check, gate checking, and retry counting
 */
export async function retryFailedNotification(
  notificationId: string,
  photographerId: string = "admin"
): Promise<{ success: boolean; record?: NotificationRecord; status?: string; error?: string }> {
  return CommunicationService.retryFailedNotification(notificationId, photographerId);
}

// -------------------------------------------------------------
// Legacy Notification Dispatcher for System & Auth Alerts
// -------------------------------------------------------------

export type NotificationEvent =
  | "PHOTOGRAPHER_WELCOME"
  | "EMAIL_VERIFICATION"
  | "PASSWORD_RESET"
  | "SUBSCRIPTION_ACTIVATED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "SUBSCRIPTION_EXPIRING"
  | "SUBSCRIPTION_CANCELLED"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_REACTIVATED";

export interface NotificationPayload {
  recipientEmail: string;
  recipientName?: string;
  photographerId?: string;
  data?: Record<string, any>;
}

export async function dispatchNotification(
  event: NotificationEvent,
  payload: NotificationPayload
): Promise<{ success: boolean; delivered: boolean; channel: "smtp" | "log"; blockedReason?: string }> {
  const timestamp = new Date().toISOString();

  // Super Admin Communication Gate Check
  const audience = (event.includes("PHOTOGRAPHER") || event.includes("SUBSCRIPTION") || event.includes("PAYMENT")) ? "PHOTOGRAPHER" : "SYSTEM";
  const gate = await canSendCommunication({
    channel: "EMAIL",
    event,
    audience,
    recipient: payload.recipientEmail
  });

  if (!gate.allowed) {
    console.log(`[COMMUNICATION_GATE:BLOCKED] System event ${event} to ${payload.recipientEmail} blocked: ${gate.reason} (${gate.code})`);
    return { success: false, delivered: false, channel: "smtp", blockedReason: gate.reason };
  }

  const hasSmtpConfig = !!(process.env.SMTP_HOST || process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY);

  if (hasSmtpConfig) {
    try {
      const emailBody = `Hello ${payload.recipientName || "Valued User"},\n\nThis is an automated notification regarding your account: ${event}.\n\nTimestamp: ${timestamp}`;
      const emailRes = await sendEmail({
        to: payload.recipientEmail,
        subject: `Platform Alert: ${event.replace(/_/g, " ")}`,
        html: `<p>${emailBody.replace(/\n/g, "<br/>")}</p>`,
        text: emailBody,
        fromName: "Platform System"
      });
      return { success: emailRes.success, delivered: emailRes.success, channel: "smtp" };
    } catch (err) {
      console.error(`[NOTIFICATION:ERROR] Failed to send ${event} to ${payload.recipientEmail}:`, err);
      return { success: false, delivered: false, channel: "smtp" };
    }
  }

  console.log(`[NOTIFICATION:SYSTEM_EVENT] ${event} | Recipient: ${payload.recipientEmail} | Time: ${timestamp}`);
  return { success: true, delivered: true, channel: "log" };
}
