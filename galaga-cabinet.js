'use strict';

// Arcade cabinet geometry correction.
// The original Galaga raster is 224x288 (7:9 portrait). beangalaga.html now
// uses a 560x720 logical canvas: an exact 2.5x scale of that aspect ratio.

// galaga-theme.js intentionally lowered the formation for the old landscape
// canvas. On the real portrait geometry that compression is wrong, so remove
// that +52px drop and then tighten the formation width around screen center.
const cabinetBaseFormationSlot = formationSlot;
formationSlot = function (enemy) {
  const p = cabinetBaseFormationSlot(enemy);
  const x = W / 2 + (p.x - W / 2) * 0.82;
  return { x, y: p.y - 52 };
};

// The arcade fighter sits near the bottom but leaves room for reserve/lane UI.
// Keep the theme baseline (~89% of playfield height) and scale horizontal
// movement to the narrower cabinet so Bean does not become absurdly fast.
player.y = H - 76;
player.speed = 300;

const cabinetBaseBeginStage = beginStage;
beginStage = function () {
  const result = cabinetBaseBeginStage();
  if (!player.capture) player.y = H - 76;
  return result;
};

const cabinetBaseStartNewGame = startNewGame;
startNewGame = function () {
  const result = cabinetBaseStartNewGame();
  if (!player.capture) player.y = H - 76;
  return result;
};

const cabinetBaseUpdateLifeLost = updateLifeLost;
updateLifeLost = function (dt) {
  const result = cabinetBaseUpdateLifeLost(dt);
  if (!player.capture) player.y = H - 76;
  return result;
};

const cabinetBaseCompleteCapture = completeCapture;
completeCapture = function (boss) {
  const result = cabinetBaseCompleteCapture(boss);
  player.y = H - 76;
  return result;
};
