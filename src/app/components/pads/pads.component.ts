import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeckState, PadMode, SamplerPad } from '../../models/dj.models';

@Component({
  selector: 'app-pads',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pads-unit">
      <!-- Pad Mode Selector Header -->
      <div class="pad-modes">
        <button 
          *ngFor="let mode of modes"
          class="mode-btn"
          [class.active]="activeMode === mode.id"
          (click)="setMode(mode.id)"
        >
          {{ mode.label }}
        </button>
      </div>

      <!-- 8 RGB Performance Pads Grid (2x4) -->
      <div class="pad-grid">
        <!-- Mode: HOT CUE -->
        <ng-container *ngIf="activeMode === 'HOT_CUE'">
          <button 
            *ngFor="let cue of deck.hotCues; let i = index"
            class="pad-btn hot-cue"
            [style.--pad-color]="cue.color"
            [class.has-cue]="cue.time > 0"
            (mousedown)="triggerHotCue(i)"
          >
            <div class="pad-light"></div>
            <span class="pad-index">{{ i + 1 }}</span>
            <span class="pad-label">{{ cue.name || formatTime(cue.time) }}</span>
          </button>
        </ng-container>

        <!-- Mode: PAD FX -->
        <ng-container *ngIf="activeMode === 'PAD_FX'">
          <button 
            *ngFor="let fx of padFxList; let i = index"
            class="pad-btn pad-fx"
            [style.--pad-color]="fx.color"
            (mousedown)="triggerPadFx(fx)"
          >
            <div class="pad-light"></div>
            <span class="pad-index">{{ fx.icon }}</span>
            <span class="pad-label">{{ fx.name }}</span>
          </button>
        </ng-container>

        <!-- Mode: BEAT LOOP -->
        <ng-container *ngIf="activeMode === 'BEAT_LOOP'">
          <button 
            *ngFor="let loop of beatLoops; let i = index"
            class="pad-btn beat-loop"
            [style.--pad-color]="'#34c759'"
            [class.active-loop]="deck.loopActive && deck.loopSize === loop.beats"
            (mousedown)="triggerBeatLoop(loop.beats)"
          >
            <div class="pad-light"></div>
            <span class="pad-index">{{ loop.label }}</span>
            <span class="pad-label">BEAT</span>
          </button>
        </ng-container>

        <!-- Mode: SAMPLER -->
        <ng-container *ngIf="activeMode === 'SAMPLER'">
          <button 
            *ngFor="let sample of samplers; let i = index"
            class="pad-btn sampler-pad"
            [style.--pad-color]="sample.color"
            (mousedown)="triggerSample(i)"
          >
            <div class="pad-light"></div>
            <span class="pad-index">S{{ i + 1 }}</span>
            <span class="pad-label">{{ sample.name }}</span>
          </button>
        </ng-container>

        <!-- Mode: STEMS -->
        <ng-container *ngIf="activeMode === 'STEMS'">
          <button 
            class="pad-btn stem-pad" 
            [style.--pad-color]="'#00f0ff'"
            [class.stem-active]="deck.stems.vocals > 0.1"
            (click)="toggleStem('vocals')"
          >
            <div class="pad-light"></div>
            <span class="pad-index">🎤</span>
            <span class="pad-label">VOCALS</span>
          </button>
          <button 
            class="pad-btn stem-pad" 
            [style.--pad-color]="'#ff9500'"
            [class.stem-active]="deck.stems.melody > 0.1"
            (click)="toggleStem('melody')"
          >
            <div class="pad-light"></div>
            <span class="pad-index">🎹</span>
            <span class="pad-label">MELODY</span>
          </button>
          <button 
            class="pad-btn stem-pad" 
            [style.--pad-color]="'#af52de'"
            [class.stem-active]="deck.stems.bass > 0.1"
            (click)="toggleStem('bass')"
          >
            <div class="pad-light"></div>
            <span class="pad-index">🎸</span>
            <span class="pad-label">BASS</span>
          </button>
          <button 
            class="pad-btn stem-pad" 
            [style.--pad-color]="'#ff2d55'"
            [class.stem-active]="deck.stems.drums > 0.1"
            (click)="toggleStem('drums')"
          >
            <div class="pad-light"></div>
            <span class="pad-index">🥁</span>
            <span class="pad-label">DRUMS</span>
          </button>
          <!-- 4 Stems FX/Mutes -->
          <button class="pad-btn stem-fx" [style.--pad-color]="'#007aff'" (mousedown)="triggerSampler(3)">
            <div class="pad-light"></div>
            <span class="pad-index">⚡</span>
            <span class="pad-label">HORN FX</span>
          </button>
          <button class="pad-btn stem-fx" [style.--pad-color]="'#ffcc00'" (mousedown)="triggerSampler(4)">
            <div class="pad-light"></div>
            <span class="pad-index">💫</span>
            <span class="pad-label">LASER FX</span>
          </button>
          <button class="pad-btn stem-fx" [style.--pad-color]="'#30b0c7'" (mousedown)="triggerSampler(5)">
            <div class="pad-light"></div>
            <span class="pad-index">💥</span>
            <span class="pad-label">SUB DROP</span>
          </button>
          <button class="pad-btn stem-fx" [style.--pad-color]="'#5856d6'" (mousedown)="triggerSampler(6)">
            <div class="pad-light"></div>
            <span class="pad-index">💿</span>
            <span class="pad-label">SCRATCH</span>
          </button>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .pads-unit {
      display: flex;
      flex-direction: column;
      background: #101217;
      border: 1px solid #20242d;
      border-radius: 6px;
      padding: 6px;
      gap: 6px;
      user-select: none;
    }
    .pad-modes {
      display: flex;
      gap: 4px;
      background: #090a0d;
      padding: 2px;
      border-radius: 4px;
      border: 1px solid #1a1d24;
    }
    .mode-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: #6d7582;
      font-size: 8.5px;
      font-weight: 700;
      padding: 4px 2px;
      border-radius: 3px;
      cursor: pointer;
      text-transform: uppercase;
      transition: all 0.15s ease;
    }
    .mode-btn:hover {
      color: #e5e9f0;
      background: rgba(255,255,255,0.05);
    }
    .mode-btn.active {
      background: #252b38;
      color: #00f0ff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.5);
    }
    .pad-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(2, 1fr);
      gap: 5px;
    }
    .pad-btn {
      height: 48px;
      background: radial-gradient(circle at 50% 30%, #1e222b, #111318);
      border: 1px solid #2d3340;
      border-radius: 4px;
      position: relative;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2px;
      overflow: hidden;
      box-shadow: 0 3px 5px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1);
      transition: all 0.08s ease;
    }
    .pad-btn:active, .pad-btn.stem-active, .pad-btn.active-loop {
      transform: translateY(1px);
      border-color: var(--pad-color, #00f0ff);
      box-shadow: 0 0 12px var(--pad-color, #00f0ff), inset 0 0 8px var(--pad-color, #00f0ff);
    }
    .pad-light {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--pad-color, #4a505e);
      opacity: 0.6;
    }
    .has-cue .pad-light, .stem-active .pad-light, .active-loop .pad-light {
      opacity: 1;
      box-shadow: 0 0 6px var(--pad-color);
    }
    .pad-index {
      font-size: 11px;
      font-weight: 800;
      color: #fff;
      line-height: 1;
    }
    .pad-label {
      font-size: 7.5px;
      font-weight: 700;
      color: #8c96a8;
      text-transform: uppercase;
      margin-top: 2px;
      letter-spacing: 0.3px;
    }
  `]
})
export class PadsComponent {
  @Input() deck!: DeckState;
  @Input() samplers: SamplerPad[] = [];

  @Output() hotCueTrigger = new EventEmitter<number>();
  @Output() padModeChange = new EventEmitter<PadMode>();
  @Output() loopTrigger = new EventEmitter<number>();
  @Output() samplerTrigger = new EventEmitter<number>();
  @Output() stemToggle = new EventEmitter<'vocals' | 'melody' | 'bass' | 'drums'>();

  get activeMode(): PadMode {
    return this.deck.activePadMode;
  }

  readonly modes: { id: PadMode; label: string }[] = [
    { id: 'HOT_CUE', label: 'HOT CUE' },
    { id: 'PAD_FX', label: 'PAD FX' },
    { id: 'BEAT_LOOP', label: 'BEAT LOOP' },
    { id: 'SAMPLER', label: 'SAMPLER' },
    { id: 'STEMS', label: 'STEMS' },
  ];

  readonly padFxList = [
    { name: 'ROLL 1/16', icon: '🌀', color: '#00f0ff' },
    { name: 'ROLL 1/8', icon: '⚡', color: '#00f0ff' },
    { name: 'ROLL 1/4', icon: '💫', color: '#00f0ff' },
    { name: 'ECHO OUT', icon: '🔊', color: '#ff9500' },
    { name: 'FILTER LOW', icon: '🌊', color: '#af52de' },
    { name: 'FILTER HIGH', icon: '🏔️', color: '#ff2d55' },
    { name: 'BITCRUSH', icon: '👾', color: '#ffcc00' },
    { name: 'STUTTER', icon: '🛑', color: '#34c759' },
  ];

  readonly beatLoops = [
    { beats: 0.125, label: '1/8' },
    { beats: 0.25, label: '1/4' },
    { beats: 0.5, label: '1/2' },
    { beats: 1, label: '1' },
    { beats: 2, label: '2' },
    { beats: 4, label: '4' },
    { beats: 8, label: '8' },
    { beats: 16, label: '16' },
  ];

  setMode(mode: PadMode) {
    this.padModeChange.emit(mode);
  }

  triggerHotCue(index: number) {
    this.hotCueTrigger.emit(index);
  }

  triggerBeatLoop(beats: number) {
    this.loopTrigger.emit(beats);
  }

  triggerSample(index: number) {
    this.samplerTrigger.emit(index);
  }

  triggerSampler(index: number) {
    this.samplerTrigger.emit(index);
  }

  triggerPadFx(fx: any) {
    // Triggers instant sample / effect roll
    this.samplerTrigger.emit(6);
  }

  toggleStem(stem: 'vocals' | 'melody' | 'bass' | 'drums') {
    this.stemToggle.emit(stem);
  }

  formatTime(seconds: number): string {
    if (!seconds || seconds <= 0) return 'EMPTY';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}
