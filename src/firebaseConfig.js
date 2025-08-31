// Centralized Firebase initialization (uses environment variables, avoids committing secrets)
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// messaging optional; wrap later

// Helper to read required env variable
function req(name) {
  let v = process.env[name];
  if (!v) {
    console.warn(`[Firebase] Env var ${name} is missing. Set it in .env`);
    return '';
  }
  // Strip wrapping quotes if user copied with quotes
  v = v.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1,-1);
  }
  return v;
}

const firebaseConfig = {
  apiKey: req('REACT_APP_FIREBASE_API_KEY'),
  authDomain: req('REACT_APP_FIREBASE_AUTH_DOMAIN'),
  projectId: req('REACT_APP_FIREBASE_PROJECT_ID'),
  storageBucket: req('REACT_APP_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: req('REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
  appId: req('REACT_APP_FIREBASE_APP_ID'),
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || undefined,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || undefined
};

const required = ['apiKey','authDomain','projectId','appId'];
const missingRequired = required.filter(k => !firebaseConfig[k]);
let appInstance;
if (missingRequired.length) {
  console.error('[Firebase] Missing required config values:', missingRequired.join(', '));
  console.error('[Firebase] Frontend will defer Firebase-dependent features until config is fixed.');
} else {
  try {
    appInstance = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  } catch (e) {
    console.error('[Firebase] initializeApp failed:', e);
  }
}

export const app = appInstance;
export const auth = appInstance ? getAuth(appInstance) : undefined;
export const db = appInstance ? getFirestore(appInstance) : undefined;
export const storage = appInstance ? getStorage(appInstance) : undefined;
export const getMessagingSafe = () => {
  if (!appInstance) return undefined;
  try {
    const { getMessaging } = require('firebase/messaging');
    return getMessaging(appInstance);
  } catch {
    return undefined;
  }
};
