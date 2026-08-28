function render() {
  ctx.clearRect(0, 0, W, H);
  drawBackground(); drawStageBadges(); drawEnemies(); drawTransforms(); drawChallengeTargets(); drawRogueCaptured(); drawRescue(); drawShots(); drawPlayer(); drawParticles(); drawFloaters(); drawMessage();
  if (state.paused) drawPause();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#02030b'); g.addColorStop(0.55, '#071022'); g.addColorStop(1, '#03050b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const s of stars) { ctx.globalAlpha = s.a; ctx.fillStyle = '#dce7ff'; ctx.fillRect(s.x, s.y, s.s, s.s); }
  ctx.globalAlpha = 1;
}

function drawStageBadges() {
  ctx.save(); ctx.globalAlpha = 0.55; ctx.font = '12px monospace'; ctx.textAlign = 'right'; ctx.fillStyle = '#9bb7ff'; ctx.fillText(`STAGE ${state.stage}`, W - 14, H - 15); ctx.restore();
}

function drawEnemies() {
  for (const e of enemies) {
    if (!e.alive || e.state === 'waiting' || (e.state === 'entering' && e.entryT < 0)) continue;
    drawEnemySprite(e.type, e.x, e.y, e.angle, e.damaged);
    if (e.capturedFighter) { const cp = capturedPosition(e); drawPlayerSprite(cp.x, cp.y, 0, true, 0.82); }
    if (e.state === 'tractor' && e.tractor?.phase === 'beam') drawTractorBeam(e);
  }
}

