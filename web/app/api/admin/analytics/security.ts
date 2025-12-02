import { NextResponse } from 'next/server';
import { isAdmin } from 'shared/adminService';
import { auth } from 'shared/firebaseConfig';
import { logActivity } from 'shared/activityLogService';
import { User } from 'shared/types';

interface SecurityMiddlewareResult {
  success: boolean;
  error?: string;
  status?: number;
  user?: any;
}

/**
 * Security middleware for admin analytics endpoints
 */
export async function adminAnalyticsSecurityMiddleware(request: Request, requiredRole: 'admin' | 'superadmin' = 'admin'): Promise<SecurityMiddlewareResult> {
  try {
    // Authenticate user
    const user = auth.currentUser;
    if (!user) {
      // Log unauthorized access attempt
      await logActivity(
        'anonymous',
        'unauthorized_access_attempt',
        {
          endpoint: request.url,
          method: request.method,
          error: 'No authenticated user'
        },
        undefined,
        undefined,
        false
      );

      return {
        success: false,
        error: 'Unauthorized - Authentication required',
        status: 401
      };
    }

    // Check admin privileges
    const isAdminUser = await isAdmin(user.uid);
    if (!isAdminUser) {
      // Log unauthorized access attempt
      await logActivity(
        user.uid,
        'unauthorized_access_attempt',
        {
          endpoint: request.url,
          method: request.method,
          userRole: 'user',
          error: 'Insufficient privileges'
        },
        user.email,
        user.displayName,
        false
      );

      return {
        success: false,
        error: 'Forbidden - Admin access required',
        status: 403
      };
    }

    // For superadmin-only endpoints
    if (requiredRole === 'superadmin') {
      // Check if user is superadmin (hardcoded UID)
      const ADMIN_UID = 'QEm0DSIzylNQIHpQAZlgtWQkYYE3';
      if (user.uid !== ADMIN_UID) {
        await logActivity(
          user.uid,
          'unauthorized_access_attempt',
          {
            endpoint: request.url,
            method: request.method,
            userRole: 'admin',
            error: 'Superadmin access required'
          },
          user.email,
          user.displayName,
          true
        );

        return {
          success: false,
          error: 'Forbidden - Superadmin access required',
          status: 403
        };
      }
    }

    // Log successful admin access
    await logActivity(
      user.uid,
      'admin_analytics_access',
      {
        endpoint: request.url,
        method: request.method,
        userRole: requiredRole
      },
      user.email,
      user.displayName,
      true
    );

    return { success: true, user };

  } catch (error) {
    console.error('Security middleware error:', error);

    // Log security error
    await logActivity(
      'system',
      'security_error',
      {
        endpoint: request.url,
        method: request.method,
        error: error instanceof Error ? error.message : 'Unknown security error'
      },
      undefined,
      undefined,
      false
    );

    return {
      success: false,
      error: 'Internal Server Error',
      status: 500
    };
  }
}

/**
 * GDPR compliance helper - anonymize user data for analytics
 */
export function anonymizeUserDataForAnalytics(userData: any): any {
  // Create a copy to avoid mutating original
  const anonymizedData = { ...userData };

  // Remove or anonymize personally identifiable information
  if (anonymizedData.email) {
    anonymizedData.email = anonymizeEmail(anonymizedData.email);
  }

  if (anonymizedData.userName) {
    anonymizedData.userName = anonymizeName(anonymizedData.userName);
  }

  if (anonymizedData.metadata?.ipAddress) {
    anonymizedData.metadata.ipAddress = anonymizeIP(anonymizedData.metadata.ipAddress);
  }

  if (anonymizedData.metadata?.userAgent) {
    anonymizedData.metadata.userAgent = 'Anonymized User Agent';
  }

  return anonymizedData;
}

function anonymizeEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return 'anonymous@example.com';

  const anonymizedLocal = localPart.length > 3
    ? localPart[0] + '***@' + domain
    : '***@' + domain;

  return anonymizedLocal;
}

function anonymizeName(name: string): string {
  if (name.length <= 3) return 'Anonymous';
  return name[0] + '***';
}

function anonymizeIP(ip: string): string {
  // For IPv4: keep only first octet
  if (ip.includes('.')) {
    const parts = ip.split('.');
    return parts[0] + '.*.*.*';
  }
  // For IPv6: keep only first part
  return ip.split(':')[0] + '::*';
}

/**
 * Rate limiting middleware
 */
const rateLimitCache = new Map<string, { count: number; lastReset: number }>();

export function checkRateLimit(ip: string, endpoint: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const cacheKey = `${ip}:${endpoint}`;

  // Reset cache if window has passed
  if (!rateLimitCache.has(cacheKey) || (rateLimitCache.get(cacheKey)?.lastReset || 0) < now - windowMs) {
    rateLimitCache.set(cacheKey, { count: 1, lastReset: now });
    return true;
  }

  // Increment count
  const cacheEntry = rateLimitCache.get(cacheKey);
  if (cacheEntry) {
    cacheEntry.count++;
    if (cacheEntry.count > limit) {
      return false;
    }
    rateLimitCache.set(cacheKey, cacheEntry);
  }

  return true;
}