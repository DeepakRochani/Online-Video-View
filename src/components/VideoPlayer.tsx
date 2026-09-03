"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
} from "lucide-react";

interface VideoPlayerProps {
  src: string;
}

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

function formatTime(secs: number): string {
  if (isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoPlayer({ src }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState(false);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state whenever src changes
  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(false);
  }, [src]);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (playing) scheduleHide();
  }, [playing, scheduleHide]);

  useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  // Sync speed
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  // Fullscreen listener
  useEffect(() => {
    const onFSChange = () =>
      setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
      scheduleHide();
    } else {
      v.pause();
      setPlaying(false);
      setShowControls(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    }
  };

  const seek = (val: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setMuted(val === 0);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
    if (!next && volume === 0) {
      v.volume = 0.5;
      setVolume(0.5);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const skipBy = (secs: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + secs), duration);
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  if (!src) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden bg-black/80"
      style={{ aspectRatio: "16/9" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && scheduleHide()}
      onClick={togglePlay}
    >
      {/* ── Video element ── */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => { setPlaying(false); setShowControls(true); }}
        onError={() => setError(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        preload="metadata"
        playsInline
      />

      {/* ── Error state ── */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3">
          <span className="text-4xl">⚠️</span>
          <p className="text-red-400 font-semibold">Unable to load video</p>
          <p className="text-slate-400 text-sm text-center max-w-xs">
            Check that the URL points to a direct, accessible video file (MP4, WebM, etc.)
          </p>
        </div>
      )}

      {/* ── Controls overlay ── */}
      <div
        className="absolute inset-0 flex flex-col justify-end pointer-events-none"
        style={{
          opacity: showControls || !playing ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        <div className="relative pointer-events-auto px-4 pb-4 flex flex-col gap-3">
          {/* ── Progress bar ── */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300 w-10 text-center shrink-0">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 relative" onClick={(e) => e.stopPropagation()}>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={(e) => seek(Number(e.target.value))}
                className="w-full"
                style={{
                  background: `linear-gradient(to right, #7c3aed ${progressPct}%, rgba(255,255,255,0.15) ${progressPct}%)`,
                }}
              />
            </div>
            <span className="text-xs text-slate-300 w-10 text-center shrink-0">
              {formatTime(duration)}
            </span>
          </div>

          {/* ── Bottom controls row ── */}
          <div
            className="flex items-center justify-between gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: play + skip + volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="glass-button p-2"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <button
                onClick={() => skipBy(-10)}
                className="glass-button p-2"
                aria-label="Skip back 10s"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => skipBy(10)}
                className="glass-button p-2"
                aria-label="Skip forward 10s"
              >
                <RotateCw size={16} />
              </button>

              {/* Volume */}
              <button onClick={toggleMute} className="glass-button p-2" aria-label="Toggle mute">
                {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <div className="w-20">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-full"
                  style={{
                    background: `linear-gradient(to right, #7c3aed ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.15) ${(muted ? 0 : volume) * 100}%)`,
                  }}
                />
              </div>
            </div>

            {/* Right: speed + fullscreen */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`chip text-xs px-2 py-1 ${speed === s ? "active" : ""}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <button
                onClick={toggleFullscreen}
                className="glass-button p-2"
                aria-label="Toggle fullscreen"
              >
                {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
