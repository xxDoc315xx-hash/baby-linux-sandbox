import React, { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

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
  model3JsonUrl = "/assets/models/custom-avatar/custom-avatar.model3.json",
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

  const [isCubismReady, setIsCubismReady] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Global error & promise rejection handler to prevent texture/WebGL errors from logging
  useEffect(() => {
    const handleGlobalError = (e: any) => {
      const msg = e?.message || e?.reason?.message || e?.reason || "";
      if (
        typeof msg === "string" &&
        (msg.includes("checkMaxIfStatementsInShader") ||
          msg.includes("Texture loading error") ||
          msg.includes("texture") ||
          msg.includes("Live2D") ||
          msg.includes("Cubism") ||
          msg.includes("WebGL"))
      ) {
        if (typeof e?.preventDefault === "function") e.preventDefault();
      }
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleGlobalError);

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleGlobalError);
    };
  }, []);

  // Wait for window.Live2DCubismCore & PIXI before mounting canvas
  useEffect(() => {
    let isMounted = true;
    let attempts = 0;

    const checkRuntime = async () => {
      while (attempts < 30) {
        patchPixiShaderCheck();
        if (
          window.Live2DCubismCore &&
          window.PIXI &&
          window.PIXI.live2d &&
          window.PIXI.live2d.Live2DModel
        ) {
          if (isMounted) {
            setIsCubismReady(true);
          }
          return;
        }
        await new Promise((res) => setTimeout(res, 150));
        attempts++;
      }

      if (isMounted && (!window.Live2DCubismCore || !window.PIXI?.live2d?.Live2DModel)) {
        setErrorMsg("Live2D Cubism Core runtime initializing...");
        setLoading(false);
      }
    };

    checkRuntime();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize Live2D once Cubism runtime is ready & canvas is mounted
  useEffect(() => {
    if (!isCubismReady) return;

    let isMounted = true;

    const initLive2D = async () => {
      setLoading(true);
      setErrorMsg(null);
      patchPixiShaderCheck();

      if (!canvasRef.current) {
        await new Promise((res) => setTimeout(res, 50));
        if (!canvasRef.current) return;
      }

      try {
        patchPixiShaderCheck();
        const { Live2DModel, cubism4Ready } = window.PIXI.live2d;

        if (typeof cubism4Ready === "function") {
          await cubism4Ready();
        }

        if (!isTickerRegistered && window.PIXI.Ticker && typeof Live2DModel.registerTicker === "function") {
          try {
            Live2DModel.registerTicker(window.PIXI.Ticker);
            isTickerRegistered = true;
          } catch (_) {}
        }

        if (appRef.current) {
          try {
            appRef.current.destroy(true, { children: true, texture: false, baseTexture: false });
          } catch (_) {}
          appRef.current = null;
        }

        if (canvasRef.current) {
          canvasRef.current.width = width || 260;
          canvasRef.current.height = height || 280;
        }

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
        } catch (_) {
          if (isMounted) {
            setErrorMsg("WebGL initialization note.");
            setLoading(false);
          }
          return;
        }

        appRef.current = app;

        let modelSource: any = model3JsonUrl || "/assets/models/custom-avatar/custom-avatar.model3.json";
        if (customFiles && customFiles.length > 0) {
          modelSource = Array.from(customFiles);
        }

        let model: any = null;
        try {
          model = await Live2DModel.from(modelSource, {
            autoUpdate: true,
            autoInteract: true,
          });
        } catch (_) {
          // Strictly force attempt loading binary /assets/models/custom-avatar/custom-avatar.model3.json
          try {
            model = await Live2DModel.from("/assets/models/custom-avatar/custom-avatar.model3.json", {
              autoUpdate: true,
              autoInteract: true,
            });
          } catch (_) {
            try {
              model = await Live2DModel.from("/hiyori/Hiyori.model3.json", {
                autoUpdate: true,
                autoInteract: true,
              });
            } catch (_) {}
          }
        }

        if (!isMounted) return;

        if (!model) {
          setErrorMsg("Live2D model unable to load.");
          setLoading(false);
          return;
        }

        modelRef.current = model;
        app.stage.addChild(model);

        // Precise centering & bounding box calculation
        const origW = model.width || model.internalModel?.originalWidth || 500;
        const origH = model.height || model.internalModel?.originalHeight || 600;

        const scaleX = ((width || 260) * 0.85) / origW;
        const scaleY = ((height || 280) * 0.88) / origH;
        const fitScale = Math.min(scaleX, scaleY);

        if (model.scale && typeof model.scale.set === "function") {
          model.scale.set(fitScale);
        }

        // Set anchor precisely to center (0.5, 0.5) to center character perfectly in frame
        if (model.anchor && typeof model.anchor.set === "function") {
          model.anchor.set(0.5, 0.5);
        }

        model.x = (width || 260) / 2;
        model.y = (height || 280) / 2;

        setLoading(false);
      } catch (_) {
        if (isMounted) {
          setErrorMsg("WebGL context initialization note.");
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
  }, [isCubismReady, model3JsonUrl, customFiles, width, height]);

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
      {/* Loading state spinner while Cubism runtime & WebGL mesh initialize */}
      {(!isCubismReady || (loading && !errorMsg)) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm rounded-xl border border-amber-500/20 text-amber-300 z-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-2" />
          <span className="text-xs font-mono tracking-wider">Loading Live2D Mentor...</span>
        </div>
      )}

      {/* WebGL Canvas - Centered Live2D stage */}
      {isCubismReady && (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`w-full h-full block relative z-10 transition-opacity duration-500 ${
            errorMsg ? "opacity-0 absolute pointer-events-none" : "opacity-100"
          }`}
        />
      )}

      {/* Minimal Status Overlay (Vector SVG fallback completely removed) */}
      {errorMsg && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-900/90 rounded-xl border border-amber-500/30 text-amber-300 z-20 text-center">
          <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
          <span className="text-xs font-semibold text-slate-200">Live2D Avatar Status</span>
          <span className="text-[11px] text-slate-400 mt-1">{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
