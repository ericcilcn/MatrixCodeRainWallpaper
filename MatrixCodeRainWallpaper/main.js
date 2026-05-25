"use strict";

const canvas = document.getElementById("matrix-rain");
const ctx = canvas.getContext("2d", { alpha: false });

const FONT_FAMILY = "\"Matrix Code NFI\", monospace";
const DPR_LIMIT = 1.5;
const BASE_COLOR = { r: 35, g: 217, b: 104 };
const PATTERN_SEED = 0x4d415452;
const CHAR_POOL =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-*/=<>[]{}()|:;,.!?#$%&\"'";

const DEFAULT_PRESET = {
  name: "Default preset",
  source: "TheMatrixTrilogy.scr Basic code metrics / Code appearance",
  speedRowsPerSecond: 9.2,
  releaseEveryTicks: 4.4,
  maxReleaseTracers: 3,
  splashEveryReleases: 0,
  maxSplashTracers: 0,
  rotatorOccurrence: 2.5,
  rotatorVariance: 52,
  negativeRotatorOccurrence: 1.3,
  negativeRotatorVariance: 38,
  streamLength: {
    longChance: 48,
    shortMinRows: 0.38,
    shortMaxRows: 0.72,
    longMinRows: 0.78,
    longMaxRows: 1.45
  },
  positiveDensity: 94,
  positiveDensityVariance: 8,
  negativeDensity: 81,
  negativeDensityVariance: 18,
  negativeEveryNthStream: 8,
  fadeBottom: true,
  samePattern: true,
  glowingTracers: {
    occurrence: 15,
    variance: 14,
    negativeOccurrence: 0.4,
    intensity: 90
  },
  speedVariability: 90,
  colorVariance: 100,
  intensityVariance: 66,
  positiveAlpha: {
    base: 0.98,
    variance: 0.32
  },
  negativeAlpha: {
    base: 0.58,
    variance: 0.34
  },
  characterSize: 82,
  maxConcurrentStreamsPerColumn: 6,
  initialWarmupSeconds: 5,
  bottomFade: {
    baseVisibility: 1.22,
    start: 0.08,
    power: 0.92,
    amount: 1.16,
    minVisibility: 0.06,
    maxVisibility: 1.25
  },
  entryBoost: {
    portion: 0.28,
    amount: 0.16
  },
  layout: {
    glyphAspect: 0.84,
    glyphWidthScale: 1.52,
    columnGapPx: 1.5,
    rowGapPx: 1
  },
  topOrigin: {
    initialTopChance: 0.82,
    initialTopPortion: 0.27,
    reachesBottomChance: 0.11,
    endMinRows: 0.42,
    endMaxRows: 0.68,
    resetStartMin: -3,
    resetStartMax: 1
  },
  releaseModes: {
    eraserChance: 0.22,
    fragmentChance: 0.32,
    deepChance: 0.08,
    fragmentEndMinRows: 0.2,
    fragmentEndMaxRows: 0.5,
    eraserEndMinRows: 0.5,
    eraserEndMaxRows: 0.95
  },
  standaloneRotators: {
    chancePerTick: 0.26,
    maxPerTick: 2,
    upperBiasPower: 1.85,
    unrestrictedChance: 0.16,
    lowerScreenKeepChance: 0.18,
    minLifeTicks: 34,
    maxLifeTicks: 82,
    minAlpha: 0.36,
    maxAlpha: 0.88,
    minRotateTicks: 5,
    maxRotateTicks: 16
  },
  wallpaperProperties: {
    density: 62,
    speed: 55,
    brightness: 75,
    glyphscale: 100,
    glow: true
  },
  baseColor: BASE_COLOR
};

const settings = {
  density: DEFAULT_PRESET.wallpaperProperties.density,
  speed: DEFAULT_PRESET.wallpaperProperties.speed,
  brightness: DEFAULT_PRESET.wallpaperProperties.brightness,
  glyphscale: DEFAULT_PRESET.wallpaperProperties.glyphscale,
  glow: DEFAULT_PRESET.wallpaperProperties.glow,
  color: DEFAULT_PRESET.baseColor,
  fps: 0
};

