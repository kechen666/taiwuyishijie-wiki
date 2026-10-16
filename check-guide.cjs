const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.BuildStats=require('./build-stats.js');global.WikiTools=require('./wiki-tools.js');
global.GuideBuild=require('./guide-build.js');const image=require('./build-image.js');
const d=JSON.parse(JSON.stringify(vm.runInNewContext(fs.readFileSync('data.js','utf8')+'\n'+fs.readFileSync('guide-data.js','utf8')+';TAIWU_DATA')));
assert.equal(d.heroes.length,6);assert.equal(d.characterTraits.length,90);assert.equal(d.companions.length,7);assert.equal(d.companionSkills.length,50);assert.equal(d.items.length,46);
assert.equal(d.guideMeta.sourceSha256,d.metadata.sourceSha256);
for(const h of d.heroes){
  assert.deepEqual(h.stages.map(s=>s.trait_ids.length),[1,2,3,3,3,3]);
  for(const stage of h.stages)for(const id of stage.trait_ids){const t=d.characterTraits.find(t=>t.id===id);assert(t&&t.heroId===h.id&&t.realm===stage.realm);}
}
assert.equal(d.companions.flatMap(c=>c.stages).length,43);
for(const c of d.companions)for(const s of c.stages){
  assert(Object.values(s.skillIds).flat().every(id=>d.companionSkills.some(k=>k.id===id)));
  if(s.sharedPortrait)assert.equal(s.icon,null,'A reused portrait must not be displayed as a dedicated portrait');
}
assert.equal(d.items.filter(i=>i.kind==='active'&&i.iconStatus==='candidate').length,8);
assert(!d.companionSkills.some(s=>/GetSkillDamage|GetEffectDamage/.test(s.desc)));
assert.equal(d.items.filter(i=>i.kind==='elixir'&&i.poolStatus.startsWith('在已收集')).length,21);
assert(d.items.some(i=>i.sourceId==='1033'&&i.pools[0].weight==='0'));
const empty=GuideBuild.normalize({},d);assert.deepEqual(empty,{character:null,realm:0,characterTraits:{},companion:null,notes:''});
const dirty={character:'YunEr',realm:2,characterTraits:{0:'YunEr_L0',1:'YunEr_L1_1',2:'YunEr_L2_1',3:'YunEr_L3_1',4:'LiuLi_L4_1'},companion:'ZiMing7'};
assert.deepEqual(GuideBuild.normalize(dirty,d),{character:'YunEr',realm:2,characterTraits:{1:'YunEr_L1_1',2:'YunEr_L2_1'},companion:'ZiMing7',notes:''});
assert.deepEqual(GuideBuild.normalize({...dirty,character:'LiuLi'},d).characterTraits,{});
assert.equal(GuideBuild.normalize({...dirty,companion:'ZiMing_pig'},d).companion,null);
assert.equal(GuideBuild.normalize({...dirty,character:'missing'},d).character,null);
assert.deepEqual(GuideBuild.selectedTraits(dirty,d).map(t=>t.name),['玄冰诀','调律','魔音']);
const fixture=JSON.parse(fs.readFileSync('full-build-test.json','utf8'));
const build={...fixture,...GuideBuild.normalize(dirty,d)};
assert(GuideBuild.hasSelection({character:'YunEr'},d));assert(GuideBuild.hasSelection({companion:'HuLing1'},d));
assert.deepEqual(GuideBuild.normalize(JSON.parse(JSON.stringify(build)),d),GuideBuild.normalize(build,d));
build.notes='先选择弹射分支。\n\n<保留字面备注> 再补装备。';
const content=image.sections(build,d),profile=content.find(g=>g.kind==='profile');
assert.deepEqual(content.map(g=>g.kind),['notes','profile','skills','equipment']);
assert.equal(content[0].cards[0].text,build.notes);
assert.equal(GuideBuild.normalize({notes:{}},d).notes,'');
assert.equal(GuideBuild.normalize({notes:'a\r\nb\rc'},d).notes,'a\nb\nc');
assert.equal(GuideBuild.normalize({notes:'字'.repeat(5000)},d).notes.length,4000);
assert.equal(GuideBuild.normalize(JSON.parse(JSON.stringify(build)),d).notes,build.notes);
assert.equal(profile.cards.length,2);assert.equal(profile.cards[0].title,'筠儿');assert.equal(profile.cards[0].entries.length,3);assert.equal(profile.cards[1].meta,'灵侍 · 成长阶段 7');
const characterOnly=image.sections({character:'YunEr',realm:0},d);assert.equal(characterOnly[0].cards[0].entries[0].title,'玄冰诀');
const layout=image.layout({measureText:t=>({width:t.length*20})},'角色灵侍配置',content);assert(layout.pages.every(p=>p.height<8500));
const noteContext={measureText:t=>({width:[...t].length*22})};
assert.deepEqual(image.wrap(noteContext,'第一行\n\n<原样>',1000,22,true),['第一行','','<原样>']);
const longNotes=GuideBuild.normalize({notes:'字\n'.repeat(2000)},d).notes;
const longPlan=image.layout(noteContext,'长备注',image.sections({notes:longNotes},d));
assert(longPlan.pages.length>1);assert(longPlan.pages.every(p=>p.height<8500));
assert.equal(longPlan.pages.flatMap(p=>p.items.filter(i=>i.kind==='notes').flatMap(i=>i.lines)).join('\n'),longNotes);
const pack=vm.runInNewContext(fs.readFileSync('export-icons.js','utf8')+';TAIWU_EXPORT_ICONS');
for(const row of [...d.characterTraits,...d.companionSkills,...d.items,...d.companions.flatMap(c=>c.stages)])if(row.icon){assert(fs.existsSync(''+row.icon));assert(pack[row.icon]?.startsWith('data:image/webp;base64,'));}
const rows=WikiTools.reverseIndex(d);assert(WikiTools.search(rows,'弹射次数').some(r=>r.guideKind==='item'&&r.entityId==='elixir:1009'));
assert(WikiTools.search(rows,'弹射').some(r=>r.guideKind==='talent'));
assert(WikiTools.search(rows,'经验').some(r=>r.guideKind==='companion'));
const keyword=d.keywords.find(k=>k.name==='神火'),groups=WikiTools.keywordGroups(rows,keyword);
assert.deepEqual(groups[0][2],WikiTools.search(rows,'',keyword));
assert.equal(groups.slice(1).reduce((n,g)=>n+g[2].length,0),groups[0][2].length);
assert(groups.find(g=>g[0]==='guide')[2].length>0);
const nodes=Object.fromEntries(['reverseSearch','reverseStatus','keywordChips','keywordCount','kwSections','reverseResults'].map(id=>[id,{value:'',innerHTML:'',textContent:''}]));
let drawer='';const uiContext={D:d,WikiTools,reverseRows:rows,KW_GROUPS:[{key:'misc',title:'机制与其他'}],document:{getElementById:id=>nodes[id]},esc:s=>String(s),escFx:s=>String(s),iconHTML:()=>'',dataNote:()=>'',showDrawer:s=>{drawer=s;}};
vm.createContext(uiContext);vm.runInContext(fs.readFileSync('wiki-ui.js','utf8'),uiContext);
vm.runInContext('renderKeywords()',uiContext);
vm.runInContext('openKeyword('+JSON.stringify(keyword.id)+')',uiContext);
for(const [,label,list] of groups){assert(nodes.kwSections.innerHTML.includes('<span>'+label+' '+list.length+'</span>'));assert(drawer.includes('>'+label+' '+list.length+'</button>'));}
nodes.reverseSearch.value=keyword.name;vm.runInContext('renderKeywords()',uiContext);
assert(nodes.reverseResults.innerHTML.includes('相关条目 '+groups[0][2].length+' 条'));
assert.deepEqual(d.items.filter(i=>i.kind==='pickup').map(i=>i.name),['生命药瓶（HealthBottle）','磁铁（Magnet）','炸弹（Bomb）']);
for(const file of ['guide-build.js','guide-data.js','guide-ui.js','wiki-ui.js','build-image.js'])new vm.Script(fs.readFileSync(''+file,'utf8'));
const html=fs.readFileSync('index.html','utf8');for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
for(const id of ['characters','companions','items'])assert(html.includes('id="page-'+id+'"'));
assert(html.includes('...GuideBuild.normalize(b,D)'));assert(html.includes('...GuideBuild.normalize(d,D)'));assert(html.includes('...GuideBuild.normalize(currentBuild,D)'));
console.log('PASS: guide references/icons/status, realm and ownership constraints, reused portraits, legacy/JSON state, notes/JSON preservation and paginated PNG, keyword card/search/drawer consistency and pickup translations.');
