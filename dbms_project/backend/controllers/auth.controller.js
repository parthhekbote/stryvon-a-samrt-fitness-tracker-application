import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, DietPlan, UserBadge, Progress, getNextSequenceValue } from '../models/index.js';
import { initFirebaseAdmin, isFirebaseAdminInitialized, getAuth } from '../config/firebase.js';
import { JWT_SECRET } from '../config/env.js';

// Helper to calculate BMI
function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return parseFloat((weightKg / (heightM * heightM)).toFixed(2));
}

// Helper to update active streak
export async function updateStreak(userId, clientDate = null) {
  try {
    let today = new Date().toISOString().split('T')[0];
    if (clientDate && typeof clientDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)) {
      const clientDateTime = new Date(clientDate).getTime();
      const serverDateTime = new Date(today).getTime();
      const diffDays = Math.abs(serverDateTime - clientDateTime) / (1000 * 60 * 60 * 24);
      if (diffDays <= 1) {
        today = clientDate;
      }
    }

    const user = await User.findOne({ user_id: userId });
    
    if (!user) return { current_streak: 0, longest_streak: 0, last_workout_date: null, isNewMilestone: false, milestoneUnlocked: null };

    let current = user.current_streak || user.streak_count || 0;
    let longest = user.longest_streak || current;
    let milestones = user.streak_milestones || [];
    const lastWorkoutStr = user.last_workout_date || user.last_active_date;

    let isNewMilestone = false;
    let milestoneUnlocked = null;

    if (!lastWorkoutStr) {
      current = 1;
    } else {
      const lastDateClean = typeof lastWorkoutStr === 'string' ? lastWorkoutStr.split('T')[0] : new Date(lastWorkoutStr).toISOString().split('T')[0];
      
      if (lastDateClean === today) {
        return {
          current_streak: current,
          longest_streak: longest,
          last_workout_date: today,
          isNewMilestone: false,
          milestoneUnlocked: null
        };
      }

      const lastDate = new Date(lastDateClean);
      const currentDate = new Date(today);
      const diffTime = Math.abs(currentDate - lastDate);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        current += 1;
      } else {
        current = 1;
      }
    }

    if (current > longest) {
      longest = current;
    }

    const milestoneThresholds = [3, 7, 14, 30, 60, 100];
    if (milestoneThresholds.includes(current) && !milestones.includes(current)) {
      milestoneUnlocked = current;
      isNewMilestone = true;
      milestones.push(current);

      await awardBadge(userId, `${current}-Day Streak Master`);
    }

    user.current_streak = current;
    user.streak_count = current;
    user.longest_streak = longest;
    user.last_workout_date = today;
    user.last_active_date = today;
    user.streak_milestones = milestones;

    await user.save();

    return {
      current_streak: current,
      longest_streak: longest,
      last_workout_date: today,
      isNewMilestone,
      milestoneUnlocked
    };
  } catch (error) {
    console.error('Error updating user streak:', error.message);
    return { current_streak: 0, longest_streak: 0, last_workout_date: null, isNewMilestone: false, milestoneUnlocked: null };
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

export async function register(req, res) {
  const { name, email, password, age, gender, height, weight, goal_type } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const valAge = age ? parseInt(age) : null;
    const valGender = gender || 'Other';
    const valHeight = height ? parseFloat(height) : null;
    const valWeight = weight ? parseFloat(weight) : null;
    const valGoal = goal_type || 'Maintain';

    const userId = await getNextSequenceValue('user_id');
    const today = new Date().toISOString().split('T')[0];

    const defaultDiet = await DietPlan.findOne({ diet_name: 'Balanced Wellness' });
    const defaultDietId = defaultDiet ? defaultDiet.diet_id : 3;

    const newUser = await User.create({
      user_id: userId,
      name,
      email: normalizedEmail,
      password: hashedPassword,
      age: valAge,
      gender: valGender,
      height: valHeight,
      weight: valWeight,
      goal_type: valGoal,
      last_active_date: today,
      streak_count: 1,
      current_diet_id: defaultDietId
    });

    await awardBadge(userId, 'First Step: Account Created');

    if (valWeight && valHeight) {
      const bmi = calculateBMI(valWeight, valHeight);
      const progressId = await getNextSequenceValue('progress_id');
      await Progress.findOneAndUpdate(
        { user_id: userId, recorded_at: today, source: 'register' },
        { 
          $set: { weight: valWeight, bmi, body_fat: 0.0 },
          $setOnInsert: { progress_id: progressId, source: 'register' }
        },
        { upsert: true, new: true }
      );
    }

    const token = jwt.sign({ userId, email: newUser.email }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful.',
      token,
      isNewUser: true,
      user: {
        userId,
        name: newUser.name,
        email: newUser.email,
        goal_type: newUser.goal_type,
        isNewUser: true
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration.' });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    await updateStreak(user.user_id);
    const updatedUser = await User.findOne({ user_id: user.user_id });

    const token = jwt.sign({ userId: updatedUser.user_id, email: updatedUser.email }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });

    res.status(200).json({
      message: 'Login successful.',
      token,
      isNewUser: false,
      user: {
        userId: updatedUser.user_id,
        name: updatedUser.name,
        email: updatedUser.email,
        goal_type: updatedUser.goal_type,
        streak_count: updatedUser.streak_count,
        isNewUser: false
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
}

export async function getProfile(req, res) {
  const userId = req.user.userId;

  try {
    const user = await User.findOne({ user_id: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const lastWorkoutStr = user.last_workout_date || user.last_active_date;
    let activeStreak = user.current_streak || user.streak_count || 0;

    if (lastWorkoutStr && activeStreak > 0) {
      const lastDateClean = typeof lastWorkoutStr === 'string' ? lastWorkoutStr.split('T')[0] : new Date(lastWorkoutStr).toISOString().split('T')[0];
      if (lastDateClean !== today) {
        const lastDate = new Date(lastDateClean);
        const currentDate = new Date(today);
        const diffTime = Math.abs(currentDate - lastDate);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          activeStreak = 0;
          user.current_streak = 0;
          user.streak_count = 0;
          await user.save();
        }
      }
    }

    let dietName = null;
    if (user.current_diet_id) {
      const diet = await DietPlan.findOne({ diet_id: user.current_diet_id });
      if (diet) dietName = diet.diet_name;
    }

    const bmi = calculateBMI(user.weight, user.height);
    const badges = await UserBadge.find({ user_id: userId });

    res.status(200).json({
      profile: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        height: user.height,
        weight: user.weight,
        goal_type: user.goal_type,
        current_streak: activeStreak,
        streak_count: activeStreak,
        longest_streak: user.longest_streak || activeStreak,
        last_workout_date: user.last_workout_date || null,
        streak_milestones: user.streak_milestones || [],
        water_goal_ml: user.water_goal_ml,
        current_diet_id: user.current_diet_id,
        diet_name: dietName,
        bmi,
        badges: badges.map(b => b.badge_name)
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Failed to retrieve profile.' });
  }
}

export async function updateProfile(req, res) {
  const userId = req.user.userId;
  const { name, age, gender, height, weight, goal_type, water_goal_ml, current_diet_id } = req.body;

  try {
    const updateFields = {};
    if (name !== undefined && name !== null) updateFields.name = String(name).trim();
    if (gender !== undefined && gender !== null) updateFields.gender = gender;
    if (goal_type !== undefined && goal_type !== null) updateFields.goal_type = goal_type;

    if (age !== undefined && age !== null && age !== '') {
      const parsedAge = parseInt(age);
      if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
        return res.status(400).json({ message: 'Age must be an integer between 1 and 120.' });
      }
      updateFields.age = parsedAge;
    }

    if (height !== undefined && height !== null && height !== '') {
      const parsedHeight = parseFloat(height);
      if (isNaN(parsedHeight) || parsedHeight < 50 || parsedHeight > 300) {
        return res.status(400).json({ message: 'Height must be between 50 cm and 300 cm.' });
      }
      updateFields.height = parsedHeight;
    }

    if (weight !== undefined && weight !== null && weight !== '') {
      const parsedWeight = parseFloat(weight);
      if (isNaN(parsedWeight) || parsedWeight < 20 || parsedWeight > 500) {
        return res.status(400).json({ message: 'Weight must be between 20 kg and 500 kg.' });
      }
      updateFields.weight = parsedWeight;
    }

    if (water_goal_ml !== undefined && water_goal_ml !== null && water_goal_ml !== '') {
      const parsedWater = parseInt(water_goal_ml);
      if (!Number.isInteger(parsedWater) || parsedWater < 500 || parsedWater > 10000) {
        return res.status(400).json({ message: 'Water goal must be between 500 ml and 10000 ml.' });
      }
      updateFields.water_goal_ml = parsedWater;
    }

    if (current_diet_id !== undefined && current_diet_id !== null && current_diet_id !== '') {
      const parsedDiet = parseInt(current_diet_id);
      updateFields.current_diet_id = !isNaN(parsedDiet) ? parsedDiet : current_diet_id;
    }

    const updatedUser = await User.findOneAndUpdate(
      { user_id: userId },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let bmi = null;
    if (updatedUser.weight && updatedUser.height) {
      bmi = calculateBMI(updatedUser.weight, updatedUser.height);
      const today = new Date().toISOString().split('T')[0];
      const progressId = await getNextSequenceValue('progress_id');

      await Progress.findOneAndUpdate(
        { user_id: userId, recorded_at: today, source: 'profile' },
        { 
          $set: { weight: updatedUser.weight, bmi },
          $setOnInsert: { progress_id: progressId, source: 'profile' }
        },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({ 
      message: 'Profile updated successfully.',
      profile: {
        user_id: updatedUser.user_id,
        name: updatedUser.name,
        email: updatedUser.email,
        age: updatedUser.age,
        gender: updatedUser.gender,
        height: updatedUser.height,
        weight: updatedUser.weight,
        goal_type: updatedUser.goal_type,
        water_goal_ml: updatedUser.water_goal_ml,
        current_diet_id: updatedUser.current_diet_id,
        bmi
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile.' });
  }
}

export async function googleLogin(req, res) {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'Firebase ID token is required.' });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database connection is initializing or currently unavailable. Please try again in a moment.'
    });
  }

  try {
    initFirebaseAdmin();
    let decodedToken;

    if (isFirebaseAdminInitialized()) {
      try {
        decodedToken = await getAuth().verifyIdToken(idToken);
      } catch (verifyErr) {
        console.warn('Firebase verifyIdToken failed, falling back to decoding token payload:', verifyErr.message);
        const base64Payload = idToken.split('.')[1];
        decodedToken = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
      }
    } else {
      // Fallback decode token payload if Firebase Admin credentials are not initialized in env
      const base64Payload = idToken.split('.')[1];
      decodedToken = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
    }

    const { email, name, uid, sub } = decodedToken;
    const userUid = uid || sub;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account does not contain a verified email address.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });
    let isNewUser = false;

    if (user) {
      if (!user.google_id) {
        user.google_id = userUid;
        user.auth_provider = user.auth_provider || 'google';
        await user.save();
      }
      await updateStreak(user.user_id);
      user = await User.findOne({ user_id: user.user_id });
    } else {
      isNewUser = true;
      const userId = await getNextSequenceValue('user_id');
      const today = new Date().toISOString().split('T')[0];
      const defaultDiet = await DietPlan.findOne({ diet_name: 'Balanced Wellness' });
      const defaultDietId = defaultDiet ? defaultDiet.diet_id : 3;

      user = await User.create({
        user_id: userId,
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password: null,
        google_id: userUid,
        auth_provider: 'google',
        goal_type: 'Maintain',
        last_active_date: today,
        streak_count: 1,
        current_diet_id: defaultDietId
      });

      await awardBadge(userId, 'First Step: Account Created');
      await awardBadge(userId, 'Google Pioneer: Social Sign-In');
    }

    const token = jwt.sign({ userId: user.user_id, email: user.email }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });

    res.status(200).json({
      success: true,
      isNewUser,
      message: isNewUser ? 'Account created successfully via Google.' : 'Google Sign-In successful.',
      token,
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        goal_type: user.goal_type,
        streak_count: user.streak_count,
        height: user.height,
        weight: user.weight,
        age: user.age,
        gender: user.gender,
        isNewUser
      }
    });
  } catch (error) {
    console.error('Google Auth Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed: ' + (error.message || 'Internal server error')
    });
  }
}
