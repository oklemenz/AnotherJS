import { decompressSync } from "../../lib/fflate.js";

export * from "./strings.js";

let partsList = null;
let DATA = null;
let restartPositions = null;

export const GAME_PART = {
  PROTECTION: 0x3e80, // Code-wheel screen
  INTRODUCTION: 0x3e81, // Intro Sequence
  WATER: 0x3e82, // Arrival at the Lake & Beast Chase
  JAIL: 0x3e83, // Prison Escape
  CITY: 0x3e84, // Gas tunnels, Caves and Pool
  ARENA: 0x3e85, // Tank in the Battle Arena
  BATHS: 0x3e86, // Capsule Lands at the Bath
  FINAL: 0x3e87, // Game Ending Sequence
  CODE: 0x3e88, // Secret Code Entry Screen
  CODE2: 0x3e89, // Secret Code Entry Screen
}

(async function load() {
  try {
    /* @ts-ignore */
    const RES = await import("./ootw.js");
    console.log("loaded ootw.js");

    partsList = {
      [GAME_PART.PROTECTION]: [
        RES.data14,
        RES.size14,
        RES.data15,
        RES.size15,
        RES.data16,
        RES.size16,
        null,
        null,
      ],
      [GAME_PART.INTRODUCTION]: [
        RES.data17,
        RES.size17,
        RES.data18,
        RES.size18,
        RES.data19,
        RES.size19,
        null,
        null,
      ],
      [GAME_PART.WATER]: [
        RES.data1a,
        RES.size1a,
        RES.data1b,
        RES.size1b,
        RES.data1c,
        RES.size1c,
        RES.data11,
        RES.size11,
      ],
      [GAME_PART.JAIL]: [
        RES.data1d,
        RES.size1d,
        RES.data1e,
        RES.size1e,
        RES.data1f,
        RES.size1f,
        RES.data11,
        RES.size11,
      ],
      [GAME_PART.CITY]: [
        RES.data20,
        RES.size20,
        RES.data21,
        RES.size21,
        RES.data22,
        RES.size22,
        RES.data11,
        RES.size11,
      ],
      [GAME_PART.ARENA]: [
        RES.data23,
        RES.size23,
        RES.data24,
        RES.size24,
        RES.data25,
        RES.size25,
        RES.data11,
        RES.size11,
      ],
      [GAME_PART.BATHS]: [
        RES.data26,
        RES.size26,
        RES.data27,
        RES.size27,
        RES.data28,
        RES.size28,
        RES.data11,
        RES.size11,
      ],
      [GAME_PART.FINAL]: [
        RES.data29,
        RES.size29,
        RES.data2a,
        RES.size2a,
        RES.data2b,
        RES.size2b,
        RES.data11,
        RES.size11,
      ],
      [GAME_PART.CODE]: [
        RES.data7d,
        RES.size7d,
        RES.data7e,
        RES.size7e,
        RES.data7f,
        RES.size7f,
        null,
        null,
      ],
      [GAME_PART.CODE2]: [
        RES.data7d,
        RES.size7d,
        RES.data7e,
        RES.size7e,
        RES.data7f,
        RES.size7f,
        null,
        null,
      ],
    };

    restartPositions = [
      { name: 'In the Lake (LDKD)', code: 'LDKD', part: GAME_PART.WATER, offset: 0 },
      { name: 'In The Cage (HTDC)', code: 'HTDC', part: GAME_PART.JAIL, offset: 0 },
      { name: 'In The Sewers (CLLD)', code: 'CLLD', part: GAME_PART.CITY, offset: 0 },
      // { name: 'First Recharger', code: '', part: GAME_PART.CITY, offset: 31 },
      { name: 'In the Caves (XDDJ)', code: 'XDDJ', part: GAME_PART.CITY, offset: 33 },
      // { name: 'T-Shaped Rock', code: '', part: GAME_PART.CITY, offset: 37 },
      // { name: 'Buddy Crawl', code: '', part: GAME_PART.CITY, offset: 39 },
      { name: 'By the water', code: '', part: GAME_PART.CITY, offset: 41 },
      // { name: 'After the water', code: '', part: GAME_PART.CITY, offset: 49 },
      // { name: 'Blast run (CKJL)', code: 'CKJL', part: GAME_PART.ARENA, offset: 0 },
      { name: 'Tower Baths (LFCK)', code: 'LFCK', part: GAME_PART.BATHS, offset: 0 },
      { name: 'Temple Entrance (TFBB)', code: 'TFBB', part: GAME_PART.BATHS, offset: 64 },
      // { name: 'Escape', code: '', part: GAME_PART.BATHS, offset: 66 },
      // { name: 'Final', code: '', part: GAME_PART.FINAL, offset: 0 }
    ];

    DATA = {
      bitmaps: RES.bitmaps,
      sounds: RES.sounds,
      modules: RES.modules,
    };
  } catch {}
})();

export function load_modules() {
  if (!DATA.modules) {return false;}

  Object.entries(DATA.modules).forEach(([, module]) => {
    const [data, size] = module;
    module.push(load(data, size));
  });

  return true;
}

export function load_sounds() {
  if (!DATA.sounds) {return false;}

  Object.entries(DATA.sounds).forEach(([, sound]) => {
    const [data, size] = sound;
    sound.push(load(data, size));
  });

  return true;
}

export function load(data, size) {
  if (!data) {return null;}

  data = atob(data);
  if (data.length != size) {
    let len = data.length;
    let bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = data.charCodeAt(i);
    }
    let buf = decompressSync(bytes);
    console.assert(buf.length == size);
    return buf;
  }

  let buf = new Uint8Array(size);
  for (let i = 0; i < data.length; ++i) {
    buf[i] = data.charCodeAt(i) & 0xff;
  }
  return buf;
}

export { partsList, DATA, restartPositions };
