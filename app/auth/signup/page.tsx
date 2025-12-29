'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { upsertProfile } from '@/lib/auth/onAuth';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError(error.message || 'Failed to create account');
        }
        setLoading(false);
        return;
      }

      // Upsert profile
      if (data.user) {
        await upsertProfile(data.user);
      }

      // Check if email confirmation is required
      if (data.session) {
        // No email confirmation required - redirect immediately
        setSuccess('Account created successfully!');
        setTimeout(() => {
          router.replace('/garden');
        }, 1000);
      } else {
        // Email confirmation required
        setSuccess('Account created! Please check your email to confirm your account before signing in.');
        setTimeout(() => {
          router.replace('/auth/login');
        }, 3000);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Create Account</h1>
          <p className="text-gray-400">Join StrainSpotter and start growing</p>
        </div>

        {/* Sign Up Form */}
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              minLength={6}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-400 text-black rounded-lg font-semibold hover:from-green-400 hover:to-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Success Message */}
        {success && (
          <div className="mt-4 p-4 bg-green-900/40 border border-green-500/40 rounded-lg text-green-200">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-900/40 border border-red-500/40 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          <Link
            href="/auth/login"
            className="block text-green-400 hover:text-green-300 text-sm"
          >
            Already have an account? Sign in →
          </Link>
        </div>
      </div>
    </div>
  );
}
