"use strict";

const canvas = document.getElementById("matrix-rain");
const ctx = canvas.getContext("2d", { alpha: false });

const FONT_FAMILY = "\"Matrix Code NFI\", monospace";
const DPR_LIMIT = 2;
const BASE_COLOR = { r: 35, g: 217, b: 104 };
const PATTERN_SEED = 0x4d415452;
const DEBUG_STATE_ENABLED = new URLSearchParams(window.location.search).has("debugstate");
const CHAR_POOL =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-*/=<>[]{}()|:;,.!?#$%&\"'";
const GLYPH_MEASURE_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const DEFAULT_PRESET = {
  name: "Default preset",
  source: "TheMatrixTrilogy.scr Basic code metrics / Code appearance",
  speedRowsPerSecond: 24,
  releaseEveryTicks: 5.2,
  maxReleaseTracers: 2,
  splashEveryReleases: 0,
  maxSplashTracers: 0,
  rotatorOccurrence: 1.4,
  rotatorVariance: 18,
  negativeRotatorOccurrence: 0,
  negativeRotatorVariance: 0,
  streamLength: {
    longChance: 48,
    shortMinRows: 0.38,
    shortMaxRows: 0.72,
    longMinRows: 0.78,
    longMaxRows: 1.45
  },
  cellLifetimeScale: 3.4,
  positiveDensity: 88,
  positiveDensityVariance: 14,
  negativeDensity: 88,
  negativeDensityVariance: 12,
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
  streamTone: {
    dimChance: 0.28,
    normalChance: 0.44,
    paleChance: 0.2,
    dimMultiplier: 0.68,
    normalMultiplier: 0.96,
    paleMultiplier: 1.14,
    accentMultiplier: 1.34
  },
  positiveAlpha: {
    base: 0.86,
    variance: 0.06
  },
  negativeAlpha: {
    base: 0.58,
    variance: 0
  },
  characterSize: 100,
  maxConcurrentStreamsPerColumn: 5,
  initialWarmupSeconds: 5,
  bottomFade: {
    baseVisibility: 1.22,
    start: 0.08,
    power: 0.92,
    amount: 0.9,
    minVisibility: 0.14,
    maxVisibility: 1.25
  },
  entryBoost: {
    portion: 0.28,
    amount: 0.16
  },
  layout: {
    referenceWidth: 3840,
    referenceHeight: 2160,
    columnPitchPx: 28,
    rowPitchPx: 37,
    glyphTargetWidthPx: 16,
    glyphTargetHeightPx: 26,
    columnGapPx: 1,
    rowGapPx: 1,
    fontInsetPx: 1,
    fontOversizePx: 4
  },
  rotatingCells: {
    minRotateTicks: 3,
    maxRotateTicks: 8
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
    eraserChance: 0.05,
    fragmentChance: 0.24,
    deepChance: 0.04,
    fragmentEndMinRows: 0.2,
    fragmentEndMaxRows: 0.5,
    eraserEndMinRows: 0.5,
    eraserEndMaxRows: 0.95
  },
  standaloneRotators: {
    chancePerTick: 0.12,
    maxPerTick: 1,
    pairChance: 0,
    tripleChance: 0,
    rotatingChance: 1,
    upperBiasPower: 1.35,
    unrestrictedChance: 0.28,
    lowerScreenKeepChance: 0.78,
    minLifeTicks: 260,
    maxLifeTicks: 640,
    minAlpha: 0.24,
    maxAlpha: 0.52,
    minRotateTicks: 3,
    maxRotateTicks: 9
  },
  lowerFragments: {
    chancePerTick: 0,
    maxPerTick: 2,
    startMinRows: 0.5,
    startMaxRows: 0.84,
    startBiasPower: 1.55,
    minLengthRows: 2,
    maxLengthRows: 7,
    quietGapRows: 7,
    rotatingChance: 0.48,
    brightHeadChance: 0.18,
    minLifeTicks: 40,
    maxLifeTicks: 94,
    minAlpha: 0.34,
    maxAlpha: 0.9,
    minRotateTicks: 7,
    maxRotateTicks: 18
  },
  columnActivity: {
    initialActiveChance: 0.5,
    minActiveTicks: 84,
    maxActiveTicks: 260,
    minQuietTicks: 88,
    maxQuietTicks: 280,
    reawakenStreamRatio: 0.65,
    retireMinTicks: 72,
    retireMaxTicks: 180
  },
  wallpaperProperties: {
    density: 62,
    speed: 76,
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
let glyphScaleX = 1;
let glyphScaleY = 1;
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
let debugStateElement = null;

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
    { name: "dim", body: 0.45, dim: 0.13, pale: 0.01, head: 0.42, glow: 0.1 },
    { name: "normal", body: 0.82, dim: 0.24, pale: 0.04, head: 0.62, glow: 0.18 },
    { name: "pale", body: 0.98, dim: 0.34, pale: 0.24, head: 0.8, glow: 0.24 },
    { name: "accent", body: 1.22, dim: 0.44, pale: 0.16, head: 0.94, glow: 0.32 },
    { name: "negative", body: 0.32, dim: 0.09, pale: 0, head: 0.28, glow: 0.05 }
  ];

  palettes = variants.map((variant) => {
    const pale = variant.pale * colorVariance;
    const body = mixColor(scaleColor(settings.color, variant.body * brightness), white, pale);
    const dim = mixColor(scaleColor(settings.color, variant.dim * brightness), white, pale * 0.35);
    const bright = mixColor(body, white, Math.max(variant.head * 0.6, 0.48));
    const head = mixColor(scaleColor(settings.color, 1.32 * brightness), white, 0.78);
    const glowBase = mixColor(head, settings.color, 0.24);

    return {
      name: variant.name,
      dim: rgb(dim),
      body: rgb(body),
      bright: rgb(bright),
      head: rgb(head),
      glow: rgba(glowBase, Math.max(variant.glow, 0.2) * glowIntensity * clamp(settings.brightness / 72, 0.45, 1.35))
    };
  });

  glyphCache = new Map();
}

