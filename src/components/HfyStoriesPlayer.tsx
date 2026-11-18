import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  BookOpen,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronRight,
  Headphones,
} from "lucide-react";
import { Ada3DVTuber } from "./Ada3DVTuber";
import ep01FallbackRaw from "../../hfy_series/episodes/ep01_script.md?raw";
import ep02FallbackRaw from "../../hfy_series/episodes/ep02_script.md?raw";

interface RawEpisode {
  id: string;
  episodeNumber: number;
  filename: string;
  title: string;
  subtitle: string;
  wordCount: number;
  estimatedMinutes: number;
  content: string;
}

interface StoryParagraph {
  index: number;
  chapterIndex: number;
  displayText: string;
  spokenText: string;
  words: number;
  cumulativeWordsBefore: number;
}

interface StoryChapter {
  index: number;
  title: string;
  startParagraphIndex: number;
  words: number;
}

const EPISODE_CHAPTER_TITLES: Record<number, string[]> = {
  1: [
    "Part 1 · The Deal on Earth",
    "Part 2 · The Chair",
    "Part 3 · Conversion Bay Nine",
    "Part 4 · Prince in Name Only",
    "Part 5 · Hull X4791Z & Ada",
    "Part 6 · Month Four: The Airlock Standoff",
  ],
  2: [
    "Part 1 · A Thousand Years Later",
    "Part 2 · Ada's Body, Cylons & Ghosts",
    "Part 3 · Distress in the Debris Belt",
    "Part 4 · Boarding Hold Four",
    "Part 5 · The Great Fracture",
    "Part 6 · Fresh Unknown Space",
  ],
};

