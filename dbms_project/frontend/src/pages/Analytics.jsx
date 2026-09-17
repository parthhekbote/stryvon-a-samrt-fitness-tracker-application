import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Scale, 
  Flame, 
  FileText, 
  Calendar, 
  Award, 
  Check, 
  Activity,
  BarChart2
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';
import { motion } from 'framer-motion';

export default function Analytics({ apiUrl, token }) {
  const [analytics, setAnalytics] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [logSuccess, setLogSuccess] = useState(false);
  const [logError, setLogError] = useState('');

  const fetchAnalytics = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Overview telemetry
      const response = await fetch(`${apiUrl}/progress/analytics`, { headers });
      const data = await response.json();
      if (response.ok) setAnalytics(data.analytics || data);

      // PDF report payload
      const pdfRes = await fetch(`${apiUrl}/progress/pdf-export`, { headers });
      const pData = await pdfRes.json();
      if (pdfRes.ok) setPdfData(pData);

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
    
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <html>
        <head>
          <title>STRYVON Health Progress Report</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; margin: 40px; line-height: 1.6; }
            h1 { color: #84cc16; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; font-size: 28px; letter-spacing: 2px; }
            h2 { color: #475569; font-size: 20px; margin-top: 30px; }
            .user-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
            .metric-box { font-weight: bold; font-size: 14px; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .stat-card { background: #f1f5f9; padding: 15px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0; }
            .stat-val { font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #f8fafc; font-weight: 700; color: #475569; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <h1>STRYVON Progress Report</h1>
          <div class="user-info">
            <div>
              <div class="metric-box">Name: ${pdfData.user?.name || 'N/A'}</div>
              <div class="metric-box">Target Goal: ${pdfData.user?.goal_type || 'N/A'}</div>
            </div>
            <div>
              <div class="metric-box">Generated Date: ${new Date().toLocaleDateString()}</div>
              <div class="metric-box">Current Streak: ${pdfData.user?.streak_count || 0} Days</div>
            </div>
          </div>

          <h2>Summary Statistics</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div>Total Workouts Logged</div>
              <div class="stat-val">${pdfData.stats?.total_workouts || 0}</div>
            </div>
            <div class="stat-card">
              <div>Total Calories Burned</div>
              <div class="stat-val">${pdfData.stats?.total_calories_burned || 0} kcal</div>
            </div>
            <div class="stat-card">
              <div>Latest Recorded Weight</div>
              <div class="stat-val">${pdfData.stats?.latest_weight ? pdfData.stats.latest_weight + ' kg' : 'N/A'}</div>
            </div>
          </div>

          <h2>Recent Weight Telemetry Logs</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Weight</th>
                <th>Calculated BMI</th>
              </tr>
            </thead>
            <tbody>
              ${(pdfData.weightHistory || []).map(row => `
                <tr>
                  <td>${new Date(row.recorded_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td>${row.weight} kg</td>
                  <td>${row.bmi}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            STRYVON Fitness — PERFORM. PUSH. PROGRESS.
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

          <div className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg flex flex-col justify-between">
            <span className="text-xs font-display font-bold text-[#E5E5E5]/60 uppercase tracking-widest">Total Workout Calories Burned</span>
            <div className="my-4">
              <span className="font-display text-5xl font-black text-[#D4FF00]">{analytics?.totalCaloriesBurned || 0}</span>
              <p className="text-xs text-[#E5E5E5]/50 mt-1">Estimated kcal burned from sessions</p>
            </div>
            <span className="text-xs font-display font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full w-fit">
              High Energy
            </span>
          </div>
        </div>
      </div>

      {/* Weight History Chart */}
      <div className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-display text-xl font-bold text-white uppercase tracking-wider">Weight Trend Over Time</h3>
            <p className="text-xs text-[#E5E5E5]/60 mt-0.5">Historical record of body weight measurements</p>
          </div>
          <span className="px-3 py-1 bg-[#0A0A0A] border border-[#474747]/40 text-[#D4FF00] font-display font-bold text-xs rounded-full uppercase tracking-wider">
            Weight Graph
          </span>
        </div>

        <div className="h-64 w-full min-w-0 min-h-0">
          {analytics?.weightLogs && analytics.weightLogs.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={analytics.weightLogs}>
                <CartesianGrid strokeDasharray="3 3" stroke="#474747" opacity={0.3} />
                <XAxis dataKey="recorded_at" stroke="#E5E5E5" fontSize={11} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                <YAxis stroke="#E5E5E5" fontSize={11} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', borderColor: '#474747', borderRadius: '12px', color: '#FFF' }} />
                <Line type="monotone" dataKey="weight" stroke="#D4FF00" strokeWidth={3} dot={{ fill: '#D4FF00', r: 5 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[#E5E5E5]/40 font-display uppercase tracking-wider">
              No weight logs recorded yet. Submit your weight using the form above!
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
