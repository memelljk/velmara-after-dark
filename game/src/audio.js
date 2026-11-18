// audio.js — all sound is synthesized with WebAudio: engine, siren, shots,
// rain, and four radio stations. Nothing is loaded; no network, no files.
(function () {
  'use strict';
  var VAD = window.VAD = window.VAD || {};
  var ctx = null, master = null, muted = false;
  var engineNodes = null, sirenNodes = null, rainNodes = null, musicTimer = null;
  var musicStep = 0;

  VAD.STATIONS = [
    { id: 'bassline', name: 'Bassline FM — synth bass loop' },
    { id: 'neonwave', name: 'Neon Wave — synthwave arps' },
    { id: 'rainfm', name: 'Rain FM — ambient pads' },
    { id: 'harbor', name: 'Harbor Talk — harbour chatter' }
  ];

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      startRain();
      return true;
    } catch (e) { return false; }
  }
  VAD.audioEnsure = ensure;

  VAD.setMuted = function (m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.5;
    return muted;
  };
  VAD.isMuted = function () { return muted; };

  function noiseBuffer(seconds) {
    var buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function startRain() {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(2); src.loop = true;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    var g = ctx.createGain(); g.gain.value = 0.035;
    src.connect(f); f.connect(g); g.connect(master); src.start();
    rainNodes = { src: src };
  }

  VAD.sfxShot = function (enemy) {
    if (!ensure()) return;
    var src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.12);
    var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = enemy ? 700 : 900;
    var g = ctx.createGain();
    g.gain.setValueAtTime(enemy ? 0.12 : 0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
    src.connect(f); f.connect(g); g.connect(master); src.start();
  };
  VAD.sfxCash = function () {
    if (!ensure()) return;
    [880, 1320].forEach(function (fr, i) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = fr;
      var t = ctx.currentTime + i * 0.07;
      g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.1);
    });
  };
  VAD.sfxHurt = function () {
    if (!ensure()) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(160, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 0.17);
  };
  VAD.sfxClick = function () {
    if (!ensure()) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 660;
    g.gain.setValueAtTime(0.05, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 0.06);
  };

  VAD.engineStart = function () {
    if (!ensure() || engineNodes) return;
    var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'square';
    o.frequency.value = 55; o2.frequency.value = 28;
    g.gain.value = 0.05;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    o.connect(f); o2.connect(f); f.connect(g); g.connect(master);
    o.start(); o2.start();
    engineNodes = { o: o, o2: o2, g: g };
  };
  VAD.engineUpdate = function (speed01) {
    if (!engineNodes) return;
    var fr = 50 + Math.abs(speed01) * 130;
    engineNodes.o.frequency.setTargetAtTime(fr, ctx.currentTime, 0.05);
    engineNodes.o2.frequency.setTargetAtTime(fr / 2, ctx.currentTime, 0.05);
  };
  VAD.engineStop = function () {
    if (!engineNodes) return;
    try { engineNodes.o.stop(); engineNodes.o2.stop(); } catch (e) {}
    engineNodes = null;
  };

  VAD.sirenStart = function () {
    if (!ensure() || sirenNodes) return;
    var o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 800;
    lfo.frequency.value = 0.7; lg.gain.value = 180;
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.value = 0.018;
    o.connect(g); g.connect(master); o.start(); lfo.start();
    sirenNodes = { o: o, lfo: lfo };
  };
  VAD.sirenStop = function () {
    if (!sirenNodes) return;
    try { sirenNodes.o.stop(); sirenNodes.lfo.stop(); } catch (e) {}
    sirenNodes = null;
  };

  function note(freq, t, dur, type, vol, dest) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
  }
  var BASS = [55, 55, 82.4, 55, 65.4, 55, 98, 73.4];
  var ARP = [220, 261.6, 329.6, 440, 329.6, 261.6, 293.7, 392];
  var PADS = [[110, 138.6, 164.8], [87.3, 110, 130.8], [98, 123.5, 146.8], [110, 138.6, 164.8]];
  VAD.radioStart = function (stationIdx) {
    if (!ensure()) return;
    VAD.radioStop();
    musicStep = 0;
    var id = VAD.STATIONS[stationIdx].id;
    var interval = id === 'rainfm' ? 2400 : id === 'harbor' ? 620 : 240;
    musicTimer = setInterval(function () {
      if (!ctx || muted) { musicStep++; return; }
      var t = ctx.currentTime + 0.03;
      if (id === 'bassline') {
        note(BASS[musicStep % 8], t, 0.22, 'sawtooth', 0.10);
        if (musicStep % 2 === 0) note(BASS[musicStep % 8] * 2, t, 0.1, 'square', 0.03);
      } else if (id === 'neonwave') {
        note(ARP[musicStep % 8], t, 0.2, 'triangle', 0.07);
        if (musicStep % 8 === 0) note(55, t, 0.5, 'sine', 0.1);
      } else if (id === 'rainfm') {
        var chord = PADS[(musicStep % 4)];
        chord.forEach(function (fr) { note(fr, t, 2.3, 'sine', 0.045); });
      } else {
        if (Math.random() < 0.6) note(300 + Math.random() * 500, t, 0.07, 'square', 0.02);
        if (Math.random() < 0.3) note(180 + Math.random() * 120, t + 0.15, 0.06, 'square', 0.015);
      }
      musicStep++;
    }, interval);
  };
  VAD.radioStop = function () {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  };
})();
