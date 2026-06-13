import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../lib/auth/UserContext';
import { getUserFullRecord, saveRecord } from '../lib/storage/repository';
import { fetchRecords } from '../lib/storage/supabase';
import { decryptPayload, encryptPlaintext } from '../lib/crypto';
import { useRecords } from '../hooks/useRecords';
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

  // ---- Export ----

  const handleExportStart = () => setStep('export-password');

  const handleExportWithPassword = async (password: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Fetch all record IDs for this user
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
          // Password is wrong — signal failure
          return false;
        }
      }

      const payload: ExportPayload = {
        version: EXPORT_VERSION,
        exported_at: new Date().toISOString(),
        records: exportRecords,
      };

      // Trigger download
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

    // Reset input so re-selecting same file works
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

    // Verify password against the first record
    try {
      await decryptPayload(
        password,
        importData.records[0].ciphertext,
        importData.records[0].nonce,
        importData.records[0].salt,
      );
    } catch {
      return false; // Wrong password
    }

    setImportPhase('processing');

    let imported = 0;
    let skipped = 0;

    for (const expRecord of importData.records) {
      try {
        // Decrypt with the user's master password
        const plaintext = await decryptPayload(
          password,
          expRecord.ciphertext,
          expRecord.nonce,
          expRecord.salt,
        );

        // Re-encrypt with the same password (it's the user's master password)
        const encrypted = await encryptPlaintext(password, plaintext);

        // Save to user's account
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

    // Refresh the record list
    await loadRecords(true);

    onToast(t('exportImport.importSuccess', { imported, skipped }), 'success');
    return true;
  };

  // ---- Render ----

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('exportImport.title')}
          </h3>

          {step === 'menu' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('exportImport.description')}
              </p>

              <button
                onClick={handleExportStart}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-left flex items-center gap-3"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <div className="font-medium text-sm">{t('exportImport.exportButton')}</div>
                  <div className="text-xs text-indigo-200">{t('exportImport.exportDescription')}</div>
                </div>
              </button>

              <button
                onClick={handleImportStart}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left flex items-center gap-3"
              >
                <svg className="w-5 h-5 flex-shrink-0 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div>
                  <div className="font-medium text-sm text-gray-900 dark:text-white">{t('exportImport.importButton')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('exportImport.importDescription')}</div>
                </div>
              </button>

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                >
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
              <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-700 dark:text-gray-300 mb-4">{t('exportImport.exportComplete')}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                {t('exportImport.close')}
              </button>
            </div>
          )}

          {step === 'import-done' && (
            <div className="text-center py-4">
              <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-700 dark:text-gray-300 mb-1">
                {t('exportImport.importComplete')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('exportImport.importStats', { imported: importStats.imported, skipped: importStats.skipped, total: importStats.total })}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                {t('exportImport.close')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Export password prompt */}
      {step === 'export-password' && (
        <MasterPasswordModal
          title={t('exportImport.exportConfirmPassword')}
          onSubmit={handleExportWithPassword}
          onCancel={() => setStep('menu')}
        />
      )}

      {/* Import password prompt */}
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
