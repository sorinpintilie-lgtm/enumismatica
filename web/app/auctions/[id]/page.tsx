'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { useAuction } from '../../hooks/useAuctions';
import { useBids } from '../../hooks/useBids';
import { placeBid, setAutoBid } from '../../../../shared/auctionService';
import { useAuth } from '../../context/AuthContext';
import AuctionChat from '../../components/AuctionChat';
import { useProduct } from '../../hooks/useProducts';
import PriceEvolutionChart from '../../components/PriceEvolutionChart';
import { formatRON } from '../../utils/currency';

const bidSchema = z.object({
  amount: z.number().positive('Bid amount must be positive'),
});

function CountdownTimer({ endTime }: { endTime: Date }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime.getTime() - now;

      if (distance < 0) {
        setTimeLeft('LICITAȚIE ÎNCHEIATĂ');
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

  return <span className="text-2xl font-bold text-red-600">{timeLeft}</span>;
}

export default function AuctionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { auction, loading, error } = useAuction(id);
  const { bids } = useBids(id);
  const { user } = useAuth();
  const [bidAmount, setBidAmount] = useState('');
  const [autoBidAmount, setAutoBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [showChat, setShowChat] = useState(true);
  
  // Fetch product details to check ownership
  const { product } = useProduct(auction?.productId || '');
  const isOwner = product?.ownerId === user?.uid;

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auction) return;

    setBidError('');
    setBidLoading(true);

    try {
      const amount = parseFloat(bidAmount);
      bidSchema.parse({ amount });
      if (amount < minBid) {
        throw new Error(`Licitația trebuie să fie cel puțin ${formatRON(minBid)}`);
      }
      await placeBid(id, amount, user.uid);
      setBidAmount('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        setBidError(error.issues[0].message);
      } else {
        setBidError(error instanceof Error ? error.message : 'Eroare la plasarea licitației');
      }
    } finally {
      setBidLoading(false);
    }
  };

  const handleAutoBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auction) return;

    setBidError('');
    setBidLoading(true);

    try {
      const amount = parseFloat(autoBidAmount);
      bidSchema.parse({ amount });
      if (amount < minBid) {
        throw new Error(`Licitația automată trebuie să fie cel puțin ${formatRON(minBid)}`);
      }
      await setAutoBid(id, amount, user.uid);
      setAutoBidAmount('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        setBidError(error.issues[0].message);
      } else {
        setBidError(error instanceof Error ? error.message : 'Eroare la setarea licitației automate');
      }
    } finally {
      setBidLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error ? 'Eroare la încărcarea licitației' : 'Licitație negăsită'}
          </h1>
          <p className="text-gray-600 mb-4">
            {error || 'Licitația pe care o cauți nu există.'}
          </p>
          <Link
            href="/auctions"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Înapoi la licitații
          </Link>
        </div>
      </div>
    );
  }

  const isEnded = new Date() > auction.endTime;
  
  // Calculate current bid from actual bids or use auction.currentBid as fallback
  const highestBid = bids.length > 0
    ? Math.max(...bids.map(b => b.amount))
    : (auction.currentBid || auction.reservePrice);
  
  const currentBid = highestBid;
  // Minimum bid increment: 10 RON for bids under 1000, 50 RON for higher bids
  const bidIncrement = currentBid < 1000 ? 10 : 50;
  const minBid = Math.max(currentBid + bidIncrement, auction.reservePrice);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/auctions"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Înapoi la licitații
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Auction/Product Images */}
          <div className="space-y-4">
            {product && product.images && product.images.length > 0 ? (
              <>
                <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={product.images[0]}
                    alt={product.name || 'Articol Licitație'}
                    className="w-full h-96 object-cover rounded-lg"
                  />
                </div>
                {product.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {product.images.slice(1, 5).map((image, index) => (
                      <div key={index} className="aspect-w-1 aspect-h-1 bg-gray-200 rounded overflow-hidden">
                        <img
                          src={image}
                          alt={`${product.name} ${index + 2}`}
                          className="w-full h-20 object-cover rounded"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg flex items-center justify-center h-96">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-500 text-sm">Se încarcă imaginea...</span>
                </div>
              </div>
            )}
          </div>

          {/* Auction Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Licitație #{auction.id.slice(-6)}
              </h1>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  auction.status === 'active' ? 'bg-green-100 text-green-800' :
                  auction.status === 'ended' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {auction.status.toUpperCase()}
                </span>
                <p className="text-gray-600">
                  Începută {auction.startTime.toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600 mb-2">Licitație curentă</p>
                <p className="text-4xl font-bold text-blue-600">
                  {formatRON(currentBid)}
                </p>
              </div>

              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 mb-2">Timp rămas</p>
                <CountdownTimer endTime={auction.endTime} />
              </div>

              {!isEnded && user && (
                <div className="space-y-6">
                  {bidError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                      {bidError}
                    </div>
                  )}

                  <form onSubmit={handleBid} className="space-y-4">
                    <div>
                      <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700 mb-2">
                        Licitația ta (Minim: {formatRON(minBid)})
                      </label>
                      <input
                        id="bidAmount"
                        type="number"
                        step="0.01"
                        min={minBid}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder={`Introdu suma licitației`}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                        required
                        disabled={bidLoading}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={bidLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium text-lg transition-colors duration-200"
                    >
                      {bidLoading ? 'Se plasează licitația...' : 'Plasează licitație'}
                    </button>
                  </form>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Licitare automată</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Setează o sumă maximă de licitare. Sistemul va licita automat în numele tău, până la această sumă, când ești depășit.
                    </p>
                    <form onSubmit={handleAutoBid} className="space-y-4">
                      <div>
                        <label htmlFor="autoBidAmount" className="block text-sm font-medium text-gray-700 mb-2">
                          Suma maximă licitare automată
                        </label>
                        <input
                          id="autoBidAmount"
                          type="number"
                          step="0.01"
                          min={minBid}
                          value={autoBidAmount}
                          onChange={(e) => setAutoBidAmount(e.target.value)}
                          placeholder={`Introdu licitația maximă`}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                          required
                          disabled={bidLoading}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={bidLoading}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-3 rounded-lg font-medium text-lg transition-colors duration-200"
                      >
                        {bidLoading ? 'Se setează licitarea automată...' : 'Setează licitare automată'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {!user && !isEnded && (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-4">Te rugăm să te autentifici pentru a licita</p>
                  <Link
                    href="/login"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                  >
                    Autentificare
                  </Link>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Detalii licitație
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">ID Licitație:</span>
                  <span className="font-mono">{auction.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Preț de rezervă:</span>
                  <span>{formatRON(auction.reservePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ora de start:</span>
                  <span>{auction.startTime.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ora de încheiere:</span>
                  <span>{auction.endTime.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Creată:</span>
                  <span>{auction.createdAt.toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Istoric licitații
              </h2>
              {bids.length === 0 ? (
                <p className="text-gray-600">Nicio licitație încă</p>
              ) : (
                <div className="space-y-2">
                  {bids.map((bid) => (
                    <div key={bid.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <span className="font-medium">{formatRON(bid.amount)}</span>
                        <span className="text-sm text-gray-600 ml-2">
                          {bid.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 font-mono">
                        {bid.userId.slice(-6)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Auction Chat Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Chat Licitație</h2>
            <button
              onClick={() => setShowChat(!showChat)}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {showChat ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
          
          {showChat && (
            <AuctionChat
              auctionId={id}
              auctionStatus={auction.status}
              isOwner={isOwner}
            />
          )}
        </div>

        {/* Price Evolution Chart */}
        <div className="mt-8">
          <PriceEvolutionChart
            itemId={id}
            type="auction"
            title="Evoluția Licitărilor"
          />
        </div>
      </div>
    </div>
  );
}