"use client";

import React, { memo } from "react";
import { DriveVideoFile } from "@/lib/project-types";
import { Play, Download, Film, Heart, Check } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/image-optimizer";

interface GalleryVideoCardProps {
  video: DriveVideoFile;
  onPlay: (video: DriveVideoFile) => void;
  index: number;
  allowDownloads?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (videoId: string, e: React.MouseEvent) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (videoId: string, e: React.MouseEvent) => void;
}

function formatBytes(bytesStr: string): string {
  const bytes = parseInt(bytesStr, 10);
  if (isNaN(bytes) || bytes === 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function GalleryVideoCardComponent({ 
  video, 
  onPlay, 
  index, 
  allowDownloads = false,
  isFavorite = false,
  onToggleFavorite,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: GalleryVideoCardProps) {
  const formattedSize = formatBytes(video.size);
  // Clean up title name (strip .mp4 etc.)
  const cleanTitle = video.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  const stableId = video.id || video.driveFileId;
  const thumbUrl = getOptimizedImageUrl(video, "grid");

  return (
    <div
      onClick={() => onPlay(video)}
      className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-amber-400/50 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900 flex items-center justify-center">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt={video.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-[0.92] group-hover:brightness-100"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600 gap-2">
            <Film className="w-12 h-12 stroke-[1.2]" />
            <span className="text-xs uppercase tracking-widest font-mono">Video Stream</span>
          </div>
        )}

        {/* Ambient Dark Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-50 transition-opacity" />

        {/* Play Icon Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-13 h-13 rounded-full bg-amber-400/90 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-400/25 transform scale-90 group-hover:scale-110 group-hover:bg-amber-300 transition-all duration-300">
            <Play className="w-5 h-5 fill-current translate-x-0.5" />
          </div>
        </div>

        {/* Event Category Tag */}
        {video.eventName && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-semibold text-amber-200 border border-amber-400/30 uppercase tracking-wider">
            {video.eventName}
          </div>
        )}

        {/* Selection mode Checkbox OR Favorite Button (Top-Right) */}
        {isSelectionMode ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleSelect) onToggleSelect(stableId, e);
            }}
            className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 z-20 cursor-pointer shadow-lg active:scale-90 ${
              isSelected
                ? "bg-amber-400 text-black border-2 border-amber-300 scale-105"
                : "bg-black/70 text-transparent hover:text-white/60 border-2 border-white/60 hover:border-white"
            }`}
            title={isSelected ? "Remove from album selection" : "Select for album"}
            aria-label={isSelected ? "Deselect video for album" : "Select video for album"}
          >
            <Check className={`w-4 h-4 stroke-[3] ${isSelected ? "text-black" : ""}`} />
          </button>
        ) : (
          onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(stableId, e);
              }}
              className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-200 active:scale-125 z-10 cursor-pointer ${
                isFavorite
                  ? "bg-rose-500/90 text-white shadow-lg shadow-rose-500/30 scale-105 border border-rose-400/40"
                  : "bg-black/60 text-slate-300 hover:text-rose-400 hover:bg-black/80 border border-white/10"
              }`}
              title={isFavorite ? "Remove from favorites" : "Save to favorites"}
              aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`} />
            </button>
          )
        )}

        {/* File Size / Quality Badge */}
        {formattedSize && (
          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-mono text-slate-300 border border-white/10">
            {formattedSize}
          </div>
        )}
      </div>

      {/* Title & Details */}
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-100 truncate group-hover:text-amber-300 transition-colors capitalize">
            {cleanTitle}
          </h4>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
            {video.name}
          </p>
        </div>

        {/* Direct Download Button (Only when allowDownloads is enabled by photographer) */}
        {allowDownloads && (
          <a
            href={`/api/drive/stream/${video.id}?download=true`}
            download={video.name}
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-xl bg-white/5 hover:bg-amber-400/20 hover:text-amber-300 text-slate-400 transition-all border border-white/10"
            title="Download master video file"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export default memo(GalleryVideoCardComponent);
