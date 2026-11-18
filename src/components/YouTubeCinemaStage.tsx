import React, { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Eye,
  EyeOff,
  Radio,
} from "lucide-react";
import { Ada3DVTuber } from "./Ada3DVTuber";

import ep01ThumbImg from "../assets/images/ep01_thumbnail_cover_1794999159713.jpg";
import ep01ChairImg from "../assets/images/ep01_scene_chair_1794999158552.jpg";
import ep01ShipDockImg from "../assets/images/ep01_scene_ship_dock_1794999160889.jpg";
import ep01DeepSpaceImg from "../assets/images/ep01_scene_deep_space_1794999160476.jpg";

export interface CinemaStageProps {
  isOpen: boolean;
  onClose: () => void;
  episodeNumber: number;
  episodeTitle: string;
  chapterTitle: string;
  chapterIndex: number;
  currentText: string;
  speakingText: string;
  isPlaying: boolean;
  isPaused: boolean;
  currentIndex: number;
  totalParagraphs: number;
  currentClock: string;
  totalClock: string;
  progressPct: number;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
}

function getBackdropForScene(episodeNumber: number, chapterIndex: number): string {
  if (episodeNumber === 1) {
    if (chapterIndex === 0) return ep01ThumbImg;
    if (chapterIndex === 1 || chapterIndex === 2) return ep01ChairImg;
    if (chapterIndex === 3 || chapterIndex === 4) return ep01ShipDockImg;
    return ep01DeepSpaceImg;
  }
  // Episode 2 visual rotation across the ship & deep-space bridges
  if (chapterIndex === 0 || chapterIndex === 5) return ep01DeepSpaceImg;
  if (chapterIndex === 1 || chapterIndex === 4) return ep01ThumbImg;
  return ep01ShipDockImg;
}

