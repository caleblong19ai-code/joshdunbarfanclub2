(() => {
  'use strict';

  const canvas = document.getElementById('beanGalaga');
  if (!canvas) return;
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
    centerText: document.getElementById('gameCenterText'),
    mobile: document.querySelector('.mobile-controls')
  };

  const raw = 'https://raw.githubusercontent.com/Big-JoshD/joshdunbarfanclub/main/img/';
  const images = loadImages({
    player: raw + 'player_ship.png',
    bee: raw + 'enemy_fighter.png',
    butterfly: raw + 'enemy_interceptor.png',
    boss: raw + 'enemy_boss.png'
  });

  const input = { left: false, right: false, fire: false };
  const stars = makeStars(120);
  const shots = [];
  const enemyShots = [];
  const particles = [];
  const enemies = [];
  const floaters = [];

  const state = {
    mode: 'title',
    stage: 1,
    score: 0,
    high: Number(localStorage.getItem('beanGalagaHigh') || 0),
    time: 0,
    stageTime: 0,
    stageClearTimer: 0,
    entryClock: 0,
    nextEntry: 0,
    diveClock: 0,
    tractorClock: 0,
    messageTimer: 0,
    message: '',
    challenge: null,
    extraLifeTarget: 20000,
    paused: false
  };

  const player = {
    x: W / 2,
    y: H - 64,
    width: 42,
    height: 32,
    speed: 390,
    lives: 3,
    dual: false,
    invuln: 0,
    hidden: false,
    respawn: 0,
    fireCooldown: 0
  };

  let enemyId = 1;
  let audioCtx = null;

  function loadImages(map) {
    const out = {};
    for (const [key, src] of Object.entries(map)) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.failed = false;
      img.onerror = () => { img.failed = true; };
      out[key] = img;
    }
    return out;
  }

  function makeStars(n) {
    return Array.from({ length: n }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 18 + Math.random() * 44,
      size: Math.random() < 0.8 ? 1 : 2,
      alpha: 0.25 + Math.random() * 0.7
    }));
  }

  function unlockAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx?.state === 'suspended') audioCtx.resume();
  }

  function tone(freq, duration = 0.05, type = 'square', gain = 0.025, endFreq = null) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + duration);
    amp.gain.setValueAtTime(gain, audioCtx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(amp).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function sfx(name) {
    if (name === 'shoot') tone(780, 0.045, 'square', 0.018, 430);
    else if (name === 'enemyShoot') tone(260, 0.05, 'square', 0.012, 190);
    else if (name === 'hit') tone(150, 0.09, 'sawtooth', 0.03, 70);
    else if (name === 'bossHit') tone(280, 0.07, 'square', 0.025, 120);
    else if (name === 'capture') tone(620, 0.28, 'sine', 0.035, 130);
    else if (name === 'rescue') tone(430, 0.22, 'triangle', 0.035, 980);
    else if (name === 'life') tone(660, 0.18, 'triangle', 0.03, 1320);
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t * t * (3 - 2 * t); }
  function dist2(ax, ay, bx, by) { const dx = ax - bx; const dy = ay - by; return dx * dx + dy * dy; }

  function cubic(a, b, c, d, t) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    return {
      x: uu * u * a.x + 3 * uu * t * b.x + 3 * u * tt * c.x + tt * t * d.x,
      y: uu * u * a.y + 3 * uu * t * b.y + 3 * u * tt * c.y + tt * t * d.y
    };
  }

  function pathTangent(fn, t) {
    const a = fn(clamp(t - 0.004, 0, 1));
    const b = fn(clamp(t + 0.004, 0, 1));
    return normalize(b.x - a.x, b.y - a.y);
  }

  function normalize(x, y) {
    const m = Math.hypot(x, y) || 1;
    return { x: x / m, y: y / m };
  }

  function currentFormationOffset() {
    const speed = 1.4 + Math.min(state.stage, 12) * 0.03;
    return {
      x: Math.sin(state.time * speed) * 18,
      y: Math.sin(state.time * speed * 0.5) * 3
    };
  }

  const formation = {
    left: 178,
    top: 106,
    dx: 68,
    dy: 48
  };

  function slotFor(row, col) {
    const off = currentFormationOffset();
    return {
      x: formation.left + col * formation.dx + off.x,
      y: formation.top + row * formation.dy + off.y
    };
  }

  function buildNormalStage() {
    enemies.length = 0;
    shots.length = 0;
    enemyShots.length = 0;
    particles.length = 0;
    floaters.length = 0;
    state.challenge = null;
    state.entryClock = 0;
    state.nextEntry = 0;
    state.diveClock = 1.7;
    state.tractorClock = 7 + Math.random() * 4;

    const specs = [];
    for (let c = 3; c <= 6; c++) specs.push({ row: 0, col: c, type: 'boss' });
    for (let c = 1; c <= 8; c++) specs.push({ row: 1, col: c, type: 'butterfly' });
    for (let c = 1; c <= 8; c++) specs.push({ row: 2, col: c, type: 'butterfly' });
    for (let c = 0; c <= 9; c++) specs.push({ row: 3, col: c, type: 'bee' });
    for (let c = 0; c <= 9; c++) specs.push({ row: 4, col: c, type: 'bee' });

    specs.forEach((spec, i) => {
      enemies.push(makeEnemy(spec.type, spec.row, spec.col, {
        entryGroup: Math.floor(i / 4),
        entryIndex: i % 4,
        entryStyle: Math.floor(i / 4) % 4
      }));
    });

    state.mode = 'intro';
    state.stageTime = 0;
    showCenter(`STAGE ${state.stage}`, 'Enemy squadrons approaching the Institute airspace.');
    setTimeoutSafe(() => {
      if (state.mode === 'intro') {
        state.mode = 'entry';
        hideCenter();
      }
    }, 1100);
  }

  function isChallengingStage(stage) {
    return stage === 3 || (stage > 3 && (stage - 3) % 4 === 0);
  }

  function buildChallengeStage() {
    enemies.length = 0;
    shots.length = 0;
    enemyShots.length = 0;
    particles.length = 0;
    floaters.length = 0;
    state.challenge = {
      total: 40,
      hit: 0,
      escaped: 0,
      groupHits: Array(5).fill(0),
      groupBonus: 0,
      finished: false
    };

    for (let group = 0; group < 5; group++) {
      for (let i = 0; i < 8; i++) {
        const type = group === 4 ? 'boss' : (group % 2 ? 'butterfly' : 'bee');
        const e = makeEnemy(type, 0, 0, {
          state: 'challengeWaiting',
          challengeGroup: group,
          challengeIndex: i,
          challengeDelay: group * 3.35 + i * 0.16,
          hp: 1
        });
        enemies.push(e);
      }
    }

    state.mode = 'challengeIntro';
    state.stageTime = 0;
    showCenter('CHALLENGING STAGE', '40 targets. No return fire. Destroy complete squadrons for bonus points.');
    setTimeoutSafe(() => {
      if (state.mode === 'challengeIntro') {
        state.mode = 'challenge';
        hideCenter();
      }
    }, 1600);
  }

  function makeEnemy(type, row, col, extras = {}) {
    const s = slotFor(row, col);
    const base = {
      id: enemyId++,
      type,
      row,
      col,
      x: s.x,
      y: s.y,
      angle: Math.PI,
      hp: type === 'boss' ? 2 : 1,
      maxHp: type === 'boss' ? 2 : 1,
      state: 'waiting',
      entryGroup: 0,
      entryIndex: 0,
      entryStyle: 0,
      entryT: 0,
      diveT: 0,
      diveDuration: 3,
      diveKind: 'bee',
      diveTargetX: W / 2,
      diveOrigin: { x: s.x, y: s.y },
      diveShots: [false, false],
      returningT: 0,
      returnStart: { x: s.x, y: -40 },
      fireClock: 0.5 + Math.random() * 2.5,
      carrying: false,
      tractor: null,
      escortLeader: null,
      alive: true,
      scoreFormation: type === 'boss' ? 150 : type === 'butterfly' ? 80 : 50,
      scoreDive: type === 'boss' ? 400 : type === 'butterfly' ? 160 : 100,
      challengeGroup: -1,
      challengeIndex: -1,
      challengeDelay: 0,
      challengeT: 0
    };
    return Object.assign(base, extras);
  }

  function startGame() {
    unlockAudio();
    state.stage = 1;
    state.score = 0;
    state.extraLifeTarget = 20000;
    state.paused = false;
    player.x = W / 2;
    player.lives = 3;
    player.dual = false;
    player.invuln = 0;
    player.hidden = false;
    player.respawn = 0;
    beginStage();
  }

  function beginStage() {
    if (isChallengingStage(state.stage)) buildChallengeStage();
    else buildNormalStage();
    updateHud();
  }

  function nextStage() {
    state.stage++;
    beginStage();
  }

  function entryPath(e, t) {
    const target = slotFor(e.row, e.col);
    const style = e.entryStyle;
    const sideLeft = style === 0 || style === 2;
    const start = sideLeft ? { x: -70, y: 90 + e.entryIndex * 12 } : { x: W + 70, y: 90 + e.entryIndex * 12 };

    if (style === 0) {
      if (t < 0.58) {
        const p = t / 0.58;
        return cubic(start, { x: 110, y: -60 }, { x: 380, y: 300 }, { x: 470, y: 120 }, p);
      }
      const p = ease((t - 0.58) / 0.42);
      const a = { x: 470, y: 120 };
      return { x: lerp(a.x, target.x, p), y: lerp(a.y, target.y, p) };
    }

    if (style === 1) {
      if (t < 0.58) {
        const p = t / 0.58;
        return cubic(start, { x: W - 110, y: -60 }, { x: W - 380, y: 300 }, { x: W - 470, y: 120 }, p);
      }
      const p = ease((t - 0.58) / 0.42);
      const a = { x: W - 470, y: 120 };
      return { x: lerp(a.x, target.x, p), y: lerp(a.y, target.y, p) };
    }

    if (style === 2) {
      const p = t;
      const centerX = W * 0.34;
      const loopX = centerX + Math.sin(p * Math.PI * 2.1) * 115 * (1 - p * 0.25);
      const loopY = -40 + p * 250 + Math.sin(p * Math.PI * 4.2) * 52;
      if (p < 0.7) return { x: loopX, y: loopY };
      const q = ease((p - 0.7) / 0.3);
      const a = { x: centerX + Math.sin(0.7 * Math.PI * 2.1) * 115 * (1 - 0.7 * 0.25), y: -40 + 0.7 * 250 + Math.sin(0.7 * Math.PI * 4.2) * 52 };
      return { x: lerp(a.x, target.x, q), y: lerp(a.y, target.y, q) };
    }

    const p = t;
    const centerX = W * 0.66;
    const loopX = centerX - Math.sin(p * Math.PI * 2.1) * 115 * (1 - p * 0.25);
    const loopY = -40 + p * 250 + Math.sin(p * Math.PI * 4.2) * 52;
    if (p < 0.7) return { x: loopX, y: loopY };
    const q = ease((p - 0.7) / 0.3);
    const a = { x: centerX - Math.sin(0.7 * Math.PI * 2.1) * 115 * (1 - 0.7 * 0.25), y: -40 + 0.7 * 250 + Math.sin(0.7 * Math.PI * 4.2) * 52 };
    return { x: lerp(a.x, target.x, q), y: lerp(a.y, target.y, q) };
  }

  function challengePath(e, t) {
    const g = e.challengeGroup;
    const side = g % 2 === 0 ? 1 : -1;
    const phase = e.challengeIndex * 0.075;
    const p = clamp(t - phase, 0, 1);

    if (g === 0) {
      const a = { x: side > 0 ? -60 : W + 60, y: 80 };
      const d = { x: side > 0 ? W + 80 : -80, y: H - 100 };
      return cubic(a, { x: W * 0.2, y: -40 }, { x: W * 0.74, y: 420 }, d, p);
    }
    if (g === 1) {
      return {
        x: W / 2 + Math.sin(p * Math.PI * 3) * 300,
        y: -50 + p * (H + 120)
      };
    }
    if (g === 2) {
      return {
        x: W / 2 + Math.sin(p * Math.PI * 4) * (260 - p * 70),
        y: 80 + Math.sin(p * Math.PI * 2) * 150 + p * 450
      };
    }
    if (g === 3) {
      const a = { x: W + 60, y: H * 0.26 };
      const d = { x: -80, y: H * 0.72 };
      return cubic(a, { x: W * 0.64, y: H * 0.9 }, { x: W * 0.34, y: -30 }, d, p);
    }
    return {
      x: W / 2 + Math.cos(p * Math.PI * 3.4) * 330 * (1 - p * 0.45),
      y: -40 + p * (H + 100)
    };
  }

  function divePath(e, t) {
    const o = e.diveOrigin;
    const targetX = e.diveTargetX;
    const side = e.col < 5 ? -1 : 1;

    if (e.diveKind === 'butterfly') {
      if (t < 0.42) {
        const p = t / 0.42;
        return {
          x: o.x + Math.sin(p * Math.PI * 2) * 105 * side,
          y: o.y + p * 205 + Math.sin(p * Math.PI) * 55
        };
      }
      const p = (t - 0.42) / 0.58;
      return cubic(
        { x: o.x, y: o.y + 205 },
        { x: targetX - 135 * side, y: H * 0.44 },
        { x: targetX + 80 * side, y: H * 0.76 },
        { x: targetX + 120 * side, y: H + 75 },
        p
      );
    }

    if (e.diveKind === 'boss') {
      if (t < 0.34) {
        const p = t / 0.34;
        return {
          x: o.x + Math.sin(p * Math.PI * 1.85) * 120 * side,
          y: o.y + p * 170 - Math.sin(p * Math.PI) * 70
        };
      }
      const p = (t - 0.34) / 0.66;
      return cubic(
        { x: o.x, y: o.y + 170 },
        { x: targetX - 160 * side, y: H * 0.42 },
        { x: targetX + 95 * side, y: H * 0.76 },
        { x: targetX, y: H + 85 },
        p
      );
    }

    if (t < 0.24) {
      const p = t / 0.24;
      return cubic(o, { x: o.x + 95 * side, y: o.y - 35 }, { x: o.x + 145 * side, y: o.y + 90 }, { x: o.x + 88 * side, y: o.y + 150 }, p);
    }
    const p = (t - 0.24) / 0.76;
    return cubic(
      { x: o.x + 88 * side, y: o.y + 150 },
      { x: targetX - 95 * side, y: H * 0.43 },
      { x: targetX + 55 * side, y: H * 0.76 },
      { x: targetX, y: H + 80 },
      p
    );
  }

  function tractorApproachPath(e, t) {
    const o = e.diveOrigin;
    const side = e.col < 5 ? -1 : 1;
    return cubic(o, { x: o.x + 135 * side, y: o.y + 55 }, { x: W / 2 - 80 * side, y: 280 }, { x: clamp(player.x, 180, W - 180), y: 330 }, ease(t));
  }

  function returnPath(e, t) {
    const target = slotFor(e.row, e.col);
    const a = e.returnStart;
    return cubic(a, { x: a.x, y: 20 }, { x: target.x + (a.x < W / 2 ? 80 : -80), y: target.y - 70 }, target, ease(t));
  }

  function startDive(e, leader = null) {
    if (!e || !e.alive || e.state !== 'formation') return;
    const s = slotFor(e.row, e.col);
    e.diveOrigin = { x: e.x || s.x, y: e.y || s.y };
    e.diveT = leader ? -0.055 * (e.entryIndex + 1) : 0;
    e.diveDuration = Math.max(2.1, 3.15 - state.stage * 0.055);
    e.diveTargetX = clamp(player.x + (Math.random() - 0.5) * 90, 80, W - 80);
    e.diveKind = e.type === 'boss' ? 'boss' : e.type === 'butterfly' ? 'butterfly' : 'bee';
    e.diveShots = [false, false];
    e.escortLeader = leader?.id || null;
    e.state = 'diving';
  }

  function chooseDiveSquad() {
    const available = enemies.filter(e => e.alive && e.state === 'formation');
    if (!available.length) return;

    const carriers = available.filter(e => e.type === 'boss' && e.carrying);
    const bosses = available.filter(e => e.type === 'boss');
    const pool = carriers.length && Math.random() < 0.65 ? carriers : (bosses.length && Math.random() < 0.28 ? bosses : available);
    const leader = pool[Math.floor(Math.random() * pool.length)];
    startDive(leader);

    if (leader.type === 'boss' && !leader.carrying) {
      const possible = available
        .filter(e => e.type !== 'boss' && e.row <= 2 && Math.abs(e.col - leader.col) <= 2)
        .slice(0, state.stage >= 5 ? 2 : 1);
      possible.forEach((escort, i) => {
        escort.entryIndex = i;
        startDive(escort, leader);
        escort.diveTargetX = leader.diveTargetX + (i ? 48 : -48);
      });
    }
  }

  function startTractor(e) {
    if (!e || e.type !== 'boss' || e.state !== 'formation' || e.carrying || player.dual || player.hidden || player.lives <= 1) return false;
    e.diveOrigin = { x: e.x, y: e.y };
    e.tractor = { phase: 'approach', t: 0, hold: 0, captured: false };
    e.state = 'tractor';
    return true;
  }

  function firePlayer() {
    if (player.hidden || player.fireCooldown > 0 || !['entry', 'active', 'challenge'].includes(state.mode)) return;
    const active = shots.filter(s => s.alive).length;
    const cap = player.dual ? 4 : 2;
    if (active >= cap) return;

    const offsets = player.dual ? [-15, 15] : [0];
    for (const off of offsets) {
      if (shots.filter(s => s.alive).length >= cap) break;
      shots.push({ x: player.x + off, y: player.y - 22, vx: 0, vy: -610, r: 3, alive: true });
    }
    player.fireCooldown = 0.115;
    sfx('shoot');
  }

  function fireEnemy(e, kind = 'formation') {
    if (state.mode !== 'active' || player.hidden) return;

    let direction;
    let speed;

    if (kind === 'dive') {
      const fn = p => divePath(e, clamp(p, 0, 1));
      const tangent = pathTangent(fn, clamp(e.diveT, 0, 1));
      const aim = normalize(player.x - e.x, player.y - e.y);
      let vx = tangent.x * 0.72 + aim.x * 0.28;
      let vy = tangent.y * 0.72 + aim.y * 0.28;
      if (vy < 0.28) vy = 0.28;
      direction = normalize(vx, vy);
      speed = 315 + Math.min(90, state.stage * 6);
    } else {
      const dx = clamp(player.x - e.x, -170, 170);
      direction = normalize(dx * 0.55, Math.max(160, player.y - e.y));
      speed = 260 + Math.min(100, state.stage * 7);
    }

    enemyShots.push({ x: e.x, y: e.y + 12, vx: direction.x * speed, vy: direction.y * speed, r: 4, alive: true, source: e.type });
    sfx('enemyShoot');

    if (e.type === 'boss' && kind === 'dive' && state.stage >= 4) {
      const base = Math.atan2(direction.y, direction.x);
      for (const spread of [-0.17, 0.17]) {
        const a = base + spread;
        enemyShots.push({ x: e.x, y: e.y + 12, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 4, alive: true, source: 'boss' });
      }
    }
  }

  function updatePlayer(dt) {
    if (player.fireCooldown > 0) player.fireCooldown -= dt;
    if (player.invuln > 0) player.invuln -= dt;

    if (player.respawn > 0) {
      player.respawn -= dt;
      if (player.respawn <= 0 && player.lives > 0) {
        player.hidden = false;
        player.x = W / 2;
        player.invuln = 2.2;
      }
      return;
    }

    if (player.hidden || state.paused) return;
    const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    player.x = clamp(player.x + move * player.speed * dt, player.dual ? 42 : 24, W - (player.dual ? 42 : 24));
    if (input.fire) firePlayer();
  }

  function updateShots(dt) {
    for (const s of shots) {
      if (!s.alive) continue;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.y < -30) s.alive = false;
    }
    for (const s of enemyShots) {
      if (!s.alive) continue;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.y > H + 30 || s.x < -30 || s.x > W + 30) s.alive = false;
    }
  }

  function updateNormalEnemies(dt) {
    if (state.mode === 'entry') {
      state.entryClock += dt;
      const groupStartEvery = Math.max(0.52, 0.82 - state.stage * 0.018);
      const currentAllowedGroup = Math.floor(state.entryClock / groupStartEvery);
      for (const e of enemies) {
        if (e.state === 'waiting' && e.entryGroup <= currentAllowedGroup) {
          e.state = 'entering';
          e.entryT = -e.entryIndex * 0.11;
        }
      }
      if (enemies.every(e => !e.alive || e.state === 'formation')) {
        state.mode = 'active';
        state.diveClock = 1.2;
      }
    }

    for (const e of enemies) {
      if (!e.alive) continue;

      if (e.state === 'entering') {
        e.entryT += dt / Math.max(1.35, 2.05 - state.stage * 0.025);
        if (e.entryT < 0) continue;
        const t = clamp(e.entryT, 0, 1);
        const p = entryPath(e, t);
        const tangent = pathTangent(q => entryPath(e, q), t);
        e.x = p.x;
        e.y = p.y;
        e.angle = Math.atan2(tangent.y, tangent.x) + Math.PI / 2;
        if (e.entryT >= 1) {
          e.state = 'formation';
          const s = slotFor(e.row, e.col);
          e.x = s.x;
          e.y = s.y;
          e.angle = Math.PI;
          e.fireClock = 0.7 + Math.random() * 2.5;
        }
        continue;
      }

      if (e.state === 'formation') {
        const s = slotFor(e.row, e.col);
        e.x = s.x;
        e.y = s.y;
        e.angle = Math.PI;
        if (state.mode === 'active') {
          e.fireClock -= dt;
          const formationRate = Math.max(1.4, 3.2 - state.stage * 0.08);
          if (e.fireClock <= 0 && Math.random() < 0.38) {
            fireEnemy(e, 'formation');
            e.fireClock = formationRate + Math.random() * 2.1;
          }
        }
        continue;
      }

      if (e.state === 'diving') {
        e.diveT += dt / e.diveDuration;
        if (e.diveT < 0) continue;
        const t = clamp(e.diveT, 0, 1);
        const p = divePath(e, t);
        const tangent = pathTangent(q => divePath(e, q), t);
        e.x = p.x;
        e.y = p.y;
        e.angle = Math.atan2(tangent.y, tangent.x) + Math.PI / 2;

        if (t > 0.33 && !e.diveShots[0]) {
          e.diveShots[0] = true;
          fireEnemy(e, 'dive');
        }
        if (t > 0.61 && !e.diveShots[1] && (state.stage >= 3 || e.type === 'boss')) {
          e.diveShots[1] = true;
          fireEnemy(e, 'dive');
        }

        if (e.diveT >= 1) {
          e.state = 'returning';
          e.returningT = 0;
          e.returnStart = { x: clamp(e.x, 40, W - 40), y: -45 };
        }
        continue;
      }

      if (e.state === 'returning') {
        e.returningT += dt / 0.9;
        const t = clamp(e.returningT, 0, 1);
        const p = returnPath(e, t);
        const tangent = pathTangent(q => returnPath(e, q), t);
        e.x = p.x;
        e.y = p.y;
        e.angle = Math.atan2(tangent.y, tangent.x) + Math.PI / 2;
        if (e.returningT >= 1) {
          e.state = 'formation';
          e.angle = Math.PI;
        }
        continue;
      }

      if (e.state === 'tractor') updateTractor(e, dt);
    }

    if (state.mode === 'active') {
      state.diveClock -= dt;
      const diveInterval = Math.max(0.7, 1.8 - state.stage * 0.065);
      const maxDivers = Math.min(4, 1 + Math.floor(state.stage / 3));
      const activeDivers = enemies.filter(e => e.alive && ['diving', 'tractor'].includes(e.state)).length;
      if (state.diveClock <= 0 && activeDivers < maxDivers) {
        chooseDiveSquad();
        state.diveClock = diveInterval + Math.random() * 1.1;
      }

      state.tractorClock -= dt;
      if (state.tractorClock <= 0 && !player.dual && player.lives > 1) {
        const boss = enemies.find(e => e.alive && e.type === 'boss' && e.state === 'formation' && !e.carrying);
        if (!startTractor(boss)) state.tractorClock = 2;
        else state.tractorClock = 12 + Math.random() * 6;
      }
    }

    if (enemies.every(e => !e.alive)) beginStageClear();
  }

  function updateTractor(e, dt) {
    const tr = e.tractor;
    if (!tr) return;

    if (tr.phase === 'approach') {
      tr.t += dt / 1.55;
      const t = clamp(tr.t, 0, 1);
      const p = tractorApproachPath(e, t);
      const tangent = pathTangent(q => tractorApproachPath(e, q), t);
      e.x = p.x;
      e.y = p.y;
      e.angle = Math.atan2(tangent.y, tangent.x) + Math.PI / 2;
      if (tr.t >= 1) {
        tr.phase = 'beam';
        tr.hold = 0;
        e.angle = Math.PI;
      }
      return;
    }

    if (tr.phase === 'beam') {
      tr.hold += dt;
      e.angle = Math.PI;
      if (!player.hidden && player.invuln <= 0) {
        const half = 38 + tr.hold * 22;
        const beamBottom = H - 34;
        const withinY = player.y > e.y && player.y < beamBottom;
        const spread = half * ((player.y - e.y) / Math.max(1, beamBottom - e.y));
        if (withinY && Math.abs(player.x - e.x) < Math.max(20, spread)) capturePlayer(e);
      }
      if (tr.hold >= 2.5 || tr.captured) {
        tr.phase = 'return';
        tr.t = 0;
        e.returnStart = { x: e.x, y: e.y };
      }
      return;
    }

    if (tr.phase === 'return') {
      tr.t += dt / 1.25;
      const t = clamp(tr.t, 0, 1);
      const target = slotFor(e.row, e.col);
      const p = cubic(e.returnStart, { x: e.x, y: 180 }, { x: target.x, y: 70 }, target, ease(t));
      e.x = p.x;
      e.y = p.y;
      if (tr.t >= 1) {
        e.state = 'formation';
        e.tractor = null;
        e.angle = Math.PI;
      }
    }
  }

  function capturePlayer(boss) {
    if (player.hidden || player.lives <= 1) return;
    boss.carrying = true;
    boss.tractor.captured = true;
    player.lives--;
    player.hidden = true;
    player.respawn = 2.25;
    player.dual = false;
    enemyShots.length = 0;
    showMessage('BEAN CAPTURED // RESCUE POSSIBLE');
    sfx('capture');
    updateHud();
  }

  function updateChallenge(dt) {
    const c = state.challenge;
    if (!c) return;

    for (const e of enemies) {
      if (!e.alive || e.state === 'challengeDone') continue;
      if (e.state === 'challengeWaiting') {
        if (state.stageTime >= e.challengeDelay) {
          e.state = 'challengeFlying';
          e.challengeT = 0;
        } else continue;
      }
      if (e.state === 'challengeFlying') {
        e.challengeT += dt / 2.9;
        const t = clamp(e.challengeT, 0, 1);
        const p = challengePath(e, t);
        const tangent = pathTangent(q => challengePath(e, q), t);
        e.x = p.x;
        e.y = p.y;
        e.angle = Math.atan2(tangent.y, tangent.x) + Math.PI / 2;
        if (e.challengeT >= 1) {
          e.state = 'challengeDone';
          c.escaped++;
        }
      }
    }

    if (!c.finished && enemies.every(e => !e.alive || e.state === 'challengeDone')) {
      c.finished = true;
      let bonus = c.groupBonus;
      if (c.hit === c.total) bonus += 10000;
      addScore(bonus, false);
      state.mode = 'challengeResult';
      showCenter('CHALLENGE COMPLETE', `${c.hit} / ${c.total} targets destroyed${c.hit === c.total ? ' // PERFECT +10,000' : ''}`);
      setTimeoutSafe(() => nextStage(), 2300);
    }
  }

  function checkCollisions() {
    for (const s of shots) {
      if (!s.alive) continue;
      for (const e of enemies) {
        if (!e.alive || !isEnemyTargetable(e)) continue;
        if (dist2(s.x, s.y, e.x, e.y) < enemyRadius(e) ** 2) {
          s.alive = false;
          hitEnemy(e);
          break;
        }
      }
    }

    if (player.hidden || player.invuln > 0 || state.mode === 'challenge') return;

    const hitWidth = player.dual ? 62 : 30;
    const hitHeight = 24;
    for (const s of enemyShots) {
      if (!s.alive) continue;
      if (Math.abs(s.x - player.x) < hitWidth / 2 + s.r && Math.abs(s.y - player.y) < hitHeight / 2 + s.r) {
        s.alive = false;
        playerHit();
        return;
      }
    }

    for (const e of enemies) {
      if (!e.alive || e.state !== 'diving') continue;
      if (Math.abs(e.x - player.x) < hitWidth / 2 + 18 && Math.abs(e.y - player.y) < hitHeight / 2 + 16) {
        killEnemy(e, false);
        playerHit();
        return;
      }
    }
  }

  function isEnemyTargetable(e) {
    return ['entering', 'formation', 'diving', 'tractor', 'challengeFlying'].includes(e.state);
  }

  function enemyRadius(e) {
    return e.type === 'boss' ? 24 : 19;
  }

  function hitEnemy(e) {
    e.hp--;
    if (e.hp > 0) {
      sfx('bossHit');
      burst(e.x, e.y, '#77d6ff', 8);
      return;
    }
    killEnemy(e, true);
  }

  function killEnemy(e, award = true) {
    if (!e.alive) return;
    e.alive = false;
    const wasDiving = ['diving', 'tractor'].includes(e.state);
    burst(e.x, e.y, e.type === 'boss' ? '#68d9ff' : '#ffbf72', e.type === 'boss' ? 24 : 14);
    sfx('hit');

    if (award) {
      if (state.mode === 'challenge') {
        const c = state.challenge;
        c.hit++;
        if (e.challengeGroup >= 0) {
          c.groupHits[e.challengeGroup]++;
          if (c.groupHits[e.challengeGroup] === 8) {
            c.groupBonus += 1000;
            showMessage(`SQUADRON ${e.challengeGroup + 1} PERFECT +1000`);
          }
        }
        addScore(100, true);
      } else {
        let pts = wasDiving ? e.scoreDive : e.scoreFormation;
        if (e.type === 'boss' && wasDiving) {
          const escorts = enemies.filter(x => x.alive && x.escortLeader === e.id && x.state === 'diving').length;
          pts += escorts * 300;
        }
        addScore(pts, true);
      }
    }

    if (e.type === 'boss' && e.carrying) {
      if (wasDiving) {
        e.carrying = false;
        player.dual = true;
        player.hidden = false;
        player.invuln = 2.2;
        addScore(1000, true);
        showMessage('CAPTURED BEAN RESCUED // DUAL BEAN ACTIVE');
        sfx('rescue');
      } else {
        e.carrying = false;
        showMessage('CAPTURED BEAN LOST // RESCUE WINDOW MISSED');
      }
    }
  }

  function playerHit() {
    if (player.dual) {
      player.dual = false;
      player.invuln = 1.8;
      burst(player.x + 18, player.y, '#ffffff', 22);
      showMessage('DUAL BEAN DAMAGED // SINGLE FIGHTER');
      sfx('hit');
      updateHud();
      return;
    }

    player.lives--;
    burst(player.x, player.y, '#ffffff', 28);
    sfx('hit');
    updateHud();
    if (player.lives <= 0) {
      player.hidden = true;
      state.mode = 'gameover';
      updateHigh();
      showCenter('DEFENSE FAILED', `Final score ${state.score.toLocaleString()} // Press Space or tap to redeploy Bean.`);
      return;
    }

    player.hidden = true;
    player.respawn = 1.8;
    enemyShots.length = 0;
  }

  function addScore(points, allowLife = true) {
    state.score += points;
    if (state.score > state.high) {
      state.high = state.score;
      localStorage.setItem('beanGalagaHigh', String(state.high));
    }
    if (allowLife && state.score >= state.extraLifeTarget) {
      player.lives++;
      state.extraLifeTarget = state.extraLifeTarget === 20000 ? 70000 : state.extraLifeTarget + 70000;
      showMessage('EXTRA BEAN AWARDED');
      sfx('life');
    }
    updateHud();
  }

  function updateHigh() {
    if (state.score > state.high) state.high = state.score;
    localStorage.setItem('beanGalagaHigh', String(state.high));
  }

  function beginStageClear() {
    if (state.mode === 'clear') return;
    state.mode = 'clear';
    enemyShots.length = 0;
    showCenter(`STAGE ${state.stage} CLEAR`, 'Formation neutralized. Preparing the next attack pattern.');
    setTimeoutSafe(() => nextStage(), 1500);
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 180;
      particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.35 + Math.random() * 0.45, maxLife: 0.8, color });
    }
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life -= dt;
    }
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
  }

  function updateStars(dt) {
    for (const s of stars) {
      s.y += s.speed * dt;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    }
  }

  function update(dt) {
    state.time += dt;
    if (state.paused) return;
    state.stageTime += dt;

    updateStars(dt);
    updatePlayer(dt);
    updateShots(dt);
    updateParticles(dt);

    if (['entry', 'active'].includes(state.mode)) updateNormalEnemies(dt);
    if (state.mode === 'challenge') updateChallenge(dt);
    checkCollisions();

    if (state.messageTimer > 0) state.messageTimer -= dt;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawShots();
    drawEnemies();
    drawPlayer();
    drawParticles();
    drawMessage();
    if (state.paused) drawPause();
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#010207');
    grad.addColorStop(0.65, '#050a1a');
    grad.addColorStop(1, '#0a1024');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#d8e6ff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawShots() {
    ctx.save();
    for (const s of shots) {
      if (!s.alive) continue;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#7ec8ff';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(s.x - 2, s.y - 11, 4, 15);
      ctx.fillStyle = '#77bfff';
      ctx.fillRect(s.x - 1, s.y - 16, 2, 5);
    }
    for (const s of enemyShots) {
      if (!s.alive) continue;
      ctx.shadowBlur = 8;
      ctx.shadowColor = s.source === 'boss' ? '#ff5f7d' : '#ffc54d';
      ctx.fillStyle = s.source === 'boss' ? '#ff8ca0' : '#ffd36e';
      const dir = normalize(s.vx, s.vy);
      ctx.beginPath();
      ctx.moveTo(s.x - dir.x * 8, s.y - dir.y * 8);
      ctx.lineTo(s.x + dir.x * 5, s.y + dir.y * 5);
      ctx.lineWidth = 4;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemies() {
    for (const e of enemies) {
      if (!e.alive || ['waiting', 'challengeWaiting', 'challengeDone'].includes(e.state)) continue;
      drawEnemy(e);
      if (e.type === 'boss' && e.carrying) drawCapturedFighter(e.x, e.y + 32, e.angle);
      if (e.state === 'tractor' && e.tractor?.phase === 'beam') drawTractorBeam(e);
    }
  }

  function drawEnemy(e) {
    const img = images[e.type];
    const size = e.type === 'boss' ? 46 : 38;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    if (img && img.complete && !img.failed && img.naturalWidth) {
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = e.type === 'boss' ? (e.hp === 1 ? '#70c4ff' : '#ff4f70') : e.type === 'butterfly' ? '#d777ff' : '#f3c64e';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(15, 12);
      ctx.lineTo(5, 7);
      ctx.lineTo(0, 18);
      ctx.lineTo(-5, 7);
      ctx.lineTo(-15, 12);
      ctx.closePath();
      ctx.fill();
      if (e.type === 'boss') {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawCapturedFighter(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ff4a55';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(12, 10);
    ctx.lineTo(0, 6);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawTractorBeam(e) {
    const tr = e.tractor;
    const pulse = 0.72 + Math.sin(state.time * 12) * 0.12;
    const height = H - 48 - e.y;
    const width = 60 + tr.hold * 44;
    ctx.save();
    const grad = ctx.createLinearGradient(0, e.y, 0, H - 48);
    grad.addColorStop(0, `rgba(70,195,255,${0.42 * pulse})`);
    grad.addColorStop(1, 'rgba(70,195,255,0.05)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(e.x - 15, e.y + 14);
    ctx.lineTo(e.x - width, e.y + height);
    ctx.lineTo(e.x + width, e.y + height);
    ctx.lineTo(e.x + 15, e.y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(150,230,255,${0.62 * pulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayer() {
    if (player.hidden) return;
    const blink = player.invuln > 0 && Math.floor(state.time * 14) % 2 === 0;
    if (blink) return;
    const offsets = player.dual ? [-18, 18] : [0];
    for (const off of offsets) drawPlayerShip(player.x + off, player.y);
  }

  function drawPlayerShip(x, y) {
    const img = images.player;
    ctx.save();
    ctx.translate(x, y);
    if (img && img.complete && !img.failed && img.naturalWidth) {
      ctx.drawImage(img, -22, -20, 44, 40);
    } else {
      ctx.fillStyle = '#f3f5ff';
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(17, 18);
      ctx.lineTo(5, 12);
      ctx.lineTo(0, 18);
      ctx.lineTo(-5, 12);
      ctx.lineTo(-17, 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d8b58f';
      ctx.fillRect(-4, -8, 8, 7);
    }
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.restore();
  }

  function drawMessage() {
    if (state.messageTimer <= 0) return;
    ctx.save();
    ctx.font = '700 20px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.66)';
    ctx.fillRect(W / 2 - 250, H - 126, 500, 36);
    ctx.fillStyle = '#f3f5ff';
    ctx.fillText(state.message, W / 2, H - 101);
    ctx.restore();
  }

  function drawPause() {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '800 48px system-ui';
    ctx.fillText('PAUSED', W / 2, H / 2);
    ctx.restore();
  }

  function showMessage(text, seconds = 2.2) {
    state.message = text;
    state.messageTimer = seconds;
  }

  function showCenter(title, text) {
    if (!ui.center) return;
    ui.center.hidden = false;
    ui.centerTitle.textContent = title;
    ui.centerText.textContent = text;
  }

  function hideCenter() {
    if (ui.center) ui.center.hidden = true;
  }

  function updateHud() {
    if (ui.score) ui.score.textContent = String(state.score).padStart(6, '0');
    if (ui.high) ui.high.textContent = String(state.high).padStart(6, '0');
    if (ui.stage) ui.stage.textContent = state.stage;
    if (ui.lives) ui.lives.textContent = `BEAN × ${Math.max(0, player.lives)}${player.dual ? ' // DUAL' : ''}`;
  }

  function setTimeoutSafe(fn, ms) {
    const expectedStage = state.stage;
    window.setTimeout(() => {
      if (state.stage === expectedStage) fn();
    }, ms);
  }

  function togglePause() {
    if (['title', 'gameover'].includes(state.mode)) return;
    state.paused = !state.paused;
  }

  function bindKeyboard() {
    window.addEventListener('keydown', e => {
      if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
      if (e.code === 'Space') {
        unlockAudio();
        if (state.mode === 'title' || state.mode === 'gameover') startGame();
        else input.fire = true;
      }
      if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    });
    window.addEventListener('keyup', e => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
      if (e.code === 'Space') input.fire = false;
    });
  }

  function bindMobile() {
    document.querySelectorAll('[data-control]').forEach(btn => {
      const name = btn.dataset.control;
      const down = e => {
        e.preventDefault();
        unlockAudio();
        if (state.mode === 'title' || state.mode === 'gameover') startGame();
        if (name === 'left') input.left = true;
        if (name === 'right') input.right = true;
        if (name === 'fire') input.fire = true;
      };
      const up = e => {
        e.preventDefault();
        if (name === 'left') input.left = false;
        if (name === 'right') input.right = false;
        if (name === 'fire') input.fire = false;
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    });

    canvas.addEventListener('pointerdown', () => {
      unlockAudio();
      if (state.mode === 'title' || state.mode === 'gameover') startGame();
    });
  }

  let previous = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - previous) / 1000);
    previous = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  bindKeyboard();
  bindMobile();
  updateHud();
  showCenter('BEAN GALAGA', 'Arrow keys / A-D to move. Space to fire. Enemy squadrons enter, form up, dive, fire, capture Bean, and can be exploited for Dual Bean.');
  requestAnimationFrame(loop);
})();