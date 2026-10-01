import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeckState, Track, PadMode, SamplerPad } from '../../models/dj.models';
import { JogWheelComponent } from '../jog-wheel/jog-wheel.component';
import { WaveformComponent } from '../waveform/waveform.component';
import { PadsComponent } from '../pads/pads.component';
import { FaderComponent } from '../fader/fader.component';

@Component({
  selector: 'app-deck',
  standalone: true,
  imports: [CommonModule, JogWheelComponent, WaveformComponent, PadsComponent, FaderComponent],
  template: `
    <div 
      class="deck-container" 
      [class.deck-a]="deck.id === 'A'" 
      [class.deck-b]="deck.id === 'B'"
      [class.drag-over]="isDragOver"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <!-- Drag Over Visual Drop Zone Overlay -->
      <div class="deck-drop-overlay" *ngIf="isDragOver">
        <span class="drop-deck-badge" [style.background]="deckColor">DECK {{ deck.id }}</span>
        <span class="drop-text">SOLTE AQUI PARA CARREGAR NO DECK {{ deck.id }}</span>
      </div>

      <!-- Top Track Info Bar -->
      <div class="deck-header">
        <div class="deck-identity" [style.background]="deckColor">
          <span class="deck-id-text">DECK {{ deck.id }}</span>
        </div>

        <div class="track-info" *ngIf="deck.track; else noTrack">
          <div class="track-title-row">
            <span class="track-title">{{ deck.track.title }}</span>
            <span class="track-artist">{{ deck.track.artist }}</span>
          </div>
          <div class="track-meta-row">
            <span class="meta-tag key-tag">{{ deck.track.key }} ({{ deck.track.musicalKey }})</span>
            <span class="meta-tag genre-tag">{{ deck.track.genre }}</span>
            <span class="meta-tag orig-bpm">{{ deck.track.bpm }} BPM</span>
          </div>
        </div>

        <ng-template #noTrack>
          <div class="track-info empty">
            <span class="track-title">ARRASTE UMA FAIXA OU SELECIONE DA BIBLIOTECA</span>
          </div>
        </ng-template>

        <!-- Time & BPM Display Block -->
        <div class="deck-stats">
          <div class="bpm-stat">
            <span class="stat-label">BPM</span>
            <span class="stat-val bpm-val">{{ (currentBpm).toFixed(2) }}</span>
          </div>
          <div class="pitch-stat">
            <span class="stat-label">PITCH</span>
            <span class="stat-val" [class.pos]="deck.tempoPercent > 0" [class.neg]="deck.tempoPercent < 0">
              {{ deck.tempoPercent >= 0 ? '+' : '' }}{{ deck.tempoPercent.toFixed(2) }}%
            </span>
          </div>
          <div class="time-stat" (click)="toggleTimeDisplay()">
            <span class="stat-label">{{ showRemainingTime ? 'REMAIN' : 'ELAPSED' }}</span>
            <span class="stat-val time-val">{{ formattedTime }}</span>
          </div>
        </div>
      </div>

      <!-- Waveform Section -->
      <div class="waveform-section">
        <app-waveform
          [track]="deck.track"
          [currentTime]="deck.currentTime"
          [duration]="deck.duration"
          [bpm]="deck.track?.bpm || 128"
          [isPlaying]="deck.isPlaying"
          [deckColor]="deckColor"
          [hotCues]="deck.hotCues"
          [loopActive]="deck.loopActive"
          [loopIn]="deck.loopIn"
          [loopOut]="deck.loopOut"
          [loopSize]="deck.loopSize"
          (seek)="onSeek($event)"
        ></app-waveform>
      </div>

      <!-- Deck Main Body: Controls + Jog Wheel + Pitch Slider -->
      <div class="deck-main-body">
        <!-- Left Side: Loop Controls & Secondary Buttons -->
        <div class="deck-left-column">
          <!-- Loop Section -->
          <div class="loop-unit">
            <span class="section-title">LOOP</span>
            <div class="loop-buttons">
              <button 
                class="dj-btn loop-btn auto-loop"
                [class.active]="deck.loopActive"
                (click)="toggleLoop()"
              >
                AUTO {{ deck.loopSize }}B
              </button>
              <div class="loop-half-double">
                <button class="dj-btn mini-btn" (click)="setLoopSize(deck.loopSize / 2)">1/2X</button>
                <button class="dj-btn mini-btn" (click)="setLoopSize(deck.loopSize * 2)">2X</button>
              </div>
            </div>
          </div>

          <!-- Utility Toggles -->
          <div class="deck-util-unit">
            <button 
              class="dj-btn toggle-btn"
              [class.active]="deck.masterTempo"
              (click)="toggleMasterTempo()"
              title="Master Tempo (Key Lock)"
            >
              MT / LOCK
            </button>
            <button 
              class="dj-btn toggle-btn"
              [class.active]="deck.vinylMode"
              (click)="toggleVinylMode()"
            >
              VINYL
            </button>
            <button 
              class="dj-btn toggle-btn"
              [class.active]="deck.slipMode"
              (click)="toggleSlipMode()"
            >
              SLIP
            </button>
          </div>

          <!-- Transport: CUE & PLAY -->
          <div class="transport-unit">
            <button 
              class="transport-btn cue-btn"
              [class.active]="deck.isCueActive"
              (mousedown)="onCueDown()"
              (mouseup)="onCueUp()"
            >
              CUE
            </button>
            <button 
              class="transport-btn play-btn"
              [class.active]="deck.isPlaying"
              [style.--glow-color]="deckColor"
              (click)="togglePlay()"
            >
              <span class="play-icon">{{ deck.isPlaying ? '⏸' : '▶' }}</span>
              <span class="play-text">{{ deck.isPlaying ? 'PAUSE' : 'PLAY' }}</span>
            </button>
          </div>
        </div>

        <!-- Center: Platter / Jog Wheel -->
        <div class="deck-center-column">
          <app-jog-wheel
            [deckId]="deck.id"
            [angle]="deck.jogAngle"
            [isPlaying]="deck.isPlaying"
            [isScratching]="deck.isScratching"
            [vinylMode]="deck.vinylMode"
            [playbackRate]="deck.playbackRate"
            [deckColor]="deckColor"
            [size]="190"
            (jogMove)="onJogMove($event)"
            (scratchStart)="onScratchStart()"
            (scratchEnd)="onScratchEnd()"
          ></app-jog-wheel>
        </div>

        <!-- Right Side: Pitch & Tempo Slider + Nudge -->
        <div class="deck-right-column">
          <div class="tempo-header">
            <button class="sync-btn" [class.active]="deck.sync" (click)="toggleSync()">SYNC</button>
            <button class="range-btn" (click)="cyclePitchRange()">±{{ deck.pitchRange }}%</button>
          </div>

          <div class="pitch-fader-box">
            <div class="pitch-ticks">
              <span>+</span>
              <span>0</span>
              <span>-</span>
            </div>
            <app-fader
              [min]="-100"
              [max]="100"
              [value]="deck.tempoPercent"
              [defaultValue]="0"
              orientation="vertical"
              [length]="140"
              [width]="36"
              (valueChange)="onTempoChange($event)"
            ></app-fader>
          </div>

          <div class="nudge-buttons">
            <button class="nudge-btn" (mousedown)="onNudge(-1)">-</button>
            <button class="nudge-btn" (mousedown)="onNudge(1)">+</button>
          </div>
        </div>
      </div>

      <!-- Bottom: Performance Pads Section -->
      <div class="deck-pads-section">
        <app-pads
          [deck]="deck"
          [samplers]="samplers"
          (hotCueTrigger)="onHotCue($event)"
          (padModeChange)="onPadModeChange($event)"
          (loopTrigger)="onBeatLoop($event)"
          (samplerTrigger)="onSampler($event)"
          (stemToggle)="onStemToggle($event)"
        ></app-pads>
      </div>
    </div>
  `,
  styles: [`
    .deck-container {
      flex: 1;
      background: #14171d;
      border: 1px solid #232731;
      border-radius: 8px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      user-select: none;
      position: relative;
    }
    .deck-container.drag-over {
      box-shadow: 0 0 25px rgba(0, 240, 255, 0.6), inset 0 0 15px rgba(0, 240, 255, 0.3);
      border-color: #00f0ff !important;
    }
    .deck-drop-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(13, 16, 22, 0.92);
      backdrop-filter: blur(4px);
      z-index: 999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      border-radius: 8px;
      pointer-events: none;
      border: 2px dashed #00f0ff;
    }
    .drop-deck-badge {
      padding: 6px 14px;
      border-radius: 4px;
      color: #000;
      font-weight: 900;
      font-size: 14px;
    }
    .drop-text {
      font-size: 13px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 0.5px;
    }
    .deck-a {
      border-top: 3px solid #00f0ff;
    }
    .deck-b {
      border-top: 3px solid #ff007f;
    }

    .deck-header {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #0c0d11;
      border: 1px solid #1c2027;
      border-radius: 6px;
      padding: 6px 8px;
    }
    .deck-identity {
      padding: 4px 8px;
      border-radius: 4px;
      color: #000;
      font-weight: 900;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
    .track-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .track-info.empty {
      color: #5d6575;
      font-size: 11px;
      font-weight: 600;
    }
    .track-title-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .track-title {
      font-size: 13px;
      font-weight: 800;
      color: #ffffff;
    }
    .track-artist {
      font-size: 11px;
      font-weight: 600;
      color: #8c96a8;
    }
    .track-meta-row {
      display: flex;
      gap: 4px;
      margin-top: 2px;
    }
    .meta-tag {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      background: #1c2028;
      color: #9aa4b5;
    }
    .key-tag {
      background: #232d3d;
      color: #00f0ff;
    }
    .deck-stats {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .stat-label {
      font-size: 8px;
      font-weight: 700;
      color: #636c7a;
      display: block;
    }
    .stat-val {
      font-size: 13px;
      font-weight: 800;
      color: #e5e9f0;
      font-variant-numeric: tabular-nums;
    }
    .bpm-val {
      color: #00f0ff;
    }
    .time-stat {
      cursor: pointer;
      background: #121419;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #1f232c;
    }
    .time-val {
      color: #ffcc00;
    }
    .pos { color: #34c759; }
    .neg { color: #ff3b30; }

    .waveform-section {
      width: 100%;
    }

    .deck-main-body {
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
      background: #0f1116;
      border: 1px solid #1c2028;
      border-radius: 6px;
      padding: 8px 12px;
    }

    .deck-left-column {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 105px;
    }
    .loop-unit {
      background: #15181f;
      border: 1px solid #232833;
      border-radius: 4px;
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .section-title {
      font-size: 8px;
      font-weight: 800;
      color: #717b8c;
      text-transform: uppercase;
    }
    .loop-buttons {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .loop-btn {
      width: 100%;
      font-size: 9px;
      font-weight: 800;
      padding: 4px;
    }
    .loop-half-double {
      display: flex;
      gap: 3px;
    }
    .mini-btn {
      flex: 1;
      font-size: 8px;
      padding: 2px;
    }

    .deck-util-unit {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px;
    }
    .toggle-btn {
      font-size: 8px;
      font-weight: 700;
      padding: 4px 2px;
    }

    .transport-unit {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }
    .transport-btn {
      height: 38px;
      border-radius: 5px;
      font-weight: 900;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.1s ease;
      user-select: none;
    }
    .cue-btn {
      background: #1c2029;
      border: 2px solid #ff9500;
      color: #ff9500;
      font-size: 12px;
    }
    .cue-btn:active, .cue-btn.active {
      background: #ff9500;
      color: #000;
      box-shadow: 0 0 12px #ff9500;
    }
    .play-btn {
      background: #1c2029;
      border: 2px solid #34c759;
      color: #34c759;
      gap: 4px;
      font-size: 11px;
    }
    .play-btn.active {
      background: #34c759;
      color: #000;
      box-shadow: 0 0 14px #34c759;
    }

    .dj-btn {
      background: #1d212b;
      border: 1px solid #2f3645;
      color: #9aa4b5;
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.1s;
    }
    .dj-btn:hover {
      background: #282e3b;
      color: #fff;
    }
    .dj-btn.active {
      background: #00f0ff;
      color: #000;
      border-color: #00f0ff;
      box-shadow: 0 0 8px #00f0ff;
    }

    .deck-center-column {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .deck-right-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      width: 75px;
    }
    .tempo-header {
      display: flex;
      gap: 3px;
      width: 100%;
    }
    .sync-btn {
      flex: 1;
      background: #181b22;
      border: 1px solid #00f0ff;
      color: #00f0ff;
      font-size: 8.5px;
      font-weight: 800;
      padding: 3px;
      border-radius: 3px;
      cursor: pointer;
    }
    .sync-btn.active {
      background: #00f0ff;
      color: #000;
      box-shadow: 0 0 8px #00f0ff;
    }
    .range-btn {
      background: #181b22;
      border: 1px solid #2f3645;
      color: #8c96a8;
      font-size: 8px;
      padding: 3px 4px;
      border-radius: 3px;
      cursor: pointer;
    }

    .pitch-fader-box {
      display: flex;
      align-items: center;
      gap: 4px;
      position: relative;
    }
    .pitch-ticks {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 140px;
      font-size: 8px;
      color: #555d6d;
      font-weight: 700;
    }
    .nudge-buttons {
      display: flex;
      gap: 4px;
      width: 100%;
    }
    .nudge-btn {
      flex: 1;
      height: 22px;
      background: #1c202a;
      border: 1px solid #2d3444;
      color: #9aa4b5;
      border-radius: 3px;
      font-weight: 800;
      cursor: pointer;
    }
    .nudge-btn:active {
      background: #00f0ff;
      color: #000;
    }

    .deck-pads-section {
      width: 100%;
    }
  `]
})
export class DeckComponent {
  @Input() deck!: DeckState;
  @Input() samplers: SamplerPad[] = [];