let width = 0;
let height = 0;
let dpr = 1;
let rows = 60;
let gridColumns = 0;
let cellWidth = 20;
let cellHeight = 36;
let fontSize = 27;
let activeColumns = [];
let palettes = [];
let glyphCache = new Map();
let animationFrame = 0;
let lastFrameTime = 0;
let fpsRemainder = 0;
let tickAccumulator = 0;
let logicalTick = 0;
let releaseCounter = 0;
let renderSeconds = 0;
let running = true;
let started = false;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function seededRange(seed, min, max) {
  return min + hashUnit(seed) * (max - min);
}

function hashInt(value) {
  let n = value | 0;
  n = Math.imul(n ^ (n >>> 15), 2246822519);
  n = Math.imul(n ^ (n >>> 13), 3266489917);
  return (n ^ (n >>> 16)) >>> 0;
}

function hashUnit(value) {
  return hashInt(value) / 4294967295;
}

function scaleColor(color, multiplier) {
  return {
    r: clamp(Math.round(color.r * multiplier), 0, 255),
    g: clamp(Math.round(color.g * multiplier), 0, 255),
    b: clamp(Math.round(color.b * multiplier), 0, 255)
  };
}

function mixColor(a, b, amount) {
  const inverse = 1 - amount;
  return {
    r: Math.round(a.r * inverse + b.r * amount),
    g: Math.round(a.g * inverse + b.g * amount),
    b: Math.round(a.b * inverse + b.b * amount)
  };
}

function rgb(color) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function rgba(color, alpha) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function fillScaledText(context, text, x, y, scaleX) {
  context.save();
  context.translate(x, y);
  context.scale(scaleX, 1);
  context.fillText(text, 0, 0);
  context.restore();
}

function parseWallpaperColor(value) {
  if (typeof value !== "string") {
    return DEFAULT_PRESET.baseColor;
  }

  const parts = value.trim().split(/\s+/).map(Number);

  if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) {
    return DEFAULT_PRESET.baseColor;
  }

  return {
    r: clamp(Math.ceil(parts[0] * 255), 0, 255),
    g: clamp(Math.ceil(parts[1] * 255), 0, 255),
    b: clamp(Math.ceil(parts[2] * 255), 0, 255)
  };
}

function chooseStableChar(seed, columnIndex, rowIndex, salt = 0) {
  const mixed = hashInt(seed ^ Math.imul(columnIndex + 4099, 374761393) ^ Math.imul(rowIndex + salt, 668265263));
  return CHAR_POOL[mixed % CHAR_POOL.length];
}

function buildPalettes() {
  const brightness = clamp(settings.brightness / 72, 0.48, 1.38);
  const colorVariance = DEFAULT_PRESET.colorVariance / 100;
  const glowIntensity = DEFAULT_PRESET.glowingTracers.intensity / 100;
  const white = { r: 255, g: 255, b: 255 };
  const variants = [
    { name: "dim", body: 0.58, dim: 0.18, pale: 0.02, head: 0.48, glow: 0.16 },
    { name: "normal", body: 0.88, dim: 0.27, pale: 0.05, head: 0.65, glow: 0.22 },
    { name: "pale", body: 0.92, dim: 0.32, pale: 0.27, head: 0.82, glow: 0.28 },
    { name: "accent", body: 1.08, dim: 0.38, pale: 0.12, head: 0.92, glow: 0.34 },
    { name: "negative", body: 0.42, dim: 0.12, pale: 0, head: 0.35, glow: 0.08 }
  ];

  palettes = variants.map((variant) => {
    const pale = variant.pale * colorVariance;
    const body = mixColor(scaleColor(settings.color, variant.body * brightness), white, pale);
    const dim = mixColor(scaleColor(settings.color, variant.dim * brightness), white, pale * 0.35);
    const bright = mixColor(body, white, variant.head * 0.55);
    const head = mixColor(body, white, variant.head);

    return {
      name: variant.name,
      dim: rgb(dim),
      body: rgb(body),
      bright: rgb(bright),
      head: rgb(head),
      glow: rgba(mixColor(body, white, 0.22), variant.glow * glowIntensity * clamp(settings.brightness / 72, 0.45, 1.35))
    };
  });

  glyphCache = new Map();
}

function paletteForColumn(seed) {
  const value = hashUnit(seed);
  if (value < 0.1) return palettes[4];
  if (value < 0.34) return palettes[0];
  if (value < 0.72) return palettes[1];
  if (value < 0.91) return palettes[2];
  return palettes[3];
}

function tickRate() {
  return 24;
}

function streamRowsPerSecond(stream) {
  const base = randomSpeedScale(stream.seed) * clamp(settings.speed / 55, 0.32, 2.05);
  return base;
}

