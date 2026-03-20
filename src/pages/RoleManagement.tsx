import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Shield, UserCog, Search, Check, Loader2, AlertCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { cn } from '../lib/utils';

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin (مدير)', description: 'Full access to all features and team management.' },
  { value: 'user', label: 'User (مستخدم)', description: 'Standard access to assigned courses and workspace.' },
  { value: 'coordinator', label: 'Coordinator (منسق)', description: 'Field management and course logistics.' },
  { value: 'sales', label: 'Sales (مبيعات)', description: 'Course creation and client relationship management.' },
  { value: 'trainer', label: 'Trainer (مدرب)', description: 'Access to course materials and attendance.' },
  { value: 'accountant', label: 'Accountant (محاسب)', description: 'Manage course accounting, costs, and payments.' },
  { value: 'finance', label: 'Finance Manager (مدير مالي)', description: 'Full financial oversight and reporting.' },
  { value: 'marketing', label: 'Marketing (تسويق)', description: 'Promotion and course visibility.' },
  { value: 'hr', label: 'HR (موارد بشرية)', description: 'Staff and participant coordination.' },
];

export default function RoleManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    if (uid === profile?.uid) {
      alert("You cannot change your own role to prevent losing admin access.");
      return;
    }

    setUpdatingId(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-[#5A5A40]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-[#5A5A40] dark:bg-[#a3a38a] text-white dark:text-black flex items-center justify-center">
            <UserCog size={24} />
          </div>
          <h1 className="serif text-3xl text-[#5A5A40] dark:text-[#a3a38a]">Role Control Center</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400">Manage permissions and access levels for all system users.</p>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text"
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl border-none bg-white dark:bg-[#1e1e1e] px-12 py-4 shadow-sm focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-[#a3a38a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      <div className="bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">User Information</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Current Role</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[#5A5A40] dark:text-[#a3a38a] font-bold text-lg">
                        {user.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        user.role === 'admin' ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50" :
                        user.role === 'user' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50" :
                        "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-700"
                      )}>
                        {user.role}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-end">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                        disabled={updatingId === user.uid || user.uid === profile?.uid}
                        className="rounded-xl border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-[#a3a38a] disabled:opacity-50"
                      >
                        {ROLES.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      {updatingId === user.uid && (
                        <Loader2 className="ml-2 animate-spin text-[#5A5A40] dark:text-[#a3a38a]" size={16} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ROLES.map((role) => (
          <div key={role.value} className="bg-white dark:bg-[#1e1e1e] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Shield size={18} className="text-[#5A5A40] dark:text-[#a3a38a]" />
              <h4 className="font-bold text-gray-900 dark:text-white">{role.label}</h4>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{role.description}</p>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
          <AlertCircle className="mx-auto text-gray-200 dark:text-gray-700 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">No users found matching your search.</p>
        </div>
      )}
    </div>
  );
}
