"use strict";

const DEFAULT_BUNDLE = location.pathname.includes("/explorer/") ? "../okf-bundle.json" : "okf-bundle.json";
const DEFAULT_REGISTRY = location.pathname.includes("/explorer/") ? "../okf-registry.json" : "okf-registry.json";
const VIEW_IDS = new Set(["reader", "graph", "links", "timeline"]);
const PIN_STORAGE_KEY = "okfExplorerPins:v1";
const BUNDLE_HISTORY_KEY = "okfExplorerBundleHistory:v1";
const JSON_RETRIES = 3;
const MAX_JSON_BYTES = 64 * 1024 * 1024;
const PANEL_LIMITS = {
  left: { min: 220, max: 560 },
  right: { min: 280, max: 640 }
};
const SECTION_COLORS = {
  root: "#6b7785",
  document: "#b36b00",
  stack: "#c2412d",
  standards: "#0b6bcb",
  federated: "#007a8a",
  frameworks: "#b83280",
  research: "#8a6f00",
  "uk-government": "#7a3db8",
  organisations: "#007a5a",
  glossary: "#4f5bd5"
};

let bundle = null;
let corpusId = "";
let corpus = null;
let selected = "";
let inspected = "";
let currentView = "reader";
let routeMap = new Map();
let outgoing = new Map();
let incoming = new Map();
let bySection = new Map();
let graphZoom = 1;
let graphPan = { x: 0, y: 0 };
let graphDrag = null;
let graphSuppressClick = false;
let graphEdges = [];
let graphHotspotFrame = 0;
let graphResizeFrame = 0;
let graphLayoutSize = { width: 0, height: 0 };
let visibleTypes = new Set();
let graphStackMembers = new Map();
let highlightedGraphId = "";
let expandedStackKey = "";
let focusedEdgeKey = "";
let labelPhase = 0;
let labelLayerCount = 1;
let resizeDrag = null;
let leftCollapsed = false;
let rightCollapsed = false;
let pins = new Set(JSON.parse(localStorage.getItem(PIN_STORAGE_KEY) || "[]"));
let bundleHistory = loadBundleHistory();
let bundleRegistry = [];
let bundleSuggestionsOpen = false;

const el = {
  workspace: document.getElementById("workspace"),
  appTitle: document.getElementById("appTitle"),
  bundleMeta: document.getElementById("bundleMeta"),
  bundleForm: document.getElementById("bundleForm"),
  bundleUrl: document.getElementById("bundleUrl"),
  bundleSuggestions: document.getElementById("bundleSuggestions"),
  bundleFile: document.getElementById("bundleFile"),
  corpusSelect: document.getElementById("corpusSelect"),
  search: document.getElementById("search"),
  typeFilters: document.getElementById("typeFilters"),
  pageList: document.getElementById("pageList"),
  stage: document.querySelector(".stage"),
  crumbs: document.getElementById("crumbs"),
  status: document.getElementById("status"),
  toggleLeft: document.getElementById("toggleLeft"),
  toggleRight: document.getElementById("toggleRight"),
  copyRoute: document.getElementById("copyRoute"),
  pinPage: document.getElementById("pinPage"),
  zoomOut: document.getElementById("zoomOut"),
  zoomReset: document.getElementById("zoomReset"),
  zoomIn: document.getElementById("zoomIn"),
  graphHint: document.getElementById("graphHint"),
  graphCanvas: document.getElementById("graphCanvas"),
  graph: document.getElementById("graph"),
  graphHotspots: document.getElementById("graphHotspots"),
  panel: document.getElementById("panel"),
  edgePanel: document.getElementById("edgePanel"),
  pinsPanel: document.getElementById("pinsPanel"),
  detail: document.getElementById("detail")
};

function esc(value) {
  return String(value ?? "").replace(/[&<>"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[char]));
}

function attr(value) {
  return esc(value).replace(/'/g, "&#39;");
}

function isHttpHref(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function color(section) {
  return SECTION_COLORS[section] || "#5f6f7f";
}

function nodeType(node) {
  return node?.type || "Node";
}

function typeList() {
  if (!corpus) return [];
  return [...new Set(Object.values(corpus.nodes).map(node => nodeType(node)))]
    .sort((a, b) => a.localeCompare(b));
}

function resetTypeFilters() {
  visibleTypes = new Set(typeList());
}

function typeCounts() {
  const counts = new Map();
  for (const node of Object.values(corpus.nodes)) {
    const type = nodeType(node);
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  return counts;
}

function typeColor(type) {
  const match = Object.values(corpus.nodes).find(node => nodeType(node) === type);
  return color(match?.section || "root");
}

function nodeVisibleByType(id, keepSelected = true) {
  if (!corpus?.nodes[id]) return false;
  if (keepSelected && id === selected) return true;
  return visibleTypes.has(nodeType(corpus.nodes[id]));
}

function renderTypeFilters() {
  if (!corpus || !el.typeFilters) return;
  const counts = typeCounts();
  const types = typeList();
  el.typeFilters.innerHTML =
    `<div class="typeFilterHeader"><span>Show types</span><button type="button" data-type-filter-all>All</button></div>` +
    `<div class="typeFilterGrid">${types.map(type => {
      const active = visibleTypes.has(type);
      return `<button type="button" class="typeToggle ${active ? "active" : ""}" aria-pressed="${active ? "true" : "false"}" data-type-toggle="${attr(type)}">` +
        `<span class="typeDot" style="background:${typeColor(type)}"></span>` +
        `<span class="typeName">${esc(type)}</span>` +
        `<span class="typeCount">${counts.get(type) || 0}</span>` +
        `</button>`;
    }).join("")}</div>`;
  el.typeFilters.querySelector("[data-type-filter-all]")?.addEventListener("click", () => {
    resetTypeFilters();
    highlightedGraphId = "";
    labelPhase = 0;
    renderAll();
  });
  el.typeFilters.querySelectorAll("[data-type-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const type = button.dataset.typeToggle;
      if (visibleTypes.has(type) && visibleTypes.size > 1) visibleTypes.delete(type);
      else visibleTypes.add(type);
      highlightedGraphId = "";
      labelPhase = 0;
      renderAll();
    });
  });
}

function showStatus(message) {
  el.status.hidden = !message;
  el.status.textContent = message || "";
}

function sleepMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function retryUrl(url, attempt) {
  if (!attempt) return url;
  const next = new URL(url, location.href);
  next.searchParams.set("retry", `${Date.now()}-${attempt}`);
  return next.toString();
}

function retryableStatus(status) {
  return [408, 425, 429, 500, 502, 503, 504].includes(status);
}

class ResponseTooLargeError extends Error {}

async function loadJson(url) {
  let lastError = "";
  for (let attempt = 0; attempt <= JSON_RETRIES; attempt++) {
    const requestUrl = retryUrl(url, attempt);
    try {
      const response = await fetch(requestUrl, {
        cache: attempt ? "no-store" : "default",
        signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined
      });
      if (response.ok) {
        const contentLength = response.headers.get("content-length");
        if (contentLength && Number(contentLength) > MAX_JSON_BYTES) {
          // Too-large responses must never be retried: throw a distinguishable
          // error and rethrow it immediately from the catch block below.
          throw new ResponseTooLargeError(`${url}: response too large (${Number(contentLength)} bytes, limit ${MAX_JSON_BYTES})`);
        }
        return response.json();
      }
      lastError = `${url}: ${response.status}`;
      if (!retryableStatus(response.status)) throw new Error(lastError);
    } catch (error) {
      if (error instanceof ResponseTooLargeError) throw error;
      lastError = error.message || String(error);
      if (attempt === JSON_RETRIES) throw new Error(lastError);
    }
    await sleepMs(300 * Math.pow(2, attempt));
  }
  throw new Error(lastError || `${url}: failed to load`);
}

function loadBundleHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BUNDLE_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(item => item && item.url).slice(0, 20) : [];
  } catch (_error) {
    return [];
  }
}

function saveBundleHistory() {
  try {
    localStorage.setItem(BUNDLE_HISTORY_KEY, JSON.stringify(bundleHistory.slice(0, 20)));
  } catch (_error) {
    // Ignore storage failures (quota, private browsing).
  }
}

function bundleTitle(raw) {
  return raw?.meta?.title || raw?.title || "OKF bundle";
}

