# Another World JS

Another World reimplementation written in HTML5 / JavaScript

## Play Online

- Browser: https://anotherjs.oklemenz.de
- Keyboard
  - `Cursor keys`: Movement (Walk / Swim)
    - `Left / Right key`: Move Left / Right
    - `Up key`: Move Up / Jump
    - `Down key`: Move Down / Crouch
  - `SPACE`: Action (Run, Shoot, Kick)
  - `SHIFT`: Jump
- Mouse
  - See Touch Controls for Mobile

## Play Mobile

- Browser: https://anotherjs.oklemenz.de
  - Use Landscape Mode (Single Tab, Disable Landscape Tab Bar in Browser Settings)
- Add to Home Screen to start as Fullscreen App
- Touch Controls (tap/drag area on screen):

  ![Mobile](img/mobile.svg)

## Play GitHub Version

- Browser: https://oklemenz.github.io/AnotherJS

## Play Locally

- Install [Node.js](https://nodejs.org)
- Clone: `https://github.com/oklemenz/AnotherJS.git`
- Terminal:
  - `npm install`
  - `npm start`
- Browser: `localhost:8080`

## Options

Url parameters are leveraged to save game state automatically (shortcut in brackets)

- `part (p)`: Current game part (0-8, default: 1)
- `pos (o)`: Current game part position (see below, default: 0)

### Game Parts

- 0: [Copy Protection](https://anotherjs.oklemenz.de?part=0)
- 1: [Introduction](https://anotherjs.oklemenz.de?part=1)
- 2: [Water](https://anotherjs.oklemenz.de?part=2)
- 3: [Jail](https://anotherjs.oklemenz.de?part=3)
  - 3.1: [Jail - Intro](https://anotherjs.oklemenz.de?part=3&pos=20)
  - 3.2: [Jail - Cage](https://anotherjs.oklemenz.de?part=3&pos=24)
- 4: [City](https://anotherjs.oklemenz.de?part=4)
  - 4.1: [City - Sewers](https://anotherjs.oklemenz.de?part=4&pos=30)
  - 4.2: [City - Recharger](https://anotherjs.oklemenz.de?part=4&pos=31)
  - 4.3: [City - Caves](https://anotherjs.oklemenz.de?part=4&pos=33)
  - 4.4: [City - Basin](https://anotherjs.oklemenz.de?part=4&pos=35)
  - 4.5: [City - T-Rock](https://anotherjs.oklemenz.de?part=4&pos=37)
  - 4.6: [City - Columns](https://anotherjs.oklemenz.de?part=4&pos=39)
  - 4.7: [City - Dive](https://anotherjs.oklemenz.de?part=4&pos=41)
  - 4.8: [City - Exit](https://anotherjs.oklemenz.de?part=4&pos=49)
- 5: [Arena](https://anotherjs.oklemenz.de?part=5)
- 6: [Baths](https://anotherjs.oklemenz.de?part=6)
- 7: [Final](https://anotherjs.oklemenz.de?part=7)
- 8: [Password](https://anotherjs.oklemenz.de?part=8)

## Credits

- https://github.com/cyxx
- https://github.com/warpdesign
- https://github.com/Hypercubed
