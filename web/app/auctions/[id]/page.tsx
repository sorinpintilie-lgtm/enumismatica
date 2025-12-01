'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { useAuction } from '../../hooks/useAuctions';
import { useBids } from '../../hooks/useBids';
import { placeBid, setAutoBid, cancelAutoBid, getUserAutoBid } from 'shared/auctionService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastProvider';
import AuctionChat from '../../components/AuctionChat';
import { useProduct } from '../../hooks/useProducts';
import PriceEvolutionChart from '../../components/PriceEvolutionChart';
import { formatRON } from '../../utils/currency';
import type { AutoBid } from 'shared/types';

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
  const { showToast } = useToast();
  const [bidAmount, setBidAmount] = useState('');
  const [autoBidAmount, setAutoBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [confirmAction, setConfirmAction] = useState<
    | { type: 'manual' | 'auto'; amount: number }
    | { type: 'cancel-auto' }
    | null
  >(null);

  // Track last manual and last seen user bid amounts (for auto-bid notifications)
  const lastManualBidAmountRef = useRef<number | null>(null);
  const lastUserBidAmountRef = useRef<number | null>(null);
  const [userAutoBid, setUserAutoBid] = useState<AutoBid | null>(null);
  
  // Fetch product details to check ownership
  const { product } = useProduct(auction?.productId || '');
  const isOwner = product?.ownerId === user?.uid;

  const handleBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auction) return;

    setBidError('');

    try {
      const amount = parseFloat(bidAmount);
      bidSchema.parse({ amount });
      if (amount < minBid) {
        throw new Error(`Licitația trebuie să fie cel puțin ${formatRON(minBid)}`);
      }

      // Open confirmation modal before actually placing the bid
      setConfirmAction({ type: 'manual', amount });
    } catch (error) {
      let message = 'Eroare la validarea licitației';
      if (error instanceof z.ZodError) {
        message = error.issues[0].message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      setBidError(message);
      showToast({
        type: 'error',
        title: 'Eroare la licitare',
        message,
      });
    }
  };

  const handleAutoBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auction) return;

    setBidError('');

    try {
      const amount = parseFloat(autoBidAmount);
      bidSchema.parse({ amount });
      if (amount < minBid) {
        throw new Error(`Licitația automată trebuie să fie cel puțin ${formatRON(minBid)}`);
      }

      // Open confirmation modal before actually setting auto-bid
      setConfirmAction({ type: 'auto', amount });
    } catch (error) {
      let message = 'Eroare la validarea licitației automate';
      if (error instanceof z.ZodError) {
        message = error.issues[0].message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      setBidError(message);
      showToast({
        type: 'error',
        title: 'Eroare la licitarea automată',
        message,
      });
    }
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction || !user || !auction) return;

    setBidLoading(true);
    setBidError('');

    try {
      if (confirmAction.type === 'manual') {
        const amount = confirmAction.amount;
        await placeBid(id, amount, user.uid);
        lastManualBidAmountRef.current = amount;
        setBidAmount('');
        showToast({
          type: 'success',
          title: 'Licitație plasată',
          message:
            'Oferta ta a fost înregistrată. Vei vedea imediat dacă ești licitatorul cu oferta cea mai mare.',
        });
      } else if (confirmAction.type === 'auto') {
        const amount = confirmAction.amount;
        await setAutoBid(id, amount, user.uid);
        setAutoBidAmount('');
        // Refresh user auto-bid info
        try {
          const updated = await getUserAutoBid(id, user.uid);
          setUserAutoBid(updated);
        } catch (err) {
          console.error('Failed to refresh user auto-bid after set', err);
        }
        showToast({
          type: 'success',
          title: 'Licitare automată activată',
          message: `Vom licita automat pentru tine până la ${formatRON(amount)}.`,
        });
      } else if (confirmAction.type === 'cancel-auto') {
        await cancelAutoBid(id, user.uid);
        setUserAutoBid(null);
        showToast({
          type: 'success',
          title: 'Licitare automată anulată',
          message: 'Licitarea automată a fost dezactivată pentru această licitație.',
        });
      }
    } catch (error) {
      let message =
        confirmAction.type === 'manual'
          ? 'Eroare la plasarea licitației'
          : confirmAction.type === 'auto'
          ? 'Eroare la setarea licitației automate'
          : 'Eroare la anularea licitației automate';
      if (error instanceof z.ZodError) {
        message = error.issues[0].message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      setBidError(message);
      showToast({
        type: 'error',
        title:
          confirmAction.type === 'manual'
            ? 'Eroare la licitare'
            : confirmAction.type === 'auto'
            ? 'Eroare la licitarea automată'
            : 'Eroare la anulare',
        message,
      });
    } finally {
      setBidLoading(false);
      setConfirmAction(null);
    }
  };

  const isEnded = auction ? new Date() > auction.endTime : false;
  
  // Calculate current bid from actual bids or use auction.currentBid as fallback
  const highestBid = auction
    ? (bids.length > 0
        ? Math.max(...bids.map(b => b.amount))
        : (auction.currentBid || auction.reservePrice))
    : 0;
  
  const currentBid = highestBid;
  // Minimum bid increment: 10 RON for bids under 1000, 50 RON for higher bids
  const bidIncrement = currentBid < 1000 ? 10 : 50;
  const minBid = Math.max(currentBid + bidIncrement, auction?.reservePrice ?? 0);

  const isUserHighestBidder = !!user && !!auction && auction.currentBidderId === user.uid;

  // Notify when auto-bid places a new bid on behalf of the current user
  useEffect(() => {
    if (!user || bids.length === 0) return;

    const latestUserBid = bids.find((b) => b.userId === user.uid);
    if (!latestUserBid) return;

    // Initialize baseline without notifying
    if (lastUserBidAmountRef.current == null) {
      lastUserBidAmountRef.current = latestUserBid.amount;
      return;
    }

    if (latestUserBid.amount !== lastUserBidAmountRef.current) {
      const isSameAsLastManual =
        lastManualBidAmountRef.current != null &&
        Math.abs(latestUserBid.amount - lastManualBidAmountRef.current) < 0.000001;

      // If the latest user bid wasn't just placed manually from this client,
      // treat it as an auto-bid event.
      if (!isSameAsLastManual) {
        showToast({
          type: 'info',
          title: 'Licitare automată',
          message: `Licitarea automată a plasat o ofertă de ${formatRON(latestUserBid.amount)} în numele tău.`,
        });
      }

      lastUserBidAmountRef.current = latestUserBid.amount;
    }
  }, [bids, user, showToast]);

  // Load current user's auto-bid for this auction
  useEffect(() => {
    let isMounted = true;

    const loadUserAutoBid = async () => {
      if (!user?.uid || !auction) {
        if (isMounted) {
          setUserAutoBid(null);
        }
        return;
      }

      try {
        const existing = await getUserAutoBid(auction.id, user.uid);
        if (isMounted) {
          setUserAutoBid(existing);
        }
      } catch (err) {
        console.error('Failed to load user auto-bid', err);
      }
    };

    loadUserAutoBid();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, auction?.id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto panel-dark p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            {error ? 'Eroare la încărcarea licitației' : 'Licitație negăsită'}
          </h1>
          <p className="text-slate-300 mb-4">
            {error || 'Licitația pe care o cauți nu există.'}
          </p>
          <Link
            href="/auctions"
            className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2 text-sm font-semibold text-[#000940] shadow-[0_0_24px_rgba(231,183,60,0.75)] hover:bg-[#f0c955] transition-colors"
          >
            Înapoi la licitații
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Confirm action modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="mx-4 max-w-md w-full rounded-2xl bg-navy-900/95 border border-gold-500/40 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.95)]">
            <h3 className="text-lg font-semibold text-white mb-2">
              {confirmAction.type === 'manual'
                ? 'Confirmă licitația'
                : 'Confirmă licitarea automată'}
            </h3>
            <p className="text-sm text-slate-200 mb-4">
              {confirmAction.type === 'manual' ? (
                <>
                  Ești sigur că vrei să plasezi o licitație de{' '}
                  <span className="font-semibold text-[#e7b73c]">
                    {formatRON(confirmAction.amount)}
                  </span>{' '}
                  pentru această licitație?
                </>
              ) : confirmAction.type === 'auto' ? (
                <>
                  Ești sigur că vrei să setezi licitarea automată până la{' '}
                  <span className="font-semibold text-[#e7b73c]">
                    {formatRON(confirmAction.amount)}
                  </span>
                  ? Sistemul va licita automat în numele tău până la această sumă.
                </>
              ) : (
                <>
                  Ești sigur că vrei să anulezi licitarea automată pentru această licitație?
                </>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="inline-flex items-center justify-center rounded-full border border-slate-500/60 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-300 hover:bg-slate-800/60 transition-colors"
                disabled={bidLoading}
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                disabled={bidLoading}
                className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-4 py-2 text-sm font-semibold text-[#000940] shadow-[0_0_24px_rgba(231,183,60,0.85)] hover:bg-[#f0c955] disabled:bg-[#e7b73c]/60 disabled:text-slate-600 transition-colors"
              >
                {bidLoading ? 'Se procesează...' : 'Confirmă'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/auctions"
            className="inline-flex items-center text-sm font-medium text-gold-400 hover:text-gold-300 transition-colors"
          >
            ← Înapoi la licitații
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Auction/Product Images */}
          <div className="space-y-4">
            {product && product.images && product.images.length > 0 ? (
              <>
                <div className="aspect-w-1 aspect-h-1 bg-navy-900/60 rounded-2xl overflow-hidden border border-gold-500/20">
                  <img
                    src={product.images[0]}
                    alt={product.name || 'Articol Licitație'}
                    className="w-full h-96 object-contain bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950"
                  />
                </div>
                {product.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {product.images.slice(1, 5).map((image, index) => (
                      <div key={index} className="aspect-w-1 aspect-h-1 bg-navy-900/60 rounded-xl overflow-hidden border border-gold-500/10">
                        <img
                          src={image}
                          alt={`${product.name} ${index + 2}`}
                          className="w-full h-20 object-contain bg-navy-950"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-w-1 aspect-h-1 bg-navy-900/60 rounded-2xl flex items-center justify-center h-96 border border-gold-500/20">
                <div className="text-center">
                  <svg className="w-16 h-16 text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-slate-400 text-sm">Se încarcă imaginea...</span>
                </div>
              </div>
            )}
          </div>

          {/* Auction Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Licitație #{auction.id.slice(-6)}
              </h1>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                  auction.status === 'active' ? 'bg-emerald-900/40 text-emerald-200 border-emerald-400/50' :
                  auction.status === 'ended' ? 'bg-red-900/50 text-red-200 border-red-500/50' :
                  'bg-slate-800/80 text-slate-100 border-slate-500/50'
                }`}>
                  {auction.status.toUpperCase()}
                </span>
                <p className="text-slate-300">
                  Începută {auction.startTime.toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="panel-dark p-6">
              <div className="text-center mb-4">
                <p className="text-sm text-slate-300 mb-2">Licitație curentă</p>
                <p className="text-4xl font-extrabold text-[#e7b73c] drop-shadow-[0_0_24px_rgba(231,183,60,0.75)]">
                  {formatRON(currentBid)}
                </p>
                {user && (
                  <p
                    className={`mt-2 text-sm font-medium ${
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

              <div className="text-center mb-6">
                <p className="text-sm text-slate-300 mb-2">Timp rămas</p>
                <CountdownTimer endTime={auction.endTime} />
              </div>

              {!isEnded && user && (
                <div className="space-y-6">
                  {bidError && (
                    <div className="bg-red-900/40 border border-red-500/60 text-red-100 px-4 py-3 rounded-lg text-sm">
                      {bidError}
                    </div>
                  )}

                  <form onSubmit={handleBid} className="space-y-4">
                    <div>
                      <label htmlFor="bidAmount" className="block text-sm font-medium text-slate-200 mb-2">
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
                        className="w-full px-4 py-3 border border-gold-500/40 rounded-lg bg-navy-900/70 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent text-lg"
                        required
                        disabled={bidLoading}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={bidLoading}
                      className="w-full bg-[#e7b73c] hover:bg-[#f0c955] disabled:bg-[#e7b73c]/60 text-[#000940] px-6 py-3 rounded-xl font-semibold text-lg transition-colors duration-200 shadow-[0_0_24px_rgba(231,183,60,0.8)]"
                    >
                      {bidLoading ? 'Se plasează licitația...' : 'Plasează licitație'}
                    </button>
                  </form>

                  <div className="border-t border-gold-500/20 pt-6 mt-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Licitare automată</h3>
                    <p className="text-sm text-slate-300 mb-4">
                      Setează o sumă maximă de licitare. Sistemul va licita automat în numele tău, până la această sumă, când ești depășit.
                    </p>
                    {userAutoBid && (
                      <div className="mb-4 rounded-xl border border-gold-500/40 bg-navy-900/60 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <p className="text-sm text-slate-100">
                          Licitare automată activă până la{' '}
                          <span className="font-semibold text-[#e7b73c]">
                            {formatRON(userAutoBid.maxAmount)}
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ type: 'cancel-auto' })}
                          className="inline-flex items-center justify-center rounded-full border border-red-500/70 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/10 transition-colors"
                          disabled={bidLoading}
                        >
                          Anulează licitarea automată
                        </button>
                      </div>
                    )}
                    <form onSubmit={handleAutoBid} className="space-y-4">
                      <div>
                        <label htmlFor="autoBidAmount" className="block text-sm font-medium text-slate-200 mb-2">
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
                          className="w-full px-4 py-3 border border-gold-500/40 rounded-lg bg-navy-900/70 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent text-lg"
                          required
                          disabled={bidLoading}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={bidLoading}
                        className="w-full bg-navy-900/80 hover:bg-navy-800 disabled:bg-navy-900/50 text-gold-200 px-6 py-3 rounded-xl font-semibold text-lg transition-colors duration-200 border border-gold-500/50 shadow-[0_0_22px_rgba(15,23,42,0.9)]"
                      >
                        {bidLoading ? 'Se setează licitarea automată...' : 'Setează licitare automată'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {!user && !isEnded && (
                <div className="text-center py-4">
                  <p className="text-slate-300 mb-4">Te rugăm să te autentifici pentru a licita</p>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2 text-sm font-semibold text-[#000940] shadow-[0_0_24px_rgba(231,183,60,0.75)] hover:bg-[#f0c955] transition-colors"
                  >
                    Autentificare
                  </Link>
                </div>
              )}
            </div>

            <div className="border-t border-gold-500/20 pt-6">
              <h2 className="text-xl font-semibold text-white mb-3">
                Detalii licitație
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-300">ID Licitație:</span>
                  <span className="font-mono text-slate-100">{auction.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Preț de rezervă:</span>
                  <span className="text-slate-100">{formatRON(auction.reservePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Ora de start:</span>
                  <span className="text-slate-100">{auction.startTime.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Ora de încheiere:</span>
                  <span className="text-slate-100">{auction.endTime.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Creată:</span>
                  <span className="text-slate-100">{auction.createdAt.toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gold-500/20 pt-6">
              <h2 className="text-xl font-semibold text-white mb-3">
                Istoric licitații
              </h2>
              {bids.length === 0 ? (
                <p className="text-slate-300">Nicio licitație încă</p>
              ) : (
                <div className="space-y-2">
                  {bids.map((bid) => (
                    <div key={bid.id} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-b-0">
                      <div>
                        <span className="font-medium text-slate-50">{formatRON(bid.amount)}</span>
                        <span className="text-sm text-slate-400 ml-2">
                          {bid.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-sm text-slate-500 font-mono">
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
            <h2 className="text-2xl font-bold text-white">Chat Licitație</h2>
            <button
              onClick={() => setShowChat(!showChat)}
              className="text-slate-300 hover:text-white transition-colors"
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

        {/* Price Evolution Chart - evolution of the coin in general (like product page) */}
        <div className="mt-8">
          <PriceEvolutionChart
            itemId={product?.id || auction.productId}
            type="product"
            title="Evoluția Prețului Monedei"
          />
        </div>
      </div>
    </div>
  );
}