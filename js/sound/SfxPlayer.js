const CreateSfxMod = () => ({
  orderTable: new Array(0x80),
  curOrder: 0,
  numOrder: 0,
  curPos: 0,
  data: null,
  samples: new Array(15).fill(null).map(() => ({
    data: null,
    volume: 0
  }))
});

const createSfx = () => ({
  sample: null,
  volume: 0,
  loops: 0,
  loop: 0
});

function read_be_uint16(buf, offset) {
  return (buf[offset] << 8) | buf[offset + 1];
}

export class SfxPlayer {
  _delay = 0;
  _resNum = 0;
  _sfxMod = CreateSfxMod();
  _rate = 0;
  _channels = new Array(4).fill(null);

  // new
  _audioContext = null;
  _sfxRawWorklet = null;
  _sfxPlayerWorklet = null;
  _modifyVarCallback = null;

  constructor() {
    // console.log('SfxPlayer::contructor')
    this._audioContext = new window.AudioContext();
    this.resumeAudio();
  }

  setModifyVarCallback(modifyVarCallback) {
    this._modifyVarCallback = modifyVarCallback;
  }

  async init() {
    // console.log('SfxPlayer::init')
    await this.initAudio();
    this.initEvents();
  }

  async initAudio() {
    try {
      // console.log('SfxPlayer::initAudio')
      this._rate = this._audioContext.sampleRate;

      // console.log('Adding module processors')
      await this._audioContext.audioWorklet.addModule("js/processors.js");

      // console.log('Creating worklet raw')
      this._sfxRawWorklet = new AudioWorkletNode(this._audioContext, "sfxraw-processor", {
        outputChannelCount: [1],
        numberOfInputs: 0,
        numberOfOutputs: 1
      });

      this._sfxRawWorklet.port.onmessage = this.onSFXRawProcessorMessage.bind(this);
      this._sfxRawWorklet.port.start();

      // console.log('Creating worklet sfxplayer')
      this._sfxPlayerWorklet = new AudioWorkletNode(this._audioContext, "sfxplayer-processor", {
        outputChannelCount: [2],
        numberOfInputs: 0,
        numberOfOutputs: 1
      });
      this._sfxPlayerWorklet.port.onmessage = this.onSFXPlayerProcessorMessage.bind(this);
      this._sfxPlayerWorklet.port.start();

      this._sfxRawWorklet.connect(this._audioContext.destination);
      this._sfxPlayerWorklet.connect(this._audioContext.destination);

      this.postMessageToSFXPlayerProcessor({
        message: "init",
        mixingRate: this._rate
      });

      this.postMessageToSFXRawProcessor({
        message: "init",
        mixingRate: this._rate
      });
    } catch (e) {
      console.error(`Error during initAudio: ${e} ${e.stack}`);
    }
  }

  initEvents() {
    document.addEventListener("click", () => this.resumeAudio());
  }

  resumeAudio() {
    if (this._audioContext && this._audioContext.state === "suspended") {
      this._audioContext.resume();
    }
  }

  setEventsDelay(delay, shouldSend = false) {
    this._delay = ((delay * 60) / 7050) >> 0;
    if (shouldSend) {
      this.postMessageToSFXPlayerProcessor({
        message: "setEventsDelay",
        delay: this._delay
      });
    }
  }

  onSFXPlayerProcessorMessage(event) {
    const data = event.data;
    switch (data.message) {
      case "syncVar":
        const { variable, value } = data;
        // vmVars[variable] = value
        this._modifyVarCallback(variable, value);
        break;
    }
  }

  onSFXRawProcessorMessage(event) {}

  postMessageToSFXPlayerProcessor(message) {
    if (this._sfxPlayerWorklet) {
      this._sfxPlayerWorklet.port.postMessage(message);
    } else {
      console.warn("Cannot send message to sfx player processor: not available");
    }
  }

