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

// Initialize Firebase - this will work on both client and server
// The Firebase SDK handles SSR automatically
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

// Initialize Analytics (only in browser environment)
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
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

export { app, auth, db, storage, analytics };
export default { app, auth, db, storage, analytics };