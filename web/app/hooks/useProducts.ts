import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, where, doc, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from 'shared/types';

// Default fields for product list view - optimize for performance
// Include boost fields so we can prioritize boosted products in listings
const DEFAULT_PRODUCT_FIELDS = ['name', 'images', 'price', 'createdAt', 'updatedAt', 'boostExpiresAt', 'boostedAt'];

/**
 * Live products hook used on catalog and other authenticated pages.
 * The `enabled` flag lets us avoid opening Firestore listeners when access
 * is locked (e.g. user not authenticated).
 */
export function useProducts(
	ownerId?: string,
	pageSize: number = 20,
	fields: string[] = DEFAULT_PRODUCT_FIELDS,
	enabled: boolean = true,
	listingType: 'direct' | 'auction' | 'all' = 'direct',
	) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // If this hook is disabled (e.g. user not authenticated), do not attach any listeners.
    if (!enabled) {
      setProducts([]);
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

		setLoading(true);
		setError(null);
		
		// Base query: only approved products
		let q = query(
			collection(db, 'products'),
			where('status', '==', 'approved'),
		);

		// Apply listing type filter unless we explicitly want all listing types
		if (listingType !== 'all') {
			q = query(
				q,
				where('listingType', '==', listingType),
			);
		}

		// Order and limit
		q = query(
			q,
			orderBy('createdAt', 'desc'),
			limit(pageSize),
		);

    if (ownerId) {
      q = query(q, where('ownerId', '==', ownerId));
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log('[useProducts] Query returned', querySnapshot.size, 'products');
        const productsData: Product[] = [];
        querySnapshot.forEach((doc) => {
          console.log('[useProducts] Product:', doc.id, 'status:', doc.data().status);
          const data = doc.data();
          const productData: any = { id: doc.id };

          // Only include requested fields for performance
          fields.forEach(field => {
            if (data[field] !== undefined) {
              productData[field] = data[field];
            }
          });

          // Always include dates for proper typing
          if (fields.includes('createdAt')) {
            productData.createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || new Date();
          }
          if (fields.includes('updatedAt')) {
            productData.updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt || new Date();
          }
          if (fields.includes('boostExpiresAt') && data.boostExpiresAt) {
            productData.boostExpiresAt = data.boostExpiresAt?.toDate ? data.boostExpiresAt.toDate() : data.boostExpiresAt;
          }
          if (fields.includes('boostedAt') && data.boostedAt) {
            productData.boostedAt = data.boostedAt?.toDate ? data.boostedAt.toDate() : data.boostedAt;
          }

          productsData.push(productData as Product);
        });

        console.log('[useProducts] Setting products:', productsData.length);
        setProducts(productsData);
        setHasMore(productsData.length === pageSize);
        if (productsData.length > 0) {
          setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Firestore error in useProducts:', err);
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
	}, [ownerId, pageSize, JSON.stringify(fields), enabled, listingType]);

  const loadMore = useCallback(() => {
    if (!enabled || !hasMore || !lastVisible || loading || !db) return;

		setLoading(true);
		
		// Base query for pagination: approved products
		let q = query(
			collection(db, 'products'),
			where('status', '==', 'approved'),
		);

		if (listingType !== 'all') {
			q = query(
				q,
				where('listingType', '==', listingType),
			);
		}

		q = query(
			q,
			orderBy('createdAt', 'desc'),
			limit(pageSize),
			startAfter(lastVisible),
		);

    if (ownerId) {
      q = query(q, where('ownerId', '==', ownerId));
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const productsData: Product[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const productData: any = { id: doc.id };

          fields.forEach(field => {
            if (data[field] !== undefined) {
              productData[field] = data[field];
            }
          });

          if (fields.includes('createdAt')) {
            productData.createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || new Date();
          }
          if (fields.includes('updatedAt')) {
            productData.updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt || new Date();
          }
          if (fields.includes('boostExpiresAt') && data.boostExpiresAt) {
            productData.boostExpiresAt = data.boostExpiresAt?.toDate ? data.boostExpiresAt.toDate() : data.boostExpiresAt;
          }
          if (fields.includes('boostedAt') && data.boostedAt) {
            productData.boostedAt = data.boostedAt?.toDate ? data.boostedAt.toDate() : data.boostedAt;
          }

          productsData.push(productData as Product);
        });

        setProducts(prev => [...prev, ...productsData]);
        setHasMore(productsData.length === pageSize);
        if (productsData.length > 0) {
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
	}, [hasMore, lastVisible, loading, ownerId, pageSize, fields, enabled, listingType]);

  return { products, loading, error, hasMore, loadMore };
}

export function useProduct(id: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !db) return;

    const unsubscribe = onSnapshot(
      doc(db, 'products', id),
      (doc) => {
        if (doc.exists()) {
          setProduct({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          } as Product);
        } else {
          setProduct(null);
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

  return { product, loading, error };
}
