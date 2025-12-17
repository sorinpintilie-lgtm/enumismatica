'use client';

import { useState, useEffect } from 'react';

export interface FilterOptions {
  searchTerm: string;
  country: string;
  minPrice: number;
  maxPrice: number;
  minYear: number;
  maxYear: number;
  metal: string;
  rarity: string;
  grade: string;
  // Romanian coin specific filters
  faceValue: string;
  issueYear: string;
  diameter: string;
  weight: string;
  mint: string;
  era: string;
  // Common sort options used by both products and auctions.
  // Products will only expose a subset (best-match, price-asc/desc, newly-listed),
  // while auctions can also expose "ending-soonest".
  sortBy: 'best-match' | 'price-asc' | 'price-desc' | 'ending-soonest' | 'newly-listed';
}

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  showAuctionFilters?: boolean;
}

const countries = [
  'Toate Țările',
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

const metals = [
  'Toate Metalele',
  'Aur',
  'Argint',
  'Bronz',
  'Cupru',
  'Nichel',
  'Platină',
];

const rarities = [
  'Toate Raritățile',
  'comună',
  'neobișnuită',
  'rară',
  'foarte rară',
  'extrem de rară',
];

const grades = [
  'Toate Gradele',
  'Slabă',
  'Acceptabilă',
  'Bună',
  'VG',
  'Fină',
  'VF',
  'XF',
  'AU',
  'MS-60',
  'MS-65',
  'MS-70',
];

const romanianFaceValues = [
  'Toate Valorile',
];

const romanianDiameters = [
  'Toate Diametrele',
];

const romanianWeights = [
  'Toate Greutățile',
];

const romanianMints = [
  'Toate Monetăriile',
];

const romanianEras = [
  'Toate Epocile',
];

export default function FilterBar({ filters, onFilterChange, showAuctionFilters = false }: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  const [romanianOptions, setRomanianOptions] = useState({
    faceValues: ['Toate Valorile'],
    issueYears: ['Toți Anii'],
    diameters: ['Toate Diametrele'],
    weights: ['Toate Greutățile'],
    mints: ['Toate Monetăriile'],
    eras: ['Toate Epocile'],
  });
  const [romanianOptionsLoaded, setRomanianOptionsLoaded] = useState(false);

  useEffect(() => {
    const loadRomanianOptions = async () => {
      try {
        const response = await fetch('/products.json');
        if (!response.ok) throw new Error('Failed to load products.json');
        const data = await response.json();

        const faceValues = ['Toate Valorile', ...new Set(data.map((item: any) => item.face_value))];
        const issueYears = ['Toți Anii', ...new Set(data.map((item: any) => item.issue_year))];
        const diameters = ['Toate Diametrele', ...new Set(data.map((item: any) => item.diameter))];
        const weights = ['Toate Greutățile', ...new Set(data.map((item: any) => item.weight))];
        const mints = ['Toate Monetăriile', ...new Set(data.map((item: any) => item.mint_or_theme))];
        const eras = ['Toate Epocile', ...new Set(data.map((item: any) => item.era))];

        setRomanianOptions({
          faceValues: faceValues as string[],
          issueYears: issueYears as string[],
          diameters: diameters as string[],
          weights: weights as string[],
          mints: mints as string[],
          eras: eras as string[],
        });
        setRomanianOptionsLoaded(true);
      } catch (error) {
        console.error('Error loading Romanian coin options:', error);
      }
    };

    loadRomanianOptions();
  }, []);

  const handleFilterUpdate = (key: keyof FilterOptions, value: any) => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (!isNaN(numValue)) {
      handleFilterUpdate(type === 'min' ? 'minPrice' : 'maxPrice', numValue);
    }
  };

  const handleYearChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? 0 : parseInt(value);
    if (!isNaN(numValue)) {
      handleFilterUpdate(type === 'min' ? 'minYear' : 'maxYear', numValue);
    }
  };

  const resetFilters = () => {
    const defaultFilters: FilterOptions = {
      searchTerm: '',
      country: 'România',
      // 0 / 0 = fără filtru de preț; utilizatorul setează limite doar dacă dorește.
      minPrice: 0,
      maxPrice: 0,
      // 0 / 0 = fără filtru de ani; utilizatorul setează anii doar dacă dorește.
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
    };
    setLocalFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div className="bg-gradient-to-br from-navy-900 via-navy-950 to-black rounded-2xl border border-[#e7b73c]/40 shadow-[0_18px_55px_rgba(0,0,0,0.9)] p-6 mb-6 text-slate-100">
      {/* Search and Quick Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        {/* Search Bar */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Caută monede după nume, descriere..."
            value={localFilters.searchTerm}
            onChange={(e) => handleFilterUpdate('searchTerm', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#e7b73c]/40 bg-navy-900/70 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
          />
        </div>

        {/* Sort By */}
        <div className="lg:w-64">
          <select
            value={localFilters.sortBy}
            onChange={(e) => handleFilterUpdate('sortBy', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#e7b73c]/40 bg-navy-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23e7b73c' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 12px center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '16px 12px'
            }}
          >
            {showAuctionFilters ? (
              <>
                <option value="best-match" className="bg-navy-900 text-slate-100">Relevanță</option>
                <option value="price-asc" className="bg-navy-900 text-slate-100">Preț: Crescător</option>
                <option value="price-desc" className="bg-navy-900 text-slate-100">Preț: Descrescător</option>
                <option value="ending-soonest" className="bg-navy-900 text-slate-100">Se termină cel mai repede</option>
                <option value="newly-listed" className="bg-navy-900 text-slate-100">Adăugate recent</option>
              </>
            ) : (
              <>
                <option value="best-match" className="bg-navy-900 text-slate-100">Relevanță</option>
                <option value="price-asc" className="bg-navy-900 text-slate-100">Preț: Crescător</option>
                <option value="price-desc" className="bg-navy-900 text-slate-100">Preț: Descrescător</option>
                <option value="newly-listed" className="bg-navy-900 text-slate-100">Adăugate recent</option>
              </>
            )}
          </select>
        </div>

        {/* Toggle Advanced Filters */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="lg:w-auto px-6 py-3 bg-[#e7b73c] hover:bg-[#f0c955] text-[#000940] rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[0_0_20px_rgba(231,183,60,0.7)]"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Filtre
        </button>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="border-t border-[#e7b73c]/25 pt-6 space-y-6">
          {/* Country and Metal */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-100 mb-2">Țară</label>
              <select
                value={localFilters.country}
                onChange={(e) => handleFilterUpdate('country', e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-[#e7b73c]/30 bg-navy-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent appearance-none cursor-pointer"
              >
                {countries.map((country) => (
                  <option key={country} value={country} className="bg-navy-900 text-slate-100">
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-100 mb-2">Metal</label>
              <select
                value={localFilters.metal}
                onChange={(e) => handleFilterUpdate('metal', e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-[#e7b73c]/30 bg-navy-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent appearance-none cursor-pointer"
              >
                {metals.map((metal) => (
                  <option key={metal} value={metal} className="bg-navy-900 text-slate-100">
                    {metal}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-100 mb-2">Raritate</label>
              <select
                value={localFilters.rarity}
                onChange={(e) => handleFilterUpdate('rarity', e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-[#e7b73c]/30 bg-navy-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent appearance-none cursor-pointer"
              >
                {rarities.map((rarity) => (
                  <option key={rarity} value={rarity} className="bg-navy-900 text-slate-100">
                    {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grade */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-100 mb-2">Grad</label>
              <select
                value={localFilters.grade}
                onChange={(e) => handleFilterUpdate('grade', e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-[#e7b73c]/30 bg-navy-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent appearance-none cursor-pointer"
              >
                {grades.map((grade) => (
                  <option key={grade} value={grade} className="bg-navy-900 text-slate-100">
                    {grade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Romanian Coin Filters - Only show when country is Romania and options loaded */}
          {localFilters.country === 'România' && romanianOptionsLoaded && (
            <>
              <div className="border-t border-[#e7b73c]/25 pt-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Filtre Monede Românești</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-100 mb-2">Valoare Nominală</label>
                    <select
                      value={localFilters.faceValue}
                      onChange={(e) => handleFilterUpdate('faceValue', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-[#e7b73c]/30 bg-navy-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent appearance-none cursor-pointer"
                    >
                      {romanianOptions.faceValues.map((value) => (
                        <option key={value} value={value} className="bg-navy-900 text-slate-100">
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-100 mb-2">An Emisiune</label>
                    <select
                      value={localFilters.issueYear}
                      onChange={(e) => handleFilterUpdate('issueYear', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-[#e7b73c]/30 bg-navy-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent appearance-none cursor-pointer"
                    >
                      {romanianOptions.issueYears.map((year) => (
                        <option key={year} value={year} className="bg-navy-900 text-slate-100">
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-100 mb-2">Diametru</label>
                    <select
                      value={localFilters.diameter}
                      onChange={(e) => handleFilterUpdate('diameter', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-[#e7b73c]/30 bg-navy-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent appearance-none cursor-pointer"
                    >
                      {romanianOptions.diameters.map((diameter) => (
                        <option key={diameter} value={diameter} className="bg-navy-900 text-slate-100">
                          {diameter}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-100 mb-2">Greutate</label>
                    <select
                      value={localFilters.weight}
                      onChange={(e) => handleFilterUpdate('weight', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-[#e7b73c]/30 bg-navy-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent appearance-none cursor-pointer"
                    >
                      {romanianOptions.weights.map((weight) => (
                        <option key={weight} value={weight} className="bg-navy-900 text-slate-100">
                          {weight}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-100 mb-2">Monetărie</label>
                    <select
                      value={localFilters.mint}
                      onChange={(e) => handleFilterUpdate('mint', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-[#e7b73c]/30 bg-navy-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent appearance-none cursor-pointer"
                    >
                      {romanianOptions.mints.map((mint) => (
                        <option key={mint} value={mint} className="bg-navy-900 text-slate-100">
                          {mint}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-100 mb-2">Epocă</label>
                    <select
                      value={localFilters.era}
                      onChange={(e) => handleFilterUpdate('era', e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-[#e7b73c]/30 bg-navy-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent appearance-none cursor-pointer"
                    >
                      {romanianOptions.eras.map((era) => (
                        <option key={era} value={era} className="bg-navy-900 text-slate-100">
                          {era}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-2">
              Interval Preț:{' '}
              {localFilters.minPrice || localFilters.maxPrice ? (
                <span className="text-[#e7b73c] font-semibold">
                  {localFilters.minPrice || 0} RON -{' '}
                  {localFilters.maxPrice || '∞'} RON
                </span>
              ) : (
                <span className="text-slate-300 font-semibold">Fără filtru</span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  placeholder="Preț Minim"
                  value={localFilters.minPrice || ''}
                  onChange={(e) => handlePriceChange('min', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-[#e7b73c]/30 bg-navy-900/70 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Preț Maxim"
                  value={localFilters.maxPrice || ''}
                  onChange={(e) => handlePriceChange('max', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-[#e7b73c]/30 bg-navy-900/70 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                />
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="10000"
              step="50"
              value={localFilters.maxPrice || 0}
              onChange={(e) => handleFilterUpdate('maxPrice', parseFloat(e.target.value))}
              className="w-full mt-3 accent-[#e7b73c] bg-navy-800 rounded-full h-1.5"
            />
          </div>

          {/* Year Range */}
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-2">
              Interval An: <span className="text-[#e7b73c] font-semibold">{localFilters.minYear} - {localFilters.maxYear}</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  placeholder="An Minim"
                  value={localFilters.minYear || ''}
                  onChange={(e) => handleYearChange('min', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-[#e7b73c]/30 bg-navy-900/70 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="An Maxim"
                  value={localFilters.maxYear || ''}
                  onChange={(e) => handleYearChange('max', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-[#e7b73c]/30 bg-navy-900/70 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e7b73c] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end">
            <button
              onClick={resetFilters}
              className="px-6 py-2 bg-navy-500 hover:bg-navy-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-navy-500/20"
            >
              Resetează Filtrele
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
