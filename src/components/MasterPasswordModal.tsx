import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;

interface MasterPasswordModalProps {
  title: string;
  onSubmit: (password: string) => Promise<boolean>;
  onCancel: () => void;
}

export default function MasterPasswordModal({
  title,
  onSubmit,
  onCancel,
}: MasterPasswordModalProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getLockDelay = useCallback((attemptCount: number): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    return BASE_DELAY_MS * Math.pow(2, attemptCount - MAX_ATTEMPTS);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check lock
    if (lockedUntil && Date.now() < lockedUntil) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(t('masterPasswordModal.lockedMessage', { seconds: remaining }));
      return;
    }
    setLockedUntil(null);

    if (!password.trim()) {
      setError(t('masterPasswordModal.errorPasswordRequired'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await onSubmit(password);
      if (success) {
        setAttempts(0);
        setPassword('');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPassword('');

        if (newAttempts >= MAX_ATTEMPTS) {
          const delay = getLockDelay(newAttempts);
          const until = Date.now() + delay;
          setLockedUntil(until);
          setError(t('masterPasswordModal.errorTooManyAttempts', { seconds: Math.ceil(delay / 1000) }));
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          setError(t('masterPasswordModal.errorInvalidPassword', { remaining }));
        }

        // Focus input after error
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (err) {
      setError(t('masterPasswordModal.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="master-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('masterPasswordModal.masterPasswordLabel')}
            </label>
            <input
              ref={inputRef}
              id="master-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder={t('masterPasswordModal.masterPasswordPlaceholder')}
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              {t('masterPasswordModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? t('masterPasswordModal.verifying') : t('masterPasswordModal.unlock')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
