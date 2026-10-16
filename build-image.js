const BuildImage = (() => {
  const clean=t=>String(t||'').replace(/\{"f":"[^}]+\}/g,'【动态伤害】').replace(/<[^>]+>/g,'');
  function sections(build,d){
    const slots=(build.slots||[]).map(s=>WikiTools.normalizeSlot(s,d.skills)).filter(Boolean);
    const skills=slots.map(slot=>{
      const sk=d.skills.find(s=>s.id===slot.skill),evo=sk.evos.find(e=>e.id===slot.evo);
      return {kind:'skill',title:sk.name,icon:(evo||sk).icon,meta:evo?evo.name:'未突破',branches:slot.picks.map(bn=>{
        const u=sk.upgrades.find(u=>u.branch===bn);return {name:clean(u.name.replace(/\s*等级\s*1$/,'')),icon:u.icon,level:slot.levels[bn]||0};
      })};
    });
    const state=BuildStats.normalizeEquipment(build.equips,build.equipTiers,d.equips);
    const equipment=Object.entries(state.equips).map(([sid,id])=>{
      const e=d.equips.find(e=>e.id===id),traits=e.fixed.map(id=>d.traits[id]).filter(Boolean);
      return {kind:'equipment',title:e.name,icon:e.icon,meta:d.slotNames[sid]+' · '+'ⅠⅡⅢ'[state.equipTiers[sid]-1]+'阶',attributes:[...new Set(traits.filter(t=>t.type!==3).map(t=>clean(t.name)))],effects:traits.filter(t=>t.type===3).map(t=>clean(BuildStats.specialText(t))).filter(Boolean)};
    });
    const notes=typeof build.notes==='string'?build.notes.replace(/\r\n?/g,'\n').slice(0,4000):'';
    const profile=typeof GuideBuild==='undefined'?[]:GuideBuild.cards(build,d);
    return [...(notes.trim()?[{title:'攻略备注',kind:'notes',cards:[{kind:'notes',text:notes}]}]:[]),...(profile.length?[{title:'角色特质与随行灵侍',kind:'profile',cards:profile}]:[]),{title:'功法配置',kind:'skills',cards:skills},{title:'装备配置',kind:'equipment',cards:equipment}];
  }
  function wrap(ctx,text,width,size,preserveEmpty=false){
    ctx.font=`${size}px "Microsoft YaHei", sans-serif`;const lines=[];
    for(const part of String(text).split('\n')){let line='';for(const token of part.match(/[+-]?\d+(?:\.\d+)?(?:%|秒|次|层)?|[A-Za-z]+|\s+|./gu)||[]){if(line&&ctx.measureText(line+token).width>width){lines.push(line);line='';}if(ctx.measureText(token).width>width){for(const ch of token){if(line&&ctx.measureText(line+ch).width>width){lines.push(line);line='';}line+=ch;}}else line+=token;}if(line||preserveEmpty)lines.push(line);}
    return lines;
  }
  function layout(ctx,title,groups,width=1200){
    const margin=40,gap=18,cardWidth=(width-margin*2-gap)/2,pages=[{items:[],height:0}];let y=154;
    const page=()=>pages[pages.length-1];
    const newPage=()=>{page().height=y+80;pages.push({items:[],height:0});y=150;};
    const heading=text=>{page().items.push({kind:'heading',text,x:margin,y});y+=50;};
    for(const group of groups){
      if(!group.cards.length)continue;
      if(y+220>8300)newPage();heading(group.title+(group.kind==='notes'?'':'  '+group.cards.length));
      if(group.kind==='notes'){
        const w=width-margin*2,lines=wrap(ctx,group.cards[0].text,w-44,22,true);
        while(lines.length){
          const count=Math.floor((8300-y-44)/32),chunk=lines.splice(0,count),h=chunk.length*32+44;
          page().items.push({kind:'notes',lines:chunk,x:margin,y,w,h});y+=h+18;
          if(lines.length){newPage();heading(group.title+'（续）');}
        }
        y+=16;continue;
      }
      const cols=2,w=cardWidth;
      for(let start=0;start<group.cards.length;start+=cols){
        const row=group.cards.slice(start,start+cols).map(card=>{
          const attributes=card.kind==='equipment'?wrap(ctx,card.attributes.join(' · '),w-44,21):[];
          const effects=card.kind==='equipment'?card.effects.map(t=>wrap(ctx,t,w-44,21)):[];
          const profileEffects=card.kind==='profile'?card.effects.flatMap(t=>wrap(ctx,t,w-44,20)):[];
          const h=card.kind==='profile'?128+card.entries.length*44+profileEffects.length*29:card.kind==='skill'?126+Math.max(1,card.branches.length)*44:Math.max(150,124+attributes.length*29+effects.reduce((n,l)=>n+l.length*30+12,0));
          return {kind:card.kind,card,w,h,attributes,effects,profileEffects};
        });
        const height=Math.max(...row.map(c=>c.h));
        if(y+height>8300){newPage();heading(group.title+'（续）');}
        row.forEach((item,i)=>page().items.push({...item,x:margin+i*(w+gap),y,h:height}));y+=height+18;
      }
      y+=16;
    }
    page().height=y+90;return {width,title:clean(title).slice(0,48),pages};
  }
  let iconPackPromise;
  async function loadIcons(){
    if(typeof TAIWU_EXPORT_ICONS==='undefined'){
      iconPackPromise ||= new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='export-icons.js';s.onload=resolve;s.onerror=()=>{iconPackPromise=null;reject(Error('Export icon data unavailable'));};document.head.appendChild(s);});
      await iconPackPromise;
    }
    return TAIWU_EXPORT_ICONS;
  }
  function box(ctx,x,y,w,h,fill='#25231f',stroke='#484033',radius=10){ctx.beginPath();ctx.roundRect(x,y,w,h,radius);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
  function text(ctx,value,x,y,size=21,color='#d8d2c6'){ctx.font=`${size}px "Microsoft YaHei", sans-serif`;ctx.fillStyle=color;ctx.textBaseline='top';ctx.fillText(value,x,y);}
  async function render(build,d){
    const pack=await loadIcons(),groups=sections(build,d),canvas=document.createElement('canvas');canvas.width=1200;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
    const plan=layout(ctx,build.name||'未命名 Build',groups),images=new Map();
    const keys=[...new Set(groups.flatMap(g=>g.cards.flatMap(c=>[c.icon,...(c.branches||[]).map(b=>b.icon),...(c.entries||[]).map(e=>e.icon)])))].filter(Boolean);
    await Promise.all(keys.map(key=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images.set(key,img);resolve();};img.onerror=()=>reject(Error('Missing export icon '+key));img.src=pack[key]||'';})));
    const drawIcon=(key,x,y,size)=>{box(ctx,x,y,size,size,'#1b1a18','#4a4235',7);const img=images.get(key);if(img){const scale=(size-8)/Math.max(img.width,img.height);ctx.drawImage(img,x+(size-img.width*scale)/2,y+(size-img.height*scale)/2,img.width*scale,img.height*scale);}else text(ctx,'◇',x+size/3,y+size/4,size/2,'#a39a87');};
    const blobs=[];
    for(let pi=0;pi<plan.pages.length;pi++){
      const page=plan.pages[pi];canvas.height=Math.ceil(page.height);ctx.fillStyle='#1c1c1c';ctx.fillRect(0,0,1200,canvas.height);
      text(ctx,'太吾异世劫 · 构筑分享',40,30,20,'#b19b76');text(ctx,plan.title,40,67,35,'#eddfc3');text(ctx,'功法 '+groups.find(g=>g.kind==='skills').cards.length+' / 6     装备 '+groups.find(g=>g.kind==='equipment').cards.length+' / 9',40,114,18,'#a6a095');
      for(const item of page.items){
        const {x,y,w,h,card:c}=item;
        if(item.kind==='heading'){text(ctx,item.text,x,y,27,'#d8bd86');continue;}
        box(ctx,x,y,w,h);
        if(item.kind==='notes'){item.lines.forEach((line,i)=>text(ctx,line,x+22,y+22+i*32,22));continue;}
        drawIcon(c.icon,x+20,y+18,64);
        text(ctx,c.title,x+100,y+24,25,'#eee2ca');
        if(item.kind==='profile'){
          text(ctx,c.meta,x+100,y+63,18,'#b9aa8c');let yy=y+111;
          for(const e of c.entries){drawIcon(e.icon,x+22,yy-3,30);text(ctx,e.title,x+62,yy+1,20);text(ctx,e.meta,x+w-100,yy+1,16,'#b9aa8c');yy+=44;}
          for(const line of item.profileEffects){text(ctx,line,x+22,yy,20,'#b9aa8c');yy+=29;}
        }else if(item.kind==='skill'){
          text(ctx,c.meta,x+100,y+63,18,'#b9aa8c');let yy=y+113;
          if(!c.branches.length)text(ctx,'尚未选择升级分支',x+22,yy,20,'#9d988e');
          for(const b of c.branches){drawIcon(b.icon,x+22,yy-3,30);text(ctx,b.name,x+62,yy+1,20);text(ctx,b.level?'Lv'+b.level:'预选',x+w-85,yy+1,20,b.level?'#d8bd86':'#9d988e');for(let n=0;n<3;n++){ctx.fillStyle=n<b.level?'#c9a05a':'#4b453a';ctx.fillRect(x+w-85+n*17,yy+27,12,3);}yy+=44;}
        }else if(item.kind==='equipment'){
          text(ctx,c.meta,x+100,y+63,18,'#b9aa8c');let yy=y+111;
          for(const line of item.attributes){text(ctx,line,x+22,yy,21,'#cfc7b6');yy+=29;}
          if(!item.attributes.length&&!item.effects.length)text(ctx,'无固定词条',x+22,yy,20,'#9d988e');
          for(const lines of item.effects){yy+=8;ctx.fillStyle='#a47e46';ctx.fillRect(x+20,yy,3,lines.length*30-4);for(const line of lines){text(ctx,line,x+31,yy,21,'#cdb794');yy+=30;}yy+=4;}
        }
      }
      text(ctx,'配置规划 · 效果待实测    数据 '+d.metadata.snapshotDate+'    '+(pi+1)+' / '+plan.pages.length,40,canvas.height-45,17,'#a39a87');
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG encode failed');blobs.push(blob);
    }
    return blobs;
  }
  async function download(build,d){
    const blobs=await render(build,d),name=clean(build.name||'太吾Build').replace(/[\\/:*?"<>|]/g,'_').slice(0,60);
    const links=blobs.map((b,i)=>({url:URL.createObjectURL(b),name:name+(blobs.length>1?'_'+(i+1):'')+'.png'}));
    if(links.length===1){const a=document.createElement('a');a.href=links[0].url;a.download=links[0].name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),60000);return;}
    const dialog=document.createElement('dialog');dialog.style.cssText='max-width:900px;width:90vw;max-height:85vh;background:#201e1a;color:#eddec1;border:1px solid #695943';
    const close=document.createElement('button');close.textContent='关闭图片预览';close.onclick=()=>dialog.close();dialog.append(close);
    for(const l of links){const a=document.createElement('a');a.textContent='保存 '+l.name;a.href=l.url;a.download=l.name;a.style.cssText='display:block;color:#eddec1;margin:14px 0';const img=document.createElement('img');img.src=l.url;img.alt=l.name;img.style.width='100%';dialog.append(a,img);}
    dialog.addEventListener('close',()=>{links.forEach(l=>URL.revokeObjectURL(l.url));dialog.remove();});document.body.append(dialog);dialog.showModal();
  }
  return {sections,layout,wrap,render,download};
})();
if(typeof module!=='undefined'&&module.exports) module.exports=BuildImage;
