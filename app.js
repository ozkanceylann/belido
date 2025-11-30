// =============================
//  SUPABASE BAĞLANTISI
// =============================
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON = "YOUR_SUPABASE_ANON_KEY";

const { createClient } = supabase;
const supa = createClient(SUPABASE_URL, SUPABASE_ANON);

// =============================
//  LOGIN KONTROLÜ
// =============================
async function checkAuth() {
  const { data } = await supa.auth.getSession();
  if (!data.session) {
    window.location.href = "login.html";
    return;
  }

  // Kullanıcı email yazalım
  document.getElementById("userEmail").textContent =
    data.session.user.email || "Kullanıcı";
}

checkAuth();

// =============================
//  LOGOUT
// =============================
document.getElementById("btnLogout").addEventListener("click", async () => {
  await supa.auth.signOut();
  window.location.href = "login.html";
});

// =============================
//  SIDEBAR TAB GEÇİŞİ
// =============================
const tabButtons = document.querySelectorAll(".sb-link");
const tabs = document.querySelectorAll(".tab");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const id = btn.dataset.tab;
    tabs.forEach((t) => (t.style.display = t.id === id ? "block" : "none"));
  });
});

// =============================
//  DROPDOWN VERİLERİ YÜKLEME
// =============================
async function loadSuppliers() {
  const { data, error } = await supa.from("suppliers").select("*").order("name");
  if (error) return console.error(error);

  const sel = document.getElementById("supplierSelect");
  sel.innerHTML = data.map(s => `<option value="${s.id}">${s.name}</option>`).join("");

  renderSupplierTable(data);
}

async function loadTanks() {
  const { data, error } = await supa.from("v_tank_status").select("*");
  if (error) return console.error(error);

  const sel1 = document.getElementById("tankSelect1");
  const sel2 = document.getElementById("tankSelect2");

  sel1.innerHTML = data.map(t => `<option value="${t.tank_id}">${t.tank_name}</option>`).join("");
  sel2.innerHTML = sel1.innerHTML;

  renderTankTable(data);
}

// =============================
//  TABLO RENDER FONKSİYONLARI
// =============================
function renderSupplierTable(rows) {
  const tb = document.querySelector("#supplierTable tbody");
  tb.innerHTML = rows.map(r => `
    <tr>
      <td>${r.name}</td>
      <td>${r.address || ""}</td>
      <td>${r.phone || ""}</td>
    </tr>
  `).join("");
}

function renderTankTable(rows) {
  const tb = document.querySelector("#tankTable tbody");
  tb.innerHTML = rows.map(r => `
    <tr>
      <td>${r.tank_name}</td>
      <td>${r.capacity_kg}</td>
      <td>${r.current_kg}</td>
      <td>${r.fill_percent}%</td>
      <td>${Number(r.weighted_acid).toFixed(4)}</td>
    </tr>
  `).join("");
}

function renderEntryTable(rows) {
  const tb = document.querySelector("#entryTable tbody");
  tb.innerHTML = rows.map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${r.fis_no || ""}</td>
      <td>${r.supplier_name || ""}</td>
      <td>${r.tank_name || ""}</td>
      <td>${r.kg}</td>
      <td>${Number(r.acid).toFixed(4)}</td>
    </tr>
  `).join("");
}

function renderExitTable(rows) {
  const tb = document.querySelector("#exitTable tbody");
  tb.innerHTML = rows.map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${r.tank_name || ""}</td>
      <td>${r.kg}</td>
      <td>${r.description || ""}</td>
    </tr>
  `).join("");
}

// =============================
//  FORMLAR
// =============================
document.getElementById("entryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());

  payload.kg = Number(payload.kg);
  payload.acid = Number(payload.acid);

  const { error } = await supa.from("oil_entries").insert(payload);
  const msg = document.getElementById("entryMsg");

  msg.textContent = error ? "Hata: " + error.message : "Kayıt eklendi";
  if (!error) e.target.reset();
  refreshAll();
});

