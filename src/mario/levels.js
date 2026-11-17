// Classic Multi-Stage Level Builder (World 1-1, 1-2, 1-3)
// Grid is 15 rows high (row 0 = top, row 13-14 = ground), variable width in tiles.
// Tile codes:
// '.' = empty, '#' = ground, 'B' = brick, '?' = coin q-block, 'M' = mushroom/fire q-block,
// 'S' = star q-block, 'U' = 1-up q-block, 'H' = hard stair block, 'P' = platform/bridge,
// 'C' = floating coin

export const LEVEL_HEIGHT = 15;

function createEmptyGrid(width) {
  return Array.from({ length: LEVEL_HEIGHT }, () => Array(width).fill('.'));
}

function fillRect(grid, x, y, w, h, ch) {
  for (let r = y; r < y + h; r++) {
    if (r < 0 || r >= LEVEL_HEIGHT) continue;
    for (let c = x; c < x + w; c++) {
      if (c >= 0 && c < grid[0].length) {
        grid[r][c] = ch;
      }
    }
  }
}

function addStairRight(grid, startX, baseRow, height) {
  for (let i = 0; i < height; i++) {
    fillRect(grid, startX + i, baseRow - i, 1, i + 1, 'H');
  }
}

function addStairLeft(grid, startX, baseRow, height) {
  for (let i = 0; i < height; i++) {
    fillRect(grid, startX + i, baseRow - (height - 1 - i), 1, height - i, 'H');
  }
}

export function buildLevel(worldIndex) {
  if (worldIndex === 1) return buildWorld1_2();
  if (worldIndex === 2) return buildWorld1_3();
  return buildWorld1_1();
}

function buildWorld1_1() {
  const width = 165;
  const grid = createEmptyGrid(width);

  // Ground segments with classic pits
  fillRect(grid, 0, 13, 62, 2, '#');
  fillRect(grid, 65, 13, 18, 2, '#');
  fillRect(grid, 86, 13, 44, 2, '#');
  fillRect(grid, 133, 13, 32, 2, '#');

  // Opening ? blocks & bricks
  grid[9][16] = '?';
  grid[9][20] = 'B';
  grid[9][21] = 'M';
  grid[9][22] = 'B';
  grid[9][23] = '?';
  grid[9][24] = 'B';
  grid[5][22] = '?';

  // Floating coins over pipe zone
  fillRect(grid, 40, 8, 3, 1, 'C');

  // Mid section brick + star + mushroom
  grid[9][74] = 'B';
  grid[9][75] = 'M';
  grid[9][76] = 'B';
  fillRect(grid, 77, 5, 6, 1, 'B');
  grid[5][80] = 'S';

  // Coin ? row
  grid[9][92] = '?';
  grid[9][95] = '?';
  grid[9][98] = '?';
  grid[5][95] = 'M';

  // Brick + 1-UP secret block
  grid[9][106] = 'B';
  grid[5][109] = 'B';
  grid[5][110] = 'U';
  grid[5][111] = 'B';

  // Staircases around pits & finale
  addStairRight(grid, 114, 12, 4);
  addStairLeft(grid, 120, 12, 4);

  addStairRight(grid, 126, 12, 4);
  addStairLeft(grid, 133, 12, 4);

  // Grand finale staircase before flagpole
  addStairRight(grid, 139, 12, 6);
  fillRect(grid, 145, 7, 1, 6, 'H');

  const pipes = [
    { x: 28, topRow: 11, height: 2, piranha: false },
    { x: 38, topRow: 10, height: 3, piranha: true },
    { x: 48, topRow: 9, height: 4, piranha: true },
    { x: 56, topRow: 9, height: 4, piranha: false },
    { x: 102, topRow: 11, height: 2, piranha: true },
    { x: 112, topRow: 11, height: 2, piranha: false }
  ];

  const enemies = [
    { type: 'goomba', x: 22, y: 12 },
    { type: 'goomba', x: 34, y: 12 },
    { type: 'goomba', x: 43, y: 12 },
    { type: 'goomba', x: 45, y: 12 },
    { type: 'koopa', color: 'green', x: 52, y: 11.6 },
    { type: 'goomba', x: 76, y: 12 },
    { type: 'goomba', x: 80, y: 4 },
    { type: 'koopa', color: 'green', x: 93, y: 11.6 },
    { type: 'goomba', x: 96, y: 12 },
    { type: 'goomba', x: 108, y: 12 },
    { type: 'goomba', x: 124, y: 12 }
  ];

  return {
    id: '1-1',
    name: 'Mushroom Plains',
    theme: 'overworld',
    skyColor: '#5c94fc',
    fogColor: '#6fa4ff',
    width,
    grid,
    pipes,
    enemies,
    flagX: 151,
    castleX: 157,
    spawn: { x: 3, y: 11 }
  };
}

