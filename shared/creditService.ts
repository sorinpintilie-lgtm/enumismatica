import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import type { User as AuthUser } from 'firebase/auth';
import { db } from './firebaseConfig';

// Simple credit & referral support shared between web and mobile.
const INVITER_BONUS = 10;
const NEW_USER_BONUS = 5;
const BOOST_COST = 5;
const BOOST_DURATION_DAYS = 7;

/**
 * Ensure there is a Firestore user profile document after signup and
 * optionally attach referral metadata + apply bonuses.
 */
export async function createUserProfileAfterSignup(
  authUser: AuthUser,
  referralCode?: string | null,
): Promise<void> {
  if (!db || !authUser) return;

  const uid = authUser.uid;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);

  const baseDisplayName =
    authUser.displayName ||
    (authUser.email ? authUser.email.split('@')[0] : 'Utilizator');

  if (!snap.exists()) {
    const data: any = {
      email: authUser.email || '',
      displayName: baseDisplayName,
      avatar: authUser.photoURL || null,
      role: 'user',
      credits: 0,
      referralCode: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (referralCode && referralCode !== uid) {
      data.referredBy = referralCode;
      data.referralBonusApplied = false;
    }

    await setDoc(userRef, data);
  } else if (referralCode && referralCode !== uid) {
    const existing = snap.data() as any;
    if (!existing.referredBy) {
      await updateDoc(userRef, {
        referredBy: referralCode,
        updatedAt: serverTimestamp(),
      });
    }
  }

  if (referralCode && referralCode !== uid) {
    await applyReferralBonus(uid, referralCode);
  }
}

async function applyReferralBonus(newUserId: string, inviterId: string): Promise<void> {
  if (!db) return;

  const newUserRef = doc(db, 'users', newUserId);
  const inviterRef = doc(db, 'users', inviterId);

  const [newUserSnap, inviterSnap] = await Promise.all([
    getDoc(newUserRef),
    getDoc(inviterRef),
  ]);

  if (!newUserSnap.exists() || !inviterSnap.exists()) return;

  const newUserData = newUserSnap.data() as any;
  if (newUserData.referralBonusApplied) {
    return;
  }

  const newUserCredits = (newUserData.credits || 0) + NEW_USER_BONUS;
  const inviterData = inviterSnap.data() as any;
  const inviterCredits = (inviterData.credits || 0) + INVITER_BONUS;

  await Promise.all([
    updateDoc(newUserRef, {
      credits: newUserCredits,
      referralBonusApplied: true,
      updatedAt: serverTimestamp(),
    }),
    updateDoc(inviterRef, {
      credits: inviterCredits,
      updatedAt: serverTimestamp(),
    }),
    addDoc(collection(db, 'users', newUserId, 'creditTransactions'), {
      userId: newUserId,
      type: 'signup_bonus',
      amount: NEW_USER_BONUS,
      relatedUserId: inviterId,
      createdAt: serverTimestamp(),
    }),
    addDoc(collection(db, 'users', inviterId, 'creditTransactions'), {
      userId: inviterId,
      type: 'invite_bonus',
      amount: INVITER_BONUS,
      relatedUserId: newUserId,
      createdAt: serverTimestamp(),
    }),
  ]);
}

/**
 * Spend credits to boost a product's visibility for a limited time.
 */
export async function boostProductWithCredits(
  userId: string,
  productId: string,
  cost: number = BOOST_COST,
  durationDays: number = BOOST_DURATION_DAYS,
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const userRef = doc(db, 'users', userId);
  const productRef = doc(db, 'products', productId);

  const boostUntil = new Date();
  boostUntil.setDate(boostUntil.getDate() + durationDays);

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) {
      throw new Error('Profilul utilizatorului nu există');
    }
    const userData = userSnap.data() as any;
    const currentCredits = userData.credits || 0;
    if (currentCredits < cost) {
      throw new Error('Nu ai suficiente credite pentru a aplica boost-ul');
    }

    const productSnap = await tx.get(productRef);
    if (!productSnap.exists()) {
      throw new Error('Produsul nu există');
    }
    const productData = productSnap.data() as any;
    if (productData.ownerId !== userId) {
      throw new Error('Poți boosta doar produsele tale');
    }

    tx.update(userRef, {
      credits: currentCredits - cost,
      updatedAt: serverTimestamp(),
    });

    tx.update(productRef, {
      boostedAt: serverTimestamp(),
      boostExpiresAt: Timestamp.fromDate(boostUntil),
      updatedAt: serverTimestamp(),
    });
  });

  await addDoc(collection(db, 'users', userId, 'creditTransactions'), {
    userId,
    type: 'spend_boost',
    amount: -cost,
    productId,
    createdAt: serverTimestamp(),
  });
}

/**
 * Convenience helper to fetch current credit balance once.
 */
export async function getUserCredits(userId: string): Promise<number> {
  if (!db) return 0;
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return 0;
  const data = snap.data() as any;
  return data.credits || 0;
}