'use client';

import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../hooks/useWatchlist';
import { useProducts } from '../hooks/useProducts';
import { useAuctions } from '../hooks/useAuctions';
import Link from 'next/link';
import { useMemo } from 'react';
import ProductCard from '../components/ProductCard';
import AuctionCard from '../components/AuctionCard';

export default function BookmarksPage() {
  const { user } = useAuth();
  const { watchlist, loading, error, removeFromWatchlist, clearWatchlist } = useWatchlist();
  const {
    products,
    loading: productsLoading,
  } = useProducts(
    undefined,
    200,
  );

  // Filter watchlist to only products
  const productWatchlist = useMemo(() => {
    return watchlist.filter(item => item.itemType === 'product');
  }, [watchlist]);

  const watchlistWithItems = useMemo(() => {
    return productWatchlist.map((item) => {
      const linkedItem = products.find((p) => p.id === item.itemId);
      return { ...item, linkedItem };
    });
  }, [productWatchlist, products]);

  const handleRemove = async (itemId: string) => {
    if (confirm('Ești sigur că vrei să elimini această piesă din lista de urmărire?')) {
      await removeFromWatchlist(itemId);
    }
  };

  const handleClear = async () => {
    if (!productWatchlist.length) return;
    if (confirm('Ești sigur că vrei să golești întreaga listă de bookmark-uri?')) {
      // Only clear product items from watchlist
      const productItems = productWatchlist.map(item => item.itemId);
      for (const itemId of productItems) {
        await removeFromWatchlist(itemId);
      }
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-xl rounded-2xl border border-[#e7b73c]/40 bg-navy-900/80 p-8 text-center shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
            <h1 className="text-2xl font-bold text-white mb-3">
              Lista de urmărire este disponibilă doar pentru utilizatori autentificați
            </h1>
            <p className="text-sm text-slate-300 mb-5">
              Autentifică-te pentru a accesa lista ta de urmărire.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-5 py-2.5 text-sm font-semibold text-[#000940] shadow-lg shadow-[#e7b73c]/50 hover:bg-[#f0c955] transition"
              >
                Autentificare
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full border border-[#e7b73c] px-5 py-2.5 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition"
              >
                Creează cont
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !loading && watchlistWithItems.length === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#e7b73c] mb-1">Bookmark-urile mele</h1>
          {loading ? (
            <p className="text-slate-300">Se încarcă...</p>
          ) : isEmpty ? (
            <p className="text-slate-300">Lista ta de bookmark-uri este goală.</p>
          ) : (
            <p className="text-slate-300">
              Ai {watchlistWithItems.length} {watchlistWithItems.length === 1 ? 'piesă' : 'piese'} salvate.
            </p>
          )}
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-full border border-[#e7b73c]/70 px-4 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
        >
          ← Înapoi la cont
        </Link>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500/50 rounded-2xl p-6 mb-6 text-center backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-red-200 mb-2">
            Eroare la încărcarea listei
          </h3>
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {!isEmpty && !loading && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
            {watchlistWithItems.map((item) => {
              const { linkedItem } = item;

              if (!linkedItem) {
                // Fallback for items that couldn't be loaded
                return (
                  <div
                    key={item.id}
                    className="relative group h-full flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 rounded-2xl border border-[#e7b73c]/70 bg-gradient-to-br from-navy-500 to-navy-600 shadow-[0_10px_35px_rgba(231,183,60,0.3)] p-4"
                  >
                    <div className="text-center text-slate-400">
                      <p className="text-sm">Piesă indisponibilă</p>
                      <p className="text-xs mt-1">ID: {item.itemId}</p>
                    </div>
                    <div className="mt-auto flex justify-center">
                      <button
                        onClick={() => handleRemove(item.itemId)}
                        className="inline-flex items-center justify-center rounded-full border border-red-500/70 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Elimină
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={item.id} className="relative">
                  <ProductCard product={linkedItem} showWatchlistButton={false} />
                  {/* Bookmark-specific overlay */}
                  <div className="absolute top-2 right-2 z-20 flex gap-1">
                    <button
                      onClick={() => handleRemove(item.itemId)}
                      className="inline-flex items-center justify-center rounded-full bg-red-600/90 hover:bg-red-600 text-white p-2 text-xs font-semibold transition-colors shadow-lg"
                      title="Elimină din bookmark-uri"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  {/* Added date overlay */}
                  <div className="absolute bottom-2 left-2 z-20">
                    <span className="inline-flex items-center rounded-full bg-black/60 text-white px-2 py-1 text-xs font-medium backdrop-blur-sm">
                      Adăugat {item.addedAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );

              return null;
            })}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleClear}
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Golește lista
            </button>
          </div>
        </div>
      )}

      <div className="bg-navy-900/80 rounded-2xl border border-gold-500/30 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.8)]">
        <h3 className="text-lg font-semibold text-white mb-3">Continuă explorarea</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2 text-sm font-semibold text-[#000940] shadow-[0_0_24px_rgba(231,183,60,0.75)] hover:bg-[#f0c955] transition-colors"
          >
            Catalog piese
          </Link>
          <Link
            href="/auctions"
            className="inline-flex items-center justify-center rounded-full border border-[#e7b73c] px-6 py-2 text-sm font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
          >
            Licitații active
          </Link>
        </div>
      </div>
    </div>
  );
}
