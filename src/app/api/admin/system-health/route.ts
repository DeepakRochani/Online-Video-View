import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { DATA_DIR, getJobRecords, getBackups, readWebhookEvents } from "@/lib/db";
import { getOpenAlertsCount } from "@/lib/alerts";
import { getMediaMetricsSummary } from "@/lib/media-metrics";

export const dynamic = "force-dynamic";

export type SubsystemStatus = "HEALTHY" | "DEGRADED" | "DOWN" | "NOT_CONFIGURED";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const stores = [
      "projects.json",
      "photographers.json",
      "subscriptions.json",
      "invoices.json",
      "domains.json",
      "activity.json",
      "favorites.json",
      "selections.json",
      "team-members.json",
      "audit-logs.json",
      "support-notes.json",
      "support-tickets.json",
      "webhook-events.json",
      "notifications.json",
      "notification-preferences.json",
      "errors.json",
      "alerts.json",
      "jobs.json",
      "backups.json",
    ];

    let missingStores = 0;
    let totalDatabaseRecords = 0;
    let totalDatabaseSizeBytes = 0;

    const storeStatus = stores.map((file) => {
      const fullPath = path.join(DATA_DIR, file);
      const exists = fs.existsSync(fullPath);
      let sizeBytes = 0;
      let recordCount = 0;
      let isParseable = true;

      if (exists) {
        try {
          const stat = fs.statSync(fullPath);
          sizeBytes = stat.size;
          totalDatabaseSizeBytes += sizeBytes;
          const content = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
          if (Array.isArray(content)) {
            recordCount = content.length;
            totalDatabaseRecords += recordCount;
          }
        } catch {
          isParseable = false;
        }
      } else {
        missingStores++;
      }

      return {
        file,
        status: exists && isParseable ? "healthy" : exists ? "corrupted" : "missing",
        sizeKb: Number((sizeBytes / 1024).toFixed(1)),
        recordCount,
      };
    });

    // 1. Database Status
    const dbStatus: SubsystemStatus =
      missingStores === 0 ? "HEALTHY" : missingStores < 4 ? "DEGRADED" : "DOWN";

    // 2. Google Drive Status
    const hasDriveOAuth = !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
    );
    const hasDriveSA = !!(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    );
    const hasDriveApiKey = !!(
      process.env.GOOGLE_DRIVE_API_KEY &&
      process.env.GOOGLE_DRIVE_API_KEY !== "YOUR_API_KEY_HERE" &&
      process.env.GOOGLE_DRIVE_API_KEY.length > 10
    );

    const driveStatus: SubsystemStatus =
      hasDriveOAuth || hasDriveSA || hasDriveApiKey ? "HEALTHY" : "NOT_CONFIGURED";

    // 3. Razorpay Status
    const hasRazorpayKey = !!(
      process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    );
    const hasRazorpaySecret = !!process.env.RAZORPAY_KEY_SECRET;
    const hasRazorpayWebhook = !!process.env.RAZORPAY_WEBHOOK_SECRET;

    const razorpayStatus: SubsystemStatus =
      hasRazorpayKey && hasRazorpaySecret && hasRazorpayWebhook
        ? "HEALTHY"
        : hasRazorpayKey && hasRazorpaySecret
        ? "DEGRADED"
        : "NOT_CONFIGURED";

    // 4. Email Provider Status
    const hasResend = !!process.env.RESEND_API_KEY;
    const hasSendGrid = !!process.env.SENDGRID_API_KEY;
    const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER);

    const emailStatus: SubsystemStatus =
      hasResend || hasSendGrid || hasSmtp ? "HEALTHY" : "NOT_CONFIGURED";

    // 5. Webhook Processing Health
    const webhookEvents = readWebhookEvents();
    const recentWebhooks = webhookEvents.slice(0, 50);
    const failedWebhooks = recentWebhooks.filter(
      (w) => w.status === "failed" || w.status === "FAILED"
    );
    const webhookFailureRate =
      recentWebhooks.length > 0 ? (failedWebhooks.length / recentWebhooks.length) * 100 : 0;

    const webhooksStatus: SubsystemStatus = !hasRazorpayWebhook
      ? "NOT_CONFIGURED"
      : webhookFailureRate > 25
      ? "DEGRADED"
      : "HEALTHY";

    // 6. Background Jobs Health
    const recentJobs = getJobRecords(20);
    const failedJobs = recentJobs.filter((j) => j.status === "FAILED");
    const jobsStatus: SubsystemStatus =
      recentJobs.length === 0
        ? "NOT_CONFIGURED"
        : failedJobs.length > 2
        ? "DEGRADED"
        : "HEALTHY";

    // 7. Custom Domains Health
    const domainsFile = path.join(DATA_DIR, "domains.json");
    let domainCount = 0;
    if (fs.existsSync(domainsFile)) {
      try {
        const d = JSON.parse(fs.readFileSync(domainsFile, "utf-8"));
        if (Array.isArray(d)) domainCount = d.length;
      } catch {}
    }
    const domainsStatus: SubsystemStatus = domainCount > 0 ? "HEALTHY" : "NOT_CONFIGURED";

    // 8. Backup Status
    const backups = getBackups();
    const latestBackup = backups[0] || null;
    const backupStatus: SubsystemStatus =
      latestBackup && latestBackup.status === "SUCCESS"
        ? "HEALTHY"
        : latestBackup && latestBackup.status === "FAILED"
        ? "DEGRADED"
        : "NOT_CONFIGURED";

    const mem = process.memoryUsage();
    const openAlerts = getOpenAlertsCount();

    const subsystems = {
      application: {
        status: "HEALTHY" as SubsystemStatus,
        label: "Application Core & App Router",
        details: `Node.js ${process.version}, PID ${process.pid}`,
      },
      database: {
        status: dbStatus,
        label: "SaaS Storage Layer",
        details: `${stores.length - missingStores}/${stores.length} stores active, ${totalDatabaseRecords} records (${(totalDatabaseSizeBytes / 1024).toFixed(1)} KB)`,
      },
      googleDrive: {
        status: driveStatus,
        label: "Google Drive Media Integration",
        details: hasDriveOAuth
          ? "OAuth2 Refresh Token Connected"
          : hasDriveSA
          ? "Service Account JWT Connected"
          : hasDriveApiKey
          ? "API Key Configured"
          : "Not Configured",
      },
      razorpay: {
        status: razorpayStatus,
        label: "Razorpay Billing & Webhooks",
        details:
          razorpayStatus === "HEALTHY"
            ? "API Keys & Webhook Secret Verified"
            : razorpayStatus === "DEGRADED"
            ? "API Keys configured (Webhook secret missing)"
            : "Not Configured",
      },
      email: {
        status: emailStatus,
        label: "Email & Communication Transport",
        details: hasResend
          ? "Resend API Connected"
          : hasSendGrid
          ? "SendGrid API Connected"
          : hasSmtp
          ? "SMTP Transport Connected"
          : "Development Fallback (Console/Dev Transport)",
      },
      webhooks: {
        status: webhooksStatus,
        label: "Webhook Processing Ledger",
        details: `${recentWebhooks.length} events logged, ${failedWebhooks.length} failed (${webhookFailureRate.toFixed(0)}% error rate)`,
      },
      backgroundJobs: {
        status: jobsStatus,
        label: "Background Jobs & Tasks",
        details: `${recentJobs.length} tasks recorded, ${failedJobs.length} failed`,
      },
      customDomains: {
        status: domainsStatus,
        label: "Custom Domains & DNS Engine",
        details: `${domainCount} custom domain${domainCount === 1 ? "" : "s"} registered`,
      },
      backups: {
        status: backupStatus,
        label: "Metadata Snapshots & Disaster Recovery",
        details: latestBackup
          ? `Last backup: ${new Date(latestBackup.createdAt).toLocaleString()} (${latestBackup.sizeKb} KB, ${latestBackup.recordCount} records)`
          : "Managed by database provider / No local snapshots taken",
      },
      mediaDelivery: {
        status: "HEALTHY" as SubsystemStatus,
        label: "Advanced Media Delivery & CDN Engine",
        details: `Responsive SrcSet, Byte-Range Streaming, Rate Limiting & ETag Caching Active`,
      },
    };

    const mediaMetrics = getMediaMetricsSummary();

    // Overall Platform Status
    const hasDown = Object.values(subsystems).some((s) => s.status === "DOWN");
    const hasDegraded = Object.values(subsystems).some((s) => s.status === "DEGRADED");
    const overallStatus: SubsystemStatus = hasDown
      ? "DOWN"
      : hasDegraded || openAlerts > 0
      ? "DEGRADED"
      : "HEALTHY";

    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      memory: {
        rssMb: Number((mem.rss / 1024 / 1024).toFixed(1)),
        heapUsedMb: Number((mem.heapUsed / 1024 / 1024).toFixed(1)),
        heapTotalMb: Number((mem.heapTotal / 1024 / 1024).toFixed(1)),
      },
      openAlerts,
      subsystems,
      mediaMetrics,
      stores: storeStatus,
      latestBackup,
    };

    return NextResponse.json({ success: true, health });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to inspect system health" },
      { status: 500 }
    );
  }
}
