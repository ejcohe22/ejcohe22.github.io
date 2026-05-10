// ── Setup ─────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
let W, H, GROUND_Y;
function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  GROUND_Y = H - 80;
}
resize();
window.addEventListener('resize', resize);

// ── Palette ───────────────────────────────────────────────────
const ICE  = '#54c8ff', NAVY = '#2a3a5c', GOLD = '#c8a000', OFF_W = '#f8f8f0';

// ── Draw helpers ──────────────────────────────────────────────
function glow(c, b=10) { ctx.shadowColor=c; ctx.shadowBlur=b; }
function noGlow()       { ctx.shadowColor='transparent'; ctx.shadowBlur=0; }
function limb(x1,y1,x2,y2,w,c) {
  ctx.strokeStyle=c; ctx.lineWidth=w; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
}

// ── Snowflakes (screen-space) ─────────────────────────────────
const FLAKES = Array.from({length:160},()=>({
  x:Math.random(), y:Math.random(),
  r:Math.random()*2.2+0.4,
  speed:Math.random()*0.0005+0.0001,
  drift:(Math.random()-0.5)*0.0002,
}));

// ── Global frame timer (shared by all draw fns) ────────────────
let t = 0;

// ── Input (keys cleared on blur to prevent sticky-key glitch) ─

// ══════════════════════════════════════════════════════════════
//  DRAW FUNCTIONS  (origin = cx/cy at feet unless noted)
// ══════════════════════════════════════════════════════════════

function drawPlayer(cx, cy, state, facing) {
  const bob  = Math.sin(t*0.06)*1.5;
  const run  = state==='run';
  const jump = state==='jump';
  const lSin = run ? Math.sin(t*0.12)*12 : 0;
  const aSwing = run ? Math.sin(t*0.12)*10 : Math.sin(t*0.04)*4;
  ctx.save(); ctx.translate(cx, cy + (jump?-20:bob)); ctx.scale(facing,1);
  ctx.fillStyle='rgba(201,126,255,0.18)'; ctx.beginPath(); ctx.ellipse(0,jump?20:0,9,3,0,0,Math.PI*2); ctx.fill();
  glow('#c97eff',12);
  const C='#eeeef8', LW=2.5;
  limb(0,-18,-7+(run?lSin*0.5:0),0,LW,C);
  limb(0,-18, 7-(run?lSin*0.5:0),0,LW,C);
  limb(0,-18,0,-33,LW,C);
  limb(0,-28,-12,-18+aSwing,LW,C);
  limb(0,-28, 12,-18-aSwing,LW,C);
  ctx.strokeStyle=C; ctx.lineWidth=LW; ctx.beginPath(); ctx.arc(0,-40,7,0,Math.PI*2); ctx.stroke();
  noGlow(); ctx.restore();
}

function drawPlayerParka(cx, cy, state, facing) {
  const bob  = Math.sin(t*0.06)*1.5;
  const run  = state==='run', jump = state==='jump';
  ctx.save(); ctx.translate(cx, cy+(jump?-20:bob)); ctx.scale(facing,1);
  glow('#ff8844',8);
  ctx.fillStyle='#e86820'; ctx.strokeStyle='#c04c00'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(-16,-40,32,28,[6,6,3,3]); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-12,-56,24,18,[10,10,0,0]); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(240,240,220,0.5)'; ctx.beginPath(); ctx.roundRect(-12,-56,24,7,[10]); ctx.fill();
  ctx.fillStyle='#e86820'; ctx.strokeStyle='#c04c00';
  ctx.beginPath(); ctx.roundRect(-30,-38,16,11,[5]); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(14,-38,16,11,[5]); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='#eeeef8'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.arc(0,-58,7,0,Math.PI*2); ctx.stroke();
  limb(0,-12,-7,0,2.5,'#eeeef8'); limb(0,-12,7,0,2.5,'#eeeef8');
  noGlow(); ctx.restore();
}

