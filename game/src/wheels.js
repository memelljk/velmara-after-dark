// wheels.js — every vehicle in Velmara: one merged vertex-coloured body mesh,
// one merged lamp mesh, two axle wheel meshes, headlight cones, damage smoke.
// Cars can be parked, traffic-driven, police-driven or stolen by the player.
(function () {
  'use strict';
  var VAD = window.VAD = window.VAD || {};

  VAD.CAR_TYPES = [
    { id: 'orphee', name: 'Orphee GT', w: 2.0, l: 4.5, h: 0.62, cabH: 0.5, top: 34, accel: 15, sports: true },
    { id: 'coupe', name: 'Velmara Coupe', w: 1.95, l: 4.3, h: 0.66, cabH: 0.52, top: 30, accel: 13, sports: true },
    { id: 'sedan', name: 'Harbour Sedan', w: 2.0, l: 4.6, h: 0.72, cabH: 0.58, top: 26, accel: 11 },
    { id: 'pickup', name: 'Dockmaster Pickup', w: 2.15, l: 5.0, h: 0.85, cabH: 0.62, top: 24, accel: 10 },
    { id: 'van', name: 'Market Van', w: 2.1, l: 4.9, h: 1.15, cabH: 0.5, top: 22, accel: 9 },
    { id: 'interceptor', name: 'Police Interceptor', w: 2.05, l: 4.7, h: 0.7, cabH: 0.56, top: 33, accel: 15, police: true }
  ];
  var CAR_COLORS = [0xd8405e, 0x2f7fd0, 0xe0a83e, 0x3fae6a, 0x8a5fd0, 0xd8dde6, 0x30343f, 0xe06830, 0x2fa8a0, 0xc0c8d8];

  function shade(hex, f) {
    var c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex();
  }

  function buildCarMeshes(type, colorHex, isPolice) {
    var g = new THREE.Group();
    var body = [], lamps = [];
    var w = type.w, l = type.l;
    body.push({ w: w, h: type.h, d: l, x: 0, y: 0.42 + type.h / 2, z: 0, color: colorHex });
    body.push({ w: w * 0.82, h: type.cabH, d: l * 0.46, x: 0, y: 0.42 + type.h + type.cabH / 2, z: -l * 0.04, color: shade(colorHex, 0.82) });
    body.push({ w: w * 0.84, h: type.cabH * 0.72, d: l * 0.4, x: 0, y: 0.42 + type.h + type.cabH / 2 + 0.02, z: -l * 0.04, color: 0x141c2e });
    if (type.sports) body.push({ w: w * 0.9, h: 0.12, d: 0.5, x: 0, y: 0.42 + type.h + 0.16, z: l * 0.44, color: shade(colorHex, 0.7) });
    if (isPolice) {
      body.push({ w: w, h: type.h * 0.5, d: l * 0.98, x: 0, y: 0.42 + type.h / 2, z: 0, color: 0xe8ecf4 });
      lamps.push({ w: 0.62, h: 0.22, d: 0.5, x: -0.42, y: 0.42 + type.h + type.cabH + 0.14, z: -l * 0.04, color: 0xff2f4e });
      lamps.push({ w: 0.62, h: 0.22, d: 0.5, x: 0.42, y: 0.42 + type.h + type.cabH + 0.14, z: -l * 0.04, color: 0x2f7fff });
    }
    // Lamps: headlights + taillights in ONE basic-material mesh.
    lamps.push({ w: 0.42, h: 0.2, d: 0.1, x: -w * 0.32, y: 0.78, z: -l / 2 - 0.03, color: 0xfff2b0 });
    lamps.push({ w: 0.42, h: 0.2, d: 0.1, x: w * 0.32, y: 0.78, z: -l / 2 - 0.03, color: 0xfff2b0 });
    lamps.push({ w: 0.44, h: 0.18, d: 0.1, x: -w * 0.32, y: 0.8, z: l / 2 + 0.03, color: 0xff3040 });
    lamps.push({ w: 0.44, h: 0.18, d: 0.1, x: w * 0.32, y: 0.8, z: l / 2 + 0.03, color: 0xff3040 });
    var bodyMesh = new THREE.Mesh(VAD.mergeBoxes(body), VAD.vertexColorMaterial({}));
    var lampMesh = new THREE.Mesh(VAD.mergeBoxes(lamps), new THREE.MeshBasicMaterial({ vertexColors: true }));
    g.add(bodyMesh); g.add(lampMesh);

    // Wheels: one merged mesh per axle so both wheels spin together.
    function axle(z) {
      var parts = [];
      var geoL = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10); geoL.rotateZ(Math.PI / 2);
      var m = new THREE.Matrix4().makeTranslation(-w / 2 + 0.1, 0.42, 0);
      parts.push({ geo: geoL, matrix: m, color: 0x14161c });
      var geoR = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10); geoR.rotateZ(Math.PI / 2);
      m = new THREE.Matrix4().makeTranslation(w / 2 - 0.1, 0.42, 0);
      parts.push({ geo: geoR, matrix: m, color: 0x14161c });
      var mesh = new THREE.Mesh(VAD.mergeParts(parts), VAD.vertexColorMaterial({}));
      mesh.position.z = z;
      g.add(mesh);
      return mesh;
    }
    var wf = axle(-l * 0.32), wr = axle(l * 0.32);

    // Headlight cones: faint, fog-free, front-side only (never grey blobs).
    var coneMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.04, fog: false, side: THREE.FrontSide, depthWrite: false });
    var cones = new THREE.Group();
    [-w * 0.32, w * 0.32].forEach(function (cx) {
      var cone = new THREE.Mesh(new THREE.ConeGeometry(1.15, 7.5, 10, 1, true), coneMat);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(cx, 0.72, -l / 2 - 3.6);
      cones.add(cone);
    });
    g.add(cones);
    return { group: g, wf: wf, wr: wr, lampMesh: lampMesh };
  }

  // Damage smoke: a Points cloud whose emitters start BELOW ground (hidden),
  // rising only while the car is badly damaged.
  function makeSmoke(scene) {
    var n = 22, pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { pos[i * 3] = 0; pos[i * 3 + 1] = -20 - i; pos[i * 3 + 2] = 0; }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x555c6e, size: 1.5, transparent: true, opacity: 0.5 }));
    scene.add(pts);
    return { pts: pts, life: new Float32Array(n) };
  }

  VAD.spawnCar = function (scene, typeId, colorHex, x, z, angle, role) {
    var type = VAD.CAR_TYPES.filter(function (t) { return t.id === typeId; })[0] || VAD.CAR_TYPES[2];
    var isPolice = !!type.police;
    var built = buildCarMeshes(type, isPolice ? 0x22262f : colorHex, isPolice);
    built.group.position.set(x, 0, z);
    built.group.rotation.y = angle;
    scene.add(built.group);
    var car = {
      type: type, group: built.group, wf: built.wf, wr: built.wr, lampMesh: built.lampMesh,
      x: x, z: z, angle: angle, speed: 0, health: 100, role: role || 'parked',
      road: null, dir: 1, fleeUntil: 0, smoke: makeSmoke(scene), wheelSpin: 0,
      lightPhase: Math.random() * 6
    };
    car.sync = function () {
      car.group.position.set(car.x, 0, car.z);
      car.group.rotation.y = car.angle;
    };
    VAD.G.cars.push(car);
    return car;
  };

  // Deterministic fleet: parked cars at the kerb + traffic on the road grid.
  VAD.buildFleet = function (scene, rng) {
    var G = VAD.G;
    var types = ['orphee', 'coupe', 'sedan', 'pickup', 'van'];
    var roads = [-240, -180, -120, -60, 0, 60, 120, 180, 240];
    var parkedSpots = [];
    for (var i = 0; i < 20; i++) {
      var vertical = i % 2 === 0;
      var road = roads[1 + (i * 3) % 8];
      var along = -230 + ((i * 53) % 440);
      var side = i % 4 < 2 ? 11.5 : -11.5;
      var x = vertical ? road + side : along;
      var z = vertical ? along : road + side;
      if (Math.abs(x) > 285 || Math.abs(z) > 255) continue;
      parkedSpots.push({ x: x, z: z, a: vertical ? 0 : Math.PI / 2 });
    }
    parkedSpots.forEach(function (s, idx) {
      VAD.spawnCar(scene, types[idx % types.length], CAR_COLORS[idx % CAR_COLORS.length], s.x, s.z, s.a, 'parked');
    });
    // A hero car waiting by Odile's booth: the pink Orphee GT.
    var heroCar = VAD.spawnCar(scene, 'orphee', 0xe83e8c, 44, -84, Math.PI, 'parked');
    G.heroCar = heroCar;
    // Traffic on the grid.
    for (var t = 0; t < 16; t++) {
      var vertical2 = t % 2 === 0;
      var road2 = roads[(t * 2 + 1) % roads.length];
      var along2 = -260 + ((t * 67) % 520);
      var dir = t % 4 < 2 ? 1 : -1;
      var lane = dir > 0 ? 4.4 : -4.4;
      var tx = vertical2 ? road2 + lane : along2;
      var tz = vertical2 ? along2 : road2 + lane;
      if (tz > 255) tz = 240;
      var ang = vertical2 ? (dir > 0 ? Math.PI : 0) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      // Our forward is -Z at angle 0; drive direction derives from angle.
      var car = VAD.spawnCar(scene, types[(t + 2) % types.length], CAR_COLORS[(t + 4) % CAR_COLORS.length], tx, tz, ang, 'traffic');
      car.road = { vertical: vertical2, at: road2, lane: lane };
      car.dir = dir;
      car.speed = 9 + rng() * 5;
    }
  };

  function forwardOf(angle) { return { x: -Math.sin(angle), z: -Math.cos(angle) }; }

  VAD.updateTraffic = function (dt, t) {
    var G = VAD.G;
    for (var i = 0; i < G.cars.length; i++) {
      var car = G.cars[i];
      if (car.role !== 'traffic') continue;
      var f = forwardOf(car.angle);
      // Brake for anything ahead; flee gunfire.
      var want = 11;
      if (t < car.fleeUntil) want = 22;
      for (var j = 0; j < G.cars.length; j++) {
        if (j === i) continue;
        var o = G.cars[j];
        var dx = o.x - car.x, dz = o.z - car.z;
        var ahead = dx * f.x + dz * f.z;
        var side = Math.abs(dx * f.z - dz * f.x);
        if (ahead > 0 && ahead < 11 && side < 2.6) want = Math.min(want, Math.max(0, (ahead - 6) * 1.6));
      }
      var px = G.player.x - car.x, pz = G.player.z - car.z;
      var pahead = px * f.x + pz * f.z, pside = Math.abs(px * f.z - pz * f.x);
      if (pahead > 0 && pahead < 10 && pside < 2.4 && !G.car) want = 0;
      car.speed += (want - car.speed) * Math.min(1, dt * 1.6);
      car.x += f.x * car.speed * dt;
      car.z += f.z * car.speed * dt;
      // Turn at some intersections to keep circulating.
      var nearX = Math.round(car.x / 60) * 60, nearZ = Math.round(car.z / 60) * 60;
      if (Math.abs(car.x - nearX) < 1.4 && Math.abs(car.z - nearZ) < 1.4 && car.road) {
        var key = nearX + ',' + nearZ + ',' + i;
        if (car.lastTurn !== key && ((i * 7 + nearX + nearZ) % 5 === 0)) {
          car.lastTurn = key;
          car.angle += Math.PI / 2;
          car.road = { vertical: !car.road.vertical, at: car.road.vertical ? nearZ : nearX, lane: car.road.lane };
        }
      }
      if (car.x > 296) car.x = -296; if (car.x < -296) car.x = 296;
      if (car.z > 258) car.z = -290; if (car.z < -296) car.z = 252;
      var hit = VAD.city.collide(car.x, car.z, 1.6);
      car.x = hit.x; car.z = hit.z;
      car.wheelSpin += car.speed * dt / 0.42;
      car.wf.rotation.x = car.wheelSpin; car.wr.rotation.x = car.wheelSpin;
      car.sync();
    }
  };

  // Player driving: arcade model with handbrake drift and damage.
  VAD.drivePlayerCar = function (dt) {
    var G = VAD.G, car = G.car;
    if (!car) return;
    var type = car.type;
    var fwdIn = (G.keys['KeyW'] || G.keys['ArrowUp']) ? 1 : 0;
    var backIn = (G.keys['KeyS'] || G.keys['ArrowDown']) ? 1 : 0;
    var left = (G.keys['KeyA'] || G.keys['ArrowLeft']) ? 1 : 0;
    var right = (G.keys['KeyD'] || G.keys['ArrowRight']) ? 1 : 0;
    var brake = G.keys['Space'];
    if (fwdIn) car.speed += type.accel * dt;
    if (backIn) car.speed -= (car.speed > 0.5 ? 22 : 7) * dt;
    if (!fwdIn && !backIn) car.speed -= car.speed * 0.55 * dt;
    if (brake) car.speed -= car.speed * 2.4 * dt;
    var maxF = type.top, maxR = -8;
    if (car.speed > maxF) car.speed = maxF;
    if (car.speed < maxR) car.speed = maxR;
    var steer = (left - right) * (brake ? 1.5 : 1.0);
    if (Math.abs(car.speed) > 0.4) {
      car.angle += steer * dt * 1.65 * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 9 + 0.35);
    }
    var f = forwardOf(car.angle);
    var nx = car.x + f.x * car.speed * dt;
    var nz = car.z + f.z * car.speed * dt;
    var before = { x: car.x, z: car.z };
    var hit = VAD.city.collide(nx, nz, 1.7);
    if ((hit.x !== nx || hit.z !== nz) && Math.abs(car.speed) > 7) {
      car.health -= Math.abs(car.speed) * 0.55;
      G.shake = Math.min(0.7, Math.abs(car.speed) * 0.02);
      if (Math.abs(car.speed) > 15) VAD.commitCrime('crash', car.x, car.z, 0.4);
      car.speed *= -0.25;
    } else { car.x = hit.x; car.z = hit.z; }
    if (car.x === before.x && car.z === before.z) { /* fully blocked */ }
    car.wheelSpin += car.speed * dt / 0.42;
    car.wf.rotation.x = car.wheelSpin; car.wr.rotation.x = car.wheelSpin;
    car.wf.rotation.y = steer * 0.4;
    car.sync();
    G.player.x = car.x; G.player.z = car.z; G.player.angle = car.angle;
    VAD.engineUpdate(car.speed / type.top);
    VAD.updateSmoke(car, dt);
  };

  VAD.updateSmoke = function (car, dt) {
    var pos = car.smoke.pts.geometry.attributes.position.array;
    var active = car.health < 45;
    for (var i = 0; i < car.smoke.life.length; i++) {
      car.smoke.life[i] -= dt;
      if (car.smoke.life[i] <= 0) {
        if (active) {
          car.smoke.life[i] = 0.4 + Math.random() * 0.9;
          pos[i * 3] = car.x + (Math.random() - 0.5) * 0.8;
          pos[i * 3 + 1] = 1.2;
          pos[i * 3 + 2] = car.z + (Math.random() - 0.5) * 0.8;
        } else {
          pos[i * 3 + 1] = -20 - i; // parked below ground, invisible
        }
      } else if (pos[i * 3 + 1] > -5) {
        pos[i * 3 + 1] += dt * 2.6;
        pos[i * 3] += dt * 0.5;
      }
    }
    car.smoke.pts.geometry.attributes.position.needsUpdate = true;
  };

  VAD.repairCar = function (car) { car.health = 100; };
})();
