import { NextResponse } from 'next/server';
import { clearWatchlist } from 'shared/watchlistService';
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

    // Clear entire watchlist
    const result = await clearWatchlist(user.uid);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to clear watchlist' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );

  } catch (error) {
    console.error('Watchlist clear error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}