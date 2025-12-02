import {
  doc,
  collection,
  collectionGroup,
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
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Auction, Bid, AutoBid } from './types';
import { addAuctionPriceHistory } from './priceHistoryService';
import { createAuctionNotification } from './auctionNotificationService';

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

  let previousBidderId: string | undefined;
  let auctionTitle: string | undefined;

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

    // Store previous bidder for notification
    previousBidderId = auction.currentBidderId;

    // Get auction title from product (simplified - in real app might need to fetch product)
    auctionTitle = `Auction ${auctionId}`;

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

  // Send notification to previous bidder if they were outbid
  if (previousBidderId && previousBidderId !== userId) {
    try {
      await createAuctionNotification(
        previousBidderId,
        'outbid',
        auctionId,
        `Ai fost depășit în licitația ${auctionTitle}. Oferta curentă: ${bidAmount.toFixed(2)} RON`,
        auctionTitle,
        bidAmount
      );
    } catch (error) {
      console.error('Failed to send outbid notification:', error);
    }
  }

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
 * Cancels the auto-bid for a user on a specific auction
 */
export async function cancelAutoBid(auctionId: string, userId: string): Promise<void> {
  const autoBidsRef = collection(db, 'auctions', auctionId, 'autoBids');
  const q = query(autoBidsRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return;
  }

  for (const docSnap of snapshot.docs) {
    await deleteDoc(docSnap.ref);
  }
}

/**
 * Gets the current user's auto-bid for a specific auction (if any)
 */
export async function getUserAutoBid(auctionId: string, userId: string): Promise<AutoBid | null> {
  const autoBidsRef = collection(db, 'auctions', auctionId, 'autoBids');
  const q = query(autoBidsRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const docSnap = snapshot.docs[0];
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as AutoBid;
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
 * Gets all auto-bids for a user across all auctions,
 * along with basic auction information if available.
 */
export async function getUserAutoBidsForUser(
  userId: string,
): Promise<{ autoBid: AutoBid; auction: Auction | null }[]> {
  const autoBidsRef = collectionGroup(db, 'autoBids');
  const q = query(autoBidsRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);

  const results: { autoBid: AutoBid; auction: Auction | null }[] = [];

  for (const autoBidDoc of snapshot.docs) {
    const data = autoBidDoc.data() as any;
    const auctionId: string | undefined = data.auctionId;

    const autoBid: AutoBid = {
      id: autoBidDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };

    let auction: Auction | null = null;

    if (auctionId) {
      try {
        const auctionRef = doc(db, 'auctions', auctionId);
        const auctionSnap = await getDoc(auctionRef);
        if (auctionSnap.exists()) {
          const aData = auctionSnap.data() as any;
          auction = {
            id: auctionSnap.id,
            ...aData,
            startTime: aData.startTime?.toDate() || new Date(),
            endTime: aData.endTime?.toDate() || new Date(),
            createdAt: aData.createdAt?.toDate() || new Date(),
            updatedAt: aData.updatedAt?.toDate() || new Date(),
          } as Auction;
        }
      } catch (err) {
        console.error('Failed to load auction for auto-bid', err);
      }
    }

    results.push({ autoBid, auction });
  }

  return results;
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

  let winnerId: string | null = null;
  let auctionTitle: string | undefined;

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

    winnerId = (auction.currentBid || 0) >= auction.reservePrice ? auction.currentBidderId : null;
    auctionTitle = `Auction ${auctionId}`;

    transaction.update(auctionRef, {
      status: 'ended',
      updatedAt: Timestamp.fromDate(new Date()),
      // Could add winnerId if needed
    });
  });

  // Send notification to winner or notify no winner
  if (winnerId) {
    try {
      await createAuctionNotification(
        winnerId,
        'auction_won',
        auctionId,
        `Felicitări! Ai câștigat licitația ${auctionTitle}`,
        auctionTitle
      );
    } catch (error) {
      console.error('Failed to send auction won notification:', error);
    }
  } else {
    // Notify all bidders that auction ended without winner
    try {
      // Get all bidders from the auction
      const bidsRef = collection(db, 'auctions', auctionId, 'bids');
      const bidsSnapshot = await getDocs(bidsRef);
      const bidderIds = [...new Set(bidsSnapshot.docs.map(doc => doc.data().userId))];

      for (const bidderId of bidderIds) {
        await createAuctionNotification(
          bidderId,
          'auction_ended_no_win',
          auctionId,
          `Licitația ${auctionTitle} s-a încheiat fără câștigător`,
          auctionTitle
        );
      }
    } catch (error) {
      console.error('Failed to send auction ended notifications:', error);
    }
  }
}