import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  History, 
  Play, 
  Trash2, 
  Dumbbell, 
  Calendar, 
  Clock, 
  Flame, 
  Check, 
  ChevronRight, 
  Tag,
  X,
  CheckCircle2,
  AlertCircle,
  Shuffle,
  Sparkles,
  Layers,
  Square,
  CheckSquare
} from 'lucide-react';
import Toast from '../components/Toast';

const MUSCLE_OPTIONS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'biceps', 'triceps', 'quads', 'glutes', 'core', 'abs'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Workouts({ apiUrl, token }) {
  const [workouts, setWorkouts] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('templates'); // 'templates', 'history', 'log'

  // Day-Based & Muscle Group Scheduling State
  const [suggestedData, setSuggestedData] = useState(null); // { suggested, program, allDays }
  const [programs, setPrograms] = useState([]);
  const [currentWorkoutDayRef, setCurrentWorkoutDayRef] = useState(null);
  const [isCustomSession, setIsCustomSession] = useState(false);
  const [customMuscleTags, setCustomMuscleTags] = useState([]);

  // Modals State
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showFreestyleModal, setShowFreestyleModal] = useState(false);
  const [showAddExPicker, setShowAddExPicker] = useState(false);
  const [customExInput, setCustomExInput] = useState('');

  // Freestyle Workout Selection State
  const [freestyleSelectedExs, setFreestyleSelectedExs] = useState([]);
  const [freestyleTags, setFreestyleTags] = useState([]);

  // Program Creation Wizard State
  const [progName, setProgName] = useState('');
  const [progMode, setProgMode] = useState('fixed'); // 'fixed' | 'rotating'
  const [progIsActive, setProgIsActive] = useState(true);
  const [progDays, setProgDays] = useState([
    { name: 'Push Day', muscle_groups: ['chest', 'shoulders', 'triceps'], fixed_weekday: 'Monday', workout_id: null },
    { name: 'Pull Day', muscle_groups: ['back', 'biceps'], fixed_weekday: 'Wednesday', workout_id: null },
    { name: 'Leg Day', muscle_groups: ['quads', 'glutes', 'hamstrings'], fixed_weekday: 'Friday', workout_id: null }
  ]);

  const handleAddProgDay = () => {
    const nextNum = progDays.length + 1;
    const defaultWeekday = WEEKDAYS[(progDays.length) % WEEKDAYS.length];
    setProgDays(prev => [
      ...prev,
      {
        name: `Day ${nextNum}`,
        muscle_groups: [],
        fixed_weekday: defaultWeekday,
        workout_id: null
      }
    ]);
  };

  const handleRemoveProgDay = (index) => {
    if (progDays.length <= 1) return;
    setProgDays(prev => prev.filter((_, idx) => idx !== index));
  };

  // Log Workout Session State
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [logDuration, setLogDuration] = useState('');
  const [logCalories, setLogCalories] = useState('');
  const [logExercises, setLogExercises] = useState([]); // [{ exercise_id, exercise_name }]
  const [checkedExercises, setCheckedExercises] = useState({}); // { [exercise_name]: boolean }
  const [submitStatus, setSubmitStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [toast, setToast] = useState(null);

  const fetchWorkoutsAndHistory = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch Workouts
      const workRes = await fetch(`${apiUrl}/workouts`, { headers });
      const workData = await workRes.json();
      if (workRes.ok) setWorkouts(workData.workouts);

      // Fetch History
      const histRes = await fetch(`${apiUrl}/workouts/history`, { headers });
      const histData = await histRes.json();
      if (histRes.ok) setHistory(histData.history);

      // Fetch Exercise Catalog
      const exRes = await fetch(`${apiUrl}/exercises`, { headers });
      const exData = await exRes.json();
      if (exRes.ok) setExercises(exData.exercises);

      // Fetch Scheduling Data
      await fetchSchedulingData();

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedulingData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const localWeekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });

      // Suggested Workout
      const sugRes = await fetch(`${apiUrl}/workouts/suggested?weekday=${encodeURIComponent(localWeekday)}`, { headers });
      const sugData = await sugRes.json();
      if (sugRes.ok) setSuggestedData(sugData);

      // Programs List
      const progRes = await fetch(`${apiUrl}/workouts/programs`, { headers });
      const progData = await progRes.json();
      if (progRes.ok) setPrograms(progData.programs || []);

    } catch (err) {
      console.error('Failed to fetch scheduling data:', err);
    }
  };

  useEffect(() => {
    fetchWorkoutsAndHistory();
  }, [token]);

  // Handle starting a Workout Day (Suggested or Swapped)
  const handleStartWorkoutDay = async (workoutDay) => {
    setLoading(true);
    try {
      let exerciseList = workoutDay.exercises || [];

      // Fetch exercises if linked to a template workout
      if ((!exerciseList || exerciseList.length === 0) && workoutDay.workout_id) {
        const res = await fetch(`${apiUrl}/workouts/${workoutDay.workout_id}/exercises`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) exerciseList = data.exercises || [];
      }

      // Match exercises by muscle groups or day name if empty
      if (!exerciseList || exerciseList.length === 0) {
        const targetTags = new Set();
        if (workoutDay.muscle_groups && Array.isArray(workoutDay.muscle_groups)) {
          workoutDay.muscle_groups.forEach(m => targetTags.add(m.toLowerCase()));
        }
        
        const dayNameLower = (workoutDay.name || '').toLowerCase();
        if (dayNameLower.includes('push')) { ['chest', 'shoulders', 'triceps'].forEach(m => targetTags.add(m)); }
        if (dayNameLower.includes('pull')) { ['back', 'biceps'].forEach(m => targetTags.add(m)); }
        if (dayNameLower.includes('leg')) { ['legs', 'quads', 'glutes', 'hamstrings', 'calves'].forEach(m => targetTags.add(m)); }
        if (dayNameLower.includes('abs') || dayNameLower.includes('core')) { ['abs', 'core'].forEach(m => targetTags.add(m)); }
        if (dayNameLower.includes('chest')) { targetTags.add('chest'); }
        if (dayNameLower.includes('shoulder')) { targetTags.add('shoulders'); }
        if (dayNameLower.includes('arm')) { ['biceps', 'triceps'].forEach(m => targetTags.add(m)); }
        if (dayNameLower.includes('cardio')) { targetTags.add('cardio'); }

        const tagsArr = Array.from(targetTags);

        if (tagsArr.length > 0) {
          const matchedExs = exercises.filter(ex => {
            const exMg = (ex.muscle_group || '').toLowerCase();
            const exMgs = (ex.muscle_groups || []).map(m => m.toLowerCase());
            return tagsArr.some(t => exMg.includes(t) || t.includes(exMg) || exMgs.some(m => m.includes(t)));
          });
          if (matchedExs.length > 0) {
            exerciseList = matchedExs;
          }
        }

        if (!exerciseList || exerciseList.length === 0) {
          exerciseList = exercises.slice(0, 4);
        }
      }

      // Limit to max 4 exercises per session
      if (exerciseList && exerciseList.length > 4) {
        exerciseList = exerciseList.slice(0, 4);
      }

      const initialChecked = {};
      exerciseList.forEach(ex => {
        initialChecked[ex.exercise_name] = true;
      });

      setSelectedWorkout({
        workout_id: workoutDay.workout_id,
        workout_name: workoutDay.name
      });
      setCurrentWorkoutDayRef(workoutDay.workout_day_id);
      setIsCustomSession(false);
      setCustomMuscleTags(workoutDay.muscle_groups || []);
      setLogDuration('45');
      setLogCalories('');
      setLogExercises(exerciseList);
      setCheckedExercises(initialChecked);
      setShowSwapModal(false);
      setActiveTab('log');

    } catch (err) {
      console.error('Error starting workout day:', err);
      alert('Error initializing workout session.');
    } finally {
      setLoading(false);
    }
  };

  // Handle starting a traditional template workout
  const handleStartLog = async (workout) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/workouts/${workout.workout_id}/exercises`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        const exList = data.exercises || [];
        const initialChecked = {};
        exList.forEach(ex => {
          initialChecked[ex.exercise_name] = true;
        });

        setSelectedWorkout(workout);
        setCurrentWorkoutDayRef(null);
        setIsCustomSession(false);
        setCustomMuscleTags([]);
        setLogDuration(workout.duration ? String(workout.duration) : '45');
        setLogCalories(workout.calories_burned ? String(workout.calories_burned) : '');
        setLogExercises(exList);
        setCheckedExercises(initialChecked);
        setActiveTab('log');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle selection for Freestyle Workout Builder
  const handleToggleFreestyleEx = (exercise) => {
    const exists = freestyleSelectedExs.some(e => e.exercise_id === exercise.exercise_id);
    let updated = [];
    if (exists) {
      updated = freestyleSelectedExs.filter(e => e.exercise_id !== exercise.exercise_id);
    } else {
      updated = [...freestyleSelectedExs, exercise];
    }
    setFreestyleSelectedExs(updated);

    // Auto-infer muscle tags from selected exercises
    const tagSet = new Set();
    updated.forEach(ex => {
      if (ex.muscle_group) tagSet.add(ex.muscle_group.toLowerCase());
      if (ex.muscle_groups && Array.isArray(ex.muscle_groups)) {
        ex.muscle_groups.forEach(t => tagSet.add(t.toLowerCase()));
      }
    });
    setFreestyleTags(Array.from(tagSet));
  };

  // Confirm Freestyle Workout and launch logging session
  const handleStartFreestyleSession = () => {
    if (freestyleSelectedExs.length === 0) {
      alert('Please select at least one exercise for your freestyle session.');
      return;
    }

    const initialChecked = {};
    freestyleSelectedExs.forEach(ex => {
      initialChecked[ex.exercise_name] = true;
    });

    setSelectedWorkout({ workout_id: null, workout_name: 'Freestyle Session' });
    setCurrentWorkoutDayRef(null);
    setIsCustomSession(true);
    setCustomMuscleTags(freestyleTags);
    setLogDuration('45');
    setLogCalories('');
    setLogExercises(freestyleSelectedExs);
    setCheckedExercises(initialChecked);
    setShowFreestyleModal(false);
    setShowSwapModal(false);
    setActiveTab('log');
  };

  // Create Program Submission
  const handleCreateProgramSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/workouts/programs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          program_name: progName,
          schedule_mode: progMode,
          is_active: progIsActive,
          days: progDays
        })
      });

      if (response.ok) {
        setShowProgramModal(false);
        setProgName('');
        await fetchSchedulingData();
        setToast({
          type: 'success',
          title: 'Program Created! 🎯',
          message: `Successfully saved ${progName}.`
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Exercise Checkbox in Log view
  const handleToggleExerciseCheck = (exerciseName) => {
    setCheckedExercises(prev => ({
      ...prev,
      [exerciseName]: !prev[exerciseName]
    }));
  };

  // Select all or Deselect all exercises
  const handleToggleSelectAll = (selectAll) => {
    const nextChecked = {};
    logExercises.forEach(ex => {
      nextChecked[ex.exercise_name] = selectAll;
    });
    setCheckedExercises(nextChecked);
  };

  // Remove Exercise from Session Checklist
  const handleRemoveExerciseFromSession = (exerciseName) => {
    setLogExercises(prev => prev.filter(ex => ex.exercise_name !== exerciseName));
    setCheckedExercises(prev => {
      const updated = { ...prev };
      delete updated[exerciseName];
      return updated;
    });
  };

  // Submit Completed Workout Checklist
  const handleSubmitLog = async (e) => {
    e.preventDefault();
    setSubmitStatus('submitting');
    setLoading(true);
    
    // Filter completed exercise names
    const completedExerciseNames = logExercises
      .filter(ex => checkedExercises[ex.exercise_name] !== false)
      .map(ex => ex.exercise_name);

    try {
      const response = await fetch(`${apiUrl}/workouts/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workout_id: selectedWorkout?.workout_id || null,
          workout_day_id: currentWorkoutDayRef,
          custom_name: selectedWorkout?.workout_name || null,
          is_custom: isCustomSession,
          muscle_groups: customMuscleTags,
          duration: parseInt(logDuration),
          calories_burned: logCalories ? parseInt(logCalories) : null,
          completed_exercises: completedExerciseNames
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        
        const estBurn = logCalories ? parseInt(logCalories) : (data.caloriesBurned || Math.round(parseInt(logDuration) * 7.5));
        
        setToast({
          type: 'success',
          title: 'Workout Complete! 💪',
          message: 'Checklist recorded successfully. Great effort today!',
          summary: {
            exercises: completedExerciseNames.length,
            duration: logDuration,
            calories: estBurn
          }
        });

        setTimeout(async () => {
          setSelectedWorkout(null);
          setLogExercises([]);
          setCheckedExercises({});
          setSubmitStatus('idle');
          await fetchWorkoutsAndHistory();
          setActiveTab('history');
          setToast(null);
        }, 1200);

      } else {
        setSubmitStatus('error');
        setToast({
          type: 'error',
          title: 'Save Failed',
          message: data.message || "Couldn't save your session, please try again."
        });
        setTimeout(() => setSubmitStatus('idle'), 3000);
      }
    } catch (err) {
      console.error('Submit workout error:', err);
      setSubmitStatus('error');
      setToast({
        type: 'error',
        title: 'Connection Error',
        message: "Couldn't connect to server. Please check your network and try again."
      });
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (loading && workouts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-[#D4FF00] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const suggestedDay = suggestedData?.suggested;
  const activeProgram = suggestedData?.program;

  const todayWeekdayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 relative"
    >
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#474747]/30 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display uppercase tracking-wide">WORKOUTS</h1>
          <p className="text-slate-400 text-sm mt-0.5">Your daily workout routine schedule.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-[#1E1E1E] p-1.5 rounded-2xl border border-[#474747]/40 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer min-h-[44px] ${activeTab === 'templates' ? 'bg-[#D4FF00] text-black shadow-md' : 'text-[#E5E5E5] hover:text-white'}`}
          >
            <Calendar size={15} />
            Today's Workout
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer min-h-[44px] ${activeTab === 'history' ? 'bg-[#D4FF00] text-black shadow-md' : 'text-[#E5E5E5] hover:text-white'}`}
          >
            <History size={15} />
            History Log
          </button>
          <button
            onClick={() => setShowProgramModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold font-display uppercase tracking-wider bg-[#0A0A0A] hover:bg-[#262626] text-[#D4FF00] border border-[#D4FF00]/40 cursor-pointer transition-all min-h-[44px]"
          >
            <Plus size={15} />
            + Routine
          </button>
        </div>
      </div>

      {/* VIEW: Today's Schedule & Suggested Workout */}
      {activeTab === 'templates' && (
        <div className="space-y-6">

          {/* Today's Workout Main Card */}
          {suggestedData?.isRestDay ? (
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#1E1E1E] border border-emerald-500/40 p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
            >
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider font-display bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/30">
                  TODAY — {todayWeekdayName.toUpperCase()}
                </span>
                <h2 className="font-display text-3xl font-extrabold text-white uppercase tracking-wide">
                  REST DAY
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  No workout assigned for {todayWeekdayName}. Take time to recover or start any routine day below.
                </p>
              </div>
            </motion.div>
          ) : suggestedDay ? (
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-[#1E1E1E] via-[#1E1E1E] to-[#0A0A0A] border-2 border-[#D4FF00]/60 p-8 rounded-3xl shadow-[0_0_35px_rgba(212,255,0,0.12)] relative overflow-hidden"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#D4FF00] uppercase tracking-wider font-display bg-[#D4FF00]/10 px-3 py-1 rounded-lg border border-[#D4FF00]/30">
                      TODAY — {todayWeekdayName.toUpperCase()}
                    </span>
                    {activeProgram?.program_name && (
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">
                        ({activeProgram.program_name})
                      </span>
                    )}
                  </div>

                  <h2 className="font-display text-4xl font-extrabold text-white uppercase tracking-wide">
                    {suggestedDay.name}
                  </h2>

                  {/* Muscle Groups tags */}
                  {suggestedDay.muscle_groups && suggestedDay.muscle_groups.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {suggestedDay.muscle_groups.map((mg, i) => (
                        <span key={i} className="text-xs font-bold uppercase tracking-wider font-display px-3 py-1 rounded-lg bg-[#0A0A0A] text-[#E5E5E5] border border-[#474747]/50">
                          {mg}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-full md:w-auto">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleStartWorkoutDay(suggestedDay)}
                    className="w-full md:w-auto bg-[#D4FF00] hover:bg-[#c2eb00] text-[#0A0A0A] font-extrabold font-display px-8 py-4 rounded-2xl shadow-xl shadow-[#D4FF00]/25 text-base uppercase tracking-wider flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <Play size={20} className="fill-[#0A0A0A]" />
                    START TODAY'S WORKOUT
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-[#1E1E1E] border border-[#474747]/40 p-8 rounded-3xl text-center space-y-3">
              <h3 className="font-display text-xl font-bold text-white uppercase">No Workout Routine Set</h3>
              <p className="text-xs text-slate-400 font-medium">Add a routine to automatically see your daily workouts.</p>
              <button
                onClick={() => setShowProgramModal(true)}
                className="bg-[#D4FF00] text-black px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider font-display inline-flex items-center gap-2 cursor-pointer mt-2"
              >
                <Plus size={16} /> + Add Workout Routine
              </button>
            </div>
          )}

          {/* Routine Days / Weekly Overview */}
          {suggestedData?.allDays && suggestedData.allDays.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center">
                <h3 className="font-display text-lg font-bold text-white uppercase tracking-wide">ROUTINE DAYS</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {suggestedData.allDays.map((day) => {
                  const isTodayDay = suggestedDay?.workout_day_id === day.workout_day_id;
                  return (
                    <div 
                      key={day.workout_day_id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                        isTodayDay 
                          ? 'bg-[#1E1E1E] border-[#D4FF00] shadow-md' 
                          : 'bg-[#1E1E1E] border-[#474747]/40 hover:border-[#474747]'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider font-display text-slate-400">
                            {day.fixed_weekday || `Day ${day.order_index}`}
                          </span>
                          {isTodayDay && (
                            <span className="text-[10px] font-black uppercase tracking-wider font-display bg-[#D4FF00] text-black px-2 py-0.5 rounded">
                              TODAY
                            </span>
                          )}
                        </div>
                        <h4 className="font-display text-xl font-extrabold text-white uppercase">{day.name}</h4>
                        {day.muscle_groups && day.muscle_groups.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {day.muscle_groups.map((mg, i) => (
                              <span key={i} className="text-[10px] font-bold uppercase tracking-wider font-display px-2 py-0.5 rounded bg-[#0A0A0A] text-slate-300 border border-[#474747]/30">
                                {mg}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleStartWorkoutDay(day)}
                        className={`w-full py-2.5 rounded-xl font-bold font-display text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          isTodayDay 
                            ? 'bg-[#D4FF00] hover:bg-[#c2eb00] text-black' 
                            : 'bg-[#0A0A0A] hover:bg-[#262626] text-white border border-[#474747]/40'
                        }`}
                      >
                        <Play size={14} className={isTodayDay ? 'fill-black' : 'fill-white'} />
                        Start Session
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Standard Templates (if user has custom library) */}
          {workouts && workouts.length > 0 && (!suggestedData?.allDays || suggestedData.allDays.length === 0) && (
            <div className="space-y-4 pt-2">
              <h3 className="font-display text-lg font-bold text-white uppercase tracking-wide">TEMPLATES LIBRARY</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workouts.map((workout) => (
                  <div 
                    key={workout.workout_id} 
                    className="bg-[#1E1E1E] border border-[#474747]/40 p-5 rounded-2xl flex justify-between items-center"
                  >
                    <div>
                      <h4 className="font-display text-lg font-bold text-white uppercase">{workout.workout_name}</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{workout.duration} mins • {workout.calories_burned} kcal</p>
                    </div>
                    <button
                      onClick={() => handleStartLog(workout)}
                      className="bg-[#D4FF00] hover:bg-[#c2eb00] text-black font-extrabold font-display px-4 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play size={14} className="fill-black" />
                      Start
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: Active Workout Logging Session Checklist */}
      {activeTab === 'log' && selectedWorkout && (
        <form onSubmit={handleSubmitLog} className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-[#474747]/30">
            <div>
              <span className="text-xs text-[#D4FF00] font-bold uppercase tracking-wider font-display">ACTIVE CHECKLIST SESSION</span>
              <div className="mt-1">
                <input
                  type="text"
                  value={selectedWorkout.workout_name || ''}
                  onChange={(e) => setSelectedWorkout(prev => ({ ...prev, workout_name: e.target.value }))}
                  className="font-display text-2xl sm:text-3xl font-extrabold text-white uppercase bg-transparent border-b-2 border-transparent hover:border-[#D4FF00]/40 focus:border-[#D4FF00] focus:outline-none transition-all py-0.5 w-full"
                  placeholder="WORKOUT NAME"
                  title="Click to edit workout name"
                />
              </div>
              {customMuscleTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {customMuscleTags.map((tag, tIdx) => (
                    <span key={tIdx} className="text-[10px] font-bold bg-[#D4FF00]/15 text-[#D4FF00] px-2 py-0.5 rounded font-display uppercase">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button 
              type="button" 
              onClick={() => setActiveTab('templates')}
              className="text-xs text-[#474747] hover:text-white font-bold font-display uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </button>
          </div>



          {/* Exercise Checklist */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-xl font-bold text-white uppercase tracking-wide">EXERCISE CHECKLIST</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(true)}
                  className="text-[11px] font-bold text-[#D4FF00] hover:underline font-display uppercase tracking-wider cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-[11px] text-[#474747]">|</span>
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(false)}
                  className="text-[11px] font-bold text-slate-400 hover:text-white hover:underline font-display uppercase tracking-wider cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              <AnimatePresence mode="popLayout">
                {logExercises.map((ex, exIdx) => {
                  const isChecked = checkedExercises[ex.exercise_name] !== false;
                  return (
                    <motion.div
                      key={ex.exercise_name || exIdx}
                      layout
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -30, height: 0, marginBottom: 0, padding: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      onClick={() => handleToggleExerciseCheck(ex.exercise_name)}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked 
                          ? 'bg-[#D4FF00]/10 border-[#D4FF00]/50 text-white shadow-sm' 
                          : 'bg-[#0A0A0A] border-[#474747]/40 text-[#474747] opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`p-1.5 rounded-lg shrink-0 transition-colors flex items-center justify-center min-h-[36px] min-w-[36px] ${isChecked ? 'bg-[#D4FF00] text-black' : 'bg-[#1E1E1E] text-[#474747] border border-[#474747]/50'}`}>
                          <motion.div
                            key={isChecked ? 'check' : 'uncheck'}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: [1.25, 1], opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                          >
                            {isChecked ? <Check size={18} strokeWidth={3} /> : <Square size={18} />}
                          </motion.div>
                        </div>
                        <span className={`font-extrabold text-sm sm:text-base font-display truncate ${isChecked ? 'text-white' : 'text-[#474747] line-through'}`}>
                          {ex.exercise_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider ${isChecked ? 'text-[#D4FF00]' : 'text-[#474747]'}`}>
                          {isChecked ? 'DONE ✓' : 'SKIPPED'}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveExerciseFromSession(ex.exercise_name);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-2.5 rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Delete exercise from session"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Add More Exercises Button & Picker */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAddExPicker(!showAddExPicker)}
                className="w-full py-3 rounded-2xl border border-dashed border-[#D4FF00]/50 bg-[#D4FF00]/10 hover:bg-[#D4FF00]/20 text-[#D4FF00] font-bold font-display text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Plus size={16} /> + Add More Exercises to Session
              </button>

              {showAddExPicker && (
                <div className="mt-3 bg-[#0A0A0A] border border-[#474747]/40 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-[#474747]/30">
                    <span className="text-xs font-bold text-white font-display uppercase tracking-wider">
                      Add Exercise to Checklist
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setShowAddExPicker(false)}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer font-bold font-display uppercase"
                    >
                      Close
                    </button>
                  </div>

                  {/* Add Custom Exercise Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type custom exercise name..."
                      value={customExInput}
                      onChange={(e) => setCustomExInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (customExInput.trim()) {
                            const name = customExInput.trim();
                            if (!logExercises.some(ex => ex.exercise_name.toLowerCase() === name.toLowerCase())) {
                              const newEx = { exercise_id: Date.now(), exercise_name: name, muscle_group: customMuscleTags[0] || 'Custom' };
                              setLogExercises(prev => [...prev, newEx]);
                              setCheckedExercises(prev => ({ ...prev, [name]: true }));
                            }
                            setCustomExInput('');
                          }
                        }
                      }}
                      className="flex-1 bg-[#1E1E1E] border border-[#474747]/40 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#D4FF00]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customExInput.trim()) {
                          const name = customExInput.trim();
                          if (!logExercises.some(ex => ex.exercise_name.toLowerCase() === name.toLowerCase())) {
                            const newEx = { exercise_id: Date.now(), exercise_name: name, muscle_group: customMuscleTags[0] || 'Custom' };
                            setLogExercises(prev => [...prev, newEx]);
                            setCheckedExercises(prev => ({ ...prev, [name]: true }));
                          }
                          setCustomExInput('');
                        }
                      }}
                      className="bg-[#D4FF00] hover:bg-[#c2eb00] text-black font-extrabold font-display text-xs px-4 py-2 rounded-xl uppercase tracking-wider cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Catalog Exercises List sorted by target muscle match */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 pt-1">
                    {[...exercises].sort((a, b) => {
                      const targetTagArr = (customMuscleTags || []).map(t => t.toLowerCase());
                      const aMatch = targetTagArr.some(t => (a.muscle_group || '').toLowerCase().includes(t));
                      const bMatch = targetTagArr.some(t => (b.muscle_group || '').toLowerCase().includes(t));
                      if (aMatch && !bMatch) return -1;
                      if (!aMatch && bMatch) return 1;
                      return 0;
                    }).map(ex => {
                      const alreadyAdded = logExercises.some(e => e.exercise_name === ex.exercise_name);
                      return (
                        <div
                          key={ex.exercise_id}
                          onClick={() => {
                            if (!alreadyAdded) {
                              setLogExercises(prev => [...prev, ex]);
                              setCheckedExercises(prev => ({ ...prev, [ex.exercise_name]: true }));
                            }
                          }}
                          className={`p-3 rounded-xl text-xs font-bold font-display flex justify-between items-center transition-all ${
                            alreadyAdded 
                              ? 'bg-[#1E1E1E] text-slate-500 cursor-not-allowed opacity-50' 
                              : 'bg-[#1E1E1E] hover:bg-[#262626] text-white border border-[#474747]/30 cursor-pointer'
                          }`}
                        >
                          <span>{ex.exercise_name} <span className="text-[10px] text-slate-400">({ex.muscle_group})</span></span>
                          {alreadyAdded ? (
                            <span className="text-[10px] text-slate-500 uppercase">In Session ✓</span>
                          ) : (
                            <span className="text-xs text-[#D4FF00] font-extrabold uppercase">+ Add</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: submitStatus === 'success' ? 1 : 1.01 }}
            whileTap={{ scale: submitStatus === 'success' ? 1 : 0.98 }}
            type="submit"
            disabled={submitStatus === 'submitting' || submitStatus === 'success'}
            className={`w-full font-extrabold font-display text-xl py-4 rounded-xl shadow-lg transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer ${
              submitStatus === 'success'
                ? 'bg-[#D4FF00] text-black shadow-[#D4FF00]/40'
                : submitStatus === 'error'
                ? 'bg-rose-600 text-white shadow-rose-600/30'
                : 'bg-[#D4FF00] hover:bg-[#c2eb00] text-[#0A0A0A] shadow-[#D4FF00]/20'
            }`}
          >
            {submitStatus === 'submitting' && (
              <>
                <div className="h-6 w-6 border-3 border-black border-t-transparent rounded-full animate-spin"></div>
                RECORDING SESSION...
              </>
            )}
            {submitStatus === 'success' && (
              <>
                <CheckCircle2 size={24} strokeWidth={3} className="text-black" />
                SESSION RECORDED ✓
              </>
            )}
            {submitStatus === 'error' && (
              <>
                <AlertCircle size={22} />
                SAVE FAILED — RETRY
              </>
            )}
            {submitStatus === 'idle' && (
              <>
                <CheckCircle2 size={22} />
                COMPLETE & RECORD WORKOUT
              </>
            )}
          </motion.button>
        </form>
      )}

      {/* VIEW: History Log List */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {history.length > 0 ? (
            history.map((log) => {
              const exercisesList = (log.completed_exercises && log.completed_exercises.length > 0)
                ? log.completed_exercises
                : (log.sets && log.sets.length > 0)
                ? Array.from(new Set(log.sets.map(s => s.exercise_name)))
                : [];

              return (
                <div key={log.user_workout_id} className="bg-[#1E1E1E] p-6 rounded-3xl shadow-lg border border-[#474747]/40 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-[#474747]/30">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-2xl font-bold text-white uppercase">{log.workout_name}</h3>
                        {log.is_custom && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded uppercase font-display">
                            Freestyle
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1.5 text-xs text-[#474747] font-semibold mt-1">
                        <Calendar size={14} />
                        {new Date(log.logged_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {log.muscle_groups && log.muscle_groups.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {log.muscle_groups.map((mg, idx) => (
                            <span key={idx} className="text-[10px] font-bold bg-[#D4FF00]/15 text-[#D4FF00] px-2 py-0.5 rounded font-display uppercase">
                              #{mg}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-[#E5E5E5] font-bold font-display bg-[#0A0A0A] px-3 py-1.5 rounded-xl border border-[#474747]/30">
                        <Clock size={14} className="text-[#D4FF00]" />
                        {log.actual_duration} MINS
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-[#E5E5E5] font-bold font-display bg-[#0A0A0A] px-3 py-1.5 rounded-xl border border-[#474747]/30">
                        <Flame size={14} className="text-[#D4FF00]" />
                        {log.actual_calories_burned} KCAL
                      </span>
                    </div>
                  </div>

                  {exercisesList.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-[#474747] uppercase font-display tracking-wider">COMPLETED EXERCISES</h4>
                      <div className="flex flex-wrap gap-2">
                        {exercisesList.map((exName, exIdx) => (
                          <span key={exIdx} className="bg-[#0A0A0A] border border-[#474747]/30 px-3 py-1.5 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 font-display">
                            <Check size={14} className="text-[#D4FF00]" strokeWidth={3} />
                            {exName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-[#1E1E1E] p-8 rounded-3xl text-center border border-[#474747]/40">
              <p className="text-slate-400 text-sm font-semibold">No workout session logs found yet.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Swap / Reschedule Workout Day */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#1E1E1E] border border-[#474747] p-6 rounded-3xl max-w-lg w-full space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-[#474747]/40">
              <div>
                <h3 className="font-display text-xl font-bold text-white uppercase">SWAP / DO SOMETHING ELSE TODAY</h3>
                <p className="text-xs text-[#474747] mt-0.5">Skipped day remains next suggested without advancing rotation.</p>
              </div>
              <button onClick={() => setShowSwapModal(false)} className="text-[#474747] hover:text-white p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {suggestedData?.allDays && suggestedData.allDays.map((d) => (
                <div 
                  key={d.workout_day_id}
                  onClick={() => handleStartWorkoutDay(d)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                    d.workout_day_id === suggestedDay?.workout_day_id
                      ? 'bg-[#D4FF00]/10 border-[#D4FF00]/50'
                      : 'bg-[#0A0A0A] border-[#474747]/40 hover:border-[#D4FF00]/40'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-white text-base">{d.name}</h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {d.muscle_groups && d.muscle_groups.map((m, i) => (
                        <span key={i} className="text-[10px] font-bold text-[#D4FF00] uppercase font-display">#{m}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-[#474747]" />
                </div>
              ))}

              <div 
                onClick={() => { setShowSwapModal(false); setShowFreestyleModal(true); }}
                className="p-4 rounded-2xl border border-purple-500/40 bg-purple-950/30 hover:bg-purple-900/40 transition-all cursor-pointer flex justify-between items-center"
              >
                <div>
                  <h4 className="font-bold text-purple-300 text-base flex items-center gap-2">
                    <Sparkles size={16} /> Freestyle / Custom Workout
                  </h4>
                  <p className="text-xs text-purple-400/80 mt-0.5">Pick exercises ad-hoc</p>
                </div>
                <ChevronRight size={18} className="text-purple-400" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: Freestyle / Custom Workout Builder */}
      {showFreestyleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#1E1E1E] border border-[#474747] p-6 rounded-3xl max-w-2xl w-full space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-[#474747]/40">
              <div>
                <h3 className="font-display text-xl font-bold text-white uppercase flex items-center gap-2">
                  <Sparkles className="text-purple-400" size={20} /> FREESTYLE WORKOUT BUILDER
                </h3>
                <p className="text-xs text-[#474747] mt-0.5">Pick exercises ad-hoc for a custom checklist session.</p>
              </div>
              <button onClick={() => setShowFreestyleModal(false)} className="text-[#474747] hover:text-white p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Exercise Checklist */}
            <div className="space-y-2">
              <label className="text-xs text-[#474747] block font-bold uppercase font-display tracking-wider">Select Exercises to Perform</label>
              <div className="max-h-48 overflow-y-auto space-y-2 bg-[#0A0A0A] p-3 rounded-2xl border border-[#474747]/30">
                {exercises.map(ex => {
                  const isSelected = freestyleSelectedExs.some(e => e.exercise_id === ex.exercise_id);
                  return (
                    <div 
                      key={ex.exercise_id}
                      onClick={() => handleToggleFreestyleEx(ex)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex justify-between items-center cursor-pointer transition-all ${
                        isSelected ? 'bg-[#D4FF00]/15 border-[#D4FF00] text-white' : 'bg-[#1E1E1E] border-[#474747]/40 text-[#E5E5E5]'
                      }`}
                    >
                      <span>{ex.exercise_name} ({ex.muscle_group})</span>
                      {isSelected ? <Check size={16} className="text-[#D4FF00]" /> : <Plus size={16} className="text-[#474747]" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Auto-Inferred Muscle Group Tag Review */}
            <div className="space-y-2">
              <label className="text-xs text-[#D4FF00] block font-bold uppercase font-display tracking-wider">Target Muscle Groups</label>
              <div className="flex flex-wrap gap-2 p-3 bg-[#0A0A0A] rounded-2xl border border-[#474747]/30 min-h-[44px]">
                {freestyleTags.map((tag, idx) => (
                  <span key={idx} className="bg-[#D4FF00]/20 text-[#D4FF00] border border-[#D4FF00]/40 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-display uppercase">
                    #{tag}
                    <button type="button" onClick={() => setFreestyleTags(prev => prev.filter(t => t !== tag))} className="hover:text-white cursor-pointer">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-3">
              <button
                type="button"
                onClick={() => setShowFreestyleModal(false)}
                className="flex-1 bg-[#0A0A0A] hover:bg-[#262626] text-[#E5E5E5] font-bold font-display py-3 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartFreestyleSession}
                className="flex-1 bg-[#D4FF00] hover:bg-[#c2eb00] text-[#0A0A0A] font-extrabold font-display py-3 rounded-xl transition-all text-xs shadow-md uppercase tracking-wider cursor-pointer"
              >
                Start Freestyle Session ▶️
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: Program Creation Wizard */}
      {showProgramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#1E1E1E] border border-[#474747] p-6 rounded-3xl max-w-2xl w-full space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-[#474747]/40">
              <div>
                <h3 className="font-display text-xl font-bold text-white uppercase">CREATE WORKOUT PROGRAM</h3>
                <p className="text-xs text-[#474747] mt-0.5">Configure schedule mode (Fixed vs Rotating) & WorkoutDays.</p>
              </div>
              <button onClick={() => setShowProgramModal(false)} className="text-[#474747] hover:text-white p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProgramSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-[#474747] block mb-1 font-bold uppercase tracking-wider font-display">Program Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4-Day Push/Pull/Legs Split"
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#474747]/50 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-[#D4FF00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#474747] block mb-1 font-bold uppercase tracking-wider font-display">Schedule Mode</label>
                  <select
                    value={progMode}
                    onChange={(e) => setProgMode(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#474747]/50 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-[#D4FF00]"
                  >
                    <option value="rotating">Rotating Sequence (Day 1 → Day 2 → Day 3...)</option>
                    <option value="fixed">Fixed Weekday (Monday, Wednesday, Friday...)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#474747] block mb-1 font-bold uppercase tracking-wider font-display">Status</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="progActive"
                      checked={progIsActive}
                      onChange={(e) => setProgIsActive(e.target.checked)}
                      className="accent-[#D4FF00] h-4 w-4"
                    />
                    <label htmlFor="progActive" className="text-xs text-white font-bold cursor-pointer">Set as Active Program</label>
                  </div>
                </div>
              </div>

              {/* Workout Days list */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-1 border-b border-[#474747]/30">
                  <label className="text-xs text-[#D4FF00] block font-extrabold uppercase tracking-wider font-display">
                    Program Workout Days ({progDays.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddProgDay}
                    className="bg-[#D4FF00] hover:bg-[#c2eb00] text-black text-xs font-extrabold font-display px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-md"
                  >
                    <Plus size={16} /> + Add Workout Day
                  </button>
                </div>

                {progDays.map((d, dIdx) => (
                  <div key={dIdx} className="bg-[#0A0A0A] border border-[#474747]/40 p-4 rounded-2xl space-y-3 relative">
                    <div className="flex justify-between items-center pb-2 border-b border-[#474747]/30">
                      <span className="text-xs font-black text-[#D4FF00] font-display uppercase tracking-wider">
                        DAY {dIdx + 1}
                      </span>
                      {progDays.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProgDay(dIdx)}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold font-display uppercase"
                          title="Remove day"
                        >
                          <Trash2 size={14} /> Remove Day
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-[#474747] block font-bold uppercase font-display mb-1">
                          Day Name (e.g. Push Day, Pull Day, Rest Day)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Push Day"
                          value={d.name}
                          onChange={(e) => {
                            const updated = [...progDays];
                            updated[dIdx].name = e.target.value;
                            setProgDays(updated);
                          }}
                          className="w-full bg-[#1E1E1E] border border-[#474747]/40 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4FF00] font-bold"
                        />
                      </div>
                      {progMode === 'fixed' && (
                        <div>
                          <label className="text-[10px] text-[#474747] block font-bold uppercase font-display mb-1">
                            Fixed Weekday
                          </label>
                          <select
                            value={d.fixed_weekday || 'Monday'}
                            onChange={(e) => {
                              const updated = [...progDays];
                              updated[dIdx].fixed_weekday = e.target.value;
                              setProgDays(updated);
                            }}
                            className="w-full bg-[#1E1E1E] border border-[#474747]/40 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#D4FF00] font-bold"
                          >
                            {WEEKDAYS.map(w => <option key={w} value={w}>{w}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] text-[#474747] block font-bold uppercase font-display mb-1">
                        Target Muscle Group Tags
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {MUSCLE_OPTIONS.map(m => {
                          const isTagSelected = d.muscle_groups.includes(m);
                          return (
                            <button
                              type="button"
                              key={m}
                              onClick={() => {
                                const updated = [...progDays];
                                const currentTags = updated[dIdx].muscle_groups || [];
                                if (isTagSelected) {
                                  updated[dIdx].muscle_groups = currentTags.filter(t => t !== m);
                                } else {
                                  updated[dIdx].muscle_groups = [...currentTags, m];
                                }
                                setProgDays(updated);
                              }}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase font-display border cursor-pointer transition-all ${
                                isTagSelected ? 'bg-[#D4FF00] text-black border-[#D4FF00] shadow-sm' : 'bg-[#1E1E1E] text-[#474747] border-[#474747]/40 hover:text-white'
                              }`}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddProgDay}
                  className="w-full py-3.5 rounded-2xl border-2 border-dashed border-[#D4FF00] bg-[#D4FF00]/10 hover:bg-[#D4FF00]/20 text-[#D4FF00] font-extrabold font-display text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md mt-2"
                >
                  <Plus size={18} /> + ADD WORKOUT DAY
                </button>
              </div>

              <div className="flex gap-4 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProgramModal(false)}
                  className="flex-1 bg-[#0A0A0A] hover:bg-[#262626] text-[#E5E5E5] font-bold font-display py-3 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#D4FF00] hover:bg-[#c2eb00] text-[#0A0A0A] font-extrabold font-display py-3 rounded-xl transition-all text-xs shadow-md uppercase tracking-wider cursor-pointer"
                >
                  Save & Activate Program
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Global Toast Notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </motion.div>
  );
}
