import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export function isFirebaseAdminInitialized() {
  return getApps().length > 0;
}

export function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return true;
  }

  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountVar) {
      let serviceAccount;
      if (typeof serviceAccountVar === 'string' && serviceAccountVar.trim().startsWith('{')) {
        serviceAccount = JSON.parse(serviceAccountVar);
      } else {
        serviceAccount = JSON.parse(Buffer.from(serviceAccountVar, 'base64').toString('utf8'));
      }

      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized successfully via FIREBASE_SERVICE_ACCOUNT.');
      return true;
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
      console.log('Firebase Admin SDK initialized via individual env vars.');
      return true;
    } else {
      console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT not found in backend/.env. Token verification will decode payload until service account JSON is added to .env.');
    }
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK:', err.message);
  }

  return getApps().length > 0;
}

export { getAuth };
