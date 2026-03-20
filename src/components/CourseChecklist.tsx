import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Course, ChecklistItem } from '../types';
import { DEFAULT_TASKS, DAILY_REPORT_TEMPLATE, SHIPMENT_DETAILS_TEMPLATE } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Hotel, 
  BookOpen, 
  UserCheck, 
  Users, 
  ClipboardCheck,
  FileCheck,
  Truck,
  CalendarCheck,
  Camera,
  CreditCard,
  Gift,
  MoreHorizontal,
  AlertCircle,
  Lock,
  MessageSquareText,
  RotateCcw,
  Upload,
  FileIcon,
  X,
  Loader2,
  Paperclip,
  Calendar,
  GripVertical,
  MapPin,
  DoorOpen,
  ExternalLink
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface CourseChecklistProps {
  course: Course;
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  isAdmin: boolean;
}

function SortableItem({ id, children, isAdmin }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing p-1 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 shrink-0"
          >
            <GripVertical size={18} />
          </div>
        )}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function CourseChecklist({ course }: CourseChecklistProps) {
  const { profile } = useAuth();
  const [newTask, setNewTask] = useState('');
  const [newCategory, setNewCategory] = useState<ChecklistItem['category']>('other');
  const [isAdding, setIsAdding] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [editingMapsUrls, setEditingMapsUrls] = useState<Record<string, string>>({});
  const [editingMeetingRooms, setEditingMeetingRooms] = useState<Record<string, string>>({});
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
  const [focusedHotelField, setFocusedHotelField] = useState<{id: string, field: 'maps' | 'room'} | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checklist = course.checklist || [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = checklist.findIndex((item) => item.id === active.id);
      const newIndex = checklist.findIndex((item) => item.id === over.id);

      const newChecklist = arrayMove(checklist, oldIndex, newIndex);
      await updateChecklist(newChecklist);
    }
  };

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

  const updateChecklist = async (newChecklist: ChecklistItem[]) => {
    try {
      // Firestore does not support 'undefined' values. 
      // We sanitize the checklist to remove any undefined properties.
      const sanitizedChecklist = newChecklist.map(item => {
        const cleaned: any = {};
        Object.entries(item).forEach(([key, value]) => {
          if (value !== undefined) {
            cleaned[key] = value;
          }
        });
        return cleaned as ChecklistItem;
      });

      await updateDoc(doc(db, 'courses', course.id), {
        checklist: sanitizedChecklist
      });
    } catch (error) {
      console.error("Error updating checklist:", error);
      handleFirestoreError(error, OperationType.UPDATE, `courses/${course.id}`);
    }
  };

  const toggleHoliday = async (dateStr: string) => {
    const currentHolidays = course.holidays || [];
    const isNowHoliday = !currentHolidays.includes(dateStr);
    const newHolidays = isNowHoliday
      ? [...currentHolidays, dateStr]
      : currentHolidays.filter(d => d !== dateStr);

    // Update checklist: remove holiday reports and re-number others
    const startDate = new Date(course.startDate);
    const endDate = new Date(course.endDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    let newChecklist = [...checklist];

    // Remove tasks for days that are now holidays
    newChecklist = newChecklist.filter(item => {
      const isDailyReport = item.task.includes('Daily report & Photos');
      if (!isDailyReport) return true;

      for (let i = 0; i < diffDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dStr = format(currentDate, 'EEEE, MMM d, yyyy');
        const dStrISO = currentDate.toISOString().split('T')[0];
        
        if (item.task.includes(dStr)) {
          return !newHolidays.includes(dStrISO);
        }
      }
      return true;
    });

    // Re-number remaining daily report tasks and add missing ones
    let workingDayCount = 0;
    for (let i = 0; i < diffDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dStrISO = currentDate.toISOString().split('T')[0];
      const dStr = format(currentDate, 'EEEE, MMM d, yyyy');

      if (!newHolidays.includes(dStrISO)) {
        workingDayCount++;
        const expectedTask = `Day ${workingDayCount}, ${dStr} Daily report & Photos`;
        
        const existingTaskIndex = newChecklist.findIndex(item => 
          item.task.includes(dStr) && item.task.includes('Daily report & Photos')
        );
        
        if (existingTaskIndex !== -1) {
          newChecklist[existingTaskIndex] = {
            ...newChecklist[existingTaskIndex],
            task: expectedTask
          };
        } else {
          newChecklist.push({
            id: generateId(),
            task: expectedTask,
            completed: false,
            category: 'evaluation',
            note: DAILY_REPORT_TEMPLATE,
            isMandatory: true
          });
        }
      }
    }

    try {
      await updateDoc(doc(db, 'courses', course.id), {
        holidays: newHolidays,
        checklist: newChecklist
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `courses/${course.id}`);
    }
  };

  const generateNoteContent = (item: ChecklistItem) => {
    const prefix = item.completed ? '[COMPLETED]' : '[TASK]';
    let content = `${prefix} ${item.task}`;
    
    if (item.hotelMapsUrl) {
      content += `\nHotel Maps: ${item.hotelMapsUrl}`;
    }
    if (item.meetingRoomName) {
      content += `\nMeeting Room: ${item.meetingRoomName}`;
    }

    const isDailyReport = item.task.toLowerCase().includes('daily report');
    const isShipmentDetails = item.task.toLowerCase().includes('shipment details');
    
    if (isDailyReport || isShipmentDetails) {
      const defaultNote = isDailyReport ? DAILY_REPORT_TEMPLATE : SHIPMENT_DETAILS_TEMPLATE;
      content += `\n${item.note || defaultNote}`;
    } else if (item.note) {
      content += `\nNote: ${item.note}`;
    }
    
    return content;
  };

  const syncNote = async (item: ChecklistItem): Promise<ChecklistItem> => {
    if (!profile || !item.completed) return item;

    try {
      const noteContent = generateNoteContent(item);
      const noteData = {
        courseId: course.id,
        content: noteContent,
        authorId: profile.uid,
        authorName: profile.name,
        createdAt: item.completedAt || new Date().toISOString(),
        category: item.category,
        attachments: item.attachments?.map(a => ({
          name: a.name,
          url: a.url,
          type: a.type
        })) || []
      };

      if (item.noteId) {
        // Update existing note
        await updateDoc(doc(db, 'courses', course.id, 'notes', item.noteId), noteData);
        return item;
      } else {
        // Create new note
        const noteRef = await addDoc(collection(db, 'courses', course.id, 'notes'), noteData);
        return { ...item, noteId: noteRef.id };
      }
    } catch (error) {
      console.error("Error syncing note for checklist item:", error);
      return item;
    }
  };

  const handleToggle = async (id: string) => {
    const item = checklist.find(i => i.id === id);
    if (!item || !profile) return;

    const isCompleting = !item.completed;
    let updatedItem: ChecklistItem;

    if (isCompleting) {
      updatedItem = {
        ...item,
        completed: true,
        completedBy: profile.uid,
        completedByName: profile.name,
        completedAt: new Date().toISOString()
      };
      
      // Sync with note (creates or updates)
      updatedItem = await syncNote(updatedItem);
    } else {
      // Delete associated note if exists when unchecking
      if (item.noteId) {
        try {
          await deleteDoc(doc(db, 'courses', course.id, 'notes', item.noteId));
        } catch (error) {
          console.error("Error deleting note on uncheck:", error);
        }
      }

      const { completedBy, completedByName, completedAt, noteId, ...rest } = item;
      updatedItem = {
        ...rest,
        completed: false
      };
    }

    const newChecklist = checklist.map(i => i.id === id ? updatedItem : i);
    await updateChecklist(newChecklist);
  };

  const handleNoteChange = async (id: string, note: string) => {
    const item = checklist.find(i => i.id === id);
    if (!item) return;

    let updatedItem: ChecklistItem = { ...item, note };
    
    // Sync with note
    updatedItem = await syncNote(updatedItem);

    const newChecklist = checklist.map(i => i.id === id ? updatedItem : i);
    await updateChecklist(newChecklist);
  };

  const handleShipmentStatus = async (id: string, status: 'delivered' | 'not_delivered') => {
    const item = checklist.find(i => i.id === id);
    if (!item || !profile) return;

    let updatedItem: ChecklistItem;
    const note = status === 'delivered' ? "Shipment Delivered" : "Shipment not Delivered yet: ";

    if (status === 'delivered') {
      updatedItem = {
        ...item,
        completed: true,
        completedBy: profile.uid,
        completedByName: profile.name,
        completedAt: new Date().toISOString(),
        note
      };
    } else {
      // If not delivered, we uncheck it if it was checked
      const { completedBy, completedByName, completedAt, noteId, ...rest } = item;
      
      // Also delete the note from the notes collection if it was synced
      if (noteId) {
        try {
          await deleteDoc(doc(db, 'courses', course.id, 'notes', noteId));
        } catch (error) {
          console.error("Error deleting note for shipment status:", error);
        }
      }

      updatedItem = {
        ...rest,
        completed: false,
        note
      };
    }

    // Sync with note (only if completed)
    updatedItem = await syncNote(updatedItem);

    const newChecklist = checklist.map(i => i.id === id ? updatedItem : i);
    await updateChecklist(newChecklist);
    
    if (status === 'not_delivered') {
      setFocusedNoteId(id); // Focus the note field so they can write the reason
    }
  };

  const handleHotelFieldChange = async (id: string, field: 'hotelMapsUrl' | 'meetingRoomName', value: string) => {
    const item = checklist.find(i => i.id === id);
    if (!item) return;

    let updatedItem: ChecklistItem = { ...item, [field]: value };
    
    // Sync with note
    updatedItem = await syncNote(updatedItem);

    const newChecklist = checklist.map(i => i.id === id ? updatedItem : i);
    await updateChecklist(newChecklist);
  };

  const handleFileUpload = async (itemId: string, file: File) => {
    if (!profile) return;
    setUploadingId(itemId);
    try {
      const fileRef = ref(storage, `courses/${course.id}/checklist/${itemId}/${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);

      const item = checklist.find(i => i.id === itemId);
      if (!item) return;

      const newAttachments = [
        ...(item.attachments || []),
        {
          name: file.name,
          url,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        }
      ];

      let updatedItem: ChecklistItem = {
        ...item,
        attachments: newAttachments
      };

      // Sync with note
      updatedItem = await syncNote(updatedItem);

      const newChecklist = checklist.map(i => i.id === itemId ? updatedItem : i);
      await updateChecklist(newChecklist);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploadingId(null);
    }
  };

  const removeAttachment = async (itemId: string, attachmentUrl: string) => {
    const item = checklist.find(i => i.id === itemId);
    if (!item) return;

    const newAttachments = (item.attachments || []).filter(a => a.url !== attachmentUrl);

    let updatedItem: ChecklistItem = {
      ...item,
      attachments: newAttachments
    };

    // Sync with note
    updatedItem = await syncNote(updatedItem);

    const newChecklist = checklist.map(i => i.id === itemId ? updatedItem : i);
    await updateChecklist(newChecklist);
  };

  const isImage = (type: string) => type.startsWith('image/');

  const renderNoteWithStyles = (text: string, taskName: string) => {
    if (!text) return null;
    
    const taskLower = taskName.toLowerCase();
    let colorClass = 'text-gray-500';
    
    if (text.includes('Shipment not Delivered yet')) {
      colorClass = 'text-red-600 dark:text-red-400 font-bold';
    } else if (text.includes('Shipment Delivered')) {
      colorClass = 'text-green-600 dark:text-green-400 font-bold';
    } else if (taskLower.includes('shipment details')) {
      colorClass = 'text-blue-900 dark:text-blue-400';
    } else if (taskLower.includes('shuttle reserved')) {
      colorClass = 'text-blue-500 dark:text-blue-400';
    } else if (taskLower.includes('hotel reserved')) {
      colorClass = 'text-sky-400 dark:text-sky-300';
    } else if (taskLower.includes('daily report')) {
      colorClass = 'text-emerald-600 dark:text-emerald-400';
    }

    const labels = [
      'Reciver Name:',
      'Reciver Phone:',
      'Reciver Mail:',
      'Reciver Address:',
      'Trainer arrival time:',
      'Participant arrival time:',
      'Trainer outfit:',
      'Presentation:',
      'Note:'
    ];

    // Create a regex that matches any of the labels
    const regex = new RegExp(`(${labels.join('|')})`, 'g');
    const parts = text.split(regex);

    return (
      <span className={colorClass}>
        {parts.map((part, i) => {
          if (labels.includes(part)) {
            return <span key={i} className="font-bold">{part}</span>;
          }
          return part;
        })}
      </span>
    );
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const newItem: ChecklistItem = {
      id: generateId(),
      task: newTask.trim(),
      completed: false,
      category: newCategory,
      isMandatory: !!(profile?.role === 'admin') // Ensure it's a boolean
    };

    await updateChecklist([...checklist, newItem]);
    setNewTask('');
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    const item = checklist.find(i => i.id === id);
    if (item?.isMandatory && profile?.role !== 'admin') {
      alert("Only administrators can delete mandatory tasks.");
      return;
    }

    // Delete associated note if exists
    if (item?.noteId) {
      try {
        await deleteDoc(doc(db, 'courses', course.id, 'notes', item.noteId));
      } catch (error) {
        console.error("Error deleting note for checklist item:", error);
      }
    }

    const newChecklist = checklist.filter(item => item.id !== id);
    await updateChecklist(newChecklist);
  };

  const handleAddDefaults = async () => {
    const startDate = new Date(course.startDate);
    const endDate = new Date(course.endDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const dynamicDailyTasks: { task: string; category: ChecklistItem['category']; note?: string }[] = [];
    
    // Generate reports based on course duration
    let workingDayCount = 0;
    for (let i = 0; i < diffDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStrISO = currentDate.toISOString().split('T')[0];

      // Skip if this day is marked as a holiday
      if (course.holidays?.includes(dateStrISO)) continue;

      workingDayCount++;
      const dateStr = format(currentDate, 'EEEE, MMM d, yyyy');
      
      dynamicDailyTasks.push({ 
        task: `Day ${workingDayCount}, ${dateStr} Daily report & Photos`, 
        category: 'evaluation',
        note: DAILY_REPORT_TEMPLATE
      });
    }

    const allDefaultTasks = [...DEFAULT_TASKS, ...dynamicDailyTasks];

    // Only add tasks that don't already exist (by name)
    const existingTasks = new Set(checklist.map(item => item.task.toLowerCase()));
    const tasksToAdd = allDefaultTasks.filter(t => !existingTasks.has(t.task.toLowerCase()));

    if (tasksToAdd.length === 0) {
      alert("All standard SOP tasks are already present in the checklist.");
      return;
    }

    const newItems: ChecklistItem[] = [];
    for (const t of tasksToAdd) {
      let item: ChecklistItem = {
        id: generateId(),
        task: t.task,
        completed: false,
        category: t.category,
        isMandatory: true // Standard SOP tasks are mandatory
      };
      if (t.note) item.note = t.note;
      
      // Sync with note immediately
      item = await syncNote(item);
      newItems.push(item);
    }
    
    await updateChecklist([...checklist, ...newItems]);
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'hotel': return <Hotel size={14} />;
      case 'material': return <BookOpen size={14} />;
      case 'trainer': return <UserCheck size={14} />;
      case 'client': return <Users size={14} />;
      case 'logistics': return <Truck size={14} />;
      case 'evaluation': return <ClipboardCheck size={14} />;
      default: return <MoreHorizontal size={14} />;
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'hotel': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'material': return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20';
      case 'trainer': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'client': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
      case 'logistics': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
      case 'evaluation': return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20';
      default: return 'text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800/50';
    }
  };

  const completedCount = checklist.filter(i => i.completed).length;
  const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="serif text-xl text-[#5A5A40] dark:text-emerald-500">Operational Checklist</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">Track essential tasks for course preparation.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHolidays(!showHolidays)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all",
              showHolidays 
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400" 
                : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
            )}
            title="Manage course holidays"
          >
            <Calendar size={14} />
            {showHolidays ? 'Hide Holidays' : 'Manage Holidays'}
          </button>
          <button
            onClick={handleAddDefaults}
            className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all"
            title="Add missing standard SOP tasks"
          >
            <Plus size={14} />
            Sync SOP Tasks
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 rounded-full bg-[#5A5A40] dark:bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-[#4A4A30] dark:hover:bg-emerald-700 transition-all"
          >
            <Plus size={14} />
            Add Task
          </button>
        </div>
      </div>

      {/* Holiday Management Section */}
      <AnimatePresence>
        {showHolidays && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wider">Course Schedule & Holidays</h4>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Days marked as "Holiday" will not have a daily report generated when syncing SOP tasks.</p>
                </div>
                <button 
                  onClick={() => setShowHolidays(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full text-gray-400 dark:text-zinc-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {(() => {
                  const start = new Date(course.startDate);
                  const end = new Date(course.endDate);
                  const days = [];
                  const current = new Date(start);
                  while (current <= end) {
                    const dateStr = current.toISOString().split('T')[0];
                    const isHoliday = (course.holidays || []).includes(dateStr);
                    const dayName = format(current, 'EEE');
                    const displayDate = format(current, 'MMM d');
                    
                    days.push(
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => toggleHoliday(dateStr)}
                        className={cn(
                          "flex flex-col items-center p-3 rounded-xl border transition-all text-center",
                          isHoliday 
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400" 
                            : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:border-[#5A5A40] dark:hover:border-emerald-500"
                        )}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest">{dayName}</span>
                        <span className="text-sm font-bold">{displayDate}</span>
                        <span className={cn(
                          "mt-1 text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-full border",
                          isHoliday ? "bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-800" : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                        )}>
                          {isHoliday ? 'Holiday' : 'Report'}
                        </span>
                      </button>
                    );
                    current.setDate(current.getDate() + 1);
                  }
                  return days;
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      {checklist.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#5A5A40] dark:bg-emerald-600 transition-all duration-500" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="What needs to be done?"
            className="flex-1 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500 text-sm text-gray-900 dark:text-zinc-100"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            autoFocus
          />
          <select
            className="px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500 text-sm text-gray-900 dark:text-zinc-100"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as ChecklistItem['category'])}
          >
            <option value="other" className="dark:bg-zinc-900">Other</option>
            <option value="hotel" className="dark:bg-zinc-900">Hotel</option>
            <option value="material" className="dark:bg-zinc-900">Material</option>
            <option value="trainer" className="dark:bg-zinc-900">Trainer</option>
            <option value="client" className="dark:bg-zinc-900">Client</option>
            <option value="logistics" className="dark:bg-zinc-900">Logistics</option>
            <option value="evaluation" className="dark:bg-zinc-900">Evaluation</option>
          </select>
          <button
            type="submit"
            className="bg-[#5A5A40] dark:bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-[#4A4A30] dark:hover:bg-emerald-700 transition-all"
          >
            Add
          </button>
        </form>
      )}

      <div className="space-y-2">
        {checklist.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-zinc-800/30 rounded-[2rem] border border-dashed border-gray-200 dark:border-zinc-800">
            <AlertCircle className="mx-auto text-gray-300 dark:text-zinc-700 mb-2" size={32} />
            <p className="text-sm text-gray-400 dark:text-zinc-500">No tasks added yet.</p>
          </div>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={checklist.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {checklist.map((item) => (
                  <SortableItem key={item.id} id={item.id} isAdmin={profile?.role === 'admin'}>
                    <div 
                      className={cn(
                        "group flex items-center gap-4 p-4 rounded-2xl border transition-all w-full",
                        item.completed 
                          ? "bg-gray-50 dark:bg-zinc-800/50 border-transparent opacity-75" 
                          : "bg-white dark:bg-zinc-900 border-red-100 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-700 shadow-sm"
                      )}
                    >
                      <button 
                        onClick={() => handleToggle(item.id)}
                        className={cn(
                          "shrink-0 transition-colors",
                          item.completed ? "text-green-500" : "text-red-300 dark:text-red-900/50 hover:text-red-500 dark:hover:text-red-400"
                        )}
                      >
                        {item.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            getCategoryColor(item.category)
                          )}>
                            {getCategoryIcon(item.category)}
                            {item.category}
                          </span>
                          {item.completedAt && (
                            <span className="text-[10px] text-gray-400 dark:text-zinc-500 italic">
                              Completed by {item.completedByName} on {format(new Date(item.completedAt), 'MMM d, HH:mm')}
                            </span>
                          )}
                          {item.isMandatory && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                              <Lock size={10} />
                              Mandatory
                            </span>
                          )}
                        </div>
                        <p className={cn(
                          "text-sm font-medium transition-all",
                          item.completed ? "text-gray-400 dark:text-gray-500 line-through" : "text-red-600 dark:text-red-400"
                        )}>
                          {item.task}
                        </p>

                        {/* Shipment Status Buttons */}
                        {item.task.toLowerCase().includes('shipment delivered') && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              onClick={() => handleShipmentStatus(item.id, 'delivered')}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all border",
                                item.completed && item.note === "Shipment Delivered"
                                  ? "bg-green-500 text-white border-green-600 shadow-sm"
                                  : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/40"
                              )}
                            >
                              <Truck size={12} />
                              Shipment Delivered
                            </button>
                            <button
                              onClick={() => handleShipmentStatus(item.id, 'not_delivered')}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all border",
                                !item.completed && item.note?.startsWith("Shipment not Delivered yet")
                                  ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                                  : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                              )}
                            >
                              <Truck size={12} />
                              Shipment not Delivered yet
                            </button>
                          </div>
                        )}
                        
                        {/* Attachments */}
                        {item.attachments && item.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.attachments.map((att, idx) => (
                              <div key={idx} className="relative group/att">
                                {isImage(att.type) ? (
                                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                                    <img 
                                      src={att.url} 
                                      alt={att.name}
                                      className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                                      onClick={() => window.open(att.url, '_blank')}
                                    />
                                    <button 
                                      onClick={() => removeAttachment(item.id, att.url)}
                                      className="absolute top-0.5 right-0.5 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover/att:opacity-100 transition-all"
                                    >
                                      <X size={8} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-100 dark:border-zinc-700">
                                    <FileIcon size={12} className="text-gray-400 dark:text-zinc-500" />
                                    <a 
                                      href={att.url} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="text-[10px] font-medium text-gray-600 dark:text-zinc-300 hover:text-[#5A5A40] dark:hover:text-emerald-500 truncate max-w-[120px]"
                                    >
                                      {att.name}
                                    </a>
                                    <button 
                                      onClick={() => removeAttachment(item.id, att.url)}
                                      className="opacity-0 group-hover/att:opacity-100 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-all"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Note Field */}
                        <div className="mt-2 space-y-2">
                          {/* Hotel Specific Fields */}
                          {item.task.toLowerCase().includes('hotel reserved') && (
                            <div className="space-y-1.5 ml-1">
                              {/* Maps URL */}
                              <div className="flex items-center gap-2">
                                <MapPin size={12} className={cn("shrink-0", item.hotelMapsUrl ? "text-blue-500 dark:text-blue-400" : "text-gray-300 dark:text-zinc-700")} />
                                {focusedHotelField?.id === item.id && focusedHotelField?.field === 'maps' ? (
                                  <input 
                                    autoFocus
                                    type="url"
                                    placeholder="Paste Google Maps link here..."
                                    className="flex-1 bg-transparent border-b border-gray-100 dark:border-zinc-800 text-[10px] text-blue-500 dark:text-blue-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all py-0.5"
                                    value={editingMapsUrls[item.id] !== undefined ? editingMapsUrls[item.id] : (item.hotelMapsUrl || '')}
                                    onChange={(e) => setEditingMapsUrls(prev => ({ ...prev, [item.id]: e.target.value }))}
                                    onBlur={(e) => {
                                      setFocusedHotelField(null);
                                      if (editingMapsUrls[item.id] !== undefined && e.target.value !== (item.hotelMapsUrl || '')) {
                                        handleHotelFieldChange(item.id, 'hotelMapsUrl', e.target.value);
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="flex-1 flex items-center gap-2 overflow-hidden">
                                    <span 
                                      onClick={() => setFocusedHotelField({ id: item.id, field: 'maps' })}
                                      className={cn(
                                        "text-[10px] cursor-text truncate",
                                        item.hotelMapsUrl ? "text-blue-500 dark:text-blue-400 hover:underline" : "text-gray-300 dark:text-zinc-700 italic"
                                      )}
                                    >
                                      {item.hotelMapsUrl || "Add Google Maps link..."}
                                    </span>
                                    {item.hotelMapsUrl && (
                                      <a 
                                        href={item.hotelMapsUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 shrink-0"
                                      >
                                        <ExternalLink size={10} />
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Meeting Room Name */}
                              <div className="flex items-center gap-2">
                                <DoorOpen size={12} className={cn("shrink-0", item.meetingRoomName ? "text-sky-600 dark:text-sky-400" : "text-gray-300 dark:text-zinc-700")} />
                                {focusedHotelField?.id === item.id && focusedHotelField?.field === 'room' ? (
                                  <div className="flex-1 flex items-center gap-1">
                                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 shrink-0">Meeting room name:</span>
                                    <input 
                                      autoFocus
                                      type="text"
                                      placeholder="Enter room name..."
                                      className="flex-1 bg-transparent border-b border-gray-100 dark:border-zinc-800 text-[10px] text-sky-600 dark:text-sky-400 focus:outline-none focus:border-sky-600 dark:focus:border-sky-400 transition-all py-0.5"
                                      value={editingMeetingRooms[item.id] !== undefined ? editingMeetingRooms[item.id] : (item.meetingRoomName || '')}
                                      onChange={(e) => setEditingMeetingRooms(prev => ({ ...prev, [item.id]: e.target.value }))}
                                      onBlur={(e) => {
                                        setFocusedHotelField(null);
                                        if (editingMeetingRooms[item.id] !== undefined && e.target.value !== (item.meetingRoomName || '')) {
                                          handleHotelFieldChange(item.id, 'meetingRoomName', e.target.value);
                                        }
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => setFocusedHotelField({ id: item.id, field: 'room' })}
                                    className="flex-1 text-[10px] cursor-text flex items-center gap-1"
                                  >
                                    <span className={cn("font-bold shrink-0", item.meetingRoomName ? "text-sky-600 dark:text-sky-400" : "text-gray-300 dark:text-zinc-700")}>Meeting room name:</span>
                                    <span className={cn(
                                      "truncate",
                                      item.meetingRoomName ? "text-sky-600 dark:text-sky-400" : "text-gray-300 dark:text-zinc-700 italic"
                                    )}>
                                      {item.meetingRoomName || "Add room name..."}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex items-start gap-2">
                            <MessageSquareText size={12} className="text-gray-300 dark:text-zinc-700 mt-1" />
                            {focusedNoteId === item.id ? (
                            <textarea 
                              autoFocus
                              placeholder="Add a note or reason for completion..."
                              className={`flex-1 bg-transparent border-b border-gray-100 dark:border-zinc-800 text-[11px] focus:outline-none focus:border-[#5A5A40] dark:focus:border-emerald-500 transition-all py-0.5 resize-none min-h-[20px] ${
                                item.task.toLowerCase().includes('shipment details') ? 'text-blue-900 dark:text-blue-400' :
                                item.task.toLowerCase().includes('shuttle reserved') ? 'text-blue-500 dark:text-blue-400' :
                                item.task.toLowerCase().includes('hotel reserved') ? 'text-sky-400 dark:text-sky-300' :
                                item.task.toLowerCase().includes('daily report') ? 'text-emerald-600 dark:text-emerald-400' :
                                'text-gray-500 dark:text-zinc-400'
                              }`}
                              rows={item.task.toLowerCase().includes('daily report') ? 5 : 1}
                              value={editingNotes[item.id] !== undefined 
                                ? editingNotes[item.id] 
                                : (item.note || (item.task.toLowerCase().includes('daily report') ? DAILY_REPORT_TEMPLATE : (item.task.toLowerCase().includes('shipment details') ? SHIPMENT_DETAILS_TEMPLATE : '')))}
                              onChange={(e) => {
                                setEditingNotes(prev => ({ ...prev, [item.id]: e.target.value }));
                                // Auto-expand
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                              }}
                              onFocus={(e) => {
                                // If it's a daily report or shipment details and contains old hardcoded values, clean it up
                                const currentVal = e.target.value;
                                const isDailyReport = item.task.toLowerCase().includes('daily report');
                                const isShipmentDetails = item.task.toLowerCase().includes('shipment details');
                                const template = isDailyReport ? DAILY_REPORT_TEMPLATE : (isShipmentDetails ? SHIPMENT_DETAILS_TEMPLATE : '');

                                if (isDailyReport || isShipmentDetails) {
                                  if (!item.note && !editingNotes[item.id]) {
                                    setEditingNotes(prev => ({ ...prev, [item.id]: template }));
                                  } else if (isDailyReport && currentVal.includes('08:30')) {
                                    // Specifically cleaning up the old '08:30' hardcoded value for daily reports
                                    setEditingNotes(prev => ({ ...prev, [item.id]: template }));
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                setFocusedNoteId(null);
                                const valueToSave = e.target.value;
                                if (editingNotes[item.id] !== undefined && valueToSave !== (item.note || '')) {
                                  handleNoteChange(item.id, valueToSave);
                                }
                              }}
                            />
                          ) : (
                            <div 
                              onClick={() => setFocusedNoteId(item.id)}
                              className="flex-1 text-[11px] py-0.5 cursor-text min-h-[20px] whitespace-pre-wrap border-b border-transparent hover:border-gray-100 dark:hover:border-zinc-800 transition-all"
                            >
                              {renderNoteWithStyles(editingNotes[item.id] !== undefined 
                                ? editingNotes[item.id] 
                                : (item.note || (item.task.toLowerCase().includes('daily report') ? DAILY_REPORT_TEMPLATE : (item.task.toLowerCase().includes('shipment details') ? SHIPMENT_DETAILS_TEMPLATE : ''))), item.task) || (
                                <span className="text-gray-300 dark:text-zinc-700 italic">Add a note...</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Upload Button */}
                        <div className="relative">
                          <input 
                            type="file" 
                            className="hidden" 
                            id={`file-${item.id}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(item.id, file);
                            }}
                          />
                          <label 
                            htmlFor={`file-${item.id}`}
                            className={cn(
                              "p-2 rounded-full transition-all cursor-pointer",
                              uploadingId === item.id ? "bg-gray-100 dark:bg-zinc-800" : "hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 dark:text-zinc-500 hover:text-[#5A5A40] dark:hover:text-emerald-500"
                            )}
                            title="Upload Photo/Video"
                          >
                            {uploadingId === item.id ? (
                              <Loader2 size={18} className="animate-spin text-[#5A5A40] dark:text-emerald-500" />
                            ) : (
                              <Camera size={18} />
                            )}
                          </label>
                        </div>

                        {item.completed && (
                          <button
                            onClick={() => handleToggle(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-all"
                            title="Undo Completion"
                          >
                            <RotateCcw size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className={cn(
                            "opacity-0 group-hover:opacity-100 p-2 transition-all",
                            item.isMandatory && profile?.role !== 'admin' 
                              ? "cursor-not-allowed text-gray-200 dark:text-zinc-800" 
                              : "text-gray-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400"
                          )}
                          title={item.isMandatory ? "Mandatory task" : "Delete task"}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
