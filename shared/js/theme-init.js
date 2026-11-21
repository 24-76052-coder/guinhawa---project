/* ==========================================================================
   GUINHAWA — appearance engine
   Loaded synchronously in <head> so the saved combination is applied before
   the first paint. Every colour in the interface comes from these CSS custom
   properties, so pages never hardcode a palette of their own.

   The library below is the single source of truth for the Appearance page:
   30 professionally paired combinations, each with a Light and a Dark
   palette. There is no colour picker and no per-colour customisation — an
   administrator picks one combination and the whole system follows.
   ========================================================================== */

(function (window, document) {
  "use strict";

  var KEY = "guinhawa-appearance";
  var LEGACY_THEME_KEY = "guinhawa-theme";

  /* ------------------------------- Options ------------------------------- */

  var CATEGORIES = [
    { id: "green", name: "Green" },
    { id: "blue", name: "Blue" },
    { id: "purple", name: "Purple & Pink" },
    { id: "warm", name: "Warm" },
    { id: "neutral", name: "Neutral" },
  ];

  var OPTIONS = {
    mode: [
      ["light", "Light"],
      ["dark", "Dark"],
      ["system", "System"],
    ],
    fontSize: [
      ["small", "Small"],
      ["medium", "Medium"],
      ["large", "Large"],
    ],
    density: [
      ["compact", "Compact"],
      ["comfortable", "Comfortable"],
      ["spacious", "Spacious"],
    ],
    corners: [
      ["square", "Square"],
      ["rounded", "Rounded"],
    ],
    animations: [
      ["off", "Off"],
      ["subtle", "Subtle"],
      ["smooth", "Smooth"],
    ],
    sidebar: [
      ["expanded", "Expanded"],
      ["collapsed", "Collapsed"],
    ],
    cardStyle: [
      ["flat", "Flat"],
      ["bordered", "Bordered"],
      ["elevated", "Elevated"],
    ],
    background: [
      ["solid", "Solid"],
      ["gradient", "Subtle gradient"],
    ],
  };

  var DEFAULTS = {
    mode: "light",
    theme: "forest",
    fontSize: "medium",
    density: "comfortable",
    corners: "rounded",
    animations: "subtle",
    sidebar: "expanded",
    cardStyle: "bordered",
    background: "solid",
  };

  /* --------------------------- Combination library ------------------------ */

  /*
   * Each combination carries a full palette for both schemes:
   *   bg      main page background        card   cards, panels, tables
   *   sidebar navigation panel            text   primary copy
   *   muted   secondary copy              line   borders and dividers
   *   accent  primary buttons + active nav
   *   accent2 secondary buttons, highlights and icon washes
   *
   * Hover states, soft fills, notification colours and table headers are
   * derived from these anchors by the engine, so every combination stays
   * internally consistent in both Light and Dark.
   */
  var THEMES = [
    /* ------------------------------- Green -------------------------------- */
    {
      id: "forest",
      name: "Forest Green",
      category: "green",
      description: "The signature Guinhawa green with natural, grounded neutrals.",
      light: { bg: "#f4f7f4", card: "#ffffff", sidebar: "#052112", text: "#10271b", muted: "#61796b", line: "#e2ebe4", accent: "#168b4d", accent2: "#2e9a63" },
      dark: { bg: "#06130d", card: "#0b2017", sidebar: "#04150c", text: "#e8f4ec", muted: "#93b0a0", line: "#1a3829", accent: "#27a75b", accent2: "#4fd18a" },
    },
    {
      id: "emerald",
      name: "Emerald",
      category: "green",
      description: "Vivid emerald with crisp, fresh surfaces.",
      light: { bg: "#f1faf5", card: "#ffffff", sidebar: "#04301d", text: "#0d2a1c", muted: "#5b7d69", line: "#dcefe3", accent: "#0f9d58", accent2: "#34b97a" },
      dark: { bg: "#05170f", card: "#092419", sidebar: "#03110a", text: "#e6f8ee", muted: "#8fb8a1", line: "#163a29", accent: "#22c07a", accent2: "#56dfa3" },
    },
    {
      id: "sage",
      name: "Sage Green",
      category: "green",
      description: "Soft grey-green for a calm, understated workspace.",
      light: { bg: "#f4f7f3", card: "#ffffff", sidebar: "#23362b", text: "#1d2a22", muted: "#66786a", line: "#e2eae1", accent: "#5b8a66", accent2: "#7aa584" },
      dark: { bg: "#0d1410", card: "#141d17", sidebar: "#0a100c", text: "#e9f1ea", muted: "#9caf9f", line: "#232f26", accent: "#86b491", accent2: "#a8cfb1" },
    },
    {
      id: "olive",
      name: "Olive Green",
      category: "green",
      description: "Earthy olive with warm, muted tones.",
      light: { bg: "#f8f8ef", card: "#ffffff", sidebar: "#2b2f14", text: "#262a14", muted: "#75795a", line: "#e8e9d6", accent: "#6f7f3a", accent2: "#8b9c52" },
      dark: { bg: "#12140a", card: "#1a1d0f", sidebar: "#0c0e06", text: "#eef0dc", muted: "#a8ac88", line: "#2b2f1a", accent: "#9caf57", accent2: "#bccd7a" },
    },
    {
      id: "mint",
      name: "Mint Green",
      category: "green",
      description: "Bright mint with clean, airy backgrounds.",
      light: { bg: "#f0fbf6", card: "#ffffff", sidebar: "#073226", text: "#0d2a20", muted: "#5c8074", line: "#d8efe6", accent: "#10b981", accent2: "#4ad3a2" },
      dark: { bg: "#041712", card: "#08241d", sidebar: "#03110c", text: "#e4f9f1", muted: "#8bb8a9", line: "#143a30", accent: "#34d399", accent2: "#6ee7b7" },
    },
    {
      id: "jade",
      name: "Jade Green",
      category: "green",
      description: "Cool jade with balanced, focused contrast.",
      light: { bg: "#f1f8f4", card: "#ffffff", sidebar: "#083a34", text: "#0e2a27", muted: "#5d7a75", line: "#d9ece6", accent: "#0f8b6f", accent2: "#2ba98b" },
      dark: { bg: "#05140f", card: "#09211c", sidebar: "#030f0c", text: "#e6f6f1", muted: "#8db4ac", line: "#173a33", accent: "#22b892", accent2: "#4fd6b1" },
    },
    {
      id: "deep",
      name: "Deep Green",
      category: "green",
      description: "Dark botanical green for a serious, focused workspace.",
      light: { bg: "#eff5f1", card: "#ffffff", sidebar: "#06251b", text: "#0d2019", muted: "#5c7369", line: "#dbe7e0", accent: "#0b6b45", accent2: "#1f8b60" },
      dark: { bg: "#04120c", card: "#081e15", sidebar: "#020c07", text: "#e4f2ea", muted: "#8aab9b", line: "#143528", accent: "#17996a", accent2: "#3cbb8b" },
    },
    {
      id: "tropical",
      name: "Tropical Green",
      category: "green",
      description: "Lush tropical green with lively highlights.",
      light: { bg: "#effaf3", card: "#ffffff", sidebar: "#063728", text: "#0d2a1f", muted: "#5b7f6f", line: "#d7efe1", accent: "#12a05c", accent2: "#38c47f" },
      dark: { bg: "#03160f", card: "#07241a", sidebar: "#020f09", text: "#e3f9ee", muted: "#87b8a1", line: "#133a2a", accent: "#2bc47c", accent2: "#5ce0a4" },
    },

    /* -------------------------------- Blue -------------------------------- */
    {
      id: "ocean",
      name: "Ocean Blue",
      category: "blue",
      description: "Deep ocean blue with clear, cool surfaces.",
      light: { bg: "#f2f7fb", card: "#ffffff", sidebar: "#0b2b3d", text: "#0f2430", muted: "#5d7381", line: "#dbe7ee", accent: "#2563eb", accent2: "#4b83f0" },
      dark: { bg: "#07131c", card: "#0c1d29", sidebar: "#051019", text: "#e6f1f7", muted: "#8aa6b6", line: "#1b3444", accent: "#4d84f7", accent2: "#7aa8fa" },
    },
    {
      id: "midnight",
      name: "Midnight Blue",
      category: "blue",
      description: "Inky navy for a focused night workspace.",
      light: { bg: "#f3f5fb", card: "#ffffff", sidebar: "#0b1430", text: "#131a2e", muted: "#5d6480", line: "#e0e5f2", accent: "#1e40af", accent2: "#3a5fd0" },
      dark: { bg: "#050a18", card: "#0a1126", sidebar: "#03060f", text: "#e7ebf8", muted: "#8a93b3", line: "#1c2745", accent: "#5b7fe8", accent2: "#86a2f2" },
    },
    {
      id: "arctic",
      name: "Arctic Cyan",
      category: "blue",
      description: "Icy cyan with bright, crisp accents.",
      light: { bg: "#f1fafc", card: "#ffffff", sidebar: "#0a3340", text: "#0e2730", muted: "#5b7a84", line: "#d7ecf1", accent: "#0891b2", accent2: "#22b0cf" },
      dark: { bg: "#04161c", card: "#08222b", sidebar: "#020f13", text: "#e5f6fa", muted: "#8aafba", line: "#143a46", accent: "#22b8d8", accent2: "#4fd2ea" },
    },
    {
      id: "royal-blue",
      name: "Royal Blue",
      category: "blue",
      description: "Confident royal blue with crisp whites.",
      light: { bg: "#f1f4fd", card: "#ffffff", sidebar: "#111a4d", text: "#131a35", muted: "#5f6688", line: "#dfe3f5", accent: "#2952cc", accent2: "#4a72e3" },
      dark: { bg: "#060a1c", card: "#0b1130", sidebar: "#040616", text: "#e8ebfa", muted: "#8d93bb", line: "#1d2449", accent: "#5f82f0", accent2: "#8aa4f7" },
    },
    {
      id: "sky",
      name: "Sky Blue",
      category: "blue",
      description: "Light sky blue with soft daylight tones.",
      light: { bg: "#f1f9fd", card: "#ffffff", sidebar: "#0d3448", text: "#0e2833", muted: "#5c7887", line: "#d8ebf3", accent: "#0ea5e9", accent2: "#3dbcfa" },
      dark: { bg: "#04141c", card: "#08212c", sidebar: "#020e13", text: "#e6f6fd", muted: "#8bb0c0", line: "#143846", accent: "#38bdf8", accent2: "#67d0fb" },
    },
    {
      id: "teal",
      name: "Teal Blue",
      category: "blue",
      description: "Balanced teal with a modern, steady feel.",
      light: { bg: "#eff9f8", card: "#ffffff", sidebar: "#073a3c", text: "#0d2a2b", muted: "#5b7c7c", line: "#d8ecea", accent: "#0f7f83", accent2: "#23a1a4" },
      dark: { bg: "#041413", card: "#082120", sidebar: "#020e0d", text: "#e4f6f5", muted: "#8ab2b0", line: "#143936", accent: "#21b3b5", accent2: "#47d2d2" },
    },

    /* --------------------------- Purple and pink -------------------------- */
    {
      id: "royal-purple",
      name: "Royal Purple",
      category: "purple",
      description: "Bold royal purple with rich, layered depth.",
      light: { bg: "#f7f4fd", card: "#ffffff", sidebar: "#2a1259", text: "#1c1430", muted: "#6b6280", line: "#e7e1f4", accent: "#7c3aed", accent2: "#9861f5" },
      dark: { bg: "#0c0817", card: "#150f26", sidebar: "#08050f", text: "#efeafb", muted: "#a29ab8", line: "#2a2143", accent: "#9b6bf7", accent2: "#b994fa" },
    },
    {
      id: "lavender",
      name: "Lavender",
      category: "purple",
      description: "Gentle lavender with warm grey neutrals.",
      light: { bg: "#f8f6fe", card: "#ffffff", sidebar: "#2f2551", text: "#201a33", muted: "#6f6687", line: "#e9e3f8", accent: "#8b7fd4", accent2: "#a79ee0" },
      dark: { bg: "#0d0a18", card: "#171227", sidebar: "#090613", text: "#f0ecfd", muted: "#a79ec4", line: "#2b2445", accent: "#a99fec", accent2: "#c4bdf5" },
    },
    {
      id: "violet",
      name: "Violet",
      category: "purple",
      description: "Vivid violet with creative, energetic highlights.",
      light: { bg: "#f8f4fe", card: "#ffffff", sidebar: "#31165c", text: "#201230", muted: "#6f6280", line: "#eae0f7", accent: "#8b5cf6", accent2: "#a87ef9" },
      dark: { bg: "#0e0718", card: "#180e26", sidebar: "#090410", text: "#f2ecfd", muted: "#a99ac4", line: "#2d2145", accent: "#a983f9", accent2: "#c2a6fb" },
    },
    {
      id: "rose",
      name: "Rose Pink",
      category: "purple",
      description: "Warm rose pink with soft, elegant surfaces.",
      light: { bg: "#fdf5f8", card: "#ffffff", sidebar: "#481028", text: "#2b1420", muted: "#7c6270", line: "#f2e2ea", accent: "#db2777", accent2: "#ec5b98" },
      dark: { bg: "#150a10", card: "#21101a", sidebar: "#100509", text: "#fbeaf2", muted: "#b89aa9", line: "#3a2030", accent: "#f0559b", accent2: "#f78bb8" },
    },
    {
      id: "cherry",
      name: "Cherry Red",
      category: "purple",
      description: "Deep cherry red with confident contrast.",
      light: { bg: "#fdf4f4", card: "#ffffff", sidebar: "#461013", text: "#2b1414", muted: "#7d6464", line: "#f3e1e1", accent: "#dc2626", accent2: "#ef4f4f" },
      dark: { bg: "#150909", card: "#210e0e", sidebar: "#0f0404", text: "#fbeaea", muted: "#b99a9a", line: "#3b2020", accent: "#f05555", accent2: "#f78c8c" },
    },
    {
      id: "orchid",
      name: "Orchid",
      category: "purple",
      description: "Vibrant orchid with a playful, modern edge.",
      light: { bg: "#fcf4fb", card: "#ffffff", sidebar: "#40143f", text: "#2a1428", muted: "#7b6279", line: "#f2e1f0", accent: "#b83ac4", accent2: "#d05cd9" },
      dark: { bg: "#150815", card: "#210f21", sidebar: "#0f040f", text: "#fbeafb", muted: "#b89ab6", line: "#3a2039", accent: "#d95ce4", accent2: "#e88bef" },
    },

    /* -------------------------------- Warm -------------------------------- */
    {
      id: "sunset",
      name: "Sunset Orange",
      category: "warm",
      description: "Warm sunset orange with golden light.",
      light: { bg: "#fdf6f1", card: "#ffffff", sidebar: "#431b08", text: "#2b1a10", muted: "#7d6a5e", line: "#f3e6dc", accent: "#ea580c", accent2: "#f77b38" },
      dark: { bg: "#150d07", card: "#211509", sidebar: "#0f0703", text: "#fbf0e6", muted: "#b8a08c", line: "#3a2818", accent: "#fb7c33", accent2: "#fca669" },
    },
    {
      id: "golden",
      name: "Golden Amber",
      category: "warm",
      description: "Golden amber with a rich, welcoming glow.",
      light: { bg: "#fdfaf1", card: "#ffffff", sidebar: "#3d2c05", text: "#2a220f", muted: "#796d52", line: "#f2ead6", accent: "#c08a08", accent2: "#dba81f" },
      dark: { bg: "#141005", card: "#201a0a", sidebar: "#0e0a02", text: "#faf5e4", muted: "#b6a987", line: "#3a2f14", accent: "#e0a81f", accent2: "#eec454" },
    },
    {
      id: "coral",
      name: "Coral",
      category: "warm",
      description: "Soft coral with friendly, warm tones.",
      light: { bg: "#fdf5f3", card: "#ffffff", sidebar: "#4a1b16", text: "#2b1917", muted: "#7d6662", line: "#f3e3df", accent: "#e4555f", accent2: "#f07a82" },
      dark: { bg: "#150a09", card: "#211210", sidebar: "#0f0505", text: "#fbeceb", muted: "#b89d9a", line: "#3a2422", accent: "#f3757d", accent2: "#f79aa0" },
    },
    {
      id: "desert",
      name: "Desert Earth",
      category: "warm",
      description: "Desert earth with sandy, natural neutrals.",
      light: { bg: "#faf6f0", card: "#ffffff", sidebar: "#3d2b1c", text: "#292017", muted: "#7a6b5c", line: "#ede4d8", accent: "#b07a45", accent2: "#c79665" },
      dark: { bg: "#12100c", card: "#1c1914", sidebar: "#0b0906", text: "#f2ede5", muted: "#b3a695", line: "#322c23", accent: "#cc9863", accent2: "#ddb489" },
    },
    {
      id: "coffee",
      name: "Coffee Brown",
      category: "warm",
      description: "Coffee brown with cosy, grounded warmth.",
      light: { bg: "#f8f4f1", card: "#ffffff", sidebar: "#33201a", text: "#241813", muted: "#74655e", line: "#eae0d9", accent: "#8a5a44", accent2: "#a5755e" },
      dark: { bg: "#100c0a", card: "#1a1411", sidebar: "#090605", text: "#f1e9e4", muted: "#ae9c92", line: "#2f2621", accent: "#b8866d", accent2: "#cba48f" },
    },
    {
      id: "champagne",
      name: "Champagne",
      category: "warm",
      description: "Champagne gold with refined, quiet luxury.",
      light: { bg: "#fbf8f1", card: "#ffffff", sidebar: "#3a321d", text: "#272215", muted: "#79705a", line: "#efe7d6", accent: "#b39a5b", accent2: "#c9b47a" },
      dark: { bg: "#13110b", card: "#1d1a12", sidebar: "#0b0a06", text: "#f5f0e2", muted: "#b3aa91", line: "#332e22", accent: "#cdb57f", accent2: "#ddca9c" },
    },

    /* ------------------------------- Neutral ------------------------------ */
    {
      id: "slate",
      name: "Midnight Slate",
      category: "neutral",
      description: "Cool midnight slate with precise contrast.",
      light: { bg: "#f4f6f8", card: "#ffffff", sidebar: "#131c26", text: "#1a2129", muted: "#62707c", line: "#e1e6eb", accent: "#475569", accent2: "#64748b" },
      dark: { bg: "#0a0e13", card: "#11161d", sidebar: "#06090d", text: "#e9eef3", muted: "#94a2af", line: "#222b36", accent: "#94a3b8", accent2: "#b0bccb" },
    },
    {
      id: "monochrome",
      name: "Monochrome",
      category: "neutral",
      description: "Pure black and white with no distractions.",
      light: { bg: "#f5f5f5", card: "#ffffff", sidebar: "#1a1a1a", text: "#171717", muted: "#6b6b6b", line: "#e3e3e3", accent: "#262626", accent2: "#525252" },
      dark: { bg: "#0d0d0d", card: "#161616", sidebar: "#050505", text: "#ededed", muted: "#a3a3a3", line: "#2a2a2a", accent: "#e5e5e5", accent2: "#d4d4d4" },
    },
    {
      id: "minimal",
      name: "Minimal White",
      category: "neutral",
      description: "Minimal white with restrained graphite accents.",
      light: { bg: "#ffffff", card: "#ffffff", sidebar: "#17181c", text: "#11181f", muted: "#66727d", line: "#e6eaee", accent: "#111827", accent2: "#374151" },
      dark: { bg: "#0b0d10", card: "#14171b", sidebar: "#050608", text: "#eceff2", muted: "#98a1aa", line: "#252a30", accent: "#e8eaed", accent2: "#c9ced6" },
    },
    {
      id: "charcoal",
      name: "Charcoal Gray",
      category: "neutral",
      description: "Charcoal grey with a professional, steady tone.",
      light: { bg: "#f5f6f7", card: "#ffffff", sidebar: "#23272b", text: "#1c2125", muted: "#656f77", line: "#e2e6e9", accent: "#3f4a5a", accent2: "#5b6878" },
      dark: { bg: "#0c0e10", card: "#14171a", sidebar: "#070809", text: "#e8ebed", muted: "#97a1a8", line: "#23282c", accent: "#8fa0b3", accent2: "#aebcc9" },
    },
  ];

  /*
   * The store uses a small, curated set of combinations. The full palette
   * definitions stay in this file (so saved accounts keep valid colours), but
   * only the ids listed here are offered in Settings -> Appearance.
   */
  var AVAILABLE_THEMES = [
    "forest",
    "emerald",
    "sage",
    "olive",
    "mint",
    "jade",
    "deep",
    "tropical",
    "ocean",
  ];

  THEMES = THEMES.filter(function (theme) {
    return AVAILABLE_THEMES.indexOf(theme.id) !== -1;
  });

  CATEGORIES = CATEGORIES.filter(function (category) {
    return THEMES.some(function (theme) {
      return theme.category === category.id;
    });
  });

  /* ----------------------------- Legacy mapping --------------------------- */

  // Earlier versions stored a preset plus a separate accent. Fold both onto
  // the nearest combination so an existing account keeps its look.
  var LEGACY_PRESET = {
    forest: "forest",
    emerald: "emerald",
    ocean: "ocean",
    midnight: "midnight",
    royal: "royal-purple",
    lavender: "lavender",
    rose: "rose",
    cherry: "cherry",
    sunset: "sunset",
    golden: "golden",
    mint: "mint",
    arctic: "arctic",
    slate: "slate",
    minimal: "minimal",
  };

  var LEGACY_ACCENT = {
    forest: "forest",
    emerald: "emerald",
    mint: "mint",
    lime: "olive",
    olive: "olive",
    sage: "sage",
    pine: "deep",
    ocean: "ocean",
    sky: "sky",
    arctic: "arctic",
    cobalt: "royal-blue",
    navy: "midnight",
    teal: "teal",
    royal: "royal-purple",
    violet: "violet",
    indigo: "royal-purple",
    lavender: "lavender",
    plum: "orchid",
    rose: "rose",
    pink: "rose",
    fuchsia: "orchid",
    blush: "rose",
    cherry: "cherry",
    crimson: "cherry",
    scarlet: "cherry",
    coral: "coral",
    sunset: "sunset",
    tangerine: "sunset",
    burnt: "coral",
    peach: "champagne",
    golden: "golden",
    amber: "golden",
    honey: "champagne",
    slate: "slate",
    graphite: "charcoal",
    stone: "charcoal",
    charcoal: "charcoal",
    sand: "desert",
  };

  /* ------------------------------ Colour maths --------------------------- */

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function parseHex(value) {
    if (typeof value !== "string") return null;
    var hex = value.trim().replace(/^#/, "");
    if (hex.length === 3) {
      hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
    }
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  function toHex(rgb) {
    var part = function (value) {
      return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
    };
    return "#" + part(rgb.r) + part(rgb.g) + part(rgb.b);
  }

  /** `weight` is how much of `a` survives: 1 = all a, 0 = all b. */
  function mix(a, b, weight) {
    var first = parseHex(a);
    var second = parseHex(b);
    if (!first || !second) return a;
    var w = clamp(weight, 0, 1);
    return toHex({
      r: first.r * w + second.r * (1 - w),
      g: first.g * w + second.g * (1 - w),
      b: first.b * w + second.b * (1 - w),
    });
  }

  function shade(hex, amount) {
    return mix(hex, "#000000", 1 - clamp(amount, 0, 1));
  }

  function tint(hex, amount) {
    return mix(hex, "#ffffff", 1 - clamp(amount, 0, 1));
  }

  function luminance(hex) {
    var rgb = parseHex(hex);
    if (!rgb) return 0.5;
    var channel = function (value) {
      var c = value / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  }

  function readableOn(hex) {
    return luminance(hex) > 0.3 ? "#10231a" : "#ffffff";
  }

  function rgbChannels(hex) {
    var rgb = parseHex(hex) || { r: 0, g: 0, b: 0 };
    return rgb.r + ", " + rgb.g + ", " + rgb.b;
  }

  /* ------------------------------- Lookups ------------------------------- */

  function byId(list, id) {
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function themeById(id) {
    return byId(THEMES, id);
  }

  function optionIds(key) {
    return OPTIONS[key].map(function (pair) {
      return pair[0];
    });
  }

  function pickOption(key, value) {
    var allowed = optionIds(key);
    return allowed.indexOf(value) !== -1 ? value : DEFAULTS[key];
  }

  function resolveTheme(source) {
    if (typeof source.theme === "string" && themeById(source.theme)) {
      return source.theme;
    }

    if (typeof source.preset === "string") {
      if (themeById(source.preset)) return source.preset;
      var presetTheme = LEGACY_PRESET[source.preset];
      if (presetTheme && themeById(presetTheme)) return presetTheme;
    }

    if (typeof source.accent === "string") {
      if (themeById(source.accent)) return source.accent;
      var accentTheme = LEGACY_ACCENT[source.accent];
      if (accentTheme && themeById(accentTheme)) return accentTheme;
    }

    return DEFAULTS.theme;
  }

  function normalize(input) {
    var source = input && typeof input === "object" ? input : {};
    var prefs = {
      mode: pickOption("mode", source.mode),
      theme: resolveTheme(source),
      fontSize: pickOption("fontSize", source.fontSize),
      density: pickOption("density", source.density),
      corners: pickOption("corners", source.corners),
      animations: pickOption("animations", source.animations),
      sidebar: pickOption("sidebar", source.sidebar),
      cardStyle: pickOption("cardStyle", source.cardStyle),
      background: pickOption("background", source.background),
    };

    // Older saved objects used `radius`, `cardStyle` and `background: pattern`
    // with different meanings. Translate them onto the current options.
    if (source.corners === undefined) {
      if (source.radius === "sharp" || source.cardStyle === "squared") {
        prefs.corners = "square";
      } else if (source.radius === "medium" || source.radius === "rounded") {
        prefs.corners = "rounded";
      }
    }

    if (source.background === "pattern") prefs.background = "solid";

    return prefs;
  }

  /* ------------------------------ Resolution ----------------------------- */

  function systemMode() {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (error) {
      return "light";
    }
  }

  function resolveMode(prefs) {
    return prefs.mode === "system" ? systemMode() : prefs.mode;
  }

  var STATUS = {
    light: { amber: "#a9761b", rose: "#b83c50", blue: "#2f6f8f", violet: "#6d5aa8" },
    dark: { amber: "#e3b25c", rose: "#f28a9b", blue: "#8cc6e0", violet: "#b3a4e8" },
  };

  function buildTokens(prefs) {
    var mode = resolveMode(prefs);
    var dark = mode === "dark";
    var theme = themeById(prefs.theme) || themeById(DEFAULTS.theme);
    var p = theme[mode] || theme.light;
    var status = STATUS[mode];

    var accent = p.accent;
    var accent2 = p.accent2;
    var bg = p.bg;
    var card = p.card;
    var text = p.text;
    var muted = p.muted;
    var line = p.line;

    // Secondary surface: inputs, chips, nested panels.
    var surface2 = mix(card, bg, dark ? 0.45 : 0.55);

    // Accent washes for chips, active rows and hover states.
    var soft = dark ? mix(accent, card, 0.15) : mix(accent, bg, 0.09);
    var softStrong = dark ? mix(accent, card, 0.24) : mix(accent, bg, 0.17);
    var hover = dark ? mix(accent, card, 0.07) : mix(accent, card, 0.032);
    var navActive = dark ? mix(accent, p.sidebar, 0.22) : accent;

    // Link colours need both the hex and rgb forms because Bootstrap 5.3
    // resolves anchors through the rgb custom properties.
    var link = dark ? tint(accent, 0.35) : shade(accent, 0.25);
    var linkHover = dark ? tint(accent, 0.55) : shade(accent, 0.4);

    return {
      mode: mode,
      "--gq-emerald": accent,
      "--gq-bright": accent2,
      "--gq-forest": dark ? tint(accent, 0.42) : shade(accent, 0.45),
      "--gq-deep": shade(p.sidebar, 0.28),
      "--gq-mint": dark ? mix(accent, card, 0.36) : tint(accent, 0.78),
      "--gq-on-accent": readableOn(mix(accent, accent2, 0.5)),
      "--gq-accent-deep": shade(accent, 0.45),
      // Accent colour used for small text on tinted surfaces.
      "--gq-accent-ink": dark ? accent2 : shade(accent, 0.45),
      "--gq-bg": bg,
      "--gq-card": card,
      "--gq-surface": card,
      "--gq-surface-2": surface2,
      "--gq-soft": soft,
      "--gq-soft-strong": softStrong,
      "--gq-hover": hover,
      "--gq-table-head": dark ? mix(card, bg, 0.4) : mix(surface2, bg, 0.6),
      "--gq-text": text,
      "--gq-muted": dark ? mix(muted, text, 0.92) : mix(muted, text, 0.72),
      // Quiet labels need the same readable floor as body copy.
      "--gq-muted-2": dark ? mix(muted, text, 0.88) : mix(muted, text, 0.75),
      "--gq-line": line,
      "--gq-line-strong": dark ? tint(line, 0.18) : shade(line, 0.08),
      "--gq-sidebar-top": p.sidebar,
      "--gq-sidebar-bottom": shade(p.sidebar, 0.38),
      "--gq-nav-active": navActive,
      "--gq-white": card,
      "--gq-offwhite": bg,

      "--gq-amber": status.amber,
      "--gq-amber-soft": mix(status.amber, bg, dark ? 0.16 : 0.13),
      "--gq-rose": status.rose,
      "--gq-rose-soft": mix(status.rose, bg, dark ? 0.16 : 0.12),
      "--gq-blue": status.blue,
      "--gq-blue-soft": mix(status.blue, bg, dark ? 0.16 : 0.13),
      "--gq-violet": status.violet,
      "--gq-violet-soft": mix(status.violet, bg, dark ? 0.16 : 0.12),
      // Status text inks keep >= 4.5:1 on their tinted badges in Light mode.
      "--gq-amber-ink": dark ? status.amber : mix(status.amber, "#000000", 0.8),
      "--gq-rose-ink": dark ? status.rose : mix(status.rose, "#000000", 0.9),
      "--gq-blue-ink": dark ? status.blue : mix(status.blue, "#000000", 0.9),
      "--gq-violet-ink": dark ? status.violet : mix(status.violet, "#000000", 0.9),

      "--bs-primary": accent,
      "--bs-primary-rgb": rgbChannels(accent),
      "--bs-link-color": link,
      "--bs-link-color-rgb": rgbChannels(link),
      "--bs-link-hover-color": linkHover,
      "--bs-link-hover-color-rgb": rgbChannels(linkHover),
      "--bs-body-bg": bg,
      "--bs-body-color": text,
      "--bs-border-color": line,
      "--bs-tertiary-bg": soft,
    };
  }

  var root = document.documentElement;

  function apply(prefs) {
    var values = normalize(prefs);
    var tokens = buildTokens(values);

    root.setAttribute("data-bs-theme", tokens.mode);
    root.style.colorScheme = tokens.mode;
    root.setAttribute("data-theme-preference", values.mode);
    root.setAttribute("data-theme", values.theme);
    root.setAttribute("data-accent", values.theme);
    root.setAttribute("data-font-size", values.fontSize);
    root.setAttribute("data-density", values.density);
    root.setAttribute("data-corners", values.corners);
    root.setAttribute("data-animations", values.animations);
    root.setAttribute("data-sidebar", values.sidebar);
    root.setAttribute("data-card-style", values.cardStyle);
    root.setAttribute("data-bg-style", values.background);

    Object.keys(tokens).forEach(function (name) {
      if (name.indexOf("--") === 0) {
        root.style.setProperty(name, tokens[name]);
      }
    });

    try {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", tokens["--gq-surface"]);
    } catch (error) {
      /* the meta tag is optional */
    }

    return values;
  }

  function read() {
    var saved = {};
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) saved = JSON.parse(raw) || {};
    } catch (error) {
      saved = {};
    }

    if (!saved.mode) {
      try {
        var legacy = window.localStorage.getItem(LEGACY_THEME_KEY);
        if (legacy) saved.mode = legacy;
      } catch (error) {
        /* storage is optional */
      }
    }

    return normalize(saved);
  }

  function persist(prefs) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(prefs));
      window.localStorage.setItem(LEGACY_THEME_KEY, prefs.mode);
    } catch (error) {
      /* storage is optional */
    }
  }

  function announce(prefs) {
    try {
      document.dispatchEvent(
        new CustomEvent("guinhawa:appearancechange", {
          detail: { preferences: prefs },
        }),
      );
      document.dispatchEvent(
        new CustomEvent("guinhawa:themechange", {
          detail: { theme: resolveMode(prefs), preference: prefs.mode },
        }),
      );
    } catch (error) {
      /* CustomEvent is available in every supported browser */
    }
  }

  function save(prefs) {
    var values = apply(prefs);
    persist(values);
    announce(values);
    return values;
  }

  function reset() {
    var values = apply(DEFAULTS);
    try {
      window.localStorage.removeItem(KEY);
      window.localStorage.setItem(LEGACY_THEME_KEY, DEFAULTS.mode);
    } catch (error) {
      /* storage is optional */
    }
    announce(values);
    return values;
  }

  /* ------------------------------- Bootstrap ----------------------------- */

  var initial = read();
  apply(initial);

  // Follow the device setting while "System" is selected.
  try {
    var media = window.matchMedia("(prefers-color-scheme: dark)");
    var onChange = function () {
      var current = read();
      if (current.mode === "system") announce(apply(current));
    };
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
    } else if (typeof media.addListener === "function") {
      media.addListener(onChange);
    }
  } catch (error) {
    /* matchMedia is optional */
  }

  window.GuinhawaTheme = {
    KEY: KEY,
    DEFAULTS: DEFAULTS,
    OPTIONS: OPTIONS,
    CATEGORIES: CATEGORIES,
    THEMES: THEMES,
    normalize: normalize,
    themeById: themeById,
    themesFor: function (category) {
      if (!category || category === "all") return THEMES;
      return THEMES.filter(function (theme) {
        return theme.category === category;
      });
    },
    countFor: function (category) {
      if (category === "all") return THEMES.length;
      return THEMES.filter(function (theme) {
        return theme.category === category;
      }).length;
    },
    resolveMode: resolveMode,
    readableOn: readableOn,
    luminance: luminance,
    parseHex: parseHex,
    toHex: toHex,
    mix: mix,
    shade: shade,
    tint: tint,
    read: read,
    apply: apply,
    save: save,
    reset: reset,
    tokens: function (prefs) {
      return buildTokens(normalize(prefs));
    },
  };
})(window, document);
