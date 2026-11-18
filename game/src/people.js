// people.js — Velmara's pedestrians and mission thugs. Pedestrians stroll the
// pavements, flee gunfire and fast cars, and can be robbed at gunpoint; thugs
// are hostile figures spawned by missions who shoot back.
(function () {
  'use strict';
  var VAD = window.VAD = window.VAD || {};
  var SHIRTS = [0x3a6fd8, 0xe0a83e, 0x3fae6a, 0x8a5fd0, 0xd8dde6, 0xe06830, 0x2fa8a0, 0xb03a5e, 0x707a94, 0x2471a3];
  var SKINS = [0xd9a077, 0xc98a5e, 0x8a5a34, 0xeec39a, 0x6e4226];

  function spawnFigure(scene, x, z, shirt, role) {
    var h = VAD.makeHuman({ shirt: shirt, skin: SKINS[Math.floor(Math.random() * SKINS.length)] });
    h.group.position.set(x, 0, z);
    scene.add(h.group);
    return {
      fig: h, x: x, z: z, angle: Math.random() * Math.PI * 2, health: 40,
      role: role, state: 'stroll', tx: x, tz: z, waitT: 0, shootT: 1 + Math.random() * 2,
      dead: false, robbed: false
    };
  }

  VAD.buildCrowd = function (scene, rng) {
    var G = VAD.G;
    var roads = [-240, -180, -120, -60, 0, 60, 120, 180, 240];
    for (var i = 0; i < 30; i++) {
      var vertical = i % 2 === 0;
      var road = roads[(i * 3 + 2) % roads.length];
      var along = -250 + rng() * 490;
      var side = (i % 4 < 2 ? 12.5 : -12.5);
      var x = vertical ? road + side : along;
      var z = vertical ? along : road + side;
      if (z > 250) z = 240;
      var ped = spawnFigure(scene, x, z, SHIRTS[i % SHIRTS.length], 'ped');
      ped.vertical = vertical; ped.roadAt = road; ped.side = side;
      G.peds.push(ped);
    }
    // Odile Vane at her booth — magenta coat, always at the Neon Mile spot.
    var od = VAD.makeHuman({ shirt: 0xff5f9e, pants: 0x1d1d2e, skin: 0xeec39a, hair: 0x3a2410 });
    od.group.position.set(VAD.SPOTS.odile.x, 0, VAD.SPOTS.odile.z);
    scene.add(od.group);
    G.odileFigure = od;
  };

  VAD.spawnThug = function (scene, x, z) {
    var thug = spawnFigure(scene, x, z, 0x8c1f28, 'thug');
    thug.health = 60;
    thug.state = 'fight';
    VAD.G.thugs.push(thug);
    VAD.G.peds.push(thug);
    return thug;
  };

  VAD.removeFigure = function (person) {
    person.dead = true;
    person.fig.group.rotation.x = -Math.PI / 2;
    person.fig.group.position.y = 0.25;
  };

  VAD.updatePeople = function (dt, t) {
    var G = VAD.G, p = G.player;
    for (var i = 0; i < G.peds.length; i++) {
      var ped = G.peds[i];
      if (ped.dead) continue;
      var dx = p.x - ped.x, dz = p.z - ped.z;
      var distP = Math.hypot(dx, dz);
      var danger = (t < G.lastShotAt + 1.6 && distP < 30) ||
        (G.car && Math.abs(G.car.speed) > 16 && distP < 13);
      if (ped.role === 'thug') {
        // Thugs close to range and shoot (handled by gunplay timers here).
        if (distP > 15) {
          ped.x += (dx / distP) * 3.4 * dt;
          ped.z += (dz / distP) * 3.4 * dt;
          ped.angle = Math.atan2(-dx, -dz);
          VAD.animateHuman(ped.fig, dt, true, 0);
        } else {
          ped.angle = Math.atan2(-dx, -dz);
          VAD.animateHuman(ped.fig, dt, false, 0);
          ped.shootT -= dt;
          if (ped.shootT <= 0 && G.mode === 'play') {
            ped.shootT = 1.1 + Math.random() * 1.3;
            VAD.enemyShoot(ped);
          }
        }
      } else if (danger || ped.state === 'flee') {
        ped.state = 'flee';
        var fx = ped.x - p.x, fz = ped.z - p.z;
        var fl = Math.hypot(fx, fz) || 1;
        ped.x += (fx / fl) * 8.4 * dt;
        ped.z += (fz / fl) * 8.4 * dt;
        ped.angle = Math.atan2(-(fx / fl), -(fz / fl));
        VAD.animateHuman(ped.fig, dt, true, 1);
        if (distP > 42) ped.state = 'stroll';
      } else {
        // Stroll along the pavement, turning at block ends.
        ped.waitT -= dt;
        var dirx = ped.vertical ? 0 : Math.sign(ped.side);
        var dirz = ped.vertical ? Math.sign(ped.side) : 0;
        if (ped.waitT <= 0) {
          ped.x += dirx * 2.1 * dt;
          ped.z += dirz * 2.1 * dt;
          ped.angle = Math.atan2(-dirx, -dirz);
          VAD.animateHuman(ped.fig, dt, true, 0);
          if (Math.abs(ped.x) > 282 || Math.abs(ped.z) > 250) { ped.side = -ped.side; ped.waitT = 0.5; }
        } else {
          VAD.animateHuman(ped.fig, dt, false, 0);
        }
      }
      var hit = VAD.city.collide(ped.x, ped.z, 0.5);
      ped.x = hit.x; ped.z = hit.z;
      ped.fig.group.position.set(ped.x, ped.fig.group.position.y, ped.z);
      ped.fig.group.rotation.y = ped.angle;
    }
    // Odile idles at her booth.
    if (G.odileFigure) VAD.animateHuman(G.odileFigure, dt, false, 0);
  };

  // Rob the nearest pedestrian (F on foot, or automatic at gunpoint range
  // while aiming): loot becomes cash via Pawn Star, heat rises.
  VAD.robNearestPed = function () {
    var G = VAD.G, p = G.player;
    var best = null, bd = 4.2;
    for (var i = 0; i < G.peds.length; i++) {
      var ped = G.peds[i];
      if (ped.dead || ped.role !== 'ped' || ped.robbed) continue;
      var d = Math.hypot(ped.x - p.x, ped.z - p.z);
      if (d < bd) { bd = d; best = ped; }
    }
    if (!best) return false;
    best.robbed = true; best.state = 'flee';
    var take = 12 + Math.floor(Math.random() * 30);
    p.cash += take;
    p.loot += 1;
    VAD.audioEnsure(); VAD.sfxCash();
    VAD.toast('Robbed $' + take + ' and some loot. The Pawn Star will buy loot.');
    VAD.commitCrime('robbery', p.x, p.z, 1);
    return true;
  };
})();
