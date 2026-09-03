import type { Metadata } from "next";
import {
  getProjectByAccessCode,
  getPrimaryDomainForPhotographer,
  getDomainsByProjectId,
  resolveCanonicalGalleryUrl,
  DEFAULT_PHOTOGRAPHER_ID,
} from "@/lib/db";

interface GalleryLayoutProps {
  children: React.ReactNode;
  params: Promise<{ accessCode: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ accessCode: string }>;
}): Promise<Metadata> {
  const { accessCode } = await params;
  const project = getProjectByAccessCode(accessCode.toUpperCase());

  if (!project) {
    return {
      title: "Wedding Gallery",
      description: "A private wedding photograph and film collection.",
    };
  }

  const photographerId = project.photographerId || DEFAULT_PHOTOGRAPHER_ID;
  const projectDomains = getDomainsByProjectId(project.id);
  const primaryDomain =
    projectDomains.find((d) => d.status === "ACTIVE" || d.status === "active")?.hostname ||
    getPrimaryDomainForPhotographer(photographerId)?.hostname ||
    null;

  const canonicalUrl = resolveCanonicalGalleryUrl(accessCode, primaryDomain);
  const studioName =
    project.branding?.businessName || project.photographerName || "DR Films";
  const title = `${project.coupleName} | Wedding Gallery`;
  const description = `Experience the wedding photographs and cinema collection of ${project.coupleName}. Presented by ${studioName}.`;
  const images = project.coverImage
    ? [{ url: project.coverImage, alt: `${project.coupleName} Wedding` }]
    : [];

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}

export default function GalleryLayout({ children }: GalleryLayoutProps) {
  return <>{children}</>;
}
