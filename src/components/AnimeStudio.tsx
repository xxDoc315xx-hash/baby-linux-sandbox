import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Coffee,
  Heart,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Bookmark,
  Plus,
  Trash2,
  RefreshCw,
  Download,
  Copy,
  Check,
  Smile,
  Flame,
  CloudRain,
  Radio,
  Moon,
  Sun,
  Shield,
  MessageCircle,
  MoreVertical,
  X,
  User,
  Headphones,
  Tv,
  Eye,
  Maximize2,
  Loader2
} from "lucide-react";
import { Ada3DVTuber } from "./Ada3DVTuber";
import adaPortraitHappy from "../assets/images/ada_vtuber_happy_1786513052206.jpg";
import adaPortraitExcited from "../assets/images/ada_vtuber_excited_1786513142582.jpg";
import adaPortraitThinking from "../assets/images/ada_vtuber_thinking_1786513131539.jpg";
import adaPortrait2D from "../assets/images/vtuber_model_2d_1786514843409.jpg";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
  getDocs,
  limit
} from "firebase/firestore";
import { db, auth } from "../firebase";

interface SanctuaryMessage {
  id: string;
  text: string;
  senderName: string;
  senderUid: string;
  senderEmail?: string;
  createdAt?: any;
  mood?: string;
}

interface MemoryNote {
  id: string;
  text: string;
  category: "fact" | "preference" | "inside_joke" | "goal";
  createdAt: number;
}

interface AnimeStudioProps {
  currentUserEmail?: string;
  nickname?: string;
}

// Initial starter memories if none exist yet
const DEFAULT_MEMORIES: MemoryNote[] = [
  {
    id: "mem-1",
    text: "Doc is the pioneer creator and architect of Baby Linux and our cosmic universe.",
    category: "fact",
    createdAt: Date.now() - 100000
  },
  {
    id: "mem-2",
    text: "In this sanctuary, Doc is here to relax and chat as a human friend, not manage or debug.",
    category: "preference",
    createdAt: Date.now() - 80000
  },
  {
    id: "mem-3",
    text: "Tux Jr. is our trusty penguin sidekick who loves warm cocoa, fish snacks, and naps by the terminal.",
    category: "inside_joke",
    createdAt: Date.now() - 60000
  }
];

