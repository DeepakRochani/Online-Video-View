import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getPhotographerById } from "@/lib/db";

export async function GET(_request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized: Please log in" }, { status: 401 });
  }

  const photographer = getPhotographerById(session.photographerId);
  if (!photographer) {
    return NextResponse.json({ error: "Photographer account not found" }, { status: 404 });
  }

  const isConnected = !!photographer.googleDriveConnected && !!photographer.googleDriveTokens;

  return NextResponse.json({
    success: true,
    connected: isConnected,
    email: photographer.googleDriveEmail || (isConnected ? photographer.email : null),
    hasRefreshToken: !!photographer.googleDriveTokens?.refreshToken,
  });
}