function drawShovelHeld(cx, cy, facing) {
  ctx.save(); ctx.translate(cx,cy); ctx.scale(facing,1);
  ctx.translate(18,-28); ctx.rotate(-0.8);
  ctx.strokeStyle='#c8a878'; ctx.lineWidth=4; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(0,30); ctx.lineTo(0,-20); ctx.stroke();
  ctx.fillStyle='#cccccc'; ctx.strokeStyle='#999'; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.moveTo(-14,-20); ctx.lineTo(-16,-5); ctx.lineTo(16,-5); ctx.lineTo(14,-20); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawAttackArc(cx, cy, facing, wide) {
  ctx.save(); ctx.translate(cx, cy-20); ctx.scale(facing,1);
  glow('#c97eff',14);
  ctx.strokeStyle='rgba(201,126,255,0.55)'; ctx.lineWidth=wide?4:3;
  ctx.beginPath(); ctx.arc(0,0, wide?70:50, -Math.PI*0.4, Math.PI*0.4); ctx.stroke();
  noGlow(); ctx.restore();
}

function drawMidnight(cx, cy, state) {
  const breathe = Math.sin(t*0.025)*1.5, tail = Math.sin(t*0.04)*20, bob = Math.sin(t*0.03)*2.5;
  const moo = state==='moo', give = state==='give';
  ctx.save(); ctx.translate(cx, cy);
  ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0,0,42,5,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#c0c0b8'; ctx.lineWidth=3.5; ctx.lineCap='round';
  [[-22,0],[-8,0],[8,0],[22,0]].forEach(([lx],i)=>{
    const b=i%2===0?bob:-bob;
    ctx.beginPath(); ctx.moveTo(lx,-6); ctx.lineTo(lx,18+b); ctx.stroke();
    ctx.fillStyle='#888'; ctx.beginPath(); ctx.ellipse(lx,19+b,5,3,0,0,Math.PI*2); ctx.fill();
  });
  ctx.fillStyle='#f0c8c8'; ctx.beginPath(); ctx.ellipse(5,-9+breathe,12,7,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=OFF_W; ctx.strokeStyle='#c8c8c0'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.ellipse(5,-26+breathe,44,28,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#1a1a18';
  ctx.beginPath(); ctx.ellipse(-4,-30+breathe,13,8,0.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(26,-20+breathe,9,6,-0.3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=OFF_W; ctx.strokeStyle='#c8c8c0'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.ellipse(-40,-32+breathe,21,16,-0.15,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#f0e8e0';
  ctx.beginPath(); ctx.ellipse(-46,-43+breathe,5,9,-0.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-34,-45+breathe,5,9,0.4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#e8bbbb';
  ctx.beginPath(); ctx.ellipse(-46,-43+breathe,2.5,5,-0.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-34,-45+breathe,2.5,5,0.4,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#c8a060'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(-47,-46+breathe); ctx.quadraticCurveTo(-53,-56,-48,-61); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-33,-48+breathe); ctx.quadraticCurveTo(-30,-58,-25,-60); ctx.stroke();
  ctx.fillStyle='#1a1a18'; ctx.beginPath(); ctx.arc(-44,-33+breathe,3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-42,-35+breathe,1,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#e0aaaa'; ctx.beginPath(); ctx.arc(-54,-28+breathe,3,0,Math.PI*2); ctx.fill();
  if(moo) { ctx.fillStyle='#881100'; ctx.beginPath(); ctx.ellipse(-52,-24+breathe,4,4,0,0,Math.PI*2); ctx.fill(); }
  ctx.strokeStyle='#f0f0e8'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(49,-24+breathe); ctx.quadraticCurveTo(62,-18+breathe+tail*0.2,60,-40+breathe+tail); ctx.stroke();
  ctx.fillStyle='#e0e0d8'; ctx.beginPath(); ctx.arc(60,-40+breathe+tail,6,0,Math.PI*2); ctx.fill();
  if(give) {
    ctx.save(); ctx.translate(-60,-28+breathe); ctx.rotate(0.4);
    glow('#88ff88',8); ctx.fillStyle='#c8a060'; ctx.fillRect(-9,-2,18,4);
    ctx.fillStyle='#55aa33'; ctx.beginPath(); ctx.arc(-11,0,5,0,Math.PI*2); ctx.fill(); noGlow(); ctx.restore();
  }
  const bf=t%100; if(bf<28){const a=bf<14?bf/14*0.38:(28-bf)/14*0.38; ctx.fillStyle=`rgba(200,225,255,${a})`; ctx.beginPath(); ctx.ellipse(-62,-26+breathe,10+bf*0.35,5,-0.2,0,Math.PI*2); ctx.fill();}
  ctx.restore();
}

function drawMemo(cx, cy, state) {
  const wobble=Math.sin(t*0.07)*5, tilt=Math.sin(t*0.05)*0.14, atk=state==='attack', spin=atk?t*0.15:tilt;
  ctx.save(); ctx.translate(cx, cy+wobble); ctx.rotate(spin);
  glow('#ff4466',12);
  ctx.fillStyle='#eeeedc'; ctx.strokeStyle='#bbbbaa'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(-20,-15,40,30,2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#ddddcc'; ctx.beginPath(); ctx.moveTo(-20,-15); ctx.lineTo(0,0); ctx.lineTo(20,-15); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#ff2200'; glow('#ff2200',6); ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill(); noGlow();
  ctx.fillStyle='#ff2200';
  ctx.beginPath(); ctx.arc(-7,10,4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(7,10,4,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#cc1100'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(-11,5); ctx.lineTo(-5,8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(11,5);  ctx.lineTo(5,8);  ctx.stroke();
  [1,2,3].forEach(i=>{ const px=-20-i*10-Math.sin(t*0.04+i)*3,py=-i*4+Math.cos(t*0.06+i)*3,pa=0.5-i*0.12; ctx.fillStyle=`rgba(220,220,200,${pa})`; ctx.save(); ctx.translate(px,py); ctx.rotate(-0.2-i*0.1); ctx.fillRect(-8,-5,16,10); ctx.restore(); });
  noGlow(); ctx.restore();
}

function drawColdShoulder(cx, cy, state) {
  const walk=state==='walk', lSin=walk?Math.sin(t*0.03)*12:0, aSwing=walk?Math.sin(t*0.03)*8:0;
  ctx.save(); ctx.translate(cx,cy);
  glow(ICE,14); ctx.fillStyle='rgba(84,200,255,0.05)'; ctx.beginPath(); ctx.ellipse(0,-22,28,38,0,0,Math.PI*2); ctx.fill(); noGlow();
  ctx.fillStyle='rgba(84,200,255,0.1)'; ctx.beginPath(); ctx.ellipse(0,0,14,4,0,0,Math.PI*2); ctx.fill();
  limb(0,-10,-8,0+lSin*0.4,3.5,'#445566'); limb(0,-10,8,0-lSin*0.4,3.5,'#445566');
  ctx.fillStyle='#445566'; ctx.beginPath(); ctx.roundRect(-12,-38,24,28,2); ctx.fill();
  ctx.fillStyle='rgba(180,220,255,0.22)'; ctx.beginPath(); ctx.roundRect(-12,-38,24,28,2); ctx.fill();
  ctx.fillStyle='#f0f0e8'; ctx.fillRect(-3,-38,6,8);
  ctx.fillStyle='#336655'; ctx.save(); ctx.translate(0,-34); ctx.rotate(0.12);
  ctx.beginPath(); ctx.moveTo(-2,0); ctx.lineTo(2,0); ctx.lineTo(1.5,16); ctx.lineTo(-1.5,16); ctx.closePath(); ctx.fill(); ctx.restore();
  limb(-12,-32,-22,-18+aSwing,3.5,'#445566'); limb(12,-32,22,-18-aSwing,3.5,'#445566');
  limb(0,-38,0,-45,3.5,'#c0c8d0');
  ctx.fillStyle='#c0c8d0'; ctx.strokeStyle='#99aabb'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(0,-52,8,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#99ddff'; ctx.beginPath(); ctx.arc(-3,-52,2,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(3,-52,2,0,Math.PI*2); ctx.fill();
  const bf=t%70; if(bf<22){const a=bf<11?bf/11*0.35:(22-bf)/11*0.35; ctx.fillStyle=`rgba(200,230,255,${a})`; ctx.beginPath(); ctx.ellipse(12,-50,10+bf*0.4,5,0.2,0,Math.PI*2); ctx.fill();}
  ctx.restore();
}

function drawDirector(cx, cy, state) {
  const sc=0.65, breathe=Math.sin(t*0.025)*1.5, sway=Math.sin(t*0.018)*2;
  const p2=state==='phase2'||state==='attack2', atk=state==='attack'||state==='attack2';
  const watchLift=(t%200>160)?Math.sin((t%200-160)/40*Math.PI)*14:0;
  ctx.save(); ctx.translate(cx+sway*sc, cy); ctx.scale(sc,sc);
  ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0,0,32,8,0,0,Math.PI*2); ctx.fill();
  const lSin=atk?Math.sin(t*0.12)*8:0;
  limb(0,-8,-14,24+lSin,6,'#1a2a3a'); limb(0,-8,14,24-lSin,6,'#1a2a3a');
  ctx.fillStyle='#111'; ctx.beginPath(); ctx.ellipse(-14,27+lSin,11,4,0.1,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(14,27-lSin,11,4,-0.1,0,Math.PI*2); ctx.fill();
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
  limb(-20,-44+breathe,-34,-20+caseSwing,6,NAVY);
  const bcy=-20+caseSwing;
  glow(GOLD,atk?22:8); ctx.fillStyle=GOLD; ctx.strokeStyle='#a08000'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(-54,bcy-12,30,22,3); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='#a08000'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(-39,bcy-12,8,Math.PI,0); ctx.stroke();
  ctx.fillStyle='#888800'; ctx.fillRect(-48,bcy+2,8,5); ctx.fillRect(-36,bcy+2,8,5);
  ctx.fillStyle='#555'; ctx.fillRect(-43,bcy+6,8,4); noGlow();
  limb(20,-44+breathe,32,-22-watchLift,6,NAVY);
  if(watchLift>5){ctx.fillStyle='#888'; ctx.strokeStyle='#666'; ctx.lineWidth=1; ctx.beginPath(); ctx.rect(28,-24-watchLift,9,6); ctx.fill(); ctx.stroke();}
  limb(0,-52+breathe,0,-62,5,'#d8c8b8');
  ctx.fillStyle='#e0d0c0'; ctx.strokeStyle='#c0b0a0'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(0,-74,15,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='#111'; ctx.lineWidth=2.5;
  if(!p2){ ctx.beginPath(); ctx.moveTo(-12,-84); ctx.quadraticCurveTo(0,-90,13,-83); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-12,-81); ctx.quadraticCurveTo(2,-88,13,-80); ctx.stroke(); }
  else { for(let i=0;i<7;i++){const hx=-13+i*4.5,rnd=Math.sin(t*0.05+i)*4; ctx.beginPath(); ctx.moveTo(hx,-84); ctx.lineTo(hx+rnd,-96-Math.abs(Math.sin(i*1.3))*6); ctx.stroke();} }
  ctx.strokeStyle='#555'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.rect(-10,-77,9,6); ctx.stroke(); ctx.beginPath(); ctx.rect(1,-77,9,6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-1,-74); ctx.lineTo(1,-74); ctx.stroke();
  ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(-5,-74,2,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(5,-74,2,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#9a7060'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(0,-68,5,0.2,Math.PI-0.2); ctx.stroke();
  if(atk){glow('#ff4466',14); for(let i=-2;i<=2;i++){ctx.save(); ctx.translate(-39,bcy); ctx.rotate(i*0.3-0.8+Math.sin(t*0.1)*0.15); ctx.fillStyle='rgba(240,240,220,0.88)'; ctx.strokeStyle='#aaa'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.rect(0,-8,28,16); ctx.fill(); ctx.stroke(); for(let g=1;g<4;g++){ctx.beginPath(); ctx.moveTo(g*7,-8); ctx.lineTo(g*7,8); ctx.stroke();} ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(28,0); ctx.stroke(); ctx.restore();} noGlow();}
  ctx.restore();
}

function drawDunkin(cx, cy) {
  ctx.save(); ctx.translate(cx, cy); glow('#7effc8',16);
  // cup body (plastic, tapered)
  ctx.fillStyle='#f5f5f5'; ctx.strokeStyle='#ddd'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-13,-35); ctx.lineTo(-11,20); ctx.lineTo(11,20); ctx.lineTo(13,-35); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Dunkin' pink band
  ctx.fillStyle='#e91e8c'; ctx.fillRect(-13,-16,26,13);
  // orange band
  ctx.fillStyle='#ff6e00'; ctx.fillRect(-13,-3,26,11);
  // DD text
  ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.font='bold 8px monospace'; ctx.textAlign='center'; ctx.fillText("DD",0,-8);
  // straw
  ctx.strokeStyle='#6699ff'; ctx.lineWidth=3; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(7,-35); ctx.lineTo(10,-58); ctx.stroke();
  // condensation
  ctx.fillStyle='rgba(120,190,255,0.35)';
  [[-9,4],[-10,-8],[-10,12]].forEach(([x,y])=>{ ctx.beginPath(); ctx.arc(x,y,1.8,0,Math.PI*2); ctx.fill(); });
  // + label
  ctx.fillStyle='#7effc8'; ctx.font='bold 14px monospace'; ctx.fillText('+',0,36);
  noGlow(); ctx.restore();
}

function drawBluntItem(cx, cy) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.4); glow('#88ff88',14);
  ctx.fillStyle='#c8a878'; ctx.strokeStyle='#a08858'; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(-22,-4,40,8,[4]); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#b09060'; ctx.beginPath(); ctx.ellipse(-22,0,5,4,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#44aa22'; glow('#66cc44',10); ctx.beginPath(); ctx.arc(20,0,6,0,Math.PI*2); ctx.fill(); noGlow();
  ctx.restore();
}

function drawShovelItem(cx, cy) {
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.sin(t*0.04)*0.06);
  ctx.strokeStyle='#c8a878'; ctx.lineWidth=5; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(0,40); ctx.lineTo(0,-28); ctx.stroke();
  ctx.fillStyle='#cccccc'; ctx.strokeStyle='#999'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-20,-28); ctx.lineTo(-22,-8); ctx.lineTo(22,-8); ctx.lineTo(20,-28); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='#a08060'; ctx.lineWidth=7; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(-8,40); ctx.lineTo(8,40); ctx.stroke();
  ctx.restore();
}

function drawSpreadsheet(cx, cy, vy) {
  const spin = t*0.12;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(spin);
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
  const ixs=[-hw*0.7,-hw*0.35,0,hw*0.35,hw*0.7];
  ixs.forEach(ix=>{ const len=10+Math.sin(ix*0.3)*4; ctx.fillStyle='rgba(140,210,255,0.5)'; ctx.strokeStyle='rgba(180,230,255,0.7)'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.moveTo(ix-3,10); ctx.lineTo(ix,10+len); ctx.lineTo(ix+3,10); ctx.closePath(); ctx.fill(); ctx.stroke(); });
  ctx.restore();
}

function drawFrozenServer(cx, cy) {
  const ledOn=Math.floor(t/30)%2===0;
  ctx.save(); ctx.translate(cx,cy);
  ctx.fillStyle='rgba(20,60,120,0.5)'; ctx.strokeStyle='rgba(84,200,255,0.4)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(-32,-48,64,90,[4]); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(20,30,40,0.85)'; ctx.beginPath(); ctx.rect(-24,-42,48,78); ctx.fill();
  for(let u=0;u<5;u++){ctx.strokeStyle='rgba(60,80,100,0.8)'; ctx.lineWidth=1; ctx.beginPath(); ctx.rect(-22,-38+u*14,44,12); ctx.stroke(); ctx.fillStyle='rgba(40,50,60,0.8)'; ctx.fillRect(-20,-36+u*14,26,8);}
  glow(ledOn?'#44ff44':'transparent',ledOn?10:0); ctx.fillStyle=ledOn?'#44ff44':'#226622'; ctx.beginPath(); ctx.arc(-20,-28,3,0,Math.PI*2); ctx.fill(); noGlow();
  ctx.restore();
}

function drawMeltaway(cx, cy) {
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(0.08);
  // frost wrapper (barely visible)
  ctx.fillStyle='rgba(25,55,110,0.45)'; ctx.strokeStyle='rgba(84,200,255,0.3)'; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.roundRect(-34,-18,68,36,[3]); ctx.fill(); ctx.stroke();
  // the meltaway — brown chocolate brick
  ctx.fillStyle='rgba(88,45,15,0.85)'; ctx.beginPath(); ctx.roundRect(-28,-13,56,28,[2]); ctx.fill();
  ctx.fillStyle='rgba(140,75,30,0.5)'; ctx.fillRect(-26,-11,28,9); // lighter sheen
  // dusty surface (the signature meltaway texture)
  ctx.fillStyle='rgba(195,170,145,0.28)';
  [[-12,-4],[6,1],[-18,5],[14,-2],[-4,6]].forEach(([x,y])=>{ ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fill(); });
  // EPIC culinary label
  ctx.fillStyle='rgba(215,195,170,0.9)'; ctx.font='bold 7px monospace'; ctx.textAlign='center';
  ctx.fillText('EPIC culinary',0,-1);
  ctx.fillStyle='rgba(190,170,150,0.55)'; ctx.font='6px monospace';
  ctx.fillText('meltaway · 3rd shift',0,10);
  // frost crystals on edge
  ctx.strokeStyle='rgba(180,220,255,0.28)'; ctx.lineWidth=0.8;
  ctx.beginPath(); [-26,-16,-6,4,14,24].forEach(fx=>{ ctx.moveTo(fx,-18); ctx.lineTo(fx,-23); }); ctx.stroke();
  ctx.restore();
}

function drawEmployeeBadge(cx, cy) {
  ctx.save(); ctx.translate(cx,cy);
  ctx.fillStyle='rgba(15,50,110,0.55)'; ctx.strokeStyle='rgba(84,200,255,0.4)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(-28,-55,56,80,[4]); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='rgba(200,80,80,0.45)'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(0,-55); ctx.quadraticCurveTo(-12,-68,0,-72); ctx.quadraticCurveTo(12,-68,0,-55); ctx.stroke();
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
//  LEVEL DATA
// ══════════════════════════════════════════════════════════════
// Platforms: {x, y, w, h, ice}  — x/y = top-left corner
// Player/enemy y coord = feet = platform.y (top of platform)
function buildLevel() {
  const G = GROUND_Y;
  platforms = [
    // ground (not ice — normal friction)
    {x:-300, y:G, w:5600, h:100, ice:false},
    // elevated ice platforms
    {x:120,  y:G-130, w:170, h:18, ice:true},
    {x:450,  y:G-230, w:130, h:18, ice:true},
    {x:720,  y:G-140, w:200, h:18, ice:true},
    {x:1080, y:G-170, w:140, h:18, ice:true},
    {x:1340, y:G-270, w:110, h:18, ice:true},
    {x:1580, y:G-145, w:160, h:18, ice:true},
    {x:1860, y:G-200, w:130, h:18, ice:true},
    {x:2100, y:G-140, w:170, h:18, ice:true},
    {x:2380, y:G-200, w:130, h:18, ice:true},
    {x:2660, y:G-280, w:110, h:18, ice:true},
    {x:2920, y:G-150, w:155, h:18, ice:true},
    {x:3160, y:G-190, w:110, h:18, ice:true},
    // boss arena (sparse)
    {x:3620, y:G-150, w:120, h:18, ice:true},
    {x:3960, y:G-200, w:100, h:18, ice:true},
    {x:4260, y:G-155, w:120, h:18, ice:true},
  ];

  const G2 = G; // feet on ground
  enemies = [
    // Cold Shoulders
    {type:'cold', x:1150, y:G2, spawnX:1150, dir:1, hp:55, maxHp:55, iframes:0, state:'walk', patrolR:130},
    {type:'cold', x:1870, y:G2, spawnX:1870, dir:-1,hp:55, maxHp:55, iframes:0, state:'walk', patrolR:150},
    {type:'cold', x:2550, y:G2, spawnX:2550, dir:1, hp:55, maxHp:55, iframes:0, state:'walk', patrolR:120},
    {type:'cold', x:3000, y:G2, spawnX:3000, dir:-1,hp:55, maxHp:55, iframes:0, state:'walk', patrolR:110},
    // Memos (float — y is center height)
    {type:'memo', x:1360, y:G-200, baseY:G-200, dir:1, hp:35, maxHp:35, iframes:0, state:'idle', chargeTimer:120},
    {type:'memo', x:2140, y:G-240, baseY:G-240, dir:-1,hp:35, maxHp:35, iframes:0, state:'idle', chargeTimer:90},
    {type:'memo', x:2820, y:G-210, baseY:G-210, dir:1, hp:35, maxHp:35, iframes:0, state:'idle', chargeTimer:150},
  ];

  items = [
    {type:'dunkin',  x:370,  y:G2-30, collected:false},
    {type:'shovel',  x:820,  y:G-140-40, collected:false},
    {type:'dunkin',  x:2200, y:G2-30, collected:false},
    {type:'blunt',   x:0,    y:0,     collected:false, visible:false},
  ];

  props = [
    {type:'server',   x:200,  y:G-130-50},
    {type:'badge',    x:420,  y:G2-30},
    {type:'meltaway', x:1640, y:G2-22},
    {type:'backup',   x:3350, y:G2-30},
  ];
}

// ══════════════════════════════════════════════════════════════
//  GAME STATE
// ══════════════════════════════════════════════════════════════
let platforms=[], enemies=[], items=[], props=[], projectiles=[];

const player = {
  x:100, y:0, // y set after buildLevel
  vx:0, vy:0,
  onGround:false,
  onIce:false,
  facing:1,
  hp:100, maxHp:100,
  coldMeter:100,
  weapon:null,  // null | 'shovel'
  hasParka:false,
  buffTimer:0,
  iframes:0,
  attackTimer:0,
  attackActive:0,
  attackAnim:0,
  slideTimer:0,
  state:'idle',
  dead:false,
};

const midnight = {
  x:680, y:0,
  state:'idle',
  talked:false,
  bluntDropped:false,
  mooTimer:0,
};

const boss = {
  x:4100, y:0,
  hp:350, maxHp:350,
  phase:1,
  dir:-1,
  state:'idle',
  attackTimer:180,
  walkSpeed:1.0,
  triggered:false,
  demonTaunted:false,
  dead:false,
  iframes:0,
  deathTimer:0,
};

const camera = { x:0, targetX:0 };

// ── Captions / UI state ───────────────────────────────────────
let captionEl, gameOverEl, winScreenEl;
let captionTimeout=null;
let demonOverlay=null; // { lines:[], idx:0, active:bool }
let gamePhase='playing'; // 'playing' | 'gameover' | 'win' | 'demon'

function setCaption(text, duration=3200) {
  if(!captionEl) return;
  captionEl.style.opacity='1';
  captionEl.textContent=text;
  if(captionTimeout) clearTimeout(captionTimeout);
  captionTimeout=setTimeout(()=>{ captionEl.style.opacity='0'; },duration);
}

// ── Milestones (triggered once) ───────────────────────────────
const milestones = {
  intro:false, midnight:false, preBoss:false, phase2:false,
};

// ══════════════════════════════════════════════════════════════
//  INPUT
// ══════════════════════════════════════════════════════════════
const keys = {};
// Clear all keys on blur — prevents sticky-key glitch when
// browser loses focus mid-keydown (e.g. Shift + direction combos)
window.addEventListener('blur',  () => { for(const k in keys) keys[k]=false; });
window.addEventListener('focus', () => { for(const k in keys) keys[k]=false; });
window.addEventListener('keydown', e => {
  keys[e.code]=true;
  if(e.code==='Space') e.preventDefault();

  // demon overlay advance
  if(demonOverlay && demonOverlay.active) {
    if(e.code==='Space'||e.code==='Enter'||e.code==='KeyZ') {
      demonOverlay.idx++;
      if(demonOverlay.idx>=demonOverlay.lines.length) {
        demonOverlay.active=false; demonOverlay=null;
        gamePhase='playing';
      }
    }
    return;
  }

  // interact with Midnight
  if(e.code==='KeyX') {
    const dx=Math.abs(player.x-midnight.x);
    if(dx<90 && !midnight.talked) {
      midnight.talked=true;
      midnight.state='give';
      midnight.mooTimer=0;
      // drop blunt
      const bl=items.find(i=>i.type==='blunt');
      if(bl){ bl.x=midnight.x-80; bl.y=midnight.y-30; bl.visible=true; }
      setCaption('moo.', 2800);
      setTimeout(()=>{ midnight.state='idle'; },2200);
    } else if(dx<90) {
      setCaption('...moo.', 2000);
    }
  }

  // attack
  if((e.code==='KeyZ'||e.code==='KeyJ') && player.attackTimer<=0 && !player.dead) {
    player.attackActive=14;
    player.attackTimer=player.weapon==='shovel'?420:340;
    player.attackAnim=14;
  }
});
window.addEventListener('keyup', e => { keys[e.code]=false; });

// ══════════════════════════════════════════════════════════════
//  PHYSICS & COLLISION
// ══════════════════════════════════════════════════════════════
const GRAVITY=0.55, JUMP_VEL=-13, MOVE_SPEED=3.8;

function playerRect(px,py) {
  if(player.slideTimer>0) return {x:px-20,y:py-20,w:40,h:20};
  return {x:px-9,y:py-42,w:18,h:42};
}
function enemyRect(e) {
  if(e.type==='memo') return {x:e.x-22,y:e.y-20,w:44,h:40};
  return {x:e.x-14,y:e.y-55,w:28,h:55};
}
function rectsOverlap(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }

function resolvePlayer() {
  const SPEED = player.buffTimer>0 ? MOVE_SPEED*1.4 : MOVE_SPEED;
  const moveL=keys['ArrowLeft']||keys['KeyA'];
  const moveR=keys['ArrowRight']||keys['KeyD'];
  const jump=keys['ArrowUp']||keys['KeyW']||keys['Space'];
  const slideKey=keys['ArrowDown']||keys['KeyS'];

  // slide — press down while running on ground
  if(slideKey && player.onGround && Math.abs(player.vx)>1.5 && player.slideTimer<=0) {
    player.slideTimer=22;
  }
  if(player.slideTimer>0) {
    player.slideTimer--;
    player.vx*=1.02; // carry momentum through slide
  }

  if(moveL) { player.vx -= 0.7; player.facing=-1; }
  if(moveR) { player.vx += 0.7; player.facing= 1; }
  player.vx = Math.max(-SPEED, Math.min(SPEED, player.vx));

  // friction
  const fric=player.onIce?0.97:0.82;
  if(!moveL&&!moveR) player.vx*=fric;

  player.vy+=GRAVITY;
  player.x+=player.vx; player.y+=player.vy;

  player.onGround=false; player.onIce=false;
  const pr=playerRect(player.x,player.y);

  for(const p of platforms) {
    const prevBottom=pr.y+pr.h-player.vy;
    const platTop=p.y;
    if(pr.x+pr.w>p.x && pr.x<p.x+p.w &&
       pr.y+pr.h>platTop && prevBottom<=platTop+2 &&
       player.vy>=0) {
      player.y=p.y; player.vy=0; player.onGround=true;
      if(p.ice) player.onIce=true;
    }
  }
  // kill plane
  if(player.y>GROUND_Y+300) { player.y=GROUND_Y; player.vy=0; takeDamage(15,'fall'); }

  if(jump && player.onGround) { player.vy=JUMP_VEL; player.onGround=false; }

  // clamp left edge
  if(player.x<20) { player.x=20; player.vx=0; }
}

// ══════════════════════════════════════════════════════════════
//  COMBAT
// ══════════════════════════════════════════════════════════════
function takeDamage(amt, src) {
  if(player.iframes>0||player.dead) return;
  player.hp-=amt;
  player.iframes=60;
  if(src==='cold') { player.vx+=(-player.facing)*5; }
  if(player.hp<=0) { player.dead=true; player.hp=0; gamePhase='gameover'; setTimeout(()=>{ gameOverEl.style.display='flex'; },800); }
}

function doPlayerAttack() {
  if(player.attackActive<=0) return;
  const reach=player.weapon==='shovel'?70:48;
  const halfH=player.weapon==='shovel'?30:22;
  const ax=player.facing>0 ? player.x : player.x-reach;
  const ar={x:ax, y:player.y-42+20-halfH, w:reach, h:halfH*2};
  const dmg=player.weapon==='shovel'?32:25;
  const bonus=player.buffTimer>0?1.2:1;

  enemies.forEach(e=>{
    if(e.hp<=0||e.iframes>0) return;
    if(rectsOverlap(ar,enemyRect(e))){ e.hp-=Math.floor(dmg*bonus); e.iframes=30; if(e.hp<=0) e.state='dead'; }
  });

  // boss
  if(!boss.dead&&boss.triggered&&boss.iframes<=0) {
    const br={x:boss.x-22,y:boss.y-130,w:44,h:130};
    if(rectsOverlap(ar,br)) {
      boss.hp-=Math.floor(dmg*bonus); boss.iframes=20;
      // phase 2 trigger
      if(boss.hp<boss.maxHp*0.5&&boss.phase===1&&!boss.demonTaunted) {
        boss.phase=2; boss.walkSpeed=1.8; boss.attackTimer=120;
        boss.demonTaunted=true;
        triggerDemonTaunt();
      }
      if(boss.hp<=0) { boss.dead=true; boss.hp=0; boss.state='dead'; setTimeout(endWin,2200); }
    }
  }

  // knock spreadsheets out of air with shovel
  if(player.weapon==='shovel') {
    projectiles=projectiles.filter(p=>{ if(rectsOverlap(ar,{x:p.x-22,y:p.y-15,w:44,h:30})){ return false; } return true; });
  }
}

// ══════════════════════════════════════════════════════════════
//  ENEMY AI
// ══════════════════════════════════════════════════════════════
const COLD_SPEED=0.9, MEMO_SPEED=1.6;

function updateEnemies() {
  enemies.forEach(e=>{
    if(e.hp<=0) return;
    if(e.iframes>0) e.iframes--;

    if(e.type==='cold') {
      e.state='walk';
      e.x+=e.dir*COLD_SPEED;
      if(Math.abs(e.x-e.spawnX)>e.patrolR) e.dir*=-1;
      // contact damage
      if(e.iframes===0) {
        const pr=playerRect(player.x,player.y);
        if(rectsOverlap(pr,enemyRect(e))) takeDamage(10,'cold');
      }
    }

    if(e.type==='memo') {
      e.chargeTimer--;
      if(e.chargeTimer<=0) {
        // drift toward player briefly
        const dx=player.x-e.x, dy=player.y-50-e.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        e.x+=dx/dist*MEMO_SPEED*1.8;
        e.y+=dy/dist*MEMO_SPEED*0.8;
        e.chargeTimer=150;
        e.state='attack';
      } else {
        // float idle
        e.x+=e.dir*0.6;
        e.y=e.baseY+Math.sin(t*0.05)*18;
        if(Math.abs(e.x-(e.spawnX||e.x))>100) e.dir*=-1;
        e.state='idle';
      }
      // contact damage
      const pr=playerRect(player.x,player.y);
      if(rectsOverlap(pr,{x:e.x-22,y:e.y-20,w:44,h:40})) takeDamage(8,'memo');
    }

    // store spawnX for memos
    if(e.type==='memo'&&!e.spawnX) e.spawnX=e.x;
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

  // walk toward player
  boss.x+=boss.dir*boss.walkSpeed;
  boss.state=boss.phase===2?'phase2':'phase1';

  // attack: throw spreadsheets
  const atkInterval=boss.phase===2?100:160;
  if(boss.attackTimer<=0) {
    boss.attackTimer=atkInterval;
    boss.state=boss.phase===2?'attack2':'attack';
    const count=boss.phase===2?3:1;
    for(let i=0;i<count;i++) {
      const spread=(i-(count-1)/2)*0.35;
      const spd=boss.phase===2?5:4;
      projectiles.push({x:boss.x+boss.dir*30, y:boss.y-80, vx:boss.dir*spd+spread*2, vy:-2+spread, type:'sheet', age:0});
    }
  }

  // contact damage
  if(boss.iframes===0) {
    const pr=playerRect(player.x,player.y);
    if(rectsOverlap(pr,{x:boss.x-22,y:boss.y-130,w:44,h:130})) takeDamage(20,'boss');
  }
}

function updateProjectiles() {
  projectiles.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.2; p.age++; });
  // remove fallen or old
  projectiles=projectiles.filter(p=>p.y<GROUND_Y+50&&p.age<300);
  // hit player
  projectiles.forEach(p=>{
    const pr=playerRect(player.x,player.y);
    if(rectsOverlap(pr,{x:p.x-22,y:p.y-15,w:44,h:30})) { takeDamage(18,'sheet'); p.age=999; }
  });
}

// ══════════════════════════════════════════════════════════════
//  ITEM PICKUPS
// ══════════════════════════════════════════════════════════════
function updateItems() {
  const pr=playerRect(player.x,player.y);
  items.forEach(item=>{
    if(item.collected) return;
    if(!item.visible&&item.type==='blunt') return;
    const ir={x:item.x-18,y:item.y-35,w:36,h:50};
    if(rectsOverlap(pr,ir)) {
      item.collected=true;
      if(item.type==='dunkin')  { player.hp=Math.min(player.maxHp,player.hp+40); setCaption('dunkin. even at 4am. especially at 4am. +40 hp',2000); }
      if(item.type==='blunt')   { player.buffTimer=900; setCaption("midnight's gift. speed up. damage up. 15 seconds.",2500); }
      if(item.type==='shovel')  { player.weapon='shovel'; setCaption('snow shovel equipped. wide swing. knocks spreadsheets.',2500); }
    }
  });
}

// ══════════════════════════════════════════════════════════════
//  COLD METER
// ══════════════════════════════════════════════════════════════
function updateCold() {
  if(player.hasParka) return;
  // drains over ~4 minutes (14400 frames at 60fps)
  if(t%4===0) player.coldMeter=Math.max(0,player.coldMeter-1);
  if(player.coldMeter<=0 && t%180===0) takeDamage(8,'cold');
  const bar=document.getElementById('cold-bar');
  if(bar) bar.style.width=player.coldMeter+'%';
}

// ══════════════════════════════════════════════════════════════
//  MILESTONE TRIGGERS
// ══════════════════════════════════════════════════════════════
function checkMilestones() {
  if(!milestones.intro) { milestones.intro=true; setTimeout(()=>setCaption('the freezer.\nwisconsin. 4:12 am.\nyou\'ve been here before.',3500),400); }
  if(!milestones.midnight&&Math.abs(player.x-midnight.x)<200) {
    milestones.midnight=true;
    // timed dialogue sequence
    midnight.state='moo';
    setCaption('moo moo moooooo. moo moo.', 2600);
    setTimeout(()=> setCaption('[you]:  ...you read my mind.', 2200), 2800);
    setTimeout(()=> setCaption('[you]:  didn\'t expect to see you here.', 2400), 5200);
    setTimeout(()=>{ midnight.state='moo'; setCaption('moo.', 1800); }, 7800);
    setTimeout(()=> setCaption('[you]:  yeah. the corporation.', 2400), 9800);
    setTimeout(()=>{ midnight.state='idle'; setCaption('[ X ] to interact — she has something for you', 3200); }, 12400);
  }
  if(!milestones.preBoss&&player.x>3400) {
    milestones.preBoss=true;
    boss.triggered=true;
    setCaption('THE DIRECTOR', 1400);
    setTimeout(()=> setCaption('"this needs to be done by end of day."', 2600), 1600);
    setTimeout(()=> setCaption('"end of day was six hours ago."', 2600), 4400);
    setTimeout(()=> setCaption('"we know. it still needs to be done."', 2600), 7200);
  }
}

// ══════════════════════════════════════════════════════════════
//  DEMON TAUNT OVERLAY
// ══════════════════════════════════════════════════════════════
function triggerDemonTaunt() {
  gamePhase='demon';
  demonOverlay={
    lines:[
      '"even cows know when to leave."',
      '"clint knew."',
      '"do you?"',
    ],
    idx:0,
    active:true,
  };
}

// ══════════════════════════════════════════════════════════════
//  WIN
// ══════════════════════════════════════════════════════════════
function endWin() {
  gamePhase='win';
  setCaption('you found it.\nthe backup is warm.',2500);
  setTimeout(()=>{ winScreenEl.style.display='flex'; },2200);
}

// ══════════════════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════════════════
function drawBackground() {
  // sky gradient
  const grad=ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#070f18'); grad.addColorStop(1,'#0c1e2e');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

  // distant buildings (parallax 0.15×)
  const bx=-camera.x*0.15;
  ctx.fillStyle='rgba(10,20,35,0.9)';
  [[bx+200,H-160,80,160],[bx+340,H-240,60,240],[bx+500,H-180,90,180],
   [bx+700,H-130,70,130],[bx+900,H-200,55,200],[bx+1100,H-150,80,150]].forEach(([x,y,w,h])=>{
    ctx.fillRect(x,y,w,h);
    // lit windows
    ctx.fillStyle='rgba(255,220,120,0.25)';
    for(let wy=y+20;wy<y+h-10;wy+=28) for(let wx=x+8;wx<x+w-8;wx+=18) {
      if(Math.sin(wx*0.7+wy*0.3)>0.2) ctx.fillRect(wx,wy,8,12);
    }
    ctx.fillStyle='rgba(10,20,35,0.9)';
  });

  // snow
  ctx.fillStyle='rgba(232,244,255,0.75)';
  FLAKES.forEach(f=>{
    f.x=(f.x+f.drift+0.0001)%1; f.y=(f.y+f.speed)%1;
    ctx.beginPath(); ctx.arc(f.x*W,f.y*H,f.r,0,Math.PI*2); ctx.fill();
  });
}

function drawWorld() {
  ctx.save(); ctx.translate(-camera.x,0);

  // platforms
  platforms.forEach(p=>{
    if(p.ice) {
      drawIcePlatform(p.x+p.w/2, p.y, p.w);
    } else {
      // ground — simple snow field
      ctx.fillStyle='rgba(15,40,80,0.7)'; ctx.fillRect(p.x,p.y,p.w,p.h);
      ctx.fillStyle='rgba(232,244,255,0.15)'; ctx.fillRect(p.x,p.y,p.w,6);
      glow(ICE,4); ctx.strokeStyle='rgba(84,200,255,0.25)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+p.w,p.y); ctx.stroke(); noGlow();
    }
  });

  // props
  props.forEach(p=>{
    if(p.type==='server')   drawFrozenServer(p.x,p.y);
    if(p.type==='badge')    drawEmployeeBadge(p.x,p.y);
    if(p.type==='meltaway') drawMeltaway(p.x,p.y);
    if(p.type==='backup')   drawBackupFile(p.x,p.y);
  });

  // items
  items.forEach(item=>{
    if(item.collected) return;
    if(!item.visible&&item.type==='blunt') return;
    const bob=Math.sin(t*0.06)*4;
    if(item.type==='dunkin')  drawDunkin(item.x,item.y+bob);
    if(item.type==='blunt')   drawBluntItem(item.x,item.y+bob);
    if(item.type==='shovel')  drawShovelItem(item.x,item.y+bob);
  });

  // projectiles
  projectiles.forEach(p=>{ drawSpreadsheet(p.x,p.y); });

  // enemies
  enemies.forEach(e=>{
    if(e.hp<=0) return;
    if(e.type==='cold') drawColdShoulder(e.x,e.y,e.state);
    if(e.type==='memo')  drawMemo(e.x,e.y,e.state);
    // HP bar above enemy
    ctx.save(); ctx.translate(e.x,e.type==='memo'?e.y-35:e.y-65);
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(-18,-4,36,6);
    ctx.fillStyle=e.type==='memo'?'#ff4466':ICE;
    ctx.fillRect(-18,-4,36*(e.hp/e.maxHp),6);
    ctx.restore();
  });

  // Midnight NPC
  drawMidnight(midnight.x, midnight.y, midnight.state);
  // interact hint
  if(Math.abs(player.x-midnight.x)<90&&!midnight.talked) {
    ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.font='9px Courier New'; ctx.textAlign='center';
    ctx.fillText('[X]',midnight.x,midnight.y-80);
  }

  // boss
  if(boss.triggered&&!boss.dead) {
    ctx.save(); ctx.scale(boss.dir,1); ctx.translate(boss.dir>0?0:-2*boss.x,0);
    drawDirector(boss.x*boss.dir, boss.y, boss.phase===2?(boss.state==='attack2'?'attack2':'phase2'):(boss.state==='attack'?'attack':'phase1'));
    ctx.restore();
    // HP bar
    ctx.save(); ctx.translate(boss.x,boss.y-145);
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(-40,-6,80,10);
    ctx.fillStyle='#ff2244'; ctx.fillRect(-40,-6,80*(boss.hp/boss.maxHp),10);
    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='8px Courier New'; ctx.textAlign='center';
    ctx.fillText('THE DIRECTOR',0,-10); ctx.restore();
  }

  // player
  const pState=player.slideTimer>0?'slide':player.onGround?(Math.abs(player.vx)>0.5?'run':'idle'):'jump';
  if(player.slideTimer>0) {
    // slide pose — crouched horizontal
    ctx.save(); ctx.translate(player.x, player.y-10); ctx.scale(player.facing,1);
    glow('#c97eff',10);
    const C='#eeeef8', LW=2.5;
    limb(0,-8,-22,-4,LW,C); limb(0,-8,14,-14,LW,C); // legs out flat
    limb(0,-8,0,-22,LW,C);                            // torso low
    limb(0,-18,-18,-24,LW,C); limb(0,-18,10,-28,LW,C); // arms
    ctx.strokeStyle=C; ctx.lineWidth=LW; ctx.beginPath(); ctx.arc(0,-28,7,0,Math.PI*2); ctx.stroke();
    noGlow(); ctx.restore();
  } else if(player.hasParka) drawPlayerParka(player.x,player.y,pState,player.facing);
  else drawPlayer(player.x,player.y,pState,player.facing);
  if(player.weapon==='shovel') drawShovelHeld(player.x,player.y,player.facing);
  if(player.attackAnim>0) {
    drawAttackArc(player.x,player.y,player.facing,player.weapon==='shovel');
    player.attackAnim--;
  }

  ctx.restore();
}

function drawHUD() {
  // hearts
  const hc=document.getElementById('hearts-canvas');
  const hCtx=hc?.getContext('2d'); if(!hCtx) return;
  hCtx.clearRect(0,0,hc.width,hc.height);
  const maxH=Math.ceil(player.maxHp/25);
  const curH=player.hp/25;
  for(let i=0;i<maxH;i++) {
    hCtx.fillStyle=i<curH?'#ff4466':'rgba(255,255,255,0.12)';
    hCtx.beginPath(); hCtx.arc(10+i*22,12,8,0,Math.PI*2); hCtx.fill();
    if(i<curH&&player.iframes>0&&Math.floor(t/4)%2===0) { hCtx.fillStyle='rgba(255,255,255,0.5)'; hCtx.beginPath(); hCtx.arc(10+i*22,12,8,0,Math.PI*2); hCtx.fill(); }
  }
  const wpnEl=document.getElementById('weapon-hud');
  if(wpnEl) wpnEl.textContent=player.weapon?`[ ${player.weapon} ]`:'[ fists ]';
  const buffEl=document.getElementById('buff-hud');
  if(buffEl) buffEl.textContent=player.buffTimer>0?`BUFF: ${Math.ceil(player.buffTimer/60)}s`:'';
}

function drawDemonOverlay() {
  if(!demonOverlay||!demonOverlay.active) return;
  ctx.fillStyle='rgba(5,10,18,0.78)'; ctx.fillRect(0,0,W,H);
  // simple silhouette
  ctx.save(); ctx.translate(W/2-100,H/2+40); ctx.scale(0.6,0.6);
  ctx.fillStyle='rgba(0,0,0,0.9)'; ctx.strokeStyle='rgba(255,50,80,0.25)'; ctx.lineWidth=2;
  // crude demon shape: head + cape
  ctx.beginPath(); ctx.arc(0,-80,18,0,Math.PI*2); ctx.fill(); ctx.stroke();
  limb(0,-62,0,-20,8,'rgba(20,10,30,0.9)');
  limb(0,-20,-20,20,8,'rgba(20,10,30,0.9)'); limb(0,-20,20,20,8,'rgba(20,10,30,0.9)');
  ctx.restore();
  // text
  const line=demonOverlay.lines[demonOverlay.idx]||'';
  ctx.fillStyle='rgba(255,60,80,0.85)'; ctx.font='14px Courier New'; ctx.textAlign='center';
  ctx.fillText(line, W/2, H/2+20);
  ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.font='9px Courier New';
  ctx.fillText('[ space / enter ]', W/2, H/2+50);
}

// ══════════════════════════════════════════════════════════════
//  GAME LOOP
// ══════════════════════════════════════════════════════════════
function loop() {
  requestAnimationFrame(loop);
  t++;

  if(gamePhase!=='gameover'&&gamePhase!=='win') {
    if(gamePhase==='playing') {
      resolvePlayer();
      updateEnemies();
      updateBoss();
      updateProjectiles();
      updateItems();
      updateCold();
      checkMilestones();
      if(player.attackTimer>0) player.attackTimer--;
      if(player.attackActive>0) { doPlayerAttack(); player.attackActive--; }
      if(player.buffTimer>0) player.buffTimer--;
      if(player.iframes>0) player.iframes--;
      if(boss.iframes>0)   boss.iframes--;
    }

    // camera
    camera.targetX=player.x-W/2;
    camera.targetX=Math.max(0,Math.min(camera.targetX,4800-W));
    camera.x+=(camera.targetX-camera.x)*0.1;
  }

  // render
  drawBackground();
  drawWorld();
  drawHUD();
  if(gamePhase==='demon') drawDemonOverlay();
}

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
function init() {
  captionEl   = document.getElementById('caption');
  gameOverEl  = document.getElementById('game-over');
  winScreenEl = document.getElementById('win-screen');

  buildLevel();

  player.y   = GROUND_Y;
  midnight.y = GROUND_Y;
  boss.y     = GROUND_Y;

  loop();
}

init();
