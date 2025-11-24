'use client';

import { useAuth } from '../context/AuthContext';
import { logout } from 'shared/auth';
import { useRouter } from 'next/navigation';
import { useProducts } from '../hooks/useProducts';
import { useAuctions } from '../hooks/useAuctions';
import Link from 'next/link';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { products } = useProducts(user?.uid);
  const { auctions } = useAuctions();
  const { useConversations } = require('../hooks/useChat');
  const { useCollection } = require('../hooks/useCollection');
  const { conversations, totalUnreadCount } = useConversations(user?.uid || null);
  const { items: collectionItems, stats: collectionStats } = useCollection(user?.uid || null);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Filter auctions where user is the owner (assuming we add ownerId to auctions later)
  const userAuctions = auctions.filter(auction => auction.currentBidderId === user.uid);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tablou de bord</h1>
            <p className="text-gray-600 mt-2">Bine ai revenit, {user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md font-medium transition-colors duration-200"
          >
            Deconectare
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/collection" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Colecția Mea</h3>
              <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-amber-600">{collectionItems?.length || 0}</p>
            <p className="text-sm text-gray-600">Articole în colecție</p>
            {collectionStats && collectionStats.totalValue > 0 && (
              <p className="text-sm text-green-600 mt-1">Valoare: ${collectionStats.totalValue.toFixed(0)}</p>
            )}
          </Link>

          <Link href="/messages" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Mesaje</h3>
              <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-blue-600">{conversations?.length || 0}</p>
            <p className="text-sm text-gray-600">Conversații active</p>
            {totalUnreadCount > 0 && (
              <>
                <p className="text-sm text-red-600 mt-1">{totalUnreadCount} necitite</p>
                <span className="absolute top-4 right-4 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                  {totalUnreadCount}
                </span>
              </>
            )}
          </Link>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Produsele Mele</h3>
              <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-green-600">{products.length}</p>
            <p className="text-sm text-gray-600">Listate pentru vânzare</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Licitații Active</h3>
              <svg className="w-8 h-8 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-purple-600">{userAuctions.length}</p>
            <p className="text-sm text-gray-600">Licitații la care participi</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Acțiuni Rapide</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/collection"
              className="bg-white hover:bg-gray-50 text-amber-700 px-4 py-3 rounded-lg text-center font-medium transition-all shadow-sm"
            >
              🪙 Colecția Mea
            </Link>
            <Link
              href="/messages"
              className="bg-white hover:bg-gray-50 text-blue-700 px-4 py-3 rounded-lg text-center font-medium transition-all shadow-sm relative"
            >
              💬 Mesaje
              {totalUnreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {totalUnreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/products"
              className="bg-white hover:bg-gray-50 text-green-700 px-4 py-3 rounded-lg text-center font-medium transition-all shadow-sm"
            >
              🛍️ Magazin
            </Link>
            <Link
              href="/auctions"
              className="bg-white hover:bg-gray-50 text-purple-700 px-4 py-3 rounded-lg text-center font-medium transition-all shadow-sm"
            >
              🔨 Licitații
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Products */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Produsele mele</h2>
              <Link
                href="/products/new"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Adaugă produs
              </Link>
            </div>

            {products.length === 0 ? (
              <p className="text-gray-500">Niciun produs listat încă.</p>
            ) : (
              <div className="space-y-3">
                {products.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">${product.price.toFixed(2)}</p>
                    </div>
                    <Link
                      href={`/products/${product.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Vezi
                    </Link>
                  </div>
                ))}
                {products.length > 5 && (
                  <p className="text-sm text-gray-600 text-center">
                    Și încă {products.length - 5}...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* My Auction Activity */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Activitatea mea la licitații</h2>
              <Link
                href="/auctions"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Vezi toate
              </Link>
            </div>

            {userAuctions.length === 0 ? (
              <p className="text-gray-500">Nicio licitație activă.</p>
            ) : (
              <div className="space-y-3">
                {userAuctions.slice(0, 5).map((auction) => (
                  <div key={auction.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-gray-900">Licitație #{auction.id.slice(-6)}</p>
                      <p className="text-sm text-gray-600">
                        Licitație curentă: ${auction.currentBid?.toFixed(2) || auction.reservePrice.toFixed(2)}
                      </p>
                    </div>
                    <Link
                      href={`/auctions/${auction.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Vezi
                    </Link>
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
