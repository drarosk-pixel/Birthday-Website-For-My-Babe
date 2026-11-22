"use strict";

const $ = (selector) => document.querySelector(selector);
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const scenes = [...document.querySelectorAll(".scene")];
const captions = ["Love, on paper", "Coffee for two", "Between the pages", "Afternoon light", "Cherry sweet", "A quiet sunset", "Make a wish", "Close to my heart"];
const photoPath = (index) => "assets/photos/" + String(index + 1).padStart(2, "0") + ".jpg";
const sounds = {context:null, active:false, timer:0, beat:0};
let current = "opening";
let sceneTimers = [];
let stopTree = null;

function later(callback, delay) {
  sceneTimers.push(window.setTimeout(callback, delay));
}
function announce(message) { $("#announce").textContent = message; }
function show(name) {
  sceneTimers.forEach(clearTimeout);
  sceneTimers = [];
  if (stopTree) { stopTree(); stopTree = null; }
  clearInterval(puzzleClock);
  if (current === "letter") $("#voice").pause();
  const previous = document.getElementById(current);
  const outgoing = reduced.matches ? null : previous;
  const previousScroll = window.scrollY;
  current = name;
  for (const scene of scenes) {
    const active = scene.id === name;
    if (scene !== outgoing) scene.style.removeProperty("top");
    scene.hidden = !active && scene !== outgoing;
    scene.inert = !active;
    scene.classList.toggle("enter", active);
    scene.classList.toggle("departing", scene === outgoing);
  }
  if (outgoing) {
    outgoing.style.top = -previousScroll + "px";
    later(() => {
      outgoing.hidden = true;
      outgoing.classList.remove("departing");
      outgoing.style.removeProperty("top");
    }, 650);
  }
  window.scrollTo(0, 0);
  const scene = document.getElementById(name);
  const heading = scene.querySelector("h1,h2,button") || scene;
  if (!heading.matches("button")) heading.tabIndex = -1;
  heading.focus({preventScroll:true});
  if (name === "dedication") later(() => show("tree"), reduced.matches ? 1800 : 2900);
  if (name === "tree") {
    stopTree = bloomTree($("#tree-art"), reduced);
    later(() => show("gift"), reduced.matches ? 2000 : 4900);
  }
  if (name === "from") later(() => show("album"), 3200);
  if (name === "scratch") renderScratch();
  if (name === "puzzle") startPuzzle();
  if (name === "promises") updatePromises();
}
document.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", () => show(button.dataset.next)));
["scratch","puzzle","letter","promises"].forEach((name, index) => {
  const progress = document.querySelector("#" + name + " .room-progress");
  progress.setAttribute("aria-label", "Museum room " + (index + 1) + " of 4");
  for (let n=0; n<4; n++) {
    const dot = document.createElement("i");
    dot.classList.toggle("filled", n <= index);
    progress.append(dot);
  }
});

