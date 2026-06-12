import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from '@supabase/supabase-js';
import UserContext from './lib/auth/UserContext';
import { signOut } from './lib/auth/supabaseAuth';
import { onAuthStateChange } from './lib/auth/supabaseAuth';
import { initSupabase } from './lib/storage/supabase';
import { ensureSodiumReady } from './lib/crypto/sodiumWrapper';
import { SessionTimer, SESSION_TIMEOUT_MS } from './lib/utils/timer';
// Re-export useUser for convenience — other files should import from lib/auth/UserContext
export { useUser } from './lib/auth/UserContext';
import Header from './components/Header';
import Auth from './routes/Auth';
import Home from './routes/Home';
import Settings from './routes/Settings';
import ChangePassword from './routes/ChangePassword';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type Page = 'home' | 'settings' | 'change-password';

export default function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('home');
  const [initializing, setInitializing] = useState(true);
  const [sodiumReady, setSodiumReady] = useState(false);

  useEffect(() => {
    async function init() {
      // Initialize Supabase
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error(
          'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are required.'
        );
        setInitializing(false);
        return;
      }

      initSupabase(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Initialize libsodium
      try {
        await ensureSodiumReady();
        setSodiumReady(true);
      } catch (err) {
        console.error('Failed to initialize libsodium:', err);
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
        <Auth onAuthSuccess={() => {/* Auth state change is handled by onAuthStateChange */}} />
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
