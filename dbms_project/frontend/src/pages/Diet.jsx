import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Plus, 
  Utensils, 
  TrendingUp, 
  Droplet, 
  Check, 
  Trash2, 
  AlertCircle, 
  Image as ImageIcon,
  Sparkles,
  Zap
} from 'lucide-react';
import CountUp from '../components/CountUp';
import { tapScaleProps } from '../utils/animationPresets';

export default function Diet({ apiUrl, token, user }) {
  const [mealLogs, setMealLogs] = useState([]);
  const [mealTotals, setMealTotals] = useState({ total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0 });
  const [waterLogged, setWaterLogged] = useState(0);
  const [dietPlans, setDietPlans] = useState([]);
  const [activeDiet, setActiveDiet] = useState(null);
  const [loading, setLoading] = useState(true);

  // Manual Log Meal State
  const [showManualForm, setShowManualForm] = useState(false);
  const [mealType, setMealType] = useState('Breakfast');
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');

  // AI Food Scanner State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');

  const fileInputRef = useRef(null);

  // Fetch Diet Data
  const fetchDietData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Meals
      const mRes = await fetch(`${apiUrl}/diet/meals`, { headers });
      const mData = await mRes.json();
      if (mRes.ok) {
        setMealLogs(mData.meals || []);
        setMealTotals(mData.totals || { total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0 });
      }

      // Water
      const wRes = await fetch(`${apiUrl}/diet/water`, { headers });
      const wData = await wRes.json();
      if (wRes.ok) setWaterLogged(Number(wData.total_water_ml) || 0);

      // Diet Plans
      const dRes = await fetch(`${apiUrl}/diet/plans`, { headers });
      const dData = await dRes.json();
      if (dRes.ok) setDietPlans(dData.plans || []);

      // Active Profile Diet
      const pRes = await fetch(`${apiUrl}/auth/profile`, { headers });
      const pData = await pRes.json();
      if (pRes.ok && pData.profile?.current_diet_id) {
        const matchingPlan = (dData.plans || []).find(p => p.plan_id === pData.profile.current_diet_id);
        if (matchingPlan) setActiveDiet(matchingPlan);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDietData();
  }, [apiUrl, token]);

  const handleManualMealSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/diet/log-meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          meal_type: mealType,
          meal_name: mealName,
          calories: parseInt(calories) || 0,
          protein: parseInt(protein) || 0,
          carbs: parseInt(carbs) || 0,
          fats: parseInt(fats) || 0
        })
      });

      if (response.ok) {
        setMealName('');
        setCalories('');
        setProtein('');
        setCarbs('');
        setFats('');
        setShowManualForm(false);
        await fetchDietData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Image Selection Handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setScanResult(null);
      setScanError('');
    }
  };

  const triggerCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAnalyzeImage = async (e) => {
    if (e) e.preventDefault();
    if (!imagePreview) return;
    setScanning(true);
    setScanError('');

    try {
      const response = await fetch(`${apiUrl}/diet/log-meal-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imageBase64: imagePreview })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'AI food recognition failed');
      }

      setScanResult(data.nutritional_data || data.meal);
    } catch (err) {
      setScanError(err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleLogScannedMeal = async () => {
    if (!scanResult) return;
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/diet/log-meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          meal_type: mealType,
          meal_name: scanResult.meal_name || scanResult.food_item || 'AI Scanned Dish',
          calories: parseInt(scanResult.calories) || 0,
          protein: parseInt(scanResult.protein) || 0,
          carbs: parseInt(scanResult.carbs) || 0,
          fats: parseInt(scanResult.fats) || 0
        })
      });

      if (response.ok) {
        setImageFile(null);
        setImagePreview(null);
        setScanResult(null);
        await fetchDietData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeal = async (mealId) => {
    if (!window.confirm('Are you sure you want to delete this meal log?')) {
      return;
    }

    try {
      // Optimistically update UI
      setMealLogs(prev => prev.filter(m => m.meal_id !== mealId));

      const response = await fetch(`${apiUrl}/diet/meals/${mealId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        // Re-sync all totals across the page
        await fetchDietData();
      } else {
        alert(data.message || 'Failed to delete meal log.');
        await fetchDietData();
      }
    } catch (err) {
      console.error('Failed to delete meal:', err);
      alert('Network error while deleting meal. Please try again.');
      await fetchDietData();
    }
  };

  const handleLogWater = async (amount) => {
    try {
      if (waterLogged >= 6000) return;
      const numericAmount = Number(amount);
      const response = await fetch(`${apiUrl}/diet/water`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount_ml: numericAmount })
      });
      const data = await response.json();
      if (response.ok) {
        setWaterLogged(Math.min(Number(data.water_logged_ml) || Number(data.total_water_ml) || (Number(waterLogged) + numericAmount), 6000));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && mealLogs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 border-4 border-[#D4FF00] border-t-transparent rounded-full animate-spin"></div>
        <span className="font-display text-sm text-[#D4FF00] tracking-widest uppercase">Loading Nutrition Telemetry...</span>
      </div>
    );
  }

  // Active Target Macros
  const targetCalories = activeDiet?.calories || 2000;
  const targetProtein = activeDiet?.protein || 150;
  const targetCarbs = activeDiet?.carbs || 220;
  const targetFats = activeDiet?.fats || 70;

  const calProgress = Math.min(Math.round(((mealTotals?.total_calories || 0) / targetCalories) * 100), 100);
  const proteinProgress = Math.min(Math.round(((mealTotals?.total_protein || 0) / targetProtein) * 100), 100);
  const carbsProgress = Math.min(Math.round(((mealTotals?.total_carbs || 0) / targetCarbs) * 100), 100);
  const fatsProgress = Math.min(Math.round(((mealTotals?.total_fats || 0) / targetFats) * 100), 100);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 text-white"
    >
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-4xl font-black text-white tracking-tight uppercase">NUTRITION & DIET TRACKER</h1>
        <p className="text-[#E5E5E5]/70 text-xs mt-1 font-medium">Log meals manually, track daily water metrics, or scan dishes via camera with AI.</p>
      </div>

      {/* Target Progress Bar Rings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Calories Ring */}
        <div className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl text-center flex flex-col justify-between shadow-lg">
          <span className="text-[10px] sm:text-xs font-bold text-[#E5E5E5]/60 uppercase tracking-widest block mb-2 sm:mb-4 font-display">Today's Calories</span>
          <div className="relative inline-flex items-center justify-center h-20 w-20 sm:h-28 sm:w-28 mx-auto mb-2 sm:mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="56" cy="56" r="48" className="stroke-[#0A0A0A] fill-transparent" strokeWidth="8"/>
              <circle cx="56" cy="56" r="48" className="stroke-[#D4FF00] fill-transparent transition-all duration-500" strokeWidth="8" strokeDasharray="301.6" strokeDashoffset={301.6 - (301.6 * calProgress) / 100}/>
            </svg>
            <div className="absolute text-center">
              <span className="font-display text-xl sm:text-3xl font-black text-white">{mealTotals?.total_calories || 0}</span>
              <p className="text-[9px] sm:text-[10px] font-semibold text-[#E5E5E5]/50">/ {targetCalories} kcal</p>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-[#D4FF00] bg-[#D4FF00]/10 border border-[#D4FF00]/20 px-2.5 py-1 rounded-full w-fit mx-auto font-display">
            {calProgress}% Complete
          </span>
        </div>

        {/* Protein Macro */}
        <div className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl text-center flex flex-col justify-between shadow-lg">
          <span className="text-[10px] sm:text-xs font-bold text-[#E5E5E5]/60 uppercase tracking-widest block mb-2 sm:mb-4 font-display">Protein</span>
          <div className="relative inline-flex items-center justify-center h-20 w-20 sm:h-28 sm:w-28 mx-auto mb-2 sm:mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="56" cy="56" r="48" className="stroke-[#0A0A0A] fill-transparent" strokeWidth="8"/>
              <circle cx="56" cy="56" r="48" className="stroke-violet-400 fill-transparent transition-all duration-500" strokeWidth="8" strokeDasharray="301.6" strokeDashoffset={301.6 - (301.6 * proteinProgress) / 100}/>
            </svg>
            <div className="absolute text-center">
              <span className="font-display text-xl sm:text-3xl font-black text-white">{mealTotals?.total_protein || 0}g</span>
              <p className="text-[9px] sm:text-[10px] font-semibold text-[#E5E5E5]/50">/ {targetProtein}g Goal</p>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-full w-fit mx-auto font-display">
            {proteinProgress}% Complete
          </span>
        </div>

        {/* Carbs Macro */}
        <div className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl text-center flex flex-col justify-between shadow-lg">
          <span className="text-[10px] sm:text-xs font-bold text-[#E5E5E5]/60 uppercase tracking-widest block mb-2 sm:mb-4 font-display">Carbohydrates</span>
          <div className="relative inline-flex items-center justify-center h-20 w-20 sm:h-28 sm:w-28 mx-auto mb-2 sm:mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="56" cy="56" r="48" className="stroke-[#0A0A0A] fill-transparent" strokeWidth="8"/>
              <circle cx="56" cy="56" r="48" className="stroke-sky-400 fill-transparent transition-all duration-500" strokeWidth="8" strokeDasharray="301.6" strokeDashoffset={301.6 - (301.6 * carbsProgress) / 100}/>
            </svg>
            <div className="absolute text-center">
              <span className="font-display text-xl sm:text-3xl font-black text-white">{mealTotals?.total_carbs || 0}g</span>
              <p className="text-[9px] sm:text-[10px] font-semibold text-[#E5E5E5]/50">/ {targetCarbs}g Goal</p>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full w-fit mx-auto font-display">
            {carbsProgress}% Complete
          </span>
        </div>

        {/* Fats Macro */}
        <div className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl text-center flex flex-col justify-between shadow-lg">
          <span className="text-[10px] sm:text-xs font-bold text-[#E5E5E5]/60 uppercase tracking-widest block mb-2 sm:mb-4 font-display">Healthy Fats</span>
          <div className="relative inline-flex items-center justify-center h-20 w-20 sm:h-28 sm:w-28 mx-auto mb-2 sm:mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="56" cy="56" r="48" className="stroke-[#0A0A0A] fill-transparent" strokeWidth="8"/>
              <circle cx="56" cy="56" r="48" className="stroke-orange-400 fill-transparent transition-all duration-500" strokeWidth="8" strokeDasharray="301.6" strokeDashoffset={301.6 - (301.6 * fatsProgress) / 100}/>
            </svg>
            <div className="absolute text-center">
              <span className="font-display text-xl sm:text-3xl font-black text-white">{mealTotals?.total_fats || 0}g</span>
              <p className="text-[9px] sm:text-[10px] font-semibold text-[#E5E5E5]/50">/ {targetFats}g Goal</p>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full w-fit mx-auto font-display">
            {fatsProgress}% Complete
          </span>
        </div>
      </div>

      {/* Main split dashboard log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Meal Logs List & Hydration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Meal log list */}
          <div className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl shadow-lg">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
              <div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-white uppercase tracking-wide">Daily Logged Meals</h3>
                <p className="text-xs text-[#E5E5E5]/60 mt-0.5">Summary of food records eaten today</p>
              </div>
              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className="flex items-center gap-1.5 bg-[#D4FF00] hover:bg-[#b8de00] text-black font-display font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md min-h-[44px]"
              >
                <Plus size={16} /> Manual Log
              </button>
            </div>

            {/* Manual Form (Conditional) */}
            {showManualForm && (
              <form onSubmit={handleManualMealSubmit} className="bg-[#0A0A0A] border border-[#474747] p-4 sm:p-5 rounded-2xl mb-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-[#E5E5E5]/70 block mb-1 font-bold uppercase tracking-wider font-display">Meal Category</label>
                    <select
                      value={mealType}
                      onChange={(e) => setMealType(e.target.value)}
                      className="w-full bg-[#1E1E1E] border border-[#474747] text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                      <option value="Snack">Snack</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-[#E5E5E5]/70 block mb-1 font-bold uppercase tracking-wider font-display">Dish/Item Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Scrambled eggs with toast"
                      value={mealName}
                      onChange={(e) => setMealName(e.target.value)}
                      className="w-full bg-[#1E1E1E] border border-[#474747] text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs text-[#E5E5E5]/70 block mb-1 font-bold">Calories (kcal)</label>
                    <input
                      type="number"
                      required
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      className="w-full bg-[#1E1E1E] border border-[#474747] text-white rounded-xl py-2.5 px-3 text-sm text-center focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#E5E5E5]/70 block mb-1 font-bold">Protein (g)</label>
                    <input
                      type="number"
                      value={protein}
                      onChange={(e) => setProtein(e.target.value)}
                      className="w-full bg-[#1E1E1E] border border-[#474747] text-white rounded-xl py-2.5 px-3 text-sm text-center focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#E5E5E5]/70 block mb-1 font-bold">Carbs (g)</label>
                    <input
                      type="number"
                      value={carbs}
                      onChange={(e) => setCarbs(e.target.value)}
                      className="w-full bg-[#1E1E1E] border border-[#474747] text-white rounded-xl py-2.5 px-3 text-sm text-center focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#E5E5E5]/70 block mb-1 font-bold">Fats (g)</label>
                    <input
                      type="number"
                      value={fats}
                      onChange={(e) => setFats(e.target.value)}
                      className="w-full bg-[#1E1E1E] border border-[#474747] text-white rounded-xl py-2.5 px-3 text-sm text-center focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowManualForm(false)}
                    className="px-4 py-2.5 border border-[#474747] text-[#E5E5E5] text-xs font-semibold rounded-xl hover:bg-[#1E1E1E] min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#D4FF00] hover:bg-[#b8de00] text-black font-display font-bold px-4 py-2.5 text-xs uppercase rounded-xl transition-all min-h-[44px]"
                  >
                    Log Item
                  </button>
                </div>
              </form>
            )}

            {/* List */}
            {mealLogs.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {mealLogs.map((meal) => (
                    <motion.div 
                      key={meal.meal_id}
                      layout
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -30, height: 0, marginBottom: 0, padding: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="flex justify-between items-center p-3.5 sm:p-4 rounded-2xl bg-[#0A0A0A] border border-[#474747]/40 hover:border-[#D4FF00]/40 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
                        <div className={`shrink-0 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-display font-bold uppercase ${meal.meal_type === 'Breakfast' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : meal.meal_type === 'Lunch' ? 'bg-[#D4FF00]/20 text-[#D4FF00] border border-[#D4FF00]/30' : meal.meal_type === 'Dinner' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-pink-500/20 text-pink-400 border border-pink-500/30'}`}>
                          {meal.meal_type}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-white text-xs sm:text-sm block truncate">{meal.meal_name}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-display font-black text-[#D4FF00] text-sm sm:text-base">{meal.calories} kcal</span>
                          <div className="flex gap-1.5 text-[10px] sm:text-[11px] text-[#E5E5E5]/60 font-medium mt-0.5">
                            <span>P: {meal.protein}g</span>
                            <span>C: {meal.carbs}g</span>
                            <span>F: {meal.fats}g</span>
                          </div>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => handleDeleteMeal(meal.meal_id)}
                          className="text-[#474747] hover:text-red-400 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors rounded-lg cursor-pointer"
                          title="Delete meal"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-10 text-[#E5E5E5]/40 text-sm">
                <Utensils size={36} className="mx-auto mb-2 opacity-40 animate-pulse text-[#D4FF00]" />
                <span>No meals logged today. Use manual log or scan your dish.</span>
              </div>
            )}
          </div>

          {/* Hydration tracking card */}
          <div className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-white uppercase tracking-wide">Water Hydration Tracker</h3>
                <p className="text-xs text-[#E5E5E5]/60 mt-0.5">Track daily fluid intake towards your target</p>
              </div>
              <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20">
                <Droplet size={20} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-center sm:text-left">
                <span className="text-2xl sm:text-3xl font-display font-black text-white">{waterLogged}</span>
                <span className="text-xs sm:text-sm font-semibold text-[#E5E5E5]/60"> ml logged today</span>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={() => handleLogWater(250)}
                  className="flex-1 sm:flex-initial bg-[#0A0A0A] hover:bg-[#151515] border border-sky-500/30 text-sky-400 font-display font-bold px-4 py-3 rounded-xl text-xs uppercase tracking-wider transition-all min-h-[44px]"
                >
                  + 250ml
                </button>
                <button
                  onClick={() => handleLogWater(500)}
                  className="flex-1 sm:flex-initial bg-sky-500 hover:bg-sky-400 text-black font-display font-bold px-4 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md min-h-[44px]"
                >
                  + 500ml
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: AI Calorie Image Scanner */}
        <div className="space-y-6">
          <div className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-[#D4FF00]" />
              <h3 className="font-display text-xl font-bold text-white uppercase tracking-wide">AI Food Scanner</h3>
            </div>
            
            <p className="text-xs text-[#E5E5E5]/60 mb-4 leading-relaxed">
              Take a snapshot of your food dish. FitGenius AI Vision will estimate calories and macros automatically.
            </p>

            <form onSubmit={handleAnalyzeImage} className="space-y-4">
              <div>
                <label className="text-xs text-[#E5E5E5]/70 block mb-1 font-bold uppercase tracking-wider font-display">Meal Category</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#474747] text-white rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[#D4FF00]"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snack">Snack</option>
                </select>
              </div>

              {/* Hidden file input for native camera launch */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                capture="environment"
                className="hidden"
              />

              {/* Camera Trigger area */}
              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-[#474747] h-40 bg-[#0A0A0A]">
                  <img src={imagePreview} alt="Selected food preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); setScanResult(null); }}
                    className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white rounded-lg p-1.5 transition-colors border border-white/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={triggerCamera}
                  className="w-full border-2 border-dashed border-[#474747] hover:border-[#D4FF00] rounded-2xl py-8 flex flex-col items-center justify-center gap-2 group transition-all bg-[#0A0A0A]"
                >
                  <div className="p-3 bg-[#D4FF00]/10 text-[#D4FF00] rounded-2xl group-hover:scale-105 transition-transform">
                    <Camera size={24} />
                  </div>
                  <span className="text-xs font-bold text-[#E5E5E5]">Tap to Take Photo / Upload</span>
                  <p className="text-[10px] text-[#E5E5E5]/50">Supports phone cameras & image files</p>
                </button>
              )}

              {/* Scan Error */}
              {scanError && (
                <div className="flex items-center gap-2 bg-red-500/10 text-red-400 p-3 rounded-xl text-xs border border-red-500/20">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}

              {/* Scan Success result dialog */}
              {scanResult && (
                <div className="bg-[#0A0A0A] border border-[#D4FF00]/40 text-[#E5E5E5] p-4 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center gap-1.5 text-[#D4FF00] font-bold">
                    <Check size={16} />
                    <span className="font-display uppercase tracking-wider text-sm">Food Recognized!</span>
                  </div>
                  <p className="font-bold text-white text-base">{scanResult.meal_name || scanResult.food_item}</p>
                  <div className="flex justify-between font-display font-bold text-sm text-[#D4FF00] border-t border-[#474747] pt-2">
                    <span>{scanResult.calories} kcal</span>
                    <span>P: {scanResult.protein}g</span>
                    <span>C: {scanResult.carbs}g</span>
                    <span>F: {scanResult.fats}g</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogScannedMeal}
                    className="w-full mt-2 bg-[#D4FF00] text-black font-display font-bold py-2 rounded-xl uppercase tracking-wider text-xs hover:bg-[#b8de00] transition-colors"
                  >
                    Confirm & Log Meal
                  </button>
                </div>
              )}

              {/* Upload Trigger Button */}
              {imagePreview && !scanResult && (
                <button
                  type="submit"
                  disabled={scanning}
                  className="w-full bg-[#D4FF00] hover:bg-[#b8de00] text-black font-display font-bold py-3 rounded-xl text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {scanning ? (
                    <>
                      <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span>Analyzing Food...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Estimate & Recognize</span>
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
