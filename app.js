/* ========== MODA INVENTORY — APPLICATION ========== */

// ===== CONFIGURATION =====
// Replace this URL with your Railway backend URL after deploying.
// It will look like: https://your-app-name.up.railway.app
const API = 'https://web-production-9a33.up.railway.app';
let allWatches = [];
let analyticsData = null;
let chartInstances = {};

// ========== THEME ==========
(function() {
  const toggle = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  let theme = 'dark'; // default dark
  root.setAttribute('data-theme', theme);
  if (toggle) {
    toggle.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      toggle.innerHTML = theme === 'dark'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      // Re-render charts for theme
      if (analyticsData) renderCharts(analyticsData);
    });
  }
})();

// ========== BRAND SELECTOR ==========
document.getElementById('formBrand').addEventListener('change', function() {
  const group = document.getElementById('customBrandGroup');
  group.style.display = this.value === '__other__' ? 'flex' : 'none';
});

// ========== NAVIGATION ==========
function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');

  const titles = { dashboard: 'Dashboard', inventory: 'Inventory', pending: 'Pending Payment', sold: 'Sold', all: 'All Watches', accessories: 'Accessories', deals: 'Seller Deals', crm: 'Client Requests', contacts: 'Contacts' };
  if (view === 'contacts') { document.getElementById('contactsSearch').value = ''; contactFilter = 'all'; document.querySelectorAll('[data-contact-filter]').forEach(btn => btn.classList.toggle('chip-active', btn.getAttribute('data-contact-filter') === 'all')); }
  document.getElementById('headerTitle').textContent = titles[view] || 'Dashboard';

  closeMobileMenu();

  if (view === 'dashboard') loadDashboard();
  else if (view === 'inventory') loadInventory();
  else if (view === 'pending') loadPending();
  else if (view === 'sold') loadSold();
  else if (view === 'all') loadAll();
  else if (view === 'accessories') loadAccessories();
  else if (view === 'deals') loadDeals();
  else if (view === 'crm') loadCrm();
  else if (view === 'contacts') loadContacts();
}

// ========== MOBILE MENU ==========
function toggleMobileMenu() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
  document.getElementById('mobileOverlay').classList.toggle('show');
}
function closeMobileMenu() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('mobileOverlay').classList.remove('show');
}

// ========== API HELPERS ==========
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('API error:', err);
    showToast('Connection error. Please try again.', 'error');
    throw err;
  }
}

// ========== FORMAT HELPERS ==========
function formatCurrency(val) {
  if (val == null || isNaN(val)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}
function formatCurrencyFull(val) {
  if (val == null || isNaN(val)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);
}
function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return d; }
}
function formatDays(days) {
  if (!days || isNaN(days)) return '—';
  if (days < 1) return '<1 day';
  return `${Math.round(days)}d`;
}
function calcHoldTime(purchase, sold) {
  if (!purchase || !sold) return null;
  const diff = new Date(sold) - new Date(purchase);
  return diff / (1000 * 60 * 60 * 24);
}
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatFullAddress(street, city, state, zip) {
  const parts = [street, city, (state && zip) ? `${state} ${zip}` : (state || zip)].filter(Boolean);
  return parts.join(', ');
}

// ========== TOASTS ==========
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 300ms ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ========== DASHBOARD ==========
async function loadDashboard() {
  try {
    analyticsData = await apiFetch('/api/analytics');
    renderKPIs(analyticsData);
    renderUnpaid(analyticsData);
    renderReminders(analyticsData);
    renderOpportunities(analyticsData);
    renderDealsAlert(analyticsData);
    renderCharts(analyticsData);
    renderActivity(analyticsData.recent_activity);
    renderCrmDashboard();
    updateNavCounts();
    updateDealsCount();
  } catch (e) { /* handled in apiFetch */ }
}

