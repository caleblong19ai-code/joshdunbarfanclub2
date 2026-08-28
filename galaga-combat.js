function handleCollisions() {
  for (const s of playerShots) {
    if (!s.alive) continue;
    let hit = false;
    if (state.mode === 'challenge') {
      for (const e of challengeTargets) {
        if (!e.alive || e.t < 0) continue;
        if (pointHit(s.x, s.y, e.x, e.y, 20)) {
          s.alive = false; e.alive = false; state.hits += 1; state.stageHits += 1;
          state.challenge.hits += 1; state.challenge.groupKills[e.group] += 1;
          addScore(100, e.x, e.y, '+100'); explode(e.x, e.y, 14); sfx('hit'); hit = true; break;
        }
      }
      if (hit) continue;
    }
    for (const tr of transforms) {
      if (!tr.alive || tr.t < 0) continue;
      if (pointHit(s.x, s.y, tr.x, tr.y, 18)) {
        s.alive = false; tr.alive = false; state.hits += 1; state.stageHits += 1;
        addScore(160, tr.x, tr.y, '+160'); explode(tr.x, tr.y, 13); checkTransformTrioBonus(tr.trioId, tr.groupBonus); hit = true; break;
      }
    }
    if (hit) continue;
    if (state.rogueCaptured && state.rogueCaptured.alive && pointHit(s.x, s.y, state.rogueCaptured.x, state.rogueCaptured.y, 19)) {
      s.alive = false; state.rogueCaptured.alive = false; state.hits += 1; state.stageHits += 1;
      addScore(1000, state.rogueCaptured.x, state.rogueCaptured.y, '+1000'); explode(state.rogueCaptured.x, state.rogueCaptured.y, 18); continue;
    }
    for (const e of enemies) {
      if (!e.alive || e.state === 'waiting') continue;
      if (e.capturedFighter) {
        const cp = capturedPosition(e);
        if (pointHit(s.x, s.y, cp.x, cp.y, 18)) {
          s.alive = false; e.capturedFighter = false; e.carrierState = null; state.hits += 1; state.stageHits += 1;
          const airborne = ['diving', 'tractor', 'returning'].includes(e.state);
          addScore(airborne ? 1000 : 500, cp.x, cp.y, airborne ? '+1000' : '+500'); explode(cp.x, cp.y, 16); showMessage('CAPTURED BEAN LOST'); hit = true; break;
        }
      }
      if (!pointHit(s.x, s.y, e.x, e.y, enemyRadius(e))) continue;
      s.alive = false; state.hits += 1; state.stageHits += 1; hitEnemy(e); hit = true; break;
    }
  }

  if (!player.hidden && !player.capture && player.invuln <= 0 && !isChallengeStage(state.stage)) {
    for (const s of enemyShots) {
      if (!s.alive) continue;
      if (playerPointHit(s.x, s.y)) { s.alive = false; hitPlayer(); break; }
    }
  }

  if (!player.hidden && !player.capture && player.invuln <= 0 && !isChallengeStage(state.stage)) {
    for (const e of enemies) {
      if (!e.alive || e.state !== 'diving') continue;
      if (dist2(e.x, e.y, player.x, player.y) < (enemyRadius(e) + (player.dual ? 31 : 20)) ** 2) {
        e.alive = false; explode(e.x, e.y, 18); finishAttackGroupIfDone(e.attackGroup); hitPlayer(); break;
      }
    }
    const r = state.rogueCaptured;
    if (r && r.alive && dist2(r.x, r.y, player.x, player.y) < (18 + (player.dual ? 31 : 20)) ** 2) { r.alive = false; hitPlayer(); }
  }
}

function hitEnemy(e) {
  if (e.type === 'boss' && e.hp > 1) {
    e.hp -= 1; e.damaged = true; addScore(0, e.x, e.y, 'HIT'); spark(e.x, e.y); sfx('bossHit'); return;
  }
  const airborne = ['entering', 'diving', 'tractor', 'returning'].includes(e.state);
  const groupId = e.attackGroup, carrying = e.capturedFighter;
  const rescue = e.type === 'boss' && carrying && e.state === 'diving';
  const rogue = e.type === 'boss' && carrying && e.state === 'formation';
  const points = scoreEnemy(e, airborne);
  e.alive = false; explode(e.x, e.y, e.type === 'boss' ? 24 : 15); addScore(points, e.x, e.y, `+${points}`); sfx(e.type === 'boss' ? 'bossKill' : 'hit');
  if (rescue) rescueCapturedFighter(e); else if (rogue) releaseRogueCapturedFighter(e);
  finishAttackGroupIfDone(groupId);
}

function scoreEnemy(e, airborne) {
  if (e.type === 'bee') return airborne ? 100 : 50;
  if (e.type === 'butterfly') return airborne ? 160 : 80;
  if (!airborne) return 150;
  const escorts = e.bossEscortCount || 0;
  return escorts >= 2 ? 1600 : escorts === 1 ? 800 : 400;
}

