'use strict';

// V7 difficulty layer. Preserve V6's slower arcade choreography, but remove
// the long safe windows created by one-at-a-time attack groups and a two-shot
// global enemy cap. Difficulty comes from overlapping bombing runs and timing,
// not bullet-hell volume.

function balanceMaxGroups() {
  if (state.stage === 1) return 2;
  if (state.stage <= 5) return 2;
  if (state.stage <= 10) return 3;
  return 4;
}

function balanceMaxActiveDivers() {
  if (state.stage === 1) return 2;
  if (state.stage <= 4) return 3;
  if (state.stage <= 9) return 4;
  return 5;
}

setNextAttackClock = function (extra = 0) {
  // A new decision roughly every 1.35-2.05 s on Stage 1. The active-group
  // limits below prevent this from becoming a stream of simultaneous attacks.
  const base = Math.max(0.95, 1.45 - Math.min(0.50, (state.stage - 1) * 0.035));
  state.attackClock = base + Math.random() * 0.60 + extra;
};

enemyShotCap = function () {
  if (state.stage <= 2) return 3;
  if (state.stage <= 7) return 4;
  if (state.stage <= 14) return 5;
  return 6;
};

scheduleAttack = function () {
  if (state.mode !== 'formation' || player.hidden || player.capture) {
    state.attackClock = 0.55;
    return;
  }

  const activeDivers = enemies.filter(e => e.alive && ['diving', 'tractor'].includes(e.state)).length;
  if (state.activeAttackGroups.size >= balanceMaxGroups() || activeDivers >= balanceMaxActiveDivers()) {
    state.attackClock = 0.42;
    return;
  }

  const living = enemies.filter(e => e.alive && e.state === 'formation');
  if (!living.length) {
    state.attackClock = 0.55;
    return;
  }

  const capturedBoss = living.find(e => e.type === 'boss' && e.capturedFighter);
  if (capturedBoss && Math.random() < 0.38) {
    launchBossAttack(capturedBoss, true);
    state.completedAttackRuns = (state.completedAttackRuns || 0) + 1;
    setNextAttackClock(0.45);
    return;
  }

  const bosses = living.filter(e => e.type === 'boss');
  if (bosses.length && Math.random() < 0.27) {
    const boss = bosses[Math.floor(Math.random() * bosses.length)];
    boss.nextBossAction ||= 'dive';

    if (typeof fidelityCanTractor === 'function' && fidelityCanTractor(boss, living.length)) {
      launchTractor(boss);
      boss.nextBossAction = 'dive';
      state.tractorCooldown = 16 + Math.random() * 5;
      state.completedAttackRuns = (state.completedAttackRuns || 0) + 1;
      setNextAttackClock(1.6);
      return;
    }

    launchBossAttack(boss, false);
    if (!player.dual && !boss.capturedFighter) boss.nextBossAction = 'tractor';
    state.completedAttackRuns = (state.completedAttackRuns || 0) + 1;
    setNextAttackClock(0.25);
    return;
  }

  const butterflies = living.filter(e => e.type === 'butterfly');
  const bees = living.filter(e => e.type === 'bee');
  const captured = living.filter(e => e.type === 'captured');

  let pool;
  const roll = Math.random();
  if (captured.length && roll < 0.14) pool = captured;
  else if (butterflies.length && roll < 0.49) pool = butterflies;
  else pool = bees.length ? bees : butterflies.length ? butterflies : captured;

  if (pool.length) {
    launchSoloAttack(pool[Math.floor(Math.random() * pool.length)]);
    state.completedAttackRuns = (state.completedAttackRuns || 0) + 1;
  }
  setNextAttackClock();
};

// Slight predictive aim at attack launch. The enemy still commits to a curved
// bombing path; it does not continuously home onto the player.
const balanceBaseLaunchSoloAttack = launchSoloAttack;
launchSoloAttack = function (enemy) {
  balanceBaseLaunchSoloAttack(enemy);
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  enemy.attackTargetX = clamp(player.x + dir * 62, 76, W - 76);
};

const balanceBaseLaunchBossAttack = launchBossAttack;
launchBossAttack = function (boss, carrying) {
  balanceBaseLaunchBossAttack(boss, carrying);
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const target = clamp(player.x + dir * 48, 82, W - 82);
  boss.attackTargetX = target;
  for (const e of enemies) {
    if (e.alive && e.attackGroup === boss.attackGroup && e !== boss) e.attackTargetX = target;
  }
};

// During only the first third of a dive, attackers may bend their committed
// target a little toward the player's current lane. After that the trajectory
// is fixed. This is intentionally mild and does not affect fired projectiles.
const balanceBaseUpdateDiver = updateDiver;
updateDiver = function (enemy, dt) {
  if (enemy.state === 'diving' && enemy.attackT >= 0 && enemy.attackT < 0.32) {
    const maxTrack = enemy.type === 'boss' ? 68 : enemy.type === 'butterfly' ? 54 : 42;
    const desired = clamp(player.x, (enemy.attackTargetX || player.x) - maxTrack, (enemy.attackTargetX || player.x) + maxTrack);
    enemy.attackTargetX = lerp(enemy.attackTargetX ?? player.x, desired, Math.min(1, dt * 1.6));
  }

  const beforeT = enemy.attackT;
  balanceBaseUpdateDiver(enemy, dt);

  // Boss runs in Galaga are threatening partly because the leader remains a
  // firing threat during the dive. Give Bosses an earlier second opportunity,
  // still subject to the global enemy-shot cap.
  if (enemy.alive && enemy.state === 'diving' && enemy.type === 'boss' && state.stage >= 1) {
    const mark = 0.30;
    if (beforeT < mark && enemy.attackT >= mark && !enemy.shotMarks.has('bossEarly')) {
      enemy.shotMarks.add('bossEarly');
      const t = clamp(enemy.attackT, 0, 1);
      const tan = pathTangent(q => divePath(enemy, q), t);
      fireEnemy(enemy, 'dive', tan);
    }
  }
};

// Keep every missile ballistic after launch, but make them a little less
// trivial to outrun laterally. The original firing function still owns aim and
// the global cap; we only scale the newly-created projectile velocity.
const balanceBaseFireEnemy = fireEnemy;
fireEnemy = function (enemy, kind, tangent) {
  const before = enemyShots.length;
  balanceBaseFireEnemy(enemy, kind, tangent);
  if (enemyShots.length > before) {
    const scale = state.stage <= 2 ? 1.16 : state.stage <= 7 ? 1.20 : 1.24;
    for (let i = before; i < enemyShots.length; i++) {
      enemyShots[i].vx *= scale;
      enemyShots[i].vy *= scale;
    }
  }
};
