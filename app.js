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
  const TEST_WORDS = ["unhappiness", "reconstruction", "misunderstanding", "running", "irrecoverably", "children",
    "sunflower", "mice", "visibly", "receptionists", "employment", "employ", "enjoy", "deploy", "refer", "unflobbable"];

  const LS = { provider: "morph-provider", cache: "morph-cache-v" + window.MorphAI.PROMPT_VERSION, history: "morph-history", tree: "morph-tree-style", cls: "morph-cls-mode", level: "morph-level", aicheck: "morph-aicheck", keypref: "morph-keypref" };
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
  const SOURCE_LABEL = { verified: "✓ Verified", ai: "✦ AI analysis", cache: "✓ Saved on this device", lexicon: "✓ Checked cut", "lexicon-adv": "✓ Advanced cut" };

  const ORIGINS = [
    [/Old English/i, "Old English"], [/Middle English/i, "Middle English"], [/Old Norse/i, "Old Norse"],
    [/Old French|Anglo-Norman|French/i, "French"], [/Latin/i, "Latin"], [/Greek/i, "Greek"],
    [/Germanic/i, "Germanic"], [/nonce|invented/i, "Nonce"]
  ];

  let settingsForm = null, bannerForm = null;
  const state = { deadModels: new Set(), cool: {}, level: "basic", clsMode: "freebound", treeStyle: "classic", word: null, source: "verified", dict: null, view: "analyze", token: 0, abort: null };

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

  function cacheDel(word, level) {
    const c = store.json(LS.cache, {});
    delete c[ck(word, level)];
    store.set(LS.cache, JSON.stringify(c));
  }
  const ck = (word, level) => ((level || state.level) === "adv" ? word + "@adv" : word);
  function cacheGet(word) {
    const c = store.json(LS.cache, {});
    const e = c[ck(word)];
    return e ? e.d : null;
  }
  function cachePut(word, data) {
    const c = store.json(LS.cache, {});
    c[ck(word, data && data.level)] = { d: data, t: Date.now() };
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
  const TITLES = { analyze: "IC Division", history: "History", cheat: "Cheat sheet", settings: "Settings" };
  function setView(name) {
    state.view = name;
    $$(".view").forEach(v => { v.hidden = v.id !== "view-" + name; });
    $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === name));
    $("#view-title").textContent = TITLES[name];
    if (name !== "analyze") hideNotice();
    if (name === "history") renderHistory();
    if (name === "cheat") renderCheat(state.word);
    if (name === "settings" && settingsForm) settingsForm.render();
  }

  function refreshKeyUi() {
    const p = getProvider();
    const has = !!getKey(p);
    $("#key-chip").classList.toggle("ok", has);
    $("#key-chip-text").textContent = has ? `${PROV[p].name} · key saved` : "No API key";
  }

  // ---------- Render ----------
  function bracket(node, w) {
    if (!node.children) return w.morphemes[node.m].form;
    return "[" + node.children.map(c => bracket(c, w)).join(" ") + "]";
  }

  /** Short label such as "Derivation (prefix + 2 suffixes) + inflection", worked out from the morphemes. */
  /** Unit 5: the word-formation process the dictionary names for this word, if any. */
  const FORMATION = {
    clipping: ["Clipping", "A longer word is shortened.", "advertisement → ad · gymnasium → gym · telephone → phone"],
    acronym: ["Acronym / initialism", "A word made from the initial letters of a phrase.", "NATO · laser · FBI · radar"],
    blend: ["Blending", "Parts of two words are joined into one new word.", "breakfast + lunch → brunch · smoke + fog → smog"],
    coinage: ["Coinage (trade names, eponyms)", "A brand-new word, or a word named after a person, place or product.", "Kleenex · Google · sandwich · boycott"],
    borrowing: ["Borrowing", "A word taken over from another language.", "pizza · kindergarten · sushi · algebra"],
    backformation: ["Back-formation", "A shorter word made by removing a supposed affix from a longer one.", "edit ← editor · televise ← television · burgle ← burglar"]
  };
  function formationOf(w) {
    const text = (state.dict && state.dict.etymology) || (w.etymology && w.etymology.summary) || "";
    return window.MorphEtym.process(text, w.morphemes.length);
  }
  function processLabel(w) {
    if (w.source !== "ai" && w.process && w.process.length <= 70) return w.process;   // hand-written for the verified words
    const ms = w.morphemes;
    const roots = ms.filter(m => m.type === "root").length;
    const pre = ms.filter(m => m.cls === "prefix-der").length;
    const suf = ms.filter(m => m.cls === "suffix-der").length;
    const inf = ms.some(m => /-inf$/.test(m.cls));
    const aff = [];
    if (pre) aff.push(pre > 1 ? `${pre} prefixes` : "prefix");
    if (suf) aff.push(suf > 1 ? `${suf} suffixes` : "suffix");
    const bits = [];
    if (roots > 1) bits.push("Compounding");
    if (aff.length) bits.push(`${bits.length ? "derivation" : "Derivation"} (${aff.join(" + ")})`);
    if (inf) bits.push(bits.length ? "inflection" : "Inflection");
    return bits.length ? bits.join(" + ") : "Single free root";
  }

  function renderHead(w, dict) {
    $("#w-word").textContent = w.word;
    $("#w-ipa").textContent = w.ipa || (dict && dict.ipa) || "";
    $("#w-gloss").textContent = (dict && dict.gloss) || w.gloss || "";
    $("#w-pos").textContent = (dict && dict.pos) || w.pos || "";
    $("#w-cefr").textContent = dict && dict.cefr ? "CEFR " + dict.cefr : "";
    const fp = w.morphemes ? formationOf(w) : null;
    $("#w-process").textContent = w.morphemes ? (fp ? fp.label : processLabel(w)) : "";
    $("#w-wtype").textContent = w.morphemes ? WORD_TYPES[wordTypeOf(w).key].name : "";
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

  // ---- Classification shown as framed tables (Free/Bound, Base/Affix, Derivational/Inflectional) ----
  const TYPE_NAME = { prefix: "prefix", root: "base", suffix: "suffix" };
  const isBound = m => m.cls !== "root-free";
  const surfaceOf = m => (m.surface === undefined ? m.form.replace(/-/g, "") : m.surface);
  const FRAMES = {
    freebound: {
      cols: [
        { title: "Free morphemes", sub: "“can stand alone as a word”", pick: m => !isBound(m) },
        { title: "Bound morphemes", sub: "CANNOT stand alone and MUST combine with another", pick: isBound }
      ]
    },
    baseaffix: {
      cols: [
        { title: "Base", sub: "the core that carries the main meaning", pick: m => m.type === "root" },
        { title: "Affix", sub: "prefixes and suffixes added to a base", pick: m => m.type !== "root" }
      ]
    },
    derinf: {
      cols: [
        { title: "Derivational", sub: "new word · prefixes keep the class, suffixes change it", pick: m => /-der$/.test(m.cls) },
        { title: "Inflectional", sub: "new form of the same word · suffixes only", pick: m => /-inf$/.test(m.cls) }
      ],
      baseRow: true,
      table: [
        ["Can be prefixes and suffixes", "Only suffixes"],
        ["Prefixes keep the word class; suffixes change it", "A small closed set of suffixes that change the grammatical function"],
        ["Create new words and change the original meaning", "Create a new form of the word and keep the meaning"]
      ]
    }
  };

  const chip = m => `<div class="f2-chip"><span class="f2-form ${m.type}">${esc(m.form)}</span><span class="f2-type">${TYPE_NAME[m.type] || m.type}</span>${m.variant ? `<span class="f2-var">${esc(m.variant)}</span>` : ""}</div>`;

  function renderStrip(w) {
    const dots = w.morphemes.map(surfaceOf).filter(Boolean).join(" · ");
    return `<div class="cls-strip">
      <div class="cs-word">${esc(dots)}</div>
      <div class="cs-items">${w.morphemes.map(m => `<div class="cs-item">
        <span class="cs-form ${m.type}">${esc(m.form)}</span>
        <span class="cs-type">${TYPE_NAME[m.type] || m.type}</span>${m.variant ? `<span class="cs-var">${esc(m.variant)}</span>` : ""}
        <span class="cs-bound">(${isBound(m) ? "bound" : "free"})</span></div>`).join("")}</div>
    </div>`;
  }

  // Endings that look alike but do different jobs: say which reading this analysis uses.
  const LOOKALIKE = {
    "-ing": "Inflectional when the word is a verb form (He is replaying the clip). Derivational when the word is a noun, a gerund (the replaying of the clip), or an adjective (an interesting talk).",
    "-ed": "Inflectional when the word is a past tense or a past participle (He visited her). Derivational when the word is an adjective (He is interested in art).",
    "-ly": "Inflectional when it makes an adverb (quickly). Derivational when it makes an adjective (friendly, costly).",
    "-er": "Inflectional as the comparative (taller). Derivational when it makes a noun (driver, hunter) or an onomatopoeic verb (chatter, flicker).",
    "-est": "Inflectional as the superlative (tallest). Compare derivational -ist (typist, artist)."
  };
  const VARIANT_NOTE = {
    "-ing (v)": "inflectional, the progressive verb form.", "-ing (N)": "derivational, it makes a noun (a gerund).", "-ing (adj)": "derivational, it makes an adjective.",
    "-ed (v2)": "inflectional, past tense or past participle.", "-ed (adj)": "derivational, it makes an adjective.",
    "-ly (adv)": "inflectional, it makes an adverb.", "-ly (adj)": "derivational, it makes an adjective.",
    "-er (comparative)": "inflectional, the comparative.", "-er (N)": "derivational, it makes a noun.", "-er (onomatopoeia)": "derivational, it makes a verb of repeated sound or movement.",
    "-est (superlative)": "inflectional, the superlative.", "-ist": "derivational, it makes a noun for a person."
  };
  const FLIP = {
    "-ing (v)": "If the word were used as a noun (the replaying of the match), the same ending would be derivational: -ing (N).",
    "-ing (N)": "If the word were used as a verb (He is replaying it), the same ending would be inflectional: -ing (v).",
    "-ing (adj)": "If the word were used as a verb (He is replaying it), the same ending would be inflectional: -ing (v).",
    "-ed (v2)": "If the word were used as an adjective (an interested student), the same ending would be derivational: -ed (adj).",
    "-ed (adj)": "If the word were used as a verb (He visited her), the same ending would be inflectional: -ed (v2).",
    "-ly (adv)": "If the word were an adjective (a friendly man), the same ending would be derivational: -ly (adj).",
    "-ly (adj)": "If the word were an adverb (He spoke quickly), the same ending would be inflectional: -ly (adv)."
  };
  function lookalikeBox(w) {
    const items = w.morphemes.filter(m => m.type === "suffix" && LOOKALIKE[m.form]);
    if (!items.length) return "";
    return `<div class="lookalike">${items.map(m => {
      const kind = /-inf$/.test(m.cls) ? "inflectional" : "derivational";
      const now = m.variant && VARIANT_NOTE[m.variant]
        ? `In “${esc(w.word)}” it is <b>${esc(m.variant)}</b>: ${VARIANT_NOTE[m.variant]}`
        : `In “${esc(w.word)}” it is ${kind}.`;
      return `<div class="la-item"><b>Watch the ending ${esc(m.form)}</b>
        <p>${esc(LOOKALIKE[m.form])}</p>
        <p class="la-now">${now} ${m.variant && FLIP[m.variant] ? esc(FLIP[m.variant]) : ""}</p></div>`;
    }).join("")}</div>`;
  }

  // The lecturer's reference tables; entries that occur in the current word are highlighted.
  const REF = {
    der: {
      title: "Derivational morphemes", hint: "meaning",
      cols: [
        { head: "Prefix", sub: "Class-maintaining", rows: [["re-", "retry"], ["un-", "unethical"], ["in-", "inhuman"], ["il-", "illegal"]] },
        { head: "Suffix", sub: "Class-changing", rows: [["-ness", "business"], ["-ion", "instruction"], ["-ive", "attractive"], ["-ible", "visible"]] }
      ]
    },
    inf: {
      title: "Inflectional morphemes", hint: "grammar",
      cols: [
        { head: "Noun", rows: [["-s", "cats"], ["'s", "student's"], ["s'", "students'"]] },
        { head: "Verb", rows: [["-s", "cooks"], ["-ing", "cooking"], ["-ed", "cooked"], ["-en", "eaten"]] },
        { head: "Adj & Adv", rows: [["-er", "taller"], ["-est", "tallest"], ["-ly", "quickly"]] }
      ]
    }
  };

  function refTable(def, w, cls) {
    const ms = w ? w.morphemes : [];
    const forms = new Set(ms.map(m => m.form.replace(/^-|-$/g, "")));
    return `<div class="ref ${cls}">
      <div class="ref-title">${def.title}<em>(${def.hint})</em></div>
      <div class="ref-cols ref-${def.cols.length}">${def.cols.map(c => `<div class="ref-col">
        <div class="ref-head"><b>${c.head}</b>${c.sub ? `<span>${c.sub}</span>` : ""}</div>
        <ul>${c.rows.map(([a, ex]) => {
          const hit = forms.has(a.replace(/^-|-$/g, "")) && ms.some(m => m.type !== "root" && m.form.replace(/^-|-$/g, "") === a.replace(/^-|-$/g, ""));
          return `<li class="${hit ? "hit" : ""}"><span class="r-aff">${esc(a)}</span><span class="r-ex">${esc(ex)}</span></li>`;
        }).join("")}</ul></div>`).join("")}</div>
    </div>`;
  }

  // Same ending, different job (inflectional on the left, derivational on the right).
  const SAME = [
    [[["-ing (v)", "He is meeting his client."]], [["-ing (N)", "He hates meeting at lunch."], ["-ing (adj)", "The meeting isn't very interesting."]]],
    [[["-ed (v2)", "He visited … / … was turned on."]], [["-ed (adj)", "He is interested in his new job."]]],
    [[["-ly (adv)", "quickly"]], [["-ly (adj)", "friendly, costly"]]],
    [[["-er (comparative)", "taller"]], [["-er (N)", "driver, hunter"], ["-er (onomatopoeia)", "chatter, flicker"]]],
    [[["-est (superlative)", "tallest"]], [["-ist", "typist, artist"]]]
  ];
  function sameEndings(w) {
    const have = new Set((w ? w.morphemes : []).map(m => m.variant).filter(Boolean));
    const cellOf = list => list.map(([lab, ex]) => `<div class="se-item${have.has(lab) ? " hit" : ""}"><b>${esc(lab)}</b><span>${esc(ex)}</span></div>`).join("");
    return `<div class="ref same">
      <div class="ref-title">Same ending, different job</div>
      <div class="se-grid">
        <div class="se-head">Inflectional suffix</div><div class="se-head">Derivational suffix</div>
        ${SAME.map(([i, d]) => `<div class="se-cell">${cellOf(i)}</div><div class="se-cell">${cellOf(d)}</div>`).join("")}
      </div></div>`;
  }

  function renderClassification(w) {
    const mode = state.clsMode;
    const frame = $("#cls-frame"), list = $("#matrix");
    $$("#cls-mode button").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
    if (mode === "list") { frame.hidden = true; list.hidden = false; renderMatrix(w); list.insertAdjacentHTML("beforeend", lookalikeBox(w)); return; }
    list.hidden = true; frame.hidden = false;
    const def = FRAMES[mode];
    const cell = col => {
      const items = w.morphemes.filter(col.pick);
      return items.length ? items.map(chip).join("") : `<span class="f2-none">none</span>`;
    };
    let html = `<div class="f2">
      ${def.cols.map(c => `<div class="f2-head">${esc(c.title)}</div>`).join("")}
      ${def.cols.map(c => `<div class="f2-sub">${esc(c.sub)}</div>`).join("")}
      ${def.cols.map(c => `<div class="f2-cell">${cell(c)}</div>`).join("")}
    </div>`;
    if (def.baseRow) {
      const roots = w.morphemes.filter(m => m.type === "root");
      html += `<div class="f2-base"><span>Base (neither derivational nor inflectional)</span>${roots.map(chip).join("")}</div>`;
    }
    html += renderStrip(w);
    if (def.table) {
      html += `<div class="f2 f2-compare">
        ${def.cols.map(c => `<div class="f2-head">${esc(c.title)}</div>`).join("")}
        ${def.table.map(row => row.map(c => `<div class="f2-cell f2-text">${esc(c)}</div>`).join("")).join("")}
      </div>`;
    }
    if (mode === "derinf" && w.insights && w.insights.derivInfl) html += `<p class="panel-text">${esc(w.insights.derivInfl)}</p>`;
    html += lookalikeBox(w);
    frame.innerHTML = html;
  }

  const pendingText = w => w.detailState === "loading" ? "Loading…" : w.detailState === "failed" ? "Not available" : "";

  function renderMatrix(w) {
    const chev = `<svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>`;
    $("#matrix").innerHTML = w.morphemes.map(m => `
      <div class="m-row">
        <button type="button" class="m-head" aria-expanded="false">
          <span class="m-ico ${m.type}">${ICON[m.type] || ""}</span>
          <span class="m-name"><span class="m-form">${esc(m.form)}</span><span class="m-type">${esc(t(m.type))}${m.variant ? " · " + esc(m.variant) : ""}</span></span>
          <span class="m-cls-wrap">
            <span class="m-cls ${m.type}">${esc(t("cls_" + m.cls))}</span>
            ${m.allomorphOf ? `<span class="m-allo">${t("allomorphOf")} <b>${esc(m.allomorphOf)}</b></span>` : ""}
          </span>
          <span class="m-short${m.meaning ? "" : " ghost"}">${m.meaning ? esc(firstSentence(m.meaning)) : pendingText(w)}</span>
          ${chev}
        </button>
        <div class="m-body">
          <dl>
            <dt>${t("meaning")}</dt><dd>${m.meaning ? esc(m.meaning) : pendingText(w)}</dd>
            <dt>${t("etym")}</dt><dd>${m.etym ? `${originTags(m.etym)} ${esc(m.etym)}` : pendingText(w)}</dd>
          </dl>
        </div>
      </div>`).join("");
  }

  // ---- Word type: simple, compound or complex (decided from the morphemes, no AI needed) ----
  const WORD_TYPES = {
    simple: { name: "Simple word", abbr: "SW", def: "Consists of one free root, with or without inflectional suffixes.", structure: "free root ± inflect. suffix" },
    compound: { name: "Compound word", abbr: "CpW", def: "Consists of two or more roots to create a new meaning, with or without inflectional suffixes.", structure: "≥ 2 roots ± inflect. suffix" },
    complex: { name: "Complex word", abbr: "CW", def: "Consists of derivational affixes and one root (free or bound), changing its meaning or part of speech.", structure: "root + deriv. affix(es) ± inflect. suffix" }
  };
  function wordTypeOf(w) {
    const ms = w.morphemes;
    const roots = ms.filter(m => m.type === "root");
    const der = ms.filter(m => /-der$/.test(m.cls));
    const inf = ms.filter(m => /-inf$/.test(m.cls));
    const key = roots.length >= 2 ? "compound" : der.length ? "complex" : "simple";
    return { key, roots, der, inf };
  }
  function renderWordType(w) {
    const wt = wordTypeOf(w), def = WORD_TYPES[wt.key];
    const list = (arr, cls) => arr.length ? arr.map(m => `<span class="${cls}">${esc(m.form)}</span>`).join(" + ") : "";
    let formula = `<b>${def.abbr}</b> = root ${list(wt.roots, "wt-root")}`;
    if (wt.der.length) formula += ` + deriv. ${list(wt.der, "wt-der")}`;
    if (wt.inf.length) formula += ` ± inflect. ${list(wt.inf, "wt-inf")}`;
    const notes = [];
    if (wt.key === "compound" && wt.der.length) notes.push("It also contains derivational affixes, so it combines compounding with derivation.");
    if (wt.key === "simple" && wt.roots.length && wt.roots[0].cls === "root-bound") notes.push("Its only root is bound, so it behaves like a simple word only in this analysis.");
    if (wt.key !== "complex" && wt.inf.length) notes.push("Inflectional suffixes do not change the word type.");
    const fp = formationOf(w);
    const unit5 = `<h4 class="wt-sub">How was this word formed? (word-formation processes)</h4>
      ${fp ? `<div class="wt-result"><span class="wt-badge process">${esc(fp.label)}</span><div class="wt-formula">${esc(fp.detail)}</div></div>` : `<p class="cls-note">${w.morphemes.length > 1 ? "Built by affixation or compounding: see the morphemes above." : "No special process is named in the dictionary: it is an ordinary simple word."}</p>`}
      <div class="wt-table wt-proc">
        <div class="wt-h">Process</div><div class="wt-h">What happens</div><div class="wt-h">Examples</div>
        ${Object.entries(FORMATION).map(([k, d]) => `<div class="wt-c wt-type${fp && fp.key === k ? " on" : ""}">${esc(d[0])}</div><div class="wt-c${fp && fp.key === k ? " on" : ""}">${esc(d[1])}</div><div class="wt-c${fp && fp.key === k ? " on" : ""}">${esc(d[2])}</div>`).join("")}
      </div>`;
    $("#wordtype").innerHTML = `
      <div class="wt-result"><span class="wt-badge ${wt.key}">${def.name}</span><div class="wt-formula">${formula}</div></div>
      ${notes.map(n => `<p class="cls-note">${esc(n)}</p>`).join("")}
      <div class="wt-table">
        <div class="wt-h">Type</div><div class="wt-h">Definition</div><div class="wt-h">Structure</div>
        ${Object.entries(WORD_TYPES).map(([k, d]) => `
          <div class="wt-c wt-type ${k}${k === wt.key ? " on" : ""}">${d.name}</div>
          <div class="wt-c${k === wt.key ? " on" : ""}">${esc(d.def)}</div>
          <div class="wt-c${k === wt.key ? " on" : ""}">${d.abbr} = ${esc(d.structure)}</div>`).join("")}
      </div>
      ${unit5}`;
    return def.name;
  }

  // ---- Cheat sheet: the knowledge and formulas students need; entries in the current word are highlighted ----
  const CHEAT_RULES = [
    "Cut one affix at a time. Every cut has exactly two parts: a prefix on the left of its stem, a suffix on the right.",
    "Ask which affix was added last. That one is cut first, so it sits at the top of the tree.",
    "Inflection is always added last: [[book shelf] -es], [[play -er] -s].",
    "un- and in- (not) attach to adjectives: [[un-kind] -ness]. If the suffix makes the adjective, the suffix comes first: [un-[wash -ed]], [in-[dispense -able]].",
    "A prefix that needs a verb (re-, mis-, dis-) attaches to the verb first: [[re-write] -er].",
    "Suffix chains grow from the inside out: [[hope -less] -ness], [[cred- -ible] -ly]."
  ];
  const CHEAT_SPELLING = [
    ["Final -e is dropped", "create → creation · visible + -ly → visibly (-le is lost)"],
    ["y becomes i", "happy → happiness · city → cities"],
    ["Consonant is doubled", "stop → stopping · admit → admitting"],
    ["in- changes to match the next sound", "im- before p, b, m (impossible) · il- before l (illegal) · ir- before r (irregular)"]
  ];
  function cheatHtml(w) {
    const derRows = FRAMES.derinf.table;
    return `<div class="cheat">
      <section class="ch-card">
        <h4>Types of morphemes</h4>
        <div class="f2 ch-small">
          <div class="f2-head">Free</div><div class="f2-head">Bound</div>
          <div class="f2-cell f2-text">can stand alone as a word<br><i>play, happy, book</i></div>
          <div class="f2-cell f2-text">CANNOT stand alone, MUST combine with another<br><i>re-, -ing, vis-</i></div>
          <div class="f2-head">Base</div><div class="f2-head">Affix</div>
          <div class="f2-cell f2-text">the core that carries the main meaning<br><i>play in replay</i></div>
          <div class="f2-cell f2-text">prefix (before the base) or suffix (after it)<br><i>re-, -ing</i></div>
        </div>
      </section>
      <section class="ch-card">
        <h4>Word types and formulas</h4>
        <div class="ch-formulas">${Object.values(WORD_TYPES).map(d => `<div class="ch-formula"><b>${d.abbr}</b><span>${esc(d.name)}</span><code>${esc(d.abbr + " = " + d.structure)}</code><small>${esc(d.def)}</small></div>`).join("")}</div>
      </section>
      <section class="ch-card">
        <h4>Derivational or inflectional?</h4>
        <div class="f2 f2-compare"><div class="f2-head">Derivational</div><div class="f2-head">Inflectional</div>
          ${derRows.map(row => row.map(c => `<div class="f2-cell f2-text">${esc(c)}</div>`).join("")).join("")}</div>
      </section>
      <div class="ref-wrap">${refTable(REF.der, w, "ref-der")}${refTable(REF.inf, w, "ref-inf")}</div>
      ${sameEndings(w)}
      <section class="ch-card">
        <h4>Building the IC tree</h4>
        <ol class="ch-rules">${CHEAT_RULES.map(r => `<li>${esc(r)}</li>`).join("")}</ol>
      </section>
      <section class="ch-card">
        <h4>Spelling changes (allomorphy)</h4>
        <div class="ch-spell">${CHEAT_SPELLING.map(([a, b]) => `<div><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join("")}</div>
      </section>
      ${w ? `<p class="cls-note">Highlighted entries occur in “${esc(w.word)}”.</p>` : ""}
    </div>`;
  }
  function renderCheat(w) {
    const html = cheatHtml(w || null);
    $("#cheat").innerHTML = html;
    $("#cheat-view").innerHTML = html;
  }

  function renderAllo(w) {
    const ins = w.insights || {};
    $("#restore").innerHTML = (ins.restoration || []).map(x => `
      <div class="rs"><span class="rs-from">${esc(x.surface)}</span><span class="rs-arrow">→</span>
      <span class="rs-to">${esc(x.base)}</span><span class="rs-rule">${esc(x.rule)}</span></div>`).join("");
    $("#allo-text").textContent = ins.allomorphy || (w.detailState === "loading" ? "Writing the explanation…" : t("noRestore"));
  }

  /** Word family without the AI: words that share the root, from the lexicons (lexicon-family/), else the dictionary's own family list. */
  const famShards = new Map();
  async function ensureLocalFamily(w, token) {
    if (!w || (w.family && w.family.words && w.family.words.length) || w.localFamily) return;
    const root = w.morphemes.find(m => m.type === "root" && m.cls === "root-free") || w.morphemes.find(m => m.type === "root");
    if (!root) return;
    const key = root.form.replace(/-/g, "").toLowerCase();
    let words = [];
    if (/^[a-z]{3,}$/.test(key)) {
      const k = key[0];
      if (!famShards.has(k)) famShards.set(k, fetch(`lexicon-family/${k}.json`).then(r => (r.ok ? r.json() : {})).catch(() => ({})));
      words = ((await famShards.get(k))[key] || []).filter(x => x !== w.word);
    }
    if (words.length < 2 && state.dict && Array.isArray(state.dict.family)) words = words.concat(state.dict.family.map(x => (typeof x === "string" ? x : x.word)).filter(x => x && x !== w.word && !words.includes(x))).slice(0, 12);
    if (!words.length || state.word !== w || token !== state.token) return;
    w.localFamily = { root: key, rootGloss: String(root.meaning || "").replace(/\s*\(.*$/, "").replace(/[;.].*$/, "").slice(0, 40), words };
    renderFamily(w);
  }
  function renderFamily(w) {
    const box = $("#family");
    const fam = (w.family && w.family.words && w.family.words.length) ? w.family : (w.localFamily || w.family || { words: [] });
    if (!fam.words || !fam.words.length) { box.innerHTML = `<p class="fam-empty">${w.detailState === "loading" ? "Finding related words…" : t("famEmpty")}</p>`; return; }
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

  // ---------- Etymology card: summary, stages, changes of meaning ----------
  const SPEAKER = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>`;
  // ---- Etymology: development chain + a few bullets ----
  const FAMILY_NAME = { germanic: "Germanic", romance: "Latin / Romance", greek: "Greek", pie: "Proto-Indo-European", other: "another language" };
  const ARROW = `<svg viewBox="0 0 24 12" aria-hidden="true"><path d="M1 6h20M16 1l5 5-5 5"/></svg>`;
  const etNode = n => `<div class="et-node fam-${n.family}"><small>${esc(n.lang)}</small><b>${esc(n.form)}</b>${n.gloss ? `<i>“${esc(n.gloss)}”</i>` : ""}</div>`;
  const etArrow = chip => `<div class="et-arrow">${chip ? `<span>${esc(chip)}</span>` : ""}${ARROW}</div>`;
  const shortMeaning = m => String(m || "").replace(/\s*\(.*$/, "").replace(/[;.].*$/, "").trim();

  /** Boxes + bullets for a development chain (oldest → newest) or for the parts a word is formed from. */
  function chainView(word, nodes, parts, gloss, label) {
    const bullets = [];
    let flow = "";
    if (nodes.length) {
      flow = `<div class="et-flow">${nodes.map((n, i) => (i ? etArrow("") : "") + etNode(n)).join("")}${etArrow("")}<div class="et-node fam-en"><small>English</small><b>${esc(label || word)}</b></div></div>`;
      const nonPie = nodes.filter(n => n.family !== "pie");
      const src = nonPie[0] || nodes[0];
      const via = nodes.slice(nodes.indexOf(src) + 1).map(n => n.lang);
      bullets.push(`<b>Origin:</b> ${esc(src.lang)}${via.length ? `, through ${esc(via.join(" → "))}` : ""}.`);
      const oldest = nodes.find(n => n.gloss);
      if (oldest) bullets.push(`<b>Oldest meaning:</b> “${esc(oldest.gloss)}” (${esc(oldest.lang)} <i>${esc(oldest.form)}</i>)${gloss ? ` → today: ${esc(shortMeaning(gloss).slice(0, 90))}` : ""}.`);
      const pie = nodes.find(n => n.family === "pie");
      if (pie) bullets.push(`<b>Deepest root:</b> Proto-Indo-European <i>${esc(pie.form)}</i>${pie.gloss ? ` “${esc(pie.gloss)}”` : ""}.`);
    } else if (parts.length) {
      flow = `<div class="et-flow">${parts.map((p, i) => (i ? `<div class="et-plus">+</div>` : "") + `<div class="et-node fam-part"><b>${esc(p)}</b></div>`).join("")}${etArrow("")}<div class="et-node fam-en"><small>English</small><b>${esc(label || word)}</b></div></div>`;
      bullets.push(`<b>Formed in English</b> from ${esc(parts.join(" + "))}.`);
    }
    return { flow, bullets };
  }
  function historyHtml(word, text, gloss, label) {
    const r = window.MorphEtym.parse(text);
    return chainView(word, r.chain, r.parts, gloss, label);
  }

  let etymToken = 0;
  function renderEtymology(w, dict) {
    const box = $("#etym-body");
    if (!w && !dict) { box.innerHTML = `<p class="et-empty">Look up a word to see where it comes from.</p>`; return; }
    const word = (w && w.word) || (dict && dict.word) || "";
    const ipa = (w && w.ipa) || (dict && dict.ipa) || "";
    const ety = w && w.etymology;
    const dictText = dict && dict.etymology ? String(dict.etymology) : "";
    const steps = w ? window.MorphEtym.buildSteps(w) : [];
    const head = `<div class="et-head">
        <b class="et-word">${esc(word)}</b>${ipa ? `<span class="et-ipa">${esc(ipa)}</span>` : ""}
        <button type="button" class="et-speak" data-speak="${esc(word)}" aria-label="Hear “${esc(word)}”" title="Hear the word">${SPEAKER}</button>
      </div>`;
    // 1. how the word is built, step by step (nation → national → nationalize → …)
    let build = "";
    const bullets = [];
    if (steps.length) {
      const first = steps[0];
      build = `<h4>How the word is built</h4><div class="et-flow et-build">
        <div class="et-node fam-part"><b>${esc(first.from)}</b></div>
        ${steps.map(s => `${etArrow((s.prefix ? "" : "+ ") + s.add + (s.prefix ? " +" : ""))}<div class="et-node fam-part${s === steps[steps.length - 1] ? " fam-en" : ""}"><b>${esc(s.to)}</b>${s.cat ? `<small>${esc(s.cat)}</small>` : ""}</div>`).join("")}
      </div>`;
      w.morphemes.forEach(m => { const mm = shortMeaning(m.meaning); if (mm && m.type !== "root") bullets.push(`<b>${esc(m.form)}</b> — ${esc(mm)}`); });
    }
    // 2. where it comes from: the base word's history (or the word's own)
    const baseM = w && w.morphemes.length > 1 ? w.morphemes.find(m => m.type === "root" && m.cls === "root-free" && /^[a-z]+$/i.test(m.form)) : null;
    const aiNodes = ((ety && Array.isArray(ety.chain)) ? ety.chain : []).filter(n => n && n.form && n.lang)
      .map(n => ({ lang: String(n.lang), form: String(n.form), gloss: String(n.gloss || ""), family: window.MorphEtym.familyOf(String(n.lang)) }));
    let own = historyHtml(word, dictText, dict && dict.gloss);
    let fromAi = false;
    if (!own.flow && aiNodes.length) { own = chainView(word, aiNodes, [], (w && w.gloss) || (dict && dict.gloss) || "", word); fromAi = true; }
    const token = ++etymToken;
    const holder = `<div id="et-history"></div>`;
    const fullText = [dictText, ety && ety.summary && ety.summary !== dictText ? ety.summary : ""].filter(Boolean).join("\n\n");
    const empty = !build && !own.flow && !bullets.length;
    box.innerHTML = `${head}
      ${build}
      ${baseM ? holder : (own.flow ? `<h4>Where it comes from${fromAi ? ` <span class="et-ai">AI</span>` : ""}</h4>${own.flow}` : "")}
      ${!baseM && own.bullets.length ? `<ul class="et-points">${own.bullets.map(b => `<li>${b}</li>`).join("")}</ul>` : ""}
      ${bullets.length ? `<h4>Parts</h4><ul class="et-points">${bullets.map(b => `<li>${b}</li>`).join("")}</ul>` : ""}
      ${empty ? (w && w.detailState === "loading" ? `<p class="et-empty">Writing the etymology…</p>` : `<p class="et-empty">The dictionary has no etymology for this word.</p>`) : ""}
      ${fullText ? `<details class="et-full"><summary>Full dictionary text</summary><p>${esc(fullText).replace(/\n\n/g, "<br><br>")}</p>${ety ? `<p class="et-note">AI summary: written from the dictionary entry; check the dictionary for the original.</p>` : ""}</details>` : ""}`;
    if (baseM) {
      window.MorphDict.lookup(baseM.form).then(res => {
        if (token !== etymToken) return;
        if (!res || !res.found) res = { found: true, entry: { word: baseM.form, blocks: [] } };
        const s = window.MorphDict.summarize(res.entry);
        const h = historyHtml(baseM.form, s.etymology || "", s.gloss, baseM.form);
        const el = $("#et-history");
        if (!el) return;
        if (!h.flow) {
          if (aiNodes.length) { const v = chainView(word, aiNodes, [], (w && w.gloss) || "", word); el.innerHTML = `<h4>Where it comes from <span class="et-ai">AI</span></h4>${v.flow}<ul class="et-points">${v.bullets.map(b => `<li>${b}</li>`).join("")}</ul>`; }
          return;
        }
        el.innerHTML = `<h4>Where “${esc(baseM.form)}” comes from</h4>${h.flow}<ul class="et-points">${h.bullets.map(b => `<li>${b}</li>`).join("")}</ul>`;
      }).catch(() => {});
    }
  }

  function renderAll() {
    const w = state.word;
    if (!w) return;
    $(".details").hidden = false;
    renderHead(w, state.dict);
    renderBricks(w.morphemes);
    window.ICTree.render($("#tree"), w, t, state.treeStyle);
    $("#detail-title").innerHTML = `<span class="target">“${esc(w.word)}”</span> has ${w.morphemes.length} morpheme${w.morphemes.length === 1 ? "" : "s"}`;
    renderClassification(w);
    renderWordType(w);
    renderCheat(w);
    renderEtymology(w, state.dict);
    renderDetailStatus(w);
    renderAllo(w);
    renderFamily(w);
    if (w.detailState === "none" || w.detailState === "ready") ensureLocalFamily(w, state.token);
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
    $(".details").hidden = true;
    renderEtymology(null, dict);
  }

  /** AI cannot run (no key or provider error): keep the page, show the dictionary card and calm placeholders. */
  function renderUnavailable(word, dict) {
    renderHead({ word, morphemes: null, tree: null, process: "" }, dict);
    const src = $("#w-source");
    src.className = "tag source";
    src.textContent = "AI not connected";
    $("#bricks").innerHTML = `<div class="empty-card"><b>No analysis yet</b><span>Connect an AI provider in the box above and “${esc(word)}” will be cut into morphemes here.</span></div>`;
    $("#tree").innerHTML = `<div class="tree-wait"><div>The IC tree appears here once the word has been analysed.</div></div>`;
    $(".details").hidden = true;
    renderEtymology(null, dict);
  }

  // ---------- AI banner (replaces blank pages and red errors) ----------
  function showBanner(cfg) {
    $("#banner-title").textContent = cfg.title;
    $("#banner-msg").textContent = cfg.msg || "";
    $("#banner-detail").innerHTML = cfg.detail
      ? `<details class="banner-detail"><summary>Technical details</summary><pre>${esc(cfg.detail)}</pre><button type="button" class="btn btn-ghost" data-copy>Copy details</button></details>` : "";
    state.bannerDetail = cfg.detail || "";
    $("#banner-alt").innerHTML = (cfg.retry ? `<button type="button" class="btn" data-retry>Try again</button>` : "") + (cfg.alts || []).map(p =>
      `<button type="button" class="btn btn-light" data-provider="${p}">Try with ${esc(PROV[p].name)}</button>`).join("");
    state.bannerWord = cfg.word || null;
    $("#ai-banner").hidden = false;
    bannerForm.render(cfg.provider || getProvider());
  }
  const hideBanner = () => { $("#ai-banner").hidden = true; };

  // ---------- Popup banners: every message that is not part of the result appears here ----------
  function removePopup(el) {
    if (!el || !el.parentNode) return;
    el.classList.add("out");
    setTimeout(() => el.remove(), 220);
  }
  function popup({ tone, html, sticky, kind }) {
    if (kind === "notice") $$("#popups .popup[data-kind=notice]").forEach(removePopup);
    const el = document.createElement("div");
    el.className = "popup " + tone;
    el.dataset.kind = kind || "notice";
    el.setAttribute("role", tone === "error" ? "alert" : "status");
    el.innerHTML = `<span class="popup-ico" aria-hidden="true">${tone === "error" ? "!" : tone === "warn" ? "?" : "i"}</span>
      <div class="popup-body">${html}</div>
      <button type="button" class="popup-x" aria-label="Dismiss">×</button>`;
    $("#popups").appendChild(el);
    if (!sticky) setTimeout(() => removePopup(el), 7000);
    return el;
  }
  function showNotice(html, isError) {
    const hasActions = /<button/.test(html);
    popup({ tone: isError ? "error" : hasActions ? "warn" : "info", html, sticky: isError || hasActions, kind: "notice" });
  }
  const hideNotice = () => { $$("#popups .popup[data-kind=notice]").forEach(removePopup); };

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
    s.tags = res.via && res.via.tags;
    s.lemma = res.headword;
    return s;
  }

  /** Look-up feedback: a thin progress bar, a busy button and a dimmed result until the answer (or the AI overlay) is on screen. */
  function setBusy(on) {
    $("#busybar").hidden = !on;
    const btn = document.querySelector("#search button[type=submit]");
    btn.textContent = on ? "Looking up…" : "Analyze";
    btn.setAttribute("aria-busy", on ? "true" : "false");
    $("#result").classList.toggle("is-busy", on);
    $$("#level button").forEach(b => b.classList.toggle("is-loading", on && b.classList.contains("active")));
  }
  let busyTimer = 0;
  async function show(raw, opts) {
    clearTimeout(busyTimer);
    busyTimer = setTimeout(() => setBusy(true), 120);          // only when the answer is not instant
    try { return await showWord(raw, opts); }
    finally { clearTimeout(busyTimer); setBusy(false); }
  }

  async function showWord(raw, opts) {
    opts = opts || {};
    const key = validWord(raw || "");
    if (!raw || !raw.trim()) { $("#word-input").focus(); return; }
    setView("analyze");
    if (!key) { showNotice("Please type one English word (letters, apostrophe or hyphen only).", true); return; }
    if (state.abort) state.abort.abort();
    const token = ++state.token;
    hideNotice();
    hideBanner();
    hideOverlay();
    clearTimeout(suggestTimer); suggestSeq++;   // a late suggestion must not reopen the list after a search
    $("#suggest").hidden = true;
    $("#word-input").value = key;

    // 1. verified words: instant.
    const verified = DB[key];
    // 2. earlier AI answers.
    const cached = verified ? null : cacheGet(key);

    // Dictionary lookup starts at once, in parallel with everything else.
    const dictP = window.MorphDict.lookup(key).catch(() => null);

    // 1b. pre-cut lexicon (also builds regular inflected forms from their lemma): no AI needed for the cut.
    let lx = null;
    const level = state.level;
    {
      const r = await window.MorphLex.resolve(key, await dictP, level).catch(() => null);
      if (token !== state.token) return;
      // A verified (hand-checked) word stays as it is, unless the advanced layer has its own cut for it.
      if (r && (!verified || r.level === "adv")) lx = r;
    }
    if (lx) {
      const sig = ms => ms.map(m => m.form + "|" + m.surface).join(";");
      const provider = getProvider();
      const canWrite = !!getKey(provider);
      // An earlier AI double-check that changed the cut is shown again (unless the student went back to the course key).
      if (state.aiCheck && canWrite && cached && cached.source === "ai-check" && cached.level === level && !keyPref()[key + "@" + level]) {
        state.word = cached; state.source = "ai-check";
        state.dict = dictContext(await dictP);
        if (token !== state.token) return;
        $("#result").hidden = false;
        renderAll(); finish(key, opts);
        setCheckStatus(`The AI double-check changed the cut earlier: <b>${esc(cached.original ? cached.original.morphemes.map(m => m.form).join(" + ") : "")}</b> → <b>${esc(cached.morphemes.map(m => m.form).join(" + "))}</b>. <button type="button" data-ai-revert>Use the course key instead</button>`, "changed");
        if (cached.detailState !== "ready") { state.abort = new AbortController(); startDetails(key, provider, getModel(provider), token); }
        return;
      }
      if (lx.ai.morphemes.length >= 3) await Promise.race([window.MorphDict.preloadWords(), new Promise(r => setTimeout(r, 700))]);   // lets the tree rules check that intermediate words exist (never holds the answer back long)
      if (token !== state.token) return;
      const data = window.MorphAI.toAppFormat(lx.ai, key, "lexicon");
      data.level = level;
      const reuse = cached && cached.detailState === "ready" && cached.source !== "ai-check" && sig(cached.morphemes) === sig(data.morphemes);
      data.source = lx.level === "adv" ? "lexicon-adv" : "lexicon";
      data.detailState = canWrite ? "loading" : "none";
      state.word = reuse ? cached : data;
      state.source = reuse ? "cache" : data.source;
      state.dict = dictContext(await dictP);
      if (token !== state.token) return;
      $("#result").hidden = false;
      setCheckStatus("");
      renderAll();
      finish(key, opts);
      if (!reuse) fillLocalMeanings(state.word, token);
      if (!reuse && canWrite) {
        state.abort = new AbortController();
        // The AI re-checks the cut first (its answer wins when it differs); the writing is requested for whatever cut is final.
        (async () => {
          const keyData = state.word;
          if (state.aiCheck && !keyPref()[key + "@" + level]) await runAiCheck(key, token, level, keyData);
          if (token !== state.token) return;
          startDetails(key, provider, getModel(provider), token);
        })();
      } else if (reuse) {
        setCheckStatus("");
      }
      return;
    }

    if (verified || cached) {
      state.word = verified || cached;
      state.source = verified ? "verified" : "cache";
      state.dict = dictContext(await dictP);
      if (token !== state.token) return;
      $("#result").hidden = false;
      renderAll();
      finish(key, opts);
      // An answer saved before its writing arrived: ask for the writing again.
      if (cached && cached.detailState && cached.detailState !== "ready" && getKey(getProvider())) {
        state.abort = new AbortController();
        startDetails(key, getProvider(), getModel(getProvider()), token);
      }
      return;
    }

    const dictRes = await dictP;
    if (token !== state.token) return;
    state.dict = dictContext(dictRes);

    // Not in the dictionary: look for related dictionary words first. A word built from known words
    // (construction ← construct) is real; only an unexplained word gets spelling suggestions.
    let nb = null, sugg = [];
    if (!dictRes || !dictRes.found) {
      nb = dictRes === null ? null : await window.MorphDict.neighbours(key).catch(() => null);
      if (token !== state.token) return;
      state.neighbours = nb;
      // A word the dictionary does not know goes to the AI at once. Spelling suggestions are only offered next to the answer.
      if (dictRes !== null && !(nb && nb.likely)) sugg = await window.MorphDict.fuzzy(key).catch(() => []);
      if (token !== state.token) return;
    }

    const provider = getProvider();
    if (!getKey(provider)) {
      $("#result").hidden = false;
      state.word = null; state.source = "ai";
      renderUnavailable(key, state.dict);
      showBanner({
        title: `Connect an AI to analyse “${key}”`,
        msg: "Pick a provider, paste your key and press Save & test. The verified words and the dictionary keep working without it.",
        word: key, alts: keyedProviders()
      });
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
    } else if (!state.dict && sugg.length) {
      showNotice(`“${esc(key)}” is not in the dictionary, so the AI is analysing it. Did you mean: ` +
        sugg.map(s => `<button type="button" data-word="${esc(s)}">${esc(s)} →</button>`).join(""));
    } else if (!state.dict) {
      showNotice(nb && (nb.bases.length || nb.family.length)
        ? `“${esc(key)}” is not in the dictionary, so it is cut using related words: ${esc([...nb.bases.map(b => b.word), ...nb.family].filter((w, i, arr) => arr.indexOf(w) === i).slice(0, 6).join(", "))}.`
        : `“${esc(key)}” is not in the dictionary — it will be analysed as a made-up word.`);
    }

    const attempts = [];   // everything that failed, for the banner
    showOverlay(key, `Asking ${PROV[provider].name} (${getModel(provider)}) …`);
    try {
      const run = await analyzeWithFallback(key, provider, token, attempts);
      if (token !== state.token) return;
      hideOverlay();
      run.data.level = level;
      state.word = run.data;
      state.source = "ai";
      cachePut(key, run.data);
      renderAll();
      finish(key, opts);
      fillLocalMeanings(run.data, token);
      startDetails(key, run.provider, run.model, token);
      if (run.data.warnings && run.data.warnings.length) {
        popup({ tone: "warn", kind: "warning", sticky: true, html: `<b>Check this cut.</b> ${run.data.warnings.map(esc).join(" ")}` });
      }
      if (run.provider !== provider || run.model !== getModel(provider)) {
        const first = attempts[0];
        // The saved model no longer exists for this key: remember the one that worked.
        if (first && (first.status === 404 || first.status === 400) && run.provider === provider) store.set(modelName(provider), run.model);
        showNotice(`${esc(PROV[provider].name)} (${esc(getModel(provider))}) could not answer${first ? ` — ${esc(first.short)}` : ""}, so this analysis came from <b>${esc(PROV[run.provider].name)}</b> (${esc(run.model)}).`);
      }
    } catch (err) {
      if (err.name === "AbortError" || token !== state.token) { if (token === state.token) hideOverlay(); return; }
      hideOverlay();
      $("#result").hidden = false;
      state.word = null;
      renderUnavailable(key, state.dict);
      hideNotice();
      const last = attempts[attempts.length - 1] || { status: err.status, message: err.message, provider, model: getModel(provider) };
      const known = err instanceof window.MorphAI.ApiError || err.name === "ApiError";
      const detail = [
        `word: ${key}`,
        ...attempts.map((x, i) => `try ${i + 1}: ${x.provider} / ${x.model} → status ${x.status === undefined ? "-" : x.status}: ${x.message}${x.raw ? `\n   provider said: ${x.raw.replace(/\s+/g, " ").slice(0, 400)}` : ""}`),
        !known && err.stack ? `stack:\n${String(err.stack).split("\n").slice(0, 5).join("\n")}` : "",
        `page: ${location.href}`
      ].filter(Boolean).join("\n");
      const tried = attempts.length > 1 ? ` I tried ${attempts.length} times (${[...new Set(attempts.map(x => PROV[x.provider].name))].join(", ")}). Last answer: ` : " ";
      showBanner({
        title: "The AI is not available right now",
        msg: known || attempts.length ? `${tried.trim() ? tried.trim() + " " : ""}${last.message}`.trim() : "Something unexpected went wrong: " + err.message,
        detail, word: key, provider: last.provider || provider,
        alts: keyedProviders().filter(p => !attempts.some(x => x.provider === p)),
        retry: true
      });
    }
  }

  // ---------- Stage 2: meanings, etymology and word family arrive after the cut ----------
  /** Meanings that need no AI: a free root means what the dictionary says its word means. */
  async function fillLocalMeanings(w, token) {
    let changed = false;
    await Promise.all(w.morphemes.map(async m => {
      if (m.meaning || m.type !== "root" || m.cls !== "root-free" || !/^[a-z]+$/i.test(m.form)) return;
      const r = await window.MorphDict.lookup(m.form).catch(() => null);
      if (!r || !r.found) return;
      const s = window.MorphDict.summarize(r.entry);
      if (s.gloss && !m.meaning) { m.meaning = (s.pos ? `(${s.pos}) ` : "") + s.gloss; changed = true; }
    }));
    if (changed && token === state.token && state.word === w) renderDetails(w);
  }

  async function startDetails(key, provider, model, token) {
    const w = state.word;
    if (!w || w.word !== key) return;
    w.detailState = "loading";
    renderDetailStatus(w);
    // Same recovery as the cut: retry a busy model once, then another model of the key, then another provider.
    const plan = await buildPlan(provider).catch(() => [{ provider, model, retry: true }]);
    const deadline = Date.now() + 45000;
    let lastErr, firstErr;
    for (const step of plan) {
      if (token !== state.token || state.word !== w) return;
      if (lastErr && Date.now() > deadline) break;
      const tries = step.retry ? 2 : 1;
      for (let n = 1; n <= tries; n++) {
        try {
          const d = await window.MorphAI.enrich({
            word: key, provider: step.provider, apiKey: getKey(step.provider), model: step.model, morphemes: w.morphemes,
            context: state.dict, neighbours: state.neighbours, level: w.level || state.level,
            signal: state.abort && state.abort.signal, timeoutMs: Math.max(6000, Math.min(25000, deadline - Date.now()))
          });
          if (token !== state.token || state.word !== w) return;
          w.morphemes.forEach((m, i) => { if (!m.fixedMeaning && d.morphemes[i].meaning) m.meaning = d.morphemes[i].meaning; if (d.morphemes[i].etym) m.etym = d.morphemes[i].etym; });
          w.insights = d.insights; w.family = d.family; w.etymology = d.etymology;
          if (d.gloss) w.gloss = d.gloss;
          w.detailState = "ready";
          // The saved model no longer exists for this key: remember the one that worked.
          if (firstErr && (firstErr.status === 404 || firstErr.status === 400) && step.provider === provider && step.model !== model) store.set(modelName(provider), step.model);
          cachePut(key, w);
          renderDetails(w);
          return;
        } catch (err) {
          if (err.name === "AbortError" || token !== state.token || state.word !== w) return;
          lastErr = err; firstErr = firstErr || err;
          noteFailure(step, err);
          if (err.status >= 500 && err.status !== 408 && n < tries) { await new Promise(r => setTimeout(r, 900)); continue; }
          break;
        }
      }
    }
    w.detailState = "failed";
    w.detailError = lastErr ? shortReason(lastErr) : "";
    renderDetails(w);
    ensureLocalFamily(w, token);
  }

  /** Re-draw only the parts that depend on the writing (the cut and the tree stay as they are). */
  function renderDetails(w) {
    renderHead(w, state.dict);
    renderClassification(w);
    renderAllo(w);
    renderFamily(w);
    renderEtymology(w, state.dict);
    renderDetailStatus(w);
    if (w.detailState === "failed" || w.detailState === "none") ensureLocalFamily(w, state.token);
  }

  function renderDetailStatus(w) {
    const el = $("#detail-status");
    if (!w || w.detailState === "ready" || !w.detailState) { el.innerHTML = ""; return; }
    if (w.detailState === "none") { el.innerHTML = `Add an AI key in Settings to see meanings and etymology.`; return; }
    el.innerHTML = w.detailState === "loading"
      ? `<span class="ds-spin"></span>Writing meanings and etymology…`
      : `Some details could not be loaded${w.detailError ? " (" + esc(String(w.detailError).replace(/\s+/g, " ").slice(0, 120)) + ")" : ""}. <button type="button" data-retry-details>Try again</button>`;
  }

  // ---------- Loading overlay ----------
  let overlayTimer = 0;
  function showOverlay(word, msg) {
    const o = $("#loading-overlay");
    $("#ov-title").textContent = `Analysing “${word}”`;
    $("#ov-msg").textContent = msg || "Starting…";
    $("#ov-time").textContent = "0 s";
    o.hidden = false;
    const t0 = Date.now();
    clearInterval(overlayTimer);
    overlayTimer = setInterval(() => { $("#ov-time").textContent = Math.round((Date.now() - t0) / 1000) + " s"; }, 500);
  }
  function setOverlay(msg, who) {
    if (msg) $("#ov-msg").textContent = msg;
    if (who !== undefined) $("#ov-model").textContent = who;
  }
  function hideOverlay() {
    clearInterval(overlayTimer);
    $("#loading-overlay").hidden = true;
  }

  // ---------- Analysis with automatic recovery (retry, other model, other provider) ----------
  const shortReason = e => e.status === 404 ? "model not available for this key" : e.status === 429 ? "rate limit or quota" : e.status === 408 ? "too slow" : e.status >= 500 ? "busy" : e.status === 401 ? "key rejected" : e.status === 0 ? "no connection" : "error";

  async function geminiAlternatives(current) {
    try {
      state.modelCache = state.modelCache || {};
      const list = state.modelCache.gemini || (state.modelCache.gemini = await window.MorphAI.listModels("gemini", getKey("gemini")));
      const ids = list.map(m => m.id).filter(id => /^gemini-[\d.]+-flash(-lite)?$/.test(id) && id !== current);
      ids.sort((a, b) => (/lite/.test(a) - /lite/.test(b)) || parseFloat(b.split("-")[1]) - parseFloat(a.split("-")[1]));
      return ids.slice(0, 1);
    } catch (e) {
      return ["gemini-2.5-flash", "gemini-2.5-flash-lite"].filter(id => id !== current);
    }
  }

  /** Remember what failed so the next look-up does not wait for it again: 404 = model not available for this key; 429 = cool down. */
  function noteFailure(step, err) {
    const id = step.provider + ":" + step.model;
    if (err && err.status === 404) state.deadModels.add(id);
    if (err && err.status === 429) state.cool[id] = Date.now() + 45000;
  }
  const usable = step => { const id = step.provider + ":" + step.model; return !state.deadModels.has(id) && !(state.cool[id] > Date.now()); };
  const allCooling = provider => { const id = provider + ":" + getModel(provider); return state.cool[id] > Date.now(); };
  async function buildPlan(provider) {
    const model = getModel(provider);
    const plan = [{ provider, model, retry: true }];
    const same = provider === "gemini" ? await geminiAlternatives(model) : PROV[provider].models.map(m => m.id).filter(id => id !== model).slice(0, 1);
    same.forEach(id => plan.push({ provider, model: id }));
    keyedProviders().filter(pr => pr !== provider).forEach(pr => plan.push({ provider: pr, model: getModel(pr) }));
    const ok = plan.filter(usable);
    return ok.length ? ok : plan.slice(0, 1);
  }

  async function analyzeWithFallback(key, provider, token, attempts, extra) {
    extra = extra || {};
    const plan = await buildPlan(provider);
    const say = msg => { const m = $("#wait-msg"); if (m && token === state.token) m.textContent = msg; setOverlay(msg); };
    const deadline = Date.now() + (extra.totalMs || 75000);      // never keep the student waiting longer than this in total
    let lastErr;
    for (const step of plan) {
      if (token !== state.token) throw Object.assign(new Error("superseded"), { name: "AbortError" });
      if (attempts.length && Date.now() > deadline) break;
      const tries = step.retry ? 2 : 1;
      for (let n = 1; n <= tries; n++) {
        try {
          setOverlay(attempts.length ? `Trying ${PROV[step.provider].name} · ${step.model} …` : `Asking ${PROV[step.provider].name} to cut the word into morphemes …`, `${PROV[step.provider].name} · ${step.model}`);
          const data = await window.MorphAI.analyze({
            word: key, provider: step.provider, apiKey: getKey(step.provider), model: step.model,
            context: state.dict, neighbours: state.neighbours, level: extra.level || state.level, firstAnswer: extra.firstAnswer, signal: extra.signal || state.abort.signal, timeoutMs: Math.max(6000, Math.min(extra.stepMs || 30000, deadline - Date.now())),
            onMorphemes: ms => { if (!extra.quiet && token === state.token) { renderBricks(ms); setOverlay(`Receiving the answer … ${ms.length} morpheme${ms.length === 1 ? "" : "s"} so far`); } },
            onAttempt: () => { if (!extra.quiet) say("Double-checking the cuts…"); }
          });
          return { data, provider: step.provider, model: step.model };
        } catch (err) {
          if (err.name === "AbortError") throw err;
          lastErr = err;
          noteFailure(step, err);
          attempts.push({
            provider: step.provider, model: step.model, status: err.status, message: err.message, raw: err.raw || "",
            short: shortReason(err)
          });
          const busy = err.status >= 500 && err.status !== 408;
          if (busy && n < tries) { say(`${PROV[step.provider].name} is busy, trying again…`); await new Promise(r => setTimeout(r, 1000)); continue; }
          break;
        }
      }
      if (step !== plan[plan.length - 1]) say(`${PROV[step.provider].name} did not answer, trying another option…`);
    }
    throw lastErr;
  }

  // ---- AI double-check: after a word is cut from the course key, the AI re-checks the cut and its answer is used when it disagrees ----
  const formsSig = ms => ms.map(m => m.form.replace(/-/g, "").toLowerCase() + "|" + m.type).join(";");
  const keyPref = () => store.json(LS.keypref, {});
  function setCheckStatus(html, tone) {
    const el = $("#ai-check");
    el.className = "ai-check" + (tone ? " " + tone : "");
    el.innerHTML = html || "";
    el.hidden = !html;
  }
  /** → true when the AI replaced the course cut on screen. */
  async function runAiCheck(key, token, level, keyData) {
    const provider = getProvider();
    if (!state.aiCheck || !getKey(provider)) { setCheckStatus(""); return false; }
    if (allCooling(provider) && keyedProviders().length < 2) {
      setCheckStatus(`The AI is resting (rate limit reached a moment ago), so the double-check was skipped. <button type="button" data-ai-again>Check now</button>`, "warn");
      return false;
    }
    setCheckStatus(`<span class="ds-spin"></span>The AI is double-checking this cut… <button type="button" data-ai-skip>Skip</button>`, "run");
    const first = keyData.morphemes.map(m => m.form).join(" + ");
    const ctl = new AbortController();
    state.checkAbort = ctl;
    const attempts = [];
    try {
      const run = await analyzeWithFallback(key, provider, token, attempts, { firstAnswer: first, level, quiet: true, signal: ctl.signal, totalMs: 22000, stepMs: 14000 });
      if (token !== state.token || state.word !== keyData) return false;
      const data = run.data;
      if (attempts.length && run.provider === provider && run.model !== getModel(provider) && (attempts[0].status === 404 || attempts[0].status === 400)) store.set(modelName(provider), run.model);
      if (formsSig(data.morphemes) === formsSig(keyData.morphemes)) {
        keyData.checked = true;
        setCheckStatus(`✓ Double-checked by the AI: it agrees with this cut.`, "ok");
        return false;
      }
      data.level = level; data.source = "ai-check"; data.original = keyData; data.detailState = "loading";
      state.word = data; state.source = "ai-check";
      renderAll();
      fillLocalMeanings(data, token);
      setCheckStatus(`The AI double-check changed the cut: <b>${esc(first)}</b> → <b>${esc(data.morphemes.map(m => m.form).join(" + "))}</b>. <button type="button" data-ai-revert>Use the course key instead</button>`, "changed");
      return true;
    } catch (err) {
      if (token !== state.token) return false;
      if (err.name === "AbortError") { setCheckStatus(`Double-check skipped. The course key is shown. <button type="button" data-ai-again>Check now</button>`, ""); return false; }
      setCheckStatus(`AI double-check unavailable (${esc(shortReason(err))}). The course key is shown. <button type="button" data-ai-again>Try again</button>`, "warn");
      return false;
    }
  }

  /** One line under the level switch when the other level would cut this word differently. */
  async function levelNote(word) {
    const note = $("#lv-note");
    note.hidden = true;
    let r;
    try { r = await window.MorphLex.both(word); } catch (e) { return; }
    if (state.word && state.word.word !== word) return;
    const basic = (DB[word] ? DB[word].morphemes : r.basic);
    const forms = ms => ms.map(m => m.form).join(" + ");
    if (!basic || !r.adv || forms(basic) === forms(r.adv)) return;
    const here = state.level === "adv";
    note.innerHTML = here
      ? `<b>Advanced cut</b> (${r.adv.length} morphemes: ${esc(forms(r.adv))}). The <b>Basic</b> cut is ${esc(forms(basic))} (${basic.length}). <button type="button" data-set-level="basic">Show Basic</button>`
      : `This word also has an <b>Advanced</b> cut: ${esc(forms(r.adv))} (${r.adv.length} morphemes). <button type="button" data-set-level="adv">Show Advanced</button>`;
    note.hidden = false;
  }

  function finish(key, opts) {
    levelNote(key);
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
      if (window.MorphLex && window.MorphLex.prefetch) window.MorphLex.prefetch(q.toLowerCase(), state.level);   // warm the lexicon file for these letters
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

  // ---------- Key form (used in Settings and inside the banner) ----------
  function mountKeyForm(root, opts) {
    opts = opts || {};
    let viewing = null;   // provider whose form is shown (may differ from the active one)
    root.innerHTML = `<div class="kf">
      <div class="pills" data-r="pills" role="tablist" aria-label="AI provider"></div>
      <p class="kf-help">Get a key at <a data-r="link" href="#" target="_blank" rel="noopener"></a>. It is saved only in this browser and sent only to this provider.</p>
      <form data-r="form" autocomplete="off">
        <label class="field"><span>API key</span>
          <div class="field-row"><input data-r="key" type="password" spellcheck="false" autocomplete="off" autocapitalize="off">
            <button type="button" data-r="toggle" class="btn btn-ghost" aria-pressed="false">Show</button></div></label>
        <label class="field"><span>Model</span>
          <div class="field-row"><select data-r="model"></select>
            <button type="button" data-r="load" class="btn btn-ghost">Load my models</button></div></label>
        <details class="kf-more"><summary>Use a different model ID</summary>
          <input data-r="custom" type="text" placeholder="model id" spellcheck="false" autocomplete="off" autocapitalize="off"></details>
        <div class="btn-row">
          <button type="submit" class="btn">Save &amp; test</button>
          <button type="button" data-r="active" class="btn btn-ghost" hidden>Make active</button>
          <button type="button" data-r="remove" class="btn btn-ghost">Remove key</button>
        </div>
        <p class="prov-state" data-r="state"></p>
        <p class="key-status" data-r="status" role="status"></p>
      </form></div>`;
    const q = r => root.querySelector(`[data-r="${r}"]`);
    const say = (msg, cls) => { q("status").textContent = msg; q("status").className = "key-status " + (cls || ""); };
    const chosenModel = () => q("custom").value.trim() || q("model").value;

    function fillModels(list, selected) {
      const items = !selected || list.some(m => m.id === selected) ? list : [{ id: selected, label: selected }, ...list];
      q("model").innerHTML = items.map(m => `<option value="${esc(m.id)}">${esc(m.label)}</option>`).join("");
      q("model").value = selected || items[0].id;
    }

    function render(provider) {
      if (provider) viewing = provider;
      if (!viewing) viewing = getProvider();
      const active = getProvider(), cfg = PROV[viewing];
      q("pills").innerHTML = PROV_IDS.map(p => `
        <button type="button" role="tab" class="pill${p === viewing ? " on" : ""}" data-prov="${p}" aria-selected="${p === viewing}">
          ${esc(PROV[p].name)}${getKey(p) ? `<i class="pill-dot${p === active ? " act" : ""}" title="${p === active ? "active" : "key saved"}"></i>` : ""}
        </button>`).join("");
      q("link").href = cfg.keyUrl;
      q("link").textContent = new URL(cfg.keyUrl).host;
      q("key").value = getKey(viewing);
      q("key").placeholder = cfg.keyHint;
      fillModels(cfg.models, getModel(viewing));
      q("custom").value = "";
      q("active").hidden = viewing === active || !getKey(viewing);
      q("state").textContent = getKey(viewing)
        ? (viewing === active ? `${cfg.name} is the active provider.` : `Key saved. Active provider: ${PROV[active].name}.`)
        : `No key saved for ${cfg.name} yet.`;
      say("");
    }

    q("pills").addEventListener("click", e => {
      const b = e.target.closest("[data-prov]");
      if (b) render(b.dataset.prov);
    });
    q("toggle").addEventListener("click", e => {
      const show_ = q("key").type === "password";
      q("key").type = show_ ? "text" : "password";
      e.target.textContent = show_ ? "Hide" : "Show";
      e.target.setAttribute("aria-pressed", String(show_));
    });
    q("form").addEventListener("submit", async e => {
      e.preventDefault();
      const key = q("key").value.trim(), p = viewing, model = chosenModel();
      if (!key) { say("Paste your API key first.", "err"); return; }
      if (/\s/.test(key) || key.length < 20) { say("That does not look like a complete API key. Copy the whole key from the provider's page.", "err"); return; }
      say("Testing the key…");
      let useModel = model, note = "";
      try {
        try { await window.MorphAI.testKey(p, key, useModel); }
        catch (err) {
          if (err.status === 429) note = " (it is rate-limited right now, but the key is accepted)";          // a limit means the key is valid
          else if (err.status === 404 || err.status === 403 || err.status === 400) {
            // The key may be fine and only this model is not open to it: find one that is.
            say("That model is not open to this key. Looking for one that is…");
            const list = await window.MorphAI.listModels(p, key);          // a rejected key fails here with 401
            const pick = p === "gemini" ? window.MorphAI.pickGeminiModel(list) : (list.find(m => !/whisper|tts|guard|embed|moderation|image|audio/i.test(m.id)) || {}).id;
            if (!pick) throw err;
            await window.MorphAI.testKey(p, key, pick);
            useModel = pick; note = ` (using ${pick}, the model your key can use)`;
          } else throw err;
        }
        store.set(modelName(p), useModel);
        const saved = store.set(keyName(p), key);
        setProvider(p);
        refreshKeyUi();
        if (opts.onSaved) { opts.onSaved(p); }
        render(p);
        say(saved ? `Key saved on this device and working${note}. ${PROV[p].name} is now active.` : "The key works, but this browser blocks saving it. It will be forgotten when you close the tab.", saved ? "ok" : "err");
      } catch (err) {
        say(err.message + (err.status === 404 ? " Press “Load my models” to see which ones your key can use." : ""), "err");
      }
    });
    q("load").addEventListener("click", async () => {
      const key = q("key").value.trim();
      if (!key) { say("Paste your API key first.", "err"); return; }
      say("Asking the provider which models your key can use…");
      try {
        const list = await window.MorphAI.listModels(viewing, key);
        if (!list.length) { say("The provider returned no models for this key.", "err"); return; }
        const chat = list.filter(m => !/whisper|tts|guard|embed|moderation|dall-e|image|audio|transcribe|realtime|search-preview|orpheus|safeguard|allam/i.test(m.id));
        const pool = chat.length ? chat : list;
        const PREFER = {
          groq: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.1-8b-instant"],
          xai: ["grok-4", "grok-3-mini", "grok-3"], openai: ["gpt-4.1-mini", "gpt-4o-mini", "gpt-4.1"],
          anthropic: ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"], openrouter: ["google/gemini-2.5-flash", "openai/gpt-4o-mini"]
        }[viewing] || [];
        const rank = id => { const i = PREFER.indexOf(id); return i < 0 ? 99 : i; };
        pool.sort((x, y) => rank(x.id) - rank(y.id) || x.id.localeCompare(y.id));
        const guess = viewing === "gemini" ? window.MorphAI.pickGeminiModel(pool) : "";
        fillModels(pool, guess || pool[0].id);
        say(`${pool.length} chat models found${list.length > pool.length ? ` (${list.length - pool.length} audio, safety or other models hidden)` : ""}. The first one is the recommended choice; press Save & test.`, "ok");
      } catch (err) { say(err.message, "err"); }
    });
    q("active").addEventListener("click", () => { setProvider(viewing); refreshKeyUi(); render(); });
    q("remove").addEventListener("click", () => {
      store.del(keyName(viewing));
      if (getProvider() === viewing) store.del(LS.provider);
      refreshKeyUi();
      render();
      say("Key removed from this browser.", "ok");
    });
    return { render };
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
      const speak = e.target.closest("[data-speak]");
      if (speak) {
        try {
          const u = new SpeechSynthesisUtterance(speak.dataset.speak);
          u.lang = "en-US"; u.rate = 0.9;
          speechSynthesis.cancel(); speechSynthesis.speak(u);
        } catch (err) { /* speech not available */ }
        return;
      }
      if (e.target.closest("[data-copy]")) {
        const btn = e.target.closest("[data-copy]");
        const done = () => { btn.textContent = "Copied"; setTimeout(() => { btn.textContent = "Copy details"; }, 1500); };
        try { navigator.clipboard.writeText(state.bannerDetail || "").then(done, done); } catch (err) { done(); }
        return;
      }
      const x = e.target.closest(".popup-x");
      if (x) { removePopup(x.closest(".popup")); return; }
      const nav = e.target.closest("[data-view]");
      if (nav) { setView(nav.dataset.view); refreshKeyUi(); return; }
      if (e.target.closest("#banner-alt [data-retry]") && state.bannerWord) { show(state.bannerWord, { force: true }); return; }
      if (e.target.closest("[data-retry-details]") && state.word) {
        const w = state.word, p = w.provider || getProvider();
        if (!getKey(p)) { showNotice("Add an API key to load the meanings."); return; }
        state.abort = new AbortController();
        startDetails(w.word, p, w.model || getModel(p), state.token);
        return;
      }
      const alt = e.target.closest("#banner-alt [data-provider]");
      if (alt && state.bannerWord) { setProvider(alt.dataset.provider); refreshKeyUi(); show(state.bannerWord, { force: true }); return; }
      const suggestBtn = e.target.closest("#popups button[data-word]");
      if (suggestBtn) {
        if (suggestBtn.dataset.provider) { setProvider(suggestBtn.dataset.provider); refreshKeyUi(); }
        show(suggestBtn.dataset.word, { force: !!suggestBtn.dataset.force || !!suggestBtn.dataset.provider });
      }
    });
    $("#key-chip").addEventListener("click", () => setView("settings"));
    $("#banner-close").addEventListener("click", hideBanner);
    $("#ov-cancel").addEventListener("click", () => {
      if (state.abort) state.abort.abort();
      state.token++;
      hideOverlay();
      showNotice("Analysis cancelled.");
    });
    state.clsMode = ["freebound", "baseaffix", "derinf", "list"].includes(store.get(LS.cls)) ? store.get(LS.cls) : "freebound";
    $("#cls-mode").addEventListener("click", e => {
      const b = e.target.closest("[data-mode]");
      if (!b) return;
      state.clsMode = b.dataset.mode;
      store.set(LS.cls, state.clsMode);
      if (state.word) renderClassification(state.word);
      else $$("#cls-mode button").forEach(x => x.classList.toggle("active", x === b));
    });
    setTimeout(() => window.MorphDict.preloadWords(), 400);   // word list in the background (used by the tree rules)
    state.level = store.get(LS.level) === "adv" ? "adv" : "basic";
    $$("#level button").forEach(b => b.classList.toggle("active", b.dataset.level === state.level));
    const setLevel = lv => {
      state.level = lv;
      store.set(LS.level, lv);
      $$("#level button").forEach(x => { const on = x.dataset.level === lv; x.classList.toggle("active", on); x.setAttribute("aria-pressed", on); });
      if (state.word && state.view === "analyze") show(state.word.word, { silentHash: true });
    };
    state.setLevel = setLevel;
    $("#level").addEventListener("click", e => {
      const b = e.target.closest("[data-level]");
      if (b && b.dataset.level !== state.level) setLevel(b.dataset.level);
    });
    $$("#level button").forEach(x => x.setAttribute("aria-pressed", x.dataset.level === state.level));
    const help = $("#lv-help"), info = $("#lv-info");
    const toggleHelp = open => { help.hidden = !open; info.setAttribute("aria-expanded", open); };
    info.addEventListener("click", () => toggleHelp(help.hidden));
    $("#lv-hide").addEventListener("click", () => { toggleHelp(false); info.focus(); });

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
    state.aiCheck = store.get(LS.aicheck) !== "0";
    $("#ai-check-on").checked = state.aiCheck;
    $("#ai-check-on").addEventListener("change", e => {
      state.aiCheck = e.target.checked;
      store.set(LS.aicheck, state.aiCheck ? "1" : "0");
      if (!state.aiCheck) setCheckStatus("");
      else if (state.word && state.word.source !== "verified" && state.view === "analyze") show(state.word.word, { silentHash: true });
    });
    $("#ai-check").addEventListener("click", e => {
      if (!e.target.closest("[data-ai-revert]")) return;
      const w = state.word;
      if (!w || !w.original) return;
      const lv = w.level || state.level;
      const pref = keyPref(); pref[w.word + "@" + lv] = true; store.set(LS.keypref, JSON.stringify(pref));
      cacheDel(w.word, lv);
      const back = w.original;
      back.detailState = back.detailState === "ready" ? "ready" : (getKey(getProvider()) ? "loading" : "none");
      state.word = back; state.source = back.source || "lexicon";
      renderAll();
      setCheckStatus(`Showing the course key. <button type="button" data-ai-again>Ask the AI again</button>`, "ok");
      if (back.detailState === "loading") { state.abort = new AbortController(); startDetails(w.word, getProvider(), getModel(getProvider()), state.token); }
    });
    $("#ai-check").addEventListener("click", e => {
      if (!e.target.closest("[data-ai-skip]")) return;
      if (state.checkAbort) state.checkAbort.abort();
    });
    $("#ai-check").addEventListener("click", e => {
      if (!e.target.closest("[data-ai-again]")) return;
      const w = state.word; if (!w) return;
      const pref = keyPref(); delete pref[w.word + "@" + (w.level || state.level)]; store.set(LS.keypref, JSON.stringify(pref));
      show(w.word, { silentHash: true });
    });
    $("#lv-note").addEventListener("click", e => { const b = e.target.closest("[data-set-level]"); if (b) state.setLevel(b.dataset.setLevel); });
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
    settingsForm = mountKeyForm($("#settings-mount"), {});
    bannerForm = mountKeyForm($("#banner-form"), {
      onSaved: () => { const w = state.bannerWord; hideBanner(); if (w) show(w, { force: true }); }
    });
  }

  async function init() {
    bind();
    renderCheat(null);
    refreshKeyUi();
    const m = location.hash.match(/w=([^&]+)/);
    await show(m ? decodeURIComponent(m[1]) : "unhappiness", { silentHash: !m });
    // First visit: ask for a key right away, in the same page.
    if (!keyedProviders().length && $("#ai-banner").hidden) {
      showBanner({
        title: "Add an AI key to analyse any word",
        msg: `The ${Object.keys(DB).length} verified words and the dictionary already work. Pick a provider, paste your key and press Save & test.`
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
