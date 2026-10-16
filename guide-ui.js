const GuideUI = (() => {
  let companionKind='normal',itemKind='active';
  const note=()=>'<span class="status-badge">配置描述</span><span class="guide-date">数据 '+esc(D.guideMeta.date)+' · 未实测</span>';
  const category={active:'主动道具',elixir:'丹药',pickup:'基础拾取物'};
  const hero=id=>D.heroes.find(h=>h.id===id);
  const talent=id=>D.characterTraits.find(t=>t.id===id);
  const skill=id=>D.companionSkills.find(s=>s.id===id);
  const image=(item,size='')=>iconHTML(item,'guide-icon '+size,item?.heroId?'特':item?.kind?'物':'灵');
  const notes=rows=>rows?.length?`<div class="guide-caveat">${rows.map(n=>`<p>${esc(n)}</p>`).join('')}</div>`:'';
  const source=entry=>`<details class="guide-source"><summary>数据来源</summary><p>${esc(entry.sourceTable)} · Index ${entry.sourceIndex}<br>${esc(entry.id)}${entry.descriptionTid?'<br>'+esc(entry.descriptionTid):''}</p></details>`;
  const skillList=stage=>Object.entries(stage.skillIds).map(([role,ids])=>ids.length?`<div class="guide-skill-group"><h4>${role}</h4>${ids.map(id=>{const s=skill(id);return s?`<article class="guide-skill"><div class="name-with-icon">${image(s,'sm')}<strong>${esc(s.name)}</strong></div><p>${escFx(s.desc)}</p></article>`:'';}).join('')}</div>`:'').join('');
  function traitsFor(id){return D.characterTraits.filter(t=>t.heroId===id);}
  function renderHeroes(){
    const q=document.getElementById('heroSearch').value.trim().toLowerCase();
    const list=D.heroes.filter(h=>(h.name+' '+traitsFor(h.id).map(t=>t.name+' '+t.desc+' '+t.id).join(' ')).toLowerCase().includes(q));
    document.getElementById('heroCount').textContent=`${list.length} / ${D.heroes.length} 位角色 · 90 个特质`;
    document.getElementById('heroGrid').innerHTML=list.map(h=>{
      const rows=traitsFor(h.id),base=rows.find(t=>t.realm===0),matched=rows.filter(t=>!q||(t.name+' '+t.desc+' '+t.id).toLowerCase().includes(q));
      return `<button type="button" class="guide-card hero-card" onclick="GuideUI.openHero('${h.id}')"><span class="guide-card-head">${image(h)}<span><strong>${esc(h.name)}</strong><small>基础特质 · ${esc(base.name)}</small></span><span class="tag">境界 0～${h.maxRealm}</span></span><p>${escFx(base.desc)}</p><span class="guide-preview">${matched.slice(0,4).map(t=>`<span>${esc(t.name)}</span>`).join('')}</span><span class="guide-card-foot">15 个特质 · 查看各境界效果 <span>查看详情</span></span></button>`;
    }).join('')||'<p class="summary-empty">没有匹配的角色或特质。</p>';
  }
  function openHero(id){
    const h=hero(id);if(!h)return;
    showDrawer(`<div class="d-id">角色特质</div><div class="drawer-title name-with-icon">${image(h)}<h2 class="d-name">${esc(h.name)}</h2></div><p>${note()}</p><p class="summary-note">基础特质随角色展示；境界1～5的选择按配置分组。Build采用每境界最多1项的规划规则，实际互斥与叠加待验证。</p><button class="btn" onclick="GuideUI.useHero('${id}')">配置这位角色</button>${h.stages.map(stage=>`<section class="realm-section"><h3>${stage.label==='基础特质'?'基础特质':'境界 '+stage.realm}<small>${stage.trait_ids.length} 个条目</small></h3><div class="realm-traits">${stage.trait_ids.map(key=>{const t=talent(key);return `<button class="realm-trait" onclick="GuideUI.openTrait('${key}')"><span class="name-with-icon">${image(t,'sm')}<strong>${esc(t.name)}</strong></span><p>${escFx(t.desc)}</p><span class="guide-detail-link">查看详情 / 选择</span></button>`;}).join('')}</div></section>`).join('')}`);
  }
  function openTrait(id){
    const t=talent(id);if(!t)return;
    showDrawer(`<div class="d-id">${esc(t.heroName)} · ${t.realm?'境界 '+t.realm:'基础特质'}</div><div class="drawer-title name-with-icon">${image(t)}<h2 class="d-name">${esc(t.name)}</h2></div><p>${note()}</p><div class="d-desc">${escFx(t.desc)}</div>${notes(t.notes)}<button class="btn" onclick="GuideUI.useTrait('${id}')">${t.realm?'选择此特质':'使用此角色'}</button><button class="btn ghost guide-back" onclick="GuideUI.openHero('${t.heroId}')">查看角色全部特质</button>${source(t)}`);
  }
  function setCompanionKind(kind){companionKind=kind;renderCompanions();}
  function renderCompanions(){
    const q=document.getElementById('companionSearch').value.trim().toLowerCase();
    document.getElementById('companionKinds').innerHTML=[['normal','灵侍 · 7'],['special','特殊召唤 · 7']].map(([key,label])=>`<button class="chip ${key===companionKind?'on':''}" onclick="GuideUI.setCompanionKind('${key}')">${label}</button>`).join('');
    const rows=(companionKind==='normal'?D.companions:D.specialCompanions).filter(c=>(c.id+' '+c.name+' '+(c.searchText||c.passive)).toLowerCase().includes(q));
    document.getElementById('companionCount').textContent=`${rows.length} 条结果`;
    document.getElementById('companionGrid').innerHTML=rows.map(c=>{
      const special=companionKind==='special',first=special?c:c.stages[0];
      return `<button class="guide-card" onclick="GuideUI.${special?'openSpecial':'openCompanion'}('${c.id}')"><span class="guide-card-head">${image(c)}<span><strong>${esc(c.name)}</strong><small>${special?esc(c.id):c.stages.length>1?c.stages.length+' 个成长阶段':'单阶段 · 狐灵'}</small></span>${c.sharedPortrait?'<span class="tag">头像共用</span>':''}</span><p>${escFx(first.passive||'此记录未填写被动说明。')}</p><span class="guide-preview">${Object.entries(first.skillIds).filter(([,ids])=>ids.length).map(([role,ids])=>`<span>${role} · ${ids.map(id=>esc(skill(id)?.name||id)).join('、')}</span>`).join('')}</span><span class="guide-card-foot">${special?'特殊召唤记录，非独立可选灵侍':'查看各阶段功法与灵诀'}<span>查看详情</span></span></button>`;
    }).join('')||'<p class="summary-empty">没有匹配的灵侍或技能。</p>';
  }
  function openCompanion(id,stageId){
    const c=D.companions.find(c=>c.id===id);if(!c)return;
    const stage=c.stages.find(s=>s.id===stageId)||c.stages[0];
    showDrawer(`<div class="d-id">灵侍图鉴</div><div class="drawer-title name-with-icon">${image(stage)}<h2 class="d-name">${esc(c.name)}</h2></div><p>${note()}</p><div class="guide-stage-select"><label>成长阶段 <select aria-label="图鉴灵侍成长阶段" onchange="GuideUI.openCompanion('${id}',this.value)">${c.stages.map(s=>`<option value="${s.id}"${s.id===stage.id?' selected':''}>${c.stages.length===1?'单阶段':'阶段 '+s.stage}</option>`).join('')}</select></label><button class="btn" onclick="GuideUI.useCompanion('${stage.id}')">加入 Build</button></div><div class="d-sec">被动效果</div><div class="d-desc">${escFx(stage.passive||'未配置被动说明')}</div>${notes(stage.notes)}${skillList(stage)}${stage.sharedPortrait?`<details class="guide-source"><summary>查看源配置共用头像</summary>${iconHTML({icon:stage.sourceIcon},'guide-source-icon')}<p>原资源在多个族中共用，当前未用作专属头像。</p></details>`:''}${source(stage)}`);
  }
  function openSpecial(id){
    const s=D.specialCompanions.find(s=>s.id===id);if(!s)return;
    showDrawer(`<div class="d-id">特殊召唤记录 · ${esc(s.id)}</div><h2 class="d-name">${esc(s.name)}</h2><p>${note()}</p><p class="summary-note">此项来自特殊召唤配置，保留原名称及复用说明；不作为独立灵侍加入Build。</p><div class="d-desc">${escFx(s.passive||'未配置被动说明')}</div>${notes(s.notes)}${skillList(s)}${source(s)}`);
  }
  function openCompanionSkill(id){
    const s=skill(id);if(!s)return;
    const families=D.companions.filter(c=>c.stages.some(st=>Object.values(st.skillIds).flat().includes(id)));
    showDrawer(`<div class="d-id">灵侍功法 / 灵诀</div><div class="drawer-title name-with-icon">${image(s)}<h2 class="d-name">${esc(s.name)}</h2></div><p>${note()}</p><div class="d-desc">${escFx(s.desc)}</div><div class="detail-chips">${families.map(c=>`<button class="chip" onclick="GuideUI.openCompanion('${c.id}')">${esc(c.name)} · 查看成长阶段</button>`).join('')}</div>${source(s)}`);
  }
  function setItemKind(kind){itemKind=kind;renderItems();}
  function renderItems(){
    const q=document.getElementById('itemSearch').value.trim().toLowerCase();
    document.getElementById('itemKinds').innerHTML=[['active','主动道具 · 8'],['elixir','丹药 · 35'],['pickup','基础拾取 · 3'],['all','全部 · 46']].map(([key,label])=>`<button class="chip ${itemKind===key?'on':''}" onclick="GuideUI.setItemKind('${key}')">${label}</button>`).join('');
    const list=D.items.filter(i=>(itemKind==='all'||itemKind===i.kind)&&(i.name+' '+i.desc+' '+i.sourceId).toLowerCase().includes(q));
    document.getElementById('itemCount').textContent=`${list.length} 条结果`;
    document.getElementById('itemGrid').innerHTML=list.map(i=>`<button class="guide-card item-card" onclick="GuideUI.openItem('${i.id}')"><span class="guide-card-head">${image(i)}<span><strong>${esc(i.name)}</strong><small>${category[i.kind]}</small></span>${i.iconStatus==='candidate'?'<span class="tag">图标候选</span>':''}</span><p>${escFx(i.desc)}</p><span class="guide-card-foot"><span>${i.kind==='elixir'?i.poolStatus.startsWith('在已收集')?'池内有正权重':i.pools.length?'池内权重为0':'未列入已收集池':'配置描述 · 未实测'}</span><span>查看详情</span></span></button>`).join('')||'<p class="summary-empty">没有匹配的道具。</p>';
  }
  function openItem(id){
    const i=D.items.find(i=>i.id===id);if(!i)return;
    showDrawer(`<div class="d-id">局内道具 · ${category[i.kind]}</div><div class="drawer-title name-with-icon">${image(i)}<h2 class="d-name">${esc(i.name)}</h2></div><p>${note()}${i.iconStatus==='candidate'?'<span class="tag">图标候选</span>':''}</p><div class="d-desc">${escFx(i.desc)}</div>${notes(i.notes)}<div class="d-sec">掉落池记录</div><p class="summary-note">${esc(i.poolStatus)}；池内相对权重不等于全局掉率，未列入池也不排除其他获取途径。</p>${i.pools.map(p=>`<p class="guide-pool">${esc(p.id)} <b>原始权重 ${esc(p.weight)}</b></p>`).join('')}${source(i)}`);
  }
  function showTreasureEquipment(){eState.slot=5;eState.rar=null;eState.q='';document.getElementById('eqSearch').value='';refreshEqChips();renderEqGrid();activatePage('equip');}
  function setHero(id){
    const h=hero(id);
    if(currentBuild.character!==(h?.id||null))Object.assign(currentBuild,{character:h?.id||null,realm:h?h.maxRealm:0,characterTraits:{}});
    refreshBuilder();document.getElementById('buildTalentPanel').open=Boolean(h);
  }
  function setRealm(value){currentBuild.realm=Number(value);Object.assign(currentBuild,GuideBuild.normalize(currentBuild,D));refreshBuilder();}
  function toggleTrait(id){
    const t=talent(id);if(!t||t.heroId!==currentBuild.character||!t.realm||t.realm>currentBuild.realm)return;
    if(currentBuild.characterTraits[t.realm]===id)delete currentBuild.characterTraits[t.realm];else currentBuild.characterTraits[t.realm]=id;
    refreshBuilder();
  }
  function clearTraits(){currentBuild.characterTraits={};refreshBuilder();}
  function setCompanion(id){const c=D.companions.find(c=>c.id===id);currentBuild.companion=c?.stages[0].id||null;refreshBuilder();}
  function setCompanionStage(id){if(D.companions.some(c=>c.stages.some(s=>s.id===id))){currentBuild.companion=id;refreshBuilder();}}
  function useHero(id){setHero(id);closeDrawer();activatePage('builder');toast('已选择角色');}
  function useTrait(id){const t=talent(id);if(!t)return;if(currentBuild.character!==t.heroId)setHero(t.heroId);currentBuild.realm=Math.max(currentBuild.realm,t.realm);if(t.realm)currentBuild.characterTraits[t.realm]=id;refreshBuilder();closeDrawer();activatePage('builder');toast('已选择「'+t.name+'」');}
  function useCompanion(id){setCompanionStage(id);closeDrawer();activatePage('builder');toast('已选择灵侍');}
  function renderBuild(){
    Object.assign(currentBuild,GuideBuild.normalize(currentBuild,D));
    const notesInput=document.getElementById('buildNotes');
    if(notesInput.value!==currentBuild.notes)notesInput.value=currentBuild.notes;
    const h=hero(currentBuild.character),pet=GuideBuild.companion(currentBuild,D),selected=GuideBuild.selectedTraits(currentBuild,D),base=selected.find(t=>t.realm===0);
    document.getElementById('buildIdentity').innerHTML=`<section class="identity-card"><h4>角色与境界</h4><div class="identity-controls"><label>角色 <select aria-label="Build角色" onchange="GuideUI.setHero(this.value)"><option value="">暂不选择</option>${D.heroes.map(x=>`<option value="${x.id}"${h?.id===x.id?' selected':''}>${esc(x.name)}</option>`).join('')}</select></label><label>境界 <select aria-label="角色境界" ${h?'':'disabled'} onchange="GuideUI.setRealm(this.value)">${Array.from({length:6},(_,i)=>`<option value="${i}"${currentBuild.realm===i?' selected':''}>${i===0?'基础':'境界 '+i}</option>`).join('')}</select></label></div>${base?`<div class="identity-effect"><span class="name-with-icon">${image(base,'sm')}<strong>${esc(base.name)}</strong><span class="tag">基础特质</span></span><p>${escFx(base.desc)}</p></div>`:'<p class="summary-empty">选择角色后展示基础特质和境界选项。</p>'}</section><section class="identity-card"><h4>随行灵侍</h4><div class="identity-controls"><label>灵侍 <select aria-label="Build灵侍" onchange="GuideUI.setCompanion(this.value)"><option value="">暂不选择</option>${D.companions.map(c=>`<option value="${c.id}"${pet?.family.id===c.id?' selected':''}>${esc(c.name)}${c.sharedPortrait?'（头像共用）':''}</option>`).join('')}</select></label><label>成长阶段 <select aria-label="灵侍成长阶段" ${pet?'':'disabled'} onchange="GuideUI.setCompanionStage(this.value)">${pet?pet.family.stages.map(s=>`<option value="${s.id}"${s.id===pet.stage.id?' selected':''}>${pet.family.stages.length>1?'阶段 '+s.stage:'单阶段'}</option>`).join(''):'<option>未选择</option>'}</select></label></div>${pet?`<div class="identity-effect"><span class="name-with-icon">${image(pet.stage,'sm')}<strong>${esc(pet.family.name)}</strong>${pet.stage.sharedPortrait?'<span class="tag">源头像共用</span>':''}<button class="mini" onclick="GuideUI.openCompanion('${pet.family.id}','${pet.stage.id}')">详情</button></span><p>${escFx(pet.stage.passive||'未配置被动说明')}</p><div class="selected-traits">${Object.entries(pet.stage.skillIds).flatMap(([role,ids])=>ids.map(id=>`<button onclick="GuideUI.openCompanionSkill('${id}')">${esc(role)} · ${esc(skill(id)?.name||id)}</button>`)).join('')}</div></div>`:'<p class="summary-empty">选择灵侍后展示对应成长阶段的被动、功法和灵诀。</p>'}</section>`;
    const optional=selected.filter(t=>t.realm>0);
    document.getElementById('talentSelectedCount').textContent=h?`${optional.length} / ${currentBuild.realm} 项 · ${h.name}`:'先选择角色';
    document.getElementById('selectedCharacterTraits').innerHTML=optional.map(t=>`<button onclick="GuideUI.openTrait('${t.id}')">${image(t,'xs')}<span>境界${t.realm} · ${esc(t.name)}</span></button>`).join('')||'<span class="summary-note">尚未选择境界特质。</span>';
    document.getElementById('buildTalentChoices').innerHTML=h?`<p class="summary-note">每境界最多选择1项，再次点击可取消。降低境界会取消更高境界的选择；实际互斥、触发与叠加规则待验证。</p>${h.stages.filter(s=>s.realm>0).map(s=>`<fieldset class="build-realm ${s.realm>currentBuild.realm?'realm-locked':''}"><legend>境界 ${s.realm}<small>${s.realm>currentBuild.realm?'达到对应境界后可选':currentBuild.characterTraits[s.realm]?'已选择':'未选择'}</small></legend><div class="talent-choices">${s.trait_ids.map(id=>{const t=talent(id),on=currentBuild.characterTraits[s.realm]===id;return `<div class="talent-option ${on?'selected':''}"><button type="button" class="talent-select" aria-pressed="${on}" ${s.realm>currentBuild.realm?'disabled':''} onclick="GuideUI.toggleTrait('${id}')"><span class="name-with-icon">${image(t,'sm')}<strong>${esc(t.name)}</strong><span class="talent-check">${on?'✓':'＋'}</span></span><span class="talent-description">${escFx(t.desc)}</span></button><button class="talent-info" onclick="GuideUI.openTrait('${id}')">查看完整效果</button></div>`;}).join('')}</div></fieldset>`).join('')}<button class="btn ghost" onclick="GuideUI.clearTraits()">清除已选境界特质</button>`:'<p class="summary-empty">先在上方选择角色。</p>';
  }
  function openReference(row){
    if(row.guideKind==='talent')openTrait(row.entityId);
    else if(row.guideKind==='companion')openCompanion(row.entityId);
    else if(row.guideKind==='companionSkill')openCompanionSkill(row.entityId);
    else if(row.guideKind==='item')openItem(row.entityId);
  }
  function init(){
    new ResizeObserver(entries=>document.documentElement.style.setProperty('--head-height',entries[0].target.getBoundingClientRect().height+'px')).observe(document.querySelector('.site-head'));
    document.getElementById('heroSearch').addEventListener('input',renderHeroes);
    document.getElementById('companionSearch').addEventListener('input',renderCompanions);
    document.getElementById('itemSearch').addEventListener('input',renderItems);
    renderHeroes();renderCompanions();renderItems();
  }
  return {init,renderHeroes,openHero,openTrait,renderCompanions,openCompanion,openSpecial,openCompanionSkill,setCompanionKind,renderItems,setItemKind,openItem,showTreasureEquipment,setHero,setRealm,toggleTrait,clearTraits,setCompanion,setCompanionStage,useHero,useTrait,useCompanion,renderBuild,openReference};
})();
