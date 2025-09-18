// ===== utilidades de tempo =====
function toMinutes(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return (h * 60) + (m || 0);
}
function minutesToHoursStr(min) {
  const h = Math.floor(min / 60);
  const m = Math.abs(min % 60);
  return (h + (m / 60)).toFixed(2).replace('.', ',');
}
function parseISODate(d) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m - 1), day);
}
function formatDateBR(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ===== persistência =====
const STORAGE_KEY = "ponto_entries_v2";
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error(e);
    return [];
  }
}
function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ===== estado =====
let entries = loadEntries();

// ===== DOM =====
const form = document.getElementById("entryForm");
const employeeEl = document.getElementById("employee");
const dateEl = document.getElementById("date");
const timeInEl = document.getElementById("timeIn");
const timeOutEl = document.getElementById("timeOut");
const lunchInEl = document.getElementById("lunchIn");
const lunchOutEl = document.getElementById("lunchOut");

const reportTable = document.getElementById("reportTable");
const filterEmployeeEl = document.getElementById("filterEmployee");
const filterFromEl = document.getElementById("filterFrom");
const filterToEl = document.getElementById("filterTo");

const applyFiltersBtn = document.getElementById("applyFilters");
const resetFiltersBtn = document.getElementById("resetFilters");
const exportCsvBtn = document.getElementById("exportCsv");
const printBtn = document.getElementById("printReport");
const clearAllBtn = document.getElementById("clearAll");
const seedBtn = document.getElementById("seedData");

// ===== cálculo e validação =====
function buildEntryFromForm() {
  const employee = employeeEl.value.trim();
  const date = dateEl.value;
  const timeIn = timeInEl.value;
  const timeOut = timeOutEl.value;
  const lunchIn = lunchInEl.value;
  const lunchOut = lunchOutEl.value;

  if (!employee || !date || !timeIn || !timeOut || !lunchIn || !lunchOut) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  const start = toMinutes(timeIn);
  const end = toMinutes(timeOut);
  const lIn = toMinutes(lunchIn);
  const lOut = toMinutes(lunchOut);

  if (end <= start) throw new Error("Horário de saída deve ser maior que a entrada.");
  if (lOut <= lIn) throw new Error("Saída do almoço deve ser maior que entrada do almoço.");

  const worked = Math.max(0, (end - start) - (lOut - lIn));

  return {
    id: crypto.randomUUID(),
    employee,
    date,
    timeIn,
    timeOut,
    lunchIn,
    lunchOut,
    totalMin: worked
  };
}

// ===== renderização =====
function getFilteredEntries() {
  const name = filterEmployeeEl.value.trim().toLowerCase();
  const from = filterFromEl.value ? parseISODate(filterFromEl.value) : null;
  const to = filterToEl.value ? parseISODate(filterToEl.value) : null;

  let list = [...entries];
  if (name) list = list.filter(e => e.employee.toLowerCase().includes(name));
  if (from) list = list.filter(e => parseISODate(e.date) >= from);
  if (to) {
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    list = list.filter(e => parseISODate(e.date) <= toEnd);
  }

  list.sort((a, b) => a.date.localeCompare(b.date) || a.employee.localeCompare(b.employee));
  return list;
}

function renderTable() {
  const list = getFilteredEntries();
  // Remove linhas antigas (exceto cabeçalho)
  reportTable.querySelectorAll("tbody").forEach(t => t.remove());

  const tbody = document.createElement("tbody");
  for (const row of list) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.employee}</td>
      <td>${formatDateBR(row.date)}</td>
      <td>${row.timeIn}</td>
      <td>${row.timeOut}</td>
      <td>${row.lunchIn}</td>
      <td>${row.lunchOut}</td>
      <td>${minutesToHoursStr(row.totalMin)}</td>
    `;
    tbody.appendChild(tr);
  }
  reportTable.appendChild(tbody);
}

// ===== eventos =====
form.addEventListener("submit", e => {
  e.preventDefault();
  try {
    const entry = buildEntryFromForm();
    entries.push(entry);
    saveEntries(entries);
    form.reset();
    renderTable();
  } catch (err) {
    alert(err.message);
  }
});

applyFiltersBtn.addEventListener("click", renderTable);
resetFiltersBtn.addEventListener("click", () => {
  filterEmployeeEl.value = "";
  filterFromEl.value = "";
  filterToEl.value = "";
  renderTable();
});

exportCsvBtn.addEventListener("click", () => {
  const list = getFilteredEntries();
  if (!list.length) return alert("Nada para exportar.");
  const header = ["Colaborador", "Data", "Entrada", "Saída", "Entrada Almoço", "Saída Almoço", "Total (h)"];
  const rows = list.map(r => [
    r.employee,
    formatDateBR(r.date),
    r.timeIn,
    r.timeOut,
    r.lunchIn,
    r.lunchOut,
    minutesToHoursStr(r.totalMin)
  ]);
  const csv = [header, ...rows].map(cols =>
    cols.map(v => `"${String(v)}"`).join(";")
  ).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "relatorio-ponto.csv";
  a.click();
  URL.revokeObjectURL(url);
});

printBtn.addEventListener("click", () => window.print());

clearAllBtn.addEventListener("click", () => {
  if (confirm("Apagar todos os registros?")) {
    entries = [];
    saveEntries(entries);
    renderTable();
  }
});

seedBtn.addEventListener("click", () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const iso = `${yyyy}-${mm}-${dd}`;
  const demo = [
    { employee: "Ana Souza", date: iso, timeIn: "08:00", timeOut: "17:00", lunchIn: "12:00", lunchOut: "13:00" },
    { employee: "Bruno Lima", date: iso, timeIn: "09:00", timeOut: "18:00", lunchIn: "12:30", lunchOut: "13:30" },
  ].map(x => ({
    id: crypto.randomUUID(),
    ...x,
    totalMin: Math.max(0, (toMinutes(x.timeOut) - toMinutes(x.timeIn)) - (toMinutes(x.lunchOut) - toMinutes(x.lunchIn)))
  }));
  entries = [...entries, ...demo];
  saveEntries(entries);
  renderTable();
});

// ===== inicialização =====
document.addEventListener("DOMContentLoaded", () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  dateEl.value = `${y}-${m}-${d}`;
  renderTable();
});
