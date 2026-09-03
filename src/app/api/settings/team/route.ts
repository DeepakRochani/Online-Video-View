export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedPhotographerId } from "@/lib/auth";
import { 
  getTeamMembersByPhotographer, 
  addTeamMember, 
  removeTeamMember,
} from "@/lib/db";
import { checkPlanLimit } from "@/lib/plan-limits";

export async function GET() {
  const photographerId = await getAuthenticatedPhotographerId();
  if (!photographerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = getTeamMembersByPhotographer(photographerId);
  return NextResponse.json({ members });
}

export async function POST(request: NextRequest) {
  const photographerId = await getAuthenticatedPhotographerId();
  if (!photographerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check plan entitlement for team members
  const limitCheck = checkPlanLimit(photographerId, "maxTeamMembers");
  if (!limitCheck.allowed) {
    return NextResponse.json(
      {
        error: limitCheck.message,
        upgradeRequired: true,
        current: limitCheck.current,
        max: limitCheck.limit,
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, email, role } = body;

    if (!email || !name) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const member = addTeamMember({
      photographerId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || "editor",
      status: "active",
      joinedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, member });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to add team member" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const photographerId = await getAuthenticatedPhotographerId();
  if (!photographerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("id");

  if (!memberId) {
    return NextResponse.json({ error: "Missing member ID" }, { status: 400 });
  }

  const deleted = removeTeamMember(memberId, photographerId);
  if (!deleted) {
    return NextResponse.json({ error: "Member not found or unauthorized" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
