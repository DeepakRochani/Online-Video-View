"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { DriveVideoFile } from "@/lib/project-types";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Maximize, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Film, 
  AlertCircle, 
  RefreshCw, 
  Heart, 
  Clock,
  ExternalLink,
  Share2
} from "lucide-react";

export type PlayerState =
  | "idle"
  | "loading"
  | "metadata"
  | "ready"
  | "playing"
  | "paused"
  | "buffering"
  | "error";

interface VideoModalProps {
  videos: DriveVideoFile[];
  currentIndex: number;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  allowDownloads?: boolean;
  allowFullscreen?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (videoId: string, e?: React.MouseEvent) => void;
  accessCode?: string;
  onShare?: (video: DriveVideoFile) => void;
}

export default function VideoModal({
  videos,
  currentIndex,
  onClose,
  onSelectIndex,
  allowDownloads = true,
  allowFullscreen = true,
  isFavorite = false,
  onToggleFavorite,
  accessCode,
  onShare,
}: VideoModalProps) {
  const currentVideo = videos[currentIndex];
  const videoRef = useRef<HTMLVideoElement>(null);
  const slowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeTokenRef = useRef<number>(0);
  const hasRecordedPlayRef = useRef<boolean>(false);
  const hasRecordedCompleteRef = useRef<boolean>(false);
  const autoRetryCountRef = useRef<number>(0);

  const [playerState, setPlayerState] = useState<PlayerState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [usePreviewFallback, setUsePreviewFallback] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [retryKey, setRetryKey] = useState(0);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < videos.length - 1;

  const reportAnalytics = useCallback((eventType: "play" | "completion") => {
    if (!accessCode || !currentVideo) return;
    fetch(`/api/gallery/${accessCode}/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        videoId: currentVideo.id || currentVideo.driveFileId,
        mediaTitle: currentVideo.name || (currentVideo as any).title || "Wedding Film",
        eventName: currentVideo.eventName,
        mediaType: "VIDEO",
      }),
    }).catch(() => {});
  }, [accessCode, currentVideo]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setPlayerState("playing");
      }).catch((err) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Video] Play action prevented:", err);
        }
        setPlayerState("paused");
      });
    } else {
      videoRef.current.pause();
      setPlayerState("paused");
    }
  }, []);

  const handleClose = useCallback(() => {
    activeTokenRef.current += 1;
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    const vid = videoRef.current;
    if (vid) {
      try {
        vid.pause();
        vid.removeAttribute("src");
        vid.load();
      } catch {}
    }
    setPlayerState("idle");
    setErrorMessage("");
    onClose();
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowLeft" && hasPrev) {
        onSelectIndex(currentIndex - 1);
      } else if (e.key === "ArrowRight" && hasNext) {
        onSelectIndex(currentIndex + 1);
      } else if (e.key === " " && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, hasPrev, hasNext, handleClose, onSelectIndex, togglePlay]);

  // Clean up video media resources on unmount
  useEffect(() => {
    const vid = videoRef.current;
    return () => {
      activeTokenRef.current += 1;
      if (vid) {
        try {
          vid.pause();
          vid.removeAttribute("src");
          vid.load();
        } catch {}
      }
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
    };
  }, []);

  // Reset video player state when video changes or retries
  useEffect(() => {
    const currentToken = ++activeTokenRef.current;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayerState("loading");
    setErrorMessage("");
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setIsSlowLoading(false);
    setUsePreviewFallback(false);
    hasRecordedPlayRef.current = false;
    hasRecordedCompleteRef.current = false;
    autoRetryCountRef.current = 0;

    // Slow loading watchdog: informational notice after 10s.
    // NEVER forces playerState to "error" or "stalled" - stream continues in background!
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => {
      if (activeTokenRef.current === currentToken) {
        setIsSlowLoading(true);
      }
    }, 10000);

    return () => {
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
    };
  }, [currentIndex, retryKey]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    setCurrentTime(cur);
    if (dur && dur > 0) {
      const pct = (cur / dur) * 100;
      setProgress(pct);
      // Track completion at 90%
      if (pct >= 90 && !hasRecordedCompleteRef.current) {
        hasRecordedCompleteRef.current = true;
        reportAnalytics("completion");
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current || !videoRef.current.duration) return;
    const seekTo = (parseFloat(e.target.value) / 100) * videoRef.current.duration;
    videoRef.current.currentTime = seekTo;
    setProgress(parseFloat(e.target.value));
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  const handleRetry = () => {
    activeTokenRef.current += 1;
    autoRetryCountRef.current = 0;
    setErrorMessage("");
    setIsSlowLoading(false);
    setUsePreviewFallback(false);
    setPlayerState("loading");
    setRetryKey((prev) => prev + 1);
  };

  const formatTime = (secs: number, isCurrent = false) => {
    if (isNaN(secs) || secs < 0) return "--:--";
    if (secs === 0 && !isCurrent) return "--:--";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!currentVideo) return null;

  const searchParamsStr = typeof window !== "undefined" ? window.location.search : "";
  const urlParams = new URLSearchParams(searchParamsStr);
  const isAdmin = urlParams.get("adminPreview") === "true";
  const isPrev = urlParams.get("preview") === "true";

  const videoId = currentVideo.id || currentVideo.driveFileId;
  const streamParams = new URLSearchParams();
  if (accessCode) streamParams.set("accessCode", accessCode);
  if (isAdmin) streamParams.set("adminPreview", "true");
  if (isPrev) streamParams.set("preview", "true");
  if (retryKey > 0) streamParams.set("t", retryKey.toString());
  const streamUrl = `/api/videos/${videoId}/stream?${streamParams.toString()}`;

  const dlParams = new URLSearchParams();
  if (accessCode) dlParams.set("accessCode", accessCode);
  if (isAdmin) dlParams.set("adminPreview", "true");
  if (isPrev) dlParams.set("preview", "true");
  dlParams.set("download", "true");
  const downloadUrl = `/api/videos/${videoId}/stream?${dlParams.toString()}`;

  const cleanTitle = currentVideo.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 select-none">
      {/* ── Top Bar Header ── */}
      <div className="absolute top-0 inset-x-0 p-4 sm:p-6 safe-top flex items-center justify-between z-30 bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        <div className="flex items-center gap-3 min-w-0 pr-4">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/25 flex-shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-sm sm:text-base md:text-lg capitalize truncate">
              {cleanTitle}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
              <span>
                Film {currentIndex + 1} of {videos.length}
              </span>
              {currentVideo.eventName && (
                <>
                  <span className="text-white/20">&bull;</span>
                  <span className="px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-sans font-semibold">
                    {currentVideo.eventName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Favorite Toggle inside player */}
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(currentVideo.id || currentVideo.driveFileId)}
              className={`p-2.5 rounded-xl border backdrop-blur-md transition-all duration-200 active:scale-110 cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                isFavorite
                  ? "bg-rose-500/90 text-white border-rose-400/50 shadow-lg shadow-rose-500/20"
                  : "bg-white/10 hover:bg-white/20 text-slate-300 hover:text-rose-400 border-white/10"
              }`}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
              <span className="hidden sm:inline">{isFavorite ? "Favorited" : "Favorite"}</span>
            </button>
          )}

          {/* Share video */}
          {onShare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShare(currentVideo);
              }}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-all backdrop-blur-md cursor-pointer"
              title="Share video"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Share</span>
            </button>
          )}

          {/* Download (if enabled by photographer) */}
          {allowDownloads && (
            <a
              href={downloadUrl}
              download={currentVideo.name}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-all backdrop-blur-md"
              title="Download master video file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Download</span>
            </a>
          )}

          {/* Close */}
          <button
            onClick={handleClose}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all border border-white/10 cursor-pointer"
            title="Close (Esc)"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Main Cinema Video View ── */}
      <div className="relative w-full h-full max-w-6xl max-h-[84vh] p-2 sm:p-4 flex items-center justify-center">
        {/* Navigation Left */}
        {hasPrev && (
          <button
            onClick={() => onSelectIndex(currentIndex - 1)}
            className="absolute left-2 sm:left-6 z-30 p-3 rounded-full bg-black/70 hover:bg-amber-400 hover:text-black text-white backdrop-blur-md border border-white/20 transition-all shadow-2xl hover:scale-110 cursor-pointer"
            title="Previous film (Left arrow)"
            aria-label="Previous film"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Navigation Right */}
        {hasNext && (
          <button
            onClick={() => onSelectIndex(currentIndex + 1)}
            className="absolute right-2 sm:right-6 z-30 p-3 rounded-full bg-black/70 hover:bg-amber-400 hover:text-black text-white backdrop-blur-md border border-white/20 transition-all shadow-2xl hover:scale-110 cursor-pointer"
            title="Next film (Right arrow)"
            aria-label="Next film"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Video Canvas Box */}
        <div className="relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden bg-black flex items-center justify-center border border-white/10 shadow-2xl">
          {/* Loading / Metadata Initializing State */}
          {(playerState === "loading" || playerState === "metadata") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 z-20 animate-in fade-in duration-200">
              <div className="loader-spin w-10 h-10 border-3 border-amber-400 border-t-transparent" />
              <span className="text-xs text-amber-200/90 font-serif tracking-widest uppercase">
                {playerState === "metadata" ? "Initializing film..." : "Loading film..."}
              </span>
              {/* Informational slow-load indicator - non-blocking, video keeps loading */}
              {isSlowLoading && (
                <div className="mt-2 px-3.5 py-1.5 rounded-full bg-black/70 border border-amber-500/30 flex items-center gap-2 text-[11px] text-amber-300/90 backdrop-blur-md animate-in fade-in">
                  <Clock className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                  <span>Connecting to Google Drive stream... Still loading</span>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="ml-1 text-amber-200 hover:text-white underline cursor-pointer text-[10px] uppercase font-semibold"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Buffering Indicator during active playback */}
          {playerState === "buffering" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 z-20 pointer-events-none animate-in fade-in">
              <div className="loader-spin w-8 h-8 border-2 border-amber-300 border-t-transparent" />
              <span className="text-[11px] text-amber-200 font-mono tracking-wide">Buffering...</span>
            </div>
          )}

          {/* Fatal Error State View */}
          {playerState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/95 z-20 p-6 text-center animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Unable to play this video.</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  {errorMessage || "The video could not be loaded. Please click Retry."}
                </p>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleRetry}
                  className="wedding-gold-btn text-xs px-5 py-2.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Stream</span>
                </button>

                {currentVideo.webViewLink && (
                  <a
                    href={currentVideo.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="glass-button text-xs px-4 py-2.5 flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    <span>Open in Google Drive</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {!usePreviewFallback && (
            <video
              ref={videoRef}
              key={`${currentVideo.id || currentVideo.driveFileId}-${retryKey}`}
              src={streamUrl}
              className="w-full h-full object-contain cursor-pointer"
              playsInline
              preload="auto"
              autoPlay
            onLoadStart={() => {
              if (process.env.NODE_ENV !== "production") {
                console.log("[Video] loadstart", streamUrl);
              }
              setPlayerState("loading");
            }}
            onLoadedMetadata={() => {
              const vid = videoRef.current;
              if (process.env.NODE_ENV !== "production") {
                console.log("[Video] loadedmetadata", {
                  duration: vid?.duration,
                  width: vid?.videoWidth,
                  height: vid?.videoHeight,
                  readyState: vid?.readyState,
                });
              }
              if (vid) {
                setDuration(vid.duration);
                vid.playbackRate = playbackRate;
              }
              setPlayerState((prev) => (prev === "loading" ? "metadata" : prev));
            }}
            onLoadedData={() => {
              if (process.env.NODE_ENV !== "production") {
                console.log("[Video] loadeddata");
              }
              setPlayerState((prev) => (prev === "loading" || prev === "metadata" ? "ready" : prev));
            }}
            onCanPlay={() => {
              const token = activeTokenRef.current;
              if (process.env.NODE_ENV !== "production") {
                console.log("[Video] canplay", { readyState: videoRef.current?.readyState });
              }
              setIsSlowLoading(false);

              if (videoRef.current && !videoRef.current.paused) {
                setPlayerState("playing");
              } else if (videoRef.current) {
                videoRef.current
                  .play()
                  .then(() => {
                    if (activeTokenRef.current === token) {
                      setPlayerState("playing");
                      if (!hasRecordedPlayRef.current) {
                        hasRecordedPlayRef.current = true;
                        reportAnalytics("play");
                      }
                    }
                  })
                  .catch((err) => {
                    if (process.env.NODE_ENV !== "production") {
                      console.log("[Video] Autoplay prevented, player paused:", err);
                    }
                    if (activeTokenRef.current === token) {
                      setPlayerState("paused");
                    }
                  });
              }
            }}
            onCanPlayThrough={() => {
              if (process.env.NODE_ENV !== "production") {
                console.log("[Video] canplaythrough");
              }
            }}
            onPlay={() => {
              if (process.env.NODE_ENV !== "production") {
                console.log("[Video] play");
              }
            }}
            onPlaying={() => {
              if (process.env.NODE_ENV !== "production") {
                console.log("[Video] playing");
              }
              setIsSlowLoading(false);
              setPlayerState("playing");
              if (!hasRecordedPlayRef.current) {
                hasRecordedPlayRef.current = true;
                reportAnalytics("play");
              }
            }}
            onWaiting={() => {
              if (process.env.NODE_ENV !== "production") {
                console.log("[Video] waiting");
              }
              setPlayerState((prev) => (prev === "playing" ? "buffering" : prev));
            }}
            onStalled={() => {
              if (process.env.NODE_ENV !== "production") {
                console.log("[Video] stalled");
              }
              // A slow Google Drive stream is still a valid loading state. Never switch to error.
              setPlayerState((prev) => (prev === "playing" ? "buffering" : prev));
            }}
            onProgress={() => {
              // Video is actively downloading data from stream
            }}
            onTimeUpdate={handleTimeUpdate}
            onPause={() => {
              if (process.env.NODE_ENV !== "production") {
                console.log("[Video] pause");
              }
              setPlayerState((prev) => (prev === "playing" || prev === "ready" ? "paused" : prev));
            }}
            onEnded={() => {
              if (process.env.NODE_ENV !== "production") {
                console.log("[Video] ended");
              }
              if (!hasRecordedCompleteRef.current) {
                hasRecordedCompleteRef.current = true;
                reportAnalytics("completion");
              }
              if (hasNext) {
                onSelectIndex(currentIndex + 1);
              }
            }}
            onAbort={() => {
              if (process.env.NODE_ENV !== "production") {
                console.log("[Video] abort");
              }
            }}
            onEmptied={() => {
              if (process.env.NODE_ENV !== "production") {
                console.log("[Video] emptied");
              }
            }}
            onError={(e) => {
              const video = e.currentTarget;
              const mediaErr = video.error;

              // If aborted (code 1), do not show error screen
              if (mediaErr?.code === 1) {
                return;
              }

              // If stream failed with format/server error (e.g. 502 Bad Gateway due to Drive anonymous quota),
              // fall back to Google Drive's official embedded preview player inside the modal canvas
              const driveId = currentVideo.driveFileId || currentVideo.id;
              if (driveId && (mediaErr?.code === 4 || mediaErr?.code === 2)) {
                if (process.env.NODE_ENV !== "production") {
                  console.warn("[Video] Direct binary stream failed. Seamlessly activating Google Drive preview stream...");
                }
                setUsePreviewFallback(true);
                setPlayerState("ready");
                return;
              }

              let clientMessage = "Unable to play this video.";
              if (mediaErr?.code === 2) {
                clientMessage = "Network error while loading video. Please check your connection.";
              } else if (mediaErr?.code === 3) {
                clientMessage = "The video could not be decoded.";
              } else if (mediaErr?.code === 4) {
                clientMessage = "The video stream format is not supported or server returned an error.";
              }

              setErrorMessage(clientMessage);
              setPlayerState("error");
            }}
            onClick={togglePlay}
          />
          )}

          {usePreviewFallback && (
            <iframe
              src={`https://drive.google.com/file/d/${currentVideo.driveFileId || currentVideo.id}/preview`}
              className="w-full h-full border-0 rounded-2xl sm:rounded-3xl bg-black"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              title={cleanTitle}
            />
          )}
        </div>
      </div>

      {/* ── Bottom Custom Controller Bar (Only shown for HTML5 stream, iframe has native controls) ── */}
      {!usePreviewFallback && (
        <div className="absolute bottom-4 inset-x-4 max-w-4xl mx-auto z-30 glass-panel p-3 sm:p-4 border border-white/15 shadow-2xl safe-pb-margin">
          {/* Progress Timeline Scrubber */}
          <div className="relative flex items-center mb-3 group">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeek}
            className="w-full h-1.5 sm:h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
          />
        </div>

        {/* Video Control Bar Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2 sm:p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold transition-all shadow-lg hover:scale-105 cursor-pointer"
              title={playerState === "playing" ? "Pause (Space)" : "Play (Space)"}
              aria-label={playerState === "playing" ? "Pause" : "Play"}
            >
              {playerState === "playing" ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Mute/Unmute */}
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-all cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Time Stamp: prevents misleading 00:00 / 00:00 while metadata is loading */}
            <span className="text-[11px] sm:text-xs font-mono text-slate-300">
              {formatTime(currentTime, true)} / {formatTime(duration, false)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Speed selection */}
            {[1, 1.25, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => {
                  setPlaybackRate(speed);
                  if (videoRef.current) videoRef.current.playbackRate = speed;
                }}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono transition-all cursor-pointer ${
                  playbackRate === speed
                    ? "bg-amber-400 text-black font-bold"
                    : "bg-white/10 text-slate-300 hover:bg-white/20 hidden sm:inline-block"
                }`}
                title={`Playback speed ${speed}x`}
              >
                {speed}x
              </button>
            ))}

            {/* Fullscreen */}
            {allowFullscreen && (
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-all cursor-pointer"
                title="Fullscreen"
                aria-label="Toggle Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
