import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { User } from '@shared/schema';

export function useAuth() {
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    isLoading: boolean;
  }>({
    isAuthenticated: false,
    isLoading: true,
  });
  const queryClient = useQueryClient();
  
  const { data: user, isLoading: isUserLoading } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    enabled: authState.isAuthenticated,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: false,
  });
  
  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        
        setAuthState({
          isAuthenticated: res.ok,
          isLoading: false,
        });
      } catch (error) {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };
    
    checkAuth();
  }, []);
  
  // Logout function
  const logout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
      });
      queryClient.clear();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [queryClient]);
  
  return { 
    user, 
    isAuthenticated: authState.isAuthenticated, 
    isLoading: authState.isLoading || isUserLoading,
    logout 
  };
}
