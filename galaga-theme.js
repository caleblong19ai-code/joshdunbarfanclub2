'use strict';

// Bean Galaga visual/spacing layer.
// Keeps arcade mechanics intact while closing the dead vertical gap and
// replacing the abstract enemy ships with hostile woodland fauna.

const THEME_FORMATION_DROP = 52;
const THEME_PLAYER_Y = H - 76;

// --- Battlefield spacing -------------------------------------------------

const themeBaseFormationSlot = formationSlot;
formationSlot = function (enemy) {
  const p = themeBaseFormationSlot(enemy);
  return { x: p.x, y: p.y + THEME_FORMATION_DROP };
};

function themePinPlayerY() {
  if (!player.capture) player.y = THEME_PLAYER_Y;
}

player.y = THEME_PLAYER_Y;

const themeBaseBeginStage = beginStage;
beginStage = function () {
  const result = themeBaseBeginStage();
  themePinPlayerY();
  return result;
};

const themeBaseStartNewGame = startNewGame;
startNewGame = function () {
  const result = themeBaseStartNewGame();
  themePinPlayerY();
  return result;
};

const themeBaseUpdateLifeLost = updateLifeLost;
updateLifeLost = function (dt) {
  const result = themeBaseUpdateLifeLost(dt);
  themePinPlayerY();
  return result;
};

const themeBaseCompleteCapture = completeCapture;
completeCapture = function (boss) {
  const result = themeBaseCompleteCapture(boss);
  player.y = THEME_PLAYER_Y;
  return result;
};

// --- Hostile fauna renderer ----------------------------------------------

function themeTriangle(ax, ay, bx, by, cx, cy, fill, stroke = '#140d0b') {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.8;
  ctx.stroke();
}

function themeGlowEye(x, y, damaged) {
  ctx.save();
  ctx.shadowColor = damaged ? '#ffb347' : '#ff2438';
  ctx.shadowBlur = 7;
  ctx.fillStyle = damaged ? '#ffd36a' : '#ff3048';
  ctx.fillRect(x - 2, y - 2, 4, 4);
  ctx.restore();
}

function themeFang(x, y, flip = 1) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 3 * flip, y + 5);
  ctx.lineTo(x + 5 * flip, y);
  ctx.closePath();
  ctx.fillStyle = '#fff4df';
  ctx.fill();
}

function drawEvilSquirrel(damaged, boss = false) {
  const scale = boss ? 1.23 : 1;
  const fur = damaged ? '#9b3f28' : boss ? '#38261f' : '#7a4a2d';
  const furDark = damaged ? '#5c2119' : boss ? '#160f0d' : '#402718';
  const belly = damaged ? '#d97a50' : boss ? '#856147' : '#b77b4a';

  ctx.save();
  ctx.scale(scale, scale);

  // Huge curled tail behind the body: the silhouette should read as squirrel
  // even when the sprite is moving quickly through a bombing run.
  ctx.beginPath();
  ctx.moveTo(8, 8);
  ctx.bezierCurveTo(25, 15, 27, 0, 17, -4);
  ctx.bezierCurveTo(28, -12, 24, -27, 11, -25);
  ctx.bezierCurveTo(20, -19, 16, -11, 8, -9);
  ctx.bezierCurveTo(15, -2, 14, 4, 8, 8);
  ctx.closePath();
  ctx.fillStyle = furDark;
  ctx.fill();
  ctx.strokeStyle = '#120b09';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Body.
  ctx.beginPath();
  ctx.ellipse(0, 6, 10.5, 13, 0, 0, TAU);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.strokeStyle = '#120b09';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, 8, 5.2, 8, 0, 0, TAU);
  ctx.fillStyle = belly;
  ctx.fill();

  // Head and pointed ears face the local -Y direction; the game's existing
  // rotation code then points the animal along its actual flight path.
  ctx.beginPath();
  ctx.ellipse(0, -8, 11.5, 10, 0, 0, TAU);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.strokeStyle = '#120b09';
  ctx.lineWidth = 2;
  ctx.stroke();

  themeTriangle(-9, -13, -7, -24, -1, -15, furDark);
  themeTriangle(9, -13, 7, -24, 1, -15, furDark);

  // Snout.
  ctx.beginPath();
  ctx.ellipse(0, -3, 6.5, 4.6, 0, 0, TAU);
  ctx.fillStyle = belly;
  ctx.fill();
  ctx.fillStyle = '#15100f';
  ctx.beginPath();
  ctx.arc(0, -6, 2.2, 0, TAU);
  ctx.fill();

  themeGlowEye(-5, -10, damaged);
  themeGlowEye(5, -10, damaged);
  themeFang(-4, -1, 1);
  themeFang(4, -1, -1);

  // Tiny claws.
  ctx.strokeStyle = '#ead8c0';
  ctx.lineWidth = 1.4;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 8, 12);
    ctx.lineTo(side * 13, 15);
    ctx.moveTo(side * 8, 14);
    ctx.lineTo(side * 13, 18);
    ctx.stroke();
  }

  if (boss) {
    // Boss Galaga becomes an armored alpha squirrel. The crown/spikes preserve
    // the larger, immediately recognizable boss silhouette.
    ctx.fillStyle = damaged ? '#ff704d' : '#d3a53b';
    ctx.strokeStyle = '#1b120d';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-10, -20);
    ctx.lineTo(-7, -30);
    ctx.lineTo(-1, -23);
    ctx.lineTo(4, -32);
    ctx.lineTo(9, -21);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = damaged ? '#7c2017' : '#6f5520';
    ctx.fillRect(-10, 1, 20, 6);
    ctx.strokeRect(-10, 1, 20, 6);
  }

  ctx.restore();
}

