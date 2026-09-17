import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Flame, 
  ExternalLink, 
  BookOpen, 
  ListFilter, 
  X, 
  PlayCircle,
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Exercises({ apiUrl, token }) {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('All');
  const [difficulty, setDifficulty] = useState('All');

  // Detail Modal State
  const [selectedEx, setSelectedEx] = useState(null);

  // Custom Exercise Form Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState('Chest');
  const [newDifficultyLevel, setNewDifficultyLevel] = useState('Beginner');
  const [newInstructions, setNewInstructions] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newCaloriesPerMin, setNewCaloriesPerMin] = useState('5.0');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const handleCreateExercise = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const response = await fetch(`${apiUrl}/exercises`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          exercise_name: newName,
          muscle_group: newMuscle,
          difficulty: newDifficultyLevel,
          instructions: newInstructions,
          video_url: newVideoUrl,
          calories_per_minute: parseFloat(newCaloriesPerMin)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add custom exercise.');
      }

      setNewName('');
      setNewMuscle('Chest');
      setNewDifficultyLevel('Beginner');
      setNewInstructions('');
      setNewVideoUrl('');
      setNewCaloriesPerMin('5.0');
      setShowCreateModal(false);
      await fetchExercises();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const url = new URL(`${apiUrl}/exercises`);
      
      if (search) url.searchParams.append('search', search);
      if (muscleGroup !== 'All') url.searchParams.append('muscleGroup', muscleGroup);
      if (difficulty !== 'All') url.searchParams.append('difficulty', difficulty);

      const res = await fetch(url.toString(), { headers });
      const data = await res.json();
      if (res.ok) setExercises(data.exercises || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExercises();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, muscleGroup, difficulty, token]);

  const muscleGroups = ['All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Abs', 'Cardio', 'Full Body'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 text-white"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-4xl font-black text-white tracking-tight uppercase">EXERCISE LIBRARY</h1>
          <p className="text-[#E5E5E5]/70 text-xs mt-1 font-medium">Browse, search, and learn proper execution techniques for various movements.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#D4FF00] hover:bg-[#b8de00] text-black font-display font-bold px-5 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md shrink-0 min-h-[44px]"
        >
          <Plus size={16} />
          Add Custom Exercise
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-[#1E1E1E] border border-[#474747]/40 p-4 sm:p-5 rounded-3xl space-y-4 shadow-lg">
        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#474747]" />
          <input
            type="text"
            placeholder="Search exercises (e.g. Bench Press)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-[#474747] text-white rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-[#D4FF00] transition-all placeholder:text-[#474747] min-h-[44px]"
          />
        </div>

        {/* Filter Rows */}
        <div className="flex flex-col gap-3">
          {/* Muscle Group */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
            <span className="text-xs font-display font-bold text-[#E5E5E5]/60 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <ListFilter size={12} />
              Muscle:
            </span>
            {muscleGroups.map((mg) => (
              <button
                key={mg}
                onClick={() => setMuscleGroup(mg)}
                className={`text-xs font-display font-bold px-3.5 py-2 rounded-full shrink-0 transition-all uppercase tracking-wider min-h-[44px] flex items-center justify-center ${muscleGroup === mg ? 'bg-[#D4FF00] text-black shadow-sm' : 'bg-[#0A0A0A] border border-[#474747]/50 text-[#E5E5E5]/70 hover:border-[#D4FF00]/50'}`}
              >
                {mg}
              </button>
            ))}
          </div>

          {/* Difficulty */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-display font-bold text-[#E5E5E5]/60 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <ListFilter size={12} />
              Level:
            </span>
            {difficulties.map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`text-xs font-display font-bold px-3.5 py-2 rounded-full shrink-0 transition-all uppercase tracking-wider min-h-[44px] flex items-center justify-center ${difficulty === diff ? 'bg-white text-black shadow-sm' : 'bg-[#0A0A0A] border border-[#474747]/50 text-[#E5E5E5]/70 hover:border-white/50'}`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Exercises List */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-4 border-[#D4FF00] border-t-transparent rounded-full animate-spin"></div>
          <span className="font-display text-xs text-[#D4FF00] tracking-widest uppercase">Fetching Exercises...</span>
        </div>
      ) : exercises.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {exercises.map((ex) => (
            <div 
              key={ex.exercise_id}
              onClick={() => setSelectedEx(ex)}
              className="bg-[#1E1E1E] border border-[#474747]/40 hover:border-[#D4FF00]/50 p-5 rounded-3xl shadow-lg cursor-pointer transition-all duration-200 flex flex-col justify-between hover:scale-[1.01]"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-display text-lg font-bold text-white leading-snug line-clamp-1">{ex.exercise_name}</h3>
                  <span className={`text-[10px] font-display font-bold px-2 py-0.5 rounded uppercase tracking-wider ${ex.difficulty === 'Beginner' ? 'bg-[#D4FF00]/10 text-[#D4FF00] border border-[#D4FF00]/20' : ex.difficulty === 'Intermediate' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {ex.difficulty}
                  </span>
                </div>
                
                <p className="text-xs text-[#E5E5E5]/60 line-clamp-3 leading-relaxed mb-4">
                  {ex.instructions || 'No instructions provided.'}
                </p>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#474747]/40">
                <span className="text-[10px] font-display font-bold uppercase tracking-wider text-[#D4FF00] bg-[#0A0A0A] px-2.5 py-1 rounded-lg border border-[#474747]/40">
                  {ex.muscle_group}
                </span>
                
                <span className="flex items-center gap-1 text-xs text-amber-400 font-bold font-display">
                  <Flame size={14} className="fill-amber-400 text-amber-400" />
                  {ex.calories_per_minute} cal/m
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#1E1E1E] border border-[#474747]/40 py-12 rounded-3xl text-center text-[#E5E5E5]/50">
          <BookOpen size={40} className="mx-auto mb-2 opacity-40 text-[#D4FF00]" />
          <span className="font-display uppercase tracking-wider text-sm">No exercises match your search filters.</span>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedEx && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-[#1E1E1E] border border-[#474747] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#474747] bg-[#0A0A0A]">
              <div>
                <span className="text-[10px] sm:text-xs text-[#D4FF00] font-display font-bold uppercase tracking-widest">{selectedEx.muscle_group} Routine</span>
                <h3 className="text-xl sm:text-2xl font-display font-black text-white mt-0.5 uppercase tracking-wide">{selectedEx.exercise_name}</h3>
              </div>
              <button 
                onClick={() => setSelectedEx(null)}
                className="p-2 hover:bg-[#1E1E1E] rounded-xl text-[#E5E5E5]/60 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto max-h-[70vh]">
              {/* Telemetry info row */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-[#0A0A0A] p-2.5 sm:p-3 rounded-2xl border border-[#474747]/40 text-center">
                  <span className="text-[9px] sm:text-[10px] text-[#E5E5E5]/50 uppercase font-display font-bold tracking-wider">Difficulty</span>
                  <p className="text-xs sm:text-sm font-extrabold text-white mt-1">{selectedEx.difficulty}</p>
                </div>
                <div className="bg-[#0A0A0A] p-2.5 sm:p-3 rounded-2xl border border-[#474747]/40 text-center">
                  <span className="text-[9px] sm:text-[10px] text-[#E5E5E5]/50 uppercase font-display font-bold tracking-wider">Calories</span>
                  <p className="text-xs sm:text-sm font-extrabold text-[#D4FF00] mt-1">{selectedEx.calories_per_minute} / min</p>
                </div>
                <div className="bg-[#0A0A0A] p-2.5 sm:p-3 rounded-2xl border border-[#474747]/40 text-center">
                  <span className="text-[9px] sm:text-[10px] text-[#E5E5E5]/50 uppercase font-display font-bold tracking-wider">Target</span>
                  <p className="text-xs sm:text-sm font-extrabold text-white mt-1">{selectedEx.muscle_group}</p>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <h4 className="font-display font-bold text-white mb-2 text-xs sm:text-sm uppercase tracking-wider">Exercise Instructions</h4>
                <p className="text-xs sm:text-sm text-[#E5E5E5]/80 leading-relaxed whitespace-pre-line bg-[#0A0A0A] p-3.5 sm:p-4 rounded-2xl border border-[#474747]/40">
                  {selectedEx.instructions || 'No instructions provided.'}
                </p>
              </div>

              {/* Video Demonstrations */}
              {selectedEx.video_url && (
                <div>
                  <h4 className="font-display font-bold text-white mb-2.5 text-xs sm:text-sm uppercase tracking-wider">Video Demonstration</h4>
                  <a 
                    href={selectedEx.video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 p-3.5 sm:p-4 rounded-2xl transition-all font-semibold text-xs sm:text-sm group min-h-[44px]"
                  >
                    <PlayCircle size={20} className="group-hover:scale-105 transition-transform text-red-500 shrink-0" />
                    <span>Watch Tutorial Video on YouTube</span>
                    <ExternalLink size={14} className="ml-auto shrink-0" />
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#0A0A0A] border-t border-[#474747] text-right">
              <button 
                onClick={() => setSelectedEx(null)}
                className="w-full sm:w-auto bg-[#D4FF00] hover:bg-[#b8de00] text-black font-display font-bold px-5 py-2.5 rounded-xl transition-all text-xs uppercase tracking-wider min-h-[44px]"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EXERCISE FORM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg bg-[#1E1E1E] border border-[#474747] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#474747] bg-[#0A0A0A]">
              <div>
                <h3 className="text-lg sm:text-xl font-display font-bold text-white uppercase tracking-wide">Add Custom Exercise</h3>
                <p className="text-xs text-[#E5E5E5]/60 mt-0.5">Insert a new movement to be used inside your custom workout plans.</p>
              </div>
              <button 
                onClick={() => { setShowCreateModal(false); setFormError(''); }}
                className="p-2 hover:bg-[#1E1E1E] rounded-xl text-[#E5E5E5]/60 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateExercise} className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {formError && (
                <div className="bg-red-500/10 text-red-400 p-3.5 rounded-xl text-xs font-bold border border-red-500/20">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-wider font-display">Exercise Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diamond Push-Ups"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#474747] text-white rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-wider font-display">Target Muscle</label>
                  <select
                    value={newMuscle}
                    onChange={(e) => setNewMuscle(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#474747] text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                  >
                    {muscleGroups.filter(m => m !== 'All').map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-wider font-display">Difficulty</label>
                  <select
                    value={newDifficultyLevel}
                    onChange={(e) => setNewDifficultyLevel(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#474747] text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                  >
                    {difficulties.filter(d => d !== 'All').map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-wider font-display">Est Kcal / Minute</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newCaloriesPerMin}
                    onChange={(e) => setNewCaloriesPerMin(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#474747] text-white rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-wider font-display">Demo Video Link</label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/..."
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#474747] text-white rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[#D4FF00] min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#E5E5E5]/70 block mb-1.5 font-bold uppercase tracking-wider font-display">Instructions</label>
                <textarea
                  rows="3"
                  placeholder="Describe step-by-step how to perform this movement..."
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#474747] text-white rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[#D4FF00]"
                />
              </div>

              <div className="flex gap-3 sm:gap-4 pt-4 border-t border-[#474747]">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setFormError(''); }}
                  className="flex-1 bg-[#0A0A0A] border border-[#474747] hover:bg-[#151515] text-[#E5E5E5] font-display font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-[#D4FF00] hover:bg-[#b8de00] text-black font-display font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider shadow-md disabled:opacity-50 min-h-[44px]"
                >
                  {formLoading ? 'Adding...' : 'Save to Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
