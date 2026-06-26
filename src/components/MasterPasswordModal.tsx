import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../hooks/useFocusTrap';

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;

interface MasterPasswordModalProps {
  title: string;
  /** Return true on success, false if the password is wrong, or throw an Error for technical issues. */
  onSubmit: (password: string) => Promise<boolean>;
  onCancel: () => void;
  /** Override the default "Verifying..." loading text. */
  customLoading?: string;
}

export default function MasterPasswordModal({
  title,
  onSubmit,
  onCancel,
  customLoading,
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
        // Password was wrong — apply rate limit
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
      // Technical error (network, crypto, etc.) — do NOT count as a password attempt
      const message = err instanceof Error ? err.message : t('masterPasswordModal.errorGeneric');
      setError(message);
      setPassword('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const focusTrapRef = useFocusTrap(true);
  const titleId = 'master-password-modal-title';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" role="presentation">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm vault-card p-6 animate-scale-in"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-700/50">
          <h2 id={titleId} className="text-base font-semibold text-slate-100">{title}</h2>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
            aria-label="Close"
            disabled={loading}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="master-password" className="block text-sm font-medium text-slate-300 mb-1.5">
              {t('masterPasswordModal.masterPasswordLabel')}
            </label>
            <input
              ref={inputRef}
              id="master-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="vault-input"
              placeholder={t('masterPasswordModal.masterPasswordPlaceholder')}
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 animate-fade-in" role="alert">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary text-xs"
              disabled={loading}
            >
              {t('masterPasswordModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {customLoading ?? t('masterPasswordModal.verifying')}
                </>
              ) : t('masterPasswordModal.unlock')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
