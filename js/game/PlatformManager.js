// ============================================================
// PlatformManager.js — DOM scraping + static level platforms
// ============================================================

export class PlatformManager {
  constructor() {
    this.platforms = [];
    this.domPlatforms = [];
    this.staticPlatforms = [];
  }

  // ── Build all platforms ─────────────────────────────────
  build() {
    this.platforms = [];
    this._buildDomPlatforms();
    this._buildStaticPlatforms();
    this.platforms = [...this.staticPlatforms, ...this.domPlatforms];
    return this.platforms;
  }

  // ── Rebuild on resize/scroll ────────────────────────────
  refresh() {
    this.domPlatforms = [];
    this._buildDomPlatforms();
    // re-merge
    this.platforms = [...this.staticPlatforms, ...this.domPlatforms];
    return this.platforms;
  }

  // ── DOM element scraping ─────────────────────────────────
  _buildDomPlatforms() {
    // elements that become platforms (top surface)
    const selectors = [
      { sel: '#main-nav',      thick: 56, type: 'nav' },
      { sel: '.marquee-bar',   thick: 38, type: 'marquee' },
      { sel: '.section-title', thick: 20, type: 'heading' },
      { sel: '.section-label', thick: 16, type: 'label' },
      { sel: '.project-card',  thick: 16, type: 'card' },
      { sel: '.music-card',    thick: 16, type: 'card' },
      { sel: '.tl-item',       thick: 12, type: 'card' },
      { sel: '.status-card',   thick: 16, type: 'card' },
      { sel: '.chip',          thick: 10, type: 'chip' },
      { sel: 'footer',         thick: 16, type: 'floor' },
      { sel: '.hero-content',  thick: 16, type: 'card' },
      { sel: '.client-pill',   thick: 12, type: 'chip' },
    ];

    const pageScrollY = window.scrollY;

    selectors.forEach(({ sel, thick, type }) => {
      document.querySelectorAll(sel).forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width < 20 || r.height < 6) return;

        const plat = {
          x: r.left + pageScrollY * 0,  // relative to viewport (camera handles scroll)
          y: r.top + pageScrollY,        // absolute page position
          w: r.width,
          h: Math.min(thick, r.height),
          type,
          el,
          isDom: true,
          oneWay: true,  // DOM elements are always passable from below/sides
        };
        this.domPlatforms.push(plat);
      });
    });
  }

  // ── Static floating platforms (game-only, only visible when game active) ──
  _buildStaticPlatforms() {
    this.staticPlatforms = [];
    const W = window.innerWidth;
    const docH = document.documentElement.scrollHeight;

    const thin = (x, y, w) => ({ x, y, w, h: 12, type: 'static', el: null, isDom: false, oneWay: true });
    const wall = (x, y, h)  => ({ x, y, w: 14, h, type: 'static', el: null, isDom: false, oneWay: false });

    // Jump height ≈ 183px. Zigzag steps max 90px apart vertically so you can
    // always reach the next platform above from a standing jump.
    const defs = [
      // ── hero area ───────────────────────────────
      thin(W * 0.55, 260, 120),
      thin(W * 0.10, 330, 140),
      thin(W * 0.78, 390, 110),
      thin(W * 0.32, 460, 160),

      // ── hero → whoami ───────────────────────────
      thin(W * 0.65, 540, 130),
      thin(W * 0.15, 610, 120),
      thin(W * 0.72, 680, 110),
      thin(W * 0.30, 750, 130),
      thin(W * 0.60, 820, 120),
      thin(W * 0.12, 890, 130),

      // ── whoami zone ─────────────────────────────
      thin(W * 0.75, 960,  120),
      thin(W * 0.35, 1030, 150),
      thin(W * 0.65, 1100, 120),
      thin(W * 0.18, 1170, 130),
      thin(W * 0.50, 1240, 140),

      // ── whoami → work ───────────────────────────
      thin(W * 0.80, 1320, 120),
      thin(W * 0.20, 1400, 130),
      thin(W * 0.60, 1470, 110),
      thin(W * 0.35, 1540, 140),

      // ── work zone ───────────────────────────────
      thin(W * 0.75, 1620, 120),
      thin(W * 0.12, 1700, 130),
      thin(W * 0.55, 1780, 110),
      thin(W * 0.28, 1860, 150),
      thin(W * 0.72, 1940, 120),

      // ── work → music ────────────────────────────
      thin(W * 0.18, 2020, 120),
      thin(W * 0.62, 2100, 130),
      thin(W * 0.10, 2180, 110),
      thin(W * 0.48, 2260, 140),

      // ── music zone ──────────────────────────────
      thin(W * 0.80, 2340, 120),
      thin(W * 0.25, 2420, 130),
      thin(W * 0.65, 2500, 110),
      thin(W * 0.12, 2570, 120),

      // ── music → projects ────────────────────────
      thin(W * 0.55, 2640, 130),
      thin(W * 0.30, 2720, 110),
      thin(W * 0.75, 2800, 140),

      // ── projects zone ───────────────────────────
      thin(W * 0.18, 2880, 130),
      thin(W * 0.62, 2960, 120),
      thin(W * 0.38, 3040, 150),
      thin(W * 0.78, 3110, 110),

      // ── below projects: fill the sparse zone down to the floor ──
      // Right wall gap is at y≈3155; left at y≈3555. These platforms
      // create a reachable staircase so the player can never get stuck.
      thin(W * 0.62, 3180, 130),
      thin(W * 0.22, 3260, 120),
      thin(W * 0.80, 3340, 130),
      thin(W * 0.38, 3420, 120),
      thin(W * 0.70, 3500, 130),

      // Near-wall escape ladders — step up to each gap from the floor.
      // Left wall: gap at ≈3555, right wall: gap at ≈3155.
      // Spaced ≤160px apart (well within jump height of 183px).
      thin(W * 0.07, docH - 170, 110),   // left wall, near floor
      thin(W * 0.07, docH - 330, 110),
      thin(W * 0.07, docH - 490, 110),
      thin(W * 0.07, docH - 650, 110),   // reaches left gap at ~3555

      thin(W * 0.88, docH - 170, 110),   // right wall, near floor
      thin(W * 0.88, docH - 330, 110),
      thin(W * 0.88, docH - 490, 110),
      thin(W * 0.88, docH - 650, 110),
      thin(W * 0.88, docH - 810, 110),   // reaches right gap at ~3155

      // ── bottom safety row: covers the full page width ──
      thin(W * 0.05, docH - 80, 150),
      thin(W * 0.28, docH - 80, 150),
      thin(W * 0.52, docH - 80, 150),
      thin(W * 0.75, docH - 80, 150),

    ];

    // ── Wall-edge catchers: narrow shelves every 150px along each wall ──
    // Prevents uncontrolled freefall when falling off near-wall platforms.
    // 150px spacing is safely within max jump height (183px).
    for (let y = 100; y < docH * 1.5; y += 150) {
      defs.push(thin(W * 0.03 + 14, y, 52)); // just inside left wall
      defs.push(thin(W * 0.97 - 66, y, 52)); // just inside right wall
    }

    // ── Side walls with gaps so the player can pass through ──
    // Left wall: gaps at y≈780, 1700, 2620 ...
    // Right wall: gaps offset by 380px so they never align with left
    const gapH   = 145;  // opening height — comfortably passable
    const solidH = 780;

    for (let y = 0; y < docH * 1.5; y += solidH + gapH) {
      defs.push(wall(W * 0.03, y, solidH)); // left
    }
    defs.push(wall(W * 0.97, 0, 380));      // right wall: solid cap before first gap
    for (let y = 380 + gapH; y < docH * 1.5; y += solidH + gapH) {
      defs.push(wall(W * 0.97, y, solidH)); // right
    }

    // ── Interior short vertical obstacles (cover + platforming variety) ──
    const interiors = [
      wall(W * 0.22, 400,  190),
      wall(W * 0.72, 650,  160),
      wall(W * 0.38, 1010, 200),
      wall(W * 0.65, 1300, 170),
      wall(W * 0.25, 1620, 185),
      wall(W * 0.78, 1960, 165),
      wall(W * 0.42, 2340, 180),
      wall(W * 0.68, 2720, 170),
    ];
    interiors.forEach(w => defs.push(w));

    defs.forEach(d => this.staticPlatforms.push(d));
  }

  // ── Refresh DOM platform positions (after scroll/resize) ──
  updateDomPositions() {
    const scrollY = window.scrollY;
    this.domPlatforms.forEach(p => {
      if (!p.el) return;
      const r = p.el.getBoundingClientRect();
      p.x = r.left;
      p.y = r.top + scrollY;
      p.w = r.width;
    });
  }

  // ── Draw platforms (game layer) ──────────────────────────
  draw(ctx, camX, camY) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    this.platforms.forEach(p => {
      // cull off-screen
      const sx = p.x - camX;
      const sy = p.y - camY;
      if (sx + p.w < -50 || sx > vw + 50) return;
      if (sy + p.h < -50 || sy > vh + 50) return;

      ctx.save();
      if (p.type === 'static') {
        // floating game platforms — glowing purple
        ctx.strokeStyle = 'rgba(201,126,255,0.6)';
        ctx.shadowColor  = '#c97eff';
        ctx.shadowBlur   = 8;
        ctx.lineWidth    = 1.5;
        ctx.strokeRect(sx, sy, p.w, p.h);
        // inner fill
        ctx.fillStyle = 'rgba(201,126,255,0.06)';
        ctx.fillRect(sx, sy, p.w, p.h);
        // top surface glow line
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + p.w, sy);
        ctx.strokeStyle = 'rgba(201,126,255,0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (p.type === 'nav' || p.type === 'floor') {
        // nav/footer — solid bright outline
        ctx.strokeStyle = 'rgba(126,255,200,0.5)';
        ctx.shadowColor  = '#7effc8';
        ctx.shadowBlur   = 6;
        ctx.lineWidth    = 1;
        ctx.strokeRect(sx, sy, p.w, p.h);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + p.w, sy);
        ctx.strokeStyle = 'rgba(126,255,200,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (p.type === 'card') {
        // DOM cards — subtle teal outline
        ctx.strokeStyle = 'rgba(126,255,200,0.25)';
        ctx.shadowColor  = '#7effc8';
        ctx.shadowBlur   = 4;
        ctx.lineWidth    = 1;
        ctx.strokeRect(sx, sy, p.w, p.h);
        // top surface only
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + p.w, sy);
        ctx.strokeStyle = 'rgba(126,255,200,0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (p.type === 'chip') {
        // chips — tiny orange accents
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + p.w, sy);
        ctx.strokeStyle = 'rgba(255,126,84,0.5)';
        ctx.shadowColor  = '#ff7e54';
        ctx.shadowBlur   = 4;
        ctx.lineWidth    = 1.5;
        ctx.stroke();
      } else {
        // default DOM
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + p.w, sy);
        ctx.strokeStyle = 'rgba(201,126,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    });
  }
}
