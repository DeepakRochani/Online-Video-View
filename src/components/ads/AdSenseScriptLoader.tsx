"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { PERMANENTLY_EXCLUDED_ROUTES, CLIENT_GALLERY_ROUTES, matchesRoutePattern } from "@/lib/ads/routes";

export function AdSenseScriptLoader() {
  const pathname = usePathname();
  const [config, setConfig] = useState<{
    publisherId: string;
    enabled: boolean;
    testMode: boolean;
    autoAdsEnabled: boolean;
    safetyMode: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/ads/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setConfig(data);
      })
      .catch(() => {});
  }, []);

  if (!config || !config.enabled || config.safetyMode) {
    return null;
  }

  // If in Test Mode, do not inject third-party external scripts to Google servers
  if (config.testMode) {
    return null;
  }

  // Exclude administrative, auth, and client wedding gallery routes from auto script injection
  const currentPath = pathname || "/";
  if (
    matchesRoutePattern(currentPath, PERMANENTLY_EXCLUDED_ROUTES) ||
    matchesRoutePattern(currentPath, CLIENT_GALLERY_ROUTES)
  ) {
    return null;
  }

  const cleanPublisherId = config.publisherId?.trim();
  if (!cleanPublisherId || !cleanPublisherId.startsWith("ca-pub-")) {
    return null;
  }

  return (
    <Script
      id="adsbygoogle-script"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cleanPublisherId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
      onError={(e) => {
        // Handle ad-blockers gracefully without breaking page execution
        if (process.env.NODE_ENV !== "production") {
          console.debug("AdSense script load prevented or blocked:", e);
        }
      }}
    />
  );
}
