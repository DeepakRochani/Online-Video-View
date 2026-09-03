import { NextRequest, NextResponse } from "next/server";
import {
  getDomainByHostname,
  getProjectById,
  getProjectsByPhotographer,
  getPhotographerById,
  isCustomDomainGloballyEnabled,
  DEFAULT_PHOTOGRAPHER_ID,
} from "@/lib/db";

export async function GET(request: NextRequest) {
  const hostname = request.nextUrl.searchParams.get("hostname") || "";
  if (!hostname) {
    return NextResponse.json({ resolved: false, error: "Hostname is required" }, { status: 400 });
  }

  // 1. Global Custom Domain ON/OFF Check
  if (!isCustomDomainGloballyEnabled()) {
    return NextResponse.json({
      resolved: false,
      disabledByPlatform: true,
      error: "Custom domains are currently disabled by the platform administrator.",
    });
  }

  const domain = getDomainByHostname(hostname);
  if (!domain) {
    return NextResponse.json({ resolved: false, error: "Domain mapping not found" }, { status: 404 });
  }

  const photographerId = domain.photographerId || DEFAULT_PHOTOGRAPHER_ID;
  const photographer = getPhotographerById(photographerId);

  let project = domain.projectId ? getProjectById(domain.projectId) : null;
  if (!project) {
    const photogProjects = getProjectsByPhotographer(photographerId);
    project = photogProjects.find((p) => p.status === "published" || p.isActive) || photogProjects[0] || null;
  }

  return NextResponse.json({
    resolved: true,
    domainId: String(domain.id),
    photographerId: String(photographerId),
    studioName: photographer?.studioName || "Studio Gallery",
    hostname: domain.normalizedDomain || domain.hostname,
    status: domain.status,
    verificationStatus: domain.verificationStatus,
    isPrimary: !!domain.isPrimary,
    sslStatus: domain.sslStatus || "pending",
    projectId: project ? String(project.id) : undefined,
    accessCode: project ? project.accessCode : undefined,
    coupleName: project ? project.coupleName : undefined,
    template: project ? (project.template || project.settings?.template || "classic") : "classic",
  });
}
