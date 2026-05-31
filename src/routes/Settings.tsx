import { useState } from 'react';
import { useUser } from '../App';
import { signOut } from '../lib/auth/supabaseAuth';

interface SettingsProps {
  onLogout: () => void;
}

export default function Settings({ onLogout }: SettingsProps) {
  const user = useUser();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    onLogout();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h2>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        {/* Account section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Account</h3>
          {user ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Signed in as: <span className="font-medium text-gray-900 dark:text-white">{user.email}</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                User ID: <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">{user.id}</code>
              </p>
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Not signed in.</p>
          )}
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* Security section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Security</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>
              <span className="font-medium">Encryption:</span> XChaCha20-Poly1305 via libsodium
            </p>
            <p>
              <span className="font-medium">Key Derivation:</span> Argon2id (time=3, memory=64MB, parallelism=1)
            </p>
            <p>
              <span className="font-medium">Session Timeout:</span> 5 minutes of inactivity
            </p>
            <p>
              <span className="font-medium">Protection:</span> Lock after 5 failed master password attempts
            </p>
            <p className="mt-3 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              ⚠️ Your master password cannot be recovered. If you lose it, all your data will be permanently inaccessible.
            </p>
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* About section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">About</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Password Manager v1.0 — E2EE password management with client-side encryption.
            Your secrets are encrypted before they leave your device.
          </p>
        </div>
      </div>

      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Sign Out</h4>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to sign out?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
