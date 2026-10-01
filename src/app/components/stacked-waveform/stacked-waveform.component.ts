import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeckState } from '../../models/dj.models';

@Component({
  selector: 'app-stacked-waveform',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stacked-waveform-container" (mousedown)="onCanvasMouseDown($event)">
      <!-- Phase Matching Bar -->
      <div class="phase-meter-bar">
        <div class="phase-center"></div>
        <div class="phase-indicator a-ind" [style.left.%]="phaseA"></div>
        <div class="phase-indicator b-ind" [style.left.%]="phaseB"></div>
      </div>

      <!-- Parallel Waveforms Canvas -->
      <div class="canvas-box">
        <canvas #canvas class="stacked-canvas"></canvas>
        <div class="center-needle"></div>
      </div>
    </div>
  `,
  styles: [`
    .stacked-waveform-container {
      width: 100%;
      height: 84px;
      background: #08090c;
      border: 1px solid #1a1d25;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      user-select: none;
      box-shadow: inset 0 2px 6px rgba(0,0,0,0.8);
    }
    .phase-meter-bar {
      height: 12px;
      background: #0e1015;
      border-bottom: 1px solid #1b1e27;
      position: relative;
      display: flex;
      align-items: center;
    }
    .phase-center {
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #ffffff;
      transform: translateX(-50%);
      z-index: 5;
    }
    .phase-indicator {
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      top: 3px;
      transform: translateX(-50%);
      transition: left 0.05s linear;
    }
    .a-ind {
      background: #00f0ff;
      box-shadow: 0 0 6px #00f0ff;
    }
    .b-ind {
      background: #ff007f;
      box-shadow: 0 0 6px #ff007f;
    }

    .canvas-box {
      flex: 1;
      position: relative;
      cursor: ew-resize;
    }
    .stacked-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    .center-needle {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 2px;
      background: #ffffff;
      transform: translateX(-50%);
      box-shadow: 0 0 8px #fff;
      pointer-events: none;
      z-index: 10;
    }
  `]
})
export class StackedWaveformComponent implements AfterViewInit, OnChanges {
  @Input() deckA!: DeckState;
  @Input() deckB!: DeckState;

  @Output() seekDeckA = new EventEmitter<number>();
  @Output() seekDeckB = new EventEmitter<number>();

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx: CanvasRenderingContext2D | null = null;

  get phaseA(): number {
    const bpm = this.deckA?.track?.bpm || 128;
    const beatSec = 60 / (bpm * this.deckA.playbackRate);
    const progress = (this.deckA.currentTime % beatSec) / beatSec;
    return progress * 100;
  }

  get phaseB(): number {
    const bpm = this.deckB?.track?.bpm || 128;
    const beatSec = 60 / (bpm * this.deckB.playbackRate);
    const progress = (this.deckB.currentTime % beatSec) / beatSec;
    return progress * 100;
  }

  ngAfterViewInit() {
    this.initCanvas();
    this.draw();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.draw();
  }

  @HostListener('window:resize')
  onResize() {
    this.initCanvas();
    this.draw();
  }

  private initCanvas() {
    if (this.canvasRef) {
      const canvas = this.canvasRef.nativeElement;
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 72;
      this.ctx = canvas.getContext('2d');
    }
  }

  draw() {
    if (!this.ctx || !this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = this.ctx;
    const w = canvas.width;
    const h = canvas.height;
    const halfH = h / 2;

    ctx.fillStyle = '#08090c';
    ctx.fillRect(0, 0, w, h);

    // Divider line between Deck A & Deck B
    ctx.strokeStyle = '#181c25';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, halfH);
    ctx.lineTo(w, halfH);
    ctx.stroke();

    const zoomSeconds = 10;
    const pixelsPerSec = w / zoomSeconds;

    // Draw Deck A (Top Half)
    this.drawDeckHalf(
      ctx,
      this.deckA,
      0,
      halfH,
      '#00f0ff',
      'rgba(0, 240, 255, 0.4)',
      w,
      zoomSeconds,
      pixelsPerSec,
      true
    );

    // Draw Deck B (Bottom Half)
    this.drawDeckHalf(
      ctx,
      this.deckB,
      halfH,
      halfH,
      '#ff007f',
      'rgba(255, 0, 127, 0.4)',
      w,
      zoomSeconds,
      pixelsPerSec,
      false
    );
  }

  private drawDeckHalf(
    ctx: CanvasRenderingContext2D,
    deck: DeckState,
    top: number,
    height: number,
    color: string,
    gridColor: string,
    width: number,
    zoomSeconds: number,
    pixelsPerSec: number,
    isTop: boolean
  ) {
    if (!deck.track || !deck.track.peaks || deck.duration <= 0) {
      ctx.fillStyle = '#3a404d';
      ctx.font = '9px monospace';
      ctx.fillText(isTop ? 'DECK A' : 'DECK B', 12, top + height / 2 + 3);
      return;
    }

    const peaks = deck.track.peaks;
    const centerTime = deck.currentTime;
    const startTime = centerTime - zoomSeconds / 2;
    const bpm = (deck.track.bpm || 128) * deck.playbackRate;
    const beatSec = 60 / bpm;
    const firstBeat = Math.floor(startTime / beatSec) * beatSec;

    // Draw beat grid lines
    for (let t = firstBeat; t <= startTime + zoomSeconds; t += beatSec) {
      const x = (t - startTime) * pixelsPerSec;
      const beatNum = Math.round(t / beatSec);
      const isBar = beatNum % 4 === 0;

      ctx.strokeStyle = isBar ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + height);
      ctx.stroke();
    }

    // Draw waveform bars
    const barW = 2;
    const baseY = isTop ? top + height : top;

    for (let x = 0; x < width; x += barW) {
      const timeAtX = startTime + (x / width) * zoomSeconds;
      if (timeAtX < 0 || timeAtX > deck.duration) continue;

      const idx = Math.floor((timeAtX / deck.duration) * peaks.length);
      const amp = peaks[idx] || 0.05;
      const barH = amp * (height - 4);

      ctx.fillStyle = color;
      if (isTop) {
        ctx.fillRect(x, baseY - barH, barW - 0.5, barH);
      } else {
        ctx.fillRect(x, baseY, barW - 0.5, barH);
      }
    }
  }

  onCanvasMouseDown(e: MouseEvent) {
    if (!this.canvasRef) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const clickX = e.clientX - rect.left;
    const isTopHalf = clickY < rect.height / 2;

    const zoomSeconds = 10;
    const secOffset = ((clickX - rect.width / 2) / rect.width) * zoomSeconds;

    if (isTopHalf && this.deckA.track) {
      this.seekDeckA.emit(Math.max(0, Math.min(this.deckA.duration, this.deckA.currentTime + secOffset)));
    } else if (!isTopHalf && this.deckB.track) {
      this.seekDeckB.emit(Math.max(0, Math.min(this.deckB.duration, this.deckB.currentTime + secOffset)));
    }
  }
}
