import Groq from 'groq-sdk';
import {
  User,
  DietPlan,
  UserWorkout,
  Workout,
  MealLog,
  AIChatHistory,
  getNextSequenceValue
} from '../models/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function callAIModel(systemPrompt, userPrompt) {
  const groqKey = (process.env.GROQ_API_KEY || '').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();

  console.log(`\n==================================================`);
  console.log(`=== [AI COACH USER PROMPT] ===: "${userPrompt}"`);
  console.log(`==================================================\n`);

  // 1. Groq API Path (when GROQ_API_KEY starts with gsk_)
  if (groqKey.startsWith('gsk_')) {
    const groq = new Groq({ apiKey: groqKey });
    const models = [
      'groq/compound',
      'groq/compound-mini',
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ];

    for (const modelName of models) {
      try {
        console.log(`Attempting Groq completion with model: ${modelName}...`);
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model: modelName,
          temperature: 0.7,
          max_tokens: 1024
        });
        const text = completion.choices[0]?.message?.content;
        if (text) {
          console.log(`✅ [AI COACH REAL RESPONSE] Generated successfully via Groq (${modelName})`);
          return text;
        }
      } catch (err) {
        console.warn(`Groq model ${modelName} returned error:`, err.message);
      }
    }
  }

  // 2. Google Gemini REST API Path
  if (geminiKey) {
    const geminiModels = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.5-pro'];
    for (const modelName of geminiModels) {
      try {
        console.log(`Attempting Google Gemini REST API completion (${modelName})...`);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${systemPrompt}\n\nClient User Input/Question: "${userPrompt}"\n\nProvide a detailed, helpful, personalized response addressing their exact input.` }
                ]
              }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            console.log(`✅ [AI COACH REAL RESPONSE] Generated successfully via Google Gemini API (${modelName})`);
            return text;
          }
        } else {
          const errText = await response.text();
          console.warn(`Google Gemini API (${modelName}) Error:`, response.status, errText);
        }
      } catch (geminiErr) {
        console.warn(`Google Gemini REST API fetch failed (${modelName}):`, geminiErr.message);
      }
    }
  }

  console.warn('⚠️ [AI COACH FALLBACK] All API attempts failed or no keys configured. Using intelligent template fallback.');
  return null;
}

export async function chatWithCoach(req, res) {
  const userId = req.user.userId;
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: 'Chat prompt is required.' });
  }

  try {
    const user = await User.findOne({ user_id: userId });

    let diet = { calories: null, protein: null, carbs: null, fats: null };
    if (user && user.current_diet_id) {
      const dietPlan = await DietPlan.findOne({ diet_id: user.current_diet_id });
      if (dietPlan) diet = dietPlan;
    }

    const workouts = await UserWorkout.find({ user_id: userId });
    const workoutCount = workouts.length;
    const totalBurned = workouts.reduce((sum, w) => sum + (w.actual_calories_burned || 0), 0);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayMeals = await MealLog.find({
      user_id: userId,
      logged_at: { $gte: startOfDay, $lte: endOfDay }
    });

    const mealStats = {
      count: todayMeals.length,
      calories: todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0),
      protein: todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0),
      carbs: todayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0),
      fats: todayMeals.reduce((sum, m) => sum + (m.fats || 0), 0)
    };

    const proteinTarget = (diet && diet.protein && diet.protein !== 'N/A') ? `${diet.protein}g` : '150g';
    const caloriesTarget = (diet && diet.calories && diet.calories !== 'N/A') ? `${diet.calories} kcal` : '2,200 kcal';

    const systemPrompt = `You are STRYVON AI, an elite personal trainer and dietician. Your goal is to suggest customized workouts, advise on diets, analyze progress, motivate users, and give expert nutrition/recovery guidelines.
    
Here is the real-time profile of the client:
- Name: ${user ? user.name : 'Athlete'}
- Goal: ${user ? user.goal_type : 'Balanced Fitness'}
- Stats: Height: ${user?.height || 'N/A'}cm, Weight: ${user?.weight || 'N/A'}kg, Age: ${user?.age || 'N/A'}, Gender: ${user?.gender || 'N/A'}
- Active Streak: ${user ? user.streak_count : 0} days
- Daily Target: ${caloriesTarget}, Protein: ${proteinTarget}
- Today's Logged Macros: ${mealStats.calories} kcal, Protein: ${mealStats.protein}g, Carbs: ${mealStats.carbs}g, Fat: ${mealStats.fats}g
- Workouts completed: ${workoutCount} (${totalBurned} total kcal burned)

Speak directly to the user. Be concise, extremely motivating, professional, and clear. Directly answer their specific question or command. When generating markdown tables, do NOT use raw HTML <br> tags inside table cells; separate multiple exercises or items with semicolons (;) or commas for clean readability.`;

    let aiResponse = await callAIModel(systemPrompt, prompt);

    // Fallback if API keys fail or network is offline
    if (!aiResponse) {
      console.warn('⚠️ USING FALLBACK TEMPLATE - AI call failed');
      const lowerPrompt = prompt.toLowerCase();
      const isSensibleText = /^[a-zA-Z0-9\s?,.!-]{3,100}$/.test(prompt) && !/^(.)\1{4,}$/.test(prompt);

      if (lowerPrompt.includes('more workout') || lowerPrompt.includes('workout list') || lowerPrompt.includes('exercise list')) {
        aiResponse = `### Additional STRYVON Workout Options

1. **Chest & Triceps Hypertrophy**: Incline DB Press, Cable Crossover, Dips, Skullcrushers (4 sets x 10-12 reps).
2. **Back & Biceps Power**: Heavy Lat Pulldowns, Seated Cable Rows, Face Pulls, Incline Bicep Curls (4 sets x 8-10 reps).
3. **Legs & Calves Blast**: Barbell Back Squats, Romanian Deadlifts, Bulgarian Split Squats, Standing Calf Raises (4 sets x 10 reps).
4. **Shoulders & Traps Focus**: Overhead Dumbbell Press, Lateral Raises, Rear Delt Flyes, Heavy Shrugs (4 sets x 12 reps).
5. **HIIT Cardio Conditioning**: 20-minute treadmill sprint intervals (30s sprint / 30s walk).`;
      } else if (lowerPrompt.includes('chest') || lowerPrompt.includes('push')) {
        aiResponse = `### STRYVON Chest & Push Hypertrophy Routine

1. **Barbell Bench Press**: 4 sets x 8-10 reps (Heavy Compound)
2. **Incline Dumbbell Press**: 3 sets x 10-12 reps (Upper Chest Focus)
3. **Cable Chest Flyes**: 3 sets x 12-15 reps (Peak Contraction)
4. **Weighted Dips / Push-Ups**: 3 sets to Failure (Finisher)

**Coach Tip**: Focus on controlling the 3-second eccentric phase for maximum hypertrophy!`;
      } else if (lowerPrompt.includes('leg') || lowerPrompt.includes('squat')) {
        aiResponse = `### STRYVON Leg Day Routine

1. **Barbell Back Squat**: 4 sets x 8-10 reps (Quads & Glutes Focus)
2. **Romanian Deadlift**: 4 sets x 10 reps (Hamstrings & Lower Back)
3. **Leg Press Machine**: 3 sets x 12 reps (Hypertrophy Volume)
4. **Standing Calf Raises**: 4 sets x 15 reps (Calves Finisher)

**Coach Tip**: Ensure full depth on squats while keeping your spine neutral for optimal leg activation!`;
      } else if (lowerPrompt.includes('protein') || lowerPrompt.includes('nutrition') || lowerPrompt.includes('diet') || lowerPrompt.includes('calorie')) {
        aiResponse = `### STRYVON Nutrition & Macro Guidance

- **Protein Target**: Target **${proteinTarget} Protein** daily for optimal muscle recovery and tissue repair.
- **Calorie Intake**: Maintain a daily energy target of **${caloriesTarget}** based on your active goals.
- **Hydration**: Drink at least 2.5 - 3.0 Liters of water daily to support performance.

**Coach Tip**: Consume 25-35g of protein within 1 hour post-workout for maximum protein synthesis.`;
      } else if (lowerPrompt.includes('split') || lowerPrompt.includes('4 day') || lowerPrompt.includes('4-day')) {
        aiResponse = `### STRYVON 4-Day Muscle Building Split

- **Day 1: Upper Body Heavy** (Bench Press, Barbell Rows, Overhead Press)
- **Day 2: Lower Body Strength** (Squats, Romanian Deadlifts, Leg Extensions)
- **Day 3: Rest / Active Recovery & Core**
- **Day 4: Push Hypertrophy** (Incline DB Press, Lateral Raises, Tricep Dips)
- **Day 5: Pull & Arms Hypertrophy** (Lat Pulldowns, Seated Cable Rows, Bicep Curls)

**Coach Tip**: Keep rest periods to 90 seconds between compound sets to optimize muscle growth!`;
      } else {
        const promptHeader = isSensibleText ? `for "${prompt.trim()}"` : '';
        aiResponse = `> **Notice**: AI model service is currently in offline fallback mode.

### STRYVON Coach Guidance ${promptHeader}

1. **Custom Plan**: Based on your **${user?.goal_type || 'Balanced Fitness'}** goal, structure your workout with 3-4 compound movements followed by targeted isolation exercises.
2. **Nutrition Focus**: Target **${proteinTarget} Protein** daily and consume sufficient calories (${caloriesTarget}).
3. **Consistency**: Keep logging your workout sets and daily weight to get personalized AI progress metrics!`;
      }
    }

    const chatId = await getNextSequenceValue('chat_id');
    await AIChatHistory.create({
      chat_id: chatId,
      user_id: userId,
      prompt,
      ai_response: aiResponse,
      timestamp: new Date()
    });

    res.status(200).json({ response: aiResponse });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Failed to process chat response.' });
  }
}

export async function getWeeklySummary(req, res) {
  const userId = req.user.userId;

  try {
    const user = await User.findOne({ user_id: userId });
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const userWorkouts = await UserWorkout.find({
      user_id: userId,
      logged_at: { $gte: sevenDaysAgo }
    }).lean();

    const workouts = await Promise.all(
      userWorkouts.map(async (uw) => {
        const w = await Workout.findOne({ workout_id: uw.workout_id });
        return {
          workout_name: w?.workout_name || 'Workout',
          actual_duration: uw.actual_duration,
          actual_calories_burned: uw.actual_calories_burned,
          logged_at: uw.logged_at
        };
      })
    );

    const meals = await MealLog.find({
      user_id: userId,
      logged_at: { $gte: sevenDaysAgo }
    }).lean();

    const totalBurned = workouts.reduce((sum, w) => sum + (w.actual_calories_burned || 0), 0);
    const totalConsumed = meals.reduce((sum, m) => sum + (m.calories || 0), 0);

    const summaryPrompt = `Analyze this user's fitness activity over the last 7 days and compile a concise weekly summary.
    
Client details:
- Name: ${user?.name}
- Goal: ${user?.goal_type}
- Current Weight: ${user?.weight} kg
- Workouts completed: ${workouts.length}
- Total calorie burn logged: ${totalBurned} kcal
- Total meals logged: ${meals.length}
- Avg daily calorie intake: ${meals.length > 0 ? Math.round(totalConsumed / 7) : 0} kcal

CRITICAL CONSTRAINT: Your entire response MUST BE STRICTLY AT MOST 4 TO 5 LINES TOTAL (under 50 words). Do NOT create multi-section headings like "**Observations**", "**Next Steps**", or long bullet lists. Provide only a 4-line concise summary covering: Goal & Status, Workouts, Nutrition, and Coach Tip.`;

    let summaryText = await callAIModel(summaryPrompt, 'Generate weekly summary');

    if (!summaryText) {
      summaryText = `**Weekly Fitness Summary (${user?.name || 'Athlete'})**
• **Goal & Activity**: ${user?.goal_type || 'Maintain'} goal — ${workouts.length} workout(s) completed (${totalBurned} kcal burned).
• **Nutrition Tracking**: Logged ${meals.length} meal(s) averaging ${meals.length > 0 ? Math.round(totalConsumed / 7) : 0} kcal/day.
• **Coach Recommendation**: Keep logging workouts and meals daily to establish baseline trends.`;
    }

    res.status(200).json({ summary: summaryText, insight: summaryText });
  } catch (error) {
    console.error('Weekly summary failed:', error);
    res.status(500).json({ message: 'Failed to generate weekly fitness summary.' });
  }
}

export async function getChatHistory(req, res) {
  const userId = req.user.userId;
  try {
    const history = await AIChatHistory.find({ user_id: userId })
      .sort({ timestamp: 1 })
      .limit(50)
      .lean();

    res.status(200).json({ history });
  } catch (error) {
    console.error('Failed to get chat history:', error);
    res.status(500).json({ message: 'Failed to retrieve chat history.' });
  }
}
