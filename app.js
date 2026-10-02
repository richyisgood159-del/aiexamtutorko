(() => {
  'use strict';
  const VERSION = 'rebuild-1';
  const STORE_KEY = 'aiExamTutorPsychProgress:'+VERSION;
  const KEY_KEY = 'aiExamTutorOpenRouterKey';
  const papers = (window.PSY_PAPERS || []).slice().sort((a,b)=>a.year-b.year || a.code.localeCompare(b.code));
  const $ = id => document.getElementById(id);
  const els = {};
  ['sidebar','paperList','questionFilter','markFilter','paperEyebrow','questionTitle','questionMeta','sourceArea','assetStatus','answerBox','wordCount','drawToggle','drawWrap','drawCanvas','undoDraw','clearDraw','markBtn','schemeBtn','clearBtn','markProgress','markStatus','markSubstatus','countdown','prevBtn','nextBtn','randomBtn','starBtn','scoreBig','latency','aoRow','feedback','schemePanel','schemeImages','openMsPdf','attemptCount','attempts','settingsModal','settingsBtn','closeSettings','saveSettings','apiKeyInput','exportBtn','resetBtn','toast','statDone','statAvg','statStreak','mobilePapers','studyModeBtn'].forEach(k=>els[k]=$(k));

  let progress = loadProgress();
  let currentPaperCode = progress.lastPaper && papers.some(p=>p.code===progress.lastPaper) ? progress.lastPaper : papers[0]?.code;
  let currentQuestionId = progress.lastQuestion || papers[0]?.questions[0]?.id;
  let assetPromises = {};
  let autosaveTimer = null;
  let drawingDirty = false;
  let undoStack = [];
  let ctx = null;
  let focusMode = false;

  function loadProgress(){
    try { return Object.assign({questions:{},lastPaper:null,lastQuestion:null,streak:0,lastStudyDate:null}, JSON.parse(localStorage.getItem(STORE_KEY)||'{}')); }
    catch { return {questions:{},lastPaper:null,lastQuestion:null,streak:0,lastStudyDate:null}; }
  }
  function saveProgress(){ try{localStorage.setItem(STORE_KEY,JSON.stringify(progress));}catch(e){console.warn('Progress save failed',e);} }
  function qstate(id){ return progress.questions[id] || (progress.questions[id]={draft:'',starred:false,attempts:[],drawing:null}); }
  function paperByCode(c){ return papers.find(p=>p.code===c); }
  function questionById(id){ for(const p of papers){const q=p.questions.find(x=>x.id===id);if(q)return {paper:p,q};} return null; }
  function current(){ return questionById(currentQuestionId) || {paper:papers[0],q:papers[0]?.questions[0]}; }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function toast(msg){ els.toast.textContent=msg;els.toast.classList.add('show');setTimeout(()=>els.toast.classList.remove('show'),1800); }

  function filteredQuestions(){
    const f=els.questionFilter.value, mf=els.markFilter.value;
    const out=[];
    for(const p of papers){
      for(const q of p.questions){
        const s=qstate(q.id); const last=s.attempts?.at(-1);
        if(mf!=='all' && String(q.marks)!==mf) continue;
        if(f==='unanswered' && s.attempts?.length) continue;
        if(f==='wrong' && (!last || last.score>=q.marks)) continue;
        if(f==='extended' && ![8,12].includes(q.marks)) continue;
        if(f==='short' && q.marks>4) continue;
        if(f==='starred' && !s.starred) continue;
        out.push({paper:p,q});
      }
    }
    return out;
  }

  function renderPaperList(){
    els.paperList.innerHTML='';
    for(const p of papers){
      const done=p.questions.filter(q=>qstate(q.id).attempts?.length).length;
      const b=document.createElement('button');b.className='paper'+(p.code===currentPaperCode?' active':'');
      b.innerHTML=`<div class="paper-title">${esc(p.session)}</div><div class="paper-sub"><span>${p.questionCount} question parts</span><span>${done}/${p.questionCount}</span></div><div class="progress-bar"><i style="width:${Math.round(done/p.questionCount*100)}%"></i></div>`;
      b.addEventListener('click',()=>{currentPaperCode=p.code;const q=filteredQuestions().find(x=>x.paper.code===p.code)?.q || p.questions[0];go(q.id);els.sidebar.classList.remove('open');});
      els.paperList.appendChild(b);
    }
  }

  async function loadAssets(code){
    if(window.PSY_ASSETS?.[code]) return window.PSY_ASSETS[code];
    if(assetPromises[code]) return assetPromises[code];
    assetPromises[code]=new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src=`assets-${code}.js?v=1`;s.async=true;
      s.onload=()=>window.PSY_ASSETS?.[code]?resolve(window.PSY_ASSETS[code]):reject(new Error('Asset bundle loaded without data'));
      s.onerror=()=>reject(new Error('Could not load source images'));
      document.head.appendChild(s);
    });
    return assetPromises[code];
  }

  function sourceImage(src, alt){ const img=document.createElement('img');img.className='source-img';img.src=src;img.alt=alt;img.loading='eager';return img; }
  async function renderQuestion(){
    const {paper,q}=current(); if(!q)return;
    currentPaperCode=paper.code; progress.lastPaper=paper.code;progress.lastQuestion=q.id;saveProgress();
    renderPaperList();
    els.paperEyebrow.textContent=`Psychology Unit 1 • ${paper.session}`;
    els.questionTitle.textContent=`Question ${q.label}`;
    els.questionMeta.innerHTML='';
    const tags=[`${q.marks} mark${q.marks===1?'':'s'}`];
    if(q.extended)tags.push('Extended response'); if(q.calculation)tags.push('Calculation'); if(q.drawing)tags.push('Drawing');
    for(const t of tags){const s=document.createElement('span');s.className='pill'+(q.extended?' purple':'');s.textContent=t;els.questionMeta.appendChild(s);}
    const st=qstate(q.id);els.answerBox.value=st.draft||'';updateWordCount();
    els.starBtn.textContent=st.starred?'★':'☆';els.starBtn.classList.toggle('soft',!!st.starred);
    els.drawWrap.classList.toggle('show',!!q.drawing || !!st.drawing);
    els.schemePanel.classList.remove('show');els.schemeBtn.textContent='Show Pearson scheme';
    els.sourceArea.innerHTML='<div class="loading-assets">Loading exact Pearson source...</div>';els.assetStatus.textContent='';
    els.openMsPdf.href=paper.msFile;
    renderAttempts();
    const last=st.attempts?.at(-1); if(last)renderResult(last,q); else clearResult(q);
    await nextFrame(); setupCanvas(st.drawing);
    try{
      const assets=await loadAssets(paper.code); els.sourceArea.innerHTML='';
      if(q.contextImages?.length){const lab=document.createElement('div');lab.className='source-label';lab.textContent='Shared question context';els.sourceArea.appendChild(lab);for(const k of q.contextImages){const w=document.createElement('div');w.className='source-wrap';w.appendChild(sourceImage(assets[k],`Context for question ${q.label}`));els.sourceArea.appendChild(w);}}
      const lab=document.createElement('div');lab.className='source-label';lab.textContent='Question';els.sourceArea.appendChild(lab);
      for(const k of q.questionImages){const w=document.createElement('div');w.className='source-wrap';w.appendChild(sourceImage(assets[k],`Question ${q.label}`));els.sourceArea.appendChild(w);}
      els.assetStatus.textContent='Exact source crop';
      if(q.drawing)els.drawWrap.classList.add('show');
    }catch(e){els.sourceArea.innerHTML=`<div class="loading-assets">${esc(e.message)}. <a href="${esc(paper.qpFile)}" target="_blank">Open the source PDF ↗</a></div>`;}
    updateNav();updateStats();
  }

  function clearResult(q){ els.scoreBig.textContent=`-/${q.marks}`;els.latency.textContent='';els.aoRow.innerHTML='';els.feedback.innerHTML='<div class="tiny">Submit an answer to get strict Pearson-based feedback.</div>'; }
  function feedbackBox(title,text,kind=''){ if(!text)return null; const d=document.createElement('div');d.className='fb '+kind;const b=document.createElement('b');b.textContent=title;const p=document.createElement('p');p.textContent=text;d.append(b,p);return d; }
  function renderResult(a,q){
    els.scoreBig.textContent=`${a.score}/${q.marks}`;els.latency.textContent=a.latencyMs?`${(a.latencyMs/1000).toFixed(1)}s • ${a.model||'AI'}`:(a.model||'AI');els.aoRow.innerHTML='';
    if(a.ao){for(const [k,v] of Object.entries(a.ao)){const s=document.createElement('span');s.className='ao';s.textContent=`${k}: ${v}`;els.aoRow.appendChild(s);}}
    if(a.level){const s=document.createElement('span');s.className='ao';s.textContent=`Level ${a.level}`;els.aoRow.appendChild(s);}
    els.feedback.innerHTML='';
    const boxes=[feedbackBox('What earned credit',a.credit,'good'),feedbackBox('What is missing',a.missing,a.score===q.marks?'good':'warn'),feedbackBox('Highest-value improvement',a.upgrade,'warn'),feedbackBox(q.extended?'Full-mark blueprint':'Improved full-mark answer',a.modelAnswer,'')];
    boxes.filter(Boolean).forEach(x=>els.feedback.appendChild(x));
    if(!boxes.some(Boolean)){const r=feedbackBox('Examiner feedback',a.raw||'Marked successfully.','');if(r)els.feedback.appendChild(r);}
  }
  function renderAttempts(){
    const {q}=current(), s=qstate(q.id);els.attemptCount.textContent=String(s.attempts?.length||0);els.attempts.innerHTML='';
    [...(s.attempts||[])].reverse().slice(0,6).forEach(a=>{const d=document.createElement('div');d.className='attempt';d.innerHTML=`<div class="attempt-top"><span>${a.score}/${q.marks}</span><span>${new Date(a.time).toLocaleDateString()}</span></div><div class="attempt-answer"></div>`;d.querySelector('.attempt-answer').textContent=a.answer||'[drawing answer]';d.addEventListener('click',()=>renderResult(a,q));els.attempts.appendChild(d);});
    if(!s.attempts?.length)els.attempts.innerHTML='<div class="tiny" style="margin-top:8px">No attempts yet.</div>';
  }

  async function showScheme(force){
    const {paper,q}=current();const should=force===true || !els.schemePanel.classList.contains('show');
    if(!should){els.schemePanel.classList.remove('show');els.schemeBtn.textContent='Show Pearson scheme';return;}
    els.schemePanel.classList.add('show');els.schemeBtn.textContent='Hide Pearson scheme';els.schemeImages.innerHTML='<div class="tiny" style="margin-top:8px">Loading exact scheme...</div>';
    try{const assets=await loadAssets(paper.code);els.schemeImages.innerHTML='';for(const k of q.schemeImages){const w=document.createElement('div');w.className='source-wrap';w.appendChild(sourceImage(assets[k],`Mark scheme ${q.label}`));els.schemeImages.appendChild(w);}}
    catch(e){els.schemeImages.textContent=e.message;}
  }

  function go(id){
    const hit=questionById(id); if(!hit)return; currentQuestionId=id;currentPaperCode=hit.paper.code;renderQuestion();window.scrollTo({top:0,behavior:'smooth'});
  }
  function updateNav(){const list=filteredQuestions();let i=list.findIndex(x=>x.q.id===currentQuestionId);els.prevBtn.disabled=i<=0;els.nextBtn.disabled=i<0||i>=list.length-1;}
  function adjacent(delta){const list=filteredQuestions();let i=list.findIndex(x=>x.q.id===currentQuestionId);if(i<0)i=0;const x=list[i+delta];if(x)go(x.q.id);}
  function randomQuestion(){const list=filteredQuestions().filter(x=>x.q.id!==currentQuestionId);if(!list.length)return toast('No other question matches this filter.');go(list[Math.floor(Math.random()*list.length)].q.id);}

  function updateWordCount(){const n=(els.answerBox.value.trim().match(/\S+/g)||[]).length;els.wordCount.textContent=`${n} word${n===1?'':'s'}`;}
  function saveDraft(){const {q}=current();if(!q)return;const s=qstate(q.id);s.draft=els.answerBox.value;if(drawingDirty){try{s.drawing=canvasData();}catch{}}saveProgress();}

  // Drawing canvas - high DPI, Apple Pencil/mouse. Touch is ignored to avoid palm/finger marks.
  function setupCanvas(saved){
    const c=els.drawCanvas; if(!c)return;const rect=c.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2.5);const old=saved;
    c.width=Math.max(1,Math.round(rect.width*dpr));c.height=Math.max(1,Math.round(rect.height*dpr));ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111827';ctx.lineWidth=2.2;ctx.fillStyle='#fff';ctx.fillRect(0,0,rect.width,rect.height);undoStack=[];drawingDirty=false;
    if(old){const im=new Image();im.onload=()=>{ctx.drawImage(im,0,0,rect.width,rect.height);};im.src=old;}
  }
  function canvasData(){return els.drawCanvas.toDataURL('image/png');}
  function snapshot(){try{undoStack.push(canvasData());if(undoStack.length>12)undoStack.shift();}catch{}}
  let drawing=false;
  function pointerXY(e){const r=els.drawCanvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
  els.drawCanvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return; e.preventDefault();snapshot();drawing=true;drawingDirty=true;els.drawCanvas.setPointerCapture(e.pointerId);const [x,y]=pointerXY(e);ctx.beginPath();ctx.moveTo(x,y);});
  els.drawCanvas.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();const pts=e.getCoalescedEvents?e.getCoalescedEvents():[e];for(const p of pts){const [x,y]=pointerXY(p);ctx.lineTo(x,y);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y);}});
  const stopDraw=()=>{drawing=false;saveDraft();};els.drawCanvas.addEventListener('pointerup',stopDraw);els.drawCanvas.addEventListener('pointercancel',stopDraw);
  els.undoDraw.addEventListener('click',()=>{const x=undoStack.pop();if(!x)return;const im=new Image();const r=els.drawCanvas.getBoundingClientRect();im.onload=()=>{ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,els.drawCanvas.width,els.drawCanvas.height);ctx.restore();ctx.fillStyle='#fff';ctx.fillRect(0,0,r.width,r.height);ctx.drawImage(im,0,0,r.width,r.height);drawingDirty=true;saveDraft();};im.src=x;});
  els.clearDraw.addEventListener('click',()=>{snapshot();const r=els.drawCanvas.getBoundingClientRect();ctx.fillStyle='#fff';ctx.fillRect(0,0,r.width,r.height);drawingDirty=true;qstate(current().q.id).drawing=null;saveProgress();});

  function buildPrompt(q,answer,hasImage){
    const context=q.contextText?`\nSHARED CONTEXT:\n${q.contextText}\n`:'';
    const ao=Object.keys(q.ao||{}).length?`Assessment objectives: ${Object.entries(q.ao).map(([k,v])=>`${k} ${v}`).join(', ')}.`:'';
    const common=`You are a strict Pearson Edexcel International A Level Psychology Unit 1 examiner. Mark ONLY against the exact question and exact mark scheme supplied. Do not award marks for relevant-but-wrong-study material. Where the scheme says generic answers score 0, enforce that. Accept equivalent wording only when the scheme permits reasonable marking points. Do not invent criteria. Student spelling/grammar should not lose credit unless meaning is unclear. ${hasImage?'The student has also attached a drawing/graph answer image; inspect it as part of the response.':''}\n\nQUESTION ${q.label} (${q.marks} marks)${context}\n${q.questionText}\n\nEXACT PEARSON MARK SCHEME:\n${q.schemeText}\n\nSTUDENT ANSWER:\n${answer||'[answer supplied as drawing image]'}\n\n${ao}`;
    if(q.marks<=4){
      return `${common}\n\nReturn ONLY these four single-line fields, with no markdown and no extra explanation:\nSCORE: integer/${q.marks}\nCREDIT: concise points that actually earned marks\nMISSING: concise missing/incorrect point(s), or "Nothing" if full marks\nIMPROVED: a concise answer that would earn full marks`;
    }
    return `${common}\n\nThis is an extended response. Apply the exact Pearson level descriptors and AO balance in the scheme. Choose the level first from the response quality, then a mark within it.\nReturn ONLY these single-line fields, no markdown:\nSCORE: integer/${q.marks}\nLEVEL: integer or N/A\nAO: give each assessed AO as score/max, e.g. AO1 3/4; AO3 2/4\nCREDIT: strongest creditworthy content\nMISSING: what prevents the next mark/level\nUPGRADE: the single highest-value change to make\nBLUEPRINT: a compact full-mark paragraph plan, not a full essay`;
  }

  function parseExaminer(text,q){
    if(!text||typeof text!=='string')throw new Error('Examiner returned an empty answer');
    const cleaned=text.replace(/```[a-z]*|```/gi,'').trim();
    const sm=cleaned.match(/SCORE\s*:\s*(\d{1,2})\s*\/\s*(\d{1,2})/i) || cleaned.match(/(?:MARK|SCORE)\s*[:=-]\s*(\d{1,2})/i);
    if(!sm)throw new Error('Examiner response had no readable mark');
    const score=Math.max(0,Math.min(q.marks,parseInt(sm[1],10)));
    const fields={};let cur=null;
    for(const raw of cleaned.split(/\r?\n/)){
      const m=raw.match(/^\s*(SCORE|LEVEL|AO|CREDIT|MISSING|IMPROVED|UPGRADE|BLUEPRINT)\s*:\s*(.*)$/i);
      if(m){cur=m[1].toUpperCase();fields[cur]=m[2].trim();}else if(cur&&raw.trim()){fields[cur]+=' '+raw.trim();}
    }
    let level=null;if(fields.LEVEL&&!/N\/A/i.test(fields.LEVEL)){const m=fields.LEVEL.match(/\d+/);if(m)level=parseInt(m[0],10);}
    const ao={};if(fields.AO){for(const m of fields.AO.matchAll(/(AO\d)\s*[:=]?\s*(\d+)\s*\/\s*(\d+)/gi))ao[m[1].toUpperCase()]=`${m[2]}/${m[3]}`;}
    return {score,level,ao,credit:fields.CREDIT||'',missing:fields.MISSING||'',upgrade:fields.UPGRADE||'',modelAnswer:fields.IMPROVED||fields.BLUEPRINT||'',raw:cleaned};
  }

  async function oneOpenRouterRequest(apiKey,q,answer,drawing,controller,tag){
    const prompt=buildPrompt(q,answer,!!drawing);
    let userContent=prompt;
    if(drawing){userContent=[{type:'text',text:prompt},{type:'image_url',image_url:{url:drawing}}];}
    const body={model:'openrouter/free',messages:[{role:'user',content:userContent}],temperature:0.05,max_tokens:q.marks<=4?260:700};
    const res=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',signal:controller.signal,headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json','HTTP-Referer':location.origin,'X-Title':'AI Exam Tutor'},body:JSON.stringify(body)});
    const txt=await res.text();let data;try{data=JSON.parse(txt);}catch{throw new Error(`OpenRouter ${res.status}: invalid response`);}
    if(!res.ok)throw new Error(`OpenRouter ${res.status}: ${data?.error?.message||'request failed'}`);
    let content=data?.choices?.[0]?.message?.content;
    if(Array.isArray(content))content=content.map(x=>x?.text||'').join('\n');
    const parsed=parseExaminer(content,q);parsed.model=data?.model||'openrouter/free';parsed.route=tag;return parsed;
  }

  async function turboMark(q,answer,drawing){
    const apiKey=sessionStorage.getItem(KEY_KEY);if(!apiKey){openSettings();throw new Error('Add your OpenRouter API key first.');}
    const deadline=q.marks<=4?28000:58000;const hedgeDelay=q.marks<=4?3500:6000;const started=performance.now();const controllers=[];let finished=false;let hedgeStarted=false;
    const make=(tag)=>{const c=new AbortController();controllers.push(c);return oneOpenRouterRequest(apiKey,q,answer,drawing,c,tag);};
    let rejectHedge,resolveHedge;const hedgePromise=new Promise((res,rej)=>{resolveHedge=res;rejectHedge=rej;});
    const startHedge=()=>{if(hedgeStarted||finished)return;hedgeStarted=true;els.markSubstatus.textContent='Slow route detected - racing a second free examiner.';make('hedge').then(resolveHedge,rejectHedge);};
    const hedgeTimer=setTimeout(startHedge,hedgeDelay);
    const primary=make('primary').catch(e=>{startHedge();throw e;});
    const hardTimer=setTimeout(()=>controllers.forEach(c=>c.abort()),deadline);
    const uiTimer=setInterval(()=>{const sec=(performance.now()-started)/1000;els.countdown.textContent=`${sec.toFixed(1)}s / ${(deadline/1000).toFixed(0)}s`;},100);
    try{
      const result=await Promise.any([primary,hedgePromise]);finished=true;controllers.forEach(c=>c.abort());result.latencyMs=Math.round(performance.now()-started);return result;
    } catch(err){
      // If both failed very early, one final ordinary free-router call can use the remaining budget.
      const elapsed=performance.now()-started;const remain=deadline-elapsed;
      if(remain>6500){
        els.markSubstatus.textContent='Both first routes failed - using the final free fallback within the same deadline.';
        try{const r=await make('final');r.latencyMs=Math.round(performance.now()-started);finished=true;controllers.forEach(c=>c.abort());return r;}catch(e){err=e;}
      }
      if(performance.now()-started>=deadline-500 || controllers.some(c=>c.signal.aborted))throw new Error(`AI deadline reached (${Math.round(deadline/1000)}s). No successful free examiner finished in time.`);
      const msgs=(err?.errors||[err]).map(e=>e?.message).filter(Boolean);throw new Error(msgs[0]||'All free examiners failed.');
    } finally {finished=true;clearTimeout(hedgeTimer);clearTimeout(hardTimer);clearInterval(uiTimer);controllers.forEach(c=>c.abort());}
  }

  async function markCurrent(){
    const {q}=current();const answer=els.answerBox.value.trim();const s=qstate(q.id);const drawing=(drawingDirty?canvasData():s.drawing);
    if(!answer&&!drawing)return toast('Write an answer or add a drawing first.');
    saveDraft();els.markBtn.disabled=true;els.markProgress.classList.add('show');els.markStatus.textContent=q.marks<=4?'Fast examiner marking...':'Extended-response examiner marking...';els.markSubstatus.textContent=q.marks<=4?'28-second hard maximum wait.':'58-second hard maximum wait.';els.countdown.textContent='0.0s';
    try{
      const r=await turboMark(q,answer,drawing);r.answer=answer;r.time=Date.now();s.attempts=s.attempts||[];s.attempts.push(r);if(s.attempts.length>12)s.attempts=s.attempts.slice(-12);saveProgress();renderResult(r,q);renderAttempts();updateStats();renderPaperList();await showScheme(true);markStudyDay();toast(`Marked ${r.score}/${q.marks} in ${(r.latencyMs/1000).toFixed(1)}s`);
    }catch(e){
      els.feedback.innerHTML='';const box=feedbackBox('AI marking did not complete',e.message,'bad');els.feedback.appendChild(box);const exact=feedbackBox('Your answer is saved','No fake mark was recorded. The exact Pearson scheme is still available below.','');els.feedback.appendChild(exact);await showScheme(true);
    }finally{els.markBtn.disabled=false;els.markProgress.classList.remove('show');}
  }

  function markStudyDay(){const d=new Date().toISOString().slice(0,10);if(progress.lastStudyDate!==d){const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);progress.streak=progress.lastStudyDate===yesterday?(progress.streak||0)+1:1;progress.lastStudyDate=d;saveProgress();updateStats();}}
  // More efficient average independent of object lookup.
  function updateStats(){let done=0,earned=0,possible=0;for(const p of papers){for(const q of p.questions){const a=qstate(q.id).attempts?.at(-1);if(a){done++;earned+=a.score;possible+=q.marks;}}}els.statDone.textContent=done;els.statAvg.textContent=possible?Math.round(earned/possible*100)+'%':'-';els.statStreak.textContent=progress.streak||0;}

  function openSettings(){els.apiKeyInput.value=sessionStorage.getItem(KEY_KEY)||'';els.settingsModal.classList.add('show');}
  function closeSettings(){els.settingsModal.classList.remove('show');}
  function nextFrame(){return new Promise(r=>requestAnimationFrame(()=>r()));}

  els.answerBox.addEventListener('input',()=>{updateWordCount();clearTimeout(autosaveTimer);autosaveTimer=setTimeout(saveDraft,350);});
  els.markBtn.addEventListener('click',markCurrent);els.schemeBtn.addEventListener('click',()=>showScheme());els.clearBtn.addEventListener('click',()=>{els.answerBox.value='';qstate(current().q.id).draft='';saveProgress();updateWordCount();});
  els.prevBtn.addEventListener('click',()=>adjacent(-1));els.nextBtn.addEventListener('click',()=>adjacent(1));els.randomBtn.addEventListener('click',randomQuestion);
  els.questionFilter.addEventListener('change',()=>{updateNav();renderPaperList();});els.markFilter.addEventListener('change',()=>{updateNav();renderPaperList();});
  els.starBtn.addEventListener('click',()=>{const s=qstate(current().q.id);s.starred=!s.starred;saveProgress();renderQuestion();});
  els.drawToggle.addEventListener('click',()=>{els.drawWrap.classList.toggle('show');if(els.drawWrap.classList.contains('show'))setTimeout(()=>setupCanvas(qstate(current().q.id).drawing),20);});
  els.settingsBtn.addEventListener('click',openSettings);els.closeSettings.addEventListener('click',closeSettings);els.saveSettings.addEventListener('click',()=>{const k=els.apiKeyInput.value.trim();if(k)sessionStorage.setItem(KEY_KEY,k);else sessionStorage.removeItem(KEY_KEY);closeSettings();toast('Settings saved for this browser session.');});
  els.settingsModal.addEventListener('click',e=>{if(e.target===els.settingsModal)closeSettings();});
  els.mobilePapers.addEventListener('click',()=>els.sidebar.classList.toggle('open'));
  els.studyModeBtn.addEventListener('click',()=>{focusMode=!focusMode;document.querySelector('.sidebar').style.display=focusMode?'none':'';document.querySelector('.rightbar').style.display=focusMode?'none':'';document.querySelector('.shell').style.gridTemplateColumns=focusMode?'1fr':'';els.studyModeBtn.textContent=focusMode?'Exit focus':'⚡ Focus mode';});
  els.exportBtn.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(progress,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='psychology-progress.json';a.click();URL.revokeObjectURL(a.href);});
  els.resetBtn.addEventListener('click',()=>{if(confirm('Reset all Psychology progress on this device?')){localStorage.removeItem(STORE_KEY);progress=loadProgress();closeSettings();renderQuestion();toast('Progress reset.');}});
  window.addEventListener('keydown',e=>{if(e.altKey&&e.key==='ArrowRight'){e.preventDefault();adjacent(1);}if(e.altKey&&e.key==='ArrowLeft'){e.preventDefault();adjacent(-1);}if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();markCurrent();}});
  window.addEventListener('resize',()=>{clearTimeout(window.__canvasResize);window.__canvasResize=setTimeout(()=>{if(els.drawWrap.classList.contains('show'))setupCanvas(qstate(current().q.id).drawing);},250);});
  document.body.classList.add('auto-dark');
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js?v=1').catch(()=>{});}
  renderQuestion();
})();
