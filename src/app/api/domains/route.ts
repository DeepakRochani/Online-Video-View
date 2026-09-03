import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import {
  getDomainsByPhotographer,
  addOrUpdateDomain,
  normalizeDomain,
  isCustomDomainGloballyEnabled,
  domainOperationLock,
  DEFAULT_PHOTOGRAPHER_ID,
} from "@/lib/db";
import { canCreate } from "@/lib/entitlements";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || !session.photographerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photographerId = session.photographerId;
  const allDomains = getDomainsByPhotographer(photographerId);
  const domains = allDomains.filter((d) => d.status !== "DISCONNECTED");
  const globalEnabled = isCustomDomainGloballyEnabled();
  const cnameTarget =
    process.env.CNAME_TARGET || process.env.PLATFORM_DOMAIN || "cname.drfilms.com";

  return NextResponse.json({
    globalEnabled,
    maxAllowedPerPhotographer: 1,
    domains: domains.map((d) => ({
      id: String(d.id),
      photographerId: String(d.photographerId),
      projectId: d.projectId ? String(d.projectId) : undefined,
      domain: d.domain || d.hostname,
      normalizedDomain: d.normalizedDomain || d.hostname,
      hostname: d.hostname,
      type: d.type || "SUBDOMAIN",
      status: globalEnabled ? d.status : "DISABLED_BY_PLATFORM",
      rawStatus: d.status,
      verificationStatus: d.verificationStatus,
      verificationToken: d.verificationToken,
      verificationMethod: d.verificationMethod || "CNAME",
      targetCname: d.targetCname || cnameTarget,
      txtRecordName: d.txtRecordName || `_wvg-verify.${d.hostname}`,
      txtRecordValue: d.txtRecordValue || d.verificationToken,
      sslStatus: d.sslStatus || "pending",
      isPrimary: !!d.isPrimary,
      verifiedAt: d.verifiedAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
    cnameTarget,
  });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || !session.photographerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photographerId = session.photographerId;

  // 1. Global Custom Domain ON/OFF Check
  if (!isCustomDomainGloballyEnabled()) {
    return NextResponse.json(
      {
        error: "CUSTOM_DOMAINS_DISABLED",
        message: "Custom domains are currently disabled by the platform administrator.",
      },
      { status: 403 }
    );
  }

  // 2. Entitlement / Plan check
  const domainCheck = canCreate(photographerId, "customDomains");
  if (!domainCheck.allowed) {
    const statusCode = domainCheck.code === "CUSTOM_DOMAINS_DISABLED" ? 403 : (domainCheck.code === "CUSTOM_DOMAIN_LIMIT_REACHED" ? 409 : 403);
    return NextResponse.json(
      {
        error: domainCheck.code || "FEATURE_NOT_IN_PLAN",
        message: domainCheck.message,
        current: domainCheck.current,
        limit: domainCheck.limit,
        upgradeRequired: domainCheck.upgradeRequiredPlan ? true : false,
        upgradePlan: domainCheck.upgradeRequiredPlan,
      },
      { status: statusCode }
    );
  }

  try {
    const body = await request.json();
    const { domain, hostname, projectId, isPrimary } = body;
    const rawInput = domain || hostname;

    if (!rawInput || typeof rawInput !== "string") {
      return NextResponse.json({ error: "INVALID_DOMAIN", message: "Domain name is required." }, { status: 400 });
    }

    const cleanDomain = normalizeDomain(rawInput);
    if (!cleanDomain) {
      return NextResponse.json(
        {
          error: "INVALID_DOMAIN",
          message: "Invalid domain format. Please provide a valid hostname (e.g., gallery.yourstudio.com).",
        },
        { status: 400 }
      );
    }

    // 3. Thread-safe atomic execution to prevent race-condition concurrency bypass
    const result = await domainOperationLock.acquire(async () => {
      return addOrUpdateDomain({
        hostname: cleanDomain,
        domain: cleanDomain,
        photographerId,
        projectId: projectId || "general",
        isPrimary: isPrimary === true,
      });
    });

    if (result.error) {
      const statusCode =
        result.code === "CUSTOM_DOMAIN_LIMIT_REACHED" || result.code === "DOMAIN_ALREADY_CONNECTED"
          ? 409
          : result.code === "CUSTOM_DOMAINS_DISABLED"
          ? 403
          : 400;

      return NextResponse.json(
        {
          error: result.code || "DOMAIN_CREATION_FAILED",
          message: result.error,
        },
        { status: statusCode }
      );
    }

    const d = result.domain;
    return NextResponse.json(
      {
        success: true,
        domain: {
          id: String(d.id),
          photographerId: String(d.photographerId),
          projectId: d.projectId ? String(d.projectId) : undefined,
          domain: d.domain || d.hostname,
          normalizedDomain: d.normalizedDomain || d.hostname,
          hostname: d.hostname,
          type: d.type || "SUBDOMAIN",
          status: d.status,
          verificationStatus: d.verificationStatus,
          verificationToken: d.verificationToken,
          verificationMethod: d.verificationMethod || "CNAME",
          targetCname: d.targetCname,
          txtRecordName: d.txtRecordName,
          txtRecordValue: d.txtRecordValue,
          sslStatus: d.sslStatus,
          isPrimary: !!d.isPrimary,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Add domain error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Failed to add domain." }, { status: 500 });
  }
}
