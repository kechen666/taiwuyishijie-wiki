const WanquUI = (() => {
  let view='normal';
  const character=id=>D.wanqu.characters.find(c=>c.id===id);
  const ability=id=>D.wanqu.abilities.find(a=>a.id===id);
  const note=()=>`<span class="status-badge">配置描述</span><span class="guide-date">数据 ${esc(D.wanqu.metadata.snapshotDate)} · 未实测</span>`;
  const caveats=rows=>rows.length?`<div class="guide-caveat">${rows.map(s=>`<p>${esc(s)}</p>`).join('')}</div>`:'';
  const personality=c=>c.personalityById+(c.personalityById!==c.personalityDisplay?' / 显示为'+c.personalityDisplay:'');
  const status=c=>!c.available?'停用配置':c.activeRecruitPools.length?'列入默认招募池':'未列默认招募池';
  const stats=c=>`<span class="wanqu-stats"><span>工作 <b>${c.work}</b></span><span>知识 <b>${c.knowledge}</b></span></span>`;
  const tags=c=>`<span class="tag">${esc(c.rarityName)}</span>${!c.available?'<span class="tag wanqu-warning">已停用</span>':''}`;
  const title=c=>c.group==='normal'?c.sect+' · '+c.rank:c.rank+' · '+(c.names[0]||c.id);

  function filterCharacters(data,{group='normal',query='',sect='',rarity='',personalityId=''}={}){
    const q=query.trim().toLowerCase(),abilities=new Map(data.abilities.map(a=>[a.id,a]));
    return data.characters.filter(c=>(!group||c.group===group)&&(!sect||c.sectId===sect)&&(!rarity||String(c.rarity)===rarity)&&(!personalityId||c.personalityId===personalityId)&&
      [c.id,c.sect,c.rank,c.rarityName,c.personalityById,c.personalityDisplay,...c.names,...c.abilityPools.flat().map(p=>{const a=abilities.get(p.id);return a.name+' '+a.description;})].join(' ').toLowerCase().includes(q));
  }
  function filterAbilities(data,query=''){
    const q=query.trim().toLowerCase();
    return data.abilities.filter(a=>(a.id+' '+a.name+' '+a.description).toLowerCase().includes(q));
  }
  function setView(next){
    if(!['normal','special','abilities'].includes(next))return;
    view=next;
    for(const id of ['wanquSect','wanquRarity','wanquPersonality'])document.getElementById(id).value='';
    render();
  }
  function reset(){
    document.getElementById('wanquSearch').value='';
    for(const id of ['wanquSect','wanquRarity','wanquPersonality'])document.getElementById(id).value='';
    render();
  }
  function characterCard(c){
    const pools=c.abilityPools.filter(p=>p.length);
    return `<button type="button" class="guide-card wanqu-card ${!c.available?'wanqu-disabled':''}" onclick="WanquUI.openCharacter('${c.id}')"><span class="guide-card-head"><span class="wanqu-seal" aria-hidden="true">${esc(c.group==='normal'?c.sect[0]:'异')}</span><span><strong>${esc(title(c))}</strong><small>${esc(personality(c))}</small></span></span><span class="wanqu-tags">${tags(c)}</span>${stats(c)}<span class="wanqu-names">${c.names.map(n=>`<span>${esc(n)}</span>`).join('')||'<span>未配置姓名</span>'}</span><span class="wanqu-pool-preview">${pools.map((pool,i)=>`${pools.length>1?(i===0?'基础':'进阶'):'能力'}池 ${pool.length} 项抽 1`).join(' · ')||'未配置能力池'}</span><span class="guide-card-foot"><span>${esc(status(c))}</span><span>查看姓名与能力 →</span></span></button>`;
  }
  function abilityCard(a){
    const count=a.templates.filter(id=>{const c=character(id);return c.available;}).length;
    return `<button type="button" class="guide-card wanqu-card" onclick="WanquUI.openAbility('${a.id}')"><span class="guide-card-head"><span class="wanqu-seal" aria-hidden="true">能</span><span><strong>${esc(a.name)}</strong><small>${esc(a.id)}</small></span></span><p>${escFx(a.description)}</p><span class="guide-card-foot"><span>${count} 条启用正式模板可抽取</span><span>查看关联人物 →</span></span></button>`;
  }
  function render(){
    const data=D.wanqu,q=document.getElementById('wanquSearch').value;
    document.getElementById('wanquKinds').innerHTML=[['normal','门派人物',data.metadata.counts.normal],['special','特殊人物',data.metadata.counts.special],['abilities','能力词条',data.metadata.counts.abilities]].map(([key,label,count])=>`<button type="button" class="chip ${key===view?'on':''}" aria-pressed="${key===view}" onclick="WanquUI.setView('${key}')">${label} · ${count}</button>`).join('');
    document.getElementById('wanquCharacterFilters').hidden=view==='abilities';
    const rows=view==='abilities'?filterAbilities(data,q):filterCharacters(data,{group:view,query:q,sect:document.getElementById('wanquSect').value,rarity:document.getElementById('wanquRarity').value,personalityId:document.getElementById('wanquPersonality').value});
    const total=view==='abilities'?data.abilities.length:data.characters.filter(c=>c.group===view).length;
    document.getElementById('wanquCount').textContent=`${rows.length} / ${total} 条${view==='abilities'?'能力配置':'人物模板'}`;
    document.getElementById('wanquGrid').innerHTML=rows.map(view==='abilities'?abilityCard:characterCard).join('')||'<p class="summary-empty">没有匹配的记录。可切换分类，或重置搜索与筛选。</p>';
  }
  function source(entry){
    return `<details class="guide-source"><summary>数据来源与验证状态</summary><p>${esc(entry.sourceTable)} · Index ${entry.sourceIndex}<br>${esc(entry.id)}<br>源文件 design.dat · ${esc(D.wanqu.metadata.snapshotDate)}<br>SHA256 ${esc(D.wanqu.metadata.databaseSha256)}</p><p>配置与静态关联，未作游戏内实测。启用标记不等于在所有模式中均可获得。</p></details>`;
  }
  function openCharacter(id){
    const c=character(id);if(!c)return;
    const pools=c.abilityPools.map((pool,i)=>pool.length?`<details class="wanqu-pool" ${pool.length<5?'open':''}><summary>${i===0?'能力池 1':'能力池 2'}<span>${pool.length} 项 · 加权抽 1</span></summary><div class="wanqu-pool-list">${pool.map(p=>{const a=ability(p.id);return `<button type="button" class="wanqu-ability-link" onclick="WanquUI.openAbility('${p.id}','${c.id}')"><span><strong>${esc(a.name)}</strong><small>${esc(a.id)}</small><span class="wanqu-effect">${escFx(a.description)}</span></span><span class="wanqu-weight">权重 ${p.weight}<small>${(p.probability*100).toFixed(2)}%</small><small>查看详情 →</small></span></button>`;}).join('')}</div></details>`:'').join('');
    const recruit=D.wanqu.recruitPoolEntries.filter(r=>r['模板ID']===id);
    showDrawer(`<div class="d-id">宛渠之民 · ${esc(c.kind)}</div><h2 class="d-name">${esc(title(c))}</h2><p>${note()}</p><div class="wanqu-tags">${tags(c)}<span class="tag">${esc(c.sect)}</span><span class="tag">${esc(personality(c))}</span></div>${stats(c)}${!c.available?caveats(['该人物模板 Avaliable=0，属于停用配置，不视为当前可获得。']):''}${caveats(c.notes)}<div class="d-sec">可能姓名<small>${c.names.length} 个名称条目</small></div><div class="wanqu-names">${c.names.map((n,i)=>`<span title="${esc(c.nameTids[i])}">${esc(n)}</span>`).join('')||'未配置'}</div><p class="summary-note">姓名从名称池抽取，与能力没有固定对应。同名条目保留各自原ID。</p><div class="d-sec">可能能力</div><p class="summary-note">初始化路径对每个非空能力池各抽 1 项。下列百分比仅为该能力池内的名义概率，不代表人物招募率。</p>${pools||'<p class="summary-empty">此模板两个能力池均为空。</p>'}<div class="d-sec">默认招募池记录</div><p class="summary-note">${recruit.length?recruit.map(r=>esc(r['池ID'])+' · 位置 '+r['池内顺序']+' · 权重 '+r['原始权重']).join('<br>'):'未列入当前启用的默认招募池；这不排除其他剧情或事件入口。'}</p><p class="summary-note">池中重复位置原样保留；唯一人物排重与强制分支会影响分布，未计算最终招募概率。</p>${source(c)}`);
  }
  function openAbility(id,backId){
    const a=ability(id);if(!a)return;
    const related=a.templates.map(character).filter(Boolean);
    const refs=['normal','special'].map(group=>{
      const list=related.filter(c=>c.group===group);if(!list.length)return '';
      return `<details class="wanqu-related" open><summary>${{normal:'门派人物',special:'特殊人物'}[group]} · ${list.length}</summary><div class="wanqu-related-list">${list.map(c=>`<button type="button" onclick="WanquUI.openCharacter('${c.id}')"><strong>${esc(title(c))}${!c.available?' · 已停用':''}</strong><span>${esc(c.rarityName)} · ${esc(personality(c))} · 工作 ${c.work} / 知识 ${c.knowledge}</span><small>${esc(c.id)}</small></button>`).join('')}</div></details>`;
    }).join('');
    showDrawer(`<div class="d-id">宛渠之民 · 能力词条</div><h2 class="d-name">${esc(a.name)}</h2><p>${note()}</p><div class="d-desc">${escFx(a.description)}</div>${caveats(a.notes)}${backId&&character(backId)?`<button class="btn ghost" onclick="WanquUI.openCharacter('${backId}')">← 返回人物</button>`:''}<div class="d-sec">哪些人物可能拥有<small>按模板能力池关联</small></div><p class="summary-note">列入池中表示可能抽到，不表示必然拥有；停用配置另作标记。</p>${refs||'<p class="summary-empty">当前模板没有引用。</p>'}<details class="guide-source"><summary>原始效果字段</summary><dl class="wanqu-fields">${Object.entries(a.fields).map(([key,value])=>`<dt>${esc(key)}</dt><dd>${esc(value)}</dd>`).join('')}</dl></details>${source(a)}`);
  }
  function init(){
    const data=D.wanqu;
    const sects=new Map(data.characters.filter(c=>c.group==='normal'||c.group==='special').map(c=>[c.sectId,c.sect]));
    document.getElementById('wanquSect').innerHTML='<option value="">全部门派</option>'+[...sects].map(([id,name])=>`<option value="${id}">${esc(name)}</option>`).join('');
    document.getElementById('wanquRarity').innerHTML='<option value="">全部等级</option>'+[...new Map(data.characters.map(c=>[c.rarity,c.rarityName]))].sort(([a],[b])=>a-b).map(([id,name])=>`<option value="${id}">${esc(name)}</option>`).join('');
    document.getElementById('wanquPersonality').innerHTML='<option value="">全部性格</option>'+Object.entries(data.personalityById).map(([id,name])=>`<option value="${id}">${esc(name)}</option>`).join('');
    document.getElementById('wanquSearch').addEventListener('input',render);
    for(const id of ['wanquSect','wanquRarity','wanquPersonality'])document.getElementById(id).addEventListener('change',render);
    document.getElementById('wanquKnowledge').innerHTML=data.knowledgeTexts.map(r=>`<p><b>${esc(r.id==='GZNLTips'?'工作能力':r.id==='ZhiSHiTips'?'知识与解救':'知识与委托')}</b>：${esc(r.text)}</p>`).join('')+'<p>以上为配置文案，两种知识用途可以并存。每人工作/知识按模板与能力字段求和；当前收录能力未直接配置额外工作/知识。每点知识对应多少招募概率、如何影响委托稀有度，仍待验证。</p>';
    document.getElementById('wanquDate').textContent=`${data.metadata.snapshotDate} · 配置描述 / 静态关联 · 未实测`;
    render();
  }
  return {init,render,setView,reset,openCharacter,openAbility,filterCharacters,filterAbilities};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=WanquUI;
