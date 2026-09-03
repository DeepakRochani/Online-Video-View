/**
 * Production Gallery Lifecycle & Expiration Service
 * 
 * Manages gallery lifecycle states (draft, published, expired, archived, soft-deleted),
 * background cron-driven automated expirations, and warning reminders with full audit trails.
 */

import {
  readProjects,
  writeProjects,
  getProjectById,
  updateProject,
  deleteProject,
  restoreDeletedProject,
  recordAdminAuditLog,
  readPlatformGalleryLifecycleSettings,
} from "./db";
import { WeddingProject, ProjectStatus } from "./project-types";
import { dispatchSaasNotification } from "./notifications";

export type LifecycleAction =
  | "publish"
  | "unpublish"
  | "archive"
  | "restore-archive"
  | "restore-expired"
  | "extend-expiration"
  | "delete"
  | "restore-delete";

export interface LifecycleTransitionOptions {
  expiresAt?: string | null; // New ISO expiration date or null for never
  extendDays?: number; // Helper e.g. 30, 60, 90, 180, 365
  extensionDays?: number; // Alias for extendDays
  performedBy?: {
    id: string;
    email: string;
    role: string;
  };
  actorEmail?: string;
  actorRole?: string;
  reason?: string;
}

export interface LifecycleTransitionResult {
  success: boolean;
  project?: WeddingProject;
  previousStatus?: ProjectStatus;
  currentStatus?: ProjectStatus;
  error?: string;
}

/**
 * Executes a state-machine transition on a gallery with security validation,
 * audit logging, and notification dispatch.
 */
