'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';
import FilterBar, { FilterOptions } from '../components/FilterBar';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { Product } from 'shared/types';

function ProductsListContent() {
  // Fetch all fields needed for filtering and display
  // Check URL for ownerId filter (when clicking "alte piese de la acest vanzator")
  const searchParams = useSearchParams();
  const sellerIdParam = searchParams.get('ownerId');
  const ownerId = sellerIdParam || undefined;
  
  const { products, loading, error, hasMore, loadMore } = useProducts(
    ownerId,
    100, // pageSize - increased to show more products per page
    ['name', 'images', 'price', 'description', 'category', 'country', 'year', 'metal', 'rarity', 'grade', 'denomination', 'createdAt', 'updatedAt'],
    true, // enabled
    'all', // listingType - show all products (direct and auction)
    false, // live (disable realtime so pagination can prefetch safely)
  );

  // State for total count (when filtering by owner)
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Fetch total count when filtering by owner
  useEffect(() => {
    const fetchTotalCount = async () => {
      try {
        let qTotal = query(
          collection(db, 'products'),
          where('status', '==', 'approved'),
        );

        if (ownerId) {
          qTotal = query(qTotal, where('ownerId', '==', ownerId));
        }

        const totalSnap = await getCountFromServer(qTotal);
        setTotalCount(totalSnap.data().count);
      } catch (err) {
        console.error('Error fetching total count:', err);
        // Fallback: unknown total
        setTotalCount(null);
      }
    };

    fetchTotalCount();
  }, [ownerId]);

  // Fetch country counts
  const [countryCounts, setCountryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchCountryCounts = async () => {
      const counts: Record<string, number> = {};
      const countriesToFetch = [
        'Rusia',
        'SUA',
        'Germania',
        'Italia',
        'Franța',
        'Finlanda',
        'Spania',
        'Danemarca',
        'Mexic',
        'România',
        'Austria',
      ];
      const promises = countriesToFetch.map(async (country) => {
        try {
          let q = query(
            collection(db, 'products'),
            where('status', '==', 'approved'),
            where('country', '==', country)
          );
          if (ownerId) {
            q = query(q, where('ownerId', '==', ownerId));
          }
          const snap = await getCountFromServer(q);
          counts[country] = snap.data().count;
        } catch (error) {
          console.error('Error fetching count for', country, error);
          counts[country] = 0;
        }
      });
      await Promise.all(promises);
      setCountryCounts(counts);
    };
    fetchCountryCounts();
  }, [ownerId]);

  // Debug: validate that we are actually loading all seller items
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (!ownerId) return;
    console.log('[ProductsPage] owner filter state:', {
      ownerId,
      loadedProducts: products.length,
      hasMore,
      error,
    });
  }, [ownerId, products.length, hasMore, error]);
  const router = useRouter();
  const pathname = usePathname();

  // Log page navigation for debugging
  useEffect(() => {
    const pageParam = searchParams.get('page');
    console.log('[ProductsPage] Current page:', pageParam || '1');
    console.log('[ProductsPage] Full URL:', window.location.href);
  }, [searchParams]);

  const PAGE_SIZE = 100;
  const PREFETCH_PAGES_AHEAD = 5;
  const [page, setPage] = useState(1);
  const [requestedPage, setRequestedPage] = useState<number | null>(null);
  
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    category: 'Toate Categoriile',
    country: 'Toate Țările',
    // 0 / 0 = fără filtru de preț în mod implicit. Utilizatorul setează limitele doar dacă dorește.
    minPrice: 0,
    maxPrice: 0,
    // 0 / 0 = fără filtru pe ani în mod implicit. Utilizatorul setează anii doar dacă dorește.
    minYear: 0,
    maxYear: 0,
    metal: 'Toate Metalele',
    rarity: 'Toate Raritățile',
    grade: 'Toate Gradele',
    faceValue: 'Toate Valorile',
    issueYear: 'Toți Anii',
    diameter: 'Toate Diametrele',
    weight: 'Toate Greutățile',
    mint: 'Toate Monetăriile',
    era: 'Toate Epocile',
    sortBy: 'best-match',
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Keep page state in sync with ?page=N in the URL so browser back/forward
  // navigates between pages instead of leaving the listing entirely.
  useEffect(() => {
    const pageParam = searchParams.get('page');
 
    if (!pageParam) {
      // Only reset to page 1 if we're not already on page 1
      // This prevents unnecessary state updates that can interfere with browser history
      if (page !== 1) {
        setPage(1);
      }
      return;
    }
 
    const parsed = parseInt(pageParam, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed !== page) {
      setPage(parsed);
    }
  }, [searchParams, page]);

  const updatePageInUrl = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextPage > 1) {
      params.set('page', String(nextPage));
    } else {
      params.delete('page');
    }

    const queryString = params.toString();
    const target = queryString ? `${pathname}?${queryString}` : pathname;

    // Use push so each page navigation creates a history entry
    router.push(target);
  };

  // Handle URL parameters on mount
  useEffect(() => {
    const countryParam = searchParams.get('country');
    if (countryParam) {
      setFilters(prev => ({
        ...prev,
        country: countryParam
      }));
    }
  }, [searchParams]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    setRequestedPage(null);
    updatePageInUrl(1);
  }, [
    filters.searchTerm,
    filters.category,
    filters.country,
    filters.minPrice,
    filters.maxPrice,
    filters.minYear,
    filters.maxYear,
    filters.metal,
    filters.rarity,
    filters.grade,
    filters.faceValue,
    filters.issueYear,
    filters.diameter,
    filters.weight,
    filters.mint,
    filters.era,
    filters.sortBy,
  ]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const filteredProducts = useMemo(() => {
    console.log('[ProductsPage] Starting filter with', products.length, 'products');
    console.log('[ProductsPage] Current filters:', filters);
    let filtered = [...products];

    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower) ||
          product.country?.toLowerCase().includes(searchLower) ||
          product.denomination?.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (filters.category && filters.category !== 'Toate Categoriile') {
      filtered = filtered.filter((product) => (product as any).category === filters.category);
    }

    // Apply country filter
    if (filters.country && filters.country !== 'Toate Țările') {
      filtered = filtered.filter((product) => product.country === filters.country);
    }

    // Apply price range filter only if user has set at least one bound.
    // Implicit (0 / 0) = fără filtru de preț.
    if (filters.minPrice || filters.maxPrice) {
      filtered = filtered.filter((product) => {
        if (filters.minPrice && product.price < filters.minPrice) return false;
        if (filters.maxPrice && product.price > filters.maxPrice) return false;
        return true;
      });
    }

    // Apply year range filter
    // Notă: dacă o piesă nu are anul setat, o păstrăm în listă,
    // altfel filtrul ar ascunde piesele fără an chiar și când gama este default.
    if (filters.minYear || filters.maxYear) {
      filtered = filtered.filter((product) => {
        if (!product.year) return true;
        return product.year >= filters.minYear && product.year <= filters.maxYear;
      });
    }

    // Apply metal filter
    if (filters.metal && filters.metal !== 'Toate Metalele') {
      filtered = filtered.filter((product) => product.metal === filters.metal);
    }

    // Apply rarity filter
    if (filters.rarity && filters.rarity !== 'Toate Raritățile') {
      filtered = filtered.filter((product) => product.rarity === filters.rarity);
    }

    // Apply grade filter
    if (filters.grade && filters.grade !== 'Toate Gradele') {
      filtered = filtered.filter((product) => product.grade === filters.grade);
    }

    // Apply Romanian coin filters (only when country is Romania)
    if (filters.country === 'România') {
      if (filters.faceValue && filters.faceValue !== 'Toate Valorile') {
        filtered = filtered.filter((product) => (product as any).faceValue === filters.faceValue);
      }
      if (filters.issueYear && filters.issueYear !== 'Toți Anii') {
        filtered = filtered.filter((product) => (product as any).issueYear === filters.issueYear);
      }
      if (filters.diameter && filters.diameter !== 'Toate Diametrele') {
        filtered = filtered.filter((product) => (product as any).diameter === filters.diameter);
      }
      if (filters.weight && filters.weight !== 'Toate Greutățile') {
        filtered = filtered.filter((product) => (product as any).weight === filters.weight);
      }
      if (filters.mint && filters.mint !== 'Toate Monetăriile') {
        filtered = filtered.filter((product) => (product as any).mint === filters.mint);
      }
      if (filters.era && filters.era !== 'Toate Epocile') {
        filtered = filtered.filter((product) => (product as any).era === filters.era);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'best-match':
          // Relevanță: implicit cele mai noi piese primele
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'newly-listed':
          // Adăugate recent: identic cu cele mai noi primele
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    console.log('[ProductsPage] Filtered products:', filtered.length);
    return filtered;
  }, [products, filters]);

  // Total items in catalog (server count). This is independent of how many pages we already loaded.
  const totalInCatalog = totalCount;

  // Prefetch next N pages so page navigation feels instant.
  // This keeps a buffer of (current page + PREFETCH_PAGES_AHEAD) loaded.
  useEffect(() => {
    if (loading || !hasMore) return;

    const targetCount = (page + PREFETCH_PAGES_AHEAD) * PAGE_SIZE;
    if (products.length < targetCount) {
      loadMore();
    }
  }, [page, products.length, loading, hasMore, loadMore, PAGE_SIZE, PREFETCH_PAGES_AHEAD]);

  // Ensure we have enough loaded products when user navigates to a higher page.
  useEffect(() => {
    if (!requestedPage) return;
    const neededCount = requestedPage * PAGE_SIZE;
    const loadedCount = products.length;

    if (loadedCount >= neededCount) {
      setPage(requestedPage);
      setRequestedPage(null);
      updatePageInUrl(requestedPage);
      return;
    }

    // Need more products from Firestore
    if (hasMore && !loading) {
      loadMore();
      return;
    }

    // No more products available; clamp to last available page
    const maxPage = Math.max(1, Math.ceil(Math.max(filteredProducts.length, loadedCount) / PAGE_SIZE));
    setPage(maxPage);
    setRequestedPage(null);
    updatePageInUrl(maxPage);
  }, [requestedPage, products.length, hasMore, loading, loadMore, PAGE_SIZE, filteredProducts.length]);

  const loadedPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const totalPagesKnown = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const effectiveMaxPage = hasMore ? Math.max(totalPagesKnown, loadedPages + 1) : totalPagesKnown;

  const pageStart = (page - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pagedProducts = filteredProducts.slice(pageStart, pageEnd);

  const goToPage = (nextPage: number) => {
    if (nextPage < 1) return;

    // If user tries to go beyond what we have loaded, request that page and trigger fetches.
    const neededCount = nextPage * PAGE_SIZE;
    if (products.length < neededCount && hasMore) {
      // Switch UI immediately to the requested page, then fetch in background.
      setPage(nextPage);
      setRequestedPage(nextPage);
      updatePageInUrl(nextPage);
      return;
    }

    const max = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
    const finalPage = Math.min(nextPage, max);
    setPage(finalPage);
    setRequestedPage(null);
    updatePageInUrl(finalPage);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          <p className="ml-4 text-slate-300">Se încarcă piesele...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('[ProductsPage] Failed to load products:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto rounded-2xl border border-red-500/30 bg-navy-900/80 p-8 shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
          <h1 className="text-2xl font-bold text-white mb-3">Nu s-au putut încărca piesele</h1>
          <p className="text-sm text-slate-300 mb-4">
            A apărut o eroare la încărcarea pieselor din baza de date.
          </p>
          <pre className="text-xs text-red-200 whitespace-pre-wrap break-words bg-black/30 rounded-lg p-4 border border-red-500/20">
            {error}
          </pre>
          <p className="text-xs text-slate-400 mt-4">
            Dacă eroarea conține „requires an index” sau „missing/insufficient permissions”, trebuie ajustate indexurile Firestore sau regulile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#e7b73c] mb-2">E-shop</h1>
        <p className="text-slate-200">
          Explorează colecția noastră de {totalInCatalog ?? '...'} piese
        </p>
      </div>

      {/* Filter Bar */}
      <FilterBar filters={filters} onFilterChange={setFilters} countryCounts={countryCounts} totalCount={totalInCatalog || 0} />

      {/* Results Summary */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-slate-300">
          Se afișează{' '}
          <span className="font-semibold text-gold-400">
            {requestedPage === page && pagedProducts.length === 0 ? '—' : pagedProducts.length}
          </span>{' '}
          piese
          {ownerId ? ' ale acestui vânzător' : ''} din{' '}
          <span className="font-semibold text-gold-400">{totalInCatalog ?? '...'}</span>
          {requestedPage === page && (
            <span className="ml-2 text-xs text-slate-400">(Se încarcă…)</span>
          )}
        </p>

        {/* View Toggle (Grid/List) */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-[#e7b73c] text-white shadow-[0_0_20px_rgba(231,183,60,0.6)]'
                : 'bg-navy-400/50 text-slate-300 hover:bg-navy-400'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-[#e7b73c] text-white shadow-[0_0_20px_rgba(231,183,60,0.6)]'
                : 'bg-navy-400/50 text-slate-300 hover:bg-navy-400'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <svg
            className="w-24 h-24 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">Nu s-au găsit piese</h3>
          <p className="text-slate-300 mb-6">
            {filters.searchTerm
              ? 'Încearcă să ajustezi căutarea sau filtrele'
              : 'Nu există piese disponibile momentan'}
          </p>
          {filters.searchTerm && (
            <button
              onClick={() =>
                setFilters({
                  ...filters,
                  searchTerm: '',
                  country: 'All Countries',
                  metal: 'All Metals',
                  rarity: 'All Rarities',
                  grade: 'All Grades',
                })
              }
              className="bg-gold-500 hover:bg-gold-600 text-white px-6 py-2 rounded-xl font-semibold transition-colors shadow-lg shadow-gold-500/30"
            >
              Șterge Filtrele
            </button>
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? "grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
            : "space-y-4"
        }>
          {pagedProducts.map((product) => (
            <ProductCard key={product.id} product={product} variant={viewMode} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredProducts.length > 0 && (
        <div className="mt-12 flex items-center justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || loading}
            className="px-4 py-2 rounded-lg border border-gold-500/30 bg-navy-800/60 text-slate-200 hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Înapoi
          </button>

          {/* Page numbers (windowed) */}
          {Array.from({ length: Math.min(5, effectiveMaxPage) }).map((_, idx) => {
            const start = Math.max(1, page - 2);
            const p = start + idx;
            if (p > effectiveMaxPage) return null;
            return (
              <button
                key={p}
                type="button"
                onClick={() => goToPage(p)}
                disabled={loading}
                className={
                  p === page
                    ? 'px-4 py-2 rounded-lg bg-gold-500 text-navy-900 font-semibold shadow-lg shadow-gold-500/30'
                    : 'px-4 py-2 rounded-lg border border-gold-500/30 bg-navy-800/60 text-slate-200 hover:bg-navy-800'
                }
              >
                {p}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={loading || (!hasMore && page >= totalPagesKnown) || requestedPage !== null}
            className="px-4 py-2 rounded-lg border border-gold-500/30 bg-navy-800/60 text-slate-200 hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {requestedPage === page || loading ? 'Se încarcă…' : 'Înainte →'}
          </button>
        </div>
      )}
    </div>
  );
}

function ProductsPageContent() {
  const { user, loading } = useAuth();

  if (loading) {
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
          <h1 className="text-2xl font-bold text-white mb-3">
            Catalogul este disponibil doar pentru utilizatori autentificați
          </h1>
          <p className="text-sm text-slate-300 mb-5">
            Pentru a vedea piesele, licitațiile și detaliile acestora, trebuie să te autentifici în contul tău. Fără
            autentificare poți accesa doar pagina principală și informațiile generale.
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

  return <ProductsListContent />;
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
            <p className="ml-4 text-slate-300">Se încarcă piesele...</p>
          </div>
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
