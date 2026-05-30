"use strict";

const canvas = document.getElementById("matrix-rain");
const ctx = canvas.getContext("2d", { alpha: false });

window.__matrixRuntimeErrors = [];
window.addEventListener("error", (event) => {
  window.__matrixRuntimeErrors.push({
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno
  });
});
window.addEventListener("unhandledrejection", (event) => {
  window.__matrixRuntimeErrors.push({
    message: event.reason && event.reason.message ? event.reason.message : String(event.reason),
    source: "promise"
  });
});

const FONT_STYLES = new Set(["trilogy", "resurrections"]);
const FONT_FAMILIES = {
  trilogy: "\"Matrix Code\", monospace",
  resurrections: "\"Matrix Resurrected\", \"Matrix Code\", monospace"
};
const DPR_LIMIT = 2;
const BASE_COLOR = { r: 54, g: 217, b: 105 };
const GLYPH_EDGE_ALPHA = 0.72;
const PATTERN_SEED = 0x4d415452;
const URL_PARAMS = new URLSearchParams(window.location.search);
const DEBUG_STATE_ENABLED = URL_PARAMS.has("debugstate");
const CONTROLS_ENABLED = parseBooleanParam(URL_PARAMS.get("controls")) ?? URL_PARAMS.has("controls");
const WALLPAPER_AUDIO_API_AVAILABLE = typeof window.wallpaperRegisterAudioListener === "function";
const LAYOUT_OVERRIDE = normalizeLayoutMode(URL_PARAMS.get("layout"));
const CLOCK_OVERRIDE = parseBooleanParam(URL_PARAMS.get("clock"));
const AUDIO_COLOR_MODES = new Set(["level_layers", "frequency_gradient", "neon_blocks", "matrix_tint", "caps_only"]);
const AUDIO_HUE_STEPS = 144;
const AUDIO_SPECTRUM_BINS = 64;
const AUDIO_LISTENER_RECOVERY_DELAYS_MS = [0, 250, 1250, 3500];
const AUDIO_LISTENER_RECOVERY_COOLDOWN_MS = 3000;
const AUDIO_LISTENER_STALE_CALLBACK_MS = 4500;
const AUDIO_SPECTRUM_HUES = {
  level_layers: [286, 270, 254, 238, 222, 206, 190, 318, 334, 350, 6, 22, 38, 54],
  frequency_gradient: [222, 204, 188, 46, 28, 0, 316, 276],
  neon_blocks: [330, 286, 222, 190, 24, 0],
  matrix_tint: [52, 188, 222]
};
const FONT_STYLE_OVERRIDE = normalizeFontStyle(URL_PARAMS.get("fontstyle"));
const DENSITY_OVERRIDE = parseNumberParam(URL_PARAMS.get("density"));
const SPEED_OVERRIDE = parseNumberParam(URL_PARAMS.get("speed"));
const BRIGHTNESS_OVERRIDE = parseNumberParam(URL_PARAMS.get("brightness"));
const GLYPH_SCALE_OVERRIDE = parseNumberParam(URL_PARAMS.get("glyphscale"));
const CHARACTER_SPACING_OVERRIDE = parseNumberParam(URL_PARAMS.get("characterspacing"));
const GLOW_OVERRIDE = parseBooleanParam(URL_PARAMS.get("glow"));
const AUDIO_OVERRIDE = parseBooleanParam(URL_PARAMS.get("audio"));
const AUDIO_COLOR_MODE_OVERRIDE = normalizeAudioColorMode(URL_PARAMS.get("audiocolormode"));
const CLOCK_BRIGHTNESS_OVERRIDE = parseNumberParam(URL_PARAMS.get("clockbrightness"));
const CLOCK_COLOR_OVERRIDE = parseQueryColor(URL_PARAMS.get("clockcolor"));
const AUDIO_RESPONSE_OVERRIDE = parseNumberParam(URL_PARAMS.get("audioresponse"));
const AUDIO_INTENSITY_OVERRIDE = parseNumberParam(URL_PARAMS.get("audiointensity"));
const AUDIO_BRIGHTNESS_OVERRIDE = parseNumberParam(URL_PARAMS.get("audiobrightness"));
const AUDIO_SENSITIVITY_OVERRIDE = parseNumberParam(URL_PARAMS.get("audiosensitivity"));
const AUDIO_SPECTRUM_REVERSE_OVERRIDE = parseBooleanParam(URL_PARAMS.get("audiospectrumreverse"));
const AUDIO_DEBUG_OVERRIDE = URL_PARAMS.has("audiodebug")
  ? (parseBooleanParam(URL_PARAMS.get("audiodebug")) ?? true)
  : null;
const AUDIO_DEBUG_LEVEL_OVERRIDE = parseNumberParam(URL_PARAMS.get("audiodebuglevel"));
const COLOR_OVERRIDE = parseQueryColor(URL_PARAMS.get("color"));
const LANGUAGE_OVERRIDE = normalizeUiLanguage(URL_PARAMS.get("lang"));
const CONTROL_LANGUAGE = LANGUAGE_OVERRIDE || normalizeUiLanguage(navigator.language) || "en-us";
const TRILOGY_CHAR_POOL = `"*+012345789:<>z|¦©╌▪アウエオカキケコサシスセソタツテナニヌネハヒホマミムメモヤヨラリワー꞊\uE937`;
const RESURRECTIONS_CHAR_POOL = Array.from(
  { length: 0xe989 - 0xe900 + 1 },
  (_, index) => String.fromCharCode(0xe900 + index)
).join("");
const FONT_CHAR_POOLS = {
  trilogy: TRILOGY_CHAR_POOL,
  resurrections: RESURRECTIONS_CHAR_POOL
};
const CONTROL_TEXT = {
  "en-us": {
    title: "Matrix controls",
    hide: "Hide",
    show: "Show",
    base: "Base",
    clockGroup: "Clock",
    audioGroup: "Audio",
    rainFont: "Rain font",
    fontTrilogy: "Matrix Code trilogy",
    fontResurrections: "Matrix Resurrections",
    density: "Density",
    speed: "Speed",
    brightness: "Rain brightness",
    characterSize: "Character size",
    characterSpacing: "Character spacing",
    glow: "Glow",
    color: "Custom color",
    clock: "Clock",
    clockBrightness: "Clock brightness",
    clockColor: "Clock color",
    audioSpectrum: "Audio spectrum",
    audioResponse: "Audio response",
    audioBrightness: "Audio brightness",
    audioColor: "Audio color",
    audioSpectrumReverse: "Reverse spectrum",
    audioLevelLayers: "Aurora gradient",
    audioFrequencyGradient: "Frequency gradient",
    audioNeonBlocks: "Neon blocks",
    audioMatrixTint: "Cool tint",
    audioCapsOnly: "Peak caps only",
    advanced: "Advanced",
    audioDebug: "Audio debug",
    layout: "Layout",
    layoutAuto: "Auto",
    layoutDesktop: "Desktop",
    layoutTablet: "Tablet",
    layoutPhone: "Phone",
    copyLink: "Copy link",
    resetPreview: "Reset preview",
    linkCopied: "Link copied",
    hiddenStatus: "Hidden unless controls=1",
    audioState: "audio",
    on: "on",
    off: "off",
    level: "level",
    maxRows: "max rows",
    layoutLabel: "layout"
  },
  "zh-chs": {
    title: "Matrix 控制台",
    hide: "隐藏",
    show: "显示",
    base: "基础",
    clockGroup: "时钟",
    audioGroup: "音频",
    rainFont: "代码雨字体",
    fontTrilogy: "黑客帝国三部曲",
    fontResurrections: "黑客帝国复活",
    density: "密度",
    speed: "速度",
    brightness: "雨亮度",
    characterSize: "字符大小",
    characterSpacing: "字符间距",
    glow: "发光",
    color: "自定义颜色",
    clock: "时钟",
    clockBrightness: "时钟亮度",
    clockColor: "时钟颜色",
    audioSpectrum: "音频示波器",
    audioResponse: "音频响应",
    audioBrightness: "音频亮度",
    audioColor: "音频颜色",
    audioSpectrumReverse: "示波器反向",
    audioLevelLayers: "极光渐变",
    audioFrequencyGradient: "频率渐变",
    audioNeonBlocks: "霓虹色块",
    audioMatrixTint: "冷色微光",
    audioCapsOnly: "仅显示盖帽",
    advanced: "高级选项",
    audioDebug: "音频调试",
    layout: "布局",
    layoutAuto: "自动",
    layoutDesktop: "桌面",
    layoutTablet: "平板",
    layoutPhone: "手机",
    copyLink: "复制链接",
    resetPreview: "重置预览",
    linkCopied: "链接已复制",
    hiddenStatus: "仅在 controls=1 时显示",
    audioState: "音频",
    on: "开",
    off: "关",
    level: "音量",
    maxRows: "最大行数",
    layoutLabel: "布局"
  },
  "zh-cht": {
    title: "Matrix 控制台",
    hide: "隱藏",
    show: "顯示",
    base: "基礎",
    clockGroup: "時鐘",
    audioGroup: "音訊",
    rainFont: "代碼雨字體",
    fontTrilogy: "駭客任務三部曲",
    fontResurrections: "駭客任務復活",
    density: "密度",
    speed: "速度",
    brightness: "雨亮度",
    characterSize: "字元大小",
    characterSpacing: "字元間距",
    glow: "發光",
    color: "自訂顏色",
    clock: "時鐘",
    clockBrightness: "時鐘亮度",
    clockColor: "時鐘顏色",
    audioSpectrum: "音訊示波器",
    audioResponse: "音訊響應",
    audioBrightness: "音訊亮度",
    audioColor: "音訊顏色",
    audioSpectrumReverse: "示波器反向",
    audioLevelLayers: "極光漸變",
    audioFrequencyGradient: "頻率漸變",
    audioNeonBlocks: "霓虹色塊",
    audioMatrixTint: "冷色微光",
    audioCapsOnly: "僅顯示蓋帽",
    advanced: "進階選項",
    audioDebug: "音訊調試",
    layout: "版面",
    layoutAuto: "自動",
    layoutDesktop: "桌面",
    layoutTablet: "平板",
    layoutPhone: "手機",
    copyLink: "複製連結",
    resetPreview: "重置預覽",
    linkCopied: "連結已複製",
    hiddenStatus: "僅在 controls=1 時顯示",
    audioState: "音訊",
    on: "開",
    off: "關",
    level: "音量",
    maxRows: "最大列數",
    layoutLabel: "版面"
  }
};
let CHAR_POOL = TRILOGY_CHAR_POOL;
let CHAR_LIST = Array.from(CHAR_POOL);
let GLYPH_INDEX = new Map(CHAR_LIST.map((char, index) => [char, index]));
let GLYPH_MEASURE_POOL = CHAR_POOL;
const GLYPH_STYLES = ["dim", "body", "bright", "head"];
const DOT_CLOCK_GLYPHS = {
  "0": [
    "11111",
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "11111"
  ],
  "1": [
    "00100",
    "01100",
    "00100",
    "00100",
    "00100",
    "00100",
    "01110"
  ],
  "2": [
    "11110",
    "00001",
    "00001",
    "11110",
    "10000",
    "10000",
    "11111"
  ],
  "3": [
    "11110",
    "00001",
    "00001",
    "01110",
    "00001",
    "00001",
    "11110"
  ],
  "4": [
    "10001",
    "10001",
    "10001",
    "11111",
    "00001",
    "00001",
    "00001"
  ],
  "5": [
    "11111",
    "10000",
    "10000",
    "11110",
    "00001",
    "00001",
    "11110"
  ],
  "6": [
    "01111",
    "10000",
    "10000",
    "11110",
    "10001",
    "10001",
    "01110"
  ],
  "7": [
    "11111",
    "00001",
    "00010",
    "00100",
    "01000",
    "01000",
    "01000"
  ],
  "8": [
    "01110",
    "10001",
    "10001",
    "01110",
    "10001",
    "10001",
    "01110"
  ],
  "9": [
    "01110",
    "10001",
    "10001",
    "01111",
    "00001",
    "00001",
    "11110"
  ],
  ":": [
    "0",
    "1",
    "0",
    "0",
    "1",
    "0",
    "0"
  ]
};

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
    base: 1,
    variance: 0.025
  },
  negativeAlpha: {
    base: 0.58,
    variance: 0
  },
  characterSize: 100,
  maxConcurrentStreamsPerColumn: 2,
  startup: {
    prewarmSeconds: 20,
    seedInitialBodies: false,
    maxActiveColumnRatio: 0.24,
    activeDelayMinTicks: 260,
    activeDelayMaxTicks: 680,
    quietDelayMinTicks: 160,
    quietDelayMaxTicks: 620
  },
  initialWarmupSeconds: 20,
  bottomFade: {
    baseVisibility: 1,
    start: 0.24,
    power: 1,
    amount: 0.76,
    minVisibility: 0.24,
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
    glyphAspectRatio: 0.8,
    responsive: {
      phone: {
        portrait: {
          columnPitchPx: 11,
          rowPitchPx: 16,
          minColumns: 30,
          maxColumns: 56,
          minRows: 42,
          maxRows: 84,
          glyphScale: 0.9,
          fontOversizePx: 3,
          dprLimit: 1.5
        },
        landscape: {
          columnPitchPx: 12,
          rowPitchPx: 17,
          minColumns: 48,
          maxColumns: 92,
          minRows: 24,
          maxRows: 54,
          glyphScale: 0.88,
          fontOversizePx: 3,
          dprLimit: 1.5
        }
      },
      tablet: {
        portrait: {
          columnPitchPx: 14,
          rowPitchPx: 20,
          minColumns: 46,
          maxColumns: 84,
          minRows: 48,
          maxRows: 108,
          glyphScale: 0.92,
          fontOversizePx: 3,
          dprLimit: 1.75
        },
        landscape: {
          columnPitchPx: 15,
          rowPitchPx: 21,
          minColumns: 68,
          maxColumns: 122,
          minRows: 36,
          maxRows: 76,
          glyphScale: 0.92,
          fontOversizePx: 3,
          dprLimit: 1.75
        }
      }
    }
  },
  rotatingCells: {
    minRotateTicks: 3,
    maxRotateTicks: 8
  },
  topOrigin: {
    initialTopChance: 0.82,
    initialTopPortion: 0.27,
    reachesBottomChance: 0.2,
    endMinRows: 0.56,
    endMaxRows: 0.9,
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
    brightAlphaMin: 1.02,
    brightAlphaMax: 1.08,
    bodyAlphaMin: 0.98,
    bodyAlphaMax: 1.06,
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
    chancePerTick: 0.022,
    maxPerTick: 1,
    startMinRows: 0.45,
    startMaxRows: 0.78,
    startBiasPower: 1.55,
    minLengthRows: 2,
    maxLengthRows: 4,
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
  clock: {
    enabled: true,
    verticalCenter: 0.43,
    gapColumns: 1,
    visibilityFloor: 0.92,
    alphaFloor: 1.18,
    fallbackAlpha: 0.86,
    characterRotateMinTicks: 12,
    characterRotateMaxTicks: 34,
    displayAlphaFloor: 0.72,
    highlightAlphaFloor: 0.58
  },
  audioResponsive: {
    enabled: false,
    intensity: 100,
    sensitivity: 55,
    colorMode: "level_layers",
    minLevel: 0.035,
    attack: 0.48,
    release: 0.12,
    peakRelease: 0.06,
    silenceAfterMs: 520,
    bassWeight: 1.24,
    midWeight: 1,
    trebleWeight: 0.92,
    inputNoiseGate: 0.0012,
    inputAutoGainTargetPeak: 0.72,
    inputAutoGainMax: 48,
    spectrumBinAttack: 1,
    spectrumBinRelease: 0.32,
    spectrumCavaIntegralRise: 0.82,
    spectrumCavaIntegralFall: 0.32,
    spectrumCavaFallStep: 0.028,
    spectrumCavaGravity: 2.15,
    spectrumStartColumnRatio: 0,
    spectrumEndColumnRatio: 1,
    spectrumTopRows: 0,
    spectrumMaxRowsRatio: 0.38,
    spectrumMinBars: 24,
    spectrumMaxBars: 58,
    spectrumColumnStep: 2,
    spectrumContinuousMaxBars: 576,
    spectrumContinuousColumnStep: 1,
    spectrumGroupingPower: 1.55,
    spectrumRiseRowsPerSecond: 360,
    spectrumFallRowsPerSecond: 22,
    spectrumLowHeightRows: 7,
    spectrumLowHeightFallRowsPerSecond: 4.2,
    spectrumFloor: 0.018,
    spectrumCurve: 0.72,
    spectrumPeakHoldMs: 520,
    spectrumPeakFallRowsPerSecond: 10.5,
    spectrumPeakVisibleHoldMs: 90,
    spectrumPeakHideRows: 0.35,
    spectrumRotatorChance: 0,
    spectrumBrightRotatorChance: 0,
    spectrumHeadRotatorChance: 0,
    spectrumRotateMinTicks: 4,
    spectrumRotateMaxTicks: 9,
    spectrumColorHoldTicks: 36,
    spectrumPaletteHoldTicks: 54,
    spectrumMinDrawRows: 1,
    spectrumVisibleHoldTicks: 0,
    spectrumRowRiseBias: 0.1,
    spectrumRowRiseHysteresis: 0.36,
    spectrumRowFallHysteresis: 0.74,
    spectrumRowFallRetention: 0.14,
    spectrumRowDropHoldMs: 42,
    spectrumTailHoldMs: 180,
    spectrumPeakRowRiseHysteresis: 0.42,
    spectrumPeakRowFallHysteresis: 0.82,
    spectrumPeakRowFallRetention: 0.12,
    spectrumPeakRowDropHoldMs: 96,
    spectrumPeakMinRows: 1,
    spectrumClockMarginRows: 1,
    spectrumMinAlpha: 0.5,
    spectrumMaxAlpha: 1,
    spectrumEdgeBlendRows: 0,
    spectrumEdgeBlendAlpha: 0,
    spectrumColorNoiseScale: 3.2,
    spectrumColorDriftSpeed: 0.038,
    spectrumColorTransitionRate: 0.055,
    spectrumColorPeakThreshold: 0.62,
    spectrumColorPeakCooldownTicks: 42,
    debugLevel: 0.34
  },
  wallpaperProperties: {
    density: 62,
    speed: 55,
    brightness: 100,
    glyphscale: 100,
    characterspacing: 70,
    fontstyle: "trilogy",
    glow: true,
    clock: true,
    clockbrightness: 110,
    clockcolor: "0.70 1.00 0.78",
    audioenabled: true,
    audioresponse: 80,
    audiointensity: 80,
    audiobrightness: 100,
    audiosensitivity: 44,
    audiospectrumreverse: false,
    audiocolormode: "frequency_gradient"
  },
  clockColor: { r: 178, g: 255, b: 198 },
  baseColor: BASE_COLOR
};

