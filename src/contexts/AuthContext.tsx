import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInAnonymously, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  loginAsDemo: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        try {
          // Check if profile exists first
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const isAdminEmail = firebaseUser.email === 'hasan.alassaf91@gmail.com';
          
          if (userDoc && !userDoc.exists()) {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'New User',
              role: isAdminEmail ? 'admin' : 'participant',
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          } else if (isAdminEmail && userDoc.data()?.role !== 'admin') {
            // Force admin role for the super admin email if it's different in Firestore
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              ...userDoc.data(),
              role: 'admin'
            }, { merge: true });
          }

          // Listen for profile changes
          unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snapshot) => {
            if (snapshot.exists()) {
              setProfile(snapshot.data() as UserProfile);
            }
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            setLoading(false);
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signOut = () => auth.signOut();

  const loginAsDemo = async (role: UserRole) => {
    try {
      setLoading(true);
      const { user: firebaseUser } = await signInAnonymously(auth);
      
      const demoName = `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`;
      await updateProfile(firebaseUser, { displayName: demoName });

      const demoProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: `${role}@demo.com`,
        name: demoName,
        role: role,
        isDemo: true,
      };

      // Store the demo profile in Firestore so rules can find the role
      await setDoc(doc(db, 'users', firebaseUser.uid), demoProfile);
      
      setProfile(demoProfile);
      setUser(firebaseUser);
    } catch (error) {
      console.error('Demo login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, loginAsDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
