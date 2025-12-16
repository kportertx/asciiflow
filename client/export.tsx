import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TextareaAutosize,
} from "@material-ui/core";
import { ANSI_COLORS, ASCII, UNICODE } from "#asciiflow/client/constants";
import styles from "#asciiflow/client/export.module.css";
import { ICell, ILayerView } from "#asciiflow/client/layer";
import { DrawingId, store } from "#asciiflow/client/store";
import { layerToText } from "#asciiflow/client/text_utils";
import { Box } from "#asciiflow/client/common";
import { Vector } from "#asciiflow/client/vector";
import * as React from "react";
import { useWatchable } from "#asciiflow/common/watchable";

export interface IExportConfig {
  wrapper?: "star" | "star-filled" | "triple-quotes" | "hash" | "slash" | "three-slashes" | "dash" | "apostrophe" | "semicolon" | "backticks" | "four-spaces";
  indent?: number;
  characters?: "basic" | "extended";
  format?: "plain" | "ansi";
}

/**
 * Converts a layer to ANSI-escaped text for terminal display.
 */
function layerToAnsi(layer: ILayerView, box?: Box): string {
  const keys = layer.keys();
  if (keys.length === 0) {
    return "";
  }

  if (!box) {
    // Find the bounding box
    const start = new Vector(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    const end = new Vector(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);

    keys.forEach((position) => {
      start.x = Math.min(start.x, position.x);
      start.y = Math.min(start.y, position.y);
      end.x = Math.max(end.x, position.x);
      end.y = Math.max(end.y, position.y);
    });
    box = new Box(start, end);
  }

  const rows: string[] = [];
  const topLeft = box.topLeft();
  const bottomRight = box.bottomRight();

  for (let y = topLeft.y; y <= bottomRight.y; y++) {
    let row = "";
    let lastFg: number | undefined = undefined;
    let lastBg: number | undefined = undefined;
    let needsReset = false;

    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      const pos = new Vector(x, y);
      const cell = layer.getCell(pos);
      
      if (cell && cell.char && cell.char !== " ") {
        const fg = cell.fg;
        const bg = cell.bg;
        
        // Check if we need to change colors
        if (fg !== lastFg || bg !== lastBg) {
          // Build the escape sequence using \033 (octal) which survives copy/paste
          // and can be interpreted by echo -e or printf '%b'
          const codes: number[] = [];
          
          if (fg !== undefined && fg >= 0 && fg < ANSI_COLORS.length) {
            codes.push(ANSI_COLORS[fg].fg);
          }
          if (bg !== undefined && bg >= 0 && bg < ANSI_COLORS.length) {
            codes.push(ANSI_COLORS[bg].bg);
          }
          
          if (codes.length > 0) {
            row += `\\033[${codes.join(";")}m`;
            needsReset = true;
          } else if (needsReset) {
            row += "\\033[0m";
            needsReset = false;
          }
          
          lastFg = fg;
          lastBg = bg;
        }
        
        // Handle control characters
        let char = cell.char;
        if (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) {
          char = " ";
        }
        row += char;
      } else {
        // Empty cell - if we have active colors, we might need to reset
        if (needsReset) {
          row += "\\033[0m";
          needsReset = false;
          lastFg = undefined;
          lastBg = undefined;
        }
        row += " ";
      }
    }
    
    // Reset at end of line if colors were active
    if (needsReset) {
      row += "\\033[0m";
    }
    
    rows.push(row);
  }

  return rows.join("\n");
}

