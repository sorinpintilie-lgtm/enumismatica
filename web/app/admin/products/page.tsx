'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRON } from '../../utils/currency';
import {
  isAdmin,
  getAllProducts,
  deleteProduct,
  approveProduct,
  rejectProduct,
} from 'shared/adminService';
import { Product } from 'shared/types';

export default function AdminProducts() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      const adminStatus = await isAdmin(user.uid);
      if (!adminStatus) {
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
    const allProducts = await getAllProducts();
    setProducts(allProducts);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Ești sigur că vrei să ștergi acest produs?')) return;
    
    const result = await deleteProduct(productId);
    if (result.success) {
      await loadProducts();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleApprove = async (productId: string) => {
    const result = await approveProduct(productId);
    if (result.success) {
      await loadProducts();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleReject = async (productId: string) => {
    const result = await rejectProduct(productId);
    if (result.success) {
      await loadProducts();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const categoryFilteredProducts = products.filter(p =>
    categoryFilter === 'all' ? true : p.category === categoryFilter
  );

  const filteredProducts = categoryFilteredProducts.filter(p =>
    filter === 'all' ? true : p.status === filter
  );

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
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Gestionează produse</h1>
          <Link
            href="/admin"
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Înapoi la Admin
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Toate ({categoryFilteredProducts.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md ${
              filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            În așteptare ({categoryFilteredProducts.filter(p => p.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-md ${
              filter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Aprobate ({categoryFilteredProducts.filter(p => p.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-md ${
              filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Respinse ({categoryFilteredProducts.filter(p => p.status === 'rejected').length})
          </button>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-2">Filtru categorie</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-700"
          >
            <option value="all">Toate categoriile</option>
            <option value="Monede">Monede</option>
            <option value="Bancnote">Bancnote</option>
          </select>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            {filteredProducts.length === 0 ? (
              <p className="text-gray-500">Niciun produs găsit.</p>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              product.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : product.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {product.status}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">{product.description}</p>
                        <div className="mt-2 text-sm text-gray-500">
                          <p>Preț: {formatRON(product.price)}</p>
                          <p>ID Proprietar: {product.ownerId}</p>
                          <p>Creat: {product.createdAt.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {product.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(product.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                            >
                              Aprobă
                            </button>
                            <button
                              onClick={() => handleReject(product.id)}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm"
                            >
                              Respinge
                            </button>
                          </>
                        )}
                        {product.status === 'rejected' && (
                          <button
                            onClick={() => handleApprove(product.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                          >
                            Aprobă
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
                        >
                          Șterge
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
