'use strict';

// Bean Galaga visual/spacing layer.
// Keeps gameplay intact while rendering cute, highly distinct woodland enemies.
// The cabinet layer loaded after this file cancels the legacy landscape Y offset.

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

function svgSprite(markup) {
  const image = new Image();
  image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
  return image;
}

const squirrelSprite = svgSprite(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
  <g stroke="#050608" stroke-width="2.2" stroke-linejoin="round">
    <path fill="#090b0f" d="M48 49c14-1 21-10 18-21-2-9-10-12-16-7 7 1 10 5 8 10-2 6-7 7-13 8 7-7 8-15 2-21-5-5-13-4-18 1 8 1 12 5 12 12 0 5-2 10-6 15z"/>
    <ellipse fill="#171a20" cx="34" cy="45" rx="15" ry="16"/>
    <ellipse fill="#5c6169" cx="34" cy="49" rx="7.5" ry="9" stroke="none"/>
    <ellipse fill="#171a20" cx="34" cy="28" rx="17" ry="15"/>
    <path fill="#090b0f" d="M21 20l2-13 9 11zM47 20L45 7l-9 11z"/>
    <ellipse fill="#958b81" cx="28.5" cy="34" rx="7" ry="5.5" stroke="none"/>
    <ellipse fill="#958b81" cx="39.5" cy="34" rx="7" ry="5.5" stroke="none"/>
    <circle fill="#050608" cx="34" cy="31" r="2.7" stroke="none"/>
    <path d="M34 34v4m0 0c-3 3-6 2-8 0m8 0c3 3 6 2 8 0" fill="none" stroke="#2b2023" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse fill="#676c74" cx="24" cy="58" rx="6" ry="3.5"/>
    <ellipse fill="#676c74" cx="44" cy="58" rx="6" ry="3.5"/>
  </g>
  <g fill="#ff2947">
    <circle cx="27.5" cy="25" r="2.6"/><circle cx="40.5" cy="25" r="2.6"/>
  </g>
  <g fill="none" stroke="#ff2947" stroke-width="1" opacity=".55">
    <circle cx="27.5" cy="25" r="4.3"/><circle cx="40.5" cy="25" r="4.3"/>
  </g>
</svg>`);

const bossSquirrelSprite = svgSprite(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 76">
  <g stroke="#050608" stroke-width="2.2" stroke-linejoin="round">
    <path fill="#090b0f" d="M51 53c15-1 22-11 19-23-2-10-11-13-17-7 8 1 11 6 9 11-2 6-8 8-14 9 8-8 8-17 2-23-6-6-14-5-20 1 8 1 13 6 13 13 0 6-3 11-7 16z"/>
    <ellipse fill="#171a20" cx="36" cy="48" rx="16" ry="17"/>
    <ellipse fill="#5c6169" cx="36" cy="51" rx="8" ry="9.5" stroke="none"/>
    <ellipse fill="#171a20" cx="36" cy="30" rx="18" ry="16"/>
    <path fill="#090b0f" d="M22 21l2-14 9 12zM50 21L48 7l-9 12z"/>
    <ellipse fill="#958b81" cx="30" cy="36" rx="7.5" ry="5.5" stroke="none"/>
    <ellipse fill="#958b81" cx="42" cy="36" rx="7.5" ry="5.5" stroke="none"/>
    <circle fill="#050608" cx="36" cy="33" r="2.8" stroke="none"/>
    <path d="M36 36v4m0 0c-3 3-7 2-9 0m9 0c3 3 7 2 9 0" fill="none" stroke="#2b2023" stroke-width="1.7" stroke-linecap="round"/>
    <ellipse fill="#676c74" cx="25" cy="62" rx="6" ry="3.5"/>
    <ellipse fill="#676c74" cx="47" cy="62" rx="6" ry="3.5"/>
    <path fill="#d8ad45" d="M23 16l4-11 8 8 7-10 6 12z"/>
    <rect fill="#8b7334" x="24" y="48" width="24" height="6" rx="3"/>
  </g>
  <g fill="#ff2947">
    <circle cx="29" cy="27" r="2.8"/><circle cx="43" cy="27" r="2.8"/>
  </g>
  <g fill="none" stroke="#ff2947" stroke-width="1" opacity=".55">
    <circle cx="29" cy="27" r="4.6"/><circle cx="43" cy="27" r="4.6"/>
  </g>
</svg>`);

