"use client";

import React, { useState, memo } from "react";
import { DriveMediaFile } from "@/lib/project-types";
import { Heart, Maximize2, Download, Sparkles, Check } from "lucide-react";
import { getOptimizedImageUrl, getImageSrcSet, getImageSizes } from "@/lib/image-optimizer";

interface GalleryPhotoCardProps {
  photo: DriveMediaFile;
  index: number;
  onClick: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (photoId: string, e: React.MouseEvent) => void;
  allowDownloads?: boolean;
  accessCode?: string;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (photoId: string, e: React.MouseEvent) => void;
}

function GalleryPhotoCardComponent({
  photo,
  index,
  onClick,
  isFavorite = false,
  onToggleFavorite,
  allowDownloads = false,
  accessCode,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: GalleryPhotoCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const driveId = photo.driveFileId || photo.id;
  
  // High quality edge-optimized grid thumbnail & responsive srcset
  const thumbUrl = getOptimizedImageUrl(photo, "grid");
  const srcSet = getImageSrcSet(photo, "grid");
  const sizes = getImageSizes("grid");

  const downloadUrl = accessCode
    ? `/api/photos/${driveId}?accessCode=${accessCode}&download=true`
    : `https://drive.google.com/uc?id=${driveId}&export=download`;

  const stableId = photo.id || photo.driveFileId;
  const isPriority = index < 8;

  return (
    <div
      onClick={() => onClick()}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-white/[0.03] border transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col aspect-[4/3] sm:aspect-square ${
        isSelected ? "border-amber-400 ring-2 ring-amber-400/40" : "border-white/10 hover:border-amber-400/50"
      }`}
      style={{ animationDelay: `${(index % 12) * 50}ms` }}
    >
      {/* Background loading pulse */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-amber-400/40 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Responsive Image element */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbUrl}
        srcSet={srcSet || undefined}
        sizes={sizes}
        alt={photo.name}
        loading={isPriority ? "eager" : "lazy"}
        fetchPriority={isPriority ? "high" : "auto"}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ease-out ${
          isLoaded ? "opacity-100 filter brightness-[0.9] group-hover:brightness-100" : "opacity-0"
        }`}
      />

      {/* Subtle bottom gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Top badges: Event, Featured, and Persistent Favorite/Selection */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {photo.eventName && (
            <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-amber-300 text-[10px] font-medium border border-white/10 tracking-wider">
              {photo.eventName}
            </span>
          )}

          {photo.isFeatured && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 backdrop-blur-md text-amber-300 border border-amber-500/40 text-[9px] font-semibold uppercase flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Featured
            </span>
          )}
        </div>

        {/* Selection mode checkbox OR Persistent Favorite Heart */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {isSelectionMode ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleSelect) onToggleSelect(stableId, e);
              }}
              className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg active:scale-90 ${
                isSelected
                  ? "bg-amber-400 text-black border-2 border-amber-300 scale-105"
                  : "bg-black/70 text-transparent hover:text-white/60 border-2 border-white/60 hover:border-white"
              }`}
              title={isSelected ? "Remove from album selection" : "Select for album"}
              aria-label={isSelected ? "Deselect photo for album" : "Select photo for album"}
            >
              <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? "text-black" : ""}`} />
            </button>
          ) : (
            isFavorite && (
              <div
                className="w-6 h-6 rounded-full bg-rose-500/90 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 border border-rose-400/40 transition-transform duration-300 scale-100"
                title="Saved in Favorites"
              >
                <Heart className="w-3.5 h-3.5 fill-white" />
              </div>
            )
          )}
        </div>
      </div>

      {/* Hover Action Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col justify-end p-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="truncate max-w-[65%]">
            <p className="text-white text-xs font-serif font-light truncate drop-shadow">
              {photo.name.replace(/\.[^/.]+$/, "")}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Download button */}
            {allowDownloads && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={photo.name}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-amber-400 text-white hover:text-black border border-white/10 transition-colors shadow-lg"
                title="Download Photo"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Favorite button */}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(stableId, e);
                }}
                className={`p-1.5 rounded-lg border transition-colors shadow-lg cursor-pointer ${
                  isFavorite
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                    : "bg-black/60 text-white hover:text-rose-400 border-white/10"
                }`}
                title={isFavorite ? "Remove favorite" : "Add to favorites"}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-rose-400" : ""}`} />
              </button>
            )}

            {/* View Fullscreen */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="p-1.5 rounded-lg bg-amber-400 text-black border border-amber-300 hover:bg-amber-300 transition-colors shadow-lg cursor-pointer"
              title="Open Photo"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(GalleryPhotoCardComponent);
