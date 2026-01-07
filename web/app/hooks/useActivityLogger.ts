import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePathname } from 'next/navigation';
import { logActivity } from 'shared/activityLogService';

/**
 * Hook to automatically log user activity
 */
export function useActivityLogger() {
  const { user } = useAuth();
  const pathname = usePathname();
  const previousPathRef = useRef<string>('');

  useEffect(() => {
    // Scroll to top on page change
    window.scrollTo(0, 0);

    if (!user) return;

    const logPageView = async () => {
      try {
        const metadata: any = {
          page: pathname,
        };

        if (previousPathRef.current) {
          metadata.previousPage = previousPathRef.current;
        }

        if (document.referrer) {
          metadata.referrer = document.referrer;
        }

        await logActivity(
          user.uid,
          'page_view',
          metadata,
          user.email || undefined,
          user.displayName || undefined,
          user.isAdmin || false
        );

        previousPathRef.current = pathname;
      } catch (error) {
        console.error('Failed to log page view:', error);
      }
    };

    const pingSession = async () => {
      try {
        const sessionId = localStorage.getItem('enumismatica_session_id');
        if (!sessionId) return;
        const token = await user.getIdToken();
        await fetch('/api/auth/sessions/ping', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId }),
        });
      } catch (err) {
        // Never block navigation.
        console.warn('Failed to ping session:', err);
      }
    };

    logPageView();
    pingSession();

    // Log page leave on unmount
    return () => {
      if (user && pathname) {
        logActivity(
          user.uid,
          'page_leave',
          {
            page: pathname,
            timeOnPage: Date.now(),
          },
          user.email || undefined,
          user.displayName || undefined,
          user.isAdmin || false
        ).catch((error) => {
          console.error('Failed to log page leave:', error);
        });
      }
    };
  }, [user, pathname]);
}

/**
 * Helper function to log specific events
 */
export async function logEvent(
  user: any,
  eventType: any,
  metadata: any = {}
): Promise<void> {
  if (!user) return;

  try {
    await logActivity(
      user.uid,
      eventType,
      metadata,
      user.email || undefined,
      user.displayName || undefined,
      user.isAdmin || false
    );
  } catch (error) {
    console.error(`Failed to log event ${eventType}:`, error);
  }
}
