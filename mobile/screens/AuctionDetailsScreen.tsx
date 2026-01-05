import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { z } from 'zod';
import { useAuction } from '../hooks/useAuctions';
import { useBids } from '../hooks/useBids';
import { useAuth } from '../context/AuthContext';
import { placeBid, setAutoBid, validateBid } from '@shared/auctionService';
import { Bid } from '@shared/types';
import { RootStackParamList } from '../navigationTypes';

// Currency formatting function
const formatRON = (amount: number): string => `${amount.toFixed(2)} EUR`;

const bidSchema = z.object({
  amount: z.number().positive('Bid amount must be positive'),
});

const CountdownTimer: React.FC<{ endTime: Date; onEnded?: () => void }> = ({ endTime, onEnded }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime.getTime() - now;

      if (distance < 0) {
        setTimeLeft('AUCTION ENDED');
        clearInterval(timer);
        onEnded?.();
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, onEnded]);

  return <Text className="text-xl font-bold text-red-600">{timeLeft}</Text>;
};

const BidItem: React.FC<{ bid: Bid }> = ({ bid }) => (
  <View className="flex-row justify-between items-center py-2 border-b border-gray-200">
    <View>
      <Text className="text-gray-900 font-medium">{formatRON(bid.amount)}</Text>
      <Text className="text-gray-500 text-sm">
        {bid.timestamp.toLocaleString()}
      </Text>
    </View>
    <Text className="text-gray-600 text-sm">
      {bid.userId.slice(-6)}
    </Text>
  </View>
);

const AuctionDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'AuctionDetails'>>();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { auctionId, filters } = route.params;
  const { auction, loading: auctionLoading, error: auctionError } = useAuction(auctionId);
  const { bids, loading: bidsLoading } = useBids(auctionId);

  const [bidAmount, setBidAmount] = useState('');
  const [autoBidAmount, setAutoBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [settingAutoBid, setSettingAutoBid] = useState(false);
  const [auctionEnded, setAuctionEnded] = useState(false);

  const isEnded = auctionEnded || (auction && new Date() > auction.endTime);
  const currentBid = auction?.currentBid || auction?.reservePrice || 0;
  // Minimum bid increment: 10 RON for bids under 1000, 50 RON for higher bids
  const bidIncrement = currentBid < 1000 ? 10 : 50;
  const minBid = Math.max(currentBid + bidIncrement, auction?.reservePrice || 0);

  const handleBid = async () => {
    if (!user || !auction) return;

    try {
      const amount = parseFloat(bidAmount);
      bidSchema.parse({ amount });
      if (amount < minBid) {
        throw new Error(`Licitația trebuie să fie cel puțin ${formatRON(minBid)}`);
      }
      setBidding(true);
      await placeBid(auctionId, amount, user.uid);
      setBidAmount('');
      Alert.alert('Success', 'Bid placed successfully!');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        Alert.alert('Validation Error', error.issues[0].message);
      } else {
        Alert.alert('Bid Failed', error.message);
      }
    } finally {
      setBidding(false);
    }
  };

  const handleAutoBid = async () => {
    if (!user || !auction) return;

    try {
      const amount = parseFloat(autoBidAmount);
      bidSchema.parse({ amount });
      if (amount < minBid) {
        throw new Error(`Auto-bid trebuie să fie cel puțin ${formatRON(minBid)}`);
      }
      setSettingAutoBid(true);
      await setAutoBid(auctionId, amount, user.uid);
      setAutoBidAmount('');
      Alert.alert('Success', 'Auto-bid set successfully!');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        Alert.alert('Validation Error', error.issues[0].message);
      } else {
        Alert.alert('Auto-Bid Failed', error.message);
      }
    } finally {
      setSettingAutoBid(false);
    }
  };

  if (auctionLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Loading auction...</Text>
      </View>
    );
  }

  if (auctionError || !auction) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-4">
        <Text className="text-center text-red-600 text-lg mb-4">
          {auctionError || 'Auction not found'}
        </Text>
        <TouchableOpacity
          className="bg-blue-600 py-2 px-4 rounded-md"
          onPress={() => navigation.navigate('MainTabs', {
            screen: 'AuctionList',
            params: { filters }
          })}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-white p-4">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity
            className="bg-gray-200 py-2 px-4 rounded-md"
            onPress={() => navigation.navigate('MainTabs', {
              screen: 'AuctionList',
              params: { filters }
            })}
          >
            <Text className="text-gray-700 font-semibold">← Back</Text>
          </TouchableOpacity>
          <View className={`px-3 py-1 rounded-full ${
            auction.status === 'active' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <Text className={`text-sm font-medium ${
              auction.status === 'active' ? 'text-green-800' : 'text-red-800'
            }`}>
              {auction.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Auction Title */}
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Auction #{auction.id.slice(-6)}
        </Text>

        {/* Current Bid & Timer */}
        <View className="bg-gray-50 p-4 rounded-lg mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-sm text-gray-600">Licitație Curentă</Text>
              <Text className="text-3xl font-bold text-blue-600">
                {formatRON(currentBid)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-sm text-gray-600 mb-1">Time Left</Text>
              <CountdownTimer
                endTime={auction.endTime}
                onEnded={() => setAuctionEnded(true)}
              />
            </View>
          </View>

          <View className="flex-row justify-between text-sm">
            <Text className="text-gray-600">Preț Rezervă: {formatRON(auction.reservePrice)}</Text>
            <Text className="text-gray-600">
              {auction.currentBidderId ? `Cel Mai Mare Licitator: ${auction.currentBidderId.slice(-6)}` : 'Nicio licitație încă'}
            </Text>
          </View>
        </View>

        {/* Bidding Section */}
        {!isEnded && user && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Plasați Licitația Dvs.</Text>

            {/* Manual Bid */}
            <View className="mb-4">
              <Text className="text-sm text-gray-600 mb-2">
                Licitație minimă: {formatRON(minBid)}
              </Text>
              <View className="flex-row space-x-2">
                <TextInput
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white"
                  placeholder={`Introduceți suma licitată (min: ${formatRON(minBid)})`}
                  value={bidAmount}
                  onChangeText={setBidAmount}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  className="bg-blue-600 px-6 py-2 rounded-md justify-center"
                  onPress={handleBid}
                  disabled={bidding}
                >
                  <Text className="text-white font-semibold">
                    {bidding ? '...' : 'Bid'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Auto Bid */}
            <View className="mb-4">
              <Text className="text-sm text-gray-600 mb-2">
                Setați suma maximă pentru auto-licitare
              </Text>
              <View className="flex-row space-x-2">
                <TextInput
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white"
                  placeholder={`Auto-licitare maximă (min: ${formatRON(minBid)})`}
                  value={autoBidAmount}
                  onChangeText={setAutoBidAmount}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  className="bg-green-600 px-6 py-2 rounded-md justify-center"
                  onPress={handleAutoBid}
                  disabled={settingAutoBid}
                >
                  <Text className="text-white font-semibold">
                    {settingAutoBid ? '...' : 'Auto'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {isEnded && (
          <View className="bg-yellow-50 p-4 rounded-lg mb-6">
            <Text className="text-lg font-semibold text-yellow-800 mb-2">Licitație Încheiată</Text>
            <Text className="text-yellow-700">
              {auction.currentBid && auction.currentBid >= auction.reservePrice
                ? `Vândut pentru ${formatRON(auction.currentBid)}`
                : 'Nu a îndeplinit prețul rezervă'
              }
            </Text>
          </View>
        )}

        {!user && !isEnded && (
          <View className="bg-blue-50 p-4 rounded-lg mb-6">
            <Text className="text-blue-800 text-center">
              Please log in to place bids
            </Text>
          </View>
        )}

        {/* Bid History */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-gray-900">Istoric Licitații</Text>
            <TouchableOpacity
              className="bg-blue-600 px-4 py-2 rounded-md"
              onPress={() => navigation.navigate('BidHistory', { auctionId })}
            >
              <Text className="text-white text-sm font-semibold">Vezi Tot</Text>
            </TouchableOpacity>
          </View>
          {bidsLoading ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : bids.length === 0 ? (
            <Text className="text-gray-500 text-center py-4">Nicio licitație încă</Text>
          ) : (
            <FlatList
              data={bids.slice(0, 5)} // Show last 5 bids
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <BidItem bid={item} />}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Auction Details */}
        <View className="bg-gray-50 p-4 rounded-lg">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Detalii Licitație</Text>
          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Început:</Text>
              <Text className="text-gray-900 font-medium">
                {auction.startTime.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Se termină:</Text>
              <Text className="text-gray-900 font-medium">
                {auction.endTime.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Total Licitații:</Text>
              <Text className="text-gray-900 font-medium">{bids.length}</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default AuctionDetailsScreen;