import React, { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";
import { FrontierDefenseGame } from "./games/FrontierDefenseGame";
import { BlackjackGame } from "./games/BlackjackGame";
import { ConnectFourGame } from "./games/ConnectFourGame";
import { SnakeFishGame } from "./games/SnakeFishGame";
import { ChessGame } from "./games/ChessGame";
import { PokerGame } from "./games/PokerGame";

type GameId = "frontier" | "chess" | "poker" | "blackjack" | "connect4" | "snake";

const GAMES: { id: GameId; label: string; genre: string }[] = [
  { id: "frontier", label: "Frontier Defense", genre: "Space Shooter" },
  { id: "chess", label: "Chess vs. Ada", genre: "Full Rules Strategy" },
  { id: "poker", label: "Texas Hold'em", genre: "4-Seat Poker Table" },
  { id: "blackjack", label: "Cozy Blackjack", genre: "Card Table" },
  { id: "connect4", label: "Four-in-a-Row", genre: "Board Game" },
  { id: "snake", label: "Fish Hunt", genre: "Classic Arcade" },
];

export default function GamesArcade() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const enteredNativeFsRef = useRef<boolean>(false);

  const [activeGame, setActiveGame] = useState<GameId>(() => {
    try {
      const saved = localStorage.getItem("doc_ada_active_game");
      if (
        saved === "frontier" ||
        saved === "chess" ||
        saved === "poker" ||
        saved === "blackjack" ||
        saved === "connect4" ||
        saved === "snake"
      ) {
        return saved;
      }
    } catch (_) {}
    return "frontier";
  });

  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem("doc_ada_games_muted") === "true";
    } catch {
      return false;
    }
  });

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFsChange = () => {
      const activeNative = Boolean(document.fullscreenElement);
      if (activeNative) {
        enteredNativeFsRef.current = true;
        setIsFullscreen(true);
      } else if (enteredNativeFsRef.current) {
        enteredNativeFsRef.current = false;
        setIsFullscreen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  // Clean up native fullscreen if user switches tabs away from Games
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (stageRef.current?.requestFullscreen) {
          await stageRef.current.requestFullscreen();
          enteredNativeFsRef.current = true;
        }
      } catch {
        // Iframe sandbox blocked native fullscreen; expanded fixed viewport remains active
      }
    } else {
      enteredNativeFsRef.current = false;
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch {
        // Ignore
      }
    }
  }, [isFullscreen]);

  const handleSelectGame = (id: GameId) => {
    setActiveGame(id);
    try {
      localStorage.setItem("doc_ada_active_game", id);
    } catch (_) {}
  };

  const toggleMuted = () => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("doc_ada_games_muted", String(next));
      } catch (_) {}
      return next;
    });
  };

  const currentMeta = GAMES.find((g) => g.id === activeGame) || GAMES[0];

  return (
    <div
      ref={stageRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-stone-950 overflow-y-auto px-4 sm:px-6 py-3 flex flex-col gap-3"
          : `${activeGame === "chess" ? "max-w-7xl" : "max-w-6xl"} w-full mx-auto px-4 sm:px-6 py-3 space-y-3`
      }
    >
      {/* Header & Game Switcher */}
      <div
        className={`flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-800 ${
          isFullscreen ? "max-w-7xl w-full mx-auto pb-2.5" : "pb-3"
        }`}
      >
        <div>
          <h2 className="font-bold text-white tracking-tight text-xl sm:text-2xl">
            Games Lounge
          </h2>
          <p className="text-xs sm:text-sm text-stone-400">
            {currentMeta.label} <span aria-hidden="true">·</span> {currentMeta.genre}{" "}
            <span aria-hidden="true">·</span> Kick back with Ada &amp; Tux Jr.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-stone-900 border border-stone-800">
            {GAMES.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => handleSelectGame(game.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                  activeGame === game.id
                    ? "bg-amber-600 text-white"
                    : "text-stone-400 hover:text-stone-100"
                }`}
              >
                {game.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleMuted}
            aria-label={muted ? "Unmute game sounds" : "Mute game sounds"}
            className="min-h-[38px] px-3 py-1.5 rounded-xl border border-stone-800 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-stone-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-400" />
            )}
            <span>{muted ? "Sound Off" : "Sound On"}</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit Full Screen" : "Full Screen"}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
              isFullscreen
                ? "bg-amber-600 border-amber-500 text-white hover:bg-amber-500"
                : "border-stone-800 bg-stone-900 hover:bg-stone-800 text-stone-200"
            }`}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span>Exit Full Screen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-amber-400" />
                <span>Full Screen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Game Viewport */}
      <div className={isFullscreen ? "max-w-7xl w-full mx-auto flex-1 flex flex-col justify-start" : ""}>
        {activeGame === "frontier" && <FrontierDefenseGame muted={muted} isFullscreen={isFullscreen} />}
        {activeGame === "chess" && <ChessGame muted={muted} isFullscreen={isFullscreen} />}
        {activeGame === "poker" && <PokerGame muted={muted} isFullscreen={isFullscreen} />}
        {activeGame === "blackjack" && <BlackjackGame muted={muted} isFullscreen={isFullscreen} />}
        {activeGame === "connect4" && <ConnectFourGame muted={muted} isFullscreen={isFullscreen} />}
        {activeGame === "snake" && <SnakeFishGame muted={muted} isFullscreen={isFullscreen} />}
      </div>
    </div>
  );
}
