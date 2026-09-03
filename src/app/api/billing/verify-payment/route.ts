import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import {
  DEFAULT_PHOTOGRAPHER_ID,
  generateId,
  getPlanBySlug,
  getPlanById,
  readPlans,
  redeemCoupon,
  updateSubscriptionPlanAndPeriod,
  createInvoiceRecord,
  recordBillingEvent,
  isBillingEventProcessed,
} from "@/lib/db";
import { DynamicPlan, BillingCycle } from "@/lib/project-types";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photographerId = session.photographerId || DEFAULT_PHOTOGRAPHER_ID;

  try {
    const body = await request.json();
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      planId,
      planSlug,
      planTier,
      billingCycle = "monthly",
      couponCode,
    } = body as {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
      planId?: string;
      planSlug?: string;
      planTier?: string;
      billingCycle?: BillingCycle;
      couponCode?: string;
    };

    // 1. Resolve Plan
    let plan: DynamicPlan | undefined;
    if (planSlug) plan = getPlanBySlug(planSlug) || undefined;
    if (!plan && planId) plan = getPlanById(planId) || undefined;
    if (!plan && planTier) plan = getPlanBySlug(planTier.toLowerCase()) || undefined;

    if (!plan) {
      return NextResponse.json({ error: "Invalid plan specified" }, { status: 400 });
    }

    // 2. Cryptographic signature check if key secret is configured
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keySecret) {
      if (!razorpay_signature || !razorpay_order_id || !razorpay_payment_id) {
        return NextResponse.json({ error: "Missing required Razorpay payment verification parameters" }, { status: 400 });
      }
      const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(payload)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return NextResponse.json({ error: "Payment signature verification failed" }, { status: 400 });
      }
    }

    // 3. Idempotency check with billing event tracker
    const paymentId = razorpay_payment_id || `pay_${generateId().replace(/-/g, "").slice(0, 14)}`;
    if (isBillingEventProcessed(paymentId)) {
      return NextResponse.json({
        success: true,
        message: "Payment already processed.",
        duplicate: true,
      });
    }

    // 4. Calculate Billing Period
    const now = new Date();
    const isYearly = billingCycle === "yearly";
    const durationDays = isYearly ? 365 : 30;
    const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // 5. Update Subscription
    const updatedSub = updateSubscriptionPlanAndPeriod(
      photographerId,
      plan.id,
      plan.slug,
      periodEnd.toISOString(),
      "ACTIVE",
      billingCycle
    );

    // 6. Redeem Coupon if provided
    if (couponCode) {
      redeemCoupon(couponCode);
    }

    // 7. Calculate final amount
    const basePaise = isYearly ? plan.priceYearlyPaise : plan.priceMonthlyPaise;
    const finalPaise = basePaise; // If coupon was applied, order amount was already discounted

    // 8. Create Invoice Record
    const invoice = createInvoiceRecord({
      photographerId,
      subscriptionId: updatedSub.id,
      razorpayPaymentId: paymentId,
      razorpayOrderId: razorpay_order_id,
      amountPaise: finalPaise,
      currency: "INR",
      status: "PAID",
      plan: plan.slug,
      planName: plan.name,
      billingCycle,
      couponCode: couponCode || undefined,
      periodStart: now.toISOString(),
      periodEnd: periodEnd.toISOString(),
      description: `Subscription to ${plan.name} (${billingCycle})`,
    });

    // 9. Record Billing Event
    recordBillingEvent({
      photographerId,
      eventType: "payment.captured",
      provider: "RAZORPAY",
      providerEventId: paymentId,
      payload: {
        paymentId,
        orderId: razorpay_order_id,
        planSlug: plan.slug,
        billingCycle,
        amountPaise: finalPaise,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${plan.name}!`,
      subscription: updatedSub,
      invoice,
    });
  } catch (err: unknown) {
    console.error("Payment verification error:", err);
    return NextResponse.json({ error: "Failed to verify and update subscription" }, { status: 500 });
  }
}
