import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Since we changed to immediate pullback without admin approval,
    // this endpoint is no longer needed for pullback requests.
    // We can return an empty array or remove this endpoint entirely.
    
    return NextResponse.json(
      { success: true, requests: [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Eroare la obținerea cererilor de retragere:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Eroare necunoscută' },
      { status: 400 }
    );
  }
}