function updateTractorBoss(e, dt) {
  const tr = e.tractor;
  if (!tr) return;
  tr.t += dt;
  if (tr.phase === 'descend') {
    const t = clamp(tr.t / 1.25, 0, 1), start = formationSlot(e), hover = { x: tr.hoverX, y: H * 0.47 };
    const p = cubic(start, { x: start.x + (start.x < W / 2 ? -120 : 120), y: start.y + 85 }, { x: hover.x, y: hover.y - 90 }, hover, t);
    e.x = p.x; e.y = p.y;
    const tan = pathTangent(q => cubic(start, { x: start.x + (start.x < W / 2 ? -120 : 120), y: start.y + 85 }, { x: hover.x, y: hover.y - 90 }, hover, q), t);
    e.angle = Math.atan2(tan.y, tan.x) + Math.PI / 2;
    if (t >= 1) { tr.phase = 'beam'; tr.t = 0; tr.beamClock = 0; e.angle = Math.PI; sfx('beam'); }
    return;
  }
  if (tr.phase === 'beam') {
    tr.beamClock += dt; e.angle = Math.PI;
    if (!player.hidden && !player.capture && !player.dual && Math.abs(player.x - e.x) < beamHalfWidthAtPlayer(e)) {
      startCapture(e); tr.captureStarted = true; tr.phase = 'capturing'; tr.t = 0; return;
    }
    if (tr.beamClock >= 2.45) { tr.phase = 'return'; tr.t = 0; }
    return;
  }
  if (tr.phase === 'capturing') {
    if (!player.capture) { tr.phase = 'return'; tr.t = 0; }
    return;
  }
  if (tr.phase === 'return') {
    tr.t += dt;
    const t = clamp(tr.t / 1.25, 0, 1), slot = formationSlot(e);
    const p = cubic({ x: e.x, y: e.y }, { x: e.x, y: 95 }, { x: slot.x, y: slot.y - 70 }, slot, t);
    e.x = p.x; e.y = p.y; e.angle = Math.PI;
    if (t >= 1) { e.state = 'formation'; e.tractor = null; finishAttackGroupIfDone(e.attackGroup); e.attackGroup = null; }
  }
}

function beamHalfWidthAtPlayer(e) { return 22 + Math.max(1, player.y - e.y) * 0.19; }

function startCapture(boss) {
  if (player.dual || player.hidden || player.capture) return;
  player.capture = { bossId: boss.id, t: 0, startX: player.x, startY: player.y };
  keys.left = keys.right = false;
  sfx('capture');
}

function updateCapture(dt) {
  const cap = player.capture, boss = enemies.find(e => e.alive && e.id === cap.bossId);
  if (!boss) { player.capture = null; return; }
  cap.t += dt / 1.25;
  const t = clamp(cap.t, 0, 1);
  player.x = lerp(cap.startX, boss.x, smooth(t)); player.y = lerp(cap.startY, boss.y + 32, smooth(t));
  if (cap.t >= 1) completeCapture(boss);
}

function completeCapture(boss) {
  player.capture = null; player.hidden = true; player.y = H - 58;
  boss.capturedFighter = true; boss.carrierState = 'attached'; boss.tractor.phase = 'return'; boss.tractor.t = 0;
  showTransient('FIGHTER CAPTURED', 'Destroy the carrier while it is DIVING to recover Dual Bean.');
  if (player.reserves > 0) { player.reserves -= 1; player.respawnClock = 1.4; state.mode = 'lifeLost'; }
  else gameOver('Your final Bean was captured.');
}

function updateLifeLost(dt) {
  player.respawnClock -= dt;
  if (player.respawnClock <= 0) {
    player.hidden = false; player.x = W / 2; player.y = H - 58; player.invuln = 1.8;
    state.mode = enemies.some(e => e.alive && (e.state === 'waiting' || e.state === 'entering')) ? 'entry' : 'formation';
    hideCenter();
  }
  updateEnemies(dt);
}

function tryStartTransform() {
  const bee = enemies.find(e => e.alive && e.state === 'formation' && e.type === 'bee' && !e.capturedFighter);
  if (!bee) { state.transformUsed = true; return; }
  state.transformUsed = true; bee.alive = false;
  const info = transformInfoForStage(state.stage), trioId = `trio-${state.stage}-${Date.now()}`;
  for (let i = 0; i < 3; i++) transforms.push({ id: `${trioId}-${i}`, trioId, kind: info.kind, groupBonus: info.bonus, x: bee.x, y: bee.y, startX: bee.x, startY: bee.y, index: i, t: -i * 0.09, alive: true, escaped: false, angle: 0 });
  showMessage(`${info.label.toUpperCase()} TRANSFORM`);
}

function transformInfoForStage(stage) {
  return [
    { kind: 'scorpion', label: 'Scorpion', bonus: 1000 },
    { kind: 'stingray', label: 'Stingray', bonus: 2000 },
    { kind: 'flagship', label: 'Galaxian Flagship', bonus: 3000 }
  ][Math.floor((stage - 4) / 4) % 3];
}

function updateTransforms(dt) {
  for (const tr of transforms) {
    if (!tr.alive) continue;
    tr.t += dt / 2.65;
    if (tr.t < 0) continue;
    const t = clamp(tr.t, 0, 1), p = transformPath(tr, t), tan = pathTangent(q => transformPath(tr, q), t);
    tr.x = p.x; tr.y = p.y; tr.angle = Math.atan2(tan.y, tan.x) + Math.PI / 2;
    if (tr.t >= 1) { tr.alive = false; tr.escaped = true; }
  }
}

