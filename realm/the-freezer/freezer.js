// ── Setup ──────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
let W, H, GROUND_Y;
function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  GROUND_Y = H - 80;
}
resize();
window.addEventListener('resize', () => { resize(); buildLevel(); });

// ── Palette ────────────────────────────────────────────────────
const ICE  = '#54c8ff', NAVY = '#2a3a5c', GOLD = '#c8a000', OFF_W = '#f8f8f0';
const P_BASE = '#eeeef8', P_ACC = '#c97eff', P_ACC2 = '#7effc8';
const TAU = Math.PI * 2;

// ── Helpers ────────────────────────────────────────────────────
function glow(c,b=10){ctx.shadowColor=c;ctx.shadowBlur=b;}
function noGlow(){ctx.shadowColor='transparent';ctx.shadowBlur=0;}
function stroke(color,w=2){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';}
function _limb(x1,y1,x2,y2,c,w=2){stroke(c,w);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function _head(c,y=-40,r=7){ctx.beginPath();ctx.arc(0,y,r,0,TAU);stroke(c,2.5);ctx.stroke();}
function _body(c,y1=-33,y2=-18){_limb(0,y1,0,y2,c,2.5);}

// ── Snow (screen-space) ────────────────────────────────────────
const FLAKES = Array.from({length:180},()=>({
  x:Math.random(),y:Math.random(),r:Math.random()*2+0.4,
  speed:Math.random()*0.0005+0.0001,drift:(Math.random()-0.5)*0.0002,
}));

// ── Frame counter ──────────────────────────────────────────────
let t = 0;

// ── Input ──────────────────────────────────────────────────────
const keys = {};
window.addEventListener('blur',  () => { for(const k in keys) keys[k]=false; });
window.addEventListener('focus', () => { for(const k in keys) keys[k]=false; });

// ══════════════════════════════════════════════════════════════
//  PLAYER DRAW — exact port of Animator.js
//  cx/cy = screen position of feet. facing=1(right)/-1(left)
// ══════════════════════════════════════════════════════════════
function drawFreezerPlayer(cx, cy, state, facing, atkFrame, vy, hasParka) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(facing, 1);
  ctx.shadowColor = P_ACC;
  ctx.shadowBlur  = 5;

  switch(state) {
    case 'idle': {
      const bob = Math.sin(t*0.06)*1.5;
      _head(P_BASE,-40+bob); _body(P_BASE,-33+bob,-18+bob);
      _limb(0,-30+bob, 8,-22+bob,P_BASE); _limb(0,-30+bob,-8,-22+bob,P_BASE);
      _limb(0,-18+bob, 6,0,P_BASE);       _limb(0,-18+bob,-6,0,P_BASE);
      break;
    }
    case 'run': {
      const cycle=t*0.22, bob=Math.sin(cycle*2)*1.5, leg=Math.sin(cycle), arm=-leg;
      ctx.save(); ctx.translate(0,bob); ctx.rotate(0.10);
      _head(P_BASE,-40); _body(P_BASE,-33,-18);
      _limb(0,-30, 10+arm*6,-20+arm*4,P_BASE); _limb(0,-30,-8-arm*6,-20-arm*4,P_BASE);
      _limb(0,-18, leg*10,0,P_BASE);            _limb(0,-18,-leg*10,0,P_BASE);
      ctx.restore();
      break;
    }
    case 'jump': {
      const tuck = Math.min(atkFrame*3,1);
      ctx.shadowColor=P_ACC2; ctx.shadowBlur=8;
      _head(P_ACC,-42); _body(P_BASE,-35,-20);
      _limb(0,-30,-14,-40,P_BASE); _limb(0,-30,14,-40,P_BASE);
      _limb(0,-20, 8+tuck*4,-10+tuck*10,P_BASE);
      _limb(0,-20,-8-tuck*4,-10+tuck*10,P_BASE);
      break;
    }
    case 'fall': {
      const spread = Math.min(Math.abs(vy)/8,1);
      _head(P_BASE,-40); _body(P_BASE,-33,-18);
      _limb(0,-28,-16*spread,-20,P_BASE); _limb(0,-28,16*spread,-20,P_BASE);
      _limb(0,-18,-12*spread,4,P_BASE);  _limb(0,-18,12*spread,4,P_BASE);
      break;
    }
    case 'slide': {
      ctx.save(); ctx.rotate(-0.7); ctx.translate(0,12);
      _head(P_BASE,-24,6); _body(P_BASE,-18,-8);
      _limb(0,-14, 16,-6,P_BASE);  _limb(0,-14,-12,-18,P_BASE);
      _limb(0, -8, 18, 0,P_BASE);  _limb(0, -8,-10,-14,P_BASE);
      ctx.restore();
      break;
    }
    case 'punch': {
      const ext = Math.sin(atkFrame*Math.PI);
      ctx.shadowColor=P_ACC; ctx.shadowBlur=8;
      _head(P_BASE,-40); _body(P_BASE,-33,-18);
      _limb(0,-28,14+ext*16,-26,P_ACC,2.8); _limb(0,-28,-10,-22,P_BASE);
      _limb(0,-18,6,0,P_BASE); _limb(0,-18,-6,0,P_BASE);
      if(ext>0.3){ctx.beginPath();ctx.arc(14+ext*16,-26,4,0,TAU);ctx.fillStyle=P_ACC;ctx.fill();}
      break;
    }
    case 'kick': {
      const ext = Math.sin(atkFrame*Math.PI);
      ctx.shadowColor=P_ACC2; ctx.shadowBlur=8;
      _head(P_BASE,-40); _body(P_BASE,-33,-18);
      _limb(0,-28,-12,-22,P_BASE); _limb(0,-28,10,-18,P_BASE);
      _limb(0,-18,-6,0,P_ACC2);
      _limb(0,-18,10+ext*22,-8-ext*16,P_ACC2,2.8);
      if(ext>0.4){ctx.beginPath();ctx.arc(10+ext*22,-8-ext*16,4,0,TAU);ctx.fillStyle=P_ACC2;ctx.fill();}
      break;
    }
    case 'roundhouse': {
      const spin = atkFrame*Math.PI*1.5;
      ctx.save(); ctx.rotate(spin*0.6);
      ctx.shadowColor=P_ACC; ctx.shadowBlur=12;
      _head(P_ACC,-40); _body(P_BASE,-33,-18);
      _limb(0,-28,Math.cos(spin)*18,-28+Math.sin(spin)*8,P_BASE);
      _limb(0,-28,-Math.cos(spin)*18,-28-Math.sin(spin)*8,P_BASE);
      const kx=Math.cos(spin-0.5)*28, ky=-18+Math.sin(spin-0.5)*16;
      _limb(0,-18,kx,ky,P_ACC,3); _limb(0,-18,-6,0,P_BASE);
      ctx.beginPath();ctx.arc(kx,ky,5,0,TAU);ctx.fillStyle=P_ACC;ctx.fill();
      ctx.restore();
      break;
    }
    case 'shovel': {
      // shovel sweep — wide arc with tool
      const ext = Math.sin(atkFrame*Math.PI);
      ctx.shadowColor=P_ACC2; ctx.shadowBlur=8;
      _head(P_BASE,-40); _body(P_BASE,-33,-18);
      _limb(0,-28,-10,-22,P_BASE);
      _limb(0,-18,-6,0,P_BASE); _limb(0,-18,6,0,P_BASE);
      // shovel arm
      ctx.save(); ctx.translate(12,-28); ctx.rotate(-0.9+ext*1.8);
      stroke('#c8a878',5); ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(0,30); ctx.lineTo(0,-20); ctx.stroke();
      ctx.fillStyle='#cccccc'; ctx.strokeStyle='#999'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(-14,-20); ctx.lineTo(-16,-5); ctx.lineTo(16,-5); ctx.lineTo(14,-20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      break;
    }
    case 'dash': {
      ctx.save(); ctx.rotate(-0.25);
      ctx.shadowColor=P_ACC; ctx.shadowBlur=10;
      // motion blur ghost trails
      for(let i=1;i<=4;i++){
        ctx.globalAlpha=0.13*(1-i/4);
        ctx.save(); ctx.translate(-i*7,0);
        _head(P_ACC,-38); _body(P_ACC,-31,-18);
        ctx.restore();
      }
      ctx.globalAlpha=1;
      _head(P_ACC,-38); _body(P_BASE,-31,-18);
      _limb(0,-28,-16,-22,P_BASE); _limb(0,-28,12,-18,P_BASE);
      _limb(0,-18,10,0,P_BASE);   _limb(0,-18,-14,-6,P_BASE);
      ctx.restore();
      break;
    }
    case 'dead': {
      ctx.save(); ctx.rotate(Math.PI*0.5); ctx.globalAlpha=0.6;
      _head(P_BASE,-10); _body(P_BASE,-4,12);
      _limb(0,0,10,10,P_BASE); _limb(0,0,-10,10,P_BASE);
      _limb(0,12,12,20,P_BASE); _limb(0,12,-6,20,P_BASE);
      ctx.restore();
      break;
    }
  }

  // parka overlay (fitted to player proportions)
  if(hasParka && state!=='dead') {
    const bob = (state==='idle')?Math.sin(t*0.06)*1.5:0;
    ctx.shadowColor='#ff8844'; ctx.shadowBlur=4;
    ctx.fillStyle='rgba(232,104,32,0.78)'; ctx.strokeStyle='#c04c00'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(-10,-38+bob,20,20,[4,4,3,3]); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-8,-52+bob,16,16,[7,7,0,0]); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(240,240,220,0.4)'; ctx.beginPath(); ctx.roundRect(-8,-52+bob,16,6,[7]); ctx.fill();
  }

  ctx.shadowBlur=0; ctx.restore();
}

// Shovel icon held (when not attacking, just carried)
function drawShovelCarried(cx, cy, facing) {
  ctx.save(); ctx.translate(cx,cy); ctx.scale(facing,1);
  ctx.translate(18,-28); ctx.rotate(-0.8);
  stroke('#c8a878',4); ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(0,30); ctx.lineTo(0,-20); ctx.stroke();
  ctx.fillStyle='#cccccc'; ctx.strokeStyle='#999'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(-12,-20); ctx.lineTo(-14,-5); ctx.lineTo(14,-5); ctx.lineTo(12,-20); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  ENEMY DRAWS
// ══════════════════════════════════════════════════════════════
function drawMidnight(cx, cy, state) {
  const breathe=Math.sin(t*0.025)*1.5,tail=Math.sin(t*0.04)*20,bob=Math.sin(t*0.03)*2.5;
  const moo=state==='moo', give=state==='give';
  ctx.save(); ctx.translate(cx,cy);
  ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0,0,42,5,0,0,TAU); ctx.fill();
  ctx.strokeStyle='#c0c0b8'; ctx.lineWidth=3.5; ctx.lineCap='round';
  [[-22,0],[-8,0],[8,0],[22,0]].forEach(([lx],i)=>{
    const b=i%2===0?bob:-bob;
    ctx.beginPath(); ctx.moveTo(lx,-6); ctx.lineTo(lx,18+b); ctx.stroke();
    ctx.fillStyle='#888'; ctx.beginPath(); ctx.ellipse(lx,19+b,5,3,0,0,TAU); ctx.fill();
  });
  ctx.fillStyle='#f0c8c8'; ctx.beginPath(); ctx.ellipse(5,-9+breathe,12,7,0,0,TAU); ctx.fill();
  ctx.fillStyle=OFF_W; ctx.strokeStyle='#c8c8c0'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.ellipse(5,-26+breathe,44,28,0,0,TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#1a1a18';
  ctx.beginPath(); ctx.ellipse(-4,-30+breathe,13,8,0.5,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(26,-20+breathe,9,6,-0.3,0,TAU); ctx.fill();
  ctx.fillStyle=OFF_W; ctx.strokeStyle='#c8c8c0'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.ellipse(-40,-32+breathe,21,16,-0.15,0,TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#f0e8e0';
  ctx.beginPath(); ctx.ellipse(-46,-43+breathe,5,9,-0.5,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-34,-45+breathe,5,9,0.4,0,TAU); ctx.fill();
  ctx.fillStyle='#e8bbbb';
  ctx.beginPath(); ctx.ellipse(-46,-43+breathe,2.5,5,-0.5,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-34,-45+breathe,2.5,5,0.4,0,TAU); ctx.fill();
  ctx.strokeStyle='#c8a060'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(-47,-46+breathe); ctx.quadraticCurveTo(-53,-56,-48,-61); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-33,-48+breathe); ctx.quadraticCurveTo(-30,-58,-25,-60); ctx.stroke();
  ctx.fillStyle='#1a1a18'; ctx.beginPath(); ctx.arc(-44,-33+breathe,3,0,TAU); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-42,-35+breathe,1,0,TAU); ctx.fill();
  ctx.fillStyle='#e0aaaa'; ctx.beginPath(); ctx.arc(-54,-28+breathe,3,0,TAU); ctx.fill();
  if(moo){ctx.fillStyle='#881100'; ctx.beginPath(); ctx.ellipse(-52,-24+breathe,4,4,0,0,TAU); ctx.fill();}
  ctx.strokeStyle='#f0f0e8'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(49,-24+breathe); ctx.quadraticCurveTo(62,-18+breathe+tail*0.2,60,-40+breathe+tail); ctx.stroke();
  ctx.fillStyle='#e0e0d8'; ctx.beginPath(); ctx.arc(60,-40+breathe+tail,6,0,TAU); ctx.fill();
  if(give){ctx.save(); ctx.translate(-60,-28+breathe); ctx.rotate(0.4); glow('#88ff88',8); ctx.fillStyle='#c8a060'; ctx.fillRect(-9,-2,18,4); ctx.fillStyle='#55aa33'; ctx.beginPath(); ctx.arc(-11,0,5,0,TAU); ctx.fill(); noGlow(); ctx.restore();}
  const bf=t%100; if(bf<28){const a=bf<14?bf/14*0.38:(28-bf)/14*0.38; ctx.fillStyle=`rgba(200,225,255,${a})`; ctx.beginPath(); ctx.ellipse(-62,-26+breathe,10+bf*0.35,5,-0.2,0,TAU); ctx.fill();}
  ctx.restore();
}

function drawMemo(cx, cy, state) {
  const wobble=Math.sin(t*0.07)*5, tilt=Math.sin(t*0.05)*0.14, atk=state==='attack', spin=atk?t*0.15:tilt;
  ctx.save(); ctx.translate(cx,cy+wobble); ctx.rotate(spin);
  glow('#ff4466',12);
  ctx.fillStyle='#eeeedc'; ctx.strokeStyle='#bbbbaa'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(-20,-15,40,30,2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#ddddcc'; ctx.beginPath(); ctx.moveTo(-20,-15); ctx.lineTo(0,0); ctx.lineTo(20,-15); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#ff2200'; glow('#ff2200',6); ctx.beginPath(); ctx.arc(0,0,4,0,TAU); ctx.fill(); noGlow();
  ctx.fillStyle='#ff2200';
  ctx.beginPath(); ctx.arc(-7,10,4,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(7,10,4,0,TAU); ctx.fill();
  ctx.strokeStyle='#cc1100'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(-11,5); ctx.lineTo(-5,8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(11,5);  ctx.lineTo(5,8);  ctx.stroke();
  [1,2,3].forEach(i=>{const px=-20-i*10-Math.sin(t*0.04+i)*3,py=-i*4+Math.cos(t*0.06+i)*3,pa=0.5-i*0.12; ctx.fillStyle=`rgba(220,220,200,${pa})`; ctx.save(); ctx.translate(px,py); ctx.rotate(-0.2-i*0.1); ctx.fillRect(-8,-5,16,10); ctx.restore();});
  noGlow(); ctx.restore();
}

function drawColdShoulder(cx, cy, state) {
  const walk=state==='walk', lSin=walk?Math.sin(t*0.03)*12:0, aSwing=walk?Math.sin(t*0.03)*8:0;
  ctx.save(); ctx.translate(cx,cy);
  glow(ICE,14); ctx.fillStyle='rgba(84,200,255,0.05)'; ctx.beginPath(); ctx.ellipse(0,-22,28,38,0,0,TAU); ctx.fill(); noGlow();
  ctx.fillStyle='rgba(84,200,255,0.1)'; ctx.beginPath(); ctx.ellipse(0,0,14,4,0,0,TAU); ctx.fill();
  _limb(0,-10,-8,0+lSin*0.4,'#445566',3.5); _limb(0,-10,8,0-lSin*0.4,'#445566',3.5);
  ctx.fillStyle='#445566'; ctx.beginPath(); ctx.roundRect(-12,-38,24,28,2); ctx.fill();
  ctx.fillStyle='rgba(180,220,255,0.22)'; ctx.beginPath(); ctx.roundRect(-12,-38,24,28,2); ctx.fill();
  ctx.fillStyle='#f0f0e8'; ctx.fillRect(-3,-38,6,8);
  ctx.fillStyle='#336655'; ctx.save(); ctx.translate(0,-34); ctx.rotate(0.12);
  ctx.beginPath(); ctx.moveTo(-2,0); ctx.lineTo(2,0); ctx.lineTo(1.5,16); ctx.lineTo(-1.5,16); ctx.closePath(); ctx.fill(); ctx.restore();
  _limb(-12,-32,-22,-18+aSwing,'#445566',3.5); _limb(12,-32,22,-18-aSwing,'#445566',3.5);
  _limb(0,-38,0,-45,'#c0c8d0',3.5);
  ctx.fillStyle='#c0c8d0'; ctx.strokeStyle='#99aabb'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(0,-52,8,0,TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#99ddff'; ctx.beginPath(); ctx.arc(-3,-52,2,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(3,-52,2,0,TAU); ctx.fill();
  const bf=t%70; if(bf<22){const a=bf<11?bf/11*0.35:(22-bf)/11*0.35; ctx.fillStyle=`rgba(200,230,255,${a})`; ctx.beginPath(); ctx.ellipse(12,-50,10+bf*0.4,5,0.2,0,TAU); ctx.fill();}
  ctx.restore();
}

function drawDirector(cx, cy, state) {
  const sc=0.65, breathe=Math.sin(t*0.025)*1.5, sway=Math.sin(t*0.018)*2;
  const p2=state==='phase2'||state==='attack2', atk=state==='attack'||state==='attack2';
  const watchLift=(t%200>160)?Math.sin((t%200-160)/40*Math.PI)*14:0;
  ctx.save(); ctx.translate(cx+sway*sc,cy); ctx.scale(sc,sc);
  ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0,0,32,8,0,0,TAU); ctx.fill();
  const lSin=atk?Math.sin(t*0.12)*8:0;
  _limb(0,-8,-14,24+lSin,'#1a2a3a',6); _limb(0,-8,14,24-lSin,'#1a2a3a',6);
  ctx.fillStyle='#111'; ctx.beginPath(); ctx.ellipse(-14,27+lSin,11,4,0.1,0,TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(14,27-lSin,11,4,-0.1,0,TAU); ctx.fill();
  ctx.fillStyle=p2?'#3a2a4c':NAVY; ctx.beginPath(); ctx.roundRect(-19,-52+breathe,38,44,3); ctx.fill();
  ctx.fillStyle=p2?'#4a3860':'#344466';
  ctx.beginPath(); ctx.moveTo(-19,-52+breathe); ctx.lineTo(0,-36+breathe); ctx.lineTo(-12,-52+breathe); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(19,-52+breathe);  ctx.lineTo(0,-36+breathe); ctx.lineTo(12,-52+breathe);  ctx.closePath(); ctx.fill();
  ctx.fillStyle='#f0f0f8'; ctx.beginPath(); ctx.moveTo(-5,-52+breathe); ctx.lineTo(0,-36+breathe); ctx.lineTo(5,-52+breathe); ctx.closePath(); ctx.fill();
  const tieTilt=p2?Math.sin(t*0.06)*0.35:0;
  ctx.save(); ctx.translate(0,-44+breathe); ctx.rotate(tieTilt); ctx.fillStyle='#bb1111';
  ctx.beginPath(); ctx.moveTo(-3,0); ctx.lineTo(3,0); ctx.lineTo(2.5,30); ctx.lineTo(-2.5,30); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#991111'; ctx.beginPath(); ctx.moveTo(-4,0); ctx.lineTo(4,0); ctx.lineTo(3,5); ctx.lineTo(-3,5); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.fillStyle='#f0f0f8'; ctx.fillRect(-17,-50+breathe,8,5);
  const caseSwing=Math.sin(t*0.03)*8;
  _limb(-20,-44+breathe,-34,-20+caseSwing,NAVY,6);
  const bcy=-20+caseSwing;
  glow(GOLD,atk?22:8); ctx.fillStyle=GOLD; ctx.strokeStyle='#a08000'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(-54,bcy-12,30,22,3); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='#a08000'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(-39,bcy-12,8,Math.PI,0); ctx.stroke();
  ctx.fillStyle='#888800'; ctx.fillRect(-48,bcy+2,8,5); ctx.fillRect(-36,bcy+2,8,5); noGlow();
  _limb(20,-44+breathe,32,-22-watchLift,NAVY,6);
  if(watchLift>5){ctx.fillStyle='#888'; ctx.strokeStyle='#666'; ctx.lineWidth=1; ctx.beginPath(); ctx.rect(28,-24-watchLift,9,6); ctx.fill(); ctx.stroke();}
  _limb(0,-52+breathe,0,-62,'#d8c8b8',5);
  ctx.fillStyle='#e0d0c0'; ctx.strokeStyle='#c0b0a0'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(0,-74,15,0,TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='#111'; ctx.lineWidth=2.5;
  if(!p2){ctx.beginPath(); ctx.moveTo(-12,-84); ctx.quadraticCurveTo(0,-90,13,-83); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-12,-81); ctx.quadraticCurveTo(2,-88,13,-80); ctx.stroke();}
  else{for(let i=0;i<7;i++){const hx=-13+i*4.5,rnd=Math.sin(t*0.05+i)*4; ctx.beginPath(); ctx.moveTo(hx,-84); ctx.lineTo(hx+rnd,-96-Math.abs(Math.sin(i*1.3))*6); ctx.stroke();}}
  ctx.strokeStyle='#555'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.rect(-10,-77,9,6); ctx.stroke(); ctx.beginPath(); ctx.rect(1,-77,9,6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-1,-74); ctx.lineTo(1,-74); ctx.stroke();
  ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(-5,-74,2,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(5,-74,2,0,TAU); ctx.fill();
  ctx.strokeStyle='#9a7060'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(0,-68,5,0.2,Math.PI-0.2); ctx.stroke();
  if(atk){glow('#ff4466',14); for(let i=-2;i<=2;i++){ctx.save(); ctx.translate(-39,bcy); ctx.rotate(i*0.3-0.8+Math.sin(t*0.1)*0.15); ctx.fillStyle='rgba(240,240,220,0.88)'; ctx.strokeStyle='#aaa'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.rect(0,-8,28,16); ctx.fill(); ctx.stroke(); for(let g=1;g<4;g++){ctx.beginPath(); ctx.moveTo(g*7,-8); ctx.lineTo(g*7,8); ctx.stroke();} ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(28,0); ctx.stroke(); ctx.restore();} noGlow();}
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  ITEM / PROP DRAWS
// ══════════════════════════════════════════════════════════════
function drawDunkin(cx, cy) {
  ctx.save(); ctx.translate(cx,cy); glow('#7effc8',16);
  ctx.fillStyle='#f5f5f5'; ctx.strokeStyle='#ddd'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-13,-35); ctx.lineTo(-11,20); ctx.lineTo(11,20); ctx.lineTo(13,-35); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#e91e8c'; ctx.fillRect(-13,-16,26,13);
  ctx.fillStyle='#ff6e00'; ctx.fillRect(-13,-3,26,11);
  ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.font='bold 8px monospace'; ctx.textAlign='center'; ctx.fillText("DD",0,-8);
  ctx.strokeStyle='#6699ff'; ctx.lineWidth=3; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(7,-35); ctx.lineTo(10,-58); ctx.stroke();
  ctx.fillStyle='rgba(120,190,255,0.35)';
  [[-9,4],[-10,-8],[-10,12]].forEach(([x,y])=>{ctx.beginPath(); ctx.arc(x,y,1.8,0,TAU); ctx.fill();});
  ctx.fillStyle='#7effc8'; ctx.font='bold 14px monospace'; ctx.fillText('+',0,36);
  noGlow(); ctx.restore();
}

function drawBluntItem(cx, cy) {
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(-0.4); glow('#88ff88',14);
  ctx.fillStyle='#c8a878'; ctx.strokeStyle='#a08858'; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(-22,-4,40,8,[4]); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#b09060'; ctx.beginPath(); ctx.ellipse(-22,0,5,4,0,0,TAU); ctx.fill();
  ctx.fillStyle='#44aa22'; glow('#66cc44',10); ctx.beginPath(); ctx.arc(20,0,6,0,TAU); ctx.fill(); noGlow(); ctx.restore();
}

function drawShovelItem(cx, cy) {
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.sin(t*0.04)*0.06);
  ctx.strokeStyle='#c8a878'; ctx.lineWidth=5; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(0,40); ctx.lineTo(0,-28); ctx.stroke();
  ctx.fillStyle='#cccccc'; ctx.strokeStyle='#999'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-20,-28); ctx.lineTo(-22,-8); ctx.lineTo(22,-8); ctx.lineTo(20,-28); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='#a08060'; ctx.lineWidth=7; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(-8,40); ctx.lineTo(8,40); ctx.stroke();
  ctx.restore();
}

function drawParkaItem(cx, cy) {
  ctx.save(); ctx.translate(cx,cy); glow('#ff8844',14);
  ctx.fillStyle='#e86820'; ctx.strokeStyle='#c04c00'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(-22,-25,44,38,[8,8,4,4]); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-16,-46,32,24,[12,12,0,0]); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(240,240,220,0.55)'; ctx.beginPath(); ctx.roundRect(-16,-46,32,8,[12]); ctx.fill();
  ctx.fillStyle='#e86820'; ctx.strokeStyle='#c04c00';
  ctx.beginPath(); ctx.roundRect(-40,-22,20,14,[6]); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(20,-22,20,14,[6]); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='#ff9933'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,-25); ctx.lineTo(0,12); ctx.stroke();
  noGlow(); ctx.restore();
}

function drawSpreadsheet(cx, cy) {
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*0.12);
  glow('#ff4466',6); ctx.fillStyle='#f0f0dc'; ctx.strokeStyle='#bbbbaa'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.rect(-22,-15,44,30); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=0.8;
  for(let c=1;c<4;c++){ctx.beginPath(); ctx.moveTo(-22+c*11,-15); ctx.lineTo(-22+c*11,15); ctx.stroke();}
  for(let r=1;r<3;r++){ctx.beginPath(); ctx.moveTo(-22,-15+r*10); ctx.lineTo(22,-15+r*10); ctx.stroke();}
  ctx.fillStyle='rgba(180,30,30,0.3)'; ctx.fillRect(-22,-15,44,10);
  noGlow(); ctx.restore();
}

function drawIcePlatform(cx, cy, w) {
  const hw=w/2;
  ctx.save(); ctx.translate(cx,cy);
  ctx.fillStyle='rgba(20,70,140,0.55)'; ctx.strokeStyle='rgba(84,200,255,0.55)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(-hw,-10,w,20,2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(180,230,255,0.12)'; ctx.fillRect(-hw+4,-8,w*0.35,7);
  ctx.strokeStyle='rgba(200,230,255,0.3)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(-hw*0.2,-10); ctx.lineTo(0,2); ctx.lineTo(hw*0.25,-10); ctx.stroke();
  glow(ICE,6); ctx.strokeStyle=ICE; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-hw,-10); ctx.lineTo(hw,-10); ctx.stroke(); noGlow();
  [-hw*0.7,-hw*0.35,0,hw*0.35,hw*0.7].forEach(ix=>{
    const len=10+Math.sin(ix*0.3)*4;
    ctx.fillStyle='rgba(140,210,255,0.5)'; ctx.strokeStyle='rgba(180,230,255,0.7)'; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(ix-3,10); ctx.lineTo(ix,10+len); ctx.lineTo(ix+3,10); ctx.closePath(); ctx.fill(); ctx.stroke();
  });
  ctx.restore();
}

function drawFrozenServer(cx, cy) {
  const ledOn=Math.floor(t/30)%2===0;
  ctx.save(); ctx.translate(cx,cy);
  ctx.fillStyle='rgba(20,60,120,0.5)'; ctx.strokeStyle='rgba(84,200,255,0.4)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(-32,-48,64,90,[4]); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(20,30,40,0.85)'; ctx.beginPath(); ctx.rect(-24,-42,48,78); ctx.fill();
  for(let u=0;u<5;u++){ctx.strokeStyle='rgba(60,80,100,0.8)'; ctx.lineWidth=1; ctx.beginPath(); ctx.rect(-22,-38+u*14,44,12); ctx.stroke(); ctx.fillStyle='rgba(40,50,60,0.8)'; ctx.fillRect(-20,-36+u*14,26,8);}
  glow(ledOn?'#44ff44':'transparent',ledOn?10:0); ctx.fillStyle=ledOn?'#44ff44':'#226622'; ctx.beginPath(); ctx.arc(-20,-28,3,0,TAU); ctx.fill(); noGlow();
  ctx.restore();
}

function drawMeltaway(cx, cy) {
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(0.08);
  ctx.fillStyle='rgba(25,55,110,0.45)'; ctx.strokeStyle='rgba(84,200,255,0.3)'; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.roundRect(-34,-18,68,36,[3]); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(88,45,15,0.85)'; ctx.beginPath(); ctx.roundRect(-28,-13,56,28,[2]); ctx.fill();
  ctx.fillStyle='rgba(140,75,30,0.5)'; ctx.fillRect(-26,-11,28,9);
  ctx.fillStyle='rgba(195,170,145,0.28)';
  [[-12,-4],[6,1],[-18,5],[14,-2],[-4,6]].forEach(([x,y])=>{ctx.beginPath(); ctx.arc(x,y,2.5,0,TAU); ctx.fill();});
  ctx.fillStyle='rgba(215,195,170,0.9)'; ctx.font='bold 7px monospace'; ctx.textAlign='center';
  ctx.fillText('EPIC culinary',0,-1);
  ctx.fillStyle='rgba(190,170,150,0.55)'; ctx.font='6px monospace'; ctx.fillText('meltaway · 3rd shift',0,10);
  ctx.restore();
}

function drawEmployeeBadge(cx, cy) {
  ctx.save(); ctx.translate(cx,cy);
  ctx.fillStyle='rgba(15,50,110,0.55)'; ctx.strokeStyle='rgba(84,200,255,0.4)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(-28,-55,56,80,[4]); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='rgba(200,80,80,0.45)'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(0,-55); ctx.quadraticCurveTo(-12,-68,0,-72); ctx.quadraticCurveTo(12,-68,0,-55); ctx.stroke();
  ctx.fillStyle='rgba(240,240,248,0.7)'; ctx.strokeStyle='rgba(100,140,200,0.5)'; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(-22,-48,44,60,[3]); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(80,80,160,0.5)'; ctx.fillRect(-22,-48,44,16);
  ctx.fillStyle='rgba(200,210,240,0.9)'; ctx.font='bold 7px monospace'; ctx.textAlign='center'; ctx.fillText('CLINT TEECE',0,-36);
  ctx.fillStyle='rgba(60,80,120,0.7)'; ctx.font='6px monospace'; ctx.fillText('INFRASTRUCTURE',0,-10); ctx.fillText('STARTED: MAR 2019',0,0);
  ctx.fillStyle='rgba(140,200,140,0.6)'; ctx.font='italic 5.5px monospace'; ctx.fillText('left before the ice',0,11);
  ctx.restore();
}

function drawBackupFile(cx, cy) {
  const pulse=0.5+Math.sin(t*0.04)*0.4;
  ctx.save(); ctx.translate(cx,cy);
  ctx.fillStyle='rgba(15,50,110,0.5)'; ctx.strokeStyle='rgba(84,200,255,0.4)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(-32,-42,64,70,[4]); ctx.fill(); ctx.stroke();
  glow(`rgba(255,180,60,${pulse*0.6})`,20); ctx.fillStyle=`rgba(255,180,60,${pulse*0.12})`; ctx.beginPath(); ctx.roundRect(-24,-34,48,54,[3]); ctx.fill(); noGlow();
  ctx.fillStyle=`rgba(255,200,100,${pulse*0.7})`; ctx.strokeStyle=`rgba(255,160,60,${pulse*0.8})`; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(-14,-30); ctx.lineTo(6,-30); ctx.lineTo(14,-22); ctx.lineTo(14,14); ctx.lineTo(-14,14); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle=`rgba(255,220,140,${pulse*0.9})`; ctx.font='5.5px monospace'; ctx.textAlign='center'; ctx.fillText('erik_backup',0,22); ctx.fillText('_2022.sav',0,30);
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  LEVEL DATA  (6 sections, ~8500px total)
// ══════════════════════════════════════════════════════════════
let platforms=[], enemies=[], items=[], props=[], projectiles=[], floaters=[];

function buildLevel() {
  const G = GROUND_Y;

  platforms = [
    // Infinite ground
    {x:-300, y:G, w:9200, h:100, ice:false},

    // ── SECTION 1: Azure Entry (0–900) ────────────────────────
    {x:120,  y:G-140, w:170, h:18, ice:true},   // server platform
    {x:420,  y:G-220, w:130, h:18, ice:true},
    {x:640,  y:G-150, w:200, h:18, ice:true},   // near Midnight

    // ── SECTION 2: The Corridor (900–2400) ────────────────────
    {x:960,  y:G-170, w:140, h:18, ice:true},   // shovel here
    {x:1180, y:G-270, w:110, h:18, ice:true},
    {x:1420, y:G-140, w:160, h:18, ice:true},
    {x:1700, y:G-200, w:130, h:18, ice:true},
    {x:1960, y:G-280, w:110, h:18, ice:true},
    {x:2180, y:G-155, w:160, h:18, ice:true},   // parka here

    // ── SECTION 3: Open Floor (2400–4400) ─────────────────────
    {x:2440, y:G-190, w:140, h:18, ice:true},
    {x:2700, y:G-300, w:120, h:18, ice:true},
    {x:2960, y:G-170, w:155, h:18, ice:true},
    {x:3260, y:G-250, w:120, h:18, ice:true},
    {x:3520, y:G-140, w:170, h:18, ice:true},
    {x:3820, y:G-210, w:130, h:18, ice:true},
    {x:4100, y:G-160, w:140, h:18, ice:true},

    // ── SECTION 4: Server Room (4400–6000) ────────────────────
    {x:4460, y:G-180, w:130, h:18, ice:true},
    {x:4720, y:G-270, w:110, h:18, ice:true},
    {x:5000, y:G-150, w:160, h:18, ice:true},   // dunkin here
    {x:5280, y:G-230, w:130, h:18, ice:true},
    {x:5560, y:G-300, w:120, h:18, ice:true},
    {x:5820, y:G-160, w:150, h:18, ice:true},

    // ── SECTION 5: Executive Wing (6000–7200) ─────────────────
    {x:6060, y:G-200, w:140, h:18, ice:true},
    {x:6320, y:G-310, w:110, h:18, ice:true},
    {x:6580, y:G-170, w:160, h:18, ice:true},
    {x:6840, y:G-240, w:130, h:18, ice:true},

    // ── SECTION 6: Boss Arena (7200–8500) ─────────────────────
    {x:7260, y:G-160, w:120, h:18, ice:true},   // dodge platforms
    {x:7580, y:G-200, w:100, h:18, ice:true},
    {x:7880, y:G-160, w:120, h:18, ice:true},
  ];

  enemies = [
    // Cold Shoulders
    {type:'cold', x:820,  y:G, spawnX:820,  dir:1,  hp:55, maxHp:55, iframes:0, state:'walk', patrolR:120},
    {type:'cold', x:1300, y:G, spawnX:1300, dir:-1, hp:55, maxHp:55, iframes:0, state:'walk', patrolR:140},
    {type:'cold', x:1800, y:G, spawnX:1800, dir:1,  hp:55, maxHp:55, iframes:0, state:'walk', patrolR:130},
    {type:'cold', x:2600, y:G, spawnX:2600, dir:-1, hp:55, maxHp:55, iframes:0, state:'walk', patrolR:150},
    {type:'cold', x:3100, y:G, spawnX:3100, dir:1,  hp:55, maxHp:55, iframes:0, state:'walk', patrolR:130},
    {type:'cold', x:3700, y:G, spawnX:3700, dir:-1, hp:55, maxHp:55, iframes:0, state:'walk', patrolR:120},
    {type:'cold', x:4500, y:G, spawnX:4500, dir:1,  hp:75, maxHp:75, iframes:0, state:'walk', patrolR:140},
    {type:'cold', x:5100, y:G, spawnX:5100, dir:-1, hp:75, maxHp:75, iframes:0, state:'walk', patrolR:160},
    {type:'cold', x:5700, y:G, spawnX:5700, dir:1,  hp:75, maxHp:75, iframes:0, state:'walk', patrolR:130},
    {type:'cold', x:6200, y:G, spawnX:6200, dir:-1, hp:75, maxHp:75, iframes:0, state:'walk', patrolR:140},
    {type:'cold', x:6700, y:G, spawnX:6700, dir:1,  hp:75, maxHp:75, iframes:0, state:'walk', patrolR:120},
    // Memos
    {type:'memo', x:1450, y:G-200, baseY:G-200, spawnX:1450, dir:1,  hp:35, maxHp:35, iframes:0, state:'idle', chargeTimer:140},
    {type:'memo', x:2260, y:G-240, baseY:G-240, spawnX:2260, dir:-1, hp:35, maxHp:35, iframes:0, state:'idle', chargeTimer:100},
    {type:'memo', x:2900, y:G-200, baseY:G-200, spawnX:2900, dir:1,  hp:35, maxHp:35, iframes:0, state:'idle', chargeTimer:160},
    {type:'memo', x:3500, y:G-220, baseY:G-220, spawnX:3500, dir:-1, hp:35, maxHp:35, iframes:0, state:'idle', chargeTimer:120},
    {type:'memo', x:4200, y:G-180, baseY:G-180, spawnX:4200, dir:1,  hp:35, maxHp:35, iframes:0, state:'idle', chargeTimer:130},
    {type:'memo', x:5400, y:G-250, baseY:G-250, spawnX:5400, dir:-1, hp:35, maxHp:35, iframes:0, state:'idle', chargeTimer:110},
    {type:'memo', x:6100, y:G-210, baseY:G-210, spawnX:6100, dir:1,  hp:35, maxHp:35, iframes:0, state:'idle', chargeTimer:150},
    {type:'memo', x:6600, y:G-230, baseY:G-230, spawnX:6600, dir:-1, hp:35, maxHp:35, iframes:0, state:'idle', chargeTimer:90},
  ];

  items = [
    {type:'dunkin',  x:360,  y:G-30,        collected:false},
    {type:'shovel',  x:1060, y:G-170-42,    collected:false},
    {type:'parka',   x:580,  y:G-30,         collected:false},
    {type:'dunkin',  x:3650, y:G-30,        collected:false},
    {type:'dunkin',  x:5100, y:G-150-42,    collected:false},
    {type:'blunt',   x:0,    y:0,            collected:false, visible:false},
  ];

  props = [
    {type:'server',   x:205,  y:G-140-50},
    {type:'server',   x:4620, y:G-180-50},
    {type:'server',   x:5200, y:G-30},
    {type:'badge',    x:430,  y:G-30},
    {type:'meltaway', x:1640, y:G-22},
    {type:'meltaway', x:5840, y:G-22},
    {type:'backup',   x:6480, y:G-30},
  ];
}

// ══════════════════════════════════════════════════════════════
//  GAME STATE
// ══════════════════════════════════════════════════════════════
const player = {
  x:100, y:0,
  vx:0, vy:0,
  onGround:false, onIce:false,
  facing:1,
  hp:100, maxHp:100,
  coldMeter:100,
  weapon:null,
  hasParka:false,
  buffTimer:0,
  iframes:0,
  slideTimer:0,
  jumpTimer:0,
  dashTimer:0, dashCooldown:0, dashVx:0,
  // Attack state (matches Animator.js STATES)
  atkType:null,   // null | 'punch' | 'kick' | 'roundhouse' | 'shovel'
  atkTimer:0,
  atkDuration:1,
  // Combo
  combo:0,
  comboTimer:0,
  dead:false,
};
const COMBO_LABELS = ['','','','','NICE','SMOOTH','SICK','INSANE','LEGENDARY','GODLIKE'];

const midnight = { x:220, y:0, state:'idle', talked:false };

const boss = {
  x:8100, y:0,
  hp:350, maxHp:350,
  phase:1, dir:-1,
  state:'idle',
  attackTimer:200,
  walkSpeed:1.0,
  triggered:false, demonTaunted:false, dead:false,
  iframes:0, deathTimer:0,
};

const camera = { x:0 };

const milestones = { intro:false, midnight:false, preBoss:false, phase2:false, zone1:false, zone2:false, zone3:false, zone4:false };

// ── Overlay state ──────────────────────────────────────────────
let gamePhase = 'intro';
let showIntroPrompt = false;
const introTimeouts = [];
let demonOverlay = null;
let captionTimeout = null;

function setCaption(text, dur=3200) {
  const el = document.getElementById('caption'); if(!el) return;
  el.style.opacity='1'; el.textContent=text;
  if(captionTimeout) clearTimeout(captionTimeout);
  captionTimeout = setTimeout(()=>{ el.style.opacity='0'; }, dur);
}

// ══════════════════════════════════════════════════════════════
//  INPUT HANDLING
// ══════════════════════════════════════════════════════════════
window.addEventListener('keydown', e => {
  keys[e.code]=true;
  if(e.code==='Space') e.preventDefault();

  // demon overlay — any key advances
  if(demonOverlay?.active) {
    if(['Space','Enter','KeyZ','KeyX','KeyC','KeyF'].includes(e.code)) {
      demonOverlay.idx++;
      if(demonOverlay.idx>=demonOverlay.lines.length) { demonOverlay.active=false; demonOverlay=null; gamePhase='playing'; }
    }
    return;
  }

  // Intro: Space/Enter skips to the prompt; F accepts the gift
  if(gamePhase==='intro') {
    if(['Space','Enter'].includes(e.code) && !showIntroPrompt) {
      introTimeouts.forEach(id=>clearTimeout(id)); introTimeouts.length=0;
      midnight.state='idle'; showIntroPrompt=true;
      setCaption('[ F ] — she has something for you', 99999);
      return;
    }
    if(e.code==='KeyF' && showIntroPrompt) {
      midnight.talked=true; midnight.state='give'; showIntroPrompt=false;
      gamePhase='playing'; player.buffTimer=900;
      setCaption("midnight's gift.  speed + damage.  15 seconds.",2500);
      setTimeout(()=>{midnight.state='idle';},2200);
      return;
    }
    return; // block all other input during intro
  }

  // F — interact
  if(e.code==='KeyF' && !player.dead) {
    const badge=props.find(p=>p.type==='badge');
    if(badge&&Math.abs(player.x-badge.x)<80){
      setCaption('CLINT TEECE\nINFRASTRUCTURE\nstarted: mar 2019\n\nleft before the ice could get to them',4500);
      return;
    }
    const backup=props.find(p=>p.type==='backup');
    if(backup&&Math.abs(player.x-backup.x)<80){
      setCaption('erik_backup_2022.sav\n\nyou stare at it for a long time.\nyou don\'t open it. not yet.',4500);
      return;
    }
    if(Math.abs(player.x-midnight.x)<90&&!midnight.talked){
      midnight.talked=true; midnight.state='give';
      const bl=items.find(i=>i.type==='blunt'); if(bl){bl.x=midnight.x-80;bl.y=midnight.y-30;bl.visible=true;}
      setCaption('moo.',2800);
      setTimeout(()=>{midnight.state='idle';},2200);
      return;
    }
    if(Math.abs(player.x-midnight.x)<90) { setCaption('...moo.',2000); return; }
  }

  if(player.dead) return;

  // Z — dash (matches portfolio)
  if(e.code==='KeyZ' && player.dashCooldown===0 && player.dashTimer===0) {
    const dx = (keys['ArrowLeft']||keys['KeyA']) ? -1 : (keys['ArrowRight']||keys['KeyD']) ? 1 : player.facing;
    player.dashVx = dx * 16;
    player.dashTimer = 14;
    player.dashCooldown = 36;
    player.atkType = null;
    return;
  }

  if(player.atkType || player.dashTimer>0) return;

  const startAtk = (type, dur) => { player.atkType=type; player.atkTimer=0; player.atkDuration=dur; };
  if(e.code==='KeyX') startAtk(player.weapon==='shovel'?'shovel':'punch', player.weapon==='shovel'?24:18);
  if(e.code==='KeyC') startAtk('kick',22);
  if(e.code==='KeyV') startAtk('roundhouse',28);
});
window.addEventListener('keyup', e => { keys[e.code]=false; });

// ══════════════════════════════════════════════════════════════
//  PHYSICS
// ══════════════════════════════════════════════════════════════
const GRAVITY=0.55, JUMP_VEL=-13, MOVE_SPEED=3.8;

function playerRect(px,py) {
  if(player.slideTimer>0) return {x:px-20,y:py-20,w:40,h:20};
  return {x:px-9,y:py-42,w:18,h:42};
}
function rectsOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}

function resolvePlayer() {
  if(player.dashCooldown>0) player.dashCooldown--;

  // Dash frame: override velocity, skip gravity, skip normal movement
  if(player.dashTimer>0) {
    player.dashTimer--;
    player.vx = player.dashVx;
    player.vy = 0;
    player.x += player.vx; player.y += player.vy;
    // still collide with platforms
    player.onGround=false; player.onIce=false;
    const pr=playerRect(player.x,player.y);
    for(const p of platforms){
      const prevBottom=pr.y+pr.h-player.vy, platTop=p.y;
      if(pr.x+pr.w>p.x&&pr.x<p.x+p.w&&pr.y+pr.h>platTop&&prevBottom<=platTop+2&&player.vy>=0){
        player.y=p.y; player.vy=0; player.onGround=true; if(p.ice) player.onIce=true;
      }
    }
    if(player.x<20){player.x=20;player.dashTimer=0;}
    return;
  }

  const SPEED = player.buffTimer>0 ? MOVE_SPEED*1.4 : MOVE_SPEED;
  const moveL = keys['ArrowLeft']||keys['KeyA'];
  const moveR = keys['ArrowRight']||keys['KeyD'];
  const jump  = keys['ArrowUp']||keys['KeyW']||keys['Space'];
  const slideKey = keys['ArrowDown']||keys['KeyS'];

  if(player.slideTimer>0) player.slideTimer--;
  if(slideKey && player.onGround && Math.abs(player.vx)>1.5 && player.slideTimer<=0)
    player.slideTimer=22;

  if(player.slideTimer<=0) {
    if(moveL){player.vx-=0.7; player.facing=-1;}
    if(moveR){player.vx+=0.7; player.facing= 1;}
    player.vx=Math.max(-SPEED,Math.min(SPEED,player.vx));
  } else { player.vx*=1.02; }

  const fric=player.onIce?0.97:0.82;
  if(!moveL&&!moveR&&player.slideTimer<=0) player.vx*=fric;

  player.vy+=GRAVITY;
  player.x+=player.vx; player.y+=player.vy;

  if(player.vy<0) player.jumpTimer++;
  else player.jumpTimer=0;

  player.onGround=false; player.onIce=false;
  const pr=playerRect(player.x,player.y);
  for(const p of platforms){
    const prevBottom=pr.y+pr.h-player.vy, platTop=p.y;
    if(pr.x+pr.w>p.x&&pr.x<p.x+p.w&&pr.y+pr.h>platTop&&prevBottom<=platTop+2&&player.vy>=0){
      player.y=p.y; player.vy=0; player.onGround=true;
      if(p.ice) player.onIce=true;
    }
  }
  if(player.y>GROUND_Y+300){player.y=GROUND_Y;player.vy=0;takeDamage(15,'fall');}
  if(player.x<20){player.x=20;player.vx=0;}
  if(jump&&player.onGround){player.vy=JUMP_VEL;player.onGround=false;}
}

// ══════════════════════════════════════════════════════════════
//  COMBAT
// ══════════════════════════════════════════════════════════════
function takeDamage(amt,src) {
  if(player.iframes>0||player.dead) return;
  player.hp-=amt; player.iframes=60;
  if(src==='cold'||src==='boss') player.vx+=(-player.facing)*6;
  if(player.hp<=0){
    player.dead=true; player.hp=0; gamePhase='gameover';
    setTimeout(()=>{document.getElementById('game-over').style.display='flex';},900);
  }
}

function spawnFloat(wx, wy, val, color='#ffd966') {
  floaters.push({x:wx,y:wy,val,color,age:0,vy:-1.2});
}

function registerHit(dmg) {
  player.combo++; player.comboTimer=90;
  const bonus = player.buffTimer>0 ? 1.2 : 1;
  const label = player.combo>=5 ? (COMBO_LABELS[Math.min(player.combo,COMBO_LABELS.length-1)]||'GODLIKE') : null;
  if(label && player.combo%5===0) {
    // announce
    setCaption(`${player.combo}× ${label}`, 1600);
  }
  return Math.floor(dmg*bonus);
}

function doAttack() {
  if(!player.atkType) return;
  const af = player.atkTimer/player.atkDuration;
  if(af < 0.25 || af > 0.75) return; // only active mid-swing

  const dmgTable = {punch:18, kick:20, roundhouse:15, shovel:28};
  const baseDmg  = dmgTable[player.atkType]||18;

  // Hitboxes in world space
  let hitRect;
  const px=player.x, py=player.y, f=player.facing;
  if(player.atkType==='punch') {
    hitRect={x:px+(f>0?0:-30),y:py-44,w:30,h:26};
  } else if(player.atkType==='kick') {
    hitRect={x:px+(f>0?0:-36),y:py-30,w:36,h:28};
  } else if(player.atkType==='roundhouse') {
    hitRect={x:px-42,y:py-44,w:84,h:44}; // wide AoE
  } else if(player.atkType==='shovel') {
    hitRect={x:px+(f>0?0:-70),y:py-44,w:70,h:52};
  }
  if(!hitRect) return;

  // vs enemies
  enemies.forEach(e=>{
    if(e.hp<=0||e.iframes>0) return;
    const er=e.type==='memo'?{x:e.x-22,y:e.y-20,w:44,h:40}:{x:e.x-14,y:e.y-55,w:28,h:55};
    if(rectsOverlap(hitRect,er)){
      const actual=registerHit(baseDmg); e.hp-=actual; e.iframes=30;
      spawnFloat(e.x,e.type==='memo'?e.y-30:e.y-70,actual);
      if(e.hp<=0) e.state='dead';
    }
  });

  // vs boss
  if(boss.triggered&&!boss.dead&&boss.iframes<=0){
    const br={x:boss.x-22,y:boss.y-130,w:44,h:130};
    if(rectsOverlap(hitRect,br)){
      const actual=registerHit(baseDmg); boss.hp-=actual; boss.iframes=20;
      spawnFloat(boss.x,boss.y-140,actual,'#ff6644');
      if(boss.hp<boss.maxHp*0.5&&boss.phase===1&&!boss.demonTaunted){
        boss.phase=2; boss.walkSpeed=1.8; boss.attackTimer=120; boss.demonTaunted=true;
        triggerDemonTaunt();
      }
      if(boss.hp<=0){boss.dead=true;boss.hp=0;boss.state='dead';setTimeout(endWin,2400);}
    }
  }

  // shovel knocks spreadsheets
  if(player.atkType==='shovel')
    projectiles=projectiles.filter(p=>!rectsOverlap(hitRect,{x:p.x-22,y:p.y-15,w:44,h:30}));
}

// ══════════════════════════════════════════════════════════════
//  ENEMY AI
// ══════════════════════════════════════════════════════════════
const COLD_SPD=0.85, MEMO_SPD=1.5;

function updateEnemies() {
  const camL=camera.x-200, camR=camera.x+W+200;
  enemies.forEach(e=>{
    if(e.hp<=0) return;
    if(e.x<camL||e.x>camR) return; // skip off-screen
    if(e.iframes>0) e.iframes--;

    if(e.type==='cold') {
      e.state='walk';
      e.x+=e.dir*COLD_SPD;
      if(Math.abs(e.x-e.spawnX)>e.patrolR) e.dir*=-1;
      if(e.iframes===0){const pr=playerRect(player.x,player.y); if(rectsOverlap(pr,{x:e.x-14,y:e.y-55,w:28,h:55})) takeDamage(10,'cold');}
    }
    if(e.type==='memo') {
      e.chargeTimer--;
      if(e.chargeTimer<=0){
        const dx=player.x-e.x, dy=player.y-50-e.y, dist=Math.sqrt(dx*dx+dy*dy);
        e.x+=dx/dist*MEMO_SPD*1.8; e.y+=dy/dist*MEMO_SPD*0.8;
        e.chargeTimer=150; e.state='attack';
      } else {
        e.x+=e.dir*0.55;
        e.y=e.baseY+Math.sin(t*0.05)*18;
        if(Math.abs(e.x-e.spawnX)>100) e.dir*=-1;
        e.state='idle';
      }
      const pr=playerRect(player.x,player.y);
      if(rectsOverlap(pr,{x:e.x-22,y:e.y-20,w:44,h:40})) takeDamage(8,'memo');
    }
  });
}

// ══════════════════════════════════════════════════════════════
//  BOSS AI
// ══════════════════════════════════════════════════════════════
function updateBoss() {
  if(!boss.triggered||boss.dead) return;
  if(boss.iframes>0) boss.iframes--;
  if(boss.attackTimer>0) boss.attackTimer--;

  const dx=player.x-boss.x;
  boss.dir=dx<0?-1:1;
  boss.x+=boss.dir*boss.walkSpeed;

  const atkInterval=boss.phase===2?90:150;
  if(boss.attackTimer<=0){
    boss.attackTimer=atkInterval;
    boss.state=boss.phase===2?'attack2':'attack';
    const count=boss.phase===2?3:1;
    for(let i=0;i<count;i++){
      const spread=(i-(count-1)/2)*0.4;
      projectiles.push({x:boss.x+boss.dir*30,y:boss.y-80,vx:boss.dir*(boss.phase===2?5.5:4)+spread*2,vy:-2+spread,age:0});
    }
  }
  if(boss.iframes===0){
    const pr=playerRect(player.x,player.y);
    if(rectsOverlap(pr,{x:boss.x-22,y:boss.y-130,w:44,h:130})) takeDamage(20,'boss');
  }
}

function updateProjectiles() {
  projectiles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.2;p.age++;});
  projectiles=projectiles.filter(p=>p.y<GROUND_Y+60&&p.age<300);
  projectiles.forEach(p=>{
    const pr=playerRect(player.x,player.y);
    if(rectsOverlap(pr,{x:p.x-22,y:p.y-15,w:44,h:30})){takeDamage(18,'sheet');p.age=999;}
  });
}