function paletteForColumn(seed) {
  const value = hashUnit(seed);
  if (value < 0.16) return palettes[4];
  if (value < 0.43) return palettes[0];
  if (value < 0.72) return palettes[1];
  if (value < 0.9) return palettes[2];
  return palettes[3];
}

function paletteByName(name) {
  return palettes.find((palette) => palette.name === name) || palettes[1] || palettes[0];
}

function toneForSeed(seed) {
  const tone = DEFAULT_PRESET.streamTone;
  const roll = hashUnit(seed ^ 0x6d2b79f5);
  if (roll < tone.dimChance) {
    return {
      paletteName: "dim",
      multiplier: tone.dimMultiplier
    };
  }
  if (roll < tone.dimChance + tone.normalChance) {
    return {
      paletteName: "normal",
      multiplier: tone.normalMultiplier
    };
  }
  if (roll < tone.dimChance + tone.normalChance + tone.paleChance) {
    return {
      paletteName: "pale",
      multiplier: tone.paleMultiplier
    };
  }
  return {
    paletteName: "accent",
    multiplier: tone.accentMultiplier
  };
}

function rotateDelay(seed, rowIndex, preset = DEFAULT_PRESET.rotatingCells) {
  return Math.floor(seededRange(seed ^ Math.imul(rowIndex + 1, 1597334677), preset.minRotateTicks, preset.maxRotateTicks));
}

function tickRate() {
  return 24;
}

function referenceLayoutScale() {
  return Math.max(0.42, (height / DEFAULT_PRESET.layout.referenceHeight) * (settings.glyphscale / 100));
}

function measureMaxGlyphWidth(size) {
  const scratch = document.createElement("canvas");
  const sctx = scratch.getContext("2d");
  sctx.font = `${size}px ${FONT_FAMILY}`;

  let maxWidth = 1;
  for (const char of CHAR_POOL) {
    maxWidth = Math.max(maxWidth, sctx.measureText(char).width);
  }

  return maxWidth;
}

function fitFontSizeForPitch(baseSize, maxGlyphWidth) {
  let size = baseSize;
  while (size > 8 && measureMaxGlyphWidth(size) > maxGlyphWidth) {
    size -= 1;
  }
  return size;
}

