'use strict';

// Bean Galaga visual/spacing layer.
// Keeps arcade mechanics intact while replacing abstract enemies with
// unmistakably different pixel-art woodland sprites. The cabinet layer loaded
// later corrects the legacy +52px formation offset for the portrait playfield.

const THEME_FORMATION_DROP = 52;
const THEME_PLAYER_Y = H - 76;

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

// Pixel helper. Sprites are authored on a coarse logical grid so their
// silhouettes stay legible while moving quickly and while the canvas scales.
function px(x, y, w, h, fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function evilEye(x, y, damaged = false) {
  const glow = damaged ? '#ffb84d' : '#ff2343';
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 7;
  px(x, y, 4, 4, glow);
  px(x + 1, y, 2, 2, '#fff2d6');
  ctx.restore();
}

function drawPixelSquirrel(damaged, boss = false) {
  // BLACK SQUIRREL: giant tail is deliberately almost half the silhouette.
  // It should never be confused with the narrow, ear-heavy white rabbit.
  const s = boss ? 1.18 : 1;
  const black = damaged ? '#3d2228' : '#111318';
  const black2 = damaged ? '#251419' : '#050609';
  const gray = damaged ? '#8c6568' : '#626872';
  const muzzle = damaged ? '#b07d79' : '#9b8f83';
  const gold = damaged ? '#ff7b55' : '#d7ad45';

  ctx.save();
  ctx.scale(s, s);

  // Huge curled tail, offset clearly to the right.
  px(8, -15, 8, 26, black2);
  px(13, -19, 8, 22, black2);
  px(18, -15, 6, 16, black2);
  px(18, -9, 8, 12, black2);
  px(14, 2, 8, 10, black2);
  px(10, 8, 8, 8, black2);

  // Body.
  px(-8, 0, 16, 18, black);
  px(-10, 5, 20, 10, black);
  px(-5, 6, 10, 10, gray);

  // Big round head.
  px(-11, -15, 22, 16, black);
  px(-9, -18, 18, 4, black);

  // Tiny triangular-ish ears rendered as stepped pixels.
  px(-9, -23, 5, 8, black2);
  px(-7, -27, 3, 5, black2);
  px(4, -23, 5, 8, black2);
  px(4, -27, 3, 5, black2);

  // Muzzle / cheeks.
  px(-7, -7, 14, 7, muzzle);
  px(-4, -4, 8, 5, muzzle);
  px(-2, -7, 4, 3, '#0a0a0c');

  // Glowing evil eyes.
  evilEye(-7, -13, damaged);
  evilEye(3, -13, damaged);

  // Tiny cute feet.
  px(-8, 16, 7, 4, gray);
  px(2, 16, 7, 4, gray);

  if (boss) {
    // Tiny command crown + chest stripe. Still a squirrel, just management.
    px(-8, -25, 16, 4, gold);
    px(-7, -30, 4, 6, gold);
    px(-1, -33, 4, 9, gold);
    px(5, -30, 4, 6, gold);
    px(-8, 5, 16, 4, gold);
  }

  ctx.restore();
}

function drawPixelRabbit(damaged) {
  // WHITE RABBIT: very tall ears, narrow body, cotton tail, no giant side tail.
  // This silhouette is intentionally opposite the squirrel's wide shape.
  const white = damaged ? '#c7a4ac' : '#f2f2f6';
  const white2 = damaged ? '#9c737c' : '#c9cbd2';
  const pink = damaged ? '#ff8095' : '#f4a9bd';
  const outline = '#5c5e68';

  ctx.save();

  // Comically tall upright ears — the primary rabbit identifier.
  px(-9, -34, 7, 21, outline);
  px(-8, -33, 5, 19, white);
  px(-7, -30, 3, 14, pink);

  px(2, -34, 7, 21, outline);
  px(3, -33, 5, 19, white);
  px(4, -30, 3, 14, pink);

  // Big head, clearly lighter than the squirrel.
  px(-12, -16, 24, 17, outline);
  px(-11, -15, 22, 15, white);
  px(-9, -18, 18, 5, white);

  // Puffy cheeks and tiny nose.
  px(-8, -6, 16, 7, '#fffafd');
  px(-3, -5, 6, 4, pink);

  // Evil eyes with lots of white around them.
  evilEye(-7, -12, damaged);
  evilEye(3, -12, damaged);

  // Narrow round body.
  px(-8, 1, 16, 18, outline);
  px(-7, 2, 14, 16, white);
  px(-4, 7, 8, 9, white2);

  // Cotton tail on the right — small and round, NOT squirrel-like.
  px(8, 8, 7, 7, outline);
  px(9, 9, 5, 5, '#ffffff');

  // Big bunny feet.
  px(-10, 17, 9, 5, outline);
  px(-9, 17, 8, 4, white);
  px(1, 17, 9, 5, outline);
  px(2, 17, 8, 4, white);

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
  evilEye(-6, -1, false);
  evilEye(2, -1, false);
  ctx.restore();
}

drawEnemySprite = function (type, x, y, angle, damaged) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (type === 'boss') drawPixelSquirrel(damaged, true);
  else if (type === 'butterfly') drawPixelRabbit(damaged);
  else if (type === 'captured') drawCapturedBeanEnemy();
  else drawPixelSquirrel(damaged, false);

  ctx.restore();
};

// Collision areas stay close to gameplay values despite the taller rabbit ears.
enemyRadius = function (enemy) {
  if (enemy.type === 'boss') return 24;
  if (enemy.type === 'butterfly') return 20;
  if (enemy.type === 'captured') return 18;
  return 19;
};
