import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { readCoupons, getPlanBySlug, getPlanById } from "@/lib/db";
import { BillingCycle } from "@/lib/project-types";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { code, planSlug, planId, billingCycle = "monthly" } = body as {
      code: string;
      planSlug?: string;
      planId?: string;
      billingCycle?: BillingCycle;
    };

    if (!code || typeof code !== "string") {
      return NextResponse.json({ valid: false, error: "Coupon code is required" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupons = readCoupons();
    const coupon = coupons.find((c) => c.code.toUpperCase() === cleanCode);

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ valid: false, error: "Invalid or expired coupon code" }, { status: 404 });
    }

    const now = Date.now();
    if (coupon.validUntil && new Date(coupon.validUntil).getTime() < now) {
      return NextResponse.json({ valid: false, error: "Coupon code has expired" }, { status: 400 });
    }

    if (coupon.validFrom && new Date(coupon.validFrom).getTime() > now) {
      return NextResponse.json({ valid: false, error: "Coupon code is not active yet" }, { status: 400 });
    }

    if (coupon.maxRedemptions && coupon.timesRedeemed >= coupon.maxRedemptions) {
      return NextResponse.json({ valid: false, error: "Coupon redemption limit reached" }, { status: 400 });
    }

    const plan = (planSlug ? getPlanBySlug(planSlug) : null) || (planId ? getPlanById(planId) : null);
    if (!plan) {
      return NextResponse.json({ valid: false, error: "Plan not found for coupon application" }, { status: 400 });
    }

    if (coupon.allowedPlans && coupon.allowedPlans.length > 0) {
      const match = coupon.allowedPlans.some(
        (p) => p.toLowerCase() === plan.slug.toLowerCase() || p === plan.id
      );
      if (!match) {
        return NextResponse.json(
          { valid: false, error: `Coupon is not valid for the ${plan.name} plan` },
          { status: 400 }
        );
      }
    }

    const baseAmountPaise = billingCycle === "yearly" ? plan.priceYearlyPaise : plan.priceMonthlyPaise;
    let discountPaise = 0;

    if (coupon.discountType === "PERCENT") {
      discountPaise = Math.round((baseAmountPaise * coupon.discountValue) / 100);
    } else {
      discountPaise = Math.min(baseAmountPaise, coupon.discountValue);
    }

    const finalAmountPaise = Math.max(0, baseAmountPaise - discountPaise);

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      calculation: {
        originalAmountPaise: baseAmountPaise,
        discountPaise,
        finalAmountPaise,
        originalAmountInr: baseAmountPaise / 100,
        discountInr: discountPaise / 100,
        finalAmountInr: finalAmountPaise / 100,
      },
    });
  } catch (err: unknown) {
    console.error("Coupon validation error:", err);
    return NextResponse.json({ valid: false, error: "Failed to validate coupon" }, { status: 500 });
  }
}