function randomSpeedScale(seed) {
  const variability = DEFAULT_PRESET.speedVariability / 100;
  const minFactor = 1 - variability * 0.5;
  const maxFactor = 1 + variability * 0.5;
  return DEFAULT_PRESET.speedRowsPerSecond * seededRange(seed ^ 0x514d2d3, minFactor, maxFactor);
}

function streamDensity(stream) {
  const target = (stream.negative ? DEFAULT_PRESET.negativeDensity : DEFAULT_PRESET.positiveDensity) / 100;
  const variance = (stream.negative ? DEFAULT_PRESET.negativeDensityVariance : DEFAULT_PRESET.positiveDensityVariance) / 100;
  const min = target - variance * 0.5;
  return clamp((min + hashUnit(stream.seed ^ 0x68a31) * variance) * (settings.density / 62), 0.32, 1);
}

function streamLength(stream, seed) {
  const lengthPreset = DEFAULT_PRESET.streamLength;
  const length = stream.long
    ? seededRange(seed ^ 0x7f3ac21, rows * lengthPreset.longMinRows, rows * lengthPreset.longMaxRows)
    : seededRange(seed ^ 0x2b61fd9, rows * lengthPreset.shortMinRows, rows * lengthPreset.shortMaxRows);
  return Math.max(7, Math.round(length));
}

function tailLevel(cell) {
  const ratio = cell.age / Math.max(1, cell.life);
  if (ratio < 0.34) return 1;
  if (ratio < 0.58) return 0.72;
  if (ratio < 0.76) return 0.48;
  if (ratio < 0.9) return 0.26;
  return 0.12;
}

function rowVisibility(rowIndex) {
  if (!DEFAULT_PRESET.fadeBottom) {
    return 1;
  }

  const fade = DEFAULT_PRESET.bottomFade;
  const boost = DEFAULT_PRESET.entryBoost;
  const t = rowIndex / Math.max(1, rows - 1);
  const falloff = clamp((t - fade.start) / (1 - fade.start), 0, 1);
  const base = fade.baseVisibility - Math.pow(falloff, fade.power) * fade.amount;
  const entryBoost = 1 + clamp((boost.portion - t) / boost.portion, 0, 1) * boost.amount;
  return clamp(base * entryBoost, fade.minVisibility, fade.maxVisibility);
}

function createCell(column, stream, rowIndex, age = 0) {
  const visible = hashUnit(stream.seed ^ Math.imul(rowIndex + 8191, 1103515245)) <= stream.density;

  if (!visible) {
    return null;
  }

  const stableChar = chooseStableChar(column.seed, column.index, rowIndex, stream.patternSalt);
  const rotator = hashUnit(stream.seed ^ Math.imul(rowIndex + 41, 2654435761)) < stream.rotatorRate;
  const alphaUnit = hashUnit(stream.patternSalt ^ Math.imul(rowIndex + 37, 2246822519));
  const alphaPreset = stream.negative ? DEFAULT_PRESET.negativeAlpha : DEFAULT_PRESET.positiveAlpha;
  const alphaBase = alphaPreset.base + alphaUnit * alphaPreset.variance;
  const glowHead = !stream.negative && hashUnit(stream.seed ^ Math.imul(rowIndex + 17, 1597334677)) < stream.headChance;

  return {
    char: stableChar,
    stableChar,
    salt: stream.patternSalt,
    age,
    life: stream.length,
    alpha: 0,
    target: 0,
    baseAlpha: alphaBase * column.intensity,
    rotator,
    nextRotateTick: logicalTick + 10 + Math.floor(hashUnit(stream.seed ^ rowIndex) * 32),
    streamId: stream.id,
    negative: stream.negative,
    glowHead,
    justWritten: age <= 1
  };
}

function writeCell(column, stream, rowIndex, age = 0) {
  if (rowIndex < 0 || rowIndex >= rows) {
    return;
  }

  if (stream.negative) {
    if (hashUnit(stream.seed ^ Math.imul(rowIndex + 8191, 1103515245)) <= stream.density) {
      column.cells[rowIndex] = null;
    }
    return;
  }

  const next = createCell(column, stream, rowIndex, age);
  if (!next) {
    return;
  }

  const current = column.cells[rowIndex];
  if (!current || next.baseAlpha >= current.baseAlpha * 0.78 || current.target < 0.12) {
    next.target = next.baseAlpha * tailLevel(next);
    next.alpha = next.target;
    column.cells[rowIndex] = next;
  }
}

