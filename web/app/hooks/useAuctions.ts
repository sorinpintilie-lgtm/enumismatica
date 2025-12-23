import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, where, doc, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Auction } from 'shared/types';

// Default fields for auction list view - optimize for performance
// Include buyNow fields so list cards can show "Cumpără acum" info.
const DEFAULT_AUCTION_FIELDS = [
  'productId',
  'startTime',
  'endTime',
  'reservePrice',
  'currentBid',
  'currentBidderId',
  'status',
  'buyNowPrice',
  'buyNowUsed',
  'createdAt',
  'updatedAt',
];

/**
 * Live auctions hook used on auctions pages.
 * The `enabled` flag allows us to skip attaching Firestore listeners
 * when access is locked (e.g. user not authenticated).
 */
export function useAuctions(
  status?: 'active' | 'ended' | 'cancelled',
  pageSize: number = 20,
  fields: string[] = DEFAULT_AUCTION_FIELDS,
  enabled: boolean = true,
  ownerId?: string,
) {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // If disabled (e.g. user not authenticated), do not attach any listeners.
    if (!enabled) {
      setAuctions([]);
      setLoading(false);
      setError(null);
      setHasMore(false);
      return;
    }

    // Safety check: ensure db is initialized
    if (!db) {
      console.error('Firestore db is not initialized');
      setLoading(false);
      setError('Database not initialized');
      return;
    }

    console.log('[useAuctions] db object:', {
      db,
      type: typeof db,
      constructor: db?.constructor?.name,
      keys: Object.keys(db),
      hasType: 'type' in db,
    });

    setLoading(true);
    setError(null);
    
    try {
      console.log('[useAuctions] About to call collection() with db');

      // Build query in a predictable order (filters first), to keep index requirements consistent.
      let q = query(collection(db, 'auctions'));

      if (status) {
        q = query(q, where('status', '==', status));
      }

      if (ownerId) {
        q = query(q, where('ownerId', '==', ownerId));
      }

      q = query(q, orderBy('createdAt', 'desc'), limit(pageSize));

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          console.log('[useAuctions] Query returned', querySnapshot.size, 'auctions with status:', status);
          const auctionsData: Auction[] = [];
          querySnapshot.forEach((doc) => {
            console.log('[useAuctions] Auction:', doc.id, 'status:', doc.data().status);
            const data = doc.data();
            const auctionData: any = { id: doc.id };

            // Only include requested fields for performance
            fields.forEach(field => {
              if (data[field] !== undefined) {
                auctionData[field] = data[field];
              }
            });

            // Always include dates for proper typing
            if (fields.includes('startTime')) {
              auctionData.startTime = data.startTime?.toDate() || new Date();
            }
            if (fields.includes('endTime')) {
              auctionData.endTime = data.endTime?.toDate() || new Date();
            }
            if (fields.includes('createdAt')) {
              auctionData.createdAt = data.createdAt?.toDate() || new Date();
            }
            if (fields.includes('updatedAt')) {
              auctionData.updatedAt = data.updatedAt?.toDate() || new Date();
            }

            auctionsData.push(auctionData as Auction);
          });

          console.log('[useAuctions] Setting auctions:', auctionsData.length);
          setAuctions(auctionsData);
          setHasMore(auctionsData.length === pageSize);
          if (auctionsData.length > 0) {
            setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
          }
          setLoading(false);
        },
        (err) => {
          console.error('Firestore error in useAuctions:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      unsubscribeRef.current = unsubscribe;

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error in useAuctions:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setLoading(false);
    }
   }, [status, pageSize, JSON.stringify(fields), enabled, ownerId]);

  const loadMore = useCallback(() => {
    if (!enabled || !hasMore || !lastVisible || loading || !db) return;

    setLoading(true);
    
    try {
      let q = query(collection(db, 'auctions'));

      if (status) {
        q = query(q, where('status', '==', status));
      }

      if (ownerId) {
        q = query(q, where('ownerId', '==', ownerId));
      }

      q = query(q, orderBy('createdAt', 'desc'), limit(pageSize), startAfter(lastVisible));

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const auctionsData: Auction[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const auctionData: any = { id: doc.id };

            fields.forEach(field => {
              if (data[field] !== undefined) {
                auctionData[field] = data[field];
              }
            });

            if (fields.includes('startTime')) {
              auctionData.startTime = data.startTime?.toDate() || new Date();
            }
            if (fields.includes('endTime')) {
              auctionData.endTime = data.endTime?.toDate() || new Date();
            }
            if (fields.includes('createdAt')) {
              auctionData.createdAt = data.createdAt?.toDate() || new Date();
            }
            if (fields.includes('updatedAt')) {
              auctionData.updatedAt = data.updatedAt?.toDate() || new Date();
            }

            auctionsData.push(auctionData as Auction);
          });

          setAuctions(prev => [...prev, ...auctionsData]);
          setHasMore(auctionsData.length === pageSize);
          if (auctionsData.length > 0) {
            setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
          }
          setLoading(false);
        },
        (err) => {
          console.error('Firestore error in loadMore:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      // Clean up the pagination listener after it fires once
      return () => unsubscribe();
    } catch (error) {
      console.error('Error in loadMore:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setLoading(false);
    }
   }, [hasMore, lastVisible, loading, status, pageSize, fields, enabled, ownerId]);

  return { auctions, loading, error, hasMore, loadMore };
}

export function useAuction(id: string) {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !db) return;

    const unsubscribe = onSnapshot(
      doc(db, 'auctions', id),
      (doc) => {
        if (doc.exists()) {
          setAuction({
            id: doc.id,
            ...doc.data(),
            startTime: doc.data().startTime?.toDate() || new Date(),
            endTime: doc.data().endTime?.toDate() || new Date(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          } as Auction);
        } else {
          setAuction(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  return { auction, loading, error };
}
