'use strict';

// Fidelity/pacing layer loaded after stage/capture/combat and before rules.
// It preserves the existing collision/scoring systems while correcting the
// entrance choreography, bombing-run speed, and Boss Galaga tractor cadence.

function fidelityResetFormationPacing() {
  state.formationElapsed = 0;
  state.completedAttackRuns = 0;
  state.tractorCooldown = 11.5 + Math.random() * 3.5;
}

const fidelityBaseUpdateNormalStage = updateNormalStage;
updateNormalStage = function (dt) {
  const wasEntry = state.mode === 'entry';
  if (state.mode === 'formation') {
    state.formationElapsed = (state.formationElapsed || 0) + dt;
    state.tractorCooldown = Math.max(0, (state.tractorCooldown || 0) - dt);
  }
  fidelityBaseUpdateNormalStage(dt);
  if (wasEntry && state.mode === 'formation') {
    state.attackClock = 2.7;
    state.transformClock = 7.2;
    fidelityResetFormationPacing();
  }
};

updateEntry = function (dt) {
  state.entryClock += dt;
  const baseGap = state.entryPattern === 1 ? 2.35 : state.entryPattern === 2 ? 2.55 : 2.65;
  const groupGap = Math.max(2.05, baseGap - Math.min(0.45, (state.stage - 1) * 0.025));
  const elapsedGroup = Math.floor(state.entryClock / groupGap);

  for (const e of enemies) {
    if (!e.alive || e.state !== 'waiting' || e.entryGroup > elapsedGroup) continue;
    e.state = 'entering';
    const stagger = state.entryPattern === 1 ? 0.16 : state.entryPattern === 2 ? 0.145 : 0.19;
    e.entryT = -e.entryIndex * stagger;
    e.shotMarks.clear();
  }

  if (enemies.every(e => !e.alive || e.state === 'formation')) {
    state.mode = 'formation';
    state.attackClock = 2.7;
    state.transformClock = 7.2;
    fidelityResetFormationPacing();
  }
};

const fidelityBaseUpdateEnemies = updateEnemies;
updateEnemies = function (dt) {
  const entryScale = Math.max(0.58, 0.64 - Math.min(0.06, (state.stage - 1) * 0.003));
  fidelityBaseUpdateEnemies(state.mode === 'entry' ? dt * entryScale : dt);
};

entryPath = function (e, t) {
  const slot = formationSlot(e);
  const g = e.entryGroup;
  const i = e.entryIndex;

  if (state.entryPattern === 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const lane = Math.floor(i / 2);
    const start = { x: side < 0 ? -52 : W + 52, y: 104 + lane * 7 };
    const cross = { x: W / 2 - side * 54, y: 248 + lane * 3 };
    if (t < 0.57) {
      return cubic(start,
        { x: start.x - side * 235, y: 92 + lane * 5 },
        { x: W / 2 + side * 145, y: 175 + lane * 7 },
        cross,
        t / 0.57);
    }
    return cubic(cross,
      { x: W / 2 + side * 155, y: 315 },
      { x: slot.x - side * 120, y: slot.y - 96 },
      slot,
      (t - 0.57) / 0.43);
  }

  if (state.entryPattern === 2) {
    const side = g % 2 === 0 ? -1 : 1;
    const pair = Math.floor(i / 2);
    const offset = i % 2 === 0 ? -15 : 15;
    const start = { x: side < 0 ? -55 : W + 55, y: 108 + pair * 8 + offset };
    const turn = { x: W / 2 + side * 38 + offset, y: 278 + pair * 3 };
    if (t < 0.60) {
      return cubic(start,
        { x: start.x - side * 270, y: 88 + offset },
        { x: W / 2 - side * 165, y: 205 + offset },
        turn,
        t / 0.60);
    }
    return cubic(turn,
      { x: W / 2 + side * 205, y: 250 },
      { x: slot.x - side * 105, y: slot.y - 92 },
      slot,
      (t - 0.60) / 0.40);
  }

  const side = g % 2 === 0 ? -1 : 1;
  const start = { x: side < 0 ? -55 : W + 55, y: 104 };
  const turn = { x: W / 2 - side * 62, y: 288 };
  if (t < 0.63) {
    return cubic(start,
      { x: start.x - side * 285, y: 85 },
      { x: W / 2 + side * 145, y: 208 },
      turn,
      t / 0.63);
  }
  return cubic(turn,
    { x: W / 2 + side * 225, y: 238 },
    { x: slot.x - side * 115, y: slot.y - 84 },
    slot,
    (t - 0.63) / 0.37);
};