function rememberBundleUrl(url, raw) {
  if (!url || url.startsWith("file:")) return;
  const existing = bundleHistory.filter(item => item.url !== url);
  bundleHistory = [{
    url,
    label: bundleTitle(raw),
    description: `Loaded ${new Date().toLocaleString()}`,
    kind: "history",
    lastLoaded: new Date().toISOString()
  }, ...existing].slice(0, 20);
  saveBundleHistory();
  renderBundleSuggestions();
}

function registryCandidates() {
  return bundleRegistry.map(item => ({
    url: item.url,
    label: item.label || item.title || item.id || item.url,
    description: item.description || item.kind || "Registry bundle",
    kind: "registry"
  })).filter(item => item.url);
}

function bundleCandidates() {
  const seen = new Set();
  const merged = [];
  for (const item of [...registryCandidates(), ...bundleHistory]) {
    if (!item.url || seen.has(item.url)) continue;
    seen.add(item.url);
    merged.push(item);
  }
  return merged;
}

function candidateMatches(item, term) {
  if (!term) return true;
  return [item.url, item.label, item.description, item.kind].join(" ").toLowerCase().includes(term);
}

function hideBundleSuggestions() {
  bundleSuggestionsOpen = false;
  el.bundleUrl.setAttribute("aria-expanded", "false");
  el.bundleSuggestions.hidden = true;
}

function renderBundleSuggestions() {
  if (!bundleSuggestionsOpen) return;
  const term = el.bundleUrl.value.trim().toLowerCase();
  const matches = bundleCandidates().filter(item => candidateMatches(item, term)).slice(0, 10);
  if (!matches.length) {
    el.bundleSuggestions.innerHTML = "";
    el.bundleSuggestions.hidden = true;
    el.bundleUrl.setAttribute("aria-expanded", "false");
    return;
  }
  el.bundleSuggestions.innerHTML = matches.map(item => (
    `<button class="bundleSuggestion" type="button" role="option" data-bundle-url="${attr(item.url)}">` +
    `<strong>${esc(item.label || item.url)}</strong>` +
    `<span>${esc(item.url)}</span>` +
    `<small>${esc(item.kind === "history" ? `Recent - ${item.description || ""}` : item.description || "Registry bundle")}</small>` +
    `</button>`
  )).join("");
  el.bundleSuggestions.hidden = false;
  el.bundleUrl.setAttribute("aria-expanded", "true");
  el.bundleSuggestions.querySelectorAll("[data-bundle-url]").forEach(button => {
    button.addEventListener("mousedown", event => event.preventDefault());
    button.addEventListener("click", () => {
      const url = button.dataset.bundleUrl;
      el.bundleUrl.value = url;
      hideBundleSuggestions();
      loadBundleFromUrl(url, true);
    });
  });
}

function showBundleSuggestions() {
  bundleSuggestionsOpen = true;
  renderBundleSuggestions();
}

async function loadBundleRegistry() {
  try {
    const raw = await loadJson(DEFAULT_REGISTRY);
    bundleRegistry = Array.isArray(raw.bundles) ? raw.bundles : [];
    renderBundleSuggestions();
  } catch (_error) {
    bundleRegistry = [];
  }
}

function bundleUrlFromLocation() {
  const params = new URLSearchParams(location.search);
  return params.get("bundle") || DEFAULT_BUNDLE;
}

function validatedBundleUrl(url) {
  const resolved = new URL(url, location.href);
  // Untrusted ?bundle= URLs: allow same-origin paths, otherwise require https.
  if (resolved.origin !== location.origin && resolved.protocol !== "https:") {
    throw new Error("Only https:// bundle URLs (or same-origin paths) can be loaded.");
  }
  return resolved.toString();
}

function viewFromLocation() {
  const view = new URLSearchParams(location.search).get("view");
  return VIEW_IDS.has(view) ? view : "reader";
}

function edgeSource(edge) {
  return Array.isArray(edge) ? edge[0] : edge.source;
}

function edgeTarget(edge) {
  return Array.isArray(edge) ? edge[1] : edge.target;
}

function edgeKind(edge) {
  return Array.isArray(edge) ? (edge[2] || "links to") : (edge.kind || "links to");
}

function edgeLabel(edge) {
  return Array.isArray(edge) ? (edge[3] || edgeKind(edge)) : (edge.label || edgeKind(edge));
}

function edgeKey(edge) {
  return [edgeSource(edge), edgeTarget(edge), edgeKind(edge), edgeLabel(edge)].join("\u0001");
}

