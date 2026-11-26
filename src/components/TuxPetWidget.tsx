import React, { useState, useEffect, useRef, useCallback } from "react";
import { Fish, Coffee, Heart, Sparkles, Send, ChevronDown, ChevronUp, Gamepad2 } from "lucide-react";

export type TuxMood = "happy" | "cozy" | "hungry" | "hyped" | "sleepy";
type TuxProp = "none" | "fish" | "cocoa" | "scarf" | "sparkles";

interface TuxState {
  hunger: number;
  warmth: number;
  joy: number;
  mood: TuxMood;
  lastLine: string;
  lastSpeaker: string;
  history: { role: "user" | "model"; text: string }[];
}

interface TuxPetWidgetProps {
  contextSummary?: string;
  compactMode?: "chat" | "games";
  theme?: "warm" | "night";
  onAdaNote?: (line: string) => void;
  rightSlot?: React.ReactNode;
}

const STORAGE_KEY = "doc_ada_tux_pet_v1";

const DEFAULT_STATE: TuxState = {
  hunger: 82,
  warmth: 88,
  joy: 90,
  mood: "cozy",
  lastLine: "Co-piloting between Doc & Ada! Toss me a fish or say hey anytime.",
  lastSpeaker: "Tux Jr.",
  history: [],
};

// Soft Web Audio penguin chirp for tactile pet feedback
function playPenguinChirp(kind: "chirp" | "munch" | "sip" | "cheer") {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (kind === "chirp") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.16);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.19);
    } else if (kind === "munch") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.1);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (kind === "sip") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.16);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.21);
    } else {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.07);
      osc.frequency.setValueAtTime(784, now + 0.14);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.start(now);
      osc.stop(now + 0.27);
    }
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 350);
  } catch (_) {}
}

