import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { getAllInvoices, readPhotographers } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.toLowerCase();

  try {
    let invoices = getAllInvoices();
    const photographers = readPhotographers();
    const photogMap = new Map(photographers.map((p) => [p.id, p]));

    if (status && status !== "all") {
      invoices = invoices.filter((i) => (i.status || "").toLowerCase() === status);
    }

    const items = invoices.map((inv) => {
      const p = photogMap.get(inv.photographerId);
      return {
        ...inv,
        photographerName: p?.name || "Unknown",
        photographerEmail: p?.email || "",
        studioName: p?.studioName || "Studio",
      };
    });

    const totalCollected = items
      .filter((i) => i.status.toLowerCase() === "paid")
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    return NextResponse.json({ success: true, invoices: items, totalCollected });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retrieve payments" }, { status: 500 });
  }
}