function measureMedianGlyphBounds(size) {
  const scratch = document.createElement("canvas");
  const sctx = scratch.getContext("2d");
  sctx.font = `${size}px ${FONT_FAMILY}`;

  const widths = [];
  const heights = [];
  for (const char of GLYPH_MEASURE_POOL) {
    const metrics = sctx.measureText(char);
    const measuredWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight || metrics.width;
    const measuredHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || size;
    widths.push(measuredWidth);
    heights.push(measuredHeight);
  }

  widths.sort((a, b) => a - b);
  heights.sort((a, b) => a - b);
  return {
    width: widths[Math.floor(widths.length / 2)] || 1,
    height: heights[Math.floor(heights.length / 2)] || 1
  };
}

function fillFittedText(context, text, x, y) {
  context.save();
  context.translate(x, y);
  context.scale(glyphScaleX, glyphScaleY);
  context.fillText(text, 0, 0);
  context.restore();
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

function createCell(column, stream, rowIndex, age = 0, forceVisible = false) {
  const visible = forceVisible || hashUnit(stream.seed ^ Math.imul(rowIndex + 8191, 1103515245)) <= stream.density;

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
    life: Math.max(stream.length + 1, Math.round(stream.length * DEFAULT_PRESET.cellLifetimeScale)),
    alpha: 0,
    target: 0,
    baseAlpha: alphaBase * column.intensity,
    paletteName: column.paletteName,
    rotator,
    head: false,
    nextRotateTick: logicalTick + rotateDelay(stream.seed, rowIndex),
    streamId: stream.id,
    negative: stream.negative,
    glowHead,
    justWritten: age <= 1
  };
}

function writeCell(column, stream, rowIndex, age = 0, options = {}) {
  if (rowIndex < 0 || rowIndex >= rows) {
    return;
  }

  if (stream.negative) {
    column.cells[rowIndex] = null;
    return;
  }

  const next = createCell(column, stream, rowIndex, age, options.forceVisible);
  if (!next) {
    return;
  }

  const current = column.cells[rowIndex];
  if (current && !current.negative && current.target > 0.12) {
    if (options.head) {
      current.head = true;
      current.headStreamId = stream.id;
      current.glowHead = true;
    }
    return current;
  }

  next.target = next.baseAlpha;
  next.alpha = next.target;
  next.head = Boolean(options.head);
  next.headStreamId = options.head ? stream.id : null;
  next.glowHead = next.glowHead || next.head;
  column.cells[rowIndex] = next;
  return next;
}

function demoteStreamHead(column, stream) {
  if (!Number.isInteger(stream.headCellRow)) {
    return;
  }

  const cell = column.cells[stream.headCellRow];
  if (cell && cell.head && cell.headStreamId === stream.id) {
    cell.head = false;
    cell.headStreamId = null;
    cell.glowHead = false;
  }

  stream.headCellRow = null;
}

function resetStream(stream, column, initial = false) {
  const cycleSeed = hashInt(stream.seed ^ Math.imul(logicalTick + 1, 2246822519));
  demoteStreamHead(column, stream);
  stream.finished = false;
  stream.progress = hashUnit(cycleSeed ^ 0x423f) * 0.9;
  stream.patternSalt = DEFAULT_PRESET.samePattern ? stream.seed : cycleSeed;
  stream.paletteName = column.paletteName;
  stream.toneMultiplier = 1;
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
      const written = writeCell(column, stream, stream.headRow - offset, offset, {
        forceVisible: offset === 0,
        head: offset === 0 && !stream.negative
      });
      if (offset === 0 && written) {
        stream.headCellRow = stream.headRow;
      }
    }
  }
}

function createStream(column, ordinal, initial, mode = "normal") {
  const seed = hashInt(column.seed + ordinal * 7919);
  const negative = mode === "eraser";
  const streamMode = negative ? "eraser" : mode;
  const stream = {
    id: `${column.index}:${ordinal}:${seed}`,
    seed,
    negative,
    mode: streamMode,
    long: hashUnit(seed ^ 0x1f123bb5) < DEFAULT_PRESET.streamLength.longChance / 100,
    headRow: 0,
    headCellRow: null,
    progress: 0,
    patternSalt: seed,
    length: 0,
    density: 0,
    rotatorRate: 0,
    headChance: 0,
    paletteName: "normal",
    toneMultiplier: 1,
    speed: 0,
    endRow: rows,
    finished: false
  };
  resetStream(stream, column, initial);
  return stream;
}

