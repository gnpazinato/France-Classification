/**
 * France Classification — Auth Module
 */

let supabaseClient = null;

try {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('Supabase CDN not loaded');
  }
  if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL.includes('https://fdeamqeejklhbyluygfy.supabase.co') ||
      typeof SUPABASE_ANON_KEY === 'undefined' || SUPABASE_ANON_KEY.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZWFtcWVlamtsaGJ5bHV5Z2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDM4NjMsImV4cCI6MjA5MTgxOTg2M30.0q7IaTPGhLl-EzeN4yd5T_aJpzVtY84lzFDJdgJ4zuE')) {
    throw new Error('Supabase credentials not configured. Please update js/config.js with your project credentials.');
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase client initialized');
} catch (e) {
  console.error('Supabase init error:', e.message);
}

const Auth = {
  async login(email, password) {
    if (!supabaseClient) throw new Error('Supabase client not initialized. Check js/config.js.');
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async logout() {
    if (!supabaseClient) throw new Error('Supabase client not initialized.');
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    window.location.href = 'index.html';
  },

  async getSession() {
    if (!supabaseClient) return null;
    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) console.error('Session error:', error);
      return data?.session || null;
    } catch { return null; }
  },

  async requireAuth() {
    const session = await this.getSession();
    if (!session) { window.location.href = 'index.html'; return null; }
    return session;
  },

  async redirectIfAuthenticated() {
    const session = await this.getSession();
    if (session) window.location.href = 'dashboard.html';
  }
};

window.Auth = Auth;
window.supabaseClient = supabaseClient;
