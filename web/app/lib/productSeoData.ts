import { adminDb } from './firebaseAdmin';

const DEFAULT_FIREBASE_PROJECT_ID = 'e-numismatica-ro';
const DEFAULT_FIREBASE_API_KEY = 'AIzaSyBbIZjstBI9an8Qnff6MEdraZErMzVjw1M';

const FIREBASE_PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  DEFAULT_FIREBASE_PROJECT_ID;

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.FIREBASE_API_KEY ||
  DEFAULT_FIREBASE_API_KEY;

export type SeoProduct = {
  id: string;
  name: string;
  description: string;
  images: string[];
  status?: string;
  listingType?: string;
  isSold?: boolean;
  price?: number;
  updatedAt?: Date;
  createdAt?: Date;
};

function parseTimestamp(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

function parseFirestoreValue(value: any): any {
  if (!value || typeof value !== 'object') return undefined;

  if (value.stringValue !== undefined) return value.stringValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return Number(value.doubleValue);
  if (value.timestampValue !== undefined) return new Date(value.timestampValue);

  if (value.arrayValue !== undefined) {
    const values = value.arrayValue.values || [];
    return values.map((entry: any) => parseFirestoreValue(entry));
  }

  if (value.mapValue !== undefined) {
    const fields = value.mapValue.fields || {};
    const parsed: Record<string, any> = {};
    for (const [key, fieldValue] of Object.entries(fields)) {
      parsed[key] = parseFirestoreValue(fieldValue);
    }
    return parsed;
  }

  return undefined;
}

function normalizeSeoProduct(raw: Partial<SeoProduct> & { id: string }): SeoProduct {
  const images = Array.isArray(raw.images)
    ? raw.images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0)
    : [];

  return {
    id: raw.id,
    name: raw.name || 'Piesă numismatică',
    description: raw.description || 'Piesă disponibilă în catalogul eNumismatica.',
    images,
    status: raw.status,
    listingType: raw.listingType,
    isSold: raw.isSold,
    price: raw.price,
    updatedAt: parseTimestamp(raw.updatedAt),
    createdAt: parseTimestamp(raw.createdAt),
  };
}

function isIndexableProduct(product: SeoProduct): boolean {
  return product.status === 'approved' && product.listingType === 'direct' && product.isSold !== true;
}

function extractRestProduct(document: any): SeoProduct | null {
  if (!document?.name || !document?.fields) return null;

  const id = String(document.name).split('/').pop();
  if (!id) return null;

  const parsedFields: Record<string, any> = {};
  for (const [key, firestoreValue] of Object.entries(document.fields)) {
    parsedFields[key] = parseFirestoreValue(firestoreValue);
  }

  return normalizeSeoProduct({
    id,
    name: parsedFields.name,
    description: parsedFields.description,
    images: parsedFields.images,
    status: parsedFields.status,
    listingType: parsedFields.listingType,
    isSold: parsedFields.isSold,
    price: parsedFields.price,
    updatedAt: parsedFields.updatedAt,
    createdAt: parsedFields.createdAt,
  });
}

async function getSeoProductByIdFromAdmin(id: string): Promise<SeoProduct | null> {
  if (!adminDb) return null;

  const snap = await adminDb.collection('products').doc(id).get();
  if (!snap.exists) return null;

  const data = snap.data() as any;
  return normalizeSeoProduct({
    id: snap.id,
    name: data?.name,
    description: data?.description,
    images: data?.images,
    status: data?.status,
    listingType: data?.listingType,
    isSold: data?.isSold,
    price: typeof data?.price === 'number' ? data.price : undefined,
    updatedAt: data?.updatedAt,
    createdAt: data?.createdAt,
  });
}

async function getSeoProductByIdFromRest(id: string): Promise<SeoProduct | null> {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/products/${encodeURIComponent(id)}?key=${encodeURIComponent(FIREBASE_API_KEY)}`;

  const response = await fetch(endpoint, { next: { revalidate: 900 } });
  if (!response.ok) return null;

  const data = await response.json();
  return extractRestProduct(data);
}

export async function getSeoProductById(id: string): Promise<SeoProduct | null> {
  if (!id) return null;

  try {
    const fromAdmin = await getSeoProductByIdFromAdmin(id);
    if (fromAdmin) return fromAdmin;
  } catch (error) {
    console.error('[seo] Failed to read product from Firebase Admin:', error);
  }

  try {
    return await getSeoProductByIdFromRest(id);
  } catch (error) {
    console.error('[seo] Failed to read product from Firestore REST API:', error);
    return null;
  }
}

async function listSeoProductsFromAdmin(limitCount: number): Promise<SeoProduct[] | null> {
  if (!adminDb) return null;

  const snapshot = await adminDb
    .collection('products')
    .where('status', '==', 'approved')
    .limit(limitCount)
    .get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data() as any;
      return normalizeSeoProduct({
        id: doc.id,
        name: data?.name,
        description: data?.description,
        images: data?.images,
        status: data?.status,
        listingType: data?.listingType,
        isSold: data?.isSold,
        price: typeof data?.price === 'number' ? data.price : undefined,
        updatedAt: data?.updatedAt,
        createdAt: data?.createdAt,
      });
    })
    .filter(isIndexableProduct);
}

async function listSeoProductsFromRest(limitCount: number): Promise<SeoProduct[]> {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${encodeURIComponent(FIREBASE_API_KEY)}`;

  const body = {
    structuredQuery: {
      from: [{ collectionId: 'products' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'status' },
          op: 'EQUAL',
          value: { stringValue: 'approved' },
        },
      },
      limit: limitCount,
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    next: { revalidate: 900 },
  });

  if (!response.ok) return [];

  const rows = await response.json();
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row: any) => extractRestProduct(row?.document))
    .filter((entry: SeoProduct | null): entry is SeoProduct => entry !== null)
    .filter(isIndexableProduct);
}

export async function listSeoProductEntries(
  limitCount: number = 5000,
): Promise<Array<{ id: string; updatedAt?: Date }>> {
  const map = new Map<string, Date | undefined>();

  try {
    const fromAdmin = await listSeoProductsFromAdmin(limitCount);
    if (fromAdmin) {
      fromAdmin.forEach((product) => {
        map.set(product.id, product.updatedAt || product.createdAt);
      });
    }
  } catch (error) {
    console.error('[seo] Failed to list products via Firebase Admin:', error);
  }

  if (map.size === 0) {
    try {
      const fromRest = await listSeoProductsFromRest(limitCount);
      fromRest.forEach((product) => {
        map.set(product.id, product.updatedAt || product.createdAt);
      });
    } catch (error) {
      console.error('[seo] Failed to list products via Firestore REST API:', error);
    }
  }

  return Array.from(map.entries()).map(([id, updatedAt]) => ({ id, updatedAt }));
}