function renderKPIs(data) {
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Inventory Value</div>
      <div class="kpi-value gold">${formatCurrency(data.inventory_value)}</div>
      <div class="kpi-sub">${data.inventory_count} watches in stock</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Sold</div>
      <div class="kpi-value">${formatCurrency(data.total_sold_revenue)}</div>
      <div class="kpi-sub">${data.sold_count} watches sold</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Avg Margin</div>
      <div class="kpi-value">${data.avg_margin}%</div>
      <div class="kpi-sub">On sold watches</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Avg Hold Time</div>
      <div class="kpi-value">${data.avg_hold_days > 0 ? Math.round(data.avg_hold_days) + 'd' : '—'}</div>
      <div class="kpi-sub">Purchase to sale</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Watches</div>
      <div class="kpi-value">${data.inventory_count + data.sold_count}</div>
      <div class="kpi-sub">All time</div>
    </div>
  `;
}

function renderUnpaid(data) {
  const section = document.getElementById('unpaidSection');
  const list = document.getElementById('unpaidList');
  const title = document.getElementById('unpaidTitle');
  const watches = data.unpaid_watches || [];
  const accessories = data.unpaid_accessories || [];
  const allUnpaid = [
    ...watches.map(w => ({
      name: `${w.brand} ${w.model}`,
      ref: w.reference_number,
      seller: w.seller_name,
      amount: w.purchase_price,
      date: w.purchase_date,
      id: w.id,
      type: 'watch'
    })),
    ...accessories.map(a => ({
      name: `${a.brand || a.type} ${a.description || ''}`.trim(),
      ref: `Accessory (${a.type})`,
      seller: a.seller_name,
      amount: a.purchase_price,
      date: a.purchase_date,
      id: a.id,
      type: 'accessory'
    }))
  ];

  if (allUnpaid.length === 0) {
    section.style.display = 'none';
    return;
  }

  const totalOwed = allUnpaid.reduce((sum, item) => sum + (item.amount || 0), 0);
  section.style.display = '';
  title.textContent = `Needs Payment (${allUnpaid.length}) · ${formatCurrency(totalOwed)}`;

  list.innerHTML = allUnpaid.map(item => `
    <div class="unpaid-item" onclick="${item.type === 'watch' ? `switchView('inventory')` : `switchView('accessories')`}">
      <div>
        <div class="unpaid-item-name">${escapeHtml(item.name)}</div>
        <div class="unpaid-item-meta">${item.seller ? escapeHtml(item.seller) : 'No seller'} · ${item.date || 'No date'}</div>
      </div>
      <div class="unpaid-item-amount">${formatCurrency(item.amount || 0)}</div>
    </div>
  `).join('');
}

function renderReminders(data) {
  const section = document.getElementById('reminderSection');
  const list = document.getElementById('reminderList');
  const title = document.getElementById('reminderTitle');
  const reminders = data.crm_reminders_due || [];

  if (reminders.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  title.textContent = `Client Follow-ups Due (${reminders.length})`;

  list.innerHTML = reminders.map(r => {
    const daysSince = r.days_since_start || 0;
    const intervalLabel = r.reminder_days + ' day';
    return `
    <div class="reminder-item">
      <div onclick="switchView('crm')" style="cursor:pointer;flex:1;">
        <div class="reminder-item-name">${escapeHtml(r.client_name || 'Unknown')}</div>
        <div class="reminder-item-meta">${escapeHtml(r.watch_requested || 'No watch')} · Every ${intervalLabel}s · ${daysSince}d overdue</div>
      </div>
      <div class="reminder-item-actions">
        <span class="badge badge-reminder">Follow Up</span>
        <button class="btn btn-sm btn-reminder-dismiss" onclick="event.stopPropagation();dismissReminder(${r.id})" title="Dismiss &amp; restart timer">Dismiss</button>
      </div>
    </div>
    `;
  }).join('');
}

function renderOpportunities(data) {
  const section = document.getElementById('opportunitySection');
  const list = document.getElementById('opportunityList');
  const title = document.getElementById('opportunityTitle');
  const opps = data.resell_opportunities || [];

  if (opps.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  title.textContent = `Resell Opportunities (${opps.length})`;

  list.innerHTML = opps.map(o => {
    const upside = formatCurrency(o.potential_profit);
    const contact = o.past_buyer_email || o.past_buyer_phone || '';
    const contactInfo = contact ? ` · ${escapeHtml(contact)}` : '';
    return `
    <div class="opportunity-item">
      <div style="flex:1;min-width:0;">
        <div class="opportunity-item-name">${escapeHtml(o.brand)} ${escapeHtml(o.model)}</div>
        <div class="opportunity-item-meta">Ref: ${escapeHtml(o.reference_number)} · Warranty: ${o.warranty_date}</div>
        <div class="opportunity-item-meta">Sold to <strong>${escapeHtml(o.past_buyer_name)}</strong> for ${formatCurrency(o.past_sold_price)} on ${o.past_sold_date || 'N/A'}${contactInfo}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div class="opportunity-item-upside">+${upside}</div>
        <div class="opportunity-item-meta">Current cost: ${formatCurrency(o.current_purchase_price)}</div>
      </div>
    </div>
    `;
  }).join('');
}

async function dismissReminder(crmId) {
  try {
    await apiFetch('/api/crm/' + crmId, {
      method: 'PUT',
      body: JSON.stringify({ reminder_start: new Date().toISOString() })
    });
    showToast('Reminder dismissed — will repeat in the set interval.');
    loadDashboard();
  } catch(e) {}
}

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    gold: '#4CAF7C',
    goldAlpha: 'rgba(76, 175, 124, 0.3)',
    text: isDark ? '#E8E6E1' : '#1A1A18',
    textMuted: isDark ? '#8A8A85' : '#6B6B66',
    textFaint: isDark ? '#555550' : '#A0A09A',
    grid: isDark ? '#2A2A2A' : '#E0DDD8',
    surface: isDark ? '#161616' : '#FFFFFF',
    success: '#4CAF50',
    error: '#E74C3C',
    brandColors: ['#4CAF7C', '#2E7D54', '#66C499', '#3D9A6A', '#80D4AD', '#1B5E3B', '#A8E6C3', '#0F3D24']
  };
}

function renderCharts(data) {
  const c = getChartColors();
  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: c.surface,
        titleColor: c.text,
        bodyColor: c.textMuted,
        borderColor: c.grid,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
        titleFont: { family: 'Inter', size: 13 },
        bodyFont: { family: 'Inter', size: 12 },
      }
    },
    scales: {
      x: {
        ticks: { color: c.textFaint, font: { family: 'Inter', size: 11 } },
        grid: { color: 'transparent' },
        border: { color: c.grid }
      },
      y: {
        ticks: { color: c.textFaint, font: { family: 'Inter', size: 11 }, callback: v => '$' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v) },
        grid: { color: c.grid, lineWidth: 0.5 },
        border: { display: false }
      }
    }
  };

  // Destroy old charts
  Object.values(chartInstances).forEach(ch => ch.destroy());
  chartInstances = {};

  // Monthly Profit (already ordered ASC from backend)
  const profitData = (data.profit_timeline || []).slice(-12);
  chartInstances.profit = new Chart(document.getElementById('profitChart'), {
    type: 'bar',
    data: {
      labels: profitData.map(d => {
        const [y, m] = (d.month || '').split('-');
        return m ? new Date(y, m-1).toLocaleString('en-US', {month:'short', year:'2-digit'}) : d.month;
      }),
      datasets: [{
        data: profitData.map(d => d.profit || 0),
        backgroundColor: profitData.map(d => (d.profit || 0) >= 0 ? c.gold : c.error),
        borderRadius: 4,
        maxBarThickness: 32,
      }]
    },
    options: { ...chartOpts }
  });

  // Brand donut
  const brands = (data.brands || []).slice(0, 8);
  chartInstances.brand = new Chart(document.getElementById('brandChart'), {
    type: 'doughnut',
    data: {
      labels: brands.map(b => b.brand),
      datasets: [{
        data: brands.map(b => b.cnt),
        backgroundColor: c.brandColors.slice(0, brands.length),
        borderWidth: 0,
        hoverOffset: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      layout: { padding: { right: 0 } },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: c.textMuted, font: { family: 'Inter', size: 11 }, padding: 10, usePointStyle: true, pointStyleWidth: 8, boxWidth: 8 }
        },
        tooltip: chartOpts.plugins.tooltip,
      }
    }
  });

  // Monthly sales volume (reverse DESC to ASC for chronological display)
  const monthly = (data.monthly_sales || []).slice(0, 12).reverse();
  chartInstances.sales = new Chart(document.getElementById('salesChart'), {
    type: 'line',
    data: {
      labels: monthly.map(d => {
        const [y, m] = (d.month || '').split('-');
        return m ? new Date(y, m-1).toLocaleString('en-US', {month:'short'}) : d.month;
      }),
      datasets: [{
        data: monthly.map(d => d.revenue || 0),
        borderColor: c.gold,
        backgroundColor: c.goldAlpha,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: c.gold,
        borderWidth: 2,
      }]
    },
    options: { ...chartOpts }
  });
}

function renderActivity(items) {
  const list = document.getElementById('activityList');
  if (!items || items.length === 0) {
    list.innerHTML = '<div style="padding:var(--space-6);color:var(--color-text-faint);font-size:var(--text-sm);text-align:center;">No recent activity</div>';
    return;
  }
  list.innerHTML = items.map(w => `
    <div class="activity-item">
      <div class="activity-dot ${w.status === 'sold' ? 'sold' : 'stock'}"></div>
      <div class="activity-info">
        <div class="activity-name">${escapeHtml(w.brand)} ${escapeHtml(w.model)}</div>
        <div class="activity-meta">${w.status === 'sold' ? 'Sold' : 'Added'} · ${formatDate(w.updated_at)}</div>
      </div>
      <div class="activity-price">${w.status === 'sold' ? formatCurrency(w.sold_price) : formatCurrency(w.purchase_price)}</div>
    </div>
  `).join('');
}

async function renderCrmDashboard() {
  try {
    const requests = await apiFetch('/api/crm');
    const active = requests.filter(r => r.status !== 'cancelled');
    const list = document.getElementById('crmDashList');
    const countBadge = document.getElementById('crmDashCount');
    
    countBadge.textContent = active.length;
    
    if (active.length === 0) {
      list.innerHTML = '<div style="padding:var(--space-6);color:var(--color-text-faint);font-size:var(--text-sm);text-align:center;">No active requests</div>';
      return;
    }
    
    list.innerHTML = active.map(r => {
      const statusClass = {
        'looking': 'badge-looking',
        'sourced': 'badge-sourced',
        'offered': 'badge-offered',
        'sold': 'badge-sold',
        'cancelled': 'badge-cancelled'
      }[r.status] || 'badge-looking';
      return `
        <div class="crm-dash-item" onclick="switchView('crm')">
          <div class="crm-dash-info">
            <div class="crm-dash-client">${escapeHtml(r.client_name || 'Unknown')}</div>
            <div class="crm-dash-watch">${escapeHtml(r.watch_requested || 'No watch specified')} · <span class="badge ${statusClass}" style="font-size:10px;padding:1px 6px;">${escapeHtml(r.status)}</span></div>
          </div>
          <div class="crm-dash-budget">${r.budget ? formatCurrency(r.budget) : '—'}</div>
        </div>
      `;
    }).join('');
  } catch(e) {}
}

// ========== INVENTORY VIEW ==========
async function loadInventory() {
  try {
    const watches = await apiFetch('/api/watches?status=in_stock');
    allWatches = watches;
    renderInventoryTable(watches);
    updateNavCounts();
  } catch(e) {}
}

function renderInventoryTable(watches) {
  const body = document.getElementById('inventoryBody');
  const empty = document.getElementById('inventoryEmpty');
  const tableEl = document.getElementById('inventoryTable');
  document.getElementById('inventoryBulkBar').style.display = 'none';
  const selectAll = tableEl.querySelector('.bulk-select-all');
  if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }

  if (!watches || watches.length === 0) {
    body.innerHTML = '';
    empty.style.display = 'flex';
    tableEl.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  tableEl.style.display = 'table';

  body.innerHTML = watches.map(w => {
    const paid = w.wire_confirmation && w.wire_confirmation.trim() !== '';
    return `
    <tr data-watch-id="${w.id}" data-search="${(w.brand+' '+w.model+' '+w.reference_number+' '+w.seller_name+' '+w.dial_color+' '+w.material).toLowerCase()}">
      <td class="td-checkbox" onclick="event.stopPropagation()"><input type="checkbox" class="row-checkbox" value="${w.id}" onchange="updateBulkBar('inventory')"></td>
      <td onclick="showDetail(${w.id})"><strong>${escapeHtml(w.brand)}</strong></td>
      <td onclick="showDetail(${w.id})">${escapeHtml(w.model)}</td>
      <td onclick="showDetail(${w.id})" style="color:var(--color-text-muted);">${escapeHtml(w.reference_number)}</td>
      <td onclick="showDetail(${w.id})">${escapeHtml(w.dial_color)}</td>
      <td onclick="showDetail(${w.id})">${escapeHtml(w.condition)}</td>
      <td onclick="showDetail(${w.id})">${formatDate(w.purchase_date)}</td>
      <td onclick="showDetail(${w.id})" style="font-variant-numeric:tabular-nums;">${formatCurrency(w.purchase_price)}</td>
      <td onclick="showDetail(${w.id})">${escapeHtml(w.seller_name)}</td>
      <td onclick="showDetail(${w.id})"><span class="badge ${paid ? 'badge-paid' : 'badge-unpaid'}">${paid ? 'Confirmed' : 'Needs Payment'}</span></td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();openSellModal(${w.id})" title="Mark as Sold">Sell</button>
      </td>
    </tr>
  `}).join('');
}

// ========== PENDING PAYMENT VIEW ==========
let pendingWatches = [];

async function loadPending() {
  try {
    const watches = await apiFetch('/api/watches?status=in_stock');
    pendingWatches = watches.filter(w => !w.wire_confirmation || w.wire_confirmation.trim() === '');
    renderPendingTable(pendingWatches);
    updateNavCounts();
  } catch(e) {}
}

function renderPendingTable(watches) {
  const body = document.getElementById('pendingBody');
  const empty = document.getElementById('pendingEmpty');
  const tableEl = document.getElementById('pendingTable');

  if (!watches || watches.length === 0) {
    body.innerHTML = '';
    empty.style.display = 'flex';
    tableEl.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  tableEl.style.display = 'table';

  body.innerHTML = watches.map(w => {
    const hasBankInfo = w.seller_bank_name || w.seller_routing_number || w.seller_account_number;
    const bankSummary = hasBankInfo
      ? escapeHtml((w.seller_bank_name || 'No bank') + (w.seller_routing_number ? ' \xb7 R:' + w.seller_routing_number.slice(-4) : ''))
      : '<span style="color:var(--color-error);">No wire info</span>';
    return `
    <tr data-search="${(w.brand+' '+w.model+' '+w.reference_number+' '+w.seller_name).toLowerCase()}">
      <td onclick="showDetail(${w.id})"><strong>${escapeHtml(w.brand)}</strong></td>
      <td onclick="showDetail(${w.id})">${escapeHtml(w.model)}</td>
      <td onclick="showDetail(${w.id})" style="color:var(--color-text-muted);">${escapeHtml(w.reference_number)}</td>
      <td onclick="showDetail(${w.id})" style="font-variant-numeric:tabular-nums;color:var(--color-error);font-weight:600;">${formatCurrency(w.purchase_price)}</td>
      <td onclick="showDetail(${w.id})">${escapeHtml(w.seller_name) || '<span style="color:var(--color-text-faint);">\u2014</span>'}</td>
      <td onclick="showDetail(${w.id})" style="font-size:var(--text-xs);">${bankSummary}</td>
      <td onclick="showDetail(${w.id})" style="color:var(--color-text-muted);">${w.purchase_date || '\u2014'}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();openEditPending(${w.id})" title="Add wire confirmation">Pay</button>
      </td>
    </tr>
    `;
  }).join('');
}

function openEditPending(id) {
  const w = pendingWatches.find(x => x.id === id);
  if (w) openEditModal(w);
}

// ========== SOLD VIEW ==========
async function loadSold() {
  try {
    const watches = await apiFetch('/api/watches?status=sold');
    renderSoldTable(watches);
    updateNavCounts();
  } catch(e) {}
}

function renderSoldTable(watches) {
  const body = document.getElementById('soldBody');
  const empty = document.getElementById('soldEmpty');
  const tableEl = document.getElementById('soldTable');
  document.getElementById('soldBulkBar').style.display = 'none';
  const selectAll = tableEl.querySelector('.bulk-select-all');
  if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }

  if (!watches || watches.length === 0) {
    body.innerHTML = '';
    empty.style.display = 'flex';
    tableEl.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  tableEl.style.display = 'table';

  body.innerHTML = watches.map(w => {
    const profit = (w.sold_price || 0) - (w.purchase_price || 0);
    const margin = w.sold_price > 0 ? (profit / w.sold_price * 100) : 0;
    const holdDays = calcHoldTime(w.purchase_date, w.sold_date);
    return `
      <tr data-watch-id="${w.id}" data-search="${(w.brand+' '+w.model+' '+w.buyer_name+' '+w.reference_number).toLowerCase()}">
        <td class="td-checkbox" onclick="event.stopPropagation()"><input type="checkbox" class="row-checkbox" value="${w.id}" onchange="updateBulkBar('sold')"></td>
        <td onclick="showDetail(${w.id})"><strong>${escapeHtml(w.brand)}</strong></td>
        <td onclick="showDetail(${w.id})">${escapeHtml(w.model)}</td>
        <td onclick="showDetail(${w.id})" style="font-variant-numeric:tabular-nums;">${formatCurrency(w.purchase_price)}</td>
        <td onclick="showDetail(${w.id})" style="font-variant-numeric:tabular-nums;">${formatCurrency(w.sold_price)}</td>
        <td onclick="showDetail(${w.id})" class="${profit >= 0 ? 'profit-positive' : 'profit-negative'}" style="font-weight:600;font-variant-numeric:tabular-nums;">${formatCurrency(profit)}</td>
        <td onclick="showDetail(${w.id})" class="${margin >= 0 ? 'profit-positive' : 'profit-negative'}" style="font-variant-numeric:tabular-nums;">${margin.toFixed(1)}%</td>
        <td onclick="showDetail(${w.id})">${escapeHtml(w.buyer_name)}</td>
        <td onclick="showDetail(${w.id})" style="font-variant-numeric:tabular-nums;">${formatDays(holdDays)}</td>
      </tr>
    `;
  }).join('');
}

// ========== ALL WATCHES VIEW ==========
async function loadAll() {
  try {
    const watches = await apiFetch('/api/watches');
    renderAllTable(watches);
    updateNavCounts();
  } catch(e) {}
}

function renderAllTable(watches) {
  const body = document.getElementById('allBody');
  const empty = document.getElementById('allEmpty');
  const tableEl = document.getElementById('allTable');

  if (!watches || watches.length === 0) {
    body.innerHTML = '';
    empty.style.display = 'flex';
    tableEl.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  tableEl.style.display = 'table';

  body.innerHTML = watches.map(w => {
    const profit = w.status === 'sold' ? ((w.sold_price || 0) - (w.purchase_price || 0)) : null;
    return `
      <tr onclick="showDetail(${w.id})" data-search="${(w.brand+' '+w.model+' '+w.reference_number+' '+w.material+' '+w.status).toLowerCase()}">
        <td><span class="badge ${w.status === 'sold' ? 'badge-sold' : 'badge-stock'}">${w.status === 'sold' ? 'Sold' : 'In Stock'}</span></td>
        <td><strong>${escapeHtml(w.brand)}</strong></td>
        <td>${escapeHtml(w.model)}</td>
        <td style="color:var(--color-text-muted);">${escapeHtml(w.reference_number)}</td>
        <td>${escapeHtml(w.material)}</td>
        <td>${escapeHtml(w.condition)}</td>
        <td style="font-variant-numeric:tabular-nums;">${formatCurrency(w.purchase_price)}</td>
        <td style="font-variant-numeric:tabular-nums;">${w.status === 'sold' ? formatCurrency(w.sold_price) : '—'}</td>
        <td class="${profit !== null ? (profit >= 0 ? 'profit-positive' : 'profit-negative') : ''}" style="font-weight:${profit !== null ? '600' : '400'};font-variant-numeric:tabular-nums;">${profit !== null ? formatCurrency(profit) : '—'}</td>
      </tr>
    `;
  }).join('');
}

// ========== CONTACTS VIEW ==========
let allContacts = [];
let contactFilter = 'all';

async function loadContacts() {
  try {
    const data = await apiFetch('/api/contacts');
    allContacts = data.contacts || [];
    renderContacts();
  } catch(e) {}
}

function setContactFilter(filter) {
  contactFilter = filter;
  document.querySelectorAll('[data-contact-filter]').forEach(btn => {
    btn.classList.toggle('chip-active', btn.getAttribute('data-contact-filter') === filter);
  });
  renderContacts();
}

function filterContacts() { renderContacts(); }

function renderContacts() {
  const list = document.getElementById('contactsList');
  const query = (document.getElementById('contactsSearch')?.value || '').toLowerCase().trim();

  let filtered = allContacts;
  if (contactFilter !== 'all') {
    filtered = filtered.filter(c => c.roles.includes(contactFilter));
  }
  if (query) {
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(query) ||
      (c.email || '').toLowerCase().includes(query) ||
      (c.phone || '').toLowerCase().includes(query) ||
      (c.address_city || '').toLowerCase().includes(query)
    );
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div style="color:var(--color-text-faint);font-size:var(--text-sm);padding:var(--space-8);text-align:center;">No contacts found</div>';
    return;
  }

  list.innerHTML = filtered.map(c => {
    const initials = c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const roleBadges = c.roles.map(r =>
      r === 'seller'
        ? '<span class="contact-role-badge contact-role-seller">Seller</span>'
        : '<span class="contact-role-badge contact-role-buyer">Buyer</span>'
    ).join('');
    const location = formatFullAddress('', c.address_city, c.address_state, '').replace(/^,\s*/, '');
    const statsParts = [];
    if (c.sell_deals > 0) statsParts.push(`${c.sell_deals} sold to you`);
    if (c.buy_deals > 0) statsParts.push(`${c.buy_deals} bought from you`);
    const statsText = statsParts.length ? statsParts.join(' · ') : 'No deals yet';
    return `
      <div class="contact-card" data-contact-name="${escapeHtml(c.name)}">
        <div class="contact-card-avatar">${escapeHtml(initials)}</div>
        <div class="contact-card-info">
          <div class="contact-card-top">
            <span class="contact-name">${escapeHtml(c.name)}</span>
            ${roleBadges}
          </div>
          <div class="contact-stats">${statsText} · ${formatCurrency(c.total_volume)}</div>
          ${location ? `<div class="contact-stats">${escapeHtml(location)}</div>` : ''}
        </div>
        <div class="contact-card-right">
          <span class="contact-deal-count">${c.total_deals}</span>
          <span class="contact-deal-label">deal${c.total_deals !== 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
  }).join('');

  // Attach click handlers
  list.querySelectorAll('.contact-card[data-contact-name]').forEach(card => {
    card.addEventListener('click', function() {
      showContactDetail(this.getAttribute('data-contact-name'));
    });
  });
}

// ========== SEARCH / FILTER ==========
function filterTable(view) {
  if (view === 'deals') { renderDealsTable(); return; }
  const searchId = { inventory: 'inventorySearch', sold: 'soldSearch', all: 'allSearch', crm: 'crmSearch', accessories: 'accessoriesSearch', pending: 'pendingSearch' }[view];
  const tableId = { inventory: 'inventoryBody', sold: 'soldBody', all: 'allBody', crm: 'crmBody', accessories: 'accessoriesBody', pending: 'pendingBody' }[view];
  const query = document.getElementById(searchId).value.toLowerCase();
  const rows = document.getElementById(tableId).querySelectorAll('tr');
  rows.forEach(row => {
    const text = row.getAttribute('data-search') || '';
    row.style.display = text.includes(query) ? '' : 'none';
  });
}

// ========== ADD / EDIT MODAL ==========
function openAddModal() {
  document.getElementById('formWatchId').value = '';
  document.getElementById('watchForm').reset();
  document.getElementById('customBrandGroup').style.display = 'none';
  document.getElementById('saleFields').style.display = 'none';
  document.getElementById('modalTitle').textContent = 'Add Watch';
  document.getElementById('modalSaveBtn').textContent = 'Add Watch';
  loadAutocompleteCache();
  document.getElementById('watchModal').classList.add('open');
}

function openEditModal(watch) {
  document.getElementById('formWatchId').value = watch.id;
  document.getElementById('formBrand').value = '';
  // Check if brand is in the dropdown
  const brandSelect = document.getElementById('formBrand');
  const options = Array.from(brandSelect.options).map(o => o.value);
  if (options.includes(watch.brand)) {
    brandSelect.value = watch.brand;
    document.getElementById('customBrandGroup').style.display = 'none';
  } else {
    brandSelect.value = '__other__';
    document.getElementById('customBrandGroup').style.display = 'flex';
    document.getElementById('formCustomBrand').value = watch.brand || '';
  }

  document.getElementById('formModel').value = watch.model || '';
  document.getElementById('formRefNum').value = watch.reference_number || '';
  document.getElementById('formSerialNum').value = watch.serial_number || '';
  document.getElementById('formDial').value = watch.dial_color || '';
  document.getElementById('formMaterial').value = watch.material || '';
  document.getElementById('formCondition').value = watch.condition || '';
  document.getElementById('formMovement').value = watch.movement_type || '';
  document.getElementById('formBoxPapers').value = watch.box_papers || '';
  document.getElementById('formPurchaseDate').value = watch.purchase_date || '';
  document.getElementById('formPurchasePrice').value = watch.purchase_price || '';
  document.getElementById('formSellerName').value = watch.seller_name || '';
  document.getElementById('formSellerEmail').value = watch.seller_email || '';
  document.getElementById('formSellerPhone').value = watch.seller_phone || '';
  document.getElementById('formSellerAddress').value = watch.seller_address || '';
  document.getElementById('formSellerAddressCity').value = watch.seller_address_city || '';
  document.getElementById('formSellerAddressState').value = watch.seller_address_state || '';
  document.getElementById('formSellerAddressZip').value = watch.seller_address_zip || '';
  document.getElementById('formSellerNotes').value = watch.seller_notes || '';
  document.getElementById('formNotes').value = watch.notes || '';
  document.getElementById('formWarrantyDate').value = watch.warranty_date || '';
  document.getElementById('formWireConfirmation').value = watch.wire_confirmation || '';
  document.getElementById('formSellerBankName').value = watch.seller_bank_name || '';
  document.getElementById('formSellerRoutingNumber').value = watch.seller_routing_number || '';
  document.getElementById('formSellerAccountNumber').value = watch.seller_account_number || '';
  document.getElementById('formSellerSwiftCode').value = watch.seller_swift_code || '';

  if (watch.status === 'sold') {
    document.getElementById('saleFields').style.display = 'contents';
    document.getElementById('formSoldDate').value = watch.sold_date || '';
    document.getElementById('formSoldPrice').value = watch.sold_price || '';
    document.getElementById('formBuyerName').value = watch.buyer_name || '';
    document.getElementById('formBuyerEmail').value = watch.buyer_email || '';
    document.getElementById('formBuyerPhone').value = watch.buyer_phone || '';
    document.getElementById('formBuyerAddress').value = watch.buyer_address || '';
    document.getElementById('formBuyerAddressCity').value = watch.buyer_address_city || '';
    document.getElementById('formBuyerAddressState').value = watch.buyer_address_state || '';
    document.getElementById('formBuyerAddressZip').value = watch.buyer_address_zip || '';
    document.getElementById('formBuyerNotes').value = watch.buyer_notes || '';
  } else {
    document.getElementById('saleFields').style.display = 'none';
  }

  document.getElementById('modalTitle').textContent = 'Edit Watch';
  document.getElementById('modalSaveBtn').textContent = 'Save Changes';
  document.getElementById('watchModal').classList.add('open');
}

