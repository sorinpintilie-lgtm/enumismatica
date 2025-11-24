import { collection, addDoc, Timestamp, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { User, Product, Auction, Bid } from './types';
import { uploadLocalImage } from './storageService';

/**
 * Super Admin UID - protected from deletion
 */
const SUPER_ADMIN_UID = 'QEm0DSIzylNQIHpQAZlgtWQkYYE3';

/**
 * Enhanced sample data seeding functions for development and testing.
 */

// Expanded sample users (10 users)
const sampleUsers: Omit<User, 'id'>[] = [
  { email: 'alice.collector@example.com', displayName: 'Alice Collector', avatar: 'https://i.pravatar.cc/150?img=1', createdAt: new Date(), updatedAt: new Date() },
  { email: 'bob.numismatist@example.com', displayName: 'Bob Numismatist', avatar: 'https://i.pravatar.cc/150?img=2', createdAt: new Date(), updatedAt: new Date() },
  { email: 'charlie.dealer@example.com', displayName: 'Charlie Dealer', avatar: 'https://i.pravatar.cc/150?img=3', createdAt: new Date(), updatedAt: new Date() },
  { email: 'diana.expert@example.com', displayName: 'Diana Expert', avatar: 'https://i.pravatar.cc/150?img=4', createdAt: new Date(), updatedAt: new Date() },
  { email: 'edward.trader@example.com', displayName: 'Edward Trader', avatar: 'https://i.pravatar.cc/150?img=5', createdAt: new Date(), updatedAt: new Date() },
  { email: 'fiona.buyer@example.com', displayName: 'Fiona Buyer', avatar: 'https://i.pravatar.cc/150?img=6', createdAt: new Date(), updatedAt: new Date() },
  { email: 'george.seller@example.com', displayName: 'George Seller', avatar: 'https://i.pravatar.cc/150?img=7', createdAt: new Date(), updatedAt: new Date() },
  { email: 'hannah.investor@example.com', displayName: 'Hannah Investor', avatar: 'https://i.pravatar.cc/150?img=8', createdAt: new Date(), updatedAt: new Date() },
  { email: 'ivan.enthusiast@example.com', displayName: 'Ivan Enthusiast', avatar: 'https://i.pravatar.cc/150?img=9', createdAt: new Date(), updatedAt: new Date() },
  { email: 'julia.curator@example.com', displayName: 'Julia Curator', avatar: 'https://i.pravatar.cc/150?img=10', createdAt: new Date(), updatedAt: new Date() },
];

// Expanded sample products (25 products with mixed statuses)
const generateProducts = (): Omit<Product, 'id'>[] => {
  // Real coin images from monede folder
  const coinImages = [
    '3burY-0-small.jpg', '4mTCT-0-small.jpg', '49H3s-0-small.jpg', 'CtBLn-0-small.jpg',
    'DYTJR-0-small.jpg', 'eeoyM-0-small.jpg', 'Eyoqt-0-small.jpg', 'FCNnG-0-small.jpg',
    'FRMiG-0-small.jpg', 'g52NM-0-small.jpg', 'Hdizv-0-medium.jpg', 'HnVr4-0-small.jpg',
    'J2ZHF-0-small.jpg', 'jn9SK-0-small.jpg', 'JNJXT-0-small.jpg', 'JthsJ-0-small.jpg',
    'kiQ7E-0-small.jpg', 'MFpz2-0-small.jpg', 'oCrPZ-0-small.jpg', 'om2wt-0-small.jpg',
    'PXCh6-0-small.jpg', 'pYUs9-0-small.jpg', 'QUDtY-0-small.jpg', 'TmxTF-0-small.jpg',
    'UfTK2-0-small.jpg', 'V4ryX-0-small.jpg', 'VV8yA-0-small.jpg'
  ];

  const coinNames = [
    'Roman Denarius', 'Greek Tetradrachm', 'Byzantine Solidus', 'Persian Daric', 'Carthaginian Shekel',
    'Celtic Stater', 'Egyptian Drachma', 'Phoenician Half-Shekel', 'Lydian Electrum', 'Athenian Owl',
    'Roman Aureus', 'Macedonian Tetradrachm', 'Seleucid Tetradrachm', 'Ptolemaic Octadrachm', 'Roman Sestertius',
    'Greek Drachma', 'Roman Quinarius', 'Byzantine Follis', 'Persian Siglos', 'Punic Shekel',
    'Gallic Stater', 'Iberian Denarius', 'Thracian Tetradrachm', 'Bactrian Tetradrachm', 'Parthian Drachm'
  ];

  const descriptions = [
    'Excellent condition with clear details',
    'Well-preserved ancient coin',
    'Rare specimen from private collection',
    'Museum-quality piece',
    'Historical significance with provenance',
    'Beautiful patina and detail',
    'Certified authentic by expert',
    'From renowned collection',
    'Exceptional strike quality',
    'Investment-grade numismatic item'
  ];

  const countries = ['Roma', 'Grecia', 'Bizanț', 'Persia', 'Cartagina', 'Egipt', 'Fenicia', 'Lidia', 'Atena', 'Macedonia'];
  const metals = ['Aur', 'Argint', 'Bronz', 'Cupru', 'Electrum'];
  const rarities: ('common' | 'uncommon' | 'rare' | 'very-rare' | 'extremely-rare')[] = ['common', 'uncommon', 'rare', 'very-rare', 'extremely-rare'];
  const grades = ['G', 'VG', 'F', 'VF', 'XF', 'AU', 'MS'];
  const denominations = ['Denarius', 'Tetradrachm', 'Solidus', 'Daric', 'Shekel', 'Stater', 'Drachma', 'Aureus', 'Sestertius', 'Quinarius', 'Follis', 'Siglos'];

  // 15 approved, 7 pending, 3 rejected
  const statuses: ('approved' | 'pending' | 'rejected')[] = [
    'approved', 'approved', 'approved', 'approved', 'approved',
    'approved', 'approved', 'approved', 'approved', 'approved',
    'approved', 'approved', 'approved', 'approved', 'approved',
    'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending',
    'rejected', 'rejected', 'rejected'
  ];

  return coinNames.map((name, i) => ({
    name,
    description: descriptions[i % descriptions.length] + `. ${name} from ancient times.`,
    images: [], // Will be populated during seeding with Firebase Storage URLs
    price: Math.floor(Math.random() * 1500) + 200,
    country: countries[i % countries.length],
    year: 100 + Math.floor(Math.random() * 400), // Years between 100-500 AD
    metal: metals[i % metals.length],
    rarity: rarities[i % rarities.length],
    grade: grades[i % grades.length],
    denomination: denominations[i % denominations.length],
    weight: parseFloat((Math.random() * 10 + 2).toFixed(2)),
    diameter: parseFloat((Math.random() * 10 + 15).toFixed(1)),
    ownerId: '',
    status: statuses[i],
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  }));
};

// Expanded sample auctions (20 auctions with mixed statuses)
const generateAuctions = (): Omit<Auction, 'id'>[] => {
  // 8 active, 6 pending, 4 ended, 2 rejected
  const statuses: ('pending' | 'active' | 'ended' | 'rejected')[] = [
    'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active',
    'pending', 'pending', 'pending', 'pending', 'pending', 'pending',
    'ended', 'ended', 'ended', 'ended',
    'rejected', 'rejected'
  ];

  return Array.from({ length: 20 }, (_, i) => {
    const daysOffset = Math.floor(Math.random() * 14) + 1;
    const status = statuses[i];
    const startTime = status === 'ended' ? new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) : new Date();
    const endTime = status === 'ended' ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) : new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);
    const reservePrice = Math.floor(Math.random() * 400) + 200; // 200-600 RON for more reasonable reserve prices
    const currentBid = (status === 'active' || status === 'ended') ? reservePrice + Math.floor(Math.random() * 100) : undefined; // Current bids 200-700 RON

    return {
      productId: '',
      startTime,
      endTime,
      reservePrice,
      currentBid,
      currentBidderId: currentBid ? '' : undefined,
      status,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };
  });
};

