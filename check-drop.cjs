const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('./drop-model.js');
const d=JSON.parse(JSON.stringify(vm.runInNewContext(['data.js','guide-data.js','wanqu-data.js','drop-data.js'].map(f=>fs.readFileSync(f,'utf8')).join('\n')+';TAIWU_DATA')));
const data=d.drop,source=JSON.parse(fs.readFileSync('drop-source.json','utf8'));
assert.deepEqual(data,source);
assert.deepEqual(data.rPercents,[0,100,150,250,350,450]);
assert.deepEqual(data.rules.map(r=>r.alias),['normal','elite','smallboss','bigboss','BaoXiang_H1L1','Equipment_Event','BaoXiangGuai','NiuDa']);
assert.equal(data.metadata.databaseSha256,'128fa64524becd460c2e487e470a7a0e3b2f0e280b99f8cb55d067ec4caaad92');
assert.notEqual(data.metadata.databaseSha256,d.metadata.sourceSha256);
const rules=new Map(data.rules.map(r=>[r.alias,r]));
const near=(a,b)=>assert(Math.abs(a-b)<=Math.max(1e-18,Math.abs(b)*1e-11),`${a} != ${b}`);
assert.deepEqual(data.rules.map(r=>[r.drawCount,r.baseDropRate,r.minimumCount]),[[1,.0005,0],[2,.25,0],[3,.5,2],[6,.5,3],[2,.3,1],[3,.33,1],[4,.5,2],[6,.5,3]]);
const f32=value=>new Float32Array([value])[0];
function enumeratedGate(rule,d,mode){
  if(mode==='nominal')return Math.min(1,rule.baseDropRate*(1+d));
  const threshold=f32(f32(f32(f32(d)+1)*f32(rule.baseDropRate))*10000);
  let hits=0;
  for(let i=0;i<10000;i++)if(threshold>=i)hits++;
  return hits/10000;
}
function referenceQuality(rule,rPercent,ePercent){
  // Integer-rational normalization is independent of the floating implementation.
  const [a,b,c,d]=rule.qualityWeights.map(BigInt),factor=BigInt(100+rPercent)*BigInt(100+ePercent);
  return Number(d*factor)/Number((a+b)*10000n+(c+d)*factor);
}
function explicitOutcomes(rule,q,p){
  let once=0,expected=0,total=0;
  for(let equipmentMask=0;equipmentMask<2**rule.drawCount;equipmentMask++){
    let count=0,weight=1;
    for(let bit=0;bit<rule.drawCount;bit++){
      const hit=(equipmentMask>>bit)&1;count+=hit;weight*=hit?p:1-p;
    }
    count=Math.max(count,rule.minimumCount);total+=weight;expected+=weight*count;
    let legend=0;
    // Enumerate each non-empty legendary/non-legendary outcome, not 1-(1-q)^N.
    for(let qualityMask=1;qualityMask<2**count;qualityMask++){
      let chance=1;
      for(let bit=0;bit<count;bit++)chance*=((qualityMask>>bit)&1)?q:1-q;
      legend+=chance;
    }
    once+=weight*legend;
  }
  near(total,1);return {once,expected};
}
let scenarios=0;
for(const rule of data.rules)for(const r of data.rPercents)for(const e of [0,20,100])for(const d of [0,.08])for(const mode of ['integer','nominal']){
  const actual=model.calculate(rule,r/100,e/100,d,mode),q=referenceQuality(rule,r,e),p=enumeratedGate(rule,d,mode),expected=explicitOutcomes(rule,q,p);
  near(actual.q,q);near(actual.p,p);near(actual.once,expected.once);near(actual.expectedCount,expected.expected);
  assert(actual.q>=0&&actual.q<=1&&actual.once>=0&&actual.once<=1);
  assert(actual.expectedCount>=rule.minimumCount&&actual.expectedCount<=rule.drawCount);
  scenarios++;
}
near(model.quality(rules.get('normal')),1/10000);near(model.quality(rules.get('elite')),1/991);
near(model.quality(rules.get('normal'),1),2/10021);
near(model.quality(rules.get('bigboss'),1),200/1450);
near(model.gate(rules.get('normal')),0.0006);
near(model.calculate(rules.get('normal')).once,6e-8);
near(model.calculate(rules.get('bigboss')).once,0.30417903999693763);
near(model.quality(rules.get('bigboss'),1,.2),model.quality(rules.get('bigboss'),1.4,0));
const rareOnly={...rules.get('Equipment_Event'),qualityWeights:[0,0,100,25]};
near(model.quality(rareOnly,0,0),.2);near(model.quality(rareOnly,4.5,3.5),.2);
const guaranteed={...rules.get('smallboss'),baseDropRate:1};
near(model.calculate(guaranteed,0,0,0,'nominal').expectedCount,3,'Minimum count must not be added as extra items');
for(const r of data.rPercents){
  near(model.quality(rules.get('BaoXiangGuai'),r/100),model.quality(rules.get('NiuDa'),r/100));
  assert(model.calculate(rules.get('NiuDa'),r/100).once>model.calculate(rules.get('BaoXiangGuai'),r/100).once);
}
for(const rule of data.rules){
  const series=data.rPercents.map(r=>model.calculate(rule,r/100));
  assert(series.every((p,i)=>!i||p.q>=series[i-1].q&&p.once>=series[i-1].once));
}
assert.throws(()=>model.quality(rules.get('normal'),NaN),RangeError);
assert.throws(()=>model.calculate(rules.get('normal'),0,-1),RangeError);
assert.throws(()=>model.gate(rules.get('normal'),0,'unknown'),RangeError);
assert(data.rules.find(r=>r.kind==='chest').meaning.includes('尚未确认'));
assert(data.rules.find(r=>r.kind==='event').meaning.includes('D/R/E=0'));
const ids=['dropEnemy','dropQuantity','dropGate','dropLog','dropRule','dropError','dropLegend','dropAssumptions','dropChartQ','dropChartOnce','dropSelectedTitle','dropSelectedNote','dropValues','dropMatrices','dropDate','dropRuleRows','dropSource'];
const nodes=Object.fromEntries(ids.map(id=>[id,{value:'',checked:false,clientWidth:620,textContent:'',innerHTML:'',checkValidity:()=>true,addEventListener(){}}]));
nodes.dropEnemy.value='0';nodes.dropQuantity.value='0';nodes.dropGate.value='integer';
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const context={D:d,DropModel:model,esc:escape,document:{getElementById:id=>nodes[id]},window:{addEventListener(){}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('drop-ui.js','utf8'),context);
vm.runInContext('DropUI.init()',context);
assert.equal((nodes.dropChartQ.innerHTML.match(/<circle /g)||[]).length,48);
assert.equal((nodes.dropChartQ.innerHTML.match(/stroke-dasharray/g)||[]).length,2);
assert.equal((nodes.dropValues.innerHTML.match(/<tr>/g)||[]).length,6);
assert.equal((nodes.dropRuleRows.innerHTML.match(/<tr>/g)||[]).length,8);
assert.equal((nodes.dropMatrices.innerHTML.match(/<td>/g)||[]).length,96);
assert(nodes.dropValues.innerHTML.includes('13.7931%'));
const points=nodes.dropChartQ.innerHTML.match(/<polyline points="([^"]+)"/)[1].split(' ').map(p=>p.split(',').map(Number));
near(points[2][0]-points[1][0],(points[3][0]-points[2][0])/2);
nodes.dropLog.checked=true;vm.runInContext('DropUI.render()',context);
assert(nodes.dropChartOnce.innerHTML.includes('对数'));
assert(!/NaN|Infinity/.test(nodes.dropChartOnce.innerHTML));
vm.runInContext('DropUI.onlySelected()',context);
assert.equal((nodes.dropChartQ.innerHTML.match(/<circle /g)||[]).length,6);
nodes.dropRule.value='Equipment_Normal_1';vm.runInContext('DropUI.render()',context);
assert.equal((nodes.dropChartQ.innerHTML.match(/<circle /g)||[]).length,6);
assert(nodes.dropSelectedTitle.textContent.includes('normal'));
assert(nodes.dropChartQ.innerHTML.includes('普通怪'));
nodes.dropRule.value='Equipment_BigBoss_1';vm.runInContext('DropUI.render()',context);
vm.runInContext('DropUI.toggle("Equipment_BigBoss_1")',context);
assert(nodes.dropChartQ.innerHTML.includes('至少选择一条规则'));
vm.runInContext('DropUI.showAll()',context);
nodes.dropEnemy.value='20';vm.runInContext('DropUI.render()',context);
assert(nodes.dropAssumptions.textContent.includes('E=20%'));
assert(nodes.dropValues.innerHTML.includes('14.7239%'));
nodes.dropEnemy.checkValidity=()=>false;vm.runInContext('DropUI.render()',context);
assert(nodes.dropError.textContent.includes('0～10000'));
const ui=require('./drop-ui.js');
assert.equal(ui.percent(1),'100%');assert.equal(ui.percent(.1),'10%');assert.equal(ui.percent(6e-8),'0.000006%');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('data-page="drops"')&&html.includes('id="page-drops"')&&html.includes('DropUI.init()'));
assert(html.includes('任务奖励路径传入D/R/E=0')&&html.includes('虚线'));
assert(html.indexOf('src="drop-data.js"')<html.indexOf('const D = TAIWU_DATA'));
for(const file of ['drop-data.js','drop-model.js','drop-ui.js'])new vm.Script(fs.readFileSync(file,'utf8'));
for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
console.log(`PASS: ${scenarios} independently enumerated drop scenarios, rational R/E weights, integer gates, minimum counts, chart spacing/log/visibility, tables and source caveats.`);
