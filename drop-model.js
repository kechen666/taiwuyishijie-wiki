const DropModel = (() => {
  function nonnegative(value,name){
    if(!Number.isFinite(value)||value<0)throw new RangeError(name+'必须是有限非负数');
  }
  function quality(rule,r=0,e=0){
    nonnegative(r,'R');nonnegative(e,'E');
    const [w1,w2,w3,w4]=rule.qualityWeights,k=(1+r)*(1+e);
    const total=w1+w2+(w3+w4)*k;
    if(!Number.isFinite(total)||total<=0)throw new RangeError('品质总权重无效');
    return w4*k/total;
  }
  function gate(rule,d=0,mode='integer'){
    nonnegative(d,'D');
    if(mode==='nominal')return Math.min(1,rule.baseDropRate*(1+d));
    if(mode!=='integer')throw new RangeError('未知数量门槛模型');
    const threshold=Math.fround(Math.fround(Math.fround(1+Math.fround(d))*Math.fround(rule.baseDropRate))*10000);
    return Math.min(1,Math.max(0,(Math.floor(threshold)+1)/10000));
  }
  function choose(n,k){
    let value=1;
    for(let i=1;i<=k;i++)value=value*(n-i+1)/i;
    return value;
  }
  function calculate(rule,r=0,e=0,d=0,mode='integer'){
    const q=quality(rule,r,e),p=gate(rule,d,mode),n=rule.drawCount,m=rule.minimumCount;
    let once=0,expectedCount=0;
    for(let k=0;k<=n;k++){
      const probability=choose(n,k)*p**k*(1-p)**(n-k),count=Math.max(k,m);
      // A stable complement matters for ordinary enemies' very small probabilities.
      const success=count===0?0:q===1?1:-Math.expm1(count*Math.log1p(-q));
      once+=probability*success;
      expectedCount+=probability*count;
    }
    return {q,once,p,expectedCount,k:(1+r)*(1+e)};
  }
  function series(data,e=0,d=0,mode='integer'){
    return data.rules.map(rule=>({rule,points:data.rPercents.map(rPercent=>({rPercent,...calculate(rule,rPercent/100,e,d,mode)}))}));
  }
  return {quality,gate,calculate,series};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=DropModel;
