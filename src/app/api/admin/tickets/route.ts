import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import {
  getSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  recordAdminAuditLog,
} from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const photographerId = searchParams.get("photographerId") || undefined;
  const priority = searchParams.get("priority") || undefined;

  try {
    const tickets = getSupportTickets({ status, photographerId, priority });
    return NextResponse.json({ success: true, tickets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retrieve support tickets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { photographerId, photographerName, photographerEmail, subject, description, priority } = body;

    if (!photographerId || !subject || !description) {
      return NextResponse.json({ error: "photographerId, subject, and description are required" }, { status: 400 });
    }

    const ticket = createSupportTicket({
      photographerId,
      photographerName,
      photographerEmail,
      subject,
      description,
      status: "open",
      priority: priority || "medium",
    });

    recordAdminAuditLog({
      adminId: auth.session.photographerId,
      adminEmail: auth.session.email,
      action: "SUPPORT_TICKET_CREATED",
      targetType: "photographer",
      targetId: photographerId,
      targetName: subject,
      result: "success",
    });

    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create support ticket" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { ticketId, status, priority } = await request.json();
    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    const updated = updateSupportTicket(ticketId, { status, priority });
    if (!updated) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    recordAdminAuditLog({
      adminId: auth.session.photographerId,
      adminEmail: auth.session.email,
      action: "SUPPORT_TICKET_UPDATED",
      targetType: "system",
      targetId: ticketId,
      metadata: { status, priority },
      result: "success",
    });

    return NextResponse.json({ success: true, ticket: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update support ticket" }, { status: 500 });
  }
}
