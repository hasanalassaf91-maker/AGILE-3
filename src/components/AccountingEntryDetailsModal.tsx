import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { AccountingEntry, AccountingComment, UserProfile, Course } from '../types';
import { X, Send, User as UserIcon, Clock, Paperclip, TrendingUp, TrendingDown, MessageSquare, AlertCircle, Edit2, Check, Save, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface AccountingEntryDetailsModalProps {
  courseId: string;
  entry: AccountingEntry;
  onClose: () => void;
}

export default function AccountingEntryDetailsModal({ courseId, entry, onClose }: AccountingEntryDetailsModalProps) {
  const { profile } = useAuth();
  const [comments, setComments] = useState<AccountingComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    value: entry.value,
    currency: entry.currency,
    description: entry.description,
    note: entry.note || '',
    entryType: entry.entryType || ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      const courseDoc = await getDoc(doc(db, 'courses', courseId));
      if (courseDoc.exists()) {
        setCourse({ id: courseDoc.id, ...courseDoc.data() } as Course);
      }
    };
    fetchCourse();
  }, [courseId]);

  useEffect(() => {
    const q = query(
      collection(db, 'courses', courseId, 'accountingEntries', entry.id, 'comments'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountingComment)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `courses/${courseId}/accountingEntries/${entry.id}/comments`);
    });

    return () => unsubscribe();
  }, [courseId, entry.id]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !auth.currentUser || !profile) return;

    setLoading(true);
    setError(null);
    const path = `courses/${courseId}/accountingEntries/${entry.id}/comments`;
    
    try {
      const comment: Omit<AccountingComment, 'id'> = {
        authorId: auth.currentUser.uid,
        authorName: profile.name,
        authorRole: profile.role,
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, path), comment);
      setNewComment('');
    } catch (err: any) {
      console.error('Error adding comment:', err);
      const errInfo = {
        error: err.message,
        operationType: OperationType.CREATE,
        path,
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          role: profile?.role
        }
      };
      setError(err.message.includes('permission') ? 'You do not have permission to comment.' : 'Failed to send comment.');
      console.error('Firestore Error Info:', JSON.stringify(errInfo));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEntry = async () => {
    if (!auth.currentUser || !profile) return;
    setSaving(true);
    setError(null);
    try {
      const entryRef = doc(db, 'courses', courseId, 'accountingEntries', entry.id);
      await updateDoc(entryRef, {
        ...editData,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser.uid
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error updating entry:', err);
      setError('Failed to update entry. Check your permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    setSaving(true);
    setError(null);
    try {
      const entryRef = doc(db, 'courses', courseId, 'accountingEntries', entry.id);
      await deleteDoc(entryRef);
      onClose();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `courses/${courseId}/accountingEntries/${entry.id}`);
      setError('Failed to delete entry. Check your permissions.');
    } finally {
      setSaving(false);
    }
  };

  // Check if user can comment: Admin, Accountant, Finance, or Course Coordinator
  const canComment = 
    profile?.role === 'admin' || 
    profile?.role === 'accountant' || 
    profile?.role === 'finance' || 
    profile?.uid === course?.coordinatorId ||
    profile?.email === 'hasan.alassaf91@gmail.com';

  const canEdit = 
    profile?.role === 'admin' || 
    profile?.role === 'accountant' || 
    profile?.department === 'Operation' ||
    profile?.email === 'hasan.alassaf91@gmail.com';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl h-[85vh] overflow-hidden rounded-[2.5rem] bg-white dark:bg-zinc-900 shadow-2xl flex flex-col md:flex-row border border-gray-100 dark:border-zinc-800"
      >
        {/* Left Side: Entry Details */}
        <div className="w-full md:w-1/2 border-r border-gray-100 dark:border-zinc-800 flex flex-col">
          <div className="p-8 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="serif text-2xl text-[#5A5A40] dark:text-emerald-500">Entry Details</h2>
              <p className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-widest font-bold mt-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.entryType}
                    onChange={e => setEditData({ ...editData, entryType: e.target.value })}
                    className="bg-gray-50 dark:bg-zinc-800/50 border-none p-1 rounded text-[10px] w-32 text-gray-900 dark:text-zinc-100"
                    placeholder="Entry Type"
                  />
                ) : (
                  entry.entryType || 'General'
                )} Transaction
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && !isEditing && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 text-[#5A5A40] dark:text-zinc-400 transition-colors"
                    title="Edit Entry"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button 
                    onClick={handleDeleteEntry}
                    className="rounded-full p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 transition-colors"
                    title="Delete Entry"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              )}
              {isEditing && (
                <button 
                  onClick={handleUpdateEntry}
                  disabled={saving}
                  className="rounded-full p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-colors"
                  title="Save Changes"
                >
                  {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                </button>
              )}
              <button onClick={onClose} className="md:hidden rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                <X size={24} className="text-gray-400 dark:text-zinc-500" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="flex items-center gap-6">
              <div className={cn(
                "h-16 w-16 rounded-2xl flex items-center justify-center",
                entry.type === 'payment' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
              )}>
                {entry.type === 'payment' ? <TrendingDown size={32} /> : <TrendingUp size={32} />}
              </div>
              <div>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={editData.currency}
                      onChange={e => setEditData({ ...editData, currency: e.target.value as any })}
                      className="bg-gray-50 dark:bg-zinc-800 border-none p-1 rounded text-lg font-bold w-20 text-gray-900 dark:text-zinc-100"
                    >
                      {['USD', 'EUR', 'SAR', 'AED', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input
                      type="number"
                      value={editData.value}
                      onChange={e => setEditData({ ...editData, value: parseFloat(e.target.value) })}
                      className="bg-gray-50 dark:bg-zinc-800 border-none p-1 rounded text-3xl font-bold w-32 text-gray-900 dark:text-zinc-100"
                    />
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-gray-900 dark:text-zinc-100">
                    {entry.currency} {entry.value.toLocaleString()}
                  </p>
                )}
                <p className="text-sm text-gray-500 dark:text-zinc-500 font-medium">{entry.date}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Description</label>
              {isEditing ? (
                <textarea
                  value={editData.description}
                  onChange={e => setEditData({ ...editData, description: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-4 text-sm text-gray-700 dark:text-zinc-300 leading-relaxed border-none focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500"
                  rows={3}
                />
              ) : (
                <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-4 text-sm text-gray-700 dark:text-zinc-300 leading-relaxed">
                  {entry.description}
                </div>
              )}
            </div>

            {(entry.note || isEditing) && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Internal Note</label>
                {isEditing ? (
                  <textarea
                    value={editData.note}
                    onChange={e => setEditData({ ...editData, note: e.target.value })}
                    className="w-full bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 text-sm text-amber-800 dark:text-amber-400 italic focus:ring-2 focus:ring-amber-500"
                    rows={2}
                    placeholder="Add internal note..."
                  />
                ) : (
                  <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 text-sm text-amber-800 dark:text-amber-400 italic">
                    {entry.note}
                  </div>
                )}
              </div>
            )}

            {entry.attachments && entry.attachments.length > 0 && (
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">Attachments</label>
                <div className="grid grid-cols-1 gap-2">
                  {entry.attachments.map((file, i) => (
                    <a
                      key={i}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl hover:border-[#5A5A40] dark:hover:border-emerald-500 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Paperclip size={16} className="text-gray-400 dark:text-zinc-500 group-hover:text-[#5A5A40] dark:group-hover:text-emerald-500" />
                        <span className="text-xs font-medium text-gray-600 dark:text-zinc-300 truncate max-w-[200px]">{file.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase">{(file.size / 1024).toFixed(0)} KB</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Conversation */}
        <div className="w-full md:w-1/2 flex flex-col bg-gray-50/50 dark:bg-zinc-950/50">
          <div className="p-8 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#5A5A40]/10 dark:bg-emerald-500/10 flex items-center justify-center text-[#5A5A40] dark:text-emerald-500">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-zinc-100">Conversation</h3>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Internal Discussion</p>
              </div>
            </div>
            <button onClick={onClose} className="hidden md:block rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
              <X size={24} className="text-gray-400 dark:text-zinc-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-zinc-600 opacity-50">
                <MessageSquare size={48} className="mb-4" />
                <p className="text-sm">No comments yet. Start the discussion.</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div 
                  key={comment.id}
                  className={cn(
                    "flex flex-col max-w-[85%] space-y-1",
                    comment.authorId === auth.currentUser?.uid ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                      {comment.authorName} • {comment.authorRole}
                    </span>
                  </div>
                  <div className={cn(
                    "rounded-2xl px-4 py-3 text-sm shadow-sm",
                    comment.authorId === auth.currentUser?.uid 
                      ? "bg-[#5A5A40] dark:bg-emerald-600 text-white rounded-tr-none" 
                      : "bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 border border-gray-100 dark:border-zinc-700 rounded-tl-none"
                  )}>
                    {comment.content}
                  </div>
                  <span className="text-[9px] text-gray-400 dark:text-zinc-500 px-1">
                    {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
              ))
            )}
          </div>

          {canComment && (
            <div className="p-6 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800">
              {error && (
                <div className="mb-3 flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
              <form onSubmit={handleSendComment} className="relative">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full rounded-2xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 pl-4 pr-12 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={loading || !newComment.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-[#5A5A40] dark:bg-emerald-600 text-white flex items-center justify-center hover:bg-[#4A4A30] dark:hover:bg-emerald-500 transition-all disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
