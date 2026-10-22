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

  function render(container, word, t) {
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

  window.ICTree = { render };
})();
