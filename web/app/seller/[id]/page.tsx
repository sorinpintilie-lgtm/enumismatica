'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useProducts } from '../../hooks/useProducts';
import { useAuctions } from '../../hooks/useAuctions';
import ProductCard from '../../components/ProductCard';
import AuctionCard from '../../components/AuctionCard';

type SellerTab = 'products' | 'auctions';

export default function SellerPage() {
  const params = useParams();
  const sellerId = params.id as string;
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as SellerTab) === 'auctions' ? 'auctions' : 'products';

  const { user, loading: authLoading } = useAuth();

  const { profile, loading: profileLoading, error: profileError } = useUserProfile(
    sellerId,
    !!user && !authLoading,
  );

  const {
    products,
    loading: productsLoading,
    error: productsError,
    hasMore: productsHasMore,
    loadMore: loadMoreProducts,
  } = useProducts(
    sellerId,
    20,
    ['name', 'images', 'price', 'createdAt', 'updatedAt', 'boostExpiresAt', 'boostedAt'],
    !!user && !authLoading,
    'direct',
    false,
  );

  const {
    auctions,
    loading: auctionsLoading,
    error: auctionsError,
    hasMore: auctionsHasMore,
    loadMore: loadMoreAuctions,
  } = useAuctions(
    undefined,
    20,
    [
      'productId',
      'startTime',
      'endTime',
      'reservePrice',
      'currentBid',
      'currentBidderId',
      'status',
      'buyNowPrice',
      'buyNowUsed',
      'createdAt',
      'updatedAt',
      'ownerId',
    ],
    !!user && !authLoading,
    sellerId,
  );

  const [directCount, setDirectCount] = useState<number | null>(null);
  const [auctionCount, setAuctionCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCounts = async () => {
      if (!db || !sellerId || !user || authLoading) {
        setDirectCount(null);
        setAuctionCount(null);
        return;
      }

      try {
        const base = query(
          collection(db, 'products'),
          where('status', '==', 'approved'),
          where('ownerId', '==', sellerId),
        );
        const qDirect = query(base, where('listingType', '==', 'direct'));
        const qAuction = query(base, where('listingType', '==', 'auction'));

        const [directSnap, auctionSnap] = await Promise.all([
          getCountFromServer(qDirect),
          getCountFromServer(qAuction),
        ]);

        if (cancelled) return;
        setDirectCount(directSnap.data().count);
        setAuctionCount(auctionSnap.data().count);
      } catch (err) {
        console.error('[SellerPage] Failed to load counts', err);
        if (!cancelled) {
          setDirectCount(null);
          setAuctionCount(null);
        }
      }
    };

    loadCounts();

    return () => {
      cancelled = true;
    };
  }, [sellerId, user, authLoading]);

  const sellerName = useMemo(() => {
    return (
      profile?.displayName ||
      profile?.name ||
      (sellerId ? `Vânzător #${sellerId.slice(-6)}` : 'Vânzător')
    );
  }, [profile?.displayName, profile?.name, sellerId]);

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          <p className="ml-4 text-slate-300">Se verifică sesiunea de utilizator...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-[#e7b73c]/40 bg-navy-900/80 p-8 text-center shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
          <h1 className="text-2xl font-bold text-white mb-3">Profilul vânzătorului este disponibil doar pentru utilizatori autentificați</h1>
          <p className="text-sm text-slate-300 mb-5">
            Autentifică-te pentru a vedea toate produsele și licitațiile acestui vânzător.
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
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="rounded-2xl border border-gold-500/25 bg-navy-900/70 p-6 shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-navy-800/60 border border-gold-500/25 overflow-hidden flex items-center justify-center">
                {profile?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar} alt={sellerName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-gold-300 font-bold text-xl">{sellerName.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{sellerName}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-gold-500/25 bg-navy-950/40 px-2.5 py-1">
                    ID: <span className="font-mono text-slate-100">{sellerId}</span>
                  </span>
                  {profile?.idVerificationStatus === 'verified' && (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-900/25 px-2.5 py-1 text-emerald-200">
                      Identitate verificată
                    </span>
                  )}
                  {!!profile?.createdAt && (
                    <span className="rounded-full border border-slate-500/25 bg-navy-950/40 px-2.5 py-1">
                      Membru din {profile.createdAt.toLocaleDateString()}
                    </span>
                  )}
                </div>
                {(profileLoading || profileError) && (
                  <p className="mt-2 text-xs text-slate-400">
                    {profileLoading ? 'Se încarcă profilul…' : `Eroare profil: ${profileError}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-slate-400">Produse</p>
                <p className="text-lg font-bold text-gold-300">{directCount ?? '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Licitații</p>
                <p className="text-lg font-bold text-gold-300">{auctionCount ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={`/seller/${sellerId}?tab=products`}
              className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold border transition-colors ${
                tab === 'products'
                  ? 'bg-[#e7b73c] text-[#000940] border-[#e7b73c] shadow-[0_0_18px_rgba(231,183,60,0.65)]'
                  : 'bg-navy-950/20 text-slate-200 border-gold-500/25 hover:bg-navy-800/50'
              }`}
            >
              Produse
            </Link>
            <Link
              href={`/seller/${sellerId}?tab=auctions`}
              className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold border transition-colors ${
                tab === 'auctions'
                  ? 'bg-[#e7b73c] text-[#000940] border-[#e7b73c] shadow-[0_0_18px_rgba(231,183,60,0.65)]'
                  : 'bg-navy-950/20 text-slate-200 border-gold-500/25 hover:bg-navy-800/50'
              }`}
            >
              Licitații
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="mt-8">
          {tab === 'products' ? (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Produse</h2>
                {productsHasMore && (
                  <button
                    type="button"
                    onClick={loadMoreProducts}
                    className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-navy-800/60 px-4 py-2 text-sm font-semibold text-gold-200 hover:bg-navy-800"
                    disabled={productsLoading}
                  >
                    {productsLoading ? 'Se încarcă…' : 'Încarcă mai multe'}
                  </button>
                )}
              </div>

              {productsError && (
                <div className="rounded-2xl border border-red-500/30 bg-navy-900/80 p-6 text-red-100">
                  Eroare la încărcarea produselor: {productsError}
                </div>
              )}

              {!productsLoading && !productsError && products.length === 0 && (
                <div className="rounded-2xl border border-gold-500/20 bg-navy-900/60 p-8 text-center">
                  <p className="text-slate-300">Acest vânzător nu are produse listate momentan.</p>
                </div>
              )}

              {products.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Licitații</h2>
                {auctionsHasMore && (
                  <button
                    type="button"
                    onClick={loadMoreAuctions}
                    className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-navy-800/60 px-4 py-2 text-sm font-semibold text-gold-200 hover:bg-navy-800"
                    disabled={auctionsLoading}
                  >
                    {auctionsLoading ? 'Se încarcă…' : 'Încarcă mai multe'}
                  </button>
                )}
              </div>

              {auctionsError && (
                <div className="rounded-2xl border border-red-500/30 bg-navy-900/80 p-6 text-red-100">
                  Eroare la încărcarea licitațiilor: {auctionsError}
                </div>
              )}

              {!auctionsLoading && !auctionsError && auctions.length === 0 && (
                <div className="rounded-2xl border border-gold-500/20 bg-navy-900/60 p-8 text-center">
                  <p className="text-slate-300">Acest vânzător nu are licitații listate momentan.</p>
                </div>
              )}

              {auctions.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {auctions.map((a) => (
                    <AuctionCard key={a.id} auction={a} showWatchlistButton={true} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

