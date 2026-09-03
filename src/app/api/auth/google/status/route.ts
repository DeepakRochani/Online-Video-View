export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const configured = Boolean(googleClientId && googleClientId.length > 5);

  return NextResponse.json({
    enabled: configured,
    configured,
    clientId: configured ? googleClientId : undefined,
  });
}
