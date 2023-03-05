import {
  DATA,
  font,
  load,
  GAME_PART,
  partsList,
  strings_en,
  strings_fr,
  STRINGS_LANGUAGE
} from "../resources/index.js";

import * as screen from "./canvas.js";
import * as palette from "./palette.js";
import * as controls from "./controls.js";
import * as sound from "./sound.js";
import * as memory from "./memory.js";

import { VAR } from "./memory.js";
import { KEY_CODE } from "./controls.js";
import { OP_CODE, DRAW_POLY_BACKGROUND, DRAW_POLY_SPRITE } from "./opcodes.js";

const BYPASS_PROTECTION = true;

let strings_language = STRINGS_LANGUAGE.EN;

const SCALE = 3;
const SCREEN_W = 320 * SCALE;
const SCREEN_H = 200 * SCALE;
const PAGE_SIZE = SCREEN_W * SCREEN_H;

const FPS = 50;

let buffer8 = new Uint8Array(4 * PAGE_SIZE);
let current_page0; // current
let current_page1; // front
let current_page2; // back
let next_palette = -1;

let bytecode;
let polygons1;
let polygons2;
let bytecode_offset;

let task_num;
let task_paused;

let next_part;
let current_part = 0;

let timestamp;

function read_byte() {
  const value = bytecode[bytecode_offset];
  bytecode_offset += 1;
  return value;
}

function read_be_uint16(buf, offset) {
  return (buf[offset] << 8) | buf[offset + 1];
}

function read_word() {
  const value = read_be_uint16(bytecode, bytecode_offset);
  bytecode_offset += 2;
  return value;
}

function to_signed(value, bits) {
  const mask = 1 << (bits - 1);
  return value - ((value & mask) << 1);
}

function execute_task() {
  while (!task_paused) {
    const opcode = read_byte();
    if (opcode & DRAW_POLY_BACKGROUND) {
      // DRAW_POLY_BACKGROUND
      const offset = (((opcode << 8) | read_byte()) << 1) & 0xfffe;
      let x = read_byte();
      let y = read_byte();
      let h = y - 199;
      if (h > 0) {
        y = 199;
        x += h;
      }
      draw_shape(polygons1, offset, 0xff, 64, x, y);
    } else if (opcode & DRAW_POLY_SPRITE) {
      // DRAW_POLY_SPRITE
      const offset = (read_word() << 1) & 0xfffe;
      let x = read_byte();
      if ((opcode & 0x20) == 0) {
        if ((opcode & 0x10) == 0) {
          x = (x << 8) | read_byte();
        } else {
          x = memory.vmVars[x];
        }
      } else {
        if (opcode & 0x10) {
          x += 256;
        }
      }
      let y = read_byte();
      if ((opcode & 8) == 0) {
        if ((opcode & 4) == 0) {
          y = (y << 8) | read_byte();
        } else {
          y = memory.vmVars[y];
        }
      }
      let polygons = polygons1;
      let zoom = 64;
      if ((opcode & 2) == 0) {
        if (opcode & 1) {
          zoom = memory.vmVars[read_byte()];
        }
      } else {
        if (opcode & 1) {
          polygons = polygons2;
        } else {
          zoom = read_byte();
        }
      }
      draw_shape(polygons, offset, 0xff, zoom, x, y);
    } else {
      console.assert(opcode <= 0x1a);
      if (!vm[opcode]) {
        console.log(`opcode ${opcode} not implemented`);
      } else {
        vm[opcode]();
      }
    }
  }
}

