import { NextResponse } from 'next/server';
import {
  getBidHistoryForAuction,
  getUserBidHistory,
  getBidHistoryTrends,
} from 'shared/bidHistoryService';
import { auth } from 'shared/firebaseConfig';

/**
 * Helper to determine the effective user ID for authenticated requests.
 * On the server, Firebase Auth may not have a currentUser, so we also
 * accept an explicit "x-user-id" header from the client when needed.
 */
function getEffectiveUserId(request: Request): string | null {
  const headerUserId = request.headers.get('x-user-id');
  const currentUserId = auth.currentUser?.uid || null;
  return currentUserId || headerUserId;
}

/**
 * Bid History API Endpoints
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const auctionId = searchParams.get('auctionId');
  const userId = searchParams.get('userId');
  const limit = searchParams.get('limit') || '100';

  try {
    const effectiveUserId = getEffectiveUserId(request);

    // Validate parameters
    if (!auctionId && !userId) {
      return NextResponse.json(
        { error: 'Either auctionId or userId parameter is required' },
        { status: 400 },
      );
    }

    // Security: For user-specific bid history, ensure caller can only access their own data
    if (userId) {
      if (!effectiveUserId || userId !== effectiveUserId) {
        return NextResponse.json(
          { error: 'Forbidden - You can only access your own bid history' },
          { status: 403 },
        );
      }
    }

    // Route based on parameters
    if (auctionId) {
      // Public (per Firestore rules) auction bid history for visualization
      const limitCount = parseInt(limit) || 100;
      const { bids, stats } = await getBidHistoryForAuction(auctionId, limitCount);

      return NextResponse.json(
        {
          success: true,
          auctionId,
          bids,
          stats,
        },
        { status: 200 },
      );
    }

    // User-specific bid history (requires effectiveUserId already validated above)
    if (userId) {
      const limitCount = parseInt(limit) || 50;
      const bids = await getUserBidHistory(userId, limitCount);

      return NextResponse.json(
        {
          success: true,
          userId,
          bids,
        },
        { status: 200 },
      );
    }

    // Fallback (should not be reached due to earlier validation)
    return NextResponse.json(
      { error: 'Invalid parameters' },
      { status: 400 },
    );
  } catch (error: any) {
    console.error('Bid history API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch bid history',
        details: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * Get bid history trends and analysis
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const auctionId = searchParams.get('auctionId');

  try {
    if (!auctionId) {
      return NextResponse.json(
        { error: 'auctionId parameter is required for trend analysis' },
        { status: 400 },
      );
    }

    // Trends are computed from the same bid data; Firestore rules control read access.
    const trends = await getBidHistoryTrends(auctionId);

    return NextResponse.json(
      {
        success: true,
        auctionId,
        ...trends,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error('Bid history trends API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to analyze bid history trends',
        details: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}