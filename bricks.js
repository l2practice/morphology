/*
 * Morphology — morpheme cards.
 * One soft pastel card per morpheme, tinted by type (prefix = green,
 * root = red, suffix = blue) and cascading in left to right.
 */
(function () {
  const ICON = { prefix: "P", root: "R", suffix: "S" };

  /**
   * @param container  element to fill
   * @param morphemes  [{form, surface, type, meaning?}]
   * @param labels     {prefix, root, suffix, spelled, zero}
   * @param esc        HTML escaper
   */
  function render(container, morphemes, labels, esc) {
    container.innerHTML = morphemes.map((m, i) => {
      const plain = m.form.replace(/-/g, "");
      const note = m.surface === ""
        ? `Ø · ${esc(labels.zero)}`
        : m.surface && m.surface !== plain ? `${esc(labels.spelled)} ${esc(m.surface)}` : "";
      return `<div class="badge ${m.type}" style="--i:${i}" title="${esc(m.form)}">
        <div class="badge-top">
          <span class="badge-form">${esc(m.form)}</span>
          <span class="badge-menu" aria-hidden="true"><i></i><i></i><i></i></span>
        </div>
        <div class="badge-sub">${esc(note || labels[m.type] || "")}</div>
        <div class="badge-bottom">
          <span class="badge-icon" aria-hidden="true">${ICON[m.type] || ""}</span>
          <span class="badge-type">${esc(labels[m.type] || "")}</span>
        </div>
      </div>`;
    }).join("");
  }

  window.ICBricks = { render };
})();
