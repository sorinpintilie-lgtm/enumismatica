'use client';

import { useState, FormEvent } from 'react';
import { createOffer } from 'shared/offerService';
import { useToast } from './ToastProvider';
import { formatRON } from '../utils/currency';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'product' | 'auction';
  itemId: string;
  itemName: string;
  currentPrice?: number;
  buyerId: string;
}

export default function OfferModal({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemName,
  currentPrice,
  buyerId
}: OfferModalProps) {
  const [offerAmount, setOfferAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(offerAmount);
    if (!amount || amount <= 0) {
      showToast({
        type: 'error',
        title: 'Sumă invalidă',
        message: 'Introdu o sumă validă mai mare decât 0.',
      });
      return;
    }

    if (currentPrice && amount < currentPrice * 0.5) {
      showToast({
        type: 'info',
        title: 'Ofertă mică',
        message: 'Oferta ta este semnificativ mai mică decât prețul actual. Consideră o sumă mai mare.',
      });
      // Don't return, allow the offer anyway
    }

    try {
      setSubmitting(true);
      await createOffer(itemType, itemId, buyerId, amount, message.trim() || undefined);

      showToast({
        type: 'success',
        title: 'Ofertă trimisă',
        message: 'Oferta ta a fost trimisă vânzătorului.',
      });

      onClose();
      setOfferAmount('');
      setMessage('');
    } catch (error: any) {
      console.error('Failed to create offer:', error);
      showToast({
        type: 'error',
        title: 'Eroare',
        message: error.message || 'A apărut o eroare la trimiterea ofertei.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy-900/95 border border-gold-500/40 rounded-2xl p-6 w-full max-w-md shadow-[0_18px_55px_rgba(0,0,0,0.85)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Transmite o ofertă</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-slate-300">
            <span className="font-medium text-white">{itemName}</span>
          </p>
          {typeof currentPrice === 'number' && currentPrice > 0 && (
            <p className="text-sm text-slate-400 mt-1">
              Preț actual:{' '}
              <span className="text-gold-400 font-semibold">{formatRON(currentPrice)}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Suma ofertei (RON) *
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              className="w-full rounded-lg border border-gold-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
              placeholder="Ex: 150.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Mesaj (opțional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-gold-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
              rows={3}
              placeholder="Adaugă un mesaj pentru vânzător..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-navy-600 hover:bg-navy-500 text-white rounded-lg font-semibold transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 rounded-lg font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Se trimite...' : 'Trimite oferta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
