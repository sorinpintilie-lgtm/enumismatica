import 'nativewind';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProductCatalogScreen from './screens/ProductCatalogScreen';
import AuctionListScreen from './screens/AuctionListScreen';
import ProductDetailsScreen from './screens/ProductDetailsScreen';
import AuctionDetailsScreen from './screens/AuctionDetailsScreen';
import WatchlistScreen from './screens/WatchlistScreen';
import HelpCenterScreen from './screens/HelpCenterScreen';
import HelpArticleScreen from './screens/HelpArticleScreen';
import CartScreen from './screens/CartScreen';
import OrderHistoryScreen from './screens/OrderHistoryScreen';
import SalesHistoryScreen from './screens/SalesHistoryScreen';
import { auth, db } from '@shared/firebaseConfig.js';
import { requestNotificationPermissions, setupNotificationListeners } from './services/notificationService';
import { RootStackParamList, TabParamList } from './navigationTypes';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#ffffff' },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Cont',
        }}
      />
      <Tab.Screen
        name="ProductCatalog"
        component={ProductCatalogScreen}
        options={{
          tabBarLabel: 'Magazin',
        }}
      />
      <Tab.Screen
        name="AuctionList"
        component={AuctionListScreen}
        options={{
          tabBarLabel: 'Licitații',
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: 'Coș',
        }}
      />
      <Tab.Screen
        name="Watchlist"
        component={WatchlistScreen}
        options={{
          tabBarLabel: 'Watchlist',
        }}
      />
      <Tab.Screen
        name="HelpCenter"
        component={HelpCenterScreen}
        options={{
          tabBarLabel: 'Ajutor',
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Initialize notifications when app starts
    const initNotifications = async () => {
      await requestNotificationPermissions();
    };

    initNotifications();

    // Set up notification listeners
    const cleanup = setupNotificationListeners();

    return cleanup;
  }, []);

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
          <Stack.Screen name="AuctionDetails" component={AuctionDetailsScreen} />
          <Stack.Screen name="HelpArticle" component={HelpArticleScreen} />
          <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
          <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </AuthProvider>
  );
}
