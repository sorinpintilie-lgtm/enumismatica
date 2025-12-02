import { NextResponse } from 'next/server';
import { getHelpAnalytics } from '../../../../../shared/helpService';
import { auth } from '../../../../../shared/firebaseConfig';

export async function GET(request: Request) {
  try {
    // Check admin authentication
    const user = auth.currentUser;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getHelpAnalytics();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.analytics);
  } catch (error) {
    console.error('Help analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}