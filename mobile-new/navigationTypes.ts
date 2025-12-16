import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  ProductDetails: { productId: string };
  AuctionDetails: { auctionId: string };
  BidHistory: { auctionId?: string; userId?: string };
  HelpArticle: { articleId: string };
  /** Istoricul comenzilor (cumpărări) pentru utilizatorul curent */
  OrderHistory: undefined;
  /** Istoricul vânzărilor pentru utilizatorul curent */
  SalesHistory: undefined;
  Login: undefined;
  Register: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  ProductCatalog: undefined;
  AuctionList: undefined;
  Cart: undefined;
  Watchlist: undefined;
  HelpCenter: undefined;
};