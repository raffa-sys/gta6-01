// All sound is synthesised with WebAudio — no audio files. A low engine hum
// follows the car's speed, a two-tone siren wails while the police are close,
// and one-shots cover gunfire, punches, pickups and mission stings. A small
// bass-and-hats loop plays as the city's background music.

export function createAudio() {
  let context = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = null;
  let musicStep = 0;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      startEngine();
      startSiren();
      startMusic();
      return true;
    } catch {
      return false;
    }
  }

  function startEngine() {
    engineOsc = context.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    engineGain = context.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
  }

  function startSiren() {
    sirenOsc = context.createOscillator();
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.value = 720;
    sirenGain = context.createGain();
    sirenGain.gain.value = 0;
    const lfo = context.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 1.6;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(sirenOsc.frequency);
    sirenOsc.connect(sirenGain);
    sirenGain.connect(master);
    sirenOsc.start();
    lfo.start();
  }

  /** A 16-step loop: a driving bass line in A minor with a hat tick. */
  const BASS = [55, 0, 55, 0, 65.41, 0, 55, 0, 49, 0, 49, 0, 58.27, 0, 73.42, 0];

  function startMusic() {
    musicTimer = window.setInterval(() => {
      if (!context || muted) return;
      const step = musicStep % 16;
      musicStep += 1;
      const freq = BASS[step];
      if (freq > 0) {
        const osc = context.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.05, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(master);
        osc.start();
        osc.stop(context.currentTime + 0.24);
      }
      if (step % 4 === 2) {
        const noise = noiseBurst(0.03, 6000, 0.02);
        if (noise) noise.connect(master);
      }
    }, 150);
  }

  function noiseBurst(duration, filterFreq, volume) {
    if (!context) return null;
    const length = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    source.start();
    return gain;
  }

  function blip(freq, duration, type, volume) {
    if (!context) return;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(context.currentTime + duration + 0.02);
  }

  return {
    /** Call from any user gesture: creates the context the browser allows. */
    unlock() {
      ensure();
    },
    /** Engine pitch follows speed 0..1; silent on foot. */
    setEngine(speedRatio) {
      if (!context) return;
      engineOsc.frequency.setTargetAtTime(50 + speedRatio * 160, context.currentTime, 0.08);
      engineGain.gain.setTargetAtTime(muted ? 0 : speedRatio * 0.12, context.currentTime, 0.1);
    },
    /** Siren loudness 0..1 while police are near. */
    setSiren(level) {
      if (!context) return;
      sirenGain.gain.setTargetAtTime(muted ? 0 : level * 0.07, context.currentTime, 0.2);
    },
    gunshot() {
      if (!context) return;
      noiseBurst(0.14, 1800, 0.5);
      blip(140, 0.1, 'square', 0.25);
    },
    punch() {
      if (!context) return;
      noiseBurst(0.09, 500, 0.5);
    },
    pickup() {
      if (!context) return;
      blip(660, 0.09, 'sine', 0.25);
      window.setTimeout(() => blip(990, 0.12, 'sine', 0.25), 90);
    },
    missionDone() {
      if (!context) return;
      [523, 659, 784, 1047].forEach((freq, i) => {
        window.setTimeout(() => blip(freq, 0.22, 'triangle', 0.3), i * 110);
      });
    },
    busted() {
      if (!context) return;
      [392, 330, 262, 196].forEach((freq, i) => {
        window.setTimeout(() => blip(freq, 0.3, 'sawtooth', 0.2), i * 160);
      });
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
  };
}
