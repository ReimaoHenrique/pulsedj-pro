import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChannelMixerState, MasterMixerState, FxUnitState, CrossfaderCurve, ColorFxType } from '../../models/dj.models';
import { KnobComponent } from '../knob/knob.component';
import { FaderComponent } from '../fader/fader.component';
import { VuMeterComponent } from '../vu-meter/vu-meter.component';

@Component({
  selector: 'app-mixer',
  standalone: true,
  imports: [CommonModule, KnobComponent, FaderComponent, VuMeterComponent],
  template: `
    <div class="mixer-container">
      <!-- Mixer Top: Master / Booth / Master VU Meter -->
      <div class="mixer-top-bar">
        <!-- Master Volume -->
        <app-knob
          label="MASTER"
          [min]="0"
          [max]="1"
          [value]="master.masterVolume"
          [defaultValue]="0.85"
          [size]="38"
          color="#ff3b30"
          (valueChange)="onMasterVolume($event)"
        ></app-knob>

        <!-- Master Stereo VU Meter -->
        <div class="master-vu-block">
          <span class="vu-title">MASTER L/R</span>
          <app-vu-meter
            [leftLevel]="master.vuMaster.left"
            [rightLevel]="master.vuMaster.right"
            [leftPeak]="master.vuMaster.peak"
            [rightPeak]="master.vuMaster.peak"
            [height]="70"
            [stereo]="true"
          ></app-vu-meter>
        </div>

        <!-- Booth Volume -->
        <app-knob
          label="BOOTH"
          [min]="0"
          [max]="1"
          [value]="master.boothVolume"
          [defaultValue]="0.7"
          [size]="38"
          color="#ff9500"
          (valueChange)="onBoothVolume($event)"
        ></app-knob>
      </div>

      <!-- Main Channels Grid: Channel A | Central FX & Cue | Channel B -->
      <div class="mixer-channels-grid">
        <!-- Channel 1 / Deck A Strip -->
        <div class="channel-strip chan-a">
          <div class="channel-header">
            <span class="chan-badge badge-a">CH 1</span>
          </div>

          <!-- Gain / Trim -->
          <app-knob
            label="TRIM"
            [min]="0"
            [max]="2"
            [value]="channelA.gain"
            [defaultValue]="1"
            [size]="36"
            color="#00f0ff"
            (valueChange)="onGain('A', $event)"
          ></app-knob>

          <!-- 3-Band EQ -->
          <div class="eq-stack">
            <app-knob
              label="HI"
              [min]="-26"
              [max]="6"
              [value]="channelA.eqHigh"
              [defaultValue]="0"
              unit="dB"
              [bipolar]="true"
              [size]="36"
              color="#00f0ff"
              (valueChange)="onEq('A', 'high', $event)"
            ></app-knob>
            <app-knob
              label="MID"
              [min]="-26"
              [max]="6"
              [value]="channelA.eqMid"
              [defaultValue]="0"
              unit="dB"
              [bipolar]="true"
              [size]="36"
              color="#00f0ff"
              (valueChange)="onEq('A', 'mid', $event)"
            ></app-knob>
            <app-knob
              label="LOW"
              [min]="-26"
              [max]="6"
              [value]="channelA.eqLow"
              [defaultValue]="0"
              unit="dB"
              [bipolar]="true"
              [size]="36"
              color="#00f0ff"
              (valueChange)="onEq('A', 'low', $event)"
            ></app-knob>
          </div>

          <!-- Sound Color FX (Filter) -->
          <div class="color-fx-box">
            <app-knob
              label="COLOR FX"
              [min]="-100"
              [max]="100"
              [value]="channelA.colorFx"
              [defaultValue]="0"
              [bipolar]="true"
              [size]="38"
              color="#af52de"
              (valueChange)="onColorFx('A', $event)"
            ></app-knob>
            <span class="color-fx-label">LPF ◄ FILTER ► HPF</span>
          </div>

          <!-- Headphone Cue Button -->
          <button 
            class="cue-pfl-btn"
            [class.active]="channelA.pflCue"
            (click)="onTogglePfl('A')"
          >
            🎧 CUE
          </button>

          <!-- Channel Fader & VU Meter -->
          <div class="fader-vu-row">
            <app-vu-meter
              [leftLevel]="vuLevelA.left"
              [rightLevel]="vuLevelA.right"
              [leftPeak]="vuLevelA.peak"
              [rightPeak]="vuLevelA.peak"
              [height]="130"
              [stereo]="false"
            ></app-vu-meter>
            <app-fader
              [min]="0"
              [max]="1"
              [value]="channelA.faderVolume"
              [defaultValue]="0.9"
              orientation="vertical"
              [length]="130"
              [width]="32"
              [showScale]="true"
              (valueChange)="onFader('A', $event)"
            ></app-fader>
          </div>
        </div>

        <!-- Center FX & Monitor Hub -->
        <div class="mixer-center-hub">
          <!-- FX Unit 1 / 2 Control Box -->
          <div class="fx-section">
            <span class="section-title">BEAT FX</span>
            <div class="fx-unit-box" [class.active]="fx1.active">
              <div class="fx-row">
                <span class="fx-badge">FX 1</span>
                <select class="fx-select" [value]="fx1.type" (change)="onFxType(1, $event)">
                  <option value="DELAY">DELAY</option>
                  <option value="REVERB">REVERB</option>
                  <option value="FLANGER">FLANGER</option>
                  <option value="BITCRUSHER">CRUSH</option>
                </select>
              </div>
              <app-knob
                label="D/W"
                [min]="0"
                [max]="100"
                [value]="fx1.dryWet"
                [defaultValue]="40"
                unit="%"
                [size]="32"
                color="#ff9500"
                (valueChange)="onFxDryWet(1, $event)"
              ></app-knob>
              <button class="fx-on-btn" [class.on]="fx1.active" (click)="onToggleFx(1)">
                {{ fx1.active ? 'ON' : 'OFF' }}
              </button>
            </div>
          </div>

          <!-- Headphones Monitor Unit -->
          <div class="headphone-unit">
            <span class="section-title">HEADPHONES</span>
            <app-knob
              label="MIX"
              [min]="0"
              [max]="1"
              [value]="master.headphoneMix"
              [defaultValue]="0.5"
              [bipolar]="true"
              [size]="32"
              color="#34c759"
              (valueChange)="onHeadphoneMix($event)"
            ></app-knob>
            <span class="mix-label">CUE ◄► MST</span>
            <app-knob
              label="LEVEL"
              [min]="0"
              [max]="1"
              [value]="master.headphoneGain"
              [defaultValue]="0.8"
              [size]="32"
              color="#34c759"
              (valueChange)="onHeadphoneGain($event)"
            ></app-knob>
          </div>
        </div>

        <!-- Channel 2 / Deck B Strip -->
        <div class="channel-strip chan-b">
          <div class="channel-header">
            <span class="chan-badge badge-b">CH 2</span>
          </div>

          <!-- Gain / Trim -->
          <app-knob
            label="TRIM"
            [min]="0"
            [max]="2"
            [value]="channelB.gain"
            [defaultValue]="1"
            [size]="36"
            color="#ff007f"
            (valueChange)="onGain('B', $event)"
          ></app-knob>

          <!-- 3-Band EQ -->
          <div class="eq-stack">
            <app-knob
              label="HI"
              [min]="-26"
              [max]="6"
              [value]="channelB.eqHigh"
              [defaultValue]="0"
              unit="dB"
              [bipolar]="true"
              [size]="36"
              color="#ff007f"
              (valueChange)="onEq('B', 'high', $event)"
            ></app-knob>
            <app-knob
              label="MID"
              [min]="-26"
              [max]="6"
              [value]="channelB.eqMid"
              [defaultValue]="0"
              unit="dB"
              [bipolar]="true"
              [size]="36"
              color="#ff007f"
              (valueChange)="onEq('B', 'mid', $event)"
            ></app-knob>
            <app-knob
              label="LOW"
              [min]="-26"
              [max]="6"
              [value]="channelB.eqLow"
              [defaultValue]="0"
              unit="dB"
              [bipolar]="true"
              [size]="36"
              color="#ff007f"
              (valueChange)="onEq('B', 'low', $event)"
            ></app-knob>
          </div>

          <!-- Sound Color FX (Filter) -->
          <div class="color-fx-box">
            <app-knob
              label="COLOR FX"
              [min]="-100"
              [max]="100"
              [value]="channelB.colorFx"
              [defaultValue]="0"
              [bipolar]="true"
              [size]="38"
              color="#af52de"
              (valueChange)="onColorFx('B', $event)"
            ></app-knob>
            <span class="color-fx-label">LPF ◄ FILTER ► HPF</span>
          </div>

          <!-- Headphone Cue Button -->
          <button 
            class="cue-pfl-btn"
            [class.active]="channelB.pflCue"
            (click)="onTogglePfl('B')"
          >
            🎧 CUE
          </button>

          <!-- Channel Fader & VU Meter -->
          <div class="fader-vu-row">
            <app-fader
              [min]="0"
              [max]="1"
              [value]="channelB.faderVolume"
              [defaultValue]="0.9"
              orientation="vertical"
              [length]="130"
              [width]="32"
              [showScale]="true"
              (valueChange)="onFader('B', $event)"
            ></app-fader>
            <app-vu-meter
              [leftLevel]="vuLevelB.left"
              [rightLevel]="vuLevelB.right"
              [leftPeak]="vuLevelB.peak"
              [rightPeak]="vuLevelB.peak"
              [height]="130"
              [stereo]="false"
            ></app-vu-meter>
          </div>
        </div>
      </div>

      <!-- Bottom: Crossfader Section -->
      <div class="crossfader-section">
        <div class="crossfader-header">
          <span class="deck-tag tag-a">A</span>
          <div class="curve-selector">
            <button 
              *ngFor="let curve of curves"
              class="curve-btn"
              [class.active]="master.crossfaderCurve === curve.id"
              (click)="onCrossfaderCurve(curve.id)"
            >
              {{ curve.label }}
            </button>
          </div>
          <span class="deck-tag tag-b">B</span>
        </div>

        <app-fader
          [min]="-1"
          [max]="1"
          [value]="master.crossfader"
          [defaultValue]="0"
          orientation="horizontal"
          [length]="190"
          [width]="36"
          (valueChange)="onCrossfader($event)"
        ></app-fader>
      </div>
    </div>
  `,
  styles: [`
    .mixer-container {
      width: 290px;
      background: #111318;
      border: 1px solid #232731;
      border-radius: 8px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
      user-select: none;
    }

    .mixer-top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #0b0c0f;
      border: 1px solid #1c2028;
      border-radius: 6px;
      padding: 6px 10px;
    }
    .master-vu-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .vu-title {
      font-size: 8px;
      font-weight: 800;
      color: #8c96a8;
      letter-spacing: 0.5px;
    }

    .mixer-channels-grid {
      display: flex;
      gap: 6px;
      justify-content: space-between;
    }
    .channel-strip {
      flex: 1;
      background: #0e1014;
      border: 1px solid #1a1d25;
      border-radius: 6px;
      padding: 6px 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .channel-header {
      width: 100%;
      display: flex;
      justify-content: center;
    }
    .chan-badge {
      font-size: 9px;
      font-weight: 900;
      padding: 2px 8px;
      border-radius: 3px;
      color: #000;
    }
    .badge-a { background: #00f0ff; }
    .badge-b { background: #ff007f; }

    .eq-stack {
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: #14171e;
      padding: 4px 2px;
      border-radius: 4px;
      border: 1px solid #1f242f;
      width: 100%;
      align-items: center;
    }

    .color-fx-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
    }
    .color-fx-label {
      font-size: 6.5px;
      font-weight: 700;
      color: #7a8292;
      letter-spacing: 0.2px;
    }

    .cue-pfl-btn {
      width: 80%;
      background: #1c202a;
      border: 1px solid #2d3444;
      color: #8c96a8;
      font-size: 9px;
      font-weight: 800;
      padding: 4px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.1s;
    }
    .cue-pfl-btn.active {
      background: #ff9500;
      color: #000;
      border-color: #ff9500;
      box-shadow: 0 0 10px #ff9500;
    }

    .fader-vu-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
    }

    .mixer-center-hub {
      width: 74px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      justify-content: space-between;
    }
    .section-title {
      font-size: 7.5px;
      font-weight: 800;
      color: #636b7b;
      text-transform: uppercase;
      text-align: center;
      display: block;
      margin-bottom: 3px;
    }
    .fx-section, .headphone-unit {
      background: #0e1014;
      border: 1px solid #1a1d25;
      border-radius: 6px;
      padding: 6px 3px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .fx-unit-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      width: 100%;
    }
    .fx-row {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      width: 100%;
    }
    .fx-badge {
      font-size: 8px;
      font-weight: 800;
      color: #ff9500;
    }
    .fx-select {
      background: #161820;
      border: 1px solid #2b303d;
      color: #e5e9f0;
      font-size: 8px;
      font-weight: 700;
      padding: 2px;
      border-radius: 3px;
      width: 95%;
    }
    .fx-on-btn {
      width: 90%;
      background: #1c202a;
      border: 1px solid #ff9500;
      color: #ff9500;
      font-size: 9px;
      font-weight: 800;
      padding: 3px;
      border-radius: 3px;
      cursor: pointer;
    }
    .fx-on-btn.on {
      background: #ff9500;
      color: #000;
      box-shadow: 0 0 8px #ff9500;
    }
    .mix-label {
      font-size: 6px;
      color: #5d6677;
      font-weight: 700;
    }

    .crossfader-section {
      background: #0b0c0f;
      border: 1px solid #1c2028;
      border-radius: 6px;
      padding: 8px 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .crossfader-header {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 4px;
    }
    .deck-tag {
      font-size: 11px;
      font-weight: 900;
    }
    .tag-a { color: #00f0ff; }
    .tag-b { color: #ff007f; }

    .curve-selector {
      display: flex;
      gap: 2px;
      background: #14171d;
      padding: 2px;
      border-radius: 3px;
    }
    .curve-btn {
      background: transparent;
      border: none;
      color: #636b7b;
      font-size: 7.5px;
      font-weight: 700;
      padding: 2px 4px;
      border-radius: 2px;
      cursor: pointer;
    }
    .curve-btn.active {
      background: #252a36;
      color: #fff;
    }
  `]
})
export class MixerComponent {
  @Input() channelA!: ChannelMixerState;
  @Input() channelB!: ChannelMixerState;
  @Input() master!: MasterMixerState;
  @Input() fx1!: FxUnitState;
  @Input() fx2!: FxUnitState;
  @Input() vuLevelA = { left: 0, right: 0, peak: 0 };
  @Input() vuLevelB = { left: 0, right: 0, peak: 0 };

