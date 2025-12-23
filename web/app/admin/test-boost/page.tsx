'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Product } from 'shared/types';

export default function TestBoostPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [boostDays, setBoostDays] = useState(7);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      // Simple admin check - in real app, use isAdmin function
      const adminEmails = ['admin@enumismatica.ro', 'sorin.pintilie@gmail.com'];
      const isAdmin = adminEmails.includes(user.email || '') || user.uid === 'admin';
      
      if (!isAdmin) {
        router.push('/dashboard');
        return;
      }

      setIsAdminUser(true);
      await loadProducts();
      setLoading(false);
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

  const loadProducts = async () => {
    try {
      // Get approved products
      const q = query(
        collection(db, 'products'),
        where('status', '==', 'approved')
      );
      
      const querySnapshot = await getDocs(q);
      const productsData: Product[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        productsData.push({
          id: doc.id,
          name: data.name || 'Unknown',
          description: data.description || '',
          images: data.images || [],
          price: data.price || 0,
          ownerId: data.ownerId || '',
          status: data.status || 'pending',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });
      
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Eroare la încărcarea pieselor');
    }
  };

  const handleBoostProduct = async () => {
    if (!selectedProduct) {
      alert('Selectează o piesă');
      return;
    }

    try {
      const productRef = doc(db, 'products', selectedProduct);
      const boostUntil = new Date();
      boostUntil.setDate(boostUntil.getDate() + boostDays);

      await updateDoc(productRef, {
        boostedAt: serverTimestamp(),
        boostExpiresAt: Timestamp.fromDate(boostUntil),
        updatedAt: serverTimestamp(),
      });

      alert(`Piesă boostată cu succes pentru ${boostDays} zile!`);
      await loadProducts(); // Refresh the list
    } catch (error) {
      console.error('Error boosting product:', error);
      alert('Eroare la boostarea piesei');
    }
  };

  if (authLoading || loading || !isAdminUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Test Boost Products</h1>
          <Link
            href="/admin"
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Înapoi la Admin
          </Link>
        </div>

        {/* Boost Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Boost a Product</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Product
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a product...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.price} RON
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Boost Duration (days)
              </label>
              <input
                type="number"
                value={boostDays}
                onChange={(e) => setBoostDays(parseInt(e.target.value) || 7)}
                min="1"
                max="30"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleBoostProduct}
              disabled={!selectedProduct}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-medium"
            >
              Boost Product
            </button>
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">All Products ({products.length})</h2>
            
            {products.length === 0 ? (
              <p className="text-gray-500">No products found.</p>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                        <p className="text-gray-600 mt-1">{product.description}</p>
                        <div className="mt-2 text-sm text-gray-500">
                          <p>Price: {product.price} RON</p>
                          <p>Status: {product.status}</p>
                          <p>Created: {product.createdAt.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="ml-4">
                        <button
                          onClick={() => setSelectedProduct(product.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
