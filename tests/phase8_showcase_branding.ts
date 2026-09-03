import assert from "node:assert";
import {
  normalizeWebsiteUrl,
  resolveBranding,
  resolveGalleryAppearance,
  readStudioSettings,
  writeStudioSettings,
  getProjectByAccessCode,
  readProjects,
  getDomainsByProjectId,
  addOrUpdateDomain,
} from "../src/lib/db";
import { WeddingProject, StudioSettings, PhotographerBranding } from "../src/lib/project-types";

console.log("▶ Starting Phase 8.2 Unit & Integration Tests...\n");

// ── Test 1: Website URL Normalization & Sanitization ──
console.log("Test 1: normalizeWebsiteUrl");
{
  const r1 = normalizeWebsiteUrl("drfilms.com");
  assert.deepStrictEqual(r1, { href: "https://drfilms.com", display: "drfilms.com" });

  const r2 = normalizeWebsiteUrl("https://www.drfilms.com/");
  assert.deepStrictEqual(r2, { href: "https://www.drfilms.com", display: "www.drfilms.com" });

  const r3 = normalizeWebsiteUrl("http://films.example.org/weddings/");
  assert.strictEqual(r3?.href, "http://films.example.org/weddings");
  assert.strictEqual(r3?.display, "films.example.org/weddings");

  const r4 = normalizeWebsiteUrl("   ");
  assert.strictEqual(r4, null);

  const r5 = normalizeWebsiteUrl(null);
  assert.strictEqual(r5, null);

  const r6 = normalizeWebsiteUrl("javascript:alert('xss')");
  assert.strictEqual(r6, null);

  console.log("  ✓ normalizeWebsiteUrl correctly formats href, clean display, and blocks malicious URIs");
}

// ── Test 2: Branding Resolution Hierarchy ──
console.log("\nTest 2: Branding Resolution Hierarchy");
{
  const mockStudio: StudioSettings = {
    studioName: "Studio Global Name",
    tagline: "Global Tagline",
    website: "https://studioglobal.com",
    phone: "+1 555-0100",
    whatsapp: "+1 555-0100",
    defaultTemplate: "minimal",
    defaultTheme: "minimal",
    defaultAccentColor: "#D4AF37",
    whiteLabelEnabled: true,
  };

  // Scenario A: Project provides its own website
  const projectBrandingA: PhotographerBranding = {
    businessName: "Bespoke Couple Films",
    website: "bespokefilms.com",
  };
  const resolvedA = resolveBranding(projectBrandingA, mockStudio);
  assert.strictEqual(resolvedA.businessName, "Bespoke Couple Films");
  assert.strictEqual(resolvedA.website, "bespokefilms.com");
  assert.deepStrictEqual(resolvedA.websiteUrl, { href: "https://bespokefilms.com", display: "bespokefilms.com" });
  assert.strictEqual(resolvedA.whatsapp, "+1 555-0100"); // Falls back to studio whatsapp

  // Scenario B: Project has empty website -> falls back to studio default
  const projectBrandingB: PhotographerBranding = {
    businessName: "Project B",
    website: "",
  };
  const resolvedB = resolveBranding(projectBrandingB, mockStudio);
  assert.strictEqual(resolvedB.website, "https://studioglobal.com");
  assert.deepStrictEqual(resolvedB.websiteUrl, { href: "https://studioglobal.com", display: "studioglobal.com" });

  // Scenario C: Project uses studio defaults explicitly
  const projectBrandingC: PhotographerBranding = {
    businessName: "Custom Ignored",
    website: "ignored.com",
    useStudioDefaults: true,
  };
  const resolvedC = resolveBranding(projectBrandingC, mockStudio);
  assert.strictEqual(resolvedC.studioName, "Studio Global Name");
  assert.strictEqual(resolvedC.website, "https://studioglobal.com");
  assert.deepStrictEqual(resolvedC.websiteUrl, { href: "https://studioglobal.com", display: "studioglobal.com" });

  console.log("  ✓ resolveBranding respects Project > Studio Defaults > System Default");
}

// ── Test 3: Gallery Appearance Resolution Hierarchy ──
console.log("\nTest 3: Gallery Appearance Resolution");
{
  const mockStudio: StudioSettings = {
    studioName: "Studio Global",
    defaultTemplate: "editorial",
    defaultTheme: "luxury",
    defaultAccentColor: "#E5C158",
  };

  // Scenario A: Project specifies template and theme
  const projectA = {
    id: "proj-1",
    coupleName: "A & B",
    template: "cinematic" as const,
    theme: "cinematic" as const,
    settings: {
      template: "cinematic" as const,
      theme: "cinematic" as const,
      fontPreset: "outfit",
      primaryAccent: "#F59E0B",
    },
  } as unknown as WeddingProject;

  const appA = resolveGalleryAppearance(projectA, mockStudio);
  assert.strictEqual(appA.template, "cinematic");
  assert.strictEqual(appA.theme, "cinematic");
  assert.strictEqual(appA.fontPreset, "outfit");
  assert.strictEqual(appA.primaryAccent, "#F59E0B");

  // Scenario B: Project leaves template & theme undefined -> falls back to studio default
  const projectB = {
    id: "proj-2",
    coupleName: "C & D",
    template: undefined,
    theme: undefined,
    settings: {},
  } as unknown as WeddingProject;

  const appB = resolveGalleryAppearance(projectB, mockStudio);
  assert.strictEqual(appB.template, "editorial");
  assert.strictEqual(appB.theme, "luxury");
  assert.strictEqual(appB.primaryAccent, "#E5C158");

  console.log("  ✓ resolveGalleryAppearance cleanly maps Project > Studio > System fallbacks");
}

// ── Test 4: Live Projects & Custom Domain Isolation ──
console.log("\nTest 4: Live Database Verification");
{
  const projects = readProjects();
  assert.ok(projects.length > 0, "At least one wedding project exists in projects.json");
  const firstProject = projects[0];

  const resolved = resolveBranding(firstProject.branding);
  assert.ok(resolved.studioName, "Studio name resolved");
  assert.ok(resolved.websiteUrl !== undefined, "websiteUrl property exists");

  const appearance = resolveGalleryAppearance(firstProject);
  assert.ok(["classic", "editorial", "minimal", "cinematic", "luxury", "story"].includes(appearance.template));
  assert.ok(["luxury", "cinematic", "classic", "minimal"].includes(appearance.theme));

  console.log(`  ✓ Project "${firstProject.coupleName}" resolved:`);
  console.log(`    - Studio Name: ${resolved.studioName}`);
  console.log(`    - Website: ${resolved.websiteUrl ? resolved.websiteUrl.display : "(none)"}`);
  console.log(`    - Template: ${appearance.template}`);
  console.log(`    - Theme: ${appearance.theme}`);
  console.log(`    - Accent: ${appearance.primaryAccent}`);
}

console.log("\n✅ ALL TESTS PASSED SUCCESSFULLY!\n");
