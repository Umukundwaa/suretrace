(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
let CONFIG = { demo: true };
let lang = localStorage.getItem('st_lang') || (navigator.language || 'en').slice(0, 2);
if (!I18N[lang]) lang = 'en';
let themePreference = localStorage.getItem('st_theme') || 'system';
function applyTheme() {
  const dark = themePreference === 'dark' || (themePreference === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
applyTheme();
if (window.matchMedia) {
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const updateSystemTheme = () => { if (themePreference === 'system') applyTheme(); };
  if (systemTheme.addEventListener) systemTheme.addEventListener('change', updateSystemTheme);
  else if (systemTheme.addListener) systemTheme.addListener(updateSystemTheme);
}
const N_INSURERS = 9;
const t = (k, v = {}) => (I18N[lang][k] ?? I18N.en[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const locale = { en: 'en-GB', fr: 'fr-FR', rw: 'en-GB' };
const fmt = (d) => d ? new Date(String(d).slice(0, 10) + 'T00:00:00Z').toLocaleDateString(locale[lang], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
const plateDisp = (p) => p && p.length === 7 ? `${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6)}` : p;
const TODAY = new Date().toISOString().slice(0, 10);

// ---------- icons ----------
const P = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', check: '<path d="M20 6L9 17l-5-5"/>', x: '<path d="M18 6L6 18M6 6l12 12"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>', clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>', lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>', layers: '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>', arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>', info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>', car: '<path d="M5 17h14M3 13l2-6a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 7l2 6v4H3v-4z"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/>'
};
const ic = (n, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
const plate = (p, lg) => `<span class="plate ${lg ? 'lg' : ''}"><span class="f">RW</span><span class="t">${esc(plateDisp(p))}</span></span>`;

// ---------- session & api ----------
const session = {
  get token() { try { return sessionStorage.getItem('st_token'); } catch { return null; } },
  get name() { try { return sessionStorage.getItem('st_name'); } catch { return null; } },
  set(tok, name) { try { sessionStorage.setItem('st_token', tok); sessionStorage.setItem('st_name', name); } catch {} },
  clear() { try { sessionStorage.removeItem('st_token'); sessionStorage.removeItem('st_name'); } catch {} }
};
class ApiError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
async function api(path, opts = {}) {
  const headers = { 'content-type': 'application/json' };
  if (session.token) headers.authorization = 'Bearer ' + session.token;
  let res;
  try { res = await fetch('/api' + path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined }); }
  catch { throw new ApiError('network'); }
  if (opts.raw) { if (!res.ok) throw new ApiError((await res.json().catch(() => ({}))).error || 'generic'); return res.blob(); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { if (data.error === 'invalid_token' || data.error === 'auth_required') session.clear(); throw new ApiError(data.error || 'generic', data.message); }
  return data;
}
const errMsg = (e) => (I18N.en['e_' + e.code] ? t('e_' + e.code) : t('e_generic'));
const errBox = (e) => `<div class="err">${ic('alert', 'sm')}<span>${esc(errMsg(e))}</span></div>`;
let toastT; function toast(m) { const el = $('#toast'); el.textContent = m; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600); }

// ---------- status helpers ----------
const ST = { active: ['ok', 'check'], expired: ['bad', 'alert'], notfound: ['none', 'x'], past: ['info', 'clock'], none: ['none', 'x'], upcoming: ['info', 'clock'] };
const badge = (s) => `<span class="badge ${ST[s][0]}">${esc(t('st_' + s))}</span>`;
const CLASS_COLORS = { private: ['#FBD24A', '#4A3B00'], commercial: ['#3B82C4', '#fff'], psv: ['#D64545', '#fff'] };
const INS_COLOR = { SONARWA: '#0F5D4F', SORAS: '#1B6FA8', RADIANT: '#C4481C', BKGEN: '#7A4FB5', BRITAM: '#C98A0B', OLDMUT: '#1F8A8A', MAYFAIR: '#B5446E', SANLAM: '#4F7A2E', CORAR: '#5C6670' };
const INS_SHORT = { SONARWA: 'SONARWA', SORAS: 'SORAS', RADIANT: 'Radiant', BKGEN: 'BK General', BRITAM: 'Britam', OLDMUT: 'Old Mutual', MAYFAIR: 'Mayfair', SANLAM: 'Sanlam Allianz', CORAR: 'CORAR' };
const INSURERS_LIST = Object.values(INS_SHORT);

// ---------- coverage timeline ----------
function timeline(certs, id = '') {
  if (!certs.length) return '';
  const ms = (d) => Date.parse(d + 'T00:00:00Z');
  const start = Math.min(...certs.map((c) => ms(c.start_date)));
  const end = Math.max(ms(TODAY), ...certs.map((c) => ms(c.end_date) + 86400000));
  const tot = end - start, pct = (x) => ((x - start) / tot) * 100;
  const segs = certs.map((c) => {
    const l = pct(ms(c.start_date)), w = pct(ms(c.end_date) + 86400000) - l, col = INS_COLOR[c.insurer_code] || '#5C6670';
    const label = w > 13 ? INS_SHORT[c.insurer_code] || c.insurer_name : '';
    return `<div class="tl-seg" style="left:${l}%;width:${w}%;background:${col}" title="${esc(c.insurer_name)} · ${fmt(c.start_date)} – ${fmt(c.end_date)}">${esc(label)}</div>`;
  }).join('');
  const y0 = new Date(start).getUTCFullYear(), y1 = new Date(end).getUTCFullYear();
  const step = y1 - y0 > 8 ? 2 : 1; let ticks = `<i style="left:0;transform:none">${fmt(new Date(start).toISOString())}</i>`;
  for (let y = y0 + 1; y <= y1; y += step) { const p = pct(Date.UTC(y, 0, 1)); if (p > 17 && p < 94) ticks += `<i style="left:${p}%">${y}</i>`; }
  const td = pct(ms(TODAY));
  return `<div class="tl" id="${id}"><div class="tl-bar">${segs}</div><div class="tl-today" data-l="${esc(t('tl_today'))}" style="left:${td}%"></div><div class="tl-axis">${ticks}</div></div>`;
}

// ---------- chrome ----------
function renderChrome() {
  document.documentElement.lang = lang;
  $('#logo').innerHTML = ic('check');
  $('#burger').innerHTML = ic('menu');
  const l = ['en', 'fr', 'rw'].map((x) => `<button data-l="${x}" class="${x === lang ? 'on' : ''}" aria-label="${x}">${x.toUpperCase()}</button>`).join('');
  $('#nav').innerHTML = (session.token
    ? `<a href="/dashboard" data-link>${t('my_vehicles_nav')}</a><a href="/settings" data-link>${t('settings')}</a><button class="lnk" id="logout">${t('logout')}</button>`
    : `<a href="/search" data-link>${t('nav_check')}</a><a href="/#how" data-link>${t('nav_how')}</a><a href="/#features" data-link>${t('nav_features')}</a><a href="/#faq" data-link>${t('nav_faq')}</a><a href="/login" data-link>${t('login')}</a><a class="btn sm" href="/register" data-link>${t('get_started')}</a>`)
    + `<div class="lang" id="lang">${l}</div>`;
  const hideFoot = /^\/(login|register)$/.test(location.pathname);
  $('#footer').innerHTML = hideFoot ? '' : `<div class="foot"><div class="wrap"><div class="grid">
    <div><a class="brand" href="/" data-link><span class="logo">${ic('check')}</span>SureTrace</a><div style="max-width:300px">${t('foot_tag')}</div></div>
    <div><h4>${t('foot_product')}</h4><a href="/search" data-link>${t('nav_check')}</a><a href="/#how" data-link>${t('nav_how')}</a><a href="/#features" data-link>${t('nav_features')}</a><a href="/register" data-link>${t('register')}</a></div>
    <div><h4>${t('foot_company')}</h4><a href="/#about" data-link>${t('about_title')}</a><a href="/#faq" data-link>${t('nav_faq')}</a><a href="/#contact" data-link>${t('contact_title')}</a></div>
    <div><h4>${t('foot_contact')}</h4><a href="mailto:angeumukundwa47@gmail.com">angeumukundwa47@gmail.com</a><a href="tel:+250791376658">+250 791 376 658</a><span>${t('contact_loc')}</span></div></div>
    <div class="copy"><span>${t('rights')}</span><span>EN · FR · RW</span></div></div></div>`;
}
document.addEventListener('click', (e) => {
  const lb = e.target.closest('#lang button[data-l]');
  if (lb) { lang = lb.dataset.l; localStorage.setItem('st_lang', lang); route(true); return; }
  if (e.target.closest('#logout')) { session.clear(); go('/'); return; }
  const bg = e.target.closest('#burger');
  if (bg) { const o = $('#nav').classList.toggle('open'); bg.setAttribute('aria-expanded', o); bg.innerHTML = ic(o ? 'close' : 'menu'); return; }
  const a = e.target.closest('a[data-link]');
  if (!a || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  $('#nav').classList.remove('open'); $('#burger').innerHTML = ic('menu');
  const href = a.getAttribute('href');
  if (href.startsWith('/#') && location.pathname === '/') { history.pushState({}, '', href); $(href.slice(1))?.scrollIntoView({ behavior: 'smooth' }); return; }
  go(href);
});
window.addEventListener('scroll', () => $('#top').classList.toggle('scrolled', scrollY > 8), { passive: true });
window.addEventListener('popstate', () => route());
function go(p) { history.pushState({}, '', p); route(); }

// ---------- router ----------
const spin = () => { app.innerHTML = `<div class="wrap page"><div class="skel" style="height:34px;width:220px;margin-bottom:18px"></div><div class="skel" style="height:260px"></div></div>`; };
const needLogin = () => { if (!session.token) { go('/login'); return true; } return false; };
const pg = (inner, cls = 'narrow') => `<div class="wrap"><div class="page ${cls}">${inner}</div></div>`;
async function route(keepScroll) {
  renderChrome();
  const path = location.pathname, hash = location.hash;
  if (!keepScroll) window.scrollTo(0, 0);
  let m;
  if (path === '/') { viewLanding(); if (hash) setTimeout(() => $(hash)?.scrollIntoView(), 50); }
  else if (path === '/search') viewSearch();
  else if ((m = path.match(/^\/result\/(\w+)$/))) await viewResult(m[1]);
  else if (path === '/login') viewAuth('login');
  else if (path === '/register') viewAuth('register');
  else if (path === '/dashboard') await viewDashboard();
  else if (path === '/settings') await viewSettings();
  else if ((m = path.match(/^\/history\/(\w+)$/))) await viewHistory(m[1]);
  else if ((m = path.match(/^\/cert\/([\w-]+)$/))) await viewCert(m[1]);
  else if ((m = path.match(/^\/verify\/cert\/([\w-]+)$/))) await viewVerify('cert', m[1]);
  else if ((m = path.match(/^\/verify\/([\w-]+)$/))) await viewVerify('report', m[1]);
  else app.innerHTML = pg(`<h1 class="pt">404</h1><a class="back" href="/" data-link>${ic('arrow', 'sm')}Home</a>`);
  observe();
}
function observe() {
  const els = $$('.rv:not(.in)');
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: .12 });
  els.forEach((e) => io.observe(e));
}

// ---------- plate checker ----------
const formatPlate = (v) => { v = v.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 7); return [v.slice(0, 3), v.slice(3, 6), v.slice(6)].filter(Boolean).join(' '); };
function checker(compact) {
  return `<form id="pf" class="checker" novalidate>
    <h3>${t('chk_t')}</h3><p>${t('chk_p')}</p>
    <div class="plate-input"><div class="flag">RW<b></b></div><input id="pl" placeholder="${t('plate_ph')}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="${t('plate_label')}"></div>
    <div id="pe"></div><div class="auto-search-hint">${t('auto_search_hint')}</div>
    <button class="btn full" style="margin-top:16px">${ic('search', 'sm')}${t('check_btn')}</button>
    ${CONFIG.demo ? `<div class="chips">${t('try_demo')} ${['RAD 123 A', 'RAC 902 B', 'RAE 310 D'].map((p) => `<button type="button" class="chip" data-p="${p}">${p}</button>`).join('')}</div>` : ''}
  </form>`;
}
function bindChecker() {
  const pl = $('#pl'); if (!pl) return;
  let searchTimer;
  const valid = () => /^R[A-Z]{2}\d{3}[A-Z]$/.test(pl.value.replace(/\s/g, '').toUpperCase());
  pl.addEventListener('input', () => {
    const s = pl.selectionStart, atEnd = s === pl.value.length; pl.value = formatPlate(pl.value); if (atEnd) pl.setSelectionRange(pl.value.length, pl.value.length);
    clearTimeout(searchTimer);
    if (valid()) searchTimer = setTimeout(() => $('#pf')?.requestSubmit(), 500);
  });
  $$('.chip[data-p]').forEach((c) => c.addEventListener('click', () => { pl.value = c.dataset.p; $('#pf').requestSubmit(); }));
  $('#pf').addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(searchTimer);
    const p = pl.value.replace(/\s/g, '').toUpperCase();
    if (!/^R[A-Z]{2}\d{3}[A-Z]$/.test(p)) { $('#pe').innerHTML = errBox({ code: 'invalid_plate' }); pl.focus(); return; }
    go('/result/' + p);
  });
}

// ---------- landing ----------
function viewLanding() {
  const sample = [
    { insurer_code: 'SORAS', insurer_name: 'SORAS', start_date: '2021-02-14', end_date: '2022-02-13' },
    { insurer_code: 'SORAS', insurer_name: 'SORAS', start_date: '2023-02-14', end_date: '2025-02-13' },
    { insurer_code: 'SONARWA', insurer_name: 'SONARWA', start_date: '2026-01-12', end_date: '2027-01-11' }];
  const steps = (k) => [1, 2, 3].map((i) => `<div class="step rv d${i}"><h3>${t(k + i + '_t')}</h3><p>${t(k + i + '_p')}</p></div>`).join('');
  const faq = [1, 2, 3, 4].map((i) => `<details class="rv"><summary>${t('faq' + i + '_q')}</summary><p>${t('faq' + i + '_a', { n: N_INSURERS })}</p></details>`).join('');
  const tile = (i, cls, icon) => `<div class="tile ${cls} rv"><div class="ico">${ic(icon, 'lg')}</div><h3>${t('f' + i + '_t')}</h3><p>${t('f' + i + '_p', { n: N_INSURERS })}</p></div>`;
  app.innerHTML = `
  <section class="hero"><div class="wrap">
    <div class="rv"><span class="pill"><i>${ic('check')}</i>${t('hero_pill')}</span>
      <h1 class="hl">${t('hero_a')} <em>${t('hero_b')}</em></h1>
      <p class="lead">${t('hero_sub')}</p>
      <div class="cta-row"><a class="btn" href="/search" data-link>${ic('search', 'sm')}${t('hero_cta1')}</a><a class="btn ghost" href="/register" data-link>${t('hero_cta2')}</a></div>
      <div class="trust"><span>${ic('layers')}${t('trust1', { n: N_INSURERS })}</span><span>${ic('shield')}${t('trust2')}</span><span>${ic('qr')}${t('trust3')}</span></div></div>
    <div class="stage rv d2">
      <div class="float f2"><div class="d bad">${ic('alert', 'sm')}</div><div><b>${t('f_gap')}</b><span>${t('f_gap_s', { n: N_INSURERS })}</span></div></div>
      ${checker()}
      <div class="float f1"><div class="d ok">${ic('check', 'sm')}</div><div><b>${t('f_active')}</b><span>${t('f_active_s')}</span></div></div>
    </div></div></section>
  <section class="strip"><div class="wrap"><small>${t('ins_strip')}</small><div class="ins-names">${INSURERS_LIST.map((n) => `<span>${n}</span>`).join('')}</div></div></section>
  <section class="band dark"><div class="wrap"><div class="stats">
    ${[[N_INSURERS, 'stat1'], ['0', 'stat2'], ['3', 'stat3'], ['1', 'stat4']].map(([n, k], i) => `<div class="stat rv d${i}"><b>${n}</b><span>${t(k)}</span></div>`).join('')}</div></div></section>
  <section class="band" id="how"><div class="wrap">
    <div class="eyebrow rv">${t('how_eyebrow')}</div><h2 class="sh rv">${t('how_title')}</h2><p class="sub rv">${t('how_lead')}</p>
    <div class="seg rv" role="tablist"><button class="on" data-tab="b">${t('tab_buyer')}</button><button data-tab="s">${t('tab_seller')}</button></div>
    <div class="steps" id="steps">${steps('b')}</div></div></section>
  <section class="band white"><div class="wrap">
    <div class="eyebrow rv">${t('vs_eyebrow')}</div><h2 class="sh rv">${t('vs_title')}</h2><div style="height:26px"></div>
    <div class="vs"><div class="col old rv"><h3>${t('before_t')}</h3><ul>${[1, 2, 3].map((i) => `<li>${ic('x')}${t('before_' + i)}</li>`).join('')}</ul></div>
    <div class="col new rv d1"><h3>${t('after_t')}</h3><ul>${[1, 2, 3].map((i) => `<li>${ic('check')}${t('after_' + i)}</li>`).join('')}</ul></div></div></div></section>
  <section class="band" id="features"><div class="wrap">
    <div class="eyebrow rv">${t('feat_eyebrow')}</div><h2 class="sh rv">${t('feat_title')}</h2><div style="height:30px"></div>
    <div class="bento">${tile(1, 'w4 dark', 'layers')}${tile(2, 'accent', 'clock')}${tile(3, '', 'qr')}${tile(4, '', 'lock')}${tile(5, '', 'download')}${tile(6, 'w6', 'globe')}</div></div></section>
  <section class="band dark"><div class="wrap showcase">
    <div><div class="eyebrow rv">${t('rep_eyebrow')}</div><h2 class="sh rv">${t('rep_title')}</h2><p class="sub rv" style="margin-bottom:0">${t('rep_p')}</p></div>
    <div class="doc rv d1"><div class="doc-h"><span>${t('doc_title')}</span><span>ST-RAD123A</span></div><div class="doc-b">
      <div class="doc-row" style="margin-bottom:20px"><div>${plate('RAD123A')}<div class="muted small" style="margin-top:8px">Toyota RAV4 · 2018</div></div><div class="doc-qr">${ic('qr').replace('class="ic ', 'style="width:100%;height:100%;stroke:#fff" class="ic ')}</div></div>
      ${timeline(sample)}<div class="legend"><span><i style="background:${INS_COLOR.SORAS}"></i>SORAS</span><span><i style="background:${INS_COLOR.SONARWA}"></i>SONARWA</span><span><i style="background:repeating-linear-gradient(135deg,#F3D9CF 0 3px,#FBEBE4 3px 6px)"></i>${t('tl_gap')}</span></div></div></div></div></section>
  <section class="band" id="about"><div class="wrap" style="max-width:860px"><div class="eyebrow rv">${t('about_title')}</div><h2 class="sh rv" style="font-size:clamp(24px,3vw,36px);max-width:none">${t('about_p')}</h2></div></section>
  <section class="band white" id="faq"><div class="wrap"><div class="eyebrow rv">FAQ</div><h2 class="sh rv">${t('faq_title')}</h2><div style="height:26px"></div><div class="faq">${faq}</div></div></section>
  <section class="band" id="contact"><div class="wrap"><div class="cta-band rv"><div><h2>${t('cta_t')}</h2><p>${t('cta_p')}</p></div><a class="btn sun" href="/register" data-link>${t('cta_btn')}${ic('arrow', 'sm')}</a></div></div></section>`;
  bindChecker();
  $('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('.seg button').forEach((x) => x.classList.toggle('on', x === b));
    $('#steps').innerHTML = steps(b.dataset.tab); $$('#steps .rv').forEach((x) => x.classList.add('in'));
  });
}

