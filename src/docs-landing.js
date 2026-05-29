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
  const authLabel = endpoint.public ? 'Public' : 'Bearer token';
  return `<details class="endpoint-card" data-method="${escapeHtml(endpoint.method)}" data-path="${escapeHtml(endpoint.openApiPath.toLowerCase())}" data-summary="${escapeHtml(endpoint.summary.toLowerCase())}">
    <summary>
      <span class="method method-${escapeHtml(endpoint.method.toLowerCase())}">${escapeHtml(endpoint.method)}</span>
      <span class="endpoint-main">
        <span class="endpoint-path-row"><code>${escapeHtml(endpoint.openApiPath)}</code><span class="endpoint-arrow">↗</span></span>
        <span>${escapeHtml(endpoint.summary)}</span>
      </span>
      <span class="badge ${endpoint.public ? 'badge-public' : ''}">${authLabel}</span>
    </summary>
    <div class="endpoint-details">
      <div class="example-panel">
        <div class="panel-title-row"><h3>Example request</h3><span>cURL</span></div>
        <pre><button type="button" class="copy-button" data-copy="${escapeHtml(curlExample(config, endpoint))}">Copy</button><code>${escapeHtml(curlExample(config, endpoint))}</code></pre>
      </div>
      <div class="example-panel">
        <div class="panel-title-row"><h3>Example response</h3><span>JSON</span></div>
        <pre><code>${jsonForHtml(response)}</code></pre>
      </div>
    </div>
  </details>`;
}

