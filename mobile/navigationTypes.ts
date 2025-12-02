import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  ProductDetails: { productId: string };
  AuctionDetails: { auctionId: string };
  BidHistory: { auctionId?: string; userId?: string };
  HelpArticle: { articleId: string };
  Login: undefined;
  Register: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  ProductCatalog: undefined;
  AuctionList: undefined;
  Watchlist: undefined;
  HelpCenter: undefined;
};