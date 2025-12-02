import { NextResponse } from 'next/server';
import { detectBehavioralPatterns } from '../../../../../../shared/activityLogService';
import { isAdmin } from '../../../../../../shared/adminService';
import { auth } from '../../../../../../shared/firebaseConfig';

export async function GET(request: Request) {
  try {
    // Authenticate user
    const user = auth.currentUser;
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin privileges
    const isAdminUser = await isAdmin(user.uid);
    if (!isAdminUser) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Detect behavioral patterns
    const patterns = await detectBehavioralPatterns();

    return NextResponse.json({
      success: true,
      data: patterns
    });

  } catch (error) {
    console.error('Error in behavioral patterns API:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}