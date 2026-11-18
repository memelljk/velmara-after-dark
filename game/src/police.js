// police.js — the wanted system: heat, stars, interceptor chases, foot
// officers, the BUSTED meter and hospital respawn after WASTED / BUSTED.
(function () {
  'use strict';
  var VAD = window.VAD = window.VAD || {};

  var CRIME_HEAT = { crash: 0.35, theft: 1, robbery: 1, shot: 1, kill: 2, mission: 1 };

  VAD.commitCrime = function (kind, x, z, scale) {
    var G = VAD.G;
    if (G.mode !== 'play' && G.mode !== 'dialogue') return;
    G.heat += (CRIME_HEAT[kind] || 1) * (scale || 1);
    G.lastCrimeAt = G.elapsed;
    VAD.refreshWanted();
    // Nearby traffic flees gunfire and violence.
    for (var i = 0; i < G.cars.length; i++) {
      if (G.cars[i].role === 'traffic') G.cars[i].fleeUntil = G.elapsed + 4;
    }
  };

  VAD.refreshWanted = function () {
    var G = VAD.G;
    var stars = G.forcedStars > 0 ? G.forcedStars : Math.max(0, Math.min(5, Math.floor(G.heat)));
    if (stars !== G.wanted) {
      G.wanted = stars;
      if (stars > 0) VAD.sirenStart(); else VAD.sirenStop();
    }
  };

  VAD.setWanted = function (stars) {
    var G = VAD.G;
    G.forcedStars = stars;
    G.heat = Math.max(G.heat, stars);
    VAD.refreshWanted();
  };

  VAD.clearForcedWanted = function () {
    var G = VAD.G;
    G.forcedStars = 0;
    VAD.refreshWanted();
  };

  function spawnInterceptor(scene) {
    var G = VAD.G, p = G.player;
    var ang = Math.random() * Math.PI * 2;
    var x = p.x + Math.sin(ang) * 55, z = p.z + Math.cos(ang) * 55;
    x = Math.max(-285, Math.min(285, Math.round(x / 60) * 60 + 4));
    z = Math.max(-285, Math.min(250, Math.round(z / 60) * 60 + 4));
    var car = VAD.spawnCar(scene, 'interceptor', 0x22262f, x, z, Math.random() * 6.28, 'police');
    return car;
  }

  function spawnOfficer(scene) {
    var G = VAD.G, p = G.player;
    var h = VAD.makeHuman({ shirt: 0x1d2f5e, pants: 0x141c33, skin: 0xd9a077, hair: 0x10131c });
    var x = p.x + (Math.random() - 0.5) * 36, z = p.z + (Math.random() - 0.5) * 36;
    var hit = VAD.city.collide(x, z, 0.5);
    h.group.position.set(hit.x, 0, hit.z);
    scene.add(h.group);
    var off = { fig: h, x: hit.x, z: hit.z, angle: 0, health: 50, role: 'officer', state: 'fight', shootT: 1.5 + Math.random(), dead: false };
    G.officers.push(off);
    G.peds.push(off);
    return off;
  }

  VAD.updatePolice = function (dt, t) {
    var G = VAD.G, p = G.player;
    // Heat decays when no fresh crime is committed.
    if (G.forcedStars <= 0 && t - G.lastCrimeAt > 14 && G.heat > 0) {
      G.heat = Math.max(0, G.heat - dt * 0.09);
      VAD.refreshWanted();
    }
    var wantCars = G.wanted <= 0 ? 0 : Math.min(2 + G.wanted, 6);
    var cops = G.cars.filter(function (c) { return c.role === 'police'; });
    if (cops.length < wantCars && G.mode === 'play') {
      G.copSpawnT -= dt;
      if (G.copSpawnT <= 0) { G.copSpawnT = 2.2; spawnInterceptor(G.scene); }
    }
    // Chase behaviour: steer at the player, ram on contact.
    for (var i = 0; i < G.cars.length; i++) {
      var car = G.cars[i];
      if (car.role !== 'police') continue;
      var dx = p.x - car.x, dz = p.z - car.z;
      var dist = Math.hypot(dx, dz);
      if (G.wanted <= 0 || dist > 150) {
        // Give up and park the cruiser.
        car.role = 'parked'; car.speed = 0; car.sync();
        continue;
      }
      var targetAngle = Math.atan2(-dx, -dz);
      var diff = targetAngle - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += Math.max(-1.9 * dt, Math.min(1.9 * dt, diff));
      var want = dist > 26 ? car.type.top : car.type.top * 0.72;
      car.speed += (want - car.speed) * Math.min(1, dt * 0.9);
      var fx = -Math.sin(car.angle), fz = -Math.cos(car.angle);
      car.x += fx * car.speed * dt;
      car.z += fz * car.speed * dt;
      var hit = VAD.city.collide(car.x, car.z, 1.7);
      car.x = hit.x; car.z = hit.z;
      car.wheelSpin += car.speed * dt / 0.42;
      car.wf.rotation.x = car.wheelSpin; car.wr.rotation.x = car.wheelSpin;
      car.lightPhase += dt * 9;
      car.lampMesh.visible = Math.sin(car.lightPhase) > -0.2;
      car.sync();
      // Ram damage.
      if (dist < 3.6) {
        if (G.car) {
          G.car.health -= 14 * dt * 3;
          G.shake = Math.max(G.shake, 0.25);
          car.speed *= 0.92;
        }
      }
    }
    // Foot officers at 3+ stars.
    var wantOff = G.wanted >= 3 ? G.wanted - 1 : 0;
    var aliveOff = G.officers.filter(function (o) { return !o.dead; });
    if (aliveOff.length < wantOff && G.mode === 'play') {
      G.offSpawnT -= dt;
      if (G.offSpawnT <= 0) { G.offSpawnT = 5; spawnOfficer(G.scene); }
    }
    for (var j = 0; j < G.officers.length; j++) {
      var off = G.officers[j];
      if (off.dead) continue;
      var odx = p.x - off.x, odz = p.z - off.z;
      var od = Math.hypot(odx, odz);
      if (G.wanted <= 0 || od > 90) { VAD.removeFigure(off); continue; }
      if (od > 16) {
        off.x += (odx / od) * 4.6 * dt;
        off.z += (odz / od) * 4.6 * dt;
        VAD.animateHuman(off.fig, dt, true, 0);
      } else {
        VAD.animateHuman(off.fig, dt, false, 0);
        off.shootT -= dt;
        if (off.shootT <= 0 && G.mode === 'play' && !G.car) {
          off.shootT = 1.3 + Math.random() * 1.2;
          VAD.enemyShoot(off);
        }
      }
      off.angle = Math.atan2(-odx, -odz);
      var ohit = VAD.city.collide(off.x, off.z, 0.5);
      off.x = ohit.x; off.z = ohit.z;
      off.fig.group.position.set(off.x, off.fig.group.position.y, off.z);
      off.fig.group.rotation.y = off.angle;
    }
    // BUSTED meter: rises while a cop is close and the player is slow / on foot.
    var nearCop = false;
    for (var k = 0; k < G.cars.length; k++) {
      if (G.cars[k].role === 'police' && Math.hypot(G.cars[k].x - p.x, G.cars[k].z - p.z) < 12) nearCop = true;
    }
    if (aliveOff.some(function (o) { return Math.hypot(o.x - p.x, o.z - p.z) < 7; })) nearCop = true;
    var slow = !G.car || Math.abs(G.car.speed) < 2.2;
    if (G.wanted > 0 && nearCop && slow && G.mode === 'play') {
      G.busted += dt * 0.34;
      if (G.busted >= 1) { VAD.doBusted(); return; }
    } else {
      G.busted = Math.max(0, G.busted - dt * 0.3);
    }
  };

  VAD.hurtPlayer = function (dmg) {
    var G = VAD.G, p = G.player;
    if (G.mode !== 'play') return;
    if (p.armor > 0) {
      var absorbed = Math.min(p.armor, dmg * 0.7);
      p.armor -= absorbed; dmg -= absorbed;
    }
    p.health -= dmg;
    VAD.sfxHurt();
    G.shake = Math.max(G.shake, 0.18);
    if (p.health <= 0) VAD.doWasted();
  };

  VAD.respawnAtHospital = function () {
    var G = VAD.G, p = G.player;
    var spot = VAD.SPOTS.hospital;
    if (G.car) { G.car.role = 'parked'; G.car.speed = 0; G.car.sync(); G.car = null; VAD.engineStop(); VAD.radioStop(); }
    p.x = spot.x; p.z = spot.z; p.health = p.maxHealth;
    G.wanted = 0; G.heat = 0; G.forcedStars = 0; G.busted = 0;
    VAD.sirenStop();
    G.mode = 'play';
    document.getElementById('endscreen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
  };

  VAD.doWasted = function () {
    var G = VAD.G, p = G.player;
    var fee = Math.min(p.cash, 120);
    p.cash -= fee;
    G.mode = 'end';
    document.getElementById('end-title').textContent = 'WASTED';
    document.getElementById('end-text').textContent = 'You wake up outside St. Mirella Hospital. The clinic kept $' + fee + ' for patching you up.';
    document.getElementById('endscreen').classList.remove('hidden');
    VAD.saveGame();
  };

  VAD.doBusted = function () {
    var G = VAD.G, p = G.player;
    var fine = Math.min(p.cash, 200);
    p.cash -= fine;
    p.ammo = Math.max(0, p.ammo);
    G.mode = 'end';
    document.getElementById('end-title').textContent = 'BUSTED';
    document.getElementById('end-text').textContent = 'Velmara PD walks you to the hospital steps and takes $' + fine + ' in fines. Your wanted level is cleared.';
    document.getElementById('endscreen').classList.remove('hidden');
    VAD.saveGame();
  };
})();
