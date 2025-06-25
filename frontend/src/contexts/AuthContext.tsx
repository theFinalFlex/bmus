import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginFormData, RegisterFormData } from '@/types';
import { authApi } from '@/services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginFormData) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterFormData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthContext: Initial authentication check starting...');
    
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    
    console.log('🔐 AuthContext: Token exists:', !!token);
    console.log('🔐 AuthContext: Saved user exists:', !!savedUser);
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log('🔐 AuthContext: Successfully parsed saved user:', parsedUser.email);
        setUser(parsedUser);
        console.log('🔐 AuthContext: User state set, authentication successful');
      } catch (error) {
        console.error('🔐 AuthContext: Error parsing saved user:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        console.log('🔐 AuthContext: Cleared corrupted localStorage data');
      }
    } else {
      console.log('🔐 AuthContext: No valid authentication data found');
    }
    
    console.log('🔐 AuthContext: Setting loading to false');
    setLoading(false);
  }, []);

  const login = async (credentials: LoginFormData) => {
    try {
      const response = await authApi.login(credentials.email, credentials.password);
      
      if (response.error) {
        return { success: false, error: response.error.message };
      }

      const { user: userData, token } = response.data as any;
      
      // Store token and user data
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const register = async (userData: RegisterFormData) => {
    try {
      const response = await authApi.register(userData);
      
      if (response.error) {
        return { success: false, error: response.error.message };
      }

      const { user: newUser, token } = response.data as any;
      
      // Store token and user data
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    
    // Call logout API endpoint
    authApi.logout().catch(console.error);
  };

  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};