  postMessageToSFXRawProcessor(message) {
    if (this._sfxRawWorklet) {
      this._sfxRawWorklet.port.postMessage(message);
    } else {
      console.warn("Cannot send message to raw player processor: not available");
    }
  }

  loadSfxModule(resNum, delay, pos, res) {
    const [, , buf] = res.modules[resNum];
    if (buf) {
      this._resNum = resNum;
      this._sfxMod = CreateSfxMod();
      this._sfxMod.curOrder = pos;
      this._sfxMod.numOrder = read_be_uint16(buf, 0x3e);
      // console.log(`SfxPlayer::loadSfxModule() curOrder = 0x${this._sfxMod.curOrder.toString(16)} numOrder = 0x${this._sfxMod.numOrder.toString(16)}`)
      for (let i = 0; i < 0x80; ++i) {
        this._sfxMod.orderTable[i] = buf[0x40 + i];
      }

      if (delay === 0) {
        delay = read_be_uint16(buf, 0);
      }

      this.setEventsDelay(delay);
      this._sfxMod.data = new Uint8Array(buf.buffer, 0xc0);
      // console.log(`SfxPlayer::loadSfxModule() eventDelay = ${this._delay} ms`)
      this.prepareInstruments(new Uint8Array(buf.buffer, 2), res.sounds);
      this.postMessageToSFXPlayerProcessor({
        message: "load",
        sfxMod: this._sfxMod,
        delay: this._delay
      });
    }
  }

  prepareInstruments(p, sounds) {
    let offset = 0;
    for (let i = 0; i < 15; ++i) {
      const ins = this._sfxMod.samples[i];
      const resNum = read_be_uint16(p, offset);
      // console.log(`prepareInstruments() resNum=${resNum}`)
      offset += 2;
      if (resNum !== 0) {
        ins.volume = read_be_uint16(p, offset);
        const mem = sounds[resNum];
        if (mem && mem[2]) {
          ins.data = mem[2];
          // console.log(`Loaded instrument 0x${resNum.toString(16)} n=${i} volume=${ins.volume} -> [${ins.data[0].toString(16)}, ${ins.data[1].toString(16)}, ${ins.data[2].toString(16)}]`)
        } else {
          console.error(`Error loading instrument 0x${resNum.toString(16)}`);
        }
      }
      offset += 2; // skip volume
    }
  }

  startMusic() {
    this.postMessageToSFXPlayerProcessor({
      message: "start"
    });
  }

  stopMusic() {
    this.postMessageToSFXPlayerProcessor({
      message: "stop"
    });
  }

  playMusic() {
    this.stopMusic();
    this.postMessageToSFXPlayerProcessor({
      message: "play",
      mixingRate: this._rate
    });
  }

  pause() {
    this.postMessageToSFXRawProcessor({
      message: "pause"
    });

    this.postMessageToSFXPlayerProcessor({
      message: "pause"
    });
  }

  resume() {
    this.postMessageToSFXRawProcessor({
      message: "resume"
    });

    this.postMessageToSFXPlayerProcessor({
      message: "resume"
    });
  }

  playSoundRaw(channel, data, freq, volume) {
    let len = read_be_uint16(data, 0) * 2;
    const loopLen = read_be_uint16(data, 2) * 2;
    if (loopLen !== 0) {
      len = loopLen;
    }
    const sample = new Int8Array(data.buffer, 8, len || data.byteLength - 8);
    // convert signed 8bit mono freq hz to host/stereo/host_freq
    if (sample) {
      const sfx = createSfx();
      sfx.loops = loopLen !== 0 ? -1 : 0;
      sfx.volume = volume;
      sfx.freq = freq;
      sfx.sample = sample;
      this.postMessageToSFXRawProcessor({
        message: "play",
        sound: sfx,
        channel
      });
    }
  }

  stopSoundChannel(channel) {
    this.postMessageToSFXRawProcessor({
      message: "stop",
      channel
    });
  }
}