function viewSearch() {
  app.innerHTML = pg(`<h1 class="pt">${t('s_title')}</h1><p class="psub">${t('s_sub')}</p>${checker()}`);
  bindChecker(); $('#pl').focus();
}

async function viewResult(p) {
  spin();
  try {
    const r = await api('/search/' + p);
    const [cls, icon] = ST[r.status], head = { active: 'r_active', expired: 'r_expired', notfound: 'r_notfound' }[r.status];
    app.innerHTML = pg(`<a class="back" href="/search" data-link>${ic('arrow', 'sm')}${t('nav_check')}</a>
      <div class="card pad0"><div class="res-hero ${cls}"><div class="ring">${ic(icon)}</div><h2>${t(head)}</h2>${plate(r.plate, true)}</div>
        <div class="res-body">
          ${r.insurer ? `<div class="kv"><span>${t('insurer')}</span><span>${esc(r.insurer)}</span></div><div class="kv"><span>${t('policy')}</span><span>${esc(r.policy_no)}</span></div><div class="kv"><span>${t(r.status === 'active' ? 'coverage' : 'last_cover')}</span><span>${fmt(r.start_date)} – ${fmt(r.end_date)}</span></div>` : ''}
          <div class="note ${cls}">${t(head + '_n')}</div>${r.stale ? `<div class="note info">${t('stale')}</div>` : ''}
          <a class="btn full ghost" style="margin-top:18px" href="/search" data-link>${ic('search', 'sm')}${t('again')}</a></div></div>
      ${session.token ? '' : `<div class="cta-card"><div><h3>${t('sell_cta_t')}</h3><p>${t('sell_cta_p')}</p></div><a class="btn sm" href="/login" data-link>${t('login')}${ic('arrow', 'sm')}</a></div>`}`);
  } catch (e) { app.innerHTML = pg(`<a class="back" href="/search" data-link>${ic('arrow', 'sm')}</a>${errBox(e)}`); }
}

