import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { apiRequest, queryClient } from '../lib/queryClient';
import { useQuery } from '@tanstack/react-query';

interface User {
  id: number;
  nome: string;
  email: string;
  remoteJid: string;
  senha: string;
  data_cadastro: Date | null;
  ultimo_acesso: Date | null;
}

interface AuthContextType {
  user: User | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: undefined,
  isAuthenticated: false,
  isLoading: true,
  refreshUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const { refetch } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: false,
  });

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const userData = await apiRequest<User>('/api/auth/me');
      setUser(userData);
      return userData;
    } catch (error) {
      setUser(undefined);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const refreshUser = async () => {
    await fetchUser();
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      // Limpar o cache do React Query para remover todos os dados de autenticação
      queryClient.clear();
      setUser(undefined);
      // Redirecionar para a página de login
      window.location.href = '/';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    refreshUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}