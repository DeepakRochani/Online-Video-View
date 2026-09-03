/**
 * Test Suite: Super Admin Notifications API Security, Aggregations & Resilience
 * Validates /api/admin/notifications RBAC, metrics calculations, provider health,
 * and empty state handling.
 */

import assert from "assert";
import { NextRequest } from "next/server";
import { GET } from "../app/api/admin/notifications/route";
import { createSessionCookie } from "../lib/auth";
import {
  createNotificationRecord,
  getNotificationMetrics,
  readNotifications,
  writeNotifications,
  savePhotographer
} from "../lib/db";

console.log("\n=======================================================");
console.log("🧪 TEST: SUPER ADMIN NOTIFICATIONS API SECURITY & METRICS");
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

export async function runAdminNotificationsApiTests() {
  const originalNotifications = readNotifications();

  // Create accounts for auth tests
  savePhotographer({
    id: "photog-standard-1",
    email: "photog@studio.com",
    name: "Standard Photog",
    role: "PHOTOGRAPHER",
    status: "ACTIVE",
    tokenVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  savePhotographer({
    id: "client-user-1",
    email: "client@example.com",
    name: "Client User",
    role: "CLIENT" as any,
    status: "ACTIVE",
    tokenVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  savePhotographer({
    id: "super-admin-user",
    email: "admin@drfilms.com",
    name: "Super Admin",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    tokenVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  try {
    // 1. Unauthenticated Request -> 401
    await it("1. Unauthenticated request to /api/admin/notifications returns 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/notifications", {
        method: "GET"
      });
      const res = await GET(req);
      assert.strictEqual(res.status, 401, "Unauthenticated request must return 401");
      const data = await res.json();
      assert.ok(data.error);
    });

    // 2. Photographer Role -> 403
    await it("2. Photographer session returns 403 Forbidden", async () => {
      const photogCookie = await createSessionCookie(
        "photog-standard-1",
        "photog@studio.com",
        "PHOTOGRAPHER",
        1
      );
      const req = new NextRequest("http://localhost:3000/api/admin/notifications", {
        method: "GET",
        headers: {
          cookie: `wvg_session=${photogCookie}`
        }
      });
      const res = await GET(req);
      assert.strictEqual(res.status, 403, "Photographer role must return 403");
      const data = await res.json();
      assert.ok(data.error.includes("Super Admin"));
    });

    // 3. Client Role -> 403
    await it("3. Client session returns 403 Forbidden", async () => {
      const clientCookie = await createSessionCookie(
        "client-user-1",
        "client@example.com",
        "CLIENT",
        1
      );
      const req = new NextRequest("http://localhost:3000/api/admin/notifications", {
        method: "GET",
        headers: {
          cookie: `wvg_session=${clientCookie}`
        }
      });
      const res = await GET(req);
      assert.strictEqual(res.status, 403, "Client role must return 403");
    });

    // 4. Super Admin (SUPER_ADMIN) -> 200 with valid metrics
    await it("4. Super Admin session returns 200 with genuine metrics & providers", async () => {
      const adminCookie = await createSessionCookie(
        "super-admin-user",
        "admin@drfilms.com",
        "SUPER_ADMIN",
        1
      );
      const req = new NextRequest("http://localhost:3000/api/admin/notifications", {
        method: "GET",
        headers: {
          cookie: `wvg_session=${adminCookie}`
        }
      });
      const res = await GET(req);
      assert.strictEqual(res.status, 200, "Super Admin role must return 200");
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.metrics !== undefined);
      assert.ok(data.providers !== undefined);
      assert.ok(data.providers.email !== undefined);
      assert.ok(data.providers.whatsapp !== undefined);
      assert.ok(typeof data.systemTimestamp === "string");
    });

    // 5. Empty State Resilience
    await it("5. getNotificationMetrics handles empty database safely returning 0 counts without error", () => {
      writeNotifications([]);
      const metrics = getNotificationMetrics();
      assert.strictEqual(metrics.total, 0);
      assert.strictEqual(metrics.totalSent, 0);
      assert.strictEqual(metrics.totalDelivered, 0);
      assert.strictEqual(metrics.totalFailed, 0);
      assert.strictEqual(metrics.totalPending, 0);
      assert.strictEqual(metrics.deliveryRate, 100);
      assert.strictEqual(metrics.byChannel.EMAIL, 0);
      assert.strictEqual(metrics.byChannel.WHATSAPP, 0);
      assert.strictEqual(metrics.byChannel.IN_APP, 0);
    });

    // 6. Metrics Calculation Accuracy
    await it("6. getNotificationMetrics correctly computes delivery rate and channel totals", () => {
      createNotificationRecord({
        photographerId: "p1",
        type: "GALLERY_PUBLISHED",
        channel: "EMAIL",
        status: "SENT",
        recipient: "a@example.com"
      });
      createNotificationRecord({
        photographerId: "p1",
        type: "GALLERY_PUBLISHED",
        channel: "EMAIL",
        status: "DELIVERED",
        recipient: "b@example.com"
      });
      createNotificationRecord({
        photographerId: "p1",
        type: "SELECTION_SUBMITTED",
        channel: "WHATSAPP",
        status: "FAILED",
        recipient: "+919876543210"
      });
      createNotificationRecord({
        photographerId: "p1",
        type: "WELCOME",
        channel: "EMAIL",
        status: "PENDING",
        recipient: "c@example.com"
      });

      const metrics = getNotificationMetrics();
      assert.strictEqual(metrics.total, 4);
      assert.strictEqual(metrics.totalSent, 1);
      assert.strictEqual(metrics.totalDelivered, 1);
      assert.strictEqual(metrics.totalFailed, 1);
      assert.strictEqual(metrics.totalPending, 1);
      // Completed = 1 + 1 + 1 = 3. Successful = 2/3 = 67%
      assert.strictEqual(metrics.deliveryRate, 67);
      assert.strictEqual(metrics.byChannel.EMAIL, 3);
      assert.strictEqual(metrics.byChannel.WHATSAPP, 1);
    });

  } finally {
    writeNotifications(originalNotifications);
  }

  console.log(`\n=======================================================`);
  console.log(`Admin Notifications API Test Summary: ${passed}/${total} assertions passed`);
  console.log(`=======================================================\n`);
}

// Auto-execute if run directly
if (process.argv[1]?.includes("test_admin_notifications_api")) {
  runAdminNotificationsApiTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
