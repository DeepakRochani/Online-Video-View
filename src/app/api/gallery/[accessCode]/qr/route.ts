export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  getProjectByAccessCode,
  recordAnalyticsEvent,
  getDomainsByProjectId,
  getPrimaryDomainForPhotographer,
  resolveCanonicalGalleryUrl,
} from "@/lib/db";
import QRCode from "qrcode";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accessCode: string }> }
) {
  const { accessCode } = await params;
  if (!accessCode) {
    return NextResponse.json({ error: "Access code is required" }, { status: 400 });
  }

  const project = getProjectByAccessCode(accessCode.toUpperCase());
  if (!project) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const format = request.nextUrl.searchParams.get("format") || "svg";
  const download = request.nextUrl.searchParams.get("download") === "true";
  const sizeParam = parseInt(request.nextUrl.searchParams.get("size") || "1200", 10);
  const size = isNaN(sizeParam) ? 1200 : Math.max(1200, sizeParam);
  const domains = getDomainsByProjectId(project.id);
  const photographerId = project.photographerId || "default";
  const primarySubDomain = getPrimaryDomainForPhotographer(photographerId);
  const customDomain =
    domains.find((d) => d.status === "active" || d.status === "ACTIVE" || d.verificationStatus === "verified")?.hostname ||
    primarySubDomain?.hostname ||
    null;
  const origin = request.headers.get("origin") || request.nextUrl.origin || "";
  const galleryUrl = resolveCanonicalGalleryUrl(project.accessCode, customDomain, origin);

  try {
    recordAnalyticsEvent(project.accessCode, "qr_generated");

    if (format === "png") {
      const qrBuffer = await QRCode.toBuffer(galleryUrl, {
        width: size,
        margin: 2,
        color: {
          dark: "#0a0a0c",
          light: "#ffffff",
        },
      });

      const response = new NextResponse(new Uint8Array(qrBuffer), {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
        },
      });

      if (download) {
        response.headers.set(
          "Content-Disposition",
          `attachment; filename="${project.coupleName.replace(/[^a-zA-Z0-9]/g, "_")}_Gallery_QR.png"`
        );
      }

      return response;
    } else {
      // Default SVG
      const qrSvg = await QRCode.toString(galleryUrl, {
        type: "svg",
        margin: 2,
        color: {
          dark: "#0a0a0c",
          light: "#ffffff",
        },
      });

      const response = new NextResponse(qrSvg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400",
        },
      });

      if (download) {
        response.headers.set(
          "Content-Disposition",
          `attachment; filename="${project.coupleName.replace(/[^a-zA-Z0-9]/g, "_")}_Gallery_QR.svg"`
        );
      }

      return response;
    }
  } catch (err) {
    console.error("QR generation error:", err);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