export function run_tasks() {
  if (next_part != 0) {
    restart(next_part);
    current_part = next_part;
    next_part = 0;
  }

  for (let i = 0; i < memory.vmTasks.length; ++i) {
    memory.vmTasks[i].state = memory.vmTasks[i].next_state;
    const offset = memory.vmTasks[i].next_offset;
    if (offset != -1) {
      memory.vmTasks[i].offset = offset == -2 ? -1 : offset;
      memory.vmTasks[i].next_offset = -1;
    }
  }

  controls.pollGamepads();
  controls.update_input();
  // draw_text("Another World JS", 20, 20, 0x0f);

  for (let i = 0; i < memory.vmTasks.length; ++i) {
    if (memory.vmTasks[i].state == 0) {
      const offset = memory.vmTasks[i].offset;
      if (offset != -1) {
        bytecode_offset = offset;
        memory.vmTasks[i].stack.length = 0;
        task_num = i;
        task_paused = false;
        execute_task();
        memory.vmTasks[i].offset = bytecode_offset;
      }
    }
  }
}

function restart(part, pos = 0) {
  const ResPart = partsList[part];
  if (!ResPart) {
    throw "Part not found: " + part;
  }

  palette.set_palette(load(ResPart[0], ResPart[1]));
  bytecode = load(ResPart[2], ResPart[3]);
  polygons1 = load(ResPart[4], ResPart[5]);
  polygons2 = load(ResPart[6], ResPart[7]);

  for (let i = 0; i < memory.vmTasks.length; ++i) {
    memory.vmTasks[i] = {
      state: 0,
      next_state: 0,
      offset: -1,
      next_offset: -1,
      stack: []
    };
  }

  memory.vmTasks[0].offset = 0;
  memory.vmVars[0] = pos;
}

function get_page(num) {
  if (num == 0xff) {
    return current_page2;
  } else if (num == 0xfe) {
    return current_page1;
  } else {
    console.assert(num < 4);
    return num;
  }
}

function fill_page(num, color) {
  // console.log(`Script::op_fillPage(${num}, ${color})`)
  num = get_page(num);
  buffer8.fill(color, num * PAGE_SIZE, (num + 1) * PAGE_SIZE);
}

function copy_page(src, dst, vscroll) {
  dst = get_page(dst);
  if (src >= 0xfe) {
    src = get_page(src);
    buffer8.set(buffer8.subarray(src * PAGE_SIZE, (src + 1) * PAGE_SIZE), dst * PAGE_SIZE);
  } else {
    if ((src & 0x80) == 0) {
      vscroll = 0;
    }
    src = get_page(src & 3);
    if (dst == src) {
      return;
    }
    const dst_offset = dst * PAGE_SIZE;
    const src_offset = src * PAGE_SIZE;
    if (vscroll == 0) {
      buffer8.set(buffer8.subarray(src_offset, src_offset + PAGE_SIZE), dst_offset);
    } else {
      //console.log( 'vscroll:' + vscroll );
      vscroll *= SCALE;
      if (vscroll > -SCREEN_W && vscroll < SCREEN_W) {
        const h = vscroll * SCREEN_W;
        if (vscroll < 0) {
          buffer8.set(buffer8.subarray(src_offset - h, src_offset + PAGE_SIZE), dst_offset);
        } else {
          buffer8.set(buffer8.subarray(src_offset, src_offset + PAGE_SIZE - h), dst_offset + h);
        }
      }
    }
  }
}

function draw_point(page, color, x, y) {
  if (x < 0 || x >= SCREEN_W || y < 0 || y >= SCREEN_H) {
    return;
  }
  const offset = page * PAGE_SIZE + y * SCREEN_W + x;
  if (color == 0x11) {
    console.assert(page != 0);
    buffer8[offset] = buffer8[y * SCREEN_W + x];
  } else if (color == 0x10) {
    buffer8[offset] |= 8;
  } else {
    console.assert(color < 0x10);
    buffer8[offset] = color;
  }
}

