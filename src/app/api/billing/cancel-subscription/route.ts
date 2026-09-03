import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { DEFAULT_PHOTOGRAPHER_ID, getSubscription, saveSubscription } from "@/lib/db";

export async function POST() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photographerId = session.photographerId || DEFAULT_PHOTOGRAPHER_ID;
  const sub = getSubscription(photographerId);
  if (!sub) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
  }

  const updated = {
    ...sub,
    cancelAtPeriodEnd: true,
    updatedAt: new Date().toISOString(),
  };
  saveSubscription(updated);

  return NextResponse.json({
    success: true,
    message: "Your subscription will not renew at the end of the current billing period.",
    subscription: updated,
  });
}