function routeFor(id) {
  if (!corpus || !corpus.nodes[id]) return "index";
  const node = corpus.nodes[id];
  if (id === corpus.root) return "index";
  return (node.route_aliases && node.route_aliases[0]) || id.replace(/\.md$/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

function routeHref(id) {
  const params = new URLSearchParams(location.search);
  params.set("corpus", corpusId);
  if (currentView === "reader") params.delete("view");
  else params.set("view", currentView);
  const query = params.toString();
  return `${query ? `?${query}` : ""}#${encodeURIComponent(routeFor(id))}`;
}

function routeUrlFor(id = selected, view = currentView) {
  const url = new URL(location.href);
  url.searchParams.set("corpus", corpusId);
  if (view === "reader") url.searchParams.delete("view");
  else url.searchParams.set("view", view);
  url.hash = routeFor(id);
  return url.toString();
}

function idFromHash() {
  const raw = location.hash.slice(1);
  let decoded;
  try {
    decoded = decodeURIComponent(raw);
  } catch (_error) {
    decoded = raw;
  }
  const hash = decoded.trim().toLowerCase();
  return hash ? routeMap.get(hash) || "" : "";
}

function updateLocation(push) {
  const url = new URL(location.href);
  url.searchParams.set("corpus", corpusId);
  if (currentView === "reader") url.searchParams.delete("view");
  else url.searchParams.set("view", currentView);
  url.hash = routeFor(selected);
  const state = { corpusId, selected };
  if (push) history.pushState(state, "", url);
  else history.replaceState(state, "", url);
}

function normaliseBundle(raw) {
  if (raw.corpora) return raw;
  if (raw.nodes && raw.edges) {
    return {
      schema: "legacy-single-graph",
      kind: "okf-bundle",
      meta: {
        title: "OKF Explorer",
        default_corpus: "default",
        corpus_order: ["default"]
      },
      corpora: {
        default: {
          id: "default",
          label: "Default",
          title: "OKF Bundle",
          subtitle: "",
          root: "index.md",
          source_root: ".",
          markdown_url: "index.md",
          sections: [...new Set(Object.values(raw.nodes).map(node => node.section || "root"))],
          nodes: Object.fromEntries(Object.entries(raw.nodes).map(([id, node]) => [id, { id, source: id, ...node }])),
          edges: raw.edges.map(edge => ({ source: edge[0], target: edge[1], kind: "links to", label: "links to" }))
        }
      }
    };
  }
  throw new Error("Bundle does not contain OKF corpora or graph data.");
}

function setBundle(raw, sourceLabel) {
  bundle = normaliseBundle(raw);
  const order = bundle.meta?.corpus_order || Object.keys(bundle.corpora);
  const requested = new URLSearchParams(location.search).get("corpus");
  corpusId = requested && bundle.corpora[requested] ? requested : bundle.meta?.default_corpus || order[0];
  if (!bundle.corpora[corpusId]) corpusId = order[0];
  el.appTitle.textContent = bundle.meta?.title || "OKF Explorer";
  el.bundleMeta.textContent = sourceLabel || "";
  renderCorpusOptions();
  setCorpus(corpusId, false);
}

function renderCorpusOptions() {
  const order = bundle.meta?.corpus_order || Object.keys(bundle.corpora);
  el.corpusSelect.innerHTML = order.map(id => {
    const item = bundle.corpora[id];
    return `<option value="${attr(id)}">${esc(item.label || item.title || id)}</option>`;
  }).join("");
  el.corpusSelect.value = corpusId;
}

function setCorpus(id, push) {
  corpusId = id;
  corpus = bundle.corpora[id];
  routeMap = new Map();
  outgoing = new Map();
  incoming = new Map();
  bySection = new Map();
  for (const pageId of Object.keys(corpus.nodes)) {
    const node = corpus.nodes[pageId];
    outgoing.set(pageId, []);
    incoming.set(pageId, []);
    const section = node.section || "root";
    if (!bySection.has(section)) bySection.set(section, []);
    bySection.get(section).push(pageId);
    for (const alias of node.route_aliases || []) routeMap.set(String(alias).toLowerCase(), pageId);
    routeMap.set(pageId.toLowerCase(), pageId);
    routeMap.set(pageId.replace(/\.md$/, "").toLowerCase(), pageId);
  }
  for (const edge of corpus.edges || []) {
    const source = edgeSource(edge);
    const target = edgeTarget(edge);
    if (outgoing.has(source) && incoming.has(target)) {
      outgoing.get(source).push(edge);
      incoming.get(target).push(edge);
    }
  }
  resetTypeFilters();
  selected = idFromHash() || corpus.root || Object.keys(corpus.nodes)[0] || "";
  inspected = selected;
  currentView = viewFromLocation();
  focusedEdgeKey = "";
  highlightedGraphId = "";
  expandedStackKey = "";
  graphStackMembers = new Map();
  labelPhase = 0;
  labelLayerCount = 1;
  graphPan = { x: 0, y: 0 };
  graphZoom = 1;
  renderAll();
  updateLocation(push);
}

function selectPage(id, push = true) {
  if (!corpus.nodes[id]) return;
  selected = id;
  inspected = id;
  focusedEdgeKey = "";
  highlightedGraphId = "";
  expandedStackKey = "";
  graphStackMembers = new Map();
  labelPhase = 0;
  labelLayerCount = 1;
  graphPan = { x: 0, y: 0 };
  graphZoom = 1;
  renderAll();
  updateLocation(push);
}

function inspectPage(id) {
  if (!corpus.nodes[id]) return;
  const wasRightCollapsed = rightCollapsed;
  inspected = id;
  rightCollapsed = false;
  renderDetail();
  renderChrome();
  if (currentView === "graph") scheduleGraphLayoutRefresh(wasRightCollapsed);
}

function openInGraph(id, push = true) {
  currentView = "graph";
  selectPage(id, push);
}

function openGraphNode(id) {
  const stackMembers = graphStackMembers.get(id) || [];
  if (stackMembers.length > 1) {
    expandedStackKey = stackKeyForNode(id);
    highlightedGraphId = id;
    focusedEdgeKey = "";
    labelPhase = 0;
    renderGraph();
    renderDetail();
    renderChrome();
    return;
  }
  openInGraph(id);
}

function setView(view, push = true) {
  if (!VIEW_IDS.has(view)) return;
  currentView = view;
  renderPanel();
  renderChrome();
  updateLocation(push);
}

function nodeMatches(id, term) {
  if (!term) return true;
  const node = corpus.nodes[id];
  return [
    id,
    node.title,
    node.type,
    node.description,
    node.aliases,
    node.tags,
    node.resource,
    node.source
  ].join(" ").toLowerCase().includes(term);
}

function renderList() {
  const term = el.search.value.trim().toLowerCase();
  const sections = corpus.sections || [...bySection.keys()];
  const html = [];
  for (const section of sections) {
    const ids = (bySection.get(section) || [])
      .filter(id => nodeVisibleByType(id, true))
      .filter(id => nodeMatches(id, term))
      .sort((a, b) => corpus.nodes[a].title.localeCompare(corpus.nodes[b].title));
    if (!ids.length) continue;
    html.push(`<div class="group">${esc(section)}</div>`);
    for (const id of ids) {
      const node = corpus.nodes[id];
      html.push(
        `<button class="item ${id === selected ? "active" : ""}" data-page="${attr(id)}">` +
        `<span class="dot" style="background:${color(node.section)}"></span>` +
        `<span><span class="itemTitle">${esc(node.title)}</span><span class="itemMeta">${esc(node.type)} - ${esc(id)}</span></span>` +
        `</button>`
      );
    }
  }
  el.pageList.innerHTML = html.join("");
  el.pageList.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => selectPage(button.dataset.page));
    button.addEventListener("dblclick", event => {
      event.preventDefault();
      openInGraph(button.dataset.page);
    });
  });
}

function sourceHref(href, baseId) {
  if (!href) return "";
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) return href;
  const clean = href.split("#", 1)[0].split("?", 1)[0];
  const baseParts = baseId.split("/");
  baseParts.pop();
  for (const part of clean.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") baseParts.pop();
    else baseParts.push(part);
  }
  return baseParts.join("/");
}

function resolveInternalLink(href, baseId) {
  if (!href || href.startsWith("#") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) return "";
  const clean = sourceHref(href, baseId);
  if (corpus.nodes[clean]) return clean;
  if (corpus.nodes[`${clean}/index.md`]) return `${clean}/index.md`;
  return "";
}

function inlineMarkdown(text, baseId) {
  const codes = [];
  const start = "\u0001";
  const end = "\u0002";
  let html = String(text || "").replace(/`([^`]+)`/g, (_match, code) => {
    codes.push(code);
    return `${start}${codes.length - 1}${end}`;
  });
  html = esc(html);
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, label, href) => {
    const url = sourceHref(href, baseId);
    // Bundle content is untrusted: only render http(s) or bundle-relative image sources.
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) && !isHttpHref(url)) return label;
    return `<img src="${attr(url)}" alt="${attr(label)}">`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const target = resolveInternalLink(href, baseId);
    if (target) return `<a href="${attr(routeHref(target))}" data-page="${attr(target)}">${label}</a>`;
    const url = href;
    const external = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
    // Block javascript:, data:, and other non-http(s)/mailto schemes from untrusted bundles.
    if (external && !isHttpHref(url) && !/^mailto:/i.test(url)) return label;
    return `<a href="${attr(url)}"${external ? " target=\"_blank\" rel=\"noopener\"" : ""}>${label}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  html = html.replace(new RegExp(`${start}(\\d+)${end}`, "g"), (_match, index) => `<code>${esc(codes[Number(index)])}</code>`);
  return html;
}

function isTableDelimiter(line) {
  return /\|/.test(line || "") && /^[\s|:-]+$/.test(line || "") && /-/.test(line || "");
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim());
}

function renderTable(rows, baseId) {
  const headers = splitTableRow(rows[0]);
  const body = rows.slice(2);
  return `<div class="tableWrap"><table><thead><tr>${headers.map(header => `<th>${inlineMarkdown(header, baseId)}</th>`).join("")}</tr></thead>` +
    `<tbody>${body.map(row => {
      const cells = splitTableRow(row);
      return `<tr>${headers.map((_header, index) => `<td>${inlineMarkdown(cells[index] || "", baseId)}</td>`).join("")}</tr>`;
    }).join("")}</tbody></table></div>`;
}

function markdown(text, baseId) {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0;
  let inCode = false;
  let code = [];

  function closeCode() {
    out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
    code = [];
    inCode = false;
  }

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      if (inCode) closeCode();
      else {
        inCode = true;
        code = [];
      }
      i++;
      continue;
    }
    if (inCode) {
      code.push(line);
      i++;
      continue;
    }
    if (/\|/.test(line) && isTableDelimiter(lines[i + 1])) {
      const tableRows = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) {
        tableRows.push(lines[i]);
        i++;
      }
      out.push(renderTable(tableRows, baseId));
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inlineMarkdown(heading[2], baseId)}</h${level}>`);
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(lines[i].replace(/^\s*[-*]\s+/, ""), baseId)}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(lines[i].replace(/^\s*\d+\.\s+/, ""), baseId)}</li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const paragraph = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*(```|#{1,3}\s|[-*]\s+|\d+\.\s+)/.test(lines[i]) &&
      !(/\|/.test(lines[i]) && isTableDelimiter(lines[i + 1]))
    ) {
      paragraph.push(lines[i]);
      i++;
    }
    out.push(`<p>${inlineMarkdown(paragraph.join(" "), baseId)}</p>`);
  }
  if (inCode) closeCode();
  return out.join("\n");
}

function bindPageLinks(root) {
  root.querySelectorAll("[data-page]").forEach(link => {
    link.addEventListener("click", event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      selectPage(link.dataset.page);
    });
  });
}

function renderReader() {
  const node = corpus.nodes[selected];
  el.panel.className = "panel md";
  el.panel.innerHTML = `<h1>${esc(node.title)}</h1><p class="description">${esc(node.description)}</p>${markdown(node.body, selected)}`;
  bindPageLinks(el.panel);
}

