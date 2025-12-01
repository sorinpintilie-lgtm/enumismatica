// Firestore Database Schema Types for Numismatics Platform

/**
 * User entity representing a platform user.
 * Stored in 'users' collection.
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string; // Optional profile image URL
  role?: 'superadmin' | 'admin' | 'user'; // User role, defaults to 'user'

  // Credit & referral system
  credits?: number; // Current credit balance for boosts and rewards
  referralCode?: string; // Stable code for invitation links (typically userId)
  referredBy?: string; // User ID or referral code of the inviter
  referralBonusApplied?: boolean; // Prevents double-applying signup bonus

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product entity representing a numismatic item for sale.
 * Stored in 'products' collection.
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  images: string[]; // Array of image URLs
  price: number; // Base price in the platform's currency
  ownerId: string; // Reference to the user who owns this product
  status: 'pending' | 'approved' | 'rejected'; // Approval status
  
  // Coin-specific metadata for categorization and filtering
  country?: string; // Country of origin (e.g., "Russia", "USA", "Germany")
  year?: number; // Year of minting
  era?: string; // Historical era (e.g., "1895-1917", "Modern", "Ancient")
  denomination?: string; // Coin denomination (e.g., "1 Ruble", "10 Kopeks")
  metal?: string; // Metal composition (e.g., "Silver", "Gold", "Bronze", "Copper")
  grade?: string; // Coin grade/condition (e.g., "MS-65", "VF", "XF", "AU")
  mintMark?: string; // Mint mark if applicable
  rarity?: 'common' | 'uncommon' | 'rare' | 'very-rare' | 'extremely-rare';
  weight?: number; // Weight in grams
  diameter?: number; // Diameter in millimeters
  category?: string; // General category (e.g., "coins", "banknotes", "medals")

  // Boosted visibility fields
  boostExpiresAt?: Date; // Until when this product is boosted in listings
  boostedAt?: Date; // When the current boost was applied
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CollectionItem entity representing a coin in a user's personal collection.
 * Stored in 'users/{userId}/collection' subcollection.
 * These are NOT for sale - just personal inventory tracking.
 */
export interface CollectionItem {
  id: string;
  userId: string; // Owner of this collection item
  name: string;
  description?: string;
  images?: string[]; // Array of image URLs
  
  // Coin-specific metadata
  country?: string;
  year?: number;
  era?: string;
  denomination?: string;
  metal?: string;
  grade?: string;
  mintMark?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'very-rare' | 'extremely-rare';
  weight?: number;
  diameter?: number;
  category?: string;
  
