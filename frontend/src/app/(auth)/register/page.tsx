'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validate = (): string | null => {
    if (username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores.';
    if (!validateEmail(email)) return 'Please enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', { username: username.trim(), email: email.trim().toLowerCase(), password });
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => router.push('/login'), 1200);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4 relative overflow-hidden">
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
        {success && (
          <div className="bg-green-500 text-white p-3 mb-5 font-bold border-2 border-text text-sm sm:text-base transform rotate-1">
            {success}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="font-black text-sm sm:text-base uppercase tracking-wide">
              Username
            </label>
            <input
              type="text"
              className="brutal-input text-base sm:text-lg"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. john_doe"
              required
              autoComplete="username"
              minLength={3}
              maxLength={30}
            />
            <span className="text-[11px] font-bold text-text/50">Letters, numbers and underscores only.</span>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="font-black text-sm sm:text-base uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              className="brutal-input text-base sm:text-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@example.com"
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="font-black text-sm sm:text-base uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              className="brutal-input text-base sm:text-lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5">
            <label className="font-black text-sm sm:text-base uppercase tracking-wide">
              Confirm Password
            </label>
            <input
              type="password"
              className="brutal-input text-base sm:text-lg"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
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
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
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
