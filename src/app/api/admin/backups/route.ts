import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { createBackupSnapshot, getBackups, verifyBackupIntegrity } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const backups = getBackups();
  return NextResponse.json({ success: true, backups });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const label = body?.label ? String(body.label).slice(0, 30) : "manual-admin";

    const backup = createBackupSnapshot(label);
    return NextResponse.json({ success: true, backup }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to trigger backup snapshot" },
      { status: 500 }
    );
  }
}
