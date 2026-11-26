import React, { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, Shield, Crosshair } from "lucide-react";
import { playGameSound } from "./gameAudio";

type GameState = "TITLE_MENU" | "PLAYING" | "PAUSED" | "GAME_OVER";

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isEnemy?: boolean;
}

interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  kind: "asteroid" | "raider" | "gunboat";
  shootCooldown: number;
}

interface PowerUp {
  x: number;
  y: number;
  vy: number;
  kind: "repair" | "twin";
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
}

interface FrontierDefenseGameProps {
  muted: boolean;
  isFullscreen?: boolean;
  onHighScoreChange?: (score: number) => void;
}

const CANVAS_W = 860;
const CANVAS_H = 500;
const STORAGE_KEY = "doc_ada_game_frontier_best";

export const FrontierDefenseGame: React.FC<FrontierDefenseGameProps> = ({
  muted,
  isFullscreen = false,
  onHighScoreChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<GameState>("TITLE_MENU");
  const [score, setScore] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [shield, setShield] = useState<number>(100);
  const [autoFire, setAutoFire] = useState<boolean>(true);
  const [twinTimerUi, setTwinTimerUi] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? Math.max(0, parseInt(saved, 10) || 0) : 0;
    } catch {
      return 0;
    }
  });

  const mutedRef = useRef(muted);
  const autoFireRef = useRef(autoFire);
  const gameStateRef = useRef<GameState>(gameState);
  const bestScoreRef = useRef<number>(bestScore);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    autoFireRef.current = autoFire;
  }, [autoFire]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Mutable simulation state inside ref for steady 60fps canvas rendering
  const simRef = useRef({
    playerX: CANVAS_W / 2,
    playerY: CANVAS_H - 60,
    pointerTargetX: null as number | null,
    pointerTargetY: null as number | null,
    keys: new Set<string>(),
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    powerUps: [] as PowerUp[],
    particles: [] as Particle[],
    stars: Array.from({ length: 75 }, () => ({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      speed: 22 + Math.random() * 68,
      size: Math.random() < 0.25 ? 2 : 1.2,
      alpha: 0.25 + Math.random() * 0.65,
    })) as Star[],
    score: 0,
    wave: 1,
    shield: 100,
    invulnTimer: 0,
    fireCooldown: 0,
    twinTimer: 0,
    spawnTimer: 0.7,
    waveKills: 0,
    waveGoal: 10,
  });

  const resetSimulation = useCallback(() => {
    const sim = simRef.current;
    sim.playerX = CANVAS_W / 2;
    sim.playerY = CANVAS_H - 60;
    sim.pointerTargetX = null;
    sim.pointerTargetY = null;
    sim.bullets = [];
    sim.enemies = [];
    sim.powerUps = [];
    sim.particles = [];
    sim.score = 0;
    sim.wave = 1;
    sim.shield = 100;
    sim.invulnTimer = 0;
    sim.fireCooldown = 0;
    sim.twinTimer = 0;
    sim.spawnTimer = 0.6;
    sim.waveKills = 0;
    sim.waveGoal = 10;

    setScore(0);
    setWave(1);
    setShield(100);
    setTwinTimerUi(0);
  }, []);

  const startGame = useCallback(() => {
    resetSimulation();
    setGameState("PLAYING");
    playGameSound("powerup", mutedRef.current);
  }, [resetSimulation]);

  const togglePause = useCallback(() => {
    setGameState((prev) => {
      if (prev === "PLAYING") return "PAUSED";
      if (prev === "PAUSED") return "PLAYING";
      return prev;
    });
  }, []);

  // Keyboard bindings (active only when PLAYING/PAUSED)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
        if (gameStateRef.current === "PLAYING") {
          e.preventDefault();
        }
      }
      if (k === "p") {
        if (gameStateRef.current === "PLAYING" || gameStateRef.current === "PAUSED") {
          togglePause();
        }
      }
      simRef.current.keys.add(k);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      simRef.current.keys.delete(e.key.toLowerCase());
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [togglePause]);

  // Pointer / touch tracking on canvas
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameStateRef.current !== "PLAYING") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    simRef.current.pointerTargetX = Math.max(24, Math.min(CANVAS_W - 24, (e.clientX - rect.left) * scaleX));
    simRef.current.pointerTargetY = Math.max(80, Math.min(CANVAS_H - 28, (e.clientY - rect.top) * scaleY));
  };

  const handlePointerLeave = () => {
    simRef.current.pointerTargetX = null;
    simRef.current.pointerTargetY = null;
  };

  // Main 60 FPS requestAnimationFrame loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let uiSyncTick = 0;

    const spawnParticles = (
      x: number,
      y: number,
      color: string,
      count: number,
      speed = 130
    ) => {
      const sim = simRef.current;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const mag = 30 + Math.random() * speed;
        const maxLife = 0.28 + Math.random() * 0.35;
        sim.particles.push({
          x,
          y,
          vx: Math.cos(ang) * mag,
          vy: Math.sin(ang) * mag,
          life: maxLife,
          maxLife,
          color,
          size: 1.5 + Math.random() * 2.5,
        });
      }
    };

    const spawnEnemy = () => {
      const sim = simRef.current;
      const roll = Math.random();
      const waveBoost = 1 + (sim.wave - 1) * 0.14;

      if (roll < 0.45) {
        const r = 15 + Math.random() * 11;
        sim.enemies.push({
          x: 32 + Math.random() * (CANVAS_W - 64),
          y: -r,
          vx: (Math.random() - 0.5) * 48,
          vy: (85 + Math.random() * 65) * waveBoost,
          radius: r,
          hp: sim.wave >= 3 ? 2 : 1,
          maxHp: sim.wave >= 3 ? 2 : 1,
          kind: "asteroid",
          shootCooldown: 99,
        });
      } else if (roll < 0.85 || sim.wave < 2) {
        sim.enemies.push({
          x: 40 + Math.random() * (CANVAS_W - 80),
          y: -24,
          vx: (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 45),
          vy: (78 + Math.random() * 40) * waveBoost,
          radius: 17,
          hp: 2,
          maxHp: 2,
          kind: "raider",
          shootCooldown: 1.2 + Math.random() * 1.1,
        });
      } else {
        sim.enemies.push({
          x: 60 + Math.random() * (CANVAS_W - 120),
          y: -30,
          vx: (Math.random() < 0.5 ? -1 : 1) * 38,
          vy: 54 * waveBoost,
          radius: 25,
          hp: 5 + Math.floor(sim.wave / 2),
          maxHp: 5 + Math.floor(sim.wave / 2),
          kind: "gunboat",
          shootCooldown: 0.9,
        });
      }
    };

    const damagePlayer = (amount: number) => {
      const sim = simRef.current;
      if (sim.invulnTimer > 0) return;
      sim.shield = Math.max(0, sim.shield - amount);
      sim.invulnTimer = 0.55;
      setShield(sim.shield);
      spawnParticles(sim.playerX, sim.playerY, "#f59e0b", 14, 160);
      playGameSound("hit", mutedRef.current);

      if (sim.shield <= 0) {
        gameStateRef.current = "GAME_OVER";
        setGameState("GAME_OVER");
        playGameSound("lose", mutedRef.current);
        if (sim.score > bestScoreRef.current) {
          bestScoreRef.current = sim.score;
          setBestScore(sim.score);
          try {
            localStorage.setItem(STORAGE_KEY, String(sim.score));
          } catch (_) {}
          onHighScoreChange?.(sim.score);
        }
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const sim = simRef.current;

      // Always drift starfield lightly
      const starMultiplier = gameStateRef.current === "PLAYING" ? 1 : 0.25;
      for (const s of sim.stars) {
        s.y += s.speed * starMultiplier * dt;
        if (s.y > CANVAS_H) {
          s.y = -2;
          s.x = Math.random() * CANVAS_W;
        }
      }

      if (gameStateRef.current === "PLAYING") {
        // Movement via keyboard
        const speed = 340;
        let dx = 0;
        let dy = 0;
        if (sim.keys.has("arrowleft") || sim.keys.has("a")) dx -= 1;
        if (sim.keys.has("arrowright") || sim.keys.has("d")) dx += 1;
        if (sim.keys.has("arrowup") || sim.keys.has("w")) dy -= 1;
        if (sim.keys.has("arrowdown") || sim.keys.has("s")) dy += 1;

        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy);
          sim.playerX += (dx / len) * speed * dt;
          sim.playerY += (dy / len) * speed * dt;
          sim.pointerTargetX = null;
          sim.pointerTargetY = null;
        } else if (sim.pointerTargetX !== null && sim.pointerTargetY !== null) {
          sim.playerX += (sim.pointerTargetX - sim.playerX) * Math.min(1, dt * 14);
          sim.playerY += (sim.pointerTargetY - sim.playerY) * Math.min(1, dt * 14);
        }

        sim.playerX = Math.max(24, Math.min(CANVAS_W - 24, sim.playerX));
        sim.playerY = Math.max(60, Math.min(CANVAS_H - 28, sim.playerY));

        if (sim.invulnTimer > 0) sim.invulnTimer = Math.max(0, sim.invulnTimer - dt);
        if (sim.fireCooldown > 0) sim.fireCooldown = Math.max(0, sim.fireCooldown - dt);
        if (sim.twinTimer > 0) sim.twinTimer = Math.max(0, sim.twinTimer - dt);

        // Shooting (Auto-fire or Spacebar)
        const wantsShoot = autoFireRef.current || sim.keys.has(" ");
        if (wantsShoot && sim.fireCooldown <= 0) {
          if (sim.twinTimer > 0) {
            sim.bullets.push(
              { x: sim.playerX - 10, y: sim.playerY - 16, vx: -18, vy: -520 },
              { x: sim.playerX + 10, y: sim.playerY - 16, vx: 18, vy: -520 }
            );
            sim.fireCooldown = 0.14;
          } else {
            sim.bullets.push({ x: sim.playerX, y: sim.playerY - 18, vx: 0, vy: -520 });
            sim.fireCooldown = 0.17;
          }
          playGameSound("laser", mutedRef.current);
        }

        // Spawn enemies
        sim.spawnTimer -= dt;
        if (sim.spawnTimer <= 0) {
          spawnEnemy();
          sim.spawnTimer = Math.max(0.32, 1.08 - sim.wave * 0.08);
        }

        // Update bullets
        for (let i = sim.bullets.length - 1; i >= 0; i--) {
          const b = sim.bullets[i];
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.y < -20 || b.y > CANVAS_H + 20 || b.x < -20 || b.x > CANVAS_W + 20) {
            sim.bullets.splice(i, 1);
            continue;
          }
          if (b.isEnemy) {
            if (Math.hypot(b.x - sim.playerX, b.y - sim.playerY) < 18) {
              sim.bullets.splice(i, 1);
              damagePlayer(18);
            }
          }
        }

        // Update enemies & collisions
        for (let i = sim.enemies.length - 1; i >= 0; i--) {
          const en = sim.enemies[i];
          en.x += en.vx * dt;
          en.y += en.vy * dt;
          if (en.x < en.radius || en.x > CANVAS_W - en.radius) {
            en.vx *= -1;
            en.x = Math.max(en.radius, Math.min(CANVAS_W - en.radius, en.x));
          }

          // Enemy firing
          if (en.kind !== "asteroid") {
            en.shootCooldown -= dt;
            if (en.shootCooldown <= 0 && en.y > 20 && en.y < CANVAS_H - 130) {
              const ang = Math.atan2(sim.playerY - en.y, sim.playerX - en.x);
              const spd = en.kind === "gunboat" ? 260 : 220;
              sim.bullets.push({
                x: en.x,
                y: en.y + en.radius * 0.7,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                isEnemy: true,
              });
              en.shootCooldown = en.kind === "gunboat" ? 1.45 : 2.1;
            }
          }

          if (en.y > CANVAS_H + en.radius + 10) {
            sim.enemies.splice(i, 1);
            continue;
          }

          // Hit by player bullets
          let destroyed = false;
          for (let j = sim.bullets.length - 1; j >= 0; j--) {
            const b = sim.bullets[j];
            if (b.isEnemy) continue;
            if (Math.hypot(b.x - en.x, b.y - en.y) < en.radius + 5) {
              sim.bullets.splice(j, 1);
              en.hp -= 1;
              spawnParticles(b.x, b.y, "#fde68a", 4, 70);
              if (en.hp <= 0) {
                destroyed = true;
                break;
              }
            }
          }

          if (destroyed) {
            sim.enemies.splice(i, 1);
            const pts = en.kind === "gunboat" ? 250 : en.kind === "raider" ? 120 : 60;
            sim.score += pts;
            sim.waveKills += 1;
            spawnParticles(
              en.x,
              en.y,
              en.kind === "asteroid" ? "#a8a29e" : "#f87171",
              en.kind === "gunboat" ? 22 : 12,
              155
            );
            playGameSound("explosion", mutedRef.current);

            if (Math.random() < 0.16) {
              sim.powerUps.push({
                x: en.x,
                y: en.y,
                vy: 85,
                kind: Math.random() < 0.48 ? "repair" : "twin",
              });
            }

            if (sim.waveKills >= sim.waveGoal) {
              sim.wave += 1;
              sim.waveKills = 0;
              sim.waveGoal = Math.round(sim.waveGoal * 1.25);
              setWave(sim.wave);
              playGameSound("win", mutedRef.current);
            }
            continue;
          }

          // Collision with player hull
          if (Math.hypot(en.x - sim.playerX, en.y - sim.playerY) < en.radius + 16) {
            sim.enemies.splice(i, 1);
            spawnParticles(en.x, en.y, "#fb923c", 14, 150);
            damagePlayer(25);
          }
        }

        // Update power-ups
        for (let i = sim.powerUps.length - 1; i >= 0; i--) {
          const p = sim.powerUps[i];
          p.y += p.vy * dt;
          if (p.y > CANVAS_H + 20) {
            sim.powerUps.splice(i, 1);
            continue;
          }
          if (Math.hypot(p.x - sim.playerX, p.y - sim.playerY) < 28) {
            sim.powerUps.splice(i, 1);
            if (p.kind === "repair") {
              sim.shield = Math.min(100, sim.shield + 25);
              setShield(sim.shield);
            } else {
              sim.twinTimer = 10;
            }
            sim.score += 50;
            playGameSound("powerup", mutedRef.current);
          }
        }

        // Periodic React HUD sync (~10x/sec to keep React lightweight)
        uiSyncTick += dt;
        if (uiSyncTick >= 0.09) {
          uiSyncTick = 0;
          setScore(sim.score);
          setTwinTimerUi(Math.ceil(sim.twinTimer));
          if (sim.score > bestScoreRef.current) {
            bestScoreRef.current = sim.score;
            setBestScore(sim.score);
          }
        }
      }

      // Particles update even briefly on game over
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const pt = sim.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) sim.particles.splice(i, 1);
      }

      // Render Canvas
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) {
        // Deep space backdrop
        ctx.fillStyle = "#090d16";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Subtle horizon glow
        const neb = ctx.createRadialGradient(
          CANVAS_W * 0.5,
          CANVAS_H * 0.85,
          20,
          CANVAS_W * 0.5,
          CANVAS_H * 0.85,
          440
        );
        neb.addColorStop(0, "rgba(245, 158, 11, 0.08)");
        neb.addColorStop(1, "rgba(9, 13, 22, 0)");
        ctx.fillStyle = neb;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Stars
        for (const s of sim.stars) {
          ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha})`;
          ctx.fillRect(s.x, s.y, s.size, s.size);
        }

        // Power-ups
        for (const p of sim.powerUps) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.fillStyle = p.kind === "repair" ? "#10b981" : "#f59e0b";
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#090d16";
          ctx.font = "700 12px 'Plus Jakarta Sans', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.kind === "repair" ? "+" : "2x", 0, 1);
          ctx.restore();
        }

        // Bullets
        for (const b of sim.bullets) {
          ctx.fillStyle = b.isEnemy ? "#f87171" : "#fbbf24";
          ctx.beginPath();
          if (b.isEnemy) {
            ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
          } else {
            ctx.roundRect(b.x - 2, b.y - 8, 4, 14, 2);
          }
          ctx.fill();
        }

        // Enemies
        for (const en of sim.enemies) {
          ctx.save();
          ctx.translate(en.x, en.y);
          if (en.kind === "asteroid") {
            ctx.fillStyle = "#57534e";
            ctx.strokeStyle = "#a8a29e";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(0, 0, en.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else if (en.kind === "raider") {
            ctx.fillStyle = "#dc2626";
            ctx.beginPath();
            ctx.moveTo(0, en.radius);
            ctx.lineTo(-en.radius * 0.9, -en.radius * 0.8);
            ctx.lineTo(0, -en.radius * 0.35);
            ctx.lineTo(en.radius * 0.9, -en.radius * 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "#fca5a5";
            ctx.lineWidth = 1.4;
            ctx.stroke();
          } else {
            ctx.fillStyle = "#991b1b";
            ctx.strokeStyle = "#f87171";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-en.radius, -en.radius * 0.65, en.radius * 2, en.radius * 1.3, 6);
            ctx.fill();
            ctx.stroke();
            // Health bar above gunboat
            const hpPct = Math.max(0, en.hp / en.maxHp);
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(-18, -en.radius - 10, 36, 4);
            ctx.fillStyle = "#f87171";
            ctx.fillRect(-18, -en.radius - 10, 36 * hpPct, 4);
          }
          ctx.restore();
        }

        // Particles
        for (const pt of sim.particles) {
          ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
          ctx.fillStyle = pt.color;
          ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        }
        ctx.globalAlpha = 1;

        // Player Ship (Andromeda Interceptor)
        if (gameStateRef.current !== "GAME_OVER") {
          const blinkSkip = sim.invulnTimer > 0 && Math.floor(now / 70) % 2 === 0;
          if (!blinkSkip) {
            ctx.save();
            ctx.translate(sim.playerX, sim.playerY);
            // Thruster plume
            ctx.fillStyle = "#f59e0b";
            ctx.beginPath();
            ctx.moveTo(-5, 14);
            ctx.lineTo(0, 23 + Math.random() * 6);
            ctx.lineTo(5, 14);
            ctx.closePath();
            ctx.fill();

            // Ship wings & hull
            ctx.fillStyle = "#e2e8f0";
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(0, -21);
            ctx.lineTo(18, 14);
            ctx.lineTo(6, 10);
            ctx.lineTo(0, 15);
            ctx.lineTo(-6, 10);
            ctx.lineTo(-18, 14);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Cockpit canopy
            ctx.fillStyle = "#0284c7";
            ctx.beginPath();
            ctx.ellipse(0, -3, 3.5, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onHighScoreChange]);

  const shieldTone =
    shield > 50 ? "text-emerald-400" : shield > 25 ? "text-amber-400" : "text-rose-400";
  const shieldLabel = shield > 50 ? "STABLE" : shield > 25 ? "CAUTION" : "CRITICAL";

  return (
    <div className="space-y-3">
      {/* Unobtrusive Top HUD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800">
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <div className="font-mono tabular-nums">
            <span className="text-stone-400 text-xs mr-1.5">Score</span>
            <span className="font-bold text-white">{score.toLocaleString()}</span>
          </div>
          <div className="font-mono tabular-nums">
            <span className="text-stone-400 text-xs mr-1.5">Wave</span>
            <span className="font-bold text-amber-400">{wave}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono tabular-nums">
            <Shield className={`w-4 h-4 ${shieldTone}`} />
            <span className="text-stone-400 text-xs">Hull</span>
            <span className={`font-bold ${shieldTone}`}>
              {shield}/100 · {shieldLabel}
            </span>
          </div>
          {twinTimerUi > 0 && (
            <div className="font-mono tabular-nums text-xs font-semibold text-amber-300">
              Twin Lasers · {twinTimerUi}s
            </div>
          )}
          <div className="font-mono tabular-nums text-xs text-stone-400">
            Best <span className="text-stone-200 font-semibold">{bestScore.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoFire((v) => !v)}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
              autoFire
                ? "bg-amber-600/20 border-amber-500/50 text-amber-300"
                : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Auto-Fire: {autoFire ? "On" : "Off"}</span>
          </button>

          {(gameState === "PLAYING" || gameState === "PAUSED") && (
            <button
              type="button"
              onClick={togglePause}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-stone-700 bg-stone-950 hover:bg-stone-800 text-stone-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              {gameState === "PAUSED" ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{gameState === "PAUSED" ? "Resume" : "Pause"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Playfield Stage */}
      <div
        className={`relative mx-auto w-full rounded-xl overflow-hidden border border-stone-800 bg-stone-950 shadow-xl ${
          isFullscreen
            ? "max-w-[min(1150px,calc((100vh-175px)*1.72))]"
            : "max-w-[min(920px,calc((100vh-250px)*1.72))]"
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="w-full h-auto block aspect-[860/500] touch-none cursor-crosshair"
        />

        {gameState === "TITLE_MENU" && (
          <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Andromeda: Frontier Defense
            </h3>
            <p className="text-sm text-stone-300 max-w-md mb-6 leading-relaxed">
              Protect Haven Three&apos;s freight lanes from Red Ledger raiders and drifting rocks.
              Steer with Arrow keys, WASD, or move your mouse / finger across the field.
            </p>
            <button
              type="button"
              onClick={startGame}
              className="min-h-[44px] px-7 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Game</span>
            </button>
          </div>
        )}

        {gameState === "PAUSED" && (
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Game Paused</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePause}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume</span>
              </button>
              <button
                type="button"
                onClick={startGame}
                className="min-h-[44px] px-5 py-2.5 rounded-xl border border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-200 text-sm font-medium flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart</span>
              </button>
            </div>
          </div>
        )}

        {gameState === "GAME_OVER" && (
          <div className="absolute inset-0 bg-stone-950/88 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Hull Shields Depleted
            </h3>
            <div className="flex items-center gap-3 text-sm text-stone-300 font-mono tabular-nums mb-6">
              <span>Score: {score.toLocaleString()}</span>
              <span aria-hidden="true">·</span>
              <span>Wave {wave}</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400">Best: {bestScore.toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={startGame}
              className="min-h-[44px] px-7 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
