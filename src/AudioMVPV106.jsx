import AudioMVPV104 from './AudioMVPV104.jsx';

const qaPanel = {
  position: 'fixed',
  left: 18,
  right: 18,
  bottom: 18,
  zIndex: 10000,
  maxWidth: 980,
  margin: '0 auto',
  padding: '12px 14px',
  borderRadius: 18,
  border: '1px solid rgba(85,233,255,.26)',
  background: 'rgba(9,11,20,.82)',
  backdropFilter: 'blur(16px)',
  color: '#f5f8ff',
  boxShadow: '0 18px 70px rgba(0,0,0,.36)',
};

const chip = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 10px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,.10)',
  background: 'rgba(255,255,255,.05)',
  color: 'rgba(245,248,255,.78)',
  fontSize: 12,
  fontWeight: 800,
};

export default function AudioMVPV106(props) {
  return (
    <>
      <AudioMVPV104 {...props} />
      {props.open ? (
        <div data-infinity-auth="true" style={qaPanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <strong style={{ color: '#55e9ff' }}>v10.6 QA mode</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={chip}>Use MP3/WAV under 20 MB</span>
              <span style={chip}>Validate before/after preview</span>
              <span style={chip}>Check Master WAV/MP3</span>
              <span style={chip}>Confirm project Masters count</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