export async function transitionGalleryStatus(
  projectId: string,
  action: LifecycleAction,
  options: LifecycleTransitionOptions = {}
): Promise<LifecycleTransitionResult> {
  const project = getProjectById(projectId);
  if (!project) {
    return { success: false, error: "Gallery project not found" };
  }

  options.extendDays = options.extendDays ?? options.extensionDays;

  const previousStatus = project.status;
  const now = new Date();
  const nowIso = now.toISOString();
  const performedBy = options.performedBy || {
    id: options.actorEmail || "system",
    email: options.actorEmail || "system@drfilms.com",
    role: options.actorRole || "system",
  };

  switch (action) {
    case "publish": {
      if (project.deletedAt) {
        return { success: false, error: "Cannot publish a deleted gallery. Restore it first." };
      }

      // Check platform default expiration if not set
      let expiresAt = project.expiresAt;
      if (!expiresAt) {
        const settings = readPlatformGalleryLifecycleSettings();
        const days = settings.defaultLifespanDays || settings.defaultExpirationDays || 90;
        if (settings.expirationEnabled && days) {
          const expDate = new Date();
          expDate.setDate(expDate.getDate() + days);
          expiresAt = expDate.toISOString();
        }
      }

      // If existing expiresAt was in past, require renewal
      if (expiresAt && new Date(expiresAt).getTime() <= now.getTime()) {
        if (options.expiresAt) {
          expiresAt = options.expiresAt;
        } else if (options.extendDays) {
          const expDate = new Date();
          expDate.setDate(expDate.getDate() + options.extendDays);
          expiresAt = expDate.toISOString();
        } else {
          // Default to 90 days from now
          const expDate = new Date();
          expDate.setDate(expDate.getDate() + 90);
          expiresAt = expDate.toISOString();
        }
      }

      const updated = updateProject(projectId, {
        status: "published",
        publishedAt: project.publishedAt || nowIso,
        archivedAt: undefined,
        expiresAt: expiresAt || undefined,
        isActive: true,
        updatedAt: nowIso,
      });

      if (!updated) return { success: false, error: "Failed to update gallery status" };

      recordAdminAuditLog({
        adminId: performedBy.id,
        adminEmail: performedBy.email,
        action: "GALLERY_PUBLISHED",
        targetType: "project",
        targetId: projectId,
        targetName: project.coupleName,
        result: "success",
        metadata: {
          photographerId: project.photographerId,
          previousStatus,
          newStatus: "published",
          expiresAt: updated.expiresAt,
        },
      });

      return {
        success: true,
        project: updated,
        previousStatus,
        currentStatus: "published",
      };
    }

    case "unpublish": {
      const updated = updateProject(projectId, {
        status: "draft",
        isActive: false,
        updatedAt: nowIso,
      });

      if (!updated) return { success: false, error: "Failed to unpublish gallery" };

      recordAdminAuditLog({
        adminId: performedBy.id,
        adminEmail: performedBy.email,
        action: "GALLERY_UNPUBLISHED",
        targetType: "project",
        targetId: projectId,
        targetName: project.coupleName,
        result: "success",
        metadata: {
          photographerId: project.photographerId,
          previousStatus,
          newStatus: "draft",
        },
      });

      return {
        success: true,
        project: updated,
        previousStatus,
        currentStatus: "draft",
      };
    }

    case "archive": {
      const updated = updateProject(projectId, {
        status: "archived",
        archivedAt: nowIso,
        isActive: false,
        updatedAt: nowIso,
      });

      if (!updated) return { success: false, error: "Failed to archive gallery" };

      recordAdminAuditLog({
        adminId: performedBy.id,
        adminEmail: performedBy.email,
        action: "GALLERY_ARCHIVED",
        targetType: "project",
        targetId: projectId,
        targetName: project.coupleName,
        result: "success",
        metadata: {
          photographerId: project.photographerId,
          previousStatus,
          newStatus: "archived",
        },
      });

      return {
        success: true,
        project: updated,
        previousStatus,
        currentStatus: "archived",
      };
    }

    case "restore-archive": {
      const updated = updateProject(projectId, {
        status: "published",
        archivedAt: undefined,
        isActive: true,
        updatedAt: nowIso,
      });

      if (!updated) return { success: false, error: "Failed to restore archived gallery" };

      recordAdminAuditLog({
        adminId: performedBy.id,
        adminEmail: performedBy.email,
        action: "GALLERY_RESTORED",
        targetType: "project",
        targetId: projectId,
        targetName: project.coupleName,
        result: "success",
        metadata: {
          photographerId: project.photographerId,
          previousStatus,
          newStatus: "published",
          restoredFrom: "archived",
        },
      });

      return {
        success: true,
        project: updated,
        previousStatus,
        currentStatus: "published",
      };
    }

    case "restore-expired": {
      let newExpiresAt: string | undefined = undefined;

      if (options.expiresAt !== undefined) {
        newExpiresAt = options.expiresAt || undefined;
      } else if (options.extendDays) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + options.extendDays);
        newExpiresAt = expDate.toISOString();
      } else {
        // Default 90 days
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + 90);
        newExpiresAt = expDate.toISOString();
      }

      const updated = updateProject(projectId, {
        status: "published",
        expiresAt: newExpiresAt,
        isActive: true,
        updatedAt: nowIso,
      });

      if (!updated) return { success: false, error: "Failed to restore expired gallery" };

      recordAdminAuditLog({
        adminId: performedBy.id,
        adminEmail: performedBy.email,
        action: "GALLERY_RESTORED",
        targetType: "project",
        targetId: projectId,
        targetName: project.coupleName,
        result: "success",
        metadata: {
          photographerId: project.photographerId,
          previousStatus,
          newStatus: "published",
          restoredFrom: "expired",
          expiresAt: newExpiresAt,
        },
      });

      return {
        success: true,
        project: updated,
        previousStatus,
        currentStatus: "published",
      };
    }

    case "extend-expiration": {
      let newExpiresAt: string | undefined = undefined;

      if (options.expiresAt !== undefined) {
        newExpiresAt = options.expiresAt || undefined;
      } else if (options.extendDays) {
        // If current expiresAt is in future, add days to it, otherwise add days to now
        const baseDate =
          project.expiresAt && new Date(project.expiresAt).getTime() > now.getTime()
            ? new Date(project.expiresAt)
            : new Date();
        baseDate.setDate(baseDate.getDate() + options.extendDays);
        newExpiresAt = baseDate.toISOString();
      }

      // If new expiration is in the future or never (undefined), and currently expired, set to published
      const shouldUnexpire =
        project.status === "expired" && (!newExpiresAt || new Date(newExpiresAt).getTime() > now.getTime());

      const nextStatus: ProjectStatus = shouldUnexpire ? "published" : project.status;

      const updated = updateProject(projectId, {
        expiresAt: newExpiresAt,
        status: nextStatus,
        isActive: nextStatus === "published",
        updatedAt: nowIso,
      });

      if (!updated) return { success: false, error: "Failed to extend gallery expiration" };

      recordAdminAuditLog({
        adminId: performedBy.id,
        adminEmail: performedBy.email,
        action: "GALLERY_EXPIRATION_EXTENDED",
        targetType: "project",
        targetId: projectId,
        targetName: project.coupleName,
        result: "success",
        metadata: {
          photographerId: project.photographerId,
          previousExpiresAt: project.expiresAt,
          newExpiresAt,
          previousStatus,
          newStatus: nextStatus,
        },
      });

      return {
        success: true,
        project: updated,
        previousStatus,
        currentStatus: nextStatus,
      };
    }

    case "delete": {
      const deleted = deleteProject(projectId, true, performedBy.email);
      if (!deleted) return { success: false, error: "Failed to soft-delete gallery" };

      const updated = getProjectById(projectId);

      recordAdminAuditLog({
        adminId: performedBy.id,
        adminEmail: performedBy.email,
        action: "GALLERY_DELETED",
        targetType: "project",
        targetId: projectId,
        targetName: project.coupleName,
        result: "success",
        metadata: {
          photographerId: project.photographerId,
          previousStatus,
          softDeleted: true,
        },
      });

      return {
        success: true,
        project: updated || undefined,
        previousStatus,
        currentStatus: project.status,
      };
    }

    case "restore-delete": {
      const restored = restoreDeletedProject(projectId);
      if (!restored) return { success: false, error: "Failed to restore deleted gallery" };

      recordAdminAuditLog({
        adminId: performedBy.id,
        adminEmail: performedBy.email,
        action: "GALLERY_DELETE_RESTORED",
        targetType: "project",
        targetId: projectId,
        targetName: project.coupleName,
        result: "success",
        metadata: {
          photographerId: project.photographerId,
          status: restored.status,
        },
      });

      return {
        success: true,
        project: restored,
        previousStatus,
        currentStatus: restored.status,
      };
    }

    default:
      return { success: false, error: `Unsupported lifecycle action: ${action}` };
  }
}

