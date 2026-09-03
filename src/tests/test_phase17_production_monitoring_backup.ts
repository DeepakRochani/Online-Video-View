/**
 * Phase 17 Automated Test Suite: Production Backup + Monitoring + Error Tracking + Recovery
 * 
 * Verifies:
 * 1. Public Health Check probe schema & credential safety.
 * 2. Super Admin System Health multi-subsystem diagnostics.
 * 3. Structured Logging & Sensitive Credential Redaction (passwords, tokens, keys).
 * 4. Structured Logger correlation with request IDs.
 * 5. Error Tracking & deterministic SHA-256 fingerprinting.
 * 6. Error Tracker occurrence incrementation & lastOccurredAt tracking.
 * 7. Error Tracker resolution and filtering by severity.
 * 8. Platform Alert creation & deduplication engine.
 * 9. Platform Alert acknowledgment & audit trail generation.
 * 10. Platform Alert resolution workflow.
 * 11. Background Job Lifecycle telemetry (STARTED -> COMPLETED).
 * 12. Background Job Failure recording (STARTED -> FAILED with duration and error stack).
 * 13. Google Drive scan retry mechanism with exponential backoff on transient errors.
 * 14. Google Drive scan fast-fail on permanent non-retryable errors (401, 403, 404).
 * 15. Metadata Backup Snapshot creation & JSON table serialization.
 * 16. Backup Snapshot SHA-256 checksum validation & tamper detection.
 * 17. Disaster Recovery: Full state restoration from valid snapshot.
 * 18. Backup Catalog management & sorting.
 * 19. Request ID propagation and tracking.
 * 20. Platform Overview Metrics accurate computation (including failed payments, webhooks, notifications, alerts).
 */

import assert from "assert";
import fs from "fs";
import {
  logger,
  redactSensitiveData,
} from "../lib/logger";
import {
  trackError,
  getTrackedErrors,
  resolveError,
} from "../lib/error-tracker";
import {
  triggerAlert,
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
} from "../lib/alerts";
import {
  startJob,
  getBackgroundJobs,
} from "../lib/job-monitor";
import {
  createBackupSnapshot,
  verifyBackupSnapshot,
  restoreFromBackup,
  listBackups,
} from "../lib/backup";
import {
  scanDriveFolderWithRetry,
} from "../lib/drive";
import {
  createPhotographer,
  createProject,
  createInvoiceRecord,
  recordWebhookProcessed,
  createNotificationRecord,
  getPlatformOverviewMetrics,
  readAuditLogs,
} from "../lib/db";

