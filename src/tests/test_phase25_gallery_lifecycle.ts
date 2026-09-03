import assert from "assert";
import {
  WeddingProject,
  isProjectExpired,
  isExpiringSoon,
  getRemainingDays,
  PlatformGalleryLifecycleSettings,
} from "../lib/project-types";
import {
  transitionGalleryStatus,
  processGalleryExpirations,
  processGalleryExpirationReminders,
} from "../lib/gallery-lifecycle";
import {
  readProjects,
  writeProjects,
  getProjectById,
  deleteProject,
  restoreDeletedProject,
  readPlatformGalleryLifecycleSettings,
  updatePlatformGalleryLifecycleSettings,
} from "../lib/db";
import { calculateTenantUsage } from "../lib/plan-limits";
import { canCreate } from "../lib/entitlements";
import { renderGalleryExpiringSoonEmail, renderGalleryExpiredEmail } from "../lib/email/templates";

async function runPhase25Tests() {
  console.log("\n=======================================================");
  console.log("  PHASE 25: GALLERY LIFECYCLE, EXPIRY & ARCHIVAL TESTS ");
  console.log("=======================================================\n");

  // Save original projects & settings for clean teardown
  const originalProjects = readProjects();
  const originalSettings = readPlatformGalleryLifecycleSettings();

  const testOwnerEmail = `lifecycle-test-${Date.now()}@example.com`;
  const testAccessCode = `LFC${Math.floor(1000 + Math.random() * 9000)}`;
  const testProjectId = `test-lifecycle-proj-${Date.now()}`;

  try {
    // ----------------------------------------------------
    // TEST 1: Pure Functions & Lifecycle Helpers
    // ----------------------------------------------------
    console.log("--> Test 1: Testing Pure Lifecycle Helpers...");
    const now = new Date();
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const futureDateFar = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const futureDateSoon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const mockLiveProject = {
      id: "mock-1",
      photographerId: "photographer_1",
      driveFolderId: "folder_1",
      driveFolderUrl: "https://drive.google.com/drive/folders/folder_1",
      coupleName: "Alice & Bob",
      weddingDate: "2026-06-01",
      accessCode: "ALICE1",
      packageType: "Full",
      status: "published" as const,
      isActive: true,
      expiresAt: futureDateFar,
      theme: "cinematic" as const,
      template: "classic" as const,
      settings: {
        isPasswordProtected: false,
        allowDownloads: true,
        allowPhotoDownload: true,
        allowVideoDownload: true,
        allowFullscreen: true,
        showBranding: true,
        whiteLabelEnabled: true,
        template: "classic" as const,
        heroStyle: "large" as const,
        gridStyle: "masonry" as const,
        fontFamily: "serif-elegant",
        primaryAccent: "#D4AF37",
        secondaryAccent: "#E5C158",
        textColor: "#F8FAFC",
        backgroundColor: "#0B0C10",
      },
      branding: {
        businessName: "DR Films",
        studioName: "DR Films",
        tagline: "Fine Art Wedding Cinema",
        subtitle: "Wedding Cinema & Photography",
      },
      videoFiles: [],
      photoFiles: [],
      mediaFiles: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as WeddingProject;

    assert.strictEqual(isProjectExpired(mockLiveProject), false, "Live project far from expiry should not be expired");
    assert.strictEqual(isExpiringSoon(mockLiveProject, 7), false, "60-day project should not be expiring soon");
    assert(getRemainingDays(mockLiveProject)! > 50, "Remaining days should be > 50");

    const mockExpiringProject: WeddingProject = {
      ...mockLiveProject,
      expiresAt: futureDateSoon,
    };
    assert.strictEqual(isProjectExpired(mockExpiringProject), false, "Expiring soon project is not yet expired");
    assert.strictEqual(isExpiringSoon(mockExpiringProject, 7), true, "3-day project should be expiring soon");
    assert.strictEqual(getRemainingDays(mockExpiringProject), 3, "Remaining days should be 3");

    const mockPastProject: WeddingProject = {
      ...mockLiveProject,
      expiresAt: pastDate,
    };
    assert.strictEqual(isProjectExpired(mockPastProject), true, "Past date project is expired");
    assert.strictEqual(getRemainingDays(mockPastProject), 0, "Past date project remaining days is 0");

    const mockArchivedProject: WeddingProject = {
      ...mockLiveProject,
      status: "archived",
      isActive: false,
    };
    assert.strictEqual(isProjectExpired(mockArchivedProject), true, "Archived project is considered expired/inaccessible");

    const mockSoftDeletedProject: WeddingProject = {
      ...mockLiveProject,
      deletedAt: pastDate,
    };
    assert.strictEqual(isProjectExpired(mockSoftDeletedProject), true, "Deleted project is considered expired/inaccessible");
    console.log("✓ Pure Lifecycle Helpers passed.\n");

    // ----------------------------------------------------
    // TEST 2: Centralized State Machine Transitions
    // ----------------------------------------------------
    console.log("--> Test 2: Testing Centralized Lifecycle Transitions...");
    const testProject = {
      ...mockLiveProject,
      id: testProjectId,
      photographerId: testOwnerEmail,
      coupleName: "Test Couple Lifecycle",
      weddingDate: "2026-09-01",
      accessCode: testAccessCode,
      packageType: "Cinema",
      status: "draft" as const,
      isActive: false,
      videoFiles: [],
      photoFiles: [],
      mediaFiles: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as WeddingProject;

    writeProjects([testProject, ...originalProjects]);

    // 2.1 Publish
    const publishedResult = await transitionGalleryStatus(testProjectId, "publish", {
      actorEmail: testOwnerEmail,
      actorRole: "owner",
    });
    assert(publishedResult.project !== undefined);
    assert.strictEqual(publishedResult.project!.status, "published");
    assert.strictEqual(publishedResult.project!.isActive, true);
    assert(publishedResult.project!.publishedAt !== undefined, "publishedAt must be set");
    assert(publishedResult.project!.expiresAt !== undefined, "expiresAt must be computed");

    // 2.2 Extend Expiration
    const customExpiry = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString();
    const extendResult = await transitionGalleryStatus(testProjectId, "extend-expiration", {
      expiresAt: customExpiry,
      actorEmail: testOwnerEmail,
      actorRole: "owner",
    });
    assert(extendResult.project !== undefined);
    assert.strictEqual(extendResult.project!.expiresAt, customExpiry);

    // 2.3 Archive
    const archiveResult = await transitionGalleryStatus(testProjectId, "archive", {
      actorEmail: testOwnerEmail,
      actorRole: "owner",
    });
    assert(archiveResult.project !== undefined);
    assert.strictEqual(archiveResult.project!.status, "archived");
    assert.strictEqual(archiveResult.project!.isActive, false);
    assert(archiveResult.project!.archivedAt !== undefined, "archivedAt must be set");

    // 2.4 Restore Archive
    const restoreArchiveResult = await transitionGalleryStatus(testProjectId, "restore-archive", {
      actorEmail: testOwnerEmail,
      actorRole: "owner",
    });
    assert(restoreArchiveResult.project !== undefined);
    assert.strictEqual(restoreArchiveResult.project!.status, "published");
    assert.strictEqual(restoreArchiveResult.project!.isActive, true);
    assert.strictEqual(restoreArchiveResult.project!.archivedAt, undefined);

    // 2.5 Soft Delete
    const deleteResult = await transitionGalleryStatus(testProjectId, "delete", {
      actorEmail: testOwnerEmail,
      actorRole: "owner",
    });
    assert(deleteResult.project !== undefined);
    assert.strictEqual(deleteResult.project!.isActive, false);
    assert(deleteResult.project!.deletedAt !== undefined, "deletedAt must be set");
    assert.strictEqual(deleteResult.project!.deletedBy, testOwnerEmail);

    // 2.6 Restore Delete
    const restoreDeleteResult = await transitionGalleryStatus(testProjectId, "restore-delete", {
      actorEmail: testOwnerEmail,
      actorRole: "owner",
    });
    assert(restoreDeleteResult.project !== undefined);
    assert.strictEqual(restoreDeleteResult.project!.deletedAt, undefined);
    assert.strictEqual(restoreDeleteResult.project!.deletedBy, undefined);
    assert.strictEqual(restoreDeleteResult.project!.isActive, true);
    console.log("✓ Centralized Lifecycle Transitions passed.\n");

    // ----------------------------------------------------
    // TEST 3: Automated Cron Expirations & Reminders
    // ----------------------------------------------------
    console.log("--> Test 3: Testing Automated Cron Processing...");
    // Manually backdate the project expiresAt to 2 days ago
    const expiredPastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const updatedProjects = readProjects().map((p) =>
      p.id === testProjectId
        ? { ...p, status: "published" as const, isActive: true, expiresAt: expiredPastDate }
        : p
    );
    writeProjects(updatedProjects);

    // Run cron expiration processor
    const cronResult = await processGalleryExpirations();
    assert(cronResult.expiredCount >= 1, "Cron should have processed at least 1 expired gallery");

    const refreshedProj = getProjectById(testProjectId);
    assert(refreshedProj !== null);
    assert.strictEqual(refreshedProj?.status, "expired");
    assert.strictEqual(refreshedProj?.isActive, false);

    // Test Idempotency: Running it a second time should process 0 new expirations for this project
    const rerunResult = await processGalleryExpirations();
    assert.strictEqual(rerunResult.expiredCount, 0, "No new expirations on rerun");
    assert.strictEqual(rerunResult.success, true);

    // 3.2 Restore Expired
    const restoreExpiredResult = await transitionGalleryStatus(testProjectId, "restore-expired", {
      extensionDays: 60,
      actorEmail: testOwnerEmail,
      actorRole: "owner",
    });
    assert(restoreExpiredResult.project !== undefined);
    assert.strictEqual(restoreExpiredResult.project!.status, "published");
    assert.strictEqual(restoreExpiredResult.project!.isActive, true);
    assert(new Date(restoreExpiredResult.project!.expiresAt!).getTime() > Date.now());

    // 3.3 Reminder Notifications Process
    const reminderResult = await processGalleryExpirationReminders();
    assert.strictEqual(reminderResult.success, true);
    console.log("✓ Automated Cron Processing & Idempotency passed.\n");

    // ----------------------------------------------------
    // TEST 4: Email Template Rendering
    // ----------------------------------------------------
    console.log("--> Test 4: Testing Lifecycle Email Templates...");
    const expiringEmail = renderGalleryExpiringSoonEmail({
      coupleName: "David & Sarah",
      daysRemaining: 7,
      expiresAt: "2026-10-15T00:00:00.000Z",
      galleryUrl: "https://drfilms.in/gallery/DS2026",
      branding: {
        studioName: "DR Films Wedding Cinema",
        accentColor: "#D4AF37",
      },
    });
    assert(expiringEmail.html.includes("7 days"), "Email should contain remaining days");
    assert(expiringEmail.subject.includes("7 days"), "Subject should contain remaining days");

    const expiredEmail = renderGalleryExpiredEmail({
      coupleName: "David & Sarah",
      galleryUrl: "https://drfilms.in/gallery/DS2026",
      branding: {
        studioName: "DR Films Wedding Cinema",
        accentColor: "#D4AF37",
        email: "studio@drfilms.in",
      },
    });
    assert(expiredEmail.html.includes("concluded"), "Email should reflect concluded access");
    assert(expiredEmail.subject.includes("concluded"), "Subject should indicate access concluded");
    console.log("✓ Lifecycle Email Templates passed.\n");

    // ----------------------------------------------------
    // TEST 5: Entitlements & Plan Limits Isolation
    // ----------------------------------------------------
    console.log("--> Test 5: Testing Entitlements Quotas with Lifecycle States...");
    const testTenantEmail = `entitlement-test-${Date.now()}@example.com`;
    const proj1 = {
      ...mockLiveProject,
      id: `p1-${Date.now()}`,
      photographerId: testTenantEmail,
      coupleName: "Couple 1",
      weddingDate: "2026-01-01",
      accessCode: `P1_${Date.now()}`,
      packageType: "Cinema",
      status: "published" as const,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as WeddingProject;
    const projArchived = {
      ...mockLiveProject,
      id: `p2-${Date.now()}`,
      photographerId: testTenantEmail,
      coupleName: "Couple 2",
      weddingDate: "2026-01-01",
      accessCode: `P2_${Date.now()}`,
      packageType: "Cinema",
      status: "archived" as const,
      isActive: false,
      archivedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as WeddingProject;
    const projDeleted = {
      ...mockLiveProject,
      id: `p3-${Date.now()}`,
      photographerId: testTenantEmail,
      coupleName: "Couple 3",
      weddingDate: "2026-01-01",
      accessCode: `P3_${Date.now()}`,
      packageType: "Cinema",
      status: "published" as const,
      isActive: false,
      deletedAt: new Date().toISOString(),
      deletedBy: testTenantEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as WeddingProject;

    writeProjects([...readProjects(), proj1, projArchived, projDeleted]);

    const usage = calculateTenantUsage(testTenantEmail);
    assert.strictEqual(
      usage.projectsCount,
      1,
      "Only the 1 published active project should count towards active project limit, archived & deleted must be excluded"
    );
    console.log("✓ Entitlements & Plan Limits Isolation passed.\n");

    // ----------------------------------------------------
    // TEST 6: Platform Lifecycle Settings CRUD
    // ----------------------------------------------------
    console.log("--> Test 6: Testing Super Admin Lifecycle Settings CRUD...");
    const updatedSettings = updatePlatformGalleryLifecycleSettings({
      defaultLifespanDays: 120,
      warningThresholdDays: 10,
    });
    assert.strictEqual(updatedSettings.defaultLifespanDays, 120);
    assert.strictEqual(updatedSettings.warningThresholdDays, 10);

    const reloadedSettings = readPlatformGalleryLifecycleSettings();
    assert.strictEqual(reloadedSettings.defaultLifespanDays, 120);
    assert.strictEqual(reloadedSettings.warningThresholdDays, 10);
    console.log("✓ Super Admin Lifecycle Settings CRUD passed.\n");

    console.log("=======================================================");
    console.log("  ALL PHASE 25 LIFECYCLE TESTS PASSED SUCCESSFULLY!    ");
    console.log("=======================================================\n");
  } finally {
    // Restore original state
    writeProjects(originalProjects);
    updatePlatformGalleryLifecycleSettings(originalSettings);
  }
}

runPhase25Tests().catch((err) => {
  console.error("Phase 25 Test Failure:", err);
  process.exit(1);
});
