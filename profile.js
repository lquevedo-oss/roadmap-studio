// Optional host integration: window.roadmapAuth = { getUser(), signOut() }.
// The host owns authentication, authorization and the redirect after sign-out.
// This standalone preview never creates, stores or pretends to revoke a session.
(()=>{
  const profile=$('#profile'),trigger=$('#profileTrigger'),menu=$('#profileMenu'),signOut=$('#signOut');
  const auth=window.roadmapAuth;
  const preview=!auth||typeof auth.getUser!=='function';
  let open=false,loading=true,busy=false,demoTimer;
  function setMenu(value,{focus=false,instant=false}={}){
    if(value&&(loading||busy||trigger.disabled))return;
    open=value;profile.dataset.instant=String(instant);
    trigger.setAttribute('aria-expanded',String(value));
    menu.inert=!value;menu.setAttribute('aria-hidden',String(!value));
    menu.classList.toggle('is-open',value);
    signOut.tabIndex=value?0:-1;
    if(focus)(value?signOut:trigger).focus({preventScroll:true});
  }
  function reveal(value){
    clearTimeout(demoTimer);loading=false;
    const name=String(value?.name||'Mi cuenta');
    const email=String(value?.email||(preview?'Cuenta Atlas':'Perfil Atlas'));
    $('#profileName').textContent=name;$('#profileEmail').textContent=email;
    $('#profileAvatar').textContent=name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>[...word][0]).join('').toLocaleUpperCase('es');
    trigger.setAttribute('aria-label',`Mi perfil: ${name}${value?.email?', '+email:''}`);
    trigger.title=value?.email?`${name} · ${email}`:name;
    trigger.disabled=!value;trigger.setAttribute('aria-busy','false');
    trigger.dataset.state=value?'ready':'unavailable';trigger.classList.add('is-revealed');
    trigger.querySelector('.t-skel-skeleton').classList.remove('is-pulsing');
    if(!value){$('#profileName').textContent='Sin sesión';$('#profileEmail').textContent='Cuenta Atlas';$('#profileAvatar').textContent='—';trigger.setAttribute('aria-label','Sin sesión activa')}
  }
  trigger.addEventListener('click',event=>setMenu(!open,{focus:true,instant:event.detail===0}));
  trigger.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setMenu(true,{focus:true,instant:true})}
  });
  profile.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();setMenu(false,{focus:true,instant:true})}
    if(open&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();signOut.focus()}
  });
  document.addEventListener('pointerdown',event=>{if(open&&!profile.contains(event.target))setMenu(false)});
  profile.addEventListener('focusout',()=>queueMicrotask(()=>{if(open&&!profile.contains(document.activeElement))setMenu(false,{instant:true})}));
  signOut.addEventListener('click',async()=>{
    if(busy)return;
    setMenu(false,{focus:true});
    if(preview){showToast('Estás en una vista previa. No hay una sesión activa que cerrar.');return}
    if(typeof auth.signOut!=='function'){showToast('No se pudo cerrar la sesión. Inténtalo nuevamente.');return}
    busy=true;trigger.disabled=true;trigger.setAttribute('aria-busy','true');
    try{await auth.signOut();reveal(null);showToast('Tu sesión se ha cerrado.')}
    catch{trigger.disabled=false;trigger.setAttribute('aria-busy','false');showToast('No se pudo cerrar la sesión. Inténtalo nuevamente.')}
    finally{busy=false}
  });
  // Only the preview replays one pulse; real data reveals as soon as it arrives.
  const demoUser={name:'Demo'};
  if(preview){
    if(reduced.matches||motionPaused)reveal(demoUser);
    else demoTimer=setTimeout(()=>reveal(demoUser),1000);
  }else{
    Promise.resolve().then(()=>auth.getUser()).then(reveal).catch(()=>{reveal(null);showToast('No pudimos cargar tu perfil. Recarga la página para reintentar.')});
  }
  document.addEventListener('roadmap:motionchange',()=>{if(preview&&loading&&(reduced.matches||motionPaused))reveal(demoUser)});
})();
