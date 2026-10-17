const DropUI = (() => {
  const colors=['#e2be74','#7fb7e5','#5fc6ae','#e28b6c','#b39ce3','#e6a4c0','#abd07f','#73cddd'];
  let selected='Equipment_BigBoss_1',visible=null;
  const percent=value=>{
    if(value===0)return '0%';
    const p=value*100,digits=p<0.0001?8:p<1?6:4;
    return p.toFixed(digits).replace(/\.?0+$/,'')+'%';
  };
  const tick=value=>Number(value.toPrecision(5)).toLocaleString('en-US',{useGrouping:false,maximumFractionDigits:8})+'%';
  function chartSVG(series,metric,{log=false,focus='',width=620}={}){
    if(!series.length)return '<p class="summary-empty">请至少选择一条规则，或点击“全部显示”。</p>';
    const id='drop-'+metric,w=Math.max(280,width),h=310,left=76,right=19,top=22,bottom=51;
    const pw=w-left-right,ph=h-top-bottom,values=series.flatMap(s=>s.points.map(p=>p[metric]*100));
    const maximum=Math.max(...values),minimum=Math.min(...values.filter(v=>v>0));
    let ticks,y;
    if(log){
      const lo=Math.floor(Math.log10(minimum)),hi=Math.max(lo+1,Math.ceil(Math.log10(maximum)));
      ticks=Array.from({length:hi-lo+1},(_,i)=>10**(lo+i));
      y=value=>top+(hi-Math.log10(value))/(hi-lo)*ph;
    }else{
      const raw=maximum/4,power=10**Math.floor(Math.log10(raw||1));
      const step=[1,2,2.5,5,10].find(n=>n>=raw/power)*power,upper=Math.ceil(maximum/step)*step||1;
      ticks=Array.from({length:Math.round(upper/step)+1},(_,i)=>i*step);
      y=value=>top+(1-value/upper)*ph;
    }
    const x=value=>left+value/450*pw;
    const labels=series[0].points.map(p=>`<text x="${x(p.rPercent)}" y="${h-bottom+23}" text-anchor="middle">${p.rPercent}</text>`).join('');
    const grid=ticks.map(v=>`<line class="drop-grid-line" x1="${left}" x2="${w-right}" y1="${y(v)}" y2="${y(v)}"/><text x="${left-9}" y="${y(v)+4}" text-anchor="end">${tick(v)}</text>`).join('');
    const paths=series.map(s=>{
      const color=colors[s.index],active=s.rule.id===focus,compare=s.rule.kind!=='enemy';
      return `<g class="drop-series ${active?'focused':''}" style="--drop-color:${color}"><polyline points="${s.points.map(p=>`${x(p.rPercent)},${y(p[metric]*100)}`).join(' ')}"${compare?' stroke-dasharray="7 5"':''}/>${s.points.map(p=>`<circle cx="${x(p.rPercent)}" cy="${y(p[metric]*100)}" r="${active?4.7:3.1}" tabindex="0"><title>${esc(s.rule.label)} · 传入R=${p.rPercent}% · ${metric==='q'?'单件绝品':'一次触发至少1件绝品'} ${percent(p[metric])}${compare?'（统一公式对照，非实际入口预测）':''}</title></circle>`).join('')}</g>`;
    }).join('');
    return `<svg class="drop-chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-title ${id}-description"><title id="${id}-title">${metric==='q'?'单件装备的绝品概率':'一次击杀或触发至少获得一件绝品的概率'}，${log?'对数':'线性'}坐标</title><desc id="${id}-description">横轴为假设传入的R，取0、100、150、250、350、450%。纵轴为概率。各规则颜色见图例；宝箱和事件以虚线表示公式对照。精确数值见下方表格。</desc>${grid}${labels}<text x="${left}" y="13">概率（%）${log?' · 对数刻度':''}</text><text x="${left+pw/2}" y="${h-6}" text-anchor="middle">假设传入的最终 R（%）</text>${paths}</svg>`;
  }
  function settings(){
    const enemy=document.getElementById('dropEnemy'),quantity=document.getElementById('dropQuantity');
    if(!enemy.checkValidity()||!quantity.checkValidity())throw new RangeError('E和D请填写0～10000之间的百分比。');
    return {e:Number(enemy.value)/100,d:Number(quantity.value)/100,mode:document.getElementById('dropGate').value,log:document.getElementById('dropLog').checked};
  }
  function toggle(id){
    if(visible.has(id))visible.delete(id);else visible.add(id);
    render();
  }
  function showAll(){visible=new Set(D.drop.rules.map(r=>r.id));render();}
  function onlySelected(){visible=new Set([selected]);render();}
  function matrix(series,metric){
    return `<div class="drop-table-scroll" tabindex="0" role="region" aria-label="${metric==='q'?'全部规则单件概率':'全部规则每次触发概率'}"><table class="drop-table"><caption>${metric==='q'?'单件装备的绝品概率（已获得装备为条件）':'一次触发至少获得一件绝品的概率'}</caption><thead><tr><th scope="col">规则</th>${D.drop.rPercents.map(r=>`<th scope="col">R=${r}%</th>`).join('')}</tr></thead><tbody>${series.map(s=>`<tr><th scope="row">${esc(s.rule.label)}${s.rule.kind!=='enemy'?' *':''}</th>${s.points.map(p=>`<td>${percent(p[metric])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function render(){
    let state;
    try{state=settings();}catch(error){document.getElementById('dropError').textContent=error.message;return;}
    document.getElementById('dropError').textContent='';
    const all=DropModel.series(D.drop,state.e,state.d,state.mode).map((s,index)=>({...s,index}));
    const next=document.getElementById('dropRule').value||selected;
    if(next!==selected){
      if(visible.size===1&&visible.has(selected))visible=new Set([next]);else visible.add(next);
      selected=next;
    }
    const shown=all.filter(s=>visible.has(s.rule.id));
    document.getElementById('dropLegend').innerHTML=all.map(s=>`<button type="button" class="drop-legend-item ${visible.has(s.rule.id)?'on':''}" aria-pressed="${visible.has(s.rule.id)}" style="--drop-color:${colors[s.index]}" onclick="DropUI.toggle('${s.rule.id}')"><span aria-hidden="true" class="drop-legend-line ${s.rule.kind!=='enemy'?'dashed':''}"></span>${esc(s.rule.label)}${s.rule.kind!=='enemy'?' *':''}</button>`).join('');
    document.getElementById('dropAssumptions').textContent=`图表统一代入 E=${Number((state.e*100).toPrecision(12))}%、数量加成 D=${Number((state.d*100).toPrecision(12))}%，${state.mode==='integer'?'采用静态整数门槛':'采用配置名义数量概率'}。R取0%、100%、150%、250%、350%、450%；实线为敌人规则，虚线仅作宝箱/事件规则的公式对照。`;
    for(const [host,metric] of [['dropChartQ','q'],['dropChartOnce','once']]){
      const el=document.getElementById(host);el.innerHTML=chartSVG(shown,metric,{log:state.log,focus:selected,width:el.clientWidth||620});
    }
    const chosen=all.find(s=>s.rule.id===selected),r=chosen.rule;
    document.getElementById('dropSelectedTitle').textContent=r.label+' · '+r.alias;
    document.getElementById('dropSelectedNote').textContent=`n=${r.drawCount}次判定，名义p0=${percent(r.baseDropRate)}，最低m=${r.minimumCount}件；当前模型的单次数量成功率为${percent(chosen.points[0].p)}，期望装备件数约${chosen.points[0].expectedCount.toFixed(4)}。`;
    document.getElementById('dropValues').innerHTML=chosen.points.map(p=>`<tr><th scope="row">${p.rPercent}%</th><td>${p.k.toFixed(3).replace(/\.?0+$/,'')}</td><td>${percent(p.q)}</td><td>${percent(p.once)}</td></tr>`).join('');
    document.getElementById('dropMatrices').innerHTML=matrix(all,'q')+matrix(all,'once');
  }
  function init(){
    const d=D.drop;visible=new Set(d.rules.map(r=>r.id));
    document.getElementById('dropDate').textContent=d.metadata.snapshotDate+' · 配置与静态代码推导 · 未实测';
    document.getElementById('dropRule').innerHTML=d.rules.map(r=>`<option value="${r.id}"${r.id===selected?' selected':''}>${esc(r.label)} · ${r.alias}</option>`).join('');
    document.getElementById('dropRuleRows').innerHTML=d.rules.map(r=>`<tr><th scope="row">${esc(r.label)}<code>${esc(r.alias)}</code></th><td>${esc(r.meaning)}<small>${esc(r.meaningStatus)}</small><code>${esc(r.id)}</code></td><td>${r.drawCount}</td><td>${percent(r.baseDropRate)}</td><td>${r.minimumCount}</td><td class="drop-weight-cell">${r.qualityWeights.join(' / ')}</td></tr>`).join('');
    document.getElementById('dropSource').innerHTML=`<p>源表 DropRule_DropRule · 数据库 design.dat<br>SHA256 ${esc(d.metadata.databaseSha256)}</p><p>GameAssembly.dll SHA256<br>${esc(d.metadata.binarySha256)}</p>${d.metadata.nativeFunctions.map(f=>`<p><code>${esc(f.method)}</code> · RVA ${esc(f.rva)}${f.callRva?' / 调用点 '+esc(f.callRva):''}<br>${esc(f.meaning)}</p>`).join('')}<p>规则含义由 Character_EnemyCharacter.DropPackId、Task_GameTask.DropRule 等配置引用核对；H1L1具体入口仍待确认。实际触发、Buff覆盖与叠加、额外奖励、联机归属未做游戏测试。数学计算忽略品质浮点随机端点的极小边界差异。</p>`;
    for(const id of ['dropEnemy','dropQuantity'])document.getElementById(id).addEventListener('input',render);
    for(const id of ['dropRule','dropGate','dropLog'])document.getElementById(id).addEventListener('change',render);
    window.addEventListener('resize',()=>{if(document.getElementById('page-drops').classList.contains('on'))render();});
    render();
  }
  return {init,render,toggle,showAll,onlySelected,chartSVG,percent};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=DropUI;
