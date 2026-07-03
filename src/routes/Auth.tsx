import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { signIn, signUp } from '../lib/auth/supabaseAuth';
import {
  type RateLimitState,
  getLockRemaining,
  processFailedAttempt,
} from '../lib/utils/rateLimit';

export default function Auth() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateLimit, setRateLimit] = useState<RateLimitState>({
    attempts: 0,
    lockedUntil: null,
  });

  const lockedUntilRef = useRef(rateLimit.lockedUntil);

  // Tick-based lockout countdown: refreshes the UI every second
  useEffect(() => {
    lockedUntilRef.current = rateLimit.lockedUntil;
  }, [rateLimit.lockedUntil]);

  useEffect(() => {
    const remaining = getLockRemaining(lockedUntilRef.current);
    if (remaining <= 0) return;

    const interval = setInterval(() => {
      const now = getLockRemaining(lockedUntilRef.current);
      if (now > 0) {
        setError(t('auth.errorLocked', { seconds: now }));
      } else {
        setError('');
        setRateLimit((prev) => ({ ...prev, lockedUntil: null }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [rateLimit.lockedUntil, t]);

  const lockedOut = getLockRemaining(rateLimit.lockedUntil) > 0;



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check lockout
    const lockRemaining = getLockRemaining(rateLimit.lockedUntil);
    if (lockRemaining > 0) {
      setError(t('auth.errorLocked', { seconds: lockRemaining }));
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      // Reset rate limit on success
      setRateLimit({ attempts: 0, lockedUntil: null });


    } catch (err) {
      const { state, remaining, lockedSeconds } = processFailedAttempt(rateLimit);
      setRateLimit(state);

      if (lockedSeconds > 0) {
        setError(t('auth.errorTooManyAttempts', { seconds: lockedSeconds }));
      } else {
        setError(t('auth.errorInvalidCredentials', { remaining }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-4 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Brand / Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-2xl bg-cyan-500/20 blur-lg" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{t('auth.title')}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {isLogin ? t('auth.signInPrompt') : t('auth.signUpPrompt')}
          </p>
        </div>

        {/* Auth card */}
        <div className="vault-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                {t('auth.emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="vault-input"
                placeholder={t('auth.emailPlaceholder')}
                autoComplete="username"
                required
                autoFocus
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="auth-password" className="block text-sm font-medium text-slate-300">
                {t('auth.passwordLabel')}
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="vault-input"
                placeholder={t('auth.passwordPlaceholder')}
                autoComplete="current-password"
                required
                minLength={6}
              />
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 animate-fade-in" role="alert">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || lockedOut}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('auth.loading')}
                </>
              ) : lockedOut ? (
                t('auth.waiting')
              ) : isLogin ? (
                t('auth.signIn')
              ) : (
                t('auth.signUp')
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-sm text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {isLogin ? t('auth.switchToSignUp') : t('auth.switchToSignIn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
