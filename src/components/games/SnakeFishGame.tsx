import React, { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { playGameSound } from "./gameAudio";

type GameState = "TITLE_MENU" | "PLAYING" | "PAUSED" | "GAME_OVER";
type Dir = { x: number; y: number };

interface SnakeFishGameProps {
  muted: boolean;
  isFullscreen?: boolean;
}

const GRID = 20;
const CELL = 24;
const CANVAS_SIZE = GRID * CELL; // 480x480
const BEST_KEY = "doc_ada_game_snake_best";

export const SnakeFishGame: React.FC<SnakeFishGameProps> = ({ muted, isFullscreen = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<GameState>("TITLE_MENU");
  const [score, setScore] = useState<number>(0);
  const [best, setBest] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0;
    } catch {
      return 0;
    }
  });

  const gameStateRef = useRef(gameState);
  const mutedRef = useRef(muted);
  const bestRef = useRef(best);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const simRef = useRef({
    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ],
    dir: { x: 1, y: 0 } as Dir,
    dirQueue: [] as Dir[],
    food: { x: 15, y: 10 },
    score: 0,
    stepAccumulator: 0,
  });

  const spawnFood = (snake: { x: number; y: number }[]) => {
    const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
    const free: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    return free.length > 0 ? free[Math.floor(Math.random() * free.length)] : { x: 0, y: 0 };
  };

  const resetAndStart = useCallback(() => {
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    simRef.current.snake = initialSnake;
    simRef.current.dir = { x: 1, y: 0 };
    simRef.current.dirQueue = [];
    simRef.current.food = spawnFood(initialSnake);
    simRef.current.score = 0;
    simRef.current.stepAccumulator = 0;
    setScore(0);
    setGameState("PLAYING");
    playGameSound("powerup", mutedRef.current);
  }, []);

  const queueDirection = useCallback((next: Dir) => {
    if (gameStateRef.current !== "PLAYING") return;
    const sim = simRef.current;
    const lastPlanned = sim.dirQueue.length > 0 ? sim.dirQueue[sim.dirQueue.length - 1] : sim.dir;
    if (lastPlanned.x + next.x === 0 && lastPlanned.y + next.y === 0) return;
    if (lastPlanned.x === next.x && lastPlanned.y === next.y) return;
    if (sim.dirQueue.length < 2) {
      sim.dirQueue.push(next);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
        if (gameStateRef.current === "PLAYING") e.preventDefault();
      }
      if (k === "arrowup" || k === "w") queueDirection({ x: 0, y: -1 });
      else if (k === "arrowdown" || k === "s") queueDirection({ x: 0, y: 1 });
      else if (k === "arrowleft" || k === "a") queueDirection({ x: -1, y: 0 });
      else if (k === "arrowright" || k === "d") queueDirection({ x: 1, y: 0 });
      else if (k === "p") {
        setGameState((prev) => (prev === "PLAYING" ? "PAUSED" : prev === "PAUSED" ? "PLAYING" : prev));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [queueDirection]);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;
      const sim = simRef.current;

      ctx.fillStyle = "#0b1120";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Subtle grid lines
      ctx.strokeStyle = "rgba(148, 163, 184, 0.06)";
      ctx.lineWidth = 1;
      for (let i = 1; i < GRID; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL, 0);
        ctx.lineTo(i * CELL, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL);
        ctx.lineTo(CANVAS_SIZE, i * CELL);
        ctx.stroke();
      }

      // Fish treat
      const fx = sim.food.x * CELL + CELL / 2;
      const fy = sim.food.y * CELL + CELL / 2;
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.ellipse(fx + 1, fy, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx - 5, fy);
      ctx.lineTo(fx - 10, fy - 4);
      ctx.lineTo(fx - 10, fy + 4);
      ctx.closePath();
      ctx.fill();

      // Snake segments
      sim.snake.forEach((seg, idx) => {
        const isHead = idx === 0;
        ctx.fillStyle = isHead ? "#38bdf8" : idx % 2 === 0 ? "#10b981" : "#059669";
        ctx.beginPath();
        ctx.roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, isHead ? 6 : 4);
        ctx.fill();
      });
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (gameStateRef.current === "PLAYING") {
        const sim = simRef.current;
        const stepTime = Math.max(0.068, 0.14 - sim.score * 0.0018);
        sim.stepAccumulator += dt;

        while (sim.stepAccumulator >= stepTime) {
          sim.stepAccumulator -= stepTime;
          if (sim.dirQueue.length > 0) {
            sim.dir = sim.dirQueue.shift()!;
          }

          const head = sim.snake[0];
          const nextHead = { x: head.x + sim.dir.x, y: head.y + sim.dir.y };
          const hitWall =
            nextHead.x < 0 || nextHead.x >= GRID || nextHead.y < 0 || nextHead.y >= GRID;
          const eating = nextHead.x === sim.food.x && nextHead.y === sim.food.y;
          const bodyCheck = eating ? sim.snake : sim.snake.slice(0, -1);
          const hitSelf = bodyCheck.some((s) => s.x === nextHead.x && s.y === nextHead.y);

          if (hitWall || hitSelf) {
            gameStateRef.current = "GAME_OVER";
            setGameState("GAME_OVER");
            playGameSound("lose", mutedRef.current);
            break;
          }

          const newSnake = [nextHead, ...sim.snake];
          if (eating) {
            sim.score += 10;
            setScore(sim.score);
            sim.food = spawnFood(newSnake);
            playGameSound("eat", mutedRef.current);
            if (sim.score > bestRef.current) {
              bestRef.current = sim.score;
              setBest(sim.score);
              try {
                localStorage.setItem(BEST_KEY, String(sim.score));
              } catch (_) {}
            }
          } else {
            newSnake.pop();
          }
          sim.snake = newSnake;
        }
      }

      draw();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800">
        <div className="flex items-center gap-5 text-sm font-mono tabular-nums">
          <div>
            <span className="text-stone-400 text-xs mr-1.5">Score</span>
            <span className="font-bold text-white">{score}</span>
          </div>
          <div className="text-xs text-stone-400">
            Best <span className="text-amber-400 font-bold">{best}</span>
          </div>
        </div>

        {(gameState === "PLAYING" || gameState === "PAUSED") && (
          <button
            type="button"
            onClick={() => setGameState((p) => (p === "PLAYING" ? "PAUSED" : "PLAYING"))}
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-stone-700 bg-stone-950 hover:bg-stone-800 text-stone-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            {gameState === "PAUSED" ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{gameState === "PAUSED" ? "Resume" : "Pause"}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 rounded-xl border border-stone-800 bg-stone-900/70 p-3 sm:p-4">
        <div
          className={`relative rounded-xl overflow-hidden border border-stone-700 bg-slate-950 shadow-xl w-full ${
            isFullscreen
              ? "max-w-[clamp(260px,calc(100vh-195px),540px)]"
              : "max-w-[clamp(260px,calc(100vh-275px),480px)]"
          }`}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full h-auto block aspect-square"
          />

          {gameState === "TITLE_MENU" && (
            <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Tux Jr.&apos;s Fish Hunt</h3>
              <p className="text-sm text-stone-300 max-w-xs mb-5">
                Collect golden fish without bumping the walls or your own tail. Use Arrow keys,
                WASD, or the buttons beside the board.
              </p>
              <button
                type="button"
                onClick={resetAndStart}
                className="min-h-[44px] px-7 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Game</span>
              </button>
            </div>
          )}

          {gameState === "PAUSED" && (
            <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-xl font-bold text-white mb-4">Paused</h3>
              <button
                type="button"
                onClick={() => setGameState("PLAYING")}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume</span>
              </button>
            </div>
          )}

          {gameState === "GAME_OVER" && (
            <div className="absolute inset-0 bg-stone-950/88 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Game Over</h3>
              <p className="text-sm text-stone-300 font-mono tabular-nums mb-5">
                Score: {score} · Best: {best}
              </p>
              <button
                type="button"
                onClick={resetAndStart}
                className="min-h-[44px] px-7 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
            </div>
          )}
        </div>

        {/* Comfortable On-Screen D-Pad for Mouse / Touch */}
        <div className="flex flex-col items-center gap-2 select-none">
          <button
            type="button"
            aria-label="Move Up"
            onClick={() => queueDirection({ x: 0, y: -1 })}
            className="w-12 h-12 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 flex items-center justify-center text-white cursor-pointer"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Move Left"
              onClick={() => queueDirection({ x: -1, y: 0 })}
              className="w-12 h-12 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 flex items-center justify-center text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Move Down"
              onClick={() => queueDirection({ x: 0, y: 1 })}
              className="w-12 h-12 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 flex items-center justify-center text-white cursor-pointer"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Move Right"
              onClick={() => queueDirection({ x: 1, y: 0 })}
              className="w-12 h-12 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 flex items-center justify-center text-white cursor-pointer"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
