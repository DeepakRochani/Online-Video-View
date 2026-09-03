"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RootGlobalError caught]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 antialiased font-sans">
        <div className="max-w-md w-full text-center space-y-6 bg-slate-900/80 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 bg-red-950/60 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="text-3xl font-black tracking-tight text-white font-mono">System Error</div>
            <h1 className="text-xl font-bold text-slate-100">Critical Application Fault</h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              A root application fault occurred. Telemetry and error tracking have captured this event.
            </p>
            {error?.digest && (
              <div className="text-[10px] font-mono text-slate-400 bg-slate-950/60 border border-slate-800 rounded-lg p-1.5 mt-2">
                Trace ID: {error.digest}
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
