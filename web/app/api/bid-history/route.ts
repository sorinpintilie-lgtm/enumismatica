import { NextResponse } from 'next/server';
import { getBidHistoryForAuction, getUserBidHistory, getBidHistoryTrends } from 'shared/bidHistoryService';
import { auth } from 'shared/firebaseConfig';

/**
 * Bid History API Endpoints
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const auctionId = searchParams.get('auctionId');
  const userId = searchParams.get('userId');
  const limit = searchParams.get('limit') || '100';

  try {
    // Check authentication
    const user = auth.currentUser;
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please authenticate first' },
        { status: 401 }
      );
    }

    // Security: Check if user has access to this auction
    if (auctionId) {
      // For auction-specific bid history, check if user is participating or is admin
      // This would require checking if user has placed bids or has auto-bids on this auction
      // For now, we'll allow access to any authenticated user to see bid history
      // In production, you might want to add more granular access control
    }

    // Security: For user-specific bid history, ensure user can only access their own data
    if (userId && userId !== user.uid) {
      return NextResponse.json(
        { error: 'Forbidden - You can only access your own bid history' },
        { status: 403 }
      );
    }

    // Validate parameters
    if (!auctionId && !userId) {
      return NextResponse.json(
        { error: 'Either auctionId or userId parameter is required' },
        { status: 400 }
      );
    }

    // Route based on parameters
    if (auctionId) {
      // Get bid history for specific auction
      const limitCount = parseInt(limit) || 100;
      const { bids, stats } = await getBidHistoryForAuction(auctionId, limitCount);

      return NextResponse.json({
        success: true,
        auctionId,
        bids,
        stats
      });

    } else if (userId) {
      // Get user's bid history across all auctions
      const limitCount = parseInt(limit) || 50;
      const bids = await getUserBidHistory(userId, limitCount);

      return NextResponse.json({
        success: true,
        userId,
        bids
      });
    }

  } catch (error: any) {
    console.error('Bid history API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch bid history',
        details: error.message || String(error)
      },
      { status: 500 }
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
    // Check authentication
    const user = auth.currentUser;
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please authenticate first' },
        { status: 401 }
      );
    }

    // Security: Check if user has access to this auction for trend analysis
    // Trend analysis might contain sensitive bidding patterns, so we should restrict access
    // For now, we'll allow any authenticated user, but in production you might want
    // to restrict this to auction participants or admins only

    if (!auctionId) {
      return NextResponse.json(
        { error: 'auctionId parameter is required for trend analysis' },
        { status: 400 }
      );
    }

    // Get bid history trends
    const trends = await getBidHistoryTrends(auctionId);

    return NextResponse.json({
      success: true,
      auctionId,
      ...trends
    });

  } catch (error: any) {
    console.error('Bid history trends API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to analyze bid history trends',
        details: error.message || String(error)
      },
      { status: 500 }
    );
  }
}