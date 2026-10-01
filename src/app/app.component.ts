import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioEngineService } from './services/audio-engine.service';
import { DeckComponent } from './components/deck/deck.component';
import { MixerComponent } from './components/mixer/mixer.component';
import { BrowserComponent } from './components/browser/browser.component';
import { StackedWaveformComponent } from './components/stacked-waveform/stacked-waveform.component';
import { Track, PadMode, CrossfaderCurve } from './models/dj.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    DeckComponent,
    MixerComponent,
    BrowserComponent,
    StackedWaveformComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly audio = inject(AudioEngineService);

  showHelpModal = signal(false);
  viewMode = signal<'PRO' | 'STACKED' | 'MINI'>('PRO');
  quantizeActive = signal(true);

  // Keyboard Shortcuts for DJ controls
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(e: KeyboardEvent) {
    // Avoid triggering when user is typing in search input
    if ((e.target as HTMLElement).tagName === 'INPUT') return;

    const key = e.key.toUpperCase();

    switch (key) {
      // Deck A Transport
      case 'Q':
        this.audio.cue('A');
        break;
      case 'W':
        this.audio.togglePlay('A');
        break;
      case 'E':
        this.audio.sync('A');
        break;
      case 'A':
        this.audio.nudge('A', -1);
        break;
      case 'S':
        this.audio.nudge('A', 1);
        break;
      case '1':
        this.audio.triggerHotCue('A', 0);
        break;
      case '2':
        this.audio.triggerHotCue('A', 1);
        break;
      case '3':
        this.audio.triggerHotCue('A', 2);
        break;
      case '4':
        this.audio.triggerHotCue('A', 3);
        break;

      // Deck B Transport
      case 'U':
        this.audio.cue('B');
        break;
      case 'I':
        this.audio.togglePlay('B');
        break;
      case 'O':
        this.audio.sync('B');
        break;
      case 'K':
        this.audio.nudge('B', -1);
        break;
      case 'L':
        this.audio.nudge('B', 1);
        break;
      case '7':
        this.audio.triggerHotCue('B', 0);
        break;
      case '8':
        this.audio.triggerHotCue('B', 1);
        break;
      case '9':
        this.audio.triggerHotCue('B', 2);
        break;
      case '0':
        this.audio.triggerHotCue('B', 3);
        break;

      // Crossfader
      case '[':
        this.audio.setCrossfader(Math.max(-1, this.audio.master().crossfader - 0.2));
        break;
      case ']':
        this.audio.setCrossfader(Math.min(1, this.audio.master().crossfader + 0.2));
        break;
      case '\\':
        this.audio.setCrossfader(0);
        break;

      // Sampler
      case 'Z':
        this.audio.triggerSampler(0);
        break;
      case 'X':
        this.audio.triggerSampler(1);
        break;
      case 'C':
        this.audio.triggerSampler(2);
        break;
      case 'V':
        this.audio.triggerSampler(3);
        break;

      case ' ':
        e.preventDefault();
        this.audio.togglePlay('A');
        break;
      case 'H':
        this.showHelpModal.update((v) => !v);
        break;
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const key = e.key.toUpperCase();
    if (key === 'Q') {
      this.audio.cueRelease('A');
    } else if (key === 'U') {
      this.audio.cueRelease('B');
    }
  }

  // --- Deck A Handlers ---
  onDeckPlay(deckId: 'A' | 'B') {
    this.audio.play(deckId);
  }

  onDeckPause(deckId: 'A' | 'B') {
    this.audio.pause(deckId);
  }

  onDeckTogglePlay(deckId: 'A' | 'B') {
    this.audio.togglePlay(deckId);
  }

  onDeckCueDown(deckId: 'A' | 'B') {
    this.audio.cue(deckId);
  }

  onDeckCueUp(deckId: 'A' | 'B') {
    this.audio.cueRelease(deckId);
  }

  onDeckSeek(deckId: 'A' | 'B', time: number) {
    this.audio.seek(deckId, time);
  }

  onDeckTempoChange(deckId: 'A' | 'B', percent: number) {
    this.audio.setTempo(deckId, percent);
  }

  onDeckPitchRangeChange(deckId: 'A' | 'B', range: number) {
    this.audio.setPitchRange(deckId, range);
  }

  onDeckSync(deckId: 'A' | 'B') {
    this.audio.sync(deckId);
  }

  onDeckMasterTempo(deckId: 'A' | 'B') {
    this.audio.toggleMasterTempo(deckId);
  }

  onDeckVinylMode(deckId: 'A' | 'B') {
    if (deckId === 'A') {
      this.audio.deckA.update((d) => ({ ...d, vinylMode: !d.vinylMode }));
    } else {
      this.audio.deckB.update((d) => ({ ...d, vinylMode: !d.vinylMode }));
    }
  }

  onDeckSlipMode(deckId: 'A' | 'B') {
    if (deckId === 'A') {
      this.audio.deckA.update((d) => ({ ...d, slipMode: !d.slipMode }));
    } else {
      this.audio.deckB.update((d) => ({ ...d, slipMode: !d.slipMode }));
    }
  }

  onDeckNudge(deckId: 'A' | 'B', dir: 1 | -1) {
    this.audio.nudge(deckId, dir);
  }

  onDeckJogMove(deckId: 'A' | 'B', event: { deltaAngle: number; isScratch: boolean }) {
    this.audio.jogWheel(deckId, event.deltaAngle, event.isScratch);
  }

  onDeckLoopToggle(deckId: 'A' | 'B') {
    this.audio.toggleLoop(deckId);
  }

  onDeckLoopSizeChange(deckId: 'A' | 'B', size: number) {
    this.audio.setLoopSize(deckId, size);
  }

  onDeckHotCue(deckId: 'A' | 'B', index: number) {
    this.audio.triggerHotCue(deckId, index);
  }

  onDeckPadMode(deckId: 'A' | 'B', mode: PadMode) {
    this.audio.setPadMode(deckId, mode);
  }

  onDeckSampler(index: number) {
    this.audio.triggerSampler(index);
  }

  onDeckStemToggle(deckId: 'A' | 'B', stem: 'vocals' | 'melody' | 'bass' | 'drums') {
    const current = deckId === 'A' ? this.audio.deckA().stems[stem] : this.audio.deckB().stems[stem];
    const newVol = current > 0.1 ? 0 : 1;
    this.audio.setStemVolume(deckId, stem, newVol);
  }

  onDeckTrackDrop(deckId: 'A' | 'B', trackId: string) {
    const track = this.audio.library().find((t) => t.id === trackId);
    if (track) {
      this.audio.loadTrackToDeck(deckId, track);
    }
  }

  onDeckFileDrop(deckId: 'A' | 'B', file: File) {
    this.audio.loadUserAudioFile(deckId, file);
  }

  // --- Mixer Handlers ---
  onMixerGain(event: { deckId: 'A' | 'B'; value: number }) {
    this.audio.setGain(event.deckId, event.value);
  }

  onMixerEq(event: { deckId: 'A' | 'B'; band: 'high' | 'mid' | 'low'; value: number }) {
    this.audio.setEq(event.deckId, event.band, event.value);
  }

  onMixerColorFx(event: { deckId: 'A' | 'B'; value: number }) {
    this.audio.setColorFx(event.deckId, event.value);
  }

  onMixerFader(event: { deckId: 'A' | 'B'; value: number }) {
    this.audio.setFader(event.deckId, event.value);
  }

  onMixerCrossfader(value: number) {
    this.audio.setCrossfader(value);
  }

  onMixerCrossfaderCurve(curve: CrossfaderCurve) {
    this.audio.master.update((m) => ({ ...m, crossfaderCurve: curve }));
    this.audio.setCrossfader(this.audio.master().crossfader);
  }

  onMixerMasterVolume(value: number) {
    this.audio.setMasterVolume(value);
  }

  onMixerBoothVolume(value: number) {
    this.audio.setBoothVolume(value);
  }

  onMixerHeadphoneMix(value: number) {
    this.audio.setHeadphoneMix(value);
  }

  onMixerHeadphoneGain(value: number) {
    this.audio.master.update((m) => ({ ...m, headphoneGain: value }));
  }

  onMixerTogglePfl(deckId: 'A' | 'B') {
    this.audio.togglePfl(deckId);
  }

  onMixerToggleFx(unit: 1 | 2) {
    this.audio.toggleFx(unit);
  }

  onMixerFxType(event: { unit: 1 | 2; type: any }) {
    this.audio.setFxParam(event.unit, 'type', event.type);
  }

  onMixerFxDryWet(event: { unit: 1 | 2; value: number }) {
    this.audio.setFxParam(event.unit, 'dryWet', event.value);
  }

  // --- Browser Handlers ---
  onLoadTrack(event: { deckId: 'A' | 'B'; track: Track }) {
    this.audio.loadTrackToDeck(event.deckId, event.track);
  }

  onImportFile(event: { deckId: 'A' | 'B'; file: File }) {
    this.audio.loadUserAudioFile(event.deckId, event.file);
  }

  // --- Header Handlers ---
  toggleRecording() {
    this.audio.toggleRecord();
  }

  toggleQuantize() {
    this.quantizeActive.update((q) => !q);
  }

  setViewMode(mode: 'PRO' | 'STACKED' | 'MINI') {
    this.viewMode.set(mode);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  formatRecDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
}