const INITIAL_AUDIO_RESPONSE = initialAudioResponse();

const settings = {
  density: clamp(DENSITY_OVERRIDE ?? DEFAULT_PRESET.wallpaperProperties.density, 30, 95),
  speed: clamp(SPEED_OVERRIDE ?? DEFAULT_PRESET.wallpaperProperties.speed, 20, 100),
  brightness: clamp(BRIGHTNESS_OVERRIDE ?? DEFAULT_PRESET.wallpaperProperties.brightness, 35, 100),
  glyphscale: clamp(GLYPH_SCALE_OVERRIDE ?? DEFAULT_PRESET.wallpaperProperties.glyphscale, 75, 130),
  characterspacing: clamp(CHARACTER_SPACING_OVERRIDE ?? DEFAULT_PRESET.wallpaperProperties.characterspacing, 40, 240),
  fontstyle: FONT_STYLE_OVERRIDE ?? DEFAULT_PRESET.wallpaperProperties.fontstyle,
  glow: GLOW_OVERRIDE ?? DEFAULT_PRESET.wallpaperProperties.glow,
  clock: CLOCK_OVERRIDE ?? DEFAULT_PRESET.wallpaperProperties.clock,
  clockbrightness: clamp(CLOCK_BRIGHTNESS_OVERRIDE ?? DEFAULT_PRESET.wallpaperProperties.clockbrightness, 60, 160),
  clockcolor: CLOCK_COLOR_OVERRIDE ?? DEFAULT_PRESET.clockColor,
  audioenabled: AUDIO_OVERRIDE ?? DEFAULT_PRESET.wallpaperProperties.audioenabled,
  audioresponse: INITIAL_AUDIO_RESPONSE,
  audiointensity: audioIntensityFromResponse(INITIAL_AUDIO_RESPONSE),
  audiobrightness: clamp(AUDIO_BRIGHTNESS_OVERRIDE ?? DEFAULT_PRESET.wallpaperProperties.audiobrightness, 30, 160),
  audiosensitivity: audioSensitivityFromResponse(INITIAL_AUDIO_RESPONSE),
  audiospectrumreverse: AUDIO_SPECTRUM_REVERSE_OVERRIDE ?? DEFAULT_PRESET.wallpaperProperties.audiospectrumreverse,
  audiocolormode: AUDIO_COLOR_MODE_OVERRIDE ?? DEFAULT_PRESET.wallpaperProperties.audiocolormode,
  color: COLOR_OVERRIDE ?? DEFAULT_PRESET.baseColor,
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
let activeFontStyle = settings.fontstyle;
let activeFontFamily = FONT_FAMILIES[activeFontStyle] || FONT_FAMILIES.trilogy;
let activeLayoutProfile = null;
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
let clockMask = new Uint8Array(0);
let clockEmphasisMask = new Uint8Array(0);
let clockHighlightMask = new Uint8Array(0);
let clockCells = [];
let clockMaskKey = "";
let clockText = "";
let layoutModeOverride = LAYOUT_OVERRIDE;
let audioDebugEnabled = AUDIO_DEBUG_OVERRIDE
  ?? (settings.audioenabled && !WALLPAPER_AUDIO_API_AVAILABLE && (CONTROLS_ENABLED || AUDIO_OVERRIDE === true));
let audioState = {
  bass: 0,
  mid: 0,
  treble: 0,
  level: 0,
  peak: 0,
  inputPeak: 0,
  inputAverage: 0,
  inputGain: 1,
  spectrumBins: Array(AUDIO_SPECTRUM_BINS).fill(0),
  spectrumBars: [],
  spectrumCells: 0,
  spectrumPeakCells: 0,
  colorCurrentSeed: 0x1fc56d43,
  colorTargetSeed: 0x8e4c0b91,
  colorBlend: 1,
  nextColorShuffleTick: 0,
  lastInputTime: 0,
  lastAudioCallbackTime: 0,
  audioCallbackCount: 0,
  lastAudioListenerRegisterTime: 0,
  audioListenerRegisterCount: 0,
  audioListenerRegisterReason: "",
  spectrumLastUpdateTime: 0,
  debugPhase: 0
};
let audioListenerRecoveryTimers = [];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseBooleanParam(value) {
  if (value === null) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "on", "yes", "show"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "off", "no", "hide"].includes(normalized)) {
    return false;
  }
  return null;
}

function parseNumberParam(value) {
  if (value === null) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeUiLanguage(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace("_", "-");
  if (["zh-cht", "zh-tw", "zh-hk", "zh-mo", "zh-hant"].includes(normalized)) {
    return "zh-cht";
  }
  if (["zh-chs", "zh-cn", "zh-sg", "zh-hans", "zh"].includes(normalized)) {
    return "zh-chs";
  }
  if (["en", "en-us", "en-gb"].includes(normalized)) {
    return "en-us";
  }
  return null;
}

function normalizeLayoutMode(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return ["phone", "tablet", "desktop"].includes(normalized) ? normalized : null;
}

function normalizeFontStyle(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[-_\s]/g, "");
  if (["trilogy", "classic", "matrix", "matrixcode", "matrixcodettf"].includes(normalized)) {
    return "trilogy";
  }
  if (["resurrections", "resurrection", "resurrected", "matrixresurrections", "matrixresurrected", "matrixresurrectedttf"].includes(normalized)) {
    return "resurrections";
  }
  if (FONT_STYLES.has(normalized)) {
    return normalized;
  }
  return null;
}

function normalizeAudioColorMode(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[-\s]/g, "_");
  if (["level_layers", "levellayers", "aurora", "aurora_gradient", "auroragradient", "winamp", "winamp_layers", "winamplayers", "amplitude", "amplitudebands", "amplitude_bands", "level", "levels", "bands"].includes(normalized)) {
    return "level_layers";
  }
  if (["frequency_gradient", "frequencygradient", "spectrum_gradient", "spectrumgradient", "spectrum", "rainbow", "frequency"].includes(normalized)) {
    return "frequency_gradient";
  }
  if (["neon_blocks", "neonblocks", "neon", "random", "colorful"].includes(normalized)) {
    return "neon_blocks";
  }
  if (["matrix", "matrix_tint", "matrixtint", "green"].includes(normalized)) {
    return "matrix_tint";
  }
  if (AUDIO_COLOR_MODES.has(normalized)) {
    return normalized;
  }
  return null;
}

function audioIntensityFromResponse(value) {
  return clamp(Math.round(value), 0, 100);
}

function audioSensitivityFromResponse(value) {
  return clamp(Math.round(value * 0.55), 10, 100);
}

function responseFromLegacyAudio(intensity, sensitivity) {
  if (Number.isFinite(intensity)) {
    return clamp(intensity, 0, 100);
  }
  if (Number.isFinite(sensitivity)) {
    return clamp((sensitivity / 55) * 100, 0, 100);
  }
  return null;
}

function initialAudioResponse() {
  return clamp(
    AUDIO_RESPONSE_OVERRIDE
      ?? responseFromLegacyAudio(AUDIO_INTENSITY_OVERRIDE, AUDIO_SENSITIVITY_OVERRIDE)
      ?? DEFAULT_PRESET.wallpaperProperties.audioresponse,
    0,
    100
  );
}

function setAudioResponse(value) {
  const nextResponse = Number(value);
  settings.audioresponse = clamp(
    Number.isFinite(nextResponse) ? nextResponse : DEFAULT_PRESET.wallpaperProperties.audioresponse,
    0,
    100
  );
  settings.audiointensity = audioIntensityFromResponse(settings.audioresponse);
  settings.audiosensitivity = audioSensitivityFromResponse(settings.audioresponse);
}

function setActiveFontStyle(nextStyle) {
  const normalized = normalizeFontStyle(nextStyle) || DEFAULT_PRESET.wallpaperProperties.fontstyle;
  activeFontStyle = normalized;
  activeFontFamily = FONT_FAMILIES[activeFontStyle] || FONT_FAMILIES.trilogy;
  CHAR_POOL = FONT_CHAR_POOLS[activeFontStyle] || FONT_CHAR_POOLS.trilogy;
  CHAR_LIST = Array.from(CHAR_POOL);
  GLYPH_INDEX = new Map(CHAR_LIST.map((char, index) => [char, index]));
  GLYPH_MEASURE_POOL = CHAR_POOL;
  glyphCache = new Map();
  settings.fontstyle = activeFontStyle;
}