function tone(frequency, duration=.52, volume=.08, offset=0) {
  const ctx = sounds.context;
  if (!sounds.active || !ctx) return;
  const start = ctx.currentTime + offset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(volume,start+.025);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(start); osc.stop(start+duration+.04);
}
function musicBeat() {
  if (document.hidden || !$("#voice").paused) return;
  const tune = [523.25,659.25,783.99,659.25,587.33,698.46,880,698.46,523.25,659.25,830.61,659.25,493.88,587.33,783.99,587.33];
  const i = sounds.beat++ % tune.length;
  tone(tune[i],1.1,.038);
  if (i%4 === 0) tone([130.81,146.83,164.81,123.47][i/4],1.8,.04);
}
$("#sound").addEventListener("click", async () => {
  if (sounds.active) {
    sounds.active=false; clearInterval(sounds.timer);
  } else {
    const AudioEngine=window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) {announce("Music is unavailable in this browser.");return;}
    sounds.context ||= new AudioEngine();
    try { await sounds.context.resume(); } catch {announce("Music could not start.");return;}
    sounds.active=true; musicBeat(); sounds.timer=setInterval(musicBeat,530);
  }
  const label = sounds.active ? "Turn music off" : "Turn music on";
  $("#sound").setAttribute("aria-pressed",String(sounds.active));
  $("#sound").setAttribute("aria-label",label);
  $("#sound").title=label;
});
function particles(x,y,confetti=false) {
  if (reduced.matches) return;
  const colors=["#bf345e","#ec86a4","#eeb85b","#f49e94","#79435b"];
  const layer=$("#particles");
  for (let i=0;i<(confetti?65:21);i++) {
    const p=document.createElement("span");
    p.className="particle"+(confetti?" confetti":"");
    p.style.left=(confetti?Math.random()*100+"%":x+"px");
    p.style.top=confetti?"-18px":y+"px";
    const color=colors[i%colors.length];
    if (confetti) p.style.background=color;
    else {p.textContent=i%3?"♥":"✦";p.style.color=color;p.style.fontSize=8+Math.random()*13+"px";}
    p.style.setProperty("--x",(Math.random()-.5)*(confetti?230:180)+"px");
    p.style.setProperty("--y",(-28-Math.random()*130)+"px");
    p.style.setProperty("--spin",(Math.random()-.5)*520+"deg");
    p.style.setProperty("--duration",(confetti?2+Math.random()*1.3:.75+Math.random()*.6)+"s");
    if (confetti) p.style.animationDelay=Math.random()*.5+"s";
    layer.append(p);setTimeout(()=>p.remove(),4000);
  }
}