function closeModal() {
  document.getElementById('watchModal').classList.remove('open');
  hideAllAutocomplete();
}

// ========== NAME AUTOCOMPLETE (Sellers & Buyers) ==========
let _sellersCache = [];
let _buyersCache = [];
let _autocompleteLocked = false; // prevent re-triggering after selection

async function loadAutocompleteCache() {
  try { _sellersCache = await apiFetch('/api/sellers'); } catch(e) { _sellersCache = []; }
  try { _buyersCache = await apiFetch('/api/buyers'); } catch(e) { _buyersCache = []; }
}

function hideAllAutocomplete() {
  document.querySelectorAll('.returning-dropdown').forEach(dd => dd.classList.remove('show'));
}

// Generic autocomplete renderer
function showAutocomplete(inputEl, ddId, items, nameKey, emailKey, cityKey, stateKey, onSelect) {
  const dd = document.getElementById(ddId);
  if (!dd) return;
  const q = inputEl.value.toLowerCase().trim();
  if (q.length < 2) { dd.classList.remove('show'); return; }
  const filtered = items.filter(item =>
    (item[nameKey] || '').toLowerCase().includes(q) || (item[emailKey] || '').toLowerCase().includes(q)
  );
  if (!filtered.length) { dd.classList.remove('show'); return; }
  dd.innerHTML = filtered.slice(0, 8).map((item, i) => {
    const count = item.deal_count || 0;
    return `<div class="returning-dropdown-item" data-ac-index="${i}">
      <div class="returning-dropdown-name">
        ${item[nameKey]}
        ${count > 1 ? '<span class="returning-dropdown-badge">' + count + ' deals</span>' : ''}
      </div>
      <div class="returning-dropdown-meta">${item[emailKey] || ''} &middot; ${item[cityKey] || ''} ${item[stateKey] || ''}</div>
    </div>`;
  }).join('');
  // Attach click handlers
  dd.querySelectorAll('.returning-dropdown-item').forEach((el, i) => {
    el.addEventListener('mousedown', function(e) {
      e.preventDefault(); // prevent blur hiding the dropdown before click registers
      onSelect(filtered[i]);
      dd.classList.remove('show');
    });
  });
  dd.classList.add('show');
}

// ---- Seller Name autocomplete ----
function onSellerNameInput(e) {
  if (_autocompleteLocked) { _autocompleteLocked = false; return; }
  showAutocomplete(e.target, 'sellerNameDropdown', _sellersCache,
    'seller_name', 'seller_email', 'seller_address_city', 'seller_address_state',
    function(s) {
      _autocompleteLocked = true;
      document.getElementById('formSellerName').value = s.seller_name || '';
      document.getElementById('formSellerEmail').value = s.seller_email || '';
      document.getElementById('formSellerPhone').value = s.seller_phone || '';
      document.getElementById('formSellerAddress').value = s.seller_address || '';
      document.getElementById('formSellerAddressCity').value = s.seller_address_city || '';
      document.getElementById('formSellerAddressState').value = s.seller_address_state || '';
      document.getElementById('formSellerAddressZip').value = s.seller_address_zip || '';
      document.getElementById('formSellerBankName').value = s.bank_name || '';
      document.getElementById('formSellerRoutingNumber').value = s.routing_number || '';
      document.getElementById('formSellerAccountNumber').value = s.account_number || '';
      document.getElementById('formSellerSwiftCode').value = s.swift_code || '';
      showToast('Seller info loaded for ' + s.seller_name);
    }
  );
}

// ---- Buyer Name autocomplete (Add/Edit Watch modal) ----
function onFormBuyerNameInput(e) {
  if (_autocompleteLocked) { _autocompleteLocked = false; return; }
  showAutocomplete(e.target, 'formBuyerNameDropdown', _buyersCache,
    'buyer_name', 'buyer_email', 'buyer_address_city', 'buyer_address_state',
    function(b) {
      _autocompleteLocked = true;
      document.getElementById('formBuyerName').value = b.buyer_name || '';
      document.getElementById('formBuyerEmail').value = b.buyer_email || '';
      document.getElementById('formBuyerPhone').value = b.buyer_phone || '';
      document.getElementById('formBuyerAddress').value = b.buyer_address || '';
      document.getElementById('formBuyerAddressCity').value = b.buyer_address_city || '';
      document.getElementById('formBuyerAddressState').value = b.buyer_address_state || '';
      document.getElementById('formBuyerAddressZip').value = b.buyer_address_zip || '';
      document.getElementById('formBuyerNotes').value = b.buyer_notes || '';
      showToast('Buyer info loaded for ' + b.buyer_name);
    }
  );
}

// ---- Buyer Name autocomplete (Sell Watch modal) ----
function onSellBuyerNameInput(e) {
  if (_autocompleteLocked) { _autocompleteLocked = false; return; }
  showAutocomplete(e.target, 'sellBuyerDropdown', _buyersCache,
    'buyer_name', 'buyer_email', 'buyer_address_city', 'buyer_address_state',
    function(b) {
      _autocompleteLocked = true;
      document.getElementById('sellBuyer').value = b.buyer_name || '';
      document.getElementById('sellBuyerEmail').value = b.buyer_email || '';
      document.getElementById('sellBuyerPhone').value = b.buyer_phone || '';
      document.getElementById('sellBuyerAddress').value = b.buyer_address || '';
      document.getElementById('sellBuyerAddressCity').value = b.buyer_address_city || '';
      document.getElementById('sellBuyerAddressState').value = b.buyer_address_state || '';
      document.getElementById('sellBuyerAddressZip').value = b.buyer_address_zip || '';
      document.getElementById('sellNotes').value = b.buyer_notes || '';
      showToast('Buyer info loaded for ' + b.buyer_name);
    }
  );
}

// Attach input listeners
document.getElementById('formSellerName').addEventListener('input', onSellerNameInput);
document.getElementById('formBuyerName').addEventListener('input', onFormBuyerNameInput);
document.getElementById('sellBuyer').addEventListener('input', onSellBuyerNameInput);

// Hide dropdowns on blur (with small delay so click can register)
['formSellerName','formBuyerName','sellBuyer'].forEach(id => {
  document.getElementById(id).addEventListener('blur', () => {
    setTimeout(hideAllAutocomplete, 200);
  });
});

// Close autocomplete dropdowns when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.autocomplete-group')) {
    hideAllAutocomplete();
  }
});

async function saveWatch() {
  const id = document.getElementById('formWatchId').value;
  let brand = document.getElementById('formBrand').value;
  if (brand === '__other__') {
    brand = document.getElementById('formCustomBrand').value;
  }

  const data = {
    brand: brand,
    model: document.getElementById('formModel').value,
    reference_number: document.getElementById('formRefNum').value,
    serial_number: document.getElementById('formSerialNum').value,
    dial_color: document.getElementById('formDial').value,
    material: document.getElementById('formMaterial').value,
    condition: document.getElementById('formCondition').value,
    movement_type: document.getElementById('formMovement').value,
    box_papers: document.getElementById('formBoxPapers').value,
    purchase_date: document.getElementById('formPurchaseDate').value,
    purchase_price: parseFloat(document.getElementById('formPurchasePrice').value) || 0,
    seller_name: document.getElementById('formSellerName').value,
    seller_email: document.getElementById('formSellerEmail').value,
    seller_phone: document.getElementById('formSellerPhone').value,
    seller_address: document.getElementById('formSellerAddress').value,
    seller_address_city: document.getElementById('formSellerAddressCity').value,
    seller_address_state: document.getElementById('formSellerAddressState').value,
    seller_address_zip: document.getElementById('formSellerAddressZip').value,
    seller_notes: document.getElementById('formSellerNotes').value,
    seller_bank_name: document.getElementById('formSellerBankName').value,
    seller_routing_number: document.getElementById('formSellerRoutingNumber').value,
    seller_account_number: document.getElementById('formSellerAccountNumber').value,
    seller_swift_code: document.getElementById('formSellerSwiftCode').value,
    notes: document.getElementById('formNotes').value,
    warranty_date: document.getElementById('formWarrantyDate').value,
    wire_confirmation: document.getElementById('formWireConfirmation').value,
  };

  if (!data.brand || !data.model) {
    showToast('Brand and Model are required.', 'error');
    return;
  }

  // Include sold fields if visible
  if (document.getElementById('saleFields').style.display === 'contents') {
    data.sold_date = document.getElementById('formSoldDate').value || null;
    data.sold_price = parseFloat(document.getElementById('formSoldPrice').value) || null;
    data.buyer_name = document.getElementById('formBuyerName').value || null;
    data.buyer_email = document.getElementById('formBuyerEmail').value || null;
    data.buyer_phone = document.getElementById('formBuyerPhone').value || null;
    data.buyer_address = document.getElementById('formBuyerAddress').value || null;
    data.buyer_address_city = document.getElementById('formBuyerAddressCity').value || null;
    data.buyer_address_state = document.getElementById('formBuyerAddressState').value || null;
    data.buyer_address_zip = document.getElementById('formBuyerAddressZip').value || null;
    data.buyer_notes = document.getElementById('formBuyerNotes').value || null;
  }

  try {
    if (id) {
      await apiFetch(`/api/watches/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      showToast('Watch updated successfully.');
    } else {
      await apiFetch('/api/watches', { method: 'POST', body: JSON.stringify(data) });
      showToast('Watch added successfully.');
    }
    closeModal();
    refreshCurrentView();
  } catch(e) {}
}

// ========== SELL MODAL ==========
function openSellModal(watchId) {
  document.getElementById('sellWatchId').value = watchId;
  document.getElementById('sellPrice').value = '';
  document.getElementById('sellDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('sellBuyer').value = '';
  document.getElementById('sellBuyerEmail').value = '';
  document.getElementById('sellBuyerPhone').value = '';
  document.getElementById('sellBuyerAddress').value = '';
  document.getElementById('sellBuyerAddressCity').value = '';
  document.getElementById('sellBuyerAddressState').value = '';
  document.getElementById('sellBuyerAddressZip').value = '';
  document.getElementById('sellNotes').value = '';
  loadAutocompleteCache();
  document.getElementById('sellModal').classList.add('open');
}

function closeSellModal() {
  document.getElementById('sellModal').classList.remove('open');
  hideAllAutocomplete();
}

async function confirmSell() {
  const id = document.getElementById('sellWatchId').value;
  const soldPrice = parseFloat(document.getElementById('sellPrice').value);
  if (!soldPrice || isNaN(soldPrice)) {
    showToast('Please enter a sold price.', 'error');
    return;
  }

  try {
    await apiFetch(`/api/watches/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'sold',
        sold_price: soldPrice,
        sold_date: document.getElementById('sellDate').value || null,
        buyer_name: document.getElementById('sellBuyer').value || null,
        buyer_email: document.getElementById('sellBuyerEmail').value || null,
        buyer_phone: document.getElementById('sellBuyerPhone').value || null,
        buyer_address: document.getElementById('sellBuyerAddress').value || null,
        buyer_address_city: document.getElementById('sellBuyerAddressCity').value || null,
        buyer_address_state: document.getElementById('sellBuyerAddressState').value || null,
        buyer_address_zip: document.getElementById('sellBuyerAddressZip').value || null,
        buyer_notes: document.getElementById('sellNotes').value || null,
      })
    });
    showToast('Watch marked as sold!');
    closeSellModal();
    closeDetailModal();
    refreshCurrentView();
  } catch(e) {}
}

// ========== DETAIL MODAL ==========
let _currentDetailWatch = null; // store current watch for edit/delete actions

