/**
 * main.js — DOM interactions, event handling, rendering
 */

import {
  monthlyPayment,
  amortizationSchedule,
  totalInterest,
  earlyPayoffFromParams,
  formatCurrency,
} from './loan.js';

import { t, setLang, getLang, getCurrencyForLang } from './i18n.js';

// ─── state ────────────────────────────────────────────────────────────────────

const state = {
  schedule: [],
  tablePage: 0,
  tablePageSize: 12,
  showAllRows: false,
};

// ─── DOM helpers ──────────────────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function updateText() {
  $$('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  $$('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

// ─── theme ────────────────────────────────────────────────────────────────────

function initTheme() {
  const saved = localStorage.getItem('loan-theme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.dataset.theme = 'dark';
  }
  updateThemeBtn();
}

function toggleTheme() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
  localStorage.setItem('loan-theme', isDark ? 'light' : 'dark');
  updateThemeBtn();
}

function updateThemeBtn() {
  const btn = $('#theme-toggle');
  if (!btn) return;
  const isDark = document.documentElement.dataset.theme === 'dark';
  btn.textContent = isDark ? t('lightMode') : t('darkMode');
}

// ─── language toggle ──────────────────────────────────────────────────────────

function toggleLang() {
  setLang(getLang() === 'ja' ? 'en' : 'ja');
  updateText();
  updateThemeBtn();
  const btn = $('#lang-toggle');
  if (btn) btn.textContent = t('lang');
  // Re-render if we have results
  if (state.schedule.length) renderResults();
}

// ─── form helpers ─────────────────────────────────────────────────────────────

function getFormValues() {
  const principal = parseFloat($('#principal').value);
  const apr = parseFloat($('#apr').value) / 100;
  const termUnit = $('#term-unit').value;
  const termValue = parseFloat($('#term-value').value);
  const months = termUnit === 'years' ? Math.round(termValue * 12) : Math.round(termValue);
  const type = $('input[name="payment-type"]:checked')?.value ?? 'equal-installment';
  const extra = parseFloat($('#extra-payment').value) || 0;
  const startDate = $('#start-date').value;
  const currency = $('#currency').value;
  return { principal, apr, months, type, extra, startDate, currency };
}

function validate({ principal, apr, months }) {
  if (!principal || isNaN(principal) || principal <= 0) return t('errPrincipal');
  if (isNaN(apr) || apr < 0) return t('errApr');
  if (!months || isNaN(months) || months <= 0) return t('errTerm');
  return null;
}

// ─── number formatting ────────────────────────────────────────────────────────

function fmt(amount, currency) {
  return formatCurrency(amount, currency);
}

// ─── results rendering ────────────────────────────────────────────────────────

