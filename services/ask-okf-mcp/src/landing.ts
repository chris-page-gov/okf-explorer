import { APPROVED_BUNDLE, BUNDLE_VERSION, PRIOR_BUNDLE_VERSION, HOUSEHOLD_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION, STAFF_BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION } from './registry.ts';

const explorer = 'https://chris-page-gov.github.io/okf-explorer/explore/?bundle=';
export const CORPUS_EXPLORER_URL = explorer + encodeURIComponent(
  `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${BUNDLE_VERSION}/structured-context/evidence-connect-explorer.json`);
export const PRIOR_EXPLORER_URL = explorer + encodeURIComponent(
  `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${PRIOR_BUNDLE_VERSION}/combined/okf-explorer.json`);
export const HOUSEHOLD_EXPLORER_URL = explorer + encodeURIComponent(
  `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${HOUSEHOLD_BUNDLE_VERSION}/combined/okf-explorer.json`);
export const LEGACY_EXPLORER_URL = explorer + encodeURIComponent(
  `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${LEGACY_BUNDLE_VERSION}/full-dmg/okf-explorer.json`);
export const STAFF_EXPLORER_URL = explorer + encodeURIComponent(
  `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${STAFF_BUNDLE_VERSION}/combined/okf-explorer.json`);
export const PREVIOUS_EXPLORER_URL = explorer + encodeURIComponent(
  `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${PREVIOUS_BUNDLE_VERSION}/full-dmg/okf-corpus-context.json`);

/** Static human navigation; no user input or executable source content. */
export function landingResponse(): Response {
  return new Response(`<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Ask OKF — inspect the evidence</title>
<style>body{font:1.1rem/1.6 system-ui,sans-serif;max-width:48rem;margin:3rem auto;padding:0 1.2rem;color:#172b3a}a{color:#005ea5}a:focus{outline:3px solid #ffdd00;outline-offset:3px}code{overflow-wrap:anywhere}aside{border-left:5px solid #ffdd00;padding:0.7rem 1rem;background:#fff8cc}li{margin:0.6rem 0}</style></head><body>
<main><nav aria-label="Project"><a href="https://github.com/chris-page-gov/okf-dwp/blob/main/CHANGELOG.md">DWP changelog</a> · <a href="https://github.com/chris-page-gov/okf-explorer/blob/main/CHANGELOG.md">Explorer changelog</a></nav><h1>Ask OKF</h1><p>Explore public guidance and inspect the evidence selected for a question.</p>
<aside><strong>Independent experimental publication.</strong> This is not an official DWP service, benefits advice, an award calculation or an individual entitlement decision. Do not submit claimant personal data.</aside>
<h2>Start with the evidence</h2><p>The default Evidence Connect corpus covers 331 DMG PDFs and 182 ADM PDFs: 19,090 measured pages, including 18,197 pages with extracted text. The 893 empty extractions remain accounted for. It offers source-led units and separately authored staff-task profiles.</p>
<p><a href="${CORPUS_EXPLORER_URL}">Open DMG and ADM evidence in Ask OKF Explorer</a></p>
<p>Search the DMG and ADM source units, then read the complete linked source passage and official PDF locator. Discovery cards and source references help navigation; they do not establish legal applicability.</p>
<p>Staff-task profiles declare missing scope, legal and review obligations explicitly. A useful source match is a research lead, not a complete answer.</p>
<ul><li><a href="https://chris-page-gov.github.io/okf-dwp/docs/learning-path.html">Follow the beginner learning path</a></li>
<li><a href="https://github.com/chris-page-gov/okf-dwp/blob/${BUNDLE_VERSION}/docs/evidence-connect-profile.md">Read the Evidence Connect profile and its limitations</a></li></ul>
<h2>Connect an AI client</h2><p>MCP endpoint: <code>/okf/mcp</code></p>
<p>Select and copy this full address: <code>https://ask-okf.crpage.chatgpt.site/okf/mcp</code>. Use No Auth. Start with <code>ask_okf_manifest</code> for a compact catalogue, then <code>read_okf_evidence</code> to read exact source text and diagnostics in bounded parts. The original <code>ask_okf</code> full-package tool remains available.</p>
<p><a href="/review/">Recreate and inspect an evidence context</a>. Each read verifies the approved corpus and context identity. This is an evidence replay, not a stored audit log or an AI answer.</p>
<p>Opening the endpoint as an ordinary web page returns <code>405 Method Not Allowed</code>: an MCP client calls it using POST. Use Explorer above to inspect evidence yourself.</p>
<p><a href="https://chris-page-gov.github.io/okf-explorer/docs/remote-mcp.html">Read the connection guide and delivery limitations</a>. Tool access, complete ChatGPT delivery and live Voice access are separate checks.</p>
<p>The <a href="https://github.com/chris-page-gov/okf-dwp/blob/main/evaluation/evidence-workbench/tools-manifest.json">Evidence workbench tools manifest</a> and <a href="https://github.com/chris-page-gov/okf-dwp/blob/main/docs/evidence-workbench.md">workbench guide</a> describe a separate browser page workflow. They do not change the public MCP endpoint or its approval boundary.</p>
<p>Default immutable revision: <code>${APPROVED_BUNDLE.version}</code>. <a href="/health">Inspect the service identity</a>.</p>
<h2>Earlier combined corpus</h2><p><a href="${PRIOR_EXPLORER_URL}">Open the preceding combined Reader</a>. Explicit version <code>${PRIOR_BUNDLE_VERSION}</code> preserves its remote evidence links and service 0.6.1 replay.</p>
<h2>Earlier household and statutory corpus</h2><p><a href="${HOUSEHOLD_EXPLORER_URL}">Open the original household and statutory evidence release</a>. Explicit version <code>${HOUSEHOLD_BUNDLE_VERSION}</code> preserves the source used by service 0.5.0 and its historical evidence links.</p>
<h2>Earlier staff semantic corpus</h2><p><a href="${STAFF_EXPLORER_URL}">Open the preceding staff-question evidence release</a>. Explicit version <code>${STAFF_BUNDLE_VERSION}</code> preserves its original semantic profiles and metadata-only legal references.</p>
<h2>Earlier discovery corpus</h2><p><a href="${PREVIOUS_EXPLORER_URL}">Open the earlier full-source discovery corpus</a>. Its captured DMG and ADM sources remain available by explicitly requesting version <code>${PREVIOUS_BUNDLE_VERSION}</code>. That version does not include the new staff-task semantic profiles.</p>
<h2>Historical custody acceptance case</h2><p><a href="${LEGACY_EXPLORER_URL}">Open the original 52-record custody profile</a>. To call it remotely, explicitly request version <code>${LEGACY_BUNDLE_VERSION}</code>. Its earlier acceptance receipts do not establish delivery of the new full-source corpus.</p>
</main></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'" } });
}
