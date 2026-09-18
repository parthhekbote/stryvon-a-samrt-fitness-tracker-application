import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Award, 
  Scale, 
  Settings2, 
  Droplet, 
  LogOut, 
  Check, 
  ShieldAlert, 
  Activity, 
  Heart,
  Loader2
} from 'lucide-react';

export default function Profile({ apiUrl, token, onLogout, onUpdateUser }) {
  const [profile, setProfile] = useState(null);
  const [dietPlans, setDietPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goalType, setGoalType] = useState('Maintain');
  const [waterGoal, setWaterGoal] = useState('');
  const [dietId, setDietId] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const fetchProfileAndDiets = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch Profile
      const profRes = await fetch(`${apiUrl}/auth/profile`, { headers });
      const profData = await profRes.json();
      if (profRes.ok && profData.profile) {
        setProfile(profData.profile);
        setName(profData.profile.name || '');
        setAge(profData.profile.age || '');
        setGender(profData.profile.gender || 'Male');
        setHeight(profData.profile.height || '');
        setWeight(profData.profile.weight || '');
        setGoalType(profData.profile.goal_type || 'Maintain');
        setWaterGoal(profData.profile.water_goal_ml || 2000);
        setDietId(profData.profile.current_diet_id || '');
      }

      // Fetch Diet plans
      const dietRes = await fetch(`${apiUrl}/diet/plans`, { headers });
      const dietData = await dietRes.json();
      if (dietRes.ok && dietData.plans) setDietPlans(dietData.plans);

    } catch (err) {
      console.error('Failed to fetch profile/diets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndDiets();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(false);
    setError('');
    setSaving(true);
    setSavedSuccess(false);

    let parsedDietId = null;
    if (dietId !== '' && dietId !== null && dietId !== undefined) {
      const p = parseInt(dietId);
      parsedDietId = !isNaN(p) ? p : dietId;
    }

    try {
      const response = await fetch(`${apiUrl}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          age: age ? parseInt(age) : null,
          gender,
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
          goal_type: goalType,
          water_goal_ml: parseInt(waterGoal) || 2000,
          current_diet_id: parsedDietId
        })
      });

      const resData = await response.json();

      if (response.ok) {
        setSuccess(true);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
        
        // Update local storage and notify parent App/Layout state
        const storedUser = localStorage.getItem('user');
        let userObj = storedUser ? JSON.parse(storedUser) : {};
        userObj.name = name;
        userObj.goal_type = goalType;
        if (resData.profile) {
          userObj = { ...userObj, ...resData.profile };
          setProfile(resData.profile);
        }
        localStorage.setItem('user', JSON.stringify(userObj));
        
        if (typeof onUpdateUser === 'function') {
          onUpdateUser(userObj);
        }

        await fetchProfileAndDiets();
      } else {
        throw new Error(resData.message || 'Failed to update profile settings.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-accent-emerald border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 text-white">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-wider">Profile Settings & Achievements</h1>
        <p className="text-[#E5E5E5]/70 text-xs sm:text-sm mt-1 font-medium">Configure your physical goals, change diet plans, or review earned badges.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 columns: Profile settings form */}
        <div className="lg:col-span-2 bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl shadow-lg">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#474747]/40">
            <Settings2 className="text-[#D4FF00]" size={20} />
            <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider">Body Parameters</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {success && (
              <div className="flex items-center gap-2 bg-[#D4FF00]/10 text-[#D4FF00] border border-[#D4FF00]/20 p-4 rounded-xl text-xs font-bold font-display uppercase tracking-wider">
                <Check size={16} />
                <span>Profile configuration updated successfully!</span>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 p-4 rounded-xl text-xs font-bold">
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-wider font-display">Account Username</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#474747] rounded-xl py-2.5 sm:py-3 px-4 text-sm text-white focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                />
              </div>
              <div>
                <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-wider font-display">Age (Years)</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#474747] rounded-xl py-2.5 sm:py-3 px-4 text-sm text-white focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-wider font-display">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#474747] rounded-xl py-2.5 sm:py-3 px-4 text-sm text-white focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-wider font-display">Height (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#474747] rounded-xl py-2.5 sm:py-3 px-4 text-sm text-white focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                />
              </div>
              <div>
                <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-wider font-display">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#474747] rounded-xl py-2.5 sm:py-3 px-4 text-sm text-white focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-wider font-display">Primary Fitness Goal</label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#474747] rounded-xl py-2.5 sm:py-3 px-4 text-sm text-white focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                >
                  <option value="Fat Loss">Fat Loss</option>
                  <option value="Maintain">Maintain & Tone</option>
                  <option value="Muscle Gain">Muscle Gain (Bulk)</option>
                  <option value="Endurance">Endurance Training</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-wider font-display">Water Intake Goal (ml)</label>
                <input
                  type="number"
                  value={waterGoal}
                  onChange={(e) => setWaterGoal(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#474747] rounded-xl py-2.5 sm:py-3 px-4 text-sm text-white focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-wider font-display">Active Nutrition Diet Plan</label>
              <select
                value={dietId}
                onChange={(e) => setDietId(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#474747] rounded-xl py-2.5 sm:py-3 px-4 text-sm text-white focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
              >
                <option value="">No Active Diet Plan Selected</option>
                {dietPlans.map((plan) => (
                  <option key={plan.diet_id} value={plan.diet_id}>
                    {plan.diet_name} ({plan.calories} kcal | P: {plan.protein}g | C: {plan.carbs}g | F: {plan.fats}g)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-[#474747]/40">
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={saving}
                className={`flex-1 ${
                  savedSuccess
                    ? 'bg-[#D4FF00] text-black font-extrabold shadow-[0_0_20px_rgba(212,255,0,0.5)]'
                    : 'bg-[#D4FF00] hover:bg-[#b8de00] text-black font-bold'
                } py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider shadow-md min-h-[44px] disabled:opacity-75`}
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>SAVING PARAMETERS...</span>
                  </>
                ) : savedSuccess ? (
                  <motion.span 
                    initial={{ scale: 0.8, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    className="flex items-center gap-1.5 font-extrabold"
                  >
                    <Check size={16} className="stroke-[3]" />
                    PREFERENCES SAVED SUCCESSFULLY!
                  </motion.span>
                ) : (
                  <>
                    <Check size={16} />
                    SAVE PROFILE PARAMETERS
                  </>
                )}
              </motion.button>
              <button
                type="button"
                onClick={onLogout}
                className="px-6 py-3 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 rounded-xl font-display font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 column: Achievement badges showcase */}
        <div className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-6 rounded-3xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#474747]/40">
              <Award className="text-[#D4FF00]" size={20} />
              <h3 className="font-display font-bold text-lg text-white uppercase tracking-wider">Fitness Badges</h3>
            </div>
            
            {profile?.badges && profile.badges.length > 0 ? (
              <div className="space-y-4">
                {profile.badges.map((badge, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#0A0A0A] border border-[#474747]/40 hover:border-[#D4FF00]/40 transition-all"
                  >
                    <div className="h-10 w-10 bg-[#D4FF00]/10 border border-[#D4FF00]/20 rounded-2xl flex items-center justify-center text-[#D4FF00] shrink-0 shadow-md">
                      <Heart size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-white block leading-snug">
                        {badge}
                      </span>
                      <span className="text-[10px] text-[#E5E5E5]/50 font-semibold block mt-0.5 uppercase tracking-wider font-display">
                        Unlocked & Earned
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-[#E5E5E5]/40 text-sm">
                <Award size={36} className="mx-auto mb-2 text-[#D4FF00] opacity-40 animate-pulse" />
                <span>Your unlocked achievement badges will show up here. Keep active!</span>
              </div>
            )}
          </div>

          {/* Quick Body status stats brief */}
          <div className="mt-6 pt-4 border-t border-[#474747]/40 text-center">
            <span className="text-xs text-[#E5E5E5]/60 font-bold uppercase tracking-wider font-display block mb-2">Calculated Health Index</span>
            <div className="inline-flex items-center gap-2 bg-[#0A0A0A] px-4 py-2.5 rounded-2xl border border-[#474747]/40">
              <Activity size={16} className="text-[#D4FF00]" />
              <span className="text-sm font-bold text-white">BMI: {profile?.bmi || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
