import { Injectable, signal, computed, effect } from '@angular/core';
import {
  Track,
  DeckState,
  ChannelMixerState,
  MasterMixerState,
  FxUnitState,
  SamplerPad,
  HotCue,
  PadMode,
  ColorFxType,
  FxType,
  CrossfaderCurve,
} from '../models/dj.models';

interface DeckAudioNodes {
  source: AudioBufferSourceNode | null;
  gainNode: GainNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  colorFilter: BiquadFilterNode;
  faderGain: GainNode;
  crossfadeGain: GainNode;
  analyser: AnalyserNode;
  stemsGain: {
    drums: GainNode;
    bass: GainNode;
    melody: GainNode;
    vocals: GainNode;
  };
  analyserData: Uint8Array;
}

@Injectable({
  providedIn: 'root',
})
export class AudioEngineService {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private masterAnalyser!: AnalyserNode;
  private masterAnalyserData!: Uint8Array;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingTimerInterval: any = null;

  // Deck audio nodes
  private deckNodes: { A: DeckAudioNodes; B: DeckAudioNodes } = {} as any;

  // Track playback time tracking
  private playStartTimes: { A: number; B: number } = { A: 0, B: 0 };
  private playOffsets: { A: number; B: number } = { A: 0, B: 0 };
  private animFrameId: number | null = null;

  // Signals
  readonly library = signal<Track[]>([]);
  readonly deckA = signal<DeckState>(this.createInitialDeckState('A'));
  readonly deckB = signal<DeckState>(this.createInitialDeckState('B'));
  readonly channelA = signal<ChannelMixerState>(this.createInitialChannelState('A'));
  readonly channelB = signal<ChannelMixerState>(this.createInitialChannelState('B'));
  readonly master = signal<MasterMixerState>(this.createInitialMasterState());
  readonly fx1 = signal<FxUnitState>({
    active: false,
    type: 'DELAY',
    dryWet: 40,
    param1: 0.5,
    param2: 0.6,
    assignedDeck: 'A',
  });
  readonly fx2 = signal<FxUnitState>({
    active: false,
    type: 'REVERB',
    dryWet: 35,
    param1: 1.0,
    param2: 0.7,
    assignedDeck: 'B',
  });

  readonly samplerPads = signal<SamplerPad[]>([
    { id: 1, name: 'CLUB KICK', color: '#ff2d55', type: 'KICK', volume: 0.9 },
    { id: 2, name: 'PUNCH SNARE', color: '#ff9500', type: 'SNARE', volume: 0.85 },
    { id: 3, name: 'OPEN HIHAT', color: '#ffcc00', type: 'HIHAT', volume: 0.75 },
    { id: 4, name: 'AIR HORN', color: '#34c759', type: 'AIRHORN', volume: 0.95 },
    { id: 5, name: 'LASER DROP', color: '#00c7be', type: 'LASER', volume: 0.8 },
    { id: 6, name: 'SUB DROP', color: '#30b0c7', type: 'DROP', volume: 0.9 },
    { id: 7, name: 'VINYL SCRATCH', color: '#5856d6', type: 'SCRATCH', volume: 0.85 },
    { id: 8, name: 'VOX SHOUT', color: '#af52de', type: 'VOX', volume: 0.9 },
  ]);

  constructor() {
    this.initAudioContext();
    this.generateDemoTracks();
    this.startAudioLoop();
  }

  private createInitialDeckState(id: 'A' | 'B'): DeckState {
    return {
      id,
      track: null,
      isPlaying: false,
      isCueActive: false,
      currentTime: 0,
      duration: 0,
      playbackRate: 1.0,
      tempoPercent: 0,
      pitchRange: 8,
      masterTempo: true,
      sync: false,
      loopActive: false,
      loopIn: null,
      loopOut: null,
      loopSize: 4,
      hotCues: [
        { id: 1, time: 0, color: '#ff3b30', name: 'INTRO' },
        { id: 2, time: 15.2, color: '#ff9500', name: 'BUILD' },
        { id: 3, time: 30.5, color: '#34c759', name: 'DROP' },
        { id: 4, time: 60.9, color: '#007aff', name: 'BREAK' },
        { id: 5, time: 76.2, color: '#af52de', name: 'DROP 2' },
        { id: 6, time: 106.6, color: '#5856d6', name: 'OUTRO' },
        { id: 7, time: 0, color: '#ff2d55', name: 'CUE 7' },
        { id: 8, time: 0, color: '#5ac8fa', name: 'CUE 8' },
      ],
      activePadMode: 'HOT_CUE',
      stems: { vocals: 1, melody: 1, bass: 1, drums: 1 },
      jogAngle: 0,
      isScratching: false,
      vinylMode: true,
      slipMode: false,
      reverse: false,
      vuLevel: { left: 0, right: 0, peak: 0 },
      gridOffset: 0,
    };
  }

  private createInitialChannelState(deckId: 'A' | 'B'): ChannelMixerState {
    return {
      deckId,
      gain: 1.0,
      eqHigh: 0,
      eqMid: 0,
      eqLow: 0,
      colorFx: 0,
      colorFxType: 'FILTER',
      faderVolume: 0.9,
      pflCue: false,
    };
  }

