import {
  Progress,
  User,
  MealLog,
  UserWorkout,
  WorkoutExercise,
  Exercise,
  UserBadge,
  getNextSequenceValue
} from '../models/index.js';

export async function logProgress(req, res) {
  const userId = req.user.userId;
  const { weight, body_fat, recorded_at } = req.body;

  if (!weight) {
    return res.status(400).json({ message: 'Weight is required.' });
  }

  const parsedWeight = parseFloat(weight);
  if (isNaN(parsedWeight) || parsedWeight < 20 || parsedWeight > 500) {
    return res.status(400).json({ message: 'Weight must be between 20 kg and 500 kg.' });
  }

  const logDate = recorded_at || new Date().toISOString().split('T')[0];

  try {
    const user = await User.findOne({ user_id: userId });
    if (!user) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    const height = user.height;
    let bmi = 0;
    if (height && height > 0) {
      const heightM = height / 100;
      bmi = parseFloat((parsedWeight / (heightM * heightM)).toFixed(2));
    }

    const now = new Date();
    const parsedBodyFat = (body_fat !== undefined && body_fat !== null && body_fat !== '') ? parseFloat(body_fat) : null;

    const updatePayload = {
      weight: parsedWeight,
      bmi,
      source: 'manual'
    };
    if (parsedBodyFat !== null && !isNaN(parsedBodyFat)) {
      updatePayload.body_fat = parsedBodyFat;
    }

    const updateRes = await Progress.updateMany(
      { user_id: userId, recorded_at: logDate },
      { $set: updatePayload }
    );

    if (updateRes.matchedCount === 0) {
      try {
        const progressId = await getNextSequenceValue('progress_id');
        await Progress.create({
          progress_id: progressId,
          user_id: userId,
          weight: parsedWeight,
          bmi,
          body_fat: (parsedBodyFat !== null && !isNaN(parsedBodyFat)) ? parsedBodyFat : 0.0,
          recorded_at: logDate,
          source: 'manual'
        });
      } catch (createErr) {
        if (createErr.code === 11000) {
          await Progress.updateMany(
            { user_id: userId, recorded_at: logDate },
            { $set: updatePayload }
          );
        } else {
          throw createErr;
        }
      }
    }

    user.weight = parsedWeight;
    user.last_weight_logged_at = now;
    await user.save();

    const totalLogs = await Progress.countDocuments({ user_id: userId });
    if (totalLogs === 1) {
      await awardBadge(userId, 'First Progress Logged');
    }

    res.status(200).json({ message: 'Progress logged successfully.', bmi, weight: parsedWeight });
  } catch (error) {
    console.error('Failed to log progress:', error);
    res.status(500).json({ message: 'Failed to record progress stats.' });
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

export async function getAnalytics(req, res) {
  const userId = req.user.userId;
  const daysParam = parseInt(req.query.days || req.query.duration || 30);
  const daysLimit = !isNaN(daysParam) && daysParam > 0 && daysParam <= 365 ? daysParam : 30;

  try {
    // 1. Fetch weight progress logs (excluding workout-generated progress rows)
    const rawWeightLogs = await Progress.find({
      user_id: userId,
      $or: [{ source: { $in: ['manual', 'profile', 'register'] } }, { source: { $exists: false } }]
    })
      .sort({ recorded_at: -1, _id: -1 })
      .limit(daysLimit * 2)
      .lean();

    // Deduplicate weight entries by date, prioritizing manual > profile > register, then latest _id
    const priorityMap = { manual: 3, profile: 2, register: 1 };
    const dateDedupped = {};

    rawWeightLogs.forEach(log => {
      const key = log.recorded_at;
      const currentSource = log.source || 'manual';
      const currentPriority = priorityMap[currentSource] || 1;

      if (!dateDedupped[key]) {
        dateDedupped[key] = { log, priority: currentPriority };
      } else {
        if (currentPriority >= dateDedupped[key].priority) {
          dateDedupped[key] = { log, priority: currentPriority };
        }
      }
    });

    const weightLogs = Object.values(dateDedupped)
      .map(item => item.log)
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));

    // 2. Fetch calories consumed vs burned history (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const mealLogs = await MealLog.find({
      user_id: userId,
      logged_at: { $gte: sevenDaysAgo }
    }).lean();

    const burnedLogs = await UserWorkout.find({
      user_id: userId,
      logged_at: { $gte: sevenDaysAgo }
    }).lean();

    const dateMap = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${dayStr}`;
      dateMap[dateKey] = { date: dateKey, consumed: 0, burned: 0 };
    }

    const formatDateKey = (rawDate) => {
      if (!rawDate) return '';
      if (typeof rawDate === 'string') return rawDate.split('T')[0].split(' ')[0];
      if (rawDate instanceof Date) {
        const y = rawDate.getFullYear();
        const m = String(rawDate.getMonth() + 1).padStart(2, '0');
        const d = String(rawDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return String(rawDate).split('T')[0];
    };

    mealLogs.forEach(log => {
      const dateKey = formatDateKey(log.logged_at);
      if (dateMap[dateKey]) {
        dateMap[dateKey].consumed += (log.calories || 0);
      }
    });

    burnedLogs.forEach(log => {
      const dateKey = formatDateKey(log.logged_at);
      if (dateMap[dateKey]) {
        dateMap[dateKey].burned += (log.actual_calories_burned || 0);
      }
    });

    const calorieHistory = Object.values(dateMap);

    // 3. Muscle Group distribution
    const userWorkouts = await UserWorkout.find({ user_id: userId }).lean();
    const workoutIds = userWorkouts.map(uw => uw.workout_id).filter(Boolean);
    const workoutExercises = await WorkoutExercise.find({ workout_id: { $in: workoutIds } }).lean();
    const exerciseIds = workoutExercises.map(we => we.exercise_id).filter(Boolean);
    const exercises = await Exercise.find({ exercise_id: { $in: exerciseIds } }).lean();

    const exerciseMap = {};
    exercises.forEach(ex => { exerciseMap[ex.exercise_id] = ex.muscle_group; });

    const muscleCounts = {};
    workoutExercises.forEach(we => {
      const muscle = exerciseMap[we.exercise_id] || 'General';
      muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1;
    });

    const muscleGroups = Object.keys(muscleCounts).map(group => ({
      muscle_group: group,
      count: muscleCounts[group]
    }));

    // 4. Workout Frequency
    const weeklyMap = {};
    userWorkouts.forEach(uw => {
      const d = new Date(uw.logged_at);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const firstJan = new Date(year, 0, 1);
        const weekNum = Math.ceil((((d - firstJan) / 86400000) + firstJan.getDay() + 1) / 7);
        const weekKey = `${year}${String(weekNum).padStart(2, '0')}`;
        weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + 1;
      }
    });

    const weeklyFreq = Object.keys(weeklyMap)
      .sort()
      .slice(-10)
      .map(week => ({ week, count: weeklyMap[week] }));

    const user = await User.findOne({ user_id: userId }).lean();
    const totalWorkouts = userWorkouts.length;

    res.status(200).json({
      user,
      totalWorkouts,
      weightLogs,
      calorieHistory,
      muscleGroups,
      weeklyFreq
    });
  } catch (error) {
    console.error('Failed to get analytics:', error);
    res.status(500).json({ message: 'Failed to retrieve analytics data.' });
  }
}

export async function getPdfReportData(req, res) {
  const userId = req.user.userId;

  try {
    const user = await User.findOne({ user_id: userId }).lean();
    const workouts = await UserWorkout.find({ user_id: userId }).lean();
    const weightHistory = await Progress.find({
      user_id: userId,
      $or: [{ source: { $in: ['manual', 'profile', 'register'] } }, { source: { $exists: false } }]
    })
      .sort({ recorded_at: 1 })
      .limit(30)
      .lean();

    const totalWorkouts = workouts.length;
    const currentWeightVal = user?.weight || (weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : null);
    let bmiVal = null;
    if (user?.height && currentWeightVal) {
      const hM = user.height / 100;
      bmiVal = parseFloat((currentWeightVal / (hM * hM)).toFixed(1));
    }

    const targetMuscles = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Core', 'Calves'];
    const muscleCounts = {};
    targetMuscles.forEach(m => { muscleCounts[m] = 0; });

    workouts.forEach(w => {
      const tags = (w.muscle_groups || []).map(m => String(m).toLowerCase().trim());
      targetMuscles.forEach(target => {
        const lowerTarget = target.toLowerCase();
        if (tags.some(t => t.includes(lowerTarget) || lowerTarget.includes(t))) {
          muscleCounts[target] = (muscleCounts[target] || 0) + 1;
        }
      });
    });

    res.status(200).json({
      user: {
        name: user?.name || user?.username || 'Member',
        email: user?.email,
        goal_type: user?.goal_type || 'Maintain & Tone',
        streak_count: user?.current_streak ?? user?.streak_count ?? 0,
        height: user?.height || null,
        weight: currentWeightVal
      },
      stats: {
        totalWorkouts,
        currentStreak: user?.current_streak ?? user?.streak_count ?? 0,
        currentWeight: currentWeightVal ? `${currentWeightVal} kg` : 'N/A',
        bmi: bmiVal ? `${bmiVal}` : 'N/A',
        goalType: user?.goal_type || 'Maintain & Tone'
      },
      muscleTelemetry: muscleCounts,
      weightHistory
    });
  } catch (error) {
    console.error('Failed to generate report data:', error);
    res.status(500).json({ message: 'Failed to extract progress report data.' });
  }
}

export async function getMuscleTelemetry(req, res) {
  const userId = req.user.userId;
  let { startDate, endDate, muscles } = req.query;

  try {
    const now = new Date();
    // Default endDate to today (YYYY-MM-DD)
    const todayStr = (endDate && typeof endDate === 'string') ? endDate.trim() : now.toISOString().split('T')[0];

    // Default startDate to 30 days ago if missing
    let startStr = (startDate && typeof startDate === 'string') ? startDate.trim() : null;
    if (!startStr) {
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startStr = d30.toISOString().split('T')[0];
    }

    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startStr) || !dateRegex.test(todayStr)) {
      return res.status(400).json({ message: 'Invalid date format. Expected YYYY-MM-DD.' });
    }

    const startObj = new Date(`${startStr}T00:00:00.000Z`);
    const endObj = new Date(`${todayStr}T23:59:59.999Z`);

    if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
      return res.status(400).json({ message: 'Invalid start or end date.' });
    }

    if (startObj > endObj) {
      return res.status(400).json({ message: 'Start date cannot be after end date.' });
    }

    // Guard against future start dates (allow up to current date)
    const tomorrowObj = new Date();
    tomorrowObj.setHours(23, 59, 59, 999);
    if (startObj > tomorrowObj) {
      return res.status(400).json({ message: 'Start date cannot be in the future.' });
    }

    // Parse list of target muscles
    let targetMuscles = [];
    if (muscles) {
      if (Array.isArray(muscles)) {
        targetMuscles = muscles.map(m => String(m).toLowerCase().trim()).filter(Boolean);
      } else if (typeof muscles === 'string') {
        targetMuscles = muscles.split(',').map(m => m.toLowerCase().trim()).filter(Boolean);
      }
    }

    if (targetMuscles.length === 0) {
      targetMuscles = [
        'chest', 'back', 'shoulders', 'biceps', 'triceps', 'core', 'traps', 'forearms', 'lats',
        'quads', 'hamstrings', 'glutes', 'calves', 'adductors'
      ];
    }

    // Query completed workouts for user within date window
    const userWorkouts = await UserWorkout.find({
      user_id: userId,
      logged_at: { $gte: startObj, $lte: endObj }
    }).lean();

    // Aggregation: count completed sessions tagged with each target muscle group
    const counts = {};
    targetMuscles.forEach(m => { counts[m] = 0; });

    userWorkouts.forEach(workout => {
      const sessionTags = (workout.muscle_groups || []).map(m => String(m).toLowerCase().trim());

      targetMuscles.forEach(target => {
        const isMatch = sessionTags.some(tag => tag === target || tag.includes(target) || target.includes(tag));
        if (isMatch) {
          counts[target] = (counts[target] || 0) + 1;
        }
      });
    });

    res.status(200).json({
      startDate: startStr,
      endDate: todayStr,
      totalSessions: userWorkouts.length,
      telemetry: counts
    });
  } catch (error) {
    console.error('Failed to aggregate muscle telemetry:', error);
    res.status(500).json({ message: 'Failed to aggregate muscle telemetry data.' });
  }
}
