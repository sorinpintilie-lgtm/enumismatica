import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { pullbackProduct } from '../../../../../../shared/pullbackService';
import { requireVerifiedUser } from '../../../../lib/apiAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireVerifiedUser(request);
    const productId = (await params).id;

    await pullbackProduct(productId, user.uid);

    return NextResponse.json(
      { success: true, message: 'Produsul a fost returnat în colecție cu succes' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Eroare la returnarea produsului:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Eroare necunoscută' },
      { status: 400 }
    );
  }
}