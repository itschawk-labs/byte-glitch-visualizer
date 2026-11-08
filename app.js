(() => {'use strict';
const byId = id => document.getElementById(id);
const canvas=byId('visual'),g=canvas.getContext('2d',{alpha:false});
const audio=byId('audio'),fileInput=byId('fileInput'),playButton=byId('play'),uploadButton=byId('upload');
const playText=byId('playText'),playIcon=byId('playIcon'),trackTitle=byId('trackTitle'),trackDetail=byId('trackDetail');
const trackTime=byId('trackTime'),progress=byId('progress'),progressFill=byId('progressFill');
const feedback=byId('feedback');
const FPS=30,FRAME_MS=1000/FPS,WIDTH=960,HEIGHT=1080;
const DEMO_NAME='NEGATIVE VELOCITY',DEMO_URL='assets/negative-velocity.m4a';
let audioContext=null,analyser=null,freq=null,wave=null,source=null;
let encodedState=null,fluidAmplitudes=null,lastFluidTime=0,playing=false;
let audioEnergy=.035,bass=0,mid=0,treble=0;
let bytes=new Uint8Array(65536),seed=171,lastBucket=-1;
let currentObjectUrl=null,isDemo=true,lastFrame=0,raf=0;
for(let i=0;i<bytes.length;i++)bytes[i]=mix(i+171)&255;

function mix(x){x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return (x^(x>>>16))>>>0;}
function clamp(v,a=0,b=1){return Math.min(b,Math.max(a,v));}
function formatTime(s,roundUp=false){if(!Number.isFinite(s)||s<0)return '0:00';const n=roundUp?Math.ceil(s):Math.floor(s);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
function setMessage(s,isError=false){feedback.textContent=s;feedback.classList.toggle('is-error',isError);}
function setPlayButton(){const isPlaying=!audio.paused&&!audio.ended;
 playing=isPlaying;playText.textContent=isPlaying?'Pause':(isDemo?'Play demo':'Play song');
 trackDetail.textContent=(isDemo?'DEMO TRACK':'LOCAL TRACK')+' · '+(isPlaying?'NOW PLAYING':(audio.ended?'FINISHED':'READY TO PLAY'));
 playIcon.innerHTML=isPlaying?'<rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/>':'<path d="M8 5.6a1 1 0 0 1 1.53-.85l9.15 6.4a1 1 0 0 1 0 1.7l-9.15 6.4A1 1 0 0 1 8 18.4V5.6z"/>';
 playButton.setAttribute('aria-label',isPlaying?'Pause audio':(isDemo?'Play demo song':'Play uploaded song'));
}
function seedFromBuffer(arrayBuffer){
 const arr=new Uint8Array(arrayBuffer); if(arr.length<8)return;
 bytes=arr;let hash=2166136261;
 for(let i=0;i<bytes.length;i+=61){hash=Math.imul(hash^bytes[i],16777619);}
 seed=hash>>>0;lastBucket=-1;fluidAmplitudes=null;stateAt(audio.currentTime||0);
 drawFrame();
}
async function loadDemoBytes(){
 try{
   // File bytes are only used locally to seed the simulated qubit amplitudes.
   const response=await fetch(DEMO_URL,{headers:{Range:'bytes=0-262143'}});
   if(!response.ok)throw Error('byte sample unavailable');
   const sample=await response.arrayBuffer();
   if(isDemo)seedFromBuffer(sample.slice(0,262144));
 }catch(_error){/* The audio remains playable even if local file:// prevents fetch. */}
}
function setupAudio(){
 if(audioContext)return;
 const AudioCtx=window.AudioContext||window.webkitAudioContext;
 if(!AudioCtx)throw Error('Web Audio is unavailable in this browser.');
 audioContext=new AudioCtx();
 source=audioContext.createMediaElementSource(audio);
 analyser=audioContext.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=.78;
 freq=new Uint8Array(analyser.frequencyBinCount);wave=new Uint8Array(analyser.fftSize);
 source.connect(analyser);analyser.connect(audioContext.destination);
}
function analyze(){
 if(!playing||!analyser){audioEnergy*=.91;return;}
 analyser.getByteFrequencyData(freq);analyser.getByteTimeDomainData(wave);
 const band=(start,end)=>{let v=0;const e=Math.max(start+1,Math.min(end,freq.length));for(let i=start;i<e;i++)v+=freq[i];return v/(Math.max(1,e-start)*255);};
 const n=freq.length;
 bass=bass*.69+band(1,Math.floor(n*.065))*.31;
 mid=mid*.72+band(Math.floor(n*.065),Math.floor(n*.36))*.28;
 treble=treble*.72+band(Math.floor(n*.36),Math.floor(n*.78))*.28;
 let rms=0;for(let i=0;i<wave.length;i+=8){let x=(wave[i]-128)/128;rms+=x*x;}
 rms=Math.sqrt(rms/(wave.length/8));
 const target=clamp(rms*2.1+bass*.64+mid*.16+treble*.13);
 audioEnergy=audioEnergy*.63+target*.37;
}
function stateAt(seconds){
 const bucket=Math.max(0,Math.floor(seconds*10));if(bucket===lastBucket)return;
 lastBucket=bucket;
 const duration=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:166;
 const at=Math.floor(clamp(seconds/duration)*Math.max(0,bytes.length-8));
 const input=[];
 for(let i=0;i<8;i++){
   let v=bytes[(at+i*23)%bytes.length]||0;
   // Deterministic 12% bit corruption, preserving the original byte-glitch style.
   for(let bit=0;bit<8;bit++)if(mix(seed^Math.imul(bucket+1,2654435761)^(i*97)^(bit*8191))/4294967296<.12)v^=1<<bit;
   const fileAmplitude=(v-127.5)/127.5;
   const pcm=wave?((wave[(i*233+bucket*37)%wave.length]-128)/128):0;
   input.push(clamp(fileAmplitude*.56+pcm*.44,-1,1));
 }
 encodedState=encodeAudio(input);
}

'use strict';
function encodeAudio(samples){const norm=Math.hypot(...samples);if(norm<1e-10)return null;const amplitudes=Array.from(samples,x=>x/norm),probabilities=amplitudes.map(a=>a*a),qubits=[];for(let bit=2;bit>=0;bit--){let p0=0,p1=0,c=0;for(let i=0;i<8;i++)if(!(i&(1<<bit))){const a=amplitudes[i],b=amplitudes[i|(1<<bit)];p0+=a*a;p1+=b*b;c+=a*b;}const x=2*c,y=0,z=p0-p1;qubits.push({x,y,z,p0,p1,purity:(1+x*x+y*y+z*z)/2});}return {samples:Array.from(samples),norm,amplitudes,probabilities,qubits};}
function drawQubit(g,w,h,v){
 const q=encodedState,cx=w/2,cy=h*.35,r=Math.min(w*.29,h*.23)*(1+audioEnergy*.08);g.fillStyle='#0a121c';g.fillRect(0,0,w,h);

 const fog=g.createRadialGradient(cx,cy,0,cx,cy,r*1.5);fog.addColorStop(0,'rgba(70,135,170,.14)');fog.addColorStop(1,'transparent');g.fillStyle=fog;g.fillRect(0,0,w,h);g.strokeStyle='#293b49';g.lineWidth=1;g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.stroke();

 const amplitudeScale=q?Math.max(.00001,...q.amplitudes.map(Math.abs)):1;const fluid=true,now=performance.now(),dt=Math.min(.1,Math.max(0,(now-lastFluidTime)/1000));lastFluidTime=now;
 if(q){if(!fluidAmplitudes||!playing)fluidAmplitudes=q.amplitudes.map(Math.abs);else{const blend=1-Math.exp(-dt/.08);fluidAmplitudes=fluidAmplitudes.map((a,i)=>a+(Math.abs(q.amplitudes[i])-a)*blend);}}
 else fluidAmplitudes=null;
 if(fluid&&q){
  // Spatial interpolation and visual easing are decorative; the state and its nodes remain exact.
  const magnitudes=fluidAmplitudes;
  function envelope(u){const index=Math.floor(u)%8,f=u-Math.floor(u),blend=(1-Math.cos(f*Math.PI))/2;return magnitudes[index]*(1-blend)+magnitudes[(index+1)%8]*blend;}
  for(let layer=0;layer<12;layer++){
   const depth=layer/11,scale=(.59+depth*.41)*(1+audioEnergy*.23);g.beginPath();
   for(let j=0;j<=256;j++){const u=j/256*8,angle=u/8*Math.PI*2-Math.PI/2,rr=r*envelope(u)/amplitudeScale*scale,x=cx+Math.cos(angle)*rr,y=cy+Math.sin(angle)*rr*(.58+depth*.42);j?g.lineTo(x,y):g.moveTo(x,y)}
   g.closePath();g.strokeStyle=`hsla(${v.hue+(v.hue2-v.hue)*depth},85%,${65+depth*17}%,${.12+depth*.4})`;g.lineWidth=layer===11?1.7:.9;g.shadowBlur=0;g.shadowColor=`hsl(${v.hue2},90%,75%)`;g.stroke();
  }
  // Phase-colored outer ribbon follows the same eased envelope.
  for(let segment=0;segment<8;segment++){g.beginPath();for(let j=0;j<=32;j++){const u=segment+j/32,angle=u/8*Math.PI*2-Math.PI/2,rr=r*envelope(u)/amplitudeScale,x=cx+Math.cos(angle)*rr,y=cy+Math.sin(angle)*rr;j?g.lineTo(x,y):g.moveTo(x,y)}g.strokeStyle=q.amplitudes[segment]<0?'#ffb59f':'#a4f4ef';g.lineWidth=1.4;g.stroke();}
 }
 g.shadowBlur=0;
 for(let i=0;i<8;i++){const angle=i/8*Math.PI*2-Math.PI/2,a=q?q.amplitudes[i]:0,rr=r*Math.abs(a)/amplitudeScale,x=cx+Math.cos(angle)*rr,y=cy+Math.sin(angle)*rr,color=a<0?'#ffb59f':'#a4f4ef';
  if(!fluid){g.strokeStyle=color;g.lineWidth=2;g.beginPath();g.moveTo(cx,cy);g.lineTo(x,y);g.stroke();}
  if(q){g.fillStyle=color;g.shadowBlur=v.glow*.4;g.shadowColor=color;g.beginPath();g.arc(x,y,fluid?2.5:2+Math.abs(a)*8,0,7);g.fill();g.shadowBlur=0;}
 }
 const br=Math.min(w*.095,h*.085),by=h*.76;
 for(let k=0;k<3;k++){const bx=w*(k+0.5)/3,bq=q?q.qubits[k]:{x:0,y:0,z:0,purity:.5};g.strokeStyle='#3a5363';g.lineWidth=.8;g.beginPath();g.arc(bx,by,br,0,7);g.stroke();g.beginPath();g.ellipse(bx,by,br,br*.25,0,0,7);g.stroke();g.beginPath();g.moveTo(bx,by-br);g.lineTo(bx,by+br);g.stroke();if(q){g.strokeStyle='#cdb9ff';g.lineWidth=2;g.beginPath();g.moveTo(bx,by);g.lineTo(bx+br*bq.x,by-br*bq.z);g.stroke();g.fillStyle='#e3d5ff';g.beginPath();g.arc(bx+br*bq.x,by-br*bq.z,3,0,7);g.fill();}}

 // Discrete data flecks and percussive glitch fragments (music-reactive).
 if(playing && audioEnergy > .07){
   const marker=Math.floor((audio.currentTime||0)*10);
   for(let i=0;i<Math.round(3+audioEnergy*18);i++){
     const h=mix(seed ^ Math.imul(marker+1,73856093) ^ (i*19349663));
     const x=140+(h%680),y=145+((h>>>12)%525);
     g.fillStyle=i%4===0?`rgba(255,170,160,${.04+audioEnergy*.11})`:`rgba(171,245,233,${.05+audioEnergy*.18})`;
     g.fillRect(x,y,8+(h%94)*audioEnergy,.5+(h%3));
   }
 }
 // Tiny audio-level indicator below the three state spheres.
 const meterX=287,meterY=965,meterW=386;
 g.fillStyle='rgba(117,160,178,.17)';g.fillRect(meterX,meterY,meterW,1.4);
 g.fillStyle='rgba(166,242,226,.55)';g.fillRect(meterX,meterY,Math.max(1,meterW*audioEnergy),1.7);
 return q?q.qubits[0].p0:.5;
}

function resize(){
 const bounds=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
 const targetW=Math.round(bounds.width*dpr),targetH=Math.round(bounds.height*dpr);
 if(targetW&&targetH&&(canvas.width!==targetW||canvas.height!==targetH)){
   canvas.width=targetW;canvas.height=targetH;
 }
 drawFrame();
}
function drawFrame(){
 if(!canvas.width||!canvas.height)return;
 g.setTransform(canvas.width/WIDTH,0,0,canvas.height/HEIGHT,0,0);
 drawQubit(g,WIDTH,HEIGHT,{hue:184,hue2:264,glow:8+audioEnergy*10});
}
function updateTrackUI(){
 const current=audio.currentTime||0,dur=audio.duration;
 trackTime.textContent=`${formatTime(current)} / ${Number.isFinite(dur)?formatTime(dur,true):'0:00'}`;
 const p=dur>0&&Number.isFinite(dur)?clamp(current/dur*100):0;
 progressFill.style.width=`${p}%`;progress.setAttribute('aria-valuenow',String(Math.round(p)));
}
function tick(now){
 if(!playing){raf=0;return;}
 raf=requestAnimationFrame(tick);
 if(now-lastFrame<FRAME_MS-1)return;
 lastFrame=now-(now-lastFrame)%FRAME_MS;
 analyze();stateAt(audio.currentTime||0);drawFrame();updateTrackUI();
}
function startLoop(){if(raf)return;lastFrame=0;raf=requestAnimationFrame(tick);}
function stopLoop(){if(raf)cancelAnimationFrame(raf);raf=0;audioEnergy=.035;drawFrame();updateTrackUI();}

playButton.addEventListener('click',async()=>{
 if(!audio.paused){audio.pause();setPlayButton();stopLoop();return;}
 try{
   setupAudio();await audioContext.resume();
   if(audio.ended)audio.currentTime=0;
   await audio.play();setMessage('Your uploaded audio stays on your device.');
 }catch(e){setMessage(`Cannot start playback: ${e?.message||'unsupported audio'}`,true);}
});
uploadButton.addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',async()=>{
 const file=fileInput.files?.[0];fileInput.value='';if(!file)return;
 audio.pause();stopLoop();isDemo=false;
 if(currentObjectUrl)URL.revokeObjectURL(currentObjectUrl);
 currentObjectUrl=URL.createObjectURL(file);
 audio.src=currentObjectUrl;audio.load();
 trackTitle.textContent=file.name.replace(/\.[^.]+$/,'').toUpperCase();
 trackDetail.textContent='LOCAL TRACK · READY TO PLAY';
 setPlayButton();updateTrackUI();setMessage('Ready. Press Play to hear your song.');
 try{seedFromBuffer(await file.slice(0,262144).arrayBuffer());}
 catch(_error){setMessage('Audio loaded; byte sampling could not complete.');}
});
audio.addEventListener('play',()=>{setPlayButton();startLoop();});
audio.addEventListener('pause',()=>{setPlayButton();stopLoop();});
audio.addEventListener('ended',()=>{setPlayButton();stopLoop();});
audio.addEventListener('loadedmetadata',()=>{updateTrackUI();});
audio.addEventListener('error',()=>{setMessage('This audio format could not be played. Try an MP3, M4A or WAV file.',true);});
document.addEventListener('keydown',e=>{
 if(e.code==='Space'&&!e.repeat&&!['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName)){
   e.preventDefault();playButton.click();
 }
});
window.addEventListener('pagehide',()=>{audio.pause();if(currentObjectUrl)URL.revokeObjectURL(currentObjectUrl);});
if('ResizeObserver' in window){new ResizeObserver(resize).observe(canvas);}else window.addEventListener('resize',resize);
stateAt(0);setPlayButton();resize();updateTrackUI();loadDemoBytes();
})();
