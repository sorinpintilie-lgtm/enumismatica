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

      const response = await fetch('/api/watchlist/get', {
        headers: {
          'x-user-id': user.uid,
        },
      });
      if (!response.ok) {
        throw new Error('Nu s-a putut încărca lista de urmărire');
      }

      const data = await response.json();
      if (data.success) {
        setWatchlist(data.items || []);
        setWatchlistCount(data.items?.length || 0);
      } else {
        throw new Error(data.error || 'Nu s-a putut încărca lista de urmărire');
      }
    } catch (err) {
      console.error('Error fetching watchlist:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Nu s-a putut încărca lista de urmărire'
      );
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
    if (!user) return { exists: false, item: null };

    try {
      const response = await fetch('/api/watchlist/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
        },
        body: JSON.stringify({ itemId }),
      });

      if (!response.ok) {
        throw new Error('Nu s-a putut verifica starea listei de urmărire');
      }

      const data = await response.json();
      return {
        exists: data.exists || false,
        item: data.item || null,
      };
    } catch (err) {
      console.error('Error checking watchlist status:', err);
      return { exists: false, item: null };
    }
  }, [user]);

  /**
   * Add item to watchlist
   */
  const addToWatchlist = useCallback(
    async (itemType: 'product' | 'auction', itemId: string, notes?: string) => {
      if (!user) {
        return { success: false, error: 'Utilizator neautentificat' };
      }

      try {
        const response = await fetch('/api/watchlist/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.uid,
          },
          body: JSON.stringify({ itemType, itemId, notes }),
        });

        if (!response.ok) {
          throw new Error('Nu s-a putut adăuga la lista de urmărire');
        }

        const data = await response.json();
        if (data.success) {
          // Reîncarcă lista după adăugare
          await fetchWatchlist();
          return { success: true };
        } else {
          throw new Error(data.error || 'Nu s-a putut adăuga la lista de urmărire');
        }
      } catch (err) {
        console.error('Error adding to watchlist:', err);
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : 'Nu s-a putut adăuga la lista de urmărire',
        };
      }
    },
    [user, fetchWatchlist]
  );

  /**
   * Remove item from watchlist
   */
  const removeFromWatchlist = useCallback(
    async (itemId: string) => {
      if (!user) {
        return { success: false, error: 'Utilizator neautentificat' };
      }

      try {
        const response = await fetch('/api/watchlist/remove', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.uid,
          },
          body: JSON.stringify({ itemId }),
        });

        if (!response.ok) {
          throw new Error('Nu s-a putut elimina din lista de urmărire');
        }

        const data = await response.json();
        if (data.success) {
          // Reîncarcă lista după eliminare
          await fetchWatchlist();
          return { success: true };
        } else {
          throw new Error(
            data.error || 'Nu s-a putut elimina din lista de urmărire'
          );
        }
      } catch (err) {
        console.error('Error removing from watchlist:', err);
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : 'Nu s-a putut elimina din lista de urmărire',
        };
      }
    },
    [user, fetchWatchlist]
  );

  /**
   * Clear entire watchlist
   */
  const clearWatchlist = useCallback(
    async () => {
      if (!user) {
        return { success: false, error: 'Utilizator neautentificat' };
      }

      try {
        const response = await fetch('/api/watchlist/clear', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.uid,
          },
        });

        if (!response.ok) {
          throw new Error('Nu s-a putut goli lista de urmărire');
        }

        const data = await response.json();
        if (data.success) {
          // Reîncarcă lista după golire
          await fetchWatchlist();
          return { success: true };
        } else {
          throw new Error(
            data.error || 'Nu s-a putut goli lista de urmărire'
          );
        }
      } catch (err) {
        console.error('Error clearing watchlist:', err);
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : 'Nu s-a putut goli lista de urmărire',
        };
      }
    },
    [user, fetchWatchlist]
  );

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