/* ============================
   app.js  (FINAL)
============================= */
const SUPABASE_URL = "https://dnicipqyxoadjcizpvxy.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuaWNpcHF5eG9hZGpjaXpwdnh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTcwNzcsImV4cCI6MjA3ODM5MzA3N30._Roo83R-khWLoiEadVoRMmAnGR1AD4Z_0_5OwbemCwk";
const { createClient } = supabase;
const supa = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ============ AUTH ============ */
async function checkAuth() {
  const { data } = await supa.auth.getSession();
  if (!data.session) {
    if (!location.pathname.includes("login.html")) window.location.href = "login.html";
    return;
  }
  const emailSpan = document.getElementById("userEmail");
  if (emailSpan) emailSpan.textContent = data.session.user.email;
  if (location.pathname.includes("login.html")) window.location.href = "index.html";
  loadUserRole(data.session.user.id);
}
async function loadUserRole(uid) {
  const { data } = await supa.from("users").select("role").eq("id", uid).single();
  const role = data?.role || "user";
  const span = document.getElementById("currentRole");
  if (span) span.textContent = "role: " + role;
  document.querySelectorAll(".admin-only").forEach(el => el.style.display = (role === "admin" ? "block" : "none"));
}
checkAuth();

/* ============ LOGOUT ============ */
document.getElementById("btnLogout")?.addEventListener("click", async () => {
  await supa.auth.signOut();
  window.location.href = "login.html";
});

/* ============ TABS + PERSIST ============ */
let activeTab = localStorage.getItem("activeTab") || "dashboard";
function activateTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.style.display = "none");
  document.getElementById(id).style.display = "block";
  document.querySelectorAll(".sb-link").forEach(b => b.classList.remove("active"));
  document.querySelector(`.sb-link[data-tab="${id}"]`)?.classList.add("active");
  localStorage.setItem("activeTab", id);
}
document.querySelectorAll(".sb-link").forEach(btn => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));
document.getElementById("menuToggle")?.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));

/* ============ MODALS ============ */
let editingType = null, editingId = null, editingTankId = null;
function openEdit(){ document.getElementById("editModal").style.display="flex"; }
function closeEdit(){ document.getElementById("editModal").style.display="none"; }
let confirmCallback = null;
function openConfirm(text, cb){ document.getElementById("confirmText").textContent=text; confirmCallback=cb; document.getElementById("confirmModal").style.display="flex"; }
function closeConfirm(){ document.getElementById("confirmModal").style.display="none"; confirmCallback=null; }
document.getElementById("confirmYes")?.addEventListener("click", () => { if (confirmCallback) confirmCallback(); closeConfirm(); });

/* ============ DROPDOWNS ============ */
async function loadSuppliers() {
  const { data } = await supa.from("suppliers").select("*").eq("is_active", true).order("name");
  const sel = document.getElementById("supplierSelect");
  if (sel) sel.innerHTML = (data||[]).map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  renderSupplierTable(data||[]);
}
async function loadTanks() {
  const { data } = await supa.from("v_tank_status").select("*");
  const tankSel1 = document.getElementById("tankSelect1");
  const tankSel2 = document.getElementById("tankSelect2");
  if (tankSel1) tankSel1.innerHTML = (data||[]).map(t => `<option value="${t.tank_id}">${t.tank_name}</option>`).join("");
  if (tankSel2) tankSel2.innerHTML = tankSel1?.innerHTML || "";
  renderTankTable(data||[]);
  buildTankQuality3D(); // 3D viz
}

