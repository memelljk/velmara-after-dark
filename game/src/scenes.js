// scenes.js — deterministic posed scenes for screenshots (?shot=<name>).
// Each scene sets positions, cars, cruisers with lit light bars, wanted
// stars and HUD state DIRECTLY (headless Chrome composites frames only on
// demand and real-time simulation runs slowly, so gameplay is never
// simulated for a capture). The live game never uses these poses.
(function () {
  'use strict';
  var VAD = window.VAD = window.VAD || {};

  function setPlayerInCar(car, x, z, angle, speed) {
    var G = VAD.G;
    car.x = x; car.z = z; car.angle = angle; car.speed = speed || 0;
    car.role = 'player'; car.sync();
    G.car = car;
    G.player.x = x; G.player.z = z; G.player.angle = angle;
    G.heroFigure.group.visible = false;
  }
  function setPlayerOnFoot(x, z, angle) {
    var G = VAD.G;
    G.car = null;
    G.player.x = x; G.player.z = z; G.player.angle = angle;
    G.heroFigure.group.visible = true;
    G.heroFigure.group.position.set(x, 0, z);
    G.heroFigure.group.rotation.y = angle;
  }
  function parkCar(car, x, z, angle) {
    car.x = x; car.z = z; car.angle = angle; car.speed = 0; car.sync();
  }

  VAD.applyShotScene = function (name) {
    var G = VAD.G, p = G.player;
    p.cash = 1240; p.rep = 6; p.ammo = 12; p.reserve = 36; p.armor = 40;
    G.clockMinutes = 21 * 60 + 24;
    var traffic = G.cars.filter(function (c) { return c.role === 'traffic'; });
    var parked = G.cars.filter(function (c) { return c.role === 'parked' && c !== G.heroCar; });

    if (name === 'cover') {
      // Pink Orphee GT driving the Neon Mile in the rain, traffic ahead.
      setPlayerInCar(G.heroCar, 56, -58, 0, 14);
      if (traffic[0]) parkCar(traffic[0], 64, -86, 0), traffic[0].role = 'traffic';
      if (traffic[1]) parkCar(traffic[1], 55, -104, 0), traffic[1].role = 'traffic';
      if (parked[0]) parkCar(parked[0], 47, -40, 0);
      G.radioIndex = 0;
      VAD.Missions.active = false; VAD.Missions.idx = 0;
      VAD.setObjective('FIRST PARCEL', 'Pick up the parcel at the Old Market stalls', '212 m');
      VAD.city.beacon.visible = true;
      VAD.city.beacon.position.set(-120, 23, 48);
      G.camYaw = 0; G.camPitch = 0.24; G.camDist = 11;
    } else if (name === 'chase') {
      // Player coupe at speed, four cruisers lit up behind, 4 stars.
      var coupe = parked[0] || G.heroCar;
      setPlayerInCar(coupe, 4, 44, Math.PI, 19);
      var spots = [[-4, 30], [9, 24], [-9, 16], [3, 8]];
      for (var i = 0; i < 4; i++) {
        var cop = VAD.spawnCar(G.scene, 'interceptor', 0x22262f, spots[i][0], spots[i][1], Math.PI, 'police');
        cop.lampMesh.visible = true;
      }
      var off = VAD.makeHuman({ shirt: 0x1d2f5e, pants: 0x141c33, skin: 0xd9a077, hair: 0x10131c });
      off.group.position.set(13.5, 0, 38); off.group.rotation.y = -Math.PI / 2;
      G.scene.add(off.group);
      G.wanted = 4; G.heat = 4;
      VAD.setObjective('THE VAULT RUN', 'Lose the police', 'Stars: 4 — break line of sight');
      VAD.city.beacon.visible = false;
      G.radioIndex = 1;
      // Front three-quarter chase framing (proven fix): the camera sits ahead
      // of the player car looking back, so all four cruisers stay IN FRAME
      // behind it instead of hidden behind a follow camera.
      G.camYaw = 0.45; G.camPitch = 0.26; G.camDist = 13;
    } else if (name === 'onfoot') {
      // Jax on foot in the Old Market, Odile's dialogue open, shop marker near.
      setPlayerOnFoot(-118, 56, Math.PI * 0.8);
      G.odileFigure.group.position.set(-114.5, 0, 51);
      G.odileFigure.group.rotation.y = Math.PI * 0.3;
      var near = G.peds.slice(0, 5);
      var pp = [[-124, 50], [-112, 62], [-126, 63], [-110, 47], [-121, 42]];
      near.forEach(function (ped, i) {
        ped.x = pp[i][0]; ped.z = pp[i][1];
        ped.fig.group.position.set(ped.x, 0, ped.z);
      });
      p.ammo = 12; p.reserve = 24;
      VAD.Missions.active = true; VAD.Missions.idx = 0;
      VAD.setObjective('FIRST PARCEL', 'Pick up the parcel at the Old Market stalls', '12 m');
      VAD.city.beacon.visible = true;
      VAD.city.beacon.position.set(-120, 23, 48);
      VAD.showDialogue('Odile Vane', ['A parcel waits at the Old Market stalls, Jax. Fetch it, bring it to the Neon Mile — and do not open it.']);
      G.mode = 'play'; // keep the posed frame live; the box stays open for the shot
      document.getElementById('dialogue').classList.remove('hidden');
      G.camYaw = Math.PI * 0.82; G.camPitch = 0.3; G.camDist = 8.5;
    } else if (name === 'mission') {
      // Dockmaster Pickup on the harbour run, countdown + marker + TATTOO sign.
      var pickup = G.cars.filter(function (c) { return c.type.id === 'pickup'; })[0] || parked[1] || G.heroCar;
      setPlayerInCar(pickup, 148, 206, Math.PI, 12);
      if (traffic[2]) { parkCar(traffic[2], 141, 238, 0); traffic[2].role = 'traffic'; }
      if (traffic[3]) { parkCar(traffic[3], 156, 184, Math.PI); traffic[3].role = 'traffic'; }
      G.radioIndex = 3;
      VAD.Missions.active = true; VAD.Missions.idx = 1;
      VAD.setObjective('NINE MINUTES TO DOCK NINE', 'Reach the harbour vault quay', '47 m · 96 s left');
      VAD.city.beacon.visible = true;
      VAD.city.beacon.position.set(150, 23, 255);
      G.camYaw = Math.PI; G.camPitch = 0.25; G.camDist = 11.5;
    }
    VAD.updateHud();
  };
})();
