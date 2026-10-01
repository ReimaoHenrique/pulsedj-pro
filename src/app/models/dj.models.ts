export interface HotCue {
  id: number;
  time: number; // in seconds
  color: string;
  name?: string;
}

export type PadMode = 'HOT_CUE' | 'PAD_FX' | 'BEAT_LOOP' | 'SAMPLER' | 'STEMS';

export type ColorFxType = 'FILTER' | 'NOISE' | 'CRUSH' | 'ECHO';

export type FxType = 'DELAY' | 'REVERB' | 'FLANGER' | 'BITCRUSHER' | 'ROLL';

export type CrossfaderCurve = 'SMOOTH' | 'LINEAR' | 'FAST_CUT';

export interface StemsState {
  vocals: number; // 0 to 1
  melody: number; // 0 to 1
  bass: number;   // 0 to 1
  drums: number;  // 0 to 1
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  originalBpm: number;
  key: string;        // e.g. "8A" (A minor)
  musicalKey: string; // e.g. "Am"
  duration: number;   // seconds
  genre: string;
  rating: number;     // 1 to 5
  color: string;
  artwork?: string;
  peaks?: number[];   // Waveform summary peaks (0-1)
  multiPeaks?: { low: number[]; mid: number[]; high: number[] };
  audioBuffer?: AudioBuffer;
  isProcedural?: boolean;
  proceduralTheme?: string;
  fileName?: string;
}

export interface DeckState {
  id: 'A' | 'B';
  track: Track | null;
  isPlaying: boolean;
  isCueActive: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number; // 1.0 = normal
  tempoPercent: number; // -100 to +100
  pitchRange: number;   // 6, 10, 16, 100 (%)
  masterTempo: boolean; // Key lock
  sync: boolean;
  loopActive: boolean;
  loopIn: number | null;
  loopOut: number | null;
  loopSize: number;     // beats, e.g. 4
  hotCues: HotCue[];
  activePadMode: PadMode;
  stems: StemsState;
  jogAngle: number;
  isScratching: boolean;
  vinylMode: boolean;
  slipMode: boolean;
  reverse: boolean;
  vuLevel: { left: number; right: number; peak: number };
  gridOffset: number;
}

export interface ChannelMixerState {
  deckId: 'A' | 'B';
  gain: number;         // 0 to 2 (1 = 0dB)
  eqHigh: number;       // -26 to +6 dB (0 = 0dB)
  eqMid: number;        // -26 to +6 dB
  eqLow: number;        // -26 to +6 dB
  colorFx: number;      // -100 to +100 (0 = off)
  colorFxType: ColorFxType;
  faderVolume: number;  // 0 to 1
  pflCue: boolean;      // Headphone monitor
}

export interface MasterMixerState {
  masterVolume: number; // 0 to 1
  boothVolume: number;  // 0 to 1
  headphoneMix: number; // 0 to 1 (Cue to Master)
  headphoneGain: number;// 0 to 1
  crossfader: number;   // -1 (Left) to +1 (Right), 0 = center
  crossfaderCurve: CrossfaderCurve;
  vuMaster: { left: number; right: number; peak: number };
  isRecording: boolean;
  recordingDuration: number;
}

export interface FxUnitState {
  active: boolean;
  type: FxType;
  dryWet: number;    // 0 to 100 (%)
  param1: number;    // Beat multiplier or rate (0.25, 0.5, 1, 2, 4)
  param2: number;    // Feedback / Resonance / Depth (0 to 1)
  assignedDeck: 'A' | 'B' | 'MASTER';
}

export interface SamplerPad {
  id: number;
  name: string;
  color: string;
  type: 'KICK' | 'SNARE' | 'HIHAT' | 'AIRHORN' | 'LASER' | 'DROP' | 'SCRATCH' | 'VOX';
  volume: number;
}
