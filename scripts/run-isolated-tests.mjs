import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";

console.log("==================================================");
console.log("RUNNING SUITES IN ISOLATED TEST ENVIRONMENT");
console.log("==================================================");

const realDataDir = path.join(process.cwd(), "data");
const tempTestDir = fs.mkdtempSync(path.join(os.tmpdir(), "drfilms-saas-test-"));
console.log(`[TEST ISOLATION] Created temporary test data directory: ${tempTestDir}`);

try {
  // Copy plan templates and base structure to temp dir
  if (fs.existsSync(realDataDir)) {
    for (const f of fs.readdirSync(realDataDir)) {
      if (f.endsWith(".json")) {
        // Only copy plans, coupons, and projects if present
        if (f === "plans.json" || f === "coupons.json" || f === "projects.json") {
          fs.copyFileSync(path.join(realDataDir, f), path.join(tempTestDir, f));
        } else {
          fs.writeFileSync(path.join(tempTestDir, f), "[]", "utf-8");
        }
      }
    }
  }

  const testFiles = [
    "src/tests/test_phase10b_auth.ts",
    "src/tests/test_phase11_billing.ts",
    "src/tests/test_phase11_saas_lifecycle.ts",
    "src/tests/test_phase12_adsense.ts",
    "src/tests/test_phase13_google_adsense_auth.ts",
    "src/tests/test_phase12_photographer_onboarding_auth.ts",
    "src/tests/test_phase13_saas_subscriptions_razorpay.ts",
    "src/tests/test_phase14_custom_domains_dns_ssl.ts",
    "src/tests/test_phase15_notifications_communication.ts",
    "src/tests/test_phase16_security_audit_isolation.ts",
    "src/tests/test_phase17_production_monitoring_backup.ts",
    "src/tests/test_phase18_responsive_mobile_qa.ts",
    "src/tests/test_phase19_super_admin_communications.ts",
    "src/tests/test_communication_duplicate_prevention.ts",
    "src/tests/test_admin_notifications_api.ts",
    "src/tests/test_custom_domains_governance.ts",
    "src/tests/test_phase20_video_streaming.ts",
  ];


  let anyFailed = false;

  for (const testFile of testFiles) {
    console.log(`\n>>> Running test: ${testFile}`);
    const result = spawnSync("npx", ["tsx", testFile], {
      stdio: "inherit",
      env: {
        ...process.env,
        DATA_DIR: tempTestDir,
        NODE_ENV: "test",
        MOCK_DNS_VERIFY: "true",
      },
    });

    if (result.status !== 0) {
      console.error(`❌ Test failed: ${testFile} (exit code ${result.status})`);
      anyFailed = true;
    }
  }

  if (anyFailed) {
    console.error("\n❌ Some tests failed in isolated environment.");
    process.exit(1);
  } else {
    console.log("\n✅ All test suites passed successfully with 100% data isolation!");
  }
} finally {
  console.log(`[TEST ISOLATION] Cleaning up temporary test data directory: ${tempTestDir}`);
  try {
    fs.rmSync(tempTestDir, { recursive: true, force: true });
  } catch (e) {
    console.warn("Failed to remove temp test dir:", e);
  }
}
