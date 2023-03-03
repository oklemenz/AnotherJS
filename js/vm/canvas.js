import * as palette from "./palette.js";

let SCALE = 3;
let SCREEN_W = 320 * 2;
let SCREEN_H = 200 * 2;
let is_1991 = false;

let _canvas;

export function update(buffer, offset) {
  let context = _canvas.getContext("2d");
  let data = context.getImageData(0, 0, SCREEN_W, SCREEN_H);
  let rgba = new Uint32Array(data.data.buffer);
  if (is_1991) {
    let rgba_offset = 0;
    for (let y = 0; y < SCREEN_H; y += SCALE) {
      for (let x = 0; x < SCREEN_W; x += SCALE) {
        const color =
          palette.palette32[palette.palette_type * 16 + buffer[offset + x]];
        for (let j = 0; j < SCALE; ++j) {
          rgba.fill(
            color,
            rgba_offset + j * SCREEN_W + x,
            rgba_offset + j * SCREEN_W + x + SCALE
          );
        }
      }
      rgba_offset += SCREEN_W * SCALE;
      offset += SCREEN_W * SCALE;
    }
  } else {
    for (let i = 0; i < SCREEN_W * SCREEN_H; ++i) {
      const color = buffer[offset + i];
      if (color < 16) {
        rgba[i] = palette.palette32[palette.palette_type * 16 + color];
      } else {
        rgba[i] = palette.palette_bmp[color - 16];
      }
    }
  }
  context.putImageData(data, 0, 0);
}

export function init(
  canvas,
  W,
  H,
  S
) {
  _canvas = canvas;

  SCALE = S;
  SCREEN_W = W;
  SCREEN_H = H;
}

const _fullscreen = (elem, options) => {
  return elem[
    [
      "requestFullscreen",
      "mozRequestFullScreen",
      "msRequestFullscreen",
      "webkitRequestFullscreen",
    ].find((prop) => typeof elem[prop] === "function")
  ]?.(options);
};

export function fullscreen() {
  _fullscreen(_canvas);
}

export function set_resolution(low) {
  is_1991 = low;
}

export function toggle_resolution() {
  is_1991 = !is_1991;
}
