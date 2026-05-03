import {
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  DownloadCloud,
  FileAudio,
  FileCheck2,
  FileText,
  HandCoins,
  Headphones,
  Link2,
  MessageSquareText,
  PackageCheck,
  RadioTower,
  Scissors,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  SplitSquareHorizontal,
  UploadCloud,
  WandSparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Project, ReleaseChecklist, Stem, StemKind, StemSplitRole, WorkspaceMode } from '../types';
import { createHistoryEvent, createVersionRecord, defaultReleaseChecklist, id, nowLabel } from '../utils';

interface ProfessionalPlatformV13Props {
  project: Project;
  onProjectChange: (patch: Partial<Project>) => void;
  onOpenRoom: (mode: WorkspaceMode) => void;
}

type ProModule = 'briefs' | 'review' | 'library' | 'repair' | 'mastering' | 'marketplace' | 'release' | 'assistant';
type ReviewStatus = 'Open' | 'Change requested' | 'Approved';

type ReviewNote = {
  id: string;
  time: string;
  author: string;
  text: string;
  status: ReviewStatus;
};

type ProjectBrief = {
  need: string;
  deadline: string;
  budget: string;
  references: string;
  deliverables: string;
};

const panel = 'rounded-[2rem] border border-white/5 bg-glass/80 p-5 shadow-panel backdrop-blur-xl';
const input = 'rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan/35';
const textarea = 'min-h-28 resize-none rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 focus:border-cyan/35';

const modules: Array<{ id: ProModule; label: string; helper: string; icon: typeof BriefcaseBusiness }> = [
  { id: 'briefs', label: 'Project Briefs', helper: 'Artist, producer, engineer scope', icon: BriefcaseBusiness },
  { id: 'review', label: 'Review Link', helper: 'Timestamp notes and approval', icon: MessageSquareText },
  { id: 'library', label: 'Sound Library', helper: 'Search sounds and add stems', icon: Search },
  { id: 'repair', label: 'Audio Repair', helper: 'Cleanup and stem split workflow', icon: Scissors },
  { id: 'mastering', label: 'Mastering Assistant', helper: 'LUFS, clarity, width, A/B', icon: Headphones },
  { id: 'marketplace', label: 'Beat Licensing', helper: 'Licenses, splits, contracts', icon: HandCoins },
  { id: 'release', label: 'Release Metadata', helper: 'Credits, artwork, split sheet', icon: RadioTower },
  { id: 'assistant', label: 'Automation', helper: 'Studio command macros', icon: Bot },
];

const soundResults = [
  { name: 'Afro Swing Perc Loop', genre: 'Afrobeat', bpm: 104, key: 'A minor', mood: 'Dance', kind: 'stem' as StemKind, role: 'drums' as StemSplitRole, frequency: 166 },
  { name: 'Velvet R&B Chords', genre: 'R&B', bpm: 88, key: 'F minor', mood: 'Emotional', kind: 'stem' as StemKind, role: 'melody' as StemSplitRole, frequency: 220 },
  { name: 'Drill 808 Slide', genre: 'Drill', bpm: 142, key: 'D minor', mood: 'Dark', kind: 'stem' as StemKind, role: 'bass' as StemSplitRole, frequency: 72 },
  { name: 'Vocal Chop Hook Texture', genre: 'Pop', bpm: 100, key: 'C minor', mood: 'Hooky', kind: 'vocal' as StemKind, role: 'vocals' as StemSplitRole, frequency: 330 },
  { name: 'FX Riser Into Hook', genre: 'All', bpm: 120, key: 'No key', mood: 'Energy', kind: 'stem' as StemKind, role: 'other' as StemSplitRole, frequency: 440 },
  { name: 'Clean Drum Bus Starter', genre: 'Trap', bpm: 130, key: 'No key', mood: 'Punchy', kind: 'beat' as StemKind, role: 'drums' as StemSplitRole, frequency: 130 },
];

