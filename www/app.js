/* ============ Jalali (Persian) calendar conversion ============ */
function div(a, b) { return Math.trunc(a / b); }
function mod(a, b) { return a - Math.trunc(a / b) * b; }

function jalCal(jy) {
  const breaks = [-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  if (jy < jp || jy >= breaks[bl - 1]) throw new Error("Invalid Jalaali year " + jy);
  let jump = 0, jm = 0;
  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
    + div(153 * mod(gm + 9, 12) + 2, 5)
    + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}
function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}
function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}
function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  let r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm, jd;
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (jalCal(jy).leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}
function toJalaali(gy, gm, gd) { return d2j(g2d(gy, gm, gd)); }
function isLeapJalaaliYear(jy) { return jalCal(jy).leap === 0; }
function jalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaaliYear(jy) ? 30 : 29;
}
function todayJalali() {
  const t = new Date();
  return toJalaali(t.getFullYear(), t.getMonth() + 1, t.getDate());
}
function jalaliRank(v) { return (!v || !v.jy) ? 0 : v.jy * 372 + v.jm * 31 + v.jd; }
function jalaliValid(v) { return !!(v && v.jy && v.jm && v.jd); }
function jalaliStr(v) { return jalaliValid(v) ? `${v.jd} ${MONTHS[v.jm - 1]} ${v.jy}` : "—"; }
function jalaliMonthKey(v) { return jalaliValid(v) ? `${v.jy}-${String(v.jm).padStart(2, "0")}` : null; }

const MONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];

/* ============ helpers ============ */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function toman(n) { return (Number(n) || 0).toLocaleString("en-US") + " تومان"; }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
function getByPath(obj, path) { return path.split(".").reduce((a, p) => (a == null ? a : a[p]), obj); }
function setByPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

/* ============ persistence ============ */
const STORAGE_KEY = "financeAppData_v1";
const DEFAULT_CATEGORIES = ["خوراک", "پوشاک", "سلامت و بهداشت", "حمل و نقل", "قبوض", "تفریح و سرگرمی", "متفرقه"];
function loadState() {
  let s = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) s = JSON.parse(raw);
  } catch (e) { /* ignore */ }
  if (!s) s = {};
  s.incomes = s.incomes || [];
  s.expenses = s.expenses || [];
  s.debts = s.debts || [];
  s.credits = s.credits || [];
  s.futureExpenses = s.futureExpenses || [];
  s.notes = s.notes || [];
  s.ledgers = s.ledgers || [];
  s.categories = s.categories && s.categories.length ? s.categories : DEFAULT_CATEGORIES.slice();
  return s;
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

const state = loadState();
let activeTab = "overview";
const drafts = {
  income: { amount: "", source: "", date: todayJalali() },
  expense: { amount: "", for: "", date: todayJalali(), category: state.categories[0] || "" },
  debt: { amount: "", for: "", creditor: "", date: todayJalali() },
  credit: { amount: "", for: "", debtor: "", date: todayJalali() },
  future: { amount: "", for: "", date: null },
  note: "",
  overviewMonth: null,
  report: { from: { jy: todayJalali().jy, jm: todayJalali().jm, jd: 1 }, to: todayJalali() },
  search: "",
  archiveView: "months",
  ledgerName: "",
  ledgerEntry: { amount: "", for: "", date: todayJalali() },
  openLedger: null,
};
const formErrors = {};
const CONFIRM_MSG = "آیا مطمئن هستید که حذف شود؟";

const TOP_TABS = [
  { key: "overview", label: "نمای کلی" },
  { key: "income", label: "درآمدها" },
  { key: "expense", label: "هزینه‌ها" },
  { key: "debt", label: "بدهی" },
  { key: "credit", label: "طلب" },
];
const BOTTOM_TABS = [
  { key: "future", label: "هزینه‌های آتی", icon: "📅" },
  { key: "notes", label: "یادداشت", icon: "📝" },
  { key: "archive", label: "بایگانی", icon: "🗂️" },
  { key: "report", label: "گزارش", icon: "📊" },
  { key: "ledger", label: "دفتر موقت", icon: "📒" },
];
function currentMonthKey() { return jalaliMonthKey(todayJalali()); }
let reportRange = null;