/* ============ RENDER TABLES ============ */
function renderEntryTable(rows) {
  const tb = document.querySelector("#entryTable tbody");
  if (!tb) return;
  tb.innerHTML = rows.map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${r.fis_no || ""}</td>
      <td>${r.supplier_name || ""}</td>
      <td>${r.tank_name || ""}</td>
      <td>${r.kg}</td>
      <td>${Number(r.acid).toFixed(4)}</td>
      <td>
        <button onclick="editEntry(${r.id})" class="btn icon">✏</button>
        <button onclick="deleteEntry(${r.id})" class="btn danger icon">🗑</button>
      </td>
    </tr>
  `).join("");
}
function renderExitTable(rows) {
  const tb = document.querySelector("#exitTable tbody");
  if (!tb) return;
  tb.innerHTML = rows.map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${r.tank_name || ""}</td>
      <td>${r.kg}</td>
      <td>${r.description || ""}</td>
      <td>
        <button onclick="editExit(${r.id})" class="btn icon">✏</button>
        <button onclick="deleteExit(${r.id})" class="btn danger icon">🗑</button>
      </td>
    </tr>
  `).join("");
}
function renderTankTable(rows) {
  const tb = document.querySelector("#tankTable tbody");
  if (!tb) return;
  tb.innerHTML = rows.map(r => `
    <tr>
      <td>${r.tank_name}</td>
      <td>${r.capacity_kg}</td>
      <td>${r.current_kg}</td>
      <td>${r.fill_percent}%</td>
      <td>${Number(r.weighted_acid).toFixed(4)}</td>
      <td>${Number(r.weighted_k232).toFixed(4)}</td>
      <td>${Number(r.weighted_delta_k).toFixed(4)}</td>
      <td>
        <button onclick="editTank(${r.tank_id})" class="btn icon">✏</button>
        <button onclick="deleteTank(${r.tank_id})" class="btn danger icon">🗑</button>
      </td>
    </tr>
  `).join("");
}


// SIDEBAR dışına tıklayınca kapat
document.addEventListener("click", (e) => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("menuToggle");

  // Sidebar açıksa ve tıklanan yer sidebar değilse ve buton değilse
  if (document.body.classList.contains("sidebar-open")) {
    if (!sidebar.contains(e.target) && e.target !== toggleBtn) {
      document.body.classList.remove("sidebar-open");
    }
  }
});

function renderSupplierTable(rows) {
  const tb = document.querySelector("#supplierTable tbody");
  if (!tb) return;
  tb.innerHTML = (rows||[]).map(r => `
    <tr>
      <td>${r.name}</td>
      <td>${r.address || ""}</td>
      <td>${r.phone || ""}</td>
      <td>${r.note || ""}</td>
      <td>
        <button onclick="editSupplier(${r.id})" class="btn icon">✏</button>
        <button onclick="deleteSupplier(${r.id})" class="btn danger icon">🗑</button>
      </td>
    </tr>
  `).join("");
}

/* ============ FULL TABLES (Forms altı) ============ */
function renderEntryTableFull(rows) {
  const tb = document.querySelector("#entryTableFull tbody");
  if (!tb) return;
  tb.innerHTML = rows.map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${r.fis_no || ""}</td>
      <td>${r.suppliers?.name || ""}</td>
      <td>${r.tanks?.tank_name || ""}</td>
      <td>${r.kg}</td>
      <td>${Number(r.acid).toFixed(4)}</td>
      <td>${r.price ?? ""}</td>
      <td>
        <button onclick="editEntry(${r.id})" class="btn icon">✏</button>
        <button onclick="deleteEntry(${r.id})" class="btn danger icon">🗑</button>
      </td>
    </tr>
  `).join("");
}
function renderExitTableFull(rows) {
  const tb = document.querySelector("#exitTableFull tbody");
  if (!tb) return;
  tb.innerHTML = rows.map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${r.tanks?.tank_name || ""}</td>
      <td>${r.kg}</td>
      <td>${r.price ?? ""}</td>
      <td>${r.komisyon ?? ""}</td>
      <td>${r.invoice_no ?? ""}</td>
      <td>${r.description || ""}</td>
      <td>
        <button onclick="editExit(${r.id})" class="btn icon">✏</button>
        <button onclick="deleteExit(${r.id})" class="btn danger icon">🗑</button>
      </td>
    </tr>
  `).join("");
}

