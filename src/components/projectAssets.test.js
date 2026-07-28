import { describe, expect, it } from 'vitest';
import { exportPackages, formatBytes, generatedSounds, isMaster, masteredVersions, releasePackages } from './projectAssets.jsx';

const project = {
  analysis: {
    generated_sounds: [
      { id: '1', type: 'master', name: 'Master — song' },
      { id: '2', type: 'mix-render', name: 'Mix — song' },
      { id: '3', type: 'export-package', name: 'Export — song' },
      { id: '4', source: 'sound-lab', name: 'Pad texture' },
      { id: '5', name: 'Release package v1', type: 'release' },
    ],
    export_packages: [{ id: 'e1', name: 'Direct export' }],
  },
};

describe('asset classification', () => {
  it('classifies masters', () => {
    expect(masteredVersions(project).map((a) => a.id)).toEqual(['1']);
    expect(isMaster({ type: 'master' })).toBe(true);
  });
  it('classifies releases and exports', () => {
    expect(releasePackages(project).map((a) => a.id)).toEqual(['5']);
    expect(exportPackages(project).map((a) => a.id)).toEqual(['e1', '3']);
  });
  it('classifies generated sounds as the remainder', () => {
    expect(generatedSounds(project).map((a) => a.id)).toEqual(['2', '4']);
  });
  it('handles empty projects', () => {
    expect(masteredVersions({})).toEqual([]);
    expect(exportPackages(null)).toEqual([]);
  });
});

describe('formatBytes', () => {
  it('formats sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1048576)).toBe('1.0 MB');
  });
});
