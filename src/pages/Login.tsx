import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { loginAsDemo } = useAuth();

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleDemoLogin = (role: 'admin' | 'user') => {
    loginAsDemo(role);
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f0] dark:bg-[#121212] transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-[2.5rem] bg-white dark:bg-[#1e1e1e] p-12 shadow-2xl border border-gray-100 dark:border-gray-800"
      >
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5A5A40]/10 dark:bg-[#a3a38a]/10 text-[#5A5A40] dark:text-[#a3a38a]">
            <LogIn size={32} />
          </div>
          <h1 className="serif text-4xl font-light text-[#5A5A40] dark:text-[#a3a38a]">EduTrack Pro</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Training Management System</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-[#5A5A40] py-4 text-sm font-bold text-white shadow-lg shadow-[#5A5A40]/20 transition-all hover:bg-[#4A4A30] hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogIn size={20} />
            Sign in with Google
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest text-gray-400">
              <span className="bg-white dark:bg-[#1e1e1e] px-4">Demo Access</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleDemoLogin('admin')}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 py-4 text-xs font-bold text-gray-600 dark:text-gray-400 transition-all hover:bg-white dark:hover:bg-gray-800 hover:border-[#5A5A40] dark:hover:border-[#a3a38a] hover:text-[#5A5A40] dark:hover:text-[#a3a38a] hover:shadow-md"
            >
              <ShieldCheck size={18} />
              Admin Demo
            </button>
            <button
              onClick={() => handleDemoLogin('user')}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 py-4 text-xs font-bold text-gray-600 dark:text-gray-400 transition-all hover:bg-white dark:hover:bg-gray-800 hover:border-[#5A5A40] dark:hover:border-[#a3a38a] hover:text-[#5A5A40] dark:hover:text-[#a3a38a] hover:shadow-md"
            >
              <User size={18} />
              User Demo
            </button>
          </div>
        </div>

        <p className="mt-10 text-center text-[10px] text-gray-400 uppercase tracking-widest">
          Secure Enterprise Training Management
        </p>
      </motion.div>
    </div>
  );
}
