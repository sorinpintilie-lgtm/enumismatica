import { NextResponse } from 'next/server';
import { getPopularHelpArticles } from '../../../../../shared/helpService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '5';
    const limitCount = parseInt(limit);

    const result = await getPopularHelpArticles(limitCount);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.articles);
  } catch (error) {
    console.error('Popular help articles API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}