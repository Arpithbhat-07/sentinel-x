import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  currentRole: UserRole;
  switchRole: (role: UserRole, displayName?: string) => Promise<void>;
  isLoading: boolean;
}

const DEFAULT_USER: User = {
  id: 'demo-instructor-id',
  username: 'instructor_admin',
  full_name: 'Instructor Cdr. K. Saxena',
  role: 'Instructor',
  is_active: true,
  created_at: new Date().toISOString()
};

const AuthContext = createContext<AuthContextType>({
  user: DEFAULT_USER,
  currentRole: 'Instructor',
  switchRole: async () => {},
  isLoading: false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem('sentinel_user');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });
  const [isLoading, setIsLoading] = useState(false);

  const switchRole = async (role: UserRole, displayName?: string) => {
    setIsLoading(true);
    try {
      const u = await api.demoLogin(role, displayName);
      setUser(u);
      localStorage.setItem('sentinel_user', JSON.stringify(u));
    } catch (e) {
      console.warn('Backend login fallback applied:', e);
      const fallbackUser: User = {
        id: `user-${role.toLowerCase().replace(' ', '-')}`,
        username: role.toLowerCase().replace(' ', '_'),
        full_name: displayName || `${role} Operator`,
        role: role,
        is_active: true,
        created_at: new Date().toISOString()
      };
      setUser(fallbackUser);
      localStorage.setItem('sentinel_user', JSON.stringify(fallbackUser));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('sentinel_user', JSON.stringify(user));
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, currentRole: user.role, switchRole, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
