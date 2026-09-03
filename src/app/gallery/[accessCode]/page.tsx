"use client";

import React, { useState, useEffect, use, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  DriveVideoFile,
  DriveMediaFile,
  DriveEventCategory,
  PhotographerBranding,
  GallerySettings,
  GalleryTheme,
  GalleryTemplate,
  HeroStyle,
  PhotoGridStyle,
  FontFamilyPreset,
  ClientSelectionConfig,
} from "@/lib/project-types";
import GalleryVideoCard from "@/components/GalleryVideoCard";
import GalleryPhotoCard from "@/components/GalleryPhotoCard";
import EventCard from "@/components/EventCard";
import VideoModal from "@/components/VideoModal";
import PhotoLightbox from "@/components/PhotoLightbox";
import ShareModal from "@/components/ShareModal";
import QrCodeModal from "@/components/QrCodeModal";
import {
  Heart,
  Calendar,
  Film,
  Sparkles,
  Lock,
  Share2,
  QrCode,
  Check,
  Play,
  Search,
  Layers,
  MessageCircle,
  Globe,
  Camera,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  ChevronDown,
  EyeOff,
  SlidersHorizontal,
  ImageIcon,
  Download,
  ListChecks,
  Send,
  CheckCircle2,
  Clock,
  MapPin,
  Crown,
  BookOpen,
  Compass,
  Tv,
  Phone,
  Menu,
  X,
  Mail,
  WifiOff,
} from "lucide-react";

interface GalleryData {
  isLocked?: boolean;
  status?: string;
  coupleName: string;
  weddingDate: string;
  weddingLocation?: string;
  packageType: string;
  welcomeMessage?: string;
  coverImage?: string;
  photographerName?: string;
  branding?: PhotographerBranding;
  theme?: GalleryTheme;
  template?: GalleryTemplate;
  customDomain?: string | null;
  expiresAt?: string;
  isPhotographerPreview?: boolean;
  settings?: GallerySettings;
  videoFiles?: DriveVideoFile[];
  photoFiles?: DriveMediaFile[];
  mediaFiles?: DriveMediaFile[];
  events?: DriveEventCategory[];
  accessCode: string;
}

