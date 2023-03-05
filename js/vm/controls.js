import * as memory from "./memory.js";

import { VAR } from "./memory.js";

export const KEY_CODE = {
  UP: 1,
  RIGHT: 2,
  DOWN: 3,
  LEFT: 4,
  ACTION: 5,
  JUMP: 6,
  FF: 7
};

let gamepadState = new Array(6);
let keyboardState = new Array(6);

export function buttonPressed(b) {
  if (typeof b === "object") {
    return b.pressed;
  }
  return b === 1.0;
}

export function pollGamepads() {
  const gamepads = navigator.getGamepads();
  if (!gamepads) {
    return;
  }

  const gamepad = gamepads[0];

  if (gamepad) {
    gamepadState[KEY_CODE.UP] = gamepad.axes[1] < -0.5;
    gamepadState[KEY_CODE.DOWN] = gamepad.axes[1] > 0.5;
    gamepadState[KEY_CODE.LEFT] = gamepad.axes[0] < -0.5;
    gamepadState[KEY_CODE.RIGHT] = gamepad.axes[0] > 0.5;

    gamepadState[KEY_CODE.JUMP] = buttonPressed(gamepad.buttons[1]);
    gamepadState[KEY_CODE.ACTION] = buttonPressed(gamepad.buttons[0]);

    gamepadState[KEY_CODE.FF] = buttonPressed(gamepad.buttons[5]) || buttonPressed(gamepad.buttons[7]);
  }
}

export function is_key_pressed(code) {
  return keyboardState[code] || gamepadState[code];
}

const controls = {
  " ": KEY_CODE.ACTION,
  Enter: KEY_CODE.ACTION,
  Shift: KEY_CODE.JUMP,
  ArrowUp: KEY_CODE.UP,
  ArrowDown: KEY_CODE.DOWN,
  ArrowLeft: KEY_CODE.LEFT,
  ArrowRight: KEY_CODE.RIGHT,
  f: KEY_CODE.FF
};

function set_key_pressed(e, state) {
  if (e.key in controls) {
    e.preventDefault();
    const code = controls[e.key];
    keyboardState[code] = state;
  }
}

function setState(state) {
  if (!state) {
    setLeft(false);
    setRight(false);
    setUp(false);
    setDown(false);
    setAction(false);
    return;
  }
  if (!acceptInput) {
    return;
  }
  let width = window.canvas.width;
  let height = window.canvas.height;
  if (mousePos.x >= 0 && mousePos.x <= (1 / 3) * width && mousePos.y >= 0 && mousePos.y <= height) {
    let _faceRight = faceRight;
    faceRight = false;
    if (mousePos.x <= (1 / 6) * width) {
      setAction(true);
    } else {
      setAction(false);
    }
    if (mousePos.y <= (1 / 3) * height) {
      if (_faceRight === true) {
        setLeft(true);
        return;
      }
    } else {
      setLeft(true);
      setUp(false);
      return;
    }
  }
  if (mousePos.x >= (2 / 3) * width && mousePos.x <= width && mousePos.y >= 0 && mousePos.y <= height) {
    let _faceRight = faceRight;
    faceRight = true;
    if (mousePos.x >= (5 / 6) * width) {
      setAction(true);
    } else {
      setAction(false);
    }
    if (mousePos.y <= (1 / 3) * height) {
      if (_faceRight === false) {
        setRight(true);
        return;
      }
    } else {
      setRight(true);
      setUp(false);
      return;
    }
  }
  if (mousePos.x >= 0 && mousePos.x <= width && mousePos.y >= 0 && mousePos.y <= (1 / 3) * height) {
    setUp(true);
  }
  if (mousePos.x >= 0 && mousePos.x <= width && mousePos.y >= (2 / 3) * height && mousePos.y <= height) {
    setDown(true);
  }
  if (
    mousePos.x >= (0.5 * width) / 3 &&
    mousePos.x <= (2.5 * width) / 3 &&
    mousePos.y >= (0.5 * height) / 3 &&
    mousePos.y <= (2.5 * height) / 3
  ) {
    setAction(true);
  }
}

function setLeft(state) {
  keyboardState[KEY_CODE.LEFT] = state;
  acceptInput = false;
}

function setUp(state) {
  keyboardState[KEY_CODE.UP] = state;
  acceptInput = false;
}

function setRight(state) {
  keyboardState[KEY_CODE.RIGHT] = state;
  acceptInput = false;
}

function setDown(state) {
  keyboardState[KEY_CODE.DOWN] = state;
  acceptInput = false;
}

function setAction(state) {
  keyboardState[KEY_CODE.ACTION] = state;
  acceptInput = false;
}

let mousePos = null;
let touchCount = 0;
let faceRight = null;
let acceptInput = true;

export function bind_events() {
  document.onkeydown = function (e) {
    set_key_pressed(e, 1);
  };
  document.onkeyup = function (e) {
    set_key_pressed(e, 0);
  };
  window.onPress = (p, c) => {
    mousePos = p;
    touchCount = c;
    setState(true);
  };
  window.onRelease = (p, c) => {
    touchCount = c;
    if (touchCount === 0) {
      setState(false);
      mousePos = null;
    }
  };
  window.onMove = (p, c) => {
    touchCount = c;
    if (mousePos) {
      mousePos = p;
      setState(true);
    }
  };
}

export function update_input() {
  let mask = 0;

  memory.vmVars[VAR.HERO_POS_LEFT_RIGHT] = 0;
  memory.vmVars[VAR.HERO_POS_JUMP_DOWN] = 0;
  memory.vmVars[VAR.HERO_POS_UP_DOWN] = 0;
  memory.vmVars[VAR.HERO_ACTION] = 0;

  if (is_key_pressed(KEY_CODE.RIGHT)) {
    memory.vmVars[VAR.HERO_POS_LEFT_RIGHT] = 1;
    mask |= 1;
  } else if (is_key_pressed(KEY_CODE.LEFT)) {
    memory.vmVars[VAR.HERO_POS_LEFT_RIGHT] = -1;
    mask |= 2;
  }

  if (is_key_pressed(KEY_CODE.DOWN)) {
    memory.vmVars[VAR.HERO_POS_JUMP_DOWN] = 1;
    memory.vmVars[VAR.HERO_POS_UP_DOWN] = 1;
    mask |= 4;
  } else if (is_key_pressed(KEY_CODE.UP)) {
    memory.vmVars[VAR.HERO_POS_JUMP_DOWN] = -1;
    memory.vmVars[VAR.HERO_POS_UP_DOWN] = -1;
    mask |= 8;
  }

  if (is_key_pressed(KEY_CODE.JUMP)) {
    memory.vmVars[VAR.HERO_POS_JUMP_DOWN] = -1;
    memory.vmVars[VAR.HERO_POS_UP_DOWN] = 0;
    mask |= 8;
  }

  memory.vmVars[VAR.HERO_POS_MASK] = mask;

  if (is_key_pressed(KEY_CODE.ACTION)) {
    memory.vmVars[VAR.HERO_ACTION] = 1;
    mask |= 0x80;
  }

  memory.vmVars[VAR.HERO_ACTION_POS_MASK] = mask;
  acceptInput = true;
}
