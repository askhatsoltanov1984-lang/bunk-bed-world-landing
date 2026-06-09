/* ============================================================
   Zbroo chat widget — "Gaby" (v1, deterministic lead flow)
   Self-contained vanilla JS. No dependencies.

   The conversation logic lives in ONE function: brain().
   v2 will swap brain() for an LLM-backed implementation —
   everything else (rendering, i18n, queueing) stays the same.
   ============================================================ */
(function () {
  "use strict";
  if (window.__zbrooChat) return;
  window.__zbrooChat = true;

  var API = "https://api.zbroo.com/api/leads";
  var QUEUE_KEY = "zbroo_lead_queue";          // shared with the lead form
  var STATE_KEY = "zbroo_chat_v1";
  var TYPE_MS = 600;

  /* ---------------- i18n ---------------- */
  var I18N = {
    en: {
      open: "Chat with Gaby",
      close: "Close chat",
      title: "Gaby — Zbroo",
      tagline: "TYPICALLY REPLIES IN SECONDS",
      placeholder: "Type your message…",
      send: "Send",
      sendAria: "Send message",
      langAria: "Cambiar a español",
      greet: "Hi! I'm Gaby from Zbroo. What do you need help with today?",
      askProblem: "What's going on with it?",
      askName: "Got it. What's your name?",
      askPhone: "Best phone number to reach you?",
      phoneInvalid: "Hmm, that number looks a little short. Could you share a 10-digit phone number, please?",
      askCity: "Which city are you in?",
      askTime: "When works best for a visit?",
      success: "You're all set, {name}! Our technician will reach out shortly. 💚"
    },
    es: {
      open: "Chatear con Gaby",
      close: "Cerrar chat",
      title: "Gaby — Zbroo",
      tagline: "RESPONDE EN SEGUNDOS",
      placeholder: "Escribe tu mensaje…",
      send: "Enviar",
      sendAria: "Enviar mensaje",
      langAria: "Switch to English",
      greet: "¡Hola! Soy Gaby de Zbroo. ¿En qué te podemos ayudar hoy?",
      askProblem: "Cuéntame, ¿qué está fallando?",
      askName: "Perfecto. ¿Cuál es tu nombre?",
      askPhone: "¿A qué número de teléfono te podemos marcar?",
      phoneInvalid: "Ese número se ve un poco corto. ¿Me lo pasas otra vez con 10 dígitos, porfa?",
      askCity: "¿En qué ciudad estás?",
      askTime: "¿Cuándo te queda mejor la visita?",
      success: "¡Listo, {name}! Nuestro técnico se pondrá en contacto contigo en un momento. 💚"
    }
  };

  /* Option lists. `value` is the canonical English payload value;
     labels are what the visitor sees. */
  var OPTIONS = {
    services: [
      { value: "Appliance Repair", en: "Appliance Repair", es: "Reparación de electrodomésticos" },
      { value: "Electrical Services", en: "Electrical Services", es: "Electricidad" },
      { value: "Other", en: "Something else", es: "Otra cosa" }
    ],
    cities: [
      { value: "Sugar Land", en: "Sugar Land", es: "Sugar Land" },
      { value: "Katy", en: "Katy", es: "Katy" },
      { value: "Richmond", en: "Richmond", es: "Richmond" },
      { value: "Rosenberg", en: "Rosenberg", es: "Rosenberg" },
      { value: "Missouri City", en: "Missouri City", es: "Missouri City" },
      { value: "Stafford", en: "Stafford", es: "Stafford" },
      { value: "Other", en: "Other", es: "Otra" }
    ],
    times: [
      { value: "Today", en: "Today", es: "Hoy" },
      { value: "Tomorrow", en: "Tomorrow", es: "Mañana" },
      { value: "This week", en: "This week", es: "Esta semana" },
      { value: "I'll decide later", en: "I'll decide later", es: "Luego decido" }
    ]
  };

  function t(key, args) {
    var s = (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
    if (args) {
      Object.keys(args).forEach(function (k) {
        s = s.replace("{" + k + "}", args[k]);
      });
    }
    return s;
  }
  function optLabel(listKey, value) {
    var list = OPTIONS[listKey] || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].value === value) return list[i][state.lang] || list[i].en;
    }
    return value;
  }

  /* ============================================================
     brain() — THE conversation logic (deterministic v1).
     Input : state, input ({type:'init'} | {type:'text'|'option', value})
     Output: { save:{field,value}?, next:step, say:[{key,args?}],
               ask:{kind:'options',optionsKey}|{kind:'text',inputType}|null,
               submit:true? }
     Swap this single function for an LLM brain later.
     ============================================================ */
  function brain(st, input) {
    switch (st.step) {
      case "start":
        return { next: "service", say: [{ key: "greet" }],
                 ask: { kind: "options", optionsKey: "services" } };
      case "service":
        return { save: { field: "service", value: input.value },
                 next: "problem", say: [{ key: "askProblem" }],
                 ask: { kind: "text", inputType: "text" } };
      case "problem":
        return { save: { field: "problem", value: input.value },
                 next: "name", say: [{ key: "askName" }],
                 ask: { kind: "text", inputType: "text" } };
      case "name":
        return { save: { field: "name", value: input.value },
                 next: "phone", say: [{ key: "askPhone" }],
                 ask: { kind: "text", inputType: "tel" } };
      case "phone":
        if (((input.value || "").match(/\d/g) || []).length < 10) {
          return { next: "phone", say: [{ key: "phoneInvalid" }],
                   ask: { kind: "text", inputType: "tel" } };
        }
        return { save: { field: "phone", value: input.value },
                 next: "city", say: [{ key: "askCity" }],
                 ask: { kind: "options", optionsKey: "cities" } };
      case "city":
        return { save: { field: "city", value: input.value },
                 next: "time", say: [{ key: "askTime" }],
                 ask: { kind: "options", optionsKey: "times" } };
      case "time":
        return { save: { field: "time", value: input.value },
                 next: "done", submit: true,
                 say: [{ key: "success", args: { name: st.data.name || "" } }],
                 ask: null };
    }
    return { next: "done", say: [], ask: null };
  }

  /* ---------------- lead delivery (never lose a lead) ---------------- */
  function readQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); }
    catch (e) { return []; }
  }
  function writeQueue(q) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) {}
  }
  function submitLead(d) {
    var payload = {
      name: d.name || "",
      phone: d.phone || "",
      service: d.service || "",
      message: (d.problem || "") + " | Preferred: " + (d.time || ""),
      city: d.city || "",
      source: "chat:" + location.pathname,
      hp: ""
    };
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error("bad status");
    }).catch(function () {
      var q = readQueue();
      q.push(payload);
      writeQueue(q);
    });
  }

  /* ---------------- state ---------------- */
  var state = load() || {
    lang: "en",
    open: false,
    step: "start",
    started: false,
    data: {},
    log: [],          // {who:'g'|'u', key?, args?, opt?:{listKey,value}, text?}
    ask: null
  };

  function save() {
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function load() {
    try { return JSON.parse(sessionStorage.getItem(STATE_KEY) || "null"); }
    catch (e) { return null; }
  }

  /* ---------------- styles ---------------- */
  var css = "" +
    ".zb-chat-btn{position:fixed;left:16px;bottom:16px;z-index:1200;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:#16C172;color:#06241A;display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(22,193,114,.5),0 0 40px rgba(22,193,114,.22);animation:zbPulse 3s ease-in-out infinite;transition:transform .2s}" +
    ".zb-chat-btn:hover{transform:translateY(-2px)}" +
    ".zb-chat-btn svg{width:26px;height:26px;display:block}" +
    "@keyframes zbPulse{0%,100%{box-shadow:0 0 10px rgba(22,193,114,.45),0 0 28px rgba(22,193,114,.18)}50%{box-shadow:0 0 18px rgba(22,193,114,.7),0 0 52px rgba(22,193,114,.32)}}" +
    ".zb-panel{position:fixed;left:16px;bottom:84px;z-index:1201;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 110px);display:none;flex-direction:column;background:#06241A;border:1px solid rgba(12,139,81,.45);border-radius:4px;box-shadow:0 10px 40px rgba(0,0,0,.5),0 0 24px rgba(22,193,114,.12);font-family:'Karla',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#F3F5EF;overflow:hidden}" +
    ".zb-panel.zb-open{display:flex}" +
    ".zb-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(12,139,81,.3);background:#131C16}" +
    ".zb-head-txt{flex:1;min-width:0}" +
    ".zb-head-title{font-weight:800;font-size:16px;line-height:1.2}" +
    ".zb-head-title .zb-dot{color:#16C172;text-shadow:0 0 8px rgba(22,193,114,.65)}" +
    ".zb-head-tag{font-family:'Courier Prime','Courier New',monospace;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:#6B776D;margin-top:2px}" +
    ".zb-lang,.zb-x{flex:none;background:transparent;border:1px solid rgba(22,193,114,.4);border-radius:4px;color:#F3F5EF;cursor:pointer;font-family:'Courier Prime','Courier New',monospace;font-size:11px;letter-spacing:.08em;padding:5px 8px;transition:color .2s,border-color .2s}" +
    ".zb-lang:hover,.zb-x:hover{color:#16C172;border-color:#16C172}" +
    ".zb-x{font-size:14px;line-height:1;padding:5px 9px}" +
    ".zb-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}" +
    ".zb-msg{max-width:84%;padding:10px 13px;border-radius:4px;font-size:14.5px;line-height:1.45;animation:zbIn .25s ease both}" +
    ".zb-msg.zb-g{align-self:flex-start;background:#131C16;border:1px solid rgba(12,139,81,.3)}" +
    ".zb-msg.zb-u{align-self:flex-end;background:#16C172;color:#06241A;font-weight:700}" +
    "@keyframes zbIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}" +
    ".zb-typing{display:flex;gap:4px;align-items:center;padding:12px 14px}" +
    ".zb-typing i{width:6px;height:6px;border-radius:50%;background:#16C172;animation:zbDot 1s ease-in-out infinite}" +
    ".zb-typing i:nth-child(2){animation-delay:.15s}.zb-typing i:nth-child(3){animation-delay:.3s}" +
    "@keyframes zbDot{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}" +
    ".zb-opts{display:flex;flex-wrap:wrap;gap:8px;animation:zbIn .25s ease both}" +
    ".zb-opt{background:transparent;border:1px solid rgba(22,193,114,.5);border-radius:4px;color:#F3F5EF;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:700;padding:9px 13px;transition:color .2s,border-color .2s,box-shadow .2s}" +
    ".zb-opt:hover,.zb-opt:focus{color:#16C172;border-color:#16C172;box-shadow:0 0 12px rgba(22,193,114,.25);outline:none}" +
    ".zb-bar{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(12,139,81,.3);background:#131C16}" +
    ".zb-bar input{flex:1;min-width:0;background:#06241A;border:1px solid rgba(12,139,81,.45);border-radius:4px;color:#F3F5EF;font-family:inherit;font-size:15px;padding:11px 12px;outline:none;transition:border-color .2s,box-shadow .2s}" +
    ".zb-bar input::placeholder{color:#6B776D}" +
    ".zb-bar input:focus{border-color:#16C172;box-shadow:0 0 0 1px rgba(22,193,114,.35)}" +
    ".zb-bar input:disabled{opacity:.45}" +
    ".zb-send{background:#16C172;border:none;border-radius:4px;color:#06241A;cursor:pointer;font-family:inherit;font-size:14px;font-weight:700;padding:0 16px;transition:box-shadow .2s}" +
    ".zb-send:hover{box-shadow:0 0 14px rgba(22,193,114,.45)}" +
    ".zb-send:disabled{opacity:.45;cursor:default;box-shadow:none}" +
    "@media (max-width:480px){.zb-panel{left:0;right:0;bottom:0;width:100%;max-width:none;height:78vh;max-height:78vh;border-radius:4px 4px 0 0;border-left:none;border-right:none;border-bottom:none}}" +
    "@media (prefers-reduced-motion:reduce){.zb-chat-btn{animation:none}.zb-msg,.zb-opts{animation:none}.zb-typing i{animation:none}}";

  /* ---------------- DOM ---------------- */
  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var launcher = document.createElement("button");
  launcher.className = "zb-chat-btn";
  launcher.type = "button";
  launcher.setAttribute("aria-haspopup", "dialog");
  launcher.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H9.6L5.7 19.6c-.7.55-1.7.05-1.7-.83V5.5Z" fill="currentColor"/>' +
    '<circle cx="8.6" cy="9.6" r="1.15" fill="#16C172"/>' +
    '<circle cx="12" cy="9.6" r="1.15" fill="#16C172"/>' +
    '<circle cx="15.4" cy="9.6" r="1.15" fill="#16C172"/></svg>';
  document.body.appendChild(launcher);

  var panel = document.createElement("div");
  panel.className = "zb-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.innerHTML =
    '<div class="zb-head">' +
    '  <div class="zb-head-txt">' +
    '    <div class="zb-head-title">Gaby — Zbroo<span class="zb-dot">.</span></div>' +
    '    <div class="zb-head-tag"></div>' +
    "  </div>" +
    '  <button type="button" class="zb-lang"></button>' +
    '  <button type="button" class="zb-x" aria-label="">✕</button>' +
    "</div>" +
    '<div class="zb-msgs" aria-live="polite"></div>' +
    '<form class="zb-bar">' +
    '  <input type="text" autocomplete="off" />' +
    '  <button type="submit" class="zb-send"></button>' +
    "</form>";
  document.body.appendChild(panel);

  var tagEl = panel.querySelector(".zb-head-tag");
  var langBtn = panel.querySelector(".zb-lang");
  var closeBtn = panel.querySelector(".zb-x");
  var msgsEl = panel.querySelector(".zb-msgs");
  var barEl = panel.querySelector(".zb-bar");
  var inputEl = panel.querySelector(".zb-bar input");
  var sendBtn = panel.querySelector(".zb-send");

  /* ---------------- rendering ---------------- */
  function msgText(m) {
    if (m.key) return t(m.key, m.args);
    if (m.opt) return optLabel(m.opt.listKey, m.opt.value);
    return m.text || "";
  }

  function addBubble(m) {
    var el = document.createElement("div");
    el.className = "zb-msg " + (m.who === "g" ? "zb-g" : "zb-u");
    el.textContent = msgText(m);
    msgsEl.appendChild(el);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return el;
  }

  function renderOptions(ask) {
    removeOptions();
    if (!ask || ask.kind !== "options") return;
    var wrap = document.createElement("div");
    wrap.className = "zb-opts";
    OPTIONS[ask.optionsKey].forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "zb-opt";
      b.textContent = o[state.lang] || o.en;
      b.addEventListener("click", function () {
        handleInput({ type: "option", value: o.value },
                    { who: "u", opt: { listKey: ask.optionsKey, value: o.value } });
      });
      wrap.appendChild(b);
    });
    msgsEl.appendChild(wrap);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
  function removeOptions() {
    var old = msgsEl.querySelector(".zb-opts");
    if (old) old.parentNode.removeChild(old);
  }

  function syncBar() {
    var textMode = state.ask && state.ask.kind === "text";
    inputEl.disabled = !textMode;
    sendBtn.disabled = !textMode;
    inputEl.type = textMode && state.ask.inputType === "tel" ? "tel" : "text";
    inputEl.setAttribute("inputmode",
      textMode && state.ask.inputType === "tel" ? "tel" : "text");
    inputEl.placeholder = t("placeholder");
    sendBtn.textContent = t("send");
    sendBtn.setAttribute("aria-label", t("sendAria"));
  }

  function syncChrome() {
    tagEl.textContent = t("tagline");
    langBtn.textContent = state.lang === "en" ? "ES" : "EN";
    langBtn.setAttribute("aria-label", t("langAria"));
    closeBtn.setAttribute("aria-label", t("close"));
    launcher.setAttribute("aria-label", t("open"));
    panel.setAttribute("aria-label", t("title"));
    syncBar();
  }

  function renderAll() {
    msgsEl.innerHTML = "";
    state.log.forEach(addBubble);
    renderOptions(state.ask);
    syncChrome();
  }

  function showTyping() {
    var el = document.createElement("div");
    el.className = "zb-msg zb-g zb-typing";
    el.innerHTML = "<i></i><i></i><i></i>";
    msgsEl.appendChild(el);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return el;
  }

  /* Play Gaby messages sequentially with a typing indicator. */
  function playSay(says, done) {
    if (!says.length) { done(); return; }
    var m = { who: "g", key: says[0].key, args: says[0].args };
    var typing = showTyping();
    setTimeout(function () {
      typing.parentNode.removeChild(typing);
      state.log.push(m);
      addBubble(m);
      save();
      playSay(says.slice(1), done);
    }, TYPE_MS);
  }

  /* ---------------- flow driver ---------------- */
  var busy = false;
  function handleInput(input, echo) {
    if (busy) return;
    busy = true;
    removeOptions();
    if (echo) {
      state.log.push(echo);
      addBubble(echo);
    }
    var act = brain(state, input);
    if (act.save) state.data[act.save.field] = act.save.value;
    state.step = act.next;
    state.ask = null;
    syncBar();
    save();
    if (act.submit) submitLead(state.data);
    playSay(act.say || [], function () {
      state.ask = act.ask || null;
      renderOptions(state.ask);
      syncBar();
      save();
      busy = false;
      if (state.ask && state.ask.kind === "text") inputEl.focus();
    });
  }

  function start() {
    if (state.started) return;
    state.started = true;
    handleInput({ type: "init" });
  }

  /* ---------------- open / close ---------------- */
  function openPanel() {
    state.open = true;
    panel.classList.add("zb-open");
    save();
    start();
    var f = state.ask && state.ask.kind === "text" ? inputEl : firstFocusable();
    if (f) f.focus();
  }
  function closePanel() {
    state.open = false;
    panel.classList.remove("zb-open");
    save();
    launcher.focus();
  }

  launcher.addEventListener("click", function () {
    panel.classList.contains("zb-open") ? closePanel() : openPanel();
  });
  closeBtn.addEventListener("click", closePanel);

  langBtn.addEventListener("click", function () {
    state.lang = state.lang === "en" ? "es" : "en";
    save();
    renderAll();
  });

  barEl.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = inputEl.value.trim();
    if (!v || !state.ask || state.ask.kind !== "text") return;
    inputEl.value = "";
    handleInput({ type: "text", value: v }, { who: "u", text: v });
  });

  /* ---------------- a11y: Esc + basic focus trap ---------------- */
  function focusables() {
    return Array.prototype.filter.call(
      panel.querySelectorAll("button, input, [tabindex]"),
      function (el) { return !el.disabled && el.offsetParent !== null; });
  }
  function firstFocusable() { return focusables()[0] || null; }

  document.addEventListener("keydown", function (e) {
    if (!panel.classList.contains("zb-open")) return;
    if (e.key === "Escape") { closePanel(); return; }
    if (e.key !== "Tab") return;
    var list = focusables();
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  /* ---------------- restore session ---------------- */
  syncChrome();
  if (state.log.length) {
    state.started = true;
    renderAll();
  }
  if (state.open) {
    panel.classList.add("zb-open");
    start();
  }
})();
