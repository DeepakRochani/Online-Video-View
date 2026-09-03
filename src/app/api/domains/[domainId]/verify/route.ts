import { NextRequest, NextResponse } from "next/server";
import { verifyDomainDns, getDomainById, DEFAULT_PHOTOGRAPHER_ID } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

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

  const domain = getDomainById(domainId);
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  const isSuperAdmin = session.role === "SUPER_ADMIN" || session.role === "platform_admin";
  const effectiveOwner = domain.photographerId || DEFAULT_PHOTOGRAPHER_ID;
  if (!isSuperAdmin && effectiveOwner !== session.photographerId) {
    return NextResponse.json({ error: "Unauthorized to verify this domain" }, { status: 403 });
  }

  const result = await verifyDomainDns(domainId);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
