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
        setLoading(false);
        return;
      }
      try {
        const user = await api.get('/users/me');
        setCurrentUser(user);
      } catch (err) {
        console.error('Auth check failed:', err);
        localStorage.removeItem('token');
        setCurrentUser(null);
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
