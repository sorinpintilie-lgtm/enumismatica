import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from '@shared/firebaseConfig';
import { db } from '@shared/firebaseConfig';
import { Bid } from '@shared/types';

export function useBids(auctionId: string, pageSize: number = 50) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const currentUnsubscribeRef = useRef<(() => void) | null>(null);

  const loadBids = useCallback((startAfterDoc?: QueryDocumentSnapshot<DocumentData>) => {
    if (!auctionId) return () => {};

    // Skip Firebase calls if db is not available
    if (!db) {
      setBids([]);
      setLoading(false);
      setHasMore(false);
      return () => {};
    }

    // Clean up previous listener without triggering re-renders
    if (currentUnsubscribeRef.current) {
      currentUnsubscribeRef.current();
    }

    setLoading(true);
    const bidsRef = collection(db, 'auctions', auctionId, 'bids');
    let q = query(bidsRef, orderBy('timestamp', 'desc'), limit(pageSize));

    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const bidsData: Bid[] = [];
        querySnapshot.forEach((doc) => {
          bidsData.push({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(),
          } as Bid);
        });

        if (startAfterDoc) {
          // Append to existing bids for pagination
          setBids(prev => [...prev, ...bidsData]);
        } else {
          // Replace bids for initial load
          setBids(bidsData);
        }

        setHasMore(bidsData.length === pageSize);
        if (bidsData.length > 0) {
          setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    currentUnsubscribeRef.current = unsubscribe;
    return unsubscribe;
  }, [auctionId, pageSize]);

  useEffect(() => {
    const unsubscribe = loadBids();
    return () => {
      unsubscribe();
      currentUnsubscribeRef.current = null;
    };
  }, [loadBids]);

  const loadMore = useCallback(() => {
    if (hasMore && lastVisible && !loading) {
      loadBids(lastVisible);
    }
  }, [hasMore, lastVisible, loading, loadBids]);

  return { bids, loading, error, hasMore, loadMore };
}