function edgeOther(edge, id) {
  const source = edgeSource(edge);
  const target = edgeTarget(edge);
  return source === id ? target : source;
}

function renderLinks() {
  const outs = outgoing.get(selected) || [];
  const ins = incoming.get(selected) || [];
  const block = (title, edges, direction) => {
    const buttons = edges.map(edge => {
      const id = direction === "out" ? edgeTarget(edge) : edgeSource(edge);
      const node = corpus.nodes[id];
      return `<button data-page="${attr(id)}">${esc(node.title)}<span class="itemMeta">${esc(edgeKind(edge))} - ${esc(id)}</span></button>`;
    }).join("") || `<p class="description">None</p>`;
    return `<section class="linkBlock"><h3>${esc(title)}</h3>${buttons}</section>`;
  };
  el.panel.className = "panel";
  el.panel.innerHTML = `<div class="linkGrid">${block("Outgoing", outs, "out")}${block("Incoming", ins, "in")}</div>`;
  bindPageLinks(el.panel);
}

function parseTimestamp(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}

function shortDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toISOString().slice(0, 10);
}

function bindInspectPageControls(root, doubleClickAction) {
  root.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      inspectPage(button.dataset.page);
    });
    button.addEventListener("dblclick", event => {
      event.preventDefault();
      doubleClickAction(button.dataset.page);
    });
  });
}

function renderTimeline() {
  const ids = scopedNeighbourIds(120);
  const rows = ids
    .map(id => ({ id, node: corpus.nodes[id], time: parseTimestamp(corpus.nodes[id].timestamp) }))
    .filter(item => item.node.timestamp)
    .sort((a, b) => a.time - b.time || a.node.title.localeCompare(b.node.title));
  el.panel.className = "panel timelinePanel";
  if (!rows.length) {
    el.panel.innerHTML = `<p class="description">No timestamped nodes in the current selection.</p>`;
    return;
  }

  const width = Math.max(760, Math.min(1320, (el.stage.clientWidth || 980) - 48));
  const rowHeight = 56;
  const top = 58;
  const bottom = 54;
  const height = Math.max(360, top + rows.length * rowHeight + bottom);
  const left = 76;
  const right = 260;
  const minTime = Math.min(...rows.map(item => item.time));
  const maxTime = Math.max(...rows.map(item => item.time));
  const span = Math.max(1, maxTime - minTime);
  const laneX = item => rows.length > 1 && minTime !== maxTime
    ? left + ((item.time - minTime) / span) * (width - left - right)
    : Math.round(width * .43);
  const positions = new Map();
  rows.forEach((item, index) => {
    positions.set(item.id, {
      x: laneX(item),
      y: top + index * rowHeight
    });
  });
  const visible = new Set(rows.map(item => item.id));
  const edges = (corpus.edges || []).filter(edge => visible.has(edgeSource(edge)) && visible.has(edgeTarget(edge)));
  const ticks = [...new Set(rows.map(item => shortDate(item.node.timestamp)))].slice(0, 8);
  const tickHtml = ticks.map(tick => {
    const match = rows.find(item => shortDate(item.node.timestamp) === tick);
    const x = match ? positions.get(match.id).x : left;
    return `<g><line class="timelineTick" x1="${x}" x2="${x}" y1="28" y2="${height - 28}"></line><text class="timelineTickLabel" x="${x}" y="${height - 18}" text-anchor="middle">${esc(tick)}</text></g>`;
  }).join("");
  const edgeHtml = edges.map(edge => {
    const source = positions.get(edgeSource(edge));
    const target = positions.get(edgeTarget(edge));
    if (!source || !target) return "";
    return `<path class="timelineEdge" d="M${source.x} ${source.y} C${(source.x + target.x) / 2} ${source.y}, ${(source.x + target.x) / 2} ${target.y}, ${target.x} ${target.y}"></path>`;
  }).join("");
  const nodeHtml = rows.map(item => {
    const pos = positions.get(item.id);
    const active = item.id === selected;
    return `<button class="timelineNode ${active ? "active" : ""}" data-page="${attr(item.id)}" style="left:${pos.x + 18}px;top:${pos.y - 23}px;">` +
      `<span class="timelineNodeTitle">${esc(item.node.title)}</span>` +
      `<span class="itemMeta">${esc(nodeType(item.node))} - ${esc(item.id)}</span>` +
      `</button>`;
  }).join("");
  const dotHtml = rows.map(item => {
    const pos = positions.get(item.id);
    const active = item.id === selected;
    return `<circle class="timelineDot ${active ? "active" : ""}" cx="${pos.x}" cy="${pos.y}" r="${active ? 10 : 7}" fill="${color(item.node.section)}"><title>${esc(item.node.title)}</title></circle>`;
  }).join("");
  el.panel.innerHTML =
    `<div class="timelineSummary">Showing ${rows.length} timestamped nodes around ${esc(corpus.nodes[selected].title)}. Single-click to inspect; double-click to make a node the timeline centre.</div>` +
    `<div class="timelineGraph" style="width:${width}px;height:${height}px;">` +
    `<svg class="timelineSvg" viewBox="0 0 ${width} ${height}" aria-label="Timeline graph">` +
    `<line class="timelineAxis" x1="${left}" x2="${width - right + 24}" y1="${height - 36}" y2="${height - 36}"></line>` +
    `${tickHtml}${edgeHtml}${dotHtml}</svg>${nodeHtml}</div>`;
  bindInspectPageControls(el.panel, id => selectPage(id));
}

function scopedNeighbourIds(limit = 80) {
  const ids = new Set([selected]);
  const neighbours = [];
  for (const edge of outgoing.get(selected) || []) neighbours.push(edgeTarget(edge));
  for (const edge of incoming.get(selected) || []) neighbours.push(edgeSource(edge));
  for (const id of neighbours) {
    if (nodeVisibleByType(id, true)) ids.add(id);
  }
  if (ids.size < 2) {
    for (const id of Object.keys(corpus.nodes)) {
      if (nodeVisibleByType(id, true)) ids.add(id);
      if (ids.size >= limit) break;
    }
  }
  return [...ids].slice(0, limit);
}

function isStackableResourceNode(id) {
  const node = corpus.nodes[id];
  if (!node) return false;
  const type = nodeType(node).toLowerCase();
  return Boolean(node.resource) || type.includes("resource") || type.includes("source");
}

function stackKeyForNode(id) {
  if (!isStackableResourceNode(id)) return "";
  const node = corpus.nodes[id];
  return `resource:${nodeType(node)}:${node.section || "root"}`;
}

function buildGraphModel() {
  const rawIds = scopedNeighbourIds(80);
  const groups = new Map();
  graphStackMembers = new Map();
  for (const id of rawIds) {
    if (id === selected) continue;
    const key = stackKeyForNode(id);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(id);
  }

  const hidden = new Set();
  for (const [key, members] of groups) {
    if (members.length < 4 || expandedStackKey === key) continue;
    const ordered = members.sort((a, b) => corpus.nodes[a].title.localeCompare(corpus.nodes[b].title));
    const representative = ordered[0];
    graphStackMembers.set(representative, ordered);
    for (const id of ordered.slice(1)) hidden.add(id);
  }

  return {
    rawIds,
    ids: rawIds.filter(id => !hidden.has(id))
  };
}

function graphIds() {
  return buildGraphModel().ids;
}

