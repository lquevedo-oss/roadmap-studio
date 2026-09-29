const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normal = value => String(value).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
let savedIds = new Set();
try{const stored=JSON.parse(localStorage.getItem('roadmap-demo-saved')||'[]');if(Array.isArray(stored))savedIds=new Set(stored.filter(id=>items.some(item=>item.id===id)))}catch{}
const state = {query:'',country:'ALL',solutions:new Set(),stage:'all',year:'2026',period:'all',view:'columns',group:'quarters',ai:false,saved:false};
let activeItem = null;
let lastDetailFocus = null;
let toastTimer;
let menuTimer;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 760px)');
const shortStage = stage => stage === 'Lanzado parcialmente' ? 'Lanzado parcialmente' : stage;
const dateText = item => !item.year ? 'Fecha por confirmar' : item.month ? `${months[item.month-1]} ${item.year}` : `Q${item.quarter} ${item.year}`;
const status = item => `<span class="status-pill" data-stage="${esc(item.stage)}"><i aria-hidden="true"></i>${esc(shortStage(item.stage))}</span>`;
const periodMatches = (item,period) => period==='all' || period===`Q${item.quarter}` || (period==='H1'&&item.quarter<=2) || (period==='H2'&&item.quarter>=3);

function readView(){
  const params=new URLSearchParams(location.search);
  state.query=(params.get('q')||'').slice(0,300);
  state.country=allCountries.includes(params.get('country'))?params.get('country'):'ALL';
  state.solutions=new Set(params.getAll('solution').filter(name=>allSolutions.includes(name)));
  for(const key of ['stage','year','period']){
    const fallback=key==='year'?'2026':'all';
    const value=params.get(key)||fallback;
    state[key]=[...$(`#${key}`).options].some(option=>option.value===value)?value:fallback;
  }
  state.view=['cards','columns','matrix'].includes(params.get('view'))?params.get('view'):'columns';
  state.group=params.get('group')==='months'?'months':'quarters';
  state.ai=params.get('ai')==='1';
  $('#search').value=state.query;
  activeItem=items.find(item=>item.id===params.get('item'))||null;
}
function writeView(){
  const params=new URLSearchParams();
  if(state.query)params.set('q',state.query);
  if(state.country!=='ALL')params.set('country',state.country);
  [...state.solutions].sort().forEach(name=>params.append('solution',name));
  for(const [key,fallback] of [['stage','all'],['year','2026'],['period','all'],['view','columns'],['group','quarters']])if(state[key]!==fallback)params.set(key,state[key]);
  if(state.ai)params.set('ai','1');
  if(activeItem)params.set('item',activeItem.id);
  const query=params.toString();
  try{history.replaceState(null,'',location.pathname+(query?`?${query}`:'')+location.hash)}catch{/* Some file:// browsers disallow history changes. Filtering stays available. */}
  return params;
}
function matches(item,omit=''){
  if(state.saved&&!savedIds.has(item.id))return false;
  if(omit!=='query'&&state.query&&!normal([item.title,item.description,item.solution,...item.missions].join(' ')).includes(normal(state.query)))return false;
  if(omit!=='country'&&state.country!=='ALL'&&!item.countries.includes(state.country))return false;
  if(omit!=='solutions'&&state.solutions.size&&!state.solutions.has(item.solution))return false;
  if(omit!=='stage'&&state.stage!=='all'&&state.stage!==item.stage)return false;
  if(omit!=='year'&&state.year!=='all'&&(state.year==='undated'?!!item.year:item.year!==Number(state.year)))return false;
  if(omit!=='period'&&!periodMatches(item,state.period))return false;
  if(state.ai&&!item.ai)return false;
  return true;
}
const displayed=()=>items.filter(item=>matches(item)).sort((a,b)=>a.year-b.year||a.quarter-b.quarter||(a.month||13)-(b.month||13)||a.title.localeCompare(b.title,'es'));