/* ============ SON LİSTELER ============ */
async function refreshRecentLists() {
  const { data: entries } = await supa
    .from("oil_entries")
    .select("id, date, fis_no, kg, acid, suppliers:supplier_id(name), tanks:tank_id(tank_name)")
    .order("id", { ascending: false })
    .limit(10);
  renderEntryTable((entries||[]).map(r => ({
    id:r.id, date:r.date, fis_no:r.fis_no, kg:r.kg, acid:r.acid,
    supplier_name:r.suppliers?.name, tank_name:r.tanks?.tank_name
  })));

  const { data: exits } = await supa
    .from("oil_exits")
    .select("id, date, kg, description, tanks:tank_id(tank_name)")
    .order("id", { ascending: false })
    .limit(10);
  renderExitTable((exits||[]).map(r => ({
    id:r.id, date:r.date, kg:r.kg, description:r.description, tank_name:r.tanks?.tank_name
  })));
}
async function refreshFullTables() {
  const { data: entries } = await supa
    .from("oil_entries")
    .select("*, suppliers:supplier_id(name), tanks:tank_id(tank_name)")
    .order("date", { ascending: false });
  renderEntryTableFull(entries||[]);

  const { data: exits } = await supa
    .from("oil_exits")
    .select("*, tanks:tank_id(tank_name)")
    .order("date", { ascending: false });
  renderExitTableFull(exits||[]);
}

/* ============ FORMS (INSERT) ============ */
document.getElementById("entryForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());
  payload.kg = Number(payload.kg);
  payload.acid = Number(payload.acid);
  payload.k232 = Number(payload.k232 || 0);
  payload.delta_k = Number(payload.delta_k || 0);
  payload.price = Number(payload.price || 0);
  payload.komisyon = Number(payload.komisyon || 0);
  const { error } = await supa.from("oil_entries").insert(payload);
  document.getElementById("entryMsg").textContent = error ? "Hata: " + error.message : "Kayıt eklendi";
  if (!error) e.target.reset();
  refreshAll();
});
document.getElementById("exitForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());
  payload.kg = Number(payload.kg);
  payload.price = Number(payload.price || 0);
  payload.komisyon = Number(payload.komisyon || 0);
  payload.invoice_no = payload.invoice_no || null;
  const { error } = await supa.from("oil_exits").insert(payload);
  document.getElementById("exitMsg").textContent = error ? "Hata: " + error.message : "Kayıt eklendi";
  if (!error) e.target.reset();
  refreshAll();
});
document.getElementById("tankForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());
  payload.capacity_kg = Number(payload.capacity_kg);
  const { error } = await supa.from("tanks").insert(payload);
  document.getElementById("tankMsg").textContent = error ? "Hata: " + error.message : "Tank eklendi";
  if (!error) e.target.reset();
  refreshAll();
});
document.getElementById("supplierForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());
  const { error } = await supa.from("suppliers").insert(payload);
  document.getElementById("supplierMsg").textContent = error ? "Hata: " + error.message : "Tedarikçi eklendi";
  if (!error) e.target.reset();
  refreshAll();
});

