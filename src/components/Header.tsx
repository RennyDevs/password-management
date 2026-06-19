import { useTranslation } from 'react-i18next';
import i18n from '../lib/i18n/i18n';
import { signOut } from '../lib/auth/supabaseAuth';
import { useUser } from '../lib/auth/UserContext';

interface HeaderProps {
  onLogout: () => void;
}

export default function Header({ onLogout }: HeaderProps) {
  const { t } = useTranslation();
  const user = useUser();

  const handleLogout = async () => {
    await signOut();
    onLogout();
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    void i18n.changeLanguage(e.target.value);
  };

  return (
    <header className="bg-indigo-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h1 className="text-xl font-bold">{t('header.title')}</h1>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-indigo-200 truncate max-w-[150px]">
                {user.email}
              </span>
            )}
            <label className="flex items-center gap-1.5 text-sm">
              <span className="text-indigo-200">{t('header.language')}:</span>
              <select
                value={i18n.language}
                onChange={handleLanguageChange}
                className="bg-indigo-600 border border-indigo-500 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>
            <button
              onClick={handleLogout}
              className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded text-sm transition-colors"
            >
              {t('header.logout')}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
