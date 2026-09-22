// Firebase Configuration
// ──────────────────────────────────────────────────────────────
// INSTRUCTIONS: Replace the placeholder values below with your
// actual Firebase project config from the Firebase Console:
//   1. Go to https://console.firebase.google.com
//   2. Create a new project (or select existing)
//   3. Add a Web App (</> icon)
//   4. Copy the firebaseConfig object and paste below
// ──────────────────────────────────────────────────────────────

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

// Check if Firebase config has been set up
export const isFirebaseConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';

// Initialize Firebase only if configured (prevents crashes with placeholder config)
let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured && getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

export { app, db, auth };

