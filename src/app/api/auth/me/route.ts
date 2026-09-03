import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getPhotographerById, getSubscription, DEFAULT_PHOTOGRAPHER_ID } from "@/lib/db";
import { getPlanDetails } from "@/lib/plans";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({
      authenticated: false,
      photographerName: process.env.PHOTOGRAPHER_NAME || "Wedding Studio",
    });
  }

  const photographer = getPhotographerById(session.photographerId || DEFAULT_PHOTOGRAPHER_ID);
  const subscription = getSubscription(session.photographerId || DEFAULT_PHOTOGRAPHER_ID);
  const planTier = subscription?.plan || "PRO";
  const planConfig = getPlanDetails(planTier);

  let effectivePlan = planTier;
  let isPlanOverride = false;
  if (photographer?.adminPlanOverride) {
    const exp = new Date(photographer.adminPlanOverride.expiresAt).getTime();
    if (isNaN(exp) || exp > Date.now()) {
      effectivePlan = photographer.adminPlanOverride.plan;
      isPlanOverride = true;
    }
  }

  return NextResponse.json({
    authenticated: true,
    photographerId: session.photographerId,
    email: session.email,
    role: session.role,
    status: photographer?.status || "active",
    suspendedReason: photographer?.suspensionReason,
    name: photographer?.name || process.env.PHOTOGRAPHER_NAME || "DR Films Wedding Cinema",
    studioName: photographer?.studioName || process.env.PHOTOGRAPHER_NAME || "DR Films Wedding Cinema",
    photographerName: photographer?.studioName || photographer?.name || process.env.PHOTOGRAPHER_NAME || "DR Films",
    plan: effectivePlan,
    planName: isPlanOverride ? `${effectivePlan} (ADMIN GRANTED)` : planConfig.name,
    isPlanOverride,
    subscriptionStatus: subscription?.status || "ACTIVE",
    impersonatingFromAdmin: session.impersonatingFromAdmin || null,
  });
}
