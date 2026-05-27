"use strict";

const canvas = document.getElementById("matrix-rain");
const ctx = canvas.getContext("2d", { alpha: false });

const FONT_FAMILY = "\"Matrix Code\", monospace";
const DPR_LIMIT = 2;
const BASE_COLOR = { r: 54, g: 217, b: 105 };
const GLYPH_EDGE_ALPHA = 0.72;
const PATTERN_SEED = 0x4d415452;
const DEBUG_STATE_ENABLED = new URLSearchParams(window.location.search).has("debugstate");
const CHAR_POOL = `"*+012345789:<>z|¦©╌▪アウエオカキケコサシスセソタツテナニヌネハヒホマミムメモヤヨラリワー꞊\uE937`;
const CHAR_LIST = Array.from(CHAR_POOL);
const GLYPH_INDEX = new Map(CHAR_LIST.map((char, index) => [char, index]));
const GLYPH_MEASURE_POOL = CHAR_POOL;
const GLYPH_STYLES = ["dim", "body", "bright", "head"];

const REFERENCE_ROW_PROFILE = {
  active: [0.464, 0.464, 0.536, 0.507, 0.421, 0.464, 0.443, 0.45, 0.514, 0.457, 0.493, 0.471, 0.493, 0.471, 0.5, 0.471, 0.5, 0.493, 0.436, 0.429, 0.4, 0.429, 0.421, 0.386, 0.35, 0.371, 0.379, 0.329, 0.35, 0.336, 0.336, 0.35, 0.357, 0.314, 0.329, 0.279, 0.257, 0.257, 0.221, 0.2, 0.2, 0.207, 0.214, 0.221, 0.214, 0.186, 0.157, 0.207, 0.2, 0.193, 0.186, 0.15, 0.107, 0.05, 0.079, 0.071, 0.057, 0.036, 0.021],
  bright: [0.938, 0.831, 0.76, 0.817, 0.78, 0.785, 0.806, 0.794, 0.667, 0.641, 0.812, 0.758, 0.826, 0.803, 0.786, 0.773, 0.729, 0.725, 0.721, 0.8, 0.804, 0.767, 0.847, 0.833, 0.837, 0.827, 0.792, 0.891, 0.898, 0.83, 0.83, 0.816, 0.8, 0.795, 0.783, 0.718, 0.778, 0.694, 0.839, 0.857, 0.893, 0.828, 0.8, 0.806, 0.8, 0.923, 0.955, 0.621, 0.714, 0.815, 0.731, 0.714, 0.867, 0.857, 0.636, 0.9, 0.625, 0.6, 0],
  mean: [159.315, 152.069, 146.505, 150.868, 144.878, 144.559, 149.753, 145.853, 132.962, 130.798, 147.12, 141.361, 141.319, 146.213, 145.43, 142.614, 139.137, 138.165, 142.957, 143.106, 142.568, 139.477, 147.161, 147.757, 147.745, 147.766, 145.848, 153.237, 152.096, 149.033, 150.737, 147.003, 145.323, 141.381, 142.566, 139.692, 142.111, 134.225, 152.837, 149.109, 145.546, 144.841, 143.51, 141.327, 147.757, 153.14, 154.868, 123.971, 132.23, 145.189, 141.798, 134.405, 153.627, 132.764, 137.923, 161.675, 133.806, 136.93, 59.217]
};
const REFERENCE_ACTIVE_MEAN = REFERENCE_ROW_PROFILE.active.reduce((sum, value) => sum + value, 0) / REFERENCE_ROW_PROFILE.active.length;
const REFERENCE_SCORE_MEAN = REFERENCE_ROW_PROFILE.mean.reduce((sum, value) => sum + value, 0) / REFERENCE_ROW_PROFILE.mean.length;

