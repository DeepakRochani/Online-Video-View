import { NextRequest, NextResponse } from "next/server";
import { requireProjectOwner } from "@/lib/auth";
import { updateProject, deleteProject, parseFolderUrl, WeddingProject } from "@/lib/db";
import { dispatchSaasNotification } from "@/lib/notifications";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const auth = await requireProjectOwner(projectId);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json({ project: auth.project });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const auth = await requireProjectOwner(projectId);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const project = auth.project;

  try {
    const body = await request.json();
    const patch: Partial<WeddingProject> = {};
    if (body.coupleName !== undefined) patch.coupleName = body.coupleName.trim();
    if (body.weddingDate !== undefined) patch.weddingDate = body.weddingDate;
    if (body.packageType !== undefined) patch.packageType = body.packageType.trim();
    if (body.welcomeMessage !== undefined) patch.welcomeMessage = body.welcomeMessage.trim();
    if (body.notes !== undefined) patch.notes = body.notes.trim();
    if (body.coverImage !== undefined) patch.coverImage = body.coverImage;
    if (body.status !== undefined) patch.status = body.status;
    if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive);
    if (body.settings !== undefined) patch.settings = body.settings;
    if (body.branding !== undefined) patch.branding = body.branding;
    if (body.events !== undefined) patch.events = body.events;
    if (body.theme !== undefined) patch.theme = body.theme;
    if (body.template !== undefined) patch.template = body.template;
    if (body.expiresAt !== undefined) patch.expiresAt = body.expiresAt;
    if (body.clientName !== undefined) patch.clientName = body.clientName.trim();
    if (body.clientEmail !== undefined) patch.clientEmail = body.clientEmail.trim();
    if (body.clientPhone !== undefined) patch.clientPhone = body.clientPhone.trim();
    if (body.clientWhatsapp !== undefined) patch.clientWhatsapp = body.clientWhatsapp.trim();
    
    if (body.driveFolderUrl !== undefined && body.driveFolderUrl !== project.driveFolderUrl) {
      const folderId = parseFolderUrl(body.driveFolderUrl);
      if (!folderId) {
        return NextResponse.json({ error: "Invalid Drive folder URL" }, { status: 400 });
      }
      patch.driveFolderUrl = body.driveFolderUrl.trim();
      patch.driveFolderId = folderId;
    }

    const updated = updateProject(projectId, patch);

    // Trigger Notification if project transitioned to published status
    if (patch.status === "published" && project.status !== "published" && updated) {
      const clientEmail = updated.clientEmail || project.clientEmail;
      const clientPhone = updated.clientWhatsapp || updated.clientPhone || project.clientWhatsapp || project.clientPhone;
      const clientName = updated.clientName || project.clientName || updated.coupleName;

      if (clientEmail || clientPhone) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.yourplatform.com";
        const galleryUrl = `${appUrl}/gallery/${updated.accessCode}`;

        // Asynchronously dispatch notification without blocking response
        dispatchSaasNotification({
          event: "GALLERY_PUBLISHED",
          photographerId: updated.photographerId || project.photographerId || "default",
          projectId: updated.id,
          recipientName: clientName,
          recipientEmail: clientEmail,
          recipientPhone: clientPhone,
          coupleTitle: updated.coupleName,
          galleryUrl,
          accessCode: updated.accessCode
        }).catch(err => {
          console.error(`[NOTIFY_PUBLISH_FAIL] Project: ${updated.id}`, err);
        });
      }
    }

    return NextResponse.json({ project: updated });
  } catch (err: unknown) {
    console.error("Update project error:", err);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}


export const PATCH = PUT;

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const auth = await requireProjectOwner(projectId);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const success = deleteProject(projectId);
  if (!success) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Project deleted" });
}
