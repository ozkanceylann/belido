// =============================
//  SUPABASE BAĞLANTISI
// =============================
const SUPABASE_URL = "https://dnicipqyxoadjcizpvxy.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuaWNpcHF5eG9hZGpjaXpwdnh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTcwNzcsImV4cCI6MjA3ODM5MzA3N30._Roo83R-khWLoiEadVoRMmAnGR1AD4Z_0_5OwbemCwk";

// =============================
// Supabase Başlat
// =============================
const { createClient } = supabase;
const supa = createClient(SUPABASE_URL, SUPABASE_ANON);

// =============================
// Login kontrol
// =============================
async function checkLogin() {
  const { data } = await supa.auth.getUser();
  if (!data.user) {
    window.location.href = "login.html";
  } else {
    document.getElementById("userEmail").textContent = data.user.email;
  }
}
checkLogin();

// LOGIN SAYFASINDA KULLANILAN EVENT
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  if (!form) return; // login sayfasında değilsek çık

  const msg = document.getElementById("loginMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const { data, error } = await supa.auth.signInWithPassword({
      email, password
    });

    if (error) {
      msg.textContent = "Hata: " + error.message;
      return;
    }

    window.location.href = "index.html";
  });
});


// =============================
// Logout
// =============================
const btnLogout = document.getElementById("btnLogout");
if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    await supa.auth.signOut();
    window.location.href = "login.html";
  });
}

// =============================
// Sekme (TAB) sistemi
// =============================
document.querySelectorAll(".sb-link").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sb-link").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.tab;
    document.querySelectorAll(".tab").forEach(x => x.style.display = "none");
    document.getElementById(tab).style.display = "block";
  });
});

// =============================
// Tedarikçi Listesini Yükle
// =============================
async function loadSuppliers() {
  const { data } = await supa.from("suppliers").select("*").order("id", { ascending: false });

  const s = document.getElementById("supplierSelect");
  s.innerHTML = data.map(x => `<option value="${x.id}">${x.name}</option>`).join("");

  // tabloya yaz
  const tb = document.querySelector("#supplierTable tbody");
  tb.innerHTML = data.map(x => `
    <tr>
      <td>${x.name}</td>
      <td>${x.address || ""}</td>
      <td>${x.phone || ""}</td>
      <td>${x.note || ""}</td>
    </tr>
  `).join("");
}
loadSuppliers();

// =============================
// Tankları yükle
// =============================
async function loadTanks() {
  const { data } = await supa.from("tanks").select("*").order("id", { ascending: true });

  // giriş formu seçim
  document.getElementById("tankSelect1").innerHTML =
    data.map(t => `<option value="${t.id}">${t.tank_name}</option>`).join("");

  // çıkış formu seçim
  document.getElementById("tankSelect2").innerHTML =
    data.map(t => `<option value="${t.id}">${t.tank_name}</option>`).join("");

  // tank tablosu
  const tb = document.querySelector("#tankTable tbody");
  tb.innerHTML = "";

  for (let t of data) {
    const stock = await calculateTankStock(t.id);

    tb.innerHTML += `
      <tr>
        <td>${t.tank_name}</td>
        <td>${t.capacity_kg}</td>
        <td>${stock.total_kg}</td>
        <td>${stock.percent.toFixed(1)}%</td>
        <td>${stock.avg_acid.toFixed(4)}</td>
      </tr>
    `;
  }

  loadTankVisuals();
}
loadTanks();

// =============================
// Tank stok hesaplama
// =============================
async function calculateTankStock(tank_id) {
  const { data: entries } = await supa.from("oil_entries").select("*").eq("tank_id", tank_id);
  const { data: exits } = await supa.from("oil_exits").select("*").eq("tank_id", tank_id);

  let totalKg =
    (entries?.reduce((a, b) => a + Number(b.kg), 0) || 0) -
    (exits?.reduce((a, b) => a + Number(b.kg), 0) || 0);

  if (totalKg < 0) totalKg = 0;

  // ağırlıklı asit ortalaması
  let acidTotal = 0;
  let kgTotal = 0;

  entries.forEach(e => {
    acidTotal += Number(e.acid) * Number(e.kg);
    kgTotal += Number(e.kg);
  });

  let avg_acid = kgTotal === 0 ? 0 : acidTotal / kgTotal;

  return {
    total_kg: totalKg,
    avg_acid: avg_acid,
    percent: (totalKg / 10000) * 100 // kapasiteyi tank tablosundan çekebilirsin, istersem eklerim
  };
}

