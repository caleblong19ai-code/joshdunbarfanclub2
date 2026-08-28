function updateNormalStage(dt) {
  if (state.mode === 'entry') updateEntry(dt);
  updateEnemies(dt);
  updateTransforms(dt);
  updateRogueCaptured(dt);
  if (state.mode === 'formation') {
    state.attackClock -= dt;
    state.transformClock -= dt;
    if (state.stage >= 4 && !state.transformUsed && state.transformClock <= 0 && state.activeAttackGroups.size === 0) tryStartTransform();
    if (state.attackClock <= 0) scheduleAttack();
  }
  if (state.mode !== 'stageClear' && normalStageComplete()) finishNormalStage();
}

function updateEntry(dt) {
  state.entryClock += dt;
  const groupGap = state.entryPattern === 1 ? 1.28 : 1.42;
  const elapsedGroup = Math.floor(state.entryClock / groupGap);
  for (const e of enemies) {
    if (!e.alive || e.state !== 'waiting' || e.entryGroup > elapsedGroup) continue;
    e.state = 'entering';
    e.entryT = -e.entryIndex * (state.entryPattern === 3 ? 0.075 : 0.105);
    e.shotMarks.clear();
  }
  if (enemies.every(e => !e.alive || e.state === 'formation')) {
    state.mode = 'formation';
    state.attackClock = 1.25;
    state.transformClock = 4.8;
  }
}

function updateEnemies(dt) {
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.state === 'entering') {
      e.entryT += dt / (1.95 - Math.min(0.32, state.stage * 0.008));
      if (e.entryT < 0) continue;
      const t = clamp(e.entryT, 0, 1);
      const p = entryPath(e, t);
      const tan = pathTangent(q => entryPath(e, q), t);
      e.x = p.x; e.y = p.y; e.angle = Math.atan2(tan.y, tan.x) + Math.PI / 2;
      if (state.stage > 1) {
        if (e.entryIndex === 3 && t > 0.48 && !e.shotMarks.has('entryA')) { e.shotMarks.add('entryA'); fireEnemy(e, 'entry', tan); }
        if (state.stage >= 6 && e.entryIndex === 6 && t > 0.66 && !e.shotMarks.has('entryB')) { e.shotMarks.add('entryB'); fireEnemy(e, 'entry', tan); }
      }
      if (e.entryT >= 1) {
        e.state = 'formation';
        const slot = formationSlot(e);
        e.x = slot.x; e.y = slot.y; e.angle = Math.PI;
      }
      continue;
    }
    if (e.state === 'formation') {
      const slot = formationSlot(e);
      e.x = slot.x; e.y = slot.y; e.angle = Math.PI;
      continue;
    }
    if (e.state === 'diving') updateDiver(e, dt);
    else if (e.state === 'returning') updateReturning(e, dt);
    else if (e.state === 'tractor') updateTractorBoss(e, dt);
  }
}

function entryPath(e, t) {
  const slot = formationSlot(e), pattern = state.entryPattern, g = e.entryGroup, i = e.entryIndex;
  if (pattern === 1) {
    const side = i % 2 === 0 ? -1 : 1, lane = Math.floor(i / 2);
    const start = { x: side < 0 ? -55 : W + 55, y: 95 + lane * 9 };
    const p1 = { x: W / 2 - side * 235, y: 80 + lane * 10 };
    const p2 = { x: W / 2 + side * 115, y: 245 + lane * 6 };
    const p3 = { x: W / 2 + side * 48, y: 210 };
    if (t < 0.68) return cubic(start, p1, p2, p3, t / 0.68);
    return cubic(p3, { x: p3.x - side * 110, y: 115 }, { x: slot.x, y: slot.y - 70 }, slot, (t - 0.68) / 0.32);
  }
  if (pattern === 2) {
    const side = g % 2 === 0 ? -1 : 1, pairLane = Math.floor(i / 2), rowOffset = (i % 2) * 22 - 11;
    const start = { x: side < 0 ? -60 : W + 60, y: 115 + pairLane * 12 + rowOffset };
    const mid = { x: W / 2 + side * 80, y: 255 + pairLane * 4 + rowOffset };
    if (t < 0.58) return cubic(start, { x: W / 2 - side * 250, y: 80 }, { x: W / 2 - side * 60, y: 310 }, mid, t / 0.58);
    return cubic(mid, { x: W / 2 + side * 210, y: 155 }, { x: slot.x, y: slot.y - 80 }, slot, (t - 0.58) / 0.42);
  }
  const side = g % 2 === 0 ? -1 : 1;
  const start = { x: side < 0 ? -60 : W + 60, y: 92 + i * 5 };
  const mid = { x: W / 2 - side * 70, y: 270 + i * 3 };
  if (t < 0.62) return cubic(start, { x: W / 2 - side * 300, y: 70 }, { x: W / 2 + side * 100, y: 330 }, mid, t / 0.62);
  return cubic(mid, { x: W / 2 + side * 250, y: 120 }, { x: slot.x, y: slot.y - 60 }, slot, (t - 0.62) / 0.38);
}