// ══════════════════════════════════════════════════════════════
//  ITEMS
// ══════════════════════════════════════════════════════════════
function updateItems() {
  const pr=playerRect(player.x,player.y);
  items.forEach(item=>{
    if(item.collected) return;
    if(!item.visible&&item.type==='blunt') return;
    if(rectsOverlap(pr,{x:item.x-20,y:item.y-40,w:40,h:55})){
      item.collected=true;
      if(item.type==='dunkin')  { player.hp=Math.min(player.maxHp,player.hp+40); setCaption('dunkin. even at 4am. especially at 4am.  +40 hp',2000); }
      if(item.type==='blunt')   { player.buffTimer=900; setCaption("midnight's gift.  speed up.  damage up.  15 seconds.",2500); }
      if(item.type==='shovel')  { player.weapon='shovel'; setCaption('snow shovel equipped.  Z to sweep.  knocks spreadsheets.',2500); }
      if(item.type==='parka')   { player.hasParka=true; setCaption('parka equipped.  cold resistance active.  warmth meter stabilized.',2200); }
    }
  });
}

// ══════════════════════════════════════════════════════════════
//  COLD METER + COMBO TICK
// ══════════════════════════════════════════════════════════════
function updateTimers() {
  if(!player.hasParka && t%5===0) player.coldMeter=Math.max(0,player.coldMeter-1);
  if(player.coldMeter<=0&&t%180===0) takeDamage(8,'cold');
  const bar=document.getElementById('cold-bar'); if(bar) bar.style.width=player.coldMeter+'%';

  if(player.buffTimer>0) player.buffTimer--;
  if(player.iframes>0) player.iframes--;
  if(boss.iframes>0) boss.iframes--;

  if(player.comboTimer>0) { player.comboTimer--; if(player.comboTimer<=0) player.combo=0; }

  // Attack timer
  if(player.atkType) {
    player.atkTimer++;
    doAttack();
    if(player.atkTimer>=player.atkDuration) { player.atkType=null; player.atkTimer=0; }
  }

  // Floaters
  floaters.forEach(f=>{f.y+=f.vy;f.age++;});
  floaters=floaters.filter(f=>f.age<55);
}

