/**
 * France Classification — Dashboard Module
 */

const Dashboard = {
  async init() {
    const session = await Auth.requireAuth();
    if (!session) return;
    App.initMobileNav();
    App.setActiveNav('dashboard');
    this.bindLogout();
    await Promise.all([this.loadStats(), this.loadCharts(), this.loadRecentPlayers()]);
  },

  bindLogout() {
    const btn = document.getElementById('btn-logout');
    if (btn) btn.addEventListener('click', async (e) => { e.preventDefault(); await Auth.logout(); });
  },

  async loadStats() {
    try {
      const { data: players, error } = await window.supabaseClient
        .from('players').select('gender, junior_player');
      if (error) throw error;

      const total   = players.length;
      const male    = players.filter(p => p.gender === 'M').length;
      const female  = players.filter(p => p.gender === 'F').length;
      const junior  = players.filter(p => p.junior_player === true).length;

      document.getElementById('stat-total').textContent  = total;
      document.getElementById('stat-male').textContent   = male;
      document.getElementById('stat-female').textContent = female;
      document.getElementById('stat-junior').textContent = junior;
    } catch (err) {
      console.error('Stats error:', err);
      App.toast('Failed to load statistics', 'error');
    }
  },

  async loadCharts() {
    try {
      const { data: players, error } = await window.supabaseClient
        .from('players').select('classification, handicap');
      if (error) throw error;
      if (!players) return;

      // Classification chart
      const classCounts = {};
      APP_CONFIG.classificationOptions.forEach(c => classCounts[c] = 0);
      players.forEach(p => {
        if (p.classification && classCounts.hasOwnProperty(p.classification))
          classCounts[p.classification]++;
      });
      const maxClass = Math.max(...Object.values(classCounts), 1);
      const classChart = document.getElementById('chart-classification');
      if (classChart) {
        classChart.innerHTML = Object.entries(classCounts).map(([label, count]) => {
          const pct = (count / maxClass) * 100;
          return `
            <div class="bar-row">
              <span class="bar-label">${label}</span>
              <div class="bar-track">
                <div class="bar-fill" style="width:${Math.max(pct, count > 0 ? 4 : 0)}%">
                  <span class="bar-value">${count}</span>
                </div>
              </div>
            </div>`;
        }).join('');
      }

      // Handicap chart
      const handicapCounts = {};
      players.forEach(p => {
        if (p.handicap) {
          const h = p.handicap.trim().toUpperCase();
          handicapCounts[h] = (handicapCounts[h] || 0) + 1;
        }
      });
      const topHandicap = Object.entries(handicapCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const maxHandi = topHandicap.length > 0 ? topHandicap[0][1] : 1;
      const handiChart = document.getElementById('chart-handicap');
      if (handiChart) {
        if (topHandicap.length === 0) {
          handiChart.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1rem">No data yet</p>';
        } else {
          handiChart.innerHTML = topHandicap.map(([label, count]) => {
            const pct = (count / maxHandi) * 100;
            return `
              <div class="bar-row">
                <span class="bar-label">${App.escapeHtml(label)}</span>
                <div class="bar-track">
                  <div class="bar-fill bar-fill-alt" style="width:${Math.max(pct, 4)}%">
                    <span class="bar-value">${count}</span>
                  </div>
                </div>
              </div>`;
          }).join('');
        }
      }
    } catch (err) {
      console.error('Charts error:', err);
    }
  },

  async loadRecentPlayers() {
    try {
      const { data: players, error } = await window.supabaseClient
        .from('players')
        .select('identification, last_name, first_name, classification, class_status, gender, nationality')
        .order('created_at', { ascending: false })
        .limit(8);

      const tbody = document.getElementById('recent-players-body');
      if (!tbody) return;
      if (error) throw error;

      if (!players || players.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No players yet</td></tr>`;
        return;
      }

      tbody.innerHTML = players.map(p => `
        <tr>
          <td><strong>#${App.escapeHtml(p.identification || '—')}</strong></td>
          <td>
            <div style="font-weight:600;color:var(--text-primary);">${App.escapeHtml(p.last_name || '')}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);">${App.escapeHtml(p.first_name || '')}</div>
          </td>
          <td>${App.classBadge(p.classification)}</td>
          <td>${App.statusBadge(p.class_status)}</td>
          <td>${App.genderBadge(p.gender)}</td>
          <td style="color:var(--text-secondary);">${App.escapeHtml(p.nationality || '—')}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Recent players error:', err);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());
