/* ============================================================
   NOCTIS ADMIN — admin.js
   PART A of 2
   ============================================================ */

const CONFIG = { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' };

const State = {
  supabase: null, session: null, user: null, currentPage: 'dashboard',
  cache: { leads: [], reviews: [], work: [], services: [], pricing: [], faq: [], locations: [], seoPages: [], projects: [], quotes: [], media: [], activity: [] },
  ui: { reviewTab: 'pending', websiteTab: 'hero' }
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function escapeHTML(str) { const d = document.createElement('div'); d.textContent = String(str ?? ''); return d.innerHTML; }
function formatDate(iso, o = { year: 'numeric', month: 'short', day: 'numeric' }) { if (!iso) return '—'; try { return new Date(iso).toLocaleDateString('en-IN', o); } catch { return '—'; } }
function formatDateTime(iso) { if (!iso) return '—'; try { return new Date(iso).toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return '—'; } }
function debounce(fn, w = 300) { let t; return function(...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), w); }; }
function starsHTML(n, t = 5) { let o = ''; for (let i = 1; i <= t; i++) o += `<svg viewBox="0 0 24 24" fill="${i <= n ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5" class="${i <= n ? '' : 'empty'}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>`; return o; }

function toast(type, title, msg) {
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>'
  };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `${icons[type] || icons.info}<div class="toast-body"><div class="toast-title">${escapeHTML(title)}</div>${msg ? `<div class="toast-msg">${escapeHTML(msg)}</div>` : ''}</div>`;
  $('#toastWrap').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, 3600);
}

const Modal = {
  open({ title, sub = '', body, foot, wide = false, slim = false, onOpen }) {
    $('#modalTitle').textContent = title; $('#modalSub').textContent = sub;
    $('#modalBody').innerHTML = body || ''; $('#modalFoot').innerHTML = foot || '';
    $('#modal').classList.toggle('wide', !!wide); $('#modal').classList.toggle('slim', !!slim);
    $('#modalBg').classList.add('open'); document.body.classList.add('no-scroll');
    if (onOpen) onOpen();
  },
  close() { $('#modalBg').classList.remove('open'); document.body.classList.remove('no-scroll'); }
};
$('#modalClose').addEventListener('click', () => Modal.close());
$('#modalBg').addEventListener('click', (e) => { if (e.target.id === 'modalBg') Modal.close(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') Modal.close(); });

function confirmDialog({ title, message, confirmLabel = 'Delete', danger = true, onConfirm }) {
  Modal.open({
    title, slim: true,
    body: `<p style="color:var(--muted);font-size:0.9rem;line-height:1.7">${escapeHTML(message)}</p>`,
    foot: `<button class="btn btn-ghost" data-cancel>Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${escapeHTML(confirmLabel)}</button>`,
    onOpen: () => {
      $('[data-cancel]', $('#modalFoot')).addEventListener('click', () => Modal.close());
      $('[data-confirm]', $('#modalFoot')).addEventListener('click', async () => {
        const b = $('[data-confirm]', $('#modalFoot')); b.disabled = true; b.textContent = 'Working...';
        try { await onConfirm(); Modal.close(); } catch (e) { b.disabled = false; b.textContent = confirmLabel; }
      });
    }
  });
}

function getStoredConfig() { return { url: localStorage.getItem('noctis_supa_url') || CONFIG.SUPABASE_URL, key: localStorage.getItem('noctis_supa_key') || CONFIG.SUPABASE_ANON_KEY }; }
function saveSupabaseConfig(url, key) { if (url) localStorage.setItem('noctis_supa_url', url); if (key) localStorage.setItem('noctis_supa_key', key); }
function initSupabase() {
  const { url, key } = getStoredConfig();
  if (!url || !key) return { ok: false, reason: 'missing_config' };
  if (!window.supabase || !window.supabase.createClient) return { ok: false, reason: 'missing_library' };
  try { State.supabase = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }); return { ok: true }; }
  catch (e) { return { ok: false, reason: 'init_failed', error: e }; }
}

function showLogin() { $('#loginScreen').style.display = 'flex'; $('#app').classList.remove('ready'); $('#sessionExpired').classList.remove('open'); }
function hideLogin() { $('#loginScreen').style.display = 'none'; $('#app').classList.add('ready'); }
function showLoginError(m) { const e = $('#loginError'); e.textContent = m; e.classList.add('show'); }
function hideLoginError() { $('#loginError').classList.remove('show'); }

(function prefillConfig() { const { url, key } = getStoredConfig(); if (url) $('#supaUrl').value = url; if (key) $('#supaKey').value = key; })();

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault(); hideLoginError();
  const url = $('#supaUrl').value.trim(); const key = $('#supaKey').value.trim();
  const email = $('#loginEmail').value.trim(); const password = $('#loginPassword').value;
  if (!url || !key) return showLoginError('Please enter your Supabase URL and anon key.');
  if (!email || !password) return showLoginError('Please enter your email and password.');
  saveSupabaseConfig(url, key);
  const init = initSupabase();
  if (!init.ok) return showLoginError('Could not initialize Supabase. Check the URL and anon key.');
  const btn = $('#signInBtn'); btn.disabled = true; const orig = btn.innerHTML;
  btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Signing in...';
  try { const { error } = await State.supabase.auth.signInWithPassword({ email, password }); if (error) throw error; }
  catch (err) { showLoginError(err.message || 'Sign in failed.'); btn.disabled = false; btn.innerHTML = orig; }
});

$('#forgotBtn').addEventListener('click', async () => {
  const email = $('#loginEmail').value.trim();
  if (!email) return showLoginError('Enter your email first.');
  const { url, key } = getStoredConfig();
  if (!url || !key) return showLoginError('Configure Supabase first.');
  initSupabase();
  try { const { error } = await State.supabase.auth.resetPasswordForEmail(email); if (error) throw error; toast('success', 'Reset sent', 'Check your email.'); }
  catch (err) { showLoginError(err.message || 'Could not send reset email.'); }
});

$('#signInAgainBtn').addEventListener('click', () => { $('#sessionExpired').classList.remove('open'); showLogin(); });

let currentUser = null;
async function handleSession(session) {
  if (!session) { currentUser = null; State.session = null; State.user = null; showLogin(); return; }
  State.session = session; State.user = session.user; currentUser = session.user;

  let authorized = true;
  try {
    const { data, error } = await State.supabase.from('profiles').select('id, full_name, role').eq('id', session.user.id).maybeSingle();
    if (error) console.warn('profiles lookup:', error.message);
    else if (data && data.role && data.role !== 'admin') authorized = false;
  } catch (err) { console.warn('Authorization check failed:', err); }

  if (!authorized) { toast('error', 'Access denied', 'Not an authorized admin.'); await State.supabase.auth.signOut(); return; }

  const email = session.user.email || '';
  const name = (session.user.user_metadata && session.user.user_metadata.full_name) || email.split('@')[0] || 'Admin';
  $('#userName').textContent = name; $('#userEmail').textContent = email;
  $('#userAvatar').textContent = (name[0] || 'A').toUpperCase();
  $('#secUser').textContent = name; $('#secEmail').textContent = email;
  $('#secStarted').textContent = formatDateTime(new Date().toISOString());
  $('#secLastSignin').textContent = formatDateTime(session.user.last_sign_in_at || new Date().toISOString());

  hideLogin();
  await loadAllData();
  navigate(State.currentPage);
}

(function bootstrap() {
  const init = initSupabase();
  if (!init.ok) { showLogin(); return; }
  State.supabase.auth.getSession().then(({ data }) => handleSession(data.session)).catch(() => showLogin());
  State.supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') showLogin();
    else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') handleSession(session);
    else if (event === 'PASSWORD_RECOVERY') toast('info', 'Password recovery', 'Check your email.');
  });
})();

$('#logoutBtn').addEventListener('click', async () => {
  if (!State.supabase) return showLogin();
  try { await State.supabase.auth.signOut(); } catch (e) { console.error(e); }
  showLogin();
});

const sidebar = $('#sidebar'); const overlay = $('#sidebarOverlay');
function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('open'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }
$('#menuOpen').addEventListener('click', openSidebar);
$('#sidebarClose').addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

const PAGES = {
  dashboard: { title: 'Dashboard', sub: 'Manage your website, content, leads and digital presence.' },
  website: { title: 'Website CMS', sub: 'Edit public website content.' },
  services: { title: 'Services', sub: 'Manage service offerings.' },
  work: { title: 'Work / Portfolio', sub: 'Projects displayed on the public website.' },
  reviews: { title: 'Reviews', sub: 'Moderate public reviews.' },
  pricing: { title: 'Pricing', sub: 'Manage pricing packages.' },
  faq: { title: 'FAQ', sub: 'Manage frequently asked questions.' },
  seo: { title: 'SEO Manager', sub: 'Global and page-level SEO.' },
  locations: { title: 'Locations', sub: 'Service locations for local SEO.' },
  programmatic: { title: 'Programmatic SEO', sub: 'Generate page candidates.' },
  leads: { title: 'Leads CRM', sub: 'Project enquiries and business leads.' },
  projects: { title: 'Projects', sub: 'Active client projects.' },
  quotes: { title: 'Quotes', sub: 'Client quotations.' },
  media: { title: 'Media Library', sub: 'Uploaded images.' },
  analytics: { title: 'Analytics', sub: 'Activity metrics.' },
  activity: { title: 'Activity Log', sub: 'Admin actions.' },
  settings: { title: 'Settings', sub: 'Global site settings.' },
  security: { title: 'Security Center', sub: 'Session and account security.' }
};

function navigate(page) {
  if (!PAGES[page]) page = 'dashboard';
  State.currentPage = page;
  $$('.page').forEach(p => p.classList.toggle('active', p.dataset.page === page));
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  const m = PAGES[page];
  $('#pageTitle').textContent = m.title; $('#pageSub').textContent = m.sub;
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (page === 'website') renderWebsiteTab(State.ui.websiteTab);
  if (page === 'work') renderWorkList();
  if (page === 'reviews') renderReviews();
  if (page === 'leads') renderLeads();
  if (page === 'services') renderServices();
  if (page === 'pricing') renderPricing();
  if (page === 'faq') renderFaq();
  if (page === 'locations') renderLocations();
  if (page === 'seo') renderSeoPages();
  if (page === 'projects') renderProjects();
  if (page === 'quotes') renderQuotes();
  if (page === 'media') renderMedia();
  if (page === 'activity') renderActivity();
  if (page === 'dashboard') renderDashboard();
  if (page === 'programmatic') renderPendingPg();
}