// ══════════════════════════════════════════════════════════════
//  MILESTONES
// ══════════════════════════════════════════════════════════════
function checkMilestones() {
  if(!milestones.zone1&&player.x>900){
    milestones.zone1=true;
    setCaption('entering: the frozen corridor',2000);
  }
  if(!milestones.zone2&&player.x>2400){
    milestones.zone2=true;
    setCaption('entering: azure server room\n847 instances. 0 warm.',2400);
  }
  if(!milestones.zone3&&player.x>4400){
    milestones.zone3=true;
    setCaption('entering: azure data center\nsponsored by: the corporation',2400);
  }
  if(!milestones.zone4&&player.x>6000){
    milestones.zone4=true;
    setCaption('entering: executive wing\nscheduled outage: never',2400);
  }
  if(!milestones.preBoss&&player.x>7000){
    milestones.preBoss=true; boss.triggered=true;
    setCaption('THE DIRECTOR',1400);
    setTimeout(()=>setCaption('"this needs to be done by end of day."',2600),1600);
    setTimeout(()=>setCaption('"end of day was six hours ago."',2600),4400);
    setTimeout(()=>setCaption('"we know. it still needs to be done."',2600),7200);
  }
}

// ══════════════════════════════════════════════════════════════
//  DEMON TAUNT
// ══════════════════════════════════════════════════════════════
function triggerDemonTaunt() {
  gamePhase='demon';
  demonOverlay={lines:['"even cows know when to leave."','"clint knew."','"do you?"'],idx:0,active:true};
}

