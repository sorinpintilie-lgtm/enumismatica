import { auth } from './firebaseConfig';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { createUserProfileAfterSignup } from './creditService';
import { logActivity } from './activityLogService';

const googleProvider = new GoogleAuthProvider();

// Set auth persistence to LOCAL for better mobile support
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(console.error);
}

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

    // Log the login
    await logActivity(
      userCredential.user.uid,
      'user_login',
      { method: 'email' },
      userCredential.user.email || undefined,
      userCredential.user.displayName || undefined
    );

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

    // Log the registration
    await logActivity(
      userCredential.user.uid,
      'user_register',
      { method: 'email', referralCode: referralCode || undefined },
      userCredential.user.email || undefined,
      userCredential.user.displayName || undefined
    );

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

    // Log the login/register
    await logActivity(
      result.user.uid,
      'user_login',
      { method: 'google', referralCode: referralCode || undefined },
      result.user.email || undefined,
      result.user.displayName || undefined
    );

    return { user: result.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

export const logout = async () => {
  const user = auth.currentUser;

  // Never block sign-out on logging errors
  if (user) {
    try {
      await logActivity(
        user.uid,
        'user_logout',
        {},
        user.email || undefined,
        user.displayName || undefined
      );
    } catch (error) {
      console.error('Failed to log logout activity:', error);
    }
  }

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