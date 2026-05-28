'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import Link from 'next/link';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setCurrentUser } = useChatStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const res = await api.postForm('/auth/login', params);
      localStorage.setItem('token', res.access_token);

      const user = await api.get('/users/me');
      setCurrentUser(user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative stripe */}
      <div className="hidden sm:block absolute top-1/4 left-10 w-full h-10 bg-primary opacity-40 transform -rotate-45 pointer-events-none" />

      <div className="relative z-10 brutal-box p-6 sm:p-8 w-full max-w-md bg-white">
        <h2 className="text-3xl sm:text-4xl font-black mb-6 uppercase bg-primary text-text inline-block px-2 sm:px-3 py-1 transform -rotate-2">
          Login
        </h2>

        {error && (
          <div className="bg-red-500 text-white p-3 mb-5 font-bold border-2 border-text text-sm sm:text-base transform rotate-1">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="flex flex-col gap-2">
            <label className="font-black text-base sm:text-lg uppercase tracking-wide">
              Username
            </label>
            <input
              type="text"
              className="brutal-input text-base sm:text-lg"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-black text-base sm:text-lg uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              className="brutal-input text-base sm:text-lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="brutal-btn w-full text-lg sm:text-xl py-3 sm:py-4 bg-primary mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'LOGGING IN...' : 'ENTER'}
          </button>
        </form>

        <div className="mt-6 font-bold text-center text-sm sm:text-base">
          NO ACCOUNT?{' '}
          <Link
            href="/register"
            className="text-primary underline decoration-4 underline-offset-4 hover:bg-text hover:text-white transition-colors px-1"
          >
            REGISTER HERE
          </Link>
        </div>
      </div>
    </div>
  );
}
