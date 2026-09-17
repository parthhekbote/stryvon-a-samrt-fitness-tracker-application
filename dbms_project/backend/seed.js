import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  User,
  DietPlan,
  UserBadge,
  Progress,
  MealLog,
  WaterLog,
  UserWorkout,
  Workout,
  getNextSequenceValue
} from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://1jt24ai031_db_user:FRVT6HNHKvQzCQtW@cluster0.ftw6gye.mongodb.net/fitgenius_db?retryWrites=true&w=majority';

const sampleUsers = [
  {
    name: 'Alex Smith',
    email: 'alex.smith@example.com',
    password: 'Password123!',
    age: 28,
    gender: 'Male',
    height: 178,
    weight: 78,
    goal_type: 'Muscle Gain',
    streak_count: 5,
    water_goal_ml: 2500,
    current_diet_id: 2
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    password: 'Password123!',
    age: 24,
    gender: 'Female',
    height: 165,
    weight: 62,
    goal_type: 'Weight Loss',
    streak_count: 12,
    water_goal_ml: 2200,
    current_diet_id: 1
  },
  {
    name: 'Michael Brown',
    email: 'michael.brown@example.com',
    password: 'Password123!',
    age: 32,
    gender: 'Male',
    height: 182,
    weight: 85,
    goal_type: 'Maintain',
    streak_count: 3,
    water_goal_ml: 3000,
    current_diet_id: 3
  },
  {
    name: 'Emily Davis',
    email: 'emily.davis@example.com',
    password: 'Password123!',
    age: 29,
    gender: 'Female',
    height: 168,
    weight: 58,
    goal_type: 'Endurance',
    streak_count: 8,
    water_goal_ml: 2000,
    current_diet_id: 4
  },
  {
    name: 'David Wilson',
    email: 'david.wilson@example.com',
    password: 'Password123!',
    age: 35,
    gender: 'Male',
    height: 175,
    weight: 90,
    goal_type: 'Weight Loss',
    streak_count: 14,
    water_goal_ml: 2800,
    current_diet_id: 1
  },
  {
    name: 'Jessica Taylor',
    email: 'jessica.taylor@example.com',
    password: 'Password123!',
    age: 26,
    gender: 'Female',
    height: 170,
    weight: 64,
    goal_type: 'Muscle Gain',
    streak_count: 6,
    water_goal_ml: 2400,
    current_diet_id: 2
  },
  {
    name: 'Daniel Anderson',
    email: 'daniel.anderson@example.com',
    password: 'Password123!',
    age: 30,
    gender: 'Male',
    height: 180,
    weight: 76,
    goal_type: 'Maintain',
    streak_count: 4,
    water_goal_ml: 2500,
    current_diet_id: 3
  },
  {
    name: 'Sophia Martinez',
    email: 'sophia.martinez@example.com',
    password: 'Password123!',
    age: 23,
    gender: 'Female',
    height: 162,
    weight: 55,
    goal_type: 'Endurance',
    streak_count: 9,
    water_goal_ml: 2100,
    current_diet_id: 4
  },
  {
    name: 'James Thomas',
    email: 'james.thomas@example.com',
    password: 'Password123!',
    age: 40,
    gender: 'Male',
    height: 176,
    weight: 82,
    goal_type: 'Weight Loss',
    streak_count: 2,
    water_goal_ml: 2600,
    current_diet_id: 1
  },
  {
    name: 'Olivia White',
    email: 'olivia.white@example.com',
    password: 'Password123!',
    age: 27,
    gender: 'Female',
    height: 169,
    weight: 60,
    goal_type: 'Muscle Gain',
    streak_count: 7,
    water_goal_ml: 2300,
    current_diet_id: 2
  }
];

