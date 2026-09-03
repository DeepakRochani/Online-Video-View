import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import {
  readDomains,
  readPhotographers,
  writeDomains,
  readPlatformDomainSettings,
  updatePlatformDomainSettings,
  recordAdminAuditLog,
  DEFAULT_PHOTOGRAPHER_ID,
} from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    const rawDomains = readDomains();
    const settings = readPlatformDomainSettings();
    const photographers = readPhotographers();
    const photogMap = new Map(photographers.map((p) => [p.id, p]));

    // Compute real statistics from actual stored data
    const nonDisconnected = rawDomains.filter((d) => d.status !== "DISCONNECTED");
    const verifiedCount = nonDisconnected.filter(
      (d) =>
        d.verificationStatus === "verified" ||
        d.status === "ACTIVE" ||
        d.status === "VERIFIED" ||
        d.status === "active" ||
        d.status === "verified"
    ).length;
    const pendingCount = nonDisconnected.filter(
      (d) =>
        d.verificationStatus === "pending" ||
        d.status === "PENDING" ||
        d.status === "pending"
    ).length;
    const disabledCount = nonDisconnected.filter(
      (d) =>
        d.status === "DISABLED" ||
        d.status === "DISABLED_BY_PLATFORM" ||
        d.status === "disabled" ||
        d.verificationStatus === "failed"
    ).length;

    let filteredDomains = nonDisconnected;
    if (status && status !== "all") {
      const sLower = status.toLowerCase();
      filteredDomains = nonDisconnected.filter(
        (d) =>
          d.status.toLowerCase() === sLower ||
          d.verificationStatus.toLowerCase() === sLower
      );
    }

    const items = filteredDomains.map((d) => {
      const p = d.photographerId ? photogMap.get(d.photographerId) : null;
      return {
        id: String(d.id),
        photographerId: String(d.photographerId),
        projectId: d.projectId ? String(d.projectId) : undefined,
        domain: d.domain || d.hostname,
        normalizedDomain: d.normalizedDomain || d.hostname,
        hostname: d.hostname,
        type: d.type || "SUBDOMAIN",
        status: settings.customDomainsEnabled ? d.status : "DISABLED_BY_PLATFORM",
        rawStatus: d.status,
        verificationStatus: d.verificationStatus,
        verificationToken: d.verificationToken,
        verificationMethod: d.verificationMethod || "CNAME",
        targetCname: d.targetCname,
        sslStatus: d.sslStatus || "pending",
        isPrimary: !!d.isPrimary,
        verifiedAt: d.verifiedAt,
        lastCheckedAt: d.lastCheckedAt,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        photographerName: p?.name || "Unknown",
        photographerEmail: p?.email || "",
        studioName: p?.studioName || "Studio",
      };
    });

    return NextResponse.json({
      success: true,
      settings,
      stats: {
        total: nonDisconnected.length,
        verified: verifiedCount,
        pending: pendingCount,
        disabled: disabledCount,
        allowedPerPhotographer: 1,
        globalStatus: settings.customDomainsEnabled ? "ON" : "OFF",
      },
      domains: items,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retrieve custom domains" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { domainId, action } = body;

    // 1. Super Admin Global Custom Domain Setting Action
    if (action === "toggle_global" || action === "update_settings") {
      const current = readPlatformDomainSettings();
      const customDomainsEnabled =
        body.customDomainsEnabled !== undefined
          ? Boolean(body.customDomainsEnabled)
          : !current.customDomainsEnabled;

      const updated = updatePlatformDomainSettings(
        {
          customDomainsEnabled,
          ...(body.maintenanceNotice ? { maintenanceNotice: body.maintenanceNotice } : {}),
        },
        auth.session.photographerId,
        auth.session.email
      );

      return NextResponse.json({
        success: true,
        message: `Custom domains globally ${updated.customDomainsEnabled ? "ENABLED" : "DISABLED"}.`,
        settings: updated,
      });
    }

    if (!domainId || !action) {
      return NextResponse.json({ error: "domainId and action are required" }, { status: 400 });
    }

    const domains = readDomains();
    const domain = domains.find((d) => d.id === domainId);
    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    if (action === "force_verify") {
      domain.status = "ACTIVE";
      domain.verificationStatus = "verified";
      domain.sslStatus = "managed";
      domain.verifiedAt = new Date().toISOString();
      domain.lastCheckedAt = new Date().toISOString();
      domain.updatedAt = new Date().toISOString();
    } else if (action === "disable") {
      domain.status = "DISABLED";
      domain.lastCheckedAt = new Date().toISOString();
      domain.updatedAt = new Date().toISOString();
    } else if (action === "enable" || action === "re_enable") {
      domain.status = domain.verificationStatus === "verified" ? "ACTIVE" : "PENDING";
      domain.lastCheckedAt = new Date().toISOString();
      domain.updatedAt = new Date().toISOString();
    } else if (action === "delete" || action === "disconnect") {
      const filtered = domains.filter((d) => d.id !== domainId);
      writeDomains(filtered);

      recordAdminAuditLog({
        adminId: auth.session.photographerId,
        adminEmail: auth.session.email,
        action: "DOMAIN_DELETE",
        targetType: "domain",
        targetId: domainId,
        targetName: domain.normalizedDomain || domain.hostname,
        result: "success",
      });

      return NextResponse.json({ success: true, message: "Domain disconnected and removed." });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    writeDomains(domains);

    recordAdminAuditLog({
      adminId: auth.session.photographerId,
      adminEmail: auth.session.email,
      action: `DOMAIN_${action.toUpperCase()}`,
      targetType: "domain",
      targetId: domainId,
      targetName: domain.normalizedDomain || domain.hostname,
      metadata: { newStatus: domain.status },
      result: "success",
    });

    return NextResponse.json({ success: true, domain });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update domain" }, { status: 500 });
  }
}
