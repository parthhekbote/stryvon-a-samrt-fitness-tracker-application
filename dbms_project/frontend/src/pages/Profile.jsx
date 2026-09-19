import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Scale, 
  Settings2, 
  Droplet, 
  LogOut, 
  Check, 
  ShieldAlert, 
  Activity, 
  Loader2,
  Calendar,
  Users,
  Ruler,
  Target,
  Utensils,
  Edit3,
  X,
  AlertTriangle,
  Sparkles,
  Bell
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

export default function Profile({ apiUrl, token, onLogout, onUpdateUser }) {
  const [profile, setProfile] = useState(null);
  const [dietPlans, setDietPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goalType, setGoalType] = useState('Maintain');
  const [waterGoal, setWaterGoal] = useState('');
  const [dietId, setDietId] = useState('');
  const [streakWarningEnabled, setStreakWarningEnabled] = useState(true);
  
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
        const p = profData.profile;
        setProfile(p);
        setName(p.name || '');
        setAge(p.age || '');
        setGender(p.gender || 'Male');
        setHeight(p.height || '');
        setWeight(p.weight || '');
        setGoalType(p.goal_type || 'Maintain');
        setWaterGoal(p.water_goal_ml || 2000);
        setDietId(p.current_diet_id || '');
        setStreakWarningEnabled(p.streak_warning_enabled ?? true);
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
          current_diet_id: parsedDietId,
          streak_warning_enabled: streakWarningEnabled
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
        userObj.age = age ? parseInt(age) : null;
        userObj.gender = gender;
        userObj.height = height ? parseFloat(height) : null;
        userObj.weight = weight ? parseFloat(weight) : null;
        userObj.water_goal_ml = parseInt(waterGoal) || 2000;

        if (resData.profile) {
          userObj = { ...userObj, ...resData.profile };
          setProfile(resData.profile);
        }
        localStorage.setItem('user', JSON.stringify(userObj));
        
        if (typeof onUpdateUser === 'function') {
          onUpdateUser(userObj);
        }

        await fetchProfileAndDiets();
        setIsEditing(false); // Switch back to read-only summary view upon success
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
      <div className="h-full min-h-[400px] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-[#D4FF00] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // A profile is incomplete if required fields (Age, Gender, Height, Weight, Primary Goal) are missing or empty
  const isProfileIncomplete = !profile || 
    !profile.age || 
    !profile.gender || 
    !profile.height || 
    !profile.weight || 
    !profile.goal_type;

  // Editable form is shown directly if incomplete, or if user clicked "Edit Preferences"
  const isFormVisible = isProfileIncomplete || isEditing;

  // Active diet plan object for summary display
  const activeDiet = dietPlans.find(p => p.diet_id === profile?.current_diet_id);

  return (
    <div className="space-y-6 sm:space-y-8 text-white max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#474747]/30 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-wider flex items-center gap-3">
            <User className="text-[#D4FF00]" size={28} />
            User Profile
          </h1>
          <p className="text-[#E5E5E5]/70 text-xs sm:text-sm mt-1 font-medium">
            Manage your body metrics, fitness goals, and active nutrition preferences.
          </p>
        </div>

        {/* Edit Toggle Button for Existing Complete Users */}
        {!isProfileIncomplete && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded-full font-display font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all min-h-[38px] shadow-md shrink-0 border ${
              isEditing
                ? 'bg-[#1E1E1E] text-slate-300 border-[#474747] hover:bg-[#2A2A2A] hover:text-white'
                : 'bg-[#D4FF00] text-black border-[#D4FF00] hover:bg-[#b8de00]'
            }`}
          >
            {isEditing ? (
              <>
                <X size={15} />
                <span>Cancel Editing</span>
              </>
            ) : (
              <>
                <Edit3 size={15} />
                <span>Edit Preferences</span>
              </>
            )}
          </motion.button>
        )}
      </div>

      {/* New User Onboarding Alert Banner */}
      {isProfileIncomplete && (
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-r from-[#D4FF00]/15 via-[#1E1E1E] to-[#1E1E1E] border-2 border-[#D4FF00] p-5 rounded-3xl flex items-start sm:items-center justify-between gap-4 shadow-xl"
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-[#D4FF00] text-black rounded-2xl font-black shrink-0 shadow-md">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-white uppercase tracking-wider">
                Add your preferences to continue
              </h3>
              <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed">
                Please complete your required profile details below (Age, Gender, Height, Weight, Primary Goal, and Water Intake Goal). Your personalized workouts, diet targets, and AI Coach recommendations depend on this data.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Profile Display or Edit Form */}
        <div className="lg:col-span-2">
          
          {/* 1. READ-ONLY SUMMARY VIEW (For Existing Complete Users) */}
          {!isFormVisible && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1E1E1E] border border-[#474747]/40 p-5 sm:p-7 rounded-3xl shadow-xl space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#474747]/40">
                <div className="flex items-center gap-2.5">
                  <Settings2 className="text-[#D4FF00]" size={22} />
                  <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">
                    Profile Summary
                  </h2>
                </div>
                <span className="px-3 py-1 bg-[#D4FF00]/10 text-[#D4FF00] border border-[#D4FF00]/30 text-[11px] font-extrabold font-display uppercase tracking-widest rounded-full">
                  Profile Complete
                </span>
              </div>

              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Account Username */}
                <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-[#474747]/40 flex items-center gap-3.5">
                  <div className="p-2.5 bg-[#1E1E1E] text-[#D4FF00] rounded-xl border border-[#474747]/50">
                    <User size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#E5E5E5]/60 font-bold uppercase tracking-wider font-display block">Username</span>
                    <span className="text-sm font-extrabold text-white">{profile?.name || 'Not Set'}</span>
                  </div>
                </div>

                {/* Age */}
                <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-[#474747]/40 flex items-center gap-3.5">
                  <div className="p-2.5 bg-[#1E1E1E] text-[#D4FF00] rounded-xl border border-[#474747]/50">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#E5E5E5]/60 font-bold uppercase tracking-wider font-display block">Age</span>
                    <span className="text-sm font-extrabold text-white">{profile?.age ? `${profile.age} Years` : 'Not Set'}</span>
                  </div>
                </div>

                {/* Gender */}
                <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-[#474747]/40 flex items-center gap-3.5">
                  <div className="p-2.5 bg-[#1E1E1E] text-[#D4FF00] rounded-xl border border-[#474747]/50">
                    <Users size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#E5E5E5]/60 font-bold uppercase tracking-wider font-display block">Gender</span>
                    <span className="text-sm font-extrabold text-white">{profile?.gender || 'Not Set'}</span>
                  </div>
                </div>

                {/* Height */}
                <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-[#474747]/40 flex items-center gap-3.5">
                  <div className="p-2.5 bg-[#1E1E1E] text-[#D4FF00] rounded-xl border border-[#474747]/50">
                    <Ruler size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#E5E5E5]/60 font-bold uppercase tracking-wider font-display block">Height</span>
                    <span className="text-sm font-extrabold text-white">{profile?.height ? `${profile.height} cm` : 'Not Set'}</span>
                  </div>
                </div>

                {/* Weight */}
                <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-[#474747]/40 flex items-center gap-3.5">
                  <div className="p-2.5 bg-[#1E1E1E] text-[#D4FF00] rounded-xl border border-[#474747]/50">
                    <Scale size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#E5E5E5]/60 font-bold uppercase tracking-wider font-display block">Weight</span>
                    <span className="text-sm font-extrabold text-white">{profile?.weight ? `${profile.weight} kg` : 'Not Set'}</span>
                  </div>
                </div>

                {/* Primary Fitness Goal */}
                <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-[#474747]/40 flex items-center gap-3.5">
                  <div className="p-2.5 bg-[#1E1E1E] text-[#D4FF00] rounded-xl border border-[#474747]/50">
                    <Target size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#E5E5E5]/60 font-bold uppercase tracking-wider font-display block">Primary Goal</span>
                    <span className="text-sm font-extrabold text-white">{profile?.goal_type || 'Not Set'}</span>
                  </div>
                </div>

                {/* Water Intake Goal */}
                <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-[#474747]/40 flex items-center gap-3.5">
                  <div className="p-2.5 bg-[#1E1E1E] text-[#D4FF00] rounded-xl border border-[#474747]/50">
                    <Droplet size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#E5E5E5]/60 font-bold uppercase tracking-wider font-display block">Water Intake Goal</span>
                    <span className="text-sm font-extrabold text-white">{profile?.water_goal_ml ? `${profile.water_goal_ml} ml / day` : 'Not Set'}</span>
                  </div>
                </div>

                {/* Active Diet Plan */}
                <div className="bg-[#0A0A0A] p-4 rounded-2xl border border-[#474747]/40 flex items-center gap-3.5">
                  <div className="p-2.5 bg-[#1E1E1E] text-[#D4FF00] rounded-xl border border-[#474747]/50">
                    <Utensils size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#E5E5E5]/60 font-bold uppercase tracking-wider font-display block">Active Diet Plan</span>
                    <span className="text-sm font-extrabold text-white">
                      {activeDiet ? activeDiet.diet_name : (profile?.current_diet_id ? `Diet #${profile.current_diet_id}` : 'No Diet Selected')}
                    </span>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* 2. EDITABLE FORM VIEW (For New Users or Edit Mode) */}
          {isFormVisible && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1E1E1E] border border-[#474747]/40 p-5 sm:p-7 rounded-3xl shadow-xl"
            >
              <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-[#474747]/40">
                <Settings2 className="text-[#D4FF00]" size={22} />
                <h2 className="font-display font-bold text-lg text-white uppercase tracking-wider">
                  {isProfileIncomplete ? 'Complete Your Preferences' : 'Edit Profile Preferences'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-7">
                {success && (
                  <div className="flex items-center gap-2 bg-[#D4FF00]/10 text-[#D4FF00] border border-[#D4FF00]/30 p-4 rounded-xl text-xs font-bold font-display uppercase tracking-wider">
                    <Check size={16} />
                    <span>Profile parameters updated successfully!</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 bg-rose-500/10 text-rose-500 border border-rose-500/30 p-4 rounded-xl text-xs font-bold">
                    <ShieldAlert size={16} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Sub-section 1: Personal Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#D4FF00] font-display border-b border-[#474747]/30 pb-2">
                    <User size={16} />
                    <span>Personal Info</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-[#E5E5E5]/70 flex items-center gap-1.5 mb-1.5 font-bold uppercase tracking-wider font-display">
                        <User size={13} className="text-[#D4FF00]" />
                        Username *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your Name"
                        className="w-full bg-[#0A0A0A] border border-[#474747] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] focus:shadow-[0_0_12px_rgba(212,255,0,0.25)] transition-all min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[#E5E5E5]/70 flex items-center gap-1.5 mb-1.5 font-bold uppercase tracking-wider font-display">
                        <Calendar size={13} className="text-[#D4FF00]" />
                        Age (Years) *
                      </label>
                      <input
                        type="number"
                        required
                        min="10"
                        max="120"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 26"
                        className="w-full bg-[#0A0A0A] border border-[#474747] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] focus:shadow-[0_0_12px_rgba(212,255,0,0.25)] transition-all min-h-[44px]"
                      />
                    </div>

                    <div>
                      <CustomSelect
                        label="Gender"
                        icon={Users}
                        required
                        value={gender}
                        onChange={setGender}
                        options={[
                          { value: 'Male', label: 'Male' },
                          { value: 'Female', label: 'Female' },
                          { value: 'Other', label: 'Other' }
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-section 2: Body Metrics */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#D4FF00] font-display border-b border-[#474747]/30 pb-2">
                    <Scale size={16} />
                    <span>Body Metrics</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-[#E5E5E5]/70 flex items-center gap-1.5 mb-1.5 font-bold uppercase tracking-wider font-display">
                        <Ruler size={13} className="text-[#D4FF00]" />
                        Height (cm) *
                      </label>
                      <input
                        type="number"
                        required
                        min="50"
                        max="250"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="e.g. 175"
                        className="w-full bg-[#0A0A0A] border border-[#474747] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] focus:shadow-[0_0_12px_rgba(212,255,0,0.25)] transition-all min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[#E5E5E5]/70 flex items-center gap-1.5 mb-1.5 font-bold uppercase tracking-wider font-display">
                        <Scale size={13} className="text-[#D4FF00]" />
                        Weight (kg) *
                      </label>
                      <input
                        type="number"
                        required
                        step="0.1"
                        min="20"
                        max="300"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="e.g. 72.5"
                        className="w-full bg-[#0A0A0A] border border-[#474747] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] focus:shadow-[0_0_12px_rgba(212,255,0,0.25)] transition-all min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-section 3: Goals & Nutrition */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#D4FF00] font-display border-b border-[#474747]/30 pb-2">
                    <Target size={16} />
                    <span>Goals & Nutrition</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <CustomSelect
                        label="Primary Fitness Goal"
                        icon={Target}
                        required
                        value={goalType}
                        onChange={setGoalType}
                        options={[
                          { value: 'Fat Loss', label: 'Fat Loss' },
                          { value: 'Maintain', label: 'Maintain & Tone' },
                          { value: 'Muscle Gain', label: 'Muscle Gain (Bulk)' },
                          { value: 'Endurance', label: 'Endurance Training' }
                        ]}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[#E5E5E5]/70 flex items-center gap-1.5 mb-1.5 font-bold uppercase tracking-wider font-display">
                        <Droplet size={13} className="text-[#D4FF00]" />
                        Water Intake Goal (ml) *
                      </label>
                      <input
                        type="number"
                        required
                        step="50"
                        min="500"
                        max="10000"
                        value={waterGoal}
                        onChange={(e) => setWaterGoal(e.target.value)}
                        placeholder="e.g. 2500"
                        className="w-full bg-[#0A0A0A] border border-[#474747] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] focus:shadow-[0_0_12px_rgba(212,255,0,0.25)] transition-all min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div>
                    <CustomSelect
                      label="Active Nutrition Diet Plan"
                      icon={Utensils}
                      value={dietId}
                      onChange={setDietId}
                      placeholder="No Active Diet Plan Selected"
                      options={[
                        { value: '', label: 'No Active Diet Plan Selected' },
                        ...dietPlans.map((plan) => ({
                          value: plan.diet_id,
                          label: `${plan.diet_name} (${plan.calories} kcal | P: ${plan.protein}g | C: ${plan.carbs}g | F: ${plan.fats}g)`
                        }))
                      ]}
                    />
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#474747]/40">
                  {!isProfileIncomplete && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="w-full sm:w-auto px-5 py-3 border border-[#474747] hover:border-slate-300 text-slate-300 hover:text-white rounded-xl font-display font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                    >
                      <X size={16} />
                      <span>Cancel</span>
                    </button>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={saving}
                    className={`w-full sm:w-auto px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-extrabold shadow-lg min-h-[44px] cursor-pointer ${
                      savedSuccess
                        ? 'bg-[#D4FF00] text-black shadow-[0_0_20px_rgba(212,255,0,0.5)]'
                        : 'bg-[#D4FF00] hover:bg-[#b8de00] text-black'
                    }`}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>SAVING PARAMETERS...</span>
                      </>
                    ) : savedSuccess ? (
                      <>
                        <Check size={16} className="stroke-[3]" />
                        <span>PREFERENCES SAVED SUCCESSFULLY!</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} className="stroke-[2.5]" />
                        <span>SAVE PROFILE PARAMETERS</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}

        </div>

        {/* Right 1 Column: Notifications, Health Index & Account Actions */}
        <div className="space-y-6">

          {/* Notifications & Preferences Card */}
          <div className="bg-[#1E1E1E] border border-[#474747]/40 p-5 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#474747]/40">
              <Bell className="text-[#D4FF00]" size={20} />
              <h3 className="font-display font-bold text-base text-white uppercase tracking-wider">
                Notifications & Alerts
              </h3>
            </div>

            <div className="p-4 bg-[#0A0A0A] border border-[#474747]/40 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider font-display block">Streak Inactivity Warnings</span>
                <span className="text-[11px] text-[#E5E5E5]/60 font-medium block mt-1 leading-normal">
                  Receive notifications when 5–6 consecutive rest days are detected before streak resets.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={streakWarningEnabled}
                  onChange={(e) => setStreakWarningEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#474747] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4FF00] peer-checked:after:bg-black"></div>
              </label>
            </div>
          </div>

          {/* Calculated Health Index Card (BMI) */}
          <div className="bg-[#1E1E1E] border border-[#474747]/40 p-5 rounded-3xl shadow-xl space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 pb-3 border-b border-[#474747]/40">
              <Activity className="text-[#D4FF00]" size={20} />
              <h3 className="font-display font-bold text-base text-white uppercase tracking-wider">
                Calculated Health Index
              </h3>
            </div>

            <div className="py-3 px-4 bg-[#0A0A0A] rounded-2xl border border-[#474747]/40 space-y-2">
              <span className="text-xs text-[#E5E5E5]/60 font-bold uppercase tracking-wider font-display block">Body Mass Index (BMI)</span>
              <div className="text-3xl font-black text-[#D4FF00] tracking-tight font-display">
                {profile?.bmi ? profile.bmi : 'N/A'}
              </div>
              <p className="text-[11px] text-[#E5E5E5]/50 font-medium">
                Auto-calculated based on Height ({profile?.height || '--'} cm) and Weight ({profile?.weight || '--'} kg).
              </p>
            </div>
          </div>

          {/* Account Actions (Logout) */}
          <div className="bg-[#1E1E1E] border border-[#474747]/40 p-5 rounded-3xl shadow-xl space-y-4">
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={onLogout}
              className="w-full py-3 px-4 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 rounded-2xl font-display font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 min-h-[44px] cursor-pointer shadow-md"
            >
              <LogOut size={16} />
              <span>EXIT ACCOUNT</span>
            </motion.button>

            {/* Built By Developer Attribution */}
            <div className="pt-3 border-t border-[#474747]/30 text-center flex items-center justify-center gap-1.5 text-xs">
              <span className="text-[#E5E5E5]/60 font-medium lowercase">
                built by
              </span>
              <a 
                href="mailto:parthh.ekbote@gmail.com"
                className="text-[#D4FF00] font-semibold lowercase hover:underline transition-all"
              >
                parthh.ekbote@gmail.com
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
