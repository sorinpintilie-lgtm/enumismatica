import React, { useState, useEffect } from 'react';
import { useWatchlist } from '../hooks/useWatchlist';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastProvider';

interface WatchlistButtonProps {
  itemType: 'product' | 'auction';
  itemId: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const WatchlistButton: React.FC<WatchlistButtonProps> = ({
  itemType,
  itemId,
  className = '',
  size = 'medium',
  showText = false
}) => {
  const { user } = useAuth();
  const { checkWatchlistStatus, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { showToast } = useToast();
  const [isInWatchlist, setIsInWatchlist] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);

  // Check initial watchlist status
  useEffect(() => {
    if (user && !checked) {
      const checkStatus = async () => {
        try {
          const result = await checkWatchlistStatus(itemId);
          setIsInWatchlist(result.exists);
          setChecked(true);
        } catch (error) {
          console.error('Error checking watchlist status:', error);
          setChecked(true);
        }
      };

      checkStatus();
    }
  }, [user, itemId, checkWatchlistStatus, checked]);

  const handleToggleWatchlist = async () => {
    if (!user) {
      showToast({ type: 'info', message: 'Te rog autentifică-te pentru a adăuga la lista de urmărire' });
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      if (isInWatchlist) {
        // Remove from watchlist
        const result = await removeFromWatchlist(itemId);
        if (result.success) {
          setIsInWatchlist(false);
          showToast({ type: 'success', message: 'Îndepărtat din lista de urmărire' });
        } else {
          showToast({ type: 'error', message: result.error || 'Eroare la îndepărtare din lista de urmărire' });
        }
      } else {
        // Add to watchlist
        const result = await addToWatchlist(itemType, itemId);
        if (result.success) {
          setIsInWatchlist(true);
          showToast({ type: 'success', message: 'Adăugat la lista de urmărire' });
        } else {
          showToast({ type: 'error', message: result.error || 'Eroare la adăugare în lista de urmărire' });
        }
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      showToast({ type: 'error', message: 'Eroare la actualizarea listei de urmărire' });
    } finally {
      setLoading(false);
    }
  };

  // Determine button size and styling
  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return 'text-sm p-1';
      case 'large':
        return 'text-xl p-3';
      case 'medium':
      default:
        return 'text-base p-2';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 24;
      case 'medium':
      default:
        return 20;
    }
  };

  // Keep icon-only buttons compact (used as an overlay on cards).
  const gapClass = showText ? 'gap-2' : 'gap-0';
  const shapeClass = showText ? 'rounded-lg' : 'rounded-full';

  const stateClass = isInWatchlist
    ? // Active
      showText
      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
      : 'bg-yellow-500/90 hover:bg-yellow-500 text-navy-950 border border-yellow-300/40'
    : // Inactive
    showText
    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
    : 'bg-black/45 hover:bg-black/60 text-slate-100 border border-white/15 backdrop-blur-sm';

  return (
    <button
      onClick={handleToggleWatchlist}
      disabled={loading}
      className={`inline-flex items-center justify-center ${gapClass} ${shapeClass} shrink-0 leading-none transition-all duration-200 ${getButtonSize()} ${stateClass} ${className}`}
      aria-label={isInWatchlist ? 'Îndepărtează din lista de urmărire' : 'Adaugă la lista de urmărire'}
      title={isInWatchlist ? 'Îndepărtează din lista de urmărire' : 'Adaugă la lista de urmărire'}
    >
      {isInWatchlist ? (
        <svg
          className={showText ? 'text-yellow-300' : 'text-navy-950'}
          width={getIconSize()}
          height={getIconSize()}
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ) : (
        <svg
          className={showText ? 'text-gray-300' : 'text-slate-100'}
          width={getIconSize()}
          height={getIconSize()}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )}
      {showText && (
        <span className={size === 'small' ? 'text-xs' : 'text-sm'}>
          {isInWatchlist ? 'În listă' : 'Urmărește'}
        </span>
      )}
      {loading && (
        <span className="text-xs opacity-70">...</span>
      )}
    </button>
  );
};