async function showDetail(watchId) {
  try {
    const watches = await apiFetch('/api/watches');
    const w = watches.find(x => x.id === watchId);
    if (!w) return;

    _currentDetailWatch = w; // store for later use by buttons

    document.getElementById('detailTitle').textContent = `${w.brand} ${w.model}`;
    const profit = w.status === 'sold' ? ((w.sold_price || 0) - (w.purchase_price || 0)) : null;
    const holdDays = w.status === 'sold' ? calcHoldTime(w.purchase_date, w.sold_date) : null;

    let html = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);font-size:var(--text-sm);">
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">BRAND</div>
          <div style="font-weight:500;margin-top:2px;">${escapeHtml(w.brand)}</div>
        </div>
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">MODEL</div>
          <div style="font-weight:500;margin-top:2px;">${escapeHtml(w.model)}</div>
        </div>
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">REFERENCE</div>
          <div style="margin-top:2px;">${escapeHtml(w.reference_number) || '—'}</div>
        </div>
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">SERIAL</div>
          <div style="margin-top:2px;">${escapeHtml(w.serial_number) || '—'}</div>
        </div>
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">DIAL</div>
          <div style="margin-top:2px;">${escapeHtml(w.dial_color) || '—'}</div>
        </div>
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">MATERIAL</div>
          <div style="margin-top:2px;">${escapeHtml(w.material) || '—'}</div>
        </div>
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">CONDITION</div>
          <div style="margin-top:2px;">${escapeHtml(w.condition) || '—'}</div>
        </div>
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">MOVEMENT</div>
          <div style="margin-top:2px;">${escapeHtml(w.movement_type) || '—'}</div>
        </div>
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">BOX & PAPERS</div>
          <div style="margin-top:2px;">${escapeHtml(w.box_papers) || '—'}</div>
        </div>
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">WARRANTY DATE</div>
          <div style="margin-top:2px;">${w.warranty_date ? formatDate(w.warranty_date) : '—'}</div>
        </div>
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">STATUS</div>
          <div style="margin-top:2px;"><span class="badge ${w.status === 'sold' ? 'badge-sold' : 'badge-stock'}">${w.status === 'sold' ? 'Sold' : 'In Stock'}</span></div>
        </div>
      </div>

      <div style="margin-top:var(--space-5);padding-top:var(--space-4);border-top:1px solid var(--color-divider);">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);font-size:var(--text-sm);">
          <div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">PURCHASE DATE</div>
            <div style="margin-top:2px;">${formatDate(w.purchase_date)}</div>
          </div>
          <div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">PURCHASE PRICE</div>
            <div style="margin-top:2px;font-weight:600;font-variant-numeric:tabular-nums;">${formatCurrencyFull(w.purchase_price)}</div>
          </div>
          <div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">SELLER</div>
            <div style="margin-top:2px;">${escapeHtml(w.seller_name) || '—'}</div>
          </div>
          ${w.seller_email ? `<div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">SELLER EMAIL</div>
            <div style="margin-top:2px;">${escapeHtml(w.seller_email)}</div>
          </div>` : ''}
          ${w.seller_phone ? `<div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">SELLER PHONE</div>
            <div style="margin-top:2px;">${escapeHtml(w.seller_phone)}</div>
          </div>` : ''}
          ${w.seller_address || w.seller_address_city || w.seller_address_state || w.seller_address_zip ? `<div style="grid-column:span 2;">
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">SELLER ADDRESS</div>
            <div style="margin-top:2px;">${escapeHtml(formatFullAddress(w.seller_address, w.seller_address_city, w.seller_address_state, w.seller_address_zip))}</div>
          </div>` : ''}
          <div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">PAYMENT STATUS</div>
            <div style="margin-top:2px;"><span class="badge ${w.wire_confirmation ? 'badge-paid' : 'badge-unpaid'}">${w.wire_confirmation ? 'Confirmed' : 'Needs Payment'}</span></div>
          </div>
          ${w.wire_confirmation ? `<div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">WIRE CONFIRMATION #</div>
            <div style="margin-top:2px;font-variant-numeric:tabular-nums;">${escapeHtml(w.wire_confirmation)}</div>
          </div>` : ''}
          ${w.seller_bank_name ? `<div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">BANK NAME</div>
            <div style="margin-top:2px;">${escapeHtml(w.seller_bank_name)}</div>
          </div>` : ''}
          ${w.seller_routing_number ? `<div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">ROUTING NUMBER</div>
            <div style="margin-top:2px;font-variant-numeric:tabular-nums;">${escapeHtml(w.seller_routing_number)}</div>
          </div>` : ''}
          ${w.seller_account_number ? `<div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">ACCOUNT NUMBER</div>
            <div style="margin-top:2px;font-variant-numeric:tabular-nums;">${escapeHtml(w.seller_account_number)}</div>
          </div>` : ''}
          ${w.seller_swift_code ? `<div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">SWIFT CODE</div>
            <div style="margin-top:2px;font-variant-numeric:tabular-nums;">${escapeHtml(w.seller_swift_code)}</div>
          </div>` : ''}
        </div>
      </div>
    `;

    if (w.status === 'sold') {
      html += `
        <div style="margin-top:var(--space-5);padding-top:var(--space-4);border-top:1px solid var(--color-divider);">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);font-size:var(--text-sm);">
            <div>
              <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">SOLD DATE</div>
              <div style="margin-top:2px;">${formatDate(w.sold_date)}</div>
            </div>
            <div>
              <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">SOLD PRICE</div>
              <div style="margin-top:2px;font-weight:600;font-variant-numeric:tabular-nums;">${formatCurrencyFull(w.sold_price)}</div>
            </div>
            <div>
              <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">PROFIT</div>
              <div style="margin-top:2px;font-weight:600;color:${profit >= 0 ? 'var(--color-primary)' : 'var(--color-error)'};font-variant-numeric:tabular-nums;">${formatCurrency(profit)}</div>
            </div>
            <div>
              <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">HOLD TIME</div>
              <div style="margin-top:2px;">${formatDays(holdDays)}</div>
            </div>
            <div>
              <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">BUYER</div>
              <div style="margin-top:2px;">${escapeHtml(w.buyer_name) || '—'}</div>
            </div>
            ${w.buyer_email ? `<div>
              <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">BUYER EMAIL</div>
              <div style="margin-top:2px;">${escapeHtml(w.buyer_email)}</div>
            </div>` : ''}
            ${w.buyer_phone ? `<div>
              <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">BUYER PHONE</div>
              <div style="margin-top:2px;">${escapeHtml(w.buyer_phone)}</div>
            </div>` : ''}
            ${w.buyer_address || w.buyer_address_city || w.buyer_address_state || w.buyer_address_zip ? `<div style="grid-column:span 2;">
              <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">BUYER ADDRESS</div>
              <div style="margin-top:2px;">${escapeHtml(formatFullAddress(w.buyer_address, w.buyer_address_city, w.buyer_address_state, w.buyer_address_zip))}</div>
            </div>` : ''}
          </div>
        </div>
      `;
    }

    if (w.notes) {
      html += `
        <div style="margin-top:var(--space-5);padding-top:var(--space-4);border-top:1px solid var(--color-divider);">
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;margin-bottom:4px;">NOTES</div>
          <div style="font-size:var(--text-sm);color:var(--color-text-muted);">${escapeHtml(w.notes)}</div>
        </div>
      `;
    }

    document.getElementById('detailBody').innerHTML = html;

    // Footer buttons — use data attributes + JS variable instead of inline JSON
    let footerHtml = `
      <button class="btn btn-danger btn-sm" onclick="deleteWatch(${w.id})">Delete</button>
      <div style="flex:1;"></div>
      <button class="btn btn-secondary" onclick="downloadInvoice(${w.id})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-2px;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Invoice
      </button>
      <button class="btn btn-secondary" onclick="editCurrentDetailWatch()">Edit</button>
    `;
    if (w.status === 'in_stock') {
      footerHtml += `<button class="btn btn-primary" onclick="closeDetailModal();openSellModal(${w.id})">Mark as Sold</button>`;
    }
    document.getElementById('detailFooter').innerHTML = footerHtml;

    document.getElementById('detailModal').classList.add('open');
  } catch(e) { console.error('showDetail error:', e); }
}

function editCurrentDetailWatch() {
  if (!_currentDetailWatch) return;
  closeDetailModal();
  openEditModal(_currentDetailWatch);
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('open');
}

async function downloadInvoice(watchId) {
  try {
    showToast('Generating invoice...');
    const resp = await fetch(`${API}/api/watches/${watchId}/invoice`);
    if (!resp.ok) throw new Error('Failed to generate invoice');
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    // Open in new tab — works in sandboxed iframes where direct download is blocked
    window.open(blobUrl, '_blank');
    // Also try the download approach as fallback
    const a = document.createElement('a');
    a.href = blobUrl;
    const cd = resp.headers.get('content-disposition') || '';
    const match = cd.match(/filename="?([^"]+)"?/);
    a.download = match ? match[1] : `Invoice_${watchId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    showToast('Invoice ready', 'success');
  } catch(e) {
    console.error('Invoice download error:', e);
    showToast('Failed to download invoice', 'error');
  }
}

// ========== DELETE ==========
let _pendingDeleteId = null;

function deleteWatch(id) {
  _pendingDeleteId = id;
  document.getElementById('confirmModal').classList.add('open');
}

function cancelDelete() {
  _pendingDeleteId = null;
  _pendingCrmDeleteId = null;
  document.getElementById('confirmModal').classList.remove('open');
}

async function confirmDelete() {
  // Handle CRM delete
  if (_pendingCrmDeleteId) {
    const id = _pendingCrmDeleteId;
    _pendingCrmDeleteId = null;
    document.getElementById('confirmModal').classList.remove('open');
    try {
      await apiFetch(`/api/crm/${id}`, { method: 'DELETE' });
      showToast('Request deleted.');
      loadCrm();
    } catch(e) {}
    return;
  }
  // Handle watch delete
  const id = _pendingDeleteId;
  if (!id) return;
  document.getElementById('confirmModal').classList.remove('open');
  _pendingDeleteId = null;
  try {
    await apiFetch(`/api/watches/${id}`, { method: 'DELETE' });
    showToast('Watch deleted.');
    closeDetailModal();
    refreshCurrentView();
  } catch(e) {}
}

// ========== CRM / REQUESTS ==========
async function loadCrm() {
  try {
    const requests = await apiFetch('/api/crm');
    renderCrmTable(requests);
    updateCrmCount();
  } catch(e) {}
}

function renderCrmTable(requests) {
  const body = document.getElementById('crmBody');
  const empty = document.getElementById('crmEmpty');
  const tableEl = document.getElementById('crmTable');

  if (!requests || requests.length === 0) {
    body.innerHTML = '';
    empty.style.display = 'flex';
    tableEl.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  tableEl.style.display = 'table';

  const statusLabels = { looking: 'Looking', sourced: 'Sourced', offered: 'Offered', fulfilled: 'Fulfilled', cancelled: 'Cancelled' };
  const statusClasses = { looking: 'badge-looking', sourced: 'badge-sourced', offered: 'badge-offered', fulfilled: 'badge-sold', cancelled: 'badge-cancelled' };

  body.innerHTML = requests.map(r => `
    <tr data-search="${(r.client_name+' '+r.watch_requested+' '+r.notes+' '+r.status+' '+(r.lead_source||'')).toLowerCase()}">
      <td><span class="badge ${statusClasses[r.status] || 'badge-stock'}">${statusLabels[r.status] || r.status}</span></td>
      <td><strong>${escapeHtml(r.client_name)}</strong>${r.client_contact ? '<br><span style="color:var(--color-text-faint);font-size:var(--text-xs);">' + escapeHtml(r.client_contact) + '</span>' : ''}</td>
      <td>${escapeHtml(r.watch_requested)}</td>
      <td style="font-variant-numeric:tabular-nums;">${r.budget ? formatCurrency(r.budget) : '—'}</td>
      <td style="color:var(--color-text-muted);">${escapeHtml(r.lead_source) || '—'}</td>
      <td style="color:var(--color-text-muted);">${formatDate(r.created_at)}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--color-text-muted);">${escapeHtml(r.notes) || '—'}</td>
      <td style="white-space:nowrap;">${r.reminder_days ? '<span class="badge badge-reminder" style="font-size:10px;padding:1px 6px;">Every ' + r.reminder_days + 'd</span>' : '<span style="color:var(--color-text-faint);">—</span>'}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();openEditCrm(${r.id})" title="Edit">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteCrmRequest(${r.id})" title="Delete" style="margin-left:4px;">×</button>
      </td>
    </tr>
  `).join('');
}

function openCrmModal() {
  document.getElementById('crmFormId').value = '';
  document.getElementById('crmClient').value = '';
  document.getElementById('crmContact').value = '';
  document.getElementById('crmSource').value = '';
  document.getElementById('crmWatch').value = '';
  document.getElementById('crmBudget').value = '';
  document.getElementById('crmStatus').value = 'looking';
  document.getElementById('crmReminderDays').value = '';
  document.getElementById('crmNotes').value = '';
  document.getElementById('crmModalTitle').textContent = 'Add Request';
  document.getElementById('crmSaveBtn').textContent = 'Add Request';
  document.getElementById('crmModal').classList.add('open');
}

async function openEditCrm(id) {
  try {
    const requests = await apiFetch('/api/crm');
    const r = requests.find(x => x.id === id);
    if (!r) return;
    document.getElementById('crmFormId').value = r.id;
    document.getElementById('crmClient').value = r.client_name || '';
    document.getElementById('crmContact').value = r.client_contact || '';
    document.getElementById('crmSource').value = r.lead_source || '';
    document.getElementById('crmWatch').value = r.watch_requested || '';
    document.getElementById('crmBudget').value = r.budget || '';
    document.getElementById('crmStatus').value = r.status || 'looking';
    document.getElementById('crmReminderDays').value = r.reminder_days || '';
    document.getElementById('crmNotes').value = r.notes || '';
    document.getElementById('crmModalTitle').textContent = 'Edit Request';
    document.getElementById('crmSaveBtn').textContent = 'Save Changes';
    document.getElementById('crmModal').classList.add('open');
  } catch(e) {}
}

function closeCrmModal() {
  document.getElementById('crmModal').classList.remove('open');
}

async function saveCrmRequest() {
  const id = document.getElementById('crmFormId').value;
  const reminderDaysVal = document.getElementById('crmReminderDays').value;
  const data = {
    client_name: document.getElementById('crmClient').value,
    client_contact: document.getElementById('crmContact').value,
    watch_requested: document.getElementById('crmWatch').value,
    budget: parseFloat(document.getElementById('crmBudget').value) || 0,
    status: document.getElementById('crmStatus').value,
    lead_source: document.getElementById('crmSource').value,
    notes: document.getElementById('crmNotes').value,
    reminder_days: reminderDaysVal ? parseInt(reminderDaysVal) : null,
    reminder_start: reminderDaysVal ? new Date().toISOString() : null,
  };
  // If editing and reminder_days hasn't changed, don't reset reminder_start
  if (id && reminderDaysVal) {
    try {
      const allReqs = await apiFetch('/api/crm');
      const existing = allReqs.find(x => x.id === parseInt(id));
      if (existing && existing.reminder_days === parseInt(reminderDaysVal) && existing.reminder_start) {
        data.reminder_start = existing.reminder_start;
      }
    } catch(e) {}
  }
  if (!data.client_name || !data.watch_requested) {
    showToast('Client name and watch are required.', 'error');
    return;
  }
  try {
    if (id) {
      await apiFetch(`/api/crm/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      showToast('Request updated.');
    } else {
      await apiFetch('/api/crm', { method: 'POST', body: JSON.stringify(data) });
      showToast('Request added.');
    }
    closeCrmModal();
    loadCrm();
  } catch(e) {}
}

let _pendingCrmDeleteId = null;
function deleteCrmRequest(id) {
  _pendingCrmDeleteId = id;
  document.getElementById('confirmModal').classList.add('open');
}

async function updateCrmCount() {
  try {
    const all = await apiFetch('/api/crm');
    const active = all.filter(r => r.status !== 'fulfilled' && r.status !== 'cancelled').length;
    document.getElementById('navCrmCount').textContent = active;
  } catch(e) {}
}

// ========== BULK SELECT & DELETE ==========
function getCheckedIds(view) {
  const bodyId = { inventory: 'inventoryBody', sold: 'soldBody', accessories: 'accessoriesBody' }[view];
  const checkboxes = document.getElementById(bodyId).querySelectorAll('.row-checkbox:checked');
  return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

function updateBulkBar(view) {
  const ids = getCheckedIds(view);
  const barId = { inventory: 'inventoryBulkBar', sold: 'soldBulkBar', accessories: 'accessoriesBulkBar' }[view];
  const countId = { inventory: 'inventoryBulkCount', sold: 'soldBulkCount', accessories: 'accessoriesBulkCount' }[view];
  const bar = document.getElementById(barId);
  const count = document.getElementById(countId);

  if (ids.length > 0) {
    bar.style.display = 'flex';
    count.textContent = `${ids.length} selected`;
  } else {
    bar.style.display = 'none';
  }

  // Update select-all checkbox state
  const bodyId = { inventory: 'inventoryBody', sold: 'soldBody', accessories: 'accessoriesBody' }[view];
  const allBoxes = document.getElementById(bodyId).querySelectorAll('.row-checkbox');
  const tableId = { inventory: 'inventoryTable', sold: 'soldTable', accessories: 'accessoriesTable' }[view];
  const selectAll = document.getElementById(tableId).querySelector('.bulk-select-all');
  if (selectAll) {
    selectAll.checked = allBoxes.length > 0 && ids.length === allBoxes.length;
    selectAll.indeterminate = ids.length > 0 && ids.length < allBoxes.length;
  }
}

function toggleSelectAll(view, checkbox) {
  const bodyId = { inventory: 'inventoryBody', sold: 'soldBody', accessories: 'accessoriesBody' }[view];
  const allBoxes = document.getElementById(bodyId).querySelectorAll('.row-checkbox');
  allBoxes.forEach(cb => { cb.checked = checkbox.checked; });
  updateBulkBar(view);
}

let _pendingBulkDeleteView = null;
let _pendingBulkDeleteIds = [];

function bulkDeleteWatches(view) {
  const ids = getCheckedIds(view);
  if (ids.length === 0) return;
  _pendingBulkDeleteView = view;
  _pendingBulkDeleteIds = ids;
  // Update confirm modal text for bulk
  document.getElementById('confirmModal').querySelector('.modal-title').textContent = 'Delete Watches';
  document.getElementById('confirmModal').querySelector('.modal-body p').textContent =
    `Are you sure you want to delete ${ids.length} watch${ids.length > 1 ? 'es' : ''}? This action cannot be undone.`;
  document.getElementById('confirmModal').classList.add('open');
}

// Patch confirmDelete to handle bulk deletes, accessory deletes, and deal deletes
const _originalConfirmDelete = confirmDelete;
confirmDelete = async function() {
  // Handle contact delete
  if (_pendingContactDelete) {
    const { name } = _pendingContactDelete;
    _pendingContactDelete = null;
    document.getElementById('confirmModal').classList.remove('open');
    document.getElementById('confirmModal').querySelector('.modal-title').textContent = 'Delete Watch';
    document.getElementById('confirmModal').querySelector('.modal-body p').textContent =
      'Are you sure you want to delete this watch? This action cannot be undone.';
    try {
      await apiFetch(`/api/contact-delete?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
      showToast(`${name} deleted from contacts.`);
      loadContacts();
    } catch(e) {
      showToast('Failed to delete contact', 'error');
    }
    return;
  }
  // Handle deal delete
  if (_pendingDealDeleteId) {
    const id = _pendingDealDeleteId;
    _pendingDealDeleteId = null;
    document.getElementById('confirmModal').classList.remove('open');
    document.getElementById('confirmModal').querySelector('.modal-title').textContent = 'Delete Watch';
    document.getElementById('confirmModal').querySelector('.modal-body p').textContent =
      'Are you sure you want to delete this watch? This action cannot be undone.';
    try {
      await apiFetch(`/api/deals/${id}`, { method: 'DELETE' });
      showToast('Deal deleted.');
      closeDealDetailModal();
      loadDeals();
      loadDashboard();
      updateDealsCount();
    } catch(e) {
      showToast('Failed to delete deal', 'error');
    }
    return;
  }
  // Handle accessory bulk delete
  if (_pendingAccBulkDeleteIds.length > 0) {
    const ids = _pendingAccBulkDeleteIds;
    _pendingAccBulkDeleteIds = [];
    document.getElementById('confirmModal').classList.remove('open');
    document.getElementById('confirmModal').querySelector('.modal-title').textContent = 'Delete Watch';
    document.getElementById('confirmModal').querySelector('.modal-body p').textContent =
      'Are you sure you want to delete this watch? This action cannot be undone.';
    try {
      await apiFetch('/api/accessories/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: ids })
      });
      showToast(`${ids.length} accessor${ids.length > 1 ? 'ies' : 'y'} deleted.`);
      loadAccessories();
    } catch(e) {}
    return;
  }
  // Handle single accessory delete
  if (_pendingAccDeleteId) {
    const id = _pendingAccDeleteId;
    _pendingAccDeleteId = null;
    document.getElementById('confirmModal').classList.remove('open');
    document.getElementById('confirmModal').querySelector('.modal-title').textContent = 'Delete Watch';
    document.getElementById('confirmModal').querySelector('.modal-body p').textContent =
      'Are you sure you want to delete this watch? This action cannot be undone.';
    try {
      await apiFetch(`/api/accessories/${id}`, { method: 'DELETE' });
      showToast('Accessory deleted.');
      closeAccDetailModal();
      loadAccessories();
    } catch(e) {}
    return;
  }
  // Handle watch bulk delete
  if (_pendingBulkDeleteIds.length > 0) {
    const ids = _pendingBulkDeleteIds;
    const view = _pendingBulkDeleteView;
    _pendingBulkDeleteIds = [];
    _pendingBulkDeleteView = null;
    document.getElementById('confirmModal').classList.remove('open');
    // Reset modal text
    document.getElementById('confirmModal').querySelector('.modal-title').textContent = 'Delete Watch';
    document.getElementById('confirmModal').querySelector('.modal-body p').textContent =
      'Are you sure you want to delete this watch? This action cannot be undone.';
    try {
      await apiFetch('/api/watches/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: ids })
      });
      showToast(`${ids.length} watch${ids.length > 1 ? 'es' : ''} deleted.`);
      refreshCurrentView();
    } catch(e) {}
    return;
  }
  // Fall through to original handler for single deletes
  return _originalConfirmDelete();
};

