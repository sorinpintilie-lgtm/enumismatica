import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { addToWatchlist, removeFromWatchlist, checkWatchlistStatus } from '@shared/watchlistService';

interface WatchlistButtonProps {
  itemType: 'product' | 'auction';
  itemId: string;
  size?: 'small' | 'medium' | 'large';
}

const WatchlistButton: React.FC<WatchlistButtonProps> = ({ itemType, itemId, size = 'medium' }) => {
  const { user } = useAuth();
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
  
      try {
        const status = await checkWatchlistStatus(user.uid, itemId);
        setIsInWatchlist(status.exists);
      } catch (error) {
        console.error('Failed to check watchlist status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [user, itemType, itemId]);

  const toggleWatchlist = async () => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }

    try {
      if (isInWatchlist) {
        await removeFromWatchlist(user.uid, itemId);
      } else {
        await addToWatchlist(user.uid, itemType, itemId);
      }
      setIsInWatchlist(!isInWatchlist);
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return 'px-2 py-1 text-xs';
      case 'medium':
        return 'px-3 py-1.5 text-sm';
      case 'large':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1.5 text-sm';
    }
  };

  if (loading) {
    return (
      <TouchableOpacity
        className={`border border-gold-500 rounded-lg ${getButtonSize()}`}
        disabled
      >
        <Text className="text-gold-400">Loading...</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      className={`border border-gold-500 rounded-lg ${getButtonSize()}`}
      onPress={toggleWatchlist}
    >
      <Text className={`text-gold-400 ${isInWatchlist ? 'font-bold' : ''}`}>
        {isInWatchlist ? '✓ Watchlist' : '+ Watchlist'}
      </Text>
    </TouchableOpacity>
  );
};

export default WatchlistButton;