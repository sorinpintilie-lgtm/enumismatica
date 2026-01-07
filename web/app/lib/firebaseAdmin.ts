import * as admin from 'firebase-admin';

type ServiceAccountLike = {
  project_id?: string;
  projectId?: string;
  client_email?: string;
  clientEmail?: string;
  private_key?: string;
  privateKey?: string;
};

function loadServiceAccountFromEnv(): ServiceAccountLike | null {
  // Preferred: single JSON env var (easier on Netlify).
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return JSON.parse(json) as ServiceAccountLike;
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON', e);
    }
  }

  // Optional: base64-encoded JSON.
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    try {
      const decoded = Buffer.from(b64, 'base64').toString('utf8');
      return JSON.parse(decoded) as ServiceAccountLike;
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64', e);
    }
  }

  // Fallback: split vars.
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKeyRaw) {
    return {
      projectId,
      clientEmail,
      privateKey: privateKeyRaw,
    };
  }

  return null;
}

const serviceAccount = loadServiceAccountFromEnv();
const projectId = serviceAccount?.project_id || serviceAccount?.projectId;
const clientEmail = serviceAccount?.client_email || serviceAccount?.clientEmail;
const privateKey = (serviceAccount?.private_key || serviceAccount?.privateKey || '')
  .replace(/\\n/g, '\n')
  .trim();

const hasAdminCredentials = !!(projectId && clientEmail && privateKey);

// Initialize Firebase Admin SDK only if credentials are available
if (!admin.apps.length && hasAdminCredentials) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      } as any),
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    console.warn(
      '⚠️  Firebase admin credentials are not fully configured. Set FIREBASE_SERVICE_ACCOUNT_JSON (recommended) or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.',
    );
  }
} else if (!hasAdminCredentials) {
  console.warn(
    '⚠️  Firebase admin credentials are not fully configured. Set FIREBASE_SERVICE_ACCOUNT_JSON (recommended) or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.',
  );
}

// Export safe accessors that check if admin is initialized
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
export const adminStorage = admin.apps.length > 0 ? admin.storage() : null;

export default admin;
