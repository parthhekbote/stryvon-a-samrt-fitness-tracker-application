import app from '../backend/index.js';
import { initDatabase } from '../backend/config/db.js';

let dbInitialized = false;

export default async function handler(req, res) {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
    } catch (err) {
      console.error('Vercel DB Init Error:', err);
    }
  }
  return app(req, res);
}
