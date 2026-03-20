import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { AccountingEntry, UserProfile } from '../types';
import { X, Plus, Loader2, Paperclip, Trash2, Check, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType, handleStorageError } from '../lib/firestore-errors';

interface AddAccountingEntryModalProps {
  courseId: string;
  type: 'cost' | 'payment';
  onClose: () => void;
}

const CURRENCIES = ['USD', 'EUR', 'SAR', 'AED', 'GBP'] as const;

export default function AddAccountingEntryModal({ courseId, type, onClose }: AddAccountingEntryModalProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [formData, setFormData] = useState({
    value: 0,
    currency: 'USD' as typeof CURRENCIES[number],
    date: new Date().toISOString().split('T')[0],
    description: '',
    entryType: '',
    isZeroValue: false,
    salesId: '',
    assignedTo: [] as string[],
    checkRequests: [] as string[],
    note: '',
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const attachmentUrls = await Promise.all(
        selectedFiles.map(async (file) => {
          const storagePath = `accounting/${courseId}/${Date.now()}_${file.name}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          return {
            name: file.name,
            url,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString()
          };
        })
      );

      const entry: Omit<AccountingEntry, 'id'> = {
        courseId,
        type,
        value: formData.isZeroValue ? 0 : formData.value,
        currency: formData.currency,
        date: formData.date,
        description: formData.description,
        entryType: formData.entryType,
        isZeroValue: formData.isZeroValue,
        salesId: formData.salesId,
        assignedTo: formData.assignedTo,
        checkRequests: formData.checkRequests,
        checkedBy: [],
        attachments: attachmentUrls,
        note: formData.note,
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser.uid,
      };

      await addDoc(collection(db, 'courses', courseId, 'accountingEntries'), entry);
      onClose();
    } catch (error) {
      handleStorageError(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (uid: string, field: 'assignedTo' | 'checkRequests') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(uid)
        ? prev[field].filter(id => id !== uid)
        : [...prev[field], uid]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-[2.5rem] bg-white dark:bg-zinc-900 shadow-2xl flex flex-col border border-transparent dark:border-zinc-800"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 p-8">
          <div>
            <h2 className="serif text-2xl text-[#5A5A40] dark:text-emerald-500">
              Add {type === 'cost' ? 'Cost' : 'Payment'} Entry
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Record a new financial transaction for this course.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <X size={24} className="text-gray-400 dark:text-zinc-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Value</label>
              <input
                type="number"
                required
                disabled={formData.isZeroValue}
                value={isNaN(formData.value) ? '' : formData.value}
                onChange={e => {
                  const val = e.target.value === '' ? NaN : parseFloat(e.target.value);
                  setFormData({ ...formData, value: val });
                }}
                className="w-full rounded-2xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Currency</label>
              <select
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value as any })}
                className="w-full rounded-2xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-2xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Description</label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-2xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500"
              placeholder="Enter transaction details..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Entry Type</label>
              <select
                value={formData.entryType}
                onChange={e => setFormData({ ...formData, entryType: e.target.value })}
                className="w-full rounded-2xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500"
              >
                <option value="">Select Type</option>
                <option value="Sale / Revenue">Sale / Revenue</option>
                <option value="Operation">Operation</option>
                <option value="Travel">Travel</option>
                <option value="Accommodation">Accommodation</option>
                <option value="Trainer Fee">Trainer Fee</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-8">
              <input
                type="checkbox"
                id="zeroValue"
                checked={formData.isZeroValue}
                onChange={e => setFormData({ ...formData, isZeroValue: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#5A5A40] dark:text-emerald-500 focus:ring-[#5A5A40] dark:focus:ring-emerald-500"
              />
              <label htmlFor="zeroValue" className="text-sm text-gray-600 dark:text-zinc-400">Zero Value Entry</label>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Assign To Staff</label>
            <div className="flex flex-wrap gap-2">
              {users.map(user => (
                <button
                  key={user.uid}
                  type="button"
                  onClick={() => toggleUserSelection(user.uid, 'assignedTo')}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all",
                    formData.assignedTo.includes(user.uid)
                      ? "bg-[#5A5A40] dark:bg-emerald-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                  )}
                >
                  <UserIcon size={14} />
                  {user.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Request Check From</label>
            <div className="flex flex-wrap gap-2">
              {users.map(user => (
                <button
                  key={user.uid}
                  type="button"
                  onClick={() => toggleUserSelection(user.uid, 'checkRequests')}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all",
                    formData.checkRequests.includes(user.uid)
                      ? "bg-amber-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                  )}
                >
                  <Check size={14} />
                  {user.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Attachments (Images, PDF, Office)</label>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 dark:border-zinc-800 border-dashed rounded-2xl cursor-pointer bg-gray-50 dark:bg-zinc-800/30 hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Paperclip className="w-8 h-8 mb-3 text-gray-400 dark:text-zinc-600" />
                    <p className="mb-2 text-sm text-gray-500 dark:text-zinc-400 font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Images, PDF, Word, Excel (Max 8MB)</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    multiple 
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip size={14} className="text-gray-400 dark:text-zinc-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-600 dark:text-zinc-300 truncate">{file.name}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Internal Note</label>
            <input
              type="text"
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
              className="w-full rounded-2xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500"
              placeholder="Private note for accounting team..."
            />
          </div>
        </form>

        <div className="border-t border-gray-100 dark:border-zinc-800 p-8 flex justify-end gap-4 bg-gray-50/50 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 rounded-full bg-[#5A5A40] dark:bg-emerald-500 px-8 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#5A5A40]/20 dark:shadow-emerald-900/20 transition-all hover:bg-[#4A4A30] dark:hover:bg-emerald-600 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            Add Entry
          </button>
        </div>
      </motion.div>
    </div>
  );
}
