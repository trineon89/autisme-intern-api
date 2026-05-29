const METHOD_DETAILS = {
  GET: { label: 'Read', body: false },
  POST: { label: 'Create / run', body: true },
  PUT: { label: 'Replace', body: true },
  PATCH: { label: 'Update', body: true },
  DELETE: { label: 'Delete', body: false },
  OPTIONS: { label: 'Preflight', body: false },
  HEAD: { label: 'Headers', body: false },
  TRACE: { label: 'Legacy trace', body: false }
};

const GROUP_DETAILS = {
  service: { title: 'Service', icon: '✦', description: 'Public diagnostics, metadata, and API documentation.' },
  auth: { title: 'Authentication', icon: '🔐', description: 'Login, token lifecycle, and current-user routes.' },
  namnam: { title: 'NamNam', icon: '🍽️', description: 'Meal planning, menus, services, and daily registrations.' },
  operations: { title: 'Operations', icon: '📊', description: 'Reports, billing, settings, reserved dates, and imports.' },
  legacy: { title: 'Legacy compatibility', icon: '🧩', description: 'Routes preserved for legacy Autisme Luxembourg clients.' },
  assets: { title: 'Assets', icon: '🖼️', description: 'Uploaded files and generated downloadable assets.' },
  other: { title: 'Other routes', icon: '⚙️', description: 'Additional application endpoints.' }
};

const PUBLIC_ENDPOINTS = new Set([
  'GET /',
  'GET /health',
  'GET /healthz',
  'GET /readyz',
  'GET /meta',
  'GET /docs',
  'GET /docs/routes.json',
  'GET /docs/openapi.yaml',
  'POST /auth/login'
]);

const ROUTE_DETAILS = {
  'GET /': {
    summary: 'API landing page or JSON service descriptor',
    query: '',
    response: { ok: true, name: 'api2.autisme.lu', docs: '/docs' }
  },
  'GET /docs': {
    summary: 'Interactive visual endpoint explorer',
    response: '<!doctype html>…</html>'
  },
  'GET /docs/routes.json': {
    summary: 'Machine-readable endpoint inventory generated from registered Fastify routes',
    response: { ok: true, endpointCount: 42, groups: [] }
  },
  'GET /docs/openapi.yaml': {
    summary: 'OpenAPI specification source',
    response: 'openapi: 3.1.0\ninfo:\n  title: api2.autisme.lu'
  },
  'GET /health': { summary: 'Process health check', response: { ok: true, status: 'healthy' } },
  'GET /healthz': { summary: 'Process health check', response: { ok: true, status: 'healthy' } },
  'GET /readyz': { summary: 'Database readiness check', response: { ok: true, status: 'ready' } },
  'GET /meta': { summary: 'Runtime metadata', response: { ok: true, data: { app: 'api2.autisme.lu', environment: 'production', authRequired: true } } },
  'POST /auth/login': {
    summary: 'Authenticate with email/password and receive a bearer token',
    body: { email: 'admin@example.org', password: 'your-password' },
    response: { ok: true, data: { token: 'eyJ…', user: { email: 'admin@example.org', role: 'admin' } } }
  },
  'POST /auth/logout': { summary: 'Revoke the current bearer token' },
  'GET /auth/me': { summary: 'Return the current authenticated user' },
  'POST /auth/refresh': { summary: 'Rotate the current bearer token' },
  'GET /namnam/bootstrap': { summary: 'Frontend bootstrap data for NamNam screens' },
  'GET /people': { summary: 'List people with optional filters', query: '?active=true&q=alex' },
  'POST /people': { summary: 'Create a person', body: { first_name: 'Alex', last_name: 'Example', active: true } },
  'GET /places': { summary: 'List places/services' },
  'POST /places': { summary: 'Create a place/service', body: { name: 'Service A', active: true } },
  'GET /meal-choices': { summary: 'List available meal choices' },
  'GET /meal-choices/for-day': { summary: 'Choices and menu context for a date', query: '?date=2026-06-03' },
  'GET /base-plans': { summary: 'Get the base plan for one person', query: '?person_id=1' },
  'POST /base-plans': { summary: 'Upsert base plan entries', body: { person_id: 1, entries: [] } },
  'GET /meal-registrations': { summary: 'List meal registrations with filters', query: '?from=2026-06-01&until=2026-06-05' },
  'POST /meal-registrations/single': { summary: 'Upsert one registration', body: { person_id: 1, date: '2026-06-03', meal_choice_id: 2 } },
  'POST /meal-registrations/week': { summary: 'Upsert one week for one person', body: { person_id: 1, monday_date: '2026-06-01', days: [] } },
  'GET /weekly-menus': { summary: 'Fetch a weekly menu', query: '?monday_date=2026-06-01' },
  'POST /weekly-menus': { summary: 'Upsert menu data for a Monday', body: { monday_date: '2026-06-01', days: [] } },
  'GET /reports/data': { summary: 'Filtered report data grouped by service', query: '?from=2026-06-01&until=2026-06-05' },
  'POST /reports/pdf/general': { summary: 'Generate a general PDF report', body: { from: '2026-06-01', until: '2026-06-05' } },
  'POST /reports/pdf/kitchen': { summary: 'Generate a kitchen checklist PDF', body: { date: '2026-06-03' } },
  'GET /reports/generated': { summary: 'List generated reports' },
  'GET /settings': { summary: 'List application settings' },
  'GET /reserved-dates': { summary: 'List reserved dates' },
  'GET /billing/monthly': { summary: 'Monthly billing summary', query: '?month=2026-06' },
  'POST /import/legacy': { summary: 'Import legacy CSV data' },
  'GET /personal/getPersonal': { summary: 'Legacy people list' },
  'GET /service/getServicen': { summary: 'Legacy services list' },
  'GET /menu/getMenus': { summary: 'Legacy menus list' },
  'GET /kleeder/getKleeder': { summary: 'Legacy clothing items' },
  'GET /commande/getClients': { summary: 'Legacy commande clients' },
  'GET /translation/*': { summary: 'Legacy translation passthrough' }
};