function draw_line(page, color, y, x1, x2) {
  if (x1 > x2) {
    const tmp = x1;
    x1 = x2;
    x2 = tmp;
  }
  if (x1 >= SCREEN_W || x2 < 0) {
    return;
  }
  if (x1 < 0) {
    x1 = 0;
  }
  if (x2 >= SCREEN_W) {
    x2 = SCREEN_W - 1;
  }
  const offset = page * PAGE_SIZE + y * SCREEN_W;
  if (color == 0x11) {
    console.assert(page != 0);
    buffer8.set(buffer8.subarray(y * SCREEN_W + x1, y * SCREEN_W + x2 + 1), offset + x1);
  } else if (color == 0x10) {
    for (let i = x1; i <= x2; ++i) {
      buffer8[offset + i] |= 8;
    }
  } else {
    console.assert(color < 0x10);
    buffer8.fill(color, offset + x1, offset + x2 + 1);
  }
}

function draw_polygon(page, color, vertices) {
  // scanline fill
  let i = 0;
  let j = vertices.length - 1;
  let scanline = Math.min(vertices[i].y, vertices[j].y);
  let f2 = vertices[i++].x << 16;
  let f1 = vertices[j--].x << 16;
  let count = vertices.length;
  for (count -= 2; count != 0; count -= 2) {
    const h1 = vertices[j].y - vertices[j + 1].y;
    const step1 = (((vertices[j].x - vertices[j + 1].x) << 16) / (h1 == 0 ? 1 : h1)) >> 0;
    j -= 1;
    const h2 = vertices[i].y - vertices[i - 1].y;
    const step2 = (((vertices[i].x - vertices[i - 1].x) << 16) / (h2 == 0 ? 1 : h2)) >> 0;
    i += 1;
    f1 = (f1 & 0xffff0000) | 0x7fff;
    f2 = (f2 & 0xffff0000) | 0x8000;
    if (h2 == 0) {
      f1 += step1;
      f2 += step2;
    } else {
      for (let k = 0; k < h2; ++k) {
        if (scanline >= 0) {
          draw_line(page, color, scanline, f1 >> 16, f2 >> 16);
        }
        f1 += step1;
        f2 += step2;
        scanline += 1;
        if (scanline >= SCREEN_H) {
          return;
        }
      }
    }
  }
}

function fill_polygon(data, offset, color, zoom, x, y) {
  const w = ((data[offset++] * zoom) / 64) >> 0;
  const h = ((data[offset++] * zoom) / 64) >> 0;
  const x1 = (x * SCALE - (w * SCALE) / 2) >> 0;
  const x2 = (x * SCALE + (w * SCALE) / 2) >> 0;
  const y1 = (y * SCALE - (h * SCALE) / 2) >> 0;
  const y2 = (y * SCALE + (h * SCALE) / 2) >> 0;
  if (x1 >= SCREEN_W || x2 < 0 || y1 >= SCREEN_H || y2 < 0) {
    return;
  }
  const count = data[offset++];
  console.assert((count & 1) == 0);
  let vertices = new Array();
  for (let i = 0; i < count; ++i) {
    const vx = x1 + (((data[offset++] * zoom) / 64) >> 0) * SCALE;
    const vy = y1 + (((data[offset++] * zoom) / 64) >> 0) * SCALE;
    vertices.push({ x: vx, y: vy });
  }
  if (count == 4 && w == 0 && h <= 1) {
    draw_point(current_page0, color, x1, y1);
  } else {
    draw_polygon(current_page0, color, vertices);
  }
}

function draw_shape_parts(data, offset, zoom, x, y) {
  const x0 = (x - (data[offset++] * zoom) / 64) >> 0;
  const y0 = (y - (data[offset++] * zoom) / 64) >> 0;
  const count = data[offset++];
  for (let i = 0; i <= count; ++i) {
    const addr = (data[offset] << 8) | data[offset + 1];
    offset += 2;
    const x1 = (x0 + (data[offset++] * zoom) / 64) >> 0;
    const y1 = (y0 + (data[offset++] * zoom) / 64) >> 0;
    let color = 0xff;
    if (addr & 0x8000) {
      color = data[offset] & 0x7f;
      offset += 2;
    }
    draw_shape(data, (addr << 1) & 0xfffe, color, zoom, x1, y1);
  }
}

