import { useState, useEffect } from 'react';
import { getCurrentUser, signOut } from '../lib/auth/supabaseAuth';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
  onLogout: () => void;
}

export default function Header({ onLogout }: HeaderProps) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  const handleLogout = async () => {
    await signOut();
    onLogout();
  };

  return (
    <header className="bg-indigo-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h1 className="text-xl font-bold">Password Manager</h1>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-indigo-200 truncate max-w-[150px]">
                {user.email}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
