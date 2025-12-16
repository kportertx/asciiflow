import { Box } from "#asciiflow/client/common";
import {
  isSpecial,
  KEY_BACKSPACE,
  KEY_COPY,
  KEY_CUT,
  KEY_DELETE,
  KEY_PASTE,
} from "#asciiflow/client/constants";
import { AbstractDrawFunction } from "#asciiflow/client/draw/function";
import { DrawMove } from "#asciiflow/client/draw/move";
import { Layer } from "#asciiflow/client/layer";
import { snap } from "#asciiflow/client/snap";
import { IModifierKeys, store, ToolMode } from "#asciiflow/client/store";
import { layerToText, textToLayer } from "#asciiflow/client/text_utils";
import { Vector } from "#asciiflow/client/vector";

export class DrawSelect extends AbstractDrawFunction {
  private moveTool: DrawMove;

  public selectBox: Box;

  private dragStart: Vector;
  private dragEnd: Vector;

  constructor() {
    super();
  }

  start(position: Vector, modifierKeys: IModifierKeys) {
    if (
      this.selectBox != null &&
      this.selectBox.contains(position) &&
      !modifierKeys.shift
    ) {
      // Start a drag.
      this.startDrag(position);
    } else if (
      isSpecial(store.currentCanvas.committed.get(position)) &&
      !modifierKeys.shift
    ) {
      // Start a resize.
      this.moveTool = new DrawMove();
      this.moveTool.start(position);
    } else {
      // Start a selection.
      this.startSelect(position);
    }
  }

  startSelect(position: Vector) {
    this.selectBox = new Box(position, position);
    store.currentCanvas.setSelection(this.selectBox);
  }

  startDrag(position: Vector) {
    this.dragStart = position;
    this.dragEnd = position;
  }

  move(position: Vector) {
    if (this.dragStart != null) {
      this.moveDrag(position);
    } else if (!!this.moveTool) {
      this.moveTool.move(position);
    } else {
      this.moveSelect(position);
    }
  }

  moveSelect(position: Vector) {
    this.selectBox = new Box(this.selectBox.start, position);

    const selectionLayer = new Layer();

    // Use cellEntries to preserve colors
    store.currentCanvas.committed.cellEntries().forEach(([key, cell]) => {
      if (this.selectBox.contains(key)) {
        selectionLayer.setCell(key, cell);
      }
    });

    store.currentCanvas.setScratchLayer(selectionLayer);
    store.currentCanvas.setSelection(this.selectBox);
  }

  moveDrag(position: Vector) {
    this.dragEnd = position;
    const moveDelta = this.dragEnd.subtract(this.dragStart);
    store.currentCanvas.setSelection(
      new Box(
        this.selectBox.topLeft().add(moveDelta),
        this.selectBox.bottomRight().add(moveDelta)
      )
    );

    const layer = new Layer();

    // Erase existing drawing.
    store.currentCanvas.committed.cellEntries().forEach(([key]) => {
      if (this.selectBox.contains(key)) {
        layer.set(key, "");
      }
    });
    // Move characters with colors preserved.
    store.currentCanvas.committed.cellEntries().forEach(([key, cell]) => {
      if (this.selectBox.contains(key)) {
        layer.setCell(key.add(moveDelta), cell);
      }
    });

    // Apply snap adjustments - need to preserve colors
    const snapped = snap(layer, store.currentCanvas.committed);
    for (const [pos, char] of snapped.entries()) {
      const existingCell = layer.getCell(pos);
      if (existingCell && existingCell.char !== char) {
        layer.setCell(pos, { ...existingCell, char });
      } else if (!existingCell) {
        layer.set(pos, char);
      }
    }

    store.currentCanvas.setScratchLayer(layer);
  }

  end() {
    if (this.dragStart != null) {
      store.currentCanvas.commitScratch();
      this.selectBox = new Box(
        this.selectBox.topLeft().add(this.dragEnd).subtract(this.dragStart),
        this.selectBox.bottomRight().add(this.dragEnd).subtract(this.dragStart)
      );
      store.currentCanvas.setSelection(this.selectBox);
    } else if (!!this.moveTool) {
      this.moveTool.end();
      this.moveTool = null;
    }
    this.dragStart = null;
    this.dragEnd = null;
  }

  getCursor(position: Vector) {
    if (this.selectBox != null && this.selectBox.contains(position)) {
      return "pointer";
    }
    if (isSpecial(store.currentCanvas.committed.get(position))) {
      return "move";
    }
    return "default";
  }

  handleKey(value: string, modifierKeys: IModifierKeys) {
    if (this.selectBox != null) {
      // Use the native keyboard for copy pasting.
      if (value === KEY_COPY || value === KEY_CUT) {
        const copiedText = layerToText(
          store.currentCanvas.committed,
          this.selectBox
        );
        navigator.clipboard.writeText(copiedText);
      }
      if (value === KEY_CUT) {
        const layer = new Layer();
        store.currentCanvas.committed.cellEntries().forEach(([key]) => {
          if (this.selectBox.contains(key)) {
            layer.set(key, "");
          }
        });

        // Apply snap adjustments
        const snapped = snap(layer, store.currentCanvas.committed);
        for (const [pos, char] of snapped.entries()) {
          const existingCell = layer.getCell(pos);
          if (existingCell && existingCell.char !== char) {
            layer.setCell(pos, { ...existingCell, char });
          } else if (!existingCell) {
            layer.set(pos, char);
          }
        }

        store.currentCanvas.setScratchLayer(layer);
        store.currentCanvas.commitScratch();
      }
    }
    if (value === KEY_BACKSPACE || value === KEY_DELETE) {
      const layer = new Layer();
      store.currentCanvas.committed.cellEntries().forEach(([key]) => {
        if (this.selectBox.contains(key)) {
          layer.set(key, "");
        }
      });

      // Apply snap adjustments
      const snapped = snap(layer, store.currentCanvas.committed);
      for (const [pos, char] of snapped.entries()) {
        const existingCell = layer.getCell(pos);
        if (existingCell && existingCell.char !== char) {
          layer.setCell(pos, { ...existingCell, char });
        } else if (!existingCell) {
          layer.set(pos, char);
        }
      }

      store.currentCanvas.setScratchLayer(layer);
      store.currentCanvas.commitScratch();
    }

    // store.setToolMode(ToolMode.TEXT);
    // store.currentTool.handleKey(value, modifierKeys);
  }
}
