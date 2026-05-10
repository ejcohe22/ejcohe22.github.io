// ============================================================
// commute.js — realm/commute
// Phase 1: Garage (car select)
// Phase 2: Pole Position winter drive
// Phase 3: Arrival
// ============================================================

const canvas  = document.getElementById('commute-canvas');
const ctx     = canvas.getContext('2d');
const caption = document.getElementById('caption');
const prompt  = document.getElementById('prompt-text');

let W = window.innerWidth;
let H = window.innerHeight;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ── Input ──────────────────────────────────────────────────
const keys = new Set();
const justPressed = new Set();
window.addEventListener('keydown', e => {
  if (!keys.has(e.key)) justPressed.add(e.key);
  keys.add(e.key);
  if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e => keys.delete(e.key));

function jp(k) { const v = justPressed.has(k); justPressed.delete(k); return v; }

// ── Phase state ─────────────────────────────────────────────
let phase = 'garage';  // 'garage' | 'garage-reject' | 'drive' | 'arrive'
let frame = 0;

// ── Garage ──────────────────────────────────────────────────
const CARS = [
  {
    id: 'lambo', label: 'Lamborghini Huracán', sub: 'v10 · rwd · lp610-4',
    color: '#f0c000', roof: '#d4a800', wheel: '#222',
    shape: 'lambo', valid: false,
    msg: "it\'s 6am. it\'s -4°F.\nyou are not driving that.",
  },
  {
    id: 'civic', label: 'Honda Civic', sub: '145,831 miles · needs an oil change',
    color: '#aaaaaa', roof: '#888', wheel: '#333',
    shape: 'hatch', valid: false,
    msg: "roommate said no.\n(he didn\'t ask. you just know.)",
  },
  {
    id: 'f150', label: 'Ford F-150', sub: '14 mpg · bed full of snow',
    color: '#cc4422', roof: '#aa3311', wheel: '#222',
    shape: 'truck', valid: true,
    msg: "valid. kind of a lot of car\nfor a 12-minute commute.",
  },
  {
    id: 'outback', label: 'Subaru Outback', sub: 'awd · heated seats · 30 mpg',
    color: '#4477aa', roof: '#335588', wheel: '#222',
    shape: 'wagon', valid: true,
    msg: "yeah. obviously.\nit\'s winter. you live in wisconsin.",
  },
];

let selIdx      = 0;
let rejectTimer = 0;
let rejectCar   = null;
let garageTransY = 0; // slide-in from top

// ── Drive ───────────────────────────────────────────────────
let roadPhase   = 0;
let roadOffset  = 0;
let playerX     = 0.5;  // 0–1 across road
let driveFrame  = 0;
let chosenCar   = null;
let snow        = [];
const RADIO = [
  '"local roads: icy. take it slow."',
  '"wind chill: -22°F. feels like: why."',
  '"visibility: poor. fog advisory until 9am."',
  '"today\'s high: 8°F. pack a lunch."',
  '"the servers are still up."',
  '"have a safe commute. seriously."',
];
let radioIdx    = 0;
let radioAlpha  = 0;
let radioState  = 'in'; // 'in' | 'hold' | 'out'
let radioTimer  = 0;

// ── Arrive ──────────────────────────────────────────────────
let arriveAlpha = 0;
let arriveTimer = 0;

// ── Midnight ────────────────────────────────────────────────
function drawMidnight(cx, cy, size) {
  ctx.save();
  // body
  ctx.fillStyle = '#f8f8f0';
  ctx.beginPath();
  ctx.ellipse(cx, cy, size * 0.6, size * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // spots
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.ellipse(cx - size*0.1, cy - size*0.1, size*0.18, size*0.14, 0.4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + size*0.25, cy + size*0.1, size*0.12, size*0.1, -0.3, 0, Math.PI*2); ctx.fill();
  // head
  ctx.fillStyle = '#f8f8f0';
  ctx.beginPath();
  ctx.ellipse(cx - size*0.5, cy - size*0.15, size*0.32, size*0.28, -0.2, 0, Math.PI*2);
  ctx.fill();
  // horns
  ctx.strokeStyle = '#c8a060';
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.beginPath(); ctx.moveTo(cx - size*0.6, cy - size*0.38); ctx.lineTo(cx - size*0.66, cy - size*0.58); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - size*0.44, cy - size*0.38); ctx.lineTo(cx - size*0.42, cy - size*0.59); ctx.stroke();
  // eyes
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(cx - size*0.6, cy - size*0.18, size*0.04, 0, Math.PI*2); ctx.fill();
  // tail
  ctx.strokeStyle = '#f8f8f0';
  ctx.lineWidth = Math.max(1, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(cx + size*0.6, cy);
  ctx.quadraticCurveTo(cx + size*0.85, cy - size*0.3, cx + size*0.7, cy - size*0.55);
  ctx.stroke();
  ctx.restore();
}

// ── Car draw functions ───────────────────────────────────────
function drawCar(id, cx, cy, scale, color, roofColor, wheelColor, shape, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const W2 = 80, H2 = 30;

  if (shape === 'lambo') {
    // low wedge body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-W2, 0);
    ctx.lineTo(-W2, -H2 * 0.5);
    ctx.lineTo(-W2 * 0.1, -H2 * 0.5);
    ctx.lineTo(W2 * 0.5, -H2 * 1.5);  // low roofline
    ctx.lineTo(W2 * 0.9, -H2 * 0.6);
    ctx.lineTo(W2, -H2 * 0.3);
    ctx.lineTo(W2, 0);
    ctx.closePath();
    ctx.fill();
    // windshield
    ctx.fillStyle = 'rgba(150,220,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(-W2 * 0.1, -H2 * 0.5);
    ctx.lineTo(W2 * 0.5, -H2 * 1.5);
    ctx.lineTo(W2 * 0.5, -H2 * 0.6);
    ctx.lineTo(-W2 * 0.05, -H2 * 0.5);
    ctx.closePath();
    ctx.fill();
  } else if (shape === 'hatch') {
    ctx.fillStyle = color;
    ctx.fillRect(-W2, -H2, W2 * 2, H2);
    // roof
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(-W2 * 0.4, -H2);
    ctx.lineTo(-W2 * 0.2, -H2 * 1.7);
    ctx.lineTo(W2 * 0.55, -H2 * 1.7);
    ctx.lineTo(W2 * 0.7, -H2);
    ctx.closePath();
    ctx.fill();
    // window
    ctx.fillStyle = 'rgba(150,220,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(-W2 * 0.15, -H2);
    ctx.lineTo(-W2 * 0.0, -H2 * 1.6);
    ctx.lineTo(W2 * 0.5, -H2 * 1.6);
    ctx.lineTo(W2 * 0.62, -H2);
    ctx.closePath();
    ctx.fill();
  } else if (shape === 'truck') {
    // bed
    ctx.fillStyle = color;
    ctx.fillRect(-W2, -H2, W2 * 1.2, H2);
    // cab
    ctx.fillStyle = roofColor;
    ctx.fillRect(W2 * 0.15, -H2 * 1.8, W2 * 0.85, H2 * 1.8);
    // window
    ctx.fillStyle = 'rgba(150,220,255,0.4)';
    ctx.fillRect(W2 * 0.25, -H2 * 1.65, W2 * 0.6, H2 * 0.9);
    // snow in bed
    ctx.fillStyle = 'rgba(220,230,255,0.8)';
    ctx.beginPath();
    ctx.ellipse(-W2 * 0.35, -H2 * 0.1, W2 * 0.5, H2 * 0.25, 0, 0, Math.PI*2);
    ctx.fill();
  } else if (shape === 'wagon') {
    ctx.fillStyle = color;
    ctx.fillRect(-W2, -H2, W2 * 2, H2);
    // wagon roof (longer)
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(-W2 * 0.5, -H2);
    ctx.lineTo(-W2 * 0.35, -H2 * 1.7);
    ctx.lineTo(W2 * 0.85, -H2 * 1.7);
    ctx.lineTo(W2 * 0.95, -H2);
    ctx.closePath();
    ctx.fill();
    // windows
    ctx.fillStyle = 'rgba(150,220,255,0.4)';
    ctx.fillRect(-W2 * 0.25, -H2 * 1.6, W2 * 0.55, H2 * 0.7);
    ctx.fillRect(W2 * 0.38, -H2 * 1.6, W2 * 0.38, H2 * 0.7);
  }

  // wheels (all shapes)
  ctx.fillStyle = wheelColor;
  ctx.beginPath(); ctx.arc(-W2 * 0.55, 2, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc( W2 * 0.55, 2, 14, 0, Math.PI * 2); ctx.fill();
  // hubcaps
  ctx.fillStyle = '#888';
  ctx.beginPath(); ctx.arc(-W2 * 0.55, 2, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc( W2 * 0.55, 2, 6, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ── Garage draw ──────────────────────────────────────────────
function drawGarage(rejecting) {
  // background
  ctx.fillStyle = '#0c0c10';
  ctx.fillRect(0, 0, W, H);

  // overhead strip lights
  for (let i = 0; i < 4; i++) {
    const lx = W * (i + 0.5) / 4;
    const gradient = ctx.createRadialGradient(lx, 0, 0, lx, 0, H * 0.6);
    gradient.addColorStop(0, 'rgba(220,220,200,0.07)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(220,220,200,0.9)';
    ctx.fillRect(lx - 2, 0, 4, 8);
  }

  // concrete floor
  ctx.fillStyle = '#181820';
  ctx.fillRect(0, H * 0.65, W, H * 0.35);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(W * i / 8, H * 0.65);
    ctx.lineTo(W * i / 8, H);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, H * 0.65);
  ctx.lineTo(W, H * 0.65);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.stroke();

  const carY = H * 0.6 + garageTransY;

  CARS.forEach((car, i) => {
    const cx = W * (i + 0.5) / 4;
    const isSel = i === selIdx;
    const isRejecting = rejecting && rejectCar === i;

    let carScale = isSel ? 1.15 : 0.9;
    let carAlpha = isSel ? 1 : 0.55;
    let extraX = 0, extraRot = 0;

    if (isRejecting) {
      const t = rejectTimer / 80;
      extraX = t * t * W * (car.id === 'lambo' ? 0.6 : -0.4);
      extraRot = t * (car.id === 'lambo' ? 1.8 : 0);
      carAlpha = 1 - t * 0.7;
    }

    // selection glow
    if (isSel && !rejecting) {
      ctx.save();
      ctx.shadowColor = car.valid ? '#7effc8' : '#ff4466';
      ctx.shadowBlur  = 30;
      ctx.strokeStyle = car.valid ? 'rgba(126,255,200,0.4)' : 'rgba(255,68,102,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - W / 4 * 0.45, carY - 110, W / 4 * 0.9, 120);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(cx + extraX, carY);
    ctx.rotate(extraRot);
    drawCar(car.id, 0, 0, carScale, car.color, car.roof, car.wheel, car.shape, carAlpha);
    ctx.restore();

    if (!rejecting || !isRejecting) {
      ctx.globalAlpha = isSel ? 1 : 0.45;
      ctx.fillStyle = '#e0e0e0';
      ctx.font = `bold ${isSel ? 13 : 11}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(car.label, cx, carY + 30);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = `10px 'Courier New', monospace`;
      ctx.fillText(car.sub, cx, carY + 46);
      ctx.globalAlpha = 1;
    }
  });

  // header
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.font = `11px 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '0.2em';
  ctx.fillText('CHOOSE YOUR VEHICLE', W / 2, 40);
}

// ── Road + drive draw ────────────────────────────────────────
function initSnow() {
  snow = [];
  for (let i = 0; i < 180; i++) {
    snow.push({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 3 + 0.5,
      speed: Math.random() * 0.004 + 0.001,
    });
  }
}

function drawDrive() {
  const vx = W / 2 + roadOffset;  // vanishing x
  const vy = H * 0.28;

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, vy);
  sky.addColorStop(0, '#080810');
  sky.addColorStop(1, '#141428');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, vy);

  // treeline silhouette
  ctx.fillStyle = '#0d0d1a';
  for (let i = 0; i < 40; i++) {
    const tx = (i / 40) * W;
    const th = 20 + Math.sin(i * 3.7) * 12 + Math.sin(i * 7.1) * 6;
    ctx.beginPath();
    ctx.moveTo(tx, vy);
    ctx.lineTo(tx + 8, vy - th);
    ctx.lineTo(tx + 16, vy);
    ctx.fill();
  }

  // ground snow field
  const ground = ctx.createLinearGradient(0, vy, 0, H);
  ground.addColorStop(0, '#1a1a2a');
  ground.addColorStop(1, '#2a2a3a');
  ctx.fillStyle = ground;
  ctx.fillRect(0, vy, W, H - vy);

  // snow ground texture
  ctx.fillStyle = 'rgba(200,210,255,0.04)';
  ctx.fillRect(0, H * 0.9, W, H * 0.1);

  const rHalfTop = 28;
  const rHalfBot = W * 0.35;

  // road surface
  ctx.beginPath();
  ctx.moveTo(vx - rHalfTop, vy);
  ctx.lineTo(vx + rHalfTop, vy);
  ctx.lineTo(W / 2 + rHalfBot, H + 20);
  ctx.lineTo(W / 2 - rHalfBot, H + 20);
  ctx.closePath();
  ctx.fillStyle = '#222232';
  ctx.fill();

  // road edge stripes
  ctx.strokeStyle = '#c8a030';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(vx - rHalfTop, vy); ctx.lineTo(W/2 - rHalfBot, H+20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(vx + rHalfTop, vy); ctx.lineTo(W/2 + rHalfBot, H+20); ctx.stroke();

  // center dashes — perspective scrolling
  const dashPhase = (roadPhase * 0.018) % 1;
  for (let i = 0; i < 14; i++) {
    let t = ((i / 14) + dashPhase) % 1;
    if (t < 0.01) continue;
    const skip = Math.floor(t * 14) % 2;
    if (skip === 0) continue;
    const fx = vx + (W / 2 - vx) * t;
    const fy = vy + (H + 20 - vy) * t;
    const dw = Math.max(1.5, t * 18);
    const dh = Math.max(2, t * 14);
    ctx.fillStyle = `rgba(240,230,160,${0.4 + t * 0.5})`;
    ctx.fillRect(fx - dw / 2, fy - dh / 2, dw, dh);
  }

  // snow particles
  snow.forEach(s => {
    // expand outward from vanishing point
    const ox = (s.x - 0.5) * W;
    const oy = (s.y) * H;
    const sx = W / 2 + ox * (1 + s.speed * driveFrame * 0.3);
    const sy = vy + oy * (1 + s.speed * driveFrame * 0.3);
    const sr = s.r * (0.5 + s.speed * driveFrame * 0.2);
    ctx.fillStyle = `rgba(200,215,255,${Math.min(0.8, sr * 0.3)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.min(sr, 4), 0, Math.PI * 2);
    ctx.fill();
    // reset when off screen
    if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) {
      s.x = 0.45 + Math.random() * 0.1;
      s.y = Math.random() * 0.5;
      s.speed = Math.random() * 0.004 + 0.001;
    }
  });

  // dashboard (bottom bar)
  const dashH = H * 0.18;
  const dashGrad = ctx.createLinearGradient(0, H - dashH, 0, H);
  dashGrad.addColorStop(0, 'rgba(5,5,12,0.0)');
  dashGrad.addColorStop(0.3, 'rgba(5,5,12,0.92)');
  dashGrad.addColorStop(1, 'rgba(5,5,12,1)');
  ctx.fillStyle = dashGrad;
  ctx.fillRect(0, H - dashH, W, dashH);

  // player car (bottom center)
  if (chosenCar) {
    const carCX = W / 2 + (playerX - 0.5) * rHalfBot * 1.4;
    const carCY = H - 30;
    const sway = Math.sin(driveFrame * 0.04) * 1.5;
    drawCar(chosenCar.id, carCX, carCY + sway, 1.5,
      chosenCar.color, chosenCar.roof, chosenCar.wheel, chosenCar.shape);

    // Midnight in passenger window
    const midX = carCX + 20;
    const midY = carCY - 48;
    // window frame
    ctx.fillStyle = 'rgba(150,220,255,0.25)';
    ctx.fillRect(midX - 18, midY - 20, 36, 28);
    drawMidnight(midX + 8, midY - 8, 20);
    // moo text occasionally
    if (driveFrame % 420 === 0) {
      const mooel = document.createElement('div');
      mooel.style.cssText = `position:fixed;left:${midX}px;top:${midY - 60}px;
        color:#c8fff0;font-size:11px;font-family:monospace;
        pointer-events:none;z-index:200;opacity:0.8;
        animation:none;transition:opacity 2s;`;
      mooel.textContent = ['moo.', '...moo.', 'moo?'][Math.floor(Math.random() * 3)];
      document.body.appendChild(mooel);
      setTimeout(() => mooel.style.opacity = '0', 1200);
      setTimeout(() => mooel.remove(), 3200);
    }
  }

  // radio text
  if (radioAlpha > 0) {
    ctx.globalAlpha = radioAlpha;
    ctx.fillStyle = '#c8fff0';
    ctx.font = `11px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('📻  ' + RADIO[radioIdx], W / 2, 28);
    ctx.globalAlpha = 1;
  }

  // speed indicator (bottom right)
  const speed = Math.round(28 + Math.sin(driveFrame * 0.02) * 3);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = `10px 'Courier New', monospace`;
  ctx.textAlign = 'right';
  ctx.fillText(`${speed} mph`, W - 24, H - 20);
  ctx.fillText('−4°F', W - 24, H - 36);
  ctx.textAlign = 'left';
}

// ── Arrive draw ──────────────────────────────────────────────
function drawArrive() {
  drawDrive();
  ctx.fillStyle = `rgba(7,7,14,${arriveAlpha})`;
  ctx.fillRect(0, 0, W, H);

  if (arriveAlpha > 0.5) {
    const a = (arriveAlpha - 0.5) * 2;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#e0e0e0';
    ctx.font = `13px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('the servers are still up.', W / 2, H / 2 - 12);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = `10px 'Courier New', monospace`;
    ctx.fillText('you are the only one who knows why.', W / 2, H / 2 + 12);
    if (arriveAlpha > 0.85) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillText('[ press any key to continue ]', W / 2, H / 2 + 48);
    }
    ctx.globalAlpha = 1;
  }
}

// ── Garage logic ─────────────────────────────────────────────
function updateGarage() {
  garageTransY = Math.max(0, garageTransY - 18); // slide in

  if (jp('ArrowLeft'))  selIdx = (selIdx + 3) % 4;
  if (jp('ArrowRight')) selIdx = (selIdx + 1) % 4;

  const sel = CARS[selIdx];
  caption.textContent = sel.msg;
  caption.style.opacity = '1';

  const confirm = jp(' ') || jp('Enter');
  if (confirm) {
    rejectCar   = selIdx;
    rejectTimer = 0;
    if (!sel.valid) {
      phase = 'garage-reject';
    } else {
      chosenCar = sel;
      phase     = 'drive';
      prompt.textContent = '←→ steer';
      caption.textContent = '';
      initSnow();
    }
  }
}

function updateGarageReject() {
  rejectTimer++;
  drawGarage(true);

  if (rejectTimer === 40) {
    caption.textContent = CARS[rejectCar].msg;
  }
  if (rejectTimer > 90) {
    phase = 'garage';
    rejectCar = null;
    caption.textContent = CARS[selIdx].msg;
  }
}

// ── Drive logic ──────────────────────────────────────────────
function updateDrive() {
  driveFrame++;
  roadPhase += 3;

  // steering
  if (keys.has('ArrowLeft'))  { playerX = Math.max(0.25, playerX - 0.008); roadOffset += 4; }
  if (keys.has('ArrowRight')) { playerX = Math.min(0.75, playerX + 0.008); roadOffset -= 4; }
  roadOffset *= 0.92; // drift back to center

  // radio ticker
  radioTimer++;
  if (radioState === 'in') {
    radioAlpha = Math.min(1, radioTimer / 40);
    if (radioAlpha >= 1) { radioState = 'hold'; radioTimer = 0; }
  } else if (radioState === 'hold') {
    if (radioTimer > 180) { radioState = 'out'; radioTimer = 0; }
  } else if (radioState === 'out') {
    radioAlpha = Math.max(0, 1 - radioTimer / 30);
    if (radioAlpha <= 0) {
      radioIdx   = (radioIdx + 1) % RADIO.length;
      radioState = 'in';
      radioTimer = 0;
    }
  }

  // arrive after ~25 seconds
  if (driveFrame > 1500) {
    phase = 'arrive';
    arriveTimer = 0;
    arriveAlpha = 0;
  }
}

function updateArrive() {
  driveFrame++;
  roadPhase += 1.5;
  arriveTimer++;
  arriveAlpha = Math.min(1, arriveTimer / 120);

  if (arriveAlpha >= 0.85 && (jp(' ') || jp('Enter') || jp('ArrowLeft') || jp('ArrowRight'))) {
    window.location.href = '/';
  }
}

// ── Main loop ────────────────────────────────────────────────
function loop() {
  ctx.clearRect(0, 0, W, H);
  frame++;

  switch (phase) {
    case 'garage':
      updateGarage();
      drawGarage(false);
      break;
    case 'garage-reject':
      updateGarageReject();
      break;
    case 'drive':
      updateDrive();
      drawDrive();
      break;
    case 'arrive':
      updateArrive();
      drawArrive();
      break;
  }

  justPressed.clear();
  requestAnimationFrame(loop);
}

// ── Init ─────────────────────────────────────────────────────
garageTransY = H * 0.3; // start offscreen, slide in
caption.textContent = CARS[selIdx].msg;
requestAnimationFrame(loop);
