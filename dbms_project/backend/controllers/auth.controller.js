import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, DietPlan, UserBadge, Progress, getNextSequenceValue } from '../models/index.js';
import { initFirebaseAdmin, isFirebaseAdminInitialized, getAuth } from '../config/firebase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey12345!';

// Helper to calculate BMI
function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return parseFloat((weightKg / (heightM * heightM)).toFixed(2));
}

// Helper to update active streak
export async function updateStreak(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const user = await User.findOne({ user_id: userId });
    
    if (!user) return;

    let newStreak = user.streak_count || 0;
    const lastActive = user.last_active_date;

    if (!lastActive) {
      newStreak = 1;
    } else {
      const lastActiveDateStr = typeof lastActive === 'string' ? lastActive.split('T')[0] : new Date(lastActive).toISOString().split('T')[0];
      if (lastActiveDateStr === today) {
        // Already active today, streak stays the same
        return;
      }

      const lastDate = new Date(lastActiveDateStr);
      const currentDate = new Date(today);
      const diffTime = Math.abs(currentDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    user.streak_count = newStreak;
    user.last_active_date = today;
    await user.save();

    // Gamification check: Award badges for streak milestones
    if (newStreak >= 7) {
      await awardBadge(userId, '7-Day Streak Master');
    } else if (newStreak >= 3) {
      await awardBadge(userId, '3-Day Fire Streak');
    }
  } catch (error) {
    console.error('Error updating user streak:', error.message);
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

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const valAge = age ? parseInt(age) : null;
    const valGender = gender || 'Other';
    const valHeight = height ? parseFloat(height) : null;
    const valWeight = weight ? parseFloat(weight) : null;
    const valGoal = goal_type || 'Maintain';

    const userId = await getNextSequenceValue('user_id');
    const today = new Date().toISOString().split('T')[0];

    // Automatically lookup default diet plan (e.g. Balanced Wellness)
    const defaultDiet = await DietPlan.findOne({ diet_name: 'Balanced Wellness' });
    const defaultDietId = defaultDiet ? defaultDiet.diet_id : 3;

    // Create User
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

    // Award welcome badge
    await awardBadge(userId, 'First Step: Account Created');

    // Log progress on creation
    if (valWeight && valHeight) {
      const bmi = calculateBMI(valWeight, valHeight);
      const progressId = await getNextSequenceValue('progress_id');
      await Progress.findOneAndUpdate(
        { user_id: userId, recorded_at: today },
        { progress_id: progressId, weight: valWeight, bmi, body_fat: 0.0 },
        { upsert: true, new: true }
      );
    }

    // Generate JWT
    const token = jwt.sign({ userId, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

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

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await User.findOne({ email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    // Update login streak
    await updateStreak(user.user_id);

    // Fetch updated user details
    const updatedUser = await User.findOne({ user_id: user.user_id });

    const token = jwt.sign({ userId: updatedUser.user_id, email: updatedUser.email }, JWT_SECRET, { expiresIn: '7d' });

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
        streak_count: user.streak_count,
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
    const valName = name || 'User';
    const valAge = age ? parseInt(age) : null;
    const valGender = gender || 'Other';
    const valHeight = height ? parseFloat(height) : null;
    const valWeight = weight ? parseFloat(weight) : null;
    const valGoal = goal_type || 'Maintain';
    const valWater = water_goal_ml ? parseInt(water_goal_ml) : 2000;
    const valDietId = current_diet_id ? parseInt(current_diet_id) : null;

    await User.findOneAndUpdate(
      { user_id: userId },
      {
        name: valName,
        age: valAge,
        gender: valGender,
        height: valHeight,
        weight: valWeight,
        goal_type: valGoal,
        water_goal_ml: valWater,
        current_diet_id: valDietId
      }
    );

    // Recalculate BMI and update/insert progress log
    if (valWeight && valHeight) {
      const bmi = calculateBMI(valWeight, valHeight);
      const today = new Date().toISOString().split('T')[0];
      const progressId = await getNextSequenceValue('progress_id');

      await Progress.findOneAndUpdate(
        { user_id: userId, recorded_at: today },
        { progress_id: progressId, weight: valWeight, bmi },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({ message: 'Profile updated successfully.' });
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

  // Ensure Mongoose connection is ready before executing database queries
  if (mongoose.connection.readyState !== 1) {
    console.warn('⚠️ Database connection state is not ready:', mongoose.connection.readyState);
    return res.status(503).json({
      success: false,
      message: 'Database connection is initializing or currently unavailable. Please try again in a moment.'
    });
  }

  try {
    initFirebaseAdmin();
    let decodedToken;

    if (isFirebaseAdminInitialized()) {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } else {
      // Decode JWT payload if Firebase Admin credentials are not yet configured in env
      const base64Payload = idToken.split('.')[1];
      decodedToken = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
    }

    const { email, name, picture, uid, sub } = decodedToken;
    const userUid = uid || sub;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account does not contain a verified email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    console.log(`🔍 [GOOGLE AUTH] Extracted Email from Google Token: "${email}" (Normalized: "${normalizedEmail}")`);
    console.log(`🔍 [GOOGLE AUTH] Querying MongoDB User collection for email "${normalizedEmail}"...`);

    let user = await User.findOne({ email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } });
    let isNewUser = false;

    if (user) {
      console.log(`✅ [GOOGLE AUTH] Existing user matched in DB: user_id=${user.user_id}, name="${user.name}", email="${user.email}"`);
      // Update existing user with Google metadata if missing
      if (!user.google_id) {
        user.google_id = userUid;
        user.auth_provider = user.auth_provider || 'google';
        await user.save();
      }
      await updateStreak(user.user_id);
      user = await User.findOne({ user_id: user.user_id });
    } else {
      isNewUser = true;
      console.log(`✨ [GOOGLE AUTH] No matching user found. Creating BRAND NEW User document for "${normalizedEmail}"...`);
      const userId = await getNextSequenceValue('user_id');
      const today = new Date().toISOString().split('T')[0];
      const defaultDiet = await DietPlan.findOne({ diet_name: 'Balanced Wellness' });
      const defaultDietId = defaultDiet ? defaultDiet.diet_id : 3;

      user = await User.create({
        user_id: userId,
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password: null, // Password is null for Google-only accounts
        google_id: userUid,
        auth_provider: 'google',
        goal_type: 'Maintain',
        last_active_date: today,
        streak_count: 1,
        current_diet_id: defaultDietId
      });

      console.log(`🎉 [GOOGLE AUTH] NEW User document created successfully: _id=${user._id}, user_id=${user.user_id}, name="${user.name}", email="${user.email}", weight=${user.weight || 'null'}, height=${user.height || 'null'}`);

      await awardBadge(userId, 'First Step: Account Created');
      await awardBadge(userId, 'Google Pioneer: Social Sign-In');
    }

    // Issue app's standard JWT session token
    const token = jwt.sign({ userId: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

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

