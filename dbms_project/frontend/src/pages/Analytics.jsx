import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  TrendingUp, 
  Scale, 
  Flame, 
  FileText, 
  Calendar, 
  Award, 
  Check, 
  Activity,
  BarChart2,
  Bot
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';
import { motion } from 'framer-motion';

export default function Analytics({ apiUrl, token, user }) {
  const outletContext = useOutletContext();
  const onOpenStreakModal = outletContext?.onOpenStreakModal;

  const [analytics, setAnalytics] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [loading, setLoading] = useState(true);

  // Form states
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [logSuccess, setLogSuccess] = useState(false);
  const [logError, setLogError] = useState('');

  const activeGoal = analytics?.user?.goal_type || user?.goal_type || 'Maintain';

  // Format weight logs for graph display with goal-aware status and delta evaluation
  const chartWeightData = React.useMemo(() => {
    if (!analytics?.weightLogs || analytics.weightLogs.length === 0) return [];

    const rawLogs = [...analytics.weightLogs].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
    const goalLower = activeGoal.toLowerCase();

    // If only 1 log exists, generate a baseline point for yesterday
    let processedLogs = rawLogs;
    if (rawLogs.length === 1) {
      const single = rawLogs[0];
      const singleDate = new Date(single.recorded_at);
      const prevDate = new Date(singleDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      processedLogs = [{ ...single, recorded_at: prevDateStr, isBaselinePadding: true }, single];
    }

    return processedLogs.map((log, idx) => {
      const prev = idx > 0 ? processedLogs[idx - 1] : null;
      const delta = prev ? parseFloat((log.weight - prev.weight).toFixed(2)) : 0;

      let status = 'initial';
      let color = '#D4FF00'; // Default Neon Green

      if (idx > 0) {
        if (goalLower.includes('fat') || goalLower.includes('cut') || goalLower.includes('loss')) {
          // Fat Loss: weight decrease (delta < 0) or no change (delta === 0) is favorable
          status = delta <= 0 ? 'on-track' : 'off-track';
        } else if (goalLower.includes('muscle') || goalLower.includes('bulk') || goalLower.includes('gain')) {
          // Muscle Gain: weight increase (delta > 0) or no change (delta === 0) is favorable
          status = delta >= 0 ? 'on-track' : 'off-track';
        } else {
          // Maintain: within ±0.3 kg is favorable, beyond that is unfavorable
          status = Math.abs(delta) <= 0.3 ? 'on-track' : 'off-track';
        }
        color = status === 'on-track' ? '#D4FF00' : '#f43f5e';
      }

      return {
        ...log,
        index: idx,
        delta,
        status,
        color
      };
    });
  }, [analytics?.weightLogs, activeGoal]);

  // Goal-aware custom dot renderer
  const renderGoalDot = (props) => {
    const { cx, cy, payload, index } = props;
    if (!cx || !cy) return null;
    const dotColor = payload.color || '#D4FF00';
    const isOffTrack = payload.status === 'off-track';

    return (
      <g key={`goal-dot-${index}-${payload.recorded_at}`}>
        {isOffTrack && (
          <circle cx={cx} cy={cy} r={9} fill="#f43f5e" opacity={0.3} className="animate-pulse" />
        )}
        <circle
          cx={cx}
          cy={cy}
          r={5.5}
          fill={dotColor}
          stroke="#0A0A0A"
          strokeWidth={2}
        />
      </g>
    );
  };

  // Custom Rich Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dateStr = new Date(data.recorded_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      const deltaStr = data.index === 0 || data.isBaselinePadding 
        ? 'Baseline' 
        : `${data.delta > 0 ? '+' : ''}${data.delta} kg`;

      let statusLabel = 'Initial Log';
      let statusClass = 'text-[#D4FF00] font-bold';

      if (data.index > 0 && !data.isBaselinePadding) {
        if (data.status === 'on-track') {
          statusLabel = 'On Track';
          statusClass = 'text-[#D4FF00] font-bold flex items-center gap-1';
        } else {
          statusLabel = 'Off Track';
          statusClass = 'text-rose-400 font-bold flex items-center gap-1';
        }
      }

      return (
        <div className="bg-[#0A0A0A] border border-[#474747] p-3.5 rounded-2xl shadow-2xl text-xs space-y-1.5 min-w-[180px]">
          <div className="text-slate-400 font-bold font-display uppercase text-[10px] tracking-wider border-b border-[#474747]/40 pb-1 flex justify-between items-center">
            <span>{dateStr}</span>
            <span className="text-[#D4FF00] font-extrabold">{activeGoal}</span>
          </div>
          <div className="text-white font-extrabold text-sm flex items-center justify-between">
            <span>Weight:</span>
            <span className="text-[#D4FF00] font-display">{data.weight} kg</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#474747]/30">
            <span className="text-slate-300">Change: {deltaStr}</span>
            <span className={statusClass}>{statusLabel}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const fetchAnalytics = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Overview telemetry
      const response = await fetch(`${apiUrl}/progress/analytics`, { headers });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics || data);
      }

      // PDF report payload
      const pdfRes = await fetch(`${apiUrl}/progress/pdf-export`, { headers });
      if (pdfRes.ok) {
        const pData = await pdfRes.json();
        setPdfData(pData);
      }

      // Live AI Summary Advice
      const aiRes = await fetch(`${apiUrl}/ai/weekly-summary`, { headers });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        if (aiData.summary || aiData.insight) {
          setAiSummary(aiData.summary || aiData.insight);
        }
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  const handleWeightSubmit = async (e) => {
    e.preventDefault();
    setLogError('');
    setLogSuccess(false);

    try {
      const response = await fetch(`${apiUrl}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          weight: parseFloat(weight),
          body_fat: bodyFat ? parseFloat(bodyFat) : 0
        })
      });

      if (response.ok) {
        setWeight('');
        setBodyFat('');
        setLogSuccess(true);
        setTimeout(() => setLogSuccess(false), 3000);
        await fetchAnalytics();
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update progress.');
      }
    } catch (err) {
      setLogError(err.message);
    }
  };

  const handleExportPdf = () => {
    if (!pdfData) return;
    
    const userName = pdfData.user?.name || user?.name || user?.username || 'Member';
    const primaryGoal = pdfData.stats?.goalType || pdfData.user?.goal_type || user?.goal_type || 'Maintain & Tone';
    const currentWeightStr = pdfData.stats?.currentWeight || (user?.weight ? `${user.weight} kg` : 'N/A');
    const bmiStr = pdfData.stats?.bmi || 'N/A';
    const totalWorkoutsVal = pdfData.stats?.totalWorkouts ?? analytics?.totalWorkouts ?? 0;
    const currentStreakVal = pdfData.stats?.currentStreak ?? user?.current_streak ?? user?.streak_count ?? 0;
    const muscleMap = pdfData.muscleTelemetry || {};
    const historyList = pdfData.weightHistory || analytics?.weightLogs || [];

    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>STRYVON Telemetry Report — ${userName}</title>
          <style>
            * { box-sizing: border-box; font-family: 'Helvetica Neue', Arial, sans-serif; }
            body { background: #ffffff; color: #0f172a; margin: 0; padding: 40px; line-height: 1.5; }
            .header-bar { display: flex; justify-content: space-between; items-center; border-bottom: 3px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
            .brand { font-size: 28px; font-weight: 900; letter-spacing: 2px; color: #0f172a; }
            .brand span { color: #84cc16; }
            .title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #475569; text-align: right; }
            .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px; font-size: 13px; }
            .meta-item strong { display: block; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
            .ai-callout { background: #f0fdf4; border: 1.5px solid #84cc16; border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 13px; color: #166534; }
            .ai-callout h4 { margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; color: #15803d; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
            .stat-card { background: #f1f5f9; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; }
            .stat-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }
            .stat-val { font-size: 22px; font-weight: 900; color: #0f172a; margin-top: 6px; }
            h3 { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; margin: 24px 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
            .muscle-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
            .muscle-item { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 10px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #f8fafc; font-weight: 800; color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
            .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; font-weight: 700; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div class="brand">STRYVON <span>FITNESS</span></div>
            <div class="title">Telemetry Progress Report<br><small style="font-size: 10px; color: #94a3b8;">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</small></div>
          </div>

          <div class="meta-grid">
            <div class="meta-item"><strong>Member Name</strong> ${userName}</div>
            <div class="meta-item"><strong>Primary Fitness Goal</strong> ${primaryGoal}</div>
            <div class="meta-item"><strong>Report Generated</strong> ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="ai-callout">
            <h4>AI Performance & Progress Review</h4>
            <div>${aiSummary || `Member has completed ${totalWorkoutsVal} workout sessions with an active ${currentStreakVal}-day training streak. Body metrics remain aligned with target goal (${primaryGoal}).`}</div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Total Workouts</div>
              <div class="stat-val">${totalWorkoutsVal}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Active Streak</div>
              <div class="stat-val">${currentStreakVal} Days</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Current Weight</div>
              <div class="stat-val">${currentWeightStr}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">BMI Score</div>
              <div class="stat-val">${bmiStr}</div>
            </div>
          </div>

          <h3>Muscle Group Training Volume (Last 30 Days)</h3>
          <div class="muscle-list">
            ${Object.keys(muscleMap).map(m => `
              <div class="muscle-item">
                <span style="text-transform: capitalize;">${m}</span>
                <span style="color: #84cc16;">${muscleMap[m]} Sessions</span>
              </div>
            `).join('')}
          </div>

          <h3>Recent Weight Telemetry Logs</h3>
          <table>
            <thead>
              <tr>
                <th>Recorded Date</th>
                <th>Weight (kg)</th>
                <th>Calculated BMI</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              ${historyList.slice(-10).map(row => `
                <tr>
                  <td>${new Date(row.recorded_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td><strong>${row.weight} kg</strong></td>
                  <td>${row.bmi || 'N/A'}</td>
                  <td style="text-transform: uppercase; font-size: 10px; color: #64748b;">${row.source || 'manual'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            STRYVON FITNESS — PERFORM. PUSH. PROGRESS.
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 border-4 border-[#D4FF00] border-t-transparent rounded-full animate-spin"></div>
        <span className="font-display text-sm text-[#D4FF00] tracking-widest uppercase">Loading Analytics Telemetry...</span>
      </div>
    );
  }

  const COLORS = ['#D4FF00', '#38bdf8', '#a78bfa', '#fb7185', '#fb923c', '#4adede'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 text-white"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-4xl font-black text-white tracking-widest uppercase">PROGRESS & ANALYTICS</h1>
          <p className="text-[#E5E5E5]/70 text-xs sm:text-sm mt-1 font-medium">Review weight trends, caloric ratios, training muscle group charts, and export reports.</p>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={!pdfData}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#D4FF00] hover:bg-[#b8de00] text-black font-display font-bold px-5 py-3 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50 min-h-[44px]"
        >
          <FileText size={16} />
          Export PDF Report
        </button>
      </div>

      {/* Weight logger + stats Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weight Logger Form */}
        <div className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-white flex items-center gap-2 mb-2 uppercase tracking-wider">
              <Scale size={20} className="text-[#D4FF00]" />
              Update Daily Weight
            </h3>
            <p className="text-xs text-[#E5E5E5]/60 mb-5 leading-relaxed">Submit your weight daily to update graphs and recalculate your BMI.</p>
          </div>

          <form onSubmit={handleWeightSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-widest font-display">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g. 74.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#474747] text-white rounded-xl py-2.5 sm:py-3 px-4 text-sm focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
              />
            </div>
            <div>
              <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-widest font-display">Body Fat % (Optional)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 14.5"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#474747] text-white rounded-xl py-2.5 sm:py-3 px-4 text-sm focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
              />
            </div>

            {logError && (
              <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-xs font-bold border border-red-500/20">
                {logError}
              </div>
            )}

            {logSuccess && (
              <div className="bg-[#D4FF00]/10 text-[#D4FF00] p-3 rounded-xl text-xs font-bold border border-[#D4FF00]/20 flex items-center gap-1.5 font-display uppercase tracking-wider">
                <Check size={16} /> Progress metric saved!
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#D4FF00] hover:bg-[#b8de00] text-black font-display font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-all shadow-md cursor-pointer min-h-[44px]"
            >
              Log Metrics
            </button>
          </form>
        </div>

        {/* Quick Performance Indicators */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg flex flex-col justify-between">
            <span className="text-xs font-display font-bold text-[#E5E5E5]/60 uppercase tracking-widest">Total Workouts Completed</span>
            <div className="my-4">
              <span className="font-display text-5xl font-black text-white">{analytics?.totalWorkouts || 0}</span>
              <p className="text-xs text-[#E5E5E5]/50 mt-1">Sessions recorded in history</p>
            </div>
            <span className="text-xs font-display font-bold text-[#D4FF00] bg-[#D4FF00]/10 border border-[#D4FF00]/20 px-3 py-1 rounded-full w-fit">
              Active Routine
            </span>
          </div>

          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={onOpenStreakModal}
            className="bg-[#1E1E1E] border border-[#474747]/40 hover:border-orange-500/50 hover:bg-[#232323] p-6 rounded-3xl shadow-lg flex flex-col justify-between cursor-pointer transition-all group"
            title="Click to view Streak Calendar"
          >
            {(() => {
              const currentStreak = analytics?.user?.current_streak ?? analytics?.user?.streak_count ?? user?.current_streak ?? user?.streak_count ?? 0;
              const isStreakActive = currentStreak > 0;
              return (
                <>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-display font-bold text-[#E5E5E5]/60 group-hover:text-white uppercase tracking-widest transition-colors">WORKOUT STREAK</span>
                    <div className="flex items-center gap-2">
                      <Flame size={28} className={isStreakActive ? "text-orange-500 fill-orange-500 animate-pulse" : "text-slate-500 fill-slate-500"} />
                      <span className={`font-display text-4xl font-black ${isStreakActive ? "text-white" : "text-slate-400"}`}>
                        {currentStreak}
                      </span>
                    </div>
                  </div>
                  <div className="my-3">
                    <p className="text-xs text-[#E5E5E5]/50">Consecutive training sessions</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-display font-bold px-3 py-1 rounded-full w-fit ${isStreakActive ? "text-amber-400 bg-amber-500/10 border border-amber-500/20" : "text-slate-400 bg-slate-500/10 border border-slate-500/20"}`}>
                      {isStreakActive ? "HIGH ENERGY" : "STREAK INACTIVE"}
                    </span>
                    <span className="text-[11px] font-display font-bold text-orange-400 group-hover:underline uppercase tracking-wider">
                      View Calendar →
                    </span>
                  </div>
                </>
              );
            })()}
          </motion.div>
        </div>
      </div>

      {/* Weight History Chart */}
      <div className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#474747]/30 pb-4">
          <div>
            <h3 className="font-display text-xl font-bold text-white uppercase tracking-wider">Weight Trend Over Time</h3>
            <p className="text-xs text-[#E5E5E5]/60 mt-0.5">Historical record of body weight measurements ({chartWeightData.length} logs)</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-[#0A0A0A] px-4 py-2 rounded-2xl border border-[#474747]/40 text-xs font-display font-bold uppercase tracking-wider shrink-0">
            <span className="text-slate-400">Goal: <strong className="text-white">{activeGoal}</strong></span>
            <div className="h-3 w-[1px] bg-[#474747]" />
            <div className="flex items-center gap-1.5 text-[#D4FF00]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D4FF00] inline-block shadow-[0_0_6px_#D4FF00]" />
              <span>On Track</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f43f5e] inline-block shadow-[0_0_6px_#f43f5e]" />
              <span>Off Track</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full min-w-0 min-h-0 pt-2">
          {chartWeightData && chartWeightData.length > 0 ? (() => {
            const latestPoint = chartWeightData[chartWeightData.length - 1];
            const isLatestOffTrack = latestPoint?.status === 'off-track';
            const primaryChartColor = isLatestOffTrack ? '#f43f5e' : '#D4FF00';

            return (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={chartWeightData}>
                  <defs>
                    {/* Area fill vertical gradient */}
                    <linearGradient id="weightAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={primaryChartColor} stopOpacity={0.35}/>
                      <stop offset="95%" stopColor={primaryChartColor} stopOpacity={0.0}/>
                    </linearGradient>

                    {/* Dynamic line stroke horizontal gradient across data points */}
                    <linearGradient id="weightLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      {chartWeightData.map((pt, i) => {
                        const pct = chartWeightData.length > 1 ? (i / (chartWeightData.length - 1)) * 100 : 0;
                        return (
                          <stop key={`line-stop-${i}`} offset={`${pct}%`} stopColor={pt.color || '#D4FF00'} />
                        );
                      })}
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#474747" opacity={0.3} />
                  <XAxis 
                    dataKey="recorded_at" 
                    stroke="#E5E5E5" 
                    fontSize={11} 
                    tickFormatter={(str) => {
                      try {
                        return new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      } catch (e) {
                        return str;
                      }
                    }} 
                  />
                  <YAxis stroke="#E5E5E5" fontSize={11} domain={['dataMin - 1.5', 'dataMax + 1.5']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="url(#weightLineGradient)" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#weightAreaGradient)" 
                    dot={renderGoalDot} 
                    activeDot={{ r: 8, stroke: primaryChartColor, strokeWidth: 2, fill: '#0A0A0A' }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            );
          })() : (
            <div className="h-full flex items-center justify-center text-xs text-[#E5E5E5]/40 font-display uppercase tracking-wider">
              No weight logs recorded yet. Submit your weight using the form above!
            </div>
          )}
        </div>
      </div>

      {/* Live AI Progress & Recovery Advice Card */}
      {aiSummary && (
        <div className="bg-gradient-to-br from-[#1E1E1E] to-[#0A0A0A] border-2 border-[#D4FF00]/50 p-6 rounded-3xl shadow-xl space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#474747]/30">
            <div className="p-2 bg-[#D4FF00] text-black rounded-xl font-bold flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white uppercase">LIVE AI PROGRESS ANALYSIS</h3>
              <p className="text-xs text-slate-400">Automated performance & macro balance review</p>
            </div>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line font-sans pt-1">
            {aiSummary}
          </p>
        </div>
      )}
    </motion.div>
  );
}
