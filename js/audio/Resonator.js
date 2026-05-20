// ============================================================
// Resonator.js — physics marble instrument
// Two-click platform placement, marble drops, Web Audio synth
// FX panel: reverb, delay, 5-band EQ, live spectrum
// ============================================================

const INSTRUMENTS = {
  marimba: { label: 'Marimba', color: '#c97eff', emoji: '🟣' },
  bell:    { label: 'Bell',    color: '#54c8ff', emoji: '🔵' },
  pluck:   { label: 'Pluck',   color: '#7effc8', emoji: '🟢' },
  bass:    { label: 'Bass',    color: '#ffd966', emoji: '🟡' },
};
const INSTRUMENT_KEYS = Object.keys(INSTRUMENTS);

const SCALES = [
  { name: 'Pentatonic',   ratios: [1, 9/8, 5/4, 3/2, 5/3, 2] },
  { name: 'Major',        ratios: [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8, 2] },
  { name: 'Minor',        ratios: [1, 9/8, 6/5, 4/3, 3/2, 8/5, 9/5, 2] },
  { name: 'Blues',        ratios: [1, 6/5, 4/3, 7/5, 3/2, 9/5, 2] },
  { name: 'Just 5-limit', ratios: [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8, 2] },
];

const EQ_BANDS = [
  { freq: 80,    type: 'lowshelf',  label: '80' },
  { freq: 300,   type: 'peaking',   label: '300' },
  { freq: 1000,  type: 'peaking',   label: '1k' },
  { freq: 3500,  type: 'peaking',   label: '3.5k' },
  { freq: 10000, type: 'highshelf', label: '10k' },
];

const BASE_FREQ = 880;
const MIN_LEN   = 20;

// ── Marble ─────────────────────────────────────────────────────
class Marble {
  constructor(x, y, instrument) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 1.2;
    this.vy = 0;
    this.r  = 10;
    this.instrument = instrument;
    this.color      = INSTRUMENTS[instrument].color;
    this.trail      = [];
    this.alive      = true;
    this.hitPlatforms = new Set();
  }
}

// ── Particle ───────────────────────────────────────────────────
class Particle {
  constructor(x, y, vx, vy, color, r, life, shape = 'circle', rotSpeed = 0) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.r = r; this.maxR = r;
    this.life = life; this.maxLife = life;
    this.shape = shape;
    this.rot = Math.random() * Math.PI * 2;
    this.rotSpeed = rotSpeed;
    this.alive = true;
    this.ringR = 0; this.maxRingR = 70;
  }
}

// ── Platform ───────────────────────────────────────────────────
class Platform {
  constructor(ax, ay, bx, by, instrument) {
    this.ax = ax; this.ay = ay; this.bx = bx; this.by = by;
    this.instrument = instrument;
    this.color = INSTRUMENTS[instrument].color;
    this.hitTimer = 0; this.hitCooldown = 0; this.rubberTimer = 0;
    this._derive();
  }
  _derive() {
    const dx = this.bx - this.ax, dy = this.by - this.ay;
    this.len = Math.hypot(dx, dy) || 0.001;
    this.tx = dx / this.len; this.ty = dy / this.len;
    this.nx = -this.ty;      this.ny =  this.tx;
    this.mx = (this.ax + this.bx) / 2;
    this.my = (this.ay + this.by) / 2;
  }
  setA(x, y) { this.ax = x; this.ay = y; this._derive(); }
  setB(x, y) { this.bx = x; this.by = y; this._derive(); }
}

// ── Main class ─────────────────────────────────────────────────
export class Resonator {
  constructor() {
    this.running = false;
    this.canvas  = null; this.ctx = null;
    this.toolbar = null; this.raf = null;

    this.marbles   = []; this.platforms = []; this.particles = [];

    // Draw / interaction state
    this.mode             = 'draw';
    this.drawPointA       = null;
    this.mousePos         = { x: 0, y: 0 };   // screen coords
    this.worldMouse       = { x: 0, y: 0 };   // world coords
    this.draggingEndpoint = null;

    // Camera / viewport
    this.camera = {
      x:        0,      // world-space centre of viewport
      y:        0,
      zoom:     1,      // 1 = 100 %
      tracking: true,   // auto-follow marble centroid
    };
    this._panning   = false;
    this._panStart  = null;   // { sx, sy, cx, cy } on middle-button down

    // Musical settings
    this.instrument        = 'marimba';
    this.quantize          = false;
    this.scaleIndex        = 0;
    this.gravityDir        = 1;
    this.gravityFlashTimer = 0;

    // FX state (all values user-facing, mapped to audio nodes)
    this.fx = {
      reverbWet:       0.22,   // 0–1
      delayTime:       0.25,   // seconds
      delayFeedback:   0.35,   // 0–0.95
      delayMix:        0.0,    // 0–1
      eqGains:         [0, 0, 0, 0, 0],  // dB, -12 to +12
      fxOpen:          false,
    };

    // Audio nodes (null until _initAudio)
    this.audioCtx        = null;
    this.preEQ           = null;   // all noteGains connect here
    this.eqFilters       = [];
    this.postEQ          = null;   // after eq chain
    this.reverbSendGain  = null;
    this.reverbOutGain   = null;
    this.convolver       = null;
    this.delayNode       = null;
    this.delayFeedback   = null;
    this.delaySendGain   = null;
    this.delayWetGain    = null;
    this.masterGain      = null;
    this.analyser        = null;
    this.spectrumData    = null;

    // Toolbar canvases (queried after each toolbar refresh)
    this.spectrumCanvas  = null;
    this.eqCanvas        = null;

    // FX floating panel
    this.fxPanel = null;

    // Background visualizer state
    this.visRings      = [];
    this.visBassSmooth = 0;
    this.visEnergy     = 0;
    this.visStars      = [];
    this.timeDomainData = null;

    // Bound handlers
    this._onMouseDown   = this._mouseDown.bind(this);
    this._onMouseMove   = this._mouseMove.bind(this);
    this._onMouseUp     = this._mouseUp.bind(this);
    this._onContextMenu = this._contextMenu.bind(this);
    this._onWheel       = this._wheel.bind(this);
    this._onKey         = this._keyDown.bind(this);
    this._onResize      = this._resize.bind(this);
    this._loop          = this._tick.bind(this);
    this._onTouchStart  = this._touchStart.bind(this);
    this._onTouchMove   = this._touchMove.bind(this);
    this._onTouchEnd    = this._touchEnd.bind(this);

    // Pinch-zoom state
    this._pinch = null;
  }

