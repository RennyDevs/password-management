import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../lib/auth/UserContext';
import { signOut, signOutGlobal } from '../lib/auth/supabaseAuth';
import ExportImportModal from '../components/ExportImportModal';
import ToastContainer from '../components/ui/Toast';
import type { ToastMessage } from '../components/ui/types';
import Modal from '../components/ui/Modal';

interface SettingsProps {
  onLogout: () => void;
}

let toastId = 0;

export default function Settings({ onLogout }: SettingsProps) {
  const { t } = useTranslation();
  const user = useUser();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showGlobalSignOutConfirm, setShowGlobalSignOutConfirm] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'success' | 'error' | 'info') => {
    const id = String(++toastId);
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const handleSignOut = async () => {
    await signOut();
    onLogout();
  };

  const handleGlobalSignOut = async () => {
    await signOutGlobal();
    onLogout();
  };

  const handleEscape = useCallback(() => {
    if (showSignOutConfirm) setShowSignOutConfirm(false);
    if (showGlobalSignOutConfirm) setShowGlobalSignOutConfirm(false);
  }, [showSignOutConfirm, showGlobalSignOutConfirm]);

  useEffect(() => {
    if (!showSignOutConfirm && !showGlobalSignOutConfirm) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleEscape();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showSignOutConfirm, showGlobalSignOutConfirm, handleEscape]);

  const sectionClass = 'space-y-4';
  const sectionTitleClass = 'text-base font-semibold text-slate-100';

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-xl font-bold text-slate-100 tracking-tight mb-6">{t('settings.heading')}</h2>

      <div className="space-y-4">
        {/* Account section */}
        <div className="vault-card p-5 sm:p-6">
          <h3 className={sectionTitleClass}>{t('settings.account')}</h3>
          <div className={sectionClass}>
            {user ? (
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-600/20">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">{user.email}</p>
                    <p className="text-xs text-slate-500 truncate">{t('settings.signedInAs', { email: '' })}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setShowSignOutConfirm(true)} className="btn-danger text-xs">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    {t('settings.signOut')}
                  </button>
                  <button onClick={() => setShowGlobalSignOutConfirm(true)} className="btn-secondary text-xs">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                    </svg>
                    {t('settings.signOutGlobal')}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">{t('settings.notSignedIn')}</p>
            )}
          </div>
        </div>

        {/* Data section */}
        <div className="vault-card p-5 sm:p-6">
          <h3 className={sectionTitleClass}>{t('settings.data')}</h3>
          <div className={sectionClass}>
            <p className="text-sm text-slate-400">{t('settings.dataDescription')}</p>
            <button onClick={() => setShowExportImport(true)} className="btn-primary text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {t('settings.exportImport')}
            </button>
          </div>
        </div>

        {/* Security section */}
        <div className="vault-card p-5 sm:p-6">
          <h3 className={sectionTitleClass}>{t('settings.security')}</h3>
          <div className={sectionClass}>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/20">
                <p className="text-xs text-slate-500 mb-0.5">{t('settings.encryption')}</p>
                <p className="text-sm text-slate-200 font-mono text-xs">XChaCha20-Poly1305</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/20">
                <p className="text-xs text-slate-500 mb-0.5">{t('settings.keyDerivation')}</p>
                <p className="text-sm text-slate-200 font-mono text-xs">Argon2id</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/20">
                <p className="text-xs text-slate-500 mb-0.5">{t('settings.sessionTimeout')}</p>
                <p className="text-sm text-slate-200">5 min</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/20">
                <p className="text-xs text-slate-500 mb-0.5">{t('settings.protection')}</p>
                <p className="text-sm text-slate-200">5 attempts</p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs text-amber-300/80">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>{t('settings.masterPasswordWarning')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* About section */}
        <div className="vault-card p-5 sm:p-6">
          <h3 className={sectionTitleClass}>{t('settings.about')}</h3>
          <div className={sectionClass}>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t('settings.aboutDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Sign Out Confirm Modal */}
      {showSignOutConfirm && (
        <Modal
          title={t('settings.signOutConfirmTitle')}
          onClose={() => setShowSignOutConfirm(false)}
          size="sm"
          footer={
            <>
              <button onClick={() => setShowSignOutConfirm(false)} className="btn-secondary text-xs">
                {t('settings.cancel')}
              </button>
              <button onClick={handleSignOut} className="btn-danger text-xs">
                {t('settings.signOutConfirmButton')}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-300">{t('settings.signOutConfirmMessage')}</p>
        </Modal>
      )}

      {/* Global Sign Out Confirm Modal */}
      {showGlobalSignOutConfirm && (
        <Modal
          title={t('settings.signOutGlobalConfirmTitle')}
          onClose={() => setShowGlobalSignOutConfirm(false)}
          size="sm"
          footer={
            <>
              <button onClick={() => setShowGlobalSignOutConfirm(false)} className="btn-secondary text-xs">
                {t('settings.cancel')}
              </button>
              <button onClick={handleGlobalSignOut} className="btn-danger text-xs">
                {t('settings.signOutGlobalConfirmButton')}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-300">{t('settings.signOutGlobalConfirmMessage')}</p>
        </Modal>
      )}

      {showExportImport && (
        <ExportImportModal
          onClose={() => setShowExportImport(false)}
          onToast={addToast}
        />
      )}

      <ToastContainer messages={toasts} onDismiss={dismissToast} />
    </div>
  );
}
