'use client';

import { useState, useEffect } from 'react';
import MintProductCard from '../components/MintProductCard';
import LoadingSpinner from '../components/LoadingSpinner';

interface RawProduct {
  title: string;
  product_url: string;
  product_id: string;
  price: string;
  price_without_vat: string;
  category: string;
  category_slug: string;
  stock: string;
  model: string;
  sku: string;
  price_full: string;
  full_description: string;
  specifications: string;
  images_downloaded: number;
  image_files: string;
}

interface TransformedProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  category: string;
  image: string;
  link: string;
}

export default function MonetariaStatuluiPage() {
  const [products, setProducts] = useState<TransformedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  // Monetaria Statului filters
  const [material, setMaterial] = useState<string>('Toate Materialele');
  const [diameter, setDiameter] = useState<string>('Toate Diametrele');
  const [weight, setWeight] = useState<string>('Toate Greutățile');
  const [quality, setQuality] = useState<string>('Toate Calitățile');

  // Normalize material names to remove duplicates
  const normalizeMaterial = (material: string): string => {
    if (!material) return material;
    const normalized = material
      .toLowerCase()
      .replace(/[:\s]+/g, ' ')  // Replace colons and multiple spaces with single space
      .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
      .trim();
    
    // Map common variations to standard names
    const materialMap: { [key: string]: string } = {
      'argint 999‰': 'Argint 999‰',
      'argint 925‰': 'Argint 925‰',
      'aliaj de cupru': 'Aliaj de cupru',
      'aliaj cupru': 'Aliaj de cupru',
      'aliaj: cupru': 'Aliaj de cupru',
      'aliaj din cupru': 'Aliaj de cupru',
      'cupru': 'Aliaj de cupru',
      'tombac argintat': 'Tombac argintat',
    };
    
    return materialMap[normalized] || material;
  };

  // Normalize diameter values to remove duplicates
  const normalizeDiameter = (diameter: string): string => {
    if (!diameter) return diameter;
    return diameter
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\s*mm\s*/i, ' mm')  // Standardize "mm" format
      .trim();
  };

  // Normalize weight values to remove duplicates
  const normalizeWeight = (weight: string): string => {
    if (!weight) return weight;
    return weight
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\s*grame\s*/i, ' grame')  // Standardize "grame" format
      .replace(/\s*gram\s*/i, ' grame')  // Standardize "gram" to "grame"
      .trim();
  };

  // Normalize quality values to remove duplicates
  const normalizeQuality = (quality: string): string => {
    if (!quality) return quality;
    const normalized = quality
      .toLowerCase()
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/-\s+/g, '-')  // Fix spacing after dash
      .replace(/\s+-/g, '-')  // Fix spacing before dash
      .trim();
    
    // Map common variations to standard names
    const qualityMap: { [key: string]: string } = {
      'patinata': 'patinată',
      'sablata - patinata': 'sablată - patinată',
      'sablata-patinata': 'sablată - patinată',
      'proof like': 'proof like',
      'proof': 'proof',
      'clasica': 'clasică',
    };
    
    return qualityMap[normalized] || quality;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/monetaria-data.json');
        if (!response.ok) throw new Error('Failed to load data');
        const data = await response.json();

        // Validate data structure
        if (!data || !data.products || !Array.isArray(data.products)) {
          throw new Error('Invalid data format: missing products array');
        }

        const transformedProducts = data.products.map((p: RawProduct) => {
          // Extract properties from specifications
          const specs = p.specifications || '';
          
          // Helper function to extract and clean material values
          const extractMaterial = (text: string): string => {
            text = text.trim().replace(/\u200B/g, ''); // Remove zero-width spaces
            
            if (text === "Toate Materialele") return text;
            
            // Split by pipe and take first part
            let material = text.split('|')[0].trim();
            
            // Remove specifications (numbers, dimensions, quality, mintage)
            material = material
                .replace(/\s+\d+\s*mm.*$/i, '')
                .replace(/\s+(Tiraj|Diametru|Greutate|Calitate|Pret)[\s:].*$/i, '')
                .replace(/\s+(proof|patinată|sablată|bucăți|grame).*$/i, '')
                .replace(/\s*‰\s*/g, '‰')
                .replace(/;+$/, '')
                .trim();
            
            // Normalize variations
            const lower = material.toLowerCase();
            if (/argint.*999/.test(lower)) return "Argint 999‰";
            if (/argint.*925/.test(lower)) return "Argint 925‰";
            if (/aliaj.*cupru.*argintat/.test(lower)) return "Aliaj de cupru argintat";
            if (/aliaj.*cupru/.test(lower)) return "Aliaj de cupru";
            if (lower === 'cupru') return "Cupru";
            if (/tombac.*argintat/.test(lower)) return "Tombac argintat";
            if (lower === 'tombac') return "Tombac";
            
            return material;
          };
          
          // Helper function to extract and clean diameter values
          const extractDiameter = (text: string): string => {
            text = text.trim().replace(/\u200B/g, '');
            
            if (text === "Toate Diametrele") return text;
            
            // Split by pipe and take first part
            let diameter = text.split('|')[0].trim();
            
            // Remove extra specifications
            diameter = diameter
                .replace(/\s+(Tiraj|Greutate|Calitate|Pret)[\s:].*$/i, '')
                .replace(/\s+(proof|patinată|sablată|bucăți|grame).*$/i, '')
                .replace(/;+$/, '')
                .trim();
            
            return diameter;
          };
          
          // Helper function to extract and clean weight values
          const extractWeight = (text: string): string => {
            text = text.trim().replace(/\u200B/g, '');
            
            if (text === "Toate Greutățile") return text;
            
            // Split by pipe and take first part
            let weight = text.split('|')[0].trim();
            
            // Remove extra specifications
            weight = weight
                .replace(/\s+(Tiraj|Diametru|Greutate|Calitate|Pret)[\s:].*$/i, '')
                .replace(/\s+(proof|patinată|sablată|bucăți|grame).*$/i, '')
                .replace(/;+$/, '')
                .trim();
            
            return weight;
          };
          
          // Helper function to extract and clean quality values
          const extractQuality = (text: string): string => {
            text = text.trim().replace(/\u200B/g, '');
            
            if (text === "Toate Calitățile") return text;
            
            // Split by pipe and take first part
            let quality = text.split('|')[0].trim();
            
            // Remove extra specifications
            quality = quality
                .replace(/\s+(Tiraj|Diametru|Greutate|Pret)[\s:].*$/i, '')
                .replace(/\s+(proof|patinată|sablată|bucăți|grame).*$/i, '')
                .replace(/;+$/, '')
                .trim();
            
            // Normalize variations
            const lower = quality.toLowerCase();
            if (/patinată/.test(lower)) return "patinată";
            if (/sablată.*patinată/.test(lower)) return "sablată - patinată";
            if (/sablată/.test(lower)) return "sablată";
            if (/proof.*like/.test(lower)) return "proof like";
            if (/proof/.test(lower)) return "proof";
            if (/clasică/.test(lower)) return "clasică";
            
            return quality;
          };
          
          // Extract each property
          const material = extractMaterial(specs);
          const diameter = extractDiameter(specs);
          const weight = extractWeight(specs);
          const quality = extractQuality(specs);

          return {
            ...p,
            id: p.product_id,
            title: p.title || 'Piesă fără titlu',
            description: p.full_description,
            price: p.price,
            category: p.category,
            image: `/Monetaria_statului/romanian_mint_products/${p.category_slug}/${p.image_files}`,
            link: `/monetaria-statului/${p.product_id}`,
            diameter: normalizeDiameter(diameter),
            weight: normalizeWeight(weight),
            mint: normalizeMaterial(material),
            era: normalizeQuality(quality),
          };
        });
        setProducts(transformedProducts);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Restore page state from localStorage on mount
  useEffect(() => {
    const savedPage = localStorage.getItem('monetaria-page');
    if (savedPage) {
      setCurrentPage(parseInt(savedPage, 10));
    }
  }, []);

  // Save page state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('monetaria-page', currentPage.toString());
  }, [currentPage]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, material, diameter, weight, quality]);

  // Calculate dynamic filter options based on current selections
  const getFilteredProductsExcluding = (excludeFilter: string) => {
    let baseProducts = selectedCategory === 'all' ? products : products.filter(p => p.category === selectedCategory);

    // Apply current filters EXCEPT the one we're calculating options for
    if (excludeFilter !== 'material' && material !== 'Toate Materialele') {
      baseProducts = baseProducts.filter(p => normalizeMaterial((p as any).mint) === normalizeMaterial(material));
    }
    if (excludeFilter !== 'diameter' && diameter !== 'Toate Diametrele') {
      baseProducts = baseProducts.filter(p => normalizeDiameter((p as any).diameter) === normalizeDiameter(diameter));
    }
    if (excludeFilter !== 'weight' && weight !== 'Toate Greutățile') {
      baseProducts = baseProducts.filter(p => normalizeWeight((p as any).weight) === normalizeWeight(weight));
    }
    if (excludeFilter !== 'quality' && quality !== 'Toate Calitățile') {
      baseProducts = baseProducts.filter(p => normalizeQuality((p as any).era) === normalizeQuality(quality));
    }

    return baseProducts;
  };

  // Calculate available options for each filter based on other filters
  const availableMaterials = ['Toate Materialele', ...new Set(getFilteredProductsExcluding('material').map(p => normalizeMaterial((p as any).mint)).filter(Boolean))];
  const availableDiameters = ['Toate Diametrele', ...new Set(getFilteredProductsExcluding('diameter').map(p => normalizeDiameter((p as any).diameter)).filter(Boolean))];
  const availableWeights = ['Toate Greutățile', ...new Set(getFilteredProductsExcluding('weight').map(p => normalizeWeight((p as any).weight)).filter(Boolean))];
  const availableQualities = ['Toate Calitățile', ...new Set(getFilteredProductsExcluding('quality').map(p => normalizeQuality((p as any).era)).filter(Boolean))];

  const categories = ['all', ...new Set(products.map(p => p.category))];
  let filteredProducts = selectedCategory === 'all' ? products : products.filter(p => p.category === selectedCategory);

  // Apply Monetaria Statului filters
  if (material !== 'Toate Materialele') {
    filteredProducts = filteredProducts.filter(p => normalizeMaterial((p as any).mint) === normalizeMaterial(material));
  }
  if (diameter !== 'Toate Diametrele') {
    filteredProducts = filteredProducts.filter(p => normalizeDiameter((p as any).diameter) === normalizeDiameter(diameter));
  }
  if (weight !== 'Toate Greutățile') {
    filteredProducts = filteredProducts.filter(p => normalizeWeight((p as any).weight) === normalizeWeight(weight));
  }
  if (quality !== 'Toate Calitățile') {
    filteredProducts = filteredProducts.filter(p => normalizeQuality((p as any).era) === normalizeQuality(quality));
  }

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center py-12 text-red-500">Error loading products: {error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-900 via-navy-950 to-black py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Monetăria Statului</h1>
          <p className="text-lg text-slate-200 max-w-2xl mx-auto">
            Tradiție și Excelență Fondată în 1870, Monetăria Statului este standardul pentru monedă și artefacte prețioase în România.
          </p>
        </div>

        {/* Category Selection */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-gold-500 text-navy-900'
                  : 'bg-navy-800 text-white hover:bg-navy-700'
              }`}
            >
              {category === 'all' ? 'Toate categoriile' : category}
            </button>
          ))}
        </div>

        {/* Monetaria Statului Filters */}
        {products.length > 0 && (
          <div className="bg-navy-800/50 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">Filtre Piese Monetaria Statului</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Material</label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gold-500/30 bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  {availableMaterials.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Diametru</label>
                <select
                  value={diameter}
                  onChange={(e) => setDiameter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gold-500/30 bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  {availableDiameters.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Greutate</label>
                <select
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gold-500/30 bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  {availableWeights.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Calitate</label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gold-500/30 bg-navy-900/70 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  {availableQualities.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {currentProducts.map((product) => (
            <MintProductCard key={product.id} product={product} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap justify-center gap-2 overflow-x-auto max-w-full pb-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-navy-800 text-white rounded disabled:opacity-50 whitespace-nowrap"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded whitespace-nowrap ${page === currentPage ? 'bg-gold-500 text-navy-900' : 'bg-navy-800 text-white'}`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-navy-800 text-white rounded disabled:opacity-50 whitespace-nowrap"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
