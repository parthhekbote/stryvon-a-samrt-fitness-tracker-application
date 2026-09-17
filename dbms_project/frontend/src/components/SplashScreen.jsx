import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { usePrefersReducedMotion } from '../utils/animationPresets';

export default function SplashScreen({ onFinish }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState(1); // 1: Charge, 2: Shockwave & Wordmark, 3: Complete

  useEffect(() => {
    // If user prefers reduced motion, skip complex shockwave steps and finish quickly
    if (prefersReducedMotion) {
      const timer = setTimeout(() => {
        onFinish();
      }, 500);
      return () => clearTimeout(timer);
    }

    // Preload document fonts
    if (document.fonts) {
      document.fonts.ready.catch(() => {});
    }

    // Phase 1 -> Phase 2 transition at 0.5s
    const phase2Timer = setTimeout(() => {
      setPhase(2);
    }, 500);

    // Phase 2 -> Finish transition at 1.5s
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 1550);

    return () => {
      clearTimeout(phase2Timer);
      clearTimeout(finishTimer);
    };
  }, [onFinish, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[100] bg-[#0A0A0A] flex flex-col items-center justify-center font-sans select-none"
      >
        <div className="flex items-center gap-3">
          <Zap size={36} className="text-[#D4FF00] fill-[#D4FF00]" />
          <span className="font-display text-4xl font-black text-white tracking-wider">STRYVON</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100] bg-[#0A0A0A] flex flex-col items-center justify-center font-sans select-none overflow-hidden"
    >
      {/* Background Soft Glow Blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-[#D4FF00]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Center Stage */}
      <div className="relative flex flex-col items-center justify-center z-10 px-4 text-center">
        
        {/* GPU Shockwave Ring (Phase 2 Energy Burst) */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div 
              key="shockwave"
              initial={{ scale: 0.5, opacity: 0.9 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-[#D4FF00] pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Center Lightning Bolt Logo Container */}
        <motion.div 
          initial={{ scale: 0.7, opacity: 0.3 }}
          animate={
            phase === 1 
              ? { scale: 1, opacity: 1 } 
              : { scale: [1, 1.22, 1.05], opacity: 1 }
          }
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative flex items-center justify-center p-4"
        >
          <div className="p-4 rounded-3xl bg-[#1E1E1E] border border-[#D4FF00]/50 text-[#D4FF00] shadow-[0_0_40px_rgba(212,255,0,0.35)]">
            <Zap size={44} className="fill-[#D4FF00] stroke-black stroke-[1.5]" />
          </div>
        </motion.div>

        {/* Brand Wordmark & Tagline Reveal (Phase 2 & 3) */}
        <div className="mt-6 overflow-hidden h-20 flex flex-col items-center justify-center">
          <AnimatePresence>
            {phase >= 2 && (
              <motion.div
                key="wordmark"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
                className="flex flex-col items-center gap-1.5"
              >
                <h1 className="font-display text-3xl sm:text-5xl font-black text-white tracking-wider uppercase">
                  STRYVON
                </h1>
                <span className="font-display text-[11px] sm:text-xs font-black text-[#D4FF00] tracking-[0.25em] uppercase">
                  PERFORM. PUSH. PROGRESS.
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Bottom Subtle Domain Tag */}
      <div className="absolute bottom-8 text-center z-10">
        <span className="font-display text-[10px] tracking-[0.3em] text-[#474747] font-extrabold uppercase">
          FITNESS TELEMETRY ENGINE
        </span>
      </div>
    </motion.div>
  );
}
