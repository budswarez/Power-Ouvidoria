import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { AdminUser } from '../types/database';

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_SESSION_KEY = 'suaempresa_ouvidoria_admin_user';
const TOKEN_SESSION_KEY = 'suaempresa_ouvidoria_admin_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const savedUser = localStorage.getItem(USER_SESSION_KEY);
    const savedToken = localStorage.getItem(TOKEN_SESSION_KEY);
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch (e) {
        localStorage.removeItem(USER_SESSION_KEY);
        localStorage.removeItem(TOKEN_SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc('rpc_admin_login', {
        p_email: email.trim().toLowerCase(),
        p_password: password.trim()
      });

      if (error) {
        return { success: false, error: error.message || 'Erro ao conectar ao servidor de autenticação.' };
      }

      if (!data || !data.success) {
        return { success: false, error: data?.error || 'Credenciais inválidas.' };
      }

      const loggedUser: AdminUser = data.user;
      const sessionToken: string = data.token;

      setUser(loggedUser);
      setToken(sessionToken);

      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(loggedUser));
      localStorage.setItem(TOKEN_SESSION_KEY, sessionToken);

      return { success: true };
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      return { success: false, error: err.message || 'Erro inesperado ao realizar login.' };
    }
  };

  const logout = () => {
    if (token) {
      void Promise.resolve(supabase.rpc('rpc_admin_logout', { p_token: token })).catch(() => {});
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_SESSION_KEY);
    localStorage.removeItem(TOKEN_SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