function buildWorld1_2() {
  const width = 160;
  const grid = createEmptyGrid(width);

  // Cavern floor & ceiling
  fillRect(grid, 0, 13, 52, 2, '#');
  fillRect(grid, 55, 13, 30, 2, '#');
  fillRect(grid, 88, 13, 36, 2, '#');
  fillRect(grid, 127, 13, 33, 2, '#');

  // Underground brick roof
  fillRect(grid, 6, 1, 125, 1, 'B');

  // Cavern ? blocks & coin pockets
  grid[9][12] = 'M';
  grid[9][13] = '?';
  grid[9][14] = '?';
  grid[9][15] = '?';
  grid[9][16] = 'B';

  // Stepped brick structures + coin arcs
  fillRect(grid, 22, 11, 2, 2, 'H');
  fillRect(grid, 26, 10, 2, 3, 'H');
  fillRect(grid, 30, 9, 2, 4, 'H');
  fillRect(grid, 26, 6, 5, 1, 'C');

  // Brick chamber with star & coins
  fillRect(grid, 40, 8, 9, 1, 'B');
  fillRect(grid, 41, 7, 7, 1, 'C');
  grid[5][44] = 'S';

  // Mid cavern gap & bridges
  fillRect(grid, 52, 10, 3, 1, 'P');
  fillRect(grid, 60, 8, 6, 1, 'B');
  grid[8][63] = 'M';
  fillRect(grid, 60, 5, 6, 1, 'C');

  // Raised brick hallway
  fillRect(grid, 72, 9, 8, 1, 'B');
  grid[9][75] = '?';
  grid[9][77] = 'U';

  // Lava/pit bridge crossing
  fillRect(grid, 85, 11, 3, 1, 'P');
  fillRect(grid, 94, 8, 10, 1, 'B');
  fillRect(grid, 96, 7, 6, 1, 'C');

  addStairRight(grid, 115, 12, 4);
  fillRect(grid, 124, 10, 3, 1, 'P');
  addStairRight(grid, 133, 12, 6);
  fillRect(grid, 139, 7, 1, 6, 'H');

  const pipes = [
    { x: 35, topRow: 10, height: 3, piranha: true },
    { x: 68, topRow: 10, height: 3, piranha: true },
    { x: 106, topRow: 9, height: 4, piranha: true },
    { x: 111, topRow: 11, height: 2, piranha: false }
  ];

  const enemies = [
    { type: 'goomba', x: 18, y: 12 },
    { type: 'goomba', x: 20, y: 12 },
    { type: 'koopa', color: 'red', x: 43, y: 7 },
    { type: 'goomba', x: 58, y: 12 },
    { type: 'koopa', color: 'green', x: 63, y: 11.6 },
    { type: 'goomba', x: 76, y: 8 },
    { type: 'goomba', x: 96, y: 12 },
    { type: 'koopa', color: 'red', x: 99, y: 7 },
    { type: 'goomba', x: 102, y: 12 },
    { type: 'goomba', x: 130, y: 12 }
  ];

  return {
    id: '1-2',
    name: 'Subterranean Vault',
    theme: 'underground',
    skyColor: '#070a12',
    fogColor: '#0a101d',
    width,
    grid,
    pipes,
    enemies,
    flagX: 146,
    castleX: 152,
    spawn: { x: 3, y: 11 }
  };
}

function buildWorld1_3() {
  const width = 158;
  const grid = createEmptyGrid(width);

  // Starting island & finishing island
  fillRect(grid, 0, 13, 18, 2, '#');
  fillRect(grid, 128, 13, 30, 2, '#');

  // Suspended Sky Bridges & Mushroom Platforms
  fillRect(grid, 20, 11, 7, 1, 'P');
  fillRect(grid, 22, 10, 3, 1, 'C');

  fillRect(grid, 29, 9, 6, 1, 'P');
  grid[5][32] = 'M';

  fillRect(grid, 38, 11, 8, 1, 'P');
  fillRect(grid, 40, 7, 4, 1, 'B');
  grid[7][42] = '?';

  fillRect(grid, 49, 8, 7, 1, 'P');
  fillRect(grid, 51, 7, 3, 1, 'C');

  fillRect(grid, 59, 10, 9, 1, 'P');
  grid[6][63] = 'M';

  fillRect(grid, 71, 12, 8, 1, 'P');
  fillRect(grid, 73, 8, 4, 1, 'B');
  grid[8][75] = 'S';

  fillRect(grid, 82, 9, 8, 1, 'P');
  fillRect(grid, 84, 8, 4, 1, 'C');

  fillRect(grid, 93, 7, 7, 1, 'P');
  grid[3][96] = 'U';

  fillRect(grid, 103, 10, 9, 1, 'P');
  fillRect(grid, 106, 6, 3, 1, 'B');
  grid[6][107] = '?';

  fillRect(grid, 115, 11, 10, 1, 'P');
  fillRect(grid, 118, 10, 4, 1, 'C');

  // Final climb & flagpole
  addStairRight(grid, 131, 12, 6);
  fillRect(grid, 137, 7, 1, 6, 'H');

  const pipes = [
    { x: 13, topRow: 11, height: 2, piranha: false },
    { x: 129, topRow: 11, height: 2, piranha: true }
  ];

  const enemies = [
    { type: 'koopa', color: 'red', x: 23, y: 9.6 },
    { type: 'goomba', x: 31, y: 8 },
    { type: 'koopa', color: 'red', x: 41, y: 9.6 },
    { type: 'goomba', x: 52, y: 7 },
    { type: 'koopa', color: 'green', x: 63, y: 8.6 },
    { type: 'goomba', x: 75, y: 11 },
    { type: 'koopa', color: 'red', x: 86, y: 7.6 },
    { type: 'goomba', x: 96, y: 6 },
    { type: 'koopa', color: 'red', x: 107, y: 8.6 },
    { type: 'goomba', x: 119, y: 10 }
  ];

  return {
    id: '1-3',
    name: 'Skybridge Fortress',
    theme: 'sky',
    skyColor: '#254a9e',
    fogColor: '#3762c2',
    width,
    grid,
    pipes,
    enemies,
    flagX: 143,
    castleX: 149,
    spawn: { x: 3, y: 11 }
  };
}