const DEFAULT_PRESET = {
  name: "Default preset",
  source: "TheMatrixTrilogy.scr Basic code metrics / Code appearance",
  // Reference video motion: about 3-3.5 fixed grid rows per 6 frames at 60fps.
  speedRowsPerSecond: 34,
  releaseEveryTicks: 360,
  maxReleaseTracers: 1,
  splashEveryReleases: 0,
  maxSplashTracers: 0,
  rotatorOccurrence: 14,
  rotatorVariance: 30,
  streamRotatorLaneEveryRows: 8,
  streamRotatorLaneChance: 0.72,
  negativeRotatorOccurrence: 0,
  negativeRotatorVariance: 0,
  streamLength: {
    longChance: 48,
    shortMinRows: 0.34,
    shortMaxRows: 0.65,
    longMinRows: 0.7,
    longMaxRows: 1.3
  },
  cellLifetimeScale: 1.65,
  positiveDensity: 74,
  positiveDensityVariance: 16,
  negativeDensity: 88,
  negativeDensityVariance: 12,
  fadeBottom: true,
  samePattern: true,
  glowingTracers: {
    occurrence: 28,
    variance: 14,
    negativeOccurrence: 0.4,
    intensity: 90,
    fallingHeadChance: 0.72
  },
  speedVariability: 90,
  colorVariance: 100,
  intensityVariance: 66,
  streamTone: {
    dimChance: 0.28,
    normalChance: 0.42,
    paleChance: 0.22,
    dimMultiplier: 0.78,
    normalMultiplier: 0.9,
    paleMultiplier: 1.06,
    accentMultiplier: 1.22
  },
  positiveAlpha: {
    base: 0.98,
    variance: 0.08
  },
  negativeAlpha: {
    base: 0.58,
    variance: 0
  },
  characterSize: 100,
  maxConcurrentStreamsPerColumn: 2,
  startup: {
    prewarmSeconds: 12.5,
    seedInitialBodies: false
  },
  initialWarmupSeconds: 12.5,
  bottomFade: {
    baseVisibility: 1,
    start: 0.27,
    power: 1,
    amount: 0.68,
    minVisibility: 0.32,
    maxVisibility: 1.1
  },
  entryBoost: {
    portion: 0.28,
    amount: 0.04
  },
  layout: {
    referenceWidth: 3840,
    referenceHeight: 2160,
    visibleColumns: 134,
    visibleRows: 58,
    columnPitchPx: 28,
    rowPitchPx: 37,
    glyphTargetWidthPx: 18,
    glyphTargetHeightPx: 25,
    columnGapPx: 1,
    rowGapPx: 1,
    fontInsetPx: 1,
    fontOversizePx: 4,
    glyphAspectRatio: 0.8
  },
  rotatingCells: {
    minRotateTicks: 3,
    maxRotateTicks: 8
  },
  topOrigin: {
    initialTopChance: 0.82,
    initialTopPortion: 0.27,
    reachesBottomChance: 0.28,
    endMinRows: 0.56,
    endMaxRows: 0.98,
    resetStartMin: -3,
    resetStartMax: 1
  },
  releaseModes: {
    eraserChance: 0.05,
    fragmentChance: 0.18,
    deepChance: 0.03,
    fragmentEndMinRows: 0.2,
    fragmentEndMaxRows: 0.5,
    eraserEndMinRows: 0.5,
    eraserEndMaxRows: 0.78
  },
  streamRestart: {
    minTicks: 30,
    maxTicks: 95
  },
  ambientGrid: {
    topChance: 0.23,
    midChance: 0.14,
    bottomChance: 0.012,
    columnVariance: 0.34,
    quietColumnChance: 0.24,
    quietColumnMultiplier: 0.04,
    runStartFactor: 0.24,
    runContinueMin: 0.58,
    runContinueByDensity: 0.09,
    runContinueMax: 0.72,
    singletonKeepChance: 0.18,
    singletonColumnizeChance: 0.36,
    bridgeSingleGapChance: 0.22,
    bridgeLowerGapChance: 0.03,
    replenishRate: 0.00012,
    lowerSingletonStart: 0.48,
    lowerSingletonKeepChance: 0.06,
    deepLowerSingletonKeepChance: 0.01,
    lowerSingletonColumnizeChance: 0.12,
    deepLowerSingletonColumnizeChance: 0.04,
    lowerReplenishSingletonKeepChance: 0.1,
    deepLowerReplenishSingletonKeepChance: 0.005,
    lowerSingleBirthKeepChance: 0.15,
    deepLowerSingleBirthKeepChance: 0.01,
    // Keep several fast-changing glyphs distributed through most established columns.
    rotatorChance: 0.26,
    rotatorLaneEveryRows: 7,
    rotatorLaneChance: 0.9,
    charRefreshChance: 0.0011,
    brightFlipChance: 0.008,
    brightChance: 0.68,
    brightAlphaMin: 1.48,
    brightAlphaMax: 1.86,
    bodyAlphaMin: 0.95,
    bodyAlphaMax: 1.18,
    lifeMinTicks: 1500,
    lifeMaxTicks: 3600,
    singleBirthChancePerTick: 0.09,
    singleBirthsPerTick: 1,
    singleBirthAttempts: 10,
    singleLifeMinTicks: 42,
    singleLifeMaxTicks: 120,
    singleBrightChance: 0.58,
    smallColumnChancePerTick: 0.006,
    smallColumnAttempts: 8,
    smallColumnMinRows: 2,
    smallColumnMaxRows: 3,
    lowerSmallColumnKeepChance: 0.08,
    smallColumnLifeMinTicks: 18,
    smallColumnLifeMaxTicks: 42
  },
  standaloneRotators: {
    chancePerTick: 0.004,
    maxPerTick: 1,
    pairChance: 0,
    tripleChance: 0,
    rotatingChance: 1,
    upperBiasPower: 1.68,
    unrestrictedChance: 0.03,
    lowerScreenKeepChance: 0.05,
    minLifeTicks: 80,
    maxLifeTicks: 210,
    minAlpha: 0.32,
    maxAlpha: 0.68,
    minRotateTicks: 3,
    maxRotateTicks: 8
  },
  lowerFragments: {
    chancePerTick: 0.032,
    maxPerTick: 1,
    startMinRows: 0.45,
    startMaxRows: 0.86,
    startBiasPower: 1.55,
    minLengthRows: 3,
    maxLengthRows: 6,
    quietGapRows: 7,
    rotatingChance: 0.32,
    brightHeadChance: 0.45,
    brightCellChance: 0.12,
    minLifeTicks: 5,
    maxLifeTicks: 10,
    minAlpha: 0.44,
    maxAlpha: 0.76,
    minSpeedRowsPerSecond: 22,
    maxSpeedRowsPerSecond: 34,
    minRotateTicks: 4,
    maxRotateTicks: 10
  },
  columnActivity: {
    initialActiveChance: 0.03,
    minActiveTicks: 75,
    maxActiveTicks: 190,
    minQuietTicks: 130,
    maxQuietTicks: 320,
    reawakenStreamRatio: 0.8,
    retireMinTicks: 72,
    retireMaxTicks: 180
  },
  wallpaperProperties: {
    density: 62,
    speed: 55,
    brightness: 100,
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

function sampleReferenceRow(values, rowIndex) {
  if (values.length === 0) {
    return 0;
  }

  if (rows <= 1) {
    return values[0];
  }

  const position = clamp(rowIndex / (rows - 1), 0, 1) * (values.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(values.length - 1, lower + 1);
  const mix = position - lower;
  return values[lower] * (1 - mix) + values[upper] * mix;
}

function referenceActiveFactor(rowIndex) {
  return clamp(sampleReferenceRow(REFERENCE_ROW_PROFILE.active, rowIndex) / REFERENCE_ACTIVE_MEAN, 0.06, 1.55);
}

function referenceBrightnessFactor(rowIndex) {
  return clamp(sampleReferenceRow(REFERENCE_ROW_PROFILE.mean, rowIndex) / REFERENCE_SCORE_MEAN, 0.32, 1.24);
}

function referenceBrightChance(rowIndex, baseChance) {
  const referenceBright = sampleReferenceRow(REFERENCE_ROW_PROFILE.bright, rowIndex);
  return clamp(baseChance * (0.56 + referenceBright * 0.95), 0.015, 0.96);
}

function referenceGlyphDensity(rowIndex, density) {
  return clamp(density * referenceActiveFactor(rowIndex), 0.04, 1);
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

function referenceToneColor(referenceColor, brightness) {
  const baseColor = DEFAULT_PRESET.baseColor;
  const tinted = {
    r: referenceColor.r * (settings.color.r / baseColor.r),
    g: referenceColor.g * (settings.color.g / baseColor.g),
    b: referenceColor.b * (settings.color.b / baseColor.b)
  };

  return scaleColor(tinted, brightness);
}

function buildPalettes() {
  const referenceBrightness = clamp(settings.brightness / 100, 0.45, 1);
  const glowIntensity = DEFAULT_PRESET.glowingTracers.intensity / 100;
  const whiteGreenHead = { r: 253, g: 255, b: 244 };
  const variants = [
    { name: "dim", bodyColor: { r: 29, g: 138, b: 59 }, brightColor: { r: 64, g: 196, b: 100 }, glow: 0.18 },
    { name: "normal", bodyColor: { r: 36, g: 176, b: 75 }, brightColor: { r: 96, g: 228, b: 132 }, glow: 0.28 },
    { name: "pale", bodyColor: { r: 82, g: 226, b: 124 }, brightColor: { r: 156, g: 255, b: 186 }, glow: 0.42 },
    { name: "accent", bodyColor: { r: 135, g: 255, b: 168 }, brightColor: { r: 210, g: 255, b: 220 }, glow: 0.64 },
    { name: "negative", bodyColor: { r: 24, g: 112, b: 50 }, brightColor: { r: 50, g: 166, b: 85 }, glow: 0.14 }
  ];

  palettes = variants.map((variant) => {
    const body = referenceToneColor(variant.bodyColor, referenceBrightness);
    const bright = referenceToneColor(variant.brightColor, referenceBrightness);
    const dim = referenceToneColor(scaleColor(variant.bodyColor, 0.58), referenceBrightness);
    const head = mixColor(whiteGreenHead, settings.color, 0.008);
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
  if (value < 0.28) return palettes[0];
  if (value < 0.56) return palettes[1];
  if (value < 0.84) return palettes[2];
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

function applyColumnTone(column, seed, updateExistingCells = false) {
  const tone = toneForSeed(seed);
  const previousIntensity = Number.isFinite(column.intensity) ? column.intensity : 1;
  const toneJitter = seededRange(seed ^ 0x99103, 0.96, 1.06);
  const nextIntensity = clamp(tone.multiplier * toneJitter, 0.56, 1.34);

  column.paletteName = tone.paletteName;
  column.palette = paletteByName(tone.paletteName) || paletteForColumn(seed);
  column.intensity = nextIntensity;

  if (!updateExistingCells || previousIntensity <= 0) {
    return;
  }

  const ratio = nextIntensity / previousIntensity;
  for (const cell of column.cells) {
    if (!cell || cell.negative) {
      continue;
    }

    cell.paletteName = tone.paletteName;
    cell.baseAlpha = clamp(cell.baseAlpha * ratio, 0.08, 2.2);
    cell.target = cell.baseAlpha;
    cell.alpha = cell.baseAlpha;
  }
}

function rotateDelay(seed, rowIndex, preset = DEFAULT_PRESET.rotatingCells) {
  return Math.floor(seededRange(seed ^ Math.imul(rowIndex + 1, 1597334677), preset.minRotateTicks, preset.maxRotateTicks));
}

function tickRate() {
  return 24;
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

function softenGlyphEdges(sprite) {
  if (GLYPH_EDGE_ALPHA >= 1) {
    return;
  }

  const sctx = sprite.getContext("2d", { willReadFrequently: true });
  const widthPx = sprite.width;
  const heightPx = sprite.height;
  const image = sctx.getImageData(0, 0, widthPx, heightPx);
  const data = image.data;
  const alpha = new Uint8ClampedArray(widthPx * heightPx);

  for (let i = 0; i < alpha.length; i += 1) {
    alpha[i] = data[i * 4 + 3];
  }

  for (let y = 1; y < heightPx - 1; y += 1) {
    for (let x = 1; x < widthPx - 1; x += 1) {
      const index = y * widthPx + x;
      const current = alpha[index];
      if (current === 0) {
        continue;
      }

      const edge =
        alpha[index - 1] < 24 ||
        alpha[index + 1] < 24 ||
        alpha[index - widthPx] < 24 ||
        alpha[index + widthPx] < 24;
      if (!edge) {
        continue;
      }

      data[index * 4 + 3] = Math.round(current * GLYPH_EDGE_ALPHA);
    }
  }

  sctx.putImageData(image, 0, 0);
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
    return referenceBrightnessFactor(rowIndex);
  }

  const fade = DEFAULT_PRESET.bottomFade;
  const boost = DEFAULT_PRESET.entryBoost;
  const t = rowIndex / Math.max(1, rows - 1);
  const falloff = clamp((t - fade.start) / (1 - fade.start), 0, 1);
  const base = fade.baseVisibility - Math.pow(falloff, fade.power) * fade.amount;
  const entryBoost = 1 + clamp((boost.portion - t) / boost.portion, 0, 1) * boost.amount;
  return clamp(base * entryBoost * referenceBrightnessFactor(rowIndex), fade.minVisibility, fade.maxVisibility);
}

function ambientRegionChance(rowIndex) {
  return clamp(sampleReferenceRow(REFERENCE_ROW_PROFILE.active, rowIndex) * 0.38, 0.006, 0.24);
}

function ambientColumnMultiplier(column) {
  const ambient = DEFAULT_PRESET.ambientGrid;
  if (hashUnit(column.seed ^ 0x4c171) < ambient.quietColumnChance) {
    return ambient.quietColumnMultiplier;
  }

  const variance = ambient.columnVariance;
  return seededRange(column.seed ^ 0x68bf13, 1 - variance, 1 + variance);
}

function ambientCellChance(column, rowIndex) {
  return clamp(ambientRegionChance(rowIndex) * ambientColumnMultiplier(column) * clamp(settings.density / 62, 0.58, 1.28), 0.02, 0.72);
}

function ambientStartChance(column, rowIndex) {
  return clamp(ambientCellChance(column, rowIndex) * DEFAULT_PRESET.ambientGrid.runStartFactor, 0.004, 0.28);
}

function ambientContinueChance(column, rowIndex) {
  const ambient = DEFAULT_PRESET.ambientGrid;
  const chance = ambient.runContinueMin + ambientCellChance(column, rowIndex) * ambient.runContinueByDensity;
  return clamp(chance, ambient.runContinueMin, ambient.runContinueMax);
}

function hasAdjacentCell(column, rowIndex) {
  if (rowIndex > 0 && column.cells[rowIndex - 1]) {
    return true;
  }
  if (rowIndex < rows - 1 && column.cells[rowIndex + 1]) {
    return true;
  }

  const left = activeColumns.find((candidate) => candidate.index === column.index - 1);
  const right = activeColumns.find((candidate) => candidate.index === column.index + 1);
  return Boolean(
    (left && left.cells[rowIndex]) ||
    (right && right.cells[rowIndex])
  );
}

function hasVerticalCell(column, rowIndex) {
  return Boolean(
    (rowIndex > 0 && column.cells[rowIndex - 1]) ||
    (rowIndex < rows - 1 && column.cells[rowIndex + 1])
  );
}

function cellVisibleEnough(cell, rowIndex) {
  if (!cell || cell.negative) {
    return false;
  }

  const brightness = clamp(settings.brightness / 72, 0.45, 1.32);
  const glowBoost = cell.head || cell.glowHead ? 1.24 : 1;
  return cell.baseAlpha * rowVisibility(rowIndex) * brightness * glowBoost > 0.22;
}

function hasVisibleVerticalCell(column, rowIndex) {
  return Boolean(
    (rowIndex > 0 && cellVisibleEnough(column.cells[rowIndex - 1], rowIndex - 1)) ||
    (rowIndex < rows - 1 && cellVisibleEnough(column.cells[rowIndex + 1], rowIndex + 1))
  );
}

function isMiddleScreenRow(rowIndex) {
  const rowUnit = rowIndex / Math.max(1, rows - 1);
  return rowUnit >= 0.18 && rowUnit <= 0.84;
}

function demoteUnsupportedBrightCell(column, rowIndex, cell, seed, extraLifeTicks) {
  if (!isMiddleScreenRow(rowIndex) || hasVisibleVerticalCell(column, rowIndex)) {
    return false;
  }

  cell.head = false;
  cell.headStreamId = null;
  cell.headPreviousGlowHead = false;
  cell.glowHead = false;
  cell.baseAlpha = seededRange(seed ^ 0x4a91, 0.34, 0.62) * column.intensity * referenceBrightnessFactor(rowIndex);
  cell.target = cell.baseAlpha;
  cell.alpha = cell.baseAlpha;
  cell.life = Math.min(cell.life, cell.age + extraLifeTicks);
  return true;
}

function isLowerSingletonRow(rowIndex) {
  return rowIndex / Math.max(1, rows - 1) >= DEFAULT_PRESET.ambientGrid.lowerSingletonStart;
}

function lowerDepthValue(rowIndex, startValue, deepValue = startValue) {
  const ambient = DEFAULT_PRESET.ambientGrid;
  const rowUnit = rowIndex / Math.max(1, rows - 1);
  const depth = clamp((rowUnit - ambient.lowerSingletonStart) / (1 - ambient.lowerSingletonStart), 0, 1);
  return startValue * (1 - depth) + deepValue * depth;
}

function shouldCullLowerSingleton(seed, rowIndex, keepChance, deepKeepChance = keepChance) {
  if (!isLowerSingletonRow(rowIndex)) {
    return false;
  }

  return hashUnit(seed ^ Math.imul(rowIndex + 11, 668265263)) > lowerDepthValue(rowIndex, keepChance, deepKeepChance);
}

function lowerSingletonNeighborRow(seed, rowIndex) {
  if (rowIndex >= rows - 1) {
    return rowIndex - 1;
  }
  if (rowIndex <= 0) {
    return rowIndex + 1;
  }

  return hashUnit(seed ^ 0xb93d) < 0.74 ? rowIndex - 1 : rowIndex + 1;
}

function singletonKeepChance(rowIndex) {
  const ambient = DEFAULT_PRESET.ambientGrid;
  if (!isLowerSingletonRow(rowIndex)) {
    return ambient.singletonKeepChance;
  }

  return lowerDepthValue(rowIndex, ambient.lowerSingletonKeepChance, ambient.deepLowerSingletonKeepChance);
}

function singletonColumnizeChance(rowIndex) {
  const ambient = DEFAULT_PRESET.ambientGrid;
  if (!isLowerSingletonRow(rowIndex)) {
    return ambient.singletonColumnizeChance;
  }

  return lowerDepthValue(rowIndex, ambient.lowerSingletonColumnizeChance, ambient.deepLowerSingletonColumnizeChance);
}

function bridgeGapChance(rowIndex) {
  const ambient = DEFAULT_PRESET.ambientGrid;
  if (!isLowerSingletonRow(rowIndex)) {
    return ambient.bridgeSingleGapChance;
  }

  return lowerDepthValue(rowIndex, ambient.bridgeSingleGapChance, ambient.bridgeLowerGapChance);
}

function maybeColumnizeSingleton(column, rowIndex, seed, options = {}) {
  const chance = Object.prototype.hasOwnProperty.call(options, "chance")
    ? options.chance
    : singletonColumnizeChance(rowIndex);
  if (hashUnit(seed ^ 0x3bd1) > chance) {
    return false;
  }

  const ambient = DEFAULT_PRESET.ambientGrid;
  const neighborRow = lowerSingletonNeighborRow(seed, rowIndex);
  if (neighborRow < 0 || neighborRow >= rows || column.cells[neighborRow]) {
    return false;
  }

  return Boolean(placeAmbientCell(column, neighborRow, hashInt(seed ^ Math.imul(neighborRow + 1, 0xa531)), {
    bright: Object.prototype.hasOwnProperty.call(options, "bright")
      ? options.bright
      : hashUnit(seed ^ 0x77ac) < referenceBrightChance(neighborRow, ambient.brightChance),
    lifeMin: options.lifeMin || ambient.smallColumnLifeMinTicks,
    lifeMax: options.lifeMax || ambient.smallColumnLifeMaxTicks
  }));
}

function maybeColumnizeLowerSingleton(column, rowIndex, seed, options = {}) {
  if (!isLowerSingletonRow(rowIndex)) {
    return false;
  }

  return maybeColumnizeSingleton(column, rowIndex, seed, options);
}

function ambientRotatorForCell(column, rowIndex, seed, options = {}) {
  if (Object.prototype.hasOwnProperty.call(options, "rotator")) {
    return options.rotator;
  }

  const ambient = DEFAULT_PRESET.ambientGrid;
  const laneEvery = Math.max(1, ambient.rotatorLaneEveryRows || 1);
  const lanePhase = Math.floor(hashUnit(column.seed ^ 0x4d3f) * laneEvery);
  const laneRotator =
    (rowIndex + lanePhase) % laneEvery === 0 &&
    hashUnit(seed ^ 0x70bb) < ambient.rotatorLaneChance;
  const randomRotator = hashUnit(seed ^ 0x4f3a) < ambient.rotatorChance;
  return laneRotator || randomRotator;
}

function streamRotatorForCell(column, stream, rowIndex) {
  if (stream.negative) {
    return false;
  }

  const laneEvery = Math.max(1, DEFAULT_PRESET.streamRotatorLaneEveryRows || 1);
  const lanePhase = Math.floor(hashUnit(stream.seed ^ column.seed ^ 0x2b77) * laneEvery);
  const laneRotator =
    (rowIndex + lanePhase) % laneEvery === 0 &&
    hashUnit(stream.seed ^ Math.imul(rowIndex + 131, 1103515245)) < DEFAULT_PRESET.streamRotatorLaneChance;
  const randomRotator = hashUnit(stream.seed ^ Math.imul(rowIndex + 41, 2654435761)) < stream.rotatorRate;
  return laneRotator || randomRotator;
}

function bridgeSingleCellGaps(column) {
  const ambient = DEFAULT_PRESET.ambientGrid;

  for (let rowIndex = 1; rowIndex < rows - 1; rowIndex += 1) {
    if (column.cells[rowIndex]) {
      continue;
    }

    if (!cellVisibleEnough(column.cells[rowIndex - 1], rowIndex - 1) || !cellVisibleEnough(column.cells[rowIndex + 1], rowIndex + 1)) {
      continue;
    }

    const seed = hashInt(column.seed ^ Math.imul(rowIndex + 83, 374761393) ^ Math.imul(logicalTick + 1, 668265263));
    if (hashUnit(seed ^ 0x3bd7) > bridgeGapChance(rowIndex)) {
      continue;
    }

    placeAmbientCell(column, rowIndex, seed, {
      bright: hashUnit(seed ^ 0x77ac) < referenceBrightChance(rowIndex, ambient.brightChance),
      lifeMin: ambient.lifeMinTicks,
      lifeMax: ambient.lifeMaxTicks
    });
  }
}

function shapeColumnSingletons(column) {
  const ambient = DEFAULT_PRESET.ambientGrid;

  for (let pass = 0; pass < 2; pass += 1) {
    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      const cell = column.cells[rowIndex];
      if (!cell || cell.negative || cell.transient || cell.head || !cellVisibleEnough(cell, rowIndex) || hasVisibleVerticalCell(column, rowIndex)) {
        continue;
      }

      const seed = hashInt((cell.salt || column.seed) ^ Math.imul(rowIndex + 37 + pass * 113, 1597334677));
      const roll = hashUnit(seed ^ 0x51a3);
      if (roll < singletonKeepChance(rowIndex)) {
        continue;
      }

      if (maybeColumnizeSingleton(column, rowIndex, seed, {
        bright: cell.head || cell.glowHead,
        lifeMin: Math.max(ambient.smallColumnLifeMinTicks, cell.life - cell.age),
        lifeMax: Math.max(ambient.smallColumnLifeMaxTicks, cell.life - cell.age + 1)
      })) {
        continue;
      }

      column.cells[rowIndex] = null;
    }
  }

  bridgeSingleCellGaps(column);
}

function ambientAlpha(seed, column, rowIndex, bright) {
  const ambient = DEFAULT_PRESET.ambientGrid;
  const min = bright ? ambient.brightAlphaMin : ambient.bodyAlphaMin;
  const max = bright ? ambient.brightAlphaMax : ambient.bodyAlphaMax;
  return seededRange(seed ^ 0x5a1fc9, min, max) * column.intensity * referenceBrightnessFactor(rowIndex);
}

function createAmbientCell(column, rowIndex, seed, options = {}) {
  const ambient = DEFAULT_PRESET.ambientGrid;
  const transient = Boolean(options.transient);
  const bright = Object.prototype.hasOwnProperty.call(options, "bright")
    ? options.bright
    : hashUnit(seed ^ 0x296d) < referenceBrightChance(rowIndex, ambient.brightChance);
  const lifeMin = options.lifeMin || ambient.lifeMinTicks;
  const lifeMax = options.lifeMax || ambient.lifeMaxTicks;
  const charSalt = hashInt(seed ^ Math.imul(rowIndex + 1, 0x85ebca6b));
  const char = chooseStableChar(column.seed, column.index, rowIndex, charSalt);
  const baseAlpha = ambientAlpha(seed, column, rowIndex, bright);
  const rotator = ambientRotatorForCell(column, rowIndex, seed, options);

  return {
    char,
    stableChar: char,
    salt: charSalt,
    age: options.age || 0,
    life: Math.floor(seededRange(seed ^ 0x44f1, lifeMin, lifeMax)),
    alpha: baseAlpha,
    target: baseAlpha,
    baseAlpha,
    paletteName: column.paletteName,
    rotator,
    head: false,
    headPreviousGlowHead: false,
    headStreamId: null,
    nextRotateTick: rotator
      ? logicalTick + rotateDelay(charSalt, rowIndex, DEFAULT_PRESET.rotatingCells)
      : Number.POSITIVE_INFINITY,
    streamId: `ambient:${column.index}:${rowIndex}:${seed}`,
    negative: false,
    glowHead: bright,
    transient,
    staticCell: !transient,
    justWritten: true
  };
}

function placeAmbientCell(column, rowIndex, seed, options = {}) {
  if (rowIndex < 0 || rowIndex >= rows) {
    return null;
  }

  const current = column.cells[rowIndex];
  if (current && current.target > 0.08) {
    return null;
  }

  const cell = createAmbientCell(column, rowIndex, seed, options);
  column.cells[rowIndex] = cell;
  return cell;
}

function seedAmbientColumn(column) {
  let continuingRun = false;

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const seed = hashInt(column.seed ^ Math.imul(rowIndex + 17, 1597334677));
    const chance = continuingRun
      ? ambientContinueChance(column, rowIndex)
      : ambientStartChance(column, rowIndex);

    if (hashUnit(seed) < chance) {
      const cell = createAmbientCell(column, rowIndex, seed, {
        age: Math.floor(hashUnit(seed ^ 0x31df) * DEFAULT_PRESET.ambientGrid.lifeMinTicks)
      });
      column.cells[rowIndex] = cell;
      continuingRun = true;
    } else {
      continuingRun = false;
    }
  }

  shapeColumnSingletons(column);
}

function updateAmbientCell(column, rowIndex, cell) {
  const ambient = DEFAULT_PRESET.ambientGrid;
  cell.age += 1;
  cell.justWritten = false;

  if (cell.age >= cell.life) {
    if (!cell.demotedBeforeClear && cell.glowHead) {
      const dimSeed = hashInt(cell.salt ^ Math.imul(logicalTick + rowIndex + 3, 1597334677));
      cell.demotedBeforeClear = true;
      cell.glowHead = false;
      cell.baseAlpha = ambientAlpha(dimSeed, column, rowIndex, false);
      cell.target = cell.baseAlpha;
      cell.alpha = cell.baseAlpha;
      cell.life = cell.age + Math.floor(seededRange(dimSeed ^ 0x38d1, 80, 180));
      return;
    }

    column.cells[rowIndex] = null;
    return;
  }

  const tickSeed = hashInt(cell.salt ^ Math.imul(logicalTick + rowIndex + 1, 2246822519));
  if (cell.glowHead && cell.age > 6 && demoteUnsupportedBrightCell(column, rowIndex, cell, tickSeed, 42)) {
    return;
  }

  const scheduledRotate = cell.rotator && logicalTick >= cell.nextRotateTick;
  const randomRefresh = hashUnit(tickSeed ^ 0x31b9) < ambient.charRefreshChance;
  if (scheduledRotate || randomRefresh) {
    cell.salt = hashInt(cell.salt ^ tickSeed ^ logicalTick);
    cell.char = chooseStableChar(column.seed, column.index, rowIndex, cell.salt);
    cell.nextRotateTick = cell.rotator
      ? logicalTick + rotateDelay(cell.salt, rowIndex, DEFAULT_PRESET.rotatingCells)
      : Number.POSITIVE_INFINITY;
  }

  if (hashUnit(tickSeed ^ 0x81e3) < ambient.brightFlipChance) {
    cell.glowHead = hashUnit(tickSeed ^ 0xc2d1) < referenceBrightChance(rowIndex, ambient.brightChance);
    cell.baseAlpha = ambientAlpha(tickSeed, column, rowIndex, cell.glowHead);
  }

  cell.target = cell.baseAlpha;
  cell.alpha = cell.baseAlpha;
}

function maybeReplenishAmbientCell(column, rowIndex) {
  if (column.cells[rowIndex]) {
    return;
  }

  const ambient = DEFAULT_PRESET.ambientGrid;
  const seed = hashInt(column.seed ^ Math.imul(logicalTick + 1, 374761393) ^ Math.imul(rowIndex + 4099, 668265263));
  const chance = ambientCellChance(column, rowIndex) * ambient.replenishRate;
  if (hashUnit(seed) < chance) {
    if (!hasVisibleVerticalCell(column, rowIndex) && shouldCullLowerSingleton(seed, rowIndex, ambient.lowerReplenishSingletonKeepChance, ambient.deepLowerReplenishSingletonKeepChance)) {
      const placed = placeAmbientCell(column, rowIndex, seed);
      if (placed && !maybeColumnizeLowerSingleton(column, rowIndex, seed, {
        bright: placed.glowHead,
        lifeMin: ambient.smallColumnLifeMinTicks,
        lifeMax: ambient.smallColumnLifeMaxTicks
      })) {
        column.cells[rowIndex] = null;
      }
      return;
    }

    placeAmbientCell(column, rowIndex, seed);
  }
}

function createCell(column, stream, rowIndex, age = 0, forceVisible = false) {
  const visible = forceVisible || hashUnit(stream.seed ^ Math.imul(rowIndex + 8191, 1103515245)) <= referenceGlyphDensity(rowIndex, stream.density);

  if (!visible) {
    return null;
  }

  const stableChar = chooseStableChar(column.seed, column.index, rowIndex, stream.patternSalt);
  const rotator = streamRotatorForCell(column, stream, rowIndex);
  const alphaUnit = hashUnit(stream.patternSalt ^ Math.imul(rowIndex + 37, 2246822519));
  const alphaPreset = stream.negative ? DEFAULT_PRESET.negativeAlpha : DEFAULT_PRESET.positiveAlpha;
  const alphaBase = Number.isFinite(stream.alphaBase)
    ? stream.alphaBase
    : alphaPreset.base + alphaUnit * alphaPreset.variance;
  const glowHead = !stream.negative && hashUnit(stream.seed ^ Math.imul(rowIndex + 17, 1597334677)) < referenceBrightChance(rowIndex, stream.headChance);

  return {
    char: stableChar,
    stableChar,
    salt: stream.patternSalt,
    age,
    life: stream.cellLifeTicks || Math.max(stream.length + 1, Math.round(stream.length * DEFAULT_PRESET.cellLifetimeScale)),
    alpha: 0,
    target: 0,
    baseAlpha: alphaBase * column.intensity * stream.toneMultiplier * referenceBrightnessFactor(rowIndex),
    paletteName: stream.paletteName,
    rotator,
    head: false,
    headPreviousGlowHead: false,
    nextRotateTick: logicalTick + rotateDelay(stream.seed, rowIndex),
    streamId: stream.id,
    negative: stream.negative,
    glowHead,
    transient: Boolean(stream.transient),
    justWritten: age <= 1
  };
}

function writeCell(column, stream, rowIndex, age = 0, options = {}) {
  if (rowIndex < 0 || rowIndex >= rows) {
    return null;
  }

  if (stream.negative) {
    column.cells[rowIndex] = null;
    return null;
  }

  const next = createCell(column, stream, rowIndex, age, options.forceVisible);
  if (!next) {
    if (options.coverExisting !== false) {
      column.cells[rowIndex] = null;
    }
    return null;
  }

  next.target = next.baseAlpha;
  next.alpha = next.target;
  next.head = Boolean(options.head);
  next.headPreviousGlowHead = next.glowHead;
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
    cell.glowHead = Boolean(cell.headPreviousGlowHead);
    cell.headPreviousGlowHead = false;
  }

  stream.headCellRow = null;
}

function createLowerFragmentStream(column, seed, startRow, length) {
  const fragments = DEFAULT_PRESET.lowerFragments;
  const ordinal = column.nextStreamOrdinal;
  column.nextStreamOrdinal += 1;
  const endRow = Math.min(rows - 1, startRow + length - 1);

  return {
    id: `lower:${column.index}:${ordinal}:${seed}`,
    seed,
    negative: false,
    mode: "lowerFragment",
    long: false,
    headRow: startRow - 1,
    headCellRow: null,
    progress: 0,
    patternSalt: seed,
    length,
    density: 1,
    rotatorRate: fragments.rotatingChance,
    headChance: fragments.brightCellChance,
    brightHead: hashUnit(seed ^ 0xd82f) < fragments.brightHeadChance,
    cooldownTicks: 0,
    paletteName: column.paletteName,
    toneMultiplier: 1,
    speed: seededRange(seed ^ 0x53fa, fragments.minSpeedRowsPerSecond, fragments.maxSpeedRowsPerSecond),
    endRow,
    finished: false,
    transient: true,
    cellLifeTicks: Math.floor(seededRange(seed ^ 0x44f1, fragments.minLifeTicks, fragments.maxLifeTicks)),
    alphaBase: seededRange(seed ^ 0x9e3d, fragments.minAlpha, fragments.maxAlpha)
  };
}

function resetStream(stream, column, initial = false) {
  const cycleSeed = hashInt(stream.seed ^ Math.imul(logicalTick + 1, 2246822519));
  demoteStreamHead(column, stream);
  stream.finished = false;
  stream.cooldownTicks = 0;
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
  stream.brightHead = !stream.negative && hashUnit(cycleSeed ^ 0x57ac) < glow.fallingHeadChance;
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

  if (initial && DEFAULT_PRESET.startup.seedInitialBodies) {
    for (let offset = 0; offset < stream.length; offset += 1) {
      const written = writeCell(column, stream, stream.headRow - offset, offset, {
        forceVisible: offset === 0,
        head: offset === 0 && stream.brightHead
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
    brightHead: false,
    cooldownTicks: 0,
    paletteName: "normal",
    toneMultiplier: 1,
    speed: 0,
    endRow: rows,
    finished: false,
    transient: false,
    cellLifeTicks: null,
    alphaBase: null
  };
  resetStream(stream, column, initial);
  return stream;
}

function makeColumn(index, seed) {
  const streamCount = desiredStreamCount(seed);
  const active = hashUnit(seed ^ 0x4d23a) < DEFAULT_PRESET.columnActivity.initialActiveChance;
  const activitySeed = hashInt(seed ^ 0x359ac);
  const column = {
    index,
    seed,
    x: (index + 0.5) * cellWidth,
    palette: null,
    paletteName: "normal",
    intensity: 1,
    streamTarget: streamCount,
    nextStreamOrdinal: 0,
    active: false,
    activitySeed,
    nextActivityTick: 0,
    cells: new Array(rows),
    streams: []
  };

  applyColumnTone(column, seed, false);
  seedAmbientColumn(column);
  setColumnActivity(column, active, activitySeed, true);
  return column;
}

function desiredStreamCount(seed) {
  const densityBias = clamp((settings.density - 30) / 65, 0, 1);
  const streamRoll = hashUnit(seed ^ 0x55ca12);
  return streamRoll < 0.1 + densityBias * 0.04
    ? 3
    : streamRoll < 0.44 + densityBias * 0.08
      ? 2
      : 1;
}

function streamRestartDelay(stream, column) {
  const restart = DEFAULT_PRESET.streamRestart;
  const seed = hashInt(stream.seed ^ column.activitySeed ^ Math.imul(logicalTick + 1, 374761393));
  return Math.floor(seededRange(seed, restart.minTicks, restart.maxTicks));
}

function pauseStream(stream, column) {
  demoteStreamHead(column, stream);
  stream.progress = 0;
  stream.cooldownTicks = streamRestartDelay(stream, column);
  stream.headCellRow = null;
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
    if (!initial) {
      applyColumnTone(column, seed, true);
    }
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

  if (cell.staticCell) {
    updateAmbientCell(column, rowIndex, cell);
    return;
  }

  cell.age += 1;
  cell.justWritten = false;

  if (cell.age >= cell.life) {
    if (!cell.transient && !cell.demotedBeforeClear && (cell.head || cell.glowHead)) {
      const dimSeed = hashInt(cell.salt ^ Math.imul(logicalTick + rowIndex + 5, 668265263));
      cell.demotedBeforeClear = true;
      cell.head = false;
      cell.headStreamId = null;
      cell.headPreviousGlowHead = false;
      cell.glowHead = false;
      cell.baseAlpha = seededRange(dimSeed ^ 0x4a91, 0.34, 0.62) * column.intensity * referenceBrightnessFactor(rowIndex);
      cell.target = cell.baseAlpha;
      cell.alpha = cell.baseAlpha;
      cell.life = cell.age + Math.floor(seededRange(dimSeed ^ 0x2c5f, 70, 160));
      return;
    }

    column.cells[rowIndex] = null;
    return;
  }

  if ((cell.head || cell.glowHead) && cell.age > 4) {
    const dimSeed = hashInt(cell.salt ^ Math.imul(logicalTick + rowIndex + 5, 668265263));
    if (demoteUnsupportedBrightCell(column, rowIndex, cell, dimSeed, 30)) {
      return;
    }
  }

  if (cell.rotator && logicalTick >= cell.nextRotateTick) {
    cell.salt = hashInt(cell.salt + logicalTick + rowIndex);
    cell.char = chooseStableChar(column.seed, column.index, rowIndex, cell.salt);
    cell.nextRotateTick = logicalTick + rotateDelay(cell.salt, rowIndex);
  }

  cell.target = cell.baseAlpha;
  cell.alpha = cell.baseAlpha;
}

function releaseAmbientSingles() {
  const ambient = DEFAULT_PRESET.ambientGrid;
  if (hashUnit(Math.imul(logicalTick + 31, 2246822519)) > ambient.singleBirthChancePerTick) {
    return;
  }

  for (let i = 0; i < ambient.singleBirthsPerTick; i += 1) {
    const baseSeed = hashInt(PATTERN_SEED ^ Math.imul(logicalTick + 1, 1597334677) ^ Math.imul(i + 17, 374761393));
    for (let attempt = 0; attempt < ambient.singleBirthAttempts; attempt += 1) {
      const seed = hashInt(baseSeed ^ Math.imul(attempt + 1, 668265263));
      const column = activeColumns[Math.floor(hashUnit(seed ^ 0x6d2b) * activeColumns.length)];
      if (!column) {
        continue;
      }

      const row = Math.floor(hashUnit(seed ^ 0x9301) * rows);
      if (shouldCullLowerSingleton(seed, row, ambient.lowerSingleBirthKeepChance, ambient.deepLowerSingleBirthKeepChance)) {
        continue;
      }

      if (column.cells[row] || hasAdjacentCell(column, row)) {
        continue;
      }

      placeAmbientCell(column, row, seed, {
        bright: hashUnit(seed ^ 0xc31a) < referenceBrightChance(row, ambient.singleBrightChance),
        lifeMin: ambient.singleLifeMinTicks,
        lifeMax: ambient.singleLifeMaxTicks,
        transient: true
      });
      break;
    }
  }
}

function releaseAmbientSmallColumns() {
  const ambient = DEFAULT_PRESET.ambientGrid;
  if (hashUnit(Math.imul(logicalTick + 79, 1103515245)) > ambient.smallColumnChancePerTick) {
    return;
  }

  const baseSeed = hashInt(PATTERN_SEED ^ Math.imul(logicalTick + 5, 2246822519));
  for (let attempt = 0; attempt < ambient.smallColumnAttempts; attempt += 1) {
    const seed = hashInt(baseSeed ^ Math.imul(attempt + 1, 1597334677));
    const column = activeColumns[Math.floor(hashUnit(seed ^ 0x31bf) * activeColumns.length)];
    if (!column) {
      continue;
    }

    const length = Math.floor(seededRange(seed ^ 0xa73d, ambient.smallColumnMinRows, ambient.smallColumnMaxRows + 1));
    const startRow = Math.min(rows - length, Math.floor(hashUnit(seed ^ 0x5bc7) * rows));
    if (isLowerSingletonRow(startRow) && hashUnit(seed ^ 0x7c91) > ambient.lowerSmallColumnKeepChance) {
      continue;
    }

    let writable = true;
    for (let offset = 0; offset < length; offset += 1) {
      if (column.cells[startRow + offset]) {
        writable = false;
        break;
      }
    }
    if (!writable) {
      continue;
    }

    const brightHead = hashUnit(seed ^ 0x77ac) < referenceBrightChance(startRow, ambient.singleBrightChance);
    for (let offset = 0; offset < length; offset += 1) {
      const rowIndex = startRow + offset;
      placeAmbientCell(column, rowIndex, hashInt(seed ^ Math.imul(offset + 1, 0xa531)), {
        bright: offset === 0 ? brightHead : hashUnit(seed ^ Math.imul(offset + 3, 0x9e37)) < referenceBrightChance(rowIndex, ambient.brightChance),
        lifeMin: ambient.smallColumnLifeMinTicks,
        lifeMax: ambient.smallColumnLifeMaxTicks,
        transient: true
      });
    }
    break;
  }
}

function stepStream(column, stream) {
  demoteStreamHead(column, stream);
  stream.headRow += 1;

  if (stream.headRow > stream.endRow) {
    if (stream.mode === "lowerFragment") {
      stream.finished = true;
      return;
    }

    if (column.active) {
      pauseStream(stream, column);
    } else {
      stream.finished = true;
    }
    return;
  }

  const written = writeCell(column, stream, stream.headRow, 0, {
    forceVisible: !stream.negative && (stream.brightHead || stream.mode === "lowerFragment"),
    head: stream.brightHead
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
    const baseAlpha = seededRange(seed ^ 0x9e3d, rotators.minAlpha, rotators.maxAlpha) * column.intensity * referenceBrightnessFactor(startRow);
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
        head: false,
        headPreviousGlowHead: false,
        headStreamId: null,
        transient: true,
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

    if (column.streams.some((stream) => stream.mode === "lowerFragment" && !stream.finished)) {
      continue;
    }

    column.streams.push(createLowerFragmentStream(column, seed, startRow, length));
  }
}

function logicStep() {
  logicalTick += 1;

  for (const column of activeColumns) {
    updateColumnActivity(column);

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      updateCell(column, rowIndex);
      maybeReplenishAmbientCell(column, rowIndex);
    }

    for (let i = column.streams.length - 1; i >= 0; i -= 1) {
      const stream = column.streams[i];
      if (stream.cooldownTicks > 0) {
        stream.cooldownTicks -= 1;
        if (stream.cooldownTicks <= 0 && column.active) {
          resetStream(stream, column);
        }
        continue;
      }

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
  releaseAmbientSingles();
  releaseAmbientSmallColumns();
  releaseStandaloneRotators();
  releaseLowerFragments();

  for (const column of activeColumns) {
    shapeColumnSingletons(column);
  }
}

function paintGlyph(context, char, styleName, palette, x, y) {
  const color = palette[styleName] || palette.body;

  context.shadowBlur = 0;
  context.shadowColor = "transparent";
  context.globalAlpha = 1;

  if (settings.glow) {
    if (styleName === "head") {
      context.shadowColor = palette.glow;
      context.shadowBlur = fontSize * 0.18;
    } else if (styleName === "bright") {
      context.shadowColor = palette.glow;
      context.shadowBlur = fontSize * 0.06;
    } else if (styleName === "body") {
      context.shadowColor = palette.glow;
      context.shadowBlur = fontSize * 0.012;
    }
  }

  context.fillStyle = color;
  fillFittedText(context, char, x, y);
  context.shadowBlur = 0;
  context.shadowColor = "transparent";
}

function glyphAtlasKey(styleName, palette) {
  return `${cellWidth}:${cellHeight}:${fontSize}:${glyphScaleX}:${glyphScaleY}:${dpr}:${styleName}:${settings.glow}:${GLYPH_EDGE_ALPHA}:${palette.name}:${palette.dim}:${palette.body}:${palette.bright}:${palette.head}`;
}

function createGlyphAtlas(styleName, palette) {
  const key = glyphAtlasKey(styleName, palette);
  const cached = glyphCache.get(key);
  if (cached) {
    return cached;
  }

  const cssWidth = Math.max(1, Math.floor(cellWidth));
  const cssHeight = Math.max(1, Math.floor(cellHeight));
  const sourceWidth = Math.ceil(cssWidth * dpr);
  const sourceHeight = Math.ceil(cssHeight * dpr);
  const atlasColumns = Math.ceil(Math.sqrt(CHAR_LIST.length));
  const atlasRows = Math.ceil(CHAR_LIST.length / atlasColumns);
  const atlas = document.createElement("canvas");
  atlas.width = sourceWidth * atlasColumns;
  atlas.height = sourceHeight * atlasRows;
  atlas.cssWidth = cssWidth;
  atlas.cssHeight = cssHeight;
  atlas.sourceWidth = sourceWidth;
  atlas.sourceHeight = sourceHeight;
  atlas.columns = atlasColumns;

  const sctx = atlas.getContext("2d");
  sctx.imageSmoothingEnabled = false;
  sctx.scale(dpr, dpr);
  sctx.clearRect(0, 0, cssWidth * atlasColumns, cssHeight * atlasRows);
  sctx.font = `${fontSize}px ${FONT_FAMILY}`;
  sctx.textAlign = "center";
  sctx.textBaseline = "middle";

  const centerX = Math.round(cssWidth / 2);
  const centerY = Math.round(cssHeight / 2 + fontSize * 0.03);

  for (let index = 0; index < CHAR_LIST.length; index += 1) {
    const atlasX = (index % atlasColumns) * cssWidth;
    const atlasY = Math.floor(index / atlasColumns) * cssHeight;
    sctx.save();
    sctx.beginPath();
    sctx.rect(atlasX, atlasY, cssWidth, cssHeight);
    sctx.clip();
    paintGlyph(sctx, CHAR_LIST[index], styleName, palette, atlasX + centerX, atlasY + centerY);
    sctx.restore();
  }

  softenGlyphEdges(atlas);
  glyphCache.set(key, atlas);
  return atlas;
}

function prebuildGlyphAtlases() {
  if (palettes.length === 0 || cellWidth <= 0 || cellHeight <= 0 || fontSize <= 0) {
    return;
  }

  for (const palette of palettes) {
    for (const styleName of GLYPH_STYLES) {
      createGlyphAtlas(styleName, palette);
    }
  }
}

function createGlyph(char, styleName, palette) {
  const atlas = createGlyphAtlas(styleName, palette);
  const index = GLYPH_INDEX.has(char) ? GLYPH_INDEX.get(char) : 0;
  return {
    canvas: atlas,
    sx: (index % atlas.columns) * atlas.sourceWidth,
    sy: Math.floor(index / atlas.columns) * atlas.sourceHeight,
    sw: atlas.sourceWidth,
    sh: atlas.sourceHeight,
    cssWidth: atlas.cssWidth,
    cssHeight: atlas.cssHeight
  };
}

function drawGlyph(cell, column, rowIndex) {
  let styleName = "body";
  let alpha = cell.alpha;
  const glowIntensity = DEFAULT_PRESET.glowingTracers.intensity / 100;

  if (cell.head) {
    styleName = "head";
    alpha *= 1.38 + 0.12 * glowIntensity;
  } else if (cell.negative || alpha < 0.2) {
    styleName = "dim";
    alpha *= cell.negative ? 0.62 : 0.82;
  } else if (cell.glowHead) {
    styleName = "bright";
    alpha *= (cell.rotator ? 1.08 : 1.0) + 0.08 * glowIntensity;
  }

  if (alpha <= 0.012) {
    return;
  }

  const palette = paletteByName(cell.paletteName) || column.palette;
  const sprite = createGlyph(cell.char, styleName, palette);
  const x = column.x;
  const y = (rowIndex + 0.5) * cellHeight;
  let visibility = rowVisibility(rowIndex);
  if (!cell.negative && (cell.head || cell.glowHead)) {
    const rowUnit = rowIndex / Math.max(1, rows - 1);
    const upperFloor = cell.head ? 0.88 : 0.74;
    const lowerFloor = cell.head ? 0.64 : 0.5;
    const floorMix = clamp((0.68 - rowUnit) / 0.2, 0, 1);
    visibility = Math.max(visibility, lowerFloor * (1 - floorMix) + upperFloor * floorMix);
  }

  ctx.globalAlpha = clamp(alpha * visibility * clamp(settings.brightness / 72, 0.45, 1.32), 0, 1);
  ctx.drawImage(
    sprite.canvas,
    sprite.sx,
    sprite.sy,
    sprite.sw,
    sprite.sh,
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
  const targetRows = layout.visibleRows || Math.round(layout.referenceHeight / layout.rowPitchPx);
  const targetColumns = layout.visibleColumns || Math.round(layout.referenceWidth / layout.columnPitchPx);
  cellHeight = height / targetRows;
  cellWidth = width / targetColumns;
  rows = targetRows;
  const glyphAdjust = settings.glyphscale / 100;
  fontSize = fitFontSizeForPitch(
    clamp(Math.round((cellHeight - layout.rowGapPx - layout.fontInsetPx + layout.fontOversizePx) * glyphAdjust), 9, 72),
    Math.max(1, cellWidth - layout.columnGapPx)
  );
  const glyphBounds = measureMedianGlyphBounds(fontSize);
  glyphScaleY = clamp(((cellHeight - layout.rowGapPx - layout.fontInsetPx) * glyphAdjust) / glyphBounds.height, 0.72, 1.35);
  const fittedGlyphScaleX = ((cellWidth - layout.columnGapPx - layout.fontInsetPx) * glyphAdjust) / glyphBounds.width;
  const aspectGlyphScaleX = (glyphScaleY * (layout.glyphAspectRatio || 0.8) * glyphBounds.height) / glyphBounds.width;
  glyphScaleX = clamp(Math.min(fittedGlyphScaleX, aspectGlyphScaleX), 0.72, 1.35);
  gridColumns = targetColumns;

  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  glyphCache = new Map();
  prebuildGlyphAtlases();
  logicalTick = 0;
  releaseCounter = 0;
  tickAccumulator = 0;
  buildColumns();
  const prewarmSeconds = DEFAULT_PRESET.startup.prewarmSeconds || DEFAULT_PRESET.initialWarmupSeconds;
  for (let i = 0; i < Math.round(tickRate() * prewarmSeconds); i += 1) {
    logicStep();
  }
  render(performance.now());
}

function collectMatrixRainState() {
  const metrics = activeColumns.reduce((summary, column) => {
    let columnCells = 0;
    let columnHeads = 0;
    let columnBright = 0;
    let columnRotators = 0;

    for (const cell of column.cells) {
      if (!cell) {
        continue;
      }

      columnCells += 1;
      summary.visibleCells += 1;
      if (cell.head) {
        columnHeads += 1;
        summary.headCells += 1;
      }
      if (cell.glowHead || cell.head) {
        columnBright += 1;
        summary.brightCells += 1;
      }
      if (cell.rotator) {
        columnRotators += 1;
        summary.rotatingCells += 1;
      }
    }

    if (columnCells > 0) {
      summary.visibleColumns += 1;
      summary.maxColumnLength = Math.max(summary.maxColumnLength, columnCells);
      summary.columnLengthSum += columnCells;
    }
    if (columnHeads > 0) {
      summary.columnsWithHeads += 1;
    }
    if (columnBright > 0) {
      summary.columnsWithBright += 1;
    }
    if (columnRotators > 0) {
      summary.columnsWithRotators += 1;
    }

    return summary;
  }, {
    visibleCells: 0,
    brightCells: 0,
    headCells: 0,
    rotatingCells: 0,
    visibleColumns: 0,
    columnsWithHeads: 0,
    columnsWithBright: 0,
    columnsWithRotators: 0,
    columnLengthSum: 0,
    maxColumnLength: 0
  });

  metrics.averageColumnLength = metrics.visibleColumns > 0
    ? metrics.columnLengthSum / metrics.visibleColumns
    : 0;
  metrics.brightCellRatio = metrics.visibleCells > 0
    ? metrics.brightCells / metrics.visibleCells
    : 0;
  metrics.headCellRatio = metrics.visibleCells > 0
    ? metrics.headCells / metrics.visibleCells
    : 0;
  metrics.rotatingCellRatio = metrics.visibleCells > 0
    ? metrics.rotatingCells / metrics.visibleCells
    : 0;

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
    startup: DEFAULT_PRESET.startup,
    metrics,
    columns: activeColumns.map((column) => ({
      index: column.index,
      active: column.active,
      paletteName: column.paletteName,
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
  prebuildGlyphAtlases();

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
