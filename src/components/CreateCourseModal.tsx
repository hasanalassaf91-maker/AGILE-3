import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Plus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile, ChecklistItem } from '../types';
import { DEFAULT_TASKS, DAILY_REPORT_TEMPLATE } from '../constants';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function CreateCourseModal({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth();
  const [coordinators, setCoordinators] = useState<UserProfile[]>([]);
  const [salesPeople, setSalesPeople] = useState<UserProfile[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    referenceNumber: '',
    startDate: '',
    endDate: '',
    location: '',
    hotelName: '',
    status: 'request' as const,
    isConfirmedBySales: false,
    trainerId: '',
    coordinatorId: '',
    coordinatorName: '',
    clientId: '',
    clientName: '',
    clientPhone: '',
    clientCompany: '',
    salesPersonId: profile?.uid || '',
    salesPersonName: profile?.name || '',
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const coordQuery = query(collection(db, 'users'), where('role', '==', 'coordinator'));
        const salesQuery = query(collection(db, 'users'), where('role', '==', 'sales'));
        
        const [coordSnap, salesSnap] = await Promise.all([
          getDocs(coordQuery),
          getDocs(salesQuery)
        ]);
        
        setCoordinators(coordSnap.docs.map(doc => doc.data() as UserProfile));
        setSalesPeople(salesSnap.docs.map(doc => doc.data() as UserProfile));
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Update default holidays (Sat/Sun) when dates change
  useEffect(() => {
    if (!formData.startDate || !formData.endDate) return;
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
    
    const newHolidays: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      // 0 is Sunday, 6 is Saturday
      if (day === 0 || day === 6) {
        newHolidays.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    setHolidays(newHolidays);
  }, [formData.startDate, formData.endDate]);

  const toggleHoliday = (dateStr: string) => {
    setHolidays(prev => 
      prev.includes(dateStr) 
        ? prev.filter(d => d !== dateStr) 
        : [...prev, dateStr]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Generate default checklist items
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      const checklist: ChecklistItem[] = [];
      const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

      // Add standard SOP tasks
      DEFAULT_TASKS.forEach(t => {
        checklist.push({
          id: generateId(),
          task: t.task,
          completed: false,
          category: t.category,
          isMandatory: true
        });
      });

      // Generate daily reports
      let workingDayCount = 0;
      for (let i = 0; i < diffDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateStrISO = currentDate.toISOString().split('T')[0];
        
        // Skip if this day is marked as a holiday
        if (holidays.includes(dateStrISO)) continue;

        workingDayCount++;
        const dateStr = format(currentDate, 'EEEE, MMM d, yyyy');
        
        checklist.push({ 
          id: generateId(),
          task: `Day ${workingDayCount}, ${dateStr} Daily report & Photos`, 
          completed: false,
          category: 'evaluation',
          note: DAILY_REPORT_TEMPLATE,
          isMandatory: true
        });
      }

      await addDoc(collection(db, 'courses'), {
        ...formData,
        checklist,
        holidays,
        createdAt: new Date().toISOString(),
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'courses');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-2xl overflow-y-auto max-h-[90vh] border dark:border-zinc-800">
        <div className="flex items-center justify-between mb-8">
          <h2 className="serif text-2xl text-[#5A5A40] dark:text-emerald-500">Create New Course</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><Plus className="rotate-45" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-4 border-b dark:border-zinc-800 pb-2">Course Information</h3>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Course Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-zinc-100"
                required
                placeholder="e.g. Harnessing Analytical AI"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Reference Number</label>
              <input 
                type="text" 
                value={formData.referenceNumber}
                onChange={e => setFormData({...formData, referenceNumber: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-zinc-100"
                required
                placeholder="e.g. AI-2026-001"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Location</label>
              <input 
                type="text" 
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-zinc-100"
                required
                placeholder="e.g. Paris, France"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Hotel Name</label>
              <input 
                type="text" 
                value={formData.hotelName}
                onChange={e => setFormData({...formData, hotelName: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-zinc-100"
                placeholder="e.g. Hilton Paris"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Start Date</label>
              <input 
                type="date" 
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-zinc-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">End Date</label>
              <input 
                type="date" 
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-zinc-100"
                required
              />
            </div>

            {/* Holiday Selection */}
            {formData.startDate && formData.endDate && (
              <div className="md:col-span-2 bg-gray-50 dark:bg-zinc-800/30 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-4">Course Schedule & Holidays</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">Saturdays and Sundays are marked as holidays by default. Days marked as "Holiday" will not have a daily report generated.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {(() => {
                    const start = new Date(formData.startDate);
                    const end = new Date(formData.endDate);
                    const days = [];
                    const current = new Date(start);
                    while (current <= end) {
                      const dateStr = current.toISOString().split('T')[0];
                      const isHoliday = holidays.includes(dateStr);
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
                          <span className={cn(
                            "mt-1 text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-full border",
                            isHoliday 
                              ? "bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-900/60" 
                              : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400"
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
            )}

            <div className="md:col-span-2 mt-4">
              <h3 className="text-sm font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-4 border-b dark:border-zinc-800 pb-2">Client Details</h3>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Client Name</label>
              <input 
                type="text" 
                value={formData.clientName}
                onChange={e => setFormData({...formData, clientName: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-zinc-100"
                required
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Client Company</label>
              <input 
                type="text" 
                value={formData.clientCompany}
                onChange={e => setFormData({...formData, clientCompany: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-zinc-100"
                required
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Client Phone</label>
              <input 
                type="tel" 
                value={formData.clientPhone}
                onChange={e => setFormData({...formData, clientPhone: e.target.value})}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-zinc-100"
                required
                placeholder="e.g. +1 234 567 890"
              />
            </div>

            <div className="md:col-span-2 mt-4">
              <h3 className="text-sm font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-4 border-b dark:border-zinc-800 pb-2">Assignments</h3>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Coordinator</label>
              <select 
                value={formData.coordinatorId}
                onChange={e => {
                  const coord = coordinators.find(c => c.uid === e.target.value);
                  setFormData({...formData, coordinatorId: e.target.value, coordinatorName: coord?.name || ''});
                }}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-zinc-100"
                required
              >
                <option value="">Select Coordinator</option>
                {coordinators.map(c => (
                  <option key={c.uid} value={c.uid}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Sales Person</label>
              <select 
                value={formData.salesPersonId}
                onChange={e => {
                  const sales = salesPeople.find(s => s.uid === e.target.value);
                  setFormData({...formData, salesPersonId: e.target.value, salesPersonName: sales?.name || ''});
                }}
                className="w-full rounded-xl border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 text-sm focus:ring-2 focus:ring-[#5A5A40] dark:text-zinc-100"
                required
              >
                <option value="">Select Sales Person</option>
                {salesPeople.map(s => (
                  <option key={s.uid} value={s.uid}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase mb-2">Sales Confirmation</label>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={formData.isConfirmedBySales}
                  onChange={e => setFormData({...formData, isConfirmedBySales: e.target.checked})}
                  className="h-5 w-5 rounded border-gray-300 dark:border-zinc-700 text-[#5A5A40] dark:text-emerald-500 focus:ring-[#5A5A40] dark:bg-zinc-800"
                />
                <span className="text-sm text-gray-600 dark:text-zinc-400">Confirmed by Sales Department</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 rounded-full border border-gray-200 dark:border-zinc-800 py-3 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 rounded-full bg-[#5A5A40] dark:bg-emerald-600 py-3 text-sm font-medium text-white shadow-md hover:bg-[#4A4A30] dark:hover:bg-emerald-700"
            >
              Create Course
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
