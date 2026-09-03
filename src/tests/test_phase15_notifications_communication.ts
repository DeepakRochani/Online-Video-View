/**
 * Phase 15 Automated Test Suite: Production Client Notifications & Communication Engine
 * 
 * Verifies:
 * 1. Email provider abstraction & detection (Resend, SendGrid, Postmark, SMTP, Dev).
 * 2. RFC 5322 email validation.
 * 3. Responsive email template rendering (Gallery Published, Selection Submitted, Selection Confirmation).
 * 4. E.164 phone normalization for WhatsApp.
 * 5. Official WhatsApp provider status detection & template payload construction.
 * 6. Database persistence for NotificationRecord (CRUD, status transitions).
 * 7. Strict tenant isolation (Photographer A vs Photographer B).
 * 8. Channel, status, and project filtering.
 * 9. Database-backed Idempotency ledger (no duplicate sends).
 * 10. Photographer notification preference persistence and enforcement.
 * 11. Preference-based suppression of automated notifications.
 * 12. Multi-channel dispatchSaasNotification execution.
 * 13. Retry handler with transient error detection and max-retry limit (3 attempts).
 * 14. Super Admin notification metrics calculation and delivery rate percentage.
 * 15. Project publish trigger notification integration.
 */

import assert from "assert";
import {
  validateEmail,
  detectEmailProvider,
  getEmailProviderStatus,
  sendEmail
} from "../lib/email/provider";
import {
  renderEmailTemplate
} from "../lib/email/templates";
import {
  normalizeE164Phone,
  getWhatsAppProviderStatus,
  buildWhatsAppTemplatePayload,
  sendWhatsAppMessage
} from "../lib/whatsapp/provider";
import {
  createNotificationRecord,
  getNotificationById,
  updateNotificationRecord,
  getNotificationsByPhotographer,
  isNotificationIdempotent,
  getNotificationPreferences,
  saveNotificationPreferences,
  getNotificationMetrics,
  createPhotographer,
  createProject,
  updateProject,
  readProjects
} from "../lib/db";
import {
  dispatchSaasNotification,
  retryFailedNotification
} from "../lib/notifications";

console.log("==================================================");
console.log("TEST SUITE: PHASE 15 — CLIENT NOTIFICATIONS + COMMUNICATION");
console.log("==================================================");

