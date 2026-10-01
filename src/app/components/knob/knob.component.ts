import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-knob',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="knob-container" [class.bipolar]="bipolar" (dblclick)="resetToDefault()">
      <span class="knob-label" *ngIf="label">{{ label }}</span>
      <div 
        #knobCircle
        class="knob-body"
        [style.width.px]="size"
        [style.height.px]="size"
        (mousedown)="onMouseDown($event)"
        [title]="label + ': ' + formattedValue"
      >
        <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 100 100" class="knob-svg">
          <!-- Background arc -->
          <circle
            cx="50"
            cy="50"
            r="40"
            class="knob-track"
            stroke-dasharray="190"
            stroke-dashoffset="0"
          />
          <!-- Active value arc -->
          <circle
            cx="50"
            cy="50"
            r="40"
            class="knob-arc"
            [style.stroke]="color"
            [attr.stroke-dasharray]="arcDashArray"
            [attr.stroke-dashoffset]="arcDashOffset"
            [style.transform]="bipolar ? 'rotate(-90deg)' : 'rotate(135deg)'"
            transform-origin="50 50"
          />
        </svg>

        <!-- Center dial cap with indicator needle -->
        <div class="knob-cap" [style.transform]="'rotate(' + rotationAngle + 'deg)'">
          <div class="knob-pointer" [style.background]="color"></div>
        </div>

        <div class="center-detent" *ngIf="bipolar && isNearCenter"></div>
      </div>
      <span class="knob-val" *ngIf="showValue">{{ formattedValue }}</span>
    </div>
  `,
  styles: [`
    .knob-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      user-select: none;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    .knob-label {
      font-size: 10px;
      font-weight: 700;
      color: #8e8e93;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .knob-body {
      position: relative;
      cursor: ns-resize;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .knob-svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      transform: rotate(0deg);
    }
    .knob-track {
      fill: none;
      stroke: #22252a;
      stroke-width: 7;
      stroke-linecap: round;
      transform: rotate(135deg);
      transform-origin: 50px 50px;
    }
    .knob-arc {
      fill: none;
      stroke-width: 7;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.05s ease;
      filter: drop-shadow(0 0 3px rgba(0, 240, 255, 0.4));
    }
    .knob-cap {
      width: 72%;
      height: 72%;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #3a3f4a, #181a1f);
      box-shadow: 0 3px 6px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.8);
      position: relative;
      display: flex;
      justify-content: center;
      border: 1px solid #111317;
    }
    .knob-pointer {
      position: absolute;
      top: 3px;
      width: 3px;
      height: 9px;
      border-radius: 2px;
      box-shadow: 0 0 4px currentColor;
    }
    .knob-val {
      font-size: 9px;
      font-weight: 600;
      color: #99a2b2;
      margin-top: 2px;
      font-variant-numeric: tabular-nums;
    }
    .center-detent {
      position: absolute;
      top: 2px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #00f0ff;
      box-shadow: 0 0 5px #00f0ff;
    }
  `]
})
export class KnobComponent {
  @Input() min = 0;
  @Input() max = 100;
  @Input() value = 0;
  @Input() defaultValue = 0;
  @Input() label = '';
  @Input() unit = '';
  @Input() size = 44;
  @Input() color = '#00f0ff';
  @Input() bipolar = false;
  @Input() showValue = true;

  @Output() valueChange = new EventEmitter<number>();

  @ViewChild('knobCircle') knobCircle!: ElementRef<HTMLDivElement>;

  private isDragging = false;
  private startY = 0;
  private startValue = 0;

  get formattedValue(): string {
    if (this.bipolar) {
      if (Math.abs(this.value) < 0.1) return '0' + this.unit;
      return (this.value > 0 ? '+' : '') + this.value.toFixed(1) + this.unit;
    }
    return this.value.toFixed(this.unit === 'dB' ? 1 : 0) + this.unit;
  }

  get isNearCenter(): boolean {
    return Math.abs(this.value - this.defaultValue) < (this.max - this.min) * 0.03;
  }

  get rotationAngle(): number {
    const norm = (this.value - this.min) / (this.max - this.min);
    return -135 + norm * 270; // -135deg to +135deg
  }

  get arcDashArray(): string {
    return '190 250';
  }

  get arcDashOffset(): number {
    const circumference = 190;
    if (this.bipolar) {
      const center = (this.min + this.max) / 2;
      const span = (this.max - this.min) / 2;
      const fraction = (this.value - center) / span;
      return circumference * (1 - Math.abs(fraction) * 0.7);
    } else {
      const norm = (this.value - this.min) / (this.max - this.min);
      return circumference * (1 - norm * 0.75);
    }
  }

  onMouseDown(e: MouseEvent) {
    e.preventDefault();
    this.isDragging = true;
    this.startY = e.clientY;
    this.startValue = this.value;
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const dy = this.startY - e.clientY; // Up is increase
    const range = this.max - this.min;
    const sensitivity = e.shiftKey ? 400 : 150; // Shift for fine-tuning
    let newVal = this.startValue + (dy / sensitivity) * range;

    // Center detent snap for bipolar knobs
    if (this.bipolar && Math.abs(newVal - this.defaultValue) < range * 0.02) {
      newVal = this.defaultValue;
    }

    newVal = Math.max(this.min, Math.min(this.max, newVal));
    this.value = newVal;
    this.valueChange.emit(this.value);
  };

  private onMouseUp = () => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };

  resetToDefault() {
    this.value = this.defaultValue;
    this.valueChange.emit(this.value);
  }
}