function makeColumn(index, seed) {
  const tone = toneForSeed(seed);
  const profile = paletteByName(tone.paletteName) || paletteForColumn(seed);
  const streamCount = desiredStreamCount(seed);
  const active = hashUnit(seed ^ 0x4d23a) < DEFAULT_PRESET.columnActivity.initialActiveChance;
  const activitySeed = hashInt(seed ^ 0x359ac);
  const intensity = clamp(tone.multiplier * seededRange(seed ^ 0x99103, 0.94, 1.08), 0.58, 1.38);
  const column = {
    index,
    seed,
    x: (index + 0.5) * cellWidth,
    palette: profile,
    paletteName: tone.paletteName,
    intensity,
    streamTarget: streamCount,
    nextStreamOrdinal: 0,
    active: false,
    activitySeed,
    nextActivityTick: 0,
    cells: new Array(rows),
    streams: []
  };

  setColumnActivity(column, active, activitySeed, true);
  return column;
}

function desiredStreamCount(seed) {
  const densityBias = clamp((settings.density - 30) / 65, 0, 1);
  const streamRoll = hashUnit(seed ^ 0x55ca12);
  return streamRoll < 0.14 + densityBias * 0.08
    ? 4
    : streamRoll < 0.56 + densityBias * 0.1
      ? 3
      : 2;
}

function columnActivityDuration(seed, active) {
  const activity = DEFAULT_PRESET.columnActivity;
  const min = active ? activity.minActiveTicks : activity.minQuietTicks;
  const max = active ? activity.maxActiveTicks : activity.maxQuietTicks;
  return Math.floor(seededRange(seed ^ 0xa91f, min, max));
}

function addColumnStream(column, initial, mode = "normal") {
  const stream = createStream(column, column.nextStreamOrdinal, initial, mode);
  column.nextStreamOrdinal += 1;
  column.streams.push(stream);
  return stream;
}

function ensureColumnStreams(column, initial = false) {
  const activity = DEFAULT_PRESET.columnActivity;
  const target = initial
    ? column.streamTarget
    : Math.max(1, Math.round(column.streamTarget * activity.reawakenStreamRatio));

  while (column.streams.length < target && column.streams.length < DEFAULT_PRESET.maxConcurrentStreamsPerColumn) {
    addColumnStream(column, initial);
  }
}

function retireColumn(column) {
  const activity = DEFAULT_PRESET.columnActivity;
  column.streams.length = 0;

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const cell = column.cells[rowIndex];
    if (!cell) {
      continue;
    }

    const retireTicks = Math.floor(seededRange(column.activitySeed ^ Math.imul(rowIndex + 1, 2246822519), activity.retireMinTicks, activity.retireMaxTicks));
    cell.life = Math.min(cell.life, cell.age + retireTicks);
    cell.glowHead = false;
  }
}

function setColumnActivity(column, active, seed, initial = false) {
  column.active = active;
  column.activitySeed = seed;
  column.nextActivityTick = logicalTick + columnActivityDuration(seed, active);

  if (active) {
    ensureColumnStreams(column, initial);
  } else if (!initial) {
    retireColumn(column);
  }
}

function updateColumnActivity(column) {
  if (logicalTick < column.nextActivityTick) {
    return;
  }

  const seed = hashInt(column.activitySeed ^ Math.imul(logicalTick + column.index + 4099, 1597334677));
  setColumnActivity(column, !column.active, seed);
}

function rainColumns() {
  return activeColumns.filter((column) => column.active);
}

function buildColumns() {
  const nextColumns = [];
  const seedBase = hashInt(PATTERN_SEED ^ Math.imul(rows, 131) ^ Math.imul(gridColumns, 521));

  for (let index = -2; index < gridColumns + 2; index += 1) {
    const seed = hashInt(seedBase ^ Math.imul(index + 4096, 2654435761));
    nextColumns.push(makeColumn(index, seed));
  }

  activeColumns = nextColumns;
}

