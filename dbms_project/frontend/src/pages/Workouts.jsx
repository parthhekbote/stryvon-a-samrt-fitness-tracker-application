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

  // Freestyle Workout Selection State
  const [freestyleSelectedExs, setFreestyleSelectedExs] = useState([]);
  const [freestyleTags, setFreestyleTags] = useState([]);

  // Program Creation Wizard State
  const [progName, setProgName] = useState('');
  const [progMode, setProgMode] = useState('rotating'); // 'rotating' | 'fixed'
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

      // Default fallback exercises if empty
      if (!exerciseList || exerciseList.length === 0) {
        exerciseList = exercises.slice(0, 3);
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 relative"
    >
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-display uppercase tracking-wide">WORKOUT SESSION MANAGER</h1>
          <p className="text-slate-400 text-sm mt-1">Lightweight workout checklist & scheduling.</p>
        </div>
        <div className="flex flex-wrap gap-2 bg-[#1E1E1E] p-1.5 rounded-2xl border border-[#474747]/40">
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'templates' ? 'bg-[#D4FF00] text-black shadow-md' : 'text-[#E5E5E5] hover:text-white'}`}
          >
            <Calendar size={15} />
            Today's Schedule
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'history' ? 'bg-[#D4FF00] text-black shadow-md' : 'text-[#E5E5E5] hover:text-white'}`}
          >
            <History size={15} />
            History Log
          </button>

          <button
            onClick={() => setShowFreestyleModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold font-display uppercase tracking-wider bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 cursor-pointer transition-all"
          >
            <Sparkles size={14} />
            + Freestyle
          </button>

          <button
            onClick={() => setShowProgramModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold font-display uppercase tracking-wider bg-[#0A0A0A] hover:bg-[#262626] text-[#D4FF00] border border-[#D4FF00]/40 cursor-pointer transition-all"
          >
            <Layers size={14} />
            + Program
          </button>
        </div>
      </div>

      {/* VIEW: Today's Schedule & Suggested Workout */}
      {activeTab === 'templates' && (
        <div className="space-y-6">

          {/* Today's Suggested Workout Prominent Card */}
          {suggestedData?.isRestDay ? (
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-[#1E1E1E] via-[#1E1E1E] to-[#0A0A0A] border-2 border-emerald-500/40 p-7 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
            >
              <div className="space-y-1.5">
                <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider font-display bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  PROGRAM: {activeProgram?.program_name || 'Fixed Schedule'}
                </span>
                <h2 className="font-display text-3xl font-extrabold text-white uppercase tracking-wide">
                  REST DAY — NO WORKOUT SCHEDULED TODAY
                </h2>
                <p className="text-xs text-[#474747] font-semibold">
                  Today ({new Date().toLocaleDateString('en-US', { weekday: 'long' })}) is a scheduled rest day in your fixed program.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSwapModal(true)}
                className="bg-[#D4FF00] hover:bg-[#c2eb00] text-black font-extrabold font-display px-6 py-3.5 rounded-2xl shadow-lg text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all whitespace-nowrap"
              >
                <Shuffle size={16} />
                Do something else today
              </button>
            </motion.div>
          ) : suggestedDay ? (
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-[#1E1E1E] via-[#1E1E1E] to-[#0A0A0A] border-2 border-[#D4FF00]/60 p-7 rounded-3xl shadow-[0_0_35px_rgba(212,255,0,0.15)] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-[#D4FF00] text-black text-[10px] font-black font-display px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest">
                TODAY'S SUGGESTED WORKOUT
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#D4FF00] uppercase tracking-wider font-display bg-[#D4FF00]/10 px-2.5 py-1 rounded-lg border border-[#D4FF00]/30">
                      PROGRAM: {activeProgram?.program_name || 'Active Schedule'}
                    </span>
                    <span className="text-xs font-bold text-[#474747] uppercase tracking-wider font-display">
                      {activeProgram?.schedule_mode === 'fixed' ? `Fixed Mode (${suggestedDay.fixed_weekday})` : 'Rotating Sequence'}
                    </span>
                  </div>

                  <h2 className="font-display text-4xl font-extrabold text-white uppercase tracking-wide">
                    {suggestedDay.name}
                  </h2>

                  {/* Muscle Groups tags */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {suggestedDay.muscle_groups && suggestedDay.muscle_groups.map((mg, i) => (
                      <span key={i} className="text-[11px] font-bold uppercase tracking-wider font-display px-2.5 py-1 rounded-md bg-[#0A0A0A] text-[#E5E5E5] border border-[#474747]/40">
                        {mg}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleStartWorkoutDay(suggestedDay)}
                    className="bg-[#D4FF00] hover:bg-[#c2eb00] text-[#0A0A0A] font-extrabold font-display px-6 py-4 rounded-2xl shadow-xl shadow-[#D4FF00]/25 text-base uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play size={18} className="fill-[#0A0A0A]" />
                    START SUGGESTED WORKOUT
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => setShowSwapModal(true)}
                    className="bg-[#0A0A0A] hover:bg-[#262626] text-[#E5E5E5] hover:text-white border border-[#474747]/50 font-bold font-display px-4 py-4 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Shuffle size={16} className="text-[#D4FF00]" />
                    Do something else today
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl text-center space-y-3">
              <h3 className="font-display text-xl font-bold text-white uppercase">No Active Workout Program</h3>
              <p className="text-xs text-[#474747] font-semibold">Create or activate a program to enable day-based rotating scheduling.</p>
              <button
                onClick={() => setShowProgramModal(true)}
                className="bg-[#D4FF00] text-black px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider font-display inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus size={16} /> Create Workout Program
              </button>
            </div>
          )}

          {/* Standard Routines & Preset List */}
          <div className="space-y-4">
            <h3 className="font-display text-xl font-bold text-white uppercase tracking-wide">ROUTINE TEMPLATES LIBRARY</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {workouts.map((workout) => (
                <motion.div 
                  whileHover={{ y: -4 }}
                  key={workout.workout_id} 
                  className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg flex flex-col justify-between hover:border-[#D4FF00]/40 transition-all group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-display text-2xl font-bold text-white group-hover:text-[#D4FF00] transition-colors">{workout.workout_name}</h3>
                      <span className={`font-display text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${workout.difficulty === 'Beginner' ? 'bg-[#D4FF00]/15 text-[#D4FF00]' : workout.difficulty === 'Intermediate' ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'}`}>
                        {workout.difficulty}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-[#0A0A0A] p-3 rounded-2xl border border-[#474747]/30 text-center">
                        <Clock size={16} className="mx-auto mb-1 text-[#474747]" />
                        <span className="text-[10px] text-[#474747] uppercase font-bold tracking-wider font-display">Duration</span>
                        <p className="text-sm font-extrabold text-[#E5E5E5]">{workout.duration}m</p>
                      </div>
                      <div className="bg-[#0A0A0A] p-3 rounded-2xl border border-[#474747]/30 text-center">
                        <Flame size={16} className="mx-auto mb-1 text-[#D4FF00]" />
                        <span className="text-[10px] text-[#474747] uppercase font-bold tracking-wider font-display">Est Burn</span>
                        <p className="text-sm font-extrabold text-[#E5E5E5]">{workout.calories_burned} kcal</p>
                      </div>
                      <div className="bg-[#0A0A0A] p-3 rounded-2xl border border-[#474747]/30 text-center">
                        <Dumbbell size={16} className="mx-auto mb-1 text-[#474747]" />
                        <span className="text-[10px] text-[#474747] uppercase font-bold tracking-wider font-display">Equipment</span>
                        <p className="text-xs font-extrabold text-[#E5E5E5] truncate">{workout.equipment_needed}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-[#474747]/30">
                    <span className="text-xs font-bold text-[#474747] font-display tracking-wider uppercase">
                      {workout.exercise_count || 0} EXERCISES
                    </span>
                    <button
                      onClick={() => handleStartLog(workout)}
                      className="flex items-center gap-2 bg-[#D4FF00] hover:bg-[#c2eb00] text-[#0A0A0A] font-extrabold font-display px-5 py-2.5 rounded-xl shadow-lg shadow-[#D4FF00]/20 transition-all text-xs uppercase tracking-wider cursor-pointer"
                    >
                      <Play size={14} className="fill-[#0A0A0A]" />
                      START ROUTINE
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Active Workout Logging Session Checklist */}
      {activeTab === 'log' && selectedWorkout && (
        <form onSubmit={handleSubmitLog} className="bg-[#1E1E1E] border border-[#474747]/40 p-6 rounded-3xl shadow-lg space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-[#474747]/30">
            <div>
              <span className="text-xs text-[#D4FF00] font-bold uppercase tracking-wider font-display">ACTIVE CHECKLIST SESSION</span>
              <h2 className="font-display text-3xl font-bold text-white uppercase">{selectedWorkout.workout_name}</h2>
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

          {/* Time & Calorie inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#474747] block mb-1.5 font-bold uppercase tracking-wider font-display">Duration (Minutes)</label>
              <input
                type="number"
                required
                value={logDuration}
                onChange={(e) => setLogDuration(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#474747]/50 rounded-xl py-3 px-4 text-sm text-[#E5E5E5] focus:outline-none focus:border-[#D4FF00]"
              />
            </div>
            <div>
              <label className="text-xs text-[#474747] block mb-1.5 font-bold uppercase tracking-wider font-display">Calories Burned (kcal)</label>
              <input
                type="number"
                value={logCalories}
                onChange={(e) => setLogCalories(e.target.value)}
                placeholder="Auto-calculated"
                className="w-full bg-[#0A0A0A] border border-[#474747]/50 rounded-xl py-3 px-4 text-sm text-[#E5E5E5] placeholder:text-[#474747] focus:outline-none focus:border-[#D4FF00]"
              />
            </div>
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
              {logExercises.map((ex, exIdx) => {
                const isChecked = checkedExercises[ex.exercise_name] !== false;
                return (
                  <div
                    key={exIdx}
                    onClick={() => handleToggleExerciseCheck(ex.exercise_name)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isChecked 
                        ? 'bg-[#D4FF00]/10 border-[#D4FF00]/50 text-white shadow-sm' 
                        : 'bg-[#0A0A0A] border-[#474747]/40 text-[#474747] opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1 rounded-lg transition-colors ${isChecked ? 'bg-[#D4FF00] text-black' : 'bg-[#1E1E1E] text-[#474747] border border-[#474747]/50'}`}>
                        {isChecked ? <Check size={18} strokeWidth={3} /> : <Square size={18} />}
                      </div>
                      <span className={`font-extrabold text-base font-display ${isChecked ? 'text-white' : 'text-[#474747] line-through'}`}>
                        {ex.exercise_name}
                      </span>
                    </div>

                    <span className={`text-xs font-bold font-display uppercase tracking-wider ${isChecked ? 'text-[#D4FF00]' : 'text-[#474747]'}`}>
                      {isChecked ? 'COMPLETED ✓' : 'SKIPPED'}
                    </span>
                  </div>
                );
              })}
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
