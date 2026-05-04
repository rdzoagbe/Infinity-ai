import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Disc3,
  FileAudio,
  FileText,
  Layers3,
  ListChecks,
  Mic2,
  PackageCheck,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import type { ApprovalGate, ApprovalStatus, ExportAssetId, Project, RecordingTake, VersionKind, WorkspaceMode } from '../types';
import {
  createExportPackage,
  createHistoryEvent,
  createVersionRecord,
  defaultApprovalGates,
  defaultExportAssets,
  defaultReleaseChecklist,
  nowLabel,
} from '../utils';

interface StudioOpsV5Props {
  project: Project;
  onModeChange: (mode: WorkspaceMode) => void;
  onProjectChange: (patch: Partial<Project>) => void;
}

const panel = 'rounded-[2rem] border border-white/5 bg-glass/75 p-5 shadow-panel backdrop-blur-xl';
const buttonBase = 'rounded-2xl border px-3 py-2 text-xs font-semibold transition';
const inputClass = 'w-full rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan/35';

const sectionOptions = ['Intro', 'Verse 1', 'Hook', 'Verse 2', 'Bridge', 'Final Hook', 'Full Song'];
const assetLabels: Record<ExportAssetId, string> = {
  wavMaster: 'Full master WAV',
  mp3Preview: 'MP3 preview',
  stemsZip: 'Stems ZIP',
  instrumental: 'Instrumental',
  acapella: 'Acapella',
  lyricsPdf: 'Lyrics PDF',
  releaseNotes: 'Release notes',
};

const approvalColor = (status: ApprovalStatus) => {
  if (status === 'approved') return 'border-cyan/30 bg-cyan/10 text-cyan';
  if (status === 'changes_requested') return 'border-magenta/30 bg-magenta/10 text-magenta';
  return 'border-white/5 bg-black/25 text-white/55';
};

const versionKinds: VersionKind[] = ['demo', 'beat', 'mix', 'master', 'release'];

function patchHistory(project: Project, message: string, actor: 'Artist' | 'Producer' | 'Engineer' | 'System') {
  return [createHistoryEvent(message, actor), ...(project.sessionHistory ?? [])].slice(0, 14);
}

function nextApprovalState(gate: ApprovalGate, status: ApprovalStatus, note: string): ApprovalGate {
  return {
    ...gate,
    status,
    note: note.trim() || (status === 'approved' ? `${gate.label} approved.` : status === 'changes_requested' ? `${gate.label}: changes requested.` : gate.note),
    updatedAt: nowLabel(),
  };
}