function viewAuth(kind) {
  const reg = kind === 'register';
  const pw = (id, ac) => `<div class="field"><input id="${id}" type="password" autocomplete="${ac}"><button type="button" class="eye" data-eye="${id}">${t('show_pw')}</button></div>`;
  app.innerHTML = `<div class="auth"><aside class="auth-side"><a class="brand" href="/" data-link style="color:#fff"><span class="logo" style="background:rgba(255,255,255,.14)">${ic('check')}</span>SureTrace</a>
    <h2>${t('auth_t')}</h2><p>${t('auth_p')}</p><ul><li>${ic('layers')}${t('auth_1')}</li><li>${ic('qr')}${t('auth_2')}</li><li>${ic('lock')}${t('auth_3')}</li></ul></aside>
    <div class="auth-main"><div class="box"><h1 class="pt">${t(reg ? 'reg_title' : 'login_title')}</h1><p class="psub">${t(reg ? 'reg_sub' : 'login_sub')}</p>
    ${reg && CONFIG.demo ? `<div class="demo-auth-note">${t('demo_registration_notice')}</div>` : ''}
    <form id="af" novalidate>
      ${reg ? `<label for="fn" style="margin-top:0">${t('full_name')}</label><div class="field"><input id="fn" autocomplete="name"></div>` : ''}
      <label for="nid" ${reg ? '' : 'style="margin-top:0"'}>${t('nid')}</label><div class="field"><input id="nid" inputmode="numeric" maxlength="16" autocomplete="username"></div>
      ${reg ? `<label for="ph">${t('phone')}</label><div class="field"><input id="ph" inputmode="tel" autocomplete="tel"></div>` : ''}
      <label for="pw">${t('password')}</label>${pw('pw', reg ? 'new-password' : 'current-password')}${reg ? `<div class="hint" style="font-size:13px;color:var(--muted);margin-top:7px">${t('pw_hint')}</div>` : ''}
      <div id="ae"></div><button class="btn full" style="margin-top:22px" id="ab">${t(reg ? 'reg_btn' : 'login_btn')}</button></form>
    ${reg && CONFIG.demo ? `<div class="info-note" style="margin-top:18px">${ic('info')}<span>${t('demo_hint', { id: '1199680044433322' })}</span></div>` : ''}
    <div class="swap">${t(reg ? 'have_account' : 'no_account')} <a href="${reg ? '/login' : '/register'}" data-link>${t(reg ? 'login' : 'register')}</a></div></div></div></div>`;
  $$('[data-eye]').forEach((b) => b.addEventListener('click', () => { const i = $('#' + b.dataset.eye), s = i.type === 'password'; i.type = s ? 'text' : 'password'; b.textContent = t(s ? 'hide_pw' : 'show_pw'); }));
  $('#af').addEventListener('submit', async (e) => {
    e.preventDefault(); $('#ab').disabled = true; $('#ae').innerHTML = '';
    try {
      const body = { national_id: $('#nid').value.trim(), password: $('#pw').value };
      if (reg) { body.full_name = $('#fn').value; body.phone = $('#ph').value; }
      const r = await api('/auth/' + (reg ? 'register' : 'login'), { method: 'POST', body });
      session.set(r.token, r.seller.full_name); go('/dashboard');
    } catch (err) { $('#ae').innerHTML = errBox(err); $('#ab').disabled = false; }
  });
}

