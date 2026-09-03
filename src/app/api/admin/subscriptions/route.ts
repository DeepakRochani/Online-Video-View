import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import {
  getAllSubscriptions,
  readPhotographers,
  getSubscription,
  saveSubscription,
  extendSubscriptionPeriod,
  grantCompSubscription,
  setTenantEntitlementOverride,
  getPlanBySlug,
  readPlans,
} from "@/lib/db";
import { SubscriptionStatus } from "@/lib/project-types";

export interface AdminSubscriptionRow {
  id: string;
  photographerId: string;
  photographerName: string;
  photographerEmail: string;
  studioName: string;
  accountStatus: string;
  planId: string | null;
  planSlug: string;
  planName: string;
  resolvedPlanName: string;
  plan: string;
  status: SubscriptionStatus;
  billingCycle: string;
  amount: number;
  currency: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasOverride: boolean;
  entitlementOverride?: any;
  isComp?: boolean;
  compReason?: string;
  overrideSummary: string | null;
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const rawSubscriptions = getAllSubscriptions();
    const photographers = readPhotographers();
    const photogMap = new Map(photographers.map((p) => [p.id, p]));
    const dynamicPlans = readPlans();
    const planSlugMap = new Map(dynamicPlans.map((dp) => [dp.slug.toLowerCase(), dp]));

    const items: AdminSubscriptionRow[] = [];
    const seenIds = new Set<string>();

    for (const s of rawSubscriptions) {
      if (!s || typeof s.id !== "string" || typeof s.photographerId !== "string") continue;
      if (s.id.includes("[object Object]") || s.photographerId.includes("[object Object]")) continue;
      if (seenIds.has(s.id)) continue;
      seenIds.add(s.id);

      const p = photogMap.get(s.photographerId);
      // Skip platform_admin and super admin subscriptions from customer list
      if (p?.role === "platform_admin" || p?.role === "SUPER_ADMIN" || s.photographerId === "photographer-super-admin") continue;

      const slug = (s.planSlug || s.plan || "pro").toLowerCase();
      const plan = planSlugMap.get(slug) || (s.planSlug ? getPlanBySlug(s.planSlug) : null);
      const cycle = (s.billingCycle || "MONTHLY").toUpperCase();
      const pricePaise = plan ? (cycle === "YEARLY" ? plan.priceYearlyPaise : plan.priceMonthlyPaise) : 0;
      const resolvedPlanName = plan?.name || s.plan || "Pro Studio";

      items.push({
        id: String(s.id),
        photographerId: String(s.photographerId),
        photographerName: String(p?.name || "Unknown Photographer"),
        photographerEmail: String(p?.email || ""),
        studioName: String(p?.studioName || p?.businessName || "Studio"),
        accountStatus: String(p?.status || "active"),
        planId: plan ? String(plan.id) : null,
        planSlug: slug,
        planName: resolvedPlanName,
        resolvedPlanName,
        plan: resolvedPlanName,
        status: s.status,
        billingCycle: cycle,
        amount: Math.round(pricePaise / 100),
        currency: "INR",
        currentPeriodStart: s.currentPeriodStart || null,
        currentPeriodEnd: s.currentPeriodEnd || null,
        cancelAtPeriodEnd: Boolean(s.cancelAtPeriodEnd),
        hasOverride: Boolean(s.entitlementOverride),
        entitlementOverride: s.entitlementOverride,
        isComp: Boolean(s.isComp),
        compReason: s.compReason,
        overrideSummary: s.entitlementOverride?.reason || null,
      });
    }

    return NextResponse.json({ success: true, subscriptions: items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retrieve subscriptions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { action, photographerId } = body;

    if (!photographerId || typeof photographerId !== "string" || photographerId === "[object Object]") {
      return NextResponse.json({ error: "Valid photographerId string is required" }, { status: 400 });
    }

    if (action === "extend") {
      const { days } = body;
      if (!days || typeof days !== "number" || days <= 0) {
        return NextResponse.json({ error: "Valid number of days is required" }, { status: 400 });
      }
      const updated = extendSubscriptionPeriod(
        photographerId,
        days,
        auth.session.photographerId,
        "Super Admin manual extension"
      );
      if (!updated) {
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        message: `Subscription extended by ${days} days. New period end: ${updated.currentPeriodEnd}`,
        subscription: updated,
      });
    }

    if (action === "comp") {
      const { planSlug = "pro", durationDays = 30, reason } = body;
      const updated = grantCompSubscription(
        photographerId,
        planSlug,
        durationDays,
        reason,
        auth.session.photographerId,
        auth.session.email
      );
      if (!updated) {
        return NextResponse.json({ error: "Failed to grant complimentary subscription" }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: `Complimentary ${planSlug.toUpperCase()} subscription granted for ${durationDays} days.`,
        subscription: updated,
      });
    }

    if (action === "override") {
      const { override } = body;
      const updated = setTenantEntitlementOverride(
        photographerId,
        override,
        auth.session.photographerId,
        override?.reason || "Super Admin manual override"
      );
      if (!updated) {
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        message: "Entitlement overrides applied successfully.",
        subscription: updated,
      });
    }

    if (action === "status") {
      const { status } = body as { status: SubscriptionStatus };
      if (!status) {
        return NextResponse.json({ error: "Status is required" }, { status: 400 });
      }
      const existing = getSubscription(photographerId);
      if (!existing) {
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
      }
      const oldStatus = existing.status;
      existing.status = status;
      existing.updatedAt = new Date().toISOString();
      saveSubscription(existing);

      const { recordAdminAuditLog } = await import("@/lib/db");
      recordAdminAuditLog({
        adminId: auth.session.photographerId,
        adminEmail: auth.session.email,
        action: "UPDATE_SUBSCRIPTION_STATUS",
        targetType: "subscription",
        targetId: existing.id,
        metadata: { photographerId, oldStatus, newStatus: status },
        result: "success",
      });

      return NextResponse.json({
        success: true,
        message: `Subscription status updated to ${status}.`,
        subscription: existing,
      });
    }

    return NextResponse.json({ error: "Invalid action specified" }, { status: 400 });
  } catch (error: any) {
    console.error("Admin subscription action error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute subscription action" }, { status: 500 });
  }
}
