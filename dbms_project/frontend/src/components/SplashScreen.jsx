import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import StryvonLogo from './StryvonLogo';

export default function SplashScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onFinish();
          }, 200);
          return 100;
        }
        return prev + 5;
      });
    }, 90); // ~1.8 - 2.0 seconds total duration

    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100] bg-[#0A0A0A] flex items-center justify-center overflow-hidden font-sans select-none"
    >
      {/* Background Sprinter Athlete Image */}
      <motion.div 
        initial={{ scale: 1.1, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 0.95 }}
        transition={{ duration: 2.2, ease: 'easeOut' }}
        className="absolute inset-0 bg-cover bg-right md:bg-center z-0"
        style={{ backgroundImage: `url('/assets/splash_sprinter.png')` }}
      />

      {/* Dark Gradient Overlay for Contrast */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/85 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A]/60 z-10" />

      {/* Ambient Neon Glow Aura */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#D4FF00]/20 rounded-full blur-[140px] pointer-events-none z-10" />

      {/* Content Container */}
      <div className="relative z-20 w-full max-w-6xl px-8 md:px-16 flex flex-col justify-between h-full py-12 md:py-16">
        
        {/* Top Spacer */}
        <div />

        {/* Center Brand Identity (Matches STRYVON Reference Image) */}
        <div className="space-y-6 max-w-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <StryvonLogo showTagline={true} className="scale-125 md:scale-150 origin-left" />
          </motion.div>
        </div>

        {/* Bottom Bar: Loading Bar & Domain */}
        <div className="flex justify-between items-end border-t border-white/10 pt-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="h-2 w-6 bg-[#D4FF00] rounded-full shadow-[0_0_8px_#D4FF00]" />
              <span className="font-display text-sm tracking-[0.2em] text-[#E5E5E5] uppercase">
                STRYVON.COM
              </span>
            </div>
          </div>

          {/* Animated Loading Bar */}
          <div className="w-48 md:w-64 space-y-1.5 text-right">
            <div className="w-full bg-[#1E1E1E] border border-[#474747]/40 h-2 rounded-full overflow-hidden">
              <motion.div 
                className="bg-[#D4FF00] h-full rounded-full shadow-[0_0_12px_#D4FF00]"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
            <span className="font-display text-xs tracking-widest text-[#474747] uppercase block pt-1">
              LOADING SYSTEM {progress}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