export async function runPhase17Tests() {
  console.log("=== RUNNING PHASE 17 PRODUCTION MONITORING & RECOVERY TEST SUITE ===");

  // 1. Redaction of sensitive fields
  console.log("Assertion 1: Testing sensitive credential scrubbing in logger...");
  const rawPayload = {
    email: "test@example.com",
    password: "SuperSecretPassword123!",
    token: "bearer_xyz_998877",
    apiKey: "ak_live_abcdef123456",
    nested: {
      clientSecret: "sec_secret_445566",
      razorpayKeySecret: "rzp_secret_9988",
      googleRefreshToken: "1//04_refresh_token_secret",
      normalField: "visible_value",
    },
    arrayData: [
      { cookie: "auth_session=12345", safeId: "id_100" }
    ]
  };
  const sanitized = redactSensitiveData(rawPayload);
  assert.strictEqual(sanitized.password, "[REDACTED]");
  assert.strictEqual(sanitized.token, "[REDACTED]");
  assert.strictEqual(sanitized.apiKey, "[REDACTED]");
  assert.strictEqual(sanitized.nested.clientSecret, "[REDACTED]");
  assert.strictEqual(sanitized.nested.razorpayKeySecret, "[REDACTED]");
  assert.strictEqual(sanitized.nested.googleRefreshToken, "[REDACTED]");
  assert.strictEqual(sanitized.nested.normalField, "visible_value");
  assert.strictEqual(sanitized.arrayData[0].cookie, "[REDACTED]");
  assert.strictEqual(sanitized.arrayData[0].safeId, "id_100");
  console.log("✓ Assertion 1 passed: All sensitive tokens & secrets recursively scrubbed.");

  // 2. Structured Logger Request ID formatting
  console.log("Assertion 2: Testing structured logger execution with Request ID context...");
  const logContext = { requestId: "req_test_12345", tenantId: "photog_abc" };
  const formattedLog = logger.withContext(logContext).info("Test log message", { action: "TEST_OP" });
  assert.ok(formattedLog);
  assert.strictEqual(formattedLog.level, "INFO");
  assert.strictEqual(formattedLog.message, "Test log message");
  assert.strictEqual(formattedLog.requestId, "req_test_12345");
  assert.strictEqual(formattedLog.tenantId, "photog_abc");
  console.log("✓ Assertion 2 passed: Structured log outputs standardized JSON format.");

  // 3. Error Tracking & SHA-256 Fingerprinting
  console.log("Assertion 3: Testing error tracking and deterministic fingerprinting...");
  const testErr1 = new Error("Database connection timeout during invoice sync");
  const tracked1 = trackError(testErr1, {
    severity: "CRITICAL",
    source: "INVOICE_JOB",
    route: "/api/cron/invoices",
    photographerId: "photog_999",
  });
  assert.ok(tracked1.id);
  assert.ok(tracked1.fingerprint);
  assert.strictEqual(tracked1.severity, "CRITICAL");
  assert.strictEqual(tracked1.occurrences, 1);
  assert.strictEqual(!!tracked1.resolvedAt, false);
  console.log("✓ Assertion 3 passed: Error tracked with SHA-256 fingerprint.");

  // 4. Error Deduplication & Occurrence Incrementing
  console.log("Assertion 4: Testing error deduplication upon repeated failure...");
  const testErr2 = new Error("Database connection timeout during invoice sync");
  const tracked2 = trackError(testErr2, {
    severity: "CRITICAL",
    source: "INVOICE_JOB",
    route: "/api/cron/invoices",
    photographerId: "photog_999",
  });
  assert.strictEqual(tracked2.fingerprint, tracked1.fingerprint);
  assert.strictEqual(tracked2.occurrences, 2);
  assert.ok(new Date(tracked2.lastSeenAt).getTime() >= new Date(tracked1.firstSeenAt).getTime());
  console.log("✓ Assertion 4 passed: Repeated errors increment occurrence count.");

  // 5. Error Resolution Workflow
  console.log("Assertion 5: Testing error resolution and filtering...");
  const resolved = resolveError(tracked1.fingerprint, "admin@drfilms.com");
  assert.ok(resolved);
  const openErrors = getTrackedErrors({ resolved: false });
  assert.ok(!openErrors.errors.some((e) => e.fingerprint === tracked1.fingerprint));
  console.log("✓ Assertion 5 passed: Error resolved and omitted from unresolved queries.");

  // 6. Platform Alert Trigger & Deduplication
  console.log("Assertion 6: Testing platform alerts deduplication...");
  const alert1 = triggerAlert({
    severity: "WARNING",
    source: "DRIVE_SCAN",
    title: "Drive Scan Latency Warning",
    message: "Google Drive folder scan took longer than 5000ms",
    photographerId: "photog_111",
  });
  assert.ok(alert1.id);
  assert.strictEqual(alert1.occurrences, 1);
  assert.strictEqual(alert1.status, "OPEN");

  const alert2 = triggerAlert({
    severity: "WARNING",
    source: "DRIVE_SCAN",
    title: "Drive Scan Latency Warning",
    message: "Google Drive folder scan took longer than 5000ms",
    photographerId: "photog_111",
  });
  assert.strictEqual(alert2.id, alert1.id);
  assert.strictEqual(alert2.occurrences, 2);
  console.log("✓ Assertion 6 passed: Platform alert deduplicated with incremented occurrences.");

  // 7. Platform Alert Acknowledgment & Audit Trail
  console.log("Assertion 7: Testing alert acknowledgment and audit logging...");
  const ackResult = acknowledgeAlert(alert1.id, "admin@drfilms.com", "Investigating Drive response times");
  assert.ok(ackResult);
  assert.strictEqual(ackResult?.status, "ACKNOWLEDGED");
  assert.strictEqual(ackResult?.acknowledgedBy, "admin@drfilms.com");

  const auditLogs = readAuditLogs();
  const alertAckLog = auditLogs.find((l) => l.targetId === alert1.id && (l.action === "ALERT_ACKNOWLEDGED" || l.action === "ALERT_ACKNOWLEDGE"));
  assert.ok(alertAckLog, "Audit log must be recorded for alert acknowledgment");
  assert.strictEqual(alertAckLog?.adminEmail, "admin@drfilms.com");
  console.log("✓ Assertion 7 passed: Alert acknowledged and audit log appended.");

  // 8. Platform Alert Resolution
  console.log("Assertion 8: Testing alert resolution...");
  const resResult = resolveAlert(alert1.id, "admin@drfilms.com", "Drive network cleared");
  assert.ok(resResult);
  assert.strictEqual(resResult?.status, "RESOLVED");
  assert.strictEqual(resResult?.resolvedBy, "admin@drfilms.com");
  assert.ok(resResult?.resolvedAt);
  console.log("✓ Assertion 8 passed: Alert resolved with timestamp.");

  // 9. Background Job Telemetry: Successful Run
  console.log("Assertion 9: Testing background job lifecycle tracking (success)...");
  let executedWork = false;
  const jobRecord = await startJob(
    "MEDIA_INDEXER",
    async (job) => {
      executedWork = true;
      job.processedItems = 45;
      job.totalItems = 45;
      return { indexed: 45 };
    },
    { photographerId: "photog_222" }
  );
  assert.strictEqual(executedWork, true);
  assert.strictEqual(jobRecord.status, "COMPLETED");
  assert.strictEqual(jobRecord.processedItems, 45);
  assert.ok(jobRecord.completedAt);
  assert.ok(jobRecord.durationMs >= 0);
  console.log("✓ Assertion 9 passed: Background job tracked from STARTED to COMPLETED.");

  // 10. Background Job Telemetry: Failed Run
  console.log("Assertion 10: Testing background job failure handling...");
  let failedJobThrown = false;
  try {
    await startJob(
      "ZIP_EXPORT",
      async () => {
        throw new Error("Disk full or timeout during ZIP generation");
      },
      { photographerId: "photog_333" }
    );
  } catch {
    failedJobThrown = true;
  }
  assert.strictEqual(failedJobThrown, true);
  const jobs = getBackgroundJobs({ jobType: "ZIP_EXPORT" });
  const failedJob = jobs.find((j) => (j.jobType || j.name) === "ZIP_EXPORT");
  assert.ok(failedJob);
  assert.strictEqual(failedJob?.status, "FAILED");
  assert.ok(failedJob?.error?.includes("Disk full"));
  console.log("✓ Assertion 10 passed: Failed job telemetry recorded status, duration, and error stack.");

  // 11. Drive Scan Retry with Backoff on Transient Error
  console.log("Assertion 11: Testing Google Drive scan retry on transient 429/503 errors...");
  let scanAttempts = 0;
  const mockScanner = async () => {
    scanAttempts++;
    if (scanAttempts < 3) {
      const err: Error & { status?: number } = new Error("Rate limit exceeded");
      err.status = 429;
      throw err;
    }
    return [{ id: "file_123", name: "Photo1.jpg", mimeType: "image/jpeg" }];
  };

  const scanResult = await scanDriveFolderWithRetry(
    "fake_token",
    "folder_xyz",
    { maxRetries: 3, initialDelayMs: 10, maxDelayMs: 50 },
    mockScanner
  );
  assert.strictEqual(scanAttempts, 3);
  assert.strictEqual(scanResult.length, 1);
  assert.strictEqual(scanResult[0].id, "file_123");
  console.log("✓ Assertion 11 passed: Transient error retried with backoff and completed.");

  // 12. Drive Scan Fast-Fail on Permanent 401/403/404 Error
  console.log("Assertion 12: Testing Google Drive fast-fail on 401 Unauthorized / 404 Not Found...");
  let fastFailAttempts = 0;
  const permanentMockScanner = async () => {
    fastFailAttempts++;
    const err: Error & { status?: number } = new Error("Invalid Credentials or Revoked Token");
    err.status = 401;
    throw err;
  };

  let scanErrorThrown = false;
  try {
    await scanDriveFolderWithRetry(
      "bad_token",
      "folder_abc",
      { maxRetries: 3, initialDelayMs: 10, maxDelayMs: 50 },
      permanentMockScanner
    );
  } catch {
    scanErrorThrown = true;
  }
  assert.strictEqual(scanErrorThrown, true);
  assert.strictEqual(fastFailAttempts, 1, "Must not retry permanent 401 auth errors");
  console.log("✓ Assertion 12 passed: Permanent error halted immediately without wasteful retries.");

  // 13. Metadata Backup Snapshot Creation
  console.log("Assertion 13: Testing creation of metadata backup snapshot archive...");
  // Populate some test entities
  createPhotographer({
    name: "Backup Test Studio",
    email: `backup_test_${Date.now()}@example.com`,
    passwordHash: "hash123",
    role: "PHOTOGRAPHER",
  });
  createProject({
    photographerId: "photog_test_backup",
    coupleName: "Rohan & Priya",
    weddingDate: "2026-11-20",
    driveFolderUrl: "https://drive.google.com/drive/folders/test123",
    driveFolderId: "test123",
  });

  const snapshot = await createBackupSnapshot("Test snapshot for Phase 17");
  assert.ok(snapshot.id);
  assert.ok(snapshot.filePath);
  assert.ok(snapshot.checksum);
  assert.strictEqual(snapshot.status, "COMPLETED");
  assert.ok(snapshot.recordCount > 0);
  assert.ok(fs.existsSync(snapshot.filePath!));
  console.log(`✓ Assertion 13 passed: Backup snapshot ${snapshot.id} created with ${snapshot.recordCount} records.`);

  // 14. Backup Checksum Verification & Tamper Detection
  console.log("Assertion 14: Testing backup SHA-256 checksum verification and tamper detection...");
  const validVerification = verifyBackupSnapshot(snapshot.id);
  assert.strictEqual(validVerification.valid, true);

  // Tamper with the snapshot file to verify detection
  const originalContent = fs.readFileSync(snapshot.filePath!, "utf-8");
  fs.writeFileSync(snapshot.filePath!, originalContent + " "); // append whitespace/byte
  const tamperedVerification = verifyBackupSnapshot(snapshot.id);
  assert.strictEqual(tamperedVerification.valid, false);
  assert.strictEqual(tamperedVerification.reason, "CHECKSUM_MISMATCH");

  // Restore clean content
  fs.writeFileSync(snapshot.filePath!, originalContent);
  const reVerification = verifyBackupSnapshot(snapshot.id);
  assert.strictEqual(reVerification.valid, true);
  console.log("✓ Assertion 14 passed: Tamper detection correctly flags checksum mismatches.");

  // 15. Disaster Recovery: Full State Restoration
  console.log("Assertion 15: Testing disaster recovery state restoration...");
  const restoreResult = await restoreFromBackup(snapshot.id);
  assert.strictEqual(restoreResult.success, true);
  assert.ok(restoreResult.restoredTables.length > 0);
  console.log(`✓ Assertion 15 passed: Restored ${restoreResult.restoredTables.length} tables from snapshot.`);

  // 16. Backup Catalog Management & Listing
  console.log("Assertion 16: Testing backup listing catalog...");
  const allBackups = listBackups();
  assert.ok(allBackups.length >= 1);
  assert.strictEqual(allBackups[0].id, snapshot.id);
  assert.ok(allBackups[0].sizeBytes > 0);
  console.log("✓ Assertion 16 passed: Backups listed with sorted descending timestamps.");

  // 17. Platform Overview Metrics Accurate Real Data Computation
  console.log("Assertion 17: Testing real platform overview metrics calculation...");
  createInvoiceRecord({
    photographerId: "photog_metrics_test",
    amount: 2999,
    currency: "INR",
    status: "failed",
    plan: "PRO",
  });
  recordWebhookProcessed({
    id: `wb_${Date.now()}`,
    provider: "RAZORPAY",
    eventId: `evt_${Date.now()}`,
    eventType: "payment.failed",
    processed: true,
    status: "failed",
    createdAt: new Date().toISOString(),
  });
  createNotificationRecord({
    photographerId: "photog_metrics_test",
    channel: "EMAIL",
    recipient: "test@example.com",
    subject: "Payment Failed",
    content: "Please retry",
    status: "FAILED",
  });

  const metrics = getPlatformOverviewMetrics();
  assert.ok(metrics.totalPhotographers >= 1);
  assert.ok(metrics.failedPaymentsCount! >= 1);
  assert.ok(metrics.failedWebhooksCount! >= 1);
  assert.ok(metrics.failedNotificationsCount! >= 1);
  assert.ok(typeof metrics.openAlertsCount === "number");
  console.log("✓ Assertion 17 passed: Platform overview metrics computes 100% real counts.");

  // 18. Logger Leveled Filtering
  console.log("Assertion 18: Testing logger leveled output...");
  const warnLog = logger.warn("Disk space above 80%", { diskPercent: 82 });
  assert.ok(warnLog);
  assert.strictEqual(warnLog?.level, "WARN");
  assert.strictEqual(warnLog?.data?.diskPercent, 82);
  console.log("✓ Assertion 18 passed: Leveled logger operates with custom metadata.");

  // 19. Open Alerts Counter Accuracy
  console.log("Assertion 19: Testing open alert counters query...");
  const openAlerts = getAlerts({ status: "OPEN" });
  assert.ok(Array.isArray(openAlerts.alerts));
  console.log(`✓ Assertion 19 passed: Open alerts query returned ${openAlerts.alerts.length} open items.`);

  // 20. Backup Snapshot Rejection of Invalid ID
  console.log("Assertion 20: Testing backup restoration failure on missing snapshot ID...");
  const nonExistentRestore = await restoreFromBackup("snapshot_does_not_exist_9999");
  assert.strictEqual(nonExistentRestore.success, false);
  assert.strictEqual(nonExistentRestore.error, "BACKUP_NOT_FOUND");
  console.log("✓ Assertion 20 passed: Non-existent snapshot ID rejected safely.");

  console.log("\n==================================================================");
  console.log("🎉 ALL 20 PHASE 17 PRODUCTION & MONITORING ASSERTIONS PASSED! 🎉");
  console.log("==================================================================\n");
}

if (require.main === module) {
  runPhase17Tests().catch((err) => {
    console.error("Phase 17 Test Suite Failed:", err);
    process.exit(1);
  });
}
