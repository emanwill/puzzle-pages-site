import mazes from "./alice-mazes-data.js";

const XMLNS = "http://www.w3.org/2000/svg";

const TILE_SIZE = 48;

const COLOR_TILE_REFS = {
  i: "#t_i",
  b: "#t_b",
  g: "#t_g",
  r: "#t_r",
};

const ARROW_PROTOS = {
  k: "#ak_e",
  r: "#ar_e",
  y: "#ay_e",
};

const TAIL_PROTOS = {
  k: "#zk_e",
  r: "#zr_e",
  y: "#zy_e",
};

const ARROW_ANGLES = [
  [0x0001, -45],
  [0x0002, 45],
  [0x0004, 90 + 45],
  [0x0008, -90 - 45],
  [0x0010, -90],
  [0x0020, 0],
  [0x0040, 90],
  [0x0080, 180],
];

const DIRECTION_MASKS = {
  on: 0x10, // N
  pn: 0x01, // NE
  po: 0x20, // E
  pp: 0x02, // SE
  op: 0x40, // S
  np: 0x04, // SW
  no: 0x80, // W
  nn: 0x08, // NW
};

// Get maze grid parent
/** @type {SVGElement} */
const grid = document.getElementById("mazegrid");

const stepIndicator = document.getElementById("stepSizeIndicator");

/** @type {SVGElement} */
const stepGrid = document.getElementById("stepgrid");

const mazeSelectorButtons = document.querySelectorAll("button[data-maze-sel]");

for (const el of mazeSelectorButtons) {
  el.addEventListener("click", () => {
    initMaze(mazes[el.getAttribute("data-maze-id")]);
  });
}

/** @type {number[]} */
let mazeData;

let srcX = -1;
let srcY = -1;
let stepSize = 1;

initStepGrid();
initMaze(mazes[1]);

/**
 *
 * @param {number[]} data
 */
function initMaze(data) {
  mazeData = data;
  stepSize = 1;
  drawStepSize();
  stepIndicator.innerText = stepSize.toString();

  for (let btn of mazeSelectorButtons) {
    const btnMazeId = btn.getAttribute("data-maze-id");
    if (btnMazeId === mazeData[0].toString()) {
      btn.setAttribute("class", "btn selected");
    } else {
      btn.setAttribute("class", "btn");
    }
  }

  // Clear the entire grid
  while (grid.firstChild) {
    grid.removeChild(grid.lastChild);
  }

  // Create the tiles and their arrows
  for (let x = 0; x < 10; x++) {
    for (let y = 0; y < 10; y++) {
      const cell = mazeData[4 + y * 10 + x];
      const colorBits = cell & 0x0c00;

      let tileRef = COLOR_TILE_REFS.i;
      if (colorBits === 0x0400) tileRef = COLOR_TILE_REFS.b;
      if (colorBits === 0x0800) tileRef = COLOR_TILE_REFS.g;

      const tile = document.createElementNS(XMLNS, "use");
      tile.setAttributeNS(null, "id", `t_r${y}c${x}`);
      tile.setAttributeNS(null, "href", tileRef);
      tile.setAttributeNS(null, "x", (x * TILE_SIZE).toString());
      tile.setAttributeNS(null, "y", (y * TILE_SIZE).toString());
      grid.appendChild(tile);

      // Add contents and click targets to maze interior tiles
      if (tileRef !== COLOR_TILE_REFS.i) {
        initTileContents(grid, x, y);

        const clickTgt = document.createElementNS(XMLNS, "use");
        clickTgt.setAttributeNS(null, "id", `0_r${y}c${x}`);
        clickTgt.setAttributeNS(null, "href", "#t_0");
        clickTgt.setAttributeNS(null, "x", (x * TILE_SIZE).toString());
        clickTgt.setAttributeNS(null, "y", (y * TILE_SIZE).toString());
        clickTgt.addEventListener("click", onClickTile);
        grid.appendChild(clickTgt);
      }
    }
  }

  // Set explorer's starting position in logic
  srcY = mazeData[1];
  srcX = mazeData[2];

  // Highlight explorer's current tile
  const currentTile = document.getElementById(`t_r${srcY}c${srcX}`);
  if (currentTile) {
    currentTile.setAttributeNS(null, "href", COLOR_TILE_REFS.r);
  }
}

