/* ============================================================
   Cash-Flow Tracker — Sprint 02
   Vanilla JS | DOM Manipulation | LocalStorage | Chart.js | jsPDF
   ============================================================ */

/* ---------------- LocalStorage Keys ---------------- */
const LS_SALARY   = 'cashflow_salary';
const LS_EXPENSES = 'cashflow_expenses';
const LS_CURRENCY = 'cashflow_currency';

/* ---------------- App State ---------------- */
/* NOTE: All money is stored internally in INR.
   The currency toggle only changes DISPLAY + INPUT interpretation. */
const state = {
  salary:    0,          // number (INR)
  expenses:  [],         // [{ id, name, amount }]  amount in INR
  currency:  'INR',      // 'INR' | 'USD'
  usdRate:   null        // INR per 1 USD (fetched from API)
};

let chartInstance = null;

/* ---------------- DOM References ---------------- */
const $ = (id) => document.getElementById(id);

const salaryForm    = $('salaryForm');
const salaryInput   = $('salaryInput');
const salaryError   = $('salaryError');

const expenseForm   = $('expenseForm');
const expenseName   = $('expenseName');
const expenseAmount = $('expenseAmount');
const expenseError  = $('expenseError');

const statSalary    = $('statSalary');
const statExpenses  = $('statExpenses');
const statBalance   = $('statBalance');

const expenseList   = $('expenseList');
const emptyState    = $('emptyState');
const alertBanner   = $('alertBanner');

const currentCurrency = $('currentCurrency');
const currencyToggle  = $('currencyToggle');
const rateInfo        = $('rateInfo');

const downloadReportBtn = $('downloadReport');
const resetAllBtn       = $('resetAll');

/* ============================================================
   1. LOCALSTORAGE PERSISTENCE
   ============================================================ */

function saveState() {
  // LocalStorage only accepts strings -> must serialize
  localStorage.setItem(LS_SALARY,   JSON.stringify(state.salary));
  localStorage.setItem(LS_EXPENSES, JSON.stringify(state.expenses));
  localStorage.setItem(LS_CURRENCY, JSON.stringify(state.currency));
}

function loadState() {
  const rawSalary   = localStorage.getItem(LS_SALARY);
  const rawExpenses = localStorage.getItem(LS_EXPENSES);
  const rawCurrency = localStorage.getItem(LS_CURRENCY);

  // Must parse back into real types
  state.salary   = rawSalary   ? JSON.parse(rawSalary)   : 0;
  state.expenses = rawExpenses ? JSON.parse(rawExpenses) : [];
  state.currency = rawCurrency ? JSON.parse(rawCurrency) : 'INR';
}

/* ============================================================
   2. CURRENCY HELPERS
   ============================================================ */

const SYMBOLS = { INR: '₹', USD: '$' };

/** Convert an INR amount into the currently selected display currency. */
function convertFromINR(amountInINR) {
  if (state.currency === 'USD' && state.usdRate) {
    return amountInINR / state.usdRate;
  }
  return amountInINR;
}

/** Convert a value typed by the user (in current currency) into INR. */
function convertToINR(displayValue) {
  if (state.currency === 'USD' && state.usdRate) {
    return displayValue * state.usdRate;
  }
  return displayValue;
}

/** Format an INR amount for display in the active currency. */
function formatMoney(amountInINR) {
  const value  = convertFromINR(amountInINR);
  const symbol = SYMBOLS[state.currency] || '';
  const locale = state.currency === 'USD' ? 'en-US' : 'en-IN';

  return (
    symbol +
    value.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  );
}

/* ============================================================
   3. TOTALS
   ============================================================ */

function getTotals() {
  const totalExpenses = state.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining     = state.salary - totalExpenses;
  return { totalExpenses, remaining };
}

/* ============================================================
   4. RENDER PIPELINE
   ============================================================ */

function render() {
  const { totalExpenses, remaining } = getTotals();

  /* --- Stats --- */
  statSalary.textContent   = formatMoney(state.salary);
  statExpenses.textContent = formatMoney(totalExpenses);
  statBalance.textContent  = formatMoney(remaining);

  /* --- Phase 3: Threshold Alert (< 10% of salary) --- */
  const threshold  = state.salary * 0.10;
  const isCritical = state.salary > 0 && remaining < threshold;

  statBalance.classList.toggle('critical', isCritical);

  if (isCritical) {
    alertBanner.textContent =
      '⚠️ Critical: Remaining balance has dropped below 10% of your total salary!';
    alertBanner.classList.remove('hidden');
  } else {
    alertBanner.classList.add('hidden');
  }

  /* --- Sub-renders --- */
  renderExpenseList();
  renderChart(totalExpenses, remaining);
}