function updateCell(column, rowIndex) {
  const cell = column.cells[rowIndex];
  if (!cell) {
    return;
  }

  cell.age += 1;
  cell.justWritten = false;

  if (cell.age >= cell.life) {
    column.cells[rowIndex] = null;
    return;
  }

  if (cell.rotator && logicalTick >= cell.nextRotateTick) {
    cell.salt = hashInt(cell.salt + logicalTick + rowIndex);
    cell.char = chooseStableChar(column.seed, column.index, rowIndex, cell.salt);
    cell.nextRotateTick = logicalTick + rotateDelay(cell.salt, rowIndex);
  }

  cell.target = cell.baseAlpha;
  cell.alpha = cell.baseAlpha;
}

function stepStream(column, stream) {
  demoteStreamHead(column, stream);
  stream.headRow += 1;

  if (stream.headRow > stream.endRow) {
    if (column.active) {
      resetStream(stream, column);
    } else {
      stream.finished = true;
    }
    return;
  }

  const written = writeCell(column, stream, stream.headRow, 0, {
    forceVisible: !stream.negative,
    head: !stream.negative
  });
  if (written) {
    stream.headCellRow = stream.headRow;
  }
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
  const columns = rainColumns();
  if (columns.length === 0) {
    return;
  }

  for (let i = 0; i < count; i += 1) {
    const columnIndex = Math.floor(hashUnit(Math.imul(logicalTick + i + 19, 1103515245)) * columns.length);
    const column = columns[columnIndex];
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
    const stream = addColumnStream(column, false, mode);
    stream.length = Math.max(10, Math.floor(stream.length * seededRange(stream.seed ^ 0x751e, 0.68, 1.25)));
    stream.speed *= seededRange(stream.seed ^ 0x431c, 0.9, 1.42);
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

    const sizeRoll = hashUnit(seed ^ 0x5a4f);
    const groupSize = sizeRoll < rotators.tripleChance ? 3 : sizeRoll < rotators.tripleChance + rotators.pairChance ? 2 : 1;
    const startRow = Math.min(row, rows - groupSize);
    const life = Math.floor(seededRange(seed ^ 0x44f1, rotators.minLifeTicks, rotators.maxLifeTicks));
    const baseAlpha = seededRange(seed ^ 0x9e3d, rotators.minAlpha, rotators.maxAlpha) * column.intensity;
    const rotates = hashUnit(seed ^ 0x71dd) < rotators.rotatingChance;

    for (let offset = 0; offset < groupSize; offset += 1) {
      const targetRow = startRow + offset;
      const current = column.cells[targetRow];
      if (current && current.target > 0.12) {
        continue;
      }

      const charSalt = hashInt(seed ^ Math.imul(offset + 1, 0xa531));
      const char = chooseStableChar(column.seed, column.index, targetRow, charSalt);
      column.cells[targetRow] = {
        char,
        stableChar: char,
        salt: charSalt,
        age: 0,
        life,
        alpha: baseAlpha,
        target: baseAlpha,
        baseAlpha,
        paletteName: column.paletteName,
        rotator: rotates,
        nextRotateTick: logicalTick + rotateDelay(charSalt, targetRow, rotators),
        streamId: `solo:${column.index}:${targetRow}:${seed}`,
        negative: false,
        glowHead: false,
        justWritten: true
      };
    }
  }
}

function hasQuietGap(column, startRow, gapRows) {
  const from = Math.max(0, startRow - gapRows);
  for (let rowIndex = from; rowIndex < startRow; rowIndex += 1) {
    const cell = column.cells[rowIndex];
    if (cell && cell.target > 0.08) {
      return false;
    }
  }
  return true;
}

function hasWritableRows(column, startRow, length) {
  for (let offset = 0; offset < length; offset += 1) {
    const cell = column.cells[startRow + offset];
    if (cell && cell.target > 0.12) {
      return false;
    }
  }
  return true;
}