const ROUTE_ALIASES = [
  [/^GET \/uploads\/:filename$/, 'GET /uploads/:filename'],
  [/^GET \/translation\/.+$/, 'GET /translation/*']
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function jsonForHtml(value) {
  return escapeHtml(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
}

function detailKey(route) {
  const key = `${route.method} ${route.path}`;
  if (ROUTE_DETAILS[key]) return key;
  const alias = ROUTE_ALIASES.find(([pattern]) => pattern.test(key));
  return alias?.[1] || key;
}

function pathForOpenApi(path) {
  return path.replaceAll(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function routeSummary(route) {
  const detail = ROUTE_DETAILS[detailKey(route)];
  if (detail?.summary) return detail.summary;
  const method = METHOD_DETAILS[route.method]?.label || 'Endpoint';
  return `${method} ${pathForOpenApi(route.path)}`;
}

function groupKeyForPath(path) {
  if (['/', '/health', '/healthz', '/readyz', '/meta'].includes(path) || path.startsWith('/docs')) return 'service';
  if (path.startsWith('/auth')) return 'auth';
  if (path.startsWith('/uploads')) return 'assets';
  if (path.startsWith('/reports') || path.startsWith('/settings') || path.startsWith('/reserved-dates') || path.startsWith('/billing') || path.startsWith('/import')) return 'operations';
  if (path.startsWith('/personal') || path.startsWith('/service') || path.startsWith('/menu') || path.startsWith('/kleeder') || path.startsWith('/commande') || path.startsWith('/translation')) return 'legacy';
  if (path.startsWith('/namnam') || path.startsWith('/people') || path.startsWith('/places') || path.startsWith('/meal-choices') || path.startsWith('/base-plans') || path.startsWith('/meal-registrations') || path.startsWith('/weekly-menus') || path.startsWith('/menu-assets')) return 'namnam';
  return 'other';
}

function sortRoutes(routes) {
  const methodOrder = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'TRACE', 'OPTIONS', 'HEAD'];
  const order = (method) => {
    const index = methodOrder.indexOf(method);
    return index === -1 ? methodOrder.length : index;
  };
  return [...routes].sort((a, b) => a.path.localeCompare(b.path) || order(a.method) - order(b.method));
}

export function createRouteRegistry() {
  const routes = [];
  const known = new Set();

  return {
    routes,
    capture(routeOptions) {
      const methods = Array.isArray(routeOptions.method) ? routeOptions.method : [routeOptions.method];
      for (const method of methods) {
        if (!method || method === 'HEAD' || method === 'OPTIONS') continue;
        const path = routeOptions.url || routeOptions.path;
        const key = `${method} ${path}`;
        if (known.has(key)) continue;
        known.add(key);
        routes.push({ method, path });
      }
    }
  };
}

export function apiLandingPayload(config, routes = []) {
  const groups = groupRoutes(routes);
  return {
    ok: true,
    name: 'api2.autisme.lu',
    version: '1.0.0',
    publicUrl: config.apiPublicUrl,
    docs: '/docs',
    openapi: '/docs/openapi.yaml',
    routeInventory: '/docs/routes.json',
    health: '/healthz',
    endpointCount: groups.reduce((count, group) => count + group.endpoints.length, 0),
    groups: groups.map((group) => ({
      title: group.title,
      description: group.description,
      endpoints: group.endpoints.map((endpoint) => ({
        method: endpoint.method,
        path: pathForOpenApi(endpoint.path),
        summary: endpoint.summary,
        public: endpoint.public
      }))
    }))
  };
}

function groupRoutes(routes) {
  const grouped = new Map();
  for (const route of sortRoutes(routes)) {
    const key = groupKeyForPath(route.path);
    if (!grouped.has(key)) grouped.set(key, { key, ...GROUP_DETAILS[key], endpoints: [] });
    grouped.get(key).endpoints.push({
      ...route,
      openApiPath: pathForOpenApi(route.path),
      summary: routeSummary(route),
      public: PUBLIC_ENDPOINTS.has(`${route.method} ${route.path}`),
      detail: ROUTE_DETAILS[detailKey(route)] || {}
    });
  }
  return [...grouped.values()].sort((a, b) => Object.keys(GROUP_DETAILS).indexOf(a.key) - Object.keys(GROUP_DETAILS).indexOf(b.key));
}

function exampleUrl(config, endpoint) {
  const detail = endpoint.detail || {};
  const path = endpoint.openApiPath.replaceAll(/{([^}]+)}/g, '1');
  return `${config.apiPublicUrl}${path}${detail.query || ''}`;
}

function curlExample(config, endpoint) {
  const detail = endpoint.detail || {};
  const lines = [`curl -X ${endpoint.method} '${exampleUrl(config, endpoint)}'`];
  if (!endpoint.public) lines.push("  -H 'Authorization: Bearer <token>'");
  if (METHOD_DETAILS[endpoint.method]?.body) {
    lines.push("  -H 'Content-Type: application/json'");
    lines.push(`  -d '${JSON.stringify(detail.body || { example: true })}'`);
  }
  return lines.join(' \\\n');
}

function renderEndpoint(config, endpoint) {
  const detail = endpoint.detail || {};
  const response = detail.response || { ok: true, data: [] };
  return `<details class="endpoint-card" data-method="${escapeHtml(endpoint.method)}" data-path="${escapeHtml(endpoint.openApiPath.toLowerCase())}" data-summary="${escapeHtml(endpoint.summary.toLowerCase())}">
    <summary>
      <span class="method method-${escapeHtml(endpoint.method.toLowerCase())}">${escapeHtml(endpoint.method)}</span>
      <span class="endpoint-main">
        <code>${escapeHtml(endpoint.openApiPath)}</code>
        <span>${escapeHtml(endpoint.summary)}</span>
      </span>
      <span class="badge ${endpoint.public ? 'badge-public' : ''}">${endpoint.public ? 'Public' : 'Bearer token'}</span>
    </summary>
    <div class="endpoint-details">
      <div>
        <h3>Example request</h3>
        <pre><button type="button" class="copy-button" data-copy="${escapeHtml(curlExample(config, endpoint))}">Copy</button><code>${escapeHtml(curlExample(config, endpoint))}</code></pre>
      </div>
      <div>
        <h3>Example response</h3>
        <pre><code>${jsonForHtml(response)}</code></pre>
      </div>
    </div>
  </details>`;
}

export function renderApiLandingHtml(config, routes = []) {
  const groups = groupRoutes(routes);
  const endpointCount = groups.reduce((count, group) => count + group.endpoints.length, 0);
  const methodCounts = groups.flatMap((group) => group.endpoints).reduce((counts, endpoint) => {
    counts[endpoint.method] = (counts[endpoint.method] || 0) + 1;
    return counts;
  }, {});
  const methodStats = Object.entries(methodCounts).map(([method, count]) => `<span><strong>${count}</strong> ${escapeHtml(method)}</span>`).join('');
  const groupCards = groups.map((group) => `<section class="group-card">
    <div class="group-heading">
      <div><span class="group-icon">${escapeHtml(group.icon)}</span><h2>${escapeHtml(group.title)}</h2></div>
      <span>${group.endpoints.length} endpoints</span>
    </div>
    <p>${escapeHtml(group.description)}</p>
    <div class="endpoint-list">${group.endpoints.map((endpoint) => renderEndpoint(config, endpoint)).join('')}</div>
  </section>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>api2.autisme.lu API explorer</title>
  <style>
    :root { color-scheme: light dark; --bg: #eef3ff; --bg-2: #fff7ed; --fg: #152033; --muted: #647189; --card: rgba(255,255,255,.82); --card-strong: #fff; --border: rgba(94,111,150,.22); --accent: #3155e7; --accent-2: #db2777; --shadow: 0 24px 80px rgba(30,41,59,.14); }
    @media (prefers-color-scheme: dark) { :root { --bg: #0d1424; --bg-2: #251225; --fg: #f4f7fb; --muted: #aab6cd; --card: rgba(20,29,48,.84); --card-strong: #172136; --border: rgba(159,176,208,.18); --accent: #91a7ff; --accent-2: #fb7ab8; --shadow: 0 24px 80px rgba(0,0,0,.34); } }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at top left, rgba(49,85,231,.25), transparent 34rem), radial-gradient(circle at top right, rgba(219,39,119,.18), transparent 30rem), linear-gradient(135deg, var(--bg), var(--bg-2)); color: var(--fg); min-height: 100vh; }
    main { max-width: 1220px; margin: 0 auto; padding: 42px 18px 56px; }
    .hero, .group-card { border: 1px solid var(--border); background: var(--card); box-shadow: var(--shadow); backdrop-filter: blur(18px); }
    .hero { border-radius: 34px; padding: clamp(24px, 5vw, 54px); overflow: hidden; position: relative; }
    .hero:after { content: ''; position: absolute; width: 280px; height: 280px; right: -90px; top: -90px; border-radius: 999px; background: linear-gradient(135deg, rgba(49,85,231,.32), rgba(219,39,119,.26)); filter: blur(2px); }
    .eyebrow { position: relative; z-index: 1; display: inline-flex; gap: 8px; align-items: center; margin: 0 0 16px; padding: 8px 12px; border-radius: 999px; background: rgba(49,85,231,.12); color: var(--accent); font-weight: 800; letter-spacing: .02em; }
    h1 { position: relative; z-index: 1; margin: 0; max-width: 860px; font-size: clamp(2.4rem, 6vw, 5.4rem); line-height: .94; letter-spacing: -.06em; }
    h2, h3, p { margin-top: 0; }
    p { color: var(--muted); line-height: 1.65; }
    .hero p { position: relative; z-index: 1; max-width: 760px; font-size: 1.08rem; margin: 18px 0 0; }
    a { color: var(--accent); }
    .actions, .stats, .filters { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
    .button, .stat, .filters input { border: 1px solid var(--border); background: var(--card-strong); border-radius: 999px; }
    .button { display: inline-flex; align-items: center; gap: 8px; padding: 12px 17px; text-decoration: none; font-weight: 800; }
    .stat { padding: 12px 16px; color: var(--muted); }
    .stat strong { color: var(--fg); font-size: 1.25rem; }
    .method-stats span { display: inline-flex; gap: 5px; margin-right: 12px; }
    .filters { align-items: center; margin: 24px 0; }
    .filters input { flex: 1 1 280px; min-width: 0; padding: 14px 18px; color: var(--fg); font: inherit; outline: none; }
    .filters button { border: 0; border-radius: 999px; padding: 13px 16px; background: var(--fg); color: var(--card-strong); font-weight: 800; cursor: pointer; }
    .groups { display: grid; gap: 18px; }
    .group-card { border-radius: 26px; padding: 22px; }
    .group-heading { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    .group-heading div { display: flex; align-items: center; gap: 12px; }
    .group-heading h2 { margin: 0; font-size: 1.35rem; }
    .group-heading > span { color: var(--muted); font-weight: 750; }
    .group-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 14px; background: linear-gradient(135deg, rgba(49,85,231,.16), rgba(219,39,119,.14)); }
    .endpoint-list { display: grid; gap: 10px; margin-top: 16px; }
    .endpoint-card { border: 1px solid var(--border); border-radius: 18px; background: var(--card-strong); overflow: hidden; }
    .endpoint-card[hidden] { display: none; }
    summary { display: grid; grid-template-columns: 86px 1fr auto; gap: 14px; align-items: center; padding: 14px; cursor: pointer; list-style: none; }
    summary::-webkit-details-marker { display: none; }
    .endpoint-main { display: grid; gap: 4px; min-width: 0; }
    .endpoint-main span { color: var(--muted); font-size: .92rem; }
    .method { border-radius: 12px; padding: 7px 9px; text-align: center; font-size: .78rem; font-weight: 900; background: #e7ecff; color: #183da8; }
    .method-post { background: #dcfce7; color: #166534; }
    .method-patch, .method-put { background: #fef3c7; color: #92400e; }
    .method-delete { background: #ffe4e6; color: #be123c; }
    .badge { border-radius: 999px; padding: 6px 10px; background: rgba(100,113,137,.12); color: var(--muted); font-size: .78rem; font-weight: 850; white-space: nowrap; }
    .badge-public { background: rgba(22,163,74,.12); color: #16a34a; }
    .endpoint-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; padding: 0 14px 14px 114px; }
    .endpoint-details h3 { margin: 0 0 8px; font-size: .95rem; color: var(--muted); }
    pre { position: relative; margin: 0; padding: 16px; border-radius: 14px; background: #101827; color: #e8eefc; overflow: auto; min-height: 92px; }
    code { overflow-wrap: anywhere; font-family: "SFMono-Regular", Consolas, monospace; font-size: .9rem; }
    .copy-button { position: absolute; top: 8px; right: 8px; border: 0; border-radius: 999px; padding: 6px 9px; background: rgba(255,255,255,.12); color: #fff; cursor: pointer; }
    footer { margin-top: 24px; color: var(--muted); font-size: .92rem; text-align: center; }
    @media (max-width: 700px) { summary { grid-template-columns: 72px 1fr; } .badge { grid-column: 2; justify-self: start; } .endpoint-details { padding-left: 14px; } }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="eyebrow">✨ Live Fastify route explorer</div>
      <h1>api2.autisme.lu API explorer</h1>
      <p>Browse the routes currently registered by the Node.js application, grouped by product area with copyable cURL examples. New Fastify endpoints appear here automatically after they are registered.</p>
      <div class="actions">
        <a class="button" href="/docs/openapi.yaml">OpenAPI YAML</a>
        <a class="button" href="/docs/routes.json">Route JSON</a>
        <a class="button" href="/healthz">Health check</a>
        <a class="button" href="/readyz">Readiness check</a>
      </div>
      <div class="stats">
        <div class="stat"><strong>${endpointCount}</strong> endpoints</div>
        <div class="stat method-stats">${methodStats}</div>
        <div class="stat">Public URL: <code>${escapeHtml(config.apiPublicUrl)}</code></div>
      </div>
    </section>

    <section class="filters" aria-label="Endpoint filters">
      <input id="endpoint-search" type="search" placeholder="Filter endpoints by method, path, or summary…" autocomplete="off">
      <button type="button" id="expand-all">Expand all</button>
      <button type="button" id="collapse-all">Collapse all</button>
    </section>

    <div class="groups">${groupCards}</div>
    <footer>Authenticated endpoints require a bearer token unless auth is disabled for development. Detailed schemas still live in <code>docs/openapi.yaml</code>.</footer>
  </main>
  <script>
    const search = document.querySelector('#endpoint-search');
    const cards = [...document.querySelectorAll('.endpoint-card')];
    search.addEventListener('input', () => {
      const term = search.value.trim().toLowerCase();
      cards.forEach((card) => {
        card.hidden = term && ![card.dataset.method, card.dataset.path, card.dataset.summary].join(' ').includes(term);
      });
    });
    document.querySelector('#expand-all').addEventListener('click', () => cards.forEach((card) => { if (!card.hidden) card.open = true; }));
    document.querySelector('#collapse-all').addEventListener('click', () => cards.forEach((card) => { card.open = false; }));
    document.querySelectorAll('.copy-button').forEach((button) => button.addEventListener('click', async (event) => {
      event.preventDefault();
      await navigator.clipboard.writeText(button.dataset.copy);
      const old = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = old; }, 1200);
    }));
  </script>
</body>
</html>`;
}
