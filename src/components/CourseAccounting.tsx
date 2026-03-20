import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { AccountingEntry, UserProfile } from '../types';
import { Plus, Loader2, TrendingUp, TrendingDown, CheckCircle2, Clock, User as UserIcon, Paperclip, MoreVertical, Edit2, Trash2, PieChart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import AddAccountingEntryModal from './AddAccountingEntryModal';
import AccountingEntryDetailsModal from './AccountingEntryDetailsModal';
import ConfirmationModal from './ConfirmationModal';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface CourseAccountingProps {
  courseId: string;
}

export default function CourseAccounting({ courseId }: CourseAccountingProps) {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AccountingEntry | null>(null);
  const [addType, setAddType] = useState<'cost' | 'payment'>('cost');
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  const canEdit = profile?.role === 'admin' || profile?.role === 'accountant' || profile?.department === 'Operation' || profile?.email === 'hasan.alassaf91@gmail.com';

  useEffect(() => {
    const q = query(
      collection(db, 'courses', courseId, 'accountingEntries'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountingEntry)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `courses/${courseId}/accountingEntries`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [courseId]);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userMap: Record<string, UserProfile> = {};
      snapshot.docs.forEach(doc => {
        userMap[doc.id] = doc.data() as UserProfile;
      });
      setUsers(userMap);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, []);

  const handleCheck = async (entryId: string, isChecked: boolean) => {
    if (!auth.currentUser) return;
    const entryRef = doc(db, 'courses', courseId, 'accountingEntries', entryId);
    try {
      await updateDoc(entryRef, {
        checkedBy: isChecked ? arrayUnion(auth.currentUser.uid) : arrayRemove(auth.currentUser.uid)
      });
    } catch (error) {
      console.error('Error updating check status:', error);
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      const entryRef = doc(db, 'courses', courseId, 'accountingEntries', entryId);
      await deleteDoc(entryRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `courses/${courseId}/accountingEntries/${entryId}`);
    }
  };

  const totals = entries.reduce((acc, entry) => {
    if (entry.type === 'payment') acc.payments += entry.value;
    else acc.costs += entry.value;
    return acc;
  }, { payments: 0, costs: 0 });

  const expensePercentage = totals.payments > 0 ? (totals.costs / totals.payments) * 100 : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-[#5A5A40] dark:text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Sold For (Revenue)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100">${totals.payments.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Total Costs</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100">${totals.costs.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-4">
          <div className={cn(
            "h-12 w-12 rounded-2xl flex items-center justify-center",
            totals.payments - totals.costs >= 0 
              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
              : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
          )}>
            <TrendingUp size={24} className={totals.payments - totals.costs < 0 ? "rotate-180" : ""} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Net Balance</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100">${(totals.payments - totals.costs).toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <PieChart size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Expense Ratio</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{expensePercentage.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="serif text-2xl text-[#5A5A40] dark:text-emerald-500">Financial Records</h3>
        {canEdit && (
          <div className="flex gap-3">
            <button
              onClick={() => { setAddType('payment'); setIsAddModalOpen(true); }}
              className="flex items-center gap-2 rounded-full bg-emerald-600 dark:bg-emerald-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-600/20 dark:shadow-emerald-900/20 transition-all hover:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              <Plus size={18} />
              Add Payment
            </button>
            <button
              onClick={() => { setAddType('cost'); setIsAddModalOpen(true); }}
              className="flex items-center gap-2 rounded-full bg-red-600 dark:bg-red-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-600/20 dark:shadow-red-900/20 transition-all hover:bg-red-700 dark:hover:bg-red-600"
            >
              <Plus size={18} />
              Add Cost
            </button>
          </div>
        )}
      </div>

      {/* Entries List */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {entries.map((entry) => {
            const isChecked = entry.checkedBy.length > 0;
            const isApproved = entry.checkRequests.length > 0 && entry.checkRequests.every(uid => entry.checkedBy.includes(uid));
            const hasPending = entry.checkRequests.length > 0 && !isApproved;

            return (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "group relative overflow-hidden rounded-[2rem] p-6 shadow-sm border-l-4 transition-all hover:shadow-md cursor-pointer",
                  (isChecked || isApproved)
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 dark:border-emerald-600" 
                    : "bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-600"
                )}
                onClick={() => setSelectedEntry(entry)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      (isChecked || isApproved) 
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
                        : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    )}>
                      {entry.type === 'payment' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-900 dark:text-zinc-100">
                          {entry.currency} {entry.value.toLocaleString()}
                        </span>
                        <span className={cn(
                          "text-xs font-medium uppercase tracking-widest",
                          (isChecked || isApproved) ? "text-emerald-600/60 dark:text-emerald-400/60" : "text-red-600/60 dark:text-red-400/60"
                        )}>{entry.date}</span>
                        {entry.entryType && (
                          <span className={cn(
                            "rounded-full px-3 py-0.5 text-[10px] font-bold uppercase",
                            (isChecked || isApproved) 
                              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" 
                              : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                          )}>
                            {entry.entryType}
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        "text-sm leading-relaxed",
                        (isChecked || isApproved) ? "text-emerald-900/70 dark:text-emerald-100/70" : "text-red-900/70 dark:text-red-100/70"
                      )}>{entry.description}</p>
                    
                    {/* Staff Assignments */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {entry.assignedTo.map(uid => (
                        <div key={uid} className="flex items-center gap-1.5 rounded-full bg-[#5A5A40]/5 dark:bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-[#5A5A40] dark:text-emerald-500">
                          <UserIcon size={10} />
                          @{users[uid]?.name || 'Staff'}
                        </div>
                      ))}
                    </div>

                    {/* Attachments */}
                    {entry.attachments && entry.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-3">
                        {entry.attachments.map((file, i) => (
                          <a
                            key={i}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-xl bg-gray-50 dark:bg-zinc-800 px-3 py-1.5 text-[10px] font-medium text-gray-600 dark:text-zinc-400 border border-gray-100 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <Paperclip size={12} />
                            <span className="max-w-[100px] truncate">{file.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-4">
                    {/* Check Status */}
                    <div className="flex flex-col items-end">
                      <div className="flex -space-x-2">
                        {entry.checkedBy.map(uid => (
                          <div key={uid} title={`Checked by ${users[uid]?.name}`} className="h-6 w-6 rounded-full border-2 border-white dark:border-zinc-900 bg-emerald-500 flex items-center justify-center text-[8px] text-white font-bold">
                            {users[uid]?.name[0]}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheck(entry.id, !entry.checkedBy.includes(auth.currentUser?.uid || ''));
                        }}
                        className={cn(
                          "mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold transition-all",
                          entry.checkedBy.includes(auth.currentUser?.uid || '')
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 dark:bg-zinc-800/50 text-gray-400 dark:text-zinc-500 hover:bg-gray-200 dark:hover:bg-zinc-700"
                        )}
                      >
                        <CheckCircle2 size={12} />
                        {entry.checkedBy.includes(auth.currentUser?.uid || '') ? 'Checked' : 'Mark as Checked'}
                      </button>
                    </div>

                    {/* Pending Requests */}
                    {entry.checkRequests.length > 0 && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-tighter">Waiting for:</span>
                        <div className="flex flex-wrap justify-end gap-1 max-w-[150px]">
                          {entry.checkRequests.filter(uid => !entry.checkedBy.includes(uid)).map(uid => (
                            <span key={uid} className="text-[10px] text-gray-400 dark:text-zinc-500">{users[uid]?.name},</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEntryToDelete(entry.id);
                        }}
                        className="rounded-full p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all bg-white dark:bg-zinc-950 shadow-sm border border-red-100 dark:border-red-900/50"
                        title="Delete Entry"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-zinc-600 bg-white dark:bg-zinc-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-zinc-800">
            <TrendingUp size={48} className="mb-4 opacity-20" />
            <p>No financial records found for this course.</p>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <AddAccountingEntryModal
          courseId={courseId}
          type={addType}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {selectedEntry && (
        <AccountingEntryDetailsModal
          courseId={courseId}
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!entryToDelete}
        onClose={() => setEntryToDelete(null)}
        onConfirm={() => entryToDelete && handleDelete(entryToDelete)}
        title="Delete Accounting Entry"
        message="Are you sure you want to delete this accounting entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