// Also patch cancelDelete to reset bulk state
const _originalCancelDelete = cancelDelete;
cancelDelete = function() {
  _pendingBulkDeleteIds = [];
  _pendingBulkDeleteView = null;
  _pendingAccDeleteId = null;
  _pendingAccBulkDeleteIds = [];
  _pendingDealDeleteId = null;
  _pendingContactDelete = null;
  // Reset modal text
  document.getElementById('confirmModal').querySelector('.modal-title').textContent = 'Delete Watch';
  document.getElementById('confirmModal').querySelector('.modal-body p').textContent =
    'Are you sure you want to delete this watch? This action cannot be undone.';
  return _originalCancelDelete();
};

// ========== ACCESSORIES ==========
let _currentDetailAccessory = null;

async function loadAccessories() {
  try {
    const accessories = await apiFetch('/api/accessories');
    renderAccessoriesTable(accessories);
    updateAccessoriesCount();
  } catch(e) {}
}

function renderAccessoriesTable(items) {
  const body = document.getElementById('accessoriesBody');
  const empty = document.getElementById('accessoriesEmpty');
  const tableEl = document.getElementById('accessoriesTable');
  document.getElementById('accessoriesBulkBar').style.display = 'none';
  const selectAll = tableEl.querySelector('.bulk-select-all');
  if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }

  if (!items || items.length === 0) {
    body.innerHTML = '';
    empty.style.display = 'flex';
    tableEl.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  tableEl.style.display = 'table';

  body.innerHTML = items.map(a => {
    const paid = a.wire_confirmation && a.wire_confirmation.trim() !== '';
    return `
    <tr data-acc-id="${a.id}" data-search="${(a.type+' '+a.brand+' '+a.description+' '+a.compatible_watch+' '+a.seller_name+' '+a.condition+' '+a.status).toLowerCase()}">
      <td class="td-checkbox" onclick="event.stopPropagation()"><input type="checkbox" class="row-checkbox" value="${a.id}" onchange="updateBulkBar('accessories')"></td>
      <td onclick="showAccDetail(${a.id})"><span class="badge badge-acc-type">${escapeHtml(a.type)}</span></td>
      <td onclick="showAccDetail(${a.id})"><strong>${escapeHtml(a.brand)}</strong></td>
      <td onclick="showAccDetail(${a.id})">${escapeHtml(a.description)}</td>
      <td onclick="showAccDetail(${a.id})" style="color:var(--color-text-muted);">${escapeHtml(a.compatible_watch) || '—'}</td>
      <td onclick="showAccDetail(${a.id})">${escapeHtml(a.condition) || '—'}</td>
      <td onclick="showAccDetail(${a.id})" style="font-variant-numeric:tabular-nums;">${formatCurrency(a.purchase_price)}</td>
      <td onclick="showAccDetail(${a.id})"><span class="badge ${a.status === 'sold' ? 'badge-sold' : 'badge-stock'}">${a.status === 'sold' ? 'Sold' : 'In Stock'}</span></td>
      <td onclick="showAccDetail(${a.id})"><span class="badge ${paid ? 'badge-paid' : 'badge-unpaid'}">${paid ? 'Confirmed' : 'Needs Payment'}</span></td>
      <td>
        ${a.status === 'in_stock' ? `<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();openAccSellModal(${a.id})" title="Mark as Sold">Sell</button>` : ''}
      </td>
    </tr>
  `}).join('');
}

function openAccessoryModal() {
  document.getElementById('accFormId').value = '';
  document.getElementById('accessoryForm').reset();
  document.getElementById('accSaleFields').style.display = 'none';
  document.getElementById('accModalTitle').textContent = 'Add Accessory';
  document.getElementById('accModalSaveBtn').textContent = 'Add Accessory';
  document.getElementById('accessoryModal').classList.add('open');
}

function openEditAccessoryModal(acc) {
  document.getElementById('accFormId').value = acc.id;
  document.getElementById('accFormType').value = acc.type || 'Bracelet';
  document.getElementById('accFormBrand').value = acc.brand || '';
  document.getElementById('accFormDescription').value = acc.description || '';
  document.getElementById('accFormCompatWatch').value = acc.compatible_watch || '';
  document.getElementById('accFormCondition').value = acc.condition || '';
  document.getElementById('accFormPurchaseDate').value = acc.purchase_date || '';
  document.getElementById('accFormPurchasePrice').value = acc.purchase_price || '';
  document.getElementById('accFormSeller').value = acc.seller_name || '';
  document.getElementById('accFormSellerEmail').value = acc.seller_email || '';
  document.getElementById('accFormSellerPhone').value = acc.seller_phone || '';
  document.getElementById('accFormSellerAddress').value = acc.seller_address || '';
  document.getElementById('accFormSellerAddressCity').value = acc.seller_address_city || '';
  document.getElementById('accFormSellerAddressState').value = acc.seller_address_state || '';
  document.getElementById('accFormSellerAddressZip').value = acc.seller_address_zip || '';
  document.getElementById('accFormWire').value = acc.wire_confirmation || '';
  document.getElementById('accFormNotes').value = acc.notes || '';

  if (acc.status === 'sold') {
    document.getElementById('accSaleFields').style.display = 'contents';
    document.getElementById('accFormSoldDate').value = acc.sold_date || '';
    document.getElementById('accFormSoldPrice').value = acc.sold_price || '';
    document.getElementById('accFormBuyer').value = acc.buyer_name || '';
    document.getElementById('accFormBuyerEmail').value = acc.buyer_email || '';
    document.getElementById('accFormBuyerPhone').value = acc.buyer_phone || '';
    document.getElementById('accFormBuyerAddress').value = acc.buyer_address || '';
    document.getElementById('accFormBuyerAddressCity').value = acc.buyer_address_city || '';
    document.getElementById('accFormBuyerAddressState').value = acc.buyer_address_state || '';
    document.getElementById('accFormBuyerAddressZip').value = acc.buyer_address_zip || '';
  } else {
    document.getElementById('accSaleFields').style.display = 'none';
  }

  document.getElementById('accModalTitle').textContent = 'Edit Accessory';
  document.getElementById('accModalSaveBtn').textContent = 'Save Changes';
  document.getElementById('accessoryModal').classList.add('open');
}

function closeAccessoryModal() {
  document.getElementById('accessoryModal').classList.remove('open');
}

async function saveAccessory() {
  const id = document.getElementById('accFormId').value;
  const data = {
    type: document.getElementById('accFormType').value,
    brand: document.getElementById('accFormBrand').value,
    description: document.getElementById('accFormDescription').value,
    compatible_watch: document.getElementById('accFormCompatWatch').value,
    condition: document.getElementById('accFormCondition').value,
    purchase_date: document.getElementById('accFormPurchaseDate').value,
    purchase_price: parseFloat(document.getElementById('accFormPurchasePrice').value) || 0,
    seller_name: document.getElementById('accFormSeller').value,
    seller_email: document.getElementById('accFormSellerEmail').value,
    seller_phone: document.getElementById('accFormSellerPhone').value,
    seller_address: document.getElementById('accFormSellerAddress').value,
    seller_address_city: document.getElementById('accFormSellerAddressCity').value,
    seller_address_state: document.getElementById('accFormSellerAddressState').value,
    seller_address_zip: document.getElementById('accFormSellerAddressZip').value,
    wire_confirmation: document.getElementById('accFormWire').value,
    notes: document.getElementById('accFormNotes').value,
  };

  if (!data.brand) {
    showToast('Brand is required.', 'error');
    return;
  }

  // Include sold fields if visible
  if (document.getElementById('accSaleFields').style.display === 'contents') {
    data.sold_date = document.getElementById('accFormSoldDate').value || null;
    data.sold_price = parseFloat(document.getElementById('accFormSoldPrice').value) || null;
    data.buyer_name = document.getElementById('accFormBuyer').value || null;
    data.buyer_email = document.getElementById('accFormBuyerEmail').value || null;
    data.buyer_phone = document.getElementById('accFormBuyerPhone').value || null;
    data.buyer_address = document.getElementById('accFormBuyerAddress').value || null;
    data.buyer_address_city = document.getElementById('accFormBuyerAddressCity').value || null;
    data.buyer_address_state = document.getElementById('accFormBuyerAddressState').value || null;
    data.buyer_address_zip = document.getElementById('accFormBuyerAddressZip').value || null;
  }

  try {
    if (id) {
      await apiFetch(`/api/accessories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      showToast('Accessory updated.');
    } else {
      await apiFetch('/api/accessories', { method: 'POST', body: JSON.stringify(data) });
      showToast('Accessory added.');
    }
    closeAccessoryModal();
    loadAccessories();
  } catch(e) {}
}