function placeArc(ids, positions, cx, cy, radius, start, end) {
  const step = ids.length > 1 ? (end - start) / (ids.length - 1) : 0;
  ids.forEach((id, index) => {
    const angle = ids.length > 1 ? start + step * index : (start + end) / 2;
    positions[id] = { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
}

function graphPositions(ids, width, height) {
  const positions = {};
  const cx = width / 2;
  const cy = height / 2;
  positions[selected] = { x: cx, y: cy };
  const other = ids.filter(id => id !== selected);
  const outgoingIds = other.filter(id => (outgoing.get(selected) || []).some(edge => edgeTarget(edge) === id));
  const incomingIds = other.filter(id => (incoming.get(selected) || []).some(edge => edgeSource(edge) === id));
  const both = outgoingIds.filter(id => incomingIds.includes(id));
  const incomingOnly = incomingIds.filter(id => !both.includes(id));
  const outgoingOnly = outgoingIds.filter(id => !both.includes(id));
  const rest = other.filter(id => !incomingIds.includes(id) && !outgoingIds.includes(id));
  const radius = Math.min(width, height) * .34;
  placeArc(incomingOnly, positions, cx, cy, radius, Math.PI * .72, Math.PI * 1.28);
  placeArc(outgoingOnly, positions, cx, cy, radius, -Math.PI * .28, Math.PI * .28);
  placeArc(both, positions, cx, cy, radius * .72, -Math.PI * .78, -Math.PI * .22);
  placeArc(rest, positions, cx, cy, radius, Math.PI * 1.45, Math.PI * 1.9);
  return positions;
}

function graphViewBoxParts(width, height) {
  const zoom = Math.max(.75, Math.min(3, graphZoom));
  const viewW = width / zoom;
  const viewH = height / zoom;
  return {
    x: (width - viewW) / 2 + graphPan.x,
    y: (height - viewH) / 2 + graphPan.y,
    w: viewW,
    h: viewH
  };
}

function graphViewBox(width, height) {
  const box = graphViewBoxParts(width, height);
  return `${box.x} ${box.y} ${box.w} ${box.h}`;
}

function relationEdges(ids) {
  const visible = new Set(ids);
  const replacement = new Map();
  for (const [representative, members] of graphStackMembers) {
    for (const id of members) replacement.set(id, representative);
  }
  const edges = new Map();
  for (const edge of corpus.edges || []) {
    const originalSource = edgeSource(edge);
    const originalTarget = edgeTarget(edge);
    const source = replacement.get(originalSource) || originalSource;
    const target = replacement.get(originalTarget) || originalTarget;
    if (source === target) continue;
    if (!visible.has(source) || !visible.has(target)) continue;
    if (source !== selected && target !== selected) continue;
    const adjusted = {
      source,
      target,
      kind: edgeKind(edge),
      label: edgeLabel(edge)
    };
    edges.set(edgeKey(adjusted), adjusted);
  }
  return [...edges.values()];
}

function boxOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function nodeBox(pos, radius) {
  return { x: pos.x - radius - 2, y: pos.y - radius - 2, w: radius * 2 + 4, h: radius * 2 + 4 };
}

function labelBox(id, pos, radius) {
  const title = corpus.nodes[id].title || id;
  const w = Math.min(270, Math.max(54, title.slice(0, 52).length * 6.5));
  return { x: pos.x + radius + 7, y: pos.y - 10, w, h: 17 };
}

function labelLayout(ids, positions) {
  const blockers = ids
    .map(id => {
      const radius = id === selected ? 13 : 8;
      return positions[id] ? nodeBox(positions[id], radius) : null;
    })
    .filter(Boolean);
  const visible = new Map();
  const selectedRadius = 13;
  if (positions[selected]) {
    const box = labelBox(selected, positions[selected], selectedRadius);
    visible.set(selected, box);
    blockers.push(box);
  }

  const candidates = ids
    .filter(id => id !== selected && positions[id])
    .map(id => ({ id, box: labelBox(id, positions[id], 8) }))
    .filter(item => !blockers.some(box => boxOverlap(item.box, box)));
  const stable = [];
  const contested = [];
  for (const item of candidates) {
    const conflict = candidates.some(other => other.id !== item.id && boxOverlap(item.box, other.box));
    if (conflict) contested.push(item);
    else stable.push(item);
  }
  for (const item of stable) visible.set(item.id, item.box);

  const layers = [];
  for (const item of contested.sort((a, b) => corpus.nodes[a.id].title.localeCompare(corpus.nodes[b.id].title))) {
    let placed = false;
    for (const layer of layers) {
      if (!layer.some(other => boxOverlap(item.box, other.box))) {
        layer.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) layers.push([item]);
  }
  labelLayerCount = Math.max(1, layers.length);
  const activeLayer = layers.length ? layers[labelPhase % labelLayerCount] : [];
  for (const item of activeLayer) visible.set(item.id, item.box);
  return visible;
}

function edgePath(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / length;
  const uy = dy / length;
  const sx = a.x + ux * 15;
  const sy = a.y + uy * 15;
  const tx = b.x - ux * 17;
  const ty = b.y - uy * 17;
  const bend = 18;
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const cx = mx - uy * bend;
  const cy = my + ux * bend;
  const lx = .25 * sx + .5 * cx + .25 * tx;
  const ly = .25 * sy + .5 * cy + .25 * ty - 6;
  return { d: `M${sx} ${sy} Q${cx} ${cy} ${tx} ${ty}`, lx, ly };
}

function hotspotStyle(rect, canvasRect, padX, padY) {
  const left = Math.max(0, rect.left - canvasRect.left - padX);
  const top = Math.max(0, rect.top - canvasRect.top - padY);
  const width = Math.max(12, rect.width + padX * 2);
  const height = Math.max(12, rect.height + padY * 2);
  return `left:${left}px;top:${top}px;width:${width}px;height:${height}px;`;
}

function renderGraphHotspots(ids) {
  const canvasRect = el.graphCanvas.getBoundingClientRect();
  const buttons = [];
  ids.forEach(id => {
    const node = [...el.graph.querySelectorAll("[data-page]")].find(item => item.dataset.page === id);
    if (!node) return;
    const title = corpus.nodes[id].title;
    const marker = node.querySelector("circle,.stackCardTop");
    const label = node.querySelector("text:not(.labelGhost):not(.stackCount)");
    if (marker) {
      buttons.push(
        `<button class="graphHotspot dotHotspot" type="button" data-page="${attr(id)}" aria-label="${attr(title)} marker" title="${attr(title)}" style="${hotspotStyle(marker.getBoundingClientRect(), canvasRect, 6, 6)}"></button>`
      );
    }
    if (label) {
      buttons.push(
        `<button class="graphHotspot labelHotspot" type="button" data-page="${attr(id)}" aria-label="${attr(title)}" title="${attr(title)}" style="${hotspotStyle(label.getBoundingClientRect(), canvasRect, 7, 5)}"></button>`
      );
    }
  });
  el.graphHotspots.innerHTML = buttons.join("");
  el.graphHotspots.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", event => {
      if (graphSuppressClick) {
        graphSuppressClick = false;
        event.preventDefault();
        return;
      }
      event.preventDefault();
      inspectPage(button.dataset.page);
    });
    button.addEventListener("dblclick", event => {
      event.preventDefault();
      openGraphNode(button.dataset.page);
    });
  });
}

function scheduleGraphHotspots(ids) {
  if (graphHotspotFrame) cancelAnimationFrame(graphHotspotFrame);
  el.graphHotspots.innerHTML = "";
  graphHotspotFrame = requestAnimationFrame(() => {
    graphHotspotFrame = requestAnimationFrame(() => {
      graphHotspotFrame = 0;
      if (currentView === "graph") renderGraphHotspots(ids);
    });
  });
}

