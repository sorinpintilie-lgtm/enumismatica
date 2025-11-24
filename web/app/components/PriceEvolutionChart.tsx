'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { getProductPriceStats } from '../../../shared/priceHistoryService';
import { PriceHistory } from '../../../shared/types';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../../shared/firebaseConfig';
import { formatRON } from '../utils/currency';

interface PriceEvolutionChartProps {
  itemId: string;
  type: 'product' | 'auction';
  title?: string;
}

export default function PriceEvolutionChart({ itemId, type, title }: PriceEvolutionChartProps) {
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !itemId) return;

    setLoading(true);
    setError(null);

    // Real-time subscription to price history
    const collectionPath = type === 'product' ? 'products' : 'auctions';
    const priceHistoryRef = collection(db, collectionPath, itemId, 'priceHistory');
    const q = query(priceHistoryRef, orderBy('timestamp', 'asc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const history: PriceHistory[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          history.push({
            id: doc.id,
            price: data.price,
            source: data.source,
            note: data.note,
            timestamp: data.timestamp?.toDate() || new Date(),
          });
        });

        setPriceHistory(history);
        setLoading(false);

        // Load stats for products
        if (type === 'product' && history.length > 0) {
          getProductPriceStats(itemId)
            .then(setStats)
            .catch(console.error);
        }
      },
      (err) => {
        setError(err.message || 'Failed to load price history');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [itemId, type]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {title || 'Evoluție Preț'}
        </h3>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {title || 'Evoluție Preț'}
        </h3>
        <div className="text-center text-red-600 p-4">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (priceHistory.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {title || 'Evoluție Preț'}
        </h3>
        <div className="text-center text-gray-500 p-8">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <p className="text-sm">Nu există date despre evoluția prețului</p>
          <p className="text-xs mt-1">
            {type === 'auction' ? 'Datele vor apărea pe măsură ce sunt plasate licitări' : 'Adaugă intrări în istoricul prețurilor'}
          </p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = priceHistory.map((entry) => ({
    timestamp: entry.timestamp.getTime(),
    price: entry.price,
    formattedDate: format(entry.timestamp, 'dd MMM HH:mm', { locale: ro }),
    fullDate: format(entry.timestamp, 'dd MMMM yyyy, HH:mm', { locale: ro }),
    source: entry.source,
    note: entry.note,
  }));

  const priceChange = stats ? stats.priceChange : (priceHistory[priceHistory.length - 1].price - priceHistory[0].price);
  const priceChangePercent = stats ? stats.priceChangePercent : 
    priceHistory[0].price > 0 ? ((priceChange / priceHistory[0].price) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {title || 'Evoluție Preț'}
        </h3>
        <div className="text-right">
          <p className="text-sm text-gray-600">Schimbare</p>
          <p className={`text-lg font-bold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {priceChange >= 0 ? '+' : ''}{formatRON(priceChange)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Curent</p>
            <p className="text-lg font-bold text-gray-900">{formatRON(stats.currentPrice)}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Maxim</p>
            <p className="text-lg font-bold text-green-600">{formatRON(stats.highestPrice)}</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Minim</p>
            <p className="text-lg font-bold text-red-600">{formatRON(stats.lowestPrice)}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Mediu</p>
            <p className="text-lg font-bold text-blue-600">{formatRON(stats.averagePrice)}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              tickFormatter={(value) => `${value} RON`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '0.75rem',
              }}
              formatter={(value: number) => [formatRON(value), 'Preț']}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullDate;
                }
                return label;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPrice)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-600 mb-2">Surse date:</p>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(priceHistory.map(h => h.source))).map((source) => (
            <span key={source} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
              {source === 'auction_bid' ? '🔨 Licitare' :
               source === 'manual' ? '✏️ Manual' :
               source === 'market_update' ? '📈 Piață' :
               '📦 Colecție'}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {priceHistory.length} {priceHistory.length === 1 ? 'intrare' : 'intrări'} în istoric
        </p>
      </div>
    </div>
  );
}