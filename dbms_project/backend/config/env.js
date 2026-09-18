import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey12345!';
export const PORT = process.env.PORT || 5001;
export const TRUST_PROXY = process.env.TRUST_PROXY || '1';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'supersecretjwtkey12345!')) {
  console.warn('⚠️ WARNING: Using fallback or default JWT_SECRET in production mode.');
}
