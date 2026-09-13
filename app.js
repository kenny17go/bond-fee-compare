let DATA=null, STATUS=null, MODE='total';
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
const fmtRange=(l,h,known=true)=>known?`${money(l)} – ${money(h)}`:'待確認';

async function load(){
  DATA=await fetch('./data/fees.json').then(r=>r.json());
  try{ STATUS=await fetch('./data/source_status.json?'+Date.now()).then(r=>r.json()); }catch(e){}
  document.querySelector('#asof').textContent=`資料日期：${DATA.as_of}`;
  document.querySelector('#sourceCheck').textContent=STATUS?.checked_at?`來源檢查：${new Date(STATUS.checked_at).toLocaleString('zh-TW')}`:'來源檢查：尚未執行';
  render();
}

function components(p){
  const P=+document.querySelector('#principal').value||0;
  const y=Math.max(0,+document.querySelector('#years').value||0);
  const sell=document.querySelector('#exitMode').value==='sell';
  const n=p.numeric||{};
  const cap=(n.annual_cap_years==null||n.annual_cap_years>50)?y:Math.min(y,n.annual_cap_years);

  const buyKnown=n.buy_low!=null || n.buy_high!=null;
  const buyLow=(n.buy_low==null)?0:P*n.buy_low;
  const buyHigh=(n.buy_high==null)?0:P*n.buy_high;

  const sellKnown=n.sell_low!=null || n.sell_high!=null;
  const sellLow=(n.sell_low==null)?0:P*n.sell_low;
  const sellHigh=(n.sell_high==null)?0:P*n.sell_high;

  let holdLow=0, holdHigh=0, holdKnown=(n.annual_low!=null || n.annual_high!=null);
  if(p.name==='DBS 星展銀行'){
    holdKnown=true;
    holdLow=0;
    holdHigh=P*Math.min(Math.max(y-1,0)*0.002,0.006);
  }else if(p.name==='國泰世華'){
    holdKnown=true;
    holdLow=holdHigh=P*(Math.min(y,1)*0.001+Math.max(y-1,0)*0.002);
  }else{
    holdLow=(n.annual_low==null)?0:P*cap*n.annual_low;
    holdHigh=(n.annual_high==null)?0:P*cap*n.annual_high;
  }

  const totalKnown=buyKnown || holdKnown || (sell && sellKnown);
  const totalLow=buyLow+holdLow+(sell?sellLow:0);
  const totalHigh=buyHigh+holdHigh+(sell?sellHigh:0);

  let embeddedLabel='需看成交報價', embeddedMax=null, embeddedType='unknown';
  if(['富邦證券','國泰證券','凱基證券'].includes(p.name)){
    embeddedLabel='每筆 ≤5%（公告上限）';
    embeddedMax=P*0.05*(1+(sell?1:0));
    embeddedType='cap';
  }else if(p.name==='中國信託'){
    embeddedLabel='0.5%–4%（多數內含報價）';
    embeddedMax=P*0.04;
    embeddedType='cap';
  }else if((p.embedded_fee_text||'').includes('0.5%')){
    embeddedLabel='年化 ≤0.5%（公告上限）';
    embeddedMax=P*0.005*y;
    embeddedType='cap';
  }else if((p.embedded_fee_text||'').includes('0%')){
    embeddedLabel=p.embedded_fee_text;
    embeddedType='cap';
  }

  return {
    buy:{low:buyLow,high:buyHigh,known:buyKnown},
    sell:{low:sellLow,high:sellHigh,known:sellKnown},
    hold:{low:holdLow,high:holdHigh,known:holdKnown},
    total:{low:totalLow,high:totalHigh,known:totalKnown},
    embedded:{label:embeddedLabel,max:embeddedMax,type:embeddedType}
  };
}

function modeMeta(){
  const map={
    total:['總成本排行榜','依你的投資金額、持有年數與退出情境計算。'],
    buy:['申購費排行榜','只比較買進時可量化的顯性費用。'],
    sell:['賣出費排行榜','只比較提前賣出／贖回時的顯性費用；持有到期免收者會顯示 0。'],
    hold:['持有費排行榜','依目前輸入的持有年數計算信託管理費／保管費。'],
    embedded:['內含費用比較','比較公告上限與揭露方式；此頁不把上限視為實際固定費率。']
  };
  return map[MODE];
}

