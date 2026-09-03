"use client";

import React, { memo } from "react";
import { DriveEventCategory } from "@/lib/project-types";
import { Layers, ArrowRight } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/image-optimizer";

interface EventCardProps {
  event: DriveEventCategory;
  onClick: () => void;
  index: number;
}

function EventCardComponent({ event, onClick, index }: EventCardProps) {
  const coverUrl = event.coverImage ? getOptimizedImageUrl(event.coverImage, "grid") : "";

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-amber-400/60 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-amber-500/15 flex flex-col justify-end aspect-[4/3] sm:aspect-[16/10]"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Background Image / Cover */}
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={event.name}
          className="absolute inset-0 w-full h-full object-cover filter brightness-[0.6] group-hover:brightness-[0.75] group-hover:scale-108 transition-all duration-700"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-950/40 via-slate-900 to-slate-950">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl" />
        </div>
      )}

      {/* Gradient Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90 group-hover:opacity-80 transition-opacity" />

      {/* Top Floating Badge */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md text-amber-300 border border-amber-400/30 flex items-center gap-1.5 font-mono text-xs font-bold tracking-wider">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span className="text-amber-400/40">/</span>
          <span className="text-[10px] uppercase text-slate-300">Chapter</span>
        </div>

        <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-amber-200 font-mono text-[11px] font-semibold border border-white/10 flex items-center gap-1.5">
          {event.photoCount !== undefined && event.photoCount > 0 && (
            <span>{event.photoCount} {event.photoCount === 1 ? "Photo" : "Photos"}</span>
          )}
          {event.photoCount !== undefined && event.photoCount > 0 && event.videoCount !== undefined && event.videoCount > 0 && (
            <span className="text-amber-400/50">&bull;</span>
          )}
          {event.videoCount !== undefined && event.videoCount > 0 && (
            <span>{event.videoCount} {event.videoCount === 1 ? "Film" : "Films"}</span>
          )}
          {((!event.photoCount && !event.videoCount) || (event.photoCount === 0 && event.videoCount === 0)) && (
            <span>{event.count} {event.count === 1 ? "Item" : "Items"}</span>
          )}
        </span>
      </div>

      {/* Card Bottom Content */}
      <div className="relative z-10 p-5 sm:p-6 space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-300/80 font-bold">
          Chapter {String(index + 1).padStart(2, "0")}
        </div>
        <h3 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wide uppercase group-hover:text-amber-300 transition-colors">
          {event.name}
        </h3>

        <div className="flex items-center justify-between text-xs text-slate-300 font-medium pt-1">
          <span className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Explore Memories</span>
          </span>

          <div className="w-7 h-7 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 flex items-center justify-center transform group-hover:translate-x-1 group-hover:bg-amber-400 group-hover:text-black transition-all">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(EventCardComponent);
