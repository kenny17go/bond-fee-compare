let DATA=null,STATUS=null;
const fmtDate=v=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'})};
async function load(){
 [DATA,STATUS]=await Promise.all([
  fetch('./data/fees.json').then(r=>r.json()),
  fetch('./data/source_status.json?'+Date.now()).then(r=>r.ok?r.json():null).catch(()=>null)
 ]);
 render();
}
function render(){
 const q=(document.querySelector('#filter')?.value||'').toLowerCase();
 document.querySelector('#masterBody').innerHTML=DATA.platforms.filter(p=>p.name.toLowerCase().includes(q)).map(p=>{
  const s=STATUS?.sources?.[p.name],checkDate=fmtDate(STATUS?.checked_at);
  let check='尚未檢查';
  if(STATUS?.checked_at){
   if(!s?.ok) check=`${checkDate} ⚠️ 檢查失敗`;
   else if(s.change_level==='fee'||s.fee_change_suspected) check=`${checkDate} 🔴 疑似收費異動`;
   else if(s.change_level==='general'||s.changed) check=`${checkDate} 🟡 一般變動`;
   else check=`${checkDate} ✅ 已檢查`;
  }
  if(s?.change_reason) check+=`<div class="check-reason">${s.change_reason}</div>`;
  return `<tr>
 <td><strong>${p.name}</strong></td><td>${p.type}</td><td>${p.buy_fee_text||'—'}</td><td>${p.sell_fee_text||'—'}</td>
 <td>${p.custody_fee_text||'—'}</td><td>${p.embedded_fee_text||'—'}</td><td>${p.embedded_in_price||'—'}</td>
 <td>${p.online_trading||'—'}</td><td>${p.minimum||'—'}</td><td>${p.calculable||'—'}</td>
 <td>${p.transparency||'—'}</td><td>${p.status||'—'}</td><td>${p.data_date||'—'}</td><td>${check}</td>
 <td><a href="${p.source}" target="_blank" rel="noopener">官方頁 ↗</a></td><td>${p.notes||'—'}</td></tr>`;
 }).join('');
}
document.addEventListener('input',e=>{if(e.target.id==='filter'&&DATA)render()});load();