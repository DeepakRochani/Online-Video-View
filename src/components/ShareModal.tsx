"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Copy, Check, QrCode, Share2, MessageCircle, ExternalLink } from "lucide-react";
import { PhotographerBranding } from "@/lib/project-types";

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupleName: string;
  weddingDate?: string;
  accessCode: string;
  photographerName?: string;
  studioName?: string;
  branding?: PhotographerBranding;
  mediaTitle?: string;
  mediaItem?: { name?: string; type: "gallery" | "photo" | "video" };
  mediaType?: "photo" | "video";
  onOpenQrCode?: () => void;
  onOpenQrModal?: () => void;
}

export default function ShareModal({
  isOpen,
  onClose,
  coupleName,
  weddingDate,
  accessCode,
  photographerName,
  studioName,
  branding,
  mediaTitle,
  mediaItem,
  mediaType,
  onOpenQrCode,
  onOpenQrModal,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);
  const [showManualCopy, setShowManualCopy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedStudio = branding?.businessName || photographerName || studioName || "Wedding Cinema Studio";
  const resolvedMediaTitle = mediaItem?.name || mediaTitle;
  const resolvedMediaType = mediaItem?.type && mediaItem.type !== "gallery" ? mediaItem.type : mediaType;
  const triggerQr = onOpenQrCode || onOpenQrModal;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const clientGalleryUrl = `${origin}/gallery/${accessCode}`;

  useEffect(() => {
    if (typeof navigator !== "undefined" && !!navigator.share) {
      setHasNativeShare(true);
    }
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const defaultMessage = resolvedMediaTitle
    ? `Check out this wedding ${resolvedMediaType || "moment"} ("${resolvedMediaTitle}") from ${coupleName}'s gallery ❤️\n\nView here:\n${clientGalleryUrl}`
    : `Your wedding memories are ready ❤️\n\nView your wedding gallery:\n${clientGalleryUrl}`;

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(defaultMessage)}`;

  const logShareEvent = async (type: "share_clicked" | "whatsapp_clicked") => {
    try {
      await fetch(`/api/gallery/${accessCode}/analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: type }),
      });
    } catch {
      // Analytics non-blocking
    }
  };

  const handleCopy = async () => {
    logShareEvent("share_clicked");
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(clientGalleryUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } else {
        setShowManualCopy(true);
        if (inputRef.current) {
          inputRef.current.select();
        }
      }
    } catch {
      setShowManualCopy(true);
      if (inputRef.current) {
        inputRef.current.select();
      }
    }
  };

  const handleNativeShare = async () => {
    logShareEvent("share_clicked");
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${coupleName} — Wedding Gallery`,
          text: defaultMessage,
          url: clientGalleryUrl,
        });
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        handleCopy();
      }
    }
  };

  const handleWhatsApp = () => {
    logShareEvent("whatsapp_clicked");
    window.open(whatsappShareUrl, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="glass-panel max-w-md w-full p-6 sm:p-7 border border-white/20 shadow-2xl relative space-y-6 text-slate-100 bg-[#0d0e15]/95 rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-white tracking-wide">
                Share Gallery
              </h3>
              <p className="text-xs text-slate-400">
                {coupleName} &bull; {resolvedStudio}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Media Specific Callout if sharing photo/video */}
        {resolvedMediaTitle && (
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2.5 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              Sharing {resolvedMediaType || "item"}: <strong className="text-white font-medium">{resolvedMediaTitle}</strong>
            </span>
          </div>
        )}

        {/* Copy Link Input & Button */}
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Permanent Client Link
          </label>
          <div className="flex items-center gap-2 p-1.5 pl-3 rounded-2xl bg-black/60 border border-white/15 focus-within:border-amber-400/60 transition-colors">
            <input
              ref={inputRef}
              type="text"
              readOnly
              value={clientGalleryUrl}
              className="bg-transparent text-xs text-amber-200/95 font-mono flex-1 outline-none px-2 truncate selection:bg-amber-400 selection:text-black"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                copied
                  ? "bg-emerald-500 text-white"
                  : "bg-amber-400 hover:bg-amber-300 text-black shadow-md shadow-amber-400/20"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          {copied && (
            <p className="text-[11px] text-emerald-400 font-medium animate-in fade-in flex items-center gap-1">
              <Check className="w-3 h-3" /> ✓ Client link copied
            </p>
          )}
          {showManualCopy && !copied && (
            <p className="text-[11px] text-amber-300/90 font-mono">
              Press Cmd+C / Ctrl+C to copy the link above.
            </p>
          )}
        </div>

        {/* Share Actions Grid */}
        <div className="space-y-2.5 pt-1">
          {/* WhatsApp Share */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <MessageCircle className="w-5 h-5 fill-emerald-400/20" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Share on WhatsApp</div>
                <div className="text-[11px] text-emerald-300/80">Opens pre-filled message for couple or family</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-400/70 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* QR Code Trigger */}
          {triggerQr && (
            <button
              type="button"
              onClick={() => {
                onClose();
                triggerQr();
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 text-slate-200 hover:text-white transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">View QR Code</div>
                  <div className="text-[11px] text-slate-400">Download high-res PNG or printable wedding card</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </button>
          )}

          {/* Native Web Share API if available */}
          {hasNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span>More Share Options...</span>
            </button>
          )}
        </div>

        {/* Security / Privacy Footnote */}
        <div className="text-[11px] text-slate-400 text-center leading-relaxed pt-2 border-t border-white/10">
          This secure link connects directly to the couple&apos;s wedding gallery. Private Google Drive credentials and file paths are never exposed.
        </div>
      </div>
    </div>
  );
}