  @Output() play = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();
  @Output() togglePlayEvent = new EventEmitter<void>();
  @Output() cueDown = new EventEmitter<void>();
  @Output() cueUp = new EventEmitter<void>();
  @Output() seek = new EventEmitter<number>();
  @Output() tempoChange = new EventEmitter<number>();
  @Output() pitchRangeChange = new EventEmitter<number>();
  @Output() syncToggle = new EventEmitter<void>();
  @Output() masterTempoToggle = new EventEmitter<void>();
  @Output() vinylModeToggle = new EventEmitter<void>();
  @Output() slipModeToggle = new EventEmitter<void>();
  @Output() nudge = new EventEmitter<1 | -1>();
  @Output() jogMove = new EventEmitter<{ deltaAngle: number; isScratch: boolean }>();
  @Output() loopToggle = new EventEmitter<void>();
  @Output() loopSizeChange = new EventEmitter<number>();
  @Output() hotCueTrigger = new EventEmitter<number>();
  @Output() padModeChange = new EventEmitter<PadMode>();
  @Output() samplerTrigger = new EventEmitter<number>();
  @Output() stemToggle = new EventEmitter<'vocals' | 'melody' | 'bass' | 'drums'>();
  @Output() trackDrop = new EventEmitter<string>();
  @Output() fileDrop = new EventEmitter<File>();

