import { NextResponse } from 'next/server';
import { submitHelpFeedback } from '../../../../../shared/helpService';
import { auth } from '../../../../../shared/firebaseConfig';

export async function POST(request: Request) {
  try {
    // Check user authentication
    const user = auth.currentUser;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { articleId, rating, feedback } = await request.json();

    if (!articleId || !rating) {
      return NextResponse.json({ error: 'Article ID and rating are required' }, { status: 400 });
    }

    const result = await submitHelpFeedback(articleId, user.uid, rating, feedback);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Help feedback API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}