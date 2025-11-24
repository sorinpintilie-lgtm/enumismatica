import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  ProductDetails: { productId: string };
  AuctionDetails: { auctionId: string };
  Login: undefined;
  Register: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  ProductCatalog: undefined;
  AuctionList: undefined;
};