function endWin() {
  gamePhase='win';
  setCaption('you found it.\nthe backup is warm.',2800);
  setTimeout(()=>{document.getElementById('win-screen').style.display='flex';},2400);
}

// ══════════════════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════════════════
function drawBackground() {
  const cx = camera.x;
  // 0=outdoor, 1=warehouse, 2=server room, 3=azure DC, 4=exec wing, 5=boss
  const sect = cx<900?0 : cx<2400?1 : cx<4400?2 : cx<6000?3 : cx<7200?4 : 5;
  const bx = -cx * 0.18;

  // Base gradient
  const tops   = ['#070f18','#050c14','#030a0e','#040a18','#070a0c','#030608'];
  const bots   = ['#0c1e2e','#080e1a','#071212','#08101e','#0d0e10','#050808'];
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,tops[sect]); grad.addColorStop(1,bots[sect]);
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

  if(sect===0) {
    // OUTDOOR: distant city buildings
    ctx.fillStyle='rgba(8,18,32,0.92)';
    [[200,H-160,80,160],[340,H-240,60,240],[500,H-180,90,180],[700,H-130,70,130],
     [900,H-200,55,200],[1100,H-150,80,150],[1350,H-180,65,180]].forEach(([x,y,w,h])=>{
      ctx.fillStyle='rgba(8,18,32,0.92)'; ctx.fillRect(x+bx,y,w,h);
      for(let wy=y+20;wy<y+h-10;wy+=28) for(let wx=x+8+bx;wx<x+w-8+bx;wx+=18)
        if(Math.sin(wx*0.7+wy*0.3)>0.3){ctx.fillStyle='rgba(255,220,120,0.2)';ctx.fillRect(wx,wy,8,12);}
    });

  } else if(sect===1) {
    // FROZEN WAREHOUSE: ceiling, icy pipes, hanging icicles
    const ceil=H*0.15;
    ctx.fillStyle='rgba(8,14,22,0.98)'; ctx.fillRect(0,0,W,ceil);
    ctx.fillStyle='rgba(84,200,255,0.1)'; ctx.fillRect(0,ceil-3,W,3);
    // ceiling light strips
    for(let lx=80+bx*0.45;lx<W+80;lx+=220){
      ctx.fillStyle='rgba(180,230,255,0.04)'; ctx.fillRect(lx-40,ceil,80,H);
      ctx.fillStyle='rgba(84,200,255,0.25)'; ctx.fillRect(lx-30,ceil-6,60,5);
    }
    // icicles from ceiling
    for(let ix=30+bx*0.3;ix<W+60;ix+=55){
      const ih=15+Math.sin(ix*0.4)*10;
      ctx.fillStyle='rgba(84,200,255,0.18)';
      ctx.beginPath(); ctx.moveTo(ix,ceil); ctx.lineTo(ix-5,ceil+ih); ctx.lineTo(ix+5,ceil+ih); ctx.closePath(); ctx.fill();
    }
    // pipes
    ctx.strokeStyle='rgba(84,200,255,0.12)'; ctx.lineWidth=4;
    for(let px=bx*0.4;px<W+100;px+=130){
      ctx.beginPath(); ctx.moveTo(px,ceil+8); ctx.lineTo(px+90,ceil+8); ctx.stroke();
    }

  } else if(sect===2) {
    // SERVER ROOM: dark, green LED racks in background
    const ceil=H*0.12;
    ctx.fillStyle='rgba(4,10,8,0.99)'; ctx.fillRect(0,0,W,ceil+2);
    ctx.fillStyle='rgba(0,160,60,0.03)'; ctx.fillRect(0,0,W,H);
    // rack silhouettes parallax
    for(let rx=bx*0.22;rx<W+100;rx+=88){
      ctx.fillStyle='rgba(6,16,12,0.88)'; ctx.fillRect(rx,H-210,56,210);
      for(let ry=H-204;ry<H-20;ry+=16){
        const on=Math.sin(rx*0.13+ry*0.07+t*0.025)>0.55;
        ctx.fillStyle='rgba(8,24,16,0.9)'; ctx.fillRect(rx+3,ry,50,12);
        ctx.fillStyle=on?'rgba(0,255,80,0.85)':'rgba(0,60,25,0.4)';
        ctx.fillRect(rx+6,ry+4,5,4);
      }
    }
    // ceiling line
    ctx.fillStyle='rgba(0,200,70,0.08)'; ctx.fillRect(0,ceil,W,4);

  } else if(sect===3) {
    // AZURE DATA CENTER: blue fluorescent, corporate
    const ceil=H*0.12;
    ctx.fillStyle='rgba(4,8,20,0.99)'; ctx.fillRect(0,0,W,ceil+2);
    ctx.fillStyle='rgba(0,100,200,0.04)'; ctx.fillRect(0,0,W,H);
    // fluorescent lights (occasional flicker)
    for(let lx=100+bx*0.3;lx<W+100;lx+=240){
      const fl=Math.sin(t*0.09+lx*0.012)>-0.94;
      ctx.fillStyle=fl?'rgba(160,210,255,0.12)':'rgba(160,210,255,0.03)'; ctx.fillRect(lx-60,ceil,120,H);
      ctx.fillStyle=fl?'rgba(180,220,255,0.45)':'rgba(100,130,180,0.15)'; ctx.fillRect(lx-45,ceil-5,90,5);
    }
    // background rack columns, more corporate
    for(let rx=bx*0.18;rx<W+60;rx+=110){
      ctx.fillStyle='rgba(10,14,28,0.7)'; ctx.fillRect(rx,H-180,50,180);
      ctx.fillStyle='rgba(0,100,200,0.15)'; ctx.fillRect(rx,H-180,50,4);
    }

  } else if(sect===4) {
    // EXECUTIVE WING: warm amber, cubicle walls, carpet
    const ceil=H*0.14;
    ctx.fillStyle='rgba(10,8,6,0.99)'; ctx.fillRect(0,0,W,ceil);
    // warm pools of light
    for(let lx=120+bx*0.25;lx<W+120;lx+=250){
      const wg=ctx.createRadialGradient(lx,ceil,0,lx,ceil,H*0.55);
      wg.addColorStop(0,'rgba(255,190,80,0.07)'); wg.addColorStop(1,'rgba(255,190,80,0)');
      ctx.fillStyle=wg; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='rgba(200,150,60,0.3)'; ctx.fillRect(lx-20,ceil-5,40,5);
    }
    // cubicle dividers
    for(let dx=bx*0.2;dx<W+80;dx+=190){
      ctx.fillStyle='rgba(30,22,14,0.75)'; ctx.fillRect(dx,H-195,7,195);
      ctx.fillStyle='rgba(55,38,20,0.35)'; ctx.fillRect(dx+7,H-190,38,190);
    }
    // carpet floor strip color (just above ground)
    ctx.fillStyle='rgba(55,35,18,0.3)'; ctx.fillRect(0,H-82,W,4);

  } else {
    // BOSS CHAMBER: near black, single spotlight
    const sg=ctx.createRadialGradient(W*0.5,H,0,W*0.5,H,H*0.9);
    sg.addColorStop(0,'rgba(22,32,56,0.35)'); sg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=sg; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(42,58,92,0.5)'; ctx.fillRect(0,0,W,7);
  }

  // Snow — full outdoors, fades inside
  const snowA = sect===0 ? 0.75 : Math.max(0, 0.38 - (sect-1)*0.07);
  if(snowA>0.03){
    ctx.fillStyle=`rgba(232,244,255,${snowA})`;
    FLAKES.forEach(f=>{
      f.x=(f.x+f.drift+0.0001)%1; f.y=(f.y+f.speed)%1;
      ctx.beginPath(); ctx.arc(f.x*W,f.y*H,f.r,0,TAU); ctx.fill();
    });
  } else {
    FLAKES.forEach(f=>{ f.x=(f.x+f.drift+0.0001)%1; f.y=(f.y+f.speed)%1; });
  }
}

