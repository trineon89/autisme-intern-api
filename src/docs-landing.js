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
  'GET /assets/css/docs-landing.css',
  'GET /assets/js/docs-landing.js',
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
  <link rel="stylesheet" href="/assets/css/docs-landing.css">
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
  <script src="/assets/js/docs-landing.js" defer></script>
</body>
</html>`;
}