$$('.nav-item[data-page]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.page)));
$$('[data-goto]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.goto)));

async function safeQuery(table, opts = {}) {
  if (!State.supabase) return { data: [], error: 'no_client' };
  try {
    let q = State.supabase.from(table).select(opts.select || '*');
    if (opts.order) q = q.order(opts.order.column, { ascending: opts.order.ascending !== false });
    if (opts.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) { console.warn(`[${table}]`, error.message); return { data: [], error: error.message }; }
    return { data: data || [], error: null };
  } catch (err) { console.warn(`[${table}]`, err); return { data: [], error: String(err) }; }
}

async function loadAllData() {
  const [leads, reviews, work, services, pricing, faq, locations, seoPages, projects, quotes, media, activity] = await Promise.all([
    safeQuery('leads', { order: { column: 'created_at', ascending: false }, limit: 500 }),
    safeQuery('reviews', { order: { column: 'created_at', ascending: false }, limit: 500 }),
    safeQuery('portfolio_projects', { order: { column: 'display_order', ascending: true } }),
    safeQuery('services', { order: { column: 'display_order', ascending: true } }),
    safeQuery('pricing_packages', { order: { column: 'display_order', ascending: true } }),
    safeQuery('faqs', { order: { column: 'display_order', ascending: true } }),
    safeQuery('locations', { order: { column: 'name', ascending: true } }),
    safeQuery('seo_pages', { order: { column: 'created_at', ascending: false } }),
    safeQuery('business_projects', { order: { column: 'created_at', ascending: false } }),
    safeQuery('quotes', { order: { column: 'created_at', ascending: false } }),
    safeQuery('media', { order: { column: 'created_at', ascending: false }, limit: 200 }),
    safeQuery('activity_logs', { order: { column: 'created_at', ascending: false }, limit: 100 })
  ]);
  State.cache.leads = leads.data; State.cache.reviews = reviews.data;
  State.cache.work = work.data; State.cache.services = services.data;
  State.cache.pricing = pricing.data; State.cache.faq = faq.data;
  State.cache.locations = locations.data; State.cache.seoPages = seoPages.data;
  State.cache.projects = projects.data; State.cache.quotes = quotes.data;
  State.cache.media = media.data; State.cache.activity = activity.data;
  updateBadges(); renderDashboard();
}

function updateBadges() {
  const pr = State.cache.reviews.filter(r => r.status === 'pending').length;
  const nl = State.cache.leads.filter(l => l.status === 'new').length;
  const br = $('#badgeReviews'); const bl = $('#badgeLeads');
  br.textContent = pr; bl.textContent = nl;
  br.style.display = pr > 0 ? '' : 'none'; bl.style.display = nl > 0 ? '' : 'none';
}

async function logActivity(action, resource = '', result = 'success') {
  if (!State.supabase || !State.user) return;
  try { await State.supabase.from('activity_logs').insert({ user_id: State.user.id, user_email: State.user.email, action, resource, result, created_at: new Date().toISOString() }); }
  catch (err) { console.warn('activity log failed', err); }
}

function renderDashboard() {
  const l = State.cache.leads, r = State.cache.reviews, w = State.cache.work, p = State.cache.projects, s = State.cache.seoPages;
  const pr = r.filter(x => x.status === 'pending'); const ar = r.filter(x => x.status === 'approved');
  const avg = ar.length ? ar.reduce((sum, x) => sum + (x.rating || 0), 0) / ar.length : 0;
  $('#kpiLeads').textContent = l.length;
  $('#kpiLeadsFoot').textContent = l.filter(x => x.status === 'new').length + ' new';
  $('#kpiPendingReviews').textContent = pr.length;
  $('#kpiApprovedReviews').textContent = ar.length;
  $('#kpiAvgRating').textContent = ar.length ? `Avg ${avg.toFixed(1)}/5` : 'No ratings';
  $('#kpiWork').textContent = w.length;
  $('#kpiWorkPublished').textContent = w.filter(x => x.status === 'published').length + ' published';
  $('#kpiSeo').textContent = s.filter(x => x.status === 'published').length;
  $('#kpiProjects').textContent = p.filter(x => !['completed', 'cancelled'].includes(x.status)).length;

  const rl = l.slice(0, 5);
  $('#dashLeads').innerHTML = rl.length ? rl.map(x => `<div class="info-row"><div><div style="font-weight:500">${escapeHTML(x.name || '—')}</div><div class="td-muted">${escapeHTML(x.service || x.business || '')}</div></div><span class="pill pill-${escapeHTML(x.status || 'new')}">${escapeHTML(x.status || 'new')}</span></div>`).join('') : '<div class="empty" style="padding:1.5rem 1rem"><p>No leads yet.</p></div>';

  const rr = r.slice(0, 4);
  $('#dashReviews').innerHTML = rr.length ? rr.map(x => `<div class="info-row"><div><div style="font-weight:500">${escapeHTML(x.name || '—')}</div><div class="stars" style="font-size:0.7rem">${starsHTML(x.rating || 0)}</div></div><span class="pill pill-${escapeHTML(x.status || 'pending')}">${escapeHTML(x.status || 'pending')}</span></div>`).join('') : '<div class="empty" style="padding:1.5rem 1rem"><p>No reviews yet.</p></div>';

  const ra = State.cache.activity.slice(0, 6);
  $('#dashActivity').innerHTML = ra.length ? ra.map(a => `<div class="info-row"><div><div style="font-weight:500">${escapeHTML(a.action || '')}</div><div class="td-muted">${escapeHTML(a.user_email || '')} · ${formatDateTime(a.created_at)}</div></div></div>`).join('') : '<div class="empty" style="padding:1.5rem 1rem"><p>No activity yet.</p></div>';
}

/* ============ WEBSITE CMS ============ */
$$('.tab[data-tab]').forEach(t => t.addEventListener('click', () => {
  $$('.tab[data-tab]').forEach(x => x.classList.remove('active'));
  t.classList.add('active'); State.ui.websiteTab = t.dataset.tab; renderWebsiteTab(t.dataset.tab);
}));

async function renderWebsiteTab(tab) {
  const el = $('#tabContent'); el.innerHTML = '<div class="loading"><span class="spinner"></span> Loading...</div>';
  if (!State.supabase) return el.innerHTML = '<div class="empty"><p>Supabase not configured.</p></div>';
  const { data } = await safeQuery('site_settings');
  const rec = (data || []).find(x => x.section === tab);
  const content = rec && rec.content ? rec.content : {};
  el.innerHTML = websiteTabForm(tab, content);
  $$('[data-save-website]', el).forEach(b => b.addEventListener('click', () => saveWebsiteTab(tab, b.dataset.saveWebsite)));
}

function websiteTabForm(tab, c) {
  const F = (id, label, val, type = 'text') => `<div class="field"><label for="${id}">${label}</label>${type === 'textarea' ? `<textarea id="${id}" data-field="${id}">${escapeHTML(val || '')}</textarea>` : `<input type="text" id="${id}" data-field="${id}" value="${escapeHTML(val || '')}">`}</div>`;
  const actions = `<div class="editor-actions"><button class="btn btn-ghost" data-save-website="draft">Save Draft</button><button class="btn btn-primary" data-save-website="published">Publish</button></div>`;
  if (tab === 'hero') return `<div class="editor-grid">${F('eyebrow', 'Eyebrow label', c.eyebrow)}${F('location', 'Location line', c.location)}<div style="grid-column:1/-1">${F('headline', 'Headline', c.headline, 'textarea')}</div><div style="grid-column:1/-1">${F('description', 'Description', c.description, 'textarea')}</div>${F('ctaPrimary', 'Primary CTA', c.ctaPrimary)}${F('ctaSecondary', 'Secondary CTA', c.ctaSecondary)}${F('price', 'Starting price', c.price)}</div>${actions}`;
  if (tab === 'about') return `<div class="editor-grid">${F('founderName', 'Founder name', c.founderName)}${F('founderTitle', 'Founder title', c.founderTitle)}<div style="grid-column:1/-1">${F('story', 'Founder story', c.story, 'textarea')}</div><div style="grid-column:1/-1">${F('statement', 'Founder statement', c.statement, 'textarea')}</div></div>${actions}`;
  if (tab === 'why') { const items = c.items || ['Built around your business.', 'Designed for real people.', 'Engineered for the web.', 'Optimized for discovery.', 'Made to evolve.']; return `<div class="editor-grid">${items.map((it, i) => F('why_' + i, `Statement ${i + 1}`, it)).join('')}</div>${actions}`; }
  if (tab === 'process') { const steps = c.steps || [{ title: 'Discover', desc: 'Understanding your business.' }, { title: 'Plan', desc: 'Architecture and strategy.' }, { title: 'Design', desc: 'Interface and visual system.' }, { title: 'Build', desc: 'Development and integration.' }, { title: 'Optimize', desc: 'Performance and SEO.' }, { title: 'Launch', desc: 'Deployment and go-live.' }, { title: 'Support', desc: 'Ongoing assistance.' }]; return `<div class="editor-grid">${steps.map((s, i) => `<div class="card" style="padding:1rem">${F('step_' + i + '_title', `Step ${i + 1} title`, s.title)}${F('step_' + i + '_desc', 'Description', s.desc, 'textarea')}</div>`).join('')}</div>${actions}`; }
  if (tab === 'contactInfo') return `<div class="editor-grid">${F('address', 'Address', c.address || 'Mangalam, Tirupur — 641663')}${F('whatsapp', 'WhatsApp', c.whatsapp)}${F('email', 'Email', c.email)}<div style="grid-column:1/-1">${F('headline', 'Contact headline', c.headline || "Let's Build Something Useful.")}</div></div>${actions}`;
  if (tab === 'footer') return `<div class="editor-grid">${F('tagline', 'Tagline', c.tagline || 'Digital technology and business solutions built around your needs.')}${F('copyright', 'Copyright', c.copyright || '© 2026 Noctis Technologies. All rights reserved.')}<div style="grid-column:1/-1">${F('finalLine', 'Final line', c.finalLine || 'The creator of this page — Noctis Technologies — 2026.')}</div></div>${actions}`;
  return '<div class="empty"><p>Unknown tab.</p></div>';
}

async function saveWebsiteTab(tab, status) {
  if (!State.supabase) return toast('error', 'Not connected');
  const el = $('#tabContent');
  const content = {};
  $$('[data-field]', el).forEach(input => { content[input.dataset.field] = input.value; });
  if (tab === 'process') { const steps = []; let i = 0; while (content['step_' + i + '_title'] !== undefined) { steps.push({ title: content['step_' + i + '_title'], desc: content['step_' + i + '_desc'] || '' }); delete content['step_' + i + '_title']; delete content['step_' + i + '_desc']; i++; } content.steps = steps; }
  if (tab === 'why') { const items = []; let i = 0; while (content['why_' + i] !== undefined) { items.push(content['why_' + i]); delete content['why_' + i]; i++; } content.items = items; }
  try {
    const { data: existing } = await State.supabase.from('site_settings').select('id').eq('section', tab).maybeSingle();
    if (existing && existing.id) { await State.supabase.from('site_settings').update({ content, status, updated_at: new Date().toISOString() }).eq('id', existing.id); }
    else { await State.supabase.from('site_settings').insert({ section: tab, content, status, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); }
    logActivity('UPDATE WEBSITE', `section:${tab}`, status);
    toast('success', status === 'published' ? 'Published' : 'Draft saved', `Website ${tab} section updated.`);
  } catch (err) { toast('error', 'Save failed', err.message || 'Unable to save.'); }
}

/* ============ SERVICES ============ */
function renderServices() {
  const list = State.cache.services; const el = $('#servicesList');
  if (!list.length) return el.innerHTML = '<div class="empty"><h4>No services yet</h4><p>Add your first service offering.</p></div>';
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Order</th><th>Name</th><th>Status</th><th>Description</th><th></th></tr></thead><tbody>${list.map(s => `<tr><td data-label="Order">${s.display_order ?? '—'}</td><td data-label="Name"><strong>${escapeHTML(s.name || '')}</strong></td><td data-label="Status"><span class="pill pill-${escapeHTML(s.status || 'draft')}">${escapeHTML(s.status || 'draft')}</span></td><td data-label="Description" class="td-muted">${escapeHTML((s.short_description || '').slice(0, 80))}</td><td data-label="Actions"><div class="td-actions"><button class="btn btn-xs btn-ghost" data-edit-service="${escapeHTML(s.id)}">Edit</button><button class="btn btn-xs btn-danger" data-del-service="${escapeHTML(s.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
  $$('[data-edit-service]', el).forEach(b => b.addEventListener('click', () => editService(b.dataset.editService)));
  $$('[data-del-service]', el).forEach(b => b.addEventListener('click', () => deleteService(b.dataset.delService)));
}
$('#addServiceBtn').addEventListener('click', () => editService(null));
function editService(id) {
  const s = id ? State.cache.services.find(x => x.id === id) : null;
  Modal.open({
    title: s ? 'Edit Service' : 'Add Service',
    body: `<div class="field mb"><label>Name <span class="req">*</span></label><input type="text" id="svName" value="${escapeHTML(s?.name || '')}"></div><div class="field mb"><label>Short description</label><textarea id="svShort" rows="3">${escapeHTML(s?.short_description || '')}</textarea></div><div class="field mb"><label>Long description</label><textarea id="svLong" rows="4">${escapeHTML(s?.long_description || '')}</textarea></div><div class="field-row mb"><div class="field"><label>Order</label><input type="number" id="svOrder" value="${s?.display_order ?? (State.cache.services.length + 1)}"></div><div class="field"><label>Status</label><select id="svStatus"><option value="draft"${s?.status === 'draft' ? ' selected' : ''}>Draft</option><option value="published"${s?.status === 'published' ? ' selected' : ''}>Published</option><option value="archived"${s?.status === 'archived' ? ' selected' : ''}>Archived</option></select></div></div>`,
    foot: `<button class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save</button>`,
    onOpen: () => {
      $('[data-cancel]').addEventListener('click', () => Modal.close());
      $('[data-save]').addEventListener('click', async () => {
        const data = { name: $('#svName').value.trim(), short_description: $('#svShort').value.trim(), long_description: $('#svLong').value.trim(), display_order: parseInt($('#svOrder').value) || 0, status: $('#svStatus').value, updated_at: new Date().toISOString() };
        if (!data.name) return toast('warning', 'Name required');
        try { if (s) await State.supabase.from('services').update(data).eq('id', s.id); else await State.supabase.from('services').insert({ ...data, created_at: new Date().toISOString() }); logActivity(s ? 'UPDATE SERVICE' : 'CREATE SERVICE', data.name); toast('success', 'Saved'); Modal.close(); await loadAllData(); renderServices(); }
        catch (err) { toast('error', 'Save failed', err.message); }
      });
    }
  });
}
function deleteService(id) {
  const s = State.cache.services.find(x => x.id === id); if (!s) return;
  confirmDialog({ title: 'Delete service?', message: `Delete "${s.name}"?`, onConfirm: async () => { try { await State.supabase.from('services').delete().eq('id', id); logActivity('DELETE SERVICE', s.name); toast('success', 'Deleted'); await loadAllData(); renderServices(); } catch (err) { toast('error', 'Failed', err.message); } } });
}

/* ============ WORK ============ */
function renderWorkList() {
  const search = ($('#workSearch')?.value || '').toLowerCase(); const filter = $('#workFilter')?.value || '';
  let list = State.cache.work.slice();
  if (search) list = list.filter(w => (w.title || '').toLowerCase().includes(search) || (w.category || '').toLowerCase().includes(search));
  if (filter) list = list.filter(w => w.status === filter);
  const el = $('#workList');
  if (!list.length) return el.innerHTML = '<div class="empty"><h4>No projects yet</h4><p>Add your first portfolio project.</p></div>';
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Preview</th><th>Title</th><th>Category</th><th>Project URL</th><th>Status</th><th>Order</th><th></th></tr></thead><tbody>${list.map(w => `<tr><td data-label="Preview"><div style="width:60px;height:40px;border-radius:4px;overflow:hidden;background:var(--surface-2);border:1px solid var(--border-fine)">${w.image_url ? `<img src="${escapeHTML(w.image_url)}" style="width:100%;height:100%;object-fit:cover">` : ''}</div></td><td data-label="Title"><strong>${escapeHTML(w.title || '')}</strong></td><td data-label="Category">${escapeHTML(w.category || '—')}</td><td data-label="URL">${w.project_url ? `<a href="${escapeHTML(w.project_url)}" target="_blank" style="color:var(--orange)">Open →</a>` : '—'}</td><td data-label="Status"><span class="pill pill-${escapeHTML(w.status || 'draft')}">${escapeHTML(w.status || 'draft')}</span></td><td data-label="Order">${w.display_order ?? '—'}</td><td data-label="Actions"><div class="td-actions"><button class="btn btn-xs btn-ghost" data-edit-work="${escapeHTML(w.id)}">Edit</button><button class="btn btn-xs btn-danger" data-del-work="${escapeHTML(w.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
  $$('[data-edit-work]', el).forEach(b => b.addEventListener('click', () => editWork(b.dataset.editWork)));
  $$('[data-del-work]', el).forEach(b => b.addEventListener('click', () => deleteWork(b.dataset.delWork)));
}
$('#workSearch').addEventListener('input', debounce(renderWorkList, 250));
$('#workFilter').addEventListener('change', renderWorkList);
$('#addWorkBtn').addEventListener('click', () => editWork(null));

function editWork(id) {
  const w = id ? State.cache.work.find(x => x.id === id) : null;
  Modal.open({
    title: w ? 'Edit Project' : 'Add Project', wide: true,
    sub: 'Project image is clickable on the public website and links to the Project URL.',
    body: `<div class="field mb"><label>Project Title <span class="req">*</span></label><input type="text" id="wTitle" value="${escapeHTML(w?.title || '')}"></div><div class="field-row mb"><div class="field"><label>Category</label><input type="text" id="wCategory" value="${escapeHTML(w?.category || '')}" placeholder="E-Commerce"></div><div class="field"><label>Year</label><input type="text" id="wYear" value="${escapeHTML(w?.year || '2026')}"></div></div><div class="field mb"><label>Short Description</label><textarea id="wShort" rows="2">${escapeHTML(w?.short_description || '')}</textarea></div><div class="field mb"><label>Full Description</label><textarea id="wFull" rows="4">${escapeHTML(w?.full_description || '')}</textarea></div><div class="field mb"><label>Tags</label><input type="text" id="wTags" value="${escapeHTML(w?.tags || '')}" placeholder="HTML, CSS, JavaScript"><span class="field-hint">Comma-separated.</span></div><div class="field mb"><label>Project URL <span class="req">*</span></label><input type="url" id="wUrl" value="${escapeHTML(w?.project_url || '')}" placeholder="https://example.com"><span class="field-hint">Where the project image links when clicked.</span></div><div class="field mb"><label>Project Image</label><input type="file" id="wImage" accept="image/png,image/jpeg,image/webp"><span class="field-hint">JPG, PNG, or WEBP. Max 5MB.</span><div id="wImagePreview" class="img-preview mt">${w?.image_url ? `<img src="${escapeHTML(w.image_url)}">` : '<div class="placeholder"><p>No image selected</p></div>'}</div></div><div class="field-row mb"><div class="field"><label>Order</label><input type="number" id="wOrder" value="${w?.display_order ?? (State.cache.work.length + 1)}"></div><div class="field"><label>Status</label><select id="wStatus"><option value="draft"${w?.status === 'draft' ? ' selected' : ''}>Draft</option><option value="published"${w?.status === 'published' ? ' selected' : ''}>Published</option><option value="archived"${w?.status === 'archived' ? ' selected' : ''}>Archived</option></select></div></div><div class="field mb"><label class="check"><input type="checkbox" id="wFeatured"${w?.featured ? ' checked' : ''}><span class="check-box"></span>Featured project</label></div><div class="divider"></div><div class="label" style="margin-bottom:0.6rem">Live Preview</div><div class="project-preview" id="wPreview"></div>`,
    foot: `<button class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save Project</button>`,
    onOpen: () => {
      updateWorkPreview(w);
      ['wTitle', 'wCategory', 'wShort', 'wUrl'].forEach(id => $('#' + id).addEventListener('input', () => updateWorkPreview(w)));
      $('#wImage').addEventListener('change', (e) => {
        const f = e.target.files[0]; if (!f) return;
        if (f.size > 5 * 1024 * 1024) return toast('warning', 'Too large', 'Max 5MB.');
        const r = new FileReader();
        r.onload = (ev) => { $('#wImagePreview').innerHTML = `<img src="${ev.target.result}">`; updateWorkPreview(w, ev.target.result); };
        r.readAsDataURL(f);
      });
      $('[data-cancel]').addEventListener('click', () => Modal.close());
      $('[data-save]').addEventListener('click', () => saveWork(w));
    }
  });
}

function updateWorkPreview(w, previewSrc) {
  const title = $('#wTitle')?.value || 'Project Title';
  const category = $('#wCategory')?.value || 'Category';
  const desc = $('#wShort')?.value || 'Short description';
  const img = previewSrc || w?.image_url;
  const el = $('#wPreview'); if (!el) return;
  el.innerHTML = `<div class="pv-img">${img ? `<img src="${escapeHTML(img)}">` : ''}</div><div class="pv-body"><div class="pv-cat">${escapeHTML(category)}</div><div class="pv-title">${escapeHTML(title)}</div><div class="pv-desc">${escapeHTML(desc)}</div><span class="pv-link">VIEW PROJECT →</span></div>`;
}

async function saveWork(existing) {
  const title = $('#wTitle').value.trim(); const projectUrl = $('#wUrl').value.trim();
  if (!title) return toast('warning', 'Title required');
  if (!projectUrl) return toast('warning', 'Project URL required');
  const data = { title, category: $('#wCategory').value.trim(), year: $('#wYear').value.trim(), short_description: $('#wShort').value.trim(), full_description: $('#wFull').value.trim(), tags: $('#wTags').value.trim(), project_url: projectUrl, display_order: parseInt($('#wOrder').value) || 0, status: $('#wStatus').value, featured: $('#wFeatured').checked, updated_at: new Date().toISOString() };
  const saveBtn = $('[data-save]'); saveBtn.disabled = true; const orig = saveBtn.textContent; saveBtn.textContent = 'Saving...';
  try {
    let imageUrl = existing?.image_url || null;
    const fileInput = $('#wImage');
    if (fileInput.files && fileInput.files[0]) {
      const f = fileInput.files[0]; const path = `portfolio/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: upErr } = await State.supabase.storage.from('portfolio').upload(path, f, { upsert: false, cacheControl: '3600' });
      if (upErr) { console.warn('upload failed:', upErr.message); toast('warning', 'Upload skipped', upErr.message); }
      else { const { data: pub } = State.supabase.storage.from('portfolio').getPublicUrl(path); imageUrl = pub?.publicUrl || imageUrl; }
    }
    if (imageUrl) data.image_url = imageUrl;
    if (existing) { await State.supabase.from('portfolio_projects').update(data).eq('id', existing.id); logActivity('UPDATE WORK', title); toast('success', 'Project updated', title); }
    else { data.created_at = new Date().toISOString(); await State.supabase.from('portfolio_projects').insert(data); logActivity('CREATE WORK', title); toast('success', 'Project added', title); }
    Modal.close(); await loadAllData(); renderWorkList();
  } catch (err) { toast('error', 'Save failed', err.message); }
  finally { saveBtn.disabled = false; saveBtn.textContent = orig; }
}

function deleteWork(id) {
  const w = State.cache.work.find(x => x.id === id); if (!w) return;
  confirmDialog({ title: 'Delete project?', message: `Delete "${w.title}"?`, onConfirm: async () => { try { await State.supabase.from('portfolio_projects').delete().eq('id', id); logActivity('DELETE WORK', w.title); toast('success', 'Deleted'); await loadAllData(); renderWorkList(); } catch (err) { toast('error', 'Failed', err.message); } } });
}

/* ============ REVIEWS ============ */
$$('.tab[data-rtab]').forEach(t => t.addEventListener('click', () => {
  $$('.tab[data-rtab]').forEach(x => x.classList.remove('active'));
  t.classList.add('active'); State.ui.reviewTab = t.dataset.rtab; renderReviews();
}));

function renderReviews() {
  const all = State.cache.reviews;
  const ar = all.filter(r => r.status === 'approved');
  const avg = ar.length ? ar.reduce((s, r) => s + (r.rating || 0), 0) / ar.length : 0;
  $('#reviewSummary').innerHTML = `<div><div class="score">${avg.toFixed(1)}<small>/5</small></div></div><div class="meta"><div class="stars" style="color:var(--orange)">${starsHTML(Math.round(avg))}</div><div class="label">Based on ${ar.length} approved review${ar.length === 1 ? '' : 's'}</div></div>`;
  $('#rCountPending').textContent = all.filter(r => r.status === 'pending').length;
  $('#rCountApproved').textContent = ar.length;
  $('#rCountRejected').textContent = all.filter(r => r.status === 'rejected').length;
  $('#rCountHidden').textContent = all.filter(r => r.status === 'hidden').length;
  const tab = State.ui.reviewTab;
  const list = all.filter(r => r.status === tab);
  const el = $('#reviewsList');
  if (!list.length) return el.innerHTML = `<div class="empty"><h4>No ${tab} reviews</h4></div>`;
  el.innerHTML = list.map(r => {
    const ini = (r.name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const av = r.photo_url ? `<div class="avatar lg"><img src="${escapeHTML(r.photo_url)}"></div>` : `<div class="avatar lg">${escapeHTML(ini)}</div>`;
    const actions = { pending: `<button class="btn btn-xs btn-success" data-approve="${escapeHTML(r.id)}">Approve</button><button class="btn btn-xs btn-danger" data-reject="${escapeHTML(r.id)}">Reject</button><button class="btn btn-xs btn-ghost" data-hide="${escapeHTML(r.id)}">Hide</button>`, approved: `<button class="btn btn-xs btn-ghost" data-hide="${escapeHTML(r.id)}">Hide</button><button class="btn btn-xs btn-danger" data-delete="${escapeHTML(r.id)}">Delete</button>`, rejected: `<button class="btn btn-xs btn-success" data-approve="${escapeHTML(r.id)}">Approve</button><button class="btn btn-xs btn-danger" data-delete="${escapeHTML(r.id)}">Delete</button>`, hidden: `<button class="btn btn-xs btn-success" data-approve="${escapeHTML(r.id)}">Approve</button><button class="btn btn-xs btn-danger" data-delete="${escapeHTML(r.id)}">Delete</button>` }[tab];
    return `<div class="card mb" style="display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap">${av}<div style="flex:1;min-width:200px"><div class="flex-between" style="align-items:flex-start"><div><strong>${escapeHTML(r.name || 'Anonymous')}</strong><div class="stars" style="margin:0.3rem 0">${starsHTML(r.rating || 0)}</div></div><div class="td-muted" style="font-size:0.72rem">${formatDate(r.created_at)}</div></div><p style="margin-top:0.5rem;color:var(--muted);font-size:0.85rem;line-height:1.7">${escapeHTML(r.comment || '')}</p>${r.business || r.location ? `<div class="td-muted" style="font-size:0.72rem;margin-top:0.5rem">${escapeHTML(r.business || '')}${r.business && r.location ? ' · ' : ''}${escapeHTML(r.location || '')}</div>` : ''}<div class="td-actions" style="justify-content:flex-start;margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border-fine)">${actions}</div></div></div>`;
  }).join('');
  $$('[data-approve]', el).forEach(b => b.addEventListener('click', () => setReviewStatus(b.dataset.approve, 'approved')));
  $$('[data-reject]', el).forEach(b => b.addEventListener('click', () => setReviewStatus(b.dataset.reject, 'rejected')));
  $$('[data-hide]', el).forEach(b => b.addEventListener('click', () => setReviewStatus(b.dataset.hide, 'hidden')));
  $$('[data-delete]', el).forEach(b => b.addEventListener('click', () => deleteReview(b.dataset.delete)));
}

async function setReviewStatus(id, status) {
  try { await State.supabase.from('reviews').update({ status, updated_at: new Date().toISOString() }).eq('id', id); logActivity('UPDATE REVIEW', `status:${status}`); toast('success', 'Review ' + status); await loadAllData(); renderReviews(); }
  catch (err) { toast('error', 'Update failed', err.message); }
}

function deleteReview(id) {
  confirmDialog({ title: 'Delete review?', message: 'This review will be permanently deleted.', onConfirm: async () => { try { await State.supabase.from('reviews').delete().eq('id', id); logActivity('DELETE REVIEW', id); toast('success', 'Deleted'); await loadAllData(); renderReviews(); } catch (err) { toast('error', 'Failed', err.message); } } });
}

/* ============ PRICING ============ */
function renderPricing() {
  const list = State.cache.pricing; const el = $('#pricingList');
  if (!list.length) return el.innerHTML = '<div class="empty"><h4>No pricing packages</h4></div>';
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Package</th><th>Price</th><th>Order</th><th>Status</th><th></th></tr></thead><tbody>${list.map(p => `<tr><td data-label="Package"><strong>${escapeHTML(p.name || '')}</strong></td><td data-label="Price">₹${escapeHTML(p.price || '')}</td><td data-label="Order">${p.display_order ?? '—'}</td><td data-label="Status"><span class="pill pill-${escapeHTML(p.status || 'draft')}">${escapeHTML(p.status || 'draft')}</span></td><td data-label="Actions"><div class="td-actions"><button class="btn btn-xs btn-ghost" data-edit-price="${escapeHTML(p.id)}">Edit</button><button class="btn btn-xs btn-danger" data-del-price="${escapeHTML(p.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
  $$('[data-edit-price]', el).forEach(b => b.addEventListener('click', () => editPricing(b.dataset.editPrice)));
  $$('[data-del-price]', el).forEach(b => b.addEventListener('click', () => deletePricing(b.dataset.delPrice)));
}
$('#addPricingBtn').addEventListener('click', () => editPricing(null));
function editPricing(id) {
  const p = id ? State.cache.pricing.find(x => x.id === id) : null;
  Modal.open({
    title: p ? 'Edit Package' : 'Add Package',
    body: `<div class="field mb"><label>Name</label><input type="text" id="prName" value="${escapeHTML(p?.name || '')}"></div><div class="field mb"><label>Price</label><input type="text" id="prPrice" value="${escapeHTML(p?.price || '')}" placeholder="1,999"></div><div class="field mb"><label>Description</label><textarea id="prDesc" rows="2">${escapeHTML(p?.description || '')}</textarea></div><div class="field mb"><label>Features (one per line)</label><textarea id="prFeatures" rows="5">${escapeHTML((p?.features || []).join('\n'))}</textarea></div><div class="field-row mb"><div class="field"><label>Order</label><input type="number" id="prOrder" value="${p?.display_order ?? (State.cache.pricing.length + 1)}"></div><div class="field"><label>Status</label><select id="prStatus"><option value="draft"${p?.status === 'draft' ? ' selected' : ''}>Draft</option><option value="published"${p?.status === 'published' ? ' selected' : ''}>Published</option></select></div></div>`,
    foot: `<button class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save</button>`,
    onOpen: () => {
      $('[data-cancel]').addEventListener('click', () => Modal.close());
      $('[data-save]').addEventListener('click', async () => {
        const data = { name: $('#prName').value.trim(), price: $('#prPrice').value.trim(), description: $('#prDesc').value.trim(), features: $('#prFeatures').value.split('\n').map(s => s.trim()).filter(Boolean), display_order: parseInt($('#prOrder').value) || 0, status: $('#prStatus').value, updated_at: new Date().toISOString() };
        if (!data.name) return toast('warning', 'Name required');
        try { if (p) await State.supabase.from('pricing_packages').update(data).eq('id', p.id); else await State.supabase.from('pricing_packages').insert({ ...data, created_at: new Date().toISOString() }); logActivity(p ? 'UPDATE PRICING' : 'CREATE PRICING', data.name); toast('success', 'Saved'); Modal.close(); await loadAllData(); renderPricing(); }
        catch (err) { toast('error', 'Failed', err.message); }
      });
    }
  });
}
function deletePricing(id) {
  const p = State.cache.pricing.find(x => x.id === id); if (!p) return;
  confirmDialog({ title: 'Delete package?', message: `Delete "${p.name}"?`, onConfirm: async () => { try { await State.supabase.from('pricing_packages').delete().eq('id', id); logActivity('DELETE PRICING', p.name); toast('success', 'Deleted'); await loadAllData(); renderPricing(); } catch (err) { toast('error', 'Failed', err.message); } } });
}

/* ============ FAQ ============ */
function renderFaq() {
  const list = State.cache.faq; const el = $('#faqList');
  if (!list.length) return el.innerHTML = '<div class="empty"><h4>No FAQs</h4></div>';
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Question</th><th>Order</th><th>Status</th><th></th></tr></thead><tbody>${list.map(f => `<tr><td data-label="Question"><strong>${escapeHTML(f.question || '')}</strong></td><td data-label="Order">${f.display_order ?? '—'}</td><td data-label="Status"><span class="pill pill-${escapeHTML(f.status || 'draft')}">${escapeHTML(f.status || 'draft')}</span></td><td data-label="Actions"><div class="td-actions"><button class="btn btn-xs btn-ghost" data-edit-faq="${escapeHTML(f.id)}">Edit</button><button class="btn btn-xs btn-danger" data-del-faq="${escapeHTML(f.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
  $$('[data-edit-faq]', el).forEach(b => b.addEventListener('click', () => editFaq(b.dataset.editFaq)));
  $$('[data-del-faq]', el).forEach(b => b.addEventListener('click', () => deleteFaq(b.dataset.delFaq)));
}
$('#addFaqBtn').addEventListener('click', () => editFaq(null));
function editFaq(id) {
  const f = id ? State.cache.faq.find(x => x.id === id) : null;
  Modal.open({
    title: f ? 'Edit FAQ' : 'Add FAQ',
    body: `<div class="field mb"><label>Question</label><input type="text" id="fqQ" value="${escapeHTML(f?.question || '')}"></div><div class="field mb"><label>Answer</label><textarea id="fqA" rows="4">${escapeHTML(f?.answer || '')}</textarea></div><div class="field-row mb"><div class="field"><label>Order</label><input type="number" id="fqOrder" value="${f?.display_order ?? (State.cache.faq.length + 1)}"></div><div class="field"><label>Status</label><select id="fqStatus"><option value="draft"${f?.status === 'draft' ? ' selected' : ''}>Draft</option><option value="published"${f?.status === 'published' ? ' selected' : ''}>Published</option></select></div></div>`,
    foot: `<button class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save</button>`,
    onOpen: () => {
      $('[data-cancel]').addEventListener('click', () => Modal.close());
      $('[data-save]').addEventListener('click', async () => {
        const data = { question: $('#fqQ').value.trim(), answer: $('#fqA').value.trim(), display_order: parseInt($('#fqOrder').value) || 0, status: $('#fqStatus').value, updated_at: new Date().toISOString() };
        if (!data.question) return toast('warning', 'Question required');
        try { if (f) await State.supabase.from('faqs').update(data).eq('id', f.id); else await State.supabase.from('faqs').insert({ ...data, created_at: new Date().toISOString() }); logActivity(f ? 'UPDATE FAQ' : 'CREATE FAQ', data.question); toast('success', 'Saved'); Modal.close(); await loadAllData(); renderFaq(); }
        catch (err) { toast('error', 'Failed', err.message); }
      });
    }
  });
}
function deleteFaq(id) {
  const f = State.cache.faq.find(x => x.id === id); if (!f) return;
  confirmDialog({ title: 'Delete FAQ?', message: `Delete "${f.question}"?`, onConfirm: async () => { try { await State.supabase.from('faqs').delete().eq('id', id); logActivity('DELETE FAQ', f.question); toast('success', 'Deleted'); await loadAllData(); renderFaq(); } catch (err) { toast('error', 'Failed', err.message); } } });
}

/* ============ SEO ============ */
$$('[data-save-seo]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const status = btn.dataset.saveSeo;
    const data = { site_title: $('#seoTitle').value.trim(), meta_description: $('#seoDescription').value.trim(), canonical: $('#seoCanonical').value.trim(), og_title: $('#seoOgTitle').value.trim(), og_image: $('#seoOgImage').value.trim(), robots: $('#seoRobots').value, status, updated_at: new Date().toISOString() };
    try {
      const { data: ex } = await State.supabase.from('seo_settings').select('id').maybeSingle();
      if (ex) await State.supabase.from('seo_settings').update(data).eq('id', ex.id);
      else await State.supabase.from('seo_settings').insert({ ...data, created_at: new Date().toISOString() });
      logActivity('UPDATE SEO', 'global', status); toast('success', status === 'published' ? 'Published' : 'Draft saved');
    } catch (err) { toast('error', 'Failed', err.message); }
  });
});

function renderSeoPages() {
  const list = State.cache.seoPages.filter(s => s.status !== 'pending'); const el = $('#seoPagesList');
  if (!list.length) return el.innerHTML = '<div class="empty"><h4>No SEO pages</h4></div>';
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Path</th><th>Title</th><th>Status</th><th></th></tr></thead><tbody>${list.map(s => `<tr><td data-label="Path"><code>${escapeHTML(s.path || s.slug || '')}</code></td><td data-label="Title">${escapeHTML(s.title || '')}</td><td data-label="Status"><span class="pill pill-${escapeHTML(s.status || 'draft')}">${escapeHTML(s.status || 'draft')}</span></td><td data-label="Actions"><div class="td-actions"><button class="btn btn-xs btn-danger" data-del-seo="${escapeHTML(s.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
  $$('[data-del-seo]', el).forEach(b => b.addEventListener('click', () => {
    confirmDialog({ title: 'Delete SEO page?', message: 'This page will be deleted.', onConfirm: async () => { await State.supabase.from('seo_pages').delete().eq('id', b.dataset.delSeo); toast('success', 'Deleted'); await loadAllData(); renderSeoPages(); } });
  }));
}

$('#addSeoPageBtn').addEventListener('click', () => {
  Modal.open({
    title: 'Add SEO Page',
    body: `<div class="field mb"><label>Path</label><input type="text" id="spPath" placeholder="/services/web-development"></div><div class="field mb"><label>Title</label><input type="text" id="spTitle"></div><div class="field mb"><label>Description</label><textarea id="spDesc" rows="2"></textarea></div><div class="field mb"><label class="check"><input type="checkbox" id="spNoindex"><span class="check-box"></span>Noindex</label></div>`,
    foot: `<button class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save</button>`,
    onOpen: () => {
      $('[data-cancel]').addEventListener('click', () => Modal.close());
      $('[data-save]').addEventListener('click', async () => {
        const data = { path: $('#spPath').value.trim(), title: $('#spTitle').value.trim(), description: $('#spDesc').value.trim(), noindex: $('#spNoindex').checked, status: 'draft', updated_at: new Date().toISOString(), created_at: new Date().toISOString() };
        if (!data.path) return toast('warning', 'Path required');
        try { await State.supabase.from('seo_pages').insert(data); logActivity('CREATE SEO PAGE', data.path); toast('success', 'Added'); Modal.close(); await loadAllData(); renderSeoPages(); }
        catch (err) { toast('error', 'Failed', err.message); }
      });
    }
  });
});

/* ============ LOCATIONS ============ */
function renderLocations() {
  const list = State.cache.locations; const el = $('#locationsList');
  if (!list.length) return el.innerHTML = '<div class="empty"><h4>No locations</h4></div>';
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Slug</th><th>Status</th><th></th></tr></thead><tbody>${list.map(l => `<tr><td data-label="Name"><strong>${escapeHTML(l.name || '')}</strong></td><td data-label="Slug"><code>${escapeHTML(l.slug || '')}</code></td><td data-label="Status"><span class="pill pill-${escapeHTML(l.status || 'published')}">${escapeHTML(l.status || 'published')}</span></td><td data-label="Actions"><div class="td-actions"><button class="btn btn-xs btn-ghost" data-edit-loc="${escapeHTML(l.id)}">Edit</button><button class="btn btn-xs btn-danger" data-del-loc="${escapeHTML(l.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
  $$('[data-edit-loc]', el).forEach(b => b.addEventListener('click', () => editLocation(b.dataset.editLoc)));
  $$('[data-del-loc]', el).forEach(b => b.addEventListener('click', () => deleteLocation(b.dataset.delLoc)));
}
$('#addLocationBtn').addEventListener('click', () => editLocation(null));
function editLocation(id) {
  const l = id ? State.cache.locations.find(x => x.id === id) : null;
  Modal.open({
    title: l ? 'Edit Location' : 'Add Location',
    body: `<div class="field mb"><label>Name</label><input type="text" id="loName" value="${escapeHTML(l?.name || '')}"></div><div class="field mb"><label>Slug</label><input type="text" id="loSlug" value="${escapeHTML(l?.slug || '')}" placeholder="tirupur"></div><div class="field mb"><label>SEO Title</label><input type="text" id="loTitle" value="${escapeHTML(l?.seo_title || '')}"></div><div class="field mb"><label>Meta Description</label><textarea id="loDesc" rows="2">${escapeHTML(l?.meta_description || '')}</textarea></div>`,
    foot: `<button class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save</button>`,
    onOpen: () => {
      $('[data-cancel]').addEventListener('click', () => Modal.close());
      $('[data-save]').addEventListener('click', async () => {
        const data = { name: $('#loName').value.trim(), slug: $('#loSlug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'), seo_title: $('#loTitle').value.trim(), meta_description: $('#loDesc').value.trim(), status: 'published', updated_at: new Date().toISOString() };
        if (!data.name || !data.slug) return toast('warning', 'Name and slug required');
        try { if (l) await State.supabase.from('locations').update(data).eq('id', l.id); else await State.supabase.from('locations').insert({ ...data, created_at: new Date().toISOString() }); logActivity(l ? 'UPDATE LOCATION' : 'CREATE LOCATION', data.name); toast('success', 'Saved'); Modal.close(); await loadAllData(); renderLocations(); }
        catch (err) { toast('error', 'Failed', err.message); }
      });
    }
  });
}
function deleteLocation(id) {
  const l = State.cache.locations.find(x => x.id === id); if (!l) return;
  confirmDialog({ title: 'Delete location?', message: `Delete "${l.name}"?`, onConfirm: async () => { try { await State.supabase.from('locations').delete().eq('id', id); logActivity('DELETE LOCATION', l.name); toast('success', 'Deleted'); await loadAllData(); renderLocations(); } catch (err) { toast('error', 'Failed', err.message); } } });
}

/* END OF PART A — Part B continues below in same file */
/* ============ PROGRAMMATIC SEO ============ */
/* ============ PROGRAMMATIC SEO ============ */
$('#pgGenerateBtn').addEventListener('click', () => {
  const service = $('#pgService').value.trim(); const location = $('#pgLocation').value.trim();
  const business = $('#pgBusiness').value.trim(); const intent = $('#pgIntent').value.trim();
  if (!service || !location) return toast('warning', 'Service and Location required');
  const title = `${intent ? intent + ' — ' : ''}${service} in ${location}${business ? ' for ' + business : ''}`;
  const slug = [service, location, business, intent].filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '-');
  $('#pgCandidates').innerHTML = `<div class="card" style="padding:1rem"><div class="flex-between mb"><div><strong>${escapeHTML(title)}</strong><div class="td-muted" style="font-size:0.75rem">/${escapeHTML(slug)}</div></div></div><div class="td-actions"><button class="btn btn-xs btn-ghost" id="pgDiscard">Discard</button><button class="btn btn-xs btn-primary" id="pgQueue">Queue for Approval</button></div></div>`;
  $('#pgDiscard').addEventListener('click', () => { $('#pgCandidates').innerHTML = ''; });
  $('#pgQueue').addEventListener('click', async () => {
    const data = { title, slug, path: '/' + slug, service, location, business_type: business, search_intent: intent, status: 'pending', created_at: new Date().toISOString() };
    try { await State.supabase.from('seo_pages').insert(data); logActivity('CREATE SEO CANDIDATE', slug); toast('success', 'Queued'); $('#pgCandidates').innerHTML = ''; await loadAllData(); renderPendingPg(); }
    catch (err) { toast('error', 'Failed', err.message); }
  });
});

function renderPendingPg() {
  const list = State.cache.seoPages.filter(s => s.status === 'pending'); const el = $('#pgPending');
  if (!el) return;
  if (!list.length) return el.innerHTML = '<div class="empty" style="padding:1.5rem 1rem"><p>No pending candidates.</p></div>';
  el.innerHTML = list.map(s => `<div class="info-row"><div><strong>${escapeHTML(s.title || s.slug || '')}</strong><div class="td-muted" style="font-size:0.72rem">/${escapeHTML(s.slug || '')}</div></div><div class="td-actions"><button class="btn btn-xs btn-success" data-pg-approve="${escapeHTML(s.id)}">Approve</button><button class="btn btn-xs btn-danger" data-pg-reject="${escapeHTML(s.id)}">Reject</button></div></div>`).join('');
  $$('[data-pg-approve]', el).forEach(b => b.addEventListener('click', async () => { await State.supabase.from('seo_pages').update({ status: 'published' }).eq('id', b.dataset.pgApprove); toast('success', 'Published'); await loadAllData(); renderPendingPg(); }));
  $$('[data-pg-reject]', el).forEach(b => b.addEventListener('click', async () => { await State.supabase.from('seo_pages').delete().eq('id', b.dataset.pgReject); toast('info', 'Rejected'); await loadAllData(); renderPendingPg(); }));
                                                                                                                                                               }
/* ============ LEADS CRM ============ */
$('#leadsSearch').addEventListener('input', debounce(renderLeads, 250));
$('#leadsFilter').addEventListener('change', renderLeads);

function renderLeads() {
  const search = ($('#leadsSearch')?.value || '').toLowerCase();
  const filter = $('#leadsFilter')?.value || '';
  let list = State.cache.leads.slice();
  if (search) list = list.filter(l => (l.name || '').toLowerCase().includes(search) || (l.business || '').toLowerCase().includes(search) || (l.email || '').toLowerCase().includes(search));
  if (filter) list = list.filter(l => l.status === filter);
  const el = $('#leadsList');
  if (!list.length) return el.innerHTML = '<div class="empty"><h4>No leads found</h4><p>Leads appear here. Only admins can view them.</p></div>';
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Business</th><th>Service</th><th>Budget</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>${list.slice(0, 100).map(l => `<tr><td data-label="Name"><strong>${escapeHTML(l.name || '')}</strong><div class="td-muted">${escapeHTML(l.whatsapp || '')}</div></td><td data-label="Business">${escapeHTML(l.business || '—')}</td><td data-label="Service">${escapeHTML(l.service || '—')}</td><td data-label="Budget">${escapeHTML(l.budget || '—')}</td><td data-label="Status"><span class="pill pill-${escapeHTML((l.status || 'new').replace('-', ''))}">${escapeHTML(l.status || 'new')}</span></td><td data-label="Date" class="td-muted">${formatDate(l.created_at)}</td><td data-label="Actions"><div class="td-actions"><button class="btn btn-xs btn-ghost" data-view-lead="${escapeHTML(l.id)}">View</button></div></td></tr>`).join('')}</tbody></table></div>`;
  $$('[data-view-lead]', el).forEach(b => b.addEventListener('click', () => viewLead(b.dataset.viewLead)));
}

function viewLead(id) {
  const l = State.cache.leads.find(x => x.id === id); if (!l) return;
  Modal.open({
    title: l.name || 'Lead', sub: l.business || '', wide: true,
    body: `<div class="editor-grid"><div class="field"><label>Name</label><input type="text" value="${escapeHTML(l.name || '')}" readonly></div><div class="field"><label>Business</label><input type="text" value="${escapeHTML(l.business || '')}" readonly></div><div class="field"><label>WhatsApp</label><input type="text" value="${escapeHTML(l.whatsapp || '')}" readonly></div><div class="field"><label>Email</label><input type="text" value="${escapeHTML(l.email || '')}" readonly></div><div class="field"><label>Location</label><input type="text" value="${escapeHTML(l.location || '')}" readonly></div><div class="field"><label>Service</label><input type="text" value="${escapeHTML(l.service || '')}" readonly></div><div class="field"><label>Budget</label><input type="text" value="${escapeHTML(l.budget || '')}" readonly></div><div class="field"><label>Timeline</label><input type="text" value="${escapeHTML(l.timeline || '')}" readonly></div><div class="field" style="grid-column:1/-1"><label>Requirements</label><textarea readonly>${escapeHTML(l.requirements || '')}</textarea></div><div class="field" style="grid-column:1/-1"><label>Internal Notes</label><textarea id="leadNotes">${escapeHTML(l.notes || '')}</textarea></div></div><div class="field mt"><label>Status</label><select id="leadStatus">${['new', 'contacted', 'qualified', 'quotation', 'negotiation', 'won', 'lost', 'follow-up'].map(s => `<option value="${s}"${l.status === s ? ' selected' : ''}>${s}</option>`).join('')}</select></div>`,
    foot: `<button class="btn btn-ghost" data-cancel>Close</button><button class="btn btn-danger" data-delete>Delete</button><button class="btn btn-primary" data-save>Save</button>`,
    onOpen: () => {
      $('[data-cancel]').addEventListener('click', () => Modal.close());
      $('[data-save]').addEventListener('click', async () => {
        try { await State.supabase.from('leads').update({ status: $('#leadStatus').value, notes: $('#leadNotes').value.trim(), updated_at: new Date().toISOString() }).eq('id', l.id); logActivity('UPDATE LEAD', l.name); toast('success', 'Updated'); Modal.close(); await loadAllData(); renderLeads(); }
        catch (err) { toast('error', 'Failed', err.message); }
      });
      $('[data-delete]').addEventListener('click', () => {
        confirmDialog({ title: 'Delete lead?', message: `Delete "${l.name}"?`, onConfirm: async () => { await State.supabase.from('leads').delete().eq('id', l.id); logActivity('DELETE LEAD', l.name); toast('success', 'Deleted'); Modal.close(); await loadAllData(); renderLeads(); } });
      });
    }
  });
}

$('#addLeadBtn').addEventListener('click', () => {
  Modal.open({
    title: 'Add Lead',
    body: `<div class="field-row mb"><div class="field"><label>Name</label><input type="text" id="ldName"></div><div class="field"><label>Business</label><input type="text" id="ldBusiness"></div></div><div class="field-row mb"><div class="field"><label>WhatsApp</label><input type="tel" id="ldWhatsapp"></div><div class="field"><label>Email</label><input type="email" id="ldEmail"></div></div><div class="field-row mb"><div class="field"><label>Location</label><input type="text" id="ldLocation"></div><div class="field"><label>Service</label><input type="text" id="ldService"></div></div><div class="field-row mb"><div class="field"><label>Budget</label><input type="text" id="ldBudget"></div><div class="field"><label>Timeline</label><input type="text" id="ldTimeline"></div></div><div class="field mb"><label>Requirements</label><textarea id="ldReq" rows="3"></textarea></div>`,
    foot: `<button class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save</button>`,
    onOpen: () => {
      $('[data-cancel]').addEventListener('click', () => Modal.close());
      $('[data-save]').addEventListener('click', async () => {
        const data = { name: $('#ldName').value.trim(), business: $('#ldBusiness').value.trim(), whatsapp: $('#ldWhatsapp').value.trim(), email: $('#ldEmail').value.trim(), location: $('#ldLocation').value.trim(), service: $('#ldService').value.trim(), budget: $('#ldBudget').value.trim(), timeline: $('#ldTimeline').value.trim(), requirements: $('#ldReq').value.trim(), status: 'new', source: 'admin', created_at: new Date().toISOString() };
        if (!data.name) return toast('warning', 'Name required');
        try { await State.supabase.from('leads').insert(data); logActivity('CREATE LEAD', data.name); toast('success', 'Added'); Modal.close(); await loadAllData(); renderLeads(); }
        catch (err) { toast('error', 'Failed', err.message); }
      });
    }
  });
});
/* ============ PROJECTS ============ */
function renderProjects() {
  const list = State.cache.projects; const el = $('#projectsList');
  if (!list.length) return el.innerHTML = '<div class="empty"><h4>No projects</h4><p>Track active client projects.</p></div>';
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Project</th><th>Client</th><th>Status</th><th>Deadline</th><th></th></tr></thead><tbody>${list.map(p => `<tr><td data-label="Project"><strong>${escapeHTML(p.name || '')}</strong></td><td data-label="Client">${escapeHTML(p.client || '—')}</td><td data-label="Status"><span class="pill pill-${escapeHTML((p.status || 'planning').replace('-', ''))}">${escapeHTML(p.status || 'planning')}</span></td><td data-label="Deadline" class="td-muted">${formatDate(p.deadline)}</td><td data-label="Actions"><div class="td-actions"><button class="btn btn-xs btn-ghost" data-edit-proj="${escapeHTML(p.id)}">Edit</button><button class="btn btn-xs btn-danger" data-del-proj="${escapeHTML(p.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
  $$('[data-edit-proj]', el).forEach(b => b.addEventListener('click', () => editProject(b.dataset.editProj)));
  $$('[data-del-proj]', el).forEach(b => b.addEventListener('click', () => deleteProject(b.dataset.delProj)));
}
$('#addProjectBtn').addEventListener('click', () => editProject(null));
function editProject(id) {
  const p = id ? State.cache.projects.find(x => x.id === id) : null;
  Modal.open({
    title: p ? 'Edit Project' : 'Add Project',
    body: `<div class="field mb"><label>Project Name</label><input type="text" id="pjName" value="${escapeHTML(p?.name || '')}"></div><div class="field mb"><label>Client</label><input type="text" id="pjClient" value="${escapeHTML(p?.client || '')}"></div><div class="field mb"><label>Service</label><input type="text" id="pjService" value="${escapeHTML(p?.service || '')}"></div><div class="field-row mb"><div class="field"><label>Start Date</label><input type="date" id="pjStart" value="${p?.start_date || ''}"></div><div class="field"><label>Deadline</label><input type="date" id="pjDeadline" value="${p?.deadline || ''}"></div></div><div class="field-row mb"><div class="field"><label>Budget</label><input type="text" id="pjBudget" value="${escapeHTML(p?.budget || '')}"></div><div class="field"><label>Status</label><select id="pjStatus">${['planning', 'design', 'development', 'testing', 'client-review', 'completed', 'on-hold', 'cancelled'].map(s => `<option value="${s}"${p?.status === s ? ' selected' : ''}>${s}</option>`).join('')}</select></div></div><div class="field mb"><label>Notes</label><textarea id="pjNotes" rows="3">${escapeHTML(p?.notes || '')}</textarea></div>`,
    foot: `<button class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save</button>`,
    onOpen: () => {
      $('[data-cancel]').addEventListener('click', () => Modal.close());
      $('[data-save]').addEventListener('click', async () => {
        const data = { name: $('#pjName').value.trim(), client: $('#pjClient').value.trim(), service: $('#pjService').value.trim(), start_date: $('#pjStart').value || null, deadline: $('#pjDeadline').value || null, budget: $('#pjBudget').value.trim(), status: $('#pjStatus').value, notes: $('#pjNotes').value.trim(), updated_at: new Date().toISOString() };
        if (!data.name) return toast('warning', 'Name required');
        try { if (p) await State.supabase.from('business_projects').update(data).eq('id', p.id); else await State.supabase.from('business_projects').insert({ ...data, created_at: new Date().toISOString() }); logActivity(p ? 'UPDATE PROJECT' : 'CREATE PROJECT', data.name); toast('success', 'Saved'); Modal.close(); await loadAllData(); renderProjects(); }
        catch (err) { toast('error', 'Failed', err.message); }
      });
    }
  });
}
function deleteProject(id) {
  const p = State.cache.projects.find(x => x.id === id); if (!p) return;
  confirmDialog({ title: 'Delete project?', message: `Delete "${p.name}"?`, onConfirm: async () => { try { await State.supabase.from('business_projects').delete().eq('id', id); logActivity('DELETE PROJECT', p.name); toast('success', 'Deleted'); await loadAllData(); renderProjects(); } catch (err) { toast('error', 'Failed', err.message); } } });
}

/* ============ QUOTES ============ */
function renderQuotes() {
  const list = State.cache.quotes; const el = $('#quotesList');
  if (!list.length) return el.innerHTML = '<div class="empty"><h4>No quotes</h4></div>';
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Client</th><th>Total</th><th>Status</th><th>Valid Until</th><th></th></tr></thead><tbody>${list.map(q => `<tr><td data-label="Client"><strong>${escapeHTML(q.client || '')}</strong></td><td data-label="Total">₹${escapeHTML(q.total || '0')}</td><td data-label="Status"><span class="pill pill-${escapeHTML(q.status || 'draft')}">${escapeHTML(q.status || 'draft')}</span></td><td data-label="Valid" class="td-muted">${formatDate(q.valid_until)}</td><td data-label="Actions"><div class="td-actions"><button class="btn btn-xs btn-ghost" data-edit-quote="${escapeHTML(q.id)}">Edit</button><button class="btn btn-xs btn-danger" data-del-quote="${escapeHTML(q.id)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
  $$('[data-edit-quote]', el).forEach(b => b.addEventListener('click', () => editQuote(b.dataset.editQuote)));
  $$('[data-del-quote]', el).forEach(b => b.addEventListener('click', () => deleteQuote(b.dataset.delQuote)));
}
$('#addQuoteBtn').addEventListener('click', () => editQuote(null));
function editQuote(id) {
  const q = id ? State.cache.quotes.find(x => x.id === id) : null;
  Modal.open({
    title: q ? 'Edit Quote' : 'Add Quote',
    body: `<div class="field-row mb"><div class="field"><label>Client</label><input type="text" id="qtClient" value="${escapeHTML(q?.client || '')}"></div><div class="field"><label>Project</label><input type="text" id="qtProject" value="${escapeHTML(q?.project || '')}"></div></div><div class="field mb"><label>Items / Description</label><textarea id="qtItems" rows="4">${escapeHTML(q?.items || '')}</textarea></div><div class="field-row mb"><div class="field"><label>Subtotal</label><input type="text" id="qtSubtotal" value="${escapeHTML(q?.subtotal || '')}"></div><div class="field"><label>Discount</label><input type="text" id="qtDiscount" value="${escapeHTML(q?.discount || '')}"></div></div><div class="field-row mb"><div class="field"><label>Total</label><input type="text" id="qtTotal" value="${escapeHTML(q?.total || '')}"></div><div class="field"><label>Valid Until</label><input type="date" id="qtValid" value="${q?.valid_until || ''}"></div></div><div class="field mb"><label>Status</label><select id="qtStatus">${['draft', 'sent', 'accepted', 'rejected', 'expired'].map(s => `<option value="${s}"${q?.status === s ? ' selected' : ''}>${s}</option>`).join('')}</select></div><div class="field mb"><label>Notes</label><textarea id="qtNotes" rows="3">${escapeHTML(q?.notes || '')}</textarea></div>`,
    foot: `<button class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-primary" data-save>Save</button>`,
    onOpen: () => {
      $('[data-cancel]').addEventListener('click', () => Modal.close());
      $('[data-save]').addEventListener('click', async () => {
        const data = { client: $('#qtClient').value.trim(), project: $('#qtProject').value.trim(), items: $('#qtItems').value.trim(), subtotal: $('#qtSubtotal').value.trim(), discount: $('#qtDiscount').value.trim(), total: $('#qtTotal').value.trim(), valid_until: $('#qtValid').value || null, status: $('#qtStatus').value, notes: $('#qtNotes').value.trim(), updated_at: new Date().toISOString() };
        if (!data.client) return toast('warning', 'Client required');
        try { if (q) await State.supabase.from('quotes').update(data).eq('id', q.id); else await State.supabase.from('quotes').insert({ ...data, created_at: new Date().toISOString() }); logActivity(q ? 'UPDATE QUOTE' : 'CREATE QUOTE', data.client); toast('success', 'Saved'); Modal.close(); await loadAllData(); renderQuotes(); }
        catch (err) { toast('error', 'Failed', err.message); }
      });
    }
  });
}
function deleteQuote(id) {
  const q = State.cache.quotes.find(x => x.id === id); if (!q) return;
  confirmDialog({ title: 'Delete quote?', message: `Delete quote for "${q.client}"?`, onConfirm: async () => { try { await State.supabase.from('quotes').delete().eq('id', id); logActivity('DELETE QUOTE', q.client); toast('success', 'Deleted'); await loadAllData(); renderQuotes(); } catch (err) { toast('error', 'Failed', err.message); } } });
     }
/* ============ MEDIA LIBRARY ============ */
function renderMedia() {
  const list = State.cache.media; const el = $('#mediaList');
  if (!list.length) return el.innerHTML = '<div class="empty"><h4>No media</h4><p>Upload your first image.</p></div>';
  el.innerHTML = `<div class="media-grid">${list.map(m => `<div class="media-item" data-media-id="${escapeHTML(m.id)}"><div class="media-thumb">${m.url ? `<img src="${escapeHTML(m.url)}" loading="lazy">` : ''}</div><div class="media-info"><div class="media-name">${escapeHTML(m.filename || 'image')}</div><div class="media-meta">${formatDate(m.created_at)}</div></div></div>`).join('')}</div>`;
  $$('[data-media-id]', el).forEach(x => x.addEventListener('click', () => {
    const m = State.cache.media.find(y => y.id === x.dataset.mediaId); if (!m) return;
    Modal.open({
      title: m.filename || 'Image',
      body: `<div class="img-preview mb">${m.url ? `<img src="${escapeHTML(m.url)}">` : ''}</div><div class="info-row"><span class="k">Bucket</span><span class="v">${escapeHTML(m.bucket || '')}</span></div><div class="info-row"><span class="k">Path</span><span class="v" style="word-break:break-all">${escapeHTML(m.path || '')}</span></div><div class="info-row"><span class="k">URL</span><span class="v" style="word-break:break-all"><a href="${escapeHTML(m.url)}" target="_blank" style="color:var(--orange)">Open →</a></span></div>`,
      foot: `<button class="btn btn-ghost" data-cancel>Close</button><button class="btn btn-danger" data-del>Delete</button>`,
      onOpen: () => {
        $('[data-cancel]').addEventListener('click', () => Modal.close());
        $('[data-del]').addEventListener('click', () => {
          confirmDialog({ title: 'Delete image?', message: `Delete "${m.filename}"?`, onConfirm: async () => {
            try {
              await State.supabase.storage.from(m.bucket).remove([m.path]);
              await State.supabase.from('media').delete().eq('id', m.id);
              logActivity('DELETE MEDIA', m.filename); toast('success', 'Deleted'); Modal.close(); await loadAllData(); renderMedia();
            } catch (err) { toast('error', 'Failed', err.message); }
          } });
        });
      }
    });
  }));
}

$('#mediaUpload').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []); if (!files.length) return;
  for (const f of files) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) { toast('warning', 'Invalid file', f.name); continue; }
    if (f.size > 5 * 1024 * 1024) { toast('warning', 'Too large', f.name); continue; }
    try {
      const path = `media/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: upErr } = await State.supabase.storage.from('media').upload(path, f, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = State.supabase.storage.from('media').getPublicUrl(path);
      await State.supabase.from('media').insert({ filename: f.name, path, url: pub.publicUrl, bucket: 'media', size: f.size, type: f.type, created_at: new Date().toISOString() });
    } catch (err) { toast('error', 'Upload failed', err.message); }
  }
  toast('success', 'Upload complete'); await loadAllData(); renderMedia();
});

/* ============ ACTIVITY LOG ============ */
function renderActivity() {
  const list = State.cache.activity; const el = $('#activityList');
  if (!list.length) return el.innerHTML = '<div class="empty"><h4>No activity yet</h4></div>';
  el.innerHTML = `<div class="card">${list.map(a => `<div class="info-row"><div><div style="font-weight:500">${escapeHTML(a.action || '')}</div><div class="td-muted">${escapeHTML(a.user_email || '')} · ${escapeHTML(a.resource || '')}</div></div><div class="td-muted" style="font-size:0.72rem">${formatDateTime(a.created_at)}</div></div>`).join('')}</div>`;
}

/* ============ SETTINGS ============ */
$('#saveSettingsBtn').addEventListener('click', async () => {
  const data = {
    site_name: $('#setSiteName').value.trim(),
    founder_name: $('#setFounderName').value.trim(),
    address: $('#setAddress').value.trim(),
    whatsapp: $('#setWhatsapp').value.trim(),
    email: $('#setEmail').value.trim(),
    maintenance: $('#setMaintenance').checked,
    updated_at: new Date().toISOString()
  };
  try {
    if (State.supabase) {
      const { data: ex } = await State.supabase.from('site_settings').select('id').eq('section', 'global').maybeSingle();
      if (ex) await State.supabase.from('site_settings').update({ content: data }).eq('id', ex.id);
      else await State.supabase.from('site_settings').insert({ section: 'global', content: data, status: 'published', created_at: new Date().toISOString() });
    }
    logActivity('UPDATE SETTINGS', 'global');
    toast('success', 'Settings saved');
  } catch (err) { toast('error', 'Save failed', err.message); }
});

$('#clearLocalDataBtn').addEventListener('click', () => {
  confirmDialog({
    title: 'Clear local data?',
    message: 'This clears your locally saved Supabase URL and key. You will need to sign in again.',
    onConfirm: async () => {
      localStorage.removeItem('noctis_supa_url');
      localStorage.removeItem('noctis_supa_key');
      toast('info', 'Local data cleared');
      if (State.supabase) { try { await State.supabase.auth.signOut(); } catch (e) {} }
      setTimeout(() => location.reload(), 800);
    }
  });
});

/* ============ SECURITY ============ */
$('#changePasswordBtn').addEventListener('click', () => {
  Modal.open({
    title: 'Change Password',
    body: `<p class="muted" style="font-size:0.88rem;line-height:1.7;margin-bottom:1.25rem">We'll send a password reset link to your registered email address.</p><div class="field"><label>Email</label><input type="email" id="cpEmail" value="${escapeHTML(State.user?.email || '')}" readonly></div>`,
    foot: `<button class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-primary" data-send>Send Reset Link</button>`,
    onOpen: () => {
      $('[data-cancel]').addEventListener('click', () => Modal.close());
      $('[data-send]').addEventListener('click', async () => {
        try {
          const { error } = await State.supabase.auth.resetPasswordForEmail(State.user.email);
          if (error) throw error;
          toast('success', 'Reset email sent', 'Check your inbox.');
          Modal.close();
        } catch (err) { toast('error', 'Failed', err.message); }
      });
    }
  });
});

$('#logoutAllBtn').addEventListener('click', () => {
  confirmDialog({
    title: 'Sign out all sessions?',
    message: 'You will be signed out from every device.',
    confirmLabel: 'Sign Out All',
    onConfirm: async () => {
      try {
        await State.supabase.auth.signOut({ scope: 'global' });
        logActivity('LOGOUT ALL', 'global');
        toast('success', 'Signed out everywhere');
        setTimeout(() => location.reload(), 600);
      } catch (err) { toast('error', 'Failed', err.message); }
    }
  });
});

/* ============ GLOBAL SEARCH ============ */
$('#globalSearch').addEventListener('input', debounce((e) => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) return;
  const results = [];
  State.cache.work.forEach(w => { if ((w.title || '').toLowerCase().includes(q)) results.push({ type: 'Work', label: w.title, page: 'work' }); });
  State.cache.leads.forEach(l => { if ((l.name || '').toLowerCase().includes(q) || (l.business || '').toLowerCase().includes(q)) results.push({ type: 'Lead', label: l.name, page: 'leads' }); });
  State.cache.reviews.forEach(r => { if ((r.name || '').toLowerCase().includes(q)) results.push({ type: 'Review', label: r.name, page: 'reviews' }); });
  State.cache.services.forEach(s => { if ((s.name || '').toLowerCase().includes(q)) results.push({ type: 'Service', label: s.name, page: 'services' }); });
  State.cache.projects.forEach(p => { if ((p.name || '').toLowerCase().includes(q)) results.push({ type: 'Project', label: p.name, page: 'projects' }); });

  if (!results.length) return toast('info', 'No results', `Nothing matches "${q}"`);
  Modal.open({
    title: `Search: "${q}"`,
    body: results.slice(0, 20).map(r => `<div class="info-row" data-nav="${r.page}" style="cursor:pointer"><div><span class="pill pill-draft" style="margin-right:0.6rem">${escapeHTML(r.type)}</span><strong>${escapeHTML(r.label || '')}</strong></div><span style="color:var(--orange);font-size:0.8rem">→</span></div>`).join(''),
    onOpen: () => {
      $$('[data-nav]').forEach(x => x.addEventListener('click', () => {
        navigate(x.dataset.nav); Modal.close();
      }));
    }
  });
}, 350));

/* ============ REFRESH ============ */
$('#refreshBtn').addEventListener('click', async () => {
  toast('info', 'Refreshing...');
  await loadAllData();
  navigate(State.currentPage);
  toast('success', 'Refreshed');
});

/* ============ SESSION EXPIRY WATCHER ============ */
if (State.supabase) {
  State.supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      if (State.user) {
        $('#sessionExpired').classList.add('open');
      }
    }
  });
}

/* ============ KEYBOARD SHORTCUTS ============ */
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    $('#globalSearch').focus();
  }
});

/* ============ CONSOLE BRANDING ============ */
console.log('%c NOCTIS ADMIN ', 'background:#c96a32;color:#151311;font-size:14px;font-weight:bold;padding:6px 12px;border-radius:4px;');
console.log('%c Admin panel loaded — Supabase backend ', 'color:#cdb895;font-size:11px;');
console.log('%c Security: RLS enforces access. Frontend checks are UX only. ', 'color:#b7aa98;font-size:10px;');
