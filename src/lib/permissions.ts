import { TeamRole, TeamPermission, WeddingProject } from "./project-types";

export const DEFAULT_ROLE_PERMISSIONS: Record<TeamRole, TeamPermission[]> = {
  owner: [
    "projects:read",
    "projects:create",
    "projects:edit",
    "projects:delete",
    "media:upload",
    "media:delete",
    "selections:view",
    "selections:manage",
    "communications:view",
    "communications:send",
    "settings:view",
    "settings:manage",
    "billing:view",
    "billing:manage",
    "team:view",
    "team:manage",
    "drive:manage",
  ],
  admin: [
    "projects:read",
    "projects:create",
    "projects:edit",
    "projects:delete",
    "media:upload",
    "media:delete",
    "selections:view",
    "selections:manage",
    "communications:view",
    "communications:send",
    "settings:view",
    "team:view",
    "team:manage",
    "drive:manage",
  ],
  editor: [
    "projects:read",
    "projects:create",
    "projects:edit",
    "media:upload",
    "selections:view",
    "communications:view",
  ],
  viewer: [
    "projects:read",
    "selections:view",
    "communications:view",
  ],
};

export interface PermissionDefinition {
  key: TeamPermission;
  label: string;
  description: string;
  category: "Projects" | "Media & Selections" | "Communications" | "Studio & Team" | "Billing";
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "projects:read",
    label: "View Projects",
    description: "Browse and view project galleries, timelines, and details",
    category: "Projects",
  },
  {
    key: "projects:create",
    label: "Create Projects",
    description: "Create new client projects, assign packages, and configure access codes",
    category: "Projects",
  },
  {
    key: "projects:edit",
    label: "Edit Projects",
    description: "Update project metadata, client information, and delivery settings",
    category: "Projects",
  },
  {
    key: "projects:delete",
    label: "Delete Projects",
    description: "Permanently delete projects and associated media files",
    category: "Projects",
  },
  {
    key: "media:upload",
    label: "Upload Media",
    description: "Upload videos, photos, covers, and music to client projects",
    category: "Media & Selections",
  },
  {
    key: "media:delete",
    label: "Delete Media",
    description: "Remove photos, videos, and media assets from project galleries",
    category: "Media & Selections",
  },
  {
    key: "selections:view",
    label: "View Selections",
    description: "View client photo favorites, album selections, and notes",
    category: "Media & Selections",
  },
  {
    key: "selections:manage",
    label: "Manage Selections",
    description: "Export selection sheets, approve selections, and lock/unlock albums",
    category: "Media & Selections",
  },
  {
    key: "communications:view",
    label: "View Communications",
    description: "View WhatsApp, SMS, and Email logs sent to clients",
    category: "Communications",
  },
  {
    key: "communications:send",
    label: "Send Communications",
    description: "Send client messages, gallery links, and status updates",
    category: "Communications",
  },
  {
    key: "settings:view",
    label: "View Studio Settings",
    description: "View studio profile, branding, and notification configurations",
    category: "Studio & Team",
  },
  {
    key: "settings:manage",
    label: "Manage Studio Settings",
    description: "Modify studio branding, custom domain, and global configurations",
    category: "Studio & Team",
  },
  {
    key: "team:view",
    label: "View Team Members",
    description: "View team staff list, roles, and project assignments",
    category: "Studio & Team",
  },
  {
    key: "team:manage",
    label: "Manage Team Members",
    description: "Invite staff, modify roles, assign projects, and revoke access",
    category: "Studio & Team",
  },
  {
    key: "drive:manage",
    label: "Manage Google Drive",
    description: "Connect, reconnect, and configure Google Drive integration",
    category: "Studio & Team",
  },
  {
    key: "billing:view",
    label: "View Billing & Invoices",
    description: "View subscription plan, payment methods, and invoice history",
    category: "Billing",
  },
  {
    key: "billing:manage",
    label: "Manage Subscription & Billing",
    description: "Upgrade/downgrade plan, add payment methods, and manage subscription",
    category: "Billing",
  },
];

