import Groq from 'groq-sdk';
import {
  DietPlan,
  MealLog,
  WaterLog,
  UserBadge,
  getNextSequenceValue
} from '../models/index.js';
import { updateStreak } from './auth.controller.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function getGroqClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key || typeof key !== 'string' || !key.trim().startsWith('gsk_')) return null;
  return new Groq({ apiKey: key.trim() });
}

export async function getDietPlans(req, res) {
  const userId = req.user.userId;

  try {
    const plans = await DietPlan.find({
      $or: [{ user_id: null }, { user_id: userId }]
    }).sort({ diet_id: 1 });

    res.status(200).json({ plans });
  } catch (error) {
    console.error('Failed to get diet plans:', error);
    res.status(500).json({ message: 'Failed to retrieve diet plans.' });
  }
}

export async function createDietPlan(req, res) {
  const userId = req.user.userId;
  const { diet_name, calories, protein, carbs, fats } = req.body;

  if (!diet_name || !calories || !protein || !carbs || !fats) {
    return res.status(400).json({ message: 'All diet plan fields (name, calories, macros) are required.' });
  }

  try {
    const dietId = await getNextSequenceValue('diet_id');

    await DietPlan.create({
      diet_id: dietId,
      diet_name,
      calories,
      protein,
      carbs,
      fats,
      user_id: userId
    });

    res.status(201).json({ message: 'Diet plan created successfully.', dietId });
  } catch (error) {
    console.error('Failed to create diet plan:', error);
    res.status(500).json({ message: 'Failed to create diet plan.' });
  }
}

// Helper to validate meal nutritional macros for mathematical sanity
export function validateMealMacros(calories, protein, carbs, fats) {
  const cal = Number(calories);
  const p = Number(protein) || 0;
  const c = Number(carbs) || 0;
  const f = Number(fats) || 0;

  // Boundary checks
  if (isNaN(cal) || cal <= 0 || cal > 5000) {
    return { valid: false, reason: `Calories (${cal}) out of realistic range (1-5000 kcal).` };
  }
  if (p < 0 || p > 300) {
    return { valid: false, reason: `Protein (${p}g) out of realistic range (0-300g).` };
  }
  if (c < 0 || c > 350) {
    return { valid: false, reason: `Carbs (${c}g) out of realistic range (0-350g).` };
  }
  if (f < 0 || f > 200) {
    return { valid: false, reason: `Fats (${f}g) out of realistic range (0-200g).` };
  }

  // Calculate expected calories from macros: (Protein*4) + (Carbs*4) + (Fats*9)
  const calculatedCal = (p * 4) + (c * 4) + (f * 9);

  // If non-zero macros are provided, check math consistency (within ±30% tolerance)
  if (calculatedCal > 0) {
    const minCal = calculatedCal * 0.7;
    const maxCal = calculatedCal * 1.3;

    if (cal < minCal || cal > maxCal) {
      return {
        valid: false,
        reason: `Stated calories (${cal} kcal) mathematically conflict with macros (${p}g P, ${c}g C, ${f}g F = ~${Math.round(calculatedCal)} kcal).`
      };
    }
  }

  return { valid: true };
}

export async function logMeal(req, res) {
  const userId = req.user.userId;
  const { meal_type, meal_name, calories, protein, carbs, fats } = req.body;

  if (!meal_type || !meal_name || calories === undefined) {
    return res.status(400).json({ message: 'Meal type, meal name, and calories are required.' });
  }

  // Sanity check validation before saving any meal to MongoDB
  const macroCheck = validateMealMacros(calories, protein, carbs, fats);
  if (!macroCheck.valid) {
    console.warn(`⚠️ [MEAL LOG REJECTED] User ${userId}: ${macroCheck.reason}`);
    return res.status(400).json({
      success: false,
      message: `Invalid nutrition values: ${macroCheck.reason}`
    });
  }

  try {
    const mealId = await getNextSequenceValue('meal_id');

    await MealLog.create({
      meal_id: mealId,
      user_id: userId,
      meal_type,
      meal_name,
      calories: Number(calories),
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fats: Number(fats) || 0,
      logged_at: new Date()
    });

    await updateStreak(userId);

    const mealLogsCount = await MealLog.countDocuments({ user_id: userId });
    if (mealLogsCount === 1) {
      await awardBadge(userId, 'First Meal Logged');
    }

    res.status(201).json({ message: 'Meal logged successfully.', mealId });
  } catch (error) {
    console.error('Failed to log meal:', error);
    res.status(500).json({ message: 'Failed to record meal.' });
  }
}

