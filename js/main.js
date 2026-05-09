// ============================================================
// main.js — site init, cursor, parallax, status, reveal
// ============================================================

import { Terminal } from './terminal.js';
import { Game }     from './game/Game.js';
import SunCalc      from 'https://cdn.skypack.dev/suncalc';

// ── Singleton instances ─────────────────────────────────────
let game     = null;
let terminal = null;

// ── Boot ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initNav();
  initParallax();
  initScrollReveal();
  initClock();
  initStatusBar();
  initMarquee();
  initGame();
  initTerminal();

  // G key toggles game visibility, but only after terminal unlock
  window.addEventListener('keydown', e => {
    if ((e.key === 'g' || e.key === 'G') && game && game.unlocked) {
      game.running ? game.stop() : game.start();
    }
  });
});

// ── Custom cursor ────────────────────────────────────────────
function initCursor() {
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    dot.style.left = e.clientX + 'px';
    dot.style.top  = e.clientY + 'px';
    rx += (e.clientX - rx) * 0.12;
    ry += (e.clientY - ry) * 0.12;
  });

  (function animRing() {
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animRing);
  })();

  // hover state
  document.querySelectorAll('a, button, .chip, .music-card, .project-card').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
}

// ── Nav scroll state ─────────────────────────────────────────
function initNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  const check = () => nav.classList.toggle('scrolled', window.scrollY > 60);
  check();
  window.addEventListener('scroll', check, { passive: true });
}

// ── Parallax ─────────────────────────────────────────────────
function initParallax() {
  const bg  = document.getElementById('layer-bg');
  const mid = document.getElementById('layer-mid');
  if (!bg && !mid) return;

  function update() {
    const y = window.scrollY;
    // layers are 180% tall (40% overhang each side) so translateY has room
    // bg moves at 45% of scroll speed → appears slowest / deepest
    // mid moves at 25% → between bg and page content
    if (bg)  bg.style.transform  = `translateY(${y * 0.45}px)`;
    if (mid) mid.style.transform = `translateY(${y * 0.25}px)`;
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ── Scroll reveal ────────────────────────────────────────────
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => obs.observe(el));
}

// ── Live clock ───────────────────────────────────────────────
function initClock() {
  const clockEl = document.getElementById('live-clock');
  if (!clockEl) return;

  function tick() {
    const now = new Date().toLocaleTimeString('en-US', {
      timeZone: 'America/Chicago',
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    clockEl.textContent = now + ' CT';
  }
  tick();
  setInterval(tick, 1000);
}

// ── Status bar (time-based vibe, SunCalc-aware) ──────────────
const _STATUS_LAT = 43.0731;
const _STATUS_LNG = -89.4012; // Madison, WI

const WEEKEND_VIBES = [
  { vibe: 'weekend goblin hours 👹',                    energy: 40, color: 'var(--accent3)' },
  { vibe: 'probably still awake 🫠',                    energy: 55, color: 'var(--accent2)' },
  { vibe: 'running on gas station caffeine ☕',          energy: 60, color: 'var(--accent)'  },
  { vibe: 'deep in a side project ⚙️',                  energy: 75, color: 'var(--accent)'  },
  { vibe: 'recovering from production incidents 🧯',    energy: 25, color: 'var(--muted)'   },
  { vibe: 'making music at irresponsible hours 🎛️',     energy: 80, color: 'var(--accent)'  },
  { vibe: 'temporally unbound 🌀',                      energy: 45, color: 'var(--accent3)' },
];

function initStatusBar() {
  const vibeEl  = document.getElementById('status-vibe');
  const barFill = document.getElementById('status-energy-fill');

  function updateStatus() {
    const now = new Date();
    // ct hours/day for local logic
    const ct  = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    const h   = ct.getHours();
    const dow = ct.getDay();
    const isWeekday    = dow >= 1 && dow <= 5;
    const isThirdShift = h >= 0 && h < 10;
    const isBedTime    = h >= 15;

    // real sunrise window for Madison, WI
    const sunTimes      = SunCalc.getTimes(now, _STATUS_LAT, _STATUS_LNG);
    const sunriseDiff   = Math.abs(now - sunTimes.sunrise) / 60000; // minutes
    const isSunriseWindow = sunriseDiff <= 45;

    let vibe, energy, color;

    if (isSunriseWindow) {
      vibe = 'watching the sun come up 🌅'; energy = 35; color = 'var(--accent3)';
    } else if (isThirdShift && isWeekday) {
      vibe = 'probably at work 🖥️';         energy = 65; color = 'var(--accent2)';
    } else if (isBedTime) {
      vibe = 'definitely asleep 😴';         energy = 15; color = 'var(--muted)';
    } else if (!isBedTime && !isThirdShift) {
      vibe = 'vibe coding / music 🎸';       energy = 90; color = 'var(--accent)';
    } else {
      // stable-ish random vibe per hour (same result within the same hour)
      const seed  = h + ct.getDate();
      const pick  = WEEKEND_VIBES[seed % WEEKEND_VIBES.length];
      ({ vibe, energy, color } = pick);
    }

    if (vibeEl)  vibeEl.textContent = vibe;
    if (barFill) {
      barFill.style.width      = energy + '%';
      barFill.style.background = color;
      barFill.style.boxShadow  = `0 0 8px ${color}`;
    }
  }

  updateStatus();
  setInterval(updateStatus, 60000);
}

// ── Hero glitch ──────────────────────────────────────────────
(function initGlitch() {
  const heroName = document.getElementById('hero-name');
  if (!heroName) return;

  function glitch() {
    heroName.classList.add('glitching');
    setTimeout(() => heroName.classList.remove('glitching'), 300);
  }

  heroName.addEventListener('click', glitch);
  heroName.addEventListener('mouseenter', glitch);
  setInterval(glitch, 5500);
})();

// ── Marquee duplicate (ensure seamless loop) ─────────────────
function initMarquee() {
  document.querySelectorAll('.marquee-track').forEach(track => {
    // content is duplicated in HTML already; no JS needed
    // but pause on hover
    const bar = track.closest('.marquee-bar');
    if (!bar) return;
    bar.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
    bar.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
  });
}

// ── Game + Terminal init ─────────────────────────────────────
function initGame() {
  game = new Game();
}

function initTerminal() {
  terminal = new Terminal((bossName) => {
    // called when user presses ENTER after parkour or boss command
    if (!game.running) game.start();
    if (bossName) {
      // delay slightly so the player spawns before the boss
      setTimeout(() => game.spawnBoss(bossName), 250);
    }
  });
  terminal.init();
}