export default function ClientGalleryPage({
  params,
}: {
  params: Promise<{ accessCode: string }>;
}) {
  const resolvedParams = use(params);
  const accessCode = resolvedParams.accessCode;

  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorPayload, setErrorPayload] = useState<any>(null);

  // Network online / offline state
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Password screen
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  // Gallery Navigation & Filters
  const [activeTab, setActiveTab] = useState<"home" | "events" | "photos" | "films" | "favorites" | "selections">("home");
  const [eventMediaSubTab, setEventMediaSubTab] = useState<"photos" | "films">("photos");
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOption, setSortOption] = useState<"recommended" | "newest" | "oldest" | "az">("recommended");
  const [favoritesFilter, setFavoritesFilter] = useState<"all" | "photos" | "films">("all");
  const [visiblePhotosCount, setVisiblePhotosCount] = useState<number>(48);

  useEffect(() => {
    setVisiblePhotosCount(48);
  }, [activeTab, selectedEventFilter, searchQuery, sortOption]);

  // Favorites state (seeded from localStorage, synchronized with database)
  const [favorites, setFavorites] = useState<string[]>([]);
  const inFlightFavsRef = useRef<Set<string>>(new Set());
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  // Album Selection Mode State
  const [selections, setSelections] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionConfig, setSelectionConfig] = useState<ClientSelectionConfig | null>(null);
  const [submissionState, setSubmissionState] = useState<"hidden" | "editing" | "submitting" | "submitted">("hidden");
  const [isSubmittingSelection, setIsSubmittingSelection] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [submittedTimestamp, setSubmittedTimestamp] = useState<string | null>(null);
  const inFlightSelectRef = useRef<Set<string>>(new Set());
  const hideBarTimerRef = useRef<NodeJS.Timeout | null>(null);
  const selectionsSet = useMemo(() => new Set(selections), [selections]);

  // Infinite scroll sentinel ref
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  // Template override for dashboard preview
  const [overrideTemplate, setOverrideTemplate] = useState<GalleryTemplate | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("template") as GalleryTemplate;
      if (q && ["classic", "editorial", "minimal", "cinematic", "luxury", "story"].includes(q)) {
        setOverrideTemplate(q);
      }
    }
  }, []);

  // Modals
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [lightboxPhotos, setLightboxPhotos] = useState<DriveMediaFile[]>([]);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [shareMedia, setShareMedia] = useState<{ name?: string; type: "gallery" | "photo" | "video" } | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Analytics tracker helper
  const trackEvent = useCallback((eventType: string, extra?: {
    mediaId?: string;
    mediaTitle?: string;
    mediaType?: "PHOTO" | "VIDEO";
    eventName?: string;
    videoId?: string;
    watchTimeSeconds?: number;
    shareType?: string;
    downloadType?: string;
    source?: string;
  }) => {
    try {
      let sessionId = "";
      if (typeof window !== "undefined") {
        sessionId = sessionStorage.getItem("gallery_session_id") || "";
        if (!sessionId) {
          sessionId = `sess_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
          sessionStorage.setItem("gallery_session_id", sessionId);
        }
      }
      const eventId = `evt_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
      fetch(`/api/gallery/${accessCode}/analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, eventId, sessionId, ...extra }),
      }).catch(() => {});
    } catch {}
  }, [accessCode]);

  // Track photo lightbox views
  useEffect(() => {
    if (selectedPhotoIndex !== null && lightboxPhotos[selectedPhotoIndex]) {
      const p = lightboxPhotos[selectedPhotoIndex];
      trackEvent("photo_viewed", {
        mediaId: p.id || p.driveFileId,
        mediaTitle: p.name,
        eventName: p.eventName,
      });
    }
  }, [selectedPhotoIndex, lightboxPhotos, trackEvent]);

  // Toasts / UI
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (hideBarTimerRef.current) {
        clearTimeout(hideBarTimerRef.current);
      }
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // 1. Seed favorites and selections from localStorage immediately for zero latency
  useEffect(() => {
    try {
      const storedFavs = localStorage.getItem(`wvg_favs_${accessCode}`);
      if (storedFavs) {
        setFavorites(JSON.parse(storedFavs));
      }
      const storedSels = localStorage.getItem(`wvg_selections_${accessCode}`);
      if (storedSels) {
        setSelections(JSON.parse(storedSels));
      }
    } catch {
      // Local storage restricted
    }
  }, [accessCode]);

  // 2. Fetch authoritative favorites from server
  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch(`/api/gallery/${accessCode}/favorites`);
      if (res.ok) {
        const data = await res.json();
        if (data.mediaIds && Array.isArray(data.mediaIds)) {
          setFavorites(data.mediaIds);
          try {
            localStorage.setItem(`wvg_favs_${accessCode}`, JSON.stringify(data.mediaIds));
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Favorites server fetch fallback to cache:", err);
    }
  }, [accessCode]);

  // 3. Fetch album selections from server
  const fetchSelections = useCallback(async () => {
    try {
      const res = await fetch(`/api/gallery/${accessCode}/selection`);
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setSelectionConfig(data.config);
        }
        if (data.mediaIds && Array.isArray(data.mediaIds)) {
          setSelections(data.mediaIds);
          try {
            localStorage.setItem(`wvg_selections_${accessCode}`, JSON.stringify(data.mediaIds));
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Selection server fetch fallback:", err);
    }
  }, [accessCode]);

  useEffect(() => {
    fetchFavorites();
    fetchSelections();
  }, [fetchFavorites, fetchSelections]);

  // Fetch gallery payload
  useEffect(() => {
    const isPreviewParam = typeof window !== "undefined" && window.location.search.includes("preview=true");
    const url = `/api/gallery/${accessCode}${isPreviewParam ? "?preview=true" : ""}`;

    fetch(url)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorPayload(data);
          throw new Error(data.error || "Failed to load wedding gallery");
        }
        setGallery(data);
        trackEvent("gallery_opened");
        if (data.settings?.selectionConfig) {
          setSelectionConfig(data.settings.selectionConfig);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accessCode, trackEvent]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setUnlocking(true);
    setPasswordError("");

    try {
      const res = await fetch(`/api/gallery/${accessCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: passwordInput.trim(),
          rememberDevice,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Invalid password");
      }

      setGallery(data);
      if (data.settings?.selectionConfig) {
        setSelectionConfig(data.settings.selectionConfig);
      }
      fetchFavorites();
      fetchSelections();
      showToast("✓ Gallery unlocked successfully");
    } catch (err: any) {
      setPasswordError(err.message || "Incorrect password. Please try again.");
    } finally {
      setUnlocking(false);
    }
  };

  // ── Persistent, Optimistic Favorite Toggle with Debounce & Rollback ────────
  const toggleFavorite = async (mediaId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Prevent double clicking while an in-flight toggle is processing
    if (inFlightFavsRef.current.has(mediaId)) return;
    inFlightFavsRef.current.add(mediaId);

    const exists = favorites.includes(mediaId);
    const nextFavorites = exists
      ? favorites.filter((id) => id !== mediaId)
      : [...favorites, mediaId];

    // Optimistic UI update
    setFavorites(nextFavorites);
    try {
      localStorage.setItem(`wvg_favs_${accessCode}`, JSON.stringify(nextFavorites));
    } catch {}

    showToast(exists ? "Removed from favorites" : "♥ Saved to favorites");

    try {
      let res: Response;
      if (exists) {
        res = await fetch(`/api/gallery/${accessCode}/favorites/${encodeURIComponent(mediaId)}`, {
          method: "DELETE",
        });
      } else {
        res = await fetch(`/api/gallery/${accessCode}/favorites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId }),
        });
      }

      if (!res.ok) {
        throw new Error("Server rejected favorite sync");
      }
      trackEvent(exists ? "unfavorite" : "favorite", { mediaId });
    } catch (err) {
      console.error("Favorite sync failed, reverting:", err);
      // Revert optimistic UI on error
      setFavorites(favorites);
      try {
        localStorage.setItem(`wvg_favs_${accessCode}`, JSON.stringify(favorites));
      } catch {}
      showToast("Couldn't save favorite. Please try again.");
    } finally {
      inFlightFavsRef.current.delete(mediaId);
    }
  };

  // ── Persistent Album Selection Toggle with Limit Protection ────────────────
  const toggleSelection = async (mediaId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const isLocked = !selectionConfig?.enabled || selectionConfig?.status === "LOCKED";
    if (isLocked) {
      showToast("Album selection is disabled or locked by your photographer.");
      return;
    }

    if (inFlightSelectRef.current.has(mediaId)) return;
    inFlightSelectRef.current.add(mediaId);

    const isCurrentlySelected = selections.includes(mediaId);
    const limit = selectionConfig?.limit || 20;

    if (!isCurrentlySelected && selections.length >= limit) {
      showToast(`You have selected all ${limit} available photos.`);
      inFlightSelectRef.current.delete(mediaId);
      return;
    }

    const nextSelections = isCurrentlySelected
      ? selections.filter((id) => id !== mediaId)
      : [...selections, mediaId];

    // If there was an auto-hide timer pending, clear it
    if (hideBarTimerRef.current) {
      clearTimeout(hideBarTimerRef.current);
      hideBarTimerRef.current = null;
    }
    setSubmissionState("editing");

    // Optimistic UI update with functional state
    setSelections(nextSelections);
    try {
      localStorage.setItem(`wvg_selections_${accessCode}`, JSON.stringify(nextSelections));
    } catch {}

    showToast(
      isCurrentlySelected
        ? "✓ Photo removed"
        : "✓ Photo selected"
    );

    try {
      let res: Response;
      if (isCurrentlySelected) {
        res = await fetch(`/api/gallery/${accessCode}/selection/${encodeURIComponent(mediaId)}`, {
          method: "DELETE",
        });
      } else {
        res = await fetch(`/api/gallery/${accessCode}/selection`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId }),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update album selection");
      }
      trackEvent(isCurrentlySelected ? "deselect" : "select", { mediaId });

      const data = await res.json().catch(() => ({}));
      if (data.mediaIds && Array.isArray(data.mediaIds)) {
        setSelections(data.mediaIds);
        try {
          localStorage.setItem(`wvg_selections_${accessCode}`, JSON.stringify(data.mediaIds));
        } catch {}
      }
    } catch (err: any) {
      console.error("Selection sync failed, reverting:", err);
      setSelections(selections);
      try {
        localStorage.setItem(`wvg_selections_${accessCode}`, JSON.stringify(selections));
      } catch {}
      showToast(err.message || "Couldn't save selection");
    } finally {
      inFlightSelectRef.current.delete(mediaId);
    }
  };

  // ── Submit Album Selection ──────────────────────────────────────────────────
  const handleSubmitSelection = async () => {
    if (isSubmittingSelection) return;
    if (selections.length === 0) {
      showToast("Please select at least 1 photo before submitting.");
      return;
    }

    setIsSubmittingSelection(true);
    setSubmissionState("submitting");

    try {
      const res = await fetch(`/api/gallery/${accessCode}/selection/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submittedBy: `${gallery?.coupleName || "Client"}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Unable to submit selection. Please try again.");
      }

      const formattedNow = new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      setSubmittedTimestamp(formattedNow);
      setSelectionConfig((prev) => (prev ? { ...prev, status: "SUBMITTED" } : null));
      setShowSubmitModal(false);
      setShowThankYouModal(true);
      setSubmissionState("submitted");
      trackEvent("selection_submitted", { mediaTitle: `${selections.length} photos` });
      showToast("✓ Selection submitted successfully");

      if (hideBarTimerRef.current) {
        clearTimeout(hideBarTimerRef.current);
      }
      hideBarTimerRef.current = setTimeout(() => {
        setSubmissionState("hidden");
        hideBarTimerRef.current = null;
      }, 4000);
    } catch (err: any) {
      setSubmissionState("editing");
      showToast(err.message || "Unable to submit selection. Please try again.");
    } finally {
      setIsSubmittingSelection(false);
    }
  };

  const handleOpenShare = (media?: { name?: string; type: "gallery" | "photo" | "video" }) => {
    setShareMedia(media || null);
    setIsShareModalOpen(true);
    trackEvent("share_clicked");
  };

  const handleOpenQr = () => {
    setIsQrModalOpen(true);
    trackEvent("qr_generated");
  };

  const handleWhatsAppShare = () => {
    trackEvent("whatsapp_clicked");
    const galleryUrl = typeof window !== "undefined" ? window.location.href : "";
    const text = `Your wedding gallery is ready ❤️\nView your memories here:\n${galleryUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleDownloadZip = async (scope: "all" | "selected" | "favorites" = "all") => {
    if (isDownloadingZip) return;
    setIsDownloadingZip(true);
    const scopeLabel = scope === "selected" || activeTab === "selections" ? "Selected_Photos" : scope === "favorites" || activeTab === "favorites" ? "Favorites" : "All_Photos";
    showToast(`Preparing high-resolution ZIP archive for ${scopeLabel.replace(/_/g, " ")}...`);

    try {
      let res: Response;
      if (scope === "selected" || activeTab === "selections") {
        res = await fetch(`/api/gallery/${accessCode}/download-zip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope: "selected",
            mediaIds: selections,
            label: "Selected_Photos",
            type: "photos",
          }),
        });
      } else if (scope === "favorites" || activeTab === "favorites") {
        res = await fetch(`/api/gallery/${accessCode}/download-zip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope: "favorites",
            mediaIds: favorites,
            label: "Favorites",
            type: "photos",
          }),
        });
      } else if (selectedEventFilter !== "all") {
        res = await fetch(
          `/api/gallery/${accessCode}/download-zip?event=${encodeURIComponent(selectedEventFilter)}&type=photos`
        );
      } else {
        res = await fetch(`/api/gallery/${accessCode}/download-zip?type=photos`);
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate ZIP archive");
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const contentDisposition = res.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch
        ? decodeURIComponent(filenameMatch[1])
        : `${gallery?.coupleName || "Wedding"}_${scopeLabel}.zip`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      trackEvent("download_requested", { mediaTitle: scopeLabel.replace(/_/g, " ") });
      showToast("✓ ZIP archive download started!");
    } catch (err: any) {
      console.error("ZIP download failed:", err);
      showToast(err.message || "Failed to download ZIP archive");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const allVideos = useMemo(() => {
    const raw = gallery?.videoFiles || [];
    const map = new Map<string, typeof raw[0]>();
    for (const item of raw) {
      if (item.isUnavailable) continue;
      const key = item.driveFileId || item.id;
      if (key && !map.has(key)) map.set(key, item);
    }
    return Array.from(map.values());
  }, [gallery]);

  const allPhotos = useMemo(() => {
    const raw = gallery?.photoFiles || [];
    const map = new Map<string, typeof raw[0]>();
    for (const item of raw) {
      if (item.isUnavailable) continue;
      const key = item.driveFileId || item.id;
      if (key && !map.has(key)) map.set(key, item);
    }
    return Array.from(map.values());
  }, [gallery]);
  const eventsList = useMemo(() => gallery?.events || [], [gallery]);

  // Featured lists
  const featuredVideos = useMemo(() => {
    const explicitly = allVideos.filter((v) => v.isFeatured);
    return explicitly.length > 0 ? explicitly : allVideos.slice(0, 3);
  }, [allVideos]);

  const featuredPhotos = useMemo(() => {
    const explicitly = allPhotos.filter((p) => p.isFeatured);
    return explicitly.length > 0 ? explicitly : allPhotos.slice(0, 8);
  }, [allPhotos]);

  // Ceremony Events list with accurate counts
  const ceremonyEvents = useMemo(() => {
    if (eventsList.length > 0) return eventsList;

    // Fallback: Group from all media items
    const map = new Map<string, { count: number; photoCount: number; videoCount: number; cover?: string }>();
    for (const v of allVideos) {
      const name = v.eventName || "Wedding Highlights";
      const cur = map.get(name) || { count: 0, photoCount: 0, videoCount: 0, cover: v.thumbnailLink };
      cur.count += 1;
      cur.videoCount += 1;
      if (!cur.cover && v.thumbnailLink) cur.cover = v.thumbnailLink;
      map.set(name, cur);
    }
    for (const p of allPhotos) {
      const name = p.eventName || "Wedding Highlights";
      const cur = map.get(name) || { count: 0, photoCount: 0, videoCount: 0, cover: p.thumbnailUrl || p.thumbnailLink };
      cur.count += 1;
      cur.photoCount += 1;
      if (!cur.cover && (p.thumbnailUrl || p.thumbnailLink)) cur.cover = p.thumbnailUrl || p.thumbnailLink;
      map.set(name, cur);
    }

    return Array.from(map.entries()).map(([name, data]) => ({
      id: name,
      name,
      count: data.count,
      photoCount: data.photoCount,
      videoCount: data.videoCount,
      coverImage: data.cover,
    }));
  }, [eventsList, allVideos, allPhotos]);

  // Filtered Photos
  const displayedPhotos = useMemo(() => {
    let list = [...allPhotos];

    if (activeTab === "favorites") {
      list = list.filter((p) => favoritesSet.has(p.id) || (p.driveFileId ? favoritesSet.has(p.driveFileId) : false));
      if (selectedEventFilter !== "all") {
        list = list.filter(
          (p) => (p.eventName || "Wedding Highlights").toLowerCase() === selectedEventFilter.toLowerCase()
        );
      }
    } else if (activeTab === "selections") {
      list = list.filter((p) => selectionsSet.has(p.id) || (p.driveFileId ? selectionsSet.has(p.driveFileId) : false));
      if (selectedEventFilter !== "all") {
        list = list.filter(
          (p) => (p.eventName || "Wedding Highlights").toLowerCase() === selectedEventFilter.toLowerCase()
        );
      }
    } else if (selectedEventFilter !== "all") {
      list = list.filter(
        (p) => (p.eventName || "Wedding Highlights").toLowerCase() === selectedEventFilter.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const title = p.name.replace(/\.[^/.]+$/, "").toLowerCase();
        const event = (p.eventName || "").toLowerCase();
        return title.includes(q) || event.includes(q);
      });
    }

    if (sortOption === "az") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "newest") {
      list.sort((a, b) => (b.modifiedTime || "").localeCompare(a.modifiedTime || ""));
    } else if (sortOption === "oldest") {
      list.sort((a, b) => (a.modifiedTime || "").localeCompare(b.modifiedTime || ""));
    }

    return list;
  }, [allPhotos, activeTab, selectedEventFilter, searchQuery, sortOption, favoritesSet, selectionsSet]);

  useEffect(() => {
    if (!loadMoreSentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisiblePhotosCount((prev) => {
            if (prev < displayedPhotos.length) {
              return Math.min(prev + 48, displayedPhotos.length);
            }
            return prev;
          });
        }
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(loadMoreSentinelRef.current);
    return () => observer.disconnect();
  }, [displayedPhotos.length]);

  // Filtered Videos
  const displayedVideos = useMemo(() => {
    let list = [...allVideos];

    if (activeTab === "favorites") {
      list = list.filter((v) => favoritesSet.has(v.id) || (v.driveFileId ? favoritesSet.has(v.driveFileId) : false));
      if (selectedEventFilter !== "all") {
        list = list.filter(
          (v) => (v.eventName || "Wedding Highlights").toLowerCase() === selectedEventFilter.toLowerCase()
        );
      }
    } else if (activeTab === "selections") {
      list = list.filter((v) => selectionsSet.has(v.id) || (v.driveFileId ? selectionsSet.has(v.driveFileId) : false));
      if (selectedEventFilter !== "all") {
        list = list.filter(
          (v) => (v.eventName || "Wedding Highlights").toLowerCase() === selectedEventFilter.toLowerCase()
        );
      }
    } else if (selectedEventFilter !== "all") {
      list = list.filter(
        (v) => (v.eventName || "Wedding Highlights").toLowerCase() === selectedEventFilter.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((v) => {
        const title = v.name.replace(/\.[^/.]+$/, "").toLowerCase();
        const event = (v.eventName || "").toLowerCase();
        return title.includes(q) || event.includes(q);
      });
    }

    if (sortOption === "az") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "newest") {
      list.sort((a, b) => (b.modifiedTime || "").localeCompare(a.modifiedTime || ""));
    } else if (sortOption === "oldest") {
      list.sort((a, b) => (a.modifiedTime || "").localeCompare(b.modifiedTime || ""));
    }

    return list;
  }, [allVideos, activeTab, selectedEventFilter, searchQuery, sortOption, favoritesSet, selectionsSet]);

  // Favorite counts
  const favPhotosCount = useMemo(() => {
    return allPhotos.filter((p) => favoritesSet.has(p.id) || (p.driveFileId ? favoritesSet.has(p.driveFileId) : false)).length;
  }, [allPhotos, favoritesSet]);

  const favVideosCount = useMemo(() => {
    return allVideos.filter((v) => favoritesSet.has(v.id) || (v.driveFileId ? favoritesSet.has(v.driveFileId) : false)).length;
  }, [allVideos, favoritesSet]);

  // Selection counts
  const selectedPhotosCount = useMemo(() => {
    return allPhotos.filter((p) => selectionsSet.has(p.id) || (p.driveFileId ? selectionsSet.has(p.driveFileId) : false)).length;
  }, [allPhotos, selectionsSet]);

  const selectedVideosCount = useMemo(() => {
    return allVideos.filter((v) => selectionsSet.has(v.id) || (v.driveFileId ? selectionsSet.has(v.driveFileId) : false)).length;
  }, [allVideos, selectionsSet]);

  // Event breakdown for Favorites
  const favoritesByEvent = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allPhotos) {
      const pId = p.id || p.driveFileId;
      if (favoritesSet.has(pId)) {
        const ev = p.eventName || "Wedding Highlights";
        map.set(ev, (map.get(ev) || 0) + 1);
      }
    }
    for (const v of allVideos) {
      const vId = v.id || v.driveFileId;
      if (favoritesSet.has(vId)) {
        const ev = v.eventName || "Wedding Highlights";
        map.set(ev, (map.get(ev) || 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [allPhotos, allVideos, favoritesSet]);

  // Event breakdown for Selections
  const selectionsByEvent = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allPhotos) {
      const pId = p.id || p.driveFileId;
      if (selectionsSet.has(pId)) {
        const ev = p.eventName || "Wedding Highlights";
        map.set(ev, (map.get(ev) || 0) + 1);
      }
    }
    for (const v of allVideos) {
      const vId = v.id || v.driveFileId;
      if (selectionsSet.has(vId)) {
        const ev = v.eventName || "Wedding Highlights";
        map.set(ev, (map.get(ev) || 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [allPhotos, allVideos, selectionsSet]);

  if (loading) {
    return (
      <div className="min-h-screen wedding-bg flex flex-col items-center justify-center gap-4 text-amber-200/80">
        <div className="loader-spin w-11 h-11 border-3 border-amber-400 border-t-transparent" />
        <p className="font-serif text-sm tracking-widest uppercase opacity-80 animate-pulse">
          Opening Wedding Collection...
        </p>
      </div>
    );
  }

  if (error || !gallery) {
    const status = errorPayload?.status || (error.toLowerCase().includes("archived") ? "ARCHIVED" : error.toLowerCase().includes("expired") ? "EXPIRED" : error.toLowerCase().includes("unpublished") ? "UNPUBLISHED" : error.toLowerCase().includes("paused") ? "PAUSED" : "NOT_FOUND");
    const studioName = errorPayload?.studioName || "DR Films Wedding Cinema";
    const coupleName = errorPayload?.coupleName || "";
    const contact = errorPayload?.contact || {};
    const logoUrl = errorPayload?.branding?.logoUrlLight || errorPayload?.branding?.logoUrl;

    let badgeText = "Gallery Unavailable";
    let title = "Gallery Access";
    let description = "This wedding gallery is not currently accessible.";

    if (status === "ARCHIVED") {
      badgeText = "Gallery Archived";
      title = "Collection Archived";
      description = "This private wedding collection has been safely placed into the studio's long-term archive.";
    } else if (status === "EXPIRED") {
      badgeText = "Gallery Concluded";
      title = "Collection Expired";
      description = "This private wedding collection has reached the end of its active delivery period.";
    } else if (status === "UNPUBLISHED" || status === "PAUSED") {
      badgeText = "Private Preview";
      title = "Under Curation";
      description = "This collection is currently being prepared and curated by the studio. It is not yet publicly visible.";
    } else if (status === "NOT_FOUND") {
      badgeText = "Gallery Not Found";
      title = "Archive Not Located";
      description = "We could not locate this wedding collection. Please verify your link or invitation access code.";
    }

    return (
      <div className="min-h-screen wedding-bg flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="glass-panel p-8 sm:p-12 max-w-lg w-full text-center border border-white/15 shadow-2xl relative z-10 rounded-3xl space-y-6">
          {/* Studio Header */}
          <div className="space-y-2">
            {logoUrl ? (
              <div className="max-h-12 flex items-center justify-center overflow-hidden mx-auto mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt={studioName} className="max-h-12 max-w-[200px] object-contain" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-amber-300 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/10">
                <Lock className="w-6 h-6 stroke-[1.5]" />
              </div>
            )}
            <span className="text-[11px] uppercase font-mono tracking-widest text-amber-400 font-bold block">
              {badgeText}
            </span>
          </div>

          {coupleName && (
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white uppercase tracking-wider">
              {coupleName}
            </h1>
          )}

          <div>
            <h2 className="text-lg font-serif font-semibold text-slate-200">{title}</h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
              {description}
            </p>
            <p className="text-[11px] text-amber-200/80 mt-3 font-mono">
              Please contact the studio if you need access.
            </p>
          </div>

          {/* Studio Contact Actions */}
          {(contact.website || contact.whatsapp || contact.phone || contact.email) && (
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-center gap-2.5">
              {contact.whatsapp && (
                <a
                  href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(contact.whatsapp.replace(/\D/g, ""))}&text=${encodeURIComponent(`Hello ${studioName}, regarding the wedding gallery for ${coupleName || "our project"}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Studio</span>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{contact.phone}</span>
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}?subject=${encodeURIComponent(`Gallery Access Request - ${coupleName || accessCode}`)}`}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Studio</span>
                </a>
              )}
              {contact.website && (
                <a
                  href={contact.website.startsWith("http") ? contact.website : `https://${contact.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Studio Website</span>
                </a>
              )}
            </div>
          )}

          <div className="pt-2 text-[11px] text-slate-400 font-mono">
            {studioName} &bull; Fine Art Wedding Cinema
          </div>
        </div>
      </div>
    );
  }

  // ── Password Protection Locked Screen ──
  if (gallery.isLocked) {
    return (
      <div className="min-h-screen wedding-bg relative flex items-center justify-center p-4 overflow-hidden">
        {gallery.coverImage ? (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gallery.coverImage}
              alt={gallery.coupleName}
              className="w-full h-full object-cover filter brightness-[0.25] blur-md scale-110"
            />
            <div className="absolute inset-0 bg-[#090a0f]/80 backdrop-blur-xl" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-amber-950/20 via-[#090a0f] to-[#090a0f]">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>
        )}

        <div className="relative z-10 glass-panel p-8 sm:p-12 max-w-md w-full text-center border border-white/15 shadow-2xl animate-in zoom-in-95 duration-500">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/10">
            <KeyRound className="w-7 h-7 stroke-[1.5]" />
          </div>

          <span className="text-[10px] uppercase font-mono tracking-widest text-amber-300/90 block mb-1">
            Private Wedding Collection
          </span>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2 uppercase tracking-wide">
            {gallery.coupleName}
          </h2>

          <p className="text-xs text-slate-300 mb-8 font-serif italic">
            This collection is protected. Please enter the passcode provided by the couple or photographer.
          </p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter gallery password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                className="w-full px-4 py-3.5 pr-11 rounded-2xl bg-white/5 border border-white/15 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-amber-400/80 focus:ring-2 focus:ring-amber-400/20 transition-all text-center tracking-wider font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember Device Option */}
            <label className="flex items-center justify-center gap-2 text-xs text-slate-300 cursor-pointer select-none py-1">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-400 focus:ring-amber-400 focus:ring-offset-0 cursor-pointer"
              />
              <span>Remember this device on this browser</span>
            </label>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={unlocking || !passwordInput.trim()}
              className="w-full wedding-gold-btn text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {unlocking ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Unlocking Memories...</span>
                </>
              ) : (
                <>
                  <span>Unlock Collection</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-[11px] text-slate-400 font-mono">
            {gallery.branding?.businessName || gallery.photographerName || "Wedding Cinema Studio"} &bull; Secure Client Delivery
          </div>
        </div>
      </div>
    );
  }

  const studioName = gallery.branding?.businessName || gallery.photographerName || "DR FILMS WEDDING CINEMA";
  const studioSubtitle = gallery.branding?.subtitle || gallery.branding?.tagline || "Wedding Cinema & Photography";
  const studioLogo = gallery.branding?.logoUrlLight || gallery.branding?.logoUrl || gallery.branding?.logoUrlDark;
  const weddingLocation = gallery.branding?.weddingLocation;
  const formattedDate = gallery.weddingDate
    ? new Date(gallery.weddingDate).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const allowDownloads = gallery.settings?.allowDownloads ?? false;
  const allowPhotoDownload = gallery.settings?.allowPhotoDownload ?? allowDownloads ?? true;
  const allowVideoDownload = gallery.settings?.allowVideoDownload ?? allowDownloads ?? false;
  const allowFullscreen = gallery.settings?.allowFullscreen ?? true;
  const showBranding = gallery.settings?.showBranding ?? true;

  const activeTemplate: GalleryTemplate =
    overrideTemplate ||
    gallery.template ||
    gallery.settings?.template ||
    "classic";

  const activeTheme: GalleryTheme =
    gallery.theme ||
    gallery.settings?.theme ||
    "cinematic";

  const activeFont: FontFamilyPreset = gallery.settings?.fontFamily || "serif-elegant";
  const activeHeroStyle: HeroStyle = gallery.settings?.heroStyle || "large";
  const activeGridStyle: PhotoGridStyle = gallery.settings?.gridStyle || "masonry";
  const whiteLabelEnabled = gallery.settings?.whiteLabelEnabled ?? true;

  const heroHeightClass =
    activeHeroStyle === "fullscreen"
      ? "min-h-screen"
      : activeHeroStyle === "split"
      ? "min-h-[75vh]"
      : activeHeroStyle === "minimal"
      ? "min-h-[55vh]"
      : "min-h-[90vh]";

  const photoGridClasses =
    activeGridStyle === "columns-3"
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
      : activeGridStyle === "columns-4"
      ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5"
      : activeGridStyle === "editorial-mixed"
      ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
      : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5";

  return (
    <div
      className={`min-h-screen wedding-bg text-slate-100 flex flex-col selection:bg-amber-400 selection:text-black font-preset-${activeFont} font-${activeFont} gallery-theme-${activeTheme} theme-${activeTheme} gallery-template-${activeTemplate} template-${activeTemplate}`}
      style={{
        ...(gallery.settings?.primaryAccent ? { "--color-primary-accent": gallery.settings.primaryAccent, "--gallery-accent": gallery.settings.primaryAccent } as any : {}),
      }}
    >
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-black py-2 px-4 text-center text-xs font-semibold backdrop-blur-md sticky top-0 z-50 flex items-center justify-center gap-2 shadow-lg">
          <WifiOff className="w-4 h-4 text-black" />
          <span>You are currently offline. Previously loaded photos and details remain visible.</span>
        </div>
      )}

      {/* Photographer Staging Preview Notice */}
      {gallery.isPhotographerPreview && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border-b border-amber-400/40 py-2 px-4 text-center text-xs font-medium text-amber-200 backdrop-blur-md sticky top-0 z-50 flex items-center justify-center gap-2 shadow-lg">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>
            <strong>Photographer Preview Mode</strong> &bull; You are previewing the exact client experience.
          </span>
          <Link
            href={`/projects`}
            className="ml-3 underline underline-offset-2 hover:text-white font-semibold"
          >
            Return to Dashboard &rarr;
          </Link>
        </div>
      )}

      {/* Floating Gallery Top Navbar */}
      <header className="sticky top-0 z-40 px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 backdrop-blur-xl bg-[#090a0f]/85 border-b border-white/10 flex items-center justify-between transition-all gap-2 sm:gap-4">
        {/* Left: Studio Branding (Aspect ratio preserved, dynamic) */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <Link
            href={gallery.isPhotographerPreview ? "/login" : `/gallery/${accessCode}`}
            onClick={(e) => {
              if (!gallery.isPhotographerPreview) {
                e.preventDefault();
                setActiveTab("home");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            aria-label={
              gallery.isPhotographerPreview
                ? "Return to photographer login"
                : `${studioName} - Gallery Home`
            }
            title={
              gallery.isPhotographerPreview
                ? "Return to photographer login"
                : `${studioName} - Home`
            }
            className="flex items-center gap-2 sm:gap-2.5 text-xs font-serif font-bold tracking-wider uppercase text-amber-300 hover:text-amber-200 transition-colors cursor-pointer group"
          >
            {studioLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={studioLogo}
                alt={studioName}
                className="h-7 sm:h-8 max-h-8 w-auto max-w-[130px] sm:max-w-[170px] object-contain shrink-0"
              />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-400/25 to-amber-500/10 border border-amber-400/40 flex items-center justify-center text-amber-300 font-serif font-bold text-xs shrink-0 shadow-sm shadow-amber-500/10 group-hover:border-amber-400/60 transition-colors">
                DR
              </div>
            )}
            <span className="font-serif tracking-widest text-[11px] sm:text-xs text-slate-100 font-bold whitespace-nowrap truncate max-w-[150px] sm:max-w-[220px]">
              {studioName}
            </span>
          </Link>
        </div>

        {/* Center Navigation Links (Desktop: lg+) */}
        <nav className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 text-xs font-semibold shrink-0" aria-label="Gallery Navigation">
          <button
            onClick={() => {
              setActiveTab("home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-current={activeTab === "home" ? "page" : undefined}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === "home"
                ? "bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20 ring-1 ring-amber-400"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            Home
          </button>
          {ceremonyEvents.length > 0 && (
            <button
              onClick={() => {
                setActiveTab("events");
                const el = document.getElementById("events-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              aria-current={activeTab === "events" ? "page" : undefined}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "events"
                  ? "bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20 ring-1 ring-amber-400"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              Events
            </button>
          )}
          {allPhotos.length > 0 && (
            <button
              onClick={() => {
                setActiveTab("photos");
                setSelectedEventFilter("all");
                const el = document.getElementById("media-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              aria-current={activeTab === "photos" ? "page" : undefined}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "photos"
                  ? "bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20 ring-1 ring-amber-400"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photos ({allPhotos.length})</span>
            </button>
          )}
          {allVideos.length > 0 && (
            <button
              onClick={() => {
                setActiveTab("films");
                setSelectedEventFilter("all");
                const el = document.getElementById("media-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              aria-current={activeTab === "films" ? "page" : undefined}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "films"
                  ? "bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20 ring-1 ring-amber-400"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Films ({allVideos.length})</span>
            </button>
          )}
          {gallery.settings?.allowFavorites !== false && (
            <button
              onClick={() => {
                setActiveTab("favorites");
                const el = document.getElementById("media-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              aria-current={activeTab === "favorites" ? "page" : undefined}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "favorites"
                  ? "bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20 ring-1 ring-amber-400"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${favorites.length > 0 ? "text-rose-500 fill-rose-500" : ""}`} />
              <span>Favorites</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "favorites" ? "bg-black/20 text-black font-bold" : "bg-white/10 text-slate-400"
                }`}
              >
                {favorites.length}
              </span>
            </button>
          )}

          {selectionConfig?.enabled && (
            <button
              onClick={() => {
                setActiveTab("selections");
                const el = document.getElementById("media-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              aria-current={activeTab === "selections" ? "page" : undefined}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "selections"
                  ? "bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20 ring-1 ring-amber-400"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Selection</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "selections" ? "bg-black/20 text-black font-bold" : "bg-white/10 text-amber-300"
                }`}
              >
                {selections.length}/{selectionConfig.limit || 20}
              </span>
            </button>
          )}
        </nav>

        {/* Right Actions: QR Code, WhatsApp, Share, and Mobile Menu Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            onClick={handleOpenQr}
            className="glass-button text-xs px-2.5 sm:px-3 py-1.5 rounded-full border border-white/10 hover:border-amber-400/30 text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400"
            title="Scan or download Wedding QR Code"
            aria-label="Scan or download Wedding QR Code"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">QR Code</span>
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="glass-button text-xs px-2.5 sm:px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-300 hover:text-white flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-400"
            title="Share with Family on WhatsApp"
            aria-label="Share gallery on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          <button
            onClick={() => handleOpenShare()}
            className="glass-button text-xs px-3 sm:px-3.5 py-1.5 rounded-full border border-amber-400/30 text-amber-200 hover:text-white flex items-center gap-1.5 cursor-pointer shadow-lg focus-visible:ring-2 focus-visible:ring-amber-400"
            title="Share Gallery Link"
            aria-label="Share Gallery Link"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Tablet & Mobile Nav Toggle Button */}
          <button
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
            className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileNavOpen}
          >
            {isMobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile / Tablet Compact Navigation Drawer */}
      {isMobileNavOpen && (
        <div className="lg:hidden sticky top-[57px] z-30 border-b border-white/10 bg-[#090a0f]/95 backdrop-blur-2xl px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-200 shadow-2xl">
          <button
            onClick={() => {
              setActiveTab("home");
              setIsMobileNavOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${
              activeTab === "home" ? "bg-amber-400 text-black font-bold" : "text-slate-200 hover:bg-white/5"
            }`}
          >
            <span>Home</span>
          </button>
          {ceremonyEvents.length > 0 && (
            <button
              onClick={() => {
                setActiveTab("events");
                setIsMobileNavOpen(false);
                document.getElementById("events-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${
                activeTab === "events" ? "bg-amber-400 text-black font-bold" : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <span>Events</span>
              <span className="text-[10px] opacity-70 font-mono">{ceremonyEvents.length} Chapters</span>
            </button>
          )}
          {allPhotos.length > 0 && (
            <button
              onClick={() => {
                setActiveTab("photos");
                setSelectedEventFilter("all");
                setIsMobileNavOpen(false);
                document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${
                activeTab === "photos" ? "bg-amber-400 text-black font-bold" : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5" />
                Photos
              </span>
              <span className="text-[10px] opacity-70 font-mono">{allPhotos.length}</span>
            </button>
          )}
          {allVideos.length > 0 && (
            <button
              onClick={() => {
                setActiveTab("films");
                setSelectedEventFilter("all");
                setIsMobileNavOpen(false);
                document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${
                activeTab === "films" ? "bg-amber-400 text-black font-bold" : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2">
                <Film className="w-3.5 h-3.5" />
                Films
              </span>
              <span className="text-[10px] opacity-70 font-mono">{allVideos.length}</span>
            </button>
          )}
          {gallery.settings?.allowFavorites !== false && (
            <button
              onClick={() => {
                setActiveTab("favorites");
                setIsMobileNavOpen(false);
                document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${
                activeTab === "favorites" ? "bg-amber-400 text-black font-bold" : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2">
                <Heart className={`w-3.5 h-3.5 ${favorites.length > 0 ? "text-rose-500 fill-rose-500" : ""}`} />
                Favorites
              </span>
              <span className="text-[10px] opacity-70 font-mono">{favorites.length}</span>
            </button>
          )}
          {selectionConfig?.enabled && (
            <button
              onClick={() => {
                setActiveTab("selections");
                setIsMobileNavOpen(false);
                document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${
                activeTab === "selections" ? "bg-amber-400 text-black font-bold" : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5" />
                Album Selection
              </span>
              <span className="text-[10px] opacity-70 font-mono">
                {selections.length}/{selectionConfig.limit || 20}
              </span>
            </button>
          )}
        </div>
      )}

      {/* ── 1. Template-Driven Hero Section ── */}
      <section
        id="hero"
        className={`relative ${heroHeightClass} flex flex-col items-center justify-center text-center px-4 sm:px-6 overflow-hidden transition-all duration-500`}
      >
        {gallery.coverImage ? (
          <div className="absolute inset-0 z-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gallery.coverImage}
              alt={gallery.coupleName}
              className={`w-full h-full object-cover filter transition-all duration-700 ${
                activeTemplate === "minimal"
                  ? "brightness-[0.65] contrast-[1.05]"
                  : activeTemplate === "cinematic"
                  ? "brightness-[0.68] contrast-125 scale-105"
                  : activeTemplate === "luxury"
                  ? "brightness-[0.65] sepia-[10%]"
                  : "brightness-[0.70] contrast-[1.08] saturate-[1.05] scale-105"
              }`}
            />
            {/* Multi-layer subtle overlay: wedding photograph remains recognizable while text stays readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/50 via-40% to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#090a0f]/60 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black/40 via-black/20 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-amber-950/30 via-[#090a0f] to-[#090a0f]">
            {activeTemplate !== "minimal" && (
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            )}
          </div>
        )}

        {/* Cinematic Letterbox Top/Bottom accent borders */}
        {activeTemplate === "cinematic" && (
          <>
            <div className="absolute top-0 left-0 right-0 h-2 sm:h-3 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent z-20" />
            <div className="absolute bottom-0 left-0 right-0 h-2 sm:h-3 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent z-20" />
          </>
        )}

        {/* Luxury Gold Corner / Accent Flourish */}
        {activeTemplate === "luxury" && (
          <div className="absolute inset-4 sm:inset-8 border border-amber-300/20 pointer-events-none z-10 hidden sm:block">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-amber-300/60" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-amber-300/60" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-amber-300/60" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-amber-300/60" />
          </div>
        )}

        {/* ── Template Hero Layouts ── */}
        {activeTemplate === "editorial" ? (
          /* Editorial / High-Fashion Magazine Layout */
          <div className="relative z-10 max-w-5xl mx-auto space-y-6 pt-12 animate-in fade-in zoom-in-95 duration-700 text-left sm:text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-mono uppercase tracking-[0.3em] backdrop-blur-md">
              <span>Vol. 01 &bull; The Wedding Archive &bull; Private Edition</span>
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase font-serif tracking-[0.4em] text-amber-200/80 block">
                The Wedding Of
              </span>
              <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-serif font-bold text-white tracking-tight leading-[1.08] uppercase break-words drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
                {gallery.coupleName}
              </h1>
            </div>

            <div className="py-2 border-y border-white/15 max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs uppercase font-mono tracking-widest text-slate-300">
              {formattedDate && <span>Date: {formattedDate}</span>}
              {weddingLocation && <span>Location: {weddingLocation}</span>}
              <span>Curated by: {studioName}</span>
            </div>

            <p className="text-base sm:text-lg font-serif italic text-slate-200 max-w-xl mx-auto drop-shadow">
              &ldquo;An intimate archival record of emotion, elegance, and timeless celebration.&rdquo;
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              {allVideos.length > 0 && (
                <button
                  onClick={() => setSelectedVideoIndex(0)}
                  className="h-12 w-full sm:w-auto wedding-gold-btn text-xs sm:text-sm px-7 py-3 rounded-xl tracking-wider uppercase cursor-pointer flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  <span>Watch Feature Film</span>
                </button>
              )}
              {ceremonyEvents.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("events");
                    document.getElementById("events-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-6 py-3 rounded-xl border border-amber-400/30 hover:border-amber-400 text-amber-200 hover:text-white tracking-wider uppercase cursor-pointer flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Explore Chapters &darr;</span>
                </button>
              )}
              {allPhotos.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("photos");
                    setSelectedEventFilter("all");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-6 py-3 rounded-xl border border-white/20 hover:border-amber-400 text-white tracking-wider uppercase cursor-pointer flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <ImageIcon className="w-4 h-4 text-amber-300" />
                  <span>Explore Photos ({allPhotos.length})</span>
                </button>
              )}
              {selectionConfig?.enabled && (
                <button
                  onClick={() => {
                    setActiveTab("selections");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-5 py-3 rounded-xl border border-amber-400/30 hover:border-amber-400 text-amber-200 hover:text-white tracking-wider uppercase cursor-pointer flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>Choose Photos ({selections.length})</span>
                </button>
              )}
              {gallery.settings?.allowFavorites !== false && favorites.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("favorites");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-5 py-3 rounded-xl border border-rose-400/30 hover:border-rose-400 text-rose-200 hover:text-white tracking-wider uppercase cursor-pointer flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
                  <span>Favorites ({favorites.length})</span>
                </button>
              )}
            </div>
          </div>
        ) : activeTemplate === "minimal" ? (
          /* Modern Minimalist / Swiss Clean Aesthetic */
          <div className="relative z-10 max-w-3xl mx-auto space-y-6 pt-8 animate-in fade-in zoom-in-95 duration-700">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-sans font-light text-white tracking-[0.2em] uppercase leading-tight break-words drop-shadow">
              {gallery.coupleName}
            </h1>

            <div className="w-12 h-px bg-white/40 mx-auto" />

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-sans uppercase tracking-[0.25em] text-slate-300">
              {formattedDate && <span>{formattedDate}</span>}
              {formattedDate && weddingLocation && <span>/</span>}
              {weddingLocation && <span>{weddingLocation}</span>}
            </div>

            <div className="pt-6 flex flex-wrap items-center justify-center gap-3">
              {allVideos.length > 0 && (
                <button
                  onClick={() => setSelectedVideoIndex(0)}
                  className="h-12 w-full sm:w-auto bg-white text-black hover:bg-neutral-200 transition-colors text-xs font-semibold px-7 py-3 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  <span>Watch Feature Film</span>
                </button>
              )}
              {ceremonyEvents.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("events");
                    document.getElementById("events-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold px-6 py-3 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Explore Chapters &darr;</span>
                </button>
              )}
              {allPhotos.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("photos");
                    setSelectedEventFilter("all");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold px-6 py-3 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <ImageIcon className="w-4 h-4 text-amber-300" />
                  <span>Explore Photos ({allPhotos.length})</span>
                </button>
              )}
              {selectionConfig?.enabled && (
                <button
                  onClick={() => {
                    setActiveTab("selections");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-amber-400/40 text-amber-200 text-xs font-semibold px-5 py-3 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>Choose Photos ({selections.length})</span>
                </button>
              )}
              {gallery.settings?.allowFavorites !== false && favorites.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("favorites");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-rose-400/40 text-rose-200 text-xs font-semibold px-5 py-3 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
                  <span>Favorites ({favorites.length})</span>
                </button>
              )}
            </div>
          </div>
        ) : activeTemplate === "cinematic" ? (
          /* Cinematic / Widescreen Theatrical Premiere */
          <div className="relative z-10 max-w-4xl mx-auto space-y-7 pt-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-mono uppercase tracking-widest backdrop-blur-md shadow-lg shadow-amber-500/10">
              <Tv className="w-3.5 h-3.5 text-amber-400" />
              <span>CHAPTER ONE &bull; {studioName}</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-serif font-black text-white tracking-wider uppercase leading-[1.08] break-words drop-shadow-[0_15px_35px_rgba(245,158,11,0.35)]">
                {gallery.coupleName}
              </h1>
              <div className="inline-block px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-[11px] font-mono tracking-[0.3em] uppercase text-amber-300 backdrop-blur-md">
                WEDDING FILM PREMIERE
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base font-serif italic text-amber-200/90 tracking-widest uppercase">
              {formattedDate && <span>{formattedDate}</span>}
              {weddingLocation && <span>&bull; {weddingLocation}</span>}
            </div>

            <p className="text-base sm:text-xl font-serif italic text-slate-200 max-w-2xl mx-auto drop-shadow">
              &ldquo;Every smile. Every glance. The complete chronicle of our love.&rdquo;
            </p>

            <div className="pt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {allVideos.length > 0 && (
                <button
                  onClick={() => setSelectedVideoIndex(0)}
                  className="h-12 w-full sm:w-auto wedding-gold-btn text-xs sm:text-sm px-8 py-3.5 rounded-xl shadow-2xl hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2.5 font-bold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  <span>Watch Feature Film</span>
                </button>
              )}

              {ceremonyEvents.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("events");
                    document.getElementById("events-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-6 py-3.5 rounded-xl border border-amber-400/30 hover:border-amber-400 text-amber-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 font-semibold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Explore The Chapters &darr;</span>
                </button>
              )}

              {allPhotos.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("photos");
                    setSelectedEventFilter("all");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-6 py-3.5 rounded-xl border border-white/20 hover:border-amber-400/40 text-slate-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider font-semibold focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <ImageIcon className="w-4 h-4 text-amber-300" />
                  <span>Explore Photos ({allPhotos.length})</span>
                </button>
              )}

              {selectionConfig?.enabled && (
                <button
                  onClick={() => {
                    setActiveTab("selections");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-5 py-3.5 rounded-xl border border-amber-400/30 hover:border-amber-400 text-amber-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 font-semibold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>Choose Photos ({selections.length})</span>
                </button>
              )}

              {gallery.settings?.allowFavorites !== false && favorites.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("favorites");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-5 py-3.5 rounded-xl border border-rose-400/30 hover:border-rose-400 text-rose-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 font-semibold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
                  <span>Favorites ({favorites.length})</span>
                </button>
              )}
            </div>
          </div>
        ) : activeTemplate === "luxury" ? (
          /* Velvet Black-Tie & Champagne Luxury */
          <div className="relative z-10 max-w-4xl mx-auto space-y-6 pt-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-400/20 via-amber-300/30 to-amber-400/20 border border-amber-300/50 text-amber-200 text-xs font-serif uppercase tracking-[0.3em] backdrop-blur-md shadow-lg shadow-amber-400/10">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>CHAPTER ONE &bull; BESPOKE ARCHIVE</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-200 to-amber-500 uppercase tracking-widest leading-[1.08] break-words drop-shadow-2xl">
                {gallery.coupleName}
              </h1>
              <div className="inline-block px-3 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-[11px] font-serif tracking-[0.3em] uppercase text-amber-200 backdrop-blur-md">
                WEDDING
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base font-serif italic text-amber-200/90 tracking-widest uppercase">
              {formattedDate && <span>Est. {formattedDate}</span>}
              {weddingLocation && <span>&bull; {weddingLocation}</span>}
            </div>

            <p className="text-base sm:text-lg font-serif italic text-slate-200 max-w-xl mx-auto">
              &ldquo;Every smile. Every glance. The complete chronicle of our love.&rdquo;
            </p>

            <div className="pt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {allVideos.length > 0 && (
                <button
                  onClick={() => setSelectedVideoIndex(0)}
                  className="h-12 w-full sm:w-auto wedding-gold-btn text-xs sm:text-sm px-8 py-3.5 rounded-xl shadow-2xl hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2 tracking-widest uppercase font-serif focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  <span>Watch Feature Film</span>
                </button>
              )}

              {ceremonyEvents.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("events");
                    document.getElementById("events-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-6 py-3.5 rounded-xl border border-amber-300/30 hover:border-amber-300 text-amber-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 tracking-widest uppercase font-serif focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Explore The Chapters &darr;</span>
                </button>
              )}

              {allPhotos.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("photos");
                    setSelectedEventFilter("all");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-6 py-3.5 rounded-xl border border-amber-300/30 hover:border-amber-300 text-amber-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 tracking-widest uppercase font-serif focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <ImageIcon className="w-4 h-4 text-amber-300" />
                  <span>Explore Photos ({allPhotos.length})</span>
                </button>
              )}

              {selectionConfig?.enabled && (
                <button
                  onClick={() => {
                    setActiveTab("selections");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-5 py-3.5 rounded-xl border border-amber-300/30 hover:border-amber-300 text-amber-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 tracking-widest uppercase font-serif focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>Choose Photos ({selections.length})</span>
                </button>
              )}

              {gallery.settings?.allowFavorites !== false && favorites.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("favorites");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-5 py-3.5 rounded-xl border border-rose-400/30 hover:border-rose-400 text-rose-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 tracking-widest uppercase font-serif focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
                  <span>Favorites ({favorites.length})</span>
                </button>
              )}
            </div>
          </div>
        ) : activeTemplate === "story" ? (
          /* Narrative Documentary / Story Template */
          <div className="relative z-10 max-w-4xl mx-auto space-y-6 pt-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs font-semibold uppercase tracking-widest backdrop-blur-md">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>CHAPTER ONE &bull; THE JOURNEY BEGINS</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-serif font-bold text-white tracking-tight leading-[1.08] uppercase break-words drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
                {gallery.coupleName}
              </h1>
              <div className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-mono tracking-[0.3em] uppercase text-amber-300 backdrop-blur-md">
                WEDDING
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base font-serif italic text-amber-200/90 tracking-widest uppercase">
              {formattedDate && <span>{formattedDate}</span>}
              {weddingLocation && <span>&bull; {weddingLocation}</span>}
            </div>

            <p className="text-base sm:text-xl font-serif italic text-slate-200 max-w-2xl mx-auto drop-shadow">
              &ldquo;Every smile. Every glance. The complete chronicle of our love.&rdquo;
            </p>

            <div className="pt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {allVideos.length > 0 && (
                <button
                  onClick={() => setSelectedVideoIndex(0)}
                  className="h-12 w-full sm:w-auto wedding-gold-btn text-xs sm:text-sm px-7 py-3.5 rounded-xl shadow-2xl hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2.5 font-bold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  <span>Watch Feature Film</span>
                </button>
              )}

              {ceremonyEvents.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("events");
                    document.getElementById("events-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-6 py-3.5 rounded-xl border border-amber-400/30 hover:border-amber-400 text-amber-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 font-semibold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Explore The Chapters &darr;</span>
                </button>
              )}

              {allPhotos.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("photos");
                    setSelectedEventFilter("all");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-6 py-3.5 rounded-xl border border-white/15 hover:border-white/30 text-slate-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 font-semibold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <ImageIcon className="w-4 h-4 text-amber-300" />
                  <span>Explore Photos ({allPhotos.length})</span>
                </button>
              )}

              {selectionConfig?.enabled && (
                <button
                  onClick={() => {
                    setActiveTab("selections");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-5 py-3.5 rounded-xl border border-amber-400/30 hover:border-amber-400 text-amber-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 font-semibold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>Choose Photos ({selections.length})</span>
                </button>
              )}

              {gallery.settings?.allowFavorites !== false && favorites.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("favorites");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-5 py-3.5 rounded-xl border border-rose-400/30 hover:border-rose-400 text-rose-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 font-semibold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
                  <span>Favorites ({favorites.length})</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Classic Template (Default) */
          <div className="relative z-10 max-w-4xl mx-auto space-y-6 pt-12 animate-in fade-in zoom-in-95 duration-700">
            {/* 1. Kicker */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs font-semibold uppercase tracking-widest backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{studioSubtitle || "CHAPTER ONE · THE JOURNEY BEGINS"}</span>
            </div>

            {/* 2. Couple Name with responsive typography */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-serif font-bold text-white tracking-tight leading-[1.08] uppercase break-words max-w-4xl mx-auto px-2 drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]">
                {gallery.coupleName}
              </h1>

              {/* 3. Subtitle Badge */}
              <div className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-mono tracking-[0.3em] uppercase text-amber-300 backdrop-blur-md">
                WEDDING
              </div>
            </div>

            {/* 4. Date & Location */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm md:text-base font-serif italic text-amber-200/90 tracking-widest uppercase">
              {formattedDate && <span>{formattedDate}</span>}
              {formattedDate && weddingLocation && <span>&bull;</span>}
              {weddingLocation && (
                <span className="inline-flex items-center gap-1.5 not-italic font-sans text-xs uppercase tracking-widest text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  {weddingLocation}
                </span>
              )}
            </div>

            {/* 5. Quote */}
            <p className="text-base sm:text-lg md:text-xl font-serif italic text-slate-100 max-w-2xl mx-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              &ldquo;{gallery.welcomeMessage || "Every smile. Every glance. The complete chronicle of our love."}&rdquo;
            </p>

            {/* 6. Buttons */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full max-w-2xl mx-auto">
              {allVideos.length > 0 && (
                <button
                  onClick={() => setSelectedVideoIndex(0)}
                  className="h-12 w-full sm:w-auto wedding-gold-btn text-xs sm:text-sm px-7 py-3.5 rounded-xl shadow-2xl hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2.5 font-bold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  <span>Watch Feature Film</span>
                </button>
              )}

              {ceremonyEvents.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("events");
                    const el = document.getElementById("events-section");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-6 py-3.5 rounded-xl border border-amber-400/30 hover:border-amber-400 text-amber-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 font-semibold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Explore The Chapters &darr;</span>
                </button>
              )}

              {allPhotos.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("photos");
                    setSelectedEventFilter("all");
                    const el = document.getElementById("media-section");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-6 py-3.5 rounded-xl border border-white/15 hover:border-white/30 text-slate-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 font-semibold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <ImageIcon className="w-4 h-4 text-amber-300" />
                  <span>Explore Photos ({allPhotos.length})</span>
                </button>
              )}

              {selectionConfig?.enabled && (
                <button
                  onClick={() => {
                    setActiveTab("selections");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-5 py-3.5 rounded-xl border border-amber-400/30 hover:border-amber-400 text-amber-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 font-semibold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>Choose Photos ({selections.length})</span>
                </button>
              )}

              {gallery.settings?.allowFavorites !== false && favorites.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab("favorites");
                    document.getElementById("media-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-12 w-full sm:w-auto glass-button text-xs sm:text-sm px-5 py-3.5 rounded-xl border border-rose-400/30 hover:border-rose-400 text-rose-200 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 font-semibold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
                  <span>Favorites ({favorites.length})</span>
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── 2A. Interactive Story Chapters & Narrative Timeline (for Story template) ── */}
      {activeTemplate === "story" && ceremonyEvents.length > 0 && (
        <section id="timeline" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="text-center max-w-xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-300 text-[11px] font-mono uppercase tracking-widest mb-3">
              <Clock className="w-3 h-3" />
              <span>Chronological Narrative</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide uppercase">
              Wedding Story Chapters
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Follow the celebration moment by moment. Click any chapter to jump directly to its photographs and films.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
            {ceremonyEvents.map((chap, idx) => (
              <button
                key={chap.name + idx}
                onClick={() => {
                  setSelectedEventFilter(chap.name);
                  setActiveTab("photos");
                  const el = document.getElementById("media-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="glass-panel p-5 text-left border border-white/10 hover:border-amber-400/40 hover:scale-[1.02] transition-all cursor-pointer group flex flex-col justify-between space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono text-xs font-bold flex items-center justify-center group-hover:bg-amber-400 group-hover:text-black transition-colors">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                    Chapter {idx + 1}
                  </span>
                </div>

                <div>
                  <h4 className="font-serif text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    {chap.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    {chap.photoCount ?? 0} Photos &bull; {chap.videoCount ?? 0} Films
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-amber-300/80 font-semibold group-hover:text-amber-300">
                  <span>View Chapter</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 2B. Our Story / Welcome Message ── */}
      <section id="story" className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
        <div className="glass-panel p-8 sm:p-14 border border-white/10 shadow-2xl space-y-5">
          <div className="w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center mx-auto">
            <Heart className="w-5 h-5 fill-amber-400/20" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide uppercase">
            Our Story
          </h2>

          <p className="text-sm sm:text-base font-serif italic text-slate-300 leading-relaxed max-w-2xl mx-auto">
            {gallery.welcomeMessage ||
              "Welcome to your wedding memories. We hope these photos and films bring back every emotion from your special day."}
          </p>

          <div className="pt-4 border-t border-white/10 flex items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400 font-mono flex-wrap">
            <span>{ceremonyEvents.length} Event Chapters</span>
            <span>&bull;</span>
            <span>{allPhotos.length} Photographs</span>
            <span>&bull;</span>
            <span>{allVideos.length} Cinematic Films</span>
          </div>
        </div>
      </section>

      {/* ── 3. Ceremony Event Cards ── */}
      {ceremonyEvents.length > 0 && (
        <section id="events-section" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-amber-400 mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span>THE CHAPTERS</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-serif font-bold text-white">
                Ceremony Chapters
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
              Explore your celebrations organized by ceremony, with both photographs and cinematic films.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {ceremonyEvents.map((evt, idx) => (
              <EventCard
                key={evt.id || evt.name}
                event={evt}
                index={idx}
                onClick={() => {
                  setSelectedEventFilter(evt.name);
                  // Choose photos or films depending on what's available
                  if ((evt.photoCount || 0) > 0) {
                    setActiveTab("photos");
                    setEventMediaSubTab("photos");
                  } else {
                    setActiveTab("films");
                    setEventMediaSubTab("films");
                  }
                  const el = document.getElementById("media-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 4. Featured Highlights (Photos & Films) on Homepage ── */}
      {activeTab === "home" && (
        <>
          {/* Featured Films Showcase */}
          {featuredVideos.length > 0 && (
            <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-amber-400 mb-1">
                    <Film className="w-3.5 h-3.5" />
                    <span>MOTION</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                    Signature Cinematic Reels
                  </h2>
                </div>

                <button
                  onClick={() => {
                    setActiveTab("films");
                    setSelectedEventFilter("all");
                    const el = document.getElementById("media-section");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-xs text-amber-300 hover:text-white flex items-center gap-1 underline underline-offset-4"
                >
                  View All Films ({allVideos.length}) &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {featuredVideos.map((video, idx) => {
                  const videoId = video.id || video.driveFileId;
                  const isFav = favorites.includes(videoId);
                  return (
                    <GalleryVideoCard
                      key={videoId}
                      video={video}
                      index={idx}
                      allowDownloads={allowDownloads}
                      isFavorite={isFav}
                      onToggleFavorite={() => toggleFavorite(videoId)}
                      onPlay={() => {
                        const originalIdx = allVideos.findIndex(
                          (v) => (v.id || v.driveFileId) === videoId
                        );
                        setSelectedVideoIndex(originalIdx !== -1 ? originalIdx : idx);
                      }}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Featured Photos Showcase */}
          {featuredPhotos.length > 0 && (
            <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-amber-400 mb-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>PHOTO STORIES</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                    Curated Photographs
                  </h2>
                </div>

                <button
                  onClick={() => {
                    setActiveTab("photos");
                    setSelectedEventFilter("all");
                    const el = document.getElementById("media-section");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-xs text-amber-300 hover:text-white flex items-center gap-1 underline underline-offset-4"
                >
                  View All Photos ({allPhotos.length}) &rarr;
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                {featuredPhotos.map((photo, idx) => {
                  const photoId = photo.id || photo.driveFileId;
                  const isFav = favorites.includes(photoId);
                  const isSel = selections.includes(photoId);
                  return (
                    <GalleryPhotoCard
                      key={photoId}
                      photo={photo}
                      index={idx}
                      allowDownloads={allowDownloads}
                      accessCode={accessCode}
                      isFavorite={isFav}
                      onToggleFavorite={(id, e) => toggleFavorite(id, e)}
                      isSelectionMode={selectionConfig?.enabled ?? false}
                      isSelected={isSel}
                      onToggleSelect={(id, e) => toggleSelection(id, e)}
                      onClick={() => {
                        setLightboxPhotos(featuredPhotos);
                        setSelectedPhotoIndex(idx);
                      }}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── 5. Main Media Section (Photos, Films, Favorites, Selections) ── */}
      <section id="media-section" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-amber-400 mb-1">
              {activeTab === "photos" ? (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>PHOTO STORIES</span>
                </>
              ) : activeTab === "films" ? (
                <>
                  <Film className="w-3.5 h-3.5" />
                  <span>MOTION</span>
                </>
              ) : activeTab === "favorites" ? (
                <>
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span>YOUR FAVORITES</span>
                </>
              ) : activeTab === "selections" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  <span>ALBUM SELECTION</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>COMPLETE COLLECTION</span>
                </>
              )}
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-white">
              {activeTab === "selections"
                ? "Album Selection"
                : activeTab === "favorites"
                ? "My Favorite Moments"
                : activeTab === "photos"
                ? selectedEventFilter !== "all"
                  ? `${selectedEventFilter} Photographs`
                  : "Wedding Photographs"
                : activeTab === "films"
                ? selectedEventFilter !== "all"
                  ? `${selectedEventFilter} Films`
                  : "Wedding Cinema & Moments"
                : "Photos & Films"}
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            {activeTab === "selections"
              ? `Select up to ${selectionConfig?.limit || 20} photos and films for your custom wedding album.`
              : activeTab === "favorites"
              ? "All photos and films you have saved for quick access and viewing."
              : "Stream in high definition directly from Google Drive or save to your favorites."}
          </p>
        </div>

        {/* Media Type Sub-Tabs (when on photos or films or filtering an event) */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 text-xs font-semibold">
            <button
              onClick={() => {
                setActiveTab("photos");
                setEventMediaSubTab("photos");
              }}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "photos"
                  ? "bg-amber-400 text-black font-bold shadow-lg shadow-amber-400/20"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photos ({selectedEventFilter === "all" ? allPhotos.length : displayedPhotos.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("films");
                setEventMediaSubTab("films");
              }}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "films"
                  ? "bg-amber-400 text-black font-bold shadow-lg shadow-amber-400/20"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Films ({selectedEventFilter === "all" ? allVideos.length : displayedVideos.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("favorites")}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "favorites"
                  ? "bg-amber-400 text-black font-bold shadow-lg shadow-amber-400/20"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${favorites.length > 0 ? "text-rose-400 fill-rose-400" : ""}`} />
              <span>Favorites ({favorites.length})</span>
            </button>

            {selectionConfig?.enabled && (
              <button
                onClick={() => setActiveTab("selections")}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "selections"
                    ? "bg-amber-400 text-black font-bold shadow-lg shadow-amber-400/20"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Album Selection ({selections.length}/{selectionConfig.limit || 20})</span>
              </button>
            )}
          </div>

          {/* In Favorites Tab: sub-filter pill */}
          {activeTab === "favorites" && (
            <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setFavoritesFilter("all")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  favoritesFilter === "all" ? "bg-white/20 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                All ({favorites.length})
              </button>
              <button
                onClick={() => setFavoritesFilter("photos")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  favoritesFilter === "photos" ? "bg-white/20 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Photos ({favPhotosCount})
              </button>
              <button
                onClick={() => setFavoritesFilter("films")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  favoritesFilter === "films" ? "bg-white/20 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Films ({favVideosCount})
              </button>
            </div>
          )}

          {/* In Album Selection Tab: sub-filter pill */}
          {activeTab === "selections" && (
            <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setFavoritesFilter("all")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  favoritesFilter === "all" ? "bg-white/20 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                All ({selections.length})
              </button>
              <button
                onClick={() => setFavoritesFilter("photos")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  favoritesFilter === "photos" ? "bg-white/20 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Photos ({selectedPhotosCount})
              </button>
              <button
                onClick={() => setFavoritesFilter("films")}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  favoritesFilter === "films" ? "bg-white/20 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Films ({selectedVideosCount})
              </button>
            </div>
          )}
        </div>

        {/* Filter Bar, Event Chips, Search, and Sort Controls */}
        <div className="mb-8 space-y-4">
          <div className="glass-panel p-4 border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Event Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto scrollbar-none">
              <button
                onClick={() => setSelectedEventFilter("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedEventFilter === "all"
                    ? "bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>All Events</span>
              </button>

              {ceremonyEvents.map((evt) => (
                <button
                  key={evt.name}
                  onClick={() => setSelectedEventFilter(evt.name)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedEventFilter.toLowerCase() === evt.name.toLowerCase()
                      ? "bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20"
                      : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                  }`}
                >
                  <span>{evt.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedEventFilter.toLowerCase() === evt.name.toLowerCase()
                        ? "bg-black/20 text-black"
                        : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {activeTab === "photos"
                      ? evt.photoCount ?? evt.count
                      : activeTab === "films"
                      ? evt.videoCount ?? evt.count
                      : evt.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search and Sort controls */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={activeTab === "photos" ? "Search photos..." : "Search films..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-amber-400/50 transition-all"
                />
              </div>

              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-amber-400/50"
              >
                <option value="recommended">Recommended</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="az">A to Z</option>
              </select>

              {allowPhotoDownload && (
                <button
                  onClick={() => handleDownloadZip("all")}
                  disabled={isDownloadingZip}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all shadow-md shadow-amber-400/20 whitespace-nowrap cursor-pointer"
                  title="Download photos as ZIP archive"
                >
                  <Download className={`w-3.5 h-3.5 ${isDownloadingZip ? "animate-bounce" : ""}`} />
                  <span>{isDownloadingZip ? "Preparing..." : "Download ZIP"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Content View: PHOTOS TAB ── */}
        {activeTab === "photos" && (
          <div>
            {displayedPhotos.length === 0 ? (
              <div className="glass-panel py-16 px-6 text-center border border-white/10 max-w-md mx-auto space-y-4">
                <Camera className="w-10 h-10 text-amber-400/40 mx-auto mb-2" />
                <div>
                  <h3 className="text-base font-bold text-white">No photos match this filter</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Try selecting &ldquo;All Events&rdquo; or clearing your search term.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedEventFilter("all");
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-all cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                <div className={photoGridClasses}>
                  {displayedPhotos.slice(0, visiblePhotosCount).map((photo, idx) => {
                    const photoId = photo.id || photo.driveFileId;
                    const isFav = favoritesSet.has(photoId) || (photo.driveFileId ? favoritesSet.has(photo.driveFileId) : false);
                    const isSel = selectionsSet.has(photoId) || (photo.driveFileId ? selectionsSet.has(photo.driveFileId) : false);

                    return (
                      <GalleryPhotoCard
                        key={photoId}
                        photo={photo}
                        index={idx}
                        allowDownloads={allowDownloads}
                        accessCode={accessCode}
                        isFavorite={isFav}
                        onToggleFavorite={(id, e) => toggleFavorite(id, e)}
                        isSelectionMode={selectionConfig?.enabled ?? false}
                        isSelected={isSel}
                        onToggleSelect={(id, e) => toggleSelection(id, e)}
                        onClick={() => {
                          setLightboxPhotos(displayedPhotos);
                          setSelectedPhotoIndex(idx);
                        }}
                      />
                    );
                  })}
                </div>
                {displayedPhotos.length > visiblePhotosCount && (
                  <div className="mt-8 flex flex-col items-center justify-center space-y-2">
                    <div ref={loadMoreSentinelRef} className="h-4 w-full" />
                    <button
                      onClick={() => setVisiblePhotosCount((prev) => Math.min(prev + 48, displayedPhotos.length))}
                      className="px-6 py-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 font-medium text-xs sm:text-sm transition-all cursor-pointer shadow-lg hover:border-amber-400/50"
                    >
                      Load More Photos ({visiblePhotosCount} of {displayedPhotos.length})
                    </button>
                    <p className="text-[11px] text-slate-500">
                      Showing {Math.min(visiblePhotosCount, displayedPhotos.length)} of {displayedPhotos.length} photographs
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Content View: FILMS TAB ── */}
        {activeTab === "films" && (
          <div>
            {displayedVideos.length === 0 ? (
              <div className="glass-panel py-16 px-6 text-center border border-white/10 max-w-md mx-auto space-y-4">
                <Film className="w-10 h-10 text-amber-400/40 mx-auto mb-2" />
                <div>
                  <h3 className="text-base font-bold text-white">No films match this filter</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Try choosing another ceremony chapter or clearing your search filter.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedEventFilter("all");
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-all cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {displayedVideos.map((video, idx) => {
                  const videoId = video.id || video.driveFileId;
                  const isFav = favorites.includes(videoId);
                  const isSel = selections.includes(videoId);

                  return (
                    <GalleryVideoCard
                      key={videoId}
                      video={video}
                      index={idx}
                      allowDownloads={allowDownloads}
                      isFavorite={isFav}
                      onToggleFavorite={() => toggleFavorite(videoId)}
                      isSelectionMode={selectionConfig?.enabled ?? false}
                      isSelected={isSel}
                      onToggleSelect={(id, e) => toggleSelection(id, e)}
                      onPlay={() => {
                        setSelectedVideoIndex(idx);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Content View: FAVORITES TAB ── */}
        {activeTab === "favorites" && (
          <div className="space-y-12">
            {favorites.length === 0 ? (
              <div className="glass-panel py-20 px-6 text-center border border-white/10 max-w-md mx-auto space-y-4">
                <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                  <Heart className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-white">No favorites yet</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Save your favorite wedding memories here.<br />
                    Browse your gallery and tap the heart icon.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setActiveTab("photos");
                      setSelectedEventFilter("all");
                      const el = document.getElementById("media-section");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="wedding-gold-btn text-xs px-6 py-2.5 cursor-pointer"
                  >
                    Explore Gallery
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Favorited Photos */}
                {(favoritesFilter === "all" || favoritesFilter === "photos") && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-amber-400" />
                        <h3 className="text-lg sm:text-xl font-serif font-bold text-white">
                          Saved Photographs ({displayedPhotos.length})
                        </h3>
                      </div>

                      {allowDownloads && displayedPhotos.length > 0 && (
                        <button
                          onClick={() => handleDownloadZip("favorites")}
                          disabled={isDownloadingZip}
                          className="wedding-gold-btn text-xs px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-400/20"
                        >
                          <Download className={`w-3.5 h-3.5 ${isDownloadingZip ? "animate-bounce" : ""}`} />
                          <span>{isDownloadingZip ? "Generating..." : "Download Favorites (.zip)"}</span>
                        </button>
                      )}
                    </div>

                    {displayedPhotos.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4">No favorited photos in this filter.</p>
                    ) : (
                      <div className={photoGridClasses}>
                        {displayedPhotos.map((photo, idx) => {
                          const photoId = photo.id || photo.driveFileId;
                          const isSel = selections.includes(photoId);
                          return (
                            <GalleryPhotoCard
                              key={photoId}
                              photo={photo}
                              index={idx}
                              allowDownloads={allowDownloads}
                              accessCode={accessCode}
                              isFavorite={true}
                              onToggleFavorite={(id, e) => toggleFavorite(id, e)}
                              isSelectionMode={selectionConfig?.enabled ?? false}
                              isSelected={isSel}
                              onToggleSelect={(id, e) => toggleSelection(id, e)}
                              onClick={() => {
                                setLightboxPhotos(displayedPhotos);
                                setSelectedPhotoIndex(idx);
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Favorited Films */}
                {(favoritesFilter === "all" || favoritesFilter === "films") && (
                  <div className="pt-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4 text-amber-400" />
                        <h3 className="text-lg sm:text-xl font-serif font-bold text-white">
                          Saved Wedding Films ({displayedVideos.length})
                        </h3>
                      </div>
                    </div>

                    {displayedVideos.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4">No favorited films in this filter.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {displayedVideos.map((video, idx) => {
                          const videoId = video.id || video.driveFileId;
                          const isSel = selections.includes(videoId);
                          return (
                            <GalleryVideoCard
                              key={videoId}
                              video={video}
                              index={idx}
                              allowDownloads={allowDownloads}
                              isFavorite={true}
                              onToggleFavorite={() => toggleFavorite(videoId)}
                              isSelectionMode={selectionConfig?.enabled ?? false}
                              isSelected={isSel}
                              onToggleSelect={(id, e) => toggleSelection(id, e)}
                              onPlay={() => setSelectedVideoIndex(idx)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Content View: ALBUM SELECTION TAB ── */}
        {activeTab === "selections" && (
          <div className="space-y-8">
            {/* Status and Action Banner */}
            <div className="glass-panel p-5 sm:p-6 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-serif font-bold text-white">
                      {selectionConfig?.title || "Wedding Album Selection"}
                    </h3>
                    {selectionConfig?.status === "LOCKED" ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                        LOCKED
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {selectionConfig?.status === "LOCKED"
                      ? "Album selection has been locked by your photographer."
                      : selectionConfig?.instructions ||
                        `Select up to ${selectionConfig?.limit || 20} items. You have selected ${selections.length} of ${selectionConfig?.limit || 20}.`}
                  </p>
                </div>
              </div>

              {selectionConfig?.enabled && (
                <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
                  {allowDownloads && selections.length > 0 && (
                    <button
                      onClick={() => handleDownloadZip("selected")}
                      disabled={isDownloadingZip}
                      className="glass-button text-xs px-3.5 py-2 rounded-xl border border-white/20 hover:border-amber-400 text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Download className={`w-3.5 h-3.5 ${isDownloadingZip ? "animate-bounce" : ""}`} />
                      <span>{isDownloadingZip ? "Generating..." : "Download Selected (.zip)"}</span>
                    </button>
                  )}
                  {selectionConfig?.status !== "LOCKED" && (
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      disabled={selections.length === 0 || isSubmittingSelection}
                      className="wedding-gold-btn text-xs px-5 py-2 flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Review & Submit ({selections.length}/{selectionConfig?.limit || 20})</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {selections.length === 0 ? (
              <div className="glass-panel py-20 px-6 text-center border border-white/10 max-w-md mx-auto space-y-4">
                <div className="w-14 h-14 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center mx-auto">
                  <ListChecks className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-white">No album selections yet</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Browse your wedding photos and films, and click the checkmark on any item to add it to your custom wedding album.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setActiveTab("photos");
                      setSelectedEventFilter("all");
                      const el = document.getElementById("media-section");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="wedding-gold-btn text-xs px-6 py-2.5 cursor-pointer"
                  >
                    Explore Photos
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Selected Photos */}
                {(favoritesFilter === "all" || favoritesFilter === "photos") && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-amber-400" />
                        <h3 className="text-lg sm:text-xl font-serif font-bold text-white">
                          Selected Photographs ({displayedPhotos.length})
                        </h3>
                      </div>
                    </div>

                    {displayedPhotos.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4">No selected photos in this filter.</p>
                    ) : (
                      <div className={photoGridClasses}>
                        {displayedPhotos.map((photo, idx) => {
                          const photoId = photo.id || photo.driveFileId;
                          const isFav = favorites.includes(photoId);
                          return (
                            <GalleryPhotoCard
                              key={photoId}
                              photo={photo}
                              index={idx}
                              allowDownloads={allowDownloads}
                              accessCode={accessCode}
                              isFavorite={isFav}
                              onToggleFavorite={(id, e) => toggleFavorite(id, e)}
                              isSelectionMode={true}
                              isSelected={true}
                              onToggleSelect={(id, e) => toggleSelection(id, e)}
                              onClick={() => {
                                setLightboxPhotos(displayedPhotos);
                                setSelectedPhotoIndex(idx);
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Films */}
                {(favoritesFilter === "all" || favoritesFilter === "films") && (
                  <div className="pt-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4 text-amber-400" />
                        <h3 className="text-lg sm:text-xl font-serif font-bold text-white">
                          Selected Films ({displayedVideos.length})
                        </h3>
                      </div>
                    </div>

                    {displayedVideos.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4">No selected films in this filter.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {displayedVideos.map((video, idx) => {
                          const videoId = video.id || video.driveFileId;
                          const isFav = favorites.includes(videoId);
                          return (
                            <GalleryVideoCard
                              key={videoId}
                              video={video}
                              index={idx}
                              allowDownloads={allowDownloads}
                              isFavorite={isFav}
                              onToggleFavorite={() => toggleFavorite(videoId)}
                              isSelectionMode={true}
                              isSelected={true}
                              onToggleSelect={(id, e) => toggleSelection(id, e)}
                              onPlay={() => setSelectedVideoIndex(idx)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Submit Banner */}
                {selectionConfig?.enabled && selectionConfig?.status !== "LOCKED" && (
                  <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">Ready with your selection?</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        You have selected {selections.length} of {selectionConfig?.limit || 20} items. Submit your choices to notify your photographer.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      className="wedding-gold-btn text-xs px-6 py-3 flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer whitespace-nowrap"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit Album Selection</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* ── 6. Photographer Branding & Studio Footer ── */}
      {showBranding && (
        <footer className="relative z-10 border-t border-white/10 py-16 text-center text-xs text-slate-400 bg-black/60 mt-auto">
          <div className="max-w-md mx-auto px-4 space-y-5">
            <div className="w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-400/5">
              <Heart className="w-5 h-5 fill-amber-400/30" />
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block mb-1">
                Captured & Crafted by
              </span>
              <h4 className="font-serif text-lg font-bold text-white uppercase tracking-wider">
                {studioName}
              </h4>
              <p className="font-serif italic text-xs text-amber-200/80 mt-1.5">
                {gallery.branding?.subtitle || gallery.branding?.tagline || "Wedding Cinema & Photography"}
              </p>
              {gallery.branding?.websiteUrl && (
                <div className="pt-2">
                  <a
                    href={gallery.branding.websiteUrl.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-serif text-amber-400/90 hover:text-amber-300 transition-colors underline-offset-4 hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5 text-amber-400" />
                    <span>{gallery.branding.websiteUrl.display}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Studio Contact / Social Links */}
            <div className="flex items-center justify-center gap-3 text-xs pt-1 flex-wrap">
              {gallery.branding?.websiteUrl && (
                <a
                  href={gallery.branding.websiteUrl.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/30"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Website</span>
                </a>
              )}

              {gallery.branding?.phone && (
                <a
                  href={`tel:${gallery.branding.phone}`}
                  className="text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{gallery.branding.phone}</span>
                </a>
              )}

              {gallery.branding?.instagram && (
                <a
                  href={
                    gallery.branding.instagram.startsWith("http")
                      ? gallery.branding.instagram
                      : `https://instagram.com/${gallery.branding.instagram.replace("@", "")}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Instagram</span>
                </a>
              )}

              {gallery.branding?.facebook && (
                <a
                  href={gallery.branding.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </a>
              )}

              {gallery.branding?.whatsapp && (
                <a
                  href={`https://wa.me/${gallery.branding.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>

            {whiteLabelEnabled ? (
              <p className="text-[11px] text-slate-500 pt-3 font-mono">
                &copy; {new Date().getFullYear()} {studioName}. All rights reserved.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 pt-3 font-mono">
                Wedding Video & Photo Gallery Client Delivery &bull; Streamed & Cached Directly from Google Drive
              </p>
            )}
          </div>
        </footer>
      )}

      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-6 sm:bottom-24 z-50 px-4 py-2.5 rounded-2xl bg-neutral-950/95 text-white text-xs font-semibold border border-amber-400/40 backdrop-blur-xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-3 fade-in duration-200 pointer-events-none select-none"
        >
          <div className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-300 shrink-0">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span className="tracking-wide text-slate-100">{toastMessage}</span>
        </div>
      )}

      {/* ── Fullscreen Cinema Video Modal ── */}
      {selectedVideoIndex !== null && displayedVideos[selectedVideoIndex] && (
        <VideoModal
          videos={displayedVideos}
          currentIndex={selectedVideoIndex}
          allowDownloads={allowVideoDownload}
          allowFullscreen={allowFullscreen}
          accessCode={accessCode}
          isFavorite={favorites.includes(
            displayedVideos[selectedVideoIndex].id || displayedVideos[selectedVideoIndex].driveFileId
          )}
          onToggleFavorite={(vidId) => toggleFavorite(vidId)}
          onClose={() => setSelectedVideoIndex(null)}
          onSelectIndex={setSelectedVideoIndex}
          onShare={(vid) => handleOpenShare({ name: vid.name, type: "video" })}
        />
      )}

      {/* ── Fullscreen Photo Lightbox Modal ── */}
      {selectedPhotoIndex !== null && (lightboxPhotos[selectedPhotoIndex] || displayedPhotos[selectedPhotoIndex]) && (() => {
        const activeList = lightboxPhotos.length > 0 ? lightboxPhotos : displayedPhotos;
        const currentPhoto = activeList[selectedPhotoIndex];
        const currentPhotoId = currentPhoto ? (currentPhoto.id || currentPhoto.driveFileId) : "";
        const isFav = favorites.includes(currentPhotoId) || (currentPhoto?.driveFileId ? favorites.includes(currentPhoto.driveFileId) : false);
        const isSel = selections.includes(currentPhotoId) || (currentPhoto?.driveFileId ? selections.includes(currentPhoto.driveFileId) : false);

        return (
          <PhotoLightbox
            photos={activeList}
            currentIndex={selectedPhotoIndex}
            allowDownloads={allowPhotoDownload}
            accessCode={accessCode}
            isFavorite={isFav}
            onToggleFavorite={(photoId, e) => toggleFavorite(photoId, e)}
            isSelectionMode={selectionConfig?.enabled ?? false}
            isSelected={isSel}
            onToggleSelect={(photoId, e) => toggleSelection(photoId, e)}
            onShare={(photo) => handleOpenShare({ name: photo.name, type: "photo" })}
            onClose={() => {
              setSelectedPhotoIndex(null);
              setLightboxPhotos([]);
            }}
            onSelectIndex={setSelectedPhotoIndex}
          />
        );
      })()}

      {/* ── Selection Mode Sticky Bottom Bar (appears only after client changes selection, temporarily after submit, and auto-hides after 3s) ── */}
      {selectionConfig?.enabled &&
        activeTab !== "selections" &&
        submissionState !== "hidden" && (
          <div className="fixed bottom-4 sm:bottom-6 safe-floating-bar left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-lg bg-black/95 border border-amber-400/40 backdrop-blur-xl p-2.5 sm:p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-2 sm:gap-3 text-xs animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl flex items-center justify-center font-bold ${
                  selections.length >= (selectionConfig.limit || 20)
                    ? "bg-amber-400 text-black shadow-md shadow-amber-400/30"
                    : "bg-white/10 text-amber-300 border border-white/10"
                }`}
              >
                <Check className="w-4 h-4" />
              </div>
              <div className="min-w-0 truncate">
                <div className="font-semibold text-white flex items-center gap-1.5 sm:gap-2 truncate">
                  <span className="truncate">Album Selection</span>
                  {submissionState === "submitted" ? (
                    <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold shrink-0">
                      SUBMITTED
                    </span>
                  ) : selectionConfig.status === "LOCKED" ? (
                    <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold shrink-0">
                      LOCKED
                    </span>
                  ) : null}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                  {selections.length} of {selectionConfig.limit || 20} selected
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("selections");
                  const el = document.getElementById("media-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-2.5 sm:px-3 py-2 min-h-[38px] rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors cursor-pointer text-[11px] sm:text-xs"
              >
                Review ({selections.length})
              </button>

              {submissionState !== "submitted" && selectionConfig.status !== "LOCKED" && (
                <button
                  type="button"
                  onClick={() => {
                    if (selections.length === 0) {
                      showToast("Please select at least 1 photo before submitting.");
                      return;
                    }
                    setShowSubmitModal(true);
                  }}
                  disabled={selections.length === 0 || isSubmittingSelection}
                  className="wedding-gold-btn px-3 sm:px-3.5 py-2 min-h-[38px] rounded-xl font-bold text-[11px] sm:text-xs shadow-md shadow-amber-400/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingSelection ? "Submitting..." : "Submit"}
                </button>
              )}
            </div>
          </div>
        )}

      {/* ── Selection Submit Confirmation Modal ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel p-6 sm:p-8 max-w-md w-full border border-amber-400/30 rounded-3xl shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-300 flex items-center justify-center mx-auto shadow-lg shadow-amber-400/10">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-serif font-bold text-white">
                Submit your selection?
              </h3>
              <p className="text-xs text-slate-300 mt-2 font-serif leading-relaxed">
                You have selected <strong>{selections.length}</strong> items ({selectedPhotosCount} photos, {selectedVideosCount} films).
              </p>
              <p className="text-[11px] text-amber-200/80 mt-2.5 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 leading-relaxed">
                Your photographer will receive your choices immediately. You can still modify or update your selection at any time before final album production begins.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmittingSelection}
                className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitSelection}
                disabled={isSubmittingSelection}
                className="wedding-gold-btn text-xs px-6 py-2.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingSelection ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Selection</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Celebratory Thank You Confirmation Modal ── */}
      {showThankYouModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass-panel p-6 sm:p-8 max-w-md w-full border border-amber-400/40 rounded-3xl shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-300 bg-gradient-to-b from-[#181926] via-[#10111a] to-[#0a0a0f]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/25 to-amber-600/10 border border-amber-400/50 text-amber-300 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-amber-400 font-bold block">
                Submission Confirmed
              </span>
              <h3 className="text-2xl font-serif font-bold text-white tracking-wide">
                SELECTION RECEIVED
              </h3>
              <p className="text-xs text-slate-300 font-serif leading-relaxed">
                Thank you, <strong>{gallery?.coupleName}</strong>! Your selection of <strong>{selections.length} photos</strong> has been securely received by <strong>{studioName}</strong>.
              </p>
              {submittedTimestamp && (
                <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300">
                  Submitted on {submittedTimestamp}
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-left text-xs text-amber-200/90 leading-relaxed">
              <p className="font-semibold text-amber-300 mb-0.5">Note from your studio:</p>
              Your selections are recorded and ready for album design. You may still fine-tune or review your choices in this gallery at any time until design proofing starts.
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowThankYouModal(false)}
                className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
              >
                Back to Gallery
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowThankYouModal(false);
                  setActiveTab("selections");
                  const el = document.getElementById("media-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="wedding-gold-btn text-xs px-5 py-2.5 rounded-2xl flex items-center gap-2 cursor-pointer font-bold shadow-lg shadow-amber-400/20"
              >
                <Check className="w-3.5 h-3.5" />
                <span>View Selection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share Modal ── */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareMedia(null);
        }}
        coupleName={gallery.coupleName}
        accessCode={accessCode}
        weddingDate={gallery.weddingDate}
        photographerName={studioName}
        branding={gallery.branding}
        mediaItem={shareMedia || undefined}
        onOpenQrCode={() => {
          setIsShareModalOpen(false);
          setIsQrModalOpen(true);
          trackEvent("qr_generated");
        }}
      />

      {/* ── High-Resolution QR Code & Printable Card Modal ── */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        coupleName={gallery.coupleName}
        accessCode={accessCode}
        weddingDate={gallery.weddingDate}
        photographerName={studioName}
        branding={gallery.branding}
        customDomain={gallery.customDomain}
        coverImage={gallery.coverImage}
      />
    </div>
  );
}
