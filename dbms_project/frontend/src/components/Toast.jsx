import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="fixed top-6 right-6 z-[100] max-w-sm w-full font-display"
      >
        <div className={`p-4 rounded-2xl border shadow-2xl flex items-start gap-3 backdrop-blur-md ${
          isSuccess 
            ? 'bg-[#1E1E1E]/95 border-[#D4FF00] shadow-[0_0_30px_rgba(212,255,0,0.25)] text-white' 
            : isError 
            ? 'bg-[#1E1E1E]/95 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.25)] text-white'
            : 'bg-[#1E1E1E]/95 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.25)] text-white'
        }`}>
          <div className="mt-0.5">
            {isSuccess && <CheckCircle2 size={22} className="text-[#D4FF00]" />}
            {isError && <AlertCircle size={22} className="text-rose-500" />}
            {!isSuccess && !isError && <Info size={22} className="text-amber-400" />}
          </div>

          <div className="flex-1">
            <h4 className={`text-sm font-extrabold uppercase tracking-wider ${
              isSuccess ? 'text-[#D4FF00]' : isError ? 'text-rose-400' : 'text-amber-300'
            }`}>
              {toast.title || (isSuccess ? 'Success' : isError ? 'Error' : 'Notice')}
            </h4>
            <p className="text-xs font-bold text-[#E5E5E5] mt-1 leading-relaxed">
              {toast.message}
            </p>
            {toast.summary && (
              <div className="mt-2.5 pt-2 border-t border-[#474747]/40 flex items-center justify-between text-[11px] font-extrabold text-[#D4FF00] uppercase tracking-wider">
                <span>Sets: {toast.summary.sets}</span>
                <span>Time: {toast.summary.duration}m</span>
                <span>Burn: {toast.summary.calories || 0} kcal</span>
              </div>
            )}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="text-[#474747] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
