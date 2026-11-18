// hero.js — humanoid figures and Jax Rook, the player character.
// Torso + head are baked into ONE vertex-coloured mesh; legs and arms are
// separate small meshes so they can swing. Every figure gets a default pants
// colour derived from its body colour when none is given (a missing pants
// field once caused a THREE colour-undefined warning — never again).
(function () {
  'use strict';
  var VAD = window.VAD = window.VAD || {};

  function derivePants(shirtHex) {
    var c = new THREE.Color(shirtHex);
    c.multiplyScalar(0.45);
    c.b = Math.min(1, c.b + 0.05);
    return c.getHex();
  }
  VAD.derivePants = derivePants;

  VAD.makeHuman = function (opts) {
    opts = opts || {};
    var shirt = opts.shirt !== undefined ? opts.shirt : 0x3a6fd8;
    var pants = opts.pants !== undefined ? opts.pants : derivePants(shirt);
    var skin = opts.skin !== undefined ? opts.skin : 0xd9a077;
    var hair = opts.hair !== undefined ? opts.hair : 0x201812;
    var g = new THREE.Group();

    // Torso + head + hair: ONE merged mesh.
    var upper = VAD.mergeBoxes([
      { w: 0.62, h: 0.78, d: 0.34, x: 0, y: 1.12, z: 0, color: shirt },
      { w: 0.34, h: 0.36, d: 0.34, x: 0, y: 1.7, z: 0, color: skin },
      { w: 0.37, h: 0.13, d: 0.37, x: 0, y: 1.9, z: 0, color: hair }
    ]);
    g.add(new THREE.Mesh(upper, VAD.vertexColorMaterial({})));

    function limb(w, h, d, x, y, color) {
      var geo = new THREE.BoxGeometry(w, h, d);
      geo.translate(0, -h / 2, 0);
      var mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: color }));
      mesh.position.set(x, y, 0);
      g.add(mesh);
      return mesh;
    }
    var legL = limb(0.21, 0.74, 0.24, -0.16, 0.74, pants);
    var legR = limb(0.21, 0.74, 0.24, 0.16, 0.74, pants);
    var armL = limb(0.15, 0.66, 0.17, -0.4, 1.46, shirt);
    var armR = limb(0.15, 0.66, 0.17, 0.4, 1.46, shirt);
    return { group: g, legL: legL, legR: legR, armL: armL, armR: armR, walkPhase: Math.random() * 6 };
  };

  VAD.animateHuman = function (h, dt, moving, speedF) {
    if (moving) {
      h.walkPhase += dt * (7 + (speedF || 0) * 6);
      var s = Math.sin(h.walkPhase) * 0.6;
      h.legL.rotation.x = s; h.legR.rotation.x = -s;
      h.armL.rotation.x = -s * 0.8; h.armR.rotation.x = s * 0.8;
      h.group.position.y = Math.abs(Math.sin(h.walkPhase)) * 0.05;
    } else {
      h.legL.rotation.x *= 0.8; h.legR.rotation.x *= 0.8;
      h.armL.rotation.x *= 0.8; h.armR.rotation.x *= 0.8;
      h.group.position.y = 0;
    }
  };

  // Jax Rook: magenta jacket — readable in every screenshot.
  VAD.buildHero = function (scene) {
    var G = VAD.G;
    var h = VAD.makeHuman({ shirt: 0xd81e6e, pants: 0x23283d, skin: 0xc98a5e, hair: 0x14100c });
    h.group.position.set(G.player.x, 0, G.player.z);
    scene.add(h.group);
    // Pistol mesh in the right hand area.
    var gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 0.42),
      new THREE.MeshLambertMaterial({ color: 0x191c22 }));
    gun.position.set(0.42, 0.95, -0.25);
    h.group.add(gun);
    G.heroFigure = h;
    G.gunMesh = gun;
    return h;
  };

  // On-foot movement: WASD relative to the orbit camera, sprint on Shift.
  VAD.updateHeroOnFoot = function (dt) {
    var G = VAD.G, p = G.player;
    if (G.car) { G.heroFigure.group.visible = false; return; }
    G.heroFigure.group.visible = true;
    var f = (G.keys['KeyW'] || G.keys['ArrowUp'] ? 1 : 0) - (G.keys['KeyS'] || G.keys['ArrowDown'] ? 1 : 0);
    var s = (G.keys['KeyD'] || G.keys['ArrowRight'] ? 1 : 0) - (G.keys['KeyA'] || G.keys['ArrowLeft'] ? 1 : 0);
    var moving = f !== 0 || s !== 0;
    var sprint = G.keys['ShiftLeft'] || G.keys['ShiftRight'];
    var speed = sprint ? 10.5 : 6.2;
    if (moving) {
      var cy = G.camYaw;
      var mx = (-Math.sin(cy) * f + Math.cos(cy) * s);
      var mz = (-Math.cos(cy) * f - Math.sin(cy) * s);
      var len = Math.hypot(mx, mz) || 1;
      mx /= len; mz /= len;
      p.x += mx * speed * dt;
      p.z += mz * speed * dt;
      p.angle = Math.atan2(-mx, -mz);
      var hit = VAD.city.collide(p.x, p.z, 0.55);
      p.x = hit.x; p.z = hit.z;
    }
    G.heroFigure.group.position.set(p.x, 0, p.z);
    G.heroFigure.group.rotation.y = p.angle;
    VAD.animateHuman(G.heroFigure, dt, moving, sprint ? 1 : 0);
    // Aiming raises the gun arm toward the camera heading.
    if (G.aiming) {
      G.heroFigure.armR.rotation.x = -1.35;
      p.angle = G.camYaw + Math.PI;
      G.heroFigure.group.rotation.y = p.angle;
    }
  };
})();