function scheduleAttack() {
  if (state.mode !== 'formation' || player.hidden || player.capture) { state.attackClock = 0.6; return; }
  const maxGroups = state.stage < 4 ? 1 : state.stage < 12 ? 2 : 3;
  if (state.activeAttackGroups.size >= maxGroups) { state.attackClock = 0.5; return; }
  const living = enemies.filter(e => e.alive && e.state === 'formation');
  if (!living.length) { state.attackClock = 0.5; return; }
  const capturedBoss = living.find(e => e.type === 'boss' && e.capturedFighter);
  if (capturedBoss && Math.random() < 0.5) { launchBossAttack(capturedBoss, true); setNextAttackClock(); return; }
  const tractorCandidates = living.filter(e => e.type === 'boss' && !e.capturedFighter && e.hp > 0);
  if (!player.dual && !state.rescue && tractorCandidates.length && state.stageClock > 5 && Math.random() < tractorChance()) {
    launchTractor(tractorCandidates[Math.floor(Math.random() * tractorCandidates.length)]);
    setNextAttackClock(2.8); return;
  }
  const bosses = living.filter(e => e.type === 'boss');
  if (bosses.length && Math.random() < 0.28) { launchBossAttack(bosses[Math.floor(Math.random() * bosses.length)], false); setNextAttackClock(); return; }
  const butterflies = living.filter(e => e.type === 'butterfly'), bees = living.filter(e => e.type === 'bee');
  const pool = Math.random() < 0.48 && butterflies.length ? butterflies : bees.length ? bees : butterflies;
  if (pool.length) launchSoloAttack(pool[Math.floor(Math.random() * pool.length)]);
  setNextAttackClock();
}

function setNextAttackClock(extra = 0) {
  state.attackClock = Math.max(1.05, 2.45 - state.stage * 0.055) + Math.random() * 0.8 + extra;
}
function tractorChance() { return state.stage === 1 ? 0.22 : 0.13; }

function launchSoloAttack(e) {
  const groupId = `attack-${++state.attackGroupSeq}`;
  state.activeAttackGroups.add(groupId);
  e.state = 'diving'; e.attackGroup = groupId; e.attackT = 0;
  e.attackDuration = Math.max(2.25, 3.05 - state.stage * 0.025);
  e.attackRole = e.type; e.attackTargetX = player.x; e.shotMarks.clear();
}

function launchBossAttack(boss, carrying) {
  const groupId = `attack-${++state.attackGroupSeq}`;
  state.activeAttackGroups.add(groupId);
  let escorts = [];
  if (!carrying) {
    const available = enemies.filter(e => e.alive && e.state === 'formation' && e.type === 'butterfly');
    available.sort((a, b) => Math.abs(a.x - boss.x) - Math.abs(b.x - boss.x));
    const desired = state.stage < 2 ? (Math.random() < 0.5 ? 1 : 0) : Math.random() < 0.58 ? 2 : 1;
    escorts = available.slice(0, desired);
  }
  boss.state = 'diving'; boss.attackGroup = groupId; boss.attackT = 0;
  boss.attackDuration = Math.max(2.4, 3.2 - state.stage * 0.025);
  boss.attackRole = carrying ? 'carrierBoss' : 'boss'; boss.attackTargetX = player.x;
  boss.bossEscortCount = escorts.length; boss.shotMarks.clear();
  escorts.forEach((e, idx) => {
    e.state = 'diving'; e.attackGroup = groupId; e.attackT = -0.08 * (idx + 1);
    e.attackDuration = boss.attackDuration; e.attackRole = idx === 0 ? 'escortLeft' : 'escortRight';
    e.attackTargetX = boss.attackTargetX; e.shotMarks.clear();
  });
}

