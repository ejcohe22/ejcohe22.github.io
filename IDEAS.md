# littleEagle — Game Design Bible

> Future Claude sessions: read this + README.md before touching any game code. Keep this file updated as features are built — mark ✅ in the build order, add implementation notes to the relevant section.

---

## Section 1: Vision

The portfolio page is World 1 — a hub you parkour around. Hidden realm pages (`/realm/`) are the expansion. Each realm is a standalone HTML page with its own art style, story beat, and boss.

- The Demon appears in parkour mode, taunts you, and escapes. You follow.
- Each realm URL is an unlock reward — not linked anywhere, only earned through gameplay.
- `localStorage` tracks which realms have been unlocked.
- Hidden URLs stay hidden. You have to play to find them.

---

## Section 2: Themes & Tone

**One Piece energy.** Big world. Factions with real ideology. Nobody is purely evil.

Core motif: **"You keep the servers alive. The servers stay up. Nobody knows your name."**

- Freedom vs. optimization — The Algorithm wants to optimize everything, including you.
- 3rd shift existentialism — Wisconsin, 3am, doing meaningful work in the dark.
- Comedy: emoji rooms, Midnight just being a cow, absurd npm package names.
- Drama: the moment you realize The Algorithm is built on your own code.
- Emotional: Midnight appearing during the hardest boss. Just standing there. Mooing.

---

## Section 3: Factions

1. **The Algorithm** — not evil, just optimizing. That's the horror. Speaks in metrics.
2. **The Corporation / The Board** — created The Algorithm, benefit from it, want it running forever.
3. **The Free Devs / The Rogue Stack** — went off-grid, build things for themselves, no JIRA tickets.
4. **The Herd** — animals, NPCs, things outside the system. Midnight is their ambassador.
5. **You** — 3rd shift dev. Not a hero. Just someone who showed up.

---

## Section 4: Story Act by Act

### Act 1 — The Portfolio (current page)

Everything looks normal. You parkour around your own site.

- Tutorial boss: **CVE**. Simple fight, teaches mechanics.
- After CVE dies: The Demon appears as a **silhouette only** (black fill, no detail). Doesn't fight. Says:
  > "Impressive. You patched the vulnerability. Did you read what it was accessing?"
  
  Vanishes. Screen glitches. A URL flashes: `/realm/the-freezer`
- Remaining bosses (Wisconsin, Splunk, Dependency, Merge) are mid-bosses — lore drops explain the world.
- After Merge Conflict dies: Demon reappears, laughs, escapes through a portal. Game begins.

---

### Realm 1: The Freezer — `/realm/the-freezer`

**Art:** Ice-blue 8-bit pixel aesthetic. `▓▓▓▓` floor chars. Frozen blocks, icicle platforms.  
**Palette:** `#54c8ff`, `#e8f4ff`, deep navy bg.  
**Faction:** The Board. Comfortable enough that people stop trying to leave.

- Midnight is here. Just eating grass in the snow. She gives you a hint and drops a blunt.
- **Boss: The Director** — suit-wearing stick figure, briefcase that explodes into spreadsheets as projectiles.
- Demon taunts mid-fight: *"Even cows know when to leave."*  Midnight: *"moo."*
- Emotional beat: frozen in the ice, a file called `erik_backup_2019.sav`.

---

### Realm 2: The npm Void — `/realm/void`

**Art:** Pure black. Falling packages. Loading bars everywhere. No ground — platforms ARE packages.  
**Palette:** `#000`, `#333`, `#ffd966`.  
**Faction:** The Rogue Stack.

- They have 400,000 packages. None of them work.
- **Boss: The Maintainer** — hasn't committed in 3 years, 847 open issues, answers none of them.
  - Phase 2: *"I work on this in my free time"* → becomes 3× larger (guilt-powered).
- Demon graffiti on the void walls: **"YOU ARE RUNNING MY CODE RIGHT NOW"**
- Midnight falls from the sky on a package. Lands. Looks around. Moos. Falls off.

---

### Realm 3: The Observatory — `/realm/observatory`

