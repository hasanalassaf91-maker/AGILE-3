import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Users, UserPlus, Mail, Shield, Trash2, Loader2, Search, ShieldAlert, StickyNote } from 'lucide-react';
import AddUserModal from '../components/AddUserModal';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import ConfirmationModal from '../components/ConfirmationModal';
import { cn } from '../lib/utils';

export default function Team() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(doc => doc.data() as UserProfile));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (uid: string) => {
    if (uid === profile?.uid) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  };

  const togglePermission = async (uid: string, currentStatus: boolean) => {
    if (profile?.role !== 'admin' && profile?.email !== 'hasan.alassaf91@gmail.com') return;
    try {
      await updateDoc(doc(db, 'users', uid), {
        canDeleteNotes: !currentStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-[#5A5A40]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="serif text-3xl text-[#5A5A40] dark:text-[#a3a38a]">Team Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your coordinators, sales team, and trainers.</p>
        </div>
        {profile?.role === 'admin' && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-full bg-[#5A5A40] dark:bg-[#a3a38a] px-6 py-2.5 text-sm font-medium text-white dark:text-black shadow-sm transition-all hover:bg-[#4A4A30] dark:hover:bg-[#8e8e7a]"
          >
            <UserPlus size={18} />
            Add Member
          </button>
        )}
      </header>

      {isAddModalOpen && <AddUserModal onClose={() => setIsAddModalOpen(false)} />}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text"
          placeholder="Search by name, email or role..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl border-none bg-white dark:bg-[#1e1e1e] px-12 py-4 shadow-sm focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-[#a3a38a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredMembers.map((member) => (
          <motion.div
            key={member.uid}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden rounded-3xl bg-white dark:bg-[#1e1e1e] p-6 shadow-sm transition-all hover:shadow-md border border-gray-50 dark:border-gray-800"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800 text-[#5A5A40] dark:text-[#a3a38a]">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{member.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Mail size={12} />
                    {member.email}
                  </div>
                </div>
              </div>
              {(profile?.role === 'admin' || profile?.department === 'Operation' || profile?.email === 'hasan.alassaf91@gmail.com') && member.uid !== profile.uid && (
                <button 
                  onClick={() => setMemberToDelete({ id: member.uid, name: member.name })}
                  className="rounded-full p-2 text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-gray-50 dark:border-gray-800 pt-4">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-[#5A5A40] dark:text-[#a3a38a]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#5A5A40] dark:text-[#a3a38a]">
                  {member.role}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {(profile?.role === 'admin' || profile?.email === 'hasan.alassaf91@gmail.com') && (
                  <button
                    onClick={() => togglePermission(member.uid, !!member.canDeleteNotes)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                      member.canDeleteNotes 
                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50" 
                        : "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                    title={member.canDeleteNotes ? "Can delete notes" : "Cannot delete notes"}
                  >
                    <StickyNote size={12} />
                    {member.canDeleteNotes ? "CAN DELETE" : "NO DELETE"}
                  </button>
                )}
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
          <Users size={48} className="mb-4 opacity-20" />
          <p>No team members found matching your search.</p>
        </div>
      )}
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        onConfirm={() => memberToDelete && handleDelete(memberToDelete.id)}
        title="Delete Team Member"
        message={`Are you sure you want to delete ${memberToDelete?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Debug Info for Super Admin */}
      {profile?.email === 'hasan.alassaf91@gmail.com' && (
        <div className="fixed bottom-4 left-4 z-50 rounded-lg bg-black/80 p-2 text-[10px] text-white backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert size={12} className="text-amber-400" />
            <span>Admin: {profile.role} | {profile.department || 'No Dept'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