document.getElementById("exitForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());

  payload.kg = Number(payload.kg);

  const { error } = await supa.from("oil_exits").insert(payload);
  const msg = document.getElementById("exitMsg");

  msg.textContent = error ? "Hata: " + error.message : "Çıkış yapıldı";
  if (!error) e.target.reset();
  refreshAll();
});

document.getElementById("tankForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());
  payload.capacity_kg = Number(payload.capacity_kg);

  const { error } = await supa.from("tanks").insert(payload);
  const msg = document.getElementById("tankMsg");

  msg.textContent = error ? "Hata: " + error.message : "Tank eklendi";
  if (!error) e.target.reset();
  refreshAll();
});

document.getElementById("supplierForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());

  const { error } = await supa.from("suppliers").insert(payload);
  const msg = document.getElementById("supplierMsg");

  msg.textContent = error ? "Hata: " + error.message : "Tedarikçi eklendi";
  if (!error) e.target.reset();
  refreshAll();
});

// =============================
//  RAPORLAR
// =============================
document.getElementById("btnRunReport").addEventListener("click", async () => {
  const start = document.getElementById("repStart").value;
  const end = document.getElementById("repEnd").value;

  let q1 = supa.from("oil_entries").select("kg, acid, date, tank_id, tanks:tank_id(tank_name)");
  let q2 = supa.from("oil_exits").select("kg, date, tank_id, tanks:tank_id(tank_name)");

  if (start) { q1 = q1.gte("date", start); q2 = q2.gte("date", start); }
  if (end) { q1 = q1.lte("date", end); q2 = q2.lte("date", end); }

  const [{ data: E }, { data: X }] = await Promise.all([q1, q2]);

  const map = {};

  (E || []).forEach(r => {
    const name = r.tanks?.tank_name || "-";
    if (!map[name]) map[name] = { inKg: 0, outKg: 0, acids: [], weights: [] };
    map[name].inKg += r.kg;
    map[name].acids.push(r.acid);
    map[name].weights.push(r.kg);
  });

  (X || []).forEach(r => {
    const name = r.tanks?.tank_name || "-";
    if (!map[name]) map[name] = { inKg: 0, outKg: 0, acids: [], weights: [] };
    map[name].outKg += r.kg;
  });

  const tb = document.querySelector("#reportTable tbody");
  tb.innerHTML = "";

  for (const tank in map) {
    const d = map[tank];
    const net = d.inKg - d.outKg;

    let wAcid = 0;
    const totalW = d.weights.reduce((a, b) => a + b, 0);
    if (totalW > 0) {
      wAcid = d.acids.reduce((sum, a, i) => sum + a * d.weights[i], 0) / totalW;
    }

    tb.innerHTML += `
      <tr>
        <td>${tank}</td>
        <td>${d.inKg}</td>
        <td>${d.outKg}</td>
        <td>${net}</td>
        <td>${wAcid.toFixed(4)}</td>
      </tr>
    `;
  }
});

// =============================
//  SON LİSTELER
// =============================
async function refreshRecentLists() {
  const { data: entries } = await supa
    .from("oil_entries")
    .select("date, fis_no, kg, acid, suppliers:supplier_id(name), tanks:tank_id(tank_name)")
    .order("id", { ascending: false })
    .limit(10);

  const formatted = entries.map(r => ({
    date: r.date,
    fis_no: r.fis_no,
    kg: r.kg,
    acid: r.acid,
    supplier_name: r.suppliers?.name,
    tank_name: r.tanks?.tank_name
  }));

  renderEntryTable(formatted);

  const { data: exits } = await supa
    .from("oil_exits")
    .select("date, kg, description, tanks:tank_id(tank_name)")
    .order("id", { ascending: false })
    .limit(10);

  const formatted2 = exits.map(r => ({
    date: r.date,
    kg: r.kg,
    description: r.description,
    tank_name: r.tanks?.tank_name
  }));

  renderExitTable(formatted2);
}

// =============================
//  HEPSİNİ YENİLE
// =============================
async function refreshAll() {
  await Promise.all([
    loadSuppliers(),
    loadTanks(),
    refreshRecentLists(),
  ]);
}

// İlk yükleme
refreshAll();
