"use client";

import React, { useState, useCallback } from "react";
import { FolderOpen, ArrowRight, AlertCircle, Info, Sparkles } from "lucide-react";
import { extractGoogleDriveFolderId } from "@/lib/drive-parser";

interface FolderInputProps {
  onFolderLoaded: (folderId: string, folderUrl: string) => void;
  isLoading: boolean;
}

export default function FolderInput({ onFolderLoaded, isLoading }: FolderInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLoad = useCallback(() => {
    setError(null);
    const trimmed = inputValue.trim();

    if (!trimmed) {
      setError("Please enter a Google Drive folder link or folder ID.");
      return;
    }

    const folderId = extractGoogleDriveFolderId(trimmed);
    if (!folderId) {
      setError(
        "Could not extract a valid Google Drive folder ID. " +
          "Please paste a valid link (e.g. https://drive.google.com/drive/folders/ABC123XYZ?usp=drive_link)."
      );
      return;
    }

    onFolderLoaded(folderId, trimmed);
  }, [inputValue, onFolderLoaded]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleLoad();
  };

  return (
    <section className="glass-panel p-6 flex flex-col gap-4 border border-white/10" id="folder-input-panel">
      {/* Label */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
          <FolderOpen className="w-5 h-5" />
        </div>
        <div>
          <span className="text-sm font-bold text-white tracking-wide uppercase font-serif">
            Google Drive Video Folder
          </span>
          <p className="text-xs text-slate-400">
            Paste folder link with subfolders or direct video files
          </p>
        </div>
      </div>

      {/* Input row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FolderOpen
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
          <input
            id="folder-url-input"
            type="url"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="https://drive.google.com/drive/folders/FOLDER_ID?usp=drive_link"
            className="glass-input pl-10"
            aria-label="Google Drive folder URL"
            disabled={isLoading}
          />
        </div>
        <button
          onClick={handleLoad}
          disabled={!inputValue.trim() || isLoading}
          className="wedding-gold-btn px-6 py-3 text-xs uppercase tracking-wider font-bold whitespace-nowrap flex items-center justify-center gap-2"
          id="load-videos-button"
        >
          {isLoading ? (
            <>
              <span className="loader-spin border-black border-t-transparent" aria-hidden="true" />
              <span>Scanning Drive...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>Scan Folder</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Helper hint */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 flex items-start gap-2">
        <Info size={14} className="mt-0.5 shrink-0 text-amber-400/80" />
        <span>
          Make sure your Google Drive folder is set to{" "}
          <strong className="text-slate-200">
            &ldquo;Anyone with the link &rarr; Viewer&rdquo;
          </strong>{" "}
          for direct high-speed client streaming.
        </span>
      </div>
    </section>
  );
}
