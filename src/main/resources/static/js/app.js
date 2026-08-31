const API_BASE = '/api/accounts';

let accountsCache = [];
let currentSearchTerm = '';
let typeChartInstance = null;
let topAccountsChartInstance = null;
let currentHistoryAccount = null;
let currentHistoryTransactions = [];

// ===================== Theme (Dark / Light) =====================

function initTheme() {
  const saved = localStorage.getItem('bv_theme') || 'light';
  applyTheme(saved);
  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('bv_theme', next);
  });
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeToggleIcon').className = 'bi bi-sun-fill';
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.getElementById('themeToggleIcon').className = 'bi bi-moon-stars-fill';
  }
  // Charts need a re-render so gridlines/labels pick up new theme colors
  if (typeChartInstance || topAccountsChartInstance) {
    renderCharts(accountsCache);
  }
}

// ===================== Utility =====================

function formatCurrency(value) {
  const num = Number(value ?? 0);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function showToast(message, isError = false) {
  const toastEl = document.getElementById('appToast');
  const bodyEl = document.getElementById('appToastBody');
  bodyEl.textContent = message;
  toastEl.classList.toggle('bg-danger-toast', isError);
  const toast = new bootstrap.Toast(toastEl, { delay: 3200 });
  toast.show();
}

async function apiCall(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    let message = 'Something went wrong';
    try {
      const errBody = await response.json();
      message = errBody.message || errBody.error || message;
    } catch (e) { /* ignore parse error */ }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function isThemeDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

// ===================== Load & Render =====================

async function loadDashboard() {
  try {
    const [accounts, totalBalanceRes] = await Promise.all([
      apiCall(API_BASE),
      apiCall(API_BASE + '/summary/total-balance')
    ]);

    accountsCache = accounts;
    applySearchFilter();
    document.getElementById('totalBalance').textContent = formatCurrency(totalBalanceRes.totalBalance);
    document.getElementById('totalAccounts').textContent = accounts.length;
    document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    renderCharts(accounts);
  } catch (err) {
    showToast('Failed to load accounts: ' + err.message, true);
  }
}

function applySearchFilter() {
  const term = currentSearchTerm.trim().toLowerCase();
  const filtered = !term ? accountsCache : accountsCache.filter(a =>
    (a.accountHolderName || '').toLowerCase().includes(term) ||
    (a.accountNumber || '').toLowerCase().includes(term) ||
    (a.email || '').toLowerCase().includes(term)
  );
  renderAccounts(filtered, term);
}

function renderAccounts(accounts, term) {
  const tbody = document.getElementById('accountsTableBody');
  const emptyState = document.getElementById('emptyState');
  const noSearchResults = document.getElementById('noSearchResults');
  tbody.innerHTML = '';
  emptyState.classList.add('d-none');
  noSearchResults.classList.add('d-none');

  if (!accountsCache.length) {
    emptyState.classList.remove('d-none');
    return;
  }

  if (!accounts.length) {
    noSearchResults.classList.remove('d-none');
    return;
  }

  const onlyOneAccount = accountsCache.length < 2;

  accounts.forEach(acc => {
    const typeClass = acc.accountType === 'SAVINGS' ? 'type-savings' : 'type-current';
    const row = document.createElement('tr');
    const transferDisabledAttrs = onlyOneAccount
      ? `disabled title="Add another account to enable transfers"`
      : `title="Transfer"`;
    row.innerHTML = `
      <td><span class="account-number-pill">${acc.accountNumber}</span></td>
      <td>${escapeHtml(acc.accountHolderName)}</td>
      <td>${escapeHtml(acc.email || '-')}</td>
      <td><span class="type-badge ${typeClass}">${acc.accountType}</span></td>
      <td class="text-end balance-text">${formatCurrency(acc.balance)}</td>
      <td class="text-center">
        <div class="d-flex justify-content-center gap-2">
          <button class="btn-icon btn-deposit" title="Deposit" onclick="openAmountModal(${acc.id}, 'deposit')"><i class="bi bi-plus-lg"></i></button>
          <button class="btn-icon btn-withdraw" title="Withdraw" onclick="openAmountModal(${acc.id}, 'withdraw')"><i class="bi bi-dash-lg"></i></button>
          <button class="btn-icon btn-transfer" ${transferDisabledAttrs} onclick="openTransferModal(${acc.id})"><i class="bi bi-arrow-left-right"></i></button>
          <button class="btn-icon btn-history" title="History" onclick="openHistoryModal(${acc.id})"><i class="bi bi-receipt"></i></button>
          <button class="btn-icon btn-edit" title="Edit" onclick="openEditModal(${acc.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn-icon btn-delete" title="Delete" onclick="deleteAccount(${acc.id})"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===================== Search (NEW FEATURE) =====================

document.getElementById('searchInput').addEventListener('input', (e) => {
  currentSearchTerm = e.target.value;
  applySearchFilter();
});

// ===================== Analytics Charts (NEW FEATURE) =====================

function chartPalette() {
  return {
    savings: '#16b3ac',
    current: '#7b5bf0',
    bars: ['#2b57c9', '#7b5bf0', '#16b3ac', '#f5b942', '#e0783c', '#d0466b'],
    gridColor: isThemeDark() ? 'rgba(255,255,255,0.08)' : 'rgba(20,30,70,0.08)',
    textColor: isThemeDark() ? '#c4cde3' : '#4c5a78'
  };
}

function renderCharts(accounts) {
  renderTypeChart(accounts);
  renderTopAccountsChart(accounts);
}

function renderTypeChart(accounts) {
  const canvas = document.getElementById('typeChart');
  const emptyEl = document.getElementById('typeChartEmpty');
  const palette = chartPalette();

  if (typeChartInstance) {
    typeChartInstance.destroy();
    typeChartInstance = null;
  }

  if (!accounts.length) {
    canvas.classList.add('d-none');
    emptyEl.classList.remove('d-none');
    return;
  }
  canvas.classList.remove('d-none');
  emptyEl.classList.add('d-none');

  const savingsTotal = accounts.filter(a => a.accountType === 'SAVINGS').reduce((s, a) => s + Number(a.balance || 0), 0);
  const currentTotal = accounts.filter(a => a.accountType === 'CURRENT').reduce((s, a) => s + Number(a.balance || 0), 0);

  typeChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Savings', 'Current'],
      datasets: [{
        data: [savingsTotal, currentTotal],
        backgroundColor: [palette.savings, palette.current],
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { color: palette.textColor, usePointStyle: true, padding: 16 } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}`
          }
        }
      }
    }
  });
}

