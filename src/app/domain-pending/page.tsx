import React from "react";
import Link from "next/link";
import { Globe, Clock, ShieldCheck, ArrowRight } from "lucide-react";

export default function DomainPendingPage() {
  return (
    <div className="min-h-screen wedding-bg text-slate-100 flex flex-col justify-between items-center px-4 py-16 selection:bg-amber-400 selection:text-black">
      <div className="w-full max-w-lg text-center space-y-8 my-auto animate-in fade-in zoom-in-95 duration-500">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300 mx-auto flex items-center justify-center shadow-xl shadow-amber-500/10">
          <Globe className="w-8 h-8 animate-pulse text-amber-400" />
        </div>

        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>Custom Domain Setup</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
            Gallery Domain Connecting
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
            This custom wedding gallery domain is currently being configured and verified. DNS propagation may take a few moments.
          </p>
        </div>

        <div className="glass-panel p-6 border border-white/10 rounded-2xl text-left space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Photographer Instructions</h4>
              <p className="text-xs text-slate-300 mt-1">
                Ensure your CNAME DNS record points to your platform target. Once propagated, verify the domain in your dashboard settings.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 hover:text-amber-200 transition-colors uppercase tracking-wider"
          >
            <span>Photographer Studio Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <footer className="text-xs text-slate-300 font-mono">
        White-Label Wedding Gallery Platform
      </footer>
    </div>
  );
}
