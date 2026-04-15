/**
 * France Classification — App Utilities
 */

const App = {
  toast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = `<span style="font-weight:700;">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  formatDate(dateStr) {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return null; }
  },

  formatDateInput(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch { return ''; }
  },

  // Returns { label, cssClass } for an expiry date
  expireStatus(dateStr) {
    if (!dateStr) return { label: '—', cssClass: 'expire-none' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { label: '—', cssClass: 'expire-none' };
      const now = new Date();
      const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
      const label = this.formatDate(dateStr) || '—';
      if (diffDays < 0)   return { label, cssClass: 'expire-expired' };
      if (diffDays < 90)  return { label, cssClass: 'expire-soon' };
      return { label, cssClass: 'expire-ok' };
    } catch { return { label: '—', cssClass: 'expire-none' }; }
  },

  escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  debounce(fn, delay = 280) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  },

  classBadge(value) {
    if (!value) return '<span class="badge badge-na">—</span>';
    return `<span class="badge badge-class">${this.escapeHtml(value)}</span>`;
  },

  statusBadge(status) {
    if (!status) return '<span class="badge badge-na">—</span>';
    const map = {
      'Confirmed':    { cls: 'badge-confirmed', label: 'Confirmed' },
      'Under Review': { cls: 'badge-review',    label: 'Under Review' },
      'Provisional':  { cls: 'badge-provisional', label: 'Provisional' }
    };
    const b = map[status] || { cls: 'badge-na', label: this.escapeHtml(status) };
    return `<span class="badge ${b.cls}">${b.label}</span>`;
  },

  genderBadge(gender) {
    if (!gender) return '<span class="badge badge-na">—</span>';
    const cls = gender === 'M' ? 'badge-male' : 'badge-female';
    const lbl = gender === 'M' ? 'Male' : 'Female';
    return `<span class="badge ${cls}">${lbl}</span>`;
  },

  openModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; }
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('active'); document.body.style.overflow = ''; }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  },

  confirm(title, message) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('confirm-modal');
      if (!overlay) { resolve(false); return; }
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      const yesBtn = document.getElementById('confirm-yes');
      const noBtn  = document.getElementById('confirm-no');
      const cleanup = () => {
        this.closeModal('confirm-modal');
        yesBtn.replaceWith(yesBtn.cloneNode(true));
        noBtn.replaceWith(noBtn.cloneNode(true));
      };
      document.getElementById('confirm-yes').addEventListener('click', () => { cleanup(); resolve(true); }, { once: true });
      document.getElementById('confirm-no').addEventListener('click',  () => { cleanup(); resolve(false); }, { once: true });
      this.openModal('confirm-modal');
    });
  },

  initMobileNav() {
    const toggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) && e.target !== toggle) {
          sidebar.classList.remove('open');
        }
      });
    }
  },

  setActiveNav(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
  },

  exportCSV(data, filename = 'export.csv') {
    if (!data || data.length === 0) { this.toast('No data to export', 'info'); return; }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          let val = row[h] != null ? String(row[h]) : '';
          if (val.includes(',') || val.includes('"') || val.includes('\n'))
            val = '"' + val.replace(/"/g, '""') + '"';
          return val;
        }).join(',')
      )
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }
};