export const ROLE_INFO: Record<TeamRole, { label: string; description: string; badgeVariant: string }> = {
  owner: {
    label: "Studio Owner",
    description: "Full administrative ownership over studio projects, billing, team, and settings.",
    badgeVariant: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  admin: {
    label: "Studio Admin / Manager",
    description: "Manage all studio projects, media uploads, team members, and communications.",
    badgeVariant: "border-purple-500/30 bg-purple-500/10 text-purple-300",
  },
  editor: {
    label: "Editor / Photographer",
    description: "Upload media, edit assigned client galleries, and manage client selections.",
    badgeVariant: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  },
  viewer: {
    label: "Assistant / Viewer",
    description: "Read-only access to assigned projects and selections.",
    badgeVariant: "border-zinc-700 bg-zinc-800 text-zinc-400",
  },
};

/**
 * Checks whether a given role/permission set satisfies a required permission.
 */
export function hasPermission(
  role: string | TeamRole | undefined,
  userPermissions?: TeamPermission[],
  required?: TeamPermission
): boolean {
  if (!required) return true;

  // Super Admin / Platform Admin has all permissions
  if (role === "SUPER_ADMIN" || role === "platform_admin") return true;

  // Primary Photographer / Owner has all permissions
  if (role === "PHOTOGRAPHER" || role === "owner") return true;

  // If custom permissions are provided, check against them
  if (userPermissions && Array.isArray(userPermissions)) {
    return userPermissions.includes(required);
  }

  // Fallback to default role permissions
  const normRole = (role || "").toLowerCase() as TeamRole;
  const rolePerms = DEFAULT_ROLE_PERMISSIONS[normRole] || [];
  return rolePerms.includes(required);
}

/**
 * Checks whether a session has access to a specific project.
 */
export function canAccessProject(
  session: {
    photographerId: string;
    role?: string;
    memberId?: string;
    assignedProjectIds?: string[];
    hasAllProjectsAccess?: boolean;
  },
  project: {
    id: string;
    photographerId?: string;
  }
): boolean {
  // Super Admin can access all projects
  if (session.role === "SUPER_ADMIN" || session.role === "platform_admin") {
    return true;
  }

  // Multi-tenant check: project must belong to the session's photographer/studio
  if (project.photographerId && project.photographerId !== session.photographerId) {
    return false;
  }

  // Primary Studio Owner has full access
  if (!session.memberId || session.role === "PHOTOGRAPHER" || session.role === "owner") {
    return true;
  }

  // Studio Admin has full access to all studio projects
  if (session.role === "admin") {
    return true;
  }

  // If user has all projects access flag enabled
  if (session.hasAllProjectsAccess === true) {
    return true;
  }

  // Check if project id is in assignedProjectIds
  if (session.assignedProjectIds && Array.isArray(session.assignedProjectIds)) {
    return session.assignedProjectIds.includes(project.id);
  }

  // Default fallback: if no restriction specified and not explicitly assigned
  const assignedList = session.assignedProjectIds as string[] | undefined;
  if (session.hasAllProjectsAccess === undefined && (!assignedList || assignedList.length === 0)) {
    return true;
  }

  return false;
}

/**
 * Convenience helper to check if a session can perform a specific action on a project.
 */
export function canPerformProjectAction(
  session: {
    photographerId: string;
    role?: string;
    memberId?: string;
    permissions?: TeamPermission[];
    assignedProjectIds?: string[];
    hasAllProjectsAccess?: boolean;
  },
  project: {
    id: string;
    photographerId?: string;
  },
  action: "read" | "create" | "edit" | "delete" | "upload_media" | "delete_media" | "manage_selections"
): { allowed: boolean; reason?: string } {
  // 1. Check Project Assignment Access
  if (action !== "create") {
    const hasProjectAccess = canAccessProject(session, project);
    if (!hasProjectAccess) {
      return { allowed: false, reason: "You do not have access to this project." };
    }
  }

  // 2. Check Permission for action
  const actionPermissionMap: Record<string, TeamPermission> = {
    read: "projects:read",
    create: "projects:create",
    edit: "projects:edit",
    delete: "projects:delete",
    upload_media: "media:upload",
    delete_media: "media:delete",
    manage_selections: "selections:manage",
  };

  const reqPerm = actionPermissionMap[action];
  if (reqPerm && !hasPermission(session.role, session.permissions, reqPerm)) {
    return {
      allowed: false,
      reason: `Your role (${session.role || "viewer"}) does not have permission for '${reqPerm}'.`,
    };
  }

  return { allowed: true };
}
