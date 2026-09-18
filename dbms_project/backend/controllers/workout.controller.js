import mongoose from 'mongoose';
import {
  Workout,
  WorkoutExercise,
  Exercise,
  UserWorkout,
  WorkoutSet,
  User,
  Progress,
  UserBadge,
  Program,
  WorkoutDay,
  getNextSequenceValue
} from '../models/index.js';
import { updateStreak } from './auth.controller.js';

export async function getWorkouts(req, res) {
  const userId = req.user.userId;

  try {
    const workouts = await Workout.find({
      $or: [{ user_id: null }, { user_id: userId }]
    })
      .sort({ workout_id: 1 })
      .lean();

    const workoutIds = workouts.map(w => w.workout_id);
    const exerciseCounts = await WorkoutExercise.aggregate([
      { $match: { workout_id: { $in: workoutIds } } },
      { $group: { _id: '$workout_id', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    exerciseCounts.forEach(item => {
      countMap[item._id] = item.count;
    });

    const workoutsWithCount = workouts.map(workout => ({
      ...workout,
      exercise_count: countMap[workout.workout_id] || 0
    }));

    res.status(200).json({ workouts: workoutsWithCount });
  } catch (error) {
    console.error('Failed to fetch workouts:', error);
    res.status(500).json({ message: 'Failed to retrieve workouts.' });
  }
}

export async function createWorkout(req, res) {
  const userId = req.user.userId;
  const { workout_name, duration, calories_burned, difficulty, equipment_needed, exercises } = req.body;

  if (!workout_name || !duration || !calories_burned) {
    return res.status(400).json({ message: 'Workout name, duration, and calories are required.' });
  }

  const parsedDuration = parseInt(duration);
  const parsedCalories = parseInt(calories_burned);

  if (isNaN(parsedDuration) || parsedDuration < 1 || parsedDuration > 600) {
    return res.status(400).json({ message: 'Duration must be between 1 and 600 minutes.' });
  }
  if (isNaN(parsedCalories) || parsedCalories < 0 || parsedCalories > 5000) {
    return res.status(400).json({ message: 'Calories burned must be between 0 and 5000 kcal.' });
  }

  try {
    const workoutId = await getNextSequenceValue('workout_id');

    await Workout.create({
      workout_id: workoutId,
      workout_name: String(workout_name).trim(),
      duration: parsedDuration,
      calories_burned: parsedCalories,
      difficulty: difficulty || 'Beginner',
      equipment_needed: equipment_needed || 'None',
      user_id: userId
    });

    if (exercises && Array.isArray(exercises)) {
      for (let i = 0; i < exercises.length; i++) {
        const item = exercises[i];
        if (item && item.exercise_id) {
          await WorkoutExercise.create({
            workout_id: workoutId,
            exercise_id: item.exercise_id,
            sequence_order: i + 1,
            default_sets: item.sets || 3,
            default_reps: item.reps || 10
          });
        }
      }
    }

    res.status(201).json({ message: 'Workout template created successfully.', workoutId });
  } catch (error) {
    console.error('Workout creation error:', error);
    res.status(500).json({ message: 'Failed to create workout template.' });
  }
}

export async function getWorkoutExercises(req, res) {
  const { id } = req.params;
  const userId = req.user.userId;
  const workoutId = parseInt(id);

  if (isNaN(workoutId)) {
    return res.status(400).json({ message: 'Invalid workout ID.' });
  }

  try {
    const workout = await Workout.findOne({ workout_id: workoutId }).lean();
    if (workout && workout.user_id !== null && workout.user_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized access to private workout.' });
    }

    const workoutExs = await WorkoutExercise.find({ workout_id: workoutId })
      .sort({ sequence_order: 1 })
      .lean();

    const exerciseIds = workoutExs.map(we => we.exercise_id);
    const exerciseDocs = await Exercise.find({ exercise_id: { $in: exerciseIds } }).lean();

    const exerciseMap = {};
    exerciseDocs.forEach(ex => {
      exerciseMap[ex.exercise_id] = ex;
    });

    const exercises = workoutExs.map(we => {
      const ex = exerciseMap[we.exercise_id] || {};
      return {
        ...ex,
        sequence_order: we.sequence_order,
        default_sets: we.default_sets,
        default_reps: we.default_reps
      };
    });

    res.status(200).json({ exercises });
  } catch (error) {
    console.error('Failed to get workout exercises:', error);
    res.status(500).json({ message: 'Failed to retrieve exercises for this workout.' });
  }
}

export async function logWorkoutCompletion(req, res) {
  const userId = req.user.userId;
  const { workout_id, workout_day_id, custom_name, is_custom, muscle_groups, duration, calories_burned, sets, completed_exercises } = req.body;

  const validDuration = duration ? parseInt(duration) : 45;
  if (isNaN(validDuration) || validDuration < 1 || validDuration > 600) {
    return res.status(400).json({ message: 'Duration must be between 1 and 600 minutes.' });
  }

  try {
    const parsedWorkoutId = (workout_id && !isNaN(parseInt(workout_id))) ? parseInt(workout_id) : null;
    const parsedWorkoutDayId = (workout_day_id && !isNaN(parseInt(workout_day_id))) ? parseInt(workout_day_id) : null;

    let finalCalories = calories_burned ? parseInt(calories_burned) : null;

    if (!finalCalories || isNaN(finalCalories) || finalCalories < 0 || finalCalories > 5000) {
      if (parsedWorkoutId) {
        const workoutExercises = await WorkoutExercise.find({ workout_id: parsedWorkoutId }).lean();
        if (workoutExercises.length > 0) {
          const exerciseIds = workoutExercises.map(e => e.exercise_id);
          const exercisesData = await Exercise.find({ exercise_id: { $in: exerciseIds } });
          const sumCaloriesPerMin = exercisesData.reduce((sum, ex) => sum + parseFloat(ex.calories_per_minute || 5.0), 0);
          const averageBurnRate = exercisesData.length > 0 ? (sumCaloriesPerMin / exercisesData.length) : 5.0;
          finalCalories = Math.round(averageBurnRate * validDuration);
        } else {
          finalCalories = Math.round(5.0 * validDuration);
        }
      } else if (sets && Array.isArray(sets) && sets.length > 0) {
        const setExIds = sets.map(s => s.exercise_id).filter(Boolean);
        const exercisesData = await Exercise.find({ exercise_id: { $in: setExIds } });
        if (exercisesData.length > 0) {
          const sumCaloriesPerMin = exercisesData.reduce((sum, ex) => sum + parseFloat(ex.calories_per_minute || 5.0), 0);
          const averageBurnRate = sumCaloriesPerMin / exercisesData.length;
          finalCalories = Math.round(averageBurnRate * validDuration);
        } else {
          finalCalories = Math.round(5.0 * validDuration);
        }
      } else {
        finalCalories = Math.round(5.0 * validDuration);
      }
    }

    let finalMuscleGroups = muscle_groups || [];
    if (!finalMuscleGroups || finalMuscleGroups.length === 0) {
      const mgSet = new Set();
      if (sets && Array.isArray(sets)) {
        const setExIds = sets.map(s => s.exercise_id).filter(Boolean);
        const setExercises = await Exercise.find({ exercise_id: { $in: setExIds } }).lean();
        setExercises.forEach(ex => {
          if (ex.muscle_group) mgSet.add(ex.muscle_group.toLowerCase());
          if (ex.muscle_groups && Array.isArray(ex.muscle_groups)) {
            ex.muscle_groups.forEach(m => mgSet.add(m.toLowerCase()));
          }
        });
      }
      finalMuscleGroups = Array.from(mgSet);
    }

    const userWorkoutId = await getNextSequenceValue('user_workout_id');
    const completedExList = Array.isArray(completed_exercises) ? completed_exercises : [];

    await UserWorkout.create({
      user_workout_id: userWorkoutId,
      user_id: userId,
      workout_id: parsedWorkoutId,
      workout_day_id: parsedWorkoutDayId,
      custom_name: custom_name || null,
      is_custom: !!is_custom,
      muscle_groups: finalMuscleGroups,
      completed_exercises: completedExList,
      actual_duration: validDuration,
      actual_calories_burned: finalCalories,
      logged_at: new Date()
    });

    if (sets && Array.isArray(sets) && sets.length > 0) {
      const setToInsert = [];
      for (const set of sets) {
        if (set && set.exercise_id) {
          const setId = await getNextSequenceValue('set_id');
          setToInsert.push({
            set_id: setId,
            user_workout_id: userWorkoutId,
            exercise_id: parseInt(set.exercise_id),
            set_number: parseInt(set.set_number) || 1,
            reps: parseInt(set.reps) || 0,
            weight: parseFloat(set.weight) || 0
          });
        }
      }
      if (setToInsert.length > 0) {
        await WorkoutSet.insertMany(setToInsert);
      }
    }

    const streakData = await updateStreak(userId, req.body.user_date);

    // Increment today's progress table calories_burned without changing manual/profile weight source
    const today = req.body.user_date || new Date().toISOString().split('T')[0];
    const user = await User.findOne({ user_id: userId });
    const userWeight = user?.weight || 70.0;
    const userHeight = user?.height;
    const bmi = (userWeight && userHeight) ? parseFloat((userWeight / Math.pow(userHeight / 100, 2)).toFixed(2)) : 0;

    const existingProgress = await Progress.findOne({ user_id: userId, recorded_at: today });
    if (existingProgress) {
      existingProgress.calories_burned = (existingProgress.calories_burned || 0) + finalCalories;
      await existingProgress.save();
    } else {
      const progressId = await getNextSequenceValue('progress_id');
      await Progress.create({
        progress_id: progressId,
        user_id: userId,
        weight: userWeight,
        bmi,
        body_fat: 0.0,
        calories_burned: finalCalories,
        recorded_at: today,
        source: 'workout'
      });
    }

    const totalWorkouts = await UserWorkout.countDocuments({ user_id: userId });
    if (totalWorkouts === 1) {
      await awardBadge(userId, 'First Workout Completed!');
    } else if (totalWorkouts === 5) {
      await awardBadge(userId, 'Fitness Novice (5 Workouts)');
    }

    res.status(201).json({ 
      message: 'Workout logged successfully.', 
      userWorkoutId, 
      caloriesBurned: finalCalories,
      streak: streakData
    });
  } catch (error) {
    console.error('Failed to log workout completion:', error);
    res.status(500).json({ message: 'Failed to record workout session.' });
  }
}

async function awardBadge(userId, badgeName) {
  try {
    const existing = await UserBadge.findOne({ user_id: userId, badge_name: badgeName });
    if (!existing) {
      const user_badge_id = await getNextSequenceValue('user_badge_id');
      await UserBadge.create({ user_badge_id, user_id: userId, badge_name: badgeName });
    }
  } catch (err) {
    console.error('Error awarding badge:', err.message);
  }
}

export async function getWorkoutHistory(req, res) {
  const userId = req.user.userId;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const skip = (page - 1) * limit;

  try {
    const total = await UserWorkout.countDocuments({ user_id: userId });
    const history = await UserWorkout.find({ user_id: userId })
      .sort({ logged_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const userWorkoutIds = history.map(h => h.user_workout_id);
    const workoutIds = history.map(h => h.workout_id).filter(Boolean);

    const [workouts, rawSets] = await Promise.all([
      Workout.find({ workout_id: { $in: workoutIds } }).lean(),
      WorkoutSet.find({ user_workout_id: { $in: userWorkoutIds } }).sort({ exercise_id: 1, set_number: 1 }).lean()
    ]);

    const workoutMap = {};
    workouts.forEach(w => { workoutMap[w.workout_id] = w; });

    const setExerciseIds = rawSets.map(s => s.exercise_id);
    const exercises = await Exercise.find({ exercise_id: { $in: setExerciseIds } }).lean();
    const exerciseMap = {};
    exercises.forEach(ex => { exerciseMap[ex.exercise_id] = ex; });

    const setsByWorkoutId = {};
    rawSets.forEach(ws => {
      if (!setsByWorkoutId[ws.user_workout_id]) setsByWorkoutId[ws.user_workout_id] = [];
      const ex = exerciseMap[ws.exercise_id];
      setsByWorkoutId[ws.user_workout_id].push({
        set_number: ws.set_number,
        reps: ws.reps,
        weight: ws.weight,
        exercise_name: ex?.exercise_name || 'Exercise',
        muscle_group: ex?.muscle_group || 'General'
      });
    });

    const fullHistory = history.map(log => {
      const workout = workoutMap[log.workout_id];
      return {
        user_workout_id: log.user_workout_id,
        logged_at: log.logged_at,
        actual_duration: log.actual_duration,
        actual_calories_burned: log.actual_calories_burned,
        workout_name: log.custom_name || workout?.workout_name || (log.is_custom ? 'Freestyle Session' : 'Workout'),
        difficulty: workout?.difficulty || 'Intermediate',
        is_custom: log.is_custom,
        muscle_groups: log.muscle_groups,
        completed_exercises: log.completed_exercises || [],
        sets: setsByWorkoutId[log.user_workout_id] || []
      };
    });

    res.status(200).json({
      history: fullHistory,
      total,
      page,
      limit,
      hasMore: (skip + fullHistory.length) < total
    });
  } catch (error) {
    console.error('Failed to fetch workout history:', error);
    res.status(500).json({ message: 'Failed to retrieve workout logs.' });
  }
}

export async function backfillExerciseMuscleGroups() {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('Skipping backfill exercise muscle groups until MongoDB connection is ready.');
      return;
    }

    const presetAbs = [
      { exercise_name: 'Abdominal Crunches', muscle_group: 'Abs', muscle_groups: ['abs', 'core'], difficulty: 'Beginner', calories_per_minute: 5.0 },
      { exercise_name: 'Plank Hold', muscle_group: 'Abs', muscle_groups: ['abs', 'core'], difficulty: 'Beginner', calories_per_minute: 4.5 },
      { exercise_name: 'Russian Twists', muscle_group: 'Abs', muscle_groups: ['abs', 'core', 'obliques'], difficulty: 'Beginner', calories_per_minute: 5.5 },
      { exercise_name: 'Bicycle Crunches', muscle_group: 'Abs', muscle_groups: ['abs', 'core', 'obliques'], difficulty: 'Intermediate', calories_per_minute: 6.0 }
    ];

    for (const abEx of presetAbs) {
      const exists = await Exercise.findOne({ exercise_name: abEx.exercise_name });
      if (!exists) {
        const exerciseId = await getNextSequenceValue('exercise_id');
        await Exercise.create({
          exercise_id: exerciseId,
          ...abEx,
          instructions: `Perform ${abEx.exercise_name} focusing on core activation and controlled breathing.`
        });
      }
    }

    const exercises = await Exercise.find({});
    for (const ex of exercises) {
      if (!ex.muscle_groups || ex.muscle_groups.length === 0) {
        const mg = (ex.muscle_group || 'general').toLowerCase();
        let tags = [mg];
        if (mg.includes('chest')) tags = ['chest', 'triceps', 'shoulders'];
        else if (mg.includes('back')) tags = ['back', 'biceps'];
        else if (mg.includes('leg')) tags = ['quads', 'hamstrings', 'glutes', 'calves', 'legs'];
        else if (mg.includes('shoulder')) tags = ['shoulders', 'triceps'];
        else if (mg.includes('arm')) tags = ['biceps', 'triceps'];
        else if (mg.includes('core') || mg.includes('abs')) tags = ['core', 'abs'];

        ex.muscle_groups = tags;
        await ex.save();
      }
    }
  } catch (err) {
    console.error('Error backfilling exercise muscle groups:', err.message);
  }
}

export async function getPrograms(req, res) {
  const userId = req.user.userId;
  try {
    const programs = await Program.find({
      $or: [{ user_id: null }, { user_id: userId }]
    }).sort({ program_id: 1 }).lean();

    const programIds = programs.map(p => p.program_id);
    const allDays = await WorkoutDay.find({ program_id: { $in: programIds } }).sort({ order_index: 1 }).lean();

    const daysByProgram = {};
    allDays.forEach(d => {
      if (!daysByProgram[d.program_id]) daysByProgram[d.program_id] = [];
      daysByProgram[d.program_id].push(d);
    });

    const result = programs.map(prog => ({
      ...prog,
      days: daysByProgram[prog.program_id] || []
    }));

    res.status(200).json({ programs: result });
  } catch (error) {
    console.error('Failed to get programs:', error);
    res.status(500).json({ message: 'Failed to retrieve workout programs.' });
  }
}

export async function createProgram(req, res) {
  const userId = req.user.userId;
  const { program_name, schedule_mode, is_active, days } = req.body;

  if (!program_name) {
    return res.status(400).json({ message: 'Program name is required.' });
  }

  const active = is_active ?? true;

  try {
    if (active) {
      await Program.updateMany({ user_id: userId }, { is_active: false });
    }

    const programId = await getNextSequenceValue('program_id');
    const newProgram = await Program.create({
      program_id: programId,
      user_id: userId,
      program_name: String(program_name).trim(),
      schedule_mode: schedule_mode || 'rotating',
      is_active: active
    });

    if (days && Array.isArray(days)) {
      for (let i = 0; i < days.length; i++) {
        const d = days[i];
        const dayId = await getNextSequenceValue('workout_day_id');
        await WorkoutDay.create({
          workout_day_id: dayId,
          program_id: programId,
          workout_id: d.workout_id || null,
          name: d.name || `Day ${i + 1}`,
          muscle_groups: d.muscle_groups || [],
          fixed_weekday: d.fixed_weekday || null,
          order_index: i + 1
        });
      }
    }

    res.status(201).json({ message: 'Program created successfully.', program: newProgram });
  } catch (error) {
    console.error('Failed to create program:', error);
    res.status(500).json({ message: 'Failed to create program.' });
  }
}

export async function activateProgram(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const programId = parseInt(id);

  if (isNaN(programId)) {
    return res.status(400).json({ message: 'Invalid program ID.' });
  }

  try {
    const existing = await Program.findOne({ program_id: programId, user_id: userId });
    if (!existing) {
      return res.status(404).json({ message: 'Program not found or access denied.' });
    }

    await Program.updateMany({ user_id: userId }, { is_active: false });
    const updated = await Program.findOneAndUpdate(
      { program_id: programId, user_id: userId },
      { is_active: true },
      { new: true }
    );

    res.status(200).json({ message: 'Program activated successfully.', program: updated });
  } catch (error) {
    console.error('Failed to activate program:', error);
    res.status(500).json({ message: 'Failed to activate program.' });
  }
}

export async function getTodaySuggestedWorkout(req, res) {
  const userId = req.user.userId;
  const { weekday } = req.query;

  try {
    let activeProgram = await Program.findOne({ user_id: userId, is_active: true }).lean();
    if (!activeProgram) {
      activeProgram = await Program.findOne({ user_id: userId }).lean();
    }

    if (!activeProgram) {
      return res.status(200).json({ suggested: null, isRestDay: false, program: null, message: 'No active workout program found.' });
    }

    const days = await WorkoutDay.find({ program_id: activeProgram.program_id }).sort({ order_index: 1 }).lean();
    if (days.length === 0) {
      return res.status(200).json({ suggested: null, isRestDay: false, program: activeProgram, message: 'Program has no workout days.' });
    }

    let suggestedDay = null;
    let isRestDay = false;

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayIndex = new Date().getDay();
    const targetWeekday = (weekday && typeof weekday === 'string')
      ? weekday.trim().toLowerCase()
      : weekdays[currentDayIndex].toLowerCase();

    suggestedDay = days.find(d => 
      d.fixed_weekday && d.fixed_weekday.trim().toLowerCase() === targetWeekday
    ) || null;

    if (activeProgram.schedule_mode === 'fixed') {
      if (!suggestedDay) {
        suggestedDay = days.find(d => d.name && d.name.toLowerCase().includes(targetWeekday)) || null;
      }
      if (!suggestedDay) {
        isRestDay = true;
      }
    } else if (!suggestedDay) {
      const weekdayOrderMap = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 0: 7 };
      const todayOrder = weekdayOrderMap[currentDayIndex];
      const matchedByOrder = days.find(d => d.order_index === todayOrder);

      if (matchedByOrder) {
        suggestedDay = matchedByOrder;
      } else {
        const dayLogs = await Promise.all(
          days.map(async (day) => {
            const lastLog = await UserWorkout.findOne({
              user_id: userId,
              workout_day_id: day.workout_day_id
            }).sort({ logged_at: -1 }).lean();

            return {
              day,
              lastLoggedAt: lastLog ? new Date(lastLog.logged_at).getTime() : 0
            };
          })
        );

        dayLogs.sort((a, b) => {
          if (a.lastLoggedAt !== b.lastLoggedAt) {
            return a.lastLoggedAt - b.lastLoggedAt;
          }
          return a.day.order_index - b.day.order_index;
        });

        suggestedDay = dayLogs[0].day;
      }
    }

    let exercises = [];
    if (suggestedDay) {
      if (suggestedDay.workout_id) {
        const workoutExs = await WorkoutExercise.find({ workout_id: suggestedDay.workout_id })
          .sort({ sequence_order: 1 })
          .lean();

        const exIds = workoutExs.map(we => we.exercise_id);
        const exDocs = await Exercise.find({ exercise_id: { $in: exIds } }).lean();
        const exMap = {};
        exDocs.forEach(e => { exMap[e.exercise_id] = e; });

        exercises = workoutExs.map(we => ({
          ...exMap[we.exercise_id],
          sequence_order: we.sequence_order,
          default_sets: we.default_sets,
          default_reps: we.default_reps
        }));
      } else {
        const targetTags = new Set();
        if (suggestedDay.muscle_groups && Array.isArray(suggestedDay.muscle_groups)) {
          suggestedDay.muscle_groups.forEach(m => targetTags.add(m.toLowerCase()));
        }
        const dayNameLower = (suggestedDay.name || '').toLowerCase();
        if (dayNameLower.includes('push')) { ['chest', 'shoulders', 'triceps'].forEach(m => targetTags.add(m)); }
        if (dayNameLower.includes('pull')) { ['back', 'biceps'].forEach(m => targetTags.add(m)); }
        if (dayNameLower.includes('leg')) { ['legs', 'quads', 'glutes', 'hamstrings', 'calves'].forEach(m => targetTags.add(m)); }
        if (dayNameLower.includes('abs') || dayNameLower.includes('core')) { ['abs', 'core'].forEach(m => targetTags.add(m)); }

        const tagsArr = Array.from(targetTags);
        if (tagsArr.length > 0) {
          exercises = await Exercise.find({
            $or: [
              { muscle_group: { $in: tagsArr.map(t => new RegExp(t, 'i')) } },
              { muscle_groups: { $in: tagsArr.map(t => new RegExp(t, 'i')) } }
            ]
          }).limit(4).lean();
        }
      }

      if (exercises && exercises.length > 4) {
        exercises = exercises.slice(0, 4);
      }
    }

    res.status(200).json({
      suggested: suggestedDay ? {
        ...suggestedDay,
        exercises
      } : null,
      isRestDay,
      program: activeProgram,
      allDays: days
    });
  } catch (error) {
    console.error('Failed to get suggested workout:', error);
    res.status(500).json({ message: 'Failed to retrieve today\'s suggested workout.' });
  }
}

export async function getMuscleGroupStatus(req, res) {
  const userId = req.user.userId;

  try {
    let targetMuscleGroups = new Set();
    const activeProgram = await Program.findOne({ user_id: userId, is_active: true }).lean();

    if (activeProgram) {
      const days = await WorkoutDay.find({ program_id: activeProgram.program_id }).lean();
      days.forEach(d => {
        if (d.muscle_groups && Array.isArray(d.muscle_groups)) {
          d.muscle_groups.forEach(mg => targetMuscleGroups.add(mg.toLowerCase()));
        }
      });
    }

    if (targetMuscleGroups.size === 0) {
      ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'].forEach(m => targetMuscleGroups.add(m));
    }

    const allUserLogs = await UserWorkout.find({ user_id: userId }).sort({ logged_at: -1 }).lean();
    const userWorkoutIds = allUserLogs.map(l => l.user_workout_id);

    const allSets = await WorkoutSet.find({ user_workout_id: { $in: userWorkoutIds } }).lean();
    const exerciseIds = allSets.map(s => s.exercise_id);
    const exercises = await Exercise.find({ exercise_id: { $in: exerciseIds } }).lean();

    const exerciseMap = {};
    exercises.forEach(ex => { exerciseMap[ex.exercise_id] = ex; });

    const setsByWorkoutId = {};
    allSets.forEach(s => {
      if (!setsByWorkoutId[s.user_workout_id]) setsByWorkoutId[s.user_workout_id] = [];
      setsByWorkoutId[s.user_workout_id].push(s);
    });

    const now = new Date();

    const statusList = Array.from(targetMuscleGroups).map(mg => {
      let lastTrainedDate = null;

      for (const log of allUserLogs) {
        let hasMg = log.muscle_groups && log.muscle_groups.some(m => m.toLowerCase() === mg);
        
        if (!hasMg) {
          const sets = setsByWorkoutId[log.user_workout_id] || [];
          for (const s of sets) {
            const ex = exerciseMap[s.exercise_id];
            if (ex) {
              const exMg = (ex.muscle_group || '').toLowerCase();
              const exMgs = (ex.muscle_groups || []).map(m => m.toLowerCase());
              if (exMg === mg || exMgs.includes(mg)) {
                hasMg = true;
                break;
              }
            }
          }
        }

        if (hasMg) {
          lastTrainedDate = new Date(log.logged_at);
          break;
        }
      }

      if (!lastTrainedDate) {
        return { muscleGroup: mg, daysAgo: null, label: 'Not trained yet' };
      }

      const diffTime = Math.abs(now - lastTrainedDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      let label = `${diffDays} days ago`;
      if (diffDays === 0) label = 'Today';
      else if (diffDays === 1) label = 'Yesterday';

      return { muscleGroup: mg, daysAgo: diffDays, label };
    });

    res.status(200).json({ status: statusList });
  } catch (error) {
    console.error('Failed to calculate muscle group status:', error);
    res.status(500).json({ message: 'Failed to get muscle group recovery status.' });
  }
}