// =============================
// Tank grafik alanı
// =============================
async function loadTankVisuals() {
  const { data: tanks } = await supa.from("tanks").select("*");

  const box = document.getElementById("tankVisuals");
  box.innerHTML = "";

  for (let t of tanks) {
    const e = await supa.from("oil_entries").select("*").eq("tank_id", t.id);
    const x = await supa.from("oil_exits").select("*").eq("tank_id", t.id);

    let extra = 0, nat = 0, ham = 0;

    e.data?.forEach(row => {
      if (row.kalite === "EXTRA V.") extra += Number(row.kg);
      if (row.kalite === "NATURAL 1.") nat += Number(row.kg);
      if (row.kalite === "HAM") ham += Number(row.kg);
    });

    x.data?.forEach(row => {
      if (row.kalite === "EXTRA V.") extra -= Number(row.kg);
      if (row.kalite === "NATURAL 1.") nat -= Number(row.kg);
      if (row.kalite === "HAM") ham -= Number(row.kg);
    });

    if (extra < 0) extra = 0;
    if (nat < 0) nat = 0;
    if (ham < 0) ham = 0;

    const total = extra + nat + ham;
    const pct = t.capacity_kg ? (total / t.capacity_kg * 100) : 0;

    box.innerHTML += `
      <div class="tank-card" id="tank-${t.id}">
        <div class="tank-card-head">
          <strong>${t.tank_name}</strong>
          <span>${pct.toFixed(1)}% dolu</span>
        </div>

        <div class="tank-bar">
          <div class="extra" style="width:${total ? (extra / total * 100) : 0}%"></div>
          <div class="nat" style="width:${total ? (nat / total * 100) : 0}%"></div>
          <div class="ham" style="width:${total ? (ham / total * 100) : 0}%"></div>
        </div>

        <div class="tank-legend">
          <span class="dot extra"></span> EXTRA V.: <b>${extra}</b> kg<br>
          <span class="dot nat"></span> NATURAL 1.: <b>${nat}</b> kg<br>
          <span class="dot ham"></span> HAM: <b>${ham}</b> kg
        </div>
      </div>
    `;
  }
}

// =============================
// MAL GİRİŞ – Form Kaydet
// =============================
document.getElementById("entryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const obj = Object.fromEntries(fd.entries());

  const { error } = await supa.from("oil_entries").insert(obj);
  const msg = document.getElementById("entryMsg");

  if (error) msg.textContent = "Hata: " + error.message;
  else {
    msg.textContent = "Kaydedildi!";
    e.target.reset();
    loadTanks();
    loadEntries();
  }
});

// =============================
// MAL ÇIKIŞ – Form Kaydet
// =============================
document.getElementById("exitForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const obj = Object.fromEntries(fd.entries());

  const { error } = await supa.from("oil_exits").insert(obj);
  const msg = document.getElementById("exitMsg");

  if (error) msg.textContent = "Hata: " + error.message;
  else {
    msg.textContent = "Kaydedildi!";
    e.target.reset();
    loadTanks();
    loadExits();
  }
});

// =============================
// Giriş & çıkış tablolarını listele
// =============================
async function loadEntries() {
  const { data } = await supa.from("oil_entries").select("*").order("id", { ascending: false });

  const tb = document.querySelector("#entryTable tbody");
  tb.innerHTML = data.map(x => `
    <tr>
      <td>${x.date}</td>
      <td>${x.fis_no || ""}</td>
      <td>${x.supplier_id}</td>
      <td>${x.tank_id}</td>
      <td>${x.kalite}</td>
      <td>${x.kg}</td>
      <td>${x.acid}</td>
      <td>${x.price || ""}</td>
    </tr>
  `).join("");
}
loadEntries();

