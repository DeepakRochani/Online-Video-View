import { NextRequest, NextResponse } from "next/server";
import { reopenSelection, getProjectById } from "@/lib/db";
import { requireProjectOwner } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const ownerCheck = await requireProjectOwner(projectId);
  if (!ownerCheck.success) {
    return NextResponse.json({ error: ownerCheck.error }, { status: ownerCheck.status });
  }

  const success = reopenSelection(projectId);
  if (!success) {
    return NextResponse.json({ error: "Failed to reopen selection" }, { status: 400 });
  }

  const updatedProject = getProjectById(projectId);

  return NextResponse.json({
    success: true,
    message: "✓ Selection successfully reopened for client editing.",
    config: updatedProject?.settings?.selectionConfig,
  });
}
