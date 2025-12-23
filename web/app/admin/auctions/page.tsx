'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  isAdmin,
  getAllAuctions,
  deleteAuction,
  approveAuction,
  rejectAuction,
  forceEndAuction,
  getProductById,
} from 'shared/adminService';
import { Product } from 'shared/types';
import { Auction } from 'shared/types';

export default function AdminAuctions() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'ended' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [goToText, setGoToText] = useState('');

  const normalizeAuctionId = (raw: string): string => {
    const text = raw.trim();
    if (!text) return '';
    const m = text.match(/\/auctions\/([^/?#]+)/i);
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
      await loadAuctions();
      setLoading(false);
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

  const loadAuctions = async () => {
    const allAuctions = await getAllAuctions();
    setAuctions(allAuctions);

    // Fetch products for category filtering
    const productPromises = allAuctions.map(async (auction) => {
      if (auction.productId) {
        const product = await getProductById(auction.productId);
        return { productId: auction.productId, product };
      }
      return null;
    });

    const productResults = await Promise.all(productPromises);
    const productsMap: Record<string, Product> = {};
    productResults.forEach(result => {
      if (result && result.product) {
        productsMap[result.productId] = result.product;
      }
    });
    setProducts(productsMap);
  };

  const handleDelete = async (auctionId: string) => {
    if (!confirm('Ești sigur că vrei să ștergi această licitație?')) return;
    
    const result = await deleteAuction(auctionId);
    if (result.success) {
      await loadAuctions();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleApprove = async (auctionId: string) => {
    const result = await approveAuction(auctionId);
    if (result.success) {
      await loadAuctions();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleReject = async (auctionId: string) => {
    const result = await rejectAuction(auctionId);
    if (result.success) {
      await loadAuctions();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleForceEnd = async (auctionId: string) => {
    if (!confirm('Ești sigur că vrei să închei forțat această licitație?')) return;
    
    const result = await forceEndAuction(auctionId);
    if (result.success) {
      await loadAuctions();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const filteredAuctions = auctions.filter(a => {
    const statusMatch = filter === 'all' ? true : a.status === filter;
    const categoryMatch = categoryFilter === 'all' ? true : products[a.productId]?.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  const searchedAuctions = filteredAuctions.filter((a) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.trim().toLowerCase();
    const product = products[a.productId];
    const productName = product?.name || '';
    const ownerId = product?.ownerId || '';
    return (
      a.id.toLowerCase().includes(q) ||
      a.productId.toLowerCase().includes(q) ||
      ownerId.toLowerCase().includes(q) ||
      productName.toLowerCase().includes(q)
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
          <h1 className="text-3xl font-bold text-white">Gestionează licitații</h1>
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
            Toate ({auctions.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md ${
              filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            În așteptare ({auctions.filter(a => a.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-md ${
              filter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Active ({auctions.filter(a => a.status === 'active').length})
          </button>
          <button
            onClick={() => setFilter('ended')}
            className={`px-4 py-2 rounded-md ${
              filter === 'ended' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Încheiate ({auctions.filter(a => a.status === 'ended').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-md ${
              filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Respinse ({auctions.filter(a => a.status === 'rejected').length})
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

        {/* Search */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-2">
            Caută după ID licitație / ID produs / ID proprietar / nume produs
          </label>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ex: 2a9c..., productId..., ownerId..., Roman Denarius..."
            className="w-full max-w-2xl px-4 py-2 rounded-md bg-gray-200 text-gray-700"
          />
          {searchTerm.trim() && (
            <p className="mt-2 text-xs text-slate-200">
              Rezultate: <span className="font-semibold">{searchedAuctions.length}</span>
            </p>
          )}
        </div>

        {/* Go to auction */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-2">Deschide direct o licitație (ID sau link)</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={goToText}
              onChange={(e) => setGoToText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const id = normalizeAuctionId(goToText);
                  if (id) router.push(`/auctions/${id}`);
                }
              }}
              placeholder="ex: 2a9c... sau https://site.ro/auctions/2a9c..."
              className="w-full sm:flex-1 px-4 py-2 rounded-md bg-gray-200 text-gray-700"
            />
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:bg-gray-400"
              disabled={!goToText.trim()}
              onClick={() => {
                const id = normalizeAuctionId(goToText);
                if (id) router.push(`/auctions/${id}`);
              }}
            >
              Deschide
            </button>
          </div>
        </div>

        {/* Auctions List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            {searchedAuctions.length === 0 ? (
              <p className="text-gray-500">Nicio licitație găsită.</p>
            ) : (
              <div className="space-y-4">
                {searchedAuctions.map((auction) => (
                  <div key={auction.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/auctions/${auction.id}`}
                            className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Licitație #{auction.id.slice(-6)}
                          </Link>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              auction.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : auction.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : auction.status === 'ended'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {auction.status}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          <p>ID piesă: {auction.productId}</p>
                          <p>Preț de rezervă: ${Math.round(auction.reservePrice)}</p>
                          {auction.currentBid && (
                            <p>Licitație curentă: ${Math.round(auction.currentBid)}</p>
                          )}
                          {products[auction.productId]?.ownerId && (
                            <p>
                              Proprietar:{' '}
                              <Link
                                href={`/admin/users/${products[auction.productId].ownerId}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {products[auction.productId].ownerId}
                              </Link>
                            </p>
                          )}
                          <p>
                            Start: {auction.startTime.toLocaleDateString()} - Sfârșit:{' '}
                            {auction.endTime.toLocaleDateString()}
                          </p>
                          <p>Creat: {auction.createdAt.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {auction.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(auction.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                            >
                              Aprobă
                            </button>
                            <button
                              onClick={() => handleReject(auction.id)}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm"
                            >
                              Respinge
                            </button>
                          </>
                        )}
                        {auction.status === 'active' && (
                          <button
                            onClick={() => handleForceEnd(auction.id)}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm"
                          >
                            Încheie forțat
                          </button>
                        )}
                        {auction.status === 'rejected' && (
                          <button
                            onClick={() => handleApprove(auction.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                          >
                            Aprobă
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(auction.id)}
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