function renderSolutionOptions(){
  const query=normal($('#solutionSearch').value.trim());
  const filtered=allSolutions.filter(name=>normal(name).includes(query));
  const focused=document.activeElement?.matches('#solutionOptions input')?document.activeElement.value:null;
  $('#solutionOptions').innerHTML=filtered.length?filtered.map(name=>`<label class="solution-option"><input type="checkbox" value="${esc(name)}" ${state.solutions.has(name)?'checked':''}><span>${esc(name)}</span><small aria-label="iniciativas en la muestra">${items.filter(item=>item.solution===name).length}</small></label>`).join(''):'<div class="solution-empty">No encontramos esa solución.</div>';
  $('#solutionLabel').textContent=!state.solutions.size||state.solutions.size===allSolutions.length?'Todas las soluciones':state.solutions.size===1?[...state.solutions][0]:`${state.solutions.size} soluciones`;
  if(focused)$$('#solutionOptions input').find(input=>input.value===focused)?.focus();
}
function syncControls(){
  syncSavedUI();
  $('#compactGroup').value=state.group;
  $('#clearAllFilters').hidden=!(state.query||state.country!=='ALL'||state.solutions.size||state.stage!=='all'||state.year!=='all'||state.period!=='all'||state.ai);
  for(const key of ['stage','year','period'])$(`#${key}`).value=state[key];
  $('#aiOnly').checked=state.ai;
  for(const [container,key] of [['countries','country'],['viewToggle','view'],['groupToggle','group']]){
    $$(`#${container} button`).forEach(button=>{const selected=button.dataset[key]===state[key];button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected))});
  }
  renderSolutionOptions();
  const stageBase=items.filter(item=>matches(item,'stage'));
  $$('.stage-tabs button').forEach(button=>{
    const selected=button.dataset.stage===state.stage;
    button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
    button.querySelector('b').textContent=button.dataset.stage==='all'?stageBase.length:stageBase.filter(item=>item.stage===button.dataset.stage).length;
  });
  const previouslyFocused=document.activeElement?.closest('#quarterTabs button')?.dataset.period;
  $('#quarterTabs').innerHTML=[['all','Todo el año'],['Q1','Q1'],['Q2','Q2'],['Q3','Q3'],['Q4','Q4']].map(([value,label])=>`<button type="button" data-period="${value}" class="${state.period===value?'active':''}" aria-label="${label}" aria-pressed="${state.period===value}">${value==='all'?'<span class="period-long">Todo el año</span><span class="period-short">Todos</span>':label}</button>`).join('');
  if(previouslyFocused)$$('#quarterTabs button').find(b=>b.dataset.period===previouslyFocused)?.focus();
}
function renderFilterChips(){
  const chips=[];
  if(state.query)chips.push(['query',`“${state.query}”`]);
  if(state.country!=='ALL')chips.push(['country',countryNames[state.country].replace(/^\S+\s/, '')]);
  if(state.solutions.size)chips.push(['solutions',state.solutions.size===1?[...state.solutions][0]:`${state.solutions.size} soluciones`]);
  if(state.stage!=='all')chips.push(['stage',state.stage]);
  if(state.year!=='all')chips.push(['year',state.year==='undated'?'Sin fecha':state.year]);
  if(state.period!=='all')chips.push(['period',state.period]);
  if(state.ai)chips.push(['ai','Con IA']);
  $('#activeFilters').innerHTML=chips.length?chips.map(([key,label])=>`<button type="button" class="filter-chip" data-clear="${key}" aria-label="Quitar filtro ${esc(label)}">${esc(label)}${icon('close')}</button>`).join(''):'<span class="no-filter-text">Todos los países y períodos</span>';
  $('#filterNumber').textContent=chips.length;
  $('#filterNumber').hidden=chips.length===0;
}
function laneKeys(list){
  if(list.length&&list.every(item=>!item.year))return [{key:'undated',label:'Sin fecha',sub:'Por confirmar'}];
  const quarters=state.period==='all'?[1,2,3,4]:state.period==='H1'?[1,2]:state.period==='H2'?[3,4]:[Number(state.period.slice(1))];
  if(state.group==='quarters')return quarters.map(q=>({key:`Q${q}`,label:`Q${q}`,sub:`${months[(q-1)*3]} — ${months[q*3-1]}`}));
  const keys=quarters.flatMap(q=>[1,2,3].map(offset=>{const month=(q-1)*3+offset;return{key:`M${month}`,label:months[month-1],sub:`Trimestre ${q}`}}));
  for(const q of quarters)if(list.some(item=>item.quarter===q&&!item.month))keys.push({key:`U${q}`,label:`Q${q} · Sin mes`,sub:'Mes por confirmar'});
  const position=k=>k.key.startsWith('U')?Number(k.key.slice(1))*3+.5:Number(k.key.slice(1));
  return keys.sort((a,b)=>position(a)-position(b));
}
const bucket=item=>!item.year?'undated':state.group==='quarters'?`Q${item.quarter}`:item.month?`M${item.month}`:`U${item.quarter}`;
function card(item){
  const countries=item.countries.length===5?'5 países':item.countries.join(' · ');
  return `<article class="initiative-card"><button type="button" class="launch-card" data-id="${esc(item.id)}" aria-label="Ver detalle: ${esc(item.title)}"><span class="card-meta"><span class="card-solution" title="${esc(item.solution)}">${esc(item.solution)}</span>${item.ai?`<span class="card-ai">${icon('spark')} IA</span>`:''}</span><strong>${esc(item.title)}</strong><p>${esc(item.description)}</p><span class="card-stage-row">${status(item)}${icon('arrow')}</span><span class="card-bottom"><span class="card-date">${icon('calendar')}${dateText(item)}</span><span class="card-country">${esc(countries)}</span></span></button><button type="button" class="save-card ${savedIds.has(item.id)?'is-saved':''}" data-save="${esc(item.id)}" aria-pressed="${savedIds.has(item.id)}" aria-label="${savedIds.has(item.id)?'Quitar de guardados':'Guardar'}: ${esc(item.title)}" title="${savedIds.has(item.id)?'Quitar de guardados':'Guardar iniciativa'}">${icon('bookmark')}</button></article>`;
}
function renderCards(list){
  const years=[...new Set(list.map(item=>item.year))].sort((a,b)=>a-b);
  return years.map(year=>{
    const subset=list.filter(item=>item.year===year),keys=laneKeys(subset);
    return `<section class="year-block collection-year" aria-label="${year||'Sin fecha'}">${keys.map(k=>{
      const entries=subset.filter(item=>bucket(item)===k.key);if(!entries.length)return '';
      return `<section class="collection-section"><div class="collection-heading"><div class="period-mark">${esc(k.label)}</div><div><h3>${year||'Fecha por confirmar'}</h3><p>${esc(k.sub)}</p></div><span>${entries.length} ${entries.length===1?'iniciativa':'iniciativas'}</span></div><div class="card-grid">${entries.map(card).join('')}</div></section>`;
    }).join('')}</section>`;
  }).join('');
}
function renderColumns(list){
  const years=[...new Set(list.map(item=>item.year))].sort((a,b)=>a-b);
  return years.map(year=>{
    const subset=list.filter(item=>item.year===year),keys=laneKeys(subset);
    const label=year||'Sin fecha';
    return `<section class="year-block" aria-label="Roadmap ${label}"><div class="year-heading"><b>${label}</b><span>${year?(state.group==='quarters'?'Roadmap anual · Trimestres':'Roadmap anual · Meses'):'Por confirmar'}</span><small>${subset.length} ${subset.length===1?'iniciativa':'iniciativas'}</small></div>${keys.length>1?'<p class="board-scroll-hint">Desliza horizontalmente para comparar los períodos.</p>':''}<div class="timeline-grid ${keys.length===1?'single':''} ${state.group}" style="--period-count:${keys.length}" tabindex="0" role="region" aria-label="Cronología ${label} por ${state.group==='quarters'?'trimestres':'meses'}">${keys.map(k=>{const entries=subset.filter(item=>bucket(item)===k.key);return `<div class="time-lane"><div class="time-lane-head"><div><strong>${esc(k.label)}${year?' '+year:''}</strong><small>${esc(k.sub)}</small></div><span aria-label="${entries.length} iniciativas">${entries.length}</span></div><div class="lane-stack">${entries.length?entries.map(card).join(''):'<div class="lane-empty">Sin iniciativas en este período de la muestra.</div>'}</div></div>`}).join('')}</div></section>`;
  }).join('');
}
function renderMatrix(list){
  const years=[...new Set(list.map(item=>item.year))].sort((a,b)=>a-b);
  return years.map(year=>{
    const subset=list.filter(item=>item.year===year),keys=laneKeys(subset),solutions=[...new Set(subset.map(item=>item.solution))].sort((a,b)=>a.localeCompare(b,'es'));
    return `<section class="year-block"><div class="year-heading"><b>${year}</b><span>Iniciativas por solución y período</span></div><div class="matrix-scroll" tabindex="0" role="region" aria-label="Matriz ${year}, desplázate para ver todos los períodos"><table class="matrix-table" style="min-width:${175+keys.length*230}px"><thead><tr><th scope="col">Solución</th>${keys.map(k=>`<th scope="col">${esc(k.label)} ${year}</th>`).join('')}</tr></thead><tbody>${solutions.map(solution=>`<tr><th scope="row">${esc(solution)}</th>${keys.map(k=>{const entries=subset.filter(item=>item.solution===solution&&bucket(item)===k.key);return `<td>${entries.length?entries.map(item=>`<button type="button" class="matrix-mini" data-id="${esc(item.id)}" aria-label="Ver detalle: ${esc(item.title)}"><strong>${esc(item.title)}</strong>${status(item)}<small>${dateText(item)}</small></button>`).join(''):'<span class="matrix-dash" aria-label="Sin iniciativas">—</span>'}</td>`}).join('')}</tr>`).join('')}</tbody></table></div></section>`;
  }).join('');
}
function render(){
  syncControls();renderFilterChips();
  const list=displayed();$('#matchCount').textContent=list.length;
  $('#results').innerHTML=list.length?(state.view==='cards'?renderCards(list):state.view==='columns'?renderColumns(list):renderMatrix(list)):state.saved?`<div class="empty-state">${icon('bookmark')}<h3>${savedIds.size?'Tus guardados no coinciden con estos filtros.':'Lo que te interesa, siempre a mano.'}</h3><p>${savedIds.size?'Limpia los filtros para volver a ver tu selección.':'Guarda una iniciativa con el marcador. Tu selección queda en este navegador para volver cuando quieras.'}</p><button type="button" class="button primary" id="emptySaved">${savedIds.size?'Ver todos mis guardados':'Explorar iniciativas'}</button></div>`:`<div class="empty-state">${icon('search')}<h3>No encontramos esa combinación.</h3><p>Prueba con otro país, solución o período. También puedes volver a los filtros iniciales.</p><button type="button" class="button primary" id="emptyReset">Restablecer filtros</button></div>`;
  writeView();
  document.dispatchEvent(new Event('roadmap:render'));
}
function closeSolutionMenu(restoreFocus=false){
  const menu=$('#solutionMenu');
  $('#solutionTrigger').setAttribute('aria-expanded','false');
  menu.classList.remove('is-open');menu.classList.add('is-closing');menu.inert=true;
  clearTimeout(menuTimer);menuTimer=setTimeout(()=>{menu.hidden=true;menu.classList.remove('is-closing')},reduced.matches?0:150);
  if(restoreFocus)$('#solutionTrigger').focus();
}
function openSolutionMenu(){
  clearTimeout(menuTimer);const menu=$('#solutionMenu');menu.hidden=false;menu.inert=false;menu.classList.remove('is-closing');
  $('#solutionTrigger').setAttribute('aria-expanded','true');renderSolutionOptions();
  requestAnimationFrame(()=>menu.classList.add('is-open'));$('#solutionSearch').focus();
}
function updateScrollLock(){document.body.style.overflow=$$('dialog[open]').length?'hidden':''}
function openDetail(item){
  const dialog=$('#detailPanel');
  if(!dialog.open)lastDetailFocus=document.activeElement;
  activeItem=item;
  syncSavedUI();
  $('#detailContent').innerHTML=`${status(item)}<h2 id="detailTitle">${esc(item.title)}</h2><div class="detail-meta"><div><span>Solución</span><b>${esc(item.solution)}</b></div><div><span>Fecha estimada</span><b>${dateText(item)}</b></div></div><div class="detail-section"><h3>Qué cambia para tu equipo</h3><p>${esc(item.description)}</p></div>${item.ai?`<div class="detail-section"><span class="card-ai">${icon('spark')} Esta iniciativa incorpora inteligencia artificial.</span></div>`:''}<div class="detail-section"><h3>Países cubiertos</h3><div class="detail-country-list">${item.countries.map(code=>`<span>${esc(countryNames[code])}</span>`).join('')}</div></div><div class="detail-section"><h3>Misiones relacionadas</h3><div class="mission-chips">${item.missions.length?item.missions.map(mission=>`<code>${esc(mission)}</code>`).join(''):'Sin misiones informadas en esta muestra.'}</div></div><a class="detail-original" href="https://github.com/lquevedo-oss/roadmap-studio" target="_blank" rel="noopener noreferrer">Ver el proyecto ${icon('arrow')}</a><p class="detail-disclaimer">La disponibilidad puede variar por país y cliente. Consulta la información actualizada en el dataset ficticio.</p>`;
  $('#detailContent .detail-original').insertAdjacentHTML('beforebegin',stageProgress(item));
  $('#detailContent').scrollTop=0;
  syncDetailNavigation();
  if(!dialog.open){closeSolutionMenu();dialog.showModal();updateScrollLock();$('#closeDetail').focus()}
  writeView();
}
function reset(){Object.assign(state,{query:'',country:'ALL',stage:'all',year:'2026',period:'all',view:'columns',group:'quarters',ai:false,saved:false});state.solutions.clear();$('#search').value='';$('#solutionSearch').value='';closeSolutionMenu();render()}

