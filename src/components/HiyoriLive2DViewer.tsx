import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";

interface HiyoriLive2DViewerProps {
  model3JsonUrl?: string;
  customFiles?: File[] | FileList | null;
  isSpeaking?: boolean;
  className?: string;
  width?: number;
  height?: number;
}

declare global {
  interface Window {
    PIXI: any;
    Live2DCubismCore: any;
  }
}

// Global flag to ensure ticker is registered only once
let isTickerRegistered = false;

// Helper to safely patch PIXI Shader system check
const patchPixiShaderCheck = () => {
  if (typeof window === "undefined" || !window.PIXI || !window.PIXI.utils) return;
  const utils = window.PIXI.utils;
  if (typeof utils.checkMaxIfStatementsInShader === "function" && !(utils.checkMaxIfStatementsInShader as any)._patched) {
    const origCheck = utils.checkMaxIfStatementsInShader;
    const safeCheck = function (maxIfStatements: number, maxTextures: number) {
      const safeIfs = !maxIfStatements || maxIfStatements <= 0 ? 16 : maxIfStatements;
      const safeTex = !maxTextures || maxTextures <= 0 ? 16 : maxTextures;
      try {
        return origCheck.call(utils, safeIfs, safeTex);
      } catch (_) {
        return 16;
      }
    };
    (safeCheck as any)._patched = true;
    utils.checkMaxIfStatementsInShader = safeCheck;
  }
};

