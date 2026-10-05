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
  const check=s?.ok?(s.changed?`${checkDate} ⚠️ 來源有變動`:`${checkDate} ✅`):STATUS?.checked_at?`${checkDate} ⚠️ 檢查失敗`:'尚未檢查';
  return `<tr>
 <td><strong>${p.name}</strong></td><td>${p.type}</td><td>${p.buy_fee_text||'—'}</td><td>${p.sell_fee_text||'—'}</td>
 <td>${p.custody_fee_text||'—'}</td><td>${p.embedded_fee_text||'—'}</td><td>${p.embedded_in_price||'—'}</td>
 <td>${p.online_trading||'—'}</td><td>${p.minimum||'—'}</td><td>${p.calculable||'—'}</td>
 <td>${p.transparency||'—'}</td><td>${p.status||'—'}</td><td>${p.data_date||'—'}</td><td>${check}</td>
 <td><a href="${p.source}" target="_blank" rel="noopener">官方頁 ↗</a></td><td>${p.notes||'—'}</td></tr>`;
 }).join('');
}
document.addEventListener('input',e=>{if(e.target.id==='filter'&&DATA)render()});load();