import React from "react";
import { AvatarStyle } from "../types";

interface SvgAvatarProps {
  style: AvatarStyle;
  name: string;
  size?: number;
}

export default function SvgAvatar({ style, name, size = 64 }: SvgAvatarProps) {
  const { bgColor, fgColor, pattern } = style;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  // Unique ID for the SVG pattern to avoid collisions
  const patternId = `pattern-${pattern}-${bgColor.replace("#", "")}-${fgColor.replace("#", "")}`;

  const renderPattern = () => {
    switch (pattern) {
      case "dots":
        return (
          <pattern id={patternId} width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="2" fill={fgColor} opacity="0.65" />
          </pattern>
        );
      case "grid":
        return (
          <pattern id={patternId} width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke={fgColor} strokeWidth="1" opacity="0.4" />
          </pattern>
        );
      case "waves":
        return (
          <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 0 10 Q 5 5, 10 10 T 20 10"
              fill="none"
              stroke={fgColor}
              strokeWidth="1.5"
              opacity="0.6"
            />
          </pattern>
        );
      case "circles":
        return (
          <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="8" fill="none" stroke={fgColor} strokeWidth="1" opacity="0.5" />
            <circle cx="12" cy="12" r="4" fill="none" stroke={fgColor} strokeWidth="0.5" opacity="0.3" />
          </pattern>
        );
      case "triangles":
        return (
          <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
            <polygon points="10,2 18,16 2,16" fill="none" stroke={fgColor} strokeWidth="1" opacity="0.4" />
          </pattern>
        );
      case "crosses":
        return (
          <pattern id={patternId} width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M 7 3 L 7 11 M 3 7 L 11 7" fill="none" stroke={fgColor} strokeWidth="1.5" opacity="0.6" />
          </pattern>
        );
      default:
        return null;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="rounded-full shadow-inner select-none transition-transform duration-500 hover:rotate-6"
    >
      <defs>
        {renderPattern()}
        <radialGradient id={`grad-${patternId}`} cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </radialGradient>
      </defs>

      {/* Base Background Color */}
      <circle cx="50" cy="50" r="48" fill={bgColor} />

      {/* Repeating Pattern Overlay */}
      <circle cx="50" cy="50" r="48" fill={`url(#${patternId})`} />

      {/* 3D Sphere Shading Overlay */}
      <circle cx="50" cy="50" r="48" fill={`url(#grad-${patternId})`} />

      {/* Subtle border */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.15" />

      {/* Centered Initials */}
      <text
        x="50"
        y="56"
        fill="#ffffff"
        fontSize="30"
        fontWeight="800"
        fontFamily="sans-serif"
        textAnchor="middle"
        className="drop-shadow-md select-none tracking-tight pointer-events-none"
        style={{ fill: "#ffffff", stroke: "rgba(0,0,0,0.1)", strokeWidth: "1px" }}
      >
        {initials}
      </text>
    </svg>
  );
}