  isDragOver = false;
  showRemainingTime = false;

  get deckColor(): string {
    return this.deck.id === 'A' ? '#00f0ff' : '#ff007f';
  }

  get currentBpm(): number {
    const baseBpm = this.deck.track?.bpm || 128;
    return baseBpm * this.deck.playbackRate;
  }

  get formattedTime(): string {
    const time = this.showRemainingTime
      ? Math.max(0, this.deck.duration - this.deck.currentTime)
      : this.deck.currentTime;
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    const prefix = this.showRemainingTime ? '-' : '';
    return `${prefix}${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${ms < 10 ? '0' : ''}${ms}`;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    // Check if files were dropped (from OS)
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name)) {
        this.fileDrop.emit(file);
        return;
      }
    }

    // Check if internal track ID was dropped
    const trackId = event.dataTransfer?.getData('text/plain');
    if (trackId) {
      this.trackDrop.emit(trackId);
    }
  }

  toggleTimeDisplay() {
    this.showRemainingTime = !this.showRemainingTime;
  }

  togglePlay() {
    this.togglePlayEvent.emit();
  }

  onCueDown() {
    this.cueDown.emit();
  }

  onCueUp() {
    this.cueUp.emit();
  }

  onSeek(time: number) {
    this.seek.emit(time);
  }

  onTempoChange(val: number) {
    this.tempoChange.emit(val);
  }

  cyclePitchRange() {
    const ranges = [6, 10, 16, 100];
    const currIdx = ranges.indexOf(this.deck.pitchRange);
    const nextRange = ranges[(currIdx + 1) % ranges.length];
    this.pitchRangeChange.emit(nextRange);
  }

  toggleSync() {
    this.syncToggle.emit();
  }

  toggleMasterTempo() {
    this.masterTempoToggle.emit();
  }

  toggleVinylMode() {
    this.vinylModeToggle.emit();
  }

  toggleSlipMode() {
    this.slipModeToggle.emit();
  }

  onNudge(dir: 1 | -1) {
    this.nudge.emit(dir);
  }

  onJogMove(event: { deltaAngle: number; isScratch: boolean }) {
    this.jogMove.emit(event);
  }

  onScratchStart() {}

  onScratchEnd() {}

  toggleLoop() {
    this.loopToggle.emit();
  }

  setLoopSize(size: number) {
    if (size >= 0.0625 && size <= 64) {
      this.loopSizeChange.emit(size);
    }
  }

  onHotCue(index: number) {
    this.hotCueTrigger.emit(index);
  }

  onPadModeChange(mode: PadMode) {
    this.padModeChange.emit(mode);
  }

  onBeatLoop(beats: number) {
    this.setLoopSize(beats);
    if (!this.deck.loopActive) {
      this.loopToggle.emit();
    }
  }

  onSampler(index: number) {
    this.samplerTrigger.emit(index);
  }

  onStemToggle(stem: 'vocals' | 'melody' | 'bass' | 'drums') {
    this.stemToggle.emit(stem);
  }
}