const repairTools = [
  { name: 'Clean vocal noise', helper: 'Noise reduction, room tone cleanup, breath control.', role: 'vocals' as StemSplitRole, kind: 'vocal' as StemKind, frequency: 260 },
  { name: 'Split full song into stems', helper: 'Vocals, drums, bass, melody, and other.', role: 'other' as StemSplitRole, kind: 'stem' as StemKind, frequency: 200 },
  { name: 'Reduce harshness', helper: 'Softens 2–5 kHz harsh vocal and synth energy.', role: 'melody' as StemSplitRole, kind: 'stem' as StemKind, frequency: 300 },
  { name: 'Tighten timing', helper: 'Simulated Beat Doctor-style groove alignment.', role: 'drums' as StemSplitRole, kind: 'beat' as StemKind, frequency: 146 },
];

const masteringTargets = [
  { name: 'Spotify / Apple Streaming', lufs: '-10 LUFS', truePeak: '-1.0 dBTP', bass: 56, clarity: 72, width: 64 },
  { name: 'Club / DJ Loud', lufs: '-8 LUFS', truePeak: '-0.8 dBTP', bass: 78, clarity: 66, width: 58 },
  { name: 'Warm Analog Master', lufs: '-12 LUFS', truePeak: '-1.2 dBTP', bass: 62, clarity: 54, width: 52 },
  { name: 'Vocal Forward Master', lufs: '-10 LUFS', truePeak: '-1.0 dBTP', bass: 48, clarity: 84, width: 48 },
];

const beatLicenses = [
  { name: 'Demo License', price: 'Free', rights: 'Tagged MP3 preview, non-commercial writing session.' },
  { name: 'Basic Lease', price: '€49', rights: 'MP3/WAV, 50k streams, producer credit required.' },
  { name: 'Premium Lease + Stems', price: '€149', rights: 'WAV + stems, 250k streams, monetized content.' },
  { name: 'Exclusive License', price: '€799+', rights: 'Exclusive usage, contract needed, custom split sheet.' },
];

const automationCommands = [
  { name: 'Prepare engineer handoff', result: 'Labels stems, marks mix pending, creates engineer note.' },
  { name: 'Create release package', result: 'Checks master, stems, lyrics, metadata, artwork, and exports.' },
  { name: 'Generate mix notes', result: 'Creates timestamp-style engineer checklist from current stems.' },
  { name: 'Clean session labels', result: 'Normalizes stem names, kind, split role, gain, and pan.' },
  { name: 'Mark ready for mastering', result: 'Updates status, release checklist, and version history.' },
];

const defaultBrief: ProjectBrief = {
  need: 'Full song production, mix, master, and release preparation',
  deadline: 'Next Friday',
  budget: 'TBD',
  references: 'Add 2–3 reference tracks or YouTube/Spotify links',
  deliverables: 'WAV master, MP3 preview, stems ZIP, lyrics, credits, split sheet',
};

const initialReviewNotes: ReviewNote[] = [
  { id: 'review-1', time: '00:42', author: 'Artist', text: 'Bring the lead vocal slightly forward before the first hook.', status: 'Open' },
  { id: 'review-2', time: '01:16', author: 'Producer', text: 'Add a short drum fill into the second hook.', status: 'Change requested' },
  { id: 'review-3', time: '02:24', author: 'Engineer', text: 'Master preset is close. Check bass on small speakers.', status: 'Approved' },
];

const writeString = (view: DataView, offset: number, text: string) => {
  for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
};

const createDemoWavUrl = (frequency = 220, durationSeconds = 4) => {
  const sampleRate = 44100;
  const samples = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples * 2, true);
  for (let index = 0; index < samples; index += 1) {
    const envelope = Math.max(0.04, 1 - index / samples);
    const tone = Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 0.12 * envelope;
    const sub = Math.sin((2 * Math.PI * Math.max(48, frequency / 2) * index) / sampleRate) * 0.08 * envelope;
    view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, tone + sub)) * 32767, true);
  }
  return URL.createObjectURL(new Blob([view], { type: 'audio/wav' }));
};

const checklist = (project: Project): ReleaseChecklist => project.releaseChecklist ?? defaultReleaseChecklist();

