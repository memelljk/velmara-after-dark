// missions.js — the twelve-mission campaign of Velmara After Dark, Odile
// Vane's dialogue, the six shops, the three safehouses, and the repeatable
// checkpoint races + courier runs that keep paying after the story ends.
(function () {
  'use strict';
  var VAD = window.VAD = window.VAD || {};

  var M = {
    idx: 0, active: false, step: 0, timer: 0, holdT: 0, collectIdx: 0,
    thugsAlive: 0, campaignDone: false, sideAlt: 0, race: null
  };
  VAD.Missions = M;

  var LIST = [
    {
      id: 'parcel', title: 'FIRST PARCEL', reward: 150, rep: 1,
      intro: ['Jax. You look like a man who owes money and owns a fast pair of hands.', 'A parcel waits at the Old Market stalls. Fetch it, bring it back to the Neon Mile. Do not open it.'],
      outro: ['Still sealed. Good boy. Word travels: Jax Rook delivers.'],
      steps: [
        { kind: 'goto', x: -120, z: 48, r: 6, label: 'Pick up the parcel at the Old Market stalls' },
        { kind: 'goto', x: 60, z: -96, r: 7, label: 'Deliver the parcel to the Neon Mile drop' }
      ]
    },
    {
      id: 'docknine', title: 'NINE MINUTES TO DOCK NINE', reward: 220, rep: 1,
      intro: ['A Dockmaster Pickup at the harbour is loaded with machine parts that officially do not exist.', 'The buyer counts minutes, not excuses. Get it to Dock Nine at the quay.'],
      outro: ['Dock Nine, on the clock. The harbour master sends his regards.'],
      steps: [
        { kind: 'goto', x: 150, z: 255, r: 9, label: 'Reach the harbour vault quay', time: 180 },
        { kind: 'goto', x: 204, z: 252, r: 8, label: 'Park at Dock Nine, east pier' }
      ]
    },
    {
      id: 'indigo', title: 'INDIGO HEART', reward: 320, rep: 2,
      intro: ['In The Heights sits an indigo Orphee GT with my name on its papers and someone else\u2019s name on its plates.', 'Take it. The Dockyards crew will strip the plates. Try not to scratch the paint.'],
      outro: ['Indigo, unmarked, beautiful. The crew chief nearly smiled.'],
      steps: [
        { kind: 'steal', type: 'orphee', spawn: { x: -150, z: -126, a: Math.PI / 2, color: 0x3b2fd0 }, label: 'Steal the indigo Orphee GT in The Heights' },
        { kind: 'deliverCar', x: 220, z: 102, r: 9, label: 'Deliver the Orphee GT to the Dockyards' }
      ]
    },
    {
      id: 'dockcrew', title: 'DOCK CREW', reward: 300, rep: 2,
      intro: ['Four of Sal Marek\u2019s boys are squatting on my Dockyards berth, taxing every crate.', 'Clear them out. All four. Loud is fine — the gulls are used to it.'],
      outro: ['The berth is ours again. Marek will hear about it, which is rather the point.'],
      steps: [
        { kind: 'goto', x: 210, z: 118, r: 10, label: 'Go to the Dockyards container berth' },
        { kind: 'clear', count: 4, spawns: [[200, 108], [222, 128], [206, 136], [230, 110]], label: 'Clear the Dock Crew thugs' }
      ]
    },
    {
      id: 'vault', title: 'THE VAULT RUN', reward: 420, rep: 2,
      intro: ['The harbour vault crew needs sixty seconds of nobody dying while they crack the quay safe.', 'Hold the vault point. Then, when the sirens come — and they will — lose them.'],
      outro: ['The safe sang, the cops lost the scent, and you are still breathing. Excellent arithmetic.'],
      steps: [
        { kind: 'goto', x: 150, z: 255, r: 9, label: 'Get to the harbour vault point' },
        { kind: 'hold', x: 150, z: 255, r: 11, seconds: 60, label: 'Hold the vault point while the crew works' },
        { kind: 'escape', label: 'Lose the police' }
      ]
    },
    {
      id: 'shakedown', title: 'MARKET SHAKEDOWN', reward: 260, rep: 1,
      intro: ['Three Old Market stalls owe protection money and have developed sudden amnesia.', 'Visit each stall, on foot, and refresh their memory. Politely. Mostly.'],
      outro: ['Every stall remembered at once. Funny how that works.'],
      steps: [
        { kind: 'collect', points: [[-146, 44], [-120, 64], [-94, 44]], label: 'Collect protection money from the market stalls', onFoot: true }
      ]
    },
    {
      id: 'courier', title: 'NIGHT COURIER', reward: 350, rep: 2,
      intro: ['Three drops, three districts, one clock. Envelopes that cannot wait for morning.', 'Harbour crossing first, then the market road, then the north drop. Go.'],
      outro: ['Three drops, zero questions. The night post is proud of you.'],
      steps: [
        { kind: 'collect', points: [[120, 66], [-60, 126], [-120, -54]], time: 240, label: 'Make all three courier drops before time runs out' }
      ]
    },
    {
      id: 'siren', title: 'SIREN SONG', reward: 480, rep: 2,
      intro: ['A police interceptor sits unattended by the north station yard. My garage wants its engine computer.', 'Steal it and bring it to the Fixer Garage. The irony is free of charge.'],
      outro: ['One interceptor, delivered. The garage boys are still laughing.'],
      steps: [
        { kind: 'steal', type: 'interceptor', spawn: { x: 6, z: -240, a: 0, color: 0x22262f }, label: 'Steal the police interceptor at the north yard' },
        { kind: 'deliverCar', x: 108, z: 14, r: 9, label: 'Deliver the interceptor to the Fixer Garage' }
      ]
    },
    {
      id: 'rooftop', title: 'ROOFTOP COVER', reward: 400, rep: 2,
      intro: ['Marek put three gunmen over the Old Market to watch my stalls. The stalls would like them gone.', 'They shoot down at anything that moves. Be something that moves faster.'],
      outro: ['The rooftops are quiet and the market breathes again.'],
      steps: [
        { kind: 'goto', x: -120, z: 84, r: 9, label: 'Enter the Old Market gunmen\u2019s ground' },
        { kind: 'clear', count: 3, spawns: [[-134, 74], [-106, 74], [-120, 94]], label: 'Clear the rooftop gunmen' }
      ]
    },
    {
      id: 'ledger', title: 'THE LEDGER', reward: 550, rep: 3,
      intro: ['My ledger — every debt in Velmara — sleeps in the Harbor Bunk safehouse.', 'Carry it to me while the whole city watches. Three stars of attention, minimum. Do not stop.'],
      outro: ['The ledger, home safe. Half the city just exhaled and does not know why.'],
      steps: [
        { kind: 'goto', x: 132, z: 226, r: 7, label: 'Pick up the ledger at the Harbor Bunk' },
        { kind: 'goto', x: 36, z: -96, r: 7, label: 'Bring the ledger to Odile — hold 3 stars', stars: 3 }
      ]
    },
    {
      id: 'blockade', title: 'HARBOR BLOCKADE', reward: 650, rep: 3,
      intro: ['The PD has sealed the harbour road with checkpoints. My cargo still needs the east road out.', 'Smash through all three checkpoints and reach the city-limits sign.'],
      outro: ['Through the blockade and gone. The radio chatter was almost poetry.'],
      steps: [
        { kind: 'collect', points: [[180, 186], [240, 66], [282, 0]], label: 'Smash through the police checkpoints to the city limits', stars: 3 }
      ]
    },
    {
      id: 'goodbye', title: 'VELMARA GOODBYE', reward: 2500, rep: 5,
      intro: ['Last job, Jax. The vault cash is loaded at the quay. Five stars will follow it.', 'Take the cash, run the east road, and do not stop until the city-limits sign is in your mirror. Then Velmara is done with you — and you with her.'],
      outro: ['You made it past the limits with the vault cash, Jax. Velmara fades in the rain behind you. Spend it somewhere dry.'],
      steps: [
        { kind: 'goto', x: 150, z: 255, r: 9, label: 'Take the vault cash at the harbour quay' },
        { kind: 'goto', x: 282, z: 0, r: 10, label: 'Escape past the city limits', stars: 5 }
      ]
    }
  ];
  M.list = LIST;

  // ---------- dialogue ----------
  var dlg = null;
  VAD.showDialogue = function (name, lines, onDone) {
    var G = VAD.G;
    dlg = { lines: lines.slice(), i: 0, onDone: onDone || null };
    G.mode = 'dialogue';
    document.getElementById('dlg-name').textContent = name;
    document.getElementById('dlg-text').textContent = dlg.lines[0];
    document.getElementById('dialogue').classList.remove('hidden');
    VAD.audioEnsure(); VAD.sfxClick();
  };
  VAD.advanceDialogue = function () {
    if (!dlg) return;
    dlg.i++;
    VAD.sfxClick();
    if (dlg.i >= dlg.lines.length) {
      document.getElementById('dialogue').classList.add('hidden');
      var cb = dlg.onDone; dlg = null;
      VAD.G.mode = 'play';
      if (cb) cb();
    } else {
      document.getElementById('dlg-text').textContent = dlg.lines[dlg.i];
    }
  };
  VAD.dialogueOpen = function () { return !!dlg; };

  // ---------- mission flow ----------
  function cur() { return LIST[M.idx]; }
  function step() { return cur().steps[M.step]; }

  M.talkToOdile = function () {
    if (M.active) {
      VAD.showDialogue('Odile Vane', ['The job is not done, Jax. Follow the gold marker. I pay for finished work, not progress reports.']);
      return;
    }
    if (M.campaignDone) {
      // Repeatable earners alternate: checkpoint race, then courier run.
      if (M.sideAlt % 2 === 0) {
        VAD.showDialogue('Odile Vane', ['The story is over but the streets still pay. Checkpoint race: five gold markers, beat the clock, $300 if you are quick.'], function () { M.startRace(); });
      } else {
        VAD.showDialogue('Odile Vane', ['Courier work, three drops against the clock. $280 flat. The envelopes are already sweating.'], function () { M.startCourier(); });
      }
      M.sideAlt++;
      return;
    }
    var m = cur();
    VAD.showDialogue('Odile Vane', m.intro, function () { M.begin(); });
  };

  M.begin = function () {
    M.active = true; M.step = 0;
    setupStep();
    VAD.toast('Mission started: ' + cur().title);
  };

  function setupStep() {
    var G = VAD.G, s = step();
    M.holdT = 0; M.collectIdx = 0;
    if (s.time) M.timer = s.time; else M.timer = 0;
    if (s.stars) VAD.setWanted(s.stars);
    if (s.kind === 'steal' && s.spawn && !s.spawned) {
      s.spawned = true;
      var car = VAD.spawnCar(G.scene, s.type, s.spawn.color, s.spawn.x, s.spawn.z, s.spawn.a, 'parked');
      car.missionTag = cur().id;
      s.carRef = car;
    }
    if (s.kind === 'clear') {
      M.thugsAlive = s.count;
      s.spawns.forEach(function (pt) { VAD.spawnThug(G.scene, pt[0], pt[1]); });
    }
    refreshObjective();
  }

  function refreshObjective() {
    var G = VAD.G;
    if (M.race) {
      VAD.setObjective(M.race.title, M.race.label, raceMeta());
      VAD.city.beacon.visible = true;
      VAD.city.beacon.position.set(M.race.points[M.race.i][0], 23, M.race.points[M.race.i][1]);
      return;
    }
    if (!M.active) {
      if (M.campaignDone) VAD.setObjective('VELMARA AFTER DARK', 'Free roam — talk to Odile for races and courier runs', '');
      else VAD.setObjective(cur().title, 'Talk to Odile Vane at her Neon Mile booth', distMeta(VAD.SPOTS.odile.x, VAD.SPOTS.odile.z));
      VAD.city.beacon.visible = !M.campaignDone;
      VAD.city.beacon.position.set(VAD.SPOTS.odile.x, 23, VAD.SPOTS.odile.z);
      return;
    }
    var s = step();
    var target = stepTarget(s);
    VAD.setObjective(cur().title, s.label, stepMeta(s));
    if (target) {
      VAD.city.beacon.visible = true;
      VAD.city.beacon.position.set(target[0], 23, target[1]);
    } else VAD.city.beacon.visible = false;
  }
  M.refreshObjective = refreshObjective;

  function stepTarget(s) {
    if (s.kind === 'goto' || s.kind === 'hold' || s.kind === 'deliverCar') return [s.x, s.z];
    if (s.kind === 'collect') return s.points[M.collectIdx] || null;
    if (s.kind === 'steal' && s.carRef) return [s.carRef.x, s.carRef.z];
    if (s.kind === 'steal' && s.spawn) return [s.spawn.x, s.spawn.z];
    return null;
  }
  function distMeta(x, z) {
    var p = VAD.G.player;
    return Math.round(Math.hypot(p.x - x, p.z - z)) + ' m';
  }
  function stepMeta(s) {
    var t = stepTarget(s);
    var parts = [];
    if (t) parts.push(distMeta(t[0], t[1]));
    if (s.time && M.timer > 0) parts.push(Math.ceil(M.timer) + ' s left');
    if (s.kind === 'hold') parts.push(Math.floor(M.holdT) + ' / ' + s.seconds + ' s held');
    if (s.kind === 'clear') parts.push(M.thugsAlive + ' thugs left');
    if (s.kind === 'collect') parts.push('Drop ' + (M.collectIdx + 1) + ' of ' + s.points.length);
    if (s.kind === 'escape') parts.push('Stars: ' + VAD.G.wanted + ' — break line of sight and let heat cool');
    return parts.join(' · ');
  }
  function raceMeta() {
    return 'Checkpoint ' + (M.race.i + 1) + ' of ' + M.race.points.length + ' · ' + Math.ceil(M.race.timeLeft) + ' s left';
  }

  function completeStep() {
    var s = step();
    if (s.stars && !stepHasOwnStars(step(), M.step + 1)) VAD.clearForcedWanted();
    M.step++;
    if (M.step >= cur().steps.length) { completeMission(); return; }
    setupStep();
  }
  function stepHasOwnStars() { return false; }

  function completeMission() {
    var G = VAD.G, m = cur();
    M.active = false;
    G.player.cash += m.reward;
    G.player.rep += m.rep;
    VAD.sfxCash();
    VAD.toast(m.title + ' complete — $' + m.reward + ' earned');
    VAD.showDialogue('Odile Vane', m.outro);
    M.idx++;
    if (M.idx >= LIST.length) {
      M.campaignDone = true;
      G.player.cash += 0;
      setTimeout(function () { VAD.toast('CAMPAIGN COMPLETE — free roam, races and courier runs now pay at Odile\u2019s booth.'); }, 400);
    }
    VAD.saveGame();
    refreshObjective();
  }

  M.failMission = function (why) {
    M.active = false;
    if (step() && step().stars) VAD.clearForcedWanted();
    VAD.toast('Mission failed: ' + why + ' — see Odile to retry.');
    refreshObjective();
  };

  M.onThugDown = function (thug) {
    if (!M.active) return;
    var s = step();
    if (s && s.kind === 'clear') {
      M.thugsAlive--;
      if (M.thugsAlive <= 0) completeStep(); else refreshObjective();
    }
  };

  // ---------- repeatables ----------
  M.startRace = function () {
    M.race = {
      kind: 'race', title: 'CHECKPOINT RACE', label: 'Hit every gold checkpoint',
      points: [[60, 0], [120, -60], [180, 0], [120, 60], [60, 0]], i: 0, timeLeft: 75, pay: 300
    };
    VAD.toast('Checkpoint race started — follow the gold beacon!');
    refreshObjective();
  };
  M.startCourier = function () {
    M.race = {
      kind: 'courier', title: 'COURIER RUN', label: 'Three drops against the clock',
      points: [[-60, -120], [120, 120], [-180, 60]], i: 0, timeLeft: 150, pay: 280
    };
    VAD.toast('Courier run started — three drops, one clock.');
    refreshObjective();
  };
  function updateRace(dt) {
    var G = VAD.G, r = M.race;
    r.timeLeft -= dt;
    if (r.timeLeft <= 0) { M.race = null; VAD.toast('Out of time — the run pays nothing.'); refreshObjective(); return; }
    var pt = r.points[r.i];
    if (Math.hypot(G.player.x - pt[0], G.player.z - pt[1]) < 9) {
      r.i++; VAD.sfxCash();
      if (r.i >= r.points.length) {
        G.player.cash += r.pay; G.player.rep += 1;
        VAD.toast(r.title + ' complete — $' + r.pay + ' earned');
        M.race = null; VAD.saveGame();
      }
      refreshObjective();
    }
  }

  // ---------- per-frame ----------
  M.update = function (dt) {
    var G = VAD.G;
    if (M.race) { updateRace(dt); return; }
    if (!M.active) { refreshObjective(); return; }
    var s = step();
    if (s.time) {
      M.timer -= dt;
      if (M.timer <= 0) { M.failMission('out of time'); return; }
    }
    var p = G.player;
    if (s.kind === 'goto' || s.kind === 'deliverCar') {
      if (s.kind === 'deliverCar' && !G.car) { refreshObjective(); return; }
      if (s.kind === 'deliverCar' && step().carType && G.car.type.id !== step().carType) { refreshObjective(); return; }
      if (Math.hypot(p.x - s.x, p.z - s.z) < s.r) { completeStep(); return; }
    } else if (s.kind === 'steal') {
      if (G.car && s.carRef && G.car === s.carRef) { completeStep(); return; }
      if (G.car && !s.carRef && G.car.type.id === s.type) { completeStep(); return; }
    } else if (s.kind === 'hold') {
      if (Math.hypot(p.x - s.x, p.z - s.z) < s.r) {
        M.holdT += dt;
        if (M.holdT >= s.seconds) {
          VAD.setWanted(3);
          completeStep(); return;
        }
      } else M.holdT = Math.max(0, M.holdT - dt * 2);
    } else if (s.kind === 'collect') {
      var pt = s.points[M.collectIdx];
      if (pt && !(s.onFoot && G.car) && Math.hypot(p.x - pt[0], p.z - pt[1]) < 6) {
        M.collectIdx++; VAD.sfxCash();
        if (M.collectIdx >= s.points.length) { completeStep(); return; }
      }
    } else if (s.kind === 'escape') {
      if (G.wanted <= 0) { completeStep(); return; }
    } else if (s.kind === 'clear') {
      // completion driven by onThugDown
    }
    refreshObjective();
  };

  // ---------- shops ----------
  VAD.SHOP_ITEMS = {
    arms: [
      { name: 'Pistol ammo ×24', price: 40, apply: function (p) { p.reserve += 24; return 'Ammo restocked.'; } },
      { name: 'Reserve ammo ×60', price: 85, apply: function (p) { p.reserve += 60; return 'Deep pockets, full mags.'; } },
      { name: 'Armor vest', price: 120, apply: function (p) { p.armor = 100; return 'Vest fitted — armor full.'; } }
    ],
    garage: [
      { name: 'Repair current car', price: 75, apply: function (p) { if (VAD.G.car) { VAD.repairCar(VAD.G.car); return 'Good as new.'; } return 'No car to repair — the boys polish the floor instead.'; } },
      { name: 'Full tank & tune', price: 45, apply: function (p) { return 'Tuned. She purrs.'; } }
    ],
    stitch: [
      { name: 'Tailored outfit (+25 max health)', price: 200, apply: function (p) { if (p.outfit) return 'You already wear the good suit.'; p.outfit = true; p.maxHealth += 25; p.health += 25; return 'Sharp suit, tougher Jax.'; } },
      { name: 'Rain coat (style)', price: 30, apply: function (p) { return 'Velmara rain, beaten in style.'; } }
    ],
    noodle: [
      { name: 'Noodle bowl (heal 50)', price: 18, apply: function (p) { p.health = Math.min(p.maxHealth, p.health + 50); return 'Hot broth, steady hands.'; } },
      { name: 'Chili dumplings (heal 25)', price: 10, apply: function (p) { p.health = Math.min(p.maxHealth, p.health + 25); return 'Fire in the belly.'; } }
    ],
    pawn: [
      { name: 'Sell all loot', price: 0, apply: function (p) { var v = p.loot * 45; p.cash += v; var n = p.loot; p.loot = 0; return n ? 'Sold ' + n + ' loot for $' + v + '.' : 'No loot to sell.'; } },
      { name: 'Sell watch (+$25)', price: -25, apply: function (p) { p.cash += 25; return 'The watch finds a new wrist.'; } }
    ],
    clinic: [
      { name: 'Full treatment (heal all)', price: 60, apply: function (p) { p.health = p.maxHealth; return 'Patched, stitched, good as new.'; } },
      { name: 'Bandage (heal 30)', price: 15, apply: function (p) { p.health = Math.min(p.maxHealth, p.health + 30); return 'A bandage and kind words.'; } }
    ]
  };

  VAD.openShop = function (shop) {
    var G = VAD.G;
    G.mode = 'shop'; G.openShopRef = shop;
    document.getElementById('shop-name').textContent = shop.name;
    VAD.renderShop();
    document.getElementById('shopmenu').classList.remove('hidden');
    VAD.sfxClick();
  };
  VAD.renderShop = function () {
    var G = VAD.G, shop = G.openShopRef;
    var wrap = document.getElementById('shop-items');
    wrap.innerHTML = '';
    (VAD.SHOP_ITEMS[shop.id] || []).forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'shop-item';
      var label = document.createElement('span');
      label.textContent = item.name + (item.price > 0 ? ' — $' + item.price : '');
      var btn = document.createElement('button');
      btn.textContent = item.price > 0 ? 'BUY' : 'SELL';
      btn.disabled = item.price > 0 && G.player.cash < item.price;
      btn.addEventListener('click', function () {
        if (item.price > 0) G.player.cash -= item.price;
        var msg = item.apply(G.player);
        VAD.sfxCash();
        VAD.toast(msg);
        VAD.renderShop();
        VAD.saveGame();
      });
      row.appendChild(label); row.appendChild(btn);
      wrap.appendChild(row);
    });
    document.getElementById('shop-cash').textContent = 'Cash: $' + G.player.cash + ' · Loot: ' + G.player.loot;
  };
  VAD.closeShop = function () {
    document.getElementById('shopmenu').classList.add('hidden');
    VAD.G.mode = 'play'; VAD.G.openShopRef = null;
  };

  VAD.useSafehouse = function (sh) {
    var G = VAD.G, p = G.player;
    p.health = p.maxHealth;
    if (G.wanted > 0) { G.heat = Math.max(0, G.heat - 1.2); VAD.refreshWanted(); }
    VAD.saveGame();
    VAD.toast(sh.name + ' — game saved, wounds rested, heat cooled by one star.');
    VAD.showDialogue('Safehouse', ['Jax sleeps under a ceiling that does not leak. The city forgets a little. (Saved)']);
  };
})();
