import { cookies } from "next/headers";
import crypto from "crypto";
import { DEFAULT_PHOTOGRAPHER_ID, getPhotographerById, getProjectById, getTeamMemberById } from "./db";
import { WeddingProject, TeamPermission } from "./project-types";
import { canAccessProject, hasPermission } from "./permissions";

const COOKIE_NAME = "wvg_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "wvg-default-secret-key-change-me";

export interface SessionPayload {
  photographerId: string;
  email: string;
  role: string;
  tokenVersion?: number;
  timestamp: number;
  expiresAt: number;
  memberId?: string;
  memberName?: string;
  permissions?: TeamPermission[];
  assignedProjectIds?: string[];
  hasAllProjectsAccess?: boolean;
  impersonatingFromAdmin?: {
    adminId: string;
    adminEmail: string;
    originalAdminToken?: string;
    photographerName?: string;
  };
}

function signToken(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

function legacySign(data: string, secret: string): string {
  let hash = 0;
  const combined = data + ":" + secret;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function createSessionCookie(
  photographerId: string = DEFAULT_PHOTOGRAPHER_ID,
  email: string = "drfilms@weddingcinema.com",
  role: string = "PHOTOGRAPHER",
  tokenVersion: number = 1,
  impersonatingFromAdmin?: SessionPayload["impersonatingFromAdmin"],
  teamContext?: {
    memberId?: string;
    memberName?: string;
    permissions?: TeamPermission[];
    assignedProjectIds?: string[];
    hasAllProjectsAccess?: boolean;
  }
): Promise<string> {
  const payload: SessionPayload = {
    photographerId: photographerId || DEFAULT_PHOTOGRAPHER_ID,
    email: email.trim().toLowerCase(),
    role: role || "PHOTOGRAPHER",
    tokenVersion: tokenVersion || 1,
    timestamp: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    impersonatingFromAdmin,
    memberId: teamContext?.memberId,
    memberName: teamContext?.memberName,
    permissions: teamContext?.permissions,
    assignedProjectIds: teamContext?.assignedProjectIds,
    hasAllProjectsAccess: teamContext?.hasAllProjectsAccess,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signToken(encoded, SESSION_SECRET);
  return `${encoded}.${signature}`;
}

export function parseSessionToken(token: string): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  
  // Verify with HMAC-SHA256 or fallback to legacy sign
  const expectedHmac = signToken(encoded, SESSION_SECRET);
  const expectedLegacy = legacySign(encoded, SESSION_SECRET);
  
  if (signature !== expectedHmac && signature !== expectedLegacy) {
    return null;
  }

  try {
    const raw = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    if (raw.expiresAt && Date.now() > raw.expiresAt) {
      return null;
    }
    return {
      photographerId: raw.photographerId || DEFAULT_PHOTOGRAPHER_ID,
      email: (raw.email || "drfilms@weddingcinema.com").toLowerCase(),
      role: raw.role || "PHOTOGRAPHER",
      tokenVersion: typeof raw.tokenVersion === "number" ? raw.tokenVersion : 1,
      timestamp: raw.timestamp || Date.now(),
      expiresAt: raw.expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000,
      memberId: raw.memberId,
      memberName: raw.memberName,
      permissions: raw.permissions,
      assignedProjectIds: raw.assignedProjectIds,
      hasAllProjectsAccess: raw.hasAllProjectsAccess,
      impersonatingFromAdmin: raw.impersonatingFromAdmin,
    };
  } catch {
    return null;
  }
}

export function verifySessionToken(token: string): boolean {
  return parseSessionToken(token) !== null;
}

export async function getCurrentSession(reqOrCookie?: Request | { headers?: { get(name: string): string | null } } | Headers | string | null): Promise<SessionPayload | null> {
  try {
    let token: string | undefined;

    if (typeof reqOrCookie === "string") {
      token = reqOrCookie;
    } else if (reqOrCookie && typeof (reqOrCookie as any).headers?.get === "function") {
      const rawCookie = (reqOrCookie as any).headers.get("cookie") || "";
      const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    } else if (reqOrCookie && typeof (reqOrCookie as any).get === "function") {
      const rawCookie = (reqOrCookie as any).get("cookie") || "";
      const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (!token) {
      try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(COOKIE_NAME);
        token = sessionCookie?.value;
      } catch {
        // cookies() throws when called outside Next.js request context
      }
    }

    if (!token) return null;
    
    const session = parseSessionToken(token);
    if (!session) return null;

    // Server-side account status and tokenVersion verification
    const account = getPhotographerById(session.photographerId);
    if (!account) {
      return null;
    }

    // Check account status
    const status = (account.status || "active").toLowerCase();
    if (status === "suspended" || status === "pending_deletion" || status === "deleted") {
      return null;
    }

    // Check parent photographer tokenVersion for session revocation / force logout
    const accountTokenVersion = account.tokenVersion || 1;
    const sessionTokenVersion = session.tokenVersion || 1;
    if (accountTokenVersion > sessionTokenVersion && !session.memberId) {
      return null; // Session has been revoked by admin force logout or password reset
    }

    // If session belongs to a staff team member, check their active status & tokenVersion
    if (session.memberId) {
      const member = getTeamMemberById(session.memberId);
      if (!member || member.status !== "active") {
        return null;
      }
      if (member.photographerId !== session.photographerId) {
        return null;
      }
      const memberTokenVersion = member.tokenVersion || 1;
      if (memberTokenVersion > sessionTokenVersion) {
        return null;
      }
      // Update session payload with latest assignments & permissions
      session.role = member.role;
      session.permissions = member.permissions;
      session.assignedProjectIds = member.assignedProjectIds;
      session.hasAllProjectsAccess = member.hasAllProjectsAccess;
      session.memberName = member.name;
    }

    return session;
  } catch {
    return null;
  }
}

export const getAuthSession = getCurrentSession;


export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return session !== null;
}

export async function requirePhotographer(): Promise<SessionPayload | null> {
  return await getCurrentSession();
}

export async function getAuthenticatedPhotographerId(): Promise<string | null> {
  const session = await getCurrentSession();
  return session ? session.photographerId : null;
}

/**
 * IDOR & RBAC Protection Guard:
 * Verifies that the authenticated user or team member owns / has access to the requested wedding project.
 * Super Admins (SUPER_ADMIN / platform_admin) can also access any project.
 */
export async function requireProjectOwner(
  projectId: string,
  requiredPermission?: TeamPermission
): Promise<{ success: true; project: WeddingProject; session: SessionPayload } | { success: false; error: string; status: number }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Unauthorized: Please log in", status: 401 };
  }

  const project = getProjectById(projectId);
  if (!project) {
    return { success: false, error: "Project not found", status: 404 };
  }

  const isSuperAdmin = session.role === "SUPER_ADMIN" || session.role === "platform_admin";
  
  if (!isSuperAdmin) {
    const hasAccess = canAccessProject(session, project);
    if (!hasAccess) {
      return { success: false, error: "Forbidden: Access denied to this project", status: 403 };
    }

    if (requiredPermission) {
      const allowed = hasPermission(session.role, session.permissions, requiredPermission);
      if (!allowed) {
        return { 
          success: false, 
          error: `Forbidden: Missing required permission (${requiredPermission})`, 
          status: 403 
        };
      }
    }
  }

  return { success: true, project, session };
}

/**
 * Permission Guard:
 * Checks whether the current user has the required TeamPermission.
 */
export async function requirePermission(
  permission: TeamPermission
): Promise<{ success: true; session: SessionPayload } | { success: false; error: string; status: number }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Unauthorized: Please log in", status: 401 };
  }

  const allowed = hasPermission(session.role, session.permissions, permission);
  if (!allowed) {
    return {
      success: false,
      error: `Forbidden: You do not have the required permission '${permission}'.`,
      status: 403,
    };
  }

  return { success: true, session };
}

/**
 * Super Admin Guard:
 * Requires authenticated session with role "SUPER_ADMIN" or "platform_admin".
 */
export async function requireSuperAdmin(): Promise<
  | { success: true; session: SessionPayload }
  | { success: false; error: string; status: number }
> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Unauthorized: Please log in to access the platform control center", status: 401 };
  }
  const isSuperAdmin = session.role === "SUPER_ADMIN" || session.role === "platform_admin";
  if (!isSuperAdmin) {
    return { success: false, error: "Forbidden: Super Admin access required", status: 403 };
  }
  return { success: true, session };
}

export { COOKIE_NAME };
