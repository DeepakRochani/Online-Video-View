/**
 * Test Suite: Communication Duplicate Prevention & ID Uniqueness
 * Validates that notification records, retries, and API query responses
 * maintain unique, stable, primitive string IDs without duplication.
 */

import assert from "assert";
import {
  createNotificationRecord,
  getAdminCommunicationRecords,
  readNotifications,
  writeNotifications,
  getNotificationById
} from "../lib/db";
import { retryFailedNotification } from "../lib/notifications";

console.log("\n=======================================================");
console.log("🧪 TEST: COMMUNICATION DUPLICATE PREVENTION & ID INTEGRITY");
console.log("=======================================================\n");

let passed = 0;
let total = 0;

function it(desc: string, fn: () => void | Promise<void>) {
  total++;
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    })
    .catch((err) => {
      console.error(`  ❌ [FAIL] ${desc}`);
      console.error(err);
      throw err;
    });
}

export async function runCommunicationDuplicatePreventionTests() {
  // Save initial state
  const originalNotifications = readNotifications();

  try {
    // 1. Test createNotificationRecord upsert behavior on duplicate ID
    await it("1. createNotificationRecord upserts without creating duplicate rows when same ID is provided", () => {
      const fixedId = `notif-duplicate-test-${Date.now()}`;
      
      const record1 = createNotificationRecord({
        id: fixedId,
        photographerId: "photog-test-dup",
        type: "GALLERY_PUBLISHED",
        channel: "EMAIL",
        status: "FAILED",
        recipient: "client1@example.com",
        subject: "Initial Attempt"
      });

      const record2 = createNotificationRecord({
        id: fixedId,
        photographerId: "photog-test-dup",
        type: "GALLERY_PUBLISHED",
        channel: "EMAIL",
        status: "SENT",
        recipient: "client1@example.com",
        subject: "Updated Attempt"
      });

      const all = readNotifications();
      const matching = all.filter(n => n.id === fixedId);

      assert.strictEqual(matching.length, 1, "There must be exactly 1 record with the given ID in the database");
      assert.strictEqual(matching[0].status, "SENT", "The record should have been updated/upserted");
      assert.strictEqual(matching[0].subject, "Updated Attempt");
    });

    // 2. Test writeNotifications and readNotifications deduplicate defensively
    await it("2. writeNotifications and readNotifications safely deduplicate any duplicate records by ID", () => {
      const testId = `notif-defensive-dedup-${Date.now()}`;
      const duplicateArray: any[] = [
        {
          id: testId,
          photographerId: "photog-1",
          type: "GALLERY_PUBLISHED",
          channel: "EMAIL",
          status: "FAILED",
          recipient: "user@example.com",
          createdAt: new Date(Date.now() - 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1000).toISOString()
        },
        {
          id: testId,
          photographerId: "photog-1",
          type: "GALLERY_PUBLISHED",
          channel: "EMAIL",
          status: "SENT",
          recipient: "user@example.com",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      writeNotifications(duplicateArray);
      const readBack = readNotifications();

      assert.strictEqual(readBack.length, 1, "Deduplication must keep only 1 record");
      assert.strictEqual(readBack[0].id, testId);
      assert.strictEqual(readBack[0].status, "SENT", "Deduplication preserves latest entry");
    });

    // 3. Test 10 distinct notifications with various channels and statuses
    await it("3. 10 distinct notifications render with 10 distinct unique IDs", () => {
      const createdIds: string[] = [];
      const channels = ["EMAIL", "WHATSAPP", "SMS", "PUSH", "IN_APP"] as const;
      const statuses = ["SENT", "FAILED", "BLOCKED_BY_PLATFORM_SETTING", "SKIPPED_BY_PREFERENCE", "PENDING"] as const;

      for (let i = 0; i < 10; i++) {
        const record = createNotificationRecord({
          photographerId: `photog-multi-${i}`,
          type: "GALLERY_PUBLISHED",
          channel: channels[i % channels.length],
          status: statuses[i % statuses.length],
          recipient: `client${i}@example.com`,
          subject: `Test Dispatch #${i}`
        });
        createdIds.push(record.id);
      }

      const { records, total } = getAdminCommunicationRecords({ limit: 100 });
      const recordIds = records.map(r => r.id);
      const uniqueRecordIds = new Set(recordIds);

      assert.strictEqual(recordIds.length, uniqueRecordIds.size, "All returned record IDs must be strictly unique");
      for (const id of createdIds) {
        assert.ok(uniqueRecordIds.has(id), `Record ID ${id} must be present`);
      }
    });

    // 4. Test retry updating existing notification rather than creating duplicate row
    await it("4. retry updates existing notification record in place and does not create duplicate IDs", async () => {
      const retryNotifId = `notif-retry-scenario-${Date.now()}`;
      
      createNotificationRecord({
        id: retryNotifId,
        photographerId: "photog-retry-test",
        type: "GALLERY_PUBLISHED",
        channel: "EMAIL",
        status: "FAILED",
        recipient: "retryclient@example.com",
        subject: "Gallery Ready",
        retryCount: 0
      });

      // Execute retry
      await retryFailedNotification(retryNotifId, "admin");

      const all = readNotifications();
      const matching = all.filter(n => n.id === retryNotifId);

      assert.strictEqual(matching.length, 1, "Retry must preserve single row in database");
      assert.strictEqual(matching[0].id, retryNotifId);
      assert.strictEqual(matching[0].retryCount, 1, "Retry count should be incremented");
    });

    // 5. Test stable sorting and pagination uniqueness across boundaries
    await it("5. getAdminCommunicationRecords maintains stable secondary sort preventing duplicate rows across pages", () => {
      const page1 = getAdminCommunicationRecords({ limit: 5, offset: 0 });
      const page2 = getAdminCommunicationRecords({ limit: 5, offset: 5 });

      const page1Ids = new Set(page1.records.map(r => r.id));
      for (const r of page2.records) {
        assert.ok(!page1Ids.has(r.id), `Record ${r.id} on page 2 must not overlap with page 1`);
      }
    });

  } finally {
    // Restore original notifications
    writeNotifications(originalNotifications);
  }

  console.log(`\n=======================================================`);
  console.log(`Duplicate Prevention Test Summary: ${passed}/${total} assertions passed`);
  console.log(`=======================================================\n`);
}

// Auto-execute if run directly
if (process.argv[1]?.includes("test_communication_duplicate_prevention")) {
  runCommunicationDuplicatePreventionTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