const rabbitSprite = svgSprite(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 84">
  <g stroke="#555964" stroke-width="2.1" stroke-linejoin="round">
    <ellipse fill="#f3f3f7" cx="25" cy="17" rx="7" ry="17" transform="rotate(-8 25 17)"/>
    <ellipse fill="#f3f3f7" cx="47" cy="17" rx="7" ry="17" transform="rotate(8 47 17)"/>
    <ellipse fill="#f2a9bd" cx="25" cy="17" rx="3" ry="12" transform="rotate(-8 25 17)" stroke="none"/>
    <ellipse fill="#f2a9bd" cx="47" cy="17" rx="3" ry="12" transform="rotate(8 47 17)" stroke="none"/>
    <ellipse fill="#f2f2f6" cx="36" cy="57" rx="15" ry="17"/>
    <circle fill="#ffffff" cx="54" cy="60" r="6"/>
    <ellipse fill="#f4f4f8" cx="36" cy="38" rx="18" ry="16"/>
    <ellipse fill="#fffafd" cx="29" cy="45" rx="8" ry="6" stroke="none"/>
    <ellipse fill="#fffafd" cx="43" cy="45" rx="8" ry="6" stroke="none"/>
    <path fill="#f2a9bd" d="M32 42h8l-4 5z" stroke="none"/>
    <path d="M36 47v4m0 0c-3 3-6 2-8 0m8 0c3 3 6 2 8 0" fill="none" stroke="#765d65" stroke-width="1.5" stroke-linecap="round"/>
    <ellipse fill="#d1d3dc" cx="26" cy="72" rx="8" ry="4"/>
    <ellipse fill="#d1d3dc" cx="46" cy="72" rx="8" ry="4"/>
  </g>
  <ellipse fill="#f4b5c5" opacity=".75" cx="22" cy="46" rx="4" ry="2.4"/>
  <ellipse fill="#f4b5c5" opacity=".75" cx="50" cy="46" rx="4" ry="2.4"/>
  <g fill="#ff2947">
    <circle cx="29" cy="36" r="2.7"/><circle cx="43" cy="36" r="2.7"/>
  </g>
  <g fill="none" stroke="#ff2947" stroke-width="1" opacity=".55">
    <circle cx="29" cy="36" r="4.5"/><circle cx="43" cy="36" r="4.5"/>
  </g>
</svg>`);

function drawSpriteImage(image, width, height, damaged) {
  if (!image.complete || !image.naturalWidth) return false;
  ctx.save();
  if (damaged) ctx.filter = 'sepia(.75) saturate(2.3) hue-rotate(325deg)';
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
  return true;
}

function drawFallbackCritter(type, damaged) {
  ctx.save();
  ctx.fillStyle = type === 'butterfly' ? '#f2f2f6' : '#15171b';
  ctx.strokeStyle = type === 'butterfly' ? '#5b5e68' : '#050608';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, type === 'boss' ? 20 : 17, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = damaged ? '#ffd06a' : '#ff2947';
  ctx.beginPath(); ctx.arc(-6, -4, 2.5, 0, TAU); ctx.arc(6, -4, 2.5, 0, TAU); ctx.fill();
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
  ctx.fillStyle = '#ff2947';
  ctx.beginPath(); ctx.arc(-6, -1, 2.4, 0, TAU); ctx.arc(6, -1, 2.4, 0, TAU); ctx.fill();
  ctx.restore();
}

drawEnemySprite = function (type, x, y, angle, damaged) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (type === 'boss') {
    if (!drawSpriteImage(bossSquirrelSprite, 53, 53, damaged)) drawFallbackCritter(type, damaged);
  } else if (type === 'butterfly') {
    if (!drawSpriteImage(rabbitSprite, 43, 50, damaged)) drawFallbackCritter(type, damaged);
  } else if (type === 'captured') {
    drawCapturedBeanEnemy();
  } else {
    if (!drawSpriteImage(squirrelSprite, 45, 45, damaged)) drawFallbackCritter(type, damaged);
  }

  ctx.restore();
};

enemyRadius = function (enemy) {
  if (enemy.type === 'boss') return 24;
  if (enemy.type === 'butterfly') return 20;
  if (enemy.type === 'captured') return 18;
  return 19;
};
