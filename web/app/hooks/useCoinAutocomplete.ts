import { useState, useEffect, useMemo } from 'react';

// Romanian coin data structure
interface RomanianCoin {
  id: string;
  era: string;
  issue_year: number;
  face_value: string;
  metal: string;
  diameter: string;
  weight: string;
  mint_or_theme?: string;
  mint?: string;
}

// Sample Romanian coins data
const ROMANIAN_COINS: RomanianCoin[] = [
  // Monede românești moderne (2005-prezent)
  {
    id: '1',
    era: 'Monede românești moderne (2005-prezent)',
    issue_year: 2005,
    face_value: '1 Leu',
    metal: 'Aur',
    diameter: '20 mm',
    weight: '6.22 g',
    mint: 'Bucharest'
  },
  {
    id: '2',
    era: 'Monede românești moderne (2005-prezent)',
    issue_year: 2005,
    face_value: '5 Lei',
    metal: 'Aur',
    diameter: '23 mm',
    weight: '7.5 g',
    mint: 'Bucharest'
  },
  {
    id: '3',
    era: 'Monede românești moderne (2005-prezent)',
    issue_year: 2010,
    face_value: '10 Lei',
    metal: 'Aur',
    diameter: '26.3 mm',
    weight: '8.5 g',
    mint: 'Bucharest'
  },
  {
    id: '4',
    era: 'Monede românești moderne (2005-prezent)',
    issue_year: 2015,
    face_value: '50 Lei',
    metal: 'Aur',
    diameter: '24 mm',
    weight: '10 g',
    mint: 'Bucharest'
  },
  // Monede românești interbelice (1918-1947)
  {
    id: '5',
    era: 'Monede românești interbelice (1918-1947)',
    issue_year: 1920,
    face_value: '1 Leu',
    metal: 'Argint',
    diameter: '23 mm',
    weight: '5 g',
    mint: 'Bucharest'
  },
  {
    id: '6',
    era: 'Monede românești interbelice (1918-1947)',
    issue_year: 1930,
    face_value: '2 Lei',
    metal: 'Argint',
    diameter: '27 mm',
    weight: '10 g',
    mint: 'Bucharest'
  },
  {
    id: '7',
    era: 'Monede românești interbelice (1918-1947)',
    issue_year: 1940,
    face_value: '5 Lei',
    metal: 'Argint',
    diameter: '30 mm',
    weight: '15 g',
    mint: 'Bucharest'
  },
  // Monede românești din perioada Regatului (1867-1918)
  {
    id: '8',
    era: 'Monede românești din perioada Regatului (1867-1918)',
    issue_year: 1870,
    face_value: '1 Leu',
    metal: 'Argint',
    diameter: '23 mm',
    weight: '5 g',
    mint: 'Bucharest'
  },
  {
    id: '9',
    era: 'Monede românești din perioada Regatului (1867-1918)',
    issue_year: 1880,
    face_value: '2 Lei',
    metal: 'Argint',
    diameter: '27 mm',
    weight: '10 g',
    mint: 'Bucharest'
  },
  {
    id: '10',
    era: 'Monede românești din perioada Regatului (1867-1918)',
    issue_year: 1900,
    face_value: '5 Lei',
    metal: 'Aur',
    diameter: '19 mm',
    weight: '1.5 g',
    mint: 'Bucharest'
  },
  // Monede românești din epoca fanariotă (1711-1821)
  {
    id: '11',
    era: 'Monede românești din epoca fanariotă (1711-1821)',
    issue_year: 1750,
    face_value: '1 Leu',
    metal: 'Argint',
    diameter: '25 mm',
    weight: '7 g',
    mint: 'Bucharest'
  },
  {
    id: '12',
    era: 'Monede românești din epoca fanariotă (1711-1821)',
    issue_year: 1800,
    face_value: '2 Lei',
    metal: 'Argint',
    diameter: '28 mm',
    weight: '12 g',
    mint: 'Bucharest'
  },
  // Monede românești medievale (sec. XIV-XVII)
  {
    id: '13',
    era: 'Monede românești medievale (sec. XIV-XVII)',
    issue_year: 1600,
    face_value: '1 Leu',
    metal: 'Argint',
    diameter: '22 mm',
    weight: '4 g',
    mint: 'Sibiu'
  },
  {
    id: '14',
    era: 'Monede românești medievale (sec. XIV-XVII)',
    issue_year: 1650,
    face_value: '2 Lei',
    metal: 'Argint',
    diameter: '26 mm',
    weight: '8 g',
    mint: 'Alba Iulia'
  }
];

export function useCoinAutocomplete() {
  const [selectedEra, setSelectedEra] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedFaceValue, setSelectedFaceValue] = useState('');

  // Get unique eras
  const romanianEras = useMemo(() => {
    const eras = [...new Set(ROMANIAN_COINS.map(coin => coin.era))];
    return eras.sort();
  }, []);

  // Get available years for selected era
  const availableYears = useMemo(() => {
    if (!selectedEra) return [];
    const years = ROMANIAN_COINS
      .filter(coin => coin.era === selectedEra)
      .map(coin => coin.issue_year.toString())
      .filter((year, index, arr) => arr.indexOf(year) === index)
      .sort((a, b) => parseInt(a) - parseInt(b));
    return years;
  }, [selectedEra]);

  // Get available face values for selected era and year
  const availableFaceValues = useMemo(() => {
    if (!selectedEra || !selectedYear) return [];
    const faceValues = ROMANIAN_COINS
      .filter(coin => coin.era === selectedEra && coin.issue_year.toString() === selectedYear)
      .map(coin => coin.face_value)
      .filter((fv, index, arr) => arr.indexOf(fv) === index)
      .sort();
    return faceValues;
  }, [selectedEra, selectedYear]);

  // Find matched coin
  const matchedCoin = useMemo(() => {
    if (!selectedEra || !selectedYear || !selectedFaceValue) return null;
    return ROMANIAN_COINS.find(
      coin =>
        coin.era === selectedEra &&
        coin.issue_year.toString() === selectedYear &&
        coin.face_value === selectedFaceValue
    ) || null;
  }, [selectedEra, selectedYear, selectedFaceValue]);

  // Reset function
  const reset = () => {
    setSelectedEra('');
    setSelectedYear('');
    setSelectedFaceValue('');
  };

  // Reset dependent selections when era changes
  useEffect(() => {
    if (selectedEra && !availableYears.includes(selectedYear)) {
      setSelectedYear('');
      setSelectedFaceValue('');
    }
  }, [selectedEra, availableYears, selectedYear]);

  // Reset dependent selections when year changes
  useEffect(() => {
    if (selectedYear && !availableFaceValues.includes(selectedFaceValue)) {
      setSelectedFaceValue('');
    }
  }, [selectedYear, availableFaceValues, selectedFaceValue]);

  return {
    selectedEra,
    setSelectedEra,
    selectedYear,
    setSelectedYear,
    selectedFaceValue,
    setSelectedFaceValue,
    matchedCoin,
    romanianEras,
    availableYears,
    availableFaceValues,
    reset,
  };
}