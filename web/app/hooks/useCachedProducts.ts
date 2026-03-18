import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, where, limit, startAfter, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from 'shared/types';

 // Default fields for product list view - optimize for performance
 // Include boost fields so we can highlight boosted products on homepage.
const DEFAULT_PRODUCT_FIELDS = [
  'name',
  'images',
  'price',
  'createdAt',
  'updatedAt',
  'boostExpiresAt',
  'boostedAt',
];

const toDateSafe = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value?.toDate && typeof value.toDate === 'function') {
    const converted = value.toDate();
    return converted instanceof Date ? converted : null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const isListingActive = (data: any): boolean => {
  const listingExpiresAt = toDateSafe(data?.listingExpiresAt);
  if (!listingExpiresAt) return true;
  return listingExpiresAt.getTime() > Date.now();
};

/**
 * Cached products hook optimized for homepage and lightweight listings.
 * The `enabled` flag lets us avoid hitting Firestore when the user
 * is not authenticated (e.g. guests on homepage).
 */
export function useCachedProducts(
  ownerId?: string,
  pageSize: number = 20,
  fields?: string[],
  enabled: boolean = true
) {
  // Normalize fields so callers can pass undefined and still get defaults
  const selectedFields = fields ?? DEFAULT_PRODUCT_FIELDS;

  return useQuery({
    queryKey: ['products', ownerId, pageSize, selectedFields],
    queryFn: async () => {
      // Match catalog behavior: show only approved products that are direct listings (not auctions)
      let q = query(
        collection(db, 'products'),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(pageSize),
      );

      if (ownerId) {
        q = query(q, where('ownerId', '==', ownerId));
      }

      const querySnapshot = await getDocs(q);
      const productsData: Product[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.listingType === 'auction') return;
        if (data.isSold === true) return;
        if (!isListingActive(data)) return;
        const productData: any = { id: doc.id };

        // Only include requested fields for performance
        selectedFields.forEach(field => {
          if (data[field] !== undefined) {
            productData[field] = data[field];
          }
        });

                // Always include dates for proper typing
                if (selectedFields.includes('createdAt')) {
                  productData.createdAt = data.createdAt?.toDate() || new Date();
                }
                if (selectedFields.includes('updatedAt')) {
                  productData.updatedAt = data.updatedAt?.toDate() || new Date();
                }
                if (selectedFields.includes('boostExpiresAt') && data.boostExpiresAt) {
                  productData.boostExpiresAt = data.boostExpiresAt?.toDate
                    ? data.boostExpiresAt.toDate()
                    : data.boostExpiresAt;
                }
                if (selectedFields.includes('boostedAt') && data.boostedAt) {
                  productData.boostedAt = data.boostedAt?.toDate
                    ? data.boostedAt.toDate()
                    : data.boostedAt;
                }
        
                productsData.push(productData as Product);
      });

      return productsData;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCachedProduct(id: string, fields: string[] = DEFAULT_PRODUCT_FIELDS) {
  return useQuery({
    queryKey: ['product', id, fields],
    queryFn: async () => {
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const productData: any = { id: docSnap.id };

        // Only include requested fields for performance
        fields.forEach(field => {
          if (data[field] !== undefined) {
            productData[field] = data[field];
          }
        });

                // Always include dates for proper typing
                if (fields.includes('createdAt')) {
                  productData.createdAt = data.createdAt?.toDate() || new Date();
                }
                if (fields.includes('updatedAt')) {
                  productData.updatedAt = data.updatedAt?.toDate() || new Date();
                }
                if (fields.includes('boostExpiresAt') && data.boostExpiresAt) {
                  productData.boostExpiresAt = data.boostExpiresAt?.toDate
                    ? data.boostExpiresAt.toDate()
                    : data.boostExpiresAt;
                }
                if (fields.includes('boostedAt') && data.boostedAt) {
                  productData.boostedAt = data.boostedAt?.toDate
                    ? data.boostedAt.toDate()
                    : data.boostedAt;
                }
        
                return productData as Product;
      } else {
        throw new Error('Product not found');
      }
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get boosted products for homepage hero display
 * Only returns products that are currently boosted (boost has not expired)
 */
export function useBoostedProducts(limitCount: number = 3) {
  return useQuery({
    queryKey: ['boosted-products', limitCount],
    queryFn: async () => {
      const now = new Date();
      console.log('🔍 Debug: Checking for boosted products at', now.toISOString());

      // Query for products with active boosts.
      // NOTE: We keep the Firestore query simple (single inequality + orderBy
      // on the same field) so it works without requiring a composite index.
      // We then filter by status === 'approved' on the client side.
      const q = query(
        collection(db, 'products'),
        where('boostExpiresAt', '>', now), // Only active boosts
        orderBy('boostExpiresAt', 'desc'),
        // Fetch a bit more than needed so we can filter out non-approved items
        // while still returning up to `limitCount` boosted products.
        limit(limitCount * 5),
      );

      console.log('🔍 Debug: Executing Firestore query for boosted products (client-side status filter)');
      const querySnapshot = await getDocs(q);
      console.log('🔍 Debug: Query completed, documents found:', querySnapshot.size);
      
      const boostedProducts: Product[] = [];

      querySnapshot.forEach((doc) => {
        if (boostedProducts.length >= limitCount) {
          return;
        }

        const data = doc.data();
        if (data.listingType === 'auction') return;
        const status = data.status;
        const boostExpiresAt = data.boostExpiresAt?.toDate?.() || data.boostExpiresAt;
        const boostedAt = data.boostedAt?.toDate?.() || data.boostedAt;

        console.log('🔍 Debug: Found boosted product candidate:', doc.id, {
          name: data.name,
          status,
          boostExpiresAt,
          boostedAt,
        });

        // Only show approved products in the homepage hero, even if others are boosted.
        if (status !== 'approved') {
          return;
        }
        if (data.isSold === true) {
          return;
        }
        if (!isListingActive(data)) {
          return;
        }

        const productData: any = {
          id: doc.id,
          name: data.name,
          images: data.images,
          price: data.price,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          boostExpiresAt: boostExpiresAt || null,
          boostedAt: boostedAt || null,
        };

        boostedProducts.push(productData as Product);
      });

      console.log('🔍 Debug: Final boosted products count:', boostedProducts.length);
      return boostedProducts;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for boosted products (more dynamic)
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