/**
 * Seeds sample users into the 'users' collection.
 */
export async function seedUsers(): Promise<string[]> {
  const userIds: string[] = [];
  for (const userData of sampleUsers) {
    const docRef = await addDoc(collection(db, 'users'), {
      ...userData,
      createdAt: Timestamp.fromDate(userData.createdAt),
      updatedAt: Timestamp.fromDate(userData.updatedAt),
    });
    userIds.push(docRef.id);
  }
  return userIds;
}

/**
 * Seeds sample products into the 'products' collection.
 */
export async function seedProducts(userIds: string[]): Promise<string[]> {
  const products = generateProducts();
  const productIds: string[] = [];
  
  // Coin images from monede folder
  const coinImages = [
    '3burY-0-small.jpg', '4mTCT-0-small.jpg', '49H3s-0-small.jpg', 'CtBLn-0-small.jpg',
    'DYTJR-0-small.jpg', 'eeoyM-0-small.jpg', 'Eyoqt-0-small.jpg', 'FCNnG-0-small.jpg',
    'FRMiG-0-small.jpg', 'g52NM-0-small.jpg', 'Hdizv-0-medium.jpg', 'HnVr4-0-small.jpg',
    'J2ZHF-0-small.jpg', 'jn9SK-0-small.jpg', 'JNJXT-0-small.jpg', 'JthsJ-0-small.jpg',
    'kiQ7E-0-small.jpg', 'MFpz2-0-small.jpg', 'oCrPZ-0-small.jpg', 'om2wt-0-small.jpg',
    'PXCh6-0-small.jpg', 'pYUs9-0-small.jpg', 'QUDtY-0-small.jpg', 'TmxTF-0-small.jpg',
    'UfTK2-0-small.jpg', 'V4ryX-0-small.jpg', 'VV8yA-0-small.jpg'
  ];
  
  for (let i = 0; i < products.length; i++) {
    console.log(`Uploading images for product ${i + 1}/${products.length}...`);
    
    // Upload 2 images to Firebase Storage
    const imageUrls: string[] = [];
    try {
      const img1 = await uploadLocalImage(
        `/monede/${coinImages[i % coinImages.length]}`,
        `products/seed/${Date.now()}_${i}_1.jpg`
      );
      imageUrls.push(img1);
      
      const img2 = await uploadLocalImage(
        `/monede/${coinImages[(i + 1) % coinImages.length]}`,
        `products/seed/${Date.now()}_${i}_2.jpg`
      );
      imageUrls.push(img2);
    } catch (error) {
      console.error(`Failed to upload images for product ${i}:`, error);
      // Fallback to local paths if upload fails
      imageUrls.push(`/monede/${coinImages[i % coinImages.length]}`);
      imageUrls.push(`/monede/${coinImages[(i + 1) % coinImages.length]}`);
    }
    
    const productData = {
      ...products[i],
      ownerId: userIds[i % userIds.length],
      images: imageUrls
    };
    
    const docRef = await addDoc(collection(db, 'products'), {
      ...productData,
      createdAt: Timestamp.fromDate(productData.createdAt),
      updatedAt: Timestamp.fromDate(productData.updatedAt),
    });
    productIds.push(docRef.id);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return productIds;
}

/**
 * Seeds sample auctions into the 'auctions' collection.
 */
export async function seedAuctions(productIds: string[], userIds: string[]): Promise<string[]> {
  const auctions = generateAuctions();
  const auctionIds: string[] = [];
  
  for (let i = 0; i < auctions.length; i++) {
    const auction = auctions[i];
    
    // For active auctions, we'll set currentBid after creating bids
    // For now, just create the auction without currentBid
    const auctionData: any = {
      productId: productIds[i % productIds.length],
      startTime: Timestamp.fromDate(auction.startTime),
      endTime: Timestamp.fromDate(auction.endTime),
      reservePrice: auction.reservePrice,
      status: auction.status,
      createdAt: Timestamp.fromDate(auction.createdAt),
      updatedAt: Timestamp.fromDate(auction.updatedAt),
    };
    
    const docRef = await addDoc(collection(db, 'auctions'), auctionData);
    auctionIds.push(docRef.id);
  }
  return auctionIds;
}

/**
 * Seeds sample bids into auctions.
 */
export async function seedBids(auctionIds: string[], userIds: string[]): Promise<void> {
  // Create 2-5 bids per active auction (first 8 are active)
  for (const auctionId of auctionIds.slice(0, 8)) {
    const numBids = Math.floor(Math.random() * 4) + 2;
    let highestBid = 0;
    let highestBidderId = '';
    
    for (let i = 0; i < numBids; i++) {
      const amount = 250 + (i * 30) + Math.floor(Math.random() * 40); // Start bids at 250-290, increment by 30-70
      const timestamp = new Date(Date.now() - (numBids - i) * 60 * 60 * 1000);
      const bidderId = userIds[i % userIds.length];
      
      const bidData = {
        auctionId,
        userId: bidderId,
        amount,
        timestamp,
      };
      
      // Track highest bid
      if (amount > highestBid) {
        highestBid = amount;
        highestBidderId = bidderId;
      }
      
      // Add bid
      await addDoc(collection(db, 'auctions', auctionId, 'bids'), {
        ...bidData,
        timestamp: Timestamp.fromDate(bidData.timestamp),
      });
      
      // Add corresponding price history entry
      await addDoc(collection(db, 'auctions', auctionId, 'priceHistory'), {
        price: amount,
        source: 'auction_bid',
        note: `Licitare de ${bidderId.slice(-6)}`,
        timestamp: Timestamp.fromDate(timestamp),
      });
    }
    
    // Update auction with highest bid
    const auctionRef = doc(db, 'auctions', auctionId);
    await updateDoc(auctionRef, {
      currentBid: highestBid,
      currentBidderId: highestBidderId,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }
}

/**
 * Seeds price history for products and auctions
 */
async function seedPriceHistories(productIds: string[], auctionIds: string[]): Promise<void> {
  console.log('Starting price history seeding...');
  
  // Seed product price histories (5-10 entries per product)
  for (let p = 0; p < Math.min(15, productIds.length); p++) {
    const productId = productIds[p];
    const numEntries = Math.floor(Math.random() * 6) + 5; // 5-10 entries
    const basePrice = Math.floor(Math.random() * 800) + 300; // Base price between $300-$1100
    
    console.log(`Seeding ${numEntries} price entries for product ${p + 1}/${Math.min(15, productIds.length)}`);
    
    for (let i = 0; i < numEntries; i++) {
      // Create entries going back in time (most recent first in iteration)
      const daysAgo = (numEntries - i - 1) * 7; // Weekly intervals, going backwards
      const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      
      // Create realistic price variation with trend
      const trendFactor = i * 15; // Upward trend of $15 per week
      const randomVariation = (Math.random() - 0.5) * 80; // +/- $40 random variation
      const price = Math.max(Math.round(basePrice + trendFactor + randomVariation), 100);
      
      const sources: ('manual' | 'market_update')[] = ['manual', 'market_update'];
      const source = sources[Math.floor(Math.random() * sources.length)];
      
      // Create price history entry directly in Firestore
      await addDoc(collection(db, 'products', productId, 'priceHistory'), {
        price,
        source,
        note: `Price update from ${timestamp.toLocaleDateString()}`,
        timestamp: Timestamp.fromDate(timestamp),
      });
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  console.log('Product price histories seeded');
  // Note: Auction price histories are now created together with bids in seedBids()
}

/**
 * Resets the entire database by deleting all collections.
 * WARNING: This will delete ALL data except the super admin user!
 */
export async function resetDatabase(): Promise<void> {
  try {
    console.log('Resetting database...');
    
    // Delete all auctions and their subcollections
    const auctionsSnapshot = await getDocs(collection(db, 'auctions'));
    for (const auctionDoc of auctionsSnapshot.docs) {
      // Delete bids subcollection
      const bidsSnapshot = await getDocs(collection(db, 'auctions', auctionDoc.id, 'bids'));
      for (const bidDoc of bidsSnapshot.docs) {
        await deleteDoc(bidDoc.ref);
      }
      // Delete autoBids subcollection
      const autoBidsSnapshot = await getDocs(collection(db, 'auctions', auctionDoc.id, 'autoBids'));
      for (const autoBidDoc of autoBidsSnapshot.docs) {
        await deleteDoc(autoBidDoc.ref);
      }
      // Delete auction
      await deleteDoc(auctionDoc.ref);
    }
    console.log('Deleted all auctions');

    // Delete all products
    const productsSnapshot = await getDocs(collection(db, 'products'));
    for (const productDoc of productsSnapshot.docs) {
      await deleteDoc(productDoc.ref);
    }
    console.log('Deleted all products');

    // Delete all users EXCEPT super admin
    const usersSnapshot = await getDocs(collection(db, 'users'));
    let deletedCount = 0;
    for (const userDoc of usersSnapshot.docs) {
      if (userDoc.id !== SUPER_ADMIN_UID) {
        await deleteDoc(userDoc.ref);
        deletedCount++;
      }
    }
    console.log(`Deleted ${deletedCount} users (preserved super admin)`);

    console.log('Database reset completed successfully!');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}

/**
 * Seeds all sample data in the correct order.
 */
export async function seedAllData(): Promise<void> {
  try {
    console.log('Seeding users...');
    const userIds = await seedUsers();
    console.log(`Seeded ${userIds.length} users`);

    console.log('Seeding products...');
    const productIds = await seedProducts(userIds);
    console.log(`Seeded ${productIds.length} products (15 approved, 7 pending, 3 rejected)`);

    console.log('Seeding auctions...');
    const auctionIds = await seedAuctions(productIds, userIds);
    console.log(`Seeded ${auctionIds.length} auctions (8 active, 6 pending, 4 ended, 2 rejected)`);

    console.log('Seeding bids...');
    await seedBids(auctionIds, userIds);
    console.log('Seeded bids for active auctions');

    console.log('Seeding price histories...');
    await seedPriceHistories(productIds, auctionIds);
    console.log('Seeded price histories for products and auctions');

    console.log('Sample data seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
}