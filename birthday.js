"use strict";

const $ = (selector) => document.querySelector(selector);
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const scenes = [...document.querySelectorAll(".scene")];
const captions = ["Love, on paper", "Coffee for two", "Between the pages", "Afternoon light", "Cherry sweet", "A quiet sunset", "Make a wish", "Close to my heart"];
const photoPath = (index) => "assets/photos/" + String(index + 1).padStart(2, "0") + ".jpg";
const sounds = {context:null, active:false, timer:0, beat:0};
let current = "opening";
let sceneTimers = [];
let treeFrame = 0;

function later(callback, delay) {
  sceneTimers.push(window.setTimeout(callback, delay));
}
function announce(message) { $("#announce").textContent = message; }
function show(name) {
  sceneTimers.forEach(clearTimeout);
  sceneTimers = [];
  cancelAnimationFrame(treeFrame);
  clearInterval(puzzleClock);
  if (current === "letter") $("#voice").pause();
  current = name;
  scenes.forEach((scene) => {
    scene.hidden = scene.id !== name;
    scene.classList.toggle("enter", !scene.hidden);
  });
  window.scrollTo(0, 0);
  const scene = document.getElementById(name);
  const heading = scene.querySelector("h1,h2,button") || scene;
  if (!heading.matches("button")) heading.tabIndex = -1;
  heading.focus({preventScroll:true});
  if (name === "dedication") later(() => show("tree"), reduced.matches ? 1800 : 2900);
  if (name === "tree") { bloomTree(); later(() => show("gift"), reduced.matches ? 2000 : 4000); }
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

function bloomTree() {
  const canvas=$("#tree-art"),ctx=canvas.getContext("2d");
  let points=[],branches=[];
  let seed=27;
  function random(){seed=seed*16807%2147483647;return (seed-1)/2147483646;}
  function branch(x,y,len,ang,depth) {
    const nx=x+Math.sin(ang)*len,ny=y-Math.cos(ang)*len;
    branches.push({x,y,nx,ny,depth});
    if(depth<5) {
      branch(nx,ny,len*(.64+random()*.13),ang-.31-random()*.41,depth+1);
      branch(nx,ny,len*(.65+random()*.13),ang+.31+random()*.39,depth+1);
    }
  }
  branch(0,.94,.34,.025,0);
  const colors=["#ee8fa1","#dd4878","#efa87a","#f3c665","#d65b89","#ee7791","#fba0ac"];
  while(points.length<440) {
    const x=random()*2.3-1.15,y=random()*2.35-1.05;
    if((x*x+y*y-1)**3-x*x*y**3>0)continue;
    points.push({x:x*.33,y:.32-y*.28,s:.009+random()*.012,shade:colors[Math.floor(random()*colors.length)],rank:Math.hypot(x,y+.8)*.42+random()*.18});
  }
  const start=performance.now();
  function render(now) {
    const width=canvas.clientWidth,height=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
    const t=reduced.matches?4:(now-start)/1000,scale=Math.min(width*1.12,height);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(width*(width>600?.57:.53),height-scale*.91);ctx.scale(scale,scale);
    for(const b of branches){
      const k=Math.max(0,Math.min(1,(t-b.depth*.13)/.42));
      if(!k)continue;
      ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x+(b.nx-b.x)*k,b.y+(b.ny-b.y)*k);ctx.lineCap="round";ctx.strokeStyle="#70434b";ctx.lineWidth=.025*Math.pow(.71,b.depth);ctx.stroke();
    }
    for(const p of points){
      const k=Math.max(0,Math.min(1,(t-.8-p.rank*1.5)*3));if(!k)continue;
      ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.s*k,p.s*k);ctx.beginPath();ctx.moveTo(0,1);ctx.bezierCurveTo(-1.6,-.2,-.65,-1.5,0,-.68);ctx.bezierCurveTo(.8,-1.6,1.6,-.15,0,1);ctx.fillStyle=p.shade;ctx.fill();ctx.restore();
    }
    ctx.restore();
    if(t<3.8 && current==="tree")treeFrame=requestAnimationFrame(render);
  }
  render(performance.now());
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
