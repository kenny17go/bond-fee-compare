let DATA=null,STATUS=null;
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);

async function load(){
  DATA=await fetch('./data/fees.json').then(r=>r.json());
  try{STATUS=await fetch('./data/source_status.json?'+Date.now()).then(r=>r.json())}catch(e){}
  document.querySelector('#asof').textContent=`資料日期：${DATA.as_of}`;
  document.querySelector('#sourceCheck').textContent=STATUS?.checked_at?`來源檢查：${new Date(STATUS.checked_at).toLocaleString('zh-TW')}`:'來源檢查：尚未執行';
  render();
}
function calc(p){
  const P=+document.querySelector('#principal').value||0;
  const y=Math.max(0,+document.querySelector('#years').value||0);
  const sell=document.querySelector('#exitMode').value==='sell';
  const n=p.numeric||{}, cap=(n.annual_cap_years==null||n.annual_cap_years>50)?y:Math.min(y,n.annual_cap_years);
  let mgmtL=0,mgmtH=0,mgmtKnown=(n.annual_low!=null||n.annual_high!=null);
  if(p.name==='DBS 星展銀行'){mgmtKnown=true;mgmtL=0;mgmtH=P*Math.min(Math.max(y-1,0)*0.002,0.006)}
  else if(p.name==='國泰世華'){mgmtKnown=true;mgmtL=mgmtH=P*(Math.min(y,1)*0.001+Math.max(y-1,0)*0.002)}
  else{mgmtL=(n.annual_low==null)?0:P*cap*n.annual_low;mgmtH=(n.annual_high==null)?0:P*cap*n.annual_high}
  const buyKnown=(n.buy_low!=null||n.buy_high!=null), sellKnown=(n.sell_low!=null||n.sell_high!=null);
  const buyL=(n.buy_low==null)?0:P*n.buy_low,buyH=(n.buy_high==null)?0:P*n.buy_high;
  const sellL=(n.sell_low==null)?0:P*n.sell_low,sellH=(n.sell_high==null)?0:P*n.sell_high;
  const known=buyKnown||mgmtKnown||(sell&&sellKnown);
  const low=buyL+mgmtL+(sell?sellL:0),high=buyH+mgmtH+(sell?sellH:0);
  let embedded='—', embeddedMax=null;
  if(['富邦證券','國泰證券','凱基證券'].includes(p.name)){embedded='每筆 ≤5%';embeddedMax=P*.05*(1+(sell?1:0))}
  else if(p.name==='中國信託'){embedded='0.5%–4%（多數內含）';embeddedMax=P*.04}
  else if((p.embedded_fee_text||'').includes('0.5%')){embedded='年化 ≤0.5%';embeddedMax=P*.005*y}
  return {low,high,known,embedded,embeddedMax};
}
function render(){
  const q=(document.querySelector('#filter')?.value||'').trim().toLowerCase();
  let rows=DATA.platforms.map(p=>({...p,c:calc(p)})).filter(x=>x.name.toLowerCase().includes(q));
  rows.sort((a,b)=>(a.c.known?a.c.high:9e18)-(b.c.known?b.c.high:9e18));
  document.querySelector('#costBody').innerHTML=rows.map(x=>`<tr>
    <td><strong>${x.name}</strong>${STATUS?.sources?.[x.name]?.changed?'<span class="sourceflag changed">來源有變動</span>':''}</td>
    <td>${x.type}</td>
    <td>${x.c.known?`${money(x.c.low)} – ${money(x.c.high)}`:'待確認'}</td>
    <td>${x.c.embedded}${x.c.embeddedMax!=null?` · 最高 ${money(x.c.embeddedMax)}`:''}</td>
    <td>${x.online_trading||'—'}</td><td>${x.minimum||'—'}</td><td>${x.status||'—'}</td></tr>`).join('');
  const calculable=rows.filter(x=>x.c.known),best=calculable[0];
  document.querySelector('#summary').innerHTML=`
    <div class="metric"><div class="label">可量化平台</div><div class="value">${calculable.length} / ${rows.length}</div></div>
    <div class="metric"><div class="label">目前最低顯性成本</div><div class="value">${best?best.name:'—'}</div></div>
    <div class="metric"><div class="label">最低顯性成本區間</div><div class="value">${best?money(best.c.high):'—'}</div></div>`;
  document.querySelector('#cards').innerHTML=DATA.platforms.filter(p=>p.name.toLowerCase().includes(q)).map(p=>`
    <article class="platform">
      <h3>${p.name}</h3>
      <div class="kv"><b>申購/買入</b><span>${p.buy_fee_text||'—'}</span></div>
      <div class="kv"><b>賣出/贖回</b><span>${p.sell_fee_text||'—'}</span></div>
      <div class="kv"><b>持有費</b><span>${p.custody_fee_text||'—'}</span></div>
      <div class="kv"><b>內含費用</b><span>${p.embedded_fee_text||'—'}</span></div>
      <div class="kv"><b>官方來源</b><span><a href="${p.source}" target="_blank" rel="noopener">開啟官方頁 ↗</a></span></div>
    </article>`).join('');
}
document.addEventListener('input',e=>{if(['principal','years','exitMode','filter'].includes(e.target.id)&&DATA)render()});
document.addEventListener('change',e=>{if(e.target.id==='exitMode'&&DATA)render()});
document.addEventListener('click',e=>{if(e.target.id==='recalc'&&DATA)render()});
load();