**Art:** Space / cosmic horror. Dashboards floating in the void. Stars are alert icons. `───` floor chars.  
**Palette:** `#000014`, star-white, Splunk yellow.  
**Faction:** The Splunk Ascendants — they believe the dashboards are alive and watching.

- **Boss: The Analyst** — a massive eye made of dashboard panels, fires correlation alerts.
- Demon: *"You built all of this. Every panel. To watch things you'll never understand."*
- Emotional beat: one dashboard panel shows **YOUR HP from the beginning of the game**. It's been tracking you.

---

### Realm 4: The Succubus Lounge — `/realm/the-lounge`

**Art:** Purple velvet, neon signs, curvy stick figure aesthetics. `▬▬▬` floor chars.  
**Palette:** `#8b0057`, `#ff69b4`, deep purple bg.  
**Tone:** Comedy + chaos. Everyone is extremely distracted.

- NPCs: **Succubus Devs** — curvy stick figures with devil horns offering "very good packages."
  - *"this one is called `is-hot`. it checks if a number is hot."* (it actually works. confusing.)
- **Boss: The Temptress** — a succubus made of `node_modules` folders, attacks by offering upgrades.
  - *"Join us. Free snacks. Unlimited PTO. The servers still go down."*
- Midnight is sitting at the bar. Nobody knows how she got in. Bartender doesn't ask.
- Demon: *"Even I come here sometimes."* (first vulnerable moment)

---

### Realm 5: The Arabian Server Room — `/realm/desert`

**Art:** 8-bit warm sandy tones, magic carpet platforms, dune backgrounds. `≈≈≈≈` floor chars.  
**Palette:** `#c8a96e`, `#4a2c0a`, warm sky blue.  
**Faction:** Ancient free devs who escaped The Corporation centuries ago (fantasy framing).

- **Boss: The Architect** — a wizard who built The Algorithm, now regrets it.
  - Pre-fight: *"I built it to help people. I built it from MY code. Your code."*
  - Mid-fight: you can choose not to fight. Non-fight path → they hand you the **Sword of Root Access** and join you as a companion.
- Midnight: appears on a camel. Does not explain.

---

### Realm 6: The Algorithm's Lair — `/realm/the-algorithm`

**Art:** Glitch overload — all previous art styles flicker in and out, corrupted. `▓░▓░` floor chars.  
**Palette:** All cycling.

The Demon is HERE. Finally stationary. Waiting.

**Pre-fight monologue:**
> "Everything you've ever pushed. Every commit. Every hotfix at 3am. It learned from you."  
> "You are not fighting me. You are fighting the distilled aggregate of yourself."

**Three phases:**
- **Phase 1:** Fires fireballs labeled with your actual terminal commands (`sudo make me a sandwich`)
- **Phase 2:** Wings emerge, lightning chains, taunts each faction:
  *"The Board loved you." "The Rogue Stack never knew you existed."*
- **Phase 3:** Robes tatter, goes silent, just tries to kill you.

**At 10% HP:** stops. Offers you a blunt. 🌿

- **Accept:** Secret ending — screen fades, Midnight walks in, you pet her. Credits roll over the portfolio.
- **Refuse:** Final blow. Algorithm dissolves. Realms go dark. Portfolio reloads clean. New terminal command: `freedom`.

**Epilogue — `freedom` command output:**
```
the servers are still up.
you are the only one who knows why.
midnight says moo.
```

---

## Section 5: Characters

### The Demon / The Algorithm

**Canvas drawing spec:**
- Stick figure, 2.5× player height
- Flowing robes: `bezierCurveTo`, drape wide at bottom
- Curved horns: two arc sweeps from head
- Eyes: hollow circles, `#ff4466`, `shadowBlur: 20`

**Phases:**
- **Phase 1:** Standard proportions, robes hang still. First appearance = silhouette only (black fill, no detail).
- **Phase 2:** Wings emerge (`ctx arc` sweeps, 120° span each side), moves faster.
- **Phase 3:** Robes become jagged (random ±3px offsets per frame), rage mode.

**Behavior:** Taunts are contextual — references what the player just did.  
**Death:** Dissolves particle by particle, robes fall last, boots remain on the ground.

---

