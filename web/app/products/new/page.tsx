'use client';

import { FormEvent, useState, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { uploadMultipleImages, validateImageFile } from 'shared/storageService';
import { useToast } from '../../components/ToastProvider';

export default function NewProductPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [country, setCountry] = useState('');
  const [year, setYear] = useState('');
  const [metal, setMetal] = useState('');
  const [denomination, setDenomination] = useState('');
  const [rarity, setRarity] = useState('');
  const [grade, setGrade] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [createAuction, setCreateAuction] = useState(false);
  const [reservePrice, setReservePrice] = useState('');
  const [auctionEndTime, setAuctionEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) {
      setFiles([]);
      return;
    }

    const selected: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList.item(i);
      if (!file) continue;
      const { valid, error } = validateImageFile(file);
      if (!valid) {
        showToast({
          type: 'error',
          title: 'Eroare la încărcarea imaginilor',
          message: error ?? 'Fișier invalid.',
        });
        continue;
      }
      selected.push(file);
    }
    setFiles(selected);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast({
        type: 'error',
        title: 'Autentificare necesară',
        message: 'Trebuie să fii autentificat pentru a adăuga un produs.',
      });
      router.push('/login');
      return;
    }

    if (!name.trim() || !description.trim()) {
      showToast({
        type: 'error',
        title: 'Câmpuri obligatorii',
        message: 'Numele și descrierea sunt obligatorii.',
      });
      return;
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      showToast({
        type: 'error',
        title: 'Preț invalid',
        message: 'Introdu un preț valid mai mare decât 0.',
      });
      return;
    }

    if (createAuction) {
      const numericReserve = Number(reservePrice || price);
      if (!Number.isFinite(numericReserve) || numericReserve <= 0) {
        showToast({
          type: 'error',
          title: 'Preț de rezervă invalid',
          message: 'Introdu un preț de rezervă valid mai mare decât 0.',
        });
        return;
      }
      if (!auctionEndTime) {
        showToast({
          type: 'error',
          title: 'Dată de încheiere lipsă',
          message: 'Selectează data și ora de încheiere a licitației.',
        });
        return;
      }
      const end = new Date(auctionEndTime);
      if (Number.isNaN(end.getTime()) || end <= new Date()) {
        showToast({
          type: 'error',
          title: 'Dată de încheiere invalidă',
          message: 'Data de încheiere trebuie să fie în viitor.',
        });
        return;
      }
    }

    try {
      setSubmitting(true);

      let imageUrls: string[] = [];
      if (files.length > 0) {
        imageUrls = await uploadMultipleImages(files, `products/${user.uid}`);
      }

      const productRef = await addDoc(collection(db, 'products'), {
        name: name.trim(),
        description: description.trim(),
        images: imageUrls,
        price: numericPrice,
        ownerId: user.uid,
        status: 'pending',
        country: country || null,
        year: year ? Number(year) : null,
        metal: metal || null,
        denomination: denomination || null,
        rarity: rarity || null,
        grade: grade || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (createAuction) {
        const reserve = reservePrice ? Number(reservePrice) : numericPrice;
        const end = new Date(auctionEndTime);
        await addDoc(collection(db, 'auctions'), {
          productId: productRef.id,
          startTime: Timestamp.fromDate(new Date()),
          endTime: Timestamp.fromDate(end),
          reservePrice: reserve,
          currentBid: null,
          currentBidderId: null,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      showToast({
        type: 'success',
        title: 'Produs trimis spre aprobare',
        message: createAuction
          ? 'Produsul și licitația au fost trimise spre aprobare. Un administrator le va verifica înainte să apară public.'
          : 'Produsul a fost trimis spre aprobare. Un administrator îl va verifica înainte să apară public.',
      });

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Failed to create product/auction', err);
      showToast({
        type: 'error',
        title: 'Eroare la salvare',
        message: err?.message || 'A apărut o eroare la salvarea produsului.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-navy-900/80 border border-gold-500/40 rounded-2xl p-6 shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
        <h1 className="text-2xl font-bold text-white mb-4">Adaugă un produs</h1>
        <p className="text-sm text-slate-300 mb-6">
          Completează detaliile produsului tău. După trimitere, produsul (și opțional licitația) vor fi revizuite de un administrator înainte să fie publice.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Nume produs *
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gold-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Descriere *
            </label>
            <textarea
              className="w-full rounded-lg border border-gold-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Preț fix (RON) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-gold-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Țara
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gold-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                An
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gold-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Metal
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gold-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                value={metal}
                onChange={(e) => setMetal(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Denominație
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gold-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                value={denomination}
                onChange={(e) => setDenomination(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Raritate
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gold-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                value={rarity}
                onChange={(e) => setRarity(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Grad / stare
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gold-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Imagini
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-200 file:mr-3 file:rounded-full file:border-0 file:bg-gold-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-navy-900 hover:file:bg-gold-400"
            />
            {files.length > 0 && (
              <p className="mt-1 text-xs text-slate-300">
                {files.length} imagine{files.length > 1 ? 'i' : ''} selectate
              </p>
            )}
          </div>

          <div className="mt-4 border-t border-gold-500/30 pt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={createAuction}
                onChange={(e) => setCreateAuction(e.target.checked)}
                className="h-4 w-4 rounded border-gold-500/60 bg-navy-900 text-gold-500 focus:ring-gold-400"
              />
              Creează și o licitație pentru acest produs (opțional)
            </label>

            {createAuction && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Preț de rezervă (RON)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-gold-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                    value={reservePrice}
                    onChange={(e) => setReservePrice(e.target.value)}
                    placeholder={price || 'Ex: 100.00'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Dată & oră de încheiere
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border border-gold-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                    value={auctionEndTime}
                    onChange={(e) => setAuctionEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full bg-[#e7b73c] px-6 py-2 text-sm font-semibold text-[#000940] shadow-lg shadow-[0_0_25px_rgba(231,183,60,0.7)] transition hover:bg-[#f0c955] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Se salvează...' : 'Trimite spre aprobare'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}