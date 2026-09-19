import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({ 
  label, 
  icon: Icon, 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select an option", 
  required = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => String(o.value) === String(value));

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
      {label && (
        <label className="text-xs text-[#E5E5E5]/70 flex items-center gap-1.5 font-bold uppercase tracking-wider font-display">
          {Icon && <Icon size={13} className="text-[#D4FF00]" />}
          {label} {required && <span className="text-[#D4FF00]">*</span>}
        </label>
      )}

      {/* Custom Select Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#0A0A0A] border rounded-xl py-3 px-4 text-sm text-left flex items-center justify-between transition-all duration-200 min-h-[44px] cursor-pointer ${
          isOpen
            ? 'border-[#D4FF00] ring-1 ring-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.25)] text-white'
            : 'border-[#474747] hover:border-slate-400 text-white'
        }`}
      >
        <span className={selectedOption ? "text-white font-medium truncate" : "text-slate-500 font-medium truncate"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-[#D4FF00] shrink-0 ml-2"
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      {/* Custom Floating Options Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full mt-2 bg-[#121212]/95 border border-[#474747] backdrop-blur-md rounded-2xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto divide-y divide-[#474747]/30 custom-scrollbar"
          >
            {options.length > 0 ? (
              options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-xs sm:text-sm text-left flex items-center justify-between transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-[#D4FF00]/15 text-[#D4FF00] font-extrabold font-display tracking-wider border-l-4 border-l-[#D4FF00]'
                        : 'text-slate-200 hover:bg-[#1E1E1E] hover:text-[#D4FF00]'
                    }`}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    {isSelected && <Check size={16} className="text-[#D4FF00] shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-3 text-xs text-slate-400 text-center">
                No options available
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