export async function logMealImage(req, res) {
  const userId = req.user.userId;
  const { meal_type, imageBase64 } = req.body;

  let base64Data = null;

  if (req.file && req.file.buffer) {
    base64Data = req.file.buffer.toString('base64');
  } else if (imageBase64) {
    base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  }

  if (!base64Data) {
    return res.status(400).json({ success: false, message: 'No food image file or base64 image data provided.' });
  }

  console.log(`📷 [AI FOOD SCANNER] User ${userId} submitted image for analysis (Base64 payload size: ${base64Data.length} chars)`);

  try {
    let mealDetails = null;
    const groq = getGroqClient();

    const systemPrompt = `You are an expert AI vision nutrition analyst.
Examine the image carefully:
1. Determine if the image clearly contains edible food, a meal, dish, or beverage.
2. If the image is NOT food (e.g. screenshot, document, text, person, animal, vehicle, room, non-edible object):
   Respond with JSON:
   {
     "is_food": false,
     "meal_name": "NOT_FOOD",
     "error": "No food item detected in the photo."
   }

3. If the image IS edible food or beverage:
   Estimate portion size and macros accurately.
   IMPORTANT: Total calories must be mathematically realistic for the macros:
   Calories ≈ (protein_g * 4) + (carbs_g * 4) + (fats_g * 9) within ±20%.

   Respond ONLY with valid JSON:
   {
     "is_food": true,
     "meal_name": "Short dish name (e.g. Grilled Chicken Salad)",
     "calories": 450,
     "protein": 35,
     "carbs": 40,
     "fats": 15
   }`;

    if (groq) {
      // List of candidate vision models
      const visionModels = ['llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-instruct'];

      for (const m of visionModels) {
        try {
          console.log(`Invoking Groq Vision API (${m})...`);
          const chatCompletion = await groq.chat.completions.create({
            model: m,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: systemPrompt },
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
                ]
              }
            ],
            response_format: { type: 'json_object' }
          });

          const responseText = chatCompletion.choices[0]?.message?.content;
          console.log('--------------------------------------------------');
          console.log('📷 [GROQ VISION RAW RESPONSE]:');
          console.log(responseText);
          console.log('--------------------------------------------------');

          try {
            mealDetails = JSON.parse(responseText);
            break;
          } catch (jsonErr) {
            const match = responseText?.match(/\{[\s\S]*\}/);
            if (match) {
              mealDetails = JSON.parse(match[0]);
              break;
            }
          }
        } catch (groqErr) {
          console.warn(`Groq Vision API (${m}) call note:`, groqErr.message);
        }
      }
    }

    // If AI vision API is unavailable or could not detect food in payload:
    if (!mealDetails || mealDetails.is_food === false || mealDetails.meal_name === 'NOT_FOOD') {
      console.warn('⚠️ [AI VISION REJECTED]: Photo could not be confirmed as food or vision analysis was unavailable.');
      return res.status(400).json({
        success: false,
        is_food: false,
        message: "We couldn't detect a food item in this photo. Please try again with a clear photo of your meal or enter details manually."
      });
    }

    const formattedDetails = {
      meal_name: mealDetails.meal_name || 'AI Analyzed Dish',
      calories: parseInt(mealDetails.calories) || 0,
      protein: parseInt(mealDetails.protein) || 0,
      carbs: parseInt(mealDetails.carbs) || 0,
      fats: parseInt(mealDetails.fats) || 0
    };

    // Sanity check validation of macros mathematically
    const macroCheck = validateMealMacros(
      formattedDetails.calories,
      formattedDetails.protein,
      formattedDetails.carbs,
      formattedDetails.fats
    );

    if (!macroCheck.valid) {
      console.warn('⚠️ [MACRO SANITY VALIDATION REJECTED]:', macroCheck.reason);
      return res.status(400).json({
        success: false,
        message: "Couldn't reliably analyze this meal's nutritional content due to inconsistent macro values. Please try another photo or enter details manually."
      });
    }

    res.status(200).json({
      success: true,
      message: 'Meal image analyzed successfully via AI.',
      nutritional_data: formattedDetails,
      meal: formattedDetails
    });
  } catch (error) {
    console.error('Failed to analyze meal image:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error analyzing meal image.'
    });
  }
}

