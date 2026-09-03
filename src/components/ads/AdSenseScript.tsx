"use client";

import React from "react";
import { AdSenseScriptLoader } from "./AdSenseScriptLoader";

/**
 * Global Google Auto Ads script injector.
 * Only injects third-party script on approved public pages when AdSense is active and configured.
 */
export function AdSenseScript() {
  return <AdSenseScriptLoader />;
}

export default AdSenseScript;
