import { NextRequest, NextResponse } from "next/server";
import { requireProjectOwner } from "@/lib/auth";
import { updateProjectEvents, DriveEventCategory } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const auth = await requireProjectOwner(projectId);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { events } = body as { events: DriveEventCategory[] };

    if (!Array.isArray(events)) {
      return NextResponse.json({ error: "Events array is required" }, { status: 400 });
    }

    // Clean & validate events
    const sanitizedEvents: DriveEventCategory[] = events.map((e, idx) => ({
      name: (e.name || `Event ${idx + 1}`).trim(),
      folderId: e.folderId || "",
      count: Number(e.count) || 0,
      photoCount: Number(e.photoCount) || 0,
      videoCount: Number(e.videoCount) || 0,
      coverImage: e.coverImage || "",
    }));

    const updated = updateProjectEvents(projectId, sanitizedEvents);

    return NextResponse.json({
      success: true,
      events: updated,
    });
  } catch (err: unknown) {
    console.error("[Update Events Error]", err);
    return NextResponse.json({ error: "Failed to update events" }, { status: 500 });
  }
}
