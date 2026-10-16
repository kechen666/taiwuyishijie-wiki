const GuideBuild = (() => {
  function normalize(build,d){
    const hero=(d.heroes||[]).find(h=>h.id===build?.character);
    const realm=hero?Math.max(0,Math.min(hero.maxRealm,Number.isInteger(Number(build.realm))?Number(build.realm):hero.maxRealm)):0;
    const picks={};
    for(let level=1;level<=realm;level++){
      const id=build.characterTraits?.[level];
      if((d.characterTraits||[]).some(t=>t.id===id&&t.heroId===hero.id&&t.realm===level))picks[level]=id;
    }
    const companion=(d.companions||[]).flatMap(c=>c.stages).some(s=>s.id===build?.companion)?build.companion:null;
    const notes=typeof build?.notes==='string'?build.notes.replace(/\r\n?/g,'\n').slice(0,4000):'';
    return {character:hero?.id||null,realm,characterTraits:picks,companion,notes};
  }
  function selectedTraits(build,d){
    const b=normalize(build,d);
    return (d.characterTraits||[]).filter(t=>t.heroId===b.character&&(t.realm===0||b.characterTraits[t.realm]===t.id));
  }
  function companion(build,d){
    const id=normalize(build,d).companion;
    for(const family of d.companions||[]){const stage=family.stages.find(s=>s.id===id);if(stage)return {family,stage};}
    return null;
  }
  function hasSelection(build,d){const b=normalize(build,d);return Boolean(b.character||b.companion);}
  function cards(build,d){
    const b=normalize(build,d),hero=(d.heroes||[]).find(h=>h.id===b.character),pet=companion(b,d),cards=[];
    if(hero)cards.push({kind:'profile',title:hero.name,icon:hero.icon,meta:'角色 · 境界 '+b.realm,
      entries:selectedTraits(b,d).map(t=>({title:t.name,meta:t.realm?'境界 '+t.realm:'基础',icon:t.icon})),
      effects:['每境界选择1项用于规划；互斥与叠加待验证。']});
    if(pet)cards.push({kind:'profile',title:pet.family.name,icon:pet.stage.icon,
      meta:'灵侍 · '+(pet.family.stages.length>1?'成长阶段 '+pet.stage.stage:'单阶段'),
      entries:Object.entries(pet.stage.skillIds).flatMap(([role,ids])=>ids.map(id=>{const s=d.companionSkills.find(s=>s.id===id);return s?{title:s.name,meta:role,icon:s.icon}:null;})).filter(Boolean),
      effects:[pet.stage.passive,...(pet.stage.sharedPortrait?['源头像资源共用，未使用专属头像。']:[])].filter(Boolean)});
    return cards;
  }
  return {normalize,selectedTraits,companion,hasSelection,cards};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=GuideBuild;
