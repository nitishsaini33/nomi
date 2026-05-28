'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', { username, password });
      router.push('/login');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative stripe */}
      <div className="hidden sm:block absolute top-1/4 right-10 w-full h-10 bg-text opacity-10 transform rotate-45 pointer-events-none" />

      <div className="relative z-10 brutal-box p-6 sm:p-8 w-full max-w-md bg-white">
        <h2 className="text-3xl sm:text-4xl font-black mb-6 uppercase bg-text text-white inline-block px-2 sm:px-3 py-1 transform rotate-2">
          Register
        </h2>

        {error && (
          <div className="bg-red-500 text-white p-3 mb-5 font-bold border-2 border-text text-sm sm:text-base transform -rotate-1">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="flex flex-col gap-2">
            <label className="font-black text-base sm:text-lg uppercase tracking-wide">
              Unique Username
            </label>
            <input
              type="text"
              className="brutal-input text-base sm:text-lg"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              minLength={3}
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
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="brutal-btn w-full text-lg sm:text-xl py-3 sm:py-4 bg-primary mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'CREATING...' : 'CREATE'}
          </button>
        </form>

        <div className="mt-6 font-bold text-center text-sm sm:text-base">
          ALREADY HAVE AN ACCOUNT?{' '}
          <Link
            href="/login"
            className="text-primary underline decoration-4 underline-offset-4 hover:bg-text hover:text-white transition-colors px-1"
          >
            LOGIN
          </Link>
        </div>
      </div>
    </div>
  );
}
