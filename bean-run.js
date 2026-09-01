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
  const lightningValueEl = lightningEl.querySelector('span');
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
  const INTRO_DURATION = 1.7;
  const INITIAL_POWER_DISTANCE = 850;
  const POWER_COOLDOWN_MIN = 2300;
  const POWER_COOLDOWN_MAX = 3100;
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
    nextPowerDistance: INITIAL_POWER_DISTANCE,
    lightningReady: false,
    dodged: 0,
    destroyed: 0,
    sound: readSetting(SOUND_KEY, true),
    shake: 0,
    flash: 0,
    introElapsed: 0,
    chargeSpawnTimer: 0
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
  const chargeParticles = [];
  const forest = createForest();
  let backgroundCache = null;

  bindInputs();
  resizeCanvas();
  updateSoundButton();
  updateHud();
  rafId = requestAnimationFrame(loop);

  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - state.lastTime) / 1000));
    state.lastTime = now;

    if (state.mode === 'playing') {
      update(dt);
    } else if (state.mode === 'intro') {
      updateIntro(dt);
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
    if (!state.lightningReady && pickups.length === 0) {
      state.nextPowerDistance -= travel;
    }

    updatePlayer(dt);

    if (state.nextObstacleDistance <= 0) {
      spawnObstacle(threat);
      state.nextObstacleDistance = random(threat.minGap, threat.maxGap);
    }

    if (state.nextPowerDistance <= 0 && !state.lightningReady && pickups.length === 0) {
      spawnPowerup();
      state.nextPowerDistance = nextPowerCooldown();
    }

    updatePickups(travel);
    if (updateObstacles(travel)) return;
    updateBolts(dt);
    updateParticles(dt);
    updateChargeParticles(dt);
    updateHud();
  }

  function updateIntro(dt) {
    state.introElapsed = Math.min(INTRO_DURATION, state.introElapsed + dt);
    state.worldTravel += 360 * dt;
    const progress = state.introElapsed / INTRO_DURATION;
    player.x = introPlayerX(progress);
    player.y = GROUND_Y - PLAYER_STAND.h;

    if (progress >= 1) {
      state.mode = 'playing';
      player.x = playerHomeX();
      state.nextObstacleDistance = 420;
      showToast('ESCAPE ROUTE OPEN // CONTROL RESTORED', 1100);
      announce('Escape route open. Bean control restored.');
      tone(390, 0.09, 'square', 0.022, 120);
    }
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
        state.nextPowerDistance = nextPowerCooldown();
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

  function updateChargeParticles(dt) {
    state.chargeSpawnTimer -= dt;
    if (state.lightningReady) {
      while (state.chargeSpawnTimer <= 0 && chargeParticles.length < 12) {
        spawnChargeParticle();
        state.chargeSpawnTimer += random(0.035, 0.07);
      }
    } else {
      state.chargeSpawnTimer = 0;
    }

    for (let index = chargeParticles.length - 1; index >= 0; index -= 1) {
      const spark = chargeParticles[index];
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx += spark.drift * dt;
      if (spark.life <= 0) chargeParticles.splice(index, 1);
    }
  }

  function spawnChargeParticle() {
    const life = random(0.14, 0.3);
    chargeParticles.push({
      x: random(-7, player.w + 7),
      y: random(-6, player.h + 6),
      vx: random(-28, 28),
      vy: random(-76, -22),
      drift: random(-45, 45),
      life,
      maxLife: life,
      size: random(1.2, 2.3),
      warm: Math.random() < 0.2,
      bolt: Math.random() < 0.28,
      bend: random(-3.5, 3.5)
    });
  }

  function startGame() {
    ensureAudio();
    state.mode = 'intro';
    state.distance = 0;
    state.speed = THREAT_LEVELS[0].speed;
    state.threatIndex = 0;
    state.nextObstacleDistance = 100;
    state.nextPowerDistance = INITIAL_POWER_DISTANCE;
    state.lightningReady = false;
    state.dodged = 0;
    state.destroyed = 0;
    state.shake = 0;
    state.flash = 0;
    state.introElapsed = 0;
    state.chargeSpawnTimer = 0;
    obstacles.length = 0;
    pickups.length = 0;
    bolts.length = 0;
    particles.length = 0;
    chargeParticles.length = 0;
    Object.assign(player, {
      x: introPlayerX(0),
      y: GROUND_Y - PLAYER_STAND.h,
      w: PLAYER_STAND.w,
      h: PLAYER_STAND.h,
      vy: 0,
      onGround: true,
      duckHeld: false
    });
    hideCenter();
    clearToast();
    showToast('HOSTILE PURSUIT DETECTED', 1000);
    updateHud();
    canvas.focus({ preventScroll: true });
    announce('Bean deployed under hostile pursuit.');
    tone(220, 0.09, 'square', 0.025, 70);
  }

  function gameOver(obstacle) {
    state.mode = 'gameover';
    state.shake = 0.34;
    state.flash = 0.22;
    player.duckHeld = false;
    state.lightningReady = false;
    chargeParticles.length = 0;
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
      history: [],
      seed: Math.random() * 10000
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

  function nextPowerCooldown() {
    return random(POWER_COOLDOWN_MIN, POWER_COOLDOWN_MAX);
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
    if (state.mode === 'intro') drawIntroChasers(now);
    for (const pickup of pickups) drawPowerup(pickup, now);
    for (const obstacle of obstacles) drawObstacle(obstacle);
    drawPlayer();
    drawBolts(now);
    drawParticles();

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(205,244,255,${Math.min(0.5, state.flash * 2.3)})`;
      ctx.fillRect(0, 0, width, HEIGHT);
    }
    ctx.restore();
  }

  function drawBackground() {
    if (!backgroundCache) rebuildBackgroundCache();
    ctx.drawImage(backgroundCache.sky, 0, 0);

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

    for (const layer of backgroundCache.forest) {
      const offset = -modulo(state.worldTravel * layer.parallax, layer.span);
      ctx.drawImage(layer.canvas, offset, 0);
      ctx.drawImage(layer.canvas, offset + layer.span, 0);
    }

    ctx.drawImage(backgroundCache.haze, 0, 0);
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

  function drawPlayer() {
    const ducking = player.onGround && player.duckHeld;
    const image = ducking ? images.beanDuck : images.beanRun;
    drawSprite(image, player.x, player.y, player.w, player.h, 0, '#d6b178', 'B');
    if (chargeParticles.length > 0) drawChargeParticles();
  }

  function drawChargeParticles() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const spark of chargeParticles) {
      const age = 1 - spark.life / spark.maxLife;
      const alpha = Math.max(0, Math.sin(age * Math.PI));
      const x = player.x + spark.x;
      const y = player.y + spark.y;
      const glowSize = spark.size + 3;

      ctx.fillStyle = `rgba(78,196,255,${alpha * 0.22})`;
      ctx.fillRect(x - glowSize / 2, y - glowSize / 2, glowSize, glowSize);
      ctx.fillStyle = spark.warm
        ? `rgba(255,245,164,${alpha * 0.85})`
        : `rgba(238,253,255,${alpha})`;
      ctx.fillRect(x - spark.size / 2, y - spark.size / 2, spark.size, spark.size);

      if (spark.bolt) {
        const tailX = x - spark.vx * 0.09;
        const tailY = y - spark.vy * 0.09;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo((tailX + x) / 2 + spark.bend, (tailY + y) / 2 - spark.bend * 0.35);
        ctx.lineTo(x, y);
        ctx.strokeStyle = `rgba(75,195,255,${alpha * 0.46})`;
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.strokeStyle = `rgba(250,254,255,${alpha * 0.92})`;
        ctx.lineWidth = 0.65;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawIntroChasers(now) {
    const progress = Math.min(1, state.introElapsed / INTRO_DURATION);
    const retreatProgress = Math.max(0, (progress - 0.55) / 0.45);
    const retreat = retreatProgress * retreatProgress * 120;
    for (let index = 0; index < 3; index += 1) {
      const gap = 62 + index * 61;
      const stride = Math.abs(Math.sin(now * 0.017 + index * 1.8)) * 3;
      const x = player.x - gap - retreat;
      const y = GROUND_Y - 47 - stride;
      drawSprite(images.swordSquirrel, x, y, 47, 47, 0, '#151515', '⚔', true);
    }
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

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let spark = 0; spark < 5; spark += 1) {
      const angle = now * 0.0025 + spark * Math.PI * 0.4;
      const radius = 20 + Math.sin(now * 0.009 + spark) * 3;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      ctx.fillStyle = spark % 2 ? 'rgba(255,246,167,.85)' : 'rgba(174,232,255,.9)';
      ctx.shadowColor = '#78dfff';
      ctx.shadowBlur = 7;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    ctx.restore();
  }

  function drawBolts(now) {
    for (const bolt of bolts) {
      const origin = {
        x: player.x + player.w * 0.76,
        y: player.y + player.h * 0.36
      };
      const anchors = [origin, ...bolt.history];
      if (anchors.length === 1 || anchors[anchors.length - 1].x !== bolt.x || anchors[anchors.length - 1].y !== bolt.y) {
        anchors.push({ x: bolt.x, y: bolt.y });
      }

      const mainPath = buildJaggedPath(anchors, bolt.seed, now, 9);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      strokeElectricPath(mainPath, 'rgba(92,70,255,.2)', 13, '#765cff', 18);
      strokeElectricPath(mainPath, 'rgba(67,190,255,.82)', 5, '#55cfff', 11);
      strokeElectricPath(mainPath, 'rgba(249,254,255,.98)', 1.45, '#eafcff', 4);

      for (let index = 4; index < mainPath.length - 2; index += 5) {
        const point = mainPath[index];
        const previous = mainPath[index - 1];
        const dx = point.x - previous.x;
        const dy = point.y - previous.y;
        const length = Math.hypot(dx, dy) || 1;
        const direction = electricNoise(bolt.seed + index * 33 + Math.floor(now / 65)) > 0.5 ? 1 : -1;
        const branchLength = 12 + electricNoise(bolt.seed + index * 71) * 18;
        const perpendicularX = (-dy / length) * direction;
        const perpendicularY = (dx / length) * direction;
        const branch = [
          point,
          {
            x: point.x + perpendicularX * branchLength * 0.55 + dx / length * 4,
            y: point.y + perpendicularY * branchLength * 0.55 + dy / length * 4
          },
          {
            x: point.x + perpendicularX * branchLength + dx / length * 8,
            y: point.y + perpendicularY * branchLength + dy / length * 8
          }
        ];
        strokeElectricPath(branch, 'rgba(81,196,255,.5)', 3, '#61d4ff', 8);
        strokeElectricPath(branch, 'rgba(250,254,255,.82)', 0.8);
      }

      const headGlow = ctx.createRadialGradient(bolt.x, bolt.y, 0, bolt.x, bolt.y, 15);
      headGlow.addColorStop(0, 'rgba(255,255,255,1)');
      headGlow.addColorStop(0.22, 'rgba(164,233,255,.95)');
      headGlow.addColorStop(1, 'rgba(92,101,255,0)');
      ctx.fillStyle = headGlow;
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function buildJaggedPath(anchors, seed, now, jitter) {
    const points = [anchors[0]];
    const frame = Math.floor(now / 48);
    for (let index = 1; index < anchors.length; index += 1) {
      const from = anchors[index - 1];
      const to = anchors[index];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const perpendicularX = -dy / length;
      const perpendicularY = dx / length;
      const offset = (electricNoise(seed + frame * 97 + index * 43) - 0.5) * jitter * 2;
      points.push({
        x: (from.x + to.x) / 2 + perpendicularX * offset,
        y: (from.y + to.y) / 2 + perpendicularY * offset
      });
      points.push(to);
    }
    return points;
  }

  function strokeElectricPath(points, color, lineWidth, shadowColor, shadowBlur) {
    if (points.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    if (shadowColor) ctx.shadowColor = shadowColor;
    if (shadowBlur) ctx.shadowBlur = shadowBlur;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index].x, points[index].y);
    ctx.stroke();
    ctx.restore();
  }

  function electricNoise(seed) {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function drawParticles() {
    for (const particle of particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawSprite(image, x, y, w, h, rotation, fallbackColor, fallbackLabel, flipX) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rotation || 0);
    if (flipX) ctx.scale(-1, 1);
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

  function drawPine(target, x, baseY, height, leafColor, trunkColor) {
    const widthAtBase = height * 0.42;
    target.fillStyle = trunkColor;
    target.fillRect(x - 3, baseY - height * 0.22, 6, height * 0.22);
    target.fillStyle = leafColor;
    for (let tier = 0; tier < 3; tier += 1) {
      const top = baseY - height + tier * height * 0.2;
      const halfWidth = widthAtBase * (0.55 + tier * 0.2);
      target.beginPath();
      target.moveTo(x, top);
      target.lineTo(x - halfWidth, top + height * 0.45);
      target.lineTo(x + halfWidth, top + height * 0.45);
      target.closePath();
      target.fill();
    }
  }

  function rebuildBackgroundCache() {
    const sky = document.createElement('canvas');
    sky.width = width;
    sky.height = HEIGHT;
    const skyContext = sky.getContext('2d');
    const skyGradient = skyContext.createLinearGradient(0, 0, 0, GROUND_Y);
    skyGradient.addColorStop(0, '#a9d5e8');
    skyGradient.addColorStop(0.55, '#c9e2d5');
    skyGradient.addColorStop(1, '#d9d4ab');
    skyContext.fillStyle = skyGradient;
    skyContext.fillRect(0, 0, width, HEIGHT);

    const haze = document.createElement('canvas');
    haze.width = width;
    haze.height = HEIGHT;
    const hazeContext = haze.getContext('2d');
    const hazeGradient = hazeContext.createLinearGradient(0, 175, 0, GROUND_Y);
    hazeGradient.addColorStop(0, 'rgba(214,228,204,0)');
    hazeGradient.addColorStop(1, 'rgba(214,228,204,.18)');
    hazeContext.fillStyle = hazeGradient;
    hazeContext.fillRect(0, 170, width, GROUND_Y - 170);

    const cachedForest = forest.map((layer) => {
      const span = width + 180;
      const layerCanvas = document.createElement('canvas');
      layerCanvas.width = span;
      layerCanvas.height = HEIGHT;
      const layerContext = layerCanvas.getContext('2d');
      layerContext.imageSmoothingEnabled = false;
      for (const tree of layer.trees) {
        const x = modulo((tree.x / 1140) * span, span);
        for (const shift of [-span, 0, span]) {
          drawPine(layerContext, x + shift, GROUND_Y + tree.offsetY, tree.height, layer.leaf, layer.trunk);
        }
      }
      return { canvas: layerCanvas, span, parallax: layer.parallax };
    });

    backgroundCache = { sky, haze, forest: cachedForest };
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
    if (nextWidth === width && canvas.width === nextWidth && backgroundCache) return;
    const ratio = nextWidth / width;
    width = nextWidth;
    canvas.width = width;
    canvas.height = HEIGHT;
    player.x = state.mode === 'intro'
      ? introPlayerX(state.introElapsed / INTRO_DURATION)
      : playerHomeX();
    for (const obstacle of obstacles) obstacle.x *= ratio;
    for (const pickup of pickups) pickup.x *= ratio;
    for (const bolt of bolts) bolt.x *= ratio;
    rebuildBackgroundCache();
    state.lastTime = performance.now();
  }

  function updateHud() {
    setText(highEl, formatScore(state.high));
    setText(scoreEl, `${formatScore(Math.floor(state.distance))} M`);
    const threat = THREAT_LEVELS[state.threatIndex];
    setText(threatEl, `${state.threatIndex + 1} // ${threat.name}`);
    const lightningReady = String(state.lightningReady);
    if (lightningEl.dataset.ready !== lightningReady) lightningEl.dataset.ready = lightningReady;
    setText(lightningValueEl, state.lightningReady ? 'READY' : 'EMPTY');
    setText(pauseButton, state.mode === 'paused' ? 'RESUME' : 'PAUSE');
  }

  function setText(element, value) {
    if (element.textContent !== value) element.textContent = value;
  }

  function playerHomeX() {
    return width < 900 ? 72 : 96;
  }

  function introPlayerX(progress) {
    const home = playerHomeX();
    const chasePosition = Math.min(width * 0.46, home + 260);
    const clamped = Math.min(1, Math.max(0, progress));
    if (clamped < 0.28) {
      const enter = clamped / 0.28;
      const easedOut = 1 - Math.pow(1 - enter, 3);
      return home + (chasePosition - home) * easedOut;
    }
    const settle = (clamped - 0.28) / 0.72;
    const easedSettle = settle < 0.5
      ? 4 * settle * settle * settle
      : 1 - Math.pow(-2 * settle + 2, 3) / 2;
    return chasePosition + (home - chasePosition) * easedSettle;
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
