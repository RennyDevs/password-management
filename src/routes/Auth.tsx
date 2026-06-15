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

  // Per-mode rate limit state (sign-in vs sign-up tracked separately)
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <svg className="mx-auto w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{t('auth.title')}</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {isLogin ? t('auth.signInPrompt') : t('auth.signUpPrompt')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder={t('auth.emailPlaceholder')}
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.passwordLabel')}
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder={t('auth.passwordPlaceholder')}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || lockedOut}
              className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
            >
              {loading
                ? t('auth.loading')
                : lockedOut
                  ? t('auth.waiting')
                  : isLogin
                    ? t('auth.signIn')
                    : t('auth.signUp')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {isLogin ? t('auth.switchToSignUp') : t('auth.switchToSignIn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
