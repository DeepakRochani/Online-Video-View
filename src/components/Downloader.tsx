"use client";

import { useState } from "react";
import { Download, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

const BACKEND_URL = "http://localhost:8000";

interface DownloaderProps {
  videoUrl: string;
}

type Status = "idle" | "loading" | "success" | "error";

export default function Downloader({ videoUrl }: DownloaderProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleDownload = async () => {
    if (!videoUrl.trim()) return;
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        setStatus("success");
        setMessage(data?.message ?? "Download started successfully!");
      } else {
        const err = await res.text().catch(() => "");
        setStatus("error");
        setMessage(err || `Server returned ${res.status}`);
      }
    } catch (e) {
      setStatus("error");
      setMessage(
        e instanceof Error && e.message.includes("fetch")
          ? `Cannot reach backend at ${BACKEND_URL}. Make sure your Python server is running.`
          : String(e)
      );
    }
  };

  const reset = () => { setStatus("idle"); setMessage(""); };

  return (
    <div className="glass-panel p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-500/30">
          <Download size={20} className="text-violet-300" />
        </div>
        <div>
          <h2 className="font-semibold text-white text-base leading-tight">Download Video</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Sends the URL to your local backend at{" "}
            <code className="text-violet-300 bg-violet-500/10 px-1 rounded">{BACKEND_URL}</code>
          </p>
        </div>
      </div>

      {/* URL preview */}
      {videoUrl ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/10">
          <ArrowRight size={14} className="text-slate-400 shrink-0" />
          <span className="text-slate-300 text-sm truncate">{videoUrl}</span>
        </div>
      ) : (
        <p className="text-slate-500 text-sm italic">
          Enter a video URL above to enable download.
        </p>
      )}

      {/* Feedback */}
      {status === "success" && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 fade-in">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-emerald-300 text-sm">{message}</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 fade-in">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{message}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          disabled={!videoUrl.trim() || status === "loading"}
          className="accent-button flex-1 px-4 py-3 text-sm"
          id="download-button"
        >
          {status === "loading" ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sending to Backend…
            </>
          ) : (
            <>
              <Download size={16} />
              Download Video
            </>
          )}
        </button>

        {(status === "success" || status === "error") && (
          <button
            onClick={reset}
            className="glass-button px-4 py-3 text-sm"
          >
            Reset
          </button>
        )}
      </div>

      {/* Payload preview */}
      <details className="group">
        <summary className="text-xs text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors">
          View request payload
        </summary>
        <pre className="mt-2 p-3 rounded-xl bg-black/30 border border-white/8 text-xs text-slate-300 overflow-auto">
          {JSON.stringify({ url: videoUrl || "<video-url>" }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
