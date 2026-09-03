import { NextRequest, NextResponse } from "next/server";
import {
  getSelections,
  updateSelectionConfig,
  hydrateMediaForFavorites,
} from "@/lib/db";
import { requireProjectOwner } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const ownerCheck = await requireProjectOwner(projectId);
  if (!ownerCheck.success) {
    return NextResponse.json({ error: ownerCheck.error }, { status: ownerCheck.status });
  }

  const project = ownerCheck.project;
  const config = project.settings?.selectionConfig || {
    enabled: false,
    limit: 20,
    title: "Wedding Album Selection",
    instructions: "Please select your favorite photos for your custom wedding album.",
    status: "OPEN" as const,
  };

  const rawSelections = getSelections(projectId);
  const hydrated = hydrateMediaForFavorites(rawSelections as any, project);

  return NextResponse.json({
    success: true,
    config,
    count: hydrated.length,
    selections: hydrated,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const ownerCheck = await requireProjectOwner(projectId);
  if (!ownerCheck.success) {
    return NextResponse.json({ error: ownerCheck.error }, { status: ownerCheck.status });
  }

  try {
    const body = await request.json();
    const updated = updateSelectionConfig(projectId, {
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
      limit: typeof body.limit === "number" ? body.limit : undefined,
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      instructions: typeof body.instructions === "string" ? body.instructions.trim() : undefined,
      status: body.status || undefined,
    });

    return NextResponse.json({
      success: true,
      config: updated,
    });
  } catch (err: any) {
    console.error("Update selection config error:", err);
    return NextResponse.json({ error: "Failed to update selection configuration" }, { status: 500 });
  }
}
