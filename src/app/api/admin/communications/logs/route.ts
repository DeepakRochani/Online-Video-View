import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getAdminCommunicationRecords, maskSensitiveRecipient, recordAdminAuditLog } from "@/lib/db";

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
    const isCsvExport = searchParams.get("export") === "csv";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 1000);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
    const search = searchParams.get("search") || undefined;
    const channel = searchParams.get("channel") || undefined;
    const status = searchParams.get("status") || undefined;
    const audience = searchParams.get("audience") || undefined;
    const type = searchParams.get("type") || undefined;
    const dateRange = (searchParams.get("dateRange") as any) || "all";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const { records, total } = getAdminCommunicationRecords({
      limit: isCsvExport ? 10000 : limit,
      offset: isCsvExport ? 0 : offset,
      search,
      channel,
      status,
      audience,
      type,
      dateRange,
      startDate,
      endDate,
    });

    if (isCsvExport) {
      // Audit log the export
      recordAdminAuditLog({
        adminId: session.photographerId || "super-admin",
        adminEmail: session.email || "admin@drfilms.com",
        action: "COMMUNICATIONS_LOGS_EXPORTED",
        targetType: "system",
        targetId: "COMM_LOGS",
        targetName: "Communication Logs Export",
        result: "success",
        metadata: {
          exportedCount: records.length,
          filters: { search, channel, status, audience, type, dateRange },
        },
      });

      const csvHeaders = [
        "ID",
        "Timestamp",
        "Channel",
        "Type",
        "Status",
        "Masked Recipient",
        "Subject",
        "Provider",
        "Provider Message ID",
        "Retry Count",
        "Photographer ID",
        "Project ID",
        "Error Message",
      ];

      const csvRows = records.map((r) => [
        `"${r.id}"`,
        `"${r.createdAt}"`,
        `"${r.channel}"`,
        `"${r.type}"`,
        `"${r.status}"`,
        `"${maskSensitiveRecipient(r.recipient || r.recipientEmail || r.recipientPhone)}"`,
        `"${(r.subject || "").replace(/"/g, '""')}"`,
        `"${r.provider || "N/A"}"`,
        `"${r.providerMessageId || "N/A"}"`,
        r.retryCount ?? 0,
        `"${r.photographerId || "SYSTEM"}"`,
        `"${r.projectId || "N/A"}"`,
        `"${(r.errorMessage || "").replace(/"/g, '""')}"`,
      ]);

      const csvString = [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

      return new Response(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="communication_logs_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Ensure all records have valid string IDs and deduplicate if necessary
    const uniqueMap = new Map<string, typeof records[0]>();
    for (const r of records) {
      if (r && r.id) {
        uniqueMap.set(String(r.id), r);
      }
    }
    const cleanRecords = Array.from(uniqueMap.values());

    return NextResponse.json({
      success: true,
      records: cleanRecords.map((r) => ({
        ...r,
        id: String(r.id),
        maskedRecipient: maskSensitiveRecipient(r.recipient || r.recipientEmail || r.recipientPhone),
      })),
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[Admin Communications Logs API Error]:", error);
    return NextResponse.json(
      { error: "Failed to query communication logs.", details: error.message },
      { status: 500 }
    );
  }
}