export default function ProfessionalPlatformV13({ project, onProjectChange, onOpenRoom }: ProfessionalPlatformV13Props) {
  const [activeModule, setActiveModule] = useState<ProModule>('briefs');
  const [brief, setBrief] = useState<ProjectBrief>(defaultBrief);
  const [reviewNotes, setReviewNotes] = useState<ReviewNote[]>(initialReviewNotes);
  const [newReview, setNewReview] = useState('');
  const [reviewTime, setReviewTime] = useState('01:00');
  const [librarySearch, setLibrarySearch] = useState('');
  const [artistName, setArtistName] = useState('Artist Name');
  const [featuredArtists, setFeaturedArtists] = useState('');
  const [producerName, setProducerName] = useState('Producer Name');
  const [writers, setWriters] = useState('Writer 1, Writer 2');
  const [selectedLicense, setSelectedLicense] = useState(beatLicenses[1]);
  const releaseChecklist = checklist(project);

  const filteredSounds = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();
    if (!query) return soundResults;
    return soundResults.filter((sound) => [sound.name, sound.genre, sound.key, sound.mood].join(' ').toLowerCase().includes(query));
  }, [librarySearch]);

  const completion = useMemo(() => {
    const points = [
      Boolean(brief.need),
      reviewNotes.some((note) => note.status === 'Approved'),
      project.stems.length > 0,
      Boolean(project.aiMasterUrl || project.masterPreset),
      Object.values(releaseChecklist).filter(Boolean).length >= 4,
      Boolean(selectedLicense),
    ];
    return Math.round((points.filter(Boolean).length / points.length) * 100);
  }, [brief.need, project.aiMasterUrl, project.masterPreset, project.stems.length, releaseChecklist, reviewNotes, selectedLicense]);

  const patchWithHistory = (patch: Partial<Project>, message: string, owner: 'Artist' | 'Producer' | 'Engineer' | 'System' = 'System') => {
    onProjectChange({
      ...patch,
      sessionHistory: [createHistoryEvent(message, owner), ...(project.sessionHistory ?? [])].slice(0, 18),
    });
  };

  const addStem = (name: string, kind: StemKind, role: StemSplitRole | undefined, sourceTool: string, frequency: number) => {
    const url = createDemoWavUrl(frequency);
    const stem: Stem = {
      id: id('stem'),
      name: `${project.trackName} · ${name}`,
      kind,
      url,
      fileName: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.wav`,
      pan: role === 'melody' ? 0.14 : role === 'drums' ? -0.08 : 0,
      gain: kind === 'master' ? 0.86 : 0.74,
      muted: false,
      solo: false,
      splitRole: role,
      sourceTool,
      position: { x: 150 + Math.round(Math.random() * 260), y: 120 + Math.round(Math.random() * 240) },
      createdAt: nowLabel(),
    };

    patchWithHistory(
      {
        stems: [stem, ...project.stems],
        releaseChecklist: { ...releaseChecklist, stems: true },
        status: project.status === 'Writing' ? 'Producing' : project.status,
        versionHistory: [createVersionRecord(`${sourceTool} · ${name}`, kind === 'master' ? 'master' : 'beat', 'Producer', `${name} added through v13 Professional Platform.`, project.stems.length + 1), ...(project.versionHistory ?? [])].slice(0, 14),
      },
      `${name} added through ${sourceTool}.`,
      'Producer',
    );
  };

  const saveBrief = () => {
    patchWithHistory(
      {
        producerNotes: [
          project.producerNotes,
          `v13 PROJECT BRIEF\nNeed: ${brief.need}\nDeadline: ${brief.deadline}\nBudget: ${brief.budget}\nReferences: ${brief.references}\nDeliverables: ${brief.deliverables}`,
        ].filter(Boolean).join('\n\n'),
      },
      'Professional project brief saved.',
      'Artist',
    );
  };

  const addReviewNote = () => {
    if (!newReview.trim()) return;
    const note: ReviewNote = { id: id('review'), time: reviewTime, author: 'Client', text: newReview.trim(), status: 'Open' };
    setReviewNotes((current) => [note, ...current]);
    setNewReview('');
    patchWithHistory({ status: 'Mixing' }, `Review note added at ${reviewTime}: ${note.text}`, 'Artist');
  };

  const updateReviewStatus = (noteId: string, status: ReviewStatus) => {
    setReviewNotes((current) => current.map((note) => (note.id === noteId ? { ...note, status } : note)));
    patchWithHistory({}, `Review note marked ${status}.`, 'System');
  };

  const applyRepairTool = (tool: (typeof repairTools)[number]) => {
    addStem(tool.name, tool.kind, tool.role, 'Audio Repair Room', tool.frequency);
  };

  const applyMasterTarget = (target: (typeof masteringTargets)[number]) => {
    const masterUrl = project.aiMasterUrl || createDemoWavUrl(target.clarity * 4, 5);
    patchWithHistory(
      {
        aiMasterUrl: masterUrl,
        masterPreset: target.name,
        status: 'Mixing',
        releaseChecklist: { ...releaseChecklist, mix: true, master: true },
        versionHistory: [createVersionRecord(`${target.name} master`, 'master', 'Engineer', `${target.lufs}, ${target.truePeak}, bass ${target.bass}, clarity ${target.clarity}, width ${target.width}.`, project.stems.length), ...(project.versionHistory ?? [])].slice(0, 14),
      },
      `Mastering target applied: ${target.name}.`,
      'Engineer',
    );
  };

  const saveLicense = () => {
    patchWithHistory(
      {
        producerNotes: [project.producerNotes, `v13 BEAT LICENSE: ${selectedLicense.name} · ${selectedLicense.price} · ${selectedLicense.rights}`].filter(Boolean).join('\n\n'),
      },
      `Beat license selected: ${selectedLicense.name}.`,
      'Producer',
    );
  };

  const toggleReleaseItem = (key: keyof ReleaseChecklist) => {
    patchWithHistory({ releaseChecklist: { ...releaseChecklist, [key]: !releaseChecklist[key] } }, `${key} release item ${releaseChecklist[key] ? 'cleared' : 'completed'}.`, 'System');
  };

  const saveReleaseMetadata = () => {
    patchWithHistory(
      {
        releaseChecklist: { ...releaseChecklist, metadata: true },
        producerNotes: [project.producerNotes, `v13 RELEASE METADATA\nArtist: ${artistName}\nFeatured: ${featuredArtists || 'None'}\nProducer: ${producerName}\nWriters: ${writers}\nISRC: AUTO-PENDING\nExplicit: TBD`].filter(Boolean).join('\n\n'),
      },
      'Release metadata and split sheet saved.',
      'System',
    );
  };

  const runAutomation = (command: (typeof automationCommands)[number]) => {
    const patch: Partial<Project> = {
      producerNotes: [project.producerNotes, `v13 AUTOMATION: ${command.name}\n${command.result}`].filter(Boolean).join('\n\n'),
    };

    if (command.name.includes('engineer')) patch.status = 'Mixing';
    if (command.name.includes('release')) patch.releaseChecklist = { ...releaseChecklist, lyrics: true, stems: true, metadata: true };
    if (command.name.includes('mastering')) patch.releaseChecklist = { ...releaseChecklist, mix: true };

    patchWithHistory(patch, `Automation command executed: ${command.name}.`, 'System');
  };

  return (
    <section className="space-y-5">
      <div className={panel}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan"><ShieldCheck className="h-3.5 w-3.5" /> AudioMagic v13 · Professional Studio Platform</p>
            <h2 className="mt-4 text-3xl font-semibold md:text-4xl">Add the professional trust layer.</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-white/50">Briefs, reviews, approvals, repair, mastering targets, licensing, metadata, split sheet, and automation commands turn the studio into a client-ready production platform.</p>
          </div>
          <div className="rounded-3xl border border-white/5 bg-black/25 p-4 xl:min-w-[20rem]">
            <div className="flex items-center justify-between text-sm"><span className="text-white/45">Professional completion</span><span className="font-semibold text-cyan">{completion}%</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-cyan shadow-cyan" style={{ width: `${completion}%` }} /></div>
            <p className="mt-3 text-xs leading-5 text-white/40">{project.status} · {project.stems.length} stems · {reviewNotes.length} review notes</p>
          </div>
        </div>

        <div className="mt-6 grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          {modules.map((module) => {
            const active = activeModule === module.id;
            return (
              <button key={module.id} type="button" onClick={() => setActiveModule(module.id)} className={`rounded-2xl border p-3 text-left transition ${active ? 'border-cyan/35 bg-cyan/10 text-white shadow-cyan' : 'border-white/5 bg-black/25 text-white/50 hover:border-cyan/25 hover:text-white'}`}>
                <module.icon className={active ? 'h-5 w-5 text-cyan' : 'h-5 w-5 text-white/35'} />
                <p className="mt-3 text-sm font-semibold">{module.label}</p>
                <p className="mt-1 text-xs leading-4 text-white/35">{module.helper}</p>
              </button>
            );
          })}
        </div>
      </div>

      {activeModule === 'briefs' && (
        <div className={panel}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-xs uppercase tracking-[0.24em] text-cyan">Professional project brief</p><h3 className="mt-2 text-2xl font-semibold">Define the job before making the record.</h3><p className="mt-2 text-sm text-white/45">A proper artist, producer, and engineer brief prevents confusion and improves handoffs.</p></div><button type="button" onClick={saveBrief} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan px-5 py-3 font-semibold text-black shadow-cyan"><FileCheck2 className="h-4 w-4" /> Save brief</button></div>
          <div className="mt-6 grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm text-white/50">Need<input className={input} value={brief.need} onChange={(event) => setBrief({ ...brief, need: event.target.value })} /></label><label className="grid gap-2 text-sm text-white/50">Deadline<input className={input} value={brief.deadline} onChange={(event) => setBrief({ ...brief, deadline: event.target.value })} /></label><label className="grid gap-2 text-sm text-white/50">Budget<input className={input} value={brief.budget} onChange={(event) => setBrief({ ...brief, budget: event.target.value })} /></label><label className="grid gap-2 text-sm text-white/50">References<input className={input} value={brief.references} onChange={(event) => setBrief({ ...brief, references: event.target.value })} /></label><label className="md:col-span-2 grid gap-2 text-sm text-white/50">Deliverables<textarea className={textarea} value={brief.deliverables} onChange={(event) => setBrief({ ...brief, deliverables: event.target.value })} /></label></div>
        </div>
      )}

      {activeModule === 'review' && (
        <div className={panel}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-xs uppercase tracking-[0.24em] text-magenta">Review link simulation</p><h3 className="mt-2 text-2xl font-semibold">Timestamp comments and approvals.</h3><p className="mt-2 text-sm text-white/45">Artists, producers, and engineers need precise feedback at exact moments.</p></div><button type="button" onClick={() => patchWithHistory({}, 'Review link copied for client approval.', 'System')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan/30 bg-cyan/10 px-5 py-3 font-semibold text-cyan"><Link2 className="h-4 w-4" /> Copy review link</button></div>
          <div className="mt-6 grid gap-3 md:grid-cols-[9rem_1fr_auto]"><input className={input} value={reviewTime} onChange={(event) => setReviewTime(event.target.value)} /><input className={input} value={newReview} onChange={(event) => setNewReview(event.target.value)} placeholder="Add timestamp note, e.g. vocal too low before hook" /><button type="button" onClick={addReviewNote} className="rounded-2xl bg-cyan px-5 py-3 font-semibold text-black shadow-cyan">Add note</button></div>
          <div className="mt-6 space-y-3">{reviewNotes.map((note) => <div key={note.id} className="rounded-3xl border border-white/5 bg-black/25 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="font-semibold"><span className="text-cyan">{note.time}</span> · {note.author}</p><p className="mt-2 text-sm leading-6 text-white/60">{note.text}</p></div><select value={note.status} onChange={(event) => updateReviewStatus(note.id, event.target.value as ReviewStatus)} className="rounded-2xl border border-white/5 bg-black/40 px-3 py-2 text-sm text-white"><option>Open</option><option>Change requested</option><option>Approved</option></select></div></div>)}</div>
        </div>
      )}

      {activeModule === 'library' && (
        <div className={panel}>
          <div><p className="text-xs uppercase tracking-[0.24em] text-cyan">Sound library</p><h3 className="mt-2 text-2xl font-semibold">Search sounds by genre, BPM, key, and mood.</h3></div>
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/5 bg-black/30 px-4 py-3"><Search className="h-4 w-4 text-cyan" /><input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="Search: afrobeat, vocal, bass, F minor..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25" /></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredSounds.map((sound) => <button key={sound.name} type="button" onClick={() => addStem(sound.name, sound.kind, sound.role, 'v13 Sound Library', sound.frequency)} className="rounded-3xl border border-white/5 bg-black/25 p-5 text-left transition hover:border-cyan/30 hover:bg-cyan/10"><UploadCloud className="h-5 w-5 text-cyan" /><p className="mt-4 text-lg font-semibold">{sound.name}</p><p className="mt-2 text-sm text-white/45">{sound.genre} · {sound.bpm} BPM · {sound.key} · {sound.mood}</p><p className="mt-4 text-xs uppercase tracking-[0.2em] text-cyan/70">Add as {sound.kind}</p></button>)}</div>
        </div>
      )}

      {activeModule === 'repair' && (
        <div className={panel}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-xs uppercase tracking-[0.24em] text-magenta">Audio repair and stem intelligence</p><h3 className="mt-2 text-2xl font-semibold">Clean, split, and prepare audio before mixing.</h3></div><button type="button" onClick={() => onOpenRoom('engineer')} className="rounded-2xl border border-cyan/30 bg-cyan/10 px-5 py-3 font-semibold text-cyan">Open Mix Room</button></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{repairTools.map((tool) => <button key={tool.name} type="button" onClick={() => applyRepairTool(tool)} className="rounded-3xl border border-white/5 bg-black/25 p-5 text-left transition hover:border-magenta/30 hover:bg-magenta/10"><SplitSquareHorizontal className="h-5 w-5 text-magenta" /><p className="mt-4 text-lg font-semibold">{tool.name}</p><p className="mt-2 text-sm leading-6 text-white/45">{tool.helper}</p></button>)}</div>
        </div>
      )}

      {activeModule === 'mastering' && (
        <div className={panel}>
          <div><p className="text-xs uppercase tracking-[0.24em] text-cyan">Mastering assistant</p><h3 className="mt-2 text-2xl font-semibold">Target loudness, bass, clarity, and width.</h3></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{masteringTargets.map((target) => <button key={target.name} type="button" onClick={() => applyMasterTarget(target)} className={`rounded-3xl border p-5 text-left transition ${project.masterPreset === target.name ? 'border-cyan/35 bg-cyan/10' : 'border-white/5 bg-black/25 hover:border-cyan/25'}`}><Headphones className="h-5 w-5 text-cyan" /><p className="mt-4 text-lg font-semibold">{target.name}</p><p className="mt-2 text-sm text-white/45">{target.lufs} · {target.truePeak}</p><div className="mt-4 space-y-2 text-xs text-white/40"><p>Bass {target.bass}%</p><p>Clarity {target.clarity}%</p><p>Width {target.width}%</p></div></button>)}</div>
          {project.aiMasterUrl && <audio className="mt-5 w-full" controls src={project.aiMasterUrl} />}
        </div>
      )}

      {activeModule === 'marketplace' && (
        <div className={panel}>
          <div><p className="text-xs uppercase tracking-[0.24em] text-magenta">Beat marketplace and licensing</p><h3 className="mt-2 text-2xl font-semibold">Choose rights before release.</h3><p className="mt-2 text-sm text-white/45">This creates a mock license and split-sheet note for the project.</p></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{beatLicenses.map((license) => { const active = selectedLicense.name === license.name; return <button key={license.name} type="button" onClick={() => setSelectedLicense(license)} className={`rounded-3xl border p-5 text-left transition ${active ? 'border-magenta/35 bg-magenta/10' : 'border-white/5 bg-black/25 hover:border-magenta/25'}`}><HandCoins className="h-5 w-5 text-magenta" /><p className="mt-4 text-lg font-semibold">{license.name}</p><p className="mt-2 text-2xl font-semibold text-cyan">{license.price}</p><p className="mt-3 text-sm leading-6 text-white/45">{license.rights}</p></button>; })}</div>
          <button type="button" onClick={saveLicense} className="mt-5 rounded-2xl bg-magenta px-5 py-3 font-semibold text-black shadow-magenta">Save license to project</button>
        </div>
      )}

      {activeModule === 'release' && (
        <div className={panel}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-xs uppercase tracking-[0.24em] text-cyan">Release metadata and split sheet</p><h3 className="mt-2 text-2xl font-semibold">Prepare the song for distribution.</h3></div><button type="button" onClick={saveReleaseMetadata} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan px-5 py-3 font-semibold text-black shadow-cyan"><FileText className="h-4 w-4" /> Save metadata</button></div>
          <div className="mt-6 grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm text-white/50">Artist name<input className={input} value={artistName} onChange={(event) => setArtistName(event.target.value)} /></label><label className="grid gap-2 text-sm text-white/50">Featured artists<input className={input} value={featuredArtists} onChange={(event) => setFeaturedArtists(event.target.value)} /></label><label className="grid gap-2 text-sm text-white/50">Producer<input className={input} value={producerName} onChange={(event) => setProducerName(event.target.value)} /></label><label className="grid gap-2 text-sm text-white/50">Writers / splits<input className={input} value={writers} onChange={(event) => setWriters(event.target.value)} /></label></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{(Object.keys(releaseChecklist) as Array<keyof ReleaseChecklist>).map((key) => <button key={key} type="button" onClick={() => toggleReleaseItem(key)} className={`rounded-3xl border p-5 text-left transition ${releaseChecklist[key] ? 'border-cyan/30 bg-cyan/10' : 'border-white/5 bg-black/25 hover:border-cyan/25'}`}><CheckCircle2 className={releaseChecklist[key] ? 'h-5 w-5 text-cyan' : 'h-5 w-5 text-white/30'} /><p className="mt-4 text-lg font-semibold capitalize">{key}</p><p className="mt-2 text-sm text-white/40">{releaseChecklist[key] ? 'Completed' : 'Pending'}</p></button>)}</div>
          <div className="mt-5 grid gap-3 md:grid-cols-3"><a href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify({ project, artistName, featuredArtists, producerName, writers, selectedLicense }, null, 2))}`} download={`${project.trackName.replace(/[^a-z0-9]+/gi, '-')}-release-metadata.json`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/60"><DownloadCloud className="h-4 w-4" /> Metadata JSON</a><button type="button" onClick={() => patchWithHistory({ status: 'Released', releaseChecklist: defaultReleaseChecklist({ lyrics: true, stems: true, mix: true, master: true, artwork: true, metadata: true }) }, 'Distribution checklist marked complete.', 'System')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan px-4 py-3 text-sm font-semibold text-black shadow-cyan"><RadioTower className="h-4 w-4" /> Mark release ready</button><button type="button" onClick={() => patchWithHistory({}, 'Split sheet exported for signatures.', 'System')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-magenta/25 bg-magenta/10 px-4 py-3 text-sm font-semibold text-magenta"><PackageCheck className="h-4 w-4" /> Export split sheet</button></div>
        </div>
      )}

      {activeModule === 'assistant' && (
        <div className={panel}>
          <div><p className="text-xs uppercase tracking-[0.24em] text-cyan">Studio automation assistant</p><h3 className="mt-2 text-2xl font-semibold">One-click professional commands.</h3><p className="mt-2 text-sm text-white/45">These simulate the workflow macros engineers and production teams expect.</p></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{automationCommands.map((command) => <button key={command.name} type="button" onClick={() => runAutomation(command)} className="rounded-3xl border border-white/5 bg-black/25 p-5 text-left transition hover:border-cyan/30 hover:bg-cyan/10"><Bot className="h-5 w-5 text-cyan" /><p className="mt-4 font-semibold">{command.name}</p><p className="mt-2 text-sm leading-6 text-white/45">{command.result}</p></button>)}</div>
          <div className="mt-5 rounded-3xl border border-magenta/20 bg-magenta/10 p-4 text-sm leading-6 text-white/65"><span className="font-semibold text-magenta">Professional rule:</span> no release leaves the studio without a brief, review approval, clean stems, master target, license/splits, metadata, and export package.</div>
        </div>
      )}
    </section>
  );
}
