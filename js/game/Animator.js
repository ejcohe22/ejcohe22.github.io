// ============================================================
// Animator.js — stick figure drawing for every player state
// All drawing is relative to player center-bottom
// ============================================================

import { STATES } from './Player.js';

const TAU = Math.PI * 2;

export class Animator {
  constructor() {
    this.trailFrames = [];   // for dash/flip trails
  }

  // ── Main draw entry ─────────────────────────────────────
  draw(ctx, player, camX, camY, frameCount) {
    const x = player.cx - camX;
    const y = player.bottom - camY;
    const facing = player.facingRight ? 1 : -1;
    const t = frameCount;
    const anim = player.animFrame;  // 0..1 within current state
    ctx.globalAlpha = 1;
    ctx.save();
    // flip for facing direction
    ctx.translate(x, y);
    ctx.scale(facing, 1);

    // color theme
    const baseColor   = '#eeeef8';
    const accentColor = '#c97eff';
    const accent2     = '#7effc8';
    const shadowColor = 'rgba(201,126,255,0.25)';

    const p = { base: baseColor, acc: accentColor, acc2: accent2, shadow: shadowColor };

    switch (player.state) {
      case STATES.IDLE:       this._drawIdle(ctx, p, t); break;
      case STATES.RUN:        this._drawRun(ctx, p, t, 1); break;
      case STATES.SPRINT:     this._drawRun(ctx, p, t, 1.6); break;
      case STATES.JUMP:       this._drawJump(ctx, p, anim); break;
      case STATES.FALL:       this._drawFall(ctx, p, anim, player.vy); break;
      case STATES.WALL_SLIDE: this._drawWallSlide(ctx, p, t); break;
      case STATES.WALL_RUN:   this._drawWallRun(ctx, p, t); break;
      case STATES.DASH:       this._drawDash(ctx, p, anim); break;
      case STATES.ROLL:       this._drawRoll(ctx, p, anim); break;
      case STATES.VAULT:      this._drawVault(ctx, p, anim); break;
      case STATES.FLIP:       this._drawFlip(ctx, p, anim); break;
      case STATES.CARTWHEEL:  this._drawCartwheel(ctx, p, anim); break;
      case STATES.SLIDE:      this._drawSlide(ctx, p, anim); break;
      case STATES.DIVE:       this._drawDive(ctx, p, anim); break;
      case STATES.ATTACK_PUNCH:  this._drawPunch(ctx, p, anim); break;
      case STATES.ATTACK_KICK:   this._drawKick(ctx, p, anim); break;
      case STATES.ATTACK_ROUND:  this._drawRoundhouse(ctx, p, anim); break;
      case STATES.CROUCH:     this._drawCrouch(ctx, p); break;
      case STATES.DEAD:       this._drawDead(ctx, p, t); break;
      default:                this._drawIdle(ctx, p, t); break;
    }

    ctx.restore();
  }

