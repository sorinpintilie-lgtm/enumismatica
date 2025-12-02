import { NextResponse } from 'next/server';
import { removeFromWatchlist } from 'shared/watchlistService';
import { auth } from 'shared/firebaseConfig';

export async function POST(request: Request) {
  try {
    // Authenticate user
    const user = auth.currentUser;
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { itemId } = await request.json();

    // Validate required fields
    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: itemId is required' },
        { status: 400 }
      );
    }

    // Remove from watchlist
    const result = await removeFromWatchlist(user.uid, itemId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to remove item from watchlist' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );

  } catch (error) {
    console.error('Watchlist remove error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}