async function viewDashboard() {
  if (needLogin()) return; spin();
  try {
    const [v, s] = await Promise.all([api('/seller/vehicles'), api('/seller/searches')]);
    const first = (session.name || '').split(' ')[0], insured = v.vehicles.filter((x) => x.status === 'active').length;
    app.innerHTML = pg(`<div class="muted" style="font-weight:600">${t('welcome')}</div><h1 class="pt" style="margin-bottom:24px">${esc(first)}</h1>
      <div class="stat-row"><div class="mini"><b>${v.vehicles.length}</b><span>${t('dash_veh')}</span></div><div class="mini"><b>${insured}</b><span>${t('dash_insured')}</span></div><div class="mini"><b>${s.searches.length}</b><span>${t('dash_search')}</span></div></div>
      <div class="sec-t" style="margin-top:0">${t('my_vehicles')}</div>
      <div class="vgrid">${v.vehicles.map((x) => `<a class="vcard" href="/history/${x.plate}" data-link><div class="top2">${plate(x.plate)}${badge(x.status)}</div>
        <div class="mk">${esc(x.make)} ${esc(x.model)}</div><div class="sb">${x.year || ''}${x.insurer ? ' · ' + esc(x.insurer) : ''}</div><div class="go">${t('view_hist')}${ic('arrow', 'sm')}</div></a>`).join('')}
        <div class="add-card"><h3>${t('add_vehicle')}</h3><p>${t('add_vehicle_p')}</p><form class="row2" id="av"><input id="vp" placeholder="${t('plate_ph')}" aria-label="${t('plate_label')}"><button class="btn">${t('add_btn')}</button></form><div id="ve"></div></div></div>
      ${v.vehicles.length ? '' : `<p class="muted" style="margin-top:14px">${t('no_vehicles')}</p>`}
      <div class="sec-t">${t('recent')}</div><div class="card" style="padding:6px 22px">
      ${s.searches.length ? s.searches.map((x) => `<a class="hist-row" href="/result/${encodeURIComponent(x.plate)}" data-link><span class="hist-info">${plate(x.plate)}<small class="muted">${fmt(x.searched_at)}</small></span>${badge(x.result)}</a>`).join('') : `<p class="muted small" style="padding:14px 0;margin:0">${t('none_yet')}</p>`}</div>`, 'mid');
    $('#vp').addEventListener('input', (e) => { e.target.value = formatPlate(e.target.value); });
    $('#av').addEventListener('submit', async (e) => {
      e.preventDefault(); $('#ve').innerHTML = '';
      try { await api('/seller/vehicles', { method: 'POST', body: { plate: $('#vp').value } }); viewDashboard(); }
      catch (err) { $('#ve').innerHTML = errBox(err); }
    });
  } catch (e) { if (!session.token) return go('/login'); app.innerHTML = pg(errBox(e)); }
}