function launchTractor(boss) {
  const groupId = `attack-${++state.attackGroupSeq}`;
  state.activeAttackGroups.add(groupId);
  boss.state = 'tractor'; boss.attackGroup = groupId;
  boss.tractor = { phase: 'descend', t: 0, hoverX: clamp(player.x, 230, W - 230), beamClock: 0, captureStarted: false };
  boss.shotMarks.clear();
}

function updateDiver(e, dt) {
  e.attackT += dt / e.attackDuration;
  if (e.attackT < 0) return;
  const t = clamp(e.attackT, 0, 1), p = divePath(e, t), tan = pathTangent(q => divePath(e, q), t);
  e.x = p.x; e.y = p.y; e.angle = Math.atan2(tan.y, tan.x) + Math.PI / 2;
  const shotPoint = e.type === 'boss' ? 0.48 : e.type === 'butterfly' ? 0.56 : 0.62;
  if (t > shotPoint && !e.shotMarks.has('dive')) {
    e.shotMarks.add('dive');
    if (!e.attackRole.startsWith('escort') || e.attackRole === 'escortLeft') fireEnemy(e, 'dive', tan);
  }
  if (e.attackT >= 1) {
    e.state = 'returning'; e.returnT = 0; e.y = -46; e.x = wrapX(e.x); e.returnStartX = e.x;
  }
}

function divePath(e, t) {
  const start = formationSlot(e), side = start.x < W / 2 ? -1 : 1;
  const targetX = clamp((e.attackTargetX ?? player.x) + side * (e.type === 'butterfly' ? 50 : 15), 80, W - 80);
  if (e.attackRole === 'boss' || e.attackRole === 'carrierBoss') {
    return cubic(start, { x: start.x + side * 145, y: start.y + 75 }, { x: targetX - side * 80, y: H * 0.67 }, { x: targetX, y: H + 58 }, t);
  }
  if (e.attackRole.startsWith('escort')) {
    const leader = enemies.find(x => x.alive && x.attackGroup === e.attackGroup && x.type === 'boss');
    if (leader) {
      const bp = divePath({ ...leader, attackRole: 'boss' }, t), offset = e.attackRole === 'escortLeft' ? -34 : 34;
      return { x: bp.x + offset * (0.7 + 0.3 * Math.sin(t * Math.PI)), y: bp.y + 18 };
    }
  }
  if (e.type === 'butterfly') {
    const base = cubic(start, { x: start.x + side * 170, y: start.y + 90 }, { x: targetX - side * 140, y: H * 0.58 }, { x: targetX, y: H + 52 }, t);
    base.x += Math.sin(t * Math.PI * 5.2) * 28 * Math.sin(t * Math.PI);
    return base;
  }
  return cubic(start, { x: start.x + side * 110, y: start.y + 110 }, { x: targetX - side * 105, y: H * 0.64 }, { x: targetX + side * 55, y: H + 50 }, t);
}

function updateReturning(e, dt) {
  e.returnT += dt / 1.15;
  const t = clamp(e.returnT, 0, 1), slot = formationSlot(e), startX = e.returnStartX ?? e.x;
  const p = cubic({ x: startX, y: -45 }, { x: startX, y: 45 }, { x: slot.x, y: slot.y - 70 }, slot, smooth(t));
  e.x = p.x; e.y = p.y; e.angle = Math.PI;
  if (e.returnT >= 1) {
    e.state = 'formation'; finishAttackGroupIfDone(e.attackGroup); e.attackGroup = null; e.attackRole = 'solo'; e.bossEscortCount = 0;
  }
}

function finishAttackGroupIfDone(groupId) {
  if (!groupId) return;
  const active = enemies.some(e => e.alive && e.attackGroup === groupId && ['diving', 'returning', 'tractor'].includes(e.state));
  if (!active) state.activeAttackGroups.delete(groupId);
}
