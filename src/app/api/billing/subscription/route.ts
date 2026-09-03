import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getSubscription, readPlans, DEFAULT_PHOTOGRAPHER_ID } from "@/lib/db";
import { getTenantEntitlements } from "@/lib/entitlements";
import { getTenantUsageReport } from "@/lib/usage";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photographerId = session.photographerId || DEFAULT_PHOTOGRAPHER_ID;
  const subscription = getSubscription(photographerId);
  const entitlements = getTenantEntitlements(photographerId);
  const usageReport = getTenantUsageReport(photographerId);
  const allPlans = readPlans().filter((p) => p.isActive);

  return NextResponse.json({
    subscription,
    entitlements,
    usage: usageReport,
    razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "",
    isConfigured: !!(process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID),
  });
}
