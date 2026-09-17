import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * PWAInstallPrompt — Custom, premium "Add to Home Screen" push-style banner.
 * 
 * Captures browser's `beforeinstallprompt` event, suppresses default banner,
 * and presents a branded STRYVON install toast banner.
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed prompt in this session
    const isDismissed = sessionStorage.getItem('stryvon_pwa_dismissed');
    if (isDismissed) return;

    // Handler for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent browser's automatic mini-infobar from showing
      e.preventDefault();
      // Stash event so it can be triggered later
      setDeferredPrompt(e);
      // Show custom UI banner
      setShowPrompt(true);
    };

    // Handler for appinstalled event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
      setIsInstalled(true);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger browser installation prompt
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show deferred install prompt
    deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA Install Prompt outcome: ${outcome}`);

    // Clear saved prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  // Dismiss prompt
  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('stryvon_pwa_dismissed', 'true');
  };

  if (isInstalled && !installedSuccess) return null;

  return (
    <AnimatePresence>
      {/* Installation Success Toast */}
      {installedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-[100] bg-[#1E1E1E] border border-[#D4FF00] p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-white max-w-sm"
        >
          <CheckCircle2 size={24} className="text-[#D4FF00] shrink-0" />
          <div>
            <div className="text-xs font-black uppercase text-[#D4FF00] font-display">STRYVON INSTALLED!</div>
            <div className="text-[11px] text-[#E5E5E5]/80 font-medium">App added to your Home Screen successfully.</div>
          </div>
        </motion.div>
      )}

      {/* Push-Style "Add to Home Screen" Banner */}
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="fixed bottom-20 md:bottom-8 right-4 md:right-8 left-4 md:left-auto z-[99] max-w-md bg-[#161616]/95 backdrop-blur-xl border border-[#D4FF00]/40 p-4 sm:p-5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-white"
        >
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* STRYVON Icon Mark */}
              <div className="h-11 w-11 rounded-xl bg-[#D4FF00] text-[#0A0A0A] flex items-center justify-center font-black shrink-0 shadow-lg shadow-[#D4FF00]/25">
                <Smartphone size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-[#D4FF00] font-display">INSTALL STRYVON</span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#D4FF00]/20 text-[#D4FF00] border border-[#D4FF00]/30 font-display">APP</span>
                </div>
                <h4 className="text-sm font-extrabold text-white">Add to Home Screen</h4>
              </div>
            </div>

            {/* Dismiss Close Button */}
            <button
              onClick={handleDismiss}
              className="text-[#474747] hover:text-white transition-colors p-1.5 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              title="Dismiss"
            >
              <X size={18} />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-[#E5E5E5]/80 mt-2.5 font-medium leading-relaxed">
            Install STRYVON for full-screen app access, offline workout logs & fast 1-tap launching from your mobile home screen.
          </p>

          {/* Action Button Row */}
          <div className="flex items-center justify-end gap-2.5 mt-4">
            <button
              onClick={handleDismiss}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#E5E5E5]/70 hover:text-white uppercase font-display tracking-wider transition-colors min-h-[40px] cursor-pointer"
            >
              NOT NOW
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleInstallClick}
              className="px-5 py-2.5 rounded-xl bg-[#D4FF00] hover:bg-[#c2eb00] text-[#0A0A0A] font-black text-xs uppercase font-display tracking-wider flex items-center gap-2 shadow-lg shadow-[#D4FF00]/20 min-h-[40px] cursor-pointer"
            >
              <Download size={15} className="stroke-[2.5]" />
              <span>ADD TO HOME SCREEN</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
