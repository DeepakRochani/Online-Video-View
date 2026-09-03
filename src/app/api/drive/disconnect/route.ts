import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { disconnectGoogleDrive } from "@/lib/db";

export async function POST(_request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized: Please log in" }, { status: 401 });
  }

  const updated = disconnectGoogleDrive(session.photographerId);
  if (!updated) {
    return NextResponse.json({ error: "Photographer account not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: "Google Drive disconnected successfully.",
    connected: false,
  });
}
