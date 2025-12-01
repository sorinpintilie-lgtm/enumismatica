import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  onSnapshot,
  QueryConstraint,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export type ActivityEventType =
  // Authentication Events
  | 'user_login'
  | 'user_logout'
  | 'user_register'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'email_verification'
  // Navigation Events
  | 'page_view'
  | 'page_leave'
  // Product Events
  | 'product_view'
  | 'product_search'
  | 'product_filter'
  | 'product_create'
  | 'product_update'
  | 'product_delete'
  // Auction Events
  | 'auction_view'
  | 'auction_create'
  | 'auction_bid'
  | 'auction_auto_bid_set'
  | 'auction_auto_bid_cancel'
  | 'auction_end'
  | 'auction_win'
  // Collection Events
  | 'collection_add'
  | 'collection_remove'
  | 'collection_view'
  // Chat Events
  | 'message_send'
  | 'message_read'
  | 'conversation_start'
  // Admin Events
  | 'admin_user_view'
  | 'admin_user_edit'
  | 'admin_user_delete'
  | 'admin_user_ban'
  | 'admin_user_unban'
  | 'admin_password_reset'
  | 'admin_role_change'
  | 'admin_auction_edit'
  | 'admin_auction_cancel'
  | 'admin_product_edit'
  | 'admin_product_delete'
  | 'admin_logs_view'
  // Error Events
  | 'error_occurred'
  | 'api_error'
  | 'payment_error'
  // Security Events
  | 'suspicious_activity'
  | 'rate_limit_exceeded'
  | 'unauthorized_access_attempt';

export interface ActivityLogMetadata {
  // Page/Navigation
  page?: string;
  previousPage?: string;
  referrer?: string;
  
  // User Agent & Device
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
  screenResolution?: string;
  
  // Location (if available)
  ipAddress?: string;
  country?: string;
  city?: string;
  
  // Action specific data
  productId?: string;
  productName?: string;
  auctionId?: string;
  bidAmount?: number;
  searchTerm?: string;
  filters?: Record<string, any>;
  messageId?: string;
  conversationId?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  
  // Error details
  errorMessage?: string;
  errorStack?: string;
  errorCode?: string;
  
  // Admin action details
  adminAction?: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  
  // Performance metrics
  loadTime?: number;
  responseTime?: number;
  
  // Additional context
  [key: string]: any;
}

export interface ActivityLog {
  id?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  eventType: ActivityEventType;
  timestamp: Timestamp;
  metadata: ActivityLogMetadata;
  sessionId?: string;
  isAdmin?: boolean;
}

export interface ActivityLogFilter {
  userId?: string;
  eventType?: ActivityEventType | ActivityEventType[];
  startDate?: Date;
  endDate?: Date;
  isAdmin?: boolean;
  searchTerm?: string;
  limit?: number;
  lastDoc?: DocumentSnapshot;
}

// Get browser and device information
function getBrowserInfo(): { browser: string; os: string; device: string } {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  // Detect browser
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Opera')) browser = 'Opera';

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS')) os = 'iOS';

  // Detect device type
  if (/Mobile|Android|iPhone|iPad|iPod/.test(ua)) {
    device = /iPad|Tablet/.test(ua) ? 'Tablet' : 'Mobile';
  }

  return { browser, os, device };
}

// Generate session ID (stored in sessionStorage)
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('activitySessionId');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('activitySessionId', sessionId);
  }
  return sessionId;
}

/**
 * Log a user activity event
 */
export async function logActivity(
  userId: string,
  eventType: ActivityEventType,
  metadata: ActivityLogMetadata = {},
  userEmail?: string,
  userName?: string,
  isAdmin: boolean = false
): Promise<string> {
  try {
    const { browser, os, device } = getBrowserInfo();
    const sessionId = getSessionId();

    const activityLog: Omit<ActivityLog, 'id'> = {
      userId,
      userEmail,
      userName,
      eventType,
      timestamp: Timestamp.now(),
      sessionId,
      isAdmin,
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        browser,
        os,
        device,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        page: window.location.pathname,
        referrer: document.referrer || undefined,
      },
    };

    const docRef = await addDoc(collection(db, 'activityLogs'), activityLog);
    return docRef.id;
  } catch (error) {
    console.error('Failed to log activity:', error);
    throw error;
  }
}

/**
 * Get activity logs with filtering
 */
