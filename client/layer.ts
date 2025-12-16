import { LegacyRenderLayer } from "#asciiflow/client/render_layer";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

/**
 * Represents a single cell in the canvas with character and optional colors.
 */
export interface ICell {
  char: string;
  fg?: number;  // 0-15 ANSI foreground color index, undefined = theme default
  bg?: number;  // 0-15 ANSI background color index, undefined = transparent
}

/**
 * Helper to create a cell from a character string or ICell.
 */
export function toCell(value: string | ICell): ICell {
  if (typeof value === "string") {
    return { char: value };
  }
  return value;
}

/**
 * Helper to check if a cell has any color data.
 */
export function hasColor(cell: ICell): boolean {
  return cell.fg !== undefined || cell.bg !== undefined;
}

export interface ILayerView {
  get(position: Vector): string;
  getCell(position: Vector): ICell | null;
  keys(): Vector[];
  entries(): [Vector, string][];
  cellEntries(): [Vector, ICell][];
}

interface ILayerJSON {
  version: number;
  x: number;
  y: number;
  text: string;
}

interface ILayerJSONV3 {
  version: number;
  x: number;
  y: number;
  text: string;
  // Color data stored as a sparse map: "x,y" -> [fg, bg] (undefined values omitted)
  colors?: { [key: string]: [number?, number?] };
}

export class Layer implements ILayerView {
  public static serialize(value: Layer) {
    const entries = value.cellEntries();
    if (entries.length === 0) {
      return JSON.stringify({ version: 3, x: 0, y: 0, text: "" } as ILayerJSONV3);
    }

    const minX = entries.reduce((acc, [key]) => Math.min(acc, key.x), Number.MAX_SAFE_INTEGER);
    const minY = entries.reduce((acc, [key]) => Math.min(acc, key.y), Number.MAX_SAFE_INTEGER);

    // Build color map for cells that have colors
    const colors: { [key: string]: [number?, number?] } = {};
    let hasAnyColors = false;
    for (const [pos, cell] of entries) {
      if (hasColor(cell)) {
        const relX = pos.x - minX;
        const relY = pos.y - minY;
        colors[`${relX},${relY}`] = [cell.fg, cell.bg];
        hasAnyColors = true;
      }
    }

    const result: ILayerJSONV3 = {
      version: 3,
      x: minX,
      y: minY,
      text: layerToText(value),
    };

    if (hasAnyColors) {
      result.colors = colors;
    }

    return JSON.stringify(result);
  }

  public static deserialize(value: string) {
    const object = JSON.parse(value) as ILayerJSONV3;
    
    // Handle legacy versions
    if (!object.version) {
      const fixedLayer = new Layer();
      const legacyRenderedLayer = new LegacyRenderLayer(
        textToLayer(object.text, new Vector(object.x, object.y))
      );
      fixedLayer.setFrom(legacyRenderedLayer);
      return fixedLayer;
    }
    
    // Version 2 or 3 - parse text first
    const layer = textToLayer(object.text, new Vector(object.x, object.y));
    
    // Version 3 adds color support
    if (object.version >= 3 && object.colors) {
      for (const [key, colorData] of Object.entries(object.colors)) {
        if (!Array.isArray(colorData)) continue;
        const [fg, bg] = colorData;
        const [relX, relY] = key.split(",").map(Number);
        if (isNaN(relX) || isNaN(relY)) continue;
        const pos = new Vector(relX + object.x, relY + object.y);
        const existingCell = layer.getCell(pos);
        if (existingCell) {
          // Only set valid color indices (0-15)
          const validFg = typeof fg === "number" && fg >= 0 && fg < 16 ? fg : undefined;
          const validBg = typeof bg === "number" && bg >= 0 && bg < 16 ? bg : undefined;
          layer.setCell(pos, { char: existingCell.char, fg: validFg, bg: validBg });
        }
      }
    }
    
    return layer;
  }

  public map = new Map<string, ICell>();

  public entries() {
    return this.keys().map((key) => [key, this.get(key)] as [Vector, string]);
  }

  public cellEntries(): [Vector, ICell][] {
    return this.keys().map((key) => [key, this.getCell(key)] as [Vector, ICell]);
  }

  public delete(position?: Vector) {
    this.map.delete(position.toString());
  }

  public clear() {
    this.map.clear();
  }

  /**
   * Set a cell at position. Accepts either a string (character only) or ICell (with colors).
   */
  public set(position: Vector, value: string | ICell) {
    this.map.set(position.toString(), toCell(value));
  }

  /**
   * Set a cell with explicit ICell value.
   */
  public setCell(position: Vector, cell: ICell) {
    this.map.set(position.toString(), cell);
  }

  public setFrom(layer: ILayerView) {
    for (const [key, cell] of layer.cellEntries()) {
      this.setCell(key, cell);
    }
  }

  /**
   * Get the character at position (for backward compatibility).
   */
  public get(position: Vector): string | null {
    const cell = this.getCell(position);
    return cell ? cell.char : null;
  }

  /**
   * Get the full cell (character + colors) at position.
   */
  public getCell(position: Vector): ICell | null {
    const key = position.toString();
    return this.map.has(key) ? this.map.get(key) : null;
  }

  public has(position: Vector) {
    return this.map.has(position.toString());
  }

  public keys(): Vector[] {
    return [...this.map.keys()].map((key) => Vector.fromString(key));
  }

  public size() {
    return this.map.size;
  }

  /**
   * Applies another layer to this layer, and returns the new layer and a layer that can be applied to undo the operation.
   */
  public apply(otherLayer: Layer): [Layer, Layer] {
    const newLayer = new Layer();
    newLayer.map = new Map(this.map.entries());
    const undoLayer = new Layer();
    
    Array.from(otherLayer.map.entries()).forEach(([key, newCell]) => {
      const oldCell = this.map.get(key);
      // Spaces and empty strings are deletion characters.
      if (newCell.char === "" || newCell.char === " ") {
        newLayer.map.delete(key);
      } else {
        newLayer.map.set(key, newCell);
      }
      // Check if the cell changed
      const oldChar = oldCell?.char;
      const newChar = newCell.char;
      if (oldChar !== newChar || oldCell?.fg !== newCell.fg || oldCell?.bg !== newCell.bg) {
        undoLayer.map.set(key, oldCell ? oldCell : { char: "" });
      }
    });
    return [newLayer, undoLayer];
  }
}

export class LayerView implements ILayerView {
  public constructor(private layers: Layer[]) {}

  keys(): Vector[] {
    const keys = new Set<string>();
    for (const layer of this.layers) {
      [...layer.map.keys()].forEach((key) => keys.add(key));
    }
    return [...keys].map((key) => Vector.fromString(key));
  }

  get(position: Vector): string | null {
    const cell = this.getCell(position);
    return cell ? cell.char : null;
  }

  getCell(position: Vector): ICell | null {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      if (this.layers[i] && this.layers[i].has(position)) {
        const cell = this.layers[i].getCell(position);
        if (cell && (cell.char === "" || cell.char === " ")) {
          return null;
        }
        return cell;
      }
    }
    return null;
  }

  public entries() {
    return this.keys().map((key) => [key, this.get(key)] as [Vector, string]);
  }

  public cellEntries(): [Vector, ICell][] {
    return this.keys()
      .map((key) => [key, this.getCell(key)] as [Vector, ICell | null])
      .filter(([, cell]) => cell !== null) as [Vector, ICell][];
  }
}

