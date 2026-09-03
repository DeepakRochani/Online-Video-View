"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client boundary crash
    console.error("[AppRouter ErrorBoundary caught]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 selection:bg-indigo-500/30">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
        <div className="w-16 h-16 bg-red-950/60 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
          <AlertTriangle className="w-8 h-8 animate-bounce" />
        </div>

        <div className="space-y-2">
          <div className="text-3xl font-black tracking-tight text-white font-mono">500</div>
          <h1 className="text-xl font-bold text-slate-100">Something Went Wrong</h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            An unexpected error occurred while processing this page. Our error tracking system has logged this incident.
          </p>
          {error?.digest && (
            <div className="text-[10px] font-mono text-slate-400 bg-slate-950/60 border border-slate-800 rounded-lg p-1.5 mt-2">
              Incident Ref: {error.digest}
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
