import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getAllClientsSummary } from "@/lib/db";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || !session.photographerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = getAllClientsSummary(session.photographerId);

  return NextResponse.json({ clients });
}
