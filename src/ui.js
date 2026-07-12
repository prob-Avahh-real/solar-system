import { PLANETS } from './planets.js';

export class UIManager {
  constructor(solarSystem, voice) {
    this.solar = solarSystem;
    this.voice = voice;
    this.selectedPlanet = null;

    this.panel = document.getElementById('info-panel');
    this.planetBar = document.getElementById('planet-bar');
    this.hint = document.getElementById('hint');

    this._buildPlanetBar();
    this._bindControls();
  }

  _buildPlanetBar() {
    for (const p of PLANETS) {
      const btn = document.createElement('button');
      btn.className = 'planet-chip';
      btn.dataset.id = p.id;
      btn.innerHTML = `<span class="chip-dot" style="background:#${p.color.toString(16).padStart(6, '0')}"></span>${p.name}`;
      btn.addEventListener('click', () => this.selectPlanet(p.id));
      this.planetBar.appendChild(btn);
    }
  }

  _bindControls() {
    document.getElementById('btn-close').addEventListener('click', () => this.closePanel());
    document.getElementById('btn-pause').addEventListener('click', () => this._togglePause());
    document.getElementById('btn-speed').addEventListener('click', () => this._toggleSpeed());
    document.getElementById('btn-reset').addEventListener('click', () => this.resetView());
    document.getElementById('btn-speak').addEventListener('click', () => {
      if (this.selectedPlanet) this.voice.speakPlanet(this.selectedPlanet);
    });
    document.getElementById('btn-listen').addEventListener('click', () => {
      if (this.selectedPlanet) this.voice.startListening(this.selectedPlanet);
    });

    this.voice.onStatusChange = (msg) => {
      document.getElementById('voice-status').textContent = msg;
    };
  }

  selectPlanet(id) {
    this.selectedPlanet = id;
    const planet = PLANETS.find((p) => p.id === id);
    if (!planet) return;

    this.solar.focusPlanet(id);
    this._showPanel(planet);
    this._highlightChip(id);
    this.hint.classList.add('hidden');
  }

  _showPanel(planet) {
    document.getElementById('planet-name').textContent = planet.name;
    document.getElementById('planet-subtitle').textContent = planet.nameEn;

    const statsEl = document.getElementById('planet-stats');
    statsEl.innerHTML = '';
    for (const [key, val] of Object.entries(planet.stats)) {
      const item = document.createElement('div');
      item.className = 'stat-item';
      item.innerHTML = `<span class="stat-label">${key}</span><span class="stat-value">${val}</span>`;
      statsEl.appendChild(item);
    }

    document.getElementById('planet-desc').textContent = planet.description;

    const factsEl = document.getElementById('planet-facts');
    factsEl.innerHTML = '<h3>有趣事实</h3><ul>' +
      planet.facts.map((f) => `<li>${f}</li>`).join('') + '</ul>';

    this.panel.classList.remove('hidden');
  }

  closePanel() {
    this.panel.classList.add('hidden');
    this.selectedPlanet = null;
    this._highlightChip(null);
    this.voice.stop();
    this.hint.classList.remove('hidden');
  }

  resetView() {
    this.closePanel();
    this.solar.resetView();
  }

  _highlightChip(id) {
    this.planetBar.querySelectorAll('.planet-chip').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.id === id);
    });
  }

  _togglePause() {
    this.solar.paused = !this.solar.paused;
    document.getElementById('btn-pause').textContent = this.solar.paused ? '▶' : '⏸';
  }

  _toggleSpeed() {
    const speeds = [1, 2, 4];
    const cur = speeds.indexOf(this.solar.speedMultiplier);
    const next = speeds[(cur + 1) % speeds.length];
    this.solar.setSpeed(next);
    document.getElementById('btn-speed').textContent = next === 1 ? '⏩' : `${next}x`;
  }

  cyclePlanet(direction) {
    const ids = PLANETS.map((p) => p.id);
    const cur = this.selectedPlanet ? ids.indexOf(this.selectedPlanet) : -1;
    const next = (cur + direction + ids.length) % ids.length;
    this.selectPlanet(ids[next]);
  }
}
