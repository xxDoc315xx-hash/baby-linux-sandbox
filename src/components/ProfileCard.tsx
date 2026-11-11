import React from "react";
import { Profile } from "../types";
import SvgAvatar from "./SvgAvatar";
import { Sparkles, Twitter, Github, Globe, Award } from "lucide-react";

interface ProfileCardProps {
  key?: string;
  profile: Profile;
  onSpark: (id: string) => void;
  isCurrentUser?: boolean;
}

export default function ProfileCard({ profile, onSpark, isCurrentUser = false }: ProfileCardProps) {
  const { id, name, nickname, role, bio, tagline, skills, badge, theme, socials, sparks, avatarStyle } = profile;

  // Theme color maps for borders, accents, and glows
  const themeClasses = {
    slate: {
      border: "border-zinc-800 hover:border-red-600/80",
      accent: "text-red-500",
      bgLight: "bg-neutral-950",
      badgeBg: "bg-black text-white border-zinc-800",
      sparkGlow: "shadow-[0_0_15px_rgba(220,38,38,0.1)]",
      accentBg: "bg-red-600",
      textAccent: "text-red-400",
      gradient: "from-black via-zinc-950 to-black",
    },
    violet: {
      border: "border-red-950/60 hover:border-red-600",
      accent: "text-red-400",
      bgLight: "bg-red-950/10",
      badgeBg: "bg-black text-red-200 border-red-950/60",
      sparkGlow: "shadow-[0_0_15px_rgba(220,38,38,0.15)]",
      accentBg: "bg-red-700",
      textAccent: "text-red-300",
      gradient: "from-neutral-950 via-black to-red-950/20",
    },
    amber: {
      border: "border-rose-950/60 hover:border-rose-600",
      accent: "text-rose-400",
      bgLight: "bg-rose-950/15",
      badgeBg: "bg-black text-rose-200 border-rose-950/60",
      sparkGlow: "shadow-[0_0_15px_rgba(244,63,94,0.15)]",
      accentBg: "bg-rose-700",
      textAccent: "text-rose-300",
      gradient: "from-black via-neutral-950 to-rose-950/15",
    },
    emerald: {
      border: "border-red-900/40 hover:border-red-500",
      accent: "text-red-500",
      bgLight: "bg-red-950/20",
      badgeBg: "bg-black text-white border-red-900/50",
      sparkGlow: "shadow-[0_0_15px_rgba(239,68,68,0.2)]",
      accentBg: "bg-red-600",
      textAccent: "text-red-200",
      gradient: "from-black via-zinc-950 to-red-950/30",
    },
    rose: {
      border: "border-red-800/50 hover:border-red-500",
      accent: "text-red-400",
      bgLight: "bg-red-950/30",
      badgeBg: "bg-red-950/80 text-white border-red-800/45",
      sparkGlow: "shadow-[0_0_15px_rgba(220,38,38,0.25)]",
      accentBg: "bg-red-600",
      textAccent: "text-red-200",
      gradient: "from-black via-red-950/40 to-black",
    },
    sky: {
      border: "border-neutral-800 hover:border-red-500",
      accent: "text-red-400",
      bgLight: "bg-neutral-950",
      badgeBg: "bg-black text-white border-neutral-800",
      sparkGlow: "shadow-[0_0_15px_rgba(220,38,38,0.15)]",
      accentBg: "bg-red-500",
      textAccent: "text-red-300",
      gradient: "from-black via-neutral-950 to-neutral-900",
    },
  }[theme] || {
    border: "border-neutral-800 hover:border-red-500",
    accent: "text-red-400",
    bgLight: "bg-neutral-950",
    badgeBg: "bg-black text-white border-neutral-800",
    sparkGlow: "",
    accentBg: "bg-red-600",
    textAccent: "text-red-300",
    gradient: "from-black via-neutral-950 to-black",
  };

  return (
    <div
      id={`card-${id}`}
      className={`relative flex flex-col justify-between h-full bg-gradient-to-br ${themeClasses.gradient} border ${themeClasses.border} rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${themeClasses.sparkGlow}`}
    >
      {/* Current User Label */}
      {isCurrentUser && (
        <span className="absolute -top-3 left-6 px-3 py-0.5 bg-gradient-to-r from-red-600 to-rose-700 text-white text-xs font-black tracking-widest uppercase rounded-full shadow-lg border border-red-400/40">
          YOU
        </span>
      )}

      {/* Top Section */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <SvgAvatar style={avatarStyle} name={name} size={64} />
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950 ${themeClasses.accentBg}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 tracking-tight leading-snug">{name}</h3>
              <p className="text-sm font-semibold text-slate-400">@{nickname || id}</p>
            </div>
          </div>

          {/* Badge */}
          {badge && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold tracking-wide border rounded-lg ${themeClasses.badgeBg}`}>
              <Award className="w-3.5 h-3.5" />
              <span>{badge}</span>
            </div>
          )}
        </div>

        {/* Role & Tagline */}
        <div className="mb-4">
          <div className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-1">{role}</div>
          <p className="text-xs italic text-slate-400 bg-black/60 px-3 py-1.5 rounded-lg border border-red-950/40 inline-block w-full">
            "{tagline}"
          </p>
        </div>

        {/* Bio */}
        <p className="text-sm text-slate-300 leading-relaxed mb-5">{bio}</p>

        {/* Skills Tag Cloud */}
        <div className="mb-6">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Capabilities</div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill}
                className="text-xs bg-neutral-950/80 border border-red-950/40 px-2.5 py-0.5 rounded-md text-neutral-200 hover:text-white hover:border-red-750 transition-colors"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between mt-auto">
        {/* Social Links */}
        <div className="flex items-center gap-3">
          {socials.github && (
            <a
              href={`https://github.com/${socials.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-200 transition-colors"
              title="GitHub Profile"
            >
              <Github className="w-4 h-4" />
            </a>
          )}
          {socials.twitter && (
            <a
              href={`https://twitter.com/${socials.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-200 transition-colors"
              title="Twitter Profile"
            >
              <Twitter className="w-4 h-4" />
            </a>
          )}
          {socials.website && (
            <a
              href={socials.website.startsWith("http") ? socials.website : `https://${socials.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-200 transition-colors"
              title="Personal Website"
            >
              <Globe className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Sparks Spark Button */}
        <button
          onClick={() => onSpark(id)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-neutral-900 border border-neutral-900 hover:border-red-900 text-white hover:text-red-400 transition-all active:scale-95 group"
        >
          <Sparkles className="w-3.5 h-3.5 text-neutral-400 group-hover:text-red-500 transition-colors" />
          <span className="text-xs font-black tracking-wide">{sparks} Sparks</span>
        </button>
      </div>
    </div>
  );
}
