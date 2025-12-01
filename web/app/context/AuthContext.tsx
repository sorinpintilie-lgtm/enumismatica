'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange } from 'shared/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ExtendedUser extends FirebaseUser {
  isAdmin?: boolean;
  role?: 'admin' | 'user';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.data();
          const role = userData?.role || 'user';
          
          setUser({
            ...firebaseUser,
            role,
            isAdmin: role === 'admin',
            displayName: firebaseUser.displayName || firebaseUser.email || 'User',
          } as ExtendedUser);
        } catch (error) {
          console.error('Failed to fetch user role:', error);
          setUser({
            ...firebaseUser,
            role: 'user',
            isAdmin: false,
            displayName: firebaseUser.displayName || firebaseUser.email || 'User',
          } as ExtendedUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