// Accessory sell modal
function openAccSellModal(accId) {
  document.getElementById('accSellId').value = accId;
  document.getElementById('accSellPrice').value = '';
  document.getElementById('accSellDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('accSellBuyer').value = '';
  document.getElementById('accSellBuyerEmail').value = '';
  document.getElementById('accSellBuyerPhone').value = '';
  document.getElementById('accSellBuyerAddress').value = '';
  document.getElementById('accSellBuyerAddressCity').value = '';
  document.getElementById('accSellBuyerAddressState').value = '';
  document.getElementById('accSellBuyerAddressZip').value = '';
  document.getElementById('accSellModal').classList.add('open');
}

function closeAccSellModal() {
  document.getElementById('accSellModal').classList.remove('open');
}

async function confirmAccSell() {
  const id = document.getElementById('accSellId').value;
  const soldPrice = parseFloat(document.getElementById('accSellPrice').value);
  if (!soldPrice || isNaN(soldPrice)) {
    showToast('Please enter a sold price.', 'error');
    return;
  }
  try {
    await apiFetch(`/api/accessories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'sold',
        sold_price: soldPrice,
        sold_date: document.getElementById('accSellDate').value || null,
        buyer_name: document.getElementById('accSellBuyer').value || null,
        buyer_email: document.getElementById('accSellBuyerEmail').value || null,
        buyer_phone: document.getElementById('accSellBuyerPhone').value || null,
        buyer_address: document.getElementById('accSellBuyerAddress').value || null,
        buyer_address_city: document.getElementById('accSellBuyerAddressCity').value || null,
        buyer_address_state: document.getElementById('accSellBuyerAddressState').value || null,
        buyer_address_zip: document.getElementById('accSellBuyerAddressZip').value || null,
      })
    });
    showToast('Accessory marked as sold.');
    closeAccSellModal();
    closeAccDetailModal();
    loadAccessories();
  } catch(e) {}
}

// Accessory detail modal
async function showAccDetail(accId) {
  try {
    const items = await apiFetch('/api/accessories');
    const a = items.find(x => x.id === accId);
    if (!a) return;

    _currentDetailAccessory = a;

    document.getElementById('accDetailTitle').textContent = `${a.brand} ${a.type}`;
    const profit = a.status === 'sold' ? ((a.sold_price || 0) - (a.purchase_price || 0)) : null;

    let html = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);font-size:var(--text-sm);">
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">TYPE</div>
          <div style="font-weight:500;margin-top:2px;">${escapeHtml(a.type)}</div>
        </div>
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">BRAND</div>
          <div style="font-weight:500;margin-top:2px;">${escapeHtml(a.brand)}</div>
        </div>
        <div style="grid-column:span 2;">
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">DESCRIPTION</div>
          <div style="margin-top:2px;">${escapeHtml(a.description) || '—'}</div>
        </div>
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">COMPATIBLE WATCH</div>
          <div style="margin-top:2px;">${escapeHtml(a.compatible_watch) || '—'}</div>
        </div>
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">CONDITION</div>
          <div style="margin-top:2px;">${escapeHtml(a.condition) || '—'}</div>
        </div>
        <div>
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">STATUS</div>
          <div style="margin-top:2px;"><span class="badge ${a.status === 'sold' ? 'badge-sold' : 'badge-stock'}">${a.status === 'sold' ? 'Sold' : 'In Stock'}</span></div>
        </div>
      </div>

      <div style="margin-top:var(--space-5);padding-top:var(--space-4);border-top:1px solid var(--color-divider);">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);font-size:var(--text-sm);">
          <div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">PURCHASE DATE</div>
            <div style="margin-top:2px;">${formatDate(a.purchase_date)}</div>
          </div>
          <div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">PURCHASE PRICE</div>
            <div style="margin-top:2px;font-weight:600;font-variant-numeric:tabular-nums;">${formatCurrencyFull(a.purchase_price)}</div>
          </div>
          <div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">SELLER</div>
            <div style="margin-top:2px;">${escapeHtml(a.seller_name) || '—'}</div>
          </div>
          ${a.seller_email ? `<div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">SELLER EMAIL</div>
            <div style="margin-top:2px;">${escapeHtml(a.seller_email)}</div>
          </div>` : ''}
          ${a.seller_phone ? `<div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">SELLER PHONE</div>
            <div style="margin-top:2px;">${escapeHtml(a.seller_phone)}</div>
          </div>` : ''}
          ${a.seller_address || a.seller_address_city || a.seller_address_state || a.seller_address_zip ? `<div style="grid-column:span 2;">
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">SELLER ADDRESS</div>
            <div style="margin-top:2px;">${escapeHtml(formatFullAddress(a.seller_address, a.seller_address_city, a.seller_address_state, a.seller_address_zip))}</div>
          </div>` : ''}
          <div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">PAYMENT STATUS</div>
            <div style="margin-top:2px;"><span class="badge ${a.wire_confirmation ? 'badge-paid' : 'badge-unpaid'}">${a.wire_confirmation ? 'Confirmed' : 'Needs Payment'}</span></div>
          </div>
          ${a.wire_confirmation ? `<div>
            <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">WIRE CONFIRMATION #</div>
            <div style="margin-top:2px;font-variant-numeric:tabular-nums;">${escapeHtml(a.wire_confirmation)}</div>
          </div>` : ''}
        </div>
      </div>
    `;

    if (a.status === 'sold') {
      html += `
        <div style="margin-top:var(--space-5);padding-top:var(--space-4);border-top:1px solid var(--color-divider);">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);font-size:var(--text-sm);">
            <div>
              <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">SOLD DATE</div>
              <div style="margin-top:2px;">${formatDate(a.sold_date)}</div>
            </div>
            <div>
              <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">SOLD PRICE</div>
              <div style="margin-top:2px;font-weight:600;font-variant-numeric:tabular-nums;">${formatCurrencyFull(a.sold_price)}</div>
            </div>
            <div>
              <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">PROFIT</div>
              <div style="margin-top:2px;font-weight:600;color:${profit >= 0 ? 'var(--color-primary)' : 'var(--color-error)'};font-variant-numeric:tabular-nums;">${formatCurrency(profit)}</div>
            </div>
            <div>
              <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">BUYER</div>
              <div style="margin-top:2px;">${escapeHtml(a.buyer_name) || '—'}</div>
            </div>
            ${a.buyer_email ? `<div>
              <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">BUYER EMAIL</div>
              <div style="margin-top:2px;">${escapeHtml(a.buyer_email)}</div>
            </div>` : ''}
            ${a.buyer_phone ? `<div>
              <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">BUYER PHONE</div>
              <div style="margin-top:2px;">${escapeHtml(a.buyer_phone)}</div>
            </div>` : ''}
            ${a.buyer_address || a.buyer_address_city || a.buyer_address_state || a.buyer_address_zip ? `<div style="grid-column:span 2;">
              <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;">BUYER ADDRESS</div>
              <div style="margin-top:2px;">${escapeHtml(formatFullAddress(a.buyer_address, a.buyer_address_city, a.buyer_address_state, a.buyer_address_zip))}</div>
            </div>` : ''}
          </div>
        </div>
      `;
    }

    if (a.notes) {
      html += `
        <div style="margin-top:var(--space-5);padding-top:var(--space-4);border-top:1px solid var(--color-divider);">
          <div style="color:var(--color-text-faint);font-size:var(--text-xs);font-weight:500;margin-bottom:4px;">NOTES</div>
          <div style="font-size:var(--text-sm);color:var(--color-text-muted);">${escapeHtml(a.notes)}</div>
        </div>
      `;
    }

    document.getElementById('accDetailBody').innerHTML = html;

    let footerHtml = `
      <button class="btn btn-danger btn-sm" onclick="deleteAccessory(${a.id})">Delete</button>
      <div style="flex:1;"></div>
      <button class="btn btn-secondary" onclick="editCurrentDetailAccessory()">Edit</button>
    `;
    if (a.status === 'in_stock') {
      footerHtml += `<button class="btn btn-primary" onclick="closeAccDetailModal();openAccSellModal(${a.id})">Mark as Sold</button>`;
    }
    document.getElementById('accDetailFooter').innerHTML = footerHtml;
    document.getElementById('accDetailModal').classList.add('open');
  } catch(e) { console.error('showAccDetail error:', e); }
}

function editCurrentDetailAccessory() {
  if (!_currentDetailAccessory) return;
  closeAccDetailModal();
  openEditAccessoryModal(_currentDetailAccessory);
}

function closeAccDetailModal() {
  document.getElementById('accDetailModal').classList.remove('open');
}

let _pendingAccDeleteId = null;

function deleteAccessory(id) {
  _pendingAccDeleteId = id;
  document.getElementById('confirmModal').querySelector('.modal-title').textContent = 'Delete Accessory';
  document.getElementById('confirmModal').querySelector('.modal-body p').textContent =
    'Are you sure you want to delete this accessory? This action cannot be undone.';
  document.getElementById('confirmModal').classList.add('open');
}

let _pendingAccBulkDeleteIds = [];

function bulkDeleteAccessories() {
  const ids = getCheckedIds('accessories');
  if (ids.length === 0) return;
  _pendingAccBulkDeleteIds = ids;
  document.getElementById('confirmModal').querySelector('.modal-title').textContent = 'Delete Accessories';
  document.getElementById('confirmModal').querySelector('.modal-body p').textContent =
    `Are you sure you want to delete ${ids.length} accessor${ids.length > 1 ? 'ies' : 'y'}? This action cannot be undone.`;
  document.getElementById('confirmModal').classList.add('open');
}

async function updateAccessoriesCount() {
  try {
    const all = await apiFetch('/api/accessories');
    const inStock = all.filter(a => a.status === 'in_stock').length;
    document.getElementById('navAccessoriesCount').textContent = inStock;
  } catch(e) {}
}

// ========== EXPORT / IMPORT ==========
async function exportCSV() {
  try {
    const res = await fetch(`${API}/api/export/csv`);
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moda_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully.');
  } catch(e) {
    showToast('Export failed.', 'error');
  }
}

async function importCSV(input) {
  const file = input.files[0];
  if (!file) return;
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API}/api/import/csv`, { method: 'POST', body: formData });
    const data = await res.json();
    showToast(`Imported ${data.imported} watches.`);
    input.value = '';
    refreshCurrentView();
  } catch(e) {
    showToast('Import failed.', 'error');
  }
}

// ========== NAV COUNTS ==========
async function updateNavCounts() {
  try {
    const all = await apiFetch('/api/watches');
    const inStock = all.filter(w => w.status === 'in_stock').length;
    const sold = all.filter(w => w.status === 'sold').length;
    const pending = all.filter(w => w.status === 'in_stock' && (!w.wire_confirmation || w.wire_confirmation.trim() === '')).length;
    document.getElementById('navInStockCount').textContent = inStock;
    document.getElementById('navSoldCount').textContent = sold;
    document.getElementById('navPendingCount').textContent = pending;
  } catch(e) {}
}

// ========== REFRESH ==========
function refreshCurrentView() {
  const activeView = document.querySelector('.view.active');
  if (!activeView) return;
  const id = activeView.id.replace('view-', '');
  switchView(id);
}

// ========== CONTACT DETAIL / EDIT ==========
let _currentContact = null;

async function showContactDetail(name) {
  document.getElementById('contactDetailTitle').textContent = name;
  document.getElementById('contactDetailBody').innerHTML = '<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted);">Loading...</div>';
  document.getElementById('contactDetailModal').classList.add('open');
  
  try {
    const data = await apiFetch(`/api/contact-detail?name=${encodeURIComponent(name)}`);
    _currentContact = data;
    
    const initials = data.name.split(' ').map(w => w[0]).join('').slice(0, 2);
    const body = document.getElementById('contactDetailBody');
    document.getElementById('contactDetailTitle').textContent = data.name;
    
    // Role badges
    const roleTags = (data.roles || []).map(r =>
      r === 'seller'
        ? '<span class="contact-role-badge contact-role-seller" style="font-size:11px;">Seller</span>'
        : '<span class="contact-role-badge contact-role-buyer" style="font-size:11px;">Buyer</span>'
    ).join(' ');
    
    // Contact info row
    const metaItems = [];
    if (data.email) metaItems.push(`<div class="contact-detail"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> ${escapeHtml(data.email)}</div>`);
    if (data.phone) metaItems.push(`<div class="contact-detail"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> ${escapeHtml(data.phone)}</div>`);
    if (data.address || data.address_city || data.address_state || data.address_zip) metaItems.push(`<div class="contact-detail"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${escapeHtml(formatFullAddress(data.address, data.address_city, data.address_state, data.address_zip))}</div>`);
    
    // KPIs
    const kpis = [
      { label: 'Total Deals', value: data.total_deals },
      { label: 'Total Volume', value: formatCurrency(data.total_volume || 0) },
    ];
    if (data.sell_deals?.length > 0) {
      kpis.push({ label: 'Sold to You', value: `${data.sell_deals.length} · ${formatCurrency(data.sell_volume || 0)}` });
    }
    if (data.buy_deals?.length > 0) {
      kpis.push({ label: 'Bought from You', value: `${data.buy_deals.length} · ${formatCurrency(data.buy_volume || 0)}` });
    }
    if (data.buy_profit) {
      kpis.push({ label: 'Profit (Buyer)', value: formatCurrency(data.buy_profit) });
    }
    if (data.first_deal) kpis.push({ label: 'First Deal', value: data.first_deal });
    if (data.last_deal) kpis.push({ label: 'Last Deal', value: data.last_deal });
    
    // Sell deals table (items they sold TO Moda)
    let sellHtml = '';
    if (data.sell_deals && data.sell_deals.length > 0) {
      sellHtml = `
        <div class="contact-deals-section">
          <div class="contact-deals-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
            Sold to You
          </div>
          <div style="overflow-x:auto;">
            <table class="contact-deals-table">
              <thead><tr><th>Date</th><th>Item</th><th>Cost</th><th>Status</th></tr></thead>
              <tbody>
                ${data.sell_deals.map(d => {
                  const statusBadge = d.status === 'sold' 
                    ? '<span class="badge badge-sold">Sold</span>' 
                    : '<span class="badge badge-stock">In Stock</span>';
                  return `<tr>
                    <td>${d.date || '\u2014'}</td>
                    <td>${escapeHtml(d.brand || '')} ${escapeHtml(d.model || '')}</td>
                    <td>${formatCurrency(d.amount || 0)}</td>
                    <td>${statusBadge}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    }
    
    // Buy deals table (items they bought FROM Moda)
    let buyHtml = '';
    if (data.buy_deals && data.buy_deals.length > 0) {
      buyHtml = `
        <div class="contact-deals-section">
          <div class="contact-deals-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B8AF7" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><path d="M12 19V5M5 12l7 7 7-7"/></svg>
            Bought from You
          </div>
          <div style="overflow-x:auto;">
            <table class="contact-deals-table">
              <thead><tr><th>Date</th><th>Item</th><th>Sold For</th><th>Profit</th></tr></thead>
              <tbody>
                ${data.buy_deals.map(d => {
                  const profitClass = (d.profit !== undefined && d.profit !== null) ? (d.profit >= 0 ? 'profit-positive' : 'profit-negative') : '';
                  return `<tr>
                    <td>${d.date || '\u2014'}</td>
                    <td>${escapeHtml(d.brand || '')} ${escapeHtml(d.model || '')}</td>
                    <td>${formatCurrency(d.amount || 0)}</td>
                    <td class="${profitClass}" style="font-weight:600;">${formatCurrency(d.profit || 0)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    }
    
    const noDeals = (!data.sell_deals || data.sell_deals.length === 0) && (!data.buy_deals || data.buy_deals.length === 0);
    const dealsHtml = noDeals ? '<div class="contact-deals-empty">No deals recorded yet</div>' : (sellHtml + buyHtml);
    
    // Wire / banking info section
    const hasWire = data.bank_name || data.routing_number || data.account_number || data.swift_code;
    const wireHtml = hasWire ? `
      <div class="contact-wire-section">
        <div class="contact-deals-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2" style="vertical-align:-2px;margin-right:4px;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          Wire Information
        </div>
        <div class="contact-wire-grid">
          ${data.bank_name ? `<div class="contact-wire-item"><div class="contact-wire-label">Bank Name</div><div class="contact-wire-value">${escapeHtml(data.bank_name)}</div></div>` : ''}
          ${data.routing_number ? `<div class="contact-wire-item"><div class="contact-wire-label">Routing #</div><div class="contact-wire-value">${escapeHtml(data.routing_number)}</div></div>` : ''}
          ${data.account_number ? `<div class="contact-wire-item"><div class="contact-wire-label">Account #</div><div class="contact-wire-value">${escapeHtml(data.account_number)}</div></div>` : ''}
          ${data.swift_code ? `<div class="contact-wire-item"><div class="contact-wire-label">SWIFT Code</div><div class="contact-wire-value">${escapeHtml(data.swift_code)}</div></div>` : ''}
        </div>
      </div>` : '';
    
    body.innerHTML = `
      <div class="contact-profile-header">
        <div class="contact-avatar">${escapeHtml(initials)}</div>
        <div class="contact-profile-info">
          <div class="contact-profile-name">${escapeHtml(data.name)} ${roleTags}</div>
        </div>
      </div>
      ${metaItems.length > 0 ? `<div class="contact-profile-meta">${metaItems.join('')}</div>` : ''}
      <div class="contact-kpi-row">
        ${kpis.map(k => `
          <div class="contact-kpi">
            <div class="contact-kpi-value">${k.value}</div>
            <div class="contact-kpi-label">${k.label}</div>
          </div>
        `).join('')}
      </div>
      ${wireHtml}
      ${dealsHtml}
    `;
    
  } catch(e) {
    console.error('Error loading contact detail:', e);
    document.getElementById('contactDetailBody').innerHTML = `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted);">Could not load contact details. Please try again.</div>`;
    showToast('Failed to load contact details', 'error');
  }
}

function closeContactDetailModal() {
  document.getElementById('contactDetailModal').classList.remove('open');
  _currentContact = null;
}

function openEditContact() {
  if (!_currentContact) return;
  const c = _currentContact;
  document.getElementById('editContactName').value = c.name || '';
  document.getElementById('editContactEmail').value = c.email || '';
  document.getElementById('editContactPhone').value = c.phone || '';
  document.getElementById('editContactAddress').value = c.address || '';
  document.getElementById('editContactAddressCity').value = c.address_city || '';
  document.getElementById('editContactAddressState').value = c.address_state || '';
  document.getElementById('editContactAddressZip').value = c.address_zip || '';
  document.getElementById('editContactBankName').value = c.bank_name || '';
  document.getElementById('editContactRoutingNumber').value = c.routing_number || '';
  document.getElementById('editContactAccountNumber').value = c.account_number || '';
  document.getElementById('editContactSwiftCode').value = c.swift_code || '';
  document.getElementById('contactEditModal').classList.add('open');
}

function closeContactEditModal() {
  document.getElementById('contactEditModal').classList.remove('open');
}

async function saveContactInfo() {
  if (!_currentContact) return;
  const originalName = _currentContact.name;
  const newName = document.getElementById('editContactName').value.trim();
  const email = document.getElementById('editContactEmail').value.trim();
  const phone = document.getElementById('editContactPhone').value.trim();
  const address = document.getElementById('editContactAddress').value.trim();
  const address_city = document.getElementById('editContactAddressCity').value.trim();
  const address_state = document.getElementById('editContactAddressState').value.trim();
  const address_zip = document.getElementById('editContactAddressZip').value.trim();
  const bank_name = document.getElementById('editContactBankName').value.trim();
  const routing_number = document.getElementById('editContactRoutingNumber').value.trim();
  const account_number = document.getElementById('editContactAccountNumber').value.trim();
  const swift_code = document.getElementById('editContactSwiftCode').value.trim();
  
  if (!newName) {
    showToast('Name is required', 'error');
    return;
  }
  
  try {
    await apiFetch('/api/contact-update?type=all', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: originalName, new_name: newName, email, phone, address, address_city, address_state, address_zip, bank_name, routing_number, account_number, swift_code })
    });
    showToast('Contact updated', 'success');
    closeContactEditModal();
    closeContactDetailModal();
    loadContacts();
  } catch(e) {
    console.error('Error saving contact:', e);
    showToast('Failed to save contact', 'error');
  }
}

// Contact delete
let _pendingContactDelete = null;
function deleteContact() {
  if (!_currentContact) return;
  const contactName = _currentContact.name;
  _pendingContactDelete = { name: contactName };
  closeContactDetailModal();
  document.getElementById('confirmModal').querySelector('.modal-title').textContent = 'Delete Contact';
  document.getElementById('confirmModal').querySelector('.modal-body p').textContent =
    `Are you sure you want to delete ${contactName}? Their info will be cleared from all associated records. This cannot be undone.`;
  document.getElementById('confirmModal').classList.add('open');
}

// ========== DEALS ==========
let allDeals = [];
let dealsFilter = 'active';

const DEAL_STATUS_ORDER = ['deal_confirmed', 'label_sent', 'in_transit', 'delivered', 'inspection_complete', 'wire_sent'];
const DEAL_STATUS_LABELS = {
  deal_confirmed: 'Deal Confirmed',
  label_sent: 'Label Sent',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  inspection_complete: 'Inspected',
  wire_sent: 'Wire Sent'
};

function getDealBadgeClass(status) {
  const map = {
    deal_confirmed: 'badge-deal badge-deal-confirmed',
    label_sent: 'badge-deal badge-deal-label_sent',
    in_transit: 'badge-deal badge-deal-in_transit',
    delivered: 'badge-deal badge-deal-delivered',
    inspection_complete: 'badge-deal badge-deal-inspection',
    wire_sent: 'badge-deal badge-deal-wire_sent'
  };
  return map[status] || 'badge-deal';
}

async function loadDeals() {
  try {
    allDeals = await apiFetch('/api/deals');
    renderDealsTable();
    updateDealsCount();
  } catch(e) { /* handled */ }
}

function renderDealsTable() {
  const body = document.getElementById('dealsBody');
  const empty = document.getElementById('dealsEmpty');
  const search = (document.getElementById('dealsSearch').value || '').toLowerCase();

  let filtered = allDeals;
  if (dealsFilter === 'active') {
    filtered = filtered.filter(d => !d.approved);
  } else if (dealsFilter === 'approved') {
    filtered = filtered.filter(d => d.approved);
  }

  if (search) {
    filtered = filtered.filter(d =>
      (d.reference_code || '').toLowerCase().includes(search) ||
      (d.seller_name || '').toLowerCase().includes(search) ||
      (d.watch_brand || '').toLowerCase().includes(search) ||
      (d.watch_reference || '').toLowerCase().includes(search) ||
      (d.package_id || '').toLowerCase().includes(search)
    );
  }

  if (filtered.length === 0) {
    body.innerHTML = '';
    empty.style.display = '';
    document.getElementById('dealsTable').style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  document.getElementById('dealsTable').style.display = '';

  // Group by package_id for visual grouping
  const rows = [];
  const seenPackages = new Set();
  filtered.forEach(d => {
    const watch = [d.watch_brand, d.watch_reference].filter(Boolean).join(' ') || '—';
    const date = d.created_at ? new Date(d.created_at).toLocaleDateString() : '—';
    const statusBadge = d.approved
      ? `<span class="badge-deal badge-approved">Approved</span>`
      : `<span class="${getDealBadgeClass(d.status)}">${DEAL_STATUS_LABELS[d.status] || d.status}</span>`;
    const pkgId = d.package_id || '';
    const isPackage = pkgId.startsWith('PKG-');

    // For package deals, show a group header row on the first item
    if (isPackage && !seenPackages.has(pkgId)) {
      seenPackages.add(pkgId);
      const siblings = filtered.filter(x => x.package_id === pkgId);
      const totalPrice = siblings.reduce((sum, x) => sum + (x.agreed_price || 0), 0);
      rows.push(`<tr class="package-header-row" onclick="event.stopPropagation()">
        <td colspan="7">
          <div class="package-header">
            <span class="package-badge">📦 PACKAGE</span>
            <strong class="package-id">${escapeHtml(pkgId)}</strong>
            <span class="package-meta">${siblings.length} watches · ${formatCurrency(totalPrice)} total · ${d.seller_name || 'Unknown'}</span>
            <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation();copyPackageTrackingLink('${escapeHtml(pkgId)}')" title="Copy Package Tracking Link" style="margin-left:auto;">Copy Package Link</button>
          </div>
        </td>
      </tr>`);
    }

    const packageCell = isPackage
      ? `<span class="package-ref-badge">${escapeHtml(pkgId)}</span>`
      : '<span class="single-deal-label">Single</span>';

    rows.push(`<tr style="cursor:pointer;" class="${isPackage ? 'package-child-row' : ''}" onclick="openDealDetail(${d.id})">
      <td><strong style="color:var(--color-primary);">${d.reference_code}</strong></td>
      <td>${d.seller_name || '—'}</td>
      <td>${watch}</td>
      <td>${formatCurrency(d.agreed_price)}</td>
      <td>${statusBadge}</td>
      <td>${date}</td>
      <td style="text-align:right;">
        ${!d.approved ? `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openDealStatusModal(${d.id},'${d.status}')" title="Update Status">Status</button>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openDealApproveModal(${d.id},${d.agreed_price})" title="Approve to Inventory">Approve</button>` : ''}
      </td>
    </tr>`);
  });
  body.innerHTML = rows.join('');
}

function filterDeals(filter) {
  dealsFilter = filter;
  document.querySelectorAll('.deals-filter').forEach(b => b.classList.remove('active'));
  document.querySelector(`.deals-filter[data-filter="${filter}"]`).classList.add('active');
  renderDealsTable();
}

async function updateDealsCount() {
  try {
    const deals = allDeals.length ? allDeals : await apiFetch('/api/deals');
    const activeCount = deals.filter(d => !d.approved).length;
    const badge = document.getElementById('navDealsCount');
    badge.textContent = activeCount;
    badge.style.display = activeCount > 0 ? '' : 'none';
  } catch(e) { /* ignore */ }
}

// Dashboard deals alert
function renderDealsAlert(data) {
  const section = document.getElementById('dealsAlertSection');
  const list = document.getElementById('dealsAlertList');
  const title = document.getElementById('dealsAlertTitle');
  const deals = data.new_deals || [];

  if (deals.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  title.textContent = `New Seller Deals (${data.active_deals_count})`;
  list.innerHTML = deals.map(d => {
    const watch = [d.watch_brand, d.watch_reference].filter(Boolean).join(' ') || '—';
    const pkgLabel = (d.package_id && d.package_id.startsWith('PKG-'))
      ? `<span class="package-badge" style="font-size:9px;padding:2px 6px;margin-right:4px;">📦</span>`
      : '';
    return `<div class="deals-alert-item" style="cursor:pointer;" onclick="switchView('deals')">
      <span class="deals-alert-item-info">${pkgLabel}<strong>${d.reference_code}</strong> · ${d.seller_name || 'Unknown'} · ${watch}</span>
      <span class="deals-alert-item-price">${formatCurrency(d.agreed_price)}</span>
    </div>`;
  }).join('');
}

// Deal detail modal
async function openDealDetail(dealId) {
  try {
    const d = await apiFetch(`/api/deals/${dealId}`);
    const modal = document.getElementById('dealDetailModal');
    const pkgSuffix = (d.package_id && d.package_id.startsWith('PKG-')) ? ` · ${d.package_id}` : '';
    document.getElementById('dealDetailTitle').textContent = `Deal ${d.reference_code}${pkgSuffix}`;

    // Build status timeline
    const currentIdx = DEAL_STATUS_ORDER.indexOf(d.status);
    const historyMap = {};
    (d.status_history || []).forEach(h => { historyMap[h.status] = h.timestamp; });

    const timeline = DEAL_STATUS_ORDER.map((s, i) => {
      const isCompleted = i < currentIdx || (i === currentIdx && s === d.status);
      const isCurrent = i === currentIdx;
      const ts = historyMap[s] ? new Date(historyMap[s]).toLocaleString() : '';
      const dotClass = isCompleted ? 'completed' : (isCurrent ? 'current' : '');
      const labelClass = isCompleted ? 'completed' : (isCurrent ? 'current' : '');
      return `<div class="deal-timeline-step">
        <div class="deal-timeline-dot ${dotClass}">${isCompleted ? '✓' : (i + 1)}</div>
        <span class="deal-timeline-step-label ${labelClass}">${DEAL_STATUS_LABELS[s]}</span>
        ${ts ? `<span class="deal-timeline-step-time">${ts}</span>` : ''}
      </div>`;
    }).join('');

    const body = document.getElementById('dealDetailBody');
    const address = [d.seller_address, d.seller_address_city, d.seller_address_state, d.seller_address_zip].filter(Boolean).join(', ');
    body.innerHTML = `
      <div class="deal-detail-section">
        <div class="deal-detail-section-title">Status Timeline</div>
        <div class="deal-timeline">${timeline}</div>
      </div>
      <div class="deal-detail-section">
        <div class="deal-detail-section-title">Watch Information</div>
        <div class="deal-detail-grid">
          <div><div class="deal-detail-label">Brand</div><div class="deal-detail-value">${d.watch_brand || '—'}</div></div>
          <div><div class="deal-detail-label">Reference / Model</div><div class="deal-detail-value">${d.watch_reference || '—'}</div></div>
          <div><div class="deal-detail-label">Serial Number</div><div class="deal-detail-value">${d.watch_serial || '—'}</div></div>
          <div><div class="deal-detail-label">Year</div><div class="deal-detail-value">${d.watch_year || '—'}</div></div>
          <div><div class="deal-detail-label">Includes</div><div class="deal-detail-value">${d.watch_includes || '—'}</div></div>
          <div><div class="deal-detail-label">Agreed Price</div><div class="deal-detail-value">${formatCurrency(d.agreed_price)}</div></div>
        </div>
      </div>
      <div class="deal-detail-section">
        <div class="deal-detail-section-title">Seller Information</div>
        <div class="deal-detail-grid">
          <div><div class="deal-detail-label">Name</div><div class="deal-detail-value">${d.seller_name || '—'}</div></div>
          <div><div class="deal-detail-label">Email</div><div class="deal-detail-value">${d.seller_email || '—'}</div></div>
          <div><div class="deal-detail-label">Phone</div><div class="deal-detail-value">${d.seller_phone || '—'}</div></div>
          <div><div class="deal-detail-label">Address</div><div class="deal-detail-value">${address || '—'}</div></div>
        </div>
      </div>
      <div class="deal-detail-section">
        <div class="deal-detail-section-title">Wire Instructions</div>
        <div class="deal-detail-grid">
          <div><div class="deal-detail-label">Bank Name</div><div class="deal-detail-value">${d.bank_name || '—'}</div></div>
          <div><div class="deal-detail-label">Routing Number</div><div class="deal-detail-value">${d.routing_number || '—'}</div></div>
          <div><div class="deal-detail-label">Account Number</div><div class="deal-detail-value">${d.account_number || '—'}</div></div>
          <div><div class="deal-detail-label">SWIFT Code</div><div class="deal-detail-value">${d.swift_code || '—'}</div></div>
          <div><div class="deal-detail-label">Zelle</div><div class="deal-detail-value">${d.zelle || '—'}</div></div>
        </div>
      </div>
      ${d.notes ? `<div class="deal-detail-section">
        <div class="deal-detail-section-title">Notes</div>
        <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin:0;">${d.notes}</p>
      </div>` : ''}
      ${(d.package_id && d.package_id.startsWith('PKG-')) ? renderPackageSiblings(d) : ''}
    `;

    const footer = document.getElementById('dealDetailFooter');
    footer.innerHTML = `
      <button class="btn btn-danger" onclick="closeDealDetailModal();deleteDeal(${d.id})" style="margin-right:auto;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-2px;margin-right:4px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Delete
      </button>
      <button class="btn btn-secondary" onclick="copyTrackingLink('${d.reference_code}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-2px;margin-right:4px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        Copy Tracking Link
      </button>
      ${(d.package_id && d.package_id.startsWith('PKG-')) ? `<button class="btn btn-secondary" onclick="copyPackageTrackingLink('${d.package_id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-2px;margin-right:4px;"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5a2 2 0 0 1-2 2h-5"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        Copy Package Link
      </button>` : ''}
      ${!d.approved ? `
        <button class="btn btn-secondary" onclick="closeDealDetailModal();openDealStatusModal(${d.id},'${d.status}')">Update Status</button>
        <button class="btn btn-primary" onclick="closeDealDetailModal();openDealApproveModal(${d.id},${d.agreed_price})">Approve to Inventory</button>
      ` : '<span class="badge-deal badge-approved" style="padding:6px 14px;font-size:13px;">Approved to Inventory</span>'}`;

    modal.classList.add('open');
  } catch(e) {
    console.error('Error loading deal:', e);
  }
}
function renderPackageSiblings(currentDeal) {
  const pkgId = currentDeal.package_id;
  const siblings = allDeals.filter(d => d.package_id === pkgId && d.id !== currentDeal.id);
  if (siblings.length === 0) return '';
  const allInPkg = allDeals.filter(d => d.package_id === pkgId);
  const totalPrice = allInPkg.reduce((sum, d) => sum + (d.agreed_price || 0), 0);
  return `<div class="deal-detail-section">
    <div class="deal-detail-section-title">Package: ${escapeHtml(pkgId)} (${allInPkg.length} watches &middot; ${formatCurrency(totalPrice)} total)</div>
    <div class="deal-package-siblings">
      ${siblings.map(s => {
        const w = [s.watch_brand, s.watch_reference].filter(Boolean).join(' ') || 'Unknown';
        const statusLabel = s.approved ? 'Approved' : (DEAL_STATUS_LABELS[s.status] || s.status);
        return `<div class="deal-package-sibling" style="cursor:pointer;" onclick="closeDealDetailModal();setTimeout(()=>openDealDetail(${s.id}),200)">
          <span class="deal-sibling-watch">${escapeHtml(w)}</span>
          <span class="deal-sibling-price">${formatCurrency(s.agreed_price)}</span>
          <span class="deal-sibling-ref">${s.reference_code}</span>
          <span class="deal-sibling-status">${statusLabel}</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function closeDealDetailModal() {
  document.getElementById('dealDetailModal').classList.remove('open');
}

// Copy link helpers
function getDealPageBaseUrl() {
  // Build the deal.html URL relative to the current page
  const loc = window.location;
  const path = loc.pathname.substring(0, loc.pathname.lastIndexOf('/') + 1);
  return loc.origin + path + 'deal.html';
}

function copyIntakeFormLink() {
  const url = getDealPageBaseUrl();
  navigator.clipboard.writeText(url).then(() => {
    showToast('Intake form link copied to clipboard');
  }).catch(() => {
    // Fallback for sandboxed environments
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('Intake form link copied to clipboard'); }
    catch(e) { showToast('Could not copy — URL: ' + url, 'error'); }
    document.body.removeChild(ta);
  });
}

function copyTrackingLink(refCode) {
  const url = getDealPageBaseUrl() + '#track/' + refCode;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Tracking link copied for ' + refCode);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('Tracking link copied for ' + refCode); }
    catch(e) { showToast('Could not copy — URL: ' + url, 'error'); }
    document.body.removeChild(ta);
  });
}

// Copy package tracking link
function copyPackageTrackingLink(pkgId) {
  const url = getDealPageBaseUrl() + '#track/' + pkgId;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Package tracking link copied for ' + pkgId);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('Package tracking link copied for ' + pkgId); }
    catch(e) { showToast('Could not copy — URL: ' + url, 'error'); }
    document.body.removeChild(ta);
  });
}

