import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  isWebhookProcessed,
  recordWebhookProcessed,
  getSubscription,
  saveSubscription,
  createInvoiceRecord,
  generateId,
  readPhotographers,
  getPlanBySlug,
  recordAdminAuditLog,
} from "@/lib/db";
import { SubscriptionStatus, SubscriptionPlanTier, DEFAULT_GRACE_PERIOD_DAYS } from "@/lib/project-types";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Cryptographic signature check
    if (webhookSecret) {
      if (!signature) {
        return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
      }
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const eventId = payload.id || `evt_${generateId().toLowerCase()}`;
    const eventType = payload.event;

    if (!eventType) {
      return NextResponse.json({ error: "Missing event type in payload" }, { status: 400 });
    }

    // Idempotency check: provider + eventId
    if (isWebhookProcessed(eventId)) {
      return NextResponse.json({
        status: "ok",
        message: "Webhook event already processed",
        duplicate: true,
        eventId,
      });
    }

    // Mark as processed in the idempotency ledger
    recordWebhookProcessed(eventId, eventType);

    const subscriptionEntity = payload.payload?.subscription?.entity;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    const customerEmail =
      subscriptionEntity?.customer_email ||
      paymentEntity?.email ||
      orderEntity?.notes?.email ||
      payload.payload?.notes?.email;

    const notesPhotographerId =
      paymentEntity?.notes?.photographerId ||
      orderEntity?.notes?.photographerId ||
      subscriptionEntity?.notes?.photographerId;

    const rzpSubId = subscriptionEntity?.id || paymentEntity?.subscription_id;

    // Resolve photographer ID from notes or email match
    let photographerId: string | null = null;
    if (notesPhotographerId && typeof notesPhotographerId === "string") {
      photographerId = notesPhotographerId;
    } else if (customerEmail) {
      const photographers = readPhotographers();
      const match = photographers.find((p) => p.email.toLowerCase() === String(customerEmail).toLowerCase());
      if (match) photographerId = match.id;
    }

    if (photographerId) {
      const existingSub = getSubscription(photographerId);

      switch (eventType) {
        case "subscription.authenticated":
        case "subscription.activated":
        case "subscription.charged":
        case "subscription.resumed":
        case "order.paid":
        case "payment.captured": {
          if (existingSub) {
            const planSlug = paymentEntity?.notes?.planSlug || orderEntity?.notes?.planSlug || existingSub.planSlug || "pro";
            const dynamicPlan = getPlanBySlug(planSlug);
            const planTier: SubscriptionPlanTier = (dynamicPlan?.name || existingSub.plan || "PRO").toUpperCase();

            const updated = {
              ...existingSub,
              plan: planTier,
              planSlug: planSlug.toLowerCase(),
              status: "ACTIVE" as SubscriptionStatus,
              razorpaySubscriptionId: rzpSubId || existingSub.razorpaySubscriptionId,
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              cancelAtPeriodEnd: false,
              updatedAt: new Date().toISOString(),
            };
            saveSubscription(updated);

            // Record Invoice if payment amount is present
            if (paymentEntity?.amount) {
              createInvoiceRecord({
                photographerId,
                subscriptionId: updated.id,
                razorpayPaymentId: paymentEntity.id,
                razorpayOrderId: paymentEntity.order_id || orderEntity?.id,
                amount: Math.round(paymentEntity.amount / 100),
                amountPaise: paymentEntity.amount,
                currency: (paymentEntity.currency || "INR").toUpperCase(),
                status: "paid",
                plan: planTier,
                billingPeriod: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
                description: `Payment captured for ${planTier} plan`,
              });
            }

            recordAdminAuditLog({
              adminId: "system-webhook",
              adminEmail: "webhooks@platform.internal",
              action: "SUBSCRIPTION_ACTIVATED_VIA_WEBHOOK",
              targetType: "subscription",
              targetId: updated.id,
              metadata: { eventId, eventType, photographerId, plan: planTier },
              result: "success",
            });
          }
          break;
        }

        case "subscription.halted":
        case "payment.failed": {
          if (existingSub) {
            const now = new Date();
            const gracePeriodEnd = new Date(now.getTime() + DEFAULT_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();
            const updated = {
              ...existingSub,
              status: "PAST_DUE" as SubscriptionStatus,
              gracePeriodEnd,
              updatedAt: now.toISOString(),
            };
            saveSubscription(updated);

            recordAdminAuditLog({
              adminId: "system-webhook",
              adminEmail: "webhooks@platform.internal",
              action: "PAYMENT_FAILED_VIA_WEBHOOK",
              targetType: "subscription",
              targetId: updated.id,
              metadata: { eventId, eventType, photographerId, gracePeriodEnd },
              result: "success",
            });
          }
          break;
        }

        case "subscription.cancelled": {
          if (existingSub) {
            const updated = {
              ...existingSub,
              status: "CANCELLED" as SubscriptionStatus,
              cancelAtPeriodEnd: true,
              canceledAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            saveSubscription(updated);

            recordAdminAuditLog({
              adminId: "system-webhook",
              adminEmail: "webhooks@platform.internal",
              action: "SUBSCRIPTION_CANCELLED_VIA_WEBHOOK",
              targetType: "subscription",
              targetId: updated.id,
              metadata: { eventId, eventType, photographerId },
              result: "success",
            });
          }
          break;
        }

        case "subscription.completed": {
          if (existingSub) {
            const updated = {
              ...existingSub,
              status: "EXPIRED" as SubscriptionStatus,
              updatedAt: new Date().toISOString(),
            };
            saveSubscription(updated);
          }
          break;
        }

        case "subscription.paused": {
          if (existingSub) {
            const updated = {
              ...existingSub,
              status: "PAST_DUE" as SubscriptionStatus,
              updatedAt: new Date().toISOString(),
            };
            saveSubscription(updated);
          }
          break;
        }
      }
    }

    return NextResponse.json({ status: "ok", received: true, eventId, eventType });
  } catch (err: unknown) {
    console.error("Razorpay webhook error:", err);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
