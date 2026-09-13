let DATA=null, STATUS=null;
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n||0);
const pct=n=>`${(n*100).toFixed(2)}%`;

async function load(){
  DATA=await fetch('./data/fees.json').then(r=>r.json());
  try{ STATUS=await fetch('./data/source_status.json?'+Date.now()).then(r=>r.json()); }catch(e){}
  document.querySelector('#asof').textContent=`資料日期：${DATA.as_of}`;
  document.querySelector('#sourceCheck').textContent=STATUS?.checked_at?`來源檢查：${new Date(STATUS.checked_at).toLocaleString('zh-TW')}`:'來源檢查：尚未執行';
  render();
}
function calc(p){
  const P=+document.querySelector('#principal').value||0;
  const y=Math.max(0,+document.querySelector('#years').value||0);
  const sell=document.querySelector('#exitMode').value==='sell';
  const n=p.numeric||{};
  let buyL=n.buy_low, buyH=n.buy_high, sellL=n.sell_low, sellH=n.sell_high, aL=n.annual_low, aH=n.annual_high;
  const cap=(n.annual_cap_years==null||n.annual_cap_years>50)?y:Math.min(y,n.annual_cap_years);

  let mgmtL=0, mgmtH=0;
  if(p.name==='DBS 星展銀行'){
    mgmtL=0; mgmtH=P*Math.min(Math.max(y-1,0)*0.002,0.006);
  }else if(p.name==='國泰世華'){
    mgmtL=mgmtH=P*(Math.min(y,1)*0.001+Math.max(y-1,0)*0.002);
  }else{
    mgmtL=(aL==null)?null:P*cap*aL;
    mgmtH=(aH==null)?null:P*cap*aH;
  }

  const explicitKnown=[buyL,buyH,mgmtL,mgmtH].some(v=>v!==null && v!==undefined);
  const low=(buyL==null?0:P*buyL)+(mgmtL||0)+(sell&&sellL!=null?P*sellL:0);
  const high=(buyH==null?0:P*buyH)+(mgmtH||0)+(sell&&sellH!=null?P*sellH:0);

  let embedded='—', embeddedMax=null;
  if(['富邦證券','國泰證券','凱基證券'].includes(p.name)){
    embedded='每筆 ≤5%'; embeddedMax=P*0.05*(1+(sell?1:0));
  }else if(p.name==='中國信託'){
    embedded='0.5%–4%（多數內含）'; embeddedMax=P*0.04;
  }else if((p.embedded_fee_text||'').includes('0.5%')){
    embedded='年化 ≤0.5%'; embeddedMax=P*0.005*y;
  }
  return {low,high,explicitKnown,embedded,embeddedMax};
}
function render(){
  const q=(document.querySelector('#filter')?.value||'').trim().toLowerCase();
  let rows=DATA.platforms.map(p=>({...p,c:calc(p)})).filter(x=>x.name.toLowerCase().includes(q));
  rows.sort((a,b)=>(a.c.high||9e15)-(b.c.high||9e15));
  const body=document.querySelector('#costBody');
  body.innerHTML=rows.map(x=>{
    const flag=STATUS?.sources?.[x.name]?.changed?'<span class="sourceflag changed">來源有變動</span>':'';
    return `<tr>
      <td><strong>${x.name}</strong>${flag}</td><td>${x.type}</td>
      <td>${x.c.explicitKnown?`${money(x.c.low)} – ${money(x.c.high)}`:'待確認'}</td>
      <td>${x.c.embedded}${x.c.embeddedMax!=null?` · 最高 ${money(x.c.embeddedMax)}`:''}</td>
      <td>${x.online_trading||'—'}</td><td>${x.minimum||'—'}</td>
      <td>${x.status||'—'}</td>
    </tr>`;
  }).join('');

  const calculable=rows.filter(x=>x.c.explicitKnown);
  const best=calculable[0];
  document.querySelector('#summary').innerHTML=`
    <div class="metric"><div class="label">可量化平台</div><div class="value">${calculable.length} / ${rows.length}</div></div>
    <div class="metric"><div class="label">目前最低顯性成本（依輸入情境）</div><div class="value">${best?best.name:'—'}</div></div>
    <div class="metric"><div class="label">最低顯性成本區間</div><div class="value">${best?money(best.c.high):'—'}</div></div>`;

  document.querySelector('#cards').innerHTML=DATA.platforms.filter(p=>p.name.toLowerCase().includes(q)).map(p=>{
    const st=STATUS?.sources?.[p.name];
    const badge=st?.changed?'<span class="sourceflag changed">官方頁內容有變動</span>':(st?.ok?'<span class="sourceflag">來源正常</span>':'');
    return `<article class="platform">
      <h3>${p.name} ${badge}</h3>
      <div class="kv"><b>申購/買入</b><span>${p.buy_fee_text||'—'}</span></div>
      <div class="kv"><b>賣出/贖回</b><span>${p.sell_fee_text||'—'}</span></div>
      <div class="kv"><b>持有費</b><span>${p.custody_fee_text||'—'}</span></div>
      <div class="kv"><b>內含費用</b><span>${p.embedded_fee_text||'—'}</span></div>
      <div class="kv"><b>資料日期</b><span>${p.data_date||'—'}</span></div>
      <div class="kv"><b>官方來源</b><span><a href="${p.source}" target="_blank" rel="noopener">開啟官方頁 ↗</a></span></div>
      <div class="kv"><b>備註</b><span>${p.notes||'—'}</span></div>
    </article>`;
  }).join('');
}
['principal','years','exitMode'].forEach(id=>document.addEventListener('input',e=>{if(e.target.id===id&&DATA)render()}));
document.addEventListener('click',e=>{if(e.target.id==='recalc'&&DATA)render()});
document.addEventListener('input',e=>{if(e.target.id==='filter'&&DATA)render()});
load();