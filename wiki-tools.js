const WikiTools = (() => {
  function status(d,id){ return d.metadata.verification?.[id] || {status:'config',note:'来自本地配置，未作游戏内实测。'}; }
  function normalizeSlot(s,skills){
    const sk=s && skills.find(k=>k.id===s.skill);if(!sk)return null;
    const picks=[...new Set((Array.isArray(s.picks||s.prio)?s.picks||s.prio:[]).map(Number))].filter(n=>[1,2,3,4,5].includes(n)).slice(0,3);
    const levels=Object.fromEntries(picks.map(n=>[n,[0,1,2,3].includes(Number(s.levels?.[n]))?Number(s.levels[n]):0]));
    return {skill:sk.id,evo:sk.evos.some(e=>e.id===s.evo)?s.evo:null,picks,levels};
  }
  function effectiveTags(slot,sk){
    const nodes=sk.upgrades.filter(u=>slot.picks.includes(u.branch)&&u.level<=(slot.levels?.[u.branch]||0));
    const evo=sk.evos.find(e=>e.id===slot.evo);
    return [...new Set([...sk.tags,...nodes.flatMap(u=>u.addedTags||[]),...(evo?.addedTags||[])])];
  }
  function reverseIndex(d){
    const rows=[];
    const add=(kind,id,title,text,keywordIds,extra={})=>rows.push({kind,id,title,text,keywordIds:keywordIds||[],...extra});
    for(const s of d.skills){
      add('skill',s.id,s.name,s.desc+' '+s.tags.join(' '),s.keywordIds,{skillId:s.id,icon:s.icon});
      for(const u of s.upgrades) add('upgrade',u.id,s.name+' · '+u.name,u.desc,u.keywordIds,{skillId:s.id,icon:u.icon,branch:u.branch,level:u.level});
      for(const e of s.evos) add('evo',e.id,e.name,e.effect+' '+e.full,e.keywordIds,{skillId:s.id,icon:e.icon});
    }
    for(const t of Object.values(d.traits)){
      const text=t.name+' '+BuildStats.specialText(t)+' '+(t.kw||[]).join(' ');
      const fixed=d.equips.filter(e=>e.fixed.includes(t.id)),pool=d.equips.filter(e=>e.pool.some(p=>p.id===t.id));
      add('trait',t.id,t.name+(t.tier?' · '+t.tier:''),text,t.keywordIds,{traitId:t.id,fixed:fixed.map(e=>e.id),pool:pool.map(e=>e.id)});
      for(const e of fixed) add('fixed',e.id+'::'+t.id,e.name+' · '+t.name,text,t.keywordIds,{equipmentId:e.id,traitId:t.id,icon:e.icon});
    }
    for(const t of d.characterTraits||[])add('characterTrait',t.id,t.heroName+' · '+t.name,t.desc,t.keywordIds,{guideKind:'talent',entityId:t.id,icon:t.icon});
    for(const c of d.companions||[])add('companion','companion:'+c.id,c.name,c.stages.map(s=>s.passive).join(' '),[],{guideKind:'companion',entityId:c.id,icon:c.icon});
    for(const s of d.companionSkills||[])add('companionSkill','companionSkill:'+s.id,s.name,s.desc,s.keywordIds,{guideKind:'companionSkill',entityId:s.id,icon:s.icon});
    for(const i of d.items||[])add('item',i.id,i.name,i.desc,i.keywordIds,{guideKind:'item',entityId:i.id,icon:i.icon});
    for(const a of d.wanqu?.abilities||[]){
      const active=a.templates.some(id=>d.wanqu.characters.some(c=>c.id===id&&c.available));
      add('wanquAbility','wanquAbility:'+a.id,a.name,a.description,[],{guideKind:'wanquAbility',entityId:a.id,sourceDate:d.wanqu.metadata.snapshotDate,sourceNote:active?'配置描述':'仅停用模板引用'});
    }
    return rows;
  }
  function search(rows,q,keyword){
    q=String(q||'').trim().toLowerCase();
    return rows.filter(r=>(!q||(r.title+' '+r.text+' '+r.id).toLowerCase().includes(q))&&(!keyword||r.keywordIds.includes(keyword.id)||(r.title+' '+r.text).includes(keyword.name)));
  }
  function keywordGroups(rows,keyword){
    const related=search(rows,'',keyword);
    return [['all','全部',related],['skill','功法/升级',related.filter(r=>r.skillId)],['fixed','固定装备',related.filter(r=>r.kind==='fixed')],['trait','特性',related.filter(r=>r.kind==='trait')],['guide','角色/灵侍/道具/宛渠',related.filter(r=>r.guideKind)]];
  }
  function synergy(build,d){
    const chosen=(build.slots||[]).map(s=>normalizeSlot(s,d.skills)).filter(Boolean).map(slot=>{const sk=d.skills.find(s=>s.id===slot.skill);return {slot,sk,tags:effectiveTags(slot,sk)};});
    const effects=[];
    for(const {slot,sk} of chosen){
      const nodes=[...sk.upgrades.filter(u=>slot.picks.includes(u.branch)&&u.level<=(slot.levels[u.branch]||0)),...sk.evos.filter(e=>e.id===slot.evo)];
      for(const u of nodes){
        const text=u.desc||u.effect;
        // Description matching previews possible recipients; it is not a mechanics simulator.
        const direct=[...text.matchAll(/(远程|近战|持续|弹射|穿透|异常|妨害|增益|中毒|神火|外伤|光环)功法/g)].map(m=>m[1]);
        if(/追加效果/.test(text)) direct.push('追加');
        const all=/所有(?:的)?(?:其他)?功法|所有冷却/.test(text);
        const broad=/任意效果|所有效果|所有(?:的)?(?:异常|妨害|增益|光环)|所有友方|所有队友/.test(text);
        if(!direct.length&&!all&&!broad)continue;
        let recipients=chosen.filter(c=>all||direct.some(t=>c.tags.includes(t)));
        if(/所有其他功法/.test(text))recipients=recipients.filter(c=>c.sk.id!==sk.id);
        const cdLimited=/所有冷却(?:时间|上限)超过5秒/.test(text);
        if(cdLimited)recipients=recipients.filter(c=>(c.sk.base.冷却||0)>5);
        const conditional=/时|若|当|每有|每被|只要|几率|概率|站在|超过|其数值|触发|对(?:携带|处于|失神|中毒|神火|外伤)/.test(text);
        effects.push({id:u.id,sourceId:sk.id,source:sk.name+' · '+u.name,text,tags:[...new Set(direct)],recipients:recipients.map(c=>({id:c.sk.id,name:c.sk.name})),conditional,broad,scope:all?(cdLimited?'基础冷却 > 5 秒（当前冷却待核实）':'全部已选功法'):direct.length?[...new Set(direct)].join(' / ')+' 类型':'状态或触发效果；对象需进一步确认',warning:d.metadata.verification?.[u.id]?.note||'',status:'pending'});
      }
    }
    const bounce=effects.filter(e=>e.text==='所有弹射功法弹射次数+1。');
    const bounceBySkill=chosen.filter(c=>c.tags.includes('弹射')).map(c=>({id:c.sk.id,name:c.sk.name,sources:bounce.filter(e=>e.recipients.some(r=>r.id===c.sk.id)).map(e=>e.source)})).filter(c=>c.sources.length);
    return {effects,bounceBySkill,chosen:chosen.map(c=>({id:c.sk.id,name:c.sk.name,tags:c.tags,incoming:effects.filter(e=>e.recipients.some(r=>r.id===c.sk.id)).map(e=>e.id),externalIncoming:effects.filter(e=>e.sourceId!==c.sk.id&&e.recipients.some(r=>r.id===c.sk.id)).map(e=>e.id)}))};
  }
  function compareEquipment(build,slot,id,tier,d){
    const before=BuildStats.sumFixedTraits(build,d.equips,d.traits);
    const next={...build,equips:{...build.equips},equipTiers:{...build.equipTiers}};
    if(id){next.equips[slot]=id;next.equipTiers[slot]=tier;}else{delete next.equips[slot];delete next.equipTiers[slot];}
    const after=BuildStats.sumFixedTraits(next,d.equips,d.traits);
    const a=new Map(before.numeric.map(n=>[n.key,n])),b=new Map(after.numeric.map(n=>[n.key,n]));
    const numeric=[...new Set([...a.keys(),...b.keys()])].map(k=>{const x=a.get(k),y=b.get(k);return {name:(y||x).name,rule:(y||x).rule,before:[x?.min||0,x?.max||0],after:[y?.min||0,y?.max||0],delta:[(y?.min||0)-(x?.min||0),(y?.max||0)-(x?.max||0)]};}).filter(n=>n.delta.some(v=>Math.abs(v)>1e-10));
    const previous=before.specials.filter(e=>e.slot===Number(slot)),following=after.specials.filter(e=>e.slot===Number(slot));
    return {numeric,removed:previous.filter(x=>!following.some(y=>y.text===x.text)),added:following.filter(y=>!previous.some(x=>x.text===y.text)),unresolved:after.unresolved.filter(e=>e.slot===Number(slot))};
  }
  function shortEffect(effect,limit=32){
    const clauses=effect.text.split(/[，。；,]/).filter(Boolean);
    const text=(clauses.find(t=>!/本功法/.test(t)&&/所有|任意|(?:远程|近战|持续|弹射|穿透|异常|妨害|增益|中毒|神火|外伤|光环)功法|追加效果/.test(t))||clauses[0]||effect.text).replace(/所有(?:的)?|你的/g,'').trim();
    return text.length>limit?text.slice(0,limit-1)+'…':text;
  }
  function synergyGroups(result){
    const groups=new Map();
    for(const e of result.effects){
      if(!groups.has(e.sourceId))groups.set(e.sourceId,{id:e.sourceId,effects:[],recipients:[],briefs:[]});
      const g=groups.get(e.sourceId);g.effects.push(e);
      for(const r of e.recipients)if(!g.recipients.some(t=>t.id===r.id))g.recipients.push(r);
      const brief=shortEffect(e);if(!g.briefs.includes(brief))g.briefs.push(brief);
    }
    return [...groups.values()];
  }
  function effectTopics(effect){
    const text=shortEffect(effect,200),rules=[['弹射',/弹射次数|弹射上限/],['穿透',/穿透次数|穿透上限/],['冷却',/冷却/],['范围',/范围|射程/],['持续时间',/持续时间|持续时长/],['暴击',/暴击/],['伤害',/伤害/],['状态叠加',/叠加|层数/],['追加效果',/追加/]];
    const topics=rules.filter(([,pattern])=>pattern.test(text)).map(([name])=>name);
    return topics.length?topics:['触发效果'];
  }
  return {status,normalizeSlot,effectiveTags,reverseIndex,search,keywordGroups,synergy,compareEquipment,shortEffect,synergyGroups,effectTopics};
})();
if(typeof module!=='undefined'&&module.exports) module.exports=WikiTools;
