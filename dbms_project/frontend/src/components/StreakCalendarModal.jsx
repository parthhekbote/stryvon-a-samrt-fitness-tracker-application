import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Award, CheckCircle2, Timer } from 'lucide-react';

const getLocalDateStr = (rawDate) => {
  if (!rawDate) return '';
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
    return rawDate.trim();
  }
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getUtcDateStr = (rawDate) => {
  if (!rawDate) return '';
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

export default function StreakCalendarModal({ isOpen, onClose, streakCount = 0, highestStreak = 0, history = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayNum, setSelectedDayNum] = useState(new Date().getDate());
  const [selectedDayFormatted, setSelectedDayFormatted] = useState('');

  // Map workout history into a set of date strings 'YYYY-MM-DD'
  const workoutsByDate = React.useMemo(() => {
    const map = {};
    if (!history || !Array.isArray(history)) return map;

    history.forEach(log => {
      const rawDate = log.logged_at || log.created_at || log.recorded_at || log.user_date || log.date;
      if (!rawDate) return;
      const localKey = getLocalDateStr(rawDate);
      const utcKey = getUtcDateStr(rawDate);
      
      if (localKey) {
        if (!map[localKey]) map[localKey] = [];
        map[localKey].push(log);
      }
      if (utcKey && utcKey !== localKey) {
        if (!map[utcKey]) map[utcKey] = [];
        map[utcKey].push(log);
      }
    });

    return map;
  }, [history]);

  // Active streak dates set (last streakCount days)
  const activeStreakDateKeys = React.useMemo(() => {
    const set = new Set();
    if (!streakCount || streakCount <= 0) return set;

    const today = new Date();
    for (let i = 0; i < streakCount; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const localK = getLocalDateStr(d);
      const utcK = getUtcDateStr(d);
      if (localK) set.add(localK);
      if (utcK) set.add(utcK);
    }
    return set;
  }, [streakCount]);

  // Reset to current month and auto-select today whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setCurrentDate(now);
      setSelectedDayNum(now.getDate());
      setSelectedDayFormatted(now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const handlePrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    setCurrentDate(prev);
    setSelectedDayNum(null);
    setSelectedDayFormatted('');
  };

  const handleNextMonth = () => {
    const next = new Date(year, month + 1, 1);
    setCurrentDate(next);
    setSelectedDayNum(null);
    setSelectedDayFormatted('');
  };

  const todayStr = getLocalDateStr(new Date());

  const handleDayClick = (dayNum) => {
    setSelectedDayNum(dayNum);
    setSelectedDayFormatted(new Date(year, month, dayNum).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }));
  };

  const isStreakActive = streakCount > 0;

  // Currently selected date key
  const selectedDateKey = selectedDayNum ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDayNum).padStart(2, '0')}` : null;
  const selectedDayWorkouts = selectedDateKey ? (workoutsByDate[selectedDateKey] || []) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="bg-[#1E1E1E] border border-[#474747] p-6 rounded-3xl max-w-xl w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#474747]/40 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${isStreakActive ? 'bg-orange-500/15 border-orange-500/40 text-orange-500' : 'bg-[#0A0A0A] border-[#474747]/40 text-[#474747]'}`}>
              <Flame size={24} className={isStreakActive ? 'fill-orange-500 text-orange-500' : 'text-[#474747] fill-none'} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-extrabold text-white uppercase tracking-wide">
                STREAK CALENDAR
              </h2>
              <p className="text-xs text-slate-400">Cult.fit attendance calendar grid.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-[#262626] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Streak Summary Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-orange-500/30 flex items-center gap-3">
            <Flame size={28} className={isStreakActive ? 'text-orange-500 fill-orange-500' : 'text-[#474747]'} />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase font-display block">WORKOUT STREAK</span>
              <span className="font-display text-2xl font-extrabold text-white">{streakCount}</span>
            </div>
          </div>
          <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-amber-500/30 flex items-center gap-3">
            <Award size={28} className="text-amber-400" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase font-display block">LONGEST STREAK</span>
              <span className="font-display text-2xl font-extrabold text-white">{Math.max(streakCount, highestStreak)}</span>
            </div>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex justify-between items-center bg-[#0A0A0A] px-4 py-3 rounded-2xl border border-[#474747]/30">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1E1E1E] rounded-xl transition-colors cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-display text-base font-bold text-white uppercase tracking-wider">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1E1E1E] rounded-xl transition-colors cursor-pointer"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 text-center text-[10px] font-extrabold text-slate-400 uppercase font-display tracking-wider">
          <span>MON</span>
          <span>TUE</span>
          <span>WED</span>
          <span>THU</span>
          <span>FRI</span>
          <span>SAT</span>
          <span>SUN</span>
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty Padding Cells */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-11 rounded-xl bg-transparent" />
          ))}

          {/* Actual Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const monthStr = String(month + 1).padStart(2, '0');
            const dayStr = String(dayNum).padStart(2, '0');
            const dateKey = `${year}-${monthStr}-${dayStr}`;
            const dayLogs = workoutsByDate[dateKey] || [];
            const hasWorkout = dayLogs.length > 0;
            const isStreakMaintained = hasWorkout || activeStreakDateKeys.has(dateKey);
            const isToday = dateKey === todayStr;
            const isSelected = selectedDayNum === dayNum;

            let cellStyle = 'bg-[#0A0A0A] border-[#474747]/30 text-slate-400 hover:border-[#474747]';
            if (isStreakMaintained && isSelected) {
              // COMBINED STATE: Orange background + Flame icon + Yellow outline ring!
              cellStyle = 'bg-orange-500 text-white border-[#D4FF00] ring-2 ring-[#D4FF00] shadow-[0_0_16px_rgba(212,255,0,0.6)] font-black';
            } else if (isStreakMaintained) {
              // Streak maintained / Workout completed: Orange background + Flame icon
              cellStyle = 'bg-orange-500 text-white border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.45)] font-extrabold';
            } else if (isSelected || isToday) {
              // Selected or Today's date without workout: Dark background + Yellow border
              cellStyle = 'bg-[#1E1E1E] border-[#D4FF00] ring-2 ring-[#D4FF00]/60 text-[#D4FF00] font-extrabold';
            }

            return (
              <motion.button
                key={`day-${dayNum}`}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDayClick(dayNum)}
                className={`h-12 rounded-2xl flex flex-col items-center justify-center relative cursor-pointer border transition-all ${cellStyle}`}
              >
                <span className="text-xs font-bold font-display">{dayNum}</span>
                {isStreakMaintained && (
                  <Flame size={12} className="fill-white text-white mt-0.5" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Selected Day Details Drawer */}
        {selectedDayFormatted && (
          <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-[#474747]/40 space-y-3">
            <div className="flex justify-between items-center border-b border-[#474747]/30 pb-2">
              <span className="text-xs font-bold text-[#D4FF00] uppercase font-display tracking-wider">
                {selectedDayFormatted}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase font-display">
                {selectedDayWorkouts.length} WORKOUT(S)
              </span>
            </div>

            {selectedDayWorkouts.length > 0 ? (
              <div className="space-y-2">
                {selectedDayWorkouts.map((log, idx) => (
                  <div key={idx} className="bg-[#1E1E1E] p-3.5 rounded-xl border border-[#474747]/40 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <h4 className="font-display text-sm font-bold text-white uppercase flex items-center gap-2">
                        <Flame size={14} className="text-orange-500 fill-orange-500" />
                        {log.custom_name || log.workout_name || 'Workout Session'}
                      </h4>
                      <div className="flex items-center gap-1 text-[#D4FF00] font-bold text-xs">
                        <CheckCircle2 size={16} />
                        <span>Done</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium flex items-center gap-2 pt-0.5">
                      <span className="inline-flex items-center gap-1"><Timer size={12} className="text-slate-400" /> {log.actual_duration || log.duration || 45} MINS</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1"><Flame size={12} className="text-orange-500 fill-orange-500" /> {log.actual_calories_burned || log.calories_burned || 0} KCAL</span>
                    </p>
                    {log.completed_exercises && Array.isArray(log.completed_exercises) && log.completed_exercises.length > 0 && (
                      <p className="text-[11px] text-slate-300 font-sans pt-1 border-t border-[#474747]/20">
                        <strong className="text-slate-400 font-display uppercase tracking-wider text-[10px]">Exercises ({log.completed_exercises.length}):</strong> {log.completed_exercises.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-2 font-medium">
                No workouts recorded for this date.
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
