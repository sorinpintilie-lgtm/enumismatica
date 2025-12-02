import { NextResponse } from 'next/server';
import { getHelpArticles, createHelpArticle, updateHelpArticle } from '../../../../../shared/helpService';
import { auth } from '../../../../../shared/firebaseConfig';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const language = searchParams.get('language') as 'ro' | 'en' | null;
    const status = searchParams.get('status') as 'published' | 'draft' | 'archived' | null;
    const limit = searchParams.get('limit');
    const tags = searchParams.get('tags')?.split(',');

    const result = await getHelpArticles({
      categoryId,
      language: language || undefined,
      status: status || undefined,
      limitCount: limit ? parseInt(limit) : undefined,
      tags
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.articles);
  } catch (error) {
    console.error('Help articles API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Check admin authentication
    const user = auth.currentUser;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const result = await createHelpArticle({
      title: data.title,
      content: data.content,
      categoryId: data.categoryId,
      language: data.language,
      tags: data.tags,
      createdBy: user.uid,
      status: data.status || 'draft'
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ articleId: result.articleId });
  } catch (error) {
    console.error('Create help article API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    // Check admin authentication
    const user = auth.currentUser;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { articleId, ...updateData } = await request.json();
    const result = await updateHelpArticle(articleId, updateData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update help article API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}