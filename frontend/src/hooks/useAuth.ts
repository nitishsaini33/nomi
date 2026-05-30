import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const { currentUser, setCurrentUser } = useChatStore();
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      // If we already have the user from Zustand persist, we can stop loading early
      // to prevent the UI from blocking/flashing while checking the token.
      const hasUser = !!useChatStore.getState().currentUser;
      if (hasUser) {
        setLoading(false);
      }

      try {
        const user = await api.get('/users/me');
        setCurrentUser(user);
      } catch (err: any) {
        console.error('Auth check failed:', err);
        // Only wipe the token if the backend explicitly rejected it (expired/invalid)
        if (err?.status === 401 || err?.status === 403) {
          localStorage.removeItem('token');
          setCurrentUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [setCurrentUser]);

  const logout = () => {
    localStorage.removeItem('token');
    useChatStore.getState().clearStore(); // Wipes cached messages, friends, etc.
    router.push('/login');
  };

  return { user: currentUser, loading, logout };
}
