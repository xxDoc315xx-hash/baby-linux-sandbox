import React, { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { FrontierDefenseGame } from "./games/FrontierDefenseGame";
import { BlackjackGame } from "./games/BlackjackGame";
import { ConnectFourGame } from "./games/ConnectFourGame";
import { SnakeFishGame } from "./games/SnakeFishGame";
import { ChessGame } from "./games/ChessGame";

type GameId = "frontier" | "chess" | "blackjack" | "connect4" | "snake";

const GAMES: { id: GameId; label: string; genre: string }[] = [
  { id: "frontier", label: "Frontier Defense", genre: "Space Shooter" },
  { id: "chess", label: "Chess vs. Ada", genre: "Full Rules Strategy" },
  { id: "blackjack", label: "Cozy Blackjack", genre: "Card Table" },
  { id: "connect4", label: "Four-in-a-Row", genre: "Board Game" },
  { id: "snake", label: "Fish Hunt", genre: "Classic Arcade" },
];

export default function GamesArcade() {
  const [activeGame, setActiveGame] = useState<GameId>(() => {
    try {
      const saved = localStorage.getItem("doc_ada_active_game");
      if (
        saved === "frontier" ||
        saved === "chess" ||
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
    <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Game Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-800 pb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Games Lounge
          </h2>
          <p className="text-sm text-stone-400 mt-1">
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
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
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
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-stone-800 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            {muted ? <VolumeX className="w-4 h-4 text-stone-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            <span>{muted ? "Sound Off" : "Sound On"}</span>
          </button>
        </div>
      </div>

      {/* Active Game Viewport */}
      <div>
        {activeGame === "frontier" && <FrontierDefenseGame muted={muted} />}
        {activeGame === "chess" && <ChessGame muted={muted} />}
        {activeGame === "blackjack" && <BlackjackGame muted={muted} />}
        {activeGame === "connect4" && <ConnectFourGame muted={muted} />}
        {activeGame === "snake" && <SnakeFishGame muted={muted} />}
      </div>
    </div>
  );
}
