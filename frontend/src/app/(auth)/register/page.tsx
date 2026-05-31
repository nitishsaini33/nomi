'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function Register() {
  const [step, setStep] = useState<1 | 2>(1);
  
  // Step 1 state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Step 2 state
  const [otp, setOtp] = useState('');
  
  // Global state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validateStep1 = (): string | null => {
    if (username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores.';
    if (!validateEmail(email)) return 'Please enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateStep1();
    if (validationError) { setError(validationError); return; }
    
    setLoading(true);
    setError('');
    
    try {
      await api.post('/auth/send-otp', { 
        username: username.trim(), 
        email: email.trim().toLowerCase(), 
        password 
      });
      setSuccess('Verification code sent to your email!');
      setStep(2);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await api.post('/auth/verify-otp', { 
        email: email.trim().toLowerCase(), 
        otp: otp.trim()
      });
      setSuccess('Email verified! Account created successfully.');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
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
        {step === 2 && (
          <button 
            onClick={() => { setStep(1); setError(''); setSuccess(''); }}
            className="mb-6 flex items-center gap-1 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}

        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="Nomihub Logo" className="w-16 h-16 rounded-2xl shadow-lg border border-white/10" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
            {step === 1 ? 'Create Account' : 'Verify Email'}
          </h2>
          <p className="text-sm text-gray-400">
            {step === 1 ? 'Join the next-gen chat experience' : 'Almost there!'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 mb-6 rounded-xl text-sm text-center backdrop-blur-md"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 p-3 mb-6 rounded-xl text-sm text-center backdrop-blur-md"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form 
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendOTP} 
              className="space-y-4"
            >
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300 ml-1">Username</label>
                <input
                  type="text"
                  className="glass-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. john_doe"
                  required
                  autoComplete="username"
                  minLength={3}
                  maxLength={30}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300 ml-1">Email</label>
                <input
                  type="email"
                  className="glass-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
                  <input
                    type="password"
                    className="glass-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-300 ml-1">Confirm</label>
                  <input
                    type="password"
                    className="glass-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat"
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="glass-button w-full py-3.5 text-base mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending Code...
                  </span>
                ) : 'Continue'}
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyOTP} 
              className="space-y-6"
            >
              <p className="text-sm text-gray-300 text-center leading-relaxed">
                We've sent a 6-digit code to <span className="text-indigo-400 font-medium">{email}</span>.<br/>
                Please enter it below.
              </p>

              <div className="flex flex-col gap-2 mt-4">
                <input
                  type="text"
                  className="glass-input text-3xl tracking-[0.5em] text-center font-bold py-4 bg-black/40"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="glass-button w-full py-3.5 text-base mt-4 !from-emerald-500 !to-teal-600 hover:!from-emerald-400 hover:!to-teal-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : 'Verify & Create Account'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
