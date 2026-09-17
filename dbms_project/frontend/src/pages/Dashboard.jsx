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
import CountUp from '../components/CountUp';
import { SkeletonCard } from '../components/Skeleton';
import { tapScaleProps } from '../utils/animationPresets';

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
        body: JSON.stringify({ amount_ml: amountMl })
      });
      if (res.ok) {
        setWaterLogged(newWater);
      }
    } catch (err) {
      console.error('Failed to log water:', err);
    }
  };

  // BMI calculations
  let bmi = null;
  let bmiCategory = 'Normal';
  let bmiColor = 'text-[#D4FF00]';

  if (profile?.weight && profile?.height) {
    const hMeters = profile.height / 100;
    bmi = parseFloat((profile.weight / (hMeters * hMeters)).toFixed(1));
    
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
  } else if (profile?.bmi) {
    bmi = profile.bmi;
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
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
  };

  if (loading && !profile) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-64 bg-[#1E1E1E] rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 sm:space-y-8"
    >
      {/* Top Banner */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white uppercase leading-tight">
            {isNew ? 'WELCOME,' : 'WELCOME BACK,'} <span className="text-[#D4FF00]">{displayName}</span>
          </h1>
          <p className="text-[#E5E5E5]/70 text-xs mt-1 font-medium">
            Here's a snapshot of your physical health parameters and daily consistency goals.
          </p>
        </div>
        {profile?.streak_count > 0 && (
          <div className="flex items-center shrink-0">
            <motion.div 
              whileTap={{ scale: 0.95 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="flex items-center gap-2 bg-[#1E1E1E] text-[#D4FF00] border border-[#474747]/50 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider font-display"
            >
              <Flame size={14} className="fill-[#D4FF00] animate-pulse" />
              <span><CountUp value={profile.streak_count} /> DAY STREAK</span>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Grid: 4 Core Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Weight Card */}
        <motion.div 
          whileTap={{ scale: 0.98 }}
          className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden group cursor-pointer"
          onClick={() => navigate('/analytics')}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4FF00]/5 rounded-full blur-2xl group-hover:bg-[#D4FF00]/15 transition-all duration-500" />
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-extrabold text-[#474747] uppercase tracking-widest font-display">CURRENT WEIGHT</span>
            <div className="p-2 bg-[#D4FF00]/10 text-[#D4FF00] rounded-2xl group-hover:scale-110 transition-transform">
              <Scale size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-3xl sm:text-4xl font-black text-white">
              <CountUp value={profile?.weight || 0} decimals={1} />
            </span>
            <span className="text-xs font-bold text-[#474747]">kg</span>
          </div>
          <p className="text-xs text-[#E5E5E5]/60 mt-2 font-semibold">
            Target: <span className="text-[#D4FF00] font-bold">{profile?.goal_type || 'Maintain'}</span>
          </p>
        </motion.div>

        {/* Calories Consumed Card */}
        <motion.div 
          whileTap={{ scale: 0.98 }}
          className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden group cursor-pointer"
          onClick={() => navigate('/diet')}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4FF00]/5 rounded-full blur-2xl group-hover:bg-[#D4FF00]/15 transition-all duration-500" />
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-extrabold text-[#474747] uppercase tracking-widest font-display">CALORIES CONSUMED</span>
            <div className="p-2 bg-[#D4FF00]/10 text-[#D4FF00] rounded-2xl group-hover:scale-110 transition-transform">
              <Utensils size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-3xl sm:text-4xl font-black text-white">
              <CountUp value={mealTotals?.total_calories || 0} />
            </span>
            <span className="text-xs font-bold text-[#474747]">/ {calorieGoal} kcal</span>
          </div>
          <div className="w-full bg-[#0A0A0A] h-2 rounded-full mt-3 overflow-hidden border border-[#474747]/30">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${calPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="bg-[#D4FF00] h-full rounded-full shadow-[0_0_10px_#D4FF00]"
            />
          </div>
        </motion.div>

        {/* Protein Intake Card */}
        <motion.div 
          whileTap={{ scale: 0.98 }}
          className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden group cursor-pointer"
          onClick={() => navigate('/diet')}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-extrabold text-[#474747] uppercase tracking-widest font-display">PROTEIN INTAKE</span>
            <div className="p-2 bg-violet-500/10 text-violet-400 rounded-2xl group-hover:scale-110 transition-transform">
              <Zap size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-3xl sm:text-4xl font-black text-white">
              <CountUp value={mealTotals?.total_protein || 0} />
            </span>
            <span className="text-xs font-bold text-[#474747]">g consumed</span>
          </div>
          <p className="text-xs text-[#E5E5E5]/60 mt-2 font-semibold">
            Carbs: <span className="text-[#E5E5E5]"><CountUp value={mealTotals?.total_carbs || 0} />g</span> | Fats: <span className="text-[#E5E5E5]"><CountUp value={mealTotals?.total_fats || 0} />g</span>
          </p>
        </motion.div>

        {/* Water Tracker Card */}
        <motion.div 
          whileTap={{ scale: 0.98 }}
          className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden group cursor-pointer"
          onClick={() => navigate('/diet')}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-extrabold text-[#474747] uppercase tracking-widest font-display">WATER CONSUMED</span>
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-2xl group-hover:scale-110 transition-transform">
              <Droplet size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-3xl sm:text-4xl font-black text-white">
              <CountUp value={waterLogged} />
            </span>
            <span className="text-xs font-bold text-[#474747]">/ {waterGoal} ml</span>
          </div>
          <div className="w-full bg-[#0A0A0A] h-2 rounded-full mt-3 overflow-hidden border border-[#474747]/30">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${waterPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
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
          <div className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 sm:mb-6">
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide">WEIGHT PROGRESS TELEMETRY</h3>
                <p className="text-[11px] text-[#474747] font-semibold uppercase tracking-wider">Telemetry from your last 30 logs</p>
              </div>
              {analytics?.weightLogs && analytics.weightLogs.length > 1 && (
                <div className="flex items-center gap-1.5 bg-[#0A0A0A] text-[#D4FF00] px-3 py-1 rounded-full text-[11px] font-black border border-[#D4FF00]/30 font-display">
                  <TrendingUp size={13} />
                  <span>ACTIVE TREND</span>
                </div>
              )}
            </div>
            <div className="h-56 sm:h-64 w-full min-w-0 min-h-0">
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
                      fontSize={10} 
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
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ background: '#0A0A0A', border: '1px solid rgba(212, 255, 0, 0.3)', borderRadius: '16px', color: '#fff', fontSize: '11px' }}
                      labelFormatter={(str) => new Date(str).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
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
                <div className="h-full flex items-center justify-center flex-col gap-2 text-[#474747] text-xs text-center p-4">
                  <span>No weight metrics recorded yet.</span>
                  <p className="text-[11px] text-[#474747]">Submit your daily weight in Analytics or Profile settings!</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Track Row: Water and BMI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Water Logger */}
            <div className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl shadow-lg">
              <h3 className="font-display text-xl font-bold text-white tracking-wide">WATER HYDRATION</h3>
              <p className="text-xs text-[#474747] mb-4 font-semibold uppercase tracking-wider">Quick-add water to hit your daily goal of {waterGoal} ml.</p>
              
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleLogWater(250)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#0A0A0A] hover:bg-[#262626] text-[#E5E5E5] border border-[#474747]/50 py-3 rounded-2xl font-bold transition-all text-xs font-display tracking-wider cursor-pointer min-h-[44px]"
                >
                  <Plus size={14} /> +250 ML (CUP)
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleLogWater(500)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-sky-500 text-black hover:bg-sky-400 py-3 rounded-2xl font-extrabold transition-all text-xs font-display tracking-wider shadow-lg shadow-sky-500/20 cursor-pointer min-h-[44px]"
                >
                  <Plus size={14} /> +500 ML (BOTTLE)
                </motion.button>
              </div>
            </div>

            {/* BMI Index Indicator */}
            <div className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl shadow-lg flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white tracking-wide">ACTIVE BMI INDEX</h3>
                <p className="text-xs text-[#474747] mt-0.5 font-semibold uppercase tracking-wider">Derived from profile height and weight.</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-display text-3xl sm:text-4xl font-extrabold text-white">{bmi ? bmi : '--'}</span>
                  <span className="text-[11px] text-[#474747] block mt-0.5 font-bold uppercase tracking-widest font-display">BMI Score</span>
                </div>
                <div className="text-right">
                  <span className={`text-xs sm:text-sm font-black font-display tracking-wider ${bmiColor}`}>{bmiCategory}</span>
                  <span className="text-[10px] sm:text-[11px] text-[#474747] block mt-0.5 font-semibold">18.5 - 24.9 Standard</span>
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
            className="bg-[#1E1E1E] border border-[#D4FF00]/30 p-4 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden cursor-pointer group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4FF00]/10 rounded-full blur-3xl group-hover:bg-[#D4FF00]/25 transition-all duration-500" />
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-[#D4FF00]/15 text-[#D4FF00] rounded-xl group-hover:scale-110 transition-transform">
                <Bot size={18} />
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white group-hover:text-[#D4FF00] transition-colors">STRYVON AI COACH</h3>
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
              className="mt-4 w-full bg-[#0A0A0A] hover:bg-[#D4FF00] hover:text-[#0A0A0A] border border-[#D4FF00]/40 text-[#D4FF00] font-extrabold font-display py-3 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5 tracking-wider cursor-pointer min-h-[44px]"
            >
              <span>CHAT WITH AI COACH →</span>
            </motion.button>
          </motion.div>

          {/* Achieved Badges */}
          <div className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-lg sm:text-xl font-bold text-white flex items-center gap-2 tracking-wide">
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
                    className="flex flex-col items-center text-center p-3 rounded-2xl bg-[#0A0A0A] border border-[#474747]/30"
                  >
                    <div className="h-9 w-9 bg-[#D4FF00]/20 text-[#D4FF00] rounded-full flex items-center justify-center mb-1.5">
                      <Award size={16} />
                    </div>
                    <span className="text-[11px] font-bold text-[#E5E5E5] font-display tracking-wider uppercase line-clamp-1">{bName}</span>
                    <span className="text-[9px] text-[#474747] mt-0.5 font-semibold">Unlocked Badge</span>
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
