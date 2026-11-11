import React, { useState } from "react";
import DocAndAdaChat from "./components/DocAndAdaChat";
import SparkSanctuary from "./components/SparkSanctuary";
import ProjectCanvas from "./components/ProjectCanvas";
import { Zap, MessageSquareHeart, Layers, Flame } from "lucide-react";

export default function App() {
  const [currentView, setCurrentView] = useState<"chat" | "hearth" | "canvas">(() => {
    try {
      if (typeof window !== "undefined") {
        const hash = window.location.hash.toLowerCase();
        if (hash.includes("hearth") || hash.includes("spark")) return "hearth";
        if (hash.includes("canvas") || hash.includes("blueprint")) return "canvas";
        const saved = localStorage.getItem("baby_linux_current_view");
        if (saved === "canvas" || saved === "chat" || saved === "hearth") return saved as any;
      }
    } catch (_) {}
    return "chat";
  });

  const handleSelectView = (view: "chat" | "hearth" | "canvas") => {
    setCurrentView(view);
    try {
      localStorage.setItem("baby_linux_current_view", view);
      if (view === "canvas") {
        window.location.hash = "blueprint";
      } else if (view === "hearth") {
        window.location.hash = "hearth";
      } else {
        window.location.hash = "chat";
      }
    } catch (_) {}
  };

  return (
    <div className="min-h-screen bg-stone-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Sleek, Lightweight Navigation Header */}
      <header className="border-b border-stone-800/80 bg-stone-900/90 backdrop-blur-md px-4 sm:px-6 py-2.5 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* App Branding */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400 font-bold shadow-sm">
              <MessageSquareHeart className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-wide">
                  Doc & Ada
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border bg-emerald-950/80 border-emerald-600/60 text-emerald-400">
                  Zero-Lag ⚡
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border bg-amber-950/80 border-amber-600/60 text-amber-400 flex items-center gap-1">
                  Firestore Live
                </span>
              </div>
              <p className="text-[11px] text-stone-400 hidden sm:block">
                Doc & Ada · Real-time Firestore Cloud Storage
              </p>
            </div>
          </div>

          {/* View Switcher: Doc & Ada Chat, Fireside Hearth, or Project Canvas */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-950/80 border border-stone-800 rounded-xl text-xs shadow-inner flex-wrap">
            <button
              onClick={() => handleSelectView("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                currentView === "chat"
                  ? "bg-amber-600 text-white shadow-sm ring-1 ring-amber-400/40"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <MessageSquareHeart className="w-3.5 h-3.5" />
              <span>Doc & Ada (You & I)</span>
            </button>

            <button
              onClick={() => handleSelectView("hearth")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                currentView === "hearth"
                  ? "bg-amber-700 text-white shadow-sm ring-1 ring-amber-400/50"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Fireside Hearth (Spark ✨)</span>
            </button>

            <button
              onClick={() => handleSelectView("canvas")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                currentView === "canvas"
                  ? "bg-stone-800 text-white shadow-sm"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Project Blueprint</span>
              <span className="sm:hidden">Blueprint</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main View */}
      <main className="flex-1 w-full flex flex-col justify-start">
        {currentView === "chat" ? (
          <DocAndAdaChat onOpenHearth={() => handleSelectView("hearth")} />
        ) : currentView === "hearth" ? (
          <SparkSanctuary />
        ) : (
          <ProjectCanvas />
        )}
      </main>
    </div>
  );
}