function resetStream(stream, column, initial = false) {
  const cycleSeed = hashInt(stream.seed ^ Math.imul(logicalTick + 1, 2246822519));
  stream.progress = hashUnit(cycleSeed ^ 0x423f) * 0.9;
  stream.patternSalt = DEFAULT_PRESET.samePattern ? stream.seed : cycleSeed;
  stream.length = streamLength(stream, cycleSeed);
  if (stream.mode === "fragment") {
    stream.length = Math.max(6, Math.floor(stream.length * seededRange(cycleSeed ^ 0xb38d, 0.48, 0.78)));
  }
  stream.density = streamDensity(stream);
  const rotatorMean = (stream.negative ? DEFAULT_PRESET.negativeRotatorOccurrence : DEFAULT_PRESET.rotatorOccurrence) / 100;
  const rotatorVariance = (stream.negative ? DEFAULT_PRESET.negativeRotatorVariance : DEFAULT_PRESET.rotatorVariance) / 100;
  stream.rotatorRate = seededRange(
    cycleSeed ^ 0x4881,
    rotatorMean * (1 - rotatorVariance),
    rotatorMean * (1 + rotatorVariance)
  );
  const glow = DEFAULT_PRESET.glowingTracers;
  const glowMean = stream.negative ? glow.negativeOccurrence : glow.occurrence;
  const glowVariance = stream.negative ? 0 : glow.variance;
  stream.headChance = seededRange(
    cycleSeed ^ 0x11eb,
    Math.max(0, glowMean - glowVariance * 0.5) / 100,
    (glowMean + glowVariance * 0.5) / 100
  );
  stream.speed = streamRowsPerSecond(stream);
  const origin = DEFAULT_PRESET.topOrigin;
  const modes = DEFAULT_PRESET.releaseModes;
  if (stream.mode === "fragment") {
    stream.endRow = Math.floor(seededRange(cycleSeed ^ 0x25ef, rows * modes.fragmentEndMinRows, rows * modes.fragmentEndMaxRows));
  } else if (stream.mode === "eraser") {
    stream.endRow = Math.floor(seededRange(cycleSeed ^ 0x25ef, rows * modes.eraserEndMinRows, rows * modes.eraserEndMaxRows));
  } else {
    const reachesBottom = stream.mode === "deep" || hashUnit(cycleSeed ^ 0x671a) < origin.reachesBottomChance;
    stream.endRow = reachesBottom
      ? rows + stream.length + 2
      : Math.floor(seededRange(cycleSeed ^ 0x25ef, rows * origin.endMinRows, rows * origin.endMaxRows));
  }

  if (initial) {
    const topBiased = hashUnit(cycleSeed ^ 0x49ac) < origin.initialTopChance;
    stream.headRow = topBiased
      ? Math.floor(seededRange(cycleSeed ^ 0x8cc5, -stream.length * 0.1, rows * origin.initialTopPortion))
      : Math.floor(seededRange(cycleSeed ^ 0x3f91, rows * 0.12, rows * 0.82));
  } else {
    stream.headRow = Math.floor(seededRange(cycleSeed ^ 0x5d7f, origin.resetStartMin, origin.resetStartMax));
  }

  if (initial) {
    for (let offset = 0; offset < stream.length; offset += 1) {
      writeCell(column, stream, stream.headRow - offset, offset);
    }
  }
}

function createStream(column, ordinal, initial, mode = "normal") {
  const seed = hashInt(column.seed + ordinal * 7919);
  const negative = mode === "eraser" || (ordinal === 0 && hashUnit(column.seed ^ 0x7f4a7c15) < 1 / DEFAULT_PRESET.negativeEveryNthStream);
  const streamMode = negative ? "eraser" : mode;
  const stream = {
    id: `${column.index}:${ordinal}:${seed}`,
    seed,
    negative,
    mode: streamMode,
    long: hashUnit(seed ^ 0x1f123bb5) < DEFAULT_PRESET.streamLength.longChance / 100,
    headRow: 0,
    progress: 0,
    patternSalt: seed,
    length: 0,
    density: 0,
    rotatorRate: 0,
    headChance: 0,
    speed: 0,
    endRow: rows
  };
  resetStream(stream, column, initial);
  return stream;
}

