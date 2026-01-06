'use client';

import { useState } from 'react';
import { uploadLocalFileAsSiteAsset } from 'shared/siteAssetService';

export default function UploadSiteAssetsPage() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const uploadAssets = async () => {
    setLoading(true);
    setStatus('Starting upload process...');
    const uploadResults: any[] = [];

    try {
      // Upload logo
      setStatus('Uploading logo...');
      const logoResult = await uploadLocalFileAsSiteAsset(
        'logo',
        '/assets/eNumismatica.ro_logo.png',
        'E-numismatica Logo',
        'logo',
        'Main site logo displayed in navigation'
      );
      uploadResults.push({ name: 'Logo', success: true, data: logoResult });
      setStatus('Logo uploaded successfully!');

      // Upload homepage hero image
      setStatus('Uploading homepage hero image...');
      const heroResult = await uploadLocalFileAsSiteAsset(
        'homepage-hero',
        '/assets/20-gouden-munt-double-eagle-coronet-head-achterkant-web_big.png',
        'Moneda Double Eagle din colectia noastra',
        'hero',
        'Homepage hero image showing Double Eagle Coronet Head coin'
      );
      uploadResults.push({ name: 'Homepage Hero', success: true, data: heroResult });
      setStatus('Homepage hero image uploaded successfully!');

      setResults(uploadResults);
      setStatus('SUCCESS: All assets uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading assets:', error);
      setStatus(`Error: ${error.message}`);
      uploadResults.push({ name: 'Error', success: false, error: error.message });
      setResults(uploadResults);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Upload Site Assets to Firebase
          </h1>
          <p className="text-slate-600 mb-8">
            This page will upload the logo and homepage hero image to Firebase Storage
            and create corresponding Firestore documents.
          </p>

          <div className="space-y-4">
            <button
              onClick={uploadAssets}
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Uploading...' : 'Upload Assets to Firebase'}
            </button>

            {status && (
              <div className={`p-4 rounded-lg ${
                status.startsWith('Error') 
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : status.startsWith('SUCCESS')
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
              }`}>
                <p className="font-medium">{status}</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="mt-6 space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">Upload Results:</h2>
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <h3 className="font-semibold text-slate-900 mb-2">
                      {result.name} {result.success ? '(OK)' : '(FAIL)'}
                    </h3>
                    {result.success && result.data && (
                      <div className="text-sm text-slate-700 space-y-1">
                        <p><strong>ID:</strong> {result.data.id}</p>
                        <p><strong>Type:</strong> {result.data.type}</p>
                        <p><strong>Alt Text:</strong> {result.data.altText}</p>
                        <p className="break-all"><strong>URL:</strong> {result.data.imageUrl}</p>
                      </div>
                    )}
                    {!result.success && result.error && (
                      <p className="text-sm text-red-700">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-semibold text-amber-900 mb-2">Important Notes:</h3>
              <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                <li>This will upload images to Firebase Storage</li>
                <li>Firestore documents will be created in the 'siteAssets' collection</li>
                <li>The logo will be accessible via the 'logo' document ID</li>
                <li>The hero image will be accessible via the 'homepage-hero' document ID</li>
                <li>After successful upload, update the Navigation and Homepage components</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
