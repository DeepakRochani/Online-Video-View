import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import {
  DEFAULT_PHOTOGRAPHER_ID,
  generateId,
  readPlans,
  getPlanBySlug,
  getPlanById,
  readCoupons,
  redeemCoupon,
  updateSubscriptionPlanAndPeriod,
  createInvoiceRecord,
} from "@/lib/db";
import { BillingCycle, DynamicPlan, Coupon } from "@/lib/project-types";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photographerId = session.photographerId || DEFAULT_PHOTOGRAPHER_ID;

  try {
    const body = await request.json();
    const {
      planId,
      planSlug,
      planTier,
      billingCycle = "monthly",
      couponCode,
    } = body as {
      planId?: string;
      planSlug?: string;
      planTier?: string;
      billingCycle?: BillingCycle;
      couponCode?: string;
    };

    // 1. Resolve Target Plan
    let plan: DynamicPlan | undefined;
    if (planSlug) plan = getPlanBySlug(planSlug) || undefined;
    if (!plan && planId) plan = getPlanById(planId) || undefined;
    if (!plan && planTier) plan = getPlanBySlug(planTier.toLowerCase()) || undefined;

    if (!plan) {
      const allPlans = readPlans();
      plan = allPlans.find((p) => p.slug === "pro") || allPlans[0];
    }

    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: "The selected subscription plan is not available." }, { status: 400 });
    }

    // 2. Base Amount Calculation in Paise
    const isYearly = billingCycle === "yearly";
    const baseAmountPaise = isYearly ? plan.priceYearlyPaise : plan.priceMonthlyPaise;

    // 3. Coupon Processing
    let discountPaise = 0;
    let appliedCoupon: Coupon | undefined;

    if (couponCode && typeof couponCode === "string") {
      const cleanCode = couponCode.trim().toUpperCase();
      const coupons = readCoupons();
      const match = coupons.find((c) => c.code.toUpperCase() === cleanCode && c.isActive);

      if (match) {
        const now = Date.now();
        const isValidTime = (!match.validFrom || new Date(match.validFrom).getTime() <= now) &&
                            (!match.validUntil || new Date(match.validUntil).getTime() >= now);
        const hasRedemptions = !match.maxRedemptions || match.timesRedeemed < match.maxRedemptions;
        const isPlanAllowed = !match.allowedPlans?.length || match.allowedPlans.some((p: string) => p.toLowerCase() === plan?.slug.toLowerCase());

        if (isValidTime && hasRedemptions && isPlanAllowed) {
          appliedCoupon = match;
          if (match.discountType === "PERCENT") {
            discountPaise = Math.round((baseAmountPaise * match.discountValue) / 100);
          } else {
            discountPaise = Math.min(baseAmountPaise, match.discountValue);
          }
        }
      }
    }

    const finalAmountPaise = Math.max(0, baseAmountPaise - discountPaise);
    const finalAmountInr = finalAmountPaise / 100;

    // 4. Free or 100% Discount direct activation
    if (finalAmountPaise === 0) {
      const now = new Date();
      const durationDays = isYearly ? 365 : 30;
      const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const sub = updateSubscriptionPlanAndPeriod(
        photographerId,
        plan.id,
        plan.slug,
        periodEnd.toISOString(),
        "ACTIVE",
        billingCycle
      );

      if (appliedCoupon) {
        redeemCoupon(appliedCoupon.code);
      }

      // Record ₹0 invoice
      const invoice = createInvoiceRecord({
        photographerId,
        subscriptionId: sub.id,
        amountPaise: 0,
        currency: "INR",
        status: "PAID",
        plan: plan.slug,
        planName: plan.name,
        billingCycle,
        couponCode: appliedCoupon?.code,
        periodStart: now.toISOString(),
        periodEnd: periodEnd.toISOString(),
        description: `Subscription to ${plan.name} (${billingCycle}) - 100% Discount Promo`,
      });

      return NextResponse.json({
        success: true,
        isFree: true,
        message: `Plan activated successfully! You are now subscribed to ${plan.name}.`,
        subscription: sub,
        invoice,
      });
    }

    // 5. Razorpay Order Generation
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    let razorpayOrderId = `order_${generateId().replace(/-/g, "").slice(0, 14)}`;

    if (razorpayKeyId && razorpayKeySecret) {
      try {
        const authHeader = "Basic " + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
        const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({
            amount: finalAmountPaise,
            currency: "INR",
            receipt: `rcpt_${photographerId.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
            notes: {
              photographerId,
              planId: plan.id,
              planSlug: plan.slug,
              billingCycle,
              couponCode: appliedCoupon?.code || "",
            },
          }),
        });
        if (rzpRes.ok) {
          const rzpData = await rzpRes.json();
          if (rzpData && typeof rzpData.id === "string") {
            razorpayOrderId = rzpData.id;
          }
        }
      } catch (e) {
        console.warn("Razorpay API order error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: razorpayOrderId,
      amountPaise: finalAmountPaise,
      amountInr: finalAmountInr,
      originalAmountPaise: baseAmountPaise,
      discountPaise,
      currency: "INR",
      planId: plan.id,
      planSlug: plan.slug,
      planName: plan.name,
      billingCycle,
      couponApplied: appliedCoupon ? { code: appliedCoupon.code, discountPaise } : null,
      keyId: razorpayKeyId,
    });
  } catch (err: unknown) {
    console.error("Create subscription error:", err);
    return NextResponse.json({ error: "Failed to initiate subscription creation" }, { status: 500 });
  }
}