export const YouTubeCinemaStage: React.FC<CinemaStageProps> = ({
  isOpen,
  onClose,
  episodeNumber,
  episodeTitle,
  chapterTitle,
  chapterIndex,
  currentText,
  speakingText,
  isPlaying,
  isPaused,
  currentIndex,
  totalParagraphs,
  currentClock,
  totalClock,
  progressPct,
  onPlayPause,
  onPrev,
  onNext,
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [showHost, setShowHost] = useState(true);
  const [ambienceOn, setAmbienceOn] = useState(false);
  const [ambienceLevel, setAmbienceLevel] = useState(0.22);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const bumpControls = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (isPlaying && !isPaused) {
        setControlsVisible(false);
      }
    }, 3200);
  };

  useEffect(() => {
    if (!isOpen) return;
    bumpControls();
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [isOpen, isPlaying, isPaused]);

  // Subtle WebAudio starship bridge low-frequency ambience (royalty-free procedural drone)
  useEffect(() => {
    if (!isOpen || !ambienceOn) {
      if (masterGainRef.current && audioCtxRef.current) {
        try {
          masterGainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.15);
        } catch {}
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        const ctx = new AudioCtx();
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0;

        // Warm dual-oscillator sub-harmonic hum + lowpass filter
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 145;

        const osc1 = ctx.createOscillator();
        osc1.type = "sine";
        osc1.frequency.value = 55;

        const osc2 = ctx.createOscillator();
        osc2.type = "triangle";
        osc2.frequency.value = 82.5;

        const osc2Gain = ctx.createGain();
        osc2Gain.gain.value = 0.25;

        osc1.connect(filter);
        osc2.connect(osc2Gain);
        osc2Gain.connect(filter);
        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        osc1.start();
        osc2.start();

        audioCtxRef.current = ctx;
        masterGainRef.current = masterGain;
      }

      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      if (masterGainRef.current) {
        masterGainRef.current.gain.setTargetAtTime(
          ambienceLevel * 0.16,
          audioCtxRef.current.currentTime,
          0.35
        );
      }
    } catch (err) {
      console.warn("Ambience audio unavailable:", err);
    }
  }, [isOpen, ambienceOn, ambienceLevel]);

  // Cleanup audio & fullscreen on unmount/close
  useEffect(() => {
    if (!isOpen && audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
      masterGainRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  if (!isOpen) return null;

  const activeBackdrop = getBackdropForScene(episodeNumber, chapterIndex);
  const cleanCaption = currentText
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement && stageRef.current) {
        stageRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    } catch {}
  };

  return (
    <div
      ref={stageRef}
      onMouseMove={bumpControls}
      onClick={bumpControls}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center p-0 sm:p-4 select-none"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* 16:9 Broadcast Frame */}
      <div className="relative w-full max-w-[1440px] aspect-video max-h-full bg-stone-950 overflow-hidden sm:rounded-2xl border border-stone-800/80 shadow-2xl">
        {/* Background Scene Artwork */}
        <img
          src={activeBackdrop}
          alt={chapterTitle}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-80 transition-opacity duration-700"
        />

        {/* Measured Contrast Scrims for WCAG AAA Text Over Artwork */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/60 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40 pointer-events-none" />

        {/* Top-Left Minimal Episode & Chapter Slate */}
        <div className="absolute top-5 left-6 sm:top-7 sm:left-8 z-10 space-y-1 max-w-[60%]">
          <div className="text-xs sm:text-sm font-medium text-amber-300/95 tracking-wide">
            {episodeTitle}
          </div>
          <div className="text-xs text-stone-300/90">{chapterTitle}</div>
        </div>

        {/* Top-Right Controls (Auto-Hide During Recording) */}
        <div
          className={`absolute top-5 right-6 z-20 flex items-center gap-2 transition-opacity duration-300 ${
            controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAmbienceOn(!ambienceOn);
            }}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer backdrop-blur-md transition-colors ${
              ambienceOn
                ? "bg-amber-600/85 border-amber-400/60 text-white"
                : "bg-stone-950/75 border-stone-700/80 text-stone-200 hover:bg-stone-900"
            }`}
            title="Toggle soft starship bridge background hum"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Bridge Hum: {ambienceOn ? "On" : "Off"}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowHost(!showHost);
            }}
            className="min-h-[40px] px-3 py-1.5 rounded-lg border border-stone-700/80 bg-stone-950/75 hover:bg-stone-900 text-stone-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
          >
            {showHost ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showHost ? "Hide Ada" : "Show Ada"}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="min-h-[40px] px-3 py-1.5 rounded-lg border border-stone-700/80 bg-stone-950/75 hover:bg-stone-900 text-stone-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="min-h-[40px] px-3 py-1.5 rounded-lg border border-stone-700/80 bg-stone-950/80 hover:bg-stone-800 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        {/* Narrator Host Corner Portrait (Ada Lip-Syncing Live) */}
        {showHost && (
          <div className="absolute right-6 sm:right-8 bottom-28 sm:bottom-32 w-[150px] sm:w-[210px] aspect-[3/4] rounded-2xl overflow-hidden border border-stone-700/70 bg-stone-950/90 shadow-2xl z-10">
            <Ada3DVTuber
              isSpeaking={isPlaying && !isPaused}
              speakingText={speakingText}
              mood={isPlaying ? "warm" : "cozy"}
              motion="idle"
              compact={true}
              className="w-full h-full"
            />
          </div>
        )}

        {/* Cinematic Subtitles / Active Spoken Paragraph */}
        <div
          className={`absolute bottom-14 sm:bottom-16 left-6 sm:left-10 z-10 transition-all duration-300 ${
            showHost ? "right-[185px] sm:right-[260px]" : "right-6 sm:right-10"
          }`}
        >
          <div className="rounded-2xl bg-stone-950/85 backdrop-blur-md border border-stone-800/80 px-5 py-4 sm:px-7 sm:py-5 shadow-2xl">
            <p
              className="text-base sm:text-xl md:text-[22px] leading-relaxed text-stone-50 line-clamp-4"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
            >
              {cleanCaption || "Press Play to start broadcast narration."}
            </p>
          </div>
        </div>

        {/* Thin Broadcast Progress Bar */}
        <div className="absolute bottom-0 inset-x-0 h-1.5 bg-stone-900/90 z-10">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Bottom Docked Playback Controls (Auto-Hides When Recording) */}
        <div
          className={`absolute bottom-3 left-6 right-6 z-20 flex items-center justify-between gap-4 transition-opacity duration-300 ${
            controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="min-h-[40px] px-3 rounded-lg bg-stone-950/85 border border-stone-700/80 text-stone-200 hover:bg-stone-800 text-xs flex items-center gap-1 cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayPause();
              }}
              className="min-h-[40px] px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              {isPlaying && !isPaused ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="min-h-[40px] px-3 rounded-lg bg-stone-950/85 border border-stone-700/80 text-stone-200 hover:bg-stone-800 text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {ambienceOn && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="hidden sm:flex items-center gap-2 bg-stone-950/85 border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-300"
            >
              {ambienceLevel === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
              <span>Hum</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={ambienceLevel}
                onChange={(e) => setAmbienceLevel(parseFloat(e.target.value))}
                className="w-20 accent-amber-500 cursor-pointer"
              />
            </div>
          )}

          <div className="text-xs text-stone-300 tabular-nums bg-stone-950/80 px-3 py-1.5 rounded-lg border border-stone-800/80">
            {currentClock} / {totalClock} · Line {currentIndex + 1}/{totalParagraphs}
          </div>
        </div>
      </div>
    </div>
  );
};
