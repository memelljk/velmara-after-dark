// hud.js — the on-screen interface: stats, wanted stars, objective banner,
// bars, speed / radio / ammo readouts, the live circular minimap, the full
// city map on P, toasts, and the localStorage save behind Continue.
(function () {
  'use strict';
  var VAD = window.VAD = window.VAD || {};
  var SAVE_KEY = 'velmara-after-dark-save-v1';
  var toastTimer = null;

  VAD.RANKS = [
    { rep: 0, name: 'STREET RAT' }, { rep: 3, name: 'RUNNER' }, { rep: 6, name: 'WHEELMAN' },
    { rep: 10, name: "FIXER'S HAND" }, { rep: 16, name: 'HARBOUR GHOST' }, { rep: 24, name: 'VELMARA LEGEND' }
  ];
  VAD.rankName = function (rep) {
    var name = VAD.RANKS[0].name;
    VAD.RANKS.forEach(function (r) { if (rep >= r.rep) name = r.name; });
    return name;
  };

  VAD.setObjective = function (title, text, meta) {
    document.getElementById('obj-title').textContent = title;
    document.getElementById('obj-text').textContent = text;
    document.getElementById('obj-meta').textContent = meta || '';
  };

  VAD.toast = function (msg, ms) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.add('hidden'); }, ms || 3400);
  };

  VAD.saveGame = function () {
    var G = VAD.G, p = G.player;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: p.cash, rep: p.rep, health: p.health, maxHealth: p.maxHealth, armor: p.armor,
        ammo: p.ammo, reserve: p.reserve, loot: p.loot, outfit: p.outfit,
        x: p.x, z: p.z, missionIdx: VAD.Missions.idx, campaignDone: VAD.Missions.campaignDone,
        clock: G.clockMinutes
      }));
    } catch (e) { /* storage unavailable: play on without saving */ }
  };
  VAD.loadSave = function () {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  };
  VAD.applySave = function (s) {
    var G = VAD.G, p = G.player;
    p.cash = s.cash; p.rep = s.rep; p.health = s.health; p.maxHealth = s.maxHealth;
    p.armor = s.armor; p.ammo = s.ammo; p.reserve = s.reserve; p.loot = s.loot; p.outfit = s.outfit;
    p.x = s.x; p.z = s.z;
    VAD.Missions.idx = s.missionIdx || 0;
    VAD.Missions.campaignDone = !!s.campaignDone;
    G.clockMinutes = s.clock || 1260;
  };
  VAD.clearSave = function () {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  };

  function fmtClock(mins) {
    var h = Math.floor(mins / 60) % 24, m = Math.floor(mins % 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  VAD.updateHud = function () {
    var G = VAD.G, p = G.player;
    document.getElementById('hud-cash').textContent = '$' + p.cash;
    document.getElementById('hud-rank').textContent = 'RANK: ' + VAD.rankName(p.rep);
    document.getElementById('hud-clock').textContent = fmtClock(G.clockMinutes);
    document.getElementById('hud-district').textContent = VAD.districtAt(p.x, p.z);
    var stars = '';
    for (var i = 0; i < 5; i++) stars += '<span class="' + (i < G.wanted ? 'lit' : '') + '">★</span>';
    document.getElementById('hud-wanted').innerHTML = stars;
    document.getElementById('bar-health').style.width = Math.max(0, p.health / p.maxHealth * 100) + '%';
    document.getElementById('bar-armor').style.width = Math.max(0, p.armor) + '%';
    document.getElementById('bar-busted').style.width = (G.busted * 100) + '%';
    document.getElementById('row-busted').style.visibility = G.busted > 0.02 ? 'visible' : 'hidden';
    if (G.car) {
      document.getElementById('hud-speed').textContent = Math.round(Math.abs(G.car.speed) * 3.6) + ' km/h';
      document.getElementById('hud-car').textContent = G.car.type.name + ' · hull ' + Math.max(0, Math.round(G.car.health)) + '%';
      document.getElementById('hud-radio').textContent = '♪ ' + VAD.STATIONS[G.radioIndex].name + (VAD.isMuted() ? ' (muted)' : '');
      document.getElementById('hud-ammo').textContent = '';
    } else {
      document.getElementById('hud-speed').textContent = '';
      document.getElementById('hud-car').textContent = '';
      document.getElementById('hud-radio').textContent = '';
      document.getElementById('hud-ammo').textContent = 'PISTOL ' + p.ammo + ' / ' + p.reserve + (G.reloadT > 0 ? ' …' : '');
    }
    document.getElementById('hud-prompt').textContent = G.prompt || '';
    document.getElementById('crosshair').classList.toggle('hidden', !(G.aiming && !G.car));
    VAD.drawMinimap();
  };

  function worldToMap(x, z, size, range) {
    return [(x + range) / (range * 2) * size, (z + range) / (range * 2) * size];
  }

  VAD.drawMinimap = function () {
    var G = VAD.G;
    var cv = document.getElementById('minimap');
    var g = cv.getContext('2d');
    var S = cv.width, R = 150; // view range ±150 m around the player
    g.fillStyle = '#0d1330'; g.fillRect(0, 0, S, S);
    var cx = S / 2, cy = S / 2, scale = S / (R * 2);
    function pt(x, z) { return [cx + (x - G.player.x) * scale, cy + (z - G.player.z) * scale]; }
    // Roads.
    g.strokeStyle = '#39406b'; g.lineWidth = 5;
    for (var r = -240; r <= 240; r += 60) {
      var a = pt(r, 0), b = pt(0, r);
      g.beginPath(); g.moveTo(a[0], 0); g.lineTo(a[0], S); g.stroke();
      g.beginPath(); g.moveTo(0, b[1]); g.lineTo(S, b[1]); g.stroke();
    }
    // Water.
    var w = pt(0, 285);
    g.fillStyle = '#14405e'; g.fillRect(0, w[1], S, S - w[1]);
    function dot(x, z, color, rad) {
      var q = pt(x, z);
      if (q[0] < -6 || q[0] > S + 6 || q[1] < -6 || q[1] > S + 6) return;
      g.fillStyle = color; g.beginPath(); g.arc(q[0], q[1], rad, 0, 6.29); g.fill();
    }
    VAD.SPOTS.shops.forEach(function (s) { dot(s.x, s.z, '#ff5f9e', 3); });
    VAD.SPOTS.safehouses.forEach(function (s) { dot(s.x, s.z, '#53e0a0', 3); });
    for (var i = 0; i < G.cars.length; i++) {
      var c = G.cars[i];
      if (c.role === 'police') dot(c.x, c.z, (Math.floor(G.elapsed * 4) % 2 ? '#ff3040' : '#3f8fff'), 3.4);
    }
    // Objective beacon target.
    if (VAD.city.beacon.visible) {
      var bp = pt(VAD.city.beacon.position.x, VAD.city.beacon.position.z);
      g.fillStyle = '#ffd23f';
      g.save(); g.translate(bp[0], bp[1]); g.rotate(Math.PI / 4); g.fillRect(-4, -4, 8, 8); g.restore();
    }
    // Player arrow.
    g.fillStyle = '#4db2ff';
    g.save(); g.translate(cx, cy); g.rotate(-G.player.angle + Math.PI);
    g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill(); g.restore();
  };

  VAD.drawBigMap = function () {
    var G = VAD.G;
    var cv = document.getElementById('mapcanvas');
    var g = cv.getContext('2d');
    var S = cv.width;
    g.fillStyle = '#0a0f28'; g.fillRect(0, 0, S, S);
    function pt(x, z) { return worldToMap(x, z, S, 320); }
    g.strokeStyle = '#2c3560'; g.lineWidth = 7;
    for (var r = -240; r <= 240; r += 60) {
      var a = pt(r, 0), b = pt(0, r);
      g.beginPath(); g.moveTo(a[0], 0); g.lineTo(a[0], S); g.stroke();
      g.beginPath(); g.moveTo(0, b[1]); g.lineTo(S, b[1]); g.stroke();
    }
    var w = pt(0, 270);
    g.fillStyle = '#14405e'; g.fillRect(0, w[1], S, S - w[1]);
    g.fillStyle = '#9fe8ff'; g.font = 'bold 15px Arial';
    VAD.DISTRICTS.forEach(function (d) { var q = pt(d.x, d.z); g.fillText(d.name.toUpperCase(), q[0] - 38, q[1]); });
    function dot(x, z, color, rad) { var q = pt(x, z); g.fillStyle = color; g.beginPath(); g.arc(q[0], q[1], rad, 0, 6.29); g.fill(); }
    VAD.SPOTS.shops.forEach(function (s) { dot(s.x, s.z, '#ff5f9e', 5); });
    VAD.SPOTS.safehouses.forEach(function (s) { dot(s.x, s.z, '#53e0a0', 5); });
    for (var i = 0; i < G.cars.length; i++) if (G.cars[i].role === 'police') dot(G.cars[i].x, G.cars[i].z, '#ff3040', 4);
    if (VAD.city.beacon.visible) {
      var bp = pt(VAD.city.beacon.position.x, VAD.city.beacon.position.z);
      g.fillStyle = '#ffd23f'; g.save(); g.translate(bp[0], bp[1]); g.rotate(Math.PI / 4); g.fillRect(-6, -6, 12, 12); g.restore();
    }
    dot(G.player.x, G.player.z, '#4db2ff', 6);
  };
})();
