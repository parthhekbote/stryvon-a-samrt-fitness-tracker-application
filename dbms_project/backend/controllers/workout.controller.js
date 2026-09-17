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

    const workoutsWithCount = await Promise.all(
      workouts.map(async (workout) => {
        const count = await WorkoutExercise.countDocuments({ workout_id: workout.workout_id });
        return {
          ...workout,
          exercise_count: count
        };
      })
    );

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

  try {
    const workoutId = await getNextSequenceValue('workout_id');

    await Workout.create({
      workout_id: workoutId,
      workout_name,
      duration,
      calories_burned,
      difficulty: difficulty || 'Beginner',
      equipment_needed: equipment_needed || 'None',
      user_id: userId
    });

    if (exercises && Array.isArray(exercises)) {
      for (let i = 0; i < exercises.length; i++) {
        const item = exercises[i];
        await WorkoutExercise.create({
          workout_id: workoutId,
          exercise_id: item.exercise_id,
          sequence_order: i + 1,
          default_sets: item.sets || 3,
          default_reps: item.reps || 10
        });
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

  try {
    const workoutExs = await WorkoutExercise.find({ workout_id: parseInt(id) })
      .sort({ sequence_order: 1 })
      .lean();

    const exercises = await Promise.all(
      workoutExs.map(async (we) => {
        const ex = await Exercise.findOne({ exercise_id: we.exercise_id }).lean();
        return {
          ...ex,
          sequence_order: we.sequence_order,
          default_sets: we.default_sets,
          default_reps: we.default_reps
        };
      })
    );

    res.status(200).json({ exercises });
  } catch (error) {
    console.error('Failed to get workout exercises:', error);
    res.status(500).json({ message: 'Failed to retrieve exercises for this workout.' });
  }
}

export async function logWorkoutCompletion(req, res) {
  const userId = req.user.userId;
  const { workout_id, workout_day_id, is_custom, muscle_groups, duration, calories_burned, sets, completed_exercises } = req.body;

  if (!duration) {
    return res.status(400).json({ message: 'Duration is required to log workout session.' });
  }

  try {
    const parsedWorkoutId = (workout_id && !isNaN(parseInt(workout_id))) ? parseInt(workout_id) : null;
    const parsedWorkoutDayId = (workout_day_id && !isNaN(parseInt(workout_day_id))) ? parseInt(workout_day_id) : null;

    let finalCalories = calories_burned;

    if (!finalCalories) {
      if (parsedWorkoutId) {
        const workoutExercises = await WorkoutExercise.find({ workout_id: parsedWorkoutId }).lean();
        if (workoutExercises.length > 0) {
          const exerciseIds = workoutExercises.map(e => e.exercise_id);
          const exercisesData = await Exercise.find({ exercise_id: { $in: exerciseIds } });
          const sumCaloriesPerMin = exercisesData.reduce((sum, ex) => sum + parseFloat(ex.calories_per_minute || 5.0), 0);
          const averageBurnRate = sumCaloriesPerMin / exercisesData.length;
          finalCalories = Math.round(averageBurnRate * duration);
        } else {
          finalCalories = Math.round(5.0 * duration);
        }
      } else if (sets && sets.length > 0) {
        const setExIds = sets.map(s => s.exercise_id).filter(Boolean);
        const exercisesData = await Exercise.find({ exercise_id: { $in: setExIds } });
        if (exercisesData.length > 0) {
          const sumCaloriesPerMin = exercisesData.reduce((sum, ex) => sum + parseFloat(ex.calories_per_minute || 5.0), 0);
          const averageBurnRate = sumCaloriesPerMin / exercisesData.length;
          finalCalories = Math.round(averageBurnRate * duration);
        } else {
          finalCalories = Math.round(5.0 * duration);
        }
      } else {
        finalCalories = Math.round(5.0 * duration);
      }
    }

    // Infer muscle groups if custom or missing
    let finalMuscleGroups = muscle_groups || [];
    if (!finalMuscleGroups || finalMuscleGroups.length === 0) {
      const mgSet = new Set();
      if (sets && Array.isArray(sets)) {
        for (const s of sets) {
          const ex = await Exercise.findOne({ exercise_id: s.exercise_id }).lean();
          if (ex) {
            if (ex.muscle_group) mgSet.add(ex.muscle_group.toLowerCase());
            if (ex.muscle_groups && Array.isArray(ex.muscle_groups)) {
              ex.muscle_groups.forEach(m => mgSet.add(m.toLowerCase()));
            }
          }
        }
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
      is_custom: !!is_custom,
      muscle_groups: finalMuscleGroups,
      completed_exercises: completedExList,
      actual_duration: duration,
      actual_calories_burned: finalCalories,
      logged_at: new Date()
    });

    if (sets && Array.isArray(sets) && sets.length > 0) {
      for (const set of sets) {
        const setId = await getNextSequenceValue('set_id');
        await WorkoutSet.create({
          set_id: setId,
          user_workout_id: userWorkoutId,
          exercise_id: set.exercise_id,
          set_number: set.set_number,
          reps: set.reps,
          weight: set.weight
        });
      }
    }

    const streakData = await updateStreak(userId, req.body.user_date);

    // Update progress table's calories_burned for today
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
        recorded_at: today
      });
    }

    // Award badges
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

  try {
    const history = await UserWorkout.find({ user_id: userId })
      .sort({ logged_at: -1 })
      .lean();

    const fullHistory = await Promise.all(
      history.map(async (log) => {
        const workout = await Workout.findOne({ workout_id: log.workout_id }).lean();
        const rawSets = await WorkoutSet.find({ user_workout_id: log.user_workout_id })
          .sort({ exercise_id: 1, set_number: 1 })
          .lean();

        const sets = await Promise.all(
          rawSets.map(async (ws) => {
            const ex = await Exercise.findOne({ exercise_id: ws.exercise_id }).lean();
            return {
              set_number: ws.set_number,
              reps: ws.reps,
              weight: ws.weight,
              exercise_name: ex?.exercise_name || 'Exercise',
              muscle_group: ex?.muscle_group || 'General'
            };
          })
        );

        return {
          user_workout_id: log.user_workout_id,
          logged_at: log.logged_at,
          actual_duration: log.actual_duration,
          actual_calories_burned: log.actual_calories_burned,
          workout_name: workout?.workout_name || (log.is_custom ? 'Freestyle Session' : 'Workout'),
          difficulty: workout?.difficulty || 'Intermediate',
          is_custom: log.is_custom,
          muscle_groups: log.muscle_groups,
          completed_exercises: log.completed_exercises || [],
          sets
        };
      })
    );

    res.status(200).json({ history: fullHistory });
  } catch (error) {
    console.error('Failed to fetch workout history:', error);
    res.status(500).json({ message: 'Failed to retrieve workout logs.' });
  }
}