// Expressive animated SVG Penguin (Tux Jr.)
const TuxPenguinSvg: React.FC<{
  mood: TuxMood;
  prop: TuxProp;
  wiggling: boolean;
  blinking: boolean;
  size?: number;
}> = ({ mood, prop, wiggling, blinking, size = 64 }) => {
  const isSleepy = mood === "sleepy";
  const isHyped = mood === "hyped" || wiggling;
  const isCozy = mood === "cozy" || prop === "scarf" || prop === "cocoa";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-hidden="true"
      className={`select-none transition-transform duration-300 ${
        wiggling ? "-translate-y-1.5 scale-105" : ""
      }`}
    >
      {/* Soft Hearth Shadow */}
      <ellipse cx="40" cy="73" rx="22" ry="4" fill="rgba(0,0,0,0.35)" />

      {/* Little Orange Feet */}
      <ellipse cx="31" cy="70" rx="7" ry="3.5" fill="#f59e0b" />
      <ellipse cx="49" cy="70" rx="7" ry="3.5" fill="#f59e0b" />

      {/* Flippers (left & right, flap up when hyped/petted) */}
      <g
        style={{
          transformOrigin: "18px 44px",
          transform: isHyped ? "rotate(-28deg)" : "rotate(6deg)",
          transition: "transform 220ms ease",
        }}
      >
        <ellipse cx="16" cy="48" rx="6.5" ry="14" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
      </g>
      <g
        style={{
          transformOrigin: "62px 44px",
          transform: isHyped ? "rotate(28deg)" : "rotate(-6deg)",
          transition: "transform 220ms ease",
        }}
      >
        <ellipse cx="64" cy="48" rx="6.5" ry="14" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
      </g>

      {/* Main Round Penguin Body */}
      <ellipse cx="40" cy="46" rx="22" ry="25" fill="#1e293b" stroke="#0f172a" strokeWidth="1.8" />
      {/* Head */}
      <circle cx="40" cy="27" r="18" fill="#1e293b" stroke="#0f172a" strokeWidth="1.8" />

      {/* White Belly & Cheek Patches */}
      <ellipse cx="40" cy="50" rx="15" ry="18" fill="#f8fafc" />
      <circle cx="33" cy="27" r="7.5" fill="#f8fafc" />
      <circle cx="47" cy="27" r="7.5" fill="#f8fafc" />

      {/* Cozy Red/Amber Scarf */}
      {isCozy && (
        <g>
          <path d="M24 38 Q40 43 56 38 L54 44 Q40 48 26 44 Z" fill="#dc2626" />
          <rect x="44" y="40" width="6" height="12" rx="2.5" fill="#b91c1c" />
        </g>
      )}

      {/* Eyes (blink, sleepy curves, or bright happy sparkle) */}
      {blinking || isSleepy ? (
        <g stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <path d="M29.5 26.5 Q33 29 36.5 26.5" />
          <path d="M43.5 26.5 Q47 29 50.5 26.5" />
        </g>
      ) : mood === "happy" || mood === "hyped" ? (
        <g>
          <circle cx="33" cy="26" r="2.7" fill="#0f172a" />
          <circle cx="47" cy="26" r="2.7" fill="#0f172a" />
          <circle cx="34" cy="25" r="0.9" fill="#ffffff" />
          <circle cx="48" cy="25" r="0.9" fill="#ffffff" />
        </g>
      ) : (
        <g>
          <circle cx="33" cy="26.5" r="2.5" fill="#0f172a" />
          <circle cx="47" cy="26.5" r="2.5" fill="#0f172a" />
          <circle cx="33.8" cy="25.6" r="0.8" fill="#ffffff" />
          <circle cx="47.8" cy="25.6" r="0.8" fill="#ffffff" />
        </g>
      )}

      {/* Rosy Cheeks */}
      <ellipse cx="27" cy="30.5" rx="3" ry="1.8" fill="#fb7185" opacity="0.55" />
      <ellipse cx="53" cy="30.5" rx="3" ry="1.8" fill="#fb7185" opacity="0.55" />

      {/* Orange Beak */}
      <polygon points="36,30 44,30 40,35.5" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />

      {/* Little Hair Tuft */}
      <path d="M38 9 Q40 4 43 9" fill="none" stroke="#1e293b" strokeWidth="2.4" strokeLinecap="round" />

      {/* Held Props: Golden Fish or Cocoa Mug */}
      {prop === "fish" && (
        <g transform="translate(52, 46) rotate(-14)">
          <ellipse cx="8" cy="5" rx="7.5" ry="4.5" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
          <polygon points="15,5 21,1 21,9" fill="#f59e0b" />
          <circle cx="4.5" cy="4" r="1" fill="#0f172a" />
        </g>
      )}
      {prop === "cocoa" && (
        <g transform="translate(53, 45)">
          <rect x="0" y="3" width="12" height="11" rx="2.5" fill="#92400e" stroke="#f59e0b" strokeWidth="1" />
          <path d="M12 6 Q16 6 16 9 Q16 12 12 12" fill="none" stroke="#f59e0b" strokeWidth="1.4" />
          <path d="M3 1 Q4 -3 6 -1" fill="none" stroke="#e7e5e4" strokeWidth="1.2" opacity="0.8" />
          <path d="M8 1 Q9 -3 11 -1" fill="none" stroke="#e7e5e4" strokeWidth="1.2" opacity="0.8" />
        </g>
      )}
    </svg>
  );
};