/* ============ derived totals ============ */
function sum(arr, f) { return arr.reduce((s, x) => s + (Number(f ? f(x) : x.amount) || 0), 0); }
function totals() {
  const totalIncome = sum(state.incomes);
  const totalExpense = sum(state.expenses);
  const totalDebt = sum(state.debts.filter((d) => !d.paid));
  const totalCredit = sum(state.credits.filter((c) => !c.received));
  const totalFuture = sum(state.futureExpenses);
  return { totalIncome, totalExpense, totalDebt, totalCredit, totalFuture, balance: totalIncome - totalExpense };
}
function monthlyBreakdown() {
  const map = {};
  state.incomes.forEach((i) => {
    const k = jalaliMonthKey(i.date);
    if (!k) return;
    map[k] = map[k] || { income: 0, expense: 0 };
    map[k].income += Number(i.amount || 0);
  });
  state.expenses.forEach((i) => {
    const k = jalaliMonthKey(i.date);
    if (!k) return;
    map[k] = map[k] || { income: 0, expense: 0 };
    map[k].expense += Number(i.amount || 0);
  });
  return Object.entries(map)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([k, v]) => {
      const [jy, jm] = k.split("-").map(Number);
      return { key: k, jy, jm, income: v.income, expense: v.expense, net: v.income - v.expense };
    });
}
function monthsWithData() {
  const keys = new Set();
  [state.incomes, state.expenses, state.debts, state.credits].forEach((arr) => {
    arr.forEach((i) => { const k = jalaliMonthKey(i.date); if (k) keys.add(k); });
  });
  keys.add(currentMonthKey());
  return Array.from(keys).sort((a, b) => b.localeCompare(a));
}
function monthSummary(monthKey) {
  const incomes = state.incomes.filter((i) => jalaliMonthKey(i.date) === monthKey);
  const expenses = state.expenses.filter((i) => jalaliMonthKey(i.date) === monthKey);
  const debtsAdded = state.debts.filter((i) => jalaliMonthKey(i.date) === monthKey);
  const creditsAdded = state.credits.filter((i) => jalaliMonthKey(i.date) === monthKey);
  const income = sum(incomes);
  const expense = sum(expenses);
  return { income, expense, net: income - expense, debtAdded: sum(debtsAdded), creditAdded: sum(creditsAdded) };
}
function categoryBreakdown() {
  const map = {};
  state.expenses.forEach((e) => {
    const cat = e.category || "بدون دسته‌بندی";
    map[cat] = (map[cat] || 0) + Number(e.amount || 0);
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

/* ============ actions ============ */
function addIncome() {
  const amt = Number(drafts.income.amount);
  if (!amt || amt <= 0) { formErrors.income = "لطفاً مبلغ معتبر وارد کنید."; render(); return; }
  if (!jalaliValid(drafts.income.date)) { formErrors.income = "لطفاً تاریخ را کامل انتخاب کنید."; render(); return; }
  state.incomes.unshift({ id: uid(), amount: amt, source: drafts.income.source || "", date: { ...drafts.income.date } });
  persist();
  drafts.income = { amount: "", source: "", date: todayJalali() };
  formErrors.income = "";
  render();
}
function addExpense() {
  const amt = Number(drafts.expense.amount);
  if (!amt || amt <= 0) { formErrors.expense = "لطفاً مبلغ معتبر وارد کنید."; render(); return; }
  if (!jalaliValid(drafts.expense.date)) { formErrors.expense = "لطفاً تاریخ را کامل انتخاب کنید."; render(); return; }
  state.expenses.unshift({ id: uid(), amount: amt, for: drafts.expense.for || "", category: drafts.expense.category || "", date: { ...drafts.expense.date } });
  persist();
  drafts.expense = { amount: "", for: "", date: todayJalali(), category: drafts.expense.category || state.categories[0] || "" };
  formErrors.expense = "";
  render();
}
function addDebt() {
  const amt = Number(drafts.debt.amount);
  if (!amt || amt <= 0) { formErrors.debt = "لطفاً مبلغ معتبر وارد کنید."; render(); return; }
  if (!jalaliValid(drafts.debt.date)) { formErrors.debt = "لطفاً تاریخ را کامل انتخاب کنید."; render(); return; }
  state.debts.unshift({ id: uid(), amount: amt, for: drafts.debt.for || "", creditor: drafts.debt.creditor || "", date: { ...drafts.debt.date }, paid: false, linkedExpenseId: null });
  persist();
  drafts.debt = { amount: "", for: "", creditor: "", date: todayJalali() };
  formErrors.debt = "";
  render();
}
function addCredit() {
  const amt = Number(drafts.credit.amount);
  if (!amt || amt <= 0) { formErrors.credit = "لطفاً مبلغ معتبر وارد کنید."; render(); return; }
  if (!jalaliValid(drafts.credit.date)) { formErrors.credit = "لطفاً تاریخ را کامل انتخاب کنید."; render(); return; }
  state.credits.unshift({ id: uid(), amount: amt, for: drafts.credit.for || "", debtor: drafts.credit.debtor || "", date: { ...drafts.credit.date }, received: false, linkedIncomeId: null });
  persist();
  drafts.credit = { amount: "", for: "", debtor: "", date: todayJalali() };
  formErrors.credit = "";
  render();
}
function addFuture() {
  const amt = Number(drafts.future.amount);
  if (!amt || amt <= 0) { formErrors.future = "لطفاً مبلغ معتبر وارد کنید."; render(); return; }
  if (!jalaliValid(drafts.future.date)) { formErrors.future = "لطفاً روز، ماه و سال را انتخاب کنید."; render(); return; }
  state.futureExpenses.unshift({ id: uid(), amount: amt, for: drafts.future.for || "", date: { ...drafts.future.date } });
  persist();
  drafts.future = { amount: "", for: "", date: null };
  formErrors.future = "";
  render();
}
function addNote() {
  const text = drafts.note.trim();
  if (!text) { formErrors.note = "لطفاً متن یادداشت را بنویسید."; render(); return; }
  state.notes.unshift({ id: uid(), text, date: todayJalali() });
  persist();
  drafts.note = "";
  formErrors.note = "";
  render();
}
function settleDebt(id) {
  const debt = state.debts.find((d) => d.id === id);
  if (!debt || debt.paid) return;
  const expenseId = uid();
  state.expenses.unshift({
    id: expenseId, amount: debt.amount,
    for: `پرداخت بدهی: ${debt.for}${debt.creditor ? " (طلبکار: " + debt.creditor + ")" : ""}`,
    date: todayJalali(), fromDebtId: debt.id,
  });
  debt.paid = true;
  debt.paidDate = todayJalali();
  debt.linkedExpenseId = expenseId;
  persist();
  render();
}
function settleCredit(id) {
  const credit = state.credits.find((c) => c.id === id);
  if (!credit || credit.received) return;
  const incomeId = uid();
  state.incomes.unshift({
    id: incomeId, amount: credit.amount,
    source: `دریافت طلب: ${credit.for}${credit.debtor ? " (بدهکار: " + credit.debtor + ")" : ""}`,
    date: todayJalali(), fromCreditId: credit.id,
  });
  credit.received = true;
  credit.receivedDate = todayJalali();
  credit.linkedIncomeId = incomeId;
  persist();
  render();
}
function restoreDebt(id) {
  const debt = state.debts.find((d) => d.id === id);
  if (!debt) return;
  if (debt.linkedExpenseId) state.expenses = state.expenses.filter((e) => e.id !== debt.linkedExpenseId);
  debt.paid = false; debt.paidDate = null; debt.linkedExpenseId = null;
  persist(); render();
}
function restoreCredit(id) {
  const credit = state.credits.find((c) => c.id === id);
  if (!credit) return;
  if (credit.linkedIncomeId) state.incomes = state.incomes.filter((i) => i.id !== credit.linkedIncomeId);
  credit.received = false; credit.receivedDate = null; credit.linkedIncomeId = null;
  persist(); render();
}
function removeDebt(id) {
  const debt = state.debts.find((d) => d.id === id);
  // یک بدهی پرداخت‌نشده حذف می‌شود؛ بدهی بایگانی‌شده فقط از سابقه پاک می‌شود و هزینه ثبت‌شده‌اش می‌ماند
  if (debt && !debt.paid && debt.linkedExpenseId) state.expenses = state.expenses.filter((e) => e.id !== debt.linkedExpenseId);
  state.debts = state.debts.filter((d) => d.id !== id);
  persist(); render();
}
function removeCredit(id) {
  const credit = state.credits.find((c) => c.id === id);
  if (credit && !credit.received && credit.linkedIncomeId) state.incomes = state.incomes.filter((i) => i.id !== credit.linkedIncomeId);
  state.credits = state.credits.filter((c) => c.id !== id);
  persist(); render();
}

/* ---- confirm / message modal ---- */
let modalYes = null;
function askConfirm(msg, onYes) {
  modalYes = onYes;
  document.getElementById("modal-root").innerHTML = `
    <div class="modal-back"><div class="modal">
      <div class="modal-msg">${esc(msg)}</div>
      <div class="modal-actions">
        <button class="btn" data-modal="yes">بلی</button>
        <button class="btn btn-light" data-modal="no">خیر</button>
      </div>
    </div></div>`;
}
function showMessage(msg) {
  modalYes = null;
  document.getElementById("modal-root").innerHTML = `
    <div class="modal-back"><div class="modal">
      <div class="modal-msg">${esc(msg)}</div>
      <div class="modal-actions"><button class="btn" data-modal="no">باشه</button></div>
    </div></div>`;
}
function closeModal() { document.getElementById("modal-root").innerHTML = ""; modalYes = null; }

/* ---- temporary ledgers ---- */
function addLedger() {
  const name = drafts.ledgerName.trim();
  if (!name) { formErrors.ledger = "لطفاً نام دفتر را وارد کنید."; render(); return; }
  const id = uid();
  state.ledgers.unshift({ id, name, items: [] });
  persist();
  drafts.ledgerName = "";
  formErrors.ledger = "";
  drafts.openLedger = id;
  render();
}
function addLedgerEntry() {
  const led = state.ledgers.find((l) => l.id === drafts.openLedger);
  if (!led) return;
  const d = drafts.ledgerEntry;
  const amt = Number(d.amount);
  if (!amt || amt <= 0) { formErrors.ledgerEntry = "لطفاً مبلغ معتبر وارد کنید."; render(); return; }
  if (!jalaliValid(d.date)) { formErrors.ledgerEntry = "لطفاً تاریخ را کامل انتخاب کنید."; render(); return; }
  led.items.unshift({ id: uid(), amount: amt, for: d.for || "", date: { ...d.date } });
  persist();
  drafts.ledgerEntry = { amount: "", for: "", date: todayJalali() };
  formErrors.ledgerEntry = "";
  render();
}

/* ============ render helpers ============ */
function dateSelectsHTML(prefix, dateObj) {
  const y = dateObj && dateObj.jy ? dateObj.jy : "";
  const m = dateObj && dateObj.jm ? dateObj.jm : "";
  const d = dateObj && dateObj.jd ? dateObj.jd : "";
  const base = todayJalali();
  const dayCount = m ? jalaliMonthLength(y || base.jy, m) : 31;
  const years = [];
  for (let yy = base.jy - 5; yy <= base.jy + 5; yy += 1) years.push(yy);
  return `
    <div class="date-row">
      <select data-bind="${prefix}.jy" data-datepart="jy" data-prefix="${prefix}">
        <option value="" ${y ? "" : "selected"} disabled>سال</option>
        ${years.map((yy) => `<option value="${yy}" ${yy === y ? "selected" : ""}>${yy}</option>`).join("")}
      </select>
      <select dir="rtl" data-bind="${prefix}.jm" data-datepart="jm" data-prefix="${prefix}">
        <option value="" ${m ? "" : "selected"} disabled>ماه</option>
        ${MONTHS.map((mn, i) => `<option value="${i + 1}" ${i + 1 === m ? "selected" : ""}>${mn}</option>`).join("")}
      </select>
      <select data-bind="${prefix}.jd" data-datepart="jd" data-prefix="${prefix}">
        <option value="" ${d ? "" : "selected"} disabled>روز</option>
        ${Array.from({ length: dayCount }, (_, i) => i + 1).map((n) => `<option value="${n}" ${n === d ? "selected" : ""}>${n}</option>`).join("")}
      </select>
    </div>`;
}
function categorySelectHTML(bind, selected) {
  const cats = state.categories;
  return `<select data-bind="${bind}" data-category-select="true">
      <option value="" ${selected ? "" : "selected"} disabled>انتخاب دسته‌بندی</option>
      ${cats.map((c) => `<option value="${esc(c)}" ${c === selected ? "selected" : ""}>${esc(c)}</option>`).join("")}
      <option value="__new__">+ افزودن دسته‌بندی جدید...</option>
    </select>`;
}
function buildDonut(parts) {
  const filtered = parts.filter((p) => p[1] > 0);
  const grand = filtered.reduce((s, p) => s + p[1], 0);
  if (grand <= 0) return emptyHTML("داده‌ای برای نمایش نمودار وجود ندارد.");
  let acc = 0;
  const segs = filtered.map(([, val, cvar]) => {
    const start = (acc / grand) * 360;
    acc += val;
    const end = (acc / grand) * 360;
    return `var(${cvar}) ${start}deg ${end}deg`;
  });
  return `
    <div class="donut-wrap">
      <div class="donut" style="background:conic-gradient(${segs.join(",")})"></div>
      <div class="legend">
        ${filtered.map(([label, val, cvar]) => `
          <div class="legend-item">
            <span class="legend-dot" style="background:var(${cvar})"></span>
            <span>${esc(label)}:</span>
            <span class="legend-val">${toman(val)}</span>
          </div>`).join("")}
      </div>
    </div>`;
}
function monthSelectHTML(bind, selected, keys) {
  return `<select data-bind="${bind}" data-rerender="true">
      ${keys.map((k) => {
        const [jy, jm] = k.split("-").map(Number);
        return `<option value="${k}" ${k === selected ? "selected" : ""}>${MONTHS[jm - 1]} ${jy}</option>`;
      }).join("")}
    </select>`;
}
function amountFieldHTML(bind, value, placeholder) {
  const display = value === "" || value == null ? "" : Number(value).toLocaleString("en-US");
  return `<input class="input amount-field" type="text" inputmode="numeric" data-bind="${bind}" value="${display}" placeholder="${placeholder || "0"}" />`;
}
function rowHTML({ title, subtitle, amount, colorVar, date, deleteAction, deleteId, extraHTML, actionsHTML, dateLabel }) {
  return `
    <div class="row">
      <div class="row-left">
        ${extraHTML || ""}
        <div style="min-width:0;">
          <div class="row-title">${esc(title)}</div>
          ${subtitle ? `<div class="row-subtitle">${esc(subtitle)}</div>` : ""}
          <div class="row-date">${dateLabel ? esc(dateLabel) + " " : ""}${jalaliStr(date)}</div>
        </div>
      </div>
      <div class="row-right">
        <span class="row-amount" style="color:var(${colorVar})">${toman(amount)}</span>
        ${actionsHTML ? `<div class="row-actions">${actionsHTML}</div>` : ""}
        ${deleteAction ? `<button class="icon-btn" data-action="${deleteAction}" data-id="${deleteId}" title="حذف">✕</button>` : ""}
      </div>
    </div>`;
}
function emptyHTML(text) { return `<div class="empty">${esc(text)}</div>`; }
function errorHTML(key) { return formErrors[key] ? `<div class="error-text">${esc(formErrors[key])}</div>` : ""; }

/* ============ tab renderers ============ */
async function exportBackup() {
  const t = todayJalali();
  const name = `finance-backup-${t.jy}-${String(t.jm).padStart(2, "0")}-${String(t.jd).padStart(2, "0")}.json`;
  const dataStr = JSON.stringify(state, null, 2);
  const cap = window.Capacitor;
  const P = cap && cap.Plugins;
  // داخل APK دانلود مستقیم کار نمی‌کند؛ فایل را می‌سازیم و با منوی اشتراک‌گذاری ذخیره/ارسال می‌کنیم
  if (cap && cap.isNativePlatform && cap.isNativePlatform() && P && P.Filesystem && P.Share) {
    try {
      await P.Filesystem.writeFile({ path: name, data: dataStr, directory: "CACHE", encoding: "utf8" });
      const r = await P.Filesystem.getUri({ path: name, directory: "CACHE" });
      await P.Share.share({ title: "پشتیبان مدیریت مالی", url: r.uri, dialogTitle: "ذخیره یا ارسال فایل پشتیبان" });
      return;
    } catch (e) {
      if (String((e && e.message) || e).toLowerCase().includes("cancel")) return;
    }
  }
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function importBackupFile(file) {
  if (!file) return;
  askConfirm("بازیابی فایل پشتیبان، اطلاعات فعلی برنامه را جایگزین می‌کند. ادامه می‌دهید؟", () => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || typeof data !== "object") throw new Error("bad");
        state.incomes = Array.isArray(data.incomes) ? data.incomes : [];
        state.expenses = Array.isArray(data.expenses) ? data.expenses : [];
        state.debts = Array.isArray(data.debts) ? data.debts : [];
        state.credits = Array.isArray(data.credits) ? data.credits : [];
        state.futureExpenses = Array.isArray(data.futureExpenses) ? data.futureExpenses : [];
        state.notes = Array.isArray(data.notes) ? data.notes : [];
        state.ledgers = Array.isArray(data.ledgers) ? data.ledgers : [];
        state.categories = Array.isArray(data.categories) && data.categories.length ? data.categories : DEFAULT_CATEGORIES.slice();
        drafts.openLedger = null;
        persist();
        render();
        showMessage("بازیابی اطلاعات با موفقیت انجام شد.");
      } catch (err) {
        showMessage("این فایل، فایل پشتیبان معتبری نیست.");
      }
    };
    reader.readAsText(file);
  });
}

