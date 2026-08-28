'use strict';

// Final fidelity layer: cabinet-style rapid fire, boss mourning pause,
// alternate rear-loop bombing runs, transform fallback, and challenge payouts.

state.mourningClock = 0;
keys.fire = false;

const baseInitControls = initControls;
initControls = function () {
  baseInitControls();

  addEventListener('keydown', e => {
    if (e.code === 'Space') keys.fire = true;
  });
  addEventListener('keyup', e => {
    if (e.code === 'Space') keys.fire = false;
  });

  const fireButton = document.querySelector('[data-control="fire"]');
  if (fireButton) {
    const down = e => { e.preventDefault(); keys.fire = true; };
    const up = e => { e.preventDefault(); keys.fire = false; };
    fireButton.addEventListener('pointerdown', down);
    fireButton.addEventListener('pointerup', up);
    fireButton.addEventListener('pointercancel', up);
    fireButton.addEventListener('pointerleave', up);
  }
};

const baseUpdatePlayer = updatePlayer;
updatePlayer = function (dt) {
  baseUpdatePlayer(dt);
  if (keys.fire && canControl()) firePlayer();
};

const baseUpdate = update;
update = function (dt) {
  if (!state.paused && state.mourningClock > 0) state.mourningClock = Math.max(0, state.mourningClock - dt);
  baseUpdate(dt);
};

const baseFireEnemy = fireEnemy;
fireEnemy = function (enemy, kind, tangent) {
  if (state.mourningClock > 0) return;
  return baseFireEnemy(enemy, kind, tangent);
};

const baseHitEnemy = hitEnemy;
hitEnemy = function (enemy) {
  const willKillBoss = enemy.type === 'boss' && enemy.hp <= 1;
  baseHitEnemy(enemy);
  if (willKillBoss && !enemy.alive) {
    // After a Boss Galaga dies, the formation briefly stops firing while
    // attackers already in motion continue their runs.
    state.mourningClock = Math.max(state.mourningClock, 0.72);
    enemyShots.length = 0;
  }
};

const baseLaunchSoloAttack = launchSoloAttack;
launchSoloAttack = function (enemy) {
  baseLaunchSoloAttack(enemy);
  if (enemy.type === 'bee' && state.stage >= 2 && Math.random() < Math.min(0.46, 0.22 + state.stage * 0.012)) {
    enemy.attackVariant = 'rearLoop';
  } else {
    enemy.attackVariant = 'standard';
  }
};

const baseDivePath = divePath;
divePath = function (enemy, t) {
  if (enemy.type !== 'bee' || enemy.attackVariant !== 'rearLoop') return baseDivePath(enemy, t);

  const start = formationSlot(enemy);
  const side = start.x < W / 2 ? -1 : 1;
  const targetX = clamp(enemy.attackTargetX ?? player.x, 90, W - 90);

  if (t < 0.60) {
    return cubic(
      start,
      { x: start.x + side * 120, y: start.y + 120 },
      { x: targetX - side * 95, y: H * 0.70 },
      { x: targetX, y: H - 32 },
      t / 0.60
    );
  }

  if (t < 0.82) {
    return cubic(
      { x: targetX, y: H - 32 },
      { x: targetX + side * 165, y: H + 30 },
      { x: targetX + side * 185, y: H - 185 },
      { x: targetX + side * 72, y: H - 205 },
      (t - 0.60) / 0.22
    );
  }

  return cubic(
    { x: targetX + side * 72, y: H - 205 },
    { x: targetX - side * 105, y: H - 185 },
    { x: targetX - side * 120, y: H - 30 },
    { x: targetX - side * 70, y: H + 55 },
    (t - 0.82) / 0.18
  );
};

tryStartTransform = function () {
  const source = enemies.find(e => e.alive && e.state === 'formation' && e.type === 'bee' && !e.capturedFighter)
    || enemies.find(e => e.alive && e.state === 'formation' && e.type === 'butterfly' && !e.capturedFighter);

  if (!source) {
    state.transformUsed = true;
    return;
  }

  state.transformUsed = true;
  source.alive = false;
  const info = transformInfoForStage(state.stage);
  const trioId = `trio-${state.stage}-${Date.now()}`;

  for (let i = 0; i < 3; i++) {
    transforms.push({
      id: `${trioId}-${i}`,
      trioId,
      kind: info.kind,
      groupBonus: info.bonus,
      x: source.x,
      y: source.y,
      startX: source.x,
      startY: source.y,
      index: i,
      t: -i * 0.09,
      alive: true,
      escaped: false,
      angle: 0
    });
  }

  showMessage(`${info.label.toUpperCase()} TRANSFORM`);
};

transformInfoForStage = function (stage) {
  return [
    { kind: 'scorpion', label: 'Scorpion', bonus: 1000 },
    { kind: 'stingray', label: 'Bosconian Spy Ship', bonus: 2000 },
    { kind: 'flagship', label: 'Galaxian Flagship', bonus: 3000 }
  ][Math.floor((stage - 4) / 4) % 3];
};

// The original challenge tally awards 100 x hits for an imperfect round,
// but substitutes the 10,000-point PERFECT award when all 40 are destroyed.
const baseAddScore = addScore;
addScore = function (points, x, y, label) {
  const challengeHit = state.mode === 'challenge' && points === 100 && label === '+100';
  if (challengeHit && state.challenge) {
    state.challenge.deferredHitScore = (state.challenge.deferredHitScore || 0) + 100;
    floaters.push({ x, y, text: '+100', life: 0.9, max: 0.9 });
    return;
  }
  return baseAddScore(points, x, y, label);
};

const baseUpdateChallenge = updateChallenge;
updateChallenge = function (dt) {
  const challenge = state.challenge;
  const before = challenge ? challenge.completeClock : undefined;
  baseUpdateChallenge(dt);

  if (!challenge || challenge.scoreFinalized || before !== null || challenge.completeClock === null) return;

  challenge.scoreFinalized = true;
  if (challenge.hits < 40) {
    const points = challenge.deferredHitScore || challenge.hits * 100;
    if (points) baseAddScore(points, W / 2, H * 0.55, `HITS +${points}`);
  }
};
