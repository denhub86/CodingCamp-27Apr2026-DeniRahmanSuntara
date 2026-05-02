/**
 * Expense & Budget Visualizer
 * js/app.js — Vanilla JavaScript, no frameworks
 *
 * Architecture: MVC-lite
 *   StorageModule  → localStorage CRUD
 *   Pure functions → calculateBalance, calculateCategoryTotals, formatCurrency, validateForm
 *   UIRenderer     → DOM updates
 *   ChartManager   → Chart.js wrapper
 *   StateManager   → in-memory state + coordination
 *   FormHandler    → event listeners
 */

(function () {
  'use strict';

  /* ============================================================
     CONSTANTS
     ============================================================ */
  const STORAGE_KEY = 'expenses';
  const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

  /* ============================================================
     1. STORAGE MODULE
     ============================================================ */
  const StorageModule = (function () {
    let _available = false;

    // Detect localStorage availability once
    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      _available = true;
    } catch (e) {
      _available = false;
    }

    function isAvailable() {
      return _available;
    }

    /**
     * Load transactions from localStorage.
     * @returns {Transaction[]}
     */
    function load() {
      if (!_available) return [];
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('[StorageModule] JSON parse error, resetting storage.', e);
        try { window.localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        return [];
      }
    }

    /**
     * Save transactions to localStorage.
     * @param {Transaction[]} transactions
     * @returns {boolean} true if saved successfully
     */
    function save(transactions) {
      if (!_available) return false;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        return true;
      } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
          return false; // caller handles UI notification
        }
        console.error('[StorageModule] Save error:', e);
        return false;
      }
    }

    return { isAvailable, load, save };
  })();

  /* ============================================================
     2. PURE CALCULATION FUNCTIONS
     ============================================================ */

  /**
   * Sum all transaction amounts.
   * @param {Transaction[]} transactions
   * @returns {number}
   */
  function calculateBalance(transactions) {
    return transactions.reduce(function (sum, t) {
      return sum + t.amount;
    }, 0);
  }

  /**
   * Sum amounts grouped by category.
   * @param {Transaction[]} transactions
   * @returns {{ Food: number, Transport: number, Fun: number }}
   */
  function calculateCategoryTotals(transactions) {
    var totals = { Food: 0, Transport: 0, Fun: 0 };
    transactions.forEach(function (t) {
      if (totals.hasOwnProperty(t.category)) {
        totals[t.category] += t.amount;
      }
    });
    return totals;
  }

  /**
   * Format a number as Indonesian Rupiah string.
   * @param {number} amount
   * @returns {string}  e.g. "Rp 25.000"
   */
  function formatCurrency(amount) {
    return 'Rp ' + amount.toLocaleString('id-ID');
  }

  /**
   * Generate a unique ID.
   * @returns {string}
   */
  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  /**
   * Validate form input data.
   * @param {{ name: string, amount: string, category: string }} data
   * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
   */
  function validateForm(data) {
    var errors = {};

    if (!data.name || data.name.trim() === '') {
      errors.name = 'Nama item tidak boleh kosong.';
    }

    var amountNum = parseFloat(data.amount);
    if (data.amount === '' || data.amount === null || data.amount === undefined) {
      errors.amount = 'Jumlah harus berupa angka lebih dari 0.';
    } else if (isNaN(amountNum) || !isFinite(amountNum) || amountNum <= 0) {
      errors.amount = 'Jumlah harus berupa angka lebih dari 0.';
    }

    if (!data.category || VALID_CATEGORIES.indexOf(data.category) === -1) {
      errors.category = 'Pilih kategori pengeluaran.';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: errors
    };
  }

  /* ============================================================
     3. UI RENDERER
     ============================================================ */
  const UIRenderer = (function () {

    var _balanceEl      = null;
    var _listEl         = null;
    var _formEl         = null;
    var _storageWarnEl  = null;
    var _storageFullEl  = null;
    var _chartFallbackEl = null;

    function init() {
      _balanceEl       = document.getElementById('balance-display');
      _listEl          = document.getElementById('transaction-list');
      _formEl          = document.getElementById('expense-form');
      _storageWarnEl   = document.getElementById('storage-warning');
      _storageFullEl   = document.getElementById('storage-full-notice');
      _chartFallbackEl = document.getElementById('chart-fallback');
    }

    /**
     * Update the balance display.
     * @param {number} amount
     */
    function renderBalance(amount) {
      if (_balanceEl) {
        _balanceEl.textContent = formatCurrency(amount);
      }
    }

    /**
     * Rebuild the transaction list in the DOM.
     * @param {Transaction[]} items
     */
    function renderTransactionList(items) {
      if (!_listEl) return;

      if (items.length === 0) {
      _listEl.innerHTML = '<li class="list-empty"><i data-lucide="inbox" class="icon icon--lg"></i><span>Belum ada transaksi. Tambahkan transaksi pertama Anda.</span></li>';
      if (typeof lucide !== 'undefined') { lucide.createIcons(); }
        return;
      }

      // Sort newest first
      var sorted = items.slice().sort(function (a, b) {
        return b.timestamp - a.timestamp;
      });

      _listEl.innerHTML = sorted.map(function (t) {
        var catClass = 'category-badge--' + t.category.toLowerCase();
        return (
          '<li class="transaction-item" data-category="' + escapeHtml(t.category) + '">' +
            '<div class="transaction-info">' +
              '<span class="transaction-name">' + escapeHtml(t.name) + '</span>' +
              '<span class="transaction-amount">' + formatCurrency(t.amount) + '</span>' +
            '</div>' +
            '<span class="category-badge ' + catClass + '">' + escapeHtml(t.category) + '</span>' +
            '<button class="btn-delete" data-id="' + escapeHtml(t.id) + '" aria-label="Hapus transaksi ' + escapeHtml(t.name) + '">' +
              '<i data-lucide="trash-2" class="icon icon--sm"></i>' +
            '</button>' +
          '</li>'
        );
      }).join('');

      // Re-render Lucide icons injected into the list
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }

    /**
     * Reset all form fields to default values.
     */
    function clearForm() {
      if (_formEl) {
        _formEl.reset();
      }
    }

    /**
     * Show an error message below a specific field.
     * @param {string} field  - 'name' | 'amount' | 'category'
     * @param {string} message
     */
    function showError(field, message) {
      var el = document.getElementById('error-' + field);
      var inputEl = document.getElementById('item-' + field);
      if (el) el.textContent = message;
      if (inputEl) inputEl.classList.add('is-error');
    }

    /**
     * Clear all error messages and error states.
     */
    function clearErrors() {
      ['name', 'amount', 'category'].forEach(function (field) {
        var el = document.getElementById('error-' + field);
        var inputEl = document.getElementById('item-' + field);
        if (el) el.textContent = '';
        if (inputEl) inputEl.classList.remove('is-error');
      });
    }

    /**
     * Show or hide the localStorage unavailable banner.
     * @param {boolean} show
     */
    function showStorageWarning(show) {
      if (_storageWarnEl) {
        _storageWarnEl.hidden = !show;
      }
    }

    /**
     * Show or hide the storage-full notification.
     * @param {boolean} show
     */
    function showStorageFullNotice(show) {
      if (_storageFullEl) {
        _storageFullEl.hidden = !show;
        if (show) {
          // Auto-hide after 4 seconds
          setTimeout(function () {
            if (_storageFullEl) _storageFullEl.hidden = true;
          }, 4000);
        }
      }
    }

    /**
     * Show the chart fallback message (when Chart.js fails to load).
     */
    function showChartFallback() {
      var canvasEl = document.getElementById('expense-chart');
      if (canvasEl) canvasEl.hidden = true;
      if (_chartFallbackEl) _chartFallbackEl.hidden = false;
    }

    /**
     * Escape HTML special characters to prevent XSS.
     * @param {string} str
     * @returns {string}
     */
    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    /**
     * Render custom HTML legend for the chart.
     * @param {{ Food: number, Transport: number, Fun: number }} totals
     */
    function renderChartLegend(totals) {
      var legendEl = document.getElementById('chart-legend');
      if (!legendEl) return;

      var COLORS = {
        Food:      '#16a34a',
        Transport: '#2563eb',
        Fun:       '#7c3aed'
      };

      var total = totals.Food + totals.Transport + totals.Fun;

      legendEl.innerHTML = ['Food', 'Transport', 'Fun'].map(function (cat) {
        var pct = total > 0 ? Math.round((totals[cat] / total) * 100) : 0;
        return (
          '<div class="chart-legend__item">' +
            '<span class="chart-legend__swatch" style="background:' + COLORS[cat] + '"></span>' +
            '<span class="chart-legend__label">' + cat + '</span>' +
            '<span class="chart-legend__value">' + formatCurrency(totals[cat]) + '</span>' +
            '<span class="chart-legend__pct">' + pct + '%</span>' +
          '</div>'
        );
      }).join('');
    }

    return {
      init,
      renderBalance,
      renderTransactionList,
      renderChartLegend,
      clearForm,
      showError,
      clearErrors,
      showStorageWarning,
      showStorageFullNotice,
      showChartFallback
    };
  })();

  /* ============================================================
     4. CHART MANAGER
     ============================================================ */
  const ChartManager = (function () {
    var _chart = null;

    var CATEGORY_COLORS = {
      Food:      '#16a34a',
      Transport: '#2563eb',
      Fun:       '#9333ea'
    };

    var CATEGORY_BG_COLORS = {
      Food:      'rgba(22, 163, 74, 0.85)',
      Transport: 'rgba(37, 99, 235, 0.85)',
      Fun:       'rgba(147, 51, 234, 0.85)'
    };

    /**
     * Initialize the Chart.js doughnut chart.
     * @param {string} canvasId
     */
    function init(canvasId) {
      if (typeof Chart === 'undefined') {
        UIRenderer.showChartFallback();
        return;
      }

      var canvas = document.getElementById(canvasId);
      if (!canvas) return;

      _chart = new Chart(canvas, {
        type: 'pie',
        data: {
          labels: ['Food', 'Transport', 'Fun'],
          datasets: [{
            data: [0, 0, 0],
            backgroundColor: [
              CATEGORY_BG_COLORS.Food,
              CATEGORY_BG_COLORS.Transport,
              CATEGORY_BG_COLORS.Fun
            ],
            borderColor: [
              '#ffffff',
              '#ffffff',
              '#ffffff'
            ],
            borderWidth: 3,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false  /* custom HTML legend rendered below */
            },
            tooltip: {
              backgroundColor: '#0f172a',
              titleColor: '#f8fafc',
              bodyColor: '#cbd5e1',
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: function (context) {
                  var value = context.parsed;
                  return '  ' + context.label + ': ' + formatCurrency(value);
                }
              }
            }
          }
        }
      });
    }

    /**
     * Update chart data.
     * @param {{ Food: number, Transport: number, Fun: number }} categoryTotals
     */
    function update(categoryTotals) {
      if (!_chart) return;
      _chart.data.datasets[0].data = [
        categoryTotals.Food,
        categoryTotals.Transport,
        categoryTotals.Fun
      ];
      _chart.update();
    }

    return { init, update };
  })();

  /* ============================================================
     5. STATE MANAGER
     ============================================================ */
  const StateManager = (function () {
    var _transactions = [];

    /**
     * Initialize: load from storage, render initial UI.
     */
    function init() {
      _transactions = StorageModule.load();
      _renderAll();
    }

    /**
     * Add a new transaction.
     * @param {{ name: string, amount: number, category: string }} data
     * @returns {boolean} true if saved to storage successfully
     */
    function addTransaction(data) {
      var transaction = {
        id:        generateId(),
        name:      data.name.trim(),
        amount:    parseFloat(data.amount),
        category:  data.category,
        timestamp: Date.now()
      };

      _transactions.push(transaction);

      var saved = StorageModule.save(_transactions);
      if (!saved && StorageModule.isAvailable()) {
        // Storage full — rollback
        _transactions.pop();
        UIRenderer.showStorageFullNotice(true);
        return false;
      }

      _renderAll();
      return true;
    }

    /**
     * Delete a transaction by ID.
     * @param {string} id
     */
    function deleteTransaction(id) {
      _transactions = _transactions.filter(function (t) {
        return t.id !== id;
      });
      StorageModule.save(_transactions);
      _renderAll();
    }

    function getTransactions() {
      return _transactions.slice();
    }

    function getTotalBalance() {
      return calculateBalance(_transactions);
    }

    function getCategoryTotals() {
      return calculateCategoryTotals(_transactions);
    }

    /** Re-render balance, list, and chart from current state. */
    function _renderAll() {
      UIRenderer.renderBalance(getTotalBalance());
      UIRenderer.renderTransactionList(_transactions);
      ChartManager.update(getCategoryTotals());
      UIRenderer.renderChartLegend(getCategoryTotals());
    }

    return {
      init,
      addTransaction,
      deleteTransaction,
      getTransactions,
      getTotalBalance,
      getCategoryTotals
    };
  })();

  /* ============================================================
     6. FORM HANDLER
     ============================================================ */
  const FormHandler = (function () {

    function init() {
      var form = document.getElementById('expense-form');
      var list = document.getElementById('transaction-list');

      if (form) {
        form.addEventListener('submit', _handleSubmit);

        // Clear individual field error on input/change
        ['item-name', 'item-amount', 'item-category'].forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          var eventType = el.tagName === 'SELECT' ? 'change' : 'input';
          el.addEventListener(eventType, function () {
            var field = id.replace('item-', '');
            var errEl = document.getElementById('error-' + field);
            if (errEl) errEl.textContent = '';
            el.classList.remove('is-error');
          });
        });
      }

      // Event delegation for delete buttons
      if (list) {
        list.addEventListener('click', function (e) {
          var btn = e.target.closest('.btn-delete');
          if (!btn) return;
          var id = btn.getAttribute('data-id');
          if (id) StateManager.deleteTransaction(id);
        });
      }
    }

    function _handleSubmit(e) {
      e.preventDefault();

      UIRenderer.clearErrors();

      var nameEl     = document.getElementById('item-name');
      var amountEl   = document.getElementById('item-amount');
      var categoryEl = document.getElementById('item-category');

      var data = {
        name:     nameEl     ? nameEl.value     : '',
        amount:   amountEl   ? amountEl.value   : '',
        category: categoryEl ? categoryEl.value : ''
      };

      var result = validateForm(data);

      if (!result.valid) {
        Object.keys(result.errors).forEach(function (field) {
          UIRenderer.showError(field, result.errors[field]);
        });
        // Focus first invalid field
        var firstErrorField = Object.keys(result.errors)[0];
        var firstEl = document.getElementById('item-' + firstErrorField);
        if (firstEl) firstEl.focus();
        return;
      }

      var added = StateManager.addTransaction(data);
      if (added) {
        UIRenderer.clearForm();
        // Return focus to first field for quick re-entry
        if (nameEl) nameEl.focus();
      }
    }

    return { init };
  })();

  /* ============================================================
     7. APP INIT
     ============================================================ */
  document.addEventListener('DOMContentLoaded', function () {
    // Init UI element references
    UIRenderer.init();

    // Show storage warning if localStorage is unavailable
    if (!StorageModule.isAvailable()) {
      UIRenderer.showStorageWarning(true);
    }

    // Init chart (Chart.js must be loaded before this)
    ChartManager.init('expense-chart');

    // Load state and render initial UI
    StateManager.init();

    // Attach form and list event listeners
    FormHandler.init();

    // Initialize Lucide icons (static HTML icons)
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  });

})();
