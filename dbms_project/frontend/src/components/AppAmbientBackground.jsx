import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../utils/animationPresets';

/**
 * AppAmbientBackground — Continuous, theme-tailored ambient background motion graphics
 * for all STRYVON pages (Dashboard, Workouts, Diet, AI Coach, Analytics, Profile).
 * 
 * Features:
 *  - Layer 0: Slow-drifting neon-green and deep atmosphere glow orbs (GPU-accelerated)
 *  - Layer 1: Route-tailored SVG geometric telemetry loops (radar traces, neural nodes, macro rings)
 *  - Fully pointer-events-none, z-0, responsive across mobile and desktop.
 */
export default function AppAmbientBackground() {
  const location = useLocation();
  const prefersReducedMotion = usePrefersReducedMotion();
  const path = location.pathname;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* =================================================================
          LAYER 0: App-wide Drifting Ambient Glow Orbs
          ================================================================= */}
      
      {/* Top-Right Neon Ambient Aura */}
      <motion.div
        animate={
          prefersReducedMotion
            ? {}
            : {
                x: [0, 40, -30, 0],
                y: [0, -50, 30, 0],
                scale: [1, 1.15, 0.9, 1],
                opacity: [0.08, 0.16, 0.08],
              }
        }
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-24 -right-24 w-[32rem] h-[32rem] bg-[#D4FF00]/12 rounded-full blur-[160px]"
      />

      {/* Bottom-Left Deep Atmosphere Smudge */}
      <motion.div
        animate={
          prefersReducedMotion
            ? {}
            : {
                x: [0, -35, 25, 0],
                y: [0, 40, -25, 0],
                scale: [0.9, 1.12, 1],
                opacity: [0.06, 0.14, 0.06],
              }
        }
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute -bottom-32 -left-32 w-[36rem] h-[36rem] bg-[#D4FF00]/10 rounded-full blur-[180px]"
      />

      {/* =================================================================
          LAYER 1: Route-Specific Dynamic SVG Background Motion Graphic
          ================================================================= */}

      {/* 1. DASHBOARD & DEFAULT — Telemetry Radial Grid */}
      {(path === '/' || path === '/dashboard') && (
        <div className="absolute top-10 right-10 w-[480px] sm:w-[640px] aspect-square opacity-20 md:opacity-30">
          <svg className="w-full h-full" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="250" cy="250" r="220" stroke="#D4FF00" strokeWidth="1" strokeDasharray="6 14" className="orbit-1" opacity="0.4" />
            <circle cx="250" cy="250" r="160" stroke="#D4FF00" strokeWidth="1.5" strokeDasharray="200 800" className="orbit-2" opacity="0.6" />
            <circle cx="250" cy="250" r="100" stroke="#D4FF00" strokeWidth="2" strokeDasharray="100 520" className="orbit-3" opacity="0.8" />
            <circle cx="250" cy="250" r="40" fill="#D4FF00" opacity="0.1" className="core-disc" />
            <circle cx="250" cy="250" r="4" fill="#D4FF00" className="core-dot" />
          </svg>
        </div>
      )}

      {/* 2. WORKOUTS & EXERCISES — Dynamic Kinetic Wave Sweep */}
      {(path === '/workouts' || path === '/exercises') && (
        <div className="absolute top-1/4 right-0 w-[500px] sm:w-[700px] aspect-square opacity-20 md:opacity-30 translate-x-1/4">
          <svg className="w-full h-full" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="300" cy="300" r="260" stroke="#D4FF00" strokeWidth="2" strokeDasharray="300 1334" className="orbit-1" />
            <circle cx="300" cy="300" r="190" stroke="#D4FF00" strokeWidth="1.5" strokeDasharray="180 1013" className="orbit-2" opacity="0.7" />
            <circle cx="300" cy="300" r="120" stroke="#D4FF00" strokeWidth="2.5" strokeDasharray="120 633" className="orbit-3" />
            <line x1="40" y1="300" x2="560" y2="300" stroke="#D4FF00" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.2" />
          </svg>
        </div>
      )}

      {/* 3. DIET TRACKER — Organic Concentric Macro Ring Pulse */}
      {path === '/diet' && (
        <div className="absolute top-16 right-12 w-[420px] sm:w-[580px] aspect-square opacity-25 md:opacity-35">
          <svg className="w-full h-full" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="250" cy="250" r="200" stroke="#D4FF00" strokeWidth="1.5" strokeDasharray="150 1106" className="orbit-1" opacity="0.6" />
            <circle cx="250" cy="250" r="150" stroke="#D4FF00" strokeWidth="2" strokeDasharray="220 722" className="orbit-2" opacity="0.8" />
            <circle cx="250" cy="250" r="90" stroke="#D4FF00" strokeWidth="1" strokeDasharray="80 485" className="orbit-3" opacity="0.5" />
            <circle cx="250" cy="250" r="70" className="shockwave shockwave-1" stroke="#D4FF00" strokeWidth="1" fill="none" />
          </svg>
        </div>
      )}

      {/* 4. AI COACH — Neural Nodes & Orbital Radar Trace */}
      {path === '/coach' && (
        <div className="absolute bottom-16 right-8 w-[450px] sm:w-[600px] aspect-square opacity-25 md:opacity-35">
          <svg className="w-full h-full" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="250" cy="250" r="210" stroke="#D4FF00" strokeWidth="1.5" strokeDasharray="300 1019" className="orbit-1" />
            <circle cx="250" cy="250" r="140" stroke="#D4FF00" strokeWidth="2" strokeDasharray="180 699" className="orbit-2" opacity="0.8" />
            <circle cx="250" cy="250" r="75" stroke="#D4FF00" strokeWidth="2.5" strokeDasharray="100 371" className="orbit-3" />
            <circle cx="250" cy="40" r="4" fill="#D4FF00" className="odot-1" />
            <circle cx="250" cy="110" r="3.5" fill="#D4FF00" className="odot-2" />
            <circle cx="250" cy="175" r="3" fill="#D4FF00" className="odot-3" />
            <circle cx="250" cy="250" r="12" fill="#D4FF00" opacity="0.8" className="core-dot" />
          </svg>
        </div>
      )}

      {/* 5. ANALYTICS — Telemetry Radar Sweeps & Grid Markers */}
      {path === '/analytics' && (
        <div className="absolute top-10 right-10 w-[500px] sm:w-[660px] aspect-square opacity-20 md:opacity-30">
          <svg className="w-full h-full" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="250" cy="250" r="220" stroke="#D4FF00" strokeWidth="1" strokeDasharray="10 20" className="orbit-1" opacity="0.3" />
            <circle cx="250" cy="250" r="170" stroke="#D4FF00" strokeWidth="2" strokeDasharray="250 818" className="orbit-2" opacity="0.75" />
            <circle cx="250" cy="250" r="110" stroke="#D4FF00" strokeWidth="1.5" strokeDasharray="140 551" className="orbit-3" opacity="0.6" />
            <line x1="250" y1="30" x2="250" y2="470" stroke="#D4FF00" strokeWidth="0.4" strokeDasharray="6 6" opacity="0.2" />
            <line x1="30" y1="250" x2="470" y2="250" stroke="#D4FF00" strokeWidth="0.4" strokeDasharray="6 6" opacity="0.2" />
          </svg>
        </div>
      )}

      {/* 6. PROFILE — Sleek Concentric Halo */}
      {path === '/profile' && (
        <div className="absolute top-1/4 right-1/4 w-[400px] sm:w-[550px] aspect-square opacity-20 md:opacity-30">
          <svg className="w-full h-full" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="250" cy="250" r="190" stroke="#D4FF00" strokeWidth="1.5" strokeDasharray="200 993" className="orbit-1" />
            <circle cx="250" cy="250" r="130" stroke="#D4FF00" strokeWidth="2" strokeDasharray="160 656" className="orbit-2" opacity="0.75" />
            <circle cx="250" cy="250" r="70" className="shockwave shockwave-1" stroke="#D4FF00" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      )}
    </div>
  );
}