function fidelityCanTractor(boss, livingCount) {
  if (!boss || boss.capturedFighter || player.dual || player.capture || player.hidden || state.rescue) return false;
  if (livingCount < 8) return false;
  if ((state.formationElapsed || 0) < (state.stage === 1 ? 12 : 9.5)) return false;
  if ((state.completedAttackRuns || 0) < 3) return false;
  if ((state.tractorCooldown || 0) > 0) return false;
  return boss.nextBossAction === 'tractor';
}

scheduleAttack = function () {
  if (state.mode !== 'formation' || player.hidden || player.capture) {
    state.attackClock = 0.75;
    return;
  }

  const maxGroups = state.stage < 7 ? 1 : state.stage < 15 ? 2 : 3;
  if (state.activeAttackGroups.size >= maxGroups) {
    state.attackClock = 0.75;
    return;
  }

  const living = enemies.filter(e => e.alive && e.state === 'formation');
  if (!living.length) {
    state.attackClock = 0.75;
    return;
  }

  const capturedBoss = living.find(e => e.type === 'boss' && e.capturedFighter);
  if (capturedBoss && Math.random() < 0.34) {
    launchBossAttack(capturedBoss, true);
    state.completedAttackRuns = (state.completedAttackRuns || 0) + 1;
    setNextAttackClock(0.8);
    return;
  }

  const bosses = living.filter(e => e.type === 'boss');
  if (bosses.length && Math.random() < 0.24) {
    const boss = bosses[Math.floor(Math.random() * bosses.length)];
    boss.nextBossAction ||= 'dive';

    if (fidelityCanTractor(boss, living.length)) {
      launchTractor(boss);
      boss.nextBossAction = 'dive';
      state.tractorCooldown = 16 + Math.random() * 5;
      state.completedAttackRuns = (state.completedAttackRuns || 0) + 1;
      setNextAttackClock(2.0);
      return;
    }

    launchBossAttack(boss, false);
    if (!player.dual && !boss.capturedFighter) boss.nextBossAction = 'tractor';
    state.completedAttackRuns = (state.completedAttackRuns || 0) + 1;
    setNextAttackClock(0.6);
    return;
  }

  const butterflies = living.filter(e => e.type === 'butterfly');
  const bees = living.filter(e => e.type === 'bee');
  const pool = Math.random() < 0.46 && butterflies.length ? butterflies : bees.length ? bees : butterflies;
  if (pool.length) {
    launchSoloAttack(pool[Math.floor(Math.random() * pool.length)]);
    state.completedAttackRuns = (state.completedAttackRuns || 0) + 1;
  }
  setNextAttackClock();
};

setNextAttackClock = function (extra = 0) {
  const base = Math.max(2.0, 3.65 - Math.min(1.45, (state.stage - 1) * 0.07));
  state.attackClock = base + Math.random() * 1.05 + extra;
};

const fidelityBaseLaunchSoloAttack = launchSoloAttack;
launchSoloAttack = function (e) {
  fidelityBaseLaunchSoloAttack(e);
  e.attackDuration *= 1.38;
};

const fidelityBaseLaunchBossAttack = launchBossAttack;
launchBossAttack = function (boss, carrying) {
  fidelityBaseLaunchBossAttack(boss, carrying);
  boss.attackDuration *= 1.40;
  for (const e of enemies) {
    if (e.alive && e.attackGroup === boss.attackGroup && e !== boss) e.attackDuration = boss.attackDuration;
  }
};

