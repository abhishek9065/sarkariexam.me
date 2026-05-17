'use client';

import { ArrowRight, Eye, EyeOff, GraduationCap, Loader2, Lock, Mail, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { resolvePublicApiBase } from '@/lib/api';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

let csrfTokenCache: string | null = null;

function readCookieValue(name: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

async function parseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function ensureCsrfToken(apiBase: string, forceRefresh = false) {
  if (!forceRefresh) {
    const cookieToken = readCookieValue(CSRF_COOKIE_NAME);
    if (cookieToken) {
      csrfTokenCache = cookieToken;
      return cookieToken;
    }

    if (csrfTokenCache) {
      return csrfTokenCache;
    }
  }

  const response = await fetch(`${apiBase}/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = await parseJsonResponse(response) as { data?: { csrfToken?: string } } | null;
  if (!response.ok) {
    throw new Error(readApiMessage(payload, 'Unable to initialize secure session.'));
  }

  const token = payload?.data?.csrfToken || readCookieValue(CSRF_COOKIE_NAME);
  if (!token) {
    throw new Error('Unable to initialize secure session.');
  }

  csrfTokenCache = token;
  return token;
}

function readApiMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const body = payload as Record<string, unknown>;
    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }

    if (typeof body.error === 'string' && body.error.trim()) {
      return body.error;
    }

    if (body.error && typeof body.error === 'object') {
      return 'Please check the highlighted details and try again.';
    }
  }

  return fallback;
}

async function postWithCsrf(apiBase: string, endpoint: string, body: Record<string, unknown>, forceRefresh = false) {
  const csrfToken = await ensureCsrfToken(apiBase, forceRefresh);
  const response = await fetch(`${apiBase}${endpoint}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      [CSRF_HEADER_NAME]: csrfToken,
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const payload = await parseJsonResponse(response);

  if (
    response.status === 403 &&
    payload &&
    typeof payload === 'object' &&
    (payload as Record<string, unknown>).error === 'csrf_invalid' &&
    !forceRefresh
  ) {
    csrfTokenCache = null;
    return postWithCsrf(apiBase, endpoint, body, true);
  }

  return { response, payload };
}

interface HomePageLoginModalProps {
  open: boolean;
  initialTab?: 'login' | 'register';
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export function HomePageLoginModal({ open, initialTab = 'login', onClose, onLoginSuccess }: HomePageLoginModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [view, setView] = useState<'auth' | 'recovery-request' | 'recovery-reset'>('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const apiBase = resolvePublicApiBase();

  useEffect(() => {
    if (!open) {
      return;
    }

    setTab(initialTab);
    setView('auth');
    setEmail('');
    setPassword('');
    setName('');
    setRecoveryEmail('');
    setRecoveryToken('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setIsLoading(false);
    setIsDone(false);
    setError(null);
    setMessage(null);
  }, [initialTab, open]);

  if (!open) {
    return null;
  }

  function resetFeedback() {
    setError(null);
    setMessage(null);
  }

  function showAuthView(nextTab: 'login' | 'register' = tab) {
    setView('auth');
    setTab(nextTab);
    resetFeedback();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    resetFeedback();

    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register';
      const { response, payload } = await postWithCsrf(apiBase, endpoint, {
        email: email.trim(),
        password,
        ...(tab === 'register' ? { name: name.trim() } : {}),
      });

      if (response.ok) {
        setIsDone(true);
        setTimeout(() => {
          setIsDone(false);
          onLoginSuccess?.();
          onClose();
        }, 1200);
      } else {
        setError(readApiMessage(payload, 'Authentication failed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRecoveryRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    resetFeedback();

    try {
      const { response, payload } = await postWithCsrf(apiBase, '/auth/password-recovery/request', {
        email: recoveryEmail.trim(),
      });

      if (!response.ok) {
        setError(readApiMessage(payload, 'Failed to request password recovery.'));
        return;
      }

      const token = payload &&
        typeof payload === 'object' &&
        typeof ((payload as { data?: { testToken?: unknown } }).data?.testToken) === 'string'
        ? String((payload as { data: { testToken: string } }).data.testToken)
        : '';

      setMessage(token
        ? `Recovery token: ${token}`
        : 'If an account exists for that email, recovery instructions have been sent.');
      setRecoveryToken(token);
      setView('recovery-reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRecoveryReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    resetFeedback();

    if (newPassword !== confirmPassword) {
      setIsLoading(false);
      setError('New password and confirm password must match.');
      return;
    }

    try {
      const { response, payload } = await postWithCsrf(apiBase, '/auth/password-recovery/reset', {
        token: recoveryToken.trim(),
        password: newPassword,
      });

      if (!response.ok) {
        setError(readApiMessage(payload, 'Failed to reset password.'));
        return;
      }

      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setRecoveryToken('');
      setMessage('Password reset successful. Please sign in with your new password.');
      setView('auth');
      setTab('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
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
                  setView('auth');
                  setTab(mode);
                  resetFeedback();
                }}
                className={`flex-1 rounded-md py-1.5 text-[13px] font-semibold capitalize transition-all ${
                  view === 'auth' && tab === mode ? 'bg-white text-[#1a237e] shadow-sm' : 'text-white/70 hover:text-white'
                }`}
              >
                {mode === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={
            view === 'recovery-request'
              ? handleRecoveryRequest
              : view === 'recovery-reset'
                ? handleRecoveryReset
                : handleSubmit
          }
          className="space-y-3 px-6 py-5"
        >
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-center">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {message && (
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <p className="text-sm text-green-700">{message}</p>
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
          ) : view === 'recovery-request' ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-600">ACCOUNT EMAIL</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(event) => {
                      setRecoveryEmail(event.target.value);
                      resetFeedback();
                    }}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-[13px] text-gray-800 outline-none transition-all placeholder:text-gray-300 focus:border-[#1a237e] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !recoveryEmail.trim()}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#e65100] to-[#bf360c] py-2.5 text-[14px] font-bold text-white shadow-md transition-all hover:from-[#bf360c] hover:to-[#e65100] hover:shadow-lg disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Please wait…
                  </>
                ) : (
                  'Send recovery instructions'
                )}
              </button>
              <div className="flex items-center justify-between text-[11px]">
                <button type="button" onClick={() => showAuthView('login')} className="font-semibold text-[#1a237e] hover:underline">
                  Back to sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView('recovery-reset');
                    resetFeedback();
                  }}
                  className="font-semibold text-[#1a237e] hover:underline"
                >
                  Have a token?
                </button>
              </div>
            </div>
          ) : view === 'recovery-reset' ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-600">RECOVERY TOKEN</label>
                <input
                  type="text"
                  required
                  value={recoveryToken}
                  onChange={(event) => {
                    setRecoveryToken(event.target.value);
                    resetFeedback();
                  }}
                  placeholder="Paste recovery token"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none transition-all placeholder:text-gray-300 focus:border-[#1a237e] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-600">NEW PASSWORD</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    resetFeedback();
                  }}
                  placeholder="New password"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none transition-all placeholder:text-gray-300 focus:border-[#1a237e] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-600">CONFIRM PASSWORD</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    resetFeedback();
                  }}
                  placeholder="Confirm password"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none transition-all placeholder:text-gray-300 focus:border-[#1a237e] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !recoveryToken.trim() || !newPassword || !confirmPassword}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#e65100] to-[#bf360c] py-2.5 text-[14px] font-bold text-white shadow-md transition-all hover:from-[#bf360c] hover:to-[#e65100] hover:shadow-lg disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Please wait…
                  </>
                ) : (
                  'Reset password'
                )}
              </button>
              <button type="button" onClick={() => showAuthView('login')} className="text-[11px] font-semibold text-[#1a237e] hover:underline">
                Back to sign in
              </button>
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
                  <button
                    type="button"
                    className="text-[12px] text-[#1a237e] hover:underline"
                    onClick={() => {
                      setRecoveryEmail(email);
                      setView('recovery-request');
                      resetFeedback();
                    }}
                  >
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
                  onClick={() => showAuthView(tab === 'login' ? 'register' : 'login')}
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
