import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, where, limit, startAfter, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from 'shared/types';

// Default fields for product list view - optimize for performance
const DEFAULT_PRODUCT_FIELDS = ['name', 'images', 'price', 'createdAt', 'updatedAt'];

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
      let q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(pageSize));

      if (ownerId) {
        q = query(q, where('ownerId', '==', ownerId));
      }

      const querySnapshot = await getDocs(q);
      const productsData: Product[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
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