function renderResults() {
  const { principal, apr, months, type, extra, currency } = getFormValues();
  const err = validate({ principal, apr, months });
  const errEl = $('#error-msg');
  if (err) {
    errEl.textContent = err;
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';

  const schedule = amortizationSchedule(principal, apr, months, type);
  state.schedule = schedule;
  state.tablePage = 0;

  const totalPaid = schedule.reduce((s, r) => s + r.payment, 0);
  const totInt = schedule.reduce((s, r) => s + r.interestPaid, 0);
  const firstPayment = schedule[0]?.payment ?? 0;
  const monthly = type === 'equal-installment' ? monthlyPayment(principal, apr, months) : firstPayment;

  // Cards
  const isEqualPrincipal = type === 'equal-principal';
  $('#card-monthly-label').textContent = isEqualPrincipal ? t('firstPayment') : t('monthlyPayment');
  $('#card-monthly').textContent = fmt(isEqualPrincipal ? firstPayment : monthly, currency);
  $('#card-total').textContent = fmt(totalPaid, currency);
  $('#card-interest').textContent = fmt(totInt, currency);
  $('#card-ratio').textContent = principal > 0
    ? ((totInt / (totInt + principal)) * 100).toFixed(1) + '%'
    : '-';
  $('#card-term').textContent = `${months} ${t('months')}`;

  // Early payoff
  if (extra > 0) {
    const ep = earlyPayoffFromParams(principal, apr, months, extra, type);
    $('#early-payoff-section').style.display = '';
    $('#ep-new-term').textContent = `${ep.newTerm} ${t('months')}`;
    $('#ep-saved').textContent = fmt(ep.interestSaved, currency);
    $('#ep-reduced').textContent = `${months - ep.newTerm} ${t('months')}`;
  } else {
    $('#early-payoff-section').style.display = 'none';
  }

  // Chart
  renderChart(schedule, currency);

  // Table
  renderTable(schedule, currency);

  $('#results').style.display = '';
}

// ─── chart ────────────────────────────────────────────────────────────────────

function renderChart(schedule, currency) {
  const container = $('#chart-bars');
  if (!container) return;
  container.innerHTML = '';

  // Sample up to 60 points for the chart
  const step = Math.max(1, Math.floor(schedule.length / 60));
  const sampled = schedule.filter((_, i) => i % step === 0 || i === schedule.length - 1);

  const maxPayment = Math.max(...sampled.map((r) => r.payment));

  sampled.forEach((row) => {
    const barGroup = document.createElement('div');
    barGroup.className = 'bar-group';

    const pHeight = ((row.principalPaid / maxPayment) * 100).toFixed(1);
    const iHeight = ((row.interestPaid / maxPayment) * 100).toFixed(1);

    barGroup.innerHTML = `
      <div class="bar-stack" title="Month ${row.month}&#10;${t('principal_label')}: ${fmt(row.principalPaid, currency)}&#10;${t('interest_label')}: ${fmt(row.interestPaid, currency)}">
        <div class="bar bar-interest" style="height:${iHeight}%"></div>
        <div class="bar bar-principal" style="height:${pHeight}%"></div>
      </div>
    `;
    container.appendChild(barGroup);
  });
}

// ─── amortization table ───────────────────────────────────────────────────────

function renderTable(schedule, currency) {
  const tbody = $('#amort-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const { tablePage, tablePageSize, showAllRows } = state;
  const rows = showAllRows ? schedule : schedule.slice(
    tablePage * tablePageSize,
    (tablePage + 1) * tablePageSize,
  );

  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.month}</td>
      <td>${fmt(row.payment, currency)}</td>
      <td>${fmt(row.principalPaid, currency)}</td>
      <td>${fmt(row.interestPaid, currency)}</td>
      <td>${fmt(row.balance, currency)}</td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(schedule.length, currency);
}

function renderPagination(total, currency) {
  const pager = $('#table-pager');
  if (!pager) return;
  pager.innerHTML = '';

  if (state.showAllRows) {
    const btn = document.createElement('button');
    btn.textContent = t('showLess');
    btn.className = 'btn-text';
    btn.onclick = () => {
      state.showAllRows = false;
      state.tablePage = 0;
      renderTable(state.schedule, currency);
    };
    pager.appendChild(btn);
    return;
  }

  const totalPages = Math.ceil(total / state.tablePageSize);
  if (totalPages <= 1) {
    // Show "show all" button if schedule is long
    if (total > state.tablePageSize) {
      const btn = document.createElement('button');
      btn.textContent = t('showAll');
      btn.className = 'btn-text';
      btn.onclick = () => {
        state.showAllRows = true;
        renderTable(state.schedule, currency);
      };
      pager.appendChild(btn);
    }
    return;
  }

  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = `${t('page')} ${state.tablePage + 1} ${t('of')} ${totalPages}`;

  const prevBtn = document.createElement('button');
  prevBtn.textContent = t('prev');
  prevBtn.className = 'btn-text';
  prevBtn.disabled = state.tablePage === 0;
  prevBtn.onclick = () => {
    state.tablePage--;
    renderTable(state.schedule, currency);
  };

  const nextBtn = document.createElement('button');
  nextBtn.textContent = t('next');
  nextBtn.className = 'btn-text';
  nextBtn.disabled = state.tablePage >= totalPages - 1;
  nextBtn.onclick = () => {
    state.tablePage++;
    renderTable(state.schedule, currency);
  };

  const showAllBtn = document.createElement('button');
  showAllBtn.textContent = t('showAll');
  showAllBtn.className = 'btn-text';
  showAllBtn.onclick = () => {
    state.showAllRows = true;
    renderTable(state.schedule, currency);
  };

  pager.append(prevBtn, info, nextBtn, showAllBtn);
}

// ─── init ─────────────────────────────────────────────────────────────────────

function init() {
  initTheme();
  updateText();

  // Set default start date to next month
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  const iso = d.toISOString().slice(0, 7); // YYYY-MM
  const sd = $('#start-date');
  if (sd) sd.value = iso;

  $('#calculate-btn').addEventListener('click', renderResults);

  $('#reset-btn').addEventListener('click', () => {
    $('form').reset();
    sd.value = iso;
    $('#results').style.display = 'none';
    $('#error-msg').style.display = 'none';
    state.schedule = [];
  });

  $('#theme-toggle').addEventListener('click', toggleTheme);
  $('#lang-toggle').addEventListener('click', () => {
    toggleLang();
    $('#lang-toggle').textContent = t('lang');
  });

  // Sync term display
  $('#term-unit').addEventListener('change', () => {
    const unit = $('#term-unit').value;
    $('#term-unit-label').textContent = unit === 'years' ? t('termYears') : t('termMonths');
  });

  // Auto-calculate on Enter
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') renderResults();
  });
}

document.addEventListener('DOMContentLoaded', init);
