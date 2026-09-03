import React from "react";
import Link from "next/link";
import { ArrowLeft, Home, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 selection:bg-indigo-500/30">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
        <div className="w-16 h-16 bg-indigo-950/60 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
          <Compass className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="text-4xl font-black tracking-tight text-white font-mono">404</div>
          <h1 className="text-xl font-bold text-slate-100">Gallery or Page Not Found</h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            The wedding gallery or URL you requested does not exist, may have expired, or is currently restricted.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Photographer Studio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
