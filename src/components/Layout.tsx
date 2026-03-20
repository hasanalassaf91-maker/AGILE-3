import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Shield,
  Settings, 
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { cn } from '../lib/utils';
import NotificationCenter from './NotificationCenter';
import PrivateNotes from './PrivateNotes';
import ProfilePictureUpload from './ProfilePictureUpload';
import { NotificationService } from '../lib/NotificationService';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Course } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [courses, setCourses] = React.useState<Course[]>([]);

  // Fetch courses to check for notifications
  useEffect(() => {
    if (!profile) return;
    
    const q = query(collection(db, 'courses'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'courses');
    });

    return () => unsubscribe();
  }, [profile]);

  // Check and generate notifications
  useEffect(() => {
    if (profile && courses.length > 0) {
      NotificationService.checkAndGenerateNotifications(profile, courses);
    }
  }, [profile, courses]);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'My Courses', icon: BookOpen, path: '/courses' },
    ...(profile?.role === 'admin' ? [
      { label: 'Team', icon: Users, path: '/team' },
      { label: 'Role Control', icon: Shield, path: '/roles' }
    ] : []),
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="flex min-h-screen bg-[#f5f5f0] dark:bg-[#121212] transition-colors duration-300">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white dark:bg-[#1e1e1e] border-r border-gray-100 dark:border-gray-800 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 relative",
        isSidebarOpen ? "w-64" : "w-20 -translate-x-full lg:translate-x-0"
      )}>
        {/* Toggle Button on the edge */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden lg:flex absolute -right-4 top-9 z-[60] h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-[#1e1e1e] border-2 border-[#5A5A40]/20 dark:border-[#a3a38a]/20 text-[#5A5A40] dark:text-[#a3a38a] shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-110 active:scale-95"
          title={isSidebarOpen ? "Collapse" : "Expand"}
        >
          {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        <div className={cn(
          "flex h-full flex-col p-6",
          !isSidebarOpen && "items-center px-4"
        )}>
          <div className={cn(
            "mb-10 flex items-center gap-3 px-2",
            !isSidebarOpen && "flex-col"
          )}>
            <img src="/logo.png" alt="Logo" className="h-10 w-10 shrink-0 object-contain" referrerPolicy="no-referrer" />
            {isSidebarOpen && (
              <span className="serif text-xl font-medium text-[#5A5A40] dark:text-[#a3a38a] whitespace-nowrap">EduTrack</span>
            )}
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                title={!isSidebarOpen ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  location.pathname === item.path 
                    ? "bg-[#f5f5f0] dark:bg-[#121212] text-[#5A5A40] dark:text-[#a3a38a]" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
                  !isSidebarOpen && "justify-center px-0 w-12 mx-auto"
                )}
              >
                <item.icon size={20} className="shrink-0" />
                {isSidebarOpen && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => signOut().then(() => navigate('/login'))}
              title={!isSidebarOpen ? "Sign Out" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20",
                !isSidebarOpen && "justify-center px-0 w-12 mx-auto"
              )}
            >
              <LogOut size={20} className="shrink-0" />
              {isSidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white/80 dark:bg-[#1e1e1e]/80 px-8 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
          {!profile?.isDemo ? null : (
            <div className="absolute inset-x-0 -top-8 bg-amber-500 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-white">
              Demo Mode - View Only
            </div>
          )}
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-6 ml-auto">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <PrivateNotes />
            <NotificationCenter />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{profile?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{profile?.role}</p>
              </div>
              <ProfilePictureUpload />
            </div>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
