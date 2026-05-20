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
    const W       = window.innerWidth;
    const FLOOR_Y = 7000;

    const thin = (x, y, w) => ({ x, y, w, h: 12, type: 'static', el: null, isDom: false, oneWay: true });
    const wall = (x, y, h)  => ({ x, y, w: 14, h, type: 'static', el: null, isDom: false, oneWay: false });

    const defs = [

      // ── TOP GROUND + ABSOLUTE FLOOR ───────────────────────
      thin(0,    0,       W),           // ground at page top — player lands here on spawn
      thin(-200, FLOOR_Y, W + 400),     // absolute floor

      // ── HERO  y 155–930 ───────────────────────────────────
      thin(W * 0.62,  155, 200),
      thin(W * 0.06,  162, 200),
      thin(W * 0.42,  247, 240),
      thin(W * 0.63,  364, 240),
      thin(W * 0.07,  430, 240),
      thin(W * 0.40,  478, 280),
      thin(W * 0.81,  515, 220),
      thin(W * 0.04,  627, 558),
      thin(W * 0.80,  630, 220),
      thin(W * 0.57,  710, 240),
      thin(W * 0.28,  773, 260),
      thin(W * 0.75,  789, 240),
      thin(W * 0.45,  864, 260),
      thin(W * 0.10,  900, 260),
      thin(W * 0.06,  930, 240),

      // ── UPPER-MID  y 958–1879 ─────────────────────────────
      thin(W * 0.76,  958, 240),
      thin(W * 0.38, 1080, 280),
      thin(W * 0.89, 1160, 220),
      thin(W * 0.08, 1200, 220),
      thin(W * 0.53, 1209, 220),
      thin(W * 0.78, 1261, 220),
      thin(W * 0.20, 1310, 260),
      thin(W * 0.44, 1389, 600),
      thin(W * 0.07, 1470, 240),
      thin(W * 0.83, 1510, 200),
      thin(W * 0.12, 1550, 260),
      thin(W * 0.70, 1648, 240),
      thin(W * 0.35, 1662, 280),
      thin(W * 0.05, 1676, 220),
      thin(W * 0.85, 1870, 220),
      thin(W * 0.43, 1879, 240),

      // ── LOWER-MID  y 1960–3424 ────────────────────────────
      thin(W * 0.18, 1960, 260),
      thin(W * 0.06, 2020, 240),
      thin(W * 0.60, 2085, 240),
      thin(W * 0.42, 2269, 280),
      thin(W * 0.05, 2281, 220),
      thin(W * 0.76, 2356, 220),
      thin(W * 0.25, 2465, 260),
      thin(W * 0.56, 2492, 220),
      thin(W * 0.88, 2540, 240),
      thin(W * 0.03, 2566, 240),
      thin(W * 0.74, 2727, 220),
      thin(W * 0.10, 2730, 260),
      thin(W * 0.37, 2768, 200),
      thin(W * 0.63, 2902, 240),
      thin(W * 0.03, 2915, 563),
      thin(W * 0.83, 3103, 204),
      thin(W * 0.43, 3119, 280),
      thin(W * 0.03, 3131, 240),
      thin(W * 0.75, 3238, 220),
      thin(W * 0.17, 3383, 260),
      thin(W * 0.47, 3424, 240),

      // ── DESCENT  y 3547–5357 ──────────────────────────────
      thin(W * 0.81, 3547, 220),
      thin(W * 0.01, 3644, 220),
      thin(W * 0.15, 3789, 755),
      thin(W * 0.76, 3890, 240),
      thin(W * 0.07, 3960, 240),
      thin(W * 0.23, 4085, 260),
      thin(W * 0.51, 4228, 234),
      thin(W * 0.81, 4259, 220),
      thin(W * 0.09, 4360, 220),
      thin(W * 0.68, 4395, 240),
      thin(W * 0.19, 4490, 240),
      thin(W * 0.34, 4650, 280),
      thin(W * 0.03, 4717, 240),
      thin(W * 0.80, 4723, 240),
      thin(W * 0.55, 4839, 202),
      thin(W * 0.13, 4883, 260),
      thin(W * 0.03, 5140, 390),
      thin(W * 0.77, 5145, 282),
      thin(W * 0.43, 5276, 240),
      thin(W * 0.14, 5357, 345),

      // ── WARP  y 5474–6077 ─────────────────────────────────
      thin(W * 0.64, 5474, 327),
      thin(W * 0.38, 5475, 323),
      thin(W * 0.14, 5477, 325),
      thin(W * 0.69, 5641, 405),
      thin(W * 0.02, 5669, 260),
      thin(W * 0.37, 5724, 240),
      thin(W * 0.21, 5843, 220),
      thin(W * 0.60, 5896, 469),
      thin(W * 0.03, 5967, 220),
      thin(W * 0.38, 6059, 280),
      thin(W * 0.74, 6077, 240),

      // ── FINAL  y 6180–6901 ────────────────────────────────
      thin(W * 0.48, 6180, 260),
      thin(W * 0.10, 6308, 260),
      thin(W * 0.87, 6320, 240),
      thin(W * 0.31, 6437, 240),
      thin(W * 0.62, 6477, 240),
      thin(W * 0.00, 6547, 240),
      thin(W * 0.89, 6613, 220),
      thin(W * 0.30, 6712, 260),
      thin(W * 0.66, 6756, 240),
      thin(W * 0.06, 6901, 220),

      // ── INTERIOR WALLS ────────────────────────────────────
      wall(W * 0.79,  381, 260),
      wall(W * 0.28,  626, 280),
      wall(W * 0.38, 1100, 300),
      wall(W * 0.60, 1410, 280),
      wall(W * 0.25, 1760, 260),
      wall(W * 0.76, 2088, 280),
      wall(W * 0.42, 2480, 300),
      wall(W * 0.62, 2872, 260),
      wall(W * 0.29, 3096, 280),
      wall(W * 0.76, 3640, 260),
      wall(W * 0.22, 3960, 280),
      wall(W * 0.47, 4388, 260),
      wall(W * 0.68, 4851, 280),
      wall(W * 0.43, 4990, 300),
      wall(W * 0.37, 5480, 260),
      wall(W * 0.68, 5776, 280),
      wall(W * 0.29, 6061, 300),
      wall(W * 0.58, 6654, 260),

    ];

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
