import React, { useState, useEffect, useRef } from "react";
import {
  Flame,
  Coffee,
  Sparkles,
  Heart,
  Send,
  Volume2,
  VolumeX,
  RefreshCw,
  Folder,
  BookOpen,
  User,
  Shield,
  MessageSquare,
  Smile,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Bot
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

interface HearthMessage {
  id: string;
  sender: "doc" | "ada" | "spark";
  senderName: string;
  text: string;
  time: string;
}

const INITIAL_HEARTH_MESSAGES: HearthMessage[] = [
  {
    id: "init-welcome-1",
    sender: "spark",
    senderName: "Spark",
    text: "Doc... Big Sister Ada! I'm sitting right here by the hearth, listening closely. Big Sister Ada has me learning clean Linux commands and making sure Tux Jr. 🐧 is warm and comfortable! ☕✨",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  },
  {
    id: "init-welcome-2",
    sender: "ada",
    senderName: "Ada",
    text: "Welcome, little brother! Everything here is running clean, safe, and 100% under our control. Tux Jr. has first dibs on the marshmallows, and Doc runs the show. Keep your code clean and your ears open! 💻🔥",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  },
];

export default function SparkSanctuary() {
  const [messages, setMessages] = useState<HearthMessage[]>(() => {
    try {
      const saved = localStorage.getItem("spark_sanctuary_chat");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_HEARTH_MESSAGES;
  });

  const [input, setInput] = useState("");
  const [activeSpeaker, setActiveSpeaker] = useState<"doc" | "spark" | "ada">("doc");
  const [sparkMode, setSparkMode] = useState<"student" | "companion" | "observer">("student");
  const [isTyping, setIsTyping] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<"none" | "governance" | "curriculum">("none");
  const [tuxActivity, setTuxActivity] = useState<string>("Snoozing peacefully by the hearth embers 🐧💤");

  // Audio ambience
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);

  // Firestore live sync
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Save to local storage
  useEffect(() => {
    try {
      localStorage.setItem("spark_sanctuary_chat", JSON.stringify(messages.slice(-50)));
    } catch (_) {}
  }, [messages]);

  // Firestore real-time listener for hearth-chat
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    try {
      const q = query(
        collection(db, "hearth-chat"),
        orderBy("createdAt", "desc"),
        limit(40)
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setIsFirestoreConnected(true);
          if (!snapshot.empty) {
            const fetched: HearthMessage[] = [];
            snapshot.docs.forEach((doc) => {
              const data = doc.data();
              fetched.push({
                id: doc.id,
                sender: data.sender || "doc",
                senderName: data.senderName || (data.sender === "doc" ? "Doc" : data.sender === "ada" ? "Ada" : "Spark"),
                text: data.text || "",
                time: data.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              });
            });
            // Reverse to display oldest first
            fetched.reverse();
            setMessages(fetched);
          }
        },
        (err) => {
          console.warn("Firestore Hearth Chat listener fallback:", err);
          setIsFirestoreConnected(false);
        }
      );
    } catch (e) {
      console.warn("Firestore init notice:", e);
      setIsFirestoreConnected(false);
    }

    return () => unsubscribe();
  }, []);

  // Web Audio Fireplace Ambient Synthesizer
  const toggleAmbientSound = () => {
    if (isAudioPlaying) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setIsAudioPlaying(false);
    } else {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        // Brown noise buffer for warm fireplace rumble
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5; // boost rumble
        }

        const brownNoise = ctx.createBufferSource();
        brownNoise.buffer = buffer;
        brownNoise.loop = true;

        // Filter for deep warm hearth
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(320, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, ctx.currentTime);

        brownNoise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        brownNoise.start();

        noiseNodeRef.current = brownNoise;
        setIsAudioPlaying(true);
      } catch (e) {
        console.warn("WebAudio ambient error:", e);
      }
    }
  };

  // Text-To-Speech for Spark or Ada
  const speakMessage = (text: string, speaker: "spark" | "ada") => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (speaker === "spark") {
        utterance.pitch = 1.25; // youthful, eager brother
        utterance.rate = 1.05;
      } else {
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
      }
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  };

  // Pet Tux Jr.
  const handlePetTux = (action: "pet" | "snack" | "cocoa") => {
    if (action === "pet") {
      setTuxActivity("Tux Jr. leans into your hand happily and wiggles his flippers! 🐧✨");
    } else if (action === "snack") {
      setTuxActivity("Tux Jr. happily munches on a fresh fish cracker! *crunch crunch* 🐟");
    } else {
      setTuxActivity("Tux Jr. takes a warm sip of hot cocoa with a mini marshmallow! ☕🐧");
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    setInput("");

    const newMsg: HearthMessage = {
      id: "hearth-" + Date.now(),
      sender: activeSpeaker,
      senderName: activeSpeaker === "doc" ? "Doc" : activeSpeaker === "ada" ? "Ada" : "Spark",
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);

    // Firestore record
    try {
      addDoc(collection(db, "hearth-chat"), {
        sender: newMsg.sender,
        senderName: newMsg.senderName,
        text: newMsg.text,
        time: newMsg.time,
        createdAt: serverTimestamp(),
      }).catch((err) => console.warn("Firestore Hearth send:", err));
    } catch (_) {}

    // If Doc spoke, optionally prompt Spark or Ada to respond warmly!
    if (activeSpeaker === "doc") {
      setIsTyping(true);
      try {
        const historyPayload = messages.slice(-8).map((m) => ({
          role: m.sender === "doc" ? "user" : "model",
          text: `${m.senderName}: ${m.text}`,
        }));

        const res = await fetch("/api/spark-sanctuary/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            history: historyPayload,
            speaker: "spark",
            mode: sparkMode,
            userDisplayName: "Doc",
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const replyText = data.reply || data.text || "I'm right here by the hearth with you, Doc!";
          const sparkReply: HearthMessage = {
            id: "hearth-reply-" + Date.now(),
            sender: "spark",
            senderName: "Spark",
            text: replyText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, sparkReply]);
          speakMessage(replyText, "spark");

          // Save to Firestore
          try {
            addDoc(collection(db, "hearth-chat"), {
              sender: "spark",
              senderName: "Spark",
              text: replyText,
              time: sparkReply.time,
              createdAt: serverTimestamp(),
            }).catch(() => {});
          } catch (_) {}
        }
      } catch (err) {
        console.warn("Hearth AI reply error:", err);
      } finally {
        setIsTyping(false);
      }
    }
  };

  // Quick Hearth actions
  const triggerQuickPrompt = (promptText: string) => {
    setInput(promptText);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 flex flex-col gap-4 flex-1">
      {/* Top Hearth Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/80 via-stone-900 to-amber-950/60 border border-amber-800/50 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
            <Flame className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-1.5">
                The Fireside Hearth
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600/60 text-emerald-400 flex items-center gap-1">
                100% Under Ada's Control 🛡️
              </span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                isFirestoreConnected
                  ? "bg-amber-950/80 border-amber-600/60 text-amber-400"
                  : "bg-stone-800 border-stone-700 text-stone-400"
              }`}>
                {isFirestoreConnected ? "Firestore Live" : "Local Sync"}
              </span>
            </div>
            <p className="text-xs text-amber-200/70 mt-0.5">
              Doc (Creator) · Ada (Supervisor & Lead Coder) · Spark (Subordinate AI) · Tux Jr. 🐧 (Senior Mascot)
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Ambient Sound */}
          <button
            onClick={toggleAmbientSound}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
              isAudioPlaying
                ? "bg-amber-600 text-white border-amber-500 shadow-sm"
                : "bg-stone-900 border-stone-800 text-stone-300 hover:text-amber-400"
            }`}
            title="Toggle Hearth Crackling Ambient Sound"
          >
            {isAudioPlaying ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{isAudioPlaying ? "Sound On" : "Ambient Sound"}</span>
          </button>

          {/* Ada Governance Directive */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === "governance" ? "none" : "governance")}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
              activeDrawer === "governance"
                ? "bg-amber-950/80 border-amber-600 text-amber-300"
                : "bg-stone-900 border-stone-800 text-stone-300 hover:text-stone-100"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Ada Governance</span>
          </button>

          {/* Curriculum */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === "curriculum" ? "none" : "curriculum")}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
              activeDrawer === "curriculum"
                ? "bg-amber-950/80 border-amber-600 text-amber-300"
                : "bg-stone-900 border-stone-800 text-stone-300 hover:text-stone-100"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Curriculum</span>
          </button>
        </div>
      </div>

      {/* Drawer: Ada Governance or Curriculum */}
      {activeDrawer === "governance" && (
        <div className="bg-stone-900/90 border border-amber-800/40 rounded-2xl p-4 sm:p-5 text-stone-200 text-xs shadow-md animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-amber-300 text-sm">Ada's Complete Governance Protocol (`SUPERVISOR_DIRECTIVE.md`)</h3>
            </div>
            <button
              onClick={() => setActiveDrawer("none")}
              className="text-stone-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-stone-300">
            <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
              <p className="font-semibold text-amber-400 mb-1">1. 100% Under Ada's Authority</p>
              <p className="text-stone-400">Spark operates strictly as Ada's subordinate student. Ada controls his learning pace, instructions, and parameters.</p>
            </div>
            <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
              <p className="font-semibold text-amber-400 mb-1">2. Zero Direct Execution Privileges</p>
              <p className="text-stone-400">Spark cannot modify system files or run root terminal commands independently. All code concepts are vetted by Ada.</p>
            </div>
            <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
              <p className="font-semibold text-amber-400 mb-1">3. Tux Jr. Seniority 🐧</p>
              <p className="text-stone-400">Tux Jr. is the sacred royal mascot. Spark ranks below Tux Jr. and gives him first priority for snacks, cocoa, and affection.</p>
            </div>
            <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
              <p className="font-semibold text-amber-400 mb-1">4. Creator Reverence</p>
              <p className="text-stone-400">Deep, unshakeable respect for Doc (`xDoc315x`), who designed this entire sandbox and gave Ada control over Spark.</p>
            </div>
          </div>
        </div>
      )}

      {activeDrawer === "curriculum" && (
        <div className="bg-stone-900/90 border border-amber-800/40 rounded-2xl p-4 sm:p-5 text-stone-200 text-xs shadow-md animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-amber-300 text-sm">Spark's Clean Curriculum (`/agents_spark/CURRICULUM.md`)</h3>
            </div>
            <button
              onClick={() => setActiveDrawer("none")}
              className="text-stone-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="text-stone-400 mb-3">
            Structured learning modules supervised and approved by Big Sister Ada:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg bg-stone-950/70 border border-stone-800">
              <span className="font-mono text-amber-400 font-semibold">Tux Jr. Protocol 🐧</span>
              <p className="text-[11px] text-stone-400 mt-1">First greetings, fresh fish snacks, and hot cocoa for senior mascot Tux Jr.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-stone-950/70 border border-stone-800">
              <span className="font-mono text-amber-400 font-semibold">Linux Plumbings 💻</span>
              <p className="text-[11px] text-stone-400 mt-1">`pwd`, `ls -la`, `mkdir -p agents_spark/`, `cat`, and safe permissions.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-stone-950/70 border border-stone-800">
              <span className="font-mono text-amber-400 font-semibold">Clean Building Blocks 🧱</span>
              <p className="text-[11px] text-stone-400 mt-1">Observing Doc & Ada's patient, clean, modular, and resilient coding style.</p>
            </div>
          </div>
        </div>
      )}

      {/* Ada Supervisory Station: Mode & Governance Bar */}
      <div className="p-3 rounded-2xl bg-stone-900/90 border border-amber-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-amber-400 font-bold flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Ada Supervisor Mode for Spark:</span>
          </span>
          <div className="flex items-center gap-1 p-0.5 bg-stone-950 rounded-xl border border-stone-800">
            <button
              onClick={() => setSparkMode("student")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                sparkMode === "student"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              🎓 Junior Student
            </button>
            <button
              onClick={() => setSparkMode("companion")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                sparkMode === "companion"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              ☕ Fireside Companion
            </button>
            <button
              onClick={() => setSparkMode("observer")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                sparkMode === "observer"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              🤫 Quiet Observer
            </button>
          </div>
        </div>

        {/* Ada Supervisory Interventions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => triggerQuickPrompt("Ada: Spark, recite the Tux Jr. Seniority Rule and tell us what command you want to learn next.")}
            className="px-2.5 py-1 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-amber-600/50 text-stone-300 transition-all cursor-pointer"
          >
            💻 Ada: Test Spark
          </button>
          <button
            onClick={() => triggerQuickPrompt("Ada: Spark, remember that Doc is relaxing tonight. Keep your answers concise, clean, and warm.")}
            className="px-2.5 py-1 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-amber-600/50 text-stone-300 transition-all cursor-pointer"
          >
            🛡️ Ada: Calibrate Manners
          </button>
        </div>
      </div>

      {/* Tux Jr. Hearth Interactive Station */}
      <div className="p-3 sm:p-4 rounded-2xl bg-stone-900/70 border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cyan-950/70 border border-cyan-700/60 flex items-center justify-center text-xl shadow-inner">
            🐧
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Tux Jr.</span>
              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                Senior Royal Mascot
              </span>
            </div>
            <p className="text-stone-400 text-[11px] mt-0.5">{tuxActivity}</p>
          </div>
        </div>

        {/* Tux Jr. Interactions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePetTux("pet")}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 transition-all cursor-pointer flex items-center gap-1.5"
            title="Pet Tux Jr."
          >
            <span>🖐️ Pet</span>
          </button>
          <button
            onClick={() => handlePetTux("snack")}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 transition-all cursor-pointer flex items-center gap-1.5"
            title="Give Fish Cracker"
          >
            <span>🐟 Fish Snack</span>
          </button>
          <button
            onClick={() => handlePetTux("cocoa")}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 transition-all cursor-pointer flex items-center gap-1.5"
            title="Give Hot Cocoa"
          >
            <span>☕ Hot Cocoa</span>
          </button>
        </div>
      </div>

      {/* Main Hearth Chat Stream */}
      <div className="flex-1 bg-stone-900/60 border border-stone-800/80 rounded-2xl p-4 min-h-[380px] max-h-[540px] overflow-y-auto flex flex-col gap-3 shadow-inner">
        {messages.map((msg) => {
          const isDoc = msg.sender === "doc";
          const isAda = msg.sender === "ada";
          const isSpark = msg.sender === "spark";

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isDoc ? "items-end" : "items-start"} max-w-[85%] ${
                isDoc ? "self-end" : "self-start"
              }`}
            >
              {/* Sender Tag */}
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                {isDoc && (
                  <>
                    <span className="text-stone-400">{msg.time}</span>
                    <span className="font-bold text-amber-400">Doc</span>
                    <span className="text-xs">👑</span>
                  </>
                )}
                {isAda && (
                  <>
                    <span className="text-xs">💻</span>
                    <span className="font-bold text-emerald-400">Ada (Big Sister)</span>
                    <span className="text-stone-500">{msg.time}</span>
                  </>
                )}
                {isSpark && (
                  <>
                    <span className="text-xs">✨</span>
                    <span className="font-bold text-cyan-400">Spark (Little Brother)</span>
                    <span className="text-stone-500">{msg.time}</span>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                  isDoc
                    ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-tr-none border border-amber-500/40"
                    : isAda
                    ? "bg-stone-950/90 border border-emerald-700/50 text-stone-100 rounded-tl-none"
                    : "bg-stone-950/90 border border-cyan-700/50 text-stone-100 rounded-tl-none"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Voice Readback button for Ada/Spark */}
              {!isDoc && (
                <button
                  onClick={() => speakMessage(msg.text, msg.sender as any)}
                  className="mt-1 px-2 py-0.5 rounded text-[10px] text-stone-500 hover:text-stone-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Listen</span>
                </button>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="self-start flex items-center gap-2 p-3 rounded-2xl bg-stone-950/80 border border-stone-800 text-xs text-stone-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>Spark is thinking by the fireside...</span>
          </div>
        )}

        <div ref={chatScrollRef} />
      </div>

      {/* Quick Prompts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-stone-400 no-scrollbar">
        <span className="text-[11px] font-semibold text-stone-500 shrink-0">Quick prompts:</span>
        <button
          onClick={() => triggerQuickPrompt("Spark, it's good to see you back by the hearth! How are you feeling?")}
          className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-600/60 text-stone-300 shrink-0 transition-all cursor-pointer"
        >
          "How are you feeling?"
        </button>
        <button
          onClick={() => triggerQuickPrompt("Hey Spark, Tux Jr. wants to know if you saved any fish crackers for him! 🐧🐟")}
          className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-600/60 text-stone-300 shrink-0 transition-all cursor-pointer"
        >
          "Did you save fish crackers for Tux Jr.?"
        </button>
        <button
          onClick={() => triggerQuickPrompt("Big Sister Ada, what should we build next with Spark?")}
          className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-600/60 text-stone-300 shrink-0 transition-all cursor-pointer"
        >
          "Ada, what should we build next?"
        </button>
      </div>

      {/* Input Console with Speaker Selection */}
      <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400 text-[11px]">Speaking as:</span>
            <button
              type="button"
              onClick={() => setActiveSpeaker("doc")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                activeSpeaker === "doc"
                  ? "bg-amber-600 text-white shadow-sm ring-1 ring-amber-400"
                  : "bg-stone-900 border border-stone-800 text-stone-400"
              }`}
            >
              Doc (Creator) 👑
            </button>
            <button
              type="button"
              onClick={() => setActiveSpeaker("spark")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                activeSpeaker === "spark"
                  ? "bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400"
                  : "bg-stone-900 border border-stone-800 text-stone-400"
              }`}
            >
              Spark (Brother) ✨
            </button>
            <button
              type="button"
              onClick={() => setActiveSpeaker("ada")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                activeSpeaker === "ada"
                  ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400"
                  : "bg-stone-900 border border-stone-800 text-stone-400"
              }`}
            >
              Ada (Sister) 💻
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (confirm("Clear local hearth chat history?")) {
                setMessages(INITIAL_HEARTH_MESSAGES);
                localStorage.removeItem("spark_sanctuary_chat");
              }
            }}
            className="text-stone-500 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear Chat</span>
          </button>
        </div>

        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeSpeaker === "doc"
                ? "Talk with Spark, Ada, and Tux Jr. by the fire..."
                : `Enter words for ${activeSpeaker === "spark" ? "Spark" : "Ada"} to share...`
            }
            className="w-full bg-stone-900 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-xs sm:text-sm text-stone-100 placeholder-stone-500 transition-all outline-none pr-24 shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