function renderSettings() {
  return `
    <div class="stack">
      <div class="card">
        <div class="section-title">پشتیبان‌گیری و بازیابی اطلاعات</div>
        <div class="hint-text">قبل از حذف یا نصب مجدد برنامه یا تعویض گوشی، حتماً یک فایل پشتیبان بگیرید. فایل پشتیبان شامل درآمد، هزینه، بدهی، طلب، یادداشت‌ها، دفترهای موقت و دسته‌بندی‌هاست.</div>
        <button class="btn" data-action="export-backup">دریافت فایل پشتیبان</button>
        <div style="height:8px;"></div>
        <button class="btn btn-light" data-action="trigger-import">بازیابی از فایل پشتیبان</button>
        <input type="file" id="import-file-input" style="display:none;" />
      </div>
    </div>`;
}

function renderOverview() {
  const t = totals();
  const monthly = monthlyBreakdown();
  const overallDonut = buildDonut([
    ["درآمد", t.totalIncome, "--income"],
    ["هزینه", t.totalExpense, "--expense"],
    ["بدهی (باز)", t.totalDebt, "--debt"],
    ["طلب (باز)", t.totalCredit, "--credit"],
  ]);

  const months = monthsWithData();
  const selMonth = (drafts.overviewMonth && months.includes(drafts.overviewMonth)) ? drafts.overviewMonth : months[0];
  const ms = monthSummary(selMonth);
  const [selJy, selJm] = selMonth.split("-").map(Number);
  const monthDonut = buildDonut([
    ["درآمد", ms.income, "--income"],
    ["هزینه", ms.expense, "--expense"],
    ["بدهی ثبت‌شده", ms.debtAdded, "--debt"],
    ["طلب ثبت‌شده", ms.creditAdded, "--credit"],
  ]);

  const monthlyHTML = monthly.length === 0 ? emptyHTML("هنوز تراکنشی برای گزارش ماهانه ثبت نشده.") :
    monthly.map((m) => `
      <div class="month-row">
        <div>
          <div class="month-title">${MONTHS[m.jm - 1]} ${m.jy}</div>
          <div class="month-nums">درآمد: ${toman(m.income)} — هزینه: ${toman(m.expense)}</div>
        </div>
        <div class="month-net" style="color:var(${m.net >= 0 ? "--income" : "--expense"})">${toman(m.net)}</div>
      </div>`).join("");

  const catBreak = categoryBreakdown();
  const catHTML = catBreak.length === 0 ? emptyHTML("هنوز هزینه‌ای دسته‌بندی‌شده ثبت نشده.") :
    catBreak.map(([cat, val]) => `
      <div class="month-row">
        <div class="month-title">${esc(cat)}</div>
        <div class="month-net" style="color:var(--expense)">${toman(val)}</div>
      </div>`).join("");

  return `
    <div class="stack">
      <div class="card">
        <div class="section-title">نمای کلی ماهانه</div>
        <div class="field"><span class="field-label">انتخاب ماه</span>${monthSelectHTML("overviewMonth", selMonth, months)}</div>
        <div class="grid-2" style="margin-top:4px;">
          <div><div class="stat-label">درآمد ${MONTHS[selJm - 1]} ${selJy}</div><div class="stat-value" style="color:var(--income)">${toman(ms.income)}</div></div>
          <div><div class="stat-label">هزینه ${MONTHS[selJm - 1]} ${selJy}</div><div class="stat-value" style="color:var(--expense)">${toman(ms.expense)}</div></div>
          <div><div class="stat-label">خالص این ماه</div><div class="stat-value" style="color:${ms.net >= 0 ? "var(--income)" : "var(--expense)"}">${toman(ms.net)}</div></div>
          <div><div class="stat-label">بدهی ثبت‌شده این ماه</div><div class="stat-value" style="color:var(--debt)">${toman(ms.debtAdded)}</div></div>
        </div>
        <div style="margin-top:16px;">${monthDonut}</div>
      </div>

      <div class="grid-2">
        <div class="card"><div class="stat-label">مجموع درآمد (کلی)</div><div class="stat-value" style="color:var(--income)">${toman(t.totalIncome)}</div></div>
        <div class="card"><div class="stat-label">مجموع هزینه (کلی)</div><div class="stat-value" style="color:var(--expense)">${toman(t.totalExpense)}</div></div>
        <div class="card"><div class="stat-label">بدهی باز</div><div class="stat-value" style="color:var(--debt)">${toman(t.totalDebt)}</div></div>
        <div class="card"><div class="stat-label">طلب باز</div><div class="stat-value" style="color:var(--credit)">${toman(t.totalCredit)}</div></div>
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div class="stat-label">مجموع هزینه‌های آینده (قطعی‌نشده)</div>
          <div class="stat-value" style="color:var(--future)">${toman(t.totalFuture)}</div>
        </div>
      </div>
      <div class="card">
        <div class="stat-label">مانده کلی (درآمد منهای هزینه)</div>
        <div class="stat-value" style="color:${t.balance >= 0 ? "var(--income)" : "var(--expense)"}">${toman(t.balance)}</div>
      </div>
      <div class="card">
        <div class="section-title">تفکیک ماه‌به‌ماه</div>
        ${monthlyHTML}
      </div>
      <div class="card">
        <div class="section-title">دسته‌بندی هزینه‌ها</div>
        ${catHTML}
      </div>
      <div class="card">
        <div class="section-title">نمودار وضعیت مالی (کلی، از ابتدا)</div>
        ${overallDonut}
      </div>
    </div>`;
}

