'use client';

import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
	isAdmin,
	isSuperAdmin,
	getAllUsers,
	setUserAsAdmin,
	removeAdminRole,
	deleteUser,
} from 'shared/adminService';
import { User } from 'shared/types';

export default function AdminUsers() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);

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
      await loadUsers();
      setLoading(false);
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

  const loadUsers = async () => {
    const allUsers = await getAllUsers();
    setUsers(allUsers);
  };

  const handleMakeAdmin = async (userId: string) => {
    if (!confirm('Ești sigur că vrei să faci acest utilizator admin?')) return;
    
    const result = await setUserAsAdmin(userId, true);
    if (result.success) {
      await loadUsers();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!confirm('Ești sigur că vrei să elimini privilegiile de admin ale acestui utilizator?')) return;
    
    const result = await removeAdminRole(userId, true);
    if (result.success) {
      await loadUsers();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Ești sigur că vrei să ștergi acest utilizator? Acest lucru NU va șterge contul lor Firebase Auth.')) return;
    
    const result = await deleteUser(userId);
    if (result.success) {
      await loadUsers();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

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
          <h1 className="text-3xl font-bold text-white">Gestionează utilizatori</h1>
          <Link
            href="/admin"
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium"
          >
            Înapoi la Admin
          </Link>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            {users.length === 0 ? (
              <p className="text-gray-500">Niciun utilizator găsit.</p>
            ) : (
              <div className="space-y-4">
                {users.map((u) => (
                  <div key={u.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="text-lg font-semibold text-blue-600 hover:text-blue-800"
                          >
                            {u.displayName}
                          </Link>
                          {u.role === 'admin' && (
                            <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                              Admin
                            </span>
                          )}
                          {u.id === 'QEm0DSIzylNQIHpQAZlgtWQkYYE3' && (
                            <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                              Super Admin
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          <p>Email: {u.email}</p>
                          <p>ID Utilizator: {u.id}</p>
                          <p>Creat: {u.createdAt.toLocaleDateString()}</p>
                        </div>
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                          Vezi detalii complete →
                        </Link>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {u.id !== 'QEm0DSIzylNQIHpQAZlgtWQkYYE3' && (
                          <>
                            {u.role === 'admin' ? (
                              <button
                                onClick={() => handleRemoveAdmin(u.id)}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm"
                              >
                                Elimină Admin
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMakeAdmin(u.id)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                              >
                                Fă Admin
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
                            >
                              Șterge
                            </button>
                          </>
                        )}
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
