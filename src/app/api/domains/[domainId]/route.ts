import { NextRequest, NextResponse } from "next/server";
import { removeDomain } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function DELETE(
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
  const photographerId = isSuperAdmin ? undefined : session.photographerId;

  const removed = removeDomain(domainId, photographerId);
  if (!removed) {
    return NextResponse.json({ error: "Domain not found or unauthorized to delete" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Custom domain removed successfully." });
}