function makeColumn(index, seed) {
  const profile = paletteForColumn(seed);
  const densityBias = clamp((settings.density - 30) / 65, 0, 1);
  const streamRoll = hashUnit(seed ^ 0x55ca12);
  const streamCount =
    streamRoll < 0.26 + densityBias * 0.12
      ? 4
      : streamRoll < 0.72 + densityBias * 0.12
        ? 3
        : 2;
  const intensity = clamp(
    0.86 + hashUnit(seed ^ 0x99103) * (DEFAULT_PRESET.intensityVariance / 100) + (profile.name === "pale" ? 0.18 : 0) - (profile.name === "dim" ? 0.1 : 0),
    0.52,
    1.58
  );
  const column = {
    index,
    seed,
    x: (index + 0.5) * cellWidth,
    palette: profile,
    intensity,
    cells: new Array(rows),
    streams: []
  };

  for (let i = 0; i < streamCount; i += 1) {
    column.streams.push(createStream(column, i, true));
  }

  return column;
}

function buildColumns() {
  const nextColumns = [];
  const occupied = new Set();
  const densityScale = clamp(settings.density / 62, 0.65, 1.75);
  let index = -2;
  let seed = hashInt(PATTERN_SEED ^ Math.imul(rows, 131) ^ Math.imul(gridColumns, 521));

  const addColumn = (columnIndex, columnSeed) => {
    if (occupied.has(columnIndex)) {
      return false;
    }
    occupied.add(columnIndex);
    nextColumns.push(makeColumn(columnIndex, columnSeed));
    return true;
  };

  while (index < gridColumns + 2) {
    const gapRoll = hashUnit(seed ^ 0x21990);
    const gap =
      gapRoll < 0.12
        ? Math.floor(seededRange(seed ^ 0x79f4, 3, 7) / densityScale)
        : gapRoll < 0.42
          ? Math.floor(seededRange(seed ^ 0x9287, 1.4, 3) / densityScale)
          : Math.floor(seededRange(seed ^ 0x4d2a, 1, 2) / densityScale);
    index += Math.max(1, gap);
    seed = hashInt(seed + 97);
    addColumn(index, seed);

    const clusterChance = 0.08 + densityScale * 0.055;
    if (hashUnit(seed ^ 0x447a) < clusterChance && index + 1 < gridColumns + 2) {
      seed = hashInt(seed + 131);
      addColumn(index + 1, seed);
    }
    if (hashUnit(seed ^ 0x8842) < clusterChance * 0.35 && index + 2 < gridColumns + 2) {
      seed = hashInt(seed + 173);
      addColumn(index + 2, seed);
    }
  }

  activeColumns = nextColumns.sort((a, b) => a.index - b.index);
}

function updateCell(column, rowIndex) {
  const cell = column.cells[rowIndex];
  if (!cell) {
    return;
  }

  cell.age += 1;
  cell.justWritten = false;

  const ratio = cell.age / Math.max(1, cell.life);
  if (ratio >= 1) {
    column.cells[rowIndex] = null;
    return;
  } else {
    cell.target = cell.baseAlpha * tailLevel(cell);
  }

  if (cell.rotator && logicalTick >= cell.nextRotateTick) {
    cell.salt = hashInt(cell.salt + logicalTick + rowIndex);
    cell.char = chooseStableChar(column.seed, column.index, rowIndex, cell.salt);
    cell.nextRotateTick = logicalTick + 12 + Math.floor(hashUnit(cell.salt ^ rowIndex) * 30);
  }

  cell.alpha = cell.target;
}

function stepStream(column, stream) {
  stream.headRow += 1;

  if (stream.headRow > stream.endRow) {
    resetStream(stream, column);
    return;
  }

  writeCell(column, stream, stream.headRow, 0);
}

