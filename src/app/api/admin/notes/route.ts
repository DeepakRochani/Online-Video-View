import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import {
  getSupportNotesByPhotographer,
  addSupportNote,
  recordAdminAuditLog,
} from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const photographerId = searchParams.get("photographerId");

  if (!photographerId) {
    return NextResponse.json({ error: "photographerId is required" }, { status: 400 });
  }

  try {
    const notes = getSupportNotesByPhotographer(photographerId);
    return NextResponse.json({ success: true, notes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retrieve support notes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { photographerId, note } = await request.json();
    if (!photographerId || !note || !note.trim()) {
      return NextResponse.json({ error: "photographerId and note content are required" }, { status: 400 });
    }

    const newNote = addSupportNote(
      photographerId,
      auth.session.photographerId,
      auth.session.email.split("@")[0],
      note.trim()
    );

    recordAdminAuditLog({
      adminId: auth.session.photographerId,
      adminEmail: auth.session.email,
      action: "SUPPORT_NOTE_ADDED",
      targetType: "photographer",
      targetId: photographerId,
      result: "success",
    });

    return NextResponse.json({ success: true, note: newNote }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to add support note" }, { status: 500 });
  }
}
