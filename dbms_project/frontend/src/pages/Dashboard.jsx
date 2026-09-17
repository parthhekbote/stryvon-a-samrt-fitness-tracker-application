import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Flame, 
  TrendingUp, 
  Utensils, 
  Droplet, 
  Award, 
  Heart, 
  Scale, 
  Plus, 
  Zap, 
  Bot, 
  Check 
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Dashboard({ apiUrl, token, user }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [mealTotals, setMealTotals] = useState({ total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0 });
  const [waterLogged, setWaterLogged] = useState(0);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch Profile
      const profRes = await fetch(`${apiUrl}/auth/profile`, { headers });
      const profData = await profRes.json();
      if (profRes.ok) setProfile(profData.profile);

      // Fetch Today's Meals
      const mealRes = await fetch(`${apiUrl}/diet/meals`, { headers });
      const mealData = await mealRes.json();
      if (mealRes.ok) setMealTotals(mealData.totals);

      // Fetch Today's Water
      const waterRes = await fetch(`${apiUrl}/diet/water`, { headers });
      const waterData = await waterRes.json();
      if (waterRes.ok) setWaterLogged(waterData.water_logged_ml || Number(waterData.total_water_ml) || 0);

      // Fetch Analytics (for weight logs chart)
      const anaRes = await fetch(`${apiUrl}/progress/analytics`, { headers });
      if (anaRes.ok) {
        const anaData = await anaRes.json();
        setAnalytics(anaData.analytics || anaData);
      }

    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch AI Coach summary
  const fetchAISummary = async () => {
    setAiLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${apiUrl}/ai/weekly-summary`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.insight || data.summary || '');
      }
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setProfile(null);
    setMealTotals({ total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0 });
    setWaterLogged(0);
    setAnalytics(null);
    setAiSummary('');
    fetchDashboardData();
    fetchAISummary();
  }, [apiUrl, token]);

  const handleLogWater = async (amountMl) => {
    try {
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const newWater = waterLogged + amountMl;
      const res = await fetch(`${apiUrl}/diet/water`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount_ml: newWater })
      });
      if (res.ok) {
        setWaterLogged(newWater);
      }
    } catch (err) {
      console.error('Error logging water:', err);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 border-4 border-[#D4FF00] border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 bg-[#D4FF00]/20 rounded-full blur-lg animate-pulse"></div>
        </div>
        <span className="font-display text-sm tracking-widest text-[#D4FF00] uppercase">Compiling Dashboard Telemetry...</span>
      </div>
    );
  }

  // Calculate BMI category
  const bmi = profile?.bmi || null;
  let bmiCategory = 'NOT SET';
  let bmiColor = 'text-[#474747]';
  if (bmi) {
    if (bmi < 18.5) {
      bmiCategory = 'Underweight';
      bmiColor = 'text-yellow-400';
    } else if (bmi >= 18.5 && bmi < 25) {
      bmiCategory = 'Healthy';
      bmiColor = 'text-[#D4FF00]';
    } else if (bmi >= 25 && bmi < 30) {
      bmiCategory = 'Overweight';
      bmiColor = 'text-orange-400';
    } else if (bmi >= 30) {
      bmiCategory = 'Obese';
      bmiColor = 'text-rose-400';
    }
  }

  const isNew = user?.isNewUser || profile?.isNewUser;
  const displayName = profile?.name || user?.name || 'USER';

  // Calorie progress percentage
  const calorieGoal = profile?.current_diet_id ? (profile.goal_type === 'Fat Loss' ? 1700 : profile.goal_type === 'Muscle Gain' ? 2800 : 2000) : 2000;
  const calPercent = Math.min(Math.round((mealTotals?.total_calories || 0) / calorieGoal * 100), 100);

  // Water progress percentage
  const waterGoal = profile?.water_goal_ml || 2000;
  const waterPercent = Math.min(Math.round(waterLogged / waterGoal * 100), 100);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Top Banner */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight text-white uppercase">
            {isNew ? 'WELCOME,' : 'WELCOME BACK,'} <span className="text-[#D4FF00] animate-shimmer-text">{displayName}</span>
          </h1>
          <p className="text-[#E5E5E5]/70 text-xs mt-1 font-medium">
            Here's a snapshot of your physical health parameters and daily consistency goals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {profile?.streak_count > 0 && (
            <motion.div 
              whileHover={{ scale: 1.05 }}
              animate={{ boxShadow: ['0 0 10px rgba(212,255,0,0.2)', '0 0 20px rgba(212,255,0,0.5)', '0 0 10px rgba(212,255,0,0.2)'] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-2 bg-[#1E1E1E] text-[#D4FF00] border border-[#474747]/50 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider font-display cursor-pointer"
            >
              <Flame size={16} className="fill-[#D4FF00] animate-pulse" />
              <span>{profile.streak_count} DAY STREAK</span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Grid: 4 Core Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Weight Card */}
        <motion.div 
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4FF00]/5 rounded-full blur-2xl group-hover:bg-[#D4FF00]/15 transition-all duration-500" />
          <div className="flex justify-between items-center mb-4">
            <span className="text-[11px] font-extrabold text-[#474747] uppercase tracking-widest font-display">CURRENT WEIGHT</span>
            <div className="p-2.5 bg-[#D4FF00]/10 text-[#D4FF00] rounded-2xl group-hover:scale-110 transition-transform">
              <Scale size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-black text-white">{profile?.weight ? profile.weight : '0'}</span>
            <span className="text-xs font-bold text-[#474747]">kg</span>
          </div>
          <p className="text-xs text-[#E5E5E5]/60 mt-3 font-semibold">
            Target: <span className="text-[#D4FF00] font-bold">{profile?.goal_type || 'Maintain'}</span>
          </p>
        </motion.div>

        {/* Calories Consumed Card */}
        <motion.div 
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4FF00]/5 rounded-full blur-2xl group-hover:bg-[#D4FF00]/15 transition-all duration-500" />
          <div className="flex justify-between items-center mb-4">
            <span className="text-[11px] font-extrabold text-[#474747] uppercase tracking-widest font-display">CALORIES CONSUMED</span>
            <div className="p-2.5 bg-[#D4FF00]/10 text-[#D4FF00] rounded-2xl group-hover:scale-110 transition-transform">
              <Utensils size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-black text-white">{mealTotals?.total_calories || 0}</span>
            <span className="text-xs font-bold text-[#474747]">/ {calorieGoal} kcal</span>
          </div>
          <div className="w-full bg-[#0A0A0A] h-2 rounded-full mt-4 overflow-hidden border border-[#474747]/30">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${calPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="bg-[#D4FF00] h-full rounded-full shadow-[0_0_10px_#D4FF00]"
            />
          </div>
        </motion.div>

        {/* Protein Intake Card */}
        <motion.div 
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg relative overflow-hidden group cursor-pointer"
        >
          <div className="flex justify-between items-center mb-4">
            <span className="text-[11px] font-extrabold text-[#474747] uppercase tracking-widest font-display">PROTEIN INTAKE</span>
            <div className="p-2.5 bg-violet-500/10 text-violet-400 rounded-2xl group-hover:scale-110 transition-transform">
              <Zap size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-black text-white">{mealTotals?.total_protein || 0}</span>
            <span className="text-xs font-bold text-[#474747]">g consumed</span>
          </div>
          <p className="text-xs text-[#E5E5E5]/60 mt-3 font-semibold">
            Carbs: <span className="text-[#E5E5E5]">{mealTotals?.total_carbs || 0}g</span> | Fats: <span className="text-[#E5E5E5]">{mealTotals?.total_fats || 0}g</span>
          </p>
        </motion.div>

        {/* Water Tracker Card */}
        <motion.div 
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg relative overflow-hidden group cursor-pointer"
        >
          <div className="flex justify-between items-center mb-4">
            <span className="text-[11px] font-extrabold text-[#474747] uppercase tracking-widest font-display">WATER CONSUMED</span>
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-2xl group-hover:scale-110 transition-transform">
              <Droplet size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-black text-white">{waterLogged}</span>
            <span className="text-xs font-bold text-[#474747]">/ {waterGoal} ml</span>
          </div>
          <div className="w-full bg-[#0A0A0A] h-2 rounded-full mt-4 overflow-hidden border border-[#474747]/30">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${waterPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="bg-sky-400 h-full rounded-full shadow-[0_0_10px_rgba(56,189,248,0.5)]"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side (2 Cols): Weight Log Trend Graph & Hydration */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          {/* Weight Log Trend Graph */}
          <div className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-display text-2xl font-bold text-white tracking-wide">WEIGHT PROGRESS TELEMETRY</h3>
                <p className="text-xs text-[#474747] font-semibold uppercase tracking-wider">Telemetry from your last 30 logs</p>
              </div>
              {analytics?.weightLogs && analytics.weightLogs.length > 1 && (
                <div className="flex items-center gap-1.5 bg-[#0A0A0A] text-[#D4FF00] px-3.5 py-1.5 rounded-full text-xs font-black border border-[#D4FF00]/30 font-display">
                  <TrendingUp size={14} />
                  <span>ACTIVE TREND</span>
                </div>
              )}
            </div>
            <div className="h-64 w-full min-w-0 min-h-0">
              {analytics?.weightLogs && analytics.weightLogs.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={analytics.weightLogs}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4FF00" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#D4FF00" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="recorded_at" 
                      stroke="#474747" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(str) => {
                        const date = new Date(str);
                        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis 
                      domain={['dataMin - 2', 'dataMax + 2']} 
                      stroke="#474747" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ background: '#0A0A0A', border: '1px solid rgba(212, 255, 0, 0.3)', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                      labelFormatter={(str) => new Date(str).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#D4FF00" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#weightGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center flex-col gap-2 text-[#474747] text-xs">
                  <span>No weight metrics recorded yet.</span>
                  <p className="text-[11px] text-[#474747]">Submit your daily weight in Analytics or Profile settings!</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Track Row: Water and BMI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Water Logger */}
            <div className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg">
              <h3 className="font-display text-xl font-bold text-white tracking-wide">WATER HYDRATION</h3>
              <p className="text-xs text-[#474747] mb-4 font-semibold uppercase tracking-wider">Quick-add water to hit your daily goal of {waterGoal} ml.</p>
              
              <div className="flex gap-3">
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleLogWater(250)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#0A0A0A] hover:bg-[#262626] text-[#E5E5E5] border border-[#474747]/50 py-3 rounded-2xl font-bold transition-all text-xs font-display tracking-wider cursor-pointer"
                >
                  <Plus size={14} /> +250 ML (CUP)
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleLogWater(500)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-sky-500 text-black hover:bg-sky-400 py-3 rounded-2xl font-extrabold transition-all text-xs font-display tracking-wider shadow-lg shadow-sky-500/20 cursor-pointer"
                >
                  <Plus size={14} /> +500 ML (BOTTLE)
                </motion.button>
              </div>
            </div>

            {/* BMI Index Indicator */}
            <div className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="font-display text-xl font-bold text-white tracking-wide">ACTIVE BMI INDEX</h3>
                <p className="text-xs text-[#474747] mt-0.5 font-semibold uppercase tracking-wider">Derived from profile height and weight.</p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div>
                  <span className="font-display text-4xl font-extrabold text-white">{bmi ? bmi : '--'}</span>
                  <span className="text-[11px] text-[#474747] block mt-0.5 font-bold uppercase tracking-widest font-display">BMI Score</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-black font-display tracking-wider ${bmiColor}`}>{bmiCategory}</span>
                  <span className="text-[11px] text-[#474747] block mt-0.5 font-semibold">18.5 - 24.9 Standard</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side (1 Col): AI Coach Insights & Unlocked Badges */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* AI Coach Insights Card */}
          <motion.div 
            whileHover={{ y: -6, scale: 1.02 }}
            onClick={() => navigate('/coach')}
            className="bg-[#1E1E1E] border border-[#D4FF00]/30 p-6 rounded-3xl shadow-lg relative overflow-hidden cursor-pointer group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4FF00]/10 rounded-full blur-3xl group-hover:bg-[#D4FF00]/25 transition-all duration-500" />
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-[#D4FF00]/15 text-[#D4FF00] rounded-xl group-hover:scale-110 transition-transform">
                <Bot size={18} />
              </div>
              <h3 className="font-display text-2xl font-bold text-white group-hover:text-[#D4FF00] transition-colors">STRYVON AI COACH</h3>
            </div>
            
            {aiLoading ? (
              <div className="space-y-2 py-4">
                <div className="h-4 bg-[#0A0A0A] rounded-full w-3/4 animate-pulse"></div>
                <div className="h-4 bg-[#0A0A0A] rounded-full animate-pulse"></div>
              </div>
            ) : (
              <div className="text-xs leading-relaxed text-[#E5E5E5]/90 font-medium">
                {aiSummary ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {aiSummary}
                  </ReactMarkdown>
                ) : (
                  <span>Log your workout sets and nutrition so STRYVON AI can generate personalized telemetry performance reports!</span>
                )}
              </div>
            )}

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => { e.stopPropagation(); navigate('/coach'); }}
              className="mt-5 w-full bg-[#0A0A0A] hover:bg-[#D4FF00] hover:text-[#0A0A0A] border border-[#D4FF00]/40 text-[#D4FF00] font-extrabold font-display py-3 px-4 rounded-2xl text-sm transition-all flex items-center justify-center gap-1.5 tracking-wider cursor-pointer"
            >
              <span>CHAT WITH AI COACH →</span>
            </motion.button>
          </motion.div>

          {/* Achieved Badges */}
          <div className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-xl font-bold text-white flex items-center gap-2 tracking-wide">
                <Award size={18} className="text-[#D4FF00]" />
                UNLOCKED BADGES
              </h3>
              <span className="text-xs text-[#D4FF00] font-black font-display tracking-wider">
                {profile?.badges?.length || 0} UNLOCKED
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {profile?.badges && profile.badges.length > 0 ? (
                profile.badges.map((bName, idx) => (
                  <motion.div 
                    key={idx} 
                    whileHover={{ scale: 1.04 }}
                    className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-[#0A0A0A] border border-[#474747]/30"
                  >
                    <div className="h-10 w-10 bg-[#D4FF00]/20 text-[#D4FF00] rounded-full flex items-center justify-center mb-2">
                      <Award size={18} />
                    </div>
                    <span className="text-xs font-bold text-[#E5E5E5] font-display tracking-wider uppercase line-clamp-1">{bName}</span>
                    <span className="text-[10px] text-[#474747] mt-0.5 font-semibold">Unlocked Badge</span>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-2 text-center py-4 text-xs text-[#474747]">
                  No badges unlocked yet. Complete workouts & meals to earn badges!
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
