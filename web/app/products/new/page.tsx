'use client';

import { FormEvent, useState, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { uploadMultipleImages, validateImageFile } from 'shared/storageService';
import { useToast } from '../../components/ToastProvider';

// Predefined options for product attributes
const COUNTRIES = [
  'România', 'Germania', 'Franța', 'Italia', 'Spania', 'Regatul Unit', 'Austria', 'Elveția',
  'Rusia', 'Polonia', 'Ungaria', 'Cehia', 'Slovacia', 'Bulgaria', 'Serbia', 'Croația',
  'Grecia', 'Turcia', 'SUA', 'Canada', 'Australia', 'China', 'Japonia', 'India',
  'Brazilia', 'Argentina', 'Mexic', 'Africa de Sud', 'Egipt', 'Israel', 'Arabia Saudită'
];

const METALS = [
  'Aur', 'Argint', 'Cupru', 'Bronz', 'Oțel', 'Aluminiu', 'Platină', 'Paladiu',
  'Zinc', 'Nichel', 'Aliaj', 'Cupru-Nichel', 'Argint-Aur', 'Electrum'
];

const DENOMINATIONS = [
  '1 Ban', '5 Bani', '10 Bani', '25 Bani', '50 Bani', '1 Leu', '5 Lei', '10 Lei', '20 Lei', '50 Lei', '100 Lei', '200 Lei', '500 Lei',
  '1 Cent', '2 Cent', '5 Cent', '10 Cent', '20 Cent', '50 Cent', '1 Euro', '2 Euro',
  '1 Centavo', '5 Centavos', '10 Centavos', '25 Centavos', '50 Centavos', '1 Peso',
  '1 Kopek', '2 Kopeki', '3 Kopeki', '5 Kopek', '10 Kopek', '15 Kopek', '20 Kopek', '50 Kopek', '1 Ruble',
  '1 Pfennig', '2 Pfennige', '5 Pfennige', '10 Pfennige', '50 Pfennige', '1 Mark', '2 Mark', '5 Mark',
  '1 Penny', '3 Pence', '6 Pence', '1 Shilling', '2 Shillings', '1 Pound',
  '1 Franc', '2 Francs', '5 Francs', '10 Francs', '20 Francs', '50 Francs', '100 Francs',
  '1 Lira', '2 Lire', '5 Lire', '10 Lire', '20 Lire', '50 Lire', '100 Lire', '500 Lire'
];

const RARITIES = [
  { value: 'common', label: 'Comun' },
  { value: 'uncommon', label: 'Necomun' },
  { value: 'rare', label: 'Rar' },
  { value: 'very-rare', label: 'Foarte Rar' },
  { value: 'extremely-rare', label: 'Extrem de Rar' }
];

const GRADES = [
  'VF (Very Fine)', 'XF (Extremely Fine)', 'AU (Almost Uncirculated)', 'MS (Mint State)',
  'MS-60', 'MS-61', 'MS-62', 'MS-63', 'MS-64', 'MS-65', 'MS-66', 'MS-67', 'MS-68', 'MS-69', 'MS-70',
  'F (Fine)', 'VG (Very Good)', 'G (Good)', 'AG (About Good)', 'FA (Fair)', 'PR (Poor)',
  'UNC (Uncirculated)', 'BU (Brilliant Uncirculated)', 'Proof', 'Proof-like'
];

const ERAS = [
  'Antică', 'Medievală', 'Renașterea', 'Epoca Modernă', 'Secolul XIX', 'Secolul XX', 'Secolul XXI',
  '1895-1917', '1917-1991', '1991-Prezent', 'Pre-1917', 'Post-1917', 'Comunism', 'Monarhie'
];

const CATEGORIES = [
  'Monede', 'Banknote', 'Medalii', 'Jetoane', 'Insigne', 'Ordine', 'Decorații', 'Altele'
];

export default function NewProductPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [country, setCountry] = useState('');
  const [year, setYear] = useState('');
  const [era, setEra] = useState('');
  const [metal, setMetal] = useState('');
  const [denomination, setDenomination] = useState('');
  const [rarity, setRarity] = useState('');
  const [grade, setGrade] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [listingType, setListingType] = useState<'direct' | 'auction'>('direct');
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

    if (listingType === 'auction') {
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
        era: era || null,
        metal: metal || null,
        denomination: denomination || null,
        rarity: rarity || null,
        grade: grade || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (listingType === 'auction') {
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
        title: listingType === 'auction' ? 'Licitație trimisă spre aprobare' : 'Produs trimis spre aprobare',
        message: listingType === 'auction'
          ? 'Licitația a fost trimisă spre aprobare. Un administrator o va verifica înainte să apară public.'
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
          Încarcă imagini, adaugă titlu și descriere, apoi selectează din opțiunile disponibile pentru caracteristicile produsului. Alege tipul de vânzare dorit.
        </p>

        {/* Listing Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-200 mb-3">
            Tip vânzare *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
              listingType === 'direct'
                ? 'border-gold-500/40 bg-navy-800/50 text-slate-300'
                : 'border-gold-400 bg-gold-400/10 text-gold-300 hover:border-gold-500/60'
            }`}>
              <input
                type="radio"
                name="listingType"
                value="direct"
                checked={listingType === 'direct'}
                onChange={(e) => setListingType(e.target.value as 'direct' | 'auction')}
                className="sr-only"
              />
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                  listingType === 'direct' ? 'bg-navy-700 text-gold-400' : 'bg-gold-400 text-navy-900'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-1">Vând direct</h3>
                <p className="text-sm opacity-80">Preț fix, cumpărare imediată</p>
              </div>
            </label>

            <label className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
              listingType === 'auction'
                ? 'border-gold-500/40 bg-navy-800/50 text-slate-300'
                : 'border-gold-400 bg-gold-400/10 text-gold-300 hover:border-gold-500/60'
            }`}>
              <input
                type="radio"
                name="listingType"
                value="auction"
                checked={listingType === 'auction'}
                onChange={(e) => setListingType(e.target.value as 'direct' | 'auction')}
                className="sr-only"
              />
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                  listingType === 'auction' ? 'bg-navy-700 text-gold-400' : 'bg-gold-400 text-navy-900'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-lg mb-1">Pun la licitație</h3>
                <p className="text-sm opacity-80">Licitație cu mai mulți participanți</p>
              </div>
            </label>
          </div>
        </div>

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
              <select
                className="w-full rounded-lg border border-gold-500/40 bg-navy-900/90 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/20 [&>option]:bg-navy-900 [&>option]:text-white [&>option]:backdrop-blur-sm"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{
                  backgroundColor: 'rgba(17, 24, 39, 0.9)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
              >
                <option value="" style={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', color: '#94a3b8' }}>Selectează țara</option>
                {COUNTRIES.map(country => (
                  <option key={country} value={country} style={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', color: 'white' }}>{country}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                An
              </label>
              <input
                type="number"
                min="0"
                max="2100"
                className="w-full rounded-lg border border-gold-500/40 bg-navy-800/80 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Ex: 2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Epocă
              </label>
              <select
                className="w-full rounded-lg border border-gold-500/40 bg-navy-900/90 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/20 [&>option]:bg-navy-900 [&>option]:text-white [&>option]:backdrop-blur-sm"
                value={era}
                onChange={(e) => setEra(e.target.value)}
                style={{
                  backgroundColor: 'rgba(17, 24, 39, 0.9)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
              >
                <option value="" style={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', color: '#94a3b8' }}>Selectează epoca</option>
                {ERAS.map(era => (
                  <option key={era} value={era} style={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', color: 'white' }}>{era}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Metal
              </label>
              <select
                className="w-full rounded-lg border border-gold-500/40 bg-navy-900/90 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/20 [&>option]:bg-navy-900 [&>option]:text-white [&>option]:backdrop-blur-sm"
                value={metal}
                onChange={(e) => setMetal(e.target.value)}
                style={{
                  backgroundColor: 'rgba(17, 24, 39, 0.9)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
              >
                <option value="" style={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', color: '#94a3b8' }}>Selectează metalul</option>
                {METALS.map(metal => (
                  <option key={metal} value={metal} style={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', color: 'white' }}>{metal}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Denominație
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gold-500/40 bg-navy-900/90 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                value={denomination}
                onChange={(e) => setDenomination(e.target.value)}
                placeholder="Ex: 1 Leu, 5 Kopeks, 10 Cent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Raritate
              </label>
              <select
                className="w-full rounded-lg border border-gold-500/40 bg-navy-900/90 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/20 [&>option]:bg-navy-900 [&>option]:text-white [&>option]:backdrop-blur-sm"
                value={rarity}
                onChange={(e) => setRarity(e.target.value)}
                style={{
                  backgroundColor: 'rgba(17, 24, 39, 0.9)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
              >
                <option value="" style={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', color: '#94a3b8' }}>Selectează raritatea</option>
                {RARITIES.map(rarity => (
                  <option key={rarity.value} value={rarity.value} style={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', color: 'white' }}>{rarity.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Grad / stare
              </label>
              <select
                className="w-full rounded-lg border border-gold-500/40 bg-navy-900/90 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/20 [&>option]:bg-navy-900 [&>option]:text-white [&>option]:backdrop-blur-sm"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                style={{
                  backgroundColor: 'rgba(17, 24, 39, 0.9)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
              >
                <option value="" style={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', color: '#94a3b8' }}>Selectează gradul</option>
                {GRADES.map(grade => (
                  <option key={grade} value={grade} style={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', color: 'white' }}>{grade}</option>
                ))}
              </select>
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

          {listingType === 'auction' && (
            <div className="mt-4 border-t border-gold-500/30 pt-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Preț de rezervă (RON)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-gold-500/40 bg-navy-900/90 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                    value={reservePrice}
                    onChange={(e) => setReservePrice(e.target.value)}
                    placeholder={price || 'Ex: 100.00'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Dată & oră de încheiere *
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border border-gold-500/40 bg-navy-900/90 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                    value={auctionEndTime}
                    onChange={(e) => setAuctionEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          )}

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