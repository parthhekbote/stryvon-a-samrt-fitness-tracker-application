import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if custom DNS fails
}
import {
  Exercise,
  Workout,
  WorkoutExercise,
  DietPlan,
  Program,
  WorkoutDay,
  Counter
} from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://1jt24ai031_db_user:FRVT6HNHKvQzCQtW@ac-w9per58-shard-00-00.ftw6gye.mongodb.net:27017,ac-w9per58-shard-00-01.ftw6gye.mongodb.net:27017,ac-w9per58-shard-00-02.ftw6gye.mongodb.net:27017/fitgenius_db?replicaSet=atlas-127g4d-shard-0&ssl=true&authSource=admin';

// Mongoose configuration

// Connection event listeners for diagnostic logs
mongoose.connection.on('connected', () => {
  console.log('🟢 MongoDB connection established successfully.');
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 MongoDB connection error:', err.message);
});

mongoose.set('bufferCommands', false);

export async function initDatabase(retries = 3) {
  const uri = process.env.MONGODB_URI || 'mongodb://1jt24ai031_db_user:FRVT6HNHKvQzCQtW@ac-w9per58-shard-00-00.ftw6gye.mongodb.net:27017,ac-w9per58-shard-00-01.ftw6gye.mongodb.net:27017,ac-w9per58-shard-00-02.ftw6gye.mongodb.net:27017/fitgenius_db?replicaSet=atlas-127g4d-shard-0&ssl=true&authSource=admin';
  console.log('Connecting to MongoDB (bufferCommands: false)...');
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 20000,
        tlsAllowInvalidCertificates: true
      });
      console.log('✅ MongoDB connected successfully');
      await seedInitialData();
      return; // Success — exit the retry loop
    } catch (error) {
      console.error(`🔴 MONGODB CONNECTION ATTEMPT ${attempt}/${retries} FAILED:`, error.message);
      if (attempt < retries) {
        const delay = attempt * 3000;
        console.log(`⏳ Retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.warn('⚠️ All connection attempts failed. Mongoose will attempt to reconnect in the background.');
      }
    }
  }
}

async function seedInitialData() {
  try {
    const exerciseCount = await Exercise.countDocuments();
    if (exerciseCount === 0) {
      console.log('Seeding MongoDB preset exercise, workout, and diet catalog...');

      const exercises = [
        { exercise_id: 1, exercise_name: 'Barbell Bench Press', muscle_group: 'Chest', difficulty: 'Intermediate', instructions: 'Lie on a flat bench. Grip the barbell with hands slightly wider than shoulder-width. Lower the bar slowly to your chest, then push it back up explosively.', video_url: 'https://www.youtube.com/watch?v=gRVjAtPip0Y', calories_per_minute: 7.5 },
        { exercise_id: 2, exercise_name: 'Incline Dumbbell Fly', muscle_group: 'Chest', difficulty: 'Beginner', instructions: 'Lie on an incline bench with a dumbbell in each hand. Keep a slight bend in your elbows and lower your arms out to the sides in a wide arc until you feel a stretch in your chest, then bring them back together.', video_url: 'https://www.youtube.com/watch?v=dbId0G0aVjc', calories_per_minute: 5.0 },
        { exercise_id: 3, exercise_name: 'Pull-Ups', muscle_group: 'Back', difficulty: 'Advanced', instructions: 'Grasp the pull-up bar with hands wider than shoulder-width, palms facing away. Pull your body up until your chin clears the bar, then slowly lower yourself back down.', video_url: 'https://www.youtube.com/watch?v=eGo4IYlbE5g', calories_per_minute: 8.0 },
        { exercise_id: 4, exercise_name: 'Lat Pulldown', muscle_group: 'Back', difficulty: 'Beginner', instructions: 'Sit at a lat pulldown station. Grab the bar with a wide grip, lean back slightly, and pull the bar down toward your collarbone. Squeeze your shoulder blades, then release slowly.', video_url: 'https://www.youtube.com/watch?v=CAwf7n6Luuc', calories_per_minute: 5.5 },
        { exercise_id: 5, exercise_name: 'Barbell Deadlift', muscle_group: 'Legs', difficulty: 'Advanced', instructions: 'Stand with feet hip-width apart under a loaded barbell. Bend at your hips and knees, grab the bar, and pull it upward by straightening your legs and hips, keeping your spine flat.', video_url: 'https://www.youtube.com/watch?v=op9kVnSso6Q', calories_per_minute: 9.5 },
        { exercise_id: 6, exercise_name: 'Barbell Back Squat', muscle_group: 'Legs', difficulty: 'Intermediate', instructions: 'Place the barbell on your upper back. Stand with feet shoulder-width apart. Squat down by pushing your hips back and bending your knees until thighs are parallel to the floor, then push back up.', video_url: 'https://www.youtube.com/watch?v=1oed-UmAxFs', calories_per_minute: 8.5 },
        { exercise_id: 7, exercise_name: 'Leg Press', muscle_group: 'Legs', difficulty: 'Beginner', instructions: 'Sit in the leg press machine. Place your feet on the sled platform. Lower the platform slowly by bending your knees to 90 degrees, then push the weight away using your heels.', video_url: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ', calories_per_minute: 6.0 },
        { exercise_id: 8, exercise_name: 'Dumbbell Shoulder Press', muscle_group: 'Shoulders', difficulty: 'Beginner', instructions: 'Sit or stand with a dumbbell in each hand at shoulder height. Press the weights straight overhead until your arms are fully extended, then lower them back to shoulder height.', video_url: 'https://www.youtube.com/watch?v=qEwKCR5JCog', calories_per_minute: 6.0 },
        { exercise_id: 9, exercise_name: 'Dumbbell Bicep Curl', muscle_group: 'Biceps', difficulty: 'Beginner', instructions: 'Stand tall with dumbbells at your sides, palms facing forward. Curl the weights up to your shoulders by bending your elbows, keeping upper arms stationary.', video_url: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo', calories_per_minute: 4.5 },
        { exercise_id: 10, exercise_name: 'Tricep Rope Pushdown', muscle_group: 'Triceps', difficulty: 'Beginner', instructions: 'Attach a rope to a high cable pulley. Keep your elbows tucked in at your sides. Push the rope down toward the floor, spreading the rope ends at the bottom.', video_url: 'https://www.youtube.com/watch?v=2-LAMcpzODU', calories_per_minute: 4.0 },
        { exercise_id: 11, exercise_name: 'Hanging Leg Raise', muscle_group: 'Abs', difficulty: 'Intermediate', instructions: 'Hang from a pull-up bar with straight arms. Raise your legs up in front of you until they are parallel to the floor, keeping them straight, then lower slowly.', video_url: 'https://www.youtube.com/watch?v=hdmyj7YZOyU', calories_per_minute: 5.0 },
        { exercise_id: 12, exercise_name: 'Running (Treadmill)', muscle_group: 'Cardio', difficulty: 'Beginner', instructions: 'Run at a steady, moderate pace on a treadmill or outdoor track to build cardiovascular endurance and burn fat.', video_url: 'https://www.youtube.com/watch?v=5km3Eydr3gU', calories_per_minute: 11.0 },
        { exercise_id: 13, exercise_name: 'Jump Rope', muscle_group: 'Cardio', difficulty: 'Intermediate', instructions: 'Jump continuously over a rope revolving under your feet and over your head, staying light on the balls of your feet.', video_url: 'https://www.youtube.com/watch?v=u3zgHI8OdNQ', calories_per_minute: 12.0 }
      ];
      await Exercise.insertMany(exercises);

      const workouts = [
        { workout_id: 1, workout_name: 'Full Body Starter', duration: 45, calories_burned: 300, difficulty: 'Beginner', equipment_needed: 'Dumbbells', user_id: null },
        { workout_id: 2, workout_name: 'Upper Body Power', duration: 60, calories_burned: 420, difficulty: 'Intermediate', equipment_needed: 'Barbell, Dumbbells, Cables', user_id: null },
        { workout_id: 3, workout_name: 'Leg Day Hypertrophy', duration: 50, calories_burned: 450, difficulty: 'Intermediate', equipment_needed: 'Barbell, Leg Press Machine', user_id: null },
        { workout_id: 4, workout_name: 'HIIT Cardio & Abs', duration: 30, calories_burned: 350, difficulty: 'Intermediate', equipment_needed: 'Jump Rope, Pull-up Bar', user_id: null }
      ];
      await Workout.insertMany(workouts);

      const workoutExercises = [
        { workout_id: 1, exercise_id: 6, sequence_order: 1, default_sets: 3, default_reps: 10 },
        { workout_id: 1, exercise_id: 1, sequence_order: 2, default_sets: 3, default_reps: 10 },
        { workout_id: 1, exercise_id: 8, sequence_order: 3, default_sets: 3, default_reps: 10 },
        { workout_id: 1, exercise_id: 9, sequence_order: 4, default_sets: 3, default_reps: 12 },
        { workout_id: 2, exercise_id: 1, sequence_order: 1, default_sets: 4, default_reps: 8 },
        { workout_id: 2, exercise_id: 3, sequence_order: 2, default_sets: 4, default_reps: 6 },
        { workout_id: 2, exercise_id: 8, sequence_order: 3, default_sets: 3, default_reps: 8 },
        { workout_id: 2, exercise_id: 4, sequence_order: 4, default_sets: 3, default_reps: 10 },
        { workout_id: 2, exercise_id: 10, sequence_order: 5, default_sets: 3, default_reps: 12 },
        { workout_id: 3, exercise_id: 5, sequence_order: 1, default_sets: 4, default_reps: 5 },
        { workout_id: 3, exercise_id: 6, sequence_order: 2, default_sets: 4, default_reps: 8 },
        { workout_id: 3, exercise_id: 7, sequence_order: 3, default_sets: 3, default_reps: 12 },
        { workout_id: 4, exercise_id: 13, sequence_order: 1, default_sets: 3, default_reps: 50 },
        { workout_id: 4, exercise_id: 12, sequence_order: 2, default_sets: 1, default_reps: 15 },
        { workout_id: 4, exercise_id: 11, sequence_order: 3, default_sets: 3, default_reps: 12 }
      ];
      await WorkoutExercise.insertMany(workoutExercises);

      const dietPlans = [
        { diet_id: 1, diet_name: 'Fat Loss Catalyst', calories: 1700, protein: 140, carbs: 140, fats: 60, user_id: null },
        { diet_id: 2, diet_name: 'Clean Lean Bulk', calories: 2800, protein: 180, carbs: 320, fats: 80, user_id: null },
        { diet_id: 3, diet_name: 'Balanced Wellness', calories: 2000, protein: 120, carbs: 230, fats: 65, user_id: null },
        { diet_id: 4, diet_name: 'High-Protein Shred', calories: 1800, protein: 160, carbs: 120, fats: 75, user_id: null }
      ];
      await DietPlan.insertMany(dietPlans);

      // Set counter initial values
      await Counter.findByIdAndUpdate('exercise_id', { sequence_value: 13 }, { upsert: true });
      await Counter.findByIdAndUpdate('workout_id', { sequence_value: 4 }, { upsert: true });
      await Counter.findByIdAndUpdate('diet_id', { sequence_value: 4 }, { upsert: true });

      console.log('MongoDB Seed complete!');
    }

    // Seed default program if no program exists in DB
    const programCount = await Program.countDocuments();
    if (programCount === 0) {
      console.log('Seeding default 3-Day Push/Pull/Legs workout routine...');
      await Program.create({
        program_id: 1,
        user_id: null,
        program_name: 'Classic 3-Day Push / Pull / Legs Split',
        schedule_mode: 'rotating',
        is_active: true
      });

      await WorkoutDay.insertMany([
        {
          workout_day_id: 1,
          program_id: 1,
          workout_id: 2,
          name: 'Push Day (Chest, Shoulders & Triceps)',
          muscle_groups: ['chest', 'shoulders', 'triceps'],
          fixed_weekday: 'Monday',
          order_index: 1
        },
        {
          workout_day_id: 2,
          program_id: 1,
          workout_id: 1,
          name: 'Pull Day (Back & Biceps)',
          muscle_groups: ['back', 'biceps'],
          fixed_weekday: 'Wednesday',
          order_index: 2
        },
        {
          workout_day_id: 3,
          program_id: 1,
          workout_id: 3,
          name: 'Leg & Core Day (Quads, Glutes & Abs)',
          muscle_groups: ['legs', 'quads', 'glutes', 'abs'],
          fixed_weekday: 'Friday',
          order_index: 3
        }
      ]);

      await Counter.findByIdAndUpdate('program_id', { sequence_value: 1 }, { upsert: true });
      await Counter.findByIdAndUpdate('workout_day_id', { sequence_value: 3 }, { upsert: true });
      console.log('Default workout routine seeded successfully!');
    }
  } catch (err) {
    console.error('Error seeding MongoDB initial data:', err.message);
  }
}