function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/—/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEpisodeContent(raw: string, episodeNumber: number) {
  const lines = raw.split(/\r?\n/);
  const chapters: StoryChapter[] = [];
  const paragraphs: StoryParagraph[] = [];

  let currentChapterIndex = 0;
  let seenFirstRule = false;
  let totalWords = 0;

  const ensureChapter = (idx: number, startParaIdx: number) => {
    if (!chapters[idx]) {
      const titles = EPISODE_CHAPTER_TITLES[episodeNumber];
      const fallbackTitle = titles && titles[idx] ? titles[idx] : `Part ${idx + 1}`;
      chapters[idx] = {
        index: idx,
        title: fallbackTitle,
        startParagraphIndex: startParaIdx,
        words: 0,
      };
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Skip top title / subtitle header lines
    if (trimmed.startsWith("# ")) continue;
    if (trimmed.startsWith("*(") && trimmed.endsWith(")*")) continue;
    if (/^\*To be continued/i.test(trimmed)) continue;

    if (trimmed === "---") {
      if (!seenFirstRule) {
        seenFirstRule = true;
      } else {
        currentChapterIndex += 1;
      }
      continue;
    }

    ensureChapter(currentChapterIndex, paragraphs.length);

    const words = trimmed.split(/\s+/).filter(Boolean).length;
    const spoken = stripMarkdownForSpeech(trimmed);
    if (!spoken) continue;

    paragraphs.push({
      index: paragraphs.length,
      chapterIndex: currentChapterIndex,
      displayText: trimmed,
      spokenText: spoken,
      words,
      cumulativeWordsBefore: totalWords,
    });

    chapters[currentChapterIndex].words += words;
    totalWords += words;
  }

  return {
    chapters: chapters.filter(Boolean),
    paragraphs,
    totalWords,
  };
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return tokens.map((token, i) => {
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return (
        <strong key={i} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      return (
        <em key={i} className="italic text-amber-200/95">
          {token.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={i}>{token}</React.Fragment>;
  });
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function countMarkdownWords(raw: string): number {
  return raw
    .replace(/[#*_`>-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function buildFallbackEpisodes(): RawEpisode[] {
  const ep1Words = countMarkdownWords(ep01FallbackRaw);
  const ep2Words = countMarkdownWords(ep02FallbackRaw);
  return [
    {
      id: "ep01",
      episodeNumber: 1,
      filename: "ep01_script.md",
      title: "Episode 1: Prince of Nothing",
      subtitle: "Two-Part Series Premiere — Part 1 · Spoken Edition",
      wordCount: ep1Words,
      estimatedMinutes: Math.max(1, Math.round(ep1Words / 148)),
      content: ep01FallbackRaw,
    },
    {
      id: "ep02",
      episodeNumber: 2,
      filename: "ep02_script.md",
      title: "Episode 2: Ghosts of an Empire",
      subtitle: "Two-Part Series Premiere — Part 2 · Spoken Edition",
      wordCount: ep2Words,
      estimatedMinutes: Math.max(1, Math.round(ep2Words / 148)),
      content: ep02FallbackRaw,
    },
  ];
}

export default function HfyStoriesPlayer() {
  const [episodes, setEpisodes] = useState<RawEpisode[]>(() => buildFallbackEpisodes());
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>("ep01");
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState<boolean>(false);

  // Audio / speech synthesis state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("hfy_ep01_paragraph_idx");
      const parsed = saved ? parseInt(saved, 10) : 0;
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    } catch {
      return 0;
    }
  });
  const [speakingText, setSpeakingText] = useState<string>("");
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [showNarratorAvatar, setShowNarratorAvatar] = useState<boolean>(true);

  // Voice & rate settings (synced with Ada Voice Studio defaults)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => {
    try {
      return localStorage.getItem("ada_selected_voice_uri") || "";
    } catch {
      return "";
    }
  });
  const [speechRate, setSpeechRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("ada_voice_rate");
      const n = saved ? parseFloat(saved) : 1.02;
      return Number.isFinite(n) && n >= 0.7 && n <= 1.6 ? n : 1.02;
    } catch {
      return 1.02;
    }
  });
  const [speechPitch, setSpeechPitch] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("ada_voice_pitch");
      const n = saved ? parseFloat(saved) : 1.08;
      return Number.isFinite(n) && n >= 0.7 && n <= 1.5 ? n : 1.08;
    } catch {
      return 1.08;
    }
  });

  const paragraphRefs = useRef<(HTMLDivElement | null)[]>([]);
  const playSessionIdRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);

  // Fetch latest episode scripts dynamically from server
  useEffect(() => {
    let cancelled = false;
    setIsLoadingEpisodes(true);
    fetch("/api/hfy/episodes")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.success && Array.isArray(data.episodes) && data.episodes.length > 0) {
          setEpisodes(data.episodes);
          setSelectedEpisodeId((prev) =>
            data.episodes.some((e: RawEpisode) => e.id === prev) ? prev : data.episodes[0].id
          );
        }
      })
      .catch(() => {
        // Fallback episode 1 already loaded via ?raw import
      })
      .finally(() => {
        if (!cancelled) setIsLoadingEpisodes(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load browser speech voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        setAvailableVoices(voices);
        setSelectedVoiceURI((prev) => {
          if (prev && voices.some((v) => v.voiceURI === prev)) return prev;
          const preferred =
            voices.find(
              (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Natural") ||
                  v.name.includes("Aria") ||
                  v.name.includes("Jenny") ||
                  v.name.includes("Samantha") ||
                  v.name.includes("Google US English") ||
                  v.name.includes("Zira"))
            ) ||
            voices.find((v) => v.lang.startsWith("en")) ||
            voices[0];
          return preferred ? preferred.voiceURI : "";
        });
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const activeEpisode = useMemo(
    () => episodes.find((e) => e.id === selectedEpisodeId) || episodes[0],
    [episodes, selectedEpisodeId]
  );

  const parsedStory = useMemo(
    () => parseEpisodeContent(activeEpisode.content, activeEpisode.episodeNumber),
    [activeEpisode]
  );

  // Clamp saved paragraph index inside episode bounds
  useEffect(() => {
    if (currentParagraphIndex >= parsedStory.paragraphs.length) {
      setCurrentParagraphIndex(0);
    }
  }, [parsedStory.paragraphs.length, currentParagraphIndex]);

  // Persist bookmark progress
  useEffect(() => {
    try {
      localStorage.setItem(`hfy_${activeEpisode.id}_paragraph_idx`, String(currentParagraphIndex));
    } catch (_) {}
  }, [activeEpisode.id, currentParagraphIndex]);

  // Persist voice adjustments
  useEffect(() => {
    try {
      if (selectedVoiceURI) localStorage.setItem("ada_selected_voice_uri", selectedVoiceURI);
      localStorage.setItem("ada_voice_rate", String(speechRate));
      localStorage.setItem("ada_voice_pitch", String(speechPitch));
    } catch (_) {}
  }, [selectedVoiceURI, speechRate, speechPitch]);

  // Keep Chromium Web Speech from silently suspending during long 30-40 min playback
  useEffect(() => {
    if (!isPlaying || isPaused) return;
    const watchdog = setInterval(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    }, 9000);
    return () => clearInterval(watchdog);
  }, [isPlaying, isPaused]);

  // Stop speech cleanly on unmount
  useEffect(() => {
    return () => {
      playSessionIdRef.current += 1;
      isPlayingRef.current = false;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Auto-scroll active paragraph cleanly into view
  useEffect(() => {
    if (!autoScroll || !isPlaying) return;
    const targetEl = paragraphRefs.current[currentParagraphIndex];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentParagraphIndex, autoScroll, isPlaying]);

  const speakParagraphAt = useCallback(
    (index: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const para = parsedStory.paragraphs[index];
      if (!para) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setIsPaused(false);
        setSpeakingText("");
        return;
      }

      playSessionIdRef.current += 1;
      const mySessionId = playSessionIdRef.current;

      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      isPlayingRef.current = true;
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentParagraphIndex(index);
      setSpeakingText(para.spokenText);

      const utterance = new SpeechSynthesisUtterance(para.spokenText);
      const voice =
        availableVoices.find((v) => v.voiceURI === selectedVoiceURI) ||
        availableVoices.find((v) => v.lang.startsWith("en")) ||
        availableVoices[0];

      if (voice) utterance.voice = voice;
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;

      utterance.onend = () => {
        if (playSessionIdRef.current !== mySessionId || !isPlayingRef.current) return;
        const nextIdx = index + 1;
        if (nextIdx < parsedStory.paragraphs.length) {
          speakParagraphAt(nextIdx);
        } else {
          isPlayingRef.current = false;
          setIsPlaying(false);
          setIsPaused(false);
          setSpeakingText("");
        }
      };

      utterance.onerror = (ev) => {
        // Ignore intentional cancellations when user jumps/pauses
        if (ev.error === "canceled" || ev.error === "interrupted") return;
        if (playSessionIdRef.current !== mySessionId || !isPlayingRef.current) return;
        isPlayingRef.current = false;
        setIsPlaying(false);
        setIsPaused(false);
        setSpeakingText("");
      };

      window.speechSynthesis.speak(utterance);
    },
    [parsedStory.paragraphs, availableVoices, selectedVoiceURI, speechRate, speechPitch]
  );

  const handlePlayPause = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isPlaying && !isPaused) {
      playSessionIdRef.current += 1;
      isPlayingRef.current = false;
      window.speechSynthesis.cancel();
      setIsPaused(true);
      setIsPlaying(false);
      setSpeakingText("");
      return;
    }

    speakParagraphAt(currentParagraphIndex);
  };

  const handleStop = () => {
    playSessionIdRef.current += 1;
    isPlayingRef.current = false;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setSpeakingText("");
    setCurrentParagraphIndex(0);
  };

  const handleStep = (delta: number) => {
    const next = Math.max(0, Math.min(parsedStory.paragraphs.length - 1, currentParagraphIndex + delta));
    setCurrentParagraphIndex(next);
    if (isPlaying) {
      speakParagraphAt(next);
    }
  };

  const handleJumpToChapter = (startParaIndex: number) => {
    setCurrentParagraphIndex(startParaIndex);
    speakParagraphAt(startParaIndex);
    const el = paragraphRefs.current[startParaIndex];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleRateChange = (newRate: number) => {
    setSpeechRate(newRate);
    if (isPlaying) {
      setTimeout(() => {
        speakParagraphAt(currentParagraphIndex);
      }, 40);
    }
  };

  const handleVoiceChange = (newURI: string) => {
    setSelectedVoiceURI(newURI);
    if (isPlaying) {
      setTimeout(() => {
        speakParagraphAt(currentParagraphIndex);
      }, 40);
    }
  };

  // Compute progress time estimates (~148 base WPM scaled by speechRate)
  const effectiveWpm = 148 * speechRate;
  const activeParagraph = parsedStory.paragraphs[currentParagraphIndex];
  const wordsSpokenSoFar = activeParagraph ? activeParagraph.cumulativeWordsBefore : 0;
  const totalSecondsEstimate = (parsedStory.totalWords / effectiveWpm) * 60;
  const currentSecondsEstimate = (wordsSpokenSoFar / effectiveWpm) * 60;
  const progressPct =
    parsedStory.totalWords > 0
      ? Math.min(100, (wordsSpokenSoFar / parsedStory.totalWords) * 100)
      : 0;

  const handleProgressScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetWord = clickX * parsedStory.totalWords;
    const found =
      parsedStory.paragraphs.find(
        (p) => p.cumulativeWordsBefore + p.words >= targetWord
      ) || parsedStory.paragraphs[0];
    if (found) {
      setCurrentParagraphIndex(found.index);
      if (isPlaying) {
        speakParagraphAt(found.index);
      }
      const el = paragraphRefs.current[found.index];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const activeChapterIdx = activeParagraph ? activeParagraph.chapterIndex : 0;
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 text-stone-100"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Rail: Narrator Window, Episode Selector, and Chapters */}
        <aside className="w-full lg:w-[320px] shrink-0 space-y-5 lg:sticky lg:top-20">
          {/* Optional Live Narrator Visual Companion */}
          <div className="rounded-2xl border border-stone-800 bg-stone-900/70 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-stone-300">
                <Headphones className="w-4 h-4 text-amber-400" />
                <span>Narrator Companion</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNarratorAvatar(!showNarratorAvatar)}
                className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {showNarratorAvatar ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show</span>
                  </>
                )}
              </button>
            </div>

            {showNarratorAvatar && (
              <div className="h-[250px] bg-stone-950 relative">
                <Ada3DVTuber
                  isSpeaking={isPlaying && !isPaused}
                  speakingText={speakingText}
                  mood={isPlaying ? "warm" : "cozy"}
                  motion={isPlaying ? "idle" : "idle"}
                  compact={true}
                  className="w-full h-full"
                />
              </div>
            )}
          </div>

          {/* Episodes List */}
          <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Episodes</h2>
              {isLoadingEpisodes && (
                <span className="text-xs text-stone-400">Syncing...</span>
              )}
            </div>

            <div className="space-y-2">
              {episodes.map((ep) => {
                const isSelected = ep.id === activeEpisode.id;
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => {
                      if (ep.id !== activeEpisode.id) {
                        playSessionIdRef.current += 1;
                        isPlayingRef.current = false;
                        if (typeof window !== "undefined" && "speechSynthesis" in window) {
                          window.speechSynthesis.cancel();
                        }
                        setIsPlaying(false);
                        setIsPaused(false);
                        setSpeakingText("");
                        let savedIdx = 0;
                        try {
                          const rawSaved = localStorage.getItem(`hfy_${ep.id}_paragraph_idx`);
                          const parsed = rawSaved ? parseInt(rawSaved, 10) : 0;
                          if (Number.isFinite(parsed) && parsed >= 0) savedIdx = parsed;
                        } catch {}
                        setSelectedEpisodeId(ep.id);
                        setCurrentParagraphIndex(savedIdx);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-amber-950/35 border-amber-600/60 text-white"
                        : "bg-stone-950/60 border-stone-800/80 text-stone-300 hover:border-stone-700"
                    }`}
                  >
                    <div className="text-sm font-semibold leading-snug">{ep.title}</div>
                    <div className="mt-1 text-xs text-stone-400 tabular-nums">
                      {ep.wordCount.toLocaleString()} words · ~{ep.estimatedMinutes} min audio
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scene / Chapter Jump List */}
          <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 space-y-2.5">
            <h2 className="text-sm font-semibold text-white">Chapters</h2>
            <div className="space-y-1">
              {parsedStory.chapters.map((chap) => {
                const isActive = chap.index === activeChapterIdx;
                const chapMins = Math.max(1, Math.round(chap.words / effectiveWpm));
                return (
                  <button
                    key={chap.index}
                    type="button"
                    onClick={() => handleJumpToChapter(chap.startParagraphIndex)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                      isActive
                        ? "bg-amber-600/20 text-amber-200 border border-amber-600/40"
                        : "text-stone-300 hover:bg-stone-800/70 border border-transparent"
                    }`}
                  >
                    <span className="truncate font-medium">{chap.title}</span>
                    <span className="text-stone-400 tabular-nums shrink-0 flex items-center gap-1">
                      ~{chapMins}m
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Main Column: Audio Console + Manuscript */}
        <section className="flex-1 min-w-0 space-y-5">
          {/* Episode Header & Docked Player */}
          <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-5 sm:p-6 space-y-5">
            <div className="space-y-1.5">
              <div className="text-xs text-stone-400 flex flex-wrap items-center gap-2">
                <span>HFY Audio Series</span>
                <span aria-hidden="true">·</span>
                <span>{activeEpisode.subtitle}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {parsedStory.totalWords.toLocaleString()} words
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
                {activeEpisode.title}
              </h1>
            </div>

            {!speechSupported && (
              <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
                Browser speech synthesis is unavailable on this device, so audio playback is disabled—full script remains readable below.
              </div>
            )}

            {/* Playback Buttons + Progress */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={!speechSupported}
                  onClick={handlePlayPause}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isPlaying && !isPaused ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Pause Narration</span>
                    </>
                  ) : currentParagraphIndex > 0 ? (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Resume Listening</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Listen to Episode {activeEpisode.episodeNumber}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={!speechSupported || currentParagraphIndex === 0}
                  onClick={() => handleStep(-1)}
                  title="Previous Paragraph"
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-800 bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <SkipBack className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={
                    !speechSupported ||
                    currentParagraphIndex >= parsedStory.paragraphs.length - 1
                  }
                  onClick={() => handleStep(1)}
                  title="Next Paragraph"
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-800 bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Next</span>
                  <SkipForward className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={!isPlaying && currentParagraphIndex === 0}
                  onClick={handleStop}
                  title="Reset to Beginning"
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-800 bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isPlaying ? <Square className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>Restart</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ml-auto ${
                    autoScroll
                      ? "bg-stone-800 border-stone-700 text-amber-300"
                      : "bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Auto-Scroll: {autoScroll ? "On" : "Off"}
                </button>
              </div>

              {/* Scrubber Bar */}
              <div className="space-y-1.5 pt-1">
                <div
                  role="slider"
                  aria-label="Episode playback progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressPct)}
                  tabIndex={0}
                  onClick={handleProgressScrub}
                  className="w-full h-2.5 rounded-full bg-stone-950 border border-stone-800 overflow-hidden cursor-pointer relative"
                  title="Click anywhere along the bar to jump to that point in the story"
                >
                  <div
                    className="h-full bg-amber-500 transition-all duration-200"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-stone-400 tabular-nums">
                  <span>
                    {formatClock(currentSecondsEstimate)} / {formatClock(totalSecondsEstimate)}
                  </span>
                  <span>
                    Line {currentParagraphIndex + 1} of {parsedStory.paragraphs.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Narrator Voice, Speed & Pitch Strip */}
            <div className="pt-3 border-t border-stone-800/80 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Volume2 className="w-4 h-4 text-stone-400 shrink-0" />
                <select
                  aria-label="Select Narrator Voice"
                  value={selectedVoiceURI}
                  onChange={(e) => handleVoiceChange(e.target.value)}
                  className="w-full sm:max-w-xs bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none cursor-pointer truncate"
                >
                  {availableVoices.length === 0 && (
                    <option value="">Default System Voice</option>
                  )}
                  {availableVoices
                    .filter((v) => v.lang.startsWith("en"))
                    .map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  {availableVoices
                    .filter((v) => !v.lang.startsWith("en"))
                    .map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-stone-950 border border-stone-800 shrink-0">
                {[0.9, 1.0, 1.12, 1.25].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRateChange(r)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium tabular-nums transition-colors cursor-pointer whitespace-nowrap ${
                      Math.abs(speechRate - r) < 0.04
                        ? "bg-amber-600 text-white"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    {r.toFixed(r === 1 ? 1 : 2).replace(/\.00$/, ".0")}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Full Follow-Along Story Manuscript */}
          <article
            className="rounded-2xl border border-stone-800 bg-stone-900/50 px-5 sm:px-10 py-8 sm:py-10"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          >
            <div className="max-w-[68ch] mx-auto space-y-5">
              <div
                className="flex items-center gap-2 text-xs text-stone-400 pb-4 border-b border-stone-800/80"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Click any paragraph below to jump straight to that moment in the narration.</span>
              </div>

              {parsedStory.paragraphs.map((para, idx) => {
                const isActive = idx === currentParagraphIndex && (isPlaying || isPaused);
                const prevPara = idx > 0 ? parsedStory.paragraphs[idx - 1] : null;
                const isNewChapter = !prevPara || prevPara.chapterIndex !== para.chapterIndex;
                const chapterInfo = parsedStory.chapters[para.chapterIndex];

                return (
                  <React.Fragment key={para.index}>
                    {isNewChapter && chapterInfo && (
                      <div
                        className={`${idx === 0 ? "pt-1" : "pt-8 border-t border-stone-800/70"} pb-1`}
                        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
                      >
                        <h3 className="text-xs font-semibold tracking-wide text-amber-400">
                          {chapterInfo.title}
                        </h3>
                      </div>
                    )}

                    <div
                      ref={(el) => {
                        paragraphRefs.current[idx] = el;
                      }}
                      onClick={() => speakParagraphAt(idx)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          speakParagraphAt(idx);
                        }
                      }}
                      className={`px-3.5 py-2.5 -mx-3.5 rounded-xl text-[17px] sm:text-[18px] leading-[1.75] transition-colors cursor-pointer ${
                        isActive
                          ? "bg-amber-950/35 border border-amber-600/45 text-stone-50"
                          : "border border-transparent text-stone-200 hover:bg-stone-800/45"
                      }`}
                    >
                      {renderInlineFormatting(para.displayText)}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
