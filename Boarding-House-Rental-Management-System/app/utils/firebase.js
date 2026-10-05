// Firebase Configuration
// ──────────────────────────────────────────────────────────────
// INSTRUCTIONS: Replace the placeholder values below with your
// actual Firebase project config from the Firebase Console:
//   1. Go to https://console.firebase.google.com
//   2. Create a new project (or select existing)
//   3. Add a Web App (</> icon)
//   4. Copy the firebaseConfig object and paste below
// ──────────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyChaN7HCrI9jqshYyqJLWA6neWE6bRPiwE",
  authDomain: "boardinghouse-rental-mgt.firebaseapp.com",
  projectId: "boardinghouse-rental-mgt",
  storageBucket: "boardinghouse-rental-mgt.firebasestorage.app",
  messagingSenderId: "187056162619",
  appId: "1:187056162619:web:a37245ade9a828104b191e",
  measurementId: "G-LVTZ428VV6"
};

// Treat the app as configured when real project values replace the placeholders.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'YOUR_PROJECT_ID'
);

let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured) {
  // Reuse the existing app after a hot reload instead of leaving everything null
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);

  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    try {
      // Saves the login on the device so users stay signed in
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (e) {
      // Auth was already initialized (fast refresh), so reuse it
      auth = getAuth(app);
    }
  }
}

export { app, db, auth };