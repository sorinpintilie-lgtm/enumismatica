import { NextResponse } from 'next/server';
import { getUserWatchlist } from 'shared/watchlistService';
import { auth } from 'shared/firebaseConfig';

export async function GET(request: Request) {
  try {
    // Authenticate user
    const user = auth.currentUser;
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's watchlist
    const result = await getUserWatchlist(user.uid);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to retrieve watchlist' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, items: result.items || [] },
      { status: 200 }
    );

  } catch (error) {
    console.error('Watchlist get error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}