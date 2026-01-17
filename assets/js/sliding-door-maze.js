const mazeSource = `
TL,TB,TB,TB,TB,TB,TB,TB,TB,TR,TL,TB,TRBc<
LB,TR,TL,TB,TB,T,TB,TB,TR,RL,LB,TB,TR
TRL,RL,LB,TBg<,TRB,RL,TLe*,TRe,RL,LB,TB,TR,LR
RL,LB,TB,TB,TR,RL,LBe,Re,RL,LT,TR,LR,LR
L,T,TB,TRB,LR,LB,TR,RL,LB,BR,LR,LR,LR
RL,LR,TL,TR,L,TR,LR,Lrd-,Tbrd,TBrd,Rrd+,LR,LR
RLB,LR,LR,LB,BR,LR,LR,LR,TL,TR,LR,LR,LR
TRL,LR,Lcd-,Tbcd,Tbcd,Rcd+,LR,LR,LR,BL,BR,LR,LR
RL,LR,LR,LT,TR,RL,LR,LR,LB,TR,TL,R,LR
L,B,BR,LR,LB,BR,LR,L,T,R,LRr<,LR,LR
RL,TLR,TL,,TBg>,TB,BR,LR,LR,LRg>,LR,LR,LR
RL,LRr>,LR,LB,TB,TB,TR,LR,LR,LR,LRc>,LR,LR
RL,LR,LR,LT,TB,TR,LR,LR,LR,BL,BR,LR,LR
RL,LB,BR,LR,LTR,LR,LBRm<,LR,Lgd-,TBgd,TBgd,Rgd+,LR
Lmd-,TBmd,TBmd,Rmd+,LR,LB,TB,RB,LR,TL,TR,LR,LR
LR,LT,TR,LR,LB,TB,TB,T,R,LRm>,LR,LR,LR
LR,LR,LR,LB,TB,TBm>,TB,R,LR,LR,LRg>,LR,LR
LB,RB,LB,TB,TB,TB,TBs,RB,LB,RB,LB,B,RB
`;

/**
 * sourceGrid[y][x]
 */
const sourceGrid = mazeSource
  .split("\n")
  .filter((rowStr) => rowStr.length > 0)
  .map((rowStr) => rowStr.split(","));

const CELL_WIDTH_PX = 48;
const CELL_HEIGHT_PX = 48;
const CELL_WALL_STROKE_PX = 4;

const GRID_ROWS = 18;
const GRID_COLS = 13;

const MAZE_WIDTH_PX = CELL_WIDTH_PX * GRID_COLS + CELL_WALL_STROKE_PX;
const MAZE_HEIGHT_PX = CELL_HEIGHT_PX * GRID_ROWS + CELL_WALL_STROKE_PX;
const MAZE_OFFSET_T = 0.5 * CELL_WALL_STROKE_PX;
const MAZE_OFFSET_L = 0.5 * CELL_WALL_STROKE_PX;
const DOOR_WIDTH = 3 * CELL_WIDTH_PX - 4;
const DOOR_HEIGHT = CELL_HEIGHT_PX - 8;
const DOOR_MARGIN_L = 4;
const DOOR_MARGIN_T = 4;

// cell_index*cell_size + custom_offset
const EXIT_TXT_X = 6 * CELL_WIDTH_PX + 15;
const EXIT_TXT_Y = 2 * CELL_HEIGHT_PX + 58;

const COLOR_MAP = {
  wall: "#000000",
  r: "#F74D37",
  g: "#9DD429",
  c: "#27CBEC",
  m: "#D732F1",
  goal: "#DDBB00",
};

const XML_NS = "http://www.w3.org/2000/svg";

/**
 * @type {{[tag: string]: SVGRectElement | null}}
 */
const doorRects = {
  r: null,
  g: null,
  c: null,
  m: null,
};

/**
 * @type {{[tag: string]: [number, number]}}
 */
const doorGridCoords = {
  r: [7, 5],
  g: [8, 13],
  c: [2, 7],
  m: [0, 14],
};

/**
 * States:
 * - -1: door is slid to its LEFT
 * - 1: door is slid to its RIGHT
 * @type {{[tag: string]: number}}
 */
const doorStates = {
  r: -1,
  g: -1,
  c: -1,
  m: -1,
};

/** @type {SVGElement} */
// @ts-ignore
const svg = document.getElementById("maze");

