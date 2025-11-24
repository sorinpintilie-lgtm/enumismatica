'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  isAdmin,
  getPlatformStats,
  getPendingProducts,
  getPendingAuctions,
  approveProduct,
  rejectProduct,
  approveAuction,
  rejectAuction,
} from 'shared/adminService';
import { Product, Auction } from 'shared/types';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalAuctions: 0,
    activeAuctions: 0,
    endedAuctions: 0,
  });
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [pendingAuctions, setPendingAuctions] = useState<Auction[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'auctions'>('overview');

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
      await loadData();
      setLoading(false);
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

  const loadData = async () => {
    const [statsData, products, auctions] = await Promise.all([
      getPlatformStats(),
      getPendingProducts(),
      getPendingAuctions(),
    ]);

    setStats(statsData);
    setPendingProducts(products);
    setPendingAuctions(auctions);
  };

  const handleApproveProduct = async (productId: string) => {
    const result = await approveProduct(productId);
    if (result.success) {
      await loadData();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleRejectProduct = async (productId: string) => {
    const result = await rejectProduct(productId);
    if (result.success) {
      await loadData();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleApproveAuction = async (auctionId: string) => {
    const result = await approveAuction(auctionId);
    if (result.success) {
      await loadData();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleRejectAuction = async (auctionId: string) => {
    const result = await rejectAuction(auctionId);
    if (result.success) {
      await loadData();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!isAdminUser) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tablou de bord Admin</h1>
            <p className="text-gray-600 mt-2">Gestionează conținutul platformei și utilizatorii</p>
          </div>
          <Link
            href="/dashboard"
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium transition-colors duration-200"
          >
            Înapoi la tabloul de bord
          </Link>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Prezentare generală
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Produse în așteptare ({pendingProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('auctions')}
              className={`${
                activeTab === 'auctions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Licitații în așteptare ({pendingAuctions.length})
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total utilizatori</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
              <Link href="/admin/users" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
                Gestionează utilizatori →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total produse</h3>
              <p className="text-3xl font-bold text-green-600">{stats.totalProducts}</p>
              <p className="text-sm text-gray-600 mt-2">{pendingProducts.length} în așteptarea aprobării</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total licitații</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.totalAuctions}</p>
              <p className="text-sm text-gray-600 mt-2">
                {stats.activeAuctions} active, {pendingAuctions.length} în așteptare
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Licitații active</h3>
              <p className="text-3xl font-bold text-orange-600">{stats.activeAuctions}</p>
              <Link href="/admin/auctions" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
                Vezi toate →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Licitații încheiate</h3>
              <p className="text-3xl font-bold text-gray-600">{stats.endedAuctions}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionare Conținut</h3>
              <div className="space-y-2">
                <Link href="/admin/products" className="block text-blue-600 hover:text-blue-800 text-sm">
                  📦 Gestionează produse →
                </Link>
                <Link href="/admin/auctions" className="block text-blue-600 hover:text-blue-800 text-sm">
                  🔨 Gestionează licitații →
                </Link>
                <Link href="/admin/users" className="block text-blue-600 hover:text-blue-800 text-sm">
                  👥 Gestionează utilizatori →
                </Link>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Monitorizare</h3>
              <div className="space-y-2">
                <Link href="/admin/conversations" className="block text-blue-600 hover:text-blue-800 text-sm">
                  💬 Vezi toate conversațiile →
                </Link>
                <Link href="/seed-db" className="block text-blue-600 hover:text-blue-800 text-sm">
                  🌱 Gestionare bază de date →
                </Link>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Statistici Platformă</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Utilizatori:</span>
                  <span className="font-medium">{stats.totalUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Produse:</span>
                  <span className="font-medium">{stats.totalProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Licitații:</span>
                  <span className="font-medium">{stats.totalAuctions}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Products Tab */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Produse în așteptare</h2>
              {pendingProducts.length === 0 ? (
                <p className="text-gray-500">Niciun produs în așteptare pentru revizuire.</p>
              ) : (
                <div className="space-y-4">
                  {pendingProducts.map((product) => (
                    <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                          <p className="text-gray-600 mt-1">{product.description}</p>
                          <p className="text-sm text-gray-500 mt-2">Preț: ${product.price.toFixed(2)}</p>
                          <p className="text-sm text-gray-500">ID Proprietar: {product.ownerId}</p>
                          <p className="text-sm text-gray-500">
                            Creat: {product.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleApproveProduct(product.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                          >
                            Aprobă
                          </button>
                          <button
                            onClick={() => handleRejectProduct(product.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                          >
                            Respinge
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pending Auctions Tab */}
        {activeTab === 'auctions' && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Licitații în așteptare</h2>
              {pendingAuctions.length === 0 ? (
                <p className="text-gray-500">Nicio licitație în așteptare pentru revizuire.</p>
              ) : (
                <div className="space-y-4">
                  {pendingAuctions.map((auction) => (
                    <div key={auction.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">Licitație #{auction.id.slice(-6)}</h3>
                          <p className="text-sm text-gray-600 mt-1">ID Produs: {auction.productId}</p>
                          <p className="text-sm text-gray-500 mt-2">
                            Preț de rezervă: ${auction.reservePrice.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Start: {auction.startTime.toLocaleDateString()} - Sfârșit:{' '}
                            {auction.endTime.toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Creat: {auction.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleApproveAuction(auction.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                          >
                            Aprobă
                          </button>
                          <button
                            onClick={() => handleRejectAuction(auction.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                          >
                            Respinge
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