function drawEvilRabbit(damaged) {
  const fur = damaged ? '#9f394d' : '#696b78';
  const furDark = damaged ? '#5e1e2d' : '#30313a';
  const inner = damaged ? '#ff8b9b' : '#b98093';

  ctx.save();

  // Long ears, angled slightly outward for a strong arcade silhouette.
  ctx.save();
  ctx.rotate(-0.12);
  ctx.beginPath();
  ctx.ellipse(-6, -20, 5, 14, 0, 0, TAU);
  ctx.fillStyle = furDark;
  ctx.fill();
  ctx.strokeStyle = '#121217';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-6, -20, 2.2, 9.5, 0, 0, TAU);
  ctx.fillStyle = inner;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.rotate(0.12);
  ctx.beginPath();
  ctx.ellipse(6, -20, 5, 14, 0, 0, TAU);
  ctx.fillStyle = furDark;
  ctx.fill();
  ctx.strokeStyle = '#121217';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(6, -20, 2.2, 9.5, 0, 0, TAU);
  ctx.fillStyle = inner;
  ctx.fill();
  ctx.restore();

  // Body and head.
  ctx.beginPath();
  ctx.ellipse(0, 7, 11, 12, 0, 0, TAU);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.strokeStyle = '#121217';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, -8, 12, 10.5, 0, 0, TAU);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.stroke();

  // Angry brows and glowing eyes.
  ctx.strokeStyle = '#171218';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-9, -14);
  ctx.lineTo(-3, -11);
  ctx.moveTo(9, -14);
  ctx.lineTo(3, -11);
  ctx.stroke();
  themeGlowEye(-5, -9, damaged);
  themeGlowEye(5, -9, damaged);

  // Nose + extremely unnecessary murder teeth.
  ctx.fillStyle = '#d88d99';
  ctx.beginPath();
  ctx.moveTo(-2.5, -4);
  ctx.lineTo(2.5, -4);
  ctx.lineTo(0, -1);
  ctx.closePath();
  ctx.fill();
  themeFang(-4, 0, 1);
  themeFang(4, 0, -1);

  // Paws reaching forward/down the flight path.
  ctx.strokeStyle = '#dedee6';
  ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 7, 9);
    ctx.lineTo(side * 13, 15);
    ctx.moveTo(side * 8, 12);
    ctx.lineTo(side * 14, 18);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCapturedBeanEnemy() {
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#971d2c';
  ctx.strokeStyle = '#ff7584';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(17, 14);
  ctx.lineTo(0, 8);
  ctx.lineTo(-17, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  themeGlowEye(-5, 1, false);
  themeGlowEye(5, 1, false);
  ctx.restore();
}

drawEnemySprite = function (type, x, y, angle, damaged) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (type === 'boss') drawEvilSquirrel(damaged, true);
  else if (type === 'butterfly') drawEvilRabbit(damaged);
  else if (type === 'captured') drawCapturedBeanEnemy();
  else drawEvilSquirrel(damaged, false);

  ctx.restore();
};

// Match collision silhouettes to the new art without making the game unfair.
enemyRadius = function (enemy) {
  if (enemy.type === 'boss') return 24;
  if (enemy.type === 'butterfly') return 20;
  if (enemy.type === 'captured') return 18;
  return 19;
};
