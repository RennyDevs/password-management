import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from '@supabase/supabase-js';
import UserContext from './lib/auth/UserContext';
import { signOut } from './lib/auth/supabaseAuth';
import { onAuthStateChange } from './lib/auth/supabaseAuth';
import { initSupabase } from './lib/storage/supabase';
import { ensureSodiumReady } from './lib/crypto/sodiumWrapper';
import { SessionTimer, SESSION_TIMEOUT_MS } from './lib/utils/timer';
import { useOnlineSync } from './hooks/useOnlineSync';
import { logger } from './lib/utils/logger';
// Re-export useUser for convenience — other files should import from lib/auth/UserContext
export { useUser } from './lib/auth/UserContext';
import Header from './components/Header';
const Auth = lazy(() => import('./routes/Auth'));
const Home = lazy(() => import('./routes/Home'));
const Settings = lazy(() => import('./routes/Settings'));
const ChangePassword = lazy(() => import('./routes/ChangePassword'));

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type Page = 'home' | 'settings' | 'change-password';

export default function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('home');
  const [initializing, setInitializing] = useState(true);
  const [sodiumReady, setSodiumReady] = useState(false);
  const { isOnline, pendingCount } = useOnlineSync();

  useEffect(() => {
    async function init() {
      // Initialize Supabase
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        logger.error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are required.');
        setInitializing(false);
        return;
      }

      initSupabase(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Initialize libsodium
      try {
        await ensureSodiumReady();
        setSodiumReady(true);
      } catch (err) {
        logger.error('Failed to initialize libsodium', err);
      }

      setInitializing(false);
    }

    init();

    // Listen for auth changes — the initial emission sets the user
    const unsubscribe = onAuthStateChange((newUser) => {
      setUser(newUser);
    });

    return unsubscribe;
  }, []);

  const timerRef = useRef<SessionTimer | null>(null);

  // Activity events to reset the session timer
  const activityEvents = useRef<string[]>([
    'mousedown', 'keydown', 'mousemove', 'touchstart',
    'scroll', 'click', 'wheel'
  ]);

  const handleSessionTimeout = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // ignore errors on forced logout
    }
    setUser(null);
    setPage('home');
  }, []);

  const handleLogout = useCallback(() => {
    timerRef.current?.clear();
    setUser(null);
    setPage('home');
  }, []);

  // Start / stop session timer based on auth state
  useEffect(() => {
    if (user) {
      const timer = new SessionTimer(SESSION_TIMEOUT_MS, handleSessionTimeout);
      timerRef.current = timer;
      timer.start();

      // Reset timer on user activity
      const resetOnActivity = () => timer.reset();
      for (const ev of activityEvents.current) {
        window.addEventListener(ev, resetOnActivity, { passive: true });
      }

      return () => {
        timer.clear();
        timerRef.current = null;
        for (const ev of activityEvents.current) {
          window.removeEventListener(ev, resetOnActivity);
        }
      };
    } else {
      // Not logged in — clear any running timer
      timerRef.current?.clear();
      timerRef.current = null;
    }
  }, [user, handleSessionTimeout]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('app.initializing')}</p>
        </div>
      </div>
    );
  }

  // If no Supabase credentials, show error
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('app.configRequired')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('app.configRequiredText')}
          </p>
          <code className="block text-sm bg-gray-100 dark:bg-gray-700 p-3 rounded text-left">
            VITE_SUPABASE_URL=&lt;your-url&gt;<br />
            VITE_SUPABASE_ANON_KEY=&lt;your-anon-key&gt;
          </code>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <span dangerouslySetInnerHTML={{ __html: t('app.configFileHint') }} />
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, show auth page
  if (!user) {
    return (
      <UserContext.Provider value={null}>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          }
        >
          <Auth />
        </Suspense>
      </UserContext.Provider>
    );
  }

  // Authenticated app
  return (
    <UserContext.Provider value={user}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header onLogout={handleLogout} />

        {!sodiumReady && (
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-300">
              {t('app.cryptoWarning')}
            </div>
          </div>
        )}

        {/* Offline indicator */}
        {!isOnline && (
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M9.172 16.172a4 4 0 015.656 0M7.05 11.05a7 7 0 019.9 0M4.929 6.93a10 10 0 0114.142 0" />
              </svg>
              <span>{t('app.offlineBanner')}</span>
              {pendingCount > 0 && (
                <span className="ml-1">· {t('app.pendingSyncCount', { count: pendingCount })}</span>
              )}
            </div>
          </div>
        )}

        {/* Online-again sync banner (transient) */}
        {isOnline && pendingCount > 0 && (
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{t('app.syncingPending', { count: pendingCount })}</span>
            </div>
          </div>
        )}

        {/* Navigation tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="max-w-4xl mx-auto px-4">
            <nav className="flex gap-6">
              <button
                onClick={() => setPage('home')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${page === 'home'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t('app.navRecords')}
              </button>
              <button
                onClick={() => setPage('change-password')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${page === 'change-password'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                {t('app.navChangePassword')}
              </button>
              <button
                onClick={() => setPage('settings')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${page === 'settings'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t('app.navSettings')}
              </button>
            </nav>
          </div>
        </div>

        {page === 'home' && <Home />}
        {page === 'settings' && <Settings onLogout={handleLogout} />}
        {page === 'change-password' && <ChangePassword />}
      </div>
    </UserContext.Provider>
  );
}
