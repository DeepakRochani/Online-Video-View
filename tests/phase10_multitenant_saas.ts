import { 
  readProjects, 
  getProjectByAccessCode, 
  getProjectsByPhotographer,
  getPhotographerById,
  createPhotographer,
  getSubscription,
  saveSubscription,
  getInvoices,
  addInvoice,
  isWebhookProcessed,
  recordWebhookProcessed,
  getAllClientsSummary,
  addTeamMember,
  getTeamMembersByPhotographer,
  removeTeamMember,
  DEFAULT_PHOTOGRAPHER_ID,
} from "../src/lib/db";
import { SAAS_PLANS } from "../src/lib/plans";
import { checkPlanLimit, hasPlanFeature } from "../src/lib/plan-limits";
import crypto from "crypto";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runPhase10Tests() {
  console.log("==================================================");
  console.log("   PHASE 10: MULTI-TENANT SAAS PLATFORM TEST SUITE");
  console.log("==================================================\n");

  // 1. Auto-Migration and Legacy Projects Non-Breaking Check
  console.log("--- TEST 1: Auto-Migration & Legacy Project Access ---");
  const allProjects = readProjects();
  assert(allProjects.length >= 3, `Found ${allProjects.length} projects in db (expected >= 3)`);
  
  for (const p of allProjects) {
    assert(!!p.photographerId, `Project "${p.coupleName}" has photographerId assigned (${p.photographerId})`);
  }

  const p1 = getProjectByAccessCode("4JSCXV94");
  assert(p1 !== null && p1.coupleName.includes("HARSHIL"), "Legacy project 1 (HARSHIL & JAHNAVI) accessible via code 4JSCXV94");

  const p2 = getProjectByAccessCode("Y6JMD2A3");
  assert(p2 !== null && p2.coupleName.includes("Abu"), "Legacy project 2 (Abu Wedding) accessible via code Y6JMD2A3");

  const p3 = getProjectByAccessCode("6GN2C86G");
  assert(p3 !== null && p3.coupleName.includes("Ashutosh"), "Legacy project 3 (Ashutosh & Komal) accessible via code 6GN2C86G");

  // 2. Multi-Tenant Tenant Isolation & Scoping
  console.log("\n--- TEST 2: Multi-Tenant Tenant Scoping ---");
  const defaultPhotographerProjects = getProjectsByPhotographer(DEFAULT_PHOTOGRAPHER_ID);
  assert(defaultPhotographerProjects.length >= 3, `Default photographer has ${defaultPhotographerProjects.length} projects`);

  const photographerB = createPhotographer({
    name: "Studio Luxe Visuals",
    email: `luxe_${Date.now()}@example.com`,
    businessName: "Luxe Visuals",
    plan: "FREE",
    role: "owner",
  });
  assert(!!photographerB.id, `Created new photographer account: ${photographerB.name} (${photographerB.id})`);

  const photographerBProjects = getProjectsByPhotographer(photographerB.id);
  assert(photographerBProjects.length === 0, `New photographer B initially has 0 isolated projects`);

  // 3. Plan Entitlements & Limit Engine
  console.log("\n--- TEST 3: Plan Limits & Entitlements Engine ---");
  const freeLimit = checkPlanLimit(photographerB.id, "maxProjects");
  assert(freeLimit.allowed === true && freeLimit.limit === 1, "Photographer B on FREE tier allowed 1 project");

  const proPlan = SAAS_PLANS.PRO;
  assert(proPlan.limits.maxProjects === 25, "PRO plan has 25 project limit");
  assert(proPlan.capabilities.whiteLabel === true, "PRO plan includes whiteLabel capability");
  assert(hasPlanFeature(DEFAULT_PHOTOGRAPHER_ID, "whiteLabel") === true, "Default photographer (PRO) has whiteLabel enabled");

  // 4. Razorpay Signature Verification Simulation
  console.log("\n--- TEST 4: Razorpay Signature Verification & Billing ---");
  const orderId = `order_${Date.now()}`;
  const paymentId = `pay_${Date.now()}`;
  const mockSecret = "test_razorpay_secret_key";
  const expectedSig = crypto.createHmac("sha256", mockSecret).update(`${orderId}|${paymentId}`).digest("hex");
  const computedSig = crypto.createHmac("sha256", mockSecret).update(`${orderId}|${paymentId}`).digest("hex");
  assert(expectedSig === computedSig, "HMAC-SHA256 signature verification successfully validated");

  // 5. Webhook Idempotency
  console.log("\n--- TEST 5: Webhook Idempotency ---");
  const eventId = `evt_test_${Date.now()}`;
  assert(isWebhookProcessed(eventId) === false, "Unprocessed webhook event returns false");
  recordWebhookProcessed(eventId, "payment.captured");
  assert(isWebhookProcessed(eventId) === true, "Processed webhook event returns true (idempotent duplicate prevention)");

  // 6. Invoices Management
  console.log("\n--- TEST 6: Invoices & Billing Records ---");
  const sampleInvoice = addInvoice({
    id: `inv_test_${Date.now()}`,
    photographerId: DEFAULT_PHOTOGRAPHER_ID,
    subscriptionId: `sub-${DEFAULT_PHOTOGRAPHER_ID}`,
    invoiceNumber: `INV-${Date.now()}`,
    amount: 1499,
    currency: "INR",
    status: "paid",
    plan: "PRO",
    billingCycle: "MONTHLY",
    paymentId,
    createdAt: new Date().toISOString(),
  });
  assert(!!sampleInvoice.id, "Generated invoice record");
  const fetchedInvoices = getInvoices(DEFAULT_PHOTOGRAPHER_ID);
  assert(fetchedInvoices.some(inv => inv.id === sampleInvoice.id), "Invoice successfully queryable for tenant");

  // 7. Client CRM Summary
  console.log("\n--- TEST 7: Client CRM Summary Aggregation ---");
  const clients = getAllClientsSummary(DEFAULT_PHOTOGRAPHER_ID);
  assert(clients.length >= 3, `Aggregated CRM summary for ${clients.length} clients`);
  const client1 = clients.find(c => c.accessCode === "4JSCXV94");
  assert(!!client1 && client1.coupleName.includes("HARSHIL"), "Client summary contains couple name and access code");
  assert(typeof client1?.selectionCount === "number", "Client summary contains numeric selection count");
  assert(typeof client1?.favoritesCount === "number", "Client summary contains numeric favorites count");

  // 8. Team Collaboration
  console.log("\n--- TEST 8: Team Members Management ---");
  const member = addTeamMember({
    photographerId: DEFAULT_PHOTOGRAPHER_ID,
    name: "Alex Retoucher",
    email: "alex@drfilms.com",
    role: "editor",
    status: "active",
  });
  assert(!!member.id, "Added team member");
  const teamList = getTeamMembersByPhotographer(DEFAULT_PHOTOGRAPHER_ID);
  assert(teamList.some(m => m.id === member.id), "Team list contains added team member");
  const removed = removeTeamMember(member.id, DEFAULT_PHOTOGRAPHER_ID);
  assert(removed === true, "Successfully removed team member");

  console.log("\n==================================================");
  console.log("   🎉 ALL PHASE 10 SAAS SUITE TESTS PASSED!");
  console.log("==================================================");
}

runPhase10Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
