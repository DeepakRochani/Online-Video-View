import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function readJson<T>(filename: string): T[] {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeJson<T>(filename: string, data: T[]) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function performProductionDatabaseCleanup() {
  console.log("=======================================================");
  console.log("🧹 SUPER ADMIN PRODUCTION DATABASE CLEANUP");
  console.log("=======================================================\n");

  const removedSummary: Record<string, number> = {
    photographers: 0,
    projects: 0,
    subscriptions: 0,
    domains: 0,
    auditLogs: 0,
    activity: 0,
  };

  // 1. Clean Photographers
  const photographers = readJson<any>("photographers.json");
  const testPhotogIds = new Set<string>();

  const validPhotographers = photographers.filter((p) => {
    const isTest =
      p.id.startsWith("photog-phase") ||
      p.id.startsWith("photog-starter-") ||
      p.id.startsWith("photog-domain-") ||
      p.email?.includes("@example.com") ||
      p.email?.startsWith("test_") ||
      p.name === "Live Test Photog";

    if (isTest) {
      testPhotogIds.add(p.id);
      removedSummary.photographers++;
      console.log(`[REMOVED_TEST_PHOTOGRAPHER] id=${p.id} email=${p.email} name="${p.name}"`);
      return false;
    }
    return true;
  });

  writeJson("photographers.json", validPhotographers);

  // 2. Clean Projects
  const projects = readJson<any>("projects.json");
  const validProjects = projects.filter((proj) => {
    const isTest =
      testPhotogIds.has(proj.photographerId) ||
      proj.driveFolderId === "test-folder-p1" ||
      proj.driveFolderId === "test-folder-p2" ||
      proj.coupleName === "Sophia & Liam" ||
      proj.coupleName === "Ava & Noah";

    if (isTest) {
      removedSummary.projects++;
      console.log(`[REMOVED_TEST_PROJECT] id=${proj.id} couple="${proj.coupleName}" photogId=${proj.photographerId}`);
      return false;
    }
    return true;
  });

  writeJson("projects.json", validProjects);

  // 3. Clean Subscriptions
  const subscriptions = readJson<any>("subscriptions.json");
  const validSubscriptions = subscriptions.filter((sub) => {
    const isTest =
      testPhotogIds.has(sub.photographerId) ||
      sub.id.startsWith("sub-p1-") ||
      sub.id.startsWith("sub-p2-") ||
      sub.id.startsWith("sub-starter-") ||
      sub.id.startsWith("sub-014f8194-");

    if (isTest) {
      removedSummary.subscriptions++;
      console.log(`[REMOVED_TEST_SUBSCRIPTION] id=${sub.id} photogId=${sub.photographerId} plan=${sub.plan}`);
      return false;
    }
    return true;
  });

  writeJson("subscriptions.json", validSubscriptions);

  // 4. Clean Domains
  const domains = readJson<any>("domains.json");
  const validDomains = domains.filter((d) => {
    const isTest =
      testPhotogIds.has(d.photographerId) ||
      d.hostname === "gallery.elysianmemories.com" ||
      d.hostname === "clients.vancevisuals.com" ||
      d.hostname?.includes("example.com");

    if (isTest) {
      removedSummary.domains++;
      console.log(`[REMOVED_TEST_DOMAIN] id=${d.id} hostname=${d.hostname} photogId=${d.photographerId}`);
      return false;
    }
    return true;
  });

  writeJson("domains.json", validDomains);

  // 5. Clean Activity
  const activity = readJson<any>("activity.json");
  const validActivity = activity.filter((a) => {
    const isTest =
      testPhotogIds.has(a.photographerId) ||
      (a.targetName && (a.targetName.includes("Sophia & Liam") || a.targetName.includes("Ava & Noah")));

    if (isTest) {
      removedSummary.activity++;
      return false;
    }
    return true;
  });

  writeJson("activity.json", validActivity);

  // 6. Clean Audit Logs
  const auditLogs = readJson<any>("audit-logs.json");
  const validAuditLogs = auditLogs.filter((log) => {
    const isTest =
      testPhotogIds.has(log.targetId) ||
      (log.metadata && testPhotogIds.has(log.metadata.photographerId)) ||
      (log.targetName && (log.targetName.includes("elysianmemories") || log.targetName.includes("vancevisuals")));

    if (isTest) {
      removedSummary.auditLogs++;
      return false;
    }
    return true;
  });

  writeJson("audit-logs.json", validAuditLogs);

  console.log("\n=======================================================");
  console.log("✅ PRODUCTION DATABASE CLEANUP COMPLETE SUMMARY:");
  console.log(`  • Photographers Removed: ${removedSummary.photographers} (Preserved ${validPhotographers.length} real)`);
  console.log(`  • Projects/Weddings Removed: ${removedSummary.projects} (Preserved ${validProjects.length} real)`);
  console.log(`  • Subscriptions Removed: ${removedSummary.subscriptions} (Preserved ${validSubscriptions.length} real)`);
  console.log(`  • Domains Removed: ${removedSummary.domains} (Preserved ${validDomains.length} real)`);
  console.log(`  • Activity Logs Removed: ${removedSummary.activity} (Preserved ${validActivity.length} real)`);
  console.log(`  • Audit Logs Removed: ${removedSummary.auditLogs} (Preserved ${validAuditLogs.length} real)`);
  console.log("=======================================================\n");
}

// Execute if run directly
performProductionDatabaseCleanup();
