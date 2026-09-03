import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { getAllPhotographersWithStats, createPhotographer, recordAdminAuditLog } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;
  const plan = searchParams.get("plan") || undefined;
  const sortBy = searchParams.get("sortBy") || undefined;
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || undefined;

  try {
    const photographers = getAllPhotographersWithStats({
      search,
      status,
      plan,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({ success: true, photographers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retrieve photographers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { name, email, password, studioName, phone, plan } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and temporary password are required" }, { status: 400 });
    }

    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");

    const newPhotographer = createPhotographer({
      name,
      email,
      passwordHash,
      studioName: studioName || `${name} Photography`,
      phone: phone || "",
      role: "owner",
      status: "active",
      tagline: "Fine Art Photography & Films",
    });

    // Audit log
    recordAdminAuditLog({
      adminId: auth.session.photographerId,
      adminEmail: auth.session.email,
      action: "PHOTOGRAPHER_MANUAL_CREATE",
      targetType: "photographer",
      targetId: newPhotographer.id,
      targetName: newPhotographer.name,
      metadata: { email: newPhotographer.email, studioName: newPhotographer.studioName, initialPlan: plan || "FREE" },
      result: "success",
    });

    return NextResponse.json({ success: true, photographer: newPhotographer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create photographer" }, { status: 500 });
  }
}
