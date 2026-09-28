const app=document.getElementById('app');
const papers=window.PSYCH_DATA||[];
const KEY='examTutorPsychV13';
const PROGRESS_KEY='examTutorPsychProgressV16';
let state={view:'papers',paperId:null,qi:0,answers:{},results:{}};
try{state={...state,...JSON.parse(sessionStorage.getItem(KEY)||'{}')}}catch(e){}
let progress={answers:{},results:{},attempts:{}};
try{progress={...progress,...JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}')}}catch(e){}
progress.answers=progress.answers||{}; progress.results=progress.results||{}; progress.attempts=progress.attempts||{};
state.answers={...progress.answers,...(state.answers||{})}; state.results={...progress.results,...(state.results||{})};
const persistProgress=()=>{try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress))}catch(e){}};
const save=()=>{try{sessionStorage.setItem(KEY,JSON.stringify(state))}catch(e){}};
function saveProgressAnswer(k,a){progress.answers[k]=a;persistProgress()}
function saveSuccessfulResult(k,a,r){
 progress.answers[k]=a; progress.results[k]=r;
 const arr=progress.attempts[k]||(progress.attempts[k]=[]);
 arr.push({score:r.score,level:r.level||'',answer:a,result:JSON.parse(JSON.stringify(r)),at:Date.now()});
 if(arr.length>20)arr.splice(0,arr.length-20);
 persistProgress();
}
function clearProgressForPaper(id){const pre=id+'-';for(const bucket of [progress.answers,progress.results,progress.attempts])for(const k of Object.keys(bucket))if(k.startsWith(pre))delete bucket[k];persistProgress()}

