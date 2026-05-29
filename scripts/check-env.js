import { loadEnv, validateEnv } from '../src/config/env.js';
const env = loadEnv();
const missing = validateEnv(env);
if (missing.length) {
  console.error(`Missing or insecure environment values: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('Environment looks complete.');
