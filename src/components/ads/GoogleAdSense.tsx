"use client";

import React from "react";
import { AdSlot } from "./AdSlot";
import { AdPlacementKey, AdFormat } from "@/lib/project-types";

export interface GoogleAdSenseProps {
  placement: AdPlacementKey;
  format?: AdFormat;
  className?: string;
  isCustomDomain?: boolean;
  isWhiteLabel?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Reusable, server/client-safe Google AdSense Component.
 * Evaluates visibility against the centralized platform rules engine before rendering.
 */
export function GoogleAdSense(props: GoogleAdSenseProps) {
  return <AdSlot {...props} />;
}

export default GoogleAdSense;
