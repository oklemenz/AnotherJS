import { GAME_PART } from "./resources/index.js";
import * as vm from "./vm/vm.js";
import * as engine from "./vm/engine.js";

let started = false;
const overlayElm = document.getElementById("output");
const startElm = document.getElementById("start");
const canvasElm = document.getElementById("screen");
window.canvas = canvasElm;

document.addEventListener("visibilitychange", function () {
  if (document.visibilityState !== "visible") {
    engine.pauseOn();
  } else {
    engine.pauseOff();
  }
});

function pause() {
  engine.pause();
}

function queryParams() {
  let part = 16001;
  let pos = 0;
  let query = new URLSearchParams(window.location.search);
  if (query.get("part") || query.get("p")) {
    const queryPart = parseInt(query.get("part") || query.get("p"), 10);
    if (!isNaN(queryPart) && queryPart >= 0 && queryPart <= 8) {
      part = 16000 + queryPart;
    }
  }
  if (query.get("pos") || query.get("p")) {
    const queryPos = parseInt(query.get("pos") || query.get("o"), 10);
    if (!isNaN(queryPos) && queryPos >= 0 && queryPos <= 60) {
      pos = queryPos;
    }
  }
  return {
    part,
    pos
  };
}

async function start() {
  if (started) {
    return;
  }
  started = true;
  await vm.init(canvasElm);
  const { part, pos } = queryParams();
  vm.change_part(part, pos);
  engine.start();
}

startElm.addEventListener("click", () => {
  start();
  overlayElm.style.display = "none";
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Escape") {
    pause();
  } else if (e.key === "c") {
    engine.code();
  } else if (e.key === " " || e.key === "Enter") {
    start();
  } else if (e.key === "r") {
    engine.reset();
  } else if (e.key === "i") {
    vm.change_part(GAME_PART.INTRODUCTION);
  }
});