export default function StudioOpsV5({ project, onModeChange, onProjectChange }: StudioOpsV5Props) {
  const takes = project.recordingTakes ?? [];
  const approvals = project.approvals?.length ? project.approvals : defaultApprovalGates();
  const versions = project.versionHistory ?? [];
  const packages = project.exportPackages ?? [];
  const exportAssets = defaultExportAssets({
    stemsZip: project.stems.length > 0,
    instrumental: project.stems.some((stem) => stem.kind === 'beat'),
    acapella: project.stems.some((stem) => stem.kind === 'vocal'),
  });

  const selectedTake = takes.find((take) => take.selected);
  const approvalsDone = approvals.filter((approval) => approval.status === 'approved').length;
  const completion = Math.round(((takes.length ? 1 : 0) + approvalsDone / approvals.length + (versions.length ? 1 : 0) + (packages.length ? 1 : 0)) * 25);
  const summaryCards: Array<{ label: string; value: string | number; icon: LucideIcon }> = [
    { label: 'Takes', value: takes.length, icon: FileAudio },
    { label: 'Approvals', value: `${approvalsDone}/${approvals.length}`, icon: ListChecks },
    { label: 'Versions', value: versions.length, icon: Layers3 },
    { label: 'Packages', value: packages.length, icon: PackageCheck },
  ];

  const updateTake = (takeId: string, patch: Partial<RecordingTake>) => {
    onProjectChange({
      recordingTakes: takes.map((take) => (take.id === takeId ? { ...take, ...patch } : take)),
      sessionHistory: patchHistory(project, 'Recording take metadata updated.', 'Artist'),
    });
  };

  const selectTake = (takeId: string) => {
    const nextTakes = takes.map((take) => ({ ...take, selected: take.id === takeId }));
    onProjectChange({
      recordingTakes: nextTakes,
      activeTakeId: takeId,
      status: 'Recording',
      sessionHistory: patchHistory(project, 'Best vocal take selected for producer and engineer review.', 'Artist'),
    });
  };

  const resetApprovals = () => {
    onProjectChange({
      approvals: defaultApprovalGates(),
      sessionHistory: patchHistory(project, 'Approval gates reset for a new review pass.', 'System'),
    });
  };

  const setApproval = (approvalId: ApprovalGate['id'], status: ApprovalStatus) => {
    const nextApprovals = approvals.map((approval) => (approval.id === approvalId ? nextApprovalState(approval, status, approval.note) : approval));
    const allApproved = nextApprovals.every((approval) => approval.status === 'approved');
    onProjectChange({
      approvals: nextApprovals,
      status: allApproved ? 'Released' : project.status,
      releaseChecklist: allApproved ? defaultReleaseChecklist({ lyrics: true, stems: true, mix: true, master: true, artwork: true, metadata: true }) : project.releaseChecklist,
      sessionHistory: patchHistory(project, allApproved ? 'All approvals completed. Session marked release-ready.' : 'Approval status updated.', 'System'),
    });
  };

  const updateApprovalNote = (approvalId: ApprovalGate['id'], note: string) => {
    onProjectChange({ approvals: approvals.map((approval) => (approval.id === approvalId ? { ...approval, note, updatedAt: nowLabel() } : approval)) });
  };

  const createVersion = (kind: VersionKind) => {
    const nextNumber = versions.filter((version) => version.kind === kind).length + 1;
    const label = `${kind.charAt(0).toUpperCase()}${kind.slice(1)} v${nextNumber}`;
    const owner = kind === 'mix' || kind === 'master' ? 'Engineer' : kind === 'beat' ? 'Producer' : kind === 'demo' ? 'Artist' : 'System';
    const version = createVersionRecord(
      label,
      kind,
      owner,
      `${label} captured with ${project.stems.length} stem${project.stems.length === 1 ? '' : 's'}, ${project.masterPreset ?? 'no preset'} preset, and ${project.bpm ?? 0} BPM metadata.`,
      project.stems.length,
      false,
    );
    onProjectChange({
      versionHistory: [version, ...versions],
      sessionHistory: patchHistory(project, `${label} saved to version history.`, owner),
    });
  };

  const approveVersion = (versionId: string) => {
    onProjectChange({
      versionHistory: versions.map((version) => (version.id === versionId ? { ...version, approved: !version.approved } : version)),
      sessionHistory: patchHistory(project, 'Version approval flag updated.', 'System'),
    });
  };

  const createPackage = () => {
    const releasePackage = createExportPackage(`${project.trackName} release package`, exportAssets, 'Includes selected release assets, metadata, lyrics, and session notes.');
    const releaseVersion = createVersionRecord('Release package v1', 'release', 'System', 'Distribution package assembled from v5 export builder.', project.stems.length, true);
    onProjectChange({
      exportPackages: [releasePackage, ...packages],
      versionHistory: [releaseVersion, ...versions],
      releaseChecklist: defaultReleaseChecklist({ lyrics: Boolean(project.lyrics.trim()), stems: project.stems.length > 0, mix: true, master: true, artwork: false, metadata: true }),
      sessionHistory: patchHistory(project, 'Release package assembled in v5 export builder.', 'System'),
    });
  };

  return (
    <section className="grid gap-5">
      <div className={panel}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-magenta/20 bg-magenta/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-magenta">
              <Sparkles className="h-3.5 w-3.5" /> v5 Studio Operating Layer
            </div>
            <h2 className="text-2xl font-semibold md:text-3xl">Recording takes, versions, approvals, and release packages</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
              v5 turns the session into a complete operational workflow: record takes, pick the best performance, snapshot mix/master versions, collect approvals, and build release deliverables.
            </p>
          </div>
          <div className="rounded-3xl border border-white/5 bg-black/25 p-4 text-right">
            <p className="text-xs uppercase tracking-[0.28em] text-white/35">v5 readiness</p>
            <p className="mt-1 text-4xl font-semibold text-magenta">{Math.min(100, completion)}%</p>
            <div className="mt-3 h-2 w-44 overflow-hidden rounded-full bg-white/10">
              <motion.span className="block h-full rounded-full bg-magenta shadow-magenta" animate={{ width: `${Math.min(100, completion)}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className={panel}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan">Recording Booth Ops</p>
              <h3 className="mt-2 text-xl font-semibold">Take manager and comp selection</h3>
              <p className="mt-2 text-sm leading-6 text-white/45">
                Record in Artist Mode, then manage takes here. Choose the best take before producer handoff or final comping.
              </p>
            </div>
            <Mic2 className="h-6 w-6 text-cyan" />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {sectionOptions.slice(1, 4).map((section) => (
              <button key={section} type="button" onClick={() => onModeChange('artist')} className="rounded-3xl border border-white/5 bg-black/25 p-4 text-left transition hover:border-cyan/30">
                <p className="font-semibold">Record {section}</p>
                <p className="mt-2 text-xs leading-5 text-white/40">Open Artist Mode booth with count-in and metronome.</p>
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3">
            {takes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-black/25 p-6 text-center text-sm text-white/35">
                No takes logged yet. Open Artist Mode, enable count-in/metronome, and record a vocal take.
              </div>
            ) : (
              takes.map((take) => (
                <div key={take.id} className={`rounded-3xl border p-4 ${take.selected ? 'border-cyan/30 bg-cyan/10' : 'border-white/5 bg-black/25'}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold">{take.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/35">{take.section} · {take.createdAt} · {take.durationLabel}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className={`${buttonBase} ${take.selected ? 'border-cyan/30 bg-cyan/15 text-cyan' : 'border-white/10 bg-white/5 text-white/55 hover:text-cyan'}`} onClick={() => selectTake(take.id)}>
                        {take.selected ? 'Best take' : 'Set best'}
                      </button>
                      <button type="button" className={`${buttonBase} border-white/10 bg-white/5 text-white/55 hover:text-magenta`} onClick={() => updateTake(take.id, { rating: Math.min(5, take.rating + 1) })}>
                        Rating {take.rating}/5
                      </button>
                    </div>
                  </div>
                  <input
                    value={take.note}
                    onChange={(event) => updateTake(take.id, { note: event.target.value })}
                    placeholder="Take note: energy, pitch, emotion, retake instructions..."
                    className={`${inputClass} mt-3`}
                  />
                </div>
              ))
            )}
          </div>

          {selectedTake && (
            <div className="mt-5 rounded-3xl border border-cyan/20 bg-cyan/10 p-4 text-sm leading-6 text-white/65">
              <span className="font-semibold text-cyan">Selected comp candidate:</span> {selectedTake.name} — {selectedTake.note || 'No note added yet.'}
            </div>
          )}
        </section>

        <section className={panel}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-magenta">Approvals</p>
              <h3 className="mt-2 text-xl font-semibold">Review gates and change requests</h3>
            </div>
            <ClipboardCheck className="h-6 w-6 text-magenta" />
          </div>

          <div className="mt-5 grid gap-3">
            {approvals.map((approval) => (
              <div key={approval.id} className={`rounded-3xl border p-4 ${approvalColor(approval.status)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{approval.label}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] opacity-55">{approval.owner} · {approval.updatedAt}</p>
                  </div>
                  {approval.status === 'approved' ? <BadgeCheck className="h-5 w-5" /> : approval.status === 'changes_requested' ? <RotateCcw className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </div>
                <textarea
                  value={approval.note}
                  onChange={(event) => updateApprovalNote(approval.id, event.target.value)}
                  className="mt-3 min-h-20 w-full resize-none rounded-2xl border border-white/5 bg-black/25 p-3 text-sm leading-6 text-white outline-none focus:border-cyan/35"
                />
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <button type="button" onClick={() => setApproval(approval.id, 'approved')} className={`${buttonBase} border-cyan/25 bg-cyan/10 text-cyan hover:bg-cyan hover:text-black`}>Approve</button>
                  <button type="button" onClick={() => setApproval(approval.id, 'changes_requested')} className={`${buttonBase} border-magenta/25 bg-magenta/10 text-magenta hover:bg-magenta hover:text-black`}>Request changes</button>
                  <button type="button" onClick={() => setApproval(approval.id, 'pending')} className={`${buttonBase} border-white/10 bg-white/5 text-white/55 hover:text-white`}>Pending</button>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={resetApprovals} className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/55 transition hover:border-cyan/30 hover:text-cyan">
            Reset approvals for next review pass
          </button>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className={panel}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan">Version History</p>
              <h3 className="mt-2 text-xl font-semibold">Mix, master, and release snapshots</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {versionKinds.map((kind) => (
                <button key={kind} type="button" onClick={() => createVersion(kind)} className={`${buttonBase} border-cyan/25 bg-cyan/10 text-cyan hover:bg-cyan hover:text-black`}>
                  Save {kind}
                </button>
              ))}
            </div>
          </div>

          <div className="audio-scrollbar mt-5 grid max-h-[34rem] gap-3 overflow-auto pr-1">
            {versions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-black/25 p-6 text-center text-sm text-white/35">
                No versions yet. Save a demo, beat, mix, master, or release snapshot.
              </div>
            ) : (
              versions.map((version) => (
                <div key={version.id} className="rounded-3xl border border-white/5 bg-black/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{version.label}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/35">{version.kind} · {version.owner} · {version.createdAt}</p>
                    </div>
                    <button type="button" onClick={() => approveVersion(version.id)} className={`${buttonBase} ${version.approved ? 'border-cyan/25 bg-cyan/10 text-cyan' : 'border-white/10 bg-white/5 text-white/55'}`}>
                      {version.approved ? 'Approved' : 'Mark approved'}
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/55">{version.summary}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs uppercase tracking-[0.18em] text-white/35">
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-3">{version.stemCount} stems</div>
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-3">{version.approved ? 'approved' : 'draft'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className={panel}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-magenta">Export Package Builder</p>
              <h3 className="mt-2 text-xl font-semibold">Release-ready deliverables</h3>
              <p className="mt-2 text-sm leading-6 text-white/45">Prepare the package that an artist, label, or distributor expects after the engineer approves the master.</p>
            </div>
            <PackageCheck className="h-6 w-6 text-magenta" />
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {(Object.keys(exportAssets) as ExportAssetId[]).map((asset) => (
              <div key={asset} className={`rounded-3xl border p-4 ${exportAssets[asset] ? 'border-cyan/25 bg-cyan/10 text-cyan' : 'border-white/5 bg-black/25 text-white/45'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{assetLabels[asset]}</p>
                  {exportAssets[asset] ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </div>
                <p className="mt-2 text-xs leading-5 opacity-70">{exportAssets[asset] ? 'Included automatically based on current session state.' : 'Available after matching stems or assets are added.'}</p>
              </div>
            ))}
          </div>

          <button type="button" onClick={createPackage} className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-magenta/35 bg-magenta px-5 py-4 font-semibold text-black shadow-magenta transition hover:scale-[1.01]">
            <WandSparkles className="h-5 w-5" /> Build release package
          </button>

          <div className="audio-scrollbar mt-5 grid max-h-80 gap-3 overflow-auto pr-1">
            {packages.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-black/25 p-6 text-center text-sm text-white/35">
                No export packages created yet.
              </div>
            ) : (
              packages.map((item) => (
                <div key={item.id} className="rounded-3xl border border-white/5 bg-black/25 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/35">{item.createdAt}</p>
                    </div>
                    {item.ready ? <BadgeCheck className="h-5 w-5 text-cyan" /> : <Circle className="h-5 w-5 text-white/30" />}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/55">{item.notes}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Object.keys(item.assets) as ExportAssetId[]).filter((asset) => item.assets[asset]).map((asset) => (
                      <span key={asset} className="rounded-full border border-cyan/20 bg-cyan/10 px-3 py-1 text-xs text-cyan">{assetLabels[asset]}</span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className={panel}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan">Next session actions</p>
            <h3 className="mt-2 text-xl font-semibold">Keep the full song cycle moving</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <button type="button" onClick={() => onModeChange('artist')} className={`${buttonBase} border-cyan/25 bg-cyan/10 text-cyan hover:bg-cyan hover:text-black`}><Mic2 className="mr-2 inline h-4 w-4" />Record</button>
            <button type="button" onClick={() => onModeChange('engineer')} className={`${buttonBase} border-magenta/25 bg-magenta/10 text-magenta hover:bg-magenta hover:text-black`}><SlidersHorizontal className="mr-2 inline h-4 w-4" />Mix</button>
            <button type="button" onClick={() => createVersion('release')} className={`${buttonBase} border-white/10 bg-white/5 text-white/55 hover:border-cyan/30 hover:text-cyan`}><Disc3 className="mr-2 inline h-4 w-4" />Snapshot release</button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {summaryCards.map(({ label, value, icon: Icon }) => (
            <div key={String(label)} className="rounded-3xl border border-white/5 bg-black/25 p-4">
              <Icon className="h-5 w-5 text-cyan" />
              <p className="mt-3 text-2xl font-semibold">{value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/35">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
