'use client';

import { useEffect, useState } from 'react';
import { seedAllData, resetDatabase } from 'shared/seed';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { isSuperAdmin } from 'shared/adminService';

export default function SeedDatabase() {
  const { user, loading: authLoading } = useAuth();
  const [superAdminChecked, setSuperAdminChecked] = useState(false);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [compressionTestFile, setCompressionTestFile] = useState<File | null>(null);
  const [compressionTestLoading, setCompressionTestLoading] = useState(false);
  const [compressionTestMessage, setCompressionTestMessage] = useState('');
  const [compressionTestError, setCompressionTestError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user?.uid) {
        setSuperAdminChecked(true);
        setIsSuperAdminUser(false);
        return;
      }

      setSuperAdminChecked(false);
      try {
        console.log('[SeedDB] Checking superadmin status for user', {
          uid: user.uid,
          email: user.email,
          roleFromProfile: (user as any).role,
          isSuperAdminFromProfile: (user as any).isSuperAdmin,
        });

        const status = await isSuperAdmin(user.uid);
        console.log('[SeedDB] isSuperAdmin() result', { uid: user.uid, status });
        if (cancelled) return;
        setIsSuperAdminUser(status);
        setSuperAdminChecked(true);
      } catch (e) {
        console.error('[SeedDB] Failed to check superadmin status', e);
        if (cancelled) return;
        setIsSuperAdminUser(false);
        setSuperAdminChecked(true);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const handleTestTinifyCompression = async () => {
    if (!compressionTestFile) {
      setCompressionTestError('Selectează o imagine pentru test.');
      return;
    }

    setCompressionTestLoading(true);
    setCompressionTestMessage('');
    setCompressionTestError('');

    const maxBytes = 750 * 1024;

    try {
      console.log('[TinifyTest] Starting compression test');
      console.log('[TinifyTest] Selected file', {
        name: compressionTestFile.name,
        type: compressionTestFile.type,
        sizeBytes: compressionTestFile.size,
        sizeKB: Math.round(compressionTestFile.size / 1024),
      });

      const formData = new FormData();
      formData.append('file', compressionTestFile);

      console.log('[TinifyTest] POST /api/tinify');
      const res = await fetch('/api/tinify', {
        method: 'POST',
        body: formData,
      });

      console.log('[TinifyTest] Response received', {
        ok: res.ok,
        status: res.status,
        contentType: res.headers.get('content-type'),
        xOriginalSize: res.headers.get('x-original-size'),
        xOptimizedSize: res.headers.get('x-optimized-size'),
        xMaxBytes: res.headers.get('x-max-bytes'),
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        console.error('[TinifyTest] Non-OK response body', bodyText);
        throw new Error(`Tinify API failed (${res.status}). ${bodyText}`);
      }

      const blob = await res.blob();
      const compressedFile = new File([blob], compressionTestFile.name.replace(/\.[^/.]+$/, '.webp'), {
        type: 'image/webp',
      });

      console.log('[TinifyTest] Compressed output', {
        outputBytes: compressedFile.size,
        outputKB: Math.round(compressedFile.size / 1024),
        isUnderLimit: compressedFile.size <= maxBytes,
        maxBytes,
      });

      setCompressionTestMessage(
        `OK: ${Math.round(compressionTestFile.size / 1024)}KB → ${Math.round(compressedFile.size / 1024)}KB (limită: 750KB)`
      );
    } catch (err: any) {
      console.error('[TinifyTest] Test failed', err);
      setCompressionTestError(err?.message || 'Testul a eșuat');
    } finally {
      setCompressionTestLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!confirm('This will add sample data to your database. Continue?')) return;
    
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await seedAllData();
      setMessage('Database seeded successfully! Added 10 users, 25 products (5 pending, 2 rejected), and 20 auctions (5 pending, 2 rejected).');
    } catch (err: any) {
      setError(`Error seeding database: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('WARNING: This will DELETE ONLY seeded data from your database! Manually created data will be preserved. Are you sure?')) return;
    
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await resetDatabase();
      setMessage('Seeded data reset successfully! Manually created data has been preserved.');
    } catch (err: any) {
      setError(`Error resetting database: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndSeed = async () => {
    if (!confirm('This will DELETE all existing data and add fresh sample data. Continue?')) return;
    
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await resetDatabase();
      setMessage('Database reset complete. Now seeding...');
      await seedAllData();
      setMessage('Database reset and seeded successfully! Fresh sample data is now available.');
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !superAdminChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow-md">
          <p className="text-gray-700">Loading auth / permissions...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access denied</h1>
          <p className="text-gray-700">
            This page is restricted to superadmins.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Signed in as: {user?.email || 'unknown'} ({user?.uid || 'no uid'})
          </p>
          <div className="mt-6">
            <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Database Management</h1>
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Admin
          </Link>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h2 className="font-semibold text-blue-900 mb-2">Sample Data Includes:</h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 10 users with avatars</li>
            <li>• 25 products (18 approved, 5 pending, 2 rejected)</li>
            <li>• 20 auctions (6 active, 5 pending, 3 ended, 2 rejected)</li>
            <li>• Multiple bids on active auctions</li>
          </ul>
        </div>

        {message && (
          <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-md border border-green-200">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-md border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleSeed}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Seed Database (Add Sample Data)'}
          </button>

          <button
            onClick={handleResetAndSeed}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Reset & Seed (Fresh Start)'}
          </button>

          <button
            onClick={handleReset}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Reset Seeded Data'}
          </button>
        </div>

        <div className="mt-8 border-t pt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Tinify Compression Test (≤ 750KB)</h2>
          <p className="text-sm text-gray-600 mb-4">
            Selectează o imagine mare și apasă “Test Tinify Compression”. Verifică consola pentru log-uri detaliate.
          </p>

          <input
            type="file"
            accept="image/*"
            className="block w-full text-sm text-gray-700"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setCompressionTestFile(file);
              setCompressionTestMessage('');
              setCompressionTestError('');
              console.log('[TinifyTest] File input changed', {
                hasFile: !!file,
                name: file?.name,
                type: file?.type,
                sizeBytes: file?.size,
                sizeKB: file ? Math.round(file.size / 1024) : undefined,
              });
            }}
          />

          {compressionTestMessage && (
            <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-md border border-green-200">
              {compressionTestMessage}
            </div>
          )}

          {compressionTestError && (
            <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-md border border-red-200">
              {compressionTestError}
            </div>
          )}

          <button
            onClick={handleTestTinifyCompression}
            disabled={compressionTestLoading || !compressionTestFile}
            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {compressionTestLoading ? 'Testing...' : 'Test Tinify Compression'}
          </button>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Make sure you have deployed the Firestore rules before seeding data.
            The reset function will only delete seeded data (marked with 'seeded: true'), preserving manually created users, products, and auctions.
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            Go to Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
