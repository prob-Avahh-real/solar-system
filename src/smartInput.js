import { PLANETS } from './planets.js';

const TILT_THRESHOLD = 5;
const SHAKE_THRESHOLD = 20;
const ACCEL_TAP_THRESHOLD = 8;
const SWING_THRESHOLD = 3;
const RING_THROTTLE = 8;
const CANE_THROTTLE = 6;

export class SmartInput {
  constructor(ui) {
    this.ui = ui;
    this.enabled = false;
    this.ringFrame = 0;
    this.caneFrame = 0;
    this.lastBeta = null;
    this.lastGamma = null;
    this.lastAccel = { x: 0, y: 0, z: 0 };
  }

  async enable() {
    if (this.enabled) return;
    this.enabled = true;

    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== 'granted') return;
      } catch { /* desktop or denied */ }
    }

    window.addEventListener('deviceorientation', (e) => this._onOrientation(e));
    window.addEventListener('devicemotion', (e) => this._onMotion(e));
  }

  _onOrientation(e) {
    this.ringFrame++;
    if (this.ringFrame % RING_THROTTLE !== 0) return;

    const beta = e.beta;
    const gamma = e.gamma;
    if (beta == null || gamma == null) return;

    if (this.lastBeta != null) {
      const dBeta = Math.abs(beta - this.lastBeta);
      const dGamma = Math.abs(gamma - this.lastGamma);

      if (dBeta > SHAKE_THRESHOLD || dGamma > SHAKE_THRESHOLD) {
        if (this.ui.selectedPlanet) {
          this.ui.voice.speakPlanet(this.ui.selectedPlanet);
        }
        this.lastBeta = beta;
        this.lastGamma = gamma;
        return;
      }

      if (gamma > TILT_THRESHOLD) {
        this.ui.cyclePlanet(1);
      } else if (gamma < -TILT_THRESHOLD) {
        this.ui.cyclePlanet(-1);
      }
    }

    this.lastBeta = beta;
    this.lastGamma = gamma;
  }

  _onMotion(e) {
    this.caneFrame++;
    if (this.caneFrame % CANE_THROTTLE !== 0) return;

    const acc = e.accelerationIncludingGravity;
    if (!acc) return;

    const dx = Math.abs(acc.x - this.lastAccel.x);
    const dy = Math.abs(acc.y - this.lastAccel.y);
    const dz = Math.abs(acc.z - this.lastAccel.z);
    const spike = dx + dy + dz;

    if (spike > ACCEL_TAP_THRESHOLD) {
      if (this.ui.selectedPlanet) {
        this.ui.voice.startListening(this.ui.selectedPlanet);
      } else {
        const first = PLANETS[1];
        this.ui.selectPlanet(first.id);
      }
    } else if (spike > SWING_THRESHOLD) {
      const dir = acc.x > 0 ? 1 : -1;
      this.ui.cyclePlanet(dir);
    }

    this.lastAccel = { x: acc.x, y: acc.y, z: acc.z };
  }
}
