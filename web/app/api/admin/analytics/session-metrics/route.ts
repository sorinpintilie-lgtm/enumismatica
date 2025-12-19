import { NextResponse } from 'next/server';
import { getSessionMetrics } from '../../../../../../shared/activityLogService';
import { isAdmin, isSuperAdmin } from '../../../../../../shared/adminService';
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

		// Session metrics endpoint is reserved for super-admin
		const isSuper = await isSuperAdmin(user.uid);
		if (!isSuper) {
			return NextResponse.json(
				{ success: false, error: 'Forbidden - Superadmin access required' },
				{ status: 403 }
			);
		}

    // Get session metrics
    const metrics = await getSessionMetrics();

    return NextResponse.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Error in session metrics API:', error);

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
