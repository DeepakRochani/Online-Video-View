import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getCommunicationProviderStatuses } from "@/lib/communication-gate";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden. Super Admin privileges required." },
        { status: session ? 403 : 401 }
      );
    }

    const providerReport = await getCommunicationProviderStatuses();

    return NextResponse.json({
      success: true,
      providerReport,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Admin Communications Provider Health API Error]:", error);
    return NextResponse.json(
      { error: "Failed to query provider health.", details: error.message },
      { status: 500 }
    );
  }
}