async function viewSettings() {
  if (needLogin()) return; spin();
  try {
    const [{ seller }, { activity }] = await Promise.all([api('/seller/profile'), api('/seller/activity')]);
    app.innerHTML = pg(`<a class="back" href="/dashboard" data-link>${ic('arrow', 'sm')}${t('my_vehicles')}</a>
      <h1 class="pt">${t('settings_title')}</h1><p class="psub">${t('settings_sub')}</p>
      <section class="card setting-card"><h2>${t('profile_section')}</h2><p class="muted small">${t('profile_note')}</p>
        <form id="profileForm">
          <label for="settingsName">${t('full_name')}</label><div class="field"><input id="settingsName" autocomplete="name" value="${esc(seller.full_name)}" required maxlength="120"></div>
          <label for="settingsPhone">${t('phone')}</label><div class="field"><input id="settingsPhone" inputmode="tel" autocomplete="tel" value="${esc(seller.phone || '')}" maxlength="20"></div>
          <label for="settingsNid">${t('national_id_fixed')}</label><div class="field"><input id="settingsNid" value="${esc(seller.national_id)}" readonly></div>
          <div id="profileError"></div><button class="btn" id="saveProfile" style="margin-top:20px">${t('save_profile')}</button>
        </form></section>
      <section class="card setting-card"><h2>${t('security_section')}</h2>
        <form id="passwordForm">
          <label for="currentPassword">${t('current_password')}</label><div class="field"><input id="currentPassword" type="password" autocomplete="current-password" required></div>
          <label for="newPassword">${t('new_password')}</label><div class="field"><input id="newPassword" type="password" autocomplete="new-password" minlength="8" required></div>
          <div id="passwordError"></div><button class="btn" id="savePassword" style="margin-top:20px">${t('change_password')}</button>
        </form></section>
      <section class="card setting-card"><h2>${t('activity_section')}</h2>
        ${activity.length ? activity.map((a) => `<div class="hist-row"><span>${t('act_' + a.event)}</span><span class="muted small">${new Date(a.logged_at.replace(' ', 'T') + 'Z').toLocaleString(locale[lang])}</span></div>`).join('') : `<p class="muted small" style="margin:0">${t('activity_empty')}</p>`}</section>
      <section class="card setting-card"><h2>${t('appearance_section')}</h2>
        <div class="settings-grid"><div><label for="settingsTheme">${t('theme')}</label><div class="field"><select id="settingsTheme">
          <option value="system">${t('theme_system')}</option><option value="light">${t('theme_light')}</option><option value="dark">${t('theme_dark')}</option>
        </select></div></div><div><label for="settingsLanguage">${t('language')}</label><div class="field"><select id="settingsLanguage">
          <option value="en">English</option><option value="fr">Français</option><option value="rw">Kinyarwanda</option>
        </select></div></div></div></section>`, 'mid');

    $('#settingsTheme').value = themePreference;
    $('#settingsLanguage').value = lang;
    $('#settingsTheme').addEventListener('change', (e) => {
      themePreference = e.target.value;
      localStorage.setItem('st_theme', themePreference);
      applyTheme();
      toast(t('preference_saved'));
    });
    $('#settingsLanguage').addEventListener('change', (e) => {
      lang = e.target.value;
      localStorage.setItem('st_lang', lang);
      route(true);
    });
    $('#profileForm').addEventListener('submit', async (e) => {
      e.preventDefault(); $('#saveProfile').disabled = true; $('#profileError').innerHTML = '';
      try {
        const result = await api('/seller/profile', { method: 'PUT', body: { full_name: $('#settingsName').value, phone: $('#settingsPhone').value } });
        session.set(result.token, result.seller.full_name);
        renderChrome();
        toast(t('profile_saved'));
      } catch (err) { $('#profileError').innerHTML = errBox(err); }
      finally { $('#saveProfile').disabled = false; }
    });
    $('#passwordForm').addEventListener('submit', async (e) => {
      e.preventDefault(); $('#savePassword').disabled = true; $('#passwordError').innerHTML = '';
      try {
        await api('/seller/password', { method: 'PUT', body: { current_password: $('#currentPassword').value, new_password: $('#newPassword').value } });
        $('#passwordForm').reset();
        toast(t('password_changed'));
      } catch (err) { $('#passwordError').innerHTML = errBox(err); }
      finally { $('#savePassword').disabled = false; }
    });
  } catch (e) { if (!session.token) return go('/login'); app.innerHTML = pg(errBox(e)); }
}

