'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  ApiError,
  requestPasswordRecovery,
  resetPasswordWithRecoveryToken,
  verifyPasswordRecoveryToken,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

type RecoveryMode = 'login' | 'request' | 'reset';

export function LoginPage() {
  const { login, loading, error, clearError } = useAuth();

  const [mode, setMode] = useState<RecoveryMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('recovery_token');
    if (tokenFromUrl) {
      setMode('reset');
      setRecoveryToken(tokenFromUrl);
    }
  }, []);

  const clearRecoveryFeedback = () => {
    setRecoveryMessage(null);
    setRecoveryError(null);
  };

  const readApiError = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      const body = err.body as Record<string, unknown> | null;
      const message = typeof body?.message === 'string' ? body.message : '';
      return message || err.message;
    }
    if (err instanceof Error) return err.message;
    return fallback;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    await login(email, password);
  };

  const handleRecoveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;

    setRecoveryLoading(true);
    clearRecoveryFeedback();

    try {
      const response = await requestPasswordRecovery(recoveryEmail.trim());
      const maybeToken = response.data?.testToken;
      setRecoveryMessage(
        maybeToken
          ? `Recovery token (test mode): ${maybeToken}`
          : 'If an account exists for that email, recovery instructions have been sent.',
      );
    } catch (err) {
      setRecoveryError(readApiError(err, 'Failed to request password recovery.'));
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleRecoveryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryToken.trim() || !newPassword || !confirmPassword) return;

    clearRecoveryFeedback();

    if (newPassword !== confirmPassword) {
      setRecoveryError('New password and confirm password must match.');
      return;
    }

    setRecoveryLoading(true);
    try {
      const verify = await verifyPasswordRecoveryToken(recoveryToken.trim());
      setVerifiedEmail(verify.data.email);

      await resetPasswordWithRecoveryToken(recoveryToken.trim(), newPassword);
      setRecoveryMessage('Password reset successful. You can now sign in with your new password.');
      setMode('login');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setRecoveryToken('');
    } catch (err) {
      setRecoveryError(readApiError(err, 'Failed to reset password.'));
    } finally {
      setRecoveryLoading(false);
    }
  };

  const backToLogin = () => {
    setMode('login');
    clearRecoveryFeedback();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Admin Console</CardTitle>
            <CardDescription className="mt-1">
              {mode === 'login' && 'Sign in to manage SarkariExams.me'}
              {mode === 'request' && 'Request a password recovery token'}
              {mode === 'reset' && 'Reset password using your recovery token'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {(mode === 'login' || recoveryMessage || recoveryError) && (
            <div className="space-y-2 mb-4">
              {mode === 'login' && error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {recoveryError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{recoveryError}</span>
                </div>
              )}
              {recoveryMessage && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
                  {recoveryMessage}
                </div>
              )}
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@sarkariexams.me"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearError(); clearRecoveryFeedback(); }}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearError(); clearRecoveryFeedback(); }}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !email || !password}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    setMode('request');
                    setRecoveryEmail(email || recoveryEmail);
                    clearRecoveryFeedback();
                  }}
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    setMode('reset');
                    clearRecoveryFeedback();
                  }}
                >
                  Have recovery token?
                </button>
              </div>
            </form>
          )}

          {mode === 'request' && (
            <form onSubmit={handleRecoveryRequest} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="recoveryEmail" className="text-sm font-medium text-foreground">
                  Account Email
                </label>
                <Input
                  id="recoveryEmail"
                  type="email"
                  placeholder="admin@sarkariexams.me"
                  value={recoveryEmail}
                  onChange={e => { setRecoveryEmail(e.target.value); clearRecoveryFeedback(); }}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={recoveryLoading || !recoveryEmail.trim()}>
                {recoveryLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Requesting token...
                  </>
                ) : (
                  'Send recovery instructions'
                )}
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                onClick={backToLogin}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleRecoveryReset} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="recoveryToken" className="text-sm font-medium text-foreground">
                  Recovery Token
                </label>
                <Input
                  id="recoveryToken"
                  type="text"
                  placeholder="Paste token from email"
                  value={recoveryToken}
                  onChange={e => { setRecoveryToken(e.target.value); clearRecoveryFeedback(); }}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-foreground">
                  New Password
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); clearRecoveryFeedback(); }}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm New Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); clearRecoveryFeedback(); }}
                  required
                  autoComplete="new-password"
                />
              </div>
              {verifiedEmail && (
                <p className="text-xs text-muted-foreground">Verified account: {verifiedEmail}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={recoveryLoading || !recoveryToken.trim() || !newPassword || !confirmPassword}
              >
                {recoveryLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting password...
                  </>
                ) : (
                  'Reset password'
                )}
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                onClick={backToLogin}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
