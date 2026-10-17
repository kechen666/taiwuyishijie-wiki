let keywordGroup='all',compareCandidate=null;
function keywordCategory(k){return KW_GROUPS.find(g=>g.names?.includes(k.name))||KW_GROUPS.find(g=>g.key==='misc');}
function setKeywordGroup(group){keywordGroup=group;renderKeywords();}
function renderKeywords(){
 const q=document.getElementById('reverseSearch').value.trim().toLowerCase(),state=document.getElementById('reverseStatus').value;
 const list=D.keywords.filter(k=>(keywordGroup==='all'||keywordCategory(k).key===keywordGroup)&&(!q||(k.name+k.desc).toLowerCase().includes(q))&&(!state||WikiTools.status(D,k.id).status===state));
 document.getElementById('keywordChips').innerHTML=[['all','全部'],...KW_GROUPS.map(g=>[g.key,g.title.replace(/（.*）/,'')])].map(([key,label])=>`<button class="chip ${key===keywordGroup?'on':''}" onclick="setKeywordGroup('${key}')">${label}</button>`).join('');
 document.getElementById('keywordCount').textContent=`${list.length} / ${D.keywords.length} 个关键词`;
 document.getElementById('kwSections').innerHTML=`<div class="keyword-grid">${list.map(k=>{const g=keywordCategory(k),choices=WikiTools.keywordGroups(reverseRows,k);return `<button class="keyword-card ${g.key}" onclick="openKeyword('${k.id}')"><div class="keyword-top"><strong>${esc(k.name)}</strong><span class="tag">${g.title.replace(/（.*）/,'')}</span></div><p>${esc(k.desc)}</p><div class="keyword-bottom">${choices.map(([,label,rows])=>`<span>${label} ${rows.length}</span>`).join('')}</div></button>`;}).join('')||'<p class="summary-empty">没有匹配的关键词，下方可查看相关词条。</p>'}</div>`;
 const exactKeyword=D.keywords.find(k=>k.name.toLowerCase()===q);
 const rows=(q||state)?(exactKeyword?WikiTools.keywordGroups(reverseRows,exactKeyword)[0][2]:WikiTools.search(reverseRows,q)).filter(r=>!state||WikiTools.status(D,r.id).status===state):[];
 document.getElementById('reverseResults').innerHTML=q||state?`<div class="search-note">相关条目 ${rows.length} 条 · 点击卡片查看详情，固定自带与随机池归属分别标记。</div>`+referenceGroups(rows):'';
}
function renderReverse(){renderKeywords();}
function resetReverse(){keywordGroup='all';document.getElementById('reverseSearch').value='';document.getElementById('reverseStatus').value='';renderKeywords();}
function referenceCard(r){
 const index=reverseRows.indexOf(r),kind={skill:'基础功法',upgrade:'升级分支 '+r.branch+' · Lv'+r.level,evo:'功法进化',fixed:'装备 · 固定自带',trait:'装备特性',characterTrait:'角色特质',companion:'灵侍被动',companionSkill:'灵侍功法 / 灵诀',item:'局内道具',wanquAbility:'宛渠能力'}[r.kind];
 return `<button class="reference-card" onclick="openReference(${index})"><div class="reference-head">${r.icon?iconHTML(r,'sm'): '<span class="reference-glyph" aria-hidden="true">词</span>'}<span><strong>${esc(r.title)}</strong><small>${esc(kind)}</small></span></div><p>${escFx(r.text)}</p><div class="reference-foot">${r.kind==='trait'?`固定 ${r.fixed.length} 件 · 随机池 ${r.pool.length} 件`:r.sourceDate?esc(r.sourceNote)+' · '+esc(r.sourceDate):D.metadata.statuses[WikiTools.status(D,r.id).status]}</div></button>`;
}
function referenceGroups(rows){return [['功法与升级 / 进化',['skill','upgrade','evo']],['固定词条装备',['fixed']],['装备特性',['trait']],['角色特质',['characterTrait']],['灵侍',['companion','companionSkill']],['局内道具',['item']],['宛渠能力',['wanquAbility']]].map(([title,kinds])=>{const list=rows.filter(r=>kinds.includes(r.kind));return list.length?`<details class="reference-section" open><summary>${title}<span>${list.length}</span></summary><div class="reference-grid">${list.map(referenceCard).join('')}</div></details>`:'';}).join('')||'<p class="summary-empty">没有相关记录。</p>';}
function openKeyword(id,group='all'){
 const k=D.keywords.find(k=>k.id===id),choices=WikiTools.keywordGroups(reverseRows,k);
 const shown=choices.find(([key])=>key===group)[2];
 showDrawer(`<div class="d-id">关键词典 · ${keywordCategory(k).title.replace(/（.*）/,'')}</div><h2 class="d-name">${esc(k.name)}</h2>${dataNote(id)}<div class="d-desc">${esc(k.desc)}</div><div class="d-sec">相关条目<small>点击继续查看功法、装备、角色、灵侍、道具与宛渠能力</small></div><div class="detail-chips">${choices.map(([key,label,list])=>`<button class="chip ${key===group?'on':''}" onclick="openKeyword('${id}','${key}')">${label} ${list.length}</button>`).join('')}</div><p class="summary-note">相关记录包含效果来源、作用条件与使用该关键词的条目，请查看完整说明。</p>${referenceGroups(shown)}`);
}
function openReference(index){
 const r=reverseRows[index];if(!r)return;if(r.guideKind){GuideUI.openReference(r);return;}
 if(r.skillId){openSkill(r.skillId);if(r.branch)document.querySelectorAll('#drawer .branch')[r.branch-1]?.classList.add('open');}
 else if(r.equipmentId)openEquip(EQUIPS.findIndex(e=>e.id===r.equipmentId));else openTrait(r.traitId);
}
function equipmentReference(id){const e=EQUIPS.find(e=>e.id===id);return `<button class="reference-card equipment-ref" onclick="openEquip(${EQUIPS.indexOf(e)})"><div class="reference-head">${iconHTML(e,'sm equipment')}<span><strong>${esc(e.name)}</strong><small>${esc(e.slotName)} · ${esc(e.rarityName)}</small></span></div></button>`;}
function openTrait(id){const t=TRAITS[id],row=reverseRows.find(r=>r.kind==='trait'&&r.id===id);showDrawer(`<div class="d-id">装备特性</div><h2 class="d-name">${esc(t.name)}</h2>${dataNote(id)}${traitHTML(t)}${[['固定自带',row.fixed],['随机池可能抽取',row.pool]].map(([label,ids])=>`<div class="d-sec">${label}<small>${ids.length} 件</small></div><div class="reference-grid">${ids.map(equipmentReference).join('')||'<p class="summary-empty">当前收录范围内无归属装备。</p>'}</div>`).join('')}`);}
function renderSynergy(result=WikiTools.synergy(currentBuild,D)){
 const sources=new Set(result.effects.map(e=>e.sourceId));
 document.getElementById('synergyCount').textContent=`${sources.size} 门提供 · ${result.effects.length} 项可能效果`;
 const cards=result.effects.map(e=>{
  const sk=byId[e.sourceId],u=[...sk.upgrades,...sk.evos].find(u=>u.id===e.id);
  return `<article class="synergy-card" data-effect="${e.id}" data-source="${sk.id}" data-recipients="${e.recipients.map(r=>r.id).join(' ')}">
   <div class="synergy-card-head">${iconHTML(sk,'xs')}<strong>${esc(sk.name)}</strong><span>${u.branch?'分支'+u.branch+' · Lv'+u.level:'进化'}${e.conditional?' · 有条件':''}</span></div>
   <p class="synergy-card-text">${escFx(e.text)}</p>
   <div class="synergy-receivers"><span class="receiver-label">受益</span>${e.recipients.map(r=>`<button class="synergy-chip ${r.id===sk.id?'self':''}" onclick="highlightSkill('${r.id}')">${iconHTML(byId[r.id],'xs')}<span>${esc(r.name)}${r.id===sk.id?' · 自身':''}</span></button>`).join('')||'<span class="synergy-no-target">当前暂无明确受益功法</span>'}</div>
   ${e.warning?`<details class="synergy-caveat"><summary>配置差异待确认</summary><p>${esc(e.warning)}</p></details>`:''}
  </article>`;
 }).join('');
 document.getElementById('synergySummary').innerHTML=result.effects.length?`<p class="summary-note">来源、效果、受益功法逐条对应；“自身”以红色标签标记。点击功法可定位槽位。</p><div class="synergy-card-grid">${cards}</div><p class="synergy-warning">按所选等级预览，触发条件、实际范围与叠加仍待游戏验证。</p>`:'<p class="summary-empty">选择含跨功法加成的升级分支后，在此查看效果与受益功法。「仅预选」分支不计入。</p>';
}
function showReceivedSynergy(id){
 const panel=document.getElementById('synergyPanel');panel.open=true;
 const cards=[...document.querySelectorAll('.synergy-card')];
 for(const card of cards)card.classList.toggle('received-highlight',card.dataset.source!==id&&card.dataset.recipients.split(' ').includes(id));
 (cards.find(card=>card.classList.contains('received-highlight'))||panel).scrollIntoView({behavior:'smooth',block:'center'});
}
function highlightSkill(id){const i=currentBuild.slots.findIndex(s=>s?.skill===id),el=document.querySelectorAll('#slots .slot')[i];if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('synergy-highlight');setTimeout(()=>el.classList.remove('synergy-highlight'),2400);}
function compareCard(eq,tier,label){return `<section class="compare-item"><small>${label}</small>${eq?`<div class="compare-identity">${iconHTML(eq,'equipment')}<div><strong>${esc(eq.name)}</strong><span>${esc(eq.slotName)} · ${'ⅠⅡⅢ'[tier-1]}阶</span></div></div><div class="compare-fixed">${eqTraitRows(eq,tier)}</div>`:'<div class="compare-empty">空槽</div>'}</section>`;}
function previewEquip(id,tier){
 const eq=EQUIPS.find(e=>e.id===id),old=EQUIPS.find(e=>e.id===currentBuild.equips[pickingSlot]),oldTier=currentBuild.equipTiers[pickingSlot]||1;
 tier=Number(tier||oldTier);compareCandidate={id,tier};const diff=WikiTools.compareEquipment(currentBuild,pickingSlot,id,tier,D),box=document.getElementById('comparePreview');box.classList.add('on');document.querySelector('#picker .picker-box').classList.add('comparing');
 const signed=(v,rule)=>(v>0?'+':'')+(String(rule)==='1'?new Intl.NumberFormat('zh-CN',{maximumFractionDigits:3}).format(v*100)+' 个百分点':BuildStats.formatRange([v,v],rule));
 box.innerHTML=`<div class="compare-toolbar"><strong>换装对比</strong><label>候选品阶 <select aria-label="候选装备品阶" onchange="previewEquip('${id}',this.value)">${[1,2,3].map(t=>`<option value="${t}"${t===tier?' selected':''}>${'ⅠⅡⅢ'[t-1]}阶</option>`).join('')}</select></label><button class="mini" onclick="closeCompare()">返回列表</button></div><div class="compare-pair">${compareCard(old,oldTier,'当前装备')}<span class="compare-arrow" aria-hidden="true">⇄</span>${compareCard(eq,tier,'候选装备')}</div><div class="compare-changes"><h4>固定属性变化</h4><p class="summary-note">条形长度对照区间上限；下限与上限分别计算差值，随机词条另计。</p>${diff.numeric.map(n=>{const limit=Math.max(...n.before.map(Math.abs),...n.after.map(Math.abs),1e-9),up=n.delta.every(v=>v>=0),down=n.delta.every(v=>v<=0),state=up?'gain':down?'loss':'mixed';return `<div class="delta-row ${state}"><div class="delta-title"><strong>${esc(n.name)}</strong><span>${up?'增加':down?'减少':'区间变化'}</span></div><div class="range-bar before"><span>当前</span><div class="range-track"><i style="width:${Math.max(1,Math.abs(n.before[1])/limit*100)}%"></i><b>${BuildStats.formatRange(n.before,n.rule)}</b></div></div><div class="range-bar after"><span>候选</span><div class="range-track"><i style="width:${Math.max(1,Math.abs(n.after[1])/limit*100)}%"></i><b>${BuildStats.formatRange(n.after,n.rule)}</b></div></div><div class="delta-numbers">下限 ${signed(n.delta[0],n.rule)}<span>上限 ${signed(n.delta[1],n.rule)}</span></div></div>`;}).join('')||'<p class="summary-empty">固定数值无变化</p>'}<div class="effect-diff-grid"><section class="effect-diff loss"><h4>− 移除效果</h4>${diff.removed.map(e=>`<p>${escFx(e.text)}</p>`).join('')||'<p>无</p>'}</section><section class="effect-diff gain"><h4>＋ 新增效果</h4>${diff.added.map(e=>`<p>${escFx(e.text)}</p>`).join('')||'<p>无</p>'}</section></div>${diff.unresolved.map(e=>`<p class="synergy-warning">${esc(e.reason)}，未计入</p>`).join('')}</div><div class="compare-action"><button class="btn" onclick="pickItem('${id}')">采用 ${esc(eq.name)}</button></div>`;
}
function closeCompare(){document.querySelector('#picker .picker-box').classList.remove('comparing');document.getElementById('comparePreview').classList.remove('on');compareCandidate=null;}
