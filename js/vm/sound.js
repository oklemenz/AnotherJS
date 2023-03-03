import { DATA, load_modules, load_sounds } from "../resources/index.js";
import { SfxPlayer } from "../sound/SfxPlayer.js";

const freqTable = [
  0x0cff, 0x0dc3, 0x0e91, 0x0f6f, 0x1056, 0x114e, 0x1259, 0x136c, 0x149f,
  0x15d9, 0x1726, 0x1888, 0x19fd, 0x1b86, 0x1d21, 0x1ede, 0x20ab, 0x229c,
  0x24b3, 0x26d7, 0x293f, 0x2bb2, 0x2e4c, 0x3110, 0x33fb, 0x370d, 0x3a43,
  0x3ddf, 0x4157, 0x4538, 0x4998, 0x4dae, 0x5240, 0x5764, 0x5c9a, 0x61c8,
  0x6793, 0x6e19, 0x7485, 0x7bbd,
];

// SOUNDS
export let player;

export async function init() {
  player = new SfxPlayer();
  await player.init();
  if (!load_sounds()) {
    console.log("error loading sounds");
    player = null;
  }
  load_modules();
}

export function play_music(resNum, delay, pos) {
  if (player === null) return;

  if (resNum !== 0) {
    // _ply->loadSfxModule(resNum, delay, pos);
    player.loadSfxModule(resNum, delay, pos, DATA);
    player.startMusic();
    player.playMusic();
  } else if (delay !== 0) {
    player.setEventsDelay(delay, true);
  } else {
    player.stopMusic();
  }
}

export function play_sound(
  resNum,
  freq,
  vol,
  channel
) {
  if (player === null) return;

  if (vol === 0) {
    player.stopSoundChannel(channel);
    return;
  }
  if (vol > 63) {
    vol = 63;
  }
  try {
    if (DATA.sounds[resNum]) {
      const [, , me] = DATA.sounds[resNum];
      if (me) {
        // assert(freq < 40);
        if (freq >= 40) {
          console.error(`Assertion failed: $({freq} < 40`);
        }
        player.playSoundRaw(channel & 3, me, freqTable[freq], vol);
      }
    }
  } catch (e) {
    console.error(`Could not play raw sound ${resNum}`);
    debugger;
  }
}
