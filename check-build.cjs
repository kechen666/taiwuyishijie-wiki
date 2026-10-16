const assert = require('node:assert/strict');
const stats = require('./build-stats.js');
const equipment = [
  {id:'hat',name:'冠',slot:1,fixed:['a','special'],pool:[{id:'random'}]},
  {id:'armor',name:'衣',slot:2,fixed:['b']},
  {id:'gloves',name:'护手',slot:3,fixed:['ranged','melee']},
  {id:'boots',name:'鞋',slot:4,fixed:['missingRange','missingTrait']}
];
const traits = {
  a:{id:'a',type:1,name:'增伤',property:'Damage',skillTags:[],rule:'1',ranges:[['0.1','0.2'],['0.2','0.3'],['0.3','0.4']]},
  b:{id:'b',type:1,name:'增伤',property:'Damage',skillTags:[],rule:'1',ranges:[['0.05','0.1'],['0.1','0.2'],['0.2','0.3']]},
  ranged:{id:'ranged',type:2,name:'类型伤害',property:'Skill_Damage',skillTags:['1'],rule:'1',ranges:[['0.1','0.2']]},
  melee:{id:'melee',type:2,name:'类型伤害',property:'Skill_Damage',skillTags:['2'],rule:'1',ranges:[['0.1','0.2']]},
  random:{id:'random',type:1,name:'增伤',property:'Damage',skillTags:[],rule:'1',ranges:[['99','99']]},
  special:{id:'special',type:3,text:'命中时触发一次效果'},
  missingRange:{id:'missingRange',type:1,name:'复活',property:'Reborn',rule:'2',ranges:[['1','2'],null]}
};
const normalized = stats.normalizeEquipment({1:'hat',2:'armor',99:'gloves'}, {1:3,2:0}, equipment);
assert.deepEqual(normalized,{equips:{1:'hat',2:'armor'},equipTiers:{1:3,2:1}});
assert.deepEqual(stats.normalizeEquipment({1:'armor'}, {}, equipment).equips,{});
assert.deepEqual(stats.normalizeEquipment([], {}, equipment).equips,{});
let result = stats.sumFixedTraits({equips:{1:'hat',2:'armor'},equipTiers:{1:3,2:2}},equipment,traits);
assert.equal(result.numeric.length,1);
assert(Math.abs(result.numeric[0].min-0.4)<1e-10);
assert(Math.abs(result.numeric[0].max-0.6)<1e-10);
assert.equal(result.numeric[0].sources.length,2);
assert.equal(result.specials.length,1);
assert.equal(stats.formatRange([result.numeric[0].min,result.numeric[0].max],'1'),'40% ～ 60%');
result=stats.sumFixedTraits({equips:{1:'hat',2:'armor'}},equipment,traits);
assert(Math.abs(result.numeric[0].min-0.15)<1e-10); // Existing saves default to tier I.
assert.equal(stats.sumFixedTraits({equips:{3:'gloves'}},equipment,traits).numeric.length,2);
result=stats.sumFixedTraits({equips:{4:'boots'},equipTiers:{4:2}},equipment,traits);
assert.equal(result.numeric.length,0);
assert.equal(result.unresolved.length,2);
assert.equal(stats.sumFixedTraits({equips:{}},equipment,traits).numeric.length,0);
assert.equal(stats.formatRange(['1','1'],'2'),'1');
assert.equal(stats.formatRange(['-0.2','0'],'1'),'-20% ～ 0%');
assert.equal(stats.formatRange(['','1'],'1'),null);
assert.equal(stats.formatRange(['NaN','1'],'1'),null);
assert.equal(stats.specialText({type:3,text:'无',skill:true,skillNames:['九凤天罚']}),'附带功法：九凤天罚');
console.log('PASS: tier ranges, shared properties, target scopes, source details, specials, missing data and legacy equipment.');