function releaseSplash() {
  const chance = (1 / DEFAULT_PRESET.releaseEveryTicks) * clamp(settings.density / 62, 0.5, 1.35);
  if (hashUnit(logicalTick * 2654435761) > chance) {
    return;
  }

  releaseCounter += 1;
  const isSplash = DEFAULT_PRESET.splashEveryReleases > 0 && releaseCounter % DEFAULT_PRESET.splashEveryReleases === 0;
  const maxTracers = isSplash ? DEFAULT_PRESET.maxSplashTracers : DEFAULT_PRESET.maxReleaseTracers;
  const count = 1 + Math.floor(hashUnit(logicalTick ^ 0x326c) * maxTracers);
  for (let i = 0; i < count; i += 1) {
    const columnIndex = Math.floor(hashUnit(Math.imul(logicalTick + i + 19, 1103515245)) * activeColumns.length);
    const column = activeColumns[columnIndex];
    if (!column || column.streams.length >= DEFAULT_PRESET.maxConcurrentStreamsPerColumn) {
      continue;
    }
    const modeRoll = hashUnit(Math.imul(logicalTick + i + 101, 1597334677));
    const modes = DEFAULT_PRESET.releaseModes;
    const mode =
      modeRoll < modes.eraserChance
        ? "eraser"
        : modeRoll < modes.eraserChance + modes.fragmentChance
          ? "fragment"
          : modeRoll > 1 - modes.deepChance
            ? "deep"
            : "normal";
    const stream = createStream(column, column.streams.length + i + logicalTick, false, mode);
    stream.length = Math.max(10, Math.floor(stream.length * seededRange(stream.seed ^ 0x751e, 0.68, 1.25)));
    stream.speed *= seededRange(stream.seed ^ 0x431c, 0.9, 1.42);
    column.streams.push(stream);
  }
}

function releaseStandaloneRotators() {
  const rotators = DEFAULT_PRESET.standaloneRotators;
  const chance = rotators.chancePerTick * clamp(settings.density / 62, 0.55, 1.35);
  if (hashUnit(Math.imul(logicalTick + 29, 1597334677)) > chance) {
    return;
  }

  const count = 1 + Math.floor(hashUnit(logicalTick ^ 0x62a3) * rotators.maxPerTick);
  for (let i = 0; i < count; i += 1) {
    const columnIndex = Math.floor(hashUnit(Math.imul(logicalTick + i + 73, 1103515245)) * activeColumns.length);
    const column = activeColumns[columnIndex];
    if (!column) {
      continue;
    }

    const seed = hashInt(column.seed ^ Math.imul(logicalTick + i + 1, 374761393));
    const rowUnit = hashUnit(seed ^ 0x934a);
    const unrestricted = hashUnit(seed ^ 0x21ec) < rotators.unrestrictedChance;
    const row = unrestricted
      ? Math.floor(rowUnit * rows)
      : Math.floor(Math.pow(rowUnit, rotators.upperBiasPower) * rows);

    if (row < 0 || row >= rows) {
      continue;
    }
    if (row > rows * 0.68 && hashUnit(seed ^ 0x72dd) > rotators.lowerScreenKeepChance) {
      continue;
    }

    const current = column.cells[row];
    if (current && current.target > 0.12) {
      continue;
    }

    const life = Math.floor(seededRange(seed ^ 0x44f1, rotators.minLifeTicks, rotators.maxLifeTicks));
    const baseAlpha = seededRange(seed ^ 0x9e3d, rotators.minAlpha, rotators.maxAlpha) * column.intensity;
    const charSalt = hashInt(seed ^ 0xa531);
    column.cells[row] = {
      char: chooseStableChar(column.seed, column.index, row, charSalt),
      stableChar: chooseStableChar(column.seed, column.index, row, charSalt),
      salt: charSalt,
      age: 0,
      life,
      alpha: baseAlpha,
      target: baseAlpha,
      baseAlpha,
      rotator: true,
      nextRotateTick: logicalTick + Math.floor(seededRange(seed ^ 0x148d, rotators.minRotateTicks, rotators.maxRotateTicks)),
      streamId: `solo:${column.index}:${row}:${seed}`,
      negative: false,
      glowHead: hashUnit(seed ^ 0xd82f) < 0.18,
      justWritten: true
    };
  }
}

function logicStep() {
  logicalTick += 1;

  for (const column of activeColumns) {
    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      updateCell(column, rowIndex);
    }

    for (let i = column.streams.length - 1; i >= 0; i -= 1) {
      const stream = column.streams[i];
      stream.progress += stream.speed / tickRate();

      while (stream.progress >= 1) {
        stream.progress -= 1;
        stepStream(column, stream);
      }

      if (column.streams.length > 4 && stream.headRow > rows + stream.length + 2) {
        column.streams.splice(i, 1);
      }
    }
  }

  releaseSplash();
  releaseStandaloneRotators();
}