export const HiyoriLive2DViewer: React.FC<HiyoriLive2DViewerProps> = ({
  model3JsonUrl = "/hiyori/Hiyori.model3.json",
  customFiles = null,
  isSpeaking = false,
  className = "",
  width = 260,
  height = 280,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<any>(null);
  const appRef = useRef<any>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);

  // Global error & promise rejection handler to prevent texture loading errors from breaking UI
  useEffect(() => {
    const handleGlobalError = (e: any) => {
      const msg = e?.message || e?.reason?.message || e?.reason || "";
      if (
        typeof msg === "string" &&
        (msg.includes("checkMaxIfStatementsInShader") ||
          msg.includes("Texture loading error") ||
          msg.includes("texture") ||
          msg.includes("Live2D") ||
          msg.includes("WebGL"))
      ) {
        if (typeof e?.preventDefault === "function") e.preventDefault();
        console.warn("Handled Live2D WebGL note gracefully:", msg);
      }
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleGlobalError);

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleGlobalError);
    };
  }, []);

  // Eye blinking timer for vector fallback
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initLive2D = async () => {
      setLoading(true);
      setErrorMsg(null);
      patchPixiShaderCheck();

      // Wait for window.PIXI, window.PIXI.live2d, and window.Live2DCubismCore
      let attempts = 0;
      while (attempts < 25) {
        if (
          window.PIXI &&
          window.PIXI.live2d &&
          window.PIXI.live2d.Live2DModel &&
          window.Live2DCubismCore
        ) {
          break;
        }
        await new Promise((res) => setTimeout(res, 200));
        attempts++;
      }

      if (!isMounted) return;

      if (!window.PIXI || !window.PIXI.live2d || !window.PIXI.live2d.Live2DModel) {
        setErrorMsg("Live2D Cubism runtime script missing.");
        setLoading(false);
        return;
      }

      if (!canvasRef.current) return;

      try {
        patchPixiShaderCheck();
        const { Live2DModel, cubism4Ready } = window.PIXI.live2d;

        // Ensure Cubism4 Core is initialized before model creation
        if (typeof cubism4Ready === "function") {
          await cubism4Ready();
        }

        // Register Ticker once
        if (!isTickerRegistered && window.PIXI.Ticker && typeof Live2DModel.registerTicker === "function") {
          try {
            Live2DModel.registerTicker(window.PIXI.Ticker);
            isTickerRegistered = true;
          } catch (e) {
            console.warn("Ticker registration note:", e);
          }
        }

        // Clean up previous app if re-initializing
        if (appRef.current) {
          try {
            appRef.current.destroy(true, { children: true, texture: false, baseTexture: false });
          } catch (_) {}
          appRef.current = null;
        }

        // Ensure canvas element dimensions are explicitly set
        if (canvasRef.current) {
          canvasRef.current.width = width || 260;
          canvasRef.current.height = height || 280;
        }

        // Create PIXI Application with safe options
        let app: any = null;
        try {
          app = new window.PIXI.Application({
            view: canvasRef.current,
            width: width || 260,
            height: height || 280,
            backgroundAlpha: 0,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: true,
          });
        } catch (appErr: any) {
          console.warn("PIXI Application creation note:", appErr);
          if (isMounted) {
            setErrorMsg(appErr?.message || "WebGL context creation failed");
            setLoading(false);
          }
          return;
        }

        appRef.current = app;

        // Determine model source
        let modelSource: any = model3JsonUrl;
        if (customFiles && customFiles.length > 0) {
          modelSource = Array.from(customFiles);
        }

        let model: any = null;
        try {
          model = await Live2DModel.from(modelSource, {
            autoUpdate: true,
            autoInteract: true,
          });
        } catch (primaryErr: any) {
          console.warn("Primary Live2D model load issue:", primaryErr);
          // If primary model URL is not default, try fallback to /hiyori/Hiyori.model3.json
          if (model3JsonUrl !== "/hiyori/Hiyori.model3.json") {
            try {
              model = await Live2DModel.from("/hiyori/Hiyori.model3.json", {
                autoUpdate: true,
                autoInteract: true,
              });
            } catch (fallbackErr: any) {
              console.warn("Fallback Live2D model failed:", fallbackErr);
            }
          }
        }

        if (!isMounted) return;

        if (!model) {
          setErrorMsg("Live2D model mesh & textures failed to load.");
          setLoading(false);
          return;
        }

        modelRef.current = model;
        app.stage.addChild(model);

        // Scale and position model nicely within container
        const origW = model.width || model.internalModel?.originalWidth || 500;
        const origH = model.height || model.internalModel?.originalHeight || 600;

        const scaleX = ((width || 260) * 0.85) / origW;
        const scaleY = ((height || 280) * 0.92) / origH;
        const fitScale = Math.min(scaleX, scaleY);

        if (model.scale && typeof model.scale.set === "function") {
          model.scale.set(fitScale);
        }

        if (model.anchor && typeof model.anchor.set === "function") {
          model.anchor.set(0.5, 0.45);
        }

        model.x = (width || 260) / 2;
        model.y = (height || 280) / 2;

        setLoading(false);
      } catch (err: any) {
        console.warn("Live2D WebGL initialization note:", err);
        if (isMounted) {
          setErrorMsg(err?.message || "WebGL initialization context note.");
          setLoading(false);
        }
      }
    };

    initLive2D();

    return () => {
      isMounted = false;
      if (modelRef.current) {
        try {
          modelRef.current.destroy();
        } catch (_) {}
        modelRef.current = null;
      }
      if (appRef.current) {
        try {
          appRef.current.destroy(true, { children: true, texture: false, baseTexture: false });
        } catch (_) {}
        appRef.current = null;
      }
    };
  }, [model3JsonUrl, customFiles, width, height]);

  // Head & Eye focus on mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (modelRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / rect.width - 0.5;
        const mouseY = (e.clientY - rect.top) / rect.height - 0.5;
        try {
          if (typeof modelRef.current.focus === "function") {
            modelRef.current.focus(mouseX * 2, mouseY * 2);
          }
        } catch (_) {}
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // WebGL Lip Sync during speech
  useEffect(() => {
    let interval: any;
    const setMouthOpen = (val: number) => {
      try {
        const core = modelRef.current?.internalModel?.coreModel;
        if (!core) return;

        if (typeof core.setParameterValueById === "function") {
          core.setParameterValueById("ParamMouthOpenY", val);
        } else if (typeof core.setParameterValueByIndex === "function") {
          const idx = core.getParameterIndex ? core.getParameterIndex("ParamMouthOpenY") : -1;
          if (idx !== -1) {
            core.setParameterValueByIndex(idx, val);
          }
        }
      } catch (_) {}
    };

    if (isSpeaking && modelRef.current) {
      interval = setInterval(() => {
        const val = Math.random() * 0.75 + 0.2;
        setMouthOpen(val);
      }, 90);
    } else if (modelRef.current) {
      setMouthOpen(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSpeaking]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Loading indicator while WebGL compiles Live2D model */}
      {loading && !errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm rounded-xl border border-amber-500/20 text-amber-300 z-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-2" />
          <span className="text-xs font-mono tracking-wider">Compiling WebGL Live2D Mesh...</span>
        </div>
      )}

      {/* WebGL Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`w-full h-full block relative z-10 transition-opacity duration-500 ${
          errorMsg ? "opacity-0 absolute pointer-events-none" : "opacity-100"
        }`}
      />

      {/* Vector Mentor Fallback Graphic (Renders if WebGL Context or Live2D model errors) */}
      {errorMsg && !loading && (
        <div className="w-full h-full flex flex-col items-center justify-center relative z-10">
          <svg
            width={width}
            height={height}
            viewBox="0 0 220 260"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_0_25px_rgba(245,158,11,0.35)]"
          >
            {/* Glowing Background Aura */}
            <circle cx="110" cy="110" r="95" fill="url(#hiyori_vector_glow)" opacity="0.65" />

            {/* Back Hair */}
            <path d="M38 85 C28 140 34 220 48 255 L172 255 C186 220 192 140 182 85 Z" fill="#4a2c11" />

            {/* Beige Cardigan Sweater */}
            <path d="M48 255 L68 152 L152 152 L172 255 Z" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />

            {/* Dark Blue Sailor Collar */}
            <path d="M70 152 L110 210 L150 152 L136 152 L110 190 L84 152 Z" fill="#1e3a8a" stroke="#2563eb" strokeWidth="1.5" />

            {/* Inner Shirt & Ribbon */}
            <polygon points="98,152 122,152 110,178" fill="#ffffff" />
            <path d="M104 172 L90 225 L108 215 L110 182 Z" fill="#3b82f6" />
            <path d="M116 172 L130 225 L112 215 L110 182 Z" fill="#2563eb" />
            <circle cx="110" cy="176" r="4.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />

            {/* Cardigan Buttons */}
            <circle cx="88" cy="205" r="2.5" fill="#d97706" />
            <circle cx="88" cy="232" r="2.5" fill="#d97706" />

            {/* Neck */}
            <rect x="97" y="128" width="26" height="30" fill="#fff3eb" rx="4" />

            {/* Head Structure */}
            <rect x="62" y="38" width="96" height="100" rx="48" fill="#fff5eb" stroke="#fed7aa" strokeWidth="2" />

            {/* Ears */}
            <ellipse cx="59" cy="88" rx="5" ry="8" fill="#ffedd5" />
            <ellipse cx="161" cy="88" rx="5" ry="8" fill="#ffedd5" />

            {/* Hiyori Warm Amber Eyes */}
            {!isBlinking ? (
              <>
                <ellipse cx="88" cy="84" rx="11" ry="14" fill="#ffffff" stroke="#78350f" strokeWidth="1.5" />
                <ellipse cx="88" cy="85" rx="7.5" ry="10" fill="#d97706" />
                <ellipse cx="88" cy="87" rx="4" ry="6" fill="#78350f" />
                <circle cx="85" cy="80" r="3" fill="#ffffff" />
                <circle cx="91" cy="90" r="1.5" fill="#fde68a" />
                <path d="M75 74 Q88 70 101 74" stroke="#4a2c11" strokeWidth="2.5" strokeLinecap="round" fill="none" />

                <ellipse cx="132" cy="84" rx="11" ry="14" fill="#ffffff" stroke="#78350f" strokeWidth="1.5" />
                <ellipse cx="132" cy="85" rx="7.5" ry="10" fill="#d97706" />
                <ellipse cx="132" cy="87" rx="4" ry="6" fill="#78350f" />
                <circle cx="129" cy="80" r="3" fill="#ffffff" />
                <circle cx="135" cy="90" r="1.5" fill="#fde68a" />
                <path d="M119 74 Q132 70 145 74" stroke="#4a2c11" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </>
            ) : (
              <>
                <path d="M76 85 Q88 92 100 85" stroke="#78350f" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M120 85 Q132 92 144 85" stroke="#78350f" strokeWidth="3" fill="none" strokeLinecap="round" />
              </>
            )}

            {/* Eyebrows */}
            <path d="M77 65 Q88 61 99 66" stroke="#78350f" strokeWidth="1.5" fill="none" />
            <path d="M121 66 Q132 61 143 65" stroke="#78350f" strokeWidth="1.5" fill="none" />

            {/* Cheeks Pink Blush */}
            <ellipse cx="73" cy="97" rx="8" ry="4" fill="#fb7185" opacity="0.45" />
            <ellipse cx="147" cy="97" rx="8" ry="4" fill="#fb7185" opacity="0.45" />

            {/* Nose */}
            <circle cx="110" cy="97" r="1.2" fill="#d97706" />

            {/* Dynamic Mouth / Lip Sync */}
            {isSpeaking ? (
              <g>
                <motion.path
                  d="M100 109 Q110 125 120 109 Z"
                  fill="#9f1239"
                  stroke="#881337"
                  strokeWidth="1.5"
                  animate={{ scaleY: [0.8, 1.35, 0.75, 1.2, 0.8] }}
                  transition={{ repeat: Infinity, duration: 0.22 }}
                />
                <path d="M103 111 Q110 114 117 111" fill="#ffffff" />
              </g>
            ) : (
              <path d="M102 111 Q110 118 118 111" stroke="#9f1239" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            )}

            {/* Front Bangs */}
            <path d="M58 68 Q80 26 110 30 Q140 26 162 68 Q136 46 110 50 Q84 46 58 68 Z" fill="#6b3f19" />
            <path d="M84 38 Q104 76 110 80 Q112 63 126 40" fill="#6b3f19" />

            {/* Twin Side Hair Strands */}
            <path d="M60 63 Q43 110 50 180 Q60 185 66 140 Q66 95 70 68 Z" fill="#5c3d2e" stroke="#78350f" strokeWidth="0.8" />
            <path d="M160 63 Q177 110 170 180 Q160 185 154 140 Q154 95 150 68 Z" fill="#5c3d2e" stroke="#78350f" strokeWidth="0.8" />

            {/* Yellow Star/Bar Hair Clip */}
            <rect x="146" y="50" width="11" height="4.5" rx="1" fill="#f59e0b" transform="rotate(-15 146 50)" />

            <defs>
              <radialGradient id="hiyori_vector_glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(110 110) scale(95)">
                <stop stopColor="#f59e0b" />
                <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      )}
    </div>
  );
};