const bowCanvas=$("#bow-art"), bowButton=$("#bow");
let pull=0, bowStart=null, fired=false;
function line(ctx,points,color,width) {
  ctx.beginPath();ctx.moveTo(points[0],points[1]);ctx.lineTo(points[2],points[3]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function drawBow(tension=0, arrow=true) {
  const ctx=bowCanvas.getContext("2d");
  ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,180,180);
  ctx.lineJoin="round";ctx.lineCap="round";
  const x=89-tension*39,y=88+tension*38;
  ctx.beginPath();ctx.moveTo(31,25);ctx.lineTo(x,y);ctx.lineTo(150,142);ctx.strokeStyle="#9e8073";ctx.lineWidth=1.2;ctx.stroke();
  const bronze=ctx.createLinearGradient(26,15,149,150);
  [[0,"#be9370"],[.22,"#75482f"],[.49,"#473027"],[.53,"#a97754"],[.72,"#73432b"],[1,"#a67a55"]].forEach(([n,c])=>bronze.addColorStop(n,c));
  ctx.beginPath();ctx.moveTo(32,27);ctx.bezierCurveTo(27,15,22,26,24,39);ctx.bezierCurveTo(26,63,18,105,37,128);ctx.bezierCurveTo(55,148,100,141,136,148);ctx.bezierCurveTo(146,150,153,147,149,141);ctx.strokeStyle=bronze;ctx.lineWidth=4.9;ctx.stroke();
  line(ctx,[31,135,45,121],"#563124",9);
  for(let i=0;i<5;i++) line(ctx,[30+i*2.6,132-i*2.6,34+i*2.6,136-i*2.6],"#b88a66",1.5);
  for(const [ax,ay] of [[32,27],[149,142]]) {ctx.fillStyle="#caad72";ctx.beginPath();ctx.arc(ax,ay,2.8,0,2*Math.PI);ctx.fill();}
  if (!arrow) return;
  ctx.save();ctx.translate(x-7,y+8);ctx.rotate(-Math.PI/4);
  line(ctx,[-13,0,82,0],"#735037",2.4);line(ctx,[-10,-.6,81,-.6],"#deba77",.85);
  ctx.fillStyle="#c14a69";ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(-21,-8);ctx.quadraticCurveTo(-7,-11,2,-3);ctx.lineTo(6,0);ctx.closePath();ctx.fill();
  ctx.fillStyle="#e7889f";ctx.beginPath();ctx.moveTo(-10,1);ctx.lineTo(-19,8);ctx.quadraticCurveTo(-4,9,5,1);ctx.fill();
  for(let i=-11;i<1;i+=3)line(ctx,[i,-1,i-5,-6],"#e6a0aa",.7);
  ctx.fillStyle="#d8ad54";ctx.beginPath();ctx.moveTo(86,0);ctx.lineTo(74,-5);ctx.quadraticCurveTo(68,-2,73,0);ctx.quadraticCurveTo(68,3,74,5);ctx.closePath();ctx.fill();
  ctx.restore();
}
drawBow();
bowButton.addEventListener("pointerdown",e=>{
  if(fired || !e.isPrimary || e.button!==0)return;
  bowStart={x:e.clientX,y:e.clientY};bowButton.setPointerCapture(e.pointerId);drawBow(.18);
});
bowButton.addEventListener("pointermove",e=>{
  if(!bowStart)return;
  pull=Math.min(1,Math.hypot(e.clientX-bowStart.x,e.clientY-bowStart.y)/65);
  drawBow(.18+pull*.82);
});
bowButton.addEventListener("pointerup",()=>{if(bowStart){bowStart=null;fire();}});
bowButton.addEventListener("pointercancel",()=>{bowStart=null;pull=0;if(!fired)drawBow();});
bowButton.addEventListener("click",fire);$("#target").addEventListener("click",fire);$("#shoot").addEventListener("click",fire);
function fire() {
  if(fired || current!=="opening")return;
  fired=true;drawBow(0,false);
  const from=bowButton.getBoundingClientRect(),to=$("#target").getBoundingClientRect();
  const x=from.left+from.width*.53,y=from.top+from.height*.48,tx=to.left+to.width*.5,ty=to.top+to.height*.54;
  const arrow=document.createElement("span");
  arrow.setAttribute("aria-hidden","true");arrow.textContent="➳";
  Object.assign(arrow.style,{position:"fixed",left:x+"px",top:y+"px",zIndex:4,color:"#b3814d",font:"40px/1 Georgia",pointerEvents:"none"});
  $("#opening").append(arrow);
  const angle=Math.atan2(ty-y,tx-x)*180/Math.PI;
  arrow.animate([{transform:"translate(-50%,-50%) rotate("+angle+"deg)"},{transform:"translate("+(tx-x)+"px,"+(ty-y)+"px) rotate("+angle+"deg)"}],{duration:reduced.matches?1:360,easing:"ease-in",fill:"forwards"});
  later(()=>{arrow.remove();$("#opening").classList.add("shot");particles(tx,ty);tone(784);tone(1046,.6,.08,.12);},370);
  later(()=>{$("#always").hidden=false;announce("Still you. Always you. For Gunjan.");},850);
  later(()=>show("dedication"),2650);
}

// One shaded sprite per colour keeps leaf painting cheap during the bloom.
function heartLeafSprite([light, middle, dark]) {
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 64;
  const brush = sprite.getContext("2d");
  brush.beginPath();
  brush.moveTo(32, 58);
  brush.bezierCurveTo(24, 51, 2, 36, 3, 20);
  brush.bezierCurveTo(4, 3, 22, 1, 32, 15);
  brush.bezierCurveTo(44, -1, 62, 6, 61, 22);
  brush.bezierCurveTo(61, 37, 41, 53, 32, 58);
  brush.closePath();
  brush.clip();

  const colour = brush.createRadialGradient(20, 14, 1, 36, 31, 40);
  colour.addColorStop(0, light);
  colour.addColorStop(.52, middle);
  colour.addColorStop(1, dark);
  brush.fillStyle = colour;
  brush.fillRect(0, 0, 64, 64);
  const gleam = brush.createRadialGradient(18, 14, 1, 18, 14, 9);
  gleam.addColorStop(0, "rgba(255,255,255,.91)");
  gleam.addColorStop(1, "rgba(255,255,255,0)");
  brush.fillStyle = gleam;
  brush.fillRect(6, 3, 26, 25);
  return sprite;
}

function bloomTree(canvas, motion) {
  const ctx = canvas.getContext("2d");
  const sprites = [
    ["#ffd7e8", "#f77eaa", "#bb3471"], ["#ffcee2", "#ef639a", "#a72565"],
    ["#ffeaf2", "#f3a5c1", "#d1709c"], ["#ffc7d3", "#f58188", "#ca536e"],
    ["#fff1bf", "#ffc672", "#e49047"], ["#fff4ed", "#f1c6cb", "#d795ac"]
  ].map(heartLeafSprite);
  let seed = 27;
  function random() {
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  }
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => value * value * (3 - 2 * value);

  // The same crown coordinates guide the curved limbs and the staggered rows of leaves.
  const crown = new Path2D();
  crown.moveTo(180, 49);
  crown.bezierCurveTo(127, -22, 31, -6, 17, 70);
  crown.bezierCurveTo(2, 139, 88, 193, 180, 254);
  crown.bezierCurveTo(267, 194, 355, 141, 344, 75);
  crown.bezierCurveTo(331, -5, 237, -23, 180, 49);
  crown.closePath();

  const fork = {x:180, y:246, radius:6.5, arrival:.82};
  const limbs = [];
  function branch(parent, x, y, radius, bend) {
    x += (random() - .5) * 7;
    y += (random() - .5) * 8;
    const dx = x - parent.x, dy = y - parent.y;
    const length = Math.hypot(dx, dy);
    const controlX = (parent.x + x) / 2 - dy / length * bend;
    const controlY = (parent.y + y) / 2 + dx / length * bend;
    const tip = {x, y, radius, arrival:parent.arrival + length / 285};
    limbs.push({base:parent, tip, controlX, controlY});
    return tip;
  }
  for (const side of [-1, 1]) {
    const x = offset => 180 + side * offset;
    const arm = branch(fork, x(62), 166, 4.5, -7 * side);
    const outer = branch(arm, x(111), 107, 2.9, 5 * side);
    const high = branch(outer, x(116), 62, 1.5, -4 * side);
    branch(high, x(99), 28, .6, -3 * side);
    branch(high, x(140), 48, .6, 2 * side);
    branch(outer, x(153), 86, .7, 4 * side);
    const low = branch(arm, x(103), 147, 2, 5 * side);
    branch(low, x(134), 122, .7, 3 * side);
    const inner = branch(arm, x(51), 99, 2.7, 6 * side);
    const upper = branch(inner, x(69), 53, 1.6, -4 * side);
    branch(upper, x(77), 20, .6, 2 * side);
    branch(upper, x(44), 33, .6, 2 * side);
    branch(inner, x(33), 60, .8, 4 * side);
  }
  const middle = branch(fork, 178, 157, 4, 9);
  const centre = branch(middle, 184, 102, 2.2, -4);
  branch(centre, 166, 65, .7, 1);
  branch(centre, 202, 57, .7, -3);

  function pointOnLimb(limb, t) {
    const u = 1 - t;
    return {
      x:u*u*limb.base.x + 2*u*t*limb.controlX + t*t*limb.tip.x,
      y:u*u*limb.base.y + 2*u*t*limb.controlY + t*t*limb.tip.y
    };
  }
  // Buds start on nearby wood. The slight jitter breaks up rows without leaving bald patches.
  const anchors = limbs.flatMap(limb => [.25, .5, .75, 1].map(t => pointOnLimb(limb, t)));
  const backLeaves = [], frontLeaves = [];
  const palette = [0, 0, 1, 1, 2, 3, 4, 4, 5];
  for (let row = 0; row < 21; row++) {
    for (let col = 0; col < 23; col++) {
      const x = col * 15.5 + (row % 2) * 7.75 + (random() - .5) * 8;
      const y = 5 + row * 12.7 + (random() - .5) * 6;
      if (!ctx.isPointInPath(crown, x, y)) continue;
      let anchor = fork, nearest = Infinity;
      for (const point of anchors) {
        const distance = (point.x - x)**2 + (point.y - y)**2;
        if (distance < nearest) { nearest = distance; anchor = point; }
      }
      const layer = random() < .35 ? backLeaves : frontLeaves;
      layer.push({x, y, anchor, size:15 + random()*10, angle:(random()-.5)*1.05,
        sprite:sprites[palette[Math.floor(random()*palette.length)]],
        delay:1.12 + Math.hypot(x-fork.x, y-fork.y)*.0058 + random()*.19});
    }
  }

  // Paint a curved, tapered segment up to its growing tip.
  function wood(x, y, cx, cy, endX, endY, startRadius, endRadius, t) {
    if (t <= 0) return;
    const ax = x + (cx-x)*t, ay = y + (cy-y)*t;
    const bx = cx + (endX-cx)*t, by = cy + (endY-cy)*t;
    const tipX = ax + (bx-ax)*t, tipY = ay + (by-ay)*t;
    const distance = Math.hypot(tipX-x, tipY-y) || 1;
    const nx = (y-tipY)/distance, ny = (tipX-x)/distance;
    const radius = startRadius + (endRadius-startRadius)*t;
    const midRadius = (startRadius+radius)/2;
    ctx.beginPath();
    ctx.moveTo(x+nx*startRadius, y+ny*startRadius);
    ctx.quadraticCurveTo(ax+nx*midRadius, ay+ny*midRadius, tipX+nx*radius, tipY+ny*radius);
    ctx.lineTo(tipX-nx*radius, tipY-ny*radius);
    ctx.quadraticCurveTo(ax-nx*midRadius, ay-ny*midRadius, x-nx*startRadius, y-ny*startRadius);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tipX, tipY, radius, 0, Math.PI*2);
    ctx.fill();
  }

  function paintLeaves(leaves, t) {
    for (const leaf of leaves) {
      const growth = ease(clamp((t-leaf.delay)/.58));
      if (!growth) continue;
      const x = leaf.anchor.x + (leaf.x-leaf.anchor.x)*growth;
      const y = leaf.anchor.y + (leaf.y-leaf.anchor.y)*growth;
      const size = leaf.size*growth;
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(leaf.angle - .16*(1-growth));
      ctx.drawImage(leaf.sprite, -size/2, -size/2, size, size);
      ctx.restore();
    }
  }

  const start = performance.now();
  let frame = 0, width = 0, height = 0, ratio = 1;
  function render(now) {
    cancelAnimationFrame(frame);
    const t = motion.matches ? 5 : Math.max(0, (now-start)/1000);
    const portrait = width < height;
    const scale = Math.min(width*(portrait ? .96 : .71), height*.93)/360;
    if (!scale) return;
    const top = portrait ? (height-scale*260)*.33 : height*.048;
    const centreX = width*(portrait ? .5 : .57);
    const rootY = (height-top)/scale + 7;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    for (let i=0; i<8; i++) {
      const size = scale*(12+i%3*3);
      const x = width*((.07+i*.379)%1) + Math.sin(t*.4+i)*scale*5;
      const y = height*((.16+i*.237)%1) - Math.sin(t*.5+i*2)*scale*6;
      ctx.globalAlpha = .09 + (i%3)*.035;
      ctx.drawImage(sprites[i%sprites.length], x, y, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.translate(centreX-180*scale, top);
    ctx.scale(scale, scale);
    paintLeaves(backLeaves, t);
    ctx.fillStyle = "#583646";
    wood(177, rootY, 194, (rootY+fork.y)/2, fork.x, fork.y, 9, fork.radius, ease(clamp(t/.85)));
    for (const limb of limbs) {
      const {base, tip, controlX, controlY} = limb;
      const growth = clamp((t-base.arrival)/(tip.arrival-base.arrival));
      wood(base.x, base.y, controlX, controlY, tip.x, tip.y, base.radius*.85, tip.radius, growth);
    }
    paintLeaves(frontLeaves, t);
    if (!motion.matches && t<5) frame=requestAnimationFrame(render);
  }

  function resize() {
    width=canvas.clientWidth; height=canvas.clientHeight;
    ratio=Math.min(window.devicePixelRatio || 1, 2);
    canvas.width=Math.round(width*ratio); canvas.height=Math.round(height*ratio);
    render(performance.now());
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  motion.addEventListener("change", resize);
  resize();
  return () => {
    observer.disconnect();
    motion.removeEventListener("change", resize);
    cancelAnimationFrame(frame);
  };
}

$("#open-gift").addEventListener("click",()=>{
  const gift=$("#open-gift");if(gift.disabled)return;gift.disabled=true;
  gift.style.visibility="hidden";const rain=$(".rose-rain");
  const columns=Math.max(7,Math.ceil(innerWidth/84)),rows=Math.max(6,Math.ceil(innerHeight/82));
  for(let i=0;i<columns*rows;i++){
    const rose=document.createElement("img");rose.src="assets/rose.webp";rose.alt="";
    rose.style.left=((i%columns+Math.random()*.7-.2)*100/columns)+"%";rose.style.top=((Math.floor(i/columns)+Math.random()*.7-.2)*100/rows)+"%";
    rose.style.animationDelay=Math.random()*.4+"s";rose.style.setProperty("--spin",(Math.random()-.5)*140+"deg");
    rose.style.filter=["none","sepia(.4) saturate(.95) hue-rotate(-10deg)","saturate(.32) brightness(1.18)"][i%3];rain.append(rose);
  }
  tone(659);tone(880,.7,.07,.18);later(()=>{rain.replaceChildren();show("from");},reduced.matches?100:2960);
});
const angles=[-5,3,-4,-5,5,7,4,6];
captions.forEach((title,i)=>{
  const frame=document.createElement("div");frame.className="polaroid";
  frame.style.setProperty("--angle",angles[i]+"deg");frame.style.setProperty("--delay",i*.1+"s");
  const img=new Image();img.src=photoPath(i);img.alt=title;frame.append(img);$("#polaroids").append(frame);
});
let knocks=0;
$("#door").addEventListener("click",()=>{
  if(knocks>=3)return;knocks++;tone(157,.17,.12);
  $("#knocks").textContent="● ".repeat(knocks)+"○ ".repeat(3-knocks);
  const ring=$(".knocker");ring.classList.remove("hit");void ring.offsetWidth;ring.classList.add("hit");
  if(knocks===3){$("#door").classList.add("open");announce("Come in, Gunjan.");later(()=>show("scratch"),1450);}
  else announce(knocks+" of 3 knocks.");
});

const foil=$("#foil"), ink=foil.getContext("2d",{willReadFrequently:true});
let exhibitIndex=0, previousPoint=null, activeScratch=null;
const uncovered=new Set();
function renderScratch() {
  previousPoint=null;activeScratch=null;
  $("#scratch-photo").src=photoPath(exhibitIndex);$("#scratch-photo").alt=captions[exhibitIndex];
  $("#exhibit").textContent=captions[exhibitIndex];$("#photo-count").textContent=(exhibitIndex+1)+" / "+captions.length;
  foil.classList.toggle("revealed",uncovered.has(exhibitIndex));foil.tabIndex=uncovered.has(exhibitIndex)?-1:0;
  ink.globalCompositeOperation="source-over";const w=foil.width;
  const gold=ink.createLinearGradient(0,0,w,w);
  [[0,"#c4a16b"],[.25,"#e8d2a4"],[.55,"#d7b983"],[.85,"#c5a26b"],[1,"#dfc79d"]].forEach(([k,c])=>gold.addColorStop(k,c));
  ink.fillStyle=gold;ink.fillRect(0,0,w,w);
  for(let i=0;i<6000;i++){ink.fillStyle=i%2?"#fff5d120":"#785b3420";ink.fillRect(Math.random()*w,Math.random()*w,1.6,1.6);}
  ink.textAlign="center";ink.fillStyle="#583e28";ink.font="23px Georgia";ink.fillText("✦",w/2,w*.44);
  ink.font="bold 34px Georgia";ink.fillText("Scratch to see it",w/2,w*.54);
  ink.font="italic 20px Georgia";ink.fillText("move your finger here",w/2,w*.61);
}
function revealPhoto() {
  if(uncovered.has(exhibitIndex))return;
  uncovered.add(exhibitIndex);foil.classList.add("revealed");foil.tabIndex=-1;
  announce("Revealed "+captions[exhibitIndex]);tone(830,.48,.05);
}
function scratchPoint(e){
  const r=foil.getBoundingClientRect(),x=(e.clientX-r.left)*foil.width/r.width,y=(e.clientY-r.top)*foil.height/r.height;
  ink.globalCompositeOperation="destination-out";ink.strokeStyle="#000";ink.lineWidth=66;ink.lineCap="round";ink.lineJoin="round";
  ink.beginPath();ink.moveTo(previousPoint?.x??x-.1,previousPoint?.y??y);ink.lineTo(x,y);ink.stroke();previousPoint={x,y};
}
function checkCoverage(){
  const pixels=ink.getImageData(0,0,foil.width,foil.height).data;
  let clear=0,total=0;
  for(let y=8;y<foil.height;y+=16)for(let x=8;x<foil.width;x+=16){total++;if(pixels[(y*foil.width+x)*4+3]<100)clear++;}
  if(clear/total>.42)revealPhoto();
}
foil.addEventListener("pointerdown",e=>{
  if(activeScratch!==null||uncovered.has(exhibitIndex)||e.button!==0)return;
  activeScratch=e.pointerId;foil.setPointerCapture(e.pointerId);previousPoint=null;scratchPoint(e);
});
foil.addEventListener("pointermove",e=>{if(e.pointerId===activeScratch)scratchPoint(e);});
function finishScratch(e){if(e.pointerId!==activeScratch)return;previousPoint=null;activeScratch=null;checkCoverage();}
foil.addEventListener("pointerup",finishScratch);foil.addEventListener("pointercancel",finishScratch);
foil.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();revealPhoto();}});
function changePhoto(delta){exhibitIndex=(exhibitIndex+delta+captions.length)%captions.length;renderScratch();}
$("#prev-photo").addEventListener("click",()=>changePhoto(-1));$("#next-photo").addEventListener("click",()=>changePhoto(1));

