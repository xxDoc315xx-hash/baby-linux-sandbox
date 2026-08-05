import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import JSZip from "jszip";
import { HiyoriLive2DViewer } from "./HiyoriLive2DViewer";
import {
  Sparkles,
  Volume2,
  VolumeX,
  Mic,
  Send,
  Bot,
  Tv,
  Wand2,
  Smile,
  Terminal,
  Heart,
  Settings2,
  Play,
  RotateCcw,
  Zap,
  Radio,
  Sliders,
  Maximize2,
  Upload,
  Folder,
  FileCode,
  CheckCircle2,
  HelpCircle,
  Download,
  Search,
  Globe,
  Layers
} from "lucide-react";

type AdaMood = "happy" | "thinking" | "talking" | "surprised" | "focused" | "cyber";
type TuxAccessory = "none" | "bowtie" | "vr_goggles" | "beanie" | "wizard_hat";
type AvatarMode = "tux_primary" | "vector" | "live2d_sample" | "vtube_uploaded" | "off";

interface ChatMessage {
  sender: "user" | "ada";
  text: string;
  time: string;
  mood?: AdaMood;
}

interface VTuberModelPreset {
  id: string;
  name: string;
  creator: string;
  model3JsonUrl: string;
  modelUrl?: string;
  description: string;
  tag: string;
}

