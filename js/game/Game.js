// ============================================================
// Game.js — main game loop, camera, HUD management
// ============================================================

import { Player, STATES }       from './Player.js';
import { Animator }             from './Animator.js';
import { PlatformManager }      from './PlatformManager.js';
import { InputHandler, ParticleSystem } from './Enemies.js';
import { EnemyManager }         from './Enemies.js';
import { Dialogue }             from './Dialogue.js';

const BOSS_SEQUENCE = ['cve', 'wisconsin', 'splunk', 'dependency', 'merge'];

const BOSS_LORE = {
  cve: {
    title: '⚠ CVE-2024-CRITICAL',
    lines: [
      'A Common Vulnerability and Exposure. Catalogued by MITRE.',
      'Someone shipped code without input validation. Again.',
      'This one achieves Remote Code Execution via a malformed JSON field.',
      'The fix is two lines. The audit trail is 847 emails.',
      'CVSS Score: 9.8/10. Severity: "please god no."',
      'The on-call engineer has been awake since 3am.',
      'The security team has been paged. They are not happy.',
      'Neither are you. Neither is anyone.',
    ],
  },
  wisconsin: {
    title: '❄ WISCONSIN WINTER',
    lines: [
      'It is -20°F with wind chill. The lake is frozen solid.',
      'Your car won\'t start. The ice scraper is in your other coat.',
      '"Oh it\'s not so bad," says someone born here.',
      '"You get used to it," says someone lying to your face.',
      'The cheese IS incredible. This is not the issue.',
      'Slows everything in range. No warmth. No mercy.',
      'The exit sign is visible from here.',
      'The exit sign has been visible for 3 years.',
      '(temporarily)',
    ],
  },
  splunk: {
    title: '🚨 SPLUNK STORM',
    lines: [
      'You built elegant dashboards. Tuned thresholds. Clean SPL.',
      'Then someone set every search to real-time with no time range.',
      '4,000 alerts/hour. All critical. All for disk at 61%.',
      'The SOAR playbook auto-closed 3,000 of them.',
      'The other 1,000 are your problem now.',
      'Each alert is a small piece of your soul leaving your body.',
      'Getting hit triggers a MONITORING OUTAGE — 30 seconds of signal loss.',
      'Your signals corrupt. The environment glitches. You fly blind.',
      'Kill Splunk to restore observability. The irony is not lost on you.',
    ],
  },
  dependency: {
    title: '📦 DEPENDENCY HELL',
    lines: [
      'Installing 847 packages. 600 are test dependencies of test deps.',
      'left-pad is in there. It is 11 lines of code.',
      'node_modules/ is 400MB. .gitignore is doing its best.',
      'npm audit: 249 vulnerabilities (3 critical, 12 high, rest: vibes)',
      '"npm audit fix --force" introduced 17 new vulnerabilities.',
      'A package called "is-odd" has 4 million weekly downloads.',
      'The loading bar says 83%.',
      'It has said 83% for 6 minutes.',
      'It will say 83% forever. This is fine.',
    ],
  },
  merge: {
    title: '💀 MERGE CONFLICT',
    lines: [
      '<<<<<<< HEAD  is YOUR code. Written at 2am. Perfect.',
      '>>>>>>> main  is someone else\'s code. Also 2am. Wrong.',
      'The conflict is in a config file no one knew existed.',
      'git blame: last touched in 2019 by someone who left the company.',
      'Their Slack is deactivated. Their wisdom: gone forever.',
      'You must choose a version and delete the other.',
      'The branch was called "quick-fix."',
      'It has been open for 4 months.',
      'Whoever merged last wins. There are no winners.',
    ],
  },
};

export class Game {
  constructor() {
    this.canvas   = null;
    this.ctx      = null;
    this.hud      = null;
    this.running  = false;
    this.unlocked = false;  // set true on first terminal launch
    this.raf      = null;
    this.frame    = 0;

    this.player    = null;
    this.animator  = new Animator();
    this.platforms = new PlatformManager();
    this.input     = new InputHandler();
    this.particles = new ParticleSystem();
    this.enemies   = new EnemyManager(this.particles);

    // camera (follows player, decoupled from page scroll)
    this.cam = { x: 0, y: 0, tx: 0, ty: 0 };

    // game state
    this.score     = 0;
    this.deaths    = 0;
    this.bossIndex = 0;
    this.bossTimer = 0;
    this.trashTimer= 0;
    this.loreEl    = null; // active lore panel DOM element

    // prev player state (for event detection)
    this._prevState = '';
    this._prevOnGround = false;

    // ── Demon scripted sequence ──────────────────────────────
    // State machine: null → 'enter' → 'hover' → 'leave' → 'done'
    this.demonScript  = null;
    this.demonTimer   = 0;
    this.demonAlpha   = 0;
    this.demonPos     = { x: 0, y: 0 };
    this.demonHoverY  = 0; // world-y target for hover
    this.dialogue     = new Dialogue();
    this._scriptFired = new Set(); // which frame-marks have triggered
  }

