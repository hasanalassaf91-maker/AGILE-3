import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { StickyNote, X, Plus, Trash2, Save, Loader2, NotebookPen, Image as ImageIcon, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType, handleStorageError } from '../lib/firestore-errors';

interface PrivateNote {
  id: string;
  userId: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function PrivateNotes() {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<PrivateNote[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'privateNotes'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrivateNote));
      setNotes(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'privateNotes');
    });

    return () => unsubscribe();
  }, [profile]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || (!newNote.trim() && !selectedImage)) return;

    setIsAdding(true);
    try {
      let imageUrl = '';
      if (selectedImage) {
        setUploading(true);
        const storageRef = ref(storage, `privateNotes/${profile.uid}/${Date.now()}_${selectedImage.name}`);
        await uploadBytes(storageRef, selectedImage);
        imageUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'privateNotes'), {
        userId: profile.uid,
        content: newNote.trim(),
        imageUrl,
        createdAt: new Date().toISOString()
      });
      
      setNewNote('');
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error) {
      handleStorageError(error);
    } finally {
      setIsAdding(false);
      setUploading(false);
    }
  };

  const handleUpdateNote = async (id: string) => {
    if (!editContent.trim()) return;

    try {
      await updateDoc(doc(db, 'privateNotes', id), {
        content: editContent.trim(),
        updatedAt: new Date().toISOString()
      });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `privateNotes/${id}`);
    }
  };

  const handleDeleteNote = async (note: PrivateNote) => {
    if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;

    try {
      // Delete image from storage if it exists
      if (note.imageUrl) {
        try {
          const imageRef = ref(storage, note.imageUrl);
          await deleteObject(imageRef);
        } catch (e) {
          console.error('Error deleting image from storage:', e);
        }
      }
      
      await deleteDoc(doc(db, 'privateNotes', note.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `privateNotes/${note.id}`);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative rounded-full p-2.5 transition-all hover:bg-gray-100 dark:hover:bg-gray-800",
          isOpen ? "bg-gray-100 dark:bg-gray-800 text-[#5A5A40] dark:text-[#a3a38a]" : "text-gray-500 dark:text-gray-400"
        )}
        title="Private Notes"
      >
        <StickyNote size={22} />
        {notes.length > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#5A5A40] dark:bg-[#a3a38a]" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 bg-[#5A5A40]/5 dark:bg-[#a3a38a]/5 p-4">
                <div className="flex items-center gap-2">
                  <NotebookPen size={18} className="text-[#5A5A40] dark:text-[#a3a38a]" />
                  <h3 className="font-medium text-gray-900 dark:text-white">ملاحظاتي الخاصة</h3>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[450px] overflow-y-auto p-4">
                <form onSubmit={handleAddNote} className="mb-4">
                  <div className="space-y-2">
                    {imagePreview && (
                      <div className="relative rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                        <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                          }}
                          className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <div className="relative">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="اكتب ملاحظة جديدة هنا..."
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 pb-10 text-sm text-gray-900 dark:text-white focus:border-[#5A5A40] dark:focus:border-[#a3a38a] focus:ring-1 focus:ring-[#5A5A40] dark:focus:ring-[#a3a38a] outline-none transition-all resize-none h-24"
                      />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-[#5A5A40] dark:hover:text-[#a3a38a] transition-colors"
                        >
                          <Camera size={14} />
                          <span>إضافة صورة</span>
                        </button>
                        <button
                          type="submit"
                          disabled={isAdding || (!newNote.trim() && !selectedImage)}
                          className="rounded-lg bg-[#5A5A40] dark:bg-[#a3a38a] p-1.5 text-white dark:text-gray-900 shadow-sm hover:bg-[#4A4A30] dark:hover:bg-[#8a8a70] disabled:opacity-50"
                        >
                          {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        </button>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                </form>

                <div className="space-y-3">
                  {notes.length === 0 ? (
                    <div className="py-8 text-center">
                      <StickyNote size={32} className="mx-auto mb-2 text-gray-200 dark:text-gray-800" />
                      <p className="text-sm text-gray-400 dark:text-gray-500">لا توجد ملاحظات حالياً</p>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div 
                        key={note.id} 
                        className="group relative rounded-xl border border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-3 transition-all hover:border-gray-100 dark:hover:border-gray-700 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm"
                      >
                        {editingId === note.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm text-gray-900 dark:text-white focus:border-[#5A5A40] dark:focus:border-[#a3a38a] outline-none h-20"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingId(null)}
                                className="rounded-lg px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                إلغاء
                              </button>
                              <button
                                onClick={() => handleUpdateNote(note.id)}
                                className="flex items-center gap-1 rounded-lg bg-[#5A5A40] dark:bg-[#a3a38a] px-2 py-1 text-xs text-white dark:text-gray-900"
                              >
                                <Save size={12} />
                                حفظ
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {note.imageUrl && (
                              <div className="mb-2 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800">
                                <img 
                                  src={note.imageUrl} 
                                  alt="Note" 
                                  className="w-full h-32 object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => window.open(note.imageUrl, '_blank')}
                                />
                              </div>
                            )}
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note.content}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                {format(new Date(note.createdAt), 'MMM d, h:mm a')}
                              </span>
                              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  onClick={() => {
                                    setEditingId(note.id);
                                    setEditContent(note.content);
                                  }}
                                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-[#5A5A40] dark:hover:text-[#a3a38a]"
                                >
                                  <NotebookPen size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteNote(note)}
                                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-500 dark:hover:text-red-400"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