  @Output() gainChange = new EventEmitter<{ deckId: 'A' | 'B'; value: number }>();
  @Output() eqChange = new EventEmitter<{ deckId: 'A' | 'B'; band: 'high' | 'mid' | 'low'; value: number }>();
  @Output() colorFxChange = new EventEmitter<{ deckId: 'A' | 'B'; value: number }>();
  @Output() faderChange = new EventEmitter<{ deckId: 'A' | 'B'; value: number }>();
  @Output() crossfaderChange = new EventEmitter<number>();
  @Output() crossfaderCurveChange = new EventEmitter<CrossfaderCurve>();
  @Output() masterVolumeChange = new EventEmitter<number>();
  @Output() boothVolumeChange = new EventEmitter<number>();
  @Output() headphoneMixChange = new EventEmitter<number>();
  @Output() headphoneGainChange = new EventEmitter<number>();
  @Output() togglePfl = new EventEmitter<'A' | 'B'>();
  @Output() toggleFx = new EventEmitter<1 | 2>();
  @Output() fxTypeChange = new EventEmitter<{ unit: 1 | 2; type: any }>();
  @Output() fxDryWetChange = new EventEmitter<{ unit: 1 | 2; value: number }>();

  readonly curves: { id: CrossfaderCurve; label: string }[] = [
    { id: 'SMOOTH', label: 'SMOOTH' },
    { id: 'LINEAR', label: 'LINEAR' },
    { id: 'FAST_CUT', label: 'CUT' },
  ];

