export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { forceLogoutPhotographer } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Photographer ID is required" }, { status: 400 });
  }

  const success = forceLogoutPhotographer(
    id,
    auth.session.photographerId,
    auth.session.email
  );

  if (!success) {
    return NextResponse.json({ error: "Photographer not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: "Photographer has been forcefully logged out. All active sessions invalidated.",
  });
}