  private createInitialMasterState(): MasterMixerState {
    return {
      masterVolume: 0.85,
      boothVolume: 0.7,
      headphoneMix: 0.5,
      headphoneGain: 0.8,
      crossfader: 0,
      crossfaderCurve: 'SMOOTH',
      vuMaster: { left: 0, right: 0, peak: 0 },
      isRecording: false,
      recordingDuration: 0,
    };
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.setupMasterGraph();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private initAudioContext() {
    // Initial setup will be created on first interaction
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.setupMasterGraph();
      }
    } catch (e) {
      console.warn('AudioContext creation deferred until user interaction', e);
    }
  }

  private setupMasterGraph() {
    if (!this.ctx) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.master().masterVolume;

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 256;
    this.masterAnalyser.smoothingTimeConstant = 0.8;
    this.masterAnalyserData = new Uint8Array(this.masterAnalyser.frequencyBinCount);

    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);

    // Setup deck nodes for A and B
    this.setupDeckNodes('A');
    this.setupDeckNodes('B');
  }

  private setupDeckNodes(deckId: 'A' | 'B') {
    if (!this.ctx) return;

    const gainNode = this.ctx.createGain();
    const eqLow = this.ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 250;
    eqLow.gain.value = 0;

    const eqMid = this.ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 1000;
    eqMid.Q.value = 1.0;
    eqMid.gain.value = 0;

    const eqHigh = this.ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 3500;
    eqHigh.gain.value = 0;

    const colorFilter = this.ctx.createBiquadFilter();
    colorFilter.type = 'allpass';
    colorFilter.frequency.value = 1000;

    const faderGain = this.ctx.createGain();
    faderGain.gain.value = 0.9;

    const crossfadeGain = this.ctx.createGain();
    crossfadeGain.gain.value = 1.0;

    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;
    const analyserData = new Uint8Array(analyser.frequencyBinCount);

    // Stems sub-gains
    const stemsGain = {
      drums: this.ctx.createGain(),
      bass: this.ctx.createGain(),
      melody: this.ctx.createGain(),
      vocals: this.ctx.createGain(),
    };

    // Chain: Stems -> Gain -> EQ Low -> EQ Mid -> EQ High -> Color Filter -> Fader -> Crossfade -> Analyser -> Master
    gainNode.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(colorFilter);
    colorFilter.connect(faderGain);
    faderGain.connect(analyser);
    analyser.connect(crossfadeGain);
    crossfadeGain.connect(this.masterGain);

    this.deckNodes[deckId] = {
      source: null,
      gainNode,
      eqLow,
      eqMid,
      eqHigh,
      colorFilter,
      faderGain,
      crossfadeGain,
      analyser,
      stemsGain,
      analyserData,
    };

    this.updateCrossfaderGains();
  }

  // --- Procedural Demo Track Generation ---
  private generateDemoTracks() {
    const demoTracksData = [
      {
        id: 'track-1',
        title: 'Cyberpunk Hyperdrive',
        artist: 'Pulse System',
        bpm: 126,
        key: '8A',
        musicalKey: 'Am',
        duration: 120,
        genre: 'Tech House',
        rating: 5,
        color: '#00f0ff',
        proceduralTheme: 'tech-house',
      },
      {
        id: 'track-2',
        title: 'Neon Horizon',
        artist: 'Aetheria',
        bpm: 128,
        key: '11B',
        musicalKey: 'A Major',
        duration: 128,
        genre: 'Peak Techno',
        rating: 5,
        color: '#ff007f',
        proceduralTheme: 'techno',
      },
      {
        id: 'track-3',
        title: 'Deep Frequency',
        artist: 'Subsonic Lab',
        bpm: 124,
        key: '5A',
        musicalKey: 'C minor',
        duration: 135,
        genre: 'Melodic House',
        rating: 4,
        color: '#7928ca',
        proceduralTheme: 'melodic',
      },
      {
        id: 'track-4',
        title: 'Velocity Rush',
        artist: 'Krypton 88',
        bpm: 174,
        key: '4A',
        musicalKey: 'F minor',
        duration: 110,
        genre: 'Drum & Bass',
        rating: 5,
        color: '#ff9900',
        proceduralTheme: 'dnb',
      },
      {
        id: 'track-5',
        title: 'Acid Odyssey',
        artist: 'Modular 303',
        bpm: 130,
        key: '7A',
        musicalKey: 'D minor',
        duration: 140,
        genre: 'Acid Techno',
        rating: 4,
        color: '#00ff66',
        proceduralTheme: 'acid',
      },
      {
        id: 'track-6',
        title: 'Sunset Groove',
        artist: 'Solaris',
        bpm: 122,
        key: '9B',
        musicalKey: 'G Major',
        duration: 118,
        genre: 'Deep Groove',
        rating: 4,
        color: '#ffcc00',
        proceduralTheme: 'groove',
      },
    ];

    const tracks: Track[] = demoTracksData.map((d) => {
      const peaks = this.generateProceduralPeaks(800, d.bpm, d.genre);
      const multiPeaks = this.generateMultiBandPeaks(peaks);
      return {
        ...d,
        originalBpm: d.bpm,
        peaks,
        multiPeaks,
        isProcedural: true,
      };
    });

    this.library.set(tracks);

    // Auto load Track 1 into Deck A and Track 2 into Deck B
    this.loadTrackToDeck('A', tracks[0]);
    this.loadTrackToDeck('B', tracks[1]);
  }

  private generateProceduralPeaks(length: number, bpm: number, genre: string): number[] {
    const peaks: number[] = [];
    const bars = 32;
    for (let i = 0; i < length; i++) {
      const progress = i / length;
      let energy = 0.5;

      // Intro (0-15%)
      if (progress < 0.15) {
        energy = 0.3 + 0.3 * (progress / 0.15);
      }
      // Main 1 (15-40%)
      else if (progress < 0.4) {
        energy = 0.8 + 0.15 * Math.sin(progress * 40);
      }
      // Breakdown (40-50%)
      else if (progress < 0.5) {
        energy = 0.25 + 0.1 * Math.cos(progress * 30);
      }
      // Build-up (50-58%)
      else if (progress < 0.58) {
        energy = 0.4 + 0.5 * ((progress - 0.5) / 0.08);
      }
      // Drop 2 (58-85%)
      else if (progress < 0.85) {
        energy = 0.9 + 0.1 * Math.sin(progress * 50);
      }
      // Outro (85-100%)
      else {
        energy = 0.7 * (1 - (progress - 0.85) / 0.15);
      }

      // Add beat pulse
      const beatPulse = (Math.sin((progress * length * bpm) / 60) + 1) * 0.12;
      const noise = (Math.random() - 0.5) * 0.08;
      const peak = Math.min(1.0, Math.max(0.05, energy + beatPulse + noise));
      peaks.push(peak);
    }
    return peaks;
  }

  private generateMultiBandPeaks(peaks: number[]): { low: number[]; mid: number[]; high: number[] } {
    const low: number[] = [];
    const mid: number[] = [];
    const high: number[] = [];

    for (let i = 0; i < peaks.length; i++) {
      const p = peaks[i];
      const isKick = i % 4 === 0;
      low.push(Math.min(1.0, p * (isKick ? 1.2 : 0.6)));
      mid.push(Math.min(1.0, p * 0.85 + (Math.sin(i * 0.1) + 1) * 0.1));
      high.push(Math.min(1.0, p * 0.65 + (Math.random() * 0.3)));
    }

    return { low, mid, high };
  }

  // Synthesizes a real rich AudioBuffer on demand for seamless playback
  private createProceduralAudioBuffer(track: Track): AudioBuffer {
    const ctx = this.ensureContext();
    const sampleRate = ctx.sampleRate;
    const duration = track.duration;
    const totalSamples = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(2, totalSamples, sampleRate);

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const bpm = track.bpm;
    const bps = bpm / 60;
    const beatDuration = 1 / bps;
    const barDuration = beatDuration * 4;

    // Synthesize full rhythmic electronic track with kick, sub, hihats, synth leads & chord stabs
    for (let i = 0; i < totalSamples; i++) {
      const time = i / sampleRate;
      const beat = (time * bps) % 4;
      const bar = (time / barDuration) % 8;
      const progress = time / duration;

      let kick = 0;
      let hihat = 0;
      let clap = 0;
      let bass = 0;
      let synth = 0;

      const isBreakdown = (progress > 0.38 && progress < 0.5) || (bar >= 6 && bar < 8 && progress > 0.7);

      // Kick drum on 4-to-the-floor
      if (!isBreakdown) {
        const beatPos = (time * bps) % 1;
        if (beatPos < 0.2) {
          const kickEnv = Math.exp(-beatPos * 25);
          const kickFreq = 140 * Math.exp(-beatPos * 40) + 45;
          kick = Math.sin(2 * Math.PI * kickFreq * beatPos) * kickEnv * 0.85;
        }
      }

      // Claps on beats 2 & 4
      if (!isBreakdown && (beat >= 1 && beat < 1.2 || beat >= 3 && beat < 3.2)) {
        const clapPos = beat % 1;
        const clapEnv = Math.exp(-clapPos * 18);
        const noise = (Math.random() * 2 - 1) * 0.4;
        clap = noise * clapEnv;
      }

      // Hi-hats on off-beats
      const hatBeatPos = ((time * bps) + 0.5) % 1;
      if (hatBeatPos < 0.15) {
        const hatEnv = Math.exp(-hatBeatPos * 35);
        const noise = (Math.random() * 2 - 1) * 0.3;
        hihat = noise * hatEnv;
      }

      // Bassline (syncopated 16th groove)
      if (!isBreakdown) {
        const bass16th = (time * bps * 4) % 1;
        const noteIdx = Math.floor((time * bps * 2) % 4);
        const bassFreq = [55, 65.41, 48.99, 58.27][noteIdx] || 55;
        const bassEnv = Math.exp(-bass16th * 12);
        bass = (Math.sin(2 * Math.PI * bassFreq * time) + 0.4 * Math.sin(4 * Math.PI * bassFreq * time)) * bassEnv * 0.45;
      }

      // Lead Synth / Arpeggio Chords
      const arpStep = Math.floor((time * bps * 4) % 8);
      const arpFreqs = [220, 261.63, 329.63, 392, 440, 523.25, 659.25, 783.99];
      const leadFreq = arpFreqs[arpStep];
      const leadEnv = Math.exp(-((time * bps * 4) % 1) * 8);
      synth = (Math.sin(2 * Math.PI * leadFreq * time) + 0.3 * Math.sin(6 * Math.PI * leadFreq * time)) * leadEnv * 0.25;

      const masterMix = (kick + clap + hihat + bass + synth) * 0.7;
      left[i] = masterMix + synth * 0.1;
      right[i] = masterMix - synth * 0.1;
    }

    return buffer;
  }

  // --- Deck Loading & Transport ---
  loadTrackToDeck(deckId: 'A' | 'B', track: Track) {
    this.stop(deckId);
    this.ensureContext();

    if (!track.audioBuffer && track.isProcedural) {
      track.audioBuffer = this.createProceduralAudioBuffer(track);
    }

    const duration = track.audioBuffer ? track.audioBuffer.duration : track.duration;

    if (deckId === 'A') {
      this.deckA.update((d) => ({
        ...d,
        track,
        duration,
        currentTime: 0,
        isPlaying: false,
        isCueActive: false,
      }));
    } else {
      this.deckB.update((d) => ({
        ...d,
        track,
        duration,
        currentTime: 0,
        isPlaying: false,
        isCueActive: false,
      }));
    }

    this.playOffsets[deckId] = 0;
  }

  // Load custom user audio file from file input or drag-and-drop
  async loadUserAudioFile(deckId: 'A' | 'B', file: File): Promise<void> {
    const ctx = this.ensureContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    // Extract real peaks
    const rawData = audioBuffer.getChannelData(0);
    const step = Math.floor(rawData.length / 800);
    const peaks: number[] = [];
    for (let i = 0; i < 800; i++) {
      let max = 0;
      for (let j = 0; j < step; j++) {
        const val = Math.abs(rawData[i * step + j]);
        if (val > max) max = val;
      }
      peaks.push(max);
    }

    const multiPeaks = this.generateMultiBandPeaks(peaks);

    const customTrack: Track = {
      id: 'custom-' + Date.now(),
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Local Track',
      bpm: 128,
      originalBpm: 128,
      key: '8A',
      musicalKey: 'Am',
      duration: audioBuffer.duration,
      genre: 'Custom Audio',
      rating: 5,
      color: deckId === 'A' ? '#00f0ff' : '#ff007f',
      peaks,
      multiPeaks,
      audioBuffer,
      fileName: file.name,
    };

    // Add to library and load
    this.library.update((lib) => [customTrack, ...lib]);
    this.loadTrackToDeck(deckId, customTrack);
  }

  play(deckId: 'A' | 'B') {
    const ctx = this.ensureContext();
    const deck = deckId === 'A' ? this.deckA() : this.deckB();
    if (!deck.track || deck.isPlaying) return;

    const nodes = this.deckNodes[deckId];
    if (!nodes) return;

    if (nodes.source) {
      try {
        nodes.source.stop();
        nodes.source.disconnect();
      } catch (e) {}
    }

    if (!deck.track.audioBuffer && deck.track.isProcedural) {
      deck.track.audioBuffer = this.createProceduralAudioBuffer(deck.track);
    }

    if (!deck.track.audioBuffer) return;

    const source = ctx.createBufferSource();
    source.buffer = deck.track.audioBuffer;
    source.loop = true;

    // Rate from pitch slider & tempo
    source.playbackRate.value = deck.playbackRate;

    source.connect(nodes.gainNode);
    nodes.source = source;

    const offset = this.playOffsets[deckId] % deck.duration;
    source.start(0, offset);

    this.playStartTimes[deckId] = ctx.currentTime;

    if (deckId === 'A') {
      this.deckA.update((d) => ({ ...d, isPlaying: true, isCueActive: false }));
    } else {
      this.deckB.update((d) => ({ ...d, isPlaying: true, isCueActive: false }));
    }
  }

  pause(deckId: 'A' | 'B') {
    const deck = deckId === 'A' ? this.deckA() : this.deckB();
    if (!deck.isPlaying) return;

    const nodes = this.deckNodes[deckId];
    if (nodes?.source) {
      try {
        nodes.source.stop();
        nodes.source.disconnect();
      } catch (e) {}
      nodes.source = null;
    }

    if (this.ctx) {
      const elapsed = (this.ctx.currentTime - this.playStartTimes[deckId]) * deck.playbackRate;
      this.playOffsets[deckId] = (this.playOffsets[deckId] + elapsed) % (deck.duration || 1);
    }

    if (deckId === 'A') {
      this.deckA.update((d) => ({ ...d, isPlaying: false, currentTime: this.playOffsets.A }));
    } else {
      this.deckB.update((d) => ({ ...d, isPlaying: false, currentTime: this.playOffsets.B }));
    }
  }

  togglePlay(deckId: 'A' | 'B') {
    const isPlaying = deckId === 'A' ? this.deckA().isPlaying : this.deckB().isPlaying;
    if (isPlaying) {
      this.pause(deckId);
    } else {
      this.play(deckId);
    }
  }

  stop(deckId: 'A' | 'B') {
    this.pause(deckId);
    this.playOffsets[deckId] = 0;
    if (deckId === 'A') {
      this.deckA.update((d) => ({ ...d, currentTime: 0, isPlaying: false }));
    } else {
      this.deckB.update((d) => ({ ...d, currentTime: 0, isPlaying: false }));
    }
  }

  cue(deckId: 'A' | 'B') {
    const deck = deckId === 'A' ? this.deckA() : this.deckB();
    if (deck.isPlaying) {
      // If playing, pause and jump back to cue point
      this.pause(deckId);
      const cuePoint = deck.hotCues[0]?.time || 0;
      this.seek(deckId, cuePoint);
      if (deckId === 'A') {
        this.deckA.update((d) => ({ ...d, isCueActive: true }));
      } else {
        this.deckB.update((d) => ({ ...d, isCueActive: true }));
      }
    } else {
      // If stopped, preview cue as long as held or set cue to current position
      this.seek(deckId, deck.currentTime);
      this.play(deckId);
      if (deckId === 'A') {
        this.deckA.update((d) => ({ ...d, isCueActive: true }));
      } else {
        this.deckB.update((d) => ({ ...d, isCueActive: true }));
      }
    }
  }

  cueRelease(deckId: 'A' | 'B') {
    const deck = deckId === 'A' ? this.deckA() : this.deckB();
    if (deck.isCueActive) {
      this.pause(deckId);
      const cuePoint = deck.hotCues[0]?.time || 0;
      this.seek(deckId, cuePoint);
      if (deckId === 'A') {
        this.deckA.update((d) => ({ ...d, isCueActive: false }));
      } else {
        this.deckB.update((d) => ({ ...d, isCueActive: false }));
      }
    }
  }

  seek(deckId: 'A' | 'B', timeSec: number) {
    const deck = deckId === 'A' ? this.deckA() : this.deckB();
    const boundedTime = Math.max(0, Math.min(deck.duration, timeSec));
    const wasPlaying = deck.isPlaying;

    if (wasPlaying) {
      this.pause(deckId);
      this.playOffsets[deckId] = boundedTime;
      this.play(deckId);
    } else {
      this.playOffsets[deckId] = boundedTime;
      if (deckId === 'A') {
        this.deckA.update((d) => ({ ...d, currentTime: boundedTime }));
      } else {
        this.deckB.update((d) => ({ ...d, currentTime: boundedTime }));
      }
    }
  }

  // --- Tempo & Pitch Slider ---
  setTempo(deckId: 'A' | 'B', percent: number) {
    const deck = deckId === 'A' ? this.deckA() : this.deckB();
    const pitchRange = deck.pitchRange / 100; // e.g. 0.08 for 8%
    const rate = 1.0 + (percent / 100) * pitchRange;

    const nodes = this.deckNodes[deckId];
    if (nodes?.source && this.ctx) {
      nodes.source.playbackRate.setValueAtTime(rate, this.ctx.currentTime);
    }

    if (deckId === 'A') {
      this.deckA.update((d) => ({ ...d, tempoPercent: percent, playbackRate: rate }));
    } else {
      this.deckB.update((d) => ({ ...d, tempoPercent: percent, playbackRate: rate }));
    }
  }

  setPitchRange(deckId: 'A' | 'B', range: number) {
    if (deckId === 'A') {
      this.deckA.update((d) => ({ ...d, pitchRange: range }));
      this.setTempo('A', this.deckA().tempoPercent);
    } else {
      this.deckB.update((d) => ({ ...d, pitchRange: range }));
      this.setTempo('B', this.deckB().tempoPercent);
    }
  }

  toggleMasterTempo(deckId: 'A' | 'B') {
    if (deckId === 'A') {
      this.deckA.update((d) => ({ ...d, masterTempo: !d.masterTempo }));
    } else {
      this.deckB.update((d) => ({ ...d, masterTempo: !d.masterTempo }));
    }
  }

  sync(deckId: 'A' | 'B') {
    const otherDeck = deckId === 'A' ? this.deckB() : this.deckA();
    if (!otherDeck.track) return;

    const targetBpm = otherDeck.track.bpm * otherDeck.playbackRate;
    const thisDeck = deckId === 'A' ? this.deckA() : this.deckB();
    if (!thisDeck.track) return;

    const requiredRate = targetBpm / thisDeck.track.bpm;
    const percent = ((requiredRate - 1.0) / (thisDeck.pitchRange / 100)) * 100;

    this.setTempo(deckId, Math.max(-100, Math.min(100, percent)));

    if (deckId === 'A') {
      this.deckA.update((d) => ({ ...d, sync: !d.sync }));
    } else {
      this.deckB.update((d) => ({ ...d, sync: !d.sync }));
    }
  }

  nudge(deckId: 'A' | 'B', direction: 1 | -1) {
    const deck = deckId === 'A' ? this.deckA() : this.deckB();
    const tempRate = deck.playbackRate * (1 + direction * 0.08);

    const nodes = this.deckNodes[deckId];
    if (nodes?.source && this.ctx) {
      nodes.source.playbackRate.setValueAtTime(tempRate, this.ctx.currentTime);
      setTimeout(() => {
        if (nodes?.source && this.ctx) {
          nodes.source.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
        }
      }, 150);
    }
  }

  // --- Jog Wheel Scratch & Rotation ---
  jogWheel(deckId: 'A' | 'B', deltaAngleDeg: number, isScratch: boolean) {
    const deck = deckId === 'A' ? this.deckA() : this.deckB();
    const newAngle = (deck.jogAngle + deltaAngleDeg) % 360;

    if (deckId === 'A') {
      this.deckA.update((d) => ({ ...d, jogAngle: newAngle, isScratching: isScratch }));
    } else {
      this.deckB.update((d) => ({ ...d, jogAngle: newAngle, isScratching: isScratch }));
    }

    if (isScratch) {
      const timeDelta = (deltaAngleDeg / 360) * 0.8;
      this.seek(deckId, deck.currentTime + timeDelta);
    } else {
      // Pitch bend nudge on outer ring
      this.nudge(deckId, deltaAngleDeg > 0 ? 1 : -1);
    }
  }

  // --- Loops & Hot Cues ---
  toggleLoop(deckId: 'A' | 'B') {
    const deck = deckId === 'A' ? this.deckA() : this.deckB();
    const bpm = deck.track?.bpm || 128;
    const beatSec = 60 / bpm;
    const loopDuration = deck.loopSize * beatSec;

    if (!deck.loopActive) {
      const loopIn = deck.currentTime;
      const loopOut = loopIn + loopDuration;
      if (deckId === 'A') {
        this.deckA.update((d) => ({ ...d, loopActive: true, loopIn, loopOut }));
      } else {
        this.deckB.update((d) => ({ ...d, loopActive: true, loopIn, loopOut }));
      }
    } else {
      if (deckId === 'A') {
        this.deckA.update((d) => ({ ...d, loopActive: false, loopIn: null, loopOut: null }));
      } else {
        this.deckB.update((d) => ({ ...d, loopActive: false, loopIn: null, loopOut: null }));
      }
    }
  }

  setLoopSize(deckId: 'A' | 'B', beats: number) {
    if (deckId === 'A') {
      this.deckA.update((d) => ({ ...d, loopSize: beats }));
    } else {
      this.deckB.update((d) => ({ ...d, loopSize: beats }));
    }
    const deck = deckId === 'A' ? this.deckA() : this.deckB();
    if (deck.loopActive && deck.loopIn !== null) {
      const bpm = deck.track?.bpm || 128;
      const beatSec = 60 / bpm;
      const loopOut = deck.loopIn + beats * beatSec;
      if (deckId === 'A') {
        this.deckA.update((d) => ({ ...d, loopOut }));
      } else {
        this.deckB.update((d) => ({ ...d, loopOut }));
      }
    }
  }

  triggerHotCue(deckId: 'A' | 'B', index: number) {
    const deck = deckId === 'A' ? this.deckA() : this.deckB();
    const cue = deck.hotCues[index];
    if (cue && cue.time > 0) {
      this.seek(deckId, cue.time);
      if (!deck.isPlaying) {
        this.play(deckId);
      }
    } else {
      // Set hot cue at current position
      this.setHotCue(deckId, index, deck.currentTime);
    }
  }

  setHotCue(deckId: 'A' | 'B', index: number, timeSec: number) {
    const colors = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#007aff', '#5856d6', '#af52de'];
    const newCue: HotCue = {
      id: index + 1,
      time: timeSec,
      color: colors[index % colors.length],
      name: `CUE ${index + 1}`,
    };

    if (deckId === 'A') {
      this.deckA.update((d) => {
        const cues = [...d.hotCues];
        cues[index] = newCue;
        return { ...d, hotCues: cues };
      });
    } else {
      this.deckB.update((d) => {
        const cues = [...d.hotCues];
        cues[index] = newCue;
        return { ...d, hotCues: cues };
      });
    }
  }

  setPadMode(deckId: 'A' | 'B', mode: PadMode) {
    if (deckId === 'A') {
      this.deckA.update((d) => ({ ...d, activePadMode: mode }));
    } else {
      this.deckB.update((d) => ({ ...d, activePadMode: mode }));
    }
  }

  setStemVolume(deckId: 'A' | 'B', stem: 'vocals' | 'melody' | 'bass' | 'drums', volume: number) {
    if (deckId === 'A') {
      this.deckA.update((d) => ({ ...d, stems: { ...d.stems, [stem]: volume } }));
    } else {
      this.deckB.update((d) => ({ ...d, stems: { ...d.stems, [stem]: volume } }));
    }
  }

  // --- Mixer Controls ---
  setEq(deckId: 'A' | 'B', band: 'high' | 'mid' | 'low', valueDb: number) {
    const nodes = this.deckNodes[deckId];
    if (!nodes || !this.ctx) return;

    if (band === 'high') {
      nodes.eqHigh.gain.setValueAtTime(valueDb, this.ctx.currentTime);
      if (deckId === 'A') this.channelA.update((c) => ({ ...c, eqHigh: valueDb }));
      else this.channelB.update((c) => ({ ...c, eqHigh: valueDb }));
    } else if (band === 'mid') {
      nodes.eqMid.gain.setValueAtTime(valueDb, this.ctx.currentTime);
      if (deckId === 'A') this.channelA.update((c) => ({ ...c, eqMid: valueDb }));
      else this.channelB.update((c) => ({ ...c, eqMid: valueDb }));
    } else if (band === 'low') {
      nodes.eqLow.gain.setValueAtTime(valueDb, this.ctx.currentTime);
      if (deckId === 'A') this.channelA.update((c) => ({ ...c, eqLow: valueDb }));
      else this.channelB.update((c) => ({ ...c, eqLow: valueDb }));
    }
  }

  setGain(deckId: 'A' | 'B', value: number) {
    const nodes = this.deckNodes[deckId];
    if (nodes && this.ctx) {
      nodes.gainNode.gain.setValueAtTime(value, this.ctx.currentTime);
    }
    if (deckId === 'A') this.channelA.update((c) => ({ ...c, gain: value }));
    else this.channelB.update((c) => ({ ...c, gain: value }));
  }

  setColorFx(deckId: 'A' | 'B', value: number) {
    const nodes = this.deckNodes[deckId];
    if (!nodes || !this.ctx) return;

    // value is -100 to +100
    if (Math.abs(value) < 2) {
      // Center: Bypass
      nodes.colorFilter.type = 'allpass';
      nodes.colorFilter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    } else if (value < 0) {
      // Low-pass filter (sweeps down from 20000Hz to 120Hz)
      const norm = (value + 100) / 100; // 0 to 1
      const freq = 120 * Math.pow(20000 / 120, norm);
      nodes.colorFilter.type = 'lowpass';
      nodes.colorFilter.frequency.setValueAtTime(freq, this.ctx.currentTime);
      nodes.colorFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);
    } else {
      // High-pass filter (sweeps up from 20Hz to 6000Hz)
      const norm = value / 100; // 0 to 1
      const freq = 20 * Math.pow(6000 / 20, norm);
      nodes.colorFilter.type = 'highpass';
      nodes.colorFilter.frequency.setValueAtTime(freq, this.ctx.currentTime);
      nodes.colorFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);
    }

    if (deckId === 'A') this.channelA.update((c) => ({ ...c, colorFx: value }));
    else this.channelB.update((c) => ({ ...c, colorFx: value }));
  }

  setFader(deckId: 'A' | 'B', volume: number) {
    const nodes = this.deckNodes[deckId];
    if (nodes && this.ctx) {
      nodes.faderGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
    if (deckId === 'A') this.channelA.update((c) => ({ ...c, faderVolume: volume }));
    else this.channelB.update((c) => ({ ...c, faderVolume: volume }));
  }

  setCrossfader(value: number) {
    // value is -1 (Full Left) to +1 (Full Right)
    this.master.update((m) => ({ ...m, crossfader: value }));
    this.updateCrossfaderGains();
  }

  private updateCrossfaderGains() {
    if (!this.ctx) return;
    const x = this.master().crossfader; // -1 to 1
    let gainA = 1.0;
    let gainB = 1.0;

    const curve = this.master().crossfaderCurve;

    if (curve === 'SMOOTH') {
      // Equal power curve
      const angle = ((x + 1) / 2) * (Math.PI / 2);
      gainA = Math.cos(angle);
      gainB = Math.sin(angle);
    } else if (curve === 'LINEAR') {
      gainA = x <= 0 ? 1 : 1 - x;
      gainB = x >= 0 ? 1 : 1 + x;
    } else if (curve === 'FAST_CUT') {
      gainA = x > 0.85 ? 0 : 1;
      gainB = x < -0.85 ? 0 : 1;
    }

    if (this.deckNodes.A?.crossfadeGain) {
      this.deckNodes.A.crossfadeGain.gain.setValueAtTime(gainA, this.ctx.currentTime);
    }
    if (this.deckNodes.B?.crossfadeGain) {
      this.deckNodes.B.crossfadeGain.gain.setValueAtTime(gainB, this.ctx.currentTime);
    }
  }

  setMasterVolume(volume: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
    this.master.update((m) => ({ ...m, masterVolume: volume }));
  }

  setBoothVolume(volume: number) {
    this.master.update((m) => ({ ...m, boothVolume: volume }));
  }

  setHeadphoneMix(mix: number) {
    this.master.update((m) => ({ ...m, headphoneMix: mix }));
  }

  togglePfl(deckId: 'A' | 'B') {
    if (deckId === 'A') {
      this.channelA.update((c) => ({ ...c, pflCue: !c.pflCue }));
    } else {
      this.channelB.update((c) => ({ ...c, pflCue: !c.pflCue }));
    }
  }

  // --- FX Units ---
  toggleFx(unitIndex: 1 | 2) {
    if (unitIndex === 1) {
      this.fx1.update((f) => ({ ...f, active: !f.active }));
    } else {
      this.fx2.update((f) => ({ ...f, active: !f.active }));
    }
  }

  setFxParam(unitIndex: 1 | 2, param: 'type' | 'dryWet' | 'param1' | 'param2' | 'assignedDeck', value: any) {
    if (unitIndex === 1) {
      this.fx1.update((f) => ({ ...f, [param]: value }));
    } else {
      this.fx2.update((f) => ({ ...f, [param]: value }));
    }
  }

  // --- Sampler Engine ---
  triggerSampler(padIndex: number) {
    const ctx = this.ensureContext();
    const pad = this.samplerPads()[padIndex];
    if (!pad) return;

    const sampleGain = ctx.createGain();
    sampleGain.gain.value = pad.volume * 0.9;
    sampleGain.connect(this.masterGain);

    const now = ctx.currentTime;

    switch (pad.type) {
      case 'KICK': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.15);
        gain.gain.setValueAtTime(1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(sampleGain);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }
      case 'SNARE': {
        const noise = ctx.createBufferSource();
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 800;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(sampleGain);
        noise.start(now);
        break;
      }
      case 'HIHAT': {
        const noise = ctx.createBufferSource();
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(sampleGain);
        noise.start(now);
        break;
      }
      case 'AIRHORN': {
        for (let k = 0; k < 3; k++) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(440 * (k === 1 ? 1.25 : k === 2 ? 1.5 : 1), now);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.linearRampToValueAtTime(0.35, now + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.connect(gain);
          gain.connect(sampleGain);
          osc.start(now);
          osc.stop(now + 0.6);
        }
        break;
      }
      case 'LASER': {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(sampleGain);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
      case 'DROP': {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.connect(gain);
        gain.connect(sampleGain);
        osc.start(now);
        osc.stop(now + 0.7);
        break;
      }
      case 'SCRATCH': {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.08);
        osc.frequency.linearRampToValueAtTime(150, now + 0.16);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 600;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(sampleGain);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }
      case 'VOX': {
        // Formant synthesis for "Yeah!"
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.35);

        const f1 = ctx.createBiquadFilter();
        f1.type = 'bandpass';
        f1.frequency.value = 800;
        f1.Q.value = 4.0;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(f1);
        f1.connect(gain);
        gain.connect(sampleGain);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }
    }
  }

  // --- Recording Mix ---
  toggleRecord() {
    const isRec = this.master().isRecording;
    if (!isRec) {
      this.startRecording();
    } else {
      this.stopRecording();
    }
  }

  private startRecording() {
    const ctx = this.ensureContext();
    const dest = ctx.createMediaStreamDestination();
    this.masterGain.connect(dest);

    this.recordedChunks = [];
    try {
      this.mediaRecorder = new MediaRecorder(dest.stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `DJ_Mix_Recording_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      };

      this.mediaRecorder.start(100);
      this.master.update((m) => ({ ...m, isRecording: true, recordingDuration: 0 }));

      this.recordingTimerInterval = setInterval(() => {
        this.master.update((m) => ({ ...m, recordingDuration: m.recordingDuration + 1 }));
      }, 1000);
    } catch (e) {
      console.error('MediaRecorder error:', e);
    }
  }

  private stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.recordingTimerInterval) {
      clearInterval(this.recordingTimerInterval);
      this.recordingTimerInterval = null;
    }
    this.master.update((m) => ({ ...m, isRecording: false }));
  }

  // --- 60 FPS Real-time Audio Loop for VU Meters, Waveform Tracking, Loops & Jog Rotation ---
  private startAudioLoop() {
    const loop = () => {
      this.updateRealtimeAudio();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private updateRealtimeAudio() {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Deck A Progress & Loop logic
    const deckA = this.deckA();
    if (deckA.isPlaying && deckA.track) {
      const elapsed = (now - this.playStartTimes.A) * deckA.playbackRate;
      let curTime = (this.playOffsets.A + elapsed) % deckA.duration;

      // Handle active loop
      if (deckA.loopActive && deckA.loopIn !== null && deckA.loopOut !== null) {
        if (curTime >= deckA.loopOut) {
          curTime = deckA.loopIn;
          this.playOffsets.A = deckA.loopIn;
          this.playStartTimes.A = now;
        }
      }

      // Rotate jog wheel
      const jogDelta = deckA.playbackRate * 1.5;
      const newAngle = (deckA.jogAngle + jogDelta) % 360;

      // Update VU meter from analyser
      const vu = this.calculateVuLevel(this.deckNodes.A);

      this.deckA.update((d) => ({
        ...d,
        currentTime: curTime,
        jogAngle: newAngle,
        vuLevel: vu,
      }));
    } else {
      this.deckA.update((d) => ({
        ...d,
        vuLevel: { left: Math.max(0, d.vuLevel.left * 0.9), right: Math.max(0, d.vuLevel.right * 0.9), peak: 0 },
      }));
    }

    // Deck B Progress & Loop logic
    const deckB = this.deckB();
    if (deckB.isPlaying && deckB.track) {
      const elapsed = (now - this.playStartTimes.B) * deckB.playbackRate;
      let curTime = (this.playOffsets.B + elapsed) % deckB.duration;

      if (deckB.loopActive && deckB.loopIn !== null && deckB.loopOut !== null) {
        if (curTime >= deckB.loopOut) {
          curTime = deckB.loopIn;
          this.playOffsets.B = deckB.loopIn;
          this.playStartTimes.B = now;
        }
      }

      const jogDelta = deckB.playbackRate * 1.5;
      const newAngle = (deckB.jogAngle + jogDelta) % 360;
      const vu = this.calculateVuLevel(this.deckNodes.B);

      this.deckB.update((d) => ({
        ...d,
        currentTime: curTime,
        jogAngle: newAngle,
        vuLevel: vu,
      }));
    } else {
      this.deckB.update((d) => ({
        ...d,
        vuLevel: { left: Math.max(0, d.vuLevel.left * 0.9), right: Math.max(0, d.vuLevel.right * 0.9), peak: 0 },
      }));
    }

    // Master VU Meter
    if (this.masterAnalyser) {
      this.masterAnalyser.getByteFrequencyData(this.masterAnalyserData as any);
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < this.masterAnalyserData.length; i++) {
        const val = this.masterAnalyserData[i] / 255;
        sum += val;
        if (val > peak) peak = val;
      }
      const rms = sum / this.masterAnalyserData.length;
      const left = Math.min(1.0, rms * 2.2);
      const right = Math.min(1.0, rms * 2.1 + (Math.random() - 0.5) * 0.05);

      this.master.update((m) => ({
        ...m,
        vuMaster: { left, right, peak },
      }));
    }
  }

  private calculateVuLevel(nodes: DeckAudioNodes): { left: number; right: number; peak: number } {
    if (!nodes?.analyser) return { left: 0, right: 0, peak: 0 };
    nodes.analyser.getByteFrequencyData(nodes.analyserData as any);
    let sum = 0;
    let peak = 0;
    for (let i = 0; i < nodes.analyserData.length; i++) {
      const val = nodes.analyserData[i] / 255;
      sum += val;
      if (val > peak) peak = val;
    }
    const rms = sum / nodes.analyserData.length;
    const left = Math.min(1.0, rms * 2.4);
    const right = Math.min(1.0, rms * 2.3 + (Math.random() - 0.5) * 0.04);
    return { left, right, peak };
  }
}
