import React, { useState, useEffect } from 'react';
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
  Heart 
} from 'lucide-react';

export default function Profile({ apiUrl, token, onLogout }) {
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
  
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const fetchProfileAndDiets = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch Profile
      const profRes = await fetch(`${apiUrl}/auth/profile`, { headers });
      const profData = await profRes.json();
      if (profRes.ok) {
        setProfile(profData.profile);
        setName(profData.profile.name);
        setAge(profData.profile.age || '');
        setGender(profData.profile.gender);
        setHeight(profData.profile.height || '');
        setWeight(profData.profile.weight || '');
        setGoalType(profData.profile.goal_type);
        setWaterGoal(profData.profile.water_goal_ml || 2000);
        setDietId(profData.profile.current_diet_id || '');
      }

      // Fetch Diet plans
      const dietRes = await fetch(`${apiUrl}/diet/plans`, { headers });
      const dietData = await dietRes.json();
      if (dietRes.ok) setDietPlans(dietData.plans);

    } catch (err) {
      console.error(err);
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
          current_diet_id: dietId ? parseInt(dietId) : null
        })
      });

      if (response.ok) {
        setSuccess(true);
        // Refresh local memory of user details in local storage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.name = name;
          userObj.goal_type = goalType;
          localStorage.setItem('user', JSON.stringify(userObj));
        }
        await fetchProfileAndDiets();
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update profile settings.');
      }
    } catch (err) {
      setError(err.message);
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
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Profile Settings & Achievements</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Configure your physical goals, change diet plans, or review earned badges.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 columns: Profile settings form */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl shadow-sm">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-dark-border">
            <Settings2 className="text-accent-emerald" size={20} />
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Body Parameters</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {success && (
              <div className="flex items-center gap-2 bg-emerald-500/10 text-accent-emerald border border-accent-emerald/20 p-4 rounded-xl text-xs font-bold">
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
                <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider">Account Username</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider">Age (Years)</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider">Height (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider">Primary Fitness Goal</label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="Fat Loss">Fat Loss</option>
                  <option value="Maintain">Maintain & Tone</option>
                  <option value="Muscle Gain">Muscle Gain (Bulk)</option>
                  <option value="Endurance">Endurance Training</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider">Water Intake Goal (ml)</label>
                <input
                  type="number"
                  value={waterGoal}
                  onChange={(e) => setWaterGoal(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-bold uppercase tracking-wider">Active Nutrition Diet Plan</label>
              <select
                value={dietId}
                onChange={(e) => setDietId(e.target.value)}
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:outline-none"
              >
                <option value="">No Active Diet Plan Selected</option>
                {dietPlans.map((plan) => (
                  <option key={plan.diet_id} value={plan.diet_id}>
                    {plan.diet_name} ({plan.calories} kcal | P: {plan.protein}g | C: {plan.carbs}g | F: {plan.fats}g)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-dark-border">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-accent-emerald to-accent-teal hover:opacity-90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-accent-emerald/10 transition-all flex items-center justify-center gap-1.5 text-sm"
              >
                <Check size={16} />
                Save Profile Parameters
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="px-6 py-3.5 border border-rose-500/20 hover:bg-rose-500/10 text-rose-500 rounded-xl font-bold transition-all text-sm flex items-center gap-1.5"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 column: Achievement badges showcase */}
        <div className="glass-panel p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-dark-border">
              <Award className="text-accent-violet" size={20} />
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Fitness Badges</h3>
            </div>
            
            {profile?.badges && profile.badges.length > 0 ? (
              <div className="space-y-4">
                {profile.badges.map((badge, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-100/50 dark:bg-white/[0.01] border border-slate-200/50 dark:border-white/5 hover:border-accent-violet/30 transition-all"
                  >
                    <div className="h-10 w-10 bg-gradient-to-tr from-accent-violet to-purple-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-violet-500/10">
                      <Heart size={18} className="fill-white/10" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100 block leading-snug">
                        {badge}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                        Unlocked & Earned
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">
                <Award size={36} className="mx-auto mb-2 text-slate-400 opacity-40" />
                <span>Your unlocked achievement badges will show up here. Keep active!</span>
              </div>
            )}
          </div>

          {/* Quick Body status stats brief */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-dark-border text-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Calculated Health Index</span>
            <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-white/5 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/5">
              <Activity size={16} className="text-accent-emerald" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">BMI: {profile?.bmi || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