  // ── Primitive helpers ────────────────────────────────────
  _head(ctx, color, y = -40, r = 7) {
    ctx.beginPath();
    ctx.arc(0, y, r, 0, TAU);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  _body(ctx, color, y1 = -33, y2 = -18) {
    ctx.beginPath();
    ctx.moveTo(0, y1);
    ctx.lineTo(0, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  _limb(ctx, color, x1, y1, x2, y2, w = 2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  _glow(ctx, color, alpha = 0.3) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 * alpha;
  }

  _clearGlow(ctx) {
    ctx.shadowBlur = 0;
  }

  // ── IDLE ─────────────────────────────────────────────────
  _drawIdle(ctx, p, t) {
    const bob = Math.sin(t * 0.06) * 1.5;
    this._glow(ctx, p.acc, 0.4);
    this._head(ctx, p.base, -40 + bob);
    this._body(ctx, p.base, -33 + bob, -18 + bob);
    // arms relaxed
    this._limb(ctx, p.base, 0, -30 + bob,  8, -22 + bob);  // right arm
    this._limb(ctx, p.base, 0, -30 + bob, -8, -22 + bob);  // left arm
    // legs standing
    this._limb(ctx, p.base, 0, -18 + bob,  6, 0);
    this._limb(ctx, p.base, 0, -18 + bob, -6, 0);
    this._clearGlow(ctx);
  }

  // ── RUN ──────────────────────────────────────────────────
  _drawRun(ctx, p, t, speed = 1) {
    const cycle   = t * 0.22 * speed;
    const bob     = Math.sin(cycle * 2) * 1.5;
    const legSin  = Math.sin(cycle);
    // Arms swing OPPOSITE to same-side leg (natural running gait)
    const armSin  = -legSin;

    this._glow(ctx, p.acc, 0.35);

    // Draw everything in one rotated+bobbing context so nothing detaches
    ctx.save();
    ctx.translate(0, bob);
    ctx.rotate(0.10 * speed);  // forward lean, uniform across whole figure

    this._head(ctx, p.base, -40);
    this._body(ctx, p.base, -33, -18);

    // arms: right arm (x positive) swings back when right leg is forward
    this._limb(ctx, p.base,  0, -30,  10 + armSin * 6,  -20 + armSin * 4);
    this._limb(ctx, p.base,  0, -30,  -8 - armSin * 6,  -20 - armSin * 4);

    // legs cycling
    this._limb(ctx, p.base, 0, -18,  legSin * 10, 0);
    this._limb(ctx, p.base, 0, -18, -legSin * 10, 0);

    ctx.restore();
    this._clearGlow(ctx);
  }

  // ── JUMP (rising) ────────────────────────────────────────
  _drawJump(ctx, p, anim) {
    const tuck = Math.min(anim * 3, 1);
    this._glow(ctx, p.acc2, 0.5);
    this._head(ctx, p.acc, -42);
    this._body(ctx, p.base, -35, -20);
    // arms up
    this._limb(ctx, p.base, 0, -30, -14, -40);
    this._limb(ctx, p.base, 0, -30,  14, -40);
    // legs tucking
    this._limb(ctx, p.base, 0, -20,  8 + tuck * 4, -10 + tuck * 10);
    this._limb(ctx, p.base, 0, -20, -8 - tuck * 4, -10 + tuck * 10);
    this._clearGlow(ctx);
  }

  // ── FALL ─────────────────────────────────────────────────
  _drawFall(ctx, p, anim, vy) {
    const spread = Math.min(vy / 8, 1);
    this._glow(ctx, p.acc, 0.3);
    this._head(ctx, p.base, -40);
    this._body(ctx, p.base, -33, -18);
    // arms spread
    this._limb(ctx, p.base, 0, -28, -16 * spread, -20);
    this._limb(ctx, p.base, 0, -28,  16 * spread, -20);
    // legs spread
    this._limb(ctx, p.base, 0, -18, -12 * spread, 4);
    this._limb(ctx, p.base, 0, -18,  12 * spread, 4);
    this._clearGlow(ctx);
  }

  // ── WALL SLIDE ───────────────────────────────────────────
  _drawWallSlide(ctx, p, t) {
    const grab = Math.sin(t * 0.3) * 1;
    ctx.save();
    ctx.rotate(-0.3); // lean into wall
    this._glow(ctx, p.acc, 0.5);
    this._head(ctx, p.acc, -40 + grab);
    this._body(ctx, p.base, -33, -18);
    // one arm touching wall (right = wall side)
    this._limb(ctx, p.acc,  0, -30,  14, -28 + grab); // wall arm
    this._limb(ctx, p.base, 0, -30, -10, -22);         // free arm
    this._limb(ctx, p.base, 0, -18,  8, 0);
    this._limb(ctx, p.base, 0, -18, -4, 0);
    this._clearGlow(ctx);
    ctx.restore();
  }

  // ── WALL RUN ─────────────────────────────────────────────
  _drawWallRun(ctx, p, t) {
    const cycle = t * 0.28;
    const leg = Math.sin(cycle) * 14;
    ctx.save();
    ctx.rotate(-0.5); // running along wall
    this._glow(ctx, p.acc2, 0.6);
    this._head(ctx, p.acc2, -40);
    this._body(ctx, p.base, -33, -18);
    this._limb(ctx, p.base, 0, -30,  14, -22 + leg * 0.3);
    this._limb(ctx, p.base, 0, -30, -10, -22 - leg * 0.3);
    this._limb(ctx, p.base, 0, -18,  Math.sin(cycle) * 8, 0);
    this._limb(ctx, p.base, 0, -18, -Math.sin(cycle) * 8, 0);
    this._clearGlow(ctx);
    ctx.restore();
  }

  // ── DASH ─────────────────────────────────────────────────
  _drawDash(ctx, p, anim) {
    ctx.save();
    ctx.rotate(-0.25);
    this._glow(ctx, p.acc, 1);
    // motion blur lines
    for (let i = 1; i <= 4; i++) {
      ctx.globalAlpha = 0.15 * (1 - i / 4);
      ctx.save();
      ctx.translate(-i * 7, 0);
      this._head(ctx, p.acc, -38);
      this._body(ctx, p.acc, -31, -18);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    this._head(ctx, p.acc, -38);
    this._body(ctx, p.base, -31, -18);
    this._limb(ctx, p.base, 0, -28, -16, -22);
    this._limb(ctx, p.base, 0, -28,  12, -18);
    this._limb(ctx, p.base, 0, -18,  10, 0);
    this._limb(ctx, p.base, 0, -18, -14, -6);
    this._clearGlow(ctx);
    ctx.restore();
  }

  // ── ROLL ─────────────────────────────────────────────────
  _drawRoll(ctx, p, anim) {
    const angle = anim * TAU * 1.2;
    ctx.save();
    ctx.translate(0, -14);
    ctx.rotate(angle);
    this._glow(ctx, p.acc2, 0.5);
    // tucked ball
    this._head(ctx, p.base, -8, 6);
    // body curled
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0.4, Math.PI * 1.8);
    ctx.strokeStyle = p.base;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // limbs tucked
    this._limb(ctx, p.base, 0, -4, 8, 4);
    this._limb(ctx, p.base, 0, -4, -6, 6);
    this._clearGlow(ctx);
    ctx.restore();
  }

  // ── VAULT (kong) ─────────────────────────────────────────
  _drawVault(ctx, p, anim) {
    const phase = anim;
    ctx.save();
    if (phase < 0.5) {
      // hands plant
      ctx.rotate(-0.6 + phase * 0.6);
    } else {
      // legs fly over
      ctx.rotate((phase - 0.5) * 0.8);
    }
    this._glow(ctx, p.acc, 0.6);
    this._head(ctx, p.base, phase < 0.5 ? -36 : -42);
    this._body(ctx, p.base, -30, -16);
    // arms pushing down
    const armY = phase < 0.5 ? 0 : -20;
    this._limb(ctx, p.acc, 0, -28,  16, armY, 2.5);
    this._limb(ctx, p.acc, 0, -28, -16, armY, 2.5);
    // legs over
    const legSweep = (phase - 0.5) * 2;
    this._limb(ctx, p.base, 0, -16,  10 + legSweep * 8, -4 - legSweep * 12);
    this._limb(ctx, p.base, 0, -16, -10 - legSweep * 4, -8 - legSweep * 8);
    this._clearGlow(ctx);
    ctx.restore();
  }

  // ── BACKFLIP ─────────────────────────────────────────────
  _drawFlip(ctx, p, anim) {
    const angle = anim * TAU;
    ctx.save();
    ctx.translate(0, -22);
    ctx.rotate(-angle);
    this._glow(ctx, p.acc2, 0.7);
    this._head(ctx, p.acc2, -10, 6.5);
    // body
    ctx.beginPath();
    ctx.moveTo(0, -4); ctx.lineTo(0, 12);
    ctx.strokeStyle = p.base; ctx.lineWidth = 2.5; ctx.stroke();
    // arms out for flair
    const armSpread = Math.sin(angle) * 16;
    this._limb(ctx, p.base, 0, 0,  14 + armSpread, -6);
    this._limb(ctx, p.base, 0, 0, -14 - armSpread, -6);
    // legs
    this._limb(ctx, p.base, 0, 12,  8, 22);
    this._limb(ctx, p.base, 0, 12, -8, 22);
    this._clearGlow(ctx);
    ctx.restore();
  }

  // ── CARTWHEEL ─────────────────────────────────────────────
  _drawCartwheel(ctx, p, anim) {
    const angle = anim * TAU;
    ctx.save();
    ctx.translate(0, -22);
    ctx.rotate(angle); // sideways rotation
    this._glow(ctx, p.acc, 0.6);
    this._head(ctx, p.acc, -18, 6.5);
    this._limb(ctx, p.base, 0, -12, 0, 12, 2.5); // body
    // star shape during cartwheel
    this._limb(ctx, p.acc, 0, -4,  20, -4);
    this._limb(ctx, p.acc, 0, -4, -20, -4);
    this._limb(ctx, p.base, 0,  8,  16, 16);
    this._limb(ctx, p.base, 0,  8, -16, 16);
    this._clearGlow(ctx);
    ctx.restore();
  }

  // ── SLIDE ────────────────────────────────────────────────
  _drawSlide(ctx, p, anim) {
    ctx.save();
    ctx.rotate(-0.7); // low to ground
    ctx.translate(0, 12);
    this._glow(ctx, p.acc, 0.4);
    this._head(ctx, p.base, -24, 6);
    this._body(ctx, p.base, -18, -8);
    this._limb(ctx, p.base, 0, -14,  16, -6);   // lead arm
    this._limb(ctx, p.base, 0, -14, -12, -18);  // trail arm up
    this._limb(ctx, p.base, 0, -8,   18, 0);    // lead leg extended
    this._limb(ctx, p.base, 0, -8,  -10, -14);  // trail leg up
    this._clearGlow(ctx);
    ctx.restore();
  }

  // ── DIVE ─────────────────────────────────────────────────
  _drawDive(ctx, p, anim) {
    ctx.save();
    ctx.rotate(-0.5);
    this._glow(ctx, p.acc3, 0.6);
    this._head(ctx, p.acc3, -30);
    this._body(ctx, p.base, -24, -10);
    // superman arms
    this._limb(ctx, p.acc3, 0, -20,  18, -14, 2.5);
    this._limb(ctx, p.acc3, 0, -20, -16, -14, 2.5);
    this._limb(ctx, p.base, 0, -10,  8, 2);
    this._limb(ctx, p.base, 0, -10, -8, 2);
    this._clearGlow(ctx);
    ctx.restore();
  }

  // ── PUNCH ────────────────────────────────────────────────
  _drawPunch(ctx, p, anim) {
    const ext = Math.sin(anim * Math.PI);
    this._glow(ctx, p.acc, 0.5);
    this._head(ctx, p.base, -40);
    this._body(ctx, p.base, -33, -18);
    // punching arm extends forward
    this._limb(ctx, p.acc,  0, -28, 14 + ext * 16, -26, 2.8);
    this._limb(ctx, p.base, 0, -28, -10, -22);
    this._limb(ctx, p.base, 0, -18,  6, 0);
    this._limb(ctx, p.base, 0, -18, -6, 0);
    // fist dot
    if (ext > 0.3) {
      ctx.beginPath();
      ctx.arc(14 + ext * 16, -26, 4, 0, TAU);
      ctx.fillStyle = p.acc;
      ctx.fill();
    }
    this._clearGlow(ctx);
  }

  // ── KICK ─────────────────────────────────────────────────
  _drawKick(ctx, p, anim) {
    const ext = Math.sin(anim * Math.PI);
    this._glow(ctx, p.acc2, 0.5);
    this._head(ctx, p.base, -40);
    this._body(ctx, p.base, -33, -18);
    this._limb(ctx, p.base, 0, -28, -12, -22);
    this._limb(ctx, p.base, 0, -28,  10, -18);
    // kicking leg sweeps forward
    this._limb(ctx, p.acc2, 0, -18, -6, 0); // standing leg
    this._limb(ctx, p.acc2, 0, -18, 10 + ext * 22, -8 - ext * 16, 2.8); // kick
    // foot dot
    if (ext > 0.4) {
      ctx.beginPath();
      ctx.arc(10 + ext * 22, -8 - ext * 16, 4, 0, TAU);
      ctx.fillStyle = p.acc2;
      ctx.fill();
    }
    this._clearGlow(ctx);
  }

  // ── ROUNDHOUSE ──────────────────────────────────────────
  _drawRoundhouse(ctx, p, anim) {
    const spinAngle = anim * Math.PI * 1.5;
    ctx.save();
    ctx.rotate(spinAngle * 0.6);
    this._glow(ctx, p.acc, 0.7);
    this._head(ctx, p.acc, -40);
    this._body(ctx, p.base, -33, -18);
    // spinning arms
    this._limb(ctx, p.base, 0, -28, Math.cos(spinAngle) * 18, -28 + Math.sin(spinAngle) * 8);
    this._limb(ctx, p.base, 0, -28, -Math.cos(spinAngle) * 18, -28 - Math.sin(spinAngle) * 8);
    // spinning leg (the kick)
    const kickX = Math.cos(spinAngle - 0.5) * 28;
    const kickY = -18 + Math.sin(spinAngle - 0.5) * 16;
    this._limb(ctx, p.acc, 0, -18, kickX, kickY, 3);
    this._limb(ctx, p.base, 0, -18, -6, 0);
    // foot
    ctx.beginPath();
    ctx.arc(kickX, kickY, 5, 0, TAU);
    ctx.fillStyle = p.acc;
    ctx.fill();
    this._clearGlow(ctx);
    ctx.restore();
  }

  // ── CROUCH ──────────────────────────────────────────────
  _drawCrouch(ctx, p) {
    ctx.save();
    ctx.translate(0, 10);
    this._glow(ctx, p.acc, 0.3);
    this._head(ctx, p.base, -28, 6);
    this._body(ctx, p.base, -22, -12);
    this._limb(ctx, p.base, 0, -18,  10, -10);
    this._limb(ctx, p.base, 0, -18, -10, -10);
    // legs squatted
    this._limb(ctx, p.base, 0, -12,  14, 0);
    this._limb(ctx, p.base, 0, -12, -14, 0);
    this._clearGlow(ctx);
    ctx.restore();
  }

  // ── DEAD ─────────────────────────────────────────────────
  _drawDead(ctx, p, t) {
    const bounce = Math.max(0, Math.sin(t * 0.15) * 4);
    ctx.save();
    ctx.translate(0, 8 - bounce);
    ctx.rotate(Math.PI * 0.5); // fell over
    ctx.globalAlpha = 0.6;
    this._head(ctx, p.base, -10);
    this._body(ctx, p.base, -4, 12);
    this._limb(ctx, p.base, 0, 0,  10, 10);
    this._limb(ctx, p.base, 0, 0, -10, 10);
    this._limb(ctx, p.base, 0, 12, 12, 20);
    this._limb(ctx, p.base, 0, 12, -6, 20);
    ctx.restore();
  }

  // ============================================================
  // DEMON DRAWING — silhouette + full phases
  // All coords are relative to demon feet (center-bottom, world→screen).
  // Scale: ~2.8× player. Feet=0, hips=-50, shoulders=-90,
  //        head=-112, horn tips=-172, wing tips reach ±155 wide.
  // ============================================================

  drawDemon(ctx, worldX, worldY, camX, camY, isSilhouette, phase, frame) {
    const sx = worldX - camX;
    const sy = worldY - camY;
    const t  = frame;
    const breathe = Math.sin(t * 0.04) * 3;

    ctx.save();
    ctx.translate(sx, sy);

    if (isSilhouette) {
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur  = 35 + Math.sin(t * 0.07) * 8;
    }

    // ── Wings (behind body) ─────────────────────────────────
    this._demonWing(ctx, -1, isSilhouette, phase, t, breathe);
    this._demonWing(ctx,  1, isSilhouette, phase, t, breathe);

    // ── Torso (filled quad: wide at shoulders, narrow at hips) ─
    const sw = 34; // half-shoulder width
    const hw = 12; // half-hip width
    const sy0 = -90 + breathe; // shoulder y
    const hy0 = -50 + breathe; // hip y
    ctx.beginPath();
    ctx.moveTo(-sw, sy0);
    ctx.lineTo( sw, sy0);
    ctx.lineTo( hw, hy0);
    ctx.lineTo(-hw, hy0);
    ctx.closePath();
    if (isSilhouette) {
      ctx.fillStyle = '#000';
      ctx.fill();
    } else {
      ctx.fillStyle = '#1a0000';
      ctx.fill();
      // chest detail line
      ctx.strokeStyle = '#5a1010';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, sy0); ctx.lineTo(0, hy0);
      ctx.stroke();
    }

    // ── Legs ────────────────────────────────────────────────
    const legColor = isSilhouette ? '#000' : '#2a0808';
    ctx.strokeStyle = legColor;
    ctx.lineWidth   = isSilhouette ? 13 : 6;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, hy0); ctx.lineTo(-24, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 10, hy0); ctx.lineTo( 24, 0); ctx.stroke();
    // armored knee
    if (!isSilhouette) {
      ctx.fillStyle = '#4a0000';
      ctx.fillRect(-20, -26, 9, 7);
      ctx.fillRect( 11, -26, 9, 7);
    }

    // ── Arms ────────────────────────────────────────────────
    this._demonArm(ctx, -1, isSilhouette, phase, t, breathe);
    this._demonArm(ctx,  1, isSilhouette, phase, t, breathe);

    // ── Head ────────────────────────────────────────────────
    const headY = -112 + breathe;
    if (isSilhouette) {
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur  = 35;
      ctx.fillStyle   = '#000';
      ctx.beginPath();
      ctx.arc(0, headY, 20, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#5a0808';
      ctx.lineWidth   = 3;
      ctx.fillStyle   = '#120000';
      ctx.beginPath();
      ctx.arc(0, headY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // ── Horns ───────────────────────────────────────────────
    ctx.strokeStyle = isSilhouette ? '#000' : '#3d0000';
    ctx.lineWidth   = isSilhouette ? 11 : 5;
    ctx.lineCap = 'round';
    // left horn: sweeps up-left, curls slightly inward at tip
    ctx.beginPath();
    ctx.moveTo(-14, headY - 16);
    ctx.bezierCurveTo(-34, headY - 48, -28, headY - 76, -8, headY - 85);
    ctx.stroke();
    // right horn
    ctx.beginPath();
    ctx.moveTo( 14, headY - 16);
    ctx.bezierCurveTo( 34, headY - 48,  28, headY - 76,  8, headY - 85);
    ctx.stroke();

    // ── Eyes (always glow — even in silhouette) ─────────────
    ctx.save();
    const eyeFlicker = isSilhouette
      ? (0.5 + Math.sin(t * 0.18) * 0.4)  // pulsing in silhouette
      : 1;
    ctx.globalAlpha  = eyeFlicker;
    ctx.shadowColor  = '#ff4466';
    ctx.shadowBlur   = 22;
    ctx.fillStyle    = '#ff4466';
    ctx.beginPath(); ctx.arc(-7, headY, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 7, headY, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  // ── Bat wing (side: -1=left, 1=right) ───────────────────
  _demonWing(ctx, side, isSilhouette, phase, t, breathe) {
    const flapOffset = Math.sin(t * 0.04) * 8; // gentle flap
    const spread = phase >= 2 ? 1.18 : 1.0;

    // anchor points
    const rx  = side * 34,  ry  = -90  + breathe;  // shoulder root
    const hx  = side * 20,  hy  = -55  + breathe;  // hip close point
    const tipX = side * 155 * spread;
    const tipY = -165 - flapOffset + breathe;

    // Control points for the leading-edge bezier
    const cp1x = side * 72,  cp1y = ry - 40;
    const cp2x = side * 122, cp2y = tipY + 22;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tipX, tipY);

    // Trailing edge: 4 finger joints zigzagging from tip back to hip
    const fingers = 4;
    for (let f = 0; f < fingers; f++) {
      const t1 = (f + 0.5) / fingers; // membrane midpoint (finger base)
      const t2 = (f + 1.0) / fingers; // membrane point (finger returns)

      const mx1 = tipX + (hx - tipX) * t1;
      const my1 = tipY + (hy - tipY) * t1;
      const mx2 = tipX + (hx - tipX) * t2;
      const my2 = tipY + (hy - tipY) * t2;

      const fingerLen = 26 - f * 5; // longer near tip
      const fx = mx1 + side * fingerLen * 0.85;
      const fy = my1 + fingerLen * 0.45;

      ctx.lineTo(fx, fy);   // to finger tip
      ctx.lineTo(mx2, my2); // back to membrane
    }

    ctx.lineTo(hx, hy);
    ctx.closePath();

    if (isSilhouette) {
      ctx.fillStyle   = '#000';
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur  = 35;
      ctx.fill();
    } else {
      const alpha = phase === 3 ? 0.98 : 0.88;
      ctx.fillStyle   = phase === 3 ? '#3a0000' : '#1a0005';
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      // single vein line for texture
      ctx.strokeStyle = '#4a0808';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(tipX * 0.6, (ry + tipY) / 2 - 10, tipX, tipY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // ── Arm raised outward + clawed hand ────────────────────
  _demonArm(ctx, side, isSilhouette, phase, t, breathe) {
    const shoulderX = side * 34, shoulderY = -90 + breathe;
    const elbowX    = side * 65, elbowY    = -118 + breathe + Math.sin(t * 0.05) * 2;
    const wristX    = side * 82, wristY    = -138 + breathe + Math.sin(t * 0.05 + 0.6) * 3;

    const armColor = isSilhouette ? '#000' : '#5a0808';
    ctx.strokeStyle = armColor;
    ctx.lineCap = 'round';

    // upper arm
    ctx.lineWidth = isSilhouette ? 13 : 6;
    ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(elbowX, elbowY); ctx.stroke();

    // forearm
    ctx.lineWidth = isSilhouette ? 11 : 5;
    ctx.beginPath(); ctx.moveTo(elbowX, elbowY); ctx.lineTo(wristX, wristY); ctx.stroke();

    // claws: 4 lines fanning from wrist
    ctx.lineWidth = isSilhouette ? 7 : 2.5;
    const baseAngle = side > 0 ? -1.2 : -Math.PI + 1.2;
    for (let c = 0; c < 4; c++) {
      const angle   = baseAngle + c * 0.28 * side;
      const clawLen = c === 1 || c === 2 ? 22 : 17; // middle two longer
      const ex = wristX + Math.cos(angle) * clawLen;
      const ey = wristY + Math.sin(angle) * clawLen;
      ctx.beginPath(); ctx.moveTo(wristX, wristY); ctx.lineTo(ex, ey); ctx.stroke();
    }

    if (!isSilhouette) {
      // elbow joint dot
      ctx.fillStyle = '#3a0000';
      ctx.beginPath(); ctx.arc(elbowX, elbowY, 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── Shadow under player ──────────────────────────────────
  drawShadow(ctx, player, camX, camY) {
    const x = player.cx - camX;
    const groundY = player.bottom - camY;

    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.ellipse(x, groundY + 2, 14, 4, 0, 0, TAU);
    ctx.fillStyle = '#c97eff';
    ctx.fill();
    ctx.restore();
  }
}
