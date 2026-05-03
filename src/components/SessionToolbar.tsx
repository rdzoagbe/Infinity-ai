import { Languages, LogOut, Moon, Sun } from 'lucide-react';
import type { AppLanguage, UserSession } from './LandingPage';

export type AppTheme = 'dark' | 'light';

interface SessionToolbarProps {
  session: UserSession | null;
  language: AppLanguage;
  theme: AppTheme;
  onLanguageChange: (language: AppLanguage) => void;
  onThemeChange: (theme: AppTheme) => void;
  onLogout: () => void;
}

const languageOptions: Array<{ id: AppLanguage; label: string }> = [
  { id: 'en', label: 'EN' },
  { id: 'fr', label: 'FR' },
  { id: 'es', label: 'ES' },
];

export default function SessionToolbar({ session, language, theme, onLanguageChange, onThemeChange, onLogout }: SessionToolbarProps) {
  if (!session) return null;

  const lightMode = theme === 'light';

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-wrap items-center gap-2 rounded-3xl border border-white/10 bg-black/55 p-2 text-white shadow-panel backdrop-blur-xl">
      <div className="hidden max-w-[12rem] truncate px-3 text-sm text-white/70 md:block">
        {session.name}
      </div>

      <label className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70">
        <Languages className="h-4 w-4 text-cyan" />
        <select
          value={language}
          onChange={(event) => onLanguageChange(event.target.value as AppLanguage)}
          className="bg-transparent text-white outline-none"
          aria-label="Language"
        >
          {languageOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => onThemeChange(lightMode ? 'dark' : 'light')}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-cyan/30 hover:text-cyan"
        aria-label="Toggle light or dark view"
      >
        {lightMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        {lightMode ? 'Dark' : 'Light'}
      </button>

      <button
        type="button"
        onClick={onLogout}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-magenta/30 hover:text-magenta"
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </div>
  );
}