function releaseLowerFragments() {
  const fragments = DEFAULT_PRESET.lowerFragments;
  const chance = fragments.chancePerTick * clamp(settings.density / 62, 0.55, 1.3);
  if (hashUnit(Math.imul(logicalTick + 47, 1103515245)) > chance) {
    return;
  }

  const count = 1 + Math.floor(hashUnit(logicalTick ^ 0x5f31) * fragments.maxPerTick);
  for (let i = 0; i < count; i += 1) {
    const seed = hashInt(Math.imul(logicalTick + i + 17, 374761393) ^ PATTERN_SEED);
    const startUnit = Math.pow(hashUnit(seed ^ 0x84cd), fragments.startBiasPower);
    const startMin = rows * fragments.startMinRows;
    const startMax = rows * fragments.startMaxRows;
    const randomStart = seededRange(seed ^ 0x2ac1, startMin, startMax);
    const startRow = Math.floor(randomStart * (1 - startUnit) + startMin * startUnit);
    const length = Math.min(
      rows - startRow,
      Math.floor(seededRange(seed ^ 0x33d1, fragments.minLengthRows, fragments.maxLengthRows + 1))
    );

    if (length <= 0) {
      continue;
    }

    let column = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const columnIndex = Math.floor(hashUnit(seed ^ Math.imul(attempt + 3, 1597334677)) * activeColumns.length);
      const candidate = activeColumns[columnIndex];
      if (candidate && hasQuietGap(candidate, startRow, fragments.quietGapRows) && hasWritableRows(candidate, startRow, length)) {
        column = candidate;
        break;
      }
    }

    if (!column) {
      continue;
    }

    const life = Math.floor(seededRange(seed ^ 0x44f1, fragments.minLifeTicks, fragments.maxLifeTicks));
    const baseAlpha = seededRange(seed ^ 0x9e3d, fragments.minAlpha, fragments.maxAlpha) * column.intensity;
    const rotates = hashUnit(seed ^ 0x71dd) < fragments.rotatingChance;

    for (let offset = 0; offset < length; offset += 1) {
      const rowIndex = startRow + offset;
      const charSalt = hashInt(seed ^ Math.imul(offset + 1, 0x85ebca6b));
      const char = chooseStableChar(column.seed, column.index, rowIndex, charSalt);
      const rowAlpha = baseAlpha;
      column.cells[rowIndex] = {
        char,
        stableChar: char,
        salt: charSalt,
        age: Math.floor(hashUnit(charSalt ^ 0x391f) * 4),
        life,
        alpha: rowAlpha,
        target: rowAlpha,
        baseAlpha: rowAlpha,
        paletteName: column.paletteName,
        rotator: rotates && hashUnit(charSalt ^ 0x1e7a) < 0.58,
        nextRotateTick: logicalTick + rotateDelay(charSalt, rowIndex, fragments),
        streamId: `lower:${column.index}:${rowIndex}:${seed}`,
        negative: false,
        glowHead: offset === 0 && hashUnit(charSalt ^ 0xd82f) < fragments.brightHeadChance,
        justWritten: true
      };
    }
  }
}

function logicStep() {
  logicalTick += 1;

  for (const column of activeColumns) {
    updateColumnActivity(column);

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      updateCell(column, rowIndex);
    }

    for (let i = column.streams.length - 1; i >= 0; i -= 1) {
      const stream = column.streams[i];
      stream.progress += stream.speed / tickRate();

      while (stream.progress >= 1 && !stream.finished) {
        stream.progress -= 1;
        stepStream(column, stream);
      }

      if (stream.finished || (column.streams.length > 4 && stream.headRow > rows + stream.length + 2)) {
        column.streams.splice(i, 1);
      }
    }
  }

  releaseSplash();
  releaseStandaloneRotators();
  releaseLowerFragments();
}

function createGlyph(char, styleName, palette) {
  const key = `${cellWidth}:${cellHeight}:${fontSize}:${glyphScaleX}:${glyphScaleY}:${dpr}:${styleName}:${settings.glow}:${palette.name}:${palette.body}:${char}`;
  const cached = glyphCache.get(key);

  if (cached) {
    return cached;
  }

  const sprite = document.createElement("canvas");
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

  if (settings.glow) {
    if (styleName === "head") {
      sctx.shadowColor = palette.glow;
      sctx.shadowBlur = fontSize * 0.28;
      sctx.fillStyle = palette.bright;
      fillFittedText(sctx, char, centerX, centerY);
    } else if (styleName === "bright") {
      sctx.shadowColor = palette.glow;
      sctx.shadowBlur = fontSize * 0.1;
    } else if (styleName === "body") {
      sctx.shadowColor = palette.glow;
      sctx.shadowBlur = fontSize * 0.025;
    } else {
      sctx.shadowColor = "rgba(0, 180, 70, 0.08)";
      sctx.shadowBlur = fontSize * 0.015;
    }
  }

  sctx.shadowBlur = 0;
  sctx.shadowColor = "transparent";
  sctx.fillStyle = color;
  fillFittedText(sctx, char, centerX, centerY);
  glyphCache.set(key, sprite);
  return sprite;
}

