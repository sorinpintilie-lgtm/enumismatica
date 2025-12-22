'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastProvider';
import { getOffersForSeller, acceptOffer, rejectOffer } from 'shared/offerService';
import { formatRON } from '../utils/currency';
import type { Offer } from 'shared/types';

interface OfferManagementProps {
  productId?: string;
  auctionId?: string;
  productName?: string;
  onClose: () => void;
}

export default function OfferManagement({ productId, auctionId, productName, onClose }: OfferManagementProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOffer, setProcessingOffer] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const loadOffers = async () => {
      try {
        setLoading(true);
        const sellerOffers = await getOffersForSeller(user.uid);
        
        // Filter offers for this specific item
        const filteredOffers = sellerOffers.filter(offer => {
          if (productId && offer.itemType === 'product') {
            return offer.itemId === productId;
          }
          if (auctionId && offer.itemType === 'auction') {
            return offer.itemId === auctionId;
          }
          return false;
        });

        setOffers(filteredOffers);
      } catch (error) {
        console.error('Failed to load offers:', error);
        showToast({
          type: 'error',
          title: 'Eroare',
          message: 'Nu s-au putut încărca ofertele.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadOffers();
  }, [user?.uid, productId, auctionId, showToast]);

  const handleAcceptOffer = async (offerId: string) => {
    try {
      setProcessingOffer(offerId);
      await acceptOffer(offerId);
      
      // Update local state
      setOffers(prev => prev.map(offer => 
        offer.id === offerId ? { ...offer, status: 'accepted' as const } : offer
      ));

      showToast({
        type: 'success',
        title: 'Ofertă acceptată',
        message: 'Ai acceptat oferta cu succes.',
      });
    } catch (error) {
      console.error('Failed to accept offer:', error);
      showToast({
        type: 'error',
        title: 'Eroare',
        message: 'Nu s-a putut accepta oferta.',
      });
    } finally {
      setProcessingOffer(null);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    try {
      setProcessingOffer(offerId);
      await rejectOffer(offerId);
      
      // Update local state
      setOffers(prev => prev.map(offer => 
        offer.id === offerId ? { ...offer, status: 'rejected' as const } : offer
      ));

      showToast({
        type: 'success',
        title: 'Ofertă respinsă',
        message: 'Ai respins oferta cu succes.',
      });
    } catch (error) {
      console.error('Failed to reject offer:', error);
      showToast({
        type: 'error',
        title: 'Eroare',
        message: 'Nu s-a putut respinge oferta.',
      });
    } finally {
      setProcessingOffer(null);
    }
  };

  const getStatusColor = (status: Offer['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900/40 text-yellow-200 border-yellow-500/50';
      case 'accepted':
        return 'bg-emerald-900/40 text-emerald-200 border-emerald-500/50';
      case 'rejected':
        return 'bg-red-900/40 text-red-200 border-red-500/50';
      case 'expired':
        return 'bg-gray-900/40 text-gray-200 border-gray-500/50';
      default:
        return 'bg-slate-900/40 text-slate-200 border-slate-500/50';
    }
  };

  const getStatusText = (status: Offer['status']) => {
    switch (status) {
      case 'pending':
        return 'În așteptare';
      case 'accepted':
        return 'Acceptată';
      case 'rejected':
        return 'Respinsă';
      case 'expired':
        return 'Expirată';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="mx-4 max-w-2xl w-full rounded-2xl bg-navy-900/95 border border-gold-500/40 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.95)]">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
            <span className="ml-3 text-slate-300">Se încarcă ofertele...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 max-w-4xl w-full rounded-2xl bg-navy-900/95 border border-gold-500/40 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.95)] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">
            Oferte pentru {productName || 'produsul tău'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {offers.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-slate-400 mb-2">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-slate-300 text-lg">Nu ai primit încă nicio ofertă</p>
            <p className="text-slate-400 text-sm mt-2">
              Ofertele vor apărea aici când cumpărătorii vor fi interesați de produsul tău.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <div key={offer.id} className="bg-navy-800/60 border border-gold-500/20 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {formatRON(offer.offerAmount)}
                    </p>
                    <p className="text-sm text-slate-400">
                      Ofertă din {offer.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(offer.status)}`}>
                    {getStatusText(offer.status)}
                  </span>
                </div>

                {offer.message && (
                  <div className="mb-3">
                    <p className="text-sm text-slate-300">
                      <span className="font-medium">Mesaj:</span> {offer.message}
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-xs text-slate-400">
                    {offer.expiresAt && (
                      <span>
                        Expiră: {offer.expiresAt.toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {offer.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRejectOffer(offer.id)}
                        disabled={processingOffer === offer.id}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        {processingOffer === offer.id ? 'Se procesează...' : 'Respinge'}
                      </button>
                      <button
                        onClick={() => handleAcceptOffer(offer.id)}
                        disabled={processingOffer === offer.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        {processingOffer === offer.id ? 'Se procesează...' : 'Acceptă'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-navy-600 hover:bg-navy-500 text-white rounded-lg font-semibold transition-colors"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}
