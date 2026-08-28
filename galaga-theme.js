'use strict';

// Bean Galaga visual/spacing layer.
// Keeps arcade mechanics intact while replacing abstract enemy ships with
// cute-but-evil woodland fauna. The cabinet layer loaded later corrects the
// legacy landscape spacing offsets for the portrait playfield.

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

// --- Cute evil fauna renderer --------------------------------------------

function themeTriangle(ax, ay, bx, by, cx, cy, fill, stroke = '#101114') {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

function themeGlowEye(x, y, damaged, size = 3.4) {
  ctx.save();
  ctx.shadowColor = damaged ? '#ffb347' : '#ff1f3d';
  ctx.shadowBlur = damaged ? 6 : 8;
  ctx.fillStyle = damaged ? '#ffd06a' : '#ff2947';
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawCuteEvilSquirrel(damaged, boss = false) {
  const scale = boss ? 1.22 : 1;
  const fur = damaged ? '#3d272b' : '#17191d';
  const furDark = damaged ? '#211518' : '#08090b';
  const furLight = damaged ? '#836466' : '#62666d';
  const muzzle = damaged ? '#a9807c' : '#8b8178';
  const outline = '#050608';

  ctx.save();
  ctx.scale(scale, scale);

  // Giant soft, curled black-squirrel tail behind the body.
  ctx.beginPath();
  ctx.moveTo(8, 7);
  ctx.bezierCurveTo(24, 14, 28, 2, 19, -4);
  ctx.bezierCurveTo(30, -12, 26, -27, 13, -26);
  ctx.bezierCurveTo(21, -20, 18, -12, 10, -9);
  ctx.bezierCurveTo(17, -3, 15, 4, 8, 7);
  ctx.closePath();
  ctx.fillStyle = furDark;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Round chibi body.
  ctx.beginPath();
  ctx.ellipse(0, 7, 10.5, 11.5, 0, 0, TAU);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Soft tummy patch.
  ctx.beginPath();
  ctx.ellipse(0, 9, 5.3, 6.6, 0, 0, TAU);
  ctx.fillStyle = furLight;
  ctx.fill();

  // Oversized cute head.
  ctx.beginPath();
  ctx.ellipse(0, -6, 12.5, 11.5, 0, 0, TAU);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Small pointed ears.
  themeTriangle(-9, -12, -6, -21, -2, -13, furDark, outline);
  themeTriangle(9, -12, 6, -21, 2, -13, furDark, outline);

  // Round muzzle cheeks.
  ctx.beginPath();
  ctx.ellipse(-3.2, -1.5, 4.4, 3.6, -0.12, 0, TAU);
  ctx.ellipse(3.2, -1.5, 4.4, 3.6, 0.12, 0, TAU);
  ctx.fillStyle = muzzle;
  ctx.fill();

  // Tiny nose and mouth.
  ctx.fillStyle = '#050506';
  ctx.beginPath();
  ctx.arc(0, -3.5, 1.8, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#171215';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(0, 1.2);
  ctx.quadraticCurveTo(-2.4, 3.2, -4.2, 1.8);
  ctx.moveTo(0, 1.2);
  ctx.quadraticCurveTo(2.4, 3.2, 4.2, 1.8);
  ctx.stroke();

  // Tiny blush dots make them cute. The red eyes keep them evil.
  ctx.fillStyle = damaged ? '#b15a61' : '#50323a';
  ctx.beginPath();
  ctx.arc(-7.6, -2.4, 1.3, 0, TAU);
  ctx.arc(7.6, -2.4, 1.3, 0, TAU);
  ctx.fill();

  themeGlowEye(-4.6, -7.5, damaged, boss ? 4 : 3.6);
  themeGlowEye(4.6, -7.5, damaged, boss ? 4 : 3.6);

  // Little tucked paws.
  ctx.fillStyle = furLight;
  ctx.beginPath();
  ctx.ellipse(-6.1, 14.5, 3.1, 2.2, -0.2, 0, TAU);
  ctx.ellipse(6.1, 14.5, 3.1, 2.2, 0.2, 0, TAU);
  ctx.fill();

  if (boss) {
    // Boss squirrel: still cute, just wearing tiny command armor/crown.
    ctx.fillStyle = damaged ? '#df704c' : '#d3aa43';
    ctx.strokeStyle = '#2b1d0e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8.5, -15.5);
    ctx.lineTo(-5.5, -24);
    ctx.lineTo(-1.5, -18.5);
    ctx.lineTo(3.5, -25.5);
    ctx.lineTo(8.5, -15.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = damaged ? '#7c2e28' : '#78652d';
    ctx.beginPath();
    ctx.roundRect(-9.5, 2.5, 19, 5.5, 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawCuteEvilRabbit(damaged) {
  const fur = damaged ? '#b69ca4' : '#ececf1';
  const shadow = damaged ? '#76565f' : '#a8aab4';
  const inner = damaged ? '#ff8fa0' : '#efb2c3';
  const cheek = damaged ? '#d77c89' : '#f4b8c5';
  const outline = '#4d4f58';

  ctx.save();

  // Soft floppy-ish ears instead of weapon-shaped demon ears.
  ctx.save();
  ctx.rotate(-0.09);
  ctx.beginPath();
  ctx.ellipse(-5.8, -20, 4.8, 13, -0.05, 0, TAU);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-5.8, -20, 2, 8.5, -0.05, 0, TAU);
  ctx.fillStyle = inner;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.rotate(0.09);
  ctx.beginPath();
  ctx.ellipse(5.8, -20, 4.8, 13, 0.05, 0, TAU);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(5.8, -20, 2, 8.5, 0.05, 0, TAU);
  ctx.fillStyle = inner;
  ctx.fill();
  ctx.restore();

  // Small round body.
  ctx.beginPath();
  ctx.ellipse(0, 8.5, 10.5, 10.5, 0, 0, TAU);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.9;
  ctx.stroke();

  // Tiny cotton tail peeking behind.
  ctx.beginPath();
  ctx.arc(10, 10, 4, 0, TAU);
  ctx.fillStyle = '#fafaff';
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Oversized bunny head.
  ctx.beginPath();
  ctx.ellipse(0, -5.5, 12.5, 11, 0, 0, TAU);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.9;
  ctx.stroke();

  // Puffy cheeks.
  ctx.beginPath();
  ctx.ellipse(-4, 0.3, 4.5, 3.7, -0.12, 0, TAU);
  ctx.ellipse(4, 0.3, 4.5, 3.7, 0.12, 0, TAU);
  ctx.fillStyle = '#fffafd';
  ctx.fill();

  // Pink blush.
  ctx.fillStyle = cheek;
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.ellipse(-8, -1, 2.4, 1.5, 0, 0, TAU);
  ctx.ellipse(8, -1, 2.4, 1.5, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Tiny pink nose and harmless-looking smile.
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.moveTo(-2.1, -2.5);
  ctx.lineTo(2.1, -2.5);
  ctx.lineTo(0, 0.3);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#765d65';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, 0.3);
  ctx.lineTo(0, 2.8);
  ctx.quadraticCurveTo(-2.4, 4.7, -4, 3.4);
  ctx.moveTo(0, 2.8);
  ctx.quadraticCurveTo(2.4, 4.7, 4, 3.4);
  ctx.stroke();

  // Evil part: glowing crimson arcade eyes.
  themeGlowEye(-4.5, -7.2, damaged, 3.5);
  themeGlowEye(4.5, -7.2, damaged, 3.5);

  // Little feet/paws.
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(-5.5, 16.2, 3.2, 2.2, -0.12, 0, TAU);
  ctx.ellipse(5.5, 16.2, 3.2, 2.2, 0.12, 0, TAU);
  ctx.fill();

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

  if (type === 'boss') drawCuteEvilSquirrel(damaged, true);
  else if (type === 'butterfly') drawCuteEvilRabbit(damaged);
  else if (type === 'captured') drawCapturedBeanEnemy();
  else drawCuteEvilSquirrel(damaged, false);

  ctx.restore();
};

// Match collision silhouettes to the new art without making the game unfair.
enemyRadius = function (enemy) {
  if (enemy.type === 'boss') return 24;
  if (enemy.type === 'butterfly') return 20;
  if (enemy.type === 'captured') return 18;
  return 19;
};
