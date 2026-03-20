import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, addDoc, query, orderBy, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable, uploadString } from 'firebase/storage';
import { db, storage } from '../firebase';
import { handleFirestoreError, OperationType, handleStorageError } from '../lib/firestore-errors';
import { useAuth } from '../contexts/AuthContext';
import { Course, DailyLog, CourseNote, CourseAttachment, ChecklistItem } from '../types';
import { DAILY_REPORT_TEMPLATE } from '../constants';
import { 
  ChevronLeft, 
  Plus, 
  CheckCircle2, 
  Check,
  Clock, 
  AlertCircle,
  ClipboardList,
  MessageSquare,
  StickyNote,
  Paperclip,
  FileText,
  FileImage,
  FileVideo,
  File as FileIcon,
  Download,
  Send,
  Loader2,
  Upload,
  Trash2,
  Award,
  Receipt,
  UserCheck,
  Plane,
  X,
  FileSearch,
  ChevronDown,
  Filter,
  BookOpen,
  ExternalLink,
  ShieldAlert,
  Hotel,
  Users,
  Truck,
  ClipboardCheck,
  MoreHorizontal,
  MapPin
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import CourseAccounting from '../components/CourseAccounting';
import ConfirmationModal from '../components/ConfirmationModal';
import CourseChecklist from '../components/CourseChecklist';

export default function CourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const unsubCourse = onSnapshot(doc(db, 'courses', id), (doc) => {
      if (doc.exists()) {
        setCourse({ id: doc.id, ...doc.data() } as Course);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `courses/${id}`);
    });

    return () => {
      unsubCourse();
    };
  }, [id]);

  const handleDeleteCourse = async () => {
    if (!id || !course) return;

    try {
      await deleteDoc(doc(db, 'courses', id));
      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `courses/${id}`);
    }
  };

  if (!course) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ClipboardList },
    { id: 'checklist', label: 'Checklist', icon: CheckCircle2 },
    { id: 'notes', label: 'Course Notes', icon: StickyNote },
    { id: 'attachments', label: 'Attachments', icon: Paperclip },
    { id: 'accounting', label: 'Accounting', icon: Receipt },
  ];

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100"
      >
        <ChevronLeft size={16} />
        Back to Dashboard
      </button>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="serif text-3xl text-[#5A5A40] dark:text-emerald-500">{course.name}</h1>
          <p className="text-gray-500 dark:text-zinc-400">Reference: {course.referenceNumber} • {course.location}</p>
        </div>
        <div className="flex gap-3">
          {(profile?.role === 'admin' || profile?.department === 'Operation' || profile?.email === 'hasan.alassaf91@gmail.com') && (
            <>
              <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center gap-2 rounded-full border border-red-200 dark:border-red-900/50 bg-white dark:bg-zinc-900 px-6 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 shadow-sm transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 size={18} />
                Delete Course
              </button>
            </>
          )}
          {(profile?.role === 'sales' || profile?.role === 'admin') && (
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-zinc-800"
            >
              <FileSearch size={18} />
              Edit Course
            </button>
          )}
          <a 
            href="https://online.agile4training.com/admin" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/20 px-6 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-400 shadow-sm transition-all hover:bg-blue-100 dark:hover:bg-blue-900/30"
            title="Open in Agile CRM"
          >
            <ExternalLink size={18} />
            Agile CRM
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-medium transition-all",
              activeTab === tab.id 
                ? "border-[#5A5A40] dark:border-emerald-500 text-[#5A5A40] dark:text-emerald-500" 
                : "border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab course={course} />}
        {activeTab === 'checklist' && <CourseChecklist course={course} />}
        {activeTab === 'notes' && <NotesTab courseId={course.id} />}
        {activeTab === 'attachments' && <AttachmentsTab courseId={course.id} />}
        {activeTab === 'accounting' && <CourseAccounting courseId={course.id} />}
      </div>

      {isEditModalOpen && (
        <CourseEditModal 
          course={course} 
          onClose={() => setIsEditModalOpen(false)} 
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteCourse}
        title="Delete Course"
        message={`Are you sure you want to delete the course "${course.name}"? This action cannot be undone and all associated data will be lost.`}
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

function CourseEditModal({ course, onClose }: { course: Course, onClose: () => void }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: course.name,
    referenceNumber: course.referenceNumber,
    startDate: course.startDate,
    endDate: course.endDate,
    location: course.location,
    hotelName: course.hotelName || '',
    clientName: course.clientName || '',
    clientCompany: course.clientCompany || '',
    clientPhone: course.clientPhone || '',
    salesPersonName: course.salesPersonName || '',
    holidays: course.holidays || [],
    checklist: course.checklist || [],
  });

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

  const toggleHoliday = (dateStr: string) => {
    const isNowHoliday = !formData.holidays.includes(dateStr);
    const newHolidays = isNowHoliday
      ? [...formData.holidays, dateStr]
      : formData.holidays.filter(d => d !== dateStr);

    // Update checklist: remove holiday reports and re-number others
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    let newChecklist = [...formData.checklist];

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

    setFormData(prev => ({
      ...prev,
      holidays: newHolidays,
      checklist: newChecklist
    }));
  };

  // Auto-calculate weekends as holidays if dates change and holidays are empty or if user wants to reset
  // For edit, we might want to be more careful not to overwrite existing selections.
  // Let's just provide the UI to toggle.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await setDoc(doc(db, 'courses', course.id), formData, { merge: true });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `courses/${course.id}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-8">
          <h2 className="serif text-2xl text-[#5A5A40] dark:text-emerald-500">Edit Course Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-zinc-800 pb-2">Course Information</h3>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Course Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500/50 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Reference Number</label>
              <input 
                type="text" 
                value={formData.referenceNumber}
                onChange={e => setFormData({...formData, referenceNumber: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500/50 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Location (City)</label>
              <input 
                type="text" 
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500/50 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Hotel Name</label>
              <input 
                type="text" 
                value={formData.hotelName}
                onChange={e => setFormData({...formData, hotelName: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500/50 outline-none"
                placeholder="Enter hotel name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Start Date</label>
              <input 
                type="date" 
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500/50 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">End Date</label>
              <input 
                type="date" 
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500/50 outline-none"
                required
              />
            </div>

            {/* Holiday Selection */}
            {formData.startDate && formData.endDate && (
              <div className="md:col-span-2 bg-gray-50 dark:bg-zinc-800/30 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-4">Course Schedule & Holidays</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">Days marked as "Holiday" will not have a daily report generated when syncing SOP tasks.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {(() => {
                    const start = new Date(formData.startDate);
                    const end = new Date(formData.endDate);
                    const days = [];
                    const current = new Date(start);
                    while (current <= end) {
                      const dateStr = current.toISOString().split('T')[0];
                      const isHoliday = formData.holidays.includes(dateStr);
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
                              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400" 
                              : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:border-[#5A5A40] dark:hover:border-emerald-500"
                          )}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">{dayName}</span>
                          <span className="text-sm font-bold">{displayDate}</span>
                        </button>
                      );
                      current.setDate(current.getDate() + 1);
                    }
                    return days;
                  })()}
                </div>
              </div>
            )}

            <div className="md:col-span-2 mt-4">
              <h3 className="text-sm font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-zinc-800 pb-2">Client Details</h3>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Client Name</label>
              <input 
                type="text" 
                value={formData.clientName}
                onChange={e => setFormData({...formData, clientName: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Company</label>
              <input 
                type="text" 
                value={formData.clientCompany}
                onChange={e => setFormData({...formData, clientCompany: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Contact Phone</label>
              <input 
                type="tel" 
                value={formData.clientPhone}
                onChange={e => setFormData({...formData, clientPhone: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Sales Person Name</label>
              <input 
                type="text" 
                value={formData.salesPersonName}
                onChange={e => setFormData({...formData, salesPersonName: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500/50 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 rounded-full border border-gray-200 dark:border-zinc-800 py-3 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isUpdating}
              className="flex-1 rounded-full bg-[#5A5A40] dark:bg-emerald-600 py-3 text-sm font-medium text-white shadow-md hover:bg-[#4A4A30] dark:hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              {isUpdating ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}function OverviewTab({ course }: { course: Course }) {
  const { profile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const canEditStatus = profile?.role === 'sales' || profile?.role === 'admin';

  const updateStatus = async (newStatus: Course['status']) => {
    if (!canEditStatus) return;
    setIsUpdating(true);
    try {
      await setDoc(doc(db, 'courses', course.id), { status: newStatus }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `courses/${course.id}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Info Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-sm border border-gray-50 dark:border-zinc-800 flex items-center gap-6">
           <div className="h-16 w-16 rounded-2xl bg-[#5A5A40]/10 dark:bg-emerald-500/10 text-[#5A5A40] dark:text-emerald-500 flex items-center justify-center font-bold text-2xl">
             {course.coordinatorName?.[0] || 'C'}
           </div>
           <div>
             <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Assigned Coordinator</p>
             <h3 className="text-xl font-medium text-gray-900 dark:text-zinc-100">{course.coordinatorName || 'Not assigned'}</h3>
             <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Operations Team</p>
           </div>
        </div>
        <div className="rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-sm border border-gray-50 dark:border-zinc-800 flex flex-col justify-center relative group">
           <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Course Status</p>
           <div className="mt-2 relative">
             <select
               value={course.status}
               onChange={(e) => updateStatus(e.target.value as any)}
               disabled={isUpdating || !canEditStatus}
               className={cn(
                 "w-full appearance-none bg-transparent text-lg font-medium text-gray-900 dark:text-zinc-100 capitalize focus:outline-none pr-8",
                 canEditStatus ? "cursor-pointer" : "cursor-default"
               )}
             >
               <option value="request">Request</option>
               <option value="in_progress">In Progress</option>
               <option value="confirmed">Confirmed</option>
               <option value="cancelled">Cancelled</option>
             </select>
             {canEditStatus && (
               <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-zinc-500">
                 {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
               </div>
             )}
           </div>
           <div className="mt-2 flex items-center gap-2">
             <div className={cn(
               "h-2 w-full rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden"
             )}>
                <div className={cn(
                   "h-full transition-all duration-500",
                   course.status === 'confirmed' ? "bg-green-500" : 
                   course.status === 'in_progress' ? "bg-orange-500" : 
                   course.status === 'cancelled' ? "bg-red-500" : "bg-gray-400 dark:bg-zinc-600"
                )} style={{ width: course.status === 'confirmed' ? '100%' : course.status === 'in_progress' ? '50%' : course.status === 'cancelled' ? '100%' : '25%' }} />
             </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Details Card */}
        <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-sm border border-gray-50 dark:border-zinc-800">
          <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
            <ClipboardList size={20} className="text-[#5A5A40] dark:text-emerald-500" />
            Course Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Course Name</p>
              <p className="mt-1 text-gray-900 dark:text-zinc-100 font-medium text-lg">{course.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Start Date</p>
              <p className="mt-1 text-gray-900 dark:text-zinc-100 font-medium">{format(new Date(course.startDate), 'PPP')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">End Date</p>
              <p className="mt-1 text-gray-900 dark:text-zinc-100 font-medium">{format(new Date(course.endDate), 'PPP')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Location</p>
              <p className="mt-1 text-gray-900 dark:text-zinc-100 font-medium">{course.location}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Hotel Name</p>
              <p className="mt-1 text-gray-900 dark:text-zinc-100 font-medium">{course.hotelName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Reference Number</p>
              <p className="mt-1 text-gray-900 dark:text-zinc-100 font-medium">{course.referenceNumber}</p>
            </div>
          </div>
        </div>

        {/* Client Information Card */}
        <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-sm border border-gray-50 dark:border-zinc-800">
          <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
            <UserCheck size={20} className="text-[#5A5A40] dark:text-emerald-500" />
            Client Information (Sales Data)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Client Name</p>
              <p className="mt-1 text-gray-900 dark:text-zinc-100 font-medium">{course.clientName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Company</p>
              <p className="mt-1 text-gray-900 dark:text-zinc-100 font-medium">{course.clientCompany || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Contact Phone</p>
              <p className="mt-1 text-gray-900 dark:text-zinc-100 font-medium">{course.clientPhone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Sales Person</p>
              <p className="mt-1 text-gray-900 dark:text-zinc-100 font-medium">{course.salesPersonName || 'N/A'}</p>
            </div>
          </div>
          {course.isConfirmedBySales && (
            <div className="mt-6 pt-6 border-t border-gray-50 dark:border-zinc-800">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/50">
                <CheckCircle2 size={12} />
                Confirmed by Sales
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Placeholder components for other tabs
function NotesTab({ courseId }: { courseId: string }) {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<CourseNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'courses', courseId, 'notes'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseNote)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `courses/${courseId}/notes`);
    });
  }, [courseId]);

  const renderNoteWithStyles = (content: string, isImportant?: boolean, category?: ChecklistItem['category']) => {
    if (!content) return null;
    
    let text = content;
    let taskName = '';
    let colorClass = isImportant ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-zinc-300';
    
    if (content.startsWith('[COMPLETED]') || content.startsWith('[TASK]')) {
      const firstLine = content.split('\n')[0];
      const prefix = content.startsWith('[COMPLETED]') ? '[COMPLETED] ' : '[TASK] ';
      taskName = firstLine.replace(prefix, '');
      text = content.replace(prefix, '');
      
      const taskLower = taskName.toLowerCase();
      if (isImportant) {
        colorClass = 'text-red-600 dark:text-red-400 font-bold text-lg';
      } else if (taskLower.includes('shipment details')) {
        colorClass = 'text-blue-900 dark:text-blue-300 font-medium';
      } else if (taskLower.includes('shuttle reserved')) {
        colorClass = 'text-blue-500 dark:text-blue-400 font-medium';
      } else if (taskLower.includes('hotel reserved')) {
        colorClass = 'text-sky-400 dark:text-sky-300 font-medium';
      } else if (taskLower.includes('daily report')) {
        colorClass = 'text-emerald-600 dark:text-emerald-400 font-medium';
      } else {
        colorClass = 'text-emerald-600 dark:text-emerald-400 font-medium';
      }
    } else if (isImportant) {
      colorClass = 'text-red-600 dark:text-red-400 font-bold text-lg';
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
      'Note:',
      'Hotel Maps:',
      'Meeting Room:'
    ];

    // Regex for URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    const regex = new RegExp(`(${labels.join('|')})`, 'g');
    
    // Split by labels first
    const parts = text.split(regex);

    const getCategoryIcon = (cat?: string) => {
      switch (cat) {
        case 'hotel': return <Hotel size={16} className="inline mr-1 mb-1" />;
        case 'material': return <BookOpen size={16} className="inline mr-1 mb-1" />;
        case 'trainer': return <UserCheck size={16} className="inline mr-1 mb-1" />;
        case 'client': return <Users size={16} className="inline mr-1 mb-1" />;
        case 'logistics': return <Truck size={16} className="inline mr-1 mb-1" />;
        case 'evaluation': return <ClipboardCheck size={16} className="inline mr-1 mb-1" />;
        default: return <MoreHorizontal size={16} className="inline mr-1 mb-1" />;
      }
    };

    return (
      <span className={colorClass}>
        {category && getCategoryIcon(category)}
        {parts.map((part, i) => {
          if (labels.includes(part)) {
            return <span key={i} className="font-bold">{part}</span>;
          }
          
          // For non-label parts, split by URLs
          const subParts = part.split(urlRegex);
          return subParts.map((subPart, j) => {
            if (subPart.match(urlRegex)) {
              // Check if the previous part was "Hotel Maps:"
              const isHotelMap = i > 0 && parts[i-1] === 'Hotel Maps:';
              
              if (isHotelMap) {
                return (
                  <a 
                    key={`${i}-${j}`}
                    href={subPart}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all ml-2"
                  >
                    <MapPin size={12} />
                    View on Maps
                  </a>
                );
              }

              return (
                <a 
                  key={`${i}-${j}`} 
                  href={subPart} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 break-all"
                >
                  {subPart}
                </a>
              );
            }
            return subPart;
          });
        })}
      </span>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !profile) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'courses', courseId, 'notes'), {
        courseId,
        content: newNote.trim(),
        authorId: profile.uid,
        authorName: profile.name,
        createdAt: new Date().toISOString(),
        isImportant: isImportant,
      });
      setNewNote('');
      setIsImportant(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `courses/${courseId}/notes`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteDoc(doc(db, 'courses', courseId, 'notes', noteId));
      setNoteToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `courses/${courseId}/notes/${noteId}`);
    }
  };

  const handleMarkAsSeen = async (note: CourseNote) => {
    if (!profile) return;
    
    const alreadySeen = note.seenBy?.some(s => s.uid === profile.uid);
    if (alreadySeen) return;

    const newSeenBy = [
      ...(note.seenBy || []),
      {
        uid: profile.uid,
        name: profile.name,
        at: new Date().toISOString()
      }
    ];

    try {
      await updateDoc(doc(db, 'courses', courseId, 'notes', note.id), {
        seenBy: newSeenBy
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `courses/${courseId}/notes/${note.id}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-sm border border-gray-50 dark:border-zinc-800">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note to this course..."
              className="flex-1 rounded-2xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-6 py-3 text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500/50 outline-none"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newNote.trim()}
              className="rounded-2xl bg-[#5A5A40] dark:bg-emerald-600 px-6 py-3 text-white transition-all hover:bg-[#4A4A30] dark:hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsImportant(!isImportant)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
                isImportant 
                  ? "bg-red-500 text-white shadow-md scale-105" 
                  : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
              )}
            >
              <AlertCircle size={14} />
              Important Note
            </button>
            {isImportant && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[10px] text-red-500 font-bold uppercase tracking-wider"
              >
                This note will be highlighted and animated
              </motion.span>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-gray-100 dark:border-zinc-800">
            <StickyNote className="mx-auto text-gray-200 dark:text-zinc-800 mb-4" size={48} />
            <p className="text-gray-500 dark:text-zinc-500">No notes yet. Be the first to add one!</p>
          </div>
        ) : (
          notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                scale: (note.isImportant && (!note.seenBy || note.seenBy.length === 0)) ? [1, 1.05, 1] : 1,
                boxShadow: (note.isImportant && (!note.seenBy || note.seenBy.length === 0))
                  ? ["0 0 0px rgba(220, 38, 38, 0)", "0 0 30px rgba(220, 38, 38, 0.4)", "0 0 0px rgba(220, 38, 38, 0)"] 
                  : "0 0 0px rgba(0,0,0,0)",
              }}
              transition={{
                scale: (note.isImportant && (!note.seenBy || note.seenBy.length === 0)) ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : { duration: 0.3 },
                boxShadow: (note.isImportant && (!note.seenBy || note.seenBy.length === 0)) ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : { duration: 0.3 }
              }}
              className={cn(
                "rounded-3xl p-6 shadow-sm transition-all",
                note.isImportant 
                  ? "bg-red-50 dark:bg-red-900/20 border-4 border-red-600 ring-8 ring-red-600/20 scale-105" 
                  : "bg-white dark:bg-zinc-900 border border-gray-50 dark:border-zinc-800"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold",
                    note.isImportant ? "bg-red-600 text-white" : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
                  )}>
                    {note.authorName[0]}
                  </div>
                  <span className={cn(
                    "text-sm font-black",
                    note.isImportant ? "text-red-800 dark:text-red-400" : "text-gray-900 dark:text-zinc-100"
                  )}>{note.authorName}</span>
                  {note.isImportant && (
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                        (!note.seenBy || note.seenBy.length === 0) ? "bg-red-600 animate-bounce" : "bg-red-800"
                      )}>
                        URGENT / IMPORTANT
                      </span>
                      {(!note.seenBy || !note.seenBy.some(s => s.uid === profile?.uid)) && (
                        <button
                          onClick={() => handleMarkAsSeen(note)}
                          className="flex items-center gap-1 bg-white dark:bg-zinc-900 text-red-600 dark:text-red-400 text-[10px] font-black px-3 py-1 rounded-full border border-red-600 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white transition-colors"
                        >
                          <Check size={10} />
                          MARK AS SEEN
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-xs font-bold",
                    note.isImportant ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-zinc-500"
                  )}>{format(new Date(note.createdAt), 'MMM d, h:mm a')}</span>
                  {(profile?.role === 'admin' || profile?.canDeleteNotes || profile?.department === 'Operation' || profile?.uid === note.authorId || profile?.email === 'hasan.alassaf91@gmail.com') && (
                    <button 
                      onClick={() => setNoteToDelete(note.id)}
                      className={cn(
                        "transition-colors",
                        note.isImportant ? "text-red-400 hover:text-red-800 dark:hover:text-red-300" : "text-gray-300 dark:text-zinc-700 hover:text-red-500"
                      )}
                      title="Delete Note"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <p className={cn(
                "leading-relaxed whitespace-pre-wrap",
                note.isImportant ? "text-red-600 dark:text-red-400 font-black text-2xl" : "text-sm text-gray-700 dark:text-zinc-300"
              )}>
                {renderNoteWithStyles(note.content, note.isImportant, note.category)}
              </p>

              {/* Seen By Info */}
              {note.isImportant && note.seenBy && note.seenBy.length > 0 && (
                <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-900/50 flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-black text-red-800 dark:text-red-400 uppercase tracking-wider">Seen by:</span>
                  {note.seenBy.map((seen, idx) => (
                    <span 
                      key={idx} 
                      className="text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-md"
                      title={format(new Date(seen.at), 'MMM d, h:mm a')}
                    >
                      {seen.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Note Attachments */}
              {note.attachments && note.attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {note.attachments.map((att, idx) => (
                    <div key={idx} className="group relative">
                      {att.type.startsWith('image/') ? (
                        <div 
                          className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => window.open(att.url, '_blank')}
                        >
                          <img 
                            src={att.url} 
                            alt={att.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <ExternalLink size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ) : (
                        <a 
                          href={att.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <FileIcon size={16} className="text-gray-400 dark:text-zinc-500" />
                          <span className="text-xs font-medium text-gray-600 dark:text-zinc-400 truncate max-w-[150px]">{att.name}</span>
                          <ExternalLink size={12} className="text-gray-300 dark:text-zinc-600" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Delete Note Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={() => noteToDelete && handleDeleteNote(noteToDelete)}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}

const DOCUMENT_TYPES = [
  { id: 'po', label: 'P.O (Purchase Order)', icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'swift', label: 'SWIFT / Bank Transfer', icon: Send, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { id: 'flight', label: 'Flight Ticket', icon: Plane, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
  { id: 'evaluation', label: 'Course Evaluation', icon: ClipboardList, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { id: 'attendance', label: 'Attendance Sheet', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  { id: 'certificate', label: 'Certificate', icon: Award, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { id: 'invoice', label: 'Invoice', icon: Receipt, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  { id: 'registration', label: 'Confirm Registration', icon: UserCheck, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { id: 'outstanding', label: 'OUTSTANDING ACCOUNT', icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  
  // New types from images
  { id: 'cancel', label: 'Cancel', icon: X, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  { id: 'cheque', label: 'Cheque', icon: Receipt, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { id: 'confirm_attending', label: 'Confirm Attending', icon: UserCheck, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'change_date', label: 'Change Date', icon: Clock, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { id: 'update_info', label: 'Update Information', icon: FileSearch, color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { id: 'invitation_letter', label: 'Invitation Letter', icon: Send, color: 'text-sky-500 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
  { id: 'prepare_shipment', label: 'Prepare to Shipment', icon: Plane, color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { id: 'id_card', label: 'Identification Card', icon: UserCheck, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/20' },
  { id: 'evaluation_report', label: 'Overall Evaluation Report', icon: ClipboardList, color: 'text-amber-700 dark:text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { id: 'photo', label: 'Photo', icon: FileImage, color: 'text-blue-400 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'quotation', label: 'Price Quotation', icon: Receipt, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { id: 'material', label: 'Material', icon: BookOpen, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { id: 'vendor_form', label: 'Vendor Form', icon: FileText, color: 'text-gray-600 dark:text-zinc-400', bg: 'bg-gray-50 dark:bg-zinc-900/40' },
  { id: 'shuttle_form', label: 'Airport Shuttle Form', icon: Plane, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/20' },
  { id: 'tourism_form', label: 'Tourism Form', icon: Plane, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { id: 'tna', label: 'Training Need assessment (TNA)', icon: FileSearch, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { id: 'tax_cert', label: 'Tax Certificate', icon: Receipt, color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  { id: 'course_review', label: 'Course Review', icon: MessageSquare, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  
  // Photo Days
  ...Array.from({ length: 17 }, (_, i) => ({
    id: `photo_day_${i + 1}`,
    label: `Photo Day ${i + 1}`,
    icon: FileImage,
    color: 'text-blue-400 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-900/20'
  })),

  { id: 'other', label: 'Other / General', icon: FileIcon, color: 'text-gray-600 dark:text-zinc-400', bg: 'bg-gray-50 dark:bg-zinc-900/40' },
];

function AttachmentUploadModal({ courseId, onClose, initialFile }: { courseId: string; onClose: () => void; initialFile?: File | null }) {
  const { profile } = useAuth();
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (initialFile) setFile(initialFile);
  }, [initialFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedType || !profile) return;

    setIsUploading(true);
    setStatus('Preparing...');

    try {
      const storagePath = `courses/${courseId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const p = snapshot.totalBytes > 0 ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100 : 0;
            setProgress(p);
            setStatus(`Uploading (${Math.round(p)}%)...`);
          }, 
          reject, 
          () => resolve()
        );
      });

      const downloadURL = await getDownloadURL(storageRef);
      setStatus('Saving...');

      await addDoc(collection(db, 'courses', courseId, 'attachments'), {
        courseId,
        name: file.name,
        type: file.type,
        documentType: selectedType,
        url: downloadURL,
        size: file.size,
        uploadedBy: profile.uid,
        uploadedByName: profile.name,
        createdAt: new Date().toISOString(),
      });

      onClose();
    } catch (error: any) {
      handleStorageError(error);
      setStatus(`Error: ${error.message}`);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-2xl border border-gray-100 dark:border-zinc-800"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="serif text-2xl text-[#5A5A40] dark:text-emerald-500">Upload Document</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <X size={24} className="text-gray-400 dark:text-zinc-500" />
          </button>
        </div>

        <div className="space-y-8">
          {/* File Selection with Drag & Drop */}
          {!file ? (
            <label 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-200",
                isDragging 
                  ? "border-[#5A5A40] dark:border-emerald-500 bg-[#5A5A40]/5 dark:bg-emerald-500/5 scale-[1.02]" 
                  : "border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
              )}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className={cn("mb-4 transition-colors", isDragging ? "text-[#5A5A40] dark:text-emerald-500" : "text-gray-300 dark:text-zinc-700")} size={48} />
                <p className="mb-2 text-sm text-gray-500 dark:text-zinc-400 font-medium">
                  <span className="font-bold text-[#5A5A40] dark:text-emerald-500">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400 dark:text-zinc-500">PDF, Images, Word, Excel (Max. 10MB)</p>
              </div>
              <input type="file" className="hidden" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800">
              <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm">
                <FileIcon className="text-[#5A5A40] dark:text-emerald-500" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">{file.name}</p>
                <p className="text-xs text-gray-400 dark:text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button onClick={() => setFile(null)} className="text-xs font-bold text-red-500 hover:underline">Change</button>
            </div>
          )}

          {/* Type Selection Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Document Type</label>
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full rounded-2xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-4 text-sm font-medium text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500/50 appearance-none cursor-pointer pr-12 outline-none"
                required
              >
                <option value="" disabled className="dark:bg-zinc-900">Select document type...</option>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.id} value={type.id} className="dark:bg-zinc-900">
                    {type.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-zinc-500">
                <ChevronDown size={20} />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-2">Please categorize your document for easier tracking.</p>
          </div>

          {/* Progress or Upload Button */}
          {isUploading ? (
            <div className="space-y-3">
              <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#5A5A40] dark:bg-emerald-500 transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm font-medium text-[#5A5A40] dark:text-emerald-500">{status}</p>
            </div>
          ) : (
            <button
              onClick={handleUpload}
              disabled={!file || !selectedType}
              className="w-full rounded-2xl bg-[#5A5A40] dark:bg-emerald-600 py-4 text-white font-bold shadow-lg shadow-[#5A5A40]/20 dark:shadow-emerald-900/20 transition-all hover:bg-[#4A4A30] dark:hover:bg-emerald-700 disabled:opacity-50 disabled:shadow-none"
            >
              Confirm & Upload
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function AttachmentsTab({ courseId }: { courseId: string }) {
  const { profile } = useAuth();
  const [attachments, setAttachments] = useState<CourseAttachment[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [isDraggingOverTab, setIsDraggingOverTab] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'courses', courseId, 'attachments'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setAttachments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseAttachment)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `courses/${courseId}/attachments`);
    });
  }, [courseId]);

  const handleTabDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverTab(true);
  };

  const handleTabDragLeave = () => {
    setIsDraggingOverTab(false);
  };

  const handleTabDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverTab(false);
    if (e.dataTransfer.files?.[0]) {
      setDroppedFile(e.dataTransfer.files[0]);
      setIsUploadModalOpen(true);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await deleteDoc(doc(db, 'courses', courseId, 'attachments', id));
      const storageRef = ref(storage, url);
      await deleteObject(storageRef).catch(err => console.warn('File might already be deleted from storage', err));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `courses/${courseId}/attachments/${id}`);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage className="text-blue-500" />;
    if (type.startsWith('video/')) return <FileVideo className="text-purple-500" />;
    if (type.includes('pdf')) return <FileText className="text-red-500" />;
    if (type.includes('word') || type.includes('officedocument.word')) return <FileText className="text-blue-600" />;
    if (type.includes('presentation') || type.includes('powerpoint')) return <FileText className="text-orange-500" />;
    if (type.includes('sheet') || type.includes('excel')) return <FileText className="text-emerald-500" />;
    return <FileIcon className="text-gray-500" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentTypeLabel = (typeId?: string) => {
    return DOCUMENT_TYPES.find(t => t.id === typeId)?.label || 'Other';
  };

  const filteredAttachments = filterType === 'all' 
    ? attachments 
    : attachments.filter(a => a.documentType === filterType);

  return (
    <div 
      className="space-y-6 relative"
      onDragOver={handleTabDragOver}
      onDragLeave={handleTabDragLeave}
      onDrop={handleTabDrop}
    >
      {/* Drag Overlay */}
      {isDraggingOverTab && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#5A5A40]/10 dark:bg-emerald-500/10 backdrop-blur-sm border-4 border-dashed border-[#5A5A40] dark:border-emerald-500 rounded-3xl animate-in fade-in zoom-in duration-200">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl text-center border border-gray-100 dark:border-zinc-800">
            <div className="h-20 w-20 bg-[#5A5A40]/10 dark:bg-emerald-500/10 text-[#5A5A40] dark:text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100">Drop to Upload</h3>
            <p className="text-gray-500 dark:text-zinc-400 mt-2">Release your files to start uploading</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm rounded-full px-6 py-2 pr-10 text-sm font-medium text-gray-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 dark:focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="all" className="dark:bg-zinc-900">All Attachments</option>
              {DOCUMENT_TYPES.map(type => (
                <option key={type.id} value={type.id} className="dark:bg-zinc-900">{type.label}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-zinc-500" />
          </div>
        </div>
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 rounded-full bg-[#5A5A40] dark:bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#4A4A30] dark:hover:bg-emerald-700"
        >
          <Plus size={18} />
          Upload New File
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[300px] rounded-3xl transition-all duration-300">
        {filteredAttachments.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-gray-100 dark:border-zinc-800">
            <Paperclip className="mx-auto text-gray-200 dark:text-zinc-800 mb-4" size={48} />
            <p className="text-gray-500 dark:text-zinc-500">{filterType === 'all' ? 'No files uploaded yet.' : 'No files found for this category.'}</p>
            <p className="text-xs text-gray-400 dark:text-zinc-600 mt-2">Use the upload button to add materials</p>
          </div>
        ) : (
          filteredAttachments.map((file) => {
            const docType = DOCUMENT_TYPES.find(t => t.id === file.documentType) || DOCUMENT_TYPES[4];
            const Icon = docType.icon;
            
            return (
              <div key={file.id} className="group relative rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-sm transition-all hover:shadow-md border border-gray-50 dark:border-zinc-800">
                  {/* Document Type Badge Above - More Prominent */}
                  <div className="mb-5">
                    <span className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest shadow-sm",
                      docType.bg,
                      docType.color
                    )}>
                      <Icon size={14} />
                      {docType.label}
                    </span>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center shrink-0">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate" title={file.name}>{file.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{formatSize(file.size)} • {format(new Date(file.createdAt), 'MMM d')}</p>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1 font-medium italic">Uploaded by {file.uploadedByName}</p>
                    </div>
                  <div className="flex flex-col gap-2">
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="rounded-full p-2 text-gray-400 dark:text-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-[#5A5A40] dark:hover:text-emerald-500"
                      title="Download"
                    >
                      <Download size={18} />
                    </a>
                    {(profile?.role === 'admin' || profile?.department === 'Operation' || profile?.uid === file.uploadedBy || profile?.email === 'hasan.alassaf91@gmail.com') && (
                      <button 
                        onClick={() => handleDelete(file.id, file.url)}
                        className="rounded-full p-2 text-gray-400 dark:text-zinc-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                
                {file.type.startsWith('image/') && (
                  <div className="mt-4 aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-800">
                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isUploadModalOpen && (
        <AttachmentUploadModal 
          courseId={courseId} 
          onClose={() => {
            setIsUploadModalOpen(false);
            setDroppedFile(null);
          }} 
          initialFile={droppedFile}
        />
      )}
    </div>
  );
}
