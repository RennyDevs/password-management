import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../lib/auth/UserContext';
import { getUserFullRecord, saveRecord } from '../lib/storage/repository';
import { fetchRecords } from '../lib/storage/supabase';
import { decryptPayload, encryptPlaintext } from '../lib/crypto';
import { useRecords } from '../hooks/useRecords';
import { useFocusTrap } from '../hooks/useFocusTrap';
import MasterPasswordModal from './MasterPasswordModal';
import type { ExportPayload, ExportRecord } from '../types/record';

interface ExportImportModalProps {
  onClose: () => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

type Step = 'menu' | 'export-password' | 'export-done' | 'import-password' | 'import-done';
type ImportPhase = 'waiting' | 'verifying' | 'processing' | 'done';

const EXPORT_VERSION = 1;

export default function ExportImportModal({ onClose, onToast }: ExportImportModalProps) {
  const { t } = useTranslation();
  const user = useUser();
  const { loadRecords } = useRecords();
  const [step, setStep] = useState<Step>('menu');
  const [importData, setImportData] = useState<ExportPayload | null>(null);
  const [importPhase, setImportPhase] = useState<ImportPhase>('waiting');
  const [importStats, setImportStats] = useState<{ total: number; imported: number; skipped: number }>({
    total: 0,
    imported: 0,
    skipped: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const focusTrapRef = useFocusTrap(step !== 'export-password' && step !== 'import-password');

  // ---- Export ----

  const handleExportStart = () => setStep('export-password');

  const handleExportWithPassword = async (password: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const recordItems = await fetchRecords(user.id);

      const exportRecords: ExportRecord[] = [];
      for (const item of recordItems) {
        const full = await getUserFullRecord(item.id);
        if (full) {
          exportRecords.push({
            id: full.id,
            title: full.title,
            ciphertext: full.ciphertext,
            nonce: full.nonce,
            salt: full.salt,
            alg_version: full.alg_version,
            tags: full.tags ?? [],
            created_at: full.created_at,
            updated_at: full.updated_at,
          });
        }
      }

      // Verify the export is valid by attempting to decrypt one record
      if (exportRecords.length > 0) {
        try {
          await decryptPayload(
            password,
            exportRecords[0].ciphertext,
            exportRecords[0].nonce,
            exportRecords[0].salt,
          );
        } catch {
          return false;
        }
      }

      const payload: ExportPayload = {
        version: EXPORT_VERSION,
        exported_at: new Date().toISOString(),
        records: exportRecords,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `passmgr-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStep('export-done');
      onToast(t('exportImport.exportSuccess', { count: exportRecords.length }), 'success');
    } catch {
      onToast(t('exportImport.exportError'), 'error');
    }

    return true;
  };

  // ---- Import ----

  const handleImportStart = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const payload: ExportPayload = JSON.parse(text);

          if (!payload.version || !Array.isArray(payload.records)) {
            onToast(t('exportImport.importInvalidFormat'), 'error');
            return;
          }
          if (payload.records.length === 0) {
            onToast(t('exportImport.importEmptyFile'), 'error');
            return;
          }

          setImportData(payload);
          setImportPhase('waiting');
          setImportStats({ total: payload.records.length, imported: 0, skipped: 0 });
          setStep('import-password');
        } catch {
          onToast(t('exportImport.importParseError'), 'error');
        }
      };
      reader.onerror = () => {
        onToast(t('exportImport.importReadError'), 'error');
      };
      reader.readAsText(file);
    } catch {
      onToast(t('exportImport.importReadError'), 'error');
    }
  };

  const handleImportWithPassword = async (password: string): Promise<boolean> => {
    if (!importData || !user) return false;

    setImportPhase('verifying');

    try {
      await decryptPayload(
        password,
        importData.records[0].ciphertext,
        importData.records[0].nonce,
        importData.records[0].salt,
      );
    } catch {
      return false;
    }

    setImportPhase('processing');

    let imported = 0;
    let skipped = 0;

    for (const expRecord of importData.records) {
      try {
        const plaintext = await decryptPayload(
          password,
          expRecord.ciphertext,
          expRecord.nonce,
          expRecord.salt,
        );

        const encrypted = await encryptPlaintext(password, plaintext);

        await saveRecord({
          id: crypto.randomUUID?.() || expRecord.id,
          user_id: user.id,
          title: expRecord.title,
          ciphertext: encrypted.ciphertextBase64,
          nonce: encrypted.nonceBase64,
          salt: encrypted.saltBase64,
          alg_version: encrypted.alg_version,
          tags: expRecord.tags ?? [],
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    setImportStats({ total: importData.records.length, imported, skipped });
    setImportPhase('done');
    setStep('import-done');

    await loadRecords(true);

    onToast(t('exportImport.importSuccess', { imported, skipped }), 'success');
    return true;
  };

  // ---- Render ----

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" role="presentation">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-import-title"
          className="relative w-full max-w-md vault-card p-6 animate-scale-in"
        >
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-700/50">
            <h3 id="export-import-title" className="text-base font-semibold text-slate-100">
              {t('exportImport.title')}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {step === 'menu' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                {t('exportImport.description')}
              </p>

              <button
                onClick={handleExportStart}
                className="w-full p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 hover:border-cyan-500/40 hover:from-cyan-500/15 hover:to-cyan-600/10 transition-all text-left flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-sm text-slate-200">{t('exportImport.exportButton')}</div>
                  <div className="text-xs text-slate-500">{t('exportImport.exportDescription')}</div>
                </div>
              </button>

              <button
                onClick={handleImportStart}
                className="w-full p-4 rounded-lg bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/50 transition-all text-left flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-600/40 border border-slate-500/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-sm text-slate-200">{t('exportImport.importButton')}</div>
                  <div className="text-xs text-slate-500">{t('exportImport.importDescription')}</div>
                </div>
              </button>

              <div className="flex justify-end pt-2">
                <button onClick={onClose} className="btn-secondary text-xs">
                  {t('exportImport.close')}
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelected}
                className="hidden"
              />
            </div>
          )}

          {step === 'export-done' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-slate-200 mb-4">{t('exportImport.exportComplete')}</p>
              <button onClick={onClose} className="btn-primary">
                {t('exportImport.close')}
              </button>
            </div>
          )}

          {step === 'import-done' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-slate-200 mb-1">
                {t('exportImport.importComplete')}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                {t('exportImport.importStats', { imported: importStats.imported, skipped: importStats.skipped, total: importStats.total })}
              </p>
              <button onClick={onClose} className="btn-primary">
                {t('exportImport.close')}
              </button>
            </div>
          )}
        </div>
      </div>

      {step === 'export-password' && (
        <MasterPasswordModal
          title={t('exportImport.exportConfirmPassword')}
          onSubmit={handleExportWithPassword}
          onCancel={() => setStep('menu')}
        />
      )}

      {step === 'import-password' && (
        <MasterPasswordModal
          title={t('exportImport.importConfirmPassword')}
          onSubmit={handleImportWithPassword}
          onCancel={() => setStep('menu')}
          customLoading={
            importPhase === 'verifying'
              ? t('exportImport.verifyingPassword')
              : importPhase === 'processing'
              ? t('exportImport.processingRecords')
              : undefined
          }
        />
      )}
    </>
  );
}
