import { buildApp } from './app.js';

const app = await buildApp();

try {
  const listenOptions = { host: app.config.host, port: app.config.port };
  await app.listen(listenOptions);
  app.log.info(
    {
      host: listenOptions.host,
      port: listenOptions.port,
      publicUrl: app.config.apiPublicUrl,
      health: '/healthz'
    },
    'api2.autisme.lu listening'
  );
} catch (error) {
  app.log.error(error, 'failed to start API');
  process.exitCode = 1;
}
