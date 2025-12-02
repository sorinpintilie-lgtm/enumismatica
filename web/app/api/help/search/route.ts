import { NextResponse } from 'next/server';
import { searchHelpContent } from '../../../../../shared/helpService';

export async function POST(request: Request) {
  try {
    const { searchQuery, language } = await request.json();

    if (!searchQuery) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const result = await searchHelpContent(searchQuery, language);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.results);
  } catch (error) {
    console.error('Help search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}