function rankedRows(){
  const q=(document.querySelector('#filter')?.value||'').trim().toLowerCase();
  const sort=document.querySelector('#sortMode')?.value||'low';
  let rows=DATA.platforms.map(p=>({...p,c:components(p)})).filter(x=>x.name.toLowerCase().includes(q));

  if(MODE==='embedded'){
    rows.sort((a,b)=>{
      if(sort==='name') return a.name.localeCompare(b.name,'zh-Hant');
      const av=a.c.embedded.max==null?(sort==='low'?9e18:-1):a.c.embedded.max;
      const bv=b.c.embedded.max==null?(sort==='low'?9e18:-1):b.c.embedded.max;
      return sort==='high'?bv-av:av-bv;
    });
  }else{
    rows.sort((a,b)=>{
      if(sort==='name') return a.name.localeCompare(b.name,'zh-Hant');
      const av=a.c[MODE].known?a.c[MODE].high:(sort==='low'?9e18:-1);
      const bv=b.c[MODE].known?b.c[MODE].high:(sort==='low'?9e18:-1);
      return sort==='high'?bv-av:av-bv;
    });
  }
  return rows;
}

function renderHead(){
  const head=document.querySelector('#costHead');
  if(MODE==='embedded'){
    head.innerHTML=`<tr>
      <th>平台</th><th>類型</th><th>內含費用揭露</th><th>依目前情境估算上限</th>
      <th>費用性質</th><th>資料透明度</th><th>官方來源</th>
    </tr>`;
  }else{
    const labels={total:'顯性總成本區間',buy:'申購費區間',sell:'賣出費區間',hold:'持有費區間'};
    head.innerHTML=`<tr>
      <th>平台</th><th>類型</th><th>${labels[MODE]}</th><th>費用規則</th>
      <th>線上交易</th><th>最低交易額</th><th>資料狀態</th>
    </tr>`;
  }
}

function ruleText(x){
  if(MODE==='buy') return x.buy_fee_text||'—';
  if(MODE==='sell') return x.sell_fee_text||'—';
  if(MODE==='hold') return x.custody_fee_text||'—';
  return `申購：${x.buy_fee_text||'—'}；持有：${x.custody_fee_text||'—'}；賣出：${x.sell_fee_text||'—'}`;
}

function render(){
  const [title,note]=modeMeta();
  document.querySelector('#rankingTitle').textContent=title;
  document.querySelector('#rankingNote').textContent=note;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===MODE));
  renderHead();

  const rows=rankedRows();
  const body=document.querySelector('#costBody');

  if(MODE==='embedded'){
    body.innerHTML=rows.map(x=>{
      const flag=STATUS?.sources?.[x.name]?.changed?'<span class="sourceflag changed">來源有變動</span>':'';
      const cls=x.c.embedded.type==='cap'?'pill cap':'pill unknown';
      return `<tr>
        <td><strong>${x.name}</strong>${flag}</td><td>${x.type}</td>
        <td>${x.c.embedded.label}</td>
        <td>${x.c.embedded.max==null?'無法由公開資料直接計算':money(x.c.embedded.max)}</td>
        <td><span class="${cls}">${x.c.embedded.type==='cap'?'公告上限 / 非實際固定費率':'需看成交報價'}</span></td>
        <td>${x.transparency||'—'}</td>
        <td><a href="${x.source}" target="_blank" rel="noopener">官方頁 ↗</a></td>
      </tr>`;
    }).join('');
  }else{
    body.innerHTML=rows.map(x=>{
      const flag=STATUS?.sources?.[x.name]?.changed?'<span class="sourceflag changed">來源有變動</span>':'';
      const m=x.c[MODE];
      return `<tr>
        <td><strong>${x.name}</strong>${flag}</td><td>${x.type}</td>
        <td>${fmtRange(m.low,m.high,m.known)}</td>
        <td>${ruleText(x)}</td>
        <td>${x.online_trading||'—'}</td><td>${x.minimum||'—'}</td>
        <td>${x.status||'—'}</td>
      </tr>`;
    }).join('');
  }

  let calculable, best;
  if(MODE==='embedded'){
    calculable=rows.filter(x=>x.c.embedded.max!=null);
    best=calculable[0];
    document.querySelector('#summary').innerHTML=`
      <div class="metric"><div class="label">有公告上限的平台</div><div class="value">${calculable.length} / ${rows.length}</div></div>
      <div class="metric"><div class="label">最低公告上限</div><div class="value">${best?best.name:'—'}</div></div>
      <div class="metric"><div class="label">提醒</div><div class="value" style="font-size:18px">上限 ≠ 實際費率</div></div>`;
  }else{
    calculable=rows.filter(x=>x.c[MODE].known);
    best=calculable[0];
    const label={total:'最低顯性總成本',buy:'最低申購費',sell:'最低賣出費',hold:'最低持有費'}[MODE];
    document.querySelector('#summary').innerHTML=`
      <div class="metric"><div class="label">可量化平台</div><div class="value">${calculable.length} / ${rows.length}</div></div>
      <div class="metric"><div class="label">${label}</div><div class="value">${best?best.name:'—'}</div></div>
      <div class="metric"><div class="label">最低成本區間</div><div class="value">${best?fmtRange(best.c[MODE].low,best.c[MODE].high,true):'—'}</div></div>`;
  }

  renderCards();
}

