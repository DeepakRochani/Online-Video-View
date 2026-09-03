import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { getAdminAuditLogs } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get("targetType") || undefined;
  const targetId = searchParams.get("targetId") || undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 200;

  try {
    const logs = getAdminAuditLogs({
      targetType,
      targetId,
      limit,
    });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retrieve audit logs" }, { status: 500 });
  }
}
