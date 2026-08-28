'use strict';

// V9 spacing correction.
// V8 compressed the battlefield too aggressively. Keep a modest reduction
// from the original layout while restoring a clear Galaga-style no-man's-land.

const V9_PLAYER_Y = H - 66;
const V9_FORMATION_CORRECTION = -30; // galaga-theme.js adds 52; net drop becomes 22.

const v9BaseFormationSlot = formationSlot;
formationSlot = function (enemy) {
  const p = v9BaseFormationSlot(enemy);
  return { x: p.x, y: p.y + V9_FORMATION_CORRECTION };
};

function v9PinPlayerY() {
  if (!player.capture) player.y = V9_PLAYER_Y;
}

player.y = V9_PLAYER_Y;

const v9BaseBeginStage = beginStage;
beginStage = function () {
  const result = v9BaseBeginStage();
  v9PinPlayerY();
  return result;
};

const v9BaseStartNewGame = startNewGame;
startNewGame = function () {
  const result = v9BaseStartNewGame();
  v9PinPlayerY();
  return result;
};

const v9BaseUpdateLifeLost = updateLifeLost;
updateLifeLost = function (dt) {
  const result = v9BaseUpdateLifeLost(dt);
  v9PinPlayerY();
  return result;
};

const v9BaseCompleteCapture = completeCapture;
completeCapture = function (boss) {
  const result = v9BaseCompleteCapture(boss);
  player.y = V9_PLAYER_Y;
  return result;
};
