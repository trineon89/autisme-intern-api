import { loadEnv, validateEnv } from '../src/config/env.js';

const config = loadEnv();
const missing = validateEnv(config);
const safe = {
  app: 'api2-autisme-lu',
  appEnv: config.appEnv,
  listenHost: config.host,
  listenPort: config.port,
  apiPublicUrl: config.apiPublicUrl,
  corsOrigins: config.corsOrigins,
  authRequired: config.authRequired,
  database: {
    hostConfigured: Boolean(config.db.host),
    nameConfigured: Boolean(config.db.database),
    userConfigured: Boolean(config.db.user),
    passwordConfigured: Boolean(config.db.password),
    port: config.db.port,
    ssl: config.db.ssl
  },
  missingRequiredValues: missing
};

console.log(JSON.stringify(safe, null, 2));
