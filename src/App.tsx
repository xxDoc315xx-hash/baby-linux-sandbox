import React, { useEffect, useState } from "react";
import { Profile, AvatarStyle } from "./types";
import ProfileCard from "./components/ProfileCard";
import SvgAvatar from "./components/SvgAvatar";
import BabyLinux from "./components/BabyLinux";
import ChatRoom from "./components/ChatRoom";
import AuthModal from "./components/AuthModal";
import AdaTuxStudio from "./components/AdaTuxStudio";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Plus,
  Compass,
  Zap,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Code,
  Brush,
  Cpu,
  RefreshCw,
  Search,
  Filter,
  Terminal,
  Smartphone,
  Bell,
  Volume2,
  VolumeX,
  QrCode,
  Wifi,
  WifiOff,
  Copy,
  Check,
  MessageSquare,
  Flame,
  Play,
  LogIn,
  LogOut,
  User as UserIcon
} from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "./firebase";

// Default placeholder / new profile state
const INITIAL_AVATAR_STYLE: AvatarStyle = {
  bgColor: "#1e1b4b",
  fgColor: "#818cf8",
  pattern: "dots"
};

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Toggle between active project screens
  const [activeTab, setActiveTab] = useState<"ada-studio" | "live-chat" | "baby-linux" | "cosmic-creators">("baby-linux");

  // Active email matching the user's session
  const currentUserEmail = "xxDoc315xx@hotmail.com";

  // Synced Lesson Progress state from Firestore
  const [syncedProgress, setSyncedProgress] = useState<{
    currentLessonId: number;
    lessonsCompleted: number[];
    xp: number;
    lastLessonTitle: string;
  }>({
    currentLessonId: 1,
    lessonsCompleted: [],
    xp: 0,
    lastLessonTitle: "The Welcome Nursery"
  });

  // Listen to Firestore Lesson Progress on mount
  useEffect(() => {
    if (!currentUserEmail) return;
    const docId = currentUserEmail.replace(/[^a-zA-Z0-9]/g, "_");
    const progressRef = doc(db, "progress", docId);

    const unsubscribe = onSnapshot(progressRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSyncedProgress({
          currentLessonId: data.currentLessonId || 1,
          lessonsCompleted: Array.isArray(data.lessonsCompleted) ? data.lessonsCompleted : [],
          xp: typeof data.xp === "number" ? data.xp : (Array.isArray(data.lessonsCompleted) ? data.lessonsCompleted.length * 50 : 0),
          lastLessonTitle: data.lastLessonTitle || "Explorer"
        });
      }
    }, (err) => {
      console.warn("Firestore App progress listener notice:", err);
    });

    return () => unsubscribe();
  }, [currentUserEmail]);

  // Real-time Mobile Synchronization & Push states
  const [pushNotifications, setPushNotifications] = useState<Array<{ id: string; message: string; sender: string; timestamp: number }>>([]);
  const [isSyncOpen, setIsSyncOpen] = useState<boolean>(false);
  const [activeClients, setActiveClients] = useState<number>(1);
  const [hasActivePhone, setHasActivePhone] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showToast, setShowToast] = useState<{ message: string; sender: string } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Sound generator
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      playTone(523.25, ctx.currentTime, 0.25); // C5
      playTone(659.25, ctx.currentTime + 0.08, 0.25); // E5
      playTone(783.99, ctx.currentTime + 0.16, 0.4); // G5
    } catch (e) {
      console.error("Audio chime failed:", e);
    }
  };

  // Register SSE Connection
  useEffect(() => {
    const sseUrl = `/api/push/register?email=${encodeURIComponent(currentUserEmail)}`;
    let eventSource: EventSource | null = null;
    
    const connectSSE = () => {
      console.log("Connecting to Push SSE stream...");
      eventSource = new EventSource(sseUrl);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "push") {
            playChime();
            if (navigator.vibrate) {
              navigator.vibrate([120, 80, 120]);
            }
            
            // Add notification
            const newNotif = {
              id: Math.random().toString(),
              message: data.message,
              sender: data.sender || "System",
              timestamp: data.timestamp || Date.now()
            };
            setPushNotifications((prev) => [newNotif, ...prev]);
            
            // Trigger beautiful animated popup toast
            setShowToast({ message: data.message, sender: data.sender || "System" });
            setTimeout(() => {
              setShowToast(null);
            }, 6000);
          }
        } catch (e) {
          // ignore parsing error for heartbeat pings
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        setTimeout(connectSSE, 5000); // Reconnect after 5s
      };
    };

    connectSSE();

    // Check device connection status every 4 seconds
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/push/status?email=${encodeURIComponent(currentUserEmail)}`);
        if (res.ok) {
          const data = await res.json();
          setActiveClients(data.connectedClients);
          setHasActivePhone(data.hasActivePhone);
        }
      } catch (e) {
        // fail silently
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 4000);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(interval);
    };
  }, [soundEnabled]);

  // Form states for creating / updating profiles
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  interface ProfileFormData {
    name: string;
    nickname: string;
    email: string;
    role: string;
    bio: string;
    tagline: string;
    skillsString: string;
    badge: string;
    theme: "slate" | "violet" | "amber" | "emerald" | "rose" | "sky";
    twitter: string;
    github: string;
    website: string;
    avatarBg: string;
    avatarFg: string;
    avatarPattern: "dots" | "grid" | "waves" | "circles" | "triangles" | "crosses";
  }

  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    nickname: "",
    email: "",
    role: "",
    bio: "",
    tagline: "",
    skillsString: "",
    badge: "",
    theme: "amber",
    twitter: "",
    github: "",
    website: "",
    avatarBg: "#121829",
    avatarFg: "#38bdf8",
    avatarPattern: "dots"
  });

  // AI Generation States
  const [generating, setGenerating] = useState<boolean>(false);
  const [vibe, setVibe] = useState<string>("retro cyberpunk");
  const [aiKeywords, setAiKeywords] = useState<string>("");

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [themeFilter, setThemeFilter] = useState<string>("all");

  // Load profiles on mount
  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profiles");
      if (!res.ok) throw new Error("Failed to load profiles directory.");
      const data = await res.json();
      setProfiles(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Spark / Upvote Action
  const handleSpark = async (id: string) => {
    try {
      const res = await fetch(`/api/profiles/${id}/spark`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to cast your Spark.");
      const data = await res.json();

      // Update state immediately
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, sparks: data.sparks } : p))
      );
    } catch (err: any) {
      alert(err.message || "Failed to spark profile.");
    }
  };

  // Start edit flow
  const handleStartEdit = (p: Profile) => {
    setFormError(null);
    setFormData({
      name: p.name,
      nickname: p.nickname || "",
      email: p.email,
      role: p.role,
      bio: p.bio,
      tagline: p.tagline,
      skillsString: p.skills.join(", "),
      badge: p.badge || "",
      theme: p.theme,
      twitter: p.socials.twitter || "",
      github: p.socials.github || "",
      website: p.socials.website || "",
      avatarBg: p.avatarStyle?.bgColor || "#121829",
      avatarFg: p.avatarStyle?.fgColor || "#38bdf8",
      avatarPattern: p.avatarStyle?.pattern || "dots"
    });
    setIsFormOpen(true);
  };

  // Prepare new profile form
  const handleStartNew = () => {
    setFormError(null);
    setFormData({
      name: "",
      nickname: "",
      email: currentUserEmail, // Pre-fill with user's actual email!
      role: "",
      bio: "",
      tagline: "",
      skillsString: "",
      badge: "",
      theme: "violet" as const,
      twitter: "",
      github: "",
      website: "",
      avatarBg: "#0f172a",
      avatarFg: "#a78bfa",
      avatarPattern: "dots" as const
    });
    setIsFormOpen(true);
  };

  // Save profile to server
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError("Full Name is required to register.");
      return;
    }
    if (!formData.role.trim()) {
      setFormError("Primary Role or Calling is required.");
      return;
    }
    if (!formData.email.trim()) {
      setFormError("Email Coordinates are required.");
      return;
    }

    try {
      const profileToSave = {
        name: formData.name.trim(),
        nickname: formData.nickname.trim(),
        email: formData.email.trim(),
        role: formData.role.trim(),
        bio: formData.bio.trim(),
        tagline: formData.tagline.trim(),
        skills: formData.skillsString.split(",").map((s) => s.trim()).filter(Boolean),
        badge: formData.badge.trim(),
        theme: formData.theme,
        socials: {
          twitter: formData.twitter.trim(),
          github: formData.github.trim(),
          website: formData.website.trim()
        },
        avatarStyle: {
          bgColor: formData.avatarBg,
          fgColor: formData.avatarFg,
          pattern: formData.avatarPattern
        }
      };

      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileToSave)
      });

      if (!res.ok) throw new Error("Could not register profile.");
      await fetchProfiles();
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Error saving profile configuration.");
    }
  };

  // Handle keydown on inputs to ensure Enter submits the form properly
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      handleSaveProfile();
    }
  };

  // Generate Profile using Gemini API
  const handleAiSynthesize = async () => {
    if (!formData.name || !formData.role) {
      alert("Please provide at least your Name and Role to let Gemini synthesize your profile!");
      return;
    }

    try {
      setGenerating(true);
      const keywordsArray = aiKeywords.split(",").map((k) => k.trim()).filter(Boolean);

      const res = await fetch("/api/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          keywords: keywordsArray,
          vibe
        })
      });

      if (!res.ok) throw new Error("Gemini AI failed to synthesize profile details.");
      const data = await res.json();

      // Update form data with generated values
      setFormData((prev) => ({
        ...prev,
        bio: data.bio,
        tagline: data.tagline,
        skillsString: data.suggestedSkills.join(", "),
        badge: data.badge,
        theme: data.theme
      }));
    } catch (err: any) {
      alert(err.message || "Failed to generate profile with Gemini.");
    } finally {
      setGenerating(false);
    }
  };

  // Check if our current user has a profile already
  const userProfile = profiles.find((p) => p.email.toLowerCase() === currentUserEmail.toLowerCase());

  // Filter profiles
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTheme = themeFilter === "all" || p.theme === themeFilter;

    return matchesSearch && matchesTheme;
  });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-red-950/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Banner */}
      <header className="relative border-b border-red-950 bg-black/80 backdrop-blur-md z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-800 via-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-600/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-red-200 to-rose-600 bg-clip-text text-transparent">
                COSMIC CREATORS
              </h1>
              <p className="text-xs text-slate-400 font-medium">Verified AI Studio Pioneer Directory</p>
            </div>
          </div>

          {/* User Profile Bar */}
          <div className="flex items-center gap-4 bg-neutral-950 border border-red-950 px-4 py-2 rounded-2xl">
            {userProfile ? (
              <div className="flex items-center gap-3">
                <SvgAvatar style={userProfile.avatarStyle} name={userProfile.name} size={36} />
                <div className="text-left">
                  <div className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Recognized: @{userProfile.nickname || "Pioneer"}
                  </div>
                  <div className="text-sm font-bold text-white">{userProfile.name}</div>
                </div>
                <button
                  onClick={() => handleStartEdit(userProfile)}
                  className="ml-2 px-3 py-1 bg-red-950 hover:bg-red-900 text-xs font-semibold rounded-lg text-white border border-red-800/40 transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-slate-300 text-xs font-bold border border-neutral-800">
                  ?
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-semibold">Ready to join, Pioneer?</div>
                  <div className="text-xs font-bold text-slate-300">{currentUserEmail}</div>
                </div>
                <button
                  onClick={handleStartNew}
                  className="ml-2 px-3 py-1 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-xs font-black text-white rounded-lg transition-all shadow-md"
                >
                  Join Directory
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-10 z-10">
        
        {/* Project Selector Tabs & Login Container */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-20">
          {/* Project Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-neutral-950 border border-red-950 rounded-2xl shadow-xl w-fit">
            <button
              onClick={() => setActiveTab("baby-linux")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "baby-linux"
                  ? "bg-gradient-to-r from-red-700 to-rose-600 text-white shadow-lg shadow-red-600/20"
                  : "text-slate-400 hover:text-white hover:bg-neutral-900/40"
              }`}
            >
              <Terminal className="w-4 h-4 text-red-500" />
              👶 Baby Linux Tutor
            </button>
            <button
              onClick={() => setActiveTab("ada-studio")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "ada-studio"
                  ? "bg-gradient-to-r from-red-700 to-rose-600 text-white shadow-lg shadow-red-600/20"
                  : "text-slate-400 hover:text-white hover:bg-neutral-900/40"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              ✨ Ada & Tux Studio
            </button>
            <button
              onClick={() => setActiveTab("live-chat")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "live-chat"
                  ? "bg-gradient-to-r from-red-700 to-rose-600 text-white shadow-lg shadow-red-600/20"
                  : "text-slate-400 hover:text-white hover:bg-neutral-900/40"
              }`}
            >
              <MessageSquare className="w-4 h-4 text-red-500" />
              💬 Baby Live Pioneer Chat Box
            </button>
            <button
              onClick={() => setActiveTab("cosmic-creators")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "cosmic-creators"
                  ? "bg-gradient-to-r from-red-700 to-rose-600 text-white shadow-lg shadow-red-600/20"
                  : "text-slate-400 hover:text-white hover:bg-neutral-900/40"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              🌌 Cosmic Creators Directory
            </button>
          </div>

          {/* Login Button inside its own bordered container */}
          <div className="p-1.5 bg-neutral-950 border border-red-950 rounded-2xl shadow-xl w-fit flex items-center gap-2">
            {authUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-red-900/40 hover:border-red-600 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-emerald-400" />
                  <span className="truncate max-w-[140px]">{authUser.displayName || authUser.email?.split('@')[0]}</span>
                </button>
                <button
                  onClick={() => signOut(auth)}
                  title="Sign Out"
                  className="px-3 py-2.5 bg-red-950/60 hover:bg-red-900 border border-red-900/50 rounded-xl text-xs font-bold text-red-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-red-700 via-red-600 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-red-600/20 border border-red-500/30"
              >
                <LogIn className="w-4 h-4 text-white" />
                Login / Register
              </button>
            )}
          </div>
        </div>

        {activeTab === "live-chat" ? (
          <ChatRoom />
        ) : activeTab === "baby-linux" ? (
          <BabyLinux currentUserEmail={currentUserEmail} nickname={userProfile?.nickname} onProgressUpdate={setSyncedProgress} />
        ) : activeTab === "ada-studio" ? (
          <AdaTuxStudio />
        ) : (
          <>
            {/* Welcome Block / Creator Focus */}
            <div className="relative mb-12 p-8 rounded-3xl bg-gradient-to-r from-black via-zinc-950 to-neutral-950 border border-red-950 overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-red-600/15 via-red-950/5 to-transparent rounded-full blur-3xl pointer-events-none" />

              <div className="max-w-2xl relative">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/30 border border-red-800/30 text-red-500 text-xs font-extrabold tracking-wide uppercase mb-4">
                  <Zap className="w-3.5 h-3.5 animate-bounce" /> Personalized Experience
                </span>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-3">
                  Hello Doc, welcome to your Digital Canvas!
                </h2>
                <p className="text-slate-400 leading-relaxed mb-6">
                  You are recognized as the primary creator of this catalog. We’ve configured a personalized workspace
                  specifically for your Hotmail account (<span className="text-red-500 font-semibold">{currentUserEmail}</span>). Add yourself, customize your aesthetic styles, or use Gemini to synthesise RPG-style developer cards instantly!
                </p>

                <div className="flex flex-wrap gap-3">
                  {userProfile ? (
                    <button
                      onClick={() => handleStartEdit(userProfile)}
                      className="px-5 py-2.5 bg-neutral-900 hover:bg-red-950 border border-red-900/30 hover:border-red-800 rounded-xl font-bold text-white flex items-center gap-2 transition-all"
                    >
                      <Code className="w-4 h-4 text-red-400" />
                      Customize your Card & Avatar
                    </button>
                  ) : (
                    <button
                      onClick={handleStartNew}
                      className="px-6 py-2.5 bg-gradient-to-r from-red-600 via-red-500 to-rose-700 hover:opacity-90 rounded-xl font-black text-white flex items-center gap-2 transition-all shadow-lg shadow-red-600/20"
                    >
                      <Plus className="w-5 h-5" />
                      Put Yourself on the Map
                    </button>
                  )}
                  <a
                    href="#profiles-grid"
                    className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-900 border border-red-950 rounded-xl font-semibold text-slate-400 hover:text-white transition-all flex items-center gap-2"
                  >
                    <Compass className="w-4 h-4" />
                    Explore Creators
                  </a>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div id="profiles-grid" className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-white">Pioneer Directory</h3>
                <p className="text-sm text-slate-500">Discover and spark inspiration across custom profiles</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-grow sm:flex-grow-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, capability, motto..."
                    className="w-full sm:w-64 pl-10 pr-4 py-2 bg-neutral-950 border border-neutral-900 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-600 transition-all"
                  />
                </div>

                {/* Theme Filter */}
                <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-900 px-3 py-1.5 rounded-xl">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <select
                    value={themeFilter}
                    onChange={(e) => setThemeFilter(e.target.value)}
                    className="bg-transparent text-sm text-slate-300 focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="all" className="bg-black text-white">All Themes</option>
                    <option value="slate" className="bg-black text-white">Slate</option>
                    <option value="violet" className="bg-black text-white">Violet</option>
                    <option value="amber" className="bg-black text-white">Amber</option>
                    <option value="emerald" className="bg-black text-white">Emerald</option>
                    <option value="rose" className="bg-black text-white">Rose</option>
                    <option value="sky" className="bg-black text-white">Sky</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Profiles Grid */}
            {loading ? (
              <div className="py-24 text-center">
                <RefreshCw className="w-8 h-8 text-red-500 animate-spin mx-auto mb-4" />
                <p className="text-slate-400 font-medium">Assembling cosmic database...</p>
              </div>
            ) : error ? (
              <div className="py-12 px-6 rounded-2xl border border-red-950 bg-red-950/20 text-center max-w-md mx-auto">
                <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
                <h4 className="font-extrabold text-red-200">Database Sync Error</h4>
                <p className="text-sm text-red-400 mt-1 mb-4">{error}</p>
                <button
                  onClick={fetchProfiles}
                  className="px-4 py-2 bg-red-900/60 hover:bg-red-800 text-white font-semibold text-xs rounded-lg transition-colors"
                >
                  Retry Sync
                </button>
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-red-950/40 rounded-2xl">
                <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="font-bold text-slate-400">No pioneers match your search</h4>
                <p className="text-sm text-slate-500 mt-1">Try tweaking your search term or theme filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProfiles.map((p) => (
                  <ProfileCard
                    key={p.id}
                    profile={p}
                    onSpark={handleSpark}
                    isCurrentUser={p.email.toLowerCase() === currentUserEmail.toLowerCase()}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Profile Form Modal */}
      {isFormOpen && (() => {
        const previewProfile: Profile = {
          id: "preview-id",
          name: formData.name || "Your Name",
          nickname: formData.nickname || "nickname",
          email: formData.email || currentUserEmail,
          role: formData.role || "Your Role or Calling",
          bio: formData.bio || "This is where your bio details will show up. Customize or use Gemini to auto-generate!",
          tagline: formData.tagline || "Your personal tagline goes here.",
          skills: formData.skillsString.split(",").map((s) => s.trim()).filter(Boolean),
          badge: formData.badge || "Pioneer Rank S",
          theme: formData.theme,
          socials: {
            twitter: formData.twitter,
            github: formData.github,
            website: formData.website
          },
          sparks: 42,
          avatarStyle: {
            bgColor: formData.avatarBg,
            fgColor: formData.avatarFg,
            pattern: formData.avatarPattern
          }
        };

        return (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-neutral-950 border border-red-950/70 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-8 flex flex-col lg:flex-row h-full max-h-[90vh]">
              
              {/* Left Column: Form Controls */}
              <div className="flex-grow flex flex-col overflow-y-auto lg:border-r border-red-950/40">
                <div className="bg-gradient-to-r from-black to-neutral-950 px-6 py-4 border-b border-red-950 sticky top-0 z-20 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-extrabold text-white">
                      {formData.email.toLowerCase() === currentUserEmail.toLowerCase()
                        ? "Personalize Your Pioneer Identity"
                        : "Register New Pioneer Profile"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Configure your visual card, links, and design aesthetic</p>
                  </div>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors lg:hidden text-lg p-1"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} className="p-6 space-y-6 flex-grow">
                  {/* Error Banner */}
                  {formError && (
                    <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-white text-sm">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* AI Auto Synthesis Section */}
                  <div className="bg-gradient-to-br from-red-950/25 to-black border border-red-900/30 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1 bg-red-500/20 rounded-md">
                        <Sparkles className="w-4 h-4 text-red-500" />
                      </div>
                      <h4 className="text-sm font-bold text-red-300">Gemini Profile Alchemist</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Provide your Name and Role below, then specify keywords or a vibe to instantly auto-generate an evocative tagline, bio, skill stack, and badge using the Gemini model!
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Keywords / Focus (e.g. cloud, sound art)</label>
                        <input
                          type="text"
                          value={aiKeywords}
                          onChange={(e) => setAiKeywords(e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          placeholder="Specialty coffee, shaders, low-latency"
                          className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Profile Vibe</label>
                        <select
                          value={vibe}
                          onChange={(e) => setVibe(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-600"
                        >
                          <option value="minimalist nomad">Minimalist Nomad</option>
                          <option value="retro cyberpunk">Retro Cyberpunk</option>
                          <option value="solarpunk engineer">Solarpunk Engineer</option>
                          <option value="cosmic technologist">Cosmic Technologist</option>
                          <option value="dark academia scholar">Dark Academia Scholar</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAiSynthesize}
                      disabled={generating || !formData.name || !formData.role}
                      className="w-full py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-950/45 disabled:text-red-800 disabled:border-transparent text-white font-extrabold text-xs rounded-lg border border-red-500/40 transition-all flex items-center justify-center gap-2"
                    >
                      {generating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Synthesizing Profile...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Synthesize Profile with Gemini
                        </>
                      )}
                    </button>
                    {!formData.name || !formData.role ? (
                      <p className="text-[10px] text-center text-red-500/80 mt-1.5">
                        * Fill in Name and Role fields below first to unlock AI synthesis.
                      </p>
                    ) : null}
                  </div>

                  {/* Core Information */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black tracking-widest uppercase text-slate-500 pb-1 border-b border-neutral-900">
                      Core Specifications
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          onKeyDown={handleInputKeyDown}
                          placeholder="Jane Doe"
                          className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Nickname / Handle</label>
                        <input
                          type="text"
                          value={formData.nickname}
                          onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                          onKeyDown={handleInputKeyDown}
                          placeholder="janedev"
                          className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Email Coordinates *</label>
                        <input
                          type="email"
                          readOnly={formData.email.toLowerCase() === currentUserEmail.toLowerCase()}
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          onKeyDown={handleInputKeyDown}
                          className="w-full bg-neutral-950/60 border border-neutral-900 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Primary Role / Calling *</label>
                        <input
                          type="text"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          onKeyDown={handleInputKeyDown}
                          placeholder="UI Engineer / Shaders Specialist"
                          className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bio & Motto */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black tracking-widest uppercase text-slate-500 pb-1 border-b border-neutral-900">
                      Creative Dossier
                    </h4>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Personal Motto / Tagline</label>
                      <input
                        type="text"
                        value={formData.tagline}
                        onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Making the virtual feel tangible, one pixel at a time."
                        className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Bio Description</label>
                      <textarea
                        rows={3}
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Tell your story. Keep it elegant, descriptive, or quirky."
                        className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Capabilities (Comma Separated)</label>
                        <input
                          type="text"
                          value={formData.skillsString}
                          onChange={(e) => setFormData({ ...formData, skillsString: e.target.value })}
                          onKeyDown={handleInputKeyDown}
                          placeholder="React, CSS, Shaders, Web Audio"
                          className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">RPG-Style Badge Title</label>
                        <input
                          type="text"
                          value={formData.badge}
                          onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                          onKeyDown={handleInputKeyDown}
                          placeholder="Pixel Weaver Rank S"
                          className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Theme & Avatar Customizer */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black tracking-widest uppercase text-slate-500 pb-1 border-b border-neutral-900">
                      Visual Customizer
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Theme Select */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Card Accent Theme</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["slate", "violet", "amber", "emerald", "rose", "sky"] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setFormData({ ...formData, theme: t })}
                              className={`py-2 px-3 text-xs font-bold rounded-lg border capitalize transition-all ${
                                formData.theme === t
                                  ? "bg-neutral-900 text-white border-red-600 ring-1 ring-red-600/30"
                                  : "bg-neutral-950 text-slate-400 border-neutral-900 hover:text-white"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dynamic Avatar Creator */}
                      <div className="bg-neutral-950 border border-neutral-900 p-4 rounded-xl flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <SvgAvatar
                            style={{
                              bgColor: formData.avatarBg,
                              fgColor: formData.avatarFg,
                              pattern: formData.avatarPattern
                            }}
                            name={formData.name || "Pioneer"}
                            size={80}
                          />
                        </div>

                        <div className="flex-grow space-y-2">
                          <div className="text-xs font-bold text-slate-400">Sphere Designer</div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 font-medium">Background</label>
                              <input
                                type="color"
                                value={formData.avatarBg}
                                onChange={(e) => setFormData({ ...formData, avatarBg: e.target.value })}
                                className="w-full h-6 rounded cursor-pointer bg-neutral-900 border border-neutral-850"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 font-medium">Foreground</label>
                              <input
                                type="color"
                                value={formData.avatarFg}
                                onChange={(e) => setFormData({ ...formData, avatarFg: e.target.value })}
                                className="w-full h-6 rounded cursor-pointer bg-neutral-900 border border-neutral-850"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-500 font-medium mb-0.5">Pattern Layout</label>
                            <select
                              value={formData.avatarPattern}
                              onChange={(e) =>
                                setFormData({ ...formData, avatarPattern: e.target.value as any })
                              }
                              className="w-full bg-neutral-900 border border-neutral-850 rounded px-2 py-0.5 text-xs text-slate-300 focus:outline-none"
                            >
                              <option value="dots">Dots</option>
                              <option value="grid">Grid</option>
                              <option value="waves">Waves</option>
                              <option value="circles">Circles</option>
                              <option value="triangles">Triangles</option>
                              <option value="crosses">Crosses</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Channels */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black tracking-widest uppercase text-slate-500 pb-1 border-b border-neutral-900">
                      Communications & Social Channels
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">GitHub Username</label>
                        <input
                          type="text"
                          value={formData.github}
                          onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                          onKeyDown={handleInputKeyDown}
                          placeholder="username"
                          className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Twitter Handle</label>
                        <input
                          type="text"
                          value={formData.twitter}
                          onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                          onKeyDown={handleInputKeyDown}
                          placeholder="handle"
                          className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Personal URL</label>
                        <input
                          type="text"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          onKeyDown={handleInputKeyDown}
                          placeholder="example.com"
                          className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit panel */}
                  <div className="pt-4 border-t border-red-950/40 flex items-center justify-end gap-3 sticky bottom-0 bg-neutral-950 pb-2 pt-4 z-15">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="px-4 py-2 bg-neutral-950 hover:bg-neutral-900 border border-red-950 hover:border-red-900 rounded-xl text-slate-400 hover:text-white text-sm font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 font-extrabold text-sm text-white rounded-xl shadow-lg transition-all"
                    >
                      Save Profile Configuration
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Live Interactive Card Preview */}
              <div className="w-full lg:w-[400px] bg-neutral-950 p-6 flex flex-col justify-between border-t lg:border-t-0 border-red-950/40 overflow-y-auto">
                <div className="sticky top-0">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black tracking-widest uppercase text-slate-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Card Preview
                    </span>
                    <button
                      onClick={() => setIsFormOpen(false)}
                      className="hidden lg:block text-slate-400 hover:text-white transition-colors text-lg p-1"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-1.5 bg-neutral-900/40 border border-red-950/40 rounded-2xl">
                    <ProfileCard
                      profile={previewProfile}
                      onSpark={() => {}}
                      isCurrentUser={true}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 text-center mt-4 leading-relaxed">
                    Changes reflect immediately as you modify core coordinates, colors, and badge titles on the left.
                  </p>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Live Push Notification Toasts */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 max-w-sm w-full bg-neutral-950/95 border-2 border-red-600 rounded-2xl shadow-2xl p-4 backdrop-blur-md flex items-start gap-3 outline-none pointer-events-auto"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-600 to-rose-700 flex items-center justify-center font-bold text-white text-base shadow-md animate-bounce flex-shrink-0">
              🍼
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-red-400 tracking-wider uppercase">
                  {showToast.sender}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Just Now</span>
              </div>
              <p className="text-sm font-bold text-white mt-1 leading-snug break-words">
                {showToast.message}
              </p>
              <div className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Phone Synced Alert
              </div>
            </div>
            <button
              onClick={() => setShowToast(null)}
              className="text-slate-500 hover:text-white transition-colors p-1"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Mobile Sync Dock Trigger */}
      <button
        onClick={() => setIsSyncOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 bg-neutral-950/90 border border-red-950 hover:border-red-600 hover:shadow-red-600/10 p-3 px-5 rounded-full flex items-center gap-2.5 shadow-2xl transition-all cursor-pointer group"
        title="Link and Push to Phone"
      >
        <div className="relative">
          <Smartphone className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
          {hasActivePhone ? (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-black animate-ping" />
          ) : (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-black" />
          )}
        </div>
        <div className="text-left hidden sm:block">
          <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase block leading-none">Mobile Link</span>
          <span className="text-xs font-bold text-slate-200 mt-0.5 block leading-none">
            {hasActivePhone ? "Synced 📱" : "Connect Phone"}
          </span>
        </div>
      </button>

      {/* Mobile Sync Drawer / Overlay Modal */}
      <AnimatePresence>
        {isSyncOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-neutral-950 border border-red-950/70 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              {/* Decorative top bar */}
              <div className="h-1.5 bg-gradient-to-r from-red-800 via-red-600 to-rose-700" />
              
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-red-500" />
                    <h3 className="text-lg font-black text-white">MOBILE PUSH SYSTEM</h3>
                  </div>
                  <button
                    onClick={() => setIsSyncOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors text-lg"
                  >
                    ✕
                  </button>
                </div>

                {/* Live Sync Badge Status */}
                <div className="p-4 bg-neutral-950 border border-red-950/40 rounded-2xl flex items-center gap-3.5 mb-6">
                  <div className="relative flex-shrink-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasActivePhone ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-amber-500/10 border border-amber-500/30"}`}>
                      <Smartphone className={`w-6 h-6 ${hasActivePhone ? "text-emerald-400" : "text-amber-400"}`} />
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black ${hasActivePhone ? "bg-emerald-500" : "bg-amber-500"}`} />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Sync Connection Status</div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5 truncate">
                      {hasActivePhone ? "Active Sync Connection Established!" : "Scanning for Phone Device..."}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                      {activeClients} screen{activeClients !== 1 ? "s" : ""} listening on coordinate: {currentUserEmail}
                    </span>
                  </div>
                </div>

                {/* QR Code and Connection Guide */}
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm mx-auto mb-4">
                      Open this interactive sandbox on your phone instantly. Scan the QR code with your phone camera, join, and keep it in your pocket!
                    </p>
                    
                    {/* QR Code rendering */}
                    <div className="inline-block p-4 bg-neutral-950 border border-red-950/40 rounded-2xl shadow-inner mb-4 relative group">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=ef4444&bgcolor=000000&data=${encodeURIComponent(window.location.href)}`}
                        alt="Phone Synchronization QR Code"
                        className="w-48 h-48 rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl pointer-events-none">
                        <span className="text-[10px] font-black text-red-400 tracking-wider uppercase bg-neutral-900 border border-red-950/40 px-3 py-1.5 rounded-full">
                          Scan with Mobile Camera
                        </span>
                      </div>
                    </div>

                    {/* Share Link actions */}
                    <div className="flex gap-2 justify-center mb-6">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          setCopyFeedback(true);
                          setTimeout(() => setCopyFeedback(false), 2000);
                        }}
                        className="px-4 py-2 bg-neutral-950 hover:bg-neutral-900 border border-red-950 hover:border-red-900 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copyFeedback ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied URL!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            Copy Mobile URL
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSoundEnabled((s) => !s)}
                        className="px-4 py-2 bg-neutral-950 hover:bg-neutral-900 border border-red-950 hover:border-red-900 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {soundEnabled ? (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-red-400" />
                            Sound Enabled
                          </>
                        ) : (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                            Muted
                          </>
                        )}
                      </button>
                    </div>
                     {/* Test Command Instructions */}
                  <div className="p-4 bg-neutral-950/60 border border-red-950/40 rounded-2xl space-y-3">
                    <div>
                      <span className="text-[10px] font-black tracking-widest text-red-400 uppercase block mb-1">
                        🚀 Interactive Test Terminal Commands
                      </span>
                      <p className="text-xs text-slate-400 leading-relaxed mb-2">
                        Type these in the Baby Linux terminal to test or clear push alerts:
                      </p>
                      <div className="space-y-1.5 font-mono text-xs">
                        <div className="bg-neutral-950 border border-red-950/40 p-2 rounded-xl text-emerald-400 flex items-center justify-between">
                          <span>push "Hello Phone!"</span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await fetch("/api/push/send", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    message: "🍼 Custom Test Alert! Synced workspace works! ⭐",
                                    email: currentUserEmail,
                                    sender: "Control Center"
                                  })
                                });
                              } catch (e) {
                                // ignore
                              }
                            }}
                            className="text-[10px] font-bold text-red-400 hover:text-white bg-red-600/10 px-2 py-1 rounded border border-red-500/20 transition-colors"
                          >
                            Send Test Push
                          </button>
                        </div>
                        <div className="bg-neutral-950 border border-red-950/40 p-2 rounded-xl text-amber-400 flex items-center justify-between">
                          <span>unpush</span>
                          <button
                            type="button"
                            onClick={() => {
                              setPushNotifications([]);
                              setShowToast(null);
                            }}
                            className="text-[10px] font-bold text-amber-400 hover:text-white bg-amber-600/10 px-2 py-1 rounded border border-amber-500/20 transition-colors"
                          >
                            Clear Queue & Mute
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-red-950/40 text-[11px] text-slate-400 space-y-1">
                      <span className="font-bold text-slate-300 block">🔕 How to "un-push" / block browser notifications:</span>
                      <p className="leading-snug">
                        Click the 🔒 icon in your browser address bar → <strong className="text-slate-200">Site Settings</strong> → Set <strong className="text-slate-200">Notifications</strong> to <strong className="text-slate-200">Block</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Footer credits */}
      <footer className="border-t border-red-950/40 bg-black py-8 text-center mt-auto z-10">
        <p className="text-xs text-slate-600">
          Cosmic Creators Directory — Built with React, Vite, Tailwind CSS & Google Gemini AI API.
        </p>
      </footer>
    </div>
  );
}
