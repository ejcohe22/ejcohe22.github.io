// ============================================================
// InputHandler.js — keyboard input with jump buffering
// ============================================================
export class InputHandler {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();
    this.justReleased = new Set();
    this._onDown = this._onDown.bind(this);
    this._onUp   = this._onUp.bind(this);
  }

  attach() {
    window.addEventListener('keydown', this._onDown);
    window.addEventListener('keyup',   this._onUp);
  }
  detach() {
    window.removeEventListener('keydown', this._onDown);
    window.removeEventListener('keyup',   this._onUp);
  }

  _onDown(e) {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    }
    if (!this.keys.has(e.key)) this.justPressed.add(e.key);
    this.keys.add(e.key);
  }
  _onUp(e) {
    this.keys.delete(e.key);
    this.justReleased.add(e.key);
  }

  // Call at START of each frame to build player input snapshot
  snapshot(player) {
    const k = this.keys;
    const jp = this.justPressed;
    const jr = this.justReleased;
    const inp = player.input;

    inp.left  = k.has('ArrowLeft')  || k.has('a');
    inp.right = k.has('ArrowRight') || k.has('d');
    inp.up    = k.has('ArrowUp')    || k.has('w');
    inp.down  = k.has('ArrowDown')  || k.has('s');
    inp.sprint = k.has('Shift');
    inp.crouchHeld = k.has('ArrowDown') || k.has('s');

    inp.jumpJustPressed  = jp.has(' ') || jp.has('ArrowUp') || jp.has('w');
    inp.jumpReleased     = jr.has(' ') || jr.has('ArrowUp') || jr.has('w');
    inp.dashJustPressed  = jp.has('z') || jp.has('Z');
    inp.attackJustPressed= jp.has('x') || jp.has('X');
    inp.kickJustPressed  = jp.has('c') || jp.has('C');
    inp.specialJustPressed = jp.has('v') || jp.has('V') || jp.has('Shift') && jp.has('x');
    inp.slideJustPressed = (jp.has('s') || jp.has('ArrowDown')) && (k.has('Shift') || Math.abs(player.vx) > 3);

    // buffer jump
    if (inp.jumpJustPressed) player.jumpBufferTimer = 10;

    this.justPressed.clear();
    this.justReleased.clear();
  }
}