const fidelityBaseUpdateReturning = updateReturning;
updateReturning = function (e, dt) {
  fidelityBaseUpdateReturning(e, dt * 0.67);
};

launchTractor = function (boss) {
  const groupId = `attack-${++state.attackGroupSeq}`;
  const slot = formationSlot(boss);
  state.activeAttackGroups.add(groupId);
  boss.state = 'tractor';
  boss.attackGroup = groupId;
  boss.tractor = {
    phase: 'loop',
    t: 0,
    originX: slot.x,
    originY: slot.y,
    hoverX: clamp(slot.x + (slot.x < W / 2 ? 34 : -34), 190, W - 190),
    beamClock: 0,
    captureStarted: false
  };
  boss.shotMarks.clear();
};

updateTractorBoss = function (e, dt) {
  const tr = e.tractor;
  if (!tr) return;
  tr.t += dt;

  if (tr.phase === 'loop') {
    const t = clamp(tr.t / 1.15, 0, 1);
    const a = -Math.PI / 2 + t * TAU;
    e.x = tr.originX + Math.cos(a) * 70;
    e.y = tr.originY + 20 + Math.sin(a) * 42;
    e.angle = a + Math.PI / 2;
    if (t >= 1) {
      tr.phase = 'descend';
      tr.t = 0;
      tr.descendStart = { x: e.x, y: e.y };
    }
    return;
  }

  if (tr.phase === 'descend') {
    const t = clamp(tr.t / 2.15, 0, 1);
    const start = tr.descendStart || { x: tr.originX, y: tr.originY };
    const hover = { x: tr.hoverX, y: H * 0.46 };
    const path = q => cubic(start,
      { x: start.x + (start.x < W / 2 ? -90 : 90), y: start.y + 75 },
      { x: hover.x, y: hover.y - 110 },
      hover,
      q);
    const p = path(t);
    const tan = pathTangent(path, t);
    e.x = p.x;
    e.y = p.y;
    e.angle = Math.atan2(tan.y, tan.x) + Math.PI / 2;
    if (t >= 1) {
      tr.phase = 'beam';
      tr.t = 0;
      tr.beamClock = 0;
      e.angle = Math.PI;
      sfx('beam');
    }
    return;
  }

  if (tr.phase === 'beam') {
    tr.beamClock += dt;
    e.angle = Math.PI;
    if (tr.beamClock >= 0.32 && !player.hidden && !player.capture && !player.dual && Math.abs(player.x - e.x) < beamHalfWidthAtPlayer(e)) {
      startCapture(e);
      tr.captureStarted = true;
      tr.phase = 'capturing';
      tr.t = 0;
      return;
    }
    if (tr.beamClock >= 2.35) {
      tr.phase = 'return';
      tr.t = 0;
    }
    return;
  }

  if (tr.phase === 'capturing') {
    if (!player.capture) {
      tr.phase = 'return';
      tr.t = 0;
    }
    return;
  }

  if (tr.phase === 'return') {
    tr.t += dt;
    const t = clamp(tr.t / 1.8, 0, 1);
    const slot = formationSlot(e);
    tr.returnStart ||= { x: e.x, y: e.y };
    const p = cubic(tr.returnStart,
      { x: tr.returnStart.x, y: 110 },
      { x: slot.x, y: slot.y - 78 },
      slot,
      smooth(t));
    e.x = p.x;
    e.y = p.y;
    e.angle = Math.PI;
    if (t >= 1) {
      e.state = 'formation';
      e.tractor = null;
      finishAttackGroupIfDone(e.attackGroup);
      e.attackGroup = null;
    }
  }
};

beamHalfWidthAtPlayer = function (e) {
  return 18 + Math.max(1, player.y - e.y) * 0.115;
};