function drawTransforms() {
  for (const tr of transforms) {
    if (!tr.alive || tr.t < 0) continue;
    ctx.save(); ctx.translate(tr.x, tr.y); ctx.rotate(tr.angle); ctx.strokeStyle = '#ffe899';
    ctx.fillStyle = tr.kind === 'scorpion' ? '#d7a226' : tr.kind === 'stingray' ? '#5ecf8b' : '#ea6262'; ctx.lineWidth = 2;
    if (tr.kind === 'scorpion') {
      ctx.fillRect(-10, -8, 20, 16); ctx.beginPath(); ctx.arc(0, -13, 7, Math.PI, 0); ctx.stroke(); ctx.fillRect(-17, -3, 8, 6); ctx.fillRect(9, -3, 8, 6);
    } else if (tr.kind === 'stingray') {
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(22, 8); ctx.lineTo(0, 3); ctx.lineTo(-22, 8); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(18, 10); ctx.lineTo(0, 5); ctx.lineTo(-18, 10); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

function drawChallengeTargets() { for (const e of challengeTargets) if (e.alive && e.t >= 0) drawEnemySprite(e.type, e.x, e.y, e.angle, false); }
function drawRogueCaptured() { const r = state.rogueCaptured; if (r && r.alive) drawPlayerSprite(r.x, r.y, r.angle, true, 1); }
function drawRescue() { const r = state.rescue; if (r) drawPlayerSprite(r.x, r.y, r.phase === 'spin' ? state.clock * 10 : 0, false, 1); }

function drawPlayer() {
  if (player.hidden || (player.invuln > 0 && Math.floor(state.clock * 12) % 2 === 0)) return;
  if (player.dual) { drawPlayerSprite(player.x - 19, player.y, 0, false, 1); drawPlayerSprite(player.x + 19, player.y, 0, false, 1); }
  else drawPlayerSprite(player.x, player.y, 0, false, 1);
}

function drawEnemySprite(type, x, y, angle, damaged) {
  const img = images[type];
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  if (damaged) ctx.filter = 'sepia(1) saturate(3) hue-rotate(335deg)';
  if (img && img.complete && img.naturalWidth) {
    const size = type === 'boss' ? 44 : 38; ctx.drawImage(img, -size / 2, -size / 2, size, size);
  } else {
    ctx.fillStyle = type === 'boss' ? '#f3b94e' : type === 'butterfly' ? '#ef7186' : '#71c8ff';
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(15, 11); ctx.lineTo(0, 6); ctx.lineTo(-15, 11); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawPlayerSprite(x, y, angle, captured, alpha) {
  const img = images.player;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha = alpha;
  if (captured) ctx.filter = 'sepia(1) saturate(5) hue-rotate(315deg)';
  if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -21, -18, 42, 36);
  else { ctx.fillStyle = captured ? '#ff5d6c' : '#eaf1ff'; ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(18, 15); ctx.lineTo(0, 8); ctx.lineTo(-18, 15); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

function drawTractorBeam(e) {
  ctx.save();
  const pulse = 0.72 + Math.sin(state.clock * 12) * 0.18, bottomHalf = beamHalfWidthAtPlayer(e);
  const grad = ctx.createLinearGradient(0, e.y, 0, player.y + 30);
  grad.addColorStop(0, 'rgba(92,170,255,.7)'); grad.addColorStop(1, 'rgba(92,170,255,.08)');
  ctx.globalAlpha = pulse; ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(e.x - 13, e.y + 15); ctx.lineTo(e.x + 13, e.y + 15); ctx.lineTo(e.x + bottomHalf, player.y + 32); ctx.lineTo(e.x - bottomHalf, player.y + 32); ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawShots() {
  ctx.save();
  for (const s of playerShots) { ctx.fillStyle = '#f8fbff'; ctx.fillRect(s.x - 2, s.y - 9, 4, 14); ctx.fillStyle = '#75bfff'; ctx.fillRect(s.x - 1, s.y - 9, 2, 14); }
  for (const s of enemyShots) { ctx.fillStyle = '#ffcf58'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 4, 8, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  for (const p of particles) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = '#f7d783'; ctx.fillRect(p.x, p.y, 3, 3); }
  ctx.restore();
}

function drawFloaters() {
  ctx.save(); ctx.font = '700 15px monospace'; ctx.textAlign = 'center';
  for (const f of floaters) { ctx.globalAlpha = clamp(f.life / f.max, 0, 1); ctx.fillStyle = '#f4f6ff'; ctx.fillText(f.text, f.x, f.y); }
  ctx.restore();
}

function drawMessage() {
  if (state.messageClock <= 0 || !state.message) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, state.messageClock * 2); ctx.textAlign = 'center'; ctx.font = '800 22px monospace'; ctx.fillStyle = '#f6f7ff'; ctx.fillText(state.message, W / 2, 92); ctx.restore();
}

function drawPause() { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '800 38px monospace'; ctx.fillText('PAUSED', W / 2, H / 2); ctx.restore(); }

function updateHud() {
  ui.score.textContent = fmt(state.score); ui.high.textContent = fmt(Math.max(state.high, state.score)); ui.stage.textContent = String(state.stage);
  const activeUnits = player.hidden ? 0 : player.dual ? 2 : 1;
  ui.lives.textContent = `BEAN × ${activeUnits + player.reserves}` + (player.dual ? ' · DUAL' : '');
}

function showCenter(title, text) { ui.centerTitle.textContent = title; ui.centerText.textContent = text; ui.center.hidden = false; }
function showTransient(title, text) { showCenter(title, text); setTimeout(() => { if (!['gameOver', 'title'].includes(state.mode)) hideCenter(); }, 1200); }
function hideCenter() { ui.center.hidden = true; }
function showMessage(msg) { state.message = msg; state.messageClock = 1.4; }
function togglePause() { state.paused = !state.paused; if (state.paused) showCenter('PAUSED', 'Press P or Escape to continue.'); else hideCenter(); }

function pointHit(px, py, x, y, r) { return dist2(px, py, x, y) <= r * r; }
function playerPointHit(px, py) { return player.dual ? pointHit(px, py, player.x - 19, player.y, 18) || pointHit(px, py, player.x + 19, player.y, 18) : pointHit(px, py, player.x, player.y, 17); }
function enemyRadius(e) { return e.type === 'boss' ? 22 : 19; }
function capturedPosition(e) { return { x: e.x, y: e.y + 31 }; }
function wrapX(x) { while (x < 0) x += W; while (x > W) x -= W; return x; }

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t, uu = u * u, tt = t * t;
  return { x: uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x, y: uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y };
}

function pathTangent(fn, t) { const a = fn(clamp(t - 0.004, 0, 1)), b = fn(clamp(t + 0.004, 0, 1)); return normalize(b.x - a.x, b.y - a.y); }
function normalize(x, y) { const m = Math.hypot(x, y) || 1; return { x: x / m, y: y / m }; }

let audioCtx = null;
function sfx(kind) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime, osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    const map = { shoot:[720,.035,'square'], enemyShoot:[190,.04,'square'], hit:[420,.05,'square'], bossHit:[180,.08,'sawtooth'], bossKill:[120,.14,'sawtooth'], death:[70,.23,'sawtooth'], beam:[245,.22,'sine'], capture:[145,.28,'sawtooth'], rescue:[610,.22,'square'], extra:[880,.18,'square'], clear:[520,.18,'square'], start:[440,.12,'square'] };
    const [f,d,type] = map[kind] || [300,.04,'square'];
    osc.type = type; osc.frequency.setValueAtTime(f, now);
    if (kind === 'death' || kind === 'bossKill') osc.frequency.exponentialRampToValueAtTime(Math.max(40, f / 2), now + d);
    else if (kind === 'rescue' || kind === 'extra' || kind === 'clear') osc.frequency.exponentialRampToValueAtTime(f * 1.5, now + d);
    gain.gain.setValueAtTime(.035, now); gain.gain.exponentialRampToValueAtTime(.001, now + d);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now); osc.stop(now + d);
  } catch (_) {}
}

function loop(ts) {
  if (!loop.last) loop.last = ts;
  const dt = Math.min(.033, (ts - loop.last) / 1000); loop.last = ts;
  update(dt); render(); requestAnimationFrame(loop);
}

initControls();
updateHud();
showCenter('BEAN GALAGA', 'Press Space / Enter or tap the playfield to begin. Move with arrows or A/D. Fire with individual Space presses.');
requestAnimationFrame(loop);