// Draw maze walls, switches, and exit
for (let gridY = 0; gridY < GRID_ROWS; gridY++) {
  for (let gridX = 0; gridX < GRID_COLS; gridX++) {
    const cellCfg = sourceGrid[gridY][gridX];
    const canvX = gridX * CELL_WIDTH_PX + MAZE_OFFSET_L;
    const canvY = gridY * CELL_HEIGHT_PX + MAZE_OFFSET_T;
    if (cellCfg.includes("T")) {
      // top wall
      drawWall(canvX, canvY, canvX + CELL_WIDTH_PX, canvY);
    }
    if (cellCfg.includes("L")) {
      // left wall
      drawWall(canvX, canvY, canvX, canvY + CELL_HEIGHT_PX);
    }
    if (cellCfg.includes("R")) {
      // right wall
      drawWall(
        canvX + CELL_WIDTH_PX,
        canvY,
        canvX + CELL_WIDTH_PX,
        canvY + CELL_HEIGHT_PX,
      );
    }
    if (cellCfg.includes("B")) {
      // bottom wall
      drawWall(
        canvX,
        canvY + CELL_HEIGHT_PX,
        canvX + CELL_WIDTH_PX,
        canvY + CELL_HEIGHT_PX,
      );
    }
    if (/[rgcm][\<\>]/.test(cellCfg)) {
      // door switch
      const color = COLOR_MAP[cellCfg.match(/[rgcm]/)[0]];
      const isLeft = /\</.test(cellCfg);
      drawSwitch(canvX, canvY, color, isLeft);
    }
    if (/\*/.test(cellCfg)) {
      // goal's upper left corner
      const goal = document.createElementNS(XML_NS, "use");
      goal.setAttributeNS(null, "href", "#goal");
      goal.setAttributeNS(null, "x", (canvX + CELL_WIDTH_PX).toString());
      goal.setAttributeNS(null, "y", (canvY + CELL_HEIGHT_PX).toString());
      goal.setAttributeNS(null, "fill", COLOR_MAP.goal);
      svg.appendChild(goal);
    }
  }
}

/**
 *
 * @param {number} x1 canvas coordinate x1
 * @param {number} y1 canvas coordinate y1
 * @param {number} x2 canvas coordinate x2
 * @param {number} y2 canvas coordinate y2
 */
function drawWall(x1, y1, x2, y2) {
  const line = document.createElementNS(XML_NS, "line");
  line.setAttributeNS(null, "x1", x1.toString());
  line.setAttributeNS(null, "y1", y1.toString());
  line.setAttributeNS(null, "x2", x2.toString());
  line.setAttributeNS(null, "y2", y2.toString());
  line.setAttributeNS(null, "stroke", COLOR_MAP.wall);
  line.setAttributeNS(null, "stroke-width", "2.8");
  line.setAttributeNS(null, "stroke-linecap", "round");
  svg.appendChild(line);
}

/**
 *
 * @param {number} cellCanvX
 * @param {number} cellCanvY
 * @param {string} color
 * @param {boolean} left
 */
function drawSwitch(cellCanvX, cellCanvY, color, left) {
  const cellCX = cellCanvX + CELL_WIDTH_PX / 2;
  const cellCY = cellCanvY + CELL_HEIGHT_PX / 2;
  const sw = document.createElementNS(XML_NS, "use");
  sw.setAttributeNS(null, "href", left ? "#sw_l" : "#sw_r");
  sw.setAttributeNS(null, "x", cellCX.toString());
  sw.setAttributeNS(null, "y", cellCY.toString());
  sw.setAttributeNS(null, "fill", color);
  svg.appendChild(sw);
}

// Create door graphics
for (const tag of Object.keys(doorRects)) {
  const gridX = doorGridCoords[tag][0];
  const gridY = doorGridCoords[tag][1];
  const canvX = gridX * CELL_WIDTH_PX + MAZE_OFFSET_L + 4;
  const canvY = gridY * CELL_HEIGHT_PX + MAZE_OFFSET_T + 4;
  const doorRect = document.createElementNS(XML_NS, "rect");
  doorRect.setAttributeNS(null, "id", `door${tag}`);
  doorRect.setAttributeNS(null, "width", DOOR_WIDTH.toString());
  doorRect.setAttributeNS(null, "height", DOOR_HEIGHT.toString());
  doorRect.setAttributeNS(null, "fill", COLOR_MAP[tag]);
  doorRect.setAttributeNS(null, "x", canvX.toString());
  doorRect.setAttributeNS(null, "y", canvY.toString());
  svg.appendChild(doorRect);
  doorRects[tag] = doorRect;
}

// Create explorer's graphic
const explorer = document.createElementNS(XML_NS, "circle");
explorer.setAttributeNS(null, "id", "explorer");
explorer.setAttributeNS(
  null,
  "cx",
  (9.5 * CELL_WIDTH_PX + MAZE_OFFSET_L).toString(),
);
explorer.setAttributeNS(
  null,
  "cy",
  (17.5 * CELL_HEIGHT_PX + MAZE_OFFSET_T).toString(),
);
explorer.setAttributeNS(null, "r", (16).toString());
explorer.setAttributeNS(null, "fill", "#404040");
svg.appendChild(explorer);

