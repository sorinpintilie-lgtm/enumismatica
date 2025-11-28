import { auth } from './firebaseConfig';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import { createUserProfileAfterSignup } from './creditService';

const googleProvider = new GoogleAuthProvider();

export const signInWithEmail = async (email: string, password: string) => {
  try {
    // Sanitize inputs
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = password.trim();

    // Basic validation
    if (!sanitizedEmail || !sanitizedPassword) {
      return { user: null, error: 'Email and password are required' };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      return { user: null, error: 'Invalid email format' };
    }

    const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword);

    // Ensure Firestore user profile exists (idempotent, no referral on login)
    await createUserProfileAfterSignup(userCredential.user, null);

    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

export const signUpWithEmail = async (email: string, password: string, referralCode?: string) => {
  try {
    // Sanitize inputs
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = password.trim();

    // Basic validation
    if (!sanitizedEmail || !sanitizedPassword) {
      return { user: null, error: 'Email and password are required' };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      return { user: null, error: 'Invalid email format' };
    }

    if (sanitizedPassword.length < 6) {
      return { user: null, error: 'Password must be at least 6 characters' };
    }

    const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword);

    // Create Firestore profile and apply referral bonuses (if any)
    await createUserProfileAfterSignup(userCredential.user, referralCode || null);

    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

export const signInWithGoogle = async (referralCode?: string) => {
  try {
    const result = await signInWithPopup(auth, googleProvider);

    // Ensure profile exists and apply referral only on first signup
    await createUserProfileAfterSignup(result.user, referralCode || null);

    return { user: result.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};