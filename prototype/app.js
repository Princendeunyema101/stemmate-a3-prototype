/* STEMMate Namibia - A3 connected prototype (vanilla JS, no build step, no network libraries).
   Workflows:
     WF1  Find and save an activity for offline use (incl. no-results, offline, storage-full, interrupted-download recovery)
     WF2  Build a session plan offline with automatic draft saving and validation
     WF3  Queue, synchronise, fail, retry and resolve a version conflict (incl. failure after merged upload)
   Persistence: localStorage, partitioned per synthetic facilitator profile (shared-device separation).
   The "Evaluator test controls" simulate network and device conditions for testing. */
(function () {
  "use strict";
  var D = window.STEM_DATA;
  var APP_KEY = "stemmate.a3";
  var RETRY_DELAY_S = 20;       // shortened backoff for demonstration
  var MAX_ATTEMPTS = 5;

  /* ---------- Icons (decorative; always paired with text) ---------- */
  var I = {
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3L2 21h20L12 3z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 10v5M12 18v.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    err: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    cloudOff: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.1 4.5 4.5 0 0 0 7 18z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.1 4.5 4.5 0 0 0 7 18z" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
    sync: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 8a8 8 0 0 0-14-2M4 16a8 8 0 0 0 14 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M20 3v5h-5M4 21v-5h5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    device: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="6" y="2.5" width="12" height="19" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M11 18h2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    draft: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 20l1-5L16 4l4 4L9 19l-5 1z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    merge: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 3v6a6 6 0 0 0 6 6h0a6 6 0 0 1 6 6M18 3v4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
  };

  /* ---------- Storage helpers ---------- */
  function load(key, fallback) { try { var v = localStorage.getItem(APP_KEY + "." + key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
  function save(key, value) { localStorage.setItem(APP_KEY + "." + key, JSON.stringify(value)); }

  var harness = load("harness", { network: "online", storageFull: false, conflictNext: false, failNextUpload: false });
  var prefs = load("prefs", { textScale: 1, dataSaver: false });
  var session = null;
  try { session = JSON.parse(sessionStorage.getItem(APP_KEY + ".session") || "null"); } catch (e) { session = null; }
  var pinFails = 0, lockUntil = 0;
  var findState = { q: "", level: "", topic: "", maxMin: "", materials: [] };
  var downloads = {};   // activityId -> {pct, timer, state, message}
  var retryTimers = {};

  function profile() { return session && D.profiles.filter(function (p) { return p.id === session.profileId; })[0]; }
  function storeKey() { return "user." + session.profileId; }
  function userStore() { return load(storeKey(), { saved: {}, plans: [] }); }
  function putUserStore(s) { save(storeKey(), s); }
  function activity(id) { return D.activities.filter(function (a) { return a.id === id; })[0]; }
  function usedKB(s) { return Object.keys(s.saved).reduce(function (t, id) { var a = activity(id); return t + (a ? a.sizeKB : 0); }, 0); }
  function fmtKB(kb) { return kb >= 1000 ? (kb / 1000).toFixed(1) + " MB" : kb + " KB"; }
  function now() { return new Date(); }
  function timeStr(d) { d = new Date(d); return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  function dateTimeStr(d) { d = new Date(d); return d.toLocaleDateString([], { day: "numeric", month: "short" }) + " " + timeStr(d); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function uid() { return "PLAN-" + Math.random().toString(36).slice(2, 7).toUpperCase(); }

  /* ---------- Connectivity (simulated + real browser) ---------- */
  function realOnline() { return navigator.onLine !== false; }
  function net() { if (!realOnline()) return "offline"; return harness.network; }
  function isOnline() { return net() !== "offline"; }

  /* ---------- Announcements ---------- */
  function announce(msg) { var el = document.getElementById("announcer"); el.textContent = ""; setTimeout(function () { el.textContent = msg; }, 60); }
  function alertMsg(msg) { var el = document.getElementById("alerter"); el.textContent = ""; setTimeout(function () { el.textContent = msg; }, 60); }

  /* ---------- Status labels (icon + text + colour) ---------- */
  var PLAN_STATUS = {
    draft:    { cls: "neutral", icon: I.draft, text: "Draft on this device" },
    queued:   { cls: "warn", icon: I.cloudOff, text: "Queued: waiting for connection" },
    syncing:  { cls: "info", icon: I.sync, text: "Syncing now" },
    synced:   { cls: "ok", icon: I.ok, text: "Synced" },
    failed:   { cls: "err", icon: I.err, text: "Upload failed: safe on this device" },
    conflict: { cls: "err", icon: I.merge, text: "Conflict: review needed" }
  };
  function pill(cls, icon, text) { return '<span class="pill ' + cls + '">' + icon + '<span>' + esc(text) + '</span></span>'; }
  function planPill(p) { var s = PLAN_STATUS[p.status]; return pill(s.cls, s.icon, s.text); }

  /* ---------- Simple illustration generator (meaningful images with text alternatives) ---------- */
  function illustration(a) {
    var shapes = {
      Physics: '<rect x="40" y="60" width="50" height="90" rx="8" fill="#9fc6cf"/><rect x="190" y="60" width="50" height="90" rx="8" fill="#9fc6cf"/><path d="M90 130 H190" stroke="#0b5d6b" stroke-width="6"/><rect x="180" y="40" width="70" height="12" fill="#b58a5a"/>',
      Chemistry: '<path d="M120 40h40v40l40 70H80l40-70z" fill="#f2d3a2" stroke="#7a4300" stroke-width="4"/><circle cx="140" cy="30" r="8" fill="#e8b36a"/><circle cx="160" cy="18" r="6" fill="#e8b36a"/>',
      Biology: '<rect x="60" y="110" width="40" height="40" fill="#b58a5a"/><rect x="130" y="110" width="40" height="40" fill="#b58a5a"/><rect x="200" y="110" width="40" height="40" fill="#b58a5a"/><path d="M80 110v-40M150 110v-25M220 110v-10" stroke="#1d6634" stroke-width="5"/><ellipse cx="88" cy="70" rx="10" ry="5" fill="#1d6634"/>',
      Mathematics: '<g fill="none" stroke="#4f4a43" stroke-width="3"><rect x="60" y="50" width="160" height="80"/><path d="M100 50v80M140 50v80M180 50v80M60 90h160"/></g><circle cx="80" cy="70" r="12" fill="#0b5d6b"/><circle cx="120" cy="70" r="12" fill="#0b5d6b"/><circle cx="160" cy="70" r="12" fill="#0b5d6b"/>',
      Engineering: '<rect x="30" y="100" width="50" height="50" fill="#9c9383"/><rect x="200" y="100" width="50" height="50" fill="#9c9383"/><path d="M70 100 Q140 60 210 100" fill="none" stroke="#b58a5a" stroke-width="10"/><circle cx="130" cy="72" r="8" fill="#0b5d6b"/><circle cx="150" cy="72" r="8" fill="#0b5d6b"/>',
      "Earth science": '<path d="M20 150 L260 90 L260 150 Z" fill="#e3c796"/><path d="M60 140 Q140 110 250 96" fill="none" stroke="#3b7fb6" stroke-width="5"/><circle cx="230" cy="40" r="18" fill="#e8b36a"/>'
    };
    return '<figure class="illus" style="margin:0"><svg viewBox="0 0 280 170" role="img" aria-label="' + esc(a.imageAlt) + '"><rect width="280" height="170" fill="#faf7f1"/>' + (shapes[a.topic] || "") + '</svg></figure>';
  }
  function imageBlock(a) {
    if (prefs.dataSaver) return '<div class="alt-box"><p class="meta" style="margin:0"><strong>Image hidden (data saver on).</strong> Description: ' + esc(a.imageAlt) + '</p></div>';
    return illustration(a);
  }

  /* ---------- Router ---------- */
  function route() {
    var h = location.hash.replace(/^#\/?/, "") || "home";
    var parts = h.split("?")[0].split("/");
    var query = {};
    (h.split("?")[1] || "").split("&").forEach(function (kv) { if (kv) { var p = kv.split("="); query[p[0]] = decodeURIComponent(p[1] || ""); } });
    return { name: parts[0], id: parts[1], query: query };
  }
  var TITLES = { signin: "Sign in", home: "Home", find: "Find activities", activity: "Activity", saved: "Saved on this device", plans: "Session plans", plan: "Edit session plan", outbox: "Sync outbox", conflict: "Review conflict", device: "Device and data", help: "Help" };

  function render(opts) {
    opts = opts || {};
    var r = route();
    if (!session && r.name !== "signin" && r.name !== "help") { location.replace("#/signin"); return; }
    if (session && r.name === "signin") { location.replace("#/home"); return; }
    document.documentElement.style.setProperty("--text-scale", prefs.textScale);
    document.body.classList.toggle("data-saver", !!prefs.dataSaver);
    renderHeader(r); renderNav(r); renderHarness();
    var main = document.getElementById("main");
    var views = { signin: viewSignin, home: viewHome, find: viewFind, activity: viewActivity, saved: viewSaved, plans: viewPlans, plan: viewPlan, outbox: viewOutbox, conflict: viewConflict, device: viewDevice, help: viewHelp };
    var fn = views[r.name] || viewNotFound;
    main.innerHTML = fn(r);
    if (fn.after) fn.after(r);
    document.title = (TITLES[r.name] || "Not found") + " - STEMMate Namibia prototype";
    if (!opts.keepFocus) { var h1 = main.querySelector("h1"); if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus(); } }
  }

  function renderHeader() {
    var st = document.getElementById("header-status");
    var n = net();
    var html = n === "online" ? pill("ok", I.cloud, "Online") : n === "unstable" ? pill("warn", I.warn, "Unstable connection") : pill("warn", I.cloudOff, "Offline: working from this device");
    if (session) {
      var q = userStore().plans.filter(function (p) { return p.status === "queued" || p.status === "failed" || p.status === "conflict"; }).length;
      if (q) html += " " + pill("neutral", I.device, q + (q === 1 ? " plan" : " plans") + " not yet synced");
    }
    st.innerHTML = html;
    var act = document.getElementById("header-actions");
    act.innerHTML = session ? '<span class="who">Signed in: ' + esc(profile().label) + '</span><button class="btn small secondary" type="button" id="signout">Sign out and lock</button>' : "";
    var so = document.getElementById("signout");
    if (so) so.onclick = signOut;
    document.getElementById("version").textContent = D.version;
  }
  function renderNav(r) {
    var nav = document.getElementById("main-nav");
    if (!session) { nav.innerHTML = ""; nav.hidden = true; return; }
    nav.hidden = false;
    var s = userStore();
    var pending = s.plans.filter(function (p) { return p.status !== "synced" && p.status !== "draft"; }).length;
    var items = [["home", "Home"], ["find", "Find activities"], ["saved", "Saved (" + Object.keys(s.saved).length + ")"], ["plans", "Session plans"], ["outbox", "Sync outbox"], ["device", "Device and data"], ["help", "Help"]];
    var cur = r.name === "activity" ? "find" : r.name === "plan" ? "plans" : r.name === "conflict" ? "outbox" : r.name;
    nav.innerHTML = "<ul>" + items.map(function (it) {
      var extra = it[0] === "outbox" && pending ? ' <span class="count">' + pending + '<span class="visually-hidden"> waiting</span></span>' : "";
      return '<li><a href="#/' + it[0] + '"' + (cur === it[0] ? ' aria-current="page"' : "") + ">" + esc(it[1]) + extra + "</a></li>";
    }).join("") + "</ul>";
  }

  /* ---------- Evaluator harness ---------- */
  function renderHarness() {
    var b = document.getElementById("harness-body");
    b.innerHTML =
      '<fieldset><legend>Network condition</legend>' +
      [["online", "Online"], ["offline", "Offline"], ["unstable", "Unstable (uploads and downloads fail)"]].map(function (o) {
        return '<label class="check"><input type="radio" name="h-net" value="' + o[0] + '"' + (harness.network === o[0] ? " checked" : "") + "> " + o[1] + "</label>";
      }).join("") + (realOnline() ? "" : '<p class="hint">This browser is really offline, so the prototype treats the network as offline.</p>') + "</fieldset>" +
      '<fieldset><legend>Device and server</legend>' +
      '<label class="check"><input type="checkbox" id="h-full"' + (harness.storageFull ? " checked" : "") + "> Device storage full</label>" +
      '<label class="check"><input type="checkbox" id="h-conflict"' + (harness.conflictNext ? " checked" : "") + "> Server has a newer copy at next sync (conflict)</label>" +
      '<label class="check"><input type="checkbox" id="h-failnext"' + (harness.failNextUpload ? " checked" : "") + "> Fail the next upload only</label></fieldset>" +
      '<fieldset><legend>Test session</legend><p class="hint">Resets saved activities, plans and settings for both synthetic profiles.</p><button class="btn small danger" type="button" id="h-reset">Reset all demo data</button></fieldset>';
    Array.prototype.forEach.call(b.querySelectorAll('input[name="h-net"]'), function (el) {
      el.onchange = function () { var was = isOnline(); harness.network = el.value; save("harness", harness); announce("Simulated network set to " + el.value + "."); afterNetChange(was); };
    });
    document.getElementById("h-full").onchange = function (e) { harness.storageFull = e.target.checked; save("harness", harness); announce("Simulated storage full " + (e.target.checked ? "on" : "off") + "."); };
    document.getElementById("h-conflict").onchange = function (e) { harness.conflictNext = e.target.checked; save("harness", harness); announce("Server conflict at next sync " + (e.target.checked ? "on" : "off") + "."); };
    document.getElementById("h-failnext").onchange = function (e) { harness.failNextUpload = e.target.checked; save("harness", harness); announce("Fail next upload " + (e.target.checked ? "on" : "off") + "."); };
    document.getElementById("h-reset").onclick = function () {
      if (!confirm("Reset all demo data for both synthetic profiles?")) return;
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf(APP_KEY) === 0) localStorage.removeItem(k); });
      sessionStorage.clear(); location.hash = "#/signin"; location.reload();
    };
  }
  function afterNetChange(wasOnline) {
    renderHeader(route());
    if (!wasOnline && isOnline() && session) { announce("Connection restored. Syncing queued plans."); syncAll(); }
    if (route().name === "outbox" || route().name === "activity" || route().name === "home") render({ keepFocus: true });
  }
  window.addEventListener("online", function () { afterNetChange(false); });
  window.addEventListener("offline", function () { renderHeader(route()); announce("You are offline. Your work stays on this device."); });

  /* ---------- Sign in / out (shared device) ---------- */
  function viewSignin() {
    return '<h1>Sign in on this shared device</h1>' +
      '<p class="lead">Each facilitator has a private space on this device. Plans and drafts are only shown after sign-in.</p>' +
      '<div class="notice info">' + '<p><strong>Demo profiles (synthetic):</strong> Facilitator A uses PIN 1234. Volunteer B uses PIN 2468.</p></div>' +
      '<form id="signin-form" class="card" novalidate style="max-width:34rem">' +
      '<div id="signin-error"></div>' +
      '<fieldset><legend>Who is using the device?</legend>' +
      D.profiles.map(function (p, i) { return '<label class="check"><input type="radio" name="profile" value="' + p.id + '"' + (i === 0 ? " checked" : "") + "> " + esc(p.label) + " - " + esc(p.role) + "</label>"; }).join("") +
      "</fieldset>" +
      '<div class="field"><label for="pin">4-digit PIN</label><p class="hint" id="pin-hint">You can paste your PIN or use a password manager.</p>' +
      '<input type="password" id="pin" name="pin" inputmode="numeric" autocomplete="current-password" maxlength="4" aria-describedby="pin-hint">' +
      '<label class="check" style="margin-top:6px"><input type="checkbox" id="showpin"> Show PIN</label></div>' +
      '<button class="btn" type="submit">Sign in</button></form>';
  }
  viewSignin.after = function () {
    var f = document.getElementById("signin-form");
    document.getElementById("showpin").onchange = function (e) { document.getElementById("pin").type = e.target.checked ? "text" : "password"; };
    f.onsubmit = function (e) {
      e.preventDefault();
      var errBox = document.getElementById("signin-error"); var pin = document.getElementById("pin");
      var pid = f.querySelector('input[name="profile"]:checked').value;
      var p = D.profiles.filter(function (x) { return x.id === pid; })[0];
      if (Date.now() < lockUntil) { showErr("Too many incorrect attempts. Try again in " + Math.ceil((lockUntil - Date.now()) / 1000) + " seconds."); return; }
      if (!/^\d{4}$/.test(pin.value)) { showErr("Enter your 4-digit PIN using numbers only."); return; }
      if (pin.value !== p.pin) {
        pinFails++;
        if (pinFails >= 5) { lockUntil = Date.now() + 30000; pinFails = 0; showErr("Incorrect PIN 5 times. Sign-in is paused for 30 seconds to protect this profile."); }
        else showErr("That PIN is not correct for " + p.label + ". " + (5 - pinFails) + " attempts left before a short pause.");
        return;
      }
      pinFails = 0;
      session = { profileId: pid }; sessionStorage.setItem(APP_KEY + ".session", JSON.stringify(session));
      announce("Signed in as " + p.label + ".");
      location.hash = "#/home";
      function showErr(msg) {
        pin.setAttribute("aria-invalid", "true"); pin.setAttribute("aria-describedby", "pin-hint pin-err");
        errBox.innerHTML = '<p class="error-text" id="pin-err">' + I.err + "<span>" + esc(msg) + "</span></p>";
        pin.focus(); alertMsg(msg);
      }
    };
  };
  function signOut() {
    Object.keys(retryTimers).forEach(function (k) { clearTimeout(retryTimers[k]); });
    session = null; sessionStorage.removeItem(APP_KEY + ".session");
    announce("Signed out. This profile is locked.");
    location.hash = "#/signin";
  }

  /* ---------- Home ---------- */
  function viewHome() {
    var s = userStore();
    var drafts = s.plans.filter(function (p) { return p.status === "draft"; });
    var attention = s.plans.filter(function (p) { return p.status === "failed" || p.status === "conflict"; });
    var queued = s.plans.filter(function (p) { return p.status === "queued"; });
    var h = "<h1>Good day. What would you like to prepare?</h1>";
    h += isOnline() ? '<p class="lead">You are online. Save activities now so they are ready when you travel.</p>' : '<p class="lead">You are offline. Saved activities and plans still work. Changes will sync later.</p>';
    if (attention.length) h += '<div class="notice err" role="region" aria-labelledby="att-h"><h2 id="att-h">' + I.warn + "Needs your attention</h2><ul>" + attention.map(function (p) { return '<li><a href="#/' + (p.status === "conflict" ? "conflict/" : "outbox") + (p.status === "conflict" ? p.id : "") + '">' + esc(p.title || "Untitled plan") + "</a>: " + PLAN_STATUS[p.status].text + "</li>"; }).join("") + "</ul></div>";
    h += '<div class="grid-2">';
    h += '<section class="card" aria-labelledby="h-a"><h2 id="h-a" style="margin-top:0">Find and save an activity</h2><p>Filter by level, topic, time and the materials you have.</p><a class="btn" href="#/find">Find activities</a></section>';
    h += '<section class="card" aria-labelledby="h-b"><h2 id="h-b" style="margin-top:0">Plan a session</h2>' + (drafts.length ? '<p>You have ' + drafts.length + ' draft' + (drafts.length > 1 ? "s" : "") + '. Last: <strong>' + esc(drafts[drafts.length - 1].title || "Untitled plan") + "</strong>.</p><a class=\"btn\" href=\"#/plan/" + drafts[drafts.length - 1].id + '">Continue draft</a>' : "<p>Build a plan from an activity saved on this device.</p><a class=\"btn\" href=\"#/plan/new\">New session plan</a>") + "</section>";
    h += "</div>";
    h += '<h2>On this device</h2><dl class="dl"><dt>Saved activities</dt><dd>' + Object.keys(s.saved).length + ' (' + fmtKB(usedKB(s)) + ' of ' + fmtKB(D.storageLimitKB) + ')</dd><dt>Plans waiting to sync</dt><dd>' + queued.length + '</dd><dt>Data saver</dt><dd>' + (prefs.dataSaver ? "On (images hidden)" : "Off") + ' - <a href="#/device">change</a></dd></dl>';
    return h;
  }

  /* ---------- WF1: Find ---------- */
  function filterActivities() {
    var q = findState.q.trim().toLowerCase();
    return D.activities.filter(function (a) {
      if (findState.level && a.level !== findState.level) return false;
      if (findState.topic && a.topic !== findState.topic) return false;
      if (findState.maxMin && a.minutes > Number(findState.maxMin)) return false;
      if (findState.materials.length && !a.materials.every(function (m) { return findState.materials.indexOf(m) > -1; })) return false;
      if (q && (a.title + " " + a.summary).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }
  function viewFind() {
    var sel = function (id, label, opts, val, anyLabel) {
      return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '"><option value="">' + anyLabel + "</option>" + opts.map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(val) === String(v) ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") + "</select></div>";
    };
    return "<h1>Find activities</h1>" +
      '<p class="lead">The activity list is stored on this device, so filtering works offline. Full guides need saving before offline use.</p>' +
      '<div class="layout-find"><form id="filters" class="card" role="search" aria-label="Filter activities" onsubmit="return false">' +
      '<div class="field"><label for="f-q">Search words</label><input type="search" id="f-q" value="' + esc(findState.q) + '" autocomplete="off"></div>' +
      sel("f-level", "Level", D.levels, findState.level, "Any level") +
      sel("f-topic", "Topic", D.topics, findState.topic, "Any topic") +
      sel("f-min", "Maximum time", [["20", "20 minutes or less"], ["30", "30 minutes or less"], ["45", "45 minutes or less"], ["60", "60 minutes or less"]], findState.maxMin, "Any length") +
      '<fieldset><legend>Materials I have</legend><p class="hint">Shows activities that need only the materials you tick.</p><div class="checks">' +
      D.materials.map(function (m, i) { return '<label class="check"><input type="checkbox" name="mat" value="' + esc(m) + '"' + (findState.materials.indexOf(m) > -1 ? " checked" : "") + "> " + esc(m) + "</label>"; }).join("") +
      '</div></fieldset><button class="btn secondary" type="button" id="f-clear">Clear all filters</button></form>' +
      '<section aria-labelledby="res-h"><h2 id="res-h" style="margin-top:0">Results</h2><p id="res-count" role="status" aria-live="polite"></p><div id="res-list"></div></section></div>';
  }
  viewFind.after = function () {
    var f = document.getElementById("filters");
    function update(announceIt) {
      findState.q = document.getElementById("f-q").value;
      findState.level = document.getElementById("f-level").value;
      findState.topic = document.getElementById("f-topic").value;
      findState.maxMin = document.getElementById("f-min").value;
      findState.materials = Array.prototype.map.call(f.querySelectorAll('input[name="mat"]:checked'), function (x) { return x.value; });
      drawResults();
    }
    f.addEventListener("input", function () { update(true); });
    f.addEventListener("change", function () { update(true); });
    document.getElementById("f-clear").onclick = function () { findState = { q: "", level: "", topic: "", maxMin: "", materials: [] }; render({ keepFocus: true }); document.getElementById("f-q").focus(); announce("All filters cleared. Showing all " + D.activities.length + " activities."); };
    drawResults();
  };
  function activeFilterList() {
    var l = [];
    if (findState.q) l.push(["q", 'Words: "' + findState.q + '"']);
    if (findState.level) l.push(["level", "Level: " + findState.level]);
    if (findState.topic) l.push(["topic", "Topic: " + findState.topic]);
    if (findState.maxMin) l.push(["maxMin", "Time: " + findState.maxMin + " min or less"]);
    findState.materials.forEach(function (m) { l.push(["mat:" + m, "Material: " + m]); });
    return l;
  }
  function drawResults() {
    var list = filterActivities(); var s = userStore();
    var count = document.getElementById("res-count"); var box = document.getElementById("res-list");
    count.textContent = list.length ? list.length + (list.length === 1 ? " activity matches" : " activities match") + " your filters." : "No activities match your filters.";
    if (!list.length) {
      /* No-results path: no activity is rendered, so a missing activity cannot be selected. */
      var af = activeFilterList();
      box.innerHTML = '<div class="notice warn"><h3>' + I.warn + 'No matching activities</h3><p>Try removing one filter. Ticking more materials usually widens the results.</p>' +
        (af.length ? '<p><strong>Active filters</strong> (select one to remove it):</p><ul class="btn-row" style="list-style:none;padding:0">' + af.map(function (x) { return '<li><button class="btn small secondary" type="button" data-rm="' + esc(x[0]) + '">Remove ' + esc(x[1]) + "</button></li>"; }).join("") + "</ul>" : "") +
        '<button class="btn" type="button" id="nr-clear">Clear all filters</button></div>';
      Array.prototype.forEach.call(box.querySelectorAll("[data-rm]"), function (b) {
        b.onclick = function () {
          var k = b.getAttribute("data-rm");
          if (k.indexOf("mat:") === 0) findState.materials = findState.materials.filter(function (m) { return m !== k.slice(4); }); else findState[k] = "";
          render({ keepFocus: true }); document.getElementById("res-h").setAttribute("tabindex", "-1"); document.getElementById("res-h").focus();
          announce("Filter removed. " + document.getElementById("res-count").textContent);
        };
      });
      document.getElementById("nr-clear").onclick = function () { document.getElementById("f-clear").click(); };
      return;
    }
    box.innerHTML = '<ul class="results">' + list.map(function (a) {
      var saved = !!s.saved[a.id];
      return '<li class="card result"><h3><a href="#/activity/' + a.id + '">' + esc(a.title) + "</a></h3>" +
        '<p class="meta" style="margin:0">' + esc(a.level) + " · " + esc(a.topic) + " · " + a.minutes + " min · download " + fmtKB(a.sizeKB) + "</p>" +
        "<p style=\"margin:6px 0 0\">" + esc(a.summary) + "</p>" +
        '<div class="tags">' + (saved ? pill("ok", I.ok, "Saved on this device") : pill("neutral", I.cloud, "Not saved yet")) + a.materials.map(function (m) { return '<span class="tag">' + esc(m) + "</span>"; }).join("") + "</div></li>";
    }).join("") + "</ul>";
  }

  /* ---------- WF1: Activity detail + save for offline ---------- */
  function viewActivity(r) {
    var a = activity(r.id);
    if (!a) return viewNotFound();
    var s = userStore(); var saved = !!s.saved[a.id]; var fullAvailable = saved || isOnline();
    var h = '<p><a href="#/find">Back to results</a></p><h1>' + esc(a.title) + "</h1>";
    h += '<p class="meta">' + esc(a.level) + " · " + esc(a.topic) + " · " + a.minutes + " minutes · download size " + fmtKB(a.sizeKB) + "</p>";
    h += '<div id="save-area" aria-live="polite">' + saveAreaHtml(a) + "</div>";
    h += '<div class="grid-2"><div>' + imageBlock(a) + "</div><div><p>" + esc(a.summary) + "</p><h2>Materials</h2><ul>" + a.materials.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul></div></div>";
    if (fullAvailable) {
      h += "<h2>Steps</h2><ol>" + a.steps.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol>";
      h += "<h2>Safety</h2><p>" + esc(a.safety) + "</p><h2>Inclusion prompt</h2><p>" + esc(a.inclusion) + "</p>";
    } else {
      h += '<div class="notice warn"><h2>' + I.cloudOff + "Full guide not on this device</h2><p>You are offline and this activity has not been saved. Steps, safety notes and inclusion prompts will be available after you save it with a connection.</p></div>";
    }
    return h;
  }
  function saveAreaHtml(a) {
    var s = userStore(); var d = downloads[a.id];
    if (s.saved[a.id]) return '<div class="notice ok"><p><strong>' + "Saved on this device</strong> on " + dateTimeStr(s.saved[a.id].savedAt) + ". It works without a connection.</p>" + '<div class="btn-row"><a class="btn" href="#/plan/new?act=' + a.id + '">Plan a session with this activity</a><button type="button" class="btn secondary" data-remove="' + a.id + '">Remove from device</button></div></div>';
    if (d && d.state === "progress") return '<div class="card"><p id="dl-label"><strong>Saving for offline use...</strong> ' + d.pct + '% of ' + fmtKB(a.sizeKB) + '</p><progress max="100" value="' + d.pct + '" aria-labelledby="dl-label"></progress><div class="btn-row"><button class="btn secondary" type="button" id="dl-cancel">Cancel saving</button></div></div>';
    if (d && d.state === "error") return '<div class="notice err" id="save-error" tabindex="-1"><h2>' + I.err + esc(d.title) + "</h2><p>" + esc(d.message) + '</p><div class="btn-row"><button class="btn" type="button" id="dl-retry">Retry save</button>' + (d.kind === "storage" ? '<a class="btn secondary" href="#/saved">Free up space</a>' : "") + '<a class="btn secondary" href="#/find">Keep browsing</a></div></div>';
    return '<div class="btn-row"><button class="btn" type="button" id="dl-start">' + I.device + "Save for offline use (" + fmtKB(a.sizeKB) + ")</button></div>" + (net() === "offline" ? '<p class="meta">You are offline. Saving needs a connection.</p>' : '<p class="meta">Uses about ' + fmtKB(a.sizeKB) + " of mobile data.</p>");
  }
  viewActivity.after = function (r) { bindSaveArea(activity(r.id)); };
  function bindSaveArea(a) {
    if (!a) return;
    var st = document.getElementById("dl-start"); if (st) st.onclick = function () { startSave(a); };
    var rt = document.getElementById("dl-retry"); if (rt) rt.onclick = function () { startSave(a); };   // Retry re-enters the same save routine
    var cc = document.getElementById("dl-cancel"); if (cc) cc.onclick = function () { clearInterval(downloads[a.id].timer); delete downloads[a.id]; refreshSave(a); announce("Saving cancelled. Nothing was stored."); focusIn("#dl-start"); };
    var rm = document.querySelector("[data-remove]"); if (rm) rm.onclick = function () { removeSaved(a.id); refreshSave(a); focusIn("#dl-start"); };
  }
  function refreshSave(a) { var el = document.getElementById("save-area"); if (!el) return; el.innerHTML = saveAreaHtml(a); bindSaveArea(a); renderNav(route()); }
  function focusIn(sel) { var el = document.querySelector(sel); if (el) el.focus(); }
  function failSave(a, kind, title, message) {
    downloads[a.id] = { state: "error", kind: kind, title: title, message: message };
    refreshSave(a); alertMsg(title + ". " + message); focusIn("#dl-retry");
  }
  function startSave(a) {
    var s = userStore();
    if (net() === "offline") return failSave(a, "offline", "Cannot save while offline", "Nothing was downloaded. Connect to Wi-Fi or mobile data, then select Retry save.");
    var needed = a.sizeKB, free = D.storageLimitKB - usedKB(s);
    if (harness.storageFull || needed > free) return failSave(a, "storage", "Not enough space on this device", "This activity needs " + fmtKB(needed) + " but only " + fmtKB(harness.storageFull ? 0 : free) + " is free. Remove a saved activity you no longer need, then select Retry save.");
    downloads[a.id] = { state: "progress", pct: 0 };
    refreshSave(a); announce("Saving " + a.title + " for offline use."); focusIn("#dl-cancel");
    downloads[a.id].timer = setInterval(function () {
      var d = downloads[a.id]; if (!d) return;
      d.pct = Math.min(100, d.pct + 20);
      if (net() === "offline" || (net() === "unstable" && d.pct >= 60)) {
        clearInterval(d.timer);
        return failSave(a, "network", "Download interrupted at " + d.pct + "%", "The connection dropped. Partial files were discarded so nothing is half-saved. Select Retry save when the connection is steadier.");
      }
      if (d.pct >= 100) {
        clearInterval(d.timer); delete downloads[a.id];
        var st = userStore(); st.saved[a.id] = { savedAt: now().toISOString() }; putUserStore(st);
        refreshSave(a); announce(a.title + " saved on this device. It works offline."); renderHeader(route());
        var btn = document.querySelector('#save-area a.btn'); if (btn) btn.focus();
        return;
      }
      var p = document.querySelector("#save-area progress"), l = document.getElementById("dl-label");
      if (p) p.value = d.pct; if (l) l.innerHTML = "<strong>Saving for offline use...</strong> " + d.pct + "% of " + fmtKB(a.sizeKB);
    }, 350);
  }
  function removeSaved(id) {
    var s = userStore(); var inUse = s.plans.some(function (p) { return p.activityId === id && p.status !== "synced"; });
    if (inUse && !confirm("A plan that is not yet synced uses this activity. Remove the saved guide anyway? The plan itself will be kept.")) return;
    delete s.saved[id]; putUserStore(s); announce("Activity removed from this device.");
  }

  /* ---------- Saved ---------- */
  function viewSaved() {
    var s = userStore(); var ids = Object.keys(s.saved);
    var h = "<h1>Saved on this device</h1><p>Storage used: <strong>" + fmtKB(usedKB(s)) + "</strong> of " + fmtKB(D.storageLimitKB) + ' for offline activities.</p><meter class="meter" min="0" max="' + D.storageLimitKB + '" value="' + usedKB(s) + '" aria-label="Offline storage used">' + fmtKB(usedKB(s)) + "</meter>";
    if (!ids.length) return h + '<div class="notice info"><p>No activities saved yet. <a href="#/find">Find an activity</a> and select "Save for offline use".</p></div>';
    h += '<div class="table-wrap"><table><caption>Activities available offline</caption><thead><tr><th scope="col">Activity</th><th scope="col">Size</th><th scope="col">Saved</th><th scope="col">Actions</th></tr></thead><tbody>';
    ids.forEach(function (id) { var a = activity(id); h += '<tr><th scope="row"><a href="#/activity/' + id + '">' + esc(a.title) + "</a></th><td>" + fmtKB(a.sizeKB) + "</td><td>" + dateTimeStr(s.saved[id].savedAt) + '</td><td><div class="btn-row" style="margin:0"><a class="btn small" href="#/plan/new?act=' + id + '">Plan with this</a><button class="btn small danger" type="button" data-rm="' + id + '" aria-label="Remove ' + esc(a.title) + ' from device">Remove</button></div></td></tr>'; });
    return h + "</tbody></table></div>";
  }
  viewSaved.after = function () {
    Array.prototype.forEach.call(document.querySelectorAll("[data-rm]"), function (b) { b.onclick = function () { removeSaved(b.getAttribute("data-rm")); render({ keepFocus: true }); focusIn("h1"); }; });
  };

  /* ---------- WF2: Plans list ---------- */
  function viewPlans() {
    var s = userStore();
    var h = '<h1>Session plans</h1><div class="btn-row"><a class="btn" href="#/plan/new">New session plan</a></div>';
    if (!s.plans.length) return h + '<p>No plans yet.</p>';
    h += '<div class="table-wrap"><table><caption>Your plans on this device</caption><thead><tr><th scope="col">Plan</th><th scope="col">Session date</th><th scope="col">Status</th><th scope="col">Last change</th></tr></thead><tbody>';
    s.plans.slice().reverse().forEach(function (p) { h += '<tr><th scope="row"><a href="#/plan/' + p.id + '">' + esc(p.title || "Untitled plan") + "</a></th><td>" + esc(p.date || "Not set") + "</td><td>" + planPill(p) + "</td><td>" + dateTimeStr(p.updatedAt) + "</td></tr>"; });
    return h + "</tbody></table></div>";
  }

  /* ---------- WF2: Plan editor ---------- */
  var editing = null; var autosaveT = null; var lastSaveOk = true;
  function newPlanFrom(a) {
    return { id: uid(), title: a ? a.title + " session" : "", activityId: a ? a.id : "", date: "", groupSize: "",
      steps: a ? a.steps.map(function (t, i) { return { text: t, minutes: Math.max(5, Math.round(a.minutes / a.steps.length)) }; }) : [{ text: "", minutes: 10 }],
      materials: a ? a.materials.map(function (m) { return { name: m, have: false }; }) : [],
      safety: a ? a.safety : "", inclusion: a ? a.inclusion : "",
      status: "draft", localVersion: 1, baseServerVersion: 0, attempts: 0, updatedAt: now().toISOString(), log: [{ t: now().toISOString(), m: "Draft created on this device" }] };
  }
  function viewPlan(r) {
    var s = userStore(); var savedIds = Object.keys(s.saved);
    if (r.id === "new") {
      var a = r.query.act ? activity(r.query.act) : null;
      if (!a && !savedIds.length) return '<h1>New session plan</h1><div class="notice warn"><h2>' + I.warn + 'Save an activity first</h2><p>Plans are built from activities saved on this device, so you can plan without a connection.</p><p><a href="#/find">Find and save an activity</a></p></div>';
      if (!a) a = activity(savedIds[0]);
      editing = newPlanFrom(a); s.plans.push(editing); putUserStore(s);
      history.replaceState(null, "", "#/plan/" + editing.id);
    } else {
      editing = s.plans.filter(function (p) { return p.id === r.id; })[0];
      if (!editing) return viewNotFound();
    }
    var p = editing; var locked = p.status === "syncing";
    var h = '<p><a href="#/plans">All plans</a></p><h1>Edit session plan</h1>';
    h += '<p>' + planPill(p) + ' <span id="autosave" role="status" aria-live="polite" class="meta">' + (p.status === "draft" ? "Changes save automatically on this device." : "") + "</span></p>";
    if (p.status !== "draft" && p.status !== "syncing") h += '<div class="notice info"><p>Editing a ' + (p.status === "synced" ? "synced" : "queued") + ' plan returns it to draft. Queue it again when you are done.</p></div>';
    h += '<div id="error-summary"></div>';
    h += '<form id="plan-form" novalidate' + (locked ? ' aria-busy="true"' : "") + ">";
    h += '<div class="field"><label for="p-title">Plan title <span aria-hidden="true">*</span><span class="visually-hidden">(required)</span></label><input type="text" id="p-title" value="' + esc(p.title) + '" required aria-required="true"><div id="p-title-err"></div></div>';
    h += '<div class="field"><label for="p-date">Session date <span aria-hidden="true">*</span><span class="visually-hidden">(required)</span></label><input type="date" id="p-date" value="' + esc(p.date) + '" required aria-required="true"><div id="p-date-err"></div></div>';
    h += '<div class="field"><label for="p-act">Activity (saved on this device)</label><select id="p-act">' + savedIds.concat(p.activityId && savedIds.indexOf(p.activityId) === -1 ? [p.activityId] : []).map(function (id) { var a = activity(id); return '<option value="' + id + '"' + (id === p.activityId ? " selected" : "") + ">" + esc(a.title) + (s.saved[id] ? "" : " (guide removed from device)") + "</option>"; }).join("") + "</select></div>";
    h += '<div class="field"><label for="p-size">Expected number of learners</label><p class="hint" id="p-size-hint">A number only. Never enter learner names or photos.</p><input type="number" id="p-size" min="1" max="200" inputmode="numeric" value="' + esc(p.groupSize) + '" aria-describedby="p-size-hint"><div id="p-size-err"></div></div>';
    h += '<h2 id="steps-h">Steps</h2><p class="totals" id="totals" aria-live="polite"></p><div id="steps"></div><button class="btn secondary" type="button" id="add-step">Add a step</button>';
    h += '<h2>Materials checklist</h2><fieldset><legend>Tick materials you already have</legend><div class="checks" id="mat-list"></div></fieldset>';
    h += '<div class="field"><label for="p-extra">Add another material</label><div class="btn-row" style="margin:0"><input type="text" id="p-extra" style="max-width:20rem"><button class="btn secondary" type="button" id="add-mat">Add material</button></div></div>';
    h += '<div class="field"><label for="p-safety">Safety notes <span aria-hidden="true">*</span><span class="visually-hidden">(required)</span></label><textarea id="p-safety" required aria-required="true">' + esc(p.safety) + '</textarea><div id="p-safety-err"></div></div>';
    h += '<div class="field"><label for="p-incl">Inclusion prompts</label><p class="hint" id="p-incl-hint">How will every learner take part? For example roles, spoken and written instructions.</p><textarea id="p-incl" aria-describedby="p-incl-hint">' + esc(p.inclusion) + "</textarea></div>";
    h += '<div class="btn-row"><button class="btn" type="submit">' + I.sync + 'Mark ready and queue for sync</button><a class="btn secondary" href="#/plans">Finish later</a><button class="btn danger" type="button" id="del-plan">Delete plan</button></div></form>';
    return h;
  }
  viewPlan.after = function () {
    if (!editing || !document.getElementById("plan-form")) return;
    drawSteps(); drawMats();
    var f = document.getElementById("plan-form");
    f.addEventListener("input", function (e) { if (e.target.id === "p-extra") return; readForm(); scheduleAutosave(); if (e.target.closest(".step")) updateTotals(); });
    f.addEventListener("change", function (e) { if (e.target.id === "p-extra") return; readForm(); scheduleAutosave(); });
    document.getElementById("add-step").onclick = function () { readForm(); editing.steps.push({ text: "", minutes: 10 }); drawSteps(); scheduleAutosave(); focusIn("#s-text-" + (editing.steps.length - 1)); announce("Step " + editing.steps.length + " added."); };
    document.getElementById("add-mat").onclick = function () { var v = document.getElementById("p-extra").value.trim(); if (!v) { focusIn("#p-extra"); return; } readForm(); editing.materials.push({ name: v, have: true }); document.getElementById("p-extra").value = ""; drawMats(); scheduleAutosave(); announce(v + " added to materials."); focusIn("#p-extra"); };
    document.getElementById("del-plan").onclick = function () { if (!confirm("Delete this plan from this device? This cannot be undone.")) return; var s = userStore(); s.plans = s.plans.filter(function (p) { return p.id !== editing.id; }); putUserStore(s); announce("Plan deleted."); location.hash = "#/plans"; };
    f.onsubmit = function (e) { e.preventDefault(); readForm(); submitPlan(); };
  };
  function drawSteps() {
    var box = document.getElementById("steps"); var n = editing.steps.length;
    box.innerHTML = editing.steps.map(function (st, i) {
      return '<fieldset class="step"><legend>Step ' + (i + 1) + " of " + n + '</legend>' +
        '<div class="field"><label for="s-text-' + i + '">What happens in step ' + (i + 1) + '</label><textarea id="s-text-' + i + '" data-i="' + i + '" data-k="text">' + esc(st.text) + '</textarea><div id="s-text-' + i + '-err"></div></div>' +
        '<div class="field"><label for="s-min-' + i + '">Minutes for step ' + (i + 1) + '</label><input type="number" id="s-min-' + i + '" data-i="' + i + '" data-k="minutes" min="1" max="120" inputmode="numeric" value="' + esc(st.minutes) + '"><div id="s-min-' + i + '-err"></div></div>' +
        '<div class="step-actions"><button type="button" class="btn small secondary" data-mv="up" data-i="' + i + '"' + (i === 0 ? ' aria-disabled="true"' : "") + ' aria-label="Move step ' + (i + 1) + ' up">Move up</button>' +
        '<button type="button" class="btn small secondary" data-mv="down" data-i="' + i + '"' + (i === n - 1 ? ' aria-disabled="true"' : "") + ' aria-label="Move step ' + (i + 1) + ' down">Move down</button>' +
        '<button type="button" class="btn small danger" data-mv="rm" data-i="' + i + '"' + (n === 1 ? ' aria-disabled="true"' : "") + ' aria-label="Remove step ' + (i + 1) + '">Remove</button></div></fieldset>';
    }).join("");
    Array.prototype.forEach.call(box.querySelectorAll("[data-mv]"), function (b) {
      b.onclick = function () {
        if (b.getAttribute("aria-disabled") === "true") { announce(b.getAttribute("data-mv") === "rm" ? "A plan needs at least one step." : "This step cannot move further."); return; }
        readForm(); var i = +b.getAttribute("data-i"), mv = b.getAttribute("data-mv"), st = editing.steps, j = i;
        if (mv === "up") { st.splice(i - 1, 0, st.splice(i, 1)[0]); j = i - 1; }
        if (mv === "down") { st.splice(i + 1, 0, st.splice(i, 1)[0]); j = i + 1; }
        if (mv === "rm") { st.splice(i, 1); j = Math.min(i, st.length - 1); }
        drawSteps(); scheduleAutosave();
        if (mv === "rm") { focusIn("#s-text-" + j); announce("Step removed. " + st.length + " steps remain."); }
        else { var target = document.querySelector('[data-mv="' + mv + '"][data-i="' + j + '"]'); if (target && target.getAttribute("aria-disabled") !== "true") target.focus(); else focusIn("#s-text-" + j); announce("Step moved to position " + (j + 1) + "."); }
      };
    });
    updateTotals();
  }
  function updateTotals() {
    var total = editing.steps.reduce(function (t, s) { return t + (Number(s.minutes) || 0); }, 0);
    var a = activity(editing.activityId); var el = document.getElementById("totals"); if (!el) return;
    el.innerHTML = "Total time: " + total + " minutes" + (a ? " (activity guide suggests " + a.minutes + ")" : "") + (a && total > a.minutes + 15 ? ' <span class="pill warn">' + I.warn + "<span>Longer than suggested</span></span>" : "");
  }
  function drawMats() {
    var box = document.getElementById("mat-list");
    box.innerHTML = editing.materials.length ? editing.materials.map(function (m, i) { return '<label class="check"><input type="checkbox" data-mat="' + i + '"' + (m.have ? " checked" : "") + "> " + esc(m.name) + "</label>"; }).join("") : '<p class="meta">No materials listed.</p>';
  }
  function readForm() {
    var g = function (id) { var el = document.getElementById(id); return el ? el.value : ""; };
    var oldStatus = editing.status;
    editing.title = g("p-title"); editing.date = g("p-date"); editing.groupSize = g("p-size"); editing.safety = g("p-safety"); editing.inclusion = g("p-incl");
    var act = g("p-act"); if (act && act !== editing.activityId) { editing.activityId = act; }
    Array.prototype.forEach.call(document.querySelectorAll("#steps [data-k]"), function (el) { editing.steps[+el.getAttribute("data-i")][el.getAttribute("data-k")] = el.value; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-mat]"), function (el) { editing.materials[+el.getAttribute("data-mat")].have = el.checked; });
    if (oldStatus === "queued" || oldStatus === "synced" || oldStatus === "failed") { editing.status = "draft"; }
  }
  function scheduleAutosave() {
    clearTimeout(autosaveT);
    var el = document.getElementById("autosave"); if (el && lastSaveOk) el.textContent = "Saving draft...";
    autosaveT = setTimeout(persistDraft, 700);
  }
  function persistDraft() {
    var el = document.getElementById("autosave");
    if (harness.storageFull) {
      lastSaveOk = false;
      if (el) el.innerHTML = '<span class="error-text" style="display:inline-flex">' + I.err + '<span>Draft not saved: device storage is full. Your changes are still on screen.</span></span> <button type="button" class="linklike" id="retry-draft">Retry saving draft</button>';
      var b = document.getElementById("retry-draft"); if (b) b.onclick = function () { persistDraft(); };
      return false;
    }
    editing.updatedAt = now().toISOString(); editing.localVersion++;
    var s = userStore(); var idx = s.plans.findIndex(function (p) { return p.id === editing.id; });
    if (idx > -1) s.plans[idx] = editing; else s.plans.push(editing);
    putUserStore(s); lastSaveOk = true;
    if (el) el.innerHTML = pill("ok", I.ok, "Draft saved on this device at " + timeStr(editing.updatedAt));
    renderHeader(route());
    return true;
  }
  function validate(p) {
    var errs = [];
    if (!p.title.trim()) errs.push(["p-title", "Enter a plan title."]);
    if (!p.date) errs.push(["p-date", "Enter the session date."]);
    if (p.groupSize !== "" && (!/^\d+$/.test(p.groupSize) || +p.groupSize < 1 || +p.groupSize > 200)) errs.push(["p-size", "Expected number of learners must be a whole number from 1 to 200."]);
    p.steps.forEach(function (s, i) {
      if (!String(s.text).trim()) errs.push(["s-text-" + i, "Describe what happens in step " + (i + 1) + "."]);
      if (!/^\d+$/.test(String(s.minutes)) || +s.minutes < 1 || +s.minutes > 120) errs.push(["s-min-" + i, "Minutes for step " + (i + 1) + " must be a whole number from 1 to 120."]);
    });
    if (!p.safety.trim()) errs.push(["p-safety", "Add at least one safety note."]);
    /* Privacy guard (PR-01): block contact details that could identify a person. */
    var blob = [p.title, p.safety, p.inclusion].concat(p.steps.map(function (s) { return s.text; })).join(" ");
    if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(blob) || /(\+?264|\b0)\s?8\d[\s-]?\d{3}[\s-]?\d{4}/.test(blob)) errs.push(["p-safety", "Remove email addresses or phone numbers. Plans must not contain personal contact details."]);
    return errs;
  }
  function submitPlan() {
    Array.prototype.forEach.call(document.querySelectorAll("[aria-invalid]"), function (el) { el.removeAttribute("aria-invalid"); if (el.hasAttribute("data-desc")) { var d0 = el.getAttribute("data-desc"); if (d0) el.setAttribute("aria-describedby", d0); else el.removeAttribute("aria-describedby"); } });
    Array.prototype.forEach.call(document.querySelectorAll('[id$="-err"]'), function (el) { el.innerHTML = ""; });
    var errs = validate(editing); var sum = document.getElementById("error-summary");
    if (errs.length) {
      errs.forEach(function (e, idx) {
        var inp = document.getElementById(e[0]), box = document.getElementById(e[0] + "-err");
        var mid = "msg-" + e[0] + "-" + idx;
        if (inp) { if (!inp.hasAttribute("data-desc")) inp.setAttribute("data-desc", inp.getAttribute("aria-describedby") || ""); inp.setAttribute("aria-invalid", "true"); inp.setAttribute("aria-describedby", ((inp.getAttribute("aria-describedby") || "") + " " + mid).trim()); }
        if (box) box.innerHTML += '<p class="error-text" id="' + mid + '">' + I.err + "<span>" + esc(e[1]) + "</span></p>";
      });
      sum.innerHTML = '<div class="notice err error-summary" tabindex="-1" id="err-box"><h2>' + I.err + "There " + (errs.length === 1 ? "is 1 problem" : "are " + errs.length + " problems") + " to fix</h2><ul>" + errs.map(function (e) { return '<li><a href="#' + e[0] + '" data-jump="' + e[0] + '">' + esc(e[1]) + "</a></li>"; }).join("") + "</ul><p>Your draft is still saved on this device.</p></div>";
      Array.prototype.forEach.call(sum.querySelectorAll("[data-jump]"), function (a) { a.onclick = function (ev) { ev.preventDefault(); focusIn("#" + a.getAttribute("data-jump")); }; });
      document.getElementById("err-box").focus();
      return;
    }
    sum.innerHTML = "";
    if (!persistDraft()) { alertMsg("The plan could not be queued because device storage is full. Your changes are still on screen."); focusIn("#retry-draft"); return; }
    editing.status = "queued"; editing.log.push({ t: now().toISOString(), m: "Marked ready and queued for sync" });
    var s = userStore(); var idx = s.plans.findIndex(function (p) { return p.id === editing.id; }); s.plans[idx] = editing; putUserStore(s);
    save("flash", isOnline() ? "Plan queued. Uploading now." : "Plan queued on this device. It will sync automatically when you are back online.");
    location.hash = "#/outbox";
    if (isOnline()) setTimeout(function () { syncOne(editing.id); }, 300);
  }

  /* ---------- WF3: Sync engine (simulated server) ---------- */
  function updatePlan(id, fn) { var s = userStore(); var p = s.plans.filter(function (x) { return x.id === id; })[0]; if (!p) return null; fn(p); putUserStore(s); return p; }
  function syncAll() { userStore().plans.forEach(function (p) { if (p.status === "queued" || p.status === "failed") syncOne(p.id); }); }
  function syncOne(id, opts) {
    opts = opts || {};
    clearTimeout(retryTimers[id]);
    var p = userStore().plans.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    if (!isOnline()) { updatePlan(id, function (x) { x.status = "queued"; x.log.push({ t: now().toISOString(), m: "Still offline: kept in queue" }); }); refreshOutbox(); announce("Still offline. The plan stays queued on this device."); return; }
    updatePlan(id, function (x) { x.status = "syncing"; x.attempts = (x.attempts || 0) + 1; x.lastAttempt = now().toISOString(); x.log.push({ t: now().toISOString(), m: "Upload attempt " + x.attempts + (opts.merged ? " (merged plan)" : "") }); });
    refreshOutbox(); announce("Syncing " + (p.title || "plan") + ".");
    setTimeout(function () {
      var failNow = net() === "offline" || net() === "unstable" || harness.failNextUpload;
      if (harness.failNextUpload) { harness.failNextUpload = false; save("harness", harness); renderHarness(); }
      if (failNow) {
        var q = updatePlan(id, function (x) { x.status = "failed"; x.nextRetry = new Date(Date.now() + RETRY_DELAY_S * 1000).toISOString(); x.log.push({ t: now().toISOString(), m: "Upload failed: connection lost. Plan kept on this device" + (opts.merged ? " with your merged changes" : "") }); });
        if (q.attempts < MAX_ATTEMPTS) retryTimers[id] = setTimeout(function () { if (session && isOnline()) syncOne(id, opts); }, RETRY_DELAY_S * 1000);
        refreshOutbox(); alertMsg("Upload failed for " + (q.title || "plan") + ". It is safe on this device." + (q.attempts < MAX_ATTEMPTS ? " Automatic retry in " + RETRY_DELAY_S + " seconds." : ""));
        return;
      }
      if (harness.conflictNext && !opts.merged) {
        harness.conflictNext = false; save("harness", harness); renderHarness();
        updatePlan(id, function (x) {
          x.status = "conflict";
          var srvSteps = JSON.parse(JSON.stringify(x.steps));
          var k = Math.min(2, srvSteps.length - 1);
          srvSteps[k] = { text: "Shortened by coordinator: " + String(srvSteps[k].text).split(".")[0] + ".", minutes: Math.max(5, (+srvSteps[k].minutes || 10) - 5) };
          x.server = { version: (x.baseServerVersion || 0) + 1, updatedAt: now().toISOString(), editedBy: "Coordinator (synthetic)", steps: srvSteps, safety: x.safety + " Keep a first-aid kit in the room." , conflictStep: k };
          x.log.push({ t: now().toISOString(), m: "Server has a newer version (v" + x.server.version + "). Nothing was overwritten" });
        });
        refreshOutbox(); alertMsg("Conflict found. The server has a newer copy. Nothing was overwritten. Review needed.");
        return;
      }
      updatePlan(id, function (x) { x.status = "synced"; x.baseServerVersion = (x.server ? x.server.version : x.baseServerVersion) + 1; x.syncedAt = now().toISOString(); x.attempts = 0; delete x.server; delete x.nextRetry; x.log.push({ t: now().toISOString(), m: "Synced to server as version " + x.baseServerVersion }); });
      refreshOutbox(); announce((p.title || "Plan") + " synced.");
    }, 1400);
  }
  function refreshOutbox() { renderHeader(route()); renderNav(route()); var r = route(); if (r.name === "outbox") { var ae = document.activeElement && document.activeElement.id; render({ keepFocus: true }); if (ae && document.getElementById(ae)) document.getElementById(ae).focus(); else focusIn("h1"); } }

  /* ---------- WF3: Outbox ---------- */
  function viewOutbox() {
    var s = userStore(); var flash = load("flash", ""); if (flash) save("flash", "");
    var list = s.plans.filter(function (p) { return p.status !== "draft"; });
    var h = "<h1>Sync outbox</h1>";
    if (flash) h += '<div class="notice ok"><p>' + I.ok + " " + esc(flash) + "</p></div>";
    h += isOnline() ? '<p class="lead">Queued plans upload automatically. You can also sync now.</p>' : '<p class="lead">You are offline. Queued plans are safe on this device and will upload when the connection returns.</p>';
    h += '<div class="btn-row"><button class="btn" type="button" id="sync-all">' + I.sync + "Sync now</button></div>";
    if (!list.length) return h + '<p>Nothing to sync. Plans appear here after you select "Mark ready and queue for sync".</p>';
    h += '<ul class="results">' + list.slice().reverse().map(function (p) {
      var act = "";
      if (p.status === "failed") act = '<p>' + (p.attempts >= MAX_ATTEMPTS ? "Automatic retries stopped after " + MAX_ATTEMPTS + " attempts." : "Automatic retry at about " + timeStr(p.nextRetry) + " (attempt " + p.attempts + " of " + MAX_ATTEMPTS + ").") + '</p><button class="btn small" type="button" id="retry-' + p.id + '" data-retry="' + p.id + '">Retry now</button>';
      if (p.status === "conflict") act = '<p>' + esc(p.server.editedBy) + " changed this plan on the server. Your version is kept on this device until you choose.</p><a class=\"btn small\" href=\"#/conflict/" + p.id + '">Review and resolve</a>';
      if (p.status === "synced") act = '<p class="meta">Synced at ' + dateTimeStr(p.syncedAt) + " as server version " + p.baseServerVersion + ".</p>";
      if (p.status === "queued") act = isOnline() ? '<button class="btn small" type="button" id="retry-' + p.id + '" data-retry="' + p.id + '">Upload now</button>' : '<p class="meta">Waiting for a connection.</p>';
      return '<li class="card"><h2 style="margin-top:0;font-size:1.1rem"><a href="#/plan/' + p.id + '">' + esc(p.title || "Untitled plan") + "</a></h2><p>" + planPill(p) + "</p>" + act +
        '<details><summary>History for this plan</summary><ul class="timeline">' + p.log.slice(-6).reverse().map(function (l) { return "<li>" + dateTimeStr(l.t) + " - " + esc(l.m) + "</li>"; }).join("") + "</ul></details></li>";
    }).join("") + "</ul>";
    return h;
  }
  viewOutbox.after = function () {
    document.getElementById("sync-all").onclick = function () {
      if (!isOnline()) { announce("You are offline. Plans stay queued on this device and will sync when you reconnect."); alertMsg("Offline: plans stay queued on this device."); return; }
      var n = userStore().plans.filter(function (p) { return p.status === "queued" || p.status === "failed"; }).length;
      if (!n) { announce("Nothing waiting to sync."); return; }
      syncAll();
    };
    Array.prototype.forEach.call(document.querySelectorAll("[data-retry]"), function (b) { b.onclick = function () { var id = b.getAttribute("data-retry"); var p = userStore().plans.filter(function (x) { return x.id === id; })[0]; syncOne(id, { merged: !!(p && p.merged) }); }; });
  };

  /* ---------- WF3: Conflict review and merge ---------- */
  function viewConflict(r) {
    var p = userStore().plans.filter(function (x) { return x.id === r.id; })[0];
    if (!p || p.status !== "conflict" || !p.server) return '<h1>Review conflict</h1><p>There is no open conflict for this plan.</p><p><a href="#/outbox">Back to outbox</a></p>';
    var k = p.server.conflictStep;
    var h = '<p><a href="#/outbox">Back to outbox</a></p><h1>Review conflict: ' + esc(p.title) + "</h1>";
    h += '<div class="notice warn"><p><strong>Two versions exist.</strong> ' + esc(p.server.editedBy) + " saved server version " + p.server.version + " at " + dateTimeStr(p.server.updatedAt) + " while you were working offline. Nothing has been overwritten. Choose what to keep for each difference.</p></div>";
    h += '<form id="merge-form" novalidate><div id="merge-err"></div>';
    h += '<div class="table-wrap"><table><caption>Differences between your version and the server version</caption><thead><tr><th scope="col">Part of plan</th><th scope="col">Your version (this device)</th><th scope="col">Server version</th></tr></thead><tbody>';
    h += '<tr><th scope="row">Step ' + (k + 1) + "</th><td>" + esc(p.steps[k].text) + " (" + esc(p.steps[k].minutes) + " min)</td><td>" + esc(p.server.steps[k].text) + " (" + p.server.steps[k].minutes + " min)</td></tr>";
    h += '<tr><th scope="row">Safety notes</th><td>' + esc(p.safety) + "</td><td>" + esc(p.server.safety) + "</td></tr></tbody></table></div>";
    h += '<fieldset id="fs-step"><legend>Which step ' + (k + 1) + " should the plan use?</legend>" +
      '<label class="check"><input type="radio" name="m-step" value="mine"> Keep my version</label><label class="check"><input type="radio" name="m-step" value="server"> Use the server version</label></fieldset>';
    h += '<fieldset id="fs-safety"><legend>Which safety notes should the plan use?</legend>' +
      '<label class="check"><input type="radio" name="m-safety" value="mine"> Keep my version</label><label class="check"><input type="radio" name="m-safety" value="server"> Use the server version</label></fieldset>';
    h += '<div class="btn-row"><button class="btn" type="submit">' + I.merge + 'Save merged plan and upload</button><a class="btn secondary" href="#/outbox">Decide later</a></div></form>';
    return h;
  }
  viewConflict.after = function (r) {
    var f = document.getElementById("merge-form"); if (!f) return;
    f.onsubmit = function (e) {
      e.preventDefault();
      var st = f.querySelector('input[name="m-step"]:checked'), sf = f.querySelector('input[name="m-safety"]:checked');
      var box = document.getElementById("merge-err");
      if (!st || !sf) {
        box.innerHTML = '<div class="notice err" tabindex="-1" id="merge-box"><h2>' + I.err + 'Choose a version for each difference</h2><ul>' + (!st ? '<li><a href="#fs-step" data-j="m-step">Choose which step to keep.</a></li>' : "") + (!sf ? '<li><a href="#fs-safety" data-j="m-safety">Choose which safety notes to keep.</a></li>' : "") + "</ul></div>";
        Array.prototype.forEach.call(box.querySelectorAll("[data-j]"), function (a) { a.onclick = function (ev) { ev.preventDefault(); f.querySelector('input[name="' + a.getAttribute("data-j") + '"]').focus(); }; });
        document.getElementById("merge-box").focus(); return;
      }
      /* Data safety: the merged plan is written to the device BEFORE any upload is attempted. */
      var p = updatePlan(r.id, function (x) {
        var k = x.server.conflictStep;
        if (st.value === "server") x.steps[k] = x.server.steps[k];
        if (sf.value === "server") x.safety = x.server.safety;
        x.baseServerVersion = x.server.version; x.merged = true; x.status = "queued"; x.updatedAt = now().toISOString();
        x.log.push({ t: now().toISOString(), m: "Merged plan saved on this device (step: " + st.value + ", safety: " + sf.value + ")" });
        delete x.server;
      });
      save("flash", "Merged plan saved on this device. Uploading now.");
      location.hash = "#/outbox";
      setTimeout(function () { syncOne(p.id, { merged: true }); }, 300);
    };
  };

  /* ---------- Device and data ---------- */
  function viewDevice() {
    var s = userStore();
    return "<h1>Device and data</h1>" +
      '<form id="prefs" class="card" style="max-width:40rem" onsubmit="return false">' +
      '<fieldset><legend>Text size</legend>' + [[1, "Standard"], [1.25, "Large (125%)"], [1.5, "Extra large (150%)"]].map(function (o) { return '<label class="check"><input type="radio" name="ts" value="' + o[0] + '"' + (prefs.textScale == o[0] ? " checked" : "") + "> " + o[1] + "</label>"; }).join("") + "</fieldset>" +
      '<fieldset><legend>Mobile data</legend><label class="check"><input type="checkbox" id="ds"' + (prefs.dataSaver ? " checked" : "") + '> Data saver: hide pictures and show their descriptions</label></fieldset></form>' +
      "<h2>Storage on this device</h2><dl class=\"dl\"><dt>Offline activities</dt><dd>" + fmtKB(usedKB(s)) + " of " + fmtKB(D.storageLimitKB) + "</dd><dt>Plans on device</dt><dd>" + s.plans.length + "</dd><dt>Profile</dt><dd>" + esc(profile().label) + "</dd><dt>Prototype version</dt><dd>" + esc(D.version) + "</dd></dl>" +
      '<h2>Shared device privacy</h2><p>Your plans are stored in your own profile space. Signing out locks them. Another person on this device cannot see them without your PIN.</p><div class="btn-row"><button class="btn secondary" type="button" id="so2">Sign out and lock</button></div>';
  }
  viewDevice.after = function () {
    Array.prototype.forEach.call(document.querySelectorAll('input[name="ts"]'), function (el) { el.onchange = function () { prefs.textScale = +el.value; save("prefs", prefs); document.documentElement.style.setProperty("--text-scale", prefs.textScale); announce("Text size changed."); }; });
    document.getElementById("ds").onchange = function (e) { prefs.dataSaver = e.target.checked; save("prefs", prefs); document.body.classList.toggle("data-saver", prefs.dataSaver); announce("Data saver " + (prefs.dataSaver ? "on. Pictures are hidden." : "off.")); };
    document.getElementById("so2").onclick = signOut;
  };

  /* ---------- Help ---------- */
  function viewHelp() {
    return "<h1>Help and keyboard tips</h1>" +
      "<h2>Using the keyboard</h2><ul><li>Press Tab to move forward and Shift+Tab to move back.</li><li>Press Enter to follow a link or press a button. Press Space to tick a box.</li><li>Use the arrow keys to choose between options in a group.</li><li>The first Tab on every page offers \"Skip to main content\".</li></ul>" +
      "<h2>Working offline</h2><ul><li>The connection status is always shown at the top with a word and an icon.</li><li>Save activities while online. Saved guides and your plans work without a connection.</li><li>Queued plans upload by themselves when the connection returns. Failed uploads are never deleted.</li></ul>" +
      "<h2>Privacy</h2><p>STEMMate never asks for learner names, photos or contact details. Only a number of learners is recorded.</p>" +
      (session ? '<p><a href="#/home">Back to home</a></p>' : '<p><a href="#/signin">Back to sign in</a></p>');
  }
  function viewNotFound() { return '<h1>Page not found</h1><p><a href="#/home">Go to home</a></p>'; }

  window.addEventListener("hashchange", function () { render(); });
  document.addEventListener("DOMContentLoaded", function () { render(); if (session && isOnline()) syncAll(); });
  if (document.readyState !== "loading") { render(); }
})();