function renderIncome() {
  const d = drafts.income;
  const curKey = currentMonthKey();
  const visible = state.incomes.filter((i) => { const k = jalaliMonthKey(i.date); return !k || k >= curKey; });
  const list = visible.length === 0 ? emptyHTML("هنوز درآمدی برای این ماه ثبت نشده.") :
    visible.map((i) => rowHTML({ title: i.source || "بدون عنوان", amount: i.amount, colorVar: "--income", date: i.date, deleteAction: "delete-income", deleteId: i.id })).join("");
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">مبلغ (تومان)</span>${amountFieldHTML("income.amount", d.amount, "5,000,000")}</div>
        <div class="field"><span class="field-label">تاریخ</span>${dateSelectsHTML("income.date", d.date)}</div>
        <div class="field"><span class="field-label">محل درآمد</span><input class="input" data-bind="income.source" value="${esc(d.source)}" placeholder="مثلاً حقوق، فریلنسری، فروش..." /></div>
        <button class="btn" data-action="add-income">+ ثبت درآمد</button>
        ${errorHTML("income")}
      </div>
      <div class="hint-text">درآمدهای ماه‌های گذشته در تب «بایگانی» قابل مشاهده‌اند.</div>
      <div class="card">${list}</div>
    </div>`;
}

function renderExpense() {
  const d = drafts.expense;
  const curKey = currentMonthKey();
  const visible = state.expenses.filter((i) => { const k = jalaliMonthKey(i.date); return !k || k >= curKey; });
  const list = visible.length === 0 ? emptyHTML("هنوز هزینه‌ای برای این ماه ثبت نشده.") :
    visible.map((i) => rowHTML({
      title: i.for || "بدون عنوان",
      subtitle: [i.category, i.fromDebtId ? "بابت پرداخت بدهی" : null].filter(Boolean).join(" — ") || null,
      amount: i.amount, colorVar: "--expense", date: i.date, deleteAction: "delete-expense", deleteId: i.id,
    })).join("");
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">مبلغ (تومان)</span>${amountFieldHTML("expense.amount", d.amount, "250,000")}</div>
        <div class="field"><span class="field-label">تاریخ</span>${dateSelectsHTML("expense.date", d.date)}</div>
        <div class="field"><span class="field-label">بابت</span><input class="input" data-bind="expense.for" value="${esc(d.for)}" placeholder="مثلاً خرید، قبض، حمل‌ونقل..." /></div>
        <div class="field"><span class="field-label">دسته‌بندی</span>${categorySelectHTML("expense.category", d.category)}</div>
        <button class="btn" data-action="add-expense">+ ثبت هزینه</button>
        ${errorHTML("expense")}
      </div>
      <div class="hint-text">هزینه‌های ماه‌های گذشته در تب «بایگانی» قابل مشاهده‌اند.</div>
      <div class="card">${list}</div>
    </div>`;
}

