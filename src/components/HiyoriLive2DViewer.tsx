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

  useEffect(() => {
    let isMounted = true;

    const initLive2D = async () => {
      setLoading(true);
      setErrorMsg(null);

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
        setErrorMsg("Live2D Cubism runtime script missing or failed to initialize.");
        setLoading(false);
        return;
      }

      if (!canvasRef.current) return;

      try {
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

        // Create PIXI Application on canvas element
        const app = new window.PIXI.Application({
          view: canvasRef.current,
          width: width,
          height: height,
          backgroundAlpha: 0,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          antialias: true,
        });

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
              console.error("Fallback Live2D model failed:", fallbackErr);
            }
          }
        }

        if (!isMounted) return;

        if (!model) {
          setErrorMsg("Failed to compile Live2D model mesh & textures.");
          setLoading(false);
          return;
        }

        modelRef.current = model;
        app.stage.addChild(model);

        // Scale and position model nicely within container
        const origW = model.width || model.internalModel?.originalWidth || 500;
        const origH = model.height || model.internalModel?.originalHeight || 600;

        const scaleX = (width * 0.85) / origW;
        const scaleY = (height * 0.92) / origH;
        const fitScale = Math.min(scaleX, scaleY);

        if (model.scale && typeof model.scale.set === "function") {
          model.scale.set(fitScale);
        }

        if (model.anchor && typeof model.anchor.set === "function") {
          model.anchor.set(0.5, 0.45);
        }

        model.x = width / 2;
        model.y = height / 2;

        setLoading(false);
      } catch (err: any) {
        console.error("Live2D WebGL initialization error:", err);
        if (isMounted) {
          setErrorMsg(err?.message || "WebGL context error during Live2D setup.");
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
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm rounded-xl border border-amber-500/20 text-amber-300 z-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-2" />
          <span className="text-xs font-mono tracking-wider">Compiling WebGL Live2D Mesh...</span>
        </div>
      )}

      {/* Error State if WebGL or scripts fail */}
      {errorMsg && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-900/80 rounded-xl border border-rose-500/30 text-rose-300 z-20 text-center">
          <AlertCircle className="w-7 h-7 text-rose-400 mb-2" />
          <span className="text-xs font-semibold text-rose-200">Live2D WebGL Error</span>
          <span className="text-[11px] text-slate-400 mt-1 line-clamp-2">{errorMsg}</span>
        </div>
      )}

      {/* Pure WebGL Live2D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block relative z-10"
      />
    </div>
  );
};


