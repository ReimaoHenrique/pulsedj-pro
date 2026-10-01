import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Track } from '../../models/dj.models';

@Component({
  selector: 'app-browser',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="browser-container">
      <!-- Crates / Tree Sidebar -->
      <div class="browser-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">CRATES & PLAYLISTS</span>
        </div>
        <div class="crate-list">
          <div 
            *ngFor="let crate of crates"
            class="crate-item"
            [class.active]="selectedCrate === crate.id"
            (click)="selectCrate(crate.id)"
          >
            <span class="crate-icon">{{ crate.icon }}</span>
            <span class="crate-name">{{ crate.name }}</span>
            <span class="crate-count">{{ getCrateCount(crate.id) }}</span>
          </div>
        </div>

        <!-- Import Button & Drop hint -->
        <div class="import-section">
          <label class="import-btn">
            📂 IMPORTAR ÁUDIO
            <input type="file" accept="audio/*" multiple (change)="onFileSelected($event)" style="display:none" />
          </label>
          <span class="drop-hint">Arraste arquivos MP3/WAV para cá</span>
        </div>
      </div>

      <!-- Main Track Table Area -->
      <div class="browser-main">
        <!-- Search & Filter Bar -->
        <div class="browser-toolbar">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar faixa, artista, BPM, tom (Key)..." 
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
              class="search-input"
            />
            <button *ngIf="searchQuery" (click)="clearSearch()" class="clear-search">✕</button>
          </div>

          <!-- Harmonic Key Matching Filter Toggle -->
          <button 
            class="filter-toggle-btn"
            [class.active]="harmonicMatchOnly"
            (click)="toggleHarmonicMatch()"
            title="Mostrar apenas faixas harmonicamente compatíveis (Camelot Wheel)"
          >
            🎼 HARMONIC MATCH {{ activeDeckKey ? '(' + activeDeckKey + ')' : '' }}
          </button>
        </div>

        <!-- Track Table -->
        <div 
          class="table-wrapper"
          (dragover)="onDragOver($event)"
          (drop)="onDrop($event)"
        >
          <table class="track-table">
            <thead>
              <tr>
                <th class="col-num">#</th>
                <th class="col-actions">LOAD</th>
                <th class="col-title">TÍTULO</th>
                <th class="col-artist">ARTISTA</th>
                <th class="col-bpm">BPM</th>
                <th class="col-key">KEY</th>
                <th class="col-time">TEMPO</th>
                <th class="col-genre">GÊNERO</th>
                <th class="col-rating">RATING</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                *ngFor="let track of filteredTracks; let i = index"
                class="track-row"
                [class.harmonic-match]="isHarmonicMatch(track.key)"
                [class.deck-a-loaded]="deckATrackId === track.id"
                [class.deck-b-loaded]="deckBTrackId === track.id"
                draggable="true"
                (dragstart)="onTrackDragStart($event, track)"
                (dblclick)="onLoadToDeck('A', track)"
                title="Clique duplo ou arraste para carregar no Deck A ou Deck B"
              >
                <td class="col-num">{{ i + 1 }}</td>
                <td class="col-actions">
                  <div class="load-btn-group">
                    <button class="load-deck-btn btn-a" (click)="onLoadToDeck('A', track)">LOAD A</button>
                    <button class="load-deck-btn btn-b" (click)="onLoadToDeck('B', track)">LOAD B</button>
                  </div>
                </td>
                <td class="col-title">
                  <div class="title-cell">
                    <div class="track-color-pip" [style.background]="track.color"></div>
                    <span class="track-name-text">{{ track.title }}</span>
                  </div>
                </td>
                <td class="col-artist">{{ track.artist }}</td>
                <td class="col-bpm">
                  <span class="bpm-badge">{{ track.bpm.toFixed(1) }}</span>
                </td>
                <td class="col-key">
                  <span 
                    class="key-badge" 
                    [class.match]="isHarmonicMatch(track.key)"
                  >
                    {{ track.key }} ({{ track.musicalKey }})
                  </span>
                </td>
                <td class="col-time">{{ formatDuration(track.duration) }}</td>
                <td class="col-genre">
                  <span class="genre-pill">{{ track.genre }}</span>
                </td>
                <td class="col-rating">
                  <span class="stars">{{ getStars(track.rating) }}</span>
                </td>
              </tr>

              <tr *ngIf="filteredTracks.length === 0">
                <td colspan="9" class="empty-state">
                  Nenhuma faixa encontrada para a busca "{{ searchQuery }}"
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .browser-container {
      display: flex;
      height: 230px;
      background: #0d0e12;
      border: 1px solid #1e222b;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 6px 18px rgba(0,0,0,0.5);
      user-select: none;
    }

    .browser-sidebar {
      width: 190px;
      background: #090a0d;
      border-right: 1px solid #1c2028;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 6px;
    }
    .sidebar-header {
      padding: 4px 6px;
    }
    .sidebar-title {
      font-size: 8px;
      font-weight: 800;
      color: #636b7b;
      letter-spacing: 0.5px;
    }
    .crate-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
      flex: 1;
    }
    .crate-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      border-radius: 4px;
      cursor: pointer;
      color: #8c96a8;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.1s;
    }
    .crate-item:hover {
      background: #14171f;
      color: #fff;
    }
    .crate-item.active {
      background: #1b212c;
      color: #00f0ff;
    }
    .crate-icon {
      font-size: 12px;
    }
    .crate-name {
      flex: 1;
    }
    .crate-count {
      font-size: 9px;
      background: #12141a;
      padding: 1px 4px;
      border-radius: 3px;
      color: #636b7b;
    }

    .import-section {
      border-top: 1px solid #1c2028;
      padding-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
    }
    .import-btn {
      width: 100%;
      background: #181d27;
      border: 1px dashed #343d52;
      color: #00f0ff;
      font-size: 9px;
      font-weight: 800;
      padding: 6px;
      border-radius: 4px;
      text-align: center;
      cursor: pointer;
      transition: all 0.15s;
    }
    .import-btn:hover {
      background: #232b3a;
      border-color: #00f0ff;
    }
    .drop-hint {
      font-size: 7.5px;
      color: #555e6f;
      text-align: center;
    }

    .browser-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .browser-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 6px 10px;
      background: #0f1116;
      border-bottom: 1px solid #1c2028;
    }
    .search-box {
      flex: 1;
      max-width: 400px;
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 8px;
      font-size: 10px;
      color: #636b7b;
    }
    .search-input {
      width: 100%;
      background: #151820;
      border: 1px solid #282e3d;
      border-radius: 4px;
      padding: 4px 24px 4px 26px;
      font-size: 11px;
      color: #fff;
      outline: none;
    }
    .search-input:focus {
      border-color: #00f0ff;
    }
    .clear-search {
      position: absolute;
      right: 6px;
      background: transparent;
      border: none;
      color: #636b7b;
      cursor: pointer;
      font-size: 10px;
    }
    .filter-toggle-btn {
      background: #141720;
      border: 1px solid #252b3a;
      color: #8c96a8;
      font-size: 9px;
      font-weight: 800;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.1s;
    }
    .filter-toggle-btn.active {
      background: #1e2838;
      border-color: #00f0ff;
      color: #00f0ff;
      box-shadow: 0 0 8px rgba(0,240,255,0.3);
    }

    .table-wrapper {
      flex: 1;
      overflow-y: auto;
    }
    .track-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      position: sticky;
      top: 0;
      background: #12141a;
      color: #636b7b;
      font-size: 8px;
      font-weight: 800;
      text-align: left;
      padding: 5px 8px;
      border-bottom: 1px solid #1c2028;
      z-index: 2;
    }
    .track-row {
      border-bottom: 1px solid #151820;
      transition: background 0.1s;
      cursor: pointer;
    }
    .track-row:hover {
      background: #161922;
    }
    .track-row.harmonic-match {
      background: rgba(0, 240, 255, 0.05);
    }
    .track-row.deck-a-loaded {
      border-left: 3px solid #00f0ff;
    }
    .track-row.deck-b-loaded {
      border-left: 3px solid #ff007f;
    }
    td {
      padding: 5px 8px;
      color: #cdd5e2;
      vertical-align: middle;
    }
    .col-num { width: 25px; color: #555d6e; font-size: 9px; text-align: center; }
    .col-actions { width: 110px; }
    .load-btn-group {
      display: flex;
      gap: 3px;
    }
    .load-deck-btn {
      font-size: 8px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 3px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.1s;
    }
    .btn-a {
      background: #12222a;
      border-color: #00f0ff;
      color: #00f0ff;
    }
    .btn-a:hover {
      background: #00f0ff;
      color: #000;
    }
    .btn-b {
      background: #2a1222;
      border-color: #ff007f;
      color: #ff007f;
    }
    .btn-b:hover {
      background: #ff007f;
      color: #000;
    }

    .title-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .track-color-pip {
      width: 4px;
      height: 14px;
      border-radius: 2px;
    }
    .track-name-text {
      font-weight: 700;
      color: #ffffff;
    }
    .col-artist { color: #8c96a8; }
    .bpm-badge {
      font-weight: 700;
      color: #00f0ff;
      font-variant-numeric: tabular-nums;
    }
    .key-badge {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 3px;
      background: #1c202a;
      color: #9aa4b5;
    }
    .key-badge.match {
      background: #00f0ff;
      color: #000;
      box-shadow: 0 0 6px #00f0ff;
    }
    .col-time {
      font-variant-numeric: tabular-nums;
      color: #7b8596;
    }
    .genre-pill {
      font-size: 8.5px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      background: #171a22;
      color: #8c96a8;
    }
    .stars {
      color: #ffcc00;
      font-size: 9px;
    }
    .empty-state {
      text-align: center;
      padding: 24px;
      color: #636b7b;
      font-style: italic;
    }
  `]
})
export class BrowserComponent {
  @Input() tracks: Track[] = [];
  @Input() deckATrackId: string | null = null;
  @Input() deckBTrackId: string | null = null;
  @Input() activeDeckKey: string = '8A';

  @Output() loadToDeck = new EventEmitter<{ deckId: 'A' | 'B'; track: Track }>();
  @Output() fileImport = new EventEmitter<{ deckId: 'A' | 'B'; file: File }>();

  searchQuery = '';
  selectedCrate = 'all';
  harmonicMatchOnly = false;

  readonly crates = [
    { id: 'all', name: 'Todas as Faixas', icon: '🎵' },
    { id: 'tech-house', name: 'Tech House', icon: '⚡' },
    { id: 'techno', name: 'Peak Techno', icon: '🌑' },
    { id: 'melodic', name: 'Melodic House', icon: '✨' },
    { id: 'dnb', name: 'Drum & Bass', icon: '🚀' },
    { id: 'custom', name: 'Importadas', icon: '📁' },
  ];

  get filteredTracks(): Track[] {
    return this.tracks.filter((t) => {
      // Crate filter
      if (this.selectedCrate !== 'all') {
        if (this.selectedCrate === 'custom' && !t.fileName) return false;
        if (this.selectedCrate !== 'custom' && t.proceduralTheme !== this.selectedCrate) return false;
      }

      // Harmonic match filter
      if (this.harmonicMatchOnly && !this.isHarmonicMatch(t.key)) {
        return false;
      }

      // Search query
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.genre.toLowerCase().includes(q) ||
          t.key.toLowerCase().includes(q) ||
          t.musicalKey.toLowerCase().includes(q) ||
          t.bpm.toString().includes(q)
        );
      }

      return true;
    });
  }

  getCrateCount(crateId: string): number {
    if (crateId === 'all') return this.tracks.length;
    if (crateId === 'custom') return this.tracks.filter((t) => !!t.fileName).length;
    return this.tracks.filter((t) => t.proceduralTheme === crateId).length;
  }

  selectCrate(id: string) {
    this.selectedCrate = id;
  }

  onSearchChange() {}

  clearSearch() {
    this.searchQuery = '';
  }

  toggleHarmonicMatch() {
    this.harmonicMatchOnly = !this.harmonicMatchOnly;
  }

  // Camelot Wheel harmonic compatibility (+1, -1, same number or same letter)
  isHarmonicMatch(key: string): boolean {
    if (!this.activeDeckKey || !key) return false;
    if (key === this.activeDeckKey) return true;

    const currentNum = parseInt(this.activeDeckKey.replace(/\D/g, ''), 10);
    const currentLetter = this.activeDeckKey.replace(/\d/g, '');

    const targetNum = parseInt(key.replace(/\D/g, ''), 10);
    const targetLetter = key.replace(/\d/g, '');

    if (isNaN(currentNum) || isNaN(targetNum)) return false;

    // Same number, switch A/B (relative minor/major)
    if (currentNum === targetNum) return true;

    // Same letter, adjacent numbers (1 step clockwise/counter-clockwise on Camelot wheel)
    if (currentLetter === targetLetter) {
      const diff = Math.abs(currentNum - targetNum);
      if (diff === 1 || diff === 11) return true;
    }

    return false;
  }

  onTrackDragStart(event: DragEvent, track: Track) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/json', JSON.stringify({ id: track.id, title: track.title, bpm: track.bpm }));
      event.dataTransfer.setData('text/plain', track.id);
      event.dataTransfer.effectAllowed = 'copyMove';
    }
  }

  onLoadToDeck(deckId: 'A' | 'B', track: Track) {
    this.loadToDeck.emit({ deckId, track });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        this.fileImport.emit({ deckId: i % 2 === 0 ? 'A' : 'B', file });
      }
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      for (let i = 0; i < event.dataTransfer.files.length; i++) {
        const file = event.dataTransfer.files[i];
        if (file.type.startsWith('audio/')) {
          this.fileImport.emit({ deckId: i % 2 === 0 ? 'A' : 'B', file });
        }
      }
    }
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  getStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }
}
