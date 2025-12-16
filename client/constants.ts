
export const MAX_GRID_WIDTH = 2000;
export const MAX_GRID_HEIGHT = 600;

export interface ICharacterSet {
  cornerTopLeft: string;
  cornerTopRight: string;
  cornerBottomRight: string;
  cornerBottomLeft: string;
  arrowLeft: string;
  arrowRight: string;
  arrowUp: string;
  arrowDown: string;
  lineVertical: string;
  lineHorizontal: string;
  junctionDown: string;
  junctionUp: string;
  junctionLeft: string;
  junctionRight: string;
  junctionAll: string;
}

export const UNICODE: ICharacterSet = {
  cornerTopLeft: "┌",
  cornerTopRight: "┐",
  cornerBottomRight: "┘",
  cornerBottomLeft: "└",
  arrowLeft: "◄",
  arrowRight: "►",
  arrowUp: "▲",
  arrowDown: "▼",
  lineVertical: "│",
  lineHorizontal: "─",
  junctionDown: "┬",
  junctionUp: "┴",
  junctionLeft: "┤",
  junctionRight: "├",
  junctionAll: "┼",
};

export const ASCII: ICharacterSet = {
  cornerTopLeft: "+",
  cornerTopRight: "+",
  cornerBottomRight: "+",
  cornerBottomLeft: "+",
  arrowLeft: "<",
  arrowRight: ">",
  arrowUp: "^",
  arrowDown: "v",
  lineVertical: "|",
  lineHorizontal: "-",
  junctionDown: "+",
  junctionUp: "+",
  junctionLeft: "+",
  junctionRight: "+",
  junctionAll: "+",
};

export const SPECIAL_VALUE = UNICODE.junctionAll;
export const ALT_SPECIAL_VALUE = UNICODE.arrowRight;

type ICharacter = keyof ICharacterSet;

const SPECIAL_VALUE_KEYS: ICharacter[] = [
  "cornerTopLeft",
  "cornerTopRight",
  "cornerBottomRight",
  "cornerBottomLeft",
  "lineVertical",
  "lineHorizontal",
  "junctionDown",
  "junctionUp",
  "junctionLeft",
  "junctionRight",
  "junctionAll",
];
const ALT_SPECIAL_VALUE_KEYS: ICharacter[] = [
  "arrowLeft",
  "arrowRight",
  "arrowUp",
  "arrowDown",
];

export const SPECIAL_VALUES = [
  ...new Set([
    ...SPECIAL_VALUE_KEYS.map((key) => UNICODE[key]),
    // ...SPECIAL_VALUE_KEYS.map((key) => ASCII[key]),
  ]),
];

export const ALT_SPECIAL_VALUES = [
  ...new Set([
    ...ALT_SPECIAL_VALUE_KEYS.map((key) => UNICODE[key]),
    // ...ALT_SPECIAL_VALUE_KEYS.map((key) => ASCII[key]),
  ]),
];

export class Characters {
  public static isLine = (value: string) => {
    return SPECIAL_VALUES.includes(value);
  }

  public static isArrow = (value: string) => {
    return ALT_SPECIAL_VALUES.includes(value);
  }
}
export const ALL_SPECIAL_VALUES = SPECIAL_VALUES.concat(ALT_SPECIAL_VALUES);

export const isSpecial = (value: string) => ALL_SPECIAL_VALUES.includes(value);

export const MAX_UNDO = 50;

export const SPECIAL_LINE_H = "-";
export const SPECIAL_LINE_V = "|";

export const DRAG_LATENCY = 150; // Milliseconds.
export const DRAG_ACCURACY = 6; // Pixels.

export const CHAR_PIXELS_H = 9;
export const CHAR_PIXELS_V = 16;

export const RENDER_PADDING_CELLS = 3;

export const KEY_RETURN = "<enter>";
export const KEY_BACKSPACE = "<backspace>";
export const KEY_DELETE = "<delete>";
export const KEY_COPY = "<copy>";
export const KEY_PASTE = "<paste>";
export const KEY_CUT = "<cut>";
export const KEY_UP = "<up>";
export const KEY_DOWN = "<down>";
export const KEY_LEFT = "<left>";
export const KEY_RIGHT = "<right>";

// http://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
export const TOUCH_ENABLED = () => 
  "ontouchstart" in window || "onmsgesturechange" in window;

/**
 * 16 standard ANSI terminal colors.
 * Index 0-7: normal colors, 8-15: bright variants.
 */
export interface IAnsiColor {
  name: string;
  fg: number;  // ANSI foreground code
  bg: number;  // ANSI background code
  hex: string; // Hex color for canvas rendering
}

export const ANSI_COLORS: IAnsiColor[] = [
  // Normal colors (0-7)
  { name: "Black", fg: 30, bg: 40, hex: "#000000" },
  { name: "Red", fg: 31, bg: 41, hex: "#cc0000" },
  { name: "Green", fg: 32, bg: 42, hex: "#00cc00" },
  { name: "Yellow", fg: 33, bg: 43, hex: "#cccc00" },
  { name: "Blue", fg: 34, bg: 44, hex: "#0000cc" },
  { name: "Magenta", fg: 35, bg: 45, hex: "#cc00cc" },
  { name: "Cyan", fg: 36, bg: 46, hex: "#00cccc" },
  { name: "White", fg: 37, bg: 47, hex: "#cccccc" },
  // Bright colors (8-15)
  { name: "Bright Black", fg: 90, bg: 100, hex: "#666666" },
  { name: "Bright Red", fg: 91, bg: 101, hex: "#ff0000" },
  { name: "Bright Green", fg: 92, bg: 102, hex: "#00ff00" },
  { name: "Bright Yellow", fg: 93, bg: 103, hex: "#ffff00" },
  { name: "Bright Blue", fg: 94, bg: 104, hex: "#0000ff" },
  { name: "Bright Magenta", fg: 95, bg: 105, hex: "#ff00ff" },
  { name: "Bright Cyan", fg: 96, bg: 106, hex: "#00ffff" },
  { name: "Bright White", fg: 97, bg: 107, hex: "#ffffff" },
];