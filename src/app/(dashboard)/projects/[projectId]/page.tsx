"use client";

import React, { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  WeddingProject, 
  ProjectStatus, 
  GalleryTheme, 
  GalleryTemplate,
  HeroStyle,
  PhotoGridStyle,
  FontFamilyPreset,
  DomainMapping,
  StudioSettings,
  DriveMediaFile, 
  DriveVideoFile, 
  ClientActivityEvent 
} from "@/lib/project-types";
import VideoModal from "@/components/VideoModal";
import PhotoLightbox from "@/components/PhotoLightbox";
import ShareModal from "@/components/ShareModal";
import QrCodeModal from "@/components/QrCodeModal";
import { 
  ArrowLeft, 
  Calendar, 
  Film, 
  Folder, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  Save, 
  Trash2, 
  Share2, 
  Download, 
  Play,
  Heart,
  Sparkles,
  Layers,
  Search,
  LayoutGrid,
  List,
  Lock,
  Eye,
  Shield,
  ShieldCheck,
  Palette,
  MessageCircle,
  CheckCircle2,
  SlidersHorizontal,
  QrCode,
  BarChart3,
  TrendingUp,
  Clock,
  Timer,
  X,
  AlertCircle,
  Image as ImageIcon,
  Star,
  CheckSquare,
  FileSpreadsheet,
  RotateCcw,
  CheckCheck,
  MapPin,
  Upload,
  MoveUp,
  MoveDown,
  History,
  Plus,
  Edit2,
  Settings,
  Archive,
  Smartphone,
  Monitor,
  Globe,
  Tag,
  Crown,
  BookOpen,
  Tv,
  Feather,
  Phone
} from "lucide-react";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId;
  const router = useRouter();

  const [project, setProject] = useState<WeddingProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "events" | "videos" | "analytics" | "preview" | "settings" | "favorites" | "activity">("overview");

  // Client Activity Timeline State
  const [activityLogs, setActivityLogs] = useState<ClientActivityEvent[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState<"light" | "dark" | null>(null);

  // Events management state
  const [savingEvents, setSavingEvents] = useState(false);
  const [editingEventIdx, setEditingEventIdx] = useState<number | null>(null);
  const [editingEventName, setEditingEventName] = useState("");
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventName, setNewEventName] = useState("");

  // Client Favorites & Selection State
  const [favoritesData, setFavoritesData] = useState<{
    total: number;
    photos: number;
    videos: number;
    byEvent: { [event: string]: number };
    favorites: Array<{
      id: string;
      projectId: string;
      mediaId: string;
      mediaType: "PHOTO" | "VIDEO";
      createdAt: string;
      isAvailable: boolean;
      media: DriveMediaFile | null;
    }>;
  }>({
    total: 0,
    photos: 0,
    videos: 0,
    byEvent: {},
    favorites: [],
  });

  const [selectionData, setSelectionData] = useState<{
    config: {
      enabled: boolean;
      limit: number;
      title: string;
      instructions: string;
      status: "OPEN" | "SUBMITTED" | "REOPENED" | "LOCKED";
      submittedAt?: string;
      submittedBy?: string;
    };
    count: number;
    selections: Array<{
      id: string;
      projectId: string;
      mediaId: string;
      mediaType: "PHOTO" | "VIDEO";
      createdAt: string;
      isAvailable: boolean;
      media: DriveMediaFile | null;
    }>;
  }>({
    config: {
      enabled: false,
      limit: 50,
      title: "Wedding Album Selection",
      instructions: "Please select your favorite photos and films for your custom luxury wedding album.",
      status: "OPEN",
    },
    count: 0,
    selections: [],
  });

  const [favAdminSubTab, setFavAdminSubTab] = useState<"favorites" | "selection">("favorites");
  const [favFilterType, setFavFilterType] = useState<"all" | "PHOTO" | "VIDEO">("all");
  const [favFilterEvent, setFavFilterEvent] = useState<string>("all");
  const [favSearch, setFavSearch] = useState<string>("");
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);

  // Selection settings editing
  const [selEnabled, setSelEnabled] = useState(false);
  const [selLimit, setSelLimit] = useState(50);
  const [selTitle, setSelTitle] = useState("Wedding Album Selection");
  const [selInstructions, setSelInstructions] = useState("");
  const [savingSelConfig, setSavingSelConfig] = useState(false);
  const [reopeningSel, setReopeningSel] = useState(false);

  // QR & Sharing Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [expiryPreset, setExpiryPreset] = useState<"never" | "30d" | "90d" | "1y" | "custom">("never");
  const [qrCopied, setQrCopied] = useState(false);

  // Edit fields
  const [coupleName, setCoupleName] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [packageType, setPackageType] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [driveFolderUrl, setDriveFolderUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("published");
  const [theme, setTheme] = useState<GalleryTheme>("cinematic");
  const [expiresAt, setExpiresAt] = useState<string>("");

  // Settings
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [allowDownloads, setAllowDownloads] = useState(false);
  const [allowPhotoDownload, setAllowPhotoDownload] = useState(true);
  const [allowVideoDownload, setAllowVideoDownload] = useState(false);
  const [allowFullscreen, setAllowFullscreen] = useState(true);
  const [showBranding, setShowBranding] = useState(true);

  // Branding
  const [businessName, setBusinessName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [weddingLocation, setWeddingLocation] = useState("");
  const [logoUrlLight, setLogoUrlLight] = useState("");
  const [logoUrlDark, setLogoUrlDark] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [footerText, setFooterText] = useState("");

  // Phase 8: White-Label, Gallery Templates & Custom Domains
  const [template, setTemplate] = useState<GalleryTemplate>("classic");
  const [heroStyle, setHeroStyle] = useState<HeroStyle>("large");
  const [gridStyle, setGridStyle] = useState<PhotoGridStyle>("masonry");
  const [fontFamily, setFontFamily] = useState<FontFamilyPreset>("serif-elegant");
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState<boolean>(true);
  const [primaryAccent, setPrimaryAccent] = useState<string>("#f59e0b");
  const [secondaryAccent, setSecondaryAccent] = useState<string>("#d97706");
  const [useStudioDefaults, setUseStudioDefaults] = useState<boolean>(true);
  const [facebook, setFacebook] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [tagline, setTagline] = useState<string>("");

  // Preview tab interactive state
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewTemplate, setPreviewTemplate] = useState<GalleryTemplate>("classic");

  // Custom Domains state
  const [domains, setDomains] = useState<DomainMapping[]>([]);
  const [newDomainHostname, setNewDomainHostname] = useState("");
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);
  const [domainError, setDomainError] = useState("");

  // Films & Media filter state
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "PHOTO" | "VIDEO">("all");
  const [mediaEventFilter, setMediaEventFilter] = useState("all");
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaSort, setMediaSort] = useState<"name" | "size" | "date">("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Media preview modals
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const fetchDomains = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/domains`);
      if (res.ok) {
        const data = await res.json();
        setDomains(data.domains || []);
      }
    } catch {}
  };

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        const p: WeddingProject = data.project;
        setProject(p);
        setCoupleName(p.coupleName || "");
        setWeddingDate(p.weddingDate || "");
        setPackageType(p.packageType || "");
        setWelcomeMessage(p.welcomeMessage || "Our beautiful beginning");
        setDriveFolderUrl(p.driveFolderUrl || "");
        setNotes(p.notes || "");
        setStatus(p.status || (p.isActive ? "published" : "draft"));
        setTheme(p.theme || "cinematic");
        setTemplate(p.template || p.settings?.template || "classic");
        setPreviewTemplate(p.template || p.settings?.template || "classic");
        const expStr = p.expiresAt ? p.expiresAt.split("T")[0] : "";
        setExpiresAt(expStr);
        setExpiryPreset(expStr ? "custom" : "never");

        // Settings
        setIsPasswordProtected(p.settings?.isPasswordProtected || false);
        setPassword(p.settings?.password || "");
        setAllowDownloads(p.settings?.allowDownloads ?? false);
        setAllowPhotoDownload(p.settings?.allowPhotoDownload ?? p.settings?.allowDownloads ?? true);
        setAllowVideoDownload(p.settings?.allowVideoDownload ?? p.settings?.allowDownloads ?? false);
        setAllowFullscreen(p.settings?.allowFullscreen ?? true);
        setShowBranding(p.settings?.showBranding ?? true);
        setHeroStyle(p.settings?.heroStyle || "large");
        setGridStyle(p.settings?.gridStyle || "masonry");
        setFontFamily(p.settings?.fontFamily || "serif-elegant");
        setWhiteLabelEnabled(p.settings?.whiteLabelEnabled ?? true);
        setPrimaryAccent(p.settings?.primaryAccent || "#f59e0b");
        setSecondaryAccent(p.settings?.secondaryAccent || "#d97706");

        // Branding
        setBusinessName(p.branding?.businessName || p.photographerName || "DR FILMS");
        setSubtitle(p.branding?.subtitle || "Wedding Cinema");
        setTagline(p.branding?.tagline || "");
        setWeddingLocation(p.branding?.weddingLocation || "");
        setLogoUrlLight(p.branding?.logoUrlLight || p.branding?.logoUrl || "");
        setLogoUrlDark(p.branding?.logoUrlDark || "");
        setWebsite(p.branding?.website || "");
        setInstagram(p.branding?.instagram || "");
        setFacebook(p.branding?.facebook || "");
        setPhone(p.branding?.phone || "");
        setWhatsapp(p.branding?.whatsapp || "");
        setEmail(p.branding?.email || "");
        setFooterText(p.branding?.footerText || "Crafted with love for your lifelong memories.");
        setUseStudioDefaults(p.branding?.useStudioDefaults ?? true);
        await Promise.all([fetchFavoritesAndSelections(), fetchDomains()]);
      } else {
        router.push("/dashboard");
      }
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoritesAndSelections = async () => {
    try {
      const [favRes, selRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/favorites`),
        fetch(`/api/projects/${projectId}/selection`),
      ]);

      if (favRes.ok) {
        const fData = await favRes.json();
        setFavoritesData(fData);
      }

      if (selRes.ok) {
        const sData = await selRes.json();
        setSelectionData(sData);
        if (sData.config) {
          setSelEnabled(Boolean(sData.config.enabled));
          setSelLimit(sData.config.limit || 50);
          setSelTitle(sData.config.title || "Wedding Album Selection");
          setSelInstructions(sData.config.instructions || "");
        }
      }
    } catch (err) {
      console.error("Error loading favorites & selections:", err);
    }
  };

  const fetchActivity = async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/activity?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data.activities || []);
      }
    } catch (err) {
      console.error("Failed to load client activity", err);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, variant: "light" | "dark") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(variant);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      if (variant === "light") {
        setLogoUrlLight(data.url);
      } else {
        setLogoUrlDark(data.url);
      }
      setScanMessage(`✓ ${variant === "light" ? "Light" : "Dark"} logo uploaded successfully!`);
      setTimeout(() => setScanMessage(""), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to upload logo image");
    } finally {
      setUploadingLogo(null);
      e.target.value = "";
    }
  };

  const handleSaveEventsList = async (updatedEvents: any[]) => {
    setSavingEvents(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/events`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: updatedEvents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save events");
      setProject((prev) => (prev ? { ...prev, events: data.events } : prev));
      setScanMessage("✓ Wedding events updated successfully!");
      setTimeout(() => setScanMessage(""), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to update events");
    } finally {
      setSavingEvents(false);
    }
  };

  const handleMoveEvent = (index: number, direction: "up" | "down") => {
    if (!project?.events) return;
    const list = [...project.events];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    handleSaveEventsList(list);
  };

  const handleDeleteEvent = (index: number) => {
    if (!project?.events) return;
    const evtName = project.events[index]?.name;
    if (!confirm(`Are you sure you want to remove event "${evtName}"?`)) return;
    const list = project.events.filter((_, i) => i !== index);
    handleSaveEventsList(list);
  };

  const handleAddEvent = () => {
    if (!newEventName.trim()) return;
    const list = project?.events ? [...project.events] : [];
    list.push({
      name: newEventName.trim(),
      folderId: "",
      count: 0,
      photoCount: 0,
      videoCount: 0,
    });
    setNewEventName("");
    setShowAddEventModal(false);
    handleSaveEventsList(list);
  };

  const handleRenameEvent = (index: number) => {
    if (!editingEventName.trim() || !project?.events) return;
    const list = [...project.events];
    list[index] = { ...list[index], name: editingEventName.trim() };
    setEditingEventIdx(null);
    setEditingEventName("");
    handleSaveEventsList(list);
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "favorites" || tabParam === "selections") {
        setActiveTab("favorites");
        if (tabParam === "selections") {
          setFavAdminSubTab("selection");
        }
      }
    }
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coupleName,
          weddingDate,
          packageType,
          welcomeMessage,
          driveFolderUrl,
          notes,
          status,
          isActive: status === "published",
          theme,
          template,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          settings: {
            isPasswordProtected,
            password: isPasswordProtected ? password : "",
            allowDownloads,
            allowPhotoDownload,
            allowVideoDownload,
            allowFullscreen,
            showBranding,
            whiteLabelEnabled,
            template,
            heroStyle,
            gridStyle,
            fontFamily,
            primaryAccent,
            secondaryAccent,
          },
          branding: {
            businessName,
            subtitle,
            tagline,
            weddingLocation,
            logoUrl: logoUrlLight,
            logoUrlLight,
            logoUrlDark,
            website,
            instagram,
            facebook,
            phone,
            whatsapp,
            email,
            footerText,
            useStudioDefaults,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setScanMessage("✓ Project settings saved successfully!");
        setTimeout(() => setScanMessage(""), 3500);
      }
    } catch {
      alert("Failed to save project.");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreviewTemplate = async (tmpl: GalleryTemplate) => {
    setPreviewTemplate(tmpl);
    setTemplate(tmpl);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: tmpl,
          settings: {
            ...project?.settings,
            template: tmpl,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setScanMessage(`✓ Applied "${tmpl.toUpperCase()}" as permanent gallery template!`);
        setTimeout(() => setScanMessage(""), 3500);
      }
    } catch {}
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainHostname.trim()) return;
    setIsAddingDomain(true);
    setDomainError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname: newDomainHostname.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDomainError(data.error || "Failed to add domain.");
      } else {
        setNewDomainHostname("");
        setScanMessage("✓ Custom domain added! Point your CNAME and click Verify.");
        setTimeout(() => setScanMessage(""), 4000);
        fetchDomains();
      }
    } catch {
      setDomainError("Network error adding domain.");
    } finally {
      setIsAddingDomain(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setVerifyingDomainId(domainId);
    try {
      const res = await fetch(`/api/domains/${domainId}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.domain?.status === "active") {
        setScanMessage("✓ Domain DNS verified! Host is now live.");
        setTimeout(() => setScanMessage(""), 3500);
      } else {
        setScanMessage(`DNS Status: ${data.domain?.status || "pending_dns"}. Ensure CNAME points to cname.weddinggallery.app.`);
        setTimeout(() => setScanMessage(""), 5000);
      }
      fetchDomains();
    } catch {
      alert("Failed to verify domain.");
    } finally {
      setVerifyingDomainId(null);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm("Are you sure you want to remove this domain mapping?")) return;
    try {
      const res = await fetch(`/api/domains/${domainId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setScanMessage("✓ Domain mapping removed.");
        setTimeout(() => setScanMessage(""), 3000);
        fetchDomains();
      }
    } catch {
      alert("Failed to remove domain.");
    }
  };

  const handleLoadStudioDefaults = async () => {
    try {
      const res = await fetch("/api/settings/studio");
      if (res.ok) {
        const data = await res.json();
        const s = data.studio;
        if (s) {
          if (s.studioName) setBusinessName(s.studioName);
          if (s.tagline) setSubtitle(s.tagline);
          if (s.website) setWebsite(s.website);
          if (s.email) setEmail(s.email);
          if (s.phone) setPhone(s.phone);
          if (s.instagram) setInstagram(s.instagram);
          if (s.facebook) setFacebook(s.facebook);
          if (s.whatsapp) setWhatsapp(s.whatsapp);
          if (s.footerText) setFooterText(s.footerText);
          if (s.logoUrlLight) setLogoUrlLight(s.logoUrlLight);
          if (s.logoUrlDark) setLogoUrlDark(s.logoUrlDark);
          if (s.defaultTemplate) setTemplate(s.defaultTemplate);
          if (s.defaultFontFamily) setFontFamily(s.defaultFontFamily);
          if (s.defaultPrimaryAccent) setPrimaryAccent(s.defaultPrimaryAccent);
          setWhiteLabelEnabled(s.whiteLabelEnabled ?? true);
          setScanMessage("✓ Global studio defaults loaded into project form!");
          setTimeout(() => setScanMessage(""), 3500);
        }
      }
    } catch {
      alert("Could not load studio defaults.");
    }
  };

  const handleQuickStatusChange = async (newStatus: ProjectStatus) => {
    setStatus(newStatus);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          isActive: newStatus === "published",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setScanMessage(`✓ Status updated to ${newStatus.toUpperCase()}`);
        setTimeout(() => setScanMessage(""), 3000);
      }
    } catch {
      alert("Failed to update status.");
    }
  };

  const handleRescan = async () => {
    setScanning(true);
    setScanMessage("Scanning Google Drive... Finding events, photos, and videos...");
    try {
      const res = await fetch(`/api/projects/${projectId}/scan`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setProject(data.project);
        setScanMessage(data.message || `✓ Sync Complete (${data.photoCount || 0} photos, ${data.videoCount || data.count || 0} films found).`);
      } else {
        setScanMessage(data.error || "Failed to sync folder.");
      }
    } catch {
      setScanMessage("Network error during sync.");
    } finally {
      setScanning(false);
      setTimeout(() => {
        if (!scanning) setScanMessage("");
      }, 5000);
    }
  };

  const handleToggleFeatured = async (mediaId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/media/${mediaId}/featured`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setProject((prev) => {
          if (!prev) return prev;
          const updateList = (list: any[]) =>
            list.map((m) => (m.id === mediaId ? { ...m, isFeatured: data.isFeatured } : m));
          return {
            ...prev,
            mediaFiles: updateList(prev.mediaFiles || []),
            photoFiles: updateList(prev.photoFiles || []),
            videoFiles: updateList(prev.videoFiles || []),
          };
        });
      }
    } catch (err) {
      console.error("Failed to toggle featured status", err);
    }
  };

  const handleSetCoverImage = async (item: DriveMediaFile) => {
    const coverUrl = item.thumbnailUrl || (item as any).thumbnailLink || `/api/photos/${item.id}`;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: coverUrl }),
      });
      if (res.ok) {
        setProject((prev) => (prev ? { ...prev, coverImage: coverUrl } : null));
        setScanMessage(`✓ Updated "${item.name}" as project cover photo`);
        setTimeout(() => setScanMessage(""), 4000);
      }
    } catch (err) {
      console.error("Failed to update cover photo", err);
    }
  };

  const handleDownloadZip = async (type = "photos", eventName?: string) => {
    if (isDownloadingZip) return;
    setIsDownloadingZip(true);
    setScanMessage("Packing high-resolution ZIP archive...");

    try {
      const query = new URLSearchParams({ type });
      if (eventName && eventName !== "all") query.set("event", eventName);
      const res = await fetch(`/api/projects/${projectId}/download-zip?${query.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to download ZIP archive");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filenameMatch = res.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch
        ? decodeURIComponent(filenameMatch[1])
        : `${project?.coupleName || "Wedding"}_Archive.zip`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setScanMessage("✓ ZIP archive download complete!");
      setTimeout(() => setScanMessage(""), 4000);
    } catch (err: any) {
      console.error("Download ZIP failed", err);
      alert(err.message || "Failed to download ZIP archive.");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${project?.coupleName}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
      }
    } catch {
      alert("Failed to delete project.");
    }
  };

  const handleCopyClientLink = () => {
    if (!project) return;
    const url = `${window.location.origin}/gallery/${project.accessCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setScanMessage("✓ Client link copied");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    if (!project) return;
    const galleryUrl = `${window.location.origin}/gallery/${project.accessCode}`;
    const text = `Your wedding memories are ready ❤️\n\nView ${project.coupleName} wedding photos and films here:\n${galleryUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleRegenerateCode = async () => {
    if (!project) return;
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/regenerate-code`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to regenerate client link");
      }
      setProject((prev) => prev ? { ...prev, accessCode: data.accessCode } : prev);
      setShowRegenerateConfirm(false);
      setScanMessage("✓ Client link regenerated");
    } catch (err: any) {
      alert(err.message || "Failed to regenerate client link");
    } finally {
      setIsRegenerating(false);
    }
  };

  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicate = async () => {
    if (!project) return;
    setDuplicating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to duplicate project");
      router.push(`/projects/${data.project.id}`);
    } catch (err: any) {
      alert(err.message || "Could not duplicate wedding project.");
      setDuplicating(false);
    }
  };

  const handleExpiryPresetChange = (preset: "never" | "30d" | "90d" | "1y" | "custom") => {
    setExpiryPreset(preset);
    if (preset === "never") {
      setExpiresAt("");
    } else if (preset === "30d") {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setExpiresAt(d.toISOString().split("T")[0]);
    } else if (preset === "90d") {
      const d = new Date();
      d.setDate(d.getDate() + 90);
      setExpiresAt(d.toISOString().split("T")[0]);
    } else if (preset === "1y") {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      setExpiresAt(d.toISOString().split("T")[0]);
    }
  };

  const handleCopyCardText = () => {
    if (!project) return;
    const galleryUrl = `${window.location.origin}/gallery/${project.accessCode}`;
    const studio = businessName || project.photographerName || "Wedding Cinema Studio";
    const cardText = `🎬 ${studio.toUpperCase()} CLIENT GALLERY\n\nWedding: ${project.coupleName}\nGallery Link: ${galleryUrl}\nAccess Code: ${project.accessCode}${isPasswordProtected && password ? `\nPasskey: ${password}` : ""}\n\nScan QR code or click link to stream your 4K wedding films.`;
    navigator.clipboard.writeText(cardText);
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2500);
  };

  const allVideos: DriveVideoFile[] = useMemo(() => {
    const raw = project?.videoFiles || [];
    const map = new Map<string, DriveVideoFile>();
    for (const item of raw) {
      const key = item.driveFileId || item.id;
      if (key && !map.has(key)) map.set(key, item);
    }
    return Array.from(map.values());
  }, [project]);

  const allPhotos: DriveMediaFile[] = useMemo(() => {
    const raw = (project?.photoFiles && project.photoFiles.length > 0)
      ? project.photoFiles
      : (project?.mediaFiles || []).filter((m) => m.type === "PHOTO");
    const map = new Map<string, DriveMediaFile>();
    for (const item of raw) {
      const key = item.driveFileId || item.id;
      if (key && !map.has(key)) map.set(key, item);
    }
    return Array.from(map.values());
  }, [project]);

  const allMedia: DriveMediaFile[] = useMemo(() => {
    const map = new Map<string, DriveMediaFile>();
    for (const v of allVideos) {
      const key = v.driveFileId || v.id;
      if (key && !map.has(key)) map.set(key, { ...v, type: "VIDEO" as const });
    }
    for (const p of allPhotos) {
      const key = p.driveFileId || p.id;
      if (key && !map.has(key)) map.set(key, { ...p, type: "PHOTO" as const });
    }
    return Array.from(map.values());
  }, [allVideos, allPhotos]);

  const totalMediaCount = allMedia.length;
  const totalPhotoCount = allPhotos.length;
  const totalFilmCount = allVideos.length;
  const eventsList = project?.events || [];

  // Filtered & Sorted media items (Photos and Videos)
  const filteredMedia = useMemo(() => {
    const list = allMedia.filter((m) => {
      const matchType = mediaTypeFilter === "all" || m.type === mediaTypeFilter;
      const matchEvent =
        mediaEventFilter === "all" ||
        (m.eventName || "General").toLowerCase() === mediaEventFilter.toLowerCase();
      const matchSearch =
        !mediaSearch.trim() ||
        m.name.toLowerCase().includes(mediaSearch.toLowerCase()) ||
        (m.eventName && m.eventName.toLowerCase().includes(mediaSearch.toLowerCase()));
      return matchType && matchEvent && matchSearch;
    });

    if (mediaSort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (mediaSort === "size") {
      list.sort((a, b) => parseInt(b.size || "0", 10) - parseInt(a.size || "0", 10));
    } else if (mediaSort === "date") {
      list.sort((a, b) => new Date(b.modifiedTime || 0).getTime() - new Date(a.modifiedTime || 0).getTime());
    }

    return list;
  }, [allMedia, mediaTypeFilter, mediaEventFilter, mediaSearch, mediaSort]);

  // Filtered films for video player / backward compatibility
  const filteredFilms = useMemo(() => {
    return filteredMedia.filter((m) => m.type === "VIDEO");
  }, [filteredMedia]);

  const handleOpenMedia = (item: DriveMediaFile) => {
    if (item.type === "PHOTO") {
      const idx = allPhotos.findIndex((p) => p.id === item.id);
      setSelectedPhotoIndex(idx !== -1 ? idx : 0);
    } else {
      const idx = allVideos.findIndex((v) => v.id === item.id);
      setSelectedVideoIndex(idx !== -1 ? idx : 0);
    }
  };

  const handleSaveSelectionConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSelConfig(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/selection`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: selEnabled,
          limit: Number(selLimit) || 50,
          title: selTitle.trim() || "Wedding Album Selection",
          instructions: selInstructions.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectionData((prev) => ({
          ...prev,
          config: data.config,
        }));
        setScanMessage("✓ Album Selection settings saved successfully!");
        setTimeout(() => setScanMessage(""), 3500);
      } else {
        setScanMessage("Failed to save selection settings.");
      }
    } catch {
      setScanMessage("Network error saving selection settings.");
    } finally {
      setSavingSelConfig(false);
    }
  };

  const handleReopenSelection = async () => {
    if (!confirm("Reopen album selection for the client? This allows them to edit their selected photos.")) return;
    setReopeningSel(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/selection/reopen`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setSelectionData((prev) => ({
          ...prev,
          config: data.config,
        }));
        setScanMessage("✓ Selection reopened! The couple can now modify their album selections.");
        setTimeout(() => setScanMessage(""), 4000);
      } else {
        setScanMessage("Failed to reopen selection.");
      }
    } catch {
      setScanMessage("Network error reopening selection.");
    } finally {
      setReopeningSel(false);
    }
  };

  const handleCopyFileId = (fileId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(fileId);
    setCopiedFileId(fileId);
    setTimeout(() => {
      setCopiedFileId(null);
    }, 2000);
  };

  const handlePreviewFavOrSel = (media: DriveMediaFile | null, mediaType: "PHOTO" | "VIDEO", mediaId: string) => {
    if (mediaType === "PHOTO") {
      const pIdx = allPhotos.findIndex((p) => p.id === mediaId);
      if (pIdx !== -1) {
        setSelectedPhotoIndex(pIdx);
      } else if (media) {
        const matchIdx = allPhotos.findIndex((p) => p.name === media.name);
        setSelectedPhotoIndex(matchIdx !== -1 ? matchIdx : 0);
      }
    } else {
      const vIdx = allVideos.findIndex((v) => v.id === mediaId);
      if (vIdx !== -1) {
        setSelectedVideoIndex(vIdx);
      } else if (media) {
        const matchIdx = allVideos.findIndex((v) => v.name === media.name);
        setSelectedVideoIndex(matchIdx !== -1 ? matchIdx : 0);
      }
    }
  };

  const filteredAdminFavorites = useMemo(() => {
    return favoritesData.favorites.filter((fav) => {
      const matchType = favFilterType === "all" || fav.mediaType === favFilterType;
      const eventName = fav.media?.eventName || "General";
      const matchEvent = favFilterEvent === "all" || eventName.toLowerCase() === favFilterEvent.toLowerCase();
      const matchSearch =
        !favSearch.trim() ||
        (fav.media?.name && fav.media.name.toLowerCase().includes(favSearch.toLowerCase())) ||
        fav.mediaId.toLowerCase().includes(favSearch.toLowerCase());
      return matchType && matchEvent && matchSearch;
    });
  }, [favoritesData.favorites, favFilterType, favFilterEvent, favSearch]);

  const filteredAdminSelections = useMemo(() => {
    return selectionData.selections.filter((sel) => {
      const matchType = favFilterType === "all" || sel.mediaType === favFilterType;
      const eventName = sel.media?.eventName || "General";
      const matchEvent = favFilterEvent === "all" || eventName.toLowerCase() === favFilterEvent.toLowerCase();
      const matchSearch =
        !favSearch.trim() ||
        (sel.media?.name && sel.media.name.toLowerCase().includes(favSearch.toLowerCase())) ||
        sel.mediaId.toLowerCase().includes(favSearch.toLowerCase());
      return matchType && matchEvent && matchSearch;
    });
  }, [selectionData.selections, favFilterType, favFilterEvent, favSearch]);

  // Analytics rankings
  const analyticsData = project?.analytics || { views: 0, plays: 0, completions: 0, favorites: 0, videoStats: {} };
  const videoStatsList = useMemo(() => {
    const statsMap = analyticsData.videoStats || {};
    return allVideos.map((video) => {
      const st = statsMap[video.id] || { plays: 0, completions: 0, favorites: 0 };
      return {
        ...video,
        plays: st.plays || 0,
        completions: st.completions || 0,
        favorites: st.favorites || 0,
        completionRate: st.plays > 0 ? Math.round((st.completions / st.plays) * 100) : 0,
      };
    });
  }, [allVideos, analyticsData]);

  const mostWatchedFilms = useMemo(() => {
    return [...videoStatsList].sort((a, b) => b.plays - a.plays);
  }, [videoStatsList]);

  const mostFavoritedFilms = useMemo(() => {
    return [...videoStatsList].filter((v) => v.favorites > 0).sort((a, b) => b.favorites - a.favorites);
  }, [videoStatsList]);

  if (loading || !project) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-4 text-slate-400">
        <div className="loader-spin w-8 h-8 border-3 border-amber-400 border-t-transparent" />
        <span className="text-sm font-medium">Loading project details...</span>
      </div>
    );
  }

  const clientGalleryUrl = `/gallery/${project.accessCode}`;
  const qrPngUrl = `/api/gallery/${project.accessCode}/qr?format=png&size=1000`;
  const qrSvgUrl = `/api/gallery/${project.accessCode}/qr?format=svg`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      {/* Top Breadcrumbs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Weddings</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Share Modal Trigger */}
          <button
            onClick={() => setShowShareModal(true)}
            className="glass-button px-3.5 py-2 text-xs font-semibold text-amber-200 border border-amber-400/30 hover:text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Share options (Link, WhatsApp, QR, Web Share)"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Share</span>
          </button>

          {/* Quick QR Code */}
          <button
            onClick={() => setShowQrModal(true)}
            className="glass-button px-3.5 py-2 text-xs font-semibold text-slate-300 border border-white/10 hover:border-amber-400/30 hover:text-white flex items-center gap-1.5 cursor-pointer"
            title="Download high-resolution QR code and printable card"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-300" />
            <span>QR Code</span>
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="glass-button px-3.5 py-2 text-xs font-semibold text-emerald-300 border border-emerald-500/30 hover:text-white flex items-center gap-1.5 cursor-pointer"
            title="Share on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handleCopyClientLink}
            className="glass-button px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Copy permanent client link to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">✓ Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Copy Client Link</span>
              </>
            )}
          </button>

          {/* Distinct Preview Mode vs Real Client Gallery */}
          <Link
            href={`${clientGalleryUrl}?preview=true`}
            target="_blank"
            className="glass-button px-3.5 py-2 text-xs font-semibold text-slate-300 border border-white/15 hover:border-amber-400/40 hover:text-white flex items-center gap-1.5"
            title="Preview gallery as photographer (bypasses password & status locks)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Preview Mode</span>
          </Link>

          <Link
            href={clientGalleryUrl}
            target="_blank"
            className="wedding-gold-btn text-xs px-4 py-2 shadow-lg flex items-center gap-1.5"
            title="Open real client-facing gallery URL in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Client Gallery</span>
          </Link>
        </div>
      </div>

      {/* Hero Card */}
      <div className="glass-panel p-6 sm:p-8 border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                status === "published" 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" 
                  : status === "paused"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : status === "archived"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-slate-800 text-slate-400 border border-white/10"
              }`}>
                {status.toUpperCase()}
              </span>

              <span className="text-xs text-slate-400 font-mono">
                Code: <strong className="text-amber-300 font-bold">{project.accessCode}</strong>
              </span>

              <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300 text-[10px] font-semibold border border-white/10 capitalize">
                Theme: {theme}
              </span>

              {isPasswordProtected && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-semibold border border-amber-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Protected
                </span>
              )}

              {expiresAt && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 text-[10px] font-semibold border border-blue-500/30 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  Expires: {new Date(expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-tight mt-2 uppercase">
              {project.coupleName}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {new Date(project.weddingDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="text-white/20">&bull;</span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                {eventsList.length || (totalMediaCount ? 1 : 0)} Events
              </span>
              <span className="text-white/20">&bull;</span>
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                {totalPhotoCount} Photos
              </span>
              <span className="text-white/20">&bull;</span>
              <span className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-amber-400" />
                {totalFilmCount} Films
              </span>
              <span className="text-white/20">&bull;</span>
              <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <Eye className="w-3.5 h-3.5" />
                {analyticsData.views || 0} Views
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {project.coverImage && (
              <div className="flex items-center gap-2.5 bg-white/5 px-2.5 py-1.5 rounded-2xl border border-white/10">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 relative border border-amber-400/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={project.coverImage}
                    alt="Project Cover"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-[11px] font-bold text-white flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400 fill-current" />
                    <span>Cover Photo</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Hero background</div>
                </div>
              </div>
            )}

            <Link
              href={`${clientGalleryUrl}?preview=true`}
              target="_blank"
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
              title="Preview Live Client Gallery in a new tab"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Preview Gallery</span>
            </Link>

            {/* Quick Status Switches */}
            {status !== "published" ? (
              <button
                onClick={() => handleQuickStatusChange("published")}
                className="px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-500 hover:text-black transition-all cursor-pointer"
              >
                Publish Gallery
              </button>
            ) : (
              <button
                onClick={() => handleQuickStatusChange("paused")}
                className="px-3 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500 hover:text-black transition-all cursor-pointer"
              >
                Pause Gallery
              </button>
            )}

            <button
              onClick={handleRescan}
              disabled={scanning}
              className="wedding-gold-btn px-4 py-2.5 text-xs font-semibold shadow-lg cursor-pointer"
              title="Sync Google Drive folder for newly uploaded photos & videos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
              <span>{scanning ? "Syncing Google Drive..." : "Sync Google Drive"}</span>
            </button>
          </div>
        </div>

        {scanMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>{scanMessage}</span>
          </div>
        )}
      </div>

      {/* 6 Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "overview"
              ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Overview
        </button>

        <button
          onClick={() => setActiveTab("events")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === "events"
              ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>Events</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "events" ? "bg-black/20 text-black" : "bg-white/10 text-slate-300"}`}>
            {eventsList.length || 1}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("videos")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === "videos"
              ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>Media</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "videos" ? "bg-black/20 text-black" : "bg-white/10 text-slate-300"}`}>
            {totalMediaCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("favorites")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "favorites"
              ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${activeTab === "favorites" ? "fill-black" : "text-rose-400"}`} />
          <span>Favorites & Selection</span>
          {(favoritesData.total > 0 || selectionData.count > 0) && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === "favorites" ? "bg-black/20 text-black" : "bg-white/10 text-slate-300"}`}>
              {favoritesData.total + selectionData.count}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "analytics"
              ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytics & Insights</span>
        </button>

        <button
          onClick={() => setActiveTab("preview")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "preview"
              ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Gallery Preview</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "settings"
              ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Settings & Theme</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("activity");
            fetchActivity();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === "activity"
              ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20 font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Client Activity</span>
        </button>
      </div>

      {/* ── Tab 1: Overview ── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 sm:p-8 border border-white/10 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-amber-400" />
                <span>Wedding Story Information</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 block mb-1 font-mono uppercase tracking-wider">Couple Names</span>
                  <span className="text-white font-bold text-sm">{project.coupleName}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 block mb-1 font-mono uppercase tracking-wider">Wedding Date</span>
                  <span className="text-white font-bold text-sm">
                    {new Date(project.weddingDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 block mb-1 font-mono uppercase tracking-wider">Theme Design</span>
                  <span className="text-amber-300 font-bold text-sm capitalize">{project.theme || "Cinematic"}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 block mb-1 font-mono uppercase tracking-wider">Welcome Subtitle</span>
                  <span className="text-white font-serif italic text-sm">{project.welcomeMessage || "Our beautiful beginning"}</span>
                </div>
              </div>

              {project.notes && (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-xs text-slate-400 block mb-1 font-mono uppercase tracking-wider">Private Notes</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{project.notes}</p>
                </div>
              )}
            </div>

            {/* Quick Analytics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-panel p-4 border border-white/10 text-center">
                <Eye className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-white font-mono">{analyticsData.views || 0}</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">Gallery Views</div>
              </div>

              <div className="glass-panel p-4 border border-white/10 text-center">
                <Play className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-white font-mono">{analyticsData.plays || 0}</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">Video Plays</div>
              </div>

              <div className="glass-panel p-4 border border-white/10 text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-white font-mono">{analyticsData.completions || 0}</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">Completions</div>
              </div>

              <div className="glass-panel p-4 border border-white/10 text-center">
                <Heart className="w-5 h-5 text-rose-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-white font-mono">{analyticsData.favorites || 0}</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">Favorites</div>
              </div>
            </div>

            {/* Client Favorites & Album Selection Summary Card */}
            <div className="glass-panel p-6 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-400 fill-rose-400/30" />
                  <span>Client Favorites & Album Selection</span>
                </h3>
                <button
                  onClick={() => setActiveTab("favorites")}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Manage</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Favorites summary */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Client Favorites</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 font-semibold">
                      {favoritesData.total} Saved
                    </span>
                  </div>
                  <div className="text-lg font-bold text-white font-mono">
                    {favoritesData.photos} <span className="text-xs text-slate-400 font-normal">photos</span>, {favoritesData.videos} <span className="text-xs text-slate-400 font-normal">films</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Memories favorited by the couple while browsing their private gallery.
                  </p>
                </div>

                {/* Album Selection summary */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Album Selection</span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                      selectionData.config.status === "SUBMITTED"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : selectionData.config.status === "REOPENED"
                        ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                        : selectionData.config.enabled
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                    }`}>
                      {selectionData.config.status === "SUBMITTED"
                        ? "Submitted"
                        : selectionData.config.status === "REOPENED"
                        ? "Reopened"
                        : selectionData.config.enabled
                        ? "In Progress"
                        : "Disabled"}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-white font-mono">
                    {selectionData.count} <span className="text-xs text-slate-400 font-normal">of {selectionData.config.limit} selected</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {selectionData.config.enabled
                      ? `${Math.round((selectionData.count / Math.max(selectionData.config.limit, 1)) * 100)}% of album quota chosen.`
                      : "Client Selection Mode is currently disabled."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setActiveTab("favorites");
                    setFavAdminSubTab("favorites");
                  }}
                  className="glass-button text-xs py-2 px-3 text-slate-300 hover:text-white cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span>Browse {favoritesData.total} Favorites</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("favorites");
                    setFavAdminSubTab("selection");
                  }}
                  className="glass-button text-xs py-2 px-3 text-amber-300 hover:text-amber-200 border-amber-500/30 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Manage Album Selection ({selectionData.count}/{selectionData.config.limit})</span>
                </button>

                {selectionData.count > 0 && (
                  <a
                    href={`/api/projects/${projectId}/selection/export`}
                    className="glass-button text-xs py-2 px-3 text-emerald-300 hover:text-emerald-200 border-emerald-500/30 cursor-pointer ml-auto"
                    title="Export Client Selection to CSV"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </a>
                )}
              </div>
            </div>

            {/* Google Drive Connection Info */}
            <div className="glass-panel p-6 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-400" />
                <span>Google Drive Storage Link</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Videos are streamed in high definition directly from your Google Drive without taking up server storage.
              </p>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10 font-mono text-xs text-slate-300 break-all">
                {project.driveFolderUrl}
              </div>
            </div>
          </div>

          {/* Sidebar Info Card */}
          <div className="space-y-6">
            <div className="glass-panel p-6 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>Client Access Portal</span>
              </h3>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs">
                <div className="text-[10px] uppercase font-mono text-amber-400/80 mb-1">Direct Client Link</div>
                <div className="font-mono text-xs truncate">{`${typeof window !== "undefined" ? window.location.origin : ""}/gallery/${project.accessCode}`}</div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleCopyClientLink}
                  className="w-full glass-button justify-center py-2.5 text-xs font-semibold cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{copied ? "Link Copied!" : "Copy Client Link"}</span>
                </button>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="w-full glass-button justify-center py-2.5 text-xs font-semibold text-amber-300 border border-amber-500/30 hover:text-white cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Generate Printable QR Code</span>
                </button>

                <button
                  onClick={handleWhatsAppShare}
                  className="w-full glass-button justify-center py-2.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30 hover:text-white cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Share on WhatsApp</span>
                </button>
              </div>
            </div>

            <div className="glass-panel p-6 border border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Quick Actions
              </h3>
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => setActiveTab("settings")}
                  className="w-full glass-button justify-between py-2 text-xs font-medium cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Branding & Settings</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Edit →</span>
                </button>
                <button
                  onClick={handleDuplicate}
                  disabled={duplicating}
                  className="w-full glass-button justify-start gap-2 py-2 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{duplicating ? "Duplicating Project..." : "Duplicate Wedding"}</span>
                </button>
                <button
                  onClick={() => handleQuickStatusChange(project.status === "archived" ? "published" : "archived")}
                  className="w-full glass-button justify-start gap-2 py-2 text-xs font-medium text-slate-400 hover:text-amber-300 cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{project.status === "archived" ? "Restore to Live" : "Archive Wedding"}</span>
                </button>
              </div>
            </div>

            <div className="glass-panel p-6 border border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Sync Status
              </h3>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{project.lastSyncStatus || "✓ Synced"}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Last checked: {new Date(project.lastScanned || project.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Events ── */}
      {activeTab === "events" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>Wedding Events & Ceremonies</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Organize, rename, and reorder ceremony subfolders for the client gallery presentation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddEventModal(true)}
                className="wedding-gold-btn text-xs px-3.5 py-1.5 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event</span>
              </button>
              <button
                onClick={handleRescan}
                disabled={scanning}
                className="glass-button text-xs px-3.5 py-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${scanning ? "animate-spin" : ""}`} />
                <span>Rescan Folders</span>
              </button>
            </div>
          </div>

          {eventsList.length === 0 ? (
            <div className="glass-panel py-16 px-6 text-center border border-white/10">
              <Layers className="w-12 h-12 text-amber-400/40 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Event Subfolders</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                All media are currently catalogued under Main Highlights. To organize by event (Haldi, Mehndi, Wedding, Reception), organize them into subfolders on Google Drive and click &ldquo;Rescan Folders&rdquo;, or add an event manually.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {eventsList.map((evt, idx) => {
                const photosInEvt = evt.photoCount ?? 0;
                const filmsInEvt = evt.videoCount ?? evt.count;
                const isEditing = editingEventIdx === idx;

                return (
                  <div
                    key={`${evt.name}-${idx}`}
                    className="glass-panel p-5 border border-white/10 hover:border-amber-400/30 transition-all flex flex-col justify-between group relative"
                  >
                    <div>
                      {/* Top bar: icon, count, reorder buttons */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-500/25">
                          <Layers className="w-6 h-6" />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-xs font-bold">
                            {photosInEvt > 0 && <span>{photosInEvt}p </span>}
                            {photosInEvt > 0 && filmsInEvt > 0 && <span>• </span>}
                            <span>{filmsInEvt}f</span>
                          </span>

                          <div className="flex items-center gap-0.5 ml-1">
                            <button
                              type="button"
                              onClick={() => handleMoveEvent(idx, "up")}
                              disabled={idx === 0 || savingEvents}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Move Up in Gallery"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveEvent(idx, "down")}
                              disabled={idx === eventsList.length - 1 || savingEvents}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Move Down in Gallery"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Event name & edit mode */}
                      <div className="mt-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingEventName}
                              onChange={(e) => setEditingEventName(e.target.value)}
                              className="glass-input text-xs py-1 px-2 font-bold"
                              autoFocus
                            />
                            <button
                              onClick={() => handleRenameEvent(idx)}
                              className="px-2.5 py-1 rounded bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingEventIdx(null)}
                              className="px-2 py-1 rounded bg-white/10 text-slate-300 text-xs hover:bg-white/20 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <h4
                              onClick={() => {
                                setMediaEventFilter(evt.name);
                                setActiveTab("videos");
                              }}
                              className="text-base font-bold text-white hover:text-amber-300 transition-colors uppercase cursor-pointer"
                            >
                              {evt.name}
                            </h4>
                            <button
                              onClick={() => {
                                setEditingEventIdx(idx);
                                setEditingEventName(evt.name);
                              }}
                              className="p-1 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Rename Event"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {photosInEvt > 0 ? `${photosInEvt} Photos, ` : ""}{filmsInEvt} {filmsInEvt === 1 ? "Film" : "Films"}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setMediaEventFilter(evt.name);
                          setActiveTab("videos");
                        }}
                        className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Media</span>
                        <span>&rarr;</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(idx)}
                        disabled={savingEvents}
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 opacity-60 hover:opacity-100 transition cursor-pointer"
                        title="Remove Event from Project"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Event Modal */}
          {showAddEventModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="glass-panel p-6 max-w-sm w-full border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>Add Ceremony Event</span>
                  </h3>
                  <button
                    onClick={() => setShowAddEventModal(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Event Name</label>
                  <input
                    type="text"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    placeholder="e.g. Sangeet & Cocktail"
                    className="glass-input text-xs w-full"
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddEventModal(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 text-xs text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddEvent}
                    disabled={!newEventName.trim()}
                    className="wedding-gold-btn text-xs px-4 py-1.5"
                  >
                    Add Event
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Media Gallery (Photos & Videos) ── */}
      {activeTab === "videos" && (
        <div className="space-y-6">
          {/* Header Summary & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>Wedding Media Gallery</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="font-semibold text-amber-300">{totalMediaCount} Media:</span>{" "}
                {totalPhotoCount} Photos, {totalFilmCount} Films across {eventsList.length || 1} event folders
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRescan}
                disabled={scanning}
                className="glass-button text-xs px-3.5 py-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${scanning ? "animate-spin" : ""}`} />
                <span>Sync Media</span>
              </button>
            </div>
          </div>

          {/* Type Filter Pills + Filter Bar */}
          <div className="glass-panel p-4 border border-white/10 space-y-4">
            {/* Top row: Type filter pills */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <button
                onClick={() => setMediaTypeFilter("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  mediaTypeFilter === "all"
                    ? "bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20"
                    : "bg-white/5 hover:bg-white/10 text-slate-300"
                }`}
              >
                All Media ({totalMediaCount})
              </button>

              <button
                onClick={() => setMediaTypeFilter("PHOTO")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mediaTypeFilter === "PHOTO"
                    ? "bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20"
                    : "bg-white/5 hover:bg-white/10 text-slate-300"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Photos ({totalPhotoCount})</span>
              </button>

              <button
                onClick={() => setMediaTypeFilter("VIDEO")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mediaTypeFilter === "VIDEO"
                    ? "bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20"
                    : "bg-white/5 hover:bg-white/10 text-slate-300"
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Films ({totalFilmCount})</span>
              </button>
            </div>

            {/* Bottom row: Event filter buttons + Search + Sort + View Mode */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
                <button
                  onClick={() => setMediaEventFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                    mediaEventFilter === "all"
                      ? "bg-white/20 text-white font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All Events ({totalMediaCount})
                </button>

                {eventsList.map((ev) => {
                  const evTotal = (ev.photoCount || 0) + (ev.videoCount ?? ev.count);
                  return (
                    <button
                      key={ev.name}
                      onClick={() => setMediaEventFilter(ev.name)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                        mediaEventFilter.toLowerCase() === ev.name.toLowerCase()
                          ? "bg-white/20 text-white font-semibold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {ev.name} ({evTotal})
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-52">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search media..."
                    value={mediaSearch}
                    onChange={(e) => setMediaSearch(e.target.value)}
                    className="glass-input pl-9 pr-3 py-1.5 text-xs w-full"
                  />
                </div>

                <select
                  value={mediaSort}
                  onChange={(e) => setMediaSort(e.target.value as any)}
                  className="glass-input bg-slate-900 py-1.5 text-xs"
                >
                  <option value="name">Sort: Name</option>
                  <option value="size">Sort: Size</option>
                  <option value="date">Sort: Date</option>
                </select>

                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-lg ${viewMode === "grid" ? "bg-amber-400 text-black" : "text-slate-400 hover:text-white"}`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-lg ${viewMode === "list" ? "bg-amber-400 text-black" : "text-slate-400 hover:text-white"}`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>

                {allMedia.length > 0 && (
                  <button
                    onClick={() =>
                      handleDownloadZip(
                        mediaTypeFilter === "VIDEO" ? "videos" : "photos",
                        mediaEventFilter
                      )
                    }
                    disabled={isDownloadingZip}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all shadow-md shadow-amber-400/20 whitespace-nowrap cursor-pointer"
                    title="Download media files as ZIP archive"
                  >
                    <Download className={`w-3.5 h-3.5 ${isDownloadingZip ? "animate-bounce" : ""}`} />
                    <span>{isDownloadingZip ? "Preparing..." : "Download ZIP"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Media Items Grid / List Container */}
          {allMedia.length === 0 ? (
            <div className="glass-panel py-16 px-6 text-center border border-white/10">
              <Layers className="w-12 h-12 text-amber-400/40 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">No media files found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No photos or videos were detected in the connected Drive folder. Upload files to Drive and click &ldquo;Sync Media&rdquo;.
              </p>
              <button
                onClick={handleRescan}
                disabled={scanning}
                className="wedding-gold-btn text-xs mt-4"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
                <span>Sync Folder Now</span>
              </button>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="glass-panel py-16 px-6 text-center border border-white/10">
              <Search className="w-10 h-10 text-amber-400/40 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No matching media</h3>
              <p className="text-xs text-slate-400 mt-1">Try resetting your search query or filter pills.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMedia.map((item) => {
                const isPhoto = item.type === "PHOTO";
                const thumb = isPhoto
                  ? item.thumbnailUrl || (item as any).thumbnailLink || `https://drive.google.com/thumbnail?id=${item.id}&sz=w800`
                  : item.thumbnailLink || item.thumbnailUrl;

                const isCover = Boolean(
                  project?.coverImage &&
                  (project.coverImage === item.thumbnailUrl ||
                   project.coverImage === (item as any).thumbnailLink ||
                   project.coverImage.includes(item.id))
                );

                return (
                  <div
                    key={item.id}
                    className="glass-panel p-3.5 border border-white/10 flex flex-col justify-between group hover:border-amber-400/40 transition-all shadow-lg rounded-2xl"
                  >
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 mb-3 flex items-center justify-center">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : isPhoto ? (
                        <ImageIcon className="w-10 h-10 text-slate-600" />
                      ) : (
                        <Film className="w-10 h-10 text-slate-600" />
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap max-w-[70%]">
                        {isCover && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-bold shadow-md flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 fill-current" />
                            <span>Cover</span>
                          </span>
                        )}

                        {isPhoto ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-600/80 backdrop-blur-md text-[10px] font-semibold text-white flex items-center gap-1 border border-blue-400/30">
                            <ImageIcon className="w-2.5 h-2.5" />
                            <span>Photo</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/90 backdrop-blur-md text-[10px] font-bold text-black flex items-center gap-1 border border-amber-300/40">
                            <Film className="w-2.5 h-2.5" />
                            <span>Film</span>
                          </span>
                        )}

                        {item.eventName && (
                          <span className="px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-semibold text-slate-200 border border-white/15 truncate max-w-[110px]">
                            {item.eventName}
                          </span>
                        )}
                      </div>

                      {/* Set as Cover Photo Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetCoverImage(item);
                        }}
                        className={`absolute top-2 right-9 p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer z-10 ${
                          isCover
                            ? "bg-amber-400 text-black shadow-lg shadow-amber-400/30"
                            : "bg-black/50 text-slate-400 hover:text-amber-300 hover:bg-black/80"
                        }`}
                        title={isCover ? "Current project cover photo" : "Set as project cover"}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isCover ? "fill-current" : ""}`} />
                      </button>

                      {/* Featured Star Toggle Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFeatured(item.id);
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer z-10 ${
                          item.isFeatured
                            ? "bg-amber-400 text-black shadow-lg shadow-amber-400/30"
                            : "bg-black/50 text-slate-400 hover:text-amber-300 hover:bg-black/80"
                        }`}
                        title={item.isFeatured ? "Featured (click to unfeature)" : "Click to feature on client home"}
                      >
                        <Star className={`w-3.5 h-3.5 ${item.isFeatured ? "fill-current" : ""}`} />
                      </button>

                      {/* Action Hover Button */}
                      <button
                        onClick={() => handleOpenMedia(item)}
                        className="absolute inset-0 bg-black/30 hover:bg-black/20 flex items-center justify-center text-white transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                      >
                        {isPhoto ? (
                          <div className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                            <Eye className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 fill-current translate-x-0.5" />
                          </div>
                        )}
                      </button>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-white truncate capitalize group-hover:text-amber-300 transition-colors">
                        {item.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                        {item.name}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">
                        ID: {item.id.slice(0, 8)}...
                      </span>

                      <a
                        href={isPhoto ? `/api/photos/${item.id}?download=true` : `/api/drive/stream/${item.id}?download=true`}
                        download={item.name}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs transition-all"
                        title={`Download ${isPhoto ? "full photo" : "master film"}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="glass-panel overflow-hidden border border-white/10 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 font-mono uppercase text-[10px] border-b border-white/10">
                  <tr>
                    <th className="p-3">Media / Item</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 hidden sm:table-cell">Event Category</th>
                    <th className="p-3 text-center">Cover / Star</th>
                    <th className="p-3 hidden md:table-cell">File ID</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMedia.map((item) => {
                    const isPhoto = item.type === "PHOTO";
                    const isCover = Boolean(
                      project?.coverImage &&
                      (project.coverImage === item.thumbnailUrl ||
                       project.coverImage === (item as any).thumbnailLink ||
                       project.coverImage.includes(item.id))
                    );

                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 flex items-center gap-3">
                          <button
                            onClick={() => handleOpenMedia(item)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                              isPhoto
                                ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500 hover:text-white"
                                : "bg-amber-400/20 text-amber-300 hover:bg-amber-400 hover:text-black"
                            }`}
                          >
                            {isPhoto ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <div className="font-semibold text-white capitalize truncate flex items-center gap-2">
                              <span>{item.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")}</span>
                              {isCover && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black text-[9px] font-bold">
                                  Cover
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate">{item.name}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          {isPhoto ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 text-[10px] font-semibold border border-blue-500/20">
                              Photo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-semibold border border-amber-500/20">
                              Film
                            </span>
                          )}
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300 text-[10px] font-semibold border border-white/10">
                            {item.eventName || "Main"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSetCoverImage(item)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isCover
                                  ? "text-amber-400 bg-amber-400/10"
                                  : "text-slate-600 hover:text-amber-300"
                              }`}
                              title={isCover ? "Current Cover Photo" : "Set as Project Cover Photo"}
                            >
                              <Sparkles className={`w-3.5 h-3.5 ${isCover ? "fill-current" : ""}`} />
                            </button>
                            <button
                              onClick={() => handleToggleFeatured(item.id)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                item.isFeatured ? "text-amber-400 hover:text-amber-300" : "text-slate-600 hover:text-slate-400"
                              }`}
                              title={item.isFeatured ? "Featured" : "Mark as featured"}
                            >
                              <Star className={`w-3.5 h-3.5 ${item.isFeatured ? "fill-current" : ""}`} />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell font-mono text-[11px] text-slate-400">
                          {item.id.slice(0, 12)}...
                        </td>
                        <td className="p-3 text-right">
                          <a
                            href={isPhoto ? `/api/photos/${item.id}?download=true` : `/api/drive/stream/${item.id}?download=true`}
                            download={item.name}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white inline-flex"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 4: Analytics & Insights ── */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <span>Gallery Analytics & Client Engagement</span>
            </h2>
            <p className="text-xs text-slate-400">
              Track how the couple and their family are watching, replaying, and favoriting their wedding films.
            </p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Views</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-serif font-bold text-white">{analyticsData.views || 0}</div>
              <p className="text-[11px] text-slate-400 mt-1">Unique client visits & re-opens</p>
            </div>

            <div className="glass-panel p-5 border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Video Plays</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Play className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-serif font-bold text-white">{analyticsData.plays || 0}</div>
              <p className="text-[11px] text-slate-400 mt-1">Total film streams started</p>
            </div>

            <div className="glass-panel p-5 border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completions</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-serif font-bold text-white">{analyticsData.completions || 0}</div>
              <p className="text-[11px] text-slate-400 mt-1">
                {analyticsData.plays > 0
                  ? `${Math.round(((analyticsData.completions || 0) / analyticsData.plays) * 100)}% completion rate`
                  : "Watched till the end (>90%)"}
              </p>
            </div>

            <div className="glass-panel p-5 border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Heart Favorites</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Heart className="w-4 h-4 fill-rose-400" />
                </div>
              </div>
              <div className="text-3xl font-serif font-bold text-white">{analyticsData.favorites || 0}</div>
              <p className="text-[11px] text-slate-400 mt-1">Moments saved by client</p>
            </div>
          </div>

          {/* Most Watched Films */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-6 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>Most Watched Films</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Ranked by Plays</span>
              </div>

              {allVideos.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No video files scanned yet.</p>
              ) : (
                <div className="space-y-3">
                  {mostWatchedFilms.slice(0, 6).map((vid, idx) => (
                    <div
                      key={vid.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-5 text-center font-serif text-sm font-bold text-amber-400">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-white text-xs truncate capitalize">
                            {vid.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {vid.eventName || "General"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono flex-shrink-0">
                        <div className="text-right">
                          <div className="text-white font-bold">{vid.plays} plays</div>
                          <div className="text-[10px] text-slate-400">{vid.completions} finished ({vid.completionRate}%)</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Client Favorites List */}
            <div className="glass-panel p-6 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                  <span>Client Favorites</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Loved by Couple</span>
              </div>

              {mostFavoritedFilms.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Heart className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p>No films marked as favorite yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">When clients heart films in their gallery, they appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mostFavoritedFilms.map((vid) => (
                    <div
                      key={vid.id}
                      className="p-3 rounded-xl bg-rose-500/[0.03] border border-rose-500/20 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-xs truncate capitalize">
                          {vid.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {vid.eventName || "General"}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-bold font-mono">
                        <Heart className="w-3.5 h-3.5 fill-rose-300" />
                        <span>{vid.favorites}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 5: Gallery Preview ── */}
      {activeTab === "preview" && (
        <div className="space-y-6">
          {/* Header Controls: Device Switcher & Open Window */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 sm:p-5 border border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  <Eye className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-white">Live Client Gallery Preview</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time interactive viewport showing exactly what the wedding couple and guests experience.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Device Viewport Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-black/60 border border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    previewDevice === "desktop"
                      ? "bg-amber-400 text-black shadow-md font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    previewDevice === "mobile"
                      ? "bg-amber-400 text-black shadow-md font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>iPhone 15 Pro</span>
                </button>
              </div>

              <Link
                href={`${clientGalleryUrl}?preview=true&template=${previewTemplate}`}
                target="_blank"
                className="wedding-gold-btn text-xs px-3.5 py-2 flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Tab</span>
              </Link>
            </div>
          </div>

          {/* 1-Click Template Switcher Pill Bar */}
          <div className="glass-panel p-4 border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>Preview Gallery Template</span>
              </span>

              {previewTemplate !== template ? (
                <button
                  type="button"
                  onClick={() => handleApplyPreviewTemplate(previewTemplate)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-amber-400 text-black font-bold flex items-center gap-1.5 shadow-lg shadow-amber-400/20 hover:bg-amber-300 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save &quot;{previewTemplate.toUpperCase()}&quot; as Project Template</span>
                </button>
              ) : (
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active Project Template</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { id: "classic", name: "Classic Elegance", icon: Sparkles },
                { id: "editorial", name: "Editorial Vogue", icon: Feather },
                { id: "minimal", name: "Swiss Minimal", icon: LayoutGrid },
                { id: "cinematic", name: "Cinematic Gold", icon: Tv },
                { id: "luxury", name: "Velvet Luxury", icon: Crown },
                { id: "story", name: "Interactive Story", icon: BookOpen },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = previewTemplate === t.id;
                const isSaved = template === t.id;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPreviewTemplate(t.id as GalleryTemplate)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? "bg-amber-400/15 border-amber-400 text-white shadow-md ring-1 ring-amber-400/40"
                        : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-amber-400" : "text-slate-400"}`} />
                      {isSaved && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Device Mockup Frame */}
          {previewDevice === "desktop" ? (
            /* Desktop Browser Mockup */
            <div className="w-full rounded-2xl overflow-hidden border border-white/15 bg-black/95 shadow-2xl">
              {/* Browser Window Controls Header */}
              <div className="px-4 py-2.5 bg-zinc-900/90 border-b border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>

                <div className="flex-1 max-w-lg mx-auto">
                  <div className="px-3 py-1 rounded-lg bg-black/60 border border-white/10 text-[11px] font-mono text-slate-300 text-center truncate flex items-center justify-center gap-1.5">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>{typeof window !== "undefined" ? window.location.host : "weddinggallery.app"}/gallery/{project.accessCode}?template={previewTemplate}</span>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider hidden sm:block">
                  {previewTemplate.toUpperCase()}
                </div>
              </div>

              {/* Iframe */}
              <div className="w-full h-[780px] bg-black">
                <iframe
                  src={`${clientGalleryUrl}?preview=true&template=${previewTemplate}`}
                  title="Client Gallery Desktop Preview"
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          ) : (
            /* iPhone 15 Pro (390px Mockup Frame) */
            <div className="py-8 flex flex-col items-center justify-center bg-zinc-950/60 rounded-2xl border border-white/10">
              <div className="text-xs text-slate-400 font-mono mb-4 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>iPhone 15 Pro Portrait Viewport (390 × 844 px)</span>
              </div>

              {/* iPhone Chassis */}
              <div className="relative w-[400px] h-[860px] bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 p-2.5 rounded-[54px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.15)] border-4 border-zinc-700/80">
                {/* Outer Rim Antenna Band Accents */}
                <div className="absolute top-28 -left-1 w-1 h-8 bg-zinc-600 rounded-l" />
                <div className="absolute top-40 -left-1 w-1 h-12 bg-zinc-600 rounded-l" />
                <div className="absolute top-56 -left-1 w-1 h-12 bg-zinc-600 rounded-l" />
                <div className="absolute top-36 -right-1 w-1 h-16 bg-zinc-600 rounded-r" />

                {/* Inner Bezel */}
                <div className="w-full h-full bg-black rounded-[46px] overflow-hidden relative flex flex-col border border-white/10">
                  {/* Dynamic Island Notch */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-20 flex items-center justify-between px-2.5 border border-white/10 pointer-events-none shadow-md">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0a192f] border border-blue-400/30" />
                  </div>

                  {/* Status Bar */}
                  <div className="h-10 w-full bg-black/90 flex items-center justify-between px-6 pt-1 text-[10px] text-white font-semibold font-mono z-10 select-none pointer-events-none">
                    <span>9:41</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px]">5G</span>
                      <div className="w-4 h-2 rounded-sm border border-white/80 p-0.5">
                        <div className="w-full h-full bg-white rounded-2xs" />
                      </div>
                    </div>
                  </div>

                  {/* Screen Content Iframe */}
                  <div className="flex-1 w-full bg-black overflow-hidden relative">
                    <iframe
                      src={`${clientGalleryUrl}?preview=true&template=${previewTemplate}`}
                      title="Client Gallery Mobile Preview"
                      className="w-full h-full border-0"
                    />
                  </div>

                  {/* Home Indicator Bar */}
                  <div className="h-5 w-full bg-black/90 flex items-center justify-center pointer-events-none">
                    <div className="w-32 h-1 bg-white/40 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 6: Settings, Themes, White-Label & Domains ── */}
      {activeTab === "settings" && (
        <form onSubmit={handleSave} className="space-y-8">
          {/* Section 1: Gallery Template & Atmosphere (Phase 8 - 6 Templates) */}
          <div className="glass-panel p-6 sm:p-8 space-y-6 border border-white/10">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Gallery Template & Atmosphere</h3>
                <p className="text-xs text-slate-400">Choose from 6 bespoke editorial and cinematic aesthetics for this client gallery</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  id: "classic",
                  name: "Classic Elegance",
                  badge: "ROMANTIC & TIMELESS",
                  desc: "Timeless luxury with centered roman serif typography, gold filigree accents, and balanced storytelling.",
                  accent: "from-amber-950/40 via-black to-slate-900/60",
                  border: "border-amber-400",
                  icon: Sparkles,
                },
                {
                  id: "editorial",
                  name: "Editorial Vogue",
                  badge: "HIGH FASHION",
                  desc: "Asymmetric fashion spread with volume badges, issue stamps, stark contrast, and magazine photo spreads.",
                  accent: "from-slate-900 via-black to-zinc-900",
                  border: "border-white/40",
                  icon: Feather,
                },
                {
                  id: "minimal",
                  name: "Swiss Minimal",
                  badge: "MODERNIST",
                  desc: "Ultra-clean stark modernist geometry, hairline rules, monochrome controls, and pure focus on imagery.",
                  accent: "from-zinc-900/80 via-black to-zinc-950",
                  border: "border-zinc-400",
                  icon: LayoutGrid,
                },
                {
                  id: "cinematic",
                  name: "Cinematic Gold",
                  badge: "HOLLYWOOD WIDESCREEN",
                  desc: "16:9 widescreen presentation, deep obsidian backdrop with golden ambient glows, and film play indicators.",
                  accent: "from-amber-900/30 via-black to-amber-950/50",
                  border: "border-amber-500",
                  icon: Tv,
                },
                {
                  id: "luxury",
                  name: "Velvet Luxury",
                  badge: "ROYAL BLACK-TIE",
                  desc: "Opulent champagne gold metallic corner flourishes, royal crown insignia, and refined serif typography.",
                  accent: "from-yellow-950/40 via-black to-amber-950/60",
                  border: "border-yellow-400",
                  icon: Crown,
                },
                {
                  id: "story",
                  name: "Interactive Story",
                  badge: "DOCUMENTARY NARRATIVE",
                  desc: "Chronological narrative with ceremony chapters timeline, event badges, and quick jump navigation.",
                  accent: "from-rose-950/30 via-black to-slate-900",
                  border: "border-rose-400",
                  icon: BookOpen,
                },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = template === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setTemplate(t.id as GalleryTemplate);
                      setPreviewTemplate(t.id as GalleryTemplate);
                    }}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer bg-gradient-to-b ${t.accent} relative flex flex-col justify-between ${
                      isSelected
                        ? `${t.border} ring-2 ring-amber-400/40 shadow-xl shadow-amber-400/10`
                        : "border-white/10 hover:border-white/30 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-amber-300 font-bold">
                          {t.badge}
                        </span>
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <Icon className="w-4 h-4 text-slate-400" />
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-white mb-1.5 flex items-center gap-2">
                        <span>{t.name}</span>
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{t.desc}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                      <span className={isSelected ? "text-amber-400 font-bold" : "text-slate-400"}>
                        {isSelected ? "Selected Template" : "Click to Select"}
                      </span>
                      <span className="text-slate-400">ID: {t.id}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Typography & Layout Architecture */}
          <div className="glass-panel p-6 sm:p-8 space-y-6 border border-white/10">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Typography & Layout Architecture</h3>
                <p className="text-xs text-slate-400">Configure font pairings, hero header dimensions, and photo grid layouts</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Typography Preset Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Typography & Font Family
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    { id: "serif-elegant", name: "Cormorant Garamond", desc: "Graceful luxury couture serif", sample: "Cormorant" },
                    { id: "serif-editorial", name: "Bodoni Moda", desc: "High-contrast editorial serif", sample: "Bodoni" },
                    { id: "serif-royal", name: "Cinzel", desc: "Roman monumental capitals", sample: "CINZEL" },
                    { id: "sans-modern", name: "Outfit", desc: "Crisp clean geometric sans", sample: "Outfit" },
                    { id: "serif-classic", name: "Playfair Display", desc: "Traditional wedding classic", sample: "Playfair" },
                  ].map((f) => (
                    <div
                      key={f.id}
                      onClick={() => setFontFamily(f.id as FontFamilyPreset)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white/[0.02] ${
                        fontFamily === f.id
                          ? "border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/40"
                          : "border-white/10 hover:border-white/25"
                      }`}
                    >
                      <div className="text-base font-bold text-white mb-1 truncate">{f.sample}</div>
                      <div className="text-xs font-semibold text-amber-300">{f.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero Header Style Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Hero Header Dimensions
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { id: "fullscreen", name: "Fullscreen (100vh)", desc: "Immersive full-screen cinema viewport" },
                    { id: "large", name: "Large Hero (90vh)", desc: "Expansive banner with ceremony metadata" },
                    { id: "split", name: "Split Editorial (75vh)", desc: "Asymmetric photo alongside title" },
                    { id: "minimal", name: "Minimal Header (55vh)", desc: "Streamlined compact top bar" },
                  ].map((h) => (
                    <div
                      key={h.id}
                      onClick={() => setHeroStyle(h.id as HeroStyle)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white/[0.02] ${
                        heroStyle === h.id
                          ? "border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/40"
                          : "border-white/10 hover:border-white/25"
                      }`}
                    >
                      <div className="text-xs font-bold text-white mb-1">{h.name}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{h.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photo Grid Style Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Photo Grid Arrangement
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { id: "masonry", name: "Dynamic Masonry", desc: "Fluid multi-height Pinterest-style collage" },
                    { id: "columns-3", name: "3-Column Architectural", desc: "Balanced architectural gallery grid" },
                    { id: "columns-4", name: "4-Column High Density", desc: "Showcase maximum moments per scroll" },
                    { id: "editorial-mixed", name: "Editorial Mixed", desc: "Magazine spread with featured hero tiles" },
                  ].map((g) => (
                    <div
                      key={g.id}
                      onClick={() => setGridStyle(g.id as PhotoGridStyle)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white/[0.02] ${
                        gridStyle === g.id
                          ? "border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/40"
                          : "border-white/10 hover:border-white/25"
                      }`}
                    >
                      <div className="text-xs font-bold text-white mb-1">{g.name}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{g.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color Presets & Custom Accent Color Pickers */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Accent Color Palette & Highlights
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                  {[
                    { name: "Royal Amber", primary: "#f59e0b", secondary: "#d97706" },
                    { name: "Champagne Luxe", primary: "#fef3c7", secondary: "#ca8a04" },
                    { name: "Rose Romance", primary: "#f43f5e", secondary: "#be123c" },
                    { name: "Emerald Glade", primary: "#10b981", secondary: "#047857" },
                    { name: "Monochrome Crisp", primary: "#ffffff", secondary: "#71717a" },
                  ].map((p) => {
                    const isSelected = primaryAccent === p.primary && secondaryAccent === p.secondary;
                    return (
                      <div
                        key={p.name}
                        onClick={() => {
                          setPrimaryAccent(p.primary);
                          setSecondaryAccent(p.secondary);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 bg-white/[0.02] ${
                          isSelected
                            ? "border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/40"
                            : "border-white/10 hover:border-white/25"
                        }`}
                      >
                        <div className="flex items-center -space-x-1">
                          <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: p.primary }} />
                          <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: p.secondary }} />
                        </div>
                        <span className="text-xs font-semibold text-white truncate">{p.name}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Hex Color Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-black/40 border border-white/10">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                      Primary Accent Color (Badges, Buttons, Glows)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryAccent}
                        onChange={(e) => setPrimaryAccent(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={primaryAccent}
                        onChange={(e) => setPrimaryAccent(e.target.value)}
                        className="glass-input font-mono text-xs flex-1 uppercase"
                        placeholder="#f59e0b"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                      Secondary Accent Color (Borders, Filigree)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryAccent}
                        onChange={(e) => setSecondaryAccent(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={secondaryAccent}
                        onChange={(e) => setSecondaryAccent(e.target.value)}
                        className="glass-input font-mono text-xs flex-1 uppercase"
                        placeholder="#d97706"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: White-Label Gallery & Studio Branding */}
          <div className="glass-panel p-6 sm:p-8 space-y-6 border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">White-Label Gallery & Studio Identity</h3>
                  <p className="text-xs text-slate-400">Complete studio branding isolation with zero platform attribution</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLoadStudioDefaults}
                className="glass-button text-xs px-3.5 py-2 text-amber-300 hover:text-white border-amber-500/30 hover:border-amber-400 flex items-center gap-1.5 cursor-pointer font-semibold self-start sm:self-auto"
                title="Import default branding and logo from Global Studio Settings"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Import Global Studio Defaults</span>
              </button>
            </div>

            {/* White-Label Master Toggle */}
            <div className="p-4 rounded-xl bg-amber-400/[0.04] border border-amber-400/20 flex items-start gap-3">
              <input
                type="checkbox"
                id="whiteLabelToggle"
                checked={whiteLabelEnabled}
                onChange={(e) => setWhiteLabelEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-amber-400 accent-amber-400 cursor-pointer mt-0.5"
              />
              <label htmlFor="whiteLabelToggle" className="cursor-pointer">
                <span className="text-xs font-bold text-white block">
                  Enable White-Label Client Portal
                </span>
                <span className="text-[11px] text-slate-300 leading-relaxed block mt-0.5">
                  Suppresses generic platform logos, Google Drive mentions, and default badges. The client footer, hero, and meta tags will strictly display your studio name, logo, custom contact channels, and copyright.
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Studio / Brand Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. DR FILMS"
                  className="glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Studio Subtitle / Specialty
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Luxury Wedding Cinema & Photography"
                  className="glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Ceremony Location / Venue
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={weddingLocation}
                    onChange={(e) => setWeddingLocation(e.target.value)}
                    placeholder="e.g. Umaid Bhawan Palace, Jodhpur"
                    className="glass-input pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Official Studio Website
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://drfilms.com"
                  className="glass-input"
                />
              </div>

              {/* Studio Logo (Light) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Studio Logo (Light / White on Dark)
                </label>
                <div className="flex items-center gap-3">
                  {logoUrlLight && (
                    <div className="w-12 h-12 rounded-xl bg-black/80 border border-white/20 flex items-center justify-center p-1.5 flex-shrink-0">
                      <img src={logoUrlLight} alt="Light logo preview" className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                  <input
                    type="text"
                    value={logoUrlLight}
                    onChange={(e) => setLogoUrlLight(e.target.value)}
                    placeholder="https://... or upload PNG/SVG"
                    className="glass-input text-xs flex-1"
                  />
                  <label className="glass-button text-xs px-3 py-2.5 flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                    <Upload className={`w-3.5 h-3.5 text-amber-400 ${uploadingLogo === "light" ? "animate-spin" : ""}`} />
                    <span>{uploadingLogo === "light" ? "Uploading..." : "Upload"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e, "light")}
                      disabled={uploadingLogo !== null}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-slate-400">Displayed in gallery navbar & cinema hero</p>
              </div>

              {/* Studio Logo (Dark) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Studio Logo (Dark / for Print QR Cards)
                </label>
                <div className="flex items-center gap-3">
                  {logoUrlDark && (
                    <div className="w-12 h-12 rounded-xl bg-white border border-white/20 flex items-center justify-center p-1.5 flex-shrink-0">
                      <img src={logoUrlDark} alt="Dark logo preview" className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                  <input
                    type="text"
                    value={logoUrlDark}
                    onChange={(e) => setLogoUrlDark(e.target.value)}
                    placeholder="https://... or upload PNG/SVG"
                    className="glass-input text-xs flex-1"
                  />
                  <label className="glass-button text-xs px-3 py-2.5 flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                    <Upload className={`w-3.5 h-3.5 text-amber-400 ${uploadingLogo === "dark" ? "animate-spin" : ""}`} />
                    <span>{uploadingLogo === "dark" ? "Uploading..." : "Upload"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e, "dark")}
                      disabled={uploadingLogo !== null}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-slate-400">Used on printable physical invitation cards</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Studio Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  WhatsApp Contact Number
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Instagram Profile / Handle
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@drfilms_weddings"
                  className="glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Facebook Page URL
                </label>
                <input
                  type="url"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="https://facebook.com/drfilms"
                  className="glass-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Client Gallery Footer Tagline / Copyright
              </label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Crafted with love for your lifelong memories."
                className="glass-input"
              />
            </div>
          </div>

          {/* Section 4: Custom Domain Mapping (CNAME DNS & SSL) */}
          <div className="glass-panel p-6 sm:p-8 space-y-6 border border-white/10">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Custom Domain Mapping</h3>
                <p className="text-xs text-slate-400">Deliver this gallery on your own branded domain (e.g. gallery.yourstudio.com)</p>
              </div>
            </div>

            {/* DNS Instructions Banner */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>DNS CNAME Setup Instructions</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                To link a custom subdomain or root domain to this wedding project, add a DNS CNAME record in your registrar (GoDaddy, Namecheap, Cloudflare, Route53, etc.):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-black/60 border border-white/10 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Type</span>
                  <span className="text-amber-300 font-bold">CNAME</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Host / Name</span>
                  <span className="text-white">gallery <span className="text-slate-400">(or your subdomain)</span></span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Target / Value</span>
                  <span className="text-emerald-400 font-bold select-all">cname.weddinggallery.app</span>
                </div>
              </div>
            </div>

            {/* Add Domain Input Form */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Connect New Domain or Subdomain
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={newDomainHostname}
                  onChange={(e) => {
                    setNewDomainHostname(e.target.value);
                    setDomainError("");
                  }}
                  placeholder="gallery.drfilms.com"
                  className="glass-input font-mono text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddDomain}
                  disabled={isAddingDomain || !newDomainHostname.trim()}
                  className="wedding-gold-btn text-xs px-5 py-2.5 flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingDomain ? "Connecting..." : "Add Domain"}</span>
                </button>
              </div>
              {domainError && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{domainError}</span>
                </p>
              )}
            </div>

            {/* Connected Domains Table / List */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Configured Domains for this Wedding ({domains.length})
              </span>

              {domains.length === 0 ? (
                <div className="p-6 rounded-xl bg-white/[0.01] border border-dashed border-white/10 text-center text-xs text-slate-400">
                  No custom domain connected yet. Guests can always access via the standard permanent access code link.
                </div>
              ) : (
                <div className="space-y-2">
                  {domains.map((dom) => (
                    <div
                      key={dom.id}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-black/60 border border-white/10 text-amber-400 flex-shrink-0">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-mono text-xs font-bold text-white flex items-center gap-2 truncate">
                            <span>{dom.hostname}</span>
                            {dom.status === "active" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-sans">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Live & SSL Active</span>
                              </span>
                            )}
                            {dom.status === "pending" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-sans">
                                <Clock className="w-3 h-3" />
                                <span>DNS Pending</span>
                              </span>
                            )}
                            {dom.status === "invalid" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-sans">
                                <AlertCircle className="w-3 h-3" />
                                <span>DNS Unresolved</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Target: cname.weddinggallery.app · SSL: {dom.sslStatus || "Auto-Provisioned"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleVerifyDomain(dom.id)}
                          disabled={verifyingDomainId === dom.id}
                          className="glass-button text-xs px-3 py-1.5 flex items-center gap-1 cursor-pointer font-semibold text-amber-300 hover:text-white"
                        >
                          <RefreshCw className={`w-3 h-3 ${verifyingDomainId === dom.id ? "animate-spin" : ""}`} />
                          <span>{verifyingDomainId === dom.id ? "Checking..." : "Verify DNS"}</span>
                        </button>

                        <a
                          href={`https://${dom.hostname}`}
                          target="_blank"
                          rel="noreferrer"
                          className="glass-button text-xs px-3 py-1.5 flex items-center gap-1 cursor-pointer text-slate-300 hover:text-white"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Visit</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDeleteDomain(dom.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="Remove domain"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Lifecycle Status, Expiration & Permanent Links */}
          <div className="glass-panel p-6 sm:p-8 space-y-6 border border-white/10">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Project Lifecycle & Expiration</h3>
                <p className="text-xs text-slate-400">Manage gallery access duration and project state</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Gallery Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="glass-input bg-slate-900 font-semibold"
                >
                  <option value="published">LIVE (Active Client Delivery)</option>
                  <option value="paused">PAUSED (Temporarily Unavailable)</option>
                  <option value="expired">EXPIRED (Gallery No Longer Available)</option>
                  <option value="archived">ARCHIVED (Concluded)</option>
                  <option value="draft">DRAFT (Photographer Preview Only)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  PAUSED shows: &ldquo;This wedding gallery is temporarily unavailable.&rdquo;<br/>
                  EXPIRED shows: &ldquo;This gallery is no longer available.&rdquo;
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Optional Gallery Expiration Date
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { id: "never", label: "Never" },
                    { id: "30d", label: "30 Days" },
                    { id: "90d", label: "90 Days" },
                    { id: "1y", label: "1 Year" },
                    { id: "custom", label: "Custom" },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleExpiryPresetChange(preset.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        expiryPreset === preset.id
                          ? "bg-amber-400 text-black border-amber-300 shadow-sm"
                          : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => {
                    setExpiresAt(e.target.value);
                    setExpiryPreset("custom");
                  }}
                  className="glass-input"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Default is Never. When expired, client visitors receive: &ldquo;This gallery is no longer available.&rdquo;
                </span>
              </div>

              {/* Permanent Client Link & Access Code Regeneration */}
              <div className="col-span-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                      Client Gallery Permanent Link & Access Code
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      The clean URL delivered to clients. Decoupled from Google Drive.
                    </div>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 font-bold self-start sm:self-auto">
                    Code: {project.accessCode}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-amber-300 truncate select-all">
                    {`${typeof window !== "undefined" ? window.location.origin : ""}/gallery/${project.accessCode}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyClientLink}
                      className="glass-button text-xs px-3.5 py-2.5 flex items-center gap-1.5 cursor-pointer font-semibold"
                    >
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>{copied ? "✓ Copied" : "Copy Link"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRegenerateConfirm(true)}
                      className="glass-button text-xs px-3.5 py-2.5 text-rose-300 hover:text-white border-rose-500/30 hover:border-rose-500 flex items-center gap-1.5 cursor-pointer font-semibold transition-all"
                      title="Regenerate access code and invalidate old link"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Regenerate Link / Code</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Couple Names
                </label>
                <input
                  type="text"
                  value={coupleName}
                  onChange={(e) => setCoupleName(e.target.value)}
                  required
                  className="glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Wedding Date
                </label>
                <input
                  type="date"
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  required
                  className="glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Welcome Subtitle / Message
                </label>
                <input
                  type="text"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Package Name
                </label>
                <input
                  type="text"
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value)}
                  placeholder="e.g. Royal Cinema Collection"
                  className="glass-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Google Drive Folder URL
              </label>
              <input
                type="url"
                value={driveFolderUrl}
                onChange={(e) => setDriveFolderUrl(e.target.value)}
                required
                className="glass-input font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Photographer Internal Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Private notes (only visible to photographer)..."
                className="glass-input text-xs"
              />
            </div>
          </div>

          {/* Section 6: Access Control & Playback Permissions */}
          <div className="glass-panel p-6 sm:p-8 space-y-6 border border-white/10">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Access Control & Playback Permissions</h3>
                <p className="text-xs text-slate-400">Configure client security, downloads, and playback controls</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Password Protection */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPasswordProtected}
                    onChange={(e) => setIsPasswordProtected(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-400 accent-amber-400 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Password Protection</span>
                  </div>
                </label>

                {isPasswordProtected && (
                  <div className="pt-2 pl-7">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Client Access Password
                    </label>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Set or change password..."
                      className="glass-input max-w-sm text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowPhotoDownload}
                    onChange={(e) => {
                      setAllowPhotoDownload(e.target.checked);
                      setAllowDownloads(e.target.checked || allowVideoDownload);
                    }}
                    className="w-4 h-4 rounded text-amber-400 accent-amber-400 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-white block">Allow Photo Downloads</span>
                    <span className="text-[10px] text-slate-400">Client can download individual & ZIP photos</span>
                  </div>
                </label>

                <label className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowVideoDownload}
                    onChange={(e) => {
                      setAllowVideoDownload(e.target.checked);
                      setAllowDownloads(allowPhotoDownload || e.target.checked);
                    }}
                    className="w-4 h-4 rounded text-amber-400 accent-amber-400 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-white block">Allow Video Downloads</span>
                    <span className="text-[10px] text-slate-400">Client can download MP4 films</span>
                  </div>
                </label>

                <label className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowFullscreen}
                    onChange={(e) => setAllowFullscreen(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-400 accent-amber-400 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-white block">Allow Fullscreen</span>
                    <span className="text-[10px] text-slate-400">Cinema view player</span>
                  </div>
                </label>

                <label className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBranding}
                    onChange={(e) => setShowBranding(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-400 accent-amber-400 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-white block">Show Branding</span>
                    <span className="text-[10px] text-slate-400">Photographer signature</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs font-semibold text-red-400 hover:text-red-300 p-2.5 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Project</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="wedding-gold-btn text-xs px-7 py-3 shadow-xl cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving Settings..." : "Save Settings & Theme"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ── Tab 7: Client Favorites & Selection ── */}
      {activeTab === "favorites" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Sub-Tabs and Export Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 border border-white/10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFavAdminSubTab("favorites")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  favAdminSubTab === "favorites"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-500/10"
                    : "text-slate-400 hover:text-white bg-white/5 border border-white/5"
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${favAdminSubTab === "favorites" ? "fill-rose-400 text-rose-400" : ""}`} />
                <span>Client Favorites</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 font-mono">
                  {favoritesData.total}
                </span>
              </button>

              <button
                onClick={() => setFavAdminSubTab("selection")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  favAdminSubTab === "selection"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10"
                    : "text-slate-400 hover:text-white bg-white/5 border border-white/5"
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Album Selection</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 font-mono">
                  {selectionData.count} / {selectionData.config.limit}
                </span>
                {selectionData.config.status === "SUBMITTED" && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Submitted by Client" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={fetchFavoritesAndSelections}
                className="glass-button text-xs py-2 px-3 text-slate-300 hover:text-white cursor-pointer"
                title="Refresh favorites & selections from server"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>

              {selectionData.count > 0 && (
                <a
                  href={`/api/projects/${projectId}/selection/export`}
                  className="glass-button text-xs py-2 px-3 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer flex items-center gap-1.5"
                  title="Download CSV of client's selected photos with Drive File IDs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export Selection (.CSV)</span>
                </a>
              )}
            </div>
          </div>

          {/* ── Sub-tab 1: Client Favorites ── */}
          {favAdminSubTab === "favorites" && (
            <div className="space-y-6">
              {/* Metric Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-panel p-4 border border-white/10 text-center">
                  <Heart className="w-5 h-5 text-rose-400 fill-rose-400/20 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-white font-mono">{favoritesData.total}</div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">Total Favorites</div>
                </div>

                <div className="glass-panel p-4 border border-white/10 text-center">
                  <ImageIcon className="w-5 h-5 text-sky-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-white font-mono">{favoritesData.photos}</div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">Favorite Photos</div>
                </div>

                <div className="glass-panel p-4 border border-white/10 text-center">
                  <Film className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-white font-mono">{favoritesData.videos}</div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">Favorite Films</div>
                </div>

                <div className="glass-panel p-4 border border-white/10 text-center">
                  <Layers className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-white font-mono">
                    {Object.keys(favoritesData.byEvent).length}
                  </div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">Events Marked</div>
                </div>
              </div>

              {/* Event Breakdown Chips */}
              {Object.keys(favoritesData.byEvent).length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setFavFilterEvent("all")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      favFilterEvent === "all"
                        ? "bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20"
                        : "bg-white/5 text-slate-400 hover:text-white border border-white/5"
                    }`}
                  >
                    All Events ({favoritesData.total})
                  </button>
                  {Object.entries(favoritesData.byEvent).map(([eventName, count]) => (
                    <button
                      key={eventName}
                      onClick={() => setFavFilterEvent(eventName)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        favFilterEvent.toLowerCase() === eventName.toLowerCase()
                          ? "bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20"
                          : "bg-white/5 text-slate-400 hover:text-white border border-white/5"
                      }`}
                    >
                      {eventName} ({count})
                    </button>
                  ))}
                </div>
              )}

              {/* Filter Controls Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-panel p-3 border border-white/10">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={favSearch}
                    onChange={(e) => setFavSearch(e.target.value)}
                    placeholder="Search by filename or ID..."
                    className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                  />
                  {favSearch && (
                    <button
                      onClick={() => setFavSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <button
                    onClick={() => setFavFilterType("all")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      favFilterType === "all" ? "bg-white/20 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    All ({favoritesData.total})
                  </button>
                  <button
                    onClick={() => setFavFilterType("PHOTO")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      favFilterType === "PHOTO" ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Photos ({favoritesData.photos})
                  </button>
                  <button
                    onClick={() => setFavFilterType("VIDEO")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      favFilterType === "VIDEO" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Films ({favoritesData.videos})
                  </button>
                </div>
              </div>

              {/* Favorites Grid */}
              {filteredAdminFavorites.length === 0 ? (
                <div className="glass-panel p-12 text-center border border-white/10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
                    <Heart className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-serif font-bold text-white">No Client Favorites Found</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    {favoritesData.total === 0
                      ? "When the couple browses their private gallery and clicks the heart icon on photos or films, their favorites will appear here with one-click Drive File ID export."
                      : "No favorites match your current filter criteria. Try resetting the event or search filters."}
                  </p>
                  {favoritesData.total > 0 && (
                    <button
                      onClick={() => {
                        setFavFilterType("all");
                        setFavFilterEvent("all");
                        setFavSearch("");
                      }}
                      className="glass-button text-xs py-2 px-4 text-amber-300 mx-auto cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredAdminFavorites.map((fav) => {
                    const isVideo = fav.mediaType === "VIDEO";
                    const thumbUrl = fav.media?.thumbnailUrl || (fav.media as any)?.thumbnailLink || "/placeholder-photo.jpg";
                    const isCopied = copiedFileId === fav.mediaId;

                    return (
                      <div
                        key={fav.id}
                        className="group glass-panel border border-white/10 rounded-2xl overflow-hidden hover:border-amber-400/30 transition-all flex flex-col"
                      >
                        {/* Thumbnail */}
                        <div
                          onClick={() => handlePreviewFavOrSel(fav.media, fav.mediaType, fav.mediaId)}
                          className="relative aspect-video bg-black/40 overflow-hidden cursor-pointer"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={thumbUrl}
                            alt={fav.media?.name || "Media"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-80 group-hover:opacity-60 transition-opacity" />

                          {/* Top Badges */}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md backdrop-blur-md ${
                              isVideo
                                ? "bg-amber-500/30 text-amber-200 border border-amber-500/40"
                                : "bg-sky-500/30 text-sky-200 border border-sky-500/40"
                            }`}>
                              {isVideo ? "Film" : "Photo"}
                            </span>
                            {fav.media?.eventName && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-slate-300 border border-white/10">
                                {fav.media.eventName}
                              </span>
                            )}
                          </div>

                          {/* Heart Badge */}
                          <div className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-500/20 backdrop-blur-md border border-rose-500/40 text-rose-300">
                            <Heart className="w-3.5 h-3.5 fill-rose-400" />
                          </div>

                          {/* Hover Play/View overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                              {isVideo ? <Play className="w-4 h-4 fill-white translate-x-0.5" /> : <Eye className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Card Info & Actions */}
                        <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-white truncate" title={fav.media?.name || fav.mediaId}>
                              {fav.media?.name || fav.mediaId}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                              <span>Saved {new Date(fav.createdAt).toLocaleDateString()}</span>
                              {fav.media?.size && (
                                <span>{(parseInt(fav.media.size) / (1024 * 1024)).toFixed(1)} MB</span>
                              )}
                            </div>
                          </div>

                          {/* Drive File ID and Copy */}
                          <div className="pt-2 border-t border-white/5 space-y-2">
                            <div className="flex items-center justify-between gap-1 text-[11px] p-1.5 rounded-lg bg-black/40 border border-white/5">
                              <span className="font-mono text-slate-400 truncate text-[10px]" title={fav.mediaId}>
                                ID: {fav.mediaId.slice(0, 16)}...
                              </span>
                              <button
                                onClick={(e) => handleCopyFileId(fav.mediaId, e)}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                                  isCopied
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                    : "bg-white/10 hover:bg-white/20 text-amber-300"
                                }`}
                                title="Copy Google Drive File ID"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy ID</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <button
                                onClick={() => handlePreviewFavOrSel(fav.media, fav.mediaType, fav.mediaId)}
                                className="text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3 text-amber-400" />
                                <span>Preview</span>
                              </button>

                              {fav.media?.webViewLink && (
                                <a
                                  href={fav.media.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-semibold text-slate-400 hover:text-amber-300 flex items-center gap-1"
                                >
                                  <span>Drive</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Sub-tab 2: Album Selection ── */}
          {favAdminSubTab === "selection" && (
            <div className="space-y-6">
              {/* Selection Status & Workflow Panel */}
              <div className="glass-panel p-6 border border-white/10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 text-amber-400" />
                      <span>Album Selection Configuration</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Set a quota for how many photos the couple can select for their physical wedding album or highlights.
                    </p>
                  </div>

                  {/* Status Tag */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs uppercase font-bold tracking-wider px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                      selectionData.config.status === "SUBMITTED"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : selectionData.config.status === "REOPENED"
                        ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                        : selectionData.config.status === "LOCKED"
                        ? "bg-slate-500/20 text-slate-300 border-slate-500/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-current" />
                      <span>Status: {selectionData.config.status}</span>
                    </span>
                  </div>
                </div>

                {/* Submitted Banner if submitted */}
                {selectionData.config.status === "SUBMITTED" && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCheck className="w-4 h-4 text-emerald-400" />
                        <span>Client Selection Submitted</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        The couple has finalized their selection of {selectionData.count} items on{" "}
                        <span className="text-white font-mono">
                          {selectionData.config.submittedAt ? new Date(selectionData.config.submittedAt).toLocaleString() : "recently"}
                        </span>.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleReopenSelection}
                        disabled={reopeningSel}
                        className="glass-button text-xs py-2 px-3 text-sky-300 border-sky-500/30 hover:bg-sky-500/10 cursor-pointer flex items-center gap-1.5"
                        title="Reopen selection so client can adjust choices"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${reopeningSel ? "animate-spin" : ""}`} />
                        <span>{reopeningSel ? "Reopening..." : "Reopen for Edits"}</span>
                      </button>

                      <a
                        href={`/api/projects/${projectId}/selection/export`}
                        className="wedding-gold-btn text-xs py-2 px-4 flex items-center gap-1.5"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-black" />
                        <span className="text-black font-bold">Download CSV</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Configuration Form */}
                <form onSubmit={handleSaveSelectionConfig} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Toggle Enable */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-white block">Enable Client Selection Mode</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          When active, checkmark selectors appear on gallery media and the couple can pick items.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selEnabled}
                          onChange={(e) => setSelEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                      </label>
                    </div>

                    {/* Limit Selector */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-white block">Selection Limit (Quota)</label>
                        <span className="text-xs font-mono text-amber-300 font-bold">{selLimit} items</span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        {[25, 50, 75, 100, 150].map((preset) => (
                          <button
                            type="button"
                            key={preset}
                            onClick={() => setSelLimit(preset)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                              selLimit === preset
                                ? "bg-amber-400 text-black font-bold"
                                : "bg-white/5 text-slate-400 hover:text-white"
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={selLimit}
                          onChange={(e) => setSelLimit(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 py-1 px-2 bg-black/40 border border-white/10 rounded-lg text-xs font-mono text-white text-center focus:outline-none focus:border-amber-400/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Title & Instructions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                        Selection Title for Couple
                      </label>
                      <input
                        type="text"
                        value={selTitle}
                        onChange={(e) => setSelTitle(e.target.value)}
                        placeholder="e.g. Luxury Wedding Album Selection"
                        className="glass-input"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                        Instructions / Guidelines for Couple
                      </label>
                      <input
                        type="text"
                        value={selInstructions}
                        onChange={(e) => setSelInstructions(e.target.value)}
                        placeholder="e.g. Please pick your top 50 photos. Feel free to include moments from each event."
                        className="glass-input"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingSelConfig}
                      className="wedding-gold-btn text-xs px-6 py-2.5 shadow-lg flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5 text-black" />
                      <span className="text-black font-bold">
                        {savingSelConfig ? "Saving Settings..." : "Save Selection Settings"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Progress and Item List */}
              <div className="space-y-4">
                <div className="glass-panel p-4 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Selected Items</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono">
                        {selectionData.count} of {selectionData.config.limit}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {Math.round((selectionData.count / Math.max(selectionData.config.limit, 1)) * 100)}% of album limit chosen
                    </p>
                  </div>

                  {selectionData.count > 0 && (
                    <a
                      href={`/api/projects/${projectId}/selection/export`}
                      className="glass-button text-xs py-2 px-3 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Download CSV</span>
                    </a>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-amber-300 h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((selectionData.count / Math.max(selectionData.config.limit, 1)) * 100))}%`,
                    }}
                  />
                </div>

                {/* Selected Cards Grid */}
                {filteredAdminSelections.length === 0 ? (
                  <div className="glass-panel p-12 text-center border border-white/10 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                      <CheckSquare className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-serif font-bold text-white">No Media Selected Yet</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      {selEnabled
                        ? "The couple has not made any selections yet. When they select photos or films in the gallery, they will appear here."
                        : "Enable Client Selection Mode above so the couple can select their album photos from their private gallery."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredAdminSelections.map((sel, idx) => {
                      const isVideo = sel.mediaType === "VIDEO";
                      const thumbUrl = sel.media?.thumbnailUrl || (sel.media as any)?.thumbnailLink || "/placeholder-photo.jpg";
                      const isCopied = copiedFileId === sel.mediaId;

                      return (
                        <div
                          key={sel.id}
                          className="group glass-panel border border-amber-400/30 rounded-2xl overflow-hidden hover:border-amber-400/60 transition-all flex flex-col relative"
                        >
                          {/* Item number badge */}
                          <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-amber-400 text-black text-[11px] font-bold flex items-center justify-center shadow-lg font-mono">
                            {idx + 1}
                          </div>

                          {/* Thumbnail */}
                          <div
                            onClick={() => handlePreviewFavOrSel(sel.media, sel.mediaType, sel.mediaId)}
                            className="relative aspect-video bg-black/40 overflow-hidden cursor-pointer"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={thumbUrl}
                              alt={sel.media?.name || "Selected Item"}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-80 group-hover:opacity-60 transition-opacity" />

                            <div className="absolute top-2 right-2 flex items-center gap-1">
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md backdrop-blur-md ${
                                isVideo
                                  ? "bg-amber-500/30 text-amber-200 border border-amber-500/40"
                                  : "bg-sky-500/30 text-sky-200 border border-sky-500/40"
                              }`}>
                                {isVideo ? "Film" : "Photo"}
                              </span>
                            </div>

                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                                {isVideo ? <Play className="w-4 h-4 fill-white translate-x-0.5" /> : <Eye className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>

                          {/* Info & Copy ID */}
                          <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-white truncate" title={sel.media?.name || sel.mediaId}>
                                {sel.media?.name || sel.mediaId}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                                <span>{sel.media?.eventName || "General"}</span>
                                <span>Selected {new Date(sel.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-white/5 space-y-2">
                              <div className="flex items-center justify-between gap-1 text-[11px] p-1.5 rounded-lg bg-black/40 border border-white/5">
                                <span className="font-mono text-slate-400 truncate text-[10px]" title={sel.mediaId}>
                                  ID: {sel.mediaId.slice(0, 16)}...
                                </span>
                                <button
                                  onClick={(e) => handleCopyFileId(sel.mediaId, e)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                                    isCopied
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                      : "bg-white/10 hover:bg-white/20 text-amber-300"
                                  }`}
                                  title="Copy Google Drive File ID"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy ID</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <button
                                  onClick={() => handlePreviewFavOrSel(sel.media, sel.mediaType, sel.mediaId)}
                                  className="text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3 text-amber-400" />
                                  <span>Preview</span>
                                </button>

                                {sel.media?.webViewLink && (
                                  <a
                                    href={sel.media.webViewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-semibold text-slate-400 hover:text-amber-300 flex items-center gap-1"
                                  >
                                    <span>Drive</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 8: Client Activity Timeline ── */}
      {activeTab === "activity" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 border border-white/10">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>Client Activity Timeline</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time event stream of when the couple and guests interact with their gallery.
              </p>
            </div>
            <button
              onClick={fetchActivity}
              disabled={loadingActivity}
              className="glass-button text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loadingActivity ? "animate-spin" : ""}`} />
              <span>Refresh Activity</span>
            </button>
          </div>

          {loadingActivity ? (
            <div className="glass-panel p-12 text-center border border-white/10 space-y-3">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading activity timeline...</p>
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="glass-panel p-16 text-center border border-white/10 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                <History className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white">No Client Activity Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When the couple opens their link, favorites photos, selects album items, or submits their selection, events will appear here in chronological order.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activityLogs.map((log) => {
                const getEventBadge = () => {
                  switch (log.eventType) {
                    case "gallery_opened":
                      return {
                        label: "Gallery Opened",
                        bg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
                        icon: <Eye className="w-3.5 h-3.5 text-blue-400" />,
                      };
                    case "photo_favorited":
                      return {
                        label: "Photo Favorited",
                        bg: "bg-rose-500/20 text-rose-300 border-rose-500/30",
                        icon: <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />,
                      };
                    case "photo_selected":
                      return {
                        label: "Album Selection Added",
                        bg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
                        icon: <CheckSquare className="w-3.5 h-3.5 text-amber-400" />,
                      };
                    case "selection_submitted":
                      return {
                        label: "Selection Submitted",
                        bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                        icon: <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />,
                      };
                    case "zip_downloaded":
                      return {
                        label: "ZIP Downloaded",
                        bg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
                        icon: <Download className="w-3.5 h-3.5 text-purple-400" />,
                      };
                    case "photo_downloaded":
                      return {
                        label: "Photo Downloaded",
                        bg: "bg-sky-500/20 text-sky-300 border-sky-500/30",
                        icon: <Download className="w-3.5 h-3.5 text-sky-400" />,
                      };
                    case "video_downloaded":
                      return {
                        label: "Video Downloaded",
                        bg: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
                        icon: <Film className="w-3.5 h-3.5 text-indigo-400" />,
                      };
                    default:
                      return {
                        label: log.eventType,
                        bg: "bg-white/10 text-slate-300 border-white/10",
                        icon: <Sparkles className="w-3.5 h-3.5 text-slate-400" />,
                      };
                  }
                };

                const badge = getEventBadge();
                const eventDate = new Date(log.timestamp);
                const clientName = log.metadata?.clientName || log.metadata?.name;

                return (
                  <div
                    key={log.id}
                    className="glass-panel p-4 border border-white/10 flex items-center justify-between gap-4 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex-shrink-0">
                        {badge.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.bg}`}>
                            {badge.label}
                          </span>
                          {clientName && (
                            <span className="text-xs text-white font-semibold">
                              by {clientName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          {log.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-mono text-slate-300">
                        {eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {eventDate.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── High-Resolution QR Code & Printable Card Modal ── */}
      <QrCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        coupleName={project.coupleName}
        accessCode={project.accessCode}
        weddingDate={project.weddingDate}
        photographerName={businessName || project.photographerName}
        branding={project.branding}
        coverImage={project.coverImage}
      />

      {/* ── Share Modal ── */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        coupleName={project.coupleName}
        accessCode={project.accessCode}
        weddingDate={project.weddingDate}
        photographerName={businessName || project.photographerName}
        branding={project.branding}
        onOpenQrCode={() => {
          setShowShareModal(false);
          setShowQrModal(true);
        }}
      />

      {/* ── Regenerate Access Code Confirmation Dialog ── */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel max-w-md w-full p-6 sm:p-8 border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Regenerate Client Link?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Regenerate client link? This will invalidate the existing link.
              Anyone using the old link (<span className="font-mono text-amber-300">/gallery/{project.accessCode}</span>) will immediately lose access.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(false)}
                disabled={isRegenerating}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegenerateCode}
                disabled={isRegenerating}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRegenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Regenerating...</span>
                  </>
                ) : (
                  <span>Yes, Regenerate Link</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal Player */}
      {selectedVideoIndex !== null && allVideos[selectedVideoIndex] && (
        <VideoModal
          videos={allVideos}
          currentIndex={selectedVideoIndex}
          onClose={() => setSelectedVideoIndex(null)}
          onSelectIndex={setSelectedVideoIndex}
        />
      )}

      {/* Photo Lightbox Modal */}
      {selectedPhotoIndex !== null && allPhotos[selectedPhotoIndex] && (
        <PhotoLightbox
          photos={allPhotos}
          currentIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
          onSelectIndex={setSelectedPhotoIndex}
          allowDownloads={true}
          onSetCover={handleSetCoverImage}
          isCover={Boolean(
            project?.coverImage &&
              allPhotos[selectedPhotoIndex] &&
              (project.coverImage === allPhotos[selectedPhotoIndex].thumbnailUrl ||
                project.coverImage === (allPhotos[selectedPhotoIndex] as any).thumbnailLink ||
                project.coverImage.includes(allPhotos[selectedPhotoIndex].id))
          )}
        />
      )}
    </div>
  );
}