// ============================================================
// Particles.js — dust, sparks, impact effects
// ============================================================
export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  // ── Spawn helpers ────────────────────────────────────────
  spawnDust(x, y, count = 4) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2.5,
        life: 1, decay: 0.05 + Math.random() * 0.04,
        r: 2 + Math.random() * 3,
        color: '#c97eff',
        type: 'dust',
      });
    }
  }

  spawnImpact(x, y, color = '#c97eff', count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 3 + Math.random() * 5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1, decay: 0.04 + Math.random() * 0.04,
        r: 2 + Math.random() * 4,
        color,
        type: 'spark',
      });
    }
  }

  spawnDashTrail(x, y, vx) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 20,
        vx: -vx * 0.1 + (Math.random() - 0.5),
        vy: (Math.random() - 0.5),
        life: 0.8, decay: 0.08,
        r: 3 + Math.random() * 4,
        color: '#c97eff',
        type: 'trail',
      });
    }
  }

  spawnLand(x, y) {
    this.spawnDust(x, y, 6);
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 1.5,
        life: 1, decay: 0.03,
        r: 3 + Math.random() * 3,
        color: '#7effc8',
        type: 'dust',
      });
    }
  }

  spawnCombo(x, y, combo) {
    const colors = ['#c97eff', '#7effc8', '#ffd966', '#ff7e54'];
    for (let i = 0; i < combo * 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * (4 + Math.random() * 4),
        vy: Math.sin(angle) * (4 + Math.random() * 4) - 3,
        life: 1, decay: 0.025,
        r: 4 + Math.random() * 5,
        color: colors[i % colors.length],
        type: 'spark',
      });
    }
  }

  // ── Update + draw ────────────────────────────────────────
  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // gravity
      p.vx *= 0.94;
      p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx, camX, camY) {
    this.particles.forEach(p => {
      const sx = p.x - camX;
      const sy = p.y - camY;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 8;
      ctx.fillStyle   = p.color;
      if (p.type === 'spark') {
        // diamond shape
        ctx.beginPath();
        ctx.moveTo(sx, sy - p.r);
        ctx.lineTo(sx + p.r * 0.5, sy);
        ctx.lineTo(sx, sy + p.r);
        ctx.lineTo(sx - p.r * 0.5, sy);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, p.r * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }
}

// ============================================================
// EnemyManager.js — CVE blob, Wisconsin winter, Splunk spam, etc
// ============================================================
export class EnemyManager {
  constructor(particles) {
    this.enemies  = [];
    this.particles = particles;
    this.activeBoss = null;
    this.lastKilledBoss = null; // set each time a boss dies; Game.js consumes + clears it
  }

  // ── Spawn a boss by name ─────────────────────────────────
  // scale > 1 on recycles: HP, damage, and speed increase proportionally
  spawnBoss(name, x, y, scale = 1) {
    const factories = {
      cve:        () => this._makeCVE(x, y),
      wisconsin:  () => this._makeWisconsin(x, y),
      splunk:     () => this._makeSplunk(x, y),
      dependency: () => this._makeDependency(x, y),
      merge:      () => this._makeMerge(x, y),
    };
    if (!factories[name]) return;

    const boss = factories[name]();
    if (scale > 1) {
      boss.hp        = Math.round(boss.hp    * scale);
      boss.maxHp     = Math.round(boss.maxHp * scale);
      boss.power     = scale;          // damage multiplier (read in checkPlayerHit)
      boss.speedMult = 1 + (scale - 1) * 0.6; // speed scales slower than HP
      // splunk fires more alerts at higher tiers
      if (name === 'splunk') boss.alertInterval = Math.max(35, Math.round(80 / scale));
      // other bosses fire projectiles more often at higher tiers
      if (boss.projectileInterval) boss.projectileInterval = Math.max(40, Math.round(boss.projectileInterval / scale));
      // label shows the tier
      const tier = Math.round((scale - 1) / 0.4);
      boss.label = `${boss.label} ★${tier}`;
    }
    this.activeBoss = boss;
    this.enemies.push(boss);
  }

  // ── Spawn random trash enemy ─────────────────────────────
  spawnTrash(x, y) {
    this.enemies.push({
      x, y, vx: (Math.random() > 0.5 ? 1 : -1) * 1.5,
      vy: 0, w: 22, h: 22,
      hp: 15, maxHp: 15,
      type: 'trash',
      isBoss: false,
      color: '#ff4466',
      timer: 0,
      label: ['bug', 'lint', 'typo', 'debt'][Math.floor(Math.random() * 4)],
    });
  }

  // ── Boss factories ───────────────────────────────────────
  _makeCVE(x, y) {
    return {
      x, y, vx: 2, vy: 0, w: 60, h: 60,
      hp: 120, maxHp: 120,
      type: 'cve', isBoss: true,
      color: '#ff4466',
      glitchTimer: 0,
      timer: 0,
      label: 'CVE-2024-CRITICAL',
      phase: 0,
      projectiles: [],
      projectileInterval: 100,
    };
  }

  _makeWisconsin(x, y) {
    return {
      x, y, vx: 1, vy: 0, w: 80, h: 80,
      hp: 150, maxHp: 150,
      type: 'wisconsin', isBoss: true,
      color: '#54c8ff',
      timer: 0,
      label: 'WISCONSIN WINTER',
      slowField: 0,
      projectiles: [],
      projectileInterval: 115,
    };
  }

  _makeSplunk(x, y) {
    return {
      x, y, vx: 2.5, vy: 0, w: 50, h: 50,
      hp: 100, maxHp: 100,
      type: 'splunk', isBoss: true,
      color: '#ffd966',
      timer: 0,
      alertSpam: [],
      label: 'SPLUNK STORM',
    };
  }

  _makeDependency(x, y) {
    return {
      x, y, vx: 0.5, vy: 0, w: 70, h: 70,
      hp: 200, maxHp: 200,
      type: 'dependency', isBoss: true,
      color: '#ff7e54',
      timer: 0,
      loadingBar: 0,
      label: 'npm install...',
      projectiles: [],
      projectileInterval: 90,
    };
  }

  _makeMerge(x, y) {
    // two enemies that fight each other
    const base = {
      x, y, vx: 2, vy: 0, w: 45, h: 45,
      hp: 80, maxHp: 80,
      type: 'merge', isBoss: true,
      color: '#c97eff',
      timer: 0,
      label: '<<<<<<< HEAD',
      projectiles: [],
      projectileInterval: 105,
    };
    const twin = {
      ...base,
      x: x + 120, vx: -2,
      label: '>>>>>>> main',
      projectiles: [], // own array — not shared with base
    };
    this.enemies.push(twin);
    return base;
  }

  // ── Update all enemies ───────────────────────────────────
  update(player, platforms) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.timer++;

      this._updateMovement(e, platforms, player);
      this._updateBehavior(e, player);

      // check if dead
      if (e.hp <= 0) {
        this.particles.spawnImpact(e.x + e.w/2, e.y + e.h/2, e.color, 14);
        if (e === this.activeBoss) {
          this.activeBoss = null;
          this.lastKilledBoss = e.type;
        }
        if (e.type === 'splunk') player.splunkDebuff = 0;
        this.enemies.splice(i, 1);
      }
    }
  }

  _updateMovement(e, platforms, player) {
    // simple patrol + gravity
    e.vy += 0.5;
    if (e.vy > 18) e.vy = 18;
    e.x += e.vx;
    e.y += e.vy;

    // bounce off screen edges
    if (e.x < 0 || e.x + e.w > window.innerWidth) e.vx *= -1;

    // virtual page floor — bosses never fall off the bottom
    const docH = document.documentElement.scrollHeight;
    if (e.y + e.h > docH) {
      e.y = docH - e.h;
      e.vy = 0;
    }

    // floor collision against platforms
    for (const p of platforms) {
      if (e.x + e.w > p.x && e.x < p.x + p.w &&
          e.y + e.h > p.y && e.y + e.h < p.y + p.h + 10 &&
          e.vy >= 0) {
        e.y = p.y - e.h;
        e.vy = 0;
      }
    }

    if (e.isBoss) {
      const dx = player.cx - (e.x + e.w / 2);
      const dy = player.cy - (e.y + e.h / 2);
      const absDx = Math.abs(dx);
      const baseSpeed = e.type === 'wisconsin' ? 1.1 : 1.8;
      const speed = baseSpeed * (e.speedMult || 1);

      // Preferred standoff distance — boss circles at ~110px, backs off if too close.
      // This gives the player room to finish an attack animation without getting eaten.
      const PREF  = 110;  // target gap (boss center → player center)
      const CLOSE =  55;  // actively back off inside this radius

      if (e.timer % 28 === 0) {
        if (absDx > PREF + 30) {
          // Too far — close the gap
          e.vx = Math.sign(dx) * speed;
        } else if (absDx < CLOSE) {
          // Too close — step back so the player can breathe
          e.vx = -Math.sign(dx) * speed * 0.7;
        } else {
          // In the zone — gentle drift to maintain spacing
          e.vx = Math.sign(dx) * speed * 0.25;
        }
      }

      // Teleport if way out of range
      const tooFarX = absDx > window.innerWidth * 0.6;
      const tooFarY = dy < -500;
      if (tooFarX || tooFarY) {
        e.x = player.cx + (Math.random() > 0.5 ? 200 : -200);
        e.y = player.cy - e.h - 20;
        e.vy = 0;
      }
    }
  }

  _updateBehavior(e, player) {
    switch (e.type) {
      case 'cve': {
        // teleport flash every 3s
        if (e.timer % 180 === 90) {
          e.x = player.cx + (Math.random() > 0.5 ? 200 : -200);
          e.glitchTimer = 20;
        }
        if (e.glitchTimer > 0) e.glitchTimer--;
        // phase 2 at 50%
        if (e.hp < e.maxHp * 0.5 && e.phase === 0) {
          e.phase = 1;
          e.vx *= 1.8;
        }
        // fire slow exploit packet aimed at player
        if (!e.projectiles) e.projectiles = [];
        if (e.timer % (e.projectileInterval || 100) === 0) {
          const dx = player.cx - (e.x + e.w / 2);
          const dy = player.cy - (e.y + e.h / 2);
          const dist = Math.hypot(dx, dy) || 1;
          const speed = e.phase === 1 ? 2.8 : 2.0;
          e.projectiles.push({ x: e.x + e.w/2, y: e.y + e.h/2, vx: (dx/dist)*speed, vy: (dy/dist)*speed, life: 110, r: 8, color: '#ff4466' });
          // phase 2: twin spread shot
          if (e.phase === 1) {
            const perp = 0.5;
            e.projectiles.push({ x: e.x + e.w/2, y: e.y + e.h/2, vx: (dx/dist)*speed - (dy/dist)*perp, vy: (dy/dist)*speed + (dx/dist)*perp, life: 110, r: 6, color: '#ff6688' });
          }
        }
        e.projectiles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
        e.projectiles = e.projectiles.filter(p => p.life > 0);
        break;
      }

      case 'wisconsin': {
        // slow field expands around boss
        e.slowField = 180 + Math.sin(e.timer * 0.02) * 60;
        // lob slow ice ball on a parabola toward player
        if (!e.projectiles) e.projectiles = [];
        if (e.timer % (e.projectileInterval || 115) === 0) {
          const dx = player.cx - (e.x + e.w / 2);
          const travelFrames = Math.max(40, Math.abs(dx) / 4);
          const vx = dx / travelFrames;
          e.projectiles.push({ x: e.x + e.w/2, y: e.y + e.h/2, vx, vy: -4.5, life: 95, r: 11, color: '#a0e8ff', isSnow: true });
        }
        e.projectiles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life--; });
        e.projectiles = e.projectiles.filter(p => p.life > 0);
        break;
      }

      case 'splunk':
        // spawn alert spam projectiles (faster at higher scales)
        if (e.timer % (e.alertInterval || 80) === 0) {
          e.alertSpam = e.alertSpam || [];
          e.alertSpam.push({
            x: e.x + e.w / 2,
            y: e.y,
            vy: -5 - Math.random() * 3,
            life: 80,
          });
        }
        if (e.alertSpam) {
          e.alertSpam.forEach(a => { a.y += a.vy; a.life--; });
          e.alertSpam = e.alertSpam.filter(a => a.life > 0);
        }
        break;

      case 'dependency': {
        // loading bar never finishes
        e.loadingBar = (e.loadingBar + 0.4) % 99;
        e.label = `npm install... ${Math.floor(e.loadingBar)}%`;
        // lob slow npm package at player
        if (!e.projectiles) e.projectiles = [];
        if (e.timer % (e.projectileInterval || 90) === 0) {
          const dx = player.cx - (e.x + e.w / 2);
          const dy = player.cy - (e.y + e.h / 2);
          const dist = Math.hypot(dx, dy) || 1;
          const speed = 2.2;
          e.projectiles.push({ x: e.x + e.w/2, y: e.y + e.h/2, vx: (dx/dist)*speed, vy: (dy/dist)*speed, life: 105, r: 10, color: '#ff7e54' });
        }
        e.projectiles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
        e.projectiles = e.projectiles.filter(p => p.life > 0);
        break;
      }

      case 'merge': {
        // each merge half fires a conflict marker at the player
        if (!e.projectiles) e.projectiles = [];
        if (e.timer % (e.projectileInterval || 105) === 0) {
          const dx = player.cx - (e.x + e.w / 2);
          const dy = player.cy - (e.y + e.h / 2);
          const dist = Math.hypot(dx, dy) || 1;
          const speed = 2.0;
          const col = e.label.includes('HEAD') ? '#c97eff' : '#7effc8';
          e.projectiles.push({ x: e.x + e.w/2, y: e.y + e.h/2, vx: (dx/dist)*speed, vy: (dy/dist)*speed, life: 100, r: 7, color: col });
        }
        e.projectiles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
        e.projectiles = e.projectiles.filter(p => p.life > 0);
        break;
      }
    }
  }

  // ── Check player hitbox against enemies ─────────────────
  checkPlayerHit(player) {
    let totalDamage = 0;
    if (player.invincible > 0) return 0;

    const dashing = player.state === 'dash' || player.state === 'slide';

    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const overlap = (
        player.right > e.x && player.left < e.x + e.w &&
        player.bottom > e.y && player.top < e.y + e.h
      );
      if (overlap) {
        // dash / slide hurts enemies, not the player
        if (dashing) continue;

        let dmg = e.isBoss ? Math.round(15 * (e.power || 1)) : 8;

        // wisconsin slows instead of hurting immediately
        if (e.type === 'wisconsin') {
          player.vx *= 0.4;
          dmg = 5;
        }
        // splunk body hit: monitoring outage debuff
        if (e.type === 'splunk') {
          player.splunkDebuff = 1800; // 30s at 60fps
        }
        totalDamage += dmg;
      }

      // splunk alert projectiles
      if (e.type === 'splunk' && e.alertSpam) {
        for (const a of e.alertSpam) {
          const hit = (
            player.right > a.x - 8 && player.left < a.x + 8 &&
            player.bottom > a.y - 8 && player.top < a.y + 8
          );
          if (hit) {
            player.splunkDebuff = 1800;
            totalDamage += 6;
            a.life = 0;
          }
        }
      }

      // generic projectiles (cve, wisconsin, dependency, merge)
      if (e.projectiles) {
        for (const p of e.projectiles) {
          const hit = (
            player.right > p.x - p.r && player.left < p.x + p.r &&
            player.bottom > p.y - p.r && player.top < p.y + p.r
          );
          if (hit) {
            totalDamage += 8;
            p.life = 0;
            // wisconsin snowball also slows the player
            if (e.type === 'wisconsin') player.vx *= 0.45;
          }
        }
      }
    }
    return totalDamage;
  }

  // ── Apply attack hitbox to enemies ───────────────────────
  applyAttack(hitbox) {
    if (!hitbox) return 0;
    let totalHit = 0;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const overlap = (
        hitbox.x + hitbox.w > e.x && hitbox.x < e.x + e.w &&
        hitbox.y + hitbox.h > e.y && hitbox.y < e.y + e.h
      );
      if (overlap) {
        e.hp -= hitbox.damage;
        this.particles.spawnImpact(e.x + e.w/2, e.y, e.color, 6);
        totalHit += hitbox.damage;
      }
    }
    return totalHit;
  }

  // ── Draw all enemies ─────────────────────────────────────
  draw(ctx, camX, camY, frameCount) {
    this.enemies.forEach(e => {
      const sx = e.x - camX;
      const sy = e.y - camY;

      ctx.save();
      ctx.shadowColor = e.color;
      ctx.shadowBlur  = 16;

      switch (e.type) {
        case 'cve':       this._drawCVE(ctx, sx, sy, e, frameCount, camX, camY); break;
        case 'wisconsin': this._drawWisconsin(ctx, sx, sy, e, frameCount, camX, camY); break;
        case 'splunk':    this._drawSplunk(ctx, sx, sy, e, frameCount, camX, camY); break;
        case 'dependency':this._drawDependency(ctx, sx, sy, e, frameCount, camX, camY); break;
        case 'merge':     this._drawMerge(ctx, sx, sy, e, frameCount, camX, camY); break;
        default:          this._drawTrash(ctx, sx, sy, e, frameCount); break;
      }

      // HP bar above enemy
      if (e.isBoss) {
        const bw = e.w * 1.5;
        const bx = sx + e.w/2 - bw/2;
        const by = sy - 18;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx, by, bw, 5);
        ctx.fillStyle = e.color;
        ctx.shadowBlur = 4;
        ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), 5);
      }

      ctx.restore();
    });
  }

  _drawCVE(ctx, x, y, e, t, camX, camY) {
    const pulse = Math.sin(t * 0.15) * 4;
    const glitch = e.glitchTimer > 0 ? (Math.random() - 0.5) * 10 : 0;
    ctx.fillStyle = '#ff4466';
    // glitchy blob
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = e.w/2 + pulse + (Math.random() - 0.5) * 6;
      const px = x + e.w/2 + Math.cos(a) * r + glitch;
      const py = y + e.h/2 + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.globalAlpha = 0.8;
    ctx.fill();
    // label
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(e.label, x + e.w/2 + glitch, y + e.h/2 + 3);
    // exploit packets
    if (e.projectiles) {
      e.projectiles.forEach(p => {
        const px = p.x - camX, py = p.y - camY;
        const alpha = p.life / 110;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color; ctx.shadowBlur = 10;
        ctx.fillStyle = p.color;
        // glitchy square packet
        ctx.fillRect(px - p.r, py - p.r, p.r * 2, p.r * 2);
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = '#fff';
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('0x', px, py + 2);
        ctx.restore();
      });
    }
  }

  _drawWisconsin(ctx, x, y, e, t, camX, camY) {
    // big snowflake
    const rot = t * 0.01;
    ctx.save();
    ctx.translate(x + e.w/2, y + e.h/2);
    ctx.rotate(rot);
    ctx.strokeStyle = '#54c8ff';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * e.w/2, Math.sin(a) * e.h/2);
      ctx.stroke();
    }
    // slow aura
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#54c8ff';
    ctx.beginPath();
    ctx.arc(0, 0, e.slowField || 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#54c8ff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(e.label, x + e.w/2, y - 4);
    // lobbed ice balls
    if (e.projectiles) {
      e.projectiles.forEach(p => {
        const px = p.x - camX, py = p.y - camY;
        const alpha = Math.min(1, p.life / 30);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = '#a0e8ff'; ctx.shadowBlur = 12;
        ctx.fillStyle = '#c8f4ff';
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
        // inner snowflake hint
        ctx.strokeStyle = 'rgba(80,200,255,0.6)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(px + Math.cos(a) * p.r * 0.6, py + Math.sin(a) * p.r * 0.6);
          ctx.lineTo(px - Math.cos(a) * p.r * 0.6, py - Math.sin(a) * p.r * 0.6);
          ctx.stroke();
        }
        ctx.restore();
      });
    }
  }

  _drawSplunk(ctx, x, y, e, t, camX, camY) {
    const pulse = Math.sin(t * 0.2) * 3;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ffd966';
    ctx.fillRect(x + pulse, y, e.w - pulse * 2, e.h);
    ctx.restore();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ALERT', x + e.w/2, y + e.h/2 - 4);
    ctx.font = '8px monospace';
    ctx.fillText('CRITICAL', x + e.w/2, y + e.h/2 + 8);
    if (e.alertSpam) {
      e.alertSpam.forEach(a => {
        ctx.save();
        ctx.globalAlpha = a.life / 80;
        ctx.fillStyle = '#ffd966';
        ctx.shadowColor = '#ffd966';
        ctx.shadowBlur = 6;
        ctx.fillRect(a.x - camX - 6, a.y - camY - 6, 12, 12);
        ctx.restore();
      });
    }
  }

  _drawDependency(ctx, x, y, e, t, camX, camY) {
    ctx.fillStyle = '#ff7e54';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x, y, e.w, e.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(e.label, x + e.w/2, y + e.h/2 - 6);
    // loading bar
    const barW = e.w * 0.8;
    const barX = x + e.w * 0.1;
    const barY = y + e.h/2 + 4;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, 5);
    ctx.fillStyle = '#ff7e54';
    ctx.shadowBlur = 4;
    ctx.fillRect(barX, barY, barW * (e.loadingBar / 99), 5);
    // npm package projectiles — little orange boxes with "pkg" text
    if (e.projectiles) {
      e.projectiles.forEach(p => {
        const px = p.x - camX, py = p.y - camY;
        const alpha = p.life / 105;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = '#ff7e54'; ctx.shadowBlur = 8;
        ctx.fillStyle = '#ff7e54';
        ctx.fillRect(px - p.r, py - p.r, p.r * 2, p.r * 2);
        ctx.strokeStyle = '#ffb080';
        ctx.lineWidth = 1;
        ctx.strokeRect(px - p.r, py - p.r, p.r * 2, p.r * 2);
        ctx.fillStyle = '#000';
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('pkg', px, py + 2);
        ctx.restore();
      });
    }
  }

  _drawMerge(ctx, x, y, e, t, camX, camY) {
    const wobble = Math.sin(t * 0.2) * 3;
    ctx.fillStyle = e.label.includes('HEAD') ? '#c97eff' : '#7effc8';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x + wobble, y, e.w, e.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(e.label, x + e.w/2, y + e.h/2 + 3);
    // conflict marker projectiles — <<<< or >>>> chevrons
    if (e.projectiles) {
      const isHead = e.label.includes('HEAD');
      e.projectiles.forEach(p => {
        const px = p.x - camX, py = p.y - camY;
        const alpha = p.life / 100;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color; ctx.shadowBlur = 8;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = p.color;
        ctx.fillText(isHead ? '<<<' : '>>>', px, py + 4);
        ctx.restore();
      });
    }
  }

  _drawTrash(ctx, x, y, e, t) {
    const wobble = Math.sin(t * 0.3 + e.x) * 2;
    ctx.fillStyle = e.color;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(x + e.w/2 + wobble, y + e.h/2, e.w/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(e.label, x + e.w/2, y + e.h/2 + 3);
  }
}
