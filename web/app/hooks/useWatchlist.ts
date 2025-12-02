import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { WatchlistItem } from 'shared/types';

export function useWatchlist() {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [watchlistCount, setWatchlistCount] = useState<number>(0);

  /**
   * Fetch user's watchlist
   */
  const fetchWatchlist = useCallback(async () => {
    if (!user) {
      setWatchlist([]);
      setWatchlistCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/watchlist/get');
      if (!response.ok) {
        throw new Error('Failed to fetch watchlist');
      }

      const data = await response.json();
      if (data.success) {
        setWatchlist(data.items || []);
        setWatchlistCount(data.items?.length || 0);
      } else {
        throw new Error(data.error || 'Failed to fetch watchlist');
      }
    } catch (err) {
      console.error('Error fetching watchlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch watchlist');
      setWatchlist([]);
      setWatchlistCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Check if item is in watchlist
   */
  const checkWatchlistStatus = useCallback(async (itemId: string) => {
    if (!user) return { exists: false };

    try {
      const response = await fetch('/api/watchlist/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      });

      if (!response.ok) {
        throw new Error('Failed to check watchlist status');
      }

      const data = await response.json();
      return {
        exists: data.exists || false,
        item: data.item || null
      };
    } catch (err) {
      console.error('Error checking watchlist status:', err);
      return { exists: false, item: null };
    }
  }, [user]);

  /**
   * Add item to watchlist
   */
  const addToWatchlist = useCallback(async (itemType: 'product' | 'auction', itemId: string, notes?: string) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const response = await fetch('/api/watchlist/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemType, itemId, notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to add to watchlist');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh watchlist after adding
        await fetchWatchlist();
        return { success: true };
      } else {
        throw new Error(data.error || 'Failed to add to watchlist');
      }
    } catch (err) {
      console.error('Error adding to watchlist:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to add to watchlist'
      };
    }
  }, [user, fetchWatchlist]);

  /**
   * Remove item from watchlist
   */
  const removeFromWatchlist = useCallback(async (itemId: string) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const response = await fetch('/api/watchlist/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove from watchlist');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh watchlist after removing
        await fetchWatchlist();
        return { success: true };
      } else {
        throw new Error(data.error || 'Failed to remove from watchlist');
      }
    } catch (err) {
      console.error('Error removing from watchlist:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to remove from watchlist'
      };
    }
  }, [user, fetchWatchlist]);

  /**
   * Clear entire watchlist
   */
  const clearWatchlist = useCallback(async () => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const response = await fetch('/api/watchlist/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to clear watchlist');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh watchlist after clearing
        await fetchWatchlist();
        return { success: true };
      } else {
        throw new Error(data.error || 'Failed to clear watchlist');
      }
    } catch (err) {
      console.error('Error clearing watchlist:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to clear watchlist'
      };
    }
  }, [user, fetchWatchlist]);

  // Initial fetch
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  return {
    watchlist,
    loading,
    error,
    watchlistCount,
    fetchWatchlist,
    checkWatchlistStatus,
    addToWatchlist,
    removeFromWatchlist,
    clearWatchlist
  };
}