/**
 *
 * @param {MouseEvent} event
 */
function onClickTile(event) {
  // Get the grid coordinates of the clicked tile
  const tgtId = event.target.getAttributeNS(null, "id");
  const tileX = parseInt(tgtId.substring(5, 6));
  const tileY = parseInt(tgtId.substring(3, 4));

  if (isMoveAllowed(tileX, tileY)) {
    moveToTile(tileX, tileY);
  }
}

/**
 *
 * @param {number} destX
 * @param {number} destY
 */
function isMoveAllowed(destX, destY) {
  const dx = destX - srcX;
  const dy = destY - srcY;

  /*
    N: dx=0, dy=-n
    NE: dx=n, dy=-n
    E: dx=n, dy=0
    SE: dx=n, dy=n
    S: dx=0, dy=n
    */

  // Get dx and ddy magnitudes
  const dxA = Math.abs(dx);
  const dyA = Math.abs(dy);

  // Forbid moves of [0,0] (i.e. to current tile)
  if (dy === 0 && dx === 0) return false;

  // Forbid moves not on the 8 cardinal directions (N, NE, E, etc.)
  if (dx !== 0 && dy !== 0 && dxA !== dyA) return false;

  // Forbid moves not equal to current step size
  if (dx !== 0 && dxA !== stepSize) return false;
  if (dy !== 0 && dyA !== stepSize) return false;

  // Forbid moves not supported by the tile's arrows
  const srcCellData = mazeData[4 + srcY * 10 + srcX];
  const xDir = dx > 0 ? "p" : dx < 0 ? "n" : "o";
  const yDir = dy > 0 ? "p" : dy < 0 ? "n" : "o";
  const dirCode = xDir + yDir;
  const dirMask = DIRECTION_MASKS[dirCode];
  if (!(srcCellData & dirMask)) return false;

  return true;
}

/**
 *
 * @param {number} destX
 * @param {number} destY
 */
function moveToTile(destX, destY) {
  // un-highlight the cell the explorer is leaving
  const srcTileId = `t_r${srcY}c${srcX}`;
  const srcTile = document.getElementById(srcTileId);
  if (srcTile) {
    const cellData = mazeData[4 + srcY * 10 + srcX];
    const colorBits = cellData & 0x0c00;
    let tileRef = COLOR_TILE_REFS.i;
    if (colorBits === 0x0400) tileRef = COLOR_TILE_REFS.b;
    if (colorBits === 0x0800) tileRef = COLOR_TILE_REFS.g;

    srcTile.setAttributeNS(null, "href", tileRef);
  }

  // highlight the cell the explorer is entering
  const destTileId = `t_r${destY}c${destX}`;
  const destTile = document.getElementById(destTileId);
  if (destTile) {
    destTile.setAttributeNS(null, "href", COLOR_TILE_REFS.r);
  }

  // update the explorer's position in logic
  srcX = destX;
  srcY = destY;

  // update the explorer's step size, if applicable
  const destCellData = mazeData[4 + destY * 10 + destX];
  const stepSizeBits = destCellData & 0x0300;
  if (stepSizeBits === 0x0100) {
    // tile is a down-scaler
    stepSize--;
  }
  if (stepSizeBits === 0x0200) {
    // tile is an up-scaler
    stepSize++;
  }

  stepIndicator.innerText = stepSize.toString();
  drawStepSize();

  // TODO: check whether destination cell is the goal
  if (isGoalTile(destX, destY)) {
    setTimeout(() => alert("You win!"), 50);
  }
}

