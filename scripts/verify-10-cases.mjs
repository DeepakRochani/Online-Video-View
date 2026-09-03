import assert from "node:assert";

const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("=== RUNNING 10 SUPER ADMIN & PHOTOGRAPHER SEPARATE PORTAL TEST CASES ===");

  // CASE 1: Open /admin while logged out -> redirects to /admin/login
  {
    const res = await fetch(`${BASE_URL}/admin`, { redirect: "manual" });
    console.log(`\nCase 1: GET /admin while logged out`);
    console.log(`Status: ${res.status}, Location: ${res.headers.get("location")}`);
    assert([307, 302, 308].includes(res.status), `Expected redirect status, got ${res.status}`);
    assert(res.headers.get("location")?.includes("/admin/login"), `Expected redirect to /admin/login, got ${res.headers.get("location")}`);
    console.log("✓ PASS: Case 1 - Redirects to /admin/login");
  }

  // CASE 2: Open /admin/photographers while logged out -> redirects to /admin/login
  {
    const res = await fetch(`${BASE_URL}/admin/photographers`, { redirect: "manual" });
    console.log(`\nCase 2: GET /admin/photographers while logged out`);
    console.log(`Status: ${res.status}, Location: ${res.headers.get("location")}`);
    assert([307, 302, 308].includes(res.status), `Expected redirect status, got ${res.status}`);
    assert(res.headers.get("location")?.includes("/admin/login"), `Expected redirect to /admin/login, got ${res.headers.get("location")}`);
    console.log("✓ PASS: Case 2 - Redirects to /admin/login");
  }

  // CASE 3: Correct Super Admin email + correct password -> /admin
  let superAdminCookie = "";
  {
    const res = await fetch(`${BASE_URL}/api/auth/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@drfilms.com", password: "admin2025" }),
    });
    const body = await res.json();
    console.log(`\nCase 3: POST /api/auth/admin-login with correct credentials`);
    console.log(`Status: ${res.status}, Body:`, body);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.redirect || body.redirectTo, "/admin");
    const setCookie = res.headers.get("set-cookie");
    assert(setCookie && setCookie.includes("wvg_session="), "Expected wvg_session cookie");
    superAdminCookie = setCookie.split(";")[0];
    console.log("✓ PASS: Case 3 - Successfully authenticated and received session cookie");
  }

  // CASE 4: Correct email + wrong password -> "Invalid email or password."
  {
    const res = await fetch(`${BASE_URL}/api/auth/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@drfilms.com", password: "wrongpassword123" }),
    });
    const body = await res.json();
    console.log(`\nCase 4: POST /api/auth/admin-login with wrong password`);
    console.log(`Status: ${res.status}, Body:`, body);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.error, "Invalid email or password.");
    console.log("✓ PASS: Case 4 - Rejected with generic 'Invalid email or password.'");
  }

  // CASE 5: Photographer credentials in Super Admin login -> rejected
  {
    const res = await fetch(`${BASE_URL}/api/auth/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "drfilms@weddingcinema.com", password: "admin123" }),
    });
    const body = await res.json();
    console.log(`\nCase 5: POST /api/auth/admin-login with photographer credentials`);
    console.log(`Status: ${res.status}, Body:`, body);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.error, "Invalid email or password.");
    console.log("✓ PASS: Case 5 - Photographer credentials rejected on admin login with generic error");
  }

  // CASE 6: Super Admin credentials -> Super Admin access
  {
    const res = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: superAdminCookie },
      redirect: "manual",
    });
    console.log(`\nCase 6: GET /admin with Super Admin session`);
    console.log(`Status: ${res.status}`);
    assert.strictEqual(res.status, 200, `Expected 200 for authenticated super admin, got ${res.status}`);

    const apiRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: superAdminCookie },
    });
    const me = await apiRes.json();
    console.log("Session me:", me);
    assert.strictEqual(me.authenticated, true);
    assert(["SUPER_ADMIN", "platform_admin"].includes(me.role));
    console.log("✓ PASS: Case 6 - Super Admin granted full access to /admin and authenticated as SUPER_ADMIN");
  }

  // CASE 7: Login -> logout -> /admin -> redirects to /admin/login
  {
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: superAdminCookie },
    });
    console.log(`\nCase 7: POST /api/auth/logout`);
    console.log(`Status: ${logoutRes.status}`);
    const setCookie = logoutRes.headers.get("set-cookie");
    assert(setCookie && (setCookie.includes("wvg_session=;") || setCookie.includes("Max-Age=0")), "Cookie cleared");

    // Attempting /admin with expired/cleared cookie
    const expiredCookie = setCookie.split(";")[0];
    const afterLogoutRes = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: expiredCookie },
      redirect: "manual",
    });
    console.log(`GET /admin after logout Status: ${afterLogoutRes.status}, Location: ${afterLogoutRes.headers.get("location")}`);
    assert([307, 302, 308].includes(afterLogoutRes.status));
    assert(afterLogoutRes.headers.get("location")?.includes("/admin/login"));
    console.log("✓ PASS: Case 7 - Logout clears session and subsequent /admin access redirects to /admin/login");
  }

  // CASE 8: After logout, press browser Back -> admin data must not become accessible
  {
    const res = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: superAdminCookie },
    });
    const cacheControl = res.headers.get("cache-control") || "";
    const pragma = res.headers.get("pragma") || "";
    console.log(`\nCase 8: Cache-Control verification on /admin`);
    console.log(`Cache-Control: "${cacheControl}", Pragma: "${pragma}"`);
    assert(cacheControl.includes("no-store") || cacheControl.includes("no-cache"), "Must prevent browser back-button caching");
    console.log("✓ PASS: Case 8 - Anti-caching headers prevent stale display via browser Back");
  }

  // CASE 9: Photographer attempts /admin -> blocked / redirected to /admin/login
  let photographerCookie = "";
  {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "drfilms@weddingcinema.com", password: "admin123" }),
    });
    const pBody = await loginRes.json();
    console.log(`\nCase 9: Photographer login status: ${loginRes.status}, Body:`, pBody);
    const setCookie = loginRes.headers.get("set-cookie");
    assert(setCookie && setCookie.includes("wvg_session="), "Photographer login successful");
    photographerCookie = setCookie.split(";")[0];

    const adminAttempt = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: photographerCookie },
      redirect: "manual",
    });
    console.log(`Photographer accessing /admin Status: ${adminAttempt.status}, Location: ${adminAttempt.headers.get("location")}`);
    assert([307, 302, 308].includes(adminAttempt.status));
    assert(adminAttempt.headers.get("location")?.includes("/admin/login"), "Photographer redirected away from /admin to /admin/login");
    console.log("✓ PASS: Case 9 - Photographer is blocked from /admin and redirected to /admin/login");
  }

  // CASE 10: Photographer directly calls /api/admin/photographers -> 401/403
  {
    const apiRes = await fetch(`${BASE_URL}/api/admin/photographers`, {
      headers: { Cookie: photographerCookie },
    });
    console.log(`\nCase 10: Photographer directly calling /api/admin/photographers`);
    console.log(`Status: ${apiRes.status}`);
    assert([401, 403].includes(apiRes.status), `Expected 401 or 403, got ${apiRes.status}`);
    console.log("✓ PASS: Case 10 - Admin API call rejected with 401/403 Forbidden");
  }

  console.log("\n==========================================================================");
  console.log("ALL 10 SEPARATE SUPER ADMIN & PHOTOGRAPHER PORTAL TESTS PASSED (100%)!");
  console.log("==========================================================================");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