function renderDebt() {
  const d = drafts.debt;
  const open = state.debts.filter((x) => !x.paid);
  const list = open.length === 0 ? emptyHTML("بدهی بازی وجود ندارد.") :
    open.map((x) => rowHTML({
      title: `${x.for || "بدون عنوان"}${x.creditor ? " — " + x.creditor : ""}`,
      subtitle: "پرداخت‌نشده",
      amount: x.amount, colorVar: "--debt", date: x.date,
      deleteAction: "delete-debt", deleteId: x.id,
      extraHTML: `<input type="checkbox" class="checkbox" data-action="toggle-debt" data-id="${x.id}" />`,
    })).join("");
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">مبلغ (تومان)</span>${amountFieldHTML("debt.amount", d.amount)}</div>
        <div class="field"><span class="field-label">تاریخ</span>${dateSelectsHTML("debt.date", d.date)}</div>
        <div class="field"><span class="field-label">بابت</span><input class="input" data-bind="debt.for" value="${esc(d.for)}" placeholder="مثلاً وام، قرض..." /></div>
        <div class="field"><span class="field-label">نام طلبکار</span><input class="input" data-bind="debt.creditor" value="${esc(d.creditor)}" placeholder="طرف بدهی" /></div>
        <button class="btn" data-action="add-debt">+ ثبت بدهی</button>
        ${errorHTML("debt")}
      </div>
      <div class="card">
        <div class="hint-text">با تیک‌زدن و تأیید پرداخت، بدهی به «بایگانی ← سابقه بدهی» می‌رود و مبلغ آن در «هزینه‌ها» ثبت می‌شود.</div>
        ${list}
      </div>
    </div>`;
}

function renderCredit() {
  const d = drafts.credit;
  const open = state.credits.filter((x) => !x.received);
  const list = open.length === 0 ? emptyHTML("طلب بازی وجود ندارد.") :
    open.map((x) => rowHTML({
      title: `${x.for || "بدون عنوان"}${x.debtor ? " — " + x.debtor : ""}`,
      subtitle: "دریافت‌نشده",
      amount: x.amount, colorVar: "--credit", date: x.date,
      deleteAction: "delete-credit", deleteId: x.id,
      extraHTML: `<input type="checkbox" class="checkbox" data-action="toggle-credit" data-id="${x.id}" />`,
    })).join("");
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">مبلغ (تومان)</span>${amountFieldHTML("credit.amount", d.amount)}</div>
        <div class="field"><span class="field-label">تاریخ</span>${dateSelectsHTML("credit.date", d.date)}</div>
        <div class="field"><span class="field-label">بابت</span><input class="input" data-bind="credit.for" value="${esc(d.for)}" placeholder="مثلاً قرض‌دادن..." /></div>
        <div class="field"><span class="field-label">نام بدهکار</span><input class="input" data-bind="credit.debtor" value="${esc(d.debtor)}" placeholder="طرف طلب" /></div>
        <button class="btn" data-action="add-credit">+ ثبت طلب</button>
        ${errorHTML("credit")}
      </div>
      <div class="card">
        <div class="hint-text">با تیک‌زدن و تأیید وصول، طلب به «بایگانی ← سابقه طلب» می‌رود و مبلغ آن در «درآمدها» ثبت می‌شود.</div>
        ${list}
      </div>
    </div>`;
}

