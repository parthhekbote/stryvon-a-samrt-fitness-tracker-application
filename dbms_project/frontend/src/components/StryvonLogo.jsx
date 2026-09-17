import React from 'react';
import { motion } from 'framer-motion';

export default function StryvonLogo({ className = 'h-10', showTagline = false, logoOnly = false }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.04 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex items-center gap-3 select-none cursor-pointer group ${className}`}
    >
      {/* Official STRYVON Angular "S" Logo Mark SVG */}
      <div className="relative shrink-0 flex items-center justify-center">
        {/* Pulsing Neon Background Aura */}
        <div className="absolute inset-0 bg-[#D4FF00]/30 blur-xl rounded-full scale-110 group-hover:scale-150 group-hover:bg-[#D4FF00]/50 transition-all duration-500 pointer-events-none" />

        <motion.svg 
          whileHover={{ rotate: 5, scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="w-9 h-9 md:w-11 md:h-11 relative z-10 drop-shadow-[0_0_15px_rgba(212,255,0,0.6)]" 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer sharp STRYVON "S" Lightning Polygon */}
          <path 
            d="M 52 8 L 88 42 L 68 42 L 82 88 L 18 52 L 40 52 L 24 16 Z" 
            fill="#D4FF00" 
            stroke="#D4FF00"
            strokeWidth="3"
            strokeLinejoin="miter"
          />
          {/* Inner Sharp Diagonal Cutout */}
          <path 
            d="M 46 32 L 60 46 L 38 46 Z" 
            fill="#0A0A0A" 
          />
          <path 
            d="M 54 54 L 62 62 L 40 62 Z" 
            fill="#0A0A0A" 
          />
        </motion.svg>
      </div>

      {!logoOnly && (
        <div className="flex flex-col">
          <span className="font-display text-2xl md:text-3xl font-black tracking-[0.12em] text-white leading-none group-hover:text-[#D4FF00] transition-colors duration-300">
            STRYVON
          </span>
          {showTagline && (
            <span className="font-display text-[9px] md:text-[11px] font-black tracking-[0.25em] text-[#D4FF00] uppercase mt-0.5 animate-shimmer-text">
              PERFORM. PUSH. PROGRESS.
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