  // ── Lifecycle ──────────────────────────────────────────────────
  start() {
    if (this.running) return;
    this.running = true;
    this._createCanvas();
    this._createToolbar();
    this._initAudio();
    this._initVisBg();
    window.addEventListener('keydown',     this._onKey);
    window.addEventListener('resize',      this._onResize);
    this.canvas.addEventListener('mousedown',   this._onMouseDown);
    this.canvas.addEventListener('mousemove',   this._onMouseMove);
    this.canvas.addEventListener('mouseup',     this._onMouseUp);
    this.canvas.addEventListener('contextmenu', this._onContextMenu);
    this.canvas.addEventListener('wheel',       this._onWheel,      { passive: false });
    this.canvas.addEventListener('touchstart',  this._onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove',   this._onTouchMove,  { passive: false });
    this.canvas.addEventListener('touchend',    this._onTouchEnd,   { passive: false });
    this.raf = requestAnimationFrame(this._loop);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown',  this._onKey);
    window.removeEventListener('resize',   this._onResize);
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown',   this._onMouseDown);
      this.canvas.removeEventListener('mousemove',   this._onMouseMove);
      this.canvas.removeEventListener('mouseup',     this._onMouseUp);
      this.canvas.removeEventListener('contextmenu', this._onContextMenu);
      this.canvas.removeEventListener('wheel',       this._onWheel);
      this.canvas.removeEventListener('touchstart',  this._onTouchStart);
      this.canvas.removeEventListener('touchmove',   this._onTouchMove);
      this.canvas.removeEventListener('touchend',    this._onTouchEnd);
      this.canvas.remove(); this.canvas = null;
    }
    if (this.toolbar)  { this.toolbar.remove();  this.toolbar  = null; }
    if (this.fxPanel)  { this.fxPanel.remove();  this.fxPanel  = null; }
    if (this.audioCtx) { this.audioCtx.close();  this.audioCtx = null; }
    this.marbles = []; this.particles = []; this.platforms = [];
    this.drawPointA = null; this.draggingEndpoint = null;
    this.spectrumCanvas = null; this.eqCanvas = null;
    this.visRings = [];
  }

  // ── Canvas ─────────────────────────────────────────────────────
  _createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'resonator-canvas';
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  _resize() {
    if (!this.canvas) return;
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    for (const p of this.platforms) {
      p.freq  = this._freqFromLen(p.len);
      p.label = this._label(p.freq);
    }
  }

  // ── Toolbar ────────────────────────────────────────────────────
  _createToolbar() {
    const tb = document.createElement('div');
    tb.id = 'resonator-toolbar';
    tb.innerHTML = this._toolbarHTML();
    document.body.appendChild(tb);
    this.toolbar = tb;
    this._wireToolbar();
    this._queryFXCanvases();
  }

  _queryFXCanvases() {
    this.spectrumCanvas = this.toolbar?.querySelector('#res-spectrum');
    this.eqCanvas       = this.fxPanel?.querySelector('#res-eq-curve');
  }

  _isMobile() { return window.innerWidth <= 768; }

  _toolbarHTML() {
    const inst     = INSTRUMENTS[this.instrument];
    const instBtns = INSTRUMENT_KEYS.map(k => {
      const i = INSTRUMENTS[k];
      return `<button class="tb-instrument-btn${k === this.instrument ? ' active' : ''}"
        style="--inst-color:${i.color}" data-inst="${k}">
        <span class="inst-swatch"></span>${i.label}
      </button>`;
    }).join('');

    const body = `
      <hr class="tb-divider">
      <div class="tb-label">MODE</div>
      <div class="tb-mode-row">
        <button class="tb-mode-btn${this.mode === 'draw' ? ' active' : ''}" data-mode="draw">✏ Draw</button>
        <button class="tb-mode-btn${this.mode === 'play' ? ' active' : ''}" data-mode="play">● Play</button>
      </div>
      <hr class="tb-divider">
      <div class="tb-label">INSTRUMENT</div>
      <div class="tb-instruments-grid">
        ${instBtns}
      </div>
      <hr class="tb-divider">
      <div class="tb-label">SCALE</div>
      <button class="tb-quantize-btn${this.quantize ? ' active' : ''}" data-action="quantize">
        Quantize: ${this.quantize ? 'ON' : 'OFF'}
      </button>
      <div class="tb-scale-row" style="display:${this.quantize ? 'flex' : 'none'}">
        <button class="tb-scale-arrow" data-action="scale-prev">‹</button>
        <span class="tb-scale-name">${SCALES[this.scaleIndex].name}</span>
        <button class="tb-scale-arrow" data-action="scale-next">›</button>
      </div>
      <hr class="tb-divider">
      <button class="tb-gravity-btn" data-action="gravity">
        ${this.gravityDir === 1 ? '⬇' : '⬆'} Gravity
      </button>
      <hr class="tb-divider">
      <div class="tb-label">VIEW  <span style="opacity:.4;font-size:8px">${this._isMobile() ? 'pinch=zoom' : 'scroll=zoom  mid=pan  R=reset'}</span></div>
      <div class="tb-mode-row">
        <button class="tb-mode-btn${this.camera.tracking ? ' active' : ''}" data-action="track-toggle">
          ${this.camera.tracking ? '◎ Track' : '○ Track'}
        </button>
        <button class="tb-mode-btn" data-action="reset-view">⌂ Reset</button>
      </div>
      <hr class="tb-divider">
      <button class="tb-fx-toggle${this.fx.fxOpen ? ' active' : ''}" data-action="fx-toggle">
        ✦ FX ${this.fx.fxOpen ? '▴' : '▾'}
      </button>
      <hr class="tb-divider">
      <canvas id="res-spectrum" width="156" height="44"></canvas>
      <hr class="tb-divider">
      <button class="tb-util-btn" data-action="clear-marbles">✕ Clear Marbles</button>
      <button class="tb-util-btn" data-action="clear-platforms">✕ Clear Platforms</button>
    `;

    if (this._isMobile()) {
      return `
        <div class="tb-handle" data-action="tb-toggle">
          <span class="tb-handle-title">🎹 RESONATOR</span>
          <span class="tb-handle-mode" style="--inst-color:${inst.color}">
            <span class="inst-swatch"></span>${this.mode === 'draw' ? '✏' : '●'} ${inst.label}
          </span>
          <span class="tb-handle-close" data-action="close">✕</span>
        </div>
        <div class="tb-body">${body}</div>
      `;
    }

    return `
      <div class="tb-title">
        🎹 THE RESONATOR
        <span class="tb-close" title="Close (ESC)">✕</span>
      </div>
      ${body}
    `;
  }

