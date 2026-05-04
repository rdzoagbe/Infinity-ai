import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Globe2,
  Languages,
  LockKeyhole,
  Mic2,
  Music2,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';

export type AppLanguage = 'en' | 'fr' | 'es';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface LandingPageProps {
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
  onLogin: (session: UserSession) => void;
}

const languageOptions: Array<{ id: AppLanguage; label: string; native: string }> = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'fr', label: 'French', native: 'Français' },
  { id: 'es', label: 'Spanish', native: 'Español' },
];

const copy = {
  en: {
    badge: 'Private AI music studio',
    title: 'Create a complete song from lyrics, voice, beat, and stems.',
    subtitle:
      'AudioMagic gives each user a private studio session: landing page, login, project dashboard, full song builder, producer tools, mix room, and release workflow.',
    start: 'Start private session',
    loginTitle: 'Log in to your studio',
    loginSubtitle: 'Your projects are stored under your private browser session for this MVP.',
    name: 'Artist or user name',
    email: 'Email address',
    password: 'Password',
    passwordHint: 'Demo login only. Backend auth can be connected next.',
    enter: 'Enter studio',
    demo: 'Use demo session',
    language: 'Language',
    private: 'Private user session',
    privateText: 'Each login loads its own project list and workspace data.',
    fullSong: 'Full song builder',
    fullSongText: 'Paste lyrics and generate a 2:50 or 3:00 structure.',
    workflow: 'Studio workflow',
    workflowText: 'Move from writing to producer, mix, master, and release.',
    required: 'Enter at least an email to start your private session.',
  },
  fr: {
    badge: 'Studio musical IA privé',
    title: 'Créez une chanson complète à partir de paroles, voix, beat et stems.',
    subtitle:
      'AudioMagic donne à chaque utilisateur une session privée : landing page, connexion, tableau de bord, full song builder, outils producer, mix room et workflow release.',
    start: 'Démarrer une session privée',
    loginTitle: 'Connexion au studio',
    loginSubtitle: 'Dans ce MVP, vos projets sont stockés dans votre session navigateur privée.',
    name: 'Nom artiste ou utilisateur',
    email: 'Adresse email',
    password: 'Mot de passe',
    passwordHint: 'Connexion démo uniquement. Une vraie authentification backend peut être ajoutée ensuite.',
    enter: 'Entrer dans le studio',
    demo: 'Utiliser la session démo',
    language: 'Langue',
    private: 'Session utilisateur privée',
    privateText: 'Chaque connexion charge sa propre liste de projets et ses données de workspace.',
    fullSong: 'Full song builder',
    fullSongText: 'Collez des paroles et générez une structure 2:50 ou 3:00.',
    workflow: 'Workflow studio',
    workflowText: 'Passez de l’écriture au producer, mix, master et release.',
    required: 'Entrez au moins un email pour démarrer votre session privée.',
  },
  es: {
    badge: 'Estudio musical IA privado',
    title: 'Crea una canción completa desde letra, voz, beat y stems.',
    subtitle:
      'AudioMagic da a cada usuario una sesión privada: landing page, login, dashboard, full song builder, herramientas de producción, mezcla y lanzamiento.',
    start: 'Iniciar sesión privada',
    loginTitle: 'Entrar al estudio',
    loginSubtitle: 'En este MVP, tus proyectos se guardan en tu sesión privada del navegador.',
    name: 'Nombre artístico o usuario',
    email: 'Correo electrónico',
    password: 'Contraseña',
    passwordHint: 'Login demo solamente. La autenticación backend puede conectarse después.',
    enter: 'Entrar al estudio',
    demo: 'Usar sesión demo',
    language: 'Idioma',
    private: 'Sesión privada de usuario',
    privateText: 'Cada login carga su propia lista de proyectos y datos de workspace.',
    fullSong: 'Constructor de canción completa',
    fullSongText: 'Pega letras y genera una estructura de 2:50 o 3:00.',
    workflow: 'Flujo de estudio',
    workflowText: 'Avanza de escritura a producción, mezcla, master y lanzamiento.',
    required: 'Introduce al menos un correo para iniciar tu sesión privada.',
  },
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const makeSessionId = (email: string) => `user-${normalizeEmail(email).replace(/[^a-z0-9]+/g, '-') || Date.now()}`;

export default function LandingPage({ language, onLanguageChange, onLogin }: LandingPageProps) {
  const t = copy[language];
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const activeLanguage = useMemo(() => languageOptions.find((item) => item.id === language) ?? languageOptions[0], [language]);

  const submitLogin = (demo = false) => {
    const nextEmail = demo ? 'demo@audiomagic.ai' : normalizeEmail(email);
    if (!nextEmail) {
      setError(t.required);
      return;
    }

    onLogin({
      id: makeSessionId(nextEmail),
      name: demo ? 'Demo Artist' : name.trim() || nextEmail.split('@')[0] || 'Artist',
      email: nextEmail,
      createdAt: new Date().toISOString(),
    });
  };

  const features = [
    { title: t.private, helper: t.privateText, icon: ShieldCheck },
    { title: t.fullSong, helper: t.fullSongText, icon: WandSparkles },
    { title: t.workflow, helper: t.workflowText, icon: Music2 },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-midnight px-4 py-6 text-white md:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="relative rounded-[2.5rem] border border-white/5 bg-glass/80 p-6 shadow-panel backdrop-blur-xl md:p-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-cyan/15 blur-3xl" />
          <div className="absolute -bottom-24 right-10 h-80 w-80 rounded-full bg-magenta/15 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan text-black shadow-cyan">
                  <Mic2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold">AudioMagic.ai</p>
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan/70">Studio OS</p>
                </div>
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-white/5 bg-black/25 px-3 py-2 text-sm text-white/55">
                <Languages className="h-4 w-4 text-cyan" />
                <span className="sr-only">{t.language}</span>
                <select
                  value={language}
                  onChange={(event) => onLanguageChange(event.target.value as AppLanguage)}
                  className="bg-transparent text-white outline-none"
                >
                  {languageOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.native}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-16 inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.26em] text-cyan">
              <Sparkles className="h-3.5 w-3.5" /> {t.badge}
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[0.95] tracking-tight md:text-6xl">{t.title}</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/55">{t.subtitle}</p>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="rounded-3xl border border-white/5 bg-black/25 p-5"
                >
                  <feature.icon className="h-6 w-6 text-cyan" />
                  <p className="mt-4 font-semibold">{feature.title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/45">{feature.helper}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-cyan/10 bg-black/35 p-5 shadow-panel backdrop-blur-xl md:p-7">
          <div className="rounded-[2rem] border border-white/5 bg-white/[0.03] p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-magenta">{t.start}</p>
                <h2 className="mt-3 text-3xl font-semibold">{t.loginTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-white/45">{t.loginSubtitle}</p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan/20 bg-cyan/10 text-cyan">
                <LockKeyhole className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm text-white/55">
                {t.name}
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="rounded-2xl border border-white/5 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-cyan/35"
                  placeholder="Roland"
                />
              </label>
              <label className="grid gap-2 text-sm text-white/55">
                {t.email}
                <input
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setError(''); }}
                  type="email"
                  className="rounded-2xl border border-white/5 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-cyan/35"
                  placeholder="artist@example.com"
                />
              </label>
              <label className="grid gap-2 text-sm text-white/55">
                {t.password}
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="rounded-2xl border border-white/5 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-cyan/35"
                  placeholder="••••••••"
                />
                <span className="text-xs text-white/35">{t.passwordHint}</span>
              </label>
            </div>

            {error && <p className="mt-4 rounded-2xl border border-magenta/20 bg-magenta/10 px-4 py-3 text-sm text-magenta">{error}</p>}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => submitLogin(false)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan px-5 py-3 font-semibold text-black shadow-cyan transition hover:scale-[1.01]"
              >
                {t.enter} <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => submitLogin(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white/70 transition hover:border-cyan/30 hover:text-cyan"
              >
                <BadgeCheck className="h-4 w-4" /> {t.demo}
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-[2rem] border border-white/5 bg-white/[0.03] p-4 text-sm text-white/45">
            <span className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-cyan" /> {t.language}</span>
            <span className="font-semibold text-white/70">{activeLanguage.label}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
