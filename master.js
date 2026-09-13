let DATA=null;
async function load(){DATA=await fetch('./data/fees.json').then(r=>r.json());render()}
function render(){
 const q=(document.querySelector('#filter')?.value||'').toLowerCase();
 document.querySelector('#masterBody').innerHTML=DATA.platforms.filter(p=>p.name.toLowerCase().includes(q)).map(p=>`<tr>
 <td><strong>${p.name}</strong></td><td>${p.type}</td><td>${p.buy_fee_text||'—'}</td><td>${p.sell_fee_text||'—'}</td>
 <td>${p.custody_fee_text||'—'}</td><td>${p.embedded_fee_text||'—'}</td><td>${p.embedded_in_price||'—'}</td>
 <td>${p.online_trading||'—'}</td><td>${p.minimum||'—'}</td><td>${p.calculable||'—'}</td>
 <td>${p.transparency||'—'}</td><td>${p.status||'—'}</td><td>${p.data_date||'—'}</td>
 <td><a href="${p.source}" target="_blank" rel="noopener">官方頁 ↗</a></td><td>${p.notes||'—'}</td></tr>`).join('');
}
document.addEventListener('input',e=>{if(e.target.id==='filter'&&DATA)render()});load();