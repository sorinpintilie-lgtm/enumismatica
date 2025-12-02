'use client';

import React, { useState, useEffect } from 'react';
import { useWatchlist } from '../hooks/useWatchlist';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '../components/ProductCard';
import AuctionCard from '../components/AuctionCard';
import { WatchlistButton } from '../components/WatchlistButton';

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    watchlist,
    loading: watchlistLoading,
    error,
    fetchWatchlist,
    removeFromWatchlist,
    clearWatchlist
  } = useWatchlist();

  const [activeTab, setActiveTab] = useState<'products' | 'auctions'>('products');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState<boolean>(false);

  // Redirect to login if not authenticated (only after auth state is resolved)
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Refresh watchlist when tab changes
  useEffect(() => {
    if (user) {
      fetchWatchlist();
    }
  }, [user, activeTab, fetchWatchlist]);

  // Filter watchlist by active tab
  const filteredWatchlist = watchlist.filter(item => {
    if (activeTab === 'products') return item.itemType === 'product';
    if (activeTab === 'auctions') return item.itemType === 'auction';
    return true;
  });

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Toggle select mode
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) {
      setSelectedItems([]);
    }
  };

  // Remove selected items
  const removeSelectedItems = async () => {
    if (selectedItems.length === 0) return;

    try {
      for (const itemId of selectedItems) {
        await removeFromWatchlist(itemId);
      }
      setSelectedItems([]);
      setSelectMode(false);
    } catch (error) {
      console.error('Error removing selected items:', error);
    }
  };

  // Clear entire watchlist
  const handleClearWatchlist = async () => {
    if (window.confirm('Ești sigur că dorești să golești întreaga listă de urmărire?')) {
      try {
        await clearWatchlist();
      } catch (error) {
        console.error('Error clearing watchlist:', error);
      }
    }
  };

  // Group watchlist items by type for display
  const productsInWatchlist = watchlist.filter(item => item.itemType === 'product');
  const auctionsInWatchlist = watchlist.filter(item => item.itemType === 'auction');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Te rog autentifică-te</h1>
          <p className="text-gray-300 mb-6">Trebuie să fii autentificat pentru a accesa lista de urmărire.</p>
          <Link
            href="/login"
            className="bg-[#e7b73c] hover:bg-[#f0c955] text-white px-6 py-3 rounded-xl font-semibold transition-all"
          >
            Autentificare
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Lista mea de urmărire</h1>
            <p className="text-gray-300 mt-1">
              {watchlist.length} articole urmărite • {productsInWatchlist.length} produse • {auctionsInWatchlist.length} licitații
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={toggleSelectMode}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectMode
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {selectMode ? 'Anulează' : 'Selectează'}
            </button>

            {selectMode && selectedItems.length > 0 && (
              <button
                onClick={removeSelectedItems}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-all"
              >
                Îndepărtează selectate ({selectedItems.length})
              </button>
            )}

            <button
              onClick={handleClearWatchlist}
              className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-gray-300 text-sm font-medium transition-all"
            >
              Golește lista
            </button>

            <button
              onClick={fetchWatchlist}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all"
              title="Reîncarcă lista"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 py-3 px-4 rounded-tl-lg rounded-tr-lg text-sm font-medium transition-all ${
              activeTab === 'products'
                ? 'bg-navy-700 text-white border-b-2 border-gold-400'
                : 'bg-navy-800 text-gray-300 hover:bg-navy-700'
            }`}
          >
            Produse ({productsInWatchlist.length})
          </button>
          <button
            onClick={() => setActiveTab('auctions')}
            className={`flex-1 py-3 px-4 rounded-tl-lg rounded-tr-lg text-sm font-medium transition-all ${
              activeTab === 'auctions'
                ? 'bg-navy-700 text-white border-b-2 border-gold-400'
                : 'bg-navy-800 text-gray-300 hover:bg-navy-700'
            }`}
          >
            Licitații ({auctionsInWatchlist.length})
          </button>
        </div>

        {/* Loading state */}
        {watchlistLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-900/50 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
            <button
              onClick={fetchWatchlist}
              className="mt-2 text-red-200 hover:text-red-100 text-sm"
            >
              Încearcă din nou
            </button>
          </div>
        )}

        {/* Empty state */}
        {watchlist.length === 0 && !watchlistLoading && !error && (
          <div className="text-center py-16">
            <div className="mx-auto mb-6">
              <svg className="w-20 h-20 text-gray-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Lista de urmărire goală</h2>
            <p className="text-gray-400 mb-6">
              Adaugă produse și licitații la lista de urmărire pentru a le monitoriza ușor.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/products"
                className="bg-[#e7b73c] hover:bg-[#f0c955] text-white px-6 py-3 rounded-xl font-semibold transition-all"
              >
                Explorează produse
              </Link>
              <Link
                href="/auctions"
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
              >
                Vezi licitații
              </Link>
            </div>
          </div>
        )}

        {/* Watchlist content */}
        {watchlist.length > 0 && !watchlistLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredWatchlist.map((item) => (
              <div key={item.id} className="relative group">
                {/* Selection checkbox for select mode */}
                {selectMode && (
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.itemId)}
                      onChange={() => toggleItemSelection(item.itemId)}
                      className="h-5 w-5 rounded border-gray-500 bg-navy-800 text-gold-400 focus:ring-gold-400"
                    />
                  </div>
                )}

                {/* Watchlist button overlay */}
                <div className="absolute top-2 right-2 z-10">
                  <WatchlistButton
                    itemType={item.itemType}
                    itemId={item.itemId}
                    size="small"
                  />
                </div>

                {/* Item content */}
                {item.itemType === 'product' && (
                  <ProductCard
                    product={{ id: item.itemId } as any}
                  />
                )}
                {item.itemType === 'auction' && (
                  <AuctionCard
                    auction={{ id: item.itemId } as any}
                  />
                )}

                {/* Item notes if available */}
                {item.notes && (
                  <div className="mt-2 p-2 bg-navy-800/50 rounded-lg text-xs text-gray-300 border border-gold-500/20">
                    <p className="font-medium text-gold-400 mb-1">Notițe:</p>
                    <p>{item.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}