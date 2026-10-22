/*
 * Morphology — main application.
 * Lookup order for a word:
 *   1. the 11 hand-verified test words (instant, offline);
 *   2. the answer cached on this device from an earlier analysis;
 *   3. The chosen AI provider, using the student's own API key (streamed), grounded by the
 *      dictionary entry that is fetched in parallel.
 * The dictionary entry is shown immediately, before the AI has finished.
 */
(function () {
  const DB = window.IC_DB;
  const TEST_WORDS = ["unhappiness", "reconstruction", "misunderstanding", "running", "arguing",
    "cities", "sunflower", "children", "uncle", "sing", "unflobbable"];

  const LS = { provider: "morph-provider", cache: "morph-cache-v" + window.MorphAI.PROMPT_VERSION, history: "morph-history", tree: "morph-tree-style" };
  const CACHE_MAX = 150;

  const T = {
    prefix: "Prefix", root: "Root", suffix: "Suffix", spelled: "spelled", zero: "no separate affix",
    levelWord: "Word", levelCut: "Cut",
    monomorphemic: "One morpheme — no IC cut is possible.",
    meaning: "Meaning", etym: "Etymology", allomorphOf: "allomorph of",
    noRestore: "No spelling change — every morpheme keeps its dictionary form.",
    famEmpty: "No word family available.",
    "cls_prefix-der": "Prefix (Derivational)", "cls_prefix-inf": "Prefix (Inflectional)",
    "cls_root-free": "Free Root", "cls_root-bound": "Bound Root",
    "cls_suffix-der": "Suffix (Derivational)", "cls_suffix-inf": "Suffix (Inflectional)"
  };
  const t = key => T[key] || key;
  const SOURCE_LABEL = { verified: "✓ Verified", ai: "✦ AI analysis", cache: "✓ Saved on this device" };

  const ORIGINS = [
    [/Old English/i, "Old English"], [/Middle English/i, "Middle English"], [/Old Norse/i, "Old Norse"],
    [/Old French|Anglo-Norman|French/i, "French"], [/Latin/i, "Latin"], [/Greek/i, "Greek"],
    [/Germanic/i, "Germanic"], [/nonce|invented/i, "Nonce"]
  ];

  const state = { treeStyle: "classic", word: null, source: "verified", dict: null, view: "analyze", token: 0, abort: null };

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const firstSentence = s => (String(s).match(/^.*?[.!?](?=\s|$)/) || [s])[0];
  const ICON = { prefix: "P", root: "R", suffix: "S" };

  // ---------- Local storage (every call guarded: private mode, blocked storage) ----------
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
    json(k, fallback) { try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch (e) { return fallback; } }
  };
  const PROV = window.MorphAI.PROVIDERS;
  const PROV_IDS = Object.keys(PROV);
  // One key and one model per provider; "morph-gemini-key" from the first release is migrated.
  const keyName = p => "morph-key-" + p;
  const modelName = p => "morph-model-" + p;
  (function migrate() {
    const old = store.get("morph-gemini-key");
    if (old && !store.get(keyName("gemini"))) { store.set(keyName("gemini"), old); store.del("morph-gemini-key"); }
    const oldModel = store.get("morph-gemini-model");
    if (oldModel && !store.get(modelName("gemini"))) { store.set(modelName("gemini"), oldModel); store.del("morph-gemini-model"); }
  })();
  const getKey = p => (store.get(keyName(p || getProvider())) || "").trim();
  const getModel = p => store.get(modelName(p || getProvider())) || PROV[p || getProvider()].models[0].id;
  function getProvider() {
    const p = store.get(LS.provider);
    if (PROV[p]) return p;
    return PROV_IDS.find(id => store.get(keyName(id))) || "gemini";
  }
  const setProvider = p => store.set(LS.provider, p);
  const keyedProviders = () => PROV_IDS.filter(p => getKey(p));

  function cacheGet(word) {
    const c = store.json(LS.cache, {});
    return c[word] ? c[word].d : null;
  }
  function cachePut(word, data) {
    const c = store.json(LS.cache, {});
    c[word] = { d: data, t: Date.now() };
    const keys = Object.keys(c);
    if (keys.length > CACHE_MAX) {
      keys.sort((a, b) => c[a].t - c[b].t).slice(0, keys.length - CACHE_MAX).forEach(k => delete c[k]);
    }
    store.set(LS.cache, JSON.stringify(c));
  }
  function historyAdd(word, count) {
    const h = store.json(LS.history, []).filter(x => x.w !== word);
    h.unshift({ w: word, n: count, t: Date.now() });
    store.set(LS.history, JSON.stringify(h.slice(0, 60)));
  }

  // ---------- Views ----------
  const TITLES = { analyze: "Analyze", history: "History", settings: "Settings" };
  function setView(name) {
    state.view = name;
    $$(".view").forEach(v => { v.hidden = v.id !== "view-" + name; });
    $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === name));
    $("#view-title").textContent = TITLES[name];
    if (name !== "analyze") hideNotice();
    if (name === "history") renderHistory();
    if (name === "settings") renderSettings();
  }

  function refreshKeyUi() {
    const p = getProvider();
    const has = !!getKey(p);
    $("#key-chip").classList.toggle("ok", has);
    $("#key-chip-text").textContent = has ? `${PROV[p].name} · key saved` : "No API key";
    $("#empty-key").hidden = has || state.view !== "analyze";
  }

  // ---------- Render ----------
  function bracket(node, w) {
    if (!node.children) return w.morphemes[node.m].form;
    return "[" + node.children.map(c => bracket(c, w)).join(" ") + "]";
  }

  function renderHead(w, dict) {
    $("#w-word").textContent = w.word;
    $("#w-ipa").textContent = w.ipa || (dict && dict.ipa) || "";
    $("#w-gloss").textContent = (dict && dict.gloss) || w.gloss || "";
    $("#w-pos").textContent = (dict && dict.pos) || w.pos || "";
    $("#w-cefr").textContent = dict && dict.cefr ? "CEFR " + dict.cefr : "";
    $("#w-process").textContent = w.process || "";
    const src = $("#w-source");
    src.className = "tag source " + (state.source === "verified" ? "verified" : state.source === "ai" ? "ai" : "verified");
    src.textContent = SOURCE_LABEL[state.source] || "";
    const via = $("#w-via");
    if (dict && dict.via) {
      via.hidden = false;
      via.innerHTML = `“${esc(dict.via.form)}” is an ${esc(dict.via.relation)} of <b>${esc(dict.via.lemma)}</b> (dictionary headword).`;
    } else via.hidden = true;
    $("#w-count").textContent = w.morphemes ? w.morphemes.length : "…";
    $("#w-bracket").textContent = w.tree ? bracket(w.tree, w) : "…";
  }

  function renderBricks(morphemes) {
    window.ICBricks.render($("#bricks"), morphemes,
      { prefix: t("prefix"), root: t("root"), suffix: t("suffix"), spelled: t("spelled"), zero: t("zero") }, esc);
  }

  function originTags(etym) {
    return ORIGINS.filter(o => o[0].test(etym || "")).slice(0, 2).map(o => `<span class="origin">${o[1]}</span>`).join("");
  }

  function renderMatrix(w) {
    const chev = `<svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>`;
    $("#matrix").innerHTML = w.morphemes.map(m => `
      <div class="m-row">
        <button type="button" class="m-head" aria-expanded="false">
          <span class="m-ico ${m.type}">${ICON[m.type] || ""}</span>
          <span class="m-name"><span class="m-form">${esc(m.form)}</span><span class="m-type">${esc(t(m.type))}</span></span>
          <span class="m-cls-wrap">
            <span class="m-cls ${m.type}">${esc(t("cls_" + m.cls))}</span>
            ${m.allomorphOf ? `<span class="m-allo">${t("allomorphOf")} <b>${esc(m.allomorphOf)}</b></span>` : ""}
          </span>
          <span class="m-short">${esc(firstSentence(m.meaning))}</span>
          ${chev}
        </button>
        <div class="m-body">
          <dl>
            <dt>${t("meaning")}</dt><dd>${esc(m.meaning)}</dd>
            <dt>${t("etym")}</dt><dd>${originTags(m.etym)} ${esc(m.etym)}</dd>
          </dl>
        </div>
      </div>`).join("");
  }

  function renderAllo(w) {
    const ins = w.insights || {};
    $("#restore").innerHTML = (ins.restoration || []).map(x => `
      <div class="rs"><span class="rs-from">${esc(x.surface)}</span><span class="rs-arrow">→</span>
      <span class="rs-to">${esc(x.base)}</span><span class="rs-rule">${esc(x.rule)}</span></div>`).join("");
    $("#allo-text").textContent = ins.allomorphy || t("noRestore");
    $("#deriv-text").textContent = ins.derivInfl || "";
  }

  function renderFamily(w) {
    const box = $("#family");
    const fam = w.family || { words: [] };
    if (!fam.words || !fam.words.length) { box.innerHTML = `<p class="fam-empty">${t("famEmpty")}</p>`; return; }
    const W = 720, H = 340, cx = W / 2, cy = H / 2, rx = 270, ry = 125;
    const words = fam.words.slice(0, 10);
    let lines = "", pills = "";
    words.forEach((word, i) => {
      const a = -Math.PI / 2 + (i / words.length) * Math.PI * 2;
      const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
      const pw = word.length * 8.6 + 26;
      const lower = word.toLowerCase();
      const known = lower !== w.word && /^[a-z][a-z'-]*$/.test(lower);
      lines += `<line class="fam-line" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
      pills += `<g class="fam-pill${known ? " known" : ""}"${known ? ` data-word="${esc(lower)}" role="button" tabindex="0"` : ""}>
        <rect x="${(x - pw / 2).toFixed(1)}" y="${(y - 15).toFixed(1)}" width="${pw.toFixed(1)}" height="30" rx="15"/>
        <text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" text-anchor="middle">${esc(word)}</text></g>`;
    });
    const gloss = fam.rootGloss || "";
    const coreR = Math.max(50, fam.root.length * 5.5 + 24, gloss.length * 3.4 + 16);
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Word family">
      ${lines}
      <circle class="fam-core" cx="${cx}" cy="${cy}" r="${coreR}"/>
      <text class="fam-core-text" x="${cx}" y="${cy + (gloss ? 0 : 6)}" text-anchor="middle">${esc(fam.root)}</text>
      <text class="fam-core-gloss" x="${cx}" y="${cy + 20}" text-anchor="middle">${esc(gloss)}</text>
      ${pills}</svg>`;
  }

  function renderAll() {
    const w = state.word;
    if (!w) return;
    renderHead(w, state.dict);
    renderBricks(w.morphemes);
    window.ICTree.render($("#tree"), w, t, state.treeStyle);
    $("#detail-title").innerHTML = `<span class="target">“${esc(w.word)}”</span> has ${w.morphemes.length} morpheme${w.morphemes.length === 1 ? "" : "s"}`;
    renderMatrix(w);
    renderAllo(w);
    renderFamily(w);
    $$(".chip").forEach(c => c.classList.toggle("active", c.dataset.word === w.word));
  }

  /** Dictionary card + skeletons while the AI is still working. */
  function renderPending(word, dict) {
    renderHead({ word, morphemes: null, tree: null, process: "" }, dict);
    $("#w-source").className = "tag source ai";
    $("#w-source").textContent = "✦ AI is analysing…";
    $("#bricks").innerHTML = [0, 1, 2].map(i => `<div class="badge pending" style="--i:${i}"><div class="badge-top"><span class="badge-form">xxxxx</span></div><div class="badge-sub">xxxxxx</div><div class="badge-bottom"><span class="badge-icon"></span></div></div>`).join("");
    $("#tree").innerHTML = `<div class="tree-wait"><div class="spinner"><span></span><span></span><span></span><span></span></div><div id="wait-msg">The AI is cutting “${esc(word)}”…</div></div>`;
    $("#detail-title").textContent = "Details";
    $("#matrix").innerHTML = ""; $("#restore").innerHTML = ""; $("#allo-text").textContent = ""; $("#deriv-text").textContent = ""; $("#family").innerHTML = "";
  }

  function showNotice(html, isError) {
    const n = $("#notice");
    n.hidden = false;
    n.className = "notice" + (isError ? " error" : "");
    n.innerHTML = html;
  }
  const hideNotice = () => { $("#notice").hidden = true; };

  function renderHistory() {
    const h = store.json(LS.history, []);
    $("#history").innerHTML = h.length
      ? h.map(x => `<button type="button" class="h-item" data-word="${esc(x.w)}"><b>${esc(x.w)}</b><span>${x.n} morpheme${x.n === 1 ? "" : "s"}</span></button>`).join("")
      : `<p class="h-empty">Nothing yet. Analyse a word and it will appear here.</p>`;
  }

  // ---------- Analysis ----------
  function validWord(raw) {
    const key = raw.toLowerCase().trim();
    return /^[a-z][a-z'-]{0,29}$/.test(key) ? key : null;
  }

  function dictContext(res) {
    if (!res || !res.found) return null;
    const s = window.MorphDict.summarize(res.entry);
    s.via = res.via;
    s.lemma = res.headword;
    return s;
  }

  async function show(raw, opts) {
    opts = opts || {};
    const key = validWord(raw || "");
    if (!raw || !raw.trim()) { $("#word-input").focus(); return; }
    setView("analyze");
    if (!key) { showNotice("Please type one English word (letters, apostrophe or hyphen only).", true); return; }
    if (state.abort) state.abort.abort();
    const token = ++state.token;
    hideNotice();
    $("#suggest").hidden = true;
    $("#word-input").value = key;

    // 1. verified words: instant.
    const verified = DB[key];
    // 2. earlier AI answers.
    const cached = verified ? null : cacheGet(key);

    // Dictionary lookup starts at once, in parallel with everything else.
    const dictP = window.MorphDict.lookup(key).catch(() => null);

    if (verified || cached) {
      state.word = verified || cached;
      state.source = verified ? "verified" : "cache";
      state.dict = dictContext(await dictP);
      if (token !== state.token) return;
      $("#result").hidden = false;
      renderAll();
      finish(key, opts);
      return;
    }

    const dictRes = await dictP;
    if (token !== state.token) return;
    state.dict = dictContext(dictRes);

    // Not in the dictionary: offer spelling suggestions before spending an API call.
    if (!dictRes || !dictRes.found) {
      if (dictRes !== null && !opts.force) {
        const sugg = await window.MorphDict.fuzzy(key).catch(() => []);
        if (token !== state.token) return;
        if (sugg.length) {
          showNotice(`“${esc(key)}” is not in the dictionary. Did you mean: ` +
            sugg.map(s => `<button type="button" data-word="${esc(s)}">${esc(s)} →</button>`).join("") +
            ` <button type="button" class="alt" data-word="${esc(key)}" data-force="1">Analyse “${esc(key)}” anyway</button>`);
          return;
        }
      }
    }

    const provider = getProvider();
    if (!getKey(provider)) {
      const others = keyedProviders();
      showNotice(`To analyse new words, add an API key first (Gemini, Grok, OpenAI, Claude or OpenRouter). <button type="button" data-view="settings">Add key</button>` +
        others.map(p => `<button type="button" class="alt" data-provider="${p}" data-word="${esc(key)}">Use ${esc(PROV[p].name)}</button>`).join(""));
      refreshKeyUi();
      return;
    }

    $("#result").hidden = false;
    state.word = null;
    state.source = "ai";
    renderPending(key, state.dict);
    state.abort = new AbortController();
    if (state.dict === null && dictRes === null) {
      showNotice("The dictionary could not be reached, so this analysis has no dictionary context.");
    } else if (!state.dict) {
      showNotice(`“${esc(key)}” is not in the dictionary — it will be analysed as a made-up word.`);
    }

    try {
      const data = await window.MorphAI.analyze({
        word: key, provider, apiKey: getKey(provider), model: getModel(provider),
        context: state.dict, signal: state.abort.signal,
        onMorphemes: ms => { if (token === state.token) renderBricks(ms); },
        onAttempt: () => { const m = $("#wait-msg"); if (m && token === state.token) m.textContent = "Double-checking the cuts…"; }
      });
      if (token !== state.token) return;
      state.word = data;
      state.source = "ai";
      cachePut(key, data);
      renderAll();
      finish(key, opts);
    } catch (err) {
      if (err.name === "AbortError" || token !== state.token) return;

      // The key cannot use the chosen Gemini model: ask Google which models it can use, pick one, retry once.
      if (err.status === 404 && provider === "gemini" && !opts.healed) {
        try {
          const list = await window.MorphAI.listModels("gemini", getKey("gemini"));
          const pick = window.MorphAI.pickGeminiModel(list);
          if (pick && pick !== getModel("gemini")) {
            store.set(modelName("gemini"), pick);
            showNotice(`Your key cannot use the old Gemini model, so Morphology switched to <b>${esc(pick)}</b> and is trying again.`);
            return show(key, { ...opts, healed: true });
          }
        } catch (e) { /* fall through to the normal error */ }
      }

      $("#result").hidden = true;
      const others = keyedProviders().filter(p => p !== provider);
      showNotice(esc(err.message) +
        (err.status === 401 || err.status === 404 ? ` <button type="button" data-view="settings">Open settings</button>` : "") +
        others.map(p => `<button type="button" class="alt" data-provider="${p}" data-word="${esc(key)}">Try with ${esc(PROV[p].name)}</button>`).join(""), true);
    }
  }

  function finish(key, opts) {
    if (!opts.silentHash) history.replaceState(null, "", "#w=" + encodeURIComponent(key));
    historyAdd(state.word.word, state.word.morphemes.length);
  }

  // ---------- Search box suggestions ----------
  let suggestTimer = 0, suggestSeq = 0;
  function bindSuggest() {
    const input = $("#word-input"), list = $("#suggest");
    input.addEventListener("input", () => {
      clearTimeout(suggestTimer);
      const q = input.value.trim();
      if (q.length < 2) { list.hidden = true; return; }
      suggestTimer = setTimeout(async () => {
        const seq = ++suggestSeq;
        const items = await window.MorphDict.suggest(q).catch(() => []);
        if (seq !== suggestSeq || !items.length) { if (seq === suggestSeq) list.hidden = true; return; }
        list.innerHTML = items.map(w => `<li role="option" data-word="${esc(w)}">${esc(w)}</li>`).join("");
        list.hidden = false;
      }, 140);
    });
    list.addEventListener("mousedown", e => {
      const li = e.target.closest("li");
      if (li) { e.preventDefault(); show(li.dataset.word); }
    });
    input.addEventListener("blur", () => { list.hidden = true; });
    input.addEventListener("keydown", e => { if (e.key === "Escape") list.hidden = true; });
  }

  // ---------- Settings ----------
  let viewing = null;   // provider whose form is shown (may differ from the active one)

  function renderSettings() {
    if (!viewing) viewing = getProvider();
    const active = getProvider();
    $("#prov-pills").innerHTML = PROV_IDS.map(p => `
      <button type="button" role="tab" class="pill${p === viewing ? " on" : ""}" data-prov="${p}" aria-selected="${p === viewing}">
        ${esc(PROV[p].name)}${getKey(p) ? `<i class="pill-dot${p === active ? " act" : ""}" title="${p === active ? "active" : "key saved"}"></i>` : ""}
      </button>`).join("");
    const cfg = PROV[viewing];
    $("#prov-title").textContent = cfg.full + " API key";
    $("#prov-link").href = cfg.keyUrl;
    $("#prov-link").textContent = new URL(cfg.keyUrl).host;
    $("#key-input").value = getKey(viewing);
    $("#key-input").placeholder = cfg.keyHint;
    fillModels(cfg.models, getModel(viewing));
    $("#model-custom").value = "";
    $("#prov-active").hidden = viewing === active || !getKey(viewing);
    $("#prov-state").textContent = getKey(viewing)
      ? (viewing === active ? `${cfg.name} is the active provider.` : `Key saved. Active provider: ${PROV[active].name}.`) : "No key saved for this provider.";
    $("#key-status").textContent = ""; $("#key-status").className = "key-status";
  }

  function fillModels(list, selected) {
    const sel = $("#model-select");
    const items = list.some(m => m.id === selected) || !selected ? list : [{ id: selected, label: selected }, ...list];
    sel.innerHTML = items.map(m => `<option value="${esc(m.id)}">${esc(m.label)}</option>`).join("");
    sel.value = selected || items[0].id;
  }

  function bindSettings() {
    const status = $("#key-status");
    const say = (msg, cls) => { status.textContent = msg; status.className = "key-status " + (cls || ""); };
    const chosenModel = () => $("#model-custom").value.trim() || $("#model-select").value;

    $("#prov-pills").addEventListener("click", e => {
      const b = e.target.closest("[data-prov]");
      if (b) { viewing = b.dataset.prov; renderSettings(); }
    });

    $("#key-toggle").addEventListener("click", e => {
      const inp = $("#key-input");
      const show_ = inp.type === "password";
      inp.type = show_ ? "text" : "password";
      e.target.textContent = show_ ? "Hide" : "Show";
      e.target.setAttribute("aria-pressed", String(show_));
    });

    $("#settings-form").addEventListener("submit", async e => {
      e.preventDefault();
      const key = $("#key-input").value.trim();
      const p = viewing, model = chosenModel();
      if (!key) { say("Paste your API key first.", "err"); return; }
      if (/\s/.test(key) || key.length < 20) { say("That does not look like a complete API key. Copy the whole key from the provider's page.", "err"); return; }
      say("Testing the key…");
      try {
        await window.MorphAI.testKey(p, key, model);
        store.set(modelName(p), model);
        const saved = store.set(keyName(p), key);
        setProvider(p);
        renderSettings();
        say(saved ? `Key saved on this device and working. ${PROV[p].name} is now active.` : "The key works, but this browser blocks saving it. It will be forgotten when you close the tab.", saved ? "ok" : "err");
      } catch (err) {
        say(err.message + (err.status === 404 ? " Press “Load my models” to see which ones your key can use." : ""), "err");
      }
      refreshKeyUi();
    });

    $("#models-load").addEventListener("click", async () => {
      const key = $("#key-input").value.trim();
      if (!key) { say("Paste your API key first.", "err"); return; }
      say("Asking the provider which models your key can use…");
      try {
        const list = await window.MorphAI.listModels(viewing, key);
        if (!list.length) { say("The provider returned no models for this key.", "err"); return; }
        list.sort((a, b) => a.id.localeCompare(b.id));
        const guess = viewing === "gemini" ? window.MorphAI.pickGeminiModel(list) : "";
        fillModels(list, guess || list[0].id);
        say(`${list.length} models found. Choose one and press Save & test.`, "ok");
      } catch (err) { say(err.message, "err"); }
    });

    $("#prov-active").addEventListener("click", () => { setProvider(viewing); renderSettings(); refreshKeyUi(); });

    $("#key-remove").addEventListener("click", () => {
      store.del(keyName(viewing));
      if (getProvider() === viewing) store.del(LS.provider);
      renderSettings();
      say("Key removed from this browser.", "ok");
      refreshKeyUi();
    });
  }

  // ---------- Events ----------
  function bind() {
    $("#chips").innerHTML = TEST_WORDS.map(w => `<button type="button" class="chip" data-word="${w}">${w}</button>`).join("");
    $("#search").addEventListener("submit", e => { e.preventDefault(); show($("#word-input").value); });
    $("#chips").addEventListener("click", e => { const b = e.target.closest(".chip"); if (b) show(b.dataset.word); });
    $("#random").addEventListener("click", () => {
      const pool = TEST_WORDS.filter(w => !state.word || w !== state.word.word);
      show(pool[Math.floor(Math.random() * pool.length)]);
    });

    document.body.addEventListener("click", e => {
      const nav = e.target.closest("[data-view]");
      if (nav) { setView(nav.dataset.view); refreshKeyUi(); return; }
      const suggestBtn = e.target.closest("#notice button[data-word]");
      if (suggestBtn) {
        if (suggestBtn.dataset.provider) { setProvider(suggestBtn.dataset.provider); refreshKeyUi(); }
        show(suggestBtn.dataset.word, { force: !!suggestBtn.dataset.force || !!suggestBtn.dataset.provider });
      }
    });
    $("#key-chip").addEventListener("click", () => setView("settings"));
    state.treeStyle = store.get(LS.tree) === "boxes" ? "boxes" : "classic";
    $$("#tree-style button").forEach(b => b.classList.toggle("active", b.dataset.style === state.treeStyle));
    $("#tree-style").addEventListener("click", e => {
      const b = e.target.closest("[data-style]");
      if (!b || !state.word) return;
      state.treeStyle = b.dataset.style;
      store.set(LS.tree, state.treeStyle);
      $$("#tree-style button").forEach(x => x.classList.toggle("active", x === b));
      window.ICTree.render($("#tree"), state.word, t, state.treeStyle);
    });
    $("#history").addEventListener("click", e => { const b = e.target.closest(".h-item"); if (b) show(b.dataset.word); });
    $("#clear-history").addEventListener("click", () => { store.del(LS.history); store.del(LS.cache); renderHistory(); });

    document.querySelector(".tabs").addEventListener("click", e => {
      const b = e.target.closest("[data-tab]");
      if (!b) return;
      $$(".tabs button").forEach(x => x.classList.toggle("active", x === b));
      $$(".panel").forEach(p => p.classList.toggle("active", p.dataset.panel === b.dataset.tab));
    });

    $("#matrix").addEventListener("click", e => {
      const head = e.target.closest(".m-head");
      if (!head) return;
      const row = head.parentElement;
      row.classList.toggle("open");
      head.setAttribute("aria-expanded", row.classList.contains("open"));
    });

    const fam = $("#family");
    const pick = e => {
      const g = e.target.closest(".fam-pill.known");
      if (g) { show(g.dataset.word); window.scrollTo({ top: 0, behavior: "smooth" }); }
    };
    fam.addEventListener("click", pick);
    fam.addEventListener("keydown", e => { if (e.key === "Enter") pick(e); });

    window.addEventListener("hashchange", () => {
      const m = location.hash.match(/w=([^&]+)/);
      if (m && (!state.word || decodeURIComponent(m[1]) !== state.word.word)) show(decodeURIComponent(m[1]), { silentHash: true });
    });

    bindSuggest();
    bindSettings();
  }

  function init() {
    bind();
    refreshKeyUi();
    const m = location.hash.match(/w=([^&]+)/);
    show(m ? decodeURIComponent(m[1]) : "unhappiness", { silentHash: !m });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
