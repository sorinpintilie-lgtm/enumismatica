'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import Link from 'next/link';
import { Auction, Product } from 'shared/types';
import { placeBid } from 'shared/auctionService';
import { useAuth } from '../context/AuthContext';
import { useProduct } from '../hooks/useProducts';
import { formatEUR } from '../utils/currency';
import { useToast } from './ToastProvider';
import { WatchlistButton } from './WatchlistButton';
import { logEvent } from '../hooks/useActivityLogger';
import OfferModal from './OfferModal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AuctionCardProps {
  auction: Auction;
  showWatchlistButton?: boolean;
  variant?: 'grid' | 'list';
}

function CountdownTimer({ endTime }: { endTime: Date }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime.getTime() - now;

      if (distance < 0) {
        setTimeLeft('ÎNCHEIATĂ');
        clearInterval(timer);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  return <span className="text-sm font-medium text-[#e7b73c]">{timeLeft}</span>;
}

function AuctionCard({ auction, showWatchlistButton = true, variant = 'grid' }: AuctionCardProps) {
  const [bidAmount, setBidAmount] = useState('');
  const { user } = useAuth();
  const [bidLoading, setBidLoading] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const { product } = useProduct(auction.productId);
  const { showToast } = useToast();

  const [sellerName, setSellerName] = useState<string | null>(null);
  const [sellerVerified, setSellerVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadSeller = async () => {
      if (!db || !auction.ownerId) return;
      try {
        const snap = await getDoc(doc(db, 'users', auction.ownerId));
        if (!snap.exists()) return;
        const data = snap.data() as any;
        if (cancelled) return;
        setSellerName(data.displayName || data.name || data.email || `Vânzător #${auction.ownerId.slice(-6)}`);
        setSellerVerified(data.idVerificationStatus === 'verified');
      } catch (err) {
        console.error('Failed to load auction seller', err);
      }
    };

    setSellerName(null);
    setSellerVerified(false);
    loadSeller();
    return () => {
      cancelled = true;
    };
  }, [auction.ownerId]);

  const isUserHighestBidder = !!user && auction.currentBidderId === user.uid;
  const isEnded = new Date() > auction.endTime;
  const currentBid = auction.currentBid || auction.reservePrice;

  const canBuyNow =
    !isEnded &&
    auction.status === 'active' &&
    typeof auction.buyNowPrice === 'number' &&
    auction.buyNowPrice > 0 &&
    !auction.buyNowUsed;

  const handleBid = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast({
        type: 'error',
        title: 'Autentificare necesară',
        message: 'Trebuie să te autentifici pentru a plasa o licitație.',
      });
      return;
    }

    setBidLoading(true);
    try {
      const amount = parseFloat(bidAmount);
      await placeBid(auction.id, amount, user.uid);
      await logEvent(user, 'auction_bid', {
        auctionId: auction.id,
        bidAmount: amount,
        source: 'auction_card',
      });
      setBidAmount('');
      showToast({
        type: 'success',
        title: 'Licitație plasată',
        message: 'Oferta ta a fost înregistrată. Dacă ești licitatorul cu oferta cea mai mare, vei vedea acest lucru evidențiat.',
      });
    } catch (error) {
      console.error('Failed to place bid:', error);
      const message =
        error instanceof Error ? error.message : 'A apărut o eroare la plasarea licitației.';
      showToast({
        type: 'error',
        title: 'Eroare la licitare',
        message,
      });
    } finally {
      setBidLoading(false);
    }
  }, [auction.id, bidAmount, user, showToast, logEvent]);

  if (variant === 'list') {
    return (
      <div
        className={`group relative flex gap-4 p-4 rounded-xl border border-[#e7b73c]/40 bg-gradient-to-r from-navy-700 via-navy-800 to-navy-950 shadow-[0_8px_25px_rgba(231,183,60,0.2)] hover:border-[#e7b73c] hover:shadow-[0_12px_35px_rgba(231,183,60,0.35)] transition-all duration-300 w-full ${
          isUserHighestBidder ? 'ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-navy-900' : ''
        }`}
      >
        {/* Image */}
        <Link href={`/auctions/${auction.id}`} className="relative w-32 h-24 flex-shrink-0 bg-white rounded-lg overflow-hidden">
          {product && product.images && product.images.length > 0 ? (
            <img
              src={`${product.images[0]}?width=200`}
              alt={product.name || 'Piesă Licitație'}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
              <span className="text-slate-400 text-xs">Se încarcă...</span>
            </div>
          )}
          {product && product.images && product.images.length > 1 && (
            <span className="absolute bottom-1 left-1 z-10 rounded-full bg-navy-950/80 px-2 py-0.5 text-[10px] font-semibold text-slate-100 border border-gold-500/30">
              Alte poze
            </span>
          )}
          <span
            className={`absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wide ${
              auction.status === 'active'
                ? 'bg-[#e7b73c]/90 text-[#000940]'
                : auction.status === 'ended'
                ? 'bg-red-900/90 text-red-200'
                : 'bg-slate-800/90 text-slate-100'
            }`}
          >
            {auction.status.toUpperCase()}
          </span>
        </Link>
        
        {/* Content */}
        <div className="flex-1 min-w-0 relative">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-semibold text-white line-clamp-1" title={product?.name || 'Licitație'}>
                {product?.name || `Licitație #${auction.id.slice(-6)}`}
              </h3>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <p className="text-xs text-slate-400">Licitație #{auction.id.slice(-6)}</p>
                {auction.ownerId && (
                  <p className="text-xs text-slate-300">
                    Vânzător:{' '}
                    <Link
                      href={`/seller/${auction.ownerId}`}
                      className="font-semibold text-gold-300 hover:text-gold-200"
                      title={auction.ownerId}
                    >
                      {sellerName || `#${auction.ownerId.slice(-6)}`}
                    </Link>
                    <span className="ml-2 font-mono text-[10px] text-slate-400">ID: {auction.ownerId.slice(-6)}</span>
                  </p>
                )}
                {sellerVerified && (
                  <span className="inline-flex items-center rounded-full border border-emerald-400/60 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                    VERIFICAT
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-300">Preț curent</p>
              <p className="text-xl font-bold text-[#e7b73c]">
                {formatEUR(currentBid)}
              </p>
            </div>
          </div>
          {showWatchlistButton && (
            <div className="absolute top-2 right-2 z-10">
              <WatchlistButton
                itemType="auction"
                itemId={auction.id}
                size="small"
              />
            </div>
          )}
          
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>⏰ <CountdownTimer endTime={auction.endTime} /></span>
              {canBuyNow && (
                <span className="text-emerald-300">💰 {formatEUR(auction.buyNowPrice as number)}</span>
              )}
            </div>
            
            <Link
              href={`/auctions/${auction.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-[#e7b73c] px-3 py-1.5 text-xs font-semibold text-[#000940] shadow-lg shadow-[0_0_15px_rgba(231,183,60,0.6)] transition hover:-translate-y-0.5 hover:bg-[#f0c955]"
            >
              Detalii
              <span aria-hidden>→</span>
            </Link>
          </div>
          
          {user && (
            <p className={`text-xs ${
              isUserHighestBidder ? 'text-emerald-300' : 'text-slate-400'
            }`}>
              {isUserHighestBidder
                ? '✓ Ești licitatorul cu oferta cea mai mare'
                : auction.currentBidderId
                ? 'Alt utilizator are oferta cea mai mare'
                : 'Încă nu există oferte peste prețul de rezervă'}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Grid variant (original layout)
  return (
    <div
      className={`group relative h-full flex flex-col bg-gradient-to-br from-navy-600 via-navy-800 to-navy-950 rounded-2xl border border-[#e7b73c]/40 shadow-[0_18px_55px_rgba(0,0,0,0.9)] overflow-hidden hover:border-[#e7b73c] hover:shadow-[0_26px_70px_rgba(231,183,60,0.55)] transition-all duration-300 ${
        isUserHighestBidder ? 'ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-navy-900' : ''
      }`}
    >
      <Link href={`/auctions/${auction.id}`} className="relative aspect-[4/3] bg-white">
        {product && product.images && product.images.length > 0 ? (
            <img
              src={`${product.images[0]}?width=400`}
              alt={product.name || 'Piesă Licitație'}
              className="w-full h-full object-contain"
            />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center">
            <span className="text-slate-400">Se încarcă...</span>
          </div>
        )}
        {product && product.images && product.images.length > 1 && (
          <span className="absolute bottom-2 left-2 z-10 rounded-full bg-navy-950/80 px-2.5 py-1 text-[10px] font-semibold text-slate-100 border border-gold-500/30">
            Alte poze
          </span>
        )}
      </Link>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-lg font-semibold text-white truncate">
            Licitație #{auction.id.slice(-6)}
          </h3>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${
              auction.status === 'active'
                ? 'bg-[#e7b73c]/20 text-[#e7b73c] border border-[#e7b73c]/60'
                : auction.status === 'ended'
                ? 'bg-red-900/60 text-red-200 border border-red-500/40'
                : 'bg-slate-800 text-slate-100 border border-slate-500/40'
            }`}
          >
            {auction.status.toUpperCase()}
          </span>
        </div>

        {auction.ownerId && (
          <div className="-mt-1 flex flex-wrap items-center gap-2">
            <p className="text-xs text-slate-300">
              Vânzător:{' '}
              <Link
                href={`/seller/${auction.ownerId}`}
                className="font-semibold text-gold-300 hover:text-gold-200"
                title={auction.ownerId}
              >
                {sellerName || `#${auction.ownerId.slice(-6)}`}
              </Link>
              <span className="ml-2 font-mono text-[10px] text-slate-400">ID: {auction.ownerId.slice(-6)}</span>
            </p>
            {sellerVerified && (
              <span className="inline-flex items-center rounded-full border border-emerald-400/60 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                VERIFICAT
              </span>
            )}
          </div>
        )}

        <div className="mb-1">
          <p className="text-xs uppercase tracking-wide text-slate-300">Licitație Curentă</p>
          <p className="text-2xl font-extrabold text-[#e7b73c] drop-shadow-[0_0_18px_rgba(231,183,60,0.6)]">
            {formatEUR(currentBid)}
          </p>
          {user && (
            <p
              className={`mt-1 text-xs font-medium ${
                isUserHighestBidder ? 'text-emerald-300' : 'text-slate-400'
              }`}
            >
              {isUserHighestBidder
                ? 'În acest moment ești licitatorul cu oferta cea mai mare pentru această licitație.'
                : auction.currentBidderId
                ? 'În acest moment alt utilizator are oferta cea mai mare.'
                : 'Încă nu există oferte peste prețul de rezervă.'}
            </p>
          )}
        </div>

        <div className="mb-2">
          <p className="text-xs uppercase tracking-wide text-slate-300">Timp Rămas</p>
          <CountdownTimer endTime={auction.endTime} />
        </div>

        {canBuyNow && (
          <div className="mb-2">
            <p className="text-[11px] uppercase tracking-wide text-emerald-300">Cumpără acum</p>
            <p className="text-sm font-semibold text-emerald-300">
              {formatEUR(auction.buyNowPrice as number)}
            </p>
          </div>
        )}

        {!isEnded && (
          <form onSubmit={handleBid} className="mb-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="number"
                step="0.01"
                min={Math.max(currentBid + 0.01, auction.reservePrice)}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Minim: ${formatEUR(Math.max(currentBid + 0.01, auction.reservePrice))}`}
                className="flex-1 px-3 py-2 rounded-md border border-[#e7b73c]/35 bg-navy-900/70 text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent text-sm"
                required
              />
              <button
                type="submit"
                disabled={bidLoading || !user}
                className="w-full sm:w-auto bg-[#e7b73c] hover:bg-[#f0c955] disabled:bg-[#e7b73c]/50 text-[#000940] px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-200 shadow-[0_0_20px_rgba(231,183,60,0.7)]"
              >
                {bidLoading ? '...' : user ? 'Licitează' : 'Autentificare'}
              </button>
            </div>
          </form>
        )}

        <div className="flex gap-2 mt-1">
          {user && user.uid !== auction.ownerId && auction.status === 'active' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOfferModal(true);
              }}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-md text-sm font-semibold transition-colors duration-200"
            >
              Fă o ofertă
            </button>
          )}
          <Link
            href={`/auctions/${auction.id}`}
            className="flex-1 text-center bg-[#e7b73c] hover:bg-[#f0c955] text-[#000940] px-4 py-2.5 rounded-md text-sm font-semibold transition-colors duration-200 shadow-[0_0_24px_rgba(231,183,60,0.75)]"
          >
            Detalii
          </Link>
        </div>
      </div>
      {showWatchlistButton && (
        <div className="absolute top-2 right-2 z-10">
          <WatchlistButton
            itemType="auction"
            itemId={auction.id}
            size="small"
          />
        </div>
      )}

      <OfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        itemType="auction"
        itemId={auction.id}
        itemName={product?.name || `Licitație #${auction.id.slice(-6)}`}
        currentPrice={currentBid}
        buyerId={user?.uid || ''}
      />
    </div>
  );
}

export default memo(AuctionCard);