export async function getActivityLogs(
  filter: ActivityLogFilter = {}
): Promise<{ logs: ActivityLog[]; lastDoc?: DocumentSnapshot }> {
  try {
    const constraints: QueryConstraint[] = [];

    if (filter.userId) {
      constraints.push(where('userId', '==', filter.userId));
    }

    if (filter.eventType) {
      if (Array.isArray(filter.eventType)) {
        constraints.push(where('eventType', 'in', filter.eventType));
      } else {
        constraints.push(where('eventType', '==', filter.eventType));
      }
    }

    if (filter.isAdmin !== undefined) {
      constraints.push(where('isAdmin', '==', filter.isAdmin));
    }

    if (filter.startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(filter.startDate)));
    }

    if (filter.endDate) {
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(filter.endDate)));
    }

    constraints.push(orderBy('timestamp', 'desc'));

    if (filter.lastDoc) {
      constraints.push(startAfter(filter.lastDoc));
    }

    constraints.push(limit(filter.limit || 50));

    const q = query(collection(db, 'activityLogs'), ...constraints);
    const snapshot = await getDocs(q);

    const logs: ActivityLog[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ActivityLog[];

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    return { logs, lastDoc };
  } catch (error) {
    console.error('Failed to get activity logs:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time activity logs
 */
export function subscribeToActivityLogs(
  filter: ActivityLogFilter,
  callback: (logs: ActivityLog[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const constraints: QueryConstraint[] = [];

    if (filter.userId) {
      constraints.push(where('userId', '==', filter.userId));
    }

    if (filter.eventType) {
      if (Array.isArray(filter.eventType)) {
        constraints.push(where('eventType', 'in', filter.eventType));
      } else {
        constraints.push(where('eventType', '==', filter.eventType));
      }
    }

    if (filter.isAdmin !== undefined) {
      constraints.push(where('isAdmin', '==', filter.isAdmin));
    }

    constraints.push(orderBy('timestamp', 'desc'));
    constraints.push(limit(filter.limit || 50));

    const q = query(collection(db, 'activityLogs'), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs: ActivityLog[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ActivityLog[];
        callback(logs);
      },
      (error) => {
        console.error('Activity logs subscription error:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Failed to subscribe to activity logs:', error);
    throw error;
  }
}

/**
 * Get activity statistics for a user
 */
export async function getUserActivityStats(userId: string): Promise<{
  totalEvents: number;
  eventsByType: Record<string, number>;
  lastActivity: Date | null;
  sessionsCount: number;
}> {
  try {
    const { logs } = await getActivityLogs({ userId, limit: 1000 });

    const eventsByType: Record<string, number> = {};
    const sessions = new Set<string>();
    let lastActivity: Date | null = null;

    logs.forEach((log) => {
      // Count by event type
      eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1;

      // Track sessions
      if (log.sessionId) {
        sessions.add(log.sessionId);
      }

      // Track last activity
      const logDate = log.timestamp.toDate();
      if (!lastActivity || logDate > lastActivity) {
        lastActivity = logDate;
      }
    });

    return {
      totalEvents: logs.length,
      eventsByType,
      lastActivity,
      sessionsCount: sessions.size,
    };
  } catch (error) {
    console.error('Failed to get user activity stats:', error);
    throw error;
  }
}

/**
 * Get recent activity across all users (admin only)
 */
export async function getRecentActivity(limitCount: number = 100): Promise<ActivityLog[]> {
  try {
    const q = query(
      collection(db, 'activityLogs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ActivityLog[];
  } catch (error) {
    console.error('Failed to get recent activity:', error);
    throw error;
  }
}

/**
 * Search activity logs by metadata
 */
export async function searchActivityLogs(
  searchTerm: string,
  filter: ActivityLogFilter = {}
): Promise<ActivityLog[]> {
  try {
    // Get all logs with basic filters
    const { logs } = await getActivityLogs({ ...filter, limit: 1000 });

    // Filter by search term in metadata
    const searchLower = searchTerm.toLowerCase();
    return logs.filter((log) => {
      const metadataStr = JSON.stringify(log.metadata).toLowerCase();
      return (
        metadataStr.includes(searchLower) ||
        log.userEmail?.toLowerCase().includes(searchLower) ||
        log.userName?.toLowerCase().includes(searchLower) ||
        log.eventType.toLowerCase().includes(searchLower)
      );
    });
  } catch (error) {
    console.error('Failed to search activity logs:', error);
    throw error;
  }
}