import { logActivity } from '../../shared/activityLogService';

export function logEvent(user: any, eventName: string, data: any) {
  if (!user) {
    console.warn('Cannot log event: user is null or undefined');
    return Promise.resolve('skipped_no_user');
  }
  
  return logActivity(user.uid, eventName as any, data, user.email, user.displayName || user.name);
}