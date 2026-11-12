/**
 * Plain JavaScript that runs inside headless Chromium next to Mermaid (kept as a string so the TypeScript
 * transpiler cannot inject helpers into it). It exposes `window.diagramsPage.render` and `.annotate`.
 */
export const PAGE_SCRIPT = String.raw`
(() => {
  const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  const render = async (id, source, scheme) => {
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: scheme === "dark" ? "dark" : "default",
      look: "classic",
      handDrawnSeed: 7,
      deterministicIds: true,
      deterministicIDSeed: "diagrams",
      fontFamily: FONT,
      themeVariables: scheme === "dark"
        ? { clusterBkg: "#18233d", clusterBorder: "#475569", edgeLabelBackground: "#0b1120", lineColor: "#cbd5e1" }
        : { clusterBkg: "#f1f5f9", clusterBorder: "#94a3b8", edgeLabelBackground: "#ffffff", lineColor: "#334155" },
      flowchart: { useMaxWidth: false, htmlLabels: true, curve: "basis" },
      sequence: { useMaxWidth: false },
      class: { useMaxWidth: false },
      state: { useMaxWidth: false },
    });
    const { svg } = await window.mermaid.render(id, source);
    return svg;
  };

  const NODE_PREFIX = { flowchart: "flowchart-", class: "classId-", state: "state-" };

  const add = (map, name, element) => {
    const list = map.get(name) || [];
    if (!list.includes(element)) list.push(element);
    map.set(name, list);
  };

  const findTargets = (svg, kind, svgId) => {
    const map = new Map();
    if (kind === "sequence") {
      svg.querySelectorAll('g[data-et="participant"]').forEach((g) => {
        const name = g.getAttribute("data-id");
        if (name) add(map, name, g);
      });
      svg.querySelectorAll("g.actor-man.actor-bottom[name]").forEach((g) => add(map, g.getAttribute("name"), g));
      svg.querySelectorAll("rect.actor-bottom[name]").forEach((rect) => {
        if (rect.parentElement && rect.parentElement.tagName.toLowerCase() === "g") {
          add(map, rect.getAttribute("name"), rect.parentElement);
        }
      });
      return map;
    }
    const prefix = NODE_PREFIX[kind];
    svg.querySelectorAll("g.node").forEach((g) => {
      const id = g.getAttribute("id") || "";
      const local = id.startsWith(svgId + "-") ? id.slice(svgId.length + 1) : id;
      if (!local.startsWith(prefix)) return;
      const name = local.slice(prefix.length).replace(/-\d+$/, "");
      if (kind === "state" && (g.textContent || "").trim() === "") return;
      add(map, name, g);
    });
    return map;
  };

  const annotate = (svgMarkup, kind, svgId, rows, ariaLabel) => {
    const host = document.createElement("div");
    host.innerHTML = svgMarkup;
    const svg = host.querySelector("svg");
    const targets = findTargets(svg, kind, svgId);
    const byBlock = new Map(rows.map((row) => [row.block, row]));
    const found = [];
    targets.forEach((elements, name) => {
      found.push({ name, label: elements.map((el) => el.textContent || "").join(" ").replace(/\s+/g, " ").trim() });
      const row = byBlock.get(name);
      if (!row) return;
      const marker = row.data === "—" ? "" : row.data;
      const text = marker ? marker + ": " + row.description : row.description;
      elements.forEach((el) => {
        el.setAttribute("tabindex", "0");
        el.setAttribute("role", "group");
        el.setAttribute("aria-label", text);
        el.setAttribute("data-block", name);
        el.setAttribute("data-marker", marker);
        el.setAttribute("data-desc", row.description);
        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = text;
        el.insertBefore(title, el.firstChild);
      });
    });
    const box = (svg.getAttribute("viewBox") || "").trim().split(/\s+/).map(Number);
    if (box.length === 4 && box.every(Number.isFinite)) {
      svg.setAttribute("width", String(Math.ceil(box[2])));
      svg.setAttribute("height", String(Math.ceil(box[3])));
    }
    svg.style.removeProperty("max-width");
    if (!svg.getAttribute("style")) svg.removeAttribute("style");
    svg.setAttribute("aria-label", ariaLabel);
    svg.setAttribute("class", ((svg.getAttribute("class") || "") + " diagram-svg").trim());
    return { html: svg.outerHTML, found };
  };

  window.diagramsPage = { render, annotate };
})();
`;
