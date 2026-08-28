'use strict';

const canvas = document.getElementById('beanGalaga');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const ui = {
  score: document.getElementById('gameScore'),
  high: document.getElementById('gameHigh'),
  stage: document.getElementById('gameStage'),
  lives: document.getElementById('gameLives'),
  center: document.getElementById('gameCenter'),
  centerTitle: document.getElementById('gameCenterTitle'),
  centerText: document.getElementById('gameCenterText')
};

const RAW = 'https://raw.githubusercontent.com/Big-JoshD/joshdunbarfanclub/main/img/';
const images = loadImages({
  player: RAW + 'player_ship.png',
  bee: RAW + 'enemy_fighter.png',
  butterfly: RAW + 'enemy_interceptor.png',
  boss: RAW + 'enemy_boss.png'
});

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const fmt = n => Math.max(0, Math.floor(n)).toString().padStart(6, '0');
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

const keys = { left: false, right: false };
const stars = makeStars(130);
const playerShots = [];
const enemyShots = [];
const particles = [];
const floaters = [];
const enemies = [];
const transforms = [];
const challengeTargets = [];

const state = {
  mode: 'title',
  stage: 1,
  score: 0,
  high: Number(localStorage.getItem('beanGalagaHigh') || 0),
  clock: 0,
  stageClock: 0,
  formationClock: 0,
  attackClock: 0,
  transformClock: 0,
  transformUsed: false,
  stageIntroClock: 0,
  stageClearClock: 0,
  entryGroup: 0,
  entryClock: 0,
  entryPattern: 1,
  attackGroupSeq: 0,
  activeAttackGroups: new Set(),
  paused: false,
  shotsFired: 0,
  hits: 0,
  stageShots: 0,
  stageHits: 0,
  nextExtra: 20000,
  bonusStep: 70000,
  challenge: null,
  rescue: null,
  rogueCaptured: null,
  messageClock: 0,
  message: ''
};

const player = {
  x: W / 2,
  y: H - 58,
  w: 40,
  h: 32,
  speed: 370,
  reserves: 2,
  dual: false,
  hidden: false,
  invuln: 0,
  respawnClock: 0,
  capture: null,
  lastFire: -99
};

function loadImages(map) {
  const out = {};
  for (const [k, src] of Object.entries(map)) {
    const img = new Image();
    img.src = src;
    out[k] = img;
  }
  return out;
}

function makeStars(n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() * 1.6, v: 10 + Math.random() * 30, a: 0.35 + Math.random() * 0.55 });
  return arr;
}

function initControls() {
  addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
      if (state.mode === 'title' || state.mode === 'gameOver') startNewGame();
      else if (!state.paused && canControl()) firePlayer();
    }
    if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat && !['title', 'gameOver'].includes(state.mode)) togglePause();
  });
  addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  });
  canvas.addEventListener('pointerdown', () => {
    if (state.mode === 'title' || state.mode === 'gameOver') startNewGame();
  });
  document.querySelectorAll('[data-control]').forEach(btn => {
    const control = btn.dataset.control;
    if (control === 'fire') {
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (state.mode === 'title' || state.mode === 'gameOver') startNewGame();
        else if (!state.paused && canControl()) firePlayer();
      });
      return;
    }
    const down = e => { e.preventDefault(); keys[control] = true; };
    const up = e => { e.preventDefault(); keys[control] = false; };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);
  });
}

function startNewGame() {
  state.stage = 1;
  state.score = 0;
  state.shotsFired = 0;
  state.hits = 0;
  state.nextExtra = 20000;
  player.reserves = 2;
  player.dual = false;
  player.hidden = false;
  player.invuln = 1.2;
  player.capture = null;
  player.x = W / 2;
  clearAllEntities();
  beginStage();
  sfx('start');
}

function beginStage() {
  clearCombatEntities();
  state.stageClock = 0;
  state.stageShots = 0;
  state.stageHits = 0;
  state.stageIntroClock = 1.35;
  state.stageClearClock = 0;
  state.transformUsed = false;
  state.transformClock = 5.5;
  state.attackGroupSeq = 0;
  state.activeAttackGroups.clear();
  state.rescue = null;
  state.rogueCaptured = null;
  player.capture = null;
  player.hidden = false;
  player.invuln = Math.max(player.invuln, 0.8);
  player.x = W / 2;
  if (isChallengeStage(state.stage)) {
    state.mode = 'challenge';
    setupChallenge();
    showTransient('CHALLENGING STAGE', 'Five formations. Forty targets. They do not shoot back.');
  } else {
    state.mode = 'stageIntro';
    state.entryPattern = entrancePatternForStage(state.stage);
    buildFormation();
    showTransient(`STAGE ${state.stage}`, `Entrance Pattern ${state.entryPattern}`);
  }
  updateHud();
}

function entrancePatternForStage(stage) {
  if (stage === 1) return 1;
  if (stage === 2) return 2;
  const phase = (stage - 4) % 4;
  return phase === 0 ? 1 : phase === 1 ? 2 : 3;
}

function isChallengeStage(stage) { return stage === 3 || (stage > 3 && (stage - 3) % 4 === 0); }
function challengeIndex(stage) { return Math.floor((stage - 3) / 4) + 1; }

function clearAllEntities() {
  enemies.length = transforms.length = challengeTargets.length = playerShots.length = enemyShots.length = particles.length = floaters.length = 0;
}

function clearCombatEntities() { clearAllEntities(); }

