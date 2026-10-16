const BuildStats = (() => {
  function normalizeEquipment(equips, tiers, equipment){
    const normalized = {equips:{}, equipTiers:{}};
    if(!equips || typeof equips !== 'object' || Array.isArray(equips)) return normalized;
    const byId = new Map(equipment.map(e => [e.id,e]));
    for(const [sid,id] of Object.entries(equips)){
      const eq = byId.get(id);
      if(!eq || String(eq.slot) !== sid) continue;
      const tier = Number(tiers && tiers[sid]);
      normalized.equips[sid] = id;
      normalized.equipTiers[sid] = [1,2,3].includes(tier) ? tier : 1;
    }
    return normalized;
  }
  function numericRange(range){
    if(!Array.isArray(range) || range.length !== 2 || range.some(v => v == null || String(v).trim() === '')) return null;
    const values = range.map(Number);
    return values.every(Number.isFinite) ? [Math.min(...values),Math.max(...values)] : null;
  }
  function formatRange(range, rule){
    const values = numericRange(range);
    if(!values) return null;
    const percent = String(rule) === '1';
    const format = v => new Intl.NumberFormat('zh-CN',{maximumFractionDigits:3}).format(v * (percent ? 100 : 1)) + (percent ? '%' : '');
    return Math.abs(values[0] - values[1]) < 1e-12 ? format(values[0]) : values.map(format).join(' ～ ');
  }
  function specialText(trait){
    if(trait.text && trait.text.trim() && trait.text.trim() !== '无') return trait.text;
    if(trait.skillNames && trait.skillNames.length) return '附带功法：' + trait.skillNames.join('、');
    return trait.skill ? '附带功法（暂无文字说明）' : '';
  }
  function sumFixedTraits(build, equipment, traits){
    const state = normalizeEquipment(build.equips,build.equipTiers,equipment);
    const byId = new Map(equipment.map(e => [e.id,e]));
    const numeric = new Map(), specials = [], unresolved = [];
    for(const [sid,id] of Object.entries(state.equips)){
      const eq = byId.get(id), tier = state.equipTiers[sid];
      for(const fid of eq.fixed){
        const tr = traits[fid];
        const source = {slot:Number(sid),equipmentId:id,equipmentName:eq.name,traitId:fid,tier};
        if(!tr){ unresolved.push({...source,reason:'缺少词条配置'}); continue; }
        if(tr.type === 3){
          const text = specialText(tr);
          if(text) specials.push({...source,text});
          continue;
        }
        const range = numericRange(tr.ranges && tr.ranges[tier-1]);
        if(!range || !tr.property){ unresolved.push({...source,name:tr.name,reason:!tr.property ? '缺少属性字段' : '当前品阶无数值配置'}); continue; }
        // Keep different target types separate even when their display names match.
        const key = JSON.stringify([tr.type,tr.property,[...(tr.skillTags || [])].sort(),String(tr.rule)]);
        if(!numeric.has(key)) numeric.set(key,{key,name:tr.name,property:tr.property,rule:tr.rule,min:0,max:0,sources:[]});
        const item = numeric.get(key);
        item.min += range[0]; item.max += range[1];
        item.sources.push({...source,min:range[0],max:range[1]});
      }
    }
    return {numeric:[...numeric.values()],specials,unresolved,equipmentCount:Object.keys(state.equips).length};
  }
  return {normalizeEquipment,numericRange,formatRange,specialText,sumFixedTraits};
})();
if(typeof module !== 'undefined' && module.exports) module.exports = BuildStats;
