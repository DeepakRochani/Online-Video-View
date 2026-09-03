import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { setPrimaryDomain, DEFAULT_PHOTOGRAPHER_ID } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { domainId } = await params;
  if (!domainId) {
    return NextResponse.json({ error: "Domain ID is required" }, { status: 400 });
  }

  const isSuperAdmin = session.role === "SUPER_ADMIN" || session.role === "platform_admin";
  const photographerId = isSuperAdmin ? "SUPER_ADMIN" : session.photographerId || DEFAULT_PHOTOGRAPHER_ID;

  const result = setPrimaryDomain(domainId, photographerId);
  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to set primary domain" }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: "Primary domain updated successfully.",
    domain: result.domain,
  });
}
