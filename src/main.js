import { SolarSystem } from './solarSystem.js';
import { VoiceManager, initVoices } from './voice.js';
import { UIManager } from './ui.js';
import { SmartInput } from './smartInput.js';

const canvas = document.getElementById('canvas');
const solar = new SolarSystem(canvas);
const voice = new VoiceManager();
const ui = new UIManager(solar, voice);
const smart = new SmartInput(ui);

solar.onPlanetClick = (id) => ui.selectPlanet(id);

function loop() {
  solar.update();
  requestAnimationFrame(loop);
}

initVoices().then(() => {
  loop();
  smart.enable();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) voice.stop();
});