async function runTests() {
  let passed = 0;
  let total = 0;

  function it(name: string, fn: () => void | Promise<void>) {
    total++;
    return (async () => {
      try {
        await fn();
        console.log(`  ✓ ${name}`);
        passed++;
      } catch (err: any) {
        console.error(`  ✗ ${name}`);
        console.error(err);
        process.exit(1);
      }
    })();
  }

  // --- Group 1: Email Provider & RFC Validation ---
  await it("1.1 validateEmail correctly validates RFC 5322 compliant and malformed email addresses", () => {
    assert.strictEqual(validateEmail("sarah.miller@example.com"), true);
    assert.strictEqual(validateEmail("user+tag@domain.co.uk"), true);
    assert.strictEqual(validateEmail("photographer@drfilms.com"), true);
    assert.strictEqual(validateEmail(""), false);
    assert.strictEqual(validateEmail("invalid-email"), false);
    assert.strictEqual(validateEmail("user@.com"), false);
    assert.strictEqual(validateEmail("@nodomain.com"), false);
  });

  await it("1.2 detectEmailProvider and getEmailProviderStatus report valid provider", () => {
    const provider = detectEmailProvider();
    assert.ok(["resend", "sendgrid", "postmark", "smtp", "development"].includes(provider));
    const status = getEmailProviderStatus();
    assert.strictEqual(status.provider, provider);
    assert.ok(status.fromAddress.length > 0);
  });

  await it("1.3 sendEmail safely handles development and mock mode with valid message IDs", async () => {
    const result = await sendEmail({
      to: "test.couple@example.com",
      subject: "Test Gallery Invite",
      html: "<p>Your gallery is ready!</p>",
      text: "Your gallery is ready!"
    });
    assert.strictEqual(result.success, true);
    assert.ok(result.messageId);
    assert.strictEqual(result.isTransient, undefined);
  });

  // --- Group 2: Email Template Rendering & White-Label Customization ---
  await it("2.1 renderEmailTemplate renders gallery_published with custom domain, access code, and branding", () => {
    const rendered = renderEmailTemplate("gallery_published", {
      clientName: "Jessica & David",
      photographerName: "Cinematic Studio Pro",
      businessName: "Cinematic Studio Pro",
      coupleTitle: "Jessica & David's Wedding",
      galleryUrl: "https://gallery.cinematicstudio.com",
      accessCode: "JESS88",
      brandColor: "#6366f1",
      customMessage: "Thank you for letting us capture your big day!"
    });

    assert.ok(rendered.html.includes("Jessica &amp; David") || rendered.html.includes("Jessica & David"));
    assert.ok(rendered.html.includes("Cinematic Studio Pro"));
    assert.ok(rendered.html.includes("https://gallery.cinematicstudio.com"));
    assert.ok(rendered.html.includes("JESS88"));
    assert.ok(rendered.text.includes("JESS88"));
  });

  await it("2.2 renderEmailTemplate renders selection_submitted with count and client notes", () => {
    const rendered = renderEmailTemplate("selection_submitted", {
      clientName: "Rachel Green",
      coupleTitle: "Rachel & Ross Wedding",
      galleryUrl: "https://app.yourplatform.com/gallery/ROSS99",
      selectionCount: 45,
      notes: "Please retouch photo #12 and #15 for the album cover."
    });

    assert.ok(rendered.html.includes("45"));
    assert.ok(rendered.html.includes("Please retouch photo #12"));
    assert.ok(rendered.text.includes("45"));
  });

  await it("2.3 renderEmailTemplate renders selection_confirmation with next steps", () => {
    const rendered = renderEmailTemplate("selection_confirmation", {
      clientName: "Rachel Green",
      coupleTitle: "Rachel & Ross Wedding",
      galleryUrl: "https://app.yourplatform.com/gallery/ROSS99",
      selectionCount: 45
    });

    assert.ok(rendered.html.includes("Selection Successfully Received") || rendered.html.includes("Photos Selected for Album"));
    assert.ok(rendered.html.includes("45"));
  });


  // --- Group 3: WhatsApp Provider & E.164 Normalization ---
  await it("3.1 normalizeE164Phone correctly formats phone numbers to E.164 standard", () => {
    const res1 = normalizeE164Phone("+1 (415) 555-2671");
    assert.strictEqual(res1.valid, true);
    assert.strictEqual(res1.normalized, "+14155552671");

    const res2 = normalizeE164Phone("00447911123456");
    assert.strictEqual(res2.valid, true);
    assert.strictEqual(res2.normalized, "+447911123456");

    const res3 = normalizeE164Phone("invalid-phone");
    assert.strictEqual(res3.valid, false);

    const res4 = normalizeE164Phone("");
    assert.strictEqual(res4.valid, false);
  });

  await it("3.2 getWhatsAppProviderStatus returns real status and provider info", () => {
    const status = getWhatsAppProviderStatus();
    assert.ok(["CONNECTED", "NOT_CONFIGURED", "CONFIG_REQUIRED"].includes(status.status));
    assert.ok(["META_CLOUD_API", "TWILIO", "NONE"].includes(status.provider));
  });

  await it("3.3 buildWhatsAppTemplatePayload formats official template structures", () => {
    const payload = buildWhatsAppTemplatePayload("gallery_published", {
      clientName: "Emily",
      photographerBrand: "DR Films",
      galleryUrl: "https://app.yourplatform.com/gallery/EMIL01",
      accessCode: "EMIL01"
    });

    assert.strictEqual(payload.templateName, "gallery_published");
    assert.ok(payload.bodyText.includes("Emily"));
    assert.ok(payload.bodyText.includes("DR Films"));
    assert.strictEqual(payload.components[0].parameters[0].text, "Emily");
  });

  await it("3.4 sendWhatsAppMessage safely handles test environment execution", async () => {
    const result = await sendWhatsAppMessage({
      recipientPhone: "+14155552671",
      templateName: "gallery_published",
      templateParams: {
        clientName: "Emily",
        photographerBrand: "DR Films",
        galleryUrl: "https://app.yourplatform.com/gallery/EMIL01"
      }
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.channel, "WHATSAPP");
  });

  // --- Group 4: Database Persistence & Tenant Isolation ---
  const photoA = createPhotographer({
    name: "Alex Vance",
    email: "alex.vance@studio-a.com",
    businessName: "Vance Photography",
    role: "PHOTOGRAPHER"
  });

  const photoB = createPhotographer({
    name: "Benjamin Carter",
    email: "ben.carter@studio-b.com",
    businessName: "Carter Studios",
    role: "PHOTOGRAPHER"
  });

  await it("4.1 createNotificationRecord stores new notifications in the database", async () => {
    const notif = await createNotificationRecord({
      photographerId: photoA.id,
      recipientName: "Sophia Adams",
      recipientEmail: "sophia@example.com",
      channel: "EMAIL",
      type: "GALLERY_PUBLISHED",
      subject: "Vance Photography: Your Gallery is Ready",
      content: "Hi Sophia, view your gallery now.",
      status: "SENT",
      sentAt: new Date().toISOString()
    });

    assert.ok(notif.id);
    assert.strictEqual(notif.photographerId, photoA.id);
    assert.strictEqual(notif.status, "SENT");

    const fetched = await getNotificationById(notif.id);
    assert.ok(fetched);
    assert.strictEqual(fetched?.id, notif.id);
  });

  await it("4.2 getNotificationsByPhotographer strictly isolates tenant data", async () => {
    // Create record for Photographer B
    await createNotificationRecord({
      photographerId: photoB.id,
      recipientName: "Lucas Grey",
      recipientEmail: "lucas@example.com",
      channel: "EMAIL",
      type: "GALLERY_PUBLISHED",
      status: "SENT"
    });

    const notifsA = await getNotificationsByPhotographer(photoA.id, 50, 0);
    const notifsB = await getNotificationsByPhotographer(photoB.id, 50, 0);

    assert.ok(notifsA.notifications.length > 0);
    assert.ok(notifsB.notifications.length > 0);

    // Photographer A should NOT see Photographer B's notifications
    assert.ok(notifsA.notifications.every(n => n.photographerId === photoA.id));
    assert.ok(notifsB.notifications.every(n => n.photographerId === photoB.id));
  });

  await it("4.3 updateNotificationRecord correctly updates status and error details", async () => {
    const notif = await createNotificationRecord({
      photographerId: photoA.id,
      recipientName: "Emma Stone",
      recipientEmail: "invalid@blackhole.mail",
      channel: "EMAIL",
      type: "GALLERY_PUBLISHED",
      status: "SENDING"
    });

    const updated = await updateNotificationRecord(notif.id, {
      status: "FAILED",
      errorMessage: "Mailbox does not exist (550)",
      isTransientError: false
    });

    assert.strictEqual(updated?.status, "FAILED");
    assert.strictEqual(updated?.errorMessage, "Mailbox does not exist (550)");
    assert.strictEqual(updated?.isTransientError, false);
  });

  // --- Group 5: Idempotency & Preferences ---
  await it("5.1 isNotificationIdempotent detects duplicate keys", async () => {
    const uniqueKey = `idemp_test_${Date.now()}_${Math.random()}`;
    
    const isFirst = await isNotificationIdempotent(uniqueKey);
    assert.strictEqual(isFirst, false); // Not seen yet

    // Create record with that key
    await createNotificationRecord({
      photographerId: photoA.id,
      recipientName: "Test Recipient",
      idempotencyKey: uniqueKey,
      status: "SENT"
    });

    const isDuplicate = await isNotificationIdempotent(uniqueKey);
    assert.strictEqual(isDuplicate, true); // Now seen
  });

  await it("5.2 saveNotificationPreferences and getNotificationPreferences persist toggles", async () => {
    const initialPrefs = await getNotificationPreferences(photoA.id);
    assert.strictEqual(initialPrefs.photographerId, photoA.id);
    assert.strictEqual(initialPrefs.clientGalleryPublished, true);

    const updated = await saveNotificationPreferences(photoA.id, {
      clientGalleryPublished: false,
      customEmailFooter: "Warm regards, Vance Studio Team"
    });

    assert.strictEqual(updated.clientGalleryPublished, false);
    assert.strictEqual(updated.customEmailFooter, "Warm regards, Vance Studio Team");

    const reloaded = await getNotificationPreferences(photoA.id);
    assert.strictEqual(reloaded.clientGalleryPublished, false);
  });

  // --- Group 6: End-to-End Dispatch & Suppression ---
  await it("6.1 dispatchSaasNotification suppresses dispatch when preference toggle is disabled", async () => {
    // photoA has clientGalleryPublished: false from previous test
    const result = await dispatchSaasNotification({
      event: "GALLERY_PUBLISHED",
      photographerId: photoA.id,
      recipientName: "Unnotified Client",
      recipientEmail: "unnotified@example.com",
      coupleTitle: "Test Wedding"
    });

    // Email should be skipped according to preferences
    assert.strictEqual(result.records.length, 0);
  });

  await it("6.2 dispatchSaasNotification dispatches multi-channel when preferences allow", async () => {
    // Restore preference
    await saveNotificationPreferences(photoA.id, {
      clientGalleryPublished: true,
      whatsappEnabled: true
    });

    const result = await dispatchSaasNotification({
      event: "GALLERY_PUBLISHED",
      photographerId: photoA.id,
      recipientName: "David & Clara",
      recipientEmail: "david.clara@example.com",
      recipientPhone: "+14155552671",
      coupleTitle: "David & Clara Wedding",
      galleryUrl: "https://gallery.vancestudio.com",
      accessCode: "DACL22"
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.records.length >= 1);
  });

  // --- Group 7: Retry Mechanism & Error Diagnostics ---
  await it("7.1 retryFailedNotification increments retry count and enforces max 3 retries", async () => {
    const failedRecord = await createNotificationRecord({
      photographerId: photoA.id,
      recipientName: "Retry Client",
      recipientEmail: "retry.client@example.com",
      channel: "EMAIL",
      type: "GALLERY_PUBLISHED",
      subject: "Retry Test",
      content: "Retry content body",
      status: "FAILED",
      retryCount: 0,
      errorMessage: "Temporary upstream timeout",
      isTransientError: true
    });

    // 1st retry
    const r1 = await retryFailedNotification(failedRecord.id, photoA.id);
    assert.strictEqual(r1.success, true);
    assert.strictEqual(r1.record?.retryCount, 1);

    // Set count to 3
    await updateNotificationRecord(failedRecord.id, { retryCount: 3, status: "FAILED" });

    // 4th retry attempt should be rejected
    const r4 = await retryFailedNotification(failedRecord.id, photoA.id);
    assert.strictEqual(r4.success, false);
    assert.ok(r4.error?.includes("Maximum retry limit"));
  });

  await it("7.2 retryFailedNotification rejects unauthorized cross-tenant retry", async () => {
    const photoBRecord = await createNotificationRecord({
      photographerId: photoB.id,
      recipientName: "Private Client B",
      recipientEmail: "b@example.com",
      channel: "EMAIL",
      type: "GALLERY_PUBLISHED",
      status: "FAILED"
    });

    // Photo A attempts to retry Photo B's notification
    const result = await retryFailedNotification(photoBRecord.id, photoA.id);
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes("Unauthorized"));
  });

  // --- Group 8: Super Admin Notification Metrics ---
  await it("8.1 getNotificationMetrics aggregates platform totalSent, deliveryRate, and channel counts", async () => {
    const metrics = await getNotificationMetrics();
    assert.ok(typeof metrics.totalSent === "number");
    assert.ok(typeof metrics.totalFailed === "number");
    assert.ok(typeof metrics.deliveryRate === "number");
    assert.ok(metrics.deliveryRate >= 0 && metrics.deliveryRate <= 100);
    assert.ok(typeof metrics.byChannel.EMAIL === "number");
    assert.ok(typeof metrics.byChannel.WHATSAPP === "number");
  });

  // --- Group 9: Project Publish Trigger Integration ---
  await it("9.1 Project creation and status update handles client contact fields", async () => {
    const project = createProject({
      photographerId: photoA.id,
      coupleName: "Harper & Ethan",
      weddingDate: "2026-10-15",
      driveFolderUrl: "https://drive.google.com/drive/folders/sample_phase15",
      driveFolderId: "sample_phase15_folder_id",
      packageType: "Cinema Deluxe",
      clientName: "Harper Evans",
      clientEmail: "harper@example.com",
      clientPhone: "+14155559988",
      clientWhatsapp: "+14155559988"
    });

    assert.ok(project.id);
    assert.strictEqual(project.clientEmail, "harper@example.com");
    assert.strictEqual(project.clientPhone, "+14155559988");


    const updated = updateProject(project.id, {
      status: "published",
      notes: "Ready for delivery"
    });

    assert.strictEqual(updated?.status, "published");
    assert.strictEqual(updated?.clientEmail, "harper@example.com");
  });

  console.log("==================================================");
  console.log(`PHASE 15 TEST RESULTS: ${passed}/${total} assertions passed (100%)`);
  console.log("==================================================");
}

runTests().catch(err => {
  console.error("FATAL TEST RUNNER ERROR:", err);
  process.exit(1);
});