$('#search').addEventListener('input',e=>{state.query=e.target.value.trim();render()});
for(const [container,key] of [['countries','country'],['viewToggle','view'],['groupToggle','group'],['quarterTabs','period']])$('#'+container).addEventListener('click',e=>{const button=e.target.closest(`[data-${key}]`);if(button){state[key]=button.dataset[key];render()}});
$('.stage-tabs').addEventListener('click',e=>{const button=e.target.closest('[data-stage]');if(button){state.stage=button.dataset.stage;render()}});
for(const key of ['stage','year','period'])$('#'+key).addEventListener('change',e=>{state[key]=e.target.value;render()});
$('#aiOnly').addEventListener('change',e=>{state.ai=e.target.checked;render()});
$('#solutionTrigger').addEventListener('click',()=>$('#solutionTrigger').getAttribute('aria-expanded')==='true'?closeSolutionMenu(true):openSolutionMenu());
$('#closeSolutions').addEventListener('click',()=>closeSolutionMenu(true));
$('#solutionSearch').addEventListener('input',renderSolutionOptions);
$('#solutionOptions').addEventListener('change',e=>{if(!e.target.matches('input[type="checkbox"]'))return;const name=e.target.value;e.target.checked?state.solutions.add(name):state.solutions.delete(name);render()});
$('#selectAllSolutions').addEventListener('click',()=>{state.solutions=new Set(allSolutions);render()});
$('#clearSolutions').addEventListener('click',()=>{state.solutions.clear();render()});
document.addEventListener('click',e=>{if(!e.target.closest('.solution-field')&&$('#solutionTrigger').getAttribute('aria-expanded')==='true')closeSolutionMenu()});
document.addEventListener('focusin',e=>{if(!e.target.closest('.solution-field')&&$('#solutionTrigger').getAttribute('aria-expanded')==='true')closeSolutionMenu()});
$('#resetFilters').addEventListener('click',reset);
$('#activeFilters').addEventListener('click',e=>{
  const button=e.target.closest('[data-clear]');if(!button)return;
  const key=button.dataset.clear;
  if(key==='query'){state.query='';$('#search').value=''}else if(key==='country')state.country='ALL';else if(key==='solutions')state.solutions.clear();else if(key==='ai')state.ai=false;else state[key]='all';
  const nextIndex=[...$('#activeFilters').children].indexOf(button);render();
  const next=$$('#activeFilters button')[nextIndex]||$$('#activeFilters button').at(-1)||$('#search');next.focus();
});
$('#results').addEventListener('click',e=>{
  const save=e.target.closest('[data-save]');if(save){toggleSaved(save.dataset.save,save);return}
  if(e.target.closest('#emptySaved')){if(savedIds.size){clearFilters();state.saved=true;render()}else{state.saved=false;reset()}return}
if(e.target.closest('#emptyReset')){reset();$('#search').focus();return}const button=e.target.closest('[data-id]');const item=button&&items.find(item=>item.id===button.dataset.id);if(item)openDetail(item)});
$('#closeDetail').addEventListener('click',()=>$('#detailPanel').close());
$('#detailPanel').addEventListener('close',()=>{activeItem=null;updateScrollLock();writeView();$('.detail-feedback')?.remove();if(lastDetailFocus?.isConnected)lastDetailFocus.focus();else $(state.saved?'#savedInitiatives':'#search').focus()});
for(const [id,step] of [['previousItem',-1],['nextItem',1]])$('#'+id).addEventListener('click',()=>{const list=displayed(),index=list.findIndex(item=>item.id===activeItem?.id),next=list[index+step];if(next)openDetail(next)});
$('[data-feature]').addEventListener('click',e=>{const item=items.find(item=>item.id===e.currentTarget.dataset.feature);if(item)openDetail(item)});
for(const [trigger,dialogId,close] of [['openPlatform','platformDialog','closePlatform'],['aboutStages','stagesDialog','closeStages']]){
  const dialog=$('#'+dialogId);
  $('#'+trigger).addEventListener('click',()=>{dialog.showModal();updateScrollLock()});
  $('#'+close).addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{updateScrollLock();$('#'+trigger).focus()});
}
$$('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}));
$('#copyView').addEventListener('click',async()=>{
  if(state.saved){showToast('Los guardados son personales. Comparte una iniciativa desde su detalle.');return}
  const params=writeView();const url=new URL(location.href);url.search=params.toString();url.hash='roadmap';
  let message;
  try{await navigator.clipboard.writeText(url.href);message='Vista copiada con tus filtros.'}catch{message='Tus filtros están en la dirección del navegador. Puedes copiarla desde allí.'}
  $('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$('#solutionTrigger').getAttribute('aria-expanded')==='true'){e.preventDefault();closeSolutionMenu(true)}
  if((e.key==='/'||((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'))&&!$$('dialog[open]').length&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.activeElement.isContentEditable){e.preventDefault();$('#search').focus()}
});
$('#filtersDisclosure').open=false;
$('#filtersDisclosure').addEventListener('toggle',()=>{if(!$('#filtersDisclosure').open)closeSolutionMenu()});
// Keep quarter headings directly below the responsive sticky search toolbar.
if('ResizeObserver'in window){
  new ResizeObserver(entries=>{
    document.documentElement.style.setProperty('--roadmap-toolbar-height',`${Math.ceil(entries[0].target.getBoundingClientRect().height)}px`);
  }).observe($('.explorer-toolbar'));
}
addEventListener('popstate',()=>{readView();render();if(activeItem)openDetail(activeItem);else if($('#detailPanel').open)$('#detailPanel').close()});
function showToast(message){
  $('#toast').hidden=true;
  const previousFeedback=$('.detail-feedback');if(previousFeedback)previousFeedback.hidden=true;
  const panel=$('#detailPanel');
  if(panel.open){
    let feedback=panel.querySelector('.detail-feedback');
    if(!feedback){feedback=document.createElement('div');feedback.className='detail-feedback';feedback.setAttribute('role','status');panel.append(feedback)}
    feedback.textContent=message;feedback.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>feedback.hidden=true,3500);
  }else{$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3500)}
}
function syncSavedUI(){
  $$('.saved-count').forEach(el=>{el.textContent=savedIds.size;el.hidden=savedIds.size===0&&el.closest('nav')!==null});
  for(const id of ['navSaved','savedInitiatives']){const el=$('#'+id);el.classList.toggle('active',state.saved);el.setAttribute('aria-pressed',String(state.saved))}
  $('#allInitiatives').classList.toggle('active',!state.saved);$('#allInitiatives').setAttribute('aria-pressed',String(!state.saved));
  $('.nav-selected').classList.toggle('muted',state.saved);
  $('#roadmapTitle').textContent=state.saved?'Tu selección, a mano.':'Descubre lo que viene.';
  $('#roadmapSubtitle').textContent=state.saved?'Tus iniciativas guardadas en este navegador.':'Cada iniciativa, más cerca de tu equipo.';
  if(activeItem){const selected=savedIds.has(activeItem.id);const button=$('#saveDetail');button.classList.toggle('is-saved',selected);button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',selected?'Quitar de guardados':'Guardar iniciativa');button.title=selected?'Quitar de guardados':'Guardar iniciativa'}
}
function toggleSaved(id,trigger){
  const wasSaved=savedIds.has(id);wasSaved?savedIds.delete(id):savedIds.add(id);
  let persisted=true;try{localStorage.setItem('roadmap-demo-saved',JSON.stringify([...savedIds]))}catch{persisted=false}
  const cardIndex=trigger?[...$$('[data-save]')].indexOf(trigger):-1;
  if(state.saved)render();else{syncSavedUI();$$('[data-save]').filter(b=>b.dataset.save===id).forEach(b=>{const item=items.find(i=>i.id===id);b.classList.toggle('is-saved',!wasSaved);b.setAttribute('aria-pressed',String(!wasSaved));b.setAttribute('aria-label',`${wasSaved?'Guardar':'Quitar de guardados'}: ${item.title}`);b.title=wasSaved?'Guardar iniciativa':'Quitar de guardados'})}
  if(trigger&&!trigger.isConnected){const targets=$$('[data-save]');(targets[Math.min(cardIndex,targets.length-1)]||$('#savedInitiatives')).focus()}
  if(activeItem)syncDetailNavigation();
  showToast(persisted?(wasSaved?'Iniciativa quitada de tus guardados.':'Guardada en tu selección.'):'Guardada solo durante esta sesión; el navegador no permite guardar datos.');
}
function syncDetailNavigation(){
  const list=displayed(),index=list.findIndex(entry=>entry.id===activeItem?.id);
  $('#detailPosition').textContent=index>=0?`${index+1} de ${list.length}`:state.saved?'Fuera de tu selección':'Iniciativa destacada';
  $('#previousItem').disabled=index<=0;$('#nextItem').disabled=index<0||index>=list.length-1;
}
function clearFilters(){
  Object.assign(state,{query:'',country:'ALL',stage:'all',year:'all',period:'all',ai:false});state.solutions.clear();$('#search').value='';$('#solutionSearch').value='';closeSolutionMenu();render();
}
function openCollection(saved){
  state.saved=saved;if(saved)clearFilters();else render();
  if(narrow.matches)$('#filtersDisclosure').open=false;
  $('#roadmap').scrollIntoView({behavior:reduced.matches?'instant':'smooth'});
}
function stageProgress(item){
  const stages=['Discovery','Próximamente','Lanzado parcialmente','Lanzado'];const index=stages.indexOf(item.stage);
  return `<div class="detail-journey"><h3>El recorrido de esta mejora</h3><ol>${stages.map((stage,i)=>`<li class="${i<index?'is-complete':i===index?'is-current':''}" ${i===index?'aria-current="step"':''}><span>${i<index?icon('check'):'<i></i>'}</span><b>${stage==='Lanzado parcialmente'?'Parcial':stage}</b></li>`).join('')}</ol></div>`;
}
$('#allInitiatives').addEventListener('click',()=>openCollection(false));
$('#savedInitiatives').addEventListener('click',()=>openCollection(true));
$('#navSaved').addEventListener('click',()=>openCollection(!state.saved));
$('.nav-selected').addEventListener('click',()=>{state.saved=false;render()});
$('#saveDetail').addEventListener('click',()=>{if(activeItem)toggleSaved(activeItem.id)});
$('#clearAllFilters').addEventListener('click',()=>{clearFilters();$('#search').focus()});
$('#compactGroup').addEventListener('change',e=>{state.group=e.target.value;render()});
$('#navSaved').setAttribute('aria-label','Mis iniciativas guardadas');
$('#copyDetail').addEventListener('click',async()=>{
  try{const params=writeView();const url=new URL(location.href);url.search=params.toString();url.hash='roadmap';await navigator.clipboard.writeText(url.href);showToast('Enlace de la iniciativa copiado.')}catch{showToast('Puedes copiar el enlace desde la dirección del navegador.')}
});
// Native dialogs retain focus trapping; only navigate when no editable control is focused.
$('#detailPanel').addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;const button=e.key==='ArrowLeft'?$('#previousItem'):e.key==='ArrowRight'?$('#nextItem'):null;if(button&&!button.disabled){e.preventDefault();button.click()}});
addEventListener('storage',e=>{if(e.key==='roadmap-demo-saved'){try{const value=JSON.parse(e.newValue||'[]');savedIds=new Set(Array.isArray(value)?value.filter(id=>items.some(item=>item.id===id)):[]);render()}catch{}}});
if('IntersectionObserver'in window){new IntersectionObserver(entries=>{document.documentElement.classList.toggle('past-hero',!entries[0].isIntersecting)},{rootMargin:'-75px 0px 0px 0px'}).observe($('.hero'))}
$('#sampleCount').textContent=items.length;$$('.total-count').forEach(el=>el.textContent=items.length);
readView();render();if(activeItem)openDetail(activeItem);
