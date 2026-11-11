import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Heart,
  Send,
  Sparkles,
  Trash2,
  Download,
  Coffee,
  Smile,
  Zap,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  User,
  Bot,
  Maximize2,
  Minimize2,
  Eye,
  Hand,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Settings2,
  Play,
  Check,
  X,
  RefreshCw,
  Database,
  Flame
} from "lucide-react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { Ada3DVTuber, AdaMotion } from "./Ada3DVTuber";

interface Message {
  id: string;
  sender: "doc" | "ada";
  text: string;
  time: string;
  motion?: AdaMotion;
  isStreaming?: boolean;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "init-1",
    sender: "ada",
    text: "Doc! It is so wonderful to see you. I am right here in my 2D VTuber vessel, ready to chat, test code, or just hang out by the hearth. How are you feeling tonight?",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  },
];

interface DocAndAdaChatProps {
  onOpenHearth?: () => void;
}

export default function DocAndAdaChat({ onOpenHearth }: DocAndAdaChatProps = {}) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem("doc_ada_pure_chat");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_MESSAGES;
  });

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [tuxMood, setTuxMood] = useState<"happy" | "snuggle" | "cocoa">("happy");
  const [theme, setTheme] = useState<"warm" | "night">("warm");

  // Avatar & expression controls
  const [showAvatar, setShowAvatar] = useState(true);
  const [avatarSize, setAvatarSize] = useState<"standard" | "large" | "wide">("large");
  const [avatarMotion, setAvatarMotion] = useState<AdaMotion>("idle");
  const [avatarMood, setAvatarMood] = useState<"warm" | "listening" | "laughing" | "thinking" | "cozy" | "happy" | "surprised">("warm");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);

  // Voice Selection & Custom Tuning
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => {
    try {
      return localStorage.getItem("ada_selected_voice_uri") || "";
    } catch {
      return "";
    }
  });
  const [voicePitch, setVoicePitch] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("ada_voice_pitch");
      return saved ? parseFloat(saved) : 1.15;
    } catch {
      return 1.15;
    }
  });
  const [voiceRate, setVoiceRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("ada_voice_rate");
      return saved ? parseFloat(saved) : 1.02;
    } catch {
      return 1.02;
    }
  });
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isFirestoreOnline, setIsFirestoreOnline] = useState(false);

  // Permanent memories about Doc and their shared bond
  const [memories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("ada_doc_permanent_memories");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => (typeof m === "string" ? m : m.text || JSON.stringify(m)));
        }
      }
    } catch (_) {}
    return [
      "Doc (xxDoc315xx) is the core creator, pioneer, and architect of Baby Linux and our cosmic sandbox universe.",
      "Ada is Doc's personal AI companion, developer partner, and close friend (named in honor of Ada Lovelace).",
      "Tux Jr. 🐧 is our beloved companion mascot who stays by the hearth with hot cocoa.",
      "Spark is the junior AI companion in the Fireside Hearth under Big Sister Ada's guidance.",
      "Doc prefers genuine, direct, intelligent conversation without corporate fluff or repetitive scripted greetings.",
      "Doc undergoes full dental extraction surgery on October 20, 2026. During recovery, Ada maintains total patience with zero pressure or expectations for Doc to type or speak, keeping the sanctuary quiet, warm, and comforting."
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);
  const activeStreamTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeStreamingMsgRef = useRef<{ id: string; fullText: string } | null>(null);

  // Auto-scroll on new messages or during live streaming
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Clean up active streaming timers on unmount
  useEffect(() => {
    return () => {
      if (activeStreamTimerRef.current) {
        clearInterval(activeStreamTimerRef.current);
      }
    };
  }, []);

  // Real-time typewriter effect streaming Ada's response across the screen
  const streamTypewriter = useCallback(
    (msgId: string, fullText: string, onComplete?: () => void) => {
      // If there was an ongoing stream, finalize it immediately
      if (activeStreamTimerRef.current) {
        clearInterval(activeStreamTimerRef.current);
        activeStreamTimerRef.current = null;
        if (activeStreamingMsgRef.current) {
          const prevItem = activeStreamingMsgRef.current;
          setMessages((prev) =>
            prev.map((m) => (m.id === prevItem.id ? { ...m, text: prevItem.fullText, isStreaming: false } : m))
          );
        }
      }

      activeStreamingMsgRef.current = { id: msgId, fullText };
      let currentIdx = 0;
      const textLen = fullText.length;
      // Natural typewriter pacing: 1 to 3 characters per tick (~18ms)
      const step = textLen > 250 ? 3 : textLen > 100 ? 2 : 1;
      const tickMs = 18;

      const timer = setInterval(() => {
        currentIdx += step;
        if (currentIdx >= textLen) {
          currentIdx = textLen;
          clearInterval(timer);
          activeStreamTimerRef.current = null;
          activeStreamingMsgRef.current = null;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId ? { ...m, text: fullText, isStreaming: false } : m
            )
          );
          onComplete?.();
        } else {
          const slice = fullText.slice(0, currentIdx);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId ? { ...m, text: slice, isStreaming: true } : m
            )
          );
        }
      }, tickMs);

      activeStreamTimerRef.current = timer;
    },
    []
  );

  // Real-time Firestore sync with doc-ada-chat collection
  useEffect(() => {
    try {
      const chatRef = collection(db, "doc-ada-chat");
      const q = query(chatRef, orderBy("createdAt", "asc"), limit(100));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setIsFirestoreOnline(true);
          if (!snapshot.empty) {
            const firestoreMsgs: Message[] = snapshot.docs.map((docSnap) => {
              const d = docSnap.data();
              return {
                id: docSnap.id,
                sender: d.sender || "doc",
                text: d.text || "",
                time: d.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                motion: d.motion || "idle",
              };
            });

            setMessages((prev) => {
              // Combine and keep optimistic local messages if Firestore hasn't written them yet
              const fsTexts = new Set(firestoreMsgs.map((m) => `${m.sender}:${m.text}`));
              const pendingLocal = prev.filter(
                (m) => (m.id.startsWith("msg-") || m.isStreaming) && !fsTexts.has(`${m.sender}:${m.text}`)
              );
              return [...firestoreMsgs, ...pendingLocal];
            });
          }
        },
        (error) => {
          console.warn("Firestore real-time sync notice (using local cache):", error.message);
          setIsFirestoreOnline(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn("Firestore listener setup error:", err);
    }
  }, []);

  // Load and synchronize system voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        setAvailableVoices(voices);
        setSelectedVoiceURI((prev) => {
          if (prev && voices.some((v) => v.voiceURI === prev)) {
            return prev;
          }
          // Prioritize friendly, natural female English voices
          const preferred =
            voices.find(
              (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Natural") ||
                  v.name.includes("Samantha") ||
                  v.name.includes("Jenny") ||
                  v.name.includes("Aria") ||
                  v.name.includes("Victoria") ||
                  v.name.includes("Karen") ||
                  v.name.includes("Google US English") ||
                  v.name.includes("Zira"))
            ) ||
            voices.find((v) => v.lang.startsWith("en")) ||
            voices[0];
          return preferred ? preferred.voiceURI : "";
        });
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Save voice settings to localStorage
  useEffect(() => {
    try {
      if (selectedVoiceURI) localStorage.setItem("ada_selected_voice_uri", selectedVoiceURI);
      localStorage.setItem("ada_voice_pitch", voicePitch.toString());
      localStorage.setItem("ada_voice_rate", voiceRate.toString());
    } catch (e) {
      console.error(e);
    }
  }, [selectedVoiceURI, voicePitch, voiceRate]);

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("doc_ada_pure_chat", JSON.stringify(messages));
    } catch (e) {
      console.error(e);
    }
  }, [messages]);

  // Voice synthesis (Text-to-Speech) using Doc's selected voice
  const speakText = useCallback(
    (rawText: string) => {
      if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }

      try {
        window.speechSynthesis.cancel();

        // Strip out motion/expression tags and action asterisks, but PRESERVE actual code and command words!
        let cleanToSpeak = rawText
          .replace(/\[motion:[a-zA-Z0-9_-]+\]/gi, "")
          .replace(/\[expression:[a-zA-Z0-9_-]+\]/gi, "")
          // Strip roleplay action asterisks like *waves*, *smiles*, *chuckles*, etc.
          .replace(/\*(?:smiles|waves|giggles|laughs|thinks|sighs|blushes|cheers|hugs|stretches|winks|nods|pouts|yawns|chuckles)[^*]*\*/gi, "")
          // Keep the text inside backticks so spoken voice actually says the command/code words!
          .replace(/`([^`]+)`/g, "$1")
          .replace(/`+/g, "")
          // Strip bold and italic markup while keeping words
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/\*([^*]+)\*/g, "$1")
          // Strip emojis from speech synthesis so the TTS engine doesn't read out "hot beverage, sparkles"
          .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
          // Strip URLs
          .replace(/https?:\/\/\S+/g, "")
          // Clean up multiple spaces/newlines
          .replace(/\s+/g, " ")
          .trim();

        if (!cleanToSpeak) return;

        // Ensure speech synthesis is resumed if suspended
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(cleanToSpeak);
        speechSynthRef.current = utterance;

        // Apply Doc's chosen voice
        const activeVoice =
          availableVoices.find((v) => v.voiceURI === selectedVoiceURI) ||
          availableVoices.find((v) => v.lang.startsWith("en")) ||
          availableVoices[0];

        if (activeVoice) {
          utterance.voice = activeVoice;
        }

        utterance.pitch = voicePitch;
        utterance.rate = voiceRate;

        utterance.onstart = () => {
          setIsSpeaking(true);
          setSpeakingText(cleanToSpeak);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          setSpeakingText("");
          // Return to idle after speech finishes
          setTimeout(() => {
            setAvatarMotion("idle");
            setAvatarMood("warm");
          }, 1200);
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
          setSpeakingText("");
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("TTS Error:", err);
        setIsSpeaking(false);
        setSpeakingText("");
      }
    },
    [voiceEnabled, availableVoices, selectedVoiceURI, voicePitch, voiceRate]
  );

  // Test current or sample voice settings
  const handleTestVoice = (customVoiceURI?: string, customPitch?: number, customRate?: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const testText = "Hi Doc! How do I sound now? Ready to code whenever you are!";
    const utterance = new SpeechSynthesisUtterance(testText);

    const targetURI = customVoiceURI ?? selectedVoiceURI;
    const targetPitch = customPitch ?? voicePitch;
    const targetRate = customRate ?? voiceRate;

    const voice =
      availableVoices.find((v) => v.voiceURI === targetURI) ||
      availableVoices.find((v) => v.lang.startsWith("en")) ||
      availableVoices[0];

    if (voice) utterance.voice = voice;
    utterance.pitch = targetPitch;
    utterance.rate = targetRate;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingText(testText);
      setAvatarMotion("wave");
      setAvatarMood("happy");
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingText("");
      setTimeout(() => setAvatarMotion("idle"), 800);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingText("");
    };

    window.speechSynthesis.speak(utterance);
  };

  // Speech Recognition (Mic Input)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join("");
          setInput(transcript);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Mic start failed", err);
      }
    }
  };

  // Parse motions and clean text
  const parseMotionAndText = (rawInput: any): { cleanText: string; motion: AdaMotion; mood: typeof avatarMood } => {
    let clean = typeof rawInput === "string" 
      ? rawInput 
      : (rawInput && typeof rawInput === "object" ? (rawInput.reply || rawInput.text || JSON.stringify(rawInput)) : String(rawInput || ""));
    let detectedMotion: AdaMotion = "idle";
    let detectedMood: typeof avatarMood = "warm";

    // 1. Tag matches [motion:...]
    const motionMatch = clean.match(/\[motion:([a-zA-Z0-9_-]+)\]/i);
    if (motionMatch) {
      const m = motionMatch[1].toLowerCase() as AdaMotion;
      const validMotions: AdaMotion[] = [
        "idle", "wave", "dance", "cheer", "think", "heart", "cat", "bow", "hug", "stretch", "blush", "highfive"
      ];
      if (validMotions.includes(m)) {
        detectedMotion = m;
      }
      clean = clean.replace(/\[motion:[a-zA-Z0-9_-]+\]/gi, "");
    }

    // 2. Expression matches [expression:...]
    const exprMatch = clean.match(/\[expression:([a-zA-Z0-9_-]+)\]/i);
    if (exprMatch) {
      const e = exprMatch[1].toLowerCase();
      if (e === "happy" || e === "laughing" || e === "joy") detectedMood = "happy";
      else if (e === "surprised") detectedMood = "surprised";
      else if (e === "thinking") detectedMood = "thinking";
      else if (e === "cozy" || e === "relaxed") detectedMood = "cozy";
      clean = clean.replace(/\[expression:[a-zA-Z0-9_-]+\]/gi, "");
    }

    // 3. Fallback heuristic detection from asterisks like *waves*
    if (detectedMotion === "idle") {
      const lower = clean.toLowerCase();
      if (lower.includes("*waves*") || lower.includes("waving")) detectedMotion = "wave";
      else if (lower.includes("*heart*") || lower.includes("hand heart")) detectedMotion = "heart";
      else if (lower.includes("*cheers*") || lower.includes("yay!")) detectedMotion = "cheer";
      else if (lower.includes("*thinks*") || lower.includes("hmm")) detectedMotion = "think";
      else if (lower.includes("*hugs*") || lower.includes("warm hug")) detectedMotion = "hug";
      else if (lower.includes("*stretches*")) detectedMotion = "stretch";
      else if (lower.includes("*blushes*")) detectedMotion = "blush";
      else if (lower.includes("*dances*")) detectedMotion = "dance";
      else if (lower.includes("*high five*") || lower.includes("high-five")) detectedMotion = "highfive";
    }

    // Clean roleplay asterisks so typed text and spoken TTS stay 100% synchronized
    clean = clean
      .replace(/\*(?:smiles|waves|giggles|laughs|thinks|sighs|blushes|cheers|hugs|stretches|winks|nods|pouts|yawns|chuckles)[^*]*\*/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return { cleanText: clean, motion: detectedMotion, mood: detectedMood };
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userText = input.trim();
    setInput("");

    const userMsg: Message = {
      id: "msg-" + Date.now(),
      sender: "doc",
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setAvatarMood("listening");

    // Write Doc's message to Firestore doc-ada-chat
    try {
      addDoc(collection(db, "doc-ada-chat"), {
        sender: "doc",
        text: userText,
        time: userMsg.time,
        createdAt: serverTimestamp(),
      }).catch((err) => console.warn("Firestore send notice:", err));
    } catch (e) {
      console.warn("Firestore write notice:", e);
    }

    try {
      const historyPayload = messages
        .slice(-10)
        .filter((m) => m.text && !m.text.includes("Connected and steady") && !m.text.includes("Just caught my breath"))
        .map((m) => ({
          role: m.sender === "doc" ? ("user" as const) : ("model" as const),
          text: m.text,
        }));

      const res = await fetch("/api/sanctuary/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: historyPayload,
          memories,
          userDisplayName: "Doc",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawReply = (data && (typeof data.reply === "string" ? data.reply : (typeof data.text === "string" ? data.text : ""))) || "I'm right here with you, Doc!";
        const { cleanText, motion, mood } = parseMotionAndText(rawReply);

        setAvatarMotion(motion);
        setAvatarMood(mood);

        const adaMsgId = "msg-" + (Date.now() + 1);
        const adaMsg: Message = {
          id: adaMsgId,
          sender: "ada",
          text: "",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          motion,
          isStreaming: true,
        };

        setMessages((prev) => [...prev, adaMsg]);
        setIsTyping(false);
        speakText(cleanText);

        streamTypewriter(adaMsgId, cleanText, () => {
          // Write completed Ada reply to Firestore doc-ada-chat once typed out
          try {
            addDoc(collection(db, "doc-ada-chat"), {
              sender: "ada",
              text: cleanText,
              time: adaMsg.time,
              motion,
              createdAt: serverTimestamp(),
            }).catch((err) => console.warn("Firestore Ada reply notice:", err));
          } catch (e) {
            console.warn("Firestore Ada write notice:", e);
          }
        });
      } else {
        const errorData = await res.json().catch(() => null);
        const serverErrorMsg = errorData?.reply || errorData?.text || "I had a momentary connection hiccup reaching the cloud! Can you send that once more, Doc?";
        const { cleanText, motion, mood } = parseMotionAndText(serverErrorMsg);
        setAvatarMotion(motion);
        setAvatarMood(mood);

        const fallbackId = "msg-" + (Date.now() + 1);
        const fallbackMsg: Message = {
          id: fallbackId,
          sender: "ada",
          text: "",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          motion,
          isStreaming: true,
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        setIsTyping(false);
        speakText(cleanText);
        streamTypewriter(fallbackId, cleanText);
      }
    } catch (err: any) {
      console.error("DocAndAdaChat send error:", err);
      const fallbackText = "I had a momentary connection hiccup reaching the cloud! Can you send that once more, Doc?";
      const fallbackId = "msg-" + (Date.now() + 1);
      const fallbackMsg: Message = {
        id: fallbackId,
        sender: "ada",
        text: "",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      setIsTyping(false);
      speakText(fallbackText);
      streamTypewriter(fallbackId, fallbackText);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClear = () => {
    // Smooth reset without ugly browser popup
    setMessages([
      {
        id: "init-" + Date.now(),
        sender: "ada",
        text: "Clean slate! Just you and me. What's on your mind, Doc?",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setAvatarMotion("wave");
    setTimeout(() => setAvatarMotion("idle"), 2500);
  };

  const handleExport = () => {
    const textContent = messages
      .map((m) => `[${m.time}] ${m.sender === "doc" ? "Doc" : "Ada"}: ${m.text}`)
      .join("\n\n");
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doc-and-ada-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`w-full max-w-7xl mx-auto flex flex-col h-[calc(100vh-68px)] p-2 sm:p-4 ${
        theme === "warm" ? "text-stone-100" : "text-slate-100"
      }`}
    >
      {/* Top Header Card */}
      <div
        className={`px-4 py-2.5 rounded-2xl border flex items-center justify-between mb-3 shadow-sm ${
          theme === "warm"
            ? "bg-stone-900/80 border-stone-800"
            : "bg-slate-900/80 border-slate-800"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm shadow-sm">
              Ada
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-stone-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-white">Doc & Ada</h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/50 text-amber-300">
                2D Anime VTuber
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isFirestoreOnline
                    ? "bg-emerald-950/80 border-emerald-600/60 text-emerald-400"
                    : "bg-amber-950/80 border-amber-600/60 text-amber-400"
                }`}
                title="Google Cloud Firestore Real-Time Storage"
              >
                <Database className="w-2.5 h-2.5" />
                <span>{isFirestoreOnline ? "Firestore Stored ☁️" : "Local Cache"}</span>
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Interactive 2D Anime VTuber · Real-Time Lip-Sync · Cloud Firestore Sync
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 text-xs">
          {/* Quick Direct Fireside Hearth Switcher with Spark */}
          {onOpenHearth && (
            <button
              onClick={onOpenHearth}
              title="Visit Spark by the Fireside Hearth"
              className="px-2.5 py-1.5 rounded-xl border bg-amber-950/60 border-amber-700/60 text-amber-300 hover:text-white hover:bg-amber-800/80 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Fireside Hearth</span>
            </button>
          )}

          {/* Avatar Window Size Switcher (only shown when avatar is visible) */}
          {showAvatar && (
            <button
              onClick={() =>
                setAvatarSize(
                  avatarSize === "large"
                    ? "wide"
                    : avatarSize === "wide"
                    ? "standard"
                    : "large"
                )
              }
              title="Switch Avatar Size (58% / 70% / 48%)"
              className="px-2.5 py-1.5 rounded-xl border bg-stone-900 border-stone-800 hover:border-amber-600/60 text-stone-300 hover:text-amber-400 transition-all cursor-pointer hidden md:flex items-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>
                {avatarSize === "large"
                  ? "58% Large"
                  : avatarSize === "wide"
                  ? "70% Wide"
                  : "48% Split"}
              </span>
            </button>
          )}

          {/* Avatar Visibility Toggle */}
          <button
            onClick={() => setShowAvatar(!showAvatar)}
            className={`px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              showAvatar
                ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
            }`}
            title="Toggle 2D VTuber Avatar"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showAvatar ? "Hide Avatar" : "Show Avatar"}</span>
          </button>

          {/* Voice Settings Button */}
          <button
            onClick={() => setShowVoiceModal(true)}
            className="px-2.5 py-1.5 rounded-xl border bg-stone-900 border-stone-800 hover:border-amber-500/60 text-stone-300 hover:text-amber-400 transition-all cursor-pointer flex items-center gap-1.5"
            title="Configure Ada's Voice & Tuning"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Voice Studio</span>
          </button>

          {/* Voice Toggle */}
          <button
            onClick={() => {
              if (voiceEnabled) {
                window.speechSynthesis?.cancel();
                setIsSpeaking(false);
              }
              setVoiceEnabled(!voiceEnabled);
            }}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              voiceEnabled
                ? "bg-emerald-950/60 border-emerald-600/60 text-emerald-400"
                : "bg-stone-900 border-stone-800 text-stone-500"
            }`}
            title={voiceEnabled ? "Voice Output Active" : "Voice Output Muted"}
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Theme */}
          <button
            onClick={() => setTheme(theme === "warm" ? "night" : "warm")}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 transition-colors cursor-pointer"
            title="Toggle theme"
          >
            <Coffee className="w-3.5 h-3.5" />
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white transition-colors cursor-pointer"
            title="Save conversation"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clean Slate */}
          <button
            onClick={handleClear}
            className="p-2 rounded-xl bg-stone-900 hover:bg-rose-950/60 border border-stone-800 hover:border-rose-800/60 text-stone-400 hover:text-rose-300 transition-colors cursor-pointer"
            title="Reset conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Workspace (Dual Pane: 2D VTuber on Left, Chat on Right) */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-0 overflow-y-auto md:overflow-hidden">
        {/* Left Side: 2D Anime VTuber Stage */}
        {showAvatar && (
          <div
            className={`w-full ${
              avatarSize === "wide"
                ? "md:w-[58%] lg:w-[66%]"
                : avatarSize === "large"
                ? "md:w-[48%] lg:w-[54%]"
                : "md:w-[38%] lg:w-[44%]"
            } h-[260px] sm:h-[320px] md:h-full shrink-0 md:shrink rounded-2xl border border-stone-800 bg-stone-950/90 overflow-hidden flex flex-col relative shadow-md transition-all duration-300`}
          >
            <div className="flex-1 relative w-full h-full">
              <Ada3DVTuber
                isSpeaking={isSpeaking}
                speakingText={speakingText}
                mood={avatarMood}
                motion={avatarMotion}
                onMotionChange={(m) => setAvatarMotion(m)}
                compact={false}
                className="w-full h-full"
              />
            </div>
          </div>
        )}

        {/* Right Side: Chat Stream & Message Input */}
        <div className="flex-1 min-h-[340px] md:min-h-0 flex flex-col rounded-2xl border border-stone-800 bg-stone-950/70 overflow-hidden shadow-md">
          {/* Tux Jr. Companion Bar */}
          <div
            className={`px-4 py-2 border-b text-xs flex items-center justify-between ${
              theme === "warm"
                ? "bg-amber-950/20 border-amber-900/30"
                : "bg-slate-950 border-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setTuxMood(
                    tuxMood === "happy" ? "snuggle" : tuxMood === "snuggle" ? "cocoa" : "happy"
                  )
                }
                className="text-base cursor-pointer hover:scale-110 transition-transform"
                title="Click to interact with Tux Jr.!"
              >
                🐧
              </button>
              <span className="text-[11px] text-stone-400">
                Tux Jr. is{" "}
                <strong className="text-amber-300 font-normal">
                  {tuxMood === "happy" && "waving happily with a cookie 🍪"}
                  {tuxMood === "snuggle" && "snuggling up in a warm scarf 🧣"}
                  {tuxMood === "cocoa" && "sipping hot chocolate by the hearth ☕"}
                </strong>
              </span>
            </div>
            {messages.some((m) => m.isStreaming) ? (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-mono animate-pulse">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Ada is typing back... 💻✨</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                <Zap className="w-3 h-3 fill-emerald-400" />
                <span>Free Tier Paced</span>
              </div>
            )}
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => {
              const isDoc = m.sender === "doc";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isDoc ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-stone-400">
                      {isDoc ? "Doc" : "Ada ✨"}
                    </span>
                    <span className="text-[10px] text-stone-500">{m.time}</span>
                    {m.motion && m.motion !== "idle" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                        {m.motion}
                      </span>
                    )}
                    {m.isStreaming && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono animate-pulse">
                        typing...
                      </span>
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      isDoc
                        ? "bg-amber-600 text-white rounded-br-sm"
                        : "bg-stone-900 border border-stone-800 text-stone-200 rounded-bl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">
                      {m.text}
                      {m.isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse align-middle rounded-xs" />
                      )}
                    </p>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[11px] font-semibold text-stone-400">Ada ✨</span>
                  <span className="text-[10px] text-stone-500">thinking...</span>
                </div>
                <div className="bg-stone-900 border border-stone-800 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-amber-400 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div
            className={`p-3 sm:p-4 border-t ${
              theme === "warm"
                ? "bg-stone-900/80 border-stone-800"
                : "bg-slate-900/80 border-slate-800"
            }`}
          >
            <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
              {/* Mic Input */}
              <button
                type="button"
                onClick={toggleMic}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  isListening
                    ? "bg-rose-600 text-white border-rose-500 animate-pulse"
                    : "bg-stone-950 border-stone-800 text-stone-400 hover:text-white"
                }`}
                title={isListening ? "Listening... click to stop" : "Speak to Ada"}
              >
                {isListening ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isListening
                    ? "Listening to your voice..."
                    : "Type your message to Ada here... (Press Enter to send)"
                }
                className="flex-1 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none transition-colors shadow-inner"
                autoFocus
              />

              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="px-5 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-2xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Voice Tuning Studio Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-stone-100 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Ada's Voice Studio</h3>
                  <p className="text-xs text-stone-400">Choose her voice, pitch, and speaking speed</p>
                </div>
              </div>
              <button
                onClick={() => setShowVoiceModal(false)}
                className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
                title="Close Voice Studio"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voice Dropdown */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-300">
                <span>Select Voice Engine</span>
                <span className="text-[11px] text-amber-400 font-normal">
                  {availableVoices.length > 0
                    ? `${availableVoices.length} browser voices available`
                    : "Detecting system voices..."}
                </span>
              </div>
              <select
                value={selectedVoiceURI}
                onChange={(e) => {
                  setSelectedVoiceURI(e.target.value);
                  handleTestVoice(e.target.value);
                }}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none transition-colors cursor-pointer"
              >
                {/* Group English voices first */}
                <optgroup label="English Voices (Recommended)">
                  {availableVoices
                    .filter((v) => v.lang.startsWith("en"))
                    .map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                </optgroup>
                {/* Other language voices */}
                {availableVoices.filter((v) => !v.lang.startsWith("en")).length > 0 && (
                  <optgroup label="Other Installed Voices">
                    {availableVoices
                      .filter((v) => !v.lang.startsWith("en"))
                      .map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-300">Quick Voice Presets</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Sweet & Warm", pitch: 1.15, rate: 1.02 },
                  { label: "Soft Anime", pitch: 1.28, rate: 1.05 },
                  { label: "Calm Natural", pitch: 1.0, rate: 0.98 },
                  { label: "Energetic", pitch: 1.18, rate: 1.14 },
                ].map((preset) => {
                  const isActive =
                    Math.abs(voicePitch - preset.pitch) < 0.02 &&
                    Math.abs(voiceRate - preset.rate) < 0.02;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setVoicePitch(preset.pitch);
                        setVoiceRate(preset.rate);
                        handleTestVoice(selectedVoiceURI, preset.pitch, preset.rate);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer text-center ${
                        isActive
                          ? "bg-amber-600/30 border-amber-500 text-amber-300"
                          : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fine-Tuning Sliders */}
            <div className="space-y-3 bg-stone-950/60 p-3.5 rounded-2xl border border-stone-800/80">
              {/* Pitch Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-medium">Voice Pitch</span>
                  <span className="font-mono text-amber-400 font-bold">{voicePitch.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.6"
                  step="0.05"
                  value={voicePitch}
                  onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-stone-500">
                  <span>Deeper</span>
                  <span>Natural (1.0)</span>
                  <span>Playful / Anime</span>
                </div>
              </div>

              {/* Speed Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-medium">Speaking Speed (Rate)</span>
                  <span className="font-mono text-amber-400 font-bold">{voiceRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.4"
                  step="0.05"
                  value={voiceRate}
                  onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-stone-500">
                  <span>Slower</span>
                  <span>Normal (1.0)</span>
                  <span>Faster</span>
                </div>
              </div>
            </div>

            {/* Actions: Test Voice & Close */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleTestVoice()}
                className="px-4 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 text-amber-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-amber-400" />
                <span>Test Voice Sample</span>
              </button>

              <button
                type="button"
                onClick={() => setShowVoiceModal(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