/* ============ EDIT (ENTRY / EXIT) ============ */
async function editEntry(id) {
  editingType = "entry"; editingId = id;
  const { data } = await supa.from("oil_entries").select("*").eq("id", id).single();
  editingTankId = data?.tank_id ?? null;
  document.getElementById("editForm").innerHTML = `
    <label>Tarih<input type="date" id="e_date" value="${data.date}"></label>
    <label>Fiş<input type="text" id="e_fis" value="${data.fis_no || ""}"></label>
    <label>KG<input type="number" id="e_kg" value="${data.kg}"></label>
    <label>Asit<input type="number" step="0.0001" id="e_acid" value="${data.acid}"></label>
    <label>K232<input type="number" step="0.0001" id="e_k232" value="${data.k232 || 0}"></label>
    <label>ΔK<input type="number" step="0.0001" id="e_delta" value="${data.delta_k || 0}"></label>
    <label>Fiyat<input type="number" step="0.01" id="e_price" value="${data.price || 0}"></label>
    <label>Komisyon<input type="number" step="0.01" id="e_kom" value="${data.komisyon || 0}"></label>
  `;
  openEdit();
}
async function editExit(id) {
  editingType = "exit"; editingId = id;
  const { data } = await supa.from("oil_exits").select("*").eq("id", id).single();
  editingTankId = data?.tank_id ?? null;
  document.getElementById("editForm").innerHTML = `
    <label>Tarih<input type="date" id="e_date" value="${data.date}"></label>
    <label>KG<input type="number" id="e_kg" value="${data.kg}"></label>
    <label>Fiyat<input type="number" step="0.01" id="e_price" value="${data.price || 0}"></label>
    <label>Komisyon<input type="number" step="0.01" id="e_kom" value="${data.komisyon || 0}"></label>
    <label>Fatura No<input type="text" id="e_inv" value="${data.invoice_no || ""}"></label>
    <label>Açıklama<input type="text" id="e_desc" value="${data.description || ""}"></label>
  `;
  openEdit();
}
async function saveEdit() {
  if (editingType === "entry") {
    await supa.from("oil_entries").update({
      date: document.getElementById("e_date").value,
      fis_no: document.getElementById("e_fis").value,
      kg: Number(document.getElementById("e_kg").value),
      acid: Number(document.getElementById("e_acid").value),
      k232: Number(document.getElementById("e_k232").value),
      delta_k: Number(document.getElementById("e_delta").value),
      price: Number(document.getElementById("e_price").value),
      komisyon: Number(document.getElementById("e_kom").value)
    }).eq("id", editingId);
  } else if (editingType === "exit") {
    await supa.from("oil_exits").update({
      date: document.getElementById("e_date").value,
      kg: Number(document.getElementById("e_kg").value),
      price: Number(document.getElementById("e_price").value),
      komisyon: Number(document.getElementById("e_kom").value),
      invoice_no: document.getElementById("e_inv").value || null,
      description: document.getElementById("e_desc").value
    }).eq("id", editingId);
  }
  if (editingTankId) { await supa.rpc("fn_recalc_tank", { tank_id_input: editingTankId }); }
  closeEdit();
  refreshAll();
}

/* ============ DELETE (Soft/Hard) ============ */
function deleteEntry(id){ openConfirm("Bu giriş kaydı silinsin mi?", async ()=>{ await supa.from("oil_entries").delete().eq("id", id); refreshAll(); }); }
function deleteExit(id){ openConfirm("Bu çıkış kaydı silinsin mi?", async ()=>{ await supa.from("oil_exits").delete().eq("id", id); refreshAll(); }); }
function deleteTank(id){ openConfirm("Bu tank (soft delete) kaldırılsın mı?", async ()=>{ await supa.from("tanks").update({is_active:false}).eq("id", id); refreshAll(); }); }
function deleteSupplier(id){ openConfirm("Bu tedarikçi (soft delete) kaldırılsın mı?", async ()=>{ await supa.from("suppliers").update({is_active:false}).eq("id", id); refreshAll(); }); }