/* ---------- Expense List ---------- */
function renderExpenseList() {
  expenseList.innerHTML = '';

  if (state.expenses.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  state.expenses.forEach((exp) => {
    const li = document.createElement('li');
    li.className = 'expense-item';

    const info = document.createElement('div');
    info.className = 'expense-info';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'expense-name';
    nameSpan.textContent = exp.name;

    const amountSpan = document.createElement('span');
    amountSpan.className = 'expense-amount';
    amountSpan.textContent = formatMoney(exp.amount);

    info.appendChild(nameSpan);
    info.appendChild(amountSpan);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.type = 'button';
    delBtn.textContent = '🗑️';
    delBtn.title = 'Delete expense';
    delBtn.addEventListener('click', () => deleteExpense(exp.id));

    li.appendChild(info);
    li.appendChild(delBtn);
    expenseList.appendChild(li);
  });
}

/* ---------- Chart.js Pie ---------- */
function renderChart(totalExpenses, remaining) {
  const canvas = $('expenseChart');
  const safeRemaining = Math.max(remaining, 0);

  /* FAQ #8: destroy the previous instance before re-rendering
     to avoid duplicate / stacked charts. */
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'pie',
    data: {
      labels: ['Remaining Balance', 'Total Expenses'],
      datasets: [
        {
          data: [safeRemaining, totalExpenses],
          backgroundColor: ['#22c55e', '#ef4444'],
          borderColor: '#1e293b',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#cbd5e1', padding: 16, font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatMoney(ctx.parsed)}`
          }
        }
      }
    }
  });
}

/* ============================================================
   5. ACTIONS
   ============================================================ */

function addExpense(name, amount) {
  state.expenses.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: name.trim(),
    amount: amount // stored in INR
  });
  saveState();
  render();
}

function deleteExpense(id) {
  state.expenses = state.expenses.filter((exp) => exp.id !== id);
  saveState();
  render();
}

/* ============================================================
   6. EVENT LISTENERS — SALARY FORM
   ============================================================ */

salaryForm.addEventListener('submit', (e) => {
  e.preventDefault();
  salaryError.textContent = '';

  const raw = salaryInput.value.trim();

  /* Validation: empty */
  if (raw === '') {
    salaryError.textContent = 'Please enter your total salary.';
    return;
  }

  /* FAQ #1: DOM inputs return STRINGS -> must parse */
  const value = Number(raw);

  if (!Number.isFinite(value)) {
    salaryError.textContent = 'Salary must be a valid number.';
    return;
  }
  if (value < 0) {
    salaryError.textContent = 'Salary cannot be negative.';
    return;
  }

  state.salary = convertToINR(value);
  salaryInput.value = '';

  saveState();
  render();
});

/* ============================================================
   7. EVENT LISTENERS — EXPENSE FORM
   ============================================================ */

expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  expenseError.textContent = '';

  const name = expenseName.value.trim();
  const raw  = expenseAmount.value.trim();

  /* Validation: empty */
  if (name === '' || raw === '') {
    expenseError.textContent = 'Both expense name and amount are required.';
    return;
  }

  const amount = Number(raw);

  if (!Number.isFinite(amount)) {
    expenseError.textContent = 'Expense amount must be a valid number.';
    return;
  }
  if (amount <= 0) {
    expenseError.textContent = 'Expense amount must be greater than zero.';
    return;
  }

  addExpense(name, convertToINR(amount));

  expenseName.value   = '';
  expenseAmount.value = '';
  expenseName.focus();
});