// Deal delete
let _pendingDealDeleteId = null;
function deleteDeal(dealId) {
  _pendingDealDeleteId = dealId;
  document.getElementById('confirmModal').querySelector('.modal-title').textContent = 'Delete Deal';
  document.getElementById('confirmModal').querySelector('.modal-body p').textContent =
    'Are you sure you want to delete this deal? This action cannot be undone.';
  document.getElementById('confirmModal').classList.add('open');
}

// Deal status update modal
function openDealStatusModal(dealId, currentStatus) {
  document.getElementById('statusDealId').value = dealId;
  // Set select to the next status if possible
  const currentIdx = DEAL_STATUS_ORDER.indexOf(currentStatus);
  const nextStatus = currentIdx < DEAL_STATUS_ORDER.length - 1 ? DEAL_STATUS_ORDER[currentIdx + 1] : currentStatus;
  document.getElementById('statusDealSelect').value = nextStatus;
  document.getElementById('dealStatusModal').classList.add('open');
}
function closeDealStatusModal() {
  document.getElementById('dealStatusModal').classList.remove('open');
}
async function confirmDealStatusUpdate() {
  const dealId = document.getElementById('statusDealId').value;
  const status = document.getElementById('statusDealSelect').value;
  try {
    await apiFetch(`/api/deals/${dealId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    showToast(`Deal status updated to ${DEAL_STATUS_LABELS[status]}`, 'success');
    closeDealStatusModal();
    loadDeals();
    loadDashboard();
  } catch(e) {
    showToast('Failed to update deal status', 'error');
  }
}

// Deal approve modal
function openDealApproveModal(dealId, agreedPrice) {
  document.getElementById('approveDealId').value = dealId;
  document.getElementById('approvePrice').value = agreedPrice || '';
  document.getElementById('approveCondition').value = '';
  document.getElementById('approveBoxPapers').value = '';
  document.getElementById('approveWarrantyDate').value = '';
  document.getElementById('approveDialColor').value = '';
  document.getElementById('dealApproveModal').classList.add('open');
}
function closeDealApproveModal() {
  document.getElementById('dealApproveModal').classList.remove('open');
}
async function confirmApproveDeal() {
  const dealId = document.getElementById('approveDealId').value;
  const price = parseFloat(document.getElementById('approvePrice').value) || null;
  const condition = document.getElementById('approveCondition').value;
  const boxPapers = document.getElementById('approveBoxPapers').value;
  const warrantyDate = document.getElementById('approveWarrantyDate').value;
  const dialColor = document.getElementById('approveDialColor').value;
  try {
    const result = await apiFetch(`/api/deals/${dealId}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        purchase_price: price,
        condition: condition,
        box_papers: boxPapers,
        warranty_date: warrantyDate,
        dial_color: dialColor
      })
    });
    showToast(`Deal ${result.reference_code} approved. Watch added to inventory.`, 'success');
    closeDealApproveModal();
    loadDeals();
    loadDashboard();
    updateNavCounts();
  } catch(e) {
    showToast('Failed to approve deal', 'error');
  }
}

