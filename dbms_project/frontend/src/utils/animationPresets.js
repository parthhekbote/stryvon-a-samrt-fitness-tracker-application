import { useState, useEffect } from 'react';

/**
 * Custom React Hook to detect OS prefers-reduced-motion setting.
 * When enabled, users get instant/no animations.
 */
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Snappy Gym-Optimized Animation Timings (150ms - 250ms)
 */
export const transitions = {
  snappySpring: { type: 'spring', stiffness: 450, damping: 28 },
  fastEase: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] },
  pulseEase: { duration: 0.25, ease: 'easeInOut' }
};

/**
 * Touch-optimized tap scaling feedback
 */
export const tapScaleProps = {
  whileTap: { scale: 0.96 },
  transition: transitions.snappySpring
};

/**
 * Shared Motion Variants
 */
export const motionVariants = {
  // Page / Section Fade & Slide
  pageTransition: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: transitions.fastEase
  },

  // Micro-interaction: Set / Exercise Checkbox Pop
  checkPop: {
    initial: { scale: 0.6, opacity: 0 },
    animate: { scale: [1.25, 1], opacity: 1 },
    transition: transitions.snappySpring
  },

  // Micro-interaction: Item Deletion Shake & Fade
  deleteItem: {
    initial: { opacity: 1, x: 0 },
    animate: { x: [0, -6, 6, -4, 4, 0], opacity: [1, 0.8, 0], height: 0, marginBottom: 0, padding: 0 },
    transition: { duration: 0.3, ease: 'easeInOut' }
  },

  // Toast Notification Slide In / Out
  toastSlide: {
    initial: { y: -30, opacity: 0, scale: 0.95 },
    animate: { y: 0, opacity: 1, scale: 1 },
    exit: { y: -20, opacity: 0, scale: 0.95 },
    transition: transitions.snappySpring
  },

  // Slide-Over Drawer
  drawerSlide: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    transition: transitions.snappySpring
  },

  // Backdrop Overlay Fade
  backdropFade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.18 }
  },

  // Modal Dialog Pop
  modalPop: {
    initial: { scale: 0.94, opacity: 0, y: 10 },
    animate: { scale: 1, opacity: 1, y: 0 },
    exit: { scale: 0.95, opacity: 0, y: 8 },
    transition: transitions.snappySpring
  },

  // Streak Count Pulse
  streakPulse: {
    animate: { scale: [1, 1.15, 1] },
    transition: { duration: 0.25, ease: 'easeOut' }
  },

  // List Item Stagger Item
  listItem: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, height: 0 },
    transition: transitions.fastEase
  }
};

/**
 * Utility helper to filter out animations if reduced motion is requested
 */
export function getMotionProps(preset, prefersReducedMotion = false) {
  if (prefersReducedMotion) {
    return {
      initial: false,
      animate: preset.animate ? { opacity: 1, scale: 1, x: 0, y: 0 } : undefined,
      exit: undefined,
      transition: { duration: 0 }
    };
  }
  return preset;
}
