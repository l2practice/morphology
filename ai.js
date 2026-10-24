/*
 * Morphology — AI client for several providers (Gemini, Grok, OpenAI, Claude, OpenRouter).
 * Runs in the student's browser with the student's own key; the key is sent only to the chosen provider. The answer is streamed, so finished
 * morphemes can be shown while the rest of the analysis is still arriving.
 */
(function () {
  const PROMPT_VERSION = 21;
  const MAX_ATTEMPTS = 2;   // 1 retry when the answer fails validation

  /**
   * kind: "gemini" | "openai" (OpenAI-compatible chat completions) | "anthropic".
   * Model lists are only suggestions: "Load my models" in Settings asks the provider which ids the key can use.
   */
  const PROVIDERS = {
    gemini: {
      name: "Gemini", full: "Google Gemini", kind: "gemini", keyUrl: "https://aistudio.google.com/apikey", keyHint: "AIza… or AQ.…",
      models: [
        { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash — fast" },
        { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite — fastest" },
        { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro — most careful" }
      ]
    },
    xai: {
      name: "Grok", full: "xAI Grok", kind: "openai", base: "https://api.x.ai/v1", keyUrl: "https://console.x.ai", keyHint: "xai-…",
      models: [
        { id: "grok-3-mini", label: "Grok 3 mini — fast" },
        { id: "grok-4", label: "Grok 4 — most careful" }
      ]
    },
    groq: {
      name: "Groq", full: "Groq (very fast)", kind: "openai", base: "https://api.groq.com/openai/v1", keyUrl: "https://console.groq.com/keys", keyHint: "gsk_…",
      models: [
        { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B — fast, accurate" },
        { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B — most careful" },
        { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B — fastest, less accurate" }
      ]
    },
    openai: {
      name: "OpenAI", full: "OpenAI", kind: "openai", base: "https://api.openai.com/v1", keyUrl: "https://platform.openai.com/api-keys", keyHint: "sk-…",
      models: [
        { id: "gpt-4o-mini", label: "GPT-4o mini — fast" },
        { id: "gpt-4.1-mini", label: "GPT-4.1 mini — balanced" },
        { id: "gpt-4.1", label: "GPT-4.1 — most careful" }
      ]
    },
    anthropic: {
      name: "Claude", full: "Anthropic Claude", kind: "anthropic", keyUrl: "https://console.anthropic.com/settings/keys", keyHint: "sk-ant-…",
      models: [
        { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 — fastest" },
        { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 — balanced" },
        { id: "claude-opus-5-5", label: "Claude Opus 5.5 — most careful" }
      ]
    },
    openrouter: {
      name: "OpenRouter", full: "OpenRouter (many models, one key)", kind: "openai", base: "https://openrouter.ai/api/v1", keyUrl: "https://openrouter.ai/keys", keyHint: "sk-or-…",
      models: [
        { id: "google/gemini-2.5-flash", label: "Google Gemini 2.5 Flash" },
        { id: "x-ai/grok-3-mini", label: "xAI Grok 3 mini" },
        { id: "openai/gpt-4o-mini", label: "OpenAI GPT-4o mini" },
        { id: "anthropic/claude-haiku-4.5", label: "Anthropic Claude Haiku" }
      ]
    }
  };

  // Two small requests instead of one long one: the cut first (seconds), the writing afterwards.
  // The worked examples deliberately avoid common test words, so the rules decide the analysis.
  const CUT_PROMPT = [
    "You are an expert English morphologist helping English-major students practise Immediate Constituent (IC) analysis.",
    "Segment the word you are given into morphemes and answer with a SHORT JSON that follows the schema: no meanings, no etymology. Work through the rules below.",
    "",
    "## 0. Default: ONE morpheme",
    "A word is ONE morpheme (one free root, tree \"0\") unless a living English affix can clearly be cut off. When in doubt, do NOT cut. Single-morpheme words include simple native words and loanwords borrowed whole from French or Latin: employ, deploy, enjoy, refer, carpet, hammer, wonder, corner, butter, number, village. Do not cut en- from enjoy, de- from deploy or re- from refer. Never split a word only because it looks like it has pieces, or because its Latin or French ancestor did.",
    "## 1. Segment: is each cut real in present-day English?",
    "Cut off a piece only if ALL three tests pass:",
    "  (a) the remaining base exists as a word, or as a recognisable BOUND root shared by a word family (vis- in vision, visual, visible);",
    "  (b) the piece adds its usual meaning or grammatical function;",
    "  (c) the whole word means roughly \"base + affix meaning\".",
    "Bound roots are real morphemes. When a clear suffix is attached to a recognisable bound Latinate root, CUT BOTH: visible = vis- (bound root) + -ible; credible = cred- + -ible; audible = aud- + -ible; credibly = [[cred- -ible] -ly] with surfaces cred | ib | ly. Never leave such a word as one root.",
    "Historical (etymological) structure is NOT enough: mention it in \"etym\", but do not cut it.",
    "NEVER invent morphemes and NEVER split a bare root: correct is ONE root (not cor + rect), color is ONE root.",
    "Pseudo-affix traps that must stay ONE free root: carpet (not car + pet), hammer (not ham + -er), wonder (not won + -der), corner, butter, number. The leftover piece must belong to a real family; car-, ham- do not.",
    "LIVING PREFIX + FREE WORD: cut re-, un-, in-/im-/il-/ir-, dis-, mis-, non-, pre-, over-, under-, out- when what remains is a free English word, even if the meaning has drifted: recover = re- + cover, rewrite = re- + write, remove = re- + move, irrecoverably = ir- | re- | cover | -able | -ly (five morphemes). This does NOT apply to loanwords with en-, em- or de- (enjoy, employ, deploy) or to pieces whose leftover is not a word (refer).",
    "Latinate PREFIX + BOUND ROOT (taught in class): re-ceive is cut as re- + -ceive, because re- is a living prefix and -ceive recurs in deceive, conceive, perceive. A bound root may change its spelling (allomorph): -ceive ~ cep- (reception, deception). Example: receptionists = re- | -ceive (surface cep) | -tion | -ist | -s, tree [N|receptionists [N|receptionist [N|reception [V|receive 0 1] 2] 3] 4].",
    "Lexicalised participial adjectives keep their base when the base is a living word: charming = charm + -ing, surprising = surprise + -ing. In these adjectives -ing / -ed are DERIVATIONAL (suffix-der), never inflectional.",
    "",
    "## 2. Spell out every morpheme",
    "- List morphemes left to right. \"form\" is the morpheme as it appears in English spelling today, with hyphen conventions: prefixes \"un-\", suffixes \"-ness\", bound roots \"-ceive\", free roots without hyphens. Use the base spelling only for regular spelling changes (happi → happy, stopp → stop).",
    "- Spell morphemes as they appear in English today; never use a Latin or Greek ancestor as a morpheme (keep ancestors in etym). Words BORROWED WHOLE from French or Latin whose beginning is not a living English prefix stay ONE free root: employ (Old French emploier) is ONE morpheme, so employment = employ + -ment, tree [N|employment 0 1]. The same applies to similar loanwords, for example ploy-type endings: do not invent em- + ploy or in- + plic-.",
    "- \"surface\" is exactly how the morpheme is spelled inside the word, without hyphens. Joining all surfaces in order MUST give the word with its hyphens removed.",
    "- Restore the base form after spelling changes, and add a \"restoration\" entry for each: consonant doubling (stopping: surface \"stopp\", form \"stop\"), silent e (hoping: surface \"hop\", form \"hope\"), y → i (ladies: surface \"ladi\", form \"lady\").",
    "- Internal change with no separate affix (mice, men, geese, sang, went): the root keeps its base form with the changed spelling as surface (form \"mouse\", surface \"mice\"), followed by a ZERO morpheme with surface \"\" whose form is the regular suffix it replaces: \"-s\" for a plural (mice = mouse + -s, variant \"-s (plural)\"), \"-ed\" for a past tense (sang = sing + -ed, variant \"-ed (v2)\"); type \"suffix\", cls \"suffix-inf\". Explain the vowel change in allomorphy and add a restoration entry (mice- → mouse). Tree for mice: [N|mice 0 1].",
    "- Hyphenated compounds (editor-in-chief): every word between hyphens is a free root; surfaces contain no hyphens.",
    "- allomorphOf: when a morpheme is a conditioned variant of another morpheme, name the basic form, otherwise \"\". The negative prefix in- has the assimilated allomorphs im- (before p, b, m), il- (before l) and ir- (before r): immature → \"im-\" with allomorphOf \"in-\", illegal → \"il-\" with allomorphOf \"in-\". Other examples: -ion vs -tion, a- vs an-.",
    "",
    "## 3. Classify",
    "- type: prefix | root | suffix. cls: prefix-der | prefix-inf | root-free | root-bound | suffix-der | suffix-inf.",
    "- English has no inflectional prefixes. In THIS course the inflectional suffixes are exactly: noun -s (plural), 's (possessive), s' (plural possessive); verb -s (3rd person), -ing, -ed (past), -en (past participle, e.g. eaten); adjective/adverb -er (comparative), -est (superlative) and adverbial -ly (quickly, decidedly, credibly), plus their zero/irregular allomorphs. Everything else is derivational. Nominal -ing (a misunderstanding) is derivational.",
    "- Derivational prefixes keep the word class (re-try, un-ethical, in-human, il-legal); derivational suffixes usually change it (-ness, -ion, -ive, -ible). Derivation creates a new word with a changed meaning; inflection only creates another form of the same word.",
    "- cat for roots: N, V, Adj, Adv or P. Use \"\" for affixes.",
    "- variant: some endings look the same but do different jobs. When a suffix is one of the labels below, set variant to EXACTLY that label, otherwise \"\". Use the dictionary part of speech to decide. INFLECTIONAL (suffix-inf): \"-ing (v)\" progressive verb form (He is meeting a client); \"-ed (v2)\" past tense or past participle (visited, was turned on); \"-ly (adv)\" (quickly); \"-er (comparative)\" (taller); \"-est (superlative)\" (tallest). DERIVATIONAL (suffix-der): \"-ing (N)\" noun (a meeting, a misunderstanding); \"-ing (adj)\" participial adjective (an interesting talk); \"-ed (adj)\" (interested); \"-ly (adj)\" (friendly, costly); \"-er (N)\" person or tool (driver, hunter); \"-er (onomatopoeia)\" verb of repeated sound or movement (chatter, flicker); \"-ist\" (typist, artist). cls must agree: the (v), (v2), (adv), (comparative) and (superlative) labels are suffix-inf, all the others suffix-der.",
    "- prefix senses: a prefix with two senses goes with different word classes, so label it. re- (again) goes with a VERB (re-activate, re-write): variant \"re- (again)\". re- (against, back) goes with a NOUN (re-action, re-actionary): variant \"re- (against)\". in- (not) goes with an ADJECTIVE (in-active, ir-refutable): variant \"in- (not)\". in- (into) goes with a verb or noun (in-sert): variant \"in- (into)\". un- (not) goes with an adjective, un- (reverse) with a verb (un-lock): variants \"un- (not)\" and \"un- (reverse)\". Other prefixes: variant \"\".",
    "",
    "## 4. The tree",
    "- tree is a bracket string that only gives your best reading; the program checks it and may rebuild it. Notation: [Cat|label left right] with exactly two parts per bracket; the parts are other brackets or morpheme NUMBERS (0-based, in the order of the morphemes list); a single morpheme is just 0. Example: unkindness (un-, kind, -ness) → [N|unkindness [Adj|unkind 0 1] 2]. Inflection is outermost; un-/in- attach to adjectives; a suffix that makes the adjective (-able, -ible) attaches before un-/in-.",
    "- pos is the part of speech of the whole word: noun, verb, adjective, adverb."
  ].join("\n");

  const DETAIL_PROMPT = [
    "You write short, student-friendly details about an English word that has ALREADY been cut into the morphemes listed in the user message. Answer with JSON that follows the schema. Never change the segmentation.",
    "- morphemes: one entry per listed morpheme, in the same order, with its meaning and etym.",
    "- Be BRIEF and student-friendly: process is a LABEL of at most 8 words (for example \"Derivation (prefix + suffix) + inflection\"), never an explanation; each meaning at most 12 words, each etym at most 10 words, allomorphy and derivInfl one or two short sentences, gloss at most 10 words.",
    "- restoration: surface ends with a hyphen; empty list if nothing changed.",
    "- family: the historical root, its short gloss, and 6 real related English words.",
    "- etymology (about the WHOLE word): summary is ONE sentence on where the word comes from (for example: comes from Latin through Old French and entered English in the 14th century); steps are 2 to 3 stages with a short label such as \"Latin origin\", \"Old French\" or \"Entry into English\" and a text of at most 20 words; meanings are 0 to 3 changes of meaning, each with a period (for example \"14th century\") and a text. Base it on the dictionary etymology when one is given. Only state dates and facts you are sure about; otherwise leave the period out of the text or use an empty list.",
    "- Read the dictionary etymology as evidence: \"X + -suffix\" (formed inside English) supports a cut; a plain history of borrowing or inheritance with no \"+\" (employ: from Old French emploier; enjoy, deploy, refer likewise) supports ONE root.",
    "- The user message may contain DICTIONARY CONTEXT (part of speech, definition, etymology of the word). Treat it as reliable, use it to decide the segmentation and to keep etym short, and do not contradict it.",
    "- If the user message says the word is NOT in the dictionary: when related dictionary words are listed, build the cut on them (the base must be one of those words or their stem); otherwise analyse it as a nonce word using productive rules."
  ].join("\n");


  const str = { type: "string" };
  const INSIGHTS = {
    type: "object", required: ["allomorphy", "restoration", "derivInfl"],
    properties: {
      allomorphy: str, derivInfl: str,
      restoration: { type: "array", items: { type: "object", required: ["surface", "base", "rule"], properties: { surface: str, base: str, rule: str } } }
    }
  };
  const FAMILY = { type: "object", required: ["root", "rootGloss", "words"], properties: { root: str, rootGloss: str, words: { type: "array", items: str } } };
  const ETYMOLOGY = {
    type: "object", required: ["summary", "steps", "meanings"],
    properties: {
      summary: str,
      steps: { type: "array", items: { type: "object", required: ["stage", "text"], properties: { stage: str, text: str } } },
      meanings: { type: "array", items: { type: "object", required: ["period", "text"], properties: { period: str, text: str } } }
    }
  };
  // Stage 1: only what is needed to draw the cut.
  const CUT_SCHEMA = {
    type: "object", required: ["morphemes", "tree", "pos"],
    properties: {
      morphemes: {
        type: "array",
        items: {
          type: "object", required: ["form", "surface", "type", "cls", "cat", "allomorphOf", "variant"],
          properties: {
            form: str, surface: str,
            type: { type: "string", enum: ["prefix", "root", "suffix"] },
            cls: { type: "string", enum: ["prefix-der", "prefix-inf", "root-free", "root-bound", "suffix-der", "suffix-inf"] },
            cat: str, allomorphOf: str, variant: str
          }
        }
      },
      tree: str, pos: str
    }
  };
  // Stage 2: the writing that can arrive later.
  const DETAIL_SCHEMA = {
    type: "object", required: ["morphemes", "insights", "family", "etymology", "gloss"],
    properties: {
      morphemes: { type: "array", items: { type: "object", required: ["meaning", "etym"], properties: { meaning: str, etym: str } } },
      insights: INSIGHTS, family: FAMILY, etymology: ETYMOLOGY, gloss: str
    }
  };

  /** Gemini wants an explicit property order, otherwise it may emit keys alphabetically. */
  function withOrdering(node) {
    if (Array.isArray(node)) return node.map(withOrdering);
    if (!node || typeof node !== "object") return node;
    const out = {};
    for (const k of Object.keys(node)) out[k] = withOrdering(node[k]);
    if (out.properties) out.propertyOrdering = Object.keys(out.properties);
    return out;
  }

  // ---------------------------------------------------------------- validation

  const plain = s => String(s || "").toLowerCase().replace(/-/g, "");

  // Affixes students meet in class. An affix outside these lists is suspicious: the word may be one root.
  const PREFIXES = new Set("an anti auto be bi by co com con contra counter de dis en ex extra fore hyper hypo il im in inter intra ir mal micro mid mis mono multi non out over para poly post pre pro pseudo re semi sub super trans tri un under uni up with".split(" "));
  const SUFFIXES = new Set(("s es 's s' ed en ing er est ly ness ment tion sion ation ition ion ity ty ive ative itive ous ious eous al ial ful less able ible ist ism ize ise ify fy ish y hood ship dom ward wise ant ent ance ence ancy ency ary ory ic ical ure age ee eer ette let ling ster some like th ery ry or ess ial ual").split(" "));
  const SOFT = "SOFT: ";

  /**
   * Parse "[Cat|label left right]" into { cat, label, kids } / { leaf: n }.
   * Returns { tree } or { error }.
   */
  function parseTree(src) {
    const text = String(src || "").trim();
    let i = 0;
    const ws = () => { while (i < text.length && /\s/.test(text[i])) i++; };
    function node() {
      ws();
      if (text[i] === "[") {
        i++;
        const m = /^[^\s\[\]]+/.exec(text.slice(i));
        if (!m) throw new Error("a bracket must start with its category, e.g. [N|word …]");
        i += m[0].length;
        const [cat, ...rest] = m[0].split("|");
        const kids = [];
        for (;;) {
          ws();
          if (i >= text.length) throw new Error("a bracket is not closed");
          if (text[i] === "]") { i++; break; }
          kids.push(node());
        }
        return { cat, label: rest.join("|"), kids };
      }
      const d = /^\d+/.exec(text.slice(i));
      if (!d) throw new Error(`unexpected "${text.slice(i, i + 8)}"`);
      i += d[0].length;
      return { leaf: Number(d[0]) };
    }
    try {
      const tree = node();
      ws();
      if (i < text.length) throw new Error("extra text after the tree");
      return { tree };
    } catch (e) { return { error: e.message }; }
  }

  function validate(ai, word) {
    const problems = [];
    const ms = ai.morphemes || [];
    if (!ms.length) return ["The morpheme list is empty."];

    const joined = ms.map(m => m.surface).join("").toLowerCase();
    if (joined !== plain(word)) {
      problems.push(`Joining the surfaces gives "${joined}" but the word without hyphens is "${plain(word)}".`);
    }
    ms.forEach((m, i) => {
      if (m.cls.split("-")[0] !== m.type) problems.push(`Morpheme ${i} has type ${m.type} but cls ${m.cls}.`);
      if (m.cls === "prefix-inf") problems.push(`English has no inflectional prefixes (morpheme ${i}).`);
      if (m.surface === "" && m.cls !== "suffix-inf") problems.push(`Only an inflectional zero morpheme may have an empty surface (morpheme ${i}).`);
    });
    if (!ms.some(m => m.type === "root")) problems.push("There is no root.");
    ms.forEach((m, i) => {
      if (m.type === "root" || !m.surface) return;
      const f = plain(m.form), sf = String(m.surface).toLowerCase();
      let common = 0;
      while (common < f.length && common < sf.length && f[common] === sf[common]) common++;
      if (f !== sf && !m.allomorphOf && common < Math.min(2, f.length, sf.length)) {
        problems.push(`Morpheme ${i}: the affix "${m.form}" is spelled "${m.surface}" in the word. Give the form that appears in the spelling (im- for immature, not in-) and set allomorphOf when it is a variant of another affix; keep Latin ancestors in etym.`);
      }
    });
    ms.forEach((m, i) => {
      if (m.type === "root" || !m.form || /^\{/.test(m.form)) return;
      const f = plain(m.form);
      const known = m.type === "prefix" ? PREFIXES.has(f) : SUFFIXES.has(f);
      if (!known) problems.push(`${SOFT}"${m.form}" is not a common English ${m.type}. If the word was borrowed whole (like employ) keep it as ONE root with tree "0"; cut it only if "${m.form}" is a living affix.`);
    });
    ms.forEach((m, i) => {
      const v = m.variant || "";
      if (!v) return;
      if (/\((v|v2|adv|comparative|superlative)\)$/.test(v) && m.cls !== "suffix-inf") problems.push(`Morpheme ${i} is labelled ${v}, which is inflectional, but its cls is ${m.cls}.`);
      if ((/\((N|adj|onomatopoeia)\)$/.test(v) || v === "-ist") && m.cls !== "suffix-der") problems.push(`Morpheme ${i} is labelled ${v}, which is derivational, but its cls is ${m.cls}.`);
    });

    return problems;
  }

  /** AI hint (bracket string) → {children}/{m} tree, or null when it is not a usable binary tree. */
  function hintNode(ai, n) {
    const parsed = parseTree(ai.tree);
    if (parsed.error) return null;
    const leaves = [];
    let ok = true;
    const conv = t => {
      if (t.leaf !== undefined) { leaves.push(t.leaf); return { m: t.leaf }; }
      if (t.kids.length !== 2) { ok = false; return { m: 0 }; }
      return { cat: t.cat, label: t.label, children: t.kids.map(conv) };
    };
    const node = conv(parsed.tree);
    return ok && leaves.join(",") === Array.from({ length: n }, (x, i) => i).join(",") ? node : null;
  }

  /** Dictionary-style spelling of two joined pieces (dispense + able → dispensable, happy + ness → happiness). */
  function joinForms(a, b) {
    if (/e$/.test(a) && /^[aeiouy]/.test(b)) return a.slice(0, -1) + b;
    if (/[^aeiou]y$/.test(a) && /^[^i]/.test(b) && !/^[aeiou]/.test(b)) return a.slice(0, -1) + "i" + b;
    return a + b;
  }

  /** Stage-1 answer → the object the page renders. The tree is chosen by the morphotactics rules; the AI tree breaks ties. */
  function toAppFormat(ai, word, model) {
    const ms = ai.morphemes.map(m => ({ ...m, variant: m.variant || "", meaning: m.meaning || "", etym: m.etym || "" }));
    // Affixes the course teaches come with a ready-made meaning that the AI text does not replace.
    ms.forEach(m => { if (!m.meaning && window.MorphGloss) { const g = window.MorphGloss.meaning(m); if (g) { m.meaning = g; m.fixedMeaning = true; } } else if (m.meaning) m.fixedMeaning = true; });
    const hint = hintNode(ai, ms.length);
    const spell = n => {
      if (n.m !== undefined) return plain(ms[n.m].form);
      const [l, r] = n.children;
      // A prefix is simply written in front (re + act = react); the spelling changes only apply between base and suffix.
      return l.m !== undefined && ms[l.m].type === "prefix" ? spell(l) + spell(r) : joinForms(spell(l), spell(r));
    };
    const planned = window.MorphTactics.plan(ms, hint, { spell, exists: w => (window.MorphDict && window.MorphDict.hasWordSync ? window.MorphDict.hasWordSync(w) : null) });
    const rawTree = planned ? planned.node : { m: 0 };
    // Take a label from the AI tree when it has the same shape, otherwise spell the pieces.
    const sameShape = hint && window.MorphTactics.signature(hint) === window.MorphTactics.signature(rawTree);
    const label = (n, h) => (sameShape && h && h.label && /^[a-zA-Z'-]{2,}$/.test(h.label)) ? h.label.toLowerCase() : spell(n);
    const make = (n, h, top) => {
      if (n.m !== undefined) return top ? { label: word, cat: ms[n.m].cat, m: n.m } : { m: n.m };
      return {
        label: top ? word : label(n, h), cat: n.cat || (h && h.cat) || "",
        children: n.children.map((c, i) => make(c, h && h.children && h.children[i], false))
      };
    };
    return {
      word, pos: ai.pos || "", ipa: "", gloss: "", process: "",
      morphemes: ms, tree: make(rawTree, sameShape ? hint : null, true),
      insights: { allomorphy: "", restoration: [], derivInfl: "" },
      family: { root: "", rootGloss: "", words: [] }, etymology: null,
      detailState: "loading", treeMethod: planned ? planned.method : "none", ambiguous: !!(planned && planned.ambiguous),
      source: "ai", model, promptVersion: PROMPT_VERSION
    };
  }

  // ---------------------------------------------------------------- streaming

  /** Completed objects of the "morphemes" array in a half-received JSON text. */
  function partialMorphemes(text) {
    const start = text.indexOf('"morphemes"');
    if (start < 0) return [];
    let i = text.indexOf("[", start);
    if (i < 0) return [];
    const out = [];
    let depth = 0, inStr = false, esc = false, objStart = -1;
    for (i += 1; i < text.length; i++) {
      const c = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === "{") { if (depth++ === 0) objStart = i; }
      else if (c === "}") {
        if (--depth === 0) {
          try { out.push(JSON.parse(text.slice(objStart, i + 1))); } catch (e) { /* wait for more text */ }
        }
      } else if (c === "]" && depth === 0) break;
    }
    return out;
  }

  class ApiError extends Error {
    constructor(message, status) { super(message); this.status = status; }
  }

  async function readError(res, provider) {
    const P = PROVIDERS[provider].name;
    let msg = "", reason = "";
    try {
      const j = await res.json();
      const e = j.error || j;
      msg = (typeof e === "string" ? e : e.message) || "";
      reason = (e.details || []).map(d => d.reason || "").join(" ");
    } catch (e) { /* not JSON */ }
    if (res.status === 401 || /API_KEY_INVALID|API key not valid|invalid x-api-key|Incorrect API key/i.test(reason + msg)) return new ApiError(`Your ${P} API key was rejected. Check it in Settings.`, 401);
    if (res.status === 403) return new ApiError(`This ${P} key is not allowed to use that model (or ${P} is not available in your region).`, 403);
    if (res.status === 404) return new ApiError(`The selected ${P} model is not available for your key.`, 404);
    if (res.status === 402 || /credit|billing|balance|quota/i.test(msg) && res.status !== 429) return new ApiError(`Your ${P} account has no credit or quota left.`, res.status);
    if (res.status === 413 || /too large|tokens per minute|\bTPM\b/i.test(msg)) return new ApiError(`${P} says this request is above the free limit of the model (tokens per minute). Wait a minute, pick another model, or switch provider.`, 413);
    if (res.status === 429) return new ApiError(`${P} rate limit or quota reached. Wait a moment, or switch provider in Settings.`, 429);
    if (res.status >= 500) return new ApiError(`${P} is busy right now. Try again, or switch provider in Settings.`, res.status);
    return new ApiError(msg ? `${P} error: ${msg}` : `${P} error ${res.status}`, res.status);
  }

  async function http(provider, url, init, signal) {
    let res;
    try {
      res = await fetch(url, { ...init, signal });
    } catch (e) {
      if (e.name === "AbortError") throw e;
      throw new ApiError(`Could not reach ${PROVIDERS[provider].name}. Check your connection; if it is fine, this provider may block direct browser calls — try Gemini or OpenRouter.`, 0);
    }
    if (!res.ok) {
      const raw = await res.clone().text().catch(() => "");
      const e = await readError(res, provider);
      e.provider = provider; e.raw = raw.slice(0, 600);
      throw e;
    }
    return res;
  }

  /** Read a server-sent-event body; onData gets each parsed `data:` JSON object. */
  async function readSse(res, onData) {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let cut;
      while ((cut = buf.indexOf("\n\n")) >= 0) {
        const evt = buf.slice(0, cut);
        buf = buf.slice(cut + 2);
        const line = evt.split("\n").find(l => l.startsWith("data:"));
        if (!line) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        let msg;
        try { msg = JSON.parse(raw); } catch (e) { continue; }
        onData(msg);
      }
    }
  }

  const jsonInstruction = (text, schema) => text + "\n\nAnswer with ONE JSON object only (no markdown, no commentary) that follows this JSON schema:\n" + JSON.stringify(schema);

  /** Short thinking budget keeps Gemini fast; Pro cannot switch thinking off, unknown models get the default. */
  function thinking(model) {
    if (/2\.5-flash-lite/.test(model)) return { thinkingConfig: { thinkingBudget: 0 } };
    if (/2\.5-flash/.test(model)) return { thinkingConfig: { thinkingBudget: 256 } };
    if (/gemini-3/.test(model)) return { thinkingConfig: { thinkingLevel: "low" } };
    return {};
  }

  // ---- one streamed call per provider kind; each resolves with the full answer text ----

  async function streamGemini({ apiKey, model, userText, onText, signal, system, schema }) {
    const base = { maxOutputTokens: 8192, temperature: 0.2 };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
    const call = body => http("gemini", url, {
      method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify(body)
    }, signal);
    const think = thinking(model);
    const body = (withThinking, withSchema) => ({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: withSchema ? userText : jsonInstruction(userText, schema) }] }],
      generationConfig: {
        ...base, ...(withThinking ? think : {}), responseMimeType: "application/json",
        ...(withSchema ? { responseSchema: withOrdering(schema) } : {})
      }
    });
    // A model that rejects the thinking setting or the schema answers 400: drop one, then the other.
    const tries = [];
    if (Object.keys(think).length) tries.push([true, true]);
    tries.push([false, true], [false, false]);
    let res, lastErr;
    for (const [t, sch] of tries) {
      try { res = await call(body(t, sch)); break; }
      catch (e) { if (!(e instanceof ApiError) || e.status !== 400) throw e; lastErr = e; }
    }
    if (!res) throw lastErr;
    let text = "", finish = "", blocked = "";
    await readSse(res, msg => {
      if (msg.error) throw new ApiError(msg.error.message || "Gemini stopped unexpectedly.", 0);
      if (msg.promptFeedback && msg.promptFeedback.blockReason) blocked = msg.promptFeedback.blockReason;
      const cand = msg.candidates && msg.candidates[0];
      if (!cand) return;
      const piece = ((cand.content && cand.content.parts) || []).filter(p => !p.thought && typeof p.text === "string").map(p => p.text).join("");
      if (piece) { text += piece; onText && onText(text); }
      if (cand.finishReason) finish = cand.finishReason;
    });
    if (blocked || finish === "SAFETY" || finish === "PROHIBITED_CONTENT") throw new ApiError("Gemini declined to analyse this word.", 0);
    if (finish === "MAX_TOKENS") throw new ApiError("The answer was cut off. Please try again.", 0);
    return text;
  }

  async function streamOpenAI({ provider, apiKey, model, userText, onText, signal, system, schema }) {
    const cfg = PROVIDERS[provider];
    const url = cfg.base + "/chat/completions";
    const call = body => http(provider, url, {
      method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + apiKey }, body: JSON.stringify(body)
    }, signal);
    const base = {
      model, stream: true,
      messages: [{ role: "system", content: system }, { role: "user", content: jsonInstruction(userText, schema) }]
    };
    // JSON mode can fail ("Failed to generate JSON") or be unsupported (400): then rely on the instruction alone.
    const jsonModeFailed = e => e instanceof ApiError && (e.status === 400 || /failed to generate json|failed_generation|json_validate_failed/i.test(e.message + " " + (e.raw || "")));

    async function run(jsonMode) {
      const res = await call(jsonMode ? { ...base, response_format: { type: "json_object" } } : base);
      let text = "", finish = "";
      await readSse(res, msg => {
        if (msg.error) throw new ApiError(msg.error.message || cfg.name + " stopped unexpectedly.", 0);
        const ch = msg.choices && msg.choices[0];
        if (!ch) return;
        const piece = ch.delta && ch.delta.content;
        if (piece) { text += piece; onText && onText(text); }
        if (ch.finish_reason) finish = ch.finish_reason;
      });
      if (finish === "length") throw new ApiError("The answer was cut off. Please try again.", 0);
      if (finish === "content_filter") throw new ApiError(cfg.name + " declined to analyse this word.", 0);
      return text;
    }
    try { return await run(true); }
    catch (e) { if (!jsonModeFailed(e)) throw e; return await run(false); }
  }

  async function streamAnthropic({ apiKey, model, userText, onText, signal, system, schema }) {
    const res = await http("anthropic", "https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model, max_tokens: 4096, stream: true,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: jsonInstruction(userText, schema) }]
      })
    }, signal);
    let text = "", stop = "";
    await readSse(res, msg => {
      if (msg.type === "content_block_delta" && msg.delta && msg.delta.type === "text_delta") { text += msg.delta.text; onText && onText(text); }
      else if (msg.type === "message_delta" && msg.delta && msg.delta.stop_reason) stop = msg.delta.stop_reason;
      else if (msg.type === "error") throw new ApiError((msg.error && msg.error.message) || "Claude stopped unexpectedly.", 0);
    });
    if (stop === "refusal") throw new ApiError("Claude declined to analyse this word.", 0);
    if (stop === "max_tokens") throw new ApiError("The answer was cut off. Please try again.", 0);
    return text;
  }

  /** One request with a time limit; a slow model counts as "did not answer" so the caller can move on. */
  async function stream(opts) {
    const cfg = PROVIDERS[opts.provider];
    const kind = cfg.kind;
    const limit = opts.timeoutMs || 35000;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), limit);
    const relay = () => ctl.abort();
    if (opts.signal) { if (opts.signal.aborted) ctl.abort(); else opts.signal.addEventListener("abort", relay); }
    try {
      const run = { ...opts, signal: ctl.signal };
      const text = await (kind === "gemini" ? streamGemini(run) : kind === "anthropic" ? streamAnthropic(run) : streamOpenAI(run));
      const s = text.indexOf("{"), e = text.lastIndexOf("}");
      try { return JSON.parse(text.slice(s, e + 1)); }
      catch (err) { throw new ApiError(cfg.name + "'s answer could not be read. Please try again.", 0); }
    } catch (err) {
      if (err && err.name === "AbortError" && !(opts.signal && opts.signal.aborted)) {
        throw new ApiError(`${cfg.name} did not answer within ${Math.round(limit / 1000)} seconds.`, 408);
      }
      throw err;
    } finally {
      clearTimeout(timer);
      if (opts.signal) opts.signal.removeEventListener("abort", relay);
    }
  }

  /** Lines about dictionary words related to an unknown word (see MorphDict.neighbours). */
  /** Verified words cut with the same pattern (same prefix at the start / same suffix at the end), best first. */
  function analogues(word) {
    const db = window.IC_DB || {};
    const hits = [];
    for (const [w, e] of Object.entries(db)) {
      if (w === word || !e.morphemes) continue;
      let score = 0;
      e.morphemes.forEach((m, i) => {
        const sf = m.surface || "";
        if (m.type === "prefix" && i === 0 && sf && word.startsWith(sf)) score += 2;
        if (m.type === "suffix" && i === e.morphemes.length - 1 && sf && word.endsWith(sf)) score += 2;
        else if (m.type === "suffix" && sf.length > 2 && word.endsWith(sf)) score += 1;
      });
      if (score) hits.push([score, e.morphemes.length, w, e.morphemes.map(m => m.form).join(" + ")]);
    }
    return hits.sort((a, b) => b[0] - a[0] || b[1] - a[1]).slice(0, 3).map(h => `${h[2]} = ${h[3]}`);
  }

  function neighbourLines(nb, word) {
    const out = [];
    const an = word ? analogues(word) : [];
    if (an.length) out.push("- Words with a similar build, already cut correctly: " + an.join("; ") + ". Follow the same pattern (same affix forms, same cut order).");
    if (!nb || (!nb.bases.length && !nb.family.length)) return out;
    if (nb.bases.length) out.push("- It looks built from words that ARE in the dictionary: " + nb.bases.map(b => `${b.word} (${b.how})`).join(", ") + ".");
    if (nb.family.length) out.push("- Dictionary words with the same stem: " + nb.family.join(", ") + ".");
    out.push("- Cut it the same way these related words are cut, and use the real base word as the root.");
    return out;
  }

  const ADV_LINE = "LEVEL: ADVANCED. Also cut recognised Latin/Greek bound roots and affixes that recur in a family of words (science = sci- + -ence; conceive = con- + -ceive; biology = bio- + -logy), and keep the same piece cut the same way. Put the source meaning of a bound root in its meaning.";
  function contextText(word, ctx, nb, level) {
    const lv = level === "adv" ? [ADV_LINE] : [];
    if (!ctx) return [`Word to analyse: "${word}"`, ...lv, "DICTIONARY CONTEXT: this word is NOT in the dictionary.", ...neighbourLines(nb, word)].join("\n");
    const lines = [`Word to analyse: "${word}"`, ...lv, "DICTIONARY CONTEXT:"];
    if (ctx.lemma && ctx.lemma !== word) lines.push(`- "${word}" is an inflected form of "${ctx.lemma}"${ctx.tags ? ` (${ctx.tags})` : ""}: analyse it as the root of "${ctx.lemma}" plus its inflection.`);
    if (ctx.pos) lines.push(`- part of speech: ${ctx.pos}`);
    if (ctx.gloss) lines.push(`- definition: ${ctx.gloss}`);
    if (ctx.etymology) lines.push(`- etymology: ${ctx.etymology}`);
    return lines.join("\n");
  }

  /**
   * @param opts.word, opts.provider, opts.apiKey, opts.model, opts.context (dictionary summary or null)
   * @param opts.onMorphemes(list)  called whenever more morphemes have arrived
   * @param opts.onAttempt(n)       called when a retry starts
   */
  async function analyze(opts) {
    try { return await analyzeOnce(opts); }
    catch (e) { if (e && typeof e === "object") { e.provider = e.provider || opts.provider; e.model = opts.model; } throw e; }
  }

  async function analyzeOnce(opts) {
    const { word, provider, apiKey, model, context, signal } = opts;
    let problems = [];
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let userText = contextText(word, context, opts.neighbours, opts.level);
      if (problems.length) {
        userText += "\n\nA previous analysis of this word was rejected by the validator for these reasons:\n- " +
          problems.join("\n- ") + "\nFollow the decision procedure carefully and fix every point.";
        opts.onAttempt && opts.onAttempt(attempt);
      }
      let shown = 0;
      const ai = await stream({
        provider, apiKey, model, userText, signal, system: CUT_PROMPT, schema: CUT_SCHEMA, timeoutMs: opts.timeoutMs || 30000,
        onText: text => {
          if (!opts.onMorphemes) return;
          const ms = partialMorphemes(text);
          if (ms.length !== shown) { shown = ms.length; opts.onMorphemes(ms); }
        }
      });
      problems = validate(ai, word);
      const hard = problems.filter(p => !p.startsWith(SOFT));
      const soft = problems.filter(p => p.startsWith(SOFT));
      // Hard problems always retry; a soft doubt is raised once and then shown to the student as a warning.
      if (!hard.length && (!soft.length || attempt === MAX_ATTEMPTS)) {
        const data = toAppFormat(ai, word, model);
        data.provider = provider;
        data.attempts = attempt;
        if (soft.length) data.warnings = soft.map(p => p.slice(SOFT.length));
        return data;
      }
    }
    const fail = new ApiError("The AI gave an inconsistent analysis for this word, even after a retry. Press Analyze again, or pick a stronger model in Settings. (" + problems[0] + ")", 0);
    fail.raw = problems.join("\n");
    throw fail;
  }

  /**
   * Stage 2: meanings, etymology, word family and explanations for a word that is already cut.
   * @param opts.morphemes  the stage-1 morphemes
   * @returns { morphemes: [{meaning, etym}], insights, family, etymology, gloss }
   */
  async function enrich(opts) {
    const { word, provider, apiKey, model, morphemes, context, signal } = opts;
    const list = morphemes.map((m, i) => `${i}. ${m.form} (${m.type}${m.cls ? ", " + m.cls : ""}${m.variant ? ", " + m.variant : ""})`).join("\n");
    const userText = contextText(word, context, opts.neighbours, opts.level).replace("Word to analyse:", "Word:") + `\nMorphemes, in order:\n${list}`;
    const ai = await stream({ provider, apiKey, model, userText, signal, system: DETAIL_PROMPT, schema: DETAIL_SCHEMA, timeoutMs: opts.timeoutMs || 60000 });
    const arr = Array.isArray(ai.morphemes) ? ai.morphemes : [];
    return {
      morphemes: morphemes.map((m, i) => ({ meaning: (arr[i] && arr[i].meaning) || "", etym: (arr[i] && arr[i].etym) || "" })),
      insights: { allomorphy: "", restoration: [], derivInfl: "", ...(ai.insights || {}) },
      family: { root: "", rootGloss: "", words: [], ...(ai.family || {}) },
      etymology: ai.etymology || null,
      gloss: ai.gloss || ""
    };
  }

  /** Model ids this key can actually use (used by "Load my models" and the automatic 404 recovery). */
  async function listModels(provider, apiKey) {
    const cfg = PROVIDERS[provider];
    if (cfg.kind === "gemini") {
      const res = await http(provider, "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": apiKey } });
      const j = await res.json();
      return (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map(m => ({ id: String(m.name).replace(/^models\//, ""), label: m.displayName || String(m.name).replace(/^models\//, "") }));
    }
    if (cfg.kind === "anthropic") {
      const res = await http(provider, "https://api.anthropic.com/v1/models?limit=100", {
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }
      });
      return ((await res.json()).data || []).map(m => ({ id: m.id, label: m.display_name || m.id }));
    }
    const res = await http(provider, cfg.base + "/models", { headers: { authorization: "Bearer " + apiKey } });
    return ((await res.json()).data || []).map(m => ({ id: m.id, label: m.name || m.id }));
  }

  /** Best general-purpose, fast model from a Gemini model list (newest "flash", not lite/preview/audio/image). */
  function pickGeminiModel(list) {
    const bad = /lite|preview|exp|tts|image|live|audio|thinking|embedding|robotics|computer|vision/i;
    const flash = list.map(m => m.id).filter(id => /^gemini-[\d.]+-flash$/.test(id));
    flash.sort((a, b) => parseFloat(b.split("-")[1]) - parseFloat(a.split("-")[1]));
    if (flash.length) return flash[0];
    const any = list.map(m => m.id).filter(id => /^gemini-/.test(id) && /flash/.test(id) && !bad.test(id));
    return any[0] || (list[0] && list[0].id) || "";
  }

  async function testKey(provider, apiKey, model) {
    const cfg = PROVIDERS[provider];
    if (cfg.kind === "gemini") {
      const res = await http(provider, `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Reply with: OK" }] }], generationConfig: { maxOutputTokens: 64, ...thinking(model) } })
      });
      await res.json();
    } else if (cfg.kind === "anthropic") {
      const res = await http(provider, "https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: "user", content: "Reply with: OK" }] })
      });
      await res.json();
    } else {
      const res = await http(provider, cfg.base + "/chat/completions", {
        method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + apiKey },
        body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply with: OK" }] })
      });
      await res.json();
    }
    return true;
  }

  window.MorphAI = { SOFT, analyze, enrich, testKey, listModels, pickGeminiModel, validate, parseTree, toAppFormat, partialMorphemes, PROVIDERS, PROMPT_VERSION, ApiError };
})();
