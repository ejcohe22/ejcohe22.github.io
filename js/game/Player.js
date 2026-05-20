// ============================================================
// Player.js — physics engine, input, state machine
// ============================================================

export const STATES = {
  IDLE:      'idle',
  RUN:       'run',
  SPRINT:    'sprint',
  JUMP:      'jump',
  FALL:      'fall',
  WALL_RUN:  'wall_run',
  WALL_SLIDE:'wall_slide',
  DASH:      'dash',
  ROLL:      'roll',
  VAULT:     'vault',
  FLIP:      'flip',
  CARTWHEEL: 'cartwheel',
  SLIDE:     'slide',
  DIVE:      'dive',
  ATTACK_KICK:  'attack_kick',
  ATTACK_PUNCH: 'attack_punch',
  ATTACK_ROUND: 'attack_roundhouse',
  CROUCH:    'crouch',
  DEAD:      'dead',
};

const CFG = {
  gravity:       0.52,
  friction:      0.80,
  airFriction:   0.95,
  runSpeed:      5.2,
  sprintMult:    1.6,
  jumpForce:     13.8,
  shortJump:     0.45,   // multiplier for tap jump
  wallJumpX:     8.5,
  wallJumpY:     12.5,
  dashForce:     16,
  dashDuration:  14,     // frames
  dashCooldown:  36,
  coyoteFrames:  8,
  jumpBuffer:    10,
  maxFall:       24,
  wallSlideSpeed:2.8,
  slideSpeed:    9,
  slideDuration: 22,
  rollDuration:  22,
  vaultDuration: 20,
  flipDuration:  28,
  cartwheelDuration: 26,
  attackDuration:18,
  diveDuration:  16,
};

export class Player {
  constructor(x, y) {
    // position & size
    this.x = x;
    this.y = y;
    this.w = 18;
    this.h = 42;

    // velocity
    this.vx = 0;
    this.vy = 0;

    // facing
    this.facingRight = true;

    // ground/wall contact
    this.onGround     = false;
    this.onWall       = 0;     // -1 left wall, 1 right wall
    this.prevOnGround = false;

    // timers (frames)
    this.coyoteTimer     = 0;
    this.jumpBufferTimer = 0;
    this.wallJumpLock    = 0;   // prevent immediate re-stick
    this.wallRunTimer    = 0;
    this.dashTimer       = 0;
    this.dashCooldown    = 0;
    this.stateTimer      = 0;
    this.invincible      = 0;
    this.splunkDebuff    = 0; // splunk hit: flicker 40-off/10-on for ~30s

    // state
    this.state = STATES.IDLE;
    this.prevState = STATES.IDLE;

    // combat
    this.hp          = 100;
    this.maxHp       = 100;
    this.combo       = 0;
    this.comboTimer  = 0;
    this.attackHit   = false;   // did this attack swing already connect?

    // dash vector
    this.dashVx = 0;
    this.dashVy = 0;

    // animation helpers
    this.animFrame     = 0;     // 0..1 progress through state
    this.airTime       = 0;     // frames in air (for flip trigger)
    this.landVelocity  = 0;     // vy at landing (for roll)
    this.slideLock     = false; // can't slide again until released

    // input snapshot (set by InputHandler)
    this.input = {
      left: false, right: false, up: false, down: false,
      jump: false, jumpJustPressed: false, jumpReleased: false,
      dash: false, dashJustPressed: false,
      attack: false, attackJustPressed: false,
      kick: false,  kickJustPressed:  false,
      special: false, specialJustPressed: false,
      sprint: false,
      slide: false,  slideJustPressed: false,
      crouchHeld: false,
    };
  }

