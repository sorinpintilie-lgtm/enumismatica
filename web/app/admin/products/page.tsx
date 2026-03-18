'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatRON } from '../../utils/currency';
import {
  isAdmin,
  getAllProducts,
  getAllUsers,
  deleteProduct,
  approveProduct,
  rejectProduct,
  republishProduct,
  extendProductListingByDays,
} from 'shared/adminService';
import { Product, User } from 'shared/types';

export default function AdminProducts() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('all');
  const [ownerSearchTerm, setOwnerSearchTerm] = useState('');
  const [listingExpiryFilter, setListingExpiryFilter] = useState<'all' | 'active' | 'expired' | 'missing'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [goToText, setGoToText] = useState('');
  const [extendingProductId, setExtendingProductId] = useState<string | null>(null);

  const usersById = useMemo(() => {
    return new Map(users.map((u) => [u.id, u]));
  }, [users]);

  const usersForSelect = useMemo(() => {
    const q = ownerSearchTerm.trim().toLowerCase();

    const sorted = [...users].sort((a, b) => {
      const aKey = (a.email || a.displayName || a.id).toLowerCase();
      const bKey = (b.email || b.displayName || b.id).toLowerCase();
      return aKey.localeCompare(bKey);
    });

    if (!q) return sorted;

    return sorted.filter((u) => {
      const haystack = `${u.email || ''} ${u.displayName || ''} ${u.name || ''} ${u.id}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [users, ownerSearchTerm]);

  const selectedOwner = selectedOwnerId === 'all' ? null : usersById.get(selectedOwnerId) || null;

  const normalizeProductId = (raw: string): string => {
    const text = raw.trim();
    if (!text) return '';
    const m = text.match(/\/products\/([^/?#]+)/i);
    return m?.[1] ? m[1] : text;
  };

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
      await Promise.all([loadProducts(), loadUsers()]);
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

  const loadUsers = async () => {
    const allUsers = await getAllUsers();
    setUsers(allUsers);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Ești sigur că vrei să ștergi această piesă?')) return;
    
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

  const handleRepublish = async (productId: string) => {
    if (!confirm('Ești sigur că vrei să republici această piesă în e-shop?')) return;

    const result = await republishProduct(productId);
    if (result.success) {
      await loadProducts();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleExtendListingBy30Days = async (productId: string) => {
    const shouldExtend = confirm('Vrei să extinzi această listare cu +30 zile?');
    if (!shouldExtend) return;

    setExtendingProductId(productId);
    const result = await extendProductListingByDays(productId, 30);

    if (result.success) {
      await loadProducts();
    } else {
      alert(`Error: ${result.error}`);
    }

    setExtendingProductId(null);
  };

  const categoryFilteredProducts = products.filter(p =>
    categoryFilter === 'all' ? true : p.category === categoryFilter
  );

  const ownerFilteredProducts = categoryFilteredProducts.filter((p) =>
    selectedOwnerId === 'all' ? true : p.ownerId === selectedOwnerId
  );

  const listingExpiryFilteredProducts = ownerFilteredProducts.filter((p) => {
    if (listingExpiryFilter === 'all') return true;

    const expiry = p.listingExpiresAt;
    if (!expiry) return listingExpiryFilter === 'missing';

    const isExpired = expiry.getTime() <= Date.now();
    if (listingExpiryFilter === 'expired') return isExpired;
    if (listingExpiryFilter === 'active') return !isExpired;

    return true;
  });

  const filteredProducts = listingExpiryFilteredProducts.filter(p =>
    filter === 'all' ? true : p.status === filter
  );

  const searchedProducts = filteredProducts.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.trim().toLowerCase();
    return (
      p.id.toLowerCase().includes(q) ||
      p.ownerId.toLowerCase().includes(q) ||
      (usersById.get(p.ownerId)?.email || '').toLowerCase().includes(q) ||
      (usersById.get(p.ownerId)?.displayName || '').toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

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
          <h1 className="text-3xl font-bold text-white">Gestionează piese</h1>
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
            Toate ({listingExpiryFilteredProducts.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md ${
              filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            În așteptare ({listingExpiryFilteredProducts.filter(p => p.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-md ${
              filter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Aprobate ({listingExpiryFilteredProducts.filter(p => p.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-md ${
              filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Respinse ({listingExpiryFilteredProducts.filter(p => p.status === 'rejected').length})
          </button>
        </div>

        {/* User-focused admin control */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-4 md:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Filtru rapid după utilizator</h2>
          <p className="text-sm text-gray-600 mb-4">
            Selectează utilizatorul după email, vezi toate produsele lui și poți reactiva listările expirate cu +30 zile.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Caută în listă după email / nume</label>
              <input
                value={ownerSearchTerm}
                onChange={(e) => setOwnerSearchTerm(e.target.value)}
                placeholder="ex: ion@exemplu.ro"
                className="w-full px-4 py-2 rounded-md bg-gray-100 text-gray-800 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Utilizator</label>
              <select
                value={selectedOwnerId}
                onChange={(e) => setSelectedOwnerId(e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-gray-100 text-gray-800 border border-gray-300"
              >
                <option value="all">Toți utilizatorii</option>
                {usersForSelect.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email || u.displayName || u.name || u.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-700">
            {selectedOwner ? (
              <span>
                Selectat: <span className="font-semibold">{selectedOwner.email || selectedOwner.displayName || selectedOwner.id}</span>
              </span>
            ) : (
              <span>Nu este selectat un utilizator specific.</span>
            )}
          </div>
        </div>

        {/* Listing expiration filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-2">Status expirare listare</label>
          <select
            value={listingExpiryFilter}
            onChange={(e) => setListingExpiryFilter(e.target.value as any)}
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-700"
          >
            <option value="all">Toate listările</option>
            <option value="active">Doar active (neexpirate)</option>
            <option value="expired">Doar expirate</option>
            <option value="missing">Fără dată de expirare</option>
          </select>
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

        {/* Search */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-2">
            Caută după ID produs / ID proprietar / nume / descriere
          </label>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ex: 8f3a..., QEm0..., Roman Denarius..."
            className="w-full max-w-2xl px-4 py-2 rounded-md bg-gray-200 text-gray-700"
          />
          {searchTerm.trim() && (
            <p className="mt-2 text-xs text-slate-200">
              Rezultate: <span className="font-semibold">{searchedProducts.length}</span>
            </p>
          )}
        </div>

        {/* Go to product */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-2">Deschide direct un produs (ID sau link)</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={goToText}
              onChange={(e) => setGoToText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const id = normalizeProductId(goToText);
                  if (id) router.push(`/products/${id}`);
                }
              }}
              placeholder="ex: 8f3a... sau https://site.ro/products/8f3a..."
              className="w-full sm:flex-1 px-4 py-2 rounded-md bg-gray-200 text-gray-700"
            />
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:bg-gray-400"
              disabled={!goToText.trim()}
              onClick={() => {
                const id = normalizeProductId(goToText);
                if (id) router.push(`/products/${id}`);
              }}
            >
              Deschide
            </button>
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            {searchedProducts.length === 0 ? (
              <p className="text-gray-500">Nicio piesă găsită.</p>
            ) : (
              <div className="space-y-4">
                {searchedProducts.map((product) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/products/${product.id}`}
                            className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {product.name}
                          </Link>
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
                          <p>
                            Proprietar:{' '}
                            <Link
                              href={`/admin/users/${product.ownerId}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {usersById.get(product.ownerId)?.email || product.ownerId}
                            </Link>
                          </p>
                          <p>ID Proprietar: {product.ownerId}</p>
                          <p>
                            Listare expiră:{' '}
                            <span
                              className={`font-medium ${
                                !product.listingExpiresAt
                                  ? 'text-gray-500'
                                  : product.listingExpiresAt.getTime() <= Date.now()
                                  ? 'text-red-600'
                                  : 'text-green-700'
                              }`}
                            >
                              {!product.listingExpiresAt
                                ? 'Nesetat'
                                : `${product.listingExpiresAt.toLocaleDateString()} ${
                                    product.listingExpiresAt.getTime() <= Date.now() ? '(Expirat)' : '(Activ)'
                                  }`}
                            </span>
                          </p>
                          <p>Creat: {product.createdAt.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => handleExtendListingBy30Days(product.id)}
                          disabled={extendingProductId === product.id}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-4 py-2 rounded-md text-sm"
                        >
                          {extendingProductId === product.id ? 'Se extinde...' : 'Reactivare +30 zile'}
                        </button>
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
                        <Link
                          href={`/products/new?edit=${product.id}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm inline-block text-center"
                        >
                          Editează
                        </Link>
                        {product.isSold && (
                          <button
                            onClick={() => handleRepublish(product.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                          >
                            Republică
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