function releaseRogueCapturedFighter(boss) {
  const cp = capturedPosition(boss);
  boss.capturedFighter = false;
  state.rogueCaptured = { alive: true, x: cp.x, y: cp.y, start: { x: cp.x, y: cp.y }, targetX: player.x, t: 0, side: cp.x < W / 2 ? -1 : 1, angle: Math.PI };
  showTransient('CAPTURED FIGHTER TURNED HOSTILE', 'Destroying the carrier in formation does not rescue Bean.');
}

function rescueCapturedFighter(boss) {
  const cp = capturedPosition(boss);
  boss.capturedFighter = false; state.rescue = { x: cp.x, y: cp.y, t: 0, phase: 'spin' }; enemyShots.length = 0;
  for (const e of enemies) {
    if (!e.alive || e === boss) continue;
    if (['diving', 'tractor'].includes(e.state)) {
      e.state = 'returning'; e.returnT = 0; e.tractor = null; e.y = -46; e.returnStartX = wrapX(e.x); e.x = e.returnStartX;
    }
  }
  state.activeAttackGroups.clear(); state.attackClock = 2.4; showTransient('FIGHTER RESCUED', 'Dual Bean incoming.'); sfx('rescue');
}

function updateRescue(dt) {
  const r = state.rescue;
  if (!r) return;
  r.t += dt;
  if (r.phase === 'spin') { if (r.t >= 1.15) { r.phase = 'join'; r.t = 0; } return; }
  const t = clamp(r.t / 0.85, 0, 1);
  r.x = lerp(r.x, player.x + 18, t); r.y = lerp(r.y, player.y, t);
  if (t >= 1) { player.dual = true; player.invuln = 1.3; state.rescue = null; showMessage('DUAL BEAN'); }
}

function hitPlayer() {
  if (player.invuln > 0 || player.hidden || player.capture) return;
  if (player.dual) {
    player.dual = false; player.invuln = 1.8; explode(player.x + 20, player.y, 22); enemyShots.length = 0; showMessage('DUAL BEAN DAMAGED'); sfx('death'); return;
  }
  explode(player.x, player.y, 28); sfx('death'); player.hidden = true; enemyShots.length = 0;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (['diving', 'tractor'].includes(e.state)) {
      e.state = 'returning'; e.returnT = 0; e.tractor = null; e.y = -46; e.returnStartX = wrapX(e.x); e.x = e.returnStartX;
    }
  }
  state.activeAttackGroups.clear();
  if (player.reserves > 0) {
    player.reserves -= 1; player.respawnClock = 1.55; state.mode = 'lifeLost';
    showTransient('BEAN DOWN', `${player.reserves + 1} fighter${player.reserves === 0 ? '' : 's'} remaining.`);
  } else gameOver('All Beans have been neutralized.');
}

function gameOver(reason) {
  state.mode = 'gameOver'; player.hidden = true;
  const ratio = state.shotsFired ? Math.round((state.hits / state.shotsFired) * 100) : 0;
  showCenter('GAME OVER', `${reason} · Shots ${state.shotsFired} · Hits ${state.hits} · ${ratio}% accuracy · Press Space to redeploy.`);
  if (state.score > state.high) { state.high = state.score; localStorage.setItem('beanGalagaHigh', String(state.high)); }
  updateHud();
}

function finishNormalStage() {
  state.mode = 'stageClear'; state.stageClearClock = 2.0; enemyShots.length = 0;
  const ratio = state.stageShots ? Math.round((state.stageHits / state.stageShots) * 100) : 0;
  showCenter('STAGE CLEAR', `${state.stageHits} hits · ${ratio}% stage accuracy`); sfx('clear');
}

function normalStageComplete() {
  return !enemies.some(e => e.alive) && !transforms.some(e => e.alive) && !(state.rogueCaptured && state.rogueCaptured.alive) && !state.rescue;
}

function checkTransformTrioBonus(trioId, bonus) {
  const trio = transforms.filter(t => t.trioId === trioId);
  if (trio.length === 3 && trio.every(t => !t.alive && !t.escaped) && !trio[0].bonusPaid) {
    trio.forEach(t => t.bonusPaid = true); addScore(bonus, W / 2, H * 0.45, `TRIO +${bonus}`);
  }
}

function addScore(points, x, y, label) {
  state.score += points;
  if (state.score > state.high) { state.high = state.score; localStorage.setItem('beanGalagaHigh', String(state.high)); }
  if (label) floaters.push({ x, y, text: label, life: 0.9, max: 0.9 });
  while (state.score >= state.nextExtra) {
    player.reserves += 1; showMessage('BONUS BEAN'); sfx('extra');
    if (state.nextExtra === 20000) state.nextExtra = 70000; else state.nextExtra += state.bonusStep;
  }
}

function cleanup() { trimDead(playerShots); trimDead(enemyShots); }
function trimDead(arr) { for (let i = arr.length - 1; i >= 0; i--) if (!arr[i].alive) arr.splice(i, 1); }

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 28 * dt;
  }
}

function updateFloaters(dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]; f.life -= dt; f.y -= 25 * dt; if (f.life <= 0) floaters.splice(i, 1);
  }
}

function explode(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, sp = 45 + Math.random() * 150;
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35 + Math.random() * 0.55, max: 0.9 });
  }
}

function spark(x, y) {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * TAU;
    particles.push({ x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.28, max: 0.28 });
  }
}
