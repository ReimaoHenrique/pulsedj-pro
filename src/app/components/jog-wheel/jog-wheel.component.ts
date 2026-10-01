import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-jog-wheel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      #wheelElem
      class="jog-wheel-wrapper" 
      [style.width.px]="size"
      [style.height.px]="size"
      (mousedown)="onMouseDown($event)"
      [class.scratching]="isScratching"
      [class.playing]="isPlaying"
    >
      <!-- Outer Metal Bezel with Grip Teeth -->
      <div class="outer-bezel">
        <div class="bezel-notch" *ngFor="let n of notches; let i = index" [style.transform]="'rotate(' + (i * 15) + 'deg)'"></div>
      </div>

      <!-- Rotating Illuminated Outer Ring -->
      <div class="illuminated-ring" [style.transform]="'rotate(' + angle + 'deg)'">
        <div class="ring-marker" [style.background]="deckColor" [style.box-shadow]="'0 0 10px ' + deckColor"></div>
        <div class="ring-marker opp" [style.background]="deckColor"></div>
      </div>

      <!-- Vinyl Platter Top / Touch Surface -->
      <div class="platter-surface" [class.touch-active]="isScratching">
        <!-- Vinyl Grooves -->
        <div class="groove g1"></div>
        <div class="groove g2"></div>
        <div class="groove g3"></div>

        <!-- Center Display (CDJ style) -->
        <div class="center-display">
          <div class="display-ring" [style.border-color]="isPlaying ? deckColor : '#333'">
            <div 
              class="needle-position" 
              [style.transform]="'rotate(' + angle + 'deg)'"
            >
              <div class="needle-tip" [style.background]="deckColor" [style.box-shadow]="'0 0 8px ' + deckColor"></div>
            </div>

            <!-- Center Info / Status -->
            <div class="center-label">
              <span class="deck-badge" [style.color]="deckColor">{{ deckId }}</span>
              <span class="mode-badge">{{ vinylMode ? 'VINYL' : 'CDJ' }}</span>
              <span class="speed-readout">{{ (playbackRate * 100).toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .jog-wheel-wrapper {
      position: relative;
      border-radius: 50%;
      user-select: none;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f1115;
      box-shadow: 0 10px 25px rgba(0,0,0,0.8), inset 0 2px 3px rgba(255,255,255,0.1);
      transition: box-shadow 0.2s ease;
    }
    .jog-wheel-wrapper:active {
      cursor: grabbing;
    }
    .jog-wheel-wrapper.scratching {
      box-shadow: 0 0 25px rgba(0, 240, 255, 0.4), inset 0 0 15px rgba(0, 240, 255, 0.2);
    }
    .outer-bezel {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 2px solid #232730;
      background: radial-gradient(circle, #1a1d24 60%, #0d0e12 100%);
      overflow: hidden;
    }
    .bezel-notch {
      position: absolute;
      top: 0;
      left: calc(50% - 1px);
      width: 2px;
      height: 6px;
      background: #3a404d;
      transform-origin: 50% calc(100% * 0.5);
    }
    .illuminated-ring {
      position: absolute;
      width: 90%;
      height: 90%;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .ring-marker {
      position: absolute;
      top: 0;
      width: 6px;
      height: 12px;
      border-radius: 3px;
      transform: translateY(-50%);
    }
    .ring-marker.opp {
      top: auto;
      bottom: 0;
      width: 4px;
      height: 6px;
      opacity: 0.4;
      transform: translateY(50%);
    }
    .platter-surface {
      position: absolute;
      width: 82%;
      height: 82%;
      border-radius: 50%;
      background: radial-gradient(circle, #16181d 0%, #0a0b0e 100%);
      box-shadow: inset 0 2px 6px rgba(0,0,0,0.9), 0 2px 4px rgba(255,255,255,0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #1f232b;
    }
    .platter-surface.touch-active {
      background: radial-gradient(circle, #1c222b 0%, #0d1015 100%);
    }
    .groove {
      position: absolute;
      border-radius: 50%;
      border: 1px dashed rgba(255,255,255,0.04);
      pointer-events: none;
    }
    .g1 { width: 90%; height: 90%; }
    .g2 { width: 75%; height: 75%; }
    .g3 { width: 60%; height: 60%; }

    .center-display {
      width: 48%;
      height: 48%;
      border-radius: 50%;
      background: #08090b;
      box-shadow: inset 0 0 10px #000, 0 2px 6px rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .display-ring {
      width: 90%;
      height: 90%;
      border-radius: 50%;
      border: 2px solid #282c35;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.3s ease;
    }
    .needle-position {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      pointer-events: none;
    }
    .needle-tip {
      position: absolute;
      top: -3px;
      left: calc(50% - 3px);
      width: 6px;
      height: 10px;
      border-radius: 3px;
    }
    .center-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .deck-badge {
      font-size: 18px;
      font-weight: 900;
      line-height: 1;
      text-shadow: 0 0 8px currentColor;
    }
    .mode-badge {
      font-size: 8px;
      font-weight: 700;
      color: #6d7582;
      letter-spacing: 0.5px;
      margin-top: 1px;
    }
    .speed-readout {
      font-size: 9px;
      font-weight: 600;
      color: #9aa2b0;
      font-variant-numeric: tabular-nums;
      margin-top: 2px;
    }
  `]
})
export class JogWheelComponent {
  @Input() deckId: 'A' | 'B' = 'A';
  @Input() angle = 0; // 0 to 360 deg
  @Input() isPlaying = false;
  @Input() isScratching = false;
  @Input() vinylMode = true;
  @Input() playbackRate = 1.0;
  @Input() size = 210;
  @Input() deckColor = '#00f0ff';

  @Output() jogMove = new EventEmitter<{ deltaAngle: number; isScratch: boolean }>();
  @Output() scratchStart = new EventEmitter<void>();
  @Output() scratchEnd = new EventEmitter<void>();

  @ViewChild('wheelElem') wheelElem!: ElementRef<HTMLDivElement>;

  readonly notches = Array(24).fill(0);
  private isDragging = false;
  private lastAngle = 0;
  private isCenterTouch = false;

  onMouseDown(e: MouseEvent) {
    e.preventDefault();
    if (!this.wheelElem) return;

    const rect = this.wheelElem.nativeElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = rect.width / 2;

    // Center platter touch = Vinyl Scratch, Outer Ring = Pitch bend
    this.isCenterTouch = dist < radius * 0.75;
    this.isDragging = true;
    this.lastAngle = Math.atan2(dy, dx) * (180 / Math.PI);

    if (this.isCenterTouch && this.vinylMode) {
      this.scratchStart.emit();
    }

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging || !this.wheelElem) return;

    const rect = this.wheelElem.nativeElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);

    let delta = currentAngle - this.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    this.lastAngle = currentAngle;
    const isScratch = this.isCenterTouch && this.vinylMode;
    this.jogMove.emit({ deltaAngle: delta, isScratch });
  };

  private onMouseUp = () => {
    if (this.isDragging) {
      this.isDragging = false;
      if (this.isCenterTouch && this.vinylMode) {
        this.scratchEnd.emit();
      }
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);
    }
  };
}
