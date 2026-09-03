"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Heart, 
  Sparkles, 
  ArrowRight, 
  Film, 
  ShieldCheck, 
  Download, 
  Play, 
  FolderHeart,
  ExternalLink,
  Lock,
  Eye
} from "lucide-react";
import { AdSlot } from "@/components/ads";

export default function Home() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [codeError, setCodeError] = useState("");

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = accessCode.trim().toUpperCase();
    if (!cleanCode) {
      setCodeError("Please enter your 8-character access code.");
      return;
    }
    router.push(`/gallery/${cleanCode}`);
  };

  return (
    <div className="min-h-screen wedding-bg text-slate-100 flex flex-col justify-between selection:bg-amber-400 selection:text-black">
      {/* ── Top Navigation ── */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Heart className="w-5 h-5 fill-amber-400/30" />
          </div>
          <span className="font-serif font-bold text-lg text-white tracking-tight">
            Wedding Video Gallery
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="wedding-gold-btn text-xs px-4 py-2"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Photographer Login</span>
          </Link>
        </div>
      </header>

      {/* ── Main Hero Section ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center space-y-12">
        {/* Badge & Headline */}
        <div className="space-y-4 animate-in fade-in duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs font-semibold uppercase tracking-widest backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Cinematic Client Video Delivery Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-bold text-white tracking-tight leading-[1.15]">
            Deliver Your Wedding Films in <span className="wedding-gold-gradient">Unrivaled Elegance</span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Give your couples a breathtaking, cinema-grade gallery experience powered directly by your Google Drive storage. No upload limits, no clutter.
          </p>
        </div>

        {/* ── Client Gallery Access Card ── */}
        <div className="max-w-md mx-auto glass-panel p-6 sm:p-8 border border-amber-400/30 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-amber-300 flex items-center justify-center mx-auto mb-3">
              <Eye className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-lg font-serif font-bold text-white">Client Gallery Access</h3>
            <p className="text-xs text-slate-400 mt-1">
              Couples & guests: enter your private gallery code below
            </p>
          </div>

          {codeError && (
            <div className="mb-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs text-left">
              {codeError}
            </div>
          )}

          <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value.toUpperCase());
                  setCodeError("");
                }}
                maxLength={10}
                placeholder="ENTER ACCESS CODE (e.g. A9B2C3D4)"
                className="glass-input text-center font-mono tracking-widest uppercase font-bold text-amber-200 placeholder:text-slate-600 py-3"
              />
            </div>

            <button
              type="submit"
              className="w-full accent-button py-3 text-xs uppercase tracking-wider font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <span>Open Wedding Gallery</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/5 text-[11px] text-slate-500">
            Received a direct link? You can also click your photographer&apos;s link directly.
          </div>
        </div>

        {/* ── Features Highlights Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 text-left">
          <div className="glass-panel p-6 border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white font-serif">Direct Drive Streaming</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Stream full 4K and 1080p wedding films directly from Google Drive with HTML5 custom media controls.
            </p>
          </div>

          <div className="glass-panel p-6 border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white font-serif">Original Master Downloads</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Couples can easily download high-bitrate video master files with a single click on desktop or mobile.
            </p>
          </div>

          <div className="glass-panel p-6 border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white font-serif">Private Access Codes</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Each wedding project gets a unique alphanumeric access code with one-click sharing and instant privacy controls.
            </p>
          </div>
        </div>

        {/* Public Homepage Footer AdSlot */}
        <div className="pt-8">
          <AdSlot placement="PUBLIC_HOME" />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-amber-400/80 fill-amber-400/20" />
            <span className="font-serif text-slate-400">Wedding Video Gallery Platform</span>
          </div>

          <p className="text-[11px] text-slate-600">
            Powered by Google Drive Video Streaming &bull; Built for Wedding Filmmakers
          </p>
        </div>
      </footer>
    </div>
  );
}
