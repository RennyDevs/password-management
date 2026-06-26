import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { updatePassword } from '../lib/auth/supabaseAuth';

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

  const strengthLabelColor = {
    [t('changePassword.strengthWeak')]: 'text-red-400',
    [t('changePassword.strengthFair')]: 'text-yellow-400',
    [t('changePassword.strengthGood')]: 'text-blue-400',
    [t('changePassword.strengthStrong')]: 'text-green-400',
  };

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

    try {
      await updatePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      let message = t('changePassword.errorGeneric');
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes('invalid login credentials')) {
          message = t('changePassword.errorInvalidCurrentPassword');
        } else if (msg.includes('recent authentication') || msg.includes('reauthenticate')) {
          message = t('changePassword.errorStaleSession');
        } else {
          message = err.message;
        }
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  function PasswordInput({ 
    value, 
    onChange, 
    label, 
    placeholder, 
    show, 
    onToggleShow,
    autoComplete 
  }: {
    value: string;
    onChange: (v: string) => void;
    label: string;
    placeholder: string;
    show: boolean;
    onToggleShow: () => void;
    autoComplete: string;
  }) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-300">{label}</label>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="vault-input pr-10"
            autoComplete={autoComplete}
          />
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
            tabIndex={-1}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-xl font-bold text-slate-100 tracking-tight mb-6">{t('changePassword.heading')}</h2>

      <div className="space-y-4">
        {/* Form card */}
        <div className="vault-card p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Current password */}
            <PasswordInput
              value={currentPassword}
              onChange={setCurrentPassword}
              label={t('changePassword.currentPasswordLabel')}
              placeholder={t('changePassword.currentPasswordPlaceholder')}
              show={showCurrent}
              onToggleShow={() => setShowCurrent(!showCurrent)}
              autoComplete="current-password"
            />

            {/* New password */}
            <div className="space-y-3">
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                label={t('changePassword.newPasswordLabel')}
                placeholder={t('changePassword.newPasswordPlaceholder')}
                show={showNew}
                onToggleShow={() => setShowNew(!showNew)}
                autoComplete="new-password"
              />

              {/* Strength meter */}
              {strength && (
                <div className="animate-slide-up">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                    </div>
                    <span className={`text-xs font-medium ${strengthLabelColor[strength.label] || 'text-slate-400'}`}>
                      {strength.label}
                    </span>
                  </div>
                </div>
              )}

              {/* Password requirements */}
              {newPassword && (
                <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/20 animate-slide-up">
                  <ul className="space-y-1 text-xs">
                    <li className={newPassword.length >= 8 ? 'text-emerald-400' : 'text-slate-500'}>
                      <span className="mr-1">{newPassword.length >= 8 ? '✓' : '○'}</span>
                      {t('changePassword.requirementChars')}
                    </li>
                    <li className={/[A-Z]/.test(newPassword) ? 'text-emerald-400' : 'text-slate-500'}>
                      <span className="mr-1">{/[A-Z]/.test(newPassword) ? '✓' : '○'}</span>
                      {t('changePassword.requirementUppercase')}
                    </li>
                    <li className={/\d/.test(newPassword) ? 'text-emerald-400' : 'text-slate-500'}>
                      <span className="mr-1">{/\d/.test(newPassword) ? '✓' : '○'}</span>
                      {t('changePassword.requirementNumber')}
                    </li>
                    <li className={/[^a-zA-Z0-9]/.test(newPassword) ? 'text-emerald-400' : 'text-slate-500'}>
                      <span className="mr-1">{/[^a-zA-Z0-9]/.test(newPassword) ? '✓' : '○'}</span>
                      {t('changePassword.requirementSpecial')}
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm new password */}
            <div>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                label={t('changePassword.confirmNewPasswordLabel')}
                placeholder={t('changePassword.confirmNewPasswordPlaceholder')}
                show={showConfirm}
                onToggleShow={() => setShowConfirm(!showConfirm)}
                autoComplete="new-password"
              />
              {confirmPassword && (
                <p className={`mt-1.5 text-xs ${
                  newPassword === confirmPassword
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }`}>
                  {newPassword === confirmPassword ? t('changePassword.passwordsMatch') : t('changePassword.passwordsDoNotMatch')}
                </p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 animate-fade-in">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 animate-fade-in">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t('changePassword.successMessage')}</span>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
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
        <div className="vault-card p-5 sm:p-6 border-amber-500/15">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-300 mb-2">{t('changePassword.securityNotice')}</p>
              <ul className="space-y-1 text-xs text-amber-300/70">
                <li>{t('changePassword.warningStrongPassword')}</li>
                <li>{t('changePassword.warningSessionInvalidation')}</li>
                <li>{t('changePassword.warningLostPassword')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
