import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useAuth } from '../contexts/AuthContext';
import { Course } from '../types';
import { motion } from 'motion/react';
import { Calendar, MapPin, ArrowRight, Bookmark, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function UserDashboard() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    // For a generic 'user' role, we check if they are assigned as coordinator, sales, or trainer
    const q = query(collection(db, 'courses'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      
      // Filter courses where the user is involved
      const myCourses = allCourses.filter(course => 
        course.coordinatorId === profile.uid || 
        course.salesPersonId === profile.uid || 
        course.trainerId === profile.uid ||
        (course as any).marketingPersonId === profile.uid ||
        (course as any).hrPersonId === profile.uid
      );
      
      setCourses(myCourses);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'courses');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5A5A40] border-t-transparent" />
      </div>
    );
  }

  const upcomingCourses = courses.filter(c => new Date(c.endDate) >= new Date()).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const pastCourses = courses.filter(c => new Date(c.endDate) < new Date()).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="serif text-4xl text-gray-900">My Workspace</h1>
          <p className="text-gray-500 mt-1">Welcome back, {profile?.name}. Here are your assigned programs.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active</p>
            <p className="text-xl font-bold text-[#5A5A40]">{upcomingCourses.length}</p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Completed</p>
            <p className="text-xl font-bold text-gray-400">{pastCourses.length}</p>
          </div>
        </div>
      </header>

      {/* Active Courses */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-100" />
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Active Programs</h2>
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        {upcomingCourses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
            <Bookmark className="mx-auto text-gray-200 mb-4" size={48} />
            <p className="text-gray-500">No active courses assigned to you at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {upcomingCourses.map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} />
            ))}
          </div>
        )}
      </section>

      {/* Past Courses */}
      {pastCourses.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">History</h2>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 opacity-75 grayscale-[0.5]">
            {pastCourses.map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} isPast />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CourseCard({ course, index, isPast }: { course: Course; index: number; isPast?: boolean }) {
  const statusConfig = {
    confirmed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Confirmed' },
    in_progress: { icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', label: 'In Progress' },
    request: { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Request' },
    cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Cancelled' },
  };

  const config = statusConfig[course.status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link 
        to={`/course/${course.id}`}
        className="group block bg-white rounded-[2rem] p-8 border border-gray-100 hover:border-[#5A5A40] hover:shadow-2xl transition-all relative overflow-hidden"
      >
        <div className="flex items-start justify-between mb-6">
          <div className={cn("px-4 py-1.5 rounded-full flex items-center gap-2 border", config.bg, config.color, "border-current/10")}>
            <StatusIcon size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">{config.label}</span>
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{course.referenceNumber}</span>
        </div>

        <h3 className="serif text-2xl text-gray-900 group-hover:text-[#5A5A40] transition-colors mb-4 line-clamp-2 min-h-[4rem]">
          {course.name}
        </h3>

        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 text-gray-500">
            <Calendar size={16} className="text-[#5A5A40]" />
            <span className="text-sm font-medium">
              {format(new Date(course.startDate), 'MMM d')} - {format(new Date(course.endDate), 'MMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-500">
            <MapPin size={16} className="text-[#5A5A40]" />
            <span className="text-sm font-medium">{course.location}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-gray-50">
          <div className="flex -space-x-2">
            <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600">
              {course.coordinatorName?.[0] || 'C'}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[#5A5A40] font-bold text-xs uppercase tracking-widest group-hover:translate-x-1 transition-transform">
            Open Workspace
            <ArrowRight size={16} />
          </div>
        </div>

        {/* Decorative background element */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gray-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
      </Link>
    </motion.div>
  );
}
