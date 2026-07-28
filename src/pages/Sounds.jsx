import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useSession } from '../auth/SessionContext.jsx';
import { generateSoundOnBackend } from '../api/infinityBackend.js';
import { DemoBadge, SoundRow, generatedSounds, panel, resolveAssetUrl } from '../components/projectAssets.jsx';

export default function SoundsPage() {
  const { projects, demoMode } = useSession();
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('Cinematic');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const existing = projects.flatMap((p) => generatedSounds(p).map((s) => ({ ...s, _project: p.title })));

  const generate = async () => {
    if (!prompt.trim()) { setError('Describe the sound you need first.'); return; }
    setBusy(true); setError(''); setResult(null);
    try {
      const res = await generateSoundOnBackend(prompt.trim(), 68, genre, 'Neutral');
      const payload = res?.result || res;
      setResult(payload);
      const assetsList = payload?.assets || payload?.variations || [];
      if (assetsList.length) {
        window.dispatchEvent(new CustomEvent('infinity:project-sound', {
          detail: { name: prompt.trim(), prompt: prompt.trim(), genre, source: 'sound-lab', assets: assetsList, created_at: new Date().toISOString() },
        }));
      }
    } catch (err) {
      setError(err?.message || 'Sound generation failed. The backend may be waking up — try again in 30 seconds.');
    } finally { setBusy(false); }
  };

  return (
    <div className="view" style={{ display: 'grid', gap: 18 }}>
      <section style={{ ...panel, padding: 22 }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Sound Lab {demoMode && <DemoBadge />}</p>
            <h2>Experimental synthesised sound generator</h2>
            <p className="muted wide">
              This generator produces short synthesised WAV textures from your prompt using a
              deterministic backend synthesiser. It is <b>not</b> a full generative-music model —
              results are simple tonal pads and textures, useful as layers and transitions.
            </p>
          </div>
        </div>

        {demoMode ? (
          <p className="muted">Sound generation is disabled for the demo account. Sign in with a local or cloud account to generate real assets.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <label className="auth-field">Describe the sound
              <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. warm evolving pad with slow attack" />
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={genre} onChange={(e) => setGenre(e.target.value)} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '10px 14px', color: 'inherit' }}>
                <option>Cinematic</option><option>Afrobeat</option><option>Trap</option><option>House</option><option>Gospel</option><option>Soul</option><option>Experimental</option>
              </select>
              <button className="primary" onClick={generate} disabled={busy}><Sparkles size={15} /> {busy ? 'Generating…' : 'Generate sound'}</button>
            </div>
            {error && <div style={{ border: '1px solid rgba(255,90,90,.35)', background: 'rgba(255,90,90,.1)', color: '#ffd8d8', borderRadius: 14, padding: 12 }}>{error}</div>}
            {result && (
              <div style={{ border: '1px solid rgba(87,240,156,.28)', background: 'rgba(87,240,156,.06)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 800, color: '#57f09c', marginBottom: 8 }}>Generated {result.assets?.length || result.variations?.length || 0} variation(s)</div>
                {(result.assets || result.variations || []).map((asset, i) => (
                  <div key={asset.asset_id || i} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{asset.name || `Variation ${i + 1}`} · {asset.duration_seconds ? `${asset.duration_seconds}s` : ''}</div>
                    {asset.download_url && <audio controls src={resolveAssetUrl(asset.download_url)} style={{ width: '100%', marginTop: 6, height: 32 }} />}
                    {asset.download_url && <a className="secondary" href={resolveAssetUrl(asset.download_url)} download style={{ display: 'inline-block', marginTop: 6, padding: '6px 12px', fontSize: 12 }}>Download WAV</a>}
                  </div>
                ))}
                <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Saved to your active project's library.</p>
              </div>
            )}
          </div>
        )}
      </section>

      <section style={{ ...panel, padding: 22 }}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Previously generated</p>
            <h2>Your sound assets</h2>
          </div>
        </div>
        {existing.length === 0 ? (
          <p className="muted">No generated sounds yet. Your generated assets will appear here, attached to their project.</p>
        ) : (
          existing.map((s, i) => <SoundRow key={s.id || i} sound={s} projectLabel={s._project} />)
        )}
      </section>
    </div>
  );
}