function renderCards(){
  const q=(document.querySelector('#filter')?.value||'').trim().toLowerCase();
  const P=+document.querySelector('#principal').value||0;
  const all=DATA.platforms.filter(p=>p.name.toLowerCase().includes(q)).map(p=>({...p,c:components(p)}));
  const maxVal=Math.max(1,...all.flatMap(x=>[
    x.c.buy.high||0,x.c.sell.high||0,x.c.hold.high||0,
    x.c.embedded.max||0
  ]));
  document.querySelector('#cards').innerHTML=all.map(x=>{
    const st=STATUS?.sources?.[x.name];
    const badge=st?.changed?'<span class="sourceflag changed">官方頁內容有變動</span>':(st?.ok?'<span class="sourceflag">來源正常</span>':'');
    const rows=[
      ['申購',x.c.buy.high,x.c.buy.known?'fixed':'unknown',x.c.buy.known?money(x.c.buy.high):'待確認'],
      ['賣出',x.c.sell.high,x.c.sell.known?'fixed':'unknown',x.c.sell.known?money(x.c.sell.high):'待確認'],
      ['持有',x.c.hold.high,x.c.hold.known?'fixed':'unknown',x.c.hold.known?money(x.c.hold.high):'待確認'],
      ['內含',x.c.embedded.max,x.c.embedded.type,x.c.embedded.max!=null?`≤ ${money(x.c.embedded.max)}`:'需看報價']
    ];
    return `<article class="platform">
      <h3>${x.name} ${badge}</h3>
      <div class="cost-bars">
        ${rows.map(r=>`<div class="bar-row">
          <span>${r[0]}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${r[1]==null?0:Math.min(100,(r[1]/maxVal)*100)}%"></div></div>
          <span class="bar-value">${r[3]}</span>
        </div>`).join('')}
      </div>
      <div class="kv"><b>申購/買入</b><span>${x.buy_fee_text||'—'}</span></div>
      <div class="kv"><b>賣出/贖回</b><span>${x.sell_fee_text||'—'}</span></div>
      <div class="kv"><b>持有費</b><span>${x.custody_fee_text||'—'}</span></div>
      <div class="kv"><b>內含費用</b><span>${x.embedded_fee_text||'—'}</span></div>
      <div class="kv"><b>資料日期</b><span>${x.data_date||'—'}</span></div>
      <div class="kv"><b>官方來源</b><span><a href="${x.source}" target="_blank" rel="noopener">開啟官方頁 ↗</a></span></div>
      <div class="kv"><b>備註</b><span>${x.notes||'—'}</span></div>
    </article>`;
  }).join('');
}

document.addEventListener('click',e=>{
  if(e.target.matches('.tab')){ MODE=e.target.dataset.mode; render(); }
  if(e.target.id==='recalc'&&DATA) render();
});
document.addEventListener('input',e=>{
  if(['principal','years','exitMode','filter','sortMode'].includes(e.target.id)&&DATA) render();
});
document.addEventListener('change',e=>{
  if(['exitMode','sortMode'].includes(e.target.id)&&DATA) render();
});
load();
