import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePassword, estimateStrength, DEFAULT_LENGTH } from '../lib/utils/passwordGenerator';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface PasswordGeneratorModalProps {
  onSelect: (password: string) => void;
  onCancel: () => void;
}

export default function PasswordGeneratorModal({ onSelect, onCancel }: PasswordGeneratorModalProps) {
  const { t } = useTranslation();
  const [length, setLength] = useState(DEFAULT_LENGTH);
  const [uppercase, setUppercase] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [password, setPassword] = useState(() =>
    generatePassword({ length: DEFAULT_LENGTH, uppercase: true, digits: true, symbols: true }),
  );

  const regenerate = useCallback(() => {
    setPassword(generatePassword({ length, uppercase, digits, symbols }));
  }, [length, uppercase, digits, symbols]);

  const strength = estimateStrength(password);

  const strengthColor = {
    weak: 'bg-red-500',
    fair: 'bg-orange-500',
    good: 'bg-yellow-500',
    strong: 'bg-green-500',
    'very-strong': 'bg-green-600',
  }[strength.label];

  const lengthPresets = [8, 12, 16, 20, 24, 32, 48, 64];
  const focusTrapRef = useFocusTrap(true);

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-generator-title"
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6"
      >
        <h3 id="password-generator-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('passwordGenerator.title')}
        </h3>

        {/* Generated password display */}
        <div className="flex items-stretch gap-2 mb-4">
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 font-mono text-sm text-gray-900 dark:text-white break-all select-all">
            {password}
          </div>
          <button
            type="button"
            onClick={regenerate}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
            title={t('passwordGenerator.regenerate')}
            aria-label={t('passwordGenerator.regenerate')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Strength bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('passwordGenerator.strength')}</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {t(`passwordGenerator.strength${strength.label.charAt(0).toUpperCase() + strength.label.slice(1)}`)} ({strength.bits} bits)
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
              style={{ width: `${(strength.score + 1) * 20}%` }}
            />
          </div>
        </div>

        {/* Length */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('passwordGenerator.length')}: <span className="font-mono">{length}</span>
          </label>
          <div className="flex gap-1.5 mb-2">
            {lengthPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setLength(preset)}
                className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                  length === preset
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={4}
            max={128}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
        </div>

        {/* Options */}
        <div className="mb-6 space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
            {t('passwordGenerator.uppercase')} (A-Z)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={digits}
              onChange={(e) => setDigits(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
            {t('passwordGenerator.digits')} (0-9)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={symbols}
              onChange={(e) => setSymbols(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
            />
            {t('passwordGenerator.symbols')} (!@#$...)
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            {t('passwordGenerator.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onSelect(password)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm"
          >
            {t('passwordGenerator.usePassword')}
          </button>
        </div>
      </div>
    </div>
  );
}
