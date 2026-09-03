"use client";

import React, { useState } from "react";
import { Film, Play, HardDrive, Search, RefreshCw, Sparkles, Folder, Download } from "lucide-react";
import { DriveVideoFile } from "@/lib/project-types";

interface VideoGalleryProps {
  files: DriveVideoFile[];
  folderName?: string;
  selectedId: string | null;
  onSelect: (file: DriveVideoFile) => void;
  onRescan?: () => void;
  isScanning?: boolean;
  folderUrl: string;
}

function formatBytes(bytes: string | undefined): string {
  const n = parseInt(bytes ?? "0", 10);
  if (!n) return "";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + " MB";
  return (n / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function cleanTitle(name: string): string {
  return name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
}

export default function VideoGallery({
  files,
  folderName = "Google Drive Folder",
  selectedId,
  onSelect,
  onRescan,
  isScanning = false,
  folderUrl,
}: VideoGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<string>("all");

  // Extract unique events/categories
  const events = Array.from(
    new Set(files.map((f) => f.eventName).filter(Boolean))
  ) as string[];

  // Filter files
  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.eventName && file.eventName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedEvent !== "all" && file.eventName !== selectedEvent) return false;
    return true;
  });

  if (files.length === 0) {
    return (
      <section className="glass-panel p-10 flex flex-col items-center gap-3 text-center border border-white/10" id="video-gallery">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-amber-300 flex items-center justify-center">
          <Film size={32} className="stroke-[1.5]" />
        </div>
        <h3 className="text-lg font-serif font-bold text-white">No videos found in this folder</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Google Drive API accessed the folder successfully, but no video files (.mp4, .mov, .mkv, etc.) were found.
        </p>
        {folderUrl && (
          <a
            href={folderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber-300 hover:text-amber-200 underline mt-2"
          >
            Open folder in Google Drive ↗
          </a>
        )}
      </section>
    );
  }

  return (
    <section className="glass-panel p-6 flex flex-col gap-6 border border-white/10" id="video-gallery">
      {/* ── Top Header with Folder Title & Sync Button ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold">
              Google Drive Folder
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight mt-0.5">
            {folderName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {files.length} {files.length === 1 ? "Video" : "Videos"} Found
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRescan && (
            <button
              onClick={onRescan}
              disabled={isScanning}
              className="glass-button text-xs px-3.5 py-2"
              title="Rescan Google Drive folder for new videos"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isScanning ? "animate-spin" : ""}`} />
              <span>{isScanning ? "Syncing..." : "Sync Google Drive"}</span>
            </button>
          )}

          {folderUrl && (
            <a
              href={folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs border border-white/10 transition-colors"
              title="Open folder in Google Drive"
            >
              Drive ↗
            </a>
          )}
        </div>
      </div>

      {/* ── Search & Event Filters ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search videos in folder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input pl-10 pr-4 py-2 text-xs"
          />
        </div>

        {/* Event Chips (if subfolders detected) */}
        {events.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
            <button
              onClick={() => setSelectedEvent("all")}
              className={`chip text-[11px] ${selectedEvent === "all" ? "active" : ""}`}
            >
              All ({files.length})
            </button>
            {events.map((evt) => {
              const count = files.filter((f) => f.eventName === evt).length;
              return (
                <button
                  key={evt}
                  onClick={() => setSelectedEvent(evt)}
                  className={`chip text-[11px] ${selectedEvent === evt ? "active" : ""}`}
                >
                  {evt} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Videos Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFiles.map((file) => {
          const isSelected = file.id === selectedId;
          const sizeStr = formatBytes(file.size);

          return (
            <div
              key={file.id}
              onClick={() => onSelect(file)}
              className={`group relative flex flex-col rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 text-left ${
                isSelected
                  ? "border-amber-400/80 ring-2 ring-amber-400/30 bg-amber-400/10 shadow-lg shadow-amber-400/10"
                  : "border-white/10 hover:border-amber-400/40 bg-white/[0.03] hover:bg-white/[0.06] hover:-translate-y-1"
              }`}
              id={`video-card-${file.id}`}
            >
              {/* Thumbnail Container */}
              <div className="relative w-full aspect-video bg-slate-900 overflow-hidden flex items-center justify-center">
                {file.thumbnailLink ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.thumbnailLink}
                    alt={file.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-90 group-hover:brightness-100"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1">
                    <Film size={32} className="stroke-[1.3]" />
                    <span className="text-[10px] uppercase tracking-widest font-mono">Master Video</span>
                  </div>
                )}

                {/* Ambient Dark Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                {/* Event Category Tag */}
                {file.eventName && file.eventName !== "Main Collection" && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-200 border border-amber-400/30 backdrop-blur-md text-[10px] font-semibold">
                    {file.eventName}
                  </div>
                )}

                {/* Play Button Overlay */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-all ${
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-105 transition-transform">
                    <Play size={18} className="fill-current translate-x-0.5" />
                  </div>
                </div>

                {/* File size badge */}
                {sizeStr && (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-slate-300 border border-white/10">
                    {sizeStr}
                  </div>
                )}

                {/* Currently playing badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-amber-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse">
                    PLAYING
                  </div>
                )}
              </div>

              {/* Info & Download Button */}
              <div className="p-3.5 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-white truncate capitalize group-hover:text-amber-300 transition-colors">
                    {cleanTitle(file.name)}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                    {file.name}
                  </p>
                </div>

                <a
                  href={`/api/drive/stream/${file.id}?download=true`}
                  download={file.name}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-400/20 hover:text-amber-300 text-slate-400 transition-all border border-white/10"
                  title="Download master video"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
