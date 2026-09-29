// A layered product illustration and a reversible focus shift on the hero.
// The roadmap's interactive content remains outside the scroll effect.
const motionRoot=document.documentElement;
const scene=$('.product-story');
const heroCopy=$('.hero-copy');
const motionToggle=$('#motionToggle');
const focusTitle=$('.workspace-heading>div:first-child');
let motionPaused=false;
let motionFrame=0;
let motionMeasurements=[];
let titleObserver;
let titleAnimation;
let titleRevealed=false;

function layoutTop(element){
  let top=0;
  for(let node=element;node;node=node.offsetParent)top+=node.offsetTop;
  return top;
}
function measureMotion(){
  // Layout offsets exclude animated transforms, preventing measurement feedback.
  motionMeasurements=[heroCopy,scene].map(element=>({element,top:layoutTop(element),height:element.offsetHeight}));
  requestMotionFrame();
}
function clearScrollMotion(){
  for(const element of [heroCopy,scene])for(const property of ['transform','filter','opacity'])element.style.removeProperty(property);
}
function paintMotion(){
  motionFrame=0;
  if(reduced.matches||motionPaused){clearScrollMotion();return}
  const mobile=narrow.matches;
  const scroll=window.scrollY;
  for(const {element,top,height} of motionMeasurements){
    // Defocus only once the object begins leaving the top of the viewport.
    // Any keyboard focus keeps its entire region sharp and stationary.
    const progress=element.matches(':focus-within')?0:Math.max(0,Math.min(1,(scroll-top-24)/(height*.9)));
    const p=progress*progress*(3-2*progress);
    const isScene=element===scene;
    const blur=p*(isScene?(mobile?3:6):(mobile?1.5:3));
    const shift=p*(isScene?(mobile?12:28):(mobile?-6:-16));
    const scale=1-p*(isScene?.025:.01);
    element.style.transform=p?`translate3d(0,${shift.toFixed(2)}px,0) scale(${scale.toFixed(4)})`:'none';
    element.style.filter=blur>.01?`blur(${blur.toFixed(2)}px)`:'none';
    element.style.opacity=String(1-p*(isScene?.36:.32));
  }
}
function requestMotionFrame(){if(!motionFrame)motionFrame=requestAnimationFrame(paintMotion)}

function revealRoadmapTitle(){
  if(titleRevealed||!('IntersectionObserver'in window)||reduced.matches||motionPaused)return;
  titleObserver?.disconnect();
  // Initial content and direct anchor visits are never hidden behind an entrance.
  const rect=focusTitle.getBoundingClientRect();
  if(rect.top<innerHeight-70){titleRevealed=true;return}
  titleObserver=new IntersectionObserver(entries=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    titleRevealed=true;titleObserver.disconnect();
    titleAnimation=focusTitle.animate([
      {filter:'blur(6px)',opacity:.32,transform:'translate3d(0,16px,0)'},
      {filter:'blur(0px)',opacity:1,transform:'translate3d(0,0,0)'}
    ],{duration:600,easing:'cubic-bezier(0.22,1,0.36,1)'});
  },{rootMargin:'0px 0px -70px 0px',threshold:.15});
  titleObserver.observe(focusTitle);
}
function syncMotionPreference(){
  motionRoot.classList.toggle('motion-enabled',!reduced.matches);
  motionRoot.classList.toggle('motion-paused',motionPaused);
  motionToggle.disabled=reduced.matches;
  const label=reduced.matches?'Movimiento reducido activado en tu dispositivo':motionPaused?'Activar animaciones':'Pausar animaciones';
  motionToggle.setAttribute('aria-label',label);motionToggle.title=label;
  motionToggle.setAttribute('aria-pressed',String(motionPaused||reduced.matches));
  motionToggle.querySelector('use').setAttribute('href',motionPaused||reduced.matches?'#i-play':'#i-pause');
  if(reduced.matches||motionPaused){
    clearScrollMotion();titleAnimation?.cancel();titleObserver?.disconnect();
  }else{measureMotion();revealRoadmapTitle()}
  document.dispatchEvent(new Event('roadmap:motionchange'));
}
motionToggle.addEventListener('click',()=>{motionPaused=!motionPaused;syncMotionPreference()});
reduced.addEventListener('change',syncMotionPreference);
addEventListener('scroll',requestMotionFrame,{passive:true});
addEventListener('resize',measureMotion,{passive:true});
addEventListener('pageshow',measureMotion);
document.addEventListener('focusin',requestMotionFrame);
document.addEventListener('focusout',requestMotionFrame);
document.addEventListener('visibilitychange',()=>motionRoot.classList.toggle('motion-background',document.hidden));

// Stop the ambient CSS animations while their scene is off screen.
if('IntersectionObserver'in window){
  const sceneObserver=new IntersectionObserver(entries=>{
    scene.classList.toggle('motion-offscreen',!entries[0].isIntersecting);
  },{rootMargin:'80px'});
  sceneObserver.observe(scene);
}
// Images and fonts may change the section geometry after initial layout.
if('ResizeObserver'in window){
  const layoutObserver=new ResizeObserver(measureMotion);
  layoutObserver.observe($('.hero-inner'));
}
document.fonts?.ready.then(measureMotion);
syncMotionPreference();
