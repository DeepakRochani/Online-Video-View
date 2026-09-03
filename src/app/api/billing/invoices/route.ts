import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { DEFAULT_PHOTOGRAPHER_ID, getInvoices } from "@/lib/db";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photographerId = session.photographerId || DEFAULT_PHOTOGRAPHER_ID;
  const invoices = getInvoices(photographerId);

  return NextResponse.json({ invoices });
}