function buildFormation() {
  const slots = [];
  [-96, -32, 32, 96].forEach((dx, i) => slots.push(makeSlot('boss', 0, i, dx, 142)));
  for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) slots.push(makeSlot('butterfly', 1 + r, c, (c - 3.5) * 64, 196 + r * 48));
  for (let r = 0; r < 2; r++) for (let c = 0; c < 10; c++) slots.push(makeSlot('bee', 3 + r, c, (c - 4.5) * 64, 300 + r * 48));
  const groups = [
    slots.filter(s => s.type === 'butterfly').slice(0, 4).concat(slots.filter(s => s.type === 'bee').slice(0, 4)),
    slots.filter(s => s.type === 'boss').concat(slots.filter(s => s.type === 'butterfly').slice(4, 8)),
    slots.filter(s => s.type === 'butterfly').slice(8, 16),
    slots.filter(s => s.type === 'bee').slice(4, 12),
    slots.filter(s => s.type === 'bee').slice(12, 20)
  ];
  groups.forEach((group, groupId) => group.forEach((slot, index) => enemies.push({
    id: `e-${state.stage}-${groupId}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    type: slot.type, row: slot.row, col: slot.col, slotDX: slot.dx, slotY: slot.y,
    x: W / 2, y: -60, angle: Math.PI, alive: true, state: 'waiting', hp: slot.type === 'boss' ? 2 : 1,
    damaged: false, entryGroup: groupId, entryIndex: index, entryT: 0, attackGroup: null, attackT: 0, attackDuration: 0,
    attackRole: 'solo', bossEscortCount: 0, shotMarks: new Set(), capturedFighter: false, carrierState: null,
    returnT: 0, returnStartX: W / 2, attackTargetX: W / 2, tractor: null
  })));
  state.entryGroup = 0;
}

function makeSlot(type, row, col, dx, y) { return { type, row, col, dx, y }; }

function formationSlot(e) {
  const breathe = 1 + Math.sin(state.formationClock * 1.8) * 0.035;
  const center = W / 2 + Math.sin(state.formationClock * 0.72) * 13;
  const bob = Math.sin(state.formationClock * 1.25 + e.row * 0.25) * 2.5;
  return { x: center + e.slotDX * breathe, y: e.slotY + bob };
}

function update(dt) {
  if (state.paused) return;
  state.clock += dt;
  state.stageClock += dt;
  state.formationClock += dt;
  if (state.messageClock > 0) state.messageClock -= dt;
  updateStars(dt); updateParticles(dt); updateFloaters(dt); updatePlayer(dt); updatePlayerShots(dt); updateEnemyShots(dt);
  if (state.mode === 'stageIntro') {
    state.stageIntroClock -= dt;
    if (state.stageIntroClock <= 0) { state.mode = 'entry'; state.entryClock = 0; hideCenter(); }
  } else if (state.mode === 'entry' || state.mode === 'formation') updateNormalStage(dt);
  else if (state.mode === 'challenge') updateChallenge(dt);
  else if (state.mode === 'stageClear') {
    state.stageClearClock -= dt;
    if (state.stageClearClock <= 0) { state.stage += 1; beginStage(); }
  } else if (state.mode === 'lifeLost') updateLifeLost(dt);
  updateRescue(dt); handleCollisions(); cleanup(); updateHud();
}

function updateStars(dt) {
  for (const s of stars) { s.y += s.v * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } }
}

function updatePlayer(dt) {
  if (player.invuln > 0) player.invuln -= dt;
  if (player.capture) { updateCapture(dt); return; }
  if (!canControl()) return;
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const half = player.dual ? 39 : 21;
  player.x = clamp(player.x + dir * player.speed * dt, half, W - half);
}

function canControl() { return !player.hidden && !player.capture && !state.paused && ['entry', 'formation', 'challenge'].includes(state.mode); }

function firePlayer() {
  if (!canControl() || state.clock - player.lastFire < 0.115) return;
  const active = playerShots.filter(s => s.alive).length;
  const cap = player.dual ? 4 : 2;
  if (active >= cap) return;
  const offsets = player.dual ? [-18, 18] : [0];
  const room = cap - active;
  offsets.slice(0, room).forEach(dx => {
    playerShots.push({ x: player.x + dx, y: player.y - 24, vx: 0, vy: -650, r: 3, alive: true });
    state.shotsFired += 1; state.stageShots += 1;
  });
  player.lastFire = state.clock;
  sfx('shoot');
}

function updatePlayerShots(dt) {
  for (const s of playerShots) { if (!s.alive) continue; s.y += s.vy * dt; if (s.y < -20) s.alive = false; }
}

function enemyShotCap() {
  if (state.stage <= 3) return 2;
  if (state.stage <= 10) return 3;
  if (state.stage <= 18) return 4;
  return 5;
}

function fireEnemy(e, kind, tangent = { x: 0, y: 1 }) {
  if (isChallengeStage(state.stage) || enemyShots.filter(s => s.alive).length >= enemyShotCap()) return;
  let dir;
  if (kind === 'entry') {
    const aim = normalize(player.x - e.x, Math.max(180, player.y - e.y));
    dir = normalize(tangent.x * 0.25 + aim.x * 0.75, Math.abs(tangent.y) * 0.15 + aim.y * 0.85);
  } else {
    const aim = normalize(player.x - e.x, Math.max(100, player.y - e.y));
    dir = normalize(tangent.x * 0.55 + aim.x * 0.45, Math.max(0.25, tangent.y * 0.55 + aim.y * 0.45));
  }
  const speed = 235 + Math.min(95, state.stage * 4.5);
  enemyShots.push({ x: e.x, y: e.y + 10, vx: dir.x * speed, vy: dir.y * speed, r: 4, alive: true });
  sfx('enemyShoot');
}

function updateEnemyShots(dt) {
  for (const s of enemyShots) {
    if (!s.alive) continue;
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.y > H + 24 || s.x < -24 || s.x > W + 24) s.alive = false;
  }
}
