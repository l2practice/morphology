/*
 * Hierarchical IC tree renderer (SVG, top-down).
 * Children are drawn in the order given by the data, so the left-to-right
 * reading order is preserved: a prefix always branches LEFT of its stem,
 * a suffix always branches RIGHT of its stem.
 */
(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const LEVEL_GAP = 96;
  const LEAF_GAP = 28;
  const NODE_H = 40;
  const PAD_X = 90;     // room for the level labels on the left
  const PAD_Y = 30;
  const CHAR_W = 9.2;

  function el(name, attrs, text) {
    const node = document.createElementNS(SVG_NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function boxWidth(label, tag) {
    return Math.max(64, label.length * CHAR_W + (tag ? tag.length * 7 + 16 : 0) + 28);
  }

  // Build a layout tree: each node gets depth, width, x, y.
  function build(spec, word, depth) {
    if (spec.children) {
      const kids = spec.children.map(c => build(c, word, depth + 1));
      return { label: spec.label, tag: spec.cat, depth, kids, kind: "inner" };
    }
    const m = word.morphemes[spec.m];
    const isWholeWord = spec.label && word.morphemes.length === 1;
    const label = isWholeWord ? spec.label : m.form;
    return { label, tag: m.type === "root" ? (m.cat || spec.cat || "") : "", depth, kind: m.type, cls: m.cls, kids: [] };
  }

  function layout(root) {
    let cursor = PAD_X;
    let maxDepth = 0;
    (function walk(n) {
      n.w = boxWidth(n.label, n.tag);
      n.y = PAD_Y + n.depth * LEVEL_GAP;
      maxDepth = Math.max(maxDepth, n.depth);
      if (!n.kids.length) {
        n.x = cursor + n.w / 2;
        cursor += n.w + LEAF_GAP;
      } else {
        n.kids.forEach(walk);
        n.x = (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2;
      }
    })(root);

    // Resolve overlaps between inner nodes on the same level by shifting
    // whole subtrees to the right.
    const levels = [];
    (function collect(n) { (levels[n.depth] = levels[n.depth] || []).push(n); n.kids.forEach(collect); })(root);
    const shift = (n, dx) => { n.x += dx; n.kids.forEach(k => shift(k, dx)); };
    levels.forEach(row => {
      for (let i = 1; i < row.length; i++) {
        const a = row[i - 1], b = row[i];
        const overlap = (a.x + a.w / 2 + LEAF_GAP) - (b.x - b.w / 2);
        if (overlap > 0) shift(b, overlap);
      }
    });
    (function recenter(n) { if (n.kids.length) { n.kids.forEach(recenter); n.x = (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2; } })(root);

    let maxX = 0, minX = Infinity;
    (function bounds(n) { maxX = Math.max(maxX, n.x + n.w / 2); minX = Math.min(minX, n.x - n.w / 2); n.kids.forEach(bounds); })(root);
    return { width: Math.max(maxX + 30, 420), height: PAD_Y * 2 + maxDepth * LEVEL_GAP + NODE_H, maxDepth, minX };
  }

  function renderBoxes(container, word, t) {
    container.innerHTML = "";
    const root = build(word.tree, word, 0);
    const dims = layout(root);
    const svg = el("svg", {
      viewBox: `0 0 ${dims.width} ${dims.height}`,
      width: "100%", role: "img",
      "aria-label": `IC tree for ${word.word}`,
      class: "ic-tree"
    });
    svg.style.maxWidth = dims.width + "px";

    // Level guides
    for (let d = 0; d <= dims.maxDepth; d++) {
      const y = PAD_Y + d * LEVEL_GAP + NODE_H / 2;
      svg.appendChild(el("line", { x1: 10, x2: dims.width - 10, y1: y, y2: y, class: "level-line" }));
      svg.appendChild(el("text", { x: 12, y: y - 8, class: "level-label" }, d === 0 ? t("levelWord") : `${t("levelCut")} ${d}`));
    }

    const edges = el("g", { class: "edges" });
    const nodes = el("g", { class: "nodes" });
    svg.appendChild(edges);
    svg.appendChild(nodes);

    let order = 0;
    (function draw(n) {
      n.kids.forEach(k => {
        const path = el("path", {
          d: `M${n.x},${n.y + NODE_H} C${n.x},${n.y + NODE_H + 30} ${k.x},${k.y - 30} ${k.x},${k.y}`,
          class: `edge edge-${k.kind}`,
          style: `animation-delay:${0.15 + k.depth * 0.25}s`
        });
        edges.appendChild(path);
        draw(k);
      });

      const g = el("g", {
        class: `node node-${n.kind}`,
        transform: `translate(${n.x - n.w / 2},${n.y})`,
        style: `animation-delay:${n.depth * 0.25 + (order++) * 0.03}s`
      });
      g.appendChild(el("rect", { width: n.w, height: NODE_H, rx: 9, ry: 9 }));
      const labelW = n.label.length * CHAR_W;
      const tagW = n.tag ? n.tag.length * 7 + 16 : 0;
      const startX = (n.w - labelW - tagW) / 2;
      g.appendChild(el("text", { x: startX, y: NODE_H / 2 + 6, class: "node-label" }, n.label));
      if (n.tag) {
        g.appendChild(el("text", { x: startX + labelW + 8, y: NODE_H / 2 + 5, class: "node-tag" }, n.tag));
      }
      const title = el("title", {}, n.kind === "inner" ? `${n.label} (${n.tag})` : `${n.label} — ${t("cls_" + n.cls)}`);
      g.appendChild(title);
      nodes.appendChild(g);
    })(root);

    container.appendChild(svg);
    if (!root.kids.length) {
      const note = document.createElement("p");
      note.className = "tree-note";
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
    return style === "boxes" ? renderBoxes(container, word, t) : renderClassic(container, word);
  }

  window.ICTree = { render };
})();
