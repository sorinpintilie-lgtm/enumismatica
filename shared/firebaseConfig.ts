import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBbIZjstBI9an8Qnff6MEdraZErMzVjw1M",
  authDomain: "e-numismatica-ro.firebaseapp.com",
  projectId: "e-numismatica-ro",
  storageBucket: "e-numismatica-ro.firebasestorage.app",
  messagingSenderId: "686515512350",
  appId: "1:686515512350:web:c281556b58e08bcb167a0f",
  measurementId: "G-4BBCPEDX0G"
};

// Initialize Firebase only in browser environment
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let analytics: Analytics | null = null;

if (typeof window !== 'undefined') {
  // Initialize Firebase only if it hasn't been initialized yet
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  analytics = getAnalytics(app);

  // Debug logging
  console.log('Firebase initialized:', {
    app: !!app,
    auth: !!auth,
    db: !!db,
    storage: !!storage,
    analytics: !!analytics,
    dbType: typeof db,
    dbConstructor: db?.constructor?.name,
  });
}

// Export with non-null assertions for client-side usage
// Components using these should check if they're defined or use 'use client' directive
export { app, auth, db, storage, analytics };