export function ExportDialog({
  button,
  drawingId,
}: {
  button: React.ReactNode;
  drawingId: DrawingId;
}) {
  return useWatchable(() => {
    const [open, setOpen] = React.useState(false);
    const exportConfig = store.exportConfig.get();
    const format = exportConfig.format ?? "plain";
    
    // Only compute the text if the dialog is open.
    let drawingText = "";
    if (open) {
      const committed = store.canvas(drawingId).committed;
      if (format === "ansi") {
        drawingText = layerToAnsi(committed);
        // Apply character conversion for basic ASCII if needed
        if (exportConfig.characters === "basic") {
          const unicodeToAscii = new Map(
            Object.entries(UNICODE).map(([key, value]) => [
              value,
              (ASCII as any)[key],
            ])
          );
          drawingText = [...drawingText]
            .map((value) => unicodeToAscii.get(value) || value)
            .join("");
        }
      } else {
        drawingText = applyConfig(layerToText(committed), exportConfig);
      }
    }
    
    return (
      <>
        <span onClick={(e) => setOpen(true)}>{button}</span>
        <Dialog
          open={Boolean(open)}
          onClose={() => setOpen(null)}
          className={store.darkMode.get() ? "dark" : ""}
        >
          <DialogTitle>Export drawing</DialogTitle>
          <DialogContent>
            <FormControl className={styles.formControl}>
              <InputLabel>Format</InputLabel>
              <Select
                value={format}
                onChange={(e) =>
                  store.exportConfig.set({
                    ...exportConfig,
                    format: e.target.value as any,
                  })
                }
              >
                <MenuItem value={"plain"}>Plain text</MenuItem>
                <MenuItem value={"ansi"}>
                  ANSI (terminal colors) <CommentTypeChip label="\\e[31m" />
                </MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogContent>
            <FormControl className={styles.formControl}>
              <InputLabel>Character set</InputLabel>
              <Select
                value={exportConfig.characters ?? "extended"}
                onChange={(e) =>
                  store.exportConfig.set({
                    ...exportConfig,
                    characters: e.target.value as any,
                  })
                }
              >
                <MenuItem value={"extended"}>ASCII Extended</MenuItem>
                <MenuItem value={"basic"}>ASCII Basic</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          {format === "plain" && (
            <DialogContent>
              <FormControl className={styles.formControl}>
                <InputLabel>Comment type</InputLabel>
                <Select
                  value={exportConfig.wrapper || "none"}
                  onChange={(e) =>
                    store.exportConfig.set({
                      ...exportConfig,
                      wrapper: e.target.value as any,
                    })
                  }
                >
                  <MenuItem value={"none"}>None</MenuItem>
                  <MenuItem value={"star"}>
                    Standard multi-line <CommentTypeChip label="/* */" />
                  </MenuItem>
                  <MenuItem value={"star-filled"}>
                    Filled multi-line <CommentTypeChip label="/***/" />
                  </MenuItem>
                  <MenuItem value={"triple-quotes"}>
                    Quotes multi-line <CommentTypeChip label='""" """' />
                  </MenuItem>
                  <MenuItem value={"hash"}>
                    Hashes <CommentTypeChip label="#" />
                  </MenuItem>
                  <MenuItem value={"slash"}>
                    Slashes <CommentTypeChip label="//" />
                  </MenuItem>
                  <MenuItem value={"three-slashes"}>
                    Three Slashes <CommentTypeChip label="///" />
                  </MenuItem>
                  <MenuItem value={"dash"}>
                    Dashes <CommentTypeChip label="--" />
                  </MenuItem>
                  <MenuItem value={"apostrophe"}>
                    Apostrophies <CommentTypeChip label="'" />
                  </MenuItem>
                  <MenuItem value={"backticks"}>
                    Backticks multi-line <CommentTypeChip label="``` ```" />
                  </MenuItem>
                  <MenuItem value={"four-spaces"}>
                    Four Spaces <CommentTypeChip label="    " />
                  </MenuItem>
                  <MenuItem value={"semicolon"}>
                    Semicolons <CommentTypeChip label=";" />
                  </MenuItem>
                </Select>
              </FormControl>
            </DialogContent>
          )}
          <DialogContent>
            <TextareaAutosize value={drawingText} className={styles.textArea} />
            {format === "ansi" && (
              <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
                Tip: To view colors, use: <code>echo -e "PASTE_HERE"</code> or <code>printf '%b\n' "PASTE_HERE"</code>
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <CopyToClipboardButton text={drawingText} />
            <Button onClick={() => setOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </>
    );
  });
}

function CommentTypeChip({ label }: { label: React.ReactNode }) {
  return (
    <Chip
      style={{ marginLeft: "5px" }}
      label={
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{label}</span>
      }
      size="small"
    />
  );
}

function CopyToClipboardButton({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        color="primary"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setOpen(true);
        }}
      >
        Copy to clipboard
      </Button>
      <Snackbar
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
        message="Copied drawing to clipboard"
        action={
          <Button color="secondary" size="small" onClick={() => setOpen(false)}>
            Dismiss
          </Button>
        }
      />
    </>
  );
}

function applyConfig(text: string, exportConfig: IExportConfig) {
  function lines() {
    return text.split("\n");
  }
  function setLines(lines: string[]) {
    text = lines.join("\n");
  }
  if (exportConfig.characters === "basic") {
    const unicodeToAscii = new Map(
      Object.entries(UNICODE).map(([key, value]) => [
        value,
        (ASCII as any)[key],
      ])
    );
    text = [...text]
      .map((value) => unicodeToAscii.get(value) || value)
      .join("");
  }
  if (exportConfig.indent) {
    setLines(
      lines().map((line) => `${Array(exportConfig.indent).fill(" ")}${line}`)
    );
  }
  if (exportConfig.wrapper) {
    if (
      exportConfig.wrapper === "star" ||
      exportConfig.wrapper === "star-filled"
    ) {
      setLines([
        "/*",
        ...lines().map((line) =>
          exportConfig.wrapper === "star-filled" ? ` * ${line}` : line
        ),
        " */",
      ]);
    }
    if (exportConfig.wrapper === "triple-quotes") {
      setLines([
        exportConfig.characters === "basic" ? "\"\"\"" : "u\"\"\"",
        ...lines(),
        "\"\"\"",
      ]);
    }
    if (exportConfig.wrapper === "hash") {
      setLines(lines().map((line) => `# ${line}`));
    }
    if (exportConfig.wrapper === "slash") {
      setLines(lines().map((line) => `// ${line}`));
    }
    if (exportConfig.wrapper === "three-slashes") {
      setLines(lines().map((line) => `/// ${line}`));
    }
    if (exportConfig.wrapper === "dash") {
      setLines(lines().map((line) => `-- ${line}`));
    }
    if (exportConfig.wrapper === "apostrophe") {
      setLines(lines().map((line) => `' ${line}`));
    }
    if (exportConfig.wrapper === "backticks") {
      setLines([
        "```",
        ...lines(),
        "```",
      ]);
    }
    if (exportConfig.wrapper === "four-spaces") {
      setLines(lines().map((line) => `    ${line}`));
    }
    if (exportConfig.wrapper === "semicolon") {
      setLines(lines().map((line) => `; ${line}`));
    }
  }
  return text;
}