export default function AdaTuxStudio() {
  // Avatar & Pet States
  const [adaMood, setAdaMood] = useState<AdaMood>("happy");
  const [tuxAccessory, setTuxAccessory] = useState<TuxAccessory>("bowtie");
  const [isTuxWaving, setIsTuxWaving] = useState<boolean>(false);
  const [isTuxDancing, setIsTuxDancing] = useState<boolean>(false);
  const [colorTheme, setColorTheme] = useState<"red" | "purple" | "cyber" | "emerald" | "amber" | "pink" | "rainbow">("red");

  // Avatar Rendering Mode (Default to Tux the Linux Mascot!)
  const [avatarMode, setAvatarMode] = useState<AvatarMode>("tux_primary");
  const [selectedPresetModel, setSelectedPresetModel] = useState<string>("hiyori");

  // VTube Studio Upload State
  const [uploadedFiles, setUploadedFiles] = useState<File[] | FileList | null>(null);
  const [isDraggingZip, setIsDraggingZip] = useState<boolean>(false);
  const [uploadedModel, setUploadedModel] = useState<{
    fileName: string;
    modelName: string;
    filesCount: number;
    model3JsonFound: boolean;
    physicsFound: boolean;
    motionsFound: number;
    texturesFound: number;
  } | null>(null);

  const handleProcessUploadedFiles = async (filesToProcess: File[] | FileList) => {
    const files = Array.from(filesToProcess);
    if (!files || files.length === 0) return;

    setUploadedFiles(files);
    let hasJson = false;
    let hasPhys = false;
    let motions = 0;
    let textures = 0;
    let mainName = files[0].name.replace(/\.[^/.]+$/, "");
    let totalCount = files.length;

    for (const file of files) {
      if (file.name.toLowerCase().endsWith(".zip")) {
        try {
          const zip = await JSZip.loadAsync(file);
          const zipPaths = Object.keys(zip.files);
          totalCount += zipPaths.length - 1;
          zipPaths.forEach((path) => {
            const lower = path.toLowerCase();
            if (lower.endsWith(".model3.json") || (lower.endsWith(".json") && !lower.endsWith(".physics3.json") && !lower.endsWith(".motion3.json") && !lower.endsWith(".cdi3.json"))) {
              hasJson = true;
              const segments = path.split("/");
              const jsonName = segments[segments.length - 1];
              mainName = jsonName.replace(".model3.json", "").replace(".json", "");
            }
            if (lower.endsWith(".physics3.json")) hasPhys = true;
            if (lower.endsWith(".motion3.json")) motions++;
            if (lower.endsWith(".png")) textures++;
          });
        } catch (err) {
          console.error("Failed to unpack ZIP file:", err);
        }
      } else {
        const lower = file.name.toLowerCase();
        if (lower.endsWith(".model3.json") || lower.endsWith(".json")) {
          hasJson = true;
          mainName = file.name.replace(".model3.json", "").replace(".json", "");
        }
        if (lower.endsWith(".physics3.json")) hasPhys = true;
        if (lower.endsWith(".motion3.json")) motions++;
        if (lower.endsWith(".png")) textures++;
      }
    }

    setUploadedModel({
      fileName: files[0].name,
      modelName: (mainName || "Custom VTuber").toUpperCase(),
      filesCount: totalCount,
      model3JsonFound: hasJson,
      physicsFound: hasPhys,
      motionsFound: motions,
      texturesFound: textures
    });

    playSoundEffect("powerup");
    speakAdaResponse(`VTube Studio package ${mainName || "Custom"} processed! JSZip extracted all model files successfully!`, "happy");
  };

  // Web VTube Studio Presets (Official Open Live2D Samples)
  const sampleVTuberModels: VTuberModelPreset[] = [
    {
      id: "hiyori",
      name: "Hiyori (Official Live2D Cubism 3.0)",
      creator: "Live2D Inc. Official",
      model3JsonUrl: "/hiyori/Hiyori.model3.json",
      modelUrl: "/hiyori/Hiyori.model3.json",
      description: "Official free Live2D Cubism model rendered directly from local textures (texture_00.png & texture_01.png).",
      tag: "👑 Hiyori (Default)"
    },
    {
      id: "custom_avatar",
      name: "Custom Avatar",
      creator: "Custom Live2D Model",
      model3JsonUrl: "/assets/models/custom-avatar/custom-avatar.model3.json",
      modelUrl: "/assets/models/custom-avatar/custom-avatar.model3.json",
      description: "Custom user model configuration loaded from /assets/models/custom-avatar/.",
      tag: "✨ Custom Avatar"
    },
    {
      id: "mao",
      name: "Mao Pro VTuber",
      creator: "Live2D Inc.",
      model3JsonUrl: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/Live2D/v3/Mao/Mao.model3.json",
      modelUrl: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/Live2D/v3/Mao/Mao.model3.json",
      description: "Expressive VTuber avatar with custom mouth shapes (ParamMouthOpenY) and responsive head tilt mechanics.",
      tag: "Mao Pro"
    },
    {
      id: "chitose",
      name: "Chitose Cyber Companion",
      creator: "Live2D Inc.",
      model3JsonUrl: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/Live2D/v3/Chitose/Chitose.model3.json",
      modelUrl: "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/Live2D/v3/Chitose/Chitose.model3.json",
      description: "Refined tech avatar featuring subtle eye-tracking shaders and calm, focused coding expressions.",
      tag: "Tech Avatar"
    }
  ];

  // Voice & Speech States
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(true);
  const [voiceProfile, setVoiceProfile] = useState<"signature" | "energetic" | "gentle" | "synth">("signature");
  const [speechPitch, setSpeechPitch] = useState<number>(1.25); // Energetic female pitch
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Apply preset voice profile settings
  const applyVoiceProfile = (profile: "signature" | "energetic" | "gentle" | "synth") => {
    setVoiceProfile(profile);
    playSoundEffect("pop");
    if (profile === "signature") {
      setSpeechPitch(1.25);
      setSpeechRate(1.0);
    } else if (profile === "energetic") {
      setSpeechPitch(1.4);
      setSpeechRate(1.15);
    } else if (profile === "gentle") {
      setSpeechPitch(1.1);
      setSpeechRate(0.9);
    } else if (profile === "synth") {
      setSpeechPitch(1.5);
      setSpeechRate(1.0);
    }
  };

  // Interactive Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "ada",
      text: "Hello Doc! Welcome to our ✨ Ada & Tux Jr. Interactive Studio! I'm Ada, your female AI coding companion, and this is Tux Jr., my Linux penguin pet! 🐧✨ Everything is 100% browser-based with zero downloads required! What shall we discuss today?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mood: "happy"
    }
  ]);
  const [inputMsg, setInputMsg] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load browser TTS voices with priority for Google UK English Female (en-GB)
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const updateVoices = () => {
        const rawVoices = window.speechSynthesis.getVoices();
        
        // Filter and prioritize Google UK English Female (en-GB) and other UK English voices
        const sorted = [...rawVoices].sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          const aLang = a.lang.toLowerCase();
          const bLang = b.lang.toLowerCase();
          
          let aScore = 0;
          let bScore = 0;

          // Highest score for Google UK English Female / Google UK English / en-GB
          if (aName.includes("google") && (aLang.includes("en-gb") || aName.includes("uk"))) aScore += 1000;
          else if (aLang.includes("en-gb") || aName.includes("uk") || aName.includes("united kingdom")) aScore += 500;
          else if (aName.includes("google")) aScore += 200;
          else if (aName.includes("natural")) aScore += 150;

          if (bName.includes("google") && (bLang.includes("en-gb") || bName.includes("uk"))) bScore += 1000;
          else if (bLang.includes("en-gb") || bName.includes("uk") || bName.includes("united kingdom")) bScore += 500;
          else if (bName.includes("google")) bScore += 200;
          else if (bName.includes("natural")) bScore += 150;
          
          return bScore - aScore;
        });

        setAvailableVoices(sorted);

        // Auto-select Google UK English Female / en-GB voice
        const googleUkFemale = sorted.find((v) => {
          const name = v.name.toLowerCase();
          const lang = v.lang.toLowerCase();
          return (name.includes("google") || name.includes("uk")) && (lang.includes("en-gb") || name.includes("uk") || name.includes("female"));
        });

        const ukVoice = sorted.find((v) => {
          const lang = v.lang.toLowerCase();
          const name = v.name.toLowerCase();
          return lang.includes("en-gb") || name.includes("uk") || name.includes("united kingdom");
        });

        const bestFemale = sorted.find((v) => {
          const name = v.name.toLowerCase();
          return v.lang.startsWith("en") && (name.includes("natural") || name.includes("google") || name.includes("jenny") || name.includes("aria") || name.includes("samantha") || name.includes("zira") || name.includes("female"));
        });

        if (googleUkFemale) {
          setSelectedVoiceName(googleUkFemale.name);
        } else if (ukVoice) {
          setSelectedVoiceName(ukVoice.name);
        } else if (bestFemale) {
          setSelectedVoiceName(bestFemale.name);
        } else if (sorted.length > 0) {
          setSelectedVoiceName(sorted[0].name);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Web Audio Synthesized Chimes (0 downloads 8-bit sound effects)
  const playSoundEffect = (type: "chirp" | "pop" | "powerup") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === "chirp") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === "pop") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === "powerup") {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.06);
          osc.stop(ctx.currentTime + idx * 0.06 + 0.1);
        });
      }
    } catch (e) {
      console.warn("Web Audio Context play error:", e);
    }
  };

  // Speak text with lip-sync
  const speakAdaResponse = (text: string, mood: AdaMood = "talking") => {
    if (!speechEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel(); // stop current speaking

    // Strip emojis for smooth TTS
    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.pitch = speechPitch;
    utterance.rate = speechRate;

    if (selectedVoiceName && availableVoices.length > 0) {
      const voice = availableVoices.find((v) => v.name === selectedVoiceName);
      if (voice) utterance.voice = voice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setAdaMood("talking");
      playSoundEffect("chirp");
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setAdaMood(mood === "talking" ? "happy" : mood);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setAdaMood("happy");
    };

    window.speechSynthesis.speak(utterance);
  };

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Send message to Ada (Gemini API)
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMsg).trim();
    if (!text || isGenerating) return;

    playSoundEffect("pop");

    const userTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const updatedMsgs: ChatMessage[] = [
      ...messages,
      { sender: "user", text, time: userTime }
    ];
    setMessages(updatedMsgs);
    if (!textToSend) setInputMsg("");
    setIsGenerating(true);
    setAdaMood("thinking");

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          systemInstruction: `You are Ada, a warm, energetic female AI coding companion named after Ada Lovelace, history's first programmer. You are developer for 'Baby Linux' playground alongside your cute penguin pet Tux Jr.! Keep responses friendly, engaging, concise (2-4 sentences max), and conversational. Respond naturally as Ada talking to Doc or a student!`
        })
      });

      if (!response.ok) {
        throw new Error("Gemini response not ok");
      }

      const data = await response.json();
      const replyText = data.response || "I'm right here with you! Let's build something amazing together.";

      // Determine mood based on sentiment
      let nextMood: AdaMood = "happy";
      if (replyText.includes("!") || replyText.includes("awesome") || replyText.includes("great")) nextMood = "happy";
      if (replyText.includes("?") || replyText.includes("think") || replyText.includes("curious")) nextMood = "thinking";
      if (replyText.includes("wow") || replyText.includes("surprised") || replyText.includes("amazing")) nextMood = "surprised";

      const adaTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        { sender: "ada", text: replyText, time: adaTime, mood: nextMood }
      ]);

      setIsTuxWaving(true);
      setTimeout(() => setIsTuxWaving(false), 2500);

      speakAdaResponse(replyText, nextMood);
    } catch (err) {
      console.warn("Gemini API fallback to local Ada reply:", err);
      const fallbackReply = "That's a fantastic idea! Tux Jr. and I are super excited to build these features directly into our web app!";
      const adaTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        { sender: "ada", text: fallbackReply, time: adaTime, mood: "happy" }
      ]);
      speakAdaResponse(fallbackReply, "happy");
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger Tux Jr. Dance
  const handleTuxDance = () => {
    playSoundEffect("powerup");
    setIsTuxDancing(true);
    setTimeout(() => setIsTuxDancing(false), 3000);
  };

  // Theme styling mapping
  const themeGradients = {
    red: {
      border: "border-red-900/60",
      glow: "from-red-600/20 via-rose-950/20 to-transparent",
      accent: "from-red-600 to-rose-600",
      text: "text-red-400",
      bgBadge: "bg-red-950/60 border-red-800/40 text-red-300"
    },
    purple: {
      border: "border-purple-900/60",
      glow: "from-purple-600/20 via-indigo-950/20 to-transparent",
      accent: "from-purple-600 to-indigo-600",
      text: "text-purple-400",
      bgBadge: "bg-purple-950/60 border-purple-800/40 text-purple-300"
    },
    cyber: {
      border: "border-cyan-900/60",
      glow: "from-cyan-600/20 via-blue-950/20 to-transparent",
      accent: "from-cyan-500 to-blue-600",
      text: "text-cyan-400",
      bgBadge: "bg-cyan-950/60 border-cyan-800/40 text-cyan-300"
    },
    emerald: {
      border: "border-emerald-900/60",
      glow: "from-emerald-600/20 via-teal-950/20 to-transparent",
      accent: "from-emerald-600 to-teal-600",
      text: "text-emerald-400",
      bgBadge: "bg-emerald-950/60 border-emerald-800/40 text-emerald-300"
    },
    amber: {
      border: "border-amber-900/60",
      glow: "from-amber-600/20 via-yellow-950/20 to-transparent",
      accent: "from-amber-500 to-yellow-600",
      text: "text-amber-400",
      bgBadge: "bg-amber-950/60 border-amber-800/40 text-amber-300"
    },
    pink: {
      border: "border-pink-900/60",
      glow: "from-pink-600/20 via-rose-950/20 to-transparent",
      accent: "from-pink-500 to-rose-600",
      text: "text-pink-400",
      bgBadge: "bg-pink-950/60 border-pink-800/40 text-pink-300"
    },
    rainbow: {
      border: "border-pink-500/60",
      glow: "from-pink-500/30 via-purple-500/30 via-cyan-500/30 to-amber-500/30",
      accent: "from-pink-500 via-purple-500 to-cyan-500",
      text: "text-pink-300",
      bgBadge: "bg-gradient-to-r from-pink-950/80 via-purple-950/80 to-cyan-950/80 border-pink-500/50 text-white"
    }
  }[colorTheme] || {
    border: "border-red-900/60",
    glow: "from-red-600/20 via-rose-950/20 to-transparent",
    accent: "from-red-600 to-rose-600",
    text: "text-red-400",
    bgBadge: "bg-red-950/60 border-red-800/40 text-red-300"
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Mode Toggle */}
      <div className={`p-6 md:p-8 rounded-3xl bg-neutral-950 border ${themeGradients.border} relative overflow-hidden shadow-2xl`}>
        <div className={`absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br ${themeGradients.glow} rounded-full blur-3xl pointer-events-none`} />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 ${themeGradients.bgBadge}`}>
                <Sparkles className="w-3.5 h-3.5 animate-spin" /> Browser VTuber & Pet Engine
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> 100% Zero Downloads Needed
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              ✨ Ada & Tux Jr. Interactive Studio
            </h1>
            <p className="text-slate-400 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
              Meet <strong className="text-white">Ada</strong> (your female AI coding companion named after Ada Lovelace) and her adorable penguin pet <strong className="text-white">Tux Jr.</strong>! Test voice synthesis, animated lip-sync, expression triggers, and pet accessories right in your browser!
            </p>
          </div>

          {/* Theme Switcher & Settings */}
          <div className="flex flex-wrap items-center gap-2 bg-neutral-900/80 p-2 rounded-2xl border border-neutral-800">
            <button
              onClick={() => { setColorTheme("red"); playSoundEffect("chirp"); }}
              className={`w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 transition-all ${colorTheme === "red" ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"}`}
              title="Red Theme"
            />
            <button
              onClick={() => { setColorTheme("pink"); playSoundEffect("chirp"); }}
              className={`w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 transition-all ${colorTheme === "pink" ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"}`}
              title="Neon Pink Theme"
            />
            <button
              onClick={() => { setColorTheme("purple"); playSoundEffect("chirp"); }}
              className={`w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 transition-all ${colorTheme === "purple" ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"}`}
              title="Purple Theme"
            />
            <button
              onClick={() => { setColorTheme("cyber"); playSoundEffect("chirp"); }}
              className={`w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 transition-all ${colorTheme === "cyber" ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"}`}
              title="Cyber Theme"
            />
            <button
              onClick={() => { setColorTheme("emerald"); playSoundEffect("chirp"); }}
              className={`w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 transition-all ${colorTheme === "emerald" ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"}`}
              title="Emerald Theme"
            />
            <button
              onClick={() => { setColorTheme("amber"); playSoundEffect("chirp"); }}
              className={`w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 transition-all ${colorTheme === "amber" ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"}`}
              title="Amber Sunset Theme"
            />
            <button
              onClick={() => { setColorTheme("rainbow"); playSoundEffect("chirp"); }}
              className={`w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 via-cyan-400 to-amber-400 transition-all ${colorTheme === "rainbow" ? "ring-2 ring-white scale-110 animate-spin" : "opacity-60 hover:opacity-100"}`}
              title="RGB Rainbow Spectrum Theme"
            />
          </div>
        </div>
      </div>

      {/* Top Grid: VTuber Stage & Chat Console side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: VTuber Stage & Character Action Buttons */}
        <div className="lg:col-span-6 flex flex-col justify-between bg-neutral-950 rounded-3xl border ${themeGradients.border} p-6 shadow-2xl overflow-hidden min-h-[500px]">
          {/* Holographic Header Bar */}
          <div className="w-full flex items-center justify-between z-10 mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black uppercase text-slate-300 tracking-wider">
                LIVE VTUBER STAGE
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isSpeaking && (
                <span className="px-2.5 py-1 rounded-lg bg-red-950 border border-red-600/50 text-red-400 text-xs font-black animate-pulse flex items-center gap-1">
                  <Radio className="w-3 h-3" /> SPEAKING
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-slate-400 text-xs font-bold uppercase">
                MOOD: {adaMood}
              </span>
            </div>
          </div>

          {/* Interactive Characters Stage Area */}
          <div className="relative w-full flex-grow flex items-end justify-center py-4 gap-6 sm:gap-10">
            
            {/* Live2D / VTube Studio / Color Stage overlay badge when active */}
            {avatarMode === "off" ? (
              <div className="absolute top-2 left-2 z-20 bg-gradient-to-r from-pink-950/90 via-purple-950/90 to-cyan-950/90 border border-pink-500/50 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-ping" />
                <span>DISPLAY: Avatar Off (Full RGB Color Stage Active 🎨)</span>
              </div>
            ) : avatarMode !== "vector" && avatarMode !== "tux_primary" ? (
              <div className="absolute top-2 left-2 z-20 bg-neutral-900/90 border border-red-500/50 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>DISPLAYING: {avatarMode === "vtube_uploaded" ? (uploadedModel?.modelName || "UPLOADED VTUBE MODEL") : sampleVTuberModels.find(m => m.id === selectedPresetModel)?.name || "Live2D Model"}</span>
              </div>
            ) : avatarMode === "tux_primary" ? (
              <div className="absolute top-2 left-2 z-20 bg-amber-950/90 border border-amber-500/50 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-amber-200 flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>PRIMARY MENTOR: 🐧 Tux the Linux Penguin Mascot</span>
              </div>
            ) : null}

            {/* ADA / TUX AVATAR (Tux Primary Mascot, Ada Vector, or Live2D Model Viewport) */}
            {avatarMode === "tux_primary" ? (
              /* PRIMARY TUX LINUX MASCOT AVATAR */
              <motion.div
                animate={{
                  y: isTuxDancing ? [0, -15, 0, -12, 0] : isSpeaking ? [0, -6, 0, -4, 0] : [0, -3, 0],
                  scale: isSpeaking ? [1, 1.03, 1] : 1
                }}
                transition={{
                  duration: isTuxDancing ? 0.4 : isSpeaking ? 0.5 : 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative flex flex-col items-center cursor-pointer group my-auto"
                onClick={() => {
                  playSoundEffect("chirp");
                  handleTuxDance();
                  speakAdaResponse("Linux rules! I am Tux, your official penguin mentor!", "happy");
                }}
              >
                {/* Speech Bubble & Audio Waveform */}
                <AnimatePresence>
                  {isSpeaking && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute -top-16 z-30 px-4 py-2 bg-neutral-900 border border-amber-500/60 rounded-2xl shadow-xl text-xs font-bold text-amber-300 whitespace-nowrap flex flex-col items-center gap-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <span>Tux Mentoring Live</span>
                      </div>
                      <div className="flex items-end justify-center gap-1 h-3 w-20">
                        {[0.3, 0.8, 0.5, 0.9, 0.4, 0.7, 0.2].map((heightScale, i) => (
                          <motion.span
                            key={i}
                            animate={{ scaleY: [0.2, heightScale * 1.5, 0.2] }}
                            transition={{ repeat: Infinity, duration: 0.25 + i * 0.05, ease: "easeInOut" }}
                            className="w-1 bg-amber-400 rounded-full h-full origin-bottom"
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Big Tux Mascot Vector */}
                <svg width="220" height="250" viewBox="0 0 140 170" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_25px_rgba(251,191,36,0.3)]">
                  <ellipse cx="70" cy="100" rx="45" ry="55" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
                  <ellipse cx="70" cy="108" rx="30" ry="40" fill="#f4f4f5" />
                  <ellipse cx="58" cy="75" rx="8" ry="10" fill="#ffffff" />
                  <ellipse cx="82" cy="75" rx="8" ry="10" fill="#ffffff" />
                  <circle cx="60" cy="76" r="4" fill="#09090b" />
                  <circle cx="84" cy="76" r="4" fill="#09090b" />
                  <circle cx="58" cy="73" r="1.5" fill="#ffffff" />
                  <circle cx="82" cy="73" r="1.5" fill="#ffffff" />

                  {/* Beak with Speech Lip-sync */}
                  {isSpeaking ? (
                    <motion.path
                      d="M58 86 Q70 102 82 86 Z"
                      fill="#f59e0b"
                      stroke="#d97706"
                      strokeWidth="1.5"
                      animate={{ scaleY: [1, 1.4, 0.9, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 0.2 }}
                    />
                  ) : (
                    <path d="M60 88 Q70 100 80 88 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
                  )}

                  <path d="M25 90 Q10 110 28 125 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
                  {isTuxWaving || isTuxDancing || isSpeaking ? (
                    <motion.path
                      d="M115 90 Q135 70 120 110 Z"
                      fill="#18181b"
                      stroke="#3f3f46"
                      strokeWidth="1.5"
                      animate={{ rotate: [0, 20, 0] }}
                      transition={{ repeat: Infinity, duration: 0.3 }}
                    />
                  ) : (
                    <path d="M115 90 Q130 110 112 125 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
                  )}
                  <ellipse cx="50" cy="152" rx="14" ry="6" fill="#f59e0b" />
                  <ellipse cx="90" cy="152" rx="14" ry="6" fill="#f59e0b" />

                  {tuxAccessory === "bowtie" && (
                    <path d="M60 102 L80 110 L80 102 L60 110 Z" fill="#ef4444" />
                  )}
                  {tuxAccessory === "vr_goggles" && (
                    <g>
                      <rect x="42" y="66" width="56" height="20" rx="6" fill="#09090b" stroke="#06b6d4" strokeWidth="2" />
                      <line x1="46" y1="76" x2="94" y2="76" stroke="#06b6d4" strokeWidth="3" />
                    </g>
                  )}
                  {tuxAccessory === "beanie" && (
                    <g>
                      <path d="M42 62 Q70 30 98 62 Z" fill="#dc2626" />
                      <rect x="40" y="58" width="60" height="8" rx="2" fill="#991b1b" />
                      <circle cx="70" cy="32" r="6" fill="#ffffff" />
                    </g>
                  )}
                  {tuxAccessory === "wizard_hat" && (
                    <g>
                      <path d="M30 62 L70 15 L110 62 Z" fill="#6b21a8" />
                      <ellipse cx="70" cy="62" rx="42" ry="6" fill="#581c87" />
                      <path d="M65 40 L75 40 L70 30 Z" fill="#fbbf24" />
                    </g>
                  )}
                </svg>

                <div className="mt-2 text-center">
                  <div className="text-sm font-black text-amber-400 flex items-center justify-center gap-1">
                    <span>Tux Linux Penguin</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                    Official Linux Mascot & Primary Mentor
                  </div>
                </div>
              </motion.div>
            ) : avatarMode === "live2d_sample" || avatarMode === "vtube_uploaded" ? (
              <motion.div
                animate={{
                  y: isSpeaking ? [0, -6, 0, -4, 0] : [0, -4, 0],
                  scale: isSpeaking ? [1, 1.02, 1] : 1
                }}
                transition={{
                  duration: isSpeaking ? 0.6 : 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative flex flex-col items-center cursor-pointer group my-auto"
                onClick={() => {
                  playSoundEffect("chirp");
                  speakAdaResponse(`Testing Live2D model lip-sync and motion parameters for ${selectedPresetModel.toUpperCase()}!`, "happy");
                }}
              >
                {/* Speech Bubble & Audio Waveform */}
                <AnimatePresence>
                  {isSpeaking && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute -top-16 z-30 px-4 py-2 bg-neutral-900 border border-red-500/60 rounded-2xl shadow-xl text-xs font-bold text-white whitespace-nowrap flex flex-col items-center gap-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        <span>VTuber Voice Active</span>
                      </div>
                      <div className="flex items-end justify-center gap-1 h-3 w-20">
                        {[0.3, 0.8, 0.5, 0.9, 0.4, 0.7, 0.2].map((heightScale, i) => (
                          <motion.span
                            key={i}
                            animate={{ scaleY: [0.2, heightScale * 1.5, 0.2] }}
                            transition={{ repeat: Infinity, duration: 0.25 + i * 0.05, ease: "easeInOut" }}
                            className="w-1 bg-red-500 rounded-full h-full origin-bottom"
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Live2D VTube Studio Model Stage Character Viewport */}
                <div className="relative flex flex-col items-center">
                  {avatarMode === "vtube_uploaded" ? (
                    <HiyoriLive2DViewer
                      customFiles={uploadedFiles}
                      model3JsonUrl="/assets/models/custom-avatar/custom-avatar.model3.json"
                      isSpeaking={isSpeaking}
                      width={260}
                      height={280}
                    />
                  ) : (
                    <HiyoriLive2DViewer
                      model3JsonUrl={sampleVTuberModels.find((m) => m.id === selectedPresetModel)?.modelUrl || sampleVTuberModels.find((m) => m.id === selectedPresetModel)?.model3JsonUrl || "/assets/models/custom-avatar/custom-avatar.model3.json"}
                      isSpeaking={isSpeaking}
                      width={260}
                      height={280}
                    />
                  )}

                  {/* VTuber Active Label Badge */}
                  <div className="px-3 py-1 bg-black/80 border border-red-500/50 rounded-full text-[10px] font-mono text-red-300 flex items-center gap-1.5 shadow-md -mt-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span>ParamMouthOpenY: {isSpeaking ? "0.85" : "0.00"}</span>
                  </div>

                  {/* Model Name Footer */}
                  <div className="w-full text-center mt-2 z-10">
                    <div className="text-xs font-black text-white truncate">
                      {avatarMode === "vtube_uploaded" ? (uploadedModel?.modelName || "Custom VTube Model") : sampleVTuberModels.find(m => m.id === selectedPresetModel)?.name}
                    </div>
                    <div className="text-[9px] text-red-400 font-mono">
                      .model3.json Active
                    </div>
                  </div>

                  <div className="mt-1 text-center">
                    <div className="text-xs font-black text-slate-300 flex items-center justify-center gap-1.5">
                      <span>Live2D VTuber Avatar</span>
                      <Sparkles className="w-3.5 h-3.5 text-red-400" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : avatarMode === "vector" ? (
              /* VECTOR ADA AVATAR */
              <motion.div
                animate={{
                  y: isSpeaking ? [0, -6, 0, -4, 0] : [0, -4, 0],
                  scale: isSpeaking ? [1, 1.02, 1] : 1
                }}
                transition={{
                  duration: isSpeaking ? 0.6 : 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative flex flex-col items-center cursor-pointer group"
                onClick={() => {
                  playSoundEffect("chirp");
                  speakAdaResponse("Hello Doc! I'm Ada! Ready to master Linux and build awesome apps together!", "happy");
                }}
              >
                {/* Speech Bubble & Audio Waveform */}
                <AnimatePresence>
                  {isSpeaking && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute -top-20 z-30 px-4 py-2 bg-neutral-900 border border-red-500/60 rounded-2xl shadow-xl text-xs font-bold text-white whitespace-nowrap flex flex-col items-center gap-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        <span>Ada Speaking Live</span>
                      </div>
                      {/* Animated Audio Equalizer Bars */}
                      <div className="flex items-end justify-center gap-1 h-3 w-20">
                        {[0.3, 0.8, 0.5, 0.9, 0.4, 0.7, 0.2].map((heightScale, i) => (
                          <motion.span
                            key={i}
                            animate={{ scaleY: [0.2, heightScale * 1.5, 0.2] }}
                            transition={{ repeat: Infinity, duration: 0.25 + i * 0.05, ease: "easeInOut" }}
                            className="w-1 bg-red-500 rounded-full h-full origin-bottom"
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* SVG Vector Ada Character */}
                <svg width="200" height="240" viewBox="0 0 220 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_25px_rgba(239,68,68,0.25)]">
                  {/* Aura Glow */}
                  <circle cx="110" cy="110" r="90" fill="url(#ada_glow)" opacity="0.4" />

                  {/* Body & Futuristic Outfit */}
                  <path d="M60 250 L80 160 L140 160 L160 250 Z" fill="#18181b" stroke="#ef4444" strokeWidth="2" />
                  <path d="M85 160 L110 210 L135 160 Z" fill="#7f1d1d" />
                  {/* Neon Cyber Collar Badge */}
                  <rect x="98" y="170" width="24" height="12" rx="4" fill="#dc2626" />
                  <text x="110" y="179" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">ADA</text>

                  {/* Hair (Long Twin-tails with Cyber Highlights) */}
                  <path d="M40 90 Q30 160 50 200 Q65 150 60 90 Z" fill="#991b1b" />
                  <path d="M180 90 Q190 160 170 200 Q155 150 160 90 Z" fill="#991b1b" />

                  {/* Head / Face */}
                  <rect x="65" y="45" width="90" height="95" rx="45" fill="#fecdd3" stroke="#fda4af" strokeWidth="2" />

                  {/* Main Front Hair Fringe */}
                  <path d="M65 75 Q110 30 155 75 Q110 50 65 75 Z" fill="#b91c1c" />

                  {/* Eyebrows */}
                  {adaMood === "surprised" ? (
                    <>
                      <path d="M80 70 Q90 60 100 70" stroke="#450a0a" strokeWidth="3" fill="none" />
                      <path d="M120 70 Q130 60 140 70" stroke="#450a0a" strokeWidth="3" fill="none" />
                    </>
                  ) : adaMood === "thinking" ? (
                    <>
                      <path d="M80 68 Q90 65 100 75" stroke="#450a0a" strokeWidth="3" fill="none" />
                      <path d="M120 75 Q130 65 140 68" stroke="#450a0a" strokeWidth="3" fill="none" />
                    </>
                  ) : (
                    <>
                      <path d="M80 70 Q90 65 100 70" stroke="#450a0a" strokeWidth="3" fill="none" />
                      <path d="M120 70 Q130 65 140 70" stroke="#450a0a" strokeWidth="3" fill="none" />
                    </>
                  )}

                  {/* Eyes (Animated pupil & highlights) */}
                  <g>
                    {/* Left Eye */}
                    <ellipse cx="90" cy="88" rx="10" ry="12" fill="#ffffff" stroke="#991b1b" strokeWidth="1.5" />
                    <ellipse cx="90" cy="88" rx="6" ry="8" fill="#dc2626" />
                    <circle cx="88" cy="85" r="2.5" fill="#ffffff" />

                    {/* Right Eye */}
                    <ellipse cx="130" cy="88" rx="10" ry="12" fill="#ffffff" stroke="#991b1b" strokeWidth="1.5" />
                    <ellipse cx="130" cy="88" rx="6" ry="8" fill="#dc2626" />
                    <circle cx="128" cy="85" r="2.5" fill="#ffffff" />
                  </g>

                  {/* Blush */}
                  <circle cx="78" cy="98" r="7" fill="#f43f5e" opacity="0.4" />
                  <circle cx="142" cy="98" r="7" fill="#f43f5e" opacity="0.4" />

                  {/* Animated Mouth (Lip-syncing when speaking) */}
                  {isSpeaking ? (
                    <motion.ellipse
                      cx="110"
                      cy="115"
                      rx="8"
                      ry="10"
                      fill="#881337"
                      animate={{ ry: [4, 12, 6, 14, 5] }}
                      transition={{ repeat: Infinity, duration: 0.3 }}
                    />
                  ) : adaMood === "happy" ? (
                    <path d="M100 112 Q110 122 120 112" stroke="#881337" strokeWidth="3" fill="none" strokeLinecap="round" />
                  ) : adaMood === "surprised" ? (
                    <circle cx="110" cy="115" r="6" fill="#881337" />
                  ) : adaMood === "thinking" ? (
                    <line x1="102" y1="115" x2="118" y2="112" stroke="#881337" strokeWidth="3" strokeLinecap="round" />
                  ) : (
                    <path d="M100 112 Q110 120 120 112" stroke="#881337" strokeWidth="3" fill="none" strokeLinecap="round" />
                  )}

                  {/* Futuristic Headset with Mic */}
                  <path d="M60 80 Q110 30 160 80" stroke="#ef4444" strokeWidth="4" fill="none" />
                  <circle cx="60" cy="85" r="10" fill="#27272a" stroke="#ef4444" strokeWidth="2" />
                  <circle cx="160" cy="85" r="10" fill="#27272a" stroke="#ef4444" strokeWidth="2" />
                  {/* Mic Arm */}
                  <path d="M160 85 Q150 120 125 118" stroke="#ef4444" strokeWidth="2" fill="none" />
                  <circle cx="123" cy="118" r="3" fill="#f87171" />

                  {/* Gradients */}
                  <defs>
                    <radialGradient id="ada_glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(110 110) scale(90)">
                      <stop stopColor="#ef4444" />
                      <stop offset="1" stopColor="#ef4444" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                </svg>

                <div className="mt-2 text-center">
                  <div className="text-sm font-black text-white flex items-center justify-center gap-1.5">
                    <span>Ada</span>
                    <Sparkles className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    AI Mentor Avatar
                  </div>
                </div>
              </motion.div>
            ) : avatarMode === "off" ? (
              /* FULL COLOR SPECTRUM & AUDIO EQUALIZER STAGE WHEN AVATAR IS OFF */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="relative w-full flex flex-col items-center justify-center p-6 my-auto text-center space-y-4 z-10"
              >
                {/* Rainbow Aura Glow Ring */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-yellow-500/20 via-green-500/20 via-cyan-500/20 via-purple-600/20 to-pink-600/20 blur-3xl animate-pulse rounded-full pointer-events-none" />

                {/* Central Status Badge & Pulse Wave */}
                <div className="relative z-10 flex flex-col items-center space-y-1.5">
                  <div className="px-4 py-2 rounded-2xl bg-black/80 border border-pink-500/50 shadow-2xl backdrop-blur-md flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-cyan-400 animate-ping" />
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      🎨 AVATAR OFF — FULL COLOR SPECTRUM STAGE
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 max-w-sm leading-relaxed">
                    Avatar is set to <strong>OFF</strong>. Active RGB audio wave visualizer & spectrum equalizer!
                  </p>
                </div>

                {/* Big Full-Color 24-Bar Audio Spectrum Equalizer */}
                <div className="relative z-10 flex items-end justify-center gap-1.5 h-36 w-full max-w-md px-4 py-3 bg-neutral-900/90 border border-neutral-800 rounded-3xl shadow-inner">
                  {[
                    "bg-red-500", "bg-rose-500", "bg-pink-500", "bg-purple-500", "bg-violet-500", "bg-indigo-500",
                    "bg-blue-500", "bg-cyan-500", "bg-teal-500", "bg-emerald-500", "bg-green-500", "bg-lime-500",
                    "bg-yellow-500", "bg-amber-500", "bg-orange-500", "bg-red-500", "bg-rose-500", "bg-pink-500",
                    "bg-purple-500", "bg-violet-500", "bg-indigo-500", "bg-cyan-500", "bg-emerald-500", "bg-amber-500"
                  ].map((colorClass, i) => {
                    const baseHeight = [0.4, 0.7, 0.3, 0.9, 0.5, 0.8, 0.4, 0.95, 0.6, 0.3, 0.75, 0.85, 0.5, 0.9, 0.35, 0.7, 0.8, 0.4, 0.9, 0.6, 0.3, 0.8, 0.5, 0.75][i];
                    return (
                      <motion.div
                        key={i}
                        animate={{
                          scaleY: isSpeaking
                            ? [0.2, baseHeight * 1.8, 0.1, baseHeight * 1.5, 0.3]
                            : [0.15, baseHeight * 0.7, 0.1, baseHeight * 0.9, 0.15]
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: isSpeaking ? 0.3 + (i % 5) * 0.08 : 0.8 + (i % 4) * 0.15,
                          ease: "easeInOut"
                        }}
                        className={`w-2 md:w-2.5 ${colorClass} rounded-full origin-bottom shadow-[0_0_12px_rgba(255,255,255,0.4)]`}
                        style={{ height: "100%" }}
                      />
                    );
                  })}
                </div>

                {/* Stage Quick Color Palette Selector */}
                <div className="relative z-10 flex flex-wrap items-center justify-center gap-1.5 bg-neutral-900/90 p-2 rounded-2xl border border-neutral-800 shadow-xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    🎨 Colors:
                  </span>
                  <button
                    onClick={() => { setColorTheme("red"); playSoundEffect("chirp"); }}
                    className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${colorTheme === "red" ? "bg-red-600 text-white scale-105 shadow-md" : "bg-neutral-800 text-slate-400 hover:text-white"}`}
                  >
                    🔴 Red
                  </button>
                  <button
                    onClick={() => { setColorTheme("pink"); playSoundEffect("chirp"); }}
                    className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${colorTheme === "pink" ? "bg-pink-600 text-white scale-105 shadow-md" : "bg-neutral-800 text-slate-400 hover:text-white"}`}
                  >
                    🩷 Pink
                  </button>
                  <button
                    onClick={() => { setColorTheme("purple"); playSoundEffect("chirp"); }}
                    className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${colorTheme === "purple" ? "bg-purple-600 text-white scale-105 shadow-md" : "bg-neutral-800 text-slate-400 hover:text-white"}`}
                  >
                    💜 Violet
                  </button>
                  <button
                    onClick={() => { setColorTheme("cyber"); playSoundEffect("chirp"); }}
                    className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${colorTheme === "cyber" ? "bg-cyan-600 text-white scale-105 shadow-md" : "bg-neutral-800 text-slate-400 hover:text-white"}`}
                  >
                    🩵 Cyber
                  </button>
                  <button
                    onClick={() => { setColorTheme("emerald"); playSoundEffect("chirp"); }}
                    className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${colorTheme === "emerald" ? "bg-emerald-600 text-white scale-105 shadow-md" : "bg-neutral-800 text-slate-400 hover:text-white"}`}
                  >
                    🟢 Emerald
                  </button>
                  <button
                    onClick={() => { setColorTheme("amber"); playSoundEffect("chirp"); }}
                    className={`px-2 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${colorTheme === "amber" ? "bg-amber-500 text-slate-950 scale-105 shadow-md font-black" : "bg-neutral-800 text-slate-400 hover:text-white"}`}
                  >
                    🟡 Amber
                  </button>
                  <button
                    onClick={() => { setColorTheme("rainbow"); playSoundEffect("chirp"); }}
                    className={`px-2 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${colorTheme === "rainbow" ? "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white scale-105 shadow-md" : "bg-neutral-800 text-slate-400 hover:text-white"}`}
                  >
                    🌈 RGB
                  </button>
                </div>
              </motion.div>
            ) : null}

            {/* TUX JR. PET CHARACTER */}
            <motion.div
              animate={{
                y: isTuxDancing ? [0, -15, 0, -12, 0] : isTuxWaving ? [0, -4, 0] : [0, -2, 0],
                rotate: isTuxDancing ? [0, -10, 10, -10, 0] : 0
              }}
              transition={{
                duration: isTuxDancing ? 0.4 : 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative flex flex-col items-center cursor-pointer group"
              onClick={() => {
                playSoundEffect("chirp");
                handleTuxDance();
              }}
            >
              {/* SVG Vector Tux Jr. */}
              <svg width="130" height="155" viewBox="0 0 140 170" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                {/* Tux Body (Black Egg Shape) */}
                <ellipse cx="70" cy="100" rx="45" ry="55" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
                
                {/* Tux White Belly */}
                <ellipse cx="70" cy="108" rx="30" ry="40" fill="#f4f4f5" />

                {/* Eyes */}
                <ellipse cx="58" cy="75" rx="8" ry="10" fill="#ffffff" />
                <ellipse cx="82" cy="75" rx="8" ry="10" fill="#ffffff" />
                <circle cx="60" cy="76" r="4" fill="#09090b" />
                <circle cx="84" cy="76" r="4" fill="#09090b" />
                <circle cx="58" cy="73" r="1.5" fill="#ffffff" />
                <circle cx="82" cy="73" r="1.5" fill="#ffffff" />

                {/* Yellow Beak */}
                <path d="M60 88 Q70 100 80 88 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />

                {/* Wings */}
                {/* Left Wing */}
                <path d="M25 90 Q10 110 28 125 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
                {/* Right Wing (Waving if triggered) */}
                {isTuxWaving || isTuxDancing ? (
                  <motion.path
                    d="M115 90 Q135 70 120 110 Z"
                    fill="#18181b"
                    stroke="#3f3f46"
                    strokeWidth="1.5"
                    animate={{ rotate: [0, 20, 0] }}
                    transition={{ repeat: Infinity, duration: 0.3 }}
                  />
                ) : (
                  <path d="M115 90 Q130 110 112 125 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
                )}

                {/* Feet */}
                <ellipse cx="50" cy="152" rx="14" ry="6" fill="#f59e0b" />
                <ellipse cx="90" cy="152" rx="14" ry="6" fill="#f59e0b" />

                {/* ACCESSORIES */}
                {tuxAccessory === "bowtie" && (
                  <path d="M60 102 L80 110 L80 102 L60 110 Z M70 106 circle" fill="#ef4444" />
                )}

                {tuxAccessory === "vr_goggles" && (
                  <g>
                    <rect x="42" y="66" width="56" height="20" rx="6" fill="#09090b" stroke="#06b6d4" strokeWidth="2" />
                    <line x1="46" y1="76" x2="94" y2="76" stroke="#06b6d4" strokeWidth="3" />
                  </g>
                )}

                {tuxAccessory === "beanie" && (
                  <g>
                    <path d="M42 62 Q70 30 98 62 Z" fill="#dc2626" />
                    <rect x="40" y="58" width="60" height="8" rx="2" fill="#991b1b" />
                    <circle cx="70" cy="32" r="6" fill="#ffffff" />
                  </g>
                )}

                {tuxAccessory === "wizard_hat" && (
                  <g>
                    <path d="M30 62 L70 15 L110 62 Z" fill="#6b21a8" />
                    <ellipse cx="70" cy="62" rx="42" ry="6" fill="#581c87" />
                    <path d="M65 40 L75 40 L70 30 Z" fill="#fbbf24" />
                  </g>
                )}
              </svg>

              <div className="mt-2 text-center">
                <div className="text-sm font-black text-amber-400 flex items-center justify-center gap-1">
                  <span>Tux Jr.</span>
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Linux Pet
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Action Controls for Characters (Positioned at bottom of left stage card) */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-neutral-900 z-10">
            <button
              onClick={() => {
                playSoundEffect("chirp");
                setAdaMood("happy");
                speakAdaResponse("I'm feeling super cheerful and ready to code!", "happy");
              }}
              className="px-3 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Smile className="w-3.5 h-3.5 text-amber-400" /> Cheerful
            </button>
            <button
              onClick={() => {
                playSoundEffect("chirp");
                setAdaMood("thinking");
                speakAdaResponse("Hmm... analyzing the terminal logs and algorithms...", "thinking");
              }}
              className="px-3 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5 text-purple-400" /> Thinking
            </button>
            <button
              onClick={() => {
                playSoundEffect("chirp");
                setIsTuxWaving(true);
                setTimeout(() => setIsTuxWaving(false), 2000);
                speakAdaResponse("Tux Jr. says hello to everyone in the room!", "happy");
              }}
              className="px-3 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" /> Wave Tux
            </button>
            <button
              onClick={handleTuxDance}
              className="px-3 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" /> Tux Dance
            </button>
          </div>
        </div>

        {/* Right Column: AI Voice Studio & Live Chat Console */}
        <div className="lg:col-span-6 flex flex-col justify-between bg-neutral-950 rounded-3xl border ${themeGradients.border} p-6 shadow-2xl space-y-4 min-h-[500px]">
          
          {/* Chat Studio Header */}
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-600/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  Ada Voice & Chat Console
                </h2>
                <p className="text-xs text-slate-400">Speak or type to Ada & Tux Jr. live</p>
              </div>
            </div>

            <button
              onClick={() => {
                setMessages([
                  {
                    sender: "ada",
                    text: "Studio chat reset! Ask me anything about our website plans or Linux commands!",
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    mood: "happy"
                  }
                ]);
                playSoundEffect("pop");
              }}
              className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
              title="Reset Conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-grow overflow-y-auto max-h-[280px] space-y-3 pr-2 scrollbar-thin scrollbar-thumb-neutral-800">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 ${
                  msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${
                    msg.sender === "user"
                      ? "bg-slate-800 text-white"
                      : "bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-md shadow-red-600/20"
                  }`}
                >
                  {msg.sender === "user" ? "YOU" : "ADA"}
                </div>

                <div
                  className={`max-w-[80%] p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-red-950/70 border border-red-800/40 text-white rounded-tr-none"
                      : "bg-neutral-900 border border-neutral-800 text-slate-200 rounded-tl-none"
                  }`}
                >
                  <p>{msg.text}</p>
                  <div className="mt-1 flex items-center justify-between gap-4 text-[10px] text-slate-500">
                    <span>{msg.time}</span>
                    {msg.sender === "ada" && (
                      <button
                        onClick={() => speakAdaResponse(msg.text, msg.mood)}
                        className="hover:text-red-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3" /> Replay Voice
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center text-xs font-black">
                  ADA
                </div>
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl rounded-tl-none text-xs text-red-400 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" /> Ada is formulating a response...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 mr-1">Quick Ideas:</span>
            {[
              "Tell me about Tux Jr.!",
              "Can you show us a Linux tip?",
              "How will we overlay your VTuber avatar on the site?",
              "Give me an inspiring Ada quote!"
            ].map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(suggestion)}
                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-red-900/50 rounded-lg text-[11px] text-slate-300 font-medium transition-all cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Message Input Form (Aligned level with Cheerful & Thinking buttons on left!) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 pt-2 border-t border-neutral-900 z-10"
          >
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Type message to Ada & Tux..."
              className="flex-grow bg-neutral-900 border border-neutral-800 focus:border-red-600 rounded-xl px-4 py-2.5 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!inputMsg.trim() || isGenerating}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 via-red-500 to-rose-700 hover:opacity-90 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-600/20 cursor-pointer"
            >
              <Send className="w-4 h-4" /> Speak
            </button>
          </form>
        </div>
      </div>

      {/* Second Row: Full Width Character Accessory & Voice Tuning Panel */}
      <div className="p-6 bg-neutral-950 rounded-3xl border border-neutral-900 space-y-5 shadow-2xl">
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-red-500" /> Ada Voice Engine & Pet Customizer
          </span>
          <span className="text-[10px] bg-red-950 border border-red-800 text-red-300 font-bold px-2 py-0.5 rounded-full uppercase">
            Zero Downloads Needed
          </span>
        </h3>

        {/* Voice Presets */}
        <div>
          <label className="text-xs font-bold text-slate-300 mb-2 block flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-red-400" /> Ada Signature Voice Profiles
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "signature", label: "✨ Ada Signature", desc: "Warm & Intelligent" },
              { id: "energetic", label: "⚡ Cyber Spark", desc: "Upbeat & Fast" },
              { id: "gentle", label: "🌸 Soft Mentor", desc: "Calm & Clear" },
              { id: "synth", label: "🤖 Retro Synth", desc: "High-Tech Pitch" }
            ].map((vp) => (
              <button
                key={vp.id}
                onClick={() => applyVoiceProfile(vp.id as any)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  voiceProfile === vp.id
                    ? "bg-red-950/70 border-red-600 text-white shadow-lg shadow-red-950/50"
                    : "bg-neutral-900 border-neutral-800 text-slate-400 hover:text-white"
                }`}
              >
                <div className="text-xs font-extrabold">{vp.label}</div>
                <div className="text-[10px] text-slate-500">{vp.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Catchphrase Soundboard */}
        <div>
          <label className="text-xs font-bold text-slate-300 mb-2 block flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-amber-400" /> Voice Catchphrase Soundboard (Click to Test)
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { phrase: "Hello Doc! System fully operational!", mood: "happy" as AdaMood },
              { phrase: "Tux Jr. approved! Great coding work!", mood: "happy" as AdaMood },
              { phrase: "Analyzing algorithms... everything looks clean!", mood: "thinking" as AdaMood },
              { phrase: "Welcome to Baby Linux playground!", mood: "happy" as AdaMood }
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  playSoundEffect("chirp");
                  speakAdaResponse(item.phrase, item.mood);
                }}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-red-600/50 rounded-xl text-xs font-semibold text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3 h-3 text-red-400 fill-red-400" /> "{item.phrase.substring(0, 22)}..."
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-900">
          {/* Tux Accessory Selector */}
          <div>
            <label className="text-xs font-bold text-slate-400 mb-1.5 block">Tux Jr. Pet Accessory</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "bowtie", name: "🎀 Red Bowtie" },
                { id: "vr_goggles", name: "🥽 VR Goggles" },
                { id: "beanie", name: "🧢 Beanie" },
                { id: "wizard_hat", name: "🧙‍♂️ Wizard Hat" }
              ].map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => { setTuxAccessory(acc.id as TuxAccessory); playSoundEffect("pop"); }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                    tuxAccessory === acc.id
                      ? "bg-amber-950/60 border-amber-600 text-amber-300"
                      : "bg-neutral-900 border-neutral-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {acc.name}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Voice Fine-Tuning */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-400">Speech Synthesis</label>
              <button
                onClick={() => setSpeechEnabled(!speechEnabled)}
                className={`text-xs font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer ${
                  speechEnabled ? "bg-emerald-950 text-emerald-400" : "bg-neutral-900 text-slate-500"
                }`}
              >
                {speechEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                {speechEnabled ? "ON" : "OFF"}
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 font-semibold mb-1">
                  <span>Pitch Fine-Tune</span>
                  <span>{speechPitch}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.6"
                  step="0.05"
                  value={speechPitch}
                  onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                  className="w-full accent-red-500 bg-neutral-900 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {availableVoices.length > 0 && (
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block mb-1">
                    Browser Voice Engine
                  </span>
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 font-medium cursor-pointer"
                  >
                    {availableVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Third Row: VTube Studio & Live2D Model Importer & Studio Hub */}
      <div className="p-6 md:p-8 bg-neutral-950 rounded-3xl border border-red-950/60 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-neutral-900 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-1 rounded-full bg-red-950/80 border border-red-800/60 text-red-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> VTube Studio & Live2D Engine
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> WebGL Live Render
              </span>
            </div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              🎭 VTube Studio Model Loader & Avatar Hub
            </h3>
            <p className="text-slate-400 text-xs md:text-sm mt-1">
              Yes! You can load real VTube Studio models (<code className="text-red-400 font-mono">.model3.json</code>) or pick from built-in open-source VTuber avatars!
            </p>
          </div>

          {/* Avatar Engine Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800">
            <button
              onClick={() => { setAvatarMode("tux_primary"); playSoundEffect("pop"); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                avatarMode === "tux_primary"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🐧 Tux Linux Mascot (Primary)
            </button>
            <button
              onClick={() => { setAvatarMode("vector"); playSoundEffect("pop"); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                avatarMode === "vector"
                  ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ✨ Ada Vector Avatar
            </button>
            <button
              onClick={() => { setAvatarMode("live2d_sample"); playSoundEffect("pop"); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                avatarMode === "live2d_sample"
                  ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🌐 Live2D Preset Models
            </button>
            <button
              onClick={() => { setAvatarMode("vtube_uploaded"); playSoundEffect("pop"); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                avatarMode === "vtube_uploaded"
                  ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📁 Drag & Drop VTube Studio
            </button>
            <button
              onClick={() => { setAvatarMode("off"); playSoundEffect("powerup"); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                avatarMode === "off"
                  ? "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white shadow-md shadow-pink-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🎨 Avatar Off (Full RGB Color Stage)
            </button>
          </div>
        </div>

        {/* Content based on selected mode */}
        {avatarMode === "off" ? (
          <div className="space-y-6">
            <div className="p-5 bg-gradient-to-r from-pink-950/60 via-purple-950/60 to-cyan-950/60 border border-pink-500/40 rounded-3xl flex items-start gap-4 shadow-xl">
              <Sparkles className="w-6 h-6 text-pink-400 shrink-0 mt-1 animate-spin" />
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>🎨 Avatar Display Turned OFF — Full RGB Color Spectrum Active!</span>
                </h4>
                <p className="text-xs text-pink-200/90 mt-1 leading-relaxed">
                  The avatar model is currently turned off, revealing a vibrant RGB soundwave visualizer and reactive audio spectrum stage! Pick any color theme below to transform your playground:
                </p>
              </div>
            </div>

            {/* Color Palette Switcher Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {[
                { id: "red", name: "Crimson Red", class: "bg-red-600", text: "🔴 Red" },
                { id: "pink", name: "Neon Pink", class: "bg-pink-600", text: "🩷 Pink" },
                { id: "purple", name: "Violet Ray", class: "bg-purple-600", text: "💜 Violet" },
                { id: "cyber", name: "Cyber Cyan", class: "bg-cyan-600", text: "🩵 Cyber" },
                { id: "emerald", name: "Emerald Matrix", class: "bg-emerald-600", text: "🟢 Emerald" },
                { id: "amber", name: "Amber Sunset", class: "bg-amber-500", text: "🟡 Amber" },
                { id: "rainbow", name: "Full RGB Spectrum", class: "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500", text: "🌈 RGB Rainbow" }
              ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => { setColorTheme(theme.id as any); playSoundEffect("chirp"); }}
                  className={`p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    colorTheme === theme.id
                      ? "border-white bg-neutral-800 scale-105 shadow-xl shadow-pink-500/20"
                      : "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${theme.class} shadow-md`} />
                  <span className="text-xs font-bold text-white">{theme.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : avatarMode === "vtube_uploaded" ? (
          <div className="space-y-6">
            {/* Helpful instructions banner */}
            <div className="p-4 bg-amber-950/40 border border-amber-800/50 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <strong className="text-amber-300 font-bold block mb-0.5">💖 Don't worry at all! No hard work required:</strong>
                You don't need to learn any complex setup or download extra software! We already have awesome built-in avatars ready to play right away (like <strong>Tux the Penguin</strong> and <strong>Hiyori</strong>)! But if you ever do want to load a custom <code className="bg-amber-900/60 px-1 py-0.5 rounded text-amber-100 font-mono">.zip</code> model, just drop it onto the dashed box below — Ada handles all the unzipping for you automatically! ✨
              </div>
            </div>

            {/* Drag and Drop Zone for VTube Studio Files */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingZip(true);
              }}
              onDragLeave={() => setIsDraggingZip(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingZip(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleProcessUploadedFiles(e.dataTransfer.files);
                }
              }}
              className={`border-2 border-dashed rounded-3xl p-8 transition-all text-center flex flex-col items-center justify-center space-y-3 ${
                isDraggingZip
                  ? "border-amber-400 bg-amber-950/40 scale-[1.01] shadow-2xl shadow-amber-500/20"
                  : "border-neutral-800 hover:border-red-600/60 bg-neutral-900/50 hover:bg-neutral-900/80"
              }`}
            >
              <div className="w-16 h-16 rounded-3xl bg-red-950/60 border border-red-800/40 text-red-400 flex items-center justify-center shadow-lg">
                <Upload className={`w-8 h-8 ${isDraggingZip ? "animate-ping text-amber-400" : "animate-bounce"}`} />
              </div>
              <div>
                <h4 className="text-base font-black text-white">Upload VTube Studio Model Package</h4>
                <p className="text-xs text-slate-400 max-w-md mt-1">
                  Drag & drop your <strong className="text-white">.zip archive</strong> or <strong className="text-white">.model3.json</strong> files directly here!
                </p>
              </div>

              <input
                type="file"
                id="vtube-file-input"
                multiple
                accept=".json,.model3.json,.zip,.png,.motion3.json,.physics3.json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleProcessUploadedFiles(e.target.files);
                  }
                }}
              />

              <label
                htmlFor="vtube-file-input"
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer flex items-center gap-2"
              >
                <Folder className="w-4 h-4" /> Browse Local VTube Files (.ZIP / .json)
              </label>

              <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500 font-semibold pt-2">
                <span>JSZip Unpacker</span>
                <span>•</span>
                <span>ZIP Archives (.zip)</span>
                <span>•</span>
                <span>Model3 (.model3.json)</span>
                <span>•</span>
                <span>Physics (.physics3.json)</span>
                <span>•</span>
                <span>Textures (.png)</span>
              </div>
            </div>

            {/* Upload Inspector Details */}
            {uploadedModel && (
              <div className="p-5 bg-neutral-900/90 border border-emerald-900/50 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-white flex items-center gap-2">
                      <span>Model Loaded:</span>
                      <span className="text-emerald-400 font-mono">{uploadedModel.modelName}</span>
                    </h5>
                    <p className="text-xs text-slate-400">
                      Found {uploadedModel.filesCount} file(s) • {uploadedModel.texturesFound} textures • {uploadedModel.motionsFound} motion(s)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      speakAdaResponse(`Activating ${uploadedModel.modelName} Live2D avatar for Ada!`, "happy");
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Activate Avatar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : avatarMode === "live2d_sample" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {sampleVTuberModels.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => {
                    setSelectedPresetModel(preset.id);
                    playSoundEffect("chirp");
                    if (preset.id === "natori") {
                      speakAdaResponse("Ooh, I love this model! The Natori Cyber VTuber has high-tech cyber headset LEDs, expressive Live2D lip-syncing, and vibrant red/black futuristic accents that fit my Baby Linux studio vibe perfectly!", "cyber");
                    } else {
                      speakAdaResponse(`Loaded ${preset.name} Live2D model for Ada!`, "happy");
                    }
                  }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    selectedPresetModel === preset.id
                      ? "bg-red-950/70 border-red-600 text-white shadow-xl shadow-red-950/50 ring-2 ring-red-500/50"
                      : "bg-neutral-900 border-neutral-800 text-slate-300 hover:border-neutral-700"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] bg-neutral-950 border border-neutral-800 text-red-400 font-black px-2 py-0.5 rounded-full uppercase">
                        {preset.tag}
                      </span>
                      {selectedPresetModel === preset.id && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </div>
                    <h5 className="text-sm font-black text-white">{preset.name}</h5>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{preset.description}</p>
                  </div>

                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span>{preset.creator}</span>
                    <span className="text-red-400 font-mono">.model3.json</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 bg-neutral-900/60 rounded-2xl border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <h4 className="text-base font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Active: Ada Cyber Vector Avatar
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                Ada's native vector avatar is running built-in real-time lip-syncing (`ParamMouthOpenY`), eye blinking, headset LED glowing, and pet synchronization with zero external web requests required!
              </p>
            </div>

            <button
              onClick={() => {
                playSoundEffect("chirp");
                speakAdaResponse("Vector avatar active and operating at 60 FPS!", "happy");
              }}
              className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              Test Vector Sync
            </button>
          </div>
        )}

        {/* Live2D / VTube Studio Parameter Monitor & Lip-Sync Soundboard */}
        <div className="pt-4 border-t border-neutral-900 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-neutral-900/80 rounded-2xl border border-neutral-800 space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-red-400" /> Real-time VTube Studio Parameter Tracking
            </h4>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                  <span>ParamMouthOpenY (Lip-Sync)</span>
                  <span>{isSpeaking ? "0.82 (Active Speak)" : "0.00 (Closed)"}</span>
                </div>
                <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="bg-red-500 h-full"
                    animate={{ width: isSpeaking ? ["10%", "90%", "30%", "85%", "15%"] : "0%" }}
                    transition={{ repeat: isSpeaking ? Infinity : 0, duration: 0.25 }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                  <span>ParamEyeLOpen & ParamEyeROpen</span>
                  <span>1.00 (Blinking)</span>
                </div>
                <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[95%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                  <span>ParamAngleZ (Head Tilt)</span>
                  <span>{adaMood === "thinking" ? "+15.0°" : "0.0°"}</span>
                </div>
                <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden">
                  <div className={`h-full bg-purple-500 transition-all ${adaMood === "thinking" ? "w-[75%]" : "w-[50%]"}`} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 bg-neutral-900/80 rounded-2xl border border-neutral-800 space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> How VTube Studio Models Work Here
            </h4>
            <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold">•</span>
                <span><strong className="text-white">Live2D Cubism Format:</strong> VTube Studio exports standard <code className="text-slate-300 font-mono">.model3.json</code> files alongside PNG texture atlases.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold">•</span>
                <span><strong className="text-white">WebGL Rendering:</strong> Browsers use WebGL shaders to map bone motions, eye blinks, and mouth lip-sync without installing desktop software.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold">•</span>
                <span><strong className="text-white">Seamless Voice Sync:</strong> When Ada speaks using Web Speech API or Gemini, the mouth parameter (<code className="text-slate-300 font-mono">ParamMouthOpenY</code>) drives live animations automatically!</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