### Midnight the Cow 🐄

**Canvas drawing spec:**
- White body (`roundRect`), black spots (random arcs), horns (small Vs), wavy tail

**Dialogue:** Never full sentences. Only: `"moo."` / `"...moo."` / `"MOO."` / `"moo? moo."`  
You always understand exactly what she means.

**Interactions:**
- Walk up + press X → player does a little pat animation, Midnight's tail wags.
- Drops: blunt (one per realm), occasionally a heart (+20 HP).
- **Unkillable.** If an enemy hits her, she looks at them. They stop.

---

### The Architect (Realm 5 boss/ally)

- Old stick figure, hunched slightly, wizard hat (upside-down V with a star)
- If spared: follows behind the player as a companion
- Cane doubles as a staff — used for Fireball / Blink / Lightning Chain

---

### Succubus Devs (Realm 4 NPCs)

- Curvy stick figures: chest = two small arcs, hips wider, tail curving behind
- Devil horns: small two-line Vs on head
- Always holding a laptop. Laptop is on fire. They don't notice.

---

## Section 6: Mechanics

### Weapons (pickups)

| Weapon | Reach | Notes |
|--------|-------|-------|
| 🗡️ Sword | 80px | Slash particle arc, held in leading hand |
| 🔱 Spear | 120px | Pierces through walls, slower swing |
| 🌿 Blunt | — | Speed ×1.4, green trail particles, 15s duration, Midnight drops these |

### Wizard / Architect Moves (Q / E / R after unlocking companion)

- **Q — Fireball:** Projectile entity, facing direction, 25 dmg, orange-red, `spawnImpact` on hit
- **E — Blink:** Teleport 200px facing direction (faster than dash, no cooldown penalty)
- **R — Lightning Chain:** Arcs between up to 3 nearest enemies, 15 dmg each, cyan flickering line

### Speech Bubble System

- DOM `div` positioned from canvas entity coords → screen coords
- White bubble, dark text, triangle pointing down at character
- Entity carries `dialogue: [{text, duration}]` queue; game loop pops lines on `dialogueTimer` expiry
- Demon bubbles: dark red, glitch font. Midnight's: soft white, tiny text.

### Emoji Room Design (rest points / checkpoints)

Comedic tonal break between realm sections.

```
║  🪴          🪔  ║
║    🛏️              ║
║         🚽       ║
═══════════════════
```

- Floor: box-drawing chars. Walls: `║`
- Items: emoji placed as colored rect with emoji text
- Player walks to 🛏️ + presses down → HP restores, checkpoint saved

### Unlock + Transition System

```js
// js/game/unlock.js
export function unlockRealm(name, nextUrl) {
  const realms = JSON.parse(localStorage.getItem('realms') || '[]');
  if (!realms.includes(name)) realms.push(name);
  localStorage.setItem('realms', JSON.stringify(realms));
  showWarpTransition(nextUrl);
}
```

Warp transition: canvas scan-lines diverge → pixelate → navigate. On arrival: reverse.

### Terminal Additions (planned)

| Command | Description |
|---------|-------------|
| `realms` | Lists unlocked realm URLs |
| `hint` | Midnight says something. Changes based on current boss. |
| `freedom` | Only appears after beating The Algorithm |
| `boss demon` | Spawns demo Demon (portfolio page only, Phase 1) |

---

## Section 7: Art Styles Per Realm

| Realm | Style | Palette | Platforms | Floor Char |
|-------|-------|---------|-----------|------------|
| Portfolio | Neon glitch | `#c97eff`, `#07070e` | DOM + purple glow | n/a |
| The Freezer | 8-bit ice | `#54c8ff`, `#e8f4ff` | Frozen blocks, icicles | `▓▓▓▓` |
| npm Void | Void dark | `#000`, `#333`, `#ffd966` | Falling packages | falling |
| Observatory | Cosmic horror | `#000014`, star-white | Dashboard panels | `───` |
| Succubus Lounge | Velvet neon | `#8b0057`, `#ff69b4` | Cushions, tables | `▬▬▬` |
| Arabian Desert | 8-bit warm | `#c8a96e`, `#4a2c0a` | Sand dunes, carpets | `≈≈≈≈` |
| The Algorithm | Glitch chaos | All cycling | Glitching anything | `▓░▓░` |