function loadActiveFont() {
  if (!document.fonts || typeof document.fonts.load !== "function") {
    return Promise.resolve();
  }

  const loadSize = fontSize || 18;
  const families = Array.from(new Set([activeFontFamily, FONT_FAMILIES.trilogy]));
  return Promise.all(families.map((family) => document.fonts.load(`${loadSize}px ${family}`)))
    .then(() => document.fonts.ready);
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
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

function hslToRgb(hue, saturation, lightness) {
  const h = ((hue % 360) + 360) % 360 / 60;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = lightness - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 1) {
    r = c;
    g = x;
  } else if (h < 2) {
    r = x;
    g = c;
  } else if (h < 3) {
    g = c;
    b = x;
  } else if (h < 4) {
    g = x;
    b = c;
  } else if (h < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

function saturateColor(color, multiplier) {
  const luma = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
  return {
    r: clamp(Math.round(luma + (color.r - luma) * multiplier), 0, 255),
    g: clamp(Math.round(luma + (color.g - luma) * multiplier), 0, 255),
    b: clamp(Math.round(luma + (color.b - luma) * multiplier), 0, 255)
  };
}

function bodyToneSourceColor(variant, color) {
  if (variant.fixed || variant.name === "accent" || variant.name === "clock") {
    return color;
  }

  return saturateColor(scaleColor(color, 0.8), 1.2);
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

function parseQueryColor(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const trimmed = value.trim();
  const hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }

  const parts = trimmed.split(/[,\s-]+/).map(Number);
  if (parts.length >= 3 && parts.every((part) => Number.isFinite(part))) {
    return {
      r: clamp(Math.round(parts[0]), 0, 255),
      g: clamp(Math.round(parts[1]), 0, 255),
      b: clamp(Math.round(parts[2]), 0, 255)
    };
  }

  return null;
}

function colorToHex(color) {
  const hex = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`;
}

function colorToWallpaperValue(color) {
  const channel = (value) => (clamp(Math.round(value), 0, 255) / 255).toFixed(4);
  return `${channel(color.r)} ${channel(color.g)} ${channel(color.b)}`;
}

function parseWallpaperColor(value, fallback = DEFAULT_PRESET.baseColor) {
  if (typeof value !== "string") {
    return fallback;
  }

  const parts = value.trim().split(/\s+/).map(Number);

  if (parts.length < 3 || parts.some((part) => !Number.isFinite(part))) {
    return fallback;
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
  const audioBrightness = clamp(settings.audiobrightness / 100, 0.3, 1.6);
  const clockBrightness = clamp(settings.clockbrightness / DEFAULT_PRESET.wallpaperProperties.clockbrightness, 0.55, 1.45);
  const glowIntensity = DEFAULT_PRESET.glowingTracers.intensity / 100;
  const whiteGreenHead = { r: 226, g: 255, b: 220 };
  const audioHeadWhite = { r: 255, g: 252, b: 232 };
  const clockBaseColor = settings.clockcolor || DEFAULT_PRESET.clockColor;
  const clockColorDelta = Math.abs(clockBaseColor.r - DEFAULT_PRESET.clockColor.r)
    + Math.abs(clockBaseColor.g - DEFAULT_PRESET.clockColor.g)
    + Math.abs(clockBaseColor.b - DEFAULT_PRESET.clockColor.b);
  const clockColorChanged = clockColorDelta > 4;
  const clockBrightColor = clockColorChanged
    ? mixColor(clockBaseColor, { r: 255, g: 255, b: 242 }, 0.26)
    : mixColor({ r: 246, g: 255, b: 238 }, clockBaseColor, 0.44);
  const variants = [
    { name: "dim", bodyColor: { r: 29, g: 138, b: 59 }, brightColor: { r: 64, g: 196, b: 100 }, glow: 0.18 },
    { name: "normal", bodyColor: { r: 36, g: 176, b: 75 }, brightColor: { r: 96, g: 228, b: 132 }, glow: 0.28 },
    { name: "pale", bodyColor: { r: 82, g: 226, b: 124 }, brightColor: { r: 156, g: 255, b: 186 }, glow: 0.42 },
    { name: "accent", bodyColor: { r: 135, g: 255, b: 168 }, brightColor: { r: 210, g: 255, b: 220 }, glow: 0.64 },
    { name: "clock", bodyColor: clockBaseColor, brightColor: clockBrightColor, glow: 0.82, fixed: true },
    { name: "negative", bodyColor: { r: 24, g: 112, b: 50 }, brightColor: { r: 50, g: 166, b: 85 }, glow: 0.14 },
    { name: "audioPeakCap", bodyColor: { r: 255, g: 232, b: 66 }, brightColor: { r: 255, g: 250, b: 168 }, glow: 0.82, fixed: true },
    { name: "audioRed", bodyColor: { r: 238, g: 64, b: 76 }, brightColor: { r: 255, g: 154, b: 132 }, glow: 0.62, fixed: true },
    { name: "audioYellow", bodyColor: { r: 236, g: 220, b: 76 }, brightColor: { r: 255, g: 252, b: 168 }, glow: 0.66, fixed: true },
    { name: "audioCyan", bodyColor: { r: 52, g: 226, b: 226 }, brightColor: { r: 178, g: 255, b: 248 }, glow: 0.68, fixed: true },
    { name: "audioBlue", bodyColor: { r: 78, g: 128, b: 255 }, brightColor: { r: 168, g: 208, b: 255 }, glow: 0.64, fixed: true },
    { name: "audioViolet", bodyColor: { r: 188, g: 96, b: 255 }, brightColor: { r: 238, g: 190, b: 255 }, glow: 0.7, fixed: true },
    { name: "audioMatrix", bodyColor: { r: 92, g: 255, b: 156 }, brightColor: { r: 226, g: 255, b: 220 }, glow: 0.64, fixed: true }
  ];

  for (let index = 0; index < AUDIO_HUE_STEPS; index += 1) {
    const hue = (index / AUDIO_HUE_STEPS) * 360;
    variants.push({
      name: `audioHue${index}`,
      bodyColor: hslToRgb(hue, 0.92, 0.58),
      brightColor: hslToRgb(hue, 0.96, 0.76),
      glow: 0.68,
      fixed: true
    });
  }

  palettes = variants.map((variant) => {
    const audioVariant = variant.name.startsWith("audio");
    const clockVariant = variant.name === "clock";
    const paletteBrightness = audioVariant
      ? audioBrightness
      : (clockVariant ? clockBrightness : referenceBrightness);
    const bodyColor = bodyToneSourceColor(variant, variant.bodyColor);
    const brightColor = bodyToneSourceColor(variant, variant.brightColor);
    const body = variant.fixed
      ? scaleColor(bodyColor, paletteBrightness)
      : referenceToneColor(bodyColor, paletteBrightness);
    const bright = variant.fixed
      ? scaleColor(brightColor, paletteBrightness)
      : referenceToneColor(brightColor, paletteBrightness);
    const dimSource = scaleColor(bodyColor, variant.fixed ? 0.48 : 0.58);
    const dim = variant.fixed
      ? scaleColor(dimSource, paletteBrightness)
      : referenceToneColor(dimSource, paletteBrightness);
    const headBase = clockVariant
      ? (clockColorChanged
        ? mixColor(clockBaseColor, { r: 255, g: 255, b: 242 }, 0.18)
        : mixColor(whiteGreenHead, settings.color, 0.008))
      : (variant.fixed
        ? mixColor(audioHeadWhite, variant.brightColor, 0.44)
        : mixColor(whiteGreenHead, settings.color, 0.008));
    const head = scaleColor(headBase, paletteBrightness);
    const glowBase = variant.fixed
      ? mixColor(variant.brightColor, audioHeadWhite, 0.2)
      : mixColor(head, settings.color, 0.24);
    const glowBrightness = audioVariant
      ? audioBrightness
      : (clockVariant ? clockBrightness : clamp(settings.brightness / 72, 0.45, 1.35));

    return {
      name: variant.name,
      dim: rgb(dim),
      body: rgb(body),
      bright: rgb(bright),
      head: rgb(head),
      glow: rgba(glowBase, Math.max(variant.glow, 0.2) * glowIntensity * glowBrightness)
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
  sctx.font = `${size}px ${activeFontFamily}`;

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
  sctx.font = `${size}px ${activeFontFamily}`;

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

function smoothAudioValue(current, target) {
  const audio = DEFAULT_PRESET.audioResponsive;
  const factor = target > current ? audio.attack : audio.release;
  return current + (target - current) * factor;
}

function audioSensitivityScale() {
  return 0.45 + clamp(settings.audioresponse / 100, 0, 1) * 0.55;
}

function audioResponseIntensity() {
  return clamp(settings.audioresponse / 100, 0, 1);
}

function applyAudioLevels(bass, mid, treble, markInput = false) {
  const audio = DEFAULT_PRESET.audioResponsive;
  const sensitivity = audioSensitivityScale();
  const nextBass = clamp(bass * audio.bassWeight * sensitivity, 0, 1);
  const nextMid = clamp(mid * audio.midWeight * sensitivity, 0, 1);
  const nextTreble = clamp(treble * audio.trebleWeight * sensitivity, 0, 1);
  const nextLevel = clamp(Math.sqrt(
    (nextBass * nextBass * audio.bassWeight
      + nextMid * nextMid * audio.midWeight
      + nextTreble * nextTreble * audio.trebleWeight)
    / (audio.bassWeight + audio.midWeight + audio.trebleWeight)
  ), 0, 1);

  audioState.bass = smoothAudioValue(audioState.bass, nextBass);
  audioState.mid = smoothAudioValue(audioState.mid, nextMid);
  audioState.treble = smoothAudioValue(audioState.treble, nextTreble);
  audioState.level = smoothAudioValue(audioState.level, nextLevel);
  audioState.peak = Math.max(audioState.level, audioState.peak * (1 - audio.peakRelease));

  if (markInput) {
    audioState.lastInputTime = performance.now();
  }
}

function timeScaledFactor(baseFactor, elapsedSeconds) {
  const normalizedTicks = clamp(elapsedSeconds * tickRate(), 0, 4);
  return clamp(1 - Math.pow(1 - clamp(baseFactor, 0, 1), normalizedTicks), 0, 1);
}

function smoothAudioSpectrumRows(bar, targetRows, elapsedSeconds, maxRows) {
  const audio = DEFAULT_PRESET.audioResponsive;
  const safeTarget = clamp(targetRows, 0, maxRows);
  const currentRows = clamp(
    Number.isFinite(bar.cavaRows) ? bar.cavaRows : ((bar.value || 0) * maxRows),
    0,
    maxRows
  );
  const memoryRows = clamp(
    Number.isFinite(bar.cavaMemoryRows) ? bar.cavaMemoryRows : currentRows,
    0,
    maxRows
  );
  const memoryFactor = safeTarget >= memoryRows
    ? timeScaledFactor(audio.spectrumCavaIntegralRise, elapsedSeconds)
    : timeScaledFactor(audio.spectrumCavaIntegralFall, elapsedSeconds);
  const integratedRows = memoryRows + (safeTarget - memoryRows) * memoryFactor;

  bar.cavaMemoryRows = integratedRows < 0.01 ? 0 : integratedRows;

  if (bar.cavaMemoryRows >= currentRows) {
    bar.cavaRows = bar.cavaMemoryRows;
    bar.cavaPeakRows = bar.cavaRows;
    bar.cavaFall = 0;
    return bar.cavaRows;
  }

  const peakRows = clamp(
    Number.isFinite(bar.cavaPeakRows) ? bar.cavaPeakRows : currentRows,
    0,
    maxRows
  );
  const nextFall = (bar.cavaFall || 0) + audio.spectrumCavaFallStep * clamp(elapsedSeconds * 60, 0, 4);
  const falloffRows = peakRows * (1 - nextFall * nextFall * audio.spectrumCavaGravity);
  const nextRows = clamp(Math.max(bar.cavaMemoryRows, falloffRows), 0, maxRows);

  bar.cavaRows = nextRows < 0.01 ? 0 : nextRows;
  bar.cavaFall = nextRows <= bar.cavaMemoryRows + 0.01 ? 0 : nextFall;
  if (bar.cavaFall === 0) {
    bar.cavaPeakRows = bar.cavaMemoryRows;
  }

  return bar.cavaRows;
}

function applyAudioSpectrumBins(rawBins, inputGain = 1) {
  const sensitivity = audioSensitivityScale();

  for (let index = 0; index < AUDIO_SPECTRUM_BINS; index += 1) {
    const raw = rawBins && Number.isFinite(rawBins[index]) ? rawBins[index] : 0;
    const target = clamp(raw * inputGain * sensitivity, 0, 1);
    const current = clamp(audioState.spectrumBins[index] || 0, 0, 1);
    const smoothing = target > current
      ? DEFAULT_PRESET.audioResponsive.spectrumBinAttack
      : DEFAULT_PRESET.audioResponsive.spectrumBinRelease;
    const next = current + (target - current) * smoothing;
    audioState.spectrumBins[index] = next < 0.0005 ? 0 : next;
  }
}

function audioDebugLevel() {
  const level = AUDIO_DEBUG_LEVEL_OVERRIDE ?? DEFAULT_PRESET.audioResponsive.debugLevel;
  const normalizedLevel = level > 1 ? level / 100 : level;
  return clamp(Number.isFinite(normalizedLevel) ? normalizedLevel : DEFAULT_PRESET.audioResponsive.debugLevel, 0.05, 1);
}

function audioBandRms(audioArray, start, end, halfCount, inputGain = 1) {
  let sum = 0;
  let count = 0;

  for (let index = start; index < end && index < halfCount; index += 1) {
    const left = clamp((Number(audioArray[index]) || 0) * inputGain, 0, 1);
    const right = clamp((Number(audioArray[index + halfCount]) || 0) * inputGain, 0, 1);
    const mono = (left + right) * 0.5;
    sum += mono * mono;
    count += 1;
  }

  return count > 0 ? Math.sqrt(sum / count) : 0;
}

function audioInputStats(audioArray) {
  let peak = 0;
  let sum = 0;
  let count = 0;

  for (const sample of audioArray) {
    const value = Math.max(0, Number(sample) || 0);
    peak = Math.max(peak, value);
    sum += value;
    count += 1;
  }

  return {
    peak,
    average: count > 0 ? sum / count : 0
  };
}

function audioAutoGainForPeak(peak) {
  const audio = DEFAULT_PRESET.audioResponsive;
  if (!Number.isFinite(peak) || peak <= audio.inputNoiseGate) {
    return 1;
  }

  return clamp(audio.inputAutoGainTargetPeak / peak, 1, audio.inputAutoGainMax);
}

function audioSpectrumBinsFromArray(audioArray, halfCount) {
  const bins = Array(AUDIO_SPECTRUM_BINS).fill(0);
  if (halfCount <= 0) {
    return bins;
  }

  for (let bin = 0; bin < AUDIO_SPECTRUM_BINS; bin += 1) {
    const sourceStart = Math.floor((bin / AUDIO_SPECTRUM_BINS) * halfCount);
    const sourceEnd = Math.max(sourceStart + 1, Math.floor(((bin + 1) / AUDIO_SPECTRUM_BINS) * halfCount));
    let sum = 0;
    let count = 0;

    for (let index = sourceStart; index < sourceEnd && index < halfCount; index += 1) {
      const left = clamp(Number(audioArray[index]) || 0, 0, 1);
      const right = clamp(Number(audioArray[index + halfCount]) || 0, 0, 1);
      const mono = (left + right) * 0.5;
      sum += mono * mono;
      count += 1;
    }

    bins[bin] = count > 0 ? Math.sqrt(sum / count) : 0;
  }

  return bins;
}

function updateAudioFromArray(audioArray) {
  if (!audioArray || audioArray.length < 4) {
    return;
  }

  const inputStats = audioInputStats(audioArray);
  const inputGain = audioAutoGainForPeak(inputStats.peak);
  const halfCount = Math.floor(audioArray.length / 2);
  audioState.inputPeak = inputStats.peak;
  audioState.inputAverage = inputStats.average;
  audioState.inputGain = inputGain;

  applyAudioLevels(
    audioBandRms(audioArray, 0, 8, halfCount, inputGain),
    audioBandRms(audioArray, 8, 32, halfCount, inputGain),
    audioBandRms(audioArray, 32, halfCount, halfCount, inputGain),
    true
  );
  applyAudioSpectrumBins(audioSpectrumBinsFromArray(audioArray, halfCount), inputGain);
  updateAudioSpectrumBars();
}

function updateAudioDebugSignal() {
  const time = logicalTick / tickRate();
  const debugLevel = audioDebugLevel();
  const cycleTicks = Math.max(9, Math.round(tickRate() * 0.42));
  const pulseTicks = 4;
  const cycleIndex = Math.floor(logicalTick / cycleTicks);
  const cycleAge = logicalTick % cycleTicks;
  const pulseActive = cycleAge < pulseTicks;
  const pulseSeed = hashInt(PATTERN_SEED ^ Math.imul(cycleIndex + 1, 1597334677));
  const peaks = Array.from({ length: 5 }, (_, peakIndex) => {
    const seed = hashInt(pulseSeed ^ Math.imul(peakIndex + 3, 2246822519));
    return {
      center: hashUnit(seed),
      width: seededRange(seed ^ 0x45d9, 0.045, 0.15),
      height: seededRange(seed ^ 0x27d4, 0.42, 1)
    };
  });
  const bins = Array.from({ length: AUDIO_SPECTRUM_BINS }, (_, index) => {
    const unit = index / Math.max(1, AUDIO_SPECTRUM_BINS - 1);
    let level = 0;

    for (const peak of peaks) {
      level += Math.exp(-Math.pow((unit - peak.center) / peak.width, 2)) * peak.height;
    }

    const perBinLift = seededRange(pulseSeed ^ Math.imul(index + 11, 3266489917), 0.02, 0.16);
    const ripple = 0.82 + 0.18 * Math.sin(cycleIndex * 1.7 + index * 0.53);
    return pulseActive ? clamp((level + perBinLift) * ripple * debugLevel, 0, 1) : 0;
  });
  const bass = Math.sqrt(bins.slice(0, 8).reduce((sum, value) => sum + value * value, 0) / 8);
  const mid = Math.sqrt(bins.slice(8, 32).reduce((sum, value) => sum + value * value, 0) / 24);
  const treble = Math.sqrt(bins.slice(32).reduce((sum, value) => sum + value * value, 0) / 32);

  audioState.debugPhase = time;
  audioState.inputPeak = Math.max(...bins);
  audioState.inputAverage = bins.reduce((sum, value) => sum + value, 0) / bins.length;
  audioState.inputGain = 1;
  applyAudioLevels(bass, mid, treble, false);
  applyAudioSpectrumBins(bins);
  updateAudioSpectrumBars();
}

function updateAudioResponsiveState() {
  if (audioDebugEnabled) {
    updateAudioDebugSignal();
    return;
  }

  const now = performance.now();
  if (now - audioState.lastInputTime > DEFAULT_PRESET.audioResponsive.silenceAfterMs) {
    applyAudioLevels(0, 0, 0, false);
    applyAudioSpectrumBins(null);
    updateAudioSpectrumBars();
  }

  if (
    settings.audioenabled
    && WALLPAPER_AUDIO_API_AVAILABLE
    && audioState.lastAudioCallbackTime > 0
    && now - audioState.lastAudioCallbackTime > AUDIO_LISTENER_STALE_CALLBACK_MS
    && now - audioState.lastAudioListenerRegisterTime > AUDIO_LISTENER_RECOVERY_COOLDOWN_MS
  ) {
    scheduleWallpaperAudioListenerRecovery("stale-callback");
  }
}

function activeAudioLevel() {
  if (!settings.audioenabled) {
    return 0;
  }

  const minLevel = DEFAULT_PRESET.audioResponsive.minLevel;
  return audioState.level <= minLevel
    ? 0
    : clamp((audioState.level - minLevel) / (1 - minLevel), 0, 1);
}

function audioSpectrumLayoutGeometryValues() {
  const audio = DEFAULT_PRESET.audioResponsive;
  return {
    columnStep: audio.spectrumContinuousColumnStep,
    maxBars: audio.spectrumContinuousMaxBars
  };
}

function audioSpectrumGeometry() {
  const audio = DEFAULT_PRESET.audioResponsive;
  const layout = audioSpectrumLayoutGeometryValues();
  const startColumn = clampInt(Math.round(gridColumns * audio.spectrumStartColumnRatio), 0, Math.max(0, gridColumns - 1));
  const endColumn = clampInt(Math.round(gridColumns * audio.spectrumEndColumnRatio), startColumn, Math.max(0, gridColumns - 1));
  const availableColumns = Math.max(1, endColumn - startColumn + 1);
  const barCount = clampInt(
    Math.floor(availableColumns / Math.max(1, layout.columnStep)),
    Math.min(audio.spectrumMinBars, availableColumns),
    Math.min(layout.maxBars, availableColumns)
  );
  const clockTopRow = clockCells.length > 0
    ? clockCells.reduce((minimum, cell) => Math.min(minimum, cell.rowIndex), rows)
    : rows;
  const clockBottomRow = clockCells.length > 0
    ? clockCells.reduce((maximum, cell) => Math.max(maximum, cell.rowIndex), -1)
    : -1;
  const maxRowsByScreen = Math.max(3, Math.round(rows * audio.spectrumMaxRowsRatio));
  const reverse = Boolean(settings.audiospectrumreverse);
  const defaultTopRow = clampInt(audio.spectrumTopRows, 0, Math.max(0, rows - 1));
  const clockSafeRows = reverse
    ? Math.max(0, rows - clockBottomRow - audio.spectrumClockMarginRows - 1)
    : Math.max(0, clockTopRow - audio.spectrumClockMarginRows - defaultTopRow);
  const maxRows = clampInt(
    Math.min(maxRowsByScreen, clockSafeRows),
    1,
    Math.max(1, reverse ? rows : rows - defaultTopRow)
  );
  const bottomRow = reverse
    ? Math.max(0, rows - 1)
    : Math.min(rows - 1, defaultTopRow + maxRows - 1);
  const topRow = reverse ? Math.max(0, bottomRow - maxRows + 1) : defaultTopRow;

  return {
    startColumn,
    endColumn,
    availableColumns,
    barCount,
    topRow,
    bottomRow,
    reverse,
    maxRows
  };
}

function audioSpectrumRowIndex(geometry, rowOffset) {
  return geometry.reverse
    ? geometry.bottomRow - rowOffset
    : geometry.topRow + rowOffset;
}

function ensureAudioSpectrumBars(barCount) {
  while (audioState.spectrumBars.length < barCount) {
    audioState.spectrumBars.push({
      value: 0,
      rawValue: 0,
      peakRows: 0,
      peakHold: 0,
      peakVisible: false,
      peakVisibleHold: 0,
      displayRows: 0,
      drawRows: 0,
      cavaRows: 0,
      cavaMemoryRows: 0,
      cavaPeakRows: 0,
      cavaFall: 0,
      peakDrawRows: 0,
      rowDropHold: 0,
      peakRowDropHold: 0,
      tailHold: 0,
      visibleHoldTicks: 0,
      colorValue: 0,
      colorBand: 0,
      colorHoldTicks: 0,
      paletteName: "audioHue0",
      paletteMode: "",
      paletteHoldTicks: 0
    });
  }
  if (audioState.spectrumBars.length > barCount) {
    audioState.spectrumBars.length = barCount;
  }
}

function audioSpectrumSamplePosition(barIndex, barCount) {
  const audio = DEFAULT_PRESET.audioResponsive;
  const unit = (barIndex + 0.5) / Math.max(1, barCount);
  const weightedUnit = Math.pow(unit, audio.spectrumGroupingPower);
  return clamp(weightedUnit * (AUDIO_SPECTRUM_BINS - 1), 0, AUDIO_SPECTRUM_BINS - 1);
}

function audioSpectrumBarLevel(barIndex, barCount) {
  const position = audioSpectrumSamplePosition(barIndex, barCount);
  const lower = Math.floor(position);
  const upper = Math.min(AUDIO_SPECTRUM_BINS - 1, lower + 1);
  const mix = position - lower;
  const lowerValue = audioState.spectrumBins[lower] || 0;
  const upperValue = audioState.spectrumBins[upper] || 0;
  const interpolated = lowerValue * (1 - mix) + upperValue * mix;
  const stableVariance = 0.988 + hashUnit(PATTERN_SEED ^ Math.imul(barIndex + 101, 2654435761)) * 0.024;

  return clamp(interpolated * stableVariance, 0, 1);
}

function audioHueStep(hue) {
  return Math.round((((hue % 360) + 360) % 360) / 360 * AUDIO_HUE_STEPS) % AUDIO_HUE_STEPS;
}

function interpolateHue(a, b, amount) {
  const delta = ((b - a + 540) % 360) - 180;
  return (((a + delta * clamp(amount, 0, 1)) % 360) + 360) % 360;
}

function hueFromStops(hues, unit) {
  if (!Array.isArray(hues) || hues.length === 0) {
    return 0;
  }
  if (hues.length === 1) {
    return hues[0];
  }

  const position = clamp(unit, 0, 0.999) * (hues.length - 1);
  const index = clampInt(Math.floor(position), 0, hues.length - 2);
  return interpolateHue(hues[index], hues[index + 1], position - index);
}

function smoothStep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function audioColorField(seed, unit) {
  const audio = DEFAULT_PRESET.audioResponsive;
  const drift = renderSeconds * audio.spectrumColorDriftSpeed;
  const x = unit * audio.spectrumColorNoiseScale + drift;
  const phaseA = hashUnit(seed ^ 0x2d37) * Math.PI * 2;
  const phaseB = hashUnit(seed ^ 0x6a09) * Math.PI * 2;
  const phaseC = hashUnit(seed ^ 0x9e37) * Math.PI * 2;
  const value = 0.5
    + Math.sin(x * Math.PI * 2 + phaseA) * 0.28
    + Math.sin(x * Math.PI * 3.7 + phaseB) * 0.16
    + Math.sin(x * Math.PI * 7.1 + phaseC) * 0.08;

  return clamp(value, 0, 0.999);
}

function updateAudioColorField(level) {
  const audio = DEFAULT_PRESET.audioResponsive;

  audioState.colorBlend = Math.min(1, audioState.colorBlend + audio.spectrumColorTransitionRate);

  if (
    settings.audioenabled
    && level > audio.spectrumColorPeakThreshold
    && logicalTick >= audioState.nextColorShuffleTick
  ) {
    audioState.colorCurrentSeed = audioState.colorTargetSeed;
    audioState.colorTargetSeed = hashInt(audioState.colorTargetSeed ^ Math.imul(logicalTick + 1, 2246822519));
    audioState.colorBlend = 0;
    audioState.nextColorShuffleTick = logicalTick + audio.spectrumColorPeakCooldownTicks;
  }
}

function audioAmplitudeBand(value, previousBand = 0) {
  const hues = AUDIO_SPECTRUM_HUES.level_layers;
  let nextBand = clampInt(previousBand, 0, hues.length - 1);
  const level = clamp(value, 0, 0.999);
  const riseHysteresis = 0.06;
  const fallHysteresis = 0.075;

  while (nextBand < hues.length - 1 && level > ((nextBand + 1) / hues.length) + riseHysteresis) {
    nextBand += 1;
  }

  while (nextBand > 0 && level < (nextBand / hues.length) - fallHysteresis) {
    nextBand -= 1;
  }

  return nextBand;
}

function audioSpectrumHueIndex(barIndex, barCount, barValue = 0, colorBand = null, rowOffset = null, maxRows = 1) {
  const unit = barCount <= 1 ? 0 : barIndex / (barCount - 1);
  const mode = settings.audiocolormode;
  const hues = AUDIO_SPECTRUM_HUES[mode] || AUDIO_SPECTRUM_HUES.level_layers;

  if (mode === "level_layers") {
    const depth = rowOffset == null ? clamp(barValue, 0, 1) : clamp(rowOffset / Math.max(1, maxRows - 1), 0, 1);
    return audioHueStep(hueFromStops(hues, depth));
  }

  if (mode === "frequency_gradient") {
    return audioHueStep(hueFromStops(hues, unit));
  }

  const modeSeed = mode === "neon_blocks"
    ? 0x7f4a7c15
    : (mode === "matrix_tint" ? 0x31b5f2d9 : 0x5e2d58a7);
  const colorUnit = hashUnit(PATTERN_SEED ^ modeSeed ^ Math.imul(barIndex + 1, 2246822519));
  const bandIndex = clampInt(Math.floor(colorUnit * hues.length), 0, hues.length - 1);

  return audioHueStep(hues[bandIndex]);
}

function audioSpectrumPaletteName(barIndex, barCount, barValue = 0, colorBand = null, rowOffset = null, maxRows = 1) {
  return `audioHue${audioSpectrumHueIndex(barIndex, barCount, barValue, colorBand, rowOffset, maxRows)}`;
}

function quantizeSpectrumRows(floatRows, previousRows, maxRows, riseHysteresis = null) {
  if (maxRows <= 0 || floatRows <= 0.025) {
    return 0;
  }

  const audio = DEFAULT_PRESET.audioResponsive;
  const currentRows = clampInt(previousRows || 0, 0, maxRows);
  const risingRows = clampInt(Math.ceil(floatRows - audio.spectrumRowRiseBias), 0, maxRows);

  const requiredRise = Number.isFinite(riseHysteresis) ? riseHysteresis : audio.spectrumRowRiseHysteresis;
  if (risingRows > currentRows && floatRows >= currentRows + requiredRise) {
    return risingRows;
  }

  if (currentRows <= 0) {
    return risingRows;
  }

  if (floatRows <= currentRows - audio.spectrumRowFallHysteresis) {
    return clampInt(Math.floor(floatRows + audio.spectrumRowFallRetention), 0, maxRows);
  }

  return currentRows;
}

function quantizeSpectrumPeakRows(floatRows, previousRows, maxRows, isVisible) {
  if (!isVisible || maxRows <= 0 || floatRows <= 0) {
    return 0;
  }

  const audio = DEFAULT_PRESET.audioResponsive;
  const currentRows = clampInt(previousRows || 0, 0, maxRows);
  const risingRows = clampInt(Math.max(1, Math.ceil(floatRows - audio.spectrumRowRiseBias)), 1, maxRows);

  if (
    currentRows <= 0
    || (risingRows > currentRows && floatRows >= currentRows + audio.spectrumPeakRowRiseHysteresis)
  ) {
    return risingRows;
  }

  if (floatRows <= currentRows - audio.spectrumPeakRowFallHysteresis) {
    return clampInt(Math.max(1, Math.floor(floatRows + audio.spectrumPeakRowFallRetention)), 1, maxRows);
  }

  return currentRows;
}

function stabilizeSpectrumRows(proposedRows, previousRows, elapsedSeconds, holdSeconds, holdValueName, bar) {
  const currentRows = Math.max(0, previousRows || 0);
  if (proposedRows >= currentRows) {
    bar[holdValueName] = 0;
    return proposedRows;
  }

  bar[holdValueName] = (bar[holdValueName] || 0) + elapsedSeconds;
  if (bar[holdValueName] < holdSeconds) {
    return currentRows;
  }

  bar[holdValueName] = 0;
  return Math.max(proposedRows, currentRows - 1);
}

function updateAudioSpectrumBars() {
  const geometry = audioSpectrumGeometry();
  const audio = DEFAULT_PRESET.audioResponsive;
  const globalLevel = activeAudioLevel();
  const intensity = audioResponseIntensity();
  const now = performance.now();
  const elapsedSeconds = audioState.spectrumLastUpdateTime > 0
    ? (now - audioState.spectrumLastUpdateTime) / 1000
    : 1 / tickRate();
  let cells = 0;
  let peakCells = 0;

  audioState.spectrumLastUpdateTime = now;
  ensureAudioSpectrumBars(geometry.barCount);
  updateAudioColorField(globalLevel);

  for (let barIndex = 0; barIndex < geometry.barCount; barIndex += 1) {
    const bar = audioState.spectrumBars[barIndex];
    const rawLevel = settings.audioenabled
      ? audioSpectrumBarLevel(barIndex, geometry.barCount)
      : 0;
    const target = rawLevel <= audio.spectrumFloor
      ? 0
      : Math.pow(clamp((rawLevel - audio.spectrumFloor) / (1 - audio.spectrumFloor), 0, 1), audio.spectrumCurve);
    const heightScale = intensity * 1.22;
    const targetRows = target * heightScale * geometry.maxRows;
    const nextRows = smoothAudioSpectrumRows(bar, targetRows, elapsedSeconds, geometry.maxRows);
    const nextValue = geometry.maxRows > 0 ? clamp(nextRows / geometry.maxRows, 0, 1) : 0;
    const displayRowsFloat = clamp(nextRows, 0, geometry.maxRows);
    const barRows = clampInt(Math.round(displayRowsFloat), 0, geometry.maxRows);
    let drawRows = 0;
    const colorTarget = Math.pow(clamp(nextValue, 0, 1), 0.82);
    const colorFactor = colorTarget > (bar.colorValue || 0) ? 0.12 : 0.045;
    const previousBand = Number.isInteger(bar.colorBand) ? bar.colorBand : 0;

    bar.value = nextValue;
    bar.rawValue = target;
    bar.displayRows = displayRowsFloat;
    const previousDrawRows = Number.isFinite(bar.drawRows) ? bar.drawRows : 0;
    let proposedDrawRows = barRows >= audio.spectrumMinDrawRows
      ? quantizeSpectrumRows(displayRowsFloat, previousDrawRows, geometry.maxRows)
      : 0;
    if (proposedDrawRows > 0) {
      bar.tailHold = audio.spectrumTailHoldMs / 1000;
    } else if (bar.tailHold > 0 && bar.drawRows > 0) {
      proposedDrawRows = Math.min(1, geometry.maxRows);
      bar.tailHold = Math.max(0, bar.tailHold - elapsedSeconds);
    } else {
      bar.tailHold = 0;
    }
    drawRows = stabilizeSpectrumRows(
      proposedDrawRows,
      bar.drawRows,
      elapsedSeconds,
      audio.spectrumRowDropHoldMs / 1000,
      "rowDropHold",
      bar
    );
    bar.visibleHoldTicks = 0;
    bar.drawRows = drawRows;
    bar.colorValue = (bar.colorValue || 0) + (colorTarget - (bar.colorValue || 0)) * colorFactor;
    const nextBand = audioAmplitudeBand(bar.colorValue, previousBand);
    if (nextBand !== previousBand) {
      if (bar.colorHoldTicks <= 0) {
        bar.colorBand = nextBand;
        bar.colorHoldTicks = audio.spectrumColorHoldTicks;
      } else {
        bar.colorHoldTicks -= 1;
      }
    } else {
      bar.colorBand = previousBand;
      bar.colorHoldTicks = Math.max(0, bar.colorHoldTicks - 1);
    }
    const nextPaletteName = audioSpectrumPaletteName(
      barIndex,
      geometry.barCount,
      Number.isFinite(bar.colorValue) ? bar.colorValue : bar.value,
      Number.isInteger(bar.colorBand) ? bar.colorBand : null
    );
    if (!bar.paletteName || bar.paletteMode !== settings.audiocolormode || drawRows === 0) {
      bar.paletteName = nextPaletteName;
      bar.paletteMode = settings.audiocolormode;
      bar.paletteHoldTicks = audio.spectrumPaletteHoldTicks;
    } else if (bar.paletteName !== nextPaletteName) {
      if (bar.paletteHoldTicks <= 0) {
        bar.paletteName = nextPaletteName;
        bar.paletteMode = settings.audiocolormode;
        bar.paletteHoldTicks = audio.spectrumPaletteHoldTicks;
      } else {
        bar.paletteHoldTicks -= 1;
      }
    } else {
      bar.paletteHoldTicks = Math.max(0, bar.paletteHoldTicks - 1);
    }
    if (drawRows > bar.peakRows) {
      bar.peakRows = drawRows;
      bar.peakHold = audio.spectrumPeakHoldMs / 1000;
    } else if (bar.peakHold > 0) {
      bar.peakHold = Math.max(0, bar.peakHold - elapsedSeconds);
    } else {
      bar.peakRows = Math.max(barRows, bar.peakRows - audio.spectrumPeakFallRowsPerSecond * elapsedSeconds);
    }
    if (bar.peakRows >= audio.spectrumPeakMinRows) {
      bar.peakVisible = true;
      bar.peakVisibleHold = audio.spectrumPeakVisibleHoldMs / 1000;
    } else if (bar.peakVisibleHold > 0) {
      bar.peakVisibleHold = Math.max(0, bar.peakVisibleHold - elapsedSeconds);
    } else if (bar.peakRows <= audio.spectrumPeakHideRows) {
      bar.peakVisible = false;
    }
    const proposedPeakDrawRows = quantizeSpectrumPeakRows(
      bar.peakRows,
      bar.peakDrawRows,
      geometry.maxRows,
      bar.peakVisible
    );
    bar.peakDrawRows = stabilizeSpectrumRows(
      proposedPeakDrawRows,
      bar.peakDrawRows,
      elapsedSeconds,
      audio.spectrumPeakRowDropHoldMs / 1000,
      "peakRowDropHold",
      bar
    );

    cells += drawRows;
    if (bar.peakVisible && bar.peakDrawRows > drawRows) {
      peakCells += 1;
    }
  }

  audioState.spectrumCells = settings.audiocolormode === "caps_only" ? 0 : cells;
  audioState.spectrumPeakCells = peakCells;
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

  const brightness = clamp(settings.clockbrightness / DEFAULT_PRESET.wallpaperProperties.clockbrightness, 0.55, 1.45);
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
    audioCell: Boolean(stream.audioRain),
    audioLevel: stream.audioLevel || 0,
    audioBand: stream.audioBand || null,
    audioWaveId: stream.audioWaveId || null,
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

function stabilizeStartupActivity() {
  const startup = DEFAULT_PRESET.startup;
  const maxActiveColumns = Math.max(1, Math.round(gridColumns * startup.maxActiveColumnRatio));
  const activeColumnsNow = activeColumns
    .filter((column) => column.active)
    .sort((a, b) => hashUnit(a.seed ^ 0x48f31) - hashUnit(b.seed ^ 0x48f31));

  for (let index = maxActiveColumns; index < activeColumnsNow.length; index += 1) {
    const column = activeColumnsNow[index];
    column.active = false;
    retireColumn(column);
  }

  if (activeColumnsNow.length < maxActiveColumns) {
    const inactiveColumns = activeColumns
      .filter((column) => !column.active)
      .sort((a, b) => hashUnit(a.seed ^ 0x912ab) - hashUnit(b.seed ^ 0x912ab));
    const needed = Math.min(maxActiveColumns - activeColumnsNow.length, inactiveColumns.length);

    for (let index = 0; index < needed; index += 1) {
      const column = inactiveColumns[index];
      const seed = hashInt(column.activitySeed ^ column.seed ^ 0x2fc19);
      setColumnActivity(column, true, seed, true);
    }
  }

  for (const column of activeColumns) {
    const seed = hashInt(column.activitySeed ^ column.seed ^ 0x5d71e9);
    if (column.active) {
      column.nextActivityTick = logicalTick + Math.floor(seededRange(seed, startup.activeDelayMinTicks, startup.activeDelayMaxTicks));
    } else {
      column.nextActivityTick = logicalTick + Math.floor(seededRange(seed, startup.quietDelayMinTicks, startup.quietDelayMaxTicks));
    }

    for (const stream of column.streams) {
      stream.progress = hashUnit(seed ^ stream.seed ^ 0x7a3d);
    }
  }
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

  if (cell.clockCell) {
    updateClockCell(column, rowIndex, cell);
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
    if (stream.mode === "lowerFragment" || stream.mode === "audio") {
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
    forceVisible: !stream.negative && (stream.brightHead || stream.mode === "lowerFragment" || stream.mode === "audio"),
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
  updateAudioResponsiveState();

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
  return `${cellWidth}:${cellHeight}:${fontSize}:${glyphScaleX}:${glyphScaleY}:${dpr}:${activeFontStyle}:${activeFontFamily}:${styleName}:${settings.glow}:${GLYPH_EDGE_ALPHA}:${palette.name}:${palette.dim}:${palette.body}:${palette.bright}:${palette.head}`;
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
  sctx.font = `${fontSize}px ${activeFontFamily}`;
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
    if (palette.name.startsWith("audio") && !settings.audioenabled && !audioDebugEnabled) {
      continue;
    }
    if (palette.name.startsWith("audioHue")) {
      continue;
    }

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

function paletteForCell(cell, column, clockHighlightHit) {
  if (clockHighlightHit || cell.clockCell) {
    return paletteByName("clock");
  }

  if (cell.audioCell) {
    return paletteByName(cell.paletteName) || column.palette;
  }

  return column.palette || paletteByName(column.paletteName);
}

function currentClockText() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function clockTextBaseWidth(text) {
  const gap = DEFAULT_PRESET.clock.gapColumns;
  let widthUnits = 0;

  for (let index = 0; index < text.length; index += 1) {
    const glyph = DOT_CLOCK_GLYPHS[text[index]];
    if (!glyph) {
      continue;
    }

    widthUnits += glyph[0].length;
    if (index < text.length - 1) {
      widthUnits += gap;
    }
  }

  return widthUnits;
}

function markClockMaskCell(nextMask, nextCells, columnIndex, rowIndex) {
  if (columnIndex < 0 || columnIndex >= gridColumns || rowIndex < 0 || rowIndex >= rows) {
    return;
  }

  const maskIndex = rowIndex * gridColumns + columnIndex;
  if (nextMask[maskIndex] === 1) {
    return;
  }

  nextMask[maskIndex] = 1;
  if (nextCells) {
    nextCells.push({
      columnIndex,
      rowIndex,
      salt: hashInt(Math.imul(columnIndex + 4099, 374761393) ^ Math.imul(rowIndex + 9176, 668265263))
    });
  }
}

function buildClockMaskFromDotMatrix(text) {
  const clock = DEFAULT_PRESET.clock;
  const nextMask = new Uint8Array(rows * gridColumns);
  const nextEmphasisMask = new Uint8Array(rows * gridColumns);
  const nextHighlightMask = new Uint8Array(rows * gridColumns);
  const nextCells = [];
  const baseHeight = 7;
  const baseWidth = clockTextBaseWidth(text);
  const scale = 1;
  const totalWidth = baseWidth * scale;
  const totalHeight = baseHeight * scale;
  const startColumn = clampInt((gridColumns - totalWidth) / 2, 0, Math.max(0, gridColumns - totalWidth));
  const startRow = clampInt((rows * clock.verticalCenter) - (totalHeight / 2), 0, Math.max(0, rows - totalHeight));
  let cursorColumn = startColumn;

  for (let textIndex = 0; textIndex < text.length; textIndex += 1) {
    const glyph = DOT_CLOCK_GLYPHS[text[textIndex]];
    if (!glyph) {
      continue;
    }

    for (let glyphRow = 0; glyphRow < glyph.length; glyphRow += 1) {
      for (let glyphColumn = 0; glyphColumn < glyph[glyphRow].length; glyphColumn += 1) {
        if (glyph[glyphRow][glyphColumn] !== "1") {
          continue;
        }

        for (let rowScale = 0; rowScale < scale; rowScale += 1) {
          for (let columnScale = 0; columnScale < scale; columnScale += 1) {
            const columnIndex = cursorColumn + glyphColumn * scale + columnScale;
            const rowIndex = startRow + glyphRow * scale + rowScale;
            markClockMaskCell(nextMask, nextCells, columnIndex, rowIndex);
            markClockMaskCell(nextHighlightMask, null, columnIndex, rowIndex);
            markClockMaskCell(nextEmphasisMask, null, columnIndex, rowIndex);
          }
        }
      }
    }

    cursorColumn += (glyph[0].length + clock.gapColumns) * scale;
  }

  return {
    nextMask,
    nextEmphasisMask,
    nextHighlightMask,
    nextCells
  };
}

function updateClockMask() {
  if (!settings.clock || rows <= 0 || gridColumns <= 0) {
    clearClockGridCells();
    clockMask = new Uint8Array(0);
    clockEmphasisMask = new Uint8Array(0);
    clockHighlightMask = new Uint8Array(0);
    clockCells = [];
    clockMaskKey = "";
    clockText = "";
    return;
  }

  const text = currentClockText();
  const key = `${text}:${rows}:${gridColumns}`;
  if (key === clockMaskKey
    && clockMask.length === rows * gridColumns
    && clockEmphasisMask.length === rows * gridColumns
    && clockHighlightMask.length === rows * gridColumns) {
    return;
  }

  const { nextMask, nextEmphasisMask, nextHighlightMask, nextCells } = buildClockMaskFromDotMatrix(text);

  clockMask = nextMask;
  clockEmphasisMask = nextEmphasisMask;
  clockHighlightMask = nextHighlightMask;
  clockCells = nextCells;
  clockMaskKey = key;
  clockText = text;
}

function isClockMaskCell(columnIndex, rowIndex) {
  return settings.clock
    && columnIndex >= 0
    && columnIndex < gridColumns
    && rowIndex >= 0
    && rowIndex < rows
    && clockMask[rowIndex * gridColumns + columnIndex] === 1;
}

function isClockEmphasisCell(columnIndex, rowIndex) {
  return settings.clock
    && columnIndex >= 0
    && columnIndex < gridColumns
    && rowIndex >= 0
    && rowIndex < rows
    && clockEmphasisMask[rowIndex * gridColumns + columnIndex] === 1;
}

function isClockHighlightCell(columnIndex, rowIndex) {
  return settings.clock
    && columnIndex >= 0
    && columnIndex < gridColumns
    && rowIndex >= 0
    && rowIndex < rows
    && clockHighlightMask[rowIndex * gridColumns + columnIndex] === 1;
}

function clearClockGridCells() {
  for (const column of activeColumns) {
    if (!column || !column.cells) {
      continue;
    }

    for (let rowIndex = 0; rowIndex < column.cells.length; rowIndex += 1) {
      if (column.cells[rowIndex] && column.cells[rowIndex].clockCell) {
        column.cells[rowIndex] = null;
      }
    }
  }
}

function clearAudioRain() {
  audioState.spectrumBins = Array(AUDIO_SPECTRUM_BINS).fill(0);
  audioState.spectrumBars = [];
  audioState.spectrumCells = 0;
  audioState.spectrumPeakCells = 0;
  audioState.colorBlend = 1;
  audioState.nextColorShuffleTick = 0;
  audioState.bass = 0;
  audioState.mid = 0;
  audioState.treble = 0;
  audioState.level = 0;
  audioState.peak = 0;
  audioState.inputPeak = 0;
  audioState.inputAverage = 0;
  audioState.inputGain = 1;

  for (const column of activeColumns) {
    if (!column || !column.cells) {
      continue;
    }

    column.streams = column.streams.filter((stream) => !stream.audioRain);
    for (let rowIndex = 0; rowIndex < column.cells.length; rowIndex += 1) {
      if (column.cells[rowIndex] && column.cells[rowIndex].audioCell) {
        column.cells[rowIndex] = null;
      }
    }
  }
}

function clockGlyphChar(columnIndex, rowIndex, salt) {
  return chooseStableChar(PATTERN_SEED ^ 0x61c10c, columnIndex, rowIndex, salt);
}

function clockRotateDelay(seed, rowIndex) {
  const clock = DEFAULT_PRESET.clock;
  return Math.floor(seededRange(
    seed ^ Math.imul(rowIndex + 37, 1597334677),
    clock.characterRotateMinTicks,
    clock.characterRotateMaxTicks + 1
  ));
}

function clockCellBaseAlpha(columnIndex, rowIndex) {
  const clock = DEFAULT_PRESET.clock;
  const floor = isClockEmphasisCell(columnIndex, rowIndex)
    ? clock.alphaFloor
    : clock.displayAlphaFloor;
  return floor * (settings.clockbrightness / 100);
}

function updateClockCell(column, rowIndex, cell) {
  if (!isClockMaskCell(column.index, rowIndex)) {
    column.cells[rowIndex] = null;
    return;
  }

  cell.age += 1;
  cell.justWritten = false;

  if (!Number.isFinite(cell.nextRotateTick) || cell.nextRotateTick <= logicalTick) {
    cell.salt = hashInt(cell.salt ^ Math.imul(logicalTick + rowIndex + 3, 1597334677));
    cell.char = clockGlyphChar(column.index, rowIndex, cell.salt);
    cell.stableChar = cell.char;
    cell.nextRotateTick = logicalTick + clockRotateDelay(cell.salt, rowIndex);
  }

  cell.life = Number.MAX_SAFE_INTEGER;
  cell.negative = false;
  cell.head = false;
  cell.headStreamId = null;
  cell.headPreviousGlowHead = false;
  cell.glowHead = isClockEmphasisCell(column.index, rowIndex);
  cell.paletteName = "clock";
  cell.rotator = true;
  cell.baseAlpha = clockCellBaseAlpha(column.index, rowIndex);
  cell.target = cell.baseAlpha;
  cell.alpha = cell.baseAlpha;
}

function ensureClockGridCells() {
  if (!settings.clock || clockCells.length === 0) {
    return;
  }

  for (const clockCell of clockCells) {
    const column = activeColumns[clockCell.columnIndex + 2];
    if (!column || column.index !== clockCell.columnIndex) {
      continue;
    }

    const rowIndex = clockCell.rowIndex;
    const emphasis = isClockEmphasisCell(column.index, rowIndex);
    const baseAlpha = clockCellBaseAlpha(column.index, rowIndex);
    const stableChar = clockGlyphChar(column.index, rowIndex, clockCell.salt);
    const current = column.cells[rowIndex];
    if (current && !current.negative) {
      const nextAlpha = current.clockCell ? baseAlpha : Math.max(current.baseAlpha || 0, baseAlpha);
      if (!current.clockCell) {
        current.char = stableChar;
        current.stableChar = stableChar;
        current.salt = clockCell.salt;
        current.nextRotateTick = logicalTick + clockRotateDelay(clockCell.salt, rowIndex);
      } else if (!Number.isFinite(current.nextRotateTick)) {
        current.nextRotateTick = logicalTick + clockRotateDelay(current.salt, rowIndex);
      }
      current.clockCell = true;
      current.staticCell = false;
      current.transient = false;
      current.paletteName = "clock";
      current.rotator = true;
      current.glowHead = emphasis;
      current.baseAlpha = nextAlpha;
      current.target = current.baseAlpha;
      current.alpha = current.baseAlpha;
      current.life = Number.MAX_SAFE_INTEGER;
      continue;
    }

    const salt = clockCell.salt;
    const char = clockGlyphChar(column.index, rowIndex, salt);
    column.cells[rowIndex] = {
      char,
      stableChar: char,
      salt,
      age: 0,
      life: Number.MAX_SAFE_INTEGER,
      alpha: baseAlpha,
      target: baseAlpha,
      baseAlpha,
      paletteName: "clock",
      rotator: true,
      nextRotateTick: logicalTick + clockRotateDelay(salt, rowIndex),
      streamId: `clock:${column.index}:${rowIndex}`,
      negative: false,
      head: false,
      headPreviousGlowHead: false,
      headStreamId: null,
      transient: false,
      staticCell: false,
      clockCell: true,
      glowHead: emphasis,
      justWritten: true
    };
  }
}

function drawClockFallbackGlyphs() {
  if (!settings.clock || clockCells.length === 0) {
    return;
  }

  const palette = paletteByName("clock");
  const clock = DEFAULT_PRESET.clock;
  const brightness = clamp(settings.brightness / 72, 0.45, 1.32);

  for (const clockCell of clockCells) {
    const delay = clockRotateDelay(clockCell.salt, clockCell.rowIndex);
    const phase = Math.floor(hashUnit(clockCell.salt ^ 0x49cd) * delay);
    const bucket = Math.floor((logicalTick + phase) / Math.max(1, delay));
    const char = clockGlyphChar(
      clockCell.columnIndex,
      clockCell.rowIndex,
      hashInt(clockCell.salt ^ Math.imul(bucket + 1, 1103515245))
    );
    const sprite = createGlyph(char, "head", palette);
    const x = (clockCell.columnIndex + 0.5) * cellWidth;
    const y = (clockCell.rowIndex + 0.5) * cellHeight;
    const visibility = Math.max(rowVisibility(clockCell.rowIndex), clock.visibilityFloor);

    ctx.globalAlpha = clamp(clock.fallbackAlpha * (settings.clockbrightness / 100) * visibility * brightness, 0, 1);
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
}

function drawGlyph(cell, column, rowIndex) {
  let styleName = "body";
  let alpha = cell.alpha;
  const glowIntensity = DEFAULT_PRESET.glowingTracers.intensity / 100;
  const clockMaskHit = isClockMaskCell(column.index, rowIndex);
  const clockEmphasisHit = isClockEmphasisCell(column.index, rowIndex);
  const clockHighlightHit = isClockHighlightCell(column.index, rowIndex);

  if (cell.head) {
    styleName = "head";
    alpha *= 1.38 + 0.12 * glowIntensity;
  } else if (cell.negative || alpha < 0.2) {
    styleName = "dim";
    alpha *= cell.negative ? 0.62 : 0.82;
  } else if (cell.audioCell && cell.glowHead) {
    styleName = "bright";
    alpha *= (cell.rotator ? 1.08 : 1.0) + 0.08 * glowIntensity;
  } else if (cell.glowHead) {
    styleName = "body";
    alpha *= cell.rotator ? 1.02 : 1.0;
  }

  if (clockEmphasisHit) {
    styleName = "head";
    alpha = Math.max(alpha * 1.34, DEFAULT_PRESET.clock.alphaFloor * (settings.clockbrightness / 100));
  } else if (clockMaskHit) {
    styleName = "bright";
    alpha = Math.max(alpha * 1.02, DEFAULT_PRESET.clock.displayAlphaFloor * (settings.clockbrightness / 100));
  } else if (clockHighlightHit) {
    styleName = cell.head ? "head" : "bright";
    alpha = Math.max(alpha * 1.12, DEFAULT_PRESET.clock.highlightAlphaFloor * (settings.clockbrightness / 100));
  }

  if (alpha <= 0.012) {
    return;
  }

  const palette = paletteForCell(cell, column, clockHighlightHit);
  const sprite = createGlyph(cell.char, styleName, palette);
  const x = column.x;
  const y = (rowIndex + 0.5) * cellHeight;
  let visibility = rowVisibility(rowIndex);
  if (clockMaskHit) {
    visibility = Math.max(visibility, DEFAULT_PRESET.clock.visibilityFloor);
  } else if (clockHighlightHit) {
    visibility = Math.max(visibility, 0.68);
  }
  if (!cell.negative && cell.head) {
    const rowUnit = rowIndex / Math.max(1, rows - 1);
    const upperFloor = 0.88;
    const lowerFloor = 0.64;
    const floorMix = clamp((0.68 - rowUnit) / 0.2, 0, 1);
    visibility = Math.max(visibility, lowerFloor * (1 - floorMix) + upperFloor * floorMix);
  }

  const renderBrightness = (clockMaskHit || clockHighlightHit)
    ? clamp(settings.clockbrightness / DEFAULT_PRESET.wallpaperProperties.clockbrightness, 0.55, 1.45)
    : clamp(settings.brightness / 72, 0.45, 1.32);
  ctx.globalAlpha = clamp(alpha * visibility * renderBrightness, 0, 1);
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

function audioSpectrumColumnIndex(geometry, barIndex) {
  if (geometry.barCount <= 1) {
    return geometry.startColumn;
  }

  return clampInt(
    Math.round(geometry.startColumn + (barIndex / (geometry.barCount - 1)) * (geometry.endColumn - geometry.startColumn)),
    geometry.startColumn,
    geometry.endColumn
  );
}

function drawAudioSpectrumGlyph(columnIndex, rowIndex, barIndex, styleName, alpha, paletteName) {
  if (
    isClockMaskCell(columnIndex, rowIndex)
    || isClockEmphasisCell(columnIndex, rowIndex)
    || isClockHighlightCell(columnIndex, rowIndex)
  ) {
    return;
  }

  const audio = DEFAULT_PRESET.audioResponsive;
  const baseSeed = hashInt(
    PATTERN_SEED
      ^ Math.imul(columnIndex + 37, 374761393)
      ^ Math.imul(rowIndex + 53, 668265263)
      ^ Math.imul(barIndex + 17, 2246822519)
  );
  const rotateChance = styleName === "head"
    ? audio.spectrumHeadRotatorChance
    : (styleName === "bright" ? audio.spectrumBrightRotatorChance : audio.spectrumRotatorChance);
  const rotates = hashUnit(baseSeed ^ 0x6c8e9cf5) < rotateChance;
  let salt = baseSeed;
  if (rotates) {
    const rotateTicks = clampInt(
      seededRange(baseSeed ^ 0x51f15e, audio.spectrumRotateMinTicks, audio.spectrumRotateMaxTicks + 1),
      audio.spectrumRotateMinTicks,
      audio.spectrumRotateMaxTicks
    );
    const phase = Math.floor(hashUnit(baseSeed ^ 0xb5297a4d) * rotateTicks);
    const bucket = Math.floor((logicalTick + phase) / rotateTicks);
    salt = hashInt(baseSeed ^ Math.imul(bucket + 1, 1103515245));
  }
  const char = chooseStableChar(PATTERN_SEED ^ 0xa9d10, columnIndex, rowIndex, salt);
  const palette = paletteByName(paletteName);
  const sprite = createGlyph(char, styleName, palette);
  const x = (columnIndex + 0.5) * cellWidth;
  const y = (rowIndex + 0.5) * cellHeight;
  const clearX = Math.floor(columnIndex * cellWidth);
  const clearY = Math.floor(rowIndex * cellHeight);
  const clearWidth = Math.ceil(cellWidth);
  const clearHeight = Math.ceil(cellHeight);

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#000";
  ctx.fillRect(clearX, clearY, clearWidth, clearHeight);
  ctx.globalAlpha = clamp(alpha * clamp(settings.audiobrightness / 100, 0.3, 1.6), 0, 1);
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

function drawAudioSpectrumOverlay() {
  if (!settings.audioenabled || audioState.spectrumBars.length === 0 || gridColumns <= 0 || rows <= 0) {
    return;
  }

  const geometry = audioSpectrumGeometry();
  const audio = DEFAULT_PRESET.audioResponsive;
  const intensity = audioResponseIntensity();
  if (intensity <= 0) {
    return;
  }

  for (let barIndex = 0; barIndex < geometry.barCount; barIndex += 1) {
    const bar = audioState.spectrumBars[barIndex];
    if (!bar) {
      continue;
    }

    const barRows = clampInt(
      Number.isFinite(bar.drawRows) ? bar.drawRows : Math.round(bar.value * geometry.maxRows),
      0,
      geometry.maxRows
    );
    const columnIndex = audioSpectrumColumnIndex(geometry, barIndex);
    const basePaletteName = bar.paletteName || audioSpectrumPaletteName(
      barIndex,
      geometry.barCount,
      Number.isFinite(bar.colorValue) ? bar.colorValue : bar.value,
      Number.isInteger(bar.colorBand) ? bar.colorBand : null
    );
    const alphaBase = audio.spectrumMinAlpha + (audio.spectrumMaxAlpha - audio.spectrumMinAlpha) * 0.78;
    const drawBody = settings.audiocolormode !== "caps_only";

    for (let offset = 0; drawBody && offset < barRows; offset += 1) {
      const rowIndex = audioSpectrumRowIndex(geometry, offset);
      if (rowIndex < 0 || rowIndex >= rows) {
        break;
      }

      const styleName = "body";
      const depth = geometry.maxRows <= 1 ? 1 : offset / (geometry.maxRows - 1);
      const alpha = alphaBase * (0.72 + depth * 0.26);
      const paletteName = settings.audiocolormode === "level_layers"
        ? audioSpectrumPaletteName(
          barIndex,
          geometry.barCount,
          Number.isFinite(bar.colorValue) ? bar.colorValue : bar.value,
          Number.isInteger(bar.colorBand) ? bar.colorBand : null,
          offset,
          geometry.maxRows
        )
        : basePaletteName;

      drawAudioSpectrumGlyph(columnIndex, rowIndex, barIndex, styleName, alpha, paletteName);
    }

    if (drawBody && barRows > 0 && audio.spectrumEdgeBlendRows > 0) {
      const edgeRows = Math.min(audio.spectrumEdgeBlendRows, geometry.maxRows - barRows);
      for (let edgeOffset = 0; edgeOffset < edgeRows; edgeOffset += 1) {
        const rowOffset = barRows + edgeOffset;
        const rowIndex = audioSpectrumRowIndex(geometry, rowOffset);
        if (rowIndex < 0 || rowIndex >= rows) {
          break;
        }

        const edgeFade = 1 - (edgeOffset / Math.max(1, edgeRows));
        const paletteName = settings.audiocolormode === "level_layers"
          ? audioSpectrumPaletteName(
            barIndex,
            geometry.barCount,
            Number.isFinite(bar.colorValue) ? bar.colorValue : bar.value,
            Number.isInteger(bar.colorBand) ? bar.colorBand : null,
            rowOffset,
            geometry.maxRows
          )
          : basePaletteName;

        drawAudioSpectrumGlyph(
          columnIndex,
          rowIndex,
          barIndex,
          "body",
          alphaBase * audio.spectrumEdgeBlendAlpha * edgeFade,
          paletteName
        );
      }
    }

    const peakRows = bar.peakVisible
      ? clampInt(bar.peakDrawRows || Math.max(1, Math.round(bar.peakRows)), 1, geometry.maxRows)
      : 0;
    if (peakRows >= audio.spectrumPeakMinRows) {
      const peakRow = audioSpectrumRowIndex(geometry, peakRows - 1);
      if (peakRow >= 0 && peakRow < rows) {
        drawAudioSpectrumGlyph(columnIndex, peakRow, barIndex, "bright", 1, "audioPeakCap");
      }
    }
  }
}

function render(now = performance.now()) {
  renderSeconds = now / 1000;
  updateClockMask();
  ensureClockGridCells();
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

  drawAudioSpectrumOverlay();

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

function isTouchViewport() {
  const touchPoints = Number(navigator.maxTouchPoints || 0);
  const coarsePointer = typeof window.matchMedia === "function"
    && window.matchMedia("(pointer: coarse)").matches;
  return touchPoints > 0 || coarsePointer;
}

function resolveLayoutMode(viewWidth, viewHeight) {
  if (layoutModeOverride) {
    return layoutModeOverride;
  }

  if (!isTouchViewport()) {
    return "desktop";
  }

  const shortest = Math.min(viewWidth, viewHeight);
  const longest = Math.max(viewWidth, viewHeight);

  if (shortest <= 540 || longest <= 960) {
    return "phone";
  }

  if (shortest <= 1180 && longest <= 1600) {
    return "tablet";
  }

  return "desktop";
}

function resolveLayoutMetrics(viewWidth, viewHeight) {
  const layout = DEFAULT_PRESET.layout;
  const orientation = viewWidth >= viewHeight ? "landscape" : "portrait";
  const mode = resolveLayoutMode(viewWidth, viewHeight);
  const characterSizeScale = clamp(settings.glyphscale / 100, 0.75, 1.3);
  const characterSpacingScale = clamp(settings.characterspacing / 100, 0.4, 2.4);
  const columnGapPx = layout.columnGapPx * characterSpacingScale;
  const rowGapPx = layout.rowGapPx * characterSpacingScale;

  if (mode === "desktop") {
    const baseColumns = layout.visibleColumns || Math.round(layout.referenceWidth / layout.columnPitchPx);
    const baseRows = layout.visibleRows || Math.round(layout.referenceHeight / layout.rowPitchPx);
    const columns = clampInt(baseColumns / characterSizeScale, 80, 220);
    const rowCount = clampInt(baseRows / characterSizeScale, 36, 104);

    return {
      mode,
      orientation,
      columns,
      rows: rowCount,
      columnGapPx,
      rowGapPx,
      fontInsetPx: layout.fontInsetPx,
      fontOversizePx: layout.fontOversizePx,
      glyphAspectRatio: layout.glyphAspectRatio,
      glyphScale: 1,
      dprLimit: DPR_LIMIT,
      minFontSize: 9,
      maxFontSize: 72,
      minGlyphScale: 0.72,
      maxGlyphScale: 1.35,
      characterSizeScale,
      characterSpacingScale
    };
  }

  const profile = layout.responsive[mode][orientation];
  const columns = clampInt(viewWidth / (profile.columnPitchPx * characterSizeScale), profile.minColumns, profile.maxColumns);
  const rowCount = clampInt(viewHeight / (profile.rowPitchPx * characterSizeScale), profile.minRows, profile.maxRows);

  return {
    mode,
    orientation,
    columns,
    rows: rowCount,
    columnGapPx,
    rowGapPx,
    fontInsetPx: layout.fontInsetPx,
    fontOversizePx: profile.fontOversizePx,
    glyphAspectRatio: layout.glyphAspectRatio,
    glyphScale: profile.glyphScale,
    dprLimit: profile.dprLimit,
    minFontSize: 8,
    maxFontSize: 42,
    minGlyphScale: 0.68,
    maxGlyphScale: 1.22,
    characterSizeScale,
    characterSpacingScale
  };
}

function resize() {
  if (palettes.length === 0) {
    buildPalettes();
  }

  width = window.innerWidth;
  height = window.innerHeight;
  const layout = resolveLayoutMetrics(width, height);
  activeLayoutProfile = layout;
  dpr = Math.min(window.devicePixelRatio || 1, layout.dprLimit);
  cellHeight = height / layout.rows;
  cellWidth = width / layout.columns;
  rows = layout.rows;
  const glyphAdjust = layout.glyphScale;
  fontSize = fitFontSizeForPitch(
    clamp(Math.round((cellHeight - layout.rowGapPx - layout.fontInsetPx + layout.fontOversizePx) * glyphAdjust), layout.minFontSize, layout.maxFontSize),
    Math.max(1, cellWidth - layout.columnGapPx)
  );
  const glyphBounds = measureMedianGlyphBounds(fontSize);
  glyphScaleY = clamp(((cellHeight - layout.rowGapPx - layout.fontInsetPx) * glyphAdjust) / glyphBounds.height, layout.minGlyphScale, layout.maxGlyphScale);
  const fittedGlyphScaleX = ((cellWidth - layout.columnGapPx - layout.fontInsetPx) * glyphAdjust) / glyphBounds.width;
  const aspectGlyphScaleX = (glyphScaleY * (layout.glyphAspectRatio || 0.8) * glyphBounds.height) / glyphBounds.width;
  glyphScaleX = clamp(Math.min(fittedGlyphScaleX, aspectGlyphScaleX), layout.minGlyphScale, layout.maxGlyphScale);
  gridColumns = layout.columns;

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
  stabilizeStartupActivity();
  render(performance.now());
}

function collectMatrixRainState() {
  const metrics = activeColumns.reduce((summary, column) => {
    let columnCells = 0;
    let columnHeads = 0;
    let columnBright = 0;
    let columnRotators = 0;
    let columnClockCells = 0;
    let columnAudioCells = 0;

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
      if (cell.clockCell) {
        columnClockCells += 1;
        summary.clockGridCells += 1;
      }
      if (cell.audioCell) {
        columnAudioCells += 1;
        summary.audioRainCells += 1;
        if (cell.audioBand && Object.prototype.hasOwnProperty.call(summary.audioBandCells, cell.audioBand)) {
          summary.audioBandCells[cell.audioBand] += 1;
        }
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
    if (columnClockCells > 0) {
      summary.columnsWithClockCells += 1;
    }
    if (columnAudioCells > 0) {
      summary.columnsWithAudioRain += 1;
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
    clockGridCells: 0,
    columnsWithClockCells: 0,
    audioRainCells: 0,
    audioBandCells: {
      bass: 0,
      mid: 0,
      treble: 0
    },
    columnsWithAudioRain: 0,
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
  const spectrumGeometry = audioSpectrumGeometry();

  return {
    rows,
    gridColumns,
    cellWidth,
    cellHeight,
    fontSize,
    glyphScaleX,
    glyphScaleY,
    dpr,
    font: {
      style: settings.fontstyle,
      styleOverride: FONT_STYLE_OVERRIDE,
      family: activeFontFamily,
      glyphCount: CHAR_LIST.length
    },
    layoutProfile: activeLayoutProfile,
    layout: DEFAULT_PRESET.layout,
    clock: {
      enabled: settings.clock,
      override: CLOCK_OVERRIDE,
      mask: "5x7-dot-matrix-clock",
      text: clockText,
      activeCells: clockMask.reduce((sum, value) => sum + value, 0),
      emphasisCells: clockEmphasisMask.reduce((sum, value) => sum + value, 0),
      highlightCells: clockHighlightMask.reduce((sum, value) => sum + value, 0),
      fallbackCells: clockCells.length,
      materializedCells: metrics.clockGridCells
    },
    audio: {
      enabled: settings.audioenabled,
      override: AUDIO_OVERRIDE,
      debug: audioDebugEnabled,
      debugLevel: Number(audioDebugLevel().toFixed(3)),
      inputSource: audioDebugEnabled
        ? "debug"
        : (typeof window.wallpaperRegisterAudioListener === "function" ? "wallpaper-engine" : "none"),
      colorMode: settings.audiocolormode,
      response: settings.audioresponse,
      intensity: settings.audiointensity,
      brightness: settings.audiobrightness,
      sensitivity: settings.audiosensitivity,
      level: Number(audioState.level.toFixed(4)),
      peak: Number(audioState.peak.toFixed(4)),
      bass: Number(audioState.bass.toFixed(4)),
      mid: Number(audioState.mid.toFixed(4)),
      treble: Number(audioState.treble.toFixed(4)),
      inputPeak: Number(audioState.inputPeak.toFixed(5)),
      inputAverage: Number(audioState.inputAverage.toFixed(5)),
      inputGain: Number(audioState.inputGain.toFixed(2)),
      lastInputAgeMs: audioState.lastInputTime > 0
        ? Math.max(0, Math.round(performance.now() - audioState.lastInputTime))
        : null,
      callbackCount: audioState.audioCallbackCount,
      lastCallbackAgeMs: audioState.lastAudioCallbackTime > 0
        ? Math.max(0, Math.round(performance.now() - audioState.lastAudioCallbackTime))
        : null,
      listenerRegisterCount: audioState.audioListenerRegisterCount,
      listenerRegisterReason: audioState.audioListenerRegisterReason,
      audioRainCells: audioState.spectrumCells,
      spectrumBars: spectrumGeometry.barCount,
      spectrumTopRow: spectrumGeometry.topRow,
      spectrumBottomRow: spectrumGeometry.bottomRow,
      spectrumMaxRows: spectrumGeometry.maxRows,
      spectrumPeakCells: audioState.spectrumPeakCells,
      spectrumMotion: "cava-integral-falloff",
      spectrumLayout: "continuous",
      spectrumReverse: Boolean(settings.audiospectrumreverse),
      spectrumColorBlend: Number(audioState.colorBlend.toFixed(3)),
      nextColorShuffleCooldown: Math.max(0, audioState.nextColorShuffleTick - logicalTick),
      spectrumLowBars: audioState.spectrumBars.slice(0, 16).map((bar, index) => ({
        index,
        value: Number((bar.value || 0).toFixed(4)),
        rawValue: Number((bar.rawValue || 0).toFixed(4)),
        rows: Number.isFinite(bar.drawRows) ? bar.drawRows : 0,
        rawRows: Number.isFinite(bar.displayRows) ? bar.displayRows : 0,
        peak: Number((bar.peakRows || 0).toFixed(2)),
        peakRows: Number.isFinite(bar.peakDrawRows) ? bar.peakDrawRows : 0,
        peakVisible: Boolean(bar.peakVisible),
        peakVisibleHold: Number.isFinite(bar.peakVisibleHold) ? Number(bar.peakVisibleHold.toFixed(3)) : 0,
        rowDropHold: Number.isFinite(bar.rowDropHold) ? Number(bar.rowDropHold.toFixed(3)) : 0,
        cavaRows: Number.isFinite(bar.cavaRows) ? Number(bar.cavaRows.toFixed(2)) : 0,
        cavaMemoryRows: Number.isFinite(bar.cavaMemoryRows) ? Number(bar.cavaMemoryRows.toFixed(2)) : 0,
        cavaFall: Number.isFinite(bar.cavaFall) ? Number(bar.cavaFall.toFixed(3)) : 0,
        peakRowDropHold: Number.isFinite(bar.peakRowDropHold) ? Number(bar.peakRowDropHold.toFixed(3)) : 0,
        tailHold: Number.isFinite(bar.tailHold) ? Number(bar.tailHold.toFixed(3)) : 0,
        colorBand: Number.isInteger(bar.colorBand) ? bar.colorBand : 0,
        paletteName: bar.paletteName || "",
        paletteHoldTicks: Number.isFinite(bar.paletteHoldTicks) ? bar.paletteHoldTicks : 0,
        colorHoldTicks: Number.isFinite(bar.colorHoldTicks) ? bar.colorHoldTicks : 0,
        visibleHoldTicks: Number.isFinite(bar.visibleHoldTicks) ? bar.visibleHoldTicks : 0
      })),
      spectrumColumns: {
        start: spectrumGeometry.startColumn,
        end: spectrumGeometry.endColumn
      }
    },
    speedRowsPerSecond: DEFAULT_PRESET.speedRowsPerSecond,
    settingsSpeed: settings.speed,
    characterSize: settings.glyphscale,
    characterSpacing: settings.characterspacing,
    rainColor: colorToHex(settings.color),
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
          audioBand: stream.audioBand || null,
          paletteName: stream.paletteName,
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

function propertyValue(value) {
  return { value };
}

function applyPreviewProperties(properties) {
  window.wallpaperPropertyListener.applyUserProperties(properties);
}

function setPreviewLayoutMode(value) {
  layoutModeOverride = normalizeLayoutMode(value);
  restartRain();
}

function controlText(key) {
  const table = CONTROL_TEXT[CONTROL_LANGUAGE] || CONTROL_TEXT["en-us"];
  return table[key] || CONTROL_TEXT["en-us"][key] || key;
}

function controlsUrlValue(value) {
  return value === true ? "1" : value === false ? "0" : String(value);
}

function buildControlsUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("controls", "1");
  url.searchParams.set("lang", CONTROL_LANGUAGE);
  url.searchParams.set("density", controlsUrlValue(settings.density));
  url.searchParams.set("speed", controlsUrlValue(settings.speed));
  url.searchParams.set("brightness", controlsUrlValue(settings.brightness));
  url.searchParams.set("glyphscale", controlsUrlValue(settings.glyphscale));
  url.searchParams.set("characterspacing", controlsUrlValue(settings.characterspacing));
  url.searchParams.set("glow", controlsUrlValue(settings.glow));
  url.searchParams.set("color", colorToHex(settings.color));
  url.searchParams.set("audio", controlsUrlValue(settings.audioenabled));
  url.searchParams.set("audioresponse", controlsUrlValue(settings.audioresponse));
  url.searchParams.set("audiobrightness", controlsUrlValue(settings.audiobrightness));
  url.searchParams.set("audiocolormode", settings.audiocolormode);
  url.searchParams.set("audiospectrumreverse", controlsUrlValue(settings.audiospectrumreverse));
  url.searchParams.set("audiodebug", controlsUrlValue(audioDebugEnabled));
  url.searchParams.set("audiodebuglevel", controlsUrlValue(audioDebugLevel()));
  url.searchParams.set("clock", controlsUrlValue(settings.clock));
  url.searchParams.set("clockbrightness", controlsUrlValue(settings.clockbrightness));
  url.searchParams.set("clockcolor", colorToHex(settings.clockcolor));
  url.searchParams.set("fontstyle", settings.fontstyle);

  if (layoutModeOverride) {
    url.searchParams.set("layout", layoutModeOverride);
  } else {
    url.searchParams.delete("layout");
  }

  return url.toString();
}

function createControlsField(labelText, input) {
  const label = document.createElement("label");
  label.className = "matrix-controls-field";
  const text = document.createElement("span");
  text.textContent = labelText;
  label.append(text, input);
  return label;
}

function createControlsToggle(labelText, checked, onChange) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  return createControlsField(labelText, input);
}

function createControlsRange(labelText, value, min, max, onChange) {
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.value = String(value);
  const valueText = document.createElement("output");
  valueText.value = String(value);
  input.addEventListener("input", () => {
    valueText.value = input.value;
    onChange(Number(input.value));
  });

  const wrap = document.createElement("div");
  wrap.className = "matrix-controls-range";
  wrap.append(input, valueText);
  return createControlsField(labelText, wrap);
}

function createControlsSelect(labelText, value, options, onChange) {
  const select = document.createElement("select");
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.appendChild(element);
  }
  select.value = value;
  select.addEventListener("change", () => onChange(select.value));
  return createControlsField(labelText, select);
}

function createControlsColor(labelText, value, onChange) {
  const input = document.createElement("input");
  input.type = "color";
  input.value = colorToHex(value);
  input.addEventListener("input", () => {
    const color = parseQueryColor(input.value);
    if (color) {
      onChange(color);
    }
  });
  return createControlsField(labelText, input);
}

function createControlsDetails(titleText, children, open = false) {
  const details = document.createElement("details");
  details.className = "matrix-controls-details";
  details.open = open;
  const summary = document.createElement("summary");
  summary.textContent = titleText;
  const content = document.createElement("div");
  content.className = "matrix-controls-details-body";
  content.append(...children);
  details.append(summary, content);
  return details;
}

function createControlsGroup(titleText, children) {
  const group = document.createElement("section");
  group.className = "matrix-controls-group";
  const title = document.createElement("h2");
  title.textContent = titleText;
  const content = document.createElement("div");
  content.className = "matrix-controls-group-body";
  content.append(...children);
  group.append(title, content);
  return group;
}

function setControlsStatus(panel, message) {
  const status = panel.querySelector(".matrix-controls-status");
  if (status) {
    status.textContent = message;
  }
}

function updateControlsStats(panel) {
  const stats = panel.querySelector(".matrix-controls-stats");
  if (!stats) {
    return;
  }

  const state = collectMatrixRainState();
  stats.textContent = [
    `${controlText("audioState")} ${state.audio.enabled ? controlText("on") : controlText("off")} ${controlText("level")} ${state.audio.level}`,
    `${state.audio.spectrumMotion} ${state.audio.spectrumLayout} cells ${state.audio.audioRainCells}`,
    `${controlText("maxRows")} ${state.audio.spectrumMaxRows}`,
    `${state.gridColumns} x ${state.rows}`,
    state.layoutProfile ? state.layoutProfile.mode : controlText("layoutLabel")
  ].join(" / ");
}

function createControlsButton(text, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function initializeControlsPanel() {
  if (!CONTROLS_ENABLED) {
    return;
  }

  document.body.classList.add("matrix-controls-enabled");

  const panel = document.createElement("section");
  panel.id = "matrix-controls";
  panel.className = "matrix-controls";

  const header = document.createElement("div");
  header.className = "matrix-controls-header";
  const title = document.createElement("strong");
  title.textContent = controlText("title");
  const collapseButton = createControlsButton(controlText("hide"), () => {
    panel.classList.toggle("is-collapsed");
    collapseButton.textContent = panel.classList.contains("is-collapsed") ? controlText("show") : controlText("hide");
  });
  header.append(title, collapseButton);

  const body = document.createElement("div");
  body.className = "matrix-controls-body";

  body.append(
    createControlsGroup(controlText("base"), [
      createControlsSelect(controlText("rainFont"), settings.fontstyle, [
        { label: controlText("fontTrilogy"), value: "trilogy" },
        { label: controlText("fontResurrections"), value: "resurrections" }
      ], (value) => {
        applyPreviewProperties({ fontstyle: propertyValue(value) });
      }),
      createControlsDetails(controlText("advanced"), [
        createControlsRange(controlText("density"), settings.density, 30, 95, (value) => {
          applyPreviewProperties({ density: propertyValue(value) });
        }),
        createControlsRange(controlText("speed"), settings.speed, 20, 100, (value) => {
          applyPreviewProperties({ speed: propertyValue(value) });
        }),
        createControlsRange(controlText("brightness"), settings.brightness, 35, 100, (value) => {
          applyPreviewProperties({ brightness: propertyValue(value) });
        }),
        createControlsRange(controlText("characterSize"), settings.glyphscale, 75, 130, (value) => {
          applyPreviewProperties({ glyphscale: propertyValue(value) });
        }),
        createControlsRange(controlText("characterSpacing"), settings.characterspacing, 40, 240, (value) => {
          applyPreviewProperties({ characterspacing: propertyValue(value) });
        }),
        createControlsToggle(controlText("glow"), settings.glow, (value) => {
          applyPreviewProperties({ glow: propertyValue(value) });
        }),
        createControlsColor(controlText("color"), settings.color, (value) => {
          applyPreviewProperties({ color: propertyValue(colorToWallpaperValue(value)) });
        }),
        createControlsSelect(controlText("layout"), layoutModeOverride || "auto", [
          { label: controlText("layoutAuto"), value: "auto" },
          { label: controlText("layoutDesktop"), value: "desktop" },
          { label: controlText("layoutTablet"), value: "tablet" },
          { label: controlText("layoutPhone"), value: "phone" }
        ], (value) => {
          setPreviewLayoutMode(value === "auto" ? null : value);
        })
      ])
    ]),
    createControlsGroup(controlText("clockGroup"), [
      createControlsToggle(controlText("clock"), settings.clock, (value) => {
        applyPreviewProperties({ clock: propertyValue(value) });
      }),
      createControlsRange(controlText("clockBrightness"), settings.clockbrightness, 60, 160, (value) => {
        applyPreviewProperties({ clockbrightness: propertyValue(value) });
      }),
      createControlsColor(controlText("clockColor"), settings.clockcolor, (value) => {
        applyPreviewProperties({ clockcolor: propertyValue(colorToWallpaperValue(value)) });
      })
    ]),
    createControlsGroup(controlText("audioGroup"), [
      createControlsToggle(controlText("audioSpectrum"), settings.audioenabled, (value) => {
        if (value && CONTROLS_ENABLED && !WALLPAPER_AUDIO_API_AVAILABLE) {
          audioDebugEnabled = true;
        }
        applyPreviewProperties({ audioenabled: propertyValue(value) });
        if (value) {
          refreshAppearance();
        }
      }),
      createControlsDetails(controlText("advanced"), [
        createControlsToggle(controlText("audioDebug"), audioDebugEnabled, (value) => {
          audioDebugEnabled = value;
          if (!value) {
            applyAudioLevels(0, 0, 0, false);
            clearAudioRain();
          }
          refreshAppearance();
        }),
        createControlsRange(controlText("audioResponse"), settings.audioresponse, 0, 100, (value) => {
          applyPreviewProperties({ audioresponse: propertyValue(value) });
        }),
        createControlsRange(controlText("audioBrightness"), settings.audiobrightness, 30, 160, (value) => {
          applyPreviewProperties({ audiobrightness: propertyValue(value) });
        }),
        createControlsSelect(controlText("audioColor"), settings.audiocolormode, [
          { label: controlText("audioLevelLayers"), value: "level_layers" },
          { label: controlText("audioFrequencyGradient"), value: "frequency_gradient" },
          { label: controlText("audioNeonBlocks"), value: "neon_blocks" },
          { label: controlText("audioMatrixTint"), value: "matrix_tint" },
          { label: controlText("audioCapsOnly"), value: "caps_only" }
        ], (value) => {
          applyPreviewProperties({ audiocolormode: propertyValue(value) });
        }),
        createControlsToggle(controlText("audioSpectrumReverse"), settings.audiospectrumreverse, (value) => {
          applyPreviewProperties({ audiospectrumreverse: propertyValue(value) });
        })
      ])
    ])
  );

  const actions = document.createElement("div");
  actions.className = "matrix-controls-actions";
  actions.append(
    createControlsButton(controlText("copyLink"), () => {
      const url = buildControlsUrl();
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(url)
          .then(() => setControlsStatus(panel, controlText("linkCopied")))
          .catch(() => setControlsStatus(panel, url));
      } else {
        setControlsStatus(panel, url);
      }
    }),
    createControlsButton(controlText("resetPreview"), () => {
      window.location.href = `${window.location.pathname}?controls=1&lang=${CONTROL_LANGUAGE}`;
    })
  );

  const stats = document.createElement("div");
  stats.className = "matrix-controls-stats";
  const status = document.createElement("div");
  status.className = "matrix-controls-status";
  status.textContent = controlText("hiddenStatus");

  body.append(actions, stats, status);
  panel.append(header, body);
  document.body.appendChild(panel);
  updateControlsStats(panel);
  window.setInterval(() => updateControlsStats(panel), 600);
}

function start() {
  buildPalettes();
  started = true;
  resize();
  lastFrameTime = performance.now();
  fpsRemainder = 0;
  cancelAnimationFrame(animationFrame);
  initializeControlsPanel();
  animationFrame = requestAnimationFrame(frame);
}

window.wallpaperPropertyListener = {
  applyUserProperties(properties) {
    let needsRestart = false;
    let needsAppearanceRefresh = false;
    let needsFontLoad = false;

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

    if (Object.prototype.hasOwnProperty.call(properties, "characterspacing")) {
      settings.characterspacing = clamp(Number(properties.characterspacing.value) || DEFAULT_PRESET.wallpaperProperties.characterspacing, 40, 240);
      needsRestart = true;
    }

    if (Object.prototype.hasOwnProperty.call(properties, "fontstyle")) {
      const nextFontStyle = (CONTROLS_ENABLED ? null : FONT_STYLE_OVERRIDE)
        ?? normalizeFontStyle(String(properties.fontstyle.value))
        ?? DEFAULT_PRESET.wallpaperProperties.fontstyle;
      if (nextFontStyle !== activeFontStyle) {
        setActiveFontStyle(nextFontStyle);
        clockMaskKey = "";
        clearClockGridCells();
        needsRestart = true;
        needsFontLoad = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(properties, "glow")) {
      settings.glow = Boolean(properties.glow.value);
      needsAppearanceRefresh = true;
    }

    if (Object.prototype.hasOwnProperty.call(properties, "clock")) {
      settings.clock = (CONTROLS_ENABLED ? null : CLOCK_OVERRIDE) ?? Boolean(properties.clock.value);
      clockMaskKey = "";
      needsAppearanceRefresh = true;
    }

    if (Object.prototype.hasOwnProperty.call(properties, "clockbrightness")) {
      settings.clockbrightness = clamp(Number(properties.clockbrightness.value) || DEFAULT_PRESET.wallpaperProperties.clockbrightness, 60, 160);
      needsAppearanceRefresh = true;
    }

    if (Object.prototype.hasOwnProperty.call(properties, "clockcolor")) {
      settings.clockcolor = parseWallpaperColor(properties.clockcolor.value, DEFAULT_PRESET.clockColor);
      needsAppearanceRefresh = true;
    }

    if (Object.prototype.hasOwnProperty.call(properties, "audioenabled")) {
      const nextAudioEnabled = (CONTROLS_ENABLED ? null : AUDIO_OVERRIDE) ?? Boolean(properties.audioenabled.value);
      if (settings.audioenabled && !nextAudioEnabled) {
        clearAudioRain();
        needsAppearanceRefresh = true;
      }
      settings.audioenabled = nextAudioEnabled;
      needsAppearanceRefresh = true;
    }

    if (Object.prototype.hasOwnProperty.call(properties, "audioresponse")) {
      setAudioResponse(properties.audioresponse.value);
    } else if (
      Object.prototype.hasOwnProperty.call(properties, "audiointensity")
      || Object.prototype.hasOwnProperty.call(properties, "audiosensitivity")
    ) {
      const nextAudioIntensity = Object.prototype.hasOwnProperty.call(properties, "audiointensity")
        ? Number(properties.audiointensity.value)
        : NaN;
      const nextAudioSensitivity = Object.prototype.hasOwnProperty.call(properties, "audiosensitivity")
        ? Number(properties.audiosensitivity.value)
        : NaN;
      setAudioResponse(
        responseFromLegacyAudio(nextAudioIntensity, nextAudioSensitivity)
          ?? DEFAULT_PRESET.wallpaperProperties.audioresponse
      );
    }

    if (Object.prototype.hasOwnProperty.call(properties, "audiobrightness")) {
      const nextAudioBrightness = Number(properties.audiobrightness.value);
      settings.audiobrightness = clamp(
        Number.isFinite(nextAudioBrightness) ? nextAudioBrightness : DEFAULT_PRESET.wallpaperProperties.audiobrightness,
        30,
        160
      );
      needsAppearanceRefresh = true;
    }

    if (Object.prototype.hasOwnProperty.call(properties, "audiocolormode")) {
      settings.audiocolormode = (CONTROLS_ENABLED ? null : AUDIO_COLOR_MODE_OVERRIDE)
        ?? normalizeAudioColorMode(String(properties.audiocolormode.value))
        ?? DEFAULT_PRESET.wallpaperProperties.audiocolormode;
      clearAudioRain();
    }

    if (Object.prototype.hasOwnProperty.call(properties, "audiospectrumreverse")) {
      settings.audiospectrumreverse = (CONTROLS_ENABLED ? null : AUDIO_SPECTRUM_REVERSE_OVERRIDE)
        ?? Boolean(properties.audiospectrumreverse.value);
      clearAudioRain();
      needsAppearanceRefresh = true;
    }

    if (Object.prototype.hasOwnProperty.call(properties, "color")) {
      settings.color = parseWallpaperColor(properties.color.value);
      needsAppearanceRefresh = true;
    }

    const finishUpdates = () => {
      if (needsRestart) {
        buildPalettes();
        restartRain();
      } else if (needsAppearanceRefresh) {
        refreshAppearance();
      }
    };

    if (needsFontLoad) {
      loadActiveFont().then(finishUpdates);
    } else {
      finishUpdates();
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

function resetWallpaperAudioInput() {
  audioState.inputPeak = 0;
  audioState.inputAverage = 0;
  audioState.inputGain = 1;
  applyAudioLevels(0, 0, 0, false);
  applyAudioSpectrumBins(null);
  updateAudioSpectrumBars();
}

function registerWallpaperAudioListener(reason = "manual") {
  if (typeof window.wallpaperRegisterAudioListener !== "function") {
    return false;
  }

  const now = performance.now();
  if (
    reason !== "initial"
    && now - audioState.lastAudioListenerRegisterTime < AUDIO_LISTENER_RECOVERY_COOLDOWN_MS
  ) {
    return false;
  }

  try {
    window.wallpaperRegisterAudioListener(wallpaperAudioListener);
    audioState.lastAudioListenerRegisterTime = now;
    audioState.audioListenerRegisterCount += 1;
    audioState.audioListenerRegisterReason = reason;
    return true;
  } catch (error) {
    window.__matrixRuntimeErrors.push({
      message: error && error.message ? error.message : String(error),
      source: "wallpaperRegisterAudioListener"
    });
    return false;
  }
}

function clearWallpaperAudioRecoveryTimers() {
  for (const timerId of audioListenerRecoveryTimers) {
    window.clearTimeout(timerId);
  }
  audioListenerRecoveryTimers = [];
}

function scheduleWallpaperAudioListenerRecovery(reason) {
  if (!settings.audioenabled || audioDebugEnabled || typeof window.wallpaperRegisterAudioListener !== "function") {
    return;
  }

  const callbackAgeMs = audioState.lastAudioCallbackTime > 0
    ? performance.now() - audioState.lastAudioCallbackTime
    : Infinity;
  if ((reason === "focus" || reason === "pageshow") && audioState.lastAudioCallbackTime === 0) {
    return;
  }
  if (reason !== "devicechange" && reason !== "stale-callback" && callbackAgeMs < 1000) {
    return;
  }

  clearWallpaperAudioRecoveryTimers();
  resetWallpaperAudioInput();
  audioListenerRecoveryTimers = AUDIO_LISTENER_RECOVERY_DELAYS_MS.map((delayMs) => (
    window.setTimeout(() => {
      registerWallpaperAudioListener(reason);
    }, delayMs)
  ));
}

function installWallpaperAudioDeviceRecovery() {
  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices || typeof mediaDevices.addEventListener !== "function") {
    return;
  }

  try {
    mediaDevices.addEventListener("devicechange", () => {
      scheduleWallpaperAudioListenerRecovery("devicechange");
    });
  } catch (error) {
    window.__matrixRuntimeErrors.push({
      message: error && error.message ? error.message : String(error),
      source: "mediaDevices.devicechange"
    });
  }
}

document.addEventListener("visibilitychange", () => {
  running = !document.hidden;

  if (running) {
    lastFrameTime = performance.now();
    fpsRemainder = 0;
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(frame);
    scheduleWallpaperAudioListenerRecovery("visibilitychange");
  } else {
    cancelAnimationFrame(animationFrame);
  }
});

window.addEventListener("focus", () => {
  scheduleWallpaperAudioListenerRecovery("focus");
});

window.addEventListener("pageshow", () => {
  scheduleWallpaperAudioListenerRecovery("pageshow");
});

function wallpaperAudioListener(audioArray) {
  audioState.lastAudioCallbackTime = performance.now();
  audioState.audioCallbackCount += 1;
  updateAudioFromArray(audioArray);
}

window.__matrixWallpaperAudioListener = wallpaperAudioListener;

registerWallpaperAudioListener("initial");
installWallpaperAudioDeviceRecovery();

setActiveFontStyle(settings.fontstyle);

const fontReady = loadActiveFont();

Promise.race([
  fontReady,
  new Promise((resolve) => {
    window.setTimeout(resolve, 800);
  })
]).then(start);