function drawWorld() {
  ctx.save(); ctx.translate(-camera.x,0);

  // Platforms
  platforms.forEach(p=>{
    if(p.ice){
      drawIcePlatform(p.x+p.w/2,p.y,p.w);
    } else {
      ctx.fillStyle='rgba(12,34,72,0.7)'; ctx.fillRect(p.x,p.y,p.w,p.h);
      ctx.fillStyle='rgba(232,244,255,0.12)'; ctx.fillRect(p.x,p.y,p.w,6);
      glow(ICE,3); ctx.strokeStyle='rgba(84,200,255,0.22)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+p.w,p.y); ctx.stroke(); noGlow();
    }
  });

  // Props
  props.forEach(p=>{
    if(p.type==='server')   drawFrozenServer(p.x,p.y);
    if(p.type==='badge')    drawEmployeeBadge(p.x,p.y);
    if(p.type==='meltaway') drawMeltaway(p.x,p.y);
    if(p.type==='backup')   drawBackupFile(p.x,p.y);
  });

  // Items
  items.forEach(item=>{
    if(item.collected||(item.type==='blunt'&&!item.visible)) return;
    const bob=Math.sin(t*0.06)*4;
    if(item.type==='dunkin')  drawDunkin(item.x,item.y+bob);
    if(item.type==='blunt')   drawBluntItem(item.x,item.y+bob);
    if(item.type==='shovel')  drawShovelItem(item.x,item.y+bob);
    if(item.type==='parka')   drawParkaItem(item.x,item.y+bob);
  });

  // Projectiles
  projectiles.forEach(p=>drawSpreadsheet(p.x,p.y));

  // Enemies
  const camL=camera.x-200, camR=camera.x+W+200;
  enemies.forEach(e=>{
    if(e.hp<=0||e.x<camL||e.x>camR) return;
    if(e.type==='cold') drawColdShoulder(e.x,e.y,e.state);
    if(e.type==='memo')  drawMemo(e.x,e.y,e.state);
    // HP bar
    ctx.save(); ctx.translate(e.x,e.type==='memo'?e.y-38:e.y-68);
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(-18,-4,36,6);
    ctx.fillStyle=e.type==='memo'?'#ff4466':ICE; ctx.fillRect(-18,-4,36*(e.hp/e.maxHp),6);
    ctx.restore();
  });

  // Midnight
  drawMidnight(midnight.x,midnight.y,midnight.state);
  if((gamePhase==='intro'&&showIntroPrompt)||(gamePhase!=='intro'&&Math.abs(player.x-midnight.x)<90&&!midnight.talked)){
    ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.font='9px Courier New'; ctx.textAlign='center';
    ctx.fillText('[F]',midnight.x,midnight.y-85);
  }

  // [F] prompts for readable props
  props.forEach(p=>{
    if((p.type==='badge'||p.type==='backup')&&Math.abs(player.x-p.x)<80){
      ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='9px Courier New'; ctx.textAlign='center';
      ctx.fillText('[F]',p.x,p.y-52);
    }
  });

  // Boss
  if(boss.triggered&&!boss.dead){
    ctx.save(); ctx.scale(boss.dir,1); ctx.translate(boss.dir>0?0:-2*boss.x,0);
    const bstate=boss.phase===2?(boss.state==='attack2'?'attack2':'phase2'):(boss.state==='attack'?'attack':'phase1');
    drawDirector(boss.x*boss.dir,boss.y,bstate);
    ctx.restore();
    // Boss HP
    const barW=Math.min(300,W*0.3);
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(W/2-barW/2-2,16,barW+4,12);
    ctx.fillStyle='#ff2244'; ctx.fillRect(W/2-barW/2,18,barW*(boss.hp/boss.maxHp),8);
    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='8px Courier New'; ctx.textAlign='center';
    ctx.fillText('THE DIRECTOR',W/2,14); // drawn in screen space but inside translate — fix below
  }

  // Player
  const atkF = player.atkType ? player.atkTimer/player.atkDuration : 0;
  const jumpF = Math.min(player.jumpTimer/12,1);
  let pState='idle';
  if(player.dead)              pState='dead';
  else if(player.dashTimer>0)  pState='dash';
  else if(player.slideTimer>0) pState='slide';
  else if(player.atkType)      pState=player.atkType;
  else if(player.vy<-1)       pState='jump';
  else if(player.vy>2)        pState='fall';
  else if(Math.abs(player.vx)>0.5) pState='run';

  drawFreezerPlayer(
    player.x, player.y,
    pState, player.facing,
    pState==='jump'?jumpF:atkF,
    player.vy,
    player.hasParka
  );

  // Shovel carried (when not attacking with it)
  if(player.weapon==='shovel'&&pState!=='shovel'&&pState!=='dead')
    drawShovelCarried(player.x,player.y,player.facing);

  // Floating damage numbers
  floaters.forEach(f=>{
    const a=1-f.age/55;
    ctx.fillStyle=f.color.replace(')',`,${a})`).replace('rgb','rgba').replace('##','rgba(').replace('#','rgba(');
    // simpler:
    ctx.globalAlpha=a;
    ctx.fillStyle=f.color; ctx.font='bold 13px monospace'; ctx.textAlign='center';
    ctx.fillText(`-${f.val}`,f.x,f.y);
    ctx.globalAlpha=1;
  });

  ctx.restore();

  // Boss HP bar in screen space (outside world translate)
  if(boss.triggered&&!boss.dead){
    const barW=Math.min(300,W*0.3);
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(W/2-barW/2-2,14,barW+4,14);
    ctx.fillStyle='#ff2244'; ctx.fillRect(W/2-barW/2,16,barW*(boss.hp/boss.maxHp),10);
    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='8px Courier New'; ctx.textAlign='center';
    ctx.fillText('THE DIRECTOR',W/2,12);
  }
}

