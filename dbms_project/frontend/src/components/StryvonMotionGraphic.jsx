import React from 'react';

/**
 * StryvonMotionGraphic — DRAMATIC full-screen SVG+CSS motion graphic.
 * 
 * Bold, glowing, unmissable orbiting energy rings with neon trails,
 * pulsing shockwave rings, and a bright central energy core.
 * 
 * Uses SVG <filter> for real glow effects (feGaussianBlur + composite).
 * All animation via CSS @keyframes — GPU-accelerated, seamless infinite loops.
 */
export default function StryvonMotionGraphic() {
  return (
    <div className="stryvon-mesh-stage" aria-hidden="true">
      <svg
        className="stryvon-mesh-svg"
        viewBox="0 0 600 600"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Neon glow filter — creates the electric halo effect */}
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Intense core glow */}
          <filter id="core-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="30" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft outer halo */}
          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Radial gradient for the core energy disc */}
          <radialGradient id="core-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D4FF00" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#D4FF00" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#D4FF00" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* =====================================================
            LAYER 1: OUTER ORBITAL RINGS — Bold glowing arcs
            3 rings, different radii, speeds, and arc lengths.
            These are the hero visual — bright & unmissable.
            ===================================================== */}

        {/* Outer Ring — r=270, wide bright arc, slow majestic orbit */}
        <circle
          className="orbit-arc orbit-1"
          cx="300" cy="300" r="270"
          fill="none"
          stroke="#D4FF00"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="450 1247"
          filter="url(#neon-glow)"
        />

        {/* Second outer arc segment on same ring — creates dual-arc feel */}
        <circle
          className="orbit-arc orbit-1b"
          cx="300" cy="300" r="270"
          fill="none"
          stroke="#D4FF00"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="180 1517"
          strokeDashoffset="800"
          opacity="0.6"
          filter="url(#soft-glow)"
        />

        {/* Middle Ring — r=210, counter-clockwise, medium speed */}
        <circle
          className="orbit-arc orbit-2"
          cx="300" cy="300" r="210"
          fill="none"
          stroke="#D4FF00"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="350 969"
          filter="url(#neon-glow)"
          opacity="0.85"
        />

        {/* Second arc on middle ring */}
        <circle
          className="orbit-arc orbit-2b"
          cx="300" cy="300" r="210"
          fill="none"
          stroke="#D4FF00"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="120 1199"
          strokeDashoffset="600"
          opacity="0.4"
          filter="url(#soft-glow)"
        />

        {/* Inner Ring — r=145, fast orbit, bright accent */}
        <circle
          className="orbit-arc orbit-3"
          cx="300" cy="300" r="145"
          fill="none"
          stroke="#D4FF00"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="250 661"
          filter="url(#neon-glow)"
          opacity="0.9"
        />

        {/* Tight inner accent ring — r=95 */}
        <circle
          className="orbit-arc orbit-4"
          cx="300" cy="300" r="95"
          fill="none"
          stroke="#D4FF00"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="150 447"
          filter="url(#soft-glow)"
          opacity="0.5"
        />

        {/* =====================================================
            LAYER 2: SHOCKWAVE / PULSE RINGS
            Rings that expand outward & fade — dramatic energy burst
            ===================================================== */}

        <circle
          className="shockwave shockwave-1"
          cx="300" cy="300" r="80"
          fill="none"
          stroke="#D4FF00"
          strokeWidth="1.5"
        />

        <circle
          className="shockwave shockwave-2"
          cx="300" cy="300" r="80"
          fill="none"
          stroke="#D4FF00"
          strokeWidth="1"
        />

        {/* =====================================================
            LAYER 3: STATIC CONCENTRIC GUIDE RINGS
            Very faint dashed rings for depth / sci-fi telemetry feel
            ===================================================== */}

        <circle
          cx="300" cy="300" r="270"
          fill="none"
          stroke="#D4FF00"
          strokeWidth="0.3"
          strokeDasharray="4 12"
          opacity="0.15"
        />
        <circle
          cx="300" cy="300" r="210"
          fill="none"
          stroke="#D4FF00"
          strokeWidth="0.3"
          strokeDasharray="4 12"
          opacity="0.12"
        />
        <circle
          cx="300" cy="300" r="145"
          fill="none"
          stroke="#D4FF00"
          strokeWidth="0.3"
          strokeDasharray="4 12"
          opacity="0.1"
        />

        {/* =====================================================
            LAYER 4: ORBITAL DOT MARKERS
            Small bright dots that ride the orbital paths
            ===================================================== */}

        <circle className="orbital-dot odot-1" cx="300" cy="30" r="4" fill="#D4FF00" filter="url(#neon-glow)" opacity="0.9" />
        <circle className="orbital-dot odot-2" cx="300" cy="90" r="3" fill="#D4FF00" filter="url(#soft-glow)" opacity="0.7" />
        <circle className="orbital-dot odot-3" cx="300" cy="155" r="3.5" fill="#D4FF00" filter="url(#neon-glow)" opacity="0.8" />
        <circle className="orbital-dot odot-4" cx="300" cy="205" r="2.5" fill="#D4FF00" filter="url(#soft-glow)" opacity="0.6" />

        {/* =====================================================
            LAYER 5: CENTRAL ENERGY CORE
            Bright glowing core with pulsing rings
            ===================================================== */}

        {/* Core energy disc */}
        <circle
          className="core-disc"
          cx="300" cy="300" r="35"
          fill="url(#core-gradient)"
          filter="url(#core-glow)"
        />

        {/* Core bright dot */}
        <circle
          className="core-dot"
          cx="300" cy="300" r="6"
          fill="#D4FF00"
          filter="url(#neon-glow)"
        />

        {/* Core inner ring */}
        <circle
          className="core-ring core-ring-1"
          cx="300" cy="300" r="20"
          fill="none"
          stroke="#D4FF00"
          strokeWidth="1"
          filter="url(#soft-glow)"
          opacity="0.7"
        />

        {/* Core outer ring */}
        <circle
          className="core-ring core-ring-2"
          cx="300" cy="300" r="45"
          fill="none"
          stroke="#D4FF00"
          strokeWidth="0.8"
          filter="url(#soft-glow)"
          opacity="0.4"
        />

        {/* =====================================================
            LAYER 6: CROSSHAIR / TARGETING LINES
            Faint axis lines through center for sci-fi precision feel
            ===================================================== */}

        <line x1="300" y1="30" x2="300" y2="200" stroke="#D4FF00" strokeWidth="0.4" opacity="0.12" />
        <line x1="300" y1="400" x2="300" y2="570" stroke="#D4FF00" strokeWidth="0.4" opacity="0.12" />
        <line x1="30" y1="300" x2="200" y2="300" stroke="#D4FF00" strokeWidth="0.4" opacity="0.12" />
        <line x1="400" y1="300" x2="570" y2="300" stroke="#D4FF00" strokeWidth="0.4" opacity="0.12" />

      </svg>
    </div>
  );
}
