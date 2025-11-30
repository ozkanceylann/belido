// Basit SPA: sekmeler, formlar ve Supabase CRUD
const { createClient } = supabase;
const supa = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);


// Sekmeler
const tabButtons = document.querySelectorAll('.tab-btn');
const tabs = document.querySelectorAll('.tab');


tabButtons.forEach(btn => {
btn.addEventListener('click', () => {
tabButtons.forEach(b => b.classList.remove('active'));
btn.classList.add('active');
const tabId = btn.dataset.tab;
tabs.forEach(t => t.style.display = (t.id === tabId ? 'block' : 'none'));
});
});


// Dropdown doldurucular
async function loadSuppliers() {
const { data, error } = await supa.from('suppliers').select('*').order('name');
if (error) return console.error(error);
const sel = document.getElementById('supplierSelect');
sel.innerHTML = (data || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
renderSupplierTable(data || []);
}


async function loadTanks() {
const { data, error } = await supa.from('v_tank_status').select('*');
if (error) return console.error(error);
const t1 = document.getElementById('tankSelect1');
const t2 = document.getElementById('tankSelect2');
const options = (data || []).map(t => `<option value="${t.tank_id}">${t.tank_name}</option>`).join('');
t1.innerHTML = options; t2.innerHTML = options;
renderTankTable(data || []);
}


// Tabloları çiz
function renderSupplierTable(rows){
const tb = document.querySelector('#supplierTable tbody');
tb.innerHTML = rows.map(r => `<tr><td>${r.name||''}</td><td>${r.address||''}</td><td>${r.phone||''}</td></tr>`).join('');
}


function renderTankTable(rows){
const tb = document.querySelector('#tankTable tbody');
tb.innerHTML = rows.map(r => `
<tr>
<td>${r.tank_name}</td>
<td>${Number(r.capacity_kg||0).toLocaleString('tr-TR')}</td>
<td>${Number(r.current_kg||0).toLocaleString('tr-TR')}</td>
<td>${Number(r.fill_percent||0)}%</td>
<td>${Number(r.weighted_acid||0).toFixed(4)}</td>
</tr>
`).join('');
}


function renderEntryTable(rows){
const tb = document.querySelector('#entryTable tbody');
tb.innerHTML = rows.map(r => `
<tr>
<td>${r.date}</td>
<td>${r.fis_no||''}</td>
<td>${r.supplier_name||''}</td>
<td>${r.tank_name||''}</td>
<td>${Number(r.kg||0).toLocaleString('tr-TR')}</td>
<td>${Number(r.acid||0).toFixed(4)}</td>
refreshAll();
