import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Plus, 
  X, 
  Calendar, 
  RefreshCw, 
  Layers, 
  Info,
  ChevronDown
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';

// Preset Muscle Group Options
const UPPER_BODY_PRESETS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Core', 'Traps', 'Forearms', 'Lats'
];

const LOWER_BODY_PRESETS = [
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Adductors'
];

// Helper to format local YYYY-MM-DD
function getLocalTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to calculate N days ago local date string
function getLocalNDaysAgoStr(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Telemetry({ apiUrl, token }) {
  // Duration Selector State: '30D' | '60D' | '90D' | 'Custom'
  const [durationMode, setDurationMode] = useState('30D');
  const [customStartDate, setCustomStartDate] = useState(() => getLocalNDaysAgoStr(14));
  
  // Selected Muscles State (Persisted in LocalStorage)
  const [upperMuscles, setUpperMuscles] = useState(() => {
    try {
      const saved = localStorage.getItem('stryvon_telemetry_upper');
      return saved ? JSON.parse(saved) : ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Core'];
    } catch (e) {
      return ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Core'];
    }
  });

  const [lowerMuscles, setLowerMuscles] = useState(() => {
    try {
      const saved = localStorage.getItem('stryvon_telemetry_lower');
      return saved ? JSON.parse(saved) : ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Adductors'];
    } catch (e) {
      return ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Adductors'];
    }
  });

  // Modal / Dropdown State for Adding Muscles
  const [showUpperPicker, setShowUpperPicker] = useState(false);
  const [showLowerPicker, setShowLowerPicker] = useState(false);

  // Telemetry Aggregation Data State
  const [telemetryCounts, setTelemetryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  // Today Local String for Date Limits
  const todayLocalStr = useMemo(() => getLocalTodayStr(), []);

  // Compute Active Date Range
  const { startDateStr, endDateStr, durationLabel } = useMemo(() => {
    const end = todayLocalStr;
    let start = todayLocalStr;
    let label = 'Showing raw set volume over the last 30 days';

    if (durationMode === '30D') {
      start = getLocalNDaysAgoStr(30);
      label = 'Showing raw set volume over the last 30 days';
    } else if (durationMode === '60D') {
      start = getLocalNDaysAgoStr(60);
      label = 'Showing raw set volume over the last 60 days';
    } else if (durationMode === '90D') {
      start = getLocalNDaysAgoStr(90);
      label = 'Showing raw set volume over the last 90 days';
    } else if (durationMode === 'Custom') {
      start = customStartDate || getLocalNDaysAgoStr(14);
      label = `Custom: ${start} – Today`;
    }

    return { startDateStr: start, endDateStr: end, durationLabel: label };
  }, [durationMode, customStartDate, todayLocalStr]);

  // Persist Selected Muscles
  useEffect(() => {
    localStorage.setItem('stryvon_telemetry_upper', JSON.stringify(upperMuscles));
  }, [upperMuscles]);

  useEffect(() => {
    localStorage.setItem('stryvon_telemetry_lower', JSON.stringify(lowerMuscles));
  }, [lowerMuscles]);

  // Fetch Telemetry Data from Backend
  const fetchTelemetry = useCallback(async () => {
    setFetching(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const allMuscles = Array.from(new Set([...upperMuscles, ...lowerMuscles].map(m => m.toLowerCase())));

      const url = `${apiUrl}/progress/telemetry?startDate=${encodeURIComponent(startDateStr)}&endDate=${encodeURIComponent(endDateStr)}&muscles=${encodeURIComponent(allMuscles.join(','))}`;
      
      const response = await fetch(url, { headers });
      const data = await response.json();

      if (response.ok && data.telemetry) {
        setTelemetryCounts(data.telemetry);
      }
    } catch (err) {
      console.error('Failed to fetch telemetry data:', err);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [apiUrl, token, startDateStr, endDateStr, upperMuscles, lowerMuscles]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  // Upper Body Radar Data
  const upperRadarData = useMemo(() => {
    return upperMuscles.map(m => {
      const count = telemetryCounts[m.toLowerCase()] || 0;
      return {
        subject: m.toUpperCase(),
        sessions: count,
        fullMark: 20
      };
    });
  }, [upperMuscles, telemetryCounts]);

  // Lower Body Radar Data
  const lowerRadarData = useMemo(() => {
    return lowerMuscles.map(m => {
      const count = telemetryCounts[m.toLowerCase()] || 0;
      return {
        subject: m.toUpperCase(),
        sessions: count,
        fullMark: 20
      };
    });
  }, [lowerMuscles, telemetryCounts]);

  // Handlers for Add/Remove Upper Muscles
  const handleAddUpperMuscle = (muscle) => {
    if (!upperMuscles.includes(muscle)) {
      setUpperMuscles(prev => [...prev, muscle]);
    }
    setShowUpperPicker(false);
  };

  const handleRemoveUpperMuscle = (muscle) => {
    setUpperMuscles(prev => prev.filter(m => m !== muscle));
  };

  // Handlers for Add/Remove Lower Muscles
  const handleAddLowerMuscle = (muscle) => {
    if (!lowerMuscles.includes(muscle)) {
      setLowerMuscles(prev => [...prev, muscle]);
    }
    setShowLowerPicker(false);
  };

  const handleRemoveLowerMuscle = (muscle) => {
    setLowerMuscles(prev => prev.filter(m => m !== muscle));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 pb-12 text-white"
    >
      {/* Header & Page Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#474747]/30 pb-4">
        <div>
          <h1 className="text-3xl font-display font-black text-white uppercase tracking-wider flex items-center gap-3">
            <Activity className="text-[#D4FF00]" size={32} />
            MUSCLE TELEMETRY
          </h1>
          <p className="text-[#E5E5E5]/70 text-xs sm:text-sm mt-1 font-medium">
            {durationLabel}
          </p>
        </div>

        {/* 4 Preset Duration Controls (30D, 60D, 90D, Custom) */}
        <div className="flex flex-wrap items-center gap-2 bg-[#1E1E1E] p-1.5 rounded-2xl border border-[#474747]/40 w-full sm:w-auto">
          {['30D', '60D', '90D', 'Custom'].map((mode) => (
            <button
              key={mode}
              onClick={() => setDurationMode(mode)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer min-h-[44px] ${
                durationMode === mode
                  ? 'bg-[#D4FF00] text-black shadow-md font-extrabold'
                  : 'text-[#E5E5E5]/70 hover:text-white hover:bg-[#0A0A0A]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Start Date Picker (Only visible when 'Custom' is selected) */}
      <AnimatePresence>
        {durationMode === 'Custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#1E1E1E] border border-[#D4FF00]/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2 text-xs text-[#D4FF00] font-bold font-display uppercase tracking-wider">
              <Calendar size={18} />
              <span>CUSTOM DATE RANGE (START DATE TO TODAY)</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs text-slate-400 font-bold uppercase font-display">Start Date:</label>
              <input
                type="date"
                max={todayLocalStr}
                value={customStartDate}
                onChange={(e) => {
                  if (e.target.value && e.target.value <= todayLocalStr) {
                    setCustomStartDate(e.target.value);
                  }
                }}
                className="bg-[#0A0A0A] border border-[#474747] text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4FF00] font-bold"
              />
              <span className="text-xs text-slate-400 font-bold font-display uppercase">End: Today ({todayLocalStr})</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay State */}
      <div className={`transition-opacity duration-300 ${fetching ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        
        {/* Two Side-by-Side Radar Charts (Upper & Lower) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 1. UPPER BODY RADAR CARD */}
          <div className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg space-y-4 flex flex-col justify-between relative">
            <div>
              {/* Card Header & Add Muscle Button */}
              <div className="flex justify-between items-center pb-3 border-b border-[#474747]/30">
                <div>
                  <h2 className="font-display text-xl font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    UPPER BODY RADAR
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Session activation volume distribution</p>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowUpperPicker(!showUpperPicker)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#0A0A0A] hover:bg-[#262626] text-[#D4FF00] border border-[#D4FF00]/40 rounded-xl text-xs font-bold font-display uppercase tracking-wider cursor-pointer transition-all min-h-[44px]"
                  >
                    <Plus size={16} /> + Add Muscle
                  </button>

                  {/* Upper Body Muscle Picker Dropdown */}
                  {showUpperPicker && (
                    <div className="absolute right-0 mt-2 z-30 w-52 bg-[#0A0A0A] border border-[#474747] rounded-2xl p-2 shadow-2xl space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase font-display px-2.5 py-1 border-b border-[#474747]/30">
                        Upper Body Presets
                      </div>
                      {UPPER_BODY_PRESETS.map((m) => {
                        const isSelected = upperMuscles.includes(m);
                        return (
                          <button
                            key={m}
                            disabled={isSelected}
                            onClick={() => handleAddUpperMuscle(m)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold font-display uppercase transition-all flex justify-between items-center ${
                              isSelected
                                ? 'bg-[#1E1E1E] text-slate-500 cursor-not-allowed opacity-50'
                                : 'hover:bg-[#1E1E1E] text-white cursor-pointer'
                            }`}
                          >
                            <span>{m}</span>
                            {isSelected && <span className="text-[10px] text-[#D4FF00]">ADDED</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Tag Chips for Upper Body Muscles */}
              <div className="flex flex-wrap gap-2 pt-3 pb-1 min-h-[44px]">
                {upperMuscles.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1.5 bg-[#0A0A0A] text-[#D4FF00] border border-[#D4FF00]/40 px-3 py-1 rounded-xl text-xs font-extrabold font-display uppercase tracking-wider"
                  >
                    {m}
                    <button
                      onClick={() => handleRemoveUpperMuscle(m)}
                      className="hover:text-rose-400 p-0.5 rounded cursor-pointer transition-colors"
                      title={`Remove ${m}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Upper Body Radar Chart or Empty State */}
            <div className="h-80 w-full pt-2 flex items-center justify-center">
              {upperMuscles.length === 0 ? (
                <div className="text-center py-16 space-y-2 border border-dashed border-[#474747]/40 rounded-2xl w-full bg-[#0A0A0A]/50">
                  <Info size={32} className="mx-auto text-slate-500" />
                  <p className="text-xs font-bold text-slate-400 font-display uppercase">Add a muscle to start tracking</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <RadarChart data={upperRadarData}>
                    <PolarGrid stroke="#3A3A3A" />
                    <PolarAngleAxis dataKey="subject" stroke="#E5E5E5" tick={{ fill: '#E5E5E5', fontSize: 11, fontWeight: 700 }} />
                    <PolarRadiusAxis domain={[0, 'dataMax + 2']} stroke="#3A3A3A" tick={false} axisLine={false} />
                    <Radar
                      name="Sessions Logged"
                      dataKey="sessions"
                      stroke="#D4FF00"
                      fill="#D4FF00"
                      fillOpacity={0.35}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* 2. LOWER BODY RADAR CARD */}
          <div className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg space-y-4 flex flex-col justify-between relative">
            <div>
              {/* Card Header & Add Muscle Button */}
              <div className="flex justify-between items-center pb-3 border-b border-[#474747]/30">
                <div>
                  <h2 className="font-display text-xl font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    LOWER BODY RADAR
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Leg & posterior chain session frequency</p>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowLowerPicker(!showLowerPicker)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#0A0A0A] hover:bg-[#262626] text-[#D4FF00] border border-[#D4FF00]/40 rounded-xl text-xs font-bold font-display uppercase tracking-wider cursor-pointer transition-all min-h-[44px]"
                  >
                    <Plus size={16} /> + Add Muscle
                  </button>

                  {/* Lower Body Muscle Picker Dropdown */}
                  {showLowerPicker && (
                    <div className="absolute right-0 mt-2 z-30 w-52 bg-[#0A0A0A] border border-[#474747] rounded-2xl p-2 shadow-2xl space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase font-display px-2.5 py-1 border-b border-[#474747]/30">
                        Lower Body Presets
                      </div>
                      {LOWER_BODY_PRESETS.map((m) => {
                        const isSelected = lowerMuscles.includes(m);
                        return (
                          <button
                            key={m}
                            disabled={isSelected}
                            onClick={() => handleAddLowerMuscle(m)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold font-display uppercase transition-all flex justify-between items-center ${
                              isSelected
                                ? 'bg-[#1E1E1E] text-slate-500 cursor-not-allowed opacity-50'
                                : 'hover:bg-[#1E1E1E] text-white cursor-pointer'
                            }`}
                          >
                            <span>{m}</span>
                            {isSelected && <span className="text-[10px] text-[#D4FF00]">ADDED</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Tag Chips for Lower Body Muscles */}
              <div className="flex flex-wrap gap-2 pt-3 pb-1 min-h-[44px]">
                {lowerMuscles.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1.5 bg-[#0A0A0A] text-[#D4FF00] border border-[#D4FF00]/40 px-3 py-1 rounded-xl text-xs font-extrabold font-display uppercase tracking-wider"
                  >
                    {m}
                    <button
                      onClick={() => handleRemoveLowerMuscle(m)}
                      className="hover:text-rose-400 p-0.5 rounded cursor-pointer transition-colors"
                      title={`Remove ${m}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Lower Body Radar Chart or Empty State */}
            <div className="h-80 w-full pt-2 flex items-center justify-center">
              {lowerMuscles.length === 0 ? (
                <div className="text-center py-16 space-y-2 border border-dashed border-[#474747]/40 rounded-2xl w-full bg-[#0A0A0A]/50">
                  <Info size={32} className="mx-auto text-slate-500" />
                  <p className="text-xs font-bold text-slate-400 font-display uppercase">Add a muscle to start tracking</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <RadarChart data={lowerRadarData}>
                    <PolarGrid stroke="#3A3A3A" />
                    <PolarAngleAxis dataKey="subject" stroke="#E5E5E5" tick={{ fill: '#E5E5E5', fontSize: 11, fontWeight: 700 }} />
                    <PolarRadiusAxis domain={[0, 'dataMax + 2']} stroke="#3A3A3A" tick={false} axisLine={false} />
                    <Radar
                      name="Sessions Logged"
                      dataKey="sessions"
                      stroke="#D4FF00"
                      fill="#D4FF00"
                      fillOpacity={0.35}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
