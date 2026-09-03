"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { AdPlacementKey, AdVisibilityResult, AdFormat } from "@/lib/project-types";
import { Sparkles, ShieldCheck } from "lucide-react";

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

interface AdSlotProps {
  placement: AdPlacementKey;
  format?: AdFormat;
  className?: string;
  isCustomDomain?: boolean;
  isWhiteLabel?: boolean;
  fallback?: React.ReactNode;
}

export function AdSlot({
  placement,
  format,
  className = "",
  isCustomDomain = false,
  isWhiteLabel = false,
  fallback = null,
}: AdSlotProps) {
  const pathname = usePathname();
  const [result, setResult] = useState<AdVisibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function checkVisibility() {
      try {
        const res = await fetch("/api/ads/visibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pathname: pathname || "/",
            placementKey: placement,
            isCustomDomain,
            isWhiteLabel,
          }),
        });

        if (res.ok && isMounted) {
          const data: AdVisibilityResult = await res.json();
          setResult(data);
        }
      } catch (err) {
        if (isMounted) {
          setResult({
            showAd: false,
            testMode: false,
            reason: "Network check failed",
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkVisibility();

    return () => {
      isMounted = false;
    };
  }, [pathname, placement, isCustomDomain, isWhiteLabel]);

  // Trigger Google AdSense script push when live ad is rendered
  useEffect(() => {
    if (result?.showAd && !result.testMode && !initializedRef.current) {
      try {
        if (typeof window !== "undefined") {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          initializedRef.current = true;
        }
      } catch (e) {
        // Suppress ad push error (e.g. duplicate slot or ad-blocker)
        console.debug("AdSense unit initialization suppressed:", e);
      }
    }
  }, [result]);

  if (loading) {
    return null;
  }

  if (!result || !result.showAd) {
    return <>{fallback}</>;
  }

  // ── TEST MODE PLACEHOLDER ──────────────────────────────────────────────────
  if (result.testMode) {
    return (
      <div
        className={`w-full max-w-full overflow-hidden my-4 p-4 rounded-2xl border border-dashed border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-amber-950/30 text-amber-200/90 shadow-sm backdrop-blur-sm transition-all ${className}`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300">
                  [ ADVERTISEMENT — TEST MODE ]
                </span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono px-1.5 py-0.5 rounded">
                  SAFE SIMULATION
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Placement: <strong className="text-slate-300">{placement}</strong> • Format:{" "}
                <strong className="text-slate-300">{format || result.format || "horizontal"}</strong>
                {result.slotId && (
                  <>
                    {" "}• Slot ID: <strong className="text-slate-300">{result.slotId}</strong>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-amber-400/80 font-mono bg-amber-900/30 px-2.5 py-1 rounded-full border border-amber-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>0 Live Impressions • Layout Ready</span>
          </div>
        </div>
      </div>
    );
  }

  // ── LIVE GOOGLE ADSENSE UNIT ───────────────────────────────────────────────
  const clientPublisherId = result.publisherId;
  const slot = result.slotId || result.adUnit?.slotId;
  const adFormat = format || result.format || result.adUnit?.format || "auto";

  if (!clientPublisherId || !slot) {
    return null;
  }

  return (
    <div className={`w-full max-w-full overflow-hidden my-4 text-center ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", textAlign: "center", width: "100%" }}
        data-ad-client={clientPublisherId}
        data-ad-slot={slot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
}