function drawHUD() {
  // Hearts
  const hc=document.getElementById('hearts-canvas');
  const hCtx=hc?.getContext('2d'); if(!hCtx) return;
  hCtx.clearRect(0,0,hc.width,hc.height);
  const maxH=Math.ceil(player.maxHp/25), curH=player.hp/25;
  for(let i=0;i<maxH;i++){
    hCtx.fillStyle=i<curH?'#ff4466':'rgba(255,255,255,0.12)';
    hCtx.beginPath(); hCtx.arc(10+i*22,12,8,0,TAU); hCtx.fill();
    if(i<curH&&player.iframes>0&&Math.floor(t/4)%2===0){hCtx.fillStyle='rgba(255,255,255,0.5)';hCtx.beginPath();hCtx.arc(10+i*22,12,8,0,TAU);hCtx.fill();}
  }
  const wpn=document.getElementById('weapon-hud'); if(wpn) wpn.textContent=player.weapon?`[ ${player.weapon} ]`:'[ fists ]';
  const buff=document.getElementById('buff-hud'); if(buff) buff.textContent=player.buffTimer>0?`BUFF ${Math.ceil(player.buffTimer/60)}s`:'';
}

function drawDemonOverlay() {
  if(!demonOverlay?.active) return;
  ctx.fillStyle='rgba(5,10,18,0.82)'; ctx.fillRect(0,0,W,H);
  // Silhouette
  ctx.save(); ctx.translate(W/2-80,H/2+30); ctx.scale(0.55,0.55);
  ctx.fillStyle='rgba(0,0,0,0.95)'; ctx.strokeStyle='rgba(200,40,60,0.2)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,-80,18,0,TAU); ctx.fill(); ctx.stroke();
  _limb(0,-62,0,-20,'rgba(10,5,15,0.9)',8);
  _limb(0,-20,-20,20,'rgba(10,5,15,0.9)',8); _limb(0,-20,20,20,'rgba(10,5,15,0.9)',8);
  // horns
  ctx.strokeStyle='rgba(0,0,0,0.95)'; ctx.lineWidth=5;
  ctx.beginPath(); ctx.moveTo(-10,-94); ctx.quadraticCurveTo(-22,-116,-14,-126); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10,-94);  ctx.quadraticCurveTo(22,-116,14,-126);  ctx.stroke();
  ctx.restore();
  // dialogue
  const line=demonOverlay.lines[demonOverlay.idx]||'';
  ctx.fillStyle='rgba(255,60,80,0.9)'; ctx.font='14px Courier New'; ctx.textAlign='center';
  ctx.fillText(line,W/2,H/2+20);
  ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.font='9px Courier New';
  ctx.fillText('[ space / enter ]',W/2,H/2+48);
}

