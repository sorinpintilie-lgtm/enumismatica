import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../../../shared/firebaseConfig';
import { Bid } from '../../../shared/types';

export function useBids(auctionId: string, pageSize: number = 50) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!auctionId || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    const bidsRef = collection(db, 'auctions', auctionId, 'bids');
    const q = query(bidsRef, orderBy('timestamp', 'desc'), limit(pageSize));

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

        setBids(bidsData);
        setHasMore(bidsData.length === pageSize);
        if (bidsData.length > 0) {
          setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Firestore error in useBids:', err);
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
  }, [auctionId, pageSize]);

  const loadMore = useCallback(() => {
    if (!hasMore || !lastVisible || loading || !auctionId || !db) return;

    setLoading(true);
    
    const bidsRef = collection(db, 'auctions', auctionId, 'bids');
    const q = query(
      bidsRef,
      orderBy('timestamp', 'desc'),
      limit(pageSize),
      startAfter(lastVisible)
    );

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

        setBids(prev => [...prev, ...bidsData]);
        setHasMore(bidsData.length === pageSize);
        if (bidsData.length > 0) {
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
  }, [hasMore, lastVisible, loading, auctionId, pageSize]);

  return { bids, loading, error, hasMore, loadMore };
}