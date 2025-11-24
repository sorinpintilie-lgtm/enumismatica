import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, where, doc, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../../shared/firebaseConfig';
import { Product } from '../../shared/types';

// Default fields for product list view - optimize for performance
const DEFAULT_PRODUCT_FIELDS = ['name', 'images', 'price', 'createdAt', 'updatedAt'];

export function useProducts(ownerId?: string, pageSize: number = 20, fields: string[] = DEFAULT_PRODUCT_FIELDS) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentUnsubscribe, setCurrentUnsubscribe] = useState<(() => void) | null>(null);

  const loadProducts = useCallback((startAfterDoc?: QueryDocumentSnapshot<DocumentData>) => {
    // Clean up previous listener
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }

    setLoading(true);
    let q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(pageSize));

    if (ownerId) {
      q = query(q, where('ownerId', '==', ownerId));
    }

    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const productsData: Product[] = [];
        querySnapshot.forEach((doc) => {
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
            productData.createdAt = data.createdAt?.toDate() || new Date();
          }
          if (fields.includes('updatedAt')) {
            productData.updatedAt = data.updatedAt?.toDate() || new Date();
          }

          productsData.push(productData as Product);
        });

        if (startAfterDoc) {
          // Append to existing products for pagination
          setProducts(prev => [...prev, ...productsData]);
        } else {
          // Replace products for initial load
          setProducts(productsData);
        }

        setHasMore(productsData.length === pageSize);
        if (productsData.length > 0) {
          setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    setCurrentUnsubscribe(() => unsubscribe);
    return unsubscribe;
  }, [ownerId, pageSize, fields, currentUnsubscribe]);

  useEffect(() => {
    const unsubscribe = loadProducts();
    return () => {
      unsubscribe();
      setCurrentUnsubscribe(null);
    };
  }, [loadProducts]);

  const loadMore = useCallback(() => {
    if (hasMore && lastVisible && !loading) {
      loadProducts(lastVisible);
    }
  }, [hasMore, lastVisible, loading, loadProducts]);

  return { products, loading, error, hasMore, loadMore };
}

export function useProduct(id: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

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