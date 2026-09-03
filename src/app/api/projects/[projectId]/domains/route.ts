import { NextRequest, NextResponse } from "next/server";
import { getDomainsByProjectId, addOrUpdateDomain } from "@/lib/db";
import { requireProjectOwner } from "@/lib/auth";
import { checkPlanLimit } from "@/lib/plan-limits";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const auth = await requireProjectOwner(projectId);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const domains = getDomainsByProjectId(projectId);
  return NextResponse.json({ domains });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const auth = await requireProjectOwner(projectId);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Plan limit check for custom domains
  const limitCheck = checkPlanLimit(auth.session.photographerId, "maxCustomDomains");
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

  try {
    const { hostname } = await request.json();
    if (!hostname) {
      return NextResponse.json({ error: "Hostname is required" }, { status: 400 });
    }

    const result = addOrUpdateDomain({
      projectId,
      hostname,
      photographerId: auth.session.photographerId,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, domain: result.domain });
  } catch {
    return NextResponse.json({ error: "Failed to save domain mapping" }, { status: 500 });
  }
}
