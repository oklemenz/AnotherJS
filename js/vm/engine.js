import * as sound from "./sound.js";
import * as vm from "./vm.js";

import { GAME_PART } from "../resources/index.js";

let timer = null;

let saved_state;

const rewind_buffer = new Array();
let rewind_timestamp;

const REWIND_SIZE = 50;
const REWIND_INTERVAL = 1000;

let prevPart = null;

function tick() {
  const current = Date.now();
  vm.run_tasks();
  if (rewind_timestamp + REWIND_INTERVAL < current) {
    if (rewind_buffer.length == REWIND_SIZE) {
      rewind_buffer.shift();
    }
    rewind_buffer.push(vm.get_state());
    rewind_timestamp = Date.now();
  }

  timer = requestAnimationFrame(tick);
}

export function start() {
  rewind_timestamp = Date.now();
  rewind_buffer.length = 0;

  tick();

  // setInterval(() => {
  //   vm.draw_text("Another World JS", 20, 20, 0x0f);
  // }, 1000);
}

export function pause() {
  if (pauseOn()) {
    return;
  }
  pauseOff();
}

export function pauseOn() {
  if (timer) {
    cancelAnimationFrame(timer);
    timer = null;
    sound.player.pause();
    return true;
  }
  return false;
}

export function pauseOff() {
  // reset timestamp otherwise engine
  // would skip <pause duration> time
  sound.player.resume();
  tick();
  return false;
}

export function rewind() {
  if (rewind_buffer.length != 0) {
    let state = rewind_buffer.pop();
    vm.restore_state(state);
  }
}

export function code() {
  if (prevPart) {
    vm.change_part(prevPart);
    prevPart = null;
  } else {
    const { part } = vm.get_state();
    prevPart = part;
    vm.change_part(GAME_PART.CODE);
  }
}

export function save() {
  saved_state = vm.get_state();
}

export function load() {
  if (saved_state) {
    vm.restore_state(saved_state);
  }
}

export function reset() {
  vm.reset();
  rewind_timestamp = Date.now();
  rewind_buffer.length = 0;
}