function renderTopAccountsChart(accounts) {
  const canvas = document.getElementById('topAccountsChart');
  const emptyEl = document.getElementById('topChartEmpty');
  const palette = chartPalette();

  if (topAccountsChartInstance) {
    topAccountsChartInstance.destroy();
    topAccountsChartInstance = null;
  }

  if (!accounts.length) {
    canvas.classList.add('d-none');
    emptyEl.classList.remove('d-none');
    return;
  }
  canvas.classList.remove('d-none');
  emptyEl.classList.add('d-none');

  const top = [...accounts]
    .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
    .slice(0, 6);

  topAccountsChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: top.map(a => a.accountHolderName),
      datasets: [{
        label: 'Balance',
        data: top.map(a => Number(a.balance || 0)),
        backgroundColor: top.map((_, i) => palette.bars[i % palette.bars.length]),
        borderRadius: 8,
        maxBarThickness: 42
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => formatCurrency(ctx.raw)
          }
        }
      },
      scales: {
        x: {
          ticks: { color: palette.textColor, callback: (v) => formatCurrency(v) },
          grid: { color: palette.gridColor }
        },
        y: {
          ticks: { color: palette.textColor },
          grid: { display: false }
        }
      }
    }
  });
}

// ===================== Create Account =====================

document.getElementById('createAccountForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    accountHolderName: document.getElementById('ca_name').value,
    email: document.getElementById('ca_email').value,
    phone: document.getElementById('ca_phone').value,
    accountType: document.getElementById('ca_type').value,
    balance: parseFloat(document.getElementById('ca_balance').value || '0')
  };

  try {
    await apiCall(API_BASE, { method: 'POST', body: JSON.stringify(payload) });
    bootstrap.Modal.getInstance(document.getElementById('createAccountModal')).hide();
    e.target.reset();
    showToast('Account created successfully');
    loadDashboard();
  } catch (err) {
    showToast(err.message, true);
  }
});

