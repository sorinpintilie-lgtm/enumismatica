'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { CartItem } from 'shared/types';

/**
 * Hook pentru gestionarea coșului de cumpărături al utilizatorului.
 *
 * Folosește subcolecția:
 *   users/{userId}/cart/{itemId}
 *
 * Firestore rules au fost configurate pentru:
 *   - read: owner sau admin
 *   - create: owner cu câmpurile userId, productId, quantity, addedAt
 *   - update/delete: owner sau admin
 */
export function useCart(userId?: string) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  useEffect(() => {
    if (!userId || !db) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const cartRef = collection(db, 'users', userId, 'cart');
    const q = query(cartRef, orderBy('addedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: CartItem[] = [];
        snapshot.forEach((d) => {
          const raw = d.data() as any;
          data.push({
            id: d.id,
            userId: raw.userId,
            productId: raw.productId,
            quantity: typeof raw.quantity === 'number' && raw.quantity > 0 ? raw.quantity : 1,
            addedAt: raw.addedAt?.toDate ? raw.addedAt.toDate() : new Date(),
          });
        });
        setItems(data);
        if (snapshot.docs.length > 0) {
          setLastSnapshot(snapshot.docs[snapshot.docs.length - 1]);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[useCart] Firestore error:', err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  const addToCart = useCallback(
    async (productId: string, quantity: number = 1) => {
      if (!userId) {
        throw new Error('Trebuie să fii autentificat pentru a adăuga produse în coș.');
      }
      if (!db) {
        throw new Error('Baza de date nu este inițializată.');
      }
      if (!productId) {
        throw new Error('Produs invalid.');
      }
      if (!quantity || quantity <= 0) {
        quantity = 1;
      }

      const cartRef = collection(db, 'users', userId, 'cart');
      await addDoc(cartRef, {
        userId,
        productId,
        quantity,
        addedAt: serverTimestamp(),
      });
    },
    [userId],
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (!userId) {
        throw new Error('Trebuie să fii autentificat pentru a modifica coșul.');
      }
      if (!db) {
        throw new Error('Baza de date nu este inițializată.');
      }
      if (!itemId) return;
      if (!quantity || quantity <= 0) {
        // 0 sau <0 = ștergere
        const itemRef = doc(db, 'users', userId, 'cart', itemId);
        await deleteDoc(itemRef);
        return;
      }

      const itemRef = doc(db, 'users', userId, 'cart', itemId);
      await updateDoc(itemRef, {
        quantity,
      });
    },
    [userId],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!userId) {
        throw new Error('Trebuie să fii autentificat pentru a modifica coșul.');
      }
      if (!db) {
        throw new Error('Baza de date nu este inițializată.');
      }
      if (!itemId) return;

      const itemRef = doc(db, 'users', userId, 'cart', itemId);
      await deleteDoc(itemRef);
    },
    [userId],
  );

  const clearCart = useCallback(async () => {
    if (!userId) {
      throw new Error('Trebuie să fii autentificat pentru a modifica coșul.');
    }
    if (!db) {
      throw new Error('Baza de date nu este inițializată.');
    }

    const cartRef = collection(db, 'users', userId, 'cart');
    const q = query(cartRef);
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const batchDeletes = snapshot.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(batchDeletes);
    });

    // Ne dezabonăm imediat după prima execuție
    unsubscribe();
  }, [userId]);

  return {
    items,
    loading,
    error,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    lastSnapshot,
  };
}