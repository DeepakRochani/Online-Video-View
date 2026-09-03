import { NextRequest, NextResponse } from "next/server";
import { requireProjectOwner } from "@/lib/auth";
import { getProjectActivity } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const auth = await requireProjectOwner(projectId);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50;

  const activities = getProjectActivity(projectId, limit);

  return NextResponse.json({
    success: true,
    projectId,
    total: activities.length,
    activities,
  });
}
