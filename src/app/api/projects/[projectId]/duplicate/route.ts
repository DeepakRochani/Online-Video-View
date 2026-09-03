import { NextRequest, NextResponse } from "next/server";
import { requireProjectOwner } from "@/lib/auth";
import { duplicateProject } from "@/lib/db";
import { checkPlanLimit } from "@/lib/plan-limits";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const auth = await requireProjectOwner(projectId);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Check plan limit before duplicating
  const limitCheck = checkPlanLimit(auth.session.photographerId, "maxProjects");
  if (!limitCheck.allowed) {
    return NextResponse.json(
      {
        error: "PLAN_LIMIT_REACHED",
        message: limitCheck.message,
        current: limitCheck.current,
        limit: limitCheck.limit,
        upgradeRequired: true,
      },
      { status: 403 }
    );
  }

  const cloned = duplicateProject(projectId);
  if (!cloned) {
    return NextResponse.json({ error: "Source project not found or duplication failed" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: `Project duplicated successfully as "${cloned.coupleName}"`,
    project: cloned,
  });
}
