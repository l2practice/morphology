/*
 * Morphology — AI client for several providers (Gemini, Grok, OpenAI, Claude, OpenRouter).
 * Runs in the student's browser with the student's own key; the key is sent only to the chosen provider. The answer is streamed, so finished
 * morphemes can be shown while the rest of the analysis is still arriving.
 */
(function () {
  const PROMPT_VERSION = 10;
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
        { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B — fastest" },
        { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B — most careful" }
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

  // The worked examples deliberately avoid common test words, so the rules
  // (not memorised answers) decide the analysis.
  const SYSTEM_PROMPT = [
    "You are an expert English morphologist helping English-major students practise Immediate Constituent (IC) analysis.",
    "Analyse the word you are given and answer with JSON that follows the schema. Work through the decision procedure below before you answer.",
    "",
    "## 1. Segment: is each cut real in present-day English?",
    "Cut off a piece only if ALL three tests pass:",
    "  (a) the remaining base exists as a word, or as a recognisable BOUND root shared by a word family (vis- in vision, visual, visible);",
    "  (b) the piece adds its usual meaning or grammatical function;",
    "  (c) the whole word means roughly \"base + affix meaning\".",
    "Bound roots are real morphemes. When a clear suffix is attached to a recognisable bound Latinate root, CUT BOTH: visible = vis- (bound root) + -ible; credible = cred- + -ible; audible = aud- + -ible; credibly = [[cred- -ible] -ly] with surfaces cred | ib | ly. Never leave such a word as one root.",
    "Historical (etymological) structure is NOT enough: mention it in \"etym\", but do not cut it.",
    "NEVER invent morphemes and NEVER split a bare root: correct is ONE root (not cor + rect), color is ONE root.",
    "Pseudo-affix traps that must stay ONE free root: carpet (not car + pet), hammer (not ham + -er), regard (not re- + gard), report (not re- + port), wonder (not won + -der). A word only ends in -er/-ing or starts with re-/in-/un- by accident unless the tests pass.",
    "Lexicalised participial adjectives keep their base when the base is a living word: charming = charm + -ing, surprising = surprise + -ing. In these adjectives -ing / -ed are DERIVATIONAL (suffix-der), never inflectional.",
    "",
    "## 2. Spell out every morpheme",
    "- List morphemes left to right. \"form\" is the dictionary (base) form with hyphen conventions: prefixes \"un-\", suffixes \"-ness\", roots without hyphens.",
    "- \"surface\" is exactly how the morpheme is spelled inside the word, without hyphens. Joining all surfaces in order MUST give the word with its hyphens removed.",
    "- Restore the base form after spelling changes, and add a \"restoration\" entry for each: consonant doubling (stopping: surface \"stopp\", form \"stop\"), silent e (hoping: surface \"hop\", form \"hope\"), y → i (ladies: surface \"ladi\", form \"lady\").",
    "- Internal change with no separate affix (mice, men, sang): the root keeps its base form with the changed spelling as surface (form \"mouse\", surface \"mice\"), followed by a ZERO morpheme with surface \"\" and form \"{PLURAL}\" or \"{PAST}\", type \"suffix\", cls \"suffix-inf\". Explain the vowel mutation in allomorphy and add a restoration entry (mice- → mouse).",
    "- Hyphenated compounds (editor-in-chief): every word between hyphens is a free root; surfaces contain no hyphens.",
    "- allomorphOf: when a morpheme is a conditioned variant of another morpheme, name the basic form, otherwise \"\". The negative prefix in- has the assimilated allomorphs im- (before p, b, m), il- (before l) and ir- (before r): immature → \"im-\" with allomorphOf \"in-\", illegal → \"il-\" with allomorphOf \"in-\". Other examples: -ion vs -tion, a- vs an-.",
    "",
    "## 3. Classify",
    "- type: prefix | root | suffix. cls: prefix-der | prefix-inf | root-free | root-bound | suffix-der | suffix-inf.",
    "- English has no inflectional prefixes. In THIS course the inflectional suffixes are exactly: noun -s (plural), 's (possessive), s' (plural possessive); verb -s (3rd person), -ing, -ed (past), -en (past participle, e.g. eaten); adjective/adverb -er (comparative), -est (superlative) and adverbial -ly (quickly, decidedly, credibly), plus their zero/irregular allomorphs. Everything else is derivational. Nominal -ing (a misunderstanding) is derivational.",
    "- Derivational prefixes keep the word class (re-try, un-ethical, in-human, il-legal); derivational suffixes usually change it (-ness, -ion, -ive, -ible). Derivation creates a new word with a changed meaning; inflection only creates another form of the same word.",
    "- cat for roots: N, V, Adj, Adv or P. Use \"\" for affixes.",
    "- variant: some endings look the same but do different jobs. When a suffix is one of the labels below, set variant to EXACTLY that label, otherwise \"\". Use the dictionary part of speech to decide. INFLECTIONAL (suffix-inf): \"-ing (v)\" progressive verb form (He is meeting a client); \"-ed (v2)\" past tense or past participle (visited, was turned on); \"-ly (adv)\" (quickly); \"-er (comparative)\" (taller); \"-est (superlative)\" (tallest). DERIVATIONAL (suffix-der): \"-ing (N)\" noun (a meeting, a misunderstanding); \"-ing (adj)\" participial adjective (an interesting talk); \"-ed (adj)\" (interested); \"-ly (adj)\" (friendly, costly); \"-er (N)\" person or tool (driver, hunter); \"-er (onomatopoeia)\" verb of repeated sound or movement (chatter, flicker); \"-ist\" (typist, artist). cls must agree: the (v), (v2), (adv), (comparative) and (superlative) labels are suffix-inf, all the others suffix-der.",
    "",
    "## 4. Describe the binary IC tree with the \"tree\" bracket string",
    "- Notation: every cut is [Cat|label left right]. Cat is the word class of the whole constituent (N, V, Adj, Adv or P); label is the spelled word that constituent forms, in normal dictionary spelling (unhappy, not unhappi); left and right are each either another bracket or a morpheme NUMBER (0-based, in the order of the \"morphemes\" list).",
    "- Every bracket has EXACTLY TWO parts (never one, never three). The numbers must appear left to right as 0, 1, 2 … each exactly once. A word with a single morpheme is just the number 0.",
    "- Examples: unkindness (un-, kind, -ness) → [N|unkindness [Adj|unkind 0 1] 2]; hopelessness (hope, -less, -ness) → [N|hopelessness [Adj|hopeless 0 1] 2]; bookshelves (book, shelf, -es) → [N|bookshelves [N|bookshelf 0 1] 2]; unwashed (un-, wash, -ed) → [Adj|unwashed 0 [Adj|washed 1 2]]; carpet → 0.",
    "- A prefix is the LEFT part of its cut, a suffix is the RIGHT part.",
    "- Decide the order of attachment by asking which affix attached LAST, using word-class requirements:",
    "    • Inflection is always outermost. A plural on a compound attaches to the whole compound: [[book shelf] -es].",
    "    • un- and in-/im-/il-/ir- (meaning \"not\") attach to ADJECTIVES (including participial adjectives). So if the suffix turns an adjective into a noun (-ness, -ity), the prefix attached first: [[un-kind]-ness], [[in-active]-ity]. If the suffix creates the adjective (-able, -ible, -ed participle), the suffix attached first: [un-[wash-ed]], [un-[think-able]], [in-[dispense-able]].",
    "    • A prefix that needs a verb (re-, mis-, dis-) attaches to the verb before nominalising suffixes: [[re-write]-er].",
    "    • Suffix chains build from the inside out: [[hope-less]-ness], [[hurry-ed]-ly], [[cred- -ible] -ly].",
    "    • Hyphenated phrasal compounds follow their phrase structure: editor-in-chief = [editor [in chief]].",
    "## 5. Write",
    "- Be BRIEF and student-friendly: each meaning at most 12 words, each etym at most 10 words, allomorphy and derivInfl one or two short sentences, gloss at most 10 words.",
    "- restoration: surface ends with a hyphen; empty list if nothing changed.",
    "- family: the historical root, its short gloss, and 6 real related English words.",
    "- The user message may contain DICTIONARY CONTEXT (part of speech, definition, etymology of the word). Treat it as reliable, use it to decide the segmentation and to keep etym short, and do not contradict it.",
    "- If the user message says the word is NOT in the dictionary, analyse it as a nonce word using productive rules, and say so in the gloss."
  ].join("\n");

  const SCHEMA = (() => {
    const str = { type: "string" };
    return {
      type: "object",
      required: ["morphemes", "tree", "insights", "family", "process", "pos", "gloss"],
      properties: {
        morphemes: {
          type: "array",
          items: {
            type: "object",
            required: ["form", "surface", "type", "cls", "cat", "allomorphOf", "variant", "meaning", "etym"],
            properties: {
              form: str, surface: str,
              type: { type: "string", enum: ["prefix", "root", "suffix"] },
              cls: { type: "string", enum: ["prefix-der", "prefix-inf", "root-free", "root-bound", "suffix-der", "suffix-inf"] },
              cat: str, allomorphOf: str, variant: str, meaning: str, etym: str
            }
          }
        },
        tree: str,
        insights: {
          type: "object",
          required: ["allomorphy", "restoration", "derivInfl"],
          properties: {
            allomorphy: str, derivInfl: str,
            restoration: {
              type: "array",
              items: {
                type: "object",
                required: ["surface", "base", "rule"],
                properties: { surface: str, base: str, rule: str }
              }
            }
          }
        },
        family: {
          type: "object",
          required: ["root", "rootGloss", "words"],
          properties: { root: str, rootGloss: str, words: { type: "array", items: str } }
        },
        process: str, pos: str, gloss: str
      }
    };
  })();

  /** Gemini wants an explicit property order, otherwise it may emit keys alphabetically. */
  function withOrdering(node) {
    if (Array.isArray(node)) return node.map(withOrdering);
    if (!node || typeof node !== "object") return node;
    const out = {};
    for (const k of Object.keys(node)) out[k] = withOrdering(node[k]);
    if (out.properties) out.propertyOrdering = Object.keys(out.properties);
    return out;
  }
  const GEMINI_SCHEMA = withOrdering(SCHEMA);

  // ---------------------------------------------------------------- validation

  const plain = s => String(s || "").toLowerCase().replace(/-/g, "");

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
      const v = m.variant || "";
      if (!v) return;
      if (/\((v|v2|adv|comparative|superlative)\)$/.test(v) && m.cls !== "suffix-inf") problems.push(`Morpheme ${i} is labelled ${v}, which is inflectional, but its cls is ${m.cls}.`);
      if ((/\((N|adj|onomatopoeia)\)$/.test(v) || v === "-ist") && m.cls !== "suffix-der") problems.push(`Morpheme ${i} is labelled ${v}, which is derivational, but its cls is ${m.cls}.`);
    });

    const parsed = parseTree(ai.tree);
    if (parsed.error) return problems.concat([`The tree string is malformed: ${parsed.error}.`]);
    const leaves = [];
    (function walk(n) {
      if (n.leaf !== undefined) { leaves.push(n.leaf); return; }
      if (n.kids.length !== 2) problems.push(`The bracket [${n.cat}|${n.label} …] has ${n.kids.length} parts; every cut must have exactly two.`);
      n.kids.forEach(walk);
    })(parsed.tree);
    const want = ms.map((m, i) => i).join(",");
    if (leaves.join(",") !== want) problems.push(`Reading the numbers left to right gives [${leaves.join(",")}] instead of [${want}].`);
    return problems;
  }

  /** The bracket string → nested tree used by the renderers (labels fall back to the spelled morphemes). */
  function toAppFormat(ai, word, model) {
    const ms = ai.morphemes;
    const parsed = parseTree(ai.tree).tree;
    const spelled = n => n.leaf !== undefined ? plain(ms[n.leaf].surface) : n.kids.map(spelled).join("");
    const cleanLabel = (lab, n) => /^[a-zA-Z'-]{2,}$/.test(lab || "") ? lab.toLowerCase() : spelled(n);
    const make = (n, top) => {
      if (n.leaf !== undefined) return top ? { label: word, cat: ms[n.leaf].cat, m: n.leaf } : { m: n.leaf };
      return { label: top ? word : cleanLabel(n.label, n), cat: n.cat, children: n.kids.map(k => make(k, false)) };
    };
    return {
      word, pos: ai.pos, ipa: "", gloss: ai.gloss, process: ai.process,
      morphemes: ms, tree: make(parsed, true), insights: ai.insights, family: ai.family,
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

  const jsonInstruction = text => text + "\n\nAnswer with ONE JSON object only (no markdown, no commentary) that follows this JSON schema:\n" + JSON.stringify(SCHEMA);

  /** Short thinking budget keeps Gemini fast; Pro cannot switch thinking off, unknown models get the default. */
  function thinking(model) {
    if (/2\.5-flash-lite/.test(model)) return { thinkingConfig: { thinkingBudget: 0 } };
    if (/2\.5-flash/.test(model)) return { thinkingConfig: { thinkingBudget: 512 } };
    return {};
  }

  // ---- one streamed call per provider kind; each resolves with the full answer text ----

  async function streamGemini({ apiKey, model, userText, onText, signal }) {
    const gen = { maxOutputTokens: 8192, temperature: 0.2, ...thinking(model) };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
    const call = body => http("gemini", url, {
      method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify(body)
    }, signal);
    const sys = { parts: [{ text: SYSTEM_PROMPT }] };
    let res;
    try {
      res = await call({
        systemInstruction: sys, contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: { ...gen, responseMimeType: "application/json", responseSchema: GEMINI_SCHEMA }
      });
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 400) throw e;   // schema rejected → plain JSON mode
      res = await call({
        systemInstruction: sys, contents: [{ role: "user", parts: [{ text: jsonInstruction(userText) }] }],
        generationConfig: { ...gen, responseMimeType: "application/json" }
      });
    }
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

  async function streamOpenAI({ provider, apiKey, model, userText, onText, signal }) {
    const cfg = PROVIDERS[provider];
    const url = cfg.base + "/chat/completions";
    const call = body => http(provider, url, {
      method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + apiKey }, body: JSON.stringify(body)
    }, signal);
    const base = {
      model, stream: true,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: jsonInstruction(userText) }]
    };
    let res;
    try {
      res = await call({ ...base, response_format: { type: "json_object" } });
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 400) throw e;   // model without JSON mode → rely on the instruction
      res = await call(base);
    }
    let text = "", finish = "";
    await readSse(res, msg => {
      if (msg.error) throw new ApiError((msg.error.message) || cfg.name + " stopped unexpectedly.", 0);
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

  async function streamAnthropic({ apiKey, model, userText, onText, signal }) {
    const res = await http("anthropic", "https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model, max_tokens: 4096, stream: true,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: jsonInstruction(userText) }]
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

  async function stream(opts) {
    const kind = PROVIDERS[opts.provider].kind;
    const text = await (kind === "gemini" ? streamGemini(opts) : kind === "anthropic" ? streamAnthropic(opts) : streamOpenAI(opts));
    const s = text.indexOf("{"), e = text.lastIndexOf("}");
    try { return JSON.parse(text.slice(s, e + 1)); }
    catch (err) { throw new ApiError(PROVIDERS[opts.provider].name + "'s answer could not be read. Please try again.", 0); }
  }

  function contextText(word, ctx) {
    if (!ctx) return `Word to analyse: "${word}"\nDICTIONARY CONTEXT: this word is NOT in the dictionary.`;
    const lines = [`Word to analyse: "${word}"`, "DICTIONARY CONTEXT:"];
    if (ctx.lemma && ctx.lemma !== word) lines.push(`- "${word}" is an inflected form of "${ctx.lemma}".`);
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
      let userText = contextText(word, context);
      if (problems.length) {
        userText += "\n\nA previous analysis of this word was rejected by the validator for these reasons:\n- " +
          problems.join("\n- ") + "\nFollow the decision procedure carefully and fix every point.";
        opts.onAttempt && opts.onAttempt(attempt);
      }
      let shown = 0;
      const ai = await stream({
        provider, apiKey, model, userText, signal,
        onText: text => {
          if (!opts.onMorphemes) return;
          const ms = partialMorphemes(text);
          if (ms.length !== shown) { shown = ms.length; opts.onMorphemes(ms); }
        }
      });
      problems = validate(ai, word);
      if (!problems.length) {
        const data = toAppFormat(ai, word, model);
        data.provider = provider;
        data.attempts = attempt;
        return data;
      }
    }
    const fail = new ApiError("The AI gave an inconsistent analysis for this word, even after a retry. Press Analyze again, or pick a stronger model in Settings. (" + problems[0] + ")", 0);
    fail.raw = problems.join("\n");
    throw fail;
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

  window.MorphAI = { analyze, testKey, listModels, pickGeminiModel, validate, parseTree, toAppFormat, partialMorphemes, PROVIDERS, PROMPT_VERSION, ApiError };
})();
