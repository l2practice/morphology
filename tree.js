/*
 * Hierarchical IC tree renderer (SVG, top-down).
 * Children are drawn in the order given by the data, so the left-to-right
 * reading order is preserved: a prefix always branches LEFT of its stem,
 * a suffix always branches RIGHT of its stem.
 */
(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";

  function el(name, attrs, text) {
    const node = document.createElementNS(SVG_NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ------------------------------------------------------------------
  // Cut diagram (the "box" drawing used on the board): a vertical cut splits a
  // constituent and the line under it marks that constituent. The cuts are
  // drawn top-down with a wipe. Irregular words (good → better, mouse → mice)
  // cannot be cut out of their spelling, so they fall back to the branching tree.
  // ------------------------------------------------------------------
  const commonPrefix = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };

  function isIrregular(word) {
    return word.morphemes.some(m => {
      if (m.surface === "") return true;                                  // zero morpheme: {PLURAL}, {PAST}
      const form = m.form.replace(/-/g, "").toLowerCase();
      const surf = String(m.surface || "").toLowerCase();
      return m.type === "root" && form !== surf && commonPrefix(form, surf) < 2;   // good → bett-, go → went
    });
  }

  function renderCuts(container, word, t) {
    container.innerHTML = "";
    if (isIrregular(word)) {
      const note = document.createElement("p");
      note.className = "cut-note";
      note.textContent = "This word is irregular, so its parts cannot be cut out of the spelling. The branching tree is shown instead.";
      container.appendChild(note);
      const holder = document.createElement("div");
      container.appendChild(holder);
      renderClassic(holder, word);
      return;
    }

    const FONT = 38, GAP = 28, PAD = 30, TOP = 40, BASE = 82, UL0 = 20, UL_STEP = 18, BAR_W = 4;
    const ms = word.morphemes;
    const build = (spec, depth) => spec.children
      ? { depth, kids: spec.children.map(c => build(c, depth + 1)) }
      : { depth, leaf: spec.m };
    const root = build(word.tree, 0);

    const wrap = document.createElement("div");
    wrap.className = "cut-panel";
    const svg = el("svg", { role: "img", "aria-label": `Cut diagram for ${word.word}`, class: "cut-svg" });
    wrap.appendChild(svg);
    container.appendChild(wrap);

    // Place the morphemes left to right; measure the real text width.
    const leaves = [];
    (function collect(n) { if (n.leaf !== undefined) leaves.push(n); else n.kids.forEach(collect); })(root);
    let x = PAD;
    leaves.forEach(n => {
      const m = ms[n.leaf];
      const text = el("text", { x, y: BASE, class: `cut-morph cut-${m.type}` }, m.form);
      text.appendChild(el("title", {}, `${m.form} — ${t("cls_" + m.cls)}`));
      svg.appendChild(text);
      let w = 0;
      try { w = text.getComputedTextLength(); } catch (e) { /* not laid out */ }
      w = w || m.form.length * FONT * 0.6;
      n.x1 = x; n.x2 = x + w;
      x += w + GAP;
    });
    const width = Math.max(x - GAP + PAD, 260);

    // Constituents: span, cut position, height above the leaves.
    let maxH = 0;
    (function measure(n) {
      if (n.leaf !== undefined) { n.h = 0; return; }
      n.kids.forEach(measure);
      n.x1 = n.kids[0].x1; n.x2 = n.kids[n.kids.length - 1].x2;
      n.cut = (n.kids[0].x2 + n.kids[1].x1) / 2;
      n.h = 1 + Math.max(...n.kids.map(k => k.h));
      maxH = Math.max(maxH, n.h);
    })(root);

    const ulY = h => BASE + UL0 + (h - 1) * UL_STEP;
    const height = (maxH ? ulY(maxH) : BASE) + 30;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    // Lines: the whole word is cut first, then each part, so deeper cuts come later.
    (function lines(n) {
      if (n.leaf !== undefined) return;
      const y = ulY(n.h);
      const delay = 0.3 + n.depth * 0.55;
      svg.appendChild(el("rect", {
        x: n.x1 - 6, y, width: n.x2 - n.x1 + 12, height: BAR_W, rx: 2, class: "cut-ul", style: `animation-delay:${delay}s`
      }));
      svg.appendChild(el("rect", {
        x: n.cut - BAR_W / 2, y: TOP, width: BAR_W, height: y + BAR_W - TOP, rx: 2, class: "cut-bar", style: `animation-delay:${delay + 0.25}s`
      }));
      n.kids.forEach(lines);
    })(root);

    if (!root.kids) {
      const note = document.createElement("p");
      note.className = "cut-note light";
      note.textContent = t("monomorphemic");
      container.appendChild(note);
    }
  }

  // ------------------------------------------------------------------
  // Textbook style: category labels on the cuts, "pref / V / suff (A) /
  // infl (ADV)" above each morpheme, and curly braces underneath that
  // name every intermediate word (dispensable, indispensable, ...).
  // ------------------------------------------------------------------
  const CAT = { adj: "A", adv: "ADV", n: "N", v: "V", p: "P", pp: "PP" };
  const catLabel = c => { const k = String(c || "").toLowerCase(); return CAT[k] || String(c || "").toUpperCase(); };
  const TYPE_LABEL = { "prefix-der": "pref", "prefix-inf": "infl", "suffix-der": "suff", "suffix-inf": "infl" };

  function renderClassic(container, word) {
    container.innerHTML = "";
    const LEVEL = 74, TOP = 34, STEM = 22, SIDE = 40, CW = 9.4;
    const ms = word.morphemes;

    // Tree with cats resolved; leaves keep their morpheme.
    function build(spec, parent) {
      if (spec.children) {
        const n = { inner: true, cat: catLabel(spec.cat), label: spec.label || "", parent, kids: [] };
        n.kids = spec.children.map(c => build(c, n));
        return n;
      }
      const m = ms[spec.m];
      const isRoot = m.type === "root";
      return {
        inner: false, parent, m, whole: spec.label,
        typeLabel: isRoot ? catLabel(m.cat) : (TYPE_LABEL[m.cls] || m.type),
        isRoot, text: m.form
      };
    }
    const root = build(word.tree, null);

    // A suffix (or class-changing prefix) gets its output category circled.
    (function circle(n) {
      if (n.inner) { n.kids.forEach(circle); return; }
      if (n.isRoot || !n.parent || !n.parent.cat) return;
      const sib = n.parent.kids.find(k => k !== n);
      const sibCat = sib ? (sib.inner ? sib.cat : (sib.isRoot ? sib.typeLabel : "")) : "";
      if (sibCat && sibCat !== n.parent.cat) n.circle = n.parent.cat;
    })(root);

    // Depth / height.
    let maxDepth = 0;
    (function dep(n, d) { n.depth = d; if (n.inner) { maxDepth = Math.max(maxDepth, d); n.kids.forEach(k => dep(k, d + 1)); } })(root, 0);
    (function hgt(n) { n.height = n.inner ? 1 + Math.max(...n.kids.map(k => (hgt(k), k.inner ? k.height : 0))) : 0; return n.height; })(root);

    // x positions: leaves left to right, inner nodes centred over their children.
    let cursor = SIDE;
    const leaves = [];
    (function place(n) {
      if (!n.inner) {
        const tw = n.typeLabel.length * 8.6 + (n.circle ? n.circle.length * 8 + 30 : 0);
        n.w = Math.max(n.text.length * CW + 12, tw, 44);
        n.x = cursor + n.w / 2;
        cursor += n.w + 34;
        leaves.push(n);
      } else {
        n.kids.forEach(place);
        n.x = (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2;
      }
    })(root);
    const width = Math.max(cursor - 34 + SIDE, 300);

    const leafTypeY = TOP + (root.inner ? maxDepth + 1 : 0) * LEVEL;
    const morphY = leafTypeY + STEM + 34;
    (function ys(n) { n.y = n.inner ? TOP + n.depth * LEVEL : leafTypeY; if (n.inner) n.kids.forEach(ys); })(root);

    // Braces: one per inner node, stacked by height.
    const inners = [];
    (function col(n) { if (n.inner) { inners.push(n); n.kids.forEach(col); } })(root);
    (function span(n) {
      if (!n.inner) { n.x1 = n.x - n.w / 2; n.x2 = n.x + n.w / 2; return; }
      n.kids.forEach(span);
      n.x1 = Math.min(...n.kids.map(k => k.x1));
      n.x2 = Math.max(...n.kids.map(k => k.x2));
    })(root);
    const maxH = inners.length ? Math.max(...inners.map(n => n.height)) : 0;
    const BR_STEP = 62, BR_Y0 = morphY + 26;
    const height = BR_Y0 + (maxH ? maxH * BR_STEP : 0) + 18;

    const svg = el("svg", {
      viewBox: `0 0 ${width} ${height}`, width: "100%", role: "img",
      "aria-label": `Tree diagram for ${word.word}`, class: "ic-tree ct"
    });
    svg.style.maxWidth = width + "px";
    svg.style.minWidth = Math.min(width, 520) + "px";

    // Edges first so labels sit on top.
    let order = 0;
    (function edges(n) {
      if (!n.inner) return;
      n.kids.forEach(k => {
        const y2 = k.inner ? k.y - 16 : k.y - 16;
        svg.appendChild(el("line", {
          x1: n.x, y1: n.y + 8, x2: k.x, y2, class: "ct-edge", pathLength: 1,
          style: `animation-delay:${0.1 + n.depth * 0.18}s`
        }));
        edges(k);
      });
    })(root);

    // Inner node labels (category).
    inners.forEach(n => {
      const g = el("g", { class: "ct-node", style: `animation-delay:${n.depth * 0.18}s` });
      g.appendChild(el("text", { x: n.x, y: n.y, "text-anchor": "middle", class: "ct-cat" }, n.cat));
      svg.appendChild(g);
    });

    // Leaves: type label, stem, morpheme.
    leaves.forEach(n => {
      const kind = n.m.type;
      const g = el("g", { class: `ct-leaf ct-${kind}`, style: `animation-delay:${0.2 + (order++) * 0.08}s` });
      const label = el("text", { x: n.x, y: leafTypeY, "text-anchor": "middle", class: n.isRoot ? "ct-cat" : "ct-type" }, n.typeLabel);
      g.appendChild(label);
      if (n.circle) {
        const tw = n.typeLabel.length * 8.6;
        const cw = n.circle.length * 8 + 14;
        const cx = n.x + tw / 2 + 8 + cw / 2;
        g.appendChild(el("ellipse", { cx, cy: leafTypeY - 5, rx: cw / 2, ry: 13, class: "ct-ring" }));
        g.appendChild(el("text", { x: cx, y: leafTypeY, "text-anchor": "middle", class: "ct-circ" }, n.circle));
      }
      g.appendChild(el("line", { x1: n.x, y1: leafTypeY + 8, x2: n.x, y2: morphY - 20, class: "ct-stem" }));
      g.appendChild(el("text", { x: n.x, y: morphY, "text-anchor": "middle", class: "ct-morph" }, n.text));
      g.appendChild(el("title", {}, `${n.text} — ${(window.__ctTitle && window.__ctTitle(n.m)) || n.m.cls}`));
      svg.appendChild(g);
    });

    // Braces with the word each cut produces.
    inners.forEach(n => {
      const y = BR_Y0 + (n.height - 1) * BR_STEP;
      const cx = (n.x1 + n.x2) / 2;
      const x1 = n.x1 + 2, x2 = n.x2 - 2;
      const d = `M${x1},${y - 7} Q${x1},${y} ${x1 + 8},${y} H${cx - 8} Q${cx},${y} ${cx},${y + 8} Q${cx},${y} ${cx + 8},${y} H${x2 - 8} Q${x2},${y} ${x2},${y - 7}`;
      const g = el("g", { class: "ct-brace-g", style: `animation-delay:${0.5 + n.height * 0.12}s` });
      g.appendChild(el("path", { d, class: "ct-brace" }));
      g.appendChild(el("text", { x: cx, y: y + 30, "text-anchor": "middle", class: "ct-bword" }, n.label || word.word));
      svg.appendChild(g);
    });

    container.appendChild(svg);
    if (!root.inner) {
      const note = document.createElement("p");
      note.className = "tree-note";
      note.textContent = "One morpheme — no IC cut is possible.";
      container.appendChild(note);
    }
  }

  function render(container, word, t, style) {
    window.__ctTitle = m => t("cls_" + m.cls);
    return style === "boxes" ? renderCuts(container, word, t) : renderClassic(container, word);
  }

  window.ICTree = { render };
})();
