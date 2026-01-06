'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { formatRON } from '../utils/currency';
import { BidHistory, BidHistoryStats } from 'shared/types';
import { getBidHistoryForAuction, getBidHistoryTrends } from 'shared/bidHistoryService';

interface BidHistoryChartProps {
  auctionId: string;
  title?: string;
  showUserAvatars?: boolean;
  showTrends?: boolean;
}

export default function BidHistoryChart({ auctionId, title, showUserAvatars = true, showTrends = true }: BidHistoryChartProps) {
  const [bidHistory, setBidHistory] = useState<BidHistory[]>([]);
  const [stats, setStats] = useState<BidHistoryStats | null>(null);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'all' | 'lastHour' | 'lastDay' | 'lastWeek'>('all');

  useEffect(() => {
    if (!auctionId) return;

    const fetchBidHistory = async () => {
      try {
        setLoading(true);
        setError(null);
 
        // Fetch bid history data directly from Firestore via shared service
        const { bids, stats } = await getBidHistoryForAuction(auctionId, 200);
        setBidHistory(bids);
        setStats(stats);
 
        // Fetch trends if enabled (best-effort; failures here shouldn't break the chart)
        if (showTrends) {
          try {
            const trendsData = await getBidHistoryTrends(auctionId);
            setTrends(trendsData);
          } catch (trendErr) {
            console.error('Error fetching bid history trends:', trendErr);
          }
        }
      } catch (err) {
        console.error('Error fetching bid history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load bid history');
      } finally {
        setLoading(false);
      }
    };

    fetchBidHistory();

    // Set up polling for live updates during active auctions
    const interval = setInterval(fetchBidHistory, 30000);

    return () => clearInterval(interval);
  }, [auctionId, showTrends]);

  // Filter bids based on time range
  const filteredBids = bidHistory.filter(bid => {
    const now = new Date();
    const bidTime = bid.timestamp;

    switch (timeRange) {
      case 'lastHour':
        return now.getTime() - bidTime.getTime() <= 60 * 60 * 1000;
      case 'lastDay':
        return now.getTime() - bidTime.getTime() <= 24 * 60 * 60 * 1000;
      case 'lastWeek':
        return now.getTime() - bidTime.getTime() <= 7 * 24 * 60 * 60 * 1000;
      default:
        return true;
    }
  });

  // Prepare chart data
  const chartData = filteredBids.map((bid, index) => ({
    timestamp: bid.timestamp.getTime(),
    amount: bid.amount,
    formattedTime: format(bid.timestamp, 'HH:mm', { locale: ro }),
    fullTime: format(bid.timestamp, 'dd MMM HH:mm', { locale: ro }),
    userName: bid.userName,
    userAvatar: bid.userAvatar,
    isAutoBid: bid.isAutoBid,
    bidPosition: bid.bidPosition,
    priceChange: bid.priceChange,
    priceChangePercent: bid.priceChangePercent
  }));

  if (loading) {
    return (
      <div className="panel-dark p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {title || 'Istoric Licitări'}
        </h3>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel-dark p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {title || 'Istoric Licitări'}
        </h3>
        <div className="text-center text-red-400 p-4">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-gold-600 text-white rounded hover:bg-gold-500 transition-colors"
          >
            Reîncarcă
          </button>
        </div>
      </div>
    );
  }

  if (filteredBids.length === 0) {
    return (
      <div className="panel-dark p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {title || 'Istoric Licitări'}
        </h3>
        <div className="text-center text-slate-300 p-8">
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <p className="text-sm">Nu există licitații în istoric</p>
          <p className="text-xs mt-1 text-slate-400">
            Datele vor apărea pe măsură ce sunt plasate licitații
          </p>
        </div>
      </div>
    );
  }

  // Time range filter controls
  const timeRangeOptions = [
    { value: 'all', label: 'Toate' },
    { value: 'lastHour', label: 'Ultimul oră' },
    { value: 'lastDay', label: 'Ultimul zi' },
    { value: 'lastWeek', label: 'Ultimul săptămână' }
  ];

  return (
    <div className="panel-dark p-6">
      {/* Header with title and time range filter */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {title || 'Istoric Licitări'}
          </h3>
          <p className="text-sm text-slate-300">
            {filteredBids.length} {filteredBids.length === 1 ? 'licitație' : 'licitații'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300">Perioadă:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'all' | 'lastHour' | 'lastDay' | 'lastWeek')}
            className="px-3 py-1 bg-navy-800 text-white rounded border border-gold-500/20 text-sm"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-navy-900/60 border border-gold-500/20">
            <p className="text-xs text-slate-300 mb-1">Total</p>
            <p className="text-lg font-bold text-white">{stats.totalBids}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-emerald-900/40 border border-emerald-400/40">
            <p className="text-xs text-slate-300 mb-1">Maxim</p>
            <p className="text-lg font-bold text-emerald-300">{formatRON(stats.highestBid)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-900/40 border border-red-500/50">
            <p className="text-xs text-slate-300 mb-1">Minim</p>
            <p className="text-lg font-bold text-red-300">{formatRON(stats.lowestBid)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-900/40 border border-blue-400/40">
            <p className="text-xs text-slate-300 mb-1">Mediu</p>
            <p className="text-lg font-bold text-blue-300">{formatRON(stats.averageBid)}</p>
          </div>
        </div>
      )}

      {/* Trends Analysis */}
      {trends && showTrends && (
        <div className="mb-6 p-4 rounded-lg bg-navy-900/40 border border-gold-500/20">
          <h4 className="text-sm font-semibold text-white mb-3">Analiză Trenduri</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-300 mb-1">Trend General</p>
              <p className={`text-sm font-bold ${
                trends.trendAnalysis.overallTrend === 'up' ? 'text-emerald-300' :
                trends.trendAnalysis.overallTrend === 'down' ? 'text-red-400' : 'text-blue-300'
              }`}> 
                {trends.trendAnalysis.overallTrend === 'up' ? 'Crescător' :
                 trends.trendAnalysis.overallTrend === 'down' ? 'Descrescător' : 'Stabil'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-300 mb-1">Volatilitate</p>
              <p className={`text-sm font-bold ${
                trends.trendAnalysis.volatility === 'high' ? 'text-red-400' :
                trends.trendAnalysis.volatility === 'medium' ? 'text-yellow-400' : 'text-emerald-300'
              }`}>
                {trends.trendAnalysis.volatility === 'high' ? 'Ridicată' :
                 trends.trendAnalysis.volatility === 'medium' ? 'Medie' : 'Scăzută'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-300 mb-1">Intensitate</p>
              <p className={`text-sm font-bold ${
                trends.trendAnalysis.biddingIntensity === 'high' ? 'text-red-400' :
                trends.trendAnalysis.biddingIntensity === 'medium' ? 'text-yellow-400' : 'text-emerald-300'
              }`}>
                {trends.trendAnalysis.biddingIntensity === 'high' ? 'Ridicată' :
                 trends.trendAnalysis.biddingIntensity === 'medium' ? 'Medie' : 'Scăzută'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-300 mb-1">Modele</p>
              <div className="flex justify-center gap-1">
                {trends.patternAnalysis.hasBidWars && <span className="text-xs bg-red-600 px-2 py-1 rounded">Război</span>}
                {trends.patternAnalysis.hasSniping && <span className="text-xs bg-yellow-600 px-2 py-1 rounded">Sniping</span>}
                {trends.patternAnalysis.hasEarlyBidding && <span className="text-xs bg-blue-600 px-2 py-1 rounded">Timpuriu</span>}
                {trends.patternAnalysis.hasLateBidding && <span className="text-xs bg-purple-600 px-2 py-1 rounded">Târziu</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chart */}
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e7b73c" stopOpacity={0.85}/>
                <stop offset="95%" stopColor="#e7b73c" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="formattedTime"
              tick={{ fontSize: 12, fill: '#e5e7eb' }}
              stroke="#94a3b8"
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#e5e7eb' }}
              stroke="#94a3b8"
              tickFormatter={(value) => `${value} RON`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#020617',
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                color: '#e5e7eb',
              }}
              formatter={(value: number) => [formatRON(value), 'Preț']}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullTime;
                }
                return label;
              }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#e7b73c"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#bidGradient)"
            />
            {chartData.map((entry, index) => (
              entry.isAutoBid && (
                <Line
                  key={`auto-bid-${index}`}
                  type="monotone"
                  dataKey="amount"
                  stroke="#4f46e5"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bid Details Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold-500/20">
              <th className="text-left p-2 text-slate-300">#</th>
              <th className="text-left p-2 text-slate-300">Timp</th>
              <th className="text-right p-2 text-slate-300">Suma</th>
              <th className="text-right p-2 text-slate-300">Schimbare</th>
              <th className="text-left p-2 text-slate-300">Utilizator</th>
              <th className="text-left p-2 text-slate-300">Tip</th>
            </tr>
          </thead>
          <tbody>
            {chartData.slice().reverse().map((bid) => {
              const priceChangePercent = bid.priceChangePercent ?? 0;

              return (
                <tr key={bid.bidPosition} className="border-b border-gold-500/10 hover:bg-navy-900/50">
                  <td className="p-2 text-slate-200">{bid.bidPosition}</td>
                  <td className="p-2 text-slate-200">{bid.fullTime}</td>
                  <td className="p-2 text-right font-semibold text-white">{formatRON(bid.amount)}</td>
                  <td
                    className={`p-2 text-right ${
                      bid.priceChange > 0 ? 'text-emerald-300' : bid.priceChange < 0 ? 'text-red-400' : 'text-slate-300'
                    }`}
                  >
                    {bid.priceChange !== 0
                      ? `${bid.priceChange > 0 ? '+' : ''}${formatRON(bid.priceChange)} (${
                          bid.priceChange > 0 ? '+' : ''
                        }${priceChangePercent.toFixed(1)}%)`
                      : '-'}
                  </td>
                  <td className="p-2 text-slate-200 flex items-center gap-2">
                    {showUserAvatars && (
                      <img
                        src={bid.userAvatar}
                        alt={bid.userName}
                        className="w-6 h-6 rounded-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://i.pravatar.cc/150?img=1';
                        }}
                      />
                    )}
                    <span>{bid.userName}</span>
                  </td>
                  <td className="p-2">
                    {bid.isAutoBid ? (
                      <span className="text-xs px-2 py-1 bg-blue-900/60 text-blue-300 rounded-full">Auto</span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-full">Manual</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gold-500/20 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
          <span className="text-xs text-slate-300">Licitare normală</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400"></div>
          <span className="text-xs text-slate-300">Licitare automată</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-400">
            {filteredBids.length} licitații afișate din {bidHistory.length} totale
          </span>
        </div>
      </div>
    </div>
  );
}
