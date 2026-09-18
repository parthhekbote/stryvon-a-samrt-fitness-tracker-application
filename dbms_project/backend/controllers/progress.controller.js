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

    // 12-hour Cooldown Check for manual weight logs
    const lastManualProgress = await Progress.findOne({
      user_id: userId,
      $or: [{ source: 'manual' }, { source: { $exists: false } }]
    }).sort({ created_at: -1, _id: -1 });

    const now = new Date();
    let lastLoggedTime = null;

    if (lastManualProgress && lastManualProgress._id) {
      lastLoggedTime = lastManualProgress._id.getTimestamp();
    } else if (user.last_weight_logged_at) {
      lastLoggedTime = new Date(user.last_weight_logged_at);
    }

    if (lastLoggedTime) {
      const diffMs = now.getTime() - lastLoggedTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < 12) {
        const remainingHours = Math.ceil(12 - diffHours);
        return res.status(400).json({
          message: `Weight can only be logged once every 12 hours. Please wait ${remainingHours} more hour(s).`
        });
      }
    }

    const height = user.height;
    let bmi = 0;
    if (height && height > 0) {
      const heightM = height / 100;
      bmi = parseFloat((parsedWeight / (heightM * heightM)).toFixed(2));
    }

    const existingProgress = await Progress.findOne({ user_id: userId, recorded_at: logDate, source: 'manual' });
    if (existingProgress) {
      existingProgress.weight = parsedWeight;
      existingProgress.bmi = bmi;
      if (body_fat !== undefined) existingProgress.body_fat = parseFloat(body_fat);
      await existingProgress.save();
    } else {
      const progressId = await getNextSequenceValue('progress_id');
      await Progress.create({
        progress_id: progressId,
        user_id: userId,
        weight: parsedWeight,
        bmi,
        body_fat: body_fat ? parseFloat(body_fat) : 0,
        recorded_at: logDate,
        source: 'manual'
      });
    }

    user.weight = parsedWeight;
    user.last_weight_logged_at = now;
    await user.save();

    const totalLogs = await Progress.countDocuments({ user_id: userId });
    if (totalLogs === 1) {
      await awardBadge(userId, 'First Progress Logged');
    }

    res.status(200).json({ message: 'Progress logged successfully.', bmi });
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
      .sort({ recorded_at: -1 })
      .limit(daysLimit)
      .lean();

    // Deduplicate weight entries by date, prioritizing manual > profile > register
    const priorityMap = { manual: 3, profile: 2, register: 1 };
    const dateDedupped = {};

    rawWeightLogs.forEach(log => {
      const key = log.recorded_at;
      const currentSource = log.source || 'manual';
      const currentPriority = priorityMap[currentSource] || 1;

      if (!dateDedupped[key] || currentPriority > dateDedupped[key].priority) {
        dateDedupped[key] = { log, priority: currentPriority };
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

    res.status(200).json({
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
    const meals = await MealLog.find({ user_id: userId }).lean();
    const weightHistory = await Progress.find({
      user_id: userId,
      $or: [{ source: { $in: ['manual', 'profile', 'register'] } }, { source: { $exists: false } }]
    })
      .sort({ recorded_at: -1 })
      .limit(10)
      .lean();

    const totalWorkouts = workouts.length;
    const totalDuration = workouts.reduce((sum, w) => sum + (w.actual_duration || 0), 0);
    const totalBurned = workouts.reduce((sum, w) => sum + (w.actual_calories_burned || 0), 0);
    const totalMeals = meals.length;
    const avgCalories = totalMeals > 0 ? Math.round(meals.reduce((sum, m) => sum + (m.calories || 0), 0) / totalMeals) : 0;

    res.status(200).json({
      summary: {
        user,
        stats: {
          totalWorkouts,
          totalDuration,
          totalBurned,
          totalMeals,
          avgCalories
        },
        weightHistory
      }
    });
  } catch (error) {
    console.error('Failed to generate report:', error);
    res.status(500).json({ message: 'Failed to extract progress report.' });
  }
}
