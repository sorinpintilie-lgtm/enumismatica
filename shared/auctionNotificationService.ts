import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { AuctionNotification } from './types';

/**
 * Creates an auction notification for a user
 */
export async function createAuctionNotification(
  userId: string,
  type: 'outbid' | 'auction_won' | 'auction_ended_no_win',
  auctionId: string,
  message: string,
  auctionTitle?: string,
  bidAmount?: number
): Promise<void> {
  const notificationsRef = collection(db, 'users', userId, 'auctionNotifications');

  const notificationData = {
    userId,
    type,
    auctionId,
    auctionTitle,
    bidAmount,
    message,
    read: false,
    pushed: false,
    createdAt: Timestamp.fromDate(new Date()),
  };

  await addDoc(notificationsRef, notificationData);
}

/**
 * Marks an auction notification as read
 */
export async function markAuctionNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  const notificationRef = doc(db, 'users', userId, 'auctionNotifications', notificationId);
  await updateDoc(notificationRef, {
    read: true,
    updatedAt: Timestamp.fromDate(new Date()),
  });
}

/**
 * Marks all auction notifications as read for a user
 */
export async function markAllAuctionNotificationsAsRead(userId: string): Promise<void> {
  const notificationsRef = collection(db, 'users', userId, 'auctionNotifications');
  const q = query(notificationsRef, where('read', '==', false));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      read: true,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  });

  await batch.commit();
}

/**
 * Subscribes to auction notifications for a user
 */
export function subscribeToAuctionNotifications(
  userId: string,
  callback: (notifications: AuctionNotification[], unreadCount: number) => void
): () => void {
  const notificationsRef = collection(db, 'users', userId, 'auctionNotifications');
  const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifications: AuctionNotification[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as AuctionNotification[];

    const unreadCount = notifications.filter(n => !n.read).length;
    callback(notifications, unreadCount);
  });

  return unsubscribe;
}

/**
 * Gets unread auction notifications count for a user
 */
export async function getUnreadAuctionNotificationsCount(userId: string): Promise<number> {
  const notificationsRef = collection(db, 'users', userId, 'auctionNotifications');
  const q = query(notificationsRef, where('read', '==', false));
  const snapshot = await getDocs(q);
  return snapshot.size;
}