import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Allowed image MIME types
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

export async function POST(request: NextRequest) {
  // Only authenticated photographers can upload logos and covers
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const mimeType = file.type.toLowerCase();
    const extension = ALLOWED_MIME_TYPES[mimeType];
    if (!extension) {
      return NextResponse.json(
        { error: "Invalid file format. Supported formats: PNG, JPG, WEBP, SVG." },
        { status: 400 }
      );
    }

    // Limit upload size to 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit." },
        { status: 400 }
      );
    }

    // Ensure uploads folder exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // If SVG, perform basic sanitization check against active scripts
    if (extension === ".svg") {
      const svgContent = buffer.toString("utf-8");
      if (/<script[\s>]/i.test(svgContent) || /javascript:/i.test(svgContent) || /onload=/i.test(svgContent)) {
        return NextResponse.json(
          { error: "SVG file contains prohibited executable script elements." },
          { status: 400 }
        );
      }
    }

    // Create unique random filename
    const hash = crypto.randomBytes(16).toString("hex");
    const filename = `${Date.now()}-${hash}${extension}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      size: file.size,
      mimeType,
    });
  } catch (err: unknown) {
    console.error("[Upload Error]", err);
    return NextResponse.json({ error: "Failed to upload file." }, { status: 500 });
  }
}