function transformPath(tr, t) {
  const side = tr.index === 1 ? 1 : -1, start = { x: tr.startX, y: tr.startY }, lane = tr.index - 1;
  return cubic(start, { x: W / 2 + lane * 95, y: 250 }, { x: W / 2 + side * 210, y: H * 0.62 }, { x: W / 2 + lane * 80, y: H + 55 }, t);
}

function updateRogueCaptured(dt) {
  const r = state.rogueCaptured;
  if (!r || !r.alive) return;
  r.t += dt / 2.6;
  const t = clamp(r.t, 0, 1);
  const fn = q => cubic(r.start, { x: r.start.x + r.side * 190, y: r.start.y + 95 }, { x: r.targetX - r.side * 120, y: H * 0.63 }, { x: r.targetX + r.side * 60, y: H + 55 }, q);
  const p = fn(t), tan = pathTangent(fn, t);
  r.x = p.x; r.y = p.y; r.angle = Math.atan2(tan.y, tan.x) + Math.PI / 2;
  if (r.t >= 1) r.alive = false;
}

function setupChallenge() {
  state.challenge = { index: challengeIndex(state.stage), clock: 0, spawned: new Set(), groupKills: [0,0,0,0,0], groupResolved: [false,false,false,false,false], hits: 0, total: 40, completeClock: null };
  playerShots.length = enemyShots.length = challengeTargets.length = 0;
}

function updateChallenge(dt) {
  const ch = state.challenge;
  ch.clock += dt;
  for (let g = 0; g < 5; g++) {
    if (ch.clock >= 1 + g * 3.15 && !ch.spawned.has(g)) { ch.spawned.add(g); spawnChallengeGroup(g, ch.index); }
  }
  for (const e of challengeTargets) {
    if (!e.alive) continue;
    e.t += dt / e.duration;
    if (e.t < 0) continue;
    const t = clamp(e.t, 0, 1), p = challengePath(e, t, ch.index), tan = pathTangent(q => challengePath(e, q, ch.index), t);
    e.x = p.x; e.y = p.y; e.angle = Math.atan2(tan.y, tan.x) + Math.PI / 2;
    if (e.t >= 1) { e.alive = false; e.escaped = true; }
  }
  for (let g = 0; g < 5; g++) {
    if (!ch.spawned.has(g) || ch.groupResolved[g]) continue;
    const group = challengeTargets.filter(e => e.group === g);
    if (group.length === 8 && group.every(e => !e.alive)) {
      ch.groupResolved[g] = true;
      if (ch.groupKills[g] === 8) { const bonus = challengeGroupBonus(ch.index); addScore(bonus, W / 2, 110 + g * 20, `GROUP +${bonus}`); }
    }
  }
  if (ch.spawned.size === 5 && challengeTargets.length === 40 && challengeTargets.every(e => !e.alive)) {
    if (ch.completeClock === null) {
      ch.completeClock = 2.6;
      if (ch.hits === 40) { addScore(10000, W / 2, H / 2, 'PERFECT +10000'); showCenter('PERFECT', '40 / 40. Josh acknowledges the accuracy.'); }
      else showCenter('CHALLENGING STAGE', `${ch.hits} / 40 HIT · ${Math.round((ch.hits / 40) * 100)}%`);
    } else {
      ch.completeClock -= dt;
      if (ch.completeClock <= 0) { state.stage += 1; state.challenge = null; hideCenter(); beginStage(); }
    }
  }
}

function challengeGroupBonus(index) { return index <= 2 ? 1000 : index <= 4 ? 1500 : index <= 6 ? 2000 : 3000; }

function spawnChallengeGroup(group, idx) {
  for (let i = 0; i < 8; i++) challengeTargets.push({ id: `c-${state.stage}-${group}-${i}`, group, index: i, type: i >= 6 && group === 4 ? 'boss' : group % 2 ? 'butterfly' : 'bee', x: -50, y: -50, t: -i * 0.075, duration: 2.55 + (group % 2) * 0.15, alive: true, escaped: false, angle: 0 });
}

function challengePath(e, t, idx) {
  const mirror = (e.group + idx) % 2 === 0 ? 1 : -1, lane = e.index - 3.5, variant = (e.group + idx - 1) % 5;
  if (variant === 0) return cubic({ x: mirror > 0 ? -55 : W + 55, y: 80 + e.index * 5 }, { x: W / 2 - mirror * 210, y: 70 }, { x: W / 2 + mirror * 120, y: 500 }, { x: mirror > 0 ? W + 60 : -60, y: 120 }, t);
  if (variant === 1) return { x: W / 2 + Math.sin(t * TAU * 1.5 + e.index * 0.22) * (180 + Math.abs(lane) * 9), y: -45 + t * (H + 90) };
  if (variant === 2) { const a = t * TAU * 1.35 + e.index * 0.09, radius = 190 * (1 - t * 0.25); return { x: W / 2 + Math.cos(a) * radius * mirror, y: 115 + t * 510 + Math.sin(a) * 95 }; }
  if (variant === 3) return { x: lerp(mirror > 0 ? -50 : W + 50, mirror > 0 ? W + 50 : -50, t), y: 120 + Math.sin(t * TAU * 2 + e.index * 0.28) * 180 + t * 260 };
  return cubic({ x: mirror > 0 ? -55 : W + 55, y: H * 0.45 }, { x: W / 2 - mirror * 200, y: 70 + lane * 8 }, { x: W / 2 + mirror * 200, y: H - 130 - lane * 7 }, { x: mirror > 0 ? W + 55 : -55, y: 90 }, t);
}