  // Collection-specific fields
  acquisitionDate?: Date; // When the item was acquired
  acquisitionPrice?: number; // Purchase price
  currentValue?: number; // Estimated current value
  notes?: string; // Personal notes about the item
  tags?: string[]; // Custom tags for organization
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * PriceHistory entity for tracking price changes over time.
 * Stored in 'products/{productId}/priceHistory' or 'auctions/{auctionId}/priceHistory' subcollection.
 */
export interface PriceHistory {
  id: string;
  price: number;
  source: 'manual' | 'auction_bid' | 'market_update' | 'collection_update';
  note?: string;
  timestamp: Date;
}

/**
 * Auction entity representing an auction for a product.
 * Stored in 'auctions' collection.
 * Has a subcollection 'bids' containing Bid documents.
 */
export interface Auction {
  id: string;
  productId: string; // Reference to the product being auctioned
  startTime: Date;
  endTime: Date;
  reservePrice: number; // Minimum price to sell
  currentBid?: number; // Current highest bid amount
  currentBidderId?: string; // User ID of the current highest bidder
  status: 'pending' | 'active' | 'ended' | 'cancelled' | 'rejected'; // Approval and activity status
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bid entity representing a bid placed in an auction.
 * Stored in 'auctions/{auctionId}/bids' subcollection.
 */
export interface Bid {
  id: string;
  auctionId: string; // Reference to the parent auction
  userId: string; // User who placed the bid
  amount: number; // Bid amount
  timestamp: Date; // When the bid was placed
}

/**
 * AutoBid entity representing an automatic bidding setup for an auction.
 * Stored in 'auctions/{auctionId}/autoBids' subcollection.
 */
export interface AutoBid {
  id: string;
  auctionId: string; // Reference to the parent auction
  userId: string; // User who set up the auto-bid
  maxAmount: number; // Maximum amount willing to bid
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ChatMessage entity representing a message in a chat.
 * Stored in 'auctions/{auctionId}/publicChat' or 'conversations/{conversationId}/messages' subcollection.
 */
export interface ChatMessage {
  id: string;
  senderId: string; // User ID of the sender
  senderName?: string; // Display name (for non-anonymous chats)
  senderAvatar?: string; // Avatar URL (for non-anonymous chats)
  message: string; // Message content
  timestamp: Date; // When the message was sent
  isAnonymous: boolean; // Whether the sender's identity is hidden
  edited?: boolean; // Whether the message was edited
  editedAt?: Date; // When the message was last edited
  deleted?: boolean; // Soft delete flag
  readBy?: string[]; // Array of user IDs who have read this message
}

/**
 * Conversation entity representing a private chat between buyer and seller.
 * Stored in 'conversations' collection.
 * Has a subcollection 'messages' containing ChatMessage documents.
 */
export interface Conversation {
  id: string;
  auctionId?: string; // Reference to auction (if conversation started from auction)
  productId?: string; // Reference to product (if conversation started from direct purchase)
  buyerId: string; // User ID of the buyer
  sellerId: string; // User ID of the seller
  participants: string[]; // Array of participant user IDs [buyerId, sellerId]
  lastMessage?: string; // Preview of the last message
  lastMessageAt?: Date; // Timestamp of the last message
  unreadCount: { [userId: string]: number }; // Unread message count per user
  typingUsers?: string[]; // Array of user IDs currently typing
  status: 'active' | 'archived' | 'closed'; // Conversation status
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification entity for chat-related notifications.
 * Stored in 'users/{userId}/notifications' subcollection.
 */
export interface ChatNotification {
  id: string;
  userId: string; // User receiving the notification
  type: 'new_message' | 'auction_chat' | 'conversation_started';
  conversationId?: string; // Reference to conversation (for private chats)
  auctionId?: string; // Reference to auction (for auction chats)
  senderId: string; // User who triggered the notification
  senderName: string; // Display name of sender
  message: string; // Notification message/preview
  read: boolean; // Whether the notification has been read
  pushed: boolean; // Whether push notification was sent
  createdAt: Date;
}

/**
 * User presence for typing indicators
 * Stored in 'conversations/{conversationId}/presence/{userId}'
 */
export interface UserPresence {
  userId: string;
  isTyping: boolean;
  lastTyping: Date;
}

/**
 * SiteAsset entity representing static assets used across the site.
 * Stored in 'siteAssets' collection.
 */
export interface SiteAsset {
  id: string;
  name: string; // Unique identifier (e.g., 'logo', 'homepage-hero')
  description?: string; // Description of the asset
  imageUrl: string; // Firebase Storage URL
  altText: string; // Alt text for accessibility
  type: 'logo' | 'hero' | 'banner' | 'icon' | 'other'; // Asset type
  active: boolean; // Whether this asset is currently active
  createdAt: Date;
  updatedAt: Date;
}

/**
 * EventRegistration entity for QR/event-based pre-registrations.
 * Stored in 'eventRegistrations' collection.
 */
export interface EventRegistration {
  id: string;
  email: string;
  fullName?: string;
  source?: string; // e.g., 'qr-event', 'landing-page'
  eventKey: string; // e.g., 'app-launch-2025'
  marketingOptIn?: boolean;
  notes?: string;
  createdAt: Date;
}
 
// Firestore Collections Structure:
// - users: User documents
//   - notifications: ChatNotification subcollection
//   - collection: CollectionItem subcollection (personal coin collection)
// - products: Product documents
//   - priceHistory: PriceHistory subcollection (price evolution tracking)
// - auctions: Auction documents
//   - bids: Bid subcollection under each auction
//   - autoBids: AutoBid subcollection under each auction
//   - publicChat: ChatMessage subcollection for public auction chat (anonymous during bidding)
//   - priceHistory: PriceHistory subcollection (bid price evolution)
// - conversations: Conversation documents (private buyer-seller chats)
//   - messages: ChatMessage subcollection under each conversation