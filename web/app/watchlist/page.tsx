'use client';

import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../hooks/useWatchlist';
import { useProducts } from '../hooks/useProducts';
import { useAuctions } from '../hooks/useAuctions';
import Link from 'next/link';
import { useMemo } from 'react';

export default function WatchlistPage() {
  const { user } = useAuth();
  const { watchlist, loading, error, removeFromWatchlist, clearWatchlist } = useWatchlist();
  const {
    products,
    loading: productsLoading,
  } = useProducts(
    undefined,
    200,
  );
  const { auctions, loading: auctionsLoading } = useAuctions();

  const watchlistWithItems = useMemo(() => {
    return watchlist.map((item) => {
      let linkedItem = null;
      if (item.itemType === 'product') {
        linkedItem = products.find((p) => p.id === item.itemId);
      } else if (item.itemType === 'auction') {
        linkedItem = auctions.find((a) => a.id === item.itemId);
      }
      return { ...item, linkedItem };
    });
  }, [watchlist, products, auctions]);

  const handleRemove = async (itemId: string) => {
    if (confirm('Ești sigur că vrei să elimini acest articol din lista de urmărire?')) {
      await removeFromWatchlist(itemId);
    }
  };

  const handleClear = async () => {
    if (!watchlist.length) return;
    if (confirm('Ești sigur că vrei să golești întreaga listă de urmărire?')) {
      await clearWatchlist();
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
          <h1 className="text-3xl font-bold text-[#e7b73c] mb-1">Lista mea de urmărire</h1>
          {loading ? (
            <p className="text-slate-300">Se încarcă...</p>
          ) : isEmpty ? (
            <p className="text-slate-300">Lista ta de urmărire este goală.</p>
          ) : (
            <p className="text-slate-300">
              Ai {watchlistWithItems.length} {watchlistWithItems.length === 1 ? 'articol' : 'articole'} urmărite.
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
        <div className="bg-navy-900/80 rounded-2xl border border-gold-500/30 p-6 mb-6 shadow-[0_14px_40px_rgba(0,0,0,0.8)]">
          <div className="space-y-4">
            {watchlistWithItems.map((item) => {
              const { linkedItem } = item;
              let title = '';
              let price = '';
              let linkHref = '';
              let typeLabel = '';

              if (item.itemType === 'product' && linkedItem) {
                title = linkedItem.name || `Produs ${item.itemId}`;
                price = typeof linkedItem.price === 'number' ? `${linkedItem.price.toFixed(2)} RON` : '';
                linkHref = `/products/${item.itemId}`;
                typeLabel = 'Produs';
              } else if (item.itemType === 'auction' && linkedItem) {
                title = `Auction #${linkedItem.id.slice(-6)}`;
                const currentBid = linkedItem.currentBid || linkedItem.reservePrice;
                price = `${currentBid.toFixed(2)} RON`;
                linkHref = `/auctions/${item.itemId}`;
                typeLabel = 'Licitație';
              } else {
                title = `${item.itemType} ${item.itemId}`;
                linkHref = item.itemType === 'product' ? `/products/${item.itemId}` : `/auctions/${item.itemId}`;
                typeLabel = item.itemType === 'product' ? 'Produs' : 'Licitație';
              }

              return (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row gap-4 rounded-2xl border border-gold-500/30 bg-navy-950 p-4"
                >
                  <div className="flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center rounded-full bg-blue-500/15 text-blue-300 border border-blue-400/40 px-2 py-1 text-xs font-semibold uppercase tracking-wide">
                          {typeLabel}
                        </span>
                      </div>
                      <h2 className="text-sm sm:text-base font-semibold text-white mb-1 line-clamp-2">
                        {title}
                      </h2>
                      {price && (
                        <p className="text-sm font-semibold text-green-400">
                          {price}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-slate-400 mt-1">
                          Notă: {item.notes}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">
                        Adăugat la {item.addedAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={linkHref}
                        className="inline-flex items-center justify-center rounded-full border border-[#e7b73c]/70 px-3 py-1 text-xs font-semibold text-[#e7b73c] hover:bg-[#e7b73c]/10 transition-colors"
                      >
                        Vezi detaliile
                      </Link>
                      <button
                        onClick={() => handleRemove(item.itemId)}
                        className="inline-flex items-center justify-center rounded-full border border-red-500/70 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Elimină
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-center">
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
            Catalog produse
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