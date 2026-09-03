import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { readCoupons, saveCoupon, generateId } from "@/lib/db";
import { Coupon } from "@/lib/project-types";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
  }

  const coupons = readCoupons();
  return NextResponse.json({ coupons });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      id,
      code,
      discountType = "PERCENT",
      discountValue,
      validFrom,
      validUntil,
      maxRedemptions,
      allowedPlans,
      isActive = true,
    } = body as Partial<Coupon>;

    if (!code || discountValue === undefined) {
      return NextResponse.json({ error: "Coupon code and discount value are required" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const couponId = id || `cpn-${cleanCode.toLowerCase()}-${generateId().slice(0, 6)}`;

    const couponToSave: Coupon = {
      id: couponId,
      code: cleanCode,
      discountType,
      discountValue: Number(discountValue),
      validFrom: validFrom || new Date().toISOString(),
      validUntil: validUntil || undefined,
      maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
      timesRedeemed: body.timesRedeemed || 0,
      allowedPlans: allowedPlans || [],
      isActive: isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveCoupon(couponToSave);

    return NextResponse.json({ success: true, coupon: couponToSave });
  } catch (err: unknown) {
    console.error("Save coupon error:", err);
    return NextResponse.json({ error: "Failed to save coupon" }, { status: 500 });
  }
}
