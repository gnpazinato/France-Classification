/**
 * France Classification — Players Module
 * Full CRUD: search, filter, sort, pagination, profile view, print card.
 */

const Players = {
  data: [],
  filtered: [],
  currentPage: 1,
  pageSize: APP_CONFIG.pageSize,
  sortColumn: 'identification',
  sortDirection: 'asc',
  searchTerm: '',
  filters: { classification: '', gender: '', class_status: '', junior_player: '' },
  editingPlayer: null,

  async init() {
    const session = await Auth.requireAuth();
    if (!session) return;
    App.initMobileNav();
    App.setActiveNav('players');
    this.bindLogout();
    this.buildDropdowns();
    this.bindEvents();
    await this.loadPlayers();
  },

  bindLogout() {
    const btn = document.getElementById('btn-logout');
    if (btn) btn.addEventListener('click', async (e) => { e.preventDefault(); await Auth.logout(); });
  },

  bindEvents() {
    // Search
    const search = document.getElementById('search-input');
    if (search) {
      search.addEventListener('input', App.debounce((e) => {
        this.searchTerm = e.target.value.toLowerCase().trim();
        this.currentPage = 1;
        this.applyFiltersAndRender();
      }));
    }

    // Filters
    ['filter-classification', 'filter-gender', 'filter-class-status', 'filter-junior'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => {
          const keyMap = {
            'filter-classification': 'classification',
            'filter-gender': 'gender',
            'filter-class-status': 'class_status',
            'filter-junior': 'junior_player'
          };
          this.filters[keyMap[id]] = e.target.value;
          this.currentPage = 1;
          this.applyFiltersAndRender();
        });
      }
    });

    // Add button
    document.getElementById('btn-add-player')
      ?.addEventListener('click', () => this.openAddModal());

    // Export
    document.getElementById('btn-export')
      ?.addEventListener('click', () => this.exportData());

    // Modal close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => App.closeAllModals());
    });

    // Player form submit
    document.getElementById('player-form')
      ?.addEventListener('submit', (e) => { e.preventDefault(); this.savePlayer(); });

    // Junior player toggle — show/hide junior_until field
    document.getElementById('field-junior-player')
      ?.addEventListener('change', (e) => {
        const group = document.getElementById('group-junior-until');
        if (group) group.style.display = e.target.checked ? 'block' : 'none';
      });

    // Click outside modal to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) App.closeAllModals();
      });
    });

    // Table sort headers
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => this.sortBy(th.dataset.sort));
    });
  },

  buildDropdowns() {
    // Filter dropdowns
    const fClass = document.getElementById('filter-classification');
    if (fClass) {
      APP_CONFIG.classificationOptions.forEach(c => {
        const o = document.createElement('option');
        o.value = c; o.textContent = c;
        fClass.appendChild(o);
      });
    }

    // Form dropdowns
    const buildSelect = (id, options, valueKey, labelKey) => {
      const el = document.getElementById(id);
      if (!el) return;
      options.forEach(opt => {
        const o = document.createElement('option');
        o.value = valueKey ? opt[valueKey] : opt;
        o.textContent = labelKey ? opt[labelKey] : opt;
        el.appendChild(o);
      });
    };

    buildSelect('field-classification', APP_CONFIG.classificationOptions);
    buildSelect('field-class-status',   APP_CONFIG.classStatusOptions);
    buildSelect('field-nationality',    APP_CONFIG.nationalityOptions);
    buildSelect('field-gender',         APP_CONFIG.genderOptions, 'value', 'label');
  },

  async loadPlayers() {
    try {
      const tbody = document.getElementById('players-table-body');
      if (tbody) tbody.innerHTML = `<tr><td colspan="8"><div class="loading-overlay"><div class="spinner"></div></div></td></tr>`;

      const { data, error } = await window.supabaseClient
        .from('players')
        .select('*')
        .order('identification', { ascending: true });

      if (error) throw error;
      this.data = data || [];
      this.applyFiltersAndRender();

      const countEl = document.getElementById('player-count');
      if (countEl) countEl.textContent = `${this.data.length} players`;
    } catch (err) {
      console.error('Load error:', err);
      App.toast('Failed to load players', 'error');
    }
  },

  applyFiltersAndRender() {
    let result = this.data;

    if (this.searchTerm) {
      result = result.filter(p => {
        const s = [
          p.identification, p.last_name, p.first_name,
          p.nationality, p.handicap, p.classifier,
          p.notes_1, p.notes_2, p.colour
        ].filter(Boolean).join(' ').toLowerCase();
        return s.includes(this.searchTerm);
      });
    }

    if (this.filters.classification) result = result.filter(p => p.classification === this.filters.classification);
    if (this.filters.gender)         result = result.filter(p => p.gender === this.filters.gender);
    if (this.filters.class_status)   result = result.filter(p => p.class_status === this.filters.class_status);
    if (this.filters.junior_player === 'true')  result = result.filter(p => p.junior_player === true);
    if (this.filters.junior_player === 'false') result = result.filter(p => !p.junior_player);

    result = [...result].sort((a, b) => {
      let va = a[this.sortColumn] ?? '';
      let vb = b[this.sortColumn] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      let cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return this.sortDirection === 'asc' ? cmp : -cmp;
    });

    this.filtered = result;
    this.renderTable();
    this.renderPagination();
  },

  renderTable() {
    const tbody = document.getElementById('players-table-body');
    if (!tbody) return;

    const start = (this.currentPage - 1) * this.pageSize;
    const page  = this.filtered.slice(start, start + this.pageSize);

    if (page.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="empty-state">
            <div class="empty-icon">🏀</div>
            <h3>No players found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = page.map(p => {
      const exp = App.expireStatus(p.expire_date);
      return `
        <tr data-id="${p.id}" onclick="Players.viewPlayer(${p.id})">
          <td><strong>#${App.escapeHtml(p.identification || '—')}</strong></td>
          <td>
            <div style="font-weight:600;color:var(--text-primary);">${App.escapeHtml(p.last_name || '')}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);">${App.escapeHtml(p.first_name || '')}</div>
          </td>
          <td>
            ${App.classBadge(p.classification)}
            ${p.class_status && p.class_status !== 'Confirmed' ? App.statusBadge(p.class_status) : ''}
          </td>
          <td>${App.genderBadge(p.gender)}</td>
          <td style="color:var(--text-secondary);">${App.escapeHtml(p.handicap || '—')}</td>
          <td style="color:var(--text-secondary);">${App.escapeHtml(p.nationality || '—')}</td>
          <td>
            ${p.expire_date
              ? `<span class="${exp.cssClass}">${exp.label}</span>`
              : `<span class="expire-none">—</span>`}
            ${p.junior_player ? ' <span class="badge badge-junior" style="font-size:0.65rem;">Junior</span>' : ''}
          </td>
          <td onclick="event.stopPropagation()">
            <div style="display:flex;gap:0.3rem;">
              <button class="btn btn-secondary btn-icon" onclick="Players.viewPlayer(${p.id})" title="View profile">👁</button>
              <button class="btn btn-secondary btn-icon" onclick="Players.openEditModal(${p.id})" title="Edit">✏️</button>
              <button class="btn btn-danger btn-icon" onclick="Players.deletePlayer(${p.id})" title="Delete">🗑</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    // Sort indicators
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
      const ind = th.querySelector('.sort-indicator');
      th.classList.toggle('sorted', th.dataset.sort === this.sortColumn);
      if (ind) ind.textContent = (th.dataset.sort === this.sortColumn)
        ? (this.sortDirection === 'asc' ? '▲' : '▼') : '⇅';
    });
  },

  renderPagination() {
    const totalPages = Math.ceil(this.filtered.length / this.pageSize);
    const info = document.getElementById('pagination-info');
    const controls = document.getElementById('pagination-controls');

    if (info) {
      const start = (this.currentPage - 1) * this.pageSize + 1;
      const end   = Math.min(this.currentPage * this.pageSize, this.filtered.length);
      info.textContent = this.filtered.length > 0
        ? `Showing ${start}–${end} of ${this.filtered.length}`
        : 'No results';
    }

    if (controls) {
      let html = `<button ${this.currentPage <= 1 ? 'disabled' : ''} onclick="Players.goToPage(${this.currentPage - 1})">‹</button>`;
      const maxBtns = 7;
      let s = Math.max(1, this.currentPage - 3);
      let e = Math.min(totalPages, s + maxBtns - 1);
      if (e - s < maxBtns - 1) s = Math.max(1, e - maxBtns + 1);
      for (let i = s; i <= e; i++)
        html += `<button class="${i === this.currentPage ? 'active' : ''}" onclick="Players.goToPage(${i})">${i}</button>`;
      html += `<button ${this.currentPage >= totalPages ? 'disabled' : ''} onclick="Players.goToPage(${this.currentPage + 1})">›</button>`;
      controls.innerHTML = html;
    }
  },

  goToPage(page) {
    const totalPages = Math.ceil(this.filtered.length / this.pageSize);
    if (page < 1 || page > totalPages) return;
    this.currentPage = page;
    this.renderTable();
    this.renderPagination();
    document.querySelector('.table-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  sortBy(column) {
    this.sortDirection = (this.sortColumn === column && this.sortDirection === 'asc') ? 'desc' : 'asc';
    this.sortColumn = column;
    this.currentPage = 1;
    this.applyFiltersAndRender();
  },

  // ─── View Player Profile ──────────────────────────────────────────
  viewPlayer(id) {
    const p = this.data.find(pl => pl.id === id);
    if (!p) return;

    const exp = App.expireStatus(p.expire_date);
    const body = document.getElementById('view-player-body');
    if (!body) return;

    const field = (label, value, full = false) => {
      const v = value ? App.escapeHtml(value) : null;
      return `
        <div class="profile-field${full ? ' profile-field-full' : ''}">
          <span class="profile-label">${label}</span>
          <span class="profile-value${!v ? ' empty' : ''}">${v || 'Not provided'}</span>
        </div>`;
    };

    body.innerHTML = `
      <div class="profile-grid">
        <div class="profile-section-divider">Identity</div>
        ${field('Identification #', p.identification)}
        ${field('Last Name', p.last_name)}
        ${field('First Name', p.first_name)}
        ${field('Date of Birth', App.formatDate(p.birth_date))}
        <div class="profile-field">
          <span class="profile-label">Gender</span>
          <span class="profile-value">${App.genderBadge(p.gender)}</span>
        </div>
        ${field('Nationality', p.nationality)}

        <div class="profile-section-divider">Classification</div>
        <div class="profile-field">
          <span class="profile-label">Classification</span>
          <span class="profile-value">${App.classBadge(p.classification)}</span>
        </div>
        <div class="profile-field">
          <span class="profile-label">Class Status</span>
          <span class="profile-value">${App.statusBadge(p.class_status)}</span>
        </div>
        ${field('Handicap Type', p.handicap)}
        ${field('Card Colour', p.colour)}

        <div class="profile-section-divider">Dates & Validity</div>
        ${field('Register Date', App.formatDate(p.register_date))}
        <div class="profile-field">
          <span class="profile-label">Expire Date</span>
          <span class="profile-value ${exp.cssClass}">${exp.label || 'Not set'}</span>
        </div>
        <div class="profile-field">
          <span class="profile-label">Junior Player</span>
          <span class="profile-value">${p.junior_player
            ? '<span class="badge badge-junior">Yes — Junior</span>'
            : '<span class="badge badge-na">No</span>'}</span>
        </div>
        ${field('Junior Until', App.formatDate(p.junior_until))}

        <div class="profile-section-divider">Classifier & Notes</div>
        ${field('Classifier', p.classifier)}
        ${p.notes_1 ? `
          <div class="profile-field profile-field-full">
            <span class="profile-label">Notes 1</span>
            <div class="profile-notes">${App.escapeHtml(p.notes_1)}</div>
          </div>` : ''}
        ${p.notes_2 ? `
          <div class="profile-field profile-field-full">
            <span class="profile-label">Notes 2</span>
            <div class="profile-notes">${App.escapeHtml(p.notes_2)}</div>
          </div>` : ''}
      </div>
    `;

    // Store current player id for print card button
    document.getElementById('btn-print-card').dataset.playerId = id;
    document.getElementById('view-modal-title').textContent =
      `${p.last_name || ''}, ${p.first_name || ''}`;

    App.openModal('player-view-modal');
  },

  // ─── Print Card ───────────────────────────────────────────────────
  openPrintCard(id) {
    const p = this.data.find(pl => pl.id === id);
    if (!p) return;

    const exp = App.expireStatus(p.expire_date);
    const statusClass = {
      'Confirmed':    'status-confirmed',
      'Under Review': 'status-review',
      'Provisional':  'status-provisional'
    }[p.class_status] || 'status-confirmed';

    const colourBarStyle = this.getColourStyle(p.colour);
    const photoHtml = p.photo_url
      ? `<img src="${p.photo_url}" alt="Player Photo">`
      : `<span class="class-card-photo-placeholder">👤</span>`;

    const cardBody = document.getElementById('card-print-body');
    if (!cardBody) return;

    cardBody.innerHTML = `
      <div class="card-print-wrapper">
        <div class="class-card">
          <div class="class-card-colour-bar" style="${colourBarStyle}"></div>
          <div class="class-card-header">
            <div class="class-card-flag">
              <img src="assets/france-flag.svg" alt="France Flag">
            </div>
            <div class="class-card-org">
              France Wheelchair Basketball
              <span>Classification Card — Fédération Française</span>
            </div>
          </div>

          <div class="class-card-body">
            <div class="class-card-photo">${photoHtml}</div>

            <div class="class-card-info">
              <div class="class-card-name">
                ${App.escapeHtml(p.last_name || '')}
                <span>${App.escapeHtml(p.first_name || '')}</span>
              </div>
              <div class="class-card-row">
                <div class="class-card-field">
                  <span class="class-card-field-label">Date of Birth</span>
                  <span class="class-card-field-value">${App.formatDate(p.birth_date) || '—'}</span>
                </div>
                <div class="class-card-field">
                  <span class="class-card-field-label">Nationality</span>
                  <span class="class-card-field-value">${App.escapeHtml(p.nationality || '—')}</span>
                </div>
                <div class="class-card-field">
                  <span class="class-card-field-label">Gender</span>
                  <span class="class-card-field-value">${p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : '—'}</span>
                </div>
              </div>
              <div class="class-card-row">
                <div class="class-card-field">
                  <span class="class-card-field-label">Handicap</span>
                  <span class="class-card-field-value">${App.escapeHtml(p.handicap || '—')}</span>
                </div>
                <div class="class-card-field">
                  <span class="class-card-field-label">Card Colour</span>
                  <span class="class-card-field-value">${App.escapeHtml(p.colour || '—')}</span>
                </div>
                <div class="class-card-field">
                  <span class="class-card-field-label">ID #</span>
                  <span class="class-card-field-value">${App.escapeHtml(p.identification || '—')}</span>
                </div>
              </div>
            </div>

            <div class="class-card-right">
              <span class="class-card-class-label">Class</span>
              <span class="class-card-class-number">${App.escapeHtml(p.classification || '—')}</span>
              <span class="class-card-status-pill ${statusClass}">
                ${App.escapeHtml(p.class_status || 'Confirmed')}
              </span>
            </div>
          </div>

          <div class="class-card-footer">
            <div class="class-card-footer-item">
              <span class="class-card-footer-label">Classifier</span>
              <span class="class-card-footer-value">${App.escapeHtml(p.classifier || '—')}</span>
            </div>
            <div class="class-card-footer-item">
              <span class="class-card-footer-label">Register Date</span>
              <span class="class-card-footer-value">${App.formatDate(p.register_date) || '—'}</span>
            </div>
            <div class="class-card-footer-item">
              <span class="class-card-footer-label">Valid Until</span>
              <span class="class-card-footer-value ${exp.cssClass}">${exp.label || '—'}</span>
            </div>
          </div>
        </div>

        <div class="no-print" style="margin-top:1.5rem;text-align:center;">
          <button class="btn btn-primary" onclick="window.print()" style="margin-right:0.5rem;">
            🖨️ Print Card
          </button>
          <button class="btn btn-secondary" onclick="App.closeModal('card-print-modal')">Close</button>
        </div>
      </div>
    `;

    App.openModal('card-print-modal');
  },

  getColourStyle(colour) {
    const map = {
      'white':  'background:#f0f0f0;',
      'blue':   'background:#002395;',
      'green':  'background:#16a34a;',
      'yellow': 'background:#eab308;',
      'orange': 'background:#f97316;',
      'pink':   'background:#ec4899;',
      'red':    'background:#dc2626;',
    };
    const key = (colour || '').toLowerCase();
    return map[key] || 'background:linear-gradient(90deg,#002395 33%,#fff 33%,#fff 66%,#ED2939 66%);';
  },

  // ─── Add / Edit Modal ─────────────────────────────────────────────
  openAddModal() {
    this.editingPlayer = null;
    document.getElementById('modal-title').textContent = 'Add New Player';
    const form = document.getElementById('player-form');
    if (form) form.reset();
    document.getElementById('group-player-id').style.display = 'none';
    document.getElementById('group-junior-until').style.display = 'none';
    App.openModal('player-modal');
  },

  openEditModal(id) {
    const p = this.data.find(pl => pl.id === id);
    if (!p) return;
    this.editingPlayer = p;
    document.getElementById('modal-title').textContent = 'Edit Player';
    document.getElementById('group-player-id').style.display = 'block';
    document.getElementById('field-player-db-id').value = p.id;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('field-identification', p.identification);
    set('field-last-name',      p.last_name);
    set('field-first-name',     p.first_name);
    set('field-birth-date',     App.formatDateInput(p.birth_date));
    set('field-nationality',    p.nationality);
    set('field-classification', p.classification);
    set('field-class-status',   p.class_status);
    set('field-gender',         p.gender);
    set('field-handicap',       p.handicap);
    set('field-register-date',  App.formatDateInput(p.register_date));
    set('field-expire-date',    App.formatDateInput(p.expire_date));
    set('field-colour',         p.colour);
    set('field-classifier',     p.classifier);
    set('field-notes-1',        p.notes_1);
    set('field-notes-2',        p.notes_2);
    set('field-junior-until',   App.formatDateInput(p.junior_until));

    const juniorCheck = document.getElementById('field-junior-player');
    if (juniorCheck) juniorCheck.checked = !!p.junior_player;
    const juniorGroup = document.getElementById('group-junior-until');
    if (juniorGroup) juniorGroup.style.display = p.junior_player ? 'block' : 'none';

    App.openModal('player-modal');
  },

  async savePlayer() {
    const submitBtn = document.getElementById('btn-save-player');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const get = (id) => { const el = document.getElementById(id); return el?.value?.trim() || null; };
      const getCheck = (id) => !!document.getElementById(id)?.checked;

      const formData = {
        identification:  get('field-identification'),
        last_name:       (get('field-last-name') || '').toUpperCase(),
        first_name:      (get('field-first-name') || '').toUpperCase(),
        birth_date:      get('field-birth-date')     || null,
        nationality:     get('field-nationality')    || null,
        classification:  get('field-classification') || null,
        class_status:    get('field-class-status')   || 'Confirmed',
        gender:          get('field-gender')         || null,
        handicap:        get('field-handicap')       || null,
        register_date:   get('field-register-date')  || null,
        expire_date:     get('field-expire-date')    || null,
        colour:          get('field-colour')         || null,
        classifier:      get('field-classifier')     || null,
        notes_1:         get('field-notes-1')        || null,
        notes_2:         get('field-notes-2')        || null,
        junior_player:   getCheck('field-junior-player'),
        junior_until:    getCheck('field-junior-player') ? (get('field-junior-until') || null) : null,
        updated_at:      new Date().toISOString()
      };

      if (!formData.last_name)  throw new Error('Last Name is required');
      if (!formData.first_name) throw new Error('First Name is required');

      if (this.editingPlayer) {
        const { error } = await window.supabaseClient
          .from('players').update(formData).eq('id', this.editingPlayer.id);
        if (error) throw error;
        App.toast('Player updated successfully', 'success');
      } else {
        const { error } = await window.supabaseClient
          .from('players').insert([{ ...formData, created_at: new Date().toISOString() }]);
        if (error) throw error;
        App.toast('Player added successfully', 'success');
      }

      App.closeAllModals();
      await this.loadPlayers();
    } catch (err) {
      console.error('Save error:', err);
      App.toast(err.message || 'Failed to save player', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  },

  async deletePlayer(id) {
    const p = this.data.find(pl => pl.id === id);
    if (!p) return;
    const confirmed = await App.confirm(
      'Delete Player',
      `Delete #${p.identification || id} — ${p.last_name}, ${p.first_name}? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      const { error } = await window.supabaseClient.from('players').delete().eq('id', id);
      if (error) throw error;
      App.toast('Player deleted', 'success');
      await this.loadPlayers();
    } catch (err) {
      console.error('Delete error:', err);
      App.toast('Failed to delete player', 'error');
    }
  },

  exportData() {
    const rows = this.filtered.map(p => ({
      'Identification':  p.identification,
      'Last Name':       p.last_name,
      'First Name':      p.first_name,
      'Birth Date':      App.formatDate(p.birth_date),
      'Nationality':     p.nationality,
      'Classification':  p.classification,
      'Class Status':    p.class_status,
      'Gender':          p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : '',
      'Handicap':        p.handicap,
      'Register Date':   App.formatDate(p.register_date),
      'Expire Date':     App.formatDate(p.expire_date),
      'Card Colour':     p.colour,
      'Junior Player':   p.junior_player ? 'Yes' : 'No',
      'Junior Until':    App.formatDate(p.junior_until),
      'Classifier':      p.classifier,
      'Notes 1':         p.notes_1,
      'Notes 2':         p.notes_2
    }));
    App.exportCSV(rows, `france_classification_${new Date().toISOString().split('T')[0]}.csv`);
    App.toast(`Exported ${rows.length} players`, 'success');
  }
};

document.addEventListener('DOMContentLoaded', () => Players.init());