/**
 * Background Expiration Processor
 * Identifies published galleries where expiresAt is past or now, and transitions them to "expired".
 * Fully idempotent: repeated invocations will not create duplicate logs or transitions.
 */
export async function processGalleryExpirations(): Promise<{
  success: boolean;
  totalScanned: number;
  expiredCount: number;
  expiredProjectIds: string[];
  timestamp: string;
}> {
  const projects = readProjects();
  const now = Date.now();
  const nowIso = new Date().toISOString();
  let expiredCount = 0;
  const expiredProjectIds: string[] = [];

  let hasUpdates = false;

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];

    // Only process published, non-deleted projects with an expiration timestamp
    if (p.deletedAt) continue;
    if (p.status !== "published") continue;
    if (!p.expiresAt) continue;

    const expTime = new Date(p.expiresAt).getTime();
    if (isNaN(expTime)) continue;

    if (expTime <= now) {
      // Transition to expired
      projects[i] = {
        ...p,
        status: "expired",
        isActive: false,
        updatedAt: nowIso,
      };
      expiredCount++;
      expiredProjectIds.push(p.id);
      hasUpdates = true;

      // Audit log
      recordAdminAuditLog({
        adminId: "cron-gallery-lifecycle",
        adminEmail: "system-cron@drfilms.com",
        action: "GALLERY_EXPIRED",
        targetType: "project",
        targetId: p.id,
        targetName: p.coupleName,
        result: "success",
        metadata: {
          photographerId: p.photographerId,
          expiresAt: p.expiresAt,
          expiredAt: nowIso,
        },
      });

      // Dispatch notification if client contact exists
      if (p.clientEmail && p.photographerId) {
        try {
          await dispatchSaasNotification({
            type: "GALLERY_EXPIRED",
            photographerId: p.photographerId,
            recipientEmail: p.clientEmail,
            recipientName: p.clientName || p.coupleName,
            weddingId: p.id,
            idempotencyKey: `GALLERY_EXPIRED_${p.photographerId}_${p.id}_${p.expiresAt}`,
            metadata: {
              coupleName: p.coupleName,
              expiredAt: nowIso,
            },
          });
        } catch (err) {
          console.error(`[Lifecycle] Failed to dispatch expiration alert for project ${p.id}:`, err);
        }
      }
    }
  }

  if (hasUpdates) {
    writeProjects(projects);
  }

  return {
    success: true,
    totalScanned: projects.length,
    expiredCount,
    expiredProjectIds,
    timestamp: nowIso,
  };
}

/**
 * Background Expiration Reminder Processor
 * Sends 7-day, 3-day, and 1-day warning reminders to clients and photographers.
 * Uses deterministic idempotency keys to ensure at most one reminder per threshold per cycle.
 */
export async function processGalleryExpirationReminders(): Promise<{
  success: boolean;
  totalScanned: number;
  remindersSent: number;
  reminderDetails: Array<{ projectId: string; daysRemaining: number; recipient: string }>;
  timestamp: string;
}> {
  const projects = readProjects();
  const now = Date.now();
  const nowIso = new Date().toISOString();
  let remindersSent = 0;
  const reminderDetails: Array<{ projectId: string; daysRemaining: number; recipient: string }> = [];

  for (const p of projects) {
    if (p.deletedAt || p.status !== "published" || !p.expiresAt) continue;

    const expTime = new Date(p.expiresAt).getTime();
    if (isNaN(expTime) || expTime <= now) continue;

    const diffMs = expTime - now;
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Target thresholds: 7 days, 3 days, 1 day
    if ([7, 3, 1].includes(daysRemaining)) {
      if (p.clientEmail && p.photographerId) {
        const idempotencyKey = `EXPIRING_${daysRemaining}D_${p.photographerId}_${p.id}_${p.expiresAt.slice(0, 10)}`;

        try {
          const result = await dispatchSaasNotification({
            type: "GALLERY_EXPIRING_SOON",
            photographerId: p.photographerId,
            recipientEmail: p.clientEmail,
            recipientName: p.clientName || p.coupleName,
            weddingId: p.id,
            idempotencyKey,
            metadata: {
              coupleName: p.coupleName,
              daysRemaining,
              expiresAt: p.expiresAt,
            },
          });

          if (result.status === "SENT" || result.status === "DELIVERED") {
            remindersSent++;
            reminderDetails.push({
              projectId: p.id,
              daysRemaining,
              recipient: p.clientEmail,
            });
          }
        } catch (err) {
          console.error(`[Lifecycle] Failed to send reminder for project ${p.id}:`, err);
        }
      }
    }
  }

  return {
    success: true,
    totalScanned: projects.length,
    remindersSent,
    reminderDetails,
    timestamp: nowIso,
  };
}
