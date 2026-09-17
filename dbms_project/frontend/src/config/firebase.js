import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCrCTyfPrFp-_AcxyrNAcBO0bF22AxuvSo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "fitgenius-ai-b1a61.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "fitgenius-ai-b1a61",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "fitgenius-ai-b1a61.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "970812762840",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:970812762840:web:b051eb316c70ccab5bc5ad"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { signInWithPopup, signInWithRedirect, getRedirectResult };