function draw_shape(data, offset, color, zoom, x, y) {
  const code = data[offset++];
  if (code >= 0xc0) {
    if (color & 0x80) {
      color = code & 0x3f;
    }
    fill_polygon(data, offset, color, zoom, x, y);
  } else {
    if ((code & 0x3f) == 2) {
      draw_shape_parts(data, offset, zoom, x, y);
    }
  }
}

function put_pixel(page, x, y, color) {
  let offset = page * PAGE_SIZE + (y * SCREEN_W + x) * SCALE;
  for (let j = 0; j < SCALE; ++j) {
    buffer8.fill(color, offset, offset + SCALE);
    offset += SCREEN_W;
  }
}

function draw_char(page, chr, color, x, y) {
  if (x < 320 / 8 && y < 200 - 8) {
    for (let j = 0; j < 8; ++j) {
      const mask = font[(chr - 32) * 8 + j];
      for (let i = 0; i < 8; ++i) {
        if ((mask & (1 << (7 - i))) != 0) {
          put_pixel(page, x * 8 + i, y + j, color);
        }
      }
    }
  }
}

function draw_string(num, color, x, y) {
  let strings = strings_en;
  if (strings_language == STRINGS_LANGUAGE.FR && num in strings_fr) {
    strings = strings_fr;
  }
  if (num in strings) {
    const str = strings[num];
    draw_text(str, color, x, y);
  }
}

export function draw_text(str, color, x, y) {
  const x0 = x;
  for (let i = 0; i < str.length; ++i) {
    const chr = str.charCodeAt(i);
    if (chr == 10) {
      y += 8;
      x = x0;
    } else {
      draw_char(current_page0, chr, color, x, y);
      x += 1;
    }
  }
}

function draw_bitmap(num) {
  const bitmap = DATA.bitmaps[num];
  const size = bitmap[1];
  console.assert(size == 32000);
  const buf = load(bitmap[0], size);
  let offset = 0;
  for (let y = 0; y < 200; ++y) {
    for (let x = 0; x < 320; x += 8) {
      for (let b = 0; b < 8; ++b) {
        const mask = 1 << (7 - b);
        let color = 0;
        for (let p = 0; p < 4; ++p) {
          if (buf[offset + p * 8000] & mask) {
            color |= 1 << p;
          }
        }
        put_pixel(0, x + b, y, color);
      }
      offset += 1;
    }
  }
}

function update_display(num) {
  if (num != 0xfe) {
    if (num == 0xff) {
      const tmp = current_page1;
      current_page1 = current_page2;
      current_page2 = tmp;
    } else {
      current_page1 = get_page(num);
    }
  }
  if (next_palette != -1) {
    const offset = next_palette * 32;
    palette.set_palette_444(offset, palette.PALETTE_TYPE.AMIGA);
    palette.set_palette_ega(offset + 1024);
    palette.set_palette_444(offset + 1024, palette.PALETTE_TYPE.VGA);
    next_palette = -1;
  }

  screen.update(
    buffer8,
    current_page1 * PAGE_SIZE // offset
  );
}