function renderFuture() {
  const d = drafts.future;
  const sorted = [...state.futureExpenses].sort((a, b) => jalaliRank(a.date) - jalaliRank(b.date));
  const list = sorted.length === 0 ? emptyHTML("هزینه آینده‌ای ثبت نشده.") :
    sorted.map((f) => rowHTML({ title: f.for || "بدون عنوان", amount: f.amount, colorVar: "--future", date: f.date, deleteAction: "delete-future", deleteId: f.id })).join("");
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">مبلغ (تومان)</span>${amountFieldHTML("future.amount", d.amount)}</div>
        <div class="field"><span class="field-label">تاریخ (باید دستی انتخاب شود)</span>${dateSelectsHTML("future.date", d.date)}</div>
        <div class="field"><span class="field-label">بابت</span><input class="input" data-bind="future.for" value="${esc(d.for)}" placeholder="مثلاً قسط، اجاره..." /></div>
        <button class="btn" data-action="add-future">+ ثبت هزینه آینده</button>
        ${errorHTML("future")}
      </div>
      <div class="card">${list}</div>
    </div>`;
}

function renderArchive() {
  const view = drafts.archiveView;
  const pills = `
    <div class="pills">
      <button class="pill ${view === "months" ? "active" : ""}" data-action="archive-view" data-view="months">ماه‌های گذشته</button>
      <button class="pill ${view === "credits" ? "active" : ""}" data-action="archive-view" data-view="credits">سابقه طلب</button>
      <button class="pill ${view === "debts" ? "active" : ""}" data-action="archive-view" data-view="debts">سابقه بدهی</button>
    </div>`;
  let body = "";
  if (view === "credits") {
    const items = state.credits.filter((c) => c.received);
    body = items.length === 0 ? `<div class="card">${emptyHTML("هنوز طلبی وصول نشده است.")}</div>` :
      `<div class="card"><div class="month-nums" style="margin-bottom:6px;">جمع طلب‌های وصول‌شده: ${toman(sum(items))}</div>${items.map((x) => rowHTML({
        title: `${x.for || "بدون عنوان"}${x.debtor ? " — " + x.debtor : ""}`,
        subtitle: x.receivedDate ? `وصول‌شده: ${jalaliStr(x.receivedDate)}` : "وصول‌شده",
        amount: x.amount, colorVar: "--credit", date: x.date, dateLabel: "ثبت:",
        deleteAction: "delete-credit", deleteId: x.id,
        actionsHTML: `<button class="link-btn" data-action="restore-credit" data-id="${x.id}">بازگردانی</button>`,
      })).join("")}</div>`;
  } else if (view === "debts") {
    const items = state.debts.filter((d) => d.paid);
    body = items.length === 0 ? `<div class="card">${emptyHTML("هنوز بدهی‌ای پرداخت نشده است.")}</div>` :
      `<div class="card"><div class="month-nums" style="margin-bottom:6px;">جمع بدهی‌های پرداخت‌شده: ${toman(sum(items))}</div>${items.map((x) => rowHTML({
        title: `${x.for || "بدون عنوان"}${x.creditor ? " — " + x.creditor : ""}`,
        subtitle: x.paidDate ? `پرداخت‌شده: ${jalaliStr(x.paidDate)}` : "پرداخت‌شده",
        amount: x.amount, colorVar: "--debt", date: x.date, dateLabel: "ثبت:",
        deleteAction: "delete-debt", deleteId: x.id,
        actionsHTML: `<button class="link-btn" data-action="restore-debt" data-id="${x.id}">بازگردانی</button>`,
      })).join("")}</div>`;
  } else {
    const curKey = currentMonthKey();
    const archIncomes = state.incomes.filter((i) => { const k = jalaliMonthKey(i.date); return k && k < curKey; });
    const archExpenses = state.expenses.filter((i) => { const k = jalaliMonthKey(i.date); return k && k < curKey; });
    if (archIncomes.length === 0 && archExpenses.length === 0) {
      body = `<div class="card">${emptyHTML("هنوز ماه گذشته‌ای وجود ندارد. با تمام‌شدن هر ماه، درآمدها و هزینه‌های آن ماه خودکار به اینجا منتقل می‌شوند.")}</div>`;
    } else {
      const map = {};
      archIncomes.forEach((i) => { const k = jalaliMonthKey(i.date); map[k] = map[k] || { incomes: [], expenses: [] }; map[k].incomes.push(i); });
      archExpenses.forEach((i) => { const k = jalaliMonthKey(i.date); map[k] = map[k] || { incomes: [], expenses: [] }; map[k].expenses.push(i); });
      body = Object.keys(map).sort((a, b) => b.localeCompare(a)).map((k) => {
        const [jy, jm] = k.split("-").map(Number);
        const group = map[k];
        const rows = [
          ...group.incomes.map((i) => rowHTML({ title: i.source || "بدون عنوان", amount: i.amount, colorVar: "--income", date: i.date, deleteAction: "delete-income", deleteId: i.id })),
          ...group.expenses.map((i) => rowHTML({
            title: i.for || "بدون عنوان",
            subtitle: [i.category, i.fromDebtId ? "بابت پرداخت بدهی" : null].filter(Boolean).join(" — ") || null,
            amount: i.amount, colorVar: "--expense", date: i.date, deleteAction: "delete-expense", deleteId: i.id,
          })),
        ].join("");
        return `
          <div class="card">
            <div class="section-title">${MONTHS[jm - 1]} ${jy}</div>
            <div class="month-nums" style="margin-bottom:8px;">درآمد: ${toman(sum(group.incomes))} — هزینه: ${toman(sum(group.expenses))}</div>
            ${rows}
          </div>`;
      }).join("");
    }
  }
  return `<div class="stack">${pills}${body}</div>`;
}

function generateReport() {
  if (!jalaliValid(drafts.report.from) || !jalaliValid(drafts.report.to)) {
    formErrors.report = "لطفاً بازه تاریخی (از تاریخ و تا تاریخ) را کامل انتخاب کنید.";
    render();
    return;
  }
  reportRange = { from: { ...drafts.report.from }, to: { ...drafts.report.to } };
  formErrors.report = "";
  render();
}
function renderReport() {
  const d = drafts.report;
  let body = "";
  if (reportRange) {
    const lo = Math.min(jalaliRank(reportRange.from), jalaliRank(reportRange.to));
    const hi = Math.max(jalaliRank(reportRange.from), jalaliRank(reportRange.to));
    const inRange = (x) => { const r = jalaliRank(x.date); return r >= lo && r <= hi; };
    const byDate = (a, b) => jalaliRank(a.date) - jalaliRank(b.date);
    const incomes = state.incomes.filter(inRange).sort(byDate);
    const expenses = state.expenses.filter(inRange).sort(byDate);
    const ti = sum(incomes), te = sum(expenses), net = ti - te;
    const cats = {};
    expenses.forEach((e) => { const c = e.category || "بدون دسته‌بندی"; cats[c] = (cats[c] || 0) + Number(e.amount || 0); });
    const catRows = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c, v]) => `
      <div class="month-row"><div class="month-title">${esc(c)}</div><div class="month-net" style="color:var(--expense)">${toman(v)}</div></div>`).join("");
    body = `
      <div class="card">
        <div class="section-title">گزارش کلی</div>
        <div class="month-nums" style="margin-bottom:10px;">${jalaliStr(reportRange.from)} تا ${jalaliStr(reportRange.to)}</div>
        <div class="summary-3">
          <div class="sbox"><div class="stat-label">جمع درآمد</div><div class="stat-value" style="color:var(--income)">${toman(ti)}</div></div>
          <div class="sbox"><div class="stat-label">جمع هزینه</div><div class="stat-value" style="color:var(--expense)">${toman(te)}</div></div>
          <div class="sbox"><div class="stat-label">مانده</div><div class="stat-value" style="color:${net >= 0 ? "var(--income)" : "var(--expense)"}">${toman(net)}</div></div>
        </div>
      </div>
      ${catRows ? `<div class="card"><div class="section-title">هزینه به تفکیک دسته‌بندی</div>${catRows}</div>` : ""}
      <div class="card">
        <div class="section-title">ریز درآمدها (${incomes.length} مورد)</div>
        <div class="month-nums" style="margin-bottom:6px;">جمع: ${toman(ti)}</div>
        ${incomes.length === 0 ? emptyHTML("درآمدی در این بازه یافت نشد.") :
          incomes.map((i) => rowHTML({ title: i.source || "بدون عنوان", amount: i.amount, colorVar: "--income", date: i.date })).join("")}
      </div>
      <div class="card">
        <div class="section-title">ریز هزینه‌ها (${expenses.length} مورد)</div>
        <div class="month-nums" style="margin-bottom:6px;">جمع: ${toman(te)}</div>
        ${expenses.length === 0 ? emptyHTML("هزینه‌ای در این بازه یافت نشد.") :
          expenses.map((i) => rowHTML({ title: i.for || "بدون عنوان", subtitle: i.category, amount: i.amount, colorVar: "--expense", date: i.date })).join("")}
      </div>`;
  }
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">از تاریخ</span>${dateSelectsHTML("report.from", d.from)}</div>
        <div class="field"><span class="field-label">تا تاریخ</span>${dateSelectsHTML("report.to", d.to)}</div>
        <button class="btn" data-action="generate-report">نمایش گزارش مالی</button>
        ${errorHTML("report")}
      </div>
      ${body}
    </div>`;
}

