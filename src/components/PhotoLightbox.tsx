"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { DriveMediaFile } from "@/lib/project-types";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Heart,
  Sparkles,
  Check,
  Share2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { getOptimizedImageUrl, getImageSrcSet, getImageSizes } from "@/lib/image-optimizer";

interface PhotoLightboxProps {
  photos: DriveMediaFile[];
  currentIndex: number;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  allowDownloads?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (photoId: string, e?: React.MouseEvent) => void;
  accessCode?: string;
  onSetCover?: (photo: DriveMediaFile) => void;
  isCover?: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (photoId: string, e?: React.MouseEvent) => void;
  onShare?: (photo: DriveMediaFile) => void;
}

export default function PhotoLightbox({
  photos,
  currentIndex,
  onClose,
  onSelectIndex,
  allowDownloads = false,
  isFavorite = false,
  onToggleFavorite,
  accessCode,
  onSetCover,
  isCover = false,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onShare,
}: PhotoLightboxProps) {
  const currentPhoto = photos[currentIndex];
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Swipe touch coordinates
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset zoom on index change & intelligent next/prev preloading
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsLoading(true);

    // Preload next and previous high-resolution images in background for instant navigation
    if (typeof window !== "undefined" && photos.length > 1) {
      const nextPhoto = photos[(currentIndex + 1) % photos.length];
      const prevPhoto = photos[(currentIndex - 1 + photos.length) % photos.length];
      if (nextPhoto) {
        const imgNext = new Image();
        imgNext.src = getOptimizedImageUrl(nextPhoto, "lightbox");
      }
      if (prevPhoto) {
        const imgPrev = new Image();
        imgPrev.src = getOptimizedImageUrl(prevPhoto, "lightbox");
      }
    }
  }, [currentIndex, photos]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    onSelectIndex((currentIndex + 1) % photos.length);
  }, [currentIndex, photos.length, onSelectIndex]);

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    onSelectIndex((currentIndex - 1 + photos.length) % photos.length);
  }, [currentIndex, photos.length, onSelectIndex]);

  // Lock background body scroll when Lightbox is mounted
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "+" || e.key === "=") {
        setScale((s) => Math.min(3, s + 0.5));
      } else if (e.key === "-") {
        setScale((s) => Math.max(1, s - 0.5));
      } else if (e.key === "0") {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  // Mouse pan controls when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  // Mobile swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (scale > 1) return; // Don't swipe while zoomed in
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 80) {
      if (deltaX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  if (!currentPhoto) return null;

  const driveId = currentPhoto.driveFileId || currentPhoto.id;
  const highResUrl = getOptimizedImageUrl(currentPhoto, "lightbox");
  const lightboxSrcSet = getImageSrcSet(currentPhoto, "lightbox");
  const lightboxSizes = getImageSizes("lightbox");
  const downloadUrl = accessCode
    ? `/api/photos/${driveId}?accessCode=${accessCode}&download=true`
    : `https://drive.google.com/uc?id=${driveId}&export=download`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo viewer - ${currentPhoto.name}`}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-2xl text-white select-none animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-white/10 bg-black/50 backdrop-blur-md z-20 safe-top">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-wider truncate max-w-[140px] sm:max-w-none">
            {currentPhoto.eventName || "Wedding Photo"}
          </span>
          <span className="text-xs text-white/50 hidden sm:inline">
            Photo {currentIndex + 1} of {photos.length}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setScale((s) => Math.min(3, s + 0.5))}
              className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }}
              className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition"
              title="Reset Zoom (0)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setScale((s) => Math.max(1, s - 0.5))}
              className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Set as Project Cover button (Admin) */}
          {onSetCover && (
            <button
              onClick={() => onSetCover(currentPhoto)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                isCover
                  ? "bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-400/20"
                  : "bg-white/10 text-amber-300 hover:bg-white/20 border-amber-400/30"
              }`}
              title={isCover ? "Current Project Cover" : "Set this photo as Project Cover"}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isCover ? "fill-current" : ""}`} />
              <span className="hidden sm:inline">{isCover ? "Project Cover" : "Make Cover"}</span>
            </button>
          )}

          {/* Favorite button */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => onToggleFavorite(currentPhoto.id || currentPhoto.driveFileId, e)}
              className={`p-2 rounded-lg border transition-all duration-200 active:scale-125 cursor-pointer ${
                isFavorite
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-md shadow-rose-500/20"
                  : "bg-white/5 text-white/70 hover:text-rose-400 border-white/10 hover:bg-white/10"
              }`}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-rose-400" : ""}`} />
            </button>
          )}

          {/* Album Selection button */}
          {isSelectionMode && onToggleSelect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(currentPhoto.id || currentPhoto.driveFileId, e);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 active:scale-105 cursor-pointer ${
                isSelected
                  ? "bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-400/20"
                  : "bg-white/10 text-white/80 hover:text-amber-300 hover:bg-white/20 border-white/10"
              }`}
              title={isSelected ? "Remove from album selection" : "Select for album"}
            >
              <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? "text-black" : ""}`} />
              <span className="hidden sm:inline">{isSelected ? "Selected" : "Select for Album"}</span>
            </button>
          )}

          {/* Share button */}
          {onShare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShare(currentPhoto);
              }}
              className="p-2 rounded-lg bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 transition cursor-pointer"
              title="Share photo"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {/* Download button if allowed */}
          {allowDownloads && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={currentPhoto.name}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition font-semibold"
              title="Download Photo"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
          )}

          {/* Native Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 transition"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="relative flex-1 flex items-center justify-center overflow-hidden cursor-default"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 z-10">
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-white/60 tracking-wider">Loading high-resolution photo...</p>
          </div>
        )}

        {/* Previous Navigation Arrow */}
        {photos.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition shadow-2xl hover:scale-110 active:scale-95"
            title="Previous (Arrow Left)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Navigation Arrow */}
        {photos.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition shadow-2xl hover:scale-110 active:scale-95"
            title="Next (Arrow Right)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* The Photo */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-100 ease-out"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
          }}
        >
          {/* Low-res preview while high-res loads */}
          {isLoading && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={getOptimizedImageUrl(currentPhoto, "grid")}
              alt=""
              aria-hidden="true"
              className="max-h-[82vh] max-w-[95vw] object-contain rounded shadow-2xl select-none pointer-events-none filter blur-[2px] opacity-70 absolute inset-0 m-auto"
              draggable={false}
            />
          )}

          {/* High-res image with responsive srcSet */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={highResUrl}
            srcSet={lightboxSrcSet || undefined}
            sizes={lightboxSizes}
            alt={currentPhoto.name}
            onLoad={() => setIsLoading(false)}
            onError={(e) => {
              // Fallback to standard thumbnail
              const target = e.currentTarget;
              const fallbackUrl = getOptimizedImageUrl(currentPhoto, "grid");
              if (fallbackUrl && target.src !== fallbackUrl) {
                target.src = fallbackUrl;
              }
              setIsLoading(false);
            }}
            className={`max-h-[82vh] max-w-[95vw] object-contain rounded shadow-2xl select-none pointer-events-none transition-opacity duration-300 ${
              isLoading ? "opacity-0" : "opacity-100"
            }`}
            draggable={false}
          />
        </div>
      </div>

      {/* Footer Info & Filmstrip Tray */}
      <div className="flex flex-col border-t border-white/10 bg-black/60 backdrop-blur-md z-20 safe-bottom">
        {/* Caption & Metadata bar */}
        <div className="flex items-center justify-between px-6 py-2.5 text-xs text-white/70">
          <div className="flex items-center gap-2 truncate max-w-[70%]">
            <span className="font-serif text-white text-sm font-light truncate">
              {currentPhoto.name.replace(/\.[^/.]+$/, "")}
            </span>
            {currentPhoto.isFeatured && (
              <span className="flex items-center gap-1 text-[10px] uppercase font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                <Sparkles className="w-2.5 h-2.5" /> Featured
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-white/50 text-[11px]">
            {currentPhoto.modifiedTime && (
              <span className="hidden sm:inline">
                {new Date(currentPhoto.modifiedTime).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
            <button
              onClick={() => setShowThumbnails((prev) => !prev)}
              className="text-white/70 hover:text-amber-400 transition underline underline-offset-4"
            >
              {showThumbnails ? "Hide Tray" : "Show Tray"}
            </button>
          </div>
        </div>

        {/* Thumbnail Filmstrip */}
        {showThumbnails && photos.length > 1 && (
          <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar scroll-smooth border-t border-white/5">
            {photos.map((photo, idx) => {
              const isSelected = idx === currentIndex;
              const thumbSrc = getOptimizedImageUrl(photo, "thumbnail");

              return (
                <button
                  key={photo.id || photo.driveFileId || photo.name || idx}
                  onClick={() => onSelectIndex(idx)}
                  className={`relative flex-shrink-0 w-16 h-12 rounded overflow-hidden transition-all duration-200 border-2 ${
                    isSelected
                      ? "border-amber-400 ring-2 ring-amber-400/40 scale-105 opacity-100"
                      : "border-transparent opacity-50 hover:opacity-90"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbSrc}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
