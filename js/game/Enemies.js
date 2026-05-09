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
  }

  // ── Spawn a boss by name ─────────────────────────────────
  spawnBoss(name, x, y) {
    const bosses = {
      cve:        () => this._makeCVE(x, y),
      wisconsin:  () => this._makeWisconsin(x, y),
      splunk:     () => this._makeSplunk(x, y),
      dependency: () => this._makeDependency(x, y),
      merge:      () => this._makeMerge(x, y),
    };
    if (bosses[name]) {
      this.activeBoss = bosses[name]();
      this.enemies.push(this.activeBoss);
    }
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
    };
    const twin = {
      ...base,
      x: x + 120, vx: -2,
      label: '>>>>>>> main',
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
        if (e === this.activeBoss) this.activeBoss = null;
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
      const speed = e.type === 'wisconsin' ? 1.5 : 2.5;

      // chase horizontally every 15 frames
      if (e.timer % 15 === 0) {
        e.vx = Math.sign(dx) * speed;
      }

      // teleport to stay near player if too far away
      const tooFarX = Math.abs(dx) > window.innerWidth * 0.6;
      const tooFarY = dy < -500; // boss is way above player (fell up?) or below
      if (tooFarX || tooFarY) {
        e.x = player.cx + (Math.random() > 0.5 ? 180 : -180);
        e.y = player.cy - e.h - 20;
        e.vy = 0;
      }
    }
  }

  _updateBehavior(e, player) {
    switch (e.type) {
      case 'cve':
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
        break;

      case 'wisconsin':
        // slow field expands around boss
        e.slowField = 180 + Math.sin(e.timer * 0.02) * 60;
        break;

      case 'splunk':
        // spawn alert spam projectiles
        if (e.timer % 80 === 0) {
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

      case 'dependency':
        // loading bar never finishes
        e.loadingBar = (e.loadingBar + 0.4) % 99;
        e.label = `npm install... ${Math.floor(e.loadingBar)}%`;
        break;
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

        let dmg = e.isBoss ? 15 : 8;

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
        case 'cve':       this._drawCVE(ctx, sx, sy, e, frameCount); break;
        case 'wisconsin': this._drawWisconsin(ctx, sx, sy, e, frameCount); break;
        case 'splunk':    this._drawSplunk(ctx, sx, sy, e, frameCount, camX, camY); break;
        case 'dependency':this._drawDependency(ctx, sx, sy, e, frameCount); break;
        case 'merge':     this._drawMerge(ctx, sx, sy, e, frameCount); break;
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

  _drawCVE(ctx, x, y, e, t) {
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
  }

  _drawWisconsin(ctx, x, y, e, t) {
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

  _drawDependency(ctx, x, y, e, t) {
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
  }

  _drawMerge(ctx, x, y, e, t) {
    const wobble = Math.sin(t * 0.2) * 3;
    ctx.fillStyle = e.label.includes('HEAD') ? '#c97eff' : '#7effc8';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x + wobble, y, e.w, e.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(e.label, x + e.w/2, y + e.h/2 + 3);
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