/* ============ RAPORLAR + EXCEL ============ */
document.getElementById("btnRunReport")?.addEventListener("click", runReport);
document.getElementById("btnExcel")?.addEventListener("click", () => {
  const rows = [...document.querySelectorAll("#reportTable tr")];
  const csv = rows.map(r => [...r.children].map(td => (td.innerText||"").replaceAll(",", " ")).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = "belido_rapor.csv"; a.click();
});
async function runReport() {
  const { data } = await supa.from("v_cost_analysis").select("*");
  const tb = document.querySelector("#reportTable tbody"); if (!tb) return;
  tb.innerHTML = (data||[]).map(r => `
    <tr>
      <td>${r.tank_name}</td>
      <td>${r.entry_total_kg || 0}</td>
      <td>${r.exit_total_kg || 0}</td>
      <td>${r.net_kg || 0}</td>
      <td>${Number(r.weighted_acid || 0).toFixed(4)}</td>
      <td>${Number(r.weighted_k232 || 0).toFixed(4)}</td>
      <td>${Number(r.weighted_delta_k || 0).toFixed(4)}</td>
      <td>${Number(r.entry_avg_price || 0).toFixed(2)}</td>
      <td>${Number(r.exit_avg_price || 0).toFixed(2)}</td>
      <td>${Number(r.estimated_profit_per_kg || 0).toFixed(2)}</td>
    </tr>
  `).join("");
}

/* ============ DASHBOARD STATS ============ */
async function loadDashboardStats() {
  const { data: tanks } = await supa.from("v_tank_status").select("*");
  const total = (tanks||[]).reduce((a,b)=>a+(b.current_kg||0),0);
  const tEl = document.getElementById("statTotalStock"); if (tEl) tEl.textContent = total.toFixed(1);

  const today = new Date().toISOString().slice(0,10);
  const { data: inToday } = await supa.from("oil_entries").select("kg").eq("date", today);
  const { data: outToday } = await supa.from("oil_exits").select("kg").eq("date", today);
  document.getElementById("statTodayIn").textContent = (inToday||[]).reduce((a,b)=>a+(b.kg||0),0);
  document.getElementById("statTodayOut").textContent = (outToday||[]).reduce((a,b)=>a+(b.kg||0),0);

  const acids = (tanks||[]).filter(t=>t.weighted_acid>0).map(t=>t.weighted_acid);
  const k232  = (tanks||[]).filter(t=>t.weighted_k232>0).map(t=>t.weighted_k232);
  const delta = (tanks||[]).filter(t=>t.weighted_delta_k>0).map(t=>t.weighted_delta_k);
  document.getElementById("statAvgAcid").textContent  = ((acids.reduce((a,b)=>a+b,0)/(acids.length||1))||0).toFixed(4);
  document.getElementById("statAvgK232").textContent  = ((k232.reduce((a,b)=>a+b,0)/(k232.length||1))||0).toFixed(4);
  document.getElementById("statAvgDeltaK").textContent= ((delta.reduce((a,b)=>a+b,0)/(delta.length||1))||0).toFixed(4);
}

/* ============ 3D KALİTE BAZLI TANK VİZ ============ */
/* Mantık:
   1) oil_entries -> tank_id + kalite bazında kg topla
   2) oil_exits -> tank_id bazında toplam çıkış
   3) Çıkışı giriş dağılımına orantılı paylaştır (negatif olmasın)
   4) v_tank_status ile capacity ve current_kg al
   5) CSS 3D silindir içinde stack olarak çiz
*/
const QUALITY_KEYS = ["EXTRA V.", "NATURAL 1.", "HAM"];
const Q_COLOR_CLASS = {
  "EXTRA V.": "seg-extra",
  "NATURAL 1.": "seg-natural",
  "HAM": "seg-ham"
};
async function buildTankQuality3D() {
  const viz = document.getElementById("tankViz");
  if (!viz) return;
  const [{ data: entries }, { data: exits }, { data: status }] = await Promise.all([
    supa.from("oil_entries").select("tank_id, kg, kalite"),
    supa.from("oil_exits").select("tank_id, kg"),
    supa.from("v_tank_status").select("*")
  ]);

  // Mapler
  const tankMap = {};
  (status||[]).forEach(t => tankMap[t.tank_id] = t);

  // 1) girişleri kalite bazında grupla
  const inByTank = {};
  (entries||[]).forEach(e => {
    if (!inByTank[e.tank_id]) inByTank[e.tank_id] = { total:0, byQ:{ "EXTRA V.":0, "NATURAL 1.":0, "HAM":0 } };
    inByTank[e.tank_id].total += Number(e.kg) || 0;
    if (QUALITY_KEYS.includes(e.kalite)) inByTank[e.tank_id].byQ[e.kalite] += Number(e.kg) || 0;
  });

  // 2) çıkışları tank bazında grupla
  const outByTank = {};
  (exits||[]).forEach(x => {
    outByTank[x.tank_id] = (outByTank[x.tank_id] || 0) + (Number(x.kg) || 0);
  });

  // 3) çıkışı kalite paylarına dağıt
  const currentByTankQ = {};
  Object.keys(inByTank).forEach(tid => {
    const totalIn = inByTank[tid].total;
    const totalOut = outByTank[tid] || 0;
    const byQ = { ...inByTank[tid].byQ };
    let remaining = totalIn - totalOut;
    if (remaining < 0) remaining = 0;

    const sumQ = QUALITY_KEYS.reduce((a,k)=>a+byQ[k],0) || 1;
    // Proportional subtract
    const after = {};
    QUALITY_KEYS.forEach(k => {
      const share = byQ[k] / sumQ;
      after[k] = Math.max(0, byQ[k] - totalOut * share);
    });

    // Normalize to remaining (floating errors)
    const afterSum = QUALITY_KEYS.reduce((a,k)=>a+after[k],0) || 1;
    QUALITY_KEYS.forEach(k => {
      after[k] = after[k] * (remaining/afterSum);
    });

    currentByTankQ[tid] = { total: remaining, byQ: after };
  });

  // 4) render
  viz.innerHTML = "";
  Object.keys(tankMap).forEach(tid => {
    const t = tankMap[tid];
    const qData = currentByTankQ[tid] || { total:0, byQ:{ "EXTRA V.":0, "NATURAL 1.":0, "HAM":0 } };
    const cap = Number(t.capacity_kg) || 1;
    const cur = Number(t.current_kg) || 0;
    const pct = Math.min(100, Math.max(0, (cur / cap) * 100));

    // Segment yükseklikleri (px) – 240px silindir yüksekliği
    const CYL_H = 240;
    const total = qData.byQ["EXTRA V."] + qData.byQ["NATURAL 1."] + qData.byQ["HAM"];
    const hExtra = total ? CYL_H * (qData.byQ["EXTRA V."]/total) : 0;
    const hNat   = total ? CYL_H * (qData.byQ["NATURAL 1."]/total) : 0;
    const hHam   = total ? CYL_H * (qData.byQ["HAM"]/total) : 0;

    const card = document.createElement("div");
    card.className = "tank-card";

    card.innerHTML = `
      <div class="tank-title">${t.tank_name}</div>
      <div class="cylinder">
        <div class="cyl-top"></div>
        <div class="cyl-body">
          <div class="seg ${Q_COLOR_CLASS["HAM"]}" style="height:${hHam}px"></div>
          <div class="seg ${Q_COLOR_CLASS["NATURAL 1."]}" style="height:${hNat}px"></div>
          <div class="seg ${Q_COLOR_CLASS["EXTRA V."]}" style="height:${hExtra}px"></div>
          <div class="cyl-gloss"></div>
        </div>
        <div class="cyl-bottom"></div>
      </div>
      <div class="tank-meta">
        <span>Doluluk: <b>${pct.toFixed(1)}%</b></span>
        <span>Mevcut: <b>${cur.toFixed(1)} kg</b></span>
      </div>
      <div class="tank-breakdown">
        <span>EXTRA: <b>${(qData.byQ["EXTRA V."]||0).toFixed(1)} kg</b></span>
        <span>NATURAL 1.: <b>${(qData.byQ["NATURAL 1."]||0).toFixed(1)} kg</b></span>
        <span>HAM: <b>${(qData.byQ["HAM"]||0).toFixed(1)} kg</b></span>
      </div>
    `;
    viz.appendChild(card);
  });
}

/* ============ TÜMÜNÜ YENİLE ============ */
async function refreshAll() {
  await loadSuppliers();
  await loadTanks();
  await refreshRecentLists();
  await refreshFullTables();
  await loadDashboardStats();
}
refreshAll();

/* ============ LOGIN ============ */
document.getElementById("btnLogin")?.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value;
  const pass = document.getElementById("loginPassword").value;
  const msg = document.getElementById("loginMsg");
  msg.textContent = "Giriş yapılıyor...";
  const { error } = await supa.auth.signInWithPassword({ email, password: pass });
  if (error) { msg.textContent = "Hata: " + error.message; return; }
  window.location.href = "index.html";
});

/* global helpers for edit buttons */
window.editEntry = editEntry;
window.deleteEntry = deleteEntry;
window.editExit = editExit;
window.deleteExit = deleteExit;
window.deleteTank = deleteTank;
window.deleteSupplier = deleteSupplier;
window.saveEdit = saveEdit;
window.closeEdit = closeEdit;
window.closeConfirm = closeConfirm;
window.activateTab = activateTab;
