/*
 * Morphology — Gemini client.
 * Runs in the student's browser with the student's own Google AI Studio key (never sent
 * anywhere except generativelanguage.googleapis.com). The answer is streamed, so finished
 * morphemes can be shown while the rest of the analysis is still arriving.
 */
(function () {
  const PROMPT_VERSION = 6;
  const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
  const MAX_ATTEMPTS = 2;   // 1 retry when the answer fails validation

  const MODELS = [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash — fast (recommended)" },
    { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite — fastest" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro — most careful, slowest" }
  ];

  // The worked examples deliberately avoid common test words, so the rules
  // (not memorised answers) decide the analysis.
  const SYSTEM_PROMPT = [
    "You are an expert English morphologist helping English-major students practise Immediate Constituent (IC) analysis.",
    "Analyse the word you are given and answer with JSON that follows the schema. Work through the decision procedure below before you answer.",
    "",
    "## 1. Segment: is each cut real in present-day English?",
    "Cut off a piece only if ALL three tests pass:",
    "  (a) the remaining base exists as a word or recognisable morpheme in present-day English;",
    "  (b) the piece adds its usual meaning or grammatical function;",
    "  (c) the whole word means roughly \"base + affix meaning\".",
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
    "- English has no inflectional prefixes. The only inflectional suffixes are plural -s/-es, possessive -'s, 3rd-person -s, past -ed, progressive -ing, past-participle -en/-ed, comparative -er and superlative -est (and their zero/irregular allomorphs). Deadjectival -ly (decidedly = \"in a decided way\") and nominal -ing (a misunderstanding) are derivational.",
    "- cat for roots: N, V, Adj, Adv or P. Use \"\" for affixes.",
    "",
    "## 4. Build the binary IC tree (\"nodes\")",
    "- Pre-order list. Node 0 is the whole word with parent -1. A node's parent always appears before it.",
    "- Every inner node has EXACTLY TWO children, listed left to right. Reading the leaves left to right must give morpheme 0, 1, 2 … in order.",
    "- A prefix branches LEFT of its stem; a suffix branches RIGHT of its stem.",
    "- Decide the order of attachment by asking which affix attached LAST, using word-class requirements:",
    "    • Inflection is always outermost. A plural on a compound attaches to the whole compound: bookshelves = [[book shelf] -es].",
    "    • un- and in-/im-/il-/ir- (meaning \"not\") attach to ADJECTIVES (including participial adjectives). So if the suffix turns an adjective into a noun (-ness, -ity), the prefix attached first: unkindness = [[un-kind]-ness], inactivity = [[in-active]-ity]. If the suffix creates the adjective (-able, -ible, -ed participle), the suffix attached first: unwashed = [un-[wash-ed]], unthinkable = [un-[think-able]].",
    "    • A prefix that needs a verb (re-, mis-, dis-) attaches to the verb before nominalising suffixes: [[re-write]-er].",
    "    • Suffix chains build from the inside out: hopelessness = [[hope-less]-ness], hurriedly = [[hurry-ed]-ly].",
    "    • Hyphenated phrasal compounds follow their phrase structure: editor-in-chief = [editor [in chief]].",
    "- Leaf nodes give the morpheme index in \"morpheme\"; inner nodes use -1. A one-morpheme word is a single node with morpheme 0.",
    "- label is the spelled string the node covers (hyphens allowed); cat is its word class (N, V, Adj, Adv, P/PP) or \"\" for affixes.",
    "",
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
      required: ["morphemes", "nodes", "insights", "family", "process", "pos", "gloss"],
      properties: {
        morphemes: {
          type: "array",
          items: {
            type: "object",
            required: ["form", "surface", "type", "cls", "cat", "allomorphOf", "meaning", "etym"],
            properties: {
              form: str, surface: str,
              type: { type: "string", enum: ["prefix", "root", "suffix"] },
              cls: { type: "string", enum: ["prefix-der", "prefix-inf", "root-free", "root-bound", "suffix-der", "suffix-inf"] },
              cat: str, allomorphOf: str, meaning: str, etym: str
            }
          }
        },
        nodes: {
          type: "array",
          items: {
            type: "object",
            required: ["label", "cat", "parent", "morpheme"],
            properties: { label: str, cat: str, parent: { type: "integer" }, morpheme: { type: "integer" } }
          }
        },
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

  function validate(ai, word) {
    const problems = [];
    const ms = ai.morphemes || [];
    const nodes = ai.nodes || [];
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

    if (!nodes.length || nodes.filter(n => n.parent < 0).length !== 1 || nodes[0].parent >= 0) {
      return problems.concat(["Node 0 must be the only node with parent -1."]);
    }
    const kids = nodes.map(() => []);
    for (let i = 1; i < nodes.length; i++) {
      const p = nodes[i].parent;
      if (p < 0 || p >= i) return problems.concat([`Node ${i} must point to a parent that appears before it.`]);
      kids[p].push(i);
    }
    const leafOrder = [];
    (function walk(i) {
      const n = nodes[i];
      if (!kids[i].length) {
        if (n.morpheme < 0 || n.morpheme >= ms.length) problems.push(`Leaf node ${i} ("${n.label}") has no valid morpheme index.`);
        else leafOrder.push(n.morpheme);
        return;
      }
      if (n.morpheme !== -1) problems.push(`Inner node ${i} ("${n.label}") must have morpheme -1.`);
      if (kids[i].length !== 2) problems.push(`Node "${n.label}" has ${kids[i].length} children; every cut must be binary.`);
      kids[i].forEach(walk);
    })(0);

    if (leafOrder.join(",") !== ms.map((m, i) => i).join(",")) {
      problems.push(`Reading the leaves left to right gives morphemes [${leafOrder.join(",")}] instead of [${ms.map((m, i) => i).join(",")}].`);
    } else {
      (function spell(i) {
        if (!kids[i].length) return ms[nodes[i].morpheme].surface.toLowerCase();
        const s = kids[i].map(spell).join("");
        if (plain(nodes[i].label) !== s) problems.push(`Node label "${nodes[i].label}" does not match the morphemes below it ("${s}").`);
        return s;
      })(0);
    }
    return problems;
  }

  /** Flat AI node list → nested tree used by the renderers. */
  function toAppFormat(ai, word, model) {
    const nodes = ai.nodes;
    const kids = nodes.map(() => []);
    for (let i = 1; i < nodes.length; i++) kids[nodes[i].parent].push(i);
    const make = i => {
      const n = nodes[i];
      if (!kids[i].length) return i === 0 ? { label: n.label, cat: n.cat, m: n.morpheme } : { m: n.morpheme };
      return { label: n.label, cat: n.cat, children: kids[i].map(make) };
    };
    return {
      word, pos: ai.pos, ipa: "", gloss: ai.gloss, process: ai.process,
      morphemes: ai.morphemes, tree: make(0), insights: ai.insights, family: ai.family,
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

  async function readError(res) {
    let msg = "", reason = "";
    try {
      const e = (await res.json()).error || {};
      msg = e.message || "";
      reason = (e.details || []).map(d => d.reason || "").join(" ");
    } catch (e) { /* not JSON */ }
    if (res.status === 401 || /API_KEY_INVALID|API key not valid/i.test(reason + msg)) return new ApiError("Your API key was rejected. Check it in Settings.", 401);
    if (res.status === 403) return new ApiError("This API key is not allowed to use that model (or Gemini is not available in your region).", 403);
    if (res.status === 404) return new ApiError("The selected model is not available for your key. Pick another model in Settings.", 404);
    if (res.status === 429) return new ApiError("Rate limit or free quota reached. Wait a moment and try again.", 429);
    if (res.status >= 500) return new ApiError("Gemini is busy right now. Try again in a moment.", res.status);
    return new ApiError(msg ? `Gemini API error: ${msg}` : `Gemini API error ${res.status}`, res.status);
  }

  async function post(apiKey, model, method, body, signal) {
    let res;
    try {
      res = await fetch(`${API_BASE}${encodeURIComponent(model)}:${method}`, {
        method: "POST", signal,
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body)
      });
    } catch (e) {
      if (e.name === "AbortError") throw e;
      throw new ApiError("Could not reach Gemini. Check your internet connection.", 0);
    }
    if (!res.ok) throw await readError(res);
    return res;
  }

  /** Short thinking budget keeps answers fast; Pro cannot switch thinking off, unknown models get the default. */
  function thinking(model) {
    if (/2\.5-flash-lite/.test(model)) return { thinkingConfig: { thinkingBudget: 0 } };
    if (/2\.5-flash/.test(model)) return { thinkingConfig: { thinkingBudget: 512 } };
    return {};
  }

  /** One streamed call; resolves with the parsed analysis JSON. */
  async function stream({ apiKey, model, userText, onText, signal }) {
    const gen = { maxOutputTokens: 4000, temperature: 0.2, ...thinking(model) };
    const base = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userText }] }]
    };
    let res;
    try {
      res = await post(apiKey, model, "streamGenerateContent?alt=sse", {
        ...base, generationConfig: { ...gen, responseMimeType: "application/json", responseSchema: GEMINI_SCHEMA }
      }, signal);
    } catch (e) {
      // If the schema is rejected (400), fall back to plain JSON mode.
      if (!(e instanceof ApiError) || e.status !== 400) throw e;
      res = await post(apiKey, model, "streamGenerateContent?alt=sse", {
        systemInstruction: base.systemInstruction,
        contents: [{ role: "user", parts: [{ text: userText + "\n\nAnswer with ONE JSON object only that follows this JSON schema:\n" + JSON.stringify(SCHEMA) }] }],
        generationConfig: { ...gen, responseMimeType: "application/json" }
      }, signal);
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "", finish = "", blocked = "";
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
        let msg;
        try { msg = JSON.parse(line.slice(5)); } catch (e) { continue; }
        if (msg.error) throw new ApiError(msg.error.message || "Gemini stopped unexpectedly.", 0);
        if (msg.promptFeedback && msg.promptFeedback.blockReason) blocked = msg.promptFeedback.blockReason;
        const cand = msg.candidates && msg.candidates[0];
        if (!cand) continue;
        const parts = (cand.content && cand.content.parts) || [];
        const piece = parts.filter(p => !p.thought && typeof p.text === "string").map(p => p.text).join("");
        if (piece) { text += piece; onText && onText(text); }
        if (cand.finishReason) finish = cand.finishReason;
      }
    }
    if (blocked) throw new ApiError("Gemini declined to analyse this word.", 0);
    if (finish === "MAX_TOKENS") throw new ApiError("The answer was cut off. Please try again.", 0);
    if (finish === "SAFETY" || finish === "PROHIBITED_CONTENT") throw new ApiError("Gemini declined to analyse this word.", 0);
    const s = text.indexOf("{"), e = text.lastIndexOf("}");
    try { return JSON.parse(text.slice(s, e + 1)); } catch (err) { throw new ApiError("Gemini's answer could not be read. Please try again.", 0); }
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
   * @param opts.word, opts.apiKey, opts.model, opts.context (dictionary summary or null)
   * @param opts.onMorphemes(list)  called whenever more morphemes have arrived
   * @param opts.onAttempt(n)       called when a retry starts
   */
  async function analyze(opts) {
    const { word, apiKey, model, context, signal } = opts;
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
        apiKey, model, userText, signal,
        onText: text => {
          if (!opts.onMorphemes) return;
          const ms = partialMorphemes(text);
          if (ms.length !== shown) { shown = ms.length; opts.onMorphemes(ms); }
        }
      });
      problems = validate(ai, word);
      if (!problems.length) {
        const data = toAppFormat(ai, word, model);
        data.attempts = attempt;
        return data;
      }
    }
    throw new ApiError("The analysis did not pass the consistency check: " + problems.join("; "), 0);
  }

  async function testKey(apiKey, model) {
    const res = await post(apiKey, model, "generateContent", {
      contents: [{ role: "user", parts: [{ text: "Reply with: OK" }] }],
      generationConfig: { maxOutputTokens: 64, ...thinking(model) }
    });
    await res.json();
    return true;
  }

  window.MorphAI = { analyze, testKey, validate, partialMorphemes, MODELS, PROMPT_VERSION, ApiError };
})();
