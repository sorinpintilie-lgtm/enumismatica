'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { logout } from 'shared/auth';
import { useRouter } from 'next/navigation';
import { useProducts } from '../hooks/useProducts';
import { useAuctions } from '../hooks/useAuctions';
import Link from 'next/link';
import { getUserCredits, boostProductWithCredits } from 'shared/creditService';
import { getUserAutoBidsForUser, cancelAutoBid } from 'shared/auctionService';
import { formatRON } from '../utils/currency';
import type { AutoBid, Auction } from 'shared/types';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { products } = useProducts(user?.uid);
  const { auctions } = useAuctions();
  const { useConversations } = require('../hooks/useChat');
  const { useCollection } = require('../hooks/useCollection');
  const { conversations, totalUnreadCount } = useConversations(user?.uid || null);
  const { items: collectionItems, stats: collectionStats } = useCollection(user?.uid || null);

  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  const [autoBids, setAutoBids] = useState<{ autoBid: AutoBid; auction: Auction | null }[]>([]);
  const [autoBidsLoading, setAutoBidsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCredits = async () => {
      if (!user?.uid) {
        if (isMounted) {
          setCredits(null);
        }
        return;
      }
      setCreditsLoading(true);
      setCreditsError(null);
      try {
        const value = await getUserCredits(user.uid);
        if (isMounted) {
          setCredits(value);
        }
      } catch (err) {
        console.error('Failed to load credits', err);
        if (isMounted) {
          setCreditsError('Nu s-au putut încărca creditele.');
        }
      } finally {
        if (isMounted) {
          setCreditsLoading(false);
        }
      }
    };

    loadCredits();

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    let isMounted = true;

    const loadAutoBids = async () => {
      if (!user?.uid) {
        if (isMounted) {
          setAutoBids([]);
        }
        return;
      }

      setAutoBidsLoading(true);
      try {
        const data = await getUserAutoBidsForUser(user.uid);
        if (isMounted) {
          setAutoBids(data);
        }
      } catch (err) {
        console.error('Failed to load user auto-bids', err);
      } finally {
        if (isMounted) {
          setAutoBidsLoading(false);
        }
      }
    };

    loadAutoBids();

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const handleBoostProduct = async (productId: string) => {
    if (!user?.uid) return;
    try {
      await boostProductWithCredits(user.uid, productId);
      // Credits and product boost fields will refresh via Firestore listeners
    } catch (err: any) {
      console.error('Failed to boost product', err);
      alert(err?.message || 'Nu s-a putut aplica boost-ul pentru acest produs.');
    }
  };

  const handleCancelAutoBidFromDashboard = async (auctionId: string) => {
    if (!user?.uid) return;

    const confirmed = window.confirm(
      'Ești sigur că vrei să anulezi licitarea automată pentru această licitație?',
    );
    if (!confirmed) return;

    try {
      await cancelAutoBid(auctionId, user.uid);
      setAutoBids((prev) => prev.filter((entry) => entry.autoBid.auctionId !== auctionId));
    } catch (err: any) {
      console.error('Failed to cancel auto-bid', err);
      alert(err?.message || 'Nu s-a putut anula licitarea automată pentru această licitație.');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          <p className="ml-4 text-slate-300">Se încarcă...</p>
        </div>
      </div>
    );
  }

  // Filter auctions where user is the owner (assuming we add ownerId to auctions later)
  const userAuctions = auctions.filter(auction => auction.currentBidderId === user.uid);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 rounded-3xl border border-gold-500/40 bg-gradient-to-r from-navy-700 via-navy-800 to-navy-900 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-400">
                Contul meu
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white">
                Bine ai revenit, {user.email}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Vezi rapid colecția ta, mesajele, licitațiile active și creditele disponibile pentru boost-uri.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              {user && (
                <div className="rounded-2xl border border-gold-500/60 bg-navy-900/60 px-4 py-3 text-sm text-slate-100 shadow-[0_10px_40px_rgba(231,183,60,0.25)] max-w-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-400">
                    Link de invitație
                  </p>
                  <p className="mt-1 break-all text-xs">
                    {typeof window !== 'undefined'
                      ? `${window.location.origin}/register?ref=${user.uid}`
                      : `/register?ref=${user.uid}`}
                  </p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2 text-sm font-semibold text-navy-900 shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.7)] transition hover:bg-[#f0c955]"
              >
                Deconectare
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-gold-400 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Creditele Mele</h3>
              <svg className="w-8 h-8 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11.93A5.001 5.001 0 0110 5a5 5 0 011 9.93z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gold-300">
              {creditsLoading ? '—' : credits ?? 0}
            </p>
            <p className="text-sm text-slate-200">Credite disponibile pentru boost-uri și recompense</p>
            {creditsError && (
              <p className="text-xs text-red-300 mt-1">{creditsError}</p>
            )}
          </div>

          <Link href="/collection" className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-gold-400 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Colecția Mea</h3>
              <svg className="w-8 h-8 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gold-300">{collectionItems?.length || 0}</p>
            <p className="text-sm text-slate-200">Articole în colecție</p>
            {collectionStats && collectionStats.totalValue > 0 && (
              <p className="text-sm text-gold-200 mt-1 font-semibold">Valoare: {formatRON(collectionStats.totalValue)}</p>
            )}
          </Link>

          <Link href="/messages" className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-gold-400 transition-all relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Mesaje</h3>
              <svg className="w-8 h-8 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gold-300">{conversations?.length || 0}</p>
            <p className="text-sm text-slate-200">Conversații active</p>
            {totalUnreadCount > 0 && (
              <>
                <p className="text-sm text-gold-200 mt-1 font-semibold">{totalUnreadCount} necitite</p>
                <span className="absolute top-4 right-4 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-gold-600 rounded-full">
                  {totalUnreadCount}
                </span>
              </>
            )}
          </Link>

          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-gold-400 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Produsele Mele</h3>
              <svg className="w-8 h-8 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gold-300">{products.length}</p>
            <p className="text-sm text-slate-200">Listate pentru vânzare</p>
          </div>

          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-gold-400 transition-all">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Licitații Active</h3>
              <svg className="w-8 h-8 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gold-300">{userAuctions.length}</p>
            <p className="text-sm text-slate-200">Licitații la care participi</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-gold-500 to-gold-600 rounded-2xl shadow-[0_20px_60px_rgba(231,183,60,0.3)] p-6 mb-8 border border-gold-400">
          <h2 className="text-xl font-semibold text-navy-900 mb-4">Acțiuni Rapide</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/collection"
              className="bg-[#e7b73c] hover:bg-[#f0c955] text-white px-4 py-3 rounded-xl text-center font-semibold transition-all shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.5)]"
            >
              Colecția Mea
            </Link>
            <Link
              href="/messages"
              className="relative bg-[#e7b73c] hover:bg-[#f0c955] text-white px-4 py-3 rounded-xl text-center font-semibold transition-all shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.5)]"
            >
              Mesaje
              {totalUnreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-navy-900 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {totalUnreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/products"
              className="bg-[#e7b73c] hover:bg-[#f0c955] text-white px-4 py-3 rounded-xl text-center font-semibold transition-all shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.5)]"
            >
              Magazin
            </Link>
            <Link
              href="/auctions"
              className="bg-[#e7b73c] hover:bg-[#f0c955] text-white px-4 py-3 rounded-xl text-center font-semibold transition-all shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.5)]"
            >
              Licitații
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Products */}
          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-gold-400 transition-all">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Produsele mele</h2>
              <Link
                href="/products/new"
                className="bg-[#e7b73c] hover:bg-[#f0c955] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.6)] transition-colors"
              >
                Adaugă produs
              </Link>
            </div>

            {products.length === 0 ? (
              <p className="text-slate-200">Niciun produs listat încă.</p>
            ) : (
              <div className="space-y-3">
                {products.slice(0, 5).map((product) => {
                  const isBoostActive =
                    product.boostExpiresAt instanceof Date
                      ? product.boostExpiresAt.getTime() > Date.now()
                      : false;

                  return (
                    <div key={product.id} className="flex justify-between items-center p-3 bg-navy-900/40 rounded-xl border border-gold-500/20">
                      <div>
                        <p className="font-medium text-white">{product.name}</p>
                        <p className="text-sm text-gold-300 font-semibold">{formatRON(product.price)}</p>
                        {isBoostActive && (
                          <p className="mt-1 text-xs font-semibold text-emerald-300">
                            Boost activ – produsul tău este evidențiat în listări
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={() => handleBoostProduct(product.id)}
                          disabled={isBoostActive}
                          className="text-xs font-semibold px-3 py-1 rounded-full border border-gold-500 text-gold-300 hover:bg-gold-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isBoostActive ? 'Boost activ' : 'Boost vizibilitate'}
                        </button>
                        <Link
                          href={`/products/${product.id}`}
                          className="text-gold-300 hover:text-gold-200 text-sm font-semibold"
                        >
                          Vezi
                        </Link>
                      </div>
                    </div>
                  );
                })}
                {products.length > 5 && (
                  <p className="text-sm text-slate-200 text-center">
                    Și încă {products.length - 5}...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* My Auction Activity */}
          <div className="bg-gradient-to-br from-navy-600 to-navy-800 backdrop-blur-sm p-6 rounded-2xl border border-gold-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-gold-400 transition-all">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Activitatea mea la licitații</h2>
              <Link
                href="/auctions"
                className="text-gold-300 hover:text-gold-200 text-sm font-semibold"
              >
                Vezi toate
              </Link>
            </div>

            {userAuctions.length === 0 ? (
              <p className="text-slate-200">Nicio licitație activă.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {userAuctions.slice(0, 5).map((auction) => (
                  <div
                    key={auction.id}
                    className="flex justify-between items-center p-3 bg-navy-900/40 rounded-xl border border-gold-500/20"
                  >
                    <div>
                      <p className="font-medium text-white">Licitație #{auction.id.slice(-6)}</p>
                      <p className="text-sm text-gold-300 font-semibold">
                        Licitație curentă:{' '}
                        {formatRON(auction.currentBid ?? auction.reservePrice)}
                      </p>
                    </div>
                    <Link
                      href={`/auctions/${auction.id}`}
                      className="text-gold-300 hover:text-gold-200 text-sm font-semibold"
                    >
                      Vezi
                    </Link>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 border-t border-gold-500/30 pt-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Licitările mele automate
              </h3>
              {autoBidsLoading ? (
                <div className="flex items-center gap-2 text-slate-200 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gold-500"></div>
                  <span>Se încarcă licitările automate...</span>
                </div>
              ) : autoBids.length === 0 ? (
                <p className="text-slate-200 text-sm">
                  Nu ai setat încă nicio licitare automată.
                </p>
              ) : (
                <div className="space-y-3">
                  {autoBids.slice(0, 5).map(({ autoBid, auction }) => (
                    <div
                      key={`${autoBid.auctionId}-${autoBid.id}`}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 bg-navy-900/40 rounded-xl border border-gold-500/20"
                    >
                      <div>
                        <p className="font-medium text-white">
                          Licitație #{auction ? auction.id.slice(-6) : autoBid.auctionId.slice(-6)}
                        </p>
                        <p className="text-sm text-gold-300 font-semibold">
                          Până la: {formatRON(autoBid.maxAmount)}
                        </p>
                        {auction && (
                          <p className="text-xs text-slate-300">
                            Status:{' '}
                            <span className="font-semibold">
                              {auction.status.toUpperCase()}
                            </span>{' '}
                            &mdash; se încheie la {auction.endTime.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {auction && (
                          <Link
                            href={`/auctions/${auction.id}`}
                            className="text-gold-300 hover:text-gold-200 text-xs font-semibold"
                          >
                            Vezi licitația
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCancelAutoBidFromDashboard(autoBid.auctionId)}
                          className="inline-flex items-center justify-center rounded-full border border-red-500/70 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/10 transition-colors"
                        >
                          Anulează
                        </button>
                      </div>
                    </div>
                  ))}
                  {autoBids.length > 5 && (
                    <p className="text-xs text-slate-300">
                      Și încă {autoBids.length - 5} licitări automate active...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