// ===================== Deposit / Withdraw =====================

function openAmountModal(accountId, type) {
  document.getElementById('am_accountId').value = accountId;
  document.getElementById('am_type').value = type;
  document.getElementById('amountModalTitle').textContent = type === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds';
  document.getElementById('amountSubmitBtn').textContent = type === 'deposit' ? 'Deposit' : 'Withdraw';
  document.getElementById('amountForm').reset();
  new bootstrap.Modal(document.getElementById('amountModal')).show();
}

document.getElementById('amountForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const accountId = document.getElementById('am_accountId').value;
  const type = document.getElementById('am_type').value;
  const payload = {
    amount: parseFloat(document.getElementById('am_amount').value),
    description: document.getElementById('am_description').value
  };

  try {
    await apiCall(`${API_BASE}/${accountId}/${type}`, { method: 'POST', body: JSON.stringify(payload) });
    bootstrap.Modal.getInstance(document.getElementById('amountModal')).hide();
    showToast(type === 'deposit' ? 'Deposit successful' : 'Withdrawal successful');
    loadDashboard();
  } catch (err) {
    showToast(err.message, true);
  }
});

// ===================== Transfer (BUG FIX) =====================
// Previously, opening Transfer on the only account in the bank left the
// "To Account" dropdown completely empty, so the required <select> could
// never be satisfied and the browser showed "Please select an item in the
// list" with no way to proceed. We now guard against that case up front,
// disable the Transfer button on the row when there's nowhere to send
// money, and always seed the dropdown with a real placeholder option.

function openTransferModal(accountId) {
  const fromAccount = accountsCache.find(a => a.id === accountId);
  const otherAccounts = accountsCache.filter(a => a.id !== accountId);

  if (otherAccounts.length === 0) {
    showToast('You need at least one other account to transfer funds. Create another account first.', true);
    return;
  }

  document.getElementById('tr_fromId').value = accountId;
  document.getElementById('tr_fromDisplay').value = `${fromAccount.accountNumber} — ${fromAccount.accountHolderName}`;

  const toSelect = document.getElementById('tr_toId');
  toSelect.innerHTML = '<option value="" selected disabled>Select an account…</option>';
  otherAccounts.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = `${a.accountNumber} — ${a.accountHolderName} (${formatCurrency(a.balance)})`;
    toSelect.appendChild(opt);
  });

  document.getElementById('transferForm').reset();
  document.getElementById('tr_fromId').value = accountId;
  toSelect.value = '';
  new bootstrap.Modal(document.getElementById('transferModal')).show();
}

document.getElementById('transferForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fromId = document.getElementById('tr_fromId').value;
  const toId = document.getElementById('tr_toId').value;

  if (!toId) {
    showToast('Please select a destination account', true);
    return;
  }

  const payload = {
    toAccountId: parseInt(toId, 10),
    amount: parseFloat(document.getElementById('tr_amount').value),
    description: document.getElementById('tr_description').value
  };

  try {
    await apiCall(`${API_BASE}/${fromId}/transfer`, { method: 'POST', body: JSON.stringify(payload) });
    bootstrap.Modal.getInstance(document.getElementById('transferModal')).hide();
    showToast('Transfer completed successfully');
    loadDashboard();
  } catch (err) {
    showToast(err.message, true);
  }
});

// ===================== Edit Account =====================

