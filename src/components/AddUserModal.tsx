import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserRole, UserProfile } from '../types';
import { X, Loader2, UserPlus } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface AddUserModalProps {
  onClose: () => void;
}

export default function AddUserModal({ onClose }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'coordinator' as UserRole,
    canDeleteNotes: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Generate a simple ID for mock/manual users if they don't have a real UID yet
      // In a real app, this would be done via Firebase Admin SDK or during sign-up
      const uid = `user_${Date.now()}`;
      const newUser: UserProfile = {
        uid,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        canDeleteNotes: formData.canDeleteNotes,
      };

      await setDoc(doc(db, 'users', uid), newUser);
      alert(`User ${formData.name} added successfully as ${formData.role}`);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1e1e1e] p-8 shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-8">
          <h2 className="serif text-2xl text-[#5A5A40] dark:text-[#a3a38a]">Add Team Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Full Name</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. حسن"
              className="w-full rounded-xl border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-[#a3a38a] text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Email Address</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="email@example.com"
              className="w-full rounded-xl border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-[#a3a38a] text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Role</label>
            <select 
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
              className="w-full rounded-xl border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-[#a3a38a] text-gray-900 dark:text-white"
            >
              <option value="coordinator">Coordinator (منسق)</option>
              <option value="sales">Sales (مبيعات)</option>
              <option value="trainer">Trainer (مدرب)</option>
              <option value="admin">Admin (مدير)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <input 
              type="checkbox" 
              id="canDeleteNotes"
              checked={formData.canDeleteNotes}
              onChange={e => setFormData({...formData, canDeleteNotes: e.target.checked})}
              className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 text-[#5A5A40] dark:text-[#a3a38a] focus:ring-[#5A5A40] dark:focus:ring-[#a3a38a] bg-white dark:bg-gray-700"
            />
            <label htmlFor="canDeleteNotes" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Allow deleting course notes
            </label>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-[#5A5A40] dark:bg-[#a3a38a] py-4 text-sm font-medium text-white dark:text-black shadow-md hover:bg-[#4A4A30] dark:hover:bg-[#8e8e7a] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
            Add Member
          </button>
        </form>
      </div>
    </div>
  );
}
