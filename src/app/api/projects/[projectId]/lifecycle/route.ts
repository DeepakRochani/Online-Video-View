import { NextRequest, NextResponse } from "next/server";
import { requireProjectOwner } from "@/lib/auth";
import { canPerformProjectAction } from "@/lib/permissions";
import { transitionGalleryStatus, LifecycleAction } from "@/lib/gallery-lifecycle";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const auth = await requireProjectOwner(projectId);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { project, session } = auth;

  try {
    const body = await request.json();
    const { action, expiresAt, extendDays, reason } = body;

    if (!action) {
      return NextResponse.json({ error: "Lifecycle action is required" }, { status: 400 });
    }

    const validActions: LifecycleAction[] = [
      "publish",
      "unpublish",
      "archive",
      "restore-archive",
      "restore-expired",
      "extend-expiration",
      "delete",
      "restore-delete",
    ];

    if (!validActions.includes(action as LifecycleAction)) {
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    // Role / Staff Permission check
    const requiredPermission = action === "delete" ? "delete" : "edit";
    const permCheck = canPerformProjectAction(session, project, requiredPermission);
    if (!permCheck.allowed) {
      return NextResponse.json(
        { error: permCheck.reason || "You do not have permission to modify this gallery's lifecycle." },
        { status: 403 }
      );
    }

    const result = await transitionGalleryStatus(projectId, action as LifecycleAction, {
      expiresAt,
      extendDays,
      reason,
      performedBy: {
        id: session.memberId || session.photographerId,
        email: session.email,
        role: session.role,
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to update lifecycle status" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      project: result.project,
      previousStatus: result.previousStatus,
      currentStatus: result.currentStatus,
    });
  } catch (err: any) {
    console.error(`[Lifecycle API] Error on project ${projectId}:`, err);
    return NextResponse.json({ error: "Failed to process lifecycle action" }, { status: 500 });
  }
}

export const PATCH = POST;
