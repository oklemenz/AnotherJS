import { GAME_PART } from "./resources/index.js";
import * as vm from "./vm/vm.js";
import * as engine from "./vm/engine.js";

let started = false;
const overlayElm = document.getElementById("output")
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
  engine.pause()
}

function queryPart() {
  let query = new URLSearchParams(window.location.search);
  if (query.get("part") || query.get("p")) {
    let queryPart = parseInt(query.get("part") || query.get("p"), 10);
    if ((!isNaN(queryPart) && queryPart >= 0 && queryPart <= 8)) {
      return 16000 + queryPart;
    }
  }
  return 16001;
}

async function start() {
  if (started) return;
  started = true;
  await vm.init(canvasElm);
  vm.change_part(queryPart(), 0);
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

const restartPos = [
  [16000, 0],
  [16001, 0],
  [16002, 10],
  // [16002, 12],
  // [16002, 14],
  [16003, 20],
  [16003, 24],
  // [16003, 26],
  [16004, 30],
  [16004, 31],
  // [16004, 32],
  [16004, 33],
  // [16004, 34],
  [16004, 35],
  // [16004, 36],
  [16004, 37],
  // [16004, 38],
  [16004, 39],
  // [16004, 40],
  [16004, 41],
  // [16004, 42],
  // [16004, 43],
  // [16004, 44],
  // [16004, 45],
  // [16004, 46],
  // [16004, 47],
  // [16004, 48],
  [16004, 49],
  [16005, 50],
  [16006, 64],
  // [16006, 65],
  [16006, 66],
  // [16006, 67],
  // [16006, 68],
  [16006, 60],
  [16007, 0],
  [16008, 0],
];
