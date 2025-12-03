import {
  doc,
  getDoc,
  runTransaction,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { Product, Order } from './types';
import { addCollectionItem } from './collectionService';

/**
 * Basic order / purchase helpers for direct product buys (shop).
 *
 * For now, orders are created as PAID immediately (no external payment),
 * but the structure is ready to plug in Netopia later by:
 *  - creating the order with status "pending" and paymentProvider "netopia"
 *  - redirecting to Netopia
 *  - updating the order + product from a secure callback when Netopia confirms.
 */

/**
 * Normalize a Firestore order document into the shared Order type.
 */
function mapOrderSnapshot(orderDoc: any): Order {
  const data = orderDoc.data();

  return {
    id: orderDoc.id,
    productId: data.productId,
    buyerId: data.buyerId,
    sellerId: data.sellerId,
    price: data.price,
    currency: data.currency,
    status: data.status,
    paymentProvider: data.paymentProvider,
    paymentReference:
      typeof data.paymentReference === 'string' || data.paymentReference === null
        ? data.paymentReference
        : null,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
  };
}

export async function createDirectOrderForProduct(
  productId: string,
  buyerId: string,
): Promise<string> {
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const productRef = doc(db, 'products', productId);
  const ordersCol = collection(db, 'orders');

  let createdOrderId = '';

  await runTransaction(db, async (tx) => {
    const productSnap = await tx.get(productRef);
    if (!productSnap.exists()) {
      throw new Error('Produsul nu există');
    }

    const data = productSnap.data() as any;

    const product: Product = {
      id: productSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || new Date(),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt || new Date(),
    };

    if (product.status !== 'approved') {
      throw new Error('Produsul nu este disponibil pentru cumpărare.');
    }

    if ((data as any).isSold) {
      throw new Error('Produsul a fost deja vândut.');
    }

    if (product.ownerId === buyerId) {
      throw new Error('Nu poți cumpăra propriul produs.');
    }

    const price = product.price;
    if (typeof price !== 'number' || price <= 0) {
      throw new Error('Produsul nu are un preț valid.');
    }

    // Create order in "paid" state for now (no external payment).
    const orderDocRef = doc(ordersCol);

    const orderData = {
      productId,
      buyerId,
      sellerId: product.ownerId,
      price,
      currency: 'RON',
      status: 'paid',
      paymentProvider: 'manual',
      paymentReference: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    tx.set(orderDocRef, orderData);

    // Mark product as sold and link the order.
    tx.update(productRef, {
      isSold: true,
      soldAt: serverTimestamp(),
      buyerId,
      orderId: orderDocRef.id,
      updatedAt: serverTimestamp(),
    });

    createdOrderId = orderDocRef.id;
  });

  // Add the bought product into buyer's personal collection.
  try {
    const productSnap = await getDoc(doc(db, 'products', productId));
    if (productSnap.exists()) {
      const data = productSnap.data() as any;
      await addCollectionItem(buyerId, {
        name: data.name || 'Articol cumpărat',
        description: data.description || '',
        images: data.images || [],
        country: data.country || undefined,
        year: data.year || undefined,
        era: data.era || undefined,
        denomination: data.denomination || undefined,
        metal: data.metal || undefined,
        grade: data.grade || undefined,
        rarity: data.rarity || undefined,
        weight: data.weight || undefined,
        diameter: data.diameter || undefined,
        category: data.category || undefined,
        acquisitionPrice: data.price,
        currentValue: data.price,
        notes: `Cumpărat direct din magazin (produs ${productId})`,
        tags: ['shop-purchase'],
      });
    }
  } catch (err) {
    // Non-critical: log and continue.
    console.error('Failed to add bought product to collection:', err);
  }

  return createdOrderId;
}

/**
 * Fetch all orders where the given user is the buyer, ordered by creation date (newest first).
 * Used for "Comenzile mele" / order history in the dashboard.
 */
export async function getOrdersForBuyer(userId: string): Promise<Order[]> {
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('buyerId', '==', userId),
    orderBy('createdAt', 'desc'),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapOrderSnapshot);
}

/**
 * Fetch all orders where the given user is the seller, ordered by creation date (newest first).
 * Used for "Vânzările mele" / seller sales overview.
 */
export async function getSalesForSeller(userId: string): Promise<Order[]> {
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('sellerId', '==', userId),
    orderBy('createdAt', 'desc'),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapOrderSnapshot);
}