function currentGraphLayoutSize() {
  const rect = el.graphCanvas.getBoundingClientRect();
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

function noteGraphLayoutSize() {
  graphLayoutSize = currentGraphLayoutSize();
}

function graphLayoutChanged() {
  const size = currentGraphLayoutSize();
  return Math.abs(size.width - graphLayoutSize.width) > 1 || Math.abs(size.height - graphLayoutSize.height) > 1;
}

function scheduleGraphLayoutRefresh(force = false) {
  if (currentView !== "graph") return;
  if (graphResizeFrame) cancelAnimationFrame(graphResizeFrame);
  graphResizeFrame = requestAnimationFrame(() => {
    graphResizeFrame = requestAnimationFrame(() => {
      graphResizeFrame = 0;
      if (currentView !== "graph") return;
      if (force || graphLayoutChanged()) renderGraph();
      else scheduleGraphHotspots(graphIds());
    });
  });
}

function renderGraph() {
  const model = buildGraphModel();
  const ids = model.ids;
  const edges = relationEdges(ids);
  graphEdges = edges;
  renderEdgePanel();
  const width = Math.max(760, el.graph.clientWidth || 900);
  const height = Math.max(520, el.graph.clientHeight || 640);
  const positions = graphPositions(ids, width, height);
  const labels = labelLayout(ids, positions);
  let html = `<defs><marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="#8b9bad"></path></marker><marker id="arrowFocus" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="#0b6bcb"></path></marker></defs>`;
  edges.forEach(edge => {
    const source = edgeSource(edge);
    const target = edgeTarget(edge);
    const path = edgePath(positions[source], positions[target]);
    const key = edgeKey(edge);
    const focus = focusedEdgeKey === key;
    html += `<path class="edge ${focus ? "focus" : ""}" d="${path.d}" marker-end="url(#${focus ? "arrowFocus" : "arrow"})"></path>`;
    html += `<path class="edgeHit" data-edge="${attr(key)}" d="${path.d}"><title>${esc(edgeLabel(edge))}</title></path>`;
    if (edges.length <= 18 || focus) html += `<text class="edgeLabel" x="${path.lx}" y="${path.ly}" text-anchor="middle">${esc(edgeKind(edge)).slice(0, 28)}</text>`;
  });
  ids.forEach(id => {
    const node = corpus.nodes[id];
    const pos = positions[id];
    const active = id === selected;
    const stackMembers = graphStackMembers.get(id) || [];
    const stacked = stackMembers.length > 1;
    const highlighted = Boolean(highlightedGraphId && (highlightedGraphId === id || stackMembers.includes(highlightedGraphId)));
    const radius = active ? 13 : 8;
    const label = labels.get(id);
    const hitX = label ? Math.min(pos.x - radius - 5, label.x - 4) : pos.x - radius - 5;
    const hitY = label ? Math.min(pos.y - radius - 5, label.y - 3) : pos.y - radius - 5;
    const hitW = label ? Math.max(pos.x + radius + 5, label.x + label.w + 4) - hitX : radius * 2 + 10;
    const hitH = label ? Math.max(pos.y + radius + 5, label.y + label.h + 3) - hitY : radius * 2 + 10;
    html += `<g class="node ${active ? "active" : ""} ${stacked ? "stacked" : ""} ${highlighted ? "highlighted" : ""}" data-page="${attr(id)}" pointer-events="all"><rect class="nodeHit" x="${hitX}" y="${hitY}" width="${hitW}" height="${hitH}" rx="5" fill="#fff" opacity="0.001" pointer-events="all">` +
      `</rect><title>${esc(stacked ? `${stackMembers.length} resources: ${nodeType(node)}` : node.title)}</title>`;
    if (stacked) {
      const cardW = 52;
      const cardH = 28;
      const cardX = pos.x - cardW / 2;
      const cardY = pos.y - cardH / 2;
      html += `<rect class="stackCard stackCardBack" x="${cardX + 7}" y="${cardY - 7}" width="${cardW}" height="${cardH}" rx="5"></rect>` +
        `<rect class="stackCard stackCardMid" x="${cardX + 3.5}" y="${cardY - 3.5}" width="${cardW}" height="${cardH}" rx="5"></rect>` +
        `<rect class="stackCard stackCardTop" x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="5" fill="${color(node.section)}"></rect>` +
        `<text class="stackCount" x="${pos.x}" y="${pos.y + 4}" text-anchor="middle">${stackMembers.length}</text>`;
    } else {
      html += `<circle cx="${pos.x}" cy="${pos.y}" r="${radius}" fill="${color(node.section)}"></circle>`;
    }
    if (labels.has(id)) {
      const box = labels.get(id);
      const title = stacked ? `${stackMembers.length} ${nodeType(node)} resources` : node.title;
      html += `<text x="${box.x}" y="${box.y + 13}">${esc(title).slice(0, 52)}</text>`;
    } else if (id !== selected && ids.length <= 42) {
      html += `<text class="labelGhost" x="${pos.x + radius + 7}" y="${pos.y + 4}">·</text>`;
    }
    html += `</g>`;
  });
  el.graph.setAttribute("viewBox", graphViewBox(width, height));
  el.graph.innerHTML = html;
  noteGraphLayoutSize();
  scheduleGraphHotspots(ids);
  el.graph.querySelectorAll("[data-page]").forEach(node => {
    const inspectFromGraph = event => {
      if (graphSuppressClick) {
        graphSuppressClick = false;
        event.stopPropagation();
        event.preventDefault();
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      inspectPage(node.dataset.page);
    };
    const openFromGraph = event => {
      event.stopPropagation();
      event.preventDefault();
      openGraphNode(node.dataset.page);
    };
    node.addEventListener("click", inspectFromGraph);
    node.addEventListener("dblclick", openFromGraph);
    node.querySelectorAll(".nodeHit,circle,text").forEach(part => {
      part.addEventListener("click", inspectFromGraph);
      part.addEventListener("dblclick", openFromGraph);
    });
  });
  el.graph.querySelectorAll("[data-edge]").forEach(edge => {
    edge.addEventListener("click", event => {
      if (graphSuppressClick) {
        graphSuppressClick = false;
        return;
      }
      event.preventDefault();
      focusedEdgeKey = edge.dataset.edge;
      rightCollapsed = false;
      renderGraph();
      renderDetail();
      renderChrome();
    });
  });
  el.zoomReset.textContent = `${Math.round(graphZoom * 100)}%`;
  const stackCount = [...graphStackMembers.values()].reduce((sum, members) => sum + Math.max(0, members.length - 1), 0);
  el.graphHint.textContent = `Showing ${ids.length} nodes and ${edges.length} relationships around ${corpus.nodes[selected].title}${stackCount ? `, with ${stackCount} resource nodes collapsed into stacks` : ""}. Single-click a graph node to inspect it; double-click to centre it or expand a stack.`;
}

function edgeByKey(key) {
  return (graphEdges || []).find(edge => edgeKey(edge) === key) ||
    (corpus.edges || []).find(edge => edgeKey(edge) === key) ||
    null;
}

function renderEdgePanel() {
  if (currentView !== "graph" || !graphEdges.length) {
    el.edgePanel.hidden = true;
    el.edgePanel.innerHTML = "";
    return;
  }
  el.edgePanel.hidden = false;
  el.edgePanel.innerHTML = `<h3>Relationships (${graphEdges.length})</h3><div class="edgeGrid">${graphEdges.slice(0, 80).map(edge => {
    const key = edgeKey(edge);
    const source = corpus.nodes[edgeSource(edge)];
    const target = corpus.nodes[edgeTarget(edge)];
    return `<button class="${focusedEdgeKey === key ? "active" : ""}" data-edge="${attr(key)}">` +
      `<strong>${esc(source?.title || edgeSource(edge))}</strong> ${esc(edgeKind(edge))} <strong>${esc(target?.title || edgeTarget(edge))}</strong>` +
      `</button>`;
  }).join("")}</div>`;
  el.edgePanel.querySelectorAll("[data-edge]").forEach(button => {
    button.addEventListener("click", () => {
      focusedEdgeKey = button.dataset.edge;
      const edge = edgeByKey(focusedEdgeKey);
      if (edge) inspected = edgeTarget(edge);
      rightCollapsed = false;
      renderGraph();
      renderDetail();
      renderChrome();
    });
  });
}

function pinKey(id) {
  return `${corpusId}\u0001${id}`;
}

function isPinned(id) {
  return pins.has(pinKey(id));
}

function savePins() {
  try {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify([...pins]));
  } catch (_error) {
    // Ignore storage failures (quota, private browsing).
  }
}

function togglePin(id) {
  const key = pinKey(id);
  if (pins.has(key)) pins.delete(key);
  else pins.add(key);
  savePins();
  renderPins();
  renderDetail();
  renderChrome();
}

function currentCorpusPins() {
  return [...pins]
    .map(value => {
      const [pinCorpus, id] = value.split("\u0001");
      return { corpus: pinCorpus, id };
    })
    .filter(item => item.corpus === corpusId && corpus.nodes[item.id]);
}

async function copyText(text, label = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
  } catch (_error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  showStatus(label);
  window.clearTimeout(copyText.timer);
  copyText.timer = window.setTimeout(() => showStatus(""), 1500);
}

function copyRoute(id = selected, view = currentView) {
  return copyText(routeUrlFor(id, view), "Route copied");
}

function relatedResourceNodes(id) {
  const seen = new Set();
  const add = other => {
    if (!corpus.nodes[other] || seen.has(other)) return;
    if (!nodeVisibleByType(other, true)) return;
    if (!isStackableResourceNode(other)) return;
    seen.add(other);
  };
  for (const edge of outgoing.get(id) || []) add(edgeTarget(edge));
  for (const edge of incoming.get(id) || []) add(edgeSource(edge));
  return [...seen].sort((a, b) => {
    const aNode = corpus.nodes[a];
    const bNode = corpus.nodes[b];
    return nodeType(aNode).localeCompare(nodeType(bNode)) || aNode.title.localeCompare(bNode.title);
  });
}

function highlightResourceInGraph(id, expandStack) {
  if (!corpus.nodes[id]) return;
  const key = stackKeyForNode(id);
  highlightedGraphId = id;
  focusedEdgeKey = "";
  if (expandStack && key) {
    expandedStackKey = key;
    inspected = id;
  }
  const viewChanged = currentView !== "graph";
  currentView = "graph";
  rightCollapsed = false;
  renderPanel();
  renderDetail();
  renderChrome();
  updateLocation(viewChanged);
}

function renderPins() {
  const items = currentCorpusPins();
  el.pinsPanel.hidden = !items.length;
  if (!items.length) {
    el.pinsPanel.innerHTML = "";
    return;
  }
  el.pinsPanel.innerHTML =
    `<div class="pinsHeader"><h3>Pinned</h3><button class="actionButton" data-export-pins>Copy pinned routes</button></div>` +
    `<div class="pinStack">${items.map(item => {
      const node = corpus.nodes[item.id];
      return `<span class="pin"><button data-page="${attr(item.id)}">${esc(node.title)}</button><button title="Remove pin" aria-label="Remove pin" data-remove-pin="${attr(item.id)}">×</button></span>`;
    }).join("")}</div>`;
  el.pinsPanel.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => selectPage(button.dataset.page));
  });
  el.pinsPanel.querySelectorAll("[data-remove-pin]").forEach(button => {
    button.addEventListener("click", () => togglePin(button.dataset.removePin));
  });
  const exportButton = el.pinsPanel.querySelector("[data-export-pins]");
  exportButton?.addEventListener("click", () => {
    const routes = currentCorpusPins().map(item => routeUrlFor(item.id, "reader")).join("\n");
    copyText(routes, "Pinned routes copied");
  });
}

