import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, where, doc, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../../../shared/firebaseConfig';
import { Product } from '../../../shared/types';

// Default fields for product list view - optimize for performance
const DEFAULT_PRODUCT_FIELDS = ['name', 'images', 'price', 'createdAt', 'updatedAt'];

export function useProducts(ownerId?: string, pageSize: number = 20, fields: string[] = DEFAULT_PRODUCT_FIELDS) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Safety check: ensure db is initialized
    if (!db) {
      console.error('Firestore db is not initialized');
      setLoading(false);
      setError('Database not initialized');
      return;
    }

    setLoading(true);
    setError(null);
    
    let q = query(
      collection(db, 'products'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
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
            productData.createdAt = data.createdAt?.toDate() || new Date();
          }
          if (fields.includes('updatedAt')) {
            productData.updatedAt = data.updatedAt?.toDate() || new Date();
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
  }, [ownerId, pageSize, JSON.stringify(fields)]);

  const loadMore = useCallback(() => {
    if (!hasMore || !lastVisible || loading || !db) return;

    setLoading(true);
    
    let q = query(
      collection(db, 'products'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
      startAfter(lastVisible)
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
            productData.createdAt = data.createdAt?.toDate() || new Date();
          }
          if (fields.includes('updatedAt')) {
            productData.updatedAt = data.updatedAt?.toDate() || new Date();
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
  }, [hasMore, lastVisible, loading, ownerId, pageSize, fields]);

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