import { useState } from 'react';
import { Check, Download, Pencil, Star, Trash2 } from 'lucide-react';
import ABPlayer from '../studio/ABPlayer.jsx';
import { formatDate, panel, resolveAssetUrl } from './projectAssets.jsx';

const KIND_COLORS = { 'master': '#b78aff', 'mix-render': '#55e9ff', 'clean': '#57f09c', 'export-package': '#ffcf66' };

/**
 * Version history for a project: every render (Clean/Mix/Master) is a version
 * with its parameters, QC data and downloads. Supports rename, mark-final,
 * delete, settings restore and A/B comparison between any two versions.
 */
export default function VersionHistory({ project, updateAsset, demo = false }) {
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [compareIds, setCompareIds] = useState([]);
  const [showParams, setShowParams] = useState(null);

  const versions = (Array.isArray(project?.analysis?.generated_sounds) ? project.analysis.generated_sounds : [])
    .filter((a) => a.version_label || ['master', 'mix-render', 'clean'].includes(a.type));

  if (!versions.length) {
    return (
      <section style={{ ...panel, padding: 20 }}>
        <p className="eyebrow">Version history</p>
        <p className="muted" style={{ marginTop: 8 }}>No versions yet — every Clean, Mix and Master render is saved here with its settings.</p>
      </section>
    );
  }

  const toggleCompare = (id) => {
    setCompareIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur.slice(-1), id]));
  };

  const compareSources = compareIds
    .map((id) => versions.find((v) => v.id === id))
    .filter(Boolean)
    .map((v, i) => ({
      id: v.id,
      label: v.custom_name || v.version_label || v.name || `Version ${i + 1}`,
      url: resolveAssetUrl(v.preview_url || v.download_url || v.assets?.[0]?.download_url),
      lufs: v.qc?.after?.integrated_lufs ?? null,
      color: i === 0 ? '#ffcf66' : '#b78aff',
    }))
    .filter((s) => s.url);

  const restoreSettings = (v) => {
    if (!v.parameters) return;
    // Mix parameters are keyed per project; writing them makes the mixer pick
    // them up on next open. Master settings restore via the studio session.
    if (v.type === 'mix-render') {
      try { localStorage.setItem(`infinity_mix_params_v1_${project.id}`, JSON.stringify(v.parameters)); } catch {}
      window.alert(`Mix settings from "${v.custom_name || v.version_label}" restored — open the Vocal + Beat mixer to use them.`);
    } else {
      try { localStorage.setItem('infinity_restored_master_params_v1', JSON.stringify(v.parameters)); } catch {}
      window.alert(`Master settings from "${v.custom_name || v.version_label}" saved — they will pre-fill the next master run.`);
    }
  };

  return (
    <section style={{ ...panel, padding: 20 }}>
      <div className="section-head" style={{ marginBottom: 12 }}>
        <div>
          <p className="eyebrow">Version history</p>
          <h2 style={{ margin: '4px 0 0' }}>{versions.length} saved version{versions.length > 1 ? 's' : ''}</h2>
          <p className="muted" style={{ marginTop: 6 }}>Select two versions to compare them loudness-matched.</p>
        </div>
      </div>

      {compareSources.length === 2 && (
        <div style={{ marginBottom: 16 }}>
          <ABPlayer key={compareIds.join('-')} sources={compareSources} />
        </div>
      )}

      {versions.map((v) => {
        const color = KIND_COLORS[v.type] || '#55e9ff';
        const displayName = v.custom_name || v.version_label || v.name || 'Version';
        const dlLinks = [
          v.download_url && ['Download', v.download_url],
          ...(Array.isArray(v.assets) ? v.assets.filter((a) => a?.download_url).map((a) => [a.type || a.name || 'Asset', a.download_url]) : []),
        ].filter(Boolean).slice(0, 4);
        return (
          <div key={v.id} style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '12px 0' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', paddingTop: 3, cursor: 'pointer' }} title="Select for comparison">
                <input type="checkbox" checked={compareIds.includes(v.id)} onChange={() => toggleCompare(v.id)} />
              </label>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase' }}>{(v.type || '').replace('-render', '')}</span>
                  {renaming === v.id ? (
                    <span style={{ display: 'inline-flex', gap: 6 }}>
                      <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus
                        style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, padding: '3px 8px', color: 'inherit', fontSize: 13 }} />
                      <button className="primary" style={{ fontSize: 11, padding: '3px 10px' }}
                        onClick={() => { updateAsset(v.id, () => ({ custom_name: renameValue.trim() || undefined })); setRenaming(null); }}>
                        <Check size={12} />
                      </button>
                    </span>
                  ) : (
                    <b style={{ fontSize: 14 }}>{displayName}</b>
                  )}
                  {v.is_final && <span className="pill" style={{ color: '#57f09c', borderColor: 'rgba(87,240,156,.4)', background: 'rgba(87,240,156,.1)', fontSize: 10 }}>★ Final</span>}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(245,248,255,.45)', marginTop: 3 }}>
                  {formatDate(v.created_at || v.linked_at)}
                  {v.parameters?.mode && ` · ${v.parameters.mode}`}
                  {v.parameters?.platform && ` · ${v.parameters.platform}`}
                  {v.qc?.after?.integrated_lufs != null && ` · ${v.qc.after.integrated_lufs} LUFS measured`}
                </div>
                {showParams === v.id && v.parameters && (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(245,248,255,.6)', background: 'rgba(0,0,0,.25)', borderRadius: 8, padding: '8px 10px', fontFamily: 'monospace' }}>
                    {Object.entries(v.parameters).map(([k, val]) => `${k}: ${val ?? 'auto'}`).join(' · ')}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 5, flexShrink: 0, flexWrap: 'wrap' }}>
                {dlLinks.map(([label, url]) => (
                  <a key={label} className="secondary" href={resolveAssetUrl(url)} download title={label}
                    style={{ fontSize: 11, padding: '5px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Download size={11} /> {label}
                  </a>
                ))}
                {!demo && (
                  <>
                    {v.parameters && (
                      <>
                        <button className="secondary" style={{ fontSize: 11, padding: '5px 9px' }} title="Show settings"
                          onClick={() => setShowParams(showParams === v.id ? null : v.id)}>⚙</button>
                        <button className="secondary" style={{ fontSize: 11, padding: '5px 9px' }} title="Restore these settings"
                          onClick={() => restoreSettings(v)}>↩</button>
                      </>
                    )}
                    <button className="secondary" style={{ fontSize: 11, padding: '5px 9px' }} title="Rename"
                      onClick={() => { setRenaming(v.id); setRenameValue(v.custom_name || v.version_label || ''); }}>
                      <Pencil size={11} />
                    </button>
                    <button className="secondary" style={{ fontSize: 11, padding: '5px 9px', color: v.is_final ? '#57f09c' : undefined }} title="Mark as final"
                      onClick={() => updateAsset(v.id, (a) => ({ is_final: !a.is_final }))}>
                      <Star size={11} />
                    </button>
                    <button className="secondary" style={{ fontSize: 11, padding: '5px 9px', color: '#ffb4b4' }} title="Delete version"
                      onClick={() => { if (window.confirm(`Delete "${displayName}"? The record is removed from this project.`)) updateAsset(v.id, null); }}>
                      <Trash2 size={11} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
