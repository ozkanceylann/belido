// =================================================
// LOGIN SAYFASI İŞLEMLERİ
// =================================================

document.addEventListener("DOMContentLoaded", async () => {
  const loginForm = document.getElementById("loginForm");

  // LOGIN SAYFASI
  if (loginForm) {
    const { data } = await supa.auth.getUser();
    if (data.user) window.location.href = "index.html";

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;
      const msg = document.getElementById("loginMsg");

      msg.textContent = "Giriş yapılıyor...";

      const { error } = await supa.auth.signInWithPassword({ email, password });

      if (error) msg.textContent = "Hata: " + error.message;
      else window.location.href = "index.html";
    });

    return;
  }

  // PANEL SAYFASI → Login kontrol
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) window.location.href = "login.html";

  document.getElementById("userEmail").textContent = auth.user.email;

  // =================================================
  // ÇIKIŞ
  // =================================================

  document.getElementById("btnLogout")?.addEventListener("click", async () => {
    await supa.auth.signOut();
    window.location.href = "login.html";
  });

  // =================================================
  // TAB GEÇİŞLERİ
  // =================================================

  document.querySelectorAll(".sb-link").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sb-link").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab").forEach(t => (t.style.display = "none"));
      document.getElementById(tab).style.display = "block";
    });
  });

  // =================================================
  // TEDARİKÇİLERİ YÜKLE
  // =================================================

  async function loadSuppliers() {
    const { data } = await supa.from("suppliers").select("*").order("id", { ascending: false });

    const select = document.getElementById("supplierSelect");
    const tbody = document.querySelector("#supplierTable tbody");

    if (select) select.innerHTML = "";
    if (tbody) tbody.innerHTML = "";

    data?.forEach(s => {
      if (select) select.innerHTML += `<option value="${s.id}">${s.name}</option>`;

      if (tbody)
        tbody.innerHTML += `
          <tr>
            <td>${s.name}</td>
            <td>${s.address || ""}</td>
            <td>${s.phone || ""}</td>
            <td>${s.note || ""}</td>
          </tr>
        `;
    });
  }

  loadSuppliers();

  // =================================================
  // TANKLARI YÜKLE
  // =================================================

  async function loadTanks() {
    const { data } = await supa.from("tanks").select("*");

    const sel1 = document.getElementById("tankSelect1");
    const sel2 = document.getElementById("tankSelect2");
    const tbody = document.querySelector("#tankTable tbody");

    if (sel1) sel1.innerHTML = "";
    if (sel2) sel2.innerHTML = "";
    if (tbody) tbody.innerHTML = "";

    data?.forEach(t => {
      if (sel1) sel1.innerHTML += `<option value="${t.id}">${t.tank_name}</option>`;
      if (sel2) sel2.innerHTML += `<option value="${t.id}">${t.tank_name}</option>`;
      if (tbody)
        tbody.innerHTML += `
          <tr>
            <td>${t.tank_name}</td>
            <td>${t.capacity_kg}</td>
            <td>${t.current_kg || 0}</td>
            <td>${((t.current_kg / t.capacity_kg) * 100).toFixed(1)}%</td>
            <td>${t.avg_acid || "-"}</td>
          </tr>
        `;
    });
  }

  loadTanks();

  // =================================================
  // MAL GİRİŞ KAYIT
  // =================================================

  document.getElementById("entryForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const form = new FormData(e.target);
    const obj = Object.fromEntries(form.entries());
    obj.kg = parseFloat(obj.kg);
    obj.acid = parseFloat(obj.acid);

    const msg = document.getElementById("entryMsg");

    const { error } = await supa.from("oil_entries").insert(obj);

    if (error) msg.textContent = "Hata: " + error.message;
    else {
      msg.textContent = "Kayıt eklendi";
      loadEntryTable();
      loadTanks();
      e.target.reset();
    }
  });

  async function loadEntryTable() {
    const tbody = document.querySelector("#entryTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const { data } = await supa
      .from("oil_entries")
      .select("*, suppliers(name), tanks(tank_name)")
      .order("id", { ascending: false });

    data?.forEach(r => {
      tbody.innerHTML += `
        <tr>
          <td>${r.date}</td>
          <td>${r.fis_no || ""}</td>
          <td>${r.suppliers?.name || ""}</td>
          <td>${r.tanks?.tank_name || ""}</td>
          <td>${r.kalite}</td>
          <td>${r.kg}</td>
          <td>${r.acid}</td>
          <td>${r.price || ""}</td>
        </tr>`;
    });
  }

  loadEntryTable();

  // =================================================
  // MAL ÇIKIŞ KAYIT
  // =================================================

  document.getElementById("exitForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const obj = Object.fromEntries(new FormData(e.target));
    obj.kg = parseFloat(obj.kg);

    const msg = document.getElementById("exitMsg");

    const { error } = await supa.from("oil_exits").insert(obj);

    if (error) msg.textContent = "Hata: " + error.message;
    else {
      msg.textContent = "Kayıt eklendi";
      loadExitTable();
      loadTanks();
      e.target.reset();
    }
  });

  async function loadExitTable() {
    const tbody = document.querySelector("#exitTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const { data } = await supa
      .from("oil_exits")
      .select("*, tanks(tank_name)")
      .order("id", { ascending: false });

    data?.forEach(r => {
      tbody.innerHTML += `
        <tr>
          <td>${r.date}</td>
          <td>${r.tanks?.tank_name || ""}</td>
          <td>${r.kalite}</td>
          <td>${r.kg}</td>
          <td>${r.price || ""}</td>
          <td>${r.invoice_no || ""}</td>
          <td>${r.description || ""}</td>
        </tr>`;
    });
  }

  loadExitTable();

  // =================================================
  // TEDARİKÇİ EKLE
  // =================================================

  document.getElementById("supplierForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const obj = Object.fromEntries(new FormData(e.target));
    const msg = document.getElementById("supplierMsg");

    const { error } = await supa.from("suppliers").insert(obj);

    if (error) msg.textContent = "Hata: " + error.message;
    else {
      msg.textContent = "Eklendi";
      loadSuppliers();
      e.target.reset();
    }
  });

  // =================================================
  // RAPORLAMA
  // =================================================

  document.getElementById("btnRunReport")?.addEventListener("click", async () => {
    const s = document.getElementById("repStart").value;
    const e = document.getElementById("repEnd").value;

    const tbody = document.querySelector("#reportTable tbody");
    tbody.innerHTML = "";

    const { data: giris } = await supa
      .from("oil_entries")
      .select("*")
      .gte("date", s || "1900-01-01")
      .lte("date", e || "2999-12-31");

    const { data: cikis } = await supa
      .from("oil_exits")
      .select("*")
      .gte("date", s || "1900-01-01")
      .lte("date", e || "2999-12-31");

    const kaliteList = ["EXTRA V.", "NATURAL 1.", "HAM"];

    kaliteList.forEach(k => {
      const g = giris.filter(r => r.kalite === k);
      const c = cikis.filter(r => r.kalite === k);

      const gkg = g.reduce((t, x) => t + x.kg, 0);
      const ckg = c.reduce((t, x) => t + x.kg, 0);

      const avgBuy = gkg ? (g.reduce((t,x)=>t+(x.price||0)*x.kg,0)/gkg).toFixed(2) : "-";
      const avgSell = ckg ? (c.reduce((t,x)=>t+(x.price||0)*x.kg,0)/ckg).toFixed(2) : "-";

      const net = gkg - ckg;
      const kar = (avgSell !== "-" && avgBuy !== "-") ? ((avgSell - avgBuy)*ckg).toFixed(2) : "-";

      tbody.innerHTML += `
        <tr>
          <td>${k}</td>
          <td>${gkg}</td>
          <td>${ckg}</td>
          <td>${avgBuy}</td>
          <td>${avgSell}</td>
          <td>${kar}</td>
          <td>${net}</td>
        </tr>
      `;
    });
  });

});
