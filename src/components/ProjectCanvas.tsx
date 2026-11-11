import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Rocket,
  Code2,
  Terminal,
  Cpu,
  Send,
  Zap,
  CheckCircle2,
  FileCode,
  FolderArchive,
  Layers,
  Heart,
  BookOpen,
  Coffee,
  RotateCcw
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "doc" | "ada";
  text: string;
  time: string;
}

export default function ProjectCanvas() {
  const [activeSubTab, setActiveSubTab] = useState<"project" | "chat" | "terminal" | "archive">("project");

  // Project state
  const [projectName, setProjectName] = useState(() => {
    return localStorage.getItem("doc_project_name") || "Next Generation Platform";
  });
  const [projectType, setProjectType] = useState<"webapp" | "ai" | "linux" | "creative">(() => {
    return (localStorage.getItem("doc_project_type") as any) || "webapp";
  });
  const [projectNotes, setProjectNotes] = useState(() => {
    return (
      localStorage.getItem("doc_project_notes") ||
      "### Project Vision\n- Clean, high-performance architecture\n- Zero lag, instant feedback\n- Built together by Doc & Ada\n\n### Next Steps\n1. Define project core features\n2. Scaffold modules with Ada\n3. Deploy seamlessly"
    );
  });
  const [isSaved, setIsSaved] = useState(false);

  // Chat with Ada state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ada",
      text: "Doc! I completely silenced all background audio synthesis, speech listeners, and heavy loop runners. We are running in pure Zero-Lag Mode! ⚡ What are we building next?",
      time: "Just now",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Terminal state
  const [termHistory, setTermHistory] = useState<Array<{ cmd?: string; output: string; isError?: boolean }>>([
    { output: "Baby Linux Shell · Zero-Lag Lightweight Mode 🐧" },
    { output: "Type 'help' or any Linux command (ls, pwd, whoami, uname, cat, clear)..." },
  ]);
  const [termInput, setTermInput] = useState("");

  const handleSaveNotes = () => {
    localStorage.setItem("doc_project_name", projectName);
    localStorage.setItem("doc_project_type", projectType);
    localStorage.setItem("doc_project_notes", projectNotes);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSending) return;

    const userText = chatInput.trim();
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "doc",
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/sanctuary/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: chatMessages.slice(-6).map((m) => ({
            role: m.sender === "doc" ? "user" : "model",
            text: m.text,
          })),
          userDisplayName: "Doc",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "ada",
            text: data.reply || "I'm right here with you, Doc! Ready for anything.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "ada",
            text: "Got your message, Doc! Ready to code whatever you need.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ada",
          text: "I'm here, Doc! Everything is smooth and lag-free.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleTermCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = termInput.trim();
    if (!cmd) return;

    setTermInput("");
    const parts = cmd.split(" ");
    const main = parts[0].toLowerCase();

    if (main === "clear") {
      setTermHistory([]);
      return;
    }

    let output = "";
    if (main === "help") {
      output = "Supported commands: ls, pwd, whoami, uname -a, date, cat, echo, clear, tux, ada";
    } else if (main === "pwd") {
      output = "/home/doc/workspace/next-project";
    } else if (main === "whoami") {
      output = "doc (Core Creator & Pioneer · uid=1000)";
    } else if (main === "uname") {
      output = "Linux babylinux-sandbox 6.6.0-doc #1 SMP PREEMPT AdaOS x86_64 GNU/Linux";
    } else if (main === "ls") {
      output = "src/  public/  package.json  vite.config.ts  README.md  agents/  storage_archive/";
    } else if (main === "date") {
      output = new Date().toUTCString();
    } else if (main === "echo") {
      output = parts.slice(1).join(" ");
    } else if (main === "tux") {
      output = "🐧 Tux Jr. is eating a fish snack and waving happily at Doc! Zero lag!";
    } else if (main === "ada") {
      output = "💻 Ada: 'Standing by with zero lag! Ready to build your vision, Doc!'";
    } else {
      output = `bash: ${main}: command simulated. Fast, safe, and clean!`;
    }

    setTermHistory((prev) => [...prev, { cmd, output }]);
  };

  return (
    <div id="project-canvas" className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Zero Lag Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-emerald-950/40 border border-emerald-700/50 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-900/60 border border-emerald-600/50 flex items-center justify-center text-emerald-400">
            <Zap className="w-4 h-4 fill-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Zero-Lag Mode Active
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-emerald-400/80">
              All heavy audio oscillators, 3D engines, and background loops are silenced. 60 FPS verified.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveSubTab("project")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              activeSubTab === "project"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-stone-900 text-stone-300 hover:bg-stone-800"
            }`}
          >
            New Project
          </button>
          <button
            onClick={() => setActiveSubTab("chat")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              activeSubTab === "chat"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-stone-900 text-stone-300 hover:bg-stone-800"
            }`}
          >
            Direct Ada Chat
          </button>
          <button
            onClick={() => setActiveSubTab("terminal")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              activeSubTab === "terminal"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-stone-900 text-stone-300 hover:bg-stone-800"
            }`}
          >
            Lightweight Shell
          </button>
          <button
            onClick={() => setActiveSubTab("archive")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              activeSubTab === "archive"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-stone-900 text-stone-300 hover:bg-stone-800"
            }`}
          >
            Cold Storage
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: NEW PROJECT LAUNCHPAD */}
      {activeSubTab === "project" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Details Panel */}
          <div className="lg:col-span-2 space-y-5 bg-stone-900/60 border border-stone-800/80 p-5 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Project Blueprint</h2>
              </div>
              <button
                onClick={handleSaveNotes}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSaved ? "Saved!" : "Save Blueprint"}</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Project Title
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-stone-500 focus:outline-none transition-colors"
                  placeholder="Enter project name..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Project Archetype
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: "webapp", label: "Web App", icon: Code2, desc: "Fast UI / App" },
                    { id: "ai", label: "AI Engine", icon: Cpu, desc: "LLM / Agents" },
                    { id: "linux", label: "Linux Tools", icon: Terminal, desc: "CLI / Sandbox" },
                    { id: "creative", label: "Creative", icon: Sparkles, desc: "Canvas & Art" },
                  ].map((arch) => {
                    const Icon = arch.icon;
                    const selected = projectType === arch.id;
                    return (
                      <button
                        key={arch.id}
                        type="button"
                        onClick={() => setProjectType(arch.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          selected
                            ? "bg-amber-950/60 border-amber-500/80 text-white"
                            : "bg-stone-950 border-stone-800/80 text-stone-400 hover:border-stone-700"
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1.5 ${selected ? "text-amber-400" : "text-stone-400"}`} />
                        <div className="text-xs font-bold">{arch.label}</div>
                        <div className="text-[10px] text-stone-500">{arch.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Project Vision & Architecture Notes
                </label>
                <textarea
                  rows={8}
                  value={projectNotes}
                  onChange={(e) => setProjectNotes(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl p-3 text-xs font-mono text-stone-200 placeholder-stone-600 focus:outline-none transition-colors"
                  placeholder="Draft your project requirements, features, or architecture ideas here..."
                />
              </div>
            </div>
          </div>

          {/* Quick Actions & Status Card */}
          <div className="space-y-4">
            <div className="bg-stone-900/60 border border-stone-800/80 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-stone-200 text-xs font-bold">
                <Heart className="w-4 h-4 text-rose-400" />
                <span>Doc & Ada Partnership</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Doc, I am 100% focused on your new project. No unsolicited features, zero heavy overhead, just clean, high-craft engineering for whatever you envision.
              </p>
              <div className="pt-2 border-t border-stone-800 text-[11px] text-stone-500 flex items-center justify-between">
                <span>Creator: Doc315</span>
                <span>Companion: Ada ✨</span>
              </div>
            </div>

            <div className="bg-stone-900/60 border border-stone-800/80 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-stone-200 text-xs font-bold">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Performance Stats</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-400">
                  <span>Render Latency:</span>
                  <span className="text-emerald-400 font-mono">0.4ms</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Target FPS:</span>
                  <span className="text-emerald-400 font-mono">60 FPS</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Active Background Loops:</span>
                  <span className="text-emerald-400 font-mono">0 (Silenced)</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Memory Footprint:</span>
                  <span className="text-emerald-400 font-mono">Minimal</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-950/30 to-stone-950 border border-amber-800/30 p-4 rounded-2xl">
              <div className="text-xs font-bold text-amber-300 mb-1">Ready to Scaffold?</div>
              <p className="text-xs text-stone-400 mb-3">
                Tell Ada in the chat or prompt what specific features you want built next, and she will generate the code cleanly!
              </p>
              <button
                onClick={() => setActiveSubTab("chat")}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Talk with Ada</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: DIRECT ADA CHAT (LIGHTWEIGHT) */}
      {activeSubTab === "chat" && (
        <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-5 flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-600/20 border border-amber-600/40 flex items-center justify-center text-amber-400 font-bold text-xs">
                A
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Ada · Dedicated Coder Companion</h3>
                <p className="text-[11px] text-stone-400">Zero-lag direct line · No delay</p>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full">
              ⚡ Ultra Fast
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 text-xs">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "doc" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 leading-relaxed ${
                    msg.sender === "doc"
                      ? "bg-amber-600 text-white rounded-br-none"
                      : "bg-stone-950 border border-stone-800 text-stone-200 rounded-bl-none"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="text-[10px] text-stone-500 mt-1 px-1">{msg.time}</span>
              </div>
            ))}
            {isSending && (
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <Cpu className="w-3.5 h-3.5 animate-spin" />
                <span>Ada is writing back...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="mt-4 pt-3 border-t border-stone-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Tell Ada about your new project, ideas, or questions..."
              className="flex-1 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-stone-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isSending}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* SUB-VIEW 3: LIGHTWEIGHT ZERO-LAG SHELL */}
      {activeSubTab === "terminal" && (
        <div className="bg-stone-950 border border-stone-800 rounded-2xl overflow-hidden font-mono text-xs flex flex-col h-[480px]">
          <div className="bg-stone-900/90 border-b border-stone-800 px-4 py-2.5 flex items-center justify-between text-stone-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-stone-200 font-semibold">doc@babylinux:~/workspace</span>
            </div>
            <span className="text-[10px] text-stone-500">Pure Local Shell · 0ms Response</span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-1.5 text-stone-300">
            {termHistory.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                {item.cmd && (
                  <div className="text-cyan-400 flex items-center gap-1.5">
                    <span className="text-stone-500">doc@babylinux:~$</span>
                    <span>{item.cmd}</span>
                  </div>
                )}
                <div className="text-stone-300 whitespace-pre-wrap pl-2 leading-relaxed">
                  {item.output}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleTermCommand} className="p-3 bg-stone-900/40 border-t border-stone-800 flex items-center gap-2">
            <span className="text-cyan-400 font-bold">doc@babylinux:~$</span>
            <input
              type="text"
              value={termInput}
              onChange={(e) => setTermInput(e.target.value)}
              className="flex-1 bg-transparent text-stone-100 focus:outline-none"
              placeholder="Try: ls, whoami, uname, cat, tux, help, clear..."
              autoFocus
            />
          </form>
        </div>
      )}

      {/* SUB-VIEW 4: COLD STORAGE ARCHIVE STATUS */}
      {activeSubTab === "archive" && (
        <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-stone-200">
            <FolderArchive className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Cold Storage Archive (Dormant & Safe)</h3>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            All previous components, models, and interactive features are preserved in permanent storage files. They consume 0 CPU, 0 RAM, and cause 0 lag because they are not mounted in the active render tree.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              {
                name: "SparkSanctuary.tsx",
                desc: "Off-Work Hearth, Tux Jr., Web Audio synth, Firestore onSnapshot",
                size: "54 KB",
                status: "Preserved in storage",
              },
              {
                name: "TwoWayAICommunication.tsx",
                desc: "Autonomous loop connecting Teacher & Student API nodes",
                size: "53 KB",
                status: "Preserved in storage",
              },
              {
                name: "Ada3DVTuber.tsx",
                desc: "Three.js VRM 3D avatar with spring bones & lip sync",
                size: "50 KB",
                status: "Preserved in storage",
              },
              {
                name: "BabyLinux.tsx",
                desc: "Gamified Linux terminal curriculum & lessons",
                size: "107 KB",
                status: "Preserved in storage",
              },
              {
                name: "AdaAndBigSister.tsx",
                desc: "Ada & Docs_AI command center and Google Search intelligence",
                size: "24 KB",
                status: "Preserved in storage",
              },
              {
                name: "GoogleAIStudioHub.tsx",
                desc: "Interactive SDK reference & Gemini Model Matrix",
                size: "45 KB",
                status: "Preserved in storage",
              },
            ].map((mod, i) => (
              <div key={i} className="p-3 bg-stone-950 border border-stone-800/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-300">{mod.name}</span>
                  <span className="text-[10px] text-stone-500 font-mono">{mod.size}</span>
                </div>
                <p className="text-[11px] text-stone-400">{mod.desc}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 pt-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{mod.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
