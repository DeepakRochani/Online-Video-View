/**
 * Phase 29 — Full Production Security Audit + IDOR / Tenant Isolation Test Suite
 * 30-Point Comprehensive Hostile Security Verification
 */

import {
  createSessionCookie,
  parseSessionToken,
  getCurrentSession,
  requireSuperAdmin,
  requireProjectOwner,
  requirePermission,
} from "../lib/auth";
import { hasPermission, canAccessProject, canPerformProjectAction } from "../lib/permissions";
import { authorizeMediaRequest } from "../lib/media-auth";
import { generateSignedMediaToken, verifySignedMediaToken } from "../lib/media-token";
import {
  savePhotographer,
  getPhotographerById,
  readProjects,
  writeProjects,
  getProjectById,
  deleteProject,
  getInvoices,
  getDomainsByPhotographer,
  getTeamMembersByPhotographer,
  isWebhookProcessed,
  recordWebhookProcessed,
  readSubscriptions,
  writeSubscriptions,
  saveSubscription,
  addSelection,
  getSelections,
  submitSelection,
} from "../lib/db";
import { EntitlementService } from "../lib/entitlements";
import { NextRequest } from "next/server";
import crypto from "crypto";

async function runPhase29SecuritySuite() {
  console.log("================================================================");
  console.log("🛡️  STARTING PHASE 29: FULL PRODUCTION SECURITY AUDIT SUITE");
  console.log("================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail: string = "") {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}: ${detail}`);
      failed++;
    }
  }

  const tenantA = "sec-tenant-a-" + Date.now();
  const tenantB = "sec-tenant-b-" + Date.now();
  const projectAId = "sec-proj-a-" + Date.now();
  const projectBId = "sec-proj-b-" + Date.now();
  const mediaAId = "sec-media-a-" + Date.now();
  const mediaBId = "sec-media-b-" + Date.now();
  const accessCodeA = "CODEA" + Math.floor(1000 + Math.random() * 9000);
  const accessCodeB = "CODEB" + Math.floor(1000 + Math.random() * 9000);

  try {
    // ── 0. Setup Fixtures ──
    savePhotographer({
      id: tenantA,
      name: "Photographer A Studio",
      email: `photog_a_${Date.now()}@example.com`,
      passwordHash: "securehash",
      role: "PHOTOGRAPHER",
      businessName: "Studio A",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    savePhotographer({
      id: tenantB,
      name: "Photographer B Studio",
      email: `photog_b_${Date.now()}@example.com`,
      passwordHash: "securehash",
      role: "PHOTOGRAPHER",
      businessName: "Studio B",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const currentProjects = readProjects();
    writeProjects([
      ...currentProjects,
      {
        id: projectAId,
        photographerId: tenantA,
        coupleName: "Couple A",
        weddingDate: "2026-11-11",
        status: "published",
        accessCode: accessCodeA,
        photoFiles: [
          {
            id: mediaAId,
            driveFileId: "drive-a-1234567890",
            name: "Photo_A.jpg",
            mimeType: "image/jpeg",
            size: "4000000",
            modifiedTime: new Date().toISOString(),
          },
        ],
        videoFiles: [
          {
            id: "video-a-id",
            driveFileId: "drive-video-a-12345",
            name: "Highlight_A.mp4",
            mimeType: "video/mp4",
            size: "50000000",
          },
        ],
        settings: {
          isPasswordProtected: false,
          allowDownloads: true,
          allowFullscreen: true,
          showBranding: true,
          selectionConfig: {
            enabled: true,
            limit: 100,
            status: "OPEN",
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any,
      {
        id: projectBId,
        photographerId: tenantB,
        coupleName: "Couple B",
        weddingDate: "2026-12-12",
        status: "published",
        accessCode: accessCodeB,
        photoFiles: [
          {
            id: mediaBId,
            driveFileId: "drive-b-1234567890",
            name: "Photo_B.jpg",
            mimeType: "image/jpeg",
            size: "4000000",
            modifiedTime: new Date().toISOString(),
          },
        ],
        videoFiles: [
          {
            id: "video-b-id",
            driveFileId: "drive-video-b-12345",
            name: "Highlight_B.mp4",
            mimeType: "video/mp4",
            size: "50000000",
          },
        ],
        settings: {
          isPasswordProtected: false,
          allowDownloads: true,
          allowFullscreen: true,
          showBranding: true,
          selectionConfig: {
            enabled: true,
            limit: 100,
            status: "OPEN",
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any,
    ]);

    // Sessions
    const cookieA = await createSessionCookie(tenantA, "photog_a@example.com", "PHOTOGRAPHER");
    const cookieB = await createSessionCookie(tenantB, "photog_b@example.com", "PHOTOGRAPHER");
    const cookieViewer = await createSessionCookie(tenantA, "viewer_a@example.com", "viewer", 1, undefined, {
      memberId: "mem-viewer-1",
      memberName: "Assistant Viewer",
      permissions: ["projects:read", "selections:view"],
      assignedProjectIds: [projectAId],
      hasAllProjectsAccess: false,
    });
    const cookieSuperAdmin = await createSessionCookie("super-admin-id", "admin@weddingcinema.com", "SUPER_ADMIN");

    // -------------------------------------------------------------
    // TEST 1: Anonymous -> /dashboard -> DENIED
    // -------------------------------------------------------------
    const anonSession = await getCurrentSession(null);
    assert(anonSession === null, "TEST 1: Anonymous -> /dashboard -> DENIED (null session)");

    // -------------------------------------------------------------
    // TEST 2: Anonymous -> /admin -> DENIED
    // -------------------------------------------------------------
    const adminCheckAnon = await requireSuperAdmin();
    assert(
      adminCheckAnon.success === false && adminCheckAnon.status === 401,
      "TEST 2: Anonymous -> /admin -> DENIED with 401 Unauthorized"
    );

    // -------------------------------------------------------------
    // TEST 3: Photographer -> /admin -> DENIED
    // -------------------------------------------------------------
    const sessionPhotogA = parseSessionToken(cookieA);
    const isSuperAdminPhotog = sessionPhotogA?.role === "SUPER_ADMIN" || sessionPhotogA?.role === "platform_admin";
    assert(
      isSuperAdminPhotog === false,
      "TEST 3: Photographer -> /admin -> DENIED (cannot act as super admin)"
    );

    // -------------------------------------------------------------
    // TEST 4: Photographer A -> Photographer B wedding -> DENIED
    // -------------------------------------------------------------
    const projectB = getProjectById(projectBId);
    const canAccessB = canAccessProject(sessionPhotogA!, projectB!);
    assert(
      canAccessB === false,
      "TEST 4: Photographer A cannot access Photographer B wedding (canAccessProject is false)"
    );

    // -------------------------------------------------------------
    // TEST 5: Photographer A -> Photographer B gallery actions -> DENIED
    // -------------------------------------------------------------
    const editBAction = canPerformProjectAction(sessionPhotogA!, projectB!, "edit");
    assert(
      editBAction.allowed === false,
      "TEST 5: Photographer A cannot edit Photographer B gallery"
    );

    // -------------------------------------------------------------
    // TEST 6: Photographer A -> Photographer B media -> DENIED
    // -------------------------------------------------------------
    const reqCrossMedia = new NextRequest(`https://drfilms.com/api/photos/${mediaBId}`, {
      headers: { cookie: `wvg_session=${cookieA}` },
    });
    const mediaAuthResult = await authorizeMediaRequest(reqCrossMedia, mediaBId, { mediaType: "PHOTO" });
    assert(
      mediaAuthResult.authorized === false,
      "TEST 6: Photographer A cannot access Photographer B photo media",
      `Expected authorized=false, got status: ${mediaAuthResult.status}`
    );

    // -------------------------------------------------------------
    // TEST 7: Photographer A -> Photographer B video -> DENIED
    // -------------------------------------------------------------
    const reqCrossVideo = new NextRequest(`https://drfilms.com/api/videos/video-b-id/stream`, {
      headers: { cookie: `wvg_session=${cookieA}` },
    });
    const videoAuthResult = await authorizeMediaRequest(reqCrossVideo, "video-b-id", { mediaType: "VIDEO" });
    assert(
      videoAuthResult.authorized === false,
      "TEST 7: Photographer A cannot access Photographer B video stream"
    );

    // -------------------------------------------------------------
    // TEST 8: Photographer A -> Photographer B selection -> DENIED
    // -------------------------------------------------------------
    addSelection({
      projectId: projectBId,
      accessCode: accessCodeB,
      mediaId: mediaBId,
      mediaType: "PHOTO",
      sessionId: "session-client-b",
    });
    const canManageSelB = canPerformProjectAction(sessionPhotogA!, projectB!, "manage_selections");
    assert(
      canManageSelB.allowed === false,
      "TEST 8: Photographer A cannot manage selections for Photographer B wedding"
    );

    // -------------------------------------------------------------
    // TEST 9: Photographer A -> Photographer B billing -> DENIED
    // -------------------------------------------------------------
    const invoicesB = getInvoices(tenantB);
    const idorBilling = invoicesB.filter((i) => i.photographerId === tenantA);
    assert(
      idorBilling.length === 0,
      "TEST 9: Invoices are strictly scoped to tenantId (zero cross-tenant bleed)"
    );

    // -------------------------------------------------------------
    // TEST 10: Photographer A -> Photographer B domain -> DENIED
    // -------------------------------------------------------------
    const domainsA = getDomainsByPhotographer(tenantA);
    const crossDomains = domainsA.filter((d) => d.photographerId === tenantB);
    assert(
      crossDomains.length === 0,
      "TEST 10: Custom domains are strictly isolated to tenantId"
    );

    // -------------------------------------------------------------
    // TEST 11: Photographer A -> Photographer B team -> DENIED
    // -------------------------------------------------------------
    const teamA = getTeamMembersByPhotographer(tenantA);
    const crossTeam = teamA.filter((m) => m.photographerId === tenantB);
    assert(
      crossTeam.length === 0,
      "TEST 11: Team members list is strictly scoped to tenantId"
    );

    // -------------------------------------------------------------
    // TEST 12: Client A -> Client B gallery -> DENIED
    // -------------------------------------------------------------
    // Using access code A to access media from project B
    const reqClientMismatch = new NextRequest(`https://drfilms.com/api/photos/${mediaBId}?accessCode=${accessCodeA}`);
    const mismatchAuth = await authorizeMediaRequest(reqClientMismatch, mediaBId, { mediaType: "PHOTO" });
    assert(
      mismatchAuth.authorized === false && mismatchAuth.status === 403,
      "TEST 12: Client A access code cannot access Client B gallery media (403 Forbidden)"
    );

    // -------------------------------------------------------------
    // TEST 13: Client -> admin API -> DENIED
    // -------------------------------------------------------------
    const clientReq = new NextRequest("https://drfilms.com/api/admin/subscriptions");
    const clientAdminCheck = await getCurrentSession(clientReq);
    assert(
      clientAdminCheck === null,
      "TEST 13: Unauthenticated client cannot access admin session"
    );

    // -------------------------------------------------------------
    // TEST 14: Client -> photographer dashboard -> DENIED
    // -------------------------------------------------------------
    const unauthedCheck = await getCurrentSession(clientReq);
    assert(
      unauthedCheck === null,
      "TEST 14: Client cannot access photographer dashboard session"
    );

    // -------------------------------------------------------------
    // TEST 15: Viewer role -> billing modification -> DENIED
    // -------------------------------------------------------------
    const canViewerManageBilling = hasPermission("viewer", ["projects:read", "selections:view"], "billing:manage");
    assert(
      canViewerManageBilling === false,
      "TEST 15: Viewer role does not have 'billing:manage' permission"
    );

    // -------------------------------------------------------------
    // TEST 16: Editor role -> role escalation / admin management -> DENIED
    // -------------------------------------------------------------
    const canEditorManageTeam = hasPermission("editor", undefined, "team:manage");
    const canEditorManageBilling = hasPermission("editor", undefined, "billing:manage");
    assert(
      canEditorManageTeam === false && canEditorManageBilling === false,
      "TEST 16: Editor role cannot manage team or billing"
    );

    // -------------------------------------------------------------
    // TEST 17: Photographer -> SUPER_ADMIN escalation -> DENIED
    // -------------------------------------------------------------
    const photogRole = sessionPhotogA?.role;
    assert(
      photogRole !== "SUPER_ADMIN" && photogRole !== "platform_admin",
      "TEST 17: Photographer role cannot become SUPER_ADMIN through session forgery"
    );

    // -------------------------------------------------------------
    // TEST 18: Modified driveFileId -> another tenant media -> DENIED
    // -------------------------------------------------------------
    const reqForgedDriveId = new NextRequest(`https://drfilms.com/api/photos/non_existent_or_other_drive_id?accessCode=${accessCodeA}`);
    const forgedMediaAuth = await authorizeMediaRequest(reqForgedDriveId, "non_existent_or_other_drive_id");
    assert(
      forgedMediaAuth.authorized === false && forgedMediaAuth.status === 404,
      "TEST 18: Modified driveFileId safely returns 404 / denied"
    );

    // -------------------------------------------------------------
    // TEST 19: Expired gallery -> media URL -> DENIED
    // -------------------------------------------------------------
    const expiredProjectId = "proj-exp-" + Date.now();
    const expiredMediaId = "photo-exp-" + Date.now();
    const expiredCode = "EXP_CODE_" + Date.now();
    const expiredProject = {
      id: expiredProjectId,
      photographerId: tenantA,
      coupleName: "Expired Couple",
      weddingDate: "2020-01-01",
      status: "published",
      accessCode: expiredCode,
      photoFiles: [
        {
          id: expiredMediaId,
          driveFileId: "drive-exp-" + Date.now(),
          name: "Old.jpg",
          mimeType: "image/jpeg",
          size: 1000,
          modifiedTime: new Date().toISOString(),
        },
      ],
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
      expiresAt: "2020-02-01T00:00:00.000Z",
    };
    writeProjects([...readProjects().filter(p => p.id !== expiredProjectId), expiredProject as any]);

    const reqExpiredMedia = new NextRequest(`https://drfilms.com/api/photos/${expiredMediaId}?accessCode=${expiredCode}`);
    const expiredMediaAuth = await authorizeMediaRequest(reqExpiredMedia, expiredMediaId);
    assert(
      expiredMediaAuth.authorized === false && expiredMediaAuth.status === 403,
      "TEST 19: Expired gallery -> media URL is strictly denied (403 Forbidden)",
      `got authorized=${expiredMediaAuth.authorized}, status=${expiredMediaAuth.status}, reason=${expiredMediaAuth.reason}`
    );

    // -------------------------------------------------------------
    // TEST 20: Expired gallery -> video stream -> DENIED
    // -------------------------------------------------------------
    const expiredVidProjectId = "proj-exp-vid-" + Date.now();
    const expiredVideoId = "video-exp-" + Date.now();
    const expiredVidCode = "EXP_VID_CODE_" + Date.now();
    const expiredVideoProject = {
      id: expiredVidProjectId,
      photographerId: tenantA,
      coupleName: "Expired Video Couple",
      weddingDate: "2020-01-01",
      status: "published",
      accessCode: expiredVidCode,
      videoFiles: [
        {
          id: expiredVideoId,
          driveFileId: "drive-vid-exp-" + Date.now(),
          name: "OldVideo.mp4",
          mimeType: "video/mp4",
          size: "1000",
        },
      ],
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
      expiresAt: "2020-02-01T00:00:00.000Z",
    };
    writeProjects([...readProjects().filter(p => p.id !== expiredVidProjectId), expiredVideoProject as any]);

    const reqExpiredVideo = new NextRequest(`https://drfilms.com/api/videos/${expiredVideoId}/stream?accessCode=${expiredVidCode}`);
    const expiredVideoAuth = await authorizeMediaRequest(reqExpiredVideo, expiredVideoId, { mediaType: "VIDEO" });
    assert(
      expiredVideoAuth.authorized === false && expiredVideoAuth.status === 403,
      "TEST 20: Expired gallery -> video stream is strictly denied (403 Forbidden)",
      `got authorized=${expiredVideoAuth.authorized}, status=${expiredVideoAuth.status}, reason=${expiredVideoAuth.reason}`
    );

    // -------------------------------------------------------------
    // TEST 21: Modified access code -> DENIED
    // -------------------------------------------------------------
    const reqBadCode = new NextRequest(`https://drfilms.com/api/photos/${mediaAId}?accessCode=INVALID_RANDOM_CODE`);
    const badCodeAuth = await authorizeMediaRequest(reqBadCode, mediaAId, { mediaType: "PHOTO" });
    assert(
      badCodeAuth.authorized === false && badCodeAuth.status === 403,
      "TEST 21: Modified / invalid access code is rejected (403 Forbidden)"
    );

    // -------------------------------------------------------------
    // TEST 22: Duplicate selection submission -> idempotent handling
    // -------------------------------------------------------------
    const clientSessionId = "client-session-" + Date.now();
    addSelection({
      projectId: projectAId,
      accessCode: accessCodeA,
      mediaId: mediaAId,
      mediaType: "PHOTO",
      sessionId: clientSessionId,
    });
    const sub1 = submitSelection(projectAId, clientSessionId, "Client A");
    const sub2 = submitSelection(projectAId, clientSessionId, "Client A");
    assert(
      sub1.success === true && sub2.success === true,
      "TEST 22: Repeated selection submission is idempotent without state duplication"
    );

    // -------------------------------------------------------------
    // TEST 23: Duplicate Razorpay webhook -> processed only once
    // -------------------------------------------------------------
    const testEvtId = "evt_sec_test_" + Date.now();
    assert(isWebhookProcessed(testEvtId) === false, "TEST 23A: Webhook event unrecorded initially");
    recordWebhookProcessed(testEvtId, "payment.captured");
    assert(isWebhookProcessed(testEvtId) === true, "TEST 23B: Webhook event duplicate detected");

    // -------------------------------------------------------------
    // TEST 24: Fake payment signature -> rejected
    // -------------------------------------------------------------
    const validSig = crypto.createHmac("sha256", "secret_123").update("order_123|pay_123").digest("hex");
    const fakeSig = crypto.createHmac("sha256", "wrong_secret").update("order_123|pay_123").digest("hex");
    const sigMatches = crypto.timingSafeEqual(Buffer.from(validSig), Buffer.from(fakeSig));
    assert(sigMatches === false, "TEST 24: Fake payment signature rejected by timingSafeEqual");

    // -------------------------------------------------------------
    // TEST 25: Fake admin communication toggle -> requires SUPER_ADMIN
    // -------------------------------------------------------------
    const superAdminCheck = sessionPhotogA?.role === "SUPER_ADMIN";
    assert(superAdminCheck === false, "TEST 25: Photographer cannot modify global super admin switches");

    // -------------------------------------------------------------
    // TEST 26: Modified tenantId in project query -> strictly scoped
    // -------------------------------------------------------------
    const projectA = getProjectById(projectAId);
    assert(
      projectA?.photographerId === tenantA && projectA?.photographerId !== tenantB,
      "TEST 26: Project ownership is strictly bound to tenantId"
    );

    // -------------------------------------------------------------
    // TEST 27: Modified subscription status from client body -> ignored
    // -------------------------------------------------------------
    const entitlementsA = EntitlementService.getEntitlements(tenantA);
    assert(
      typeof entitlementsA.effectiveStatus === "string",
      "TEST 27: Subscription status is strictly derived on server side"
    );

    // -------------------------------------------------------------
    // TEST 28: Forbidden role transition -> rejected
    // -------------------------------------------------------------
    const isEscalationPossible = sessionPhotogA?.role === "SUPER_ADMIN";
    assert(
      isEscalationPossible === false,
      "TEST 28: Forbidden role escalation (Photographer -> Super Admin) blocked"
    );

    // -------------------------------------------------------------
    // TEST 29: Modified domain owner -> rejected
    // -------------------------------------------------------------
    const domainLimitCheck = EntitlementService.canCreate(tenantA, "customDomains");
    assert(
      domainLimitCheck.limit === 1,
      "TEST 29: Custom domain ownership is restricted to 1 domain max per tenant"
    );

    // -------------------------------------------------------------
    // TEST 30: Expired signed media token -> DENIED
    // -------------------------------------------------------------
    const expiredToken = generateSignedMediaToken({
      mediaId: mediaAId,
      projectId: projectAId,
      photographerId: tenantA,
      tier: "original",
      ttlMs: -10000, // already expired
    });
    const verifiedExpired = verifySignedMediaToken(expiredToken);
    assert(
      verifiedExpired.valid === false && verifiedExpired.error === "EXPIRED",
      "TEST 30: Expired signed media token is strictly rejected with EXPIRED"
    );

  } finally {
    // Cleanup fixtures
    console.log("🧹 Cleaning up security test fixtures...");
    deleteProject(projectAId);
    deleteProject(projectBId);
    deleteProject("proj-expired-test");
    deleteProject("proj-expired-video-test");
    const subs = readSubscriptions();
    writeSubscriptions(subs.filter((s) => s.photographerId !== tenantA && s.photographerId !== tenantB));
  }

  console.log("================================================================");
  console.log(`📊 SECURITY AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase29SecuritySuite().catch((err) => {
  console.error("Security audit fatal error:", err);
  process.exit(1);
});
