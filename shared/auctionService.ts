import {
  doc,
  collection,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction,
  getDoc,
  Transaction,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Auction, Bid, AutoBid } from './types';
import { addAuctionPriceHistory } from './priceHistoryService';

/**
 * Validates if a bid is valid for an auction
 */
export function validateBid(auction: Auction, bidAmount: number, userId: string): { valid: boolean; error?: string } {
  if (auction.status !== 'active') {
    return { valid: false, error: 'Auction is not active' };
  }

  if (new Date() > auction.endTime) {
    return { valid: false, error: 'Auction has ended' };
  }

  if (userId === auction.currentBidderId) {
    return { valid: false, error: 'You are already the highest bidder' };
  }

  const currentBid = auction.currentBid || 0;
  // Realistic bid increment: 10 RON for bids under 1000, 50 RON for higher bids
  const bidIncrement = currentBid < 1000 ? 10 : 50;
  const minBid = Math.max(currentBid + bidIncrement, auction.reservePrice);

  if (bidAmount < minBid) {
    return { valid: false, error: `Licitația trebuie să fie cel puțin ${minBid.toFixed(2)} RON` };
  }

  return { valid: true };
}

/**
 * Places a bid on an auction and handles auto-bidding
 */
export async function placeBid(auctionId: string, bidAmount: number, userId: string): Promise<void> {
  const auctionRef = doc(db, 'auctions', auctionId);
  const bidsRef = collection(db, 'auctions', auctionId, 'bids');

  await runTransaction(db, async (transaction) => {
    const auctionDoc = await transaction.get(auctionRef);
    if (!auctionDoc.exists()) {
      throw new Error('Auction not found');
    }

    const auction = {
      id: auctionDoc.id,
      ...auctionDoc.data(),
      startTime: auctionDoc.data().startTime?.toDate() || new Date(),
      endTime: auctionDoc.data().endTime?.toDate() || new Date(),
    } as Auction;

    const validation = validateBid(auction, bidAmount, userId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Add the bid
    const bidData: Omit<Bid, 'id'> = {
      auctionId,
      userId,
      amount: bidAmount,
      timestamp: new Date(),
    };
    const newBidRef = doc(bidsRef);
    transaction.set(newBidRef, {
      ...bidData,
      timestamp: Timestamp.fromDate(bidData.timestamp),
    });

    // Update auction current bid and bidder
    transaction.update(auctionRef, {
      currentBid: bidAmount,
      currentBidderId: userId,
      updatedAt: Timestamp.fromDate(new Date()),
    });

    // Process auto-bids
    await processAutoBidsInTransaction(transaction, auctionId, bidAmount, userId);
  });

  // Track price history (outside transaction)
  try {
    await addAuctionPriceHistory(auctionId, bidAmount, 'auction_bid', `Bid by user ${userId.slice(-6)}`);
  } catch (error) {
    console.error('Failed to track price history:', error);
  }
}

/**
 * Sets up an auto-bid for a user on an auction
 */
export async function setAutoBid(auctionId: string, maxAmount: number, userId: string): Promise<void> {
  const autoBidsRef = collection(db, 'auctions', auctionId, 'autoBids');

  // Check if user already has an auto-bid
  const q = query(autoBidsRef, where('userId', '==', userId));
  const existingAutoBids = await getDocs(q);

  const autoBidData = {
    auctionId,
    userId,
    maxAmount,
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
  };

  if (!existingAutoBids.empty) {
    // Update existing
    const existingId = existingAutoBids.docs[0].id;
    await updateDoc(doc(autoBidsRef, existingId), autoBidData);
  } else {
    // Create new
    await addDoc(autoBidsRef, autoBidData);
  }
}

/**
 * Gets all auto-bids for an auction
 */
export async function getAutoBids(auctionId: string): Promise<AutoBid[]> {
  const autoBidsRef = collection(db, 'auctions', auctionId, 'autoBids');
  const q = query(autoBidsRef, orderBy('maxAmount', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as AutoBid[];
}

/**
 * Processes auto-bids when a new bid is placed
 */
async function processAutoBidsInTransaction(
  transaction: Transaction,
  auctionId: string,
  newBidAmount: number,
  bidderId: string
): Promise<void> {
  const autoBidsRef = collection(db, 'auctions', auctionId, 'autoBids');
  const auctionRef = doc(db, 'auctions', auctionId);
  const bidsRef = collection(db, 'auctions', auctionId, 'bids');

  // Get auto-bids higher than current bid
  const q = query(autoBidsRef, where('maxAmount', '>', newBidAmount), orderBy('maxAmount', 'asc'));
  const autoBidsSnapshot = await getDocs(q);

  for (const autoBidDoc of autoBidsSnapshot.docs) {
    const autoBid = {
      id: autoBidDoc.id,
      ...autoBidDoc.data(),
    } as AutoBid;

    if (autoBid.userId === bidderId) continue; // Don't auto-bid against yourself

    const increment = 0.01; // Minimum increment
    const autoBidAmount = Math.min(autoBid.maxAmount, newBidAmount + increment);

    if (autoBidAmount > newBidAmount) {
      // Place auto-bid
      const bidData: Omit<Bid, 'id'> = {
        auctionId,
        userId: autoBid.userId,
        amount: autoBidAmount,
        timestamp: new Date(),
      };
      const newBidRef = doc(bidsRef);
      transaction.set(newBidRef, {
        ...bidData,
        timestamp: Timestamp.fromDate(bidData.timestamp),
      });

      // Update auction
      transaction.update(auctionRef, {
        currentBid: autoBidAmount,
        currentBidderId: autoBid.userId,
        updatedAt: Timestamp.fromDate(new Date()),
      });

      // Recursively process next auto-bids
      await processAutoBidsInTransaction(transaction, auctionId, autoBidAmount, autoBid.userId);
      break; // Only process the highest eligible auto-bid
    }
  }
}

/**
 * Ends an auction and determines the winner
 */
export async function endAuction(auctionId: string): Promise<void> {
  const auctionRef = doc(db, 'auctions', auctionId);

  await runTransaction(db, async (transaction) => {
    const auctionDoc = await transaction.get(auctionRef);
    if (!auctionDoc.exists()) {
      throw new Error('Auction not found');
    }

    const auction = {
      id: auctionDoc.id,
      ...auctionDoc.data(),
    } as Auction;

    if (auction.status !== 'active') {
      return; // Already ended
    }

    const winnerId = (auction.currentBid || 0) >= auction.reservePrice ? auction.currentBidderId : null;

    transaction.update(auctionRef, {
      status: 'ended',
      updatedAt: Timestamp.fromDate(new Date()),
      // Could add winnerId if needed
    });
  });
}