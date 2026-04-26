"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Session check logic could go here
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
