import { buildApp } from './app.js';

const app = await buildApp();

try {
  await app.listen({ host: app.config.host, port: app.config.port });
  app.log.info({ host: app.config.host, port: app.config.port }, 'api2.autisme.lu listening');
} catch (error) {
  app.log.error(error, 'failed to start API');
  process.exitCode = 1;
}
