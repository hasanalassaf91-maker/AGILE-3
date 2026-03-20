import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useAuth } from '../contexts/AuthContext';
import { Course } from '../types';
import { motion } from 'motion/react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  ArrowRight, 
  Plus, 
  UserPlus, 
  Bookmark, 
  Bell, 
  ChevronRight, 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import CreateCourseModal from '../components/CreateCourseModal';
import AddUserModal from '../components/AddUserModal';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    courseName: '',
    fromDate: '',
    toDate: '',
    status: 'all',
    location: '',
    noInstructor: false,
    notCost: false,
  });
  const [stats, setStats] = useState({ 
    request: 0, 
    inProgress: 0, 
    confirmed: 0, 
    cancelled: 0, 
    salesConfirmed: 0, 
    assignedToMe: 0,
    past: 0,
    upcoming: 0
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const handleDeleteCourse = async (course: Course) => {
    try {
      await deleteDoc(doc(db, 'courses', course.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `courses/${course.id}`);
    }
  };
  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(true);
  const [isUpcomingSidebarCollapsed, setIsUpcomingSidebarCollapsed] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<{ id: string, name: string, role: string } | null>(null);

  useEffect(() => {
    if (!profile) return;

    let q = query(collection(db, 'courses'));
    
    // Filter based on role
    if (profile.role === 'coordinator') {
      q = query(collection(db, 'courses'), where('coordinatorId', '==', profile.uid));
    } else if (profile.role === 'trainer') {
      q = query(collection(db, 'courses'), where('trainerId', '==', profile.uid));
    } else if (profile.role === 'client') {
      q = query(collection(db, 'courses'), where('clientId', '==', profile.organizationId));
    } else if (profile.role === 'sales') {
      q = query(collection(db, 'courses'), where('salesPersonId', '==', profile.uid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const courseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(courseData);
      
      const now = new Date();
      const newStats = courseData.reduce((acc, course) => {
        const endDate = new Date(course.endDate);
        const isPast = endDate < now;

        if (isPast) {
          acc.past++;
        } else {
          acc.upcoming++;
        }

        if (course.status === 'request') acc.request++;
        if (course.status === 'in_progress') acc.inProgress++;
        if (course.status === 'confirmed') acc.confirmed++;
        if (course.status === 'cancelled') acc.cancelled++;
        if (course.isConfirmedBySales) acc.salesConfirmed++;
        if (course.coordinatorId === profile.uid) acc.assignedToMe++;

        // Track by staff
        if (course.coordinatorId && course.coordinatorName) {
          const staffId = course.coordinatorId;
          acc.byDepartment.Operation[staffId] = {
            id: staffId,
            name: course.coordinatorName,
            count: (acc.byDepartment.Operation[staffId]?.count || 0) + 1
          };
        }
        if (course.salesPersonId && course.salesPersonName) {
          const staffId = course.salesPersonId;
          acc.byDepartment.Sales[staffId] = {
            id: staffId,
            name: course.salesPersonName,
            count: (acc.byDepartment.Sales[staffId]?.count || 0) + 1
          };
        }
        if ((course as any).marketingPersonId && (course as any).marketingPersonName) {
          const staffId = (course as any).marketingPersonId;
          acc.byDepartment.Marketing[staffId] = {
            id: staffId,
            name: (course as any).marketingPersonName,
            count: (acc.byDepartment.Marketing[staffId]?.count || 0) + 1
          };
        }
        if ((course as any).hrPersonId && (course as any).hrPersonName) {
          const staffId = (course as any).hrPersonId;
          acc.byDepartment.HR[staffId] = {
            id: staffId,
            name: (course as any).hrPersonName,
            count: (acc.byDepartment.HR[staffId]?.count || 0) + 1
          };
        }

        return acc;
      }, { 
        request: 0, 
        inProgress: 0, 
        confirmed: 0, 
        cancelled: 0, 
        salesConfirmed: 0, 
        assignedToMe: 0, 
        past: 0, 
        upcoming: 0,
        byDepartment: {
          Operation: {} as Record<string, { id: string, name: string, count: number }>,
          Sales: {} as Record<string, { id: string, name: string, count: number }>,
          Marketing: {} as Record<string, { id: string, name: string, count: number }>,
          HR: {} as Record<string, { id: string, name: string, count: number }>
        }
      });
      setStats(newStats);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'courses');
    });

    return () => unsubscribe();
  }, [profile]);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="serif text-3xl text-[#5A5A40] dark:text-[#a3a38a]">Welcome back, {profile?.name.split(' ')[0]}</h1>
          <p className="text-gray-500 dark:text-gray-400">Here's what's happening with your training programs today.</p>
        </div>
        <div className="flex gap-3">
          {profile?.role === 'admin' && (
            <button 
              onClick={() => setIsAddUserModalOpen(true)}
              className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] px-6 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <UserPlus size={18} />
              Add Member
            </button>
          )}
          {(profile?.role === 'admin' || profile?.role === 'sales') && (
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 rounded-full bg-[#5A5A40] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#4A4A30]"
            >
              <Plus size={18} />
              Create Course
            </button>
          )}
        </div>
      </header>

      {isCreateModalOpen && <CreateCourseModal onClose={() => setIsCreateModalOpen(false)} />}
      {isAddUserModalOpen && <AddUserModal onClose={() => setIsAddUserModalOpen(false)} />}

      {/* Staff Details Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-gray-100 dark:border-gray-800"
          >
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[#5A5A40] dark:bg-[#a3a38a]" />
                  <span className="text-[10px] font-black text-[#5A5A40] dark:text-[#a3a38a] uppercase tracking-[0.2em]">{selectedStaff.role} Performance</span>
                </div>
                <h2 className="serif text-3xl text-gray-900 dark:text-white">{selectedStaff.name}</h2>
              </div>
              <button 
                onClick={() => setSelectedStaff(null)}
                className="p-3 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              {/* Chart Section */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Workload Overview</h3>
                <div className="h-[300px] w-full bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-700">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Confirmed', count: courses.filter(c => 
                        (c.coordinatorId === selectedStaff.id || c.salesPersonId === selectedStaff.id || (c as any).marketingPersonId === selectedStaff.id || (c as any).hrPersonId === selectedStaff.id) && 
                        c.status === 'confirmed'
                      ).length, color: '#10B981' },
                      { name: 'In Progress', count: courses.filter(c => 
                        (c.coordinatorId === selectedStaff.id || c.salesPersonId === selectedStaff.id || (c as any).marketingPersonId === selectedStaff.id || (c as any).hrPersonId === selectedStaff.id) && 
                        c.status === 'in_progress'
                      ).length, color: '#F59E0B' },
                      { name: 'Requests', count: courses.filter(c => 
                        (c.coordinatorId === selectedStaff.id || c.salesPersonId === selectedStaff.id || (c as any).marketingPersonId === selectedStaff.id || (c as any).hrPersonId === selectedStaff.id) && 
                        c.status === 'request'
                      ).length, color: '#6B7280' },
                      { name: 'Cancelled', count: courses.filter(c => 
                        (c.coordinatorId === selectedStaff.id || c.salesPersonId === selectedStaff.id || (c as any).marketingPersonId === selectedStaff.id || (c as any).hrPersonId === selectedStaff.id) && 
                        c.status === 'cancelled'
                      ).length, color: '#EF4444' },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 500, fill: '#6B7280' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 500, fill: '#6B7280' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                        cursor={{ fill: '#F3F4F6' }}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={60}>
                        <Cell fill="#10B981" />
                        <Cell fill="#F59E0B" />
                        <Cell fill="#6B7280" />
                        <Cell fill="#EF4444" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Course List Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Assigned Courses</h3>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-bold">
                    {courses.filter(c => 
                      c.coordinatorId === selectedStaff.id || 
                      c.salesPersonId === selectedStaff.id ||
                      (c as any).marketingPersonId === selectedStaff.id ||
                      (c as any).hrPersonId === selectedStaff.id
                    ).length} Programs
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses
                    .filter(c => 
                      c.coordinatorId === selectedStaff.id || 
                      c.salesPersonId === selectedStaff.id ||
                      (c as any).marketingPersonId === selectedStaff.id ||
                      (c as any).hrPersonId === selectedStaff.id
                    )
                    .map(course => (
                      <Link 
                        key={course.id}
                        to={`/course/${course.id}`}
                        className="group p-6 bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-gray-800 rounded-[1.5rem] hover:border-[#5A5A40] dark:hover:border-[#a3a38a] hover:shadow-xl transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between mb-4">
                            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{course.referenceNumber}</span>
                            <div className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              course.status === 'confirmed' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                              course.status === 'in_progress' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' :
                              course.status === 'cancelled' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                              'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            )}>
                              {course.status.replace('_', ' ')}
                            </div>
                          </div>
                          <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-[#5A5A40] dark:group-hover:text-[#a3a38a] transition-colors line-clamp-1 mb-2">{course.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar size={12} />
                            <span>{format(new Date(course.startDate), 'MMM d')} - {format(new Date(course.endDate), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#5A5A40] dark:text-[#a3a38a] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">View Details</span>
                          <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-[#5A5A40] dark:group-hover:text-[#a3a38a] group-hover:translate-x-1 transition-all" />
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
        {/* Sidebar Navigation - Inspired by Screenshot */}
        <aside className="space-y-4 sticky top-8">
          {/* Upcoming - Old - Now */}
          <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <button 
              onClick={() => setIsUpcomingSidebarCollapsed(!isUpcomingSidebarCollapsed)}
              className="w-full bg-gray-200/80 dark:bg-gray-700/80 px-4 py-2 flex items-center justify-between border-b border-gray-300 dark:border-gray-600 hover:bg-gray-300/50 dark:hover:bg-gray-600/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Bookmark size={16} className="text-[#1a237e] dark:text-blue-400" />
                <span className="text-sm font-bold text-[#1a237e] dark:text-blue-400">Upcoming - Old - Now</span>
              </div>
              {isUpcomingSidebarCollapsed ? <ChevronDown size={16} className="text-[#1a237e] dark:text-blue-400" /> : <ChevronUp size={16} className="text-[#1a237e] dark:text-blue-400" />}
            </button>
            {!isUpcomingSidebarCollapsed && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="p-2 space-y-1"
              >
                <button 
                  onClick={() => setActiveFilter('upcoming')}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors",
                    activeFilter === 'upcoming' ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                  )}
                >
                  <ChevronRight size={14} className="text-gray-400" />
                  Upcoming bookings
                </button>
                <button 
                  onClick={() => setActiveFilter('past')}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-lg transition-colors",
                    activeFilter === 'past' ? "bg-white dark:bg-gray-800 shadow-sm text-red-600 font-bold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight size={14} className="text-gray-400" />
                    Past bookings
                  </div>
                  <span className={activeFilter === 'past' ? "text-red-600" : "text-red-500 font-bold"}>
                    ({stats.past})
                  </span>
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
                  <ChevronRight size={14} className="text-gray-400" />
                  Not Cost
                </button>
              </motion.div>
            )}
          </div>

        </aside>

        {/* Main Content Area */}
        <div className="space-y-8">
          {/* Header with Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Quick search (Name, Ref, Client)..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-[#a3a38a] shadow-sm text-gray-900 dark:text-white"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <button
              onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-2xl border transition-all font-medium text-sm",
                isAdvancedSearchOpen 
                  ? "bg-[#1a237e] dark:bg-blue-600 text-white border-[#1a237e] dark:border-blue-600 shadow-lg" 
                  : "bg-white dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm"
              )}
            >
              <Filter size={18} />
              Advance search view
              {isAdvancedSearchOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {/* Advanced Search Panel */}
          {isAdvancedSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-[2rem] p-8 overflow-hidden shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="serif text-xl text-[#1a237e] dark:text-blue-400">Advanced Search Filters</h3>
                <button 
                  onClick={() => {
                    setFilters({
                      search: '',
                      courseName: '',
                      fromDate: '',
                      toDate: '',
                      status: 'all',
                      location: '',
                      noInstructor: false,
                      notCost: false,
                    });
                  }}
                  className="text-sm text-red-600 hover:underline flex items-center gap-1 font-bold"
                >
                  <X size={14} /> Reset Filters
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Search</label>
                  <input
                    type="text"
                    placeholder="Search anything (Name, Client, Phone...)"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a237e] dark:focus:ring-blue-600 text-gray-900 dark:text-white"
                    value={filters.courseName}
                    onChange={(e) => setFilters({ ...filters, courseName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">From Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a237e] dark:focus:ring-blue-600 text-gray-900 dark:text-white"
                    value={filters.fromDate}
                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">To Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a237e] dark:focus:ring-blue-600 text-gray-900 dark:text-white"
                    value={filters.toDate}
                    onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a237e] dark:focus:ring-blue-600 text-gray-900 dark:text-white"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <option value="all">All Statuses</option>
                    <option value="request">Request</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Location / City</label>
                  <input
                    type="text"
                    placeholder="Enter city..."
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a237e] dark:focus:ring-blue-600 text-gray-900 dark:text-white"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-8 md:col-span-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={filters.noInstructor}
                        onChange={(e) => setFilters({ ...filters, noInstructor: e.target.checked })}
                      />
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-[#1a237e] peer-checked:border-[#1a237e] transition-all" />
                      <Search size={12} className="absolute left-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">No Instructor</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={filters.notCost}
                        onChange={(e) => setFilters({ ...filters, notCost: e.target.checked })}
                      />
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-red-600 peer-checked:border-red-600 transition-all" />
                      <X size={12} className="absolute left-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">Not Cost (Accounting)</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {/* Stats & Operations Overview - Admin Only */}
          {profile?.role === 'admin' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="serif text-xl text-[#5A5A40] dark:text-[#a3a38a]">Operations Overview</h2>
                <button 
                  onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
                  className="text-sm text-[#5A5A40] dark:text-[#a3a38a] hover:underline flex items-center gap-1"
                >
                  {isStatsCollapsed ? <Plus size={14} /> : <X size={14} />}
                  {isStatsCollapsed ? 'Show Stats' : 'Hide Stats'}
                </button>
              </div>

              {!isStatsCollapsed && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="space-y-6"
                >
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                    {[
                      { label: 'Confirmed', value: stats.confirmed, color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' },
                      { label: 'In Progress', value: stats.inProgress, color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' },
                      { label: 'Requests', value: stats.request, color: 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400' },
                      { label: 'Cancelled', value: stats.cancelled, color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-3xl bg-white dark:bg-[#1e1e1e] p-6 shadow-sm border border-gray-50 dark:border-gray-800">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                        <p className={cn("mt-2 text-3xl font-semibold", stat.color.split(' ')[2])}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Staff Performance Breakdown by Department */}
                  <div className="bg-white dark:bg-[#1e1e1e] rounded-[2rem] p-8 shadow-sm border border-gray-50 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Staff Performance (Courses Handled)</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      {['Operation', 'Sales', 'Marketing', 'HR'].map((dept) => (
                        <div key={dept} className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#5A5A40] dark:bg-[#a3a38a]" />
                            <h4 className="text-xs font-black text-[#5A5A40] dark:text-[#a3a38a] uppercase tracking-widest">{dept}</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.values((stats as any).byDepartment?.[dept] || {}).map((staff: any) => (
                              <button 
                                key={staff.id} 
                                onClick={() => setSelectedStaff({ id: staff.id, name: staff.name, role: dept })}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-[#5A5A40] dark:hover:border-[#a3a38a] hover:bg-white dark:hover:bg-gray-800 transition-all group text-left w-full"
                              >
                                <div>
                                  <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-[#5A5A40] dark:group-hover:text-[#a3a38a]">{staff.name}</p>
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-black">View Details</p>
                                </div>
                                <div className="bg-[#5A5A40] dark:bg-[#a3a38a] text-white dark:text-black w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                                  {staff.count}
                                </div>
                              </button>
                            ))}
                            {Object.keys((stats as any).byDepartment?.[dept] || {}).length === 0 && (
                              <p className="text-gray-400 text-[10px] italic py-2">No data for this department.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Course List - Modern Timeline View */}
          <section className="space-y-12">
            <div className="flex items-center justify-between">
              <h2 className="serif text-2xl text-[#5A5A40] dark:text-[#a3a38a]">
                {activeFilter === 'upcoming' ? 'Training Schedule' : 'Past Programs History'}
              </h2>
              <div className="flex items-center gap-4">
                <Link to="/courses" className="text-sm font-medium text-[#5A5A40] dark:text-[#a3a38a] hover:underline">View all programs</Link>
              </div>
            </div>

            {Object.entries(
              courses
                .filter(course => {
                  const isPast = new Date(course.endDate) < new Date();
                  const matchesHistory = activeFilter === 'past' ? isPast : !isPast;
                  
                  if (!matchesHistory) return false;

                  // Advanced Filters
                  const globalSearch = (searchTerm: string) => {
                    if (!searchTerm) return true;
                    const s = searchTerm.toLowerCase();
                    const startDateStr = format(new Date(course.startDate), 'd MMM yyyy').toLowerCase();
                    const endDateStr = format(new Date(course.endDate), 'd MMM yyyy').toLowerCase();
                    
                    return (
                      course.name.toLowerCase().includes(s) || 
                      course.referenceNumber?.toLowerCase().includes(s) ||
                      course.clientName?.toLowerCase().includes(s) ||
                      course.location.toLowerCase().includes(s) ||
                      course.clientCompany?.toLowerCase().includes(s) ||
                      course.clientPhone?.toLowerCase().includes(s) ||
                      startDateStr.includes(s) ||
                      endDateStr.includes(s)
                    );
                  };

                  const matchesSearch = globalSearch(filters.search);
                  const matchesCourseName = globalSearch(filters.courseName);
                  const matchesStatus = filters.status === 'all' || course.status === filters.status;
                  const matchesLocation = !filters.location || course.location.toLowerCase().includes(filters.location.toLowerCase());
                  const matchesNoInstructor = !filters.noInstructor || !course.trainerId;
                  const matchesNotCost = !filters.notCost || !course.hasCost;
                  
                  const courseDate = new Date(course.startDate);
                  const matchesFromDate = !filters.fromDate || courseDate >= new Date(filters.fromDate);
                  const matchesToDate = !filters.toDate || courseDate <= new Date(filters.toDate);

                  return matchesSearch && matchesCourseName && matchesStatus && matchesLocation && matchesNoInstructor && matchesNotCost && matchesFromDate && matchesToDate;
                })
                .reduce((acc, course) => {
                  const date = format(new Date(course.startDate), 'd - MMMM - yyyy | EEE');
                  if (!acc[date]) acc[date] = [];
                  acc[date].push(course);
                  return acc;
                }, {} as Record<string, Course[]>)
            ).sort((a, b) => {
              const timeA = new Date(a[1][0].startDate).getTime();
              const timeB = new Date(b[1][0].startDate).getTime();
              return activeFilter === 'past' ? timeB - timeA : timeA - timeB;
            }).map(([date, dayCourses]) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                  <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">{date}</h3>
                  <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                </div>

                <div className="space-y-3">
                  {dayCourses.map((course) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div
                        onClick={() => navigate(`/course/${course.id}`)}
                        className={cn(
                          "group relative grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1fr_1.2fr_1fr_auto] items-center gap-6 rounded-[2rem] p-6 transition-all hover:scale-[1.01] hover:shadow-xl cursor-pointer",
                          course.status === 'confirmed' ? "bg-green-600 dark:bg-green-700 text-white" :
                          course.status === 'request' ? "bg-gray-400 dark:bg-gray-600 text-white" :
                          course.status === 'cancelled' ? "bg-red-500 dark:bg-red-700 text-white" :
                          "bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-white shadow-sm border border-gray-50 dark:border-gray-800"
                        )}
                      >
                        {/* Course Name */}
                        <div className={cn(
                          "min-w-0 md:border-r md:pr-6",
                          (course.status === 'confirmed' || course.status === 'request' || course.status === 'cancelled') ? "border-white/20" : "border-gray-100 dark:border-gray-800"
                        )}>
                          <p className={cn(
                            "text-xs font-bold uppercase tracking-wider opacity-50 mb-1",
                            (course.status === 'confirmed' || course.status === 'request' || course.status === 'cancelled') ? "text-white" : "text-gray-400"
                          )}>Course</p>
                          <h4 className="text-lg font-medium leading-tight truncate">{course.name}</h4>
                        </div>

                        {/* Client */}
                        <div className={cn(
                          "hidden md:block md:border-r md:pr-6",
                          (course.status === 'confirmed' || course.status === 'request' || course.status === 'cancelled') ? "border-white/20" : "border-gray-100"
                        )}>
                          <p className={cn(
                            "text-xs font-bold uppercase tracking-wider opacity-50 mb-1",
                            (course.status === 'confirmed' || course.status === 'request' || course.status === 'cancelled') ? "text-white" : "text-gray-400"
                          )}>Client Name</p>
                          <p className="font-medium truncate">{course.clientName || 'N/A'}</p>
                        </div>

                        {/* Dates */}
                        <div className={cn(
                          "hidden md:block md:border-r md:pr-6",
                          (course.status === 'confirmed' || course.status === 'request' || course.status === 'cancelled') ? "border-white/20" : "border-gray-100"
                        )}>
                          <p className={cn(
                            "text-xs font-bold uppercase tracking-wider opacity-50 mb-1",
                            (course.status === 'confirmed' || course.status === 'request' || course.status === 'cancelled') ? "text-white" : "text-gray-400"
                          )}>Duration</p>
                          <p className="font-medium whitespace-nowrap">
                            {(() => {
                              const start = new Date(course.startDate);
                              const end = new Date(course.endDate);
                              if (start.getMonth() !== end.getMonth() || start.getFullYear() !== end.getFullYear()) {
                                return `${format(start, 'd MMM')} - ${format(end, 'd MMM')}`;
                              }
                              return `${format(start, 'd')} - ${format(end, 'd MMM')}`;
                            })()}
                          </p>
                        </div>

                        {/* Location */}
                        <div className={cn(
                          "hidden md:block md:border-r md:pr-6",
                          (course.status === 'confirmed' || course.status === 'request' || course.status === 'cancelled') ? "border-white/20" : "border-gray-100"
                        )}>
                          <p className={cn(
                            "text-xs font-bold uppercase tracking-wider opacity-50 mb-1",
                            (course.status === 'confirmed' || course.status === 'request' || course.status === 'cancelled') ? "text-white" : "text-gray-400"
                          )}>Location</p>
                          <p className="font-medium truncate">{course.location}</p>
                        </div>

                        {/* Company */}
                        <div className={cn(
                          "hidden md:block md:border-r md:pr-6",
                          (course.status === 'confirmed' || course.status === 'request' || course.status === 'cancelled') ? "border-white/20" : "border-gray-100"
                        )}>
                          <p className={cn(
                            "text-xs font-bold uppercase tracking-wider opacity-50 mb-1",
                            (course.status === 'confirmed' || course.status === 'request' || course.status === 'cancelled') ? "text-white" : "text-gray-400"
                          )}>Company</p>
                          <p className="font-medium truncate">{course.clientCompany || 'N/A'}</p>
                        </div>

                        {/* Phone */}
                        <div className={cn(
                          "hidden md:block md:border-r md:pr-6",
                          (course.status === 'confirmed' || course.status === 'request' || course.status === 'cancelled') ? "border-white/20" : "border-gray-100"
                        )}>
                          <p className={cn(
                            "text-xs font-bold uppercase tracking-wider opacity-50 mb-1",
                            (course.status === 'confirmed' || course.status === 'request' || course.status === 'cancelled') ? "text-white" : "text-gray-400"
                          )}>Contact</p>
                          <p className="font-medium text-sm">{course.clientPhone || 'N/A'}</p>
                        </div>

                        {/* Status / Action */}
                        <div className="flex items-center gap-4">
                          <a
                            href="https://online.agile4training.com/admin"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "rounded-full p-2 transition-all",
                              (course.status === 'confirmed' || course.status === 'request' || course.status === 'cancelled')
                                ? "bg-white/20 text-white hover:bg-white/30"
                                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                            )}
                            title="Open in Agile CRM"
                          >
                            <ExternalLink size={18} />
                          </a>
                          {(profile?.role === 'admin' || profile?.department === 'Operation' || profile?.email === 'hasan.alassaf91@gmail.com') && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setCourseToDelete(course);
                              }}
                              className={cn(
                                "rounded-full p-2 transition-all",
                                (course.status === 'confirmed' || course.status === 'request' || course.status === 'cancelled')
                                  ? "bg-white/20 text-white hover:bg-red-500"
                                  : "bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500"
                              )}
                              title="Delete Course"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          <div className={cn(
                            "rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.15em]",
                            course.status === 'confirmed' ? "bg-white/20 text-white" :
                            course.status === 'request' ? "bg-white/20 text-white" :
                            course.status === 'cancelled' ? "bg-white/20 text-white" :
                            course.status === 'in_progress' ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500"
                          )}>
                            {course.status?.replace('_', ' ')}
                          </div>
                          {!course.hasCost && (
                            <div className="rounded-full px-3 py-1 bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider">
                              No Cost
                            </div>
                          )}
                          <div
                            className={cn(
                              "rounded-full p-2 transition-all",
                              (course.status === 'confirmed' || course.status === 'request' || course.status === 'cancelled')
                                ? "bg-white/20 text-white group-hover:bg-white/40"
                                : "bg-gray-50 text-gray-400 group-hover:bg-[#5A5A40] group-hover:text-white"
                            )}
                          >
                            <ArrowRight size={18} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        onConfirm={() => courseToDelete && handleDeleteCourse(courseToDelete)}
        title="Delete Course"
        message={`Are you sure you want to delete the course "${courseToDelete?.name}"? This action cannot be undone and all associated data will be lost.`}
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
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        onConfirm={() => courseToDelete && handleDeleteCourse(courseToDelete)}
        title="Delete Course"
        message={`Are you sure you want to delete the course "${courseToDelete?.name}"? This action cannot be undone and all associated data will be lost.`}
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

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
