import { NextResponse } from 'next/server';
import { checkWatchlistStatus } from 'shared/watchlistService';
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

    // Check watchlist status
    const result = await checkWatchlistStatus(user.uid, itemId);

    return NextResponse.json(
      {
        success: true,
        exists: result.exists,
        item: result.item || null
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Watchlist check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}