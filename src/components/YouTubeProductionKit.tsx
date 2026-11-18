import React, { useState, useRef, useEffect } from "react";
import { X, Download, Copy, Check, Image as ImageIcon, FileText, Captions } from "lucide-react";
import ep01ThumbImg from "../assets/images/ep01_thumbnail_cover_1794999159713.jpg";
import ep01DeepSpaceImg from "../assets/images/ep01_scene_deep_space_1794999160476.jpg";

interface ChapterMeta {
  title: string;
  startWordOffset: number;
}

interface ParagraphMeta {
  spokenText: string;
  words: number;
  cumulativeWordsBefore: number;
}

export interface YouTubeProductionKitProps {
  isOpen: boolean;
  onClose: () => void;
  episodeNumber: number;
  episodeTitle: string;
  wordCount: number;
  speechRate: number;
  chapters: ChapterMeta[];
  paragraphs: ParagraphMeta[];
}

function formatSrtTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.floor((safe - Math.floor(safe)) * 1000);
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function formatYtTimestamp(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const YouTubeProductionKit: React.FC<YouTubeProductionKitProps> = ({
  isOpen,
  onClose,
  episodeNumber,
  episodeTitle,
  wordCount,
  speechRate,
  chapters,
  paragraphs,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [thumbStyle, setThumbStyle] = useState<"hook" | "title" | "clean">("hook");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const effectiveWpm = 148 * speechRate;

  const titleIdeas =
    episodeNumber === 1
      ? [
          "They Forced an Immortal Human onto a 'Broken' Colony Ship for 1,000 Years | HFY Sci-Fi",
          "The Aliens Accidentally Made a Human Immortal—So They Made Him a Prince and Exiled Him | HFY",
          "Prince of Nothing (Ep. 1) — Stuck for 1,000 Years With a Ship AI Who Refuses to Let Him Leave | HFY",
        ]
      : [
          "They Returned After 1,000 Years to Find the Alien Empire in Ruins | HFY Sci-Fi (Ep. 2)",
          "Pirates Tried to Rob an 'Unarmed' 1,000-Year-Old Colony Ship—And Met Its Cylon Crew | HFY",
          "Ghosts of an Empire (Ep. 2) — One Immortal Human, a Warship AI, and Fresh Unknown Space | HFY",
        ];

  const chapterLines = chapters
    .map((c) => {
      const sec = (c.startWordOffset / effectiveWpm) * 60;
      return `${formatYtTimestamp(sec)} ${c.title}`;
    })
    .join("\n");

  const ytDescription =
    episodeNumber === 1
      ? `Earth traded 100,000 volunteers for the promise of alien technology. Jase Hill—an ordinary guy in his early forties with nothing left to lose—survived The Chair and came out an immortal human variant. Because Immortals are a legally protected race, the alien mercenary empire couldn't execute him or shove him into the trenches. So they crowned him a "Prince in name only," dumped him aboard a forgotten colony barge (X4791Z) with a supposedly "broken" ship AI named Ada, and ordered them on a 1,000-year survey mission beyond the edge of the map.\n\nEpisode 1 of our serialized HFY Sci-Fi Audio Show!\n\nChapters:\n${chapterLines}\n\n#HFY #SciFiStory #HumanityFuckYeah #AudioDrama #SpaceOpera`
      : `One thousand years after being exiled past the edge of mapped space, Jase Hill and the modified colony ship Andromeda return—with Ada now walking the decks in her own body and ~240 parented Cylon-style crewmates aboard. Expecting an angry alien fleet waiting at the border, they instead find shattered beacons and the ruins of an empire that collapsed centuries ago... right before frontier raiders mistake Andromeda for an unarmed antique barge.\n\nEpisode 2 of our serialized HFY Sci-Fi Audio Show!\n\nChapters:\n${chapterLines}\n\n#HFY #SciFiStory #HumanityFuckYeah #AudioDrama #SpaceOpera`;

  const ytTags =
    "HFY, HFY stories, Humanity Fuck Yeah, Sci-Fi Audio Story, Space Opera, Colony Ship AI, Immortal Human HFY, Andromeda inspired sci fi, HFY 30 minute story, Sci Fi Narration";

  // Draw live 1280x720 YouTube Thumbnail onto Canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = episodeNumber === 1 ? ep01ThumbImg : ep01DeepSpaceImg;

    img.onload = () => {
      ctx.clearRect(0, 0, 1280, 720);
      ctx.drawImage(img, 0, 0, 1280, 720);

      if (thumbStyle === "clean") return;

      // Subtle left dark vignette for crisp text readability
      const grad = ctx.createLinearGradient(0, 0, 920, 0);
      grad.addColorStop(0, "rgba(8, 8, 12, 0.86)");
      grad.addColorStop(0.65, "rgba(8, 8, 12, 0.45)");
      grad.addColorStop(1, "rgba(8, 8, 12, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // Kicker
      ctx.fillStyle = "#f59e0b";
      ctx.font = "700 28px 'Plus Jakarta Sans', Arial, sans-serif";
      ctx.fillText(
        episodeNumber === 1 ? "HFY SERIES · EPISODE 1" : "HFY SERIES · EPISODE 2",
        64,
        130
      );

      // Main Headline
      const headlineLines =
        thumbStyle === "hook"
          ? episodeNumber === 1
            ? ["EXILED FOR", "1,000 YEARS", "ON A 'BROKEN'", "SHIP"]
            : ["1,000 YEARS", "LATER...", "THE EMPIRE", "IS GONE"]
          : episodeNumber === 1
          ? ["PRINCE OF", "NOTHING", "JASE & ADA"]
          : ["GHOSTS OF", "AN EMPIRE", "UNKNOWN SPACE"];

      ctx.font = "800 84px 'Plus Jakarta Sans', Arial, sans-serif";
      let y = 240;
      headlineLines.forEach((line, idx) => {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillText(line, 68, y + 4);
        ctx.fillStyle = idx === headlineLines.length - 1 ? "#fbbf24" : "#ffffff";
        ctx.fillText(line, 64, y);
        y += 96;
      });
    };
  }, [isOpen, thumbStyle, episodeNumber]);

  if (!isOpen) return null;

  const copyText = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleDownloadThumbnail = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `hfy-ep0${episodeNumber}-thumbnail-1280x720.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handleDownloadCleanScript = () => {
    const scriptText = paragraphs.map((p) => p.spokenText).join("\n\n");
    const blob = new Blob([`${episodeTitle}\n\n${scriptText}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hfy-ep0${episodeNumber}-narration-script.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSrt = () => {
    const blocks = paragraphs.map((p, idx) => {
      const startSec = (p.cumulativeWordsBefore / effectiveWpm) * 60;
      const endSec = ((p.cumulativeWordsBefore + p.words) / effectiveWpm) * 60;
      return `${idx + 1}\n${formatSrtTime(startSec)} --> ${formatSrtTime(endSec)}\n${p.spokenText}\n`;
    });
    const blob = new Blob([blocks.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hfy-ep0${episodeNumber}-subtitles.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-4xl rounded-2xl border border-stone-800 bg-stone-900 text-stone-100 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">YouTube Production Pack</h2>
            <p className="text-xs text-stone-400">
              {episodeTitle} · {wordCount.toLocaleString()} words · Ready for YouTube Studio
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-7 overflow-y-auto">
          {/* 1. Thumbnail Generator */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>1280×720 YouTube Thumbnail Generator</span>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-stone-950 border border-stone-800">
                {[
                  { id: "hook", label: "Hook Text" },
                  { id: "title", label: "Episode Title" },
                  { id: "clean", label: "Clean Art Only" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setThumbStyle(opt.id as any)}
                    className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                      thumbStyle === opt.id
                        ? "bg-amber-600 text-white"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-stone-800 bg-stone-950">
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                className="w-full h-auto block aspect-video"
              />
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleDownloadThumbnail}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download 1280×720 Thumbnail (.png)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCleanScript}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-stone-700 bg-stone-950 hover:bg-stone-800 text-stone-200 text-xs font-medium flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Download Voiceover Script (.txt)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSrt}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-stone-700 bg-stone-950 hover:bg-stone-800 text-stone-200 text-xs font-medium flex items-center gap-2 cursor-pointer"
              >
                <Captions className="w-4 h-4 text-amber-400" />
                <span>Download Subtitles (.srt)</span>
              </button>
            </div>
          </div>

          {/* 2. Clickable HFY Titles */}
          <div className="space-y-2.5 pt-4 border-t border-stone-800">
            <h3 className="text-sm font-semibold text-white">Title Options</h3>
            <div className="space-y-2">
              {titleIdeas.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200"
                >
                  <span className="leading-relaxed">{t}</span>
                  <button
                    type="button"
                    onClick={() => copyText(`title-${i}`, t)}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {copiedKey === `title-${i}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Description & Chapters */}
          <div className="space-y-2.5 pt-4 border-t border-stone-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Description & Chapters</h3>
              <button
                type="button"
                onClick={() => copyText("desc", ytDescription)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-stone-200 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === "desc" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Description</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 whitespace-pre-wrap font-sans leading-relaxed">
              {ytDescription}
            </pre>
          </div>

          {/* 4. Tags */}
          <div className="space-y-2 pt-4 border-t border-stone-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">YouTube Tags</h3>
              <button
                type="button"
                onClick={() => copyText("tags", ytTags)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-stone-200 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === "tags" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Tags</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-400">
              {ytTags}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