async function loadExits() {
  const { data } = await supa.from("oil_exits").select("*").order("id", { ascending: false });

  const tb = document.querySelector("#exitTable tbody");
  tb.innerHTML = data.map(x => `
    <tr>
      <td>${x.date}</td>
      <td>${x.tank_id}</td>
      <td>${x.kalite}</td>
      <td>${x.kg}</td>
      <td>${x.price || ""}</td>
      <td>${x.invoice_no || ""}</td>
      <td>${x.description || ""}</td>
    </tr>
  `).join("");
}
loadExits();

// =============================
// Tedarikçi ekle
// =============================
document.getElementById("supplierForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const obj = Object.fromEntries(fd.entries());

  const { error } = await supa.from("suppliers").insert(obj);
  const msg = document.getElementById("supplierMsg");

  if (error) msg.textContent = "Hata: " + error.message;
  else {
    msg.textContent = "Eklendi!";
    e.target.reset();
    loadSuppliers();
  }
});

// =============================
// RAPORLAR
// =============================
document.getElementById("btnRunReport").addEventListener("click", runReport);

async function runReport() {
  const start = document.getElementById("repStart").value;
  const end = document.getElementById("repEnd").value;

  const { data: entries } = await supa.from("oil_entries")
    .select("*")
    .gte("date", start)
    .lte("date", end);

  const { data: exits } = await supa.from("oil_exits")
    .select("*")
    .gte("date", start)
    .lte("date", end);

  const qualities = ["EXTRA V.", "NATURAL 1.", "HAM"];
  const rows = [];

  qualities.forEach(q => {
    const e = entries.filter(x => x.kalite === q);
    const x = exits.filter(x => x.kalite === q);

    const entryKg = e.reduce((a, b) => a + Number(b.kg), 0);
    const exitKg = x.reduce((a, b) => a + Number(b.kg), 0);

    const avgBuy = e.length ? e.reduce((a, b) => a + Number(b.price || 0), 0) / e.length : 0;
    const avgSell = x.length ? x.reduce((a, b) => a + Number(b.price || 0), 0) / x.length : 0;

    const profit =
      x.reduce((a, b) => a + (Number(b.kg) * Number(b.price || 0)), 0) -
      e.reduce((a, b) => a + (Number(b.kg) * Number(b.price || 0)), 0);

    rows.push({
      kalite: q,
      entryKg,
      exitKg,
      avgBuy,
      avgSell,
      profit,
      net: entryKg - exitKg
    });
  });

  renderReport(rows);
}

function renderReport(rows) {
  const tb = document.querySelector("#reportTable tbody");
  tb.innerHTML = rows.map(r => `
    <tr>
      <td class="col-product">${r.kalite}</td>
      <td class="col-entryKg">${r.entryKg}</td>
      <td class="col-exitKg">${r.exitKg}</td>
      <td class="col-avgBuy">${r.avgBuy.toFixed(2)}</td>
      <td class="col-avgSell">${r.avgSell.toFixed(2)}</td>
      <td class="col-profit">${r.profit.toFixed(2)}</td>
      <td class="col-net">${r.net}</td>
    </tr>
  `).join("");
}

// =============================
// EXCEL EXPORT
// =============================
document.getElementById("btnExcel").addEventListener("click", () => {
  const table = document.getElementById("reportTable");
  const wb = XLSX.utils.table_to_book(table, { sheet: "Rapor" });
  XLSX.writeFile(wb, "rapor.xlsx");
});

// =============================
// KOLON GİZLE / GÖSTER
// =============================
document.querySelectorAll(".colToggle").forEach(cb => {
  cb.addEventListener("change", () => {
    const col = cb.dataset.col;
    const visible = cb.checked;
    document.querySelectorAll(`.col-${col}`).forEach(el => {
      el.style.display = visible ? "" : "none";
    });
  });
});
