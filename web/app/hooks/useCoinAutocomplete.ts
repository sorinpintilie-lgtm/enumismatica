import { useState, useEffect, useMemo } from 'react';

// Romanian coin data structure (matches products.json structure)
interface RomanianCoin {
  id: number;
  face_value: string;
  issue_year: string;
  diameter: string;
  weight: string;
  metal: string;
  mint_or_theme: string;
  era: string;
}

export function useCoinAutocomplete() {
  const [selectedDenomination, setSelectedDenomination] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMint, setSelectedMint] = useState('');
  const [coinsData, setCoinsData] = useState<RomanianCoin[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch coins data from products.json
  useEffect(() => {
    const fetchCoinsData = async () => {
      try {
        const response = await fetch('/products.json');
        const data: RomanianCoin[] = await response.json();
        setCoinsData(data);
      } catch (error) {
        console.error('Failed to fetch coins data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoinsData();
  }, []);

  // Get unique denominations
  const availableDenominations = useMemo(() => {
    if (loading) return [];
    const denominations = [...new Set(coinsData.map(coin => coin.face_value))];
    return denominations.sort();
  }, [coinsData, loading]);

  // Get available years for selected denomination
  const availableYears = useMemo(() => {
    if (!selectedDenomination || loading) return [];
    const years = coinsData
      .filter(coin => coin.face_value === selectedDenomination)
      .map(coin => coin.issue_year)
      .filter((year, index, arr) => arr.indexOf(year) === index)
      .sort((a, b) => parseInt(a) - parseInt(b));
    return years;
  }, [selectedDenomination, coinsData, loading]);

  // Get available mints for selected denomination and year
  const availableMints = useMemo(() => {
    if (!selectedDenomination || !selectedYear || loading) return [];
    const mints = coinsData
      .filter(coin => coin.face_value === selectedDenomination && coin.issue_year === selectedYear)
      .map(coin => coin.mint_or_theme)
      .filter((mint, index, arr) => arr.indexOf(mint) === index && mint)
      .sort();
    return mints;
  }, [selectedDenomination, selectedYear, coinsData, loading]);

  // Find matched coin
  const matchedCoin = useMemo(() => {
    if (!selectedDenomination || !selectedYear || !selectedMint || loading) return null;
    return coinsData.find(
      coin =>
        coin.face_value === selectedDenomination &&
        coin.issue_year === selectedYear &&
        coin.mint_or_theme === selectedMint
    ) || null;
  }, [selectedDenomination, selectedYear, selectedMint, coinsData, loading]);

  // Reset function
  const reset = () => {
    setSelectedDenomination('');
    setSelectedYear('');
    setSelectedMint('');
  };

  // Reset dependent selections when denomination changes
  useEffect(() => {
    if (selectedDenomination && !availableYears.includes(selectedYear)) {
      setSelectedYear('');
      setSelectedMint('');
    }
  }, [selectedDenomination, availableYears, selectedYear]);

  // Reset dependent selections when year changes
  useEffect(() => {
    if (selectedYear && !availableMints.includes(selectedMint)) {
      setSelectedMint('');
    }
  }, [selectedYear, availableMints, selectedMint]);

  return {
    selectedDenomination,
    setSelectedDenomination,
    selectedYear,
    setSelectedYear,
    selectedMint,
    setSelectedMint,
    matchedCoin,
    availableDenominations,
    availableYears,
    availableMints,
    reset,
    loading,
  };
}