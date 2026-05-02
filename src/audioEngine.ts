import type { BeatPattern, GenreDefinition } from './beatLibrary';

export const audioBufferToWav = (buffer: AudioBuffer) => {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.length;
  const dataSize = samples * numberOfChannels * 2;
  const output = new ArrayBuffer(44 + dataSize);
  const view = new DataView(output);

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let sample = 0; sample < samples; sample += 1) {
    for (let channel = 0; channel < numberOfChannels; channel += 1) {
      const value = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[sample]));
      view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([output], { type: 'audio/wav' });
};

const envelope = (gain: GainNode, start: number, peak: number, decay: number) => {
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + decay);
};

const scheduleKick = (context: OfflineAudioContext, master: GainNode, time: number, genre: GenreDefinition) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.connect(gain).connect(master);
  oscillator.frequency.setValueAtTime(genre.kick.pitch, time);
  oscillator.frequency.exponentialRampToValueAtTime(genre.kick.subPitch ?? 42, time + genre.kick.decay);
  envelope(gain, time, genre.kick.gain, genre.kick.decay);
  oscillator.start(time);
  oscillator.stop(time + genre.kick.decay + 0.02);
};

const scheduleSnare = (context: OfflineAudioContext, master: GainNode, time: number, genre: GenreDefinition) => {
  const duration = genre.snare.decay + 0.05;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = genre.snare.toneFreq * 9;
  source.connect(filter).connect(gain).connect(master);
  envelope(gain, time, genre.snare.gain, genre.snare.decay);
  source.start(time);
  source.stop(time + duration);

  const tone = context.createOscillator();
  const toneGain = context.createGain();
  tone.frequency.value = genre.snare.toneFreq;
  tone.connect(toneGain).connect(master);
  envelope(toneGain, time, genre.snare.gain * 0.28, Math.min(0.08, genre.snare.decay));
  tone.start(time);
  tone.stop(time + 0.1);
};

const scheduleHat = (context: OfflineAudioContext, master: GainNode, time: number, genre: GenreDefinition, open = false) => {
  const duration = open ? 0.28 : genre.hat.decay;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.value = genre.hat.hpFreq ?? 7500;
  source.connect(filter).connect(gain).connect(master);
  envelope(gain, time, genre.hat.gain * (open ? 0.9 : 1), duration);
  source.start(time);
  source.stop(time + duration + 0.02);
};

const scheduleBass = (context: OfflineAudioContext, master: GainNode, time: number, genre: GenreDefinition, frequency: number) => {
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  oscillator.type = genre.bass.type;
  oscillator.frequency.value = frequency;
  filter.type = 'lowpass';
  filter.frequency.value = genre.bass.lpFreq;
  oscillator.connect(filter).connect(gain).connect(master);
  envelope(gain, time, genre.bass.gain, genre.bass.decay);
  oscillator.start(time);
  oscillator.stop(time + genre.bass.decay + 0.02);
};

export const renderBeatPatternToWav = async (genre: GenreDefinition, beat: BeatPattern, bars = 4) => {
  const sampleRate = 44100;
  const stepDuration = 60 / genre.bpm / 4;
  const duration = stepDuration * 16 * bars + 0.75;
  const context = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
  const master = context.createGain();
  master.gain.value = 0.78;
  master.connect(context.destination);

  for (let bar = 0; bar < bars; bar += 1) {
    for (let step = 0; step < 16; step += 1) {
      const swingOffset = step % 2 === 1 ? stepDuration * genre.swing : 0;
      const time = bar * 16 * stepDuration + step * stepDuration + swingOffset;
      if (beat.k[step]) scheduleKick(context, master, time, genre);
      if (beat.s[step]) scheduleSnare(context, master, time, genre);
      if (beat.h[step]) scheduleHat(context, master, time, genre, false);
      if (beat.o[step]) scheduleHat(context, master, time, genre, true);
      if (beat.b[step]) scheduleBass(context, master, time, genre, beat.b[step]);
    }
  }

  const buffer = await context.startRendering();
  return audioBufferToWav(buffer);
};

export const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'audiomagic';
