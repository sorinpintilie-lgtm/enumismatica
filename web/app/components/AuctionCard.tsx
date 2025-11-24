'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import Link from 'next/link';
import { Auction, Product } from '../../../shared/types';
import { placeBid } from '../../../shared/auctionService';
import { useAuth } from '../context/AuthContext';
import { useProduct } from '../hooks/useProducts';
import { formatRON } from '../utils/currency';

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

  return <span className="text-sm font-medium text-red-600">{timeLeft}</span>;
}

function AuctionCard({ auction }: AuctionCardProps) {
  const [bidAmount, setBidAmount] = useState('');
  const { user } = useAuth();
  const [bidLoading, setBidLoading] = useState(false);
  const { product } = useProduct(auction.productId);

  const handleBid = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setBidLoading(true);
    try {
      const amount = parseFloat(bidAmount);
      await placeBid(auction.id, amount, user.uid);
      setBidAmount('');
    } catch (error) {
      console.error('Failed to place bid:', error);
    } finally {
      setBidLoading(false);
    }
  }, [auction.id, bidAmount, user]);

  const isEnded = new Date() > auction.endTime;
  const currentBid = auction.currentBid || auction.reservePrice;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="aspect-w-1 aspect-h-1 bg-gray-200">
        {product && product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name || 'Articol Licitație'}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gray-300 flex items-center justify-center">
            <span className="text-gray-500">Se încarcă...</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            Licitație #{auction.id.slice(-6)}
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            auction.status === 'active' ? 'bg-green-100 text-green-800' :
            auction.status === 'ended' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {auction.status.toUpperCase()}
          </span>
        </div>

        <div className="mb-3">
          <p className="text-sm text-gray-600">Licitație Curentă:</p>
          <p className="text-xl font-bold text-blue-600">{formatRON(currentBid)}</p>
        </div>

        <div className="mb-3">
          <p className="text-sm text-gray-600">Timp Rămas:</p>
          <CountdownTimer endTime={auction.endTime} />
        </div>

        {!isEnded && (
          <form onSubmit={handleBid} className="mb-3">
            <div className="flex space-x-2">
              <input
                type="number"
                step="0.01"
                min={Math.max(currentBid + 0.01, auction.reservePrice)}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Minim: ${formatRON(Math.max(currentBid + 0.01, auction.reservePrice))}`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <button
                type="submit"
                disabled={bidLoading || !user}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                {bidLoading ? '...' : user ? 'Licitează' : 'Autentificare'}
              </button>
            </div>
          </form>
        )}

        <Link
          href={`/auctions/${auction.id}`}
          className="block w-full text-center bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
        >
          Vezi Detalii
        </Link>
      </div>
    </div>
  );
}

export default memo(AuctionCard);