function bindDetailActions() {
  el.detail.querySelectorAll("[data-inspect]").forEach(button => {
    button.addEventListener("click", () => inspectPage(button.dataset.inspect));
    button.addEventListener("dblclick", event => {
      event.preventDefault();
      openInGraph(button.dataset.inspect);
    });
  });
  el.detail.querySelectorAll("[data-open-reader]").forEach(button => {
    button.addEventListener("click", () => {
      currentView = "reader";
      selectPage(button.dataset.openReader);
    });
  });
  el.detail.querySelectorAll("[data-open-graph]").forEach(button => {
    button.addEventListener("click", () => openInGraph(button.dataset.openGraph));
  });
  el.detail.querySelectorAll("[data-pin]").forEach(button => {
    button.addEventListener("click", () => togglePin(button.dataset.pin));
  });
  el.detail.querySelectorAll("[data-copy-route]").forEach(button => {
    button.addEventListener("click", () => copyRoute(button.dataset.copyRoute, "reader"));
  });
  el.detail.querySelectorAll("[data-highlight-resource]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      highlightResourceInGraph(button.dataset.highlightResource, false);
    });
    button.addEventListener("dblclick", event => {
      event.preventDefault();
      highlightResourceInGraph(button.dataset.highlightResource, true);
    });
  });
}

function renderDetail() {
  const detailId = inspected && corpus.nodes[inspected] ? inspected : selected;
  const node = corpus.nodes[detailId];
  const outs = outgoing.get(detailId) || [];
  const ins = incoming.get(detailId) || [];
  const edge = focusedEdgeKey ? edgeByKey(focusedEdgeKey) : null;
  const routeAliases = (node.route_aliases || []).slice(0, 6);
  const bodyText = String(node.body || "").replace(/\s+/g, " ").trim();
  const relationBlock = edge ? (
    `<section class="linkBlock"><h3>Focused relationship</h3>` +
    `<p><button data-inspect="${attr(edgeSource(edge))}">${esc(corpus.nodes[edgeSource(edge)]?.title || edgeSource(edge))}</button></p>` +
    `<p class="description">${esc(edgeLabel(edge))}</p>` +
    `<p><button data-inspect="${attr(edgeTarget(edge))}">${esc(corpus.nodes[edgeTarget(edge)]?.title || edgeTarget(edge))}</button></p>` +
    `</section>`
  ) : "";
  const relationButtons = (title, edges, direction) => {
    const buttons = edges.slice(0, 12).map(item => {
      const id = direction === "out" ? edgeTarget(item) : edgeSource(item);
      const linked = corpus.nodes[id];
      return `<button data-inspect="${attr(id)}">${esc(linked?.title || id)}<span class="itemMeta">${esc(edgeKind(item))} - ${esc(id)}</span></button>`;
    }).join("") || `<p class="description">None</p>`;
    return `<section><h3>${esc(title)}</h3><div class="miniList">${buttons}</div></section>`;
  };
  const resourceIds = relatedResourceNodes(detailId);
  const resourceBlock = resourceIds.length ? (
    `<section><h3>Resources in graph</h3><div class="miniList resourceList">` +
    resourceIds.map(id => {
      const linked = corpus.nodes[id];
      const active = highlightedGraphId === id;
      const stackable = stackKeyForNode(id);
      return `<button class="resourceButton ${active ? "active" : ""}" data-highlight-resource="${attr(id)}">` +
        `${esc(linked.title)}<span class="itemMeta">${esc(nodeType(linked))}${stackable ? " - stackable" : ""} - ${esc(linked.resource || id)}</span>` +
        `</button>`;
    }).join("") +
    `</div></section>`
  ) : "";
  el.detail.innerHTML =
    `<span class="badge">${esc(node.type || "Node")}</span>` +
    `<h2>${esc(node.title)}</h2>` +
    `<div class="path">${esc(detailId)}</div>` +
    `<p class="description">${esc(node.description || "No description supplied.")}</p>` +
    `<div class="detailActions">` +
    `<button class="actionButton" data-open-reader="${attr(detailId)}">Open</button>` +
    `<button class="actionButton" data-open-graph="${attr(detailId)}">Graph</button>` +
    `<button class="actionButton ${isPinned(detailId) ? "active" : ""}" data-pin="${attr(detailId)}">${isPinned(detailId) ? "Pinned" : "Pin"}</button>` +
    `<button class="actionButton" data-copy-route="${attr(detailId)}">Copy route</button>` +
    `</div>` +
    relationBlock +
    `<dl class="kv">` +
    `<dt>Section</dt><dd>${esc(node.section || "root")}</dd>` +
    `<dt>Source</dt><dd>${node.source ? (isHttpHref(node.source) ? `<a href="${attr(node.source)}" target="_blank" rel="noopener">${esc(node.source)}</a>` : esc(node.source)) : "None"}</dd>` +
    `<dt>Resource</dt><dd>${node.resource ? (isHttpHref(node.resource) ? `<a href="${attr(node.resource)}" target="_blank" rel="noopener">${esc(node.resource)}</a>` : esc(node.resource)) : "None"}</dd>` +
    `<dt>Timestamp</dt><dd>${esc(node.timestamp || "None")}</dd>` +
    `<dt>Aliases</dt><dd>${routeAliases.length ? routeAliases.map(alias => `<span class="chip">${esc(alias)}</span>`).join(" ") : "None"}</dd>` +
    `</dl>` +
    `<div class="chips"><span class="chip">${outs.length} outgoing</span><span class="chip">${ins.length} incoming</span><span class="chip">${esc(node.section || "root")}</span></div>` +
    resourceBlock +
    relationButtons("Outgoing", outs, "out") +
    relationButtons("Incoming", ins, "in") +
    (bodyText ? `<h3>Excerpt</h3><div class="snippet">${esc(bodyText.slice(0, 900))}${bodyText.length > 900 ? "..." : ""}</div>` : "");
  bindDetailActions();
}

function renderPanel() {
  el.stage.classList.toggle("graphMode", currentView === "graph");
  document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", tab.dataset.view === currentView));
  if (currentView === "graph") {
    renderGraph();
  } else {
    renderEdgePanel();
    if (currentView === "links") {
      renderLinks();
    } else if (currentView === "timeline") {
      renderTimeline();
    } else {
      renderReader();
    }
  }
}