let order=[],selected=null,moves=0,puzzleClock=0,started=0,solved=false,drag=null,swallowedClick=false;
const tiles=$("#tiles"),puzzlePhoto=photoPath(7);
const formatTime=s=>Math.floor(s/60)+":"+String(Math.floor(s)%60).padStart(2,"0");
function startPuzzle(){
  selected=null;moves=0;solved=false;started=Date.now();drag=null;swallowedClick=false;
  order=[2,1,0,3,4,5,6,8,7];$("#solved").hidden=true;$("#peek-image").src=puzzlePhoto;$("#peek-image").hidden=true;
  $("#timer").textContent="0:00";$("#moves").textContent="Moves 0";tiles.replaceChildren();
  order.forEach((_,i)=>{
    const tile=document.createElement("button");tile.className="tile";tile.dataset.slot=i;
    tile.style.backgroundImage="url('"+puzzlePhoto+"')";tiles.append(tile);
  });
  paintTiles();
  puzzleClock=setInterval(()=>{$("#timer").textContent=formatTime((Date.now()-started)/1000);},500);
}
function paintTiles(){
  [...tiles.children].forEach((tile,slot)=>{
    const part=order[slot];tile.style.backgroundPosition=(part%3*50)+"% "+(Math.floor(part/3)*50)+"%";
    tile.classList.toggle("selected",selected===slot);tile.setAttribute("aria-pressed",String(selected===slot));
    tile.setAttribute("aria-label","Position "+(slot+1)+", picture piece "+(part+1));tile.disabled=solved;
  });
}
function swapTiles(a,b){
  if(a===b||solved)return;
  [order[a],order[b]]=[order[b],order[a]];selected=null;moves++;
  $("#moves").textContent="Moves "+moves;solved=order.every((v,i)=>v===i);paintTiles();tone(523,.16,.06);
  if(solved){clearInterval(puzzleClock);$("#solved").hidden=false;particles(0,0,true);announce("Photo restored! The next room is open.");}
}
tiles.addEventListener("click",e=>{
  const tile=e.target.closest(".tile");if(!tile||solved)return;
  if(swallowedClick && e.detail){swallowedClick=false;return;}
  const slot=Number(tile.dataset.slot);
  if(selected===null||selected===slot){selected=selected===slot?null:slot;paintTiles();}else swapTiles(selected,slot);
});
tiles.addEventListener("pointerdown",e=>{
  const tile=e.target.closest(".tile");if(!tile||solved||!e.isPrimary||e.button!==0)return;
  swallowedClick=false;drag={id:e.pointerId,slot:Number(tile.dataset.slot)};tile.setPointerCapture(e.pointerId);
});
tiles.addEventListener("pointerup",e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest(".tile");
  if(target && Number(target.dataset.slot)!==drag.slot){swapTiles(drag.slot,Number(target.dataset.slot));swallowedClick=true;}
  drag=null;
});
tiles.addEventListener("pointercancel",()=>{drag=null;});
const peek=$("#peek"),peekImage=$("#peek-image");
peek.addEventListener("pointerdown",e=>{peek.setPointerCapture(e.pointerId);peekImage.hidden=false;});
["pointerup","pointercancel","lostpointercapture","blur"].forEach(event=>peek.addEventListener(event,()=>{peekImage.hidden=true;}));
peek.addEventListener("keydown",e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();peekImage.hidden=false;}});
peek.addEventListener("keyup",()=>{peekImage.hidden=true;});
$("#envelope").addEventListener("click",()=>{
  const envelope=$("#envelope");if(envelope.classList.contains("open"))return;
  envelope.classList.add("open");tone(659,.65,.07);
  later(()=>{$("#envelope-wrap").hidden=true;$("#letter-content").hidden=false;$("#letter-content").classList.add("enter");announce("Your letter is open.");$("#letter-heading").focus({preventScroll:true});},reduced.matches?50:900);
});
const voice=$("#voice"),play=$("#voice-play");
function voiceState(){
  const playing=!voice.paused&&!voice.ended;
  play.textContent=playing?"Ⅱ":"▶";play.setAttribute("aria-label",(playing?"Pause":"Play")+" birthday voice note");
  $("#voice-time").textContent=formatTime(playing?voice.currentTime:Number.isFinite(voice.duration)?voice.duration:0);
}
["loadedmetadata","timeupdate","play","pause","ended"].forEach(event=>voice.addEventListener(event,voiceState));
play.addEventListener("click",async()=>{
  if(!voice.paused){voice.pause();return;}
  try{await voice.play();}catch{announce("The voice note could not play. The birthday message is in the letter above.");}
});
const promises=["Never go to bed angry.","Say the hard thing, gently.","Always share the last bite.","Choose you again, every ordinary morning.","Pick you first. Every time."];
promises.forEach(p=>{
  const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.addEventListener("change",updatePromises);
  label.append(input,document.createTextNode(p));$("#checks").append(label);
});
function updatePromises(){
  const count=document.querySelectorAll("#checks input:checked").length;
  $("#sign").disabled=count!==promises.length;
  $("#sign").textContent=count===promises.length?"Make it official":"Tick every promise ("+count+"/"+promises.length+")";
}
$("#sign").addEventListener("click",()=>{
  if($("#sign").disabled)return;
  $("#checks").querySelectorAll("input").forEach(input=>input.disabled=true);
  $("#sign").hidden=true;$("#stamp").hidden=false;$("#birthday-wish").hidden=false;
  particles(0,0,true);tone(523);tone(659,.7,.08,.15);tone(784,.9,.08,.3);
  announce("Sealed with love. Happy birthday, Gunjan!");
  $("#restart").focus({preventScroll:true});
});
$("#restart").addEventListener("click",()=>window.location.reload());
