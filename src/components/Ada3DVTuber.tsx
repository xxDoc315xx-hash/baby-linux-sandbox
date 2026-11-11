import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Mic } from "lucide-react";

// Generated professional 2D VTuber sprite assets (Golden Blonde with Signature Bow)
import adaIdleImg from "../assets/images/ada_blonde_idle_1791569686507.jpg";
import adaTalkImg from "../assets/images/ada_blonde_talk_1791569702230.jpg";
import adaHappyImg from "../assets/images/ada_blonde_happy_1791569717131.jpg";
import adaThinkImg from "../assets/images/ada_blonde_think_1791569733518.jpg";

export type AdaMotion =
  | "idle"
  | "wave"
  | "dance"
  | "cheer"
  | "think"
  | "heart"
  | "cat"
  | "bow"
  | "hug"
  | "stretch"
  | "blush"
  | "highfive";

export interface Ada3DVTuberProps {
  motion?: AdaMotion;
  mood?:
    | "warm"
    | "listening"
    | "laughing"
    | "thinking"
    | "cozy"
    | "happy"
    | "surprised";
  isSpeaking?: boolean;
  speakingText?: string;
  onMotionChange?: (motion: AdaMotion) => void;
  compact?: boolean;
  className?: string;
}

export const Ada3DVTuber: React.FC<Ada3DVTuberProps> = ({
  motion = "idle",
  mood = "warm",
  isSpeaking = false,
  speakingText = "",
  onMotionChange,
  compact = false,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active state
  const [activeMotion, setActiveMotion] = useState<AdaMotion>(motion);
  const [activeMood, setActiveMood] = useState<typeof mood>(mood);
  const [cameraFraming, setCameraFraming] = useState<"full" | "medium" | "portrait">("full");
  const [interactiveGlow, setInteractiveGlow] = useState(false);

  // Sync prop changes
  useEffect(() => {
    if (motion) setActiveMotion(motion);
  }, [motion]);

  useEffect(() => {
    if (mood) setActiveMood(mood);
  }, [mood]);

  // -------------------------------------------------------------
  // 1. NATURAL EYE BLINKING SYSTEM
  // -------------------------------------------------------------
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleNextBlink = useCallback(() => {
    const nextInterval = 2800 + Math.random() * 2600;
    blinkTimeoutRef.current = setTimeout(() => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        // 25% chance of realistic double-blink
        if (Math.random() < 0.25) {
          setTimeout(() => {
            setIsBlinking(true);
            setTimeout(() => {
              setIsBlinking(false);
              scheduleNextBlink();
            }, 85);
          }, 110);
        } else {
          scheduleNextBlink();
        }
      }, 95);
    }, nextInterval);
  }, []);

  useEffect(() => {
    scheduleNextBlink();
    return () => {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
    };
  }, [scheduleNextBlink]);

  // -------------------------------------------------------------
  // 2. AUTOMATIC LIP-SYNC SYSTEM
  // -------------------------------------------------------------
  const [mouthOpenProgress, setMouthOpenProgress] = useState(0); // 0 (closed) to 1 (open)
  const speechAnimRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSpeaking) {
      setMouthOpenProgress(0);
      if (speechAnimRef.current) {
        cancelAnimationFrame(speechAnimRef.current);
        speechAnimRef.current = null;
      }
      return;
    }

    const startTime = performance.now();
    const animateLipSync = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      // Speech modulation: fast syllable waves + sentence rhythm + breathing pauses
      const syllableWave = Math.sin(elapsed * 14) * 0.5 + 0.5;
      const cadenceWave = Math.sin(elapsed * 4) * 0.3 + 0.7;
      const pauseWave = Math.sin(elapsed * 2.2) > -0.55 ? 1 : 0.15;

      const openVal = Math.max(0, Math.min(1, syllableWave * cadenceWave * pauseWave));
      setMouthOpenProgress(openVal);

      speechAnimRef.current = requestAnimationFrame(animateLipSync);
    };

    speechAnimRef.current = requestAnimationFrame(animateLipSync);
    return () => {
      if (speechAnimRef.current) cancelAnimationFrame(speechAnimRef.current);
    };
  }, [isSpeaking, speakingText]);

  // -------------------------------------------------------------
  // 3. 2.5D PARALLAX & GAZE TRACKING
  // -------------------------------------------------------------
  const [mouseOffset, setMouseOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMouseOffset({
      x: Math.max(-1, Math.min(1, nx)),
      y: Math.max(-1, Math.min(1, ny)),
    });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  // Motion trigger helper
  const handleTriggerMotion = (m: AdaMotion) => {
    setActiveMotion(m);
    if (onMotionChange) onMotionChange(m);
    setInteractiveGlow(true);
    setTimeout(() => setInteractiveGlow(false), 1200);

    if (m !== "idle") {
      setTimeout(() => {
        setActiveMotion("idle");
        if (onMotionChange) onMotionChange("idle");
      }, 4200);
    }
  };

  // -------------------------------------------------------------
  // 4. ACTIVE SPRITE RESOLUTION & CROSSFADING
  // -------------------------------------------------------------
  const isHappy =
    activeMood === "happy" ||
    activeMood === "laughing" ||
    activeMotion === "cheer" ||
    activeMotion === "heart" ||
    activeMotion === "blush";

  const isThinking =
    activeMood === "thinking" || activeMotion === "think";

  // Camera framing transforms
  const cameraTransform = useMemo(() => {
    switch (cameraFraming) {
      case "portrait":
        return "scale(1.38) translateY(42px)";
      case "medium":
        return "scale(1.16) translateY(22px)";
      case "full":
      default:
        return "scale(1) translateY(0px)";
    }
  }, [cameraFraming]);

  // Subtle 2.5D VTuber parallax tilt based on mouse
  const parallaxStyle = useMemo(() => {
    const rotY = mouseOffset.x * 6; // -6deg to +6deg
    const rotX = -mouseOffset.y * 4; // -4deg to +4deg
    const transX = mouseOffset.x * 12;
    const transY = mouseOffset.y * 8;

    if (activeMotion === "dance") {
      return {
        transform: `perspective(900px) rotateY(${rotY}deg) rotateX(${rotX}deg) translateX(${transX}px) translateY(${transY}px)`,
        animation: "danceFloat 2s infinite ease-in-out",
      };
    }

    if (activeMotion === "wave") {
      return {
        transform: `perspective(900px) rotateY(${rotY + 2}deg) rotateX(${rotX}deg) translateX(${transX}px) translateY(${transY}px)`,
        animation: "waveTilt 1.2s infinite ease-in-out",
      };
    }

    return {
      transform: `perspective(900px) rotateY(${rotY}deg) rotateX(${rotX}deg) translateX(${transX}px) translateY(${transY}px)`,
      animation: "breatheFloat 4.2s infinite ease-in-out",
    };
  }, [mouseOffset, activeMotion]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-full select-none overflow-hidden bg-gradient-to-b from-stone-900 via-stone-950 to-black flex flex-col items-center justify-center ${className}`}
    >
      {/* Studio Ambient Backlight Glows */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-amber-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-12 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)]" />
      </div>

      {/* Ambient VTuber Stage Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top Floating Info Badge (Clean & Non-Intrusive) */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-30">
        <div className="px-3 py-1 rounded-full text-[11px] font-medium bg-stone-900/85 backdrop-blur-md border border-stone-700/80 text-stone-200 flex items-center gap-2 shadow-md">
          <span
            className={`w-2 h-2 rounded-full transition-colors ${
              isSpeaking
                ? "bg-emerald-400 animate-ping"
                : activeMotion !== "idle"
                ? "bg-amber-400 animate-pulse"
                : "bg-amber-500"
            }`}
          />
          <span className="font-semibold tracking-wide">
            {isSpeaking ? "Ada · Live Speech Sync" : "Ada · 2D Anime VTuber"}
          </span>
        </div>

        {activeMotion !== "idle" && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm animate-bounce">
            {activeMotion}
          </span>
        )}
      </div>

      {/* Main VTuber Avatar Stage Container */}
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-500 ease-out origin-center relative overflow-hidden"
        style={{ transform: cameraTransform }}
      >
        <div
          className="relative w-full max-w-[440px] aspect-[3/4] max-h-[90%] flex items-center justify-center transition-transform duration-150 ease-out"
          style={parallaxStyle}
        >
          {/* Base Character Shadow */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-black/60 blur-xl rounded-full pointer-events-none" />

          {/* ------------------------------------------------------------- */}
          {/* SPRITE LAYER 1: BASE NEUTRAL / IDLE STATE (SOLID ANCHOR)      */}
          {/* ------------------------------------------------------------- */}
          <img
            src={adaIdleImg}
            alt="Ada VTuber Idle"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_16px_36px_rgba(0,0,0,0.7)] pointer-events-none"
          />

          {/* ------------------------------------------------------------- */}
          {/* SPRITE LAYER 2: TALKING / LIP-SYNC STATE (MOUTH OVERLAY)      */}
          {/* ------------------------------------------------------------- */}
          <img
            src={adaTalkImg}
            alt="Ada VTuber Talking"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_16px_36px_rgba(0,0,0,0.7)] transition-opacity duration-100 pointer-events-none"
            style={{
              opacity: isSpeaking && mouthOpenProgress >= 0.2 ? Math.min(1, mouthOpenProgress * 1.35) : 0,
            }}
          />

          {/* ------------------------------------------------------------- */}
          {/* SPRITE LAYER 3: HAPPY / SMILING STATE                         */}
          {/* ------------------------------------------------------------- */}
          <img
            src={adaHappyImg}
            alt="Ada VTuber Happy"
            referrerPolicy="no-referrer"
            className={`absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_16px_36px_rgba(0,0,0,0.7)] transition-opacity duration-300 pointer-events-none ${
              isHappy ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* ------------------------------------------------------------- */}
          {/* SPRITE LAYER 4: THINKING / CONTEMPLATIVE STATE                */}
          {/* ------------------------------------------------------------- */}
          <img
            src={adaThinkImg}
            alt="Ada VTuber Thinking"
            referrerPolicy="no-referrer"
            className={`absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_16px_36px_rgba(0,0,0,0.7)] transition-opacity duration-300 pointer-events-none ${
              isThinking && !isHappy ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* ------------------------------------------------------------- */}
          {/* NATURAL EYE BLINK MICRO-FLUTTER                               */}
          {/* ------------------------------------------------------------- */}
          {/* Seamless, organic eyelid flutter and subtle upper-crease shade */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-75 ${
              isBlinking ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className="absolute top-[26%] left-1/2 -translate-x-1/2 w-44 h-12 flex items-center justify-between px-7 pointer-events-none"
              style={{ transform: "scaleY(0.94)" }}
            >
              <div className="w-9 h-1.5 bg-[#251510]/80 rounded-full blur-[0.5px] transform -rotate-3" />
              <div className="w-9 h-1.5 bg-[#251510]/80 rounded-full blur-[0.5px] transform rotate-3" />
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* INTERACTIVE AMBIENT ACCENTS & VISUALIZER BARS                 */}
          {/* ------------------------------------------------------------- */}
          {isSpeaking && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-stone-900/80 backdrop-blur-md border border-emerald-500/40 shadow-lg">
              <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <div className="flex items-center gap-0.5 h-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-emerald-400 rounded-full animate-bounce"
                    style={{
                      height: `${40 + ((i * 18) % 60)}%`,
                      animationDelay: `${i * 0.12}s`,
                      animationDuration: "0.55s",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global CSS keyframes for floating, dancing, and breathing */}
      <style>{`
        @keyframes breatheFloat {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-6px) scale(1.008);
          }
        }
        @keyframes danceFloat {
          0%, 100% {
            transform: translateY(0px) rotate(-2deg);
          }
          50% {
            transform: translateY(-10px) rotate(2deg);
          }
        }
        @keyframes waveTilt {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-5px) rotate(3deg);
          }
        }
      `}</style>
    </div>
  );
};

export const AdaAvatar2D = Ada3DVTuber;
export default Ada3DVTuber;
