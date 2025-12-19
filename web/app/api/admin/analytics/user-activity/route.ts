import { NextResponse } from 'next/server';
import { getUserActivityAnalytics } from '../../../../../../shared/activityLogService';
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

		// Detailed user-activity analytics is reserved for super-admin
		const isSuper = await isSuperAdmin(user.uid);
		if (!isSuper) {
			return NextResponse.json(
				{ success: false, error: 'Forbidden - Superadmin access required' },
				{ status: 403 }
			);
		}

    // Get user ID from query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Bad Request - userId parameter is required' },
        { status: 400 }
      );
    }

    // Get user activity analytics
    const analytics = await getUserActivityAnalytics(userId);

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error in user activity analytics API:', error);

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
