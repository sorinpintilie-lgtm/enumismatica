import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { pullbackAuction } from '../../../../../../shared/pullbackService';
import { requireVerifiedUser } from '../../../../lib/apiAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireVerifiedUser(request);
    const auctionId = (await params).id;

    await pullbackAuction(auctionId, user.uid);

    return NextResponse.json(
      { success: true, message: 'Licitația a fost returnată în colecție cu succes' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Eroare la returnarea licitației:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Eroare necunoscută' },
      { status: 400 }
    );
  }
}