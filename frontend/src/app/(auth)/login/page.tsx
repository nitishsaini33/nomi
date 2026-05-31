'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const [identifier, setIdentifier] = useState(''); // username or email
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setCurrentUser } = useChatStore();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });
      localStorage.setItem('token', res.access_token);

      const user = await api.get('/users/me');
      setCurrentUser(user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 glass-panel p-8 sm:p-10 w-full max-w-md rounded-3xl"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="Nomihub Logo" className="w-16 h-16 rounded-2xl shadow-lg border border-white/10" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
            Welcome Back
          </h2>
          <p className="text-sm text-gray-400">Sign in to continue your conversations</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 mb-6 rounded-xl text-sm text-center backdrop-blur-md"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300 ml-1">
              Username or Email
            </label>
            <input
              type="text"
              className="glass-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter username or email"
              required
              autoComplete="username"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300 ml-1">
              Password
            </label>
            <input
              type="password"
              className="glass-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="glass-button w-full py-3.5 text-base mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing In...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link
            href="/register"
            className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
          >
            Create one
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
