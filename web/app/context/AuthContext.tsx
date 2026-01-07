'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange } from 'shared/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ExtendedUser extends FirebaseUser {
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  role?: 'superadmin' | 'admin' | 'user';
  displayName: string;
  idVerificationStatus?: 'not_provided' | 'pending' | 'verified' | 'rejected';
  idDocumentType?: 'ci' | 'passport';
  idDocumentNumber?: string;
  idDocumentPhotos?: string[];
  twoFactorEnabled?: boolean;
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
    let mounted = true;
    let unsubscribeUserDoc: null | (() => void) = null;

    const unsubscribeAuth = onAuthStateChange(async (firebaseUser) => {
      if (!mounted) return;

      console.log('Auth state changed:', !!firebaseUser, firebaseUser?.email);

      // Clean up previous user doc listener when switching users / logging out
      if (unsubscribeUserDoc) {
        try {
          unsubscribeUserDoc();
        } catch {
          // ignore
        }
        unsubscribeUserDoc = null;
      }

      if (firebaseUser) {
        // Subscribe to user doc changes so role/verification updates apply in realtime
        setLoading(true);
        unsubscribeUserDoc = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (userDoc) => {
           const userData = userDoc.data();
           const role = userData?.role || 'user';
           const idVerificationStatus = userData?.idVerificationStatus;
           const idDocumentType = userData?.idDocumentType;
           const idDocumentNumber = userData?.idDocumentNumber;
           const idDocumentPhotos = userData?.idDocumentPhotos;
           const twoFactorEnabled = userData?.twoFactorEnabled || false;

           if (mounted) {
             const extendedUser = {
               ...firebaseUser,
               role,
               isAdmin: role === 'admin' || role === 'superadmin',
               isSuperAdmin: role === 'superadmin',
               displayName: userData?.displayName || firebaseUser.displayName || firebaseUser.email || 'User',
               idVerificationStatus,
               idDocumentType,
               idDocumentNumber,
               idDocumentPhotos,
               twoFactorEnabled,
              } as ExtendedUser;

               setUser(extendedUser);
              setLoading(false);
            }
          },
          (error) => {
            console.error('Failed to subscribe to user profile:', error);
            if (mounted) {
              const extendedUser = {
                ...firebaseUser,
                role: 'user',
                isAdmin: false,
                displayName: firebaseUser.displayName || firebaseUser.email || 'User',
              } as ExtendedUser;

              setUser(extendedUser);
              setLoading(false);
            }
          },
        );
      } else {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      if (unsubscribeUserDoc) {
        try {
          unsubscribeUserDoc();
        } catch {
          // ignore
        }
      }
      unsubscribeAuth();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
