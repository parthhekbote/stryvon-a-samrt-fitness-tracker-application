import { Exercise, getNextSequenceValue } from '../models/index.js';

export async function getExercises(req, res) {
  const { search, muscleGroup, difficulty } = req.query;

  try {
    const queryFilter = {};

    if (search) {
      queryFilter.exercise_name = { $regex: search, $options: 'i' };
    }

    if (muscleGroup && muscleGroup !== 'All') {
      queryFilter.muscle_group = muscleGroup;
    }

    if (difficulty && difficulty !== 'All') {
      queryFilter.difficulty = difficulty;
    }

    const exercises = await Exercise.find(queryFilter).sort({ exercise_name: 1 });
    res.status(200).json({ exercises });
  } catch (error) {
    console.error('Failed to get exercises:', error);
    res.status(500).json({ message: 'Failed to retrieve exercise catalog.' });
  }
}

export async function getExerciseById(req, res) {
  const { id } = req.params;
  try {
    const exercise = await Exercise.findOne({ exercise_id: parseInt(id) });
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found.' });
    }
    res.status(200).json({ exercise });
  } catch (error) {
    console.error('Failed to get exercise:', error);
    res.status(500).json({ message: 'Failed to retrieve exercise details.' });
  }
}

export async function createExercise(req, res) {
  const { exercise_name, muscle_group, difficulty, instructions, video_url, calories_per_minute } = req.body;

  if (!exercise_name || !muscle_group || !calories_per_minute) {
    return res.status(400).json({ message: 'Exercise name, muscle group, and calories per minute are required.' });
  }

  try {
    const existing = await Exercise.findOne({ exercise_name });
    if (existing) {
      return res.status(400).json({ message: 'An exercise with this name already exists in the catalog.' });
    }

    const exerciseId = await getNextSequenceValue('exercise_id');

    await Exercise.create({
      exercise_id: exerciseId,
      exercise_name,
      muscle_group,
      difficulty: difficulty || 'Beginner',
      instructions: instructions || '',
      video_url: video_url || '',
      calories_per_minute: parseFloat(calories_per_minute)
    });

    res.status(201).json({
      message: 'Exercise added to library successfully.',
      exerciseId
    });
  } catch (error) {
    console.error('Failed to create exercise:', error);
    res.status(500).json({ message: 'Failed to add custom exercise.' });
  }
}
