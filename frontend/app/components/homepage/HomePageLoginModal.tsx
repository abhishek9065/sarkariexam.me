'use client';

import { ArrowRight, Eye, EyeOff, GraduationCap, Loader2, Lock, Mail, X } from 'lucide-react';
import { useState } from 'react';
import { resolvePublicApiBase } from '@/lib/api';

interface HomePageLoginModalProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export function HomePageLoginModal({ open, onClose, onLoginSuccess }: HomePageLoginModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = resolvePublicApiBase();

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register';
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          name: tab === 'register' ? name : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsDone(true);
        setTimeout(() => {
          setIsDone(false);
          onLoginSuccess?.();
          onClose();
        }, 1200);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-[rgba(10,20,60,0.55)] p-4 backdrop-blur-[4px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="h-1.5 bg-gradient-to-r from-[#1a237e] via-[#e65100] to-[#1a237e]" />
        <div className="relative bg-gradient-to-br from-[#1a237e] to-[#0d47a1] px-6 pb-5 pt-6 text-center text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={16} />
          </button>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/15 shadow-lg">
            <GraduationCap size={22} className="text-yellow-300" />
          </div>
          <div className="text-[18px] font-extrabold tracking-tight">
            SarkariExams<span className="text-yellow-300">.me</span>
          </div>
          <p className="mt-1 text-[12px] text-blue-200">India&apos;s #1 Government Jobs Portal</p>

          <div className="mt-4 flex rounded-lg border border-white/15 bg-white/10 p-0.5">
            {(['login', 'register'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setTab(mode);
                  setError(null);
                }}
                className={`flex-1 rounded-md py-1.5 text-[13px] font-semibold capitalize transition-all ${
                  tab === mode ? 'bg-white text-[#1a237e] shadow-sm' : 'text-white/70 hover:text-white'
                }`}
              >
                {mode === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-6 py-5">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-center">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          {isDone ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[15px] font-bold text-gray-800">
                {tab === 'login' ? 'Welcome back!' : 'Account created!'}
              </p>
              <p className="mt-1 text-[12px] text-gray-400">Redirecting…</p>
            </div>
          ) : (
            <>
              {tab === 'register' && (
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-gray-600">FULL NAME</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Rahul Kumar"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none transition-all placeholder:text-gray-300 focus:border-[#1a237e] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-600">EMAIL ADDRESS</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-[13px] text-gray-800 outline-none transition-all placeholder:text-gray-300 focus:border-[#1a237e] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-600">PASSWORD</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-9 text-[13px] text-gray-800 outline-none transition-all placeholder:text-gray-300 focus:border-[#1a237e] focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {tab === 'login' && (
                <div className="text-right">
                  <button type="button" className="text-[12px] text-[#1a237e] hover:underline">
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#e65100] to-[#bf360c] py-2.5 text-[14px] font-bold text-white shadow-md transition-all hover:from-[#bf360c] hover:to-[#e65100] hover:shadow-lg disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Please wait…
                  </>
                ) : (
                  <>
                    {tab === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-gray-400">
                {tab === 'login' ? "Don't have an account? " : 'Already registered? '}
                <button
                  type="button"
                  onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
                  className="font-semibold text-[#1a237e] hover:underline"
                >
                  {tab === 'login' ? 'Register free' : 'Sign in'}
                </button>
              </p>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-center text-[10px] text-gray-400">
                  Get instant alerts for Jobs, Results &amp; Admit Cards
                </p>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
