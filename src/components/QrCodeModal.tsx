"use client";

import React, { useState, useEffect } from "react";
import { X, Download, Copy, Check, QrCode, FileImage, Globe, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { PhotographerBranding } from "@/lib/project-types";

export interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupleName: string;
  weddingDate?: string;
  accessCode: string;
  photographerName?: string;
  studioName?: string;
  branding?: PhotographerBranding;
  customDomain?: string | null;
  coverImage?: string;
}

export default function QrCodeModal({
  isOpen,
  onClose,
  coupleName,
  weddingDate,
  accessCode,
  photographerName,
  studioName,
  branding,
  customDomain,
  coverImage,
}: QrCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const resolvedStudio = branding?.studioName || branding?.businessName || photographerName || studioName || "DR Films Wedding Cinema";

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isLocalOrigin = !origin || origin.includes("localhost") || origin.includes("127.0.0.1");
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  
  // Requirement 7: Priority: Verified custom domain -> Public App URL -> canonical public gallery URL. NEVER encode localhost.
  const clientGalleryUrl = customDomain
    ? (customDomain.startsWith("http") ? customDomain : `https://${customDomain}`)
    : (publicAppUrl && !publicAppUrl.includes("localhost")
        ? `${publicAppUrl.replace(/\/+$/, "")}/gallery/${accessCode}`
        : (!isLocalOrigin
            ? `${origin}/gallery/${accessCode}`
            : `https://gallery.drfilms.com/gallery/${accessCode}`));

  const qrDownloadUrl = `/api/gallery/${accessCode}/qr?format=png&download=true&size=1200`;

  // Monogram fallback (e.g. "DR")
  const monogram = resolvedStudio
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "DR";

  const studioWebsite = branding?.websiteUrl?.display || (branding?.website ? branding.website.replace(/^https?:\/\//i, "").replace(/\/+$/, "") : "");
  const studioWebsiteHref = branding?.websiteUrl?.href || (branding?.website ? (branding.website.startsWith("http") ? branding.website : `https://${branding.website}`) : "");

  // Generate clean client-side QR data URL for display and canvas drawing
  useEffect(() => {
    if (isOpen && accessCode) {
      QRCode.toDataURL(clientGalleryUrl, {
        width: 800,
        margin: 2,
        color: {
          dark: "#0a0a0c",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR display error:", err));
    }
  }, [isOpen, accessCode, clientGalleryUrl]);

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

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(clientGalleryUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${coupleName} - Wedding Gallery`,
          text: `View the wedding gallery for ${coupleName}`,
          url: clientGalleryUrl,
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // Generate 1200 x 1800 px luxury printable wedding QR invitation card
  const handleDownloadPrintableCard = async () => {
    setIsGeneratingCard(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1800;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      // 1. Luxury Dark Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 1800);
      bgGrad.addColorStop(0, "#0e1017");
      bgGrad.addColorStop(0.5, "#08090d");
      bgGrad.addColorStop(1, "#050608");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 1800);

      // 2. Elegant Golden Border
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, 1120, 1720);

      // Inner thin border
      ctx.strokeStyle = "rgba(212, 175, 55, 0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(55, 55, 1090, 1690);

      // Corner ornamental accents
      const drawCorner = (x: number, y: number, angle: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.strokeStyle = "#d4af37";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 25);
        ctx.lineTo(0, 0);
        ctx.lineTo(25, 0);
        ctx.stroke();
        ctx.restore();
      };
      drawCorner(70, 70, 0);
      drawCorner(1130, 70, Math.PI / 2);
      drawCorner(1130, 1730, Math.PI);
      drawCorner(70, 1730, (Math.PI * 3) / 2);

      // 3. Studio Logo / Monogram
      const logoUrl = branding?.logoUrlLight || branding?.logoUrl;
      let logoDrawn = false;

      if (logoUrl) {
        try {
          const logoImg = new Image();
          logoImg.crossOrigin = "anonymous";
          logoImg.src = logoUrl;
          await new Promise<void>((resolve, reject) => {
            logoImg.onload = () => resolve();
            logoImg.onerror = () => reject();
          });
          const maxLogoW = 300;
          const maxLogoH = 80;
          const scale = Math.min(maxLogoW / logoImg.width, maxLogoH / logoImg.height, 1);
          const drawW = logoImg.width * scale;
          const drawH = logoImg.height * scale;
          ctx.drawImage(logoImg, 600 - drawW / 2, 110 - drawH / 2, drawW, drawH);
          logoDrawn = true;
        } catch {
          // Logo load failed, fallback to monogram
        }
      }

      if (!logoDrawn) {
        // Monogram box
        ctx.strokeStyle = "#d4af37";
        ctx.lineWidth = 2;
        ctx.strokeRect(565, 75, 70, 70);
        ctx.fillStyle = "#e2b857";
        ctx.font = "bold 32px serif, 'Playfair Display', Georgia";
        ctx.textAlign = "center";
        ctx.fillText(monogram, 600, 122);
      }

      // 4. Studio / Photographer Branding Header
      ctx.textAlign = "center";
      ctx.fillStyle = "#e2b857";
      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.letterSpacing = "6px";
      ctx.fillText((resolvedStudio || "DR FILMS WEDDING CINEMA").toUpperCase(), 600, 195);

      // Decorative divider line
      ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(480, 220);
      ctx.lineTo(720, 220);
      ctx.stroke();

      // Scan instruction
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.font = "14px monospace";
      ctx.letterSpacing = "3px";
      ctx.fillText("SCAN TO VIEW WEDDING GALLERY", 600, 255);

      // 5. White card container for QR code
      const cardX = 275;
      const cardY = 295;
      const cardW = 650;
      const cardH = 750;
      const radius = 24;

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 15;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, radius);
      ctx.fill();
      ctx.restore();

      // Golden ring around QR card
      ctx.strokeStyle = "rgba(212, 175, 55, 0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, radius);
      ctx.stroke();

      // Draw QR Image onto card
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = qrDataUrl;
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject();
      });

      ctx.drawImage(qrImg, 325, 345, 550, 550);

      // Code text under QR inside card
      ctx.fillStyle = "#222530";
      ctx.font = "bold 22px monospace";
      ctx.letterSpacing = "4px";
      ctx.fillText(`CODE: ${accessCode}`, 600, 960);

      ctx.fillStyle = "#71798e";
      ctx.font = "16px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.letterSpacing = "1px";
      ctx.fillText("SCAN WITH ANY SMARTPHONE CAMERA", 600, 1000);

      // 6. Decorative divider line below QR
      ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(480, 1090);
      ctx.lineTo(720, 1090);
      ctx.stroke();

      // 7. Couple Names
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 58px serif, 'Playfair Display', Georgia";
      ctx.letterSpacing = "3px";
      ctx.fillText((coupleName || "WEDDING").toUpperCase(), 600, 1170);

      // Subtitle & Wedding Date
      if (weddingDate) {
        ctx.fillStyle = "#d4af37";
        ctx.font = "italic 24px serif, 'Playfair Display', Georgia";
        ctx.letterSpacing = "2px";
        ctx.fillText(weddingDate, 600, 1220);
      }

      // Studio Website Link
      if (studioWebsite) {
        ctx.fillStyle = "#dfba73";
        ctx.font = "18px monospace";
        ctx.letterSpacing = "1px";
        ctx.fillText(studioWebsite, 600, 1280);
      }

      // Direct Gallery Link Display
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "18px monospace";
      ctx.letterSpacing = "1px";
      ctx.fillText(clientGalleryUrl, 600, 1340);

      // Bottom brand watermark
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.letterSpacing = "2px";
      ctx.fillText("FINE ART WEDDING CINEMA & PHOTOGRAPHY", 600, 1680);

      // Export canvas as high-res PNG download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${coupleName.replace(/[^a-zA-Z0-9]/g, "_")}_Wedding_Invitation_Card.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        setIsGeneratingCard(false);
      }, "image/png");
    } catch (err) {
      console.error("Printable card generation failed:", err);
      setIsGeneratingCard(false);
    }
  };

  const logoUrl = branding?.logoUrlLight || branding?.logoUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-panel max-w-md w-full p-6 sm:p-8 border border-amber-400/30 shadow-2xl relative space-y-5 text-white bg-gradient-to-b from-[#13151f] via-[#0c0d14] to-[#07080c] rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close QR dialog"
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. Studio Logo & Brand Name Header */}
        <div className="text-center space-y-2 pt-1">
          {logoUrl ? (
            <div className="max-h-12 flex items-center justify-center overflow-hidden mx-auto mb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={resolvedStudio}
                className="max-h-12 max-w-[200px] object-contain"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl border border-amber-400/50 bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10 mb-1">
              <span className="font-serif font-bold text-amber-300 tracking-wider text-base">
                {monogram}
              </span>
            </div>
          )}

          <h4 className="text-xs sm:text-sm font-serif font-bold text-amber-300 uppercase tracking-widest">
            {resolvedStudio}
          </h4>

          {/* Thin elegant gold line divider */}
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent mx-auto" />

          {/* Scan instruction */}
          <p className="text-[11px] uppercase tracking-widest text-slate-300 font-mono">
            Scan to view Wedding Gallery
          </p>
        </div>

        {/* 2. Centered QR Code Container */}
        <div className="p-4 rounded-2xl bg-white flex flex-col items-center justify-center shadow-2xl max-w-[240px] mx-auto border-2 border-amber-400/40">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`QR Code for ${coupleName} Wedding Gallery`}
              className="w-48 h-48 object-contain"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <span className="text-[10px] font-mono text-slate-800 mt-2 font-bold tracking-widest uppercase">
            CODE: {accessCode}
          </span>
        </div>

        {/* 3. Thin elegant gold line divider */}
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent mx-auto" />

        {/* 4. Couple Names & Wedding Date */}
        <div className="text-center space-y-1">
          <h3
            id="qr-modal-title"
            className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wide"
          >
            {coupleName}
          </h3>
          {weddingDate && (
            <p className="text-xs text-amber-200/80 font-serif italic">
              {weddingDate}
            </p>
          )}

          {/* Photographer Website URL (clickable link) */}
          {studioWebsite && (
            <div className="pt-1">
              <a
                href={studioWebsiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors font-mono tracking-wide underline-offset-4 hover:underline"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{studioWebsite}</span>
              </a>
            </div>
          )}
        </div>

        {/* 5. Gallery URL with Copy Link & Share Buttons */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
          <span className="truncate text-slate-300 flex-1 text-left select-all px-1">
            {clientGalleryUrl}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 flex items-center gap-1.5 text-xs font-sans font-semibold transition-all cursor-pointer"
              title="Copy gallery link"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-1.5 text-xs font-sans font-semibold transition-all cursor-pointer"
              title="Share gallery"
            >
              {shared ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Shared</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-300" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 6. Action Buttons */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            {/* Download QR PNG */}
            <a
              href={qrDownloadUrl}
              download={`${coupleName.replace(/\s+/g, "_")}_Gallery_QR.png`}
              className="glass-button justify-center py-2.5 text-xs font-semibold text-amber-300 hover:text-white border-amber-500/30 hover:border-amber-400 transition-all text-center flex items-center gap-1.5"
              title="Download high-resolution 1200x1200px PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download QR</span>
            </a>

            {/* Download Printable Card */}
            <button
              type="button"
              onClick={handleDownloadPrintableCard}
              disabled={isGeneratingCard || !qrDataUrl}
              className="glass-button justify-center py-2.5 text-xs font-semibold text-white bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/40 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Generate printable luxury display card"
            >
              <FileImage className="w-3.5 h-3.5 text-amber-300" />
              <span>{isGeneratingCard ? "Rendering..." : "Download Card"}</span>
            </button>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors text-center cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
