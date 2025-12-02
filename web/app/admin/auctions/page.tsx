'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  isAdmin,
  getAllAuctions,
  deleteAuction,
  approveAuction,
  rejectAuction,
  forceEndAuction,
} from 'shared/adminService';
import { Auction } from 'shared/types';

export default function AdminAuctions() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'ended' | 'rejected'>('all');

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      const adminStatus = await isAdmin(user.uid);
      if (!adminStatus) {
        router.push('/dashboard');
        return;
      }

      setIsAdminUser(true);
      await loadAuctions();
      setLoading(false);
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

  const loadAuctions = async () => {
    const allAuctions = await getAllAuctions();
    setAuctions(allAuctions);
  };

  const handleDelete = async (auctionId: string) => {
    if (!confirm('Ești sigur că vrei să ștergi această licitație?')) return;
    
    const result = await deleteAuction(auctionId);
    if (result.success) {
      await loadAuctions();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleApprove = async (auctionId: string) => {
    const result = await approveAuction(auctionId);
    if (result.success) {
      await loadAuctions();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleReject = async (auctionId: string) => {
    const result = await rejectAuction(auctionId);
    if (result.success) {
      await loadAuctions();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleForceEnd = async (auctionId: string) => {
    if (!confirm('Ești sigur că vrei să închei forțat această licitație?')) return;
    
    const result = await forceEndAuction(auctionId);
    if (result.success) {
      await loadAuctions();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const filteredAuctions = auctions.filter(a => 
    filter === 'all' ? true : a.status === filter
  );

  if (authLoading || loading || !isAdminUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Gestionează licitații</h1>
          <Link
            href="/admin"
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Înapoi la Admin
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Toate ({auctions.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md ${
              filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            În așteptare ({auctions.filter(a => a.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-md ${
              filter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Active ({auctions.filter(a => a.status === 'active').length})
          </button>
          <button
            onClick={() => setFilter('ended')}
            className={`px-4 py-2 rounded-md ${
              filter === 'ended' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Încheiate ({auctions.filter(a => a.status === 'ended').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-md ${
              filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Respinse ({auctions.filter(a => a.status === 'rejected').length})
          </button>
        </div>

        {/* Auctions List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            {filteredAuctions.length === 0 ? (
              <p className="text-gray-500">Nicio licitație găsită.</p>
            ) : (
              <div className="space-y-4">
                {filteredAuctions.map((auction) => (
                  <div key={auction.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Licitație #{auction.id.slice(-6)}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              auction.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : auction.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : auction.status === 'ended'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {auction.status}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          <p>ID Produs: {auction.productId}</p>
                          <p>Preț de rezervă: ${auction.reservePrice.toFixed(2)}</p>
                          {auction.currentBid && (
                            <p>Licitație curentă: ${auction.currentBid.toFixed(2)}</p>
                          )}
                          <p>
                            Start: {auction.startTime.toLocaleDateString()} - Sfârșit:{' '}
                            {auction.endTime.toLocaleDateString()}
                          </p>
                          <p>Creat: {auction.createdAt.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {auction.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(auction.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                            >
                              Aprobă
                            </button>
                            <button
                              onClick={() => handleReject(auction.id)}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm"
                            >
                              Respinge
                            </button>
                          </>
                        )}
                        {auction.status === 'active' && (
                          <button
                            onClick={() => handleForceEnd(auction.id)}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm"
                          >
                            Încheie forțat
                          </button>
                        )}
                        {auction.status === 'rejected' && (
                          <button
                            onClick={() => handleApprove(auction.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                          >
                            Aprobă
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(auction.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
                        >
                          Șterge
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
