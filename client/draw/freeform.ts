import { AbstractDrawFunction } from "#asciiflow/client/draw/function";
import { ICell, Layer } from "#asciiflow/client/layer";
import { store } from "#asciiflow/client/store";
import { Vector } from "#asciiflow/client/vector";

/**
 * Creates a cell with the current foreground and background colors.
 */
function cellWithColors(char: string): ICell {
  return {
    char,
    fg: store.currentFgColor.get(),
    bg: store.currentBgColor.get(),
  };
}

export class DrawFreeform extends AbstractDrawFunction {
  private currentLayer: Layer;

  start(position: Vector) {
    this.currentLayer = new Layer();
    this.currentLayer.set(position, cellWithColors(store.freeformCharacter.get()));
    store.currentCanvas.setScratchLayer(this.currentLayer);
  }

  move(position: Vector) {
    [this.currentLayer] = new Layer().apply(this.currentLayer);
    this.currentLayer.set(position, cellWithColors(store.freeformCharacter.get()));
    store.currentCanvas.setScratchLayer(this.currentLayer);
  }

  end() {
    store.currentCanvas.commitScratch();
  }

  getCursor(position: Vector) {
    return "crosshair";
  }

  handleKey(value: string) {
    if (value && value.length === 1) {
      // The value is not a special character, so lets use it.
      store.freeformCharacter.set(value);
    }
  }
}
