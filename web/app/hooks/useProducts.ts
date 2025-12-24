import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  doc,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  getDocs,
} from 'firebase/firestore';
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
	live: boolean = true,
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
		
		// Base query: only approved products that are not sold
		let q = query(
			collection(db, 'products'),
			where('status', '==', 'approved'),
		);

		// Apply ownerId filter BEFORE orderBy (Firestore requirement)
		if (ownerId) {
			q = query(q, where('ownerId', '==', ownerId));
		}

		// Apply listing type filter unless we explicitly want all listing types
		if (listingType !== 'all') {
			q = query(
				q,
				where('listingType', '==', listingType),
			);
		}

		// Filter out sold items (isSold == false or null/undefined)
		// Note: We can't use where('isSold', '==', false) because it won't match null/undefined
		// So we'll filter in memory after fetching
		
		// Order and limit (must come after all where clauses)
		q = query(
			q,
			orderBy('createdAt', 'desc'),
			limit(pageSize),
		);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[useProducts] init', {
        ownerId: ownerId || null,
        pageSize,
        enabled,
        listingType,
        live,
        fieldsCount: fields.length,
      });
    }

    // Live mode: keep the existing listener behavior.
    // Non-live mode: use getDocs so pagination doesn't get overwritten by realtime updates.
    if (live) {
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          console.log('[useProducts] Query returned', querySnapshot.size, 'products');
          const productsData: Product[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('[useProducts] Product:', doc.id, {
              status: data.status,
              listingType: data.listingType,
              isSold: data.isSold,
              name: data.name
            });
            
            // Skip sold items
            if (data.isSold === true) {
              console.log('[useProducts] Skipping sold product:', doc.id);
              return;
            }
            
            const productData: any = { id: doc.id };

            // Only include requested fields for performance
            fields.forEach((field) => {
              if (data[field] !== undefined) {
                productData[field] = data[field];
              }
            });

            // Always include dates for proper typing
            if (fields.includes('createdAt')) {
              productData.createdAt =
                data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || new Date();
            }
            if (fields.includes('updatedAt')) {
              productData.updatedAt =
                data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt || new Date();
            }
            if (fields.includes('boostExpiresAt') && data.boostExpiresAt) {
              productData.boostExpiresAt =
                data.boostExpiresAt?.toDate ? data.boostExpiresAt.toDate() : data.boostExpiresAt;
            }
            if (fields.includes('boostedAt') && data.boostedAt) {
              productData.boostedAt =
                data.boostedAt?.toDate ? data.boostedAt.toDate() : data.boostedAt;
            }

            productsData.push(productData as Product);
          });

          console.log('[useProducts] Setting products:', productsData.length);
          setProducts(productsData);
          // Use raw snapshot size for pagination; filtered length may be < pageSize
          // when we skip sold items in memory, but we still want to keep loading.
          setHasMore(querySnapshot.size === pageSize);
          if (productsData.length > 0) {
            setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
          }
          setLoading(false);
        },
        (err) => {
          console.error('Firestore error in useProducts:', err);
          setError(err.message);
          setLoading(false);
        },
      );

      unsubscribeRef.current = unsubscribe;

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    }

    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(q);
        if (cancelled) return;

        if (process.env.NODE_ENV !== 'production') {
          console.log('[useProducts] getDocs returned', snap.size, 'products', {
            ownerId: ownerId || null,
            pageSize,
            listingType,
          });
        }

        const productsData: Product[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          
          // Skip sold items
          if (data.isSold === true) {
            return;
          }
          
          const productData: any = { id: doc.id };

          fields.forEach((field) => {
            if (data[field] !== undefined) {
              productData[field] = data[field];
            }
          });

          if (fields.includes('createdAt')) {
            productData.createdAt =
              data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || new Date();
          }
          if (fields.includes('updatedAt')) {
            productData.updatedAt =
              data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt || new Date();
          }
          if (fields.includes('boostExpiresAt') && data.boostExpiresAt) {
            productData.boostExpiresAt =
              data.boostExpiresAt?.toDate ? data.boostExpiresAt.toDate() : data.boostExpiresAt;
          }
          if (fields.includes('boostedAt') && data.boostedAt) {
            productData.boostedAt =
              data.boostedAt?.toDate ? data.boostedAt.toDate() : data.boostedAt;
          }

          productsData.push(productData as Product);
        });
        
        setProducts(productsData);
        // Again, base hasMore on how many docs Firestore actually returned
        setHasMore(snap.size === pageSize);
        if (productsData.length > 0) {
          setLastVisible(snap.docs[snap.docs.length - 1]);
        }
      } catch (err: any) {
        console.error('Firestore error in useProducts (getDocs):', err);
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
	}, [ownerId, pageSize, JSON.stringify(fields), enabled, listingType, live]);

  const loadMore = useCallback(async () => {
    if (!enabled || !hasMore || !lastVisible || loading || !db) return;

		setLoading(true);
		
		// Base query for pagination: approved products
		let q = query(
			collection(db, 'products'),
			where('status', '==', 'approved'),
		);

		// Apply ownerId filter BEFORE orderBy (Firestore requirement)
		if (ownerId) {
			q = query(q, where('ownerId', '==', ownerId));
		}

		if (listingType !== 'all') {
			q = query(
				q,
				where('listingType', '==', listingType),
			);
		}

		// Order and limit (must come after all where clauses)
		q = query(
			q,
			orderBy('createdAt', 'desc'),
			limit(pageSize),
			startAfter(lastVisible),
		);

    try {
      const snap = await getDocs(q);
      const productsData: Product[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        
        // Skip sold items
        if (data.isSold === true) {
          return;
        }
        
        const productData: any = { id: doc.id };

        fields.forEach((field) => {
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

      setProducts((prev) => [...prev, ...productsData]);
      setHasMore(productsData.length === pageSize);
      if (productsData.length > 0) {
        setLastVisible(snap.docs[snap.docs.length - 1]);
      }
    } catch (err: any) {
      console.error('Firestore error in loadMore:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
	}, [enabled, hasMore, lastVisible, loading, ownerId, pageSize, fields, listingType]);

  return { products, loading, error, hasMore, loadMore };
}

export function useProduct(id: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toDateSafe = (value: any): Date | undefined => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (value?.toDate && typeof value.toDate === 'function') return value.toDate();
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return undefined;
  };

  useEffect(() => {
    if (!id || !db) return;

    const unsubscribe = onSnapshot(
      doc(db, 'products', id),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data() as any;
          setProduct({
            id: doc.id,
            ...data,
            createdAt: toDateSafe(data.createdAt) || new Date(),
            updatedAt: toDateSafe(data.updatedAt) || new Date(),
            listingExpiresAt: toDateSafe(data.listingExpiresAt),
            boostExpiresAt: toDateSafe(data.boostExpiresAt),
            boostedAt: toDateSafe(data.boostedAt),
            promotedAt: toDateSafe(data.promotedAt),
            promotionExpiresAt: toDateSafe(data.promotionExpiresAt),
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