  // ── Main update called each frame ──────────────────────────
  update(platforms) {
    this.stateTimer++;
    if (this.invincible > 0) this.invincible--;
    if (this.splunkDebuff > 0) this.splunkDebuff--;
    if (this.dashCooldown > 0) this.dashCooldown--;
    if (this.wallJumpLock > 0) this.wallJumpLock--;
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer === 0) this.combo = 0;
    }

    // track air time
    if (!this.onGround) this.airTime++;
    else this.airTime = 0;

    this._handleState(platforms);
    this._applyPhysics(platforms);
    this._updateCoyote();

    // animation progress (0..1 within current state duration)
    const dur = this._stateDuration();
    this.animFrame = dur > 0 ? Math.min(this.stateTimer / dur, 1) : 1;
  }

  // ── State machine ──────────────────────────────────────────
  _handleState(platforms) {
    const inp = this.input;
    const grounded = this.onGround || this.coyoteTimer > 0;

    switch (this.state) {

      // ── IDLE ──
      case STATES.IDLE:
        if (!this.onGround) { this._setState(STATES.FALL); break; }
        if (inp.crouchHeld && !this.slideLock) { this._setState(STATES.CROUCH); break; }
        if (inp.slideJustPressed && !this.slideLock) { this._startSlide(); break; }
        if (inp.dashJustPressed && this.dashCooldown === 0) { this._startDash(inp); break; }
        if (inp.jumpJustPressed || this.jumpBufferTimer > 0) { this._jump(); break; }
        if (inp.attackJustPressed) { this._setState(STATES.ATTACK_PUNCH); break; }
        if (inp.kickJustPressed)   { this._setState(STATES.ATTACK_KICK);  break; }
        if (inp.specialJustPressed){ this._setState(STATES.ATTACK_ROUND); break; }
        if (inp.left || inp.right) {
          this._setState(inp.sprint ? STATES.SPRINT : STATES.RUN);
        }
        break;

      // ── RUN / SPRINT ──
      case STATES.RUN:
      case STATES.SPRINT: {
        if (!this.onGround) { this._setState(STATES.FALL); break; }
        if (inp.slideJustPressed && !this.slideLock) { this._startSlide(); break; }
        if (inp.dashJustPressed && this.dashCooldown === 0) { this._startDash(inp); break; }
        if (inp.jumpJustPressed || this.jumpBufferTimer > 0) { this._jump(); break; }
        if (inp.attackJustPressed) { this._setState(STATES.ATTACK_PUNCH); break; }
        if (inp.kickJustPressed)   { this._setState(STATES.ATTACK_KICK);  break; }
        if (!inp.left && !inp.right) { this._setState(STATES.IDLE); break; }

        const spd = CFG.runSpeed * (this.state === STATES.SPRINT ? CFG.sprintMult : 1);
        if (inp.right) { this.vx += (spd - this.vx) * 0.22; this.facingRight = true; }
        if (inp.left)  { this.vx += (-spd - this.vx) * 0.22; this.facingRight = false; }
        if (inp.sprint && this.state !== STATES.SPRINT) this._setState(STATES.SPRINT);
        if (!inp.sprint && this.state === STATES.SPRINT) this._setState(STATES.RUN);
        break;
      }

      // ── JUMP / FALL ──
      case STATES.JUMP:
        // short hop on release
        if (inp.jumpReleased && this.vy < 0) {
          this.vy *= CFG.shortJump;
        }
        // wall run check
        if (this.onWall !== 0 && this.wallJumpLock === 0 && !this.onGround) {
          if ((this.onWall === -1 && inp.left) || (this.onWall === 1 && inp.right)) {
            this._setState(STATES.WALL_RUN); break;
          }
          this._setState(STATES.WALL_SLIDE); break;
        }
        if (this.onGround) { this._landTransition(); break; }
        if (this.vy > 0) { this._setState(STATES.FALL); break; }
        if (inp.dashJustPressed && this.dashCooldown === 0) { this._startDash(inp); break; }
        if (inp.attackJustPressed) { this._setState(STATES.ATTACK_KICK); break; }
        this._airMove(inp);
        break;

      case STATES.FALL:
        if (this.onWall !== 0 && this.wallJumpLock === 0 && !this.onGround) {
          if ((this.onWall === -1 && inp.left) || (this.onWall === 1 && inp.right)) {
            this._setState(STATES.WALL_SLIDE); break;
          }
        }
        if (this.onGround) { this._landTransition(); break; }
        if (inp.dashJustPressed && this.dashCooldown === 0) { this._startDash(inp); break; }
        if (inp.attackJustPressed) { this._setState(STATES.ATTACK_KICK); break; }
        // dive check
        if (inp.specialJustPressed && this.vy > 0) { this._setState(STATES.DIVE); break; }
        this._airMove(inp);
        break;

      // ── WALL SLIDE / WALL RUN ──
      case STATES.WALL_SLIDE:
        if (this.onGround) { this._landTransition(); break; }
        if (!this.onWall) { this._setState(STATES.FALL); break; }
        if (inp.jumpJustPressed) { this._wallJump(); break; }
        // clamp fall speed
        if (this.vy > CFG.wallSlideSpeed) this.vy = CFG.wallSlideSpeed;
        if (inp.dashJustPressed && this.dashCooldown === 0) { this._startDash(inp); break; }
        break;

      case STATES.WALL_RUN:
        this.wallRunTimer++;
        if (this.wallRunTimer > 40 || this.onGround || !this.onWall) {
          this.wallRunTimer = 0;
          this._setState(STATES.FALL); break;
        }
        if (inp.jumpJustPressed) { this._wallJump(); break; }
        this.vy = -1.5; // run along wall
        break;

      // ── DASH ──
      case STATES.DASH:
        this.dashTimer--;
        this.vx = this.dashVx;
        this.vy = this.dashVy;
        if (this.dashTimer <= 0) {
          this.vx *= 0.4;
          this.vy *= 0.4;
          this._setState(this.onGround ? STATES.RUN : STATES.FALL);
        }
        break;

      // ── SLIDE ──
      case STATES.SLIDE:
        if (this.stateTimer >= CFG.slideDuration || (!inp.crouchHeld && this.stateTimer > 8)) {
          this.slideLock = true;
          this._setState(this.onGround ? STATES.IDLE : STATES.FALL);
        }
        if (!this.onGround) { this._setState(STATES.FALL); break; }
        // friction slows slide
        this.vx *= 0.93;
        break;

      // ── ROLL (landing) ──
      case STATES.ROLL:
        this.vx = this.rollDir * 6.5;
        if (this.stateTimer >= CFG.rollDuration) {
          this._setState(inp.left || inp.right ? STATES.RUN : STATES.IDLE);
        }

        if (this.onWall) { 
          this.vx = 0;
        } else {
          this.vx *= 0.83;
        }

        break;

      // ── VAULT ──
      case STATES.VAULT:
        if (this.stateTimer >= CFG.vaultDuration) {
          this._setState(STATES.FALL);
        }
        this.vx = (this.facingRight ? 1 : -1) * CFG.runSpeed * 1.3;
        this.vy = -4;
        break;

      // ── FLIP / CARTWHEEL ──
      case STATES.FLIP:
        if (this.stateTimer >= CFG.flipDuration) { this._setState(STATES.FALL); }
        if (this.onGround && this.stateTimer > 8) { this._setState(STATES.ROLL); break; }
        this._airMove(inp);
        break;

      case STATES.CARTWHEEL:
        if (this.stateTimer >= CFG.cartwheelDuration) { this._setState(STATES.FALL); }
        if (this.onGround && this.stateTimer > 8) { this._setState(STATES.ROLL); break; }
        this.vx = (this.facingRight ? 1 : -1) * CFG.runSpeed * 1.4;
        break;

      // ── DIVE ──
      case STATES.DIVE:
        if (this.stateTimer >= CFG.diveDuration || this.onGround) {
          if (this.onGround) this._setState(STATES.ROLL);
          else this._setState(STATES.FALL);
          break;
        }
        this.vx = (this.facingRight ? 1 : -1) * CFG.runSpeed * 1.8;
        this.vy = 5;
        break;

      // ── ATTACKS ──
      case STATES.ATTACK_PUNCH:
      case STATES.ATTACK_KICK:
      case STATES.ATTACK_ROUND:
        if (this.stateTimer >= CFG.attackDuration) {
          this.attackHit = false;
          this._setState(this.onGround ? STATES.IDLE : STATES.FALL);
        }
        if (!this.onGround) this._airMove(inp);
        break;

      // ── CROUCH ──
      case STATES.CROUCH:
        if (!inp.crouchHeld) { this.slideLock = false; this._setState(STATES.IDLE); break; }
        if (inp.slideJustPressed && !this.slideLock) { this._startSlide(); break; }
        break;

      case STATES.DEAD:
        break;
    }

    // reset slide lock when button released
    if (!inp.slideJustPressed && !inp.crouchHeld) this.slideLock = false;
  }

  // ── Physics ───────────────────────────────────────────────
  _applyPhysics(platforms) {
    // gravity (skip during dash/vault/wallrun)
    if (![STATES.DASH, STATES.VAULT, STATES.WALL_RUN].includes(this.state)) {
      this.vy += CFG.gravity;
      if (this.vy > CFG.maxFall) this.vy = CFG.maxFall;
    }

    // friction
    if (this.onGround && this.state !== STATES.SLIDE && this.state !== STATES.DASH) {
      this.vx *= CFG.friction;
    } else if (!this.onGround && this.state !== STATES.DASH) {
      this.vx *= CFG.airFriction;
    }

    // move
    this.x += this.vx;
    this.y += this.vy;

    // wrap on leading edge — right edge hits vw, left edge hits 0
    const vw = window.innerWidth;
    if (this.x + this.w > vw)  this.x = 0;            // right exit → appear at left portal
    if (this.x < 0)             this.x = vw - this.w; // left exit  → appear at right portal

    // collide
    this.prevOnGround = this.onGround;
    this.onGround = false;
    this.onWall   = 0;

    for (const p of platforms) {
      this._collide(p);
    }

    // clamp to game floor — 7100 extends below the y=7000 floor platform
    const docH = Math.max(document.documentElement.scrollHeight, 7100);
    if (this.y + this.h > docH) {
      this.y = docH - this.h;
      this.vy = 0;
      this.onGround = true;
    }
  }

  _collide(plat) {
    const px = plat.x, py = plat.y, pw = plat.w, ph = plat.h;
    // broad AABB
    if (this.x + this.w < px || this.x > px + pw) return;
    if (this.y + this.h < py || this.y > py + ph)  return;

    // one-way: only land on top, never block from below or sides
    if (plat.oneWay) {
      const prevBottom = this.y + this.h - this.vy;
      if (this.vy >= 0 && prevBottom <= py + 4) {
        this.y = py - this.h;
        this.landVelocity = this.vy;
        this.vy = 0;
        this.onGround = true;
        if (plat.el && this.landVelocity > 6) {
          plat.el.classList.remove('jiggle');
          void plat.el.offsetWidth;
          plat.el.classList.add('jiggle');
        }
      }
      return;
    }

    const overlapLeft  = (this.x + this.w) - px;
    const overlapRight = (px + pw) - this.x;
    const overlapTop   = (this.y + this.h) - py;
    const overlapBot   = (py + ph) - this.y;

    const minH = Math.min(overlapLeft, overlapRight);
    const minV = Math.min(overlapTop, overlapBot);

    if (minV < minH) {
      // vertical collision
      if (overlapTop < overlapBot) {
        // landing on top
        this.y = py - this.h;
        if (this.vy > 0) {
          this.landVelocity = this.vy;
          this.vy = 0;
          this.onGround = true;
          // trigger jiggle on DOM element
          if (plat.el && this.landVelocity > 6) {
            plat.el.classList.remove('jiggle');
            void plat.el.offsetWidth;
            plat.el.classList.add('jiggle');
          }
        }
      } else {
        // hitting underside
        this.y = py + ph;
        if (this.vy < 0) this.vy = 0;
      }
    } else {
      // horizontal collision (wall)
      if (overlapLeft < overlapRight) {
        this.x = px - this.w;
        this.onWall = 1;  // right wall
      } else {
        this.x = px + pw;
        this.onWall = -1; // left wall
      }
      if (this.state !== STATES.WALL_SLIDE && this.state !== STATES.WALL_RUN) {
        this.vx = 0;
      }
    }
  }

  // ── Helpers ──────────────────────────────────────────────
  _jump() {
    this.vy = -CFG.jumpForce;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this._setState(STATES.JUMP);
    // flip if enough airtime before
    if (this.airTime > 20) this._setState(STATES.FLIP);
  }

  _wallJump() {
    const dir = this.onWall === 1 ? -1 : 1; // kick away from wall
    this.vx = dir * CFG.wallJumpX;
    this.vy = -CFG.wallJumpY;
    this.facingRight = dir === 1;
    this.wallJumpLock = 18;
    this.wallRunTimer = 0;
    this._setState(STATES.JUMP);
  }

  _startDash(inp) {
    let dx = inp.right ? 1 : inp.left ? -1 : (this.facingRight ? 1 : -1);
    let dy = inp.up ? -1 : inp.down ? 1 : 0;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    this.dashVx = (dx / len) * CFG.dashForce;
    this.dashVy = (dy / len) * CFG.dashForce * 0.6;
    this.dashTimer = CFG.dashDuration;
    this.dashCooldown = CFG.dashCooldown;
    this._setState(STATES.DASH);
  }

  _startSlide() {
    this.vx = (this.facingRight ? 1 : -1) * CFG.slideSpeed;
    this._setState(STATES.SLIDE);
  }

  _airMove(inp) {
    const spd = CFG.runSpeed * (inp.sprint ? CFG.sprintMult : 1) * 0.9;
    if (inp.right) { this.vx += (spd  - this.vx) * 0.15; this.facingRight = true; }
    if (inp.left)  { this.vx += (-spd - this.vx) * 0.15; this.facingRight = false; }
  }

  _landTransition() {
    if (this.landVelocity > 17) {
      this.rollDir = this.facingRight ? 1 : -1;
      // cap horizontal speed so the roll doesn't launch the player
      this.vx = Math.sign(this.vx) * Math.min(Math.abs(this.vx) * 0.5, CFG.runSpeed * 1.2);
      this._setState(STATES.ROLL);
    } else if (this.state === STATES.CARTWHEEL || this.state === STATES.FLIP) {
      this._setState(STATES.ROLL);
    } else {
      const inp = this.input;
      this._setState(inp.left || inp.right ? STATES.RUN : STATES.IDLE);
    }
    this.landVelocity = 0;
  }

  _updateCoyote() {
    if (this.prevOnGround && !this.onGround) {
      this.coyoteTimer = CFG.coyoteFrames;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer--;
    }
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer--;
  }

  _setState(s) {
    if (this.state === s) return;
    this.prevState = this.state;
    this.state = s;
    this.stateTimer = 0;
    this.animFrame = 0;
    this.attackHit = false;
  }

  _stateDuration() {
    const map = {
      [STATES.ROLL]:       CFG.rollDuration,
      [STATES.VAULT]:      CFG.vaultDuration,
      [STATES.FLIP]:       CFG.flipDuration,
      [STATES.CARTWHEEL]:  CFG.cartwheelDuration,
      [STATES.SLIDE]:      CFG.slideDuration,
      [STATES.DIVE]:       CFG.diveDuration,
      [STATES.ATTACK_PUNCH]: CFG.attackDuration,
      [STATES.ATTACK_KICK]:  CFG.attackDuration,
      [STATES.ATTACK_ROUND]: CFG.attackDuration,
      [STATES.DASH]:       CFG.dashDuration,
    };
    return map[this.state] || 0;
  }

  // ── Combat ───────────────────────────────────────────────
  getAttackHitbox() {
    // Dash and slide use the player's body as a damage hitbox (one hit per state)
    if (this.state === STATES.DASH || this.state === STATES.SLIDE) {
      if (this.attackHit) return null;
      return {
        x: this.x - 4, y: this.y,
        w: this.w + 8,  h: this.h,
        damage: this.state === STATES.DASH ? 28 : 18,
      };
    }

    if (![STATES.ATTACK_KICK, STATES.ATTACK_PUNCH, STATES.ATTACK_ROUND].includes(this.state)) return null;
    const progress = this.animFrame;
    if (progress < 0.3 || progress > 0.75 || this.attackHit) return null;

    const reach = this.state === STATES.ATTACK_ROUND ? 55 : 42;
    return {
      x: this.facingRight ? this.x + this.w : this.x - reach,
      y: this.y + this.h * 0.2,
      w: reach, h: this.h * 0.5,
      damage: this.state === STATES.ATTACK_ROUND ? 22 :
              this.state === STATES.ATTACK_KICK  ? 18 : 12,
    };
  }

  takeDamage(amount) {
    if (this.invincible > 0 || this.state === STATES.DEAD) return;
    this.hp -= amount;
    this.invincible = 90; // ~1.5s of iframes — enough to escape Splunk spam
    if (this.hp <= 0) {
      this.hp = 0;
      this._setState(STATES.DEAD);
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  registerComboHit(damage) {
    this.attackHit = true;
    this.combo++;
    this.comboTimer = 90;
    return damage;
  }

  // bounding box helpers
  get left()   { return this.x; }
  get right()  { return this.x + this.w; }
  get top()    { return this.y; }
  get bottom() { return this.y + this.h; }
  get cx()     { return this.x + this.w / 2; }
  get cy()     { return this.y + this.h / 2; }
}