/**
 *
 * @param {number} tileX
 * @param {number} tileY
 */
function isGoalTile(tileX, tileY) {
  const data = mazeData[4 + tileY * 10 + tileX];
  const arrowDirectionBits = data & 0x0ff;
  return arrowDirectionBits === 0;
}

/**
 *
 * @param {SVGElement} parent
 * @param {number} tileX
 * @param {number} tileY
 */
function initTileContents(parent, tileX, tileY) {
  const data = mazeData[4 + tileY * 10 + tileX];
  const arrowTypeBits = data & 0x0300;
  const arrowDirectionBits = data & 0x0ff;

  const canvX = (tileX + 0.5) * TILE_SIZE;
  const canvY = (tileY + 0.5) * TILE_SIZE;

  let arrowColor = "k";
  if (arrowTypeBits === 0x0100) arrowColor = "y";
  if (arrowTypeBits === 0x0200) arrowColor = "r";

  const group = document.createElementNS(XMLNS, "g");
  group.setAttributeNS(null, "id", `v_r${tileY}c${tileX}`);
  group.setAttributeNS(null, "transform", `translate(${canvX},${canvY})`);

  let count = 0;
  let firstAngle = 0;
  for (const [mask, angle] of ARROW_ANGLES) {
    if (arrowDirectionBits & mask) {
      appendArrow(group, arrowColor, angle);
      if (count === 0) firstAngle = angle;
      count++;
    }
  }

  if (count === 1) {
    appendTail(group, arrowColor, firstAngle);
  }

  if (count === 0) {
    // This is actually the goal tile; append the goal text
    const adf = document.createElementNS(XMLNS, "use");
    adf.setAttributeNS(null, "href", "#star_goal");
    adf.setAttributeNS(null, "transform", "scale(0.6)");
    // const txt = document.createElementNS(XMLNS, "use");
    // txt.setAttributeNS(null, "href", "#txt_goal");
    group.appendChild(adf);
  }

  parent.appendChild(group);
}

/**
 *
 * @param {SVGElement} parent
 * @param {'k' | 'r' | 'y'} color
 * @param {number} angle
 */
function appendArrow(parent, color, angle) {
  const arrow = document.createElementNS(XMLNS, "use");
  arrow.setAttributeNS(null, "href", ARROW_PROTOS[color]);
  arrow.setAttributeNS(null, "transform", `rotate(${angle})`);
  parent.appendChild(arrow);
}

/**
 *
 * @param {SVGElement} parent
 * @param {'k' | 'r' | 'y'} color
 * @param {number} angle
 */
function appendTail(parent, color, angle) {
  const tail = document.createElementNS(XMLNS, "use");
  tail.setAttributeNS(null, "href", TAIL_PROTOS[color]);
  tail.setAttributeNS(null, "transform", `rotate(${angle})`);
  parent.appendChild(tail);
}

function initStepGrid() {
  for (let i = 0; i < 11; i++) {
    const tile = document.createElementNS(XMLNS, "use");
    tile.setAttributeNS(null, "id", `c_c${i}`);
    tile.setAttributeNS(null, "href", i === 0 ? "#c_r" : "#c_i");
    tile.setAttributeNS(null, "x", (i * 36).toString());
    tile.setAttributeNS(null, "y", "0");
    stepGrid.appendChild(tile);
  }
}

function drawStepSize() {
  for (let i = 1; i < stepSize + 1; i++) {
    const stepTile = document.getElementById(`c_c${i}`);
    if (stepTile) {
      stepTile.setAttributeNS(null, "href", i % 2 === 0 ? "#c_b" : "#c_g");
    }
  }

  for (let i = stepSize + 1; i < 11; i++) {
    const stepTile = document.getElementById(`c_c${i}`);
    if (stepTile) {
      stepTile.setAttributeNS(null, "href", "#c_i");
    }
  }
}