---

## Section 8: Engine Architecture

### Current files — extend, don't rewrite

| File | Current role | Planned additions |
|------|-------------|-------------------|
| `js/game/Player.js` | Physics + 21-state machine | Weapon state, mana bar |
| `js/game/Animator.js` | Stick figure draw | `_drawSword()`, `_drawDemon()`, `_drawMidnight()`, `_drawWizardHat()`, `_drawSuccubus()` |
| `js/game/Enemies.js` | EnemyManager + ParticleSystem | `_makeDemon()`, `spawnLightning()`, `spawnFireball()`, `spawnMidnight()` |
| `js/game/Game.js` | Loop + HUD + boss lore | Companion update, mana bar, dialogue ticks |
| `js/game/PlatformManager.js` | DOM scrape + static level | Emoji room generator, `loadLevelConfig(json)` |
| `js/terminal.js` | Terminal overlay + commands | `realms`, `hint`, `freedom`, `boss demon` |

### New files to create

```
js/game/LevelEngine.js   — Game.js stripped of DOM dependency, accepts LevelConfig JSON
js/game/unlock.js        — warp transition + localStorage realm tracking
js/game/Dialogue.js      — speech bubble DOM system
js/game/Projectile.js    — fireball/lightning entity manager
realm/the-freezer/index.html + level.js
realm/void/index.html + level.js
realm/observatory/index.html + level.js
realm/the-lounge/index.html + level.js
realm/desert/index.html + level.js
realm/the-algorithm/index.html + level.js
```

### LevelConfig schema

```js
{
  name: 'the-freezer',
  style: 'ice',                       // maps to CSS theme class on <body>
  background: 'css gradient or img',
  platforms: [{ x, y, w, h, type }],
  enemies: [{ type, x, y, phase: 'boss' }],
  npc: { type: 'midnight', x, y, dialogue: ['moo.', '...moo.'] },
  music: null,                        // future
  nextRealm: 'void',
  unlockToken: 'the-freezer',
}
```

---

## Section 9: Prioritized Build Order

### Tier 1 — Foundation
1. ✅ README.md + IDEAS.md
2. ✅ Fix walls (edge-only, loop covers 1.5× docH), lore panel z-index, score/deaths HUD
3. ✅ Splunk monitoring outage (environment flickers, player stays visible, clears on boss death)
4. Dialogue system (`Dialogue.js`) — needed for all story content
5. Midnight NPC in portfolio game (moo + petting)
6. Demon silhouette appearance after CVE kill (taunts, shows URL, escapes)

### Tier 2 — Mechanics
7. Sword pickup + slash animation in Animator
8. Blunt pickup (Midnight drops)
9. `Projectile.js` — fireball entity
10. Wizard companion (The Architect) spawned after Realm 5
11. Blink / lightning chain moves (Q/E/R)

### Tier 3 — Realm Infrastructure
12. `LevelEngine.js` extraction from Game.js
13. `unlock.js` + warp transition
14. Realm 1: The Freezer (first full level page)
15. Realm 2: npm Void
16. Emoji room checkpoint system

### Tier 4 — Story Content
17. Demon full boss (all 3 phases) in Game.js
18. Realm 3: Observatory
19. Realm 4: Succubus Lounge
20. Realm 5: Arabian Desert + Architect boss/ally path
21. Realm 6: The Algorithm's Lair (final)
22. Secret ending (blunt accept path)
23. `freedom` terminal command + epilogue
24. Post-game: portfolio loads "clean" with subtle changes

### Tier 5 — Polish
25. Art style theming per realm (CSS class swaps on `<body>`)
26. Demon taunts referencing player actions
27. Midnight appearing at scripted emotional moments
28. Midnight petting animation

---

## Maintenance Note

When a feature is built:
- Mark it ✅ in the build order above
- Add a brief implementation note (which file, which method)
- Update the relevant section if the design changed during implementation
- Keep README.md current with any new terminal commands or game controls

This file is the source of truth. The code is the implementation.
