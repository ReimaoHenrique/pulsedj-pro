import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Track, HotCue } from '../../models/dj.models';

@Component({
  selector: 'app-waveform',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="waveform-box" [style.height.px]="height">
      <!-- Main Scrolling Waveform Canvas -->
      <div class="canvas-wrapper" (mousedown)="onMainCanvasMouseDown($event)">
        <canvas #mainCanvas class="main-canvas"></canvas>
        
        <!-- Center Playhead Line -->
        <div class="center-playhead" [style.background]="deckColor"></div>

        <!-- Loop Overlay Indicator -->
        <div 
          *ngIf="loopActive && loopIn !== null && loopOut !== null"
          class="loop-overlay-badge"
        >
          LOOP {{ loopSize }}B
        </div>
      </div>

      <!-- Mini Track Overview / Seek Bar -->
      <div 
        #overviewTrack
        class="overview-strip"
        (mousedown)="onOverviewMouseDown($event)"
      >
        <canvas #overviewCanvas class="overview-canvas"></canvas>
        
        <!-- Playhead position cursor -->
        <div class="overview-cursor" [style.left.%]="progressPercent"></div>

        <!-- Hot Cue Markers on Overview -->
        <ng-container *ngFor="let cue of hotCues">
          <div 
            *ngIf="cue.time > 0"
            class="overview-cue"
            [style.left.%]="(cue.time / (duration || 1)) * 100"
            [style.background]="cue.color"
            [title]="cue.name"
          ></div>
        </ng-container>

        <!-- Loop Range on Overview -->
        <div 
          *ngIf="loopActive && loopIn !== null && loopOut !== null"
          class="overview-loop-region"
          [style.left.%]="(loopIn / (duration || 1)) * 100"
          [style.width.%]="((loopOut - loopIn) / (duration || 1)) * 100"
        ></div>
      </div>
    </div>
  `,
  styles: [`
    .waveform-box {
      width: 100%;
      display: flex;
      flex-direction: column;
      background: #0b0c0f;
      border: 1px solid #1a1d24;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      user-select: none;
    }
    .canvas-wrapper {
      flex: 1;
      position: relative;
      cursor: ew-resize;
      background: #090a0d;
      overflow: hidden;
    }
    .main-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    .center-playhead {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 2px;
      transform: translateX(-50%);
      box-shadow: 0 0 8px currentColor;
      pointer-events: none;
      z-index: 10;
    }
    .loop-overlay-badge {
      position: absolute;
      top: 6px;
      right: 8px;
      background: rgba(52, 199, 89, 0.25);
      border: 1px solid #34c759;
      color: #34c759;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      pointer-events: none;
    }
    .overview-strip {
      height: 24px;
      background: #0f1116;
      border-top: 1px solid #1e2129;
      position: relative;
      cursor: pointer;
    }
    .overview-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    .overview-cursor {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #ffffff;
      box-shadow: 0 0 6px #fff;
      transform: translateX(-50%);
      pointer-events: none;
      z-index: 5;
    }
    .overview-cue {
      position: absolute;
      top: 2px;
      bottom: 2px;
      width: 3px;
      border-radius: 1px;
      box-shadow: 0 0 4px currentColor;
      pointer-events: none;
      z-index: 4;
    }
    .overview-loop-region {
      position: absolute;
      top: 0;
      bottom: 0;
      background: rgba(52, 199, 89, 0.35);
      border-left: 2px solid #34c759;
      border-right: 2px solid #34c759;
      pointer-events: none;
      z-index: 3;
    }
  `]
})
export class WaveformComponent implements AfterViewInit, OnChanges {
  @Input() track: Track | null = null;
  @Input() currentTime = 0;
  @Input() duration = 0;
  @Input() bpm = 128;
  @Input() isPlaying = false;
  @Input() deckColor = '#00f0ff';
  @Input() hotCues: HotCue[] = [];
  @Input() loopActive = false;
  @Input() loopIn: number | null = null;
  @Input() loopOut: number | null = null;
  @Input() loopSize = 4;
  @Input() height = 110;

  @Output() seek = new EventEmitter<number>();

  @ViewChild('mainCanvas') mainCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('overviewCanvas') overviewCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('overviewTrack') overviewTrackRef!: ElementRef<HTMLDivElement>;

  private mainCtx: CanvasRenderingContext2D | null = null;
  private overviewCtx: CanvasRenderingContext2D | null = null;
  private isSeeking = false;

  get progressPercent(): number {
    if (!this.duration) return 0;
    return (this.currentTime / this.duration) * 100;
  }

  ngAfterViewInit() {
    this.initCanvas();
    this.draw();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.draw();
  }

  private initCanvas() {
    if (this.mainCanvasRef) {
      const canvas = this.mainCanvasRef.nativeElement;
      canvas.width = canvas.parentElement?.clientWidth || 600;
      canvas.height = canvas.parentElement?.clientHeight || 86;
      this.mainCtx = canvas.getContext('2d');
    }
    if (this.overviewCanvasRef) {
      const canvas = this.overviewCanvasRef.nativeElement;
      canvas.width = canvas.parentElement?.clientWidth || 600;
      canvas.height = canvas.parentElement?.clientHeight || 24;
      this.overviewCtx = canvas.getContext('2d');
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.initCanvas();
    this.draw();
  }

  draw() {
    this.drawMainWaveform();
    this.drawOverviewWaveform();
  }

  private drawMainWaveform() {
    if (!this.mainCtx || !this.mainCanvasRef) return;
    const canvas = this.mainCanvasRef.nativeElement;
    const ctx = this.mainCtx;
    const width = canvas.width;
    const height = canvas.height;
    const halfH = height / 2;

    ctx.fillStyle = '#090a0d';
    ctx.fillRect(0, 0, width, height);

    // Draw center guideline
    ctx.strokeStyle = '#161920';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, halfH);
    ctx.lineTo(width, halfH);
    ctx.stroke();

    if (!this.track || !this.track.peaks || this.duration <= 0) {
      ctx.fillStyle = '#4a505e';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NENHUMA FAIXA CARREGADA', width / 2, halfH + 4);
      return;
    }

    const peaks = this.track.peaks;
    const multiPeaks = this.track.multiPeaks;
    const zoomSeconds = 12; // 12 seconds visible in zoom window
    const pixelsPerSec = width / zoomSeconds;
    const centerTime = this.currentTime;
    const startTime = centerTime - zoomSeconds / 2;

    // Draw Beat Grid
    const bpm = this.track.bpm || 128;
    const beatDuration = 60 / bpm;
    const firstBeat = Math.floor(startTime / beatDuration) * beatDuration;

    ctx.lineWidth = 1;
    for (let t = firstBeat; t <= startTime + zoomSeconds; t += beatDuration) {
      const x = (t - startTime) * pixelsPerSec;
      const beatNum = Math.round(t / beatDuration);
      const isBarStart = beatNum % 4 === 0;

      ctx.strokeStyle = isBarStart ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      if (isBarStart && isBarStart) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.floor(beatNum / 4) + 1}.1`, x + 3, 11);
      }
    }

    // Draw Waveform bars (Multi-frequency RGB Rekordbox style)
    const barWidth = 2.5;
    const step = zoomSeconds / (width / barWidth);

    for (let x = 0; x < width; x += barWidth) {
      const timeAtX = startTime + (x / width) * zoomSeconds;
      if (timeAtX < 0 || timeAtX > this.duration) continue;

      const peakIdx = Math.floor((timeAtX / this.duration) * peaks.length);
      const amp = peaks[peakIdx] || 0.1;
      const lowAmp = multiPeaks ? (multiPeaks.low[peakIdx] || amp) : amp;
      const highAmp = multiPeaks ? (multiPeaks.high[peakIdx] || amp) : amp;

      const barH = amp * (halfH - 4);
      const lowH = lowAmp * (halfH - 6);

      // Low freq (Red/Orange center)
      ctx.fillStyle = this.deckColor === '#ff007f' ? '#ff3b30' : '#00f0ff';
      ctx.fillRect(x, halfH - lowH, barWidth - 0.5, lowH * 2);

      // Highs (Cyan / Blue outer edge)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillRect(x, halfH - barH, barWidth - 0.5, (barH - lowH));
      ctx.fillRect(x, halfH + lowH, barWidth - 0.5, (barH - lowH));
    }

    // Draw Hot Cues
    for (const cue of this.hotCues) {
      if (cue.time < startTime || cue.time > startTime + zoomSeconds) continue;
      const cueX = (cue.time - startTime) * pixelsPerSec;

      ctx.fillStyle = cue.color;
      ctx.beginPath();
      ctx.moveTo(cueX, 0);
      ctx.lineTo(cueX + 8, 0);
      ctx.lineTo(cueX, 10);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = cue.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cueX, 0);
      ctx.lineTo(cueX, height);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText(cue.name || `${cue.id}`, cueX + 3, 20);
    }
  }

  private drawOverviewWaveform() {
    if (!this.overviewCtx || !this.overviewCanvasRef) return;
    const canvas = this.overviewCanvasRef.nativeElement;
    const ctx = this.overviewCtx;
    const width = canvas.width;
    const height = canvas.height;
    const halfH = height / 2;

    ctx.fillStyle = '#0f1116';
    ctx.fillRect(0, 0, width, height);

    if (!this.track || !this.track.peaks) return;

    const peaks = this.track.peaks;
    const barWidth = width / peaks.length;

    for (let i = 0; i < peaks.length; i++) {
      const p = peaks[i];
      const barH = p * (halfH - 2);
      const x = i * barWidth;

      // Color gradient overview
      ctx.fillStyle = this.deckColor === '#ff007f' ? '#ff007f' : '#00f0ff';
      ctx.fillRect(x, halfH - barH, Math.max(1, barWidth), barH * 2);
    }
  }

  onMainCanvasMouseDown(e: MouseEvent) {
    if (!this.mainCanvasRef || this.duration <= 0) return;
    const rect = this.mainCanvasRef.nativeElement.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const halfW = rect.width / 2;
    const zoomSeconds = 12;
    const secOffset = ((clickX - halfW) / rect.width) * zoomSeconds;
    this.seek.emit(Math.max(0, Math.min(this.duration, this.currentTime + secOffset)));
  }

  onOverviewMouseDown(e: MouseEvent) {
    if (!this.overviewTrackRef || this.duration <= 0) return;
    const rect = this.overviewTrackRef.nativeElement.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const norm = Math.max(0, Math.min(1, clickX / rect.width));
    this.seek.emit(norm * this.duration);
  }
}
