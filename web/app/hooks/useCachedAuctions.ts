import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, where, limit, startAfter, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Auction } from 'shared/types';

// Default fields for auction list view - optimize for performance
const DEFAULT_AUCTION_FIELDS = ['productId', 'startTime', 'endTime', 'reservePrice', 'currentBid', 'currentBidderId', 'status', 'createdAt', 'updatedAt'];

export function useCachedAuctions(status?: 'active' | 'ended' | 'cancelled', pageSize: number = 20, fields: string[] = DEFAULT_AUCTION_FIELDS) {
  return useQuery({
    queryKey: ['auctions', status, pageSize, fields],
    queryFn: async () => {
      let q = query(collection(db, 'auctions'), orderBy('createdAt', 'desc'), limit(pageSize));

      if (status) {
        q = query(q, where('status', '==', status));
      }

      const querySnapshot = await getDocs(q);
      const auctionsData: Auction[] = [];

      querySnapshot.forEach((doc) => {
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

      return auctionsData;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (auctions change more frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCachedAuction(id: string, fields: string[] = DEFAULT_AUCTION_FIELDS) {
  return useQuery({
    queryKey: ['auction', id, fields],
    queryFn: async () => {
      const docRef = doc(db, 'auctions', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const auctionData: any = { id: docSnap.id };

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

        return auctionData as Auction;
      } else {
        throw new Error('Auction not found');
      }
    },
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds (auction details change quickly)
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}
