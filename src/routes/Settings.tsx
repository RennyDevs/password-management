import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../lib/auth/UserContext';
import { signOut, signOutGlobal } from '../lib/auth/supabaseAuth';

interface SettingsProps {
  onLogout: () => void;
}

export default function Settings({ onLogout }: SettingsProps) {
  const { t } = useTranslation();
  const user = useUser();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showGlobalSignOutConfirm, setShowGlobalSignOutConfirm] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    onLogout();
  };

  const handleGlobalSignOut = async () => {
    await signOutGlobal();
    onLogout();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('settings.heading')}</h2>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        {/* Account section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">{t('settings.account')}</h3>
          {user ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings.signedInAs', { email: user.email })}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('settings.userId', { id: user.id })}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => setShowSignOutConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  {t('settings.signOut')}
                </button>
                <button
                  onClick={() => setShowGlobalSignOutConfirm(true)}
                  className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors text-sm"
                >
                  {t('settings.signOutGlobal')}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.notSignedIn')}</p>
          )}
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* Security section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">{t('settings.security')}</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>
              <span className="font-medium">{t('settings.encryption')}</span> XChaCha20-Poly1305 via libsodium
            </p>
            <p>
              <span className="font-medium">{t('settings.keyDerivation')}</span> Argon2id (time=3, memory=64MB, parallelism=1)
            </p>
            <p>
              <span className="font-medium">{t('settings.sessionTimeout')}</span> 5 minutes of inactivity
            </p>
            <p>
              <span className="font-medium">{t('settings.protection')}</span> Lock after 5 failed master password attempts
            </p>
            <p className="mt-3 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              {t('settings.masterPasswordWarning')}
            </p>
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* About section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">{t('settings.about')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('settings.aboutDescription')}
          </p>
        </div>
      </div>

      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('settings.signOutConfirmTitle')}</h4>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{t('settings.signOutConfirmMessage')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('settings.cancel')}
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                {t('settings.signOutConfirmButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGlobalSignOutConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('settings.signOutGlobalConfirmTitle')}</h4>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{t('settings.signOutGlobalConfirmMessage')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowGlobalSignOutConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('settings.cancel')}
              </button>
              <button
                onClick={handleGlobalSignOut}
                className="px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors"
              >
                {t('settings.signOutGlobalConfirmButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
