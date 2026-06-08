import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ChangePassword() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Password strength check
  const getStrength = (pw: string): { label: string; color: string; width: string } => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    if (pw.length >= 16) score++;

    if (score <= 2) return { label: t('changePassword.strengthWeak'), color: 'bg-red-500', width: 'w-1/4' };
    if (score <= 4) return { label: t('changePassword.strengthFair'), color: 'bg-yellow-500', width: 'w-2/4' };
    if (score <= 5) return { label: t('changePassword.strengthGood'), color: 'bg-blue-500', width: 'w-3/4' };
    return { label: t('changePassword.strengthStrong'), color: 'bg-green-500', width: 'w-full' };
  };

  const strength = newPassword ? getStrength(newPassword) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('changePassword.errorAllFieldsRequired'));
      return;
    }

    if (newPassword.length < 8) {
      setError(t('changePassword.errorMinLength'));
      return;
    }

    if (newPassword === currentPassword) {
      setError(t('changePassword.errorMustDiffer'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('changePassword.errorMismatch'));
      return;
    }

    setSubmitting(true);

    // Simulate API call — in production this would call your auth backend
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // For now, this is a UI placeholder. Backend integration to follow.
    setSubmitting(false);
    setSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const inputClass =
    'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-sm';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('changePassword.heading')}</h2>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('changePassword.currentPasswordLabel')}
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('changePassword.currentPasswordPlaceholder')}
                className={inputClass + ' pr-10'}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-sm"
                tabIndex={-1}
              >
                {showCurrent ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('changePassword.newPasswordLabel')}
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('changePassword.newPasswordPlaceholder')}
                className={inputClass + ' pr-10'}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-sm"
                tabIndex={-1}
              >
                {showNew ? '🙈' : '👁️'}
              </button>
            </div>
            {/* Strength meter */}
            {strength && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                  <span className={`text-xs font-medium ${
                    strength.label === 'Strong'
                      ? 'text-green-600 dark:text-green-400'
                      : strength.label === 'Good'
                      ? 'text-blue-600 dark:text-blue-400'
                      : strength.label === 'Fair'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {strength.label}
                  </span>
                </div>
              </div>
            )}
            {/* Password requirements hint */}
            {newPassword && (
              <ul className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <li className={newPassword.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}>
                  {newPassword.length >= 8 ? '✓' : '○'} {t('changePassword.requirementChars')}
                </li>
                <li className={/[A-Z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                  {/[A-Z]/.test(newPassword) ? '✓' : '○'} {t('changePassword.requirementUppercase')}
                </li>
                <li className={/\d/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                  {/\d/.test(newPassword) ? '✓' : '○'} {t('changePassword.requirementNumber')}
                </li>
                <li className={/[^a-zA-Z0-9]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : ''}>
                  {/[^a-zA-Z0-9]/.test(newPassword) ? '✓' : '○'} {t('changePassword.requirementSpecial')}
                </li>
              </ul>
            )}
          </div>

          {/* Confirm new password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('changePassword.confirmNewPasswordLabel')}
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('changePassword.confirmNewPasswordPlaceholder')}
                className={inputClass + ' pr-10'}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-sm"
                tabIndex={-1}
              >
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
            {/* Match indicator */}
            {confirmPassword && (
              <p className={`mt-1 text-xs ${
                newPassword === confirmPassword
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {newPassword === confirmPassword ? t('changePassword.passwordsMatch') : t('changePassword.passwordsDoNotMatch')}
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-300">
              {t('changePassword.successMessage')}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            {submitting && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {submitting ? t('changePassword.submittingButton') : t('changePassword.submitButton')}
          </button>
        </form>
      </div>

      {/* Security warning */}
      <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-700 dark:text-amber-300">
        <p className="font-medium mb-1">{t('changePassword.securityNotice')}</p>
        <ul className="space-y-1">
          <li>{t('changePassword.warningStrongPassword')}</li>
          <li>{t('changePassword.warningSessionInvalidation')}</li>
          <li>{t('changePassword.warningLostPassword')}</li>
        </ul>
      </div>
    </div>
  );
}
