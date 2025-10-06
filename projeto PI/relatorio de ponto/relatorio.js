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
const breakMinEl = document.getElementById("breakMin");
const notesEl = document.getElementById("notes");

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
  const breakMin = parseInt(breakMinEl.value) || 0;
  const notes = notesEl.value.trim();

  if (!employee || !date || !timeIn || !timeOut) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  const start = toMinutes(timeIn);
  const end = toMinutes(timeOut);

  if (end <= start) throw new Error("Horário de saída deve ser maior que a entrada.");

  const worked = Math.max(0, (end - start) - breakMin);
  const standard = 8 * 60; // 8 hours
  const extras = Math.max(0, worked - standard);
  const haver = Math.max(0, standard - worked);

  return {
    id: crypto.randomUUID(),
    employee,
    date,
    timeIn,
    timeOut,
    breakMin,
    notes,
    totalMin: worked,
    extrasMin: extras,
    haverMin: haver
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
      <td></td>
      <td></td>
      <td>${row.timeOut}</td>
      <td>${minutesToHoursStr(row.totalMin)}</td>
      <td>${minutesToHoursStr(row.extrasMin)}</td>
      <td>${minutesToHoursStr(row.haverMin)}</td>
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
  const header = ["Colaborador", "Data", "Entrada", "Saída", "Pausa (min)", "Observações", "Total (h)", "Horas Extras", "Horas Haver"];
  const rows = list.map(r => [
    r.employee,
    formatDateBR(r.date),
    r.timeIn,
    r.timeOut,
    r.breakMin,
    r.notes,
    minutesToHoursStr(r.totalMin),
    minutesToHoursStr(r.extrasMin),
    minutesToHoursStr(r.haverMin)
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
    { employee: "Ana Souza", date: iso, timeIn: "08:00", timeOut: "17:00", breakMin: 60, notes: "Trabalho normal" },
    { employee: "Bruno Lima", date: iso, timeIn: "09:00", timeOut: "18:30", breakMin: 60, notes: "Reunião extra" },
  ].map(x => {
    const start = toMinutes(x.timeIn);
    const end = toMinutes(x.timeOut);
    const worked = Math.max(0, (end - start) - x.breakMin);
    const standard = 8 * 60;
    const extras = Math.max(0, worked - standard);
    const haver = Math.max(0, standard - worked);
    return {
      id: crypto.randomUUID(),
      ...x,
      totalMin: worked,
      extrasMin: extras,
      haverMin: haver
    };
  });
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