function renderLedger() {
  const led = state.ledgers.find((l) => l.id === drafts.openLedger);
  if (led) {
    const d = drafts.ledgerEntry;
    const total = sum(led.items);
    const items = [...led.items].sort((a, b) => jalaliRank(b.date) - jalaliRank(a.date));
    const list = items.length === 0 ? emptyHTML("هنوز هزینه‌ای در این دفتر ثبت نشده.") :
      items.map((i) => rowHTML({ title: i.for || "بدون عنوان", amount: i.amount, colorVar: "--expense", date: i.date, deleteAction: "delete-ledger-entry", deleteId: i.id })).join("");
    return `
      <div class="stack">
        <button class="back-btn" data-action="close-ledger">→ بازگشت به دفترها</button>
        <div class="ledger-total">
          <div><div class="lt-name">${esc(led.name)}</div><div class="lt-label">جمع کل هزینه‌ها (${led.items.length} مورد)</div></div>
          <div class="lt-val">${toman(total)}</div>
        </div>
        <div class="card">
          <div class="field"><span class="field-label">مبلغ (تومان)</span>${amountFieldHTML("ledgerEntry.amount", d.amount)}</div>
          <div class="field"><span class="field-label">تاریخ</span>${dateSelectsHTML("ledgerEntry.date", d.date)}</div>
          <div class="field"><span class="field-label">بابت</span><input class="input" data-bind="ledgerEntry.for" value="${esc(d.for)}" placeholder="مثلاً بنزین، ناهار، هتل..." /></div>
          <button class="btn" data-action="add-ledger-entry">+ ثبت هزینه</button>
          ${errorHTML("ledgerEntry")}
        </div>
        <div class="card">${list}</div>
        <button class="btn btn-light" data-action="delete-ledger" data-id="${led.id}">حذف این دفتر</button>
      </div>`;
  }
  const list = state.ledgers.length === 0 ? emptyHTML("هنوز دفتری ساخته نشده. مثلاً «سفر شمال» یا «دورهمی».") :
    state.ledgers.map((l) => `
      <div class="ledger-item" data-action="open-ledger" data-id="${l.id}">
        <div style="min-width:0;">
          <div class="row-title">${esc(l.name)}</div>
          <div class="row-subtitle">${l.items.length} هزینه</div>
        </div>
        <span class="row-amount" style="color:var(--expense)">${toman(sum(l.items))}</span>
      </div>`).join("");
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">نام دفتر جدید</span><input class="input" data-bind="ledgerName" value="${esc(drafts.ledgerName)}" placeholder="مثلاً سفر مشهد" /></div>
        <button class="btn" data-action="add-ledger">+ ساخت دفتر</button>
        ${errorHTML("ledger")}
      </div>
      <div class="hint-text">دفترهای موقت جدا از حساب اصلی هستند و در موجودی، بایگانی و گزارش‌ها حساب نمی‌شوند.</div>
      <div class="card">${list}</div>
    </div>`;
}

function searchResultsHTML(query) {
  const q = (query || "").trim();
  if (!q) return emptyHTML("عبارت یا عددی برای جستجو وارد کنید.");
  const qLower = q.toLowerCase();
  const qDigits = q.replace(/[^\d]/g, "");
  function matchText(...fields) { return fields.some((f) => f && String(f).toLowerCase().includes(qLower)); }
  function matchAmount(amount) { return qDigits.length > 0 && String(Math.trunc(Number(amount) || 0)).includes(qDigits); }
  const incomes = state.incomes.filter((i) => matchText(i.source) || matchAmount(i.amount));
  const expenses = state.expenses.filter((i) => matchText(i.for, i.category) || matchAmount(i.amount));
  const debts = state.debts.filter((i) => matchText(i.for, i.creditor) || matchAmount(i.amount));
  const credits = state.credits.filter((i) => matchText(i.for, i.debtor) || matchAmount(i.amount));
  if (incomes.length + expenses.length + debts.length + credits.length === 0) return emptyHTML("نتیجه‌ای یافت نشد.");
  function section(title, items, renderer) {
    if (items.length === 0) return "";
    return `<div class="card"><div class="section-title">${esc(title)} (${items.length})</div>${items.map(renderer).join("")}</div>`;
  }
  return [
    section("درآمدها", incomes, (i) => rowHTML({ title: i.source || "بدون عنوان", amount: i.amount, colorVar: "--income", date: i.date, deleteAction: "delete-income", deleteId: i.id })),
    section("هزینه‌ها", expenses, (i) => rowHTML({ title: i.for || "بدون عنوان", subtitle: i.category, amount: i.amount, colorVar: "--expense", date: i.date, deleteAction: "delete-expense", deleteId: i.id })),
    section("بدهی‌ها", debts, (x) => rowHTML({ title: `${x.for || "بدون عنوان"}${x.creditor ? " — " + x.creditor : ""}`, subtitle: x.paid ? "پرداخت شد" : "پرداخت‌نشده", amount: x.amount, colorVar: x.paid ? "--muted" : "--debt", date: x.date, deleteAction: "delete-debt", deleteId: x.id })),
    section("طلب‌ها", credits, (x) => rowHTML({ title: `${x.for || "بدون عنوان"}${x.debtor ? " — " + x.debtor : ""}`, subtitle: x.received ? "دریافت شد" : "دریافت‌نشده", amount: x.amount, colorVar: x.received ? "--muted" : "--credit", date: x.date, deleteAction: "delete-credit", deleteId: x.id })),
  ].join("");
}
function renderSearch() {
  return `
    <div class="stack">
      <div class="card">
        <div class="field">
          <span class="field-label">جستجو (متن یا عدد)</span>
          <input class="input" id="search-input" data-live-search="true" value="${esc(drafts.search)}" placeholder="مثلاً: قبض یا 50000" />
        </div>
      </div>
      <div id="search-results">${searchResultsHTML(drafts.search)}</div>
    </div>`;
}

function renderNotes() {
  const notesHTML = state.notes.length === 0 ? emptyHTML("هنوز یادداشتی ثبت نشده.") :
    state.notes.map((n) => `
      <div class="card note-card">
        <div class="note-date">${jalaliStr(n.date)}</div>
        <div class="note-text">${esc(n.text)}</div>
        <button class="icon-btn note-delete" data-action="delete-note" data-id="${n.id}">✕</button>
      </div>`).join("");
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">یادداشت</span><textarea rows="3" data-bind="note" placeholder="نکته‌ای درباره وضعیت مالی خود بنویسید...">${esc(drafts.note)}</textarea></div>
        <button class="btn" data-action="add-note">+ افزودن یادداشت</button>
        ${errorHTML("note")}
      </div>
      ${notesHTML}
    </div>`;
}