async function runSeed() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');

    const today = new Date().toISOString().split('T')[0];
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password123!', salt);

    console.log('\nSeeding 10 Sample Users...');

    const createdUsers = [];

    for (const u of sampleUsers) {
      // Check if user already exists
      let existingUser = await User.findOne({ email: u.email });
      let userId;

      if (!existingUser) {
        userId = await getNextSequenceValue('user_id');
        existingUser = await User.create({
          user_id: userId,
          name: u.name,
          email: u.email,
          password: hashedPassword,
          age: u.age,
          gender: u.gender,
          height: u.height,
          weight: u.weight,
          goal_type: u.goal_type,
          streak_count: u.streak_count,
          last_active_date: today,
          water_goal_ml: u.water_goal_ml,
          current_diet_id: u.current_diet_id
        });
      } else {
        userId = existingUser.user_id;
      }

      createdUsers.push({
        user_id: userId,
        name: u.name,
        email: u.email,
        password: 'Password123!',
        goal: u.goal_type,
        streak: u.streak_count
      });

      // 1. Seed Badges
      const badges = ['First Step: Account Created'];
      if (u.streak_count >= 3) badges.push('3-Day Fire Streak');
      if (u.streak_count >= 7) badges.push('7-Day Streak Master');
      badges.push('First Workout Completed!');

      for (const badgeName of badges) {
        const badgeExists = await UserBadge.findOne({ user_id: userId, badge_name: badgeName });
        if (!badgeExists) {
          const badgeId = await getNextSequenceValue('user_badge_id');
          await UserBadge.create({ user_badge_id: badgeId, user_id: userId, badge_name: badgeName });
        }
      }

      // 2. Seed Progress Log
      const bmi = parseFloat((u.weight / Math.pow(u.height / 100, 2)).toFixed(2));
      const progExists = await Progress.findOne({ user_id: userId, recorded_at: today });
      if (!progExists) {
        const progressId = await getNextSequenceValue('progress_id');
        await Progress.create({
          progress_id: progressId,
          user_id: userId,
          weight: u.weight,
          bmi,
          body_fat: 18.5,
          calories_burned: 420,
          recorded_at: today
        });
      }

      // 3. Seed Meal Logs
      const mealExists = await MealLog.findOne({ user_id: userId });
      if (!mealExists) {
        const mealId1 = await getNextSequenceValue('meal_id');
        await MealLog.create({
          meal_id: mealId1,
          user_id: userId,
          meal_type: 'Breakfast',
          meal_name: 'Oatmeal with Almond Butter & Banana',
          calories: 450,
          protein: 15,
          carbs: 65,
          fats: 12,
          logged_at: new Date()
        });

        const mealId2 = await getNextSequenceValue('meal_id');
        await MealLog.create({
          meal_id: mealId2,
          user_id: userId,
          meal_type: 'Lunch',
          meal_name: 'Grilled Chicken Breast with Brown Rice & Broccoli',
          calories: 620,
          protein: 48,
          carbs: 55,
          fats: 14,
          logged_at: new Date()
        });
      }

      // 4. Seed Water Log
      const waterExists = await WaterLog.findOne({ user_id: userId });
      if (!waterExists) {
        const waterId = await getNextSequenceValue('water_id');
        await WaterLog.create({
          water_id: waterId,
          user_id: userId,
          amount_ml: 1500,
          logged_at: new Date()
        });
      }

      // 5. Seed User Workout History
      const workoutExists = await UserWorkout.findOne({ user_id: userId });
      if (!workoutExists) {
        const userWorkoutId = await getNextSequenceValue('user_workout_id');
        await UserWorkout.create({
          user_workout_id: userWorkoutId,
          user_id: userId,
          workout_id: 1, // Full Body Starter
          actual_duration: 45,
          actual_calories_burned: 320,
          logged_at: new Date()
        });
      }
    }

    console.log('\n==================================================');
    console.log('SUCCESS: 10 Sample Users seeded into MongoDB Atlas!');
    console.log('==================================================');
    console.table(createdUsers);
    console.log('Default Password for all users: Password123!');
    console.log('==================================================\n');

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runSeed();
