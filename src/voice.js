import { PLANETS, getPlanetById } from './planets.js';

export class VoiceManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.recognition = null;
    this.speaking = false;
    this.listening = false;
    this.currentPlanet = null;
    this.onStatusChange = null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'zh-CN';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        this._handleQuestion(text);
      };
      this.recognition.onend = () => {
        this.listening = false;
        this._setStatus('');
      };
      this.recognition.onerror = () => {
        this.listening = false;
        this._setStatus('语音识别失败，请重试');
      };
    }
  }

  _setStatus(msg) {
    if (this.onStatusChange) this.onStatusChange(msg);
  }

  speak(text, planetId) {
    this.stop();
    this.currentPlanet = planetId;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';
    utter.rate = 0.95;
    utter.pitch = 1;

    const voices = this.synth.getVoices();
    const zhVoice = voices.find((v) => v.lang.startsWith('zh'));
    if (zhVoice) utter.voice = zhVoice;

    utter.onstart = () => {
      this.speaking = true;
      this._setStatus('正在讲解…');
    };
    utter.onend = () => {
      this.speaking = false;
      this._setStatus('');
    };

    this.synth.speak(utter);
  }

  speakPlanet(planetId) {
    const planet = getPlanetById(planetId);
    if (!planet) return;
    const text = `${planet.voiceIntro} ${planet.description}`;
    this.speak(text, planetId);
  }

  stop() {
    this.synth.cancel();
    this.speaking = false;
    if (this.recognition && this.listening) {
      this.recognition.stop();
      this.listening = false;
    }
  }

  startListening(planetId) {
    if (!this.recognition) {
      this._setStatus('当前浏览器不支持语音识别');
      return;
    }
    this.stop();
    this.currentPlanet = planetId;
    this.listening = true;
    this._setStatus('请说话…（例如：这颗行星有多大？）');
    this.recognition.start();
  }

  _handleQuestion(text) {
    const planet = getPlanetById(this.currentPlanet);
    if (!planet) {
      this.speak('请先选择一个行星。');
      return;
    }

    const q = text.toLowerCase();
    let answer = '';

    if (/多大|直径|尺寸|大小/.test(q)) {
      answer = `${planet.name}的直径是${planet.stats['直径'] || '未知'}。`;
    } else if (/多远|距离|距太阳/.test(q)) {
      answer = `${planet.name}距离太阳${planet.stats['距太阳'] || '位于太阳系中心'}。`;
    } else if (/温度|多热|多冷|冷|热/.test(q)) {
      answer = `${planet.name}的表面温度是${planet.stats['表面温度'] || '因无大气层而温差极大'}。`;
    } else if (/公转|转一圈|一年|周期/.test(q)) {
      answer = `${planet.name}的公转周期是${planet.stats['公转周期'] || '不适用'}。`;
    } else if (/卫星|月亮|有几颗/.test(q)) {
      answer = `${planet.name}的卫星情况：${planet.stats['卫星'] || '没有已知卫星'}。`;
    } else if (/质量|多重/.test(q)) {
      answer = `${planet.name}的质量是${planet.stats['质量'] || '数据暂无'}。`;
    } else if (/特点|特色|有趣|事实/.test(q)) {
      answer = `${planet.name}的有趣事实：${planet.facts[0]}`;
    } else if (/介绍|是什么|讲讲|说说/.test(q)) {
      answer = planet.voiceIntro + planet.description;
    } else {
      answer = `关于${planet.name}，${planet.facts[Math.floor(Math.random() * planet.facts.length)]}。你还可以问我这颗行星的大小、温度、距离或公转周期。`;
    }

    this._setStatus(`你问：${text}`);
    setTimeout(() => this.speak(answer, planet.id), 300);
  }

  answerGlobal(question) {
    const q = question.toLowerCase();
    if (/最大/.test(q)) {
      this.speak('太阳系最大的行星是木星，质量超过其他所有行星的总和。', 'jupiter');
    } else if (/最小/.test(q)) {
      this.speak('太阳系最小的行星是水星，也是最靠近太阳的行星。', 'mercury');
    } else if (/最热/.test(q)) {
      this.speak('太阳系最热的行星是金星，表面温度约 465 摄氏度。', 'venus');
    } else if (/最冷/.test(q)) {
      this.speak('太阳系最冷的行星是天王星，最低温度可达零下 224 摄氏度。', 'uranus');
    } else if (/几个行星|多少行星/.test(q)) {
      this.speak('太阳系有 8 颗行星，按距离太阳从近到远依次是：水星、金星、地球、火星、木星、土星、天王星和海王星。');
    } else {
      this.speak('欢迎来到太阳系探索！点击任意行星查看详情，也可以问我关于行星大小、温度、距离等问题。');
    }
  }
}

export function initVoices() {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
      return;
    }
    speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
    setTimeout(() => resolve(speechSynthesis.getVoices()), 500);
  });
}
