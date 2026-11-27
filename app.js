'use strict';

// LAB12: one small application for Docker, Kubernetes, HPA and Helm.
// Student task (V2): change the text below, rebuild the image and push tag v2.
const IMAGE_MESSAGE = 'Sis tekstas yra idetas i Docker atvaizda V1.';

const http = require('node:http');
const os = require('node:os');

const PORT = Number(process.env.PORT || 8080);
const OWNER = process.env.APP_OWNER || 'Studentas';
const TITLE = process.env.APP_TITLE || 'Mano Kubernetes laboratorija';
const VERSION = process.env.APP_VERSION || 'V1';
const requestedColor = process.env.APP_COLOR || '#2563eb';
const COLOR = /^#[0-9a-fA-F]{6}$/.test(requestedColor) ? requestedColor : '#2563eb';
const POD_NAME = process.env.POD_NAME || os.hostname();
const POD_IP = process.env.POD_IP || '127.0.0.1 (local)';
const NODE_NAME = process.env.NODE_NAME || 'Ne Kubernetes';
let requestCount = 0;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function info() {
  return {
    podName: POD_NAME, podIp: POD_IP, nodeName: NODE_NAME,
    owner: OWNER, title: TITLE, version: VERSION,
    requests: requestCount, serverTime: new Date().toISOString()
  };
}

function page() {
  const data = info();
  return `<!doctype html>
<html lang="lt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(TITLE)} | LAB12</title>
  <style>
    :root { --accent: ${COLOR}; --bg: #f2f6fb; --ink: #15243b; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, Arial, sans-serif; color: var(--ink); background: var(--bg); }
    header { padding: 14px max(24px, calc((100vw - 970px) / 2)); color: white; background: #122540; letter-spacing: .045em; font-size: 13px; }
    main { max-width: 990px; margin: 35px auto; padding: 0 20px 50px; }
    .hero { padding: 34px; border-radius: 19px; background: white; box-shadow: 0 10px 35px #102b5414; border-top: 7px solid var(--accent); }
    .eyebrow { color: var(--accent); font-size: 13px; font-weight: 800; letter-spacing: .08em; }
    h1 { margin: 12px 0 8px; font-size: clamp(27px, 4vw, 43px); }
    p { line-height: 1.55; color: #56647a; }
    .pill { display: inline-block; border-radius: 20px; padding: 6px 13px; background: #e8f7ec; color: #176439; font-weight: 700; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px; margin: 23px 0; }
    .metric { background: white; border: 1px solid #dfe6f0; border-radius: 13px; padding: 19px; min-width: 0; }
    .metric small { display: block; font-weight: 700; color: #69778d; margin-bottom: 9px; }
    .metric strong { display: block; font: 600 16px ui-monospace, Consolas, monospace; overflow-wrap: anywhere; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0 10px; }
    button { border: 0; border-radius: 9px; padding: 13px 18px; cursor: pointer; background: var(--accent); color: #fff; font-size: 14px; font-weight: 700; }
    button.secondary { background: #203954; }
    button:disabled { opacity: .6; cursor: wait; }
    .foot { margin-top: 24px; font-size: 13px; color: #69778d; }
    #status { font-size: 14px; min-height: 22px; }
    @media (max-width: 590px) { .grid { grid-template-columns: 1fr; } .hero { padding: 24px; } }
  </style>
</head>
<body>
<header>KAUNO KOLEGIJA &nbsp;/&nbsp; DEBES&#370; KOMPIUTERIJA &nbsp;/&nbsp; LAB12</header>
<main>
  <section class="hero">
    <div class="eyebrow">AZURE KUBERNETES SERVICE</div>
    <h1>${escapeHtml(TITLE)}</h1>
    <p>Savininkas: <strong>${escapeHtml(OWNER)}</strong> &nbsp; <span class="pill">${escapeHtml(VERSION)} &#183; veikia</span></p>
    <p>${escapeHtml(IMAGE_MESSAGE)}</p>
    <div class="grid">
      <div class="metric"><small>Pod vardas</small><strong id="podName">${escapeHtml(data.podName)}</strong></div>
      <div class="metric"><small>Pod IP adresas</small><strong id="podIp">${escapeHtml(data.podIp)}</strong></div>
      <div class="metric"><small>Node vardas</small><strong id="nodeName">${escapeHtml(data.nodeName)}</strong></div>
      <div class="metric"><small>Programos versija</small><strong id="version">${escapeHtml(data.version)}</strong></div>
      <div class="metric"><small>U&#382;klausos &#353;iame Pod</small><strong id="requests">${data.requests}</strong></div>
      <div class="metric"><small>Serverio laikas (UTC)</small><strong id="serverTime">${escapeHtml(data.serverTime)}</strong></div>
    </div>
    <div class="actions">
      <button id="infoBtn" onclick="refreshPod()">Si&#371;sti nauj&#261; u&#382;klaus&#261;</button>
      <button id="loadBtn" class="secondary" onclick="cpuTest()">CPU testas (1 s)</button>
    </div>
    <div id="status" role="status" aria-live="polite"></div>
    <div class="foot">Service paskirsto tinklo jungtis tarp Pod. Tas pats Pod gali atsakyti kelis kartus i&#353; eil&#279;s. HPA steb&#279;kite AKS Workloads lange.</div>
  </section>
</main>
<script>
async function refreshPod() {
  const label = document.getElementById('status');
  try {
    const r = await fetch('/api/info', {cache: 'no-store'});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    for (const key of ['podName','podIp','nodeName','version','requests','serverTime']) {
      document.getElementById(key).textContent = d[key];
    }
    label.textContent = 'U\u017eklaus\u0105 aptarnavo: ' + d.podName;
  } catch (err) { label.textContent = 'Klaida: ' + err.message; }
}
async function cpuTest() {
  const button = document.getElementById('loadBtn');
  const label = document.getElementById('status');
  button.disabled = true;
  label.textContent = 'Generuojama CPU apkrova...';
  try {
    const r = await fetch('/api/load?ms=1000', {cache: 'no-store'});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    label.textContent = 'CPU test\u0105 atliko: ' + d.podName + ' (' + d.ms + ' ms)';
  } catch (err) { label.textContent = 'Klaida: ' + err.message; }
  finally { button.disabled = false; }
}
</script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  requestCount += 1;
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Connection', 'close');
  const url = new URL(req.url, 'http://localhost');
  if (req.method !== 'GET') { res.writeHead(405).end('Method not allowed'); return; }
  if (url.pathname === '/healthz') { res.writeHead(200, {'Content-Type':'text/plain'}).end('ok'); return; }
  if (url.pathname === '/api/info') {
    res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'}).end(JSON.stringify(info()));
    return;
  }
  if (url.pathname === '/api/load') {
    // LAB ONLY: CPU workload is bounded to 300..1500 milliseconds per request.
    const raw = Number(url.searchParams.get('ms') || '1000');
    const ms = Number.isFinite(raw) ? Math.min(1500, Math.max(300, raw)) : 1000;
    const until = Date.now() + ms;
    let calculation = 0;
    while (Date.now() < until) calculation += Math.sqrt(Math.random());
    res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'})
      .end(JSON.stringify({podName:POD_NAME,ms,calculation:Math.round(calculation)}));
    return;
  }
  if (url.pathname === '/') {
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}).end(page());
    return;
  }
  res.writeHead(404, {'Content-Type':'text/plain'}).end('Not found');
});
server.listen(PORT, '0.0.0.0', () => console.log(`LAB12 listening at http://0.0.0.0:${PORT}; Pod=${POD_NAME}; version=${VERSION}`));
