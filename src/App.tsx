import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from '@supabase/supabase-js';
import UserContext from './lib/auth/UserContext';
import { signOut } from './lib/auth/supabaseAuth';
import { onAuthStateChange } from './lib/auth/supabaseAuth';
import { initSupabase } from './lib/storage/supabase';
import { ensureSodiumReady } from './lib/crypto/sodiumWrapper';
import { SessionTimer, SESSION_TIMEOUT_MS } from './lib/utils/timer';
import { logger } from './lib/utils/logger';
// Re-export useUser for convenience — other files should import from lib/auth/UserContext
export { useUser } from './lib/auth/UserContext';
import AppShell from './components/ui/AppShell';
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
        <div className="text-center">
          <div className="relative mx-auto w-12 h-12">
            <div className="absolute inset-0 rounded-xl bg-cyan-500/20 blur-md animate-pulse" />
            <svg className="relative w-12 h-12 text-cyan-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="mt-4 text-slate-400 text-sm animate-pulse">{t('app.initializing')}</p>
        </div>
      </div>
    );
  }

  // If no Supabase credentials, show error
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-4">
        <div className="vault-card p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-100 mb-3">{t('app.configRequired')}</h1>
          <p className="text-sm text-slate-400 mb-4">
            {t('app.configRequiredText')}
          </p>
          <code className="block text-xs bg-slate-800 border border-slate-600/30 p-3 rounded-lg text-left text-slate-300">
            VITE_SUPABASE_URL=&lt;your-url&gt;<br />
            VITE_SUPABASE_ANON_KEY=&lt;your-anon-key&gt;
          </code>
          <p className="mt-4 text-xs text-slate-500">
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
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
      <AppShell
        page={page}
        onNavigate={setPage}
        onLogout={handleLogout}
        sodiumReady={sodiumReady}
      >
        {page === 'home' && <Home />}
        {page === 'settings' && <Settings onLogout={handleLogout} />}
        {page === 'change-password' && <ChangePassword />}
      </AppShell>
    </UserContext.Provider>
  );
}
