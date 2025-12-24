'use client';

import { useState, useMemo, Suspense, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuctions } from '../hooks/useAuctions';
import { useProducts } from '../hooks/useProducts';
import AuctionCard from '../components/AuctionCard';
import FilterBar, { FilterOptions } from '../components/FilterBar';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc, setDoc, Timestamp, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from 'shared/types';

function AuctionsListContent() {
  const [statusFilter, setStatusFilter] = useState<'active' | 'ended' | 'all'>('active');
  const [page, setPage] = useState(1);
  const [requestedPage, setRequestedPage] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const PAGE_SIZE = 20;
  const PREFETCH_PAGES_AHEAD = 3;
  
  // Use dynamic status based on filter
  const statusForFetch = statusFilter === 'all' ? undefined : statusFilter;
  const { auctions, loading: auctionsLoading, error: auctionsError, hasMore, loadMore } = useAuctions(statusForFetch, PAGE_SIZE);

  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Fetch total count for the current status tab (so the summary can be "X din Y")
  useEffect(() => {
    const fetchTotalCount = async () => {
      try {
        if (!db) {
          setTotalCount(null);
          return;
        }

        let qTotal;
        if (statusForFetch) {
          // Single-status tab (active / ended)
          qTotal = query(collection(db, 'auctions'), where('status', '==', statusForFetch));
        } else {
          // "Toate licitațiile" – limit to statuses allowed by security rules
          qTotal = query(
            collection(db, 'auctions'),
            where('status', 'in', ['active', 'ended'])
          );
        }

        const snap = await getCountFromServer(qTotal);
        setTotalCount(snap.data().count);
      } catch (err) {
        console.error('[AuctionsPage] Error fetching total count:', err);
        setTotalCount(null);
      }
    };

    fetchTotalCount();
  }, [statusForFetch]);

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
          let q;
          if (statusForFetch) {
            q = query(
              collection(db, 'auctions'),
              where('country', '==', country),
              where('status', '==', statusForFetch),
            );
          } else {
            q = query(
              collection(db, 'auctions'),
              where('country', '==', country),
              where('status', 'in', ['active', 'ended']),
            );
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
  }, [statusForFetch]);
	// Fetch all fields needed for filtering and display.
	// IMPORTANT: use listingType = 'all' so we also load products listed as 'auction'.
	const { products, loading: productsLoading } = useProducts(
		undefined, // ownerId
		PAGE_SIZE,
		['name', 'images', 'price', 'description', 'category', 'country', 'year', 'metal', 'rarity', 'grade', 'denomination', 'createdAt', 'updatedAt'],
		true,
		'all',
	);
  
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    category: 'Toate Categoriile',
    country: 'Toate Țările',
    // 0 values mean "no filter" for price and year
    minPrice: 0,
    maxPrice: 0,
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

  // Create a map of products for quick lookup
  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      map.set(product.id, product);
    });
    return map;
  }, [products]);

  // Fetch missing products that aren't in the initial 20 and auto-approve pending ones
  const [missingProducts, setMissingProducts] = useState<Map<string, Product>>(new Map());

  useEffect(() => {
    const fetchAndFixMissingProducts = async () => {
      const missingIds: string[] = [];
      const now = new Date();
      
      // Find auction productIds that aren't in productMap and check for ended auctions
      auctions.forEach((auction) => {
        // Check if auction has ended based on endTime
        if (auction.status === 'active' && new Date(auction.endTime) < now) {
          console.log(`[AuctionsPage] Auto-ending auction ${auction.id} (endTime: ${auction.endTime})`);
          // Update auction status to ended
          updateDoc(doc(db, 'auctions', auction.id), {
            status: 'ended',
            updatedAt: Timestamp.now(),
          }).catch(err => console.error('Failed to end auction:', err));
        }
        
        if (!productMap.has(auction.productId)) {
          missingIds.push(auction.productId);
        }
      });

      if (missingIds.length === 0) {
        setMissingProducts(new Map());
        return;
      }

      // Fetch each missing product individually and auto-approve if pending
      const newMissingProducts = new Map<string, Product>();
      await Promise.all(
        missingIds.map(async (productId) => {
          try {
            const productDoc = await getDoc(doc(db, 'products', productId));
            if (productDoc.exists()) {
              const data = productDoc.data() as any;
              
              // Auto-approve product if it's pending and has an active auction
              if (data.status === 'pending') {
                console.log(`[AuctionsPage] Auto-approving product ${productId} for active auction`);
                await updateDoc(doc(db, 'products', productId), {
                  status: 'approved',
                  updatedAt: Timestamp.now(),
                });
                // Update the local data to reflect the approved status
                data.status = 'approved';
              }
              
              const product: Product = {
                id: productDoc.id,
                name: data.name || 'Unknown Product',
                description: data.description || '',
                images: data.images || [],
                price: data.price || 0,
                ownerId: data.ownerId || '',
                status: 'approved',
                listingType: data.listingType,
                country: data.country,
                year: data.year,
                era: data.era,
                denomination: data.denomination,
                metal: data.metal,
                rarity: data.rarity,
                grade: data.grade,
                category: data.category,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
              };
              newMissingProducts.set(productId, product);
            }
          } catch (error) {
            console.error('Failed to fetch/fix product:', productId, error);
          }
        })
      );

      setMissingProducts(newMissingProducts);
    };

    fetchAndFixMissingProducts();
  }, [auctions, productMap]);

  // Combined product map including fetched missing products
  const fullProductMap = useMemo(() => {
    const map = new Map(productMap);
    missingProducts.forEach((product, id) => {
      map.set(id, product);
    });
    return map;
  }, [productMap, missingProducts]);

  const filteredAuctions = useMemo(() => {
    console.log('[AuctionsPage] Starting filter with', auctions.length, 'auctions');
    console.log('[AuctionsPage] ProductMap size:', productMap.size);
    console.log('[AuctionsPage] Current filters:', filters);
    console.log('[AuctionsPage] Status filter:', statusFilter);
    let filtered = [...auctions];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((auction) => auction.status === statusFilter);
    }

    // Filter out auctions that have ended (past their endTime) - only for active view
    // This is a client-side safety check for auctions that weren't properly ended server-side
    const now = new Date();
    if (statusFilter === 'active') {
      filtered = filtered.filter((auction) => {
        // If the auction status is 'active' but endTime has passed, it should be considered ended
        if (new Date(auction.endTime) < now) {
          console.log(`[AuctionsPage] Auto-ending auction ${auction.id} (endTime: ${auction.endTime})`);
          // Update auction status to ended (fire and forget)
          updateDoc(doc(db, 'auctions', auction.id), {
            status: 'ended',
            updatedAt: Timestamp.now(),
          }).catch(err => console.error('Failed to end auction:', err));
          return false;
        }
        return true;
      });
    }

    // Apply filters based on associated product data
    filtered = filtered.filter((auction) => {
      const product = fullProductMap.get(auction.productId);
      if (!product) {
        console.log('[AuctionsPage] No product found for auction:', auction.id, 'productId:', auction.productId);
        return false;
      }

      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch =
          product.name.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower) ||
          product.country?.toLowerCase().includes(searchLower) ||
          product.denomination?.toLowerCase().includes(searchLower) ||
          auction.id.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category && filters.category !== 'Toate Categoriile') {
        if (product.category !== filters.category) return false;
      }

      // Country filter
      if (filters.country && filters.country !== 'Toate Țările') {
        if (product.country !== filters.country) return false;
      }

      // Price range filter (using current bid or reserve price)
      const auctionPrice = auction.currentBid || auction.reservePrice;
      if (filters.minPrice > 0 || filters.maxPrice > 0) {
        if (filters.minPrice > 0 && auctionPrice < filters.minPrice) {
          return false;
        }
        if (filters.maxPrice > 0 && auctionPrice > filters.maxPrice) {
          return false;
        }
      }

      // Year range filter
      if (filters.minYear > 0 || filters.maxYear > 0) {
        // Keep auctions whose product year is missing, even when year filter is active
        if (!product.year) return true;

        if (filters.minYear > 0 && product.year < filters.minYear) {
          return false;
        }
        if (filters.maxYear > 0 && product.year > filters.maxYear) {
          return false;
        }
      }

      // Metal filter
      if (filters.metal && filters.metal !== 'Toate Metalele') {
        if (product.metal !== filters.metal) return false;
      }

      // Rarity filter
      if (filters.rarity && filters.rarity !== 'Toate Raritățile') {
        if (product.rarity !== filters.rarity) return false;
      }

      // Grade filter
      if (filters.grade && filters.grade !== 'Toate Gradele') {
        if (product.grade !== filters.grade) return false;
      }

      // Romanian coin filters (only when country is Romania)
      if (filters.country === 'România') {
        if (filters.faceValue && filters.faceValue !== 'Toate Valorile') {
          if ((product as any).faceValue !== filters.faceValue) return false;
        }
        if (filters.issueYear && filters.issueYear !== 'Toți Anii') {
          if ((product as any).issueYear !== filters.issueYear) return false;
        }
        if (filters.diameter && filters.diameter !== 'Toate Diametrele') {
          if ((product as any).diameter !== filters.diameter) return false;
        }
        if (filters.weight && filters.weight !== 'Toate Greutățile') {
          if ((product as any).weight !== filters.weight) return false;
        }
        if (filters.mint && filters.mint !== 'Toate Monetăriile') {
          if ((product as any).mint !== filters.mint) return false;
        }
        if (filters.era && filters.era !== 'Toate Epocile') {
          if ((product as any).era !== filters.era) return false;
        }
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      const productA = fullProductMap.get(a.productId);
      const productB = fullProductMap.get(b.productId);

      switch (filters.sortBy) {
        case 'best-match':
          // For now, sort by relevance (ending soonest as default)
          return a.endTime.getTime() - b.endTime.getTime();
        case 'price-asc':
          return (a.currentBid || a.reservePrice) - (b.currentBid || b.reservePrice);
        case 'price-desc':
          return (b.currentBid || b.reservePrice) - (a.currentBid || a.reservePrice);
        case 'ending-soonest':
          return a.endTime.getTime() - b.endTime.getTime();
        case 'newly-listed':
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return a.endTime.getTime() - b.endTime.getTime();
      }
    });

    console.log('[AuctionsPage] Filtered auctions:', filtered.length);
    console.log('[AuctionsPage] Full product map size:', fullProductMap.size);
    return filtered;
  }, [auctions, fullProductMap, filters, statusFilter]);

 // Keep page state in sync with ?page=N in the URL so browser back/forward
 // navigates between pages instead of leaving the listing entirely.
 useEffect(() => {
   const pageParam = searchParams.get('page');

   if (!pageParam) {
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

 // Prefetch next N pages so page navigation feels instant.
 // This keeps a buffer of (current page + PREFETCH_PAGES_AHEAD) loaded.
 useEffect(() => {
   if (auctionsLoading || !hasMore) return;

   const targetCount = (page + PREFETCH_PAGES_AHEAD) * PAGE_SIZE;
   if (auctions.length < targetCount) {
     loadMore();
   }
 }, [page, auctions.length, auctionsLoading, hasMore, loadMore, PAGE_SIZE, PREFETCH_PAGES_AHEAD]);

 // Ensure we have enough loaded auctions when user navigates to a higher page.
 useEffect(() => {
   if (!requestedPage) return;
   const neededCount = requestedPage * PAGE_SIZE;
   const loadedCount = auctions.length;

   if (loadedCount >= neededCount) {
     setPage(requestedPage);
     setRequestedPage(null);
     updatePageInUrl(requestedPage);
     return;
   }

   // Need more auctions from Firestore
   if (hasMore && !auctionsLoading) {
     loadMore();
     return;
   }

   // No more auctions available; clamp to last available page
   const maxPage = Math.max(1, Math.ceil(Math.max(filteredAuctions.length, loadedCount) / PAGE_SIZE));
   setPage(maxPage);
   setRequestedPage(null);
   updatePageInUrl(maxPage);
 }, [requestedPage, auctions.length, hasMore, auctionsLoading, loadMore, PAGE_SIZE, filteredAuctions.length]);

 const loadedPages = Math.max(1, Math.ceil(auctions.length / PAGE_SIZE));
 const totalPagesKnown = Math.max(1, Math.ceil(filteredAuctions.length / PAGE_SIZE));
 const effectiveMaxPage = hasMore ? Math.max(totalPagesKnown, loadedPages + 1) : totalPagesKnown;

 const pageStart = (page - 1) * PAGE_SIZE;
 const pageEnd = pageStart + PAGE_SIZE;
 const pagedAuctions = filteredAuctions.slice(pageStart, pageEnd);

 const goToPage = (nextPage: number) => {
   if (nextPage < 1) return;

   // If user tries to go beyond what we have loaded, request that page and trigger fetches.
   const neededCount = nextPage * PAGE_SIZE;
   if (auctions.length < neededCount && hasMore) {
     // Switch UI immediately to the requested page, then fetch in background.
     setPage(nextPage);
     setRequestedPage(nextPage);
     updatePageInUrl(nextPage);
     return;
   }

   const max = Math.max(1, Math.ceil(filteredAuctions.length / PAGE_SIZE));
   const finalPage = Math.min(nextPage, max);
   setPage(finalPage);
   setRequestedPage(null);
   updatePageInUrl(finalPage);
 };

 const loading = auctionsLoading || productsLoading;
 const error = auctionsError;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          <p className="ml-4 text-slate-300">Se încarcă licitațiile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/50 border border-red-500/50 rounded-2xl p-6 text-center backdrop-blur-sm">
          <svg
            className="w-12 h-12 text-red-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-red-200 mb-2">Eroare la încărcarea licitațiilor</h3>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Licitații Active</h1>
        <p className="text-slate-300">
          Licitează pentru {totalCount ?? filteredAuctions.length} piese numismatice
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gold-500/20">
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            statusFilter === 'active'
              ? 'border-gold-500 text-gold-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Licitații Active
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            statusFilter === 'all'
              ? 'border-gold-500 text-gold-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Toate Licitațiile
        </button>
        <button
          onClick={() => setStatusFilter('ended')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            statusFilter === 'ended'
              ? 'border-gold-500 text-gold-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Licitații Încheiate
        </button>
      </div>

      {/* Filter Bar */}
      <FilterBar filters={filters} onFilterChange={setFilters} showAuctionFilters={true} countryCounts={countryCounts} totalCount={totalCount || 0} />

      {/* Results Summary */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-slate-300">
          Se afișează{' '}
          <span className="font-semibold text-gold-400">
            {requestedPage === page && pagedAuctions.length === 0 ? '—' : pagedAuctions.length}
          </span>{' '}
          licitații din <span className="font-semibold text-gold-400">{totalCount ?? '...'}</span>
          {requestedPage === page && (
            <span className="ml-2 text-xs text-slate-400">(Se încarcă…)</span>
          )}
        </p>
        
        {/* View Toggle */}
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

      {/* Auctions Grid */}
      {filteredAuctions.length === 0 ? (
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
          <h3 className="text-xl font-semibold text-white mb-2">Nu s-au găsit licitații</h3>
          <p className="text-slate-300 mb-6">
            {filters.searchTerm
              ? 'Încearcă să ajustezi căutarea sau filtrele'
              : 'Nu există licitații disponibile momentan'}
          </p>
         {filters.searchTerm && (
           <button
             onClick={() =>
               setFilters({
                 ...filters,
                 searchTerm: '',
                 category: 'Toate Categoriile',
                 country: 'Toate Țările',
                 metal: 'Toate Metalele',
                 rarity: 'Toate Raritățile',
                 grade: 'Toate Gradele',
                 // Reset numeric filters to "no filter"
                 minPrice: 0,
                 maxPrice: 0,
                 minYear: 0,
                 maxYear: 0,
                 sortBy: 'best-match',
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
            ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "space-y-4"
        }>
          {pagedAuctions.map((auction) => (
            <div key={auction.id} className={
              viewMode === 'list'
                ? "flex bg-navy-800/50 rounded-xl border border-[#e7b73c]/20 p-4 hover:border-[#e7b73c]/40 transition-colors"
                : ""
            }>
              <AuctionCard auction={auction} />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredAuctions.length > 0 && (
        <div className="mt-12 flex items-center justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || loading}
            className="px-4 py-2 rounded-lg border border-gold-500/30 bg-navy-800/60 text-slate-200 hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Înapoi
          </button>

          {/* Page numbers (all pages) */}
          {Array.from({ length: effectiveMaxPage }).map((_, idx) => {
            const p = idx + 1;
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

function AuctionsPageContent() {
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
            Licitațiile sunt disponibile doar pentru utilizatori autentificați
          </h1>
          <p className="text-sm text-slate-300 mb-5">
            Pentru a vedea licitațiile active și a participa la licitații, trebuie să te autentifici în contul tău.
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

  return <AuctionsListContent />;
}

export default function AuctionsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
            <p className="ml-4 text-slate-300">Se încarcă licitațiile...</p>
          </div>
        </div>
      }
    >
      <AuctionsPageContent />
    </Suspense>
  );
}