async function download(path, filename, btn) {
  const label = btn.innerHTML; btn.disabled = true; btn.textContent = t('downloading');
  try {
    const blob = await api(path, { raw: true });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    toast(t('download_ok'));
  } catch (e) { toast(errMsg(e)); }
  btn.disabled = false; btn.innerHTML = label;
}

async function viewHistory(p) {
  if (needLogin()) return; spin();
  try {
    const { vehicle: v, history: h } = await api(`/seller/vehicles/${p}/history`);
    const certs = h.insurers.flatMap((i) => i.certificates.map((c) => ({ ...c, insurer_code: i.insurer_code, insurer_name: i.insurer_name })));
    const used = h.insurers.filter((i) => i.status !== 'none');
    app.innerHTML = pg(`<a class="back" href="/dashboard" data-link>${ic('arrow', 'sm')}${t('my_vehicles')}</a>
      <div class="hhead"><div>${plate(v.plate, true)}<div class="muted" style="margin-top:10px;font-weight:600">${esc(v.make)} ${esc(v.model)} ${v.year || ''} · ${esc(v.chassis)}</div></div>
        <button class="btn" id="dl">${ic('download', 'sm')}${t('h_download')}</button></div>
      <div class="sumgrid"><div class="mini"><b>${h.insurers_with_cover}<small style="font-size:16px;color:var(--muted)"> / ${h.insurers_checked}</small></b><span>${t('sum_ins')}</span></div>
        <div class="mini"><b>${h.total_certificates}</b><span>${t('sum_cert')}</span></div><div class="mini"><b style="font-size:22px;padding-top:8px">${fmt(h.first_cover)}</b><span>${t('sum_first')}</span></div>
        <div class="mini"><div style="padding-top:4px">${badge(h.currently_insured ? 'active' : 'expired')}</div><span style="display:block;margin-top:12px">${t('sum_status')}</span></div></div>
      ${h.stale ? `<div class="note info">${t('stale')}</div>` : ''}
      <div class="card tl-card"><div class="tl-t"><h3>${t('tl_title')}</h3><span class="muted small">${fmt(h.first_cover)} → ${fmt(TODAY)}</span></div>
        ${timeline(certs)}<div class="legend">${used.map((i) => `<span><i style="background:${INS_COLOR[i.insurer_code] || '#5C6670'}"></i>${esc(INS_SHORT[i.insurer_code] || i.insurer_name)}</span>`).join('')}<span><i style="background:repeating-linear-gradient(135deg,#F3D9CF 0 3px,#FBEBE4 3px 6px)"></i>${t('tl_gap')}</span></div>
        <div class="sec-t" style="font-size:15px;margin:22px 0 0">${t('h_gaps')}</div>
        <div class="gaps">${h.gaps.length ? h.gaps.map((g) => `<div class="gap-item"><span>${fmt(g.from)} – ${fmt(g.to)}</span><span>${g.days} ${t('days')}</span></div>`).join('') : `<p class="muted small" style="margin:8px 0 0">${t('h_nogaps')}</p>`}</div></div>
      <div class="sec-t">${t('h_checked')}</div>
      <div class="insgrid">${h.insurers.map((i) => i.status === 'none'
        ? `<div class="ins empty"><span>${esc(i.insurer_name)}</span>${badge('none')}</div>`
        : `<div class="ins"><div class="hd"><span><i class="sw" style="background:${INS_COLOR[i.insurer_code] || '#5C6670'}"></i>${esc(i.insurer_name)}</span>${badge(i.status)}</div>
          ${i.certificates.map((c) => `<a class="cr" href="/cert/${c.certificate_no}" data-link><div><b>${esc(c.certificate_no)}</b><span class="muted">${esc(c.cover_type)} · ${fmt(c.start_date)} – ${fmt(c.end_date)}</span></div>${badge(c.status)}</a>`).join('')}</div>`).join('')}</div>`, 'mid');
    $('#dl').addEventListener('click', (e) => download(`/seller/vehicles/${p}/history.pdf`, `SureTrace-${p}-history.pdf`, e.currentTarget));
  } catch (e) { if (!session.token) return go('/login'); app.innerHTML = pg(`<a class="back" href="/dashboard" data-link>${ic('arrow', 'sm')}</a>${errBox(e)}`); }
}

