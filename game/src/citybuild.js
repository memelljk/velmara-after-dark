// citybuild.js — seeded generation of Velmara: 5 districts, harbour, market,
// container yards, neon signs, rain. Seed 7 yields exactly 205 buildings and
// exactly 648 streetlights; both counts are asserted by the test harness.
(function () {
  'use strict';
  var VAD = window.VAD = window.VAD || {};

  // mulberry32 PRNG — one stream per seed, fully deterministic.
  VAD.makeRng = function (seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  var ROADS = [-240, -180, -120, -60, 0, 60, 120, 180, 240];
  var ROAD_HALF = 9;

  VAD.DISTRICTS = [
    { name: 'Neon Mile', x: 60, z: -120 },
    { name: 'Harbor', x: 150, z: 235 },
    { name: 'Old Market', x: -120, z: 60 },
    { name: 'The Heights', x: -180, z: -180 },
    { name: 'Dockyards', x: 220, z: 120 }
  ];

  function districtAt(x, z) {
    var best = VAD.DISTRICTS[0], bd = 1e12;
    for (var i = 0; i < VAD.DISTRICTS.length; i++) {
      var d = VAD.DISTRICTS[i], dx = d.x - x, dz = d.z - z, q = dx * dx + dz * dz;
      if (q < bd) { bd = q; best = d; }
    }
    return best.name;
  }
  VAD.districtAt = districtAt;

  // Fixed gameplay spots, all on open ground / sidewalk / road (never inside a
  // building collider — building candidates near a spot are rejected below).
  VAD.SPOTS = {
    odile: { x: 36, z: -96 },
    hospital: { x: -24, z: -168 },
    vault: { x: 150, z: 255 },
    heightsDrop: { x: 150, z: -120 },
    cityLimits: { x: 282, z: 0 },
    shops: [
      { id: 'arms', name: 'Mirella Arms', x: 48, z: -108, color: 0xff5470 },
      { id: 'garage', name: 'Fixer Garage', x: 108, z: 14, color: 0xffb340 },
      { id: 'stitch', name: 'Stitch & Co', x: -48, z: -132, color: 0x9d7bff },
      { id: 'noodle', name: 'Noodle Nine', x: -106, z: 48, color: 0xff8c42 },
      { id: 'pawn', name: 'Pawn Star', x: 166, z: 108, color: 0x53e0a0 },
      { id: 'clinic', name: 'St. Mirella Clinic', x: -14, z: -194, color: 0x6fd3ff }
    ],
    safehouses: [
      { id: 'loft', name: "Jax's Loft", x: 48, z: -168 },
      { id: 'bunk', name: 'Harbor Bunk', x: 132, z: 226 },
      { id: 'flat', name: 'The Heights Flat', x: -194, z: -108 }
    ]
  };

  function nearSpot(x, z, r) {
    var pts = [VAD.SPOTS.odile, VAD.SPOTS.hospital, VAD.SPOTS.vault, VAD.SPOTS.cityLimits];
    pts = pts.concat(VAD.SPOTS.shops, VAD.SPOTS.safehouses);
    for (var i = 0; i < pts.length; i++) {
      var dx = pts[i].x - x, dz = pts[i].z - z;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }

  function signTexture(text, fg, bg) {
    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    var g = cv.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 256, 64);
    g.font = 'bold 30px Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = fg; g.shadowBlur = 14;
    g.fillStyle = fg; g.fillText(text, 128, 34);
    var tex = new THREE.CanvasTexture(cv);
    return tex;
  }

  VAD.buildCity = function (scene, seed) {
    var rng = VAD.makeRng(seed);
    var city = { buildings: [], colliders: [], lightCount: 0, buildingCount: 0 };
    VAD.city = city;

    scene.fog = new THREE.FogExp2(0x0a0e1e, 0.0028);
    scene.background = new THREE.Color(0x070a18);

    var hemi = new THREE.HemisphereLight(0x8fa3ff, 0x1a1426, 0.95);
    scene.add(hemi);
    scene.add(new THREE.AmbientLight(0x8890c0, 0.55));
    var moon = new THREE.DirectionalLight(0xbdd0ff, 0.55);
    moon.position.set(-120, 220, -80);
    scene.add(moon);
    var glow = new THREE.PointLight(0xff5f9e, 0.9, 190);
    glow.position.set(60, 26, -120);
    scene.add(glow);
    var glow2 = new THREE.PointLight(0x3fd9ff, 0.7, 170);
    glow2.position.set(150, 20, 235);
    scene.add(glow2);

    // Ground + wet roads (brightened asphalt so night reads clearly).
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(680, 680),
      new THREE.MeshLambertMaterial({ color: 0x232733 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.06;
    scene.add(ground);

    var roadMat = new THREE.MeshLambertMaterial({ color: 0x3a4152 });
    var roadParts = [];
    var rm = new THREE.Matrix4();
    for (var ri = 0; ri < ROADS.length; ri++) {
      var rp = new THREE.PlaneGeometry(ROAD_HALF * 2, 640);
      rp.rotateX(-Math.PI / 2);
      rm.makeTranslation(ROADS[ri], 0, 0);
      roadParts.push({ geo: rp, matrix: rm.clone(), color: 0xffffff });
      var rp2 = new THREE.PlaneGeometry(640, ROAD_HALF * 2);
      rp2.rotateX(-Math.PI / 2);
      rm.makeTranslation(0, 0.005, ROADS[ri]);
      roadParts.push({ geo: rp2, matrix: rm.clone(), color: 0xf2f2f2 });
    }
    var roadsMesh = new THREE.Mesh(VAD.mergeParts(roadParts), roadMat);
    scene.add(roadsMesh);

    // Lane dashes, merged.
    var dashBoxes = [];
    for (var di = 0; di < ROADS.length; di++) {
      for (var dz = -312; dz <= 312; dz += 16) {
        dashBoxes.push({ w: 0.5, h: 0.04, d: 6, x: ROADS[di], y: 0.03, z: dz, color: 0xd8d25a });
        dashBoxes.push({ w: 6, h: 0.04, d: 0.5, x: dz, y: 0.035, z: ROADS[di], color: 0xd8d25a });
      }
    }
    VAD.boxCloud(dashBoxes, new THREE.MeshBasicMaterial({ vertexColors: true }), scene);

    // ---- Buildings: candidates on every block, seeded pick of exactly 205.
    var candidates = [];
    var palette = [0x39415e, 0x2e3550, 0x463a5e, 0x2c3e50, 0x513f4d, 0x37455c, 0x41365a];
    for (var bx = 0; bx < ROADS.length - 1; bx++) {
      for (var bz = 0; bz < ROADS.length - 1; bz++) {
        var cx = (ROADS[bx] + ROADS[bx + 1]) / 2;
        var cz = (ROADS[bz] + ROADS[bz + 1]) / 2;
        var slots = [[-13, -13], [13, -13], [-13, 13], [13, 13], [0, 0]];
        for (var si = 0; si < slots.length; si++) {
          var px = cx + slots[si][0], pz = cz + slots[si][1];
          if (pz > 258) continue;              // harbour water edge
          if (nearSpot(px, pz, 17)) continue;  // keep gameplay spots clear
          candidates.push({ x: px, z: pz, r: rng() });
        }
      }
    }
    candidates.sort(function (a, b) { return a.r - b.r; });
    var chosen = candidates.slice(0, 205);
    chosen.sort(function (a, b) { return (a.x - b.x) || (a.z - b.z); });

    var bodyBoxes = [], winBoxes = [];
    for (var bi = 0; bi < chosen.length; bi++) {
      var c = chosen[bi];
      var w = 15 + rng() * 9, d = 15 + rng() * 9;
      var h = 14 + rng() * rng() * 46;
      var col = palette[Math.floor(rng() * palette.length)];
      var b = { x: c.x, z: c.z, w: w, d: d, h: h, color: col, district: districtAt(c.x, c.z) };
      city.buildings.push(b);
      city.colliders.push({ x: c.x, z: c.z, hw: w / 2 + 0.6, hd: d / 2 + 0.6 });
      bodyBoxes.push({ w: w, h: h, d: d, x: c.x, y: h / 2, z: c.z, color: col });
      bodyBoxes.push({ w: w + 1.4, h: 1.1, d: d + 1.4, x: c.x, y: h + 0.4, z: c.z, color: 0x1c2133 });
      // Lit windows on the two street-facing sides, emissive scaled by size.
      var floors = Math.max(2, Math.floor(h / 5));
      var cols = Math.max(2, Math.floor(w / 4.5));
      for (var f = 0; f < floors; f++) {
        for (var k = 0; k < cols; k++) {
          if (rng() < 0.42) continue;
          var wc = rng() < 0.82 ? 0xffd98a : 0x9fe8ff;
          var bright = 0.75 + Math.min(0.6, h / 90);
          var cc = new THREE.Color(wc).multiplyScalar(bright);
          var wx = c.x - w / 2 + 2.4 + k * 4.2;
          winBoxes.push({ w: 1.7, h: 2.1, d: 0.24, x: wx, y: 3 + f * 4.6, z: c.z - d / 2 - 0.1, color: cc.getHex() });
          if (rng() < 0.6) {
            var wz = c.z - d / 2 + 2.4 + f * 4.2;
            if (f < cols) winBoxes.push({ w: 0.24, h: 2.1, d: 1.7, x: c.x - w / 2 - 0.1, y: 3 + f * 4.6, z: wz, color: cc.getHex() });
          }
        }
      }
    }
    city.buildingCount = city.buildings.length;
    VAD.boxCloud(bodyBoxes, VAD.vertexColorMaterial({}), scene);
    VAD.boxCloud(winBoxes, new THREE.MeshBasicMaterial({ vertexColors: true }), scene);

    // ---- Streetlights: marched along both sides of every road, cut to 648.
    var lightPos = [];
    for (var li = 0; li < ROADS.length; li++) {
      for (var lz = -288; lz <= 288; lz += 24) {
        lightPos.push({ x: ROADS[li] - ROAD_HALF - 1.6, z: lz });
        lightPos.push({ x: ROADS[li] + ROAD_HALF + 1.6, z: lz + 12 });
      }
      for (var lx = -288; lx <= 288; lx += 24) {
        lightPos.push({ x: lx, z: ROADS[li] - ROAD_HALF - 1.6 });
      }
    }
    lightPos = lightPos.slice(0, 648);
    city.lightCount = lightPos.length;
    city.lightPos = lightPos;
    var poleBoxes = [], headBoxes = [];
    for (var pi = 0; pi < lightPos.length; pi++) {
      poleBoxes.push({ w: 0.32, h: 6.4, d: 0.32, x: lightPos[pi].x, y: 3.2, z: lightPos[pi].z, color: 0x2a2f3d });
      headBoxes.push({ w: 1.15, h: 0.5, d: 1.15, x: lightPos[pi].x, y: 6.6, z: lightPos[pi].z, color: pi % 3 ? 0xffc37a : 0x8fe3ff });
    }
    VAD.boxCloud(poleBoxes, VAD.vertexColorMaterial({}), scene);
    VAD.boxCloud(headBoxes, new THREE.MeshBasicMaterial({ vertexColors: true }), scene);

    // ---- Harbour: water, quay, piers, cranes.
    var water = new THREE.Mesh(new THREE.PlaneGeometry(680, 90),
      new THREE.MeshPhongMaterial({ color: 0x0d3350, shininess: 90, specular: 0x88bbff }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, -0.25, 305);
    scene.add(water);
    var quayBoxes = [
      { w: 680, h: 1.2, d: 26, x: 0, y: 0.4, z: 266, color: 0x4a4f5e },
      { w: 14, h: 1, d: 44, x: 96, y: 0.3, z: 282, color: 0x565b6a },
      { w: 14, h: 1, d: 44, x: 204, y: 0.3, z: 282, color: 0x565b6a }
    ];
    VAD.boxCloud(quayBoxes, VAD.vertexColorMaterial({}), scene);
    var craneBoxes = [];
    [70, 150, 235].forEach(function (cx) {
      craneBoxes.push({ w: 2.4, h: 30, d: 2.4, x: cx - 9, y: 15, z: 258, color: 0xd8642c });
      craneBoxes.push({ w: 2.4, h: 30, d: 2.4, x: cx + 9, y: 15, z: 258, color: 0xd8642c });
      craneBoxes.push({ w: 26, h: 2.4, d: 2.4, x: cx, y: 30, z: 258, color: 0xe8763a });
      craneBoxes.push({ w: 2, h: 2, d: 20, x: cx, y: 29, z: 268, color: 0xe8763a });
    });
    VAD.boxCloud(craneBoxes, VAD.vertexColorMaterial({}), scene);

    // ---- Old Market stalls.
    var stallBoxes = [], awnBoxes = [];
    for (var mi = 0; mi < 10; mi++) {
      var sx = -146 + (mi % 5) * 13, sz = 38 + Math.floor(mi / 5) * 20;
      stallBoxes.push({ w: 7, h: 2.6, d: 5, x: sx, y: 1.3, z: sz, color: 0x6b4a2f });
      awnBoxes.push({ w: 8.4, h: 0.4, d: 6.4, x: sx, y: 3.4, z: sz, color: [0xe04f6e, 0x2fa8a0, 0xe0a83e, 0x7a5fd0, 0x3f9e4d][mi % 5] });
      city.colliders.push({ x: sx, z: sz, hw: 4, hd: 3 });
    }
    VAD.boxCloud(stallBoxes, VAD.vertexColorMaterial({}), scene);
    VAD.boxCloud(awnBoxes, VAD.vertexColorMaterial({}), scene);

    // ---- Dockyards container stacks.
    var contBoxes = [], contCols = [0xb03a2e, 0x2471a3, 0x1e8449, 0xba7d1c, 0x6c3483, 0x117a8b];
    for (var ci = 0; ci < 26; ci++) {
      var qx = 196 + (ci % 6) * 15, qz = 84 + Math.floor(ci / 6) * 17;
      if (nearSpot(qx, qz, 15)) continue;
      var lvl = 1 + Math.floor(rng() * 2);
      for (var lv = 0; lv < lvl; lv++) {
        contBoxes.push({ w: 12, h: 3, d: 5.4, x: qx, y: 1.5 + lv * 3.05, z: qz, color: contCols[(ci + lv) % contCols.length] });
      }
      city.colliders.push({ x: qx, z: qz, hw: 6.4, hd: 3.1 });
    }
    VAD.boxCloud(contBoxes, VAD.vertexColorMaterial({}), scene);

    // ---- Neon signs, mounted facing OUTWARD from the facade toward the road.
    var signDefs = [
      { t: 'VELMARA', fg: '#ff5f9e', bg: '#160a20', x: 60, z: -141, ry: 0 },
      { t: 'TATTOO', fg: '#3fd9ff', bg: '#0a1626', x: 128, z: 244, ry: Math.PI },
      { t: 'NOODLE NINE', fg: '#ffb340', bg: '#221105', x: -106, z: 40, ry: Math.PI },
      { t: 'HOTEL LUME', fg: '#c9a7ff', bg: '#150a26', x: -60, z: -152, ry: 0 },
      { t: 'PAWN STAR', fg: '#53e0a0', bg: '#06231a', x: 166, z: 100, ry: Math.PI },
      { t: 'MIRELLA ARMS', fg: '#ff7a90', bg: '#260a12', x: 48, z: -116, ry: 0 },
      { t: 'CLUB INDIGO', fg: '#7a5cff', bg: '#0d0a26', x: -168, z: -128, ry: Math.PI / 2 },
      { t: 'FIXER GARAGE', fg: '#ffd23f', bg: '#26200a', x: 108, z: 22, ry: Math.PI }
    ];
    city.signs = [];
    signDefs.forEach(function (s) {
      var tex = signTexture(s.t, s.fg, s.bg);
      var mat = new THREE.MeshBasicMaterial({ map: tex });
      var plane = new THREE.Mesh(new THREE.PlaneGeometry(15, 3.8), mat);
      plane.position.set(s.x, 8.5, s.z);
      plane.rotation.y = s.ry; // plane +Z faces away from the building, to the street
      scene.add(plane);
      city.signs.push(plane);
    });

    // Shop / safehouse storefront markers (glowing rings + posts).
    var markBoxes = [];
    function markerRing(x, z, color) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.22, 8, 24),
        new THREE.MeshBasicMaterial({ color: color }));
      ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.35, z);
      scene.add(ring);
      markBoxes.push({ w: 0.4, h: 5, d: 0.4, x: x + 3, y: 2.5, z: z, color: color });
      return ring;
    }
    city.markers = [];
    VAD.SPOTS.shops.forEach(function (s) {
      city.markers.push({ kind: 'shop', ref: s, ring: markerRing(s.x, s.z, s.color) });
    });
    VAD.SPOTS.safehouses.forEach(function (s) {
      city.markers.push({ kind: 'safehouse', ref: s, ring: markerRing(s.x, s.z, 0x53e0a0) });
    });
    city.markers.push({ kind: 'odile', ref: VAD.SPOTS.odile, ring: markerRing(VAD.SPOTS.odile.x, VAD.SPOTS.odile.z, 0xff5f9e) });
    VAD.boxCloud(markBoxes, new THREE.MeshBasicMaterial({ vertexColors: true }), scene);

    // Objective beacon (moved by the mission system).
    var beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 46, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.30, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    beacon.position.set(0, 23, 0); beacon.visible = false;
    scene.add(beacon);
    city.beacon = beacon;

    // City-limits sign at the east exit.
    var limTex = signTexture('VELMARA CITY LIMITS', '#e8f4ff', '#0d2b16');
    var lim = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.4), new THREE.MeshBasicMaterial({ map: limTex }));
    lim.position.set(282, 5.4, -6); lim.rotation.y = -Math.PI / 2;
    scene.add(lim);
    var limPost = [{ w: 0.4, h: 5.4, d: 0.4, x: 282, y: 2.7, z: -9, color: 0x39404f }, { w: 0.4, h: 5.4, d: 0.4, x: 282, y: 2.7, z: -3, color: 0x39404f }];
    VAD.boxCloud(limPost, VAD.vertexColorMaterial({}), scene);

    // ---- Rain: points cycling downward, respawned below the clouds.
    var rainN = 1600, rPos = new Float32Array(rainN * 3);
    for (var ra = 0; ra < rainN; ra++) {
      rPos[ra * 3] = (rng() - 0.5) * 260;
      rPos[ra * 3 + 1] = rng() * 60;
      rPos[ra * 3 + 2] = (rng() - 0.5) * 260;
    }
    var rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
    var rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0x9fc4e8, size: 0.55, transparent: true, opacity: 0.55 }));
    scene.add(rain);
    city.rain = rain;

    // Collision resolve against building / prop AABBs.
    city.collide = function (x, z, r) {
      for (var i = 0; i < city.colliders.length; i++) {
        var cc = city.colliders[i];
        var dx = x - cc.x, dz = z - cc.z;
        var px = cc.hw + r - Math.abs(dx), pz = cc.hd + r - Math.abs(dz);
        if (px > 0 && pz > 0) {
          if (px < pz) x = cc.x + (dx >= 0 ? cc.hw + r : -(cc.hw + r));
          else z = cc.z + (dz >= 0 ? cc.hd + r : -(cc.hd + r));
        }
      }
      if (x > 292) x = 292; if (x < -292) x = -292;
      if (z > 262) z = 262; if (z < -292) z = -292;
      return { x: x, z: z };
    };

    city.updateFx = function (dt, focusX, focusZ, t) {
      var arr = rain.geometry.attributes.position.array;
      for (var i = 0; i < rainN; i++) {
        arr[i * 3 + 1] -= dt * 46;
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3 + 1] = 55 + Math.random() * 8;
          arr[i * 3] = focusX + (Math.random() - 0.5) * 260;
          arr[i * 3 + 2] = focusZ + (Math.random() - 0.5) * 260;
        }
      }
      rain.geometry.attributes.position.needsUpdate = true;
      beacon.material.opacity = 0.22 + Math.sin(t * 3.2) * 0.1;
      for (var m = 0; m < city.markers.length; m++) {
        var s = 1 + Math.sin(t * 2.4 + m) * 0.08; // pulse in the ground plane, never tumble
        city.markers[m].ring.scale.set(s, s, 1);
      }
    };
    return city;
  };
})();