function drawGlyph(cell, column, rowIndex) {
  let styleName = "body";
  let alpha = cell.alpha;
  const glowIntensity = DEFAULT_PRESET.glowingTracers.intensity / 100;

  if (cell.head) {
    styleName = "head";
    alpha *= 1.18 + 0.08 * glowIntensity;
  } else if (cell.negative || alpha < 0.2) {
    styleName = "dim";
    alpha *= cell.negative ? 0.62 : 0.82;
  } else if (cell.rotator && cell.glowHead) {
    styleName = "bright";
    alpha *= 0.92 + 0.04 * glowIntensity;
  }

  if (alpha <= 0.012) {
    return;
  }

  const palette = paletteByName(cell.paletteName) || column.palette;
  const sprite = createGlyph(cell.char, styleName, palette);
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
  publishDebugState();
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
  const layout = DEFAULT_PRESET.layout;
  const layoutScale = referenceLayoutScale();
  cellHeight = Math.max(10, Math.round(layout.rowPitchPx * layoutScale));
  cellWidth = Math.max(8, Math.round(layout.columnPitchPx * layoutScale));
  rows = clamp(Math.ceil(height / cellHeight), 36, 96);
  fontSize = fitFontSizeForPitch(
    clamp(Math.round(cellHeight - layout.rowGapPx - layout.fontInsetPx + layout.fontOversizePx), 9, 72),
    Math.max(1, cellWidth - layout.columnGapPx)
  );
  const glyphBounds = measureMedianGlyphBounds(fontSize);
  glyphScaleX = clamp((layout.glyphTargetWidthPx * layoutScale) / glyphBounds.width, 0.72, 1.35);
  glyphScaleY = clamp((layout.glyphTargetHeightPx * layoutScale) / glyphBounds.height, 0.72, 1.35);
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

function collectMatrixRainState() {
  return {
    rows,
    gridColumns,
    cellWidth,
    cellHeight,
    fontSize,
    glyphScaleX,
    glyphScaleY,
    dpr,
    layout: DEFAULT_PRESET.layout,
    speedRowsPerSecond: DEFAULT_PRESET.speedRowsPerSecond,
    settingsSpeed: settings.speed,
    columns: activeColumns.map((column) => ({
      index: column.index,
      active: column.active,
      streams: column.streams.map((stream) => {
        const cell = Number.isInteger(stream.headCellRow) ? column.cells[stream.headCellRow] : null;
        return {
          id: stream.id,
          negative: stream.negative,
          finished: stream.finished,
          headRow: stream.headCellRow,
          hasHead: Boolean(cell && cell.head && cell.headStreamId === stream.id)
        };
      })
    }))
  };
}

function ensureDebugStateElement() {
  if (!DEBUG_STATE_ENABLED) {
    return null;
  }

  if (debugStateElement) {
    return debugStateElement;
  }

  debugStateElement = document.createElement("script");
  debugStateElement.id = "matrix-debug-state";
  debugStateElement.type = "application/json";
  document.body.appendChild(debugStateElement);
  return debugStateElement;
}

function publishDebugState() {
  const element = ensureDebugStateElement();
  if (!element) {
    return;
  }

  element.textContent = JSON.stringify(collectMatrixRainState());
}

window.__matrixRainState = collectMatrixRainState;

function refreshAppearance() {
  buildPalettes();

  for (const column of activeColumns) {
    column.palette = paletteByName(column.paletteName) || paletteForColumn(column.seed);
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

const fontReady = document.fonts && typeof document.fonts.load === "function"
  ? document.fonts.load(`${fontSize || 18}px ${FONT_FAMILY}`).then(() => document.fonts.ready)
  : Promise.resolve();

Promise.race([
  fontReady,
  new Promise((resolve) => {
    window.setTimeout(resolve, 800);
  })
]).then(start);