export const TuxPetWidget: React.FC<TuxPetWidgetProps> = ({
  contextSummary = "",
  compactMode = "chat",
  theme = "warm",
  rightSlot,
}) => {
  const [pet, setPet] = useState<TuxState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.lastLine === "string") {
          return { ...DEFAULT_STATE, ...parsed };
        }
      }
    } catch (_) {}
    return DEFAULT_STATE;
  });

  const [expanded, setExpanded] = useState<boolean>(false);
  const [prop, setProp] = useState<TuxProp>("scarf");
  const [wiggling, setWiggling] = useState<boolean>(false);
  const [blinking, setBlinking] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [petInput, setPetInput] = useState<string>("");

  const propTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pet));
    } catch (_) {}
  }, [pet]);

  // Subtle autonomous blink loop
  useEffect(() => {
    let blinkTimeout: number;
    const scheduleBlink = () => {
      const wait = 2600 + Math.random() * 2600;
      blinkTimeout = window.setTimeout(() => {
        setBlinking(true);
        window.setTimeout(() => setBlinking(false), 140);
        scheduleBlink();
      }, wait);
    };
    scheduleBlink();
    return () => window.clearTimeout(blinkTimeout);
  }, []);

  // Gentle stat drift over long idle periods
  useEffect(() => {
    const id = window.setInterval(() => {
      setPet((prev) => ({
        ...prev,
        hunger: Math.max(20, prev.hunger - 1),
        warmth: Math.max(30, prev.warmth - 1),
      }));
    }, 90000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (propTimerRef.current) window.clearTimeout(propTimerRef.current);
    };
  }, []);

  const triggerWiggle = (nextProp: TuxProp, durationMs = 2800) => {
    setWiggling(true);
    setProp(nextProp);
    if (propTimerRef.current) window.clearTimeout(propTimerRef.current);
    window.setTimeout(() => setWiggling(false), 650);
    propTimerRef.current = window.setTimeout(() => {
      setProp("scarf");
    }, durationMs);
  };

  const askTuxAi = useCallback(
    async (
      action: "pet" | "fish" | "cocoa" | "play" | "chime_in" | "talk",
      userMessage = ""
    ) => {
      setIsThinking(true);

      // Update local care stats immediately
      let nextStats = { hunger: pet.hunger, warmth: pet.warmth, joy: pet.joy };
      if (action === "pet") {
        nextStats.joy = Math.min(100, pet.joy + 10);
        nextStats.warmth = Math.min(100, pet.warmth + 4);
        playPenguinChirp("chirp");
        triggerWiggle("sparkles");
      } else if (action === "fish") {
        nextStats.hunger = Math.min(100, pet.hunger + 18);
        nextStats.joy = Math.min(100, pet.joy + 6);
        playPenguinChirp("munch");
        triggerWiggle("fish", 4200);
      } else if (action === "cocoa") {
        nextStats.warmth = Math.min(100, pet.warmth + 18);
        nextStats.joy = Math.min(100, pet.joy + 6);
        playPenguinChirp("sip");
        triggerWiggle("cocoa", 4200);
      } else if (action === "play") {
        nextStats.joy = Math.min(100, pet.joy + 14);
        nextStats.hunger = Math.max(10, pet.hunger - 3);
        playPenguinChirp("cheer");
        triggerWiggle("sparkles");
      } else {
        playPenguinChirp("chirp");
        triggerWiggle("scarf");
      }

      setPet((prev) => ({
        ...prev,
        ...nextStats,
      }));

      try {
        const res = await fetch("/api/tux/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            message: userMessage,
            context: contextSummary,
            stats: nextStats,
            history: pet.history.slice(-6),
          }),
        });
        const data = await res.json();
        const replyLine =
          data?.reply ||
          "*happy flipper flaps!* Right here with you and Ada, Doc!";
        const mood: TuxMood =
          data?.mood === "cozy" ||
          data?.mood === "hungry" ||
          data?.mood === "hyped" ||
          data?.mood === "sleepy"
            ? data.mood
            : "happy";

        setPet((prev) => {
          const appended: { role: "user" | "model"; text: string }[] = [
            ...prev.history,
            ...(userMessage ? [{ role: "user" as const, text: userMessage }] : []),
            { role: "model" as const, text: replyLine },
          ].slice(-8);
          return {
            ...prev,
            ...nextStats,
            mood,
            lastLine: replyLine,
            history: appended,
          };
        });
      } catch (_) {
        // Keep optimistic stat boost and gentle local chirp
        setPet((prev) => ({
          ...prev,
          ...nextStats,
          mood: action === "cocoa" ? "cozy" : "happy",
          lastLine: "*happy penguin chirp!* Thanks for hanging out with me, Doc & Ada!",
        }));
      } finally {
        setIsThinking(false);
      }
    },
    [contextSummary, pet.history, pet.hunger, pet.joy, pet.warmth]
  );

  const handleSubmitTalk = (e: React.FormEvent) => {
    e.preventDefault();
    const text = petInput.trim();
    if (!text || isThinking) return;
    setPetInput("");
    askTuxAi("talk", text);
  };

  const containerSurface =
    theme === "warm"
      ? "bg-amber-950/20 border-amber-900/35"
      : "bg-slate-950/90 border-slate-800";

  return (
    <div className={`border-b ${containerSurface}`}>
      {/* Compact Top Companion Bar */}
      <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2 text-left cursor-pointer group shrink-0"
            title={expanded ? "Minimize Tux Jr. Pet Corner" : "Open Tux Jr. AI Pet Corner"}
          >
            <TuxPenguinSvg
              mood={pet.mood}
              prop={prop}
              wiggling={wiggling}
              blinking={blinking}
              size={34}
            />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-white">Tux Jr.</span>
              <span className="text-[11px] text-stone-400 hidden sm:inline">
                Shared Penguin Pet <span aria-hidden="true">·</span> Doc &amp; Ada
              </span>
            </div>
            <p className="text-xs text-amber-200/90 truncate" title={pet.lastLine}>
              {isThinking ? "*waddling over to answer...*" : pet.lastLine}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={isThinking}
            onClick={() => askTuxAi("pet")}
            className="px-2.5 py-1 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Pet Tux Jr."
          >
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline">Pet</span>
          </button>

          <button
            type="button"
            disabled={isThinking}
            onClick={() => askTuxAi("fish")}
            className="px-2.5 py-1 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Toss Tux Jr. a fish"
          >
            <Fish className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Fish</span>
          </button>

          <button
            type="button"
            disabled={isThinking}
            onClick={() => askTuxAi("cocoa")}
            className="px-2.5 py-1 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Give Tux Jr. warm cocoa"
          >
            <Coffee className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden md:inline">Cocoa</span>
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
              expanded
                ? "bg-amber-600 border-amber-500 text-white"
                : "bg-stone-900/90 border-stone-800 text-stone-300 hover:text-white"
            }`}
          >
            <span>{expanded ? "Hide" : "Talk to Tux"}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {rightSlot}
        </div>
      </div>

      {/* Expandable Interactive Penguin Pet Corner */}
      {expanded && (
        <div className="px-4 pb-3.5 pt-2 border-t border-stone-800/70 bg-stone-950/60 flex flex-col sm:flex-row items-center gap-4">
          <button
            type="button"
            onClick={() => askTuxAi("pet")}
            className="shrink-0 cursor-pointer hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-xl p-1"
            title="Click Tux Jr. for scritches!"
          >
            <TuxPenguinSvg
              mood={pet.mood}
              prop={prop}
              wiggling={wiggling}
              blinking={blinking}
              size={78}
            />
          </button>

          <div className="flex-1 w-full space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
              <div className="flex items-center gap-2 font-mono tabular-nums">
                <span>
                  Fullness <strong className="text-stone-200">{pet.hunger}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Warmth <strong className="text-stone-200">{pet.warmth}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Joy <strong className="text-amber-300">{pet.joy}</strong>
                </span>
              </div>

              <button
                type="button"
                disabled={isThinking}
                onClick={() => askTuxAi(compactMode === "games" ? "play" : "chime_in")}
                className="text-xs font-medium text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {compactMode === "games" ? (
                  <>
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>React to Game</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Chime In</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-sm text-stone-100 leading-snug">{pet.lastLine}</p>

            <form onSubmit={handleSubmitTalk} className="flex items-center gap-2">
              <input
                type="text"
                value={petInput}
                onChange={(e) => setPetInput(e.target.value)}
                placeholder="Talk directly to Tux Jr. (e.g. Hey buddy, want a fish?)..."
                className="flex-1 bg-stone-900 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!petInput.trim() || isThinking}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
