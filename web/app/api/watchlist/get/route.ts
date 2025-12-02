import { NextResponse } from 'next/server';
import { getUserWatchlist } from 'shared/watchlistService';
import { auth } from 'shared/firebaseConfig';

export async function GET(request: Request) {
  try {
    // Autentificare utilizator - încearcă Firebase, apoi antetul x-user-id
    const headerUserId = request.headers.get('x-user-id');
    const uid = auth.currentUser?.uid || headerUserId;

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'Neautorizat - te rugăm să te autentifici' },
        { status: 401 }
      );
    }

    // Obține lista de urmărire a utilizatorului
    const result = await getUserWatchlist(uid);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Nu s-a putut încărca lista de urmărire',
        },
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
      { success: false, error: 'Eroare internă de server la încărcarea listei de urmărire' },
      { status: 500 }
    );
  }
}