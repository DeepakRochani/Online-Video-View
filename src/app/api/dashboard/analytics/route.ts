export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getPhotographerAnalytics, TimeRangeOption } from "@/lib/analytics";
import { getProjectById } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || !session.photographerId) {
      return NextResponse.json(
        { error: "Authentication required to access studio analytics" },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    const range = (searchParams.get("range") || "30d") as TimeRangeOption;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const projectId = searchParams.get("projectId") || undefined;

    // IDOR Protection: If filtering by a specific project, verify it belongs to this photographer
    if (projectId) {
      const project = getProjectById(projectId);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      if (project.photographerId !== session.photographerId && session.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Access denied. You can only view analytics for your own studio projects." },
          { status: 403 }
        );
      }
    }

    const analytics = getPhotographerAnalytics(session.photographerId, {
      range,
      startDate,
      endDate,
      projectId,
    });

    return NextResponse.json(analytics);
  } catch (err) {
    console.error("Dashboard analytics error:", err);
    return NextResponse.json(
      { error: "Failed to compute photographer analytics" },
      { status: 500 }
    );
  }
}