  _wireToolbar() {
    const tb = this.toolbar;

    // Use onclick/oninput (not addEventListener) so re-wiring replaces instead of stacking
    tb.onclick = e => {
      const btn = e.target.closest('[data-mode],[data-inst],[data-action]');
      if (!btn) return;
      if (btn.dataset.mode) {
        this.mode = btn.dataset.mode; this.drawPointA = null;
        this._refreshToolbar(); return;
      }
      if (btn.dataset.inst) {
        this.instrument = btn.dataset.inst;
        this._refreshToolbar(); return;
      }
      switch (btn.dataset.action) {
        case 'quantize':    this.quantize = !this.quantize; this._refreshToolbar(); break;
        case 'scale-prev':  this.scaleIndex = (this.scaleIndex - 1 + SCALES.length) % SCALES.length; this._refreshToolbar(); break;
        case 'scale-next':  this.scaleIndex = (this.scaleIndex + 1) % SCALES.length; this._refreshToolbar(); break;
        case 'gravity':     this._flipGravity(); break;
        case 'fx-toggle':
          this.fx.fxOpen = !this.fx.fxOpen;
          if (this.fx.fxOpen) this._buildFXPanel();
          else                this._destroyFXPanel();
          this._refreshToolbar();
          break;
        case 'tb-toggle':
          tb.classList.toggle('tb-collapsed'); break;
        case 'close':
          this.stop(); break;
        case 'clear-marbles':   this.marbles = []; break;
        case 'clear-platforms': this.platforms = []; this.drawPointA = null; break;
        case 'track-toggle':
          this.camera.tracking = !this.camera.tracking;
          this._refreshToolbar(); break;
        case 'reset-view': this._resetView(); break;
      }
    };

    tb.oninput = e => {
      const el = e.target;
      if (el.dataset.fx) {
        const key = el.dataset.fx;
        this.fx[key] = parseFloat(el.value);
        this._applyFXParam(key);
        const valEl = el.nextElementSibling;
        if (valEl) {
          if (key === 'delayTime') valEl.textContent = `${Math.round(this.fx.delayTime * 1000)}ms`;
          else valEl.textContent = `${Math.round(parseFloat(el.value) * 100)}%`;
        }
        return;
      }
      if (el.dataset.eq !== undefined) {
        const i = parseInt(el.dataset.eq);
        this.fx.eqGains[i] = parseFloat(el.value);
        this._applyFXParam('eq', i);
        const valEl = el.nextElementSibling;
        if (valEl) valEl.textContent = `${this.fx.eqGains[i] >= 0 ? '+' : ''}${this.fx.eqGains[i]}`;
      }
    };

    // Desktop close button (mobile uses data-action="close" via delegation)
    tb.querySelector('.tb-close')?.addEventListener('click', () => this.stop());

    // Start collapsed on mobile
    if (this._isMobile()) tb.classList.add('tb-collapsed');
  }

  _refreshToolbar() {
    if (!this.toolbar) return;
    this.toolbar.innerHTML = this._toolbarHTML();
    this._wireToolbar();
    this._queryFXCanvases();
  }

  // ── FX floating panel ──────────────────────────────────────────
  _buildFXPanel() {
    this._destroyFXPanel();
    const eqSliders = EQ_BANDS.map((b, i) => `
      <div class="eq-band">
        <div class="eq-label">${b.label}</div>
        <input type="range" class="eq-slider" min="-12" max="12" step="0.5"
          value="${this.fx.eqGains[i]}" data-eq="${i}" orient="vertical">
        <div class="eq-val">${this.fx.eqGains[i] >= 0 ? '+' : ''}${this.fx.eqGains[i]}</div>
      </div>`).join('');

    const panel = document.createElement('div');
    panel.id = 'resonator-fx-panel';
    panel.innerHTML = `
      <div class="tb-title">
        ✦ FX
        <span class="tb-close fx-panel-close" title="Close FX">✕</span>
      </div>
      <hr class="tb-divider">
      <div class="fx-row">
        <label class="fx-lbl">REVERB</label>
        <input type="range" class="fx-slider" min="0" max="1" step="0.01"
          value="${this.fx.reverbWet}" data-fx="reverbWet">
        <span class="fx-val">${Math.round(this.fx.reverbWet * 100)}%</span>
      </div>
      <div class="fx-row">
        <label class="fx-lbl">DLY TIME</label>
        <input type="range" class="fx-slider" min="0.01" max="1" step="0.01"
          value="${this.fx.delayTime}" data-fx="delayTime">
        <span class="fx-val">${Math.round(this.fx.delayTime * 1000)}ms</span>
      </div>
      <div class="fx-row">
        <label class="fx-lbl">DLY FB</label>
        <input type="range" class="fx-slider" min="0" max="0.95" step="0.01"
          value="${this.fx.delayFeedback}" data-fx="delayFeedback">
        <span class="fx-val">${Math.round(this.fx.delayFeedback * 100)}%</span>
      </div>
      <div class="fx-row">
        <label class="fx-lbl">DLY MIX</label>
        <input type="range" class="fx-slider" min="0" max="1" step="0.01"
          value="${this.fx.delayMix}" data-fx="delayMix">
        <span class="fx-val">${Math.round(this.fx.delayMix * 100)}%</span>
      </div>
      <hr class="tb-divider">
      <div class="tb-label">EQ</div>
      <div class="eq-row">${eqSliders}</div>
      <canvas id="res-eq-curve" width="188" height="40"></canvas>
    `;
    document.body.appendChild(panel);
    this.fxPanel = panel;
    this._wireFXPanel();
    this._queryFXCanvases();
  }

  _destroyFXPanel() {
    if (this.fxPanel) { this.fxPanel.remove(); this.fxPanel = null; }
    this.eqCanvas = null;
  }

  _wireFXPanel() {
    if (!this.fxPanel) return;
    this.fxPanel.addEventListener('input', e => {
      const el = e.target;
      if (el.dataset.fx) {
        const key = el.dataset.fx;
        this.fx[key] = parseFloat(el.value);
        this._applyFXParam(key);
        const valEl = el.nextElementSibling;
        if (valEl) {
          if (key === 'delayTime') valEl.textContent = `${Math.round(this.fx.delayTime * 1000)}ms`;
          else valEl.textContent = `${Math.round(parseFloat(el.value) * 100)}%`;
        }
        return;
      }
      if (el.dataset.eq !== undefined) {
        const i = parseInt(el.dataset.eq);
        this.fx.eqGains[i] = parseFloat(el.value);
        this._applyFXParam('eq', i);
        const valEl = el.nextElementSibling;
        if (valEl) valEl.textContent = `${this.fx.eqGains[i] >= 0 ? '+' : ''}${this.fx.eqGains[i]}`;
      }
    });
    this.fxPanel.querySelector('.fx-panel-close')?.addEventListener('click', () => {
      this.fx.fxOpen = false;
      this._destroyFXPanel();
      this._refreshToolbar();
    });
  }

  // ── Audio ──────────────────────────────────────────────────────
  _initAudio() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.audioCtx = ctx;

    // Master output → analyser → destination
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.55;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.82;
    this.spectrumData   = new Float32Array(this.analyser.frequencyBinCount);
    this.timeDomainData = new Uint8Array(this.analyser.fftSize);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // EQ chain: preEQ → [5 biquad filters] → postEQ → masterGain
    this.preEQ  = ctx.createGain(); this.preEQ.gain.value  = 1;
    this.postEQ = ctx.createGain(); this.postEQ.gain.value = 1;

    this.eqFilters = EQ_BANDS.map((b, i) => {
      const f = ctx.createBiquadFilter();
      f.type = b.type;
      f.frequency.value = b.freq;
      f.gain.value = this.fx.eqGains[i];
      f.Q.value = b.type === 'peaking' ? 1.2 : 0.7;
      return f;
    });
    // Chain: preEQ → eq[0] → eq[1] → ... → eq[4] → postEQ → masterGain
    this.preEQ.connect(this.eqFilters[0]);
    for (let i = 0; i < this.eqFilters.length - 1; i++) {
      this.eqFilters[i].connect(this.eqFilters[i + 1]);
    }
    this.eqFilters[this.eqFilters.length - 1].connect(this.postEQ);
    this.postEQ.connect(this.masterGain);