const vm = {
  [OP_CODE.movConst]() {
    const num = read_byte();
    const imm = to_signed(read_word(), 16);
    memory.vmVars[num] = imm;
  },
  [OP_CODE.mov]() {
    const dst = read_byte();
    const src = read_byte();
    memory.vmVars[dst] = memory.vmVars[src];
  },
  [OP_CODE.add]() {
    const dst = read_byte();
    const src = read_byte();
    memory.vmVars[dst] += memory.vmVars[src];
  },
  [OP_CODE.addConst]() {
    // gun sound workaround
    // if (current_part === GAME_PART.BATHS) {
    //   sound.play_sound(0x5B, 1, 64, 1);
    // }

    const num = read_byte();
    const imm = to_signed(read_word(), 16);
    memory.vmVars[num] += imm;
  },
  [OP_CODE.call]() {
    const addr = read_word();
    memory.vmTasks[task_num].stack.push(bytecode_offset);
    bytecode_offset = addr;
  },
  [OP_CODE.ret]() {
    bytecode_offset = memory.vmTasks[task_num].stack.pop();
  },
  [OP_CODE.pauseThread]() {
    task_paused = true;
  },
  [OP_CODE.jmp]() {
    bytecode_offset = read_word();
  },
  [OP_CODE.setSetVect]() {
    const num = read_byte();
    const addr = read_word();
    memory.vmTasks[num].next_offset = addr;
  },
  [OP_CODE.jnz]() {
    const num = read_byte();
    memory.vmVars[num] -= 1;
    const addr = read_word();
    if (memory.vmVars[num] != 0) {
      bytecode_offset = addr;
    }
  },
  [OP_CODE.condJmp]() {
    const op = read_byte();
    const b = memory.vmVars[read_byte()];
    let a;
    if (op & 0x80) {
      a = memory.vmVars[read_byte()];
    } else if (op & 0x40) {
      a = to_signed(read_word(), 16);
    } else {
      a = read_byte();
    }
    const addr = read_word();
    switch (op & 7) {
      case 0:
        if (b == a) {
          bytecode_offset = addr;
        }
        break;
      case 1:
        if (b != a) {
          bytecode_offset = addr;
        }
        break;
      case 2:
        if (b > a) {
          bytecode_offset = addr;
        }
        break;
      case 3:
        if (b >= a) {
          bytecode_offset = addr;
        }
        break;
      case 4:
        if (b < a) {
          bytecode_offset = addr;
        }
        break;
      case 5:
        if (b <= a) {
          bytecode_offset = addr;
        }
        break;
    }
  },
  [OP_CODE.setPalette]() {
    next_palette = read_word() >> 8;
  },
  [OP_CODE.resetThread]() {
    const start = read_byte();
    const end = read_byte();
    const state = read_byte();
    if (state == 2) {
      for (let i = start; i <= end; ++i) {
        memory.vmTasks[i].next_offset = -2;
      }
    } else {
      console.assert(state == 0 || state == 1);
      for (let i = start; i <= end; ++i) {
        memory.vmTasks[i].next_state = state;
      }
    }
  },
  [OP_CODE.selectVideoPage]() {
    const num = read_byte();
    current_page0 = get_page(num);
  },
  [OP_CODE.fillVideoPage]() {
    const num = read_byte();
    const color = read_byte();
    fill_page(num, color);
  },
  [OP_CODE.copyVideoPage]() {
    const src = read_byte();
    const dst = read_byte();
    copy_page(src, dst, memory.vmVars[VAR.SCROLL_Y]);
  },
  [OP_CODE.blitFramebuffer]() {
    const pageId = read_byte();

    const fastMode = controls.is_key_pressed(KEY_CODE.FF);

    if (!fastMode && memory.vmVars[VAR.PAUSE_SLICES] !== 0) {
      const delay = Date.now() - timestamp;

      // The bytecode will set vmVariables[VM_VARIABLE_PAUSE_SLICES] from 1 to 5
      // The virtual machine hence indicate how long the image should be displayed.
      const timeToSleep = (memory.vmVars[VAR.PAUSE_SLICES] * 1000) / FPS - delay;

      if (timeToSleep > 0) {
        const t = timestamp + timeToSleep;
        while (timestamp < t) {
          timestamp = Date.now();
        }
      }
    }

    timestamp = Date.now();

    memory.vmVars[VAR.WTF] = 0;
    update_display(pageId);
  },
  [OP_CODE.killThread]() {
    bytecode_offset = -1;
    task_paused = true;
  },
  [OP_CODE.drawString]() {
    const num = read_word();
    const x = read_byte();
    const y = read_byte();
    const color = read_byte();
    draw_string(num, color, x, y);
  },
  [OP_CODE.sub]() {
    const dst = read_byte();
    const src = read_byte();
    memory.vmVars[dst] -= memory.vmVars[src];
  },
  [OP_CODE.and]() {
    const num = read_byte();
    const imm = read_word();
    memory.vmVars[num] = to_signed(memory.vmVars[num] & imm & 0xffff, 16);
  },
  [OP_CODE.or]() {
    const num = read_byte();
    const imm = read_word();
    memory.vmVars[num] = to_signed((memory.vmVars[num] | imm) & 0xffff, 16);
  },
  [OP_CODE.shl]() {
    const num = read_byte();
    const imm = read_word() & 15;
    memory.vmVars[num] = to_signed((memory.vmVars[num] << imm) & 0xffff, 16);
  },
  [OP_CODE.shr]() {
    // shr
    const num = read_byte();
    const imm = read_word() & 15;
    memory.vmVars[num] = to_signed((memory.vmVars[num] & 0xffff) >> imm, 16);
  },
  [OP_CODE.playSound]() {
    const num = read_word();
    const freq = read_byte();
    const volume = read_byte();
    const channel = read_byte();
    sound.play_sound(num, freq, volume, channel);
  },
  [OP_CODE.updateMemList]() {
    const num = read_word();
    if (num > GAME_PART.PROTECTION) {
      next_part = num;
    } else if (num in DATA.bitmaps) {
      if (num >= 3000) {
        // should also load t3%d.bmp files for transparency (color 0x10)
        const bitmap = DATA.bitmaps[num];
        palette.set_palette_bmp(load(bitmap[0], 256 * 3));
        buffer8.set(load(bitmap[1], SCREEN_W * SCREEN_H));
      } else {
        draw_bitmap(num);
      }
    }
  },
  [OP_CODE.playMusic]() {
    const num = read_word();
    const period = read_word();
    const position = read_byte();
    sound.play_music(num, period, position);
  }
};

