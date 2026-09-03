import { NextRequest, NextResponse } from "next/server";
import { getSelections, hydrateMediaForFavorites } from "@/lib/db";
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
  const rawSelections = getSelections(projectId);
  const hydrated = hydrateMediaForFavorites(rawSelections as any, project);

  const escapeCsv = (str: string) => {
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = ["Filename", "Google Drive File ID", "Event", "Media Type", "Selected At", "Status"];
  const rows = hydrated.map((item) => {
    const filename = item.media?.name || "Unknown File";
    const driveFileId = item.media?.driveFileId || item.mediaId;
    const event = item.media?.eventName || "General";
    const mediaType = item.mediaType;
    const selectedAt = item.createdAt;
    const status = item.isAvailable ? "Available" : "Unavailable on Drive";

    return [
      escapeCsv(filename),
      escapeCsv(driveFileId),
      escapeCsv(event),
      escapeCsv(mediaType),
      escapeCsv(selectedAt),
      escapeCsv(status),
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const cleanName = (project.coupleName || "Wedding")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_");

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${cleanName}_Album_Selection.csv"`,
    },
  });
}