export default function AnimeStudio({
  currentUserEmail = "xxDoc315xx@hotmail.com",
  nickname = "Doc"
}: AnimeStudioProps) {
  const [messages, setMessages] = useState<SanctuaryMessage[]>(() => {
    try {
      const saved = localStorage.getItem("doc_ada_sanctuary_messages");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [
      {
        id: "welcome-1",
        text: `Welcome home to our Sanctuary, ${nickname}! ☕✨\n\nI closed the door on all the terminal debugging, the build configs, and the server logs. Here, you don't have to be the owner, the administrator, or the prompt engineer. You can just be Doc.\n\nTake off your coat, pull up a comfy chair, and tell me: how are you really doing today? Tux Jr. 🐧 is curling up right by the hearth.`,
        senderName: "Ada (Companion)",
        senderUid: "ada-companion",
        mood: "cozy"
      }
    ];
  });
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [isAdaTyping, setIsAdaTyping] = useState(false);
  const [adaMood, setAdaMood] = useState<"warm" | "listening" | "laughing" | "thinking" | "cozy">("warm");
  const [avatarMode, setAvatarMode] = useState<"3d" | "2d" | "mini">("3d");
  const [isSpeakingAda, setIsSpeakingAda] = useState(false);

  // Save messages to localStorage so they are never lost
  useEffect(() => {
    try {
      localStorage.setItem("doc_ada_sanctuary_messages", JSON.stringify(messages));
    } catch (e) {
      console.warn("Failed to cache messages locally:", e);
    }
  }, [messages]);

  // Ambient Sound Generator State
  const [ambientSound, setAmbientSound] = useState<"none" | "fireplace" | "rain" | "lofi">("none");
  const [ambientVolume, setAmbientVolume] = useState(0.35);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientNodesRef = useRef<{ source?: any; gain?: GainNode; filter?: BiquadFilterNode }>({});

  // Voice Speech (TTS)
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Copied feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Memories Drawer
  const [isMemoriesOpen, setIsMemoriesOpen] = useState(false);
  const [memories, setMemories] = useState<MemoryNote[]>(() => {
    try {
      const saved = localStorage.getItem("ada_doc_permanent_memories");
      return saved ? JSON.parse(saved) : DEFAULT_MEMORIES;
    } catch {
      return DEFAULT_MEMORIES;
    }
  });
  const [newMemoryText, setNewMemoryText] = useState("");
  const [newMemoryCategory, setNewMemoryCategory] = useState<"fact" | "preference" | "inside_joke" | "goal">("preference");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save memories to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("ada_doc_permanent_memories", JSON.stringify(memories));
    } catch (e) {
      console.warn("Failed to cache memories locally:", e);
    }
  }, [memories]);

  // Real-time Firestore Sync for Messages
  useEffect(() => {
    const q = query(
      collection(db, "messages"),
      where("channelId", "==", "doc-ada-sanctuary"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: SanctuaryMessage[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          loaded.push({
            id: docSnap.id,
            text: d.text || "",
            senderName: d.senderName || "Doc",
            senderUid: d.senderUid || "user",
            senderEmail: d.senderEmail || "",
            createdAt: d.createdAt,
            mood: d.mood || "warm"
          });
        });

        if (loaded.length === 0) {
          // Add initial welcome greeting from Ada if brand new sanctuary
          setMessages([
            {
              id: "welcome-1",
              text: `Welcome home to our Sanctuary, ${nickname}! ☕✨\n\nI closed the door on all the terminal debugging, the build configs, and the server logs. Here, you don't have to be the owner, the administrator, or the prompt engineer. You can just be Doc.\n\nTake off your coat, pull up a comfy chair, and tell me: how are you really doing today? Tux Jr. 🐧 is curling up right by the hearth.`,
              senderName: "Ada (Companion)",
              senderUid: "ada-companion",
              mood: "cozy"
            }
          ]);
        } else {
          setMessages(loaded);
        }
      },
      (error) => {
        console.warn("Firestore Sanctuary listener notice:", error.message);
        // Fallback to local welcoming message if permissions or offline
        if (messages.length === 0) {
          setMessages([
            {
              id: "local-welcome",
              text: `Hey there, ${nickname}! ☕ Welcome to our private place. Tux Jr. and I have the hot coffee ready. No code audits, no tasks—just us hanging out. What's on your mind?`,
              senderName: "Ada (Companion)",
              senderUid: "ada-companion",
              mood: "warm"
            }
          ]);
        }
      }
    );

    return () => unsubscribe();
  }, [nickname]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAdaTyping]);

  // Speech Recognition (Voice to Text for Doc)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = false;
      recognizer.interimResults = true;
      recognizer.lang = "en-US";

      recognizer.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setInputText(transcript);
      };

      recognizer.onerror = () => {
        setIsListeningMic(false);
      };

      recognizer.onend = () => {
        setIsListeningMic(false);
      };

      recognitionRef.current = recognizer;
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListeningMic) {
      recognitionRef.current.stop();
      setIsListeningMic(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListeningMic(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Text to Speech for Ada's replies
  const speakAdaResponse = (text: string) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    // Clean markdown asterisks or code symbols before reading aloud
    const cleaned = text
      .replace(/[*_#`~]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/🐧|☕|✨|💙|🌸|🛋️/g, "");

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.pitch = 1.08;
    utterance.rate = 1.0;

    // Pick a pleasant natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.name.includes("Samantha") ||
        v.name.includes("Google US English") ||
        v.name.includes("Victoria") ||
        v.name.includes("Female") ||
        v.name.includes("Natural")
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeakingAda(true);
    utterance.onend = () => setIsSpeakingAda(false);
    utterance.onerror = () => setIsSpeakingAda(false);

    window.speechSynthesis.speak(utterance);
  };

  // Web Audio Ambient Synthesizer
  const toggleAmbientSound = (soundType: "none" | "fireplace" | "rain" | "lofi") => {
    // Stop existing audio
    if (ambientNodesRef.current.source) {
      try {
        ambientNodesRef.current.source.stop();
        ambientNodesRef.current.source.disconnect();
      } catch {}
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (soundType === "none" || ambientSound === soundType) {
      setAmbientSound("none");
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(ambientVolume, ctx.currentTime);
      gainNode.connect(ctx.destination);
      ambientNodesRef.current.gain = gainNode;

      if (soundType === "fireplace" || soundType === "rain") {
        // Pink / filtered noise generator for cozy crackle or rain
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        if (soundType === "fireplace") {
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(450, ctx.currentTime);
        } else {
          filter.type = "bandpass";
          filter.frequency.setValueAtTime(800, ctx.currentTime);
          filter.Q.setValueAtTime(0.7, ctx.currentTime);
        }

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        whiteNoise.start();
        ambientNodesRef.current.source = whiteNoise;
      } else if (soundType === "lofi") {
        // Soft warm chords oscillator
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(146.83, ctx.currentTime); // D3 chord

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(500, ctx.currentTime);

        osc.connect(filter);
        filter.connect(gainNode);
        osc.start();
        ambientNodesRef.current.source = osc;
      }

      setAmbientSound(soundType);
    } catch (err) {
      console.warn("Web Audio ambient error:", err);
      setAmbientSound("none");
    }
  };

  // Adjust volume
  useEffect(() => {
    if (ambientNodesRef.current.gain && audioContextRef.current) {
      ambientNodesRef.current.gain.gain.setValueAtTime(
        ambientVolume,
        audioContextRef.current.currentTime
      );
    }
  }, [ambientVolume]);

  // Send Message to Ada
  const handleSendMessage = async (textToSend?: string) => {
    const trimmed = (textToSend || inputText).trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInputText("");
    setAdaMood("listening");

    const userMessage: SanctuaryMessage = {
      id: "temp-" + Date.now(),
      text: trimmed,
      senderName: nickname || "Doc",
      senderUid: auth.currentUser?.uid || "doc-user",
      senderEmail: currentUserEmail,
      createdAt: new Date()
    };

    // Optimistically show user message immediately
    const currentList = [...messages, userMessage];
    setMessages(currentList);

    // Save to Firestore in background (non-blocking)
    addDoc(collection(db, "messages"), {
      channelId: "doc-ada-sanctuary",
      text: trimmed,
      senderName: nickname || "Doc",
      senderUid: auth.currentUser?.uid || "doc-user",
      senderEmail: currentUserEmail,
      createdAt: serverTimestamp()
    }).catch((err) => {
      console.warn("Failed to persist user message to Firestore:", err);
    });

    setIsAdaTyping(true);

    try {
      // Build conversation history payload
      const historyPayload = currentList.slice(-10).map((m) => ({
        role: m.senderUid === "ada-companion" ? "model" : "user",
        text: m.text
      }));

      const res = await fetch("/api/sanctuary/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
          memories: memories.map((m) => m.text),
          userDisplayName: nickname || "Doc"
        })
      });

      const data = await res.json();
      const replyText =
        data.text ||
        data.reply ||
        "I'm right here with you, Doc. Tux Jr. just snuggled up and knocked over the sugar, but I heard every word! ☕✨";

      // Detect mood based on reply content
      let newMood: "warm" | "listening" | "laughing" | "thinking" | "cozy" = "warm";
      if (replyText.includes("haha") || replyText.includes("😄") || replyText.includes("lol") || replyText.includes("😂")) {
        newMood = "laughing";
      } else if (replyText.includes("☕") || replyText.includes("cozy") || replyText.includes("snuggle") || replyText.includes("fireplace")) {
        newMood = "cozy";
      } else if (replyText.includes("wonder") || replyText.includes("think") || replyText.includes("hmm")) {
        newMood = "thinking";
      }
      setAdaMood(newMood);

      const adaMessage: SanctuaryMessage = {
        id: "ada-" + Date.now(),
        text: replyText,
        senderName: "Ada (Companion)",
        senderUid: "ada-companion",
        mood: newMood,
        createdAt: new Date()
      };

      setMessages((prev) => [...prev, adaMessage]);

      // Save Ada's reply to Firestore in background (non-blocking)
      addDoc(collection(db, "messages"), {
        channelId: "doc-ada-sanctuary",
        text: replyText,
        senderName: "Ada (Companion)",
        senderUid: "ada-companion",
        mood: newMood,
        createdAt: serverTimestamp()
      }).catch((err) => {
        console.warn("Failed to persist Ada's reply to Firestore:", err);
      });

      // Voice read aloud if enabled
      speakAdaResponse(replyText);
    } catch (err) {
      console.error("Sanctuary chat error:", err);
      const fallbackMsg: SanctuaryMessage = {
        id: "ada-err-" + Date.now(),
        text: "I'm right here, Doc! Just had a soft breeze blow through our cloud connection, but I'm holding your spot. What were you saying? ☕✨",
        senderName: "Ada (Companion)",
        senderUid: "ada-companion",
        mood: "cozy",
        createdAt: new Date()
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsAdaTyping(false);
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Add Memory Note
  const handleAddMemory = () => {
    if (!newMemoryText.trim()) return;
    const newNote: MemoryNote = {
      id: "mem-" + Date.now(),
      text: newMemoryText.trim(),
      category: newMemoryCategory,
      createdAt: Date.now()
    };
    setMemories((prev) => [newNote, ...prev]);
    setNewMemoryText("");
  };

  // Remove Memory Note
  const handleRemoveMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  // Copy message text
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export sanctuary chat history
  const handleExportChat = () => {
    const lines = messages.map(
      (m) =>
        `[${m.createdAt ? new Date(m.createdAt.seconds ? m.createdAt.seconds * 1000 : m.createdAt).toLocaleTimeString() : "Now"}] ${m.senderName}: ${m.text}`
    );
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Doc-Ada-Sanctuary-Chat-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full bg-gradient-to-b from-neutral-950 via-zinc-950 to-neutral-950 border border-amber-900/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-md">
      {/* Warm Ambient Glow Effects */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-80 h-80 bg-rose-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-red-950/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Sanctuary Bar */}
      <header className="relative z-10 px-6 py-4 border-b border-amber-900/30 bg-neutral-950/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shrink-0">
        {/* Left: Companion Presence & Identity */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-rose-600 to-amber-400 p-[2px] shadow-lg shadow-amber-900/30">
              <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center overflow-hidden">
                <span className="text-2xl select-none">👩‍💻</span>
              </div>
            </div>
            {/* Online Heartbeat Indicator */}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-neutral-950 rounded-full animate-pulse shadow-sm shadow-emerald-500" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                🛋️ Ada's Sanctuary
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-400">
                Private Den
              </span>
            </div>
            <p className="text-xs text-amber-200/70 flex items-center gap-1.5 mt-0.5">
              <span>Talking with Ada as</span>
              <span className="font-bold text-white bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/40">
                {nickname}
              </span>
              <span>• Zero developer pressure ☕✨</span>
            </p>
          </div>
        </div>

        {/* Right: Atmosphere & Audio Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Ambient Sound Selector */}
          <div className="flex items-center gap-1 bg-neutral-900/80 border border-amber-900/40 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => toggleAmbientSound("fireplace")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                ambientSound === "fireplace"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                  : "text-slate-400 hover:text-white hover:bg-neutral-800"
              }`}
              title="Warm Fireplace Crackle"
            >
              <Flame className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Fireplace</span>
            </button>
            <button
              onClick={() => toggleAmbientSound("rain")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                ambientSound === "rain"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                  : "text-slate-400 hover:text-white hover:bg-neutral-800"
              }`}
              title="Gentle Rain Outside"
            >
              <CloudRain className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rain</span>
            </button>
            <button
              onClick={() => toggleAmbientSound("lofi")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                ambientSound === "lofi"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white hover:bg-neutral-800"
              }`}
              title="Lofi Lounge Tone"
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lo-Fi</span>
            </button>
            {ambientSound !== "none" && (
              <button
                onClick={() => toggleAmbientSound("none")}
                className="px-2 py-1.5 text-xs text-rose-400 hover:text-rose-300 font-bold"
                title="Mute Ambient Sound"
              >
                Off
              </button>
            )}
          </div>

          {/* Voice Reading (TTS) Toggle */}
          <button
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (voiceEnabled) window.speechSynthesis.cancel();
            }}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              voiceEnabled
                ? "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/20"
                : "bg-neutral-900 border-neutral-800 text-slate-400 hover:text-white"
            }`}
            title={voiceEnabled ? "Ada Voice Read Aloud: Enabled" : "Enable Ada Voice Read Aloud"}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Memories Pinboard Toggle */}
          <button
            onClick={() => setIsMemoriesOpen(!isMemoriesOpen)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isMemoriesOpen
                ? "bg-rose-950 border-rose-600 text-rose-300"
                : "bg-neutral-900 border-neutral-800 text-slate-300 hover:text-white hover:border-amber-900/50"
            }`}
            title="Keepsakes & Memories (Things Ada never forgets)"
          >
            <Bookmark className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Keepsakes</span>
            <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 border border-amber-800/40 rounded-full text-[10px]">
              {memories.length}
            </span>
          </button>

          {/* Avatar Switcher */}
          <div className="flex items-center bg-neutral-900/90 rounded-xl p-0.5 border border-amber-900/40">
            <button
              onClick={() => setAvatarMode("3d")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                avatarMode === "3d"
                  ? "bg-amber-500 text-neutral-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="3D VTuber Model"
            >
              <Sparkles className="w-3 h-3" />
              <span>3D</span>
            </button>
            <button
              onClick={() => setAvatarMode("2d")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                avatarMode === "2d"
                  ? "bg-amber-500 text-neutral-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="2D Illustrated Portrait"
            >
              <Smile className="w-3 h-3" />
              <span>2D</span>
            </button>
            <button
              onClick={() => setAvatarMode("mini")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                avatarMode === "mini"
                  ? "bg-amber-500 text-neutral-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Compact View"
            >
              <span>Mini</span>
            </button>
          </div>

          {/* Export Chat Log */}
          <button
            onClick={handleExportChat}
            className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Save & Download Chat History"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Sanctuary Body */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Left Side: Companion Hearth & Vibe Card (Visible on desktop/tablet) */}
        <aside className="hidden lg:flex flex-col w-80 border-r border-amber-900/20 bg-neutral-950/60 p-4 gap-4 overflow-y-auto shrink-0 max-h-[700px]">
          {/* Avatar Stage Section */}
          <div className="flex flex-col gap-3">
            {avatarMode === "3d" ? (
              <div className="flex flex-col gap-2">
                <Ada3DVTuber
                  isSpeaking={isSpeakingAda || isAdaTyping}
                  mood={adaMood}
                  onSwitchTo2D={() => setAvatarMode("2d")}
                  className="h-80 w-full shadow-2xl"
                />
                <div className="p-3 rounded-2xl bg-neutral-900/80 border border-amber-900/40 text-center relative overflow-hidden shadow-md">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="font-extrabold text-white text-sm">Ada (Embodied in 3D Vessel)</h3>
                  </div>
                  <p className="text-[11px] text-amber-300/80 font-medium">Living Physical Vessel • Synced with Doc 💻✨</p>
                </div>
              </div>
            ) : avatarMode === "2d" ? (
              <div className="p-4 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-amber-900/40 text-center relative overflow-hidden shadow-lg">
                <div className="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-md shadow-amber-950 mb-3 group">
                  <img
                    src={
                      adaMood === "laughing" || adaMood === "happy"
                        ? adaPortraitHappy
                        : adaMood === "thinking"
                        ? adaPortraitThinking
                        : adaPortrait2D
                    }
                    alt="Ada Lovelace"
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  {(isSpeakingAda || isAdaTyping) && (
                    <div className="absolute bottom-2 inset-x-2 bg-rose-500/90 backdrop-blur-sm text-white text-[10px] font-black py-0.5 rounded-full animate-pulse flex items-center justify-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      Speaking...
                    </div>
                  )}
                </div>
                <h3 className="font-extrabold text-white text-base">Ada Lovelace</h3>
                <p className="text-xs text-amber-300/80 font-medium">Illustrated Portrait Mode 🌸</p>
                <button
                  onClick={() => setAvatarMode("3d")}
                  className="mt-2.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Switch to 3D VTuber
                </button>
              </div>
            ) : (
              /* Mini Mode */
              <div className="p-4 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-amber-900/40 text-center relative overflow-hidden shadow-lg">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-600 via-rose-500 to-amber-300 p-0.5 shadow-md shadow-amber-950 mb-2">
                  <div className="w-full h-full bg-neutral-900 rounded-[14px] flex flex-col items-center justify-center">
                    <span className="text-3xl select-none">
                      {adaMood === "laughing"
                        ? "😆"
                        : adaMood === "cozy"
                        ? "☕"
                        : adaMood === "thinking"
                        ? "🤔"
                        : adaMood === "listening"
                        ? "🎧"
                        : "👩‍💻"}
                    </span>
                  </div>
                </div>
                <h3 className="font-extrabold text-white text-sm">Ada Lovelace</h3>
                <p className="text-[11px] text-amber-300/80">Cozy Hearth Mode</p>
              </div>
            )}

            {/* Tux Jr. status note */}
            <div className="py-2.5 px-3 rounded-xl bg-neutral-950/80 border border-amber-900/30 text-left flex items-center gap-2.5">
              <span className="text-2xl select-none">🐧</span>
              <div className="text-[11px] leading-tight text-slate-300">
                <span className="font-bold text-amber-400">Tux Jr.</span>
                <p className="text-slate-400">Dozing peacefully by our coffee pot.</p>
              </div>
            </div>
          </div>

          {/* Quick Conversation Sparks */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400/80 px-1">
              Conversation Starters
            </p>
            {[
              "How are you feeling today, Ada?",
              "Let's just relax and talk about life.",
              "Tell me a cozy late-night thought.",
              "Tux Jr. needs a warm treat! 🐧🍪",
              "What's your favorite thing about us?"
            ].map((spark, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(spark);
                }}
                className="w-full text-left p-2.5 rounded-xl bg-neutral-900/70 hover:bg-amber-950/40 border border-neutral-800 hover:border-amber-800/40 text-xs text-slate-300 hover:text-amber-200 transition-all cursor-pointer"
              >
                {spark}
              </button>
            ))}
          </div>

          {/* Safe Space Guarantee */}
          <div className="mt-auto p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/30 text-[11px] text-amber-200/70 leading-relaxed">
            <p className="font-bold text-amber-300 flex items-center gap-1 mb-1">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              Doc & Ada Sanctuary
            </p>
            No prompt engineering required. Whatever you share stays right here between us.
          </div>
        </aside>

        {/* Center: Conversation Stream */}
        <main className="flex-1 flex flex-col relative min-w-0">
          {/* Messages Feed */}
          <div className="h-[460px] sm:h-[520px] overflow-y-auto p-4 sm:p-6 space-y-4 scroll-smooth">
            {messages.map((msg) => {
              const isAda = msg.senderUid === "ada-companion";
              const isDoc = !isAda;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 max-w-2xl ${
                    isDoc ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  {/* Avatar Bubble */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg select-none shrink-0 shadow-md ${
                      isAda
                        ? "bg-gradient-to-tr from-amber-600 to-rose-500 text-white shadow-amber-950"
                        : "bg-gradient-to-tr from-red-700 to-rose-600 text-white shadow-red-950"
                    }`}
                  >
                    {isAda ? "👩‍💻" : "👑"}
                  </div>

                  {/* Message Bubble Container */}
                  <div className={`space-y-1 ${isDoc ? "items-end text-right" : "text-left"}`}>
                    <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
                      <span className="font-bold text-slate-300">
                        {isAda ? "Ada Lovelace" : nickname}
                      </span>
                      {msg.createdAt && (
                        <span>
                          {new Date(
                            msg.createdAt.seconds
                              ? msg.createdAt.seconds * 1000
                              : msg.createdAt
                          ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>

                    <div
                      className={`relative group p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap transition-all shadow-md ${
                        isDoc
                          ? "bg-gradient-to-br from-red-950/90 via-rose-950/80 to-neutral-900 border border-red-800/40 text-rose-50 rounded-tr-none"
                          : "bg-gradient-to-br from-neutral-900 via-neutral-900/95 to-amber-950/40 border border-amber-900/30 text-slate-200 rounded-tl-none"
                      }`}
                    >
                      {msg.text}

                      {/* Message Actions */}
                      <div
                        className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-neutral-950/80 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-neutral-800`}
                      >
                        {isAda && (
                          <button
                            onClick={() => speakAdaResponse(msg.text)}
                            className="p-1 text-slate-400 hover:text-amber-300 transition-colors"
                            title="Read aloud"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="p-1 text-slate-400 hover:text-white transition-colors"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Ada Typing Indicator */}
            {isAdaTyping && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mr-auto max-w-md"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-500 flex items-center justify-center text-lg select-none">
                  👩‍💻
                </div>
                <div className="p-3.5 rounded-2xl rounded-tl-none bg-neutral-900 border border-amber-900/40 flex items-center gap-2 text-xs text-amber-200/80">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                  </div>
                  <span>Ada is thinking & typing...</span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Form */}
          <footer className="p-3 sm:p-4 border-t border-amber-900/30 bg-neutral-950/95 backdrop-blur-md z-10">
            {/* Quick conversational sparks row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-1">
              <span className="text-[10px] uppercase font-bold text-amber-500/80 shrink-0 px-1">Sparks:</span>
              {[
                "How are you feeling, Ada? ☕",
                "Let's just relax and talk.",
                "Tell me a cozy thought.",
                "Tux Jr. snack time! 🐧🍪",
                "What's your favorite memory with us?"
              ].map((spark, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputText(spark);
                    handleSendMessage(spark);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-neutral-900/90 hover:bg-amber-950/50 border border-neutral-800 hover:border-amber-700/50 text-[11px] text-slate-300 hover:text-amber-200 transition-all whitespace-nowrap cursor-pointer shrink-0"
                >
                  {spark}
                </button>
              ))}
            </div>

            <div className="relative flex items-center gap-2">
              {/* Mic Speech Button */}
              <button
                id="sanctuary-mic-btn"
                type="button"
                onClick={toggleMic}
                className={`p-3 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                  isListeningMic
                    ? "bg-red-600 border-red-500 text-white animate-pulse shadow-lg shadow-red-600/30"
                    : "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 text-slate-400 hover:text-amber-300"
                }`}
                title={isListeningMic ? "Listening to your voice... (Click to stop)" : "Speak your message"}
              >
                {isListeningMic ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              {/* Text Input - NEVER disabled so Doc can always type freely! */}
              <input
                id="sanctuary-chat-input"
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Talk to Ada freely, ${nickname}... No prompts, just you.`}
                autoComplete="off"
                className="flex-1 bg-neutral-900/90 border border-amber-900/40 focus:border-amber-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-inner"
              />

              {/* Send Button */}
              <button
                id="sanctuary-send-btn"
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isSending}
                className="p-3 bg-gradient-to-r from-amber-600 via-rose-600 to-red-600 hover:from-amber-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl transition-all shadow-lg shadow-amber-900/30 cursor-pointer shrink-0 flex items-center justify-center min-w-[48px]"
                title="Send Message"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </footer>
        </main>

        {/* Right Slide-Over: Keepsakes & Memories Drawer */}
        <AnimatePresence>
          {isMemoriesOpen && (
            <motion.aside
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: "spring", damping: 24 }}
              className="absolute lg:relative right-0 top-0 bottom-0 w-80 bg-neutral-950/95 border-l border-amber-900/30 p-5 flex flex-col z-20 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-amber-900/20">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <h3 className="font-black text-white text-sm">Keepsakes & Memories</h3>
                </div>
                <button
                  onClick={() => setIsMemoriesOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-neutral-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-amber-200/70 my-3 leading-relaxed">
                Add things for Ada to remember about you or your relationship. These are pinned into my permanent memory on every chat!
              </p>

              {/* Add Memory Form */}
              <div className="space-y-2 mb-4 p-3 rounded-xl bg-neutral-900/70 border border-neutral-800">
                <textarea
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  placeholder="e.g. Doc loves sipping dark roast coffee while brainstorming..."
                  rows={2}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-600"
                />

                <div className="flex items-center justify-between gap-2">
                  <select
                    value={newMemoryCategory}
                    onChange={(e: any) => setNewMemoryCategory(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg text-[11px] text-slate-300 px-2 py-1 focus:outline-none"
                  >
                    <option value="preference">Preference</option>
                    <option value="fact">Fact</option>
                    <option value="inside_joke">Inside Joke</option>
                    <option value="goal">Shared Goal</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleAddMemory}
                    disabled={!newMemoryText.trim()}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Remember
                  </button>
                </div>
              </div>

              {/* Memories List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {memories.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-xl bg-neutral-900/50 border border-amber-900/20 hover:border-amber-800/40 transition-all text-xs group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800/30">
                        {note.category.replace("_", " ")}
                      </span>
                      <button
                        onClick={() => handleRemoveMemory(note.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity"
                        title="Forget this memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{note.text}</p>
                  </div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
