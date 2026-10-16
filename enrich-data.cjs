// Reapply IDs-only source metadata without replacing the original readable text.
const fs=require('node:fs'),vm=require('node:vm');
const file='data.js',d=vm.runInNewContext(fs.readFileSync(file,'utf8')+';TAIWU_DATA');
const links=JSON.parse(fs.readFileSync('source-links.json','utf8'));
const tags=ids=>(ids||[]).map(id=>d.types.find(t=>String(t.id)===String(id))?.cn).filter(Boolean);
for(const s of d.skills){
  s.keywordIds=links.skills[s.id]?.keywords||[];
  for(const u of [...s.upgrades,...s.evos]){
    const m=links.upgrades[u.id]||{};
    u.keywordIds=m.keywords||[];u.addedTags=tags(m.addedTags);u.affectedTags=tags(m.affectedTags);u.buffEvidence=m.buffs||[];
  }
}
for(const t of Object.values(d.traits)) t.keywordIds=links.traits[t.id]||[];
d.metadata={snapshotDate:'2026-10-16',gameVersion:'未确认版本号（本地配置快照）',source:'Steam 本地 design.dat',sourceSha256:'f96b04f9a1b1058db4a8a5dbc804fd539bd2c225119024765401da0972897997',defaultStatus:'config',scope:'基础掉落池 30 门功法、145 件装备；非全部游戏内容',statuses:{config:'配置描述',tested:'已实测机制',pending:'待验证'},verification:{JSLHS_U3L3:{status:'pending',note:'描述指向所有弹射功法，但 Buff 的目标选择为 3、无标签字段；与黄竹歌的选择为 2、标签 7 不同，实际范围待验证。'}}};
d.metadata.verification=JSON.parse(fs.readFileSync('mechanics-evidence.json','utf8'));
fs.writeFileSync(file,'const TAIWU_DATA = '+JSON.stringify(d)+';\n');
console.log('Enriched source links, tags and verification metadata.');
