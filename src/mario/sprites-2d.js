// Original Procedural Pixel-Art Sprite Sheet Cache (2D Canvas, zero external URLs)
function makeCanvas(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx, w, h);
  return c;
}

function drawGrid(ctx, rows, palette, scale = 2) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || !palette[ch]) continue;
      ctx.fillStyle = palette[ch];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

export function createSpriteSheet() {
  const sprites = {};

  // --- MARIO PALETTES ---
  const marioPalettes = {
    small: { R: '#e52521', B: '#1d4ed8', S: '#ffcc99', H: '#6b3e14', Y: '#facc15', K: '#111827', W: '#ffffff' },
    super: { R: '#e52521', B: '#1d4ed8', S: '#ffcc99', H: '#6b3e14', Y: '#facc15', K: '#111827', W: '#ffffff' },
    fire:  { R: '#f8fafc', B: '#dc2626', S: '#ffcc99', H: '#7c2d12', Y: '#facc15', K: '#111827', W: '#ffffff' },
    star:  { R: '#fde047', B: '#06b6d4', S: '#fef08a', H: '#f43f5e', Y: '#ffffff', K: '#0f172a', W: '#ffffff' }
  };

  // 16x16 Small Mario Matrices
  const smallIdle = [
    '....RRRRRR......',
    '...RRRRRRRRR....',
    '...HHHSSKS......',
    '..HSHSSSSKSSS...',
    '..HSHHSSSSKSSS..',
    '..HHSSSSSKKKKK..',
    '....SSSSSSSS....',
    '...RRBRRR.......',
    '..RRRBRRBRRR....',
    '.RRRRBBBBRRRR...',
    '.SS.BYYYYB.SS...',
    '.SSSBBBBBBSSS...',
    '.SS.BBBBBB.SS...',
    '....BBB.BBB.....',
    '...HHH...HHH....',
    '..HHHH...HHHH...'
  ];

  const smallWalk1 = [
    '....RRRRRR......',
    '...RRRRRRRRR....',
    '...HHHSSKS......',
    '..HSHSSSSKSSS...',
    '..HSHHSSSSKSSS..',
    '..HHSSSSSKKKKK..',
    '....SSSSSSSS....',
    '...RRBRRR.......',
    '..RRRBRRBRRR....',
    '..SSBBBBBRRR....',
    '..SSBYBYYBSS....',
    '...BBBBBBBB.....',
    '...BBBB.BBB.....',
    '..HHH....HHH....',
    '..HHHH....HHHH..',
    '................'
  ];

  const smallWalk2 = [
    '....RRRRRR......',
    '...RRRRRRRRR....',
    '...HHHSSKS......',
    '..HSHSSSSKSSS...',
    '..HSHHSSSSKSSS..',
    '..HHSSSSSKKKKK..',
    '....SSSSSSSS....',
    '....RRBRRR......',
    '...RRRBRRBRR....',
    '...RRRBBBBRRR...',
    '...SSYYYYBSS....',
    '....BBBBBBB.....',
    '...BBB..BBBB....',
    '..HHH....HHH....',
    '.HHHH.....HHHH..',
    '................'
  ];

  const smallJump = [
    '....RRRRRR....SS',
    '...RRRRRRRRR.SSS',
    '...HHHSSKS...SS.',
    '..HSHSSSSKSSS...',
    '..HSHHSSSSKSSS..',
    '..HHSSSSSKKKKK..',
    '....SSSSSSSS....',
    '..RRRBRRRR......',
    '.RRRRBRRBRR.....',
    '.SS.BBBBBB......',
    '....BYYYYBB.....',
    '...BBBBBBBB.....',
    '..BBBB..BBBB....',
    '.HHH......HHH...',
    '.HHHH......HHH..',
    '................'
  ];

  // 16x24 Big/Super Mario Matrices
  const bigIdle = [
    '.....RRRRRR.....',
    '....RRRRRRRRR...',
    '....HHHSSKS.....',
    '...HSHSSSSKSSS..',
    '...HSHHSSSSKSSS.',
    '...HHSSSSSKKKKK.',
    '.....SSSSSSSS...',
    '....RRBRRBRR....',
    '...RRRBRRBRRR...',
    '..RRRRBRRBRRRR..',
    '..RRRRBBBBRRRR..',
    '..SS.BYYYYB.SS..',
    '..SSSBBBBBBSSS..',
    '..SS.BBBBBB.SS..',
    '.....BBBBBB.....',
    '....BBBBBBBB....',
    '....BBB..BBB....',
    '....BBB..BBB....',
    '...HHH....HHH...',
    '...HHH....HHH...',
    '..HHHH....HHHH..',
    '..HHHH....HHHH..',
    '................',
    '................'
  ];

  const bigWalk = [
    '.....RRRRRR.....',
    '....RRRRRRRRR...',
    '....HHHSSKS.....',
    '...HSHSSSSKSSS..',
    '...HSHHSSSSKSSS.',
    '...HHSSSSSKKKKK.',
    '.....SSSSSSSS...',
    '....RRBRRBRR....',
    '...RRRBRRBRRR...',
    '..SS.RBRRBRR.SS.',
    '..SSSBBBBBBSSSS.',
    '...SSYYYYYYSS...',
    '.....BBBBBB.....',
    '....BBBBBBBB....',
    '...BBBB..BBBB...',
    '..BBBB....BBBB..',
    '..HHH......HHH..',
    '.HHHH......HHHH.',
    '.HHHH......HHHH.',
    '................',
    '................',
    '................',
    '................',
    '................'
  ];

  const bigJump = [
    '.....RRRRRR...SS',
    '....RRRRRRRRRSSS',
    '....HHHSSKS..SS.',
    '...HSHSSSSKSSS..',
    '...HSHHSSSSKSSS.',
    '...HHSSSSSKKKKK.',
    '.....SSSSSSSS...',
    '...RRRBRRBRR....',
    '..RRRRBRRBRRR...',
    '.SS..RBBBBRR....',
    '.....BYYYYBB....',
    '....BBBBBBBB....',
    '...BBBBBBBBBB...',
    '..BBBB....BBBB..',
    '.HHH........HHH.',
    '.HHHH......HHHH.',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................'
  ];

  const bigCrouch = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....RRRRRR.....',
    '....RRRRRRRRR...',
    '....HHHSSKS.....',
    '...HSHSSSSKSSS..',
    '...HSHHSSSSKSSS.',
    '...HHSSSSSKKKKK.',
    '....RRBRRBRR....',
    '...RRRBBBBRRR...',
    '..SS.BYYYYB.SS..',
    '..SSSBBBBBBSSS..',
    '...BBBBBBBBBB...',
    '..HHHH....HHHH..',
    '..HHHH....HHHH..',
    '................',
    '................',
    '................',
    '................',
    '................'
  ];

  for (const [key, pal] of Object.entries(marioPalettes)) {
    sprites[`mario_${key}_idle`] = makeCanvas(32, key === 'small' ? 32 : 48, (ctx) => {
      drawGrid(ctx, key === 'small' ? smallIdle : bigIdle, pal, 2);
    });
    sprites[`mario_${key}_walk1`] = makeCanvas(32, key === 'small' ? 32 : 48, (ctx) => {
      drawGrid(ctx, key === 'small' ? smallWalk1 : bigWalk, pal, 2);
    });
    sprites[`mario_${key}_walk2`] = makeCanvas(32, key === 'small' ? 32 : 48, (ctx) => {
      drawGrid(ctx, key === 'small' ? smallWalk2 : bigIdle, pal, 2);
    });
    sprites[`mario_${key}_jump`] = makeCanvas(32, key === 'small' ? 32 : 48, (ctx) => {
      drawGrid(ctx, key === 'small' ? smallJump : bigJump, pal, 2);
    });
    sprites[`mario_${key}_crouch`] = makeCanvas(32, 48, (ctx) => {
      drawGrid(ctx, bigCrouch, pal, 2);
    });
  }

  // --- GOOMBA ---
  const goombaPal = { B: '#8b4513', D: '#5c2c0b', C: '#f5deb3', K: '#0f172a', W: '#ffffff' };
  const goombaGrid = [
    '......BBBB......',
    '....BBBBBBBB....',
    '...BBBBBBBBBB...',
    '..BBBBBBBBBBBB..',
    '.BBKKBBBBBBKKBB.',
    '.BBWKBBBBBBKWBB.',
    '.BBWWBBBBBBWWBB.',
    '.BBBBBBBBBBBBBB.',
    '..BBBBCCCCBBBB..',
    '....CCCCCCCC....',
    '....CCCCCCCC....',
    '...DDCCCCCCDD...',
    '..DDDD....DDDD..',
    '.DDDDD....DDDDD.',
    '.DDDD......DDDD.',
    '................'
  ];
  sprites.goomba = makeCanvas(32, 32, (ctx) => drawGrid(ctx, goombaGrid, goombaPal, 2));
  sprites.goomba_squish = makeCanvas(32, 32, (ctx) => {
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(2, 22, 28, 6);
    ctx.fillStyle = '#5c2c0b';
    ctx.fillRect(0, 26, 32, 6);
    ctx.fillStyle = '#f5deb3';
    ctx.fillRect(10, 25, 12, 3);
  });

  // --- KOOPA TROOPA (Green & Red) ---
  for (const color of ['green', 'red']) {
    const shellCol = color === 'green' ? '#16a34a' : '#dc2626';
    const darkShell = color === 'green' ? '#14532d' : '#7f1d1d';
    const kPal = { G: shellCol, D: darkShell, Y: '#fde047', W: '#ffffff', K: '#0f172a', O: '#fb923c' };
    const koopaWalk = [
      '..........YYY...',
      '.........YYYYY..',
      '........YYWWY...',
      '........YYWKY...',
      '....GGG..YYYY...',
      '..GGGGGG.YYY....',
      '.GGGGGGGGYY.....',
      '.GGDGGDGGGY.....',
      '.GGGGGGGGGY.....',
      '.GGGGGGGGYY.....',
      '..YYYYYYYY......',
      '...YYYYYY.......',
      '...YY..YY.......',
      '..OOO..OOO......',
      '..OOOO.OOOO.....',
      '................'
    ];
    const koopaShell = [
      '................',
      '................',
      '................',
      '................',
      '....GGGGGGGG....',
      '..GGGGGGGGGGGG..',
      '.GGGDDGGGGDDGGG.',
      '.GGGGGGGGGGGGGG.',
      '.GGGDGGGGGGDGGG.',
      '.GGGGGGGGGGGGGG.',
      '..YYYYYYYYYYYY..',
      '..DDDDDDDDDDDD..',
      '...YYYYYYYYYY...',
      '................',
      '................',
      '................'
    ];
    sprites[`koopa_${color}`] = makeCanvas(32, 32, (ctx) => drawGrid(ctx, koopaWalk, kPal, 2));
    sprites[`shell_${color}`] = makeCanvas(32, 32, (ctx) => drawGrid(ctx, koopaShell, kPal, 2));
  }

  // --- PIRANHA PLANT ---
  const pirPal = { R: '#e11d48', W: '#ffffff', G: '#22c55e', D: '#15803d' };
  const pirGrid = [
    '..RRRR....RRRR..',
    '.RRWRR....RRWRR.',
    '.RRRRWW..WWRRRR.',
    '.RRWRRWWWWWRRWR.',
    '.RRRRRWWWWWRRRR.',
    '..RRRRRRRRRRRR..',
    '...RRWRRRRWRR...',
    '....RRRRRRRR....',
    '......GGGG......',
    '.....GGGGGG.....',
    '...GGGGGGGGGG...',
    '..GGDGGGGGGDGG..',
    '......GGGG......',
    '......GGGG......',
    '......GGGG......',
    '......GGGG......'
  ];
  sprites.piranha = makeCanvas(32, 32, (ctx) => drawGrid(ctx, pirGrid, pirPal, 2));

  // --- ITEMS ---
  const mushPal = { R: '#ef4444', W: '#ffffff', C: '#fde68a', K: '#111827' };
  const mushGrid = [
    '....RRRRRRRR....',
    '..RRRRWWRRWRRR..',
    '.RRWWWRRRRRWWWR.',
    '.RRWWWRRRRRWWWR.',
    'RRRRRRRRRRRRRRRR',
    'RRRWRRRRRRRRWRRR',
    'RRRRRRRRRRRRRRRR',
    '.RRRRRRRRRRRRRR.',
    '..CCCCCCCCCCCC..',
    '...CCC.KK.CCC...',
    '...CCC.KK.CCC...',
    '...CCCCCCCCCC...',
    '....CCCCCCCC....',
    '................',
    '................',
    '................'
  ];
  sprites.mushroom = makeCanvas(32, 32, (ctx) => drawGrid(ctx, mushGrid, mushPal, 2));
  sprites.oneUp = makeCanvas(32, 32, (ctx) => drawGrid(ctx, mushGrid, { ...mushPal, R: '#16a34a' }, 2));

  const flowerPal = { R: '#ef4444', O: '#f97316', Y: '#fef08a', G: '#22c55e', K: '#0f172a' };
  const flowerGrid = [
    '....RRRRRRRR....',
    '..RRROOOOOORRR..',
    '.RROOYYYYYYOORR.',
    '.RROYKKKKKKYORR.',
    '.RROYKYYYYKYORR.',
    '.RROOYYYYYYOORR.',
    '..RRROOOOOORRR..',
    '....RRRRRRRR....',
    '.......GG.......',
    '....GGGGGGGG....',
    '...GGG.GG.GGG...',
    '...GG..GG..GG...',
    '.......GG.......',
    '.......GG.......',
    '................',
    '................'
  ];
  sprites.flower = makeCanvas(32, 32, (ctx) => drawGrid(ctx, flowerGrid, flowerPal, 2));

  const starPal = { Y: '#facc15', O: '#f59e0b', K: '#0f172a', W: '#fef9c3' };
  const starGrid = [
    '.......YY.......',
    '......YYYY......',
    '......YYYY......',
    '....YYYYYYYY....',
    '.YYYYYYYYYYYYYY.',
    '.YYYYYYKYKYYYYY.',
    '..YYYYYKYKYYYY..',
    '...YYYYYYYYYY...',
    '....YYYYYYYY....',
    '...YYYYYYYYYY...',
    '..YYYY....YYYY..',
    '.YYYY......YYYY.',
    '.YY..........YY.',
    '................',
    '................',
    '................'
  ];
  sprites.star = makeCanvas(32, 32, (ctx) => drawGrid(ctx, starGrid, starPal, 2));

  // --- TILES ---
  sprites.ground_overworld = makeCanvas(32, 32, (ctx) => {
    ctx.fillStyle = '#c84c0c';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, 0, 32, 7);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 6, 32, 2);
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(2, 12, 12, 8);
    ctx.fillRect(18, 12, 12, 8);
    ctx.fillRect(10, 22, 14, 8);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(4, 13, 4, 2);
    ctx.fillRect(20, 14, 4, 2);
  });

  sprites.ground_underground = makeCanvas(32, 32, (ctx) => {
    ctx.fillStyle = '#0f2942';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#1e4e79';
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillRect(17, 1, 14, 14);
    ctx.fillRect(1, 17, 14, 14);
    ctx.fillRect(17, 17, 14, 14);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(2, 2, 12, 2);
    ctx.fillRect(18, 2, 12, 2);
  });

  sprites.brick_overworld = makeCanvas(32, 32, (ctx) => {
    ctx.fillStyle = '#c84c0c';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 15, 32, 2);
    ctx.fillRect(0, 30, 32, 2);
    ctx.fillRect(15, 0, 2, 16);
    ctx.fillRect(7, 16, 2, 16);
    ctx.fillRect(23, 16, 2, 16);
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(1, 1, 13, 2);
    ctx.fillRect(18, 1, 13, 2);
  });

  sprites.brick_underground = makeCanvas(32, 32, (ctx) => {
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 15, 32, 2);
    ctx.fillRect(0, 30, 32, 2);
    ctx.fillRect(15, 0, 2, 16);
    ctx.fillRect(7, 16, 2, 16);
    ctx.fillRect(23, 16, 2, 16);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(1, 1, 13, 2);
    ctx.fillRect(18, 1, 13, 2);
  });

  sprites.qblock = makeCanvas(32, 32, (ctx) => {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(0, 0, 32, 2);
    ctx.fillRect(0, 0, 2, 32);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(0, 30, 32, 2);
    ctx.fillRect(30, 0, 2, 32);
    ctx.fillRect(4, 4, 2, 2);
    ctx.fillRect(26, 4, 2, 2);
    ctx.fillRect(4, 26, 2, 2);
    ctx.fillRect(26, 26, 2, 2);
    // Pixel '?'
    ctx.fillStyle = '#78350f';
    ctx.fillRect(12, 8, 10, 4);
    ctx.fillRect(10, 10, 4, 4);
    ctx.fillRect(18, 10, 4, 6);
    ctx.fillRect(14, 16, 6, 4);
    ctx.fillRect(14, 23, 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 6, 10, 4);
    ctx.fillRect(8, 8, 4, 4);
    ctx.fillRect(16, 8, 4, 6);
    ctx.fillRect(12, 14, 6, 4);
    ctx.fillRect(12, 21, 4, 4);
  });

  sprites.used = makeCanvas(32, 32, (ctx) => {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 30, 30);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(4, 4, 2, 2);
    ctx.fillRect(26, 4, 2, 2);
    ctx.fillRect(4, 26, 2, 2);
    ctx.fillRect(26, 26, 2, 2);
  });

  sprites.hard = makeCanvas(32, 32, (ctx) => {
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(0, 0, 32, 3);
    ctx.fillRect(0, 0, 3, 32);
    ctx.fillStyle = '#431407';
    ctx.fillRect(0, 29, 32, 3);
    ctx.fillRect(29, 0, 3, 32);
    ctx.fillStyle = '#c2410c';
    ctx.fillRect(6, 6, 20, 20);
  });

  sprites.platform = makeCanvas(32, 32, (ctx) => {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, 32, 14);
    ctx.fillStyle = '#fef2f2';
    ctx.fillRect(4, 3, 6, 6);
    ctx.fillRect(20, 5, 6, 5);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(12, 14, 8, 18);
  });

  return sprites;
}