/**
 *
 * @param {'r'|'g'|'c'|'m'} doorTag
 * @param {-1 | 1} newState
 */
function setDoorPosition(doorTag, newState) {
  // Default door coordinates are for door in LEFT position
  const gridX = doorGridCoords[doorTag][0];
  const gridY = doorGridCoords[doorTag][1];
  let canvX = gridX * CELL_WIDTH_PX + MAZE_OFFSET_L + 4;
  let canvY = gridY * CELL_HEIGHT_PX + MAZE_OFFSET_T + 4;

  if (newState === 1) {
    canvX += CELL_WIDTH_PX - 4;
  }

  doorRects[doorTag].setAttributeNS(null, "x", canvX.toString());
  doorRects[doorTag].setAttributeNS(null, "y", canvY.toString());
}

/**
 *
 * @param {number} gridX
 * @param {number} gridY
 */
function setExplorerPosition(gridX, gridY) {
  const canvasX = (gridX + 0.5) * CELL_WIDTH_PX + MAZE_OFFSET_L;
  const canvasY = (gridY + 0.5) * CELL_HEIGHT_PX + MAZE_OFFSET_T;
  explorer.setAttributeNS(null, "cx", canvasX.toString());
  explorer.setAttributeNS(null, "cy", canvasY.toString());
}

// Initialize the explorer's position
let currentX = 6;
let currentY = 17;
setExplorerPosition(currentX, currentY);

document.addEventListener("keydown", onKeyDown);

/**
 *
 * @param {KeyboardEvent} event
 */
function onKeyDown(event) {
  if (!/^Arrow(Left|Up|Down|Right)/.test(event.key)) {
    return;
  }

  // Calculate where to move based on the keystroke
  let newX = currentX;
  let newY = currentY;

  switch (event.key) {
    case "ArrowLeft":
      newX--;
      break;
    case "ArrowUp":
      newY--;
      break;
    case "ArrowRight":
      newX++;
      break;
    case "ArrowDown":
      newY++;
      break;
  }

  if (newX < 0) newX = 0;
  if (newX > GRID_COLS - 1) newX = GRID_COLS - 1;
  if (newY < 0) newY = 0;
  if (newY > GRID_ROWS - 1) newY = GRID_ROWS - 1;

  attemptMoveTo(newX, newY);
}

/**
 *
 * @param {number} nextX
 * @param {number} nextY
 * @returns
 */
function attemptMoveTo(nextX, nextY) {
  // New XY must be adjacent to current XY
  let isAdjacent = false;
  if (Math.abs(currentX - nextX) < 2 && currentY === nextY) {
    isAdjacent = true;
  }
  if (Math.abs(currentY - nextY) < 2 && currentX === nextX) {
    isAdjacent = true;
  }
  if (!isAdjacent) return;

  // Cannot move if a wall is in the way
  const currentCell = sourceGrid[currentY][currentX];
  let hasWall = false;
  if (nextX > currentX) {
    // moving right
    hasWall = currentCell.includes("R");
  } else if (nextX < currentX) {
    // moving left
    hasWall = currentCell.includes("L");
  } else if (nextY > currentY) {
    // moving down
    hasWall = currentCell.includes("B");
  } else if (nextY < currentY) {
    // moving up
    hasWall = currentCell.includes("T");
  }
  if (hasWall) return;

  // Cannot move if a sliding door is in the way
  const nextCell = sourceGrid[nextY][nextX];
  if (/[rgcm]d/.test(nextCell)) {
    const doorTag = nextCell.match(/[rgcm]/)[0];
    const doorState = doorStates[doorTag];

    if (nextCell.includes("-")) {
      // trying to use door's left side
      if (doorState === -1) return;
    } else if (nextCell.includes("+")) {
      // trying to use door's right side
      if (doorState === 1) return;
    } else {
      // trying to access door's innards; STOP THAT!
      return;
    }
  }

  // Nothing impedes the move; update explorer's position
  currentX = nextX;
  currentY = nextY;
  setExplorerPosition(nextX, nextY);

  // If newly arrived cell is door switch, update door state
  if (/[rgcm][\<\>]/.test(nextCell)) {
    // Cell is a door switch; update door's state
    const doorTag = nextCell.match(/[rgcm]/)[0];
    const directionTag = nextCell.match(/[\<\>]/)[0];
    doorStates[doorTag] = directionTag === "<" ? -1 : 1;
    setDoorPosition(doorTag, doorStates[doorTag]);
  }

  // If newly arrived cell is part of the exit, end the game
  if (/e/.test(nextCell)) {
    document.removeEventListener("keydown", onKeyDown);
    setTimeout(() => alert("You win!"), 50);
  }
}