function openEditModal(accountId) {
  const acc = accountsCache.find(a => a.id === accountId);
  document.getElementById('ea_id').value = acc.id;
  document.getElementById('ea_name').value = acc.accountHolderName;
  document.getElementById('ea_email').value = acc.email || '';
  document.getElementById('ea_phone').value = acc.phone || '';
  document.getElementById('ea_type').value = acc.accountType;
  new bootstrap.Modal(document.getElementById('editAccountModal')).show();
}

document.getElementById('editAccountForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('ea_id').value;
  const payload = {
    accountHolderName: document.getElementById('ea_name').value,
    email: document.getElementById('ea_email').value,
    phone: document.getElementById('ea_phone').value,
    accountType: document.getElementById('ea_type').value
  };

  try {
    await apiCall(`${API_BASE}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    bootstrap.Modal.getInstance(document.getElementById('editAccountModal')).hide();
    showToast('Account updated successfully');
    loadDashboard();
  } catch (err) {
    showToast(err.message, true);
  }
});

// ===================== Delete Account =====================

async function deleteAccount(accountId) {
  const acc = accountsCache.find(a => a.id === accountId);
  if (!confirm(`Delete account ${acc.accountNumber} (${acc.accountHolderName})? This cannot be undone.`)) return;

  try {
    await apiCall(`${API_BASE}/${accountId}`, { method: 'DELETE' });
    showToast('Account deleted successfully');
    loadDashboard();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ===================== Transaction History =====================

async function openHistoryModal(accountId) {
  const acc = accountsCache.find(a => a.id === accountId);
  document.getElementById('hist_accountLabel').textContent = `${acc.accountNumber} (${acc.accountHolderName})`;
  currentHistoryAccount = acc;

  const tbody = document.getElementById('historyTableBody');
  const emptyEl = document.getElementById('historyEmpty');
  tbody.innerHTML = '';
  emptyEl.classList.add('d-none');

  try {
    const transactions = await apiCall(`${API_BASE}/${accountId}/transactions`);
    currentHistoryTransactions = transactions;
    if (!transactions.length) {
      emptyEl.classList.remove('d-none');
    } else {
      transactions.forEach(tx => {
        const isNegative = tx.transactionType === 'WITHDRAWAL' || tx.transactionType === 'TRANSFER_OUT';
        const sign = isNegative ? '-' : '+';
        const amountClass = isNegative ? 'text-negative' : 'text-positive';
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${formatDate(tx.transactionDate)}</td>
          <td><span class="type-badge ${isNegative ? 'type-current' : 'type-savings'}">${tx.transactionType.replace('_', ' ')}</span></td>
          <td class="text-end fw-semibold ${amountClass}">${sign}${formatCurrency(tx.amount)}</td>
          <td class="text-end">${formatCurrency(tx.balanceAfter)}</td>
          <td>${escapeHtml(tx.description || '-')}</td>
        `;
        tbody.appendChild(row);
      });
    }
    new bootstrap.Modal(document.getElementById('historyModal')).show();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ===================== Export Transaction History to CSV (NEW FEATURE) =====================

document.getElementById('exportCsvBtn').addEventListener('click', () => {
  if (!currentHistoryTransactions.length) {
    showToast('No transactions to export', true);
    return;
  }

  const header = ['Date', 'Type', 'Amount', 'Balance After', 'Description'];
  const rows = currentHistoryTransactions.map(tx => {
    const isNegative = tx.transactionType === 'WITHDRAWAL' || tx.transactionType === 'TRANSFER_OUT';
    const sign = isNegative ? '-' : '+';
    return [
      formatDate(tx.transactionDate),
      tx.transactionType,
      `${sign}${Number(tx.amount).toFixed(2)}`,
      Number(tx.balanceAfter).toFixed(2),
      (tx.description || '').replace(/"/g, '""')
    ];
  });

  const csvContent = [header, ...rows]
    .map(r => r.map(field => `"${field}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const acc = currentHistoryAccount;
  const filename = acc ? `statement_${acc.accountNumber}.csv` : 'statement.csv';
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Statement exported successfully');
});

// ===================== Init =====================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadDashboard();
});