export async function deleteMealLog(req, res) {
  const userId = req.user.userId;
  const mealId = parseInt(req.params.id);

  if (!mealId || isNaN(mealId)) {
    return res.status(400).json({ success: false, message: 'Valid meal ID is required.' });
  }

  try {
    const meal = await MealLog.findOne({ meal_id: mealId });
    if (!meal) {
      return res.status(404).json({ success: false, message: 'Meal log record not found.' });
    }

    // Verify user ownership
    if (meal.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You can only delete your own meal logs.' });
    }

    await MealLog.deleteOne({ meal_id: mealId, user_id: userId });
    console.log(`🗑️ [MEAL DELETED] User ${userId} deleted meal_id ${mealId} ("${meal.meal_name}")`);

    res.status(200).json({
      success: true,
      message: 'Meal log deleted successfully.',
      meal_id: mealId
    });
  } catch (error) {
    console.error('Failed to delete meal log:', error);
    res.status(500).json({ success: false, message: 'Failed to delete meal log.' });
  }
}

export async function getTodaysMeals(req, res) {
  const userId = req.user.userId;

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const meals = await MealLog.find({
      user_id: userId,
      logged_at: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ logged_at: 1 });

    const total_calories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const total_protein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
    const total_carbs = meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
    const total_fats = meals.reduce((sum, m) => sum + (m.fats || 0), 0);

    res.status(200).json({
      meals,
      totals: {
        total_calories,
        total_protein,
        total_carbs,
        total_fats
      }
    });
  } catch (error) {
    console.error('Failed to get today meals:', error);
    res.status(500).json({ message: 'Failed to retrieve meal logs.' });
  }
}

export async function logWater(req, res) {
  const userId = req.user.userId;
  const { amount_ml } = req.body;

  if (!amount_ml) {
    return res.status(400).json({ message: 'Water amount is required.' });
  }

  try {
    const waterId = await getNextSequenceValue('water_id');

    await WaterLog.create({
      water_id: waterId,
      user_id: userId,
      amount_ml: parseInt(amount_ml),
      logged_at: new Date()
    });

    await updateStreak(userId);
    res.status(201).json({ message: 'Water logged successfully.' });
  } catch (error) {
    console.error('Failed to log water:', error);
    res.status(500).json({ message: 'Failed to log water.' });
  }
}

export async function getTodaysWater(req, res) {
  const userId = req.user.userId;

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const waterLogs = await WaterLog.find({
      user_id: userId,
      logged_at: { $gte: startOfDay, $lte: endOfDay }
    });

    const total_water_ml = waterLogs.reduce((sum, w) => sum + (w.amount_ml || 0), 0);

    res.status(200).json({
      total_water_ml
    });
  } catch (error) {
    console.error('Failed to get water logs:', error);
    res.status(500).json({ message: 'Failed to retrieve water intake.' });
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
