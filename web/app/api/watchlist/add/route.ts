import { NextResponse } from 'next/server';
import { addToWatchlist } from 'shared/watchlistService';
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

    const { itemType, itemId, notes } = await request.json();

    // Validate required fields
    if (!itemType || !itemId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: itemType and itemId are required' },
        { status: 400 }
      );
    }

    // Validate itemType
    if (itemType !== 'product' && itemType !== 'auction') {
      return NextResponse.json(
        { success: false, error: 'Invalid itemType: must be either "product" or "auction"' },
        { status: 400 }
      );
    }

    // Add to watchlist
    const result = await addToWatchlist(user.uid, itemType, itemId, notes);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to add item to watchlist' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, itemId: result.itemId },
      { status: 200 }
    );

  } catch (error) {
    console.error('Watchlist add error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}