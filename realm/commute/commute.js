// ============================================================
// commute.js — the commute: car select → actual driving game
// ============================================================

const canvas  = document.getElementById('commute-canvas');
const ctx     = canvas.getContext('2d');
const caption = document.getElementById('caption');
const prompt  = document.getElementById('prompt-text');

let W = window.innerWidth;
let H = window.innerHeight;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
resize();
window.addEventListener('resize', resize);

// ── Input ──────────────────────────────────────────────────
const keys = new Set();
const jp   = new Set();
window.addEventListener('keydown', e => {
  if (!keys.has(e.key)) jp.add(e.key);
  keys.add(e.key);
  if ([' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e => keys.delete(e.key));
function justPressed(k) { const v = jp.has(k); jp.delete(k); return v; }

// ── Phase ───────────────────────────────────────────────────
let phase = 'garage';

// ── Garage state ────────────────────────────────────────────
const CARS = [
  { id:'lambo',   label:'Lamborghini Huracán', sub:'v10 · rwd · not today',      color:'#f0c000', roof:'#c8a000', wheel:'#222', shape:'lambo', valid:false, removed:false, msg:"it's 6am. it's -4°F.\nyou are not driving that." },
  { id:'civic',   label:'Honda Civic',         sub:'145k miles · needs oil',      color:'#aaaaaa', roof:'#888',   wheel:'#333', shape:'hatch', valid:false, removed:false, msg:"roommate said no.\n(he didn't ask. you just know.)" },
  { id:'f150',    label:'Ford F-150',          sub:'14 mpg · bed full of snow',   color:'#cc4422', roof:'#aa3311', wheel:'#222', shape:'truck', valid:true,  removed:false, msg:"valid. kind of a lot of car\nfor a 12-minute commute." },
  { id:'outback', label:'Subaru Outback',      sub:'awd · heated seats · 30 mpg', color:'#4477aa', roof:'#335588', wheel:'#222', shape:'wagon', valid:true,  removed:false, msg:"yeah. obviously.\nit's winter. you live in wisconsin." },
];
let selIdx       = 0;
let rejectTimer  = 0;
let rejectCar    = null;
let garageSlideY = 0;
let chosenCar    = null;

// ── Drive state ─────────────────────────────────────────────
const ROAD_DIST   = 2000;   // total distance to office
const BASE_SPEED  = 40;     // mph default
const SPEED_LIMIT = 25;     // cop zones
let speed        = BASE_SPEED;
let playerDrift  = 0;       // -0.48 = far left, +0.48 = far right
let distance     = 0;
let driveFrame   = 0;
let hp           = 3;
let hitFlash     = 0;       // frames of red flash
let invincible   = 0;       // frames of hit-immunity
let bustTimer    = 0;       // frames of cop-busted slow
let bustFlash    = 0;
let obstacles    = [];
let nextSpawnAt  = 250;
let snow         = [];
let gameOver     = false;
let goTimer      = 0;
// road rendering
let roadPhase    = 0;
// radio
const RADIO = [
  '"local roads: icy. take it slow."',
  '"wind chill: -22°F. bundle up."',
  '"visibility: poor. fog advisory."',
  '"deer crossing reported on hwy 51."',
  '"watch for impaired drivers tonight."',
  '"the servers are still up."',
  '"have a safe commute. seriously."',
];
let radioIdx   = 0;
let radioAlpha = 0;
let radioState = 'in';
let radioTimer = 0;

// ── Road curve ───────────────────────────────────────────────
function getCurve(d) {
  return Math.sin(d * 0.006) * 0.6 + Math.sin(d * 0.011) * 0.3;
}

// ── Road perspective constants ───────────────────────────────
const VY       = () => H * 0.28;
const HALF_TOP = 30;
const HALF_BOT = () => W * 0.38;

function rHalf(z) { return HALF_TOP + (HALF_BOT() - HALF_TOP) * z; }
function roadCenterX(z) {
  const curve = getCurve(distance);
  return W / 2 + curve * W * 0.14 * z * z;
}
function projectRoad(rx, z) {
  const cx = roadCenterX(z);
  const rh = rHalf(z);
  const vy = VY();
  return {
    sx: cx + (rx - 0.5 - playerDrift) * rh * 2,
    sy: vy + (H - vy) * z,
    scale: z * 2.2,
  };
}

// ── Obstacle spawning ────────────────────────────────────────
function spawnObstacle() {
  const types = ['deer'];
  if (distance > 400)  types.push('deer');
  if (distance > 700)  types.push('drunk', 'drunk');
  if (distance > 1000) types.push('cop');

  const type = types[Math.floor(Math.random() * types.length)];

  if (type === 'deer') {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    obstacles.push({
      type: 'deer', z: 0.12,
      rx: side === 'left' ? 0.04 : 0.96,
      vrx: side === 'left' ? 0.007 : -0.007,
      frozen: false, frozenTimer: 0,
      frozenAt: 0.58 + Math.random() * 0.1,
      bolted: false,
      side,
    });
  } else if (type === 'drunk') {
    obstacles.push({
      type: 'drunk', z: 0.0,
      rx: 0.5 + (Math.random() - 0.5) * 0.4,
      baseRx: 0.5,
      swayAmp: 0.28 + Math.random() * 0.14,
      swaySpeed: 0.04 + Math.random() * 0.03,
      timer: 0,
      color: ['#cc4422','#2244cc','#228833','#884488'][Math.floor(Math.random()*4)],
    });
  } else if (type === 'cop') {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    obstacles.push({
      type: 'cop', z: 0.0,
      rx: side === 'left' ? 0.01 : 0.99,
      side, busted: false, lightPhase: 0,
      zonePassed: false,
    });
  }
}

// ── Obstacle update ──────────────────────────────────────────
function updateObstacle(obs, i) {
  const vz = (speed / BASE_SPEED) * (obs.type === 'drunk' ? 0.009 : 0.006);

  if (obs.type === 'deer') {
    obs.z += vz;
    if (!obs.frozen && !obs.bolted && obs.z >= obs.frozenAt) {
      obs.frozen = true;
      obs.frozenTimer = 55;
    }
    if (obs.frozen) {
      obs.frozenTimer--;
      if (obs.frozenTimer <= 0) { obs.frozen = false; obs.bolted = true; obs.vrx *= 4; }
    } else {
      obs.rx += obs.vrx;
    }
    // collision
    if (obs.z > 0.82 && obs.z < 0.98 && invincible <= 0) {
      const { sx } = projectRoad(obs.rx, obs.z);
      if (Math.abs(sx - W / 2) < 48 + obs.z * 30) {
        takeHit('deer');
        obstacles.splice(i, 1);
        return true;
      }
    }
    if (obs.z > 1.05 || obs.rx < -0.1 || obs.rx > 1.1) { obstacles.splice(i, 1); return true; }

  } else if (obs.type === 'drunk') {
    obs.z += vz + 0.003;
    obs.timer++;
    obs.rx = obs.baseRx + Math.sin(obs.timer * obs.swaySpeed) * obs.swayAmp;
    obs.rx = Math.max(0.05, Math.min(0.95, obs.rx));
    // collision (head-on when very close)
    if (obs.z > 0.80 && obs.z < 0.98 && invincible <= 0) {
      const { sx } = projectRoad(obs.rx, obs.z);
      if (Math.abs(sx - W / 2) < 55 + obs.z * 40) {
        takeHit('drunk');
        obstacles.splice(i, 1);
        return true;
      }
    }
    if (obs.z > 1.05) { obstacles.splice(i, 1); return true; }

  } else if (obs.type === 'cop') {
    obs.z += vz;
    obs.lightPhase += 0.05;
    // check speed when player passes (z≈0.88)
    if (!obs.zonePassed && obs.z > 0.84) {
      obs.zonePassed = true;
      if (speed > SPEED_LIMIT + 8 && !obs.busted) {
        obs.busted = true;
        takeBust();
      }
    }
    if (obs.z > 1.05) { obstacles.splice(i, 1); return true; }
  }
  return false;
}

// ── Damage ───────────────────────────────────────────────────
function takeHit(source) {
  if (invincible > 0) return;
  hp = Math.max(0, hp - 1);
  hitFlash   = 35;
  invincible = 90;
  speed      = Math.max(15, speed - 22);
  if (hp <= 0) { gameOver = true; goTimer = 0; }
}

function takeBust() {
  bustFlash = 120;
  bustTimer = 240; // forced 25mph for 4 seconds
  speed = SPEED_LIMIT;
  // optional: could also cost HP — make it cost HP on repeat offense
}

// ── Snow ─────────────────────────────────────────────────────
function initSnow() {
  snow = [];
  for (let i = 0; i < 200; i++) {
    snow.push({
      ox: (Math.random() - 0.5) * W * 1.8,
      oy: Math.random() * H,
      r:  Math.random() * 2.5 + 0.4,
      spd: Math.random() * 0.003 + 0.0008,
    });
  }
}

// ── Drawing helpers ──────────────────────────────────────────
function drawMidnight(cx, cy, size) {
  ctx.save();
  ctx.fillStyle = '#f8f8f0';
  ctx.beginPath(); ctx.ellipse(cx, cy, size*0.6, size*0.48, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.ellipse(cx-size*0.1, cy-size*0.1, size*0.18, size*0.13, 0.4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx+size*0.25, cy+size*0.1, size*0.12, size*0.1, -0.3, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f8f8f0';
  ctx.beginPath(); ctx.ellipse(cx-size*0.5, cy-size*0.15, size*0.3, size*0.26, -0.2, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#c8a060'; ctx.lineWidth = Math.max(1, size*0.07);
  ctx.beginPath(); ctx.moveTo(cx-size*0.58, cy-size*0.37); ctx.lineTo(cx-size*0.64, cy-size*0.56); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx-size*0.43, cy-size*0.37); ctx.lineTo(cx-size*0.41, cy-size*0.57); ctx.stroke();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(cx-size*0.58, cy-size*0.18, size*0.04, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawCarSide(car, cx, cy, scale, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  const W2 = 80, H2 = 30;
  const { color, roof: rc, wheel: wc, shape } = car;
  if (shape === 'lambo') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-W2,0); ctx.lineTo(-W2,-H2*0.5); ctx.lineTo(-W2*0.1,-H2*0.5);
    ctx.lineTo(W2*0.5,-H2*1.5); ctx.lineTo(W2*0.9,-H2*0.6); ctx.lineTo(W2,0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(150,220,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(-W2*0.1,-H2*0.5); ctx.lineTo(W2*0.5,-H2*1.5); ctx.lineTo(W2*0.5,-H2*0.6); ctx.lineTo(-W2*0.05,-H2*0.5);
    ctx.closePath(); ctx.fill();
  } else if (shape === 'hatch') {
    ctx.fillStyle=color; ctx.fillRect(-W2,-H2,W2*2,H2);
    ctx.fillStyle=rc;
    ctx.beginPath(); ctx.moveTo(-W2*0.4,-H2); ctx.lineTo(-W2*0.2,-H2*1.7); ctx.lineTo(W2*0.55,-H2*1.7); ctx.lineTo(W2*0.7,-H2); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(150,220,255,0.4)';
    ctx.beginPath(); ctx.moveTo(-W2*0.15,-H2); ctx.lineTo(0,-H2*1.6); ctx.lineTo(W2*0.5,-H2*1.6); ctx.lineTo(W2*0.62,-H2); ctx.closePath(); ctx.fill();
  } else if (shape === 'truck') {
    ctx.fillStyle=color; ctx.fillRect(-W2,-H2,W2*1.2,H2);
    ctx.fillStyle=rc; ctx.fillRect(W2*0.15,-H2*1.8,W2*0.85,H2*1.8);
    ctx.fillStyle='rgba(150,220,255,0.4)'; ctx.fillRect(W2*0.25,-H2*1.65,W2*0.6,H2*0.9);
    ctx.fillStyle='rgba(220,230,255,0.8)';
    ctx.beginPath(); ctx.ellipse(-W2*0.35,-H2*0.1,W2*0.5,H2*0.25,0,0,Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle=color; ctx.fillRect(-W2,-H2,W2*2,H2);
    ctx.fillStyle=rc;
    ctx.beginPath(); ctx.moveTo(-W2*0.5,-H2); ctx.lineTo(-W2*0.35,-H2*1.7); ctx.lineTo(W2*0.85,-H2*1.7); ctx.lineTo(W2*0.95,-H2); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(150,220,255,0.4)'; ctx.fillRect(-W2*0.25,-H2*1.6,W2*0.55,H2*0.7); ctx.fillRect(W2*0.38,-H2*1.6,W2*0.38,H2*0.7);
  }
  ctx.fillStyle=wc;
  ctx.beginPath(); ctx.arc(-W2*0.55,2,14,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(W2*0.55,2,14,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#888';
  ctx.beginPath(); ctx.arc(-W2*0.55,2,6,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(W2*0.55,2,6,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawCarRear(car, cx, cy, scale) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  let BW, BH, rW, rH;
  if (car.shape==='lambo') { BW=92;BH=20;rW=52;rH=18; }
  else if (car.shape==='truck') { BW=80;BH=46;rW=62;rH=36; }
  else { BW=74;BH=34;rW=58;rH=30; }
  // wheels
  ctx.fillStyle=car.wheel;
  ctx.beginPath(); ctx.arc(-BW-14,BH*0.1,28,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(BW+14,BH*0.1,28,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#555';
  ctx.beginPath(); ctx.arc(-BW-14,BH*0.1,11,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(BW+14,BH*0.1,11,0,Math.PI*2); ctx.fill();
  // body
  ctx.fillStyle=car.color;
  ctx.beginPath(); ctx.roundRect(-BW,-BH,BW*2,BH,[2,2,6,6]); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.fillRect(-BW+4,-BH+2,BW*2-8,4);
  // roof
  ctx.fillStyle=car.roof;
  ctx.beginPath(); ctx.moveTo(-BW*0.9,-BH); ctx.lineTo(-rW,-BH-rH); ctx.lineTo(rW,-BH-rH); ctx.lineTo(BW*0.9,-BH); ctx.closePath(); ctx.fill();
  // rear window
  ctx.fillStyle='rgba(140,210,255,0.28)';
  ctx.beginPath(); ctx.moveTo(-BW*0.72,-BH-2); ctx.lineTo(-rW*0.86,-BH-rH*0.86); ctx.lineTo(rW*0.86,-BH-rH*0.86); ctx.lineTo(BW*0.72,-BH-2); ctx.closePath(); ctx.fill();
  // taillights
  const tlW=BW*0.26,tlH=BH*0.6,tlY=-BH*0.82;
  ctx.shadowColor='#ff3300'; ctx.shadowBlur=12;
  ctx.fillStyle='#aa1100'; ctx.fillRect(-BW,tlY,tlW,tlH); ctx.fillRect(BW-tlW,tlY,tlW,tlH);
  ctx.fillStyle='#ff5533'; ctx.fillRect(-BW+2,tlY+2,tlW-4,tlH-4); ctx.fillRect(BW-tlW+2,tlY+2,tlW-4,tlH-4);
  ctx.shadowBlur=0;
  // bumper + plate
  ctx.fillStyle='#2a2a2a'; ctx.beginPath(); ctx.roundRect(-BW*0.9,0,BW*1.8,10,3); ctx.fill();
  ctx.fillStyle='#f5f5f2'; ctx.fillRect(-20,-BH*0.4,40,20);
  ctx.strokeStyle='#cc1111'; ctx.lineWidth=1; ctx.strokeRect(-20,-BH*0.4,40,20);
  ctx.fillStyle='#cc1111'; ctx.font=`bold 8px 'Courier New'`; ctx.textAlign='center'; ctx.fillText('WI',0,-BH*0.4+13);
  ctx.restore();
}

function drawDeer(sx, sy, scale, frozen) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#7a4010';
  ctx.beginPath(); ctx.ellipse(0,-8,22,12,0.15,0,Math.PI*2); ctx.fill();
  // head
  ctx.beginPath(); ctx.ellipse(-20,-18,11,8,-0.25,0,Math.PI*2); ctx.fill();
  // ears
  ctx.fillStyle='#9a5520';
  ctx.beginPath(); ctx.ellipse(-25,-25,4,8,-0.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-15,-25,4,8,0.5,0,Math.PI*2); ctx.fill();
  // legs
  ctx.strokeStyle='#5a3008'; ctx.lineWidth=4;
  [[-10,20],[0,22],[10,20],[18,22]].forEach(([lx,ly]) => {
    ctx.beginPath(); ctx.moveTo(lx,-2); ctx.lineTo(lx,ly); ctx.stroke();
  });
  // eye
  if (frozen) {
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-22,-19,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ff2200'; ctx.beginPath(); ctx.arc(-22,-19,2.5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,50,0,0.5)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(-22,-19,9,0,Math.PI*2); ctx.stroke();
  } else {
    ctx.fillStyle='#1a0a00'; ctx.beginPath(); ctx.arc(-22,-19,2,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawDrunkCar(sx, sy, scale, color) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(scale, scale);
  const BW=62, BH=32;
  ctx.fillStyle=color;
  ctx.beginPath(); ctx.roundRect(-BW,-BH,BW*2,BH,[4,4,2,2]); ctx.fill();
  // windshield
  ctx.fillStyle='rgba(140,210,255,0.25)';
  ctx.beginPath(); ctx.moveTo(-BW*0.72,-BH); ctx.lineTo(-BW*0.52,-BH-26); ctx.lineTo(BW*0.52,-BH-26); ctx.lineTo(BW*0.72,-BH); ctx.closePath(); ctx.fill();
  // roof
  ctx.fillStyle='#2a2a2a';
  ctx.beginPath(); ctx.moveTo(-BW*0.52,-BH); ctx.lineTo(-BW*0.38,-BH-26); ctx.lineTo(BW*0.38,-BH-26); ctx.lineTo(BW*0.52,-BH); ctx.closePath(); ctx.fill();
  // headlights (glaring)
  ctx.fillStyle='#ffffcc'; ctx.shadowColor='#ffffaa'; ctx.shadowBlur=28;
  ctx.beginPath(); ctx.ellipse(-BW*0.62,-BH*0.25,14,9,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(BW*0.62,-BH*0.25,14,9,0,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='#222'; ctx.beginPath(); ctx.roundRect(-BW*0.9,0,BW*1.8,9,3); ctx.fill();
  // wheels
  ctx.fillStyle='#111';
  ctx.beginPath(); ctx.arc(-BW-12,-4,24,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(BW+12,-4,24,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawCopParked(sx, sy, scale, lphase) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(scale, scale);
  const BW=74,BH=34,rW=58,rH=30;
  ctx.fillStyle='#111';
  ctx.beginPath(); ctx.arc(-BW-14,BH*0.1,28,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(BW+14,BH*0.1,28,0,Math.PI*2); ctx.fill();
  // black/white body
  ctx.fillStyle='#e8e8e8'; ctx.beginPath(); ctx.roundRect(-BW,-BH,BW*2,BH,[2,2,6,6]); ctx.fill();
  ctx.fillStyle='#111'; ctx.fillRect(-BW,-BH,BW,BH*0.55); ctx.fillRect(0,-BH*0.45,BW,BH*0.45);
  // POLICE text
  ctx.fillStyle='#555'; ctx.font=`bold 8px 'Courier New'`; ctx.textAlign='center'; ctx.fillText('POLICE',0,-BH*0.2);
  // roof
  ctx.fillStyle='#1a1a1a'; ctx.beginPath(); ctx.moveTo(-BW*0.9,-BH); ctx.lineTo(-rW,-BH-rH); ctx.lineTo(rW,-BH-rH); ctx.lineTo(BW*0.9,-BH); ctx.closePath(); ctx.fill();
  // lightbar
  ctx.fillStyle='#2a2a2a'; ctx.fillRect(-rW*0.7,-BH-rH-7,rW*1.4,9);
  const bl = Math.floor(lphase*4)%2;
  ctx.fillStyle=bl ? '#3366ff' : '#112255'; ctx.shadowColor='#3366ff'; ctx.shadowBlur=bl?16:0;
  ctx.fillRect(-rW*0.65,-BH-rH-6,rW*0.6,7);
  ctx.fillStyle=!bl ? '#ff2200' : '#551100'; ctx.shadowColor='#ff2200'; ctx.shadowBlur=!bl?16:0;
  ctx.fillRect(-rW*0.05,-BH-rH-6,rW*0.7,7);
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(140,210,255,0.22)';
  ctx.beginPath(); ctx.moveTo(-BW*0.72,-BH-2); ctx.lineTo(-rW*0.86,-BH-rH*0.86); ctx.lineTo(rW*0.86,-BH-rH*0.86); ctx.lineTo(BW*0.72,-BH-2); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#aa1100'; ctx.shadowColor='#ff3300'; ctx.shadowBlur=8;
  ctx.fillRect(-BW,-BH*0.8,BW*0.25,BH*0.58); ctx.fillRect(BW-BW*0.25,-BH*0.8,BW*0.25,BH*0.58);
  ctx.shadowBlur=0;
  ctx.fillStyle='#2a2a2a'; ctx.beginPath(); ctx.roundRect(-BW*0.9,0,BW*1.8,10,3); ctx.fill();
  ctx.restore();
}

// ── Road drawing ─────────────────────────────────────────────
function drawRoad() {
  const vy = VY();
  const curve = getCurve(distance);
  const hBot  = HALF_BOT();

  // sky
  const sky = ctx.createLinearGradient(0,0,0,vy);
  sky.addColorStop(0,'#070712'); sky.addColorStop(1,'#131326');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,vy);

  // treeline silhouette
  ctx.fillStyle='#0c0c1a';
  for (let i=0; i<50; i++) {
    const tx = (i/50)*W;
    const th = 18 + Math.sin(i*3.7)*10 + Math.sin(i*7.1)*5;
    ctx.beginPath(); ctx.moveTo(tx,vy); ctx.lineTo(tx+7,vy-th); ctx.lineTo(tx+14,vy); ctx.fill();
  }

  // road strips (perspective with curve)
  const STRIPS = 24;
  for (let i=0; i<STRIPS; i++) {
    const t1 = i/STRIPS, t2 = (i+1)/STRIPS;
    const y1 = vy + (H-vy)*t1, y2 = vy + (H-vy)*t2;
    const cx1 = W/2 + curve*W*0.14*t1*t1;
    const cx2 = W/2 + curve*W*0.14*t2*t2;
    const r1 = HALF_TOP + (hBot-HALF_TOP)*t1;
    const r2 = HALF_TOP + (hBot-HALF_TOP)*t2;
    ctx.fillStyle = i%2===0 ? '#20202e' : '#242434';
    ctx.beginPath();
    ctx.moveTo(cx1-r1,y1); ctx.lineTo(cx1+r1,y1);
    ctx.lineTo(cx2+r2,y2); ctx.lineTo(cx2-r2,y2);
    ctx.closePath(); ctx.fill();
  }

  // road edge lines
  ctx.strokeStyle='#b88820'; ctx.lineWidth=2.5;
  ctx.beginPath();
  ctx.moveTo(W/2,vy);
  for (let i=1; i<=STRIPS; i++) {
    const t = i/STRIPS;
    const cx = W/2 + curve*W*0.14*t*t;
    const r  = HALF_TOP + (hBot-HALF_TOP)*t;
    const y  = vy + (H-vy)*t;
    ctx.lineTo(cx - r, y);
  }
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W/2,vy);
  for (let i=1; i<=STRIPS; i++) {
    const t = i/STRIPS;
    const cx = W/2 + curve*W*0.14*t*t;
    const r  = HALF_TOP + (hBot-HALF_TOP)*t;
    const y  = vy + (H-vy)*t;
    ctx.lineTo(cx + r, y);
  }
  ctx.stroke();

  // ground beyond road
  const groundGrad = ctx.createLinearGradient(0,vy,0,H);
  groundGrad.addColorStop(0,'#18182a'); groundGrad.addColorStop(1,'#22223a');
  ctx.fillStyle=groundGrad;
  const lastT=1, lcx=W/2+curve*W*0.14, lr=hBot;
  ctx.beginPath();
  ctx.moveTo(0,H); ctx.lineTo(0,vy); ctx.lineTo(lcx-lr,H+20); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W,H); ctx.lineTo(W,vy); ctx.lineTo(lcx+lr,H+20); ctx.closePath(); ctx.fill();

  // center dashes (scrolling)
  roadPhase = (roadPhase + speed * 0.0012) % 1;
  for (let i=0; i<16; i++) {
    let t = ((i/16) + roadPhase) % 1;
    if (t < 0.01) continue;
    if (Math.floor(t*16)%2===0) continue;
    const cx = W/2 + curve*W*0.14*t*t;
    const fy = vy + (H-vy)*t;
    const dw = Math.max(2, t*20);
    const dh = Math.max(2, t*12);
    ctx.fillStyle=`rgba(240,230,160,${0.35+t*0.5})`;
    ctx.fillRect(cx-dw/2, fy-dh/2, dw, dh);
  }

  // snow
  snow.forEach(s => {
    const expandF = 1 + s.spd * driveFrame * 0.35;
    const sx = W/2 + s.ox * expandF;
    const sy = vy + s.oy * expandF;
    const sr = s.r * (0.4 + s.spd * driveFrame * 0.25);
    if (sx<-10||sx>W+10||sy<vy-10||sy>H+10) {
      s.ox = (Math.random()-0.5)*60; s.oy = Math.random()*H*0.4; s.spd=Math.random()*0.003+0.001;
    }
    ctx.fillStyle=`rgba(200,215,255,${Math.min(0.7,Math.min(sr,4)*0.22)})`;
    ctx.beginPath(); ctx.arc(sx, sy, Math.min(sr,3.5), 0, Math.PI*2); ctx.fill();
  });
}

// ── Draw obstacles ───────────────────────────────────────────
function drawObstacles() {
  // sort back to front so closer objects draw on top
  const sorted = [...obstacles].sort((a,b) => a.z - b.z);
  sorted.forEach(obs => {
    const {sx, sy, scale} = projectRoad(obs.rx, obs.z);
    if (obs.type === 'deer') {
      drawDeer(sx, sy, scale, obs.frozen);
      if (obs.frozen) {
        // "!!" warning
        ctx.fillStyle='#ffdd00'; ctx.font=`bold ${Math.max(10,scale*14)}px monospace`; ctx.textAlign='center';
        ctx.fillText('!!', sx, sy - scale*40);
      }
    } else if (obs.type === 'drunk') {
      drawDrunkCar(sx, sy, scale, obs.color);
      // "swerving" label
      if (obs.z > 0.3) {
        ctx.fillStyle=`rgba(255,80,80,${obs.z*0.7})`; ctx.font=`${Math.max(8,scale*11)}px monospace`; ctx.textAlign='center';
        ctx.fillText('⚠ SWERVING', sx, sy - scale*70);
      }
    } else if (obs.type === 'cop') {
      drawCopParked(sx, sy, scale, obs.lightPhase);
      // speed zone sign near cop
      if (obs.z > 0.3 && obs.z < 0.85) {
        ctx.fillStyle=`rgba(255,220,0,${Math.min(1,(obs.z-0.3)*3)})`; ctx.font=`${Math.max(9,scale*12)}px monospace`; ctx.textAlign='center';
        ctx.fillText(`SPEED LIMIT ${SPEED_LIMIT}`, sx, sy - scale*80);
      }
    }
  });
}

// ── Dashboard & HUD ──────────────────────────────────────────
function drawHUD() {
  // gradient mask at bottom
  const dh = H * 0.2;
  const dg = ctx.createLinearGradient(0,H-dh,0,H);
  dg.addColorStop(0,'rgba(5,5,14,0)'); dg.addColorStop(0.35,'rgba(5,5,14,0.95)'); dg.addColorStop(1,'rgba(5,5,14,1)');
  ctx.fillStyle=dg; ctx.fillRect(0,H-dh,W,dh);

  // player car
  const sc = 2.4;
  const carCX = W/2 + playerDrift * HALF_BOT() * 1.3;
  const carCY = H - 56;
  const sway  = Math.sin(driveFrame*0.04)*1.5;
  if (chosenCar) {
    drawCarRear(chosenCar, carCX, carCY+sway, sc);
    // Midnight in rear window
    const BH = chosenCar.shape==='lambo'?20:chosenCar.shape==='truck'?46:34;
    const rH  = chosenCar.shape==='lambo'?18:chosenCar.shape==='truck'?36:30;
    const winY = (carCY+sway) - (BH + rH*0.5)*sc;
    drawMidnight(carCX + 26, winY, 15);
  }

  // speed / distance
  ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font=`10px 'Courier New'`; ctx.textAlign='right';
  const speedColor = bustTimer > 0 ? '#ff4466' : (speed > SPEED_LIMIT + 8 ? '#ffd966' : 'rgba(255,255,255,0.4)');
  ctx.fillStyle = speedColor;
  ctx.fillText(`${Math.round(speed)} mph`, W-24, H-24);
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font=`9px 'Courier New'`;
  ctx.fillText(`${Math.round(distance / ROAD_DIST * 100)}% to work`, W-24, H-40);

  // progress bar (top)
  const prog = distance / ROAD_DIST;
  ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fillRect(W*0.2,8,W*0.6,4);
  ctx.fillStyle='rgba(126,255,200,0.5)'; ctx.fillRect(W*0.2,8,W*0.6*prog,4);

  // HP hearts
  ctx.font=`18px monospace`; ctx.textAlign='left';
  for (let i=0; i<3; i++) {
    ctx.fillStyle = i < hp ? '#ff4466' : 'rgba(255,255,255,0.1)';
    ctx.fillText('♥', 20 + i*26, 38);
  }

  // radio
  if (radioAlpha > 0) {
    ctx.globalAlpha=radioAlpha;
    ctx.fillStyle='#c8fff0'; ctx.font=`11px 'Courier New'`; ctx.textAlign='center';
    ctx.fillText('📻  ' + RADIO[radioIdx], W/2, 26);
    ctx.globalAlpha=1;
  }

  // bust warning
  if (bustFlash > 0) {
    const ba = Math.min(1, bustFlash/60) * (Math.sin(bustFlash*0.4)*0.5+0.5);
    ctx.fillStyle=`rgba(0,50,255,${ba*0.15})`; ctx.fillRect(0,0,W,H);
    ctx.fillStyle=`rgba(100,150,255,${ba})`; ctx.font=`bold 18px 'Courier New'`; ctx.textAlign='center';
    ctx.fillText('SPEED TRAP — SLOW DOWN', W/2, H/2-30);
    bustFlash--;
  }
  // hit flash
  if (hitFlash > 0) {
    const ha = (hitFlash/35)*0.25;
    ctx.fillStyle=`rgba(255,20,20,${ha})`; ctx.fillRect(0,0,W,H);
    hitFlash--;
  }
}

// ── Garage draw ──────────────────────────────────────────────
function drawGarage(rejecting) {
  ctx.fillStyle='#0c0c10'; ctx.fillRect(0,0,W,H);
  for (let i=0; i<4; i++) {
    const lx = W*(i+0.5)/4;
    const g = ctx.createRadialGradient(lx,0,0,lx,0,H*0.55);
    g.addColorStop(0,'rgba(220,220,200,0.07)'); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(220,220,200,0.85)'; ctx.fillRect(lx-2,0,4,8);
  }
  ctx.fillStyle='#181820'; ctx.fillRect(0,H*0.65,W,H*0.35);
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
  for (let i=0;i<8;i++) { ctx.beginPath(); ctx.moveTo(W*i/8,H*0.65); ctx.lineTo(W*i/8,H); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0,H*0.65); ctx.lineTo(W,H*0.65); ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.stroke();

  const carY = H*0.60 + garageSlideY;
  CARS.forEach((car, i) => {
    const cx = W*(i+0.5)/4;
    const isSel = i===selIdx;
    const isRej = rejecting && rejectCar===i;

    // permanently gone cars
    if (car.removed) {
      // skid marks for Lambo, empty parking space for others
      ctx.save();
      ctx.globalAlpha = 0.18;
      if (car.id === 'lambo') {
        ctx.strokeStyle='#888'; ctx.lineWidth=6; ctx.setLineDash([8,4]);
        ctx.beginPath(); ctx.moveTo(cx-60,carY-5); ctx.bezierCurveTo(cx+20,carY-30,cx+80,carY+10,cx+W*0.35,carY-20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-50,carY+8); ctx.bezierCurveTo(cx+30,carY-18,cx+90,carY+22,cx+W*0.35+10,carY-8); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=1; ctx.setLineDash([6,6]);
      ctx.strokeRect(cx-W/4*0.44,carY-100,W/4*0.88,110);
      ctx.setLineDash([]);
      ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.font=`10px 'Courier New'`; ctx.textAlign='center';
      ctx.fillText(car.id==='lambo'?'gone.':'not an option.', cx, carY-30);
      ctx.restore();
      return;
    }

    let sc = isSel ? 1.15 : 0.9;
    let al = isSel ? 1 : 0.5;
    let dx = 0, rot = 0;
    if (isRej) {
      const t = rejectTimer/80;
      dx  = t*t*W*(car.id==='lambo'?0.65:-0.45);
      rot = t*(car.id==='lambo'?1.9:0);
      al  = 1-t*0.7;
    }
    if (isSel && !rejecting) {
      ctx.save(); ctx.shadowColor=car.valid?'#7effc8':'#ff4466'; ctx.shadowBlur=28;
      ctx.strokeStyle=car.valid?'rgba(126,255,200,0.4)':'rgba(255,68,102,0.3)'; ctx.lineWidth=2;
      ctx.strokeRect(cx-W/4*0.44,carY-115,W/4*0.88,125); ctx.restore();
    }
    ctx.save(); ctx.translate(cx+dx,carY); ctx.rotate(rot);
    drawCarSide(car, 0, 0, sc, al); ctx.restore();
    if (!rejecting||!isRej) {
      ctx.globalAlpha=isSel?1:0.42;
      ctx.fillStyle='#e0e0e0'; ctx.font=`bold ${isSel?13:11}px 'Courier New'`; ctx.textAlign='center';
      ctx.fillText(car.label,cx,carY+32);
      ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.font=`10px 'Courier New'`;
      ctx.fillText(car.sub,cx,carY+48);
      ctx.globalAlpha=1;
    }
  });
  ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.font=`11px 'Courier New'`; ctx.textAlign='center';
  ctx.fillText('CHOOSE YOUR VEHICLE',W/2,38);
  ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.font=`9px 'Courier New'`;
  ctx.fillText('← → navigate   enter / space confirm',W/2,H-18);
}

function nextActive(from, dir) {
  let i = (from + dir + 4) % 4;
  let tries = 0;
  while (CARS[i].removed && tries < 4) { i = (i + dir + 4) % 4; tries++; }
  return i;
}

// ── Garage update ─────────────────────────────────────────────
function updateGarage() {
  garageSlideY = Math.max(0, garageSlideY - 20);
  if (justPressed('ArrowLeft'))  selIdx = nextActive(selIdx, -1);
  if (justPressed('ArrowRight')) selIdx = nextActive(selIdx,  1);
  caption.textContent = CARS[selIdx].msg;

  if (justPressed(' ')||justPressed('Enter')) {
    rejectCar = selIdx; rejectTimer = 0;
    if (!CARS[selIdx].valid) { phase='garage-reject'; }
    else {
      chosenCar = CARS[selIdx];
      phase = 'drive';
      prompt.textContent = '← → steer   ↑ gas   ↓ brake';
      caption.textContent = '';
      initSnow();
      initDrive();
    }
  }
}

let midnightIntroTimer = 0;

function initDrive() {
  speed=BASE_SPEED; playerDrift=0; distance=0; driveFrame=0;
  hp=3; hitFlash=0; invincible=0; bustTimer=0; bustFlash=0;
  obstacles=[]; nextSpawnAt=280; gameOver=false; goTimer=0;
  radioIdx=0; radioAlpha=0; radioState='in'; radioTimer=0;
  midnightIntroTimer = 260;
  caption.style.transition = 'opacity 1s';
  caption.style.opacity = '1';
  caption.textContent = "midnight is already in the passenger seat.\nshe doesn't explain how she got there.";
  setTimeout(() => {
    caption.style.opacity = '0';
    setTimeout(() => { caption.textContent = ''; caption.style.opacity = '1'; }, 1000);
  }, 3800);
}

function updateGarageReject() {
  rejectTimer++;
  drawGarage(true);
  if (rejectTimer===38) caption.textContent=CARS[rejectCar].msg;
  if (rejectTimer>90) {
    CARS[rejectCar].removed = true;           // gone forever
    selIdx = nextActive(rejectCar, 1);        // jump to next valid car
    phase = 'garage';
    rejectCar = null;
    caption.textContent = CARS[selIdx].msg;
  }
}

// ── Drive update ─────────────────────────────────────────────
function updateDrive() {
  if (gameOver) {
    goTimer++;
    if (goTimer > 180) initDrive(); // restart after 3s
    return;
  }

  driveFrame++;
  if (invincible > 0) invincible--;
  if (bustTimer > 0) { bustTimer--; speed = Math.min(speed, SPEED_LIMIT); }

  // speed control
  if (keys.has('ArrowUp'))   speed = Math.min(65, speed + 1.8);
  else if (keys.has('ArrowDown')) speed = Math.max(8, speed - 4);
  else speed += (BASE_SPEED - speed) * 0.018;

  // steering
  const steer = 0.005 * (speed / BASE_SPEED);
  if (keys.has('ArrowLeft'))  playerDrift -= steer;
  if (keys.has('ArrowRight')) playerDrift += steer;

  // road curve pushes player
  playerDrift += getCurve(distance) * speed * 0.000018;

  // off-road
  if (playerDrift < -0.48 || playerDrift > 0.48) {
    playerDrift = Math.max(-0.44, Math.min(0.44, playerDrift * 0.5));
    speed *= 0.6;
    takeHit('offroad');
  }

  distance += speed * 0.012;

  // spawn obstacles
  if (distance >= nextSpawnAt) {
    spawnObstacle();
    nextSpawnAt = distance + 280 + Math.random() * 250;
  }

  // update obstacles back-to-front to avoid splice issues
  for (let i = obstacles.length - 1; i >= 0; i--) {
    updateObstacle(obstacles[i], i);
  }

  // radio ticker
  radioTimer++;
  if (radioState==='in') { radioAlpha=Math.min(1,radioTimer/40); if(radioAlpha>=1){radioState='hold';radioTimer=0;} }
  else if (radioState==='hold') { if(radioTimer>160){radioState='out';radioTimer=0;} }
  else { radioAlpha=Math.max(0,1-radioTimer/28); if(radioAlpha<=0){radioIdx=(radioIdx+1)%RADIO.length;radioState='in';radioTimer=0;} }

  // arrival
  if (distance >= ROAD_DIST) { phase='arrive'; }
}

// ── Drive draw ───────────────────────────────────────────────
function drawDrive() {
  drawRoad();
  drawObstacles();
  drawHUD();

  // game over overlay
  if (gameOver) {
    const a = Math.min(1, goTimer/40);
    ctx.fillStyle=`rgba(7,7,14,${a*0.88})`; ctx.fillRect(0,0,W,H);
    if (a>0.5) {
      ctx.globalAlpha=(a-0.5)*2;
      ctx.fillStyle='#ff4466'; ctx.font=`bold 32px 'Courier New'`; ctx.textAlign='center';
      ctx.fillText('TOTALED', W/2, H/2-20);
      ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font=`11px 'Courier New'`;
      ctx.fillText('restarting commute...', W/2, H/2+20);
      ctx.globalAlpha=1;
    }
  }
}

// ── Arrive ───────────────────────────────────────────────────
let arriveFrame = 0;
function updateArrive() {
  arriveFrame++;
  driveFrame++; roadPhase += 0.8; speed = Math.max(5, speed - 1.5);
}
function drawArrive() {
  drawRoad();
  drawHUD();
  const a = Math.min(1, arriveFrame / 90);
  ctx.fillStyle=`rgba(7,7,14,${a})`; ctx.fillRect(0,0,W,H);
  if (a > 0.7) {
    const ta = (a-0.7)/0.3;
    ctx.globalAlpha=ta;
    ctx.fillStyle='#e0e0e0'; ctx.font=`13px 'Courier New'`; ctx.textAlign='center';
    ctx.fillText('6:47 AM. office parking lot.', W/2, H/2-30);
    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font=`11px 'Courier New'`;
    ctx.fillText('the servers are still up.', W/2, H/2);
    ctx.fillText('you made it.', W/2, H/2+22);
    if (ta > 0.6) {
      ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.font=`9px 'Courier New'`;
      ctx.fillText('[ press any key to enter the building ]', W/2, H/2+58);
    }
    ctx.globalAlpha=1;
  }
  if (arriveFrame > 60 && (jp.size > 0)) {
    window.location.href = '/realm/office/';
  }
}

// ── Main loop ────────────────────────────────────────────────
function loop() {
  ctx.clearRect(0,0,W,H);
  switch (phase) {
    case 'garage':         updateGarage(); drawGarage(false); break;
    case 'garage-reject':  updateGarageReject(); break;
    case 'drive':          updateDrive(); drawDrive(); break;
    case 'arrive':         updateArrive(); drawArrive(); break;
  }
  jp.clear();
  requestAnimationFrame(loop);
}

garageSlideY = H * 0.28;
caption.textContent = CARS[selIdx].msg;
requestAnimationFrame(loop);
