import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vu-meter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="vu-meter-container" [style.height.px]="height">
      <!-- Left Channel -->
      <div class="vu-bar">
        <div 
          *ngFor="let seg of segments; let i = index" 
          class="vu-segment"
          [ngClass]="getSegmentColorClass(i)"
          [class.active]="isSegmentActive(leftLevel, i)"
          [class.peak]="isPeakSegment(leftPeak, i)"
        ></div>
      </div>

      <!-- Right Channel (if stereo) -->
      <div class="vu-bar" *ngIf="stereo">
        <div 
          *ngFor="let seg of segments; let i = index" 
          class="vu-segment"
          [ngClass]="getSegmentColorClass(i)"
          [class.active]="isSegmentActive(rightLevel, i)"
          [class.peak]="isPeakSegment(rightPeak, i)"
        ></div>
      </div>
    </div>
  `,
  styles: [`
    .vu-meter-container {
      display: flex;
      gap: 3px;
      padding: 3px 2px;
      background: #0d0f12;
      border: 1px solid #1c1f24;
      border-radius: 3px;
      user-select: none;
    }
    .vu-bar {
      display: flex;
      flex-direction: column-reverse;
      gap: 2px;
      width: 5px;
      height: 100%;
    }
    .vu-segment {
      flex: 1;
      border-radius: 1px;
      opacity: 0.15;
      transition: opacity 0.04s ease;
    }
    .vu-segment.active {
      opacity: 1;
    }
    .vu-segment.peak {
      opacity: 1 !important;
      filter: brightness(1.3);
    }
    .seg-green {
      background: #00ff66;
      box-shadow: 0 0 3px #00ff66;
    }
    .seg-yellow {
      background: #ffcc00;
      box-shadow: 0 0 3px #ffcc00;
    }
    .seg-orange {
      background: #ff9500;
      box-shadow: 0 0 3px #ff9500;
    }
    .seg-red {
      background: #ff3b30;
      box-shadow: 0 0 4px #ff3b30;
    }
  `]
})
export class VuMeterComponent {
  @Input() leftLevel = 0; // 0 to 1
  @Input() rightLevel = 0; // 0 to 1
  @Input() leftPeak = 0;
  @Input() rightPeak = 0;
  @Input() stereo = true;
  @Input() height = 120;

  readonly totalSegments = 14;
  readonly segments = Array(14).fill(0);

  getSegmentColorClass(index: number): string {
    if (index >= 12) return 'seg-red';
    if (index >= 10) return 'seg-orange';
    if (index >= 7) return 'seg-yellow';
    return 'seg-green';
  }

  isSegmentActive(level: number, index: number): boolean {
    const threshold = index / this.totalSegments;
    return level >= threshold;
  }

  isPeakSegment(peak: number, index: number): boolean {
    const segIdx = Math.floor(peak * this.totalSegments);
    return segIdx === index && peak > 0.05;
  }
}