// ══════════════════════════════════════════════════════════════
//  GAME LOOP
// ══════════════════════════════════════════════════════════════
function loop() {
  requestAnimationFrame(loop);
  t++;

  if(gamePhase==='playing') {
    resolvePlayer();
    updateEnemies();
    updateBoss();
    updateProjectiles();
    updateItems();
    updateTimers();
    checkMilestones();

    // Camera
    const targetX = player.x - W/2;
    const clampedX = Math.max(0, Math.min(targetX, 8800-W));
    camera.x += (clampedX - camera.x) * 0.1;
  } else if(gamePhase==='intro') {
    // Player locked, camera stays at 0, just animate
    camera.x += (0 - camera.x) * 0.08;
    if(player.atkType){ player.atkTimer++; if(player.atkTimer>=player.atkDuration){player.atkType=null;player.atkTimer=0;} }
    floaters.forEach(f=>{f.y+=f.vy;f.age++;});
    floaters=floaters.filter(f=>f.age<55);
  } else if(gamePhase==='demon') {
    // Still tick camera/animation but no player input
    camera.x += (Math.max(0,Math.min(player.x-W/2,8800-W)) - camera.x) * 0.1;
  }

  drawBackground();
  drawWorld();
  drawHUD();
  if(gamePhase==='demon') drawDemonOverlay();
}