function renderChrome() {
  if (!corpus || !corpus.nodes[selected]) return;
  const node = corpus.nodes[selected];
  el.workspace.classList.toggle("leftCollapsed", leftCollapsed);
  el.workspace.classList.toggle("rightCollapsed", rightCollapsed);
  el.toggleLeft.title = leftCollapsed ? "Show navigation" : "Fold navigation";
  el.toggleLeft.setAttribute("aria-label", el.toggleLeft.title);
  el.toggleRight.title = rightCollapsed ? "Show details" : "Fold details";
  el.toggleRight.setAttribute("aria-label", el.toggleRight.title);
  el.crumbs.textContent = `${corpus.label || corpus.title || corpusId} / ${node.section || "root"} / ${node.title}`;
  el.pinPage.classList.toggle("active", isPinned(selected));
  el.pinPage.textContent = isPinned(selected) ? "Pinned" : "Pin";
}

function renderAll() {
  if (!bundle || !corpus || !selected) return;
  renderTypeFilters();
  renderList();
  renderPanel();
  renderDetail();
  renderPins();
  renderChrome();
}

async function loadInitialBundle() {
  const url = bundleUrlFromLocation();
  el.bundleUrl.value = url === DEFAULT_BUNDLE ? "" : url;
  try {
    const raw = await loadJson(validatedBundleUrl(url));
    setBundle(raw, url);
    rememberBundleUrl(url, raw);
    showStatus("");
  } catch (error) {
    showStatus(error.message || String(error));
  }
}

async function loadBundleFromUrl(url, push) {
  try {
    showStatus("");
    const raw = await loadJson(validatedBundleUrl(url));
    if (push) {
      const next = new URL(location.href);
      if (url === DEFAULT_BUNDLE) next.searchParams.delete("bundle");
      else next.searchParams.set("bundle", url);
      history.pushState(null, "", next);
    }
    setBundle(raw, url);
    rememberBundleUrl(url, raw);
  } catch (error) {
    showStatus(error.message || String(error));
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setGraphZoom(value) {
  graphZoom = clamp(value, .75, 3);
  if (currentView === "graph") renderGraph();
}

function resetGraphView() {
  graphZoom = 1;
  graphPan = { x: 0, y: 0 };
  labelPhase = 0;
  if (currentView === "graph") renderGraph();
}

function beginResize(event) {
  const side = event.currentTarget.dataset.resize;
  if ((side === "left" && leftCollapsed) || (side === "right" && rightCollapsed)) return;
  const rect = el.workspace.getBoundingClientRect();
  resizeDrag = { side, rect };
  event.currentTarget.classList.add("dragging");
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function moveResize(event) {
  if (!resizeDrag) return;
  event.preventDefault();
  const { side, rect } = resizeDrag;
  const limits = PANEL_LIMITS[side];
  const width = side === "left" ? event.clientX - rect.left : rect.right - event.clientX;
  el.workspace.style.setProperty(`--${side}-width`, `${clamp(width, limits.min, limits.max)}px`);
}

function endResize(event) {
  if (!resizeDrag) return;
  document.querySelectorAll(".splitter.dragging").forEach(item => item.classList.remove("dragging"));
  event.currentTarget?.releasePointerCapture?.(event.pointerId);
  resizeDrag = null;
  if (currentView === "graph") renderGraph();
}

el.bundleForm.addEventListener("submit", async event => {
  event.preventDefault();
  const url = el.bundleUrl.value.trim() || DEFAULT_BUNDLE;
  hideBundleSuggestions();
  loadBundleFromUrl(url, true);
});

el.bundleFile.addEventListener("change", async event => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    setBundle(raw, file.name);
    showStatus("");
  } catch (error) {
    showStatus(error.message || String(error));
  }
});

el.corpusSelect.addEventListener("change", () => setCorpus(el.corpusSelect.value, true));
el.search.addEventListener("input", renderList);
el.bundleUrl.addEventListener("focus", showBundleSuggestions);
el.bundleUrl.addEventListener("input", showBundleSuggestions);
el.bundleUrl.addEventListener("keydown", event => {
  if (event.key === "Escape") hideBundleSuggestions();
});
document.addEventListener("mousedown", event => {
  if (!el.bundleForm.contains(event.target)) hideBundleSuggestions();
});
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

el.toggleLeft.addEventListener("click", () => {
  leftCollapsed = !leftCollapsed;
  renderChrome();
  if (currentView === "graph") scheduleGraphLayoutRefresh(true);
});
el.toggleRight.addEventListener("click", () => {
  rightCollapsed = !rightCollapsed;
  renderChrome();
  if (currentView === "graph") scheduleGraphLayoutRefresh(true);
});
el.copyRoute.addEventListener("click", () => copyRoute(selected, currentView));
el.pinPage.addEventListener("click", () => togglePin(selected));
el.zoomOut.addEventListener("click", () => setGraphZoom(graphZoom / 1.2));
el.zoomIn.addEventListener("click", () => setGraphZoom(graphZoom * 1.2));
el.zoomReset.addEventListener("click", resetGraphView);
document.querySelectorAll(".splitter").forEach(splitter => {
  splitter.addEventListener("pointerdown", beginResize);
  splitter.addEventListener("pointermove", moveResize);
  splitter.addEventListener("pointerup", endResize);
  splitter.addEventListener("pointercancel", endResize);
});

el.graph.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  graphDrag = { x: event.clientX, y: event.clientY, pan: { ...graphPan }, moved: false };
  el.graph.classList.add("dragging");
  el.graph.setPointerCapture?.(event.pointerId);
});
el.graph.addEventListener("pointermove", event => {
  if (!graphDrag) return;
  const dx = event.clientX - graphDrag.x;
  const dy = event.clientY - graphDrag.y;
  if (Math.hypot(dx, dy) > 3) graphDrag.moved = true;
  if (!graphDrag.moved) return;
  event.preventDefault();
  graphPan = { x: graphDrag.pan.x - dx / graphZoom, y: graphDrag.pan.y - dy / graphZoom };
  renderGraph();
});
el.graph.addEventListener("pointerup", event => {
  el.graph.releasePointerCapture?.(event.pointerId);
  el.graph.classList.remove("dragging");
  if (graphDrag?.moved) graphSuppressClick = true;
  graphDrag = null;
});
el.graph.addEventListener("pointercancel", event => {
  el.graph.releasePointerCapture?.(event.pointerId);
  el.graph.classList.remove("dragging");
  graphDrag = null;
});
el.graph.addEventListener("wheel", event => {
  if (currentView !== "graph") return;
  event.preventDefault();
  setGraphZoom(graphZoom * (event.deltaY < 0 ? 1.12 : .89));
}, { passive: false });
el.graph.addEventListener("click", event => {
  const node = event.target.closest?.("[data-page]");
  if (!node || !el.graph.contains(node)) return;
  if (graphSuppressClick) {
    graphSuppressClick = false;
    event.preventDefault();
    return;
  }
  event.preventDefault();
  inspectPage(node.dataset.page);
});
el.graph.addEventListener("dblclick", event => {
  const node = event.target.closest?.("[data-page]");
  if (!node || !el.graph.contains(node)) return;
  event.preventDefault();
  openGraphNode(node.dataset.page);
});

window.addEventListener("popstate", () => {
  if (!bundle) return;
  currentView = viewFromLocation();
  const requested = new URLSearchParams(location.search).get("corpus");
  if (requested && requested !== corpusId && bundle.corpora[requested]) {
    setCorpus(requested, false);
    return;
  }
  const id = idFromHash();
  if (id) selectPage(id, false);
  else renderAll();
});
window.addEventListener("hashchange", () => {
  const id = idFromHash();
  if (id && id !== selected) selectPage(id, false);
});
window.addEventListener("resize", () => {
  if (currentView === "graph") renderGraph();
});

if ("ResizeObserver" in window) {
  const graphResizeObserver = new ResizeObserver(() => {
    if (currentView === "graph") scheduleGraphLayoutRefresh(false);
  });
  graphResizeObserver.observe(el.graphCanvas);
}

setInterval(() => {
  if (currentView === "graph" && labelLayerCount > 1) {
    labelPhase = (labelPhase + 1) % labelLayerCount;
    renderGraph();
  }
}, 2200);

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

loadBundleRegistry();
loadInitialBundle();
