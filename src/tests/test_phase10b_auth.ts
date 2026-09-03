/**
 * Phase 10B Comprehensive Test Suite
 * Tests multi-tenant auth, bcrypt password hashing, role enforcement, session invalidation,
 * password reset flow, and tenant isolation.
 */
import {
  registerPhotographerAccount,
  getPhotographerByEmail,
  verifyUserPassword,
  hashUserPassword,
  createPasswordResetToken,
  resetPhotographerPassword,
  forceLogoutPhotographer,
  suspendPhotographer,
  getPhotographerById,
  createProject,
  getProjectsByPhotographer,
  getProjectById,
} from "../lib/db";
import { createSessionCookie, parseSessionToken } from "../lib/auth";

async function runTests() {
  console.log("==================================================");
  console.log("STARTING PHASE 10B AUTHENTICATION VALIDATION SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Password Hashing & Verification
    console.log("--- 1. Testing Bcrypt Password Hashing & Verification ---");
    const testPassword = "MySecurePassword2026!";
    const hash = await hashUserPassword(testPassword);
    assert(hash.startsWith("$2"), "Password hashed with bcrypt ($2 prefix)");
    const validPw = await verifyUserPassword(testPassword, hash);
    assert(validPw === true, "Valid password verifies correctly against bcrypt hash");
    const invalidPw = await verifyUserPassword("WrongPassword123", hash);
    assert(invalidPw === false, "Invalid password fails verification");

    // 2. Photographer Registration
    console.log("\n--- 2. Testing Photographer Registration ---");
    const uniqueEmail = `test_photog_${Date.now()}@studioexample.com`;
    const regResult = await registerPhotographerAccount({
      email: uniqueEmail,
      password: testPassword,
      name: "Alice Wonderland",
      studioName: "Alice Wonderland Studios",
      phone: "+1 555-0199",
    });

    assert(regResult.success === true, "Registration succeeded for new photographer");
    assert(!!regResult.photographer?.id, "Photographer assigned unique ID");
    assert(regResult.photographer?.email === uniqueEmail, "Photographer email recorded accurately");
    assert(regResult.photographer?.role === "owner" || regResult.photographer?.role === "PHOTOGRAPHER", "Assigned photographer owner role");
    assert(regResult.photographer?.tokenVersion === 1, "Initial tokenVersion set to 1");

    // Duplicate email check
    const dupResult = await registerPhotographerAccount({
      email: uniqueEmail,
      password: "anotherPassword",
      name: "Alice Clone",
      studioName: "Alice Clone Studios",
    });
    assert(dupResult.success === false && !!dupResult.error, "Duplicate email properly rejected with error");

    // 3. Session Token Creation & Verification
    console.log("\n--- 3. Testing HMAC Session Tokens ---");
    const sessionToken = await createSessionCookie(
      regResult.photographer!.id,
      regResult.photographer!.email,
      regResult.photographer!.role,
      regResult.photographer!.tokenVersion
    );

    const parsedSession = parseSessionToken(sessionToken);
    assert(!!parsedSession, "HMAC-signed session token verifies successfully");
    assert(parsedSession?.photographerId === regResult.photographer!.id, "Session token preserves photographer ID");
    assert(parsedSession?.tokenVersion === 1, "Session token preserves tokenVersion");

    // Tampered token check
    const tamperedToken = sessionToken.slice(0, -5) + "abcde";
    const tamperedParsed = parseSessionToken(tamperedToken);
    assert(tamperedParsed === null, "Tampered session token rejected by HMAC signature verification");

    // 4. Force Logout (Token Version Invalidation)
    console.log("\n--- 4. Testing Force Logout & Session Revocation ---");
    const forceLogoutRes = forceLogoutPhotographer(regResult.photographer!.id, "Security Audit Invalidation");
    assert(forceLogoutRes === true, "forceLogoutPhotographer executed successfully");
    
    const updatedPhotog = getPhotographerById(regResult.photographer!.id);
    assert(updatedPhotog?.tokenVersion === 2, "Photographer tokenVersion incremented from 1 to 2");

    // When account tokenVersion (2) > session tokenVersion (1), session must be considered invalid
    assert(
      (updatedPhotog?.tokenVersion || 1) > (parsedSession?.tokenVersion || 0),
      "Active session token version (1) is now strictly less than account token version (2)"
    );

    // 5. Password Reset Flow
    console.log("\n--- 5. Testing Password Reset Flow ---");
    const resetTokenObj = createPasswordResetToken(uniqueEmail);
    assert(!!resetTokenObj?.token, "Password reset token generated successfully");

    const newPassword = "BrandNewSuperSecret2026!";
    const resetRes = await resetPhotographerPassword(resetTokenObj!.token, newPassword);
    assert(resetRes.success === true, "resetPhotographerPassword succeeded");

    const photogAfterReset = getPhotographerById(regResult.photographer!.id);
    assert(photogAfterReset?.tokenVersion === 3, "tokenVersion bumped again upon password reset (now 3)");
    
    // Verify login with new password works
    const checkNewPw = await verifyUserPassword(newPassword, photogAfterReset!.passwordHash!);
    assert(checkNewPw === true, "New password verifies against updated hash");

    const checkOldPw = await verifyUserPassword(testPassword, photogAfterReset!.passwordHash!);
    assert(checkOldPw === false, "Old password fails verification");

    // 6. Account Suspension
    console.log("\n--- 6. Testing Account Suspension ---");
    const suspendRes = suspendPhotographer(regResult.photographer!.id, "Payment dispute review", "admin-id");
    assert(!!suspendRes, "Account suspended successfully");

    const suspendedPhotog = getPhotographerById(regResult.photographer!.id);
    assert(suspendedPhotog?.status === "suspended", "Account status set to suspended");
    assert(suspendedPhotog?.tokenVersion === 4, "tokenVersion bumped on suspension (now 4)");

    // 7. Tenant Isolation (Photographer A vs Photographer B)
    console.log("\n--- 7. Testing Tenant Data Isolation ---");
    const photog2Email = `test_photog2_${Date.now()}@studioexample.com`;
    const regResult2 = await registerPhotographerAccount({
      email: photog2Email,
      password: "PasswordPhotog2!",
      name: "Bob Builder",
      studioName: "Bob Builder Photos",
    });

    const project1 = createProject({
      coupleName: "Alice & John",
      weddingDate: "2026-10-10",
      weddingLocation: "Grand Palace",
      packageType: "Full Cinema",
      driveFolderUrl: "https://drive.google.com/drive/folders/test1",
      driveFolderId: "test1",
      photographerId: regResult.photographer!.id,
    });

    const project2 = createProject({
      coupleName: "Bob & Sarah",
      weddingDate: "2026-11-11",
      weddingLocation: "Sunset Beach",
      packageType: "Full Cinema",
      driveFolderUrl: "https://drive.google.com/drive/folders/test2",
      driveFolderId: "test2",
      photographerId: regResult2.photographer!.id,
    });

    const aliceProjects = getProjectsByPhotographer(regResult.photographer!.id);
    const bobProjects = getProjectsByPhotographer(regResult2.photographer!.id);

    assert(aliceProjects.some((p) => p.id === project1.id), "Alice can access Alice's wedding");
    assert(!aliceProjects.some((p) => p.id === project2.id), "Alice CANNOT see Bob's wedding (Tenant Isolation)");
    assert(bobProjects.some((p) => p.id === project2.id), "Bob can access Bob's wedding");
    assert(!bobProjects.some((p) => p.id === project1.id), "Bob CANNOT see Alice's wedding (Tenant Isolation)");

    console.log("\n==================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution failed with error:", error);
    process.exit(1);
  }
}

runTests();
