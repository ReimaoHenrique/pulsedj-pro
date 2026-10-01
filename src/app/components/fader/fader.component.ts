import { Component, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="fader-wrapper" 
      [class.horizontal]="orientation === 'horizontal'"
      [class.vertical]="orientation === 'vertical'"
      [style.width.px]="orientation === 'horizontal' ? length : width"
      [style.height.px]="orientation === 'vertical' ? length : width"
    >
      <div 
        #trackElem
        class="fader-track"
        (mousedown)="onTrackMouseDown($event)"
      >
        <!-- Scale ticks -->
        <div class="fader-scale" *ngIf="showScale">
          <div class="tick max"><span>+6</span></div>
          <div class="tick zero"><span>0</span></div>
          <div class="tick minus6"><span>-6</span></div>
          <div class="tick minus12"><span>-12</span></div>
          <div class="tick minusinf"><span>-∞</span></div>
        </div>

        <!-- Fader Cap / Handle -->
        <div 
          class="fader-cap"
          [style.top]="orientation === 'vertical' ? capPosition + 'px' : 'auto'"
          [style.left]="orientation === 'horizontal' ? capPosition + 'px' : 'auto'"
          (mousedown)="onCapMouseDown($event)"
          (dblclick)="resetDefault()"
        >
          <div class="cap-line"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fader-wrapper {
      position: relative;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .fader-track {
      position: relative;
      background: #121417;
      border: 1px solid #22252a;
      border-radius: 4px;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.8);
      cursor: pointer;
    }
    .vertical .fader-track {
      width: 12px;
      height: 100%;
    }
    .horizontal .fader-track {
      height: 12px;
      width: 100%;
    }
    .fader-cap {
      position: absolute;
      background: linear-gradient(180deg, #3a3f4b 0%, #1f2229 50%, #14161a 100%);
      border: 1px solid #4a505e;
      border-radius: 3px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.25);
      cursor: grab;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .fader-cap:active {
      cursor: grabbing;
      border-color: #00f0ff;
    }
    .vertical .fader-cap {
      width: 32px;
      height: 18px;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    .horizontal .fader-cap {
      width: 20px;
      height: 34px;
      top: 50%;
      transform: translate(-50%, -50%);
    }
    .cap-line {
      background: #00f0ff;
      box-shadow: 0 0 5px #00f0ff;
    }
    .vertical .cap-line {
      width: 20px;
      height: 2px;
    }
    .horizontal .cap-line {
      width: 2px;
      height: 20px;
    }
    .fader-scale {
      position: absolute;
      right: 18px;
      top: 0;
      bottom: 0;
      width: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 8px;
      color: #6c7280;
      font-weight: 600;
      pointer-events: none;
    }
    .tick {
      display: flex;
      align-items: center;
      gap: 3px;
    }
  `]
})
export class FaderComponent {
  @Input() min = 0;
  @Input() max = 1;
  @Input() value = 0.8;
  @Input() defaultValue = 0.8;
  @Input() orientation: 'vertical' | 'horizontal' = 'vertical';
  @Input() length = 140;
  @Input() width = 40;
  @Input() showScale = false;

  @Output() valueChange = new EventEmitter<number>();

  @ViewChild('trackElem') trackElem!: ElementRef<HTMLDivElement>;

  private isDragging = false;

  get capPosition(): number {
    const trackSize = this.length;
    const norm = (this.value - this.min) / (this.max - this.min);
    if (this.orientation === 'vertical') {
      // 1.0 (top) -> position 0, 0.0 (bottom) -> position trackSize
      return (1 - norm) * trackSize;
    } else {
      // -1.0 (left) -> position 0, +1.0 (right) -> position trackSize
      return norm * trackSize;
    }
  }

  onTrackMouseDown(e: MouseEvent) {
    this.updateValueFromMouse(e);
    this.startDrag(e);
  }

  onCapMouseDown(e: MouseEvent) {
    e.stopPropagation();
    this.startDrag(e);
  }

  private startDrag(e: MouseEvent) {
    this.isDragging = true;
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    this.updateValueFromMouse(e);
  };

  private onMouseUp = () => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };

  private updateValueFromMouse(e: MouseEvent) {
    if (!this.trackElem) return;
    const rect = this.trackElem.nativeElement.getBoundingClientRect();
    let norm = 0;

    if (this.orientation === 'vertical') {
      const pos = e.clientY - rect.top;
      norm = 1 - Math.max(0, Math.min(1, pos / rect.height));
    } else {
      const pos = e.clientX - rect.left;
      norm = Math.max(0, Math.min(1, pos / rect.width));
    }

    let newVal = this.min + norm * (this.max - this.min);

    // Center detent for crossfader
    if (this.orientation === 'horizontal' && Math.abs(newVal) < 0.05) {
      newVal = 0;
    }

    this.value = newVal;
    this.valueChange.emit(this.value);
  }

  resetDefault() {
    this.value = this.defaultValue;
    this.valueChange.emit(this.value);
  }
}
