import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getAdminCommunicationAnalytics } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden. Super Admin privileges required." },
        { status: session ? 403 : 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const range = (searchParams.get("range") as any) || "7d";
    if (!["24h", "7d", "30d", "all"].includes(range)) {
      return NextResponse.json(
        { error: "Invalid range parameter. Valid values: 24h, 7d, 30d, all" },
        { status: 400 }
      );
    }

    const report = getAdminCommunicationAnalytics(range);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error("[Admin Communications Analytics API Error]:", error);
    return NextResponse.json(
      { error: "Failed to compute communication analytics.", details: error.message },
      { status: 500 }
    );
  }
}
