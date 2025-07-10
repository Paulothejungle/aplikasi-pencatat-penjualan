// context/AuthContext.tsx
'use client';

import { useContext, createContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential // [PERBAIKAN] Import tipe UserCredential
} from 'firebase/auth';
import { auth } from '../lib/firebase';

// [PERBAIKAN] Definisikan tipe yang lebih spesifik untuk konteks
interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
}

// [PERBAIKAN] Gunakan tipe AuthContextType dan berikan nilai awal undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// [PERBAIKAN] Perbarui hook untuk menangani kemungkinan 'undefined'
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth harus digunakan di dalam AuthContextProvider');
  }
  return context;
};
