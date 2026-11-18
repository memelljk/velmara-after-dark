// gunplay.js — pistol combat: mouse aim, tracers, reload, melee, and enemy
// return fire. Hits are resolved against pedestrians, thugs, officers and cars.
(function () {
  'use strict';
  var VAD = window.VAD = window.VAD || {};
  var tracers = [];

  function makeTracer(scene, from, to, color) {
    var geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, from.y, from.z), new THREE.Vector3(to.x, to.y, to.z)]);
    var line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.9, fog: false }));
    scene.add(line);
    tracers.push({ line: line, life: 0.07 });
  }

  VAD.updateGunplay = function (dt) {
    for (var i = tracers.length - 1; i >= 0; i--) {
      tracers[i].life -= dt;
      tracers[i].line.material.opacity = Math.max(0, tracers[i].life / 0.07) * 0.9;
      if (tracers[i].life <= 0) {
        VAD.G.scene.remove(tracers[i].line);
        tracers[i].line.geometry.dispose();
        tracers[i].line.material.dispose();
        tracers.splice(i, 1);
      }
    }
    var G = VAD.G;
    if (G.reloadT > 0) {
      G.reloadT -= dt;
      if (G.reloadT <= 0) {
        var p = G.player;
        var need = 12 - p.ammo, take = Math.min(need, p.reserve);
        p.ammo += take; p.reserve -= take;
      }
    }
  };

  VAD.startReload = function () {
    var G = VAD.G, p = G.player;
    if (G.car || p.ammo >= 12 || p.reserve <= 0 || G.reloadT > 0) return;
    G.reloadT = 1.1;
    VAD.toast('Reloading…');
  };

  // Player shot: fired toward the camera heading from the hero's gun.
  VAD.playerShoot = function () {
    var G = VAD.G, p = G.player;
    if (G.car || G.mode !== 'play') return;
    if (G.reloadT > 0) return;
    if (p.ammo <= 0) { VAD.startReload(); return; }
    p.ammo -= 1;
    G.lastShotAt = G.elapsed;
    VAD.audioEnsure(); VAD.sfxShot(false);
    var dir = { x: -Math.sin(G.camYaw), z: -Math.cos(G.camYaw) };
    var from = { x: p.x + dir.x * 0.5, y: 1.25, z: p.z + dir.z * 0.5 };
    var bestT = 42, bestTarget = null, bestKind = null;
    function testPoint(x, z, y, r, obj, kind) {
      var dx = x - p.x, dz = z - p.z;
      var along = dx * dir.x + dz * dir.z;
      if (along < 1 || along > bestT) return;
      var side = Math.abs(dx * dir.z - dz * dir.x);
      if (side < r) { bestT = along; bestTarget = obj; bestKind = kind; }
    }
    for (var i = 0; i < G.peds.length; i++) {
      var ped = G.peds[i];
      if (!ped.dead) testPoint(ped.x, ped.z, 1.2, 0.85, ped, 'person');
    }
    for (var j = 0; j < G.cars.length; j++) {
      var car = G.cars[j];
      testPoint(car.x, car.z, 0.8, 2.1, car, 'car');
    }
    var to = { x: p.x + dir.x * bestT, y: 1.15, z: p.z + dir.z * bestT };
    makeTracer(G.scene, from, to, 0xffe28a);
    VAD.commitCrime('shot', p.x, p.z, 0.55);
    if (bestKind === 'person' && bestTarget) {
      bestTarget.health -= 34;
      if (bestTarget.health <= 0) {
        VAD.removeFigure(bestTarget);
        VAD.commitCrime('kill', p.x, p.z, 1);
        if (bestTarget.role === 'thug') VAD.Missions.onThugDown(bestTarget);
        if (bestTarget.role === 'officer') VAD.toast('Officer down — heat is climbing.');
      } else if (bestTarget.role === 'ped') {
        bestTarget.state = 'flee';
      }
    } else if (bestKind === 'car' && bestTarget) {
      bestTarget.health -= 9;
      if (bestTarget.role === 'traffic') bestTarget.fleeUntil = G.elapsed + 5;
      if (bestTarget.role === 'police') VAD.commitCrime('shot', p.x, p.z, 0.5);
    }
    if (p.ammo === 0) VAD.startReload();
  };

  VAD.enemyShoot = function (shooter) {
    var G = VAD.G, p = G.player;
    if (G.car) return; // officers and thugs pick at the driver through glass rarely
    var from = { x: shooter.x, y: 1.3, z: shooter.z };
    var jitter = (Math.random() - 0.5) * 2.2;
    var to = { x: p.x + jitter, y: 1.1, z: p.z + jitter };
    makeTracer(G.scene, from, to, 0xff6a5e);
    VAD.sfxShot(true);
    var dist = Math.hypot(p.x - shooter.x, p.z - shooter.z);
    var hitChance = Math.max(0.12, 0.55 - dist * 0.012);
    if (Math.random() < hitChance) VAD.hurtPlayer(5 + Math.random() * 6);
  };

  // Melee / shove with F: also the robbery trigger at gunpoint range.
  VAD.playerMelee = function () {
    var G = VAD.G, p = G.player;
    if (G.car || G.mode !== 'play') return;
    if (VAD.robNearestPed()) return;
    var best = null, bd = 2.4;
    for (var i = 0; i < G.peds.length; i++) {
      var ped = G.peds[i];
      if (ped.dead) continue;
      var d = Math.hypot(ped.x - p.x, ped.z - p.z);
      if (d < bd) { bd = d; best = ped; }
    }
    if (best) {
      best.health -= 22;
      best.state = 'flee';
      VAD.commitCrime('robbery', p.x, p.z, 0.5);
      if (best.health <= 0) {
        VAD.removeFigure(best);
        if (best.role === 'thug') VAD.Missions.onThugDown(best);
      }
    }
  };
})();
