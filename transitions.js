// Transitions.dev recipes integrated with the existing roadmap state and pause control.
(()=>{
  const root=document.documentElement;
  const canMove=()=>!reduced.matches&&!motionPaused;
  const cssNumber=(name,fallback)=>{
    const value=parseFloat(getComputedStyle(root).getPropertyValue(name));
    return Number.isFinite(value)?value:fallback;
  };
  const cssValue=name=>getComputedStyle(root).getPropertyValue(name).trim();
  const clamp=value=>Math.max(0,Math.min(1,value));
  // A bounded sampler keeps per-frame dissolve/blur easing aligned with CSS.
  function cubicBezier(value){
    const match=value.match(/cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/);
    if(!match)return t=>t;
    const [x1,y1,x2,y2]=match.slice(1).map(Number);
    const point=(s,a,b)=>3*(1-s)*(1-s)*s*a+3*(1-s)*s*s*b+s*s*s;
    return t=>{
      if(t<=0||t>=1)return clamp(t);
      let lo=0,hi=1,s=t;
      for(let i=0;i<14;i++){if(point(s,x1,x2)<t)lo=s;else hi=s;s=(lo+hi)/2}
      return point(s,y1,y2);
    };
  }

  // 1. Input clear with dissolve. Typing always remains a native input action.
  const search=$('#search'),wrap=search.closest('.t-clear');
  const mirror=wrap.querySelector('.t-clear-mirror'),mirrorValue=wrap.querySelector('.t-clear-value');
  const placeholder=wrap.querySelector('.t-clear-placeholder'),glow=wrap.querySelector('.t-clear-glow');
  const clearButton=$('#clearSearch'),measureCanvas=document.createElement('canvas').getContext('2d');
  let clearing=false,clearFrame=0;
  function syncSearch(){
    if(clearing&&search.value)finishClear();
    wrap.classList.toggle('has-value',search.value.length>0);
    clearButton.hidden=!search.value;
  }
  function finishClear(){
    cancelAnimationFrame(clearFrame);clearFrame=0;clearing=false;
    wrap.classList.remove('is-clearing');
    for(const node of [mirror,mirrorValue,placeholder,glow])node.removeAttribute('style');
    mirrorValue.textContent='';
    wrap.style.removeProperty('--field-text-left');wrap.style.removeProperty('--field-text-right');
    syncSearch();
  }
  function wordGlow(text,left,scroll,width){
    if(!measureCanvas)return '';
    measureCanvas.font=getComputedStyle(search).font;
    const layers=[],spread=cssNumber('--glow-spread',1.5);
    let x=left-scroll;
    // Only visible words contribute gradients; long pasted text stays inexpensive.
    for(const segment of text.split(/(\s+)/)){
      const size=measureCanvas.measureText(segment).width;
      if(segment.trim()&&x+size>left&&x<width-35){
        const center=x+size/2,half=Math.max(size*.45,8)*spread;
        for(const [dx,scale,height,alpha] of [[0,.8,7,.22],[.45,.55,8,.18],[-.4,.65,6,.16],[.15,.9,5,.14]]){
          layers.push(`radial-gradient(ellipse ${(half*scale).toFixed(1)}px ${height}px at ${(center+half*dx).toFixed(1)}px 100%,rgba(4,4,127,${alpha}),transparent)`);
        }
      }
      x+=size;
    }
    return layers.join(',');
  }
  function clearSearch(){
    if(!search.value)return;
    finishClear();
    const previous=search.value,scroll=search.scrollLeft;
    const left=search.offsetLeft,right=wrap.clientWidth-left-search.offsetWidth;
    const gradient=wordGlow(previous,left,scroll,wrap.clientWidth);
    // Update results and URL now; the animation never delays filtering.
    search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));
    search.focus({preventScroll:true});
    if(!canMove())return;
    clearing=true;wrap.classList.add('is-clearing');
    wrap.style.setProperty('--field-text-left',`${left}px`);
    wrap.style.setProperty('--field-text-right',`${right}px`);
    mirrorValue.textContent=previous;mirrorValue.style.transform=`translateX(${-scroll}px)`;
    glow.style.background=gradient;
    const total=cssNumber('--clear-dur',1000),outDur=cssNumber('--clear-out-dur',400),inDur=cssNumber('--clear-in-dur',400);
    const outFly=cssNumber('--clear-out-fly',12),inFly=cssNumber('--clear-in-fly',12),blur=cssNumber('--clear-blur',2);
    const delay=cssNumber('--glow-delay',50),peak=cssNumber('--glow-peak-at',.15),opacity=cssNumber('--glow-opacity',.85);
    const easeOut=cubicBezier(cssValue('--clear-out-ease')),easeIn=cubicBezier(cssValue('--clear-in-ease'));
    const start=performance.now();
    function tick(now){
      if(!canMove()||search.value||document.hidden){finishClear();return}
      const elapsed=now-start,out=easeOut(clamp(elapsed/outDur)),incoming=easeIn(clamp(elapsed/inDur));
      mirror.style.transform=`translateY(${out*outFly}px)`;
      mirror.style.opacity=String(1-out);mirror.style.filter=`blur(${out*blur}px)`;
      placeholder.style.transform=`translateY(${(incoming-1)*inFly}px)`;
      placeholder.style.opacity=String(.9+.1*incoming);placeholder.style.filter=`blur(${(1-incoming)*blur}px)`;
      const progress=clamp((elapsed-delay)/Math.max(1,total-delay));
      const envelope=progress<peak?progress/peak:(1-progress)/(1-peak);
      glow.style.opacity=String(envelope*opacity);
      if(elapsed<total)clearFrame=requestAnimationFrame(tick);else finishClear();
    }
    tick(start);
  }
  clearButton.addEventListener('pointerdown',e=>{if(document.activeElement===search)e.preventDefault()});
  clearButton.addEventListener('click',clearSearch);
  search.addEventListener('beforeinput',()=>{if(clearing)finishClear()});
  search.addEventListener('compositionstart',()=>{if(clearing)finishClear()});
  search.addEventListener('input',syncSearch);
  search.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.isComposing&&search.value){e.preventDefault();clearSearch()}});

  // 2. Sliding highlight. The buttons retain their existing aria-pressed contract.
  const bar=$('#viewToggle'),pill=bar.querySelector('.t-tabs-pill'),tabs=[...bar.querySelectorAll('.t-tab')];
  let activeView='';
  function positionPill(animate=false){
    const current=tabs.find(tab=>tab.getAttribute('aria-pressed')==='true')||tabs[0];
    const slide=animate&&canMove()&&activeView!==current.dataset.view;
    if(!slide)pill.style.transition='none';
    pill.style.width=`${current.offsetWidth}px`;
    pill.style.height=`${current.offsetHeight}px`;
    pill.style.top=`${current.offsetTop}px`;
    pill.style.transform=`translateX(${current.offsetLeft}px)`;
    if(!slide){void pill.offsetWidth;pill.style.removeProperty('transition')}
    activeView=current.dataset.view;
  }
  bar.addEventListener('keydown',e=>{
    const index=tabs.indexOf(e.target);if(index<0)return;
    let next;
    if(e.key==='ArrowRight')next=tabs[(index+1)%tabs.length];
    if(e.key==='ArrowLeft')next=tabs[(index-1+tabs.length)%tabs.length];
    if(e.key==='Home')next=tabs[0];if(e.key==='End')next=tabs.at(-1);
    if(next){e.preventDefault();next.focus({preventScroll:true});next.click()}
  });
  document.addEventListener('roadmap:render',()=>{syncSearch();positionPill(true)});
  if('ResizeObserver'in window){
    const viewObserver=new ResizeObserver(()=>positionPill(false));
    viewObserver.observe(bar);tabs.forEach(tab=>viewObserver.observe(tab));
  }
  document.fonts?.ready.then(()=>positionPill(false));

  // 3. Pointer tilt. The parent hit area stays flat; the existing outer float survives.
  const tilt=$('.t-tilt'),tiltCard=tilt.querySelector('.t-tilt-card');
  const hoverPointer=matchMedia('(hover:hover) and (pointer:fine)');
  let tiltFrame=0,pointerPosition=null;
  function resetTilt(){
    cancelAnimationFrame(tiltFrame);tiltFrame=0;pointerPosition=null;
    tilt.classList.remove('is-hover');tiltCard.classList.remove('is-tilting');
    tiltCard.style.setProperty('--tilt-rx','0deg');tiltCard.style.setProperty('--tilt-ry','0deg');
  }
  function paintTilt(){
    tiltFrame=0;
    if(!pointerPosition||!canMove()||!hoverPointer.matches)return;
    const rect=tilt.getBoundingClientRect();
    const x=clamp((pointerPosition.x-rect.left)/rect.width),y=clamp((pointerPosition.y-rect.top)/rect.height);
    tilt.classList.add('is-hover');tiltCard.classList.add('is-tilting');
    tiltCard.style.setProperty('--tilt-rx',`${((.5-y)*14).toFixed(2)}deg`);
    tiltCard.style.setProperty('--tilt-ry',`${((x-.5)*14).toFixed(2)}deg`);
    tiltCard.style.setProperty('--tilt-gx',`${x*100}%`);tiltCard.style.setProperty('--tilt-gy',`${y*100}%`);
  }
  tilt.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse'||!canMove()||!hoverPointer.matches)return;
    pointerPosition={x:e.clientX,y:e.clientY};if(!tiltFrame)tiltFrame=requestAnimationFrame(paintTilt);
  });
  tilt.addEventListener('pointerleave',resetTilt);tilt.addEventListener('pointercancel',resetTilt);
  tilt.addEventListener('focusin',resetTilt);hoverPointer.addEventListener('change',resetTilt);
  addEventListener('blur',resetTilt);

  // 4. One-shot spinning counters, with the real values always exposed to AT.
  const svgNS='http://www.w3.org/2000/svg';
  const filterSvg=document.createElementNS(svgNS,'svg');filterSvg.classList.add('reel-filter-defs');filterSvg.setAttribute('aria-hidden','true');
  const defs=document.createElementNS(svgNS,'defs');filterSvg.append(defs);document.body.append(filterSvg);
  const reels=[],digits=[];
  let reelPlayed=false,reelFrame=0,reelObserver,lastReelCell=0;
  for(const number of $$('.ecosystem>div>strong')){
    const value=number.textContent.trim();if(!/^\d+$/.test(value))continue;
    const accessible=document.createElement('span');accessible.className='sr-only';accessible.textContent=value;
    const reel=document.createElement('span');reel.className='t-reel';reel.setAttribute('aria-hidden','true');
    for(const character of value){
      const target=20+Number(character),column=document.createElement('span'),strip=document.createElement('span');
      column.className='t-reel-col';strip.className='t-reel-strip';
      for(let i=0;i<30;i++){const cell=document.createElement('span');cell.className='t-reel-digit';cell.textContent=i%10;strip.append(cell)}
      const filter=document.createElementNS(svgNS,'filter'),blur=document.createElementNS(svgNS,'feGaussianBlur');
      filter.id=`reel-blur-${digits.length}`;filter.setAttribute('x','-10%');filter.setAttribute('y','-10%');filter.setAttribute('width','120%');filter.setAttribute('height','120%');
      blur.setAttribute('stdDeviation','0 0');filter.append(blur);defs.append(filter);
      column.append(strip);reel.append(column);digits.push({column,strip,target,blur,filterId:filter.id});
    }
    number.classList.add('stat-number');number.replaceChildren(accessible,reel);reels.push(reel);
  }
  function landCounters(){
    cancelAnimationFrame(reelFrame);reelFrame=0;
    lastReelCell=digits[0]?.strip.firstElementChild.getBoundingClientRect().height||0;
    for(const digit of digits){
      digit.strip.style.transition='none';digit.strip.style.transform=`translateY(${-digit.target*digit.strip.firstElementChild.getBoundingClientRect().height}px)`;
      digit.strip.style.removeProperty('filter');digit.blur.setAttribute('stdDeviation','0 0');
    }
    reels.forEach(reel=>reel.classList.remove('is-spinning'));
  }
  function finishCounters(){reelPlayed=true;reelObserver?.disconnect();landCounters()}
  function spinCounters(){
    if(reelPlayed||document.hidden)return;
    reelPlayed=true;reelObserver?.disconnect();
    if(!canMove()){landCounters();return}
    const duration=cssNumber('--reel-dur',1400),stagger=cssNumber('--reel-stagger',90),maxBlur=cssNumber('--reel-spin-blur',3);
    reels.forEach(reel=>reel.classList.add('is-spinning'));
    for(const digit of digits){digit.strip.style.transition='none';digit.strip.style.transform='translateY(0)';digit.strip.style.filter=`url(#${digit.filterId})`}
    void $('.ecosystem').offsetWidth;
    const start=performance.now(),ease=cubicBezier(cssValue('--reel-ease'));
    digits.forEach((digit,index)=>{
      digit.strip.style.transition=`transform ${duration}ms ${cssValue('--reel-ease')} ${index*stagger}ms`;
      digit.strip.style.transform=`translateY(${-digit.target*digit.strip.firstElementChild.getBoundingClientRect().height}px)`;
    });
    function tick(now){
      if(!canMove()||document.hidden){finishCounters();return}
      digits.forEach((digit,index)=>{
        const progress=clamp((now-start-index*stagger)/duration);
        digit.blur.setAttribute('stdDeviation',`0 ${(maxBlur*(1-ease(progress))).toFixed(2)}`);
      });
      if(now-start<duration+(digits.length-1)*stagger)reelFrame=requestAnimationFrame(tick);else landCounters();
    }
    reelFrame=requestAnimationFrame(tick);
  }
  function observeCounters(){
    landCounters();if(reelPlayed)return;
    if(!canMove()){finishCounters();return}
    if('IntersectionObserver'in window){
      reelObserver?.disconnect();
      reelObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))spinCounters()},{threshold:.45});
      reelObserver.observe($('.ecosystem'));
    }else spinCounters();
  }
  (document.fonts?.ready||Promise.resolve()).then(observeCounters);
  addEventListener('resize',()=>{
    const height=digits[0]?.strip.firstElementChild.getBoundingClientRect().height||0;
    if(Math.abs(height-lastReelCell)>.1){if(reelFrame)finishCounters();else landCounters()}
    positionPill(false);if(clearing)finishClear();
  });
  document.addEventListener('roadmap:motionchange',()=>{
    if(!canMove()){finishClear();resetTilt();finishCounters()}
    positionPill(false);
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){finishClear();resetTilt();if(reelFrame)finishCounters()}
    else if(!reelPlayed)observeCounters();
  });
  syncSearch();positionPill(false);landCounters();
})();