// ========== BULK ADD WATCHES ==========
let _bulkRowCounter = 0;

const _bulkBrandOptions = [
  'Rolex','Patek Philippe','Audemars Piguet','Richard Mille','Omega','Cartier',
  'IWC','Jaeger-LeCoultre','Vacheron Constantin','A. Lange & Söhne','Breguet',
  'Hublot','Tudor','Panerai','Breitling','TAG Heuer','Zenith','Grand Seiko','F.P. Journe'
];

function openBulkAddModal() {
  _bulkRowCounter = 0;
  document.getElementById('bulkSellerName').value = '';
  document.getElementById('bulkSellerEmail').value = '';
  document.getElementById('bulkSellerPhone').value = '';
  document.getElementById('bulkPurchaseDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('bulkSellerAddress').value = '';
  document.getElementById('bulkSellerCity').value = '';
  document.getElementById('bulkSellerState').value = '';
  document.getElementById('bulkSellerZip').value = '';
  document.getElementById('bulkWatchRows').innerHTML = '';
  addBulkWatchRow();
  document.getElementById('bulkAddModal').classList.add('open');
}

function closeBulkAddModal() {
  document.getElementById('bulkAddModal').classList.remove('open');
}

function addBulkWatchRow() {
  _bulkRowCounter++;
  const idx = _bulkRowCounter;
  const container = document.getElementById('bulkWatchRows');
  const row = document.createElement('div');
  row.className = 'bulk-watch-row';
  row.id = 'bulkRow_' + idx;
  row.innerHTML = `
    <div class="bulk-watch-row-header">
      <span class="bulk-watch-row-num">Watch #${idx}</span>
      <button type="button" class="bulk-watch-row-remove" onclick="removeBulkWatchRow('bulkRow_${idx}')">Remove</button>
    </div>
    <div class="bulk-watch-row-grid">
      <div class="form-group">
        <label class="form-label">Brand *</label>
        <select class="form-select" data-bulk="brand" onchange="onBulkBrandChange(this)">
          <option value="">Select Brand</option>
          ${_bulkBrandOptions.map(b => '<option>' + b + '</option>').join('')}
          <option value="__other__">Other…</option>
        </select>
      </div>
      <div class="form-group bulk-custom-brand-group" data-bulk-custom="brand">
        <label class="form-label">Custom Brand *</label>
        <input type="text" class="form-input" data-bulk="customBrand" placeholder="Enter brand">
      </div>
      <div class="form-group">
        <label class="form-label">Model *</label>
        <input type="text" class="form-input" data-bulk="model" placeholder="Submariner">
      </div>
      <div class="form-group">
        <label class="form-label">Reference #</label>
        <input type="text" class="form-input" data-bulk="reference_number" placeholder="126610LN">
      </div>
      <div class="form-group">
        <label class="form-label">Serial #</label>
        <input type="text" class="form-input" data-bulk="serial_number" placeholder="ABC12345">
      </div>
      <div class="form-group">
        <label class="form-label">Purchase Price</label>
        <input type="number" class="form-input" data-bulk="purchase_price" placeholder="0.00" step="0.01">
      </div>
      <div class="form-group">
        <label class="form-label">Condition</label>
        <select class="form-select" data-bulk="condition">
          <option value="">Select</option>
          <option>New/Unworn</option>
          <option>Excellent</option>
          <option>Very Good</option>
          <option>Good</option>
          <option>Fair</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Box & Papers</label>
        <select class="form-select" data-bulk="box_papers">
          <option value="">Select</option>
          <option>Complete Set</option>
          <option>Box Only</option>
          <option>Papers Only</option>
          <option>Watch Only</option>
        </select>
      </div>
    </div>
  `;
  container.appendChild(row);
  updateBulkWatchCount();
  // Scroll to the new row
  row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function onBulkBrandChange(sel) {
  const row = sel.closest('.bulk-watch-row');
  const customGroup = row.querySelector('[data-bulk-custom="brand"]');
  if (sel.value === '__other__') {
    customGroup.classList.add('show');
  } else {
    customGroup.classList.remove('show');
    const customInput = row.querySelector('[data-bulk="customBrand"]');
    if (customInput) customInput.value = '';
  }
}

function removeBulkWatchRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) row.remove();
  // Re-number remaining rows
  const rows = document.querySelectorAll('#bulkWatchRows .bulk-watch-row');
  rows.forEach((r, i) => {
    const numEl = r.querySelector('.bulk-watch-row-num');
    if (numEl) numEl.textContent = 'Watch #' + (i + 1);
  });
  updateBulkWatchCount();
}

function updateBulkWatchCount() {
  const count = document.querySelectorAll('#bulkWatchRows .bulk-watch-row').length;
  document.getElementById('bulkWatchCount').textContent = count + (count === 1 ? ' watch' : ' watches');
  document.getElementById('bulkSaveBtn').textContent = 'Add ' + count + (count === 1 ? ' Watch' : ' Watches');
}

async function saveBulkWatches() {
  const sellerName = document.getElementById('bulkSellerName').value.trim();
  const sellerEmail = document.getElementById('bulkSellerEmail').value.trim();
  const sellerPhone = document.getElementById('bulkSellerPhone').value.trim();
  const purchaseDate = document.getElementById('bulkPurchaseDate').value;
  const sellerAddress = document.getElementById('bulkSellerAddress').value.trim();
  const sellerCity = document.getElementById('bulkSellerCity').value.trim();
  const sellerState = document.getElementById('bulkSellerState').value.trim();
  const sellerZip = document.getElementById('bulkSellerZip').value.trim();

  const rows = document.querySelectorAll('#bulkWatchRows .bulk-watch-row');
  if (rows.length === 0) {
    showToast('Add at least one watch.', 'error');
    return;
  }

  // Build payloads
  const payloads = [];
  let hasError = false;
  rows.forEach((row, i) => {
    let brand = row.querySelector('[data-bulk="brand"]').value;
    if (brand === '__other__') {
      brand = (row.querySelector('[data-bulk="customBrand"]').value || '').trim();
    }
    const model = (row.querySelector('[data-bulk="model"]').value || '').trim();
    if (!brand || !model) {
      showToast('Watch #' + (i+1) + ': Brand and Model are required.', 'error');
      hasError = true;
      return;
    }
    payloads.push({
      brand,
      model,
      reference_number: (row.querySelector('[data-bulk="reference_number"]').value || '').trim(),
      serial_number: (row.querySelector('[data-bulk="serial_number"]').value || '').trim(),
      purchase_price: parseFloat(row.querySelector('[data-bulk="purchase_price"]').value) || 0,
      condition: row.querySelector('[data-bulk="condition"]').value,
      box_papers: row.querySelector('[data-bulk="box_papers"]').value,
      purchase_date: purchaseDate,
      seller_name: sellerName,
      seller_email: sellerEmail,
      seller_phone: sellerPhone,
      seller_address: sellerAddress,
      seller_address_city: sellerCity,
      seller_address_state: sellerState,
      seller_address_zip: sellerZip,
      dial_color: '',
      material: '',
      movement_type: '',
      seller_notes: '',
      seller_bank_name: '',
      seller_routing_number: '',
      seller_account_number: '',
      seller_swift_code: '',
      notes: '',
      warranty_date: '',
      wire_confirmation: ''
    });
  });

  if (hasError) return;

  // Disable button while saving
  const btn = document.getElementById('bulkSaveBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  let successCount = 0;
  let failCount = 0;
  for (const data of payloads) {
    try {
      await apiFetch('/api/watches', { method: 'POST', body: JSON.stringify(data) });
      successCount++;
    } catch(e) {
      failCount++;
    }
  }

  btn.disabled = false;
  updateBulkWatchCount();

  if (failCount === 0) {
    showToast(successCount + (successCount === 1 ? ' watch' : ' watches') + ' added successfully.');
    closeBulkAddModal();
    refreshCurrentView();
    loadAutocompleteCache();
  } else {
    showToast(successCount + ' added, ' + failCount + ' failed.', 'error');
  }
}

// Bulk seller name autocomplete
(function() {
  const input = document.getElementById('bulkSellerName');
  if (!input) return;
  let bulkAutoLocked = false;
  input.addEventListener('input', function(e) {
    if (bulkAutoLocked) { bulkAutoLocked = false; return; }
    showAutocomplete(e.target, 'bulkSellerNameDropdown', _sellersCache,
      'seller_name', 'seller_email', 'seller_address_city', 'seller_address_state',
      function(s) {
        bulkAutoLocked = true;
        document.getElementById('bulkSellerName').value = s.seller_name || '';
        document.getElementById('bulkSellerEmail').value = s.seller_email || '';
        document.getElementById('bulkSellerPhone').value = s.seller_phone || '';
        document.getElementById('bulkSellerAddress').value = s.seller_address || '';
        document.getElementById('bulkSellerCity').value = s.seller_address_city || '';
        document.getElementById('bulkSellerState').value = s.seller_address_state || '';
        document.getElementById('bulkSellerZip').value = s.seller_address_zip || '';
        showToast('Seller info loaded for ' + s.seller_name);
      }
    );
  });
  input.addEventListener('blur', function() {
    setTimeout(() => {
      document.getElementById('bulkSellerNameDropdown').classList.remove('show');
    }, 200);
  });
})();

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  updateNavCounts();
  updateCrmCount();
  updateAccessoriesCount();
  updateDealsCount();
});
