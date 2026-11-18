// nightloop.js — boot, the frame loop, game states, input, the third-person
// orbit camera and the E-key interaction web that ties every system together.
(function () {
  'use strict';
  var VAD = window.VAD = window.VAD || {};

  var params = new URLSearchParams(location.search);
  var seed = parseInt(params.get('seed') || '7', 10);
  if (!isFinite(seed)) seed = 7;
  var shotName = params.get('shot');

  var G = VAD.G = {
    mode: 'title', seed: seed, shot: shotName, frozen: !!shotName,
    scene: null, camera: null, renderer: null, city: null,
    player: {
      x: 40, z: -88, angle: Math.PI, health: 100, maxHealth: 100, armor: 0,
      cash: 85, rep: 0, ammo: 12, reserve: 24, loot: 0, outfit: false
    },
    car: null, heroCar: null, cars: [], peds: [], thugs: [], officers: [],
    heroFigure: null, odileFigure: null, gunMesh: null, openShopRef: null,
    keys: {}, camYaw: Math.PI, camPitch: 0.3, camDist: 9,
    wanted: 0, heat: 0, forcedStars: 0, busted: 0, lastCrimeAt: -99, lastShotAt: -99,
    elapsed: 0, clockMinutes: 21 * 60, radioIndex: 0, reloadT: 0,
    copSpawnT: 0, offSpawnT: 0, shake: 0, aiming: false, prompt: '',
    drawCalls: 0, drawObjects: 0
  };

  // ---------- boot ----------
  var canvas = document.getElementById('gl');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    G.camera.aspect = window.innerWidth / window.innerHeight;
    G.camera.updateProjectionMatrix();
  }
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  G.scene = scene; G.camera = camera; G.renderer = renderer;

  var rng = VAD.makeRng(seed);
  VAD.buildCity(scene, seed);
  VAD.buildFleet(scene, rng);
  VAD.buildCrowd(scene, rng);
  VAD.buildHero(scene);
  window.addEventListener('resize', resize);
  resize();

  // Test hooks: exact verified counts for the harness / CDP probe.
  window.__VAD_STATS = function () {
    var objects = 0;
    scene.traverse(function () { objects++; });
    return {
      buildings: VAD.city.buildingCount, streetlights: VAD.city.lightCount,
      vehicles: G.cars.length, pedestrians: G.peds.length,
      missions: VAD.Missions.list.length, shops: VAD.SPOTS.shops.length,
      safehouses: VAD.SPOTS.safehouses.length, stations: VAD.STATIONS.length,
      drawCalls: G.drawCalls, drawObjects: objects, mode: G.mode,
      wanted: G.wanted, missionActive: VAD.Missions.active, playerX: G.player.x, playerZ: G.player.z
    };
  };

  // ---------- states ----------
  function startGame(fresh) {
    VAD.audioEnsure();
    if (fresh) {
      VAD.clearSave();
      G.player = { x: 40, z: -88, angle: Math.PI, health: 100, maxHealth: 100, armor: 0, cash: 85, rep: 0, ammo: 12, reserve: 24, loot: 0, outfit: false };
      VAD.Missions.idx = 0; VAD.Missions.campaignDone = false; VAD.Missions.active = false;
      G.clockMinutes = 21 * 60;
    } else {
      var s = VAD.loadSave();
      if (s) VAD.applySave(s);
    }
    G.mode = 'play';
    document.getElementById('title').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    VAD.Missions.refreshObjective();
    VAD.toast(fresh ? 'Welcome to Velmara, Jax. Odile Vane is waiting at the pink marker.' : 'Welcome back to Velmara.');
  }
  document.getElementById('btn-new').addEventListener('click', function () { startGame(true); });
  document.getElementById('btn-continue').addEventListener('click', function () { startGame(false); });
  document.getElementById('btn-resume').addEventListener('click', function () { togglePause(false); });
  document.getElementById('btn-restart').addEventListener('click', function () {
    document.getElementById('pause').classList.add('hidden');
    document.getElementById('title').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    G.mode = 'title';
  });
  document.getElementById('btn-respawn').addEventListener('click', function () { VAD.respawnAtHospital(); });
  document.getElementById('shop-close').addEventListener('click', function () { VAD.closeShop(); });
  document.getElementById('dialogue').addEventListener('click', function () { if (VAD.dialogueOpen()) VAD.advanceDialogue(); });
  if (VAD.loadSave()) document.getElementById('btn-continue').classList.remove('hidden');

  function togglePause(on) {
    if (on && G.mode === 'play') {
      G.mode = 'pause';
      document.getElementById('pause-stats').textContent =
        'Cash $' + G.player.cash + ' · Rank ' + VAD.rankName(G.player.rep) +
        ' · Missions done ' + VAD.Missions.idx + ' of ' + VAD.Missions.list.length +
        ' · Wanted ' + G.wanted + '★';
      document.getElementById('pause').classList.remove('hidden');
      VAD.saveGame();
    } else if (!on && G.mode === 'pause') {
      G.mode = 'play';
      document.getElementById('pause').classList.add('hidden');
    }
  }

  // ---------- interactions ----------
  function nearestCar(maxD) {
    var best = null, bd = maxD;
    for (var i = 0; i < G.cars.length; i++) {
      var c = G.cars[i];
      if (c.role === 'player') continue;
      var d = Math.hypot(c.x - G.player.x, c.z - G.player.z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  function enterCar(car) {
    var wasRole = car.role;
    car.role = 'player'; car.prevRole = wasRole;
    G.car = car;
    G.player.x = car.x; G.player.z = car.z;
    G.heroFigure.group.visible = false;
    VAD.audioEnsure(); VAD.engineStart(); VAD.radioStart(G.radioIndex);
    if (wasRole === 'police') { VAD.commitCrime('theft', car.x, car.z, 1); VAD.toast('Interceptor stolen — the PD noticed.'); }
    else if (wasRole === 'traffic') { VAD.commitCrime('theft', car.x, car.z, 1); VAD.toast('Driver dragged out — that is a crime, Jax.'); }
    else if (wasRole === 'parked') { VAD.commitCrime('theft', car.x, car.z, 0.5); VAD.toast('Car stolen: ' + car.type.name); }
    VAD.toast('Driving: ' + car.type.name + ' — R changes the radio');
  }
  function exitCar() {
    var car = G.car;
    car.role = 'parked'; car.speed = 0; car.sync();
    G.car = null;
    G.player.x = car.x + Math.cos(car.angle) * 2.4;
    G.player.z = car.z - Math.sin(car.angle) * 2.4;
    var hit = VAD.city.collide(G.player.x, G.player.z, 0.55);
    G.player.x = hit.x; G.player.z = hit.z;
    G.heroFigure.group.visible = true;
    VAD.engineStop(); VAD.radioStop();
  }
  VAD.enterCar = enterCar; VAD.exitCar = exitCar;

  function interact() {
    if (VAD.dialogueOpen()) { VAD.advanceDialogue(); return; }
    if (G.mode !== 'play') return;
    if (G.car) { exitCar(); return; }
    var p = G.player;
    if (Math.hypot(p.x - VAD.SPOTS.odile.x, p.z - VAD.SPOTS.odile.z) < 4.2) { VAD.Missions.talkToOdile(); return; }
    for (var i = 0; i < VAD.SPOTS.shops.length; i++) {
      var s = VAD.SPOTS.shops[i];
      if (Math.hypot(p.x - s.x, p.z - s.z) < 4.4) { VAD.openShop(s); return; }
    }
    for (var j = 0; j < VAD.SPOTS.safehouses.length; j++) {
      var h = VAD.SPOTS.safehouses[j];
      if (Math.hypot(p.x - h.x, p.z - h.z) < 4.4) { VAD.useSafehouse(h); return; }
    }
    var car = nearestCar(4.6);
    if (car) enterCar(car);
  }

  function updatePrompt() {
    G.prompt = '';
    if (G.mode !== 'play' || VAD.dialogueOpen()) return;
    if (G.car) { G.prompt = 'E — get out'; return; }
    var p = G.player;
    if (Math.hypot(p.x - VAD.SPOTS.odile.x, p.z - VAD.SPOTS.odile.z) < 4.2) { G.prompt = 'E — talk to Odile Vane'; return; }
    for (var i = 0; i < VAD.SPOTS.shops.length; i++) {
      var s = VAD.SPOTS.shops[i];
      if (Math.hypot(p.x - s.x, p.z - s.z) < 4.4) { G.prompt = 'E — ' + s.name; return; }
    }
    for (var j = 0; j < VAD.SPOTS.safehouses.length; j++) {
      var h = VAD.SPOTS.safehouses[j];
      if (Math.hypot(p.x - h.x, p.z - h.z) < 4.4) { G.prompt = 'E — rest at ' + h.name + ' (save)'; return; }
    }
    var car = nearestCar(4.6);
    if (car) G.prompt = 'E — ' + (car.role === 'parked' ? 'steal' : 'take') + ' ' + car.type.name;
  }

  // ---------- input ----------
  window.addEventListener('keydown', function (e) {
    G.keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
    if (e.repeat) return;
    VAD.audioEnsure();
    if (e.code === 'KeyE') interact();
    else if (e.code === 'KeyF') VAD.playerMelee();
    else if (e.code === 'KeyR') {
      if (G.car) {
        G.radioIndex = (G.radioIndex + 1) % VAD.STATIONS.length;
        VAD.radioStart(G.radioIndex);
        VAD.toast('♪ ' + VAD.STATIONS[G.radioIndex].name);
      } else VAD.startReload();
    } else if (e.code === 'KeyM') {
      var m = VAD.setMuted(!VAD.isMuted());
      VAD.toast(m ? 'Sound muted' : 'Sound on');
    } else if (e.code === 'KeyP') {
      if (G.mode === 'play') { G.mode = 'map'; VAD.drawBigMap(); document.getElementById('bigmap').classList.remove('hidden'); }
      else if (G.mode === 'map') { G.mode = 'play'; document.getElementById('bigmap').classList.add('hidden'); }
    } else if (e.code === 'Escape') {
      if (G.mode === 'shop') VAD.closeShop();
      else if (G.mode === 'map') { G.mode = 'play'; document.getElementById('bigmap').classList.add('hidden'); }
      else if (G.mode === 'play') togglePause(true);
      else if (G.mode === 'pause') togglePause(false);
    }
  });
  window.addEventListener('keyup', function (e) { G.keys[e.code] = false; });

  var dragging = false, lastMX = 0, lastMY = 0;
  canvas.addEventListener('mousedown', function (e) {
    VAD.audioEnsure();
    if (G.mode !== 'play') return;
    if (document.pointerLockElement !== canvas) {
      try { canvas.requestPointerLock(); } catch (err) { /* headless: drag orbit instead */ }
    }
    if (e.button === 0 && !G.car) { G.aiming = true; VAD.playerShoot(); }
    if (e.button === 2) { dragging = true; lastMX = e.clientX; lastMY = e.clientY; }
  });
  window.addEventListener('mouseup', function (e) {
    if (e.button === 0) G.aiming = false;
    if (e.button === 2) dragging = false;
  });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('mousemove', function (e) {
    if (G.mode !== 'play') return;
    if (document.pointerLockElement === canvas) {
      G.camYaw -= e.movementX * 0.0032;
      G.camPitch = Math.max(0.05, Math.min(1.1, G.camPitch + e.movementY * 0.0026));
      G.aiming = true;
    } else if (dragging) {
      G.camYaw -= (e.clientX - lastMX) * 0.005;
      G.camPitch = Math.max(0.05, Math.min(1.1, G.camPitch + (e.clientY - lastMY) * 0.004));
      lastMX = e.clientX; lastMY = e.clientY;
    }
  });

  // ---------- camera ----------
  function updateCamera(dt) {
    var p = G.player;
    // When driving or walking without manual orbit, ease the camera behind.
    if (document.pointerLockElement !== canvas && !dragging && G.mode === 'play') {
      var targetYaw = p.angle;
      var diff = targetYaw - G.camYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      var moving = G.car ? Math.abs(G.car.speed) > 2 : (G.keys['KeyW'] || G.keys['KeyA'] || G.keys['KeyS'] || G.keys['KeyD']);
      if (moving) G.camYaw += diff * Math.min(1, dt * 2.6);
    }
    var dist = G.car ? 11 : (G.shot ? G.camDist : 8.5);
    if (G.shot) dist = G.camDist;
    var tx = p.x, tz = p.z, ty = 1.7;
    var cx = tx + Math.sin(G.camYaw) * Math.cos(G.camPitch) * dist;
    var cz = tz + Math.cos(G.camYaw) * Math.cos(G.camPitch) * dist;
    var cy = ty + Math.sin(G.camPitch) * dist;
    if (G.shake > 0) {
      cx += (Math.random() - 0.5) * G.shake;
      cy += (Math.random() - 0.5) * G.shake;
      G.shake = Math.max(0, G.shake - dt * 1.8);
    }
    camera.position.set(cx, Math.max(1.1, cy), cz);
    camera.lookAt(tx, ty, tz);
  }

  // ---------- main loop ----------
  var last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var rawDt = (now - last) / 1000;
    last = now;
    // Clamp the frame dt both ways: never negative/huge, never zero-step.
    var dt = Math.max(0.0001, Math.min(rawDt, 0.05));
    if (!G.frozen && G.mode === 'play') {
      G.elapsed += dt;
      G.clockMinutes = (G.clockMinutes + dt * 0.6) % (24 * 60);
      if (G.car) VAD.drivePlayerCar(dt); else VAD.updateHeroOnFoot(dt);
      VAD.updateTraffic(dt, G.elapsed);
      VAD.updatePeople(dt, G.elapsed);
      VAD.updatePolice(dt, G.elapsed);
      VAD.updateGunplay(dt);
      VAD.Missions.update(dt);
      updatePrompt();
    }
    if (!G.frozen && (G.mode === 'play' || G.mode === 'dialogue')) {
      VAD.city.updateFx(dt, G.player.x, G.player.z, now / 1000);
    }
    updateCamera(G.frozen ? 0.016 : dt);
    if (G.mode !== 'title') VAD.updateHud();
    renderer.render(scene, camera);
    G.drawCalls = renderer.info.render.calls;
  }

  if (shotName) {
    document.getElementById('title').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    G.mode = 'play';
    VAD.applyShotScene(shotName);
    VAD.updateHud();
  }
  requestAnimationFrame(frame);
})();
