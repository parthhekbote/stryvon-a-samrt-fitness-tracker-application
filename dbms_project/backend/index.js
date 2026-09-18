import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';

// Configurations & DB
import { initDatabase } from './config/db.js';

// Middlewares
import { authMiddleware } from './middleware/auth.js';

// Controllers
import { register, login, googleLogin, getProfile, updateProfile } from './controllers/auth.controller.js';
import { getExercises, getExerciseById, createExercise } from './controllers/exercise.controller.js';
import { 
  getWorkouts, 
  createWorkout, 
  getWorkoutExercises, 
  logWorkoutCompletion, 
  getWorkoutHistory,
  getPrograms,
  createProgram,
  activateProgram,
  getTodaySuggestedWorkout,
  getMuscleGroupStatus,
  backfillExerciseMuscleGroups
} from './controllers/workout.controller.js';
import { getDietPlans, createDietPlan, logMeal, logMealImage, getTodaysMeals, deleteMealLog, logWater, getTodaysWater } from './controllers/diet.controller.js';
import { chatWithCoach, getWeeklySummary, getChatHistory } from './controllers/ai.controller.js';
import { logProgress, getAnalytics, getPdfReportData } from './controllers/progress.controller.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Multer upload setup for Vision calorie tracking
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// ---------------------- PUBLIC ROUTES ----------------------
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/google', googleLogin);

// ---------------------- PROTECTED ROUTES ----------------------
// Auth & Profile
app.get('/api/auth/profile', authMiddleware, getProfile);
app.put('/api/auth/profile', authMiddleware, updateProfile);

// Exercises Catalog
app.get('/api/exercises', authMiddleware, getExercises);
app.get('/api/exercises/:id', authMiddleware, getExerciseById);
app.post('/api/exercises', authMiddleware, createExercise);

// Workouts Routine templates & Completion
app.get('/api/workouts', authMiddleware, getWorkouts);
app.post('/api/workouts', authMiddleware, createWorkout);
app.get('/api/workouts/:id/exercises', authMiddleware, getWorkoutExercises);
app.post('/api/workouts/log', authMiddleware, logWorkoutCompletion);
app.get('/api/workouts/history', authMiddleware, getWorkoutHistory);

// Day-Based & Muscle-Group Programs & Scheduling
app.get('/api/workouts/programs', authMiddleware, getPrograms);
app.post('/api/workouts/programs', authMiddleware, createProgram);
app.put('/api/workouts/programs/:id/activate', authMiddleware, activateProgram);
app.get('/api/workouts/suggested', authMiddleware, getTodaySuggestedWorkout);
app.get('/api/workouts/muscle-status', authMiddleware, getMuscleGroupStatus);

// Diets, Meals, & Water
app.get('/api/diet/plans', authMiddleware, getDietPlans);
app.post('/api/diet/plans', authMiddleware, createDietPlan);
app.post('/api/diet/log-meal', authMiddleware, logMeal);
app.post('/api/diet/log-meal-image', authMiddleware, upload.single('image'), logMealImage);
app.get('/api/diet/meals', authMiddleware, getTodaysMeals);
app.delete('/api/diet/meals/:id', authMiddleware, deleteMealLog);
app.post('/api/diet/water', authMiddleware, logWater);
app.get('/api/diet/water', authMiddleware, getTodaysWater);

// AI Fitness Coach Chat & Synthesis
app.post('/api/ai/chat', authMiddleware, chatWithCoach);
app.get('/api/ai/history', authMiddleware, getChatHistory);
app.get('/api/ai/weekly-summary', authMiddleware, getWeeklySummary);
app.get('/api/ai/insights', authMiddleware, getWeeklySummary);

// Progress, Analytics, & Report
app.post('/api/progress', authMiddleware, logProgress);
app.get('/api/progress/analytics', authMiddleware, getAnalytics);
app.get('/api/analytics/overview', authMiddleware, getAnalytics);
app.get('/api/progress/pdf-export', authMiddleware, getPdfReportData);

// Basic health check routes for Render hosting
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'STRYVON AI Backend API', timestamp: new Date() });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Global error handlers to prevent process crash on unhandled async rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err?.message || err);
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'Image payload size is too large. Maximum allowed size is 50MB.' });
  }
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Start Server with auto-retry on EADDRINUSE
function startServer() {
  const server = app.listen(PORT, async () => {
    console.log(`==================================================`);
    console.log(`FITGENIUS AI server is running on port ${PORT}`);
    console.log(`Health endpoint: http://localhost:${PORT}/health`);
    console.log(`==================================================`);

    try {
      await initDatabase();
      await backfillExerciseMuscleGroups();
    } catch (err) {
      console.error('Error during initial DB setup:', err.message);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${PORT} is busy, retrying in 1.5s...`);
      setTimeout(() => {
        try { server.close(); } catch (e) {}
        startServer();
      }, 1500);
    } else {
      console.error('Server error:', err);
    }
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