// ---------------------- PROGRAM & SCHEDULING CONTROLLERS ----------------------

export async function backfillExerciseMuscleGroups() {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('Skipping backfill exercise muscle groups until MongoDB connection is ready.');
      return;
    }
    const exercises = await Exercise.find({});
    for (const ex of exercises) {
      if (!ex.muscle_groups || ex.muscle_groups.length === 0) {
        const mg = (ex.muscle_group || 'general').toLowerCase();
        let tags = [mg];
        if (mg.includes('chest')) tags = ['chest', 'triceps', 'shoulders'];
        else if (mg.includes('back')) tags = ['back', 'biceps'];
        else if (mg.includes('leg')) tags = ['quads', 'hamstrings', 'glutes', 'calves'];
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

    const result = await Promise.all(
      programs.map(async (prog) => {
        const days = await WorkoutDay.find({ program_id: prog.program_id })
          .sort({ order_index: 1 })
          .lean();
        return {
          ...prog,
          days
        };
      })
    );

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

  try {
    // If setting is_active to true, deactivate all other user programs
    if (is_active) {
      await Program.updateMany({ user_id: userId }, { is_active: false });
    }

    const programId = await getNextSequenceValue('program_id');
    const newProgram = await Program.create({
      program_id: programId,
      user_id: userId,
      program_name,
      schedule_mode: schedule_mode || 'rotating',
      is_active: is_active ?? true
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

  try {
    await Program.updateMany({ user_id: userId }, { is_active: false });
    const updated = await Program.findOneAndUpdate(
      { program_id: parseInt(id), user_id: userId },
      { is_active: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Program not found.' });
    }

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
    // Find active program for user
    let activeProgram = await Program.findOne({ user_id: userId, is_active: true }).lean();

    // If no active program, check if any user program exists
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

    if (activeProgram.schedule_mode === 'fixed') {
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const targetWeekday = (weekday && typeof weekday === 'string')
        ? weekday.trim().toLowerCase()
        : weekdays[new Date().getDay()].toLowerCase();

      suggestedDay = days.find(d => 
        d.fixed_weekday && d.fixed_weekday.trim().toLowerCase() === targetWeekday
      ) || null;

      if (!suggestedDay) {
        isRestDay = true;
      }
    } else {
      // Rotating mode: Find WorkoutDay whose most recent UserWorkout log is the oldest (or null)
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

      // Sort by lastLoggedAt ascending (0 = never logged = highest priority), tie-breaker order_index ascending
      dayLogs.sort((a, b) => {
        if (a.lastLoggedAt !== b.lastLoggedAt) {
          return a.lastLoggedAt - b.lastLoggedAt;
        }
        return a.day.order_index - b.day.order_index;
      });

      suggestedDay = dayLogs[0].day;
    }

    // Attach exercises if workout_id is linked
    let exercises = [];
    if (suggestedDay && suggestedDay.workout_id) {
      const workoutExs = await WorkoutExercise.find({ workout_id: suggestedDay.workout_id })
        .sort({ sequence_order: 1 })
        .lean();

      exercises = await Promise.all(
        workoutExs.map(async (we) => {
          const ex = await Exercise.findOne({ exercise_id: we.exercise_id }).lean();
          return {
            ...ex,
            sequence_order: we.sequence_order,
            default_sets: we.default_sets,
            default_reps: we.default_reps
          };
        })
      );
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
    // 1. Get active program to identify target muscle groups
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

    // Default fallback muscle groups if program has none
    if (targetMuscleGroups.size === 0) {
      ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'].forEach(m => targetMuscleGroups.add(m));
    }

    // 2. Scan ALL UserWorkout logs for this user across all history
    const allUserLogs = await UserWorkout.find({ user_id: userId }).sort({ logged_at: -1 }).lean();
    const now = new Date();

    const statusList = await Promise.all(
      Array.from(targetMuscleGroups).map(async (mg) => {
        let lastTrainedDate = null;

        for (const log of allUserLogs) {
          // Check if log explicitly has this muscle group
          let hasMg = log.muscle_groups && log.muscle_groups.some(m => m.toLowerCase() === mg);
          
          if (!hasMg) {
            // Infer from workout sets exercises
            const sets = await WorkoutSet.find({ user_workout_id: log.user_workout_id }).lean();
            for (const s of sets) {
              const ex = await Exercise.findOne({ exercise_id: s.exercise_id }).lean();
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
      })
    );

    res.status(200).json({ status: statusList });
  } catch (error) {
    console.error('Failed to calculate muscle group status:', error);
    res.status(500).json({ message: 'Failed to get muscle group recovery status.' });
  }
}
