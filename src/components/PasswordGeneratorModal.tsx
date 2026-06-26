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
    'very-strong': 'bg-emerald-500',
  }[strength.label];

  const lengthPresets = [8, 12, 16, 20, 24, 32, 48, 64];
  const focusTrapRef = useFocusTrap(true);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in" role="presentation">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-generator-title"
        className="relative w-full max-w-md vault-card p-6 animate-scale-in"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-700/50">
          <h3 id="password-generator-title" className="text-base font-semibold text-slate-100">
            {t('passwordGenerator.title')}
          </h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Generated password display */}
        <div className="flex items-stretch gap-2 mb-4">
          <div className="flex-1 bg-slate-800 border border-slate-600/50 rounded-lg px-3 py-2.5 font-mono text-sm text-slate-100 break-all select-all">
            {password}
          </div>
          <button
            type="button"
            onClick={regenerate}
            className="px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/30 hover:bg-slate-700 hover:border-slate-500/50 transition-all text-slate-300 flex-shrink-0"
            title={t('passwordGenerator.regenerate')}
            aria-label={t('passwordGenerator.regenerate')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>

        {/* Strength bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-400">{t('passwordGenerator.strength')}</span>
            <span className="text-xs font-medium text-slate-300">
              {t(`passwordGenerator.strength${strength.label.charAt(0).toUpperCase() + strength.label.slice(1)}`)} ({strength.bits} bits)
            </span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
              style={{ width: `${(strength.score + 1) * 20}%` }}
            />
          </div>
        </div>

        {/* Length */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            {t('passwordGenerator.length')}: <span className="font-mono">{length}</span>
          </label>
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {lengthPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setLength(preset)}
                className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                  length === preset
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-700/50 border-slate-600/30 text-slate-400 hover:bg-slate-700 hover:border-slate-500/50'
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
            className="w-full accent-cyan-500"
          />
        </div>

        {/* Options */}
        <div className="mb-6 space-y-2.5">
          <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer group">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
              className="rounded border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0"
            />
            <span className="group-hover:text-slate-200">{t('passwordGenerator.uppercase')} (A-Z)</span>
          </label>
          <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer group">
            <input
              type="checkbox"
              checked={digits}
              onChange={(e) => setDigits(e.target.checked)}
              className="rounded border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0"
            />
            <span className="group-hover:text-slate-200">{t('passwordGenerator.digits')} (0-9)</span>
          </label>
          <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer group">
            <input
              type="checkbox"
              checked={symbols}
              onChange={(e) => setSymbols(e.target.checked)}
              className="rounded border-slate-500 bg-slate-700 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0"
            />
            <span className="group-hover:text-slate-200">{t('passwordGenerator.symbols')} (!@#$...)</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
          <button type="button" onClick={onCancel} className="btn-secondary text-xs">
            {t('passwordGenerator.cancel')}
          </button>
          <button type="button" onClick={() => onSelect(password)} className="btn-primary">
            {t('passwordGenerator.usePassword')}
          </button>
        </div>
      </div>
    </div>
  );
}