const RENDERERS = {
  overview: renderOverview, income: renderIncome, expense: renderExpense,
  debt: renderDebt, credit: renderCredit, future: renderFuture, archive: renderArchive,
  report: renderReport, search: renderSearch, notes: renderNotes,
  ledger: renderLedger, settings: renderSettings,
};

/* ============ main render + events ============ */
function render() {
  const t = totals();
  document.getElementById("balance-value").textContent = toman(t.balance);
  document.getElementById("tabs").innerHTML = TOP_TABS.map((tb) =>
    `<button class="tab-btn ${tb.key === activeTab ? "active" : ""}" data-action="set-tab" data-tab="${tb.key}">${tb.label}</button>`
  ).join("");
  document.getElementById("bottom-nav").innerHTML = BOTTOM_TABS.map((tb) =>
    `<button class="nav-btn ${tb.key === activeTab ? "active" : ""}" data-action="set-tab" data-tab="${tb.key}"><span class="nav-ico">${tb.icon}</span><span>${tb.label}</span></button>`
  ).join("");
  document.getElementById("content").innerHTML = RENDERERS[activeTab]();
}

function attachEvents() {
  const root = document.getElementById("app");

  document.getElementById("modal-root").addEventListener("click", (e) => {
    const el = e.target.closest("[data-modal]");
    if (!el) return;
    const cb = el.dataset.modal === "yes" ? modalYes : null;
    closeModal();
    if (cb) cb();
  });

  root.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.liveSearch) {
      drafts.search = el.value;
      const resultsEl = document.getElementById("search-results");
      if (resultsEl) resultsEl.innerHTML = searchResultsHTML(drafts.search);
      return;
    }
    const bind = el.dataset.bind;
    if (!bind) return;
    let val = el.value;
    if (el.classList.contains("amount-field")) {
      const digits = val.replace(/[^\d]/g, "");
      const num = digits ? parseInt(digits, 10) : "";
      el.value = num === "" ? "" : num.toLocaleString("en-US");
      setByPath(drafts, bind, num === "" ? "" : String(num));
      return;
    }
    if (el.dataset.datepart) {
      const num = val === "" ? "" : parseInt(val, 10);
      setByPath(drafts, bind, num);
      if (el.dataset.datepart === "jm") {
        const dateObj = getByPath(drafts, el.dataset.prefix);
        if (dateObj && dateObj.jd) {
          const max = jalaliMonthLength(dateObj.jy || todayJalali().jy, dateObj.jm);
          if (dateObj.jd > max) dateObj.jd = max;
        }
        render();
      }
      return;
    }
    setByPath(drafts, bind, val);
    if (el.dataset.rerender) render();
  });

  const del = (msg, fn) => askConfirm(msg || CONFIRM_MSG, fn);

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    const id = el.dataset.id;
    const map = {
      "set-tab": () => { activeTab = el.dataset.tab; window.scrollTo(0, 0); render(); },
      "add-income": addIncome, "add-expense": addExpense, "add-debt": addDebt,
      "add-credit": addCredit, "add-future": addFuture, "add-note": addNote,
      "delete-income": () => del(null, () => { state.incomes = state.incomes.filter((x) => x.id !== id); persist(); render(); }),
      "delete-expense": () => del(null, () => { state.expenses = state.expenses.filter((x) => x.id !== id); persist(); render(); }),
      "delete-debt": () => del(null, () => removeDebt(id)),
      "delete-credit": () => del(null, () => removeCredit(id)),
      "delete-future": () => del(null, () => { state.futureExpenses = state.futureExpenses.filter((x) => x.id !== id); persist(); render(); }),
      "delete-note": () => del(null, () => { state.notes = state.notes.filter((x) => x.id !== id); persist(); render(); }),
      "restore-debt": () => del("این بدهی به لیست بدهی‌ها برگردد و هزینه ثبت‌شده‌اش حذف شود؟", () => restoreDebt(id)),
      "restore-credit": () => del("این طلب به لیست طلب‌ها برگردد و درآمد ثبت‌شده‌اش حذف شود؟", () => restoreCredit(id)),
      "archive-view": () => { drafts.archiveView = el.dataset.view; render(); },
      "generate-report": generateReport,
      "export-backup": exportBackup,
      "trigger-import": () => { const inp = document.getElementById("import-file-input"); if (inp) inp.click(); },
      "add-ledger": addLedger,
      "add-ledger-entry": addLedgerEntry,
      "open-ledger": () => { drafts.openLedger = id; drafts.ledgerEntry = { amount: "", for: "", date: todayJalali() }; formErrors.ledgerEntry = ""; window.scrollTo(0, 0); render(); },
      "close-ledger": () => { drafts.openLedger = null; render(); },
      "delete-ledger-entry": () => del(null, () => {
        const led = state.ledgers.find((l) => l.id === drafts.openLedger);
        if (led) { led.items = led.items.filter((x) => x.id !== id); persist(); render(); }
      }),
      "delete-ledger": () => del("این دفتر و همه هزینه‌های آن حذف شود؟", () => {
        state.ledgers = state.ledgers.filter((l) => l.id !== id);
        drafts.openLedger = null; persist(); render();
      }),
    };
    if (map[action]) map[action]();
  });

  root.addEventListener("change", (e) => {
    const el = e.target;
    if (el.id === "import-file-input" && el.files && el.files[0]) {
      importBackupFile(el.files[0]);
      el.value = "";
      return;
    }
    if (el.dataset.action === "toggle-debt") {
      el.checked = false;
      const id = el.dataset.id;
      askConfirm("آیا از پرداخت بدهی مطمئن هستید؟", () => settleDebt(id));
      return;
    }
    if (el.dataset.action === "toggle-credit") {
      el.checked = false;
      const id = el.dataset.id;
      askConfirm("آیا از وصول طلب مطمئن هستید؟", () => settleCredit(id));
      return;
    }
    if (el.dataset.categorySelect && el.value === "__new__") {
      const name = window.prompt("نام دسته‌بندی جدید را وارد کنید:");
      const trimmed = name && name.trim();
      if (trimmed) {
        if (!state.categories.includes(trimmed)) state.categories.push(trimmed);
        setByPath(drafts, el.dataset.bind, trimmed);
        persist();
      } else {
        setByPath(drafts, el.dataset.bind, state.categories[0] || "");
      }
      render();
    }
  });
}

attachEvents();
render();
