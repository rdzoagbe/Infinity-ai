export type LanguageCode = 'en' | 'fr';

export const languages: Array<{ code: LanguageCode; label: string; short: string }> = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fr', label: 'Français', short: 'FR' },
];

export const copy = {
  en: {
    landing: {
      eyebrow: 'AI music studio for creators',
      title: 'Turn lyrics, voice ideas, and beats into complete song sessions.',
      subtitle:
        'AudioMagic.ai gives every creator a private workspace to write, produce, arrange, mix, and prepare songs for release.',
      primaryCta: 'Start private session',
      secondaryCta: 'Log in',
      loginCta: 'Open studio',
      features: [
        ['Lyrics to full song', 'Build a 2:50 or 3:00 song blueprint from written lyrics.'],
        ['Private user sessions', 'Each login opens an isolated local studio workspace.'],
        ['Creator tools', 'MixSplit, beat sequencing, vocal chains, stems, approvals, and export flow.'],
      ],
      steps: ['Write or paste lyrics', 'Generate the song plan', 'Produce, record, mix, and release'],
    },
    login: {
      eyebrow: 'Private access',
      title: 'Log in to your AudioMagic workspace.',
      subtitle: 'Your projects are kept in a separate browser session for the email you use here.',
      name: 'Artist / creator name',
      email: 'Email address',
      password: 'Password',
      passwordHint: 'MVP local session only. Backend authentication comes next.',
      submit: 'Enter private studio',
      back: 'Back to landing',
    },
    selector: 'Language',
  },
  fr: {
    landing: {
      eyebrow: 'Studio musical IA pour créateurs',
      title: 'Transformez vos paroles, idées vocales et beats en sessions complètes.',
      subtitle:
        'AudioMagic.ai donne à chaque créateur un espace privé pour écrire, produire, arranger, mixer et préparer la sortie de ses chansons.',
      primaryCta: 'Démarrer une session privée',
      secondaryCta: 'Connexion',
      loginCta: 'Ouvrir le studio',
      features: [
        ['Paroles vers chanson complète', 'Créez une structure de chanson de 2:50 ou 3:00 à partir de vos paroles.'],
        ['Sessions utilisateur privées', 'Chaque connexion ouvre un espace studio local isolé.'],
        ['Outils créateur', 'MixSplit, séquenceur, chaînes vocales, stems, validations et export.'],
      ],
      steps: ['Écrire ou coller les paroles', 'Générer le plan de chanson', 'Produire, enregistrer, mixer et publier'],
    },
    login: {
      eyebrow: 'Accès privé',
      title: 'Connectez-vous à votre espace AudioMagic.',
      subtitle: 'Vos projets restent dans une session navigateur séparée pour l’e-mail utilisé ici.',
      name: 'Nom artiste / créateur',
      email: 'Adresse e-mail',
      password: 'Mot de passe',
      passwordHint: 'Session locale MVP uniquement. L’authentification backend vient ensuite.',
      submit: 'Entrer dans le studio privé',
      back: 'Retour à l’accueil',
    },
    selector: 'Langue',
  },
} satisfies Record<LanguageCode, unknown>;
