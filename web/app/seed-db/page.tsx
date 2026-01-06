'use client';

import { useState } from 'react';
import { seedAllData, resetDatabase } from 'shared/seed';
import Link from 'next/link';

export default function SeedDatabase() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