    // Reverb: postEQ → reverbSend → convolver → reverbOut → masterGain
    this._buildReverb();

    // Delay: postEQ → delaySend → delayNode ↔ feedback, delayNode → delayWet → masterGain
    this.delayNode     = ctx.createDelay(2.0);
    this.delayNode.delayTime.value = this.fx.delayTime;
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value  = this.fx.delayFeedback;
    this.delaySendGain = ctx.createGain();
    this.delaySendGain.gain.value  = 1.0;
    this.delayWetGain  = ctx.createGain();
    this.delayWetGain.gain.value   = this.fx.delayMix;

    this.postEQ.connect(this.delaySendGain);
    this.delaySendGain.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);  // feedback loop
    this.delayNode.connect(this.delayWetGain);
    this.delayWetGain.connect(this.masterGain);
  }

  _buildReverb() {
    const ctx        = this.audioCtx;
    const sampleRate = ctx.sampleRate;
    const duration   = 2.8;
    const length     = Math.ceil(sampleRate * duration);
    const ir         = ctx.createBuffer(2, length, sampleRate);
    const predelay   = Math.floor(sampleRate * 0.008);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = i < predelay ? 0 : (Math.random() * 2 - 1) * Math.exp(-i / sampleRate * 3.2);
      }
    }
    this.convolver = ctx.createConvolver();
    this.convolver.buffer = ir;
    this.convolver.normalize = false;

    this.reverbSendGain = ctx.createGain();
    this.reverbSendGain.gain.value = 0.6;   // pre-convolver send level (stay fixed)
    this.reverbOutGain  = ctx.createGain();
    this.reverbOutGain.gain.value  = this.fx.reverbWet;

    this.postEQ.connect(this.reverbSendGain);
    this.reverbSendGain.connect(this.convolver);
    this.convolver.connect(this.reverbOutGain);
    this.reverbOutGain.connect(this.masterGain);
  }

  _applyFXParam(key, eqIndex) {
    if (!this.audioCtx) return;
    switch (key) {
      case 'reverbWet':     this.reverbOutGain.gain.linearRampToValueAtTime(this.fx.reverbWet, this.audioCtx.currentTime + 0.05); break;
      case 'delayTime':     this.delayNode.delayTime.linearRampToValueAtTime(this.fx.delayTime, this.audioCtx.currentTime + 0.05); break;
      case 'delayFeedback': this.delayFeedback.gain.linearRampToValueAtTime(this.fx.delayFeedback, this.audioCtx.currentTime + 0.05); break;
      case 'delayMix':      this.delayWetGain.gain.linearRampToValueAtTime(this.fx.delayMix, this.audioCtx.currentTime + 0.05); break;
      case 'eq':            this.eqFilters[eqIndex].gain.linearRampToValueAtTime(this.fx.eqGains[eqIndex], this.audioCtx.currentTime + 0.02); break;
    }
  }

  // ── Synthesis ──────────────────────────────────────────────────
  _playNote(platform) {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    const freq = platform.freq;
    const now  = this.audioCtx.currentTime;
    const ctx  = this.audioCtx;
    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0, now);
    switch (platform.instrument) {
      case 'marimba': this._synthMarimba(freq, ctx, now, noteGain); break;
      case 'bell':    this._synthBell(freq, ctx, now, noteGain);    break;
      case 'pluck':   this._synthPluck(freq, ctx, now, noteGain);   break;
      case 'bass':    this._synthBass(freq, ctx, now, noteGain);    break;
    }
    noteGain.connect(this.preEQ);
  }

  _synthMarimba(freq, ctx, now, noteGain) {
    const total = 2.2;
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(0.9, now + 0.002);
    noteGain.gain.exponentialRampToValueAtTime(0.18, now + 0.18);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + total);

    const tri = ctx.createOscillator(); const triG = ctx.createGain();
    tri.type = 'triangle'; tri.frequency.value = freq; triG.gain.value = 0.75;
    tri.connect(triG); triG.connect(noteGain); tri.start(now); tri.stop(now + total + 0.05);

    const ov = ctx.createOscillator(); const ovG = ctx.createGain();
    ov.type = 'sine'; ov.frequency.value = freq * 3.75;
    ovG.gain.setValueAtTime(0.22, now);
    ovG.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    ov.connect(ovG); ovG.connect(noteGain); ov.start(now); ov.stop(now + 0.15);

    const bufLen = Math.ceil(ctx.sampleRate * 0.003);
    const nb = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < bufLen; i++) nd[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    const noise = ctx.createBufferSource(); const noiseG = ctx.createGain();
    noise.buffer = nb; noiseG.gain.value = 0.12;
    noise.connect(noiseG); noiseG.connect(noteGain); noise.start(now); noise.stop(now + 0.004);
  }

  _synthBell(freq, ctx, now, noteGain) {
    const total = 5.0;
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(0.75, now + 0.004);
    noteGain.gain.exponentialRampToValueAtTime(0.12, now + 0.6);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + total);

    const carrier = ctx.createOscillator(); const mod = ctx.createOscillator(); const modG = ctx.createGain();
    carrier.type = 'sine'; carrier.frequency.value = freq;
    mod.type = 'sine'; mod.frequency.value = freq * 3.5;
    modG.gain.setValueAtTime(freq * 2.2, now);
    modG.gain.exponentialRampToValueAtTime(freq * 0.1, now + 1.0);
    mod.connect(modG); modG.connect(carrier.frequency); carrier.connect(noteGain);
    mod.start(now); mod.stop(now + total + 0.1); carrier.start(now); carrier.stop(now + total + 0.1);

    const oct = ctx.createOscillator(); const octG = ctx.createGain();
    oct.type = 'sine'; oct.frequency.value = freq * 2.0;
    octG.gain.setValueAtTime(0.18, now); octG.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    oct.connect(octG); octG.connect(noteGain); oct.start(now); oct.stop(now + 1.6);
  }

  _synthPluck(freq, ctx, now, noteGain) {
    const body = 1.6;
    noteGain.gain.setValueAtTime(0.85, now + 0.001);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + body);

    const sine = ctx.createOscillator(); const sineG = ctx.createGain();
    sine.type = 'sine'; sine.frequency.value = freq; sineG.gain.value = 0.6;
    sine.connect(sineG); sineG.connect(noteGain); sine.start(now); sine.stop(now + body + 0.05);

    const nLen = Math.ceil(ctx.sampleRate * 0.04);
    const nb = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nLen; i++) nd[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = nb;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass'; bpf.frequency.value = freq; bpf.Q.value = 18;
    const nEnv = ctx.createGain();
    nEnv.gain.setValueAtTime(0.9, now);
    nEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    noise.connect(bpf); bpf.connect(nEnv); nEnv.connect(noteGain);
    noise.start(now); noise.stop(now + 0.045);
  }

  _synthBass(freq, ctx, now, noteGain) {
    const total = 2.0;
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(0.9, now + 0.015);
    noteGain.gain.exponentialRampToValueAtTime(0.35, now + 0.4);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + total);
    [[freq, 'sine', 0.55], [freq, 'triangle', 0.35], [freq * 2, 'sine', 0.1]].forEach(([f, type, g]) => {
      const osc = ctx.createOscillator(); const og = ctx.createGain();
      osc.type = type; osc.frequency.value = f; og.gain.value = g;
      osc.connect(og); og.connect(noteGain); osc.start(now); osc.stop(now + total + 0.05);
    });
  }

  // ── Pitch helpers ──────────────────────────────────────────────
  _maxLen() { return (this.canvas ? this.canvas.width : window.innerWidth) * 0.65; }

  _freqFromLen(len) {
    const range   = this._maxLen() - MIN_LEN;
    const clamped = Math.max(MIN_LEN, Math.min(this._maxLen(), len));
    return BASE_FREQ * Math.pow(2, -((clamped - MIN_LEN) / range) * 5);
  }

  _quantizeLen(len) {
    const scale = SCALES[this.scaleIndex];
    const maxLen = this._maxLen();
    const range  = maxLen - MIN_LEN;
    const freq   = BASE_FREQ * Math.pow(2, -((Math.max(MIN_LEN, Math.min(maxLen, len)) - MIN_LEN) / range) * 5);
    let bestLen = len, bestDist = Infinity;
    for (let oct = 0; oct < 5; oct++) {
      for (const ratio of scale.ratios) {
        const tf = BASE_FREQ / Math.pow(2, oct) * ratio / scale.ratios[scale.ratios.length - 1];
        const d  = Math.abs(freq - tf);
        if (d < bestDist) {
          bestDist = d;
          const targetT = Math.log2(BASE_FREQ / tf) / 5;
          bestLen = MIN_LEN + targetT * range;
        }
      }
    }
    return Math.max(MIN_LEN, Math.min(maxLen, bestLen));
  }

  _label(freq) {
    if (!this.quantize) return `${Math.round(freq)} Hz`;
    const midi  = Math.round(12 * Math.log2(freq / 440) + 69);
    const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    return names[((midi % 12) + 12) % 12] + Math.floor(midi / 12 - 1);
  }

  _makePlatform(ax, ay, bx, by) {
    let len = Math.hypot(bx - ax, by - ay);
    if (len < MIN_LEN) return null;
    let dx = bx - ax, dy = by - ay;
    if (this.quantize) {
      const qLen = this._quantizeLen(len);
      const s = qLen / len;
      const cx = (ax + bx) / 2, cy = (ay + by) / 2;
      ax = cx - (dx / 2) * s; ay = cy - (dy / 2) * s;
      bx = cx + (dx / 2) * s; by = cy + (dy / 2) * s;
      len = qLen;
    }
    const p = new Platform(ax, ay, bx, by, this.instrument);
    p.freq = this._freqFromLen(p.len); p.label = this._label(p.freq);
    return p;
  }

  // ── Camera ─────────────────────────────────────────────────────
  _screenToWorld(sx, sy) {
    const hw = this.canvas.width / 2, hh = this.canvas.height / 2;
    return {
      wx: this.camera.x + (sx - hw) / this.camera.zoom,
      wy: this.camera.y + (sy - hh) / this.camera.zoom,
    };
  }

  _worldToScreen(wx, wy) {
    const hw = this.canvas.width / 2, hh = this.canvas.height / 2;
    return {
      sx: hw + (wx - this.camera.x) * this.camera.zoom,
      sy: hh + (wy - this.camera.y) * this.camera.zoom,
    };
  }

  _updateCamera() {
    if (!this.camera.tracking || this.marbles.length === 0) return;
    // Smooth-follow centroid of all living marbles
    let tx = 0, ty = 0;
    for (const m of this.marbles) { tx += m.x; ty += m.y; }
    tx /= this.marbles.length; ty /= this.marbles.length;
    const ease = 0.06;
    this.camera.x += (tx - this.camera.x) * ease;
    this.camera.y += (ty - this.camera.y) * ease;
  }

  // ── Input ──────────────────────────────────────────────────────
  _mouseDown(e) {
    // Middle button → start pan, disable tracking
    if (e.button === 1) {
      e.preventDefault();
      this._panning  = true;
      this.camera.tracking = false;
      this._panStart = { sx: e.clientX, sy: e.clientY, cx: this.camera.x, cy: this.camera.y };
      this._refreshToolbar();
      return;
    }
    if (e.button !== 0) return;

    const { wx, wy } = this._screenToWorld(e.clientX, e.clientY);
    const ep = this._hitTestEndpoint(wx, wy);
    if (ep) { this.draggingEndpoint = ep; return; }

    if (this.mode === 'draw') {
      if (!this.drawPointA) {
        this.drawPointA = { x: wx, y: wy };
      } else {
        const p = this._makePlatform(this.drawPointA.x, this.drawPointA.y, wx, wy);
        if (p) this.platforms.push(p);
        this.drawPointA = null;
      }
    } else {
      this._dropMarble(wx, wy);
    }
  }

  _mouseMove(e) {
    this.mousePos  = { x: e.clientX, y: e.clientY };
    this.worldMouse = this._screenToWorld(e.clientX, e.clientY);

    // Pan
    if (this._panning && this._panStart) {
      this.camera.x = this._panStart.cx - (e.clientX - this._panStart.sx) / this.camera.zoom;
      this.camera.y = this._panStart.cy - (e.clientY - this._panStart.sy) / this.camera.zoom;
      return;
    }

    const { wx, wy } = this.worldMouse;
    if (this.draggingEndpoint) {
      const { platform, which } = this.draggingEndpoint;
      if (which === 'a') platform.setA(wx, wy);
      else               platform.setB(wx, wy);
      platform.freq = this._freqFromLen(platform.len);
      if (this.quantize) {
        const qLen = this._quantizeLen(platform.len);
        const s = qLen / (platform.len || 1);
        const pcx = (platform.ax + platform.bx) / 2, pcy = (platform.ay + platform.by) / 2;
        const dx  = platform.bx - platform.ax,        dy  = platform.by - platform.ay;
        if (which === 'a') platform.setA(pcx - (dx / 2) * s, pcy - (dy / 2) * s);
        else               platform.setB(pcx + (dx / 2) * s, pcy + (dy / 2) * s);
        platform.freq = this._freqFromLen(platform.len);
      }
      platform.label = this._label(platform.freq);
    }

    const ep = !this.draggingEndpoint && this._hitTestEndpoint(wx, wy);
    this.canvas.style.cursor = this._panning ? 'grabbing' : ep ? 'grab' : (this.mode === 'draw' ? 'crosshair' : 'cell');
  }

  _mouseUp(e) {
    if (e.button === 1) { this._panning = false; this._panStart = null; return; }
    this.draggingEndpoint = null;
    this.canvas.style.cursor = this.mode === 'draw' ? 'crosshair' : 'cell';
  }

  _contextMenu(e) {
    e.preventDefault();
    const { wx, wy } = this._screenToWorld(e.clientX, e.clientY);
    const p = this._hitTestPlatform(wx, wy);
    if (p) this.platforms.splice(this.platforms.indexOf(p), 1);
    if (this.drawPointA) this.drawPointA = null;
  }

  _wheel(e) {
    e.preventDefault();
    const factor   = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newZoom  = Math.max(0.08, Math.min(12, this.camera.zoom * factor));
    // Keep the world point under the cursor stationary
    const { wx, wy } = this._screenToWorld(e.clientX, e.clientY);
    this.camera.zoom = newZoom;
    const hw = this.canvas.width / 2, hh = this.canvas.height / 2;
    this.camera.x = wx - (e.clientX - hw) / newZoom;
    this.camera.y = wy - (e.clientY - hh) / newZoom;
  }

  // ── Touch handlers ────────────────────────────────────────────
  _touchStart(e) {
    e.preventDefault();
    if (e.touches.length === 2) {
      // Begin pinch — record initial spread + camera state
      const a = e.touches[0], b = e.touches[1];
      this._pinch = {
        dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
        zoom: this.camera.zoom,
        mx:   (a.clientX + b.clientX) / 2,
        my:   (a.clientY + b.clientY) / 2,
      };
      // Cancel any in-progress draw
      this.drawPointA = null;
      return;
    }
    this._pinch = null;
    const t = e.touches[0];
    this._mouseDown({ clientX: t.clientX, clientY: t.clientY, button: 0, target: e.target });
  }

  _touchMove(e) {
    e.preventDefault();
    if (e.touches.length === 2 && this._pinch) {
      const a = e.touches[0], b = e.touches[1];
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const factor = dist / this._pinch.dist;
      const newZoom = Math.max(0.08, Math.min(12, this._pinch.zoom * factor));
      const { wx, wy } = this._screenToWorld(this._pinch.mx, this._pinch.my);
      this.camera.zoom = newZoom;
      const hw = this.canvas.width / 2, hh = this.canvas.height / 2;
      this.camera.x = wx - (this._pinch.mx - hw) / newZoom;
      this.camera.y = wy - (this._pinch.my - hh) / newZoom;
      return;
    }
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this._mouseMove({ clientX: t.clientX, clientY: t.clientY });
    }
  }

  _touchEnd(e) {
    e.preventDefault();
    this._pinch = null;
    if (e.changedTouches.length) {
      const t = e.changedTouches[0];
      this._mouseUp({ clientX: t.clientX, clientY: t.clientY });
    }
  }

  _keyDown(e) {
    switch (e.key) {
      case 'Escape':    this.stop(); break;
      case ' ':         e.preventDefault(); this.marbles = []; break;
      case 'Backspace': this.platforms = []; this.drawPointA = null; break;
      case 'g': case 'G': if (!e.repeat) this._flipGravity(); break;
      case 'r': case 'R': if (!e.repeat) this._resetView(); break;
    }
  }

  _flipGravity() { this.gravityDir *= -1; this.gravityFlashTimer = 10; this._refreshToolbar(); }

  _resetView() {
    this.camera.x = 0; this.camera.y = 0; this.camera.zoom = 1;
    this.camera.tracking = false;
    this._refreshToolbar();
  }

  // ── Hit testing ────────────────────────────────────────────────
  _hitTestEndpoint(x, y) {
    for (const p of this.platforms) {
      if (Math.hypot(x - p.ax, y - p.ay) < 14) return { platform: p, which: 'a' };
      if (Math.hypot(x - p.bx, y - p.by) < 14) return { platform: p, which: 'b' };
    }
    return null;
  }
  _hitTestPlatform(x, y) {
    for (const p of this.platforms) {
      const { cx, cy } = _closestPointOnSegment(x, y, p.ax, p.ay, p.bx, p.by);
      if (Math.hypot(x - cx, y - cy) < 12) return p;
    }
    return null;
  }

  // ── Physics ────────────────────────────────────────────────────
  _dropMarble(x, y) {
    this.marbles.push(new Marble(x, y, this.instrument));
    if (this.marbles.length > 60) this.marbles.shift();
  }

  _updatePhysics() {
    const grav = 0.32 * this.gravityDir;
    for (const m of this.marbles) {
      for (let sub = 0; sub < 2; sub++) {
        m.vy += grav * 0.5;
        const speed = Math.hypot(m.vx, m.vy);
        if (speed > 20) { m.vx = m.vx / speed * 20; m.vy = m.vy / speed * 20; }
        m.x += m.vx * 0.5; m.y += m.vy * 0.5;
        for (const p of this.platforms) {
          if (this._collideMarbleKey(m, p)) {
            if (!m.hitPlatforms.has(p) && p.hitCooldown <= 0) {
              p.hitTimer = 22; p.hitCooldown = 8;
              if (p.instrument === 'pluck') {
                p.rubberTimer = 55;
                // Spring kick: extra impulse along the platform normal
                const kickSpeed = Math.max(3.5, Math.hypot(m.vx, m.vy) * 0.6);
                m.vx += p.nx * kickSpeed;
                m.vy += p.ny * kickSpeed;
              }
              m.hitPlatforms.add(p);
              setTimeout(() => m.hitPlatforms.delete(p), 200);
              this._playNote(p);
              const { cx, cy } = _closestPointOnSegment(m.x, m.y, p.ax, p.ay, p.bx, p.by);
              this._emitSplat(cx, cy, m.color, p.color);
            }
          }
        }
      }
      m.vx *= 0.999; m.vy *= 0.999;
      m.trail.push({ x: m.x, y: m.y });
      if (m.trail.length > 40) m.trail.shift();
      // Cull if very far from all platforms AND far from camera (world units)
      const camDist = Math.hypot(m.x - this.camera.x, m.y - this.camera.y);
      if (camDist > 8000) m.alive = false;
    }
    this.marbles = this.marbles.filter(m => m.alive);
    for (const p of this.platforms) {
      if (p.hitTimer    > 0) p.hitTimer--;
      if (p.hitCooldown > 0) p.hitCooldown--;
      if (p.rubberTimer > 0) p.rubberTimer--;
    }
    if (this.gravityFlashTimer > 0) this.gravityFlashTimer--;
  }

  _collideMarbleKey(marble, key) {
    const { cx, cy } = _closestPointOnSegment(marble.x, marble.y, key.ax, key.ay, key.bx, key.by);
    const dx = marble.x - cx, dy = marble.y - cy;
    const dist = Math.hypot(dx, dy);
    const threshold = marble.r + 5;
    if (dist >= threshold || dist < 0.001) return false;
    const nx = dx / dist, ny = dy / dist;
    marble.x += nx * (threshold - dist); marble.y += ny * (threshold - dist);
    const dot = marble.vx * nx + marble.vy * ny;
    if (dot < 0) {
      const restitution = key.instrument === 'pluck' ? 2.1 : 1.62;
      marble.vx -= restitution * dot * nx; marble.vy -= restitution * dot * ny;
      const tx = -ny, ty = nx, dotT = marble.vx * tx + marble.vy * ty;
      marble.vx = marble.vx * 0.85 + 0.15 * dotT * tx;
      marble.vy = marble.vy * 0.85 + 0.15 * dotT * ty;
    }
    return true;
  }

  // ── Particles ──────────────────────────────────────────────────
  _emitSplat(x, y, mc, pc) {
    const count = 20 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, speed = 3 + Math.random() * 6;
      const isStar = i < 4;
      this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
        i % 2 === 0 ? mc : pc, isStar ? 5 : 3 + Math.random() * 3,
        35 + Math.floor(Math.random() * 20), isStar ? 'star' : 'circle',
        isStar ? (Math.random() - 0.5) * 0.3 : 0));
    }
    this.particles.push(new Particle(x, y, 0, 0, pc, 1, 20, 'ring'));
  }

  _updateParticles() {
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92;
      p.life--; p.rot += p.rotSpeed;
      p.r = p.maxR * (p.life / p.maxLife);
      if (p.shape === 'ring') p.ringR = p.maxRingR * (1 - p.life / p.maxLife);
      if (p.life <= 0) p.alive = false;
    }
    this.particles = this.particles.filter(p => p.alive);
  }

  // ── Draw loop ──────────────────────────────────────────────────
  _tick() {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this._loop);
    this._updateCamera();
    this._updatePhysics();
    this._updateParticles();
    this._draw();
    this._drawFXCanvases();
  }

  _draw() {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    // Background visualizer (also clears the canvas)
    this._drawVisBg(ctx, W, H);

    // World-space drawing under camera transform
    ctx.save();
    ctx.translate(W / 2 - this.camera.x * this.camera.zoom,
                  H / 2 - this.camera.y * this.camera.zoom);
    ctx.scale(this.camera.zoom, this.camera.zoom);

    this._drawPlatforms(ctx);
    this._drawPreview(ctx);
    this._drawParticles(ctx);
    this._drawMarbles(ctx);

    ctx.restore();  // back to screen space

    // HUD draws on top in screen space
    this._drawHUD(ctx, W, H);
  }

  _drawPlatforms(ctx) {
    const flashBoost = this.gravityFlashTimer > 0 ? (this.gravityFlashTimer / 10) * 0.4 : 0;
    for (const p of this.platforms) {
      const glowT = p.hitTimer / 22, BAR_W = 10;
      const angle = Math.atan2(p.by - p.ay, p.bx - p.ax);
      ctx.save();
      ctx.translate(p.mx, p.my);
      ctx.rotate(angle);
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = glowT > 0 ? 6 + glowT * 28 : 6 + flashBoost * 20;
      const alpha = Math.min(1, 0.55 + glowT * 0.45 + flashBoost);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ctx.strokeStyle = p.color;

      if (p.instrument === 'pluck' && p.rubberTimer > 0) {
        const rt = p.rubberTimer / 55;
        const wobble = Math.sin(p.rubberTimer * 0.55) * rt * rt * p.len * 0.18;
        const half = p.len / 2;
        ctx.lineWidth = BAR_W; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-half, 0); ctx.quadraticCurveTo(0, -wobble, half, 0); ctx.stroke();
        ctx.globalAlpha = alpha * 0.35; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-half, 0); ctx.quadraticCurveTo(0, -wobble * 0.6, half, 0); ctx.stroke();
        ctx.globalAlpha = alpha; ctx.lineCap = 'butt';
      } else {
        ctx.beginPath(); ctx.roundRect(-p.len / 2, -BAR_W / 2, p.len, BAR_W, 4); ctx.fill();
      }

      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      if (glowT > 0.15) {
        ctx.strokeStyle = p.color; ctx.globalAlpha = glowT * 0.45; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, (1 - glowT) * 45, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '9px "Space Mono", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.label || '', 0, 0);
      ctx.restore();
      this._drawEndpoint(ctx, p.ax, p.ay, p.color, this.draggingEndpoint?.platform === p && this.draggingEndpoint?.which === 'a');
      this._drawEndpoint(ctx, p.bx, p.by, p.color, this.draggingEndpoint?.platform === p && this.draggingEndpoint?.which === 'b');
    }
  }

  _drawEndpoint(ctx, x, y, color, active) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, active ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle = active ? '#fff' : color;
    ctx.shadowColor = color; ctx.shadowBlur = active ? 14 : 6;
    ctx.fill(); ctx.restore();
  }

  _drawPreview(ctx) {
    if (this.mode !== 'draw' || !this.drawPointA) return;
    const { x: ax, y: ay } = this.drawPointA, { wx: bx, wy: by } = this.worldMouse;
    const len = Math.hypot(bx - ax, by - ay);
    const color = INSTRUMENTS[this.instrument].color;
    ctx.save();
    ctx.setLineDash([6, 4]); ctx.strokeStyle = color; ctx.globalAlpha = 0.5; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(ax, ay, 6, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
    if (len > MIN_LEN) {
      ctx.translate((ax + bx) / 2, (ay + by) / 2);
      ctx.rotate(Math.atan2(by - ay, bx - ax));
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '10px "Space Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(this._label(this._freqFromLen(len)), 0, -8);
    }
    ctx.restore();
  }

  _drawMarbles(ctx) {
    for (const m of this.marbles) {
      const speed = Math.hypot(m.vx, m.vy), angle = Math.atan2(m.vy, m.vx);
      const sx = 1 + Math.min(speed * 0.06, 0.6), sy = 1 / sx;
      if (m.trail.length > 1) {
        ctx.save();
        for (let i = 1; i < m.trail.length; i++) {
          const t = i / m.trail.length;
          ctx.globalAlpha = t * 0.35; ctx.strokeStyle = m.color;
          ctx.lineWidth = m.r * 2 * t * 0.5;
          ctx.beginPath(); ctx.moveTo(m.trail[i-1].x, m.trail[i-1].y); ctx.lineTo(m.trail[i].x, m.trail[i].y); ctx.stroke();
        }
        ctx.restore();
      }
      ctx.save();
      ctx.translate(m.x, m.y); ctx.rotate(angle); ctx.scale(sx, sy);
      const grad = ctx.createRadialGradient(-m.r * 0.25, -m.r * 0.25, m.r * 0.08, 0, 0, m.r);
      grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.4, m.color); grad.addColorStop(1, m.color + '33');
      ctx.beginPath(); ctx.arc(0, 0, m.r, 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.shadowColor = m.color; ctx.shadowBlur = 12; ctx.fill();
      ctx.restore();
    }
  }

  _drawParticles(ctx) {
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      ctx.save(); ctx.globalAlpha = t;
      if (p.shape === 'ring') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.ringR, 0, Math.PI * 2);
        ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.globalAlpha = t * 0.65; ctx.stroke();
      } else if (p.shape === 'star') {
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
        _drawStar(ctx, 0, 0, p.r, p.r * 0.4, 4);
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 6; ctx.fill();
      }
      ctx.restore();
    }
  }

  _drawHUD(ctx, W, H) {
    ctx.save();
    ctx.font = '10px "Space Mono", monospace'; ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    const zoomPct = Math.round(this.camera.zoom * 100);
    const trackStr = this.camera.tracking ? '◎' : '○';
    ctx.fillText(
      `${trackStr} ${zoomPct}%  ·  ${this.marbles.length} marble${this.marbles.length !== 1 ? 's' : ''}  ${this.platforms.length} platform${this.platforms.length !== 1 ? 's' : ''}`,
      W - 16, H - 14
    );
    ctx.restore();
    if (this.mode === 'draw' && this.platforms.length === 0 && !this.drawPointA) {
      ctx.save();
      ctx.font = '13px "Space Mono", monospace'; ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('click to place point A — click again to place point B', W / 2, H * 0.92);
      ctx.restore();
    }
  }

  // ── Background visualizer ─────────────────────────────────────
  _initVisBg() {
    this.visBassSmooth = 0;
    this.visEnergy     = 0;
    this.visHue        = 0;
    this.visRings      = [];   // expanding pulse rings
  }

  _drawVisBg(ctx, W, H) {
    // Opaque clear every frame — no offscreen canvas, no gradients
    ctx.fillStyle = '#07070e';
    ctx.fillRect(0, 0, W, H);

    // ── Read audio ───────────────────────────────────────────────
    let bass = 0, mid = 0, hi = 0;
    const FLOOR = -100, CEIL = -10;
    if (this.analyser && this.spectrumData) {
      this.analyser.getFloatFrequencyData(this.spectrumData);
      const bins    = this.spectrumData.length;
      const bassEnd = Math.floor(bins * 0.08), midEnd = Math.floor(bins * 0.45);
      for (let i = 0;       i < bassEnd; i++) bass += Math.max(0, (Math.max(FLOOR, this.spectrumData[i]) - FLOOR) / (CEIL - FLOOR));
      for (let i = bassEnd; i < midEnd;  i++) mid  += Math.max(0, (Math.max(FLOOR, this.spectrumData[i]) - FLOOR) / (CEIL - FLOOR));
      for (let i = midEnd;  i < bins;    i++) hi   += Math.max(0, (Math.max(FLOOR, this.spectrumData[i]) - FLOOR) / (CEIL - FLOOR));
      bass /= bassEnd; mid /= (midEnd - bassEnd); hi /= (bins - midEnd);
    }
    this.visBassSmooth = this.visBassSmooth * 0.9 + bass * 0.1;
    this.visEnergy     = bass * 0.5 + mid * 0.3 + hi * 0.2;
    const E = this.visEnergy;
    this.visHue = (this.visHue + 0.06 + E * 0.5) % 360;

    if (E < 0.02) return; // nothing to draw when silent

    const cx = W / 2, cy = H / 2;

    // ── Flat colour wash — single fillRect, colour shifts with bands
    const washAlpha = Math.min(0.18, E * 0.35);
    ctx.fillStyle = `hsla(${this.visHue},70%,35%,${washAlpha})`;
    ctx.fillRect(0, 0, W, H);

    // ── Expanding rings on bass transients ───────────────────────
    if (bass > this.visBassSmooth * 1.4 && bass > 0.12 && this.visRings.length < 5) {
      this.visRings.push({ r: 10, maxR: Math.max(W, H) * 0.7, alpha: 0.55 + bass * 0.3, hue: this.visHue });
    }
    ctx.lineWidth = 1.5;
    for (const ring of this.visRings) {
      const t = ring.r / ring.maxR;
      ctx.strokeStyle = `hsla(${ring.hue},80%,65%,${ring.alpha * (1 - t) * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      ring.r += 3 + E * 8;
    }
    this.visRings = this.visRings.filter(r => r.r < r.maxR);
  }

  // ── FX canvas drawing (toolbar) ────────────────────────────────
  _drawFXCanvases() {
    if (!this.analyser) return;
    if (this.spectrumCanvas) this._drawSpectrumCanvas(this.spectrumCanvas);
    if (this.fx.fxOpen && this.eqCanvas) this._drawEQCanvas(this.eqCanvas);
  }

  _drawSpectrumCanvas(c) {
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(7,7,14,0.95)';
    ctx.fillRect(0, 0, W, H);

    this.analyser.getFloatFrequencyData(this.spectrumData);
    const bins  = this.spectrumData.length;
    const barW  = W / bins;
    const FLOOR = -100, CEIL = -10;

    for (let i = 0; i < bins; i++) {
      const db  = Math.max(FLOOR, Math.min(CEIL, this.spectrumData[i]));
      const t   = (db - FLOOR) / (CEIL - FLOOR);
      const barH = t * H;
      // Color: blue at low level, cyan→purple at high level
      const hue = 200 + t * 80;
      ctx.fillStyle = `hsla(${hue}, 80%, ${40 + t * 40}%, 0.85)`;
      ctx.fillRect(i * barW, H - barH, Math.max(1, barW - 0.5), barH);
    }

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 0.5;
    for (let db = -90; db <= -10; db += 20) {
      const y = H - ((db - FLOOR) / (CEIL - FLOOR)) * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  _drawEQCanvas(c) {
    if (!this.eqFilters.length) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(7,7,14,0.95)';
    ctx.fillRect(0, 0, W, H);

    // Compute composite frequency response across log-spaced frequencies
    const N = W;
    const freqHz    = new Float32Array(N);
    const magResp   = new Float32Array(N);
    const phaseResp = new Float32Array(N);
    const composite = new Float32Array(N).fill(1);

    const fMin = 20, fMax = 20000;
    for (let i = 0; i < N; i++) {
      freqHz[i] = fMin * Math.pow(fMax / fMin, i / (N - 1));
    }

    for (const filter of this.eqFilters) {
      filter.getFrequencyResponse(freqHz, magResp, phaseResp);
      for (let i = 0; i < N; i++) composite[i] *= magResp[i];
    }

    // Draw 0dB center line
    const mid = H / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();

    // Draw curve
    const DB_RANGE = 12;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const db = 20 * Math.log10(Math.max(0.0001, composite[i]));
      const y  = mid - (db / DB_RANGE) * (H / 2 - 2);
      i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
    }
    ctx.strokeStyle = '#c97eff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#c97eff';
    ctx.shadowBlur  = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill under curve
    ctx.lineTo(W, mid); ctx.lineTo(0, mid); ctx.closePath();
    ctx.fillStyle = 'rgba(201,126,255,0.08)'; ctx.fill();
  }
}

// ── Module-level helpers ───────────────────────────────────────
function _closestPointOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { cx: ax, cy: ay };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return { cx: ax + t * dx, cy: ay + t * dy };
}

function _drawStar(ctx, cx, cy, outerR, innerR, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    i === 0 ? ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
            : ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
}
