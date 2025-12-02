import { NextResponse } from 'next/server';
import { getHelpCategories, createHelpCategory } from '../../../../../shared/helpService';
import { auth } from '../../../../../shared/firebaseConfig';

export async function GET(request: Request) {
  try {
    const result = await getHelpCategories();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.categories);
  } catch (error) {
    console.error('Help categories API error:', error);
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
    const result = await createHelpCategory({
      name: data.name,
      description: data.description,
      order: data.order,
      parentCategoryId: data.parentCategoryId,
      icon: data.icon,
      language: data.language
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ categoryId: result.categoryId });
  } catch (error) {
    console.error('Create help category API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}