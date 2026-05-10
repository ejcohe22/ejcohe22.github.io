# littleEagle — Erik Cohen's Portfolio

Personal portfolio site with an embedded platformer game, terminal overlay, and an expanding ARG-style hidden game world. See `IDEAS.md` for the full game design bible.

Live at: [ejcohe22.github.io](https://ejcohe22.github.io/)

---

## Stack

- Vanilla JS, ES modules (`type="module"`) — no build step, no bundler
- CSS custom properties (design tokens in `css/tokens.css`)
- Canvas 2D for the game layer
- SunCalc (CDN) for status bar sunrise detection

## Local Dev

**MUST serve over HTTP** — ES modules are blocked on `file://`

```bash
cd ~/Code/ejcohe22.github.io
python3 -m http.server 8080
# open http://localhost:8080
```

Hard-reload (`Cmd+Shift+R`) after JS changes to bust the module cache.

---

## File Map

```
ejcohe22.github.io/
├── index.html              # Main page — all site sections
├── README.md               # This file
├── IDEAS.md                # Game design bible — read this before adding features
│
├── css/
│   ├── tokens.css          # Design system: colors, fonts, spacing, shadows
│   ├── layout.css          # Nav, hero, parallax, sections, footer
│   ├── components.css      # Cards, chips, music, bio photos, timeline
│   └── game.css            # HUD, boss lore panel, announcements, damage floats
│
├── js/
│   ├── main.js             # Site init: cursor, parallax, clock, status bar, nav
│   ├── terminal.js         # Terminal overlay, commands, easter eggs
│   └── game/
│       ├── Game.js         # Main loop, camera, HUD, enemy spawning, lore system
│       ├── Player.js       # Physics engine, 21-state machine, attack hitboxes
│       ├── Animator.js     # Stick figure drawing for every player state
│       ├── Enemies.js      # EnemyManager (5 bosses), ParticleSystem, InputHandler
│       └── PlatformManager.js  # DOM-scraped + static platforms, wall generation
│
└── img/                    # Photos, parallax layers, favicon, Midnight GIF
```

---

## Terminal

Open with **`` ` ``** (backtick).

| Command | Description |
|---------|-------------|
| `help` | List all commands |
| `whoami` | Identity, role, org |
| `skills` | Tech stack |
| `work` | Career timeline |
| `music` | Discography |
| `bands` | Band history |
| `status` | Current vibe (time-based + SunCalc sunrise) |
| `links` | GitHub, LinkedIn, email |
| `secret` | ... |
| `parkour` / `game` | Unlock the platformer → press ENTER to launch |
| `boss [name]` | Spawn a boss: `cve` `wisconsin` `splunk` `dependency` `merge` |
| `clear` | Clear terminal |
| `date` | Current time |

**Easter eggs:** `ls -la`, `rm -rf /`, `coffee`, `midnight`, `hyperpop`, `wisconsin`, `friends`, `romance`, `exit`, `pwd`, `ping happiness`, `git blame`, `uname -a`, `cat wisconsin_feelings.txt`, `sudo make me a sandwich`

---

## Game Controls

| Key | Action |
|-----|--------|
| `←` / `→` or `A` / `D` | Move |
| `SPACE` | Jump (tap = short, hold = full) |
| `SHIFT` | Sprint |
| `Z` | Dash |
| `X` | Punch |
| `C` | Kick |
| `V` | Spin kick / roundhouse |
| `↓ + SHIFT` | Slide |
| Wall + `SPACE` | Wall jump |
| `G` | Show / hide game (after unlock) |
| `` ` `` | Toggle terminal |

---

## How to Extend

### Add a terminal command
In `js/terminal.js`, add a key to the `COMMANDS` getter object:
```js
mycommand: () => {
  this._lines([
    ['sys', 'header text'],
    ['out', 'body text'],
  ]);
},
```
Classes: `'sys'` (dim header), `'out'` (normal), `'err'` (red), `'game'` (accent), `'special'` (glow).

### Add a boss
1. In `js/game/Enemies.js`, add a factory method `_makeMyBoss(x, y)` returning a boss object
2. Add the key to `spawnBoss()` dispatch map
3. Add lore text to `BOSS_LORE` in `js/game/Game.js`
4. Add the name to `BOSS_SEQUENCE` array in `Game.js`
5. Add `boss myboss` to the terminal `boss` command's valid list in `terminal.js`

### Add a static platform
In `js/game/PlatformManager.js` → `_buildStaticPlatforms()`, add to the `defs` array:
```js
thin(W * 0.5, 1200, 140),  // x% from left, y from top, width px
```
Use `thin()` for horizontal platforms, `wall()` for vertical walls.

### Add a DOM element as a platform
Add a CSS selector to the `selectors` array in `_buildDomPlatforms()`:
```js
{ sel: '.my-element', thick: 16, type: 'card' },
```

---

## Design Notes

- **IDEAS.md** is the source of truth for all game design decisions — read it before adding story content, new bosses, or new mechanics
- Keep IDEAS.md updated as features are built (mark ✅ in the build order, add implementation notes)
- The game is intentionally a layer on top of the portfolio — DOM elements become platforms, page sections become level zones
- The hidden realm pages (`/realm/`) are the expansion — see IDEAS.md for the full ARG structure
