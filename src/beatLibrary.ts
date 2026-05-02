export type OscillatorWave = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface BeatPattern {
  name: string;
  k: number[];
  s: number[];
  h: number[];
  o: number[];
  b: number[];
}

export interface GenreDefinition {
  id: string;
  name: string;
  emoji: string;
  color: string;
  bpm: number;
  swing: number;
  desc: string;
  kick: { pitch: number; decay: number; gain: number; subPitch?: number };
  snare: { toneFreq: number; decay: number; gain: number; noiseMix?: number };
  hat: { gain: number; decay: number; hpFreq?: number };
  bass: { type: OscillatorWave; gain: number; decay: number; lpFreq: number };
  beats: BeatPattern[];
}

export const NOTE_FREQUENCIES ={A1:55,E1:41.2,D1:36.7,G1:49,C2:65.4,F1:43.7,Bb1:58.3,Ab1:51.9,B1:61.7};

// ─── GENRE DEFINITIONS ────────────────────────────────────────────────────────
export const GENRES: GenreDefinition[] =[
  {id:"hiphop",name:"Hip-Hop",emoji:"🎤",color:"#FF6B35",bpm:92,swing:0.1,desc:"Classic boom bap groove",
   kick:{pitch:75,decay:0.48,gain:0.92},snare:{toneFreq:220,decay:0.2,gain:0.55},
   hat:{gain:0.2,decay:0.05},bass:{type:"sine",gain:0.65,decay:0.38,lpFreq:200},
   beats:[
    {name:"Boom Bap Classic",
     k:[1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0],s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
     h:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,1],o:[0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
     b:[NOTE_FREQUENCIES.A1,0,0,0,0,0,NOTE_FREQUENCIES.E1,0,NOTE_FREQUENCIES.A1,0,0,0,0,0,0,0]},
    {name:"East Coast Flow",
     k:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0],s:[0,0,0,0,1,0,0,0,0,0,0,1,1,0,0,0],
     h:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],o:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
     b:[NOTE_FREQUENCIES.E1,0,0,0,0,0,NOTE_FREQUENCIES.A1,0,0,0,NOTE_FREQUENCIES.D1,0,0,NOTE_FREQUENCIES.A1,0,0]},
    {name:"Underground Knock",
     k:[1,0,1,0,0,0,0,0,1,0,0,0,0,1,0,0],s:[0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,0],
     h:[1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1],o:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
     b:[NOTE_FREQUENCIES.A1,0,NOTE_FREQUENCIES.A1,0,0,0,0,0,NOTE_FREQUENCIES.G1,0,0,0,0,NOTE_FREQUENCIES.E1,0,0]},
  ]},
  {id:"rnb",name:"R&B",emoji:"🎵",color:"#E91E8C",bpm:86,swing:0.15,desc:"Smooth & soulful groove",
   kick:{pitch:65,decay:0.5,gain:0.8},snare:{toneFreq:180,decay:0.22,gain:0.48,noiseMix:0.6},
   hat:{gain:0.18,decay:0.06,hpFreq:8000},bass:{type:"sine",gain:0.6,decay:0.42,lpFreq:180},
   beats:[
    {name:"Silky Groove",
     k:[1,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0],s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
     h:[1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],o:[0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0],
     b:[NOTE_FREQUENCIES.Ab1,0,0,0,0,0,NOTE_FREQUENCIES.Ab1,0,0,0,NOTE_FREQUENCIES.F1,0,0,NOTE_FREQUENCIES.G1,0,0]},
    {name:"Slow Jam",
     k:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
     h:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],o:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
     b:[NOTE_FREQUENCIES.F1,0,0,0,0,0,0,0,NOTE_FREQUENCIES.Bb1,0,0,0,0,0,0,0]},
    {name:"Neo Soul",
     k:[1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0],s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1],
     h:[1,0,1,1,0,1,1,0,1,0,1,1,0,1,0,1],o:[0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0],
     b:[NOTE_FREQUENCIES.D1,0,0,NOTE_FREQUENCIES.D1,0,0,NOTE_FREQUENCIES.A1,0,0,NOTE_FREQUENCIES.G1,0,0,NOTE_FREQUENCIES.F1,0,0,0]},
  ]},
  {id:"trap",name:"Trap",emoji:"🔥",color:"#9B59B6",bpm:140,swing:0,desc:"Hard-hitting 808 trap",
   kick:{pitch:55,decay:0.55,gain:0.95,subPitch:30},snare:{toneFreq:300,decay:0.15,gain:0.7,noiseMix:0.9},
   hat:{gain:0.15,decay:0.025,hpFreq:9000},bass:{type:"sawtooth",gain:0.7,decay:0.5,lpFreq:120},
   beats:[
    {name:"Hard Trap",
     k:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
     h:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],o:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
     b:[NOTE_FREQUENCIES.A1,0,0,0,0,0,0,0,NOTE_FREQUENCIES.E1,0,0,0,0,0,0,0]},
    {name:"Roll Pattern",
     k:[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0],s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0],
     h:[1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1],o:[0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0],
     b:[NOTE_FREQUENCIES.G1,0,0,0,0,0,NOTE_FREQUENCIES.F1,0,0,0,0,0,NOTE_FREQUENCIES.A1,0,0,0]},
    {name:"Hi-Hat Tornado",
     k:[1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0],s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
     h:[1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1],o:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
     b:[NOTE_FREQUENCIES.E1,0,0,0,0,0,0,0,NOTE_FREQUENCIES.D1,0,NOTE_FREQUENCIES.D1,0,0,0,0,0]},
  ]},
  {id:"afrobeat",name:"Afrobeat",emoji:"🌍",color:"#27AE60",bpm:108,swing:0.05,desc:"Syncopated polyrhythmic feel",
   kick:{pitch:70,decay:0.38,gain:0.82},snare:{toneFreq:250,decay:0.14,gain:0.52,noiseMix:0.65},
   hat:{gain:0.25,decay:0.055,hpFreq:7500},bass:{type:"sine",gain:0.58,decay:0.32,lpFreq:220},
   beats:[
    {name:"Lagos Bounce",
     k:[1,0,0,1,0,1,0,0,1,0,0,1,0,0,1,0],s:[0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0],
     h:[1,1,0,1,1,0,1,1,1,1,0,1,1,0,1,1],o:[0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
     b:[NOTE_FREQUENCIES.D1,0,0,NOTE_FREQUENCIES.D1,0,NOTE_FREQUENCIES.A1,0,0,NOTE_FREQUENCIES.G1,0,0,NOTE_FREQUENCIES.G1,0,0,NOTE_FREQUENCIES.F1,0]},
    {name:"Amapiano Groove",
     k:[1,0,1,0,0,0,1,0,1,0,0,0,0,1,0,0],s:[0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,0],
     h:[1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0],o:[0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
     b:[NOTE_FREQUENCIES.G1,0,NOTE_FREQUENCIES.G1,0,0,0,NOTE_FREQUENCIES.C2,0,NOTE_FREQUENCIES.Bb1,0,0,0,0,NOTE_FREQUENCIES.A1,0,0]},
    {name:"Afropop Pulse",
     k:[1,0,0,0,1,0,1,0,0,0,1,0,0,0,0,0],s:[0,0,1,0,0,0,0,0,0,0,1,0,1,0,0,1],
     h:[1,1,1,0,1,1,1,0,1,1,1,0,1,1,0,1],o:[0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0],
     b:[NOTE_FREQUENCIES.A1,0,0,0,NOTE_FREQUENCIES.G1,0,NOTE_FREQUENCIES.G1,0,0,0,NOTE_FREQUENCIES.F1,0,0,0,0,0]},
  ]},
  {id:"jazz",name:"Jazz",emoji:"🎷",color:"#F39C12",bpm:132,swing:0.33,desc:"Swung ride cymbal feel",
   kick:{pitch:60,decay:0.35,gain:0.65},snare:{toneFreq:160,decay:0.12,gain:0.38,noiseMix:0.5},
   hat:{gain:0.28,decay:0.12,hpFreq:6000},bass:{type:"sine",gain:0.52,decay:0.25,lpFreq:280},
   beats:[
    {name:"Swing Standard",
     k:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
     h:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],o:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
     b:[NOTE_FREQUENCIES.E1,0,0,0,0,0,0,0,NOTE_FREQUENCIES.A1,0,0,0,0,NOTE_FREQUENCIES.D1,0,0]},
    {name:"Jazz Waltz",
     k:[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0],s:[0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0],
     h:[1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0],o:[0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0],
     b:[NOTE_FREQUENCIES.A1,0,0,0,0,0,NOTE_FREQUENCIES.G1,0,0,0,0,0,NOTE_FREQUENCIES.C2,0,0,0]},
    {name:"Bebop Drive",
     k:[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],s:[0,0,1,0,1,0,0,0,0,1,0,0,1,0,0,1],
     h:[1,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1],o:[0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0],
     b:[NOTE_FREQUENCIES.D1,0,0,0,0,0,0,0,0,0,NOTE_FREQUENCIES.A1,0,NOTE_FREQUENCIES.G1,0,NOTE_FREQUENCIES.F1,0]},
  ]},
  {id:"lofi",name:"Lo-Fi",emoji:"☁️",color:"#7F8C8D",bpm:78,swing:0.25,desc:"Dusty chill beats",
   kick:{pitch:65,decay:0.42,gain:0.72},snare:{toneFreq:170,decay:0.25,gain:0.42,noiseMix:0.55},
   hat:{gain:0.12,decay:0.08,hpFreq:6500},bass:{type:"sine",gain:0.48,decay:0.45,lpFreq:180},
   beats:[
    {name:"Chill Tape",
     k:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
     h:[1,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],o:[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0],
     b:[NOTE_FREQUENCIES.F1,0,0,0,0,0,0,0,NOTE_FREQUENCIES.G1,0,0,0,0,0,0,0]},
    {name:"Rainy Day",
     k:[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0],s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
     h:[1,0,0,1,0,0,1,0,1,0,0,0,0,1,0,0],o:[0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
     b:[NOTE_FREQUENCIES.D1,0,0,0,0,0,NOTE_FREQUENCIES.D1,0,0,0,NOTE_FREQUENCIES.E1,0,0,0,0,0]},
    {name:"Late Night",
     k:[1,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0],s:[0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,0],
     h:[1,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0],o:[0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0],
     b:[NOTE_FREQUENCIES.A1,0,0,0,0,0,0,0,0,NOTE_FREQUENCIES.G1,0,0,NOTE_FREQUENCIES.F1,0,0,0]},
  ]},
  {id:"drill",name:"Drill",emoji:"🖤",color:"#E74C3C",bpm:144,swing:0,desc:"Dark sliding 808 drill",
   kick:{pitch:45,decay:0.6,gain:0.98,subPitch:25},snare:{toneFreq:280,decay:0.13,gain:0.72,noiseMix:0.88},
   hat:{gain:0.14,decay:0.022,hpFreq:9500},bass:{type:"sawtooth",gain:0.75,decay:0.6,lpFreq:100},
   beats:[
    {name:"UK Dark",
     k:[1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0],s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
     h:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],o:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
     b:[NOTE_FREQUENCIES.E1,0,0,0,0,0,0,0,NOTE_FREQUENCIES.D1,0,NOTE_FREQUENCIES.D1,0,0,0,0,0]},
    {name:"Brooklyn Menace",
     k:[1,0,0,0,0,0,1,0,0,0,0,0,1,0,1,0],s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1],
     h:[1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1],o:[0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0],
     b:[NOTE_FREQUENCIES.A1,0,0,0,0,0,NOTE_FREQUENCIES.G1,0,0,0,0,0,NOTE_FREQUENCIES.A1,0,NOTE_FREQUENCIES.E1,0]},
    {name:"Grim Atmosphere",
     k:[1,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0],s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
     h:[1,1,1,0,1,1,0,1,1,0,1,1,0,1,1,1],o:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
     b:[NOTE_FREQUENCIES.D1,0,0,0,0,0,0,0,NOTE_FREQUENCIES.D1,0,0,NOTE_FREQUENCIES.E1,0,0,0,0]},
  ]},
  {id:"dancehall",name:"Dancehall",emoji:"🌴",color:"#1ABC9C",bpm:96,swing:0.05,desc:"Riddim & island vibes",
   kick:{pitch:72,decay:0.38,gain:0.85},snare:{toneFreq:230,decay:0.16,gain:0.58,noiseMix:0.72},
   hat:{gain:0.22,decay:0.045,hpFreq:8000},bass:{type:"sine",gain:0.62,decay:0.36,lpFreq:220},
   beats:[
    {name:"One Drop Riddim",
     k:[0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
     h:[1,0,1,1,0,1,1,0,1,0,1,1,0,1,1,0],o:[0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0],
     b:[NOTE_FREQUENCIES.A1,0,0,0,NOTE_FREQUENCIES.A1,0,0,0,NOTE_FREQUENCIES.G1,0,0,0,NOTE_FREQUENCIES.A1,0,0,0]},
    {name:"Steppers",
     k:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],s:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,1],
     h:[1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],o:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
     b:[NOTE_FREQUENCIES.D1,0,0,0,NOTE_FREQUENCIES.A1,0,0,0,NOTE_FREQUENCIES.G1,0,0,0,NOTE_FREQUENCIES.D1,0,0,0]},
    {name:"Island Summer",
     k:[1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0],s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
     h:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],o:[0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0],
     b:[NOTE_FREQUENCIES.G1,0,0,NOTE_FREQUENCIES.G1,0,0,NOTE_FREQUENCIES.F1,0,0,NOTE_FREQUENCIES.Bb1,0,0,NOTE_FREQUENCIES.A1,0,0,0]},
  ]},
];

