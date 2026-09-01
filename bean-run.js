(function () {
  'use strict';

  const canvas = document.getElementById('beanRun');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const frame = document.getElementById('runnerFrame');
  const highEl = document.getElementById('runnerHigh');
  const scoreEl = document.getElementById('runnerScore');
  const threatEl = document.getElementById('runnerThreat');
  const lightningEl = document.getElementById('runnerLightning');
  const centerEl = document.getElementById('runnerCenter');
  const centerLabelEl = document.getElementById('runnerCenterLabel');
  const centerTitleEl = document.getElementById('runnerCenterTitle');
  const centerTextEl = document.getElementById('runnerCenterText');
  const pauseButton = document.getElementById('runnerPause');
  const soundButton = document.getElementById('runnerSound');
  const toastEl = document.getElementById('runnerToast');
  const statusEl = document.getElementById('runnerStatus');

  const HEIGHT = 360;
  const GROUND_Y = 306;
  const STORAGE_KEY = 'bean-run-v2-high-score';
  const SOUND_KEY = 'bean-run-v2-sound';
  const LEGACY_KEY = 'bean_hi';
  const GRAVITY = 1800;
  const JUMP_VELOCITY = -650;
  const PLAYER_STAND = { w: 58, h: 58 };
  const PLAYER_DUCK = { w: 62, h: 38 };

  const THREAT_LEVELS = [
    { at: 0, name: 'WATCH', speed: 300, minGap: 480, maxGap: 630, flyerChance: 0 },
    { at: 250, name: 'ALERT', speed: 335, minGap: 455, maxGap: 590, flyerChance: 0.18 },
    { at: 650, name: 'PURSUIT', speed: 370, minGap: 430, maxGap: 555, flyerChance: 0.3 },
    { at: 1300, name: 'SIEGE', speed: 410, minGap: 410, maxGap: 525, flyerChance: 0.4 },
    { at: 2300, name: 'BEAN EVENT', speed: 450, minGap: 395, maxGap: 500, flyerChance: 0.48 }
  ];

  const images = loadImages({
    beanRun: 'img/bean_run.png',
    beanDuck: 'img/bean_duck.png',
    squirrel: 'img/squirrel.png',
    swordSquirrel: 'img/swordsquirrel.png'
  });

  let width = 960;
  let audioContext = null;
  let toastTimer = 0;
  let rafId = 0;

  const state = {
    mode: 'title',
    lastTime: performance.now(),
    worldTravel: 0,
    distance: 0,
    high: readHighScore(),
    speed: THREAT_LEVELS[0].speed,
    threatIndex: 0,
    nextObstacleDistance: 100,
    nextPowerDistance: 900,
    lightningReady: false,
    dodged: 0,
    destroyed: 0,
    sound: readSetting(SOUND_KEY, true),
    shake: 0,
    flash: 0
  };

  const player = {
    x: 96,
    y: GROUND_Y - PLAYER_STAND.h,
    w: PLAYER_STAND.w,
    h: PLAYER_STAND.h,
    vy: 0,
    onGround: true,
    duckHeld: false
  };

  const obstacles = [];
  const pickups = [];
  const bolts = [];
  const particles = [];
  const forest = createForest();

  bindInputs();
  resizeCanvas();
  updateSoundButton();
  updateHud();
  rafId = requestAnimationFrame(loop);

  function loop(now) {
    const dt = Math.min(0.033, Math.max(0, (now - state.lastTime) / 1000));
    state.lastTime = now;

    if (state.mode === 'playing') {
      update(dt);
    } else if (state.mode === 'title') {
      state.worldTravel += 34 * dt;
    } else if (state.mode === 'gameover') {
      state.worldTravel += 8 * dt;
    }

    state.shake = Math.max(0, state.shake - dt);
    state.flash = Math.max(0, state.flash - dt);
    draw(now);
    rafId = requestAnimationFrame(loop);
  }

  function update(dt) {
    const previousThreat = state.threatIndex;
    state.threatIndex = getThreatIndex(state.distance);
    const threat = THREAT_LEVELS[state.threatIndex];
    state.speed += (threat.speed - state.speed) * Math.min(1, dt * 2.3);

    if (state.threatIndex !== previousThreat) {
      showToast(`THREAT ${state.threatIndex + 1} // ${threat.name}`, 1800);
      announce(`Threat level ${state.threatIndex + 1}: ${threat.name}`);
      tone(245 + state.threatIndex * 45, 0.12, 'square', 0.025, 80);
    }

    const travel = state.speed * dt;
    state.worldTravel += travel;
    state.distance += travel / 17;
    state.nextObstacleDistance -= travel;
    state.nextPowerDistance -= travel;

    updatePlayer(dt);

    if (state.nextObstacleDistance <= 0) {
      spawnObstacle(threat);
      state.nextObstacleDistance = random(threat.minGap, threat.maxGap);
    }

    if (state.nextPowerDistance <= 0 && !state.lightningReady && pickups.length === 0) {
      spawnPowerup();
      state.nextPowerDistance = random(1250, 1850);
    }

    updatePickups(travel);
    if (updateObstacles(travel)) return;
    updateBolts(dt);
    updateParticles(dt);
    updateHud();
  }

  function updatePlayer(dt) {
    if (!player.onGround) {
      player.vy += GRAVITY * dt;
      player.y += player.vy * dt;
      player.w = PLAYER_STAND.w;
      player.h = PLAYER_STAND.h;
      const floor = GROUND_Y - player.h;
      if (player.y >= floor) {
        player.y = floor;
        player.vy = 0;
        player.onGround = true;
      }
      return;
    }

    const dimensions = player.duckHeld ? PLAYER_DUCK : PLAYER_STAND;
    player.w = dimensions.w;
    player.h = dimensions.h;
    player.y = GROUND_Y - player.h;
  }

  function updatePickups(travel) {
    for (let index = pickups.length - 1; index >= 0; index -= 1) {
      const pickup = pickups[index];
      pickup.x -= travel;
      pickup.rotation += travel * 0.015;

      if (pickup.x + pickup.w < -20) {
        pickups.splice(index, 1);
        continue;
      }

      if (intersects(playerBox(), insetBox(pickup, 5))) {
        pickups.splice(index, 1);
        state.lightningReady = true;
        state.nextPowerDistance = random(1200, 1800);
        updateHud();
        showToast('BEAN LIGHTNING ACQUIRED', 1500);
        announce('Lightning acquired. Strike is ready.');
        burst(pickup.x + pickup.w / 2, pickup.y + pickup.h / 2, '#a9e9ff', 22);
        tone(560, 0.16, 'sine', 0.04, 380);
      }
    }
  }

  function updateObstacles(travel) {
    for (let index = obstacles.length - 1; index >= 0; index -= 1) {
      const obstacle = obstacles[index];
      obstacle.x -= travel;
      obstacle.age += travel / Math.max(1, state.speed);

      if (!obstacle.passed && obstacle.x + obstacle.w < player.x) {
        obstacle.passed = true;
        state.dodged += 1;
        if (state.dodged % 10 === 0) showToast(`${state.dodged} HOSTILES EVADED`, 1100);
      }

      if (obstacle.x + obstacle.w < -30) {
        obstacles.splice(index, 1);
        continue;
      }

      if (intersects(playerBox(), obstacleBox(obstacle))) {
        gameOver(obstacle);
        return true;
      }
    }
    return false;
  }

  function updateBolts(dt) {
    for (let index = bolts.length - 1; index >= 0; index -= 1) {
      const bolt = bolts[index];

      if (!obstacles.includes(bolt.target)) {
        const replacement = nearestTarget();
        if (!replacement) {
          bolts.splice(index, 1);
          continue;
        }
        bolt.target = replacement;
      }

      const target = obstacleCenter(bolt.target);
      const dx = target.x - bolt.x;
      const dy = target.y - bolt.y;
      const distance = Math.hypot(dx, dy) || 1;
      const step = Math.min(bolt.speed * dt, distance);
      bolt.x += (dx / distance) * step;
      bolt.y += (dy / distance) * step;
      bolt.history.push({ x: bolt.x, y: bolt.y });
      if (bolt.history.length > 13) bolt.history.shift();

      if (distance <= 18) {
        const obstacleIndex = obstacles.indexOf(bolt.target);
        if (obstacleIndex >= 0) obstacles.splice(obstacleIndex, 1);
        bolts.splice(index, 1);
        state.destroyed += 1;
        state.flash = 0.13;
        burst(target.x, target.y, '#9ee5ff', 34);
        showToast('HOSTILE NEUTRALIZED', 900);
        tone(180, 0.14, 'sawtooth', 0.035, -90);
      }
    }
  }

  function updateParticles(dt) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.life -= dt;
      particle.vy += 260 * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.life <= 0) particles.splice(index, 1);
    }
  }

  function startGame() {
    ensureAudio();
    state.mode = 'playing';
    state.distance = 0;
    state.speed = THREAT_LEVELS[0].speed;
    state.threatIndex = 0;
    state.nextObstacleDistance = 100;
    state.nextPowerDistance = 850;
    state.lightningReady = false;
    state.dodged = 0;
    state.destroyed = 0;
    state.shake = 0;
    state.flash = 0;
    obstacles.length = 0;
    pickups.length = 0;
    bolts.length = 0;
    particles.length = 0;
    Object.assign(player, {
      x: width < 900 ? 72 : 96,
      y: GROUND_Y - PLAYER_STAND.h,
      w: PLAYER_STAND.w,
      h: PLAYER_STAND.h,
      vy: 0,
      onGround: true,
      duckHeld: false
    });
    hideCenter();
    clearToast();
    updateHud();
    canvas.focus({ preventScroll: true });
    announce('Bean deployed. Threat level one.');
    tone(220, 0.09, 'square', 0.025, 70);
  }

  function gameOver(obstacle) {
    state.mode = 'gameover';
    state.shake = 0.34;
    state.flash = 0.22;
    player.duckHeld = false;
    const score = Math.floor(state.distance);
    const isRecord = score > state.high;

    if (isRecord) {
      state.high = score;
      writeSetting(STORAGE_KEY, String(score));
    }

    updateHud();
    showCenter(
      isRecord ? 'NEW INSTITUTE RECORD' : 'FIELD TRIAL TERMINATED',
      isRecord ? `${formatScore(score)} M` : 'Bean Compromised',
      `${obstacle.type === 'flyer' ? 'Airborne' : 'Armed'} squirrel contact at ${formatScore(score)} meters. ${state.dodged} evaded; ${state.destroyed} neutralized. Tap or press Space to redeploy.`
    );
    announce(`Game over at ${score} meters.${isRecord ? ' New record.' : ''}`);
    tone(125, 0.3, 'sawtooth', 0.045, -75);
  }

  function pauseGame(reason) {
    if (state.mode !== 'playing') return;
    state.mode = 'paused';
    player.duckHeld = false;
    showCenter('SIMULATION SUSPENDED', 'Paused', `${reason || 'Press P, Escape, or Pause to resume.'}`);
    announce('Bean Run paused.');
  }

  function resumeGame() {
    if (state.mode !== 'paused') return;
    state.mode = 'playing';
    state.lastTime = performance.now();
    hideCenter();
    canvas.focus({ preventScroll: true });
    announce('Bean Run resumed.');
  }

  function togglePause() {
    if (state.mode === 'playing') pauseGame('Press P, Escape, or Pause to resume.');
    else if (state.mode === 'paused') resumeGame();
  }

  function jump() {
    if (state.mode !== 'playing' || !player.onGround) return;
    player.vy = JUMP_VELOCITY;
    player.onGround = false;
    player.w = PLAYER_STAND.w;
    player.h = PLAYER_STAND.h;
    player.y = GROUND_Y - player.h - 1;
    tone(310, 0.08, 'square', 0.022, 90);
  }

  function setDuck(active) {
    player.duckHeld = state.mode === 'playing' && Boolean(active);
  }

  function fireLightning() {
    if (state.mode !== 'playing' || !state.lightningReady) return;
    const target = nearestTarget();
    if (!target) {
      showToast('NO HOSTILE IN STRIKE RANGE', 950);
      tone(130, 0.05, 'square', 0.015, 0);
      return;
    }

    state.lightningReady = false;
    bolts.push({
      x: player.x + player.w * 0.8,
      y: player.y + player.h * 0.35,
      speed: 920,
      target,
      history: []
    });
    updateHud();
    burst(player.x + player.w * 0.8, player.y + player.h * 0.35, '#dff8ff', 12);
    tone(720, 0.1, 'sawtooth', 0.03, -210);
  }

  function spawnObstacle(threat) {
    const flyer = threat.flyerChance > 0 && Math.random() < threat.flyerChance;
    if (flyer) {
      obstacles.push({
        type: 'flyer',
        x: width + 34,
        y: GROUND_Y - 77,
        baseY: GROUND_Y - 77,
        w: 54,
        h: 40,
        age: Math.random() * 2,
        passed: false
      });
      return;
    }

    obstacles.push({
      type: 'ground',
      x: width + 34,
      y: GROUND_Y - 52,
      w: 52,
      h: 52,
      age: 0,
      passed: false
    });
  }

  function spawnPowerup() {
    pickups.push({
      x: width + 70,
      y: GROUND_Y - 102,
      w: 32,
      h: 32,
      rotation: 0
    });
  }

  function nearestTarget() {
    let target = null;
    let smallestDistance = Infinity;
    for (const obstacle of obstacles) {
      const distance = obstacle.x - (player.x + player.w);
      if (distance > -15 && distance < smallestDistance) {
        target = obstacle;
        smallestDistance = distance;
      }
    }
    return target;
  }

  function draw(now) {
    ctx.save();
    if (state.shake > 0) {
      const magnitude = 7 * (state.shake / 0.34);
      ctx.translate(random(-magnitude, magnitude), random(-magnitude, magnitude));
    }

    drawBackground();
    drawGround();
    for (const pickup of pickups) drawPowerup(pickup, now);
    for (const obstacle of obstacles) drawObstacle(obstacle);
    drawPlayer(now);
    drawBolts();
    drawParticles();

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(205,244,255,${Math.min(0.5, state.flash * 2.3)})`;
      ctx.fillRect(0, 0, width, HEIGHT);
    }
    ctx.restore();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#a9d5e8');
    sky.addColorStop(0.55, '#c9e2d5');
    sky.addColorStop(1, '#d9d4ab');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, HEIGHT);

    ctx.fillStyle = 'rgba(70,105,83,.28)';
    ctx.beginPath();
    ctx.moveTo(0, 196);
    for (let x = 0; x <= width + 80; x += 80) {
      const y = 168 + Math.sin((x + state.worldTravel * 0.04) * 0.011) * 23;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, GROUND_Y);
    ctx.lineTo(0, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    for (const layer of forest) {
      for (const tree of layer.trees) {
        const span = width + 180;
        const x = modulo(tree.x - state.worldTravel * layer.parallax, span) - 90;
        drawPine(x, GROUND_Y + tree.offsetY, tree.height, layer.leaf, layer.trunk);
      }
    }

    const haze = ctx.createLinearGradient(0, 175, 0, GROUND_Y);
    haze.addColorStop(0, 'rgba(214,228,204,0)');
    haze.addColorStop(1, 'rgba(214,228,204,.18)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 170, width, GROUND_Y - 170);
  }

  function drawGround() {
    ctx.fillStyle = '#263822';
    ctx.fillRect(0, GROUND_Y - 5, width, 7);
    ctx.fillStyle = '#352f25';
    ctx.fillRect(0, GROUND_Y + 2, width, HEIGHT - GROUND_Y);
    ctx.fillStyle = '#514838';
    const offset = -modulo(state.worldTravel * 0.65, 38);
    for (let x = offset; x < width + 40; x += 38) ctx.fillRect(Math.floor(x), GROUND_Y + 18, 21, 4);
  }

  function drawPlayer(now) {
    const ducking = player.onGround && player.duckHeld;
    const image = ducking ? images.beanDuck : images.beanRun;
    const runBob = player.onGround && state.mode !== 'paused' ? Math.sin(now * 0.02) * 1.6 : 0;
    drawSprite(image, player.x, player.y + runBob, player.w, player.h, ducking ? 0 : Math.sin(now * 0.014) * 0.018, '#d6b178', 'B');
  }

  function drawObstacle(obstacle) {
    if (obstacle.type === 'flyer') {
      const bob = Math.sin(obstacle.age * 7) * 3;
      obstacle.y = obstacle.baseY + bob;
      drawSprite(images.squirrel, obstacle.x, obstacle.y, obstacle.w, obstacle.h, Math.sin(obstacle.age * 7) * 0.08, '#191919', 'S');
      return;
    }
    drawSprite(images.swordSquirrel, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 0, '#151515', '⚔');
  }

  function drawPowerup(pickup, now) {
    const cx = pickup.x + pickup.w / 2;
    const cy = pickup.y + pickup.h / 2;
    const pulse = 0.85 + Math.sin(now * 0.012) * 0.15;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(pickup.rotation);
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = '#74d9ff';
    ctx.shadowBlur = 15 * pulse;
    ctx.fillStyle = '#eafcff';
    ctx.strokeStyle = '#68cfff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, -14);
    ctx.lineTo(5, -4);
    ctx.lineTo(0, -1);
    ctx.lineTo(8, 14);
    ctx.lineTo(-5, 4);
    ctx.lineTo(0, 1);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  function drawBolts() {
    for (const bolt of bolts) {
      for (let index = 1; index < bolt.history.length; index += 1) {
        const from = bolt.history[index - 1];
        const to = bolt.history[index];
        const alpha = index / bolt.history.length;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.strokeStyle = `rgba(128,218,255,${alpha * 0.75})`;
        ctx.lineWidth = 2 + alpha * 3;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#f5feff';
      ctx.shadowColor = '#75dcff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawParticles() {
    for (const particle of particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawSprite(image, x, y, w, h, rotation, fallbackColor, fallbackLabel) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rotation || 0);
    ctx.imageSmoothingEnabled = false;
    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = fallbackColor;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${Math.max(12, h * 0.35)}px ${getComputedStyle(document.documentElement).getPropertyValue('--mono')}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fallbackLabel, 0, 0);
    }
    ctx.restore();
  }

  function drawPine(x, baseY, height, leafColor, trunkColor) {
    const widthAtBase = height * 0.42;
    ctx.fillStyle = trunkColor;
    ctx.fillRect(x - 3, baseY - height * 0.22, 6, height * 0.22);
    ctx.fillStyle = leafColor;
    for (let tier = 0; tier < 3; tier += 1) {
      const top = baseY - height + tier * height * 0.2;
      const halfWidth = widthAtBase * (0.55 + tier * 0.2);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x - halfWidth, top + height * 0.45);
      ctx.lineTo(x + halfWidth, top + height * 0.45);
      ctx.closePath();
      ctx.fill();
    }
  }

  function createForest() {
    return [
      createForestLayer(22, 0.12, 74, 118, '#668f68', '#476347', -4),
      createForestLayer(20, 0.28, 88, 142, '#466f4c', '#35563b', 0),
      createForestLayer(16, 0.52, 104, 166, '#2f5b3b', '#284b33', 4)
    ];
  }

  function createForestLayer(count, parallax, minHeight, maxHeight, leaf, trunk, offsetY) {
    const trees = [];
    for (let index = 0; index < count; index += 1) {
      trees.push({
        x: (index / count) * 1140 + random(-22, 22),
        height: random(minHeight, maxHeight),
        offsetY: offsetY + random(-4, 4)
      });
    }
    return { trees, parallax, leaf, trunk };
  }

  function bindInputs() {
    window.addEventListener('keydown', (event) => {
      if (event.target !== canvas && event.target?.closest?.('a,button,input,select,summary,textarea')) return;
      const handled = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'KeyW', 'KeyS', 'KeyD', 'KeyX', 'KeyP', 'Escape'].includes(event.code);
      if (handled) event.preventDefault();

      if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
        if (event.repeat) return;
        if (state.mode === 'title' || state.mode === 'gameover') startGame();
        else if (state.mode === 'paused') resumeGame();
        else jump();
      }
      if (event.code === 'ArrowDown' || event.code === 'KeyS') setDuck(true);
      if ((event.code === 'ArrowRight' || event.code === 'KeyD' || event.code === 'KeyX') && !event.repeat) fireLightning();
      if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) togglePause();
    });

    window.addEventListener('keyup', (event) => {
      if (event.code === 'ArrowDown' || event.code === 'KeyS') setDuck(false);
    });

    window.addEventListener('blur', () => setDuck(false));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.mode === 'playing') pauseGame('The app lost focus. Resume when the field is clear.');
    });

    canvas.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      ensureAudio();
      if (state.mode === 'title' || state.mode === 'gameover') startGame();
      else if (state.mode === 'paused') resumeGame();
      else jump();
    });

    pauseButton.addEventListener('click', togglePause);
    soundButton.addEventListener('click', toggleSound);

    document.querySelectorAll('[data-control]').forEach((button) => {
      const control = button.dataset.control;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        button.classList.add('is-active');
        ensureAudio();
        if (state.mode === 'title' || state.mode === 'gameover') startGame();
        else if (state.mode === 'paused') resumeGame();
        if (control === 'jump') jump();
        if (control === 'duck') setDuck(true);
        if (control === 'lightning') fireLightning();
      });
      const release = () => {
        button.classList.remove('is-active');
        if (control === 'duck') setDuck(false);
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
    });

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(frame);
    window.addEventListener('beforeunload', () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    });
  }

  function resizeCanvas() {
    const nextWidth = frame.clientWidth <= 760 ? 640 : 960;
    if (nextWidth === width && canvas.width === nextWidth) return;
    const ratio = nextWidth / width;
    width = nextWidth;
    canvas.width = width;
    canvas.height = HEIGHT;
    player.x = width < 900 ? 72 : 96;
    for (const obstacle of obstacles) obstacle.x *= ratio;
    for (const pickup of pickups) pickup.x *= ratio;
    for (const bolt of bolts) bolt.x *= ratio;
    state.lastTime = performance.now();
  }

  function updateHud() {
    highEl.textContent = formatScore(state.high);
    scoreEl.textContent = `${formatScore(Math.floor(state.distance))} M`;
    const threat = THREAT_LEVELS[state.threatIndex];
    threatEl.textContent = `${state.threatIndex + 1} // ${threat.name}`;
    lightningEl.dataset.ready = String(state.lightningReady);
    lightningEl.querySelector('span').textContent = state.lightningReady ? 'READY' : 'EMPTY';
    pauseButton.textContent = state.mode === 'paused' ? 'RESUME' : 'PAUSE';
  }

  function showCenter(label, title, text) {
    centerLabelEl.textContent = label;
    centerTitleEl.textContent = title;
    centerTextEl.textContent = text;
    centerEl.hidden = false;
    updateHud();
  }

  function hideCenter() {
    centerEl.hidden = true;
    updateHud();
  }

  function showToast(message, duration) {
    window.clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.hidden = false;
    toastTimer = window.setTimeout(clearToast, duration);
  }

  function clearToast() {
    window.clearTimeout(toastTimer);
    toastEl.hidden = true;
  }

  function announce(message) {
    statusEl.textContent = '';
    window.setTimeout(() => { statusEl.textContent = message; }, 20);
  }

  function toggleSound() {
    state.sound = !state.sound;
    writeSetting(SOUND_KEY, state.sound ? 'on' : 'off');
    updateSoundButton();
    if (state.sound) {
      ensureAudio();
      tone(420, 0.08, 'sine', 0.025, 90);
    }
  }

  function updateSoundButton() {
    soundButton.textContent = state.sound ? 'SOUND' : 'MUTED';
    soundButton.setAttribute('aria-pressed', String(!state.sound));
    soundButton.setAttribute('aria-label', state.sound ? 'Mute sound' : 'Enable sound');
  }

  function ensureAudio() {
    if (!state.sound) return;
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) audioContext = new AudioCtor();
    }
    if (audioContext?.state === 'suspended') audioContext.resume().catch(() => {});
  }

  function tone(frequency, duration, type, volume, slide) {
    if (!state.sound) return;
    ensureAudio();
    if (!audioContext) return;
    const start = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(40, frequency), start);
    oscillator.frequency.linearRampToValueAtTime(Math.max(40, frequency + slide), start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  function burst(x, y, color, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const force = random(45, 230);
      const life = random(0.22, 0.55);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
        life,
        maxLife: life,
        size: random(2, 5),
        color
      });
    }
  }

  function playerBox() {
    const ducking = player.onGround && player.duckHeld;
    return ducking
      ? { x: player.x + 9, y: player.y + 8, w: player.w - 18, h: player.h - 11 }
      : { x: player.x + 9, y: player.y + 7, w: player.w - 18, h: player.h - 11 };
  }

  function obstacleBox(obstacle) {
    if (obstacle.type === 'flyer') return insetBox(obstacle, 7);
    return { x: obstacle.x + 9, y: obstacle.y + 8, w: obstacle.w - 17, h: obstacle.h - 10 };
  }

  function obstacleCenter(obstacle) {
    const box = obstacleBox(obstacle);
    return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  }

  function insetBox(object, amount) {
    return { x: object.x + amount, y: object.y + amount, w: object.w - amount * 2, h: object.h - amount * 2 };
  }

  function intersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function getThreatIndex(distance) {
    for (let index = THREAT_LEVELS.length - 1; index >= 0; index -= 1) {
      if (distance >= THREAT_LEVELS[index].at) return index;
    }
    return 0;
  }

  function readHighScore() {
    const current = Number(readSetting(STORAGE_KEY, '0')) || 0;
    const legacyLocal = Number(readSetting(LEGACY_KEY, '0')) || 0;
    let legacySession = 0;
    try { legacySession = Number(sessionStorage.getItem(LEGACY_KEY)) || 0; } catch (_) { /* Storage can be unavailable. */ }
    const high = Math.max(current, legacyLocal, legacySession);
    if (high > current) writeSetting(STORAGE_KEY, String(high));
    return high;
  }

  function readSetting(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function writeSetting(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* The game remains playable without storage. */ }
  }

  function loadImages(sources) {
    const result = {};
    for (const [name, source] of Object.entries(sources)) {
      const image = new Image();
      image.src = source;
      result[name] = image;
    }
    return result;
  }

  function formatScore(number) {
    return Math.max(0, Math.floor(number)).toString().padStart(5, '0');
  }

  function modulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }
})();