function createGlyph(char, styleName, palette) {
  const key = `${fontSize}:${dpr}:${styleName}:${settings.glow}:${palette.name}:${palette.body}:${char}`;
  const cached = glyphCache.get(key);

  if (cached) {
    return cached;
  }

  const sprite = document.createElement("canvas");
  const layout = DEFAULT_PRESET.layout;
  const glyphBoxWidth = Math.max(1, cellWidth - Math.max(1, layout.columnGapPx));
  const cssWidth = Math.max(1, Math.floor(cellWidth));
  const cssHeight = Math.max(1, Math.floor(cellHeight));
  sprite.width = Math.ceil(cssWidth * dpr);
  sprite.height = Math.ceil(cssHeight * dpr);
  sprite.cssWidth = cssWidth;
  sprite.cssHeight = cssHeight;

  const sctx = sprite.getContext("2d");
  sctx.imageSmoothingEnabled = false;
  sctx.scale(dpr, dpr);
  sctx.clearRect(0, 0, cssWidth, cssHeight);
  sctx.font = `${fontSize}px ${FONT_FAMILY}`;
  sctx.textAlign = "center";
  sctx.textBaseline = "middle";

  const centerX = Math.round(cssWidth / 2);
  const centerY = Math.round(cssHeight / 2 + fontSize * 0.03);
  const color = palette[styleName] || palette.body;
  const measuredWidth = Math.max(1, sctx.measureText(char).width);
  const maxScale = Math.max(0.72, glyphBoxWidth / measuredWidth);
  const scaleX = clamp(layout.glyphWidthScale, 0.72, maxScale);

  if (settings.glow) {
    if (styleName === "head") {
      sctx.shadowColor = palette.glow;
      sctx.shadowBlur = fontSize * 0.28;
      sctx.fillStyle = palette.bright;
      fillScaledText(sctx, char, centerX, centerY, scaleX);
    } else if (styleName === "bright") {
      sctx.shadowColor = palette.glow;
      sctx.shadowBlur = fontSize * 0.16;
    } else if (styleName === "body") {
      sctx.shadowColor = palette.glow;
      sctx.shadowBlur = fontSize * 0.08;
    } else {
      sctx.shadowColor = "rgba(0, 180, 70, 0.08)";
      sctx.shadowBlur = fontSize * 0.04;
    }
  }

  sctx.shadowBlur = 0;
  sctx.shadowColor = "transparent";
  sctx.fillStyle = color;
  fillScaledText(sctx, char, centerX, centerY, scaleX);
  glyphCache.set(key, sprite);
  return sprite;
}

function drawGlyph(cell, column, rowIndex) {
  const age = cell.age;
  let styleName = "body";
  let alpha = cell.alpha;
  const glowIntensity = DEFAULT_PRESET.glowingTracers.intensity / 100;

  if (!cell.negative && cell.glowHead && age <= 1) {
    styleName = "head";
    alpha *= 1 + 0.28 * glowIntensity;
  } else if (!cell.negative && age <= 2) {
    styleName = "bright";
    alpha *= 0.76 + 0.1 * glowIntensity;
  } else if (cell.negative || alpha < 0.2) {
    styleName = "dim";
    alpha *= cell.negative ? 0.62 : 0.82;
  }

  if (alpha <= 0.012) {
    return;
  }

  const sprite = createGlyph(cell.char, styleName, column.palette);
  const x = column.x;
  const y = (rowIndex + 0.5) * cellHeight;
  ctx.globalAlpha = clamp(alpha * rowVisibility(rowIndex) * clamp(settings.brightness / 72, 0.45, 1.32), 0, 1);
  ctx.drawImage(
    sprite,
    Math.round(x - sprite.cssWidth / 2),
    Math.round(y - sprite.cssHeight / 2),
    sprite.cssWidth,
    sprite.cssHeight
  );
}

