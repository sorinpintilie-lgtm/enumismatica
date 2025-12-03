'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange } from 'shared/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ExtendedUser extends FirebaseUser {
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  role?: 'superadmin' | 'admin' | 'user';
  displayName: string;
}

interface AuthContextType {
  user: ExtendedUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authKey, setAuthKey] = useState(0); // Force re-render key

  useEffect(() => {
    let mounted = true;
    let authResolved = false;

    // Fallback timeout to prevent infinite loading (10 seconds)
    const timeoutId = setTimeout(() => {
      if (mounted && !authResolved) {
        console.warn('Auth initialization timeout - setting loading to false');
        setLoading(false);
        authResolved = true;
      }
    }, 10000);

    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (!mounted) return;

      console.log('Auth state changed:', !!firebaseUser, firebaseUser?.email);
      authResolved = true;
      clearTimeout(timeoutId);

      if (firebaseUser) {
        // Fetch user role from Firestore with caching
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.data();
          const role = userData?.role || 'user';

          if (mounted) {
            const extendedUser = {
              ...firebaseUser,
              role,
              isAdmin: role === 'admin' || role === 'superadmin',
              isSuperAdmin: role === 'superadmin',
              displayName: firebaseUser.displayName || firebaseUser.email || 'User',
            } as ExtendedUser;

            setUser(extendedUser);
            setAuthKey(prev => prev + 1); // Force re-render
          }
        } catch (error) {
          console.error('Failed to fetch user role:', error);
          if (mounted) {
            const extendedUser = {
              ...firebaseUser,
              role: 'user',
              isAdmin: false,
              displayName: firebaseUser.displayName || firebaseUser.email || 'User',
            } as ExtendedUser;

            setUser(extendedUser);
            setAuthKey(prev => prev + 1); // Force re-render
          }
        }
      } else {
        if (mounted) {
          setUser(null);
          setAuthKey(prev => prev + 1); // Force re-render
        }
      }
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider key={authKey} value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
