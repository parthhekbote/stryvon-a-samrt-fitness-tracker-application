import mongoose from 'mongoose';

// 1. Counter Schema for Auto-Increment IDs
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 0 }
});
export const Counter = mongoose.model('Counter', counterSchema);

export async function getNextSequenceValue(sequenceName) {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.sequence_value;
}

// 2. User Schema
const userSchema = new mongoose.Schema({
  user_id: { type: Number, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, default: null }, // Optional for Google Sign-In users
  google_id: { type: String, default: null, index: true },
  auth_provider: { type: String, default: 'local' }, // 'local' or 'google'
  age: { type: Number, default: null },
  gender: { type: String, default: 'Other' },
  height: { type: Number, default: null },
  weight: { type: Number, default: null },
  goal_type: { type: String, default: 'Maintain' },
  streak_count: { type: Number, default: 0 },
  current_streak: { type: Number, default: 0 },
  longest_streak: { type: Number, default: 0 },
  last_workout_date: { type: String, default: null },
  streak_milestones: { type: [Number], default: [] },
  last_active_date: { type: String, default: null },
  active_program_id: { type: Number, default: null },
  current_split_cursor: { type: Number, default: 1 },
  streak_warning_enabled: { type: Boolean, default: true },
  water_goal_ml: { type: Number, default: 2000 },
  notification_permission: { type: String, default: 'unset' }, // 'unset' | 'granted' | 'denied'
  created_at: { type: Date, default: Date.now }
});
export const User = mongoose.model('User', userSchema);

// 3. DietPlan Schema
const dietPlanSchema = new mongoose.Schema({
  diet_id: { type: Number, unique: true, index: true },
  diet_name: { type: String, required: true },
  calories: { type: Number, default: 2000 },
  protein: { type: Number, default: 150 },
  carbs: { type: Number, default: 200 },
  fats: { type: Number, default: 70 },
  user_id: { type: Number, default: null, index: true },
  created_at: { type: Date, default: Date.now }
});
export const DietPlan = mongoose.model('DietPlan', dietPlanSchema);

// 4. Exercise Schema
const exerciseSchema = new mongoose.Schema({
  exercise_id: { type: Number, unique: true, index: true },
  exercise_name: { type: String, required: true, unique: true },
  muscle_group: { type: String, required: true, index: true },
  muscle_groups: { type: [String], default: [] },
  difficulty: { type: String, default: 'Beginner' },
  instructions: { type: String, default: '' },
  video_url: { type: String, default: '' },
  calories_per_minute: { type: Number, default: 5.0 }
});
export const Exercise = mongoose.model('Exercise', exerciseSchema);

// 5. Workout Schema
const workoutSchema = new mongoose.Schema({
  workout_id: { type: Number, unique: true, index: true },
  workout_name: { type: String, required: true },
  duration: { type: Number, required: true },
  calories_burned: { type: Number, required: true },
  difficulty: { type: String, default: 'Beginner' },
  equipment_needed: { type: String, default: 'None' },
  user_id: { type: Number, default: null, index: true },
  created_at: { type: Date, default: Date.now }
});
export const Workout = mongoose.model('Workout', workoutSchema);

// 6. WorkoutExercise Schema
const workoutExerciseSchema = new mongoose.Schema({
  workout_id: { type: Number, required: true, index: true },
  exercise_id: { type: Number, required: true, index: true },
  sequence_order: { type: Number, default: 1 },
  default_sets: { type: Number, default: 3 },
  default_reps: { type: Number, default: 10 }
});
export const WorkoutExercise = mongoose.model('WorkoutExercise', workoutExerciseSchema);

// 7. UserWorkout Schema
const userWorkoutSchema = new mongoose.Schema({
  user_workout_id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  workout_id: { type: Number, default: null, index: true },
  workout_day_id: { type: Number, default: null, index: true },
  custom_name: { type: String, default: null },
  is_custom: { type: Boolean, default: false },
  muscle_groups: { type: [String], default: [] },
  completed_exercises: { type: [String], default: [] },
  logged_at: { type: Date, default: Date.now },
  actual_duration: { type: Number, required: true },
  actual_calories_burned: { type: Number, required: true }
});
export const UserWorkout = mongoose.model('UserWorkout', userWorkoutSchema);

// 7b. Program Schema
const programSchema = new mongoose.Schema({
  program_id: { type: Number, unique: true, index: true },
  user_id: { type: Number, default: null, index: true },
  program_name: { type: String, required: true },
  schedule_mode: { type: String, enum: ['fixed', 'rotating'], default: 'rotating' },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});
export const Program = mongoose.model('Program', programSchema);

// 7c. WorkoutDay Schema
const workoutDaySchema = new mongoose.Schema({
  workout_day_id: { type: Number, unique: true, index: true },
  program_id: { type: Number, required: true, index: true },
  workout_id: { type: Number, default: null, index: true },
  name: { type: String, required: true },
  muscle_groups: { type: [String], default: [] },
  fixed_weekday: { type: String, default: null }, // e.g. "Monday", "Tuesday"
  order_index: { type: Number, default: 1 },
  created_at: { type: Date, default: Date.now }
});
export const WorkoutDay = mongoose.model('WorkoutDay', workoutDaySchema);

// 8. WorkoutSet Schema
const workoutSetSchema = new mongoose.Schema({
  set_id: { type: Number, unique: true, index: true },
  user_workout_id: { type: Number, required: true, index: true },
  exercise_id: { type: Number, required: true },
  set_number: { type: Number, required: true },
  reps: { type: Number, required: true },
  weight: { type: Number, required: true }
});
export const WorkoutSet = mongoose.model('WorkoutSet', workoutSetSchema);

// 9. MealLog Schema
const mealLogSchema = new mongoose.Schema({
  meal_id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  meal_type: { type: String, required: true },
  meal_name: { type: String, required: true },
  calories: { type: Number, required: true },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fats: { type: Number, default: 0 },
  logged_at: { type: Date, default: Date.now }
});
export const MealLog = mongoose.model('MealLog', mealLogSchema);

// 10. WaterLog Schema
const waterLogSchema = new mongoose.Schema({
  water_id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  amount_ml: { type: Number, required: true },
  logged_at: { type: Date, default: Date.now }
});
export const WaterLog = mongoose.model('WaterLog', waterLogSchema);

// 11. Progress Schema
const progressSchema = new mongoose.Schema({
  progress_id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  weight: { type: Number, required: true },
  bmi: { type: Number, required: true },
  body_fat: { type: Number, default: 0.0 },
  calories_burned: { type: Number, default: 0 },
  recorded_at: { type: String, required: true }, // YYYY-MM-DD
  source: {
    type: String,
    enum: ['manual', 'workout', 'profile', 'register'],
    default: 'manual'
  }
});
progressSchema.index({ user_id: 1, recorded_at: 1, source: 1 });
export const Progress = mongoose.model('Progress', progressSchema);

// 12. AIChatHistory Schema
const aiChatHistorySchema = new mongoose.Schema({
  chat_id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  prompt: { type: String, required: true },
  ai_response: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
export const AIChatHistory = mongoose.model('AIChatHistory', aiChatHistorySchema);

// 13. UserBadge Schema
const userBadgeSchema = new mongoose.Schema({
  user_badge_id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  badge_name: { type: String, required: true },
  earned_at: { type: Date, default: Date.now }
});
userBadgeSchema.index({ user_id: 1, badge_name: 1 }, { unique: true });
export const UserBadge = mongoose.model('UserBadge', userBadgeSchema);