export function renderApiLandingHtml(config, routes = []) {
  const groups = groupRoutes(routes);
  const endpointCount = groups.reduce((count, group) => count + group.endpoints.length, 0);
  const allEndpoints = groups.flatMap((group) => group.endpoints);
  const protectedCount = allEndpoints.filter((endpoint) => !endpoint.public).length;
  const publicCount = allEndpoints.length - protectedCount;
  const methodCounts = allEndpoints.reduce((counts, endpoint) => {
    counts[endpoint.method] = (counts[endpoint.method] || 0) + 1;
    return counts;
  }, {});
  const methodStats = Object.entries(methodCounts)
    .map(([method, count]) => `<button class="method-pill" type="button" data-method-filter="${escapeHtml(method)}"><span class="method method-${escapeHtml(method.toLowerCase())}">${escapeHtml(method)}</span><strong>${count}</strong></button>`)
    .join('');
  const groupCards = groups.map((group) => `<section class="group-card" data-group="${escapeHtml(group.key)}">
    <div class="group-heading">
      <div class="group-title">
        <span class="group-icon">${escapeHtml(group.icon)}</span>
        <div><h2>${escapeHtml(group.title)}</h2><p>${escapeHtml(group.description)}</p></div>
      </div>
      <span class="group-count">${group.endpoints.length} endpoints</span>
    </div>
    <div class="endpoint-list">${group.endpoints.map((endpoint) => renderEndpoint(config, endpoint)).join('')}</div>
  </section>`).join('');

  return `<!doctype html>
<html lang="en" data-theme="system">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>api2.autisme.lu API explorer · Command center</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f6f8ff;
      --bg-soft: #eef4ff;
      --fg: #101827;
      --muted: #657188;
      --muted-2: #8a96ad;
      --card: rgba(255,255,255,.76);
      --card-solid: #ffffff;
      --card-strong: rgba(255,255,255,.94);
      --border: rgba(74,91,132,.18);
      --border-strong: rgba(49,85,231,.28);
      --accent: #3155e7;
      --accent-2: #db2777;
      --accent-3: #0891b2;
      --success: #16a34a;
      --warning: #d97706;
      --danger: #e11d48;
      --code-bg: #0d1324;
      --code-fg: #eaf0ff;
      --shadow: 0 28px 80px rgba(35,49,86,.15);
      --shadow-soft: 0 16px 44px rgba(35,49,86,.10);
      --radius-xl: 34px;
      --radius-lg: 24px;
      --radius-md: 17px;
      --ring: 0 0 0 4px rgba(49,85,231,.18);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #09111f;
        --bg-soft: #0d1729;
        --fg: #f7f9ff;
        --muted: #a7b3c8;
        --muted-2: #78859b;
        --card: rgba(18,28,47,.72);
        --card-solid: #111b2f;
        --card-strong: rgba(20,31,52,.92);
        --border: rgba(171,187,216,.16);
        --border-strong: rgba(145,167,255,.32);
        --accent: #91a7ff;
        --accent-2: #fb7ab8;
        --accent-3: #5eead4;
        --code-bg: #060b16;
        --code-fg: #edf4ff;
        --shadow: 0 28px 90px rgba(0,0,0,.34);
        --shadow-soft: 0 16px 44px rgba(0,0,0,.24);
      }
    }
    [data-theme="light"] { color-scheme: light; }
    [data-theme="dark"] { color-scheme: dark; --bg: #09111f; --bg-soft: #0d1729; --fg: #f7f9ff; --muted: #a7b3c8; --muted-2: #78859b; --card: rgba(18,28,47,.72); --card-solid: #111b2f; --card-strong: rgba(20,31,52,.92); --border: rgba(171,187,216,.16); --border-strong: rgba(145,167,255,.32); --accent: #91a7ff; --accent-2: #fb7ab8; --accent-3: #5eead4; --code-bg: #060b16; --code-fg: #edf4ff; --shadow: 0 28px 90px rgba(0,0,0,.34); --shadow-soft: 0 16px 44px rgba(0,0,0,.24); }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--fg);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 10% -10%, rgba(49,85,231,.30), transparent 34rem),
        radial-gradient(circle at 92% 8%, rgba(219,39,119,.20), transparent 32rem),
        radial-gradient(circle at 48% 42%, rgba(8,145,178,.14), transparent 36rem),
        linear-gradient(145deg, var(--bg), var(--bg-soft));
      overflow-x: hidden;
    }
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: .46;
      background-image:
        linear-gradient(rgba(100,116,139,.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(100,116,139,.08) 1px, transparent 1px);
      background-size: 42px 42px;
      mask-image: linear-gradient(to bottom, black, transparent 78%);
    }
    a { color: inherit; }
    code, pre { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; }
    button, input { font: inherit; }
    .page-shell { position: relative; z-index: 1; max-width: 1320px; margin: 0 auto; padding: 24px clamp(14px, 2vw, 26px) 64px; }
    .topbar { position: sticky; top: 12px; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; padding: 12px; border: 1px solid var(--border); border-radius: 999px; background: color-mix(in srgb, var(--card-strong) 86%, transparent); box-shadow: var(--shadow-soft); backdrop-filter: blur(20px); }
    .brand { display: inline-flex; align-items: center; gap: 12px; text-decoration: none; font-weight: 900; letter-spacing: -.02em; }
    .logo { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 16px; background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #fff; box-shadow: 0 14px 34px rgba(49,85,231,.26); }
    .top-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
    .icon-button, .button, .filters button, .method-pill { border: 1px solid var(--border); color: var(--fg); background: var(--card-strong); cursor: pointer; text-decoration: none; transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease; }
    .icon-button:hover, .button:hover, .filters button:hover, .method-pill:hover { transform: translateY(-1px); border-color: var(--border-strong); box-shadow: 0 14px 28px rgba(49,85,231,.10); }
    .icon-button:focus-visible, .button:focus-visible, .filters button:focus-visible, .method-pill:focus-visible, .filters input:focus-visible { outline: none; box-shadow: var(--ring); }
    .icon-button { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; }
    .button { display: inline-flex; align-items: center; gap: 9px; min-height: 44px; padding: 12px 16px; border-radius: 999px; font-weight: 850; }
    .button-primary { color: #fff; border-color: transparent; background: linear-gradient(135deg, var(--accent), var(--accent-2)); }
    .hero { position: relative; overflow: hidden; display: grid; gap: 28px; grid-template-columns: minmax(0, 1.15fr) minmax(300px, .85fr); align-items: stretch; padding: clamp(24px, 5vw, 56px); border: 1px solid var(--border); border-radius: var(--radius-xl); background: linear-gradient(135deg, color-mix(in srgb, var(--card) 84%, transparent), color-mix(in srgb, var(--card-strong) 72%, transparent)); box-shadow: var(--shadow); backdrop-filter: blur(24px); }
    .hero::after { content: ''; position: absolute; right: -110px; top: -130px; width: 420px; height: 420px; border-radius: 50%; background: conic-gradient(from 140deg, rgba(49,85,231,.34), rgba(219,39,119,.28), rgba(8,145,178,.30), rgba(49,85,231,.34)); filter: blur(2px); opacity: .72; }
    .hero-content, .hero-panel { position: relative; z-index: 1; }
    .eyebrow { display: inline-flex; align-items: center; gap: 9px; width: fit-content; margin: 0 0 18px; padding: 9px 13px; border: 1px solid var(--border-strong); border-radius: 999px; color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); font-weight: 900; letter-spacing: .02em; }
    h1 { margin: 0; max-width: 860px; font-size: clamp(2.6rem, 7vw, 6.8rem); line-height: .9; letter-spacing: -.075em; }
    h1 span { display: block; background: linear-gradient(100deg, var(--accent), var(--accent-2), var(--accent-3)); -webkit-background-clip: text; background-clip: text; color: transparent; }
    h2, h3, p { margin-top: 0; }
    p { color: var(--muted); line-height: 1.65; }
    .hero-copy { max-width: 780px; margin: 20px 0 0; font-size: clamp(1rem, 1.8vw, 1.18rem); }
    .actions, .stats, .method-strip { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
    .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .stat { min-height: 108px; padding: 18px; border: 1px solid var(--border); border-radius: 24px; background: var(--card-strong); box-shadow: var(--shadow-soft); }
    .stat small { display: block; color: var(--muted); font-weight: 800; text-transform: uppercase; letter-spacing: .08em; font-size: .7rem; }
    .stat strong { display: block; margin-top: 9px; font-size: clamp(1.7rem, 3.4vw, 2.55rem); line-height: 1; letter-spacing: -.05em; }
    .stat code { display: block; margin-top: 11px; color: var(--muted); overflow-wrap: anywhere; font-size: .84rem; }
    .hero-panel { min-height: 100%; display: grid; align-content: space-between; gap: 18px; padding: 22px; border: 1px solid var(--border); border-radius: 28px; background: color-mix(in srgb, var(--card-strong) 82%, transparent); box-shadow: inset 0 1px 0 rgba(255,255,255,.18); }
    .orbit { min-height: 220px; position: relative; border-radius: 24px; overflow: hidden; background: radial-gradient(circle at 30% 20%, rgba(49,85,231,.34), transparent 34%), radial-gradient(circle at 75% 35%, rgba(219,39,119,.28), transparent 32%), linear-gradient(135deg, rgba(255,255,255,.18), rgba(255,255,255,.03)); border: 1px solid var(--border); }
    .orbit-node { position: absolute; display: grid; place-items: center; border-radius: 22px; background: var(--card-strong); border: 1px solid var(--border); box-shadow: var(--shadow-soft); font-weight: 950; }
    .orbit-node:nth-child(1) { width: 88px; height: 88px; left: 28px; top: 28px; color: var(--accent); }
    .orbit-node:nth-child(2) { width: 116px; height: 116px; right: 30px; top: 54px; color: var(--accent-2); }
    .orbit-node:nth-child(3) { width: 78px; height: 78px; left: 48%; bottom: 24px; color: var(--accent-3); }
    .mini-log { display: grid; gap: 9px; }
    .mini-log div { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 17px; background: color-mix(in srgb, var(--card-solid) 75%, transparent); border: 1px solid var(--border); color: var(--muted); }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 5px color-mix(in srgb, var(--success) 14%, transparent); }
    .toolbar { position: sticky; top: 86px; z-index: 10; display: grid; gap: 14px; margin: 18px 0; padding: 14px; border: 1px solid var(--border); border-radius: 28px; background: color-mix(in srgb, var(--card-strong) 88%, transparent); backdrop-filter: blur(20px); box-shadow: var(--shadow-soft); }
    .filters { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
    .search-wrap { position: relative; flex: 1 1 360px; }
    .search-wrap svg { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--muted); }
    .filters input { width: 100%; min-height: 50px; padding: 14px 18px 14px 46px; color: var(--fg); border: 1px solid var(--border); border-radius: 999px; background: var(--card-solid); outline: none; }
    .filters button { min-height: 48px; padding: 12px 16px; border-radius: 999px; font-weight: 850; }
    .method-strip { margin: 0; }
    .method-pill { display: inline-flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 999px; font-weight: 900; }
    .method-pill.is-active { border-color: var(--border-strong); background: color-mix(in srgb, var(--accent) 12%, var(--card-strong)); }
    .groups { display: grid; gap: 18px; }
    .group-card { position: relative; overflow: clip; border: 1px solid var(--border); border-radius: 30px; padding: 20px; background: var(--card); box-shadow: var(--shadow-soft); backdrop-filter: blur(20px); }
    .group-card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; background: linear-gradient(90deg, var(--accent), var(--accent-2), var(--accent-3)); opacity: .75; }
    .group-heading { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
    .group-title { display: flex; align-items: flex-start; gap: 14px; }
    .group-title h2 { margin: 0 0 4px; font-size: 1.28rem; letter-spacing: -.03em; }
    .group-title p { margin: 0; max-width: 720px; }
    .group-count { flex: none; border: 1px solid var(--border); border-radius: 999px; padding: 8px 10px; color: var(--muted); background: var(--card-strong); font-weight: 850; font-size: .86rem; }
    .group-icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 18px; background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, var(--accent-2) 13%, transparent)); border: 1px solid var(--border); box-shadow: var(--shadow-soft); }
    .endpoint-list { display: grid; gap: 10px; }
    .endpoint-card { border: 1px solid var(--border); border-radius: 20px; background: var(--card-strong); overflow: hidden; transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease; }
    .endpoint-card:hover { border-color: var(--border-strong); transform: translateY(-1px); box-shadow: 0 16px 36px rgba(35,49,86,.10); }
    .endpoint-card[hidden], .group-card[hidden] { display: none; }
    summary { display: grid; grid-template-columns: 92px 1fr auto; gap: 14px; align-items: center; padding: 15px; cursor: pointer; list-style: none; }
    summary::-webkit-details-marker { display: none; }
    summary:focus-visible { outline: none; box-shadow: var(--ring); }
    .endpoint-main { display: grid; gap: 5px; min-width: 0; }
    .endpoint-path-row { display: flex; gap: 8px; align-items: center; min-width: 0; }
    .endpoint-path-row code { font-size: .96rem; font-weight: 900; overflow-wrap: anywhere; }
    .endpoint-arrow { color: var(--muted-2); transform: rotate(45deg); transition: transform .18s ease; }
    details[open] .endpoint-arrow { transform: rotate(135deg); }
    .endpoint-main > span:last-child { color: var(--muted); font-size: .93rem; }
    .method { border-radius: 13px; padding: 8px 9px; text-align: center; font-size: .78rem; font-weight: 950; letter-spacing: .03em; background: #e7ecff; color: #183da8; }
    .method-post { background: #dcfce7; color: #166534; }
    .method-patch, .method-put { background: #fef3c7; color: #92400e; }
    .method-delete { background: #ffe4e6; color: #be123c; }
    .badge { border-radius: 999px; padding: 7px 10px; background: color-mix(in srgb, var(--muted) 12%, transparent); color: var(--muted); font-size: .78rem; font-weight: 900; white-space: nowrap; }
    .badge-public { background: color-mix(in srgb, var(--success) 14%, transparent); color: var(--success); }
    .endpoint-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(285px, 1fr)); gap: 14px; padding: 0 15px 15px 121px; }
    .example-panel { min-width: 0; }
    .panel-title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 8px; color: var(--muted); }
    .panel-title-row h3 { margin: 0; font-size: .95rem; }
    .panel-title-row span { font-size: .74rem; text-transform: uppercase; font-weight: 950; letter-spacing: .10em; color: var(--muted-2); }
    pre { position: relative; margin: 0; padding: 18px; border: 1px solid rgba(255,255,255,.08); border-radius: 16px; background: linear-gradient(145deg, var(--code-bg), #111a31); color: var(--code-fg); overflow: auto; min-height: 112px; box-shadow: inset 0 1px 0 rgba(255,255,255,.05); }
    pre code { display: block; padding-right: 52px; overflow-wrap: anywhere; font-size: .88rem; line-height: 1.55; }
    .copy-button { position: absolute; top: 9px; right: 9px; z-index: 1; border: 1px solid rgba(255,255,255,.16); border-radius: 999px; padding: 7px 10px; background: rgba(255,255,255,.12); color: #fff; cursor: pointer; font-weight: 850; }
    .copy-button:hover { background: rgba(255,255,255,.20); }
    .empty-state { display: none; padding: 28px; border: 1px dashed var(--border-strong); border-radius: 26px; text-align: center; background: var(--card); color: var(--muted); }
    .empty-state.is-visible { display: block; }
    footer { margin-top: 28px; color: var(--muted); font-size: .92rem; text-align: center; }
    .toast { position: fixed; right: 18px; bottom: 18px; z-index: 30; opacity: 0; transform: translateY(10px); pointer-events: none; padding: 12px 14px; border-radius: 999px; background: #101827; color: #fff; box-shadow: var(--shadow); transition: opacity .18s ease, transform .18s ease; }
    .toast.is-visible { opacity: 1; transform: translateY(0); }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; } }
    @media (max-width: 980px) { .hero { grid-template-columns: 1fr; } .stats { grid-template-columns: 1fr; } .hero-panel { display: none; } .toolbar { top: 78px; } }
    @media (max-width: 720px) { .page-shell { padding-top: 12px; } .topbar { border-radius: 24px; align-items: flex-start; } .brand span:last-child { display: none; } .top-actions .button { display: none; } h1 { font-size: clamp(2.45rem, 14vw, 4.2rem); } summary { grid-template-columns: 76px 1fr; } .badge { grid-column: 2; justify-self: start; } .endpoint-details { padding-left: 15px; } .group-heading { flex-direction: column; } .toolbar { position: static; } }
  </style>
</head>
<body>
  <div class="page-shell">
    <header class="topbar" aria-label="API navigation">
      <a class="brand" href="/docs" aria-label="api2 Autisme API explorer">
        <span class="logo" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 12.6c0-4.7 3.7-8.1 8-8.1s8 3.4 8 8.1c0 3.9-2.8 6.9-6.7 7.6-.8.1-1.3-.4-1.3-1.1v-2.2c0-.6.4-1.1 1-1.2 1.8-.4 3-1.6 3-3.3 0-2.2-1.7-3.9-4-3.9s-4 1.7-4 3.9c0 1.7 1.2 2.9 3 3.3.6.1 1 .6 1 1.2v2.2c0 .7-.6 1.2-1.3 1.1C6.8 19.5 4 16.5 4 12.6Z" fill="currentColor"/></svg>
        </span>
        <span>api2.autisme.lu</span>
      </a>
      <div class="top-actions">
        <a class="button" href="/docs/openapi.yaml">OpenAPI</a>
        <a class="button" href="/docs/routes.json">JSON</a>
        <button class="icon-button" type="button" id="theme-toggle" aria-label="Toggle theme">◐</button>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="hero-content">
          <div class="eyebrow"><span>✦</span><span>Live route command center</span></div>
          <h1>Autisme API, <span>beautifully mapped.</span></h1>
          <p class="hero-copy">A polished overview of every registered Node.js/Fastify route for NamNam and the legacy compatibility layer. Search, inspect authentication needs, copy ready-to-run cURL calls, and keep implementation details discoverable for future Codex work.</p>
          <div class="actions">
            <a class="button button-primary" href="#endpoints">Explore endpoints</a>
            <a class="button" href="/healthz">Health check</a>
            <a class="button" href="/readyz">Readiness check</a>
          </div>
          <div class="stats" aria-label="API summary">
            <div class="stat"><small>Registered</small><strong>${endpointCount}</strong><code>endpoints</code></div>
            <div class="stat"><small>Protected</small><strong>${protectedCount}</strong><code>Bearer-token routes</code></div>
            <div class="stat"><small>Public URL</small><strong>API</strong><code>${escapeHtml(config.apiPublicUrl)}</code></div>
          </div>
        </div>
        <aside class="hero-panel" aria-label="Runtime status illustration">
          <div class="orbit" aria-hidden="true">
            <div class="orbit-node">REST</div>
            <div class="orbit-node">NamNam</div>
            <div class="orbit-node">v24</div>
          </div>
          <div class="mini-log">
            <div><span class="dot"></span><span>Node.js route registry online</span></div>
            <div><span class="dot"></span><span>Legacy mappings preserved</span></div>
            <div><span class="dot"></span><span>OpenAPI docs available</span></div>
          </div>
        </aside>
      </section>

      <section class="toolbar" id="endpoints" aria-label="Endpoint tools">
        <div class="filters">
          <label class="search-wrap" aria-label="Filter endpoints">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <input id="endpoint-search" type="search" placeholder="Search by method, path, summary, product area…" autocomplete="off">
          </label>
          <button type="button" id="expand-all">Expand all</button>
          <button type="button" id="collapse-all">Collapse all</button>
        </div>
        <div class="method-strip" aria-label="Filter by HTTP method">
          <button class="method-pill is-active" type="button" data-method-filter="all"><span>All</span><strong>${endpointCount}</strong></button>
          ${methodStats}
        </div>
      </section>

      <div class="empty-state" id="empty-state"><strong>No endpoints found.</strong><br>Try another method filter or search term.</div>
      <div class="groups">${groupCards}</div>
      <footer>Authenticated endpoints require a bearer token unless auth is disabled for development. Detailed schemas live in <code>docs/openapi.yaml</code>.</footer>
    </main>
  </div>
  <div class="toast" role="status" aria-live="polite" id="toast">Copied</div>
  <script>
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('api2.theme');
    if (savedTheme) root.dataset.theme = savedTheme;
    const themeButton = document.querySelector('#theme-toggle');
    const themeOrder = ['system', 'light', 'dark'];
    function syncThemeButton() { themeButton.textContent = root.dataset.theme === 'dark' ? '☾' : root.dataset.theme === 'light' ? '☀' : '◐'; }
    syncThemeButton();
    themeButton.addEventListener('click', () => {
      const next = themeOrder[(themeOrder.indexOf(root.dataset.theme || 'system') + 1) % themeOrder.length];
      root.dataset.theme = next;
      localStorage.setItem('api2.theme', next);
      syncThemeButton();
    });

    const search = document.querySelector('#endpoint-search');
    const cards = [...document.querySelectorAll('.endpoint-card')];
    const groups = [...document.querySelectorAll('.group-card')];
    const emptyState = document.querySelector('#empty-state');
    const methodButtons = [...document.querySelectorAll('[data-method-filter]')];
    let methodFilter = 'all';
    function applyFilters() {
      const term = search.value.trim().toLowerCase();
      cards.forEach((card) => {
        const methodMatches = methodFilter === 'all' || card.dataset.method === methodFilter;
        const textMatches = !term || [card.dataset.method, card.dataset.path, card.dataset.summary, card.closest('.group-card')?.dataset.group].join(' ').includes(term);
        card.hidden = !(methodMatches && textMatches);
      });
      groups.forEach((group) => { group.hidden = ![...group.querySelectorAll('.endpoint-card')].some((card) => !card.hidden); });
      emptyState.classList.toggle('is-visible', !cards.some((card) => !card.hidden));
    }
    search.addEventListener('input', applyFilters);
    methodButtons.forEach((button) => button.addEventListener('click', () => {
      methodFilter = button.dataset.methodFilter;
      methodButtons.forEach((item) => item.classList.toggle('is-active', item === button));
      applyFilters();
    }));
    document.querySelector('#expand-all').addEventListener('click', () => cards.forEach((card) => { if (!card.hidden) card.open = true; }));
    document.querySelector('#collapse-all').addEventListener('click', () => cards.forEach((card) => { card.open = false; }));
    const toast = document.querySelector('#toast');
    let toastTimer;
    document.querySelectorAll('.copy-button').forEach((button) => button.addEventListener('click', async (event) => {
      event.preventDefault();
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = 'Copied';
      toast.classList.add('is-visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.classList.remove('is-visible'); button.textContent = 'Copy'; }, 1200);
    }));
  </script>
</body>
</html>`;
}