async function viewCert(no) {
  if (needLogin()) return; spin();
  try {
    const { certificate: c, vehicle: v } = await api('/seller/certificates/' + no);
    const [bg, fg] = CLASS_COLORS[c.certificate_class] || CLASS_COLORS.private;
    const row = (k, val) => `<div class="kv"><span>${t(k)}</span><span>${esc(val)}</span></div>`;
    app.innerHTML = pg(`<a class="back" href="/history/${c.plate}" data-link>${ic('arrow', 'sm')}${t('h_title')}</a>
      <div class="cert"><div class="cert-band" style="background:${bg};color:${fg}"><span>${t('class_' + c.certificate_class)}</span><span>${t('st_' + c.status)}</span></div>
        <div class="cert-in"><div class="eyebrow2">${t('insurer')}</div><div class="insn">${esc(c.insurer_name)}</div>
          ${row('c_no', c.certificate_no)}${row('c_holder', c.policyholder)}${row('c_policy', c.policy_no)}${row('c_plate', v.plate_display)}${row('c_model', `${v.make} ${v.model}`)}${row('c_chassis', v.chassis)}${row('c_type', c.cover_type)}${row('c_period', `${fmt(c.start_date)} – ${fmt(c.end_date)}`)}
          <div class="eyebrow2" style="margin-top:18px">${t('c_drivers')}</div><p style="margin:6px 0 20px;font-size:14.5px;color:var(--ink2)">${esc(c.persons_entitled)}</p>
          <div class="perf"></div>
          <div class="qrbox"><img alt="QR" src="/api/qr/cert/${encodeURIComponent(c.certificate_no)}.png"><div><b>${t('c_scan')}</b><div class="muted small" style="margin-top:3px">${t('c_scan_p')}</div></div></div></div></div>
      <button class="btn full" style="margin-top:18px" id="dl">${ic('download', 'sm')}${t('c_download')}</button>
      <p class="muted small" style="text-align:center;margin-top:16px">${t('c_src')}</p>`);
    $('#dl').addEventListener('click', (e) => download(`/seller/certificates/${no}/pdf`, `SureTrace-${no}.pdf`, e.currentTarget));
  } catch (e) { if (!session.token) return go('/login'); app.innerHTML = pg(`<a class="back" href="/dashboard" data-link>${ic('arrow', 'sm')}</a>${errBox(e)}`); }
}

