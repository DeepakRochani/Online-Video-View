import {
  readPlatformCommunicationSettings,
  updatePlatformCommunicationSettings,
  getAdminCommunicationRecords,
  getAdminCommunicationAnalytics,
  maskSensitiveRecipient,
  createNotificationRecord,
  readNotifications,
  writeNotifications,
} from "../lib/db";
import { canSendCommunication } from "../lib/communication-gate";
import { dispatchSaasNotification, retryFailedNotification } from "../lib/notifications";

export async function runPhase20Tests() {
  console.log("\n===============================================================================");
  console.log("🚀 STARTING SUITE: PHASE 20 - SUPER ADMIN COMMUNICATION CENTER & MONITORING");
  console.log("===============================================================================\n");

  const originalNotifications = readNotifications();
  const originalSettings = readPlatformCommunicationSettings();

  try {
    // -------------------------------------------------------------------------
    // TEST 1: PII Masking Engine
    // -------------------------------------------------------------------------
    console.log("▶ TEST 1: PII Recipient Masking Engine");
    const maskedEmail1 = maskSensitiveRecipient("alexander@example.com");
    console.log("  Masked Email (alexander@example.com):", maskedEmail1);
    if (!maskedEmail1.startsWith("a***r@example.com")) {
      throw new Error(`Email masking failed: expected a***r@example.com, got ${maskedEmail1}`);
    }

    const maskedEmail2 = maskSensitiveRecipient("me@domain.com");
    console.log("  Masked Email (me@domain.com):", maskedEmail2);
    if (!maskedEmail2.startsWith("m*@domain.com") && !maskedEmail2.startsWith("m***e@domain.com")) {
      throw new Error(`Short email masking failed: got ${maskedEmail2}`);
    }

    const maskedPhone1 = maskSensitiveRecipient("+91 9876543210");
    console.log("  Masked Phone (+91 9876543210):", maskedPhone1);
    if (!maskedPhone1.includes("3210") || !maskedPhone1.includes("******")) {
      throw new Error(`Phone masking failed: got ${maskedPhone1}`);
    }

    const maskedPhone2 = maskSensitiveRecipient("9876543210");
    console.log("  Masked Phone (9876543210):", maskedPhone2);
    if (!maskedPhone2.endsWith("3210") || !maskedPhone2.includes("******")) {
      throw new Error(`Plain phone masking failed: got ${maskedPhone2}`);
    }
    console.log("  ✓ Test 1 Passed: PII recipient masking is accurate and safe.\n");

    // -------------------------------------------------------------------------
    // TEST 2: Communication Records Log Query & Filtering
    // -------------------------------------------------------------------------
    console.log("▶ TEST 2: Communication Records Log Query & Filtering");

    // Seed temporary diverse records
    const testRecords = [
      {
        id: "test_notif_p20_1",
        photographerId: "photo_p20_1",
        projectId: "proj_p20_1",
        type: "GALLERY_PUBLISHED" as const,
        channel: "EMAIL" as const,
        status: "SENT" as const,
        recipient: "client1@example.com",
        recipientEmail: "client1@example.com",
        subject: "Your Gallery is Ready!",
        content: "View your photos now",
        provider: "SMTP",
        providerMessageId: "msg_p20_1",
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "test_notif_p20_2",
        photographerId: "photo_p20_2",
        projectId: "proj_p20_2",
        type: "SELECTION_SUBMITTED" as const,
        channel: "WHATSAPP" as const,
        status: "DELIVERED" as const,
        recipient: "+919876543210",
        recipientPhone: "+919876543210",
        subject: "Selection Confirmed",
        content: "Selections received",
        provider: "META_CLOUD_API",
        providerMessageId: "msg_p20_2",
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "test_notif_p20_3",
        photographerId: "photo_p20_3",
        projectId: "proj_p20_3",
        type: "WELCOME" as const,
        channel: "EMAIL" as const,
        status: "BLOCKED_BY_PLATFORM_SETTING" as const,
        recipient: "client2@example.com",
        recipientEmail: "client2@example.com",
        subject: "50% Discount on Album Prints",
        content: "Discount promo",
        provider: "NONE",
        errorMessage: "Blocked by Super Admin platform communication setting",
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "test_notif_p20_4",
        photographerId: "photo_p20_4",
        projectId: "proj_p20_4",
        type: "SELECTION_UPDATED" as const,
        channel: "SMS" as const,
        status: "FAILED" as const,
        recipient: "+14155552671",
        recipientPhone: "+14155552671",
        subject: "SMS Confirmation",
        content: "Confirmation code",
        provider: "TWILIO",
        errorMessage: "Invalid recipient address/number: phone unallocated",
        retryCount: 2,
        maxRetries: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    writeNotifications([...originalNotifications, ...testRecords]);

    // Test query all
    const resAll = getAdminCommunicationRecords({ limit: 100 });
    if (resAll.total < 4) {
      throw new Error(`Expected at least 4 records, got ${resAll.total}`);
    }

    // Test channel filter
    const resWhatsApp = getAdminCommunicationRecords({ channel: "WHATSAPP" });
    const waFound = resWhatsApp.records.some((r) => r.id === "test_notif_p20_2");
    if (!waFound) {
      throw new Error("Channel filter WHATSAPP did not find test_notif_p20_2");
    }

    // Test status filter
    const resBlocked = getAdminCommunicationRecords({ status: "BLOCKED" });
    const blockedFound = resBlocked.records.some((r) => r.id === "test_notif_p20_3");
    if (!blockedFound) {
      throw new Error("Status filter BLOCKED did not find test_notif_p20_3");
    }

    // Test search query
    const resSearch = getAdminCommunicationRecords({ search: "Discount promo" });
    if (resSearch.records.length === 0 || resSearch.records[0].id !== "test_notif_p20_3") {
      throw new Error("Search query failed to match record content/subject");
    }

    console.log("  ✓ Test 2 Passed: Communication log querying, search, and filters are working perfectly.\n");

    // -------------------------------------------------------------------------
    // TEST 3: Live Computed Analytics Engine
    // -------------------------------------------------------------------------
    console.log("▶ TEST 3: Live Computed Analytics Engine");
    const analytics = getAdminCommunicationAnalytics("all");
    console.log("  Analytics Summary:", {
      totalAttempts: analytics.totalAttempts,
      successful: analytics.successful,
      failed: analytics.failed,
      blocked: analytics.blocked,
      successRate: analytics.successRate,
      topFailureReasons: analytics.topFailureReasons,
    });

    if (analytics.totalAttempts < 4) {
      throw new Error(`Analytics total attempts expected >= 4, got ${analytics.totalAttempts}`);
    }
    if (analytics.successful < 2) {
      throw new Error(`Analytics successful expected >= 2, got ${analytics.successful}`);
    }
    if (analytics.failed < 1) {
      throw new Error(`Analytics failed expected >= 1, got ${analytics.failed}`);
    }
    if (analytics.blocked < 1) {
      throw new Error(`Analytics blocked expected >= 1, got ${analytics.blocked}`);
    }

    // Check rate sanity
    if (analytics.successRate === null || analytics.successRate < 0 || analytics.successRate > 100) {
      throw new Error(`Invalid success rate computed: ${analytics.successRate}`);
    }

    console.log("  ✓ Test 3 Passed: Analytics engine correctly aggregates volume, rates, and failure categories.\n");

    // -------------------------------------------------------------------------
    // TEST 4: Emergency Shutdown Mode & Audit
    // -------------------------------------------------------------------------
    console.log("▶ TEST 4: Emergency Shutdown Mode & Policy Enforcement");

    // Activate Emergency Shutdown
    const shutdownSettings = updatePlatformCommunicationSettings(
      {
        globalEnabled: false,
        emergencyKillSwitch: true,
        emailEnabled: false,
        whatsappEnabled: false,
        smsEnabled: false,
        pushEnabled: false,
        inAppEnabled: false,
        maintenanceNote: "EMERGENCY OUTAGE TEST",
      },
      "super-admin-id",
      "superadmin@drfilms.com"
    );

    if (shutdownSettings.globalEnabled !== false || !shutdownSettings.emergencyKillSwitch) {
      throw new Error("Emergency shutdown settings did not apply properly");
    }

    // Standard notification must be BLOCKED
    const standardGate = canSendCommunication({
      channel: "EMAIL",
      eventType: "GALLERY_PUBLISHED",
      audience: "CLIENT",
    });
    if (standardGate.allowed) {
      throw new Error("Standard email should be BLOCKED during emergency shutdown");
    }
    console.log("  Standard Event Status:", standardGate.allowed ? "ALLOWED" : "BLOCKED (Expected)");

    // Security notification must also be BLOCKED under full emergency shutdown (Phase 27)
    const securityGate = canSendCommunication({
      channel: "EMAIL",
      eventType: "PASSWORD_RESET",
      audience: "PHOTOGRAPHER",
    });
    if (securityGate.allowed) {
      throw new Error("PASSWORD_RESET must be BLOCKED during full emergency master shutdown");
    }
    console.log("  Security Event (Password Reset) Status:", securityGate.allowed ? "ALLOWED" : "BLOCKED (Expected)");

    console.log("  ✓ Test 4 Passed: Emergency shutdown blocks all outbound dispatches globally.\n");

    // -------------------------------------------------------------------------
    // TEST 5: Retry Policy Re-evaluation During Outage
    // -------------------------------------------------------------------------
    console.log("▶ TEST 5: Retry Queue Platform Policy Re-evaluation");

    // Queue a failed notification
    const failedRecord = createNotificationRecord({
      photographerId: "photo_test_retry",
      type: "SELECTION_UPDATED",
      channel: "EMAIL",
      status: "FAILED",
      recipientEmail: "client_retry@example.com",
      subject: "Selection Confirmed",
      content: "Thank you for submitting",
      isTransientError: true,
      retryCount: 0,
      maxRetries: 3,
      errorMessage: "Initial network drop",
    });

    // Attempt retry while platform is in emergency shutdown
    const retryResult = await retryFailedNotification(failedRecord.id);
    if (retryResult.status !== "BLOCKED_BY_PLATFORM_SETTING") {
      throw new Error(`Expected retry to be BLOCKED_BY_PLATFORM_SETTING, got ${retryResult.status}`);
    }
    console.log("  Retry during shutdown result status:", retryResult.status);

    console.log("  ✓ Test 5 Passed: Retry handler dynamically evaluates active platform policy before firing.\n");

  } finally {
    // Restore original state
    writeNotifications(originalNotifications);
    updatePlatformCommunicationSettings(
      originalSettings,
      "super-admin-cleanup",
      "admin@drfilms.com"
    );
  }

  console.log("===============================================================================");
  console.log("✅ ALL PHASE 20 SUPER ADMIN COMMUNICATION CONTROL TESTS PASSED SUCCESSFULLY");
  console.log("===============================================================================\n");
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes("test_phase20_super_admin_communication_center")) {
  runPhase20Tests().catch((err) => {
    console.error("❌ Phase 20 test execution failed:", err);
    process.exit(1);
  });
}
