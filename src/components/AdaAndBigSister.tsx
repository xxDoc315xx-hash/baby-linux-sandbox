import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Ada3DVTuber, AdaMotion } from "./Ada3DVTuber";
import {
  Send,
  Volume2,
  VolumeX,
  Download,
  Trash2,
  Copy,
  Check,
  Loader2,
  Bot,
  User,
  Sparkles,
  Code2,
  BookOpen,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import GoogleAIStudioHub from "./GoogleAIStudioHub";

type ChatTarget = "duo" | "docs_ai" | "ada";

interface ChatMessage {
  id: string;
  sender: "user" | "ada" | "big-sister" | "system";
  text: string;
  timestamp: number;
  motion?: AdaMotion;
}

interface AdaAndBigSisterProps {
  currentUserEmail?: string;
  nickname?: string;
}

export default function AdaAndBigSister({
  currentUserEmail = "xxDoc315xx@hotmail.com",
  nickname = "Doc"
}: AdaAndBigSisterProps) {
  // Navigation: Chat vs SDK Hub
  const [activeTab, setActiveTab] = useState<"chat" | "sdk_hub">("chat");

  // Core Chat State
  const [target, setTarget] = useState<ChatTarget>("duo");
  const [inputText, setInputText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 3D Avatar Presence (Clean & Active by default)
  const [showAvatar, setShowAvatar] = useState<boolean>(true);
  const [adaMotion, setAdaMotion] = useState<AdaMotion>("idle");
  const [adaSpeaking, setAdaSpeaking] = useState<boolean>(false);

  // Audio / Speech
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Firestore & LocalStorage Sync
  const storageKey = `ada_docs_ai_clean_chat_${currentUserEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const firestoreDocId = `sister_haven_${currentUserEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;

  // Initial Load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        } else {
          loadDefaultMessages();
        }
      } else {
        loadDefaultMessages();
      }
    } catch {
      loadDefaultMessages();
    }

    // Real-time Firestore sync
    try {
      const chatDocRef = doc(db, "ada-sister-haven", firestoreDocId);
      const unsubscribe = onSnapshot(
        chatDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data?.messages) && data.messages.length > 0) {
              setMessages(data.messages);
              localStorage.setItem(storageKey, JSON.stringify(data.messages));
            }
          }
        },
        (err) => {
          console.warn("Firestore sync notice:", err.message);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore listener setup error:", e);
    }
  }, [firestoreDocId, storageKey]);

  const loadDefaultMessages = () => {
    const defaults: ChatMessage[] = [
      {
        id: "msg-init-docs",
        sender: "big-sister",
        text: `Docs_AI online for ${nickname}. Direct factual analysis and intelligence ready.`,
        timestamp: Date.now() - 20000
      },
      {
        id: "msg-init-ada",
        sender: "ada",
        text: `Hey ${nickname}! Ada here—ready to write code, review the architecture, or build whatever you have in mind.`,
        timestamp: Date.now() - 10000,
        motion: "wave"
      }
    ];
    setMessages(defaults);
    localStorage.setItem(storageKey, JSON.stringify(defaults));
  };

  const saveMessages = async (updated: ChatMessage[]) => {
    setMessages(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {}

    try {
      const chatDocRef = doc(db, "ada-sister-haven", firestoreDocId);
      await setDoc(
        chatDocRef,
        {
          messages: updated,
          lastUpdated: serverTimestamp(),
          userEmail: currentUserEmail,
          userName: nickname
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Could not sync messages to Firestore:", err);
    }
  };

  // Text-to-Speech
  const speak = (text: string, voiceType: "ada" | "docs_ai") => {
    if (!speechEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = voiceType === "ada" ? 1.15 : 0.95;
      utterance.rate = voiceType === "ada" ? 1.05 : 1.0;
      utterance.onstart = () => {
        if (voiceType === "ada") setAdaSpeaking(true);
      };
      utterance.onend = () => {
        if (voiceType === "ada") setAdaSpeaking(false);
      };
      utterance.onerror = () => {
        if (voiceType === "ada") setAdaSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  };

  // Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isGenerating) return;

    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMsg: ChatMessage = {
      id: "usr-" + Date.now(),
      sender: "user",
      text,
      timestamp: Date.now()
    };

    const newHistory = [...messages, userMsg];
    await saveMessages(newHistory);
    setIsGenerating(true);

    try {
      const modeParam = target === "duo" ? "duo" : target === "docs_ai" ? "big-sister" : "ada";

      const res = await fetch("/api/ada-sister/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          mode: modeParam,
          history: newHistory.slice(-10).map((m) => ({
            role: m.sender === "user" ? "user" : "model",
            text: m.text
          })),
          userDisplayName: nickname
        })
      });

      const data = await res.json();
      const updated = [...newHistory];

      if (data.ada) {
        updated.push({
          id: "ada-" + Date.now(),
          sender: "ada",
          text: data.ada,
          timestamp: Date.now(),
          motion: data.adaMotion || "idle"
        });
        if (data.adaMotion) {
          setAdaMotion(data.adaMotion as AdaMotion);
        }
        speak(data.ada, "ada");
      }

      if (data.bigSister) {
        updated.push({
          id: "docs-" + (Date.now() + 1),
          sender: "big-sister",
          text: data.bigSister,
          timestamp: Date.now() + 1
        });
        if (!data.ada) {
          speak(data.bigSister, "docs_ai");
        }
      }

      await saveMessages(updated);
    } catch (err: any) {
      console.error("Chat error:", err);
      const fallbackList = [...newHistory];
      if (target === "duo" || target === "ada") {
        fallbackList.push({
          id: "ada-err-" + Date.now(),
          sender: "ada",
          text: "I'm right here with you, Doc. Ready for whatever we're building next.",
          timestamp: Date.now()
        });
      }
      if (target === "duo" || target === "docs_ai") {
        fallbackList.push({
          id: "docs-err-" + (Date.now() + 1),
          sender: "big-sister",
          text: "Docs_AI online and standing by. Direct intelligence ready whenever you need it, Doc.",
          timestamp: Date.now() + 1
        });
      }
      await saveMessages(fallbackList);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm("Clear conversation history?")) return;
    loadDefaultMessages();
  };

  const handleExportChat = () => {
    const transcript = messages
      .map((m) => {
        const who = m.sender === "user" ? nickname : m.sender === "ada" ? "Ada" : "Docs_AI";
        const time = new Date(m.timestamp).toLocaleTimeString();
        return `[${time}] ${who}: ${m.text}`;
      })
      .join("\n\n");

    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ada_and_Docs_AI_Chat_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 pb-12">
      {/* 1. Clean Top Header */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-white tracking-tight">Ada &amp; Docs_AI</h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
              Direct Workspace
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Direct communication with Ada (Developer Companion) and Docs_AI (Intelligence &amp; Analysis).
          </p>
        </div>

        {/* Tab & Utility Actions */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "chat"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab("sdk_hub")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "sdk_hub"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>SDK Docs</span>
            </button>
          </div>

          <button
            onClick={() => setShowAvatar((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              showAvatar
                ? "bg-rose-950/60 border-rose-800 text-rose-300"
                : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
            }`}
            title="Toggle Ada 3D Model"
          >
            <span>3D Model</span>
            {showAvatar ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setSpeechEnabled((prev) => !prev)}
            className={`p-2 rounded-xl border text-xs transition-all cursor-pointer ${
              speechEnabled
                ? "bg-cyan-950/60 border-cyan-800 text-cyan-300"
                : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
            }`}
            title={speechEnabled ? "Voice Speech Enabled" : "Voice Speech Muted"}
          >
            {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={handleExportChat}
            className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white transition-all text-xs cursor-pointer"
            title="Export Transcript"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleClearChat}
            className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-red-400 transition-all text-xs cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeTab === "sdk_hub" ? (
        <GoogleAIStudioHub
          onSendToChat={(text) => {
            setActiveTab("chat");
            handleSendMessage(text);
          }}
          onSwitchToParlor={() => setActiveTab("chat")}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Optional Collapsible 3D Avatar Pane */}
          {showAvatar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:col-span-4 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-bold text-white">Ada 3D Avatar</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {(["wave", "dance", "cheer", "heart", "cat", "bow", "think", "idle"] as AdaMotion[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setAdaMotion(m)}
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono transition-all cursor-pointer ${
                        adaMotion === m
                          ? "bg-rose-600 text-white shadow-sm shadow-rose-600/30 font-bold"
                          : "bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-750"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full h-72 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 flex items-center justify-center">
                <Ada3DVTuber
                  isSpeaking={adaSpeaking}
                  motion={adaMotion}
                  onMotionChange={setAdaMotion}
                  className="w-full h-full"
                  compact={true}
                />
              </div>
              <p className="text-[11px] text-neutral-400 text-center">
                Autonomous 3D embodiment • Mouse tracking &amp; expression sync
              </p>
            </motion.div>
          )}

          {/* Main Clean Chat Area */}
          <div
            className={`${
              showAvatar ? "lg:col-span-8" : "lg:col-span-12"
            } bg-neutral-900/90 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden shadow-sm min-h-[560px]`}
          >
            {/* Target Selector Toolbar */}
            <div className="px-4 py-3 border-b border-neutral-800/80 bg-neutral-950/40 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 font-medium">Recipient:</span>
                <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                  <button
                    onClick={() => setTarget("duo")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      target === "duo"
                        ? "bg-neutral-800 text-white shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Both (Duo)
                  </button>
                  <button
                    onClick={() => setTarget("docs_ai")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      target === "docs_ai"
                        ? "bg-cyan-950 border border-cyan-700/60 text-cyan-200 shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Docs_AI
                  </button>
                  <button
                    onClick={() => setTarget("ada")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      target === "ada"
                        ? "bg-rose-950 border border-rose-700/60 text-rose-200 shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Ada
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-neutral-500 font-mono">
                {messages.length} messages
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[520px] custom-scrollbar">
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isUser = msg.sender === "user";
                  const isAda = msg.sender === "ada";
                  const isDocs = msg.sender === "big-sister";

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      {/* Sender Header */}
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-neutral-400 px-1">
                        {isUser && (
                          <>
                            <User className="w-3 h-3 text-neutral-400" />
                            <span className="font-semibold text-neutral-300">{nickname}</span>
                          </>
                        )}
                        {isAda && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span className="font-semibold text-rose-300">Ada</span>
                          </>
                        )}
                        {isDocs && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            <span className="font-semibold text-cyan-300">Docs_AI</span>
                          </>
                        )}
                        <span className="text-[10px] text-neutral-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`group relative max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          isUser
                            ? "bg-neutral-800 text-neutral-100 border border-neutral-700/80 rounded-tr-sm"
                            : isAda
                            ? "bg-neutral-950 text-neutral-200 border border-rose-900/30 rounded-tl-sm"
                            : "bg-neutral-950 text-neutral-200 border border-cyan-900/30 rounded-tl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap select-text">{msg.text}</p>

                        {/* Copy button on hover */}
                        <button
                          onClick={() => copyMessage(msg.id, msg.text)}
                          className="absolute -top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 border border-neutral-700 rounded-md p-1 text-neutral-400 hover:text-white cursor-pointer shadow-sm"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-xs text-neutral-400 px-2 py-1"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />
                  <span>Thinking...</span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Area */}
            <div className="p-3 sm:p-4 border-t border-neutral-800/80 bg-neutral-950/60 space-y-2">
              {/* Quick Prompt Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-neutral-400">
                <span className="text-neutral-500 shrink-0">Prompts:</span>
                {[
                  "What are we working on next?",
                  "Review our project architecture",
                  "Check server and API status",
                  "List any pending tasks"
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSendMessage(chip)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-all shrink-0 text-[11px] cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input Box */}
              <div className="flex items-end gap-2 bg-neutral-900 border border-neutral-800 rounded-xl p-2 focus-within:border-neutral-700 transition-all">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${target === "duo" ? "Ada & Docs_AI" : target === "docs_ai" ? "Docs_AI" : "Ada"}... (Enter to send, Shift+Enter for newline)`}
                  rows={1}
                  disabled={isGenerating}
                  className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-neutral-500 resize-none max-h-40 py-1 px-1.5"
                />

                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isGenerating}
                  className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
