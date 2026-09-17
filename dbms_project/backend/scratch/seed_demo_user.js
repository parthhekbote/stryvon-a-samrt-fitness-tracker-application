import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'fitgenius_db'
};

async function seed() {
  console.log('Connecting to MySQL database...');
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 1. Get or Create user
    const email = 'demo_user@fitgenius.com';
    const [existing] = await connection.query('SELECT user_id FROM users WHERE email = ?', [email]);
    
    let userId;
    if (existing.length > 0) {
      userId = existing[0].user_id;
      console.log(`Demo user already exists with ID: ${userId}. Overwriting telemetry data for a fresh 1-week report...`);
      
      // Clear previous logs to avoid conflicts
      await connection.query('DELETE FROM progress WHERE user_id = ?', [userId]);
      await connection.query('DELETE FROM meal_logs WHERE user_id = ?', [userId]);
      await connection.query('DELETE FROM water_logs WHERE user_id = ?', [userId]);
      await connection.query('DELETE FROM user_workouts WHERE user_id = ?', [userId]);
      await connection.query('DELETE FROM ai_chat_history WHERE user_id = ?', [userId]);
      await connection.query('DELETE FROM user_badges WHERE user_id = ?', [userId]);
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      const [insertRes] = await connection.query(
        `INSERT INTO users (name, email, password, age, gender, height, weight, goal_type, streak_count, last_active_date, water_goal_ml) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)`,
        ['Alex Rivera', email, hashedPassword, 26, 'Male', 180.00, 79.50, 'Muscle Gain', 6, 2500]
      );
      userId = insertRes.insertId;
      console.log(`Created new demo user with ID: ${userId}`);
    }

    // 2. Fetch or create the "Clean Lean Bulk" diet plan
    const [diets] = await connection.query('SELECT diet_id FROM diet_plans WHERE diet_name = ?', ['Clean Lean Bulk']);
    let dietId;
    if (diets.length > 0) {
      dietId = diets[0].diet_id;
    } else {
      const [dietInsert] = await connection.query(
        `INSERT INTO diet_plans (diet_name, calories, protein, carbs, fats, user_id) 
         VALUES (?, ?, ?, ?, ?, NULL)`,
        ['Clean Lean Bulk', 2800, 180, 320, 80]
      );
      dietId = dietInsert.insertId;
    }
    
    // Assign diet to user
    await connection.query('UPDATE users SET current_diet_id = ? WHERE user_id = ?', [dietId, userId]);
    console.log(`Linked user ${userId} to diet plan ${dietId} (Clean Lean Bulk)`);

    // 3. Generate 7 Days of Telemetry Data (from 6 days ago up to today)
    const today = new Date();
    
    // Setup workout logs metadata
    // Presets: workout_id=1 (Full Body), 2 (Upper Body), 3 (Leg Day), 4 (HIIT)
    const workoutsConfig = [
      { dayOffset: 6, workoutId: 1, duration: 45, name: 'Full Body Starter', calories: 300, exercises: [6, 1, 8, 9] }, // Squat, Bench, Shoulder Press, Curl
      { dayOffset: 4, workoutId: 2, duration: 60, name: 'Upper Body Power', calories: 420, exercises: [1, 3, 8, 4, 10] }, // Bench, PullUp, Shoulder Press, LatPull, Tricep
      { dayOffset: 3, workoutId: 4, duration: 30, name: 'HIIT Cardio & Abs', calories: 350, exercises: [13, 12, 11] }, // JumpRope, Running, HangingLeg
      { dayOffset: 2, workoutId: 3, duration: 50, name: 'Leg Day Hypertrophy', calories: 450, exercises: [5, 6, 7] }, // Deadlift, Squat, LegPress
      { dayOffset: 0, workoutId: 2, duration: 60, name: 'Upper Body Power', calories: 425, exercises: [1, 3, 8, 4, 10] }
    ];

    // Setup meal templates
    const mealTemplates = [
      { name: 'Oatmeal with Whey Protein & Berries', type: 'Breakfast', calories: 550, protein: 42, carbs: 65, fats: 12 },
      { name: 'Grilled Salmon with Avocado Salad & Quinoa', type: 'Lunch', calories: 750, protein: 48, carbs: 60, fats: 32 },
      { name: 'Greek Yogurt with Granola & Honey', type: 'Snack', calories: 350, protein: 22, carbs: 45, fats: 8 },
      { name: 'Sirloin Steak with Sweet Potatoes & Asparagus', type: 'Dinner', calories: 850, protein: 55, carbs: 70, fats: 25 },
      
      { name: 'Scrambled Eggs (3) with Toast & Spinach', type: 'Breakfast', calories: 480, protein: 30, carbs: 35, fats: 24 },
      { name: 'Chicken Breast with Brown Rice & Broccoli', type: 'Lunch', calories: 680, protein: 52, carbs: 85, fats: 10 },
      { name: 'Whey Protein Shake & Banana', type: 'Snack', calories: 320, protein: 30, carbs: 42, fats: 4 },
      { name: 'Baked Salmon with Quinoa & Zucchini', type: 'Dinner', calories: 780, protein: 45, carbs: 65, fats: 28 }
    ];

    console.log('Generating 7 days of logs...');

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const dateStr = targetDate.toISOString().split('T')[0];
      const timestampStr = targetDate.toISOString().slice(0, 19).replace('T', ' ');

      // A. Seed weight progress (gradual increase from 78.4 to 79.5 kg)
      const weight = (78.4 + (6 - i) * 0.18 + Math.sin(i) * 0.1).toFixed(2);
      const heightM = 1.80; // 180cm
      const bmi = (weight / (heightM * heightM)).toFixed(2);
      const bodyFat = (14.5 - (6 - i) * 0.05).toFixed(2);

      // Check if a workout is scheduled for this day
      const workoutForDay = workoutsConfig.find(w => w.dayOffset === i);
      const dailyCaloriesBurned = workoutForDay ? workoutForDay.calories : 0;

      await connection.query(
        `INSERT INTO progress (user_id, weight, bmi, body_fat, calories_burned, recorded_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, weight, bmi, bodyFat, dailyCaloriesBurned, dateStr]
      );

      // B. Seed 4 meals per day
      // Alternate meal templates
      const templateOffset = (i % 2 === 0) ? 0 : 4;
      for (let m = 0; m < 4; m++) {
        const meal = mealTemplates[templateOffset + m];
        // Distribute meal timestamps during the day
        const mealTime = new Date(targetDate);
        mealTime.setHours(8 + m * 4, 0, 0, 0);
        const mealTimestamp = mealTime.toISOString().slice(0, 19).replace('T', ' ');

        await connection.query(
          `INSERT INTO meal_logs (user_id, meal_type, meal_name, calories, protein, carbs, fats, logged_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, meal.type, meal.name, meal.calories, meal.protein, meal.carbs, meal.fats, mealTimestamp]
        );
      }

      // C. Seed water intake logs (3-4 logs per day)
      const waterAmounts = [500, 500, 500, 250, 500, 250];
      // Pick 4 logs randomly
      const numLogs = 4 + (i % 2);
      for (let w = 0; w < numLogs; w++) {
        const waterTime = new Date(targetDate);
        waterTime.setHours(9 + w * 3, 30, 0, 0);
        const waterTimestamp = waterTime.toISOString().slice(0, 19).replace('T', ' ');
        const amount = waterAmounts[w % waterAmounts.length];
        
        await connection.query(
          `INSERT INTO water_logs (user_id, amount_ml, logged_at) 
           VALUES (?, ?, ?)`,
          [userId, amount, waterTimestamp]
        );
      }

      // D. Seed Workouts & Sets
      if (workoutForDay) {
        const [workLog] = await connection.query(
          `INSERT INTO user_workouts (user_id, workout_id, logged_at, actual_duration, actual_calories_burned) 
           VALUES (?, ?, ?, ?, ?)`,
          [userId, workoutForDay.workoutId, timestampStr, workoutForDay.duration, workoutForDay.calories]
        );
        const userWorkoutId = workLog.insertId;

        // Add 3 sets for each exercise in the workout
        for (const exerciseId of workoutForDay.exercises) {
          // Check standard reps and weights
          let reps = 10;
          let weightKg = 20;

          if (exerciseId === 1) { // Bench Press
            weightKg = 70; reps = 8;
          } else if (exerciseId === 6) { // Squat
            weightKg = 90; reps = 10;
          } else if (exerciseId === 5) { // Deadlift
            weightKg = 110; reps = 5;
          } else if (exerciseId === 3) { // Pullups
            weightKg = 0; reps = 8;
          } else if (exerciseId === 8) { // Shoulder Press
            weightKg = 24; reps = 10;
          } else if (exerciseId === 9) { // Bicep Curl
            weightKg = 14; reps = 12;
          } else if (exerciseId === 10) { // Tricep Pushdown
            weightKg = 25; reps = 12;
          } else if (exerciseId === 4) { // Lat Pulldown
            weightKg = 55; reps = 10;
          } else if (exerciseId === 7) { // Leg Press
            weightKg = 160; reps = 12;
          } else {
            reps = 12; weightKg = 0;
          }

          for (let setNum = 1; setNum <= 3; setNum++) {
            await connection.query(
              `INSERT INTO workout_sets (user_workout_id, exercise_id, set_number, reps, weight) 
               VALUES (?, ?, ?, ?, ?)`,
              [userWorkoutId, exerciseId, setNum, reps, weightKg]
            );
          }
        }
      }
    }

    // 4. Seed AI Chat History
    const chatLogs = [
      {
        prompt: 'How much protein should I eat daily for lean bulk?',
        response: 'For a lean bulk at 80kg, aiming for 1.8 to 2.2 grams of protein per kg of bodyweight is optimal. This translates to roughly 144g - 176g of protein daily. Since your diet target is set to 180g, you are in the perfect range! Focus on lean poultry, beef, fish, eggs, and whey isolate. Make sure to distribute your intake in 30-40g meals.'
      },
      {
        prompt: 'Can you recommend a progression for my bench press?',
        response: 'To push past plateaus on Barbell Bench Press: 1. Keep a 3-minute rest between sets. 2. Implement progressive overload by adding 2.5kg once you hit 3 sets of 8 reps cleanly. 3. Target accessory exercises like Dumbbell Incline Press and Tricep Rope Pushdowns to build supporting strength. Today you logged 70kg for 8 reps, which is a great baseline!'
      },
      {
        prompt: 'I feel bloated after my meals. Should I reduce carbs?',
        response: 'Bloating during a clean bulk is common due to higher food volume. Instead of slashing carbs immediately (which you need for fuel!), try: 1. Switching to lower-fodmap or easily digestible carbs like white rice or cream of rice instead of whole wheat. 2. Spacing water intake 30 minutes before/after meals rather than drinking during. 3. Incorporating digestive enzymes.'
      }
    ];

    for (let c = 0; c < chatLogs.length; c++) {
      const chatTime = new Date(today);
      chatTime.setHours(today.getHours() - (3 - c) * 2);
      const chatTimestamp = chatTime.toISOString().slice(0, 19).replace('T', ' ');

      await connection.query(
        `INSERT INTO ai_chat_history (user_id, prompt, ai_response, timestamp) 
         VALUES (?, ?, ?, ?)`,
        [userId, chatLogs[c].prompt, chatLogs[c].response, chatTimestamp]
      );
    }

    // 5. Seed Badges
    const badges = [
      'First Step: Account Created',
      'First Workout Completed!',
      '3-Day Fire Streak',
      'Fitness Novice (5 Workouts)'
    ];

    for (const badge of badges) {
      await connection.query(
        'INSERT IGNORE INTO user_badges (user_id, badge_name) VALUES (?, ?)',
        [userId, badge]
      );
    }

    console.log('----------------------------------------------------');
    console.log('DEMO DATA SEEDED SUCCESSFULLY FOR A 1-WEEK REPORT!');
    console.log(`Email: ${email}`);
    console.log('Password: password123');
    console.log('Use this account to log in and export the progress PDF/reports.');
    console.log('----------------------------------------------------');

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await connection.end();
  }
}

seed();