// PUBLIC API
export function get_state() {
  return {
    part: current_part,
    vars: memory.vmVars.slice(),
    tasks: JSON.parse(JSON.stringify(memory.vmTasks)),
    buffer8: buffer8.slice(),
    palette32: palette.palette32.slice()
  };
}

export function restore_state(state) {
  memory.vmVars.splice(0, memory.vmVars.length, ...state.vars);
  memory.vmTasks.splice(0, memory.vmTasks.length, ...state.tasks);
  buffer8 = state.buffer8;
  palette.set_palette32(state.palette32);
}

export function reset() {
  current_page2 = 1;
  current_page1 = 2;
  current_page0 = get_page(0xfe);
  buffer8.fill(0);
  next_palette = -1;
  memory.vmVars.fill(0);

  memory.vmVars[VAR.RANDOM_SEED] = Date.now();
  // memory.vmVars[VAR.HACK_VAR_54] = 0x0081;

  if (BYPASS_PROTECTION) {
    memory.vmVars[VAR.HACK_VAR_BC] = 0x10;
    memory.vmVars[VAR.HACK_VAR_C6] = 0x80;
    memory.vmVars[VAR.HACK_VAR_F2] = 4000; // 4000 for Amiga bytecode
    memory.vmVars[VAR.HACK_VAR_DC] = 33;
  }
  memory.vmVars[VAR.HACK_VAR_E4] = 20;

  next_part = BYPASS_PROTECTION ? GAME_PART.INTRODUCTION : GAME_PART.PROTECTION;
  sound.player?.stopMusic();
}

export function change_part(num, pos = 0) {
  next_part = num;
  restart(next_part, pos);
  current_part = next_part;
  next_part = 0;
}

export function set_language(num) {
  strings_language = num;
}

export async function init(canvas) {
  screen.init(canvas, SCREEN_W, SCREEN_H, SCALE);
  await sound.init();

  sound.player.setModifyVarCallback((variable, value) => {
    memory.vmVars[variable] = value;
  });

  controls.bind_events();
  reset();
}