async function fetchUsdRate() {
  if (state.usdRate) return state.usdRate;

  const providers = [
    {
      name: 'Frankfurter',
      url:  'https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR',
      pick: (data) => data?.rates?.INR
    },
    {
      name: 'open.er-api',
      url:  'https://open.er-api.com/v6/latest/USD',
      pick: (data) => data?.rates?.INR
    },
    {
      name: 'exchangerate.host',
      url:  'https://api.exchangerate.host/latest?base=USD&symbols=INR',
      pick: (data) => data?.rates?.INR
    }
  ];

  for (const p of providers) {
    try {
      console.log(`[FX] Trying ${p.name}…`);

      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(p.url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const rate = p.pick(data);

      if (!rate || !Number.isFinite(rate)) {
        throw new Error('Invalid rate payload');
      }

      console.log(`[FX] ✅ Success via ${p.name}: 1 USD = ₹${rate}`);
      state.usdRate = rate;
      return rate;

    } catch (err) {
      console.warn(`[FX] ❌ ${p.name} failed:`, err.message);
      // try next provider
    }
  }

  throw new Error('All FX providers failed');
}

currencyToggle.addEventListener('click', async () => {
  const target = state.currency === 'INR' ? 'USD' : 'INR';

  if (target === 'USD') {
    try {
      rateInfo.textContent = 'Fetching live rate…';
      currencyToggle.disabled = true;

      const rate = await fetchUsdRate();
      rateInfo.textContent = `1 USD = ₹${rate.toFixed(2)} (live)`;

    } catch (err) {
      rateInfo.textContent = '⚠️ All FX providers failed. Check console (F12).';
      console.error('[FX] Full error chain exhausted:', err);
      currencyToggle.disabled = false;
      return;
    } finally {
      currencyToggle.disabled = false;
    }
  } else {
    rateInfo.textContent = '';
  }

  state.currency = target;
  currentCurrency.textContent = target;
  currencyToggle.textContent  = target === 'INR' ? 'Switch to USD' : 'Switch to INR';

  saveState();
  render();
});

/* ============================================================
   9. PDF REPORT (Phase 3 — jsPDF)
   ============================================================ */

downloadReportBtn.addEventListener('click', () => {
  const { totalExpenses, remaining } = getTotals();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  /* Header */
  doc.setFontSize(20);
  doc.text('Cash-Flow Report', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text('Generated: ' + new Date().toLocaleString(), 14, 28);

  /* Summary */
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text(`Total Salary:      ${formatMoney(state.salary)}`, 14, 44);
  doc.text(`Total Expenses:    ${formatMoney(totalExpenses)}`, 14, 52);
  doc.text(`Remaining Balance: ${formatMoney(remaining)}`, 14, 60);

  /* Expense table */
  doc.setFontSize(13);
  doc.text('Expense Breakdown', 14, 76);

  doc.setFontSize(11);
  let y = 86;

  if (state.expenses.length === 0) {
    doc.setTextColor(120);
    doc.text('No expenses recorded.', 18, y);
  } else {
    state.expenses.forEach((exp, i) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${i + 1}. ${exp.name}`, 18, y);
      doc.text(formatMoney(exp.amount), 150, y);
      y += 8;
    });
  }

  doc.save('cash-flow-report.pdf');
});

/* ============================================================
   10. RESET ALL
   ============================================================ */

resetAllBtn.addEventListener('click', () => {
  if (!confirm('Delete all saved data? This cannot be undone.')) return;

  state.salary   = 0;
  state.expenses = [];
  state.currency = 'INR';
  state.usdRate  = null;

  localStorage.removeItem(LS_SALARY);
  localStorage.removeItem(LS_EXPENSES);
  localStorage.removeItem(LS_CURRENCY);

  currentCurrency.textContent = 'INR';
  currencyToggle.textContent  = 'Switch to USD';
  rateInfo.textContent        = '';
  salaryError.textContent     = '';
  expenseError.textContent    = '';

  render();
});

/* ============================================================
   11. INIT
   ============================================================ */

async function init() {
  loadState();

  /* If user was last on USD, re-fetch rate BEFORE first render
     so numbers don't render with a stale symbol. */
  if (state.currency === 'USD') {
    try {
      const rate = await fetchUsdRate();
      rateInfo.textContent = `1 USD = ₹${rate.toFixed(2)} (live)`;
    } catch (err) {
      // Couldn't fetch → fall back to INR gracefully
      state.currency = 'INR';
      rateInfo.textContent = '⚠️ Rate fetch failed. Showing INR.';
      saveState();
    }
  }

  currentCurrency.textContent = state.currency;
  currencyToggle.textContent  = state.currency === 'INR' ? 'Switch to USD' : 'Switch to INR';

  render();
}

init();