const paper=()=>papers.find(p=>p.id===state.paperId)||null;
const q=()=>paper()?.questions?.[state.qi]||null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function apiKey(){return sessionStorage.getItem('examTutorOpenRouterKey')||''}
function setKey(){const v=(document.getElementById('apiKey')?.value||'').trim();if(v){sessionStorage.setItem('examTutorOpenRouterKey',v);render()}}
function openPaper(id){state.paperId=id;state.qi=0;state.view='list';save();render()}
function openQ(i){state.qi=i;state.view='viewer';save();render()}
function home(){location.href='index.html'}
function back(){state.view=state.view==='viewer'?'list':'papers';save();render()}
function resetPaper(){const pre=state.paperId+'-';for(const o of [state.answers,state.results])for(const k of Object.keys(o))if(k.startsWith(pre))delete o[k];clearProgressForPaper(state.paperId);save();render()}
function key(){return state.paperId+'-'+state.qi}
function answer(){return document.getElementById('answer')?.value?.trim()||''}
function saveAnswer(){const a=document.getElementById('answer')?.value??'';const k=key();state.answers[k]=a;save();saveProgressAnswer(k,a)}
function paperView(){
 app.innerHTML=`<button class="back" onclick="home()">← Biology / home</button><div class="hero"><div><span class="eyebrow">PSYCHOLOGY · v28 FAST PEARSON EXAMINER</span><h1>WPS01 · Social & Cognitive Psychology</h1><p>${papers.length} complete exam-series stacks with Pearson-specific AO and levels-based marking.</p></div><div class="stat"><b>${papers.length}</b><span>paper stacks</span></div></div><div class="psych-note"><b>Psychology marking:</b> short answers are marked against the exact paper-specific scheme. 8- and 12-mark responses are judged holistically against that question's Pearson level descriptors, AO balance, command word, application and conclusion/judgement requirements.</div><div class="paperGrid">${papers.map(p=>`<article class="paperCard" onclick="openPaper('${p.id}')"><div class="paperTop"><span class="subjectBadge">PSYCHOLOGY</span><span class="ready">● Ready</span></div><h3>${p.title}</h3><p>${p.code}</p><div class="paperMeta"><span>${p.time}</span><span>${p.marks} marks</span></div><button class="primary">Open stack →</button></article>`).join('')}</div>`;
}
function listView(){const p=paper();app.innerHTML=`<button class="back" onclick="back()">← Psychology papers</button><div class="paperHeader"><div><span class="subjectBadge">PSYCHOLOGY</span><h1>${p.title}</h1><p>${p.code} · ${p.time} · ${p.marks} marks</p></div><div class="pdfBtns"><a href="${p.qp}" target="_blank">Question paper ↗</a><a href="${p.ms}" target="_blank">Mark scheme ↗</a></div></div><div class="paper-tools"><span>${Object.keys(state.results).filter(k=>k.startsWith(p.id+'-')).length} / ${p.questions.length} markable parts attempted</span><button class="secondary" onclick="resetPaper()">Reset paper</button></div><div class="questionList">${p.questions.map((x,i)=>{const r=state.results[p.id+'-'+i];return `<div class="qrow" onclick="openQ(${i})"><div class="qnum">${x.n}</div><div class="grow"><b>Question ${x.n}${x.extended?' · Levels-based':''}</b><span>${x.marks} mark${x.marks!==1?'s':''}${x.drawing?' · manual graph/drawing mark':''}</span></div>${r?`<div class="miniScore">${r.score}/${x.marks}</div>`:'<div class="unattempted">Not attempted</div>'}<div class="chev">›</div></div>`}).join('')}</div>`}
function sourcePath(p,x,kind){return `psych-pages/${p.id}-${kind}-p${kind==='qp'?x.qpPage:x.msPage}.png`}
function sourceImage(p,x,kind,alt){const name=`${p.id}-${kind}-p${kind==='qp'?x.qpPage:x.msPage}.png`;const src=(window.PSYCH_IMAGES||{})[name]||sourcePath(p,x,kind);return `<figure class="question-crop"><img src="${src}" alt="${alt}" loading="eager" decoding="async" onerror="sourceFallback(this,'${kind}','${kind==='qp'?x.qpPage:x.msPage}')"></figure>`}
function sourceImages(p,x,kind,alt){if(kind==='ms'){const exact=(window.PSYCH_SCHEME_CROPS||{})[p.id+'-'+state.qi];if(exact&&exact.length)return exact.map(src=>`<figure class="question-crop"><img src="${src}" alt="${alt}" loading="eager" decoding="async"></figure>`).join('')}const pages=(kind==='qp'?(x.qpPages||[x.qpPage]):(x.msPages||[x.msPage]));return pages.map(pg=>{const name=`${p.id}-${kind}-p${pg}.png`;const src=(window.PSYCH_IMAGES||{})[name]||`psych-pages/${name}`;return `<figure class="question-crop"><img src="${src}" alt="${alt}" loading="eager" decoding="async" onerror="sourceFallback(this,'${kind}','${pg}')"></figure>`}).join('')}
function sourceFallback(img,kind,page){const p=paper();const pdf=kind==='qp'?p.qp:p.ms;img.closest('figure').outerHTML=`<div class="image-error"><b>${kind==='qp'?'Question':'Mark scheme'} preview could not load.</b><br><a class="open-page" href="${pdf}#page=${page}" target="_blank">Open the exact Pearson page ↗</a></div>`}
function viewer(){const p=paper(),x=q(),k=key(),r=state.results[k],a=state.answers[k]||'';app.innerHTML=`<div class="viewer-nav"><button class="back" onclick="back()">← Questions</button><div><button class="secondary" ${state.qi===0?'disabled':''} onclick="state.qi--;save();render()">← Previous</button> <button class="secondary" ${state.qi===p.questions.length-1?'disabled':''} onclick="state.qi++;save();render()">Next →</button></div></div><div class="viewer"><section class="exam"><div class="examBar"><span>${p.code}</span><b>${x.marks} MARK${x.marks!==1?'S':''}</b></div><div class="qn">Question ${x.n}</div>${x.extended?`<div class="guidance"><b>Levels-based ${x.marks}-marker</b><br>Pearson AO split and level descriptors are used holistically — not keyword counting.</div>`:''}<div class="source-title"><b>Actual exam question</b><span>Shown directly from your Pearson paper so tables, scenarios and figures stay intact.</span></div><div class="source-pages">${sourceImages(p,x,'qp','Original Pearson question')}</div><textarea id="answer" class="answer" placeholder="Write your exam answer here..." oninput="saveAnswer();updateWordCount()">${esc(a)}</textarea><div class="answer-meta"><span id="wordCount">${a.trim()?a.trim().split(/\s+/).length:0} words</span><span>${x.extended?'Pearson levels-based response':'Answer only what the command word requires'}</span></div><div class="actions">${x.drawing?`<button class="primary" onclick="toggleScheme()">Show mark scheme & self-mark</button>`:`<button class="primary" id="markBtn" onclick="markAI()">${!x.extended&&x.marks<=4?'⚡ Mark answer':'✦ Mark written answer'}</button>`}<button class="secondary" onclick="toggleScheme()">Show Pearson scheme</button><button class="secondary" onclick="clearAnswer()">Clear</button></div>${x.drawing?manualBox(x):''}<div id="schemeBox" class="official-ms" hidden><h3>Actual Pearson mark scheme</h3><p>Original mark-scheme page for this question.</p><div class="source-pages">${sourceImages(p,x,'ms','Official Pearson mark scheme')}</div></div>${r?resultBox(r,x):''}</section><aside class="sidebar"><div class="sideCard"><span class="tiny">PAPER</span><b>${p.title}</b><p>${p.code}</p></div><div class="sideCard"><span class="tiny">PROGRESS</span><b>${Object.keys(state.results).filter(z=>z.startsWith(p.id)).length} / ${p.questions.length} parts attempted</b></div><div class="sideCard"><span class="tiny">QUESTION</span><b>${state.qi+1} of ${p.questions.length}</b><p>${x.extended?`${x.marks}-mark Pearson levels-based response.`:'Short-answer Pearson marking.'}</p></div><div class="ai-status"><span class="ai-dot ${apiKey()?'':'off'}"></span>${apiKey()?'AI examiner connected':'AI examiner not connected'}</div>${!apiKey()&&!x.drawing?`<div class="ai-setup"><b>AI examiner setup</b><p class="ai-note">Connect your OpenRouter key for Psychology marking.</p><input id="apiKey" type="password" autocomplete="off" placeholder="OpenRouter API key"><button class="secondary" onclick="setKey()">Connect AI</button></div>`:''}<a class="sideLink" href="${p.qp}#page=${x.qpPage}" target="_blank">Open original question paper ↗</a></aside></div>`}
function updateWordCount(){const a=document.getElementById('answer')?.value.trim()||'';const e=document.getElementById('wordCount');if(e)e.textContent=(a?a.split(/\s+/).length:0)+' words'}
function clearAnswer(){const k=key();state.answers[k]='';delete state.results[k];delete progress.answers[k];delete progress.results[k];persistProgress();save();render()}
function toggleScheme(){const b=document.getElementById('schemeBox');if(!b)return;b.hidden=!b.hidden;if(!b.hidden)b.scrollIntoView({behavior:'smooth',block:'start'})}
function manualBox(x){return `<div class="psych-note"><b>Graph/drawing question:</b> AI marking is disabled. Complete it on paper or in the PDF, reveal the Pearson scheme, then self-mark.</div><div class="actions"><button class="primary" onclick="toggleScheme()">Show Pearson scheme</button></div><div class="manual-score">${Array.from({length:x.marks+1},(_,i)=>`<button class="secondary" onclick="selfMark(${i})">${i}/${x.marks}</button>`).join('')}</div>`}
function selfMark(s){state.results[key()]={score:s,self:true};save();render()}
function normWords(s){return String(s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2&&!['the','and','that','this','with','from','into','for','are','was','were','has','have','because'].includes(w))}
function reviewAnswer(k,r){
 const a=state.answers[k]||''; if(!a.trim())return '';
 const evidence=(r.awarded||[]).map(v=>String(v).split(/\s*(?:->|→)\s*/)[0]).filter(Boolean);
 const evSets=evidence.map(e=>new Set(normWords(e))).filter(x=>x.size);
 const sentences=a.match(/[^.!?\n]+[.!?]?|\n+/g)||[a];
 const marked=sentences.map(part=>{if(/^\s*$/.test(part))return esc(part);const words=normWords(part),set=new Set(words);let best=0;for(const ev of evSets){let hit=0;for(const w of ev)if(set.has(w))hit++;best=Math.max(best,hit/Math.max(1,ev.size));}const cls=best>=.58?'credit-highlight':best>=.38?'partial-highlight':'';return cls?`<mark class="${cls}">${esc(part)}</mark>`:esc(part)}).join(' ');
 return `<div class="answer-review"><h3>Your marked answer</h3><div class="review-key"><span><i class="credit-dot"></i> credited evidence</span><span><i class="partial-dot"></i> possible partial match</span></div><div class="review-text">${marked}</div></div>`;
}
function attemptHistory(k,x){
 const arr=progress.attempts[k]||[];if(!arr.length)return '';
 const first=arr[0].score,last=arr[arr.length-1].score,delta=last-first;
 const cards=arr.map((v,i)=>{const rr=v.result||{};return `<details class="attempt-detail"><summary>Attempt ${i+1}: <b>${v.score}/${x.marks}</b>${v.level?` · L${esc(v.level)}`:''}</summary><div class="attempt-answer"><b>Your answer:</b><div>${esc(v.answer||'')}</div>${rr.awarded?.length?`<b>What earned credit:</b><ul>${rr.awarded.map(z=>`<li>${esc(z)}</li>`).join('')}</ul>`:''}${rr.missed?.length?`<b>What was missing:</b><ul>${rr.missed.map(z=>`<li>${esc(z)}</li>`).join('')}</ul>`:''}${rr.why?`<b>Examiner reasoning:</b><div>${esc(rr.why)}</div>`:''}${rr.next?`<b>Best improvement:</b><div>${esc(rr.next)}</div>`:''}</div></details>`}).join('');
 return `<div class="attempt-history"><h3>Previous answers & attempt history</h3><div class="attempt-chips">${cards}</div>${arr.length>1?`<p class="attempt-change">Change from first attempt: <b>${delta>=0?'+':''}${delta} mark${Math.abs(delta)===1?'':'s'}</b></p>`:''}</div>`
}
function resultBox(r,x){const ao=r.ao||{},fast=!x.extended&&x.marks<=4;if(fast)return `<div class="result"><div class="resultHead"><div><span class="tiny">MARK</span><div class="bigScore">${r.score}<small>/${x.marks}</small></div></div></div>${r.awarded?.length?`<h3>Credit</h3><ul>${r.awarded.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`:''}${r.missed?.length?`<h3>Missing</h3><ul>${r.missed.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`:''}${r.next&&r.score<x.marks?`<p><b>Fix:</b> ${esc(r.next)}</p>`:''}${r.improved?`<p><b>Full-mark answer:</b> ${esc(r.improved)}</p>`:''}${reviewAnswer(key(),r)}<button class="secondary" onclick="toggleScheme()">Pearson scheme</button></div>`;return `<div class="result"><div class="resultHead"><div><span class="tiny">MARK</span><div class="bigScore">${r.score}<small>/${x.marks}</small></div></div></div>${r.level?`<p><span class="level-badge">Level ${esc(r.level)}</span></p>`:''}${x.extended?`<div class="ao-grid"><div class="ao-card"><b>AO1</b><br>${esc(ao.AO1||'—')}</div><div class="ao-card"><b>AO2</b><br>${esc(ao.AO2||'—')}</div><div class="ao-card"><b>AO3</b><br>${esc(ao.AO3||'—')}</div></div>`:''}${r.awarded?.length?`<h3>What earned credit</h3><ul>${r.awarded.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`:''}${r.missed?.length?`<h3>What is missing</h3><ul>${r.missed.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`:''}${x.extended&&(r.chains||r.balance||r.conclusion)?`<div class="extended-checks"><div><b>Reasoning chains</b><span>${esc(r.chains||'—')}</span></div><div><b>Balance / application</b><span>${esc(r.balance||'—')}</span></div><div><b>Conclusion / judgement</b><span>${esc(r.conclusion||'—')}</span></div></div>`:''}${r.why?`<h3>${x.extended?'Why this level/mark':'Examiner reasoning'}</h3><p>${esc(r.why)}</p>`:''}${r.blocker?`<h3>Why it did not reach the next level</h3><p>${esc(r.blocker)}</p>`:''}${r.next?`<h3>Highest-value improvement</h3><p>${esc(r.next)}</p>`:''}${r.improved?`<h3>Full-mark model</h3><p>${esc(r.improved)}</p>`:''}${reviewAnswer(key(),r)}${attemptHistory(key(),x)}<button class="secondary" onclick="toggleScheme()">Compare with Pearson scheme</button></div>`}
function line(t,n){const m=t.match(new RegExp('(?:^|\\n)'+n+'\\s*:\\s*(.*)','i'));return m?m[1].trim():''}
function split(v){return String(v||'').split(/\s*\|\s*/).map(s=>s.trim()).filter(s=>s&&!/^(none|n\/a|—)$/i.test(s))}
async function auditExtended(x,a,first,token,endpoint){
 const prompt=`You are the SECOND senior Pearson Edexcel IAL Psychology WPS01 examiner. Audit another examiner's mark independently. Do not defer to their judgement.\n\nQUESTION/STIMULUS:\n${x.questionContext}\n\nOFFICIAL PEARSON SCHEME/DESCRIPTORS:\n${x.scheme}\n\nSTUDENT ANSWER:\n${a}\n\nFIRST EXAMINER:\n${JSON.stringify(first)}\n\nApply best-fit levels exactly. Check AO balance, command word, developed chains, contextual AO2 where required, competing arguments, and whether a supported conclusion/judgement is required by THIS descriptor. A named study/evaluation point only counts when accurate and relevant. Do not infer unstated material. If the first mark is sound, keep it; if not, correct it.\nReturn ONLY:\nSCORE: integer 0-${x.marks}\nLEVEL: 1, 2, 3 or 4\nAO1: brief audit\nAO2: brief audit\nAO3: brief audit\nCHAINS: brief audit\nBALANCE: brief audit\nCONCLUSION: brief audit\nAWARDED: evidence -> credit | evidence -> credit\nMISSED: requirement | requirement\nWHY_LEVEL: concise best-fit justification\nBLOCKER: exact next-level blocker or Top level\nNEXT: single highest-value improvement\nIMPROVED: concise full-mark answer`;
 const models=['nvidia/nemotron-3-ultra-550b-a55b:free','inclusionai/ling-3.0-flash:free','openrouter/free'];
 for(const model of models){try{const c=new AbortController(),timer=setTimeout(()=>c.abort(),26000);let res;try{res=await fetch(endpoint,{method:'POST',signal:c.signal,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','HTTP-Referer':location.origin,'X-Title':'Private Exam Tutor'},body:JSON.stringify({model,temperature:0,max_tokens:1050,provider:{sort:'latency',allow_fallbacks:true},messages:[{role:'user',content:prompt}]})})}finally{clearTimeout(timer)}if(!res.ok)continue;const d=await res.json(),t=typeof d?.choices?.[0]?.message?.content==='string'?d.choices[0].message.content:'';let score=Number((line(t,'SCORE').match(/\d+/)||[])[0]),level=line(t,'LEVEL').match(/[1-4]/)?.[0];if(!Number.isFinite(score)||!level)continue;const bands=x.marks===12?{1:[1,3],2:[4,6],3:[7,9],4:[10,12]}:{1:[1,2],2:[3,4],3:[5,6],4:[7,8]},band=bands[level];score=Math.max(band[0],Math.min(band[1],Math.round(score)));const awarded=split(line(t,'AWARDED'));if(score>0&&!awarded.length)continue;return {score,level,ao:{AO1:line(t,'AO1'),AO2:line(t,'AO2'),AO3:line(t,'AO3')},chains:line(t,'CHAINS'),balance:line(t,'BALANCE'),conclusion:line(t,'CONCLUSION'),awarded,missed:split(line(t,'MISSED')),why:line(t,'WHY_LEVEL'),blocker:line(t,'BLOCKER'),next:line(t,'NEXT'),improved:line(t,'IMPROVED'),audited:true}}catch(e){}}
 return first;
}
function responseText(d){
 const m=d?.choices?.[0]?.message||{};
 const candidates=[m.content,m.output_text,d?.output_text,d?.response,d?.text];
 for(const c of candidates){
  if(typeof c==='string'&&c.trim())return c.trim();
  if(Array.isArray(c)){const out=c.map(v=>typeof v==='string'?v:(v?.text||v?.content||v?.value||'')).join('\n').trim();if(out)return out}
  if(c&&typeof c==='object'){try{const out=JSON.stringify(c);if(out&&out!=='{}')return out}catch(_){}}
 }
 return '';
}
function parseExaminerText(t,x,extended){
 t=String(t||'').trim(); if(!t)throw new Error('Examiner returned no final answer');
 let obj=null;
 try{const clean=t.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');obj=JSON.parse(clean)}catch(e){const m=t.match(/\{[\s\S]*\}/);if(m)try{obj=JSON.parse(m[0])}catch(_){}}
 const get=(name)=>{if(obj){const keys=Object.keys(obj),k=keys.find(k=>k.toLowerCase()===name.toLowerCase());if(k!=null){const v=obj[k];return Array.isArray(v)?v.join(' | '):String(v??'')}}return line(t,name)};
 let rawScore=obj?.score ?? obj?.mark ?? obj?.marks ?? get('SCORE');
 let num=Number((String(rawScore).match(/-?\d+(?:\.\d+)?/)||[])[0]);
 if(!Number.isFinite(num)){const m=t.match(/(?:score|mark|marks)\s*(?:is|=|:)?\s*(\d+)\s*\/\s*\d+/i)||t.match(/\b(\d+)\s*\/\s*\d+\b/);if(m)num=Number(m[1])}
 if(!Number.isFinite(num))throw new Error('Examiner response had no readable mark');
 num=Math.max(0,Math.min(x.marks,Math.round(num)));
 let level=extended?String(obj?.level??get('LEVEL')).match(/[1-4]/)?.[0]||'':'';
 if(extended&&!level&&num>0){const bs=x.marks===12?[[1,3,1],[4,6,2],[7,9,3],[10,12,4]]:[[1,2,1],[3,4,2],[5,6,3],[7,8,4]];level=String((bs.find(([lo,hi])=>num>=lo&&num<=hi)||bs[0])[2])}
 if(extended&&num===0)level='';
 if(extended&&level){const bands=x.marks===12?{1:[1,3],2:[4,6],3:[7,9],4:[10,12]}:{1:[1,2],2:[3,4],3:[5,6],4:[7,8]},band=bands[level];if(band)num=Math.max(band[0],Math.min(band[1],num))}
 const list=n=>{const low=n.toLowerCase();const v=obj?.[low]??obj?.[n]??get(n);return Array.isArray(v)?v.map(String).filter(Boolean):split(v)};
 const aoObj=obj?.ao||{}; const aoVal=n=>String((aoObj[n]??aoObj[n.toLowerCase()]??obj?.[n.toLowerCase()]??get(n))||'');
 return {score:num,level,ao:{AO1:aoVal('AO1'),AO2:aoVal('AO2'),AO3:aoVal('AO3')},chains:String((obj?.chains??get('CHAINS'))||''),balance:String((obj?.balance??get('BALANCE'))||''),conclusion:String((obj?.conclusion??get('CONCLUSION'))||''),awarded:list('AWARDED'),missed:list('MISSED'),why:String((obj?.why_level??obj?.why??get('WHY_LEVEL'))||''),blocker:String((obj?.blocker??get('BLOCKER'))||''),next:String((obj?.next??get('NEXT'))||''),improved:String((obj?.improved??get('IMPROVED'))||'')};
}
function examinerSchema(x,extended){return {type:'json_schema',json_schema:{name:'pearson_examiner_result',strict:true,schema:{type:'object',properties:{score:{type:'integer',minimum:0,maximum:x.marks},level:extended?{anyOf:[{type:'integer',minimum:1,maximum:4},{type:'null'}]}:{type:'null'},ao1:{type:'string'},ao2:{type:'string'},ao3:{type:'string'},chains:{type:'string'},balance:{type:'string'},conclusion:{type:'string'},awarded:{type:'array',items:{type:'string'}},missed:{type:'array',items:{type:'string'}},why_level:{type:'string'},blocker:{type:'string'},next:{type:'string'},improved:{type:'string'}},required:['score','level','ao1','ao2','ao3','chains','balance','conclusion','awarded','missed','why_level','blocker','next','improved'],additionalProperties:false}}}}
async function examinerRequest(endpoint,token,body,timeout=45000){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);let res,d=null;
 try{
  res=await fetch(endpoint,{method:'POST',signal:c.signal,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','HTTP-Referer':location.origin,'X-Title':'Private Exam Tutor'},body:JSON.stringify(body)});
  try{d=await res.json()}catch(e){if(e?.name==='AbortError')throw e}
 }finally{clearTimeout(timer)}
 if(!res.ok)throw new Error(`OpenRouter ${res.status}${d?.error?.message?': '+d.error.message:''}`);
 return d||{};
}
async function markAI(){
 const x=q(),a=answer(); if(!a)return alert('Write an answer first.');
 const token=apiKey(); if(!token)return alert('Connect your OpenRouter key first.'); saveAnswer();
 const k=key(),b=document.getElementById('markBtn'); if(b){b.disabled=true;b.textContent='Checking against Pearson…'}
 const command=(x.questionContext.match(/\b(Evaluate|Assess|Discuss|Explain|Describe|State|Calculate|Give|To what extent)\b/i)||[])[1]||'Answer',extended=!!x.extended;
 const endpoint=(window.EXAM_TUTOR_AI||{}).endpoint||'https://openrouter.ai/api/v1/chat/completions';
 const isIPad=/iPad/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const shortFast=!extended&&x.marks<=4;
 let prompt,attempts;
 if(shortFast){
  // TRUE FAST PATH: tiny response and a timeout covering the entire streamed response body.
  prompt=`Pearson Edexcel IAL Psychology WPS01 examiner. Mark strictly against ONLY this exact scheme.\nQ (${x.marks} marks): ${x.questionContext}\nSCHEME: ${x.scheme}\nANSWER: ${a}\nReturn ONLY minified JSON with exactly these keys: {"score":0,"awarded":["brief credited point"],"missed":["brief missing point"],"improved":"concise full-mark answer"}. No explanation outside JSON.`;
  const fastBase={temperature:0,max_tokens:180,provider:{allow_fallbacks:true,sort:'latency'},messages:[{role:'user',content:prompt}]};
  attempts=[
   {label:'⚡ Marking…',timeout:isIPad?10000:15000,body:{...fastBase,model:'openrouter/free'}},
   {label:'⚡ Backup…',timeout:isIPad?14000:20000,body:{...fastBase,model:'nvidia/nemotron-3-ultra-550b-a55b:free'}}
  ]; }else{
  const rules=extended?`THIS IS A PEARSON LEVELS-BASED ${x.marks}-MARK RESPONSE. Use the exact supplied descriptors holistically. Judge AO quality, choose best-fit level, then a mark within it. Do not infer unstated material. Scenario AO2 must explicitly use scenario details. Developed evaluation requires linked reasoning. Apply the command word exactly.`:`SHORT-ANSWER MODE. Mark strictly against this exact question-specific Pearson scheme. Respect AO1/AO2/AO3, application, caps, working, units/rounding and any generic-answer restriction. Never invent a marking point.`;
  prompt=`You are a senior Pearson Edexcel International A Level Psychology WPS01 examiner.\n${rules}\n\nQUESTION ${x.n} — ${x.marks} marks\nCOMMAND WORD: ${command}\nQUESTION/STIMULUS:\n${x.questionContext}\n\nOFFICIAL PEARSON MARK SCHEME/DESCRIPTORS:\n${x.scheme}\n\nSTUDENT ANSWER:\n${a}\n\nReturn the examiner result using the supplied JSON schema. For awarded, quote the student's exact or near-exact wording that earned credit, then state the credit. For missed, state what was required but absent. why_level must explain the mark. next must give one highest-value improvement. improved must be a concise full-mark model answer.`;
  const schema=examinerSchema(x,extended);
  const base={temperature:0,max_tokens:extended?1800:850,response_format:schema,provider:{allow_fallbacks:true,require_parameters:true,sort:'latency'},messages:[{role:'user',content:prompt}]};
  attempts=[
   {label:'Checking against Pearson…',timeout:isIPad?18000:70000,body:{...base,model:'qwen/qwen3.8-27b:free'}},
   {label:'Trying backup examiner…',timeout:isIPad?18000:70000,body:{...base,model:'google/gemma-4-26b-a4b-it:free'}},
   {label:'Trying another examiner…',timeout:isIPad?18000:70000,body:{...base,model:'openrouter/free'}},
   {label:'Final examiner fallback…',timeout:isIPad?40000:70000,body:{model:'nvidia/nemotron-3-ultra-550b-a55b:free',temperature:0,max_tokens:extended?1800:850,provider:{allow_fallbacks:true,sort:'latency'},messages:[{role:'user',content:prompt+'\\nIf JSON schema mode is unavailable, return a single JSON object with keys score, level, ao1, ao2, ao3, chains, balance, conclusion, awarded, missed, why_level, blocker, next, improved.'}]}}
  ];
 }
 let last='Examiner unavailable',errors=[];
 for(const attempt of attempts){
  try{
   if(b)b.textContent=attempt.label;
   const d=await examinerRequest(endpoint,token,attempt.body,attempt.timeout),t=responseText(d);
   if(!t)throw new Error('Provider returned an empty answer');
   const rr=parseExaminerText(t,x,extended);
   if(shortFast){
    if(rr.score>0&&!rr.awarded.length)throw new Error('Provider returned a positive mark without credited evidence');
    if(rr.score<x.marks&&!rr.missed.length)throw new Error('Provider did not explain missing marks');
    if(!rr.improved)throw new Error('Provider returned no full-mark model');
    rr.why=rr.why||(rr.score===x.marks?'Matches the exact Pearson marking points.':'Marked against the exact Pearson scheme.');
    rr.next=rr.next||(rr.score<x.marks?(rr.missed[0]||'Add the missing Pearson marking point.'):'');
   }else{
    if(!rr.why)throw new Error('Provider returned no examiner reasoning');
    if(!rr.improved)throw new Error('Provider returned no full-mark model');
    if(rr.score>0&&!rr.awarded.length)throw new Error('Provider returned a positive mark without credited evidence');
    if(rr.score<x.marks&&!rr.missed.length)throw new Error('Provider did not explain missing marks');
    if(!rr.next&&rr.score<x.marks)throw new Error('Provider returned no improvement advice');
   }
   state.results[k]=rr; progress.results[k]=rr; save(); saveSuccessfulResult(k,a,rr); render();
   if(shortFast)setTimeout(()=>{const sb=document.getElementById('schemeBox');if(sb)sb.hidden=false},0);
   return;
  }catch(e){last=e?.name==='AbortError'?'Examiner timed out':(e?.message||String(e));errors.push(last)}
 }
 if(b){b.disabled=false;b.textContent=shortFast?'⚡ Mark answer':'✦ Mark written answer'}
 const unique=[...new Set(errors)].slice(-3).join(' / ');
 alert('AI marking could not complete because every free examiner failed or returned incomplete data. Your answer is saved and no fake mark was recorded.\\n\\nDetails: '+(unique||last)+'\\n\\nYou can still open the Pearson scheme, or tap Mark written answer to retry.');
}

function render(){if(!state.paperId||state.view==='papers')paperView();else if(state.view==='list')listView();else viewer()}
render();