// ── Init ────────────────────────────────────────────────────────
function init() {
  buildLevel();
  player.y   = GROUND_Y;
  midnight.y = GROUND_Y;
  boss.y     = GROUND_Y;
  player.facing = 1;
  gamePhase = 'intro';
  showIntroPrompt = false;

  const goEl = document.getElementById('game-over');
  const wsEl = document.getElementById('win-screen');
  if(goEl) goEl.style.display='none';
  if(wsEl) wsEl.style.display='none';

  loop();

  // Intro dialogue — store IDs so Space can skip
  introTimeouts.length=0;
  introTimeouts.push(setTimeout(()=>setCaption('the freezer.\nazure cold storage.\nwisconsin. 4:12 am.',3800), 600));
  introTimeouts.push(setTimeout(()=>{ midnight.state='moo'; setCaption('moo moo moooooo. moo moo.',2600); }, 4800));
  introTimeouts.push(setTimeout(()=>setCaption('[you]:  ...you read my mind.',2200), 7600));
  introTimeouts.push(setTimeout(()=>setCaption('[you]:  didn\'t expect to see you here.',2400), 10000));
  introTimeouts.push(setTimeout(()=>{ midnight.state='moo'; setCaption('moo.',1800); }, 12600));
  introTimeouts.push(setTimeout(()=>setCaption('[you]:  yeah. the corporation.',2400), 14600));
  introTimeouts.push(setTimeout(()=>{ midnight.state='idle'; showIntroPrompt=true; setCaption('[ F ] — she has something for you',99999); }, 17200));
}
init();
