'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import Link from 'next/link';
import { Auction, Product } from 'shared/types';
import { placeBid } from 'shared/auctionService';
import { useAuth } from '../context/AuthContext';
import { useProduct } from '../hooks/useProducts';
import { formatRON } from '../utils/currency';
import { useToast } from './ToastProvider';

interface AuctionCardProps {
  auction: Auction;
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

function AuctionCard({ auction }: AuctionCardProps) {
  const [bidAmount, setBidAmount] = useState('');
  const { user } = useAuth();
  const [bidLoading, setBidLoading] = useState(false);
  const { product } = useProduct(auction.productId);
  const { showToast } = useToast();

  const isUserHighestBidder = !!user && auction.currentBidderId === user.uid;

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
  }, [auction.id, bidAmount, user, showToast]);

  const isEnded = new Date() > auction.endTime;
  const currentBid = auction.currentBid || auction.reservePrice;

  return (
    <div
      className={`group h-full flex flex-col bg-gradient-to-br from-navy-600 via-navy-800 to-navy-950 rounded-2xl border border-[#e7b73c]/40 shadow-[0_18px_55px_rgba(0,0,0,0.9)] overflow-hidden hover:border-[#e7b73c] hover:shadow-[0_26px_70px_rgba(231,183,60,0.55)] transition-all duration-300 ${
        isUserHighestBidder ? 'ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-navy-900' : ''
      }`}
    >
      <div className="relative aspect-[4/3] bg-white">
        {product && product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name || 'Articol Licitație'}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center">
            <span className="text-slate-400">Se încarcă...</span>
          </div>
        )}
      </div>
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

        <div className="mb-1">
          <p className="text-xs uppercase tracking-wide text-slate-300">Licitație Curentă</p>
          <p className="text-2xl font-extrabold text-[#e7b73c] drop-shadow-[0_0_18px_rgba(231,183,60,0.6)]">
            {formatRON(currentBid)}
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

        {!isEnded && (
          <form onSubmit={handleBid} className="mb-2">
            <div className="flex space-x-2">
              <input
                type="number"
                step="0.01"
                min={Math.max(currentBid + 0.01, auction.reservePrice)}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Minim: ${formatRON(Math.max(currentBid + 0.01, auction.reservePrice))}`}
                className="flex-1 px-3 py-2 rounded-md border border-[#e7b73c]/35 bg-navy-900/70 text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent text-sm"
                required
              />
              <button
                type="submit"
                disabled={bidLoading || !user}
                className="bg-[#e7b73c] hover:bg-[#f0c955] disabled:bg-[#e7b73c]/50 text-[#000940] px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-200 shadow-[0_0_20px_rgba(231,183,60,0.7)]"
              >
                {bidLoading ? '...' : user ? 'Licitează' : 'Autentificare'}
              </button>
            </div>
          </form>
        )}

        <Link
          href={`/auctions/${auction.id}`}
          className="block w-full text-center mt-1 bg-[#e7b73c] hover:bg-[#f0c955] text-[#000940] px-4 py-2.5 rounded-md text-sm font-semibold transition-colors duration-200 shadow-[0_0_24px_rgba(231,183,60,0.75)]"
        >
          Vezi Detalii
        </Link>
      </div>
    </div>
  );
}

export default memo(AuctionCard);
