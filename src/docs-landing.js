const ENDPOINT_GROUPS = [
  {
    title: 'Service',
    endpoints: [
      ['GET', '/', 'Interactive endpoint overview'],
      ['GET', '/healthz', 'Process health'],
      ['GET', '/readyz', 'Database readiness'],
      ['GET', '/meta', 'API metadata'],
      ['GET', '/docs/openapi.yaml', 'OpenAPI specification']
    ]
  },
  {
    title: 'Authentication',
    endpoints: [
      ['POST', '/auth/login', 'Authenticate with email/password'],
      ['POST', '/auth/logout', 'Revoke current token'],
      ['GET', '/auth/me', 'Current authenticated user'],
      ['POST', '/auth/refresh', 'Rotate bearer token']
    ]
  },
  {
    title: 'NamNam',
    endpoints: [
      ['GET', '/namnam/bootstrap', 'Frontend bootstrap data'],
      ['GET', '/people', 'List people'],
      ['POST', '/people', 'Create person'],
      ['GET', '/places', 'List places/services'],
      ['GET', '/meal-choices', 'List meal choices'],
      ['GET', '/meal-choices/for-day?date=YYYY-MM-DD', 'Choices and menu context for a date'],
      ['GET', '/base-plans?person_id={id}', 'Base plan for one person'],
      ['POST', '/base-plans', 'Upsert base plan entries'],
      ['GET', '/meal-registrations', 'List registrations with filters'],
      ['POST', '/meal-registrations/single', 'Upsert one registration'],
      ['POST', '/meal-registrations/week', 'Upsert one week for one person'],
      ['GET', '/weekly-menus?monday_date=YYYY-MM-DD', 'Menu for a week'],
      ['POST', '/weekly-menus', 'Upsert menu for a Monday']
    ]
  },
  {
    title: 'Operations',
    endpoints: [
      ['GET', '/reports/data', 'Filtered report data grouped by service'],
      ['POST', '/reports/pdf/general', 'Generate general PDF'],
      ['POST', '/reports/pdf/kitchen', 'Generate kitchen checklist PDF'],
      ['GET', '/reports/generated', 'List generated reports'],
      ['GET', '/settings', 'List settings'],
      ['GET', '/reserved-dates', 'List reserved dates'],
      ['GET', '/billing/monthly?month=YYYY-MM', 'Monthly billing summary'],
      ['POST', '/import/legacy', 'Import legacy CSV data']
    ]
  },
  {
    title: 'Legacy compatibility',
    endpoints: [
      ['GET', '/personal/getPersonal', 'Legacy people list'],
      ['GET', '/service/getServicen', 'Legacy services list'],
      ['GET', '/menu/getMenus', 'Legacy menus list'],
      ['GET', '/kleeder/getKleeder', 'Legacy clothing items'],
      ['GET', '/commande/getClients', 'Legacy commande clients'],
      ['GET', '/translation/*', 'Legacy translation routes']
    ]
  }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function endpointCount() {
  return ENDPOINT_GROUPS.reduce((count, group) => count + group.endpoints.length, 0);
}

export function apiLandingPayload(config) {
  return {
    ok: true,
    name: 'api2.autisme.lu',
    version: '1.0.0',
    publicUrl: config.apiPublicUrl,
    docs: '/docs/openapi.yaml',
    health: '/healthz',
    endpointCount: endpointCount(),
    groups: ENDPOINT_GROUPS.map((group) => ({
      title: group.title,
      endpoints: group.endpoints.map(([method, path, description]) => ({ method, path, description }))
    }))
  };
}

export function renderApiLandingHtml(config) {
  const groups = ENDPOINT_GROUPS.map((group) => `
      <section class="card">
        <h2>${escapeHtml(group.title)}</h2>
        <div class="endpoint-list">
          ${group.endpoints.map(([method, endpointPath, description]) => `
            <div class="endpoint">
              <span class="method method-${escapeHtml(method.toLowerCase())}">${escapeHtml(method)}</span>
              <code>${escapeHtml(endpointPath)}</code>
              <span>${escapeHtml(description)}</span>
            </div>`).join('')}
        </div>
      </section>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>api2.autisme.lu endpoints</title>
  <style>
    :root { color-scheme: light dark; --bg: #f6f7fb; --fg: #172033; --muted: #5c667a; --card: #fff; --border: #dfe4ee; --accent: #2855d9; }
    @media (prefers-color-scheme: dark) { :root { --bg: #101522; --fg: #f3f6fb; --muted: #aab4c8; --card: #182033; --border: #2a354c; --accent: #88a2ff; } }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--fg); }
    main { max-width: 1120px; margin: 0 auto; padding: 48px 20px; }
    header { margin-bottom: 28px; }
    h1 { margin: 0 0 8px; font-size: clamp(2rem, 5vw, 3.4rem); line-height: 1; }
    h2 { margin: 0 0 16px; font-size: 1.15rem; }
    p { color: var(--muted); line-height: 1.6; }
    a { color: var(--accent); }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 24px 0; }
    .button { border: 1px solid var(--border); border-radius: 999px; padding: 10px 16px; background: var(--card); text-decoration: none; font-weight: 650; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 20px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06); }
    .endpoint-list { display: grid; gap: 10px; }
    .endpoint { display: grid; grid-template-columns: 76px minmax(150px, 1fr); gap: 6px 12px; align-items: baseline; padding: 10px 0; border-top: 1px solid var(--border); }
    .endpoint:first-child { border-top: 0; padding-top: 0; }
    .endpoint span:last-child { grid-column: 2; color: var(--muted); font-size: 0.92rem; }
    .method { border-radius: 8px; padding: 4px 8px; text-align: center; font-size: 0.78rem; font-weight: 800; background: #e7ecff; color: #183da8; }
    .method-post { background: #e5f8ee; color: #116137; }
    .method-patch, .method-put { background: #fff4d7; color: #7a4b00; }
    .method-delete { background: #ffe4e8; color: #9f1239; }
    code { overflow-wrap: anywhere; font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.93rem; }
    footer { margin-top: 28px; color: var(--muted); font-size: 0.9rem; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>api2.autisme.lu</h1>
      <p>Node.js API endpoint overview. If this page appears, traffic is reaching the Fastify application.</p>
      <div class="actions">
        <a class="button" href="/docs/openapi.yaml">OpenAPI YAML</a>
        <a class="button" href="/healthz">Health check</a>
        <a class="button" href="/readyz">Readiness check</a>
      </div>
      <p><strong>Public URL:</strong> <code>${escapeHtml(config.apiPublicUrl)}</code></p>
    </header>
    <div class="grid">${groups}
    </div>
    <footer>Full route details live in <code>docs/openapi.yaml</code>. Authenticated endpoints require a bearer token unless disabled for development.</footer>
  </main>
</body>
</html>`;
}
