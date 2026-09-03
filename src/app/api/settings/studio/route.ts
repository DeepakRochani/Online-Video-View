export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readStudioSettings, writeStudioSettings } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  const settings = readStudioSettings();
  return NextResponse.json({ settings, studio: settings });
}

export async function POST(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updated = writeStudioSettings({
      studioName: body.studioName?.trim() || "DR Films Wedding Cinema",
      tagline: body.tagline?.trim() || "",
      logoUrlLight: body.logoUrlLight || "",
      logoUrlDark: body.logoUrlDark || "",
      website: body.website?.trim() || "",
      email: body.email?.trim() || "",
      phone: body.phone?.trim() || "",
      whatsapp: body.whatsapp?.trim() || body.phone?.trim() || "",
      instagram: body.instagram?.trim() || "",
      facebook: body.facebook?.trim() || "",
      footerText: body.footerText?.trim() || "",
      defaultTemplate: body.defaultTemplate || "classic",
      defaultTheme: body.defaultTheme || "luxury",
      defaultAccentColor: body.defaultAccentColor || "#D4AF37",
      whiteLabelEnabled: body.whiteLabelEnabled ?? true,
      cnameTarget: body.cnameTarget?.trim() || "cname.drfilms.com",
    });

    return NextResponse.json({ success: true, settings: updated, studio: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update studio settings" }, { status: 500 });
  }
}

export const PUT = POST;