async function viewVerify(kind, id) {
  spin();
  try {
    const r = await api(kind === 'cert' ? '/verify/cert/' + id : '/verify/' + id);
    const rows = kind === 'cert'
      ? [['v_cert', r.certificate_no], ['v_insurer', r.insurer], ['v_plate', r.plate_display], ['c_period', `${fmt(r.start_date)} – ${fmt(r.end_date)}`], ['v_now', t('st_' + r.status)]]
      : [['v_ref', r.ref], ['v_plate', r.plate_display], ['v_gen', fmt(r.generated_at)], ['v_now', t('st_' + r.current_status)]];
    app.innerHTML = pg(`<div class="card pad0"><div class="vfy"><div class="ring ok">${ic('shield')}</div><h2>${t('v_valid')}</h2><div class="muted small">${t(kind === 'cert' ? 'v_cert' : 'v_report')}</div></div><div class="res-body" style="padding-top:0">${rows.map(([k, v]) => `<div class="kv"><span>${t(k)}</span><span>${esc(v)}</span></div>`).join('')}</div></div>`);
  } catch {
    app.innerHTML = pg(`<div class="card"><div class="vfy"><div class="ring none">${ic('x')}</div><h2>${t('v_invalid')}</h2><p class="muted">${t('v_invalid_p')}</p></div></div>`);
  }
}

fetch('/api/config').then((r) => r.json()).then((c) => { CONFIG = c; }).catch(() => {}).finally(() => route());
})();