  onGain(deckId: 'A' | 'B', val: number) {
    this.gainChange.emit({ deckId, value: val });
  }

  onEq(deckId: 'A' | 'B', band: 'high' | 'mid' | 'low', val: number) {
    this.eqChange.emit({ deckId, band, value: val });
  }

  onColorFx(deckId: 'A' | 'B', val: number) {
    this.colorFxChange.emit({ deckId, value: val });
  }

  onFader(deckId: 'A' | 'B', val: number) {
    this.faderChange.emit({ deckId, value: val });
  }

  onCrossfader(val: number) {
    this.crossfaderChange.emit(val);
  }

  onCrossfaderCurve(curve: CrossfaderCurve) {
    this.crossfaderCurveChange.emit(curve);
  }

  onMasterVolume(val: number) {
    this.masterVolumeChange.emit(val);
  }

  onBoothVolume(val: number) {
    this.boothVolumeChange.emit(val);
  }

  onHeadphoneMix(val: number) {
    this.headphoneMixChange.emit(val);
  }

  onHeadphoneGain(val: number) {
    this.headphoneGainChange.emit(val);
  }

  onTogglePfl(deckId: 'A' | 'B') {
    this.togglePfl.emit(deckId);
  }

  onToggleFx(unit: 1 | 2) {
    this.toggleFx.emit(unit);
  }

  onFxType(unit: 1 | 2, event: Event) {
    const type = (event.target as HTMLSelectElement).value;
    this.fxTypeChange.emit({ unit, type });
  }

  onFxDryWet(unit: 1 | 2, value: number) {
    this.fxDryWetChange.emit({ unit, value });
  }
}