  // ── Lifecycle ────────────────────────────────────────────
  start() {
    if (this.running) return;
    this.unlocked = true;
    this._createCanvas();
    this._createHUD();
    this._buildPlatforms();
    this._spawnPlayer();
    this.input.attach();
    this.running = true;
    document.body.classList.add('game-active');
    this._announce('PARKOUR MODE');
    this.raf = requestAnimationFrame(this._loop.bind(this));
    window.addEventListener('resize', this._onResize.bind(this));
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.input.detach();
    this.canvas && this.canvas.remove();
    this.hud   && this.hud.remove();
    this.canvas = null;
    this.hud = null;
    document.body.classList.remove('game-active');
    window.removeEventListener('resize', this._onResize.bind(this));
  }

  toggle() {
    this.running ? this.stop() : this.start();
  }

  // ── Canvas + HUD creation ────────────────────────────────
  _createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game-canvas';
    this.canvas.classList.add('active');
    this.canvas.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      pointer-events:none; z-index:4000;
    `;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this._resizeCanvas();
  }

  _resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _createHUD() {
    this.hud = document.createElement('div');
    this.hud.id = 'game-hud';
    this.hud.classList.add('active');
    this.hud.innerHTML = `
      <div class="hud-panel">
        <div class="hud-hp">
          <div class="hud-label">HP</div>
          <div class="hud-bar-track"><div class="hud-bar-fill" id="hud-hp-fill"></div></div>
          <div class="hud-hp-num" id="hud-hp-num">100 / 100</div>
        </div>
        <div class="hud-divider"></div>
        <div class="hud-stat-row">
          <span class="hud-label">SCORE</span><span id="hud-score">0</span>
        </div>
        <div class="hud-stat-row">
          <span class="hud-label">DEATHS</span><span id="hud-deaths">0</span>
        </div>
      </div>
      <div class="hud-combo" id="hud-combo">
        <div class="hud-combo-num" id="hud-combo-num">0</div>
        <div class="hud-combo-label">combo</div>
      </div>
      <div class="hud-state" id="hud-state">
        <span class="hud-label">STATE</span>
        <span class="state-val" id="hud-state-val">idle</span>
      </div>
      <div class="boss-hud" id="boss-hud">
        <div class="boss-name" id="boss-name"></div>
        <div class="boss-bar-track"><div class="boss-bar-fill" id="boss-bar-fill"></div></div>
      </div>
      <div class="hud-controls">
        <div class="hud-key"><kbd>←→</kbd> move</div>
        <div class="hud-key"><kbd>SPACE</kbd> jump</div>
        <div class="hud-key"><kbd>SHIFT</kbd> sprint</div>
        <div class="hud-key"><kbd>Z</kbd> dash</div>
        <div class="hud-key"><kbd>X</kbd> punch</div>
        <div class="hud-key"><kbd>C</kbd> kick</div>
        <div class="hud-key"><kbd>V</kbd> spin</div>
        <div class="hud-key"><kbd>↓+SHIFT</kbd> slide</div>
        <div class="hud-key"><kbd>G</kbd> hide game</div>
      </div>
    `;
    document.body.appendChild(this.hud);
  }

  // ── Platform build ───────────────────────────────────────
  _buildPlatforms() {
    this.platforms.build();
  }

  _spawnPlayer() {
    // find the nav bar position to spawn above it
    const nav = document.getElementById('main-nav');
    const spawnX = window.innerWidth * 0.15;
    const spawnY = nav
      ? nav.getBoundingClientRect().bottom + window.scrollY + 60
      : 200;
    this.player = new Player(spawnX, spawnY);
  }

  // ── Main loop ────────────────────────────────────────────
  _loop() {
    if (!this.running) return;
    this.frame++;
    this.raf = requestAnimationFrame(this._loop.bind(this));

    // refresh DOM platform positions periodically
    if (this.frame % 120 === 0) this.platforms.updateDomPositions();

    // input
    this.input.snapshot(this.player);

    // update
    this.player.update(this.platforms.platforms);
    this._updateCamera();
    this.particles.update();
    this.enemies.update(this.player, this.platforms.platforms);
    this._spawnEnemies();
    this._handleEvents();
    this._updateDemonScript();
    this._updateHUD();

    // draw
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // monitoring outage: environment flickers, player stays solid
    const outageFlicker = this.player.splunkDebuff > 0 && Math.floor(this.frame / 4) % 5 === 0;
    if (outageFlicker) ctx.globalAlpha = 0.08;
    this.platforms.draw(ctx, this.cam.x, this.cam.y);
    this.enemies.draw(ctx, this.cam.x, this.cam.y, this.frame);
    this.particles.draw(ctx, this.cam.x, this.cam.y);
    ctx.globalAlpha = 1;
    this.animator.drawShadow(ctx, this.player, this.cam.x, this.cam.y);
    this.animator.draw(ctx, this.player, this.cam.x, this.cam.y, this.frame);

    // demon silhouette (drawn above player, behind HUD)
    if (this.demonScript && this.demonScript !== 'done') {
      ctx.globalAlpha = this.demonAlpha;
      this.animator.drawDemon(
        ctx,
        this.demonPos.x, this.demonPos.y,
        this.cam.x, this.cam.y,
        true,   // always silhouette for the Act-1 taunt
        0,
        this.frame,
      );
      ctx.globalAlpha = 1;
    }

    // dialogue tick (repositions bubble to track demon on screen)
    if (this.demonScript && this.demonScript !== 'done') {
      this.dialogue.tick(this.cam.x, this.cam.y);
    }

    // attack hitbox (debug can be enabled)
    this._processAttack();
  }

  // ── Camera ───────────────────────────────────────────────
  _updateCamera() {
    const p = this.player;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // target: player centered, offset slightly up
    this.cam.tx = p.cx - vw * 0.4;
    this.cam.ty = p.cy - vh * 0.45;

    // smooth follow
    this.cam.x += (this.cam.tx - this.cam.x) * 0.1;
    this.cam.y += (this.cam.ty - this.cam.y) * 0.1;

    // sync page scroll to camera Y (so DOM updates)
    const targetScroll = Math.max(0, this.cam.y);
    if (Math.abs(window.scrollY - targetScroll) > 2) {
      window.scrollTo({ top: targetScroll, behavior: 'instant' });
    }
  }

  // ── Event detection ──────────────────────────────────────
  _handleEvents() {
    const p = this.player;

    // landing
    if (!this._prevOnGround && p.onGround) {
      this.particles.spawnLand(p.cx, p.bottom);
    }

    // dash trail
    if (p.state === STATES.DASH) {
      this.particles.spawnDashTrail(p.cx, p.cy, p.vx);
    }

    // running dust
    if ((p.state === STATES.RUN || p.state === STATES.SPRINT) && this.frame % 6 === 0) {
      this.particles.spawnDust(p.cx, p.bottom, 2);
    }

    // wall slide spark
    if (p.state === STATES.WALL_SLIDE && this.frame % 8 === 0) {
      this.particles.spawnImpact(p.cx, p.cy, '#c97eff', 2);
    }

    // combo announce
    if (p.combo > 0 && p.combo % 5 === 0 && p.comboTimer === 89) {
      const labels = ['', '', '', '', 'NICE', 'SMOOTH', 'SICK', 'INSANE', 'LEGENDARY', 'GODLIKE'];
      const label = labels[Math.min(p.combo, labels.length - 1)] || 'LEGENDARY';
      this._announce(`${p.combo}x ${label}`);
      this.particles.spawnCombo(p.cx, p.cy, p.combo);
    }

    // enemy damage
    const dmg = this.enemies.checkPlayerHit(p);
    if (dmg > 0) {
      p.takeDamage(dmg);
      this.particles.spawnImpact(p.cx, p.cy, '#ff4466', 5);
      this._floatDamage(p.cx, p.cy, `-${dmg}`, '#ff4466');
    }

    // respawn if dead
    if (p.state === STATES.DEAD && p.stateTimer > 90) {
      this._respawn();
    }

    this._prevState     = p.state;
    this._prevOnGround  = p.onGround;
  }

  _processAttack() {
    const hb = this.player.getAttackHitbox();
    if (!hb) return;
    const dmg = this.enemies.applyAttack(hb);
    if (dmg > 0) {
      const hit = this.player.registerComboHit(dmg);
      this._floatDamage(hb.x + hb.w / 2, hb.y, `${hit}`, '#ffd966');
      this.score += hit;
    }
  }

  // ── Enemy spawning ───────────────────────────────────────
  _spawnEnemies() {
    this.trashTimer++;
    if (this.trashTimer > 300) {
      this.trashTimer = 0;
      const x = this.player.cx + (Math.random() > 0.5 ? 400 : -400);
      const y = this.player.cy - 200;
      this.enemies.spawnTrash(x, y);
    }

    this.bossTimer++;
    if (this.bossTimer > 1800 && !this.enemies.activeBoss) {
      this.bossTimer = 0;
      const name  = BOSS_SEQUENCE[this.bossIndex % BOSS_SEQUENCE.length];
      const cycle = Math.floor(this.bossIndex / BOSS_SEQUENCE.length); // 0 = first run
      const scale = 1 + cycle * 0.4; // +40% HP/dmg/speed per full cycle
      this.bossIndex++;
      const x = this.player.cx + (Math.random() > 0.5 ? 500 : -500);
      const y = this.player.cy - 300;
      this.enemies.spawnBoss(name, x, y, scale);
      this._announce(name.toUpperCase() + (cycle > 0 ? ` ★${cycle}` : '') + ' APPEARED!');
      this._showLore(name);
    }
  }

  // ── HUD ─────────────────────────────────────────────────
  _updateHUD() {
    if (!this.hud) return;
    const p = this.player;

    // HP
    const hpFill = document.getElementById('hud-hp-fill');
    const hpNum  = document.getElementById('hud-hp-num');
    if (hpFill) {
      const pct = p.hp / p.maxHp;
      hpFill.style.width = (pct * 100) + '%';
      hpFill.className = 'hud-bar-fill' +
        (pct < 0.3 ? ' low' : pct < 0.6 ? ' mid' : '');
    }
    if (hpNum) hpNum.textContent = `${p.hp} / ${p.maxHp}`;

    // Combo
    const comboEl  = document.getElementById('hud-combo');
    const comboNum = document.getElementById('hud-combo-num');
    if (comboEl && comboNum) {
      comboEl.classList.toggle('active', p.combo > 1);
      comboNum.textContent = p.combo > 1 ? p.combo : '';
    }

    // Score / Deaths
    const scoreEl  = document.getElementById('hud-score');
    const deathsEl = document.getElementById('hud-deaths');
    if (scoreEl)  scoreEl.textContent  = this.score;
    if (deathsEl) deathsEl.textContent = this.deaths;

    // State
    const stateVal = document.getElementById('hud-state-val');
    if (stateVal) stateVal.textContent = p.state.replace('_', ' ');

    // Boss
    const bossHud  = document.getElementById('boss-hud');
    const bossName = document.getElementById('boss-name');
    const bossFill = document.getElementById('boss-bar-fill');
    const boss = this.enemies.activeBoss;
    if (bossHud && bossName && bossFill) {
      bossHud.classList.toggle('active', !!boss);
      if (boss) {
        bossName.textContent = boss.label;
        bossFill.style.width = (boss.hp / boss.maxHp * 100) + '%';
      }
    }
  }

  // ── Boss lore drop ───────────────────────────────────────
  _showLore(name) {
    this._clearLore();
    const lore = BOSS_LORE[name];
    if (!lore) return;
    const el = document.createElement('div');
    el.className = 'boss-lore';
    el.innerHTML = `
      <button class="boss-lore-close" aria-label="Close">✕</button>
      <div class="boss-lore-title">${lore.title}</div>` +
      lore.lines.map(l => `<div class="boss-lore-line">${l}</div>`).join('');
    el.querySelector('.boss-lore-close').addEventListener('click', () => {
      el.classList.add('fade-out');
      setTimeout(() => el.remove(), 400);
    });
    document.body.appendChild(el);
    this.loreEl = el;
    setTimeout(() => { el.classList.add('fade-out'); setTimeout(() => el.remove(), 800); }, 9000);
  }

  _clearLore() {
    if (this.loreEl) { this.loreEl.remove(); this.loreEl = null; }
  }

  // ── Announce overlay ────────────────────────────────────
  _announce(text) {
    const el = document.createElement('div');
    el.className = 'game-announce';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  _floatDamage(x, y, text, color) {
    const el = document.createElement('div');
    el.className = 'dmg-float';
    el.textContent = text;
    el.style.cssText = `left:${x - this.cam.x}px; top:${y - this.cam.y}px; color:${color};`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  // ── Demon scripted sequence ──────────────────────────────
  _updateDemonScript() {
    // trigger: CVE dies for the first time
    if (this.enemies.lastKilledBoss === 'cve' && !this._cveKillSeen) {
      this._cveKillSeen = true;
      this.enemies.lastKilledBoss = null;
      this._startDemonSequence();
    }

    if (!this.demonScript || this.demonScript === 'done') return;

    this.demonTimer++;
    const T = this.demonTimer;

    // keep dialogue bubble tracking demon (above its head)
    this.dialogue.moveTo(this.demonPos.x, this.demonPos.y - 185);

    switch (this.demonScript) {

      case 'enter':
        // fade in + descend toward hover position beside player
        this.demonAlpha = Math.min(1, T / 45);
        this.demonPos.x += (this.player.cx + 220 - this.demonPos.x) * 0.07;
        this.demonPos.y += (this.demonHoverY  - this.demonPos.y)    * 0.07;

        // once settled near hover position, show first line
        if (T > 50 && Math.abs(this.demonPos.y - this.demonHoverY) < 12) {
          this._showDemonLine();
          this.demonScript = 'hover';
          this.demonTimer  = 0;
        }
        break;

      case 'hover':
        // gentle float in place; dialogue advanced by Enter key
        this.demonPos.y = this.demonHoverY + Math.sin(T * 0.04) * 5;
        break;

      case 'leave':
        this.demonPos.y -= 3;
        this.demonPos.x += 1.5;
        this.demonAlpha  = Math.max(0, this.demonAlpha - 0.02);
        if (this.demonAlpha <= 0) {
          this.demonScript = 'done';
          this._demonCleanup();
        }
        break;
    }
  }

  // Dialogue lines for the Act-1 taunt
  get _demonLines() {
    return [
      '"Impressive. You patched the vulnerability."',
      '"Did you read what it was accessing?"',
    ];
  }

  _startDemonSequence() {
    // Hover target: demon feet at player ground level, just to the right
    this.demonHoverY      = this.player.bottom;
    this.demonPos.x       = this.player.cx + 220;
    this.demonPos.y       = this.player.bottom - 900;  // starts above viewport
    this.demonAlpha       = 0;
    this.demonScript      = 'enter';
    this.demonTimer       = 0;
    this._demonLineIdx    = -1;
    this._demonWaiting    = false;

    // Enter key advances dialogue (guard against terminal input)
    this._demonEnterFn = (e) => {
      if (e.key !== 'Enter') return;
      if (document.activeElement.tagName === 'INPUT') return;
      if (!this._demonWaiting) return;
      e.preventDefault();
      this._advanceDemonLine();
    };
    window.addEventListener('keydown', this._demonEnterFn);
  }

  _showDemonLine() {
    this._demonLineIdx++;
    const lines = this._demonLines;
    if (this._demonLineIdx >= lines.length) {
      this._demonLeave();
      return;
    }
    this.dialogue.show(
      this.demonPos.x, this.demonPos.y - 185,
      lines[this._demonLineIdx],
      'demon',
    );
    this._demonWaiting = true;
  }

  _advanceDemonLine() {
    this._demonWaiting = false;
    this.dialogue.hide();
    // brief pause then next line (or departure)
    setTimeout(() => this._showDemonLine(), 320);
  }

  _demonLeave() {
    this._demonWaiting = false;
    this.demonScript   = 'leave';
    this.demonTimer    = 0;
    this.canvas.classList.add('game-canvas--glitch');
    setTimeout(() => this.canvas && this.canvas.classList.remove('game-canvas--glitch'), 400);
    this._showDemonUrl('/realm/the-freezer');
  }

  _demonCleanup() {
    this.dialogue.hide();
    if (this._demonEnterFn) {
      window.removeEventListener('keydown', this._demonEnterFn);
      this._demonEnterFn = null;
    }
    this._demonWaiting = false;
  }

  _showDemonUrl(url) {
    const el = document.createElement('div');
    el.className = 'demon-url-flash';
    el.textContent = url;
    document.body.appendChild(el);
    setTimeout(() => el.isConnected && el.remove(), 3500);
  }

  // ── Respawn ──────────────────────────────────────────────
  _respawn() {
    this.deaths++;
    this._announce('CONTINUE');
    this.player.x = window.innerWidth * 0.15;
    this.player.y = window.scrollY + 200;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.hp = this.player.maxHp;
    this.player.state = STATES.IDLE;
    this.player.stateTimer = 0;
  }

  // ── Resize ───────────────────────────────────────────────
  _onResize() {
    this._resizeCanvas();
    this.platforms.refresh();
  }

  // ── Spawn boss by name (called from terminal) ────────────
  spawnBoss(name) {
    const x = this.player.cx + 300;
    const y = this.player.cy - 200;
    this.enemies.spawnBoss(name, x, y);
    this._announce(name.toUpperCase() + '!');
    this._showLore(name);
  }
}