function render(now = performance.now()) {
  renderSeconds = now / 1000;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

  for (const column of activeColumns) {
    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      const cell = column.cells[rowIndex];
      if (cell) {
        drawGlyph(cell, column, rowIndex);
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function simulationStep(deltaSeconds) {
  tickAccumulator += deltaSeconds;
  const interval = 1 / tickRate();
  let safety = 0;

  while (tickAccumulator >= interval && safety < 8) {
    tickAccumulator -= interval;
    logicStep();
    safety += 1;
  }
}

function frame(now) {
  if (!running) {
    return;
  }

  animationFrame = requestAnimationFrame(frame);

  const deltaSeconds = Math.min(0.12, (now - lastFrameTime) / 1000 || 1 / 60);
  lastFrameTime = now;

  if (settings.fps > 0) {
    const frameInterval = 1 / settings.fps;
    fpsRemainder += deltaSeconds;

    if (fpsRemainder < frameInterval) {
      simulationStep(deltaSeconds);
      return;
    }

    fpsRemainder = Math.max(0, fpsRemainder - frameInterval);
  }

  simulationStep(deltaSeconds);
  render(now);
}

function resize() {
  if (palettes.length === 0) {
    buildPalettes();
  }

  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
  rows = clamp(Math.round(60 * (100 / settings.glyphscale)), 42, 84);
  cellHeight = height / rows;
  fontSize = clamp(
    Math.round(Math.min(cellHeight - DEFAULT_PRESET.layout.rowGapPx, cellHeight * (DEFAULT_PRESET.characterSize / 100))),
    10,
    48
  );
  cellWidth = Math.ceil(Math.max(10, fontSize * DEFAULT_PRESET.layout.glyphAspect + Math.max(1, DEFAULT_PRESET.layout.columnGapPx)));
  gridColumns = Math.ceil(width / cellWidth) + 2;

  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  glyphCache = new Map();
  logicalTick = 0;
  releaseCounter = 0;
  tickAccumulator = 0;
  buildColumns();
  for (let i = 0; i < Math.round(tickRate() * DEFAULT_PRESET.initialWarmupSeconds); i += 1) {
    logicStep();
  }
  render(performance.now());
}

function refreshAppearance() {
  buildPalettes();

  for (const column of activeColumns) {
    column.palette = paletteForColumn(column.seed);
  }

  if (started) {
    render(performance.now());
  }
}

function restartRain() {
  if (started) {
    resize();
  }
}

function start() {
  buildPalettes();
  started = true;
  resize();
  lastFrameTime = performance.now();
  fpsRemainder = 0;
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(frame);
}

window.wallpaperPropertyListener = {
  applyUserProperties(properties) {
    let needsRestart = false;
    let needsAppearanceRefresh = false;

    if (Object.prototype.hasOwnProperty.call(properties, "density")) {
      settings.density = clamp(Number(properties.density.value) || DEFAULT_PRESET.wallpaperProperties.density, 30, 95);
      needsRestart = true;
    }

    if (Object.prototype.hasOwnProperty.call(properties, "speed")) {
      settings.speed = clamp(Number(properties.speed.value) || DEFAULT_PRESET.wallpaperProperties.speed, 20, 100);
    }

    if (Object.prototype.hasOwnProperty.call(properties, "brightness")) {
      settings.brightness = clamp(Number(properties.brightness.value) || DEFAULT_PRESET.wallpaperProperties.brightness, 35, 100);
      needsAppearanceRefresh = true;
    }

    if (Object.prototype.hasOwnProperty.call(properties, "glyphscale")) {
      settings.glyphscale = clamp(Number(properties.glyphscale.value) || DEFAULT_PRESET.wallpaperProperties.glyphscale, 75, 130);
      needsRestart = true;
    }

    if (Object.prototype.hasOwnProperty.call(properties, "glow")) {
      settings.glow = Boolean(properties.glow.value);
      needsAppearanceRefresh = true;
    }

    if (Object.prototype.hasOwnProperty.call(properties, "color")) {
      settings.color = parseWallpaperColor(properties.color.value);
      needsAppearanceRefresh = true;
    }

    if (needsRestart) {
      buildPalettes();
      restartRain();
    } else if (needsAppearanceRefresh) {
      refreshAppearance();
    }
  },

  applyGeneralProperties(properties) {
    if (Object.prototype.hasOwnProperty.call(properties, "fps")) {
      settings.fps = Math.max(0, Number(properties.fps) || 0);
      fpsRemainder = 0;
      lastFrameTime = performance.now();
    }
  }
};

window.addEventListener("resize", () => {
  if (started) {
    resize();
  }
});

document.addEventListener("visibilitychange", () => {
  running = !document.hidden;

  if (running) {
    lastFrameTime = performance.now();
    fpsRemainder = 0;
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(frame);
  } else {
    cancelAnimationFrame(animationFrame);
  }
});

const fontReady = document.fonts
  ? document.fonts.load(`${fontSize || 18}px ${FONT_FAMILY}`).then(() => document.fonts.ready)
  : Promise.resolve();

Promise.race([
  fontReady,
  new Promise((resolve) => {
    window.setTimeout(resolve, 800);
  })
]).then(start);
