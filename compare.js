let DATA=null,MODE='total';
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
async function load(){DATA=await fetch('./data/fees.json').then(r=>r.json());render()}
function components(p){
 const P=+document.querySelector('#principal').value||0,y=+document.querySelector('#years').value||0,sell=document.querySelector('#exitMode').value==='sell',n=p.numeric||{};
 const cap=(n.annual_cap_years==null||n.annual_cap_years>50)?y:Math.min(y,n.annual_cap_years);
 const buy={low:(n.buy_low==null)?0:P*n.buy_low,high:(n.buy_high==null)?0:P*n.buy_high,known:n.buy_low!=null||n.buy_high!=null};
 const sl={low:(n.sell_low==null)?0:P*n.sell_low,high:(n.sell_high==null)?0:P*n.sell_high,known:n.sell_low!=null||n.sell_high!=null};
 let hold={low:0,high:0,known:n.annual_low!=null||n.annual_high!=null};
 if(p.name==='DBS 星展銀行'){hold={low:0,high:P*Math.min(Math.max(y-1,0)*.002,.006),known:true}}
 else if(p.name==='國泰世華'){let v=P*(Math.min(y,1)*.001+Math.max(y-1,0)*.002);hold={low:v,high:v,known:true}}
 else {hold.low=n.annual_low==null?0:P*cap*n.annual_low;hold.high=n.annual_high==null?0:P*cap*n.annual_high}
 const total={low:buy.low+hold.low+(sell?sl.low:0),high:buy.high+hold.high+(sell?sl.high:0),known:buy.known||hold.known||(sell&&sl.known)};
 let embedded={label:'需看成交報價',max:null};
 if(['富邦證券','國泰證券','凱基證券'].includes(p.name))embedded={label:'每筆 ≤5%（公告上限）',max:P*.05*(1+(sell?1:0))};
 else if(p.name==='中國信託')embedded={label:'0.5%–4%（多數內含）',max:P*.04};
 else if((p.embedded_fee_text||'').includes('0.5%'))embedded={label:'年化 ≤0.5%（公告上限）',max:P*.005*y};
 return {buy,sell:sl,hold,total,embedded};
}
function render(){
 const q=(document.querySelector('#filter')?.value||'').toLowerCase(),sort=document.querySelector('#sortMode')?.value||'low';
 const meta={total:['總成本排行榜','依目前情境計算。'],buy:['申購費排行榜','只比較買進時的顯性費用。'],sell:['賣出費排行榜','只比較提前退出成本。'],hold:['持有費排行榜','依持有年數計算。'],embedded:['內含費用比較','僅比較公告上限與揭露方式。']}[MODE];
 document.querySelector('#rankingTitle').textContent=meta[0];document.querySelector('#rankingNote').textContent=meta[1];
 document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===MODE));
 let rows=DATA.platforms.map(p=>({...p,c:components(p)})).filter(x=>x.name.toLowerCase().includes(q));
 rows.sort((a,b)=>{if(sort==='name')return a.name.localeCompare(b.name,'zh-Hant');let av,bv;if(MODE==='embedded'){av=a.c.embedded.max??(sort==='low'?9e18:-1);bv=b.c.embedded.max??(sort==='low'?9e18:-1)}else{av=a.c[MODE].known?a.c[MODE].high:(sort==='low'?9e18:-1);bv=b.c[MODE].known?b.c[MODE].high:(sort==='low'?9e18:-1)}return sort==='high'?bv-av:av-bv});
 if(MODE==='embedded'){
  document.querySelector('#costHead').innerHTML='<tr><th>平台</th><th>類型</th><th>內含費用揭露</th><th>依目前情境估算上限</th><th>官方來源</th></tr>';
  document.querySelector('#costBody').innerHTML=rows.map(x=>`<tr><td><strong>${x.name}</strong></td><td>${x.type}</td><td>${x.c.embedded.label}</td><td>${x.c.embedded.max==null?'無法直接計算':money(x.c.embedded.max)}</td><td><a href="${x.source}" target="_blank">官方頁 ↗</a></td></tr>`).join('');
  const c=rows.filter(x=>x.c.embedded.max!=null);document.querySelector('#summary').innerHTML=`<div class="metric"><div class="label">有公告上限的平台</div><div class="value">${c.length}/${rows.length}</div></div><div class="metric"><div class="label">提醒</div><div class="value" style="font-size:18px">上限 ≠ 實際費率</div></div><div class="metric"><div class="label">用途</div><div class="value" style="font-size:18px">看透明度</div></div>`;
 }else{
  const lbl={total:'顯性總成本區間',buy:'申購費區間',sell:'賣出費區間',hold:'持有費區間'}[MODE];
  document.querySelector('#costHead').innerHTML=`<tr><th>平台</th><th>類型</th><th>${lbl}</th><th>費用規則</th><th>資料狀態</th></tr>`;
  const rule=x=>MODE==='buy'?x.buy_fee_text:MODE==='sell'?x.sell_fee_text:MODE==='hold'?x.custody_fee_text:`申購：${x.buy_fee_text}；持有：${x.custody_fee_text}；賣出：${x.sell_fee_text}`;
  document.querySelector('#costBody').innerHTML=rows.map(x=>{let m=x.c[MODE];return `<tr><td><strong>${x.name}</strong></td><td>${x.type}</td><td>${m.known?`${money(m.low)} – ${money(m.high)}`:'待確認'}</td><td>${rule(x)||'—'}</td><td>${x.status||'—'}</td></tr>`}).join('');
  const c=rows.filter(x=>x.c[MODE].known),best=c[0];document.querySelector('#summary').innerHTML=`<div class="metric"><div class="label">可量化平台</div><div class="value">${c.length}/${rows.length}</div></div><div class="metric"><div class="label">目前最低</div><div class="value">${best?best.name:'—'}</div></div><div class="metric"><div class="label">最低成本區間</div><div class="value">${best?`${money(best.c[MODE].low)} – ${money(best.c[MODE].high)}`:'—'}</div></div>`;
 }
}
document.addEventListener('click',e=>{if(e.target.matches('.tab')){MODE=e.target.dataset.mode;render()}if(e.target.id==='recalc')render()});
document.addEventListener('input',e=>{if(['principal','years','filter','sortMode'].includes(e.target.id)&&DATA)render()});
document.addEventListener('change',e=>{if(['exitMode','sortMode'].includes(e.target.id)&&